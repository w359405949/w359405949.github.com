// @editor-module 效果对象（battle-action）的逐条编辑
//
// **它没有自己的页面。** battle-action 是「哪条 layout ＋ 形状 ＋ 用哪一组调色板」
// 的组合：247 条可用记录构成 246 种不同组合，其中 20 条 layout 被共用的理由正是
// 「同一组图块换一组调色板再画一次」——所以它在数据里删不掉，但它只在某条
// attack-visual 底下才有意义，编辑器里就只出现在那条视效的走带下面。
//
// 目录身份来自 VM 对 owner spawn 的现算分段；动画只复用现有 VM 与
// animated-resource-picker。config 写 battle-action，画面写唯一共享的
// battle-object-layout；页面只传递 shared-chr-bank owner 的不透明 tile/context 引用。

import {editorLog} from "../../core/editor-log.js";
import {esc} from "../../core/dom.js";
import {handleMarkup} from "../../ui/handle.js";
import {
  BATTLE_ACTION_RESOURCE_ID,
  BATTLE_OBJECT_LAYOUT_RESOURCE_ID,
  EFFECT_PALETTE_GROUP_COUNT,
  effectPaletteValues,
  projectBattleObjectOwners,
  VISUAL_METASPRITES_RESOURCE_ID,
} from "../../core/attack-chr-owner.js";
import {
  resetProjectFields,
} from "../../core/project-data.js";
import {createAutoSave} from "../../core/auto-save.js";
import {state} from "../../core/state.js";
import {db} from "../../core/project-db.js";
import {fieldOwner, hasFieldOwner} from "../../core/field-owners.js";
import {nesPalette} from "../../render/nes.js";
import {nesColorCss, nesColorGrid} from "../../ui/palette-swatches.js";
import {visualAssetComponents} from "../../core/visual-compiler.js";
import {
  effectObjectMotionCanvas,
  paintEffectObjectMotionCanvases,
  setWeaponEffectPreviewPlayback,
} from "../../render/weapon-effect-vm.js";
import {configureAnimatedResourcePicker} from "../../ui/animated-resource-picker.js";
import {bindFieldResetToOriginalButtons, resetToOriginalButton} from "../../ui/table.js";
import {mountFieldObjectColumns, mountLinkedFieldChoice} from "../../ui/field-object-editor.js";
import {
  ATTACK_VISUAL_RESOURCE_ID,
  attackEffectObjectCatalog,
  cloneAttackEffectValue,
  projectAttackVisualOwner,
} from "./attack-effect-model.js";

const ELEMENT_NAME = "attack-stage-catalog";
const VISUAL_CHR_RESOURCE_ID = "shared-chr-bank";
// **不按发射/弹道/击中分页。** 那三段是从 attack-visual 的命令流反推出来的读法，
// 不是 battle-action 的属性；把它当分类既倒转了归属，也把真正的组合点（哪条生成
// 命令指向哪条 action，在 attack-visual 的时间轴上）藏了起来。
const STAGE_LABELS = Object.freeze({objects: "效果对象"});
const controllers = new WeakMap();

function repository() {
  const value = state.projectRepository;
  if (!value?.resolve) throw new TypeError("当前浏览器项目 repository 不可用");
  return value;
}

function usageMarkup(entry) {
  return `<div class="record-resource-links" data-attack-stage-users>${entry.usages
    .map(usage => `<code data-attack-stage-usage="${esc(usage.key)}">${
      esc(usage.visualHandle)
    } · ${usage.anchor === "actor" ? "攻击者" : "目标"}生成</code>`)
    .join("")}</div>`;
}

/**
 * 一条 action 一行。**结构固定，内容后填**——
 * 早前是先放一个 `colspan` 占位格、水合时用 `outerHTML` 换掉它，
 * 于是第二次渲染取不到那个占位格，报 `Cannot set properties of null`。
 */
function entryMarkup(entry, embedded = false) {
  return `<tr class="attack-stage-entry"
      data-attack-stage-entry="${entry.actionId}"
      data-attack-stage-usage-count="${entry.usageCount}"
      data-attack-stage-visual-count="${entry.visualCount}">
    <td class="mono sticky-col">${handleMarkup(entry.handle)}</td>
    ${embedded ? "" : '<td data-attack-stage-cell="animation"></td>'}
    <td data-attack-stage-cell="shape"></td>
    <td data-attack-stage-cell="palette"></td>
    <td data-attack-stage-cell="origin-x"></td>
    <td data-attack-stage-cell="origin-y"></td>
    <td data-attack-stage-cell="tiles"></td>
    <td data-attack-stage-cell="reset"></td>
  </tr>`;
}

