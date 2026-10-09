import { esc, registerModuleComponent, renderModuleComponent } from './element-tree-DsgOBeTK.js';
import { db } from './battle-result-script-runtime-B_EClFew.js';
import { state } from './emulator-DynsZsth.js';
import { dataTable, resetToOriginalButton } from './pattern-pixel-editor-B8puYQ8A.js';
import { registerReferenceFieldPresentation, hydrateReferenceFieldPickers, updateReferencePickerItem, referenceFieldPickerMarkup } from './scene-elevators-N46oPTJC.js';
import { globalEventFlagEntries, prepareGlobalEventFlags } from './facility-window-semantics-BvUme8Kk.js';
import { eventFlagReferenceMarkup } from './timeline-player-y3hI_sah.js';

// @editor-module 按已发布取值域显示可编辑数值。


function boundedNumberFieldMarkup({fieldId, label, value, min, max,
  zeroLabel = "", unit = "", disabled = false} = {}) {
  return `<label class="save-bounded-number"><input class="inline-data-input" type="number"
    inputmode="numeric" required step="1" min="${esc(min)}" max="${esc(max)}"
    value="${esc(value)}" aria-label="${esc(label)}" ${disabled ? "disabled" :
      `data-save-page-field="${esc(fieldId)}"`}>
    ${unit ? `<span class="save-bounded-number-unit">${esc(unit)}</span>` : ""}
    <small>${Number(value) === 0 && zeroLabel ? esc(zeroLabel) :
      `${esc(min)}–${esc(max)}`}</small></label>`;
}

// @editor-module 全站共用的场景对象朝向标签。
const DIRECTION_LABELS = Object.freeze(["上", "下", "左", "右"]);

// @editor-module 存档字段、实体总览与进度组件。


function eventFlagReferenceItem(row, {compact = false} = {}) {
  return {value: String(row.id), group: 'event', groupLabel: '全局事件位',
    label: `${row.handle} · ${row.label}`,
    preview: eventFlagReferenceMarkup(row.id, {compact}), description: '', meta: '',
    filter: `${row.id} ${row.handle} ${row.label}`.toLowerCase()};
}

async function prepareEventFlagReference(props) {
  return {...props, entries: await prepareGlobalEventFlags()};
}

registerReferenceFieldPresentation("global-event-flag", {
  item: eventFlagReferenceItem,
});

registerModuleComponent("save-container", "event-flag-reference", {
  prepare: prepareEventFlagReference,
  render: ({value, entries = globalEventFlagEntries(), valueAsHandle = false, label = "事件位", controlMarkup = "", componentAttributes = "", picker = {}}) => referenceFieldPickerMarkup({
    reference: {module: "global-event-flag", key: [valueAsHandle ? 'handle' : 'id'],
      compact: picker.previewOnlySummary},
    rows: entries, value, label, controlMarkup, componentAttributes,
    picker,
  }),
  hydrate: async root => {
    hydrateReferenceFieldPickers(root);
    const {entries} = await prepareEventFlagReference({});
    for (const row of entries) updateReferencePickerItem(root, eventFlagReferenceItem(row,
      {compact: root.classList.contains('reference-preview-only-summary')}));
  },
});

function saveAdventureSettingsMarkup({value, fieldId, componentAttributes = ""} = {}) {
  const checks = [
    [3, "bit 3"], [4, "bit 4"], [5, "声音/背景恢复路径"],
    [6, "战斗攻击视觉"], [7, "金铃通知"],
  ];
  return `<div class="save-published-bits" ${componentAttributes}>
    <label>战斗信息等待档 <select data-save-page-settings-wait="${esc(fieldId)}">
      ${Array.from({length: 8}, (_, index) => `<option value="${index}"${(value & 7) === index ? " selected" : ""}>${index}</option>`).join("")}
    </select></label>
    ${checks.map(([bit, label]) => `<label class="check"><input type="checkbox"
      data-save-page-settings-bit="${esc(fieldId)}" data-bit="${bit}"
      ${(value & (1 << bit)) ? "checked" : ""}> ${esc(label)}</label>`).join("")}
  </div>`;
}

function saveDriveabilityMarkup({value, fieldId, componentAttributes = ""} = {}) {
  const options = [[0, "没有不可驾驶绑定"], [0xff, "1 辆绑定战车不可驾驶"],
    [0xfe, "2 辆绑定战车不可驾驶"], [0xfd, "3 辆绑定战车不可驾驶"]];
  return `<select aria-label="队伍驾驶状态" data-save-page-field="${esc(fieldId)}" ${componentAttributes}>
    ${options.map(([raw, label]) => `<option value="${raw}"${value === raw ? " selected" : ""}>${label}</option>`).join("")}
    ${options.some(([raw]) => raw === value) ? "" : `<option value="${esc(value)}" selected>${
      Number(value).toString(16).toUpperCase().padStart(2, "0")}</option>`}
  </select>`;
}

function saveDirectionMarkup({value, label, fieldId, componentAttributes = ""} = {}) {
  return `<select aria-label="${esc(label)}" data-save-page-field="${esc(fieldId)}" ${componentAttributes}>
    ${DIRECTION_LABELS.map((name, index) => `<option value="${index}"${value === index ? " selected" : ""}>${name}</option>`).join("")}
    ${DIRECTION_LABELS[value] === undefined
      ? `<option value="${esc(value)}" selected>${esc(value)}</option>` : ""}
  </select>`;
}

