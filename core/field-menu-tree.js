// @editor-module 非战斗菜单入口按 ROM 命令选择组组织。
import {dedicatedUiPageForScreen} from './ui-page-registry.js';
import {state} from './state.js';
import {db} from './project-db.js';
import {uiCommandDispatchTarget} from './ui-command-dispatch-owner.js';

export const FIELD_MAIN_MENU_LABELS = Object.freeze([
  "对话", "乘降", "强度", "工具", "装备", "炮弹", "调查", "模式",
]);

const MAIN_DESTINATIONS = Object.freeze([
  "field-dialogue", "field-board-exit", "party-strength", "human-items",
  "human-equipment", "vehicle-equipment-shells", "field-investigation", "field-mode",
]);

export const FIELD_MENU_PARENTS = Object.freeze(Object.fromEntries([
  ...MAIN_DESTINATIONS.map(id => [id, "non-battle-main-menu"]),
]));

const screenIdForState = stateId => `ui-screen:interface:${stateId.split('.')[0]}:state:${stateId}`;

// 画面边界与读取链见 project/evidence/reverse-engineering/field-menu-flow-steps/observations.json。
const FIELD_MENU_FLOW_SCREENS = Object.freeze([
  ['field-board-exit', '乘降', true, [['field-command-menu.branch', '乘降选择']]],
  ['party-strength', '强度', true, [
    ['character-status.actor-select', '强度命令'], ['character-status.detail-select', '查看对象'],
    ['vehicle-status.vehicle-select', '查看战车'], ['vehicle-status.armor-vehicle-select', '拆装甲：战车'],
    ['vehicle-status.armor-amount', '拆装甲：数量'], ['vehicle-status.armor-confirm', '拆装甲：确认'],
    ['vehicle-status.armor-confirm', '拆装甲：是', 'vehicle-status.armor-result:0'],
    ['vehicle-status.armor-confirm', '拆装甲：否', 'vehicle-status.armor-result:1'],
    ['vehicle-status.no-vehicle-message', '没有战车'],
  ]],
  ['party-strength', '强度 › 人物详情', false, [['character-status.detail', '人物详情']]],
  ['party-strength', '强度 › 战车部件', false, [
    ['vehicle-status.part-detail', '查看强度', 'vehicle-status.part-detail'],
    ['vehicle-status.part-detail', '战车状况', 'vehicle-status.overview-part-detail'],
  ]],
  ['party-strength', '强度 › 战车状况', false, [
    ['vehicle-status.overview', '战车状况'], ['vehicle-status.overview-vehicle-select', '查看对象'],
    ...[['attack', '攻击'], ['main-guns', '主炮'], ['chassis', '底盘'], ['weight', '重量'],
      ['defense', '防御'], ['sub-guns', '副炮'], ['engines', '发动机'], ['armor', '装甲'],
      ['damage', '损坏'], ['special-guns', 'S-E'], ['cunits', 'C装置'], ['box', '后备箱']]
      .map(([suffix, label]) => [`vehicle-status.overview-${suffix}`, label]),
  ]],
  ...[['equipment', '装备'], ['tools', '工具'], ['shells', '炮弹']].map(([suffix, label]) =>
    ['party-strength', `强度 › 战车状况 › ${label}`, false,
      [[`vehicle-status.overview-${suffix}`, label]]]),
  ['human-items', '工具', true, [
    ['human-items.actor-select', '选择人物'], ['human-items.inventory', '道具列表'],
    ['human-items.action-select', '动作选择'], ['human-items.field-use-target', '使用：人物目标'],
    ['human-items.vehicle-transfer-target', '使用：战车目标', 'human-items.vehicle-use-target'],
    ['human-items.vehicle-part-target', '使用：部件'], ['human-items.transfer-target', '交给：人物接收者'],
    ['human-items.vehicle-transfer-target', '交给：战车接收者', 'human-items.vehicle-transfer-target'],
    ['human-items.drop-confirm', '丢弃：确认'], ['human-items.result-message', '使用结果'],
  ]],
  ['field-item-fax', '传真传送', true, [
    ['human-items.fax-return-confirm', '返回：确认'],
    ['human-items.fax-destination-select', '传真：对话', 'human-items.fax-dialogue'],
    ['human-items.fax-destination-select', '传真：目的地'],
  ]],
  ['human-equipment', '装备', true, [
    ['human-equipment.list', '装备列表'], ['human-equipment.actor-select', '选择人物'],
    ['human-equipment.action-select', '人物动作'], ['human-equipment.equip-items', '装备：选择物品'],
    ['human-equipment.result', '装备结果'],
    ['human-equipment.transfer-items', '交给：选择物品', 'human-equipment.transfer-items'],
    ['human-equipment.transfer-target', '交给：接收者'],
    ['human-equipment.transfer-items', '丢弃：选择物品', 'human-equipment.drop-items'],
    ['human-equipment.drop-confirm', '丢弃：确认'],
  ]],
  ['vehicle-equipment-shells', '装备 › 战车装备', false, [
    ['vehicle-equipment-shells.parts', '选择战车'], ['vehicle-equipment-shells.detail', '部件列表'],
    ['vehicle-equipment-shells.action-select', '战车动作'],
    ['vehicle-equipment-shells.equip-items', '装备：选择物品'],
    ['vehicle-equipment-shells.weapon-mount-select', '装备：安装位置'],
    ['vehicle-equipment-shells.transfer-items', '交给：选择物品', 'vehicle-equipment-shells.transfer-items'],
    ['vehicle-equipment-shells.transfer-target', '交给：接收者'],
    ['vehicle-equipment-shells.transfer-items', '丢弃：选择物品', 'vehicle-equipment-shells.drop-items'],
    ['vehicle-equipment-shells.drop-confirm', '丢弃：确认'],
  ]],
  ['vehicle-equipment-shells', '炮弹', true, [['vehicle-equipment-shells.shells', '选择战车']]],
  ['field-mode', '模式', true, [
    ['field-command-menu.mode-settings', '模式设置'], ['field-command-menu.adventure-data', '冒险数据'],
    ['field-command-menu.battle-data', '战斗数据'], ['field-command-menu.gold-amount', '金钟金额'],
  ]],
  ['field-mode', '模式 › 经验值数据', false, [['field-command-menu.experience-data', '经验值数据']]],
].map(([pageId, label, root, steps]) => Object.freeze({pageId, label, root,
  id: `${pageId}:${steps[0][0]}`, steps: Object.freeze(steps.map(([stateId, stepLabel, entryId = null]) =>
    Object.freeze({pageId, stateId, label: stepLabel, entryId, screenId: screenIdForState(stateId)})))})));

