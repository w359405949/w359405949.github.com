// @editor-module 统一战斗人物、NPC 与载具的外观和动作目录。
//
// 人物 / 狼直接引用 metasprite-record 的战斗上下文；八辆载具直接引用
// weapon-effects 的 battle-object action $01-$08。战斗场景与独立编辑页都只消费
// 这里的逻辑对象，不再各自解释图形编号。

import {db} from "./project-db.js";
import {
  battleRoleSelector,
  VISUAL_METASPRITES_RESOURCE_ID,
} from "./visual-metasprites.js";

export const BATTLE_ACTOR_CHR_BANKS = Object.freeze([0x24, 0x25, 0x26, 0x27]);

// 战斗对象的 8-bit tile 编号依次落在四个 64-tile CHR 窗口；UI 画布按
// profile 选择图块来源，因此这里把战斗绘制器使用的同一组 bank 暴露为
// 可复用的窗口说明，避免界面页另猜一套分页。
export const BATTLE_ACTOR_CHR_PATTERN_PROFILES = Object.freeze(
  BATTLE_ACTOR_CHR_BANKS.map((bank, index) => Object.freeze({
    id: `battle-actor-chr:${bank.toString(16).toUpperCase().padStart(2, "0")}`,
    bank,
    first_tile: index * 0x40,
    last_tile: index * 0x40 + 0x3F,
  })),
);

function weaponAssets(project) {
  return project?.visuals?.weapon_effect_catalog?.asset_catalog_data || {};
}

function battleContext(project) {
  return (project?.visuals?.metasprites?.contexts || [])
    .find(context => Number(context.pair) === 0x94) || null;
}

/**
 * 步行战斗选择表允许引用的 55 个 generic metasprite。分析投影只负责名称与
 * 可用性；真正的当前选择仍从 metasprite-record working 正文读取。
 */
export function battleActorMetaspriteChoices(project) {
  const contextById = new Map(
    (battleContext(project)?.battle_objects || [])
      .filter(item => item.kind === "metasprite")
      .map(item => [Number(item.id), item]),
  );
  return (project?.visuals?.metasprites?.objects || [])
    .map(item => {
      const id = Number(item.id);
      const contextual = contextById.get(id) || item;
      const resourceUid = `metasprite:${id.toString(16).toUpperCase().padStart(2, "0")}`;
      return {
        id,
        resourceUid,
        label: appearanceLabel({...contextual, kind: "metasprite"}),
        available: !item.runtime_generated && Number(contextual.sprite_count) > 0,
        resource: contextual,
      };
    })
    .sort((left, right) => left.id - right.id);
}

function appearanceLabel(item) {
  const fallback = `${item.kind === "direct-frame" ? "直接帧" : "Metasprite"} ${
    item.id_hex || `0x${Number(item.id).toString(16).toUpperCase().padStart(2, "0")}`
  }`;
  return item.name || item.role_label || fallback;
}

