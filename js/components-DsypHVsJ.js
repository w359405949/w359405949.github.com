import { esc, prepareModuleComponent, registerModuleComponent, currentTextReference } from './interface-state-preview-Dlotqlmn.js';
import { STORY_COMMAND_GROUPS, storyCommandCatalog, storyCommandPresentation, storyScriptPreviewCommand, storyScriptPreviewPlan, storyScriptResetOwners, trackProjectFieldProjection, projectFieldDraftOrigin, resetStoryScriptSequence, storyScriptPreviewCommands, changeStoryScriptSequence, assembleStoryScriptLayout, db } from './prg-loaders-DnCSmXk9.js';
import { state } from './emulator-Bpa8EsFw.js';
import { storyPageDefinitionForView } from './baseline-assembly-DW8BWbDB.js';
import { referencePickerMarkup, bindReferencePicker, updateReferencePickerItem, registerReferenceFieldPresentation, hydrateReferenceFieldPickers, referenceFieldPickerMarkup } from './timeline-player-YCH7Y-3h.js';
import { resetToOriginalButton, applyResetToOriginalStates } from './battle-result-script-runtime-BSeJpUGH.js';
import { canonicalJsonEqual } from './visual-metasprites-IDA0o2Z8.js';
import { sceneCameraByte, sceneCameraCoordinate } from './ui-construction-preview-BuoQ5mM6.js';
import { mountFieldObjectArrayChoice, mountFieldObjectField, mountFieldObjectArrayPosition, mountFieldObjectArrayReference } from './field-object-editor-Blro4OF0.js';

// @editor-module 自主脚本操作数的引用语义。
const TARGETS = Object.freeze({
  "set-extension-flag": {0: "save-extension-bitmap"},
  "clear-extension-flag": {0: "save-extension-bitmap"},
  "branch-if-extension-set": {0: "save-extension-bitmap"},
  "branch-if-extension-clear": {0: "save-extension-bitmap"},
  "set-event-flag": {0: "global-event-flag"},
  "clear-event-flag": {0: "global-event-flag"},
  "branch-if-event-flag-clear": {0: "global-event-flag"},
  "wait-event-flag-set": {0: "global-event-flag"},
  "remove-actor-if-event-flag-set": {0: "global-event-flag"},
  "sound-command": {0: "audio-command"},
  "start-scripted-encounter": {0: "encounter-formation", 1: "global-event-flag"},
  "set-direct-frame-id": {0: "direct-frame"},
  "set-actor-type-animation-renderer": {0: "actor-type"},
  "set-actor-type": {0: "actor-type"},
  "play-render-slot-offset-sequence": {1: "actor-type"},
  "branch-if-runtime-party-actor-type-absent": {0: "actor-type"},
  "replace-runtime-entity-scene": {0: "scene-header-map", 1: "scene-header-map"},
  "end-story-state-with-scene-context": {0: "scene-header-map"},
  "find-party-item-and-branch": {0: "item-entry"},
  "replace-party-item": {0: "item-entry", 1: "item-entry"},
  "grant-party-item-and-branch": {0: "item-entry"},
  "park-selected-vehicle": {0: "actor-type"},
  "push-temporary-field-entity": {0: "direct-frame"},
});

function storyCommandOperandReference(command, semantic, index, operands = []) {
  if (semantic?.operation === "start-event-selected-dialogue") {
    if (index === semantic.flag_operand_index) return {module: "global-event-flag"};
    if ([semantic.set_record_operand_index, semantic.clear_record_operand_index].includes(index))
      return {module: "text-record", regionId: semantic.region_id};
  }
  if (command?.blocking_ui || ['start-blocking-dialogue', 'start-blocking-ui-action'].includes(semantic?.operation)) {
    const variableRegion = Number(command?.opcode) === 0x26;
    const regionId = variableRegion ? operands[0] : command?.blocking_ui?.region_id ?? semantic?.region_id;
    const recordIndex = variableRegion ? 1
      : command?.blocking_ui?.record_operand_index ?? semantic?.record_operand_index ?? 0;
    if (index === recordIndex && Number.isInteger(regionId)) return {module: "text-record", regionId};
  }
  const target = TARGETS[semantic?.operation]?.[index];
  return target ? {module: target} : null;
}

function storyOperandReference(field, programs, semantics) {
  const owner = field?.owner_ref;
  if (field?.kind !== "script-operand" || owner?.resource_id !== "story-autonomous-script") return null;
  const program = programs.find(item => item.kind !== "interaction"
    && `story-autonomous-script.script.${Number(item.id).toString(16).padStart(2, "0")}`
      === owner.script_resource_id);
  if (!program) return null;
  const reference = field.references?.find(item => Number(item.program_id) === Number(program.id));
  if (!reference) return null;
  const index = Number(owner.byte_index) - Number(reference.cursor) - 1;
  const semantic = semantics.get(Number(reference.opcode));
  const command = program.commands?.find(item => Number(item.cursor) === Number(reference.cursor));
  return storyCommandOperandReference(command, semantic, index, command?.operands || []);
}

