// @editor-module 保存、重置 Unicode 字符映射并刷新文本引用投影。
// Browser-only lifecycle and derived projections for the external Unicode map.
//
// Unicode labels are project annotations. Their sparse fields have no physical
// ROM location; the glyph bitmap addresses in the source remain read-only evidence.

import {isPlainJsonObject, canonicalJsonEqual, cloneValidatedJson as cloneJson} from "./project-store-values.js";
import {validateFieldOverrides} from "./field-codec.js";

export const CHARACTER_MAP_RESOURCE_ID = "text.character-map";

const MANUAL_STATUSES = new Set(["confirmed", "manual-candidate", "rejected"]);
const MAPPED_STATUSES = new Set(["confirmed", "candidate", "manual-candidate"]);
const MAPPING_STATUSES = new Set([...MAPPED_STATUSES, "conflict", "unidentified", "rejected"]);
const CHARACTER_MAP_FIELDS = Object.freeze(["unicode", "status", "notes"]);
const characterMapHandle = encodedHex => `text.character-map:${encodedHex}`;

function characterCount(value) {
  return Array.from(String(value || "")).length;
}

function requireCharacterMapDocument(value) {
  if (!isPlainJsonObject(value) || !Array.isArray(value.records)) {
    throw new TypeError("text.character-map: invalid character-map document");
  }
  const codes = new Set();
  for (const record of value.records) {
    const code = String(record?.encoded_hex || "");
    if (!isPlainJsonObject(record) || !code || codes.has(code)) {
      throw new TypeError(`text.character-map: invalid/duplicate code ${code}`);
    }
    codes.add(code);
  }
  return value;
}

export function requireCharacterMapAsset(value) {
  if (!isPlainJsonObject(value) ||
      value.resource_id !== CHARACTER_MAP_RESOURCE_ID ||
      value.codec !== "character-map" ||
      !isPlainJsonObject(value.document)) {
    throw new TypeError("text.character-map: invalid character-map asset");
  }
  requireCharacterMapDocument(value.document);
  return value;
}

export function characterMapFieldDescriptions(document) {
  requireCharacterMapDocument(document);
  return document.records.flatMap((record, index) => CHARACTER_MAP_FIELDS.map(fieldName => ({
    resourceId: CHARACTER_MAP_RESOURCE_ID, entityHandle: characterMapHandle(record.encoded_hex),
    recordId: record.id, encodedHex: record.encoded_hex, fieldName, defaultValue: record[fieldName],
    documentPath: ["records", index, fieldName],
  })));
}

const CHARACTER_MAP_COLUMN_LABELS = Object.freeze({
  unicode: "Unicode 字", status: "状态", notes: "备注",
});

/**
 * 一张注解表一个字段对象（约束第 13 条）：每条字符记录一行，unicode／status／notes 各一列。
 * 记录身份是已发布的字形编码（`encoded_hex`）；字形位图、地址与候选是只读证据，不进控件。
 * 状态只能是已发布的那几种（`validateCharacterMapAsset`），候选清单未发布所以只按文本编辑。
 */
export function characterMapObjects(document, {offset = 0, limit} = {}) {
  const byHandle = new Map();
  for (const field of characterMapFieldDescriptions(document)) {
    const rows = byHandle.get(field.entityHandle) || [];
    rows.push(field);
    byHandle.set(field.entityHandle, rows);
  }
  const handles = [...byHandle.keys()];
  const objects = handles.length ? [{
    id: `${CHARACTER_MAP_RESOURCE_ID}.records`, label: "字符映射注解", fragmentIds: [],
    fields: handles.flatMap(handle => byHandle.get(handle)
      .map(field => [field.entityHandle, field.fieldName])),
    editor: {kind: "numeric-table", rows: handles,
      rowLabels: handles.map(handle => handle.slice(CHARACTER_MAP_RESOURCE_ID.length + 1)),
      columns: CHARACTER_MAP_FIELDS.map(name => ({name, label: CHARACTER_MAP_COLUMN_LABELS[name],
        text: true}))},
  }] : [];
  // 承载页按对象分页取数（`core/project-db.js` 的 offset/limit）。
  return limit === undefined ? objects.slice(offset) : objects.slice(offset, offset + limit);
}

