// @editor-module 字段对象当前值构成战斗演算的参战投影。
import {db} from "./project-db.js";
import {battlePartyVisualPosition, battleScenePreviewCatalog, normalizeBattleScenePreview} from "./battle-scene-preview.js";
import {battleResultProgram} from "./battle-result-script-runtime.js";
import {prepareSaveCurrentFieldObjects} from "./save-build.js";
import {state} from "./state.js";
import {battleMessageCalls} from './battle-message-calls.js';
import {roleEquipmentStats} from './role-equipment-derived.js';
import {itemEquipmentValues} from './item-equipment-values.js';
import {SERVICE_PARTS} from './service-preview-state.js';

/** 战斗输入复用 DB 已读 Origin，存档编解码与 Working 仍走共用入口。 */
export function prepareBattleSimulationSave() {
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
export async function battleSimulationInput(project, preview, repository = db, save = null, encounter = {}) {
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
    if (encounter.kind === 'redwolf') return {hp: read('current_hp'), maxHp: read('max_hp'), speed: read('speed'),
      attackSkill: read('battle_skill'), defenseSkill: read('battle_skill'),
      status: read('status'), present: read('present'), sources};
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
  let party = preview.party.flatMap((member, index) => member.visible ? [{
    id: `party:${index}`, side: "party", slot: index, label: "狼", hp: 3779, maxHp: 3779,
    // PRG $021A74–$021A8A：红狼运行时名称以一个 FF 空白图块开头。
    messageName: " 狼",
    shield: 0, maxShield: 0, attack: 590, defense: 750,
    speed: savedRoles[index]?.speed, status: 0,
    attackSkill: savedRoles[index]?.attackSkill,
    defenseSkill: savedRoles[index]?.defenseSkill,
    inputSources: savedRoles[index]?.sources,
    command: 0x0C, weaponId: 0x3C,
    // PRG $02E7F5 直接进入 $02E9B3 的立即数 95，不经过武器结果引用表。
    resultScriptHandle: "battle-result-script:95",
    attackSource: catalog.humanWeaponSources?.find(source => source.source?.id === 0x3C)?.key,
    missing: []}]: []);
  let story = {kind: "redwolf", returnEvent: 0x82,
    restoreParty: party.map(actor => ({id: actor.id, label: "玩家", ...savedRoles[actor.slot]}))};
  if (encounter.kind !== 'redwolf') {
    party = await Promise.all(savedRoles.filter(role => role.present
      && (!encounter.commands || !(role.status & 0xE0))).map(async role => {
      const slot = role.roleId;
      const weaponId = role.equipment?.find((id, index) => role.slotFlags & (0x80 >> index)
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
      const riding = Boolean(role.present & 0x80);
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
      return {...role, ...stats, id: `party:${slot}`, side: 'party', slot, riding, messageName: role.label,
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
    story = null;
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
