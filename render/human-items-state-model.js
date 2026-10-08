// @editor-module 人类道具节点引用现有构造，准备动作折入使用边。
export const HUMAN_ITEMS_EVIDENCE = 'project/evidence/reverse-engineering/human-items-state-machine/observations.json';
export const HUMAN_ITEM_STATES = Object.freeze({actors: 'human-items.actor-select', inventory: 'human-items.inventory',
  actions: 'human-items.action-select', target: 'human-items.field-use-target', transfer: 'human-items.transfer-target',
  vehicleTransfer: 'human-items.vehicle-transfer-target', vehicleUse: 'human-items.vehicle-use-target',
  parts: 'human-items.vehicle-part-target', drop: 'human-items.drop-confirm', result: 'human-items.result-message',
  fax: 'human-items.fax-destination-select', faxReturn: 'human-items.fax-return-confirm', map: 'human-items.world-map'});

export const humanItemSceneType = scene => scene.id === 0 ? 0 : Number(Boolean(scene.header[0] & 8));

export function addHumanItemsStateGraph(graph, dispatch, catalog) {
  const definition = catalog.interfaces.find(row => row.id === 'human-items');
  const nodes = new Map(graph.nodes.map(row => [row.id, row]));
  for (const preview of dispatch.previews.filter(row => row.interface_state_id?.startsWith('human-items.'))) {
    const id = preview.interface_entry_id || preview.interface_state_id;
    const state = definition.states.find(row => row.id === preview.interface_state_id);
    nodes.set(id, {id, stateId: state.id, entryId: preview.interface_entry_id || null, preview,
      pageId: id === HUMAN_ITEM_STATES.map ? 'satellite-map' : id.includes('fax') ? 'field-item-fax' : 'human-items',
      label: state.entry_routes?.find(row => row.id === id)?.label || state.label,
      input: 'A 确认 / B 返回', regions: []});
  }
  const transitions = graph.transitions.filter(row => !row.from.startsWith('human-items.'));
  const add = (from, to, input, kind, unknown = false) => transitions.push({id: `human-item-transition:${transitions.length}`,
    from, to, input, operation: {kind}, unknown, evidence: HUMAN_ITEMS_EVIDENCE, controls: [], declarations: []});
  const S = HUMAN_ITEM_STATES, main = 'field-command-menu.main';
  add(S.actors, S.inventory, 'A · 对象', 'inventory');
  add(S.actors, null, 'B · 返回行走', 'return');
  add(S.inventory, S.actions, 'A · 道具', 'actions');
  add(S.inventory, S.actors, 'B · 对象选择', 'return-actors');
  add(S.actions, S.inventory, 'B · 道具列表', 'return-inventory');
  for (const [target, label] of [[S.target, '人物目标'], [S.vehicleUse, '战车目标'], [S.result, '效果反馈'],
    [S.fax, '传真目的地'], [S.faxReturn, '洞穴返回'], [S.map, '世界地图']])
    add(S.actions, target, `A · 使用 / ${label}`, 'use');
  add(S.actions, S.transfer, 'A · 转交 / 人物', 'transfer');
  add(S.actions, S.vehicleTransfer, 'A · 转交 / 战车', 'transfer');
  add(S.actions, S.drop, 'A · 丢弃', 'drop');
  for (const id of [S.target, S.vehicleUse, S.parts, S.transfer, S.vehicleTransfer]) {
    add(id, S.actions, 'B · 取消', 'cancel');
    add(id, S.result, 'A · 当前目标', 'effect');
    if ([S.vehicleUse, S.parts].includes(id)) transitions.at(-1).evidence = 'project/evidence/reverse-engineering/field-menu-followups/observations.json';
  }
  add(S.vehicleUse, S.parts, 'A · 修理箱', 'parts');
  add(S.drop, S.result, 'A / B · 是或否', 'drop-result');
  add(S.result, main, 'A / B · 正文结束', 'result-return');
  add(S.fax, null, 'A · 已开放目的地 / 场景移动', 'fax-scene');
  add(S.fax, null, 'B · 返回行走', 'fax-cancel');
  add(S.faxReturn, null, 'B / A·否 · 返回行走', 'fax-cancel');
  add(S.faxReturn, null, 'A·是 · 保存的入口 / 场景移动', 'fax-entrance');
  add(S.map, null, '任意新按键 · 返回行走', 'map-return');
  for (const id of Object.values(S).filter(id => ![S.result, S.map].includes(id)))
    add(id, id, '方向 · 当前候选', 'selection');
  return {...graph, nodes: [...nodes.values()], transitions,
    edges: transitions.map(row => ({...row, routes: [row], condition: row.unknown ? '此调用效果未确认' : row.operation.condition || ''}))};
}
