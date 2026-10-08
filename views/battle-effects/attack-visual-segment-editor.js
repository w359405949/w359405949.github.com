// @editor-module 主脚本列表里的分段选择与预览
import {editorLog} from "../../core/editor-log.js";
import {resetToOriginalButton, applyResetToOriginalStates} from "../../ui/table.js";
import {db} from "../../core/project-db.js";

//
// 四段预览仍各占主脚本表的一列；这一模块只在前三列已有 spawn owner 的位置
// 放 battle-action 选择器。每一行共用一份草稿，跨段命中同一 owner operand 时
// 因而不会分叉。编码与保存继续交给 attack-visual owner。

import {esc} from "../../core/dom.js";
import {createAutoSave} from "../../core/auto-save.js";
import {state} from "../../core/state.js";
import {
  attackAnimationState,
  attackVisualCanvas,
  effectObjectMotionCanvas,
  paintEffectObjectMotionCanvases,
  setWeaponEffectPreviewPlayback,
} from "../../render/weapon-effect-vm.js";
import {configureAnimatedResourcePicker, prepareAnimatedResourceOptions} from "../../ui/animated-resource-picker.js";
import {
  ATTACK_EDITABLE_SEGMENTS,
  ATTACK_VISUAL_RESOURCE_ID,
  BATTLE_ACTION_RESOURCE_ID,
  applyAttackEffectStageSelection,
  attackEffectRecordCommandState,
  attackEffectResourceHandle,
  attackEffectSegmentStages,
  cloneAttackEffectValue,
} from "./attack-effect-model.js";

const SEGMENT_LABELS = new Map([
  ["launch", "发射"],
  ["trajectory", "弹道"],
  ["impact", "击中"],
  ["full", "完整"],
]);

const sourceByRepository = new WeakMap();
const controllerByRoot = new WeakMap();

function effectAssets() {
  return state.project?.visuals?.weapon_effect_catalog?.asset_catalog_data || {};
}

function visualIdentity(item) {
  const visualCode = Number(item?.visual_code ?? item?.id);
  const handle = item?.handle || attackEffectResourceHandle(
    ATTACK_VISUAL_RESOURCE_ID,
    visualCode,
  );
  const record = db.peekDocument(ATTACK_VISUAL_RESOURCE_ID, null)?.records
    ?.find(candidate => candidate.handle === handle);
  const immutable = recordIsImmutable(record);
  return {visualCode, handle, immutable};
}

function recordIsImmutable(record) {
  return record?.edit_policy === "immutable";
}

async function segmentEditorSource(repository) {
  let request = sourceByRepository.get(repository);
  if (!request) {
    request = Promise.all([
      db.readResource(ATTACK_VISUAL_RESOURCE_ID),
      db.readResource(BATTLE_ACTION_RESOURCE_ID),
    ]).then(([primary, actions]) => {
      const primaryRecords = primary?.value?.document?.records;
      const actionRecords = actions?.value?.document?.records;
      if (!Array.isArray(primaryRecords)) {
        throw new TypeError("attack-visual Working 缺少 records");
      }
      if (!Array.isArray(actionRecords)) {
        throw new TypeError("battle-action owner 候选缺少 records");
      }
      return {
        document: primary.value.document,
        actions: actionRecords,
      };
    });
    sourceByRepository.set(repository, request);
    const clearRequest = () => {
      if (sourceByRepository.get(repository) === request) {
        sourceByRepository.delete(repository);
      }
    };
    void request.then(clearRequest, clearRequest);
  }
  return request;
}

function actionPickerOption(action) {
  const id = Number(action.id);
  const handle = action.handle || attackEffectResourceHandle(
    BATTLE_ACTION_RESOURCE_ID,
    id,
  );
  return {
    value: String(id),
    handle,
    label: `${handle}${action.available === false ? " · 不可用空项" : ""}`,
    searchText: `${id} 0x${id.toString(16).toUpperCase().padStart(2, "0")}`,
    disabled: action.available === false,
    action,
  };
}