function metaspriteAppearances(project) {
  const sprites = (battleContext(project)?.battle_objects || [])
    .filter(item => item.kind === "metasprite"
      && Number(item.sprite_count) > 0
      && Number.isInteger(Number(item.party_role_id)))
    .map(item => ({
      key: String(item.resource_id),
      id: Number(item.id),
      kind: "metasprite",
      label: appearanceLabel(item),
      partyRoleId: Number(item.party_role_id),
      partyRoleSlug: String(item.party_role_slug || ""),
      actorKind: String(item.battle_actor_kind
        || (Number(item.party_role_id) > 2 ? "npc" : "human")),
      pose: String(item.battle_pose || ""),
      poseLabel: String(item.battle_pose_label || ""),
      poseOrder: Number(item.battle_pose_order) || 0,
      defaultForPartyRole: Boolean(item.default_for_party_role),
      resource: item,
      resourceUid: String(item.resource_id),
    }))
    .sort((left, right) => left.partyRoleId - right.partyRoleId
      || left.poseOrder - right.poseOrder || left.id - right.id);
  const byRole = new Map();
  for (const action of sprites) {
    let appearance = byRole.get(action.partyRoleId);
    if (!appearance) {
      appearance = {
        key: `battle-appearance:${action.partyRoleSlug || action.partyRoleId}`,
        label: String(action.resource?.role_label
          || `${action.partyRoleSlug} 战斗形象`),
        kind: action.actorKind,
        weaponKind: "human",
        partyRoleId: action.partyRoleId,
        partyRoleSlug: action.partyRoleSlug,
        actions: [],
        defaultAction: "",
      };
      byRole.set(action.partyRoleId, appearance);
    }
    appearance.actions.push(action);
    if (action.defaultForPartyRole) appearance.defaultAction = action.pose;
  }
  const appearances = [...byRole.values()].map(appearance => ({
    ...appearance,
    defaultAction: appearance.defaultAction || appearance.actions[0]?.pose || "",
  }));
  // 正文由调用方的异步资源准备阶段载入；未改选时保留发布投影的默认姿势。
  const document_ = db.peekDocument(VISUAL_METASPRITES_RESOURCE_ID, null);
  if (document_ && db.metadata(VISUAL_METASPRITES_RESOURCE_ID)?.dirty) {
    const stateActions = battleActorMetaspriteChoices(project)
      .filter(choice => choice.available)
      .map(choice => ({
        key: choice.resourceUid,
        id: choice.id,
        kind: "metasprite",
        label: choice.label,
        pose: choice.resourceUid,
        poseLabel: choice.label,
        resource: choice.resource,
        resourceUid: choice.resourceUid,
      }));
    for (const appearance of appearances) {
      const selectedId = Number(battleRoleSelector(document_, appearance.partyRoleId + 1).metasprite_id);
      const original = appearance.actions.find(action => action.pose === appearance.defaultAction);
      if (selectedId === original?.id) continue;
      const selected = appearance.actions.find(action => action.id === selectedId)
        || stateActions.find(action => action.id === selectedId);
      if (!selected) throw new Error(`待机 metasprite ${selectedId} 没有可预览资源`);
      if (!appearance.actions.includes(selected)) appearance.actions.push(selected);
      if (!sprites.some(action => action.key === selected.key)) sprites.push(selected);
      appearance.defaultAction = selected.pose;
      // 改选后不再受原角色的识别分组限制；状态轨只能引用现有 generic 资源。
      appearance.stateActions = stateActions;
    }
  }
  return {appearances, actions: sprites};
}

function vehicleAppearances(project) {
  const assets = weaponAssets(project);
  const actionById = new Map(
    (assets.battle_objects?.actions || []).map(item => [Number(item.id), item]),
  );
  const firstPresetByChassis = new Map();
  for (const preset of project?.game_data?.vehicles?.presets || []) {
    const chassisId = Number(preset.chassis_id);
    if (chassisId < 0x91 || chassisId > 0x98
        || firstPresetByChassis.has(chassisId)) continue;
    firstPresetByChassis.set(chassisId, preset);
  }
  const appearances = [];
  const actions = [];
  for (let chassisId = 0x91; chassisId <= 0x98; chassisId += 1) {
    const actionId = chassisId - 0x90;
    const resource = actionById.get(actionId);
    if (!resource?.available) continue;
    const preset = firstPresetByChassis.get(chassisId) || null;
    const number = actionId;
    const hint = String(preset?.chassis_name_hint || `底盘 ${chassisId.toString(16)}`);
    const action = {
      key: `battle-action:${actionId.toString(16).toUpperCase().padStart(2, "0")}`,
      id: actionId,
      kind: "battle-action",
      label: `${number} 号战车 · ${hint}`,
      partyRoleId: null,
      partyRoleSlug: `vehicle-${number}`,
      actorKind: "vehicle",
      pose: "battle",
      poseLabel: "战斗车体",
      poseOrder: 0,
      defaultForPartyRole: true,
      chassisId,
      chassisIdHex: `0x${chassisId.toString(16).toUpperCase()}`,
      preset,
      resource,
      resourceUid: `battle-action:${actionId.toString(16).toUpperCase().padStart(2, "0")}`,
    };
    actions.push(action);
    appearances.push({
      key: `battle-appearance:vehicle-${number}`,
      label: `${number} 号战车 · ${hint}`,
      kind: "vehicle",
      weaponKind: "tank",
      partyRoleId: null,
      partyRoleSlug: `vehicle-${number}`,
      chassisId,
      preset,
      actions: [action],
      defaultAction: "battle",
    });
  }
  return {appearances, actions};
}

