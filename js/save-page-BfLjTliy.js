import { esc, renderModuleComponent, physicalLocationMarkup, currentTextReference } from './element-tree-DsgOBeTK.js';
import { state } from './emulator-DynsZsth.js';
import { saveWorkspaceChanged, playerTileFromSaveCamera, saveCameraFromPlayerTile } from './prg-loaders-BmwiQmdC.js';
import { db, partyAliveActorType, VISUAL_ACTORS_RESOURCE_ID, TANK_EQUIPMENT_CATEGORIES, HUMAN_EQUIPMENT_CATEGORIES, HUMAN_CATEGORIES, ITEM_CATEGORIES } from './battle-result-script-runtime-B_EClFew.js';
import { currentViewUrl, replaceHistoryUrl } from './ui-editor-nodes-CtPdwTyu.js';
import { SAVE_EVENT_SECTIONS, saveBattleCatalog, saveEventSection, saveEventHref } from './timeline-player-y3hI_sah.js';
import { handleMarkup } from './preview-DMSrQMyk.js';
import { bindInPageTabs, inPageTabs, vehiclePresetPickerMarkup } from './in-page-tabs-BYzTkeOF.js';
import { resetToOriginalButton } from './pattern-pixel-editor-B8puYQ8A.js';
import { hydrateItemPickers, itemPickerMarkup, itemPickerFieldMarkup } from './attack-chr-tile-selector-DxIfuyLU.js';
import { prepareSaveVehiclePortraits, boundedNumberFieldMarkup } from './components-DyJFa-y0.js';
import { bindEntityDetailSelector, entityDetailFieldTableMarkup, entityDetailSelectorMarkup, entityDetailEquipmentMarkup, saveNameFieldInputMarkup, labeledBitmaskMarkup } from './rectangle-preset-controls-vTa_haKM.js';
import { hydrateReferenceFieldPickers, referencePickerMarkup } from './scene-elevators-N46oPTJC.js';
import { prepareEventFlagReferences, withCurrentOwnerRecord, currentOwnerReferenceImpact } from './battle-result-state-machine-CED-HbAa.js';
import { rentalPresetEntries } from './configuration-summary-NWu3_nCt.js';
import './actor-appearance-C7XjeDLZ.js';
import './components-3dCXHuuQ.js';
import { globalEventFlagEntry } from './facility-window-semantics-BvUme8Kk.js';
import { wantedBossName } from './ui-construction-preview-C97hIjGW.js';
import { hydrateScenePositionPicker, scenePositionPickerMarkup, sceneDetailHref } from './components-DqADvo3I.js';
import { fillSaveCurrentRentalVehicle, patchSaveCurrentFields, setSaveCurrentSlotActivation, resetSaveCurrentSlotActivation, resetSaveCurrentFields, equipSaveCurrentVehicleCarryMain, currentFieldObject, saveWorkspaceReady, allCurrentFieldObjects, saveImportControl, findCurrentFieldObject, currentSlotStatus } from './sram-CuBZYYNn.js';
import './visual-metasprites-DJP54-bV.js';
import './package-schema-paths-gCIepLXx.js';
import './story-event-links-CRjG_25M.js';
import './record-BUqGpJTU.js';
import './text-record-structure-editor-nkc-6gHL.js';
import './page-runtime-paths-C0wxpxf1.js';
import './interface-pattern-banks-DmLVA2TH.js';
import './emulator-ZO0nE59-.js';
import './chr-CWVtqLX5.js';

const STATE_MASK = 0xc0;
const STATES = Object.freeze([
  {value: 0x00, label: ""},
  {value: 0x80, label: "损"},
  {value: 0xc0, label: "坏"},
]);

function vehicleEquipmentState(raw) {
  if (!Number.isInteger(raw) || raw < 0 || raw > 0xff) return null;
  const high = raw & STATE_MASK;
  return STATES.find(state => state.value === high || (high === 0x40 && state.value === 0x80)) || null;
}

function vehicleEquipmentStateOptions() {
  return STATES;
}

function writeVehicleEquipmentState(raw, state) {
  if (!vehicleEquipmentState(raw) || !STATES.some(entry => entry.value === state)) {
    throw new RangeError("战车装备状态不属于三态");
  }
  return (raw & ~STATE_MASK) | state;
}

// @editor-module 战斗入口引用与编队名称的只读投影。

function battleFormationLabel(formationId) {
  const formation = state.project?.game_data?.battle_test?.formations
    ?.find(row => Number(row.id) === Number(formationId));
  const monsters = state.project?.game_data?.monsters?.records || [];
  return (formation?.slots || []).filter(row => Number(row.count) > 0).map(row => {
    const name = monsters.find(monster => Number(monster.id) === Number(row.monster_id))?.name
      || `monster:${Number(row.monster_id).toString(16).toUpperCase().padStart(2, "0")}`;
    return `${name}×${row.count}`;
  }).join(" + ") || "—";
}

function battleEntranceReferences(entries) {
  const scenes = state.project?.scenes?.editable_scenes || [];
  const seen = new Set();
  return entries.flatMap(row => {
    const scene = scenes.find(item => Number(item.id) === row.scene_id);
    if (!scene) return [];
    const key = `${row.scene_id}:${row.object_key}:${row.zone_id ?? ""}:${row.x},${row.y}`;
    if (seen.has(key)) return [];
    seen.add(key);
    const point = row.x != null && row.x < scene.width && row.y < scene.height;
    const location = row.kind === "random" ? `随机遭遇${row.scene_id === 0 ? ` · 区块 ${row.x}, ${row.y}` : ""}`
      : row.entrance_coordinates || (point ? `${row.x}, ${row.y}` : row.actor_uid ? "剧情角色" : "");
    const objectKey = row.entrance_object_key || row.object_key;
    return [{row, scene, point, location, objectKey}];
  });
}

// @editor-module 汇集当前电池存档的字段。


const LOCATION_FIELDS = Object.freeze([
  ["scene_id", "当前场景 ID"],
  ["camera_x", "相机 tile 原点 X"],
  ["camera_y", "相机 tile 原点 Y"],
]);

const VEHICLE_EQUIPMENT_CATEGORIES = Object.freeze({
  main_gun: "tank-main-gun", sub_gun: "tank-sub-gun", special: "tank-special",
  c_unit: "tank-c-unit", engine: "tank-engine", chassis: "tank-chassis",
});
const VEHICLE_MOUNT_LABELS = Object.freeze({
  main_gun: "主炮", sub_gun: "副炮", special: "S-E",
  c_unit: "C 装置", engine: "引擎", chassis: "底盘",
});

const SAVE_CATEGORY_LABELS = Object.freeze({
  "save-directory": "存档目录",
  "adventure-settings": "冒险资料",
  "field-location": "队伍位置",
  "global-events": "事件位",
  treasures: "宝箱位",
  wanted: "赏金首",
  "monster-defeat-counts": "怪物类别击破计数",
  "gold-bell-threshold": "金铃通知",
  "field-driveability-state": "队伍驾驶状态",
  "entity-scene-map": "队伍编成",
  roles: "人物",
  "role-names": "人物姓名",
  "role-equipment-effects": "人物装备效果",
  "vehicle-core": "战车属性",
  "vehicle-names": "战车名称",
  "vehicle-mount": "挂载许可",
  "vehicle-equipment": "战车装备",
  "vehicle-equipment-state": "战车装备状态",
  "vehicle-items": "战车道具",
  "vehicle-shell-types": "战车炮弹种类",
  "vehicle-shell-counts": "战车炮弹数量",
  "property-storage": "财产保管",
});

const SAVE_SECTIONS = Object.freeze([
  ["location", "激活"],
  ["party", "人物与战车"],
  ...SAVE_EVENT_SECTIONS,
  ["storage", "财产保管"],
]);

const ENTITY_CATEGORIES = new Set([
  "roles", "role-names", "role-equipment-effects", "vehicle-core", "vehicle-names",
  "vehicle-mount", "vehicle-equipment", "vehicle-equipment-state", "vehicle-items",
  "vehicle-shell-types", "vehicle-shell-counts",
]);

let teleportDestinations = [];

async function prepareSaveVisualComponents() {
  if (state.savePageSection === 'location') return;
  const repository = state.projectRepository;
  await Promise.all([
    prepareEventFlagReferences(),
    prepareSaveVehiclePortraits(),
    ...["vehicle-preset", "item-entry", "shared-indexed-byte-overlays"]
      .map(resourceId => db.getResourceDocument(resourceId, null)),
    db.getDocument("shared-chr-bank", null),
    ...["metatile-page", "metatile-set", "palette-runtime-service"]
      .map(resourceId => db.getResourceDocument(resourceId, null)),
    db.getResourceDocument("vehicle-preset", null).then(document_ => Promise.all(
      (document_?.initial_placement?.records || []).filter(row => row.placed).map(row =>
        db.getResourceDocument(`scene:${Number(row.scene_id).toString(16).toUpperCase().padStart(2, "0")}`, null)))),
    db.getDocument("scene-actor", null),
  ]);
  try {
    const document = await db.getDocument("project.facilities", null);
    if (state.projectRepository === repository) {
      const facilities = document?.facilities || [];
      const facility = facilities.find(item => item.id === "teleport-terminal");
      teleportDestinations = facility?.configuration?.destinations || [];
    }
  } catch {
    if (state.projectRepository === repository) {
      teleportDestinations = [];
    }
  }
}

function fieldId(slot, suffix) {
  return `save.slot.${slot}.${suffix}`;
}

function saveSectionHref(section, slot, anchor) {
  return `?view=save${Number(slot) === 2 ? "&amp;saveSlot=2" : ""}&amp;saveSection=${section}#${anchor}`;
}

function fieldRecord(id) {
  return findCurrentFieldObject(id);
}

function fieldValue(id, source = state.saveCurrentBytes) {
  const object = currentFieldObject(id);
  const value = source === state.saveRomInitialBytes ? object.defaultValue : object.displayValue;
  return Array.isArray(value) ? Uint8Array.from(value) : value;
}

function fieldDirty(id) {
  const object = currentFieldObject(id);
  const mask = object.binding?.allowed_changed_mask;
  return Number.isInteger(mask)
    ? (Number(object.value) & mask) !== (Number(object.defaultValue) & mask)
    : object.edited;
}

function fieldWritable(record) {
  return !record?.acquisitionPending && record?.status === "exact" && record.binding?.editable === true;
}

function categoryOf(record) {
  return String(record.semanticDomain || "save-directory");
}

function categoryLabel(category) {
  return SAVE_CATEGORY_LABELS[category] || category;
}

function displayFieldValue(value) {
  if (value instanceof Uint8Array) {
    return Array.from(value, byte => byte.toString(16).toUpperCase().padStart(2, "0")).join(" ");
  }
  return String(value);
}

function locationGroup(id) {
  const match = /^save\.slot\.(\d+)\.(field_object\.\d+\.)?(scene_id|camera_x|camera_y|x|y)$/.exec(id);
  if (!match) return null;
  return {slot: Number(match[1]), prefix: `save.slot.${match[1]}.${match[2] || ""}`,
    object: Boolean(match[2])};
}

function locationSummary(group) {
  const sceneId = fieldValue(`${group.prefix}scene_id`);
  const position = group.object
    ? {x: fieldValue(`${group.prefix}x`), y: fieldValue(`${group.prefix}y`)}
    : playerTileFromSaveCamera(fieldValue(`${group.prefix}camera_x`),
      fieldValue(`${group.prefix}camera_y`));
  const scene = (state.project?.scenes?.editable_scenes || [])
    .find(entry => Number(entry.id) === Number(sceneId));
  return `${scene?.name || `场景 ${sceneId}`} · ${position.x}, ${position.y}`;
}

function fieldObjectDirectionLabel(record) {
  const match = /^save\.slot\.\d+\.field_object\.(\d+)\.state_raw$/.exec(record.fieldId);
  if (!match || Number(match[1]) >= 11) return null;
  const index = Number(match[1]);
  return index < 8 ? `战车 ${index + 1} · 朝向选择值` : `出租战车 ${index - 7} · 朝向`;
}