function actionPickerOptions(source) {
  const revision = db.fieldRevision(BATTLE_ACTION_RESOURCE_ID);
  if (!source.actionOptions || source.actionOptionsRevision !== revision) {
    source.actionOptions = prepareAnimatedResourceOptions(source.actions.map(actionPickerOption));
    source.actionOptionsRevision = revision;
  }
  return source.actionOptions;
}

function actionPickerPreview(visualCode, commandIndex, option) {
  if (option.disabled) return '<span class="resource-empty">不可用空项</span>';
  return effectObjectMotionCanvas({
    visualCode,
    sourceCommandIndex: commandIndex,
    action: option.value,
    play: true,
    label: `${option.handle} 在当前生成命令中的动画`,
  });
}

function segmentPreviewMarkup(visualCode, segment, label) {
  const visualLabel = Number(visualCode).toString(16).toUpperCase().padStart(2, "0");
  const editable = ATTACK_EDITABLE_SEGMENTS.includes(segment);
  return `<figure class="attack-effect-segment"
      data-attack-visual-segment-card="${segment}">
    <figcaption>${esc(label)}</figcaption>
    ${attackVisualCanvas({
      visualCode,
      play: true,
      segment,
      label: `攻击视效 ${visualLabel} · ${label}`,
    })}
    <small data-attack-visual-status>解析中…</small>
    ${editable ? `<div data-attack-visual-segment-controls="${segment}"
      style="grid-column:1 / -1;display:grid;gap:4px;min-width:0">
    </div>` : ""}
  </figure>`;
}

/** 行级重置只恢复当前攻击脚本记录。 */
export function renderAttackVisualSegmentEditor(item, label = "") {
  const {visualCode, handle, immutable} = visualIdentity(item);
  return `<div data-attack-visual-segment-editor
      data-attack-visual-segment-editor-state="${immutable ? "readonly" : "loading"}"
      data-visual-code="${visualCode}" data-visual-handle="${esc(handle)}"
      data-visual-immutable="${immutable}">
    <p data-attack-visual-segment-save-status hidden></p>
    <span${immutable ? ' hidden' : ''}>${resetToOriginalButton(handle, {
      attributes: {'data-attack-visual-segment-reset': ''},
    })}</span>
  </div>`;
}

function immutableSegmentMarkup(segment) {
  return `<span class="resource-empty">按定义不可变</span>${
    ATTACK_EDITABLE_SEGMENTS.includes(segment)
      ? `<div data-attack-visual-segment-controls="${segment}">
          <span class="resource-empty">不可选择：按定义不可变</span>
        </div>` : ""}`;
}

/** 一次只渲染一个表格单元格；前三段有控件宿主，完整段没有。 */
export function renderAttackVisualSegmentCell(item, label, segment, segmentLabel = "") {
  if (!SEGMENT_LABELS.has(segment)) {
    throw new RangeError(`未知攻击视效分段：${segment}`);
  }
  const {visualCode, handle, immutable} = visualIdentity(item);
  const shownLabel = segmentLabel || SEGMENT_LABELS.get(segment);
  return `<div class="attack-effect-preview-column"
      data-attack-visual-segment-column="${segment}"
      data-attack-visual-segment-state="${immutable ? "readonly" : "loading"}"
      data-visual-code="${visualCode}" data-visual-handle="${esc(handle)}">
    ${immutable
      ? immutableSegmentMarkup(segment)
      : segmentPreviewMarkup(visualCode, segment, shownLabel)}
  </div>`;
}

function rowForEditor(editor) {
  return editor?.closest?.("tr[data-row-id]") || null;
}

function setRowState(rowState, stateName) {
  rowState.editor.dataset.attackVisualSegmentEditorState = stateName;
  rowState.row.querySelectorAll("[data-attack-visual-segment-column]").forEach(cell => {
    cell.dataset.attackVisualSegmentState = stateName;
  });
}

function setRowError(editor, message) {
  editor.dataset.attackVisualSegmentEditorState = "error";
  const row = rowForEditor(editor);
  row?.querySelectorAll("[data-attack-visual-segment-column]").forEach(cell => {
    cell.dataset.attackVisualSegmentState = "error";
  });
  const status = editor.querySelector("[data-attack-visual-segment-save-status]");
  if (status) status.textContent = `分段选择载入失败：${message}`;
}

