// @editor-module 战斗行动按已确认结果指令修改本次演算投影。
import {battleResultStateBranch} from './battle-result-script-runtime.js';
import {partyHealingBase, partyHealingValues} from './party-healing-values.js';

const message = value => `record:0A:${String(value).padStart(3, '0')}`;
const unknown = missing => ({handled: true, events: [], missing: [missing]});
const inventoryText = (inventory, items) => inventory.filter(Boolean)
  .map(id => items.find(row => row.id === id)?.name || '物品名称未确认').join('、') || '空';
const inventoryChange = (before, after, items) => ({before, after, label: '携带物',
  displayBefore: inventoryText(before, items), displayAfter: inventoryText(after, items)});
const shellText = (types, counts, shells) => types.flatMap((id, index) => id < 128 && counts[index]
  ? [`${shells?.find(row => row.id === id)?.name || '炮弹'} × ${counts[index]}`] : []).join('、') || '空';

/** 19:A584 左移所用携带位；执行前只持选择，不改变携带栏。 */
function consumeItem(inventory, slot) {
  if (!Array.isArray(inventory) || inventory.length !== 8 || !Number.isInteger(slot) || slot < 0 || slot >= 8)
    throw new TypeError('工具执行缺少八格携带栏与所用位置');
  inventory.splice(slot, 1); inventory.push(0);
}

function toolResult(program, actor, selection, itemId, input, rng, events, depth = 0) {
  if (depth >= 16) return ['未确认：工具结果循环分支'];
  if (!program?.operations) return program?.missing || ['未确认：工具结果脚本缺失'];
  const inventory = selection.vehicle == null ? actor.inventory : actor.vehicle?.inventory;
  let healingMessage, healingQuantity;
  for (const operation of program.operations) {
    if (operation.kind === 'consume-item') {
      const before = [...inventory]; consumeItem(inventory, selection.slot);
      events.push({event: '移除已使用工具', resources: inventoryChange(before, [...inventory], input.items)});
    } else if (operation.kind === 'item-condition') {
      actor.resultConditionStates = {...actor.resultConditionStates, 0: operation.value};
      events.push({event: '工具条件更新', condition: operation.value});
    } else if (operation.kind === 'heal-self') {
      if (actor.status === 255) {healingMessage = message(0x76); continue;}
      const base = partyHealingBase({records: input.healing,
        heal_selected_party_member_code: input.healingCode}, itemId);
      if (!Number.isInteger(base)) return ['未确认：本次工具的回复参数字段'];
      const result = partyHealingValues({hp: actor.hp, maxHp: actor.maxHp, status: actor.status,
        base, randomHigh: rng.snapshot().high});
      if (result.missing) return [result.missing];
      const before = actor.hp; actor.hp = result.hp;
      healingMessage = message(result.message);
      healingQuantity = result.quantity;
      const beforeInventory = [...inventory];
      if (itemId !== 0xD1) consumeItem(inventory, selection.slot);
      events.push({event: '使用者回复 HP', before: {hp: before}, after: {hp: actor.hp},
        settled: actor.hp - before, messageQuantity: healingQuantity,
        resources: inventoryChange(beforeInventory, [...inventory], input.items)});
    } else if (operation.kind === 'message') events.push({event: '工具使用正文', messageRecordId: operation.record});
    else if (operation.kind === 'heal-message') {
      if (!healingMessage) return ['未确认：回复结果消息现场'];
      events.push({event: '回复结果正文', messageRecordId: healingMessage, messageQuantity: healingQuantity,
        messageOutcomeId: healingMessage === message(0x4F) ? 'hp-full'
          : healingMessage === message(0x4E) ? 'hp-restored' : ''});
    } else if (operation.kind === 'jump' || operation.kind === 'actor-branch' || operation.kind === 'random-branch'
        || operation.kind === 'state-branch') {
      let handle;
      if (operation.kind === 'jump') handle = operation.handle;
      else if (operation.kind === 'actor-branch') handle = actor.riding ? operation.vehicle : operation.role;
      else if (operation.kind === 'random-branch') handle = (rng.next() & 15) >= operation.threshold ? operation.pass : operation.fail;
      else {
        const branch = battleResultStateBranch(operation, {readState: selector => actor.resultConditionStates?.[selector], random: rng});
        if (branch.missing.length) return branch.missing;
        handle = branch.handle;
      }
      return toolResult(input.resultPrograms.find(row => row.handle === handle), actor, selection, itemId, input, rng, events, depth + 1);
    } else return [`未确认：工具结果 ${operation.kind} 的目标与结算`];
  }
  return program.missing || [];
}

