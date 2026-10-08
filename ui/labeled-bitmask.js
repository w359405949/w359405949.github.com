// @editor-module 共用带标签的位掩码勾选结构。
import {esc} from "../core/dom.js";

export function labeledBitmaskMarkup({
  choices = [], active = () => false, inputAttributes = () => "",
  rootAttributes = "", className = "equipment-inline-roles",
} = {}) {
  return `<span class="${esc(className)}" data-labeled-bitmask ${rootAttributes}>${
    choices.map((choice, index) => `<label class="${esc(choice.className || "")}">
      <input type="checkbox" value="${esc(choice.value)}" ${inputAttributes(choice, index)}
        ${active(choice, index) ? "checked" : ""}><span>${esc(choice.label)}</span>
    </label>`).join("")
  }</span>`;
}
