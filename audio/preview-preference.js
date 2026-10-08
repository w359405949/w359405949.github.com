// @editor-module 浏览器预览声音偏好。
const STORAGE_KEY = "mmeditor.preview-sound";
const listeners = new Set();
let storageFailed = false;

export function previewSoundEnabled() {
  if (storageFailed) return false;
  try {
    return globalThis.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    storageFailed = true;
    return false;
  }
}

export function setPreviewSoundEnabled(enabled) {
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, String(Boolean(enabled)));
    storageFailed = false;
  } catch {
    storageFailed = true;
    enabled = false;
  }
  enabled = Boolean(enabled) && previewSoundEnabled();
  for (const listener of listeners) listener(enabled);
  return enabled;
}

export function subscribePreviewSound(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
