// @editor-module 从已发布 UI JSON 在浏览器内构建只读编辑器工程。
// Pure browser projection of the decoded UI catalogs. This module deliberately
// owns no file loading, persistence, ROM decoding, or writeback authority.

import {cloneValidatedJson as cloneJson} from "./project-store-values.js";

const SCHEMA = "metalmaxcn.ui-editor";

class UiEditorProjectError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "UiEditorProjectError";
  }
}

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const isObject = value => value !== null && typeof value === "object" &&
  !Array.isArray(value);
const asArray = value => Array.isArray(value) ? value : [];
const get = (value, key, fallback = null) => value !== null &&
  value !== undefined && hasOwn(value, key) ? value[key] : fallback;

function pyTruthy(value) {
  if (value === null || value === undefined || value === false || value === 0 ||
      value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (isObject(value)) return Object.keys(value).length > 0;
  return true;
}

function firstTruthy(...values) {
  return values.find(pyTruthy) ?? values[values.length - 1];
}

function requireDocument(value, name, optional = false) {
  if ((value === null || value === undefined) && optional) return null;
  if (!isObject(value)) {
    throw new UiEditorProjectError(`UI editor input ${name} is not an object`);
  }
  return value;
}

function compareText(left, right) {
  const a = String(left);
  const b = String(right);
  return a < b ? -1 : a > b ? 1 : 0;
}

function sortedValues(values) {
  return [...values].sort(compareText);
}

function sortedObject(counter) {
  return Object.fromEntries([...counter.entries()].sort(([left], [right]) =>
    compareText(left, right)));
}

function countBy(values, selector) {
  const result = new Map();
  for (const value of values) {
    const key = selector(value);
    result.set(key, (result.get(key) || 0) + 1);
  }
  return result;
}

function integer(value) {
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  const text = String(value).trim();
  if (!/^[+-]?\d+$/.test(text)) throw new TypeError(`invalid integer: ${text}`);
  const result = Number(text);
  if (!Number.isSafeInteger(result)) throw new TypeError(`invalid integer: ${text}`);
  return result;
}

function hex(value, width = 2) {
  const number = integer(value);
  if (number < 0) return `-${Math.abs(number).toString(16).toUpperCase()}`;
  return number.toString(16).toUpperCase().padStart(width, "0");
}

function stableToken(value) {
  const text = String(firstTruthy(value, "unknown")).trim();
  return text.replace(/[^0-9A-Za-z_.:-]+/g, "-").replace(/^-+|-+$/g, "") ||
    "unknown";
}

function command(value) {
  if (typeof value === "number" && Number.isInteger(value)) return `0x${hex(value)}`;
  const text = String(firstTruthy(value, "")).trim();
  if (!text) return "";
  const radix = text.toLowerCase().startsWith("0x") ? 16 : 10;
  const digits = radix === 16 ? text.slice(2) : text;
  const valid = radix === 16 ? /^[+-]?[0-9a-f]+$/i.test(digits) :
    /^[+-]?\d+$/.test(digits);
  if (!valid) {
    return text;
  }
  const number = Number.parseInt(digits, radix);
  return Number.isSafeInteger(number) ? `0x${hex(number)}` : text;
}

function commandNumber(value) {
  const normalized = command(value);
  if (!/^0x[0-9a-f]+$/i.test(normalized)) return null;
  return Number.parseInt(normalized.slice(2), 16);
}

function selectionLabel(choice, records, fallback) {
  const label = get(choice, "label_reference");
  const match = /^text-record:([0-9A-F]{2}):([0-9A-F]{3})$/.exec(get(label, "record", ""));
  const recordId = match ? `record:${match[1]}:${String(parseInt(match[2], 16)).padStart(3, "0")}` : null;
  const record = records[recordId];
  let text = firstTruthy(get(record, "formatted_text"), get(record, "display_text"),
    get(record, "unicode_preview"));
  if (text && get(label, "line") !== null) text = String(text).split("\n")[integer(label.line)];
  return {text: String(firstTruthy(get(choice, "visible_text"), text, fallback)), recordId, record};
}

function applicationCommandUid(value) {
  const number = commandNumber(value);
  return number === null ? null : `application-command:${hex(number)}`;
}

function recordParts(recordId) {
  const match = /^record:([0-9a-f]{1,2}):([0-9]{1,3})$/i.exec(
    String(firstTruthy(recordId, "")),
  );
  if (!match) return null;
  return [match[1].toUpperCase().padStart(2, "0"),
    String(Number.parseInt(match[2], 10)).padStart(3, "0")];
}

function recordUid(recordId, {layout = false} = {}) {
  const parts = recordParts(recordId);
  if (!parts) return null;
  return `${layout ? "ui-layout" : "ui-script"}:${parts[0]}:${parts[1]}`;
}

function recordAsset(recordId) {
  const parts = recordParts(recordId);
  if (!parts) return null;
  const region = parts[0];
  return [`text.script.region.${region.toLowerCase()}`,
    `assets/text/regions/region_${region}.bin`];
}

function reference(relation, target) {
  return pyTruthy(target) ? {relation, target} : null;
}

function uniqueReferences(references) {
  const result = [];
  const seen = new Set();
  for (const item of references) {
    if (!pyTruthy(item)) continue;
    const relation = String(get(item, "relation", null));
    const target = String(get(item, "target", null));
    const key = `${relation}\u0000${target}`;
    if (!relation || !target || seen.has(key)) continue;
    seen.add(key);
    result.push({relation, target});
  }
  return result;
}

function sourceFields(source) {
  if (!isObject(source)) return {};
  const result = {};
  for (const field of [
    "prg_offset", "prg_offset_hex", "file_offset", "file_offset_hex",
    "end_exclusive", "end_exclusive_hex", "length",
  ]) {
    if (get(source, field) !== null) result[field] = source[field];
  }
  const address = get(source, "address");
  if (isObject(address)) result.address = {...address};
  return result;
}

function recordSource(recordId, record, {kind, layout = false}) {
  const asset = recordAsset(recordId);
  const source = {
    kind,
    record: recordId,
    resource_uid: recordUid(recordId, {layout}),
  };
  if (asset) [source.component_id, source.asset_path] = asset;
  if (record !== null && record !== undefined) {
    const rawSource = layout ? get(record, "source") : record;
    Object.assign(source, sourceFields(rawSource));
    if (layout && pyTruthy(get(record, "path"))) {
      source.diagnostic_path = String(record.path);
    }
    if (!layout && get(record, "raw_hex") !== null) source.raw_hex = record.raw_hex;
  } else {
    source.resolution = "missing-decoded-record";
  }
  return source;
}

function readonly(reason, {declaredMode = null, constraint = null} = {}) {
  const value = {status: "readonly", reason};
  if (pyTruthy(declaredMode)) value.declared_mode = declaredMode;
  if (pyTruthy(constraint)) value.constraint = constraint;
  return value;
}

function previewOnly(reason) {
  return {status: "preview-only", reason};
}

function node(nodeId, nodeType, label, {
  children = null,
  properties = null,
  source = null,
  writeback = null,
  references = [],
} = {}) {
  return {
    id: nodeId,
    type: nodeType,
    label,
    children: [...(pyTruthy(children) ? children : [])],
    properties: {...(pyTruthy(properties) ? properties : {})},
    source: {...(pyTruthy(source) ? source : {})},
    writeback: {...(pyTruthy(writeback) ? writeback : previewOnly(
      "node has no independent ROM writeback source",
    ))},
    references: uniqueReferences(references),
  };
}

function treeReferences(nodes, childIds) {
  const references = [];
  const pending = [...childIds].reverse();
  const visited = new Set();
  while (pending.length) {
    const nodeId = pending.pop();
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    const current = nodes[nodeId];
    if (!current) continue;
    references.push(...get(current, "references", []));
    pending.push(...[...get(current, "children", [])].reverse());
  }
  return uniqueReferences(references);
}

function indexRecords(textCatalog) {
  const result = {};
  for (const record of asArray(get(textCatalog, "records", []))) {
    if (!isObject(record)) continue;
    const nodeId = String(firstTruthy(get(record, "node_id"), ""));
    if (nodeId) result[nodeId] = record;
  }
  return result;
}

function parseHexBytes(value) {
  const compact = value.replace(/\s+/g, "");
  if (!/^(?:[0-9a-f]{2})*$/i.test(compact)) return null;
  return compact.match(/[0-9a-f]{2}/gi) || [];
}

function glyphSlots(record) {
  if (!isObject(record)) return [];
  let recordLength;
  try {
    if (!hasOwn(record, "end_exclusive") || !hasOwn(record, "file_offset")) {
      throw new TypeError("missing record bounds");
    }
    recordLength = integer(record.end_exclusive) - integer(record.file_offset);
  } catch {
    recordLength = integer(firstTruthy(get(record, "length"), 0));
  }
  const slots = [];
  const seen = new Set();
  for (const item of asArray(get(record, "glyph_references", []))) {
    if (!isObject(item) || String(get(item, "mapping_status")) !== "confirmed") {
      continue;
    }
    let offset;
    try {
      if (!hasOwn(item, "offset")) throw new TypeError("missing offset");
      offset = integer(item.offset);
    } catch {
      continue;
    }
    const encodedHex = String(firstTruthy(get(item, "encoded_hex"), ""))
      .trim().toUpperCase();
    const encoded = parseHexBytes(encodedHex);
    const unicodeValue = String(firstTruthy(get(item, "unicode"), ""));
    if (seen.has(offset) || offset < 0 || offset + 2 > recordLength ||
        encoded?.length !== 2 || !unicodeValue) continue;
    seen.add(offset);
    slots.push({
      offset,
      unicode: unicodeValue,
      encoded_hex: encoded.join(" ").toUpperCase(),
    });
  }
  return slots.sort((left, right) => integer(left.offset) - integer(right.offset));
}

function textReferences(record, layer) {
  const references = [];
  if (record !== null && record !== undefined) {
    for (let target of asArray(get(record, "direct_targets", []))) {
      if (isObject(target)) target = get(target, "target");
      references.push(reference("includes-record", recordUid(target)));
    }
  }
  for (const target of Object.values(firstTruthy(get(layer, "provider_records"), {}))) {
    references.push(reference("uses-provider-record", recordUid(target)));
  }
  for (const pair of Object.values(firstTruthy(get(layer, "provider_record_pairs"), {}))) {
    if (!isObject(pair)) continue;
    let pairId;
    try {
      pairId = `record:${hex(pair.region)}:${String(integer(pair.record)).padStart(3, "0")}`;
    } catch {
      continue;
    }
    references.push(reference("uses-provider-record", recordUid(pairId)));
  }
  const runtimePair = get(layer, "runtime_record_pair");
  if (pyTruthy(runtimePair)) {
    references.push(reference("uses-runtime-record", recordUid(runtimePair)));
  }
  return references;
}

function providerProperties(layer) {
  const result = {};
  for (const field of [
    "provider_scripts", "provider_script_hex", "provider_values",
    "provider_constants", "provider_records", "provider_record_pairs",
    "provider_record_sequence", "provider_record_sequences", "runtime_record_pair",
  ]) {
    if (get(layer, field) !== null) result[field] = layer[field];
  }
  return result;
}

function dispatchSource(entry, commandId) {
  const result = {kind: "menu-dispatch-entry", command: commandId};
  const resourceUid = applicationCommandUid(commandId);
  if (resourceUid !== null) result.resource_uid = resourceUid;
  if (entry === null || entry === undefined) {
    result.resolution = "missing-dispatch-entry";
    return result;
  }
  for (const field of [
    "table_entry_prg_offset", "table_entry_prg_offset_hex",
    "table_entry_file_offset", "table_entry_file_offset_hex", "handler_bank",
    "handler_bank_hex", "handler_cpu", "handler_cpu_hex", "handler_prg_offset",
    "handler_prg_offset_hex", "handler_file_offset", "handler_file_offset_hex",
    "bank_resolution",
  ]) {
    if (get(entry, field) !== null) result[field] = entry[field];
  }
  if (get(entry, "table_entry_prg_offset") !== null) {
    result.prg_offset = entry.table_entry_prg_offset;
    result.prg_offset_hex = get(entry, "table_entry_prg_offset_hex");
    result.file_offset = get(entry, "table_entry_file_offset");
    result.file_offset_hex = get(entry, "table_entry_file_offset_hex");
    result.length = 2;
  }
  return result;
}

function expandedLayers(preview, compositions) {
  const compositionId = get(preview, "composition");
  if (pyTruthy(compositionId)) {
    const composition = compositions[String(compositionId)];
    if (!composition) return [[], String(compositionId)];
    return [asArray(get(composition, "layers", [])).map(layer => ({...layer})),
      String(compositionId)];
  }
  return [asArray(get(preview, "layers", [])).map(layer => ({...layer})), null];
}

function targetScreens(commandId, screens) {
  const candidates = screens.filter(screen =>
    asArray(get(screen, "command_path", [])).includes(commandId));
  if (!candidates.length) return [];
  const minimum = Math.min(...candidates.map(screen =>
    asArray(get(screen, "command_path", [])).length));
  return candidates.filter(screen =>
    asArray(get(screen, "command_path", [])).length === minimum)
    .map(screen => String(screen.id));
}

function facilitySummary(document) {
  if (document === null) {
    return {available: false, source_path: null, summary: {}, items: []};
  }
  const items = [];
  for (const facility of asArray(get(document, "facilities", []))) {
    if (!isObject(facility)) continue;
    const records = asArray(get(facility, "ui_records", [])).map(String);
    const commandIds = firstTruthy(get(facility, "investigation_command_ids_hex"),
      [get(facility, "investigation_command_id_hex")]);
    items.push({
      id: String(get(facility, "id")),
      label: String(firstTruthy(get(facility, "label"), get(facility, "id"))),
      kind: get(facility, "kind"),
      resource_uid: `ui-facility:${get(facility, "id")}`,
      command_ids: asArray(commandIds).filter(pyTruthy),
      ui_records: records,
      instance_count: asArray(get(facility, "instances", [])).length,
      configuration_count: asArray(get(firstTruthy(get(facility, "configuration"), {}),
        "variants", [])).length,
      references: uniqueReferences(records.map(recordId =>
        reference("uses-ui-script", recordUid(recordId)))),
      writeback: readonly("facility data is included only as cross-reference evidence"),
    });
  }
  return {
    available: true,
    source_path: "game/ui/facilities/index.json",
    schema: get(document, "schema"),
    summary: get(document, "summary", {}),
    items,
  };
}

function controlFlowAudit(dispatch, facilities, interfaces, reconstructedScreens) {
  const dispatchEntries = asArray(get(dispatch, "entries", [])).filter(item =>
    isObject(item) && typeof get(item, "command") === "number" &&
    Number.isInteger(item.command));
  const dispatchSummary = firstTruthy(get(dispatch, "summary"), {});
  const bankResolutionCounts = countBy(dispatchEntries, item =>
    String(firstTruthy(get(item, "bank_resolution"), "unresolved")));
  const handlerCpuValues = new Set(dispatchEntries
    .filter(item => typeof get(item, "handler_cpu") === "number" &&
      Number.isInteger(item.handler_cpu))
    .map(item => integer(item.handler_cpu)));
  const reconstructedScreenList = [...reconstructedScreens];

  const applications = firstTruthy(get(facilities, "applications"), {});
  const applicationCommands = asArray(get(applications, "commands", [])).filter(item =>
    isObject(item) && typeof get(item, "command_id") === "number" &&
    Number.isInteger(item.command_id));
  const applicationSummary = firstTruthy(get(applications, "summary"), {});
  const semanticStatusCounts = countBy(applicationCommands, item =>
    String(firstTruthy(get(item, "semantic_status"), "unresolved")));
  const applicationBuckets = {
    confirmed_purpose: [],
    purpose_inferred: [],
    purpose_unknown: [],
    investigation_associated_unknown: [],
  };
  for (const item of applicationCommands) {
    const status = String(firstTruthy(get(item, "semantic_status"), ""));
    const commandHex = String(firstTruthy(get(item, "command_id_hex"),
      `0x${hex(item.command_id)}`));
    const bucket = status === "confirmed-purpose" ? "confirmed_purpose" :
      status === "purpose-inferred" ? "purpose_inferred" :
        status.startsWith("investigation-associated") ?
          "investigation_associated_unknown" : "purpose_unknown";
    applicationBuckets[bucket].push(commandHex);
  }

  const transitions = interfaces.flatMap(item =>
    asArray(get(item, "transitions", [])).filter(isObject));
  const transitionStatusCounts = countBy(transitions, item =>
    String(firstTruthy(get(item, "status"), "unresolved")));
  const transitionKindCounts = countBy(transitions, item =>
    String(firstTruthy(get(item, "kind"), "unresolved")));
  const transitionScreenClaims = transitions.filter(item =>
    get(item, "screen_identity") === true).length;
  const catalogStates = interfaces.flatMap(interfaceItem =>
    asArray(get(interfaceItem, "states", [])).filter(isObject).map(state => ({
      id: String(get(state, "id")),
      label: String(firstTruthy(get(state, "label"), get(state, "id"))),
      interface_id: String(get(interfaceItem, "id")),
      ui_role: String(firstTruthy(get(state, "ui_role"), "")),
      status: String(firstTruthy(get(state, "status"), "unresolved")),
      evidence_kinds: sortedValues(Object.entries(firstTruthy(get(state, "evidence"), {}))
        .filter(([, value]) => pyTruthy(value)).map(([key]) => key)),
    })));
  const catalogRoleCounts = countBy(catalogStates, item =>
    firstTruthy(item.ui_role, "missing"));
  const nonScreenCatalogStates = catalogStates.filter(item => item.ui_role !== "screen");

  let dynamicBankEntries = bankResolutionCounts.get("dynamic-current-$A000-bank") || 0;
  const declaredDynamicEntries = get(dispatchSummary, "dynamic_bank_entries");
  if (declaredDynamicEntries !== null) dynamicBankEntries = integer(declaredDynamicEntries);
  const canonicalApplicationCounts = Object.fromEntries(
    Object.entries(applicationBuckets).map(([key, ids]) => [key,
      integer(get(applicationSummary, key, ids.length))]),
  );
  return {
    role: "control-flow-inventory-not-screen-inventory",
    identity_contract: {
      dispatch_entry_is_screen: false,
      application_command_is_screen: false,
      interface_transition_is_screen: false,
      screen_requires: "independent observable UI state identity; missing composition " +
        "or runtime evidence remains an explicit preview gap",
    },
    dispatch: {
      entries: dispatchEntries.length,
      catalogued_entries: integer(get(dispatchSummary, "catalogued_entries", 0)),
      discovered_entries: integer(get(dispatchSummary, "discovered_entries",
        Math.max(0, dispatchEntries.length -
          integer(get(dispatchSummary, "catalogued_entries", 0))))),
      dynamic_bank_entries: dynamicBankEntries,
      mapper_context_required_entries: dynamicBankEntries,
      bank_resolution_counts: sortedObject(bankResolutionCounts),
      unique_handler_cpu_values: handlerCpuValues.size,
      complete_reconstruction_previews: reconstructedScreenList.length,
      screen_claims_from_dispatch_entries: 0,
      entry_command_ids: dispatchEntries.map(item => `0x${hex(item.command)}`),
      dynamic_bank_command_ids: dispatchEntries
        .filter(item => String(firstTruthy(get(item, "bank_resolution"), "")) ===
          "dynamic-current-$A000-bank")
        .map(item => `0x${hex(item.command)}`),
    },
    facility_applications: {
      available: facilities !== null && applicationCommands.length > 0,
      commands: applicationCommands.length,
      ...canonicalApplicationCounts,
      semantic_status_counts: sortedObject(semanticStatusCounts),
      command_ids_by_purpose: Object.fromEntries(Object.entries(applicationBuckets)
        .map(([key, ids]) => [key, sortedValues(ids)])),
      screen_claims_from_application_commands: 0,
    },
    interface_transitions: {
      total: transitions.length,
      status_counts: sortedObject(transitionStatusCounts),
      kind_counts: sortedObject(transitionKindCounts),
      mapper_context_required: transitions.filter(item =>
        pyTruthy(get(item, "mapper_context_required"))).length,
      screen_identity_false: transitions.filter(item =>
        get(item, "screen_identity") === false).length,
      screen_identity_true: transitionScreenClaims,
      ids: transitions.map(item => String(get(item, "id"))),
    },
    catalog_state_roles: {
      total: catalogStates.length,
      role_counts: sortedObject(catalogRoleCounts),
      screen_state_ids: catalogStates.filter(item => item.ui_role === "screen")
        .map(item => item.id),
      non_screen_states: nonScreenCatalogStates,
      non_screen_state_ids: nonScreenCatalogStates.map(item => item.id),
      identity_contract: "only ui_role=screen is emitted as a UI editor screen",
      non_screen_states_promoted_to_screens: 0,
    },
    screen_claims_from_control_flow: transitionScreenClaims,
    consistency: {
      dispatch_bank_resolution_total_matches_entries:
        [...bankResolutionCounts.values()].reduce((sum, value) => sum + value, 0) ===
        dispatchEntries.length,
      application_purpose_total_matches_commands:
        Object.values(canonicalApplicationCounts).reduce((sum, value) => sum + value, 0) ===
        applicationCommands.length,
      transition_status_total_matches_transitions:
        [...transitionStatusCounts.values()].reduce((sum, value) => sum + value, 0) ===
        transitions.length,
      no_control_flow_promoted_to_screen: transitionScreenClaims === 0,
      all_catalog_states_have_explicit_ui_role: !catalogRoleCounts.has("missing"),
      no_non_screen_catalog_state_promoted: true,
    },
  };
}

function percent(numerator, denominator) {
  if (denominator <= 0) return 100.0;
  return Math.round((numerator * 10000.0 / denominator) + Number.EPSILON) / 100;
}

function stringList(value) {
  const values = Array.isArray(value) ? value : value === null || value === undefined ?
    [] : [value];
  const result = [];
  for (const item of values) {
    const text = String(firstTruthy(item, "")).trim();
    if (text && !result.includes(text)) result.push(text);
  }
  return result;
}

function interfaceStates(interfaceItem) {
  const result = [];
  const seenKeys = new Set();
  for (const [index, rawState] of asArray(get(interfaceItem, "states", [])).entries()) {
    if (!isObject(rawState)) {
      throw new UiEditorProjectError(
        `interface ${get(interfaceItem, "id")} state ${index} is not a v2 object`,
      );
    }
    const stateId = String(firstTruthy(get(rawState, "id"), "")).trim();
    const label = String(firstTruthy(get(rawState, "label"), "")).trim();
    const status = String(firstTruthy(get(rawState, "status"), "")).trim();
    const uiRole = String(firstTruthy(get(rawState, "ui_role"), "")).trim();
    const evidence = get(rawState, "evidence", {});
    if (!stateId || !label || !status ||
        !["screen", "action", "transition", "context"].includes(uiRole) ||
        !isObject(evidence)) {
      throw new UiEditorProjectError(
        `interface ${get(interfaceItem, "id")} state ${index} is missing ` +
        "id/label/status/ui_role/evidence",
      );
    }
    const key = stableToken(stateId);
    if (seenKeys.has(key)) {
      throw new UiEditorProjectError(
        `interface ${get(interfaceItem, "id")} has duplicate state id ${stateId}`,
      );
    }
    seenKeys.add(key);
    result.push({
      id: stateId,
      index,
      label,
      status,
      ui_role: uiRole,
      evidence,
      properties: Object.fromEntries(Object.entries(rawState).filter(([field]) =>
        !["id", "label", "status", "ui_role", "evidence"].includes(field))),
    });
  }
  return result;
}

function stateScreenId(interfaceId, state) {
  return `ui-screen:interface:${stableToken(interfaceId)}:state:${stableToken(state.id)}`;
}

function resolveState(stateReference, states) {
  if (stateReference === null || stateReference === undefined) return null;
  const text = String(stateReference).trim();
  if (!text) return null;
  return states.find(state => text === String(state.id)) || null;
}

function explicitStateReference(value) {
  return get(value, "interface_state_id");
}

function interfaceIds(value) {
  const ids = stringList(get(value, "interface_ids"));
  for (const interfaceId of stringList(get(value, "interface_id"))) {
    if (!ids.includes(interfaceId)) ids.push(interfaceId);
  }
  return ids;
}

function runtimePreview(scene, {sample = null, mapping = null} = {}) {
  sample = pyTruthy(sample) ? sample : {};
  const sceneId = String(firstTruthy(get(scene, "id"), get(sample, "id"), "unknown"));
  const previewPath = firstTruthy(get(scene, "preview"), get(sample, "preview"));
  const result = {
    scene_id: sceneId,
    label: firstTruthy(get(scene, "label"), get(sample, "label"), sceneId),
    path: previewPath,
    region_path: get(scene, "region_preview"),
    group: firstTruthy(get(scene, "group"), get(sample, "group")),
    phase: firstTruthy(get(scene, "phase"), get(sample, "phase")),
    route: get(scene, "route"),
    frame: get(scene, "frame"),
    status: firstTruthy(get(scene, "status"), get(sample, "status")),
    role: firstTruthy(get(scene, "ui_role"), get(sample, "ui_role"),
      get(sample, "role"), get(scene, "reference_role")),
  };
  if (pyTruthy(mapping)) result.mapping = mapping;
  return result;
}

function runtimeNode(scene, {sample = null, mapping}) {
  const preview = runtimePreview(scene, {sample, mapping});
  const sceneId = String(preview.scene_id);
  return node(`ui-node:runtime:${stableToken(sceneId)}:preview`, "runtime-preview",
    String(preview.label), {
      properties: {
        ...preview,
        render: get(scene, "render", {}),
        crop: get(scene, "crop"),
        runtime_components: asArray(get(scene, "runtime_components", []))
          .filter(isObject).map(component => Object.fromEntries(
            ["id", "path", "length", "sha256"].filter(field =>
              get(component, field) !== null).map(field => [field, component[field]]),
          )),
      },
      source: {
        kind: "runtime-scene-sample",
        scene_id: sceneId,
        index_path: "game/ui/index.json",
        preview_path: get(preview, "path"),
        source_role: "runtime-validation-not-rom-writeback-authority",
      },
      writeback: previewOnly(
        "runtime capture is derived validation evidence, not a ROM asset",
      ),
      references: [reference("runtime-scene", `ui-runtime-scene:${sceneId}`)],
    });
}

function interfaceSourceReferences(interfaceItem, facilityIds = []) {
  const references = [reference("interface-catalog",
    `ui-interface:${get(interfaceItem, "id")}`)];
  for (const region of asArray(get(interfaceItem, "script_regions", []))) {
    if (!isObject(region)) continue;
    let regionId = get(region, "id_hex");
    if (regionId === null && typeof get(region, "id") === "number" &&
        Number.isInteger(region.id)) regionId = hex(region.id);
    if (regionId !== null) {
      references.push(reference("uses-script-region",
        `ui-script-region:${String(regionId).toUpperCase().padStart(2, "0")}`));
    }
  }
  for (const layout of asArray(get(interfaceItem, "static_layouts", []))) {
    const recordId = isObject(layout) ? get(layout, "id") : layout;
    references.push(reference("uses-layout", recordUid(recordId, {layout: true})));
  }
  for (const application of asArray(get(interfaceItem, "application_commands", []))) {
    if (!isObject(application)) continue;
    let target = get(application, "resource_id");
    if (!pyTruthy(target) && pyTruthy(get(application, "command_id_hex"))) {
      target = `application-command:${String(application.command_id_hex).replace("0x", "")}`;
    }
    references.push(reference("uses-application-command", target));
  }
  references.push(...facilityIds.map(facilityId =>
    reference("uses-facility", `ui-facility:${facilityId}`)));
  return uniqueReferences(references);
}

function facilityIdsByInterface(interfaces, facilities) {
  const result = new Map();
  if (!pyTruthy(facilities)) return result;
  const facilityCommands = new Map();
  for (const facility of asArray(get(facilities, "facilities", []))) {
    if (!isObject(facility) || !pyTruthy(get(facility, "id"))) continue;
    const facilityId = String(facility.id);
    const rawCommands = firstTruthy(get(facility, "investigation_command_ids_hex"),
      [get(facility, "investigation_command_id_hex")]);
    facilityCommands.set(facilityId, new Set(asArray(rawCommands)
      .filter(value => value !== null && value !== undefined).map(command)));
  }
  for (const interfaceItem of interfaces) {
    const interfaceId = String(firstTruthy(get(interfaceItem, "id"), ""));
    const commands = new Set(asArray(get(interfaceItem, "application_commands", []))
      .filter(isObject).map(item => command(get(item, "command_id_hex",
        get(item, "command_id")))));
    for (const [facilityId, facilityCommandSet] of facilityCommands) {
      const singularMatch = interfaceId.replace(/s+$/, "") ===
        facilityId.replace(/s+$/, "");
      const intersects = [...commands].some(value => facilityCommandSet.has(value));
      if (singularMatch || intersects) {
        if (!result.has(interfaceId)) result.set(interfaceId, []);
        result.get(interfaceId).push(facilityId);
      }
    }
  }
  return result;
}

function itemResourceId(itemId) {
  const value = integer(itemId);
  if (value < 0 || value > 0xdd) {
    throw new UiEditorProjectError(
      `item ID is outside the extracted catalog: 0x${value.toString(16)}`,
    );
  }
  if (value === 0) return "item-entry:00";
  if ((value >= 0x41 && value <= 0x98) || (value >= 0xcb && value <= 0xdd)) {
    return `tank-item:${hex(value)}`;
  }
  return `human-item:${hex(value)}`;
}

function buildStateEvidenceNodes({
  interfaceId,
  state,
  records,
  layouts,
  dispatchEntries,
  vehiclePortraitsByRecord,
  nodes,
}) {
  const stateId = String(state.id);
  const stateToken = stableToken(stateId);
  const evidence = firstTruthy(get(state, "evidence"), {});
  const groupId = `ui-node:interface-state:${stateToken}:evidence`;
  const children = [];

  for (const [index, rawReference] of asArray(get(evidence, "records", [])).entries()) {
    const item = isObject(rawReference) ? rawReference : {id: rawReference};
    const recordId = String(firstTruthy(get(item, "id"), ""));
    const record = records[recordId] ?? null;
    const nodeId = `${groupId}:text:${stableToken(recordId)}:${String(index).padStart(2, "0")}`;
    const slots = glyphSlots(record);
    nodes[nodeId] = node(nodeId, "text",
      String(firstTruthy(get(item, "formatted_text"), get(record, "formatted_text"),
        recordId)), {
        properties: {
          evidence_kind: "record",
          evidence_only: true,
          visual_role: "source-evidence-not-composed",
          interface_id: interfaceId,
          state_id: stateId,
          record: recordId,
          formatted_text: firstTruthy(get(item, "formatted_text"),
            get(record, "formatted_text")),
          display_text: get(record, "display_text"),
          text_classification: get(record, "text_classification"),
          glyph_slots: slots,
        },
        source: recordSource(recordId, record,
          {kind: "interface-state-record-evidence"}),
        writeback: readonly(
          "state record is source evidence only; it has no composed placement",
        ),
        references: [reference("state-uses-record", recordUid(recordId))],
      });
    children.push(nodeId);
  }

  for (const [index, rawReference] of asArray(get(evidence, "layouts", [])).entries()) {
    const item = isObject(rawReference) ? rawReference : {id: rawReference};
    const layoutId = String(firstTruthy(get(item, "id"), ""));
    const layout = layouts[layoutId] ?? null;
    const vehiclePortrait = vehiclePortraitsByRecord[layoutId] ?? null;
    const properties = {
      evidence_kind: "layout",
      evidence_only: true,
      visual_role: "asset-preview-not-finished-screen",
      interface_id: interfaceId,
      state_id: stateId,
      record: layoutId,
      path: firstTruthy(get(item, "path"), get(layout, "path")),
      asset_preview: firstTruthy(get(item, "preview"), get(layout, "preview")),
      render: firstTruthy(get(item, "render"), get(layout, "render", {})),
    };
    const references = [reference("state-uses-layout",
      recordUid(layoutId, {layout: true}))];
    if (vehiclePortrait !== null) {
      const chassisId = integer(vehiclePortrait.chassis_id);
      properties.pattern_profiles = [vehiclePortrait.background_pattern_profile];
      properties.vehicle_portrait = {
        catalog_description: "战车命名 / 战车状态左上角战斗立绘",
        chassis_id: chassisId,
        chassis_id_hex: vehiclePortrait.chassis_id_hex,
        chassis_name_resource: itemResourceId(chassisId),
      };
      references.push(
        reference("uses-vehicle-portrait", `vehicle-portrait:${hex(chassisId)}`),
        reference("uses-chassis-name", itemResourceId(chassisId)),
      );
    }
    const nodeId = `${groupId}:layout:${stableToken(layoutId)}:${
      String(index).padStart(2, "0")}`;
    nodes[nodeId] = node(nodeId, "layout", `布局证据 ${layoutId}`, {
      properties,
      source: recordSource(layoutId, layout,
        {kind: "interface-state-layout-evidence", layout: true}),
      writeback: readonly(
        "layout asset is state evidence, not a finished-screen composition",
      ),
      references,
    });
    children.push(nodeId);
  }

  for (const [index, rawReference] of
    asArray(get(evidence, "dispatch_commands", [])).entries()) {
    const item = isObject(rawReference) ? rawReference : {command: rawReference};
    const commandId = command(get(item, "command_hex", get(item, "command")));
    const number = commandNumber(commandId);
    const entry = dispatchEntries.get(number === null ? -1 : number) ?? null;
    const nodeId = `${groupId}:action:${stableToken(commandId)}:${
      String(index).padStart(2, "0")}`;
    nodes[nodeId] = node(nodeId, "action", `命令证据 ${commandId}`, {
      properties: {
        evidence_kind: "dispatch-command",
        evidence_only: true,
        visual_role: "control-flow-evidence",
        interface_id: interfaceId,
        state_id: stateId,
        ...item,
        command: commandId,
      },
      source: dispatchSource(entry, commandId),
      writeback: readonly(
        "dispatch command is control-flow evidence, not an editable action",
      ),
      references: [reference("state-dispatches-command",
        applicationCommandUid(commandId))],
    });
    children.push(nodeId);
  }

  for (const [index, rawReference] of
    asArray(get(evidence, "runtime_scenes", [])).entries()) {
    const item = isObject(rawReference) ? rawReference : {id: rawReference};
    const sceneId = String(firstTruthy(get(item, "id"), ""));
    const nodeId = `${groupId}:runtime:${stableToken(sceneId)}:${
      String(index).padStart(2, "0")}`;
    nodes[nodeId] = node(nodeId, "evidence",
      `运行样本 ${firstTruthy(get(item, "label"), sceneId)}`, {
        properties: {
          evidence_kind: "runtime-scene",
          evidence_only: true,
          visual_role: "runtime-reference-not-embedded-preview",
          interface_id: interfaceId,
          state_id: stateId,
          ...item,
          scene_id: sceneId,
        },
        source: {
          kind: "runtime-scene-reference",
          scene_id: sceneId,
          source_path: "game/ui/index.json",
        },
        writeback: readonly("runtime-scene reference is derived validation evidence"),
        references: [reference("state-validated-by", `ui-runtime-scene:${sceneId}`)],
      });
    children.push(nodeId);
  }

  for (const [index, rawReference] of
    asArray(get(evidence, "reconstruction_previews", [])).entries()) {
    const item = isObject(rawReference) ? rawReference : {id: rawReference};
    const previewId = String(firstTruthy(get(item, "id"), ""));
    const nodeId = `${groupId}:reconstruction:${stableToken(previewId)}:${
      String(index).padStart(2, "0")}`;
    nodes[nodeId] = node(nodeId, "evidence",
      `重建预览 ${firstTruthy(get(item, "visible_state"), previewId)}`, {
        properties: {
          evidence_kind: "reconstruction-preview",
          evidence_only: true,
          visual_role: "linked-preview-not-state-identity",
          interface_id: interfaceId,
          state_id: stateId,
          ...item,
          preview_id: previewId,
        },
        source: {
          kind: "reconstruction-preview-reference",
          preview_id: previewId,
          source_path: "game/ui/construction/dispatch/index.json",
        },
        writeback: readonly("reconstruction reference is derived preview evidence"),
        references: [reference("state-reconstructed-by", `ui-menu:${previewId}`)],
      });
    children.push(nodeId);
  }

  for (const [index, rawReference] of
    asArray(get(evidence, "code_symbols", [])).entries()) {
    const item = isObject(rawReference) ? rawReference : {name: rawReference};
    const symbolName = String(firstTruthy(get(item, "name"), ""));
    const nodeId = `${groupId}:symbol:${stableToken(symbolName)}:${
      String(index).padStart(2, "0")}`;
    const source = {
      kind: "code-symbol-evidence",
      symbol: symbolName,
      ...sourceFields(item),
    };
    for (const field of ["cpu_address", "cpu_address_hex", "bank_8k"]) {
      if (get(item, field) !== null) source[field] = item[field];
    }
    nodes[nodeId] = node(nodeId, "evidence", `代码证据 ${symbolName}`, {
      properties: {
        evidence_kind: "code-symbol",
        evidence_only: true,
        visual_role: "code-evidence",
        interface_id: interfaceId,
        state_id: stateId,
        ...item,
      },
      source,
      writeback: readonly(
        "code symbol is navigable evidence, not an editable UI element",
      ),
      references: [reference("state-uses-code", `symbol:${symbolName}`)],
    });
    children.push(nodeId);
  }

  for (const [index, noteValue] of asArray(get(evidence, "notes", [])).entries()) {
    const noteId = `${groupId}:note:${String(index).padStart(2, "0")}`;
    nodes[noteId] = node(noteId, "evidence", `说明 ${index + 1}`, {
      properties: {
        evidence_kind: "note",
        evidence_only: true,
        visual_role: "annotation-only",
        interface_id: interfaceId,
        state_id: stateId,
        note: String(noteValue),
      },
      source: {
        kind: "interface-state-note",
        source_path: "game/ui/construction/interfaces/index.json",
      },
      writeback: readonly("state note is catalog annotation only"),
      references: [reference("annotates-interface-state",
        `ui-interface-state:${stateId}`)],
    });
    children.push(noteId);
  }

  const countKeys = [
    "records", "layouts", "dispatch_commands", "runtime_scenes",
    "reconstruction_previews", "code_symbols", "notes",
  ];
  nodes[groupId] = node(groupId, "evidence", "状态证据", {
    children,
    properties: {
      interface_id: interfaceId,
      state_id: stateId,
      state_status: get(state, "status"),
      evidence_only: true,
      has_visual_preview: false,
      counts: Object.fromEntries(countKeys.map(key =>
        [key, asArray(get(evidence, key, [])).length])),
    },
    source: {
      kind: "interface-state-evidence-catalog",
      source_path: "game/ui/construction/interfaces/index.json",
    },
    writeback: readonly(
      "evidence group is read-only source linkage, not visual composition",
    ),
    references: treeReferences(nodes, children),
  });
  return [groupId, [...nodes[groupId].references]];
}

/**
 * Build the complete read-only UI editor AST from already published JSON.
 * Every input is cloned before projection so neither this function nor a
 * subsequently mutated result can change the caller's source documents.
 */
export function buildUiEditorIndex(inputs) {
  if (!isObject(inputs)) {
    throw new UiEditorProjectError("UI editor inputs must be an object");
  }
  const dispatch = requireDocument(inputs.dispatch, "dispatch");
  const textCatalog = requireDocument(inputs.textCatalog, "textCatalog");
  const staticData = requireDocument(inputs.staticLayouts, "staticLayouts");
  const compositionCatalog = requireDocument(inputs.compositions, "compositions");
  const interfaceCatalog = requireDocument(inputs.interfaces, "interfaces");
  const facilities = requireDocument(inputs.facilities, "facilities", true);
  const runtimeIndex = requireDocument(inputs.runtimeUi, "runtimeUi", true);

  const records = indexRecords(textCatalog);
  const layouts = Object.fromEntries(asArray(get(staticData, "layouts", []))
    .filter(layout => isObject(layout) && pyTruthy(get(layout, "id")))
    .map(layout => [String(layout.id), layout]));
  const compositions = Object.fromEntries(
    asArray(get(compositionCatalog, "compositions", []))
      .filter(composition => isObject(composition) &&
        pyTruthy(get(composition, "id")))
      .map(composition => [String(composition.id), composition]),
  );
  const choiceGroups = asArray(get(dispatch, "choice_groups", []))
    .filter(group => isObject(group) && pyTruthy(get(group, "record")));
  const dispatchEntries = new Map(asArray(get(dispatch, "entries", []))
    .filter(entry => isObject(entry) && typeof get(entry, "command") === "number" &&
      Number.isInteger(entry.command))
    .map(entry => [integer(entry.command), entry]));
  const vehiclePortraitsByRecord = Object.fromEntries(
    asArray(get(firstTruthy(get(dispatch, "vehicle_portraits"), {}), "variants", []))
      .filter(variant => isObject(variant) && pyTruthy(get(variant, "record")) &&
        pyTruthy(get(variant, "background_pattern_profile")))
      .map(variant => [String(variant.record), variant]),
  );
  const previews = asArray(get(dispatch, "previews", []))
    .filter(preview => isObject(preview) && get(preview, "complete_menu") === true);
  const interfaces = asArray(get(interfaceCatalog, "interfaces", []))
    .filter(interfaceItem => isObject(interfaceItem) &&
      pyTruthy(get(interfaceItem, "id")));
  const runtimeScenes = asArray(get(runtimeIndex, "scenes", []))
    .filter(scene => isObject(scene) && pyTruthy(get(scene, "id")));

  const screens = [];
  const nodes = {};
  const edges = [];
  const screenLayers = new Map();
  const screenCompositions = new Map();

  for (const preview of previews) {
    const previewId = String(get(preview, "id"));
    const screenId = `ui-screen:${previewId}`;
    const rootNode = `ui-node:${stableToken(previewId)}:screen`;
    const commandPath = asArray(get(preview, "commands", []))
      .map(command).filter(Boolean);
    const viewport = {...firstTruthy(get(preview, "viewport"),
      {x: 0, y: 0, width: 256, height: 240})};
    const [layers, compositionId] = expandedLayers(preview, compositions);
    screenLayers.set(screenId, layers);
    screenCompositions.set(screenId, compositionId);
    const references = [reference("source-preview", `ui-menu:${previewId}`)];
    if (pyTruthy(compositionId)) {
      references.push(reference("uses-composition", `ui-composition:${compositionId}`));
    }
    screens.push({
      id: screenId,
      label: String(firstTruthy(get(preview, "visible_state"), previewId)),
      category: String(firstTruthy(get(preview, "category"), "reconstructed-menu")),
      domain: firstTruthy(get(preview, "domain"), "field"),
      source_kind: "reconstructed-preview",
      source_kinds: ["reconstructed-preview"],
      source_preview_id: previewId,
      root_node: rootNode,
      parent_screen_id: null,
      command_path: commandPath,
      viewport,
      runtime_preview: null,
      runtime_previews: [],
      visual_preview: {kind: "reconstructed-preview", source_preview_id: previewId},
      interface_ids: interfaceIds(preview),
      interface_state: explicitStateReference(preview),
      coverage: {
        status: "complete-menu-reconstruction",
        runtime_sampled: pyTruthy(get(preview, "save_state")),
        composition_source: compositionId ? "composition" : "layer-list",
        read_only_ast: true,
        visual_preview: "reconstructed",
        has_visual_preview: true,
      },
      writeback: previewOnly(
        "screen composition is reconstruction metadata, not a ROM asset",
      ),
      references: uniqueReferences(references),
    });
  }

  const screenById = new Map(screens.map(screen => [String(screen.id), screen]));
  const occurrenceCounts = new Map();
  const groupNodesByScreen = new Map();

  for (const screen of screens) {
    const screenId = String(screen.id);
    const previewId = String(screen.source_preview_id);
    const preview = previews.find(item => String(get(item, "id")) === previewId);
    const rootNode = String(screen.root_node);
    const backdropId = `ui-node:${stableToken(previewId)}:backdrop`;
    nodes[backdropId] = node(backdropId, "backdrop", "背景 / 运行上下文", {
      properties: {
        mode: pyTruthy(get(preview, "save_state")) ? "runtime-sample-context" :
          "transparent-reconstruction-context",
        viewport: screen.viewport,
        save_state: get(preview, "save_state"),
        runtime_context: get(preview, "runtime_context"),
        runtime_evidence: get(preview, "runtime_evidence"),
      },
      source: {
        kind: "preview-context",
        preview_id: previewId,
        save_state: get(preview, "save_state"),
      },
      writeback: previewOnly(
        "runtime backgrounds and save states are validation context only",
      ),
    });
    const rootChildren = [backdropId];
    const layerNodeByRecord = new Map();

    for (const [layerIndex, layer] of screenLayers.get(screenId).entries()) {
      const kind = String(firstTruthy(get(layer, "kind"), "overlay"));
      const recordId = String(firstTruthy(get(layer, "record"), ""));
      const occurrenceKey = JSON.stringify([screenId, kind,
        firstTruthy(recordId, String(layerIndex))]);
      const occurrence = occurrenceCounts.get(occurrenceKey) || 0;
      occurrenceCounts.set(occurrenceKey, occurrence + 1);
      const identity = firstTruthy(recordId, `layer-${String(layerIndex).padStart(2, "0")}`);
      const layerNodeId = `ui-node:${stableToken(previewId)}:${stableToken(kind)}:` +
        `${stableToken(identity)}:${String(occurrence).padStart(2, "0")}`;
      let layerChildren = [];
      let properties;
      let source;
      let writeback;
      let references;
      let label;
      let nodeType;
      if (kind === "layout") {
        const layout = layouts[recordId] ?? null;
        const declared = firstTruthy(get(layout, "writeback"), {});
        properties = {
          order: layerIndex,
          record: recordId,
          transform: Object.fromEntries(["shift", "cursor", "page_index"]
            .filter(key => get(layer, key) !== null).map(key => [key, layer[key]])),
          render: get(layout, "render", {}),
          composition_id: screenCompositions.get(screenId),
        };
        source = recordSource(recordId, layout,
          {kind: "ui-layout-record", layout: true});
        writeback = readonly(
          "layout AST is observational; no record encoder is attached",
          {declaredMode: get(declared, "mode"), constraint: get(declared, "constraint")},
        );
        references = [
          reference("uses-layout", recordUid(recordId, {layout: true})),
          reference("shares-script-record", recordUid(recordId)),
        ];
        label = `布局 ${recordId}`;
        nodeType = "layout";
      } else if (kind === "script") {
        const record = records[recordId] ?? null;
        const slots = glyphSlots(record);
        properties = {
          order: layerIndex,
          record: recordId,
          cursor: get(layer, "cursor"),
          page_index: get(layer, "page_index"),
          display_text: get(record, "display_text"),
          formatted_text: get(record, "formatted_text"),
          unicode_preview: get(record, "unicode_preview"),
          text_classification: get(record, "text_classification"),
          commands: get(record, "commands", []),
          providers: providerProperties(layer),
          glyph_slots: slots,
        };
        source = recordSource(recordId, record, {kind: "ui-script-record"});
        writeback = readonly(
          "text AST is observational; editing and ROM writeback are " +
          "not enabled in this phase",
          {declaredMode: slots.length ? "fixed-glyph-slot-preview" :
            "decoded-script-record"},
        );
        references = [reference("uses-ui-script", recordUid(recordId)),
          ...textReferences(record, layer)];
        const labelText = firstTruthy(get(record, "formatted_text"),
          get(record, "display_text"));
        label = pyTruthy(labelText) ? `文字 ${recordId} · ${labelText}` : `文字 ${recordId}`;
        nodeType = "text";
      } else if (kind === "rom_tile_grid") {
        const inputLoopCpu = get(firstTruthy(get(preview, "runtime_context"), {}),
          "input_loop_cpu");
        const actionId = `${layerNodeId}:selection-action`;
        const optionId = `${layerNodeId}:current-cell`;
        nodes[actionId] = node(actionId, "action", "提交当前字符格", {
          properties: {
            action_kind: "select-current-grid-cell",
            handler_cpu_hex: inputLoopCpu,
            cell_identity: "unresolved",
          },
          source: {
            kind: "name-entry-input-loop",
            handler_cpu_hex: inputLoopCpu,
            preview_id: previewId,
          },
          writeback: readonly("selection behaviour is code evidence only"),
        });
        nodes[optionId] = node(optionId, "option", "当前光标字符格", {
          children: [actionId],
          properties: {index: null, command: null, cell_mapping_status: "unresolved"},
          source: {kind: "rom-tile-grid-selection-template", preview_id: previewId},
          writeback: readonly(
            "individual selectable glyph identities are unresolved",
          ),
        });
        layerChildren = [optionId];
        properties = {
          order: layerIndex,
          kind,
          source_prg_offset: get(layer, "source_prg_offset"),
          length: get(layer, "length"),
          raw_hex: get(layer, "raw_hex"),
          destination_cursor: get(layer, "destination_cursor"),
          rows: get(layer, "rows"),
          groups_per_row: get(layer, "groups_per_row"),
          cells_per_group: get(layer, "cells_per_group"),
          group_gap: get(layer, "group_gap"),
          row_stride: get(layer, "row_stride"),
          extra_writes: get(layer, "extra_writes", []),
          selection_semantics: "grid confirmed; per-cell glyph mapping unresolved",
        };
        source = {kind: "rom-tile-option-grid",
          ...firstTruthy(get(layer, "source"), {})};
        writeback = readonly("ROM tile grid is previewed without an editor codec");
        references = [];
        label = "字符选项网格";
        nodeType = "options";
      } else {
        properties = {order: layerIndex, layer};
        const directSource = {...firstTruthy(get(layer, "source"), {})};
        source = {kind, ...directSource};
        if (pyTruthy(directSource) || get(layer, "source_prg_offset") !== null) {
          source.prg_offset = get(layer, "source_prg_offset");
          source.length = get(layer, "length");
          if (get(layer, "source_prg_offset") === null) delete source.prg_offset;
          writeback = readonly(
            "physical source is known but this AST has no overlay codec",
          );
        } else {
          writeback = previewOnly(
            "overlay is reconstructed from runtime or catalog context",
          );
        }
        references = [];
        if (kind === "vehicle_portrait" && pyTruthy(get(layer, "chassis_id"))) {
          const chassis = commandNumber(get(layer, "chassis_id"));
          if (chassis !== null) {
            references.push(reference("uses-vehicle-portrait",
              `vehicle-portrait:${hex(chassis)}`));
          }
        }
        label = {
          rom_nametable: "ROM Nametable / Attribute",
          rom_palette: "ROM Palette Seed",
          rom_oam: "ROM OAM Template",
        }[kind] || `叠加层 ${kind}`;
        nodeType = "overlay";
      }

      nodes[layerNodeId] = node(layerNodeId, nodeType, label, {
        children: layerChildren,
        properties,
        source,
        writeback,
        references,
      });
      rootChildren.push(layerNodeId);
      if (recordId && !layerNodeByRecord.has(recordId)) {
        layerNodeByRecord.set(recordId, layerNodeId);
      }
    }

    for (const group of choiceGroups) {
      if (get(group, "selection_kind") &&
          !asArray(get(group, "interface_state_ids", [])).includes(screen.interface_state)) continue;
      const recordId = String(get(group, "record"));
      const ownerNode = layerNodeByRecord.get(recordId);
      if (!ownerNode) continue;
      const choiceCommands = new Set(asArray(get(group, "choices", []))
        .filter(isObject).map(choice => command(get(choice, "command"))));
      const active = screen.command_path.length > 0 &&
        !screen.command_path.some(value => choiceCommands.has(value));
      const optionsId = `ui-node:${stableToken(previewId)}:options:` +
        stableToken(get(group, "id"));
      const optionChildren = [];
      const optionsReferences = [reference("uses-ui-script", recordUid(recordId))];
      const record = records[recordId] ?? null;
      for (const choice of asArray(get(group, "choices", []))) {
        if (!isObject(choice)) continue;
        const optionIndex = integer(get(choice, "index", optionChildren.length));
        const commandId = command(get(choice, "command"));
        const localCommandId = command(get(choice, "local_command"));
        if (!commandId && !localCommandId) continue;
        const optionId = `${optionsId}:option:${String(optionIndex).padStart(2, "0")}`;
        const actionId = `${optionId}:action`;
        const label = selectionLabel(choice, records, commandId || localCommandId);
        const localTarget = get(choice, "target_state_id");
        const targets = localCommandId ? (localTarget ?
          [stateScreenId(String(localTarget).split(".")[0], {id: localTarget})] : []) :
          targetScreens(commandId, screens);
        const dispatchEntry = localCommandId ? get(choice, "dispatch") :
          dispatchEntries.get(commandId ? commandNumber(commandId) : -1) ?? null;
        const actionReferences = [
          ...(commandId ? [reference("dispatches-command", applicationCommandUid(commandId))] : []),
          ...targets.map(target => reference("opens-submenu", target)),
        ];
        nodes[actionId] = node(actionId, "action", `执行 ${commandId || localCommandId}`, {
          properties: {
            command: commandId,
            local_command: localCommandId || null,
            dispatch_protocol_id: get(group, "dispatch_protocol_id"),
            active_in_state: active,
            target_screen_id: targets.length === 1 ? targets[0] : null,
            target_screen_ids: targets,
          },
          source: dispatchSource(dispatchEntry, commandId),
          writeback: readonly(
            "dispatch handlers and submenu targets are code evidence",
          ),
          references: actionReferences,
        });
        nodes[optionId] = node(optionId, "option",
          label.text, {
            children: [actionId],
            properties: {
              index: optionIndex,
              visible_text: label.text,
              command: commandId,
              local_command: localCommandId || null,
              dispatch_protocol_id: get(group, "dispatch_protocol_id"),
              label_reference: get(choice, "label_reference"),
              active_in_state: active,
            },
            source: recordSource(label.recordId || recordId, label.record || record, {kind: "choice-label-record"}),
            writeback: readonly(
              "visible text has no independently verified byte span",
            ),
            references: commandId ? [reference("dispatches-command",
              applicationCommandUid(commandId))] : [],
          });
        optionChildren.push(optionId);
        if (commandId) optionsReferences.push(reference("dispatches-command",
          applicationCommandUid(commandId)));
      }
      const layout = firstTruthy(get(group, "layout"), {});
      nodes[optionsId] = node(optionsId, "options", `选项 ${get(group, "id")}`, {
        children: optionChildren,
        properties: {
          group_id: get(group, "id"),
          record: recordId,
          columns: get(layout, "columns"),
          rows: get(layout, "rows"),
          choice_count: optionChildren.length,
          active_in_state: active,
        },
        source: recordSource(recordId, record, {kind: "choice-group-record"}),
        writeback: readonly("choice order and dispatch coupling are not editable"),
        references: optionsReferences,
      });
      nodes[ownerNode].children.push(optionsId);
      if (!groupNodesByScreen.has(screenId)) groupNodesByScreen.set(screenId, []);
      groupNodesByScreen.get(screenId).push([group, optionsId, active]);
    }

    const rootReferences = [reference("source-preview", `ui-menu:${previewId}`),
      ...treeReferences(nodes, rootChildren)];
    const compositionId = screenCompositions.get(screenId);
    if (pyTruthy(compositionId)) {
      rootReferences.push(reference("uses-composition",
        `ui-composition:${compositionId}`));
    }
    nodes[rootNode] = node(rootNode, "screen", String(screen.label), {
      children: rootChildren,
      properties: {
        source_preview_id: previewId,
        command_path: screen.command_path,
        viewport: screen.viewport,
        composition_id: compositionId,
        save_state: get(preview, "save_state"),
        preview_kind: "reconstructed-preview",
        has_visual_preview: true,
      },
      source: {
        kind: "reconstructed-menu-preview",
        preview_id: previewId,
        source_catalog: get(dispatch, "source_catalog"),
      },
      writeback: previewOnly(
        "root tree is a projection over decoded ROM and runtime evidence",
      ),
      references: rootReferences,
    });
    screen.references = [...nodes[rootNode].references];
  }

  for (const [screenId, groups] of groupNodesByScreen) {
    for (const [group, optionsId, active] of groups) {
      if (!active) continue;
      for (const choice of asArray(get(group, "choices", []))) {
        if (!isObject(choice)) continue;
        const optionIndex = integer(get(choice, "index", 0));
        const commandId = command(get(choice, "command"));
        const localCommandId = command(get(choice, "local_command"));
        if (!commandId && !localCommandId) continue;
        const sourceNode = `${optionsId}:option:${
          String(optionIndex).padStart(2, "0")}:action`;
        const localTarget = get(choice, "target_state_id");
        const targets = localCommandId ? (localTarget ?
          [stateScreenId(String(localTarget).split(".")[0], {id: localTarget})] : []) :
          targetScreens(commandId, screens);
        const edgeType = targets.length ? "opens-submenu" : localCommandId ?
          "dispatches-local-command" : "dispatches-command";
        const status = targets.length === 1 ? "resolved-readonly" :
          targets.length ? "ambiguous-readonly" : "unresolved-readonly";
        edges.push({
          id: `ui-edge:${stableToken(screenId)}:${stableToken(get(group, "id"))}:` +
            String(optionIndex).padStart(2, "0"),
          type: edgeType,
          source_node: sourceNode,
          target_screen_id: targets.length === 1 ? targets[0] : null,
          target_screen_ids: targets,
          command: commandId,
          local_command: localCommandId || null,
          dispatch_protocol_id: get(group, "dispatch_protocol_id"),
          status,
        });
      }
    }
  }

  const parents = new Map();
  for (const edge of edges) {
    const sourceNode = String(edge.source_node);
    const sourceScreen = [...screenById].find(([, screen]) => sourceNode.startsWith(
      `ui-node:${stableToken(screen.source_preview_id)}:`,
    ))?.[0] ?? null;
    if (sourceScreen === null) continue;
    for (const target of edge.target_screen_ids) {
      const key = String(target);
      if (!parents.has(key)) parents.set(key, []);
      if (!parents.get(key).includes(sourceScreen)) parents.get(key).push(sourceScreen);
    }
  }
  for (const screen of screens) {
    const screenParents = parents.get(String(screen.id)) || [];
    screen.parent_screen_id = screenParents.length ? screenParents[0] : null;
    if (screenParents.length > 1) screen.parent_screen_ids = screenParents;
  }

  const reconstructedScreens = [...screens];
  const interfaceById = new Map(interfaces.map(interfaceItem =>
    [String(interfaceItem.id), interfaceItem]));
  const statesByInterface = new Map([...interfaceById].map(([interfaceId, interfaceItem]) =>
    [interfaceId, interfaceStates(interfaceItem)]));
  const facilitiesByInterface = facilityIdsByInterface(interfaces, facilities);
  const stateKey = (interfaceId, stateId) => `${interfaceId}\u0000${stateId}`;
  const stateScreens = new Map();
  const stateRoots = new Map();
  const interfaceDefinitionNodes = new Map();
  const reconstructionStateTargets = new Map();
  const runtimeStateEvidence = new Map();

  for (const [interfaceId, interfaceItem] of interfaceById) {
    const token = stableToken(interfaceId);
    const componentNodes = [];
    const interfaceReferences = interfaceSourceReferences(interfaceItem,
      facilitiesByInterface.get(interfaceId) || []);
    for (const [componentIndex, component] of
      asArray(get(interfaceItem, "components", [])).entries()) {
      let componentLabel;
      let componentProperties;
      if (isObject(component)) {
        componentLabel = String(firstTruthy(get(component, "label"),
          get(component, "name"), get(component, "id"), `组件 ${componentIndex + 1}`));
        componentProperties = {...component};
      } else {
        componentLabel = String(component);
        componentProperties = {description: componentLabel};
      }
      const componentId = `ui-node:interface:${token}:component:${
        String(componentIndex).padStart(2, "0")}`;
      nodes[componentId] = node(componentId, "component", componentLabel, {
        properties: {
          interface_id: interfaceId,
          component_index: componentIndex,
          ...componentProperties,
        },
        source: {
          kind: "interface-component-catalog",
          interface_id: interfaceId,
          source_path: "game/ui/construction/interfaces/index.json",
        },
        writeback: readonly(
          "conceptual component is catalog metadata, not a ROM span",
        ),
        references: interfaceReferences,
      });
      componentNodes.push(componentId);
    }

    const definitionId = `ui-node:interface:${token}:definition`;
    interfaceDefinitionNodes.set(interfaceId, definitionId);
    const applicationCommands = asArray(get(interfaceItem, "application_commands", []))
      .filter(isObject).map(item => Object.fromEntries([
        "command_id", "command_id_hex", "label", "kind", "semantic_status", "resource_id",
      ].filter(key => get(item, key) !== null).map(key => [key, item[key]])));
    const scriptRegions = asArray(get(interfaceItem, "script_regions", []))
      .filter(isObject).map(region => Object.fromEntries([
        "id", "id_hex", "name", "record_count", "path", "prg_offset_hex",
        "end_exclusive_hex",
      ].filter(key => get(region, key) !== null).map(key => [key, region[key]])));
    nodes[definitionId] = node(definitionId, "interface",
      String(firstTruthy(get(interfaceItem, "label"), interfaceId)), {
        children: componentNodes,
        properties: {
          interface_id: interfaceId,
          domain: get(interfaceItem, "domain"),
          category: get(interfaceItem, "category"),
          status: get(interfaceItem, "status"),
          family: get(interfaceItem, "family"),
          variants: [...get(interfaceItem, "variants", [])],
          description: get(interfaceItem, "description"),
          components: [...get(interfaceItem, "components", [])],
          data_sources: [...get(interfaceItem, "data_sources", [])],
          script_regions: scriptRegions,
          static_layouts: [...get(interfaceItem, "static_layouts", [])],
          application_commands: applicationCommands,
          catalog_states: statesByInterface.get(interfaceId).map(state => ({
            id: state.id,
            label: state.label,
            status: state.status,
            ui_role: state.ui_role,
          })),
          transitions: [...get(interfaceItem, "transitions", [])],
          transition_role: "control-flow-evidence-not-screen-identity",
          coverage: {...firstTruthy(get(interfaceItem, "coverage"), {})},
          facility_ids: facilitiesByInterface.get(interfaceId) || [],
        },
        source: {
          kind: "interface-catalog",
          interface_id: interfaceId,
          source_path: "game/ui/construction/interfaces/index.json",
          aggregation_only: true,
        },
        writeback: readonly(
          "interface definition aggregates previously registered evidence",
        ),
        references: interfaceReferences,
      });

    for (const state of statesByInterface.get(interfaceId)) {
      if (state.status === "unreachable") continue;
      const hasVisualEvidence = pyTruthy(get(state.evidence, "reconstruction_previews")) ||
        pyTruthy(get(state.evidence, "runtime_scenes"));
      if (state.ui_role !== "screen" && hasVisualEvidence) {
        throw new UiEditorProjectError(
          `non-screen catalog state ${state.id} cannot own ` +
          "runtime or reconstruction visual evidence",
        );
      }
      for (const item of asArray(get(state.evidence, "reconstruction_previews", []))) {
        const previewId = String(isObject(item) ? get(item, "id") : item);
        const target = [interfaceId, String(state.id)];
        if (!reconstructionStateTargets.has(previewId)) {
          reconstructionStateTargets.set(previewId, []);
        }
        if (!reconstructionStateTargets.get(previewId).some(existing =>
          existing[0] === target[0] && existing[1] === target[1])) {
          reconstructionStateTargets.get(previewId).push(target);
        }
      }
      for (const item of asArray(get(state.evidence, "runtime_scenes", []))) {
        const sample = isObject(item) ? {...item} : {id: String(item)};
        const sceneId = String(firstTruthy(get(sample, "id"), ""));
        sample.interface_state_id = String(state.id);
        if (!hasOwn(sample, "interface_state")) sample.interface_state = String(state.label);
        if (!runtimeStateEvidence.has(sceneId)) runtimeStateEvidence.set(sceneId, []);
        runtimeStateEvidence.get(sceneId).push([interfaceId, sample]);
      }
      if (state.ui_role !== "screen") continue;
      const commandPath = asArray(get(state.evidence, "dispatch_commands", []))
        .map(item => command(isObject(item) ?
          get(item, "command_hex", get(item, "command")) : item)).filter(Boolean);
      const screenId = stateScreenId(interfaceId, state);
      const rootNode = `ui-node:interface:${token}:state:${stableToken(state.id)}:screen`;
      const [evidenceNode, evidenceReferences] = buildStateEvidenceNodes({
        interfaceId,
        state,
        records,
        layouts,
        dispatchEntries,
        vehiclePortraitsByRecord,
        nodes,
      });
      const stateReference = `ui-interface-state:${state.id}`;
      const references = uniqueReferences([
        ...interfaceReferences,
        reference("interface-state", stateReference),
        ...evidenceReferences,
      ]);
      nodes[rootNode] = node(rootNode, "screen",
        `${firstTruthy(get(interfaceItem, "label"), interfaceId)} / ${state.label}`, {
          children: [definitionId, evidenceNode],
          properties: {
            interface_id: interfaceId,
            interface_label: get(interfaceItem, "label"),
            state_id: state.id,
            state_index: state.index,
            state_label: state.label,
            state_status: state.status,
            state_ui_role: state.ui_role,
            state_properties: state.properties,
            evidence_node: evidenceNode,
            domain: get(interfaceItem, "domain"),
            category: get(interfaceItem, "category"),
            runtime_previews: [],
            reconstructed_preview_ids: [],
            preview_kind: "source-assets-only",
            has_visual_preview: false,
          },
          source: {
            kind: "source-assets-only-interface-state",
            interface_id: interfaceId,
            state_id: state.id,
            state_status: state.status,
            source_path: "game/ui/construction/interfaces/index.json",
            aggregation_only: true,
          },
          writeback: previewOnly(
            "interface state is a preview taxonomy over decoded evidence",
          ),
          references,
        });
      const screen = {
        id: screenId,
        label: `${firstTruthy(get(interfaceItem, "label"), interfaceId)} / ${state.label}`,
        category: String(firstTruthy(get(interfaceItem, "category"), "uncategorized")),
        domain: get(interfaceItem, "domain"),
        source_kind: "source-assets-only",
        source_kinds: ["source-assets-only"],
        source_preview_id: null,
        root_node: rootNode,
        parent_screen_id: null,
        command_path: commandPath,
        viewport: {x: 0, y: 0, width: 256, height: 240},
        runtime_preview: null,
        runtime_previews: [],
        visual_preview: null,
        reconstructed_preview_ids: [],
        interface_ids: [interfaceId],
        interface_id: interfaceId,
        interface_state: state.label,
        interface_state_id: state.id,
        state_index: state.index,
        state_status: state.status,
        state_ui_role: state.ui_role,
        evidence_node: evidenceNode,
        coverage: {
          status: "interface-state-cataloged",
          semantic_status: state.status,
          runtime_sampled: false,
          source_assets: get(firstTruthy(get(interfaceItem, "coverage"), {}),
            "source_assets"),
          composition: get(firstTruthy(get(interfaceItem, "coverage"), {}),
            "composition"),
          read_only_ast: true,
          rom_coverage_claim: "none-aggregation-only",
          visual_preview: "none",
          has_visual_preview: false,
          no_preview_reason: "no runtime sample or reconstructed preview is linked " +
            "to this exact interface state",
        },
        writeback: previewOnly("interface state is catalog and preview metadata only"),
        references,
      };
      screens.push(screen);
      const key = stateKey(interfaceId, String(state.id));
      stateScreens.set(key, screen);
      stateRoots.set(key, nodes[rootNode]);
    }
  }

  const canonicalTargetsByCommand = new Map();
  for (const stateScreen of stateScreens.values()) {
    for (const value of asArray(get(stateScreen, "command_path", []))) {
      const commandId = command(value);
      if (!commandId) continue;
      if (!canonicalTargetsByCommand.has(commandId)) {
        canonicalTargetsByCommand.set(commandId, []);
      }
      if (!canonicalTargetsByCommand.get(commandId).includes(String(stateScreen.id))) {
        canonicalTargetsByCommand.get(commandId).push(String(stateScreen.id));
      }
    }
  }
  const catalogActionsByCommand = new Map();
  for (const states of statesByInterface.values()) {
    for (const state of states) {
      if (state.ui_role !== "action") continue;
      for (const item of asArray(get(state.evidence, "dispatch_commands", []))) {
        const commandId = command(isObject(item) ?
          get(item, "command_hex", get(item, "command")) : item);
        if (!commandId) continue;
        if (!catalogActionsByCommand.has(commandId)) catalogActionsByCommand.set(commandId, []);
        if (!catalogActionsByCommand.get(commandId).includes(state.id)) {
          catalogActionsByCommand.get(commandId).push(state.id);
        }
      }
    }
  }
  for (const edge of edges) {
    const commandId = command(get(edge, "command"));
    const canonicalTargets = [...(canonicalTargetsByCommand.get(commandId || "") || [])];
    const existingTargets = [...get(edge, "target_screen_ids", [])];
    let targets;
    let status;
    if (canonicalTargets.length === 1) {
      targets = canonicalTargets;
      status = "resolved-canonical-readonly";
    } else if (!existingTargets.length && canonicalTargets.length) {
      targets = canonicalTargets;
      status = "ambiguous-canonical-readonly";
    } else {
      const actionStateIds = [...(catalogActionsByCommand.get(commandId || "") || [])];
      if (!actionStateIds.length) continue;
      edge.type = "invokes-catalog-action";
      edge.status = "resolved-catalog-action-readonly";
      edge.catalog_action_state_ids = actionStateIds;
      const action = nodes[String(firstTruthy(get(edge, "source_node"), ""))];
      if (action) {
        action.properties.catalog_action_state_ids = actionStateIds;
        action.references = uniqueReferences([
          ...get(action, "references", []),
          ...actionStateIds.map(stateId => reference("invokes-catalog-action",
            `ui-interface-state:${stateId}`)),
        ]);
      }
      continue;
    }
    edge.type = "opens-submenu";
    edge.status = status;
    edge.target_screen_ids = targets;
    edge.target_screen_id = targets.length === 1 ? targets[0] : null;
    const action = nodes[String(firstTruthy(get(edge, "source_node"), ""))];
    if (action) {
      action.properties.target_screen_ids = targets;
      action.properties.target_screen_id = targets.length === 1 ? targets[0] : null;
      action.references = uniqueReferences([
        ...get(action, "references", []),
        ...targets.map(target => reference("opens-canonical-state", target)),
      ]);
    }
  }

  let reconstructedStateLinks = 0;
  const reconstructedLinkedScreens = new Set();
  const reconstructedInterfaceOnly = new Set();
  const reconstructedInvalidInterfaces = new Set();
  for (let index = 0; index < Math.min(reconstructedScreens.length, previews.length);
    index += 1) {
    const screen = reconstructedScreens[index];
    const preview = previews[index];
    const previewId = String(firstTruthy(get(preview, "id"), ""));
    const evidenceTargets = reconstructionStateTargets.get(previewId) || [];
    const requestedIds = interfaceIds(preview);
    for (const [interfaceId] of evidenceTargets) {
      if (!requestedIds.includes(interfaceId)) requestedIds.push(interfaceId);
    }
    const validInterfaces = requestedIds.filter(interfaceId =>
      interfaceById.has(interfaceId));
    const invalidInterfaces = sortedValues(new Set(requestedIds.filter(interfaceId =>
      !validInterfaces.includes(interfaceId))));
    if (invalidInterfaces.length) reconstructedInvalidInterfaces.add(String(screen.id));
    const linkedStateIds = [];
    const stateReference = explicitStateReference(preview);
    const resolvedTargets = [];
    for (const [interfaceId, stateId] of evidenceTargets) {
      if (!interfaceById.has(interfaceId)) continue;
      const state = resolveState(stateId, statesByInterface.get(interfaceId));
      if (state && !resolvedTargets.some(([existingInterface, existingState]) =>
        existingInterface === interfaceId && existingState.id === state.id)) {
        resolvedTargets.push([interfaceId, state]);
      }
    }
    for (const interfaceId of validInterfaces) {
      const state = resolveState(stateReference, statesByInterface.get(interfaceId));
      if (state && !resolvedTargets.some(([existingInterface, existingState]) =>
        existingInterface === interfaceId && existingState.id === state.id)) {
        resolvedTargets.push([interfaceId, state]);
      }
    }
    for (const [interfaceId, state] of resolvedTargets) {
      if (state.ui_role !== "screen") {
        throw new UiEditorProjectError(
          `reconstruction ${previewId} targets non-screen catalog state ${state.id}`,
        );
      }
      const key = stateKey(interfaceId, String(state.id));
      const target = stateScreens.get(key);
      const targetRoot = stateRoots.get(key);
      linkedStateIds.push(String(target.id));
      const reconstructedPreviewId = String(screen.source_preview_id);
      if (!target.reconstructed_preview_ids.includes(reconstructedPreviewId)) {
        target.reconstructed_preview_ids.push(reconstructedPreviewId);
      }
      const reconstructedRoot = nodes[String(screen.root_node)];
      if (reconstructedRoot) {
        for (const childId of get(reconstructedRoot, "children", [])) {
          if (!targetRoot.children.includes(childId)) targetRoot.children.push(childId);
        }
      }
      target.source_kinds = target.source_kinds.filter(kind =>
        kind !== "source-assets-only");
      if (!target.source_kinds.includes("reconstructed-preview")) {
        target.source_kinds.push("reconstructed-preview");
      }
      target.source_kind = "reconstructed-preview";
      target.visual_preview = {
        kind: "linked-reconstructed-preview",
        source_preview_ids: [...target.reconstructed_preview_ids],
      };
      Object.assign(target.coverage, {
        visual_preview: "linked-reconstruction",
        has_visual_preview: true,
      });
      delete target.coverage.no_preview_reason;
      Object.assign(targetRoot.properties, {
        reconstructed_preview_ids: [...target.reconstructed_preview_ids],
        reconstructed_tree_roots: reconstructedScreens
          .filter(reconstructedScreen => target.reconstructed_preview_ids.includes(
            get(reconstructedScreen, "source_preview_id"),
          )).map(reconstructedScreen => String(reconstructedScreen.root_node)),
        preview_kind: "linked-reconstructed-preview",
        has_visual_preview: true,
      });
      targetRoot.source.kind = "reconstructed-linked-interface-state";
      reconstructedStateLinks += 1;
      reconstructedLinkedScreens.add(String(screen.id));
      target.references = uniqueReferences([
        ...target.references,
        reference("reconstructed-by", String(screen.id)),
      ]);
      targetRoot.references = [...target.references];
    }
    if (validInterfaces.length && !linkedStateIds.length) {
      reconstructedInterfaceOnly.add(String(screen.id));
    }
    const mappingReferences = [
      ...validInterfaces.map(interfaceId => reference("belongs-to-interface",
        `ui-interface:${interfaceId}`)),
      ...linkedStateIds.map(target => reference("represents-interface-state", target)),
    ];
    screen.interface_ids = validInterfaces;
    screen.interface_state_screen_ids = linkedStateIds;
    screen.coverage.interface_mapping = linkedStateIds.length ? "state-linked" :
      validInterfaces.length ? "interface-only" : "unmapped";
    if (invalidInterfaces.length) {
      screen.coverage.invalid_interface_ids = invalidInterfaces;
    }
    if (validInterfaces.length === 1) {
      const interfaceItem = interfaceById.get(validInterfaces[0]);
      screen.category = String(firstTruthy(get(interfaceItem, "category"), screen.category));
      screen.domain = firstTruthy(get(interfaceItem, "domain"), screen.domain);
    }
    screen.references = uniqueReferences([...screen.references, ...mappingReferences]);
    const root = nodes[String(screen.root_node)];
    if (root) {
      root.references = uniqueReferences([...root.references, ...mappingReferences]);
      root.properties.interface_ids = validInterfaces;
      root.properties.interface_state_screen_ids = linkedStateIds;
    }
  }

  const reconstructedByScreenId = new Map(reconstructedScreens.map(screen =>
    [String(screen.id), screen]));
  for (const edge of edges) {
    const targets = [...get(edge, "target_screen_ids", [])];
    if (targets.length !== 1) continue;
    const provenanceTarget = reconstructedByScreenId.get(targets[0]);
    const canonicalTargets = [...get(provenanceTarget, "interface_state_screen_ids", [])];
    if (canonicalTargets.length !== 1) continue;
    const canonicalTarget = canonicalTargets[0];
    edge.target_screen_ids = [canonicalTarget];
    edge.target_screen_id = canonicalTarget;
    edge.status = "resolved-canonical-via-reconstruction-readonly";
    const action = nodes[String(firstTruthy(get(edge, "source_node"), ""))];
    if (action) {
      action.properties.target_screen_ids = [canonicalTarget];
      action.properties.target_screen_id = canonicalTarget;
      action.references = uniqueReferences([
        ...get(action, "references", []),
        reference("opens-canonical-state-via-reconstruction", canonicalTarget),
      ]);
    }
  }

  const runtimeBindings = new Map();
  for (const [sceneId, bindings] of runtimeStateEvidence) {
    runtimeBindings.set(sceneId, bindings.map(([interfaceId, sample]) =>
      [interfaceId, {...sample}]));
  }
  for (const [interfaceId, interfaceItem] of interfaceById) {
    for (const sample of asArray(get(interfaceItem, "runtime_samples", []))) {
      if (!isObject(sample) || !pyTruthy(get(sample, "id"))) continue;
      const sceneId = String(sample.id);
      if (!runtimeBindings.has(sceneId)) runtimeBindings.set(sceneId, []);
      const existing = runtimeBindings.get(sceneId)
        .find(([existingInterface]) => existingInterface === interfaceId)?.[1] ?? null;
      if (existing === null) {
        runtimeBindings.get(sceneId).push([interfaceId, sample]);
      } else {
        for (const [key, value] of Object.entries(sample)) {
          if (!hasOwn(existing, key)) existing[key] = value;
        }
      }
    }
  }

  const runtimeContexts = [];
  const runtimeStateMapped = new Set();
  const runtimeInterfaceMapped = new Set();
  const runtimeStandalone = new Set();
  const runtimeWithoutInterface = new Set();
  let runtimeStateLinks = 0;
  const runtimeSceneById = new Map(runtimeScenes.map(scene => [String(scene.id), scene]));

  for (const [sceneId, scene] of runtimeSceneById) {
    const bindings = [...(runtimeBindings.get(sceneId) || [])];
    for (const interfaceId of interfaceIds(scene)) {
      if (interfaceById.has(interfaceId) &&
          !bindings.some(item => item[0] === interfaceId)) {
        bindings.push([interfaceId, scene]);
      }
    }
    const sampleRoles = bindings.map(([, sample]) =>
      String(firstTruthy(get(sample, "ui_role"), "")));
    const uiRole = String(firstTruthy(get(scene, "ui_role"), ""));
    const isContext = uiRole === "context-backdrop" ||
      sampleRoles.includes("context-backdrop");
    if (isContext) {
      const preview = runtimePreview(scene,
        {mapping: "context-backdrop-not-ui-screen"});
      runtimeContexts.push({
        id: `ui-context:runtime:${stableToken(sceneId)}`,
        label: preview.label,
        category: firstTruthy(get(scene, "context_domain"), get(scene, "group"),
          "runtime-context"),
        source_kind: "runtime-backdrop-context",
        runtime_preview: preview,
        references: uniqueReferences([
          reference("runtime-scene", `ui-runtime-scene:${sceneId}`),
          reference("context-for-domain", `ui-domain:${
            firstTruthy(get(scene, "context_domain"), get(scene, "group"), "unknown")}`),
        ]),
        writeback: previewOnly("field/transition capture is backdrop context only"),
      });
      continue;
    }

    const mappedTargets = [];
    const validBindings = [];
    for (const [interfaceId, sample] of bindings) {
      if (!interfaceById.has(interfaceId)) continue;
      validBindings.push([interfaceId, sample]);
      let stateReference = explicitStateReference(sample);
      if (stateReference === null) stateReference = explicitStateReference(scene);
      const state = resolveState(stateReference, statesByInterface.get(interfaceId));
      if (state) {
        if (state.ui_role !== "screen") {
          throw new UiEditorProjectError(
            `runtime scene ${sceneId} targets non-screen catalog state ${state.id}`,
          );
        }
        mappedTargets.push([interfaceId, state, sample]);
      }
    }
    if (validBindings.length) runtimeInterfaceMapped.add(sceneId);

    const nodeSample = mappedTargets.length ? mappedTargets[0][2] :
      validBindings.length ? validBindings[0][1] : {};
    const runtimeSceneNode = runtimeNode(scene, {
      sample: nodeSample,
      mapping: mappedTargets.length ? "explicit-interface-state" :
        validBindings.length ? "interface-only" : "unmapped-runtime-ui",
    });
    const runtimeNodeId = String(runtimeSceneNode.id);
    nodes[runtimeNodeId] = runtimeSceneNode;

    if (mappedTargets.length) {
      runtimeStateMapped.add(sceneId);
      for (const [interfaceId, state, sample] of mappedTargets) {
        const key = stateKey(interfaceId, String(state.id));
        const target = stateScreens.get(key);
        const targetRoot = stateRoots.get(key);
        const preview = runtimePreview(scene,
          {sample, mapping: "explicit-interface-state"});
        if (!targetRoot.children.includes(runtimeNodeId)) {
          targetRoot.children.push(runtimeNodeId);
        }
        target.runtime_previews.push(preview);
        target.runtime_preview = target.runtime_previews[0];
        target.source_kinds = target.source_kinds.filter(kind =>
          kind !== "source-assets-only");
        if (!target.source_kinds.includes("runtime-sample")) {
          target.source_kinds.push("runtime-sample");
        }
        target.source_kind = "runtime-sample";
        target.visual_preview = preview;
        target.coverage.runtime_sampled = true;
        Object.assign(target.coverage,
          {visual_preview: "runtime-sample", has_visual_preview: true});
        delete target.coverage.no_preview_reason;
        target.references = uniqueReferences([
          ...target.references,
          reference("validated-by-runtime-scene", `ui-runtime-scene:${sceneId}`),
        ]);
        targetRoot.properties.runtime_previews = [...target.runtime_previews];
        Object.assign(targetRoot.properties,
          {preview_kind: "runtime-sample", has_visual_preview: true});
        targetRoot.source.kind = "runtime-sampled-interface-state";
        targetRoot.references = [...target.references];
        runtimeStateLinks += 1;
      }
      continue;
    }

    runtimeStandalone.add(sceneId);
    if (!validBindings.length) runtimeWithoutInterface.add(sceneId);
    const interfaceIdsForScene = validBindings.map(item => item[0]);
    const definitionChildren = interfaceIdsForScene
      .filter(interfaceId => interfaceDefinitionNodes.has(interfaceId))
      .map(interfaceId => interfaceDefinitionNodes.get(interfaceId));
    const rootNode = `ui-node:runtime:${stableToken(sceneId)}:screen`;
    const rootReferences = uniqueReferences([
      reference("runtime-scene", `ui-runtime-scene:${sceneId}`),
      ...interfaceIdsForScene.map(interfaceId => reference("belongs-to-interface",
        `ui-interface:${interfaceId}`)),
    ]);
    const boundSample = validBindings.length ? validBindings[0][1] : {};
    nodes[rootNode] = node(rootNode, "screen",
      String(firstTruthy(get(scene, "label"), sceneId)), {
        children: [...definitionChildren, runtimeNodeId],
        properties: {
          scene_id: sceneId,
          interface_ids: interfaceIdsForScene,
          interface_state: explicitStateReference(scene),
          runtime_preview: runtimePreview(scene, {
            sample: boundSample,
            mapping: interfaceIdsForScene.length ? "interface-only" :
              "unmapped-runtime-ui",
          }),
          preview_kind: "runtime-sample",
          has_visual_preview: true,
        },
        source: {
          kind: "runtime-ui-screen-sample",
          scene_id: sceneId,
          source_path: "game/ui/index.json",
        },
        writeback: previewOnly("standalone runtime UI is validation evidence only"),
        references: rootReferences,
      });
    const preview = runtimePreview(scene, {
      sample: boundSample,
      mapping: interfaceIdsForScene.length ? "interface-only" : "unmapped-runtime-ui",
    });
    const onlyInterface = interfaceIdsForScene.length === 1 ?
      interfaceById.get(interfaceIdsForScene[0]) : null;
    screens.push({
      id: `ui-screen:runtime:${stableToken(sceneId)}`,
      label: String(firstTruthy(get(scene, "label"), sceneId)),
      category: String(firstTruthy(get(onlyInterface, "category"), get(scene, "group"),
        "runtime-ui")),
      domain: onlyInterface ? get(onlyInterface, "domain") : get(scene, "group"),
      source_kind: "runtime-sample",
      source_kinds: ["runtime-sample"],
      source_preview_id: null,
      root_node: rootNode,
      parent_screen_id: null,
      command_path: [],
      viewport: {x: 0, y: 0, width: 256, height: 240},
      runtime_preview: preview,
      runtime_previews: [preview],
      visual_preview: preview,
      interface_ids: interfaceIdsForScene,
      interface_state: explicitStateReference(scene),
      coverage: {
        status: "runtime-sampled-ui-screen",
        runtime_sampled: true,
        interface_mapping: interfaceIdsForScene.length ? "interface-only" : "unmapped",
        read_only_ast: true,
        rom_coverage_claim: "none-derived-runtime-sample",
        visual_preview: "runtime-sample",
        has_visual_preview: true,
      },
      writeback: previewOnly(
        "runtime sample cannot be written back as a composed screen",
      ),
      references: rootReferences,
    });
  }

  const nodeValues = Object.values(nodes);
  const nodeTypes = countBy(nodeValues, item => String(item.type));
  const writebackStatuses = countBy(nodeValues, item => String(item.writeback.status));
  const resolvedScreenEdges = edges.filter(edge =>
    pyTruthy(get(edge, "target_screen_ids"))).length;
  const resolvedActionEdges = edges.filter(edge =>
    get(edge, "status") === "resolved-catalog-action-readonly").length;
  const unresolvedBehaviorEdges = edges.length - resolvedScreenEdges - resolvedActionEdges;
  let facilityIndex = facilitySummary(facilities);
  const textNodes = nodeValues.filter(item => item.type === "text");
  const glyphTextNodes = textNodes.filter(item =>
    pyTruthy(get(item.properties, "glyph_slots")));
  const uniqueTextRecords = new Set(textNodes.map(item =>
    String(get(item.properties, "record"))));
  const coverage = {
    decoded_records: Object.keys(records).length,
    text_nodes: textNodes.length,
    unique_text_records: uniqueTextRecords.size,
    glyph_text_nodes: glyphTextNodes.length,
    previewable_glyph_slots: glyphTextNodes.reduce((sum, item) =>
      sum + asArray(get(item.properties, "glyph_slots", [])).length, 0),
  };
  const catalogStateCount = [...statesByInterface.values()]
    .reduce((sum, states) => sum + states.length, 0);
  const allCatalogStates = [...statesByInterface.values()].flat();
  const catalogStateRoleCounts = countBy(allCatalogStates.filter(
    state => state.status !== "unreachable"), state => state.ui_role);
  const screenStateCount = stateScreens.size;
  const screenStatesWithRuntime = [...stateScreens.values()].filter(screen =>
    pyTruthy(get(screen, "runtime_previews"))).length;
  const runtimeContextIds = new Set(runtimeContexts.map(context =>
    String(context.runtime_preview.scene_id)));
  const runtimeUiSceneIds = new Set([...runtimeSceneById.keys()].filter(sceneId =>
    !runtimeContextIds.has(sceneId)));
  const runtimeAccountedIds = new Set([
    ...runtimeContextIds, ...runtimeStateMapped, ...runtimeStandalone,
  ]);
  const declaredRuntimeSceneIds = new Set(runtimeBindings.keys());
  const reconstructedWithInterface = new Set([
    ...reconstructedLinkedScreens, ...reconstructedInterfaceOnly,
  ]);
  const screenSourceKinds = countBy(screens, screen =>
    String(firstTruthy(get(screen, "source_kind"), "unknown")));
  const screenStateStatuses = countBy([...stateScreens.values()], screen =>
    String(firstTruthy(get(screen, "state_status"), "unknown")));
  const catalogStateStatuses = countBy(allCatalogStates, state => state.status);
  const stateEvidenceKinds = countBy(nodeValues.filter(item =>
    pyTruthy(get(get(item, "properties", {}), "evidence_kind"))), item =>
    String(get(item.properties, "evidence_kind")));
  const screensWithVisualPreview = screens.filter(screen =>
    pyTruthy(get(firstTruthy(get(screen, "coverage"), {}), "has_visual_preview"))).length;
  const sourceCounts = {
    reconstructed_menu_screens: reconstructedScreens.length,
    interface_definitions: interfaceById.size,
    catalog_state_nodes: catalogStateCount,
    interface_screen_states: screenStateCount,
    interface_action_states: catalogStateRoleCounts.get("action") || 0,
    interface_transition_states: catalogStateRoleCounts.get("transition") || 0,
    interface_context_states: catalogStateRoleCounts.get("context") || 0,
    runtime_scenes: runtimeSceneById.size,
    runtime_ui_scenes: runtimeUiSceneIds.size,
    runtime_backdrop_contexts: runtimeContextIds.size,
    interface_declared_runtime_scenes: declaredRuntimeSceneIds.size,
    facilities: facilitySummary(facilities).items.length,
  };
  const mergeCounts = {
    runtime_ui_scenes_merged_into_interface_states: runtimeStateMapped.size,
    runtime_interface_state_links: runtimeStateLinks,
    reconstructed_menus_linked_to_interfaces: reconstructedWithInterface.size,
    reconstructed_menus_linked_to_interface_states: reconstructedLinkedScreens.size,
    reconstructed_interface_state_links: reconstructedStateLinks,
  };
  const setDifference = (left, right) => new Set([...left].filter(value =>
    !right.has(value)));
  const unmappedCounts = {
    runtime_scenes_unaccounted: setDifference(new Set(runtimeSceneById.keys()),
      runtimeAccountedIds).size,
    runtime_ui_scenes_without_interface: runtimeWithoutInterface.size,
    runtime_ui_scenes_without_state: setDifference(runtimeUiSceneIds,
      runtimeStateMapped).size,
    reconstructed_menus_without_interface: reconstructedScreens.length -
      reconstructedWithInterface.size,
    reconstructed_menus_without_state: reconstructedScreens.length -
      reconstructedLinkedScreens.size,
    reconstructed_menus_with_invalid_interface_ids: reconstructedInvalidInterfaces.size,
    screen_states_without_runtime_preview: screenStateCount - screenStatesWithRuntime,
  };
  const coveragePercent = {
    screen_states_indexed: percent(stateScreens.size, screenStateCount),
    runtime_scenes_accounted: percent(runtimeAccountedIds.size, runtimeSceneById.size),
    runtime_ui_scenes_mapped_to_interface: percent(runtimeInterfaceMapped.size,
      runtimeUiSceneIds.size),
    runtime_ui_scenes_mapped_to_state: percent(runtimeStateMapped.size,
      runtimeUiSceneIds.size),
    reconstructed_menus_mapped_to_interface: percent(reconstructedWithInterface.size,
      reconstructedScreens.length),
    reconstructed_menus_mapped_to_state: percent(reconstructedLinkedScreens.size,
      reconstructedScreens.length),
  };
  Object.assign(coverage, {
    catalog_states: {
      declared: catalogStateCount,
      by_ui_role: sortedObject(catalogStateRoleCounts),
    },
    screen_states: {
      declared: screenStateCount,
      indexed: stateScreens.size,
      runtime_previewed: screenStatesWithRuntime,
    },
    runtime_scenes: {
      declared: runtimeSceneById.size,
      accounted: runtimeAccountedIds.size,
      ui_screens: runtimeUiSceneIds.size,
      backdrop_contexts: runtimeContextIds.size,
      state_mapped: runtimeStateMapped.size,
    },
    reconstructed_menus: {
      declared: reconstructedScreens.length,
      interface_linked: reconstructedWithInterface.size,
      state_linked: reconstructedLinkedScreens.size,
    },
    percent: coveragePercent,
  });

  const directlyReferencedRecords = new Set(nodeValues
    .filter(item => pyTruthy(get(get(item, "source", {}), "record")))
    .map(item => String(item.source.record)));
  const directlyReferencedLayouts = new Set(nodeValues
    .filter(item => get(item, "type") === "layout" &&
      pyTruthy(get(get(item, "properties", {}), "record")))
    .map(item => String(item.properties.record)));
  for (const interfaceItem of interfaces) {
    for (const layout of asArray(get(interfaceItem, "static_layouts", []))) {
      const recordId = isObject(layout) ? get(layout, "id") : layout;
      if (pyTruthy(recordId)) directlyReferencedLayouts.add(String(recordId));
    }
  }

  const allRecordIds = new Set(Object.keys(records));
  const allLayoutIds = new Set(Object.keys(layouts));
  const unassignedRecordIds = sortedValues(setDifference(allRecordIds,
    directlyReferencedRecords));
  const unassignedLayoutIds = sortedValues(setDifference(allLayoutIds,
    directlyReferencedLayouts));
  const interfaceRegionIds = new Set();
  for (const interfaceItem of interfaces) {
    for (const region of asArray(get(interfaceItem, "script_regions", []))) {
      if (!isObject(region)) continue;
      let regionId = get(region, "id_hex");
      if (regionId === null && typeof get(region, "id") === "number" &&
          Number.isInteger(region.id)) regionId = hex(region.id);
      if (regionId !== null) {
        interfaceRegionIds.add(String(regionId).toUpperCase().padStart(2, "0"));
      }
    }
  }
  const directlyReferencedRegions = new Set();
  const catalogRecordRegions = new Set();
  for (const recordId of directlyReferencedRecords) {
    const parts = recordParts(recordId);
    if (parts) directlyReferencedRegions.add(parts[0]);
  }
  for (const recordId of allRecordIds) {
    const parts = recordParts(recordId);
    if (parts) catalogRecordRegions.add(parts[0]);
  }
  let rawRegions = asArray(get(textCatalog, "regions", [])).filter(isObject);
  if (!rawRegions.length) {
    rawRegions = sortedValues(catalogRecordRegions).map(regionId => ({
      id: Number.parseInt(regionId, 16),
      id_hex: regionId,
      name: `脚本区 ${regionId}`,
      record_count: [...allRecordIds].filter(recordId =>
        recordParts(recordId)?.[0] === regionId).length,
    }));
  }
  const scriptRegionInventory = [];
  for (const region of rawRegions) {
    const regionId = String(firstTruthy(get(region, "id_hex"),
      typeof get(region, "id") === "number" && Number.isInteger(region.id) ?
        hex(region.id) : "")).toUpperCase().padStart(2, "0");
    const interfaceLinked = interfaceRegionIds.has(regionId);
    const directlyUsed = directlyReferencedRegions.has(regionId);
    const selected = Object.fromEntries([
      "id", "id_hex", "name", "record_count", "path", "binary_path",
      "prg_offset_hex", "file_offset_hex", "end_exclusive_hex", "length",
    ].filter(key => get(region, key) !== null).map(key => [key, region[key]]));
    scriptRegionInventory.push({
      ...selected,
      id_hex: regionId,
      interface_linked: interfaceLinked,
      directly_referenced_by_screen: directlyUsed,
      assignment: interfaceLinked ? "interface-linked" :
        "shared-dependency-unassigned-to-interface",
    });
  }
  const staticLayoutInventory = Object.entries(layouts).sort(([left], [right]) =>
    compareText(left, right)).map(([layoutId, layout]) => ({
      id: layoutId,
      asset_kind: "decoded-raw-tile-record",
      path: get(layout, "path"),
      preview: get(layout, "preview"),
      preview_role: "raw-tile-record-not-finished-ui-screen",
      length: get(layout, "length"),
      prg_offset_hex: get(firstTruthy(get(layout, "source"), {}), "prg_offset_hex"),
      directly_referenced_by_screen: directlyReferencedLayouts.has(layoutId),
      assignment: directlyReferencedLayouts.has(layoutId) ? "screen-linked" :
        "unassigned-shared-asset-gap",
    }));
  const controlFlow = controlFlowAudit(dispatch, facilities, interfaces,
    reconstructedScreens);
  const dispatchAudit = controlFlow.dispatch;
  const applicationAudit = controlFlow.facility_applications;
  const transitionAudit = controlFlow.interface_transitions;
  const intersectionSize = (left, right) => [...left].filter(value =>
    right.has(value)).length;
  const assetInventory = {
    role: "global-derived-asset-inventory-no-new-rom-coverage-claim",
    summary: {
      script_regions: scriptRegionInventory.length,
      script_regions_interface_linked: interfaceRegionIds.size,
      script_regions_shared_dependency: scriptRegionInventory.filter(item =>
        !item.interface_linked).length,
      script_records: allRecordIds.size,
      script_records_directly_referenced: intersectionSize(directlyReferencedRecords,
        allRecordIds),
      script_records_unassigned: unassignedRecordIds.length,
      static_layouts: allLayoutIds.size,
      static_layout_records: allLayoutIds.size,
      finished_static_ui_screens: 0,
      static_layouts_directly_referenced: intersectionSize(directlyReferencedLayouts,
        allLayoutIds),
      static_layouts_unassigned: unassignedLayoutIds.length,
      reconstructed_previews: reconstructedScreens.length,
      runtime_ui_samples: runtimeUiSceneIds.size,
      runtime_context_backdrops: runtimeContextIds.size,
      screens_with_visual_preview: screensWithVisualPreview,
      source_assets_only_screens: screenSourceKinds.get("source-assets-only") || 0,
      dispatch_entries: dispatchAudit.entries,
      dispatch_dynamic_bank_entries: dispatchAudit.dynamic_bank_entries,
      facility_application_commands: applicationAudit.commands,
      facility_application_confirmed_purpose: applicationAudit.confirmed_purpose,
      facility_application_purpose_inferred: applicationAudit.purpose_inferred,
      facility_application_purpose_unknown: applicationAudit.purpose_unknown,
      facility_application_investigation_associated_unknown:
        applicationAudit.investigation_associated_unknown,
      interface_transitions: transitionAudit.total,
      control_flow_entries_promoted_to_screens: controlFlow.screen_claims_from_control_flow,
    },
    script_regions: scriptRegionInventory,
    script_records: {
      total: allRecordIds.size,
      directly_referenced_ids: sortedValues([...directlyReferencedRecords]
        .filter(value => allRecordIds.has(value))),
      unassigned_ids: unassignedRecordIds,
      unassigned_role: "decoded shared assets not yet assigned to a concrete screen",
    },
    static_layouts: {
      total: allLayoutIds.size,
      role: "decoded-raw-tile-record-inventory",
      meaning: "the 47 entries are independently decoded/renderable tile-write " +
        "records; they are not 47 complete static UI screens and require " +
        "state placement/composition evidence before screen preview use",
      finished_screen_assets: 0,
      items: staticLayoutInventory,
      unassigned_ids: unassignedLayoutIds,
      unassigned_role: "renderable shared assets not yet assigned to a concrete screen",
    },
    reconstructed_previews: {
      total: reconstructedScreens.length,
      ids: reconstructedScreens.map(screen => String(screen.source_preview_id)),
    },
    runtime: {
      ui_samples: runtimeUiSceneIds.size,
      ui_sample_ids: sortedValues(runtimeUiSceneIds),
      context_backdrops: runtimeContextIds.size,
      context_backdrop_ids: sortedValues(runtimeContextIds),
    },
    control_flow_audit: controlFlow,
    gaps: {
      shared_dependency_script_region_ids: scriptRegionInventory
        .filter(item => !item.interface_linked).map(item => item.id_hex),
      unassigned_script_records: unassignedRecordIds.length,
      unassigned_script_record_ids_at: "asset_inventory.script_records.unassigned_ids",
      unassigned_static_layouts: unassignedLayoutIds.length,
      unassigned_static_layout_ids_at: "asset_inventory.static_layouts.unassigned_ids",
      meaning: "assets are extracted and previewable but are not yet assigned " +
        "to a concrete screen/state; this is an association gap, not " +
        "unregistered ROM coverage",
    },
  };
  Object.assign(sourceCounts, assetInventory.summary);
  facilityIndex = facilitySummary(facilities);
  return cloneJson({
    schema: SCHEMA,
    source_rom_sha256: firstTruthy(get(staticData, "source_sha256"),
      get(runtimeIndex, "source_sha256"), get(facilities, "source_sha256")),
    summary: {
      screens: screens.length,
      nodes: Object.keys(nodes).length,
      node_types: sortedObject(nodeTypes),
      edges: edges.length,
      resolved_screen_edges: resolvedScreenEdges,
      resolved_action_edges: resolvedActionEdges,
      unresolved_behavior_edges: unresolvedBehaviorEdges,
      preview_only_nodes: writebackStatuses.get("preview-only") || 0,
      readonly_nodes: writebackStatuses.get("readonly") || 0,
      editable_nodes: writebackStatuses.get("editable") || 0,
      coverage,
      facilities: facilityIndex.items.length,
      source_counts: sourceCounts,
      merge_counts: mergeCounts,
      unmapped_counts: unmappedCounts,
      coverage_percent: coveragePercent,
      screen_source_kinds: sortedObject(screenSourceKinds),
      screen_state_statuses: sortedObject(screenStateStatuses),
      catalog_state_statuses: sortedObject(catalogStateStatuses),
      catalog_state_roles: sortedObject(catalogStateRoleCounts),
      state_evidence_kinds: sortedObject(stateEvidenceKinds),
      screens_with_visual_preview: screensWithVisualPreview,
      screens_without_visual_preview: screens.length - screensWithVisualPreview,
    },
    screens,
    nodes,
    edges,
    facilities: facilityIndex,
    runtime_contexts: runtimeContexts,
    asset_inventory: assetInventory,
    interface_catalog: {
      available: true,
      source_path: "game/ui/construction/interfaces/index.json",
      schema: get(interfaceCatalog, "schema"),
      summary: get(interfaceCatalog, "summary", {}),
    },
    unmapped: {
      runtime_scenes_unaccounted: sortedValues(setDifference(
        new Set(runtimeSceneById.keys()), runtimeAccountedIds,
      )),
      runtime_ui_scenes_without_interface: sortedValues(runtimeWithoutInterface),
      runtime_ui_scenes_without_state: sortedValues(setDifference(runtimeUiSceneIds,
        runtimeStateMapped)),
      reconstructed_menus_without_interface: sortedValues(setDifference(
        new Set(reconstructedScreens.map(screen => String(screen.id))),
        reconstructedWithInterface,
      )),
      reconstructed_menus_without_state: sortedValues(setDifference(
        new Set(reconstructedScreens.map(screen => String(screen.id))),
        reconstructedLinkedScreens,
      )),
    },
  });
}
