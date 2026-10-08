// @editor-module 界面预览上下文随项目保留，页面与组件只读取同一份选择。
import {state} from './state.js';

export function interfacePreviewContext() {
  const contexts = state.interfacePreviewContexts ||= new Map();
  const key = state.projectRepository;
  if (!contexts.has(key)) contexts.set(key, {
    slot: 1, actor: 'rom-role:0', wanted: 1, kind: 'role', role: 0, vehicle: 0,
    partyRoles: [0], dropRoll: 0, scene: null, service: null,
  });
  return contexts.get(key);
}

export function selectInterfacePreviewContext(field, value) {
  const context = interfacePreviewContext();
  context[field] = value;
  if (field !== 'actor') return context;
  const [kind, token] = String(value).split(':');
  const id = Number(token);
  if (!Number.isInteger(id)) throw new TypeError('界面预览对象无效');
  if (kind.endsWith('role')) {
    context.kind = 'role';
    context.role = id;
    state.fieldMenuRole = id;
  } else if (kind.endsWith('vehicle')) {
    context.kind = 'vehicle';
    context.vehicle = id;
  }
  return context;
}

export function applyInterfacePreviewSceneRoute(params) {
  if (!params.has('previewScene') && !params.has('previewCommand')) return;
  const context = interfacePreviewContext();
  if (params.has('previewScene')) {
    const sceneId = Number(params.get('previewScene'));
    const point = String(params.get('previewPoint') || '8,7').split(',').map(Number);
    if (Number.isInteger(sceneId) && sceneId >= 0 && sceneId <= 255 && point.length === 2
        && point.every(value => Number.isInteger(value) && value >= 0 && value <= 255))
      selectInterfacePreviewContext('scene', {sceneId, x: point[0], y: point[1]});
  }
  const command = params.has('previewCommand') ? Number(params.get('previewCommand')) : null;
  const argument = params.has('previewArgument') ? Number(params.get('previewArgument')) : 0;
  if (Number.isInteger(command) && command >= 0 && command <= 255
      && Number.isInteger(argument) && argument >= 0 && argument <= 255) {
    context.service = {command, argument, entryHandle: params.get('previewEntryHandle') || null};
    if (!params.has('previewScene') && !params.has('previewArgument')) context.scene = null;
  }
}

export function interfacePreviewWantedHistoryOverrides() {
  const context = interfacePreviewContext();
  const selections = context.wantedHistorySelections ||= new Map();
  if (!selections.has(context.slot)) selections.set(context.slot, {});
  return selections.get(context.slot);
}

export function ensureInterfacePreviewActor(entries) {
  const context = interfacePreviewContext();
  if (entries.length && !entries.some(entry => entry.actor === context.actor))
    selectInterfacePreviewContext('actor', entries[0].actor);
  return context;
}
