// @editor-module 字符集中的 12×12 正文字形像素编辑，自动保存到 char。
import {db} from "../../core/project-db.js";
import {state} from "../../core/state.js";
import {createAutoSave} from "../../core/auto-save.js";
import {loadWritebackCapabilities} from "../../core/writeback-capabilities.js";
import {bindGlyphField, paintGlyphBitmap} from "../../ui/glyphs.js";
import {resetToOriginalButton, bindFieldResetToOriginalButtons, applyResetToOriginalStates} from "../../ui/table.js";

export async function openGlyphEditor(handle) {
  const repository = state.projectRepository;
  const field = await db.getField("char", handle, "narrative_glyph_bitmap");
  const capabilities = await loadWritebackCapabilities(repository,
    state.browserPackageManifest || state.browserProjectManifest);
  if (repository !== state.projectRepository) return;
  const dialog = document.createElement("dialog");
  dialog.className = "narrative-glyph-dialog";
  const title = document.createElement("h3");
  title.textContent = `字形 ${handle.replace("font-glyph:", "").replace(":", " ")}`;
  if (capabilities.byResource.get("char")?.state !== "bound") {
    const mark = document.createElement("small");
    mark.textContent = " ◇"; mark.title = "暂时不写进 ROM"; title.append(mark);
  }
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 12;
  canvas.style.cssText = "width:288px;height:288px;image-rendering:pixelated;cursor:crosshair;display:block";
  canvas.dataset.glyphEditor = handle;
  canvas.setAttribute("aria-label", "点击切换字形像素");
  const preview = document.createElement("canvas");
  preview.width = preview.height = 12;
  preview.style.cssText = "width:36px;height:36px;image-rendering:pixelated;margin:12px";
  const error = document.createElement("p"); error.setAttribute("role", "alert");
  const actions = document.createElement("div");
  actions.className = "glyph-editor-actions";
  actions.innerHTML = resetToOriginalButton(handle, {title: "重置这个字形；其他字形的编辑保留"});
  const reset = actions.querySelector("[data-reset-to-original]");
  const close = document.createElement("button"); close.textContent = "关闭"; close.dataset.glyphClose = "";
  close.className = "button ghost";
  let bitmap = [...field.value], version = field.version, busy = false, saving = false;
  const paint = () => {
    for (const target of [canvas, preview]) paintGlyphBitmap(target, bitmap);
    applyResetToOriginalStates(actions, new Map([[handle,
      bitmap.some((value, index) => value !== field.defaultValue[index])]]),
    {busy: busy || reset.dataset.resetPending === "true"});
  };
  const saver = createAutoSave(async bytes => {
    saving = true;
    try {
      await field.set(bytes, {expectedVersion: version});
      version = field.version;
    } finally {
      saving = false;
      if (saver.pending) paint();
    }
  }, {onError: e => {error.textContent = `保存失败：${e.message}`;}});
  canvas.addEventListener("click", event => {
    if (busy || reset.dataset.resetPending === "true" || repository !== state.projectRepository) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) * 12 / rect.width);
    const y = Math.floor((event.clientY - rect.top) * 12 / rect.height);
    if (x < 0 || x >= 12 || y < 0 || y >= 12) return;
    if (!saver.pending && !saving) {bitmap = [...field.value]; version = field.version;}
    bitmap[Math.floor(x / 4) * 6 + Math.floor(y / 2)] ^= 1 << (7 - x % 4 - (y % 2) * 4);
    paint(); error.textContent = ""; saver.commit(handle, [...bitmap]);
  });
  bindFieldResetToOriginalButtons(actions, new Map([[handle, field]]), {
    beforeReset: async () => {
      saver.cancel(handle); await saver.settled(); error.textContent = "";
    },
    onError: e => {error.textContent = `重置失败：${e.message}`;},
  });
  const finish = async () => {
    if (busy || reset.dataset.resetPending === "true") return;
    busy = true; close.disabled = reset.disabled = true;
    await saver.flush();
    if (error.textContent) {busy = false; close.disabled = false; paint(); return;}
    dialog.close(); dialog.remove();
  };
  close.addEventListener("click", finish);
  dialog.addEventListener("cancel", event => {event.preventDefault(); finish();});
  actions.prepend(preview);
  actions.append(close);
  dialog.append(title, canvas, error, actions);
  document.body.append(dialog); dialog.showModal();
  bindGlyphField(canvas, field); bindGlyphField(preview, field);
}
