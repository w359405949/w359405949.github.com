// @editor-module 怪物表里的「形象 ＋ 调色板」一格
//
// **两条引用一起挑。** 图形只有 2 bit 像素索引，颜色全由 palette 决定——单看哪一边
// 都判断不了配出来是什么样。所以用同一个选择器的两栏：左栏形象、右栏调色板，
// 每一栏的候选都按**另一栏当前的值**画出来，挑哪边都能立刻看到合起来的结果。
//
// 调色板是独立池，不隶属某个形象：74 条单色板与 27 条双色组合是独立记录，
// 131 只怪物引用 79 个图形，各自配自己的调色板——「换色不换图」就是这么来的。
// 所以右栏始终列出完整的调色板清单，不随左栏变。
//
// 候选与写回都走 owner：`monsterFigureSelection` 解出当前两条引用，
// `saveMonsterFigureSelection` 写回，本模块不解 `palette_code` 的编码。

import {esc} from "../../core/dom.js";
import {db} from "../../core/project-db.js";
import {entityPeekPreviewInput, entityPreviewInput, entityPreviewInputs,
  loadEntityCatalog} from "../../core/entities.js";
import {state} from "../../core/state.js";
import {monsterPalettePairs, projectMonsterFigureFields} from "../../core/monster-visual-owners.js";
import {
  monsterFigureCanvas,
  paintMonsterFigureCanvases,
} from "../../render/monster-figure.js";
import {
  configureAnimatedResourcePicker,
} from "../../ui/animated-resource-picker.js";
import {paletteSwatches} from "../../ui/palette-swatches.js";
import {
  MONSTER_FIGURE_AUTHORING_MODULE_ID,
  monsterFigureSelection,
  saveMonsterFigureSelection,
} from "../visual/monster-figure-authoring.js";

const ELEMENT_NAME = "monster-figure-field";
const GRAPHIC_MODULE_ID = "monster-graphic";
const PALETTE_MODULE_ID = "monster-palette";
const PALETTE_PAIR_MODULE_ID = "monster-palette-pair";
const PREVIEW_BOX = 72;

function repository() {
  const value = state.projectRepository;
  if (!value?.resolve) throw new TypeError("当前浏览器项目 repository 不可用");
  return value;
}

/** 从字段对象投影当前形象引用；保存/重置会统一使 db 正文失效。 */
async function monsterVisualDocument(enemyId) {
  const catalog = await loadEntityCatalog();
  const target = catalog.handleFor("monster", enemyId);
  const [, figureFields] = await Promise.all([
    entityPreviewInput(db, target, "monster.figure", MONSTER_FIGURE_AUTHORING_MODULE_ID, {catalog}),
    db.readResource("monster-figure"),
  ]);
  const documentValue = entityPeekPreviewInput(db, target, "monster.figure",
    MONSTER_FIGURE_AUTHORING_MODULE_ID);
  if (!documentValue) throw new TypeError("monster-visual-layout owner 资产不可用");
  return {document: projectMonsterFigureFields({document: documentValue}, figureFields.value).document,
    version: figureFields.version, target, catalog};
}

async function monsterVisualSource(enemyId) {
  const source = repository();
  const current = await monsterVisualDocument(enemyId);
  const inputs = await entityPreviewInputs(db, current.target, "monster.figure", {catalog: current.catalog});
  const graphicDocument = inputs[GRAPHIC_MODULE_ID];
  return {
    repository: source,
    version: current.version,
    document: current.document,
    graphics: graphicDocument?.records || [],
  };
}

function idText(value) {
  return Number(value).toString(16).toUpperCase().padStart(2, "0");
}

/** 一条引用实际用到的单色板号：双色组合摊成两条，单色板就是它自己。 */
function paletteIdsOf(documentValue, moduleId, paletteId) {
  if (moduleId !== PALETTE_PAIR_MODULE_ID) return [Number(paletteId)];
  const pair = monsterPalettePairs(documentValue).find(item =>
    Number(item.id) === Number(paletteId));
  return [pair?.first_palette_id, pair?.second_palette_id]
    .filter(value => value !== undefined && value !== null).map(Number);
}

function paletteValue(moduleId, paletteId) {
  return `${moduleId}:${Number(paletteId)}`;
}

function graphicOptions(graphics) {
  return graphics.map(item => {
    const id = Number(item.id);
    const handle = item.handle || `${GRAPHIC_MODULE_ID}:${idText(id)}`;
    return {
      value: String(id),
      handle,
      label: idText(id),
      searchText: `${id} ${idText(id)} ${handle}`,
      kind: "graphic",
      id,
    };
  });
}