export const FIELD_MENU_NAVIGATION = Object.freeze(FIELD_MENU_FLOW_SCREENS.filter(flow => !flow.root)
  .map(flow => Object.freeze({...flow.steps[0], label: flow.label, flowId: flow.id})));

export function fieldMenuFlowScreen(pageId, stateId, entryId = null) {
  return FIELD_MENU_FLOW_SCREENS.find(flow => flow.pageId === pageId && flow.steps.some(step =>
    step.stateId === stateId && (!entryId || step.entryId === entryId || !step.entryId))) || null;
}

export function fieldMenuFlowSteps(flow, screens) {
  return flow?.steps.flatMap(step => {
    const screen = screens.find(screen => screen.interface_state_id === step.stateId);
    return screen ? [{...step, screenId: screen.id}] : [];
  }) || [];
}

export function fieldMenuFlowBranches(flow, steps) {
  const branchLabel = step => {
    const suffix = step.stateId.split('.').at(-1);
    if (flow.pageId === 'field-board-exit') return '乘降';
    if (['human-equipment', 'vehicle-equipment-shells'].includes(flow.pageId)) {
      if (step.entryId?.endsWith('.drop-items') || suffix === 'drop-confirm') return '丢弃';
      if (suffix.startsWith('transfer-')) return '交给';
      if (['equip-items', 'weapon-mount-select', 'result'].includes(suffix)) return '装备';
      return flow.label === '炮弹' ? '炮弹' : flow.root ? '选择装备' : '选择战车装备';
    }
    if (flow.pageId === 'human-items') {
      if (suffix === 'drop-confirm') return '丢弃';
      if (suffix === 'transfer-target' || step.entryId === 'human-items.vehicle-transfer-target') return '交给';
      if (['field-use-target', 'vehicle-transfer-target', 'vehicle-part-target', 'result-message'].includes(suffix)) return '使用';
      return '选择工具';
    }
    if (flow.pageId === 'party-strength' && flow.root) {
      if (suffix.startsWith('armor-')) return '拆装甲';
      if (suffix === 'detail-select') return '查看人物';
      if (['vehicle-select', 'no-vehicle-message'].includes(suffix)) return '查看战车';
      return '强度命令';
    }
    if (flow.pageId === 'field-item-fax') return step.label.split('：')[0];
    return flow.root ? step.label : flow.label;
  };
  const branches = new Map();
  for (const step of steps) {
    const label = branchLabel(step);
    if (!branches.has(label)) branches.set(label, {id: `${flow.id}:branch:${branches.size}`, label, steps: []});
    branches.get(label).steps.push(step);
  }
  return [...branches.values()];
}

