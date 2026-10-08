// @editor-module 攻击视效选择器共用候选、名称与预览。

import {esc, hex} from "../core/dom.js";
import {recordUid} from "../core/resource-index.js";
import {state} from "../core/state.js";
import {
  attackVisualCanvas,
  paintAttackVisualCanvases,
  setWeaponEffectPreviewPlayback,
} from "../render/weapon-effect-vm.js";
import {configureAnimatedResourcePicker} from "./animated-resource-picker.js";

const ATTACK_VISUAL_MODULE_ID = "attack-visual";

/** 视效目录只取发布数据。 */
export function attackVisualAssets() {
  return state.project?.visuals?.weapon_effect_catalog?.asset_catalog_data || {};
}

function attackVisualCatalog() {
  const clean = attackVisualAssets().clean_animations || {};
  return clean.catalog || clean.clips || [];
}

/** 条目正文取发布名称，缺名称时保留句柄。 */
export function attackVisualOptionLabel(clip) {
  return String(clip.display_name || clip.stable_name
    || recordUid(ATTACK_VISUAL_MODULE_ID, Number(clip.visual_code)));
}

function attackVisualPickerOption(clip) {
  const code = Number(clip.visual_code);
  return {
    value: String(code),
    // 句柄优先取发布目录。
    handle: clip.handle || recordUid(ATTACK_VISUAL_MODULE_ID, code),
    label: attackVisualOptionLabel(clip),
    searchText: `${code} ${hex(code, 2)}`,
    clip,
  };
}

function attackVisualPickerPreview(option) {
  const clip = option?.clip;
  const code = Number(option?.value);
  if (!clip || clip.preview_status === "opaque-preserved-not-rendered") {
    return `<span class="resource-empty">${esc(
      recordUid(ATTACK_VISUAL_MODULE_ID, code))} · 不透明槽不可预览</span>`;
  }
  return attackVisualCanvas({
    visualCode: code,
    play: true,
    segment: "full",
    className: "equipment-attack-visual-canvas",
    label: recordUid(ATTACK_VISUAL_MODULE_ID, code),
  });
}

/** 候选未显式指定时取完整发布目录。 */
export function configureAttackVisualPicker(
  picker,
  {value, options = null, preview = true} = {},
) {
  configureAnimatedResourcePicker(picker, {
    options: options || attackVisualCatalog().map(attackVisualPickerOption),
    value: value === null || value === undefined ? "" : String(value),
    // 只读总表关闭预览，不装载战斗图形运行时。
    renderPreview: preview ? attackVisualPickerPreview : null,
    paintPreview: preview
      ? root => paintAttackVisualCanvases(root, attackVisualAssets()) : null,
    setPreviewActive: preview ? setWeaponEffectPreviewPlayback : null,
  });
}
