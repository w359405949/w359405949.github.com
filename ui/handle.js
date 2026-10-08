// @editor-module 可选中复制的记录句柄。
import {esc} from "../core/dom.js";

export function handleMarkup(handle, {label = handle} = {}) {
  const value = String(handle || "");
  if (!value) return "";
  return `<span class="record-handle" data-resource-handle="${esc(value)}" title="${esc(value)}">${esc(label)}</span>`;
}

export function handleTextMarkup(text) {
  const source = String(text || "");
  let cursor = 0;
  let markup = "";
  for (const match of source.matchAll(/\b[a-z][a-z0-9-]*(?::[A-Za-z0-9_-]+)+/gu)) {
    markup += esc(source.slice(cursor, match.index)) + handleMarkup(match[0]);
    cursor = match.index + match[0].length;
  }
  return markup + esc(source.slice(cursor));
}
