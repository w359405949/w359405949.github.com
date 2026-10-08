import {esc} from "../core/dom.js";

export function imagePickerCell({
  label, value, attribute, reason = "", unavailableLabel = "", disabled = false,
  showUnavailable = true,
}) {
  if (reason) return showUnavailable
    ? `<span class="resource-empty" role="alert">${esc(unavailableLabel)}${esc(reason)}</span>` : "";
  return `<animated-resource-picker class="image-column-picker"
    data-animated-resource-value="${esc(value ?? "")}" ${attribute}
    aria-label="${esc(label)}"${disabled ? " disabled" : ""}></animated-resource-picker>`;
}
