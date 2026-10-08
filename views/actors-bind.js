// @editor-module 角色形象表的 CHR 预览上下文绑定
import {$} from "../core/dom.js";
import {replaceHistoryUrl} from "../core/router.js";
import {state} from "../core/state.js";
import {render} from "../main.js";
import {configureActorSetPicker} from "./actors.js";

export function bindVisualEditor() {
  configureActorSetPicker($("#actor-set"));
  $("#actor-set")?.addEventListener("change", event => {
    if (event.target !== event.currentTarget) return;
    state.actorSet = Number(event.target.value);
    const url = new URL(location.href);
    url.searchParams.set("actorSet", String(state.actorSet));
    replaceHistoryUrl(url);
    render();
  });
}
