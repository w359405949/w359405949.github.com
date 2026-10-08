import {db} from "../core/project-db.js";
import {state} from "../core/state.js";
import {canonicalJsonEqual} from "../core/project-store-values.js";
import {trackAutoSavePreparation} from "../core/auto-save.js";

let active = null;

export async function metatileEditSession(handle) {
  const resource = handle.startsWith("metatile-set:") ? "metatile-set" : "metatile-page";
  const suffix = handle.split(":").at(-1);
  const [definitions, attributes] = await Promise.all([
    db.getField(resource, resource === "metatile-set"
      ? `metatile-set:${suffix}-definitions` : `metatile-page:definitions-${suffix}`, "value0"),
    db.getField(resource, resource === "metatile-set"
      ? `metatile-set:${suffix}-attributes` : `metatile-page:attributes-${suffix}`, "value0"),
  ]);
  if (active?.handle === handle && active.definitions === definitions) return active;
  const pending = new Map();
  const session = {
    handle, definitions, attributes, repository: state.projectRepository, saving: null, onChange: null,
    get dirty() {return pending.size > 0;},
    read(field) {return pending.has(field) ? pending.get(field) : field.value;},
    paintChrTable(table, bankIds) {
      for (const [field, value] of pending) if (field.resourceId === "shared-chr-bank") {
        bankIds.forEach((bank, index) => {
          if (Number(bank) === field.recordId) table.set(value,
            index * 1024 + field.tileId * 16 + (field.fieldName === "plane_1" ? 8 : 0));
        });
      }
      return table;
    },
    value(resourceId, entityHandle, fieldName, fallback) {
      for (const [field, value] of pending) if (field.resourceId === resourceId
          && field.entityHandle === entityHandle && field.fieldName === fieldName) return value;
      return fallback;
    },
    set(field, value) {
      if (session.saving) return;
      if (canonicalJsonEqual(value, field.value)) pending.delete(field);
      else pending.set(field, structuredClone(value));
      session.onChange?.();
    },
    discard() {pending.clear(); session.onChange?.();},
    save() {
      if (session.saving) return session.saving;
      const groups = new Map();
      for (const [field, value] of pending) {
        if (!groups.has(field.resourceId)) groups.set(field.resourceId, []);
        groups.get(field.resourceId).push({field, value});
      }
      session.saving = trackAutoSavePreparation((async () => {
        for (const changes of groups.values()) {
          await db.writeFields(changes);
          for (const {field, value} of changes) if (pending.get(field) === value) pending.delete(field);
        }
      })().finally(() => {session.saving = null; session.onChange?.();}));
      session.onChange?.();
      return session.saving;
    },
  };
  active = session;
  return session;
}

export async function allowMetatileNavigation(value) {
  if (!active || active.repository !== state.projectRepository) return true;
  if (active.saving) {
    try {await active.saving;} catch {return false;}
  }
  if (!active.dirty) return true;
  const url = value instanceof URL ? value : new URL(value, location.href);
  if (url.searchParams.get("view") === "metatiles"
      && url.searchParams.get("metatile") === active.handle) return true;
  if (!window.confirm("元图块页有未保存改动，放弃改动并继续？")) return false;
  active.discard();
  return true;
}

export function suspendMetatileEditor() {
  const editor = document.querySelector("[data-metatile-editor]");
  if (editor) editor.inert = true;
}

window.addEventListener("beforeunload", event => {
  if (active?.repository !== state.projectRepository || !active?.dirty) return;
  event.preventDefault();
  event.returnValue = "";
});