// @editor-module 共用剧情脚本的 Working 归属入口。

async function mountStoryScriptOwner(host, database, resourceId, scriptId) {
  const page = await database.storyScriptOwner(resourceId, scriptId);
  host.querySelector("[data-story-script-owner]")?.remove();
  if (!host.isConnected || !page || page === state.view) return;
  const link = document.createElement("a");
  link.dataset.storyScriptOwner = page;
  link.href = `?view=${encodeURIComponent(page)}`;
  link.textContent = `由${storyPageDefinitionForView(page).navigationLabel}改动 ↗`;
  host.append(link);
}

// @editor-module 指令按用途与动作分组，动作配置在预览区选择。

function commandFamilies(declarations, semantics) {
  const families = new Map();
  for (const command of storyCommandCatalog(declarations, semantics)) {
    const semantic = semantics.get(command.opcode);
    const key = semantic?.operation || `opcode:${command.opcode}`;
    if (!families.has(key)) families.set(key, []);
    families.get(key).push(command);
  }
  return [...families].map(([value, commands]) => ({value, commands,
    group: commands[0].group,
    label: commands.length > 1 ? commands[0].label.split(' · ')[0] : commands[0].label}));
}

function familyItem(family, opcode) {
  const command = family.commands.find(row => row.opcode === opcode) || family.commands[0];
  return {value: family.value, controlValue: command.opcode, label: family.label,
    currentLabel: command.label, group: family.group, groupLabel: family.group,
    filter: family.commands.map(row => `${row.label} ${row.description} ${row.code} 0x${row.code}`).join(' ')};
}

function storyCommandPickerMarkup({resourceId, declarations, semantics, opcode = 0x19}) {
  const families = commandFamilies(declarations, semantics);
  const current = families.find(family => family.commands.some(row => row.opcode === opcode));
  return referencePickerMarkup({moduleId: resourceId, label: '插入指令',
    value: current?.value, items: STORY_COMMAND_GROUPS.flatMap(group => families.filter(family => family.group === group)
      .map(family => familyItem(family, opcode))),
    grouped: true, compact: true, previewPanel: true, pageSize: 48,
    className: 'reference-detail-field story-command-picker',
    filterLabel: '搜索指令', filterPlaceholder: '名称／指令码',
    controlMarkup: `<input type="hidden" data-script-opcode value="${opcode}">`});
}

function bindStoryCommandPicker(picker, {declarations, semantics}) {
  const families = commandFamilies(declarations, semantics);
  const control = picker.querySelector('[data-script-opcode]');
  const chosen = new Map(families.map(family => [family.value,
    family.commands.some(command => command.opcode === Number(control.value)) ? Number(control.value) : family.commands[0].opcode]));
  picker.querySelector(':scope > details').addEventListener('toggle', event => {
    if (!event.currentTarget.open) return;
    for (const family of families) {
      const opcode = family.commands.some(command => command.opcode === Number(control.value))
        ? Number(control.value) : family.commands[0].opcode;
      chosen.set(family.value, opcode);
      const option = [...picker.querySelectorAll('[data-reference-picker-option]')]
        .find(option => option.dataset.referencePickerOption === family.value);
      option.dataset.referencePickerControlValue = String(opcode);
      option.dataset.referencePickerCurrentLabel = familyItem(family, opcode).currentLabel;
    }
  });
  const preview = value => {
    const family = families.find(row => row.value === value);
    if (!family) return '';
    const command = family.commands.find(row => row.opcode === chosen.get(value));
    return `<h4>${esc(family.label)}</h4><p>${esc(command.description)}</p>
      <dl class="story-inspector-fields" data-story-command-parameters${command.operands.length ? '' : ' hidden'}><dt>参数</dt><dd>${esc(command.operands.join(' · '))}</dd></dl>
      ${family.commands.length > 1 ? referencePickerMarkup({moduleId: picker.dataset.moduleReferenceModule,
        label: '配置', compact: true, value: chosen.get(value),
        componentAttributes: `data-story-command-family="${esc(value)}"`,
        items: family.commands.map(row => ({value: row.opcode, label: row.label, meta: row.code})),
        controlMarkup: `<input type="hidden" value="${chosen.get(value)}">`}) : ''}`;
  };
  bindReferencePicker(picker, {preview,
    onSelect: value => updateReferencePickerItem(picker, familyItem(
      families.find(family => family.value === value), chosen.get(value))),
    paint: root => {
    const secondary = root.querySelector('[data-story-command-family]');
    if (!secondary) return;
    const family = families.find(row => row.value === secondary.dataset.storyCommandFamily);
    bindReferencePicker(secondary, {onSelect: value => {
      const opcode = Number(value);
      chosen.set(family.value, opcode);
      const command = family.commands.find(row => row.opcode === opcode);
      const parameters = root.querySelector('[data-story-command-parameters]');
      parameters.hidden = !command.operands.length;
      parameters.querySelector('dd').textContent = command.operands.join(' · ');
      const option = [...picker.querySelectorAll('[data-reference-picker-option]')]
        .find(option => option.dataset.referencePickerOption === family.value);
      option.dataset.referencePickerControlValue = String(opcode);
      option.dataset.referencePickerCurrentLabel = command.label;
    }});
  }});
}