function fieldObjectVehicleLabel(record) {
  const match = /^save\.slot\.\d+\.field_object\.([0-7])\.(scene_id|x|y)$/.exec(record.fieldId);
  if (!match) return null;
  const part = {scene_id: "场景", x: "X 坐标", y: "Y 坐标"}[match[2]];
  return `战车 ${Number(match[1]) + 1} · ${part}`;
}

function saveVehicleLabel(vehicle) {
  return vehicle >= 8 && vehicle <= 10 ? `出租战车 ${vehicle - 7}` : `战车位 ${vehicle + 1}`;
}

function saveFieldLabel(record) {
  const label = fieldObjectDirectionLabel(record) || fieldObjectVehicleLabel(record)
    || record.binding?.label || record.valueMeaning || record.fieldId;
  const rental = /^save\.slot\.\d+\.(?:(?:vehicle|field_object)\.(8|9|10)\.|active_rental_vehicle_preset\.([0-2])$)/.exec(record.fieldId);
  return rental ? label.replace(/^(?:战车位|(?:活动)?出租战车位|出租实例槽|场景对象槽) \d+/,
    saveVehicleLabel(rental[1] === undefined ? Number(rental[2]) + 8 : Number(rental[1]))) : label;
}

function vehicleSlotEntries(slot, emptyLabel = "未绑定战车") {
  return [
    {value: "255", label: emptyLabel},
    ...Array.from({length: 11}, (_, index) => {
      const id = fieldId(slot, `vehicle.${index}.name_codes`);
      const name = saveEntityName(id, "");
      return {value: String(index), label: `${saveVehicleLabel(index)} · ${name || "未命名"}`};
    }),
  ];
}

/** 出租槽位的「未使用」值：255。候选项由载具 preset 用途视图提供。 */
const RENTAL_UNSET_ENTRY = Object.freeze([{value: 255, label: "未租用"}]);

function armorInventoryEntries(slot, role) {
  const inventory = fieldValue(fieldId(slot, `role.${role}.inventory`));
  const items = state.project?.game_data?.items?.records || [];
  return [
    {value: "255", label: "无已装备护具"},
    ...Array.from({length: 8}, (_, index) => {
      const itemId = inventory[index];
      const item = items.find(entry => Number(entry.id) === itemId);
      return {value: String(index),
        label: `库存槽 ${index + 1} · ${item?.name || (itemId === 0 ? "空" : `物品 ${itemId}`)}`};
    }),
  ];
}

function compositeFieldMarkup(record, bytes, indices = Array.from(bytes, (_, index) => index)
  .filter(index => index < 4 || index > 6)) {
  const slot = Number(record.binding.slot);
  const roles = ["hunter", "mechanic", "soldier"];
  const labels = ["猎人", "机械师", "士兵"];
  const rows = indices.map(index => {
    const value = bytes[index];
    let label, moduleId, items;
    if (index < 3) {
      label = `${labels[index]} · 当前战车`;
      moduleId = "save-vehicle";
      items = vehicleSlotEntries(slot);
    } else if (index === 3) {
      label = "第四队伍实体 · 战车描述符";
      moduleId = "save-vehicle";
      items = vehicleSlotEntries(slot, "无第四实体");
    } else {
      label = `${labels[index - 7]} · 已装备护具库存槽`;
      moduleId = "save-role";
      items = armorInventoryEntries(slot, roles[index - 7]);
    }
    const componentAttributes = `data-save-composite-index="${index}" data-save-composite-field="${esc(record.fieldId)}"`;
    const picker = referencePickerMarkup({moduleId, value, label, items, compact: true,
      componentAttributes});
    return `<div class="save-composite-entry"><span>${esc(label)}</span>${picker}</div>`;
  });
  return `<div class="save-composite-field">
    ${rows.join("")}
  </div>`;
}

function catalogValueMarkup(record) {
  const value = fieldValue(record.fieldId);
  const binding = record.binding || {};
  const label = saveFieldLabel(record);
  if (record.acquisitionPending && !/^save\.slot\.[12]\.vehicle\.\d+\.(equipment|equipment_state|equipped|mount_permission)\./.test(record.fieldId)
      && !["vehicle-equipped-bits", "vehicle-mount-permission-bits",
        "vehicle-equipment-damage-bit"].includes(binding.derivation)) {
    const shell = /\.shell_type\./.test(record.fieldId);
    const item = shell && (state.project?.game_data?.items?.records || []).find(row => Number(row.id) === value);
    return `<output>${esc(shell ? value === 255 ? "空" : item?.name || value : displayFieldValue(value))}</output>`;
  }
  if (/^save\.slot\.\d+\.vehicle\.\d+\.equipment_state\.(main_gun|sub_gun|special|c_unit|engine|chassis)$/.test(record.fieldId)) {
    return vehicleEquipmentStateMarkup(record.fieldId, Number(value),
      label, fieldWritable(record));
  }
  if (/^save\.slot\.\d+\.vehicle\.\d+\.equipment_state\.generic_[78]$/.test(record.fieldId)) {
    return `<output aria-label="${esc(label)}">${esc(value)}</output>`;
  }
  if (["vehicle-equipped-bits", "vehicle-mount-permission-bits",
    "vehicle-equipment-damage-bit"].includes(binding.derivation)) {
    const hint = binding.derivation === "vehicle-equipped-bits"
      ? "仅具名装备位可编辑" : binding.derivation === "vehicle-mount-permission-bits"
      ? "仅高三位可编辑" : "仅损伤位可编辑";
    return `<output aria-label="${esc(label)}" title="${hint}">$${Number(value)
      .toString(16).toUpperCase().padStart(2, "0")}</output>`;
  }
  const group = locationGroup(record.fieldId);
  if (group) {
    const index = group.object ? Number(group.prefix.split(".").at(-2)) : null;
    return `<a class="save-location-link" href="${saveSectionHref(
      `party&amp;saveEntity=${group.object ? `vehicle-${index}` : "team"}`, group.slot, group.object
        ? `save-object-position-${group.slot}-${index}`
        : `save-party-position-${group.slot}`)}">${esc(locationSummary(group))}</a>`;
  }
  if (categoryOf(record) === "property-storage") {
    const storageSlot = Number(record.fieldId.split(".").at(-1));
    return `<a href="${saveSectionHref("storage", binding.slot,
      `save-property-storage-${binding.slot}-${storageSlot}`)}" title="财产保管槽 ${storageSlot + 1}" aria-label="财产保管槽 ${storageSlot + 1}">↗</a>`;
  }
  if (binding.encoding === "bit" && Number.isInteger(binding.flag_id)) {
    return `<a href="${esc(saveEventHref(binding.slot, binding.flag_id))}" title="事件位" aria-label="事件位">↗</a>`;
  }
  if (record.fieldId === "save.directory.selected_slot") {
    return `<select aria-label="当前选中槽号" data-save-page-field="${esc(record.fieldId)}">
      <option value="1" ${value === 1 ? "selected" : ""}>槽 1</option>
      <option value="2" ${value === 2 ? "selected" : ""}>槽 2</option>
    </select>`;
  }
  if (/^save\.directory\.slot\.\d+\.valid_marker$/.test(record.fieldId)) {
    return `<a href="${saveSectionHref("location", binding.slot,
      `save-slot-activation-${binding.slot}`)}" title="槽 ${esc(binding.slot)} 激活状态" aria-label="槽 ${esc(binding.slot)} 激活状态">↗</a>`;
  }
  if (/^save\.directory\.slot\.\d+\.checksum_(low|high)$/.test(record.fieldId)) {
    const low = fieldValue(`save.directory.slot.${binding.slot}.checksum_low`);
    const high = fieldValue(`save.directory.slot.${binding.slot}.checksum_high`);
    return `${genericFieldMarkup(record, value)}
      <output>槽校验和 $${esc((low + high * 256).toString(16).toUpperCase().padStart(4, "0"))}</output>`;
  }
  if (record.fieldId.endsWith(".adventure_data_settings")) {
    return renderModuleComponent("save-container", "adventure-settings", {
      value, fieldId: record.fieldId,
    });
  }
  if (record.fieldId.endsWith(".undriveable_party_vehicle_negative_count")) {
    return renderModuleComponent("save-container", "driveability", {
      value, fieldId: record.fieldId,
    });
  }
  if (record.fieldId.endsWith(".party_entity_state_raw")
      && binding.min === 0 && binding.max === 4) {
    return boundedNumberFieldMarkup({
      fieldId: record.fieldId, label,
      value, min: binding.min, max: binding.max,
      unit: "位",
    });
  }
  const directionLabel = fieldObjectDirectionLabel(record);
  if (directionLabel) {
    return renderModuleComponent("save-container", "direction", {
      value, label: directionLabel, fieldId: record.fieldId,
    });
  }
  if (record.fieldId.endsWith(".entity_scene_object_slots")
      && value instanceof Uint8Array && value.length === 10) {
    return compositeFieldMarkup(record, value);
  }
  if (binding.encoding === "bitset") {
    return `<a href="${esc(saveEventHref(binding.slot, 0, {
      treasure: record.fieldId.endsWith(".treasure_flags"),
    }))}">查看位图</a>`;
  }
  if (/^save\.slot\.\d+\.role\.(hunter|mechanic|soldier)\.(equipment|inventory)$/.test(record.fieldId)
      && value instanceof Uint8Array) {
    const equipment = record.fieldId.endsWith(".equipment");
    return `<div class="save-item-slots">${Array.from(value, (item, index) =>
      `<div>槽 ${index + 1}${equipment ? itemPickerMarkup({
        records: state.project?.game_data?.items?.records || [], value: item,
        label: `${label} · 槽 ${index + 1}`,
        fieldId: record.fieldId, arrayIndex: index, compact: true,
        disabled: !fieldWritable(record),
        allowedCategories: HUMAN_EQUIPMENT_CATEGORIES,
      }) : itemPickerMarkup({
        records: state.project?.game_data?.items?.records || [], value: item,
        label: `${label} · 槽 ${index + 1}`,
        fieldId: record.fieldId, arrayIndex: index, compact: true,
        disabled: !fieldWritable(record),
        allowedCategories: HUMAN_CATEGORIES,
      })}</div>`).join("")}</div>`;
  }
  if (record.fieldId.endsWith(".name_codes") && value instanceof Uint8Array
      && state.project?.text_record_encoding) {
    return saveNameFieldInputMarkup(currentFieldObject(record.fieldId), {label});
  }
  const equipment = /^save\.slot\.\d+\.vehicle\.\d+\.equipment\.([a-z_0-9]+)$/.exec(record.fieldId);
  const vehicleItem = /^save\.slot\.\d+\.vehicle\.\d+\.item\.\d+$/.test(record.fieldId);
  if (equipment || vehicleItem) {
    const category = equipment ? VEHICLE_EQUIPMENT_CATEGORIES[equipment[1]] : "tank-item";
    return itemPickerMarkup({
      records: state.project?.game_data?.items?.records || [], value,
      label, fieldId: record.fieldId,
      compact: true, disabled: !fieldWritable(record),
      allowedCategories: category ? [category] : TANK_EQUIPMENT_CATEGORIES,
    });
  }
  if (/^save\.slot\.\d+\.vehicle\.\d+\.shell_type\.\d+$/.test(record.fieldId)) {
    const shells = state.project?.game_data?.shells?.records || [];
    return itemPickerFieldMarkup({shells, value, label,
      allowedCategories: ["shell"], emptyValue: 255, emptyLabel: "—",
      controlMarkup: `<input type="hidden" data-save-page-field="${esc(record.fieldId)}"
        value="${esc(value)}">`});
  }
  if (binding.item_resource_domain === "item-entry"
      || (["vehicle-items", "vehicle-equipment"].includes(categoryOf(record))
        && binding.control === "select" && binding.min === 0 && binding.max === 221)) {
    return itemPickerMarkup({
      records: state.project?.game_data?.items?.records || [], value,
      label, fieldId: record.fieldId,
      compact: true, allowedCategories: ITEM_CATEGORIES,
    });
  }
  if (binding.control === "checkbox" || binding.encoding === "bit") {
    return `<label class="check"><input type="checkbox" data-save-page-field="${esc(record.fieldId)}"
      ${record.acquisitionPending || record.statusUnavailable ? "disabled" : ""} ${value ? "checked" : ""}> ${value ? "开" : "关"}</label>`;
  }
  if ((["wanted", "monster-defeat-counts", "gold-bell-threshold"].includes(categoryOf(record))
      || record.fieldId.endsWith(".gold"))
      && Number.isInteger(binding.min)
      && Number.isInteger(binding.max)) {
    return boundedNumberFieldMarkup({
      fieldId: record.fieldId, label,
      value, min: binding.min, max: binding.max,
      zeroLabel: categoryOf(record) === "wanted" ? "未击破" : "",
      unit: categoryOf(record) === "wanted" ? "级"
        : categoryOf(record) === "monster-defeat-counts" ? "次"
          : categoryOf(record) === "gold-bell-threshold" || record.fieldId.endsWith(".gold")
            ? "G" : "",
      disabled: false,
    });
  }
  if (record.fieldId.endsWith(".scene_id")) {
    const scene = (state.project?.scenes?.editable_scenes || [])
      .find(entry => Number(entry.id) === Number(value));
    return `${genericFieldMarkup(record, value)} ${esc(scene ? scene.name : "")}`;
  }
  return genericFieldMarkup(record, value);
}

