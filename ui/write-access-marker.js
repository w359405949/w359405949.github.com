// @editor-module 字段写入许可的紧凑状态标记。
import {esc} from "../core/dom.js";

const ROM_WRITE_PENDING_HINT = "已保存，构建的 ROM 不含此改动";

export function writeAccessMarker(access, {fields = []} = {}) {
  if (access.writebackMissing) {
    const hint = `${ROM_WRITE_PENDING_HINT}${fields.length ? `：${fields.join('、')}` : ''}`;
    return `<span class="module-editor-access-mark module-editor-unwritable"
      role="img" tabindex="0" aria-label="${esc(hint)}"
      data-tooltip="${esc(hint)}">↛</span>`;
  }
  if (access.readOnly) {
    const symbol = access.policy === "immutable" ? "🔒"
      : access.semanticStatus === "partial" ? "◐" : "↗";
    const title = access.reason;
    return `<span class="module-editor-access-mark module-editor-readonly"
      role="img" aria-label="${esc(title)}" title="${esc(title)}">${symbol}</span>`;
  }
  return "";
}
