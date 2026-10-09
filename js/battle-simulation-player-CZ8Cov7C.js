import { editorLog } from './project-store-values-klefznSR.js';
import { esc } from './monster-figure-C07vG7yu.js';
import { normalizeBattleScenePreview, battleScenePreviewCatalog, battlePartyVisualPosition, battleScenePreviewForFormation, paintBattleSceneComposerCanvas, paintBattleSceneComposerFrame, prepareBattleSceneComposerPlayback, restoreBattleSceneComposerPlayback, prepareBattleSceneComposerSources, resolveBattleSceneAttack, battleScenePartyVehicle } from './battle-actors-XIvkcBal.js';
import { db, roleEquipmentStats, prepareSaveCurrentFieldObjects, SERVICE_PARTS, globalRandom, battleInstanceSuffixSource, SERVICE_ROLES, interfacePreviewState, fieldSubmenuCodeValues, fieldSubmenuCodeValue, InterfacePreviewSession } from './scene-actors-Cftr7mCE.js';
import { battleResultProgram, battleResultStateBranch, battleDefenseCollision } from './text-record-structure-editor-COmgY10x.js';
import { state, nesFrameDurationMs } from './emulator-Bl-sLXnd.js';
import { battleMessageCalls, itemEquipmentValues, battleResultDropValues, partyHealingBase, partyHealingValues, battleResultRewardTotals, prepareUiBattleCommandWindow, prepareUiBattleStatusSlot, battleMessageStateSources, battleMessageCallContract, BATTLE_MESSAGE_CALL_EVIDENCE, paintUiConstructionSemanticPreview } from './charset-BJ0aS3Xk.js';
import { uiTemplateBindings, bindScreenWorkbenchZoom, screenWorkbenchCanvasStage, screenWorkbench } from './preview-sound-DHDXA99x.js';
import { battleResultExecution } from './story-component-labels-C9k8orBA.js';

// @editor-module 演算步骤复用战斗编队、角色与消息窗口。

/** 当前演算状态决定参战图形、消息参数与退场阶段。 */
function battleSimulationScene(project, preview, steps, index, catalog, templates) {
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

// @editor-module 字段对象当前值构成战斗演算的参战投影。

/** 战斗输入复用 DB 已读 Origin，存档编解码与 Working 仍走共用入口。 */
function prepareBattleSimulationSave() {
  return prepareSaveCurrentFieldObjects(state, {originalRepository: {
    getOriginal: db.readPreviewOriginal,
  }});
}

/** PRG $020F42–$020F76：bit7 分流护罩；内部 HP 独立装载。 */
function monsterBattleInitialState(record) {
  const shielded = Boolean(record.flags & 0x80);
  const rawHp = record.hp.raw;
  const hp = shielded ? 0 : rawHp * ((record.flags & 0xC0) === 0 ? 4 : 1);
  const shield = shielded ? rawHp : 0;
  return {hp, maxHp: hp, shield, maxShield: shield,
    hitClass: record.packed_b & 3,
    repeatCode: record.packed_b >>> 6, targetingFlags: record.packed_b,
    attackSkill: record.attack_code & 127, defenseSkill: record.defense_code & 127};
}

/** 演算正文可与存档并行读取，字段投影等待存档就绪。 */
async function battleSimulationInput(project, preview, repository = db, save = null, encounter = {}) {
  const [monsters, patterns, actions, selectionAsset, scripts, scaling, randomAmounts, characters,
    items, healing, cycleThresholds, equipmentEffects, statusOverrides, growth] = await Promise.all([
    repository.getAll("monster", []), repository.getDocument("enemy-action-pattern", null),
    repository.getDocument("enemy-action", null),
    repository.getPackageDocument("game/services/modules/enemy-action-selection-service.json", null),
    repository.getResourceDocument("battle-result-script", null),
    repository.getResourceDocument("battle-amount-scaling-service", null),
    repository.getResourceDocument("battle-random-amount-service", null),
    repository.getDocument("character-initial-record", null),
    repository.getDocument('item', null), repository.getResourceDocument('party-healing-service', null),
    Promise.all([17, 18, 19].map(index => repository.getField('enemy-action-selection-service',
      'enemy-action-selection-service.threshold-pool', `threshold_${index}`))).then(fields => fields.map(field => field.value)),
    repository.getResourceDocument('role-equipment-derived', null),
    Promise.all(Array.from({length: 6}, (_, index) => repository.getField('enemy-action-selection-service',
      'enemy-action-selection-service.status-override-actions', `override_action_0${index}`)))
      .then(fields => fields.map((field, id) => ({id, action_id: field.value}))),
    repository.getResourceDocument('character-growth', null),
  ]);
  save = await save;
  const messageCalls = await battleMessageCalls(source => repository.getField(
    source.resource_id, source.entity_handle, source.field));
  // 概率配置只读，状态覆盖行动读取字段对象当前值。
  const selection = selectionAsset?.document;
  const catalog = battleScenePreviewCatalog(project);
  const monsterActors = monsters.map(record => ({
    handle: `monster:${record.id.toString(16).toUpperCase().padStart(2, "0")}`,
    monsterId: record.id, side: "enemy", label: record.name,
    ...monsterBattleInitialState(record),
    attack: record.attack.value, defense: record.defense.value,
    speed: record.speed, flags: record.flags, status: 0, aiCycle: 255,
    experience: record.experience?.value, gold: record.gold?.value,
    visualSources: (catalog.monsterAttacks.get(record.id) || []).map(source => ({
      key: source.key, slots: source.selectionSlots,
    })),
    missing: [2, 7, 13, 16, 17, 20, 45, 47, 54, 110, 121].includes(record.id)
      ? ["占位：特殊怪物防御加值尚未接入"] : [],
  }));
  let enemies = preview.enemies.flatMap((slot, index) => {
    if (!slot) return [];
    const record = monsters.find(row => row.id === slot.monsterId);
    if (!record) throw new TypeError(`缺少怪物当前值 ${slot.monsterId}`);
    return [{...monsterActors.find(actor => actor.monsterId === record.id),
      id: `enemy:${index}`, slot: index, groupIndex: slot.groupIndex}];
  });
  const selectedSlot = encounter.saveSlot ?? (save?.fields.find("save.directory.selected_slot")?.value === 2 ? 2 : 1);
  const current = suffix => {
    const id = `save.slot.${selectedSlot}.${suffix}`;
    return encounter.fields && Object.hasOwn(encounter.fields, id) ? encounter.fields[id] : save?.fields.find(id)?.value;
  };
  const vehicles = new Map();
  const vehicleFor = id => {
    if (!vehicles.has(id)) vehicles.set(id, {id,
      inventory: Array.from({length: 8}, (_, slot) => current(`vehicle.${id}.item.${slot}`)),
      equipmentState: SERVICE_PARTS.map(part => current(`vehicle.${id}.equipment_state.${part}`)),
      shellTypes: Array.from({length: 6}, (_, slot) => current(`vehicle.${id}.shell_type.${slot}`)),
      shellCounts: Array.from({length: 6}, (_, slot) => current(`vehicle.${id}.shell_count.${slot}`))});
    return vehicles.get(id);
  };
  if (encounter.actorState) enemies = encounter.actorState.filter(actor => actor.side === 'enemy').map(actor => {
    const published = monsterActors.find(row => row.monsterId === actor.monsterId);
    if (!published) throw new TypeError('上轮战斗缺少怪物当前字段');
    return {...published, ...Object.fromEntries(['id', 'slot', 'groupIndex', 'hp', 'maxHp', 'shield', 'maxShield', 'status', 'incarnation',
      'aiCycle', 'conditionTurns', 'resultConditionStates']
      .map(name => [name, actor[name]]))};
  });
  const savedRoles = (save?.initialRoles || characters?.rom_initial?.roles || []).map(role => {
    const sources = {};
    const read = field => {
      const fieldId = `save.slot.${selectedSlot}.role.${role.slug}.${field}`;
      const object = save?.fields.find(fieldId);
      const value = encounter.fields && Object.hasOwn(encounter.fields, fieldId) ? encounter.fields[fieldId] : object?.value;
      sources[field] = value != null ? `${save.source} · ${fieldId}` : `ROM 新开局值 · ${role.slug}.${field}（存档缺值）`;
      return value ?? role[field];
    };
    const name = save?.fields.find(`save.slot.${selectedSlot}.role.${role.slug}.name_codes`);
    return {roleId: role.id, slug: role.slug, label: name?.nameText || role.name,
      hp: read("current_hp"), maxHp: read("max_hp"), speed: read("speed"),
      attack: read("attack"), defense: read("defense"),
      equipment: Array.from(read("equipment") || [], item => typeof item === 'number' ? item : item.item_id),
      slotFlags: read("slot_flags"), currentVehicle: read("current_vehicle") ?? 255,
      inventory: Array.from(read('inventory') || []),
      strength: read('strength'), vitality: read('vitality'),
      attackSkill: read("battle_skill"), defenseSkill: read("battle_skill"),
      drivingSkill: read('driving_skill'),
      status: read("status"), present: read("present"), sources};
  });
  const companionActor = index => {
    const inherited = savedRoles[encounter.manualCompanions ? 0 : index];
    const weapon = encounter.manualCompanions && catalog.attackSourceByKey.get(preview.party[index]?.attacks?.melee)
      || catalog.humanWeaponSources.find(source => source.source.id === 0x3C);
    return {
    id: `party:${index}`, side: "party", slot: index, label: "狼", hp: 3779, maxHp: 3779,
    roleId: index, playerControlled: false,
    // PRG $021A74–$021A8A：红狼运行时名称以一个 FF 空白图块开头。
    messageName: " 狼",
    shield: 0, maxShield: 0, attack: 590, defense: 750,
    speed: inherited?.speed, status: 0,
    attackSkill: inherited?.attackSkill,
    defenseSkill: inherited?.defenseSkill,
    inputSources: inherited?.sources,
    ...(encounter.manualCompanions ? {
      // PRG $021A17–$021A73 不改 $64AE 携带栏；工具执行从 $02E8D6 读取该栏。
      inventory: structuredClone(inherited?.inventory || []),
      equipment: [weapon?.source.id ?? 0x3C, 0, 0, 0, 0, 0, 0, 0], slotFlags: 0x80,
      targetScope: weapon?.targetScope,
    } : {}),
    command: 0x0C, weaponId: weapon?.source.id ?? 0x3C,
    // PRG $02E7F5 直接进入 $02E9B3 的立即数 95，不经过武器结果引用表。
    resultScriptHandle: "battle-result-script:95",
    attackSource: weapon?.key,
    missing: []};
  };
  let party = await Promise.all(savedRoles.filter(role => (encounter.configureParty || encounter.kind === 'redwolf'
    ? preview.party[role.roleId]?.visible : role.present)
    && (!encounter.commands || !(role.status & 0xE0))).map(async role => {
    const slot = role.roleId;
    const configuredMember = encounter.configureParty || encounter.kind === 'redwolf' ? preview.party[slot] : null;
    if (configuredMember?.companion === 'redwolf') return companionActor(slot);
    const configuredSource = configuredMember && catalog.attackSourceByKey.get(configuredMember.attacks?.melee);
    if (configuredSource) {
      const previousWeapon = role.equipment.findIndex((id, index) => role.slotFlags & (0x80 >> index)
        && id >= 0x23 && id <= 0x40);
      const weaponSlot = previousWeapon >= 0 ? previousWeapon : role.equipment.findIndex(id => !id);
      if (weaponSlot >= 0) {
        role.equipment[weaponSlot] = configuredSource.source.id;
        role.slotFlags |= 0x80 >> weaponSlot;
      }
    }
    const weaponId = configuredSource?.source?.id ?? role.equipment?.find((id, index) => role.slotFlags & (0x80 >> index)
      && id >= 0x23 && id <= 0x40);
    const weapon = weaponId == null ? null : await repository.get(`item:${weaponId.toString(16).toUpperCase().padStart(2, '0')}`, null);
    const source = catalog.humanWeaponSources.find(row => row.source.id === weaponId);
    const equipment = await itemEquipmentValues(role.equipment, repository);
    const stats = roleEquipmentStats({...role, slot_flags: role.slotFlags}, equipment.itemValue);
    const resistance = effect => {
      const reference = equipmentEffects?.records?.find(row => row.effect_reference.endsWith(`:${effect}-resistance`))?.item_reference;
      if (!reference) return undefined;
      const id = Number.parseInt(reference.split(':').at(-1), 16);
      return role.equipment.some((item, index) => item === id && (role.slotFlags & (0x80 >> index))) ? 2 : 0;
    };
    const riding = configuredMember ? configuredMember.riding : Boolean(role.present & 0x80);
    if (configuredMember) {
      role.present = slot + 1 + (riding ? 128 : 0);
      const preset = catalog.vehiclePresetById.get(configuredMember.vehiclePresetId);
      role.currentVehicle = riding ? preset?.preset.vehicle_slot ?? role.currentVehicle : 255;
    }
    const selectedCommand = encounter.commands?.find(row => row.role === slot);
    const previous = encounter.actorState?.find(row => row.side === 'party' && row.roleId === slot);
    const missing = [];
    if (!weapon && (!selectedCommand || selectedCommand.kind === 'weapon')) missing.push('未确认：本次人物武器结果');
    let vehicle;
    if (riding) {
      const read = field => {
        const id = `save.slot.${selectedSlot}.vehicle.${role.currentVehicle}.${field}`;
        const value = encounter.fields && Object.hasOwn(encounter.fields, id) ? encounter.fields[id] : save?.fields.find(id)?.value;
        role.sources[`vehicle.${field}`] = `${save?.source || '存档'} · ${id}`;
        return value;
      };
      const keys = ['main_gun', 'sub_gun', 'special', 'c_unit', 'engine', 'chassis'];
      const parts = await Promise.all(keys.map(async key => {
        const itemId = read(`equipment.${key}`);
        const item = Number.isInteger(itemId) && itemId ? await repository.get(
          `item:${itemId.toString(16).toUpperCase().padStart(2, '0')}`, null) : null;
        return {key, itemId, label: item?.name, state: read(`equipment_state.${key}`),
          defense: key === 'chassis' ? read('defense') : item?.defense?.value};
      }));
      vehicle = Object.assign(vehicleFor(role.currentVehicle), {slot: role.currentVehicle,
        sp: read('sp'), condition: read('condition_raw'), equippedMask: read('equipped_mask_raw'),
        defense: read('defense'), parts, conditionTurns: previous?.vehicle?.conditionTurns});
      if (!selectedCommand) missing.push('未确认：战车行动选择与弹药消耗');
      if ([6, 7].some(selector => (vehicle.condition & (128 >>> selector))
          && !Number.isInteger(vehicle.conditionTurns?.[selector])))
        missing.push('未确认：入场战车火焰与冷气的剩余回合计数');
    }
    if (role.status && role.status !== 255) missing.push('未确认：人物异常状态的回合效果');
    const roleDamageResistances = {0: resistance('fire'), 1: resistance('cold')};
    return {...role, ...stats, id: `party:${slot}`, side: 'party', slot, riding, playerControlled: true, messageName: role.label,
      selectedCommand, resultConditionStates: previous?.resultConditionStates, conditionTurns: previous?.conditionTurns,
      vehicle, roleDefense: stats.defense, roleDefenseSkill: role.defenseSkill,
      defense: riding ? vehicle.defense : stats.defense,
      defenseSkill: riding ? role.drivingSkill : role.defenseSkill,
      attackSkill: riding ? role.drivingSkill : role.attackSkill, roleAttackSkill: role.attackSkill,
      roleDamageResistances, damageResistances: riding ? {0: 0, 1: 0} : roleDamageResistances,
      shield: 0, maxShield: 0, command: 0x0C, weaponId,
      attackSource: source?.key, targetScope: source?.targetScope,
      resultScriptHandle: 'battle-result-script:95',
      inputSources: role.sources, missing};
  }));
  const visibleCount = party.length;
  preview = normalizeBattleScenePreview({...preview, party: preview.party.map((member, index) => {
    const actor = party.find(row => row.slot === index);
    const vehicle = actor?.riding ? catalog.vehiclePresets.find(row => row.preset.vehicle_slot === actor.currentVehicle) : null;
    return {...member, visible: Boolean(actor), riding: Boolean(vehicle),
      vehiclePresetId: vehicle?.id ?? member.vehiclePresetId,
      ...battlePartyVisualPosition(index, visibleCount),
      attacks: {...member.attacks, melee: actor?.attackSource || ''}};
  })}, project, catalog);
  const story = encounter.kind === 'redwolf' ? {kind: 'redwolf', returnEvent: 0x82,
    restoreParty: party.map(actor => ({id: actor.id, ...savedRoles[actor.slot]}))} : null;
  if (encounter.configureParty) {
    party = party.filter(actor => preview.party[actor.slot]?.visible).map(actor => {
      const stats = encounter.partyStats?.[actor.slot] || {};
      const source = catalog.attackSourceByKey.get(preview.party[actor.slot].attacks?.melee);
      return {...actor, weaponId: source?.source?.id ?? actor.weaponId,
        attackSource: source?.key ?? actor.attackSource, targetScope: source?.targetScope ?? actor.targetScope,
        ...stats, roleId: actor.roleId ?? actor.slot,
        present: actor.present ?? actor.slot + 1,
        inputSources: {...actor.inputSources, ...Object.fromEntries(Object.keys(stats).map(key => [key, '本次阵容']))}};
    });
  }
  if (encounter.commands) {
    const kinds = ['weapon', 'item', 'vehicle-weapon', 'shell', 'escape', 'defend', 'protect'];
    if (encounter.commands.length !== party.length || party.some(actor => encounter.commands.filter(command =>
      command.role === actor.roleId && kinds.includes(command.kind)).length !== 1))
      throw new TypeError('本次行动选择与战斗组件的队伍现场不符');
    if (party.some(actor => actor.selectedCommand.kind === 'weapon' && actor.selectedCommand.item !== actor.weaponId))
      throw new TypeError('本次人物武器选择与装备现场不符');
    for (const actor of party) actor.selectedGroup = encounter.commands.find(command => command.role === actor.roleId).group;
  }
  const resultFields = encounter.fields || Object.fromEntries((save?.fields.all(`save.slot.${selectedSlot}.`) || [])
    .map(field => [field.fieldId, structuredClone(field.value)]));
  return {party, enemies, preview, monsters, growth,
    encounter: {kind: 'encounter', saveSlot: selectedSlot, ...encounter, fields: resultFields},
    monsterActors, messageCalls, patterns: patterns?.records || [], actions: actions?.records || [],
    resultPrograms: (scripts?.records || []).map(row => ({handle: row.handle, ...battleResultProgram(row)})),
    rateFactors: scaling?.records?.map(row => row.factor_numerator),
    randomAmounts: randomAmounts?.random_amount_profiles || [],
    items: items?.records || [], healing: healing?.records || [],
    healingCode: healing?.heal_selected_party_member_code,
    shells: catalog.shellAttackChannel.sources.map(row => row.source),
    story,
    profiles: (selection?.["strategy/profile/cycle/status conditions"]?.probability_profiles || [])
      .map(profile => profile.id === 4 ? {...profile, thresholds: [...profile.thresholds, ...cycleThresholds]} : profile),
    statusOverrideActions: statusOverrides,
    initiativeMode: 0};
}

// @editor-module 按回合、行动方、阶段与同类序号对齐实机记录与演算。

function tracePhase(step) {
  if (step.event.includes("回合开始")) return "turn";
  if (step.event.includes("攻击")) return "attack";
  if (step.event.includes("受伤")) return "damage";
  if (step.event.includes("死亡")) return "death";
  return step.phase === "exit" ? "end" : "entry";
}

function compareBattleTrace(simulation, trace) {
  if (!trace?.steps) return [];
  let round = 0;
  const occurrences = new Map();
  return trace.steps.map((observed, index) => {
    const kind = tracePhase(observed);
    if (kind === "turn") round++;
    const side = observed.event.includes("戈斯战车攻击") || observed.event.includes("红狼受伤") ? "enemy"
      : observed.event.includes("红狼攻击") || observed.event.includes("护罩受伤") ? "party" : "";
    const key = `${round}:${kind}:${side}`;
    const ordinal = occurrences.get(key) || 0;
    occurrences.set(key, ordinal + 1);
    const candidates = simulation.steps.filter(step => step.kind === kind
      && (kind === "end" || step.round === round)
      && (!side || step.actor?.startsWith(`${side}:`)));
    const calculated = candidates[ordinal];
    const hp = calculated?.actors.find(actor => actor.side === "party")?.hp;
    const shield = calculated?.actors.find(actor => actor.side === "enemy")?.shield;
    const sameMessage = Boolean(calculated && observed.messageRecordId
      && observed.messageRecordId === calculated.messageRecordId);
    const sameHp = observed.hp === undefined ? null : Boolean(calculated && Number(observed.hp.replace("SI ", "")) === hp);
    const sameShield = observed.shield === undefined ? null : Boolean(calculated && observed.shield === shield);
    return {index, frame: observed.frame, round, observed, calculated, hp, shield, sameShield,
      sameMessage: observed.messageRecordId ? sameMessage : null, sameHp,
      reason: !calculated ? kind === "death" ? "规则缺口：占位结算得到不同胜负，无对应死亡步骤" : "规则缺口：每回合一次行动的占位没有对应步骤"
        : kind === "end" ? "规则缺口：只判存活方，未执行剧情返回"
          : sameHp === false || sameShield === false ? "规则缺口与随机状态差异：结果脚本／重复行动尚未解码；NMI 随机推进未对齐"
            : sameMessage === false && observed.messageRecordId ? "规则缺口：占位行动或结束分支的消息不同"
              : "可对齐；HP 初值相同不代表后续规则完整"};
  });
}

// @editor-module 战后结算只产生已确认字段的预览效果。

const unsigned$1 = (value, max) => Number.isInteger(value) && value >= 0 && value <= max;
const ROLES$1 = ['hunter', 'mechanic', 'soldier'];

/** 17:A1CE–A27B、3F:EDCB–EE34、13:994D–9990。 */
function battleResultSettlement(input, party, totals, {deaths, dropRoll} = {}) {
  const slot = input.encounter.saveSlot, prefix = `save.slot.${slot}.`;
  const fields = input.encounter.fields || {};
  const effects = [], dropEffects = [], unconfirmed = [];
  const skip = reason => unconfirmed.push(reason);
  const effect = (field, value, drop = false) => {
    if (!Object.hasOwn(fields, field)) {skip(`缺少结算字段：${field}`); return;}
    effects.push({field, value});
    if (drop) dropEffects.push({field, value});
  };
  for (const vehicle of new Set(party.filter(actor => actor.present && unsigned$1(actor.currentVehicle, 10))
    .map(actor => actor.currentVehicle))) {
    const field = `${prefix}vehicle.${vehicle}.condition_raw`;
    if (!unsigned$1(fields[field], 255)) skip('战后战车状态缺少当前值');
    else effect(field, fields[field] & 4);
  }
  let gold = totals.gold;
  const rentals = Array.from({length: 3}, (_, index) => fields[`${prefix}active_rental_vehicle_preset.${index}`]);
  if (totals.experience && !rentals.every(value => unsigned$1(value, 255))) {
    gold = null; skip('出租战车分成缺少活动实例');
  } else if (totals.experience) {
    for (const preset of rentals) if (preset < 128) gold = Math.floor(gold / 2);
  }
  if (totals.experience && gold) {
    const current = fields[`${prefix}gold`];
    if (!unsigned$1(current, 0xFFFFFF)) skip('金钱入账缺少当前余额');
    else {
      const balance = Math.min(9999999, (current + gold) % 0x1000000);
      effect(`${prefix}gold`, balance);
      const settings = fields[`${prefix}adventure_data_settings`], threshold = fields[`${prefix}gold_bell_threshold`];
      if (!unsigned$1(settings, 255)) skip('金铃结算缺少冒险设置');
      else if (settings & 128) {
        if (!unsigned$1(threshold, 0xFFFFFF)) skip('金铃结算缺少通知金额');
        else if (balance >= threshold) effect(`${prefix}adventure_data_settings`, settings & 127);
      }
    }
  }
  for (const actor of totals.experience ? party : []) {
    if (!actor.present || actor.status === 255) continue;
    const role = `${prefix}role.${actor.slug}.`;
    const experience = fields[`${role}experience`], level = fields[`${role}level`];
    if (!unsigned$1(experience, 0xFFFFFF) || !unsigned$1(level, 99) || level === 0) {
      skip(`${actor.slug} 的经验结算缺少当前经验或等级`); continue;
    }
    const next = Math.min(9999999, (experience + totals.experience) % 0x1000000);
    const threshold = input.growth?.experience_thresholds?.find(row => row.current_level === level);
    if (level < 99 && (!unsigned$1(threshold?.required_total_experience, 0xFFFFFF)
        || next >= threshold.required_total_experience)) {
      skip(`${actor.slug} 的升级属性与随机现场未确认`); continue;
    }
    effect(`${role}experience`, next);
  }
  const lastDeath = deaths?.at(-1);
  const last = input.monsters?.find(row => row.id === lastDeath?.monsterId);
  const members = party.map(actor => ({slot: actor.roleId, hp: actor.hp,
    inventory: Array.from(fields[`${prefix}role.${actor.slug}.inventory`] || []),
    equipment: Array.from(fields[`${prefix}role.${actor.slug}.equipment`] || []),
    ridingVehicle: unsigned$1(actor.currentVehicle, 10), vehicleSlot: actor.currentVehicle}));
  let drop = null;
  if (totals.experience) {
    const values = battleResultDropValues({experience: totals.experience, gold, last,
      party: members, dropRoll, vehicles: input.resultVehicles, dropWeight: input.dropWeight});
    if (values.status !== 'available') skip(values.reason);
    else {
      drop = values.drop;
      if (drop?.inserted) {
        if (drop.container?.startsWith('vehicle-')) {
          skip('战车掉落的弹数与逐列状态提交未确认'); drop = {...drop, committed: false};
        } else {
          const field = `${prefix}role.${ROLES$1[drop.partySlot]}.${drop.itemId < 0x41 ? 'equipment' : 'inventory'}`;
          const items = Array.from(fields[field]); items[drop.itemSlot] = drop.itemId;
          effect(field, items, true); drop = {...drop, committed: true};
        }
      }
    }
  }
  return {rewards: {...totals, gold}, drop, effects, dropEffects, unconfirmed};
}

// @editor-module 遭遇完成结果只声明已确认的队伍、奖励累计与事件提交。
const flagHandle = id => id.toString(16).toUpperCase().padStart(2, '0');
const unsigned = (value, max) => Number.isInteger(value) && value >= 0 && value <= max;
const ROLES = ['hunter', 'mechanic', 'soldier'];

/** PRG $02EECD–$02EF00、$02EF74–$02EFE1：胜利提交与败北剧情交接。 */
function battleEncounterResult(input, actors, rewardTotals, missing = [], resultContext = {}) {
  const active = side => actors.some(actor => actor.side === side && (actor.hp > 0 || actor.shield > 0)
    && !(actor.status & 0x80));
  const outcome = !active('party') ? 'defeat' : !active('enemy') ? 'victory' : resultContext.round ? 'round' : 'unknown';
  const call = input.encounter || {};
  const gaps = [...missing];
  if (outcome === 'unknown') gaps.push('未确认：战斗尚未分出胜负');
  if (input.story) gaps.push('未确认：剧情专用战斗不提交普通遭遇结果');
  const party = actors.filter(actor => actor.side === 'party').map(actor => ({id: actor.id,
    roleId: actor.roleId, slug: actor.slug, hp: actor.hp, status: actor.status,
    present: actor.riding === false && unsigned(actor.present, 255) ? actor.present & 127 : actor.present,
    currentVehicle: actor.currentVehicle, inventory: actor.inventory, vehicle: actor.vehicle}));
  if (![1, 2].includes(call.saveSlot) || !party.length || party.some(actor => !unsigned(actor.roleId, 2)
      || actor.slug !== ROLES[actor.roleId]) || new Set(party.map(actor => actor.roleId)).size !== party.length)
    gaps.push('未确认：调用方存档组与人物身份');
  if (party.some(actor => !unsigned(actor.hp, 65535) || !unsigned(actor.status, 255) || !unsigned(actor.present, 255)))
    gaps.push('未确认：战后队伍状态');
  const flags = [];
  const eventEffects = [];
  if (!unsigned(call.pendingEventFlag ?? 0, 255) || !unsigned(call.targetStoryState ?? 0, 255))
    gaps.push('未确认：战后事件与剧情状态的输入域');
  const pending = unsigned(call.pendingEventFlag, 255) ? call.pendingEventFlag : 0;
  if (outcome === 'victory' && pending) {
    const bounty = pending >= 0x50 && pending < 0x5D;
    if (bounty && rewardTotals.status !== 'available') gaps.push('未确认：事件提交所需的击破奖励');
    else if (!bounty || rewardTotals.experience !== 0) {
      if (bounty) {
        const level = call.fields?.[`save.slot.${call.saveSlot}.role.hunter.level`];
        const field = `save.slot.${call.saveSlot}.wanted_defeat_level_at_victory.${pending - 0x4F}`;
        if (!Number.isInteger(level) || !Object.hasOwn(call.fields, field))
          gaps.push('未确认：赏金首击破等级的调用现场');
        else eventEffects.push({field, value: level});
      }
      flags.push(pending);
    }
  }
  const scene = structuredClone(call.scene || {});
  let mode = 'resume';
  if (outcome === 'defeat') {
    if (party.some(actor => unsigned(actor.currentVehicle, 10))) gaps.push('未确认：败北留车与场景对象恢复');
    if (call.targetStoryState === 6) gaps.push('未确认：剧情状态 06 的玩家恢复现场');
    else {
      for (const actor of party) {
        actor.status = 255;
        if (actor.roleId !== 0) actor.present = 0;
      }
      scene.storyState = 3;
      scene.actorList = 0xF2;
      mode = 'reload';
      if (call.fieldEncounter === true) flags.push(0x4C);
    }
  } else if (outcome === 'victory') {
    // PRG $02E206–$02E20F：胜利返回只保留死亡与酸状态，FF 死亡槽保持原值。
    for (const actor of party) if (actor.status !== 255) actor.status &= 0x88;
    const storyState = call.targetStoryState ?? 0;
    if (storyState > 0 && storyState < 0x80) gaps.push('未确认：战后剧情现场须交接所属领域');
    else {scene.storyState = 0; mode = storyState === 0 ? 'resume' : 'reload';}
  }
  if (outcome === 'victory' && rewardTotals.status !== 'available') gaps.push('未确认：本次击破奖励');
  if (['victory', 'defeat'].includes(outcome)) for (const actor of party) {
    if (actor.present && actor.status !== 255) actor.status &= 0x88;
    if (actor.present) actor.present = actor.roleId + 1 + (unsigned(actor.currentVehicle, 10) ? 128 : 0);
  }
  const confirmed = gaps.length === 0;
  const partyEffects = confirmed ? party.flatMap(actor => Object.entries({current_hp: actor.hp,
    status: actor.status, present: actor.present, inventory: actor.inventory}).filter(([, value]) => value !== undefined)
    .map(([field, value]) => ({field: `save.slot.${call.saveSlot}.role.${actor.slug}.${field}`, value}))) : [];
  if (confirmed) for (const vehicle of new Map(party.filter(actor => actor.vehicle)
    .map(actor => [actor.vehicle.id ?? actor.vehicle.slot, actor.vehicle])).values()) {
    const values = [...(vehicle.inventory || []).map((value, index) => [`item.${index}`, value]),
      ...SERVICE_PARTS.map((part, index) => [`equipment_state.${part}`,
        vehicle.parts?.[index]?.state ?? vehicle.equipmentState?.[index]]),
      ...(vehicle.shellTypes || []).map((value, index) => [`shell_type.${index}`, value]),
      ...(vehicle.shellCounts || []).map((value, index) => [`shell_count.${index}`, value]),
      ['sp', vehicle.sp], ['condition_raw', vehicle.condition]];
    partyEffects.push(...values.filter(([, value]) => value !== undefined).map(([field, value]) => ({
      field: `save.slot.${call.saveSlot}.vehicle.${vehicle.id ?? vehicle.slot}.${field}`, value})));
  }
  const eventFlags = confirmed ? flags : [];
  const entryEffects = confirmed ? [...eventEffects, ...eventFlags.map(id => ({field: `save.slot.${call.saveSlot}.global_event_flag.${flagHandle(id)}`, value: 1}))] : [];
  const totals = outcome === 'defeat' ? {status: 'available', experience: 0, gold: 0} : rewardTotals;
  const settlement = confirmed && ['victory', 'defeat'].includes(outcome) ? battleResultSettlement({
    ...input, encounter: {...call, fields: {...call.fields,
      ...Object.fromEntries(partyEffects.map(effect => [effect.field, effect.value]))}}}, party, totals, resultContext)
    : {rewards: totals, drop: null, effects: [], dropEffects: [], unconfirmed: []};
  const stages = {entry: entryEffects, rewards: [...partyEffects,
    ...settlement.effects.filter(effect => !settlement.dropEffects.some(drop => drop.field === effect.field))],
    drop: settlement.dropEffects};
  const effects = [...stages.entry, ...stages.rewards, ...stages.drop];
  const sourceFields = Object.fromEntries(Object.entries(call.fields || {})
    .filter(([field]) => field.startsWith(`save.slot.${call.saveSlot}.`))
    .map(([field, value]) => [field, structuredClone(value)]));
  return {outcome, confirmed, missing: [...new Set(gaps)], party, rewards: settlement.rewards, drop: settlement.drop,
    invocation: {saveSlot: call.saveSlot, sceneId: call.scene?.sceneId, sourceFields},
    unconfirmed: settlement.unconfirmed, eventFlags, effects, stages,
    ...(outcome === 'round' && confirmed ? {roundState: {actors: structuredClone(actors),
      enemyEvents: structuredClone(resultContext.enemyEvents), deaths: structuredClone(resultContext.deaths),
      randomState: resultContext.random}} : {}),
    sceneReturn: confirmed ? {mode, context: scene, ...(outcome === 'defeat' ? {handoff: 'story-f2'} : {})} : null};
}

// @editor-module 战斗行动按已确认结果指令修改本次演算投影。

const message$1 = value => `record:0A:${String(value).padStart(3, '0')}`;
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
      if (actor.status === 255) {healingMessage = message$1(0x76); continue;}
      const base = partyHealingBase({records: input.healing,
        heal_selected_party_member_code: input.healingCode}, itemId);
      if (!Number.isInteger(base)) return ['未确认：本次工具的回复参数字段'];
      const result = partyHealingValues({hp: actor.hp, maxHp: actor.maxHp, status: actor.status,
        base, randomHigh: rng.snapshot().high});
      if (result.missing) return [result.missing];
      const before = actor.hp; actor.hp = result.hp;
      healingMessage = message$1(result.message);
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
        messageOutcomeId: healingMessage === message$1(0x4F) ? 'hp-full'
          : healingMessage === message$1(0x4E) ? 'hp-restored' : ''});
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
function battleCommandEffects(actor, input, rng) {
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
    events: [{event: selection.kind === 'defend' ? '防卫' : '保护同伴', messageRecordId: message$1(selection.command)}]};
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