/** 12 类战斗形象的共同目录：三名主角、NPC 狼和八辆载具。 */
export function battleActorCatalog(project) {
  const metasprites = metaspriteAppearances(project);
  const vehicles = vehicleAppearances(project);
  const appearances = [...metasprites.appearances, ...vehicles.appearances]
    .sort((left, right) => {
      const leftGroup = left.kind === "vehicle" ? 1 : 0;
      const rightGroup = right.kind === "vehicle" ? 1 : 0;
      return leftGroup - rightGroup
        || Number(left.partyRoleId ?? left.chassisId)
          - Number(right.partyRoleId ?? right.chassisId);
    });
  const actions = [...metasprites.actions, ...vehicles.actions];
  return {
    appearances,
    appearanceByKey: new Map(appearances.map(item => [item.key, item])),
    actions,
    actionByKey: new Map(actions.map(item => [item.key, item])),
  };
}

function battleActorAppearance(catalog, key) {
  return catalog?.appearanceByKey?.get(String(key)) || null;
}


export function battleActorAction(catalog, appearanceKey, actionKey) {
  const appearance = battleActorAppearance(catalog, appearanceKey);
  if (!appearance) return null;
  return appearance.actions.find(item => item.pose === String(actionKey))
    || appearance.actions.find(item => item.pose === appearance.defaultAction)
    || appearance.actions[0] || null;
}

/**
 * 把攻击脚本 opcode $10/$11 对当前 actor state 的增减投影回同一角色的
 * 真实 metasprite。人类战斗姿势在 ROM 中就是相邻编号；载具或没有相邻姿势的
 * 形象保持原动作，不伪造补间帧。
 */
export function battleActorActionFromStateDelta(
  catalog,
  appearanceKey,
  actionKey,
  stateDelta = 0,
) {
  const appearance = battleActorAppearance(catalog, appearanceKey);
  const selected = battleActorAction(catalog, appearanceKey, actionKey);
  const delta = Number(stateDelta);
  if (!appearance || !selected || !Number.isInteger(delta) || delta === 0) {
    return selected;
  }
  const selectedId = Number(selected.id);
  if (!Number.isInteger(selectedId)) return selected;
  const targetId = (selectedId + delta) & 0xff;
  if (appearance.stateActions) {
    const action = appearance.stateActions.find(item => item.id === targetId);
    if (!action) throw new Error(`脚本姿势 metasprite ${targetId} 没有可预览资源`);
    return action;
  }
  return appearance.actions.find(item => Number(item.id) === targetId)
    || selected;
}

/**
 * 编辑器的攻击动作轨。底层每一项仍是原始 metasprite / battle action；这里仅按
 * 当前攻击的总帧数在现有姿势间切换，不制造一份新的图形资产。
 */
export function battleActorActionAtFrame(
  catalog,
  appearanceKey,
  actionKey,
  frameIndex = null,
  frameCount = 0,
) {
  const appearance = battleActorAppearance(catalog, appearanceKey);
  const selected = battleActorAction(catalog, appearanceKey, actionKey);
  if (!appearance || !selected || frameIndex === null
      || appearance.actions.length < 2 || frameCount < 2) return selected;
  const idle = battleActorAction(
    catalog,
    appearanceKey,
    appearance.defaultAction,
  ) || selected;
  const sequence = selected.key === idle.key
    ? [idle, ...appearance.actions.filter(item => item.key !== idle.key), idle]
    : [idle, selected, selected, idle];
  const progress = Math.max(0, Math.min(1, Number(frameIndex) / (frameCount - 1)));
  return sequence[Math.min(
    sequence.length - 1,
    Math.floor(progress * sequence.length),
  )];
}
