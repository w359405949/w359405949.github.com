// @editor-module 载具预设的引用控件：用途视图提供分组，使用处声明允许的组。
import {esc, hex} from "../core/dom.js";
import {VEHICLE_PRESET_GROUPS, vehiclePresetChoices, vehiclePresetEntry} from "../core/vehicle-preset-views.js";
import {vehiclePresetReferenceItem, VEHICLE_PRESET_MODULE_ID} from "../modules/vehicle/components.js";
import {referencePickerMarkup} from "./reference-picker.js";

/**
 * `extraEntries` 是消费页自己的哨兵值（如存档的「未租用」），排在候选之前。
 * `controlMarkup` 是消费页原有的精确值控件；`compact` 下它只留作写回路径。
 */
export function vehiclePresetPickerMarkup({
  value,
  label = "载具预设",
  allowedGroups = VEHICLE_PRESET_GROUPS,
  componentAttributes = "",
  controlMarkup = "",
  extraEntries = [],
  compact = true,
  disabled = false,
  previewPanel = false,
} = {}) {
  return referencePickerMarkup({
    moduleId: VEHICLE_PRESET_MODULE_ID,
    value,
    label,
    items: [...extraEntries, ...vehiclePresetChoices(allowedGroups).map(({preset, group, groupLabel}) => ({
      ...vehiclePresetReferenceItem(preset), group, groupLabel,
    }))],
    grouped: true,
    controlMarkup,
    componentAttributes,
    compact,
    disabled,
    previewPanel,
  });
}

/** 精确值控件（`<select>`）里的候选项，与引用控件同源。 */
export function vehiclePresetOptionMarkup(value, allowedGroups = VEHICLE_PRESET_GROUPS) {
  const selected = Number(value);
  const entries = vehiclePresetChoices(allowedGroups).map(({preset, group, groupLabel}) => ({
    ...vehiclePresetEntry(preset, group), group, groupLabel,
  }));
  const known = entries.some(entry => Number(entry.value) === selected);
  // 原值可能在候选表外；保留它，避免精确值控件改掉当前选择。
  return [
    ...(known ? [] : [`<option value="${selected}" selected>${
      esc(`${hex(selected, 2)} · 表外值`)}</option>`]),
    ...[...new Map(entries.map(entry => [entry.group, entry.groupLabel]))]
      .map(([group, groupLabel]) => `<optgroup label="${esc(groupLabel)}">${
        entries.filter(entry => entry.group === group).map(entry => `<option value="${entry.value}"${
          Number(entry.value) === selected ? " selected" : ""}>${
          esc(`${hex(Number(entry.value), 2)} · ${entry.label} · ${entry.description}`)
        }</option>`).join("")}</optgroup>`),
  ].join("");
}
