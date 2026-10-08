// @editor-module 已发布候选的读数：控件候选与写入校验共用同一份，不各写一套。
// 候选来源只声明事实（哪份发布文档、哪条路径、取哪个字段、标签怎么拼），
// 解析本身在这里；`ui/field-object-editor.js` 渲染用它，数据层写入门也用同一份。

export function atPath(value, path) {
  return path.reduce((node, part) => (node === null || node === undefined ? undefined : node[part]), value);
}

/** 候选来源必须恰好给 resourceId 或 document 之一。 */
function candidateSourceKind(source) {
  if (!source || typeof source !== "object") throw new TypeError("候选来源声明无效");
  if ((source.resourceId ? 1 : 0) + (source.document ? 1 : 0) !== 1)
    throw new TypeError("候选来源只能给 resourceId 或 document 之一");
  if (!Array.isArray(source.documentPath) || !source.documentPath.length)
    throw new TypeError("候选来源缺少 documentPath");
  return source.resourceId ? {kind: "resource", id: source.resourceId} : {kind: "document", id: source.document};
}

/** 候选值的投影：给路径就直接取；给 {path, hex, prefix} 就把发布编号投影成字段那边的身份。 */
export function candidateValueOf(row, spec) {
  if (Array.isArray(spec)) return atPath(row, spec);
  const raw = atPath(row, spec.path);
  const text = Number.isInteger(spec.hex)
    ? (Number.isInteger(raw) ? raw.toString(16).toUpperCase().padStart(spec.hex, "0") : String(raw))
    : String(raw);
  return `${spec.prefix ?? ""}${text}`;
}

export function candidateLabelOf(row, parts) {
  if (!parts.length) return String(row);
  return parts.map(part => String(atPath(row, [part]) ?? "").trim())
    .filter(Boolean).join(" · ");
}

/** 候选行：来源文档 → 路径 → 可选筛选；筛不出条目是声明错误，不是空候选。 */
export function candidateRows(document_, source) {
  const where = candidateSourceKind(source);
  const found = atPath(document_, source.documentPath);
  if (!Array.isArray(found) || !found.length)
    throw new TypeError(`候选文档没有 ${where.id}/${source.documentPath.join(".")}`);
  const rows = source.filter
    ? found.filter(row => source.filter.values.includes(atPath(row, source.filter.path)))
    : found;
  if (!rows.length) throw new TypeError(`候选在 ${where.id} 里筛不出条目`);
  return rows;
}

function candidateValues(document_, source) {
  return candidateRows(document_, source).map(row => candidateValueOf(row, source.value));
}

function candidateChoices(document_, source) {
  return candidateRows(document_, source).map(row => ({
    value: candidateValueOf(row, source.value),
    label: candidateLabelOf(row, source.label),
  }));
}

/** 同一份来源只读一次文档用的键。 */
export function candidateSourceIdentity(source) {
  const where = candidateSourceKind(source);
  return JSON.stringify([where.kind, where.id, source.documentPath, source.filter ?? null, source.value]);
}

export async function readCandidateDocument(database, source) {
  const where = candidateSourceKind(source);
  const document_ = where.kind === "document"
    ? await database.getDocument(where.id)
    : await database.getResourceDocument(where.id);
  if (!document_) throw new TypeError(`候选来源文档不可用：${where.id}`);
  return document_;
}

export async function resolveCandidateValues(database, source) {
  return candidateValues(await readCandidateDocument(database, source), source);
}

export async function resolveCandidateChoices(database, source) {
  return candidateChoices(await readCandidateDocument(database, source), source);
}