// @editor-module 战车受击与火焰、冷气状态按当前存档和部件数值结算。

/** PRG $02F3F6–$02F40E、$02EF03–$02F010、$02F4F9–$02F59C。 */
function settleBattleVehicleDamage(target, amount, random) {
  const vehicle = target.vehicle;
  if (!Number.isInteger(vehicle?.sp)) return {missing: ['占位：本次战车护甲缺失']};
  let settled = Math.floor(amount / 5);
  if (target.defending) settled = Math.floor(settled / 2);
  const before = {hp: target.hp, shield: target.shield, riding: target.riding, vehicle: structuredClone(vehicle)};
  const after = structuredClone(before);
  after.vehicle.sp = Math.max(0, vehicle.sp - settled);
  let partDamage;
  if (!after.vehicle.sp && settled) {
    if (!Number.isInteger(vehicle.equippedMask) || vehicle.parts?.length !== 6)
      return {missing: ['占位：本次战车部件与装备位缺失']};
    const index = random.below(6);
    const part = vehicle.parts[index];
    if ((vehicle.equippedMask & (128 >>> index)) && part.itemId) {
      if (!Number.isInteger(part.defense) || !Number.isInteger(part.state))
        return {missing: ['占位：本次战车部件防御或状态缺失']};
      const threshold = part.defense < amount ? 64 : 32;
      if (random.next() < threshold && !(part.state & 128)) {
        const state = part.state | (part.state & 64 ? 128 : 64);
        after.vehicle.parts[index].state = state;
        partDamage = {index, key: part.key, itemId: part.itemId, label: part.label, before: part.state, after: state,
          messageRecordId: `record:0A:${state & 128 ? '031' : '030'}`};
        if (index === 5 && (state & 128)) {
          after.riding = false;
          after.vehicle.condition &= 4;
          after.defense = target.roleDefense;
          after.defenseSkill = target.roleDefenseSkill;
          after.attackSkill = target.roleAttackSkill;
          after.damageResistances = target.roleDamageResistances;
        }
      }
    }
  }
  return {settled, before, after, partDamage, dead: false, status: target.status, missing: []};
}

/** PRG $02F6F0–$02F729、$02F7AF–$02F7E8：FA 06 火焰、FA 07 冷气。 */
function applyBattleVehicleCondition(target, {selector, operation = 'apply'}) {
  if (!target.riding) return {changed: false, missing: []};
  if (![6, 7].includes(selector) || !Number.isInteger(target.vehicle?.condition))
    return {changed: false, missing: ['占位：本次战车状态现场缺失']};
  const mask = 128 >>> selector;
  const condition = target.vehicle.condition;
  if (operation === 'clear') {
    if (!(condition & mask)) return {changed: false, missing: []};
    target.vehicle.condition &= ~mask;
  } else {
    if (condition & (selector === 6 ? 1 : 2)) return {changed: false, missing: []};
    target.vehicle.condition |= mask;
    target.vehicle.conditionTurns = {...target.vehicle.conditionTurns, [selector]: 3};
  }
  return {changed: true, missing: [], messageRecordId:
    `record:0A:${String(operation === 'clear' ? selector + 44 : selector + 33).padStart(3, '0')}`};
}

/** PRG $02009E–$0200BE：计数归零调用 B7，零计数调用 B5。 */
function battleVehicleConditionRound(target, selector) {
  const count = target.vehicle?.conditionTurns?.[selector];
  if (!target.riding || !(target.vehicle?.condition & (128 >>> selector)) || !Number.isInteger(count)) return null;
  if (count & 128) return null;
  target.vehicle.conditionTurns[selector] = Math.max(0, count - 1);
  return count > 1 ? null : `battle-result-script:${count === 1 ? 'B7' : 'B5'}`;
}

// @editor-module 有依据的战斗规则与明确占位共同推进只读演算。

const evidence = name => `project/evidence/reverse-engineering/${name}/observations.json`;
const BATTLE_SIMULATION_RULES = Object.freeze({
  random: {label: "双字节随机状态与有界乘法", basis: evidence("global-random-state")},
  initiative: {label: "速度加随机低六位，饱和至 255；稳定降序", basis: `${evidence("initiative-score-byte-saturation")}；PRG $02052B–$0205B4`},
  selection: {label: "策略阈值扫描与行动模式引用", basis: `${evidence("enemy-action-selection-field-bindings")}；PRG $0203FD–$020516`},
  amount: {label: "技能差缩放攻击、减半防御，再随机增减至多 50/256", basis: "PRG $02EC9D–$02ED8D；battle-amount-scaling-service"},
  hp: {label: "护罩除五结算；HP 扣至零；死亡退出队列", basis: `${evidence("enemy-damage-application")}；PRG $02F011–$02F051`},
  messages: {label: "行动→损伤→死亡；保留前一消息", basis: evidence("battle-message-sequences")},
  npc: {label: "红狼剧情初值 HP 3779、攻击 590、防御 750", basis: "PRG $021A17–$021A73：立即数写 $6466/$646C/$6472；未取 Mesen 采样"},
  initialization: {label: "bit7 分流护罩与内部 HP；高两位为零时内部 HP 乘四", basis: "PRG $020F42–$020F76；project/evidence/battle-simulation-rules/observations.json"},
  replacement: {label: "独存敌人的 F6 结果移除原槽并按增援规则装载操作数引用的怪物", basis: "PRG $02F499–$02F4DE、$02F824–$02F832、$0212A6–$0212F0；策略 12 比较护罩与初值四分之一：$0204A7–$0204B5"},
  exit: {label: 'EE 递减退出控制字；目标列表完成后敌槽离场，不累计击破奖励', basis: `${evidence('battle-ee-exit')}；PRG $07ECB3–$07ECB6、$02F124–$02F138、$02EE87–$02EF00`},
  presentation: {label: "存活受击保留背景；击破闪烁后移除；替换按扫描线揭示入场", basis: "PRG $02EA12–$02EA1D、$02EAF9–$02EB0D、$02F4BD–$02F4C4、$07E123–$07E184、$07D5D2–$07D5E8"},
  route: {label: "CB／D3 物理量、D4 随机量、D5 重复量、C9 抗性缩放、C0／E2 受击、F9／FA 火焰与冷气、F3／F4 恢复；其余占位", basis: "PRG $02EC2B–$02EC9D、$02F22D–$02F2E4、$02ED8E–$02EDD0、$02F3E2–$02F41A、$02F6AA–$02F729、$02F78E–$02F7E8", placeholder: true},
  conditions: {label: '火焰与冷气每回合持续伤害；三回合计数递减到零时以随机低四位小于六恢复，保留时下一回合恢复', basis: 'PRG $02F6AA–$02F6DE、$020093–$0200BE；结果记录 5E／5F→5B／5C、B8→B6'},
  vehicle: {label: '战车伤害除五后防御折半；护甲耗尽时按部件防御判定损坏，底盘破坏使人物下车', basis: `${evidence('battle-vehicle-settlement')}；PRG $02F3F6–$02F40E、$02F4F9–$02F59C`},
  vehicleConditions: {label: 'FA 06 火焰、FA 07 冷气互斥；重复施加刷新三回合计数，F4 清除战车状态', basis: `${evidence('battle-vehicle-settlement')}；PRG $02F6F0–$02F729、$02F7AF–$02F7E8`},
  party: {label: "红狼指令 0C、武器 3C；速度与技能继承玩家槽", basis: "PRG $021AD2–$021AE5、$021174–$021177、$0212CD–$0212F0"},
  partyCurrent: {label: '人物按调用方队伍与当前装备参战', basis: 'role-equipment-derived；PRG $02E7F5–$02E9B3'},
  commands: {label: '工具自用、携带栏移除、普通弹数与炮弹槽结算；辅助行动按已选命令执行',
    basis: 'project/evidence/reverse-engineering/battle-command-state-machine/command-gaps.json'},
  repeat: {label: "次数为 packed_b 高两位右移一位加一，奇数且随机高字节≥96 时再加一；bit5 每次出手前重选", basis: "PRG $020F2D–$020F3F、$02E689–$02E6DE"},
  target: {label: "单体倒序收集存活队员，固定目标优先；bit4 缓存目标；全体正序", basis: "PRG $02F07C–$02F0E6"},
  collision: {label: '双方完整防御差决定受击方；追加视觉 00；结算完成后抑制重复结算，死亡结束剩余出手', basis: evidence('battle-ed-collision')},
  end: {label: "红狼全灭恢复玩家槽并返回剧情事件 82；其余奖励占位", basis: "PRG $02EF74–$02EFB3", placeholder: true},
  encounter: {label: "胜利按击破奖励提交事件；普通败北交接复活剧情", basis: "PRG $02EECD–$02EF00、$02EF74–$02EFE1"},
  timing: {label: "占位：画面、消息与等待帧之间的随机调用未调度", basis: "PRG $07D01D–$07D063；project/evidence/battle-simulation-rules/observations.json", placeholder: true},
});

/** PRG $02EDDB–$02EEC7：当前护罩或 HP 的独立伤害结算。 */
function settleBattleDamage(target, amount, random, riding = target.riding) {
  if (target.side === 'party' && riding) return settleBattleVehicleDamage(target, amount, random);
  const shielded = target.side === "enemy" && target.shield > 0;
  const guarded = target.side === "enemy" ? Boolean(target.guard) : Boolean(target.defending);
  const reduced = guarded ? Math.floor(amount / 2) : amount;
  const settled = shielded ? Math.floor(reduced / 5) : reduced;
  const before = {hp: target.hp, shield: target.shield};
  const after = {...before, [shielded ? "shield" : "hp"]:
    Math.max(0, before[shielded ? "shield" : "hp"] - settled)};
  const dead = !after.hp && !after.shield;
  return {shielded, settled, before, after, dead, status: dead ? 255 : target.status};
}