function renderSegmentControls(rowState) {
  const actionOptions = actionPickerOptions(rowState.source);
  const groups = attackEffectSegmentStages(rowState.draftRecord, rowState.animation);
  if (groups.unmapped.length) {
    throw new Error(
      `${rowState.handle}: ${groups.unmapped.length} 条生成命令无法按 VM 边界归段`,
    );
  }
  rowState.groups = groups;
  rowState.editor.dataset.attackVisualUniqueSpawnCount = String(
    new Set(ATTACK_EDITABLE_SEGMENTS.flatMap(segment =>
      groups[segment].map(stage => `${stage.commandIndex}:${stage.operandIndex}`)
    )).size,
  );
  ATTACK_EDITABLE_SEGMENTS.forEach(segment => {
    const cell = rowState.row.querySelector(
      `[data-attack-visual-segment-column="${segment}"]`,
    );
    const host = cell?.querySelector(
      `[data-attack-visual-segment-controls="${segment}"]`,
    );
    if (!host) {
      throw new Error(`${rowState.handle}: ${segment} 单元格缺少选择器宿主`);
    }
    const stages = groups[segment];
    host.dataset.spawnCommandCount = String(stages.length);
    host.innerHTML = stages.length
      ? stages.map((stage, index) => `<label data-attack-visual-segment-spawn
          data-command-index="${stage.commandIndex}"
          data-operand-index="${stage.operandIndex}"
          style="display:grid;gap:2px;min-width:0">
        <span>生成命令 ${index + 1} · ${stage.anchor === "actor" ? "攻击者" : "目标"}</span>
        <animated-resource-picker data-attack-visual-segment-action
          data-segment="${segment}"
          data-command-index="${stage.commandIndex}"
          data-operand-index="${stage.operandIndex}"></animated-resource-picker>
      </label>`).join("")
      : '';
    host.querySelectorAll("animated-resource-picker[data-attack-visual-segment-action]")
      .forEach(picker => {
        const commandIndex = Number(picker.dataset.commandIndex);
        configureAnimatedResourcePicker(picker, {
          options: actionOptions,
          value: stages.find(stage =>
            Number(stage.commandIndex) === commandIndex
              && Number(stage.operandIndex) === Number(picker.dataset.operandIndex)
          )?.actionId,
          renderPreview: option => actionPickerPreview(
            rowState.visualCode,
            commandIndex,
            option,
          ),
          paintPreview: root => paintEffectObjectMotionCanvases(
            root,
            effectAssets(),
          ),
          setPreviewActive: setWeaponEffectPreviewPlayback,
        });
      });
  });
}

function refreshDirtyState(rowState, message = "") {
  const dirty = attackEffectRecordCommandState(rowState.draftRecord)
    !== attackEffectRecordCommandState(rowState.originalRecord);
  rowState.editor.dataset.attackVisualSegmentDirty = String(dirty);
  const status = rowState.editor.querySelector(
    "[data-attack-visual-segment-save-status]",
  );
  const reset = rowState.editor.querySelector("[data-attack-visual-segment-reset]");
  // **状态行只放真实结果**（保存失败之类），不写「有未保存修改 / 已与 Working 一致」——
  // 那是关于这一行状态的元信息，而「保存」「重置」两个按钮能不能点已经说完了。
  if (status) {
    status.textContent = message || "";
    status.hidden = !message;
    status.classList.toggle("dirty", dirty);
  }
  if (reset) applyResetToOriginalStates(rowState.editor,
    new Map([[reset.dataset.resetToOriginal, dirty || rowState.commandField?.hasOverride === true]]),
    {busy: rowState.saving});
}

