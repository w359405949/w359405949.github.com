// @editor-module 敌方行动选择器按物理块登记字段；状态覆盖行动只编辑 Working。
import {ROM_WRITE_PENDING, validateFieldOverrides} from "./field-codec.js";
import {mountFieldObjectControls} from "./field-object.js";
import {canonicalJsonEqual} from "./project-store-values.js";

const OWNER = "enemy-action-selection-service";
const SCHEMA = "metalmaxcn.module-asset.enemy-action-selection-service";
const ACTION_CANDIDATES = Object.freeze({resourceId: "enemy-action",
  documentPath: Object.freeze(["records"]), value: Object.freeze(["id"]),
  label: Object.freeze(["handle", "name_hint"])});
const ACTION_COUNT = 112;
const bytes = value => Object.freeze(value.trim().split(/\s+/u).map(part => Number.parseInt(part, 16)));
const bank10 = bytes(`
60 A8 D8 F0 FC C0 D8 E8 F4 FC 00 80 C0 E0 F4 B0 FF B0 FF B0 00 00 00 7E D2 FF C0 FF
CD A3 B9 A3 BE A3 C3 A3 C8 A3 D0 A3 D3 A3
7B A4 D2 A4 D2 A4 B7 A4 44 A4 4B A4 63 A4 6F A4 76 A4 7F A4 B3 A4 8A A4 A7 A4
20 2E D0 BD FD 71 29 10 D0 12 BD F0 72 29 0F 0A A8 B9 E3 A3 85 0C B9 E4 A3 4C FA E9
A0 00 A5 37 D9 B9 A3 90 05 C8 C0 05 D0 F6 B9 2E A4 9D B5 71 60
68 5E 28 48 3C 3D
FE BE 71 BD BE 71 C9 06 D0 05 A9 00 9D BE 71 60 20 34 A4 A8 4C EB A4 20 34 A4 48 FE BE 71
A0 08 B9 D5 A3 85 0C B9 D6 A3 85 0D 68 A8 4C DE A4 BD 57 72 4A 4A DD 4E 72 90 0E B0 61
BD 60 72 D0 07 F0 5A AD AD 05 10 55 A0 00 F0 6C BD 01 E7 A8 B9 30 71 D0 F3 F0 46 A9 0C
85 00 A0 02 B9 78 64 F0 0B B9 7B 64 C9 FF D0 04 A9 04 85 00 88 10 ED A4 00 D0 2B A0 00
BD 57 72 4A 4A DD 4E 72 B0 1F A0 0A D0 1B BD A8 72 85 00 BD 9F 72 46 00 6A 46 00 6A
38 FD 8D 72 A5 00 FD 96 72 90 AB A0 06 B9 D5 A3 85 0C B9 D6 A3 85 0D A0 00 B1 0C F0 04
C5 37 B0 05 C8 C0 05 D0 F3 84 00 BC EB 71 18 B9 01 E7 65 00 A8 18 BD 01 E7 65 00 9D
66 71 B9 18 71 9D B5 71 29 7F A8 B9 0A 86 10 08 BD 06 72 09 80 9D 06 72 60`);
const fixedEntry = bytes("20 FC FA A6 D4 86 DD 20 FD A3 4C 82 FB");

const BLOCKS = Object.freeze([
  {id: `${OWNER}.threshold-pool`, label: "物理阈值池", start: 132025, values: bank10.slice(0, 28),
    names: Array.from({length: 28}, (_, index) => `threshold_${String(index).padStart(2, "0")}`)},
  {id: `${OWNER}.profile-pointers`, label: "概率配置指针", start: 132053,
    values: Array.from({length: 7}, (_, index) => bank10[28 + index * 2] + bank10[29 + index * 2] * 0x100),
    widths: 2, names: Array.from({length: 7}, (_, index) => `profile_pointer_${String(index).padStart(2, "0")}`)},
  {id: `${OWNER}.strategy-handler-pointers`, label: "策略处理器指针", start: 132067,
    values: Array.from({length: 13}, (_, index) => bank10[42 + index * 2] + bank10[43 + index * 2] * 0x100),
    widths: 2, names: Array.from({length: 13}, (_, index) => `strategy_handler_pointer_${String(index).padStart(2, "0")}`)},
  {id: `${OWNER}.strategy-data-and-selection-code`, label: "选择分派代码", start: 132093,
    values: [bank10.slice(68, 117)], names: ["bytes"]},
  {id: `${OWNER}.status-override-actions`, label: "状态覆盖行动", start: 132142,
    values: bank10.slice(117, 123),
    names: Array.from({length: 6}, (_, index) => `override_action_${String(index).padStart(2, "0")}`)},
  {id: `${OWNER}.strategy-handler-bodies`, label: "策略处理器代码", start: 132148,
    values: [bank10.slice(123)], names: ["bytes"]},
  {id: `${OWNER}.select-enemy-action-entry`, label: "固定行动选择入口", start: 522973,
    values: [fixedEntry], names: ["bytes"]},
]);