function validateCharacterMapAsset(asset, original) {
  requireCharacterMapAsset(asset);
  const expected = structuredClone(original);
  for (const field of characterMapFieldDescriptions(original.document)) {
    const [, index, name] = field.documentPath;
    expected.document.records[index][name] = asset.document.records[index]?.[name];
  }
  if (!canonicalJsonEqual(asset, expected))
    throw new TypeError("character-map only unicode/status/notes annotations are editable");
  for (const record of asset.document.records) {
    if (typeof record.unicode !== "string" || typeof record.notes !== "string"
        || !MAPPING_STATUSES.has(record.status))
      throw new TypeError("character-map annotation type/status is invalid");
    if (MAPPED_STATUSES.has(record.status) ? characterCount(record.unicode) !== 1 : record.unicode !== "")
      throw new TypeError("character-map status and Unicode must agree");
  }
}

export function validateCharacterMapFieldOverrides(original, overrides) {
  validateFieldOverrides(original, overrides, characterMapFieldDescriptions, validateCharacterMapAsset);
}

export function projectCharacterMapFieldView(document) {
  for (const record of document.records) Object.defineProperty(record, "confidence", {
    enumerable: true, configurable: true, get: () => mappingConfidence(record.status),
  });
  Object.defineProperty(document.summary, "status_counts", {enumerable: true, configurable: true, get: () => {
    const counts = {};
    for (const record of document.records) counts[record.status] = (counts[record.status] || 0) + 1;
    return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
  }});
}

function inferredMapping(record) {
  const candidates = (record.candidates || []).filter(candidate =>
    isPlainJsonObject(candidate) && characterCount(candidate.unicode) === 1
  );
  if (candidates.length === 1) {
    return {status: "candidate", unicode: String(candidates[0].unicode)};
  }
  return {
    status: candidates.length > 1 ? "conflict" : "unidentified",
    unicode: "",
  };
}

function mappingConfidence(status) {
  if (status === "confirmed") return "user-confirmed";
  if (["candidate", "manual-candidate"].includes(status)) return "candidate";
  return "unconfirmed";
}

function refreshCharacterMapSummary(document) {
  const counts = {};
  for (const record of document.records) {
    const status = String(record.status || "unidentified");
    counts[status] = (counts[status] || 0) + 1;
  }
  document.summary = {
    ...(document.summary || {}),
    records: document.records.length,
    status_counts: Object.fromEntries(
      Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)),
    ),
  };
}

/** Apply validated workbench drafts to a cloned complete semantic asset. */
function applyCharacterMapChanges(asset, changes) {
  requireCharacterMapAsset(asset);
  if (!Array.isArray(changes) || !changes.length ||
      changes.length > asset.document.records.length) {
    throw new TypeError("character-map changes must be a non-empty array");
  }
  const next = cloneJson(asset);
  const records = new Map(next.document.records.map(record => [
    record.encoded_hex, record,
  ]));
  const seen = new Set();
  for (const change of changes) {
    if (!isPlainJsonObject(change)) {
      throw new TypeError("each character-map change must be an object");
    }
    const code = String(change.encoded_hex || "").trim().toUpperCase();
    const record = records.get(code);
    if (!record || seen.has(code)) {
      throw new TypeError(`unknown or duplicate character code ${code}`);
    }
    seen.add(code);
    const requestedStatus = String(change.status || "");
    if (requestedStatus === "auto") {
      const candidates = Array.isArray(change.candidates)
        ? change.candidates
        : record.candidates;
      Object.assign(record, inferredMapping({candidates}));
    } else if (MANUAL_STATUSES.has(requestedStatus)) {
      const unicode = String(change.unicode || "");
      if (["confirmed", "manual-candidate"].includes(requestedStatus) &&
          characterCount(unicode) !== 1) {
        throw new TypeError(
          `${requestedStatus} mapping ${code} must contain one Unicode character`,
        );
      }
      record.status = requestedStatus;
      record.unicode = requestedStatus === "rejected" ? "" : unicode;
    } else {
      throw new TypeError(`unsupported character-map status ${requestedStatus}`);
    }
    record.notes = String(change.notes || "").trim();
    record.confidence = mappingConfidence(record.status);
  }
  refreshCharacterMapSummary(next.document);
  return requireCharacterMapAsset(next);
}