// @editor-module 剧情字段对象将插入指令投影为现有数组控件。

function storyInsertionBytes(declaration, semantic, sceneId = 0) {
  const bytes = Array(declaration.width).fill(0);
  bytes[0] = declaration.opcode;
  if (semantic?.operation === 'wait-operand-frames') bytes[1] = 30;
  if (semantic?.operation === 'drive-scripted-input') bytes[1] = 1;
  if (semantic?.operation === 'countdown-relative-branch') bytes[2] = 1;
  if (semantic?.paths?.length) bytes[1] = semantic.paths[0].path_id;
  if (semantic?.sequences?.length) bytes[1] = semantic.sequences[0].selector;
  if (semantic?.operation === 'start-scripted-encounter') bytes[3] = 255;
  if (semantic?.operation === 'end-story-state-with-scene-context') {
    bytes[1] = sceneId;
    bytes[2] = sceneId === 0 ? 0 : sceneCameraByte(sceneId, -8);
    bytes[3] = sceneId === 0 ? 0 : sceneCameraByte(sceneId, -7);
  }
  return bytes;
}

// 投影不另存值；读取与写入须回到 sequence 字段。
function storyTokenFieldObject(object, tokenId, defaults) {
  const sequence = object.fields.find(field => field.fieldName === 'sequence');
  const token = value => value.find(row => typeof row !== 'string' && row.id === tokenId);
  const field = {...sequence,
    get value() {return token(sequence.value)?.bytes || [];},
    get defaultValue() {return defaults;},
    bind(host, render) {return sequence.bind(host, (target, value) => {
      const current = token(value); if (current) render(target, current.bytes);
    });},
    async set(bytes, {selection} = {}) {
      const value = structuredClone(sequence.value), current = token(value);
      if (!current) throw new TypeError('插入指令已删除');
      for (const {offset, length} of selection || [{offset: 0, length: bytes.length}])
        current.bytes.splice(offset, length, ...bytes.slice(offset, offset + length));
      return sequence.set(value, {expectedVersion: sequence.version});
    },
    reset({selection} = {}) {return this.set(defaults, {selection});},
  };
  return {...object, fields: [field, sequence], definition: {...object.definition,
    editor: {kind: 'numeric-table', columns: [{name: 'sequence', label: '操作数', min: 0, max: 255}]}}};
}

// 插入表单只保存待插入值，确认插入须由脚本字段对象提交。
function storyInsertionFieldObject(object, bytes) {
  const sequence = object.fields.find(field => field.fieldName === 'sequence');
  const bindings = [];
  const field = {...sequence, value: [...bytes], defaultValue: [...bytes], readOnly: false,
    bind(host, render) {bindings.push({host, render}); render(host, this.value);},
    async set(value) {
      this.value = [...value];
      for (const {host, render} of bindings) if (host.isConnected) render(host, this.value);
      return [this];
    },
    reset({selection} = {}) {
      const value = [...this.value];
      for (const {offset, length} of selection || [{offset: 0, length: value.length}])
        value.splice(offset, length, ...this.defaultValue.slice(offset, offset + length));
      return this.set(value);
    },
  };
  return {...object, fields: [field], definition: {...object.definition,
    editor: {kind: 'numeric-table', columns: [{name: 'sequence', label: '操作数', min: 0, max: 255}]}}};
}

function packedOperandObject(object, index) {
  const source = object.fields[0];
  const parts = bytes => [bytes[index] >>> 4, bytes[index] & 15];
  const field = {...source, get value() {return parts(source.value);},
    get defaultValue() {return parts(source.defaultValue);},
    bind(host, render) {return source.bind(host, (target, bytes) => render(target, parts(bytes)));},
    set(values, {selection} = {}) {
      const current = parts(source.value);
      for (const {offset} of selection || [{offset: 0}, {offset: 1}]) current[offset] = values[offset];
      const bytes = [...source.value]; bytes[index] = (current[0] << 4) | current[1];
      return source.set(bytes, {selection: [{offset: index, length: 1}]});
    },
    reset(options) {return this.set(this.defaultValue, options);},
  };
  return {...object, fields: [field, ...object.fields], definition: {...object.definition,
    editor: {kind: 'numeric-table', columns: [{name: field.fieldName, label: '坐标', min: 0, max: 15}]}}};
}