export function fieldMenuNavigationEntry(pageId, screenId, entryId = null) {
  const stateId = screenId?.split(':state:')[1];
  const flow = fieldMenuFlowScreen(pageId, stateId, entryId);
  return flow ? {...flow.steps[0], label: flow.label, flowId: flow.id} : null;
}

export function fieldMenuEntries(pageId, construction, screens = [], {selectedScreen = null,
  allScreens = screens, choiceLabel = choice => choice.visible_text} = {}) {
  const dispatch = construction?.menu_dispatch_data;
  const preview = dispatch?.previews?.find(preview => preview.interface_state_id === selectedScreen?.interface_state_id
    && preview.interface_entry_id === state.interfacePageEntry)
    || dispatch?.previews?.find(preview => preview.interface_state_id === selectedScreen?.interface_state_id);
  const entryId = preview?.interface_entry_id;
  const activeGroups = (dispatch?.choice_groups || []).filter(group =>
    group.selection_kind && group.interface_state_ids?.includes(selectedScreen?.interface_state_id)
    && (!group.interface_entry_id || group.interface_entry_id === entryId));
  if (activeGroups.length) {
    return activeGroups.flatMap(group => {
      return group.choices.flatMap(choice => {
        const target = allScreens.find(screen => screen.state_ui_role === 'screen'
          && screen.interface_state_id === choice.target_state_id);
        const destination = target && dedicatedUiPageForScreen(target);
        if (group.selection_kind === 'dynamic-list' && !target
            && group.choice_source?.kind !== 'equipment-attribute-selector') return [];
        return [{id: `${group.id}:${choice.index}`, groupId: group.id,
          command: Number(choice.command), index: choice.index,
          sourceStateId: selectedScreen.interface_state_id, targetStateId: choice.target_state_id || null,
          label: choiceLabel(choice) || target?.interface_state || target?.label || `选项 ${choice.index + 1}`,
          pageId: destination?.interfacePage || pageId,
          screenId: target?.id || selectedScreen.id,
          entryId: choice.target_entry_id || null,
          recordId: group.record,
          action: !target,
          basis: (group.rom_chain || []).map(source => `${source.bank.toString(16).toUpperCase()}:${source.cpu}`).join(' → ')}];
      });
    });
  }
  const groupId = {"non-battle-main-menu": "commands:20-27",
    "party-strength": "commands:31-33", "field-mode": "commands:41-44"}[pageId];
  const group = dispatch?.choice_groups?.find(item => item.id === groupId);
  const screenFor = previewId => screens.find(screen => screen.state_ui_role === "screen"
    && (screen.source_preview_id === previewId
    || screen.reconstructed_preview_ids?.includes(previewId)
    || screen.visual_preview?.source_preview_ids?.includes(previewId)));
  if (group) return group.choices.map(choice => {
    const command = Number(choice.command);
    const dispatchDocument = pageId === 'field-mode' ? db.peekResourceDocument('code-module') : null;
    const targetCommand = dispatchDocument?.records?.some(row => row.id === 'code-module.ui-mode-command-handlers')
      ? uiCommandDispatchTarget(dispatchDocument, command) : command;
    const targetIndex = pageId === 'field-mode' ? targetCommand - 0x41 : choice.index;
    const main = pageId === "non-battle-main-menu";
    const previewId = pageId === "party-strength"
      ? ["command:22/31/49", "command:22/32/no-vehicle", "command:22/33"][choice.index]
      : `command:${targetCommand.toString(16).toUpperCase()}`;
    const stateId = pageId === "field-mode"
      ? ["field-command-menu.adventure-data", "field-command-menu.information-setting",
        "field-command-menu.animation-setting", "field-command-menu.audio-setting"][targetIndex]
      : pageId === "party-strength"
        ? ["character-status.detail-select", "vehicle-status.armor-vehicle-select",
          "vehicle-status.overview"][choice.index] : null;
    const screen = (stateId && screens.find(item => item.interface_state_id === stateId))
      || screenFor(previewId);
    const handler = dispatch.entries.find(item => Number(item.command) === targetCommand);
    return {id: `${pageId}:${choice.command}`, command, index: choice.index,
      label: main ? FIELD_MAIN_MENU_LABELS[choice.index] : choice.visible_text,
      ...(pageId === 'field-mode' ? {targetLabel: ['冒险数据', '情报设置', '动画设置', '音响设置'][targetIndex]} : {}),
      pageId: main ? MAIN_DESTINATIONS[choice.index] : pageId,
      screenId: main ? null : (screen || screenFor("command:27"))?.id,
      action: pageId === "field-mode" && targetIndex > 0,
      recordId: group.record,
      basis: `${dispatch.dispatcher.table_prg_offset_hex} → ${handler?.handler_bank_hex}:${handler?.handler_cpu_hex}`};
  });
  if (pageId === "field-investigation") return [{id: "field-investigation:scene",
    label: "场景调查对象", href: "?view=scenes&sceneTab=investigation",
    basis: "UiMainCommand26Handler → InvestigateNearbyObjectWithBankGuard"}];
  return [];
}