/**
 * 目录的表格外壳。**水合时也要用它**——早前水合直接
 * `root.innerHTML = entries.map(entryMarkup)`，裸 `<tr>` 会被 HTML 解析器丢掉，
 * 于是整张表变空，报出来的却是「没有按 Working 重算」。
 */
function catalogTableMarkup(entries, embedded = false) {
  const columns = embedded ? 7 : 8;
  return `<div class="data-table-wrap"><table class="data-table attack-stage-table">
    <thead><tr>
      <th class="sticky-col">资源 ID</th>
      ${embedded ? "" : "<th>动画</th>"}<th>形状</th><th>调色板</th>
      <th>原点 X</th><th>原点 Y</th><th>像素</th><th class="reset-column" aria-label="恢复原值" title="恢复原值"></th>
    </tr></thead>
    <tbody>${entries.map(entry => entryMarkup(entry, embedded)).join("")
      || `<tr><td colspan="${columns}" class="resource-empty">没有匹配条目</td></tr>`}</tbody>
  </table></div>`;
}

function filterEntries(entries, query) {
  const wanted = String(query || "").trim().toLocaleLowerCase("zh-CN");
  return entries.filter(entry => !wanted || JSON.stringify([
    entry.handle,
    ...entry.usages.map(usage => usage.visualHandle),
  ]).toLocaleLowerCase("zh-CN").includes(wanted));
}

function requireAsset(resolved, resourceId) {
  const asset = resolved?.value;
  if (!asset || asset.resource_id !== resourceId || !asset.document) {
    throw new TypeError(`${resourceId} owner 资产不可用`);
  }
  if (hasFieldOwner(resourceId)) fieldOwner(resourceId).describe(asset.document);
  else visualAssetComponents(asset, resourceId);
  return asset;
}

function requirePaletteAsset(resolved) {
  const asset = resolved?.value;
  if (!asset || asset.resource_id !== VISUAL_METASPRITES_RESOURCE_ID
      || !asset.document) {
    throw new TypeError(`${VISUAL_METASPRITES_RESOURCE_ID} owner 资产不可用`);
  }
  effectPaletteValues(asset.document);
  return asset;
}

async function loadOwners(controller) {
  const source = repository();
  const [
    attackResolved, actionResolved, layoutResolved, chrResolved, metaspriteResolved,
  ] = await Promise.all([
    db.readResource(ATTACK_VISUAL_RESOURCE_ID),
    db.readResource(BATTLE_ACTION_RESOURCE_ID),
    db.readResource(BATTLE_OBJECT_LAYOUT_RESOURCE_ID),
    db.readResource(VISUAL_CHR_RESOURCE_ID),
    db.readResource(VISUAL_METASPRITES_RESOURCE_ID),
  ]);
  controller.repository = source;
  controller.attackAsset = requireAsset(attackResolved, ATTACK_VISUAL_RESOURCE_ID);
  controller.actionAsset = requireAsset(actionResolved, BATTLE_ACTION_RESOURCE_ID);
  controller.layoutAsset = requireAsset(layoutResolved, BATTLE_OBJECT_LAYOUT_RESOURCE_ID);
  controller.chrAsset = requireAsset(chrResolved, VISUAL_CHR_RESOURCE_ID);
  // 预览只读取共用字段视图中的十二个色位；写入校验由字段 owner 负责。
  controller.metaspriteAsset = requirePaletteAsset(metaspriteResolved);
  controller.actionVersion = actionResolved.version;
  controller.actionFields = await db.getFields(BATTLE_ACTION_RESOURCE_ID);
  controller.actionObjects = await db.getFieldObjects(BATTLE_ACTION_RESOURCE_ID);
  controller.layoutVersion = layoutResolved.version;
  controller.layoutFields = await db.getFields(BATTLE_OBJECT_LAYOUT_RESOURCE_ID);
  controller.layoutObjects = await db.getFieldObjects(BATTLE_OBJECT_LAYOUT_RESOURCE_ID);
  controller.paletteFields = (await db.getFields(VISUAL_METASPRITES_RESOURCE_ID))
    .filter(field => field.documentPath[0] === "battle_sprite_palettes");
  if (!controller.explicitEntries) {
    controller.effectAssets = projectAttackVisualOwner(
      controller.baseEffectAssets,
      controller.attackAsset.document,
    );
  }
}

function actionRecord(controller, actionId) {
  const record = controller.actionAsset.document.records?.find(item =>
    Number(item?.id) === Number(actionId)
  );
  if (!record) throw new TypeError(`battle-action:${actionId} owner 记录不存在`);
  return record;
}