async function mountStoryTokenOperands(host, object, {
  declaration, semantic, semantics = new Map(), scenes = [], sceneId = null, targets = [], choices = [], actorAppearance = {},
  onTarget, onValue, insertion = false,
}) {
  const field = object.fields[0];
  const presentation = storyCommandPresentation(semantic);
  const operation = semantic?.operation;
  const position = ['move-actor-to-position', 'set-actor-position',
    'branch-on-player-position-exact'].includes(operation) ? [[1, 2]]
    : ['wander-inside-rectangle', 'branch-on-player-position-rectangle'].includes(operation) ? [[1, 3], [2, 4]]
      : operation === 'end-story-state-with-scene-context' ? [[1, 2, 3]] : [];
  if (!scenes.some(scene => Number(scene.id) === sceneId) && operation !== 'end-story-state-with-scene-context') position.length = 0;
  const grouped = new Set(position.flat());
  const variableRegion = declaration.opcode === 0x26;
  if (variableRegion) grouped.add(1);
  const packedPosition = operation === 'set-packed-camera-relative-position';
  if (packedPosition) grouped.add(1);
  host.innerHTML = '';
  host.classList.add('story-script-operands');
  const control = label => {
    const row = document.createElement('label');
    row.innerHTML = `${esc(label)}<span></span>`; host.append(row);
    return row.querySelector('span');
  };
  let previous = JSON.stringify(field.value);
  const options = {entityHandle: field.entityHandle, fieldName: field.fieldName,
    onValue: value => {
      const signature = JSON.stringify(value);
      if (signature !== previous) onValue?.(value);
      previous = signature;
    }};
  if (['wait', 'set-direction', 'attempt-tile-step', 'drive-scripted-input'].includes(operation)) {
    const choices = [...semantics.values()].filter(row => row.operation === operation)
      .map(row => ({value: row.opcode, label: storyCommandPresentation(row).label}));
    if (choices.length) mountFieldObjectArrayChoice(control(operation === 'wait' ? '帧数' : '方向'),
      object, {...options, byteIndex: 0, choices, label: operation === 'wait' ? '帧数' : '方向'});
  }
  if (packedPosition) {
    const packed = packedOperandObject(object, 1);
    for (const [index, label] of ['相对 X', '相对 Y'].entries())
      mountFieldObjectField(control(label), packed, {...options, byteIndex: index, label});
  }
  for (const [part, indices] of position.entries()) {
    const destination = operation === 'end-story-state-with-scene-context';
    mountFieldObjectArrayPosition(control(destination ? '目的地' : position.length > 1 ? ['起点', '上界'][part] : '位置'),
      object, {...options, indices, entries: scenes,
        ...(destination ? {anchor: [8, 7], decodeCoordinate: sceneCameraCoordinate, encodeCoordinate: sceneCameraByte}
          : {sceneId})});
  }
  for (let index = 1; index < declaration.width; index++) {
    if (grouped.has(index)) continue;
    const label = presentation.operands[index - 1] || `操作数 ${index}`;
    const target = control(label);
    if (declaration.dynamic_advance_operands.includes(index)) {
      const select = document.createElement('select'); select.setAttribute('aria-label', '跳转目标');
      select.dataset.scriptTarget = String(index);
      for (const choice of choices) select.add(new Option(choice.label, choice.id));
      select.value = targets.find(target => target.index === index)?.target || choices[0]?.id || '';
      target.append(select);
      select.addEventListener('change', () => onTarget?.(index, select.value));
      continue;
    }
    const reference = storyCommandOperandReference({opcode: declaration.opcode}, semantic, index - 1, field.value.slice(1));
    if (reference) {
      const {module, regionId} = reference;
      const component = module === 'global-event-flag' ? 'save-container' : module;
      const kind = module === 'global-event-flag' ? 'event-flag-reference' : 'reference';
      const prepared = await prepareModuleComponent(component, kind, {
        ...(module === 'actor-type' ? actorAppearance : {}),
        ...(!variableRegion && module === 'text-record' ? {regionId} : {}),
        ...(module === 'direct-frame' ? {reference: {module, key: ['id']}} : {}),
      });
      if (!host.isConnected) return;
      await mountFieldObjectArrayReference(target, object, {...options, indices: variableRegion && module === 'text-record' ? [1, index] : [index],
        picker: {compact: true, grouped: true, pageSize: 48, previewPanel: true}, resettable: !insertion,
        label, moduleId: component, kind, prepared,
        ...(module === 'actor-type' ? {candidateSelector: '[data-actor-appearance-option]',
          candidateValue: row => row.dataset.actorAppearanceOption} : {}),
        ...(variableRegion && module === 'text-record' ? {
          decode: ([region, record]) => `record:${region.toString(16).toUpperCase().padStart(2, '0')}:${String(record).padStart(3, '0')}`,
          encode: value => [parseInt(value.split(':')[1], 16), Number(value.split(':')[2])],
        } : {}),
      });
      if (insertion) {
        const input = target.querySelector('[data-field-object-value]');
        const candidates = [...target.querySelectorAll(module === 'actor-type'
          ? '[data-actor-appearance-option]' : '[data-reference-picker-option]')].filter(row => !row.disabled);
        const value = row => module === 'actor-type' ? row.dataset.actorAppearanceOption : row.dataset.referencePickerControlValue;
        if (!candidates.some(row => value(row) === input.value) && candidates.length) {
          input.value = value(candidates[0]); input.dispatchEvent(new Event('change', {bubbles: true}));
        }
      }
    } else if (operation === 'branch-on-player-direction') {
      const directionChoices = [{value: 0, label: '上'}, {value: 1, label: '下'}, {value: 2, label: '左'}, {value: 3, label: '右'}];
      mountFieldObjectArrayChoice(target, object, {...options, byteIndex: index, choices: directionChoices, label});
    } else if (index === 1 && (semantic?.paths?.length || semantic?.sequences?.length)) {
      const choices = semantic.paths?.map(row => ({value: row.path_id, label: `路径 ${row.path_id}`}))
        || semantic.sequences.map(row => ({value: row.selector, label: `序列 ${row.selector}`}));
      mountFieldObjectArrayChoice(target, object, {...options, byteIndex: index, choices, label});
    } else mountFieldObjectField(target, object, {...options, byteIndex: index, label});
  }
  if (insertion) host.querySelectorAll('[data-field-object-byte-reset], [data-field-object-position-reset]').forEach(button => button.remove());
}

