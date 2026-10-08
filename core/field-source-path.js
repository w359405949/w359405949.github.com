// @editor-module 字段来源派生物的文件名不含 URL 转义与路径特殊字符。
export function fieldSourceFileName(resourceId) {
  return `${encodeURIComponent(resourceId)
    .replace(/[!'()*~]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)
    .replaceAll('%', '~')}.json`;
}
