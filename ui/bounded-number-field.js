// @editor-module 按已发布取值域显示可编辑数值。

import {esc} from "../core/dom.js";

export function boundedNumberFieldMarkup({fieldId, label, value, min, max,
  zeroLabel = "", unit = "", disabled = false} = {}) {
  return `<label class="save-bounded-number"><input class="inline-data-input" type="number"
    inputmode="numeric" required step="1" min="${esc(min)}" max="${esc(max)}"
    value="${esc(value)}" aria-label="${esc(label)}" ${disabled ? "disabled" :
      `data-save-page-field="${esc(fieldId)}"`}>
    ${unit ? `<span class="save-bounded-number-unit">${esc(unit)}</span>` : ""}
    <small>${Number(value) === 0 && zeroLabel ? esc(zeroLabel) :
      `${esc(min)}–${esc(max)}`}</small></label>`;
}