/** Commit only changed annotation leaves, using the active DB's field objects. */
export async function saveCharacterMapChanges(database, changes, {expectedVersion} = {}) {
  const resolved = await database.readResource(CHARACTER_MAP_RESOURCE_ID);
  // A pending note draft must not restore a sibling consumer's newer mapping.
  const current = new Map(resolved.value.document.records.map(record => [record.encoded_hex, record]));
  const merged = changes.map(change => {
    if (!change.baseline) return change;
    const record = current.get(change.encoded_hex);
    if (!record) return change; // The common validator reports unknown identities.
    const mappingChanged = change.unicode !== change.baseline.unicode || change.status !== change.baseline.status;
    return {...change,
      ...(!mappingChanged ? {unicode: record.unicode, status: MANUAL_STATUSES.has(record.status) ? record.status : "auto"} : {}),
      notes: change.notes === change.baseline.notes ? record.notes : change.notes,
    };
  });
  const value = applyCharacterMapChanges(resolved.value, merged);
  const fields = await database.getFields(CHARACTER_MAP_RESOURCE_ID);
  const changedCodes = new Set(changes.map(change => change.encoded_hex));
  const updates = fields.filter(field => changedCodes.has(field.encodedHex)).flatMap(field => {
    const next = field.documentPath.reduce((node, key) => node[key], value.document);
    return next === field.value ? [] : [{field, value: next}];
  });
  if (updates.length) await database.writeFields(updates, {expectedVersion});
  const saved = await database.readResource(CHARACTER_MAP_RESOURCE_ID);
  return {...saved, changed_records: changes.length, rom_bytes_changed: 0};
}

/** Delete selected annotation overrides atomically; source and inferred evidence stay imported. */

export async function characterMapFieldStates(database) {
  const fields = await database.getFields(CHARACTER_MAP_RESOURCE_ID), states = {};
  for (const field of fields) states[field.encodedHex] = Boolean(states[field.encodedHex] || field.hasOverride);
  return {states, version: fields[0]?.version ?? null, dirty: fields.some(field => field.hasOverride)};
}

function unicodeReferenceSummary(references) {
  const ordered = [...references].sort(
    (left, right) => Number(left.offset || 0) - Number(right.offset || 0),
  );
  const statusCounts = {};
  let mappedGlyphs = 0;
  let confirmedGlyphs = 0;
  for (const reference of ordered) {
    const status = String(reference.mapping_status || "unidentified");
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    if (reference.unicode && MAPPED_STATUSES.has(status)) mappedGlyphs += 1;
    if (reference.unicode && status === "confirmed") confirmedGlyphs += 1;
  }
  let status;
  if (!ordered.length) status = "no-static-glyphs";
  else if (confirmedGlyphs === ordered.length) status = "confirmed";
  else if (mappedGlyphs === ordered.length) status = "candidate-complete";
  else if (mappedGlyphs) status = "partial";
  else status = "unmapped";
  const preview = ordered.map(reference => String(reference.unicode || "□")).join("");
  return {
    unicode_preview: preview,
    display_text: status === "confirmed" ? preview : null,
    unicode_mapping: {
      status,
      total_glyphs: ordered.length,
      mapped_glyphs: mappedGlyphs,
      confirmed_glyphs: confirmedGlyphs,
      status_counts: Object.fromEntries(
        Object.entries(statusCounts).sort(([left], [right]) =>
          left.localeCompare(right)),
      ),
      complete: mappedGlyphs === ordered.length,
      confirmed_complete: confirmedGlyphs === ordered.length,
    },
  };
}

/** 编码十六进制到字符映射记录的索引；逐条注解时建一次，不按记录重建。 */
export function characterMapIndex(characterMapDocument) {
  return new Map((characterMapDocument?.records || []).map(mapping => [
    mapping.encoded_hex, mapping,
  ]));
}