// @editor-module 剧情脚本字段对象的指令插入、删除、调换与重置控件。

function storyScriptStructureMarkup(command, options = {}) {
  return `<div data-story-script-structure="${esc(JSON.stringify({resourceId: `story-${command.scriptKind}-script`,
    commandId: command.instructionId, scriptId: command.structureScriptId, frame: command.start,
    variantId: command.variantId, actorSlot: command.actorSlot, ...options}))}"></div>`;
}

function mountStoryInsertedOperand(host, object, {tokenId, operandIndex, label}) {
  const field = object.fields.find(field => field.fieldName === "sequence");
  const token = field.value.find(token => token.id === tokenId);
  const branch = field.scriptLayout.declarations[token.bytes[0]].dynamic_advance_operands.includes(operandIndex);
  const input = document.createElement(branch ? "select" : "input");
  if (branch) {
    for (const id of [...field.scriptLayout.commands.map(command => command.id),
      ...field.value.filter(token => typeof token !== "string").map(token => token.id)])
      input.add(new Option(id, id));
  } else {
    input.type = "number";
    input.min = "0";
    input.max = "255";
    input.step = "1";
  }
  input.setAttribute("aria-label", label);
  host.append(input);
  field.bind(input, (target, value) => {
    const current = value.find(token => token.id === tokenId);
    target.value = (branch ? current?.targets.find(target => target.index === operandIndex)?.target
      : current?.bytes[operandIndex]) ?? "";
  });
  input.addEventListener("change", async () => {
    input.setCustomValidity("");
    try {
      if (!input.checkValidity() || input.value === "") throw new TypeError("操作数须为 0–255 的整数");
      const value = structuredClone(field.value);
      const token = value.find(token => token.id === tokenId);
      if (branch) token.targets.find(target => target.index === operandIndex).target = input.value;
      else token.bytes[operandIndex] = Number(input.value);
      await field.set(value, {expectedVersion: field.version});
    } catch (error) {input.setCustomValidity(error.message); input.reportValidity();}
  });
}

