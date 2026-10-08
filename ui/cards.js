// @editor-module 资产卡片与徽章
//
// 来源：拆分前 engine/editor/app.js 第 973-997 行。

import {bytes, esc} from "../core/dom.js";
import {fileUrl} from "../core/package-io.js";
import {state} from "../core/state.js";
import {physicalAddressOf} from "../core/physical-address.js";

export function assets() {
  const all = state.project?.manifest?.assets || [];
  const q = state.query.trim().toLowerCase();
  if (!q) return all;
  return all.filter(asset => JSON.stringify(asset).toLowerCase().includes(q));
}

export function badge(asset) {
  const confidence = asset.confidence || "confirmed";
  return `<span class="badge ${esc(confidence)}">${esc(confidence)}</span>`;
}