function applySelection(rowState, select) {
  const actionId = Number(select.value);
  const action = rowState.actionRecords.find(item => Number(item.id) === actionId);
  if (!action || action.available === false) {
    throw new Error(`battle-action 候选不可用：${select.value}`);
  }
  applyAttackEffectStageSelection(rowState.draftDocument, {
    visualCode: rowState.visualCode,
    commandIndex: Number(select.dataset.commandIndex),
    operandIndex: Number(select.dataset.operandIndex),
    actionId,
  });
  renderSegmentControls(rowState);
  refreshDirtyState(rowState);
}

async function saveRow(rowState) {
  if (rowState.saving
      || rowState.editor.dataset.attackVisualSegmentDirty !== "true") return;
  rowState.saving = true;
  refreshDirtyState(rowState);
  let finalMessage = "";
  try {
    const latest = await db.readResource(ATTACK_VISUAL_RESOURCE_ID);
    const current = latest.value?.document?.records?.find(record =>
      Number(record.id) === rowState.visualCode
    );
    if (!current) throw new Error("攻击视觉脚本不存在");
    const patch = cloneAttackEffectValue(rowState.draftRecord);
    const field = await db.getField(
      ATTACK_VISUAL_RESOURCE_ID, current.handle, "commands",
    );
    await field.set(cloneAttackEffectValue(patch.commands), {
      expectedVersion: field.version,
    });
    const resolved = await db.readResource(ATTACK_VISUAL_RESOURCE_ID);
    const persisted = resolved.value.document.records.find(record =>
      Number(record.id) === rowState.visualCode
    );
    rowState.originalRecord = cloneAttackEffectValue(persisted);
    rowState.draftDocument = {records: [cloneAttackEffectValue(persisted)]};
    renderSegmentControls(rowState);
    finalMessage = "本行分段已保存到 Working 覆盖";
  } catch (error) {
    finalMessage = `本行分段保存失败：${error?.message || error}`;
  } finally {
    rowState.saving = false;
    refreshDirtyState(rowState, finalMessage);
  }
}

async function resetRow(rowState) {
  if (!rowState.originalRecord || rowState.saving) return;
  rowState.saving = true;
  refreshDirtyState(rowState);
  let finalMessage = "";
  try {
    const resolved = await db.readResource(ATTACK_VISUAL_RESOURCE_ID);
    const current = resolved.value?.document?.records?.find(record =>
      Number(record.id) === rowState.visualCode
    );
    if (!current) throw new Error(`Working 缺少视效 ${rowState.visualCode}`);
    const field = await db.getField(
      ATTACK_VISUAL_RESOURCE_ID, current.handle, "commands",
    );
    await field.reset({expectedVersion: field.version});
    const reset = await db.readResource(ATTACK_VISUAL_RESOURCE_ID);
    const origin = reset.value?.document?.records?.find(record =>
      Number(record.id) === rowState.visualCode
    );
    if (!origin) throw new Error(`Origin 缺少视效 ${rowState.visualCode}`);
    rowState.originalRecord = cloneAttackEffectValue(origin);
    rowState.draftDocument = {records: [cloneAttackEffectValue(origin)]};
    renderSegmentControls(rowState);
    finalMessage = "本行已重置到 Origin";
  } catch (error) {
    finalMessage = `重置失败：${error?.message || error}`;
  } finally {
    rowState.saving = false;
    refreshDirtyState(rowState, finalMessage);
  }
}

// **改动自动写库，没有保存按钮。** 这是本项目既有的做法（样板见
// `views/boot-presentation.js`）：改一下 → 防抖 → 写进 Working，
// 用户只需要一个「重置」把这一行的 Working 清掉回到 Origin。
// 250ms 与那份保持一致；写入之间串行排队，避免同一行两次写打架。
const autoSave = createAutoSave(rowState => saveRow(rowState));

function commitRow(rowState) {
  autoSave.commit(rowState, rowState);
}

