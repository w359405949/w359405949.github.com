// @editor-module 载具 preset 的用途视图：分组、候选、显示名与出租列表行绑定。
import {recordUid, resourceLabel} from "./resource-index.js";
import {itemNameRecordId} from "./text-record-project.js";
import {state} from "./state.js";

/**
 * 一个用途视图的 preset id 清单。`vehicles` 不给时取当前项目：视图的 id 权威在
 * 发布文档的 `views`，读它的地方只有这一处。
 */
function presetIdsOfView(viewId, vehicles = state.project?.game_data?.vehicles) {
  return (vehicles?.views?.[viewId]?.preset_ids || []).map(Number);
}

/**
 * 十八条 preset 是载具的唯一出处；玩家载具（`$00-$07`）与出租车型（`$08-$11`）
 * 都只是它的用途视图，各自持有一串 preset_ids。视图不装 preset 本体，
 * 所以这里按 id 引用现取，不做副本。
 */
export function presetsOfView(viewId, vehicles = state.project?.game_data?.vehicles) {
  const presets = vehicles?.presets || [];
  const wanted = new Set(presetIdsOfView(viewId, vehicles));
  return presets.filter(preset => wanted.has(Number(preset.preset_id)));
}

/** 出租车型视图的 preset。 */
export function rentalPresets() {
  return presetsOfView("rental");
}

export const VEHICLE_PRESET_GROUPS = Object.freeze(["player", "rental"]);

export function vehiclePresetChoices(
  allowedGroups = VEHICLE_PRESET_GROUPS,
  vehicles = state.project?.game_data?.vehicles,
) {
  const allowed = new Set(allowedGroups);
  return VEHICLE_PRESET_GROUPS.filter(group => allowed.has(group)).flatMap(group => {
    const label = String(vehicles?.views?.[group]?.label
      || (group === "rental" ? "出租车" : "玩家战车"));
    return presetsOfView(group, vehicles).map(preset => ({preset, group, groupLabel: label}));
  });
}

/**
 * 底盘名按 chassis_id 运行时解析。preset 里的 `chassis_name` 是提取期快照：
 * 改了字符映射后服务端只把当前文字投影到 items 的 records 上，这份副本不会跟着变。
 */
export function chassisName(preset) {
  if (typeof preset?.chassisName === "string") return preset.chassisName;
  return resourceLabel(
    recordUid("item", preset?.chassis_id),
    preset?.chassis_name_hint || "未命名底盘",
  );
}

/**
 * 出租名是发布数据里的只读派生字段：出租例程按 preset ID 推出名称码，ROM 里没有
 * 逐条名字表，所以前端不另存一份，也不按数值现猜。读不到就退回底盘名。
 */
export function rentalName(preset) {
  if (preset?.rentalName !== undefined) return preset.rentalName;
  const name = preset?.rental_name?.list_label || preset?.rental_name?.value;
  return typeof name === "string" && name ? name : null;
}

/** 出租战车显示出租名，玩家战车仍显示底盘名。 */
export function vehicleName(preset) {
  return rentalName(preset) || chassisName(preset);
}

function presetNumber(field) {
  if (field === null || field === undefined) return "—";
  if (typeof field === "number") return String(field);
  if (typeof field.value === "number") return String(field.value);
  if (typeof field.tons === "number") return `${field.tons} t`;
  return "—";
}

/**
 * 出租车型的候选项与通用载具候选项使用同一个显示名入口。
 */
export function rentalPresetEntries() {
  return vehiclePresetChoices(["rental"]).map(({preset}) => vehiclePresetEntry(preset));
}

/** 单个 preset 的候选项；出租车显示出租名，玩家战车显示底盘名。 */
export function vehiclePresetEntry(preset, group = presetIdsOfView("rental")
  .includes(Number(preset?.preset_id)) ? "rental" : "player") {
  const name = group === "rental" ? rentalName(preset) : null;
  const defense = `防御 ${presetNumber(preset.defense)}`;
  return {
    value: Number(preset.preset_id),
    label: name || chassisName(preset),
    description: name ? `底盘 ${chassisName(preset)} · ${defense}` : defense,
    meta: `预设 ${Number(preset.preset_id)}`,
  };
}


/**
 * 出租列表逐行记录 `record:02:075` 需要的运行时绑定：名称码字形脚本、底盘名文本
 * 记录、初始 SP。三项里任一项读不到发布数据就返回 null——调用方不得改用别的记录凑合。
 */
export function rentalListRowSources(project, presetId) {
  const preset = (project?.game_data?.vehicles?.presets || [])
    .find(item => Number(item.preset_id) === Number(presetId));
  if (!preset) return null;
  const nameCode = String(preset.rental_name?.name_code_hex || "")
    .replace(/^0x/iu, "");
  const chassis = (project?.game_data?.items?.records || [])
    .find(item => Number(item.id) === Number(preset.chassis_id));
  const chassisNameRecord = itemNameRecordId(chassis);
  const initialSp = Number(preset.initial_sp?.value);
  if (!nameCode || !chassisNameRecord || !Number.isFinite(initialSp)) return null;
  return {
    nameCodeScriptHex: nameCode,
    chassisNameRecord,
    initialSp,
  };
}