function layoutRecord(controller, handle) {
  const record = controller.layoutAsset.document.records?.find(item =>
    item?.handle === handle
  );
  if (!record) throw new TypeError(`${handle} owner 记录不存在`);
  return record;
}

function shapeOptions(tileCount, columns, rows) {
  const values = [];
  for (let width = 1; width <= 8; width += 1) {
    const height = tileCount / width;
    if (Number.isInteger(height) && height >= 1 && height <= 8) {
      values.push({columns: width, rows: height});
    }
  }
  if (!values.some(item => item.columns === columns && item.rows === rows)) {
    throw new TypeError("battle-action config 形状与 layout 固定容量不一致");
  }
  return values;
}

function cloneDraft(record) {
  return cloneAttackEffectValue(record);
}


/** 画面形状。**一格一件事**，不和调色板挤在一起。 */
function shapeMarkup(cardState) {
  return `<section data-attack-stage-config>
    <span data-attack-stage-shape-fields></span>
    <small data-attack-stage-config-status></small>
  </section>`;
}

/**
 * 调色板用**色块**呈现，不是「调色板 1/2/3/4」这种文字——
 * 文字看不出是什么颜色。四组各 4 色，取自 owner 正文现算的 NES 索引。
 *
 * 选哪一组是这一行（`battle-action`）的事；**颜色本身是全局的**，
 * 四组十二个色位都能改，写 `metasprite-record` 的 `battle_sprite_palettes`。
 * 每组 0 号位是硬件通用色，画出来但不接受点击——它不在 ROM 里，改不了。
 */
function paletteMarkup(controller, cardState) {
  const {actionDraft} = cardState;
  const values = paletteValues(controller);
  const active = Number(actionDraft.palette_id);
  const swatches = values.slice(active * 4, active * 4 + 4)
    .map(index => `<i style="background:${nesColor(index)}"></i>`).join("");
  return `<div data-attack-stage-palette-fields></div>
    <div class="attack-stage-palette-choices"><span class="attack-stage-palette-choice">
      <span>${swatches}</span></span></div>${
    paletteColorsMarkup(cardState, values, active)}`;
}

/** 选中那一组的三个可改色位，外加一个只作用于这一组的重置。 */
function paletteColorsMarkup(cardState, values, group) {
  if (!Number.isInteger(group) || group < 0 || group >= EFFECT_PALETTE_GROUP_COUNT) {
    return "";
  }
  const colors = values.slice(group * 4, group * 4 + 4);
  const open = String(cardState.openColorSlot || "");
  const slots = colors.map((index, slot) => (slot === 0
    ? `<i class="attack-stage-palette-fixed"
        style="background:${nesColor(index)}"
        data-attack-stage-palette-universal></i>`
    : `<button type="button" class="attack-stage-palette-color${
        open === `${group}:${slot}` ? " is-open" : ""
      }" style="background:${nesColor(index)}"
        data-attack-stage-palette-color="${group}:${slot}"
        aria-label="调色板 ${group + 1} 第 ${slot} 色"></button>`)).join("");
  const openSlot = open.startsWith(`${group}:`)
    ? Number(open.split(":")[1]) : null;
  return `<div class="attack-stage-palette-colors"
      data-attack-stage-palette-colors="${group}">
    ${slots}
    ${resetToOriginalButton(group, {
      title: "只把这一组三色放回 Origin；形状、原点与所选组属于别的 owner，不动",
    })}
  </div>${openSlot ? colorGridMarkup(group, openSlot, colors[openSlot]) : ""}`;
}

/** 64 色 NES 取色格，排布与 PPU 一致（16×4）。 */
function colorGridMarkup(group, slot, current) {
  return nesColorGrid({
    current,
    pickAttribute: "data-attack-stage-palette-pick",
    gridAttributes: `data-attack-stage-palette-grid="${group}:${slot}"`,
  });
}

/**
 * 十六个色值只有一个来源：`metasprite-record` 的 `battle_sprite_palettes`。
 * 发布数据里的 `clean_animations.palette.values` 是同一段字节的提取快照，
 * 它不随编辑变化——读它就等于让用户改完看不见。
 */
function paletteValues(controller) {
  return effectPaletteValues(controller.metaspriteAsset.document);
}

const nesColor = nesColorCss;

/** 原点 X。**不写 handle、不写「N 个 action 共用」、不写那句保存说明**——
 *  共用是常态，提醒它是讲常识；`data-layout-shared` 留给合同用。 */
function originXMarkup(cardState) {
  const {layout} = cardState;
  const incoming = Number(layout.incoming_reference_count)
    || (layout.incoming_action_handles || []).length;
  return `<section data-attack-stage-layout
      data-layout-handle="${esc(layout.handle)}"
      data-layout-impact-count="${incoming}"
      data-layout-shared="${incoming > 1}">
    <span data-attack-stage-layout-fields></span>
    <small data-attack-stage-layout-status></small>
  </section>`;
}

