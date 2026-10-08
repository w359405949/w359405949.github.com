// @editor-module 从武器资产现算发射锚点，并保存、重置 owner 参数表。
// weapon-attack-parameter 的发射锚点语义适配。
// Working 只改 owner 的两张表；供场景使用的 profile 从当前正文现算，不另存副本。
import {db} from "./project-db.js";
import {createAutoSave} from "./auto-save.js";
import {state} from "./state.js";
import {LAUNCH_ANCHOR_OWNER} from "./attack-launch-anchor-compiler.js";

export const ATTACK_LAUNCH_ANCHORS_RESOURCE_ID = LAUNCH_ANCHOR_OWNER;
const X_TABLE = "attack_cmd13_layout_x_anchors";
const Y_TABLE = "attack_cmd13_launch_y_offsets";
const MAX_COORDINATE = 255;
const saveQueues = new WeakMap();

export function launchAnchorSaveQueue(repository) {
  if (!saveQueues.has(repository)) {
    saveQueues.set(repository, createAutoSave(({profile, point, onError}) =>
      saveLaunchAnchorProfile(repository, profile, point).catch(onError)));
  }
  return saveQueues.get(repository);
}

function entry(documentValue, table, id) {
  const result = documentValue?.[table]?.find(row => row.action_class === id);
  if (!result) throw new Error(`发射锚点 ${id} 缺少 ${table}`);
  return result;
}

export function launchAnchorControlValue(profile) {
  const reference = Number(profile.actor_reference_x);
  if (!Number.isInteger(reference)) throw new Error("发射锚点缺少角色参考坐标");
  return {
    x: profile.forward_offset_pixels,
    y: profile.upward_offset_pixels,
    xMin: reference - MAX_COORDINATE, xMax: reference,
    yMin: 0, yMax: MAX_COORDINATE,
  };
}

export function editedLaunchAnchorProfile(profile, point) {
  const bounds = launchAnchorControlValue(profile);
  const x = Number(point.x), y = Number(point.y);
  if (point.x === "" || point.y === "" || !Number.isInteger(x) || !Number.isInteger(y)
      || x < bounds.xMin || x > bounds.xMax || y < bounds.yMin || y > bounds.yMax) {
    throw new Error(`前向偏移须为 ${bounds.xMin}..${bounds.xMax}，向上偏移须为 ${
      bounds.yMin}..${bounds.yMax} 的整数`);
  }
  const anchorX = Number(profile.actor_reference_x) - x;
  return {...profile, forward_offset_pixels: x, horizontal_offset_pixels: -x,
    upward_offset_pixels: y, anchor_x: anchorX,
    anchor_x_hex: `0x${anchorX.toString(16).toUpperCase().padStart(2, "0")}`};
}

export async function effectiveLaunchAnchorAssets(assets) {
  const documentValue = await db.getResourceDocument(ATTACK_LAUNCH_ANCHORS_RESOURCE_ID, null);
  if (!documentValue) throw new Error("武器发射锚点 owner 正文不可用");
  return {...assets, attack_launch_anchor_profiles: assets.attack_launch_anchor_profiles.map(profile =>
    editedLaunchAnchorProfile(profile, {
      x: Number(profile.actor_reference_x) - Number(entry(documentValue, X_TABLE, profile.id).value),
      y: Number(entry(documentValue, Y_TABLE, profile.id).value),
    }))};
}

async function saveLaunchAnchorProfile(repository, profile, point) {
  const next = editedLaunchAnchorProfile(profile, point);
  const fields = await launchAnchorFields(repository, profile.id);
  const changes = fields.map(field => ({field,
    value: field.fieldName === "x" ? next.anchor_x : next.upward_offset_pixels})).filter(change => change.field.value !== change.value);
  if (changes.length) await db.writeFields(changes, {expectedVersion: fields[0].version});
  return launchAnchorSaved(repository);
}


async function launchAnchorFields(repository, profileId) {
  if (repository !== state.projectRepository) throw new Error("发射锚点项目会话已切换");
  const fields = (await db.getFields(ATTACK_LAUNCH_ANCHORS_RESOURCE_ID)).filter(field => field.recordId === profileId);
  if (repository !== state.projectRepository) throw new Error("发射锚点项目会话已切换");
  if (fields.length !== 2) throw new Error(`发射锚点 ${profileId} 缺少两个已发布字段`);
  return fields;
}

async function launchAnchorSaved(repository) {
  if (repository !== state.projectRepository) throw new Error("发射锚点项目会话已切换");
  const saved = await db.readResource(ATTACK_LAUNCH_ANCHORS_RESOURCE_ID);
  if (repository !== state.projectRepository) throw new Error("发射锚点项目会话已切换");
  return saved;
}
