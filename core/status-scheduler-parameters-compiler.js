// @editor-module 将三个状态阶段的结果脚本引用编码成独立 owner 逻辑片段。
import {canonicalJsonEqual} from "./project-store-values.js";
import {validateFieldOverrides} from "./field-codec.js";
export const STATUS_SCHEDULER_COMPILER_ID = "status-scheduler-parameters/v1";
export const STATUS_SCHEDULER_COMPONENT_CODEC = "metalmaxcn.status-scheduler-parameters";
const OWNER = "battle-status-scheduler";
const TABLES = ["pre_turn_result_script", "already_zero_recovery_script", "just_expired_recovery_script"];
function requireValue(condition, message) {if (!condition) throw new Error(message);}
export function statusSchedulerComponentSpecs(resourceId) {
  requireValue(resourceId === OWNER, "unknown status scheduler owner");
  return TABLES.map(key => ({fragmentId: `${OWNER}.${key.replaceAll("_", "-")}`, length: 16}));
}
export function statusSchedulerAssetSchema(resourceId) {
  statusSchedulerComponentSpecs(resourceId);
  return `metalmaxcn.module-asset.${OWNER}`;
}
function validateStatusSchedulerAsset(asset, original) {
  for (const candidate of [asset, original]) {
    const doc = candidate?.document;
    requireValue(candidate?.resource_id === OWNER && candidate.schema === statusSchedulerAssetSchema(OWNER)
      && candidate.edit_policy === "mutable" && doc?.module_id === OWNER
      && doc.schema === statusSchedulerAssetSchema(OWNER), "status scheduler identity/policy drift");
    const allowed = doc.result_script_candidates;
    requireValue(Array.isArray(allowed) && allowed.length > 0 && allowed.every((row, index) =>
      Number.isInteger(row?.id) && row.id >= 0 && row.id <= 255
      && row.handle === `battle-result-script:${row.id.toString(16).toUpperCase().padStart(2, "0")}`
      && (!index || row.id > allowed[index - 1].id)), "invalid published result script candidates");
    const handles = new Set(allowed.map(row => row.handle));
    const tables = doc.party_status_phase_result_script_tables;
    requireValue(tables && canonicalJsonEqual(Object.keys(tables).sort(), [...TABLES].sort()),
      "status phase table identity drift");
    for (const key of TABLES) {
      const rows = tables[key];
      requireValue(Array.isArray(rows) && rows.length === 16, "expected sixteen status entries");
      rows.forEach((row, index) => {
        requireValue(row.combined_status_index === index, "status index/order drift");
        requireValue(handles.has(row.result_script_reference), "请选择已发布的结果脚本");
      });
    }
  }
  const expected = structuredClone(original);
  TABLES.forEach(key => {
    asset.document.party_status_phase_result_script_tables[key].forEach((row, index) => {
      expected.document.party_status_phase_result_script_tables[key][index].result_script_reference = row.result_script_reference;
    });
  });
  requireValue(canonicalJsonEqual(asset, expected), "只允许修改状态阶段结果引用，索引、代码与提取快照不可修改");
}

const STATUS_PHASE_LABELS = Object.freeze({pre_turn_result_script: "回合前结果脚本",
  already_zero_recovery_script: "计数已为零的恢复脚本",
  just_expired_recovery_script: "计数刚归零的恢复脚本"});