function paletteOptions(documentValue) {
  return [
    ...(documentValue.palettes || []).map(item => {
      const id = Number(item.id);
      return {
        value: paletteValue(PALETTE_MODULE_ID, id),
        handle: `${PALETTE_MODULE_ID}:${idText(id)}`,
        label: idText(id),
        searchText: `${id} ${idText(id)} ${PALETTE_MODULE_ID} 单色板`,
        kind: "palette",
        paletteIds: [id],
      };
    }),
    ...monsterPalettePairs(documentValue).map(item => {
      const id = Number(item.id);
      return {
        value: paletteValue(PALETTE_PAIR_MODULE_ID, id),
        handle: `${PALETTE_PAIR_MODULE_ID}:${idText(id)}`,
        label: `双 ${idText(id)}`,
        searchText: `${id} ${idText(id)} ${PALETTE_PAIR_MODULE_ID} 双色组合`,
        kind: "palette",
        paletteIds: paletteIdsOf(documentValue, PALETTE_PAIR_MODULE_ID, id),
      };
    }),
  ];
}

/** 一条单色板的三个色号。 */
function paletteColors(documentValue, paletteId) {
  return (documentValue.palettes || []).find(item =>
    Number(item.id) === Number(paletteId))?.colors || [];
}

/**
 * 调色板画它自己，不画「用它渲染出来的怪物」。
 *
 * 用怪物去表示调色板，一栏 101 个候选就是 101 只同样的怪物，只有颜色差别，还占
 * 满整格；色带本身既紧凑又直白。双色组合画两条——它就是两条单色板拼起来的。
 * 换成新调色板之后左栏那 79 个形象会整体按新色重画，搭配效果在那边看。
 */
function paletteSwatchMarkup(documentValue, paletteIds) {
  return `<span class="monster-palette-candidate">${paletteIds.map(id =>
    paletteSwatches(paletteColors(documentValue, id),
      {className: "palette-swatches is-wide"})).join("")}</span>`;
}

/**
 * 候选的预览：形象栏画「配上当前调色板是什么样」，调色板栏画调色板本身。
 *
 * 形象那边两边都换就成了另一只怪物，回答不了「这一格改成它会变成什么样」。
 */
function candidatePreview(documentValue, picker, option) {
  if (option.kind === "palette") {
    return paletteSwatchMarkup(documentValue, option.paletteIds);
  }
  const values = picker.values || {};
  const [currentModuleId, currentPaletteId] =
    String(values.palette || "").split(":");
  return monsterFigureCanvas({
    graphicId: option.id,
    paletteIds: paletteIdsOf(documentValue, currentModuleId, currentPaletteId),
    box: PREVIEW_BOX,
    label: option.handle,
  });
}

/**
 * 表格里那一行的当前值：形象写编号，调色板**直接画出来**。
 *
 * 「双 00」既占一行又看不出是什么色；色带自己就说清楚了，双色组合两条也一眼分得开。
 */
function currentLabelMarkup(documentValue, {values}) {
  const [moduleId, paletteId] = String(values.palette || "").split(":");
  return `<span class="monster-figure-field-label">
    <span class="mono">${idText(values.graphic)} <span title="暂时不写进 ROM">※</span></span>
    ${paletteSwatchMarkup(documentValue, paletteIdsOf(documentValue, moduleId, paletteId))}
  </span>`;
}

async function save(element, picker) {
  const enemyId = Number(element.dataset.enemyId);
  const values = picker.values || {};
  const [paletteModuleId, paletteId] = String(values.palette || "").split(":");
  const source = await monsterVisualSource(enemyId);
  const current = monsterFigureSelection(source.document, enemyId);
  const next = {
    ...current,
    graphicId: Number(values.graphic),
    paletteModuleId,
    paletteId: Number(paletteId),
  };
  if (Number(next.graphicId) === Number(current.graphicId)
      && next.paletteModuleId === current.paletteModuleId
      && Number(next.paletteId) === Number(current.paletteId)) return;
  await saveMonsterFigureSelection(
    source.repository, enemyId, next, {expectedVersion: source.version});
  db.invalidateResource(MONSTER_FIGURE_AUTHORING_MODULE_ID);
  await monsterVisualSource(enemyId);
  element.dataset.monsterFigureFieldGraphic = String(next.graphicId);
  element.dataset.monsterFigureFieldPalette =
    paletteValue(next.paletteModuleId, next.paletteId);
}