function selectBattleEnemyAction(actor, input, rng) {
  const roll = rng.next();
  const pattern = input.patterns.find(row => row.current_monster_users?.includes(actor.handle));
  const strategy = actor.flags & 15;
  let profile, slot = 0;
  const missing = reason => ({missing: [`占位：${reason}`]});
  if (actor.status & 16) {
    const thresholds = input.profiles.find(row => row.id === 1)?.thresholds;
    if (!thresholds || !input.statusOverrideActions) return missing('乱阵覆盖的当前阈值或行动缺失');
    while (slot < 5 && roll >= thresholds[slot]) slot++;
    const id = input.statusOverrideActions[slot]?.action_id;
    const action = input.actions.find(row => row.id === id);
    return action ? {action, slot, all: false,
      missing: ['占位：状态覆盖行动的计数与模式槽位未确认']} : missing('乱阵覆盖行动不存在');
  }
  if (strategy === 0) return missing('策略零的直接行动引用尚未接入');
  else if ([1, 2].includes(strategy)) profile = strategy;
  else if (strategy === 3) {
    if (actor.hp <= Math.floor(actor.maxHp / 4)) profile = 3;
  }
  else if (strategy === 4 || strategy === 5) {
    if (!Number.isInteger(actor.aiCycle)) return missing('策略循环计数缺失');
    const next = (actor.aiCycle + 1) & 255;
    slot = next === 6 ? 0 : next;
    actor.aiCycle = strategy === 5 ? (slot + 1) & 255 : slot;
    if (strategy === 5) profile = 4;
  } else if (strategy === 6) {
    if (actor.shield <= Math.floor(actor.maxShield / 4)) profile = 3;
  } else if (strategy === 7) {
    if (!Number.isInteger(actor.defensePool)) return missing('策略可破坏防御池缺失');
    if (!actor.defensePool) profile = 3;
  } else if (strategy === 8) {
    if (!Number.isInteger(input.initiativeMode)) return missing('策略先制状态缺失');
    if (!(input.initiativeMode & 128)) profile = 3;
  } else if (strategy === 9) {
    if (!Number.isInteger(actor.actionUses?.[0])) return missing('策略首槽行动计数缺失');
    if (!actor.actionUses[0]) profile = 3;
  } else if (strategy === 10) profile = 5;
  else if (strategy === 11) profile = input.party.some(row => row.present && row.status === 255) ? 2 : 6;
  else if (strategy === 12) profile = actor.shield <= Math.floor(actor.maxShield / 4) ? 0 : 5;
  else return missing(`怪物策略 $${strategy.toString(16).toUpperCase()} 未确认`);
  if (profile !== undefined) {
    const thresholds = input.profiles.find(row => row.id === profile)?.thresholds;
    if (!thresholds) return missing('策略概率阈值缺失');
    while (slot < 5) {
      if (!Number.isInteger(thresholds[slot])) return missing('策略扫描所需的阈值缺失');
      if (thresholds[slot] && thresholds[slot] >= roll) break;
      slot++;
    }
  }
  const selected = pattern?.slots?.[slot];
  const action = input.actions.find(row => row.handle === selected?.action_reference);
  return {action,
    pattern: pattern?.handle, slot, all: Boolean(selected?.all_targets),
    missing: !selected || !action ? ['占位：行动模式或所选行动缺失'] : []};
}

function calculateBattlePhysicalAmount(attack, defense, rng,
  {attackSkill = 0, defenseSkill = 0, rateFactors} = {}) {
  if (attackSkill !== defenseSkill) {
    if (!rateFactors?.length) throw new TypeError("缺少技能差倍率当前值");
    const difference = Math.abs(attackSkill - defenseSkill);
    const index = Math.floor(Math.min(50, difference * 3) / 5) + 1;
    const adjustment = Math.floor(attack * rateFactors[index] / 256);
    attack = (attackSkill < defenseSkill ? attack - adjustment : attack + adjustment) & 65535;
  }
  let base = attack - Math.floor(defense / 2);
  if (base <= 0) base = rng.snapshot().high & 3;
  const roll = rng.below(102);
  const adjustment = Math.floor(base * (roll < 51 ? roll : roll - 51) / 256);
  return (roll < 51 ? base - adjustment : base + adjustment) & 65535;
}

function battleEnemyActionCount(actor, rng) {
  const code = actor.repeatCode ?? 0;
  return (code >>> 1) + 1 + ((code & 1) && rng.snapshot().high >= 96 ? 1 : 0);
}

/** 未确认的指令不产生伤害；缺失项随当前步骤传给消费方。 */
function calculateBattleResult(program, actor, target, input, rng, depth = 0, prepared = {}) {
  if (depth >= 16) return {missing: ["占位：结果脚本循环分支未确认"]};
  if (program?.missing?.length) return {missing: program.missing};
  if (!program?.operations) return {missing: program?.missing || ["占位：结果脚本未解码"]};
  let {amount = 0, applies = false, messages = [], conditions = [], riding = target.riding, conditionSelector} = prepared;
  const resultActor = actor.side === 'party' ? actor : target;
  const branchResult = handle => calculateBattleResult(input.resultPrograms?.find(row => row.handle === handle),
    actor, target, input, rng, depth + 1, {amount, applies, messages, conditions, riding, conditionSelector});
  const physical = () => calculateBattlePhysicalAmount(actor.attack, target.defense, rng, {
    attackSkill: actor.attackSkill, defenseSkill: target.defenseSkill, rateFactors: input.rateFactors,
  });
  for (const operation of program.operations) {
    if (operation.kind === "party-physical" || operation.kind === "enemy-physical") {
      if (operation.kind === "party-physical") {
        if (actor.riding) return {missing: ['占位：战车出手结算尚未接入']};
        const state = rng.snapshot();
        if (input.story?.kind !== 'redwolf' && state.high < 85 && state.low < (actor.attackSkill ?? 0))
          return {missing: ["占位：会心一击消息与效果未确认"]};
        if (target.missing?.some(value => value.includes("特殊怪物防御")))
          return {missing: ["占位：特殊防御池的消耗分支未接入"]};
      }
      amount = physical();
      if (operation.kind === "party-physical") applies = true;
    } else if (operation.kind === "enemy-ignore-defense") {
      amount = calculateBattlePhysicalAmount(actor.attack, 0, rng, {
        attackSkill: actor.attackSkill, defenseSkill: 0, rateFactors: input.rateFactors,
      });
      messages.push(operation.messageRecordId);
    } else if (operation.kind === "random-branch") {
      const handle = (rng.next() & 15) >= operation.threshold ? operation.pass : operation.fail;
      return branchResult(handle);
    } else if (operation.kind === "state-branch") {
      const branch = battleResultStateBranch(operation, {
        readState: selector => resultActor.resultConditionStates?.[selector], random: rng,
      });
      if (branch.missing.length) return {missing: branch.missing};
      return branchResult(branch.handle);
    } else if (operation.kind === "jump" || operation.kind === "actor-branch") {
      if (operation.kind === "actor-branch" && typeof resultActor.riding !== 'boolean')
        return {missing: ['占位：本次人物与战车结果分支缺少目标类别']};
      const handle = operation.kind === "jump" ? operation.handle : resultActor.riding ? operation.vehicle : operation.role;
      return branchResult(handle);
    } else if (operation.kind === 'result-target-kind') {
      riding = operation.riding;
    } else if (operation.kind === 'random-amount') {
      const profile = input.randomAmounts?.find(row => row.profile_index === operation.profile);
      if (!profile) return {missing: ['占位：随机量参数缺失']};
      amount = profile.minimum + rng.below(profile.exclusive_random_span);
    } else if (operation.kind === 'damage-resistance') {
      const resistance = target.damageResistances?.[operation.selector];
      if (!Number.isInteger(resistance) || resistance < 0 || resistance > 3)
        return {missing: ['占位：本次目标的伤害抗性档缺失']};
      if (resistance === 3) amount = (amount * 2) & 65535;
      else if (resistance) {
        if (amount > 32767) return {missing: ['占位：高位伤害抗性乘法的进位分支未接入']};
        const factor = input.rateFactors?.[resistance - 1];
        if (!Number.isInteger(factor)) return {missing: ['占位：伤害抗性倍率缺失']};
        amount = Math.floor(amount * factor / 256);
      }
    } else if (operation.kind === 'party-condition') {
      if (target.side !== 'party') return {missing: ['占位：人物状态指令缺少人物目标']};
      conditions.push({selector: operation.selector});
    } else if (operation.kind === 'vehicle-condition') {
      if (target.side !== 'party') return {missing: ['占位：战车状态指令缺少人物目标']};
      if (target.riding && !Number.isInteger(target.vehicle?.condition))
        return {missing: ['占位：本次战车状态现场缺失']};
      conditions.push({selector: operation.selector, target: 'vehicle'});
    } else if (operation.kind === 'clear-vehicle-condition') {
      if (target.side !== 'party' || ![6, 7].includes(conditionSelector))
        return {missing: ['占位：本次战车状态恢复的状态位现场未确认']};
      conditions.push({selector: conditionSelector, operation: 'clear', target: 'vehicle'});
    } else if (operation.kind === 'clear-party-condition') {
      if (target.side !== 'party' || ![5, 6].includes(conditionSelector))
        return {missing: ['占位：本次状态恢复的状态位现场未确认']};
      conditions.push({selector: conditionSelector, operation: 'clear'});
    } else if (operation.kind === 'result-message') {
      messages.push(operation.messageRecordId);
    } else if (operation.kind === "enemy-sixteenth-repeat") {
      const profile = input.randomAmounts?.find(row => row.profile_index === operation.profile);
      if (!profile) return {missing: ["占位：随机量参数缺失"]};
      const count = (profile.minimum + rng.below(profile.exclusive_random_span)) & 255;
      amount = (Math.floor(physical() / 16) * (count || 256)) & 65535;
    } else if (operation.kind === "apply-party-damage") {
      applies = true;
    } else if (operation.kind === "replace-enemy") {
      return {replacement: operation.monsterId, applies: false, missing: []};
    } else if (operation.kind === 'defense-collision') {
      const collision = battleDefenseCollision(actor, target);
      if (collision.missing.length) return collision;
      if (!collision.reflected && riding) return {missing: ['占位：载具部件与护甲结算未解码']};
      return {amount: collision.amount, applies: true, messages, conditions, collision, missing: []};
    } else if (operation.kind === 'enemy-exit') {
      if (actor.side !== 'enemy') return {missing: ['占位：EE 缺少敌方行动现场']};
      return {enemyExit: true, applies: false, messages, conditions, missing: []};
    } else return {missing: [`未确认：本次攻击结果 ${operation.kind} 的执行现场`]};
  }
  return {amount, applies, messages, conditions, riding, missing: []};
}

/** 输入只持字段对象当前值的投影；本函数不读取 ROM 或实机时间线。 */
function simulateBattle(input, {seed = 0, maxRounds = 100,
  roundMode = Boolean(input.encounter?.commands || input.encounter?.actorState), roundOffset = 0} = {}) {
  const previousRandom = input.encounter?.randomState;
  const rng = globalRandom(previousRandom ? previousRandom.high * 256 + previousRandom.low : seed);
  const randomSnapshot = rng.snapshot;
  rng.snapshot = () => ({...randomSnapshot(), calls: randomSnapshot().calls + (previousRandom?.calls || 0)});
  const actors = structuredClone([...input.party, ...input.enemies]).map(actor => ({...actor, incarnation: actor.incarnation ?? 0}));
  if (!actors.length || !input.party.length || !input.enemies.length) throw new TypeError("战斗须有双方参战者");
  const steps = [];
  const message = event => {
    const record = input.messageCalls?.[event];
    if (!record) throw new TypeError(`战斗事件缺少文字调用：${event}`);
    return record;
  };
  const enemyEvents = structuredClone(input.encounter?.enemyEvents || []);
  const deaths = structuredClone(input.encounter?.deaths || []);
  const resultMissing = new Set(actors.flatMap(actor => actor.missing || []));
  let incarnation = Math.max(...actors.map(actor => actor.incarnation));
  const commandRound = roundMode;
  for (const actor of actors.filter(actor => actor.side === 'party'))
    actor.defending = actor.selectedCommand?.kind === 'defend';
  const protector = input.encounter?.commands?.findLast(command => command.kind === 'protect')?.role;
  const alive = side => actors.filter(actor => actor.side === side && (actor.hp > 0 || actor.shield > 0)
    && !(actor.status & 0x80));
  const snapshot = () => structuredClone(actors);
  const append = step => steps.push({index: steps.length, actors: snapshot(),
    enemyEvents: structuredClone(enemyEvents), random: rng.snapshot(), ...step});
  const applyConditions = (result, actor, target) => {
    for (const condition of result.conditions || []) {
      if (condition.target === 'vehicle') {
        const effect = applyBattleVehicleCondition(target, condition);
        for (const gap of effect.missing) resultMissing.add(gap);
        if (effect.changed) append({kind: 'condition', round, actor: actor.id, targets: [target.id],
          event: `${target.label} · ${condition.operation === 'clear' ? '状态恢复' : condition.selector === 6 ? '火焰' : '冷气'}`,
          messageRecordId: effect.messageRecordId, rules: ['vehicleConditions'], missing: []});
        continue;
      }
      if (target.status & 128) continue;
      const {selector} = condition;
      if (condition.operation === 'clear') {
        if (!(target.status & (128 >>> selector))) continue;
        target.status &= ~(128 >>> selector);
        append({kind: 'condition', round, actor: actor.id, targets: [target.id],
          event: `${target.label} · 状态恢复`, messageRecordId: `record:0A:${String(selector === 5 ? 50 : 51).padStart(3, '0')}`,
          rules: ['conditions'], missing: []});
        continue;
      }
      if (target.status & (selector === 5 ? 2 : 4)) continue;
      target.status |= 128 >>> selector;
      target.conditionTurns = {...target.conditionTurns, [selector]: 3};
      append({kind: 'condition', round, actor: actor.id, targets: [target.id],
        event: `${target.label} · ${selector === 5 ? '火焰' : '冷气'}`,
        messageRecordId: `record:0A:${String(34 + selector).padStart(3, '0')}`,
        rules: ['conditions'], missing: []});
    }
  };
  const applyDamage = (result, target) => {
    const damage = settleBattleDamage(target, result.amount, rng, result.riding);
    if (damage.missing?.length) {
      for (const gap of damage.missing) resultMissing.add(gap);
      append({kind: 'result', round, targets: [target.id], event: `${target.label} · 结果未结算`,
        rules: ['vehicle'], missing: damage.missing});
      return null;
    }
    Object.assign(target, structuredClone(damage.after), {status: damage.status});
    if (target.vehicle?.equipmentState && target.vehicle.parts)
      target.vehicle.parts.forEach((part, index) => {target.vehicle.equipmentState[index] = part.state;});
    return damage;
  };
  const appendPartDamage = (damage, actor, target) => {
    if (!damage.partDamage) return;
    const part = damage.partDamage;
    append({kind: 'condition', round, actor: actor.id, targets: [target.id], targetLabel: target.label,
      event: `${target.label} · 部件${part.after & 128 ? '破坏' : '损坏'}`,
      partDamage: part, messageRecordId: part.messageRecordId, rules: ['vehicle'], missing: []});
    if (part.index === 5 && (part.after & 128)) append({kind: 'condition', round,
      actor: target.id, targets: [target.id], event: `${target.label} · 下车`,
      messageRecordId: 'record:0A:033', rules: ['vehicle'], missing: []});
  };
  let cachedPartyTarget = input.encounter?.cachedPartyTarget ?? null;
  const targetList = (actor, selection) => {
    const targets = alive(actor.side === "party" ? "enemy" : "party");
    if (!targets.length) return [];
    if (selection?.all) return targets;
    if (actor.side === "enemy") {
      const guarded = targets.find(row => row.roleId === protector);
      if (guarded) return [guarded];
      const fixed = targets.find(row => row.id === input.fixedPartyTarget);
      if (fixed) return [fixed];
      const cached = targets.find(row => row.id === cachedPartyTarget);
      if ((actor.targetingFlags & 16) && cached) return [cached];
      const target = [...targets].reverse()[rng.below(targets.length)];
      if (actor.targetingFlags & 16) cachedPartyTarget = target.id;
      return [target];
    }
    if (actor.targetScope === 'all') return targets;
    const selectedGroup = commandRound || round === 1 ? actor.selectedGroup : null;
    const groupTargets = Number.isInteger(selectedGroup) ? targets.filter(row => row.groupIndex === selectedGroup) : targets;
    if (!groupTargets.length) return [];
    if (actor.targetScope === 'group') {
      const target = groupTargets[rng.below(groupTargets.length)];
      const group = input.enemies.find(row => row.id === target.id)?.groupIndex;
      return targets.filter(row => input.enemies.find(enemy => enemy.id === row.id)?.groupIndex === group);
    }
    return [groupTargets[rng.below(groupTargets.length)]];
  };
  const commonMissing = [...new Set([...actors.flatMap(actor => actor.missing || []),
    BATTLE_SIMULATION_RULES.timing.label])];
  if (!roundOffset) append({kind: "entry", round: 0, event: "战斗入场", rules: [input.story ? 'npc' : 'partyCurrent', "selection"], missing: commonMissing,
    messageRecordId: message("entry")});
  let round = roundOffset;
  while (alive("party").length && alive("enemy").length && round < roundOffset + (commandRound ? Math.min(1, maxRounds) : maxRounds)) {
    round++;
    const queue = [...alive("party"), ...alive("enemy").reverse()].filter(actor => !(actor.status & 0xE0)).map(actor => {
      const score = Math.min(255, actor.speed + (rng.next() & 63));
      return {actor, score, selection: actor.side === "enemy" ? selectBattleEnemyAction(actor,
        {...input, party: actors.filter(row => row.side === 'party')}, rng) : null};
    }).sort((a, b) => b.score - a.score);
    append({kind: "turn", round, event: `第 ${round} 回合`,
      queue: queue.map(({actor, score}) => ({actor: actor.id, label: actor.label, score})),
      rules: ["random", "initiative", "selection"], missing: commonMissing});
    for (const target of alive('party')) {
      const conditions = [5, 6].filter(selector => target.status & (128 >>> selector))
        .map(selector => ({selector, handle: selector === 5 ? '5E' : '5F'}));
      if (target.riding) conditions.push(...[6, 7].filter(selector => target.vehicle?.condition & (128 >>> selector))
        .map(selector => ({selector, handle: selector === 6 ? '5B' : '5C'})));
      for (const {handle: id} of conditions) {
        const handle = `battle-result-script:${id}`;
        const result = calculateBattleResult(input.resultPrograms?.find(row => row.handle === handle),
          target, target, input, rng);
        for (const gap of result.missing || []) resultMissing.add(gap);
        if (!result.applies) {
          if (result.missing?.length) append({kind: 'result', round, actor: target.id, targets: [target.id], event: `${target.label} · 状态伤害未确认`,
            rules: ['conditions', 'route'], missing: result.missing});
          applyConditions(result, target, target);
          continue;
        }
        const damage = applyDamage(result, target);
        if (!damage) continue;
        append({kind: 'damage', round, actor: target.id, actorLabel: target.label, targets: [target.id],
          targetLabel: target.label, event: `${target.label} 损伤 ${damage.settled}`, amount: result.amount,
          settled: damage.settled, before: damage.before, after: damage.after,
          messageRecordId: message('party-damage'), promptRecordId: result.messages?.[0], presentation: 0,
          rules: ['conditions', 'route', 'hp'], missing: commonMissing});
        appendPartDamage(damage, target, target);
        if (damage.dead) {
          append({kind: 'death', round, actor: target.id, targets: [target.id], targetLabel: target.label,
            event: `${target.label} 死亡`, messageRecordId: message('party-death'),
            rules: ['conditions', 'hp'], missing: []});
          break;
        }
      }
    }
    for (const queued of queue) {
      if (!alive('party').length || !alive('enemy').length) break;
      const {actor} = queued;
      let selection = queued.selection;
      if (!alive(actor.side).includes(actor)) continue;
      if (actor.side === 'party') {
        const command = battleCommandEffects(actor, input, rng);
        if (command.handled && actor.vehicle?.parts) actor.vehicle.parts.forEach((part, index) => {
          part.state = actor.vehicle.equipmentState[index];
        });
        if (command.handled) {
          for (const gap of command.missing) resultMissing.add(gap);
          for (const event of command.events) append({kind: 'result', round, actor: actor.id, actorLabel: actor.label,
            targets: [actor.id], itemId: command.itemId, itemLabel: command.itemLabel, resultScriptHandle: command.resultScriptHandle,
            rules: ['commands'], missing: command.missing, ...event});
          if (!command.events.length) append({kind: 'result', round, actor: actor.id, actorLabel: actor.label,
            event: '行动结算未确认', targets: [actor.id], rules: ['commands'], missing: command.missing});
          continue;
        }
      }
      const count = actor.side === "enemy" ? battleEnemyActionCount(actor, rng) : 1;
      let selectedTargets = actor.side === "enemy" ? targetList(actor, selection) : [];
      for (let repetition = 0; repetition < count; repetition++) {
        if (!alive(actor.side).includes(actor)) break;
        if (actor.side === "enemy" && (actor.targetingFlags & 32)) {
          selection = selectBattleEnemyAction(actor, {...input, party: actors.filter(row => row.side === 'party')}, rng);
          selectedTargets = targetList(actor, selection);
        } else if (actor.side === "party") selectedTargets = targetList(actor, selection);
        selectedTargets = selectedTargets.filter(target => alive(target.side).includes(target));
        if (!selectedTargets.length) break;
        const action = selection?.action;
        const actionName = action ? `${action.handle} · ${action.name_hint}` : `武器 ${actor.weaponId?.toString(16).toUpperCase() || "未知"}`;
        const missing = [...commonMissing, ...(selection?.missing || [])];
        for (const gap of selection?.missing || []) resultMissing.add(gap);
        const attack = {side: actor.side, attacker: actor.slot,
          partyTarget: selectedTargets[0].slot, enemyTarget: selectedTargets[0].slot,
          source: actor.side === "enemy" ? actor.visualSources?.find(source =>
            source.slots?.includes(selection?.slot))?.key || actor.visualSources?.[0]?.key : actor.attackSource,
          channel: "melee", scope: selection?.all ? "all" : actor.targetScope || "single", selectionSlot: selection?.slot ?? 0};
        append({kind: "attack", round, event: `${actor.label} → ${selectedTargets.map(row => row.label).join("、")}`,
          actor: actor.id, actorLabel: actor.label, action: actionName,
          targets: selectedTargets.map(row => row.id), attack,
          actionHandle: action?.handle, actionPatternHandle: selection?.pattern,
          resultScriptHandle: action?.fields?.result_script?.value || actor.resultScriptHandle,
          repetition: repetition + 1, actionCount: count,
          attackVisualHandle: action?.fields?.visual_and_counter_initializer?.value,
          messageRecordId: action?.fields?.message?.value || message("action"),
          rules: ["selection", "route", input.story ? 'party' : 'partyCurrent', "repeat", "target"], missing});
        let actionEnded = false;
        let exitControl = 0;
        for (const selectedTarget of selectedTargets) {
          let target = selectedTarget;
          // PRG $02EAB5–$02EAC4：命中判定独立推进随机状态，即使阈值为零。
          const hit = actor.side !== "party" || rng.next() >= [0, 8, 64, 128, 200][target.hitClass ?? 0];
          const handle = action?.fields?.result_script?.value || actor.resultScriptHandle;
          const result = hit ? calculateBattleResult(input.resultPrograms?.find(row => row.handle === handle),
            actor, target, input, rng) : {amount: 0, applies: false, missing: []};
          for (const gap of result.missing || []) resultMissing.add(gap);
          if (result.enemyExit) {
            exitControl = (exitControl - 1) & 255;
            applyConditions(result, actor, target);
            continue;
          }
          const damageActor = result.collision?.reflected ? selectedTarget : actor;
          if (result.collision) {
            if (result.collision.reflected) target = actor;
            append({kind: 'attack', round, event: `${damageActor.label} → ${target.label}`,
              actor: damageActor.id, actorLabel: damageActor.label, targets: [target.id],
              action: actionName, actionHandle: action?.handle, resultScriptHandle: handle,
              additional: true, repetition: repetition + 1, actionCount: count,
              attackVisualHandle: result.collision.visualHandle,
              attack: {side: damageActor.side, attacker: damageActor.slot,
                partyTarget: selectedTarget.slot, enemyTarget: actor.slot,
                visualReference: result.collision.visualHandle,
                source: 'visual:0', channel: 'melee', scope: 'single', selectionSlot: 0},
              control: {resultComplete: 1, resultControl: result.collision.resultControlBeforeDamage,
                actionCountdown: count - repetition - 1},
              rules: ['collision', 'presentation'], missing});
          }
          if (result.replacement !== undefined) {
            const replacement = input.monsterActors?.find(row => row.monsterId === result.replacement);
            if (actor.side !== "enemy" || alive("enemy").length !== 1 || !replacement) {
              if (!replacement) resultMissing.add('占位：替换怪物当前值缺失');
              append({kind: "result", round, actor: actor.id, targets: [actor.id],
                event: "参战者替换失败", messageRecordId: message("replacement-failed"),
                rules: ["replacement"], missing: replacement ? [] : ["占位：替换怪物当前值缺失"]});
              continue;
            }
            actor.status = 255;
            append({kind: "withdrawal", round, actor: actor.id, actorLabel: actor.label,
              targets: [actor.id], event: `${actor.label} 弃车`,
              replacementMonsterId: replacement.monsterId,
              messageRecordId: action?.fields?.message?.value, presentation: 0,
              rules: ["replacement", "presentation"], missing});
            enemyEvents.push({type: "remove", slot: actor.slot});
            const occupied = new Set(alive("enemy").map(row => row.slot));
            let slot = 8;
            while (occupied.has(slot)) slot--;
            const nextActor = {...structuredClone(replacement), id: `enemy:${slot}`, slot, incarnation: ++incarnation};
            if (commandRound) resultMissing.add('未确认：增援后的敌群命令编组');
            for (const gap of nextActor.missing || []) resultMissing.add(gap);
            actors.splice(actors.indexOf(actor), 1, nextActor);
            enemyEvents.push({type: "join-new", monsterId: replacement.monsterId});
            append({kind: "enemy-entry", round, actor: nextActor.id, actorLabel: nextActor.label,
              targets: [nextActor.id], event: `${nextActor.label} 入场`,
              messageRecordId: action?.fields?.message?.value,
              presentation: 4, rules: ["replacement", "initialization", "presentation"], missing: nextActor.missing || []});
            break;
          }
          if (!result.applies) {
            append({kind: "result", round, event: hit ? `${target.label} · ${result.missing.length ? "结果未结算" : "无伤害"}` : `${target.label} · 未命中`,
              actor: actor.id, targets: [target.id], messageRecordId: hit ? null : message("miss"),
              rules: ["route"], missing: [...missing, ...result.missing]});
            applyConditions(result, actor, target);
            continue;
          }
          const {amount} = result;
          for (const messageRecordId of result.messages || []) append({kind: "message", round,
            event: `${target.label} · 结果消息`, actor: actor.id, targets: [target.id], messageRecordId,
            rules: ["route", "messages"], missing});
          const damage = applyDamage(result, target);
          if (!damage) continue;
          const {settled, before, after, dead} = damage;
          append({kind: "damage", round, event: `${target.label} 损伤 ${settled}`,
            actor: damageActor.id, actorLabel: damageActor.label, action: actionName, targets: [target.id],
            targetLabel: target.label, amount, settled, before, after,
            messageRecordId: target.side === "party" ? message("party-damage") : message("enemy-damage"),
            promptRecordId: action?.fields?.message?.value || message("action"),
            presentation: 0, rules: [result.collision ? 'collision' : 'random', "amount", "route", "hp", "messages", "presentation"], missing});
          appendPartDamage(damage, damageActor, target);
          if (dead) {
            if (target.side === "enemy") {
              enemyEvents.push({type: "remove", slot: target.slot});
              deaths.push({instance: `${target.id}:${target.incarnation}`, monsterId: target.monsterId,
                experience: target.experience, gold: target.gold});
            }
            append({kind: "death", round, event: `${target.label} 死亡`, actor: target.id,
            targetLabel: target.label, messageRecordId: target.side === "party" ? message("party-death") : message("enemy-death"),
            presentation: target.side === "enemy" ? 1 : 0,
            rules: ["hp", input.story ? "end" : "encounter", "presentation"],
            missing: input.story ? [BATTLE_SIMULATION_RULES.end.label] : []});
          }
          applyConditions(result, actor, target);
          if (result.collision) {
            actionEnded ||= dead;
            append({kind: 'result', round, event: '碰撞结算完成', actor: actor.id, targets: [target.id],
              control: {resultComplete: 1, resultControl: 1, actionCountdown: dead ? 0 : count - repetition - 1},
              rules: ['collision'], missing});
          }
        }
        if (exitControl) {
          // PRG $02F124–$02F138：目标列表完成后才消费控制字并移除行动方。
          actor.status = 255;
          actor.hp = 0;
          enemyEvents.push({type: 'remove', slot: actor.slot});
          append({kind: 'withdrawal', round, actor: actor.id, actorLabel: actor.label,
            targets: [actor.id], event: `${actor.label} 离场`,
            messageRecordId: action?.fields?.message?.value, presentation: 3,
            exitControl: {before: 0, pending: exitControl, after: 0},
            rules: ['exit', 'encounter', 'presentation'], missing});
          break;
        }
        if (actionEnded) break;
      }
    }
    if (!alive('party').length || !alive('enemy').length) break;
    for (const actor of alive('party')) {
      if (actor.riding) {
        for (const selector of [6, 7]) {
          const handle = battleVehicleConditionRound(actor, selector);
          if (!handle) continue;
          const result = calculateBattleResult(input.resultPrograms?.find(row => row.handle === handle),
            actor, actor, input, rng, 0, {conditionSelector: selector});
          for (const gap of result.missing || []) resultMissing.add(gap);
          applyConditions(result, actor, actor);
        }
      }
      for (const selector of [5, 6]) {
        const mask = 128 >>> selector;
        if (!(actor.status & mask) || !Number.isInteger(actor.conditionTurns?.[selector])) continue;
        const count = actor.conditionTurns[selector];
        actor.conditionTurns[selector] = Math.max(0, count - 1);
        if (count > 1) continue;
        const handle = `battle-result-script:${count === 1 ? 'B8' : 'B6'}`;
        const result = calculateBattleResult(input.resultPrograms?.find(row => row.handle === handle),
          actor, actor, input, rng, 0, {conditionSelector: selector});
        for (const gap of result.missing || []) resultMissing.add(gap);
        applyConditions(result, actor, actor);
      }
    }
  }
  const outcome = !alive("party").length ? "敌方胜利" : !alive("enemy").length ? "友方胜利"
    : commandRound ? "回合结束" : "回合上限，未分胜负";
  const rewardTotals = battleResultRewardTotals(deaths);
  const roundBoundary = commandRound && alive('party').length > 0 && alive('enemy').length > 0;
  const completion = battleEncounterResult(input, actors, rewardTotals,
    [...(roundBoundary ? [] : commonMissing), ...resultMissing],
    {round: commandRound, enemyEvents, deaths, random: rng.snapshot(), dropRoll: input.encounter?.dropRoll});
  append({kind: "end", round, event: completion.outcome === 'round' ? '回合结束 · 返回命令选择'
    : `战斗结束 · ${outcome}（含占位规则）`, outcome,
    rules: [input.story ? "end" : "encounter"], missing: input.story ? [BATTLE_SIMULATION_RULES.end.label] : completion.missing});
  const continuation = {actors: snapshot(), enemyEvents: structuredClone(enemyEvents),
    deaths: structuredClone(deaths), randomState: rng.snapshot(), cachedPartyTarget};
  if (!alive("party").length && input.story?.kind === "redwolf") {
    const restored = input.story.restoreParty;
    for (const saved of restored || []) {
      const actor = actors.find(row => row.id === saved.id);
      if (actor) Object.assign(actor, saved, {inputSources: saved.sources});
    }
    append({kind: "story-return", round,
      event: "剧情返回 · 事件 $82", eventFlag: input.story.returnEvent,
      restoreParty: restored || true, rules: ["end"],
      missing: restored ? [] : ["占位：玩家存档恢复值未接入"]});
  }
  return {seed, steps, outcome, rewardTotals, completion, continuation, rules: BATTLE_SIMULATION_RULES};
}