function byteSequenceMarkup(record, value) {
  return `<input class="inline-data-input" type="text" data-save-page-bytes="${esc(record.fieldId)}"
    aria-label="${esc(saveFieldLabel(record))}" value="${esc(displayFieldValue(value))}"
    title="按顺序输入十六进制字节">`;
}

function genericFieldMarkup(record, value) {
  if (value instanceof Uint8Array) return byteSequenceMarkup(record, value);
  const binding = record.binding || {};
  const max = binding.max ?? (binding.encoding === "u24le" ? 0xffffff
    : binding.encoding === "u16le" ? 0xffff : 255);
  const unit = record.fieldId.endsWith(".gold") ? "G"
    : categoryOf(record) === "vehicle-shell-counts" ? "发"
      : categoryOf(record) === "monster-defeat-counts" ? "次"
        : "";
  return boundedNumberFieldMarkup({fieldId: record.fieldId,
    label: saveFieldLabel(record),
    value, min: binding.min ?? 0, max, unit});
}

function supplementalSection(record) {
  const category = categoryOf(record);
  if (["field-location", "field-driveability-state"].includes(category)) return null;
  if (ENTITY_CATEGORIES.has(category) || category === "entity-scene-map") return null;
  if (["global-events", "treasures", "property-storage", "wanted"].includes(category)) return null;
  if (/^save\.directory\.slot\.\d+\.valid_marker$/.test(record.fieldId)) return null;
  if (/^save\.slot\.\d+\.(?:scene_id|camera_x|camera_y)$/.test(record.fieldId)) return null;
  if (/^save\.slot\.\d+\.active_rental_vehicle_preset\.[0-2]$/.test(record.fieldId)) return null;
  if (/^save\.slot\.\d+\.(?:global_event_flag|treasure_collected_flag)\./.test(record.fieldId)) return null;
  if (/^save\.slot\.\d+\.field_object\.\d+\.(?:scene_id|x|y)$/.test(record.fieldId)) return null;
  if (/^save\.slot\.\d+\.field_object\.(?:[0-9]|10)\.state_raw$/.test(record.fieldId)) return null;
  return category;
}

function supplementalRecords(slot, section) {
  return allCurrentFieldObjects().filter(record =>
    (record.binding?.slot == null || Number(record.binding.slot) === slot)
    && !/^save\.slot\.\d+\.vehicle\.\d+\.(main_gun|sub_gun|special|c_unit|engine|chassis)_damaged$/.test(record.fieldId)
    && supplementalSection(record) === section);
}

function vehicleEquipmentStateMarkup(fieldId, raw, label, editable) {
  const state = vehicleEquipmentState(raw);
  if (!state) return `<output aria-label="${esc(label)}">${esc(raw)}</output>`;
  if (!editable) return `<output aria-label="${esc(label)}">${esc(state.label || "正常")}</output>`;
  return `<select class="inline-data-select" data-save-equipment-state-field="${esc(fieldId)}"
    aria-label="${esc(label)}">${vehicleEquipmentStateOptions().map(option =>
      `<option value="${option.value}" ${option.value === state.value ? "selected" : ""}>${esc(option.label || "正常")}</option>`
    ).join("")}</select>`;
}

function fieldGroupIdentity(record, category) {
  const role = /^save\.slot\.\d+\.role\.(hunter|mechanic|soldier)\./.exec(record.fieldId)?.[1];
  if (role) return {id: role, label: {hunter: "猎人", mechanic: "机械师", soldier: "士兵"}[role]};
  const vehicle = /^save\.slot\.\d+\.vehicle\.(\d+)\./.exec(record.fieldId)?.[1];
  if (vehicle !== undefined) return {id: `vehicle-${vehicle}`, label: saveVehicleLabel(Number(vehicle))};
  const object = /^save\.slot\.\d+\.field_object\.(\d+)\./.exec(record.fieldId)?.[1];
  if (object !== undefined) return {id: `object-${object}`, label: Number(object) < 8
    ? `战车 ${Number(object) + 1} · 位置` : `场景对象槽 ${Number(object) + 1}`};
  return {id: category, label: categoryLabel(category)};
}

function actorPortrait(type, label) {
  return type === null ? "" : renderModuleComponent("actor-type", "preview", {
    value: type, label, compact: true,
    scale: 3,
  });
}

function rolePortrait(role, label) {
  const roleIndex = {hunter: 0, mechanic: 1, soldier: 2}[role];
  return actorPortrait(partyAliveActorType(
    db.peekDocument(VISUAL_ACTORS_RESOURCE_ID, null), roleIndex,
  ), label);
}

function saveVehiclePortrait(slot, vehicle, label) {
  return renderModuleComponent("save-vehicle", "portrait", {
    vehicle, chassisId: fieldValue(fieldId(slot, `vehicle.${vehicle}.equipment.chassis`)),
    presetId: vehicle >= 8 && vehicle <= 10
      ? fieldValue(fieldId(slot, `active_rental_vehicle_preset.${vehicle - 8}`)) : null,
    presets: state.project?.game_data?.vehicles?.presets || [], label,
  });
}

function fieldGroupPreview(group, category) {
  if (["roles", "role-names", "role-equipment-effects"].includes(category)) {
    return rolePortrait(group.id, `${group.label}形象`);
  }
  if (!category.startsWith("vehicle-")) return "";
  const vehicle = Number(/^vehicle-(\d+)$/.exec(group.id)?.[1]);
  const slot = Number(/^save\.slot\.(\d+)\./.exec(group.entries[0]?.id)?.[1]);
  return saveVehiclePortrait(slot, vehicle, `${group.label}形象`);
}

function saveEntityName(id, fallback) {
  const record = fieldRecord(id);
  const value = record && fieldValue(id);
  const encoding = state.project?.text_record_encoding;
  if (!(value instanceof Uint8Array) || !encoding) return fallback;
  return currentFieldObject(id).nameText || fallback;
}

function entityRecords(records, slot, kind, id) {
  const prefix = fieldId(slot, `${kind}.${id}.`);
  return records.filter(record => record.fieldId.startsWith(prefix)
    && (ENTITY_CATEGORIES.has(categoryOf(record)) || categoryOf(record) === "entity-scene-map")
    && !/^save\.slot\.\d+\.vehicle\.\d+\.(main_gun|sub_gun|special|c_unit|engine|chassis)_damaged$/.test(record.fieldId));
}

function vehicleCarryRows(records) {
  const byColumn = new Map(records.map(record => [Number(record.binding?.equipment_column), record]));
  const items = state.project?.game_data?.items?.records || [];
  return Array.from({length: 8}, (_, column) => {
    const record = byColumn.get(column);
    if (!record) return {
      id: `missing:${column}`, label: `携带 ${column + 1}`,
      itemMarkup: '<span aria-disabled="true">—</span>',
      stateMarkup: "—", statusMarkup: "—",
    };
    const entry = fieldEntry(record);
    const value = Number(fieldValue(record.fieldId));
    const item = items.find(candidate => Number(candidate.id) === value);
    const slotId = record.fieldId.split(".").at(-1);
    const equippedId = record.fieldId.replace(".equipment.", ".equipped.");
    const equippedField = fieldRecord(equippedId);
    const candidates = item?.mountable_slots || [];
    const selected = equippedField && Number(fieldValue(equippedId)) === 1;
    const stateId = record.fieldId.replace(".equipment.", ".equipment_state.");
    const stateField = fieldRecord(stateId);
    const rawState = stateField ? Number(fieldValue(stateId)) : null;
    const editableSlot = value !== 0 && fieldWritable(equippedField)
      && candidates.length === 1 && candidates[0] === slotId;
    const prefix = record.fieldId.split(".equipment.")[0];
    const mainId = `${prefix}.equipment.main_gun`;
    const secondId = `${prefix}.equipment.sub_gun`;
    const maskId = `${prefix}.equipped_mask_raw`;
    const maskValue = fieldRecord(maskId) ? Number(fieldValue(maskId)) : 0;
    const otherExtra = column === 6 ? "generic_8" : "generic_7";
    const mainItem = items.find(candidate => Number(candidate.id) === Number(
      fieldRecord(mainId) && fieldValue(mainId)));
    const canonicalParts = ["special", "c_unit", "engine", "chassis"]
      .every((name, index) => {
        const id = `${prefix}.equipment.${name}`;
        const stateId = `${prefix}.equipment_state.${name}`;
        if (!fieldRecord(id) || !fieldRecord(stateId)) return false;
        const part = Number(fieldValue(id));
        const partState = Number(fieldValue(stateId));
        const mounted = Boolean(maskValue & (0x20 >> index));
        const catalog = items.find(candidate => Number(candidate.id) === part);
        return part === 0 ? !mounted && partState === 0
          : mounted && catalog?.mountable_slots?.length === 1
            && catalog.mountable_slots[0] === name;
      });
    const repackMain = column >= 6 && fieldWritable(record) && fieldWritable(fieldRecord(mainId)) && rawState === 0
      && candidates.length === 1 && candidates[0] === "main_gun"
      && (maskValue & 0xc3) === 0x80 && canonicalParts
      && fieldRecord(`${prefix}.equipment.${otherExtra}`)
      && Number(fieldValue(`${prefix}.equipment.${otherExtra}`)) === 0
      && fieldRecord(`${prefix}.equipment_state.${otherExtra}`)
      && Number(fieldValue(`${prefix}.equipment_state.${otherExtra}`)) === 0
      && mainItem?.mountable_slots?.length === 1
      && mainItem.mountable_slots[0] === "main_gun"
      && fieldRecord(secondId) && Number(fieldValue(secondId)) === 0
      && fieldRecord(`${prefix}.equipment_state.sub_gun`)
      && Number(fieldValue(`${prefix}.equipment_state.sub_gun`)) === 0
      && fieldRecord(`${prefix}.equipped.main_gun`)
      && Number(fieldValue(`${prefix}.equipped.main_gun`)) === 1;
    const stateLabel = `携带 ${column + 1} 状态`;
    const stateMarkup = rawState === null ? "—" : `<span title="${esc(
      `${stateLabel} · 原始 $${rawState.toString(16).toUpperCase().padStart(2, "0")}`)}">${
      vehicleEquipmentStateMarkup(stateId, rawState, stateLabel,
        fieldWritable(stateField))}</span>`;
    return {
      id: record.fieldId, label: `携带 ${column + 1}`,
      labelMarkup: `<span data-save-catalog-field="${esc(entry.id)}"
        title="${esc(entry.title)}">携带 ${column + 1}</span>`,
      address: record.physical,
      itemMarkup: itemPickerMarkup({records: items, value,
        label: `携带 ${column + 1} · 物品`, fieldId: record.fieldId,
        compact: true, disabled: !fieldWritable(record),
        allowedCategories: TANK_EQUIPMENT_CATEGORIES}),
      stateMarkup: editableSlot || repackMain ? `<select class="inline-data-select"
        data-save-carry-assignment="${esc(equippedId)}" aria-label="携带 ${column + 1} 所在槽">
        <option value="" ${selected ? "" : "selected"}>不装备</option>
        <option value="${repackMain ? "main_gun" : esc(slotId)}" ${selected ? "selected" : ""}>${
          esc(VEHICLE_MOUNT_LABELS[repackMain ? "main_gun" : slotId])}</option></select>`
        : `<output title="${esc(equippedId)}">${selected ? esc(VEHICLE_MOUNT_LABELS[slotId])
          : column >= 6 ? "—" : "不装备"}</output>`,
      statusMarkup: stateMarkup,
      actionsMarkup: `${entry.resetMarkup}${stateField ? resetToOriginalButton(stateId, {
        dirty: fieldDirty(stateId), title: `重置${stateLabel}`,
        disabled: stateField.acquisitionPending,
      }) : ""}`,
    };
  });
}