function originYMarkup(cardState) {
  return '<span data-attack-stage-layout-y-fields></span>';
}

/** 像素上下文单独一列，**不跟原点挤在一起**。 */
function tileMarkup() {
  return '<span data-attack-stage-tile-fields></span>';
}

/**
 * 行正文：四个单元格，与表头一一对应。
 * **没有保存按钮**——改动自动写 Working（见 docs 的「写入链」一节）；
 * 每行只配一个「重置」，把这一行的 Working 清掉回到 Origin。
 */
/** 把六个单元格各自填上。**不动行结构**，所以可以反复调用。 */
function fillEntryCells(controller, cardState) {
  const cell = name => cardState.card.querySelector(
    `[data-attack-stage-cell="${name}"]`,
  );
  const parts = {
    ...(controller.embedded ? {} : {
      animation: `<animated-resource-picker data-attack-stage-animation-picker>
        </animated-resource-picker>`,
    }),
    shape: shapeMarkup(cardState),
    palette: paletteMarkup(controller, cardState),
    "origin-x": originXMarkup(cardState),
    "origin-y": originYMarkup(cardState),
    tiles: tileMarkup(),
    reset: `${resetToOriginalButton(`row:${cardState.entry.actionId}`, {
      title: "恢复这个动作的配置和当前布局；共用此布局的其他使用也会同步",
    })}
    <p class="module-editor-message" data-attack-stage-message hidden
      aria-live="polite"></p>`,
  };
  for (const [name, html] of Object.entries(parts)) {
    const node = cell(name);
    if (node) node.innerHTML = html;
  }
}

function sameConfig(left, right) {
  return Number(left.columns) === Number(right.columns)
    && Number(left.rows) === Number(right.rows)
    && Number(left.palette_id) === Number(right.palette_id);
}

function sameLayout(left, right) {
  return JSON.stringify([
    left.fields?.origin,
    left.fields?.tile_references,
  ]) === JSON.stringify([
    right.fields?.origin,
    right.fields?.tile_references,
  ]);
}

function projectedAssets(controller, cardState) {
  const actionDocument = cloneDraft(controller.actionAsset.document);
  const layoutDocument = cloneDraft(controller.layoutAsset.document);
  const action = actionDocument.records.find(item =>
    Number(item.id) === cardState.entry.actionId
  );
  Object.assign(action, {
    columns: Number(cardState.actionDraft.columns),
    rows: Number(cardState.actionDraft.rows),
    palette_id: Number(cardState.actionDraft.palette_id),
  });
  const layout = layoutDocument.records.find(item =>
    item.handle === cardState.layout.handle
  );
  layout.fields = cloneDraft(cardState.layoutDraft.fields);
  return projectBattleObjectOwners(
    controller.effectAssets,
    actionDocument,
    layoutDocument,
    controller.metaspriteAsset.document,
  );
}

function pickerOption(usage) {
  return {
    value: usage.key,
    handle: usage.visualHandle,
    label: `${usage.visualHandle} · ${usage.anchor === "actor" ? "攻击者" : "目标"}生成`,
    searchText: `${usage.visualHandle} ${usage.anchor}`,
    usage,
  };
}

function configurePreview(controller, cardState) {
  const picker = cardState.card.querySelector("[data-attack-stage-animation-picker]");
  if (!picker) throw new TypeError(`${cardState.entry.handle} 缺少动画选择器`);
  const assets = projectedAssets(controller, cardState);
  configureAnimatedResourcePicker(picker, {
    options: cardState.entry.usages.map(pickerOption),
    value: cardState.selectedUsageKey,
    renderPreview: option => effectObjectMotionCanvas({
      visualCode: option.usage.visualCode,
      sourceCommandIndex: option.usage.commandIndex,
      action: cardState.entry.actionId,
      play: true,
      label: `${cardState.entry.handle} 在 ${option.usage.visualHandle} 中的动画`,
    }),
    paintPreview: root => paintEffectObjectMotionCanvases(root, assets),
    setPreviewActive: setWeaponEffectPreviewPlayback,
  });
}

function selectedUsage(cardState) {
  return cardState.entry.usages.find(usage => usage.key === cardState.selectedUsageKey)
    || cardState.entry.usages[0];
}

