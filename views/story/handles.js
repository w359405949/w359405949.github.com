// @editor-module 剧情资源身份与公共句柄显示。
import {esc} from "../../core/dom.js";
import {recordUid, currentTextReference, audioCommandLabel} from "../../core/resource-index.js";
import {handleMarkup} from "../../ui/handle.js";
import {state} from "../../core/state.js";
import {dedicatedUiPageForScreen} from "../../core/ui-page-registry.js";
import {eventFlagReferenceMarkup} from '../../modules/save/event-flags.js';

export function storyScriptHandle(kind, id) {
  if (id === null || id === undefined || !Number.isInteger(Number(id)) || Number(id) < 0) return null;
  return recordUid(`story-${kind || "autonomous"}-script:script`, id);
}

export function storyAudioLabel(id) {
  const label = audioCommandLabel(id);
  return label.startsWith("音频命令 0x") ? recordUid("audio-command", id) : label;
}

export function storyShotLabel(label) {
  return String(label || "").replace(/\bLIST\s*\$([0-9a-f]{2})\b/giu,
    (_, id) => recordUid("scene-actor-list", Number.parseInt(id, 16)));
}

export function storyActorHandle(variantId, slot) {
  if (variantId === null || variantId === undefined || !Number.isInteger(Number(variantId))
      || slot === null || slot === undefined || !Number.isInteger(Number(slot))) return null;
  return recordUid(recordUid("scene-actor", variantId), slot);
}

export function storyTextHandle(regionId, recordId) {
  if (!Number.isInteger(regionId) || regionId < 0
      || !Number.isInteger(recordId) || recordId < 0) return null;
  return `${recordUid("record", regionId)}:${String(recordId).padStart(3, "0")}`;
}

export function storyResourceMarkup(handle, label = "", target = handle) {
  if (!handle) return "—";
  if (String(handle).startsWith('global-event-flag:')) return eventFlagReferenceMarkup(handle);
  const identity = handleMarkup(handle);
  const copy = label && label !== handle ? `${esc(label)} · ${identity}` : identity;
  return target ? `<button type="button" class="resource-inline-link"
    data-resource-target="${esc(target)}" title="${esc(handle)}">${copy}</button>` : copy;
}

export function storyInterfaceMarkup(interfaceState) {
  if (!interfaceState?.screen) return "—";
  return [interfaceState.screen, interfaceState.textScreen].filter(Boolean).map(id => {
    const screen = state.project?.ui?.editor?.screens?.find(row => row.id === id);
    const destination = dedicatedUiPageForScreen(screen);
    if (!destination) return storyResourceMarkup(id);
    const params = new URLSearchParams({view: destination.view});
    if (destination.interfacePage) params.set("interface", destination.interfacePage);
    params.set("interfaceScreen", id);
    if (destination.interfacePage === "ending-credits" && interfaceState.context?.record)
      params.set("interfaceRecord", interfaceState.context.record);
    if (destination.view === "wanted-ui" && interfaceState.target != null)
      params.set("wantedTarget", interfaceState.target);
    return `<a class="editor-inline-link" data-story-interface-reference href="?${esc(params)}"
      title="${esc(id)}">${esc(screen?.interface_state || screen?.label || id)} ↗</a>`;
  }).join(" · ");
}

export function storyScriptMarkup(kind, id, overflowBytes = 0, {location = null, reason = null} = {}) {
  return storyResourceMarkup(storyScriptHandle(kind, id), "", recordUid(`story:${kind || "autonomous"}`, id))
    + (location ? ` <span data-script-location>${location === "farjump-page" ? "远跳页" : "原池"}</span>` : "")
    + (overflowBytes || reason ? ` <span data-script-unwritten title="未进 ROM（${esc(reason || `容量不足，超出 ${overflowBytes} 字节`)}）">↛</span>` : "");
}

export function storyTextMarkup(reference) {
  if (!reference) return "—";
  const current = currentTextReference(reference);
  return storyResourceMarkup(reference, current.label, current.uid);
}