function entityEquipmentRows(records) {
  if (records.some(record => categoryOf(record) === "vehicle-equipment")) {
    return vehicleCarryRows(records);
  }
  return records.flatMap(record => {
    const entry = fieldEntry(record);
    const value = fieldValue(record.fieldId);
    const labelMarkup = `<span data-save-catalog-field="${esc(entry.id)}"
      title="${esc(entry.title)}">${esc(entry.label)}</span>`;
    if (value instanceof Uint8Array
        && /^save\.slot\.\d+\.role\.(hunter|mechanic|soldier)\.(equipment|inventory)$/.test(record.fieldId)) {
      const equipment = record.fieldId.endsWith(".equipment");
      return Array.from(value, (item, index) => ({
        id: `${record.fieldId}:${index}`,
        label: `携带 ${index + 1}`,
        labelMarkup: index === 0 ? `${labelMarkup}<small>携带 1</small>` : `携带 ${index + 1}`,
        address: Number.isInteger(record.physical?.offset)
            && record.physical.length === value.length
          ? {...record.physical, offset: record.physical.offset + index,
            end_exclusive: record.physical.offset + index + 1, length: 1} : null,
        itemMarkup: itemPickerMarkup({
          records: state.project?.game_data?.items?.records || [], value: item,
          label: `${entry.label} · 槽 ${index + 1}`,
          fieldId: record.fieldId, arrayIndex: index, compact: true,
          disabled: !fieldWritable(record),
          allowedCategories: equipment ? HUMAN_EQUIPMENT_CATEGORIES : HUMAN_CATEGORIES,
        }),
        stateMarkup: "—", statusMarkup: "—",
        resetMarkup: index === 0 ? entry.resetMarkup : "",
      }));
    }
    return [{
      id: entry.id, label: entry.label, labelMarkup,
      address: record.physical,
      itemMarkup: entry.valueMarkup, resetMarkup: entry.resetMarkup,
    }];
  });
}

function entityGroups(records, {vehicle = null} = {}) {
  const sectionKinds = {"role-names": "fields", roles: "fields",
    "role-equipment-effects": "equipment-state", "vehicle-core": "fields",
    "vehicle-names": "fields", "vehicle-mount": "crew",
    "vehicle-equipment": "equipment", "vehicle-equipment-state": "equipment-state",
    "vehicle-items": "inventory", "vehicle-shell-types": "shells",
    "vehicle-shell-counts": "shells", "entity-scene-map": "placement"};
  const sectionLabels = {fields: "字段", equipment: "装备",
    "equipment-state": "装备状态", inventory: "携带物", shells: "炮弹",
    crew: "挂载许可", placement: "位置", other: "其他字段"};
  const groups = new Map();
  const anchors = new Map();
  for (const record of records) {
    if (categoryOf(record) === "vehicle-equipment-state") continue;
    const roleSlot = /^save\.slot\.\d+\.role\.(hunter|mechanic|soldier)\.(equipment|inventory)$/.exec(record.fieldId);
    const kind = roleSlot ? roleSlot[2] : sectionKinds[categoryOf(record)] || "other";
    if (roleSlot?.[2] === "inventory") {
      const slot = /^save\.slot\.(\d+)\./.exec(record.fieldId)?.[1];
      anchors.set(kind, `save-role-${slot}-${roleSlot[1]}-inventory`);
    }
    if (!groups.has(kind)) groups.set(kind, []);
    groups.get(kind).push(record);
  }
  return [...groups].map(([kind, fields]) => ({
    id: kind, kind, anchor: anchors.get(kind), label: kind === "inventory" && fields.some(record =>
      categoryOf(record) === "vehicle-items") ? "战车道具" : sectionLabels[kind], fields,
    order: vehicle !== null && vehicle < 8 && kind === "equipment" ? -1 : undefined,
    headingSuffixMarkup: fields.some(record => record.acquisitionPending)
      ? `<small class="save-acquisition-note">未取得 · 显示取得时写入的模板值 <a class="editor-inline-link"
          href="?view=vehicles&amp;record=${vehicle}"
          title="战车预设" aria-label="战车预设">↗</a></small>` : "",
    renderFields: items => ["equipment", "inventory"].includes(kind)
      ? entityDetailEquipmentMarkup({rows: entityEquipmentRows(items)})
      : entityDetailFieldTableMarkup({fields: items.map(record => {
        const entry = fieldEntry(record);
        return {...entry,
          labelMarkup: `<span data-save-catalog-field="${esc(entry.id)}"
            title="${esc(entry.title)}">${esc(entry.label)}</span>`,
        };
      })}),
  }));
}

function entityDetailsMarkup(slot) {
  const records = allCurrentFieldObjects();
  const roles = [["hunter", "猎人"], ["mechanic", "机械师"], ["soldier", "士兵"]]
    .map(([role, fallback]) => ({
      id: `role-${role}`,
      label: saveEntityName(fieldId(slot, `role.${role}.name_codes`), fallback),
      previewMarkup: rolePortrait(role, `${fallback}形象`),
      physicalRows: entityRecords(records, slot, "role", role).map(record => ({
        label: fieldEntry(record).label, address: record.physical,
      })).filter(row => row.address),
      groups: [
        {id: "appearance", label: "形象与预览",
          content: rolePortrait(role, `${fallback}形象`)},
        ...entityGroups(entityRecords(records, slot, "role", role)),
        {id: "formation", kind: "placement", label: "编成",
          content: compositeFieldMarkup(fieldRecord(fieldId(slot, "entity_scene_object_slots")),
            fieldValue(fieldId(slot, "entity_scene_object_slots")),
            [rolesIndex(role), rolesIndex(role) + 7])}],
    }));
  const vehicles = Array.from({length: 11}, (_, index) => ({
    id: `vehicle-${index}`,
    label: index >= 8 ? saveVehicleLabel(index)
      : saveEntityName(fieldId(slot, `vehicle.${index}.name_codes`), saveVehicleLabel(index)),
    previewMarkup: saveVehiclePortrait(slot, index, `${saveVehicleLabel(index)}形象`),
    physicalRows: [...entityRecords(records, slot, "vehicle", index),
      ...(index >= 8 ? records.filter(record => record.fieldId.startsWith(fieldId(slot, `field_object.${index}.`))
        || record.fieldId === fieldId(slot, `active_rental_vehicle_preset.${index - 8}`)) : [])].map(record => ({
      label: fieldEntry(record).label, address: record.physical,
    })).filter(row => row.address),
    groups: [
      {id: "appearance", label: "形象与预览",
        content: saveVehiclePortrait(slot, index, `${saveVehicleLabel(index)}形象`)},
      ...(index >= 8 ? [{id: "rental", kind: "placement", order: -2, label: "出租战车",
        content: rentalDetailsMarkup(slot, index)}] : []),
      ...entityGroups(entityRecords(records, slot, "vehicle", index), {vehicle: index}),
      ...(index < 8 ? [{id: "parking", kind: "placement", order: -2, label: "停放位置",
        content: objectPositionsMarkup(slot, index)}] : []),
      {id: "passengers", kind: "crew", label: "乘员", content: vehiclePassengersMarkup(slot, index)}],
  }));
  const teamRecords = records.filter(record => Number(record.binding?.slot) === slot
    && ["field-location", "field-driveability-state"].includes(categoryOf(record))
    && !LOCATION_FIELDS.some(([suffix]) => record.fieldId === fieldId(slot, suffix)));
  const composite = fieldRecord(fieldId(slot, "entity_scene_object_slots"));
  const team = {id: "team", label: "队伍", groups: [
    {id: "fields", label: "字段", fields: teamRecords,
      renderFields: items => entityDetailFieldTableMarkup({fields: items.map(fieldEntry)})},
    {id: "placement", label: "队伍位置", content: locationMarkup(slot)},
    {id: "formation", kind: "placement", label: "队伍编成",
      content: composite ? `<div class="inline-reset-row">${compositeFieldMarkup(composite, fieldValue(composite.fieldId), [3])}${
        resetToOriginalButton(composite.fieldId, {dirty: fieldDirty(composite.fieldId)})}</div>` : ""},
  ]};
  const entities = [team, ...roles, ...vehicles];
  const selected = [state.savePageEntity, team.id]
    .find(id => entities.some(entity => entity.id === id));
  return entityDetailSelectorMarkup({entities,
    selected,
    componentAttributes: `data-save-entity-editor="${slot}"`});
}

function rolesIndex(role) {
  return {hunter: 0, mechanic: 1, soldier: 2}[role];
}

function vehiclePassengersMarkup(slot, vehicle) {
  const passengers = [["hunter", "猎人"], ["mechanic", "机械师"], ["soldier", "士兵"]]
    .filter(([role]) => Number(fieldValue(fieldId(slot, `role.${role}.current_vehicle`))) === vehicle)
    .map(([role, label]) => `<a href="?view=save&amp;saveSlot=${slot}&amp;saveSection=party&amp;saveEntity=role-${role}">${
      esc(saveEntityName(fieldId(slot, `role.${role}.name_codes`), label))}</a>`);
  return passengers.join(" · ") || "—";
}

function fieldEntry(record) {
  const label = saveFieldLabel(record);
  return {
    id: record.fieldId,
    label: `${label}${record.acquisitionPending || fieldWritable(record)
      || ["vehicle-equipped-bits", "vehicle-mount-permission-bits",
        "vehicle-equipment-damage-bit"].includes(record.binding?.derivation) ? "" : " ↛"}`,
    valueMarkup: catalogValueMarkup(record),
    resetMarkup: ["vehicle-equipped-bits", "vehicle-mount-permission-bits",
      "vehicle-equipment-damage-bit"].includes(record.binding?.derivation) ? ""
      : resetToOriginalButton(record.fieldId, {
        dirty: fieldDirty(record.fieldId), title: `重置${label}`,
        disabled: record.acquisitionPending,
      }),
    title: fieldDetailTitle(record),
  };
}

function fieldGroupsMarkup(category, records, {showGroup = true} = {}) {
  const groups = new Map();
  for (const record of records) {
    const identity = fieldGroupIdentity(record, category);
    if (!groups.has(identity.id)) groups.set(identity.id, {...identity, entries: []});
    groups.get(identity.id).entries.push(fieldEntry(record));
  }
  return renderModuleComponent("save-container", "field-groups", {
    showGroup: showGroup && !(groups.size === 1 && groups.has(category)),
    groups: [...groups.values()].map(group => ({
      ...group, previewMarkup: fieldGroupPreview(group, category),
      href: "",
    })),
  });
}

function wantedNameSources() {
  return {
    formations: state.project?.game_data?.battle_test?.formations || [],
    monsters: state.project?.game_data?.monsters?.records || [],
    bountyTable: state.project?.wanted?.bounty_code_table || null,
  };
}

function wantedProgressMarkup(records) {
  const names = wantedNameSources();
  const catalog = saveBattleCatalog();
  const events = eventEntries(Number(records[0]?.binding.slot));
  return renderModuleComponent("save-container", "progress", {
    entries: records.map(record => {
      const target = catalog.wanted.find(row => row.wanted_id === record.binding.wanted_id);
      const claim = target && events.find(entry => !entry.treasure && entry.index === target.claim_flag);
      return {
        id: record.fieldId,
        level: Number(fieldValue(record.fieldId)),
        label: wantedBossName(record.binding?.wanted_id, names),
        monsterId: Number.isInteger(record.binding?.monster_id)
          ? record.binding.monster_id : null,
        min: record.binding?.min ?? 0, max: record.binding?.max ?? 99,
        dirty: fieldDirty(record.fieldId),
        claimMarkup: claim ? claim.record ? publishedEventControlMarkup(claim.record)
          : bitmapEventControlMarkup(claim) : "",
        claimResetMarkup: claim?.record ? resetToOriginalButton(claim.record.fieldId, {
          dirty: fieldDirty(claim.record.fieldId), title: "重置领取状态",
        }) : "",
        entrancesMarkup: saveBattleEntranceMarkup(catalog.entries
          .filter(row => row.wanted_id === record.binding.wanted_id), ""),
        targetHref: `?view=wanted${record.binding.slot === 2 ? "&saveSlot=2" : ""}#wanted-target-${record.binding.wanted_id}`,
      };
    }),
  });
}