function refreshStatus(cardState) {
  const actionDirty = !sameConfig(cardState.action, cardState.actionDraft);
  const layoutDirty = !sameLayout(cardState.layout, cardState.layoutDraft);
  cardState.card.dataset.attackStageConfigDirty = String(actionDirty);
  cardState.card.dataset.attackStageLayoutDirty = String(layoutDirty);
  const configStatus = cardState.card.querySelector("[data-attack-stage-config-status]");
  const layoutStatus = cardState.card.querySelector("[data-attack-stage-layout-status]");
  // **不写「有未保存修改 / 与 Working 一致」**——重置按钮能不能点已经说完了。
  if (configStatus) configStatus.textContent = "";
  if (layoutStatus) layoutStatus.textContent = "";
  const reset = cardState.card.querySelector('[data-attack-stage-cell="reset"] [data-reset-to-original]');
  if (reset) {
    const dirty = actionDirty || layoutDirty || cardState.resetFields?.some(field => field.hasOverride) || false;
    reset.dataset.originalDirty = String(dirty);
    reset.classList.toggle('dirty', dirty);
    reset.disabled = cardState.busy || !dirty;
  }
}

function showMessage(cardState, message) {
  const node = cardState.card.querySelector("[data-attack-stage-message]");
  if (!node) return;
  node.hidden = !message;
  node.textContent = message;
}

/**
 * 只重画调色板那一格。
 *
 * **不要为了换一组颜色去重画整行**：`fillEntryCells` 会连动画选择器一起换掉，
 * 于是正在播的预览被拆了重建，重建期间画面是空的——在发射动画上就是「一点调色板
 * 就黑屏」，而且没有任何报错。调色板与动画分属两格，重画一格就够了。
 */
function renderPaletteCell(controller, cardState) {
  const cell = cardState.card.querySelector('[data-attack-stage-cell="palette"]');
  if (cell) {
    cell.innerHTML = paletteMarkup(controller, cardState);
    bindPaletteReset(controller, cardState);
    void mountStageFields(controller, cardState, {paletteOnly: true});
  }
}

async function mountStageFields(controller, cardState, {paletteOnly = false} = {}) {
  const action = controller.actionObjects.find(object => object.id === cardState.action.handle);
  const layout = controller.layoutObjects.find(object => object.id === cardState.layout.handle);
  if (!action || !layout) throw new TypeError("效果对象缺少字段对象");
  const paletteHost = cardState.card.querySelector('[data-attack-stage-palette-fields]');
  if (paletteHost) await mountFieldObjectColumns(paletteHost, action, ['palette_id']);
  if (paletteOnly) return;
  const shapeHost = cardState.card.querySelector('[data-attack-stage-shape-fields]');
  if (shapeHost) {
    const options = shapeOptions(cardState.layout.fields.tile_references.length,
      Number(cardState.actionDraft.columns), Number(cardState.actionDraft.rows));
    mountLinkedFieldChoice(shapeHost, action, ['columns', 'rows'], options.map(option => ({
      label: `${option.columns} × ${option.rows}`,
      values: [option.columns, option.rows],
    })), {label: '画面形状'});
  }
  const layoutHost = cardState.card.querySelector('[data-attack-stage-layout-fields]');
  if (layoutHost) await mountFieldObjectColumns(layoutHost, layout,
    ['x_quarter_tiles']);
  const layoutYHost = cardState.card.querySelector('[data-attack-stage-layout-y-fields]');
  if (layoutYHost) await mountFieldObjectColumns(layoutYHost, layout,
    ['y_quarter_tiles']);
  const tileHost = cardState.card.querySelector('[data-attack-stage-tile-fields]');
  if (tileHost) await mountFieldObjectColumns(tileHost, layout, ['tile_references']);
}

function bindPaletteReset(controller, cardState) {
  const cell = cardState.card.querySelector('[data-attack-stage-cell="palette"]');
  const selections = new Map(Array.from({length: EFFECT_PALETTE_GROUP_COUNT}, (_, group) => [String(group),
    controller.paletteFields.filter(field => field.entityHandle === `${VISUAL_METASPRITES_RESOURCE_ID}:battle-sprite-palettes:${group}`)]));
  bindFieldResetToOriginalButtons(cell, selections, {database: db,
    afterReset: () => {cardState.openColorSlot = ""; renderPaletteCell(controller, cardState);},
    onError: error => showMessage(cardState, `重置颜色失败：${error?.message || error}`),
  });
}