/** 弹药只在行动执行时递减；未确认的数值结算不阻止显示已查实的资源变化。 */
export function battleCommandEffects(actor, input, rng) {
  const selection = actor.selectedCommand;
  if (!selection || selection.kind === 'weapon') return {handled: false};
  const events = [];
  if (selection.kind === 'item') {
    const inventory = selection.vehicle == null ? actor.inventory : actor.vehicle?.inventory;
    const item = input.items?.find(row => row.id === inventory?.[selection.slot]);
    if (!item) return unknown('未确认：本次执行携带位的物品字段');
    const selector = item.battle_use_effect?.result_selector;
    if (!Number.isInteger(selector)) return unknown('未确认：本次工具的结果脚本引用字段');
    const handle = `battle-result-script:${selector.toString(16).toUpperCase().padStart(2, '0')}`;
    const missing = toolResult(input.resultPrograms.find(row => row.handle === handle), actor, selection, item.id, input, rng, events);
    return {handled: true, events, missing, itemId: item.id, itemLabel: item.name, resultScriptHandle: handle};
  }
  if (['defend', 'protect'].includes(selection.kind)) return {handled: true, missing: [],
    events: [{event: selection.kind === 'defend' ? '防卫' : '保护同伴', messageRecordId: message(selection.command)}]};
  if (selection.kind === 'escape') return unknown('未确认：逃跑的本次战斗编号、禁逃名单与随机等待现场');
  const vehicle = actor.vehicle;
  if (!vehicle) return unknown('未确认：本次战车字段投影');
  if (selection.kind === 'vehicle-weapon') {
    const before = vehicle.equipmentState[selection.part], ammo = before & 63;
    if (!Number.isInteger(before)) return unknown('未确认：所选战车武器的状态字段');
    const after = ammo ? before - 1 : before;
    vehicle.equipmentState[selection.part] = after;
    return {handled: true, events: [{event: '战车武器弹药结算', resources: {before, after,
      label: '弹数', displayBefore: String(ammo), displayAfter: String(after & 63)}}],
      missing: ['未确认：战车武器数值与部件受击结算']};
  }
  if (selection.kind === 'shell') {
    const before = {types: [...vehicle.shellTypes], counts: [...vehicle.shellCounts]};
    if (!vehicle.shellCounts[selection.slot]) return unknown('未确认：特殊炮弹执行位已空');
    vehicle.shellCounts[selection.slot]--;
    if (!vehicle.shellCounts[selection.slot]) {
      vehicle.shellCounts.splice(selection.slot, 1); vehicle.shellCounts.push(0);
      vehicle.shellTypes.splice(selection.slot, 1); vehicle.shellTypes.push(255);
    }
    return {handled: true, events: [{event: '特殊炮弹数量结算', resources: {before,
      after: {types: [...vehicle.shellTypes], counts: [...vehicle.shellCounts]}, label: '炮弹',
      displayBefore: shellText(before.types, before.counts, input.shells),
      displayAfter: shellText(vehicle.shellTypes, vehicle.shellCounts, input.shells)}}],
      missing: ['未确认：特殊炮弹结果脚本与数值结算']};
  }
  throw new TypeError('未声明的战斗行动');
}
