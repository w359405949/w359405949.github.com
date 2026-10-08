// @editor-module 渲染参数引用所属代码字段对象。
import {state} from './state.js';
const parameter = (resourceId, name, offset) => Object.freeze({name, resource_id: resourceId,
  entity_handle: `${resourceId}:code-parameter:${name}`, field: 'value',
  physical: Object.freeze({space: 'prg', offset, length: 1, end_exclusive: offset + 1})});

export const RENDER_CODE_PARAMETERS = Object.freeze([
  parameter('attack-visual-runtime', 'initial-effect-bank', 0x2F90E),
  parameter('battle-presentation-service', 'blink-frames', 0x7E152),
  parameter('battle-presentation-service', 'reveal-frames', 0x7E173),
  parameter('battle-presentation-service', 'reveal-first-latch', 0x7E16B),
  parameter('battle-presentation-service', 'reveal-latch-step', 0x7E17B),
  parameter('raster-interrupt-runtime-service', 'reveal-bottom', 0x7D5D8),
  parameter('battle-message-service', 'terminal-wait-cursor-low', 0x2E74E),
  parameter('battle-message-service', 'terminal-wait-cursor-high', 0x2E752),
  parameter('story-action-handler', 'scripted-party-role', 0x21A6F),
]);

export async function renderCodeFields(names, readField) {
  const {db} = await import('./project-db.js');
  const read = readField ?? (source => db.getField(source.resource_id, source.entity_handle, source.field));
  return Object.fromEntries(await Promise.all(names.map(async name => {
    const source = RENDER_CODE_PARAMETERS.find(row => row.name === name);
    if (!source) throw new TypeError(`渲染代码参数未发布：${name}`);
    const field = await read(source);
    if (!Number.isInteger(field?.value) || field.value < 0 || field.value > 255)
      throw new TypeError(`渲染代码参数缺失：${source.entity_handle}`);
    return [name, field];
  })));
}

export async function battleMessageWaitPosition(readField) {
  const {db} = await import('./project-db.js');
  const {battleConditionCursors} = await import('./battle-condition-code-sources.js');
  const read = readField ?? (source => db.getField(source.resource_id, source.entity_handle, source.field));
  const [fields, cursors] = await Promise.all([
    renderCodeFields(['terminal-wait-cursor-low', 'terminal-wait-cursor-high'], read),
    battleConditionCursors(read),
  ]);
  if (!Number.isInteger(cursors[0])) throw new TypeError('缺少战斗消息行起点');
  return {cursor: fields['terminal-wait-cursor-low'].value
    | (fields['terminal-wait-cursor-high'].value << 8), origin: cursors[0]};
}

const entryFields = new WeakMap();

export async function prepareAttackChrEntryContext() {
  const repository = state.projectRepository;
  const fields = await renderCodeFields(['initial-effect-bank']);
  if (state.projectRepository !== repository) throw new Error('项目已切换，停止读取攻击入口');
  entryFields.set(repository, fields['initial-effect-bank']);
}

export function attackInitialEffectBank() {
  const field = entryFields.get(state.projectRepository);
  if (!field) throw new TypeError('缺少攻击执行入口的 CHR 上下文');
  return field.value;
}