function renderCard(controller, cardState, message = "") {
  fillEntryCells(controller, cardState);
  bindPaletteReset(controller, cardState);
  void mountStageFields(controller, cardState).catch(error =>
    {editorLog.error("攻击视觉", `操作失败：${error?.message || error}`, error); return showMessage(cardState, `字段控件载入失败：${error?.message || error}`);});
  if (!controller.embedded) configurePreview(controller, cardState);
  cardState.resetFields = [...controller.layoutFields.filter(field => field.entityHandle === cardState.layout.handle),
    ...controller.actionFields.filter(field => field.entityHandle === cardState.action.handle && !field.readOnly)];
  refreshStatus(cardState);
  showMessage(cardState, message);
  const resetCell = cardState.card.querySelector('[data-attack-stage-cell="reset"]');
  const selection = {reset: async () => {
    const layout = controller.layoutFields.filter(field => field.entityHandle === cardState.layout.handle);
    const action = controller.actionFields.filter(field => field.entityHandle === cardState.action.handle && !field.readOnly);
    await resetProjectFields(db, layout);
    await resetProjectFields(db, action);
  }};
  bindFieldResetToOriginalButtons(resetCell, new Map([[`row:${cardState.entry.actionId}`, selection]]), {
    beforeReset: () => {autoSave.cancel(cardState); cardState.resetting = true; setBusy(cardState, true);},
    afterReset: async () => {cardState.resetting = false; cardState.busy = false; await refreshOwners(controller);},
    onError: error => {cardState.resetting = false; setBusy(cardState, false, `重置失败：${error?.message || error}`);},
  });
}

function rebuildCardStates(controller, messageByAction = new Map()) {
  for (const cardState of controller.cardStates.values())
    for (const unbind of cardState.fieldBindings || []) unbind();
  controller.cardStates.clear();
  controller.root.querySelectorAll("[data-attack-stage-entry]").forEach(card => {
    const actionId = Number(card.dataset.attackStageEntry);
    const entry = controller.entries.find(item => item.actionId === actionId);
    const action = actionRecord(controller, actionId);
    if (!entry || action.available !== true || !action.layout_reference) {
      const animationCell = card.querySelector('[data-attack-stage-cell="animation"]');
      if (animationCell) {
        animationCell.innerHTML =
          '';
      }
      return;
    }
    const layout = layoutRecord(controller, action.layout_reference);
    const cardState = {
      card,
      entry,
      action,
      layout,
      actionDraft: cloneDraft(action),
      actionBaseline: cloneDraft(action),
      layoutDraft: cloneDraft(layout),
      layoutBaseline: cloneDraft(layout.fields),
      selectedUsageKey: entry.usages[0]?.key || "",
      openColorSlot: "",
      busy: false,
    };
    controller.cardStates.set(card, cardState);
    try {
      renderCard(controller, cardState, messageByAction.get(actionId) || "");
      cardState.fieldBindings = [...controller.layoutFields.filter(field => field.entityHandle === layout.handle),
        ...controller.actionFields.filter(field => field.entityHandle === action.handle)]
        .map(field => {
          let observed = JSON.stringify(field.value);
          return field.bind(card, (_target, value, _field, reason) => {
            const current = JSON.stringify(value), previous = observed; observed = current;
            if (reason === "initial" || (reason === "refresh" && current === previous)
                || (cardState.busy && reason !== "reset")
                || controller.cardStates.get(card) !== cardState) return;
            const isLayout = field.resourceId === BATTLE_OBJECT_LAYOUT_RESOURCE_ID;
            const documents = isLayout ? [cardState.layoutBaseline, cardState.layoutDraft.fields]
              : [cardState.actionBaseline, cardState.actionDraft];
            const members = !isLayout && ["columns", "rows"].includes(field.fieldName)
              ? controller.actionFields.filter(member => member.entityHandle === action.handle && ["columns", "rows"].includes(member.fieldName))
              : [field];
            for (const member of members) {
              const path = member.documentPath.slice(isLayout ? 3 : 2);
              for (const document of documents)
                path.slice(0, -1).reduce((node, key) => node[key], document)[path.at(-1)] = cloneDraft(member.value);
            }
            if (cardState.resetting) {renderCard(controller, cardState); return;}
            if (!isLayout && field.fieldName === "layout_reference") {
              void autoSave.flush(cardState).then(() => refreshOwners(controller))
                .catch(error => {editorLog.error("攻击视觉", `操作失败：${error?.message || error}`, error); return showMessage(cardState, `布局引用刷新失败：${error?.message || error}`);});
              return;
            }
            autoSave.cancel(cardState);
            renderCard(controller, cardState);
            if (!sameLayout(cardState.layoutDraft, cardState.layout)
                || !sameConfig(cardState.actionDraft, cardState.action)) commitCard(controller, cardState);
          });
        });
      cardState.fieldBindings.push(...controller.paletteFields.map(field => {
        let observed = field.value;
        return field.bind(card, (_target, value, _field, reason) => {
          const previous = observed; observed = value;
          if (reason === "initial" || value === previous || controller.cardStates.get(card) !== cardState) return;
          renderPaletteCell(controller, cardState);
          if (!controller.embedded) configurePreview(controller, cardState);
        });
      }));
      card.dataset.attackStageEntryState = "ready";
      card.dataset.attackStageLayoutHandle = layout.handle;
    } catch (error) {
      editorLog.error("攻击视觉", `操作失败：${error?.message || error}`, error);
      card.dataset.attackStageEntryState = "error";
      const cell = card.querySelector('[data-attack-stage-cell="animation"]');
      if (cell) {
        cell.innerHTML =
          `<span class="resource-empty">编辑器不可用：${esc(error?.message || error)}</span>`;
      }
    }
  });
}