function bindController(controller) {
  controller.root.addEventListener("change", event => {
    const select = event.target.closest?.("[data-attack-visual-segment-action]");
    if (!select) return;
    const rowState = controller.statesByRow.get(select.closest("tr[data-row-id]"));
    if (!rowState) return;
    try {
      applySelection(rowState, select);
      commitRow(rowState);
    } catch (error) {
      refreshDirtyState(rowState, `分段选择失败：${error?.message || error}`);
    }
  });
  controller.root.addEventListener("click", event => {
    const button = event.target.closest?.("button");
    if (!button) return;
    const rowState = controller.statesByRow.get(button.closest("tr[data-row-id]"));
    if (!rowState) return;
    if (button.matches("[data-attack-visual-segment-reset]")) {
      void resetRow(rowState);
    }
  });
}

async function hydrateController(controller) {
  const repository = state.projectRepository;
  const editors = [...controller.root.querySelectorAll(
    "[data-attack-visual-segment-editor]",
  )];
  if (!repository?.resolve) {
    editors.forEach(editor => setRowError(editor, "当前项目尚未初始化"));
    controller.root.dataset.attackVisualSegmentEditorsState = "error";
    return;
  }
  try {
    const source = await segmentEditorSource(repository);
    const commandFields = await db.getFields(ATTACK_VISUAL_RESOURCE_ID);
    editors.forEach(editor => {
      const visualCode = Number(editor.dataset.visualCode);
      const row = rowForEditor(editor);
      const record = source.document.records.find(item =>
        Number(item.id) === visualCode
      );
      if (!row || !record) {
        setRowError(editor, !row
          ? "分段编辑器不在主脚本表行内"
          : `attack-visual 缺少记录 ${visualCode}`);
        return;
      }
      if (recordIsImmutable(record)) {
        editor.dataset.visualImmutable = "true";
        editor.querySelector("[data-attack-visual-segment-reset]").hidden = true;
        row.querySelectorAll("[data-attack-visual-segment-column]").forEach(cell => {
          cell.innerHTML = immutableSegmentMarkup(cell.dataset.attackVisualSegmentColumn);
        });
        const rowState = {editor, row};
        setRowState(rowState, "readonly");
        return;
      }
      try {
        const animation = attackAnimationState(effectAssets(), visualCode);
        if (!animation) throw new Error(`${record.handle}: VM 没有可解码动画状态`);
        const originalRecord = cloneAttackEffectValue(record);
        const rowState = {
          repository,
          editor,
          row,
          visualCode,
          handle: record.handle || editor.dataset.visualHandle,
          actionRecords: source.actions,
          source,
          animation,
          originalRecord,
          commandField: commandFields.find(field => field.entityHandle === record.handle
            && field.fieldName === "commands"),
          draftDocument: {records: [cloneAttackEffectValue(record)]},
          saving: false,
          get draftRecord() {
            return this.draftDocument.records[0];
          },
        };
        controller.statesByRow.set(row, rowState);
        rowState.commandField?.bind(editor, () => refreshDirtyState(rowState));
        editor.dataset.battleActionCount = String(source.actions.length);
        renderSegmentControls(rowState);
        refreshDirtyState(rowState);
        setRowState(rowState, "ready");
      } catch (error) {
        editorLog.error("攻击视觉", `操作失败：${error?.message || error}`, error);
        setRowError(editor, error?.message || error);
      }
    });
    controller.root.dataset.attackVisualSegmentEditorsState = editors.every(editor =>
      editor.dataset.attackVisualSegmentEditorState !== "error"
    ) ? "ready" : "error";
  } catch (error) {
    editorLog.error("攻击视觉", `操作失败：${error?.message || error}`, error);
    editors.forEach(editor => setRowError(editor, error?.message || error));
    controller.root.dataset.attackVisualSegmentEditorsState = "error";
  }
}

/** 水合一张主脚本表；每个 tr 是独立保存单元，四个分段单元格共享该行草稿。 */
export function hydrateAttackVisualSegmentEditors(root) {
  if (!root?.querySelectorAll) {
    return Promise.reject(new TypeError("主脚本列表根节点不可用"));
  }
  const existing = controllerByRoot.get(root);
  if (existing) return existing.promise;
  const controller = {
    root,
    statesByRow: new WeakMap(),
    promise: null,
  };
  controllerByRoot.set(root, controller);
  bindController(controller);
  controller.promise = hydrateController(controller);
  return controller.promise;
}