function saveSceneReferenceMarkup({sceneId, x = null, y = null, sceneObject = '', ...options}) {
  return scenePositionPickerMarkup({
    entries: state.project?.scenes?.editable_scenes || [], sceneId, x, y, sceneObject,
    readOnly: true, deferCandidates: true,
    componentAttributes: 'data-save-scene-reference', ...options,
  });
}

function saveScenePositionKey(position) {
  return JSON.stringify([Number(position.sceneId), position.x ?? null, position.y ?? null, position.annotations || []]);
}

function saveBattleEntrancePosition({row, scene, point, location, objectKey}) {
  const worldBlock = row.kind === 'random' && Number(scene.id) === 0;
  const cell = row.block_cell_size;
  if (worldBlock && (!Number.isInteger(cell) || cell <= 0))
    throw new TypeError('缺少世界地图遇敌区块尺寸');
  return {sceneId: scene.id,
    x: row.kind !== 'random' && point ? row.x : null,
    y: row.kind !== 'random' && point ? row.y : null,
    sceneObject: objectKey, encounterZone: row.zone_id ?? null,
    label: '遭遇入口', positionText: [location, row.condition].filter(Boolean).join(' · '),
    coordinatesText: row.kind === 'random' ? location : '',
    annotations: worldBlock ? [{kind: 'area', x: row.x * cell, y: row.y * cell,
      width: cell, height: cell, label: location}] : [],
  };
}

function saveBattleEntranceMarkup(entries, separator = " · ") {
  return battleEntranceReferences(entries)
    .map(reference => saveSceneReferenceMarkup(saveBattleEntrancePosition(reference))).join(separator);
}

function battleProgressMarkup(slot) {
  const groups = new Map();
  for (const row of saveBattleCatalog().entries) {
    if (row.wanted_id != null || !row.one_time || row.shadowed_by != null || row.suppression_flag == null) continue;
    if (!groups.has(row.suppression_flag)) groups.set(row.suppression_flag, []);
    groups.get(row.suppression_flag).push(row);
  }
  const entries = eventEntries(slot).filter(entry => !entry.treasure && groups.has(entry.index))
    .sort((left, right) => left.index - right.index);
  return `<section class="panel" data-save-battle-progress><header><h2>一次性战斗</h2></header>
    ${eventTableMarkup(slot, entries, {section: 'battles',
      scenePositions: entry => battleEntranceReferences(groups.get(entry.index)).map(saveBattleEntrancePosition),
      extraColumns: [
      {label: '编队与怪物', cell: entry => [...new Set(groups.get(entry.index).map(row => row.formation_id))]
        .map(id => `<button type="button" class="resource-inline-link" data-resource-target="encounter-formation:${Number(id).toString(16).toUpperCase().padStart(2, '0')}">${esc(battleFormationLabel(id))}</button>`).join(' · ')},
      {label: '遭遇入口', hideWhenEmpty: true, cell: (entry, {primary, renderReference}) => battleEntranceReferences(groups.get(entry.index))
        .map(reference => {
          const position = saveBattleEntrancePosition(reference);
          if (primary && saveScenePositionKey(position) === saveScenePositionKey(primary)) return '';
          return `<div>${eventReferenceLinkMarkup({href: sceneDetailHref(reference.scene, position),
            source: [reference.scene.name, reference.location].filter(Boolean).join(' · '),
            evidence: reference.row.condition})}${renderReference(position)}</div>`;
        }).join('')},
    ]})}${eventPhysicalMarkup(entries)}</section>`;
}

function supplementalMarkup(slot, section) {
  const groups = new Map();
  for (const record of supplementalRecords(slot, section)) {
    const category = categoryOf(record);
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(record);
  }
  const ordered = [...groups].sort((left, right) =>
    categoryLabel(left[0]).localeCompare(categoryLabel(right[0]), "zh-CN"));
  return ordered.map(([category, records]) => `<section class="panel"
    data-save-field-category="${esc(category)}">
    <header><div><h2>${esc(categoryLabel(category))}</h2></div>
      <span>${records.length} 项</span></header>
    ${fieldGroupsMarkup(category, records)}
  </section>`).join("");
}

function wantedMarkup(slot) {
  const records = allCurrentFieldObjects().filter(record => record.binding?.slot === slot
    && categoryOf(record) === "wanted");
  return `<section class="panel" data-save-field-category="wanted">
    <header><h2>赏金首</h2></header>
    ${wantedProgressMarkup(records)}${eventMarkup(slot, "wanted")}
  </section>`;
}

function activationWritable(record) {
  return fieldWritable(record)
    && record.binding?.expected === 0x25
    && JSON.stringify(record.binding?.allowed_raw_values) === JSON.stringify([0, 0x25]);
}

function addressLabel(record) {
  const address = record?.physical;
  if (!Number.isInteger(address?.offset) || !Number.isInteger(address?.length)) return "—";
  const first = address.offset.toString(16).toUpperCase().padStart(4, "0");
  if (address.length === 1) return `sram:${first}`;
  const last = (address.end_exclusive - 1).toString(16).toUpperCase().padStart(4, "0");
  return `sram:${first}–${last}`;
}

function fieldDetailTitle(record, {bit = false} = {}) {
  if (!record) return "";
  const note = record.binding?.derivation === "vehicle-equipped-bits"
    ? "六个具名装备位分别编辑；空物品列不能装备；低两位保持原值"
    : record.binding?.derivation === "vehicle-mount-permission-bits"
    ? "高三位分别编辑；低五位保持原值"
    : record.binding?.derivation === "vehicle-equipment-damage-bit"
    ? "损伤位单独编辑；其他七位保持原值" : "";
  return [`${record.fieldId} · ${addressLabel(record)}${bit ? ` · bit ${record.binding?.bit_index}` : ""}`, note]
    .filter(Boolean).join("\n");
}

function loadingMarkup() {
  return `<section class="panel">
    <header><div><p class="eyebrow">BATTERY SRAM CURRENT</p><h2>存档</h2></div></header>
    <div class="data-editor-toolbar">
      <button class="button ghost" type="button" id="save-byte-map-retry"
        ${state.saveByteMapLoading ? "disabled" : ""}>${
          state.saveError ? "重试准备存档字段" : "正在准备存档字段…"
        }</button>
      <output data-save-working-error${state.saveError ? "" : " hidden"}>${esc(state.saveError)}</output>
    </div>
  </section>`;
}

function slotActivationCard(slot) {
  const status = currentSlotStatus(slot);
  const markerId = `save.directory.slot.${slot}.valid_marker`;
  const marker = fieldRecord(markerId);
  const selected = fieldValue(markerId) === marker.binding?.expected;
  const label = Object.hasOwn(state.saveDraftFields || {}, markerId)
    ? selected ? "激活" : "关闭"
    : status.valid ? "有效" : status.markerValid ? "校验失败" : "未激活";
  return `<div class="table-wrap" data-save-page-activation="${slot}"><table><thead><tr>
    <th>当前状态</th><th>激活</th><th class="reset-column" aria-label="恢复原值" title="恢复原值"></th></tr></thead><tbody><tr>
    <td>${esc(label)}</td>
    <td><label class="check"><input type="checkbox"
      ${selected ? "checked" : ""} data-save-page-activation-field="${esc(markerId)}"
      data-save-page-slot="${slot}" aria-label="激活槽 ${slot}"
      title="${esc(fieldDetailTitle(marker))}"></label></td>
    <td>${resetToOriginalButton(markerId, {dirty: fieldDirty(markerId),
      title: `恢复槽 ${slot} 的激活状态`,
      attributes: {'data-save-page-reset-activation': slot},
    })}</td>
  </tr></tbody></table></div>`;
}

function activationMarkup(slot) {
  return `<section class="panel" id="save-slot-activation-${slot}">
    <header><div><p class="eyebrow">SAVE SLOT</p><h2>激活状态</h2></div>
      <a class="button ghost" href="?view=bytemap-sram">SRAM 字节地图</a></header>
    ${slotActivationCard(slot)}
  </section>`;
}

function locationMarkup(slot) {
  const sceneId = fieldId(slot, "scene_id");
  const sceneRecord = fieldRecord(sceneId);
  const sceneBinding = sceneRecord?.binding || {};
  const scenes = state.project?.scenes?.editable_scenes || [];
  const bounds = suffix => fieldRecord(fieldId(slot, suffix))?.binding || {};
  const position = playerTileFromSaveCamera(fieldValue(fieldId(slot, "camera_x")),
    fieldValue(fieldId(slot, "camera_y")));
  return `<section class="panel" id="save-party-position-${slot}" data-save-page-location="${slot}">
    ${scenePositionPickerMarkup({
      entries: scenes,
      sceneId: fieldValue(sceneId),
      x: position.x,
      y: position.y,
      label: "队伍位置", pointLabel: "角色所在 tile",
      minSceneId: sceneBinding.min ?? 0, maxSceneId: sceneBinding.max ?? 255,
      minX: bounds("camera_x").min ?? 0, maxX: bounds("camera_x").max ?? 255,
      minY: bounds("camera_y").min ?? 0, maxY: bounds("camera_y").max ?? 255,
      footerMarkup: `<div class="scene-position-field-list">${LOCATION_FIELDS.map(([suffix, label]) => {
        const id = fieldId(slot, suffix);
        const record = fieldRecord(id);
        return `<div><div title="${esc(fieldDetailTitle(record))}">${esc(label)}</div>
          ${resetToOriginalButton(id, {
            dirty: fieldDirty(id), title: `重置槽 ${slot} 的${label}`,
          })}</div>`;
      }).join("")}</div>`,
    })}
  </section>`;
}

function objectPositionsMarkup(slot, index) {
  const scenes = state.project?.scenes?.editable_scenes || [];
  const card = (() => {
    const prefix = fieldId(slot, `field_object.${index}.`);
    const scene = fieldRecord(`${prefix}scene_id`);
    const x = fieldRecord(`${prefix}x`);
    const y = fieldRecord(`${prefix}y`);
    const directionId = `${prefix}state_raw`;
    const direction = fieldRecord(directionId);
    if (!scene || !x || !y) return "";
    const label = `战车 ${index + 1}`;
    const specialValueLabels = index === 4 ? {255: "未停放"} : {};
    return `<tr id="save-object-position-${slot}-${index}" data-save-object-position="${slot}-${index}">
      <th scope="row">${esc(label)}</th><td>${scenePositionPickerMarkup({
        entries: scenes, sceneId: fieldValue(`${prefix}scene_id`),
        x: fieldValue(`${prefix}x`), y: fieldValue(`${prefix}y`),
        label, readOnly: ![scene, x, y, direction].every(fieldWritable),
        specialValueLabels,
        footerMarkup: `<div class="scene-position-field-list">${[
          ["scene_id", "场景"], ["x", "X"], ["y", "Y"],
        ].map(([suffix, title]) => {
          const id = `${prefix}${suffix}`;
          return `<div><span>${esc(title)}</span>${resetToOriginalButton(id, {
            dirty: fieldDirty(id), title: `重置${label}的${title}`,
          })}</div>`;
        }).join("")}</div>`,
      })}
      </td><td>${direction && fieldWritable(direction) ? `<div class="save-object-direction">${renderModuleComponent(
        "save-container", "direction", {value: fieldValue(directionId),
          label: `${label} · 朝向`, fieldId: directionId})}
        ${resetToOriginalButton(directionId, {dirty: fieldDirty(directionId),
          title: `重置${label}朝向`})}</div>` : ""}</td>
    </tr>`;
  })();
  return `<section class="panel" data-save-object-positions="${slot}">
    <div class="table-wrap"><table><thead><tr><th>对象槽</th><th>场景与位置</th><th>朝向</th></tr></thead>
      <tbody>${card}</tbody></table></div>
    ${eventEntries(slot).filter(entry => entry.treasure
      ? index === 4 && entry.index === 0x51 : entry.index === index + 8).map(entry =>
      `<div class="save-vehicle-acquisition"><span>${entry.treasure ? '掩埋状态' : '取得状态'}</span>${
        entry.record ? publishedEventControlMarkup(entry.record) : bitmapEventControlMarkup(entry)}
        <a class="editor-inline-link" href="${esc(saveEventHref(slot, entry.index, {treasure: entry.treasure}))}"
          title="战车取得标志详情" aria-label="战车取得标志详情">↗</a></div>`).join('')}
  </section>`;
}