function requireDocument(document) {
  if (document?.schema !== SCHEMA || document.module_id !== OWNER)
    throw new TypeError(`${OWNER}: 资源身份漂移`);
}

function describe(document) {
  requireDocument(document);
  const actions = document.status_override_actions;
  if (!Array.isArray(actions) || actions.length !== 6
      || actions.some((row, index) => row?.id !== index || row.action_id !== bank10[117 + index]))
    throw new TypeError(`${OWNER}: 状态覆盖行动 Origin 与 ROM 不一致`);
  return BLOCKS.flatMap(block => {
    let offset = 0;
    return block.values.map((value, index) => {
      const length = Array.isArray(value) ? value.length : block.widths ?? 1;
      const range = Object.freeze({space: "prg", offset: block.start + offset,
        length, endExclusive: block.start + offset + length});
      offset += length;
      const action = block.id === `${OWNER}.status-override-actions`;
      return {resourceId: OWNER, entityHandle: block.id, fieldName: block.names[index],
        defaultValue: value, readOnly: !action, writeback: ROM_WRITE_PENDING,
        ...(action ? {documentPath: ["status_override_actions", index, "action_id"]} : {}),
        physicalRange: range};
    });
  });
}

function objects(document) {
  const fields = describe(document);
  return BLOCKS.map(block => {
    const rows = fields.filter(field => field.entityHandle === block.id);
    return {id: block.id, label: block.label, fragmentIds: [],
      fields: rows.map(field => [field.entityHandle, field.fieldName]),
      editor: {kind: "numeric-table", rows: [block.id], rowLabels: [block.label],
        columns: rows.map(field => ({name: field.fieldName, label: field.fieldName,
          ...(block.id === `${OWNER}.status-override-actions` ? {
            semantic: {kind: "reference", targetModule: "enemy-action"},
            candidates: ACTION_CANDIDATES,
          } : {}),
          ...(Array.isArray(field.defaultValue) ? {array: true, length: field.defaultValue.length} : {})}))}};
  });
}

function validate(original, overrides) {
  if (overrides.some(row => row.entity_handle !== `${OWNER}.status-override-actions`
      || !/^override_action_0[0-5]$/u.test(row.field_name)))
    throw new TypeError(`${OWNER}: 只读字段不接受修改`);
  validateFieldOverrides(original, overrides, describe, (candidate, baseline) => {
    const expected = structuredClone(baseline);
    for (let index = 0; index < 6; index++) {
      const actionId = candidate.document.status_override_actions?.[index]?.action_id;
      if (!Number.isInteger(actionId) || actionId < 0 || actionId >= ACTION_COUNT)
        throw new TypeError(`${OWNER}: 状态覆盖行动不在已发布行动域`);
      expected.document.status_override_actions[index].action_id = actionId;
    }
    if (!canonicalJsonEqual(candidate, expected))
      throw new TypeError(`${OWNER}: 状态覆盖行动之外的正文不可修改`);
  });
}

export const enemyActionSelectionFieldOwner = Object.freeze({
  compilerId: null, describe, objects, validate, encode: () => [],
  controls: mountFieldObjectControls, defaultSourceKind: "rom",
  physicalWriteback: false, documentView: true, legacyClosed: true,
  referenceCandidates: field => field?.entityHandle === `${OWNER}.status-override-actions`
    ? ACTION_CANDIDATES : null,
  writeback: ROM_WRITE_PENDING,
});