async function refreshOwners(controller, messageByAction = new Map()) {
  await loadOwners(controller);
  if (!controller.explicitEntries) {
    const allEntries = attackEffectObjectCatalog(controller.effectAssets);
    controller.entries = filterEntries(
      allEntries,
      controller.root.dataset.attackStageQuery,
    );
    controller.root.dataset.attackStageEntryCount = String(allEntries.length);
    controller.root.dataset.attackStageVisibleCount = String(controller.entries.length);
    controller.root.innerHTML = catalogTableMarkup(
      controller.entries, controller.embedded);
  }
  rebuildCardStates(controller, messageByAction);
}

function setBusy(cardState, value, message = "") {
  cardState.busy = Boolean(value);
  refreshStatus(cardState);
  showMessage(cardState, message);
}

async function saveConfig(controller, cardState) {
  if (cardState.busy || sameConfig(cardState.action, cardState.actionDraft)) return;
  setBusy(cardState, true);
  try {
    const changes = controller.actionFields.filter(field => field.entityHandle === cardState.action.handle)
      .flatMap(field => {
        const value = cardState.actionDraft[field.fieldName];
        return value === cardState.actionBaseline[field.fieldName] ? [] : [{field, value}];
      });
    if (changes.length) await db.writeFields(changes, {expectedVersion: changes[0].field.version});
    // **成功不报喜。** 写成功是常态；只有失败才是用户需要知道的结果。
    await refreshOwners(controller);
  } catch (error) {
    setBusy(cardState, false, `保存 config 失败：${error?.message || error}`);
  } finally {cardState.busy = false;}
}

async function saveLayout(controller, cardState) {
  if (cardState.busy || sameLayout(cardState.layout, cardState.layoutDraft)) return;
  setBusy(cardState, true);
  try {
    const fields = cloneDraft(cardState.layoutDraft.fields);
    const changes = controller.layoutFields.filter(field => field.entityHandle === cardState.layout.handle)
      .flatMap(field => {
        const path = field.documentPath.slice(3);
        const value = path.reduce((node, key) => node[key], fields);
        const before = path.reduce((node, key) => node[key], cardState.layoutBaseline);
        return JSON.stringify(value) === JSON.stringify(before) ? [] : [{field, value}];
      });
    if (changes.length) await db.writeFields(changes, {expectedVersion: changes[0].field.version});
    await refreshOwners(controller);
  } catch (error) {
    setBusy(cardState, false, `保存画面失败：${error?.message || error}`);
  } finally {cardState.busy = false;}
}

/** 全局色位与其他组件共用字段；先提交本行草稿，颜色写入不重建其他 owner 草稿。 */
async function savePaletteColor(controller, cardState, group, slot, color) {
  if (cardState.busy) return;
  try {
    await autoSave.flush(cardState);
    cardState = controller.cardStates.get(cardState.card) || cardState;
    setBusy(cardState, true);
    const field = controller.paletteFields.find(field =>
      field.entityHandle === `${VISUAL_METASPRITES_RESOURCE_ID}:battle-sprite-palettes:${group}`
        && field.fieldName === `color_${slot - 1}`);
    if (!field) throw new TypeError("调色板色位不存在");
    await field.set(color, {expectedVersion: field.version});
    cardState.openColorSlot = "";
    renderPaletteCell(controller, cardState);
  } catch (error) {
    editorLog.error("攻击视觉", `操作失败：${error?.message || error}`, error);
    showMessage(cardState, `保存颜色失败：${error?.message || error}`);
  } finally {cardState.busy = false; refreshStatus(cardState);}
}

function applyInputs(controller, cardState, target) {
  if (target.matches("[data-attack-stage-animation-picker]")) {
    cardState.selectedUsageKey = target.value;
    return true;
  }
  return false;
}

// **改动自动写库，没有保存按钮**（见 `docs/metalmaxcn_project.md` 的「写入链」）。
// 250ms 与 `views/boot-presentation.js` 一致；config 与 layout 是两份 owner，
// 各自脏了才写，写入之间靠 `cardState.busy` 串行。
const autoSave = createAutoSave(async ({controller, cardState}) => {
  if (!sameConfig(cardState.actionDraft, cardState.action)) {
    await saveConfig(controller, cardState);
  }
  if (!sameLayout(cardState.layoutDraft, cardState.layout)) {
    await saveLayout(controller, cardState);
  }
});