function rentalDetailsMarkup(slot, index) {
  const scenes = state.project?.scenes?.editable_scenes || [];
  const prefix = fieldId(slot, `field_object.${index}.`);
  const presetId = fieldId(slot, `active_rental_vehicle_preset.${index - 8}`);
  const preset = fieldRecord(presetId);
  if (!preset || !["scene_id", "x", "y"].every(suffix => fieldRecord(`${prefix}${suffix}`))) return "";
  const label = saveVehicleLabel(index);
  const direction = fieldRecord(`${prefix}state_raw`);
  const fields = [{...fieldEntry(preset), label: "出租车型",
    valueMarkup: `<div class="save-rental-preset-cell">${vehiclePresetPickerMarkup({
        allowedGroups: ["rental"],
        value: fieldValue(presetId), label: `${label} · 出租车型`,
        extraEntries: RENTAL_UNSET_ENTRY, disabled: !fieldWritable(preset),
        componentAttributes: `data-save-rental-preset="${esc(presetId)}"`})}
        <button class="button" type="button" data-save-rental-fill="${slot}-${index}"
          ${rentalPresetEntries().some(entry => entry.value === Number(fieldValue(presetId))) ? "" : "disabled"}
          title="按出租车型填充" aria-label="按出租车型填充">↻</button></div>`},
    {id: `${prefix}scene_id`, label: "场景与位置", resetMarkup: "",
      valueMarkup: scenePositionPickerMarkup({entries: scenes,
        sceneId: fieldValue(`${prefix}scene_id`), x: fieldValue(`${prefix}x`),
        y: fieldValue(`${prefix}y`), label, specialValueLabels: {254: "初始停用"},
        footerMarkup: `<div class="scene-position-field-list">${[
          ["scene_id", "场景"], ["x", "X"], ["y", "Y"],
        ].map(([suffix, title]) => {
          const id = `${prefix}${suffix}`;
          return `<div><span>${esc(title)}</span>${resetToOriginalButton(id, {
            dirty: fieldDirty(id), title: `重置${label}的${title}`,
          })}</div>`;
        }).join("")}</div>`})},
    ...(direction ? [{...fieldEntry(direction), label: `朝向${fieldWritable(direction) ? "" : " ↛"}`}] : [])];
  return `<div id="save-object-position-${slot}-${index}" data-save-object-positions="${slot}"
    data-save-object-position="${slot}-${index}">${entityDetailFieldTableMarkup({fields})}</div>`;
}

function propertyStorageFieldId(slot, kind, storageSlot) {
  return `save.slot.${slot}.property_storage.${kind}.${storageSlot}`;
}

function propertyStorageRow(slot, storageSlot) {
  const itemId = propertyStorageFieldId(slot, "item", storageSlot);
  const conditionId = propertyStorageFieldId(slot, "paired_condition", storageSlot);
  const conditionRecord = fieldRecord(conditionId);
  if (!fieldRecord(itemId) || !conditionRecord) return "";
  const item = Number(fieldValue(itemId)), condition = Number(fieldValue(conditionId));
  const equipment = item >= conditionRecord.binding?.applicable_item_id_min
    && item <= conditionRecord.binding?.applicable_item_id_max;
  return `<tr id="save-property-storage-${slot}-${storageSlot}" data-property-storage-slot="${storageSlot}">
    <th scope="row">${storageSlot + 1}</th>
    <td>${itemPickerMarkup({
      records: state.project?.game_data?.items?.records || [], value: item,
      label: `槽 ${slot} · 财产保管 ${storageSlot + 1} · 物品`, fieldId: itemId,
      disabled: false, compact: true, allowedCategories: ITEM_CATEGORIES,
    })}</td>
    <td>${equipment
      ? vehicleEquipmentStateMarkup(conditionId, condition,
        `槽 ${slot} · 财产保管 ${storageSlot + 1} · 战车装备状态`, fieldWritable(conditionRecord))
      : `<output aria-label="平行状态原值">${esc(condition)}</output>`}</td>
    <td>${resetToOriginalButton(itemId, {dirty: fieldDirty(itemId), title: "重置物品"})}
      ${resetToOriginalButton(conditionId,
        {dirty: fieldDirty(conditionId), title: "重置平行状态字节"})}</td>
  </tr>`;
}

function propertyStorageMarkup(slot) {
  const rows = Array.from({length: 64}, (_, storageSlot) => propertyStorageRow(slot, storageSlot));
  if (rows.some(row => !row)) return "";
  return `<section class="panel" data-save-page-property-storage="${slot}">
    <header><div><p class="eyebrow">PROPERTY STORAGE</p><h2>财产保管</h2></div></header>
    <div class="table-wrap"><table>
        <thead><tr><th>保管槽</th><th>物品</th><th>战车装备状态</th><th class="reset-column" aria-label="恢复原值" title="恢复原值"></th></tr></thead>
      <tbody>${rows.join("")}</tbody>
    </table></div>
  </section>`;
}

function slotMarkup(slot, section) {
  return `<div data-in-page-tabs-show="${slot}">
    ${section === "location" ? activationMarkup(slot) : ""}
    ${section === "party" ? entityDetailsMarkup(slot) : ""}
    ${section === "battles" ? battleProgressMarkup(slot)
      : section === "wanted" ? wantedMarkup(slot)
        : SAVE_EVENT_SECTIONS.some(([id]) => id === section) ? eventMarkup(slot, section) : ""}
    ${section === "storage" ? propertyStorageMarkup(slot) : ""}
    ${!SAVE_SECTIONS.some(([id]) => id === section) ? supplementalMarkup(slot, section) : ""}
  </div>`;
}

function publishedEventRecords(slot) {
  const bitmaps = ["global_event_flags", "treasure_flags"]
    .map(name => fieldRecord(fieldId(slot, name))?.physical)
    .filter(address => Number.isInteger(address?.offset)
      && Number.isInteger(address?.end_exclusive));
  return allCurrentFieldObjects()
    .filter(record => record.binding?.slot === slot
      && record.binding?.encoding === "bit"
      && bitmaps.some(bitmap => record.physical?.offset >= bitmap.offset
        && record.physical?.end_exclusive <= bitmap.end_exclusive))
    .sort((left, right) => Number(left.binding.record_id ?? left.binding.flag_id)
      - Number(right.binding.record_id ?? right.binding.flag_id));
}

function publishedEventControlMarkup(record) {
  const id = record.fieldId;
  const binding = record.binding;
  const active = Boolean(fieldValue(id));
  const destinationId = Number(binding.destination_id);
  const destination = /^save\.slot\.\d+\.teleport_destination\.\d+\.unlocked$/.test(id)
    && Number.isInteger(destinationId)
    ? teleportDestinations.find(item => Number(item.id) === destinationId) : null;
  return destination
    ? renderModuleComponent("facility-config", "save-destination", {
      name: destination.name, fieldId: id, active, dirty: fieldDirty(id), control: "save",
    })
    : labeledBitmaskMarkup({
      choices: [{value: id, label: active ? binding.true_label || '已置位' : binding.false_label || '未置位'}],
      active: () => active, inputAttributes: () => `data-save-page-field="${esc(id)}"`,
      className: "labeled-bitmask-row",
    });
}

function publishedEventRow(record, referenceCells = '', section = '') {
  const id = record.fieldId;
  const binding = record.binding;
  const treasureBit = /\.treasure_collected_flag\./.test(id);
  const index = Number(treasureBit ? binding.record_id ?? binding.flag_id : binding.flag_id);
  const bitAnchor = ` id="save-event-bit-${binding.slot}-${treasureBit ? "treasure" : "global"}-${
    index.toString(16).toUpperCase().padStart(2, "0")}"`;
  return `<tr${bitAnchor}${treasureBit ? '' : ` data-global-event-flag="${binding.flag_id}"`}>
    ${eventIdentityCells(index, {treasure: treasureBit, record, section})}
    <td>${publishedEventControlMarkup(record)}</td>
    ${referenceCells}
    <td>${resetToOriginalButton(id, {
      dirty: fieldDirty(id), title: `重置${binding.label || id}`,
    })}</td>
  </tr>`;
}

function unresolvedBitsets(slot) {
  const fields = allCurrentFieldObjects();
  return fields.filter(record => record.binding?.slot === slot
      && record.binding?.encoding === "bitset")
    .map(bitmap => {
      const raw = fieldValue(bitmap.fieldId);
      const first = bitmap.physical.offset;
      const last = bitmap.physical.end_exclusive;
      const published = new Set(fields.filter(record => record.binding?.slot === slot
          && record.binding?.encoding === "bit"
          && record.physical?.offset >= first && record.physical?.end_exclusive <= last)
        .map(record => (record.physical.offset - first) * 8 + record.binding.bit_index));
      const bits = [];
      for (let index = 0; index < raw.length * 8; index += 1) {
        if (published.has(index)) continue;
        bits.push({
          index,
          active: (raw[Math.floor(index / 8)] & (1 << (index % 8))) !== 0,
        });
      }
      return {bitmap, bits};
    });
}

function eventEntries(slot) {
  const groups = unresolvedBitsets(slot);
  const published = publishedEventRecords(slot).map(record => {
    const treasure = /\.treasure_collected_flag\./.test(record.fieldId);
    const index = Number(treasure ? record.binding.record_id ?? record.binding.flag_id : record.binding.flag_id);
    return {record, index, treasure, active: Boolean(fieldValue(record.fieldId)),
      bitmap: groups.find(group => group.bitmap.fieldId === fieldId(slot,
        treasure ? "treasure_flags" : "global_event_flags")).bitmap};
  });
  return [...published, ...groups.flatMap(({bitmap, bits}) => bits.map(bit => ({
    ...bit, bitmap, treasure: bitmap.fieldId.endsWith(".treasure_flags"),
  })))];
}

function bitmapEventControlMarkup({bitmap, index, active}) {
  return labeledBitmaskMarkup({
    choices: [{value: index, label: active ? '已置位' : '未置位'}],
    active: () => active,
    inputAttributes: () => `data-save-page-bitset-field="${esc(bitmap.fieldId)}" data-save-page-bit-index="${index}"`,
    className: "labeled-bitmask-row",
  });
}

function bitmapEventRow(slot, {bitmap, index, treasure, active}, referenceCells = '', section = '') {
  const flag = index.toString(16).toUpperCase().padStart(2, "0");
  return `<tr id="save-event-bit-${slot}-${treasure ? "treasure" : "global"}-${flag}"${treasure ? '' : ` data-global-event-flag="${index}"`}>
    ${eventIdentityCells(index, {treasure, bitmap, section})}
    <td>${bitmapEventControlMarkup({bitmap, index, active})}</td>${referenceCells}<td></td>
  </tr>`;
}

function eventPurposeHint(label, section) {
  if (!label || label === '未知用途' || /^调查物记录.*取得位$/u.test(label)
    || /^\d+ 号战车掩埋点.*已挖出位$/u.test(label)) return '';
  if (section === 'home-decor' && label.startsWith('已购装饰品')) return '';
  if (/^(战车候选 \d+ 的取得状态位|时空隧道目的地 \d+ · 存档开启状态|赏金首 \d+ 的领赏状态位|固定坐标事件.*完成位)$/u.test(label)) return '';
  if (/^(自主|交互)脚本.*(判位|置位|清位|胜利完成位|分支状态位|门控与置位状态)/u.test(label)) return '';
  if (/^场景.*(条件音频选择位|角色表.*变体门控位|的角色初始化标记|控制器.*地图格替换)$/u.test(label)) return '';
  return label.replace(/（场景 [0-9A-F]+，坐标 [0-9A-F]+,[0-9A-F]+）/u, '');
}