// @editor-module 战斗演算命令窗与当前队员状态窗。

/** 本次播放投影中相同的状态值复用已准备的窗口。 */
async function prepareBattleSimulationStatus(project) {
  const windows = new Map();
  return async (actors, encounter) => {
    const actor = actors.find(row => row.side === "party");
    const label = actor.maxShield > 0 ? "SI" : "HP";
    const value = actor.maxShield > 0 ? actor.shield : actor.hp;
    const secondary = actor.riding && Number.isInteger(actor.vehicle?.sp) ? {label: 'SP', value: actor.vehicle.sp} : null;
    const key = encounter ? `command:${actor.label}` : `${label}:${value}:${secondary?.value ?? ''}`;
    if (!windows.has(key)) windows.set(key, (encounter
      ? prepareUiBattleCommandWindow(actor.label, project)
      : prepareUiBattleStatusSlot({label, value, secondary}, project)).then(window =>
      canvas => canvas.getContext("2d").drawImage(window.surface,
        window.rectangle.x, window.rectangle.y)));
    return windows.get(key);
  };
}

// @editor-module 将有来源的战斗时间线投影到共享战斗场景，不推算未记录的行动。


/** 时间线的 step 是一次可观察状态；event 只描述该步，不暗示两步之间没有事件。 */
function battleSequenceStep(timeline, index, project) {
  if (!timeline || !Array.isArray(timeline.steps) || !timeline.steps.length) {
    throw new TypeError("战斗时间线缺少步骤");
  }
  if (!Number.isInteger(index) || index < 0 || index >= timeline.steps.length) {
    throw new RangeError("战斗时间线步骤越界");
  }
  const step = timeline.steps[index];
  const preview = timeline.preview || battleScenePreviewForFormation(project, timeline.formationId);
  const events = timeline.steps.slice(0, index + 1).flatMap(item => item.enemyEvents || []);
  const party = preview.party.map((member, slot) => ({
    ...member,
    ...(step.party?.[slot] || {}),
  }));
  const projected = normalizeBattleScenePreview({
    ...preview,
    party,
    enemyGroups: (step.enemyGroups || timeline.enemyGroups)?.map((group, slot) => ({
      ...preview.enemyGroups[slot], ...group,
    })) || preview.enemyGroups,
    enemyEvents: events,
    attack: {...preview.attack, ...(step.attack || {})},
    guides: false,
  }, project);
  return {step, preview: projected};
}

// @editor-module 通用战斗时间线的播放、暂停、单步及证据展示。


function battleSequenceReplayMarkup({split = false} = {}) {
  if (split) return `<section class="battle-sequence-replay battle-sequence-replay--split" data-battle-sequence-replay>
    <div class="battle-sequence-replay-visual" role="region" aria-label="战斗回放画面">
      <h3 data-battle-sequence-title>战斗回放</h3>
      <canvas width="256" height="240" data-battle-sequence-canvas aria-label="战斗时间线画面"></canvas>
      <p data-battle-sequence-exit hidden>战斗画面已结束；场景画面尚未接入回放。</p>
      <div class="battle-sequence-replay-controls">
        <button type="button" data-battle-sequence-play>播放</button>
        <button type="button" data-battle-sequence-step>下一步</button>
        <label>跳到步骤 <select data-battle-sequence-jump></select></label>
      </div>
    </div>
    <section class="battle-sequence-replay-detail" aria-label="战斗回放步骤说明">
      <p data-battle-sequence-event></p>
      <dl data-battle-sequence-facts></dl>
      <p class="battle-sequence-replay-missing" data-battle-sequence-missing></p>
    </section>
  </section>`;
  return `<section class="battle-sequence-replay" data-battle-sequence-replay>
    <h3 data-battle-sequence-title>战斗回放</h3>
    <div class="battle-sequence-replay-body">
      <canvas width="256" height="240" data-battle-sequence-canvas aria-label="战斗时间线画面"></canvas>
      <p data-battle-sequence-exit hidden>战斗画面已结束；场景画面尚未接入回放。</p>
      <div class="battle-sequence-replay-detail">
        <div class="battle-sequence-replay-controls">
          <button type="button" data-battle-sequence-play>播放</button>
          <button type="button" data-battle-sequence-step>下一步</button>
          <label>跳到步骤 <select data-battle-sequence-jump></select></label>
        </div>
        <p data-battle-sequence-event></p>
        <dl data-battle-sequence-facts></dl>
        <p class="battle-sequence-replay-missing" data-battle-sequence-missing></p>
      </div>
    </div>
  </section>`;
}

/** timeline={id,title,formationId,bgm,romBasis,steps:[{frame,event,messageRecordId,statusWindow,evidence,missing,enemyEvents,party,attack}]} */
function bindBattleSequenceReplay(root, {timeline, project}) {
  if (!root || root.dataset.battleSequenceBound) return;
  const canvas = root.querySelector("[data-battle-sequence-canvas]");
  const jump = root.querySelector("[data-battle-sequence-jump]");
  const play = root.querySelector("[data-battle-sequence-play]");
  let index = 0;
  let timer = null;
  let generation = 0;
  let playing = false;
  let playbackId = 0;
  let paintPromise = Promise.resolve();
  const stop = () => {
    playing = false;
    playbackId += 1;
    if (timer !== null) clearTimeout(timer);
    timer = null;
    play.textContent = "播放";
  };
  const show = async next => {
    index = Math.max(0, Math.min(timeline.steps.length - 1, next));
    const token = ++generation;
    const {step, preview} = battleSequenceStep(timeline, index, project);
    jump.value = String(index);
    root.dataset.battleSequenceStep = String(index);
    root.dataset.battleSequenceFrame = String(step.frame);
    root.dataset.battleSequencePainted = "pending";
    root.querySelector("[data-battle-sequence-event]").textContent =
      `步骤 ${index + 1}/${timeline.steps.length} · Mesen 第 ${step.frame} 帧 · ${step.event}`;
    root.querySelector("[data-battle-sequence-facts]").innerHTML = [
      ["Mesen 消息", step.message || ""],
      ["Mesen 数值", step.hp || ""],
      ["消息记录", step.messageRecordId || ""],
      ["行动模式", step.actionPatternHandle || ""],
      ["敌方行动", step.actionHandle || ""],
      ["结果脚本", step.resultScriptHandle || ""],
      ["攻击视觉", step.attackVisualHandle || ""],
      ["状态窗", step.statusWindow
        ? `${step.statusWindow.label} ${step.statusWindow.value}（Mesen 观察值）` : ""],
      ["BGM", step.bgm ?? timeline.bgm ?? ""],
      ["ROM 依据", step.romBasis ?? timeline.romBasis ?? ""],
      ["帧依据", step.evidence || ""],
    ].map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("");
    const missing = [...(step.missing || [])];
    const missingHost = root.querySelector("[data-battle-sequence-missing]");
    missingHost.textContent = missing.length ? "画面尚缺解码。" : "";
    missingHost.title = missing.join("；");
    const ended = step.phase === "exit";
    canvas.hidden = ended;
    root.querySelector("[data-battle-sequence-exit]").hidden = !ended;
    if (ended) {
      root.dataset.battleSequencePainted = "false";
      return;
    }
    delete canvas.dataset.battleSceneComposerPainted;
    let messageAction = null;
    if (step.actionHandle && step.messageRecordId) {
      const actions = await db.getDocument("enemy-action", null);
      messageAction = actions?.records?.find(item => item.handle === step.actionHandle
        && item.fields?.message?.reference === step.messageRecordId) || null;
    }
    if (token !== generation || !root.isConnected) return;
    const painted = await paintBattleSceneComposerCanvas(canvas, {project, preview,
      messageAction, messageRecordId: step.messageRecordId ?? null,
      messageWindowState: step.messageWindowState || null,
      messageRuntime: step.messageRuntime || null,
      statusWindow: step.statusWindow || null,
      messageSequence: step.messageSequence || null});
    if (token !== generation || !root.isConnected) return;
    const visual = Number.isInteger(step.attackFrameIndex)
      ? paintBattleSceneComposerFrame(canvas, step.attackFrameIndex) : null;
    const note = canvas.dataset.battleSceneComposerError
      || (step.messageRecordId ? canvas.dataset.battleSceneWindowNote : "");
    if (note) missingHost.textContent = `画面尚缺解码：${[...missing, note].join("；")}`;
    if (visual === false) missingHost.textContent =
      `画面尚缺解码：${[...missing, "本次攻击剪辑帧不可用"].join("；")}`;
    root.dataset.battleSequencePainted = String(painted && visual !== false);
  };
  const display = next => {
    paintPromise = show(next).catch(error => {
      editorLog.error("字段编辑", `操作失败：${error?.message || error}`, error);
      root.dataset.battleSequencePainted = "false";
      root.querySelector("[data-battle-sequence-missing]").textContent =
        `画面尚缺解码：${error.message}`;
    });
    return paintPromise;
  };
  root.querySelector("[data-battle-sequence-title]").textContent = timeline.title;
  jump.innerHTML = timeline.steps.map((step, i) =>
    `<option value="${i}">${i + 1} · ${esc(step.event)} · ${step.frame}</option>`).join("");
  const queueNext = id => {
    const pending = paintPromise;
    void pending.then(() => {
      if (id !== playbackId) return;
      if (!playing || !root.isConnected || root.dataset.battleSequencePainted === "false") {
        stop(); return;
      }
      if (index === timeline.steps.length - 1) {stop(); return;}
      timer = setTimeout(() => {
        timer = null;
        if (id !== playbackId) return;
        if (!playing || !root.isConnected) {stop(); return;}
        void display(index + 1);
        queueNext(id);
      }, 1200);
    });
  };
  play.addEventListener("click", () => {
    if (playing) {stop(); return;}
    playing = true;
    const id = ++playbackId;
    play.textContent = "暂停";
    if (index === timeline.steps.length - 1) {
      void display(0);
    }
    queueNext(id);
  });
  root.querySelector("button[data-battle-sequence-step]").addEventListener("click", () => {
    stop(); void display(index + 1);
  });
  jump.addEventListener("change", () => {stop(); void display(Number(jump.value));});
  root.dataset.battleSequenceBound = "1";
  void display(0);
}

// @editor-module 电磁波调用在消息等待后续接本次随机状态。

const BATTLE_ELECTROMAGNETIC_EVIDENCE = 'project/evidence/reverse-engineering/enemy-electromagnetic-call/observations.json';
const BATTLE_ELECTROMAGNETIC_CONDITION = {state: 'battle-messages.condition', slot: 'slot:message:0',
  retain_previous: true, retain_phase_indices: [0],
  text_record_ref: {resource_id: 'text-record', node_id: 'record:0A:034'}};
const byte$1 = value => Number.isInteger(value) && value >= 0 && value <= 255;
const boundary = missing => [{kind: 'boundary', missing}];
const continuation = [
  {scope: 'enemy-action', returnAddress: 0xA624},
  {scope: 'target-loop', returnAddress: 0xA6DB},
  {scope: 'result-script', returnAddress: 0xB114},
];
const effect = (id, value = {}) => ({kind: 'effect', id: `enemy-0f-${id}`, confirmed: true,
  evidence: BATTLE_ELECTROMAGNETIC_EVIDENCE, ...value});
const message = phase => ({kind: 'message', phase, evidence: BATTLE_ELECTROMAGNETIC_EVIDENCE});
const returned = call => ({kind: 'return', evidence: BATTLE_ELECTROMAGNETIC_EVIDENCE,
  unwind: continuation.length, value: {scope: 'enemy-action', confirmed: true,
    actor: call.actor, enemyAction: 'enemy-action:35', resultScript: 'battle-result-script:0F',
    target: call.targets[0]}});

function battleElectromagneticOperations({path, callState, actor, role, prefix, resultScripts} = {}) {
  const expected = {0x10: [0xFE, 2, 0, 0x12], 0x12: [0xF9, 0], 0: [255]};
  const matches = Object.entries(expected).every(([id, bytes]) => {
    const record = resultScripts?.find(row => row.id === Number(id));
    return record?.raw_bytes?.length === bytes.length && record.raw_bytes.every((value, index) => value === bytes[index]);
  });
  const base = actor?.attack - Math.floor(role?.defense / 2);
  const maximum = Math.max(3, base + Math.floor(base * 50 / 256));
  const profile = callState?.randomAmounts?.find(row => row.profile_index === 10);
  if (!matches || callState.party?.length !== 1 || callState.targets?.length !== 1
      || role.present & 128 || role.riding !== false || role.status !== 0
      || role.resultConditionStates?.[2] !== 0
      || !byte$1(role.slotFlags) || !Array.isArray(role.equipment) || role.equipment.length !== 8
      || !role.equipment.every(byte$1)
      || role.equipment.some((id, slot) => id >= 0x18 && id <= 0x1C && (role.slotFlags & (0x80 >> slot)))
      || !byte$1(actor.attack) || !byte$1(role.defense) || !byte$1(actor.attackSkill)
      || actor.attackSkill !== role.defenseSkill || maximum >= 16
      || !byte$1(callState.randomLow) || !byte$1(callState.randomHigh) || !byte$1(callState.damageThreshold)
      || !byte$1(profile?.minimum) || !byte$1(profile.exclusive_random_span))
    return boundary('电磁波缺少单目标徒步零量、当前装备、随机参数或匹配的后继记录');
  const call = structuredClone(callState);
  call.electromagnetic = {stage: 'action', profile: structuredClone(profile),
    hpField: `${prefix}current_hp`, statusField: `${prefix}status`, presentField: `${prefix}present`,
    resultPhase: structuredClone(path.phases[1])};
  call.random = {high: call.randomHigh, low: call.randomLow, calls: 0};
  call.randomStages = [];
  return [effect('bind', {callState: call}), message(path.phases[0]), effect('damage'),
    message(path.phases[1]), effect('condition')];
}

