// @editor-module 播放控件旁的预览声音开关。
import {previewSoundEnabled, setPreviewSoundEnabled} from "../audio/preview-preference.js";

export function previewSoundControl() {
  return `<label><input type="checkbox" data-preview-sound ${
    previewSoundEnabled() ? "checked" : ""}> 声音</label>`;
}

export function bindPreviewSound(root, onChange) {
  root?.querySelector("[data-preview-sound]")?.addEventListener("change", event => {
    const enabled = setPreviewSoundEnabled(event.target.checked);
    document.querySelectorAll("[data-preview-sound]").forEach(control => {
      control.checked = enabled;
    });
    onChange(enabled);
  });
}
