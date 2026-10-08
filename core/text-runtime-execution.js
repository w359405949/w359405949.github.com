// @editor-module 可续行文字执行只访问所属现场、记录、字形与动态提供器接口。
import {createFieldGlyphCache, writeFieldGlyph, copyFieldGlyphTiles} from "./field-glyph-cache-vm.js";
import {dialogueNextLine, dialogueScrollPasses, dialogueWaitPosition, dialogueWaitTile} from "./dialogue-layout.js";
import {createSemanticFrameWait} from "./semantic-frame-wait.js";
import {createTextRuntimeContentServices} from "./text-runtime-content.js";

const requireValue = (condition, name) => {if (!condition) throw new TypeError(name);};

export function createTextExecutionServices({state, source, runtime, glyphParameters, readGlyph,
  displayServices, controllerServices, providerCatalog, resolveProvider, commitWindow, runHook, controlGlyph, choose,
  choiceParameters, followChoice, prepareRecord, onTextOutput}) {
  const content = createTextRuntimeContentServices({state, providerCatalog});
  resolveProvider ??= content.resolveProvider;
  controlGlyph ??= content.controlGlyph;
  const field = id => state.field(id);
  const read = id => {
    const current = field(id);
    requireValue(current.knowledge === "confirmed" && current.value !== null, id);
    return current.value;
  };
  const write = (id, value) => {field(id).value = value;};
  const output = () => read("text.outputPointer") - 0x6000;
  const setOutput = cursor => {
    requireValue(Number.isInteger(cursor) && cursor >= 0 && cursor < 1024, "text-output-domain");
    write("text.outputPointer", cursor + 0x6000);
  };
  const waitPosition = () => dialogueWaitPosition(output(), read("text.windowRow"), runtime);
  const queueTile = (column, row, tile, at) => {
    let x = ((read("display.textCameraX") << 1) + column) & 255;
    if (read("display.nametablePage")) x ^= 32;
    let y = ((read("display.textCameraY") << 1) + row) & 255;
    if (y >= 30) y = (y - 30) & 255;
    const address = 0x2000 | (x & 32) << 5 | (y & 31) << 5 | x & 31;
    const queue = [...read("display.mainQueue")];
    queue.splice(at, 3, address >> 8, address & 255, tile);
    write("display.mainQueue", queue);
  };
  const refresh = (cursor, at = 0) => {
    const tiles = read("display.logicalTiles");
    queueTile((cursor - 1) & 31, (cursor - 1) >> 5, tiles[(cursor - 1) & 1023], at);
    queueTile((cursor - 33) & 31, ((cursor - 1) >> 5) - 1, tiles[(cursor - 33) & 1023], at + 3);
  };
  const marker = clear => {
    const position = waitPosition();
    requireValue(position >= 0 && position < 1024, "text-wait-position");
    const tile = dialogueWaitTile(read("display.frameCounter"), runtime, clear);
    queueTile(position & 31, position >> 5, tile, 0);
    write("display.mainQueueLength", 3);
  };

  return Object.freeze({createExecution({record, offset = 0, finalConfirmation = true, reset = true,
    entry = "record"} = {}) {
    requireValue(["record", "confirm", "refresh"].includes(entry)
      && (entry !== "record" || typeof record === "string")
      && Number.isInteger(offset) && offset >= 0
      && typeof finalConfirmation === "boolean" && typeof reset === "boolean", "text-execution-entry");
    const waits = createSemanticFrameWait({state, displayServices, controllerServices});
    let current = null, cancelled = false, page = 0, confirmedWaits = 0, frameEffects = [];
    let frameWaiting = false, presentation = {}, externalExecution = null;
    const snapshot = (status, continuation = null, extra = {}) => ({status, state: state.capture(),
      effects: frameEffects.splice(0), page, confirmedWaits, continuation, ...presentation, ...extra});
    const execution = run();
    function* wait(kind) {
      const start = waits.begin(kind);
      if (start.status === "available") return;
      frameWaiting = true;
      yield snapshot("pending", {kind: "text-frame", wait: kind});
      frameWaiting = false;
    }
    function* external(kind, request, service) {
      let response = typeof service === "function" ? service({...request, ...presentation, state: state.capture()}) : null;
      if (typeof response?.advance === "function") {externalExecution = response; response = externalExecution.advance();}
      for (;;) {
        if (response?.state) state.restore(response.state);
        frameEffects.push(...(response?.effects || []));
        if (response?.display) presentation = {display: response.display,
          ...(response.frame ? {frame: response.frame} : {})};
        if (response?.status === "available" && (kind !== "text-choice" || response.confirmed === true)) {
          externalExecution = null;
          return response;
        }
        response = yield snapshot("pending", {kind, service: response?.continuation}, {request,
          missing: response?.missing || [kind]});
      }
    }
    function* confirm() {
      do {marker(false); yield* wait("controller");}
      while (!(read("controller.current") & runtime.wait.input_mask));
      marker(true);
      yield* wait("controller");
      confirmedWaits++;
    }
    function* lineBreak() {
      const next = dialogueNextLine(output(), read("text.windowRow"), read("text.command"), runtime);
      write("glyph.half", 0); write("text.command", next.lines);
      setOutput(next.cursor + (next.scroll ? runtime.cursor_retreat : 0));
      if (next.scroll) {
        const tiles = Uint8Array.from(read("display.logicalTiles"));
        const cache = {tiles};
        for (const pass of dialogueScrollPasses(read("text.windowRow"), runtime)) {
          copyFieldGlyphTiles(cache, pass);
          onTextOutput?.({kind: 'scroll', ...pass});
          write("display.logicalTiles", [...tiles]);
          yield* external("text-window", {preset: read("control.displayProfile"), waitBefore: true}, commitWindow);
        }
      }
      setOutput(next.cursor);
    }
    function emit(tile, position = output(), advance = true, count = true) {
      const tiles = [...read("display.logicalTiles")];
      requireValue(position >= 0 && position < 1024, "text-output-domain");
      tiles[position] = tile; write("display.logicalTiles", tiles);
      onTextOutput?.({kind: 'tile', position});
      if (advance) setOutput(output() + 1);
      if (count) write("text.outputCount", (read("text.outputCount") + 1) & 255);
    }
    function* glyph(instruction) {
      const bitmap = readGlyph(instruction.glyph);
      requireValue((Array.isArray(bitmap) || ArrayBuffer.isView(bitmap)) && bitmap.length === 18, "text-glyph-source");
      const patterns = new Uint8Array(4096);
      const old = read("glyph.patterns"), tiles = read("glyph.tiles");
      for (let index = 0; index < 4; index++) patterns.set(old.slice(index * 8, index * 8 + 8), tiles[index] * 16);
      const cache = createFieldGlyphCache(patterns, glyphParameters, Uint8Array.from(read("display.logicalTiles")));
      cache.pools = [...read("glyph.pools")];
      const half = read("glyph.half") !== 0, cursor = output();
      if (half) {
        cache.tail = tiles.slice(2, 4);
        cache.tailPlane = Uint8Array.from(old.slice(16, 32));
      }
      const writes = writeFieldGlyph(cache, bitmap, cursor, half);
      const emittedTiles = writes.map(item => item.tile);
      const nextTiles = half ? [...emittedTiles.slice(2), ...emittedTiles.slice(0, 2)] : emittedTiles;
      const nextPatterns = [...old];
      if (half) {
        for (let index = 0; index < 4; index++) nextPatterns.splice(16 + index * 8, 8,
          ...cache.patterns.slice(emittedTiles[index] * 16, emittedTiles[index] * 16 + 8));
      } else for (let index = 0; index < 4; index++) nextPatterns.splice(index * 8, 8,
        ...cache.patterns.slice(nextTiles[index] * 16, nextTiles[index] * 16 + 8));
      write("glyph.tiles", nextTiles); write("glyph.patterns", nextPatterns);
      write("glyph.addressLow", emittedTiles[3]); write("glyph.addressHigh", instruction.operands[0]);
      write("glyph.pools", [...cache.pools]); write("glyph.half", half ? 0 : 255);
      write("glyph.firstHalf", half ? 0 : 255);
      if (half) write("glyph.secondHalf", 255);
      write("display.logicalTiles", [...cache.tiles]);
      setOutput(cursor + (half ? 1 : 2));
      write("text.outputCount", (read("text.outputCount") + (half ? 1 : 2)) & 255);
      write("glyph.pending", 0);
      onTextOutput?.({kind: 'glyph', glyph: instruction.glyph, cursor, half});
      yield* wait("glyph-upload");
    }
    function* refreshCharacter() {
      const cursor = output();
      if (read("glyph.firstHalf")) {
        refresh(cursor - 1, 6); refresh(cursor, 0); write("display.mainQueueLength", 11);
      } else {refresh(cursor); write("display.mainQueueLength", 6);}
      const delay = read("text.characterDelay");
      const count = delay < 128 ? delay + 1 : 1;
      for (let index = 0; index < count; index++) yield* wait("character-delay");
    }
    function* include(target, preserve = false, runtimeSource = false) {
      const savedStream = read("text.streamPointer"), savedOutput = output(), savedBank = read("text.recordBank");
      if (!runtimeSource) {
        yield* selectRecord(target);
        write("text.nestedState", 255); write("text.mode", 0);
      }
      yield* stream(target, 0);
      write("text.nestedState", 255);
      if (!runtimeSource) yield* wait("character-delay");
      write("text.recordBank", savedBank);
      write("text.streamPointer", savedStream);
      if (preserve) setOutput(savedOutput);
    }
    function* selectRecord(target) {
      const location = source.location(target);
      requireValue(Number.isInteger(location.bank), "text-record-bank");
      write("parameter.recordId", location.index); write("parameter.regionId", location.region);
      if (read("text.recordBank") !== location.bank) yield* wait("character-delay");
      write("text.recordBank", location.bank);
    }
    function* beginRecord(target, prepare = false) {
      if (prepare) {
        const location = source.location(target);
        write("parameter.recordId", location.index); write("parameter.regionId", location.region);
        yield* external("text-record-window", {record: target}, prepareRecord);
      }
      yield* selectRecord(target);
      write("text.nestedState", 255); write("text.mode", 0);
      if (read("text.recordCounter")) {
        write("text.recordCounter", 0);
        yield* include(source.record(runtime.prefix_region, read("parameter.dialogueActor")));
      }
    }
    function* stream(reference, start, repeat = false) {
      let cursor = start, dispatched;
      write("text.streamPointer", source.pointer(reference, cursor - 1));
      for (let steps = 0; steps < 65536; steps++) {
        if (!repeat && dispatched === undefined) write("text.outputCount", 0);
        const redispatched = dispatched !== undefined;
        const instruction = dispatched === undefined
          ? source.read(reference, cursor, read("text.mode") !== 0, repeat)
          : source.dispatch(reference, cursor, dispatched);
        if (instruction.kind === "unavailable") {
          yield* external("text-source", {reference, offset: cursor}, null);
          continue;
        }
        dispatched = undefined;
        cursor += tokenLength(instruction);
        write("text.streamPointer", source.pointer(reference, cursor - 1));
        const {token, kind, operands: args} = instruction;
        if (kind === "end") {write("text.nestedState", 0); write("glyph.half", 0); return cursor;}
        if (repeat && token === 0xFE) return cursor;
        if (kind === "glyph") yield* glyph(instruction);
        else if (kind === "glyph-control") {
          const result = yield* external("text-glyph-control", {instruction}, controlGlyph);
          if (result.rewind) {cursor--; write("text.streamPointer", source.pointer(reference, cursor - 1));}
          if (result.redispatch) {dispatched = instruction.operands[0]; continue;}
        } else if (kind === "literal") {
          if ((!repeat && !read("text.mode") || redispatched) && token !== 0xFF) {
            write("glyph.half", 0); write("glyph.firstHalf", 0); write("glyph.secondHalf", 0);
          }
          emit(!redispatched && (repeat || read("text.mode")) || token < 0x16 || token >= 0x24 ? token : token + 0x6A);
        } else if (token === 0xF6 || token === 0x63) write("text.mode", read("text.mode") ^ 1);
        else if (token === 0x42) {const pools = [...read("glyph.pools")]; pools[0] = glyphParameters.control_reset_tile; write("glyph.pools", pools);}
        else if (token === 0xE4) yield* confirm();
        else if (token === 0xE5 || token === 0xE7) {
          if (token === 0xE7) write("text.windowOffset", (read("text.windowOffset") + 64) & 65535);
          yield* lineBreak();
        } else if (token === 0xFE || token === 0xF0) {
          if (token === 0xF0) write("parameter.dialogueActor", args[0]);
          yield* confirm(); yield* lineBreak(); page++;
          setOutput(output() - runtime.prefix_retreat);
          yield* include(source.record(runtime.prefix_region, read("parameter.dialogueActor")));
        } else if (token === 0xEE) write("text.characterDelay", args[0]);
        else if (token === 0xED || token === 0x9E) {write("glyph.half", 0); setOutput(output() + args[0]);}
        else if (token === 0xEF || token === 0x8C) {
          const count = args[0] || 256, origin = output();
          for (let index = 0; index < count; index++) emit(args[1], origin + index, false, false);
          setOutput(origin + args[0]);
        } else if (token === 0xF1) {
          const count = args[0] || 65536;
          for (let index = 0; index < count; index++) yield* wait("controller");
        } else if ([0xEA, 0xEC, 0xF2, 0xF3, 0xF7, 0x43].includes(token)) {
          const region = token === 0xF7 ? args[1] : ({0xEA: 0x13, 0xEC: 0x14, 0xF2: 9, 0xF3: 17, 0x43: 9})[token];
          if (token === 0x43) write("text.mode", 0);
          yield* include(source.record(region, args[0]));
        } else if (token === 0xF4) {
          const begin = cursor;
          for (let index = 0; index < (args[0] || 256); index++) cursor = yield* stream(reference, begin, true);
        } else if (token === 0xF5) yield* external("text-hook", {hook: args[0]}, runHook);
        else if (token === 0xE3 || token === 0xEB) {
          yield* lineBreak();
          requireValue(choiceParameters && Number.isInteger(choiceParameters.region)
            && Number.isInteger(choiceParameters.record), "text-choice-parameters");
          yield* include(source.record(choiceParameters.region, choiceParameters.record), true);
          const result = yield* external("text-choice", {instruction, parameters: choiceParameters}, choose);
          requireValue(result.confirmed === true && Number.isInteger(result.value), "text-choice-confirmation");
          write("parameter.result", result.value);
          if (token === 0xEB && args[result.value] !== 255) {
            requireValue(Number.isInteger(args[result.value]), "text-choice-successor");
            const target = source.record(read("text.regionId"), args[result.value]);
            write("text.command", 0); write("text.recordCounter", 1);
            if (followChoice) yield* external("text-choice-followup", {record: target}, followChoice);
            else {yield* beginRecord(target, true); yield* stream(target, 0);}
          }
          return cursor;
        } else if ([0xE2, 0xE6, 0xE8, 0xE9, 0xF8, 0xF9, 0xFA, 0xFB, 0xFC, 0xFD].includes(token)) {
          const valueType = [0xE2, 0xF8, 0xF9].includes(token) ? "unsigned-integer"
            : [0xE9, 0xFA, 0xFB].includes(token) ? "text-record-ref" : "fixed-runtime-text-source";
          const result = yield* external("text-provider", {instruction, valueType}, resolveProvider);
          if (token === 0xE6) continue;
          if (result.empty) continue;
          if (valueType === "unsigned-integer") {
            const format = token === 0xE2 ? 2 : args[1], bytes = (format & 15) + 1;
            requireValue(bytes <= 3 && Number.isSafeInteger(result.value) && result.value >= 0, "text-provider-integer");
            const value = result.value % (256 ** bytes), digits = String(value), origin = output();
            write("glyph.half", 0);
            if (!(token === 0xF8 && format & 128 && value === 0)) {
              const skip = token === 0xF8 ? [3, 5, 8][bytes - 1] - digits.length : 0;
              for (let index = 0; index < digits.length; index++) emit(Number(digits[index]), origin + skip + index, false, false);
              if (token !== 0xF8) {
                if (read("text.active")) {
                  for (let index = 0; index <= digits.length; index++) {
                    setOutput(origin + index); yield* refreshCharacter();
                  }
                } else setOutput(origin + digits.length);
              }
            }
          } else {
            const target = valueType === "text-record-ref" ? result.value?.node_id
              || source.record(result.value?.region, result.value?.record) : source.runtime(result.value);
            requireValue(typeof target === "string", "text-provider-record");
            yield* include(target, [0xFA, 0xFC].includes(token), valueType === "fixed-runtime-text-source");
          }
        } else throw new TypeError(`text-control:${token}`);
        if (!repeat && read("text.outputCount") && read("text.active")) yield* refreshCharacter();
        if (!read("text.nestedState") && !repeat) return cursor;
      }
      throw new TypeError("text-stream-without-boundary");
    }
    function* run() {
      if (entry === "confirm") yield* confirm();
      else if (entry === "refresh") yield* refreshCharacter();
      else {
        if (reset) {
          yield* beginRecord(record);
        }
        yield* stream(record, offset);
        write("text.nestedState", 255);
        if (finalConfirmation) {
          yield* wait("character-delay");
          write("text.active", 0); write("text.command", 0);
          yield* confirm();
        }
      }
      return snapshot("available", null, {confirmed: entry === "confirm" || entry === "record" && finalConfirmation,
        returnValue: read("parameter.result")});
    }
    return Object.freeze({
      advance(input = {}) {
        if (cancelled) throw new TypeError("text-execution-cancelled");
        if (current?.status === "available") return current;
        presentation = {};
        let response;
        if (current?.status === "pending") {
          if (frameWaiting) {
            response = waits.advance(input);
            if (response.status !== "available") return {...current, ...response, page, confirmedWaits};
            presentation = {display: response.display,
              frame: {state: response.state, display: response.display, page, confirmedWaits}};
            frameEffects.push(...response.effects);
          } else {
            if (externalExecution) response = externalExecution.advance(input);
            else if (!["available", "pending", "unavailable"].includes(input.status)) {
              const kind = current.continuation?.kind;
              if (kind === "text-provider") response = resolveProvider({...current.request, state: state.capture()});
              else if (kind === "text-source") response = {status: "available"};
              else return current;
            } else response = input;
          }
        }
        const step = execution.next(response);
        current = step.value;
        return current;
      },
      cancel() {cancelled = true; externalExecution?.cancel?.(); waits.cancel(); execution.return();},
    });
  }});
}

function tokenLength(instruction) {
  return instruction.token === 0xEB && instruction.kind === "control"
    ? instruction.length - instruction.operands.length : instruction.length;
}