function randomFor(call) {
  const previous = call.random;
  const random = globalRandom((previous.high << 8) | previous.low);
  return {random, save() {call.random = {...random.snapshot(), calls: previous.calls + random.snapshot().calls};}};
}

// D01D 在等待中反复调用 D02E；浏览器按每个等待帧一次粗略推进。
function advanceBattleElectromagneticTime(domainResults, frames) {
  const call = domainResults.enemyCall;
  if (!['result', 'condition'].includes(call?.electromagnetic?.stage) || !frames) return domainResults;
  const {random, save} = randomFor(call);
  for (let index = 0; index < frames; index++) random.next();
  save();
  return domainResults;
}

function applyBattleElectromagneticEffect(fields, operation, context, domainResults) {
  const call = structuredClone(operation.id === 'enemy-0f-bind' ? operation.callState : domainResults.enemyCall);
  const target = call?.targets?.[0], role = call?.party?.find(row => row.slot === target);
  const binding = call?.electromagnetic;
  if (!binding || !role || fields[binding.hpField] !== role.hp || fields[binding.statusField] !== role.status
      || fields[binding.presentField] !== role.present)
    return {status: 'unavailable', reason: '电磁波的当前队员与调用字段不一致'};
  const result = {status: 'available', fields, domainResults: {enemyCall: call}};
  if (operation.id === 'enemy-0f-bind') {
    result.returnStack = structuredClone(continuation.slice(0, 1));
    return result;
  }
  const {random, save} = randomFor(call);
  const capture = stage => call.randomStages.push({stage, ...structuredClone(call.random)});
  if (operation.id === 'enemy-0f-damage' && binding.stage === 'action') {
    capture('D5');
    const count = (binding.profile.minimum + random.below(binding.profile.exclusive_random_span)) & 255;
    random.next();
    save(); capture('C0');
    const dodge = random.next() < call.damageThreshold;
    save();
    if (dodge) return {status: 'unavailable', reason: '本次 C0 回避正文与已发布电磁波路径不匹配'};
    call.messageQuantity = 0;
    call.repeatCount = count || 256;
    call.messagePartyTargets = [null, target];
    result.returnStack = structuredClone(continuation);
    binding.stage = 'result';
    // 正文绘制的随机调用只作一次粗略推进，不复用 FE 的入口状态。
    random.next(); save();
  } else if (operation.id === 'enemy-0f-condition' && binding.stage === 'result') {
    capture('FE 02');
    const branch = battleResultStateBranch({kind: 'state-branch', selector: 2, operands: [0, 0x12]},
      {readState: selector => role.resultConditionStates[selector], random});
    save();
    if (branch.missing.length) return {status: 'unavailable', reason: branch.missing[0]};
    call.conditionResult = branch.handle;
    if (branch.handle === 'battle-result-script:00') {
      binding.stage = 'returned';
      result.operations = [returned(call)];
    } else {
      role.status |= 128;
      role.conditionTurns = {...role.conditionTurns, 0: 255};
      fields[binding.statusField] = role.status;
      call.messagePartyTargets.push(target);
      binding.stage = 'condition';
      random.next(); save();
      result.operations = [message({...binding.resultPhase, ...BATTLE_ELECTROMAGNETIC_CONDITION}), effect('finalize')];
    }
  } else if (operation.id === 'enemy-0f-finalize' && binding.stage === 'condition' && role.status === 128) {
    role.status = 255;
    fields[binding.statusField] = role.status;
    call.ended = true;
    binding.stage = 'returned';
    result.operations = [returned(call)];
  } else return {status: 'unavailable', reason: '电磁波的执行阶段与调用续接不一致'};
  return result;
}

// @editor-module 敌方行动调用只修改本次战斗的隔离现场。

const BATTLE_ENEMY_MESSAGE_EVIDENCE = 'project/evidence/reverse-engineering/damage-enemy-message-calls/observations.json';
const BATTLE_ENEMY_ACCURACY_EVIDENCE = 'project/evidence/reverse-engineering/enemy-group-accuracy-call/observations.json';
const BATTLE_ENEMY_POISON_EVIDENCE = 'project/evidence/reverse-engineering/enemy-poison-message-call/observations.json';
const BATTLE_ENEMY_DODGE_EVIDENCE = 'project/evidence/reverse-engineering/enemy-acid-dodge-call/observations.json';
const BATTLE_ENEMY_PANIC_EVIDENCE = 'project/evidence/reverse-engineering/enemy-panic-wave-call/observations.json';
const BATTLE_ENEMY_SLEEP_EVIDENCE = 'project/evidence/reverse-engineering/enemy-sleep-wave-call/observations.json';
const BATTLE_ENEMY_LONG_WAVE_EVIDENCE = 'project/evidence/reverse-engineering/enemy-long-wave-call/observations.json';
const BATTLE_ENEMY_ZERO_DAMAGE_EVIDENCE = 'project/evidence/reverse-engineering/enemy-zero-damage-calls/observations.json';
const BATTLE_ENEMY_THERMAL_EVIDENCE = 'project/evidence/reverse-engineering/enemy-thermal-calls/observations.json';
const calls = {
  'enemy-action:38': {script: 'battle-result-script:20', bytes: [0xD5, 20, 0xC0, 0xFC, 0, 0x21],
    states: ['action', 'poison-bomb-no-effect'], texts: [142, 9], effect: 'enemy-party-no-damage',
    successors: {0: [255]}, evidence: BATTLE_ENEMY_ZERO_DAMAGE_EVIDENCE},
  'enemy-action:3A': {script: 'battle-result-script:26', bytes: [0xD5, 20, 0xC0, 0xFC, 0, 0x27],
    states: ['action', 'failure'], texts: [144, 9], effect: 'enemy-party-no-damage',
    successors: {0: [255]}, evidence: BATTLE_ENEMY_ZERO_DAMAGE_EVIDENCE},
  'enemy-action:34': {script: 'battle-result-script:05', bytes: [0xFC, 6, 7],
    states: ['action', 'shock-wave-no-effect'], texts: [136, 9], effect: 'enemy-party-no-damage',
    successors: {6: [0xFD, 4, 0x4F, 3], 0x4F: [0xD5, 24, 0xE2]}, zeroThreshold: 4,
    evidence: BATTLE_ENEMY_ZERO_DAMAGE_EVIDENCE},
  'enemy-action:2E': {script: 'battle-result-script:1C', bytes: [0xD4, 22, 0xFC, 0x1D, 0x1E],
    states: ['action', 'cold-damage', 'condition'], texts: [130, 8, 40], effect: 'enemy-party-thermal',
    successors: {0x1D: [0xC9, 1, 0xC0, 0xF9, 6]}, selector: 6, mask: 2,
    evidence: BATTLE_ENEMY_THERMAL_EVIDENCE},
  'enemy-action:3B': {script: 'battle-result-script:37', bytes: [0xD4, 22, 0xFC, 0x38, 0x39],
    states: ['action', 'fire-damage', 'condition'], texts: [145, 8, 39], effect: 'enemy-party-thermal',
    successors: {0x38: [0xC9, 1, 0xC0, 0xF9, 5]}, selector: 5, mask: 4,
    evidence: BATTLE_ENEMY_THERMAL_EVIDENCE},
  'enemy-action:35': {script: 'battle-result-script:0F', bytes: [0xD5, 20, 0xC0, 0xFC, 0x10, 0x11],
    states: ['action', 'electromagnetic-no-effect'], texts: [138, 9], effect: 'enemy-party-electromagnetic',
    conditionalPhases: [BATTLE_ELECTROMAGNETIC_CONDITION],
    evidence: BATTLE_ELECTROMAGNETIC_EVIDENCE},
  'enemy-action:2D': {script: 'battle-result-script:14', bytes: [0xFC, 0x16, 0x19],
    states: ['action', 'condition'], texts: [129, 35], effect: 'enemy-party-sleep',
    condition: {selector: 4, successor: 0x16, bytes: [0xFE, 4, 0x18, 0x1A], result: 0x1A, mask: 64, counter: 0},
    evidence: BATTLE_ENEMY_SLEEP_EVIDENCE},
  'enemy-action:32': {script: 'battle-result-script:63', bytes: [0xFC, 0x64, 0x19],
    states: ['action', 'condition'], texts: [134, 34], effect: 'enemy-party-long-wave',
    condition: {selector: 0, successor: 0x64, bytes: [0xFE, 0, 0x19, 0x12], result: 0x12, mask: 128, counter: 255},
    evidence: BATTLE_ENEMY_LONG_WAVE_EVIDENCE},
  'enemy-action:31': {script: 'battle-result-script:0E', bytes: [0xD7, 0xFE, 0, 0x19, 0x56],
    states: ['action', 'panic-wave-result'], texts: [133, 37], effect: 'enemy-party-panic',
    condition: {selector: 0, result: 0x56, mask: 16, counter: 0},
    evidence: BATTLE_ENEMY_PANIC_EVIDENCE},
  'enemy-action:2F': {script: 'battle-result-script:3A', bytes: [0xFD, 2, 0x3B, 0x3C],
    states: ['action', 'acid-dodge'], texts: [131, 10], effect: 'enemy-party-dodge',
    evidence: BATTLE_ENEMY_DODGE_EVIDENCE},
  'enemy-action:2C': {script: 'battle-result-script:1F', bytes: [0xF9, 7],
    states: ['action', 'poison-gas-result'], texts: [127, 41], effect: 'enemy-party-poison',
    evidence: BATTLE_ENEMY_POISON_EVIDENCE},
  'enemy-action:33': {script: 'battle-result-script:41', bytes: [0xF0],
    states: ['action', 'detection-wave-accuracy-first', 'detection-wave-accuracy-second'],
    texts: [135, 70, 70], effect: 'enemy-group-accuracy', evidence: BATTLE_ENEMY_ACCURACY_EVIDENCE},
  'enemy-action:42': {script: 'battle-result-script:72', bytes: [0xC6, 0xBD, 0xE5],
    states: ['action', 'item-effect'], texts: [152, 73], effect: 'enemy-full-heal'},
  'enemy-action:3F': {script: 'battle-result-script:74', bytes: [0xC8, 0xEE],
    states: ['underground'], texts: [149], effect: 'enemy-underground'},
};
const byte = value => Number.isInteger(value) && value >= 0 && value <= 255;
const word = value => Number.isInteger(value) && value >= 0 && value <= 65535;

function validCallState(state) {
  if (!Array.isArray(state?.instances) || state.instances.length !== 9
      || !Array.isArray(state.groups) || state.groups.length !== 4
      || !Number.isInteger(state.actor) || state.actor < 0 || state.actor >= 9) return false;
  return state.instances.every((instance, slot) => !instance || instance.slot === slot
    && instance.present === true && instance.targetable === true && instance.status === 0
    && byte(instance.monster_id) && Number.isInteger(instance.group) && instance.group >= 0 && instance.group < 4
    && word(instance.hp) && word(instance.maxHp) && instance.hp <= instance.maxHp && byte(instance.shield)
    && instance.hp + instance.shield > 0
    && state.groups[instance.group]?.monster_id === instance.monster_id
    && instance.population_snapshot === state.groups[instance.group].population_snapshot)
    && state.groups.every((group, index) => !group
      ? !state.instances.some(instance => instance?.group === index)
      : group.population === state.instances.filter(instance => instance?.group === index).length
        && group.population > 0 && Number.isInteger(group.population_snapshot)
        && group.population_snapshot >= group.population && group.population_snapshot <= 9);
}

function battleEnemyMessageCallContract(action, script, phases, record) {
  const call = calls[action];
  if (!call || script !== call.script || phases?.length !== call.texts.length
      || phases.some((phase, index) => phase.state !== `battle-messages.${call.states[index]}`
        || phase.slot !== 'slot:message:0' || phase.retain_previous !== (index > 0)
        || phase.text_record_ref?.resource_id !== 'text-record'
        || phase.text_record_ref.node_id !== `record:0A:${String(call.texts[index]).padStart(3, '0')}`)) return null;
  if (record !== undefined && (record?.handle !== script || record.raw_bytes?.length !== call.bytes.length
      || record.raw_bytes.some((value, index) => value !== call.bytes[index]))) return null;
  return structuredClone(call);
}

// 初始化命名序号按敌群内的装载顺序分配；绑定后保留命名数量快照。
function battleEnemyMessageInitialState(input, {seed = 0, allTargets = false, pendingDirections = 0,
  sonicResistanceItem, damageThreshold} = {}) {
  if (!Array.isArray(input?.enemies) || !Array.isArray(input?.party) || !byte(pendingDirections)
      || input.party.some(role => role.resultConditionStates != null || role.conditionTurns != null)) return null;
  const random = globalRandom(seed), groups = Array.from({length: 4}, () => null);
  const instances = Array(9).fill(null);
  for (const enemy of [...input.enemies].sort((a, b) => a.slot - b.slot)) {
    if (!Number.isInteger(enemy.slot) || enemy.slot < 0 || enemy.slot >= 9 || instances[enemy.slot]
        || !Number.isInteger(enemy.groupIndex) || enemy.groupIndex < 0 || enemy.groupIndex >= 4
        || !byte(enemy.monsterId) || !word(enemy.hp) || !word(enemy.maxHp) || enemy.hp > enemy.maxHp
        || !byte(enemy.shield) || !byte(enemy.status) || enemy.status !== 0
        || (enemy.repeatCode ?? 0) !== 0 || enemy.linkedSlots?.length) return null;
    const group = groups[enemy.groupIndex] ||= {monster_id: enemy.monsterId, population: 0};
    if (group.monster_id !== enemy.monsterId) return null;
    group.population++;
    instances[enemy.slot] = {slot: enemy.slot, group: enemy.groupIndex, monster_id: enemy.monsterId,
      present: true, targetable: true, hp: enemy.hp, maxHp: enemy.maxHp, shield: enemy.shield,
      status: enemy.status, attack: enemy.attack, attackSkill: enemy.attackSkill,
      suffix_source: battleInstanceSuffixSource(group.population)};
  }
  for (const group of groups.filter(Boolean)) group.population_snapshot = group.population;
  for (const instance of instances.filter(Boolean)) instance.population_snapshot = groups[instance.group].population_snapshot;
  const available = input.party.filter(role => role.present && role.status !== 255).map(role => role.slot).sort((a, b) => a - b);
  if (!available.length || new Set(available).size !== available.length
      || available.some(role => !Number.isInteger(role) || role < 0 || role > 2)) return null;
  const targets = allTargets ? available : [available.toReversed()[random.below(available.length)]];
  const actor = instances.findLast(instance => instance?.targetable)?.slot;
  const randomHigh = random.snapshot().high;
  const randomLow = random.snapshot().low;
  const accuracy = Array(9).fill(null);
  for (const enemy of input.enemies) if (byte(enemy.attackSkill)) accuracy[enemy.slot] = enemy.attackSkill;
  const party = structuredClone(input.party);
  for (const role of party) role.resultConditionStates = {2: 0, 4: 0};
  for (const role of party) if (byte(sonicResistanceItem) && sonicResistanceItem > 0 && byte(role.slotFlags)
      && Array.isArray(role.equipment) && role.equipment.length === 8 && role.equipment.every(byte)) {
    role.resultConditionStates[0] = role.equipment.some((id, slot) => id === sonicResistanceItem
      && (role.slotFlags & (0x80 >> slot))) ? 2 : 0;
  }
  const randomInputs = targets.length > 1 ? targets.map((_, index) => index ? random.next() : randomHigh) : undefined;
  return actor === undefined ? null : {actor, instances, groups, targets, randomHigh, randomInputs,
    randomLow, accuracy, party, randomAmounts: structuredClone(input.randomAmounts), damageThreshold,
    pendingDirections, exitControl: 0, ended: false, reward: {gold: 0, experience: 0}};
}

function accuracyTargets(callState) {
  if (!byte(callState?.randomLow) || !byte(callState.randomHigh)
      || !Array.isArray(callState.accuracy) || callState.accuracy.length !== 9
      || !callState.accuracy.every(value => value === null || byte(value))) return null;
  const random = globalRandom((callState.randomHigh << 8) | callState.randomLow);
  const seen = new Set();
  let group;
  do {
    const state = random.snapshot(), seed = (state.high << 8) | state.low;
    if (seen.has(seed)) return null;
    seen.add(seed);
    group = random.next() & 3;
  } while (!callState.groups[group]?.population);
  const targets = callState.instances.filter(instance => instance?.group === group).map(instance => instance.slot);
  return targets.length === 2 && byte(callState.accuracy[group]) ? {group, targets} : null;
}

function battleEnemyMessageCallOperations({path, record, action, callState, directionMasks, fields, context, resultScripts} = {}) {
  const call = battleEnemyMessageCallContract(path?.enemyActionReference, path?.resultScript, path?.phases, record || null);
  const actor = callState?.instances?.[callState.actor];
  if (!call || action?.handle !== path.enemyActionReference
      || action.fields?.result_script?.value !== call.script
      || action.fields?.message?.value !== `record:0A:${String(call.texts[0]).padStart(3, '0')}`
      || !validCallState(callState) || !actor?.present || !actor.targetable || actor.status !== 0
      || !word(actor.hp) || !word(actor.maxHp) || actor.hp > actor.maxHp
      || !byte(callState.randomHigh) || !byte(callState.pendingDirections) || callState.exitControl !== 0
      || !Array.isArray(callState.targets) || !callState.targets.length
      || callState.targets.some(target => !Number.isInteger(target) || target < 0 || target > 2)
      || new Set(callState.targets).size !== callState.targets.length
      || (callState.targets.length > 1 && (!Array.isArray(callState.randomInputs)
        || callState.randomInputs.length !== callState.targets.length || !callState.randomInputs.every(byte)))
      || (call.effect === 'enemy-full-heal' && callState.targets.length !== 1)
      || (call.effect === 'enemy-underground' && (!Array.isArray(directionMasks)
        || directionMasks.length !== 4 || !directionMasks.every(byte))))
    return [{kind: 'boundary', missing: '敌方调用缺少匹配的行动、结果记录、目标列表或运行时字段'}];
  const evidence = call.evidence || BATTLE_ENEMY_MESSAGE_EVIDENCE;
  const message = phase => ({kind: 'message', phase, evidence});
  const effect = id => ({kind: 'effect', id, confirmed: true, evidence,
    callState: structuredClone(callState), directionMasks: structuredClone(directionMasks)});
  if (call.effect.startsWith('enemy-party-')) {
    const target = callState.targets[0], role = callState.party?.find(role => role.slot === target);
    const prefix = `save.slot.${context?.slot}.role.${SERVICE_ROLES[target]}.`;
    if (callState.targets.length !== 1 || ![1, 2].includes(context?.slot)
        || !byte(role?.present) || (role.present & 0x7F) !== target + 1 || !byte(role.status) || role.status & 0xE0
        || !word(role.hp) || role.hp < 1 || fields?.[`${prefix}present`] !== role.present
        || fields?.[`${prefix}status`] !== role.status || fields?.[`${prefix}current_hp`] !== role.hp)
      return [{kind: 'boundary', missing: '敌方消息缺少本次存活队员的姓名、状态和 HP 字段'}];
    if (['enemy-party-no-damage', 'enemy-party-thermal'].includes(call.effect)) {
      const matches = Object.entries(call.successors).every(([id, bytes]) => {
        const successor = resultScripts?.find(row => row.id === Number(id));
        return successor?.raw_bytes?.length === bytes.length
          && successor.raw_bytes.every((value, index) => value === bytes[index]);
      });
      if (!matches || role.present & 128 || role.riding !== false || role.status !== 0
          || !byte(callState.randomLow) || !byte(callState.randomHigh) || !byte(callState.damageThreshold)
          || !byte(role.slotFlags) || !Array.isArray(role.equipment) || role.equipment.length !== 8
          || !role.equipment.every(byte)
          || role.equipment.some((id, slot) => id >= 0x18 && id <= 0x1C && (role.slotFlags & (0x80 >> slot))))
        return [{kind: 'boundary', missing: '本次受击缺少正常徒步目标、随机输入、回避阈值或进入防护装备分支'}];
      const random = globalRandom((callState.randomHigh << 8) | callState.randomLow);
      if (call.effect === 'enemy-party-no-damage') {
        // 等技能的低值域使物理量始终小于 16，D5 的次数及等待随机调度不改变零量。
        const base = Math.max(0, actor.attack - Math.floor(role.defense / 2));
        const maximum = Math.max(3, base + Math.floor(base * 50 / 256));
        if (!byte(actor.attack) || !byte(role.defense) || !byte(actor.attackSkill)
            || actor.attackSkill !== role.defenseSkill || maximum >= 16
            || (call.zeroThreshold && (random.next() & 15) < call.zeroThreshold))
          return [{kind: 'boundary', missing: '本次 D5 物理量不能保证小于 16 或随机输入进入其他后继'}];
        // D5 次数、物理扰动、C0 回避依次推进；零基数先取后备随机字节。
        random.next();
        if (base === 0) random.next();
        random.next();
        if (random.next() < callState.damageThreshold)
          return [{kind: 'boundary', missing: '本次 C0 回避选择另一结果消息'}];
        return [message(path.phases[0]), {...effect(call.effect), target}, message(path.phases[1]),
          {kind: 'return', evidence, value: {scope: 'enemy-action', confirmed: true,
            actor: callState.actor, enemyAction: action.handle, resultScript: call.script, target}}];
      }
      const profile = callState.randomAmounts?.find(row => row.profile_index === 11);
      const resistance = role.damageResistances?.[1];
      if (!byte(profile?.minimum) || !byte(profile.exclusive_random_span) || resistance !== 0
          || role.defending === true)
        return [{kind: 'boundary', missing: '本次冷气／火焰缺少随机量参数或进入抗性、防卫分支'}];
      const amount = profile.minimum + random.below(profile.exclusive_random_span);
      if (random.next() < callState.damageThreshold || amount < 1 || amount >= role.hp)
        return [{kind: 'boundary', missing: '本次受击进入回避、无损伤或死亡消息，已发布阶段不匹配'}];
      return [message(path.phases[0]), {...effect('enemy-party-thermal-damage'), target,
        hpField: `${prefix}current_hp`, amount}, message(path.phases[1]),
        {...effect('enemy-party-thermal-status'), target, statusField: `${prefix}status`,
          mask: call.mask, selector: call.selector}, message(path.phases[2]),
        {kind: 'return', evidence, value: {scope: 'enemy-action', confirmed: true,
          actor: callState.actor, enemyAction: action.handle, resultScript: call.script, target}}];
    }
    if (call.effect === 'enemy-party-electromagnetic')
      return battleElectromagneticOperations({path, callState, actor, role, prefix, resultScripts});
    if (call.effect === 'enemy-party-dodge') {
      const successor = resultScripts?.find(row => row.handle === 'battle-result-script:3B');
      if (!byte(callState.randomLow) || !byte(callState.randomHigh)
          || successor?.raw_bytes?.length !== 2 || successor.raw_bytes[0] !== 0xF7 || successor.raw_bytes[1] !== 10
          || (globalRandom((callState.randomHigh << 8) | callState.randomLow).next() & 15) < 2)
        return [{kind: 'boundary', missing: '酸液当前随机输入进入命中分支或躲闪后继记录不匹配'}];
    }
    if (call.condition) {
      const condition = role.resultConditionStates?.[call.condition.selector];
      const effectRecord = resultScripts?.find(row => row.id === call.condition.result);
      const successor = resultScripts?.find(row => row.id === call.condition.successor);
      if (![0, 2].includes(condition) || !byte(callState.randomLow) || !byte(callState.randomHigh)
          || (call.effect !== 'enemy-party-panic' && role.present & 128)
          || (call.effect === 'enemy-party-long-wave' && (callState.party.length !== 1 || role.status !== 0))
          || effectRecord?.raw_bytes?.length !== 2 || effectRecord.raw_bytes[0] !== 0xF9
          || effectRecord.raw_bytes[1] !== (call.condition.selector === 4 ? 1 : call.condition.result === 0x56 ? 3 : 0)
          || (call.condition.successor !== undefined && (successor?.raw_bytes?.length !== call.condition.bytes.length
            || successor.raw_bytes.some((value, index) => value !== call.condition.bytes[index])))
          || (globalRandom((callState.randomHigh << 8) | callState.randomLow).next() & 15) >= [6, 3, 0][condition])
        return [{kind: 'boundary', missing: '异常消息缺少本次人物条件、后继记录或随机输入进入其他分支'}];
    }
    return [message(path.phases[0]), {...effect(call.effect), target, statusField: `${prefix}status`,
      hpField: `${prefix}current_hp`, presentField: `${prefix}present`, condition: call.condition}, message(path.phases[1]),
      ...(call.effect === 'enemy-party-long-wave' ? [{...effect('enemy-party-finalize'), target,
        statusField: `${prefix}status`}] : []),
      {kind: 'return', evidence, value: {scope: 'enemy-action', confirmed: true,
        actor: callState.actor, enemyAction: action.handle, resultScript: call.script, target}}];
  }
  if (call.effect === 'enemy-group-accuracy') {
    const selected = accuracyTargets(callState);
    if (callState.targets.length !== 1 || !selected)
      return [{kind: 'boundary', missing: '检测波缺少两实例敌群或敌群编号对应的命中率当前字节'}];
    return [message(path.phases[0]), {...effect('enemy-accuracy-select'), selected},
      {...effect('enemy-accuracy-add'), group: selected.group}, message(path.phases[1]),
      {...effect('enemy-accuracy-add'), group: selected.group}, message(path.phases[2]),
      {kind: 'return', evidence, value: {scope: 'enemy-action', confirmed: true,
        actor: callState.actor, enemyAction: action.handle, resultScript: call.script}}];
  }
  return [message(path.phases[0]), effect(call.effect),
    ...(call.effect === 'enemy-full-heal' ? [message(path.phases[1])] : []),
    {kind: 'return', evidence, value: {scope: 'enemy-action', confirmed: true,
      actor: callState.actor, enemyAction: action.handle, resultScript: call.script}}];
}

