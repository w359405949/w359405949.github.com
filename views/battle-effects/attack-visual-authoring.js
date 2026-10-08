// @editor-module 攻击脚本共用的 owner 编辑入口
//
// 这里不解释 opcode、operand 编码或 ROM 布局。命令形状、可编辑 operand 与保存期
// 重编码都交给 attack-visual 已登记的字段对象；本页只把选中的一条记录嵌进
// 战斗详情页，并收窄到 owner 明确开放的命令控件。

import {editorLog} from "../../core/editor-log.js";
import {esc} from "../../core/dom.js";
import {db} from "../../core/project-db.js";
import {state} from "../../core/state.js";
import {attackEffectBindingComponentCount} from "./attack-effect-bindings.js";

const ATTACK_VISUAL_RESOURCE_ID = "attack-visual";
const ATTACK_VISUAL_AUX_RESOURCE_ID = "attack-visual-aux-script";
const ELEMENT_NAME = "attack-visual-command-authoring";
const COMMAND_RESOURCES = new Set([
  ATTACK_VISUAL_RESOURCE_ID,
  ATTACK_VISUAL_AUX_RESOURCE_ID,
]);

function loadingMarkup(handle) {
  return "";
}
function errorMarkup(message) {
  return `<p class="module-editor-error" role="alert">${esc(message)}</p>`;
}

function immutableMarkup(handle) {
  return `<section class="module-field-panel readonly"
      data-attack-visual-immutable="true" aria-label="不可编辑的攻击视觉记录">
  </section>`;
}

function selectedRecordRow(host, handle) {
  return [...host.querySelectorAll("[data-field-object] tbody tr")].find(row =>
    row.querySelector(':scope > td')?.textContent?.trim() === handle
  ) || null;
}

/**
 * 字段对象自己渲染正式表声明；视图层只留下当前记录的 commands 列。
 * 路径因此仍是完整文档里的 records[N].commands，保存不需要索引翻译或代理仓库。
 */
function focusSelectedCommandRow(host, handle) {
  const selected = selectedRecordRow(host, handle);
  if (!selected) throw new Error(`${handle}: owner 字段对象没有渲染这条记录`);
  const commandCell = selected.querySelector(':scope > td:nth-child(2)');
  if (!commandCell) throw new Error(`${handle}: owner 字段对象没有声明 commands 字段`);

  const selectedCells = [...selected.children];
  const commandColumnIndex = selectedCells.indexOf(commandCell);
  host.querySelectorAll("[data-field-object] tbody tr").forEach(row => {
    if (row !== selected) row.remove();
  });
  selectedCells.forEach((cell, index) => {
    if (index !== 0 && index !== commandColumnIndex && index !== selectedCells.length - 1) cell.remove();
  });
  host.querySelectorAll("[data-field-object] thead tr").forEach(row => {
    [...row.children].forEach((cell, index) => {
      if (index !== 0 && index !== commandColumnIndex && index !== row.children.length - 1) cell.remove();
    });
  });
  host.querySelectorAll(
    ".module-field-pagination, .module-resource-select, .module-field-table-tabs",
  ).forEach(node => node.remove());

  const summary = host.querySelector("[data-field-object] h3");
  if (summary) {
    summary.textContent = "命令流";
  }
  return selected;
}

async function hydrateAttackVisualCommandAuthoring(element) {
  const handle = String(element?.dataset?.attackVisualHandle || "");
  const resourceId = String(
    element?.dataset?.attackVisualResource || ATTACK_VISUAL_RESOURCE_ID,
  );
  if (!element || !handle) return;
  if (!COMMAND_RESOURCES.has(resourceId)) {
    element.dataset.attackVisualAuthoringState = "error";
    element.innerHTML = errorMarkup(`未知攻击视觉命令资源：${resourceId}`);
    return;
  }
  element.dataset.attackVisualAuthoringState = "loading";
  element.dataset.attackVisualSaveLayer = "working-override";
  element.dataset.attackVisualCommandResource = resourceId;
  element.innerHTML = loadingMarkup(handle);
  try {
    const resolved = await db.readResource(resourceId);
    const records = resolved?.value?.document?.records;
    if (!Array.isArray(records)) {
      throw new Error(`${resourceId} 没有发布语义记录表`);
    }
    const record = records.find(candidate => candidate?.handle === handle);
    if (!record) throw new Error(`${handle}: Working 中找不到对应攻击视觉记录`);

    const immutable = record.edit_policy === "immutable";
    if (immutable) {
      element.innerHTML = immutableMarkup(handle);
      element.dataset.attackVisualAuthoringState = "readonly";
      element.dataset.attackVisualEditableOperands = "0";
      return;
    }

    const bindingCount = attackEffectBindingComponentCount(
      state.browserProjectManifest,
      resourceId,
    );
    element.dataset.attackVisualBindingComponents = String(
      bindingCount ?? "unknown",
    );
    const objects = await db.getFieldObjects(resourceId);
    const object = objects.find(candidate => candidate.fields.some(field =>
      field.entityHandle === handle && field.fieldName === "commands"));
    if (!object) throw new Error(`${handle}: 没有已声明的 commands 字段对象`);
    element.innerHTML = '<div data-attack-visual-owner-editor></div>';
    const editor = element.querySelector("[data-attack-visual-owner-editor]");
    await object.mount(editor);
    const selected = focusSelectedCommandRow(editor, handle);
    if (!element.isConnected) return;
    const controls = [...selected.querySelectorAll(
      "[data-field-object-operand]",
    )].filter(control => !control.disabled);
    const otherEnabled = [...selected.querySelectorAll("input, select")]
      .filter(control => !control.disabled && !controls.includes(control));
    if (otherEnabled.length) {
      throw new Error(`${handle}: owner editor 暴露了 commands 之外的可编辑字段`);
    }
    element.dataset.attackVisualEditableOperands = String(controls.length);
    element.dataset.attackVisualAuthoringState = "ready";
  } catch (error) {
    editorLog.error("攻击视觉", `操作失败：${error?.message || error}`, error);
    element.dataset.attackVisualAuthoringState = "error";
    element.innerHTML = errorMarkup(error?.message || error);
  }
}

if (globalThis.customElements && globalThis.HTMLElement
    && !globalThis.customElements.get(ELEMENT_NAME)) {
  globalThis.customElements.define(ELEMENT_NAME, class extends HTMLElement {
    connectedCallback() {
      if (this.dataset.attackVisualAuthoringBound === "1") return;
      this.dataset.attackVisualAuthoringBound = "1";
      void hydrateAttackVisualCommandAuthoring(this);
    }
  });
}