export function fieldMenuParentEntries(construction, selectedScreen, screens = []) {
  if (!selectedScreen) return [];
  const dispatch = construction?.menu_dispatch_data;
  const entryId = state.interfacePageEntry || dispatch?.previews?.find(preview =>
    preview.interface_state_id === selectedScreen.interface_state_id)?.interface_entry_id;
  const seen = new Set();
  return (dispatch?.choice_groups || []).filter(group => group.choices.some(choice =>
    choice.target_state_id === selectedScreen.interface_state_id
    && (!choice.target_entry_id || choice.target_entry_id === entryId))).flatMap(group =>
    screens.filter(screen => group.interface_state_ids?.includes(screen.interface_state_id)
      && screen.state_ui_role === 'screen').flatMap(screen => {
      const destination = dedicatedUiPageForScreen(screen);
      const id = `${screen.id}:${group.interface_entry_id || ''}`;
      if (!destination?.interfacePage || seen.has(id)) return [];
      seen.add(id);
      return [{id, pageId: destination.interfacePage, screenId: screen.id,
        entryId: group.interface_entry_id || null,
        label: fieldMenuNavigationEntry(destination.interfacePage, screen.id, group.interface_entry_id)?.label
          || screen.interface_state || screen.label}];
    }));
}

export function fieldMenuHref(entry) {
  if (entry.href) return entry.href;
  const params = new URLSearchParams({view: "interfaceui", interface: entry.pageId});
  if (entry.screenId) params.set("interfaceScreen", entry.screenId);
  if (entry.entryId) params.set('interfaceEntry', entry.entryId);
  return `?${params}`;
}