export function annotateTextRecord(record, characterMapDocument, mappings = null) {
  const index = mappings || characterMapIndex(characterMapDocument);
  const glyphReferences = (record.glyph_references || []).map(source => {
    const reference = {...source};
    const mapping = index.get(String(reference.encoded_hex || "")) || {};
    reference.unicode = String(mapping.unicode || "");
    reference.mapping_status = String(mapping.status || "unidentified");
    reference.mapping_confidence = String(mapping.confidence || "unconfirmed");
    return reference;
  });
  const literalReferences = (record.literal_tile_references || [])
    .filter(reference => isPlainJsonObject(reference) && reference.unicode)
    .map(reference => ({
      ...reference,
      mapping_status: String(reference.mapping_status || "confirmed"),
      mapping_confidence: String(
        reference.mapping_confidence || "runtime-font-table-confirmed",
      ),
    }));
  const annotation = {
    glyph_references: glyphReferences,
    literal_tile_references: literalReferences,
    ...unicodeReferenceSummary([...glyphReferences, ...literalReferences]),
  };
  if (annotation.display_text !== null) {
    const events = [...glyphReferences, ...literalReferences]
      .filter(reference => reference.unicode)
      .map(reference => [Number(reference.offset || 0), 1, String(reference.unicode)]);
    for (const command of record.commands || []) {
      const token = Number(command.token ?? -1);
      if ([0xE5, 0xE7].includes(token)) {
        events.push([Number(command.offset || 0), 0, "\n"]);
      } else if ([0xF0, 0xFE].includes(token) &&
          command.repeat_role !== "delimiter") {
        events.push([Number(command.offset || 0), 0, "\n\n"]);
      }
    }
    annotation.formatted_text = events
      .sort((left, right) => left[0] - right[0] || left[1] - right[1])
      .map(event => event[2]).join("").trim();
    while (annotation.formatted_text.includes("\n\n\n")) {
      annotation.formatted_text = annotation.formatted_text.replaceAll(
        "\n\n\n", "\n\n",
      );
    }
  } else {
    annotation.formatted_text = null;
  }
  return annotation;
}

/** Rebuild the current text projection from encoded/literal references. */
export function refreshTextCatalogFromCharacterMap(
  textCatalog,
  characterMapDocument,
) {
  if (!isPlainJsonObject(textCatalog) || !Array.isArray(textCatalog.records)) {
    throw new TypeError("text catalog must contain records");
  }
  const refreshed = cloneJson(textCatalog);
  const mappingStatuses = {};
  const mappings = characterMapIndex(characterMapDocument);
  for (const record of refreshed.records) {
    Object.assign(record, annotateTextRecord(record, characterMapDocument, mappings));
    const preview = String(record.formatted_text || record.unicode_preview || "");
    record.known_label = record.unicode_mapping.complete &&
      record.unicode_mapping.total_glyphs && preview && !preview.includes("□")
      ? preview : "";
    const status = record.unicode_mapping.status;
    mappingStatuses[status] = (mappingStatuses[status] || 0) + 1;
  }
  refreshed.summary = {
    ...(refreshed.summary || {}),
    unicode_mapping: {
      confirmed_records: mappingStatuses.confirmed || 0,
      candidate_complete_records: mappingStatuses["candidate-complete"] || 0,
      partial_records: mappingStatuses.partial || 0,
      unmapped_records: mappingStatuses.unmapped || 0,
      no_static_glyph_records: mappingStatuses["no-static-glyphs"] || 0,
    },
  };
  return refreshed;
}

/** 一条记录在当前投影下可供引用的当前文字；不能完整显示时没有引用。 */
export function textRecordReference(record) {
  const mapping = record?.unicode_mapping || {};
  const preview = String(record?.formatted_text || record?.unicode_preview || "");
  const nodeId = String(record?.node_id || "");
  if (!nodeId || !mapping.complete || !mapping.total_glyphs
      || !preview || preview.includes("□")) return null;
  return {
    node_id: nodeId,
    text: preview,
    status: String(mapping.status || "unmapped"),
    confirmed: mapping.status === "confirmed",
    prg_offset: record.prg_offset,
    prg_offset_hex: record.prg_offset_hex,
    length: record.length,
  };
}