async function hydrateStoryScriptStructure(root, database, onValue, semantics, {scenes = [], sceneAt = () => null,
  actorAppearanceFor = () => ({})} = {}) {
  for (const host of root.querySelectorAll("[data-story-script-structure]")) {
    if (host.dataset.ready) continue;
    host.dataset.ready = "true";
    const props = JSON.parse(host.dataset.storyScriptStructure);
    const object = await database.getFieldObject(props.resourceId, `${props.resourceId}:pool`);
    const field = object.fields.find(field => field.fieldName === "sequence");
    const {value: asset} = await database.readResource(props.resourceId);
    if (!host.isConnected) continue;
    const selected = storyScriptPreviewCommand(asset, props.commandId);
    if (!selected) continue;
    const plan = storyScriptPreviewPlan(asset, [props.scriptId]);
    const omitted = plan.omittedScriptIds.includes(props.scriptId);
    const draft = plan.drafts?.find(page => page.scriptId === props.scriptId);
    const reason = draft?.reason || `容量不足，超出 ${plan.overflowBytes} 字节`;
    const remote = plan.remoteScripts?.some(page => page.scriptId === props.scriptId);
    const sceneId = sceneAt(props.frame);
    const actorAppearance = actorAppearanceFor(props);
    const declarationLabel = declaration => `${declaration.opcode.toString(16).toUpperCase().padStart(2, '0')} · ${storyCommandPresentation(semantics.get(declaration.opcode)).label}`;
    host.innerHTML = `<div class="story-script-structure-actions"${props.operandsOnly ? ' hidden' : ''}>
      ${plan.remoteScripts ? `<span data-script-location>${remote ? "远跳页" : "原池"}</span>` : ""}
      ${omitted ? `<span data-script-unwritten title="未进 ROM（${esc(reason)}）" aria-label="未进 ROM（${esc(reason)}）">↛ 未进 ROM：${esc(reason)}</span>` : ""}
      <details class="story-script-insert-menu"><summary class="button ghost">插入</summary><div data-script-insert-panel></div></details>
      <button type="button" class="button ghost" data-script-action="up" title="前移指令">前移</button>
      <button type="button" class="button ghost" data-script-action="down" title="后移指令">后移</button>
      <button type="button" class="button ghost" data-script-action="copy">复制</button>
      <button type="button" class="button ghost" data-script-action="delete">删除指令</button>
      ${resetToOriginalButton(props.scriptId, {title: "重置脚本", attributes: {'data-script-action': 'reset'}})}
      </div><div data-script-insert>
      ${storyCommandPickerMarkup({resourceId: props.resourceId, declarations: asset.layout.declarations, semantics})}
      <div data-script-operands></div><label>位置 <select data-script-insert-position><option value="before">选中指令前</option><option value="after">选中指令后</option></select></label>
      <button type="button" class="button" data-script-action="insert">${props.insertionPoint === 'start' ? '在开头插入' : props.insertionPoint === 'end' ? '在结尾追加' : '插入指令'}</button>
      </div>${selected.source_offset === undefined ? `<div data-script-inserted-operands></div>` : ""}<p role="status" data-script-error hidden></p>`;
    host.querySelector('[data-script-insert-panel]').append(host.querySelector('[data-script-insert]'));
    if (props.insertionPoint) {
      host.querySelector('[data-script-insert-position]').parentElement.hidden = true;
      host.querySelector('.story-script-insert-menu').open = true;
      host.querySelectorAll('[data-script-action]').forEach(button => {
        if (!['insert', 'reset'].includes(button.dataset.scriptAction)) {button.disabled = true; button.title = '请先选中指令键';}
      });
    }
    bindStoryCommandPicker(host.querySelector('[data-script-insert] [data-module-reference-picker]'),
      {declarations: asset.layout.declarations, semantics});
    const errorHost = host.querySelector("[data-script-error]");
    await mountStoryScriptOwner(host, database, props.resourceId, props.scriptId);
    const resetObjects = await Promise.all(storyScriptResetOwners(asset, props.scriptId).map(id =>
      database.getFieldObject(props.resourceId,
        `${props.resourceId}:script:${id.toString(16).toUpperCase().padStart(2, "0")}`)));
    const resetFields = resetObjects.flatMap(object => object.fields);
    let busy = false;
    let sequenceValue = null, sequenceDirty = false;
    const syncReset = () => {
      if (sequenceValue !== field.value) {
        sequenceValue = field.value;
        if (canonicalJsonEqual(sequenceValue, asset.layout.sequence)) sequenceDirty = false;
        else {
          const current = trackProjectFieldProjection({...asset, sequence: sequenceValue},
            projectFieldDraftOrigin(asset) || asset, () => field.version);
          sequenceDirty = !canonicalJsonEqual(sequenceValue, resetStoryScriptSequence(current, props.scriptId));
        }
      }
      const dirty = sequenceDirty || resetFields.some(field => field.hasOverride);
      applyResetToOriginalStates(host, new Map([[String(props.scriptId), dirty]]), {busy});
    };
    const resetButton = host.querySelector('[data-script-action="reset"]');
    for (const member of [field, ...resetFields]) member.bind(resetButton, syncReset);
    const run = async action => {
      errorHost.hidden = true;
      const buttons = [...host.querySelectorAll('[data-script-action]')];
      const disabled = buttons.map(button => button.disabled);
      busy = true;
      buttons.forEach(button => {button.disabled = true;});
      try {await action(); await onValue(props.resourceId);}
      catch (error) {errorHost.textContent = error.message; errorHost.hidden = false;}
      finally {
        busy = false;
        buttons.forEach((button, index) => {button.disabled = disabled[index];});
        syncReset();
      }
    };
    const currentAsset = async () => (await database.readResource(props.resourceId)).value;
    const write = async (current, sequence) => {
      assembleStoryScriptLayout(current, {sequence});
      await field.set(sequence, {expectedVersion: field.version});
    };
    let choices;
    const insertionChoices = () => choices ||= storyScriptPreviewCommands(asset, props.scriptId)
      .map(command => ({id: command.id, label: `${command.id} · ${declarationLabel(command.declaration)}`}));
    const opcode = host.querySelector("[data-script-opcode]");
    const operandHost = host.querySelector("[data-script-operands]");
    const insertButton = host.querySelector('[data-script-action="insert"]');
    let insertion;
    const renderInsertion = async () => {
      insertButton.disabled = true;
      const declaration = asset.layout.declarations.find(row => row.opcode === Number(opcode.value));
      const semantic = semantics.get(declaration.opcode);
      const draft = storyInsertionFieldObject(object, storyInsertionBytes(declaration, semantic,
        scenes.some(scene => Number(scene.id) === sceneId) ? sceneId : Number(scenes[0]?.id ?? 0)));
      const container = document.createElement('div'); operandHost.replaceChildren(container);
      await mountStoryTokenOperands(container, draft, {declaration, semantic, semantics, scenes, sceneId,
        choices: insertionChoices(), actorAppearance, insertion: true});
      if (container.isConnected) {insertion = draft; insertButton.disabled = false;}
    };
    const prepareInsertion = () => {
      host.operandReady = renderInsertion().catch(error => {errorHost.hidden = false; errorHost.textContent = error.message;});
    };
    opcode.addEventListener('change', prepareInsertion);
    const insertMenu = host.querySelector('.story-script-insert-menu');
    insertMenu.addEventListener('toggle', () => {if (insertMenu.open && !insertion) prepareInsertion();});
    if (!props.operandsOnly && insertMenu.open) prepareInsertion();
    const read = () => {
      for (const input of operandHost.querySelectorAll('input[type="number"]'))
        if (!input.checkValidity() || input.value === '' || !Number.isInteger(Number(input.value))) throw new TypeError('操作数须为 0–255 的整数');
      const targets = [...operandHost.querySelectorAll('[data-script-target]')].map(select => {
        if (!select.value) throw new TypeError('须选择跳转目标');
        return {index: Number(select.dataset.scriptTarget), target: select.value};
      });
      return {bytes: [...insertion.fields[0].value], targets};
    };
    for (const button of host.querySelectorAll("[data-script-action]")) button.addEventListener("click", () => {
      host.editCompletion = run(async () => {
        const current = await currentAsset();
        const action = button.dataset.scriptAction;
        if (action === "reset") {
          const sequence = resetStoryScriptSequence(current, props.scriptId);
          const scriptObjects = await Promise.all(storyScriptResetOwners(current, props.scriptId).map(id =>
            database.getFieldObject(props.resourceId,
              `${props.resourceId}:script:${id.toString(16).toUpperCase().padStart(2, "0")}`)));
          await database.writeFields([{field, value: sequence},
            ...scriptObjects.flatMap(object => object.fields.map(field => ({field, reset: true})))],
            {expectedVersion: field.version});
        } else await write(current, changeStoryScriptSequence(current, {...props, action,
          ...(action === "insert" ? {...read(), after: host.querySelector('[data-script-insert-position]').value === 'after', id: `insert-${crypto.randomUUID()}`}
            : action === 'copy' ? {id: `insert-${crypto.randomUUID()}`} : {})}));
      });
    });
    const insertedHost = host.querySelector("[data-script-inserted-operands]");
    if (insertedHost && props.operandsOnly) {
      const token = asset.sequence.find(token => typeof token !== "string" && token.id === props.commandId);
      await mountStoryTokenOperands(insertedHost, storyTokenFieldObject(object, token.id,
        storyInsertionBytes(selected.declaration, semantics.get(selected.opcode), sceneId ?? 0)), {
        declaration: selected.declaration, semantic: semantics.get(selected.opcode), semantics, scenes, sceneId,
        targets: token.targets, choices: insertionChoices(), actorAppearance,
        onTarget: (index, target) => {host.editCompletion = run(async () => {
          const current = await currentAsset();
          const sequence = structuredClone(current.sequence);
          sequence.find(token => token.id === props.commandId).targets.find(row => row.index === index).target = target;
          await write(current, sequence);
        });},
      });
      insertedHost.addEventListener('field-object-saved', () => {
        host.editCompletion = onValue(props.resourceId).catch(error => {errorHost.hidden = false; errorHost.textContent = error.message;});
      });
    }
    if (props.operandsOnly) {
      host.querySelector('.story-script-structure-actions').remove();
      host.querySelector('[data-story-script-owner]')?.remove();
    } else insertedHost?.remove();
  }
}