function applyBattleEnemyMessageEffect(fields, operation, context, domainResults = {}) {
  if (operation.id?.startsWith('enemy-0f-'))
    return applyBattleElectromagneticEffect(fields, operation, context, domainResults);
  const source = ['enemy-accuracy-add', 'enemy-party-finalize', 'enemy-party-thermal-status'].includes(operation.id)
    ? domainResults.enemyCall : operation.callState;
  const battle = structuredClone(source), actor = battle?.instances?.[battle.actor];
  if (!actor?.present || !actor.targetable) return {status: 'unavailable', reason: '本次敌方行动方不存在'};
  if (operation.id === 'enemy-party-finalize') {
    const role = battle.party?.find(role => role.slot === operation.target);
    if (battle.party.length !== 1 || role?.status !== 128 || fields[operation.statusField] !== role.status)
      return {status: 'unavailable', reason: '长波完成缺少唯一人物的麻痹状态'};
    role.status = 255;
    fields[operation.statusField] = role.status;
    battle.ended = true;
  } else if (['enemy-party-no-damage', 'enemy-party-thermal-damage', 'enemy-party-thermal-status'].includes(operation.id)) {
    const role = battle.party?.find(role => role.slot === operation.target);
    if (!role || role.riding !== false || role.present & 128 || role.status !== 0)
      return {status: 'unavailable', reason: '本次受击的徒步目标已改变'};
    if (operation.id === 'enemy-party-thermal-damage') {
      if (fields[operation.hpField] !== role.hp || !word(operation.amount)
          || operation.amount < 1 || operation.amount >= role.hp)
        return {status: 'unavailable', reason: '本次受击 HP 或公式数量已改变'};
      role.hp -= operation.amount; fields[operation.hpField] = role.hp;
      battle.messageQuantity = operation.amount;
    } else if (operation.id === 'enemy-party-thermal-status') {
      if (fields[operation.statusField] !== role.status || ![5, 6].includes(operation.selector)
          || operation.mask !== (128 >>> operation.selector))
        return {status: 'unavailable', reason: '本次冷气／火焰状态字段已改变'};
      role.status |= operation.mask;
      role.conditionTurns = {...role.conditionTurns, [operation.selector]: 3};
      fields[operation.statusField] = role.status;
    }
    battle.messagePartyTargets = [null, operation.target, operation.target];
  } else if (operation.id.startsWith('enemy-party-')) {
    const role = battle.party?.find(role => role.slot === operation.target);
    if (!role || fields[operation.statusField] !== role.status || fields[operation.hpField] !== role.hp
        || fields[operation.presentField] !== role.present || role.status & 0xE0)
      return {status: 'unavailable', reason: '敌方消息目标与本次队员字段不一致'};
    if (operation.id !== 'enemy-party-dodge') {
      const poison = operation.id === 'enemy-party-poison';
      role.status |= poison ? 1 : operation.condition.mask;
      const selector = poison ? 7 : operation.condition.selector === 4 ? 1 : operation.condition.result === 0x56 ? 3 : 0;
      role.conditionTurns = {...role.conditionTurns, [selector]: poison ? 3 : operation.condition.counter};
      fields[operation.statusField] = role.status;
    }
    battle.messagePartyTargets = [null, operation.target];
  } else if (operation.id === 'enemy-accuracy-select') {
    const selected = accuracyTargets(battle);
    if (!validCallState(battle) || !selected || selected.group !== operation.selected?.group
        || selected.targets.some((target, index) => target !== operation.selected.targets[index]))
      return {status: 'unavailable', reason: '检测波敌群与本次实例绑定不一致'};
    battle.accuracyGroup = selected.group;
    battle.messageTargets = [battle.actor, ...selected.targets];
  } else if (operation.id === 'enemy-accuracy-add') {
    if (operation.group !== battle.accuracyGroup || !byte(battle.accuracy?.[operation.group]))
      return {status: 'unavailable', reason: '检测波命中率字节与本次敌群绑定不一致'};
    // B054 将 Y 设为敌群编号；B618 只保存加量后的低字节。
    battle.accuracy[operation.group] = (battle.accuracy[operation.group] + 30) & 255;
  } else if (operation.id === 'enemy-full-heal') actor.hp = actor.maxHp;
  else if (operation.id === 'enemy-underground') {
    for (let index = 0; index < battle.targets.length; index++) {
      const randomHigh = battle.randomInputs?.[index] ?? battle.randomHigh;
      battle.pendingDirections |= operation.directionMasks[randomHigh & 3];
      battle.exitControl = (battle.exitControl - 1) & 255;
    }
    actor.targetable = false; actor.status = 255; actor.hp = 0;
    battle.groups[actor.group].population--;
    battle.ended = !battle.instances.some(instance => instance?.targetable);
    battle.exitControl = 0;
  } else return {status: 'unavailable', reason: '本次敌方效果未确认'};
  return {status: 'available', fields, domainResults: {enemyCall: battle}};
}

// @editor-module 战斗消息复用已发布来源、窗口序列与隔离预览快照。

const BATTLE_MESSAGE_EVIDENCE = 'project/evidence/reverse-engineering/battle-message-state-machine/observations.json';
const catalogStates = interfaces => interfaces?.interfaces?.find(row => row.id === 'battle-messages')?.states || [];
const stateId = id => id?.split(':')[0];

function battleMessagePaths(templates, interfaces) {
  const labels = new Map(catalogStates(interfaces).map(row => [row.id, row.label]));
  return (templates?.battle_message_sequences || []).flatMap((sequence, index) => {
    const path = (outcome, ordinal) => {
      const phases = [...sequence.phases, ...(outcome?.phases || [])];
      const enemyCall = battleEnemyMessageCallContract(sequence.enemy_action_reference,
        sequence.result_script, phases);
      const enemyCallConfirmed = Boolean(enemyCall);
      const call = sequence.enemy_action_reference ? null
        : battleMessageCallContract(sequence.result_script, phases, undefined, sequence.item_reference);
      const callConfirmed = Boolean(call) || enemyCallConfirmed;
      const continuation = outcome && templates?.battle_message_continuations?.find(row =>
        row.result_script === sequence.result_script && row.item_reference === sequence.item_reference);
      return {id: `message-path:${index}:${ordinal}`,
      label: `${labels.get(stateId(sequence.phases[0]?.state)) || '行动提示'}${outcome ? ` · ${outcome.label}` : ''}`,
      resultScript: sequence.result_script, itemReference: sequence.item_reference,
      enemyActionReference: sequence.enemy_action_reference,
      phases,
      conditionalPhases: enemyCall?.conditionalPhases || [],
      continuation,
      previewPhases: continuation?.target_iteration.phases && continuation.victory.phase
        ? [...phases, ...continuation.target_iteration.phases, continuation.victory.phase] : phases,
      missing: callConfirmed ? '' : outcome ? outcome.unresolved_reason || '' : sequence.unresolved_reason || '',
      evidence: outcome?.evidence || sequence.evidence,
      callConfirmed, enemyCallConfirmed,
      callEvidence: enemyCallConfirmed ? enemyCall.evidence || BATTLE_ENEMY_MESSAGE_EVIDENCE
        : call?.evidence || BATTLE_MESSAGE_CALL_EVIDENCE};
    };
    const paths = [path(null, 0), ...(sequence.outcomes || []).map((outcome, i) => path(outcome, i + 1))];
    const prefix = paths[0];
    if (!prefix.callConfirmed && prefix.phases.length === 1 && paths.some(row => row.phases.length > 1)) {
      prefix.successors = paths.slice(1).map(row => row.id);
      prefix.callConfirmed = paths.slice(1).every(row => row.callConfirmed);
      prefix.missing = prefix.callConfirmed ? '' : paths.slice(1).find(row => row.missing)?.missing
        || '已发布后继的本次调用未确认';
    }
    return paths;
  });
}

function battleMessageSourceMap({templates, interfaces, calls = {}, items = [], actions = []}) {
  const paths = battleMessagePaths(templates, interfaces);
  const bindings = uiTemplateBindings(templates);
  return battleMessageStateSources(templates, interfaces).map(source => {
    const entry = catalogStates(interfaces).find(row => row.id === source.state);
    const related = paths.filter(path => [...path.previewPhases, ...path.conditionalPhases]
      .some(phase => stateId(phase.state) === source.state));
    const fixedCalls = Object.entries(calls).filter(([, node]) => source.roots.includes(node))
      .map(([event, node]) => ({event, text_record_ref: {resource_id: 'text-record', node_id: node}}));
    const itemCalls = items.filter(item => related.some(path => !path.enemyActionReference
      && path.resultScript === `battle-result-script:${item.battle_use_effect?.result_selector?.toString(16).toUpperCase().padStart(2, '0')}`
      && (!path.itemReference || path.itemReference.endsWith(`:${item.id.toString(16).toUpperCase().padStart(2, '0')}`))))
      .map(item => ({handle: `item-entry:${item.id.toString(16).toUpperCase().padStart(2, '0')}`,
        field: 'battle_use_effect.result_selector'}));
    const enemyCalls = actions.filter(action => source.roots.includes(action.fields?.message?.value)
      || related.some(path => path.enemyActionReference === action.handle
        && path.resultScript === action.fields?.result_script?.value))
      .map(action => ({handle: action.handle, field: source.roots.includes(action.fields?.message?.value)
        ? 'message' : 'result_script'}));
    const layouts = bindings.filter(row => stateId(row.state) === source.state);
    const missing = [];
    if (!source.roots.length) missing.push('消息正文引用未归位');
    if (!layouts.length) missing.push('消息窗口绑定未发布');
    if (!related.length && !fixedCalls.length && !enemyCalls.length) missing.push('调用与消息顺序未闭合');
    if (source.insertions.length) missing.push('参数写入者须由本次调用绑定');
    if (source.insertions.some(row => row.value_type === 'unsigned-integer')) missing.push('数量须由本次数值公式提供');
    if (!related.length || related.some(path => !path.callConfirmed) || source.roots.some(root =>
      !related.some(path => path.callConfirmed && [...path.phases, ...path.conditionalPhases]
        .some(phase => phase.text_record_ref.node_id === root))))
      missing.push('行动效果与返回须由战斗调用方提供');
    return {...source, label: entry.label, catalogEvidence: entry.evidence,
      fixedCalls, itemCalls, enemyCalls, paths: related.map(path => ({id: path.id, resultScript: path.resultScript,
        itemReference: path.itemReference, evidence: path.evidence, missing: path.missing})),
      templates: [...new Set(layouts.map(row => row.template))], missing};
  });
}

function battleMessageGraph({templates, interfaces, calls, items, actions}) {
  const sources = battleMessageSourceMap({templates, interfaces, calls, items, actions});
  const nodes = sources.map(row => ({id: row.state, stateId: row.state, label: row.label,
    confirmed: row.templates.length > 0, source: row}));
  const transitions = [], paths = battleMessagePaths(templates, interfaces);
  for (const path of paths) {
    path.nodes = path.previewPhases.map(phase => stateId(phase.state));
    path.edges = path.phases.flatMap((phase, index) => {
      if (index === path.phases.length - 1 && path.successors?.length) {
        return path.successors.map((id, ordinal) => {
          const successor = paths.find(row => row.id === id);
          const edge = {id: `${path.id}:edge:${index}${ordinal ? `:successor:${ordinal}` : ''}`,
            from: stateId(phase.state), to: stateId(successor.phases[index + 1].state),
            input: '消息等待完成', successor: id, unknown: !successor.callConfirmed,
            condition: successor.callConfirmed ? successor.label : successor.missing || '调用方效果或分支未确认',
            evidence: successor.callConfirmed ? successor.callEvidence : successor.evidence};
          transitions.push(edge); return edge;
        });
      }
      if (index === path.phases.length - 1 && path.continuation) {
        const continuation = path.continuation, victory = continuation.victory;
        const repeated = continuation.target_iteration.phases || [];
        const destination = victory.phase?.state || `message-continuation:${victory.state}`;
        const victoryNode = nodes.find(row => row.id === destination);
        const referenceTarget = {pageId: victory.page, stateId: victory.state, nodeId: victory.state};
        if (victoryNode) victoryNode.referenceTarget = referenceTarget;
        else nodes.push({id: destination,
          label: catalogStates(interfaces).find(row => row.id === victory.state)?.label || '胜利',
          referenceTarget,
          evidence: continuation.evidence});
        if (!path.nodes.includes(destination)) path.nodes.push(destination);
        const edges = [
          {id: `${path.id}:edge:${index}`, from: stateId(phase.state),
            to: stateId(repeated[0]?.state || path.phases[continuation.target_iteration.repeat_from_phase].state),
            input: '消息等待完成', condition: '当前目标列表还有下一目标',
            clearPrevious: continuation.target_iteration.clear_previous},
          {id: `${path.id}:edge:${index}:victory`, from: stateId(phase.state), to: destination,
            input: '消息等待完成', condition: victory.condition},
          {id: `${path.id}:edge:${index}:return`, from: stateId(phase.state), to: null,
            input: '消息等待完成', condition: '目标列表完成且无胜利正文'},
          {id: `${path.id}:edge:${index}:victory-return`, from: destination, to: null,
            input: '确认后等待一帧', condition: '返回本次结果调用'},
          ...repeated.flatMap((phase, ordinal) => ordinal + 1 < repeated.length
            ? [{id: `${path.id}:next-target:${ordinal}`, from: stateId(phase.state),
              to: stateId(repeated[ordinal + 1].state), input: '消息等待完成', condition: ''}]
            : [{id: `${path.id}:next-target:${ordinal}:repeat`, from: stateId(phase.state),
              to: stateId(repeated[0].state), input: '消息等待完成', condition: '当前目标列表还有下一目标',
              clearPrevious: continuation.target_iteration.clear_previous},
            {id: `${path.id}:next-target:${ordinal}:victory`, from: stateId(phase.state), to: destination,
              input: '消息等待完成', condition: victory.condition},
            {id: `${path.id}:next-target:${ordinal}:return`, from: stateId(phase.state), to: null,
              input: '消息等待完成', condition: '目标列表完成且无胜利正文'}]),
        ].map(edge => ({...edge, unknown: true, structureConfirmed: true,
          missing: continuation.gap, evidence: continuation.evidence}));
        transitions.push(...edges); return edges;
      }
      const edge = {id: `${path.id}:edge:${index}`, from: stateId(phase.state),
        to: stateId(path.phases[index + 1]?.state) || null, input: '消息等待完成',
        unknown: !path.callConfirmed,
        condition: !path.callConfirmed ? '调用方效果或分支未确认'
          : path.conditionalPhases.length && index === path.phases.length - 1 ? 'FE 02 选择无状态结果' : '',
        evidence: path.callConfirmed ? path.callEvidence : path.evidence};
      transitions.push(edge); return edge;
    });
    for (const [index, phase] of path.conditionalPhases.entries()) {
      const node = stateId(phase.state);
      path.nodes.push(node);
      const edges = [{id: `${path.id}:condition:${index}`, from: stateId(path.phases.at(-1).state), to: node,
        input: '消息等待完成', condition: 'FE 02 选择麻痹结果', unknown: false, evidence: path.callEvidence},
      {id: `${path.id}:condition:${index}:return`, from: node, to: null,
        input: '消息等待完成', condition: '', unknown: false, evidence: path.callEvidence}];
      path.edges.push(...edges); transitions.push(...edges);
    }
  }
  return {nodes, paths, transitions, edges: transitions.map(row => ({...row, routes: [row]})),
    entry: nodes[0]?.id};
}

// 后继选择只运行已确认效果的隔离副本；正式执行仍从同一调用初值开始。
function battleMessageSuccessorOperations({path, paths, operationsForPath, applyEffect, fields, context}) {
  if (!path.successors?.length) return operationsForPath(path);
  const available = [], reasons = [];
  for (const id of path.successors) {
    const successor = paths.find(row => row.id === id);
    if (!successor) throw new TypeError('消息后继路径缺失');
    const operations = operationsForPath(successor);
    let current = structuredClone(fields), results = {}, complete = false;
    const isolatedContext = structuredClone(context);
    const pending = structuredClone(operations);
    for (const [index, operation] of pending.entries()) {
      if (operation.kind === 'message') continue;
      if (operation.kind === 'effect' && operation.confirmed === true && operation.evidence) {
        const result = applyEffect(current, operation, isolatedContext, structuredClone(results));
        if (result?.status !== 'available') {reasons.push(result?.reason); break;}
        current = structuredClone(result.fields);
        Object.assign(results, structuredClone(result.domainResults || {}));
        if (result.operations) pending.splice(index + 1, 0, ...structuredClone(result.operations));
      } else if (operation.kind === 'return' && operation.value?.confirmed === true && operation.evidence) {
        complete = true; break;
      } else {reasons.push(operation.missing); break;}
    }
    if (complete) available.push(operations);
  }
  if (available.length === 1) return available[0];
  return [{kind: 'boundary', missing: available.length > 1 ? '本次调用匹配多个消息后继'
    : [...new Set(reasons.filter(Boolean))].join('；') || '本次调用没有已确认的消息后继'}];
}

// 17:073D 与 3F:18DA 的已确认规则只读取调用方当前设置和所属字段对象的等待表。
function battleMessageWait(settings, waitValues, inputMask) {
  if (!Number.isInteger(settings) || settings < 0 || settings > 255
      || !Number.isInteger(inputMask) || inputMask < 0 || inputMask > 255)
    return {status: 'unavailable', reason: '本次消息缺少设置或确认输入声明'};
  const mode = settings & 7;
  if (mode === 4) return {status: 'available', kind: 'input', inputMask, remaining: null};
  const frames = waitValues?.[mode];
  if (!Number.isInteger(frames) || frames < 1 || frames > 255)
    return {status: 'unavailable', reason: '当前等待设置没有已发布的帧数'};
  return {status: 'available', kind: 'frames', remaining: frames, frames};
}