function completeTextReferences(textCatalog) {
  const references = new Map();
  for (const record of textCatalog.records || []) {
    const reference = textRecordReference(record);
    if (reference) references.set(reference.node_id, reference);
  }
  return references;
}

/** 整份目录那一条路径的引用源：一条也不省，按调用方给的那份目录全查出来。 */
function eagerReferenceSource(textCatalog) {
  const map = completeTextReferences(textCatalog);
  return {
    nodeIds: [...map.keys()],
    get: nodeId => map.get(nodeId) || null,
  };
}

function projectGameDataNames(gameData, references) {
  const nodeIds = [];
  for (const [domain, region] of [
    ["items", 0x00],
    ["monsters", 0x01],
    ["shells", 0x0D],
  ]) {
    for (const entry of gameData?.[domain]?.records || []) {
      const recordId = Number.isInteger(entry.name_text_record_id)
        ? entry.name_text_record_id : entry.id;
      const fallback = String(entry.name_hint ?? entry.name ?? "");
      entry.name_hint = fallback;
      delete entry.name_reference;
      if (!Number.isInteger(recordId)) continue;
      const nodeId = `record:${region.toString(16).toUpperCase().padStart(2, "0")}:${
        String(recordId).padStart(3, "0")}`;
      Object.defineProperties(entry, {
        name: {enumerable: true, configurable: true, get: () => {
          const reference = references.get(nodeId);
          return reference ? reference.text : fallback;
        }},
        name_reference: {enumerable: true, configurable: true, get: () => references.get(nodeId) || undefined},
      });
      nodeIds.push(nodeId);
    }
  }
  return {get projected() {return nodeIds.filter(nodeId => references.get(nodeId)).length;}};
}

/**
 * 发布文本与字形的**权威投影**，供渲染时现查。
 *
 * 以前这里是把当前文字逐条抄进 `resource_index.records[].label`——引用处存名字
 * 副本，还得靠这段回写来维持同步。副本不许编辑，也不该缓存：一张按 id 可查的
 * 权威表就够了，实时查询的开销完全可以接受。
 */
function publishTextAuthorities(project, references, characterMapDocument) {
  // 引用处一律按 node_id 单条现查，整份记录表因此按需求值：懒索引只解它被问到的
  // 那几条，整份枚举会把「刷新整份目录」的代价又搬回来。
  const records = {};
  for (const nodeId of references.nodeIds || []) {
    Object.defineProperty(records, nodeId, {enumerable: true, configurable: true,
      get: () => references.get(nodeId) || undefined});
  }
  project.text_references = {
    records,
    glyphs: Object.fromEntries(
      (characterMapDocument.records || []).map(record => [
        String(record.encoded_hex),
        {get unicode() {return record.unicode || "";}, get status() {return record.status || "auto";}},
      ]),
    ),
  };
}

const textStatusPrefixes = new WeakMap();

function refreshResourceIndex(project, references, characterMapDocument) {
  const mappings = new Map((characterMapDocument.records || []).map(record => [
    record.encoded_hex, record,
  ]));
  publishTextAuthorities(project, references, characterMapDocument);
  // 只有 text 模块的索引记录带 unicode 状态；索引按模块存放后，这里也只碰那一份。
  for (const resource of project.resource_index?.by_domain?.text || []) {
    // label 不再回写：它是副本，渲染时由 resourceLabel() 到权威表现查。
    // status 留着——它不是名字的副本，是索引自己的分类结论；ui-script-record 的
    // 状态随字符映射变，因此按需求值，只有真正渲染到的那几行才解它的正文。
    if (resource.kind === "ui-script-record") {
      const nodeId = String(resource.game_id || "");
      // 前缀只从索引自己的分类结论里取一次；同一份投影对象会被下一次投影重新
      // 装一次取值器，重复读它会把自己的输出越叠越长。
      let prefix = textStatusPrefixes.get(resource);
      if (prefix === undefined) {
        prefix = String(resource.status || "").replace(/\/unicode-[^/]+$/, "");
        textStatusPrefixes.set(resource, prefix);
      }
      Object.defineProperty(resource, "status", {enumerable: true, configurable: true,
        get: () => `${prefix ? `${prefix}/` : ""}unicode-${
          references.get(nodeId)?.status || "unmapped"}`});
      continue;
    }
    if (resource.kind === "font-glyph") {
      const code = String(resource.uid || "").replace(/^font-glyph:/, "").replaceAll(":", " ");
      const mapping = mappings.get(code);
      resource.status = `unicode-${mapping?.status || "unidentified"}`;
      continue;
    }
  }
}

