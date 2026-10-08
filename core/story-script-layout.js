// @editor-module 剧情指令身份、共用字节组与入口游标布局校验。
import {projectFieldDraftOrigin, projectFieldDraftRevision} from "./project-field-draft.js";
import {isFrozenValidatedJson} from './project-store-values.js';

const clone = value => JSON.parse(JSON.stringify(value));
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const hex = (value, width = 2) => `0x${value.toString(16).toUpperCase().padStart(width, "0")}`;
const fail = message => {throw new TypeError(`剧情脚本：${message}`);};
const projections = new WeakMap();
const programViews = new WeakMap();
const originLayouts = new WeakMap();
const pageIndices = new WeakMap();

function projectionInputs(asset, previous) {
  const revision = projectFieldDraftRevision(asset);
  // 字段修订覆盖指令顺序与操作数；其余布局输入仍按当前值判定。
  const signature = revision === null ? JSON.stringify([asset.sequence, asset.stream_order,
    asset.farjump, asset.scripts.map(script => [script.id, script.bytecode])]) : null;
  if (previous && previous.layout === asset.layout && previous.revision === revision
      && (revision === null ? previous.signature === signature
        : previous.order.length === asset.stream_order.length
          && previous.order.every((id, index) => id === asset.stream_order[index])
          && previous.scriptIds.length === asset.scripts.length
          && previous.scriptIds.every((id, index) => id === asset.scripts[index].id))) return previous;
  return {layout: asset.layout, revision, signature,
    order: [...asset.stream_order], scriptIds: asset.scripts.map(script => script.id)};
}

function currentProjection(asset) {
  let cached = projections.get(asset);
  const inputs = projectionInputs(asset, cached?.inputs);
  if (!cached || cached.inputs !== inputs) {
    cached = {inputs,
      assembled: lazyStoryScriptLayout(asset) || assembleStoryScriptLayout(asset), programs: []};
    projections.set(asset, cached);
  }
  return cached;
}

function lazyStoryScriptLayout(asset) {
  const origin = projectFieldDraftOrigin(asset);
  if (!origin?.layout || !equal(asset.sequence, asset.layout.sequence)) return null;
  const scripts = new Map(asset.scripts.map(script => [script.id, script]));
  const origins = new Map(origin.scripts.map(script => [script.id, script]));
  const ranges = [];
  let length = 0;
  for (const id of asset.stream_order) {
    const size = origins.get(id).bytecode.length;
    ranges.push({start: length, end: length + size, script: scripts.get(id)});
    length += size;
  }
  if (length !== asset.layout.capacity) fail("Origin 字节数组容量改变");
  const byteAt = index => {
    let low = 0, high = ranges.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (ranges[middle].end <= index) low = middle + 1;
      else high = middle;
    }
    const range = ranges[low];
    if (!range || !(range.start <= index && index < range.end)) return undefined;
    if (!range.bytes) {
      range.bytes = [...range.script.bytecode];
      if (range.bytes.length !== range.end - range.start) fail("现有字节数组容量改变");
    }
    return range.bytes[index - range.start];
  };
  const bytes = {length, slice: (start, end) => Uint8Array.from(
    Array.from({length: Math.max(0, Math.min(end, length) - start)}, (_, index) => byteAt(start + index)))};
  const groups = new Map(asset.layout.groups.map(group => [group.id, group]));
  const declarations = new Map(asset.layout.declarations.map(row => [row.opcode, row]));
  const commands = asset.layout.commands.map(source => {
    const command = {...source, source_offset: source.offset};
    Object.defineProperties(command, {
      opcode: {enumerable: true, get: () => byteAt(source.offset)},
      declaration: {enumerable: true, get: () => {
        const declaration = declarations.get(byteAt(source.offset));
        if (!declaration || declaration.width !== source.width) fail("现有操作数编辑改变了指令读宽");
        return declaration;
      }},
    });
    return command;
  });
  return {bytes, byteAt, commands, overflowBytes: 0, entries: new Map(asset.layout.entries.map(entry =>
    [entry.script_id, groups.get(entry.group_id).offset + entry.offset])),
  offsets: new Map(asset.layout.groups.map(group => [group.id, group.offset])), tokens: groups};
}

function storyCommandWidth(declaration) {
  if (!Number.isInteger(declaration.read_width) || declaration.read_width < 1)
    fail("指令声明缺少读宽");
  return declaration.read_width;
}