// @editor-module shell-record owner 的 14 项候选与战斗摘要

const SHELL_MODULE_ID = "shell-record";

function shellId(value) {
  const result = Number(value?.id ?? value);
  return Number.isInteger(result) && result >= 0 && result <= 0x0d ? result : null;
}

function idHex(value) {
  const id = shellId(value);
  return id === null ? "??" : id.toString(16).toUpperCase().padStart(2, "0");
}

function idFromReference({entry = null, handle = "", value = ""} = {}) {
  const direct = shellId(entry);
  if (direct !== null) return direct;
  const match = /^(?:shell-record|shell):([0-9a-f]{1,2})$/iu.exec(
    String(handle || "").trim());
  return match ? Number.parseInt(match[1], 16) : shellId(value);
}

function nameHandle(entry) {
  const region = String(entry?.name_text_region || "0D").toUpperCase();
  const record = Number(entry?.name_text_record_id);
  return /^[0-9A-F]{2}$/u.test(region) && Number.isInteger(record)
    ? `record:${region}:${String(record).padStart(3, "0")}` : "";
}

function shellName(entry) {
  const handle = nameHandle(entry);
  return handle ? currentTextReference(handle).label || String(entry?.name || "")
    : String(entry?.name || `炮弹 $${idHex(entry)}`);
}