/** Apply current text and names to the in-memory static Web projection. */
export function applyCurrentTextReferencesToProject(
  project,
  textCatalog,
  characterMapDocument,
  {referenceIndex = null} = {},
) {
  if (!isPlainJsonObject(project)) {
    throw new TypeError("static Web project must be an object");
  }
  const references = referenceIndex || eagerReferenceSource(textCatalog);
  const gameData = isPlainJsonObject(project.game_data) ? project.game_data : null;
  const nameProjection = gameData
    ? projectGameDataNames(gameData, references)
    : {projected: 0};
  refreshResourceIndex(project, references, characterMapDocument);
  // 政策里的计数只对整份目录有意义；按需索引上没人读它，因此按需求值，读不到
  // 就不解任何一条记录。
  let policyCounts = null;
  const counts = () => {
    if (!policyCounts) {
      let confirmed = 0;
      let available = 0;
      for (const nodeId of references.nodeIds) {
        const reference = references.get(nodeId);
        if (!reference) continue;
        available += 1;
        if (reference.confirmed) confirmed += 1;
      }
      policyCounts = {available, confirmed};
    }
    return policyCounts;
  };
  const policy = {
    source: "browser:text.character-map + browser:text-record + script/text_catalog.json",
    identity: "stable region:record resource ID",
    display: "current complete Unicode preview",
    fallback: "import-time navigation hint",
    code_label_policy: "curated confirmed text evidence only",
    get projected_names() {return nameProjection.projected;},
  };
  for (const [name, read] of [
    ["provisional_text_allowed", () => counts().available > counts().confirmed],
    ["code_and_disassembly_renaming", () => {
      const {available, confirmed: confirmedCount} = counts();
      return available > 0 && available === confirmedCount;
    }],
    ["available_references", () => counts().available],
    ["confirmed_references", () => counts().confirmed],
    ["provisional_references", () => counts().available - counts().confirmed],
  ]) {
    Object.defineProperty(policy, name, {enumerable: true, configurable: true, get: read});
  }
  if (gameData) gameData.text_reference_policy = policy;
  if (project.ui) project.ui.current_text_reference_policy = policy;
  const mappingMetadata = project.ui?.construction?.font?.character_mapping;
  if (mappingMetadata) {
    mappingMetadata.status_counts = cloneJson(
      characterMapDocument.summary?.status_counts || {},
    );
    mappingMetadata.configured_records = characterMapDocument.records.length;
    mappingMetadata.applied_records = characterMapDocument.records.length;
  }
  return policy;
}

function cjkCharacters(value) {
  return Array.from(String(value || "")).filter(char =>
    (char >= "\u3400" && char <= "\u9fff") ||
    (char >= "\uf900" && char <= "\ufaff")
  );
}

export function characterMapCandidateSourcesAvailable(gameData) {
  return ["items", "monsters", "shells"].every(domain =>
    Array.isArray(gameData?.[domain]?.records)
  );
}

function extractKnownLabels(gameData) {
  const labels = [];
  for (const [sourceDomain, labelDomain, region] of [
    ["items", "item-name", "00"],
    ["monsters", "monster-name", "01"],
    ["shells", "shell-name", "0D"],
  ]) {
    for (const entry of gameData?.[sourceDomain]?.records || []) {
      const label = String(entry?.name_hint || entry?.name || "");
      const recordId = entry?.name_text_record_id;
      if (!label || recordId === null || recordId === undefined ||
          !Number.isInteger(Number(recordId))) continue;
      labels.push({
        domain: labelDomain,
        node_id: `record:${region}:${Number(recordId).toString(10).padStart(3, "0")}`,
        label,
        entity_id: String(entry.id_hex || entry.id),
      });
    }
  }
  return labels;
}