/** 发布方提供指令与入口的读路径；字段对象只组织这些已确认描述。 */
export function createStoryScriptLayout(asset, table, declarations, reclaimable = []) {
  const source = asset.stream_order.flatMap(id => asset.scripts.find(script => script.id === id).bytecode);
  if (!Number.isInteger(table.pool_bytes) || source.length !== table.pool_bytes)
    fail("Origin 字节数组与声明的池容量不同");
  const commands = [...new Map(table.entries.flatMap(entry => entry.commands.map(command =>
    [command.prg_offset - table.pool_prg, command]))).entries()].sort((a, b) => a[0] - b[0])
    .map(([offset, command], index) => ({id: `command-${index.toString(16).padStart(4, "0")}`,
      offset, opcode: command.opcode, width: storyCommandWidth(declarations[command.opcode])}));
  const byOffset = new Map(commands.map(command => [command.offset, command]));
  const groups = [];
  let end = 0;
  const append = (offset, length, members) => {
    const id = `group-${groups.length.toString(16).padStart(4, "0")}`;
    groups.push({id, offset, length, commands: members});
  };
  for (const command of commands) {
    if (command.offset > end) append(end, command.offset - end, []);
    if (command.offset < end) {
      const group = groups.at(-1);
      group.commands.push(command.id);
      group.length = Math.max(group.length, command.offset + command.width - group.offset);
    } else append(command.offset, command.width, [command.id]);
    end = Math.max(end, command.offset + command.width);
  }
  if (end < source.length) append(end, source.length - end, []);
  if (end > source.length) fail("指令读取超过池边界");
  const locate = offset => {
    const group = groups.find(row => row.offset <= offset && offset < row.offset + row.length);
    if (!group) fail("入口或跳转缺少字节组");
    return {group_id: group.id, offset: offset - group.offset};
  };
  const entries = table.entries.map(entry => ({script_id: entry.id,
    ...locate(entry.pointer_prg - table.pool_prg)}));
  for (const group of groups) {
    group.script_id = [...table.entries].sort((a, b) => b.pointer_prg - a.pointer_prg)
      .find(entry => entry.pointer_prg - table.pool_prg <= group.offset)?.id;
    group.reclaimable = !group.commands.length && reclaimable.some(range =>
      range.offset <= group.offset && group.offset + group.length <= range.offset + range.length);
  }
  for (const command of commands) {
    command.branches = [];
    const seen = new Set();
    for (const entry of table.entries) {
      const original = entry.commands.find(row => row.prg_offset - table.pool_prg === command.offset);
      if (!original) continue;
      for (const index of original.dynamic_advance_operands || []) {
        const targetOffset = entry.pointer_prg - table.pool_prg + ((original.cursor + source[command.offset + index]) & 255);
        const target = byOffset.get(targetOffset);
        if (!target) fail("相对跳转未落在已确认指令边界");
        const key = `${index}/${target.id}/${entry.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        command.branches.push({index, target: target.id, script_id: entry.id});
      }
    }
    command.group_id = locate(command.offset).group_id;
  }
  return {capacity: source.length, declarations: declarations.map(declaration => ({
    opcode: declaration.opcode, name: declaration.name, fixed_advance: declaration.fixed_advance,
    dynamic_advance_operands: [...declaration.dynamic_advance_operands],
    terminal_side_effect: declaration.terminal_side_effect,
    width: storyCommandWidth(declaration),
  })), entries, commands, groups, sequence: groups.map(group => group.id)};
}

function sourceBytes(asset) {
  return asset.stream_order.flatMap(id => asset.scripts.find(script => script.id === id).bytecode);
}

export function assembleStoryScriptLayout(asset, {sequence = asset.sequence, validate = true, requireCapacity = false,
  virtualPages = asset.farjump?.enabled === true} = {}) {
  const layout = asset.layout;
  if (!layout || !Array.isArray(sequence)) fail("缺少已发布的指令布局");
  const source = sourceBytes(asset);
  if (source.length !== layout.capacity) fail("Origin 字节数组容量改变");
  const groups = new Map(layout.groups.map(group => [group.id, group]));
  const declarations = new Map(layout.declarations.map(row => [row.opcode, row]));
  const bytes = [], offsets = new Map(), tokens = new Map(), commands = [];
  const structural = !equal(sequence, layout.sequence);
  const byOriginalCommand = new Map(layout.commands.map(command => [command.id, command]));
  const originals = new Set(layout.groups.map(group => group.id));
  for (const token of sequence) {
    const id = typeof token === "string" ? token : token?.id;
    if (typeof id !== "string" || offsets.has(id)) fail("指令组身份无效或重复");
    const group = typeof token === "string" ? groups.get(token) : null;
    if (typeof token === "string" && !group) fail("引用了不存在的 Origin 指令组");
    if (structural && group?.reclaimable) continue;
    offsets.set(id, bytes.length);
    tokens.set(id, token);
    if (group) {
      bytes.push(...source.slice(group.offset, group.offset + group.length));
      for (const commandId of group.commands) {
        const original = byOriginalCommand.get(commandId);
        commands.push({...original, offset: offsets.get(id) + original.offset - group.offset,
          source_offset: original.offset});
      }
    } else {
      if (originals.has(id) || !id.startsWith("insert-") || !Number.isInteger(token.script_id)
          || !layout.entries.some(entry => entry.script_id === token.script_id)
          || Object.keys(token).sort().join() !== "bytes,id,script_id,targets") fail("插入指令身份无效");
      const declaration = declarations.get(token.bytes?.[0]);
      if (!declaration || token.bytes.length !== declaration.width || token.bytes.some(byte =>
        !Number.isInteger(byte) || byte < 0 || byte > 255)) fail("插入指令与声明的操作数数量不同");
      if (!Array.isArray(token.targets) || token.targets.some(target =>
        !Number.isInteger(target.index) || !declaration.dynamic_advance_operands.includes(target.index)
        || typeof target.target !== "string") || new Set(token.targets.map(target => target.index)).size !== token.targets.length
        || declaration.dynamic_advance_operands.some(index => !token.targets.some(target => target.index === index)))
        fail("插入指令的相对跳转目标不完整");
      commands.push({id, group_id: id, offset: bytes.length, width: declaration.width,
        opcode: declaration.opcode, branches: token.targets.map(target => ({...target, script_id: token.script_id}))});
      bytes.push(...token.bytes);
    }
  }
  if (requireCapacity && bytes.length > layout.capacity) fail(`容量不足：需要 ${bytes.length} 字节，池容量 ${layout.capacity} 字节`);
  const entries = new Map();
  for (const entry of layout.entries) {
    const originalGroup = groups.get(entry.group_id);
    if (entry.offset) {
      if (!offsets.has(entry.group_id)) fail(`共用入口 ${hex(entry.script_id)} 所在的指令组不能删除`);
      entries.set(entry.script_id, offsets.get(entry.group_id) + entry.offset);
    } else {
      const first = sequence.find(token => (typeof token === "string" ? groups.get(token)?.script_id : token.script_id) === entry.script_id
        && offsets.has(typeof token === "string" ? token : token.id));
      const firstId = typeof first === "string" ? first : first?.id;
      if (!firstId || originalGroup.script_id !== entry.script_id) fail(`脚本 ${hex(entry.script_id)} 缺少入口指令`);
      entries.set(entry.script_id, offsets.get(firstId));
    }
  }
  const byId = new Map(commands.map(command => [command.id, command]));
  const bySourceOffset = new Map(layout.commands.map(command => [command.offset, command]));
  const writes = new Map();
  for (const command of commands) {
    for (const branch of command.branches) {
      const original = byOriginalCommand.get(command.id);
      const originalEntry = layout.entries.find(entry => entry.script_id === branch.script_id);
      const originalEntryOffset = originalEntry && groups.get(originalEntry.group_id).offset + originalEntry.offset;
      const targetId = original ? bySourceOffset.get(originalEntryOffset +
        ((original.offset - originalEntryOffset + source[original.offset + branch.index]) & 255))?.id : branch.target;
      const target = byId.get(targetId);
      if (!target) fail(`跳转目标 ${branch.target} 已被删除`);
      const entry = entries.get(branch.script_id);
      const cursor = command.offset - entry, destination = target.offset - entry;
      if (!virtualPages && (cursor < 0 || cursor > 255 || destination < 0 || destination > 255))
        fail(`脚本 ${hex(branch.script_id)} 的跳转超过八位游标范围`);
      const index = command.offset + branch.index;
      const value = (destination - cursor) & 255;
      if (!virtualPages && writes.has(index) && writes.get(index) !== value) fail("共用指令的跳转读法不一致");
      writes.set(index, value);
    }
  }
  if (structural && !virtualPages) for (const [index, value] of writes) {
    if (commands.some(command => command.offset === index) && bytes[index] !== value)
      fail("跳转重定位会改变共用入口的指令");
    bytes[index] = value;
  }
  const byOffset = new Map(commands.map(command => [command.offset, command]));
  for (const command of commands) {
    const declaration = declarations.get(bytes[command.offset]);
    if (!declaration || declaration.width !== command.width) fail("现有操作数编辑改变了指令读宽");
    command.opcode = declaration.opcode;
    command.declaration = declaration;
    command.bytes = bytes.slice(command.offset, command.offset + declaration.width);
  }
  if (validate && structural && !virtualPages) {
    for (const [scriptId, entry] of entries) {
      const seen = new Set(), queue = [0];
      for (let index = 0; index < queue.length; index++) {
        const cursor = queue[index];
        if (seen.has(cursor)) continue;
        seen.add(cursor);
        const command = byOffset.get(entry + cursor);
        if (!command) fail(`脚本 ${hex(scriptId)} 的游标 ${hex(cursor)} 未落在指令边界`);
        const declaration = command.declaration;
        if (declaration.terminal_side_effect) continue;
        const advances = [declaration.fixed_advance, ...declaration.dynamic_advance_operands.map(operand => bytes[command.offset + operand])]
          .filter(advance => advance > 0);
        for (const advance of advances) queue.push((cursor + advance) & 255);
      }
    }
  }
  return {bytes: Uint8Array.from(bytes), commands, entries, offsets, tokens,
    overflowBytes: Math.max(0, bytes.length - layout.capacity)};
}

/** 超容量时按脚本恢复 Origin，共用指令与跳转依赖一并恢复。 */
export function storyScriptWritePlan(asset, {originAsset = null} = {}) {
  const cached = currentProjection(asset);
  if (cached.writePlan && cached.writePlanOrigin === originAsset) return cached.writePlan;
  cached.writePlanOrigin = originAsset;
  const current = cached.assembled;
  if (asset.farjump?.enabled === true) {
    const origin = originAsset || projectFieldDraftOrigin(asset);
    return cached.writePlan = storyFarjumpPlan(asset, current, origin);
  }
  if (!current.overflowBytes) return cached.writePlan = {sequence: asset.sequence, omittedScriptIds: [], overflowBytes: 0};
  const {layout} = asset;
  const groups = new Map(layout.groups.map(group => [group.id, group]));
  const owner = token => typeof token === "string" ? groups.get(token).script_id : token.script_id;
  const omitted = new Set();
  const reads = new Map();
  const commandOwner = command => groups.get(command.group_id)?.script_id ?? current.tokens.get(command.group_id).script_id;
  const byOffset = new Map(current.commands.map(command => [command.offset, command]));
  for (const [scriptId, entry] of current.entries) {
    const owners = new Set([scriptId]), seen = new Set(), queue = [0];
    for (let index = 0; index < queue.length; index++) {
      const cursor = queue[index];
      if (seen.has(cursor)) continue;
      seen.add(cursor);
      const command = byOffset.get(entry + cursor);
      if (!command) continue;
      owners.add(commandOwner(command));
      if (!command.declaration.terminal_side_effect) queue.push(...[
        command.declaration.fixed_advance,
        ...command.declaration.dynamic_advance_operands.map(index => command.bytes[index]),
      ].filter(advance => advance > 0).map(advance => (cursor + advance) & 255));
    }
    reads.set(scriptId, owners);
  }
  const byId = new Map(current.commands.map(command => [command.id, command]));
  for (const command of current.commands) for (const branch of command.branches) {
    const target = byId.get(branch.target);
    if (target) reads.get(commandOwner(command)).add(commandOwner(target));
  }
  const restore = () => {
    let sequence = asset.sequence;
    for (const scriptId of omitted) sequence = restoreScriptSequence(layout, sequence, scriptId);
    return sequence;
  };
  const length = sequence => {
    const structural = !equal(sequence, layout.sequence);
    return sequence.reduce((sum, token) => {
      const group = typeof token === "string" ? groups.get(token) : null;
      return sum + (group ? structural && group.reclaimable ? 0 : group.length : token.bytes.length);
    }, 0);
  };
  let sequence = asset.sequence;
  const growth = asset.stream_order.map((scriptId, index) => ({scriptId, index,
    bytes: length(asset.sequence.filter(token => owner(token) === scriptId))
      - length(layout.sequence.filter(token => owner(token) === scriptId)),
  })).filter(row => row.bytes > 0).sort((a, b) => b.bytes - a.bytes || b.index - a.index);
  for (const {scriptId} of growth) {
    if (length(sequence) <= layout.capacity) break;
    omitted.add(scriptId);
    let expanded;
    do {
      expanded = false;
      for (const [id, owners] of reads) {
        if (![...owners].some(ownerId => omitted.has(ownerId))) continue;
        for (const ownerId of [id, ...owners]) if (!omitted.has(ownerId)) {
          omitted.add(ownerId);
          expanded = true;
        }
      }
    } while (expanded);
    sequence = restore();
  }
  return cached.writePlan = {sequence, omittedScriptIds: [...omitted].sort((a, b) => a - b), overflowBytes: current.overflowBytes};
}

function pagePrograms(asset, assembled, scriptIds = null) {
  const {layout} = asset;
  let indices = pageIndices.get(assembled);
  if (!indices || indices.layout !== layout) {
    indices = {layout,
      byOffset: new Map(assembled.commands.map(command => [command.offset, command])),
      byId: new Map(assembled.commands.map(command => [command.id, command])),
      origins: new Map(layout.commands.map(command => [command.id, command])),
      sourceAt: new Map(layout.commands.map(command => [command.offset, command])),
      groups: new Map(layout.groups.map(group => [group.id, group]))};
    pageIndices.set(assembled, indices);
  }
  const {byOffset, byId, origins, sourceAt, groups} = indices;
  return [...assembled.entries].filter(([scriptId]) => !scriptIds || scriptIds.has(scriptId)).map(([scriptId, entry]) => {
    const sourceEntry = layout.entries.find(row => row.script_id === scriptId);
    const originalEntry = groups.get(sourceEntry.group_id).offset + sourceEntry.offset;
    const queue = [byOffset.get(entry)], seen = new Set(), members = [], branches = [];
    let reason = null, length = 0;
    for (let index = 0; index < queue.length; index++) {
      const command = queue[index];
      if (!command) fail(`脚本 ${hex(scriptId)} 的可达游标未落在指令边界`);
      if (seen.has(command.id)) continue;
      seen.add(command.id);
      const cursor = command.offset - entry;
      if (cursor < 0) reason = "跳转落在入口之前";
      length = Math.max(length, cursor + command.width);
      members.push(command);
      const declaration = command.declaration;
      if (declaration.terminal_side_effect) continue;
      if (declaration.fixed_advance > 0) {
        const source = origins.get(command.id);
        const originalNext = source && source.offset - originalEntry + declaration.fixed_advance;
        const next = source && originalNext >= 256
          ? byId.get(sourceAt.get(originalEntry + (originalNext & 255))?.id)
          : byOffset.get(command.offset + declaration.fixed_advance);
        queue.push(next);
      }
      for (const operand of declaration.dynamic_advance_operands) {
        const value = assembled.byteAt ? assembled.byteAt(command.offset + operand) : assembled.bytes[command.offset + operand];
        const source = origins.get(command.id);
        if (source && !value) continue;
        const target = source ? byId.get(sourceAt.get(originalEntry +
          ((source.offset - originalEntry + value) & 255))?.id)
          : byId.get(command.branches.find(branch => branch.index === operand)?.target);
        if (!target) fail(`脚本 ${hex(scriptId)} 的跳转缺少指令身份`);
        if (!source && target.offset === command.offset) continue;
        branches.push({command, operand, target});
        queue.push(target);
      }
    }
    members.sort((left, right) => left.offset - right.offset);
    const signature = members.map(command => ({id: command.id, cursor: command.offset - entry,
      bytes: Array.from({length: command.width}, (_, index) => assembled.byteAt
        ? assembled.byteAt(command.offset + index) : assembled.bytes[command.offset + index]),
      targets: branches.filter(branch => branch.command === command)
        .map(branch => [branch.operand, branch.target.id])}));
    if (length > 256) reason = `脚本需要 ${length} 字节，远跳页上限为 256 字节`;
    const payload = new Uint8Array(256);
    if (!reason) {
      payload.set(assembled.bytes.slice(entry, entry + length));
      for (const {command, operand, target} of branches) {
        const offset = command.offset + operand;
        const value = (target.offset - command.offset) & 255;
        if (members.some(member => member.offset === offset) && payload[offset - entry] !== value)
          fail("跳转重定位会改变共用入口的指令");
        payload[offset - entry] = value;
      }
    }
    return {scriptId, length, payload, signature, reason};
  });
}

export function changeStoryScriptSequence(asset, {commandId, action, bytes, targets = [], id, scriptId, after = false, insertionPoint = null}) {
  const layout = asset.layout;
  const assembled = assembleStoryScriptLayout(asset);
  const command = assembled.commands.find(row => row.id === commandId);
  if (!command) fail("未选中可编辑指令");
  const groupId = command.group_id;
  const group = layout.groups.find(row => row.id === groupId);
  if (action !== "insert" && group?.commands.length > 1) fail("这条指令与另一入口共用操作数字节，只能编辑操作数");
  const sequence = clone(asset.sequence);
  let position = sequence.findIndex(token => (typeof token === "string" ? token : token.id) === groupId);
  if (action === "insert" || action === "copy") {
    if (action === 'copy') {
      bytes = [...assembled.bytes.slice(command.offset, command.offset + command.width)];
      const entry = assembled.entries.get(scriptId);
      if (asset.farjump?.enabled === true) {
        const source = pagePrograms(asset, assembled).find(program => program.scriptId === scriptId)
          ?.signature.find(row => row.id === commandId);
        if (!source) fail('复制指令不属于选中脚本');
        targets = source.targets.map(([index, target]) => ({index, target}));
      } else targets = command.declaration.dynamic_advance_operands.map(index => ({index,
          target: assembled.commands.find(row => row.offset === entry +
            ((command.offset - entry + bytes[index]) & 255))?.id}));
      after = true;
    }
    if (insertionPoint === 'start') {
      const first = assembled.commands.find(row => row.offset === assembled.entries.get(scriptId));
      position = sequence.findIndex(token => (typeof token === 'string' ? token : token.id) === first.group_id);
      if (first.offset !== assembled.offsets.get(first.group_id)) fail('共用入口只能编辑操作数');
    } else if (insertionPoint === 'end') {
      const activeGroups = new Set(assembled.commands.map(row => row.group_id));
      const owns = token => activeGroups.has(typeof token === 'string' ? token : token.id)
        && (typeof token === 'string' ? layout.groups.find(row => row.id === token)?.script_id : token.script_id) === scriptId;
      position = sequence.findLastIndex(owns);
      const last = assembled.commands.filter(row => row.group_id === (typeof sequence[position] === 'string' ? sequence[position] : sequence[position]?.id)).at(-1);
      if (!last) fail('脚本缺少结尾指令');
      after = false;
    }
    sequence.splice(position + (after ? 1 : 0), 0, {id, script_id: scriptId, bytes, targets});
  } else if (action === "delete") sequence.splice(position, 1);
  else if (action === "up" || action === "down") {
    const next = position + (action === "up" ? -1 : 1);
    const other = sequence[next];
    const ownerOf = token => typeof token === "string" ? layout.groups.find(row => row.id === token)?.script_id : token?.script_id;
    if (!other || ownerOf(other) !== ownerOf(sequence[position])) fail("指令不能调换到另一脚本");
    if (typeof other === "string" && layout.groups.find(row => row.id === other).commands.length > 1)
      fail("不能调换重叠入口所在的指令组");
    [sequence[position], sequence[next]] = [sequence[next], sequence[position]];
  } else fail("未知结构编辑操作");
  assembleStoryScriptLayout(asset, {sequence});
  return sequence;
}

function createStoryCommandSource(asset) {
  const commands = new Map(), scripts = new Map();
  for (const command of asset.layout.commands)
    if (!commands.has(command.id)) commands.set(command.id, command);
  const origin = projectFieldDraftOrigin(asset) || asset;
  for (const script of origin.scripts)
    if (!scripts.has(script.id)) scripts.set(script.id, script);
  let end = 0;
  const ranges = asset.stream_order.map(id => {
    const start = end;
    end += scripts.get(id).bytecode.length;
    return {id, start, end};
  });
  return (commandId, index = 0) => {
    const original = commands.get(commandId);
    if (!original) return {kind: "sequence", tokenId: commandId, index};
    const offset = original.offset + index;
    let low = 0, high = ranges.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (ranges[middle].end <= offset) low = middle + 1;
      else high = middle;
    }
    if (ranges[low] && offset < ranges[low].end)
      return {kind: "bytecode", scriptId: ranges[low].id, index: offset - ranges[low].start};
    fail("指令字段缺少来源");
  };
}

export function storyScriptBytecode(asset, scriptId, {lazy = false} = {}) {
  const assembled = currentProjection(asset).assembled;
  const offset = assembled.entries.get(scriptId);
  if (!lazy) return assembled.bytes.slice(offset, offset + 256);
  const length = Math.min(256, assembled.bytes.length - offset);
  return {length, byteAt: index => Number.isInteger(index) && index >= 0 && index < length
    ? assembled.byteAt ? assembled.byteAt(offset + index) : assembled.bytes[offset + index] : undefined};
}

export function storyScriptByteAt(asset, offset) {
  const assembled = currentProjection(asset).assembled;
  return assembled.byteAt ? assembled.byteAt(offset) : assembled.bytes[offset];
}

function restoreScriptSequence(layout, current, scriptId) {
  const groupIds = new Set(layout.groups.filter(group => group.script_id === scriptId).map(group => group.id));
  const original = layout.sequence.filter(id => groupIds.has(id));
  const belongs = token => typeof token === "string" ? groupIds.has(token) : token.script_id === scriptId;
  const sequence = current.filter(token => !belongs(token));
  const groups = new Map(layout.groups.map(group => [group.id, group]));
  const following = new Set(layout.sequence.slice(layout.sequence.lastIndexOf(original.at(-1)) + 1)
    .map(id => groups.get(id).script_id));
  const next = sequence.findIndex(token => following.has(typeof token === "string" ? groups.get(token).script_id : token.script_id));
  const position = next < 0 ? sequence.length : next;
  sequence.splice(position, 0, ...original);
  return sequence;
}

export function storyScriptResetOwners(asset, scriptId) {
  const owners = new Set([scriptId]);
  if (asset.farjump?.enabled !== true) return [...owners];
  const origin = projectFieldDraftOrigin(asset) || asset;
  for (const [value, sequence] of [[origin, origin.layout.sequence], [asset, asset.sequence]]) {
    const assembled = equal(sequence, value.sequence) ? currentProjection(value).assembled
      : assembleStoryScriptLayout(value, {sequence, virtualPages: true});
    const program = pagePrograms(value, assembled, new Set([scriptId]))[0];
    if (!program) fail(`脚本 ${hex(scriptId)} 缺少入口`);
    const commands = new Map(assembled.commands.map(command => [command.id, command]));
    const groups = new Map(value.layout.groups.map(group => [group.id, group]));
    for (const instruction of program.signature) {
      const groupId = commands.get(instruction.id).group_id;
      owners.add(groups.get(groupId)?.script_id ?? assembled.tokens.get(groupId).script_id);
    }
  }
  return [...owners].sort((left, right) => left - right);
}

export function resetStoryScriptSequence(asset, scriptId) {
  let sequence = asset.sequence;
  for (const owner of storyScriptResetOwners(asset, scriptId))
    sequence = restoreScriptSequence(asset.layout, sequence, owner);
  assembleStoryScriptLayout(asset, {sequence});
  return sequence;
}

export function projectStoryScriptPrograms(asset, published) {
  if (!projectFieldDraftOrigin(asset)) return prepareStoryScriptPrograms(asset, published);
  let cached = programViews.get(asset);
  const inputs = projectionInputs(asset, cached?.inputs);
  if (!cached || cached.inputs !== inputs || cached.published.length !== published.length
      || cached.published.some((program, index) => program !== published[index])) {
    const prepared = new Map();
    const current = index => {
      if (!prepared.has(index)) prepared.set(index,
        prepareStoryScriptPrograms(asset, [published[index]], published)[0]);
      return prepared.get(index);
    };
    const value = published.map((program, index) => Object.defineProperties({...program}, {
      pointer_prg: {enumerable: true, get: () => current(index).pointer_prg},
      commands: {enumerable: true, get: () => current(index).commands},
      unwrittenOverflowBytes: {enumerable: true, get: () => current(index).unwrittenOverflowBytes},
      unwrittenReason: {enumerable: true, get: () => current(index).unwrittenReason},
      scriptLocation: {enumerable: true, get: () => current(index).scriptLocation},
      instructionLayout: {value: true},
    }));
    cached = {inputs, published, value};
    programViews.set(asset, cached);
  }
  return cached.value;
}

export function storyScriptRuntimePointer(program) {
  const offset = program?.pointer_prg;
  if (!Number.isInteger(offset) || offset < 0) throw new TypeError('剧情脚本缺少所属指针');
  return 0x8000 | (offset & 0x1FFF);
}

function prepareStoryScriptPrograms(asset, published, templatesSource = published) {
  const cached = currentProjection(asset);
  const previous = cached.programs.find(row => row.published.length === published.length
    && row.published.every((program, index) => program === published[index]));
  if (previous) return previous.value;
  const assembled = cached.assembled;
  const commandSource = cached.commandSource ||= createStoryCommandSource(asset);
  const plan = storyScriptPreviewPlan(asset, published.map(program => program.id));
  cached.templateIndices ||= [];
  let indices = cached.templateIndices.find(row => row.source.length === templatesSource.length
    && row.source.every((program, index) => program === templatesSource[index]));
  if (!indices) {
    const commands = templatesSource.flatMap(program => program.commands || []);
    indices = {source: [...templatesSource],
      templates: new Map(commands.map(command => [command.opcode, command])),
      originals: new Map(commands.map(command => [command.prg_offset, command]))};
    cached.templateIndices.push(indices);
  }
  const {templates, originals} = indices;
  const groups = cached.groups ||= new Map(asset.layout.groups.map(group => [group.id, group]));
  const sourceEntry = asset.layout.entries.find(entry => entry.script_id === published[0]?.id);
  if (!sourceEntry) return [];
  const base = published[0].pointer_prg - groups.get(sourceEntry.group_id).offset - sourceEntry.offset;
  const byOffset = cached.byOffset ||= new Map(assembled.commands.map(command => [command.offset, command]));
  const byId = cached.byId ||= new Map(assembled.commands.map(command => [command.id, command]));
  const value = published.map(program => {
    const page = plan.programs?.find(page => page.scriptId === program.id);
    const draft = plan.drafts?.find(page => page.scriptId === program.id);
    const overflowBytes = draft ? Math.max(0, draft.length - 256)
      : plan.omittedScriptIds.includes(program.id) ? plan.overflowBytes : 0;
    const location = page ? plan.remoteScripts.some(page => page.scriptId === program.id) ? "farjump-page" : "original-pool" : null;
    let projection;
    const prepare = () => {
      if (projection) return projection;
      const entry = assembled.entries.get(program.id);
      const seen = new Set(), queue = page ? page.signature.map(command => command.cursor) : [0], commands = [];
      for (let index = 0; index < queue.length; index++) {
        const cursor = queue[index];
        if (seen.has(cursor)) continue;
        seen.add(cursor);
        const current = byOffset.get(entry + cursor);
        if (!current) continue;
        const declaration = current.declaration;
        const original = originals.get(base + current.source_offset);
        const template = original?.opcode === current.opcode ? original : templates.get(current.opcode) || {};
        const raw = [...assembled.bytes.slice(current.offset, current.offset + 6)];
        const identity = page?.signature.find(command => command.id === current.id);
        if (identity && !page.reason) for (const [operand, targetId] of identity.targets) {
          const target = byId.get(targetId);
          raw[operand] = (target.offset - current.offset) & 255;
        }
        const edges = [];
        if (!declaration.terminal_side_effect) {
          if (declaration.fixed_advance > 0) {
            const next = cursor + declaration.fixed_advance;
            edges.push({kind: "normal", advance: declaration.fixed_advance,
              operand_index: null, target_cursor: page?.signature.some(command => command.cursor === next)
                ? next : next & 255, target_status: "command"});
          }
          for (const operand of declaration.dynamic_advance_operands) if (raw[operand]) edges.push({kind: "conditional",
            advance: raw[operand], operand_index: operand, target_cursor: identity
              ? byId.get(identity.targets.find(target => target[0] === operand)?.[1]).offset - entry
              : (cursor + raw[operand]) & 255, target_status: "command"});
          if (!page) queue.push(...edges.map(edge => edge.target_cursor));
        }
        commands.push({...template, cursor, cursor_hex: hex(cursor), opcode: current.opcode, opcode_hex: hex(current.opcode),
          unwrittenOverflowBytes: overflowBytes, unwrittenReason: draft?.reason || null, scriptLocation: location,
          normal_advance: declaration.fixed_advance, dynamic_advance_operands: declaration.dynamic_advance_operands,
          terminal_side_effect: declaration.terminal_side_effect, edges, raw_window: raw, operands: raw.slice(1),
          prg_offset: base + current.offset, prg_offset_hex: hex(base + current.offset, 6),
          instructionId: current.id, instructionSource: commandSource(current.id),
          readWidth: declaration.width,
          instructionBindings: Array.from({length: declaration.width}, (_, index) => {
            const source = commandSource(current.id, index);
            return source.kind === "bytecode" ? {resourceId: asset.resource_id,
              handle: `${asset.resource_id}:script:${source.scriptId.toString(16).toUpperCase().padStart(2, "0")}`,
              byteIndex: source.index} : source;
          }),
          currentOperands: raw.slice(1), structureScriptId: groups.get(current.group_id)?.script_id
            ?? assembled.tokens.get(current.group_id)?.script_id});
      }
      projection = commands;
      return projection;
    };
    const result = Object.defineProperties({...program, pointer_prg: base + assembled.entries.get(program.id),
      unwrittenOverflowBytes: overflowBytes, unwrittenReason: draft?.reason || null, scriptLocation: location}, {
      commands: {enumerable: true, get: prepare},
      instructionLayout: {value: true},
    });
    return result;
  });
  cached.programs.push({published, value});
  return value;
}

export function storyScriptPreviewCommand(asset, commandId) {
  return currentProjection(asset).assembled.commands.find(command => command.id === commandId);
}

export function storyScriptPreviewCommands(asset, scriptId) {
  const assembled = currentProjection(asset).assembled;
  const entry = assembled.entries.get(scriptId);
  return assembled.commands.filter(command => command.offset >= entry && command.offset - entry <= 255);
}

export function storyScriptPreviewPlan(asset, scriptIds) {
  const cached = currentProjection(asset);
  if (asset.farjump?.enabled !== true) return storyScriptWritePlan(asset);
  cached.previewPlans ||= new Map();
  const key = JSON.stringify([...new Set(scriptIds)].sort((a, b) => a - b));
  if (!cached.previewPlans.has(key)) cached.previewPlans.set(key,
    storyFarjumpPlan(asset, cached.assembled, projectFieldDraftOrigin(asset), new Set(scriptIds)));
  return cached.previewPlans.get(key);
}

function storyFarjumpPlan(asset, assembled, origin, ids = null) {
  if (!origin) fail("远跳布局缺少 Origin");
  let originLayout = isFrozenValidatedJson(origin) && originLayouts.get(origin);
  if (!originLayout) {
    originLayout = assembleStoryScriptLayout(origin, {virtualPages: true});
    if (isFrozenValidatedJson(origin)) originLayouts.set(origin, originLayout);
  }
  const before = pagePrograms(origin, originLayout, ids);
  const after = pagePrograms(asset, assembled, ids);
  const changed = after.filter(program => !equal(program.signature,
    before.find(row => row.scriptId === program.scriptId)?.signature));
  return {sequence: asset.sequence, overflowBytes: assembled.overflowBytes, programs: after,
    remoteScripts: changed.filter(program => !program.reason), drafts: changed.filter(program => program.reason),
    omittedScriptIds: changed.filter(program => program.reason).map(program => program.scriptId)};
}
