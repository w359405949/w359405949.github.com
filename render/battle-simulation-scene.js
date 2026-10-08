// @editor-module 演算步骤复用战斗编队、角色与消息窗口。
import {normalizeBattleScenePreview} from "../core/battle-scene-preview.js";

/** 当前演算状态决定参战图形、消息参数与退场阶段。 */
export function battleSimulationScene(project, preview, steps, index, catalog, templates) {
  const step = steps[index];
  const lastAttack = steps.slice(0, index + 1).findLast(row => row.attack)?.attack;
  const toolSource = catalog.itemAttackChannel.sources.find(row => row.source.item.id === step.itemId);
  const currentAttack = toolSource ? {side: 'party', channel: 'item', source: toolSource.key,
    attacker: step.actors.find(actor => actor.id === step.actor).slot} : lastAttack;
  const party = preview.party.map((member, slot) => {
    const actor = step.actors.find(row => row.side === "party" && row.slot === slot);
    return {...member, visible: member.visible && step.kind !== "entry", dead: actor ? actor.hp === 0 : member.dead,
      riding: actor?.riding ?? member.riding,
      attacks: {...member.attacks, ...(currentAttack?.side === "party" && currentAttack.attacker === slot
        ? {[currentAttack.channel]: currentAttack.source} : {})}};
  });
  const enemyEvents = step.enemyEvents;
  const departing = step.kind === "death" && step.actor?.startsWith("enemy:");
  const scene = normalizeBattleScenePreview({...preview, party,
    enemyEvents: departing ? enemyEvents.slice(0, -1) : enemyEvents,
    attack: {...preview.attack, ...currentAttack}}, project, catalog);
  const wolf = step.actors.find(actor => actor.side === "party");
  const target = step.actors.find(actor => actor.id === (departing ? step.actor : step.targets?.[0]));
  const attackIndex = steps.slice(0, index + 1).findLastIndex(row => row.kind === 'attack');
  const damage = departing ? steps.slice(0, index).findLast(row => row.kind === "damage" && row.targets?.includes(step.actor))
    : step.kind === 'condition' ? steps.slice(Math.max(0, attackIndex), index).findLast(row => row.kind === 'damage'
      && row.actor === step.actor && row.targets?.some(id => step.targets.includes(id))) : step;
  const messageActor = step.kind === "enemy-entry" ? steps[index - 1].actors.find(actor => actor.side === "enemy") : null;
  const damageActor = damage && damage.actors.find(actor => actor.id === damage.actor);
  const runtime = {waitForInput: step.kind === "entry",
    monsterId: (messageActor || step.actors.find(actor => actor.side === "enemy"))?.handle
    ? Number.parseInt((messageActor || step.actors.find(actor => actor.side === "enemy")).handle.split(":")[1], 16) : undefined,
    enemyGroupCount: preview.enemyGroups.filter(group => group.count > 0).length,
    placeholders: {
      "ui-text-provider-workspace.current-string": {text: step.partDamage?.label || messageActor?.label || (step.kind === "damage" && target?.side === "party" ? target.messageName || target.label : step.actorLabel || wolf.messageName || wolf.label), label: "演算参战者"},
      "ui-text-provider-zero-page-overlays.current-record": {text: step.partDamage?.label || step.itemLabel || messageActor?.label || (step.kind === "attack" ? step.actorLabel : target?.label || ""), label: step.itemLabel ? '演算工具' : step.kind === "attack" ? "演算行动方" : "演算目标"},
      "ui-text-provider-zero-page-overlays.battle-quantity": {text: String(step.messageQuantity ?? step.settled ?? 0), label: "占位规则演算量"},
    }};
  let messageSequence = damage?.promptRecordId ? [
    {state: "battle-messages.action", slot: "slot:message:0", retain_previous: false,
      text_record_ref: {resource_id: "text-record", node_id: damage.promptRecordId}},
    {state: "battle-messages.damage", slot: "slot:message:0", retain_previous: true,
      text_record_ref: {resource_id: "text-record", node_id: damage.messageRecordId}},
  ] : null;
  const attackStep = steps[attackIndex];
  const declared = templates?.battle_message_sequences?.find(sequence =>
    sequence.enemy_action_reference === attackStep?.actionHandle
    && sequence.result_script === attackStep?.resultScriptHandle);
  const records = steps.slice(attackIndex, index + 1).filter(row => row.messageRecordId)
    .map(row => row.messageRecordId);
  const paths = declared ? [declared.phases,
    ...(declared.outcomes || []).map(outcome => [...declared.phases, ...outcome.phases])] : [];
  // 本次行动只消费记录顺序完全吻合的已发布阶段及其前文保留关系。
  const matched = paths.filter(phases => records.length <= phases.length
    && records.every((record, i) => phases[i].text_record_ref.node_id === record));
  const prefixes = matched.map(phases => phases.slice(0, records.length));
  if (step.messageRecordId && prefixes.length
      && prefixes.every(phases => JSON.stringify(phases) === JSON.stringify(prefixes[0])))
    messageSequence = structuredClone(prefixes[0]);
  if (damage?.promptRecordId) runtime.placeholdersByRecord = {
    [damage.promptRecordId]: {
      "ui-text-provider-workspace.current-string": {text: damageActor.messageName || damage.actorLabel, label: "演算行动方"},
      "ui-text-provider-zero-page-overlays.current-record": {text: damageActor.messageName || damage.actorLabel, label: "演算行动方"},
    },
    [damage.messageRecordId]: {
      "ui-text-provider-workspace.current-string": {text: target.label, label: "演算受击方"},
      "ui-text-provider-zero-page-overlays.battle-quantity": {text: String(damage.settled), label: "演算损伤量"},
    },
  };
  if (step.kind === 'condition' && target) runtime.placeholdersByRecord = {
    ...runtime.placeholdersByRecord,
    [step.messageRecordId]: {
      'ui-text-provider-workspace.current-string': {text: target.messageName || target.label, label: '演算受击方'},
    },
  };
  if (departing && messageSequence) messageSequence.push({
    state: "battle-messages.grenade-defeat", slot: "slot:message:0", retain_previous: true,
    text_record_ref: {resource_id: "text-record", node_id: step.messageRecordId},
  });
  const previousEnemyScene = step.kind === "enemy-entry"
    ? battleSimulationScene(project, preview, steps, index - 1, catalog, templates).scene : null;
  return {scene, runtime, messageSequence, messageOutcomeId: step.messageOutcomeId || '', target, departing, previousEnemyScene,
    enemyPaletteMonsterId: step.kind === "withdrawal" ? step.replacementMonsterId
      : step.kind === "enemy-entry" ? step.actors.find(actor => actor.side === "enemy").monsterId : null};
}