function inferCandidateEvidence(recordsMap, labels) {
  const evidence = new Map();
  const skipped = [];
  for (const label of labels) {
    const record = recordsMap instanceof Map
      ? recordsMap.get(String(label.node_id))
      : recordsMap?.[String(label.node_id)];
    let codes = Array.isArray(record?.glyph_codes)
      ? record.glyph_codes
      : (record?.glyph_references || [])
        .map(reference => String(reference.encoded_hex || ""))
        .filter(Boolean);
    const expected = Number(record?.summary?.glyph_tokens);
    if (Number.isInteger(expected) && codes.length !== expected) codes = [];
    const characters = cjkCharacters(label.label);
    if (!record || codes.length !== characters.length) {
      skipped.push({
        ...label,
        glyph_tokens: codes.length,
        cjk_characters: characters.length,
        reason: "glyph/known-label length mismatch",
      });
      continue;
    }
    for (let i = 0; i < codes.length; i++) {
      const code = codes[i];
      const char = characters[i];
      if (!evidence.has(code)) evidence.set(code, new Map());
      const charEvidence = evidence.get(code);
      if (!charEvidence.has(char)) charEvidence.set(char, []);
      charEvidence.get(char).push({
        record: label.node_id,
        domain: label.domain,
        entity_id: label.entity_id,
        known_label: label.label,
        confidence: "candidate-known-label-alignment",
      });
    }
  }
  return {evidence, skipped};
}

export function recomputeCharacterMapCandidates(document, textCatalog, gameData) {
  requireCharacterMapDocument(document);
  if (!isPlainJsonObject(textCatalog) || !Array.isArray(textCatalog.records)) {
    throw new TypeError("candidate source must be a published text catalog");
  }
  const next = cloneJson(document);
  const sources = new Map(document.records.map(record => [record.encoded_hex, record]));
  const labels = extractKnownLabels(gameData);
  const recordsMap = new Map(textCatalog.records.map(record => [
    String(record?.node_id || ""),
    record,
  ]));
  const {evidence, skipped} = inferCandidateEvidence(recordsMap, labels);
  for (const record of next.records) {
    const code = String(record.encoded_hex || "");
    const charEvidence = evidence.get(code);
    const candidateRows = [];
    if (charEvidence) {
      const entries = [...charEvidence.entries()].sort(
        (a, b) => b[1].length - a[1].length ||
          (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0),
      );
      for (const [unicode, evList] of entries) {
        candidateRows.push({
          unicode,
          evidence_count: evList.length,
          evidence: evList,
        });
      }
    }
    record.candidates = candidateRows;
    const currentStatus = String(record.status || "");
    if (MANUAL_STATUSES.has(currentStatus)) {
      // Preserve manual decisions
    } else if (candidateRows.length === 1) {
      record.status = "candidate";
      record.unicode = candidateRows[0].unicode;
    } else if (candidateRows.length > 1) {
      record.status = "conflict";
      record.unicode = "";
    } else {
      record.status = "unidentified";
      record.unicode = "";
    }
    record.confidence = mappingConfidence(record.status);
    const source = sources.get(code);
    if (Object.getOwnPropertyDescriptor(source, "unicode")?.get) {
      const inferred = inferredMapping({candidates: candidateRows});
      Object.defineProperties(record, {
        unicode: {enumerable: true, configurable: true, get: () =>
          MANUAL_STATUSES.has(source.status) ? source.unicode : inferred.unicode},
        status: {enumerable: true, configurable: true, get: () =>
          MANUAL_STATUSES.has(source.status) ? source.status : inferred.status},
        notes: {enumerable: true, configurable: true, get: () => source.notes},
      });
    }
  }
  next.skipped_known_labels = skipped;
  refreshCharacterMapSummary(next);
  next.summary.skipped_known_labels = skipped.length;
  if (next.records.some(record => Object.getOwnPropertyDescriptor(record, "unicode")?.get))
    projectCharacterMapFieldView(next);
  return requireCharacterMapDocument(next);
}
