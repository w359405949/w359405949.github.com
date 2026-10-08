import {editorLog} from "../../core/editor-log.js";
import {esc} from "../../core/dom.js";
import {db} from "../../core/project-db.js";
import {state} from "../../core/state.js";
import {mountFieldObjectField, mountFieldObjectFormationChoice} from "../../ui/field-object-editor.js";
import {prepareModuleComponent} from "../../ui/module-components.js";
import "../../modules/encounter/components.js";

async function ownerBinding(host) {
  const kind = host.dataset.sceneBattleFormation;
  if (kind === "coordinate") {
    const id = Number(host.dataset.battleRecordId);
    if (id === 43) return null;
    const handle = `story.world-event:${id.toString(16).toUpperCase().padStart(2, "0")}`;
    return {object: await db.getFieldObject("world-event", "world-event.trigger-tables"),
      entityHandle: handle, fieldName: "encounter_formation_id"};
  }
  if (kind === "script") {
    const resourceId = `story-${host.dataset.battleScriptKind}-script`;
    const handle = `${resourceId}:script:${Number(host.dataset.battleScriptId).toString(16).toUpperCase().padStart(2, "0")}`;
    return {object: await db.getFieldObject(resourceId, handle),
      resourceId, entityHandle: handle, fieldName: "bytecode", byteIndex: Number(host.dataset.battleCursor) + 1};
  }
  return null;
}

export async function mountSceneBattleFormationEditors(root, refresh) {
  const hosts = [...(root?.querySelectorAll?.("[data-scene-battle-formation]") || [])];
  if (!hosts.length) return;
  const prepared = await prepareModuleComponent("encounter-formation", "reference", {label: "编队"});
  for (const host of hosts) {
    if (!host.isConnected || host.dataset.battleEditorBound) continue;
    host.dataset.battleEditorBound = "1";
    try {
      const binding = await ownerBinding(host);
      if (!host.isConnected || !binding) continue;
      host.innerHTML = '<div data-battle-field-choice></div>';
      if (binding.resourceId) host.insertAdjacentHTML("beforeend", `
        <label>完成事件号（战斗类型）<span data-battle-event-flag></span></label>
        <label>剧情状态<span data-battle-story-state></span></label>`);
      host.addEventListener("field-object-saved", () => {
        if (!host.isConnected) return;
        void db.getResourceDocument(binding.resourceId || "world-event", null).then(document => {
          if (binding.resourceId) state.sceneStoryDocuments[host.dataset.battleScriptKind] = document;
          else state.sceneWorldEvents = document;
          if (host.isConnected) refresh();
        }).catch(error => {
          editorLog.error("场景", `操作失败：${error?.message || error}`, error);
          const status = host.querySelector("[data-field-object-error]");
          if (status) {
            status.textContent = `刷新失败：${error?.message || error}`;
            status.hidden = false;
          }
        });
      });
      await mountFieldObjectFormationChoice(host.querySelector("[data-battle-field-choice]"),
        binding.object, {...binding, prepared});
      if (binding.resourceId) {
        mountFieldObjectField(host.querySelector("[data-battle-event-flag]"), binding.object,
          {...binding, byteIndex: binding.byteIndex + 1, label: "完成事件号（战斗类型）"});
        mountFieldObjectField(host.querySelector("[data-battle-story-state]"), binding.object,
          {...binding, byteIndex: binding.byteIndex + 2, label: "剧情状态"});
      }
      const link = host.closest('[data-scene-battle-entry]')?.querySelector('[data-resource-target^="encounter-formation:"]');
      if (link) {
        const row = link.parentElement;
        link.setAttribute('aria-label', `跳转到 ${link.textContent}`);
        link.textContent = '↗';
        host.append(link);
        row.remove();
      }
    } catch (error) {
      editorLog.error("场景", `操作失败：${error?.message || error}`, error);
      if (host.isConnected) host.innerHTML = `<p role="alert">${esc(error?.message || error)}</p>`;
    }
  }
}