async function hydrate(element) {
  const enemyId = Number(element.dataset.enemyId);
  if (!Number.isInteger(enemyId)) {
    throw new TypeError("monster-figure-field 缺少 data-enemy-id");
  }
  const source = await monsterVisualSource(enemyId);
  const selection = monsterFigureSelection(source.document, enemyId);
  element.innerHTML = "<animated-resource-picker></animated-resource-picker>";
  const picker = element.querySelector("animated-resource-picker");
  configureAnimatedResourcePicker(picker, {
    panes: [
      {
        id: "graphic",
        label: "形象",
        options: graphicOptions(source.graphics),
        value: String(selection.graphicId),
      },
      {
        id: "palette",
        label: "调色板",
        options: paletteOptions(source.document),
        value: paletteValue(selection.paletteModuleId, selection.paletteId),
      },
    ],
    renderPreview: option => candidatePreview(source.document, picker, option),
    renderLabel: context => currentLabelMarkup(source.document, context),
    paintPreview: root => paintMonsterFigureCanvases(root),
  });
  element.dataset.monsterFigureFieldGraphic = String(selection.graphicId);
  element.dataset.monsterFigureFieldPalette =
    paletteValue(selection.paletteModuleId, selection.paletteId);
  element.dataset.monsterFigureFieldState = "ready";
}

function idleMarkup(element, documentValue) {
  const enemyId = Number(element.dataset.enemyId);
  if (!Number.isInteger(enemyId)) {
    throw new TypeError("monster-figure-field 缺少 data-enemy-id");
  }
  // 当前形象引用来自 monster-figure 字段投影；候选等打开选择器时再读取。
  const selection = monsterFigureSelection(documentValue, enemyId);
  element.dataset.monsterFigureFieldGraphic = String(selection.graphicId);
  element.dataset.monsterFigureFieldPalette =
    paletteValue(selection.paletteModuleId, selection.paletteId);
  element.dataset.monsterFigureFieldState = "idle";
  return `<button class="animated-resource-trigger" type="button"
      data-monster-figure-field-open aria-haspopup="dialog"
      aria-label="编辑怪物 ${idText(enemyId)} 的形象与调色板">
    <span class="animated-resource-current">
      <span class="animated-resource-current-preview" aria-hidden="true">${
        monsterFigureCanvas({graphicId: selection.graphicId,
          paletteIds: paletteIdsOf(documentValue, selection.paletteModuleId, selection.paletteId),
          box: PREVIEW_BOX, label: `怪物 ${idText(enemyId)}`})
      }</span>
      ${currentLabelMarkup(documentValue, {values: {
        graphic: String(selection.graphicId),
        palette: paletteValue(selection.paletteModuleId, selection.paletteId),
      }})}
    </span>
    <span class="animated-resource-chevron" aria-hidden="true">▾</span>
  </button>`;
}

function showHydrationError(element, error) {
  element.dataset.monsterFigureFieldState = "error";
  element.dataset.monsterFigureFieldError = String(error?.message || error);
  element.innerHTML = `<span class="resource-empty">${esc(
    error?.message || error)}</span>`;
}

const HTMLElementBase = globalThis.HTMLElement || class {};

if (globalThis.customElements && globalThis.HTMLElement
    && !globalThis.customElements.get(ELEMENT_NAME)) {
  globalThis.customElements.define(ELEMENT_NAME, class extends HTMLElementBase {
    connectedCallback() {
      if (this.dataset.monsterFigureFieldBound === "1") return;
      this.dataset.monsterFigureFieldBound = "1";
      // **别让选择器的点击落到行上。** 这一格坐在 `tr[data-record-link]` 里，
      // 行点击会跳去记录页；触发器是 `<button>`，行绑定会跳过它，但对话框里的
      // 候选卡是挂在 `<dialog>` 上的，冒泡路径仍然经过这一行。
      this.addEventListener("click", event => {
        event.stopPropagation();
        const trigger = event.target.closest?.("[data-monster-figure-field-open]");
        if (!trigger || this.dataset.monsterFigureFieldState === "loading") return;
        event.preventDefault();
        trigger.disabled = true;
        this.dataset.monsterFigureFieldState = "loading";
        void hydrate(this).then(() => {
          this.querySelector("animated-resource-picker")?.open();
        }).catch(error => showHydrationError(this, error));
      });
      this.addEventListener("change", event => {
        const picker = event.target.closest?.("animated-resource-picker");
        if (!picker) return;
        void save(this, picker).catch(error => {
          this.dataset.monsterFigureFieldError = String(error?.message || error);
        });
      });
      // 列表冷启动也必须声明这份来源；不能依赖此前打开详情留下的缓存。
      const enemyId = Number(this.dataset.enemyId);
      void monsterVisualDocument(enemyId).then(async source => {
        if (!this.isConnected) return;
        this.innerHTML = idleMarkup(this, source.document);
        await paintMonsterFigureCanvases(this);
      }).catch(error => showHydrationError(this, error));
    }
  });
}

export function monsterFigureFieldMarkup(enemyId) {
  return `<${ELEMENT_NAME} data-enemy-id="${Number(enemyId)}"></${ELEMENT_NAME}>`;
}