// 消息和效果按调用方的已确认顺序执行；效果函数只操作本次隔离字段。
function battleMessageExecution({operations, waitValues, inputMask, applyEffect, resolveParameters, advanceTime} = {}) {
  if (!Array.isArray(operations) || !operations.length) throw new TypeError('缺少本次消息与效果顺序');
  const block = (state, reason) => {
    state.execution.status = 'unknown'; state.execution.reason = reason; return state;
  };
  const run = state => {
    for (; state.execution.index < (state.execution.operations || operations).length; state.execution.index++) {
      const operation = (state.execution.operations || operations)[state.execution.index];
      if (operation.kind === 'effect') {
        if (operation.confirmed !== true || !operation.evidence || typeof applyEffect !== 'function')
          return block(state, operation.missing || '本次行动效果未确认');
        const result = applyEffect(structuredClone(state.fields), operation, state.context,
          structuredClone(state.domainResults));
        if (result?.status !== 'available') return block(state, result?.reason || '本次行动效果不可用');
        state.fields = structuredClone(result.fields);
        Object.assign(state.domainResults, structuredClone(result.domainResults || {}));
        if (result.returnStack) state.returnStack = structuredClone(result.returnStack);
        if (result.operations) {
          state.execution.operations ||= structuredClone(operations);
          state.execution.operations.splice(state.execution.index + 1, 0, ...structuredClone(result.operations));
        }
        state.execution.trace.push({kind: 'effect', id: operation.id, frame: state.execution.frame, evidence: operation.evidence});
      } else if (operation.kind === 'message') {
        if (!operation.phase?.state || operation.phase.text_record_ref?.resource_id !== 'text-record')
          return block(state, '消息缺少已发布的状态或正文引用');
        state.execution.messageContexts[state.execution.phases.length] = structuredClone(operation.itemAttack || null);
        const parameters = resolveParameters?.(operation, state) || {status: 'unavailable', reason: '本次消息的参数调用未确认'};
        if (parameters.status !== 'available') return block(state, parameters.reason);
        state.node = stateId(operation.phase.state); state.control = state.execution.index;
        state.pause = structuredClone(operation.phase);
        state.domainResults.parameters = structuredClone(parameters.value || {});
        const previous = state.windows[0];
        state.windows = [{id: 'message', instance: operation.phase.retain_previous && previous
          ? previous.instance : ++state.execution.windowSequence}];
        state.execution.phases.push(structuredClone(operation.phase));
        // 17:0A81 直接进入确认等待；调用方须显式声明，不能由正文编号推断。
        let wait = battleMessageWait(state.context.settings, waitValues, inputMask);
        if (operation.wait) wait = operation.wait.kind === 'input'
          && operation.wait.confirmed === true && operation.wait.evidence
          ? battleMessageWait(4, waitValues, inputMask)
          : {status: 'unavailable', reason: '本次消息的等待入口未确认'};
        if (wait.status !== 'available') return block(state, wait.reason);
        state.execution.wait = wait; state.execution.status = 'waiting';
        state.execution.trace.push({kind: 'message', phase: structuredClone(operation.phase),
          frame: state.execution.frame, wait: structuredClone(wait), evidence: operation.evidence});
        return state;
      } else if (operation.kind === 'boundary') return block(state, operation.missing || '战斗调用续接未确认');
      else if (operation.kind === 'return') {
        if (operation.value?.confirmed !== true || !operation.evidence)
          return block(state, '本次消息返回未确认');
        state.execution.status = 'returned'; state.pause = null;
        if (operation.unwind) {
          if (operation.unwind !== state.returnStack.length) return block(state, '本次消息的返回栈与调用不一致');
          state.execution.returnedFrames = state.returnStack.splice(0).reverse();
        }
        state.domainResults.messageReturn = structuredClone(operation.value || {});
        state.execution.trace.push({kind: 'return', frame: state.execution.frame}); return state;
      } else throw new TypeError('未声明的消息顺序操作');
    }
    return block(state, '本次消息缺少返回声明');
  };
  const elapse = (state, frames) => {
    state.execution.frame += frames;
    if (frames && advanceTime) state.domainResults = structuredClone(advanceTime(structuredClone(state.domainResults), frames));
  };
  const inputBits = {a: 128, b: 64, select: 32, start: 16, up: 8, down: 4, left: 2, right: 1};
  return {
    initial({fields = {}, context = {}, windows = []} = {}) {
      return run(interfacePreviewState({fields, context, windows,
        entry: stateId(operations.find(row => row.kind === 'message')?.phase.state),
        execution: {status: 'running', index: 0, frame: 0, trace: [], phases: [], messageContexts: [],
          windowSequence: Math.max(0, ...windows.map(window => window.instance))}}));
    },
    advance(state, input) {
      if (!['waiting', 'confirming'].includes(state.execution.status)) return state;
      const frames = input.type === 'frames' ? input.frames : 0;
      if (input.type === 'frames' && (!Number.isInteger(frames) || frames < 0)) throw new RangeError('等待帧数无效');
      let remaining = frames;
      while (['waiting', 'confirming'].includes(state.execution.status)) {
        const wait = state.execution.wait;
        if (wait.kind === 'input') {
          if (inputBits[input.type] & wait.inputMask) {
            state.execution.trace.push({kind: 'input', input: input.type, frame: state.execution.frame});
            // F8E5 清除等待标记后仍等一帧，才在 A75B 恢复战斗界面。
            state.execution.wait = {kind: 'frames', remaining: 1, frames: 1};
            state.execution.status = 'confirming';
          } else elapse(state, remaining);
          return state;
        }
        const elapsed = Math.min(remaining, wait.remaining);
        wait.remaining -= elapsed; elapse(state, elapsed); remaining -= elapsed;
        if (wait.remaining) return state;
        state.execution.trace.push({kind: 'wait-complete', frame: state.execution.frame});
        state.execution.index++; state.execution.status = 'running'; delete state.execution.wait;
        run(state);
        if (!remaining || input.type !== 'frames') return state;
      }
      return state;
    },
  };
}

// @editor-module 战斗演算步骤、攻击帧与实机对照的播放控件。

function battleSimulationMarkup({singleAction = false, interfaceScene = false, pageId = '',
  actionPreview = false, simulatorLayout = false, embedded = false, workbench = {}} = {}) {
  if (interfaceScene) return screenWorkbenchCanvasStage({namespace: 'battle-interface', sizing: 'fill',
      attributes: {'data-battle-simulation': '', 'data-interface-scene': ''},
      canvasMarkup: `<canvas width="256" height="240" data-simulation-canvas data-interface-page-workbench="${esc(pageId)}" aria-label="战斗界面预览"></canvas>`,
      footerMarkup: '<p data-simulation-error role="status"></p>'});
  if (singleAction) return `<section data-battle-simulation data-single-action>
    ${screenWorkbenchCanvasStage({namespace: 'battle-action', sizing: 'fill',
      canvasMarkup: '<canvas width="256" height="240" data-simulation-canvas aria-label="单次行动战斗预览"></canvas>',
      viewportClassName: 'battle-test-canvas-viewport', footerMarkup: `${simulatorLayout ? '<div data-single-action-playback>' : ''}<div class="battle-sequence-replay-controls">
      <button class="button" type="button" data-simulation-play disabled>播放</button>
      <button class="button" type="button" data-simulation-step disabled>下一帧</button>
    </div>
    <label class="simulation-progress">行动进度 <output data-simulation-position></output>
      <input type="range" min="0" max="0" value="0" data-simulation-progress disabled>
    </label>
    <label data-single-action-outcome hidden>结果预览 <select data-single-action-outcome-choice></select></label>
    <p data-simulation-event></p><p data-simulation-error role="status"></p>${simulatorLayout ? '</div>' : ''}`})}
  </section>`;
  const stageMarkup = screenWorkbenchCanvasStage({namespace: 'battle-simulation', sizing: 'fill',
      className: 'battle-sequence-replay-visual', attributes: {'aria-label': '战斗演算画面'},
      viewportClassName: 'simulation-canvas-viewport',
      canvasMarkup: '<canvas width="256" height="240" data-simulation-canvas></canvas>',
      footerMarkup: `${simulatorLayout ? '<div data-battle-test-playback>' : ''}<div class="battle-sequence-replay-controls">
        <button class="button" type="button" data-simulation-generate>生成</button>
        <button class="button" type="button" data-simulation-play>播放</button>
        <button class="button" type="button" data-simulation-step>下一步</button>
        <label>种子 <input type="number" min="0" max="65535" value="62880" data-simulation-seed></label>
      </div>
      <div class="simulation-progress">
        <label><span>战斗进度 <span class="simulation-progress-legend">▲ 攻击 · ● 命中 · ◆ 弃车 · ■ 结束</span></span><output data-simulation-position></output>
          <input type="range" min="0" max="0" value="0" step="1" aria-label="战斗进度" data-simulation-progress disabled>
        </label>
        <div class="simulation-progress-markers" data-simulation-markers aria-label="关键事件"></div>
      </div>
      <div class="battle-sequence-replay-controls" data-simulation-result hidden style="display:none">
        <button class="button" type="button" data-simulation-result-input="a">A</button>
        <button class="button" type="button" data-simulation-result-input="b">B</button>
        <span data-simulation-result-status></span>
      </div>
      <p data-simulation-error role="status"></p>
      ${simulatorLayout ? '</div>' : ''}
    `}) + (actionPreview ? `<div class="screen-workbench-stage-content" data-battle-test-single-action hidden>${battleSimulationMarkup({singleAction: true, simulatorLayout})}
      <button type="button" class="button" data-battle-test-return>返回战斗</button></div>` : '');
  const bottomMarkup = `${simulatorLayout ? workbench.bottomMarkup || '' : ''}<section class="battle-sequence-replay-detail">
      <label>查看 <select data-simulation-mode><option value="simulation">演算步骤</option><option value="comparison">实机对照</option></select></label>
      <p data-simulation-event></p>
      <dl data-simulation-facts></dl>
      <details class="simulation-basis"><summary>规则依据与演算说明</summary><p data-simulation-rule-step></p><div data-simulation-basis></div></details>
      <div data-simulation-details>
        <table class="simulation-table"><thead><tr><th>行动方</th><th>行动</th><th>目标</th><th>结算量</th><th>HP</th></tr></thead><tbody data-simulation-log></tbody></table>
      </div>
      <div data-simulation-comparison hidden>
        <table class="simulation-table"><thead><tr><th>实机步骤／帧</th><th>实机事件／消息／HP／护罩</th><th>演算步骤／事件／消息／HP／护罩</th><th>消息／HP／护罩 一致</th></tr></thead><tbody data-simulation-comparison-rows></tbody></table>
        <details data-simulation-trace><summary>查看实机时间线回放</summary>${battleSequenceReplayMarkup()}</details>
      </div>
    </section>`;
  if (embedded) return `<div class="screen-workbench-stage-content"><section data-battle-simulation data-simulation-embedded>${stageMarkup}${bottomMarkup}</section></div>`;
  return screenWorkbench({namespace: 'battle-simulation', heightMode: 'fill', ...workbench,
    attributes: {...workbench.attributes, 'data-battle-simulation': ''}, stageMarkup, bottomMarkup});
}

const displayText = value => String(value || "—")
  .replace(/^enemy-action:[^ ]+ · /u, "")
  .replace(/（(?:含)?占位[^）]*）/gu, "");
const actorValues = step => step.actors.map(actor => `${actor.label} HP ${actor.hp}`
  + (actor.riding && actor.vehicle ? `；SP ${actor.vehicle.sp}` : '')
  + (actor.maxShield > 0 ? `；护罩 ${actor.shield}` : "")).join("；");
const targetValues = step => step.targetLabel || (step.targets || [])
  .map(id => step.actors.find(actor => actor.id === id)?.label || "—").join("、") || "—";
const eventMarker = step => step.actors.some((actor, i) => actor.riding === false && step.previousActors?.[i]?.riding)
  || /弃车/u.test(step.event) ? ["dismount", "◆", "弃车"]
  : ({attack: ["attack", "▲", "攻击"], damage: ["hit", "●", "命中"],
    end: ["end", "■", "结束"]}[step.kind] || null);

function simulationMarkerGroups(steps, width) {
  const groups = [], common = new Map(), rareLanes = [];
  const distance = 20, last = Math.max(1, steps.length - 1);
  for (const [index, step] of steps.entries()) {
    const marker = eventMarker({...step, previousActors: steps[index - 1]?.actors});
    if (!marker) continue;
    const [kind, symbol, label] = marker, percent = index * 100 / last, x = percent * width / 100;
    const ordinary = kind === "attack" || kind === "hit", previous = common.get(kind);
    if (ordinary && previous && x - previous.x < distance) {
      previous.indices.push(index);
      continue;
    }
    let lane = kind === "attack" ? 0 : 1;
    if (!ordinary) {
      let slot = rareLanes.findIndex(previousX => x - previousX >= distance);
      if (slot < 0) slot = rareLanes.length;
      rareLanes[slot] = x;
      lane = slot + 2;
    }
    const group = {kind, symbol, label, percent, x, lane, indices: [index]};
    groups.push(group);
    if (ordinary) common.set(kind, group);
  }
  return groups;
}

function animateBattleClip({clip, canvas, frameDuration = 1000 / 60, minimumFrames = 0,
  startedAt = performance.now(), current, onFrame = () => {}, onElapsed = () => true,
  readyToComplete = () => true, onComplete, schedule}) {
  let lastFrame = 0;
  clip.paint(canvas, 0);
  onFrame(0);
  const duration = Math.max(1, clip.frameCount, minimumFrames) * frameDuration;
  const tick = time => {
    if (!current()) return;
    const elapsed = Math.max(0, time - startedAt);
    const frame = Math.min(Math.max(0, clip.frameCount - 1), Math.floor(elapsed / frameDuration));
    if (frame !== lastFrame) {clip.paint(canvas, frame); onFrame(frame); lastFrame = frame;}
    if (onElapsed(Math.floor(elapsed / frameDuration)) === false) return;
    if (elapsed < duration || !readyToComplete()) schedule(requestAnimationFrame(tick));
    else onComplete(Math.max(startedAt + duration, time));
  };
  schedule(requestAnimationFrame(tick));
}

async function bindSingleAction(root, {project, preview, isCurrent, controls = root}) {
  const saveStarted = performance.now();
  const save = await prepareBattleSimulationSave();
  root.dataset.simulationSaveMs = String(performance.now() - saveStarted);
  const canvas = root.querySelector("[data-simulation-canvas]");
  const play = controls.querySelector("[data-simulation-play]");
  const next = controls.querySelector("[data-simulation-step]");
  const progress = controls.querySelector("[data-simulation-progress]");
  const errorHost = controls.querySelector("[data-simulation-error]");
  const outcome = controls.querySelector("[data-single-action-outcome-choice]");
  let clip, generation = 0, timer, frame = 0;
  let sourceKey = "", outcomeId = "";
  const stop = () => {generation++; cancelAnimationFrame(timer); play.textContent = "播放";};
  const position = value => {
    frame = Math.min(Math.max(0, clip.frameCount - 1), value);
    progress.value = String(frame);
    controls.querySelector("[data-simulation-position]").textContent = `${frame + 1} / ${Math.max(1, clip.frameCount)}`;
    root.dataset.simulationPainted = "true";
  };
  const paint = value => {position(value); clip.paint(canvas, frame);};
  const start = () => {
    stop();
    const token = generation;
    play.textContent = "暂停";
    animateBattleClip({clip, canvas, frameDuration: nesFrameDurationMs(state.battleVideoStandard),
      current: () => {
        if (!isCurrent()) {stop(); clip.dispose(); return false;}
        return generation === token;
      }, onFrame: position, onComplete: stop, schedule: value => {timer = value;}});
  };
  const update = async ({project: nextProject = project, preview: nextPreview = preview, autoplay = false} = {}) => {
    stop();
    project = nextProject; preview = nextPreview;
    const token = generation;
    play.disabled = next.disabled = progress.disabled = true;
    root.dataset.simulationReady = "false";
    errorHost.textContent = "准备播放画面…";
    try {
      const attack = resolveBattleSceneAttack(preview, project);
      if (sourceKey !== attack.source?.key) {sourceKey = attack.source?.key; outcomeId = "";}
      const saveSlot = save.fields.find("save.directory.selected_slot")?.value === 2 ? 2 : 1;
      const member = preview.party[attack.side === "party" ? attack.attackerIndex : preview.attack.partyTarget];
      const vehicle = member?.riding ? battleScenePartyVehicle(battleScenePreviewCatalog(project), member) : null;
      const role = save.initialRoles[member?.roleId];
      const hp = save.fields.find(`save.slot.${saveSlot}.role.${role?.slug}.current_hp`)?.value;
      const sp = vehicle ? save.fields.find(`save.slot.${saveSlot}.vehicle.${vehicle.preset.vehicle_slot}.sp`)?.value : null;
      const started = performance.now();
      const prepared = await prepareBattleSceneComposerPlayback({project, preview, phase: "single-action",
        sources: {saveFields: save.fields},
        messageSaveSlot: saveSlot, messageOutcomeId: outcomeId,
        messageActor: {kind: "role", id: member?.roleId},
        statusWindow: hp == null ? null : {label: "HP", value: hp,
          secondary: sp == null ? null : {label: "SP", value: sp}}});
      if (token !== generation || !isCurrent()) {prepared.dispose(); return;}
      clip?.dispose(); clip = prepared;
      outcome.closest("label").hidden = !clip.outcomes.length;
      outcome.innerHTML = `<option value="">请选择</option>${clip.outcomes.map(item =>
        `<option value="${esc(item.id)}">${esc(item.label)}</option>`).join("")}`;
      outcome.value = outcomeId;
      progress.max = String(Math.max(0, clip.frameCount - 1));
      controls.querySelector("[data-simulation-event]").textContent = attack.source?.label || "";
      errorHost.textContent = attack.available ? "" : attack.reason || "";
      play.disabled = next.disabled = progress.disabled = false;
      root.dataset.simulationReady = "true";
      paint(0);
      root.dataset.simulationClipsMs = String(performance.now() - started);
      if (autoplay) start();
    } catch (error) {
      if (token === generation && isCurrent()) {
        editorLog.error("字段编辑", `操作失败：${error?.message || error}`, error);
        errorHost.textContent = error.message; root.dataset.simulationPainted = "false";
      }
    }
  };
  play.addEventListener("click", () => play.textContent === "暂停" ? stop() : start());
  next.addEventListener("click", () => {stop(); paint(frame + 1);});
  progress.addEventListener("input", () => {stop(); paint(Number(progress.value));});
  outcome.addEventListener("change", () => {outcomeId = outcome.value; void update({autoplay: true});});
  root.dataset.simulationBound = "1";
  await update();
  return {update};
}