function commitCard(controller, cardState) {
  autoSave.commit(cardState, {controller, cardState});
}

function bind(controller) {
  controller.root.addEventListener("change", event => {
    const card = event.target.closest?.("[data-attack-stage-entry]");
    const cardState = controller.cardStates.get(card);
    if (!cardState || cardState.busy) return;
    try {
      applyInputs(controller, cardState, event.target);
      commitCard(controller, cardState);
    } catch (error) {
      editorLog.error("攻击视觉", `操作失败：${error?.message || error}`, error);
      showMessage(cardState, `修改失败：${error?.message || error}`);
    }
  });
  controller.root.addEventListener("click", event => {
    const button = event.target.closest?.("button");
    const card = button?.closest?.("[data-attack-stage-entry]");
    const cardState = controller.cardStates.get(card);
    if (!button || !cardState || cardState.busy) return;
    if (button.matches("[data-attack-stage-palette-color]")) {
      const slot = String(button.dataset.attackStagePaletteColor || "");
      cardState.openColorSlot = cardState.openColorSlot === slot ? "" : slot;
      renderPaletteCell(controller, cardState);
      return;
    }
    if (button.matches("[data-attack-stage-palette-pick]")) {
      const [group, slot] = String(cardState.openColorSlot || "").split(":");
      void savePaletteColor(
        controller, cardState, Number(group), Number(slot),
        Number(button.dataset.attackStagePalettePick),
      );
      return;
    }
  });

}

async function hydrate(element) {
  const stage = String(element.dataset.attackStage || "");
  const embedded = element.dataset.attackStageEmbedded === "1";
  const baseEffectAssets = element.attackStageEffectAssets
    || state.project?.visuals?.weapon_effect_catalog?.asset_catalog_data || {};
  const explicitEntries = Array.isArray(element.attackStageEntries);
  const entries = explicitEntries ? element.attackStageEntries : [];
  if (!STAGE_LABELS[stage] || !Array.isArray(entries)) {
    throw new TypeError("阶段目录缺少现算条目");
  }
  const controller = {
    root: element,
    stage,
    embedded,
    entries,
    explicitEntries,
    baseEffectAssets,
    effectAssets: baseEffectAssets,
    cardStates: new Map(),
  };
  controllers.set(element, controller);
  bind(controller);
  await refreshOwners(controller);
  element.dataset.attackStageCatalogState = [...element.querySelectorAll(
    "[data-attack-stage-entry]",
  )].every(card => card.dataset.attackStageEntryState === "ready")
    ? "ready" : "error";
}

const HTMLElementBase = globalThis.HTMLElement || class {};

if (globalThis.customElements && globalThis.HTMLElement
    && !globalThis.customElements.get(ELEMENT_NAME)) {
  globalThis.customElements.define(ELEMENT_NAME, class extends HTMLElementBase {
    connectedCallback() {
      if (this.dataset.attackStageCatalogBound === "1") return;
      this.dataset.attackStageCatalogBound = "1";
      void hydrate(this).catch(error => {
        editorLog.error("攻击视觉", `操作失败：${error?.message || error}`, error);
        this.dataset.attackStageCatalogState = "error";
        this.dataset.attackStageCatalogError = String(error?.message || error);
        this.querySelectorAll('[data-attack-stage-cell="animation"]').forEach(body => {
          body.innerHTML = `<p class="resource-empty">目录载入失败：${esc(
            error?.message || error,
          )}</p>`;
        });
      });
    }
  });
}

/** Attach dynamic catalog data before the custom element starts asynchronous hydration. */
export function configureAttackStageCatalogElement(element, entries, effectAssets) {
  if (!element?.matches?.(ELEMENT_NAME)) return;
  element.attackStageEntries = entries;
  element.attackStageEffectAssets = effectAssets;
  if (element.isConnected && element.dataset.attackStageCatalogBound !== "1") {
    element.connectedCallback?.();
  }
}

/**
 * 显式条目模式下的表体。调用方**必须**在元素挂进 DOM 之前就把它填好并把条目挂上：
 * 自定义元素一插进来就自己水合，先插后配的话它已经按「没有显式条目」读了全表。
 */
export function attackStageCatalogTableMarkup(entries, {embedded = false} = {}) {
  return catalogTableMarkup(entries, embedded);
}

export const ATTACK_STAGE_CATALOG_ELEMENT = ELEMENT_NAME;
