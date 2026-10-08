// @editor-module 剧情字段对象将插入指令投影为现有数组控件。
import {esc} from '../../core/dom.js';
import {storyCommandPresentation} from '../../core/story-command-presentation.js';
import {sceneCameraCoordinate, sceneCameraByte} from '../../core/story-camera.js';
import {storyCommandOperandReference} from './operand-references.js';
import {prepareModuleComponent} from '../../ui/module-components.js';
import {mountFieldObjectArrayReference, mountFieldObjectArrayPosition,
  mountFieldObjectArrayChoice, mountFieldObjectField} from '../../ui/field-object-editor.js';

export function storyInsertionBytes(declaration, semantic, sceneId = 0) {
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
export function storyTokenFieldObject(object, tokenId, defaults) {
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
export function storyInsertionFieldObject(object, bytes) {
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

export async function mountStoryTokenOperands(host, object, {
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
