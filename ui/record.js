// @editor-module 记录页：从列表点进来的单条明细
//
// 记录页保留字段值与编辑控件，并在末尾提供一个默认折叠的物理位置区。

import {esc} from "../core/dom.js";
import {physicalLocationMarkup} from "./physical-location.js";
import {handleMarkup} from "./handle.js";

/**
 * 记录页外框。`back` 是回到列表的标签，`prev`/`next` 是同一张表里的相邻记录，
 * 让人不必回列表就能顺着看下去。
 */
export function recordPage({
  title,
  uid = "",
  backLabel = "返回列表",
  prevId = null,
  nextId = null,
  panels = [],
  physicalRows = [],
  physicalContent = "",
  physicalUid = uid,
}) {
  const location = physicalLocationMarkup({uid: physicalUid, rows: physicalRows, content: physicalContent});
  return `<div class="record-head">
      <button class="record-back" type="button" data-record-back>← ${esc(backLabel)}</button>
      <span class="record-title">${esc(title)}</span>
      ${handleMarkup(uid)}
      <div class="record-nav">
        <button class="button ghost" type="button" data-record-prev
          ${prevId === null ? "disabled" : `data-target="${esc(prevId)}"`}>上一条</button>
        <button class="button ghost" type="button" data-record-next
          ${nextId === null ? "disabled" : `data-target="${esc(nextId)}"`}>下一条</button>
      </div>
    </div>
    <div class="page-body"><div class="record-grid">${panels.join("")}${
      location ? `<section class="record-panel record-panel--wide record-panel--flat">${
        location}</section>` : ""}</div></div>`;
}

/** `wide` 横跨整行；`flat` 为画布、长表移除卡片外框与嵌套纵向滚动。 */
export function panel(title, body, {wide = false, flat = false} = {}) {
  return `<section class="record-panel${wide || flat ? " record-panel--wide" : ""}${flat ? " record-panel--flat" : ""}">
    <h3>${esc(title)}</h3>${body}</section>`;
}

/** 字段表。值可以是 HTML（比如内联输入框），所以不在这里转义。 */
export function fields(rows) {
  return `<div class="record-fields">${rows.map(([label, value]) =>
    `<div class="record-field">
      <span class="record-field-label">${esc(label)}</span>
      <span class="record-field-value">${value ?? "—"}</span>
    </div>`).join("")}</div>`;
}

/** 图像预览槽。像素图一律 pixelated，不要让浏览器插值糊掉图块。 */

/** 画布预览槽：由视图自己在绑定期绘制。 */

/** 音频试听槽。控件由视图接管，这里只固定版式。 */
