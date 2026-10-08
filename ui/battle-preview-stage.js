import {esc, hex} from "../core/dom.js";
import {recordUid, resourceLabel} from "../core/resource-index.js";
import {battleSceneComposerCanvas} from "../views/battle-scene-composer.js";

export function mountBattlePreviewStage(root, {
  kind, label, selection, preview, enemySlots, formationMarkup,
  scopeLabels, automaticScopeLabel,
}) {
  const enemyLabel = index => {
    const enemy = preview.enemies[index];
    return `E${index + 1} · G${enemy.groupIndex + 1} · ${resourceLabel(
      recordUid("monster", enemy.monsterId), `怪物 ${hex(enemy.monsterId, 2)}`,
    )}`;
  };
  const option = (value, name, selected) => `<option value="${esc(value)}"${
    String(value) === String(selected) ? " selected" : ""
  }>${esc(name)}</option>`;
  root.innerHTML = `<div class="${kind}-battle-scene" data-battle-scene-preview-host>
    <div class="${kind}-battle-scene-stage">
      ${battleSceneComposerCanvas({label})}
      ${formationMarkup(selection)}
      <small data-battle-scene-simulation-status data-battle-scene-status-errors-only aria-live="polite"></small>
      <div class="battle-preview-target-controls">
        <label>锚定目标<select data-battle-preview-target aria-label="锚定目标"${enemySlots.length ? "" : " disabled"}>
          ${enemySlots.length ? "" : option("", "—", "")}
          ${enemySlots.map(index => option(index, enemyLabel(index), preview.attack.enemyTarget)).join("")}
        </select></label>
        <label>预览范围<select data-battle-preview-scope aria-label="预览范围">
          ${option("auto", automaticScopeLabel, "auto")}
          ${Object.entries(scopeLabels).map(([key, name]) => option(key, name, "auto")).join("")}
        </select></label>
        <output data-battle-preview-targets></output>
      </div>
    </div>
  </div>`;
  root.dataset[`${kind}PreviewFormation`] = String(selection.formation.id);
  return root.querySelector("canvas[data-battle-scene-composer]");
}

export function bindBattlePreviewControls(root, preview, paint) {
  const showError = error => {
    root.querySelector("[data-battle-scene-simulation-status]").textContent =
      String(error?.message || error);
  };
  root.addEventListener("change", event => {
    const control = event.target;
    if (control.matches("[data-battle-preview-target]")) {
      preview().attack.enemyTarget = Number(control.value);
    } else if (control.matches("[data-battle-preview-scope]")) {
      preview().attack.scope = control.value;
    } else return;
    void paint().catch(showError);
  });
  return showError;
}

export function battlePreviewTargets(root, text) {
  root.querySelector("[data-battle-preview-targets]").textContent = text;
}