for (const [kind, render] of [
  ["adventure-settings", saveAdventureSettingsMarkup],
  ["driveability", saveDriveabilityMarkup],
  ["direction", saveDirectionMarkup],
]) registerModuleComponent("save-container", kind, {render});

let portraitSelectors = null;

async function prepareSaveVehiclePortraits() {
  const repository = state.projectRepository;
  let document = null;
  try {
    const resource = await db.readResource("vehicle-visual-selector");
    document = resource?.value?.document || null;
  } catch {}
  if (state.projectRepository !== repository) return;
  portraitSelectors = document;
}

function saveVehiclePortraitMarkup({
  vehicle, chassisId, presetId = null, presets = [], label = "", componentAttributes = "",
} = {}) {
  const preset = presetId !== null ? presets.find(entry => Number(entry.preset_id) === Number(presetId))
    : presets.find(entry => Number(entry.chassis_id) === Number(chassisId)
      && entry.base_vehicle === true && Number(entry.vehicle_slot) === Number(vehicle))
      || presets.find(entry => Number(entry.chassis_id) === Number(chassisId));
  if (!preset || (presetId === null && !Number(chassisId))) return "";
  const selector = portraitSelectors?.map_actor_types?.find(entry =>
    Number(entry.id) === Number(preset.preset_id));
  if (!Number.isInteger(selector?.actor_type)) return "";
  return `<span ${componentAttributes}>${renderModuleComponent("actor-type", "preview", {
    value: selector.actor_type, label, compact: true, scale: 3,
  })}</span>`;
}

registerModuleComponent("save-vehicle", "portrait", {render: saveVehiclePortraitMarkup});

for (const module of ['save-role', 'save-vehicle']) {
  registerModuleComponent(module, 'status-reference', {render: ({operation = 'apply'} = {}) =>
    `<a href="?view=save&amp;saveSection=party&amp;saveEntity=${module === 'save-role' ? 'role-hunter' : 'vehicle-0'}" title="${
      module === 'save-role' ? '人物' : '战车'}状态">${operation === 'clear' ? '解除' : '附加'}酸蚀 ↗</a> · <a
      href="?view=equipment&amp;equipmentDomain=tank&amp;record=147#field-step-effects" title="场景移动效果">逐格效果 ↗</a>`});
}

function saveWantedProgressMarkup({entries = [], componentAttributes = ""} = {}) {
  return `<div data-save-wanted-progress ${componentAttributes}>${dataTable({
    reportStatus: false, rows: entries, rowId: entry => entry.id,
    columns: [
      {key: "label", label: "名称", fit: true, cell: entry => `<span id="save-wanted-defeat-${esc(entry.id.replaceAll('.', '-'))}" data-save-catalog-field="${esc(entry.id)}">${esc(entry.label)}</span>`},
      {key: "level", label: "击破等级", width: 160, cell: entry => boundedNumberFieldMarkup({
        fieldId: entry.id, label: entry.label, value: entry.level,
        min: entry.min, max: entry.max, zeroLabel: "未击破", unit: "级",
      })},
      {key: "claim", label: "领取状态", width: 110, cell: entry => entry.claimMarkup || "—"},
      {key: "entrance", label: "遭遇入口", width: 260, grow: true, wrap: true,
        cell: entry => entry.entrancesMarkup || "—"},
      {key: "target", label: "通缉令", width: 70, cell: entry => entry.targetHref
        ? `<a href="${esc(entry.targetHref)}" title="通缉目标" aria-label="通缉目标">↗</a>` : "—"},
      {key: "monster", label: "怪物", width: 60, cell: entry => Number.isInteger(entry.monsterId)
        ? `<a href="?view=monsters&amp;record=${entry.monsterId}" title="怪物" aria-label="怪物">↗</a>` : "—"},
      {key: "reset", label: "", title: "恢复原值", width: 70, reset: true, cell: entry => resetToOriginalButton(
        entry.id, {dirty: entry.dirty, title: `重置${entry.label}击破等级`}) + (entry.claimResetMarkup || "")},
    ],
  })}</div>`;
}

registerModuleComponent("save-container", "progress", {render: saveWantedProgressMarkup});

function saveFieldGroupsMarkup({groups = [], showGroup = true, componentAttributes = ""} = {}) {
  const rows = groups.flatMap(group => group.entries.map((entry, index) => ({
    group, first: index === 0, ...entry,
  })));
  return `<div data-save-field-groups ${componentAttributes}>${dataTable({
    reportStatus: false, rows, rowId: row => row.id,
    columns: [
      ...(showGroup ? [{key: "group", label: "分组", width: 160, cell: row => row.first ? `${row.group.previewMarkup || ""}${
        row.group.href ? `<a href="${esc(row.group.href)}">${esc(row.group.label)}</a>`
          : esc(row.group.label)}` : ""}] : []),
      {key: "label", label: "字段", width: 270, cell: row => `<span data-save-catalog-field="${esc(row.id)}"${
        row.title ? ` title="${esc(row.title)}"` : ""}>${esc(row.label)}</span>`},
      {key: "value", label: "当前值", width: 340, cell: row => row.valueMarkup},
      {key: "reset", label: "", title: "恢复原值", width: 36, reset: true, cell: row => row.resetMarkup},
    ],
  })}</div>`;
}

registerModuleComponent("save-container", "field-groups", {render: saveFieldGroupsMarkup});

export { DIRECTION_LABELS, boundedNumberFieldMarkup, prepareSaveVehiclePortraits };