export function statusSchedulerFieldDescriptions(document) {
  requireValue(document?.module_id === OWNER, "status field owner drift");
  const candidates = Object.freeze((document.result_script_candidates || []).map(row => row.handle));
  requireValue(candidates.length > 0, "status field candidates drift");
  return TABLES.flatMap((phase, component) => {
    const rows = document.party_status_phase_result_script_tables?.[phase], seen = new Set();
    requireValue(rows?.length === 16, "status field collection drift");
    return rows.map((row, index) => {
      const status = row.combined_status_index;
      requireValue(Number.isInteger(status) && status >= 0 && status < 16 && !seen.has(status), "status field identity drift");
      seen.add(status);
      return {resourceId: OWNER, entityHandle: `${OWNER}:${phase}:status:${status}`, fieldName: "result_script_reference",
        documentPath: ["party_status_phase_result_script_tables", phase, index, "result_script_reference"],
        defaultValue: row.result_script_reference, serialization: {references: candidates},
        fragmentId: statusSchedulerComponentSpecs(OWNER)[component].fragmentId,
        offsetInFragment: status, byteLength: 1};
    });
  });
}
export function validateStatusSchedulerFieldOverrides(original, overrides) {
  validateFieldOverrides(original, overrides, statusSchedulerFieldDescriptions, validateStatusSchedulerAsset);
}
export function encodeStatusSchedulerFields(fields, {defaults = false} = {}) {
  const payloads = TABLES.map(() => new Uint8Array(16)), seen = new Set();
  const positions = new Map(TABLES.flatMap((phase, component) => Array.from({length: 16}, (_, index) =>
    [`${OWNER}:${phase}:status:${index}`, {component, index}])));
  for (const field of fields) {
    const position = positions.get(field.entityHandle), value = defaults ? field.defaultValue : field.value;
    const match = typeof value === "string" && /^battle-result-script:([0-9A-F]{2})$/u.exec(value);
    requireValue(field.resourceId === OWNER && field.fieldName === "result_script_reference" && position
      && !seen.has(field.entityHandle) && match, "status build field identity/value drift");
    seen.add(field.entityHandle);
    const {component, index} = position;
    payloads[component][index] = Number.parseInt(match[1], 16);
  }
  requireValue(seen.size === 48, "status build fields incomplete");
  return statusSchedulerComponentSpecs(OWNER).map((spec, index) =>
    ({fragment_id: spec.fragmentId, payload: payloads[index], relocations: []}));
}

const statusPositions = new Map(TABLES.flatMap((phase, component) => Array.from({length: 16}, (_, index) =>
  [`${OWNER}:${phase}:status:${index}`, {component, index}])));
function statusFieldPosition(field) {
  const position = statusPositions.get(field.entityHandle);
  requireValue(field.resourceId === OWNER && field.fieldName === "result_script_reference" && position,
    "status build field identity/value drift");
  return position;
}
export function statusSchedulerObjects() {
  return statusSchedulerComponentSpecs(OWNER).map((spec, component) => {
    const rows = [...statusPositions].filter(([, position]) => position.component === component);
    return {id: spec.fragmentId, label: STATUS_PHASE_LABELS[TABLES[component]], fragmentIds: [spec.fragmentId],
      fields: rows.map(([handle]) => [handle, "result_script_reference"]),
      editor: {kind: "reference-table", rows: rows.map(([handle]) => handle),
        rowLabels: rows.map(([handle]) => `状态 ${handle.slice(handle.lastIndexOf(":") + 1)}`),
        columns: [{name: "result_script_reference", label: "结果脚本",
          candidates: {resourceId: OWNER, documentPath: ["result_script_candidates"],
            value: ["handle"], label: ["handle"]},
          semantic: {kind: "reference", targetModule: "battle-result-script"}}]}};
  });
}
export function serializeStatusSchedulerField(field) {
  statusFieldPosition(field);
  const match = typeof field.value === "string" && /^battle-result-script:([0-9A-F]{2})$/u.exec(field.value);
  requireValue(match, "status build field identity/value drift");
  return new Uint8Array([Number.parseInt(match[1], 16)]);
}
export function validateStatusSchedulerPreimage(fields, fragmentId, baseline) {
  const component = statusSchedulerComponentSpecs(OWNER).findIndex(spec => spec.fragmentId === fragmentId);
  requireValue(component >= 0 && baseline.length === 16 && fields.length === 16, "status Origin table identity/length drift");
  const seen = new Set();
  for (const field of fields) {
    const position = statusFieldPosition(field);
    requireValue(position.component === component && !seen.has(position.index), "status Origin field identity drift");
    const reference = `battle-result-script:${baseline[position.index].toString(16).toUpperCase().padStart(2, "0")}`;
    requireValue(reference === field.defaultValue, "status Origin differs from bound baseline");
    seen.add(position.index);
  }
}
