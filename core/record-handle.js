// @editor-module 按字段对象名与序号组成记录句柄。
export function recordUid(domain, id) {
  if (id === null || id === undefined) return null;
  return `${domain}:${Number(id).toString(16).toUpperCase().padStart(2, "0")}`;
}