function eventIdentityCells(index, {treasure = false, record = null, bitmap = null, section = ''} = {}) {
  if (treasure) return `<td title="${esc(eventPurposeHint(Number.isInteger(record?.binding.record_id)
    ? record.binding.label : '', section))}"><span class="record-handle">${esc(record?.fieldId || `${bitmap.fieldId}[${index}]`)}</span></td>`;
  const row = globalEventFlagEntry(index);
  return `<td title="${esc(eventPurposeHint(row.label, section))}">${handleMarkup(row.handle)}</td>`;
}

function eventAccesses({index, treasure = false, record = null}) {
  const source = treasure ? record || {fieldId: `save.active.treasure_collected_flag.${index}`, binding: {record_id: index}}
    : {kind: 'global-event-bit', binding: {flag_id: index}};
  return withCurrentOwnerRecord(source, state.project,
    () => currentOwnerReferenceImpact()).accesses;
}

function eventReferencePosition(row) {
  const query = new URLSearchParams(row.href.split('?')[1]?.split('#')[0]);
  const scene = (state.project?.scenes?.editable_scenes || []).find(entry => entry.slug === query.get('scene'));
  return scene ? {sceneId: scene.id, ...(row.scenePosition || {}),
    label: `${row.source.split(' · ')[0]} · ${row.operation}`,
    detailLinkMarkup: `<a href="${esc(row.href)}" title="场景详情" aria-label="场景详情">↗</a>`,
  } : null;
}

function eventReferenceLinkMarkup(row) {
  return `<a class="editor-inline-link" href="${esc(row.href)}"${row.evidence != null
    ? ` title="${esc(String(row.evidence))}"` : ''}>${esc(
      [row.scenePosition ? row.source.split(' · ')[0] : row.source, row.operation].filter(Boolean).join(' · '))} ↗</a>`;
}

function eventAccessCells(accesses, renderReference) {
  const cell = (entries, access) => `<td data-event-flag-access="${access}" data-reference-count="${entries.length}">${
    entries.map(row => {
      const preview = renderReference(eventReferencePosition(row));
      return `<div${preview ? ' class="save-scene-access"' : ''}>${eventReferenceLinkMarkup(row)}${preview}</div>`;
    }).join('') || '—'}</td>`;
  return cell(accesses.writes, 'write') + cell(accesses.reads, 'read');
}

function eventTableMarkup(slot, entries, {section = '', extraColumns = [], scenePositions = () => []} = {}) {
  const rows = entries.map(entry => {
    const accesses = eventAccesses(entry);
    const positions = [...scenePositions(entry),
      ...[...accesses.writes, ...accesses.reads].map(eventReferencePosition).filter(Boolean)];
    const hasLocation = position => position.x != null && position.y != null || Boolean(position.crop);
    const primary = positions.find(hasLocation) || positions[0];
    const locatedScenes = new Set(positions.filter(hasLocation).map(position => Number(position.sceneId)));
    const seen = new Set(primary ? [saveScenePositionKey(primary)] : []);
    const renderReference = position => {
      if (!position || !hasLocation(position) && locatedScenes.has(Number(position.sceneId))
        || seen.has(saveScenePositionKey(position))) return '';
      seen.add(saveScenePositionKey(position));
      return saveSceneReferenceMarkup(position);
    };
    return {entry,
      referenceCells: `<td data-save-event-position>${primary ? saveSceneReferenceMarkup(primary) : '—'}</td>`
        + eventAccessCells(accesses, renderReference),
      extraCells: extraColumns.map(column => column.cell(entry, {primary, renderReference}) || ''),
    };
  });
  const columns = extraColumns.map((column, index) => ({column, index}))
    .filter(({column, index}) => !column.hideWhenEmpty || rows.some(row => row.extraCells[index]));
  return `<div class="save-event-groups"><div class="table-wrap">
    <table class="data-table save-event-reference-table${columns.length ? ' save-event-context-table' : ''}" data-save-page-event-group="${esc(section)}">
      <thead><tr><th>资源 ID</th><th>当前值</th><th>场景与位置</th><th>写入／修改</th><th>读取</th>${
        columns.map(({column}) => `<th>${esc(column.label)}</th>`).join('')}
        <th class="reset-column" aria-label="恢复原值" title="恢复原值"></th></tr></thead>
      <tbody>${rows.map(({entry, referenceCells, extraCells}) => {
        referenceCells += columns.map(({index}) => `<td>${extraCells[index] || '—'}</td>`).join('');
        return entry.record ? publishedEventRow(entry.record, referenceCells, section)
          : bitmapEventRow(slot, entry, referenceCells, section);
      }).join('')}</tbody>
    </table></div></div>`;
}

function eventPhysicalMarkup(entries) {
  const bitmaps = [...new Set(entries.map(entry => entry.bitmap))];
  const raw = bitmaps.map(bitmap => {
    const bits = entries.filter(entry => entry.bitmap.fieldId === bitmap.fieldId)
      .sort((left, right) => left.index - right.index);
    return `<div data-save-page-raw-bitmap="${esc(bitmap.fieldId)}">
      <h3>${esc(bitmap.binding.label || bitmap.fieldId)} · ${bits.length} 位</h3>
      <div class="save-unresolved-grid">${bits.map(bit =>
        `<output data-save-raw-bit="${bit.index}" title="${esc(bitmap.fieldId)} · bit ${bit.index}" class="badge${bit.active ? " active" : ""}">${bitmap.fieldId.endsWith('.global_event_flags') ? globalEventFlagEntry(bit.index).handle : '$' + bit.index.toString(16).toUpperCase().padStart(2, "0")} · ${Number(bit.active)}</output>`).join("")}</div>
    </div>`;
  }).join("");
  return physicalLocationMarkup({
    rows: entries.map(entry => ({
      label: entry.record?.binding?.label || `${entry.treasure ? "调查物" : "全局事件"} $${entry.index.toString(16).toUpperCase().padStart(2, "0")}`,
      address: entry.record?.physical || {...entry.bitmap.physical,
        offset: entry.bitmap.physical.offset + Math.floor(entry.index / 8),
        end_exclusive: entry.bitmap.physical.offset + Math.floor(entry.index / 8) + 1,
        length: 1},
    })), content: raw,
  });
}

function eventMarkup(slot, section) {
  const entries = eventEntries(slot).filter(entry =>
    section === 'global' ? !entry.treasure && saveEventSection(entry.index) !== 'vehicle-acquisition'
      : saveEventSection(entry.index, {treasure: entry.treasure}) === section)
    .sort((left, right) => left.index - right.index);
  const label = section === 'wanted' ? '击破与领取状态位' : SAVE_EVENT_SECTIONS.find(([id]) => id === section)[1];
  const extraColumns = section === 'home-decor' ? [{label: '商品', cell: entry => {
    const flag = globalEventFlagEntry(entry.index);
    for (const family of state.project?.facilities?.configuration_loader?.pointer_entries || []) {
      const good = family.value_namespace?.goods?.find(row => row.event_flag_reference === flag.handle);
      if (good) return `<a class="editor-inline-link" href="?view=shops&amp;shopFamily=${family.family_id}&amp;shopTab=catalog&amp;record=${esc(good.resource_uid)}">${
        esc(currentTextReference(good.text_record || good.resource_uid).label)} ↗</a>`;
    }
    return '';
  }}] : section === 'vehicle-acquisition' ? [{label: '战车预设', cell: entry => {
    const index = entry.treasure ? 4 : entry.index - 8;
    return `<a class="editor-inline-link" href="?view=vehicles&amp;record=${index}"
      title="战车预设" aria-label="战车预设">战车 ${index + 1} ↗</a>`;
  }}] : [];
  return `<section class="panel" data-save-page-events="${slot}" data-save-event-section="${section}">
    <header><div><h2>${esc(label)}</h2></div><span>${entries.length} 位</span></header>
    ${eventTableMarkup(slot, entries, {section, extraColumns})}
    ${eventPhysicalMarkup(entries)}
  </section>`;
}

function renderSavePage() {
  if (!saveWorkspaceReady()) return loadingMarkup();
  if (state.savePageSection === "bounty") state.savePageSection = "wanted";
  if (state.savePageSection === "field-objects") {
    state.savePageSection = "party";
    const object = /^#save-object-position-[12]-(8|9|10)$/.exec(location.hash);
    state.savePageEntity = object ? `vehicle-${object[1]}` : "vehicle-8";
  }
  const categories = new Set(allCurrentFieldObjects()
    .map(supplementalSection).filter(Boolean));
  const sections = [...SAVE_SECTIONS, ...[...categories]
    .sort((left, right) => categoryLabel(left).localeCompare(categoryLabel(right), "zh-CN"))
    .map(category => [category, categoryLabel(category)])];
  const activeSlot = Number(state.savePageSlot) === 2 ? "2" : "1";
  const section = sections.some(([id]) => id === state.savePageSection)
    ? state.savePageSection : "location";
  state.savePageSlot = Number(activeSlot);
  state.savePageSection = section;
  return `<div data-save-page data-page-address-spaces="sram">
    <output data-save-working-error${state.saveError ? "" : " hidden"}>${esc(state.saveError)}</output>
    <div class="data-editor-toolbar">
      ${saveImportControl("载入 .sav 到当前值")}
      <span data-save-reset-control>${resetToOriginalButton("save-all", {
        dirty: saveWorkspaceChanged(state), title: "恢复整个当前存档的 ROM 初始值",
      })}</span>
      <button class="button primary" type="button" id="save-download">导出当前 .sav</button>
    </div>
    <nav class="in-page-tab-list" data-wrap aria-label="存档分区">
      ${sections.map(([id, label]) => `<button type="button" class="in-page-tab"
        data-save-section="${esc(id)}" aria-current="${id === section ? "page" : "false"}">${
          esc(label)}</button>`).join("")}
    </nav>
    ${inPageTabs({
      id: "save-slot",
      label: "存档槽",
      active: activeSlot,
      tabs: [{id: "1", label: "槽 1"}, {id: "2", label: "槽 2"}],
      content: slotMarkup(Number(activeSlot), section),
    })}
  </div>`;
}