async function bindBattleSimulation(root, {project, preview, trace, encounter = {}, onComplete, onError, onMessageState,
  calculate = null, onCalculated = null, automaticMessages = false,
  singleActionControls = root, interfaceFrame = null, isCurrent = () => root.isConnected}) {
  const navigation = state.navigationGeneration;
  const currentPage = () => root?.isConnected && isCurrent() && navigation === state.navigationGeneration;
  const workbench = root?.closest('[data-screen-workbench]');
  if (workbench) bindScreenWorkbenchZoom({namespace: workbench.dataset.screenWorkbench,
    root: workbench.parentElement, canvasRoot: root.hasAttribute('data-single-action') ? root : null});
  if (root?.hasAttribute('data-interface-scene')) {
    const canvas = root.querySelector('[data-simulation-canvas]');
    const overlay = document.createElement('canvas');
    await paintUiConstructionSemanticPreview(overlay, interfaceFrame, {isCurrent: currentPage});
    if (!currentPage()) return;
    const clip = await prepareBattleSceneComposerPlayback({project, preview, phase: 'interface',
      paintOverlay: surface => surface.getContext('2d').drawImage(overlay, 0, 144, 256, 96, 0, 144, 256, 96)});
    if (!currentPage()) {clip.dispose(); return;}
    clip.paint(canvas, 0); clip.dispose();
    canvas.uiResolvedPreview = overlay.uiResolvedPreview;
    canvas.uiDrawnComponents = overlay.uiDrawnComponents;
    canvas.uiComponentSlots = overlay.uiComponentSlots;
    canvas.uiTextSlotProgress = overlay.uiTextSlotProgress;
    root.querySelector('[data-simulation-error]').textContent = overlay.uiTextSlotProgress?.reason || '';
    root.dataset.simulationReady = root.dataset.simulationPainted = 'true';
    canvas.dispatchEvent(new CustomEvent('ui-preview-painted'));
    return;
  }
  if (root?.hasAttribute("data-single-action")) return bindSingleAction(root, {project, preview,
    isCurrent: currentPage, controls: singleActionControls});
  if (!root || root.dataset.simulationBound) return;
  root.dataset.simulationBound = "1";
  const own = selector => [...root.querySelectorAll(selector)].find(element => element.closest('[data-battle-simulation]') === root);
  const canvas = own("[data-simulation-canvas]");
  const progress = own("[data-simulation-progress]");
  const position = own("[data-simulation-position]");
  const log = own("[data-simulation-log]");
  const play = own("[data-simulation-play]");
  const generate = own("[data-simulation-generate]");
  const seedInput = own("[data-simulation-seed]");
  const errorHost = own("[data-simulation-error]");
  const markers = own("[data-simulation-markers]");
  const comparisonOption = own('[data-simulation-mode] option[value="comparison"]');
  comparisonOption.disabled = !trace?.steps;
  own('[data-simulation-trace]').hidden = !trace?.steps;
  let playbackPreview = preview;
  let result, prepared = [], rows = [], index = 0, generation = 0, playing = false, timer = null;
  let markerWidth = 0;
  let preparing = false, messageConfig = {}, preparation = 0;
  let updates = Promise.resolve();
  let messageAdapter = null, messageState = null, stepFinished = false, pendingNext = false;
  const completed = new Set();
  const publishMessage = () => {
    const execution = messageState?.execution;
    root.dataset.simulationMessageStatus = execution?.status || '';
    root.dataset.simulationMessageWait = execution?.wait?.kind || '';
    root.dataset.simulationMessageWindow = String(messageState?.windows[0]?.instance || '');
    if (execution?.status === 'unknown') {
      errorHost.textContent = execution.reason; playing = false; play.textContent = '播放';
    }
    onMessageState?.(messageState && structuredClone(messageState));
  };
  const messageInput = type => {
    if (!messageState) return;
    messageAdapter.advance(messageState, {type}); publishMessage();
  };
  root.addEventListener('battle-message-input', event => messageInput(event.detail.type));
  const frameDuration = nesFrameDurationMs("ntsc");
  const renderMarkers = () => {
    markerWidth = markers.getBoundingClientRect().width;
    if (!result || !markerWidth) return;
    const groups = simulationMarkerGroups(result.steps, markerWidth);
    markers.style.height = `${Math.max(3, ...groups.map(group => group.lane + 1)) * 14 + 2}px`;
    markers.innerHTML = groups.map(group => {
      const first = group.indices[0], multiple = group.indices.length > 1;
      const title = group.indices.map(i => `步骤 ${i + 1} · ${displayText(result.steps[i].event)}`).join("\n")
        + (multiple ? `\n${group.label}共 ${group.indices.length} 步；点击定位步骤 ${first + 1}` : "");
      const label = `步骤 ${group.indices.map(i => i + 1).join("、")} · ${group.label}`
        + (multiple ? `；点击定位步骤 ${first + 1}` : "");
      return `<button type="button" class="simulation-marker simulation-marker--${group.kind}${multiple ? " is-grouped" : ""}"
        style="left:${group.percent}%;top:${group.lane * 14}px" data-simulation-seek="${first}"
        title="${esc(title)}" aria-label="${esc(label)}">${group.symbol}</button>`;
    }).join("");
  };
  const markerObserver = new ResizeObserver(() => {
    if (!currentPage()) {markerObserver.disconnect(); return;}
    if (markers.getBoundingClientRect().width !== markerWidth) renderMarkers();
  });
  markerObserver.observe(markers);
  const stop = () => {playing = false; generation++; cancelAnimationFrame(timer); timer = null; play.textContent = "播放";};
  const disposeClips = items => new Set(items.map(item => item.clip)).forEach(clip => clip.dispose());
  let resultSession = null, resultAdapter = null;
  const resultHost = own('[data-simulation-result]');
  const paintResult = async () => {
    const snapshot = resultSession.state;
    const phase = snapshot.node.split('.').at(-1);
    root.dataset.simulationResult = phase;
    resultHost.querySelector('[data-simulation-result-status]').textContent = (result.completion.unconfirmed || []).join('；');
    const source = project.ui.construction.menu_dispatch_data.previews.find(row => row.id === `constructor:battle-result-${phase}`);
    await paintUiConstructionSemanticPreview(canvas, {...source, battle_result_execution: snapshot},
      {isCurrent: () => currentPage() && resultSession?.state === snapshot});
  };
  const finish = async () => {
    if (!onComplete || resultSession) return;
    resultAdapter = battleResultExecution(result.completion);
    resultSession = new InterfacePreviewSession(resultAdapter.initial({fields: encounter.fields,
      context: {slot: encounter.saveSlot, scene: encounter.scene}, returnStack: [{caller: 'battle'}]}));
    if (resultSession.state.execution.status !== 'waiting') {
      onComplete(structuredClone(result)); return;
    }
    resultHost.hidden = false;
    resultHost.style.display = 'flex';
    play.disabled = progress.disabled = own('[data-simulation-step]').disabled = true;
    await paintResult();
  };
  for (const button of resultHost.querySelectorAll('[data-simulation-result-input]')) button.addEventListener('click', () => {
    if (!resultSession || resultSession.state.execution.status !== 'waiting') return;
    resultSession.advance({type: button.dataset.simulationResultInput}, resultAdapter);
    if (resultSession.state.execution.status === 'returned') {
      resultHost.hidden = true; resultHost.style.display = 'none'; onComplete(structuredClone(result));
    } else void paintResult().catch(error => {errorHost.textContent = error.message;});
  });
  const prepareStep = async (step, stepIndex, statusRenderer, clips, catalog, sources, templates) => {
    const facts = [
      ["行动方", step.actorLabel || "—"], ["行动", displayText(step.action || step.event)],
      ["目标", targetValues(step)],
      ["结算量", step.settled ?? "—"], ["HP", actorValues(step)],
      ...(step.resources ? [[step.resources.label, `${step.resources.displayBefore} → ${step.resources.displayAfter}`]] : []),
      ...step.actors.filter(actor => actor.side === "party").flatMap(actor => [
        ["速度", `${actor.speed} · ${actor.inputSources?.speed || "—"}`],
        [actor.riding ? "驾驶技能" : "战斗技能", `${actor.attackSkill} · ${actor.inputSources?.[actor.riding ? 'driving_skill' : 'battle_skill'] || "—"}`],
        ...(step.kind === "story-return" ? [["恢复 HP", `${actor.hp} · ${actor.inputSources?.current_hp || "—"}`]] : []),
      ]),
    ].map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("");
    const ruleStep = [
      `当前步骤规则：${step.rules.map(key => BATTLE_SIMULATION_RULES[key].label).join("；") || "—"}`,
      `随机高位 ${step.random.high}、低位 ${step.random.low}、调用量 ${step.random.calls}`,
      `行动顺序：${step.queue?.map(row => `${row.label} ${row.score}`).join(" → ") || "—"}`,
      `未钳制量：${step.amount ?? "—"}`,
      ...step.actors.map(actor => `${actor.label} 护罩 ${actor.shield}、状态 ${actor.status}`),
      ...step.actors.filter(actor => actor.vehicle).map(actor => `${actor.label} SP ${actor.vehicle.sp}、战车状态 ${actor.vehicle.condition}、部件 ${actor.vehicle.parts.map(part => part.state).join('/')}`),
    ].join("；");
    const {scene, runtime, messageSequence, messageOutcomeId, enemyPaletteMonsterId, previousEnemyScene}
      = battleSimulationScene(project, playbackPreview, result.steps, stepIndex, catalog, templates);
    const paintStatus = await statusRenderer(step.actors, step.kind === "entry");
    const options = {preview: scene,
      messageRecordId: step.messageRecordId || null, messageRuntime: runtime, messageOutcomeId,
      messageSequence, phase: step.kind, presentation: step.presentation || 0,
      enemyPaletteMonsterId, previousEnemyScene};
    // 相同状态窗口与场景只在本次输入准备中共用播放投影。
    if (!clips.has(paintStatus)) clips.set(paintStatus, new Map());
    const scenes = clips.get(paintStatus), key = JSON.stringify(options);
    if (!scenes.has(key)) scenes.set(key,
      prepareBattleSceneComposerPlayback({...options, project, paintOverlay: paintStatus, catalog, sources}));
    const clip = await scenes.get(key);
    return {facts, ruleStep, clip};
  };
  const show = (next, startedAt = performance.now()) => {
    cancelAnimationFrame(timer);
    const token = ++generation;
    const windows = next === index + 1 && messageState?.execution.status === 'returned' ? messageState.windows : [];
    rows[index]?.classList.remove("is-current");
    rows[index]?.removeAttribute("aria-current");
    index = Math.max(0, Math.min(result.steps.length - 1, next));
    const step = result.steps[index], current = prepared[index];
    stepFinished = pendingNext = false;
    current.clip.paint(canvas, 0);
    const phase = current.clip.messagePhase;
    messageAdapter = step.messageRecordId ? battleMessageExecution({
      ...messageConfig,
      operations: phase ? [
        {kind: 'message', phase, evidence: BATTLE_MESSAGE_EVIDENCE,
          wait: step.kind === 'entry' ? {kind: 'input', confirmed: true, evidence: BATTLE_MESSAGE_EVIDENCE} : undefined},
        {kind: 'return', value: {confirmed: true, scope: 'message-phase'}, evidence: BATTLE_MESSAGE_EVIDENCE},
      ] : [{kind: 'boundary', missing: canvas.dataset.battleSceneWindowNote || '本次行动缺少已发布的消息阶段'}],
      resolveParameters: () => (canvas.dataset.battleSceneTextStates || '').split(',').every(value => value === 'complete')
        ? {status: 'available'} : {status: 'unavailable', reason: '本次行动正文或参数尚未完整确认'},
    }) : null;
    messageState = messageAdapter?.initial({context: {settings: messageConfig.settings}, windows}) || null;
    publishMessage();
    progress.value = String(index);
    position.textContent = `${index + 1} / ${result.steps.length}`;
    progress.setAttribute("aria-valuetext", `步骤 ${index + 1}：${displayText(step.event)}`);
    root.dataset.simulationStep = String(index);
    root.dataset.simulationAnimationFrames = String(current.clip.frameCount);
    root.dataset.simulationMessageFrames = String(messageState?.execution.wait?.frames || 0);
    own("[data-simulation-event]").textContent = `步骤 ${index + 1}/${result.steps.length} · ${displayText(step.event)}`
      + (step.resources ? ` · ${step.resources.label}：${step.resources.displayBefore} → ${step.resources.displayAfter}` : '');
    own("[data-simulation-facts]").innerHTML = current.facts;
    own("[data-simulation-rule-step]").textContent = current.ruleStep;
    rows[index].classList.add("is-current");
    rows[index].setAttribute("aria-current", "step");
    const viewport = log.closest("[data-simulation-details]");
    const rowRect = rows[index].getBoundingClientRect(), viewRect = viewport.getBoundingClientRect();
    const headerHeight = log.closest("table").tHead.getBoundingClientRect().height;
    if (rowRect.top < viewRect.top + headerHeight || rowRect.bottom > Math.min(viewRect.bottom, window.innerHeight))
      viewport.scrollTop += rowRect.top - viewRect.top - headerHeight;
    root.dataset.simulationPainted = "true";
    let elapsedFrames = 0;
    animateBattleClip({clip: current.clip, canvas, frameDuration, startedAt,
      onElapsed: frames => {
        if (!messageState) return true;
        const status = messageState.execution.status;
        messageAdapter.advance(messageState, {type: 'frames', frames: frames - elapsedFrames});
        elapsedFrames = frames;
        if (automaticMessages && playing && messageState.execution.wait?.kind === 'input')
          messageAdapter.advance(messageState, {type: 'a'});
        if (status !== messageState.execution.status) publishMessage();
        return messageState.execution.status !== 'unknown';
      },
      readyToComplete: () => !messageState || messageState.execution.status === 'returned',
      current: () => {
        if (token !== generation) return false;
        if (!currentPage()) {stop(); disposeClips(prepared); prepared = []; return false;}
        return true;
      }, onComplete: endedAt => {
        stepFinished = true;
        if (index === 0 || completed.has(index - 1)) completed.add(index);
        if ((playing || pendingNext) && index < result.steps.length - 1) show(index + 1, endedAt);
        else {
          if (playing) stop();
          if (index === result.steps.length - 1 && completed.size === result.steps.length) void finish().catch(error => {
            errorHost.textContent = error.message; onError?.(error);
          });
        }
      }, schedule: value => {timer = value;}});
    if (messageState?.execution.status !== 'unknown') errorHost.textContent = '';
  };
  const rebuild = async ({force = false, restart = false, position: nextPosition = 0} = {}) => {
    if (preparing) return;
    preparing = true;
    stop();
    resultSession = null; resultHost.hidden = true; resultHost.style.display = 'none'; delete root.dataset.simulationResult;
    const token = generation, revision = ++preparation;
    const started = performance.now();
    disposeClips(prepared);
    prepared = [];
    completed.clear(); messageState = messageAdapter = null; publishMessage();
    play.disabled = true;
    generate.disabled = true;
    seedInput.disabled = true;
    generate.textContent = "生成 0%";
    progress.disabled = true;
    own("[data-simulation-step]").disabled = true;
    root.dataset.simulationPainted = "pending";
    root.dataset.simulationReady = "false";
    errorHost.textContent = "";
    const pending = [];
    let persist = null;
    root.dataset.simulationSnapshotMs = root.dataset.simulationCacheWriteMs = "0";
    try {
      const cacheInput = {messageExecution: true, resultExecution: true, seed: Number(seedInput.value), preview, encounter};
      let cached = null;
      const cacheStarted = performance.now();
      try {cached = force || calculate ? null : await db.readPreviewCache("battle-simulation", cacheInput);} catch { /* 缓存不可读时重新生成。 */ }
      root.dataset.simulationCacheReadMs = String(performance.now() - cacheStarted);
      root.dataset.simulationCache = cached ? "hit" : force ? "forced" : "miss";
      const calculatedAt = performance.now();
      if (cached) {
        const clips = [];
        try {
          const form = await new Response(cached.data, {headers: {"Content-Type": cached.contentType}}).formData();
          const saved = JSON.parse(await form.get("steps").text());
          result = saved.result;
          playbackPreview = saved.preview;
          messageConfig = saved.messageConfig;
          const restored = await Promise.allSettled(saved.clips.map((clip, i) =>
            restoreBattleSceneComposerPlayback({...clip, image: form.get(`clip:${i}`)})));
          clips.push(...restored.filter(clip => clip.status === "fulfilled").map(clip => clip.value));
          const failed = restored.find(clip => clip.status === "rejected");
          if (failed) throw failed.reason;
          for (const row of saved.prepared) pending.push({...row, clip: clips[row.clip]});
        } catch {
          clips.forEach(clip => clip.dispose()); pending.length = 0; cached = null;
          root.dataset.simulationCache = "miss";
        }
      }
      root.dataset.simulationRestoreMs = String(cached ? performance.now() - calculatedAt : 0);
      root.dataset.simulationCalculationMs = "0";
      if (!cached) {
        const {sources} = await db.collectPreviewSources(async () => {
          const inputStarted = performance.now();
          const visualStarted = performance.now();
          const playbackSources = {actorRasters: new Map(), ready: prepareBattleSceneComposerSources().then(value => {
            root.dataset.simulationResourcesMs = String(performance.now() - visualStarted);
            return value;
          })};
          const savePromise = prepareBattleSimulationSave().then(save => {
            root.dataset.simulationSaveMs = String(performance.now() - inputStarted);
            return save;
          });
          const readStarted = performance.now();
          const [save, input] = await Promise.all([savePromise,
            battleSimulationInput(project, preview, db, savePromise, encounter), playbackSources.ready]);
          playbackPreview = input.preview;
          const overlays = await db.getResourceDocument("shared-indexed-byte-overlays", null);
          const slot = encounter.saveSlot ?? (save.fields.find("save.directory.selected_slot")?.value === 2 ? 2 : 1);
          const settingsField = `save.slot.${slot}.adventure_data_settings`;
          const settings = encounter.fields?.[settingsField] ?? save.fields.find(settingsField)?.value;
          const code = await fieldSubmenuCodeValues(['dialogue-wait-input-mask']);
          messageConfig = {settings, waitValues: overlays.level_value_codebook,
            inputMask: fieldSubmenuCodeValue(code, 'dialogue-wait-input-mask')};
          root.dataset.simulationInputReadMs = String(performance.now() - readStarted);
          root.dataset.simulationInputMs = String(performance.now() - inputStarted);
          const simulationStarted = performance.now();
          result = calculate ? await calculate(input, {seed: Number(seedInput.value), restart})
            : simulateBattle(input, {seed: Number(seedInput.value)});
          onCalculated?.(result);
          root.dataset.simulationCalculationMs = String(performance.now() - simulationStarted);
          const statusRenderer = await prepareBattleSimulationStatus(project);
          const clips = new Map();
          const clipsStarted = performance.now();
          const catalog = battleScenePreviewCatalog(project);
          const templates = await db.getDocument('project.ui.templates');
          for (const [stepIndex, step] of result.steps.entries()) {
            pending.push(await prepareStep(step, stepIndex, statusRenderer, clips, catalog, playbackSources, templates));
            generate.textContent = `生成 ${Math.round((stepIndex + 1) * 90 / result.steps.length)}%`;
            if (token !== generation || !currentPage()) return;
          }
          root.dataset.simulationClipsMs = String(performance.now() - clipsStarted);
        }, {includeLoaded: true});
        sources.push({kind: "save", id: "save-current"},
          ...["character-initial-record", "vehicle-preset", "fixed-text-slot"]
            .map(id => ({kind: "repository", id})));
        if (token !== generation || !currentPage()) {disposeClips(pending); return;}
        const write = calculate ? null : await db.preparePreviewCache("battle-simulation", cacheInput, {sources});
        const savedResult = result, savedMessageConfig = messageConfig;
        const isCurrent = () => revision === preparation && currentPage();
        persist = write && (async () => {
          if (!isCurrent()) return;
          root.dataset.simulationCacheWrite = "pending";
          try {
            const unique = [...new Set(pending.map(item => item.clip))];
            const form = new FormData(), savedClips = [];
            const snapshotStarted = performance.now();
            for (const [i, clip] of unique.entries()) {
              if (!isCurrent()) return;
              const snapshot = await clip.snapshot({isCurrent});
              if (!isCurrent() || !snapshot) return;
              const {image, ...descriptor} = snapshot;
              form.append(`clip:${i}`, image, `${i}.png`); savedClips.push(descriptor);
            }
            form.append("steps", new Blob([JSON.stringify({result: savedResult, preview: playbackPreview,
              messageConfig: savedMessageConfig, clips: savedClips,
              prepared: pending.map(item => ({...item, clip: unique.indexOf(item.clip)}))})],
              {type: "application/json"}), "steps.json");
            const response = new Response(form);
            root.dataset.simulationBackgroundSnapshotMs = String(performance.now() - snapshotStarted);
            const writeStarted = performance.now();
            const written = await write(await response.blob(),
              {contentType: response.headers.get("Content-Type"), isCurrent});
            root.dataset.simulationBackgroundCacheWriteMs = String(performance.now() - writeStarted);
            root.dataset.simulationCacheWrite = written ? "complete" : "obsolete";
          } catch (error) {
            if (isCurrent()) {
              editorLog.error("字段编辑", `操作失败：${error?.message || error}`, error);
              root.dataset.simulationCacheWrite = "failed";
              errorHost.textContent = `缓存失败：${error.message}`;
            }
          }
        });
      }
      if (token !== generation || !currentPage()) {disposeClips(pending); return;}
      root.dataset.simulationResultSeed = String(result.seed);
      root.dataset.simulationOutcome = result.completion?.outcome || '';
      root.dataset.simulationRounds = String(result.steps.at(-1)?.round || 0);
      disposeClips(prepared);
      prepared = pending;
      progress.max = String(result.steps.length - 1);
      log.innerHTML = result.steps.map((step, i) => `<tr data-simulation-log-step="${i}">
        <td>${esc(step.actorLabel || "—")}</td><td><button type="button" data-simulation-seek="${i}">${i + 1} · ${esc(displayText(step.action || step.event))}</button></td>
        <td>${esc(targetValues(step))}</td><td>${step.settled ?? "—"}</td><td>${esc(actorValues(step))}</td></tr>`).join("");
      rows = [...log.rows];
      renderMarkers();
      const comparison = compareBattleTrace(result, trace);
      const keys = [...new Set(result.steps.flatMap(step => step.rules))];
      const missing = [...new Set(result.steps.flatMap(step => step.missing))];
      own("[data-simulation-basis]").innerHTML = `<ul>${keys.map(key => {
        const rule = BATTLE_SIMULATION_RULES[key];
        return `<li>${esc(rule.label)}：${esc(rule.basis)}</li>`;
      }).join("")}</ul>${missing.length ? `<p title="${esc(missing.join('；'))}">演算仍有缺口。</p>` : ''}
        <p>实机对照按回合、行动方、阶段与同类序号对齐；实机帧不作为演算时钟。</p>
        <ul>${comparison.map(row => `<li>实机步骤 ${row.index + 1}：${esc(row.reason)}</li>`).join("")}</ul>`;
      const same = value => value == null ? "—" : value ? "是" : "否";
      own("[data-simulation-comparison-rows]").innerHTML = comparison.map(row => `<tr>
        <td>${row.index + 1}／${row.frame}</td><td>${esc(row.observed.event)}／${esc(row.observed.messageRecordId || "—")}／${esc(row.observed.hp || "—")}／${row.observed.shield ?? "—"}</td>
        <td>${row.calculated ? `${row.calculated.index + 1} · ${esc(displayText(row.calculated.event))}／${esc(row.calculated.messageRecordId || "—")}／${row.hp}／${row.shield}` : "无对应步骤"}</td>
        <td>${same(row.sameMessage)}／${same(row.sameHp)}／${same(row.sameShield)}</td></tr>`).join("");
      play.disabled = progress.disabled = own("[data-simulation-step]").disabled = false;
      root.dataset.simulationReady = "true";
      show(nextPosition);
      root.dataset.simulationGenerationMs = String(performance.now() - started);
      if (persist) setTimeout(() => void persist(), 0);
    } catch (error) {
      disposeClips(pending);
      if (token === generation && revision === preparation && currentPage()) {
        editorLog.error("字段编辑", `操作失败：${error?.message || error}`, error);
        errorHost.textContent = error.message; root.dataset.simulationPainted = "false";
        onError?.(error);
      }
    } finally {
      preparing = false;
      generate.disabled = seedInput.disabled = false;
      generate.textContent = "生成";
    }
  };
  play.addEventListener("click", () => {
    if (root.dataset.simulationReady !== "true") return;
    if (playing) {stop(); return;}
    playing = true; play.textContent = "暂停";
    show(index === result.steps.length - 1 ? 0 : index);
  });
  const seek = next => {if (root.dataset.simulationReady === "true") {stop(); show(next);}};
  own("[data-simulation-step]").addEventListener("click", () => {
    if (root.dataset.simulationReady !== 'true' || messageState?.execution.status === 'unknown') return;
    if (stepFinished) seek(index + 1);
    else {pendingNext = true; messageInput('a');}
  });
  root.addEventListener("click", event => {
    const target = event.target.closest("[data-simulation-seek], [data-simulation-log-step]");
    if (target && root.contains(target)) seek(Number(target.dataset.simulationSeek ?? target.dataset.simulationLogStep));
  });
  progress.addEventListener("input", () => seek(Number(progress.value)));
  const update = (options = {}) => {
    const pending = updates.then(async () => {
      project = options.project ?? project;
      preview = options.preview ?? preview;
      encounter = options.encounter ?? encounter;
      trace = Object.hasOwn(options, 'trace') ? options.trace : trace;
      automaticMessages = options.automaticMessages ?? automaticMessages;
      comparisonOption.disabled = !trace?.steps;
      own('[data-simulation-trace]').hidden = !trace?.steps;
      await rebuild({force: true, ...options});
    });
    updates = pending.catch(() => {});
    return pending;
  };
  seedInput.addEventListener("change", () => void update({restart: true}));
  generate.addEventListener("click", () => void update({force: true, restart: true}));
  own("[data-simulation-mode]").addEventListener("change", event => {
    const comparison = event.target.value === "comparison";
    own("[data-simulation-details]").hidden = comparison;
    own("[data-simulation-comparison]").hidden = !comparison;
  });
  own("[data-simulation-trace]").addEventListener("toggle", event => {
    if (event.target.open) bindBattleSequenceReplay(own("[data-battle-sequence-replay]"),
      {timeline: {...trace, preview}, project});
  });
  await rebuild();
  return {update};
}

export { BATTLE_MESSAGE_EVIDENCE, advanceBattleElectromagneticTime, applyBattleEnemyMessageEffect, battleEncounterResult, battleEnemyMessageCallOperations, battleEnemyMessageInitialState, battleMessageExecution, battleMessageGraph, battleMessageSuccessorOperations, battleSimulationInput, battleSimulationMarkup, bindBattleSimulation, simulateBattle };