function shellSummary(entry) {
  const price = Number(entry?.price?.value);
  return [
    entry?.special === false ? "普通弹" : "特殊炮弹",
    Number.isFinite(price) ? `${price} G` : "",
  ].filter(Boolean).join(" · ");
}

function shellPreviewMarkup({
  entry = null, handle = "", value = "", componentAttributes = "",
} = {}) {
  const id = idFromReference({entry, handle, value});
  if (id === null) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>?</b><small>炮弹引用未解析</small></span>`;
  }
  const resolved = entry || {id};
  return `<span class="module-reference-data-preview" ${componentAttributes}>
    <b>${esc(shellName(resolved))}</b><small>${esc(shellSummary(resolved))}</small>
  </span>`;
}

function shellReferenceItem(entry) {
  const id = shellId(entry);
  if (id === null) return null;
  const hex = idHex(id);
  const name = shellName(entry);
  const summary = shellSummary(entry);
  const parameter = Number(entry?.damage_parameter);
  return {
    value: String(id),
    label: `${hex} · ${name}`,
    description: summary,
    meta: `shell-record:${hex}`,
    preview: shellPreviewMarkup({entry}),
    filter: [id, hex, `shell:${hex}`, `shell-record:${hex}`, name, summary, parameter]
      .filter(value => value !== null && value !== undefined).join(" ").toLowerCase(),
  };
}

async function prepareShellComponent(props) {
  try {
    const documentValue = await db.getDocument(SHELL_MODULE_ID, null);
    const entries = documentValue?.records;
    if (!Array.isArray(entries)) throw new TypeError(`${SHELL_MODULE_ID} 缺少 records 候选表`);
    const requestedId = idFromReference(props);
    return {
      ...props,
      entries,
      entry: props.entry || entries.find(entry => shellId(entry) === requestedId) || null,
      error: entries.length ? "" : `${SHELL_MODULE_ID} 的静态候选值域为空`,
    };
  } catch (error) {
    return {...props, entries: [], error: `候选项不可用：${error?.message || error}`};
  }
}

function shellReferencePickerMarkup({
  entries = [], value = null, label = "炮弹", controlMarkup = "",
  componentAttributes = "", error = "",
} = {}) {
  return referenceFieldPickerMarkup({
    reference: {module: SHELL_MODULE_ID},
    rows: entries,
    value,
    label,
    controlMarkup,
    componentAttributes,
    error,
  });
}

registerReferenceFieldPresentation(SHELL_MODULE_ID, {
  item: shellReferenceItem,
  className: "shell-reference-field",
  filterLabel: "过滤炮弹",
  filterPlaceholder: "ID／当前名称／普通或特殊／视觉",
});

registerModuleComponent(SHELL_MODULE_ID, "reference", {
  prepare: prepareShellComponent,
  render: shellReferencePickerMarkup,
  hydrate: hydrateReferenceFieldPickers,
});

for (const kind of ["preview", "cover"]) {
  registerModuleComponent(SHELL_MODULE_ID, kind, {
    prepare: prepareShellComponent,
    render: shellPreviewMarkup,
  });
}

export { bindStoryCommandPicker, hydrateStoryScriptStructure, mountStoryInsertedOperand, mountStoryScriptOwner, mountStoryTokenOperands, storyCommandOperandReference, storyCommandPickerMarkup, storyInsertionBytes, storyOperandReference, storyScriptStructureMarkup };