function bindSavePage({rerender} = {}) {
  if (["bounty", "field-objects"].includes(new URL(location.href).searchParams.get("saveSection"))) {
    const url = currentViewUrl();
    url.hash = location.hash;
    replaceHistoryUrl(url);
  }
  document.querySelectorAll("[data-save-rental-fill]").forEach(button => {
    button.addEventListener("click", async () => {
      const [slot, vehicle] = button.dataset.saveRentalFill.split("-").map(Number);
      try {
        fillSaveCurrentRentalVehicle({slot, vehicle,
          presetId: Number(fieldValue(fieldId(slot, `active_rental_vehicle_preset.${vehicle - 8}`)))});
      } catch (error) {
        state.saveError = error instanceof Error ? error.message : String(error);
      }
      await rerender?.();
    });
  });
  document.querySelectorAll("[data-save-entity-editor]").forEach(root => {
    bindEntityDetailSelector(root);
    root.querySelectorAll("[data-entity-detail-select]").forEach(button =>
      button.addEventListener("click", () => {
        state.savePageEntity = button.dataset.entityDetailSelect;
        replaceHistoryUrl(currentViewUrl());
      }));
  });
  document.querySelectorAll("[data-save-section]").forEach(button => {
    button.addEventListener("click", async () => {
      if (button.dataset.saveSection === state.savePageSection) return;
      state.savePageSection = button.dataset.saveSection;
      replaceHistoryUrl(currentViewUrl());
      await rerender?.();
    });
  });
  bindInPageTabs(document.querySelector("[data-save-page] [data-in-page-tabs]"), {
    onChange: active => {
      const slot = Number(active) === 2 ? 2 : 1;
      if (slot === state.savePageSlot) return;
      state.savePageSlot = slot;
      replaceHistoryUrl(currentViewUrl());
      void rerender?.();
    },
  });
  hydrateItemPickers(document);
  document.querySelectorAll("[data-save-composite-field], [data-save-rental-preset]")
    .forEach(root => hydrateReferenceFieldPickers(root));
  document.querySelector("[data-save-page]").addEventListener("module-reference-change", async event => {
    const rental = event.target.closest("[data-save-rental-preset]");
    if (rental) {
      try {
        patchSaveCurrentFields({[rental.dataset.saveRentalPreset]:
          Number(rental.dataset.moduleReferenceValue)});
        await rerender?.();
      } catch (error) {
        state.saveError = error instanceof Error ? error.message : String(error);
        await rerender?.();
      }
      return;
    }
    const picker = event.target.closest("[data-save-composite-field]");
    if (!picker) return;
    const id = picker.dataset.saveCompositeField;
    const bytes = Uint8Array.from(fieldValue(id));
    bytes[Number(picker.dataset.saveCompositeIndex)] = Number(picker.dataset.moduleReferenceValue);
    try {
      patchSaveCurrentFields({[id]: bytes});
      await rerender?.();
    } catch (error) {
      state.saveError = error instanceof Error ? error.message : String(error);
      await rerender?.();
    }
  });
  document.querySelectorAll("[data-save-object-positions] [data-scene-position-picker]")
    .forEach(root => {
      const [slot, index] = root.closest("[data-save-object-position]").dataset.saveObjectPosition
        .split("-").map(Number);
      hydrateScenePositionPicker(root, {
        entries: state.project?.scenes?.editable_scenes || [],
        onConfirm: async ({sceneId, x, y}) => {
          const prefix = fieldId(slot, `field_object.${index}.`);
          try {
            patchSaveCurrentFields({
              [`${prefix}scene_id`]: sceneId,
              [`${prefix}x`]: x,
              [`${prefix}y`]: y,
              ...(index < 8 ? {[`${prefix}state_raw`]: fieldValue(`${prefix}state_raw`)} : {}),
            });
            await rerender?.();
          } catch (error) {
            state.saveError = error instanceof Error ? error.message : String(error);
            await rerender?.();
            return false;
          }
        },
      });
    });
  document.querySelectorAll("[data-save-page-location]").forEach(root => {
    const slot = Number(root.dataset.savePageLocation);
    hydrateScenePositionPicker(root.querySelector("[data-scene-position-picker]"), {
      entries: state.project?.scenes?.editable_scenes || [],
      onConfirm: async ({sceneId, x, y}) => {
        try {
          const scene = (state.project?.scenes?.editable_scenes || [])
            .find(entry => Number(entry.id) === sceneId);
          if (scene && (x >= scene.width || y >= scene.height))
            throw new RangeError(`角色 tile (${x},${y}) 超出场景边界 ${scene.width}×${scene.height}`);
          const {cameraX, cameraY} = saveCameraFromPlayerTile(x, y);
          patchSaveCurrentFields({
            [fieldId(slot, "scene_id")]: sceneId,
            [fieldId(slot, "camera_x")]: cameraX,
            [fieldId(slot, "camera_y")]: cameraY,
          });
          await rerender?.();
        } catch (error) {
          state.saveError = error instanceof Error ? error.message : String(error);
          await rerender?.();
          return false;
        }
      },
    });
  });
  document.querySelectorAll('[data-save-scene-reference]').forEach(root =>
    hydrateScenePositionPicker(root, {entries: state.project?.scenes?.editable_scenes || []}));
  document.querySelectorAll("[data-save-page-activation-field]").forEach(control => {
    control.addEventListener("change", async event => {
      const input = event.currentTarget;
      try {
        const id = input.dataset.savePageActivationField;
        const record = fieldRecord(id);
        if (activationWritable(record)) {
          setSaveCurrentSlotActivation(Number(input.dataset.savePageSlot), input.checked);
        } else {
          patchSaveCurrentFields({[id]: input.checked ? record.binding.expected : 0});
        }
        input.setCustomValidity("");
        await rerender?.();
      } catch (error) {
        input.setCustomValidity(error instanceof Error ? error.message : String(error));
        input.reportValidity();
      }
    });
  });
  document.querySelectorAll("[data-save-page-reset-activation]").forEach(button => {
    button.addEventListener("click", async () => {
      if (button.disabled) return;
      try {
        const slot = Number(button.dataset.savePageResetActivation);
        if (activationWritable(fieldRecord(`save.directory.slot.${slot}.valid_marker`))) {
          resetSaveCurrentSlotActivation(slot);
        } else {
          resetSaveCurrentFields([`save.directory.slot.${slot}.valid_marker`]);
        }
        await rerender?.();
      } catch (error) {
        state.saveError = error instanceof Error ? error.message : String(error);
        await rerender?.();
      }
    });
  });
  document.querySelector("[data-save-page]").addEventListener("change", async event => {
    const input = event.target.closest("[data-save-page-array-field]");
    if (!input) return;
    const id = input.dataset.savePageArrayField;
    const bytes = Uint8Array.from(fieldValue(id));
    bytes[Number(input.dataset.savePageArrayIndex)] = Number(input.value);
    try {
      patchSaveCurrentFields({[id]: bytes});
      input.setCustomValidity("");
      await rerender?.();
    } catch (error) {
      input.setCustomValidity(error instanceof Error ? error.message : String(error));
      input.reportValidity();
    }
  });
  document.querySelector("[data-save-page]").addEventListener("change", async event => {
    const input = event.target.closest("[data-save-equipment-state-field]");
    if (!input) return;
    const id = input.dataset.saveEquipmentStateField;
    try {
      patchSaveCurrentFields({[id]: writeVehicleEquipmentState(Number(fieldValue(id)), Number(input.value))});
      input.setCustomValidity("");
      await rerender?.();
    } catch (error) {
      input.setCustomValidity(error instanceof Error ? error.message : String(error));
      input.reportValidity();
    }
  });
  document.querySelector("[data-save-page]").addEventListener("change", async event => {
    const input = event.target.closest("[data-save-carry-assignment]");
    if (!input) return;
    const id = input.dataset.saveCarryAssignment;
    const itemId = id.replace(".equipped.", ".equipment.");
    const item = (state.project?.game_data?.items?.records || [])
      .find(candidate => Number(candidate.id) === Number(fieldValue(itemId)));
    const slotId = id.split(".").at(-1);
    try {
      const extra = /^save\.slot\.([12])\.vehicle\.(\d+)\.equipped\.generic_([78])$/.exec(id);
      if (extra) {
        if (input.value !== "main_gun") throw new Error("所在槽未查实或不可写");
        equipSaveCurrentVehicleCarryMain({slot: Number(extra[1]), vehicle: Number(extra[2]),
          column: Number(extra[3]) - 1, items: state.project?.game_data?.items?.records || []});
        input.setCustomValidity("");
        await rerender?.();
        return;
      }
      if (!fieldWritable(fieldRecord(id)) || (input.value &&
          (input.value !== slotId || !item?.mountable_slots?.includes(slotId)))) {
        throw new Error("所在槽未查实或不可写");
      }
      patchSaveCurrentFields({[id]: input.value ? 1 : 0});
      input.setCustomValidity("");
      await rerender?.();
    } catch (error) {
      input.setCustomValidity(error instanceof Error ? error.message : String(error));
      input.reportValidity();
    }
  });
  document.querySelector("[data-save-page]").addEventListener("change", async event => {
      const input = event.target.closest("[data-save-page-field]");
      if (!input) return;
      if (!input.checkValidity()) {
        input.reportValidity();
        return;
      }
      const value = input.type === "checkbox" ? input.checked : Number(input.value);
      try {
        const id = input.dataset.savePageField;
        const equipment = /^save\.slot\.([12])\.vehicle\.(\d+)\.equipment\.(main_gun|sub_gun|special|c_unit|engine|chassis)$/.exec(id);
        const equippedId = equipment && fieldId(Number(equipment[1]),
          `vehicle.${equipment[2]}.equipped.${equipment[3]}`);
        const slotId = equipment?.[3];
        const item = (state.project?.game_data?.items?.records || [])
          .find(candidate => Number(candidate.id) === value);
        const knownAssignment = item?.mountable_slots?.length === 1
          && item.mountable_slots[0] === slotId;
        const nextEquipped = value === 0 || !item?.mountable_slots?.includes(slotId)
          ? 0 : knownAssignment ? 1 : null;
        patchSaveCurrentFields({[id]: value,
          ...(equippedId && fieldWritable(fieldRecord(equippedId))
              && nextEquipped !== null ? {[equippedId]: nextEquipped} : {})});
        input.setCustomValidity("");
        await rerender?.();
      } catch (error) {
        input.setCustomValidity(error instanceof Error ? error.message : String(error));
        input.reportValidity();
      }
  });
  document.querySelector("[data-save-page]").addEventListener("change", async event => {
    const input = event.target.closest("[data-save-page-settings-wait], [data-save-page-settings-bit]");
    if (!input) return;
    const id = input.dataset.savePageSettingsWait || input.dataset.savePageSettingsBit;
    const current = Number(fieldValue(id));
    const value = input.dataset.savePageSettingsWait
      ? (current & -8) | Number(input.value)
      : input.checked ? current | (1 << Number(input.dataset.bit))
        : current & ~(1 << Number(input.dataset.bit));
    try {
      patchSaveCurrentFields({[id]: value});
      await rerender?.();
    } catch (error) {
      input.setCustomValidity(error instanceof Error ? error.message : String(error));
      input.reportValidity();
    }
  });
  document.querySelector("[data-save-page]").addEventListener("change", async event => {
    const input = event.target.closest("[data-save-page-bitset-field]");
    if (!input) return;
    const id = input.dataset.savePageBitsetField;
    const index = Number(input.dataset.savePageBitIndex);
    const value = Uint8Array.from(fieldValue(id));
    const at = Math.floor(index / 8);
    if (input.checked) value[at] |= 1 << (index % 8);
    else value[at] &= ~(1 << (index % 8));
    try {
      patchSaveCurrentFields({[id]: value});
      input.setCustomValidity("");
      await rerender?.();
    } catch (error) {
      input.setCustomValidity(error instanceof Error ? error.message : String(error));
      input.reportValidity();
    }
  });
  document.querySelector("[data-save-page]").addEventListener("change", async event => {
    const input = event.target.closest("[data-save-page-bytes]");
    if (!input) return;
    const id = input.dataset.savePageBytes;
    const value = input.value.trim();
    const parts = value ? value.split(/\s+/) : [];
    const expected = fieldRecord(id).physical.length;
    if (parts.length !== expected || parts.some(part => !/^[0-9a-fA-F]{2}$/.test(part))) {
      input.setCustomValidity(`需要 ${expected} 个两位十六进制字节`);
      input.reportValidity();
      return;
    }
    try {
      patchSaveCurrentFields({[id]: Uint8Array.from(parts.map(part => parseInt(part, 16)))});
      input.setCustomValidity("");
      await rerender?.();
    } catch (error) {
      input.setCustomValidity(error instanceof Error ? error.message : String(error));
      input.reportValidity();
    }
  });
  document.querySelector("[data-save-page]").addEventListener("change", async event => {
    const input = event.target.closest("[data-save-page-name]");
    if (!input) return;
    const id = input.dataset.savePageName;
    try {
      currentFieldObject(id).setNameText(input.value);
      input.setCustomValidity("");
      await rerender?.();
    } catch (error) {
      input.setCustomValidity(error instanceof Error ? error.message : String(error));
      input.reportValidity();
    }
  });
  document.querySelector("[data-save-page]").addEventListener("click", async event => {
      const button = event.target.closest("[data-reset-to-original]");
      if (!button) return;
      if (button.closest("[data-save-reset-control]") || button.hasAttribute("data-save-page-reset-activation")) return;
      if (button.disabled) return;
      try {
        resetSaveCurrentFields([button.dataset.resetToOriginal], {
          message: "字段已恢复为 ROM 初始值。",
        });
        await rerender?.();
      } catch (error) {
        state.saveError = error instanceof Error ? error.message : String(error);
        await rerender?.();
      }
  });
}

export { bindSavePage, prepareSaveVisualComponents, renderSavePage };
