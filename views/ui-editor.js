// @editor-module 界面状态的取数、结构预览草稿与检视器
//
// 来源：拆分前 engine/editor/app.js 第 7234-7922 行。

import {ownerReferenceListMarkup, bindOwnerReferenceList, withCurrentOwnerRecord, currentOwnerReferenceImpact} from "../ui/owner-reference-impact.js";
import {esc} from "../core/dom.js";
import {fileUrl} from "../core/package-io.js";
import {currentTextRecordPlaceholder} from "../core/resource-index.js";
import {state} from "../core/state.js";
import {uiScreenTemplateBinding} from "../core/ui-template-bindings.js";
import {
  defineElementTreeTypes,
  ELEMENT_TREE_ICONS,
  ELEMENT_TREE_LABELS,
  elementTreeTypeLabel,
} from "../ui/element-tree.js";
import {uiConstructionModel} from "../modules/visual/ui-construction-preview.js";
import {
  uiEditorBuildStructuralDraft,
  uiEditorNoPreviewReason as uiPreviewNoPreviewReason,
  uiTemplateFrameDraft,
  uiTemplateLibrary,
} from "../views/ui-preview-fallback.js";

function uiEditorNoPreviewReason(screen) {
  return uiPreviewNoPreviewReason(screen, uiConstructionModel());
}

export function uiLayerTextRecordIds(layer) {
  const records = [];
  for (const call of layer?.record_calls || []) records.push(...uiLayerTextRecordIds(call));
  for (const record of [layer?.record, layer?.prefix_record])
    if (String(record || "").startsWith("record:")) records.push(record);
  for (const record of Object.values(layer?.provider_records || {})) {
    if (String(record).startsWith("record:")) records.push(record);
  }
  for (const pair of Object.values(layer?.provider_record_pairs || {})) {
    const region = Number(pair?.region);
    const record = Number(pair?.record);
    if (Number.isInteger(region) && Number.isInteger(record)) {
      records.push(`record:${region.toString(16).toUpperCase().padStart(2, "0")}:${String(record).padStart(3, "0")}`);
    }
  }
  if (String(layer?.runtime_record_pair || "").startsWith("record:")) {
    records.push(layer.runtime_record_pair);
  }
  return records;
}

function uiEditorDocument() {
  return state.project?.ui?.editor || {};
}

export function uiEditorNodeMap(document = uiEditorDocument()) {
  const nodes = document.nodes;
  if (!nodes || typeof nodes !== "object" || Array.isArray(nodes)) return new Map();
  return new Map(Object.entries(nodes));
}

function uiEditorScreenById(screenId, document = uiEditorDocument()) {
  // 公共窗口与界面模板都是合成条目，不在 document.screens 里，但要能像界面
  // 一样被选中、预览和检视——它们是可复用的父 UI，不是某个界面状态的附属。
  const template = uiEditorTemplateById(screenId);
  if (template) return uiEditorTemplateAsScreen(template);
  const commonFrame = uiEditorCommonFrameById(screenId, document);
  if (commonFrame) return uiEditorCommonFrameAsScreen(commonFrame);
  return (document.screens || []).find(screen => screen.id === screenId) || null;
}

function uiEditorTaxonomy(screen, key, fallback) {
  const value = screen?.[key] ?? screen?.metadata?.[key];
  if (value && typeof value === "object") {
    return {
      id: String(value.id || value.key || value.value || fallback),
      label: String(value.label || value.name || value.id || fallback),
    };
  }
  const id = String(value || fallback);
  const label = screen?.[`${key}_label`] || id;
  return {id, label: String(label)};
}

function uiEditorScreenKind(screen) {
  if (screen?.kind) return uiEditorTaxonomy(screen, "kind", "menu");
  const sourceKinds = new Set([
    ...(Array.isArray(screen?.source_kinds) ? screen.source_kinds : []),
    ...String(screen?.source_kind || "").split("+")
  ].filter(Boolean));
  // 合成条目：模板与公共窗口都是可复用父 UI，不是某个界面状态。
  if (sourceKinds.has("ui-template")) {
    return {id: "ui-template", label: "界面模板"};
  }
  if (sourceKinds.has("common-frame")) {
    return {id: "common-frame", label: "公共窗口"};
  }
  const isInterfaceState = screen?.state_ui_role === "screen";
  const reconstructed = sourceKinds.has("reconstructed-preview")
    || sourceKinds.has("reconstructed-menu");
  const runtime = sourceKinds.has("runtime-sample");
  const assetsOnly = sourceKinds.has("source-assets-only");
  if (isInterfaceState && runtime && reconstructed) {
    return {
      id: "interface-state+runtime-sample+reconstructed-preview",
      label: "界面状态 · 运行采样与资产重建",
    };
  }
  if (isInterfaceState && runtime) {
    return {id: "interface-state+runtime-sample", label: "界面状态 · 运行采样"};
  }
  if (isInterfaceState && reconstructed) {
    return {id: "interface-state+reconstructed-preview", label: "界面状态 · 资产重建"};
  }
  if (isInterfaceState && assetsOnly) {
    return {id: "interface-state+source-assets-only", label: "界面状态 · 仅资产关联"};
  }
  if (runtime) return {id: "runtime-sample", label: "运行采样"};
  if (reconstructed) return {id: "reconstructed-preview", label: "重建菜单"};
  if (assetsOnly) return {id: "source-assets-only", label: "仅资产关联"};
  if (isInterfaceState) return {id: "interface-state", label: "界面状态"};
  return {id: "menu", label: "菜单"};
}

function uiEditorScreenCategory(screen) {
  const entry = uiEditorTaxonomy(screen, "category", "uncategorized");
  const known = (state.project?.ui?.construction?.interfaces?.categories || [])
    .find(category => String(category.id) === entry.id);
  entry.label = known?.label || ({
    reconstructed: "重建菜单",
    "reconstructed-menu": "重建菜单",
    "runtime-ui": "运行界面",
    "ui-template": "窗口骨架",
    "common-frame": "共用窗口",
    uncategorized: "未分类",
  })[entry.id] || entry.label;
  return entry;
}

export function uiEditorRuntimePreview(screen) {
  const path = screen?.runtime_preview?.path;
  return typeof path === "string" && path ? path : null;
}

export function uiEditorPackagePreviewUrl(path) {
  if (!path) return null;
  if (/^(?:https?:|data:|\/)/.test(path)) return path;
  return fileUrl(path.startsWith("game/") ? path : `game/ui/${path}`);
}

function uiEditorScreenRepresentations(screen) {
  const modes = new Set();
  const sourceKinds = new Set([
    screen?.source_kind,
    ...(Array.isArray(screen?.source_kinds) ? screen.source_kinds : []),
  ].filter(Boolean));
  if (sourceKinds.has("reconstructed-preview")) modes.add("reconstructed");
  if (sourceKinds.has("runtime-sample")) modes.add("runtime");
  if (screen?.state_ui_role === "screen") modes.add("interface-state");
  return [...modes];
}

function uiEditorRepresentationLabel(mode) {
  return ({
    reconstructed: "资产重建",
    runtime: "运行画面",
    "interface-state": "界面状态",
  })[mode] || mode;
}

function uiEditorScreenRole(screen) {
  if (screen?.state_ui_role === "screen") return "interface-state";
  if (screen?.source_kind === "reconstructed-preview") return "reconstruction-evidence";
  if (screen?.source_kind === "runtime-sample") return "runtime-evidence";
  return "supporting-evidence";
}

// 界面状态的结构预览
//
// 「仅有源资产」的界面状态没有 source_preview_id。这里按证据强度分三级回退：
// 已登记布局直接画布局；非地图域的静态文字画成不带窗口的源记录预览；地图域
// 的静态文字才使用已确认的共用对话框。没有布局、静态字形或采集帧时不造图。
//
// 地图文字合成的是**结构预览**：用 ROM 里确认过的共用对话框布局
// （dialogue_runtime.common_layout_record，code-and-table-confirmed）铺窗口，
// 再把该状态引用的文本记录按阅读顺序放进正文光标位置。窗口与字形都来自
// ROM，位置是布局常量而非实测 cursor，因此只保证结构与内容正确，不声称
// 逐像素还原——UI 会以「结构预览」标注，与运行画面重建区分开。
function uiEditorStructuralDraft(screen, document) {
  return uiEditorBuildStructuralDraft(screen, document, uiConstructionModel());
}

// 公共窗口（组件库模型）
//
// 游戏里没有「UI 组件」这个概念——界面是某个事件/按键把窗口边框写进逻辑
// nametable，再往上叠动态元素。所以「哪些是公共的、哪些是这一屏私有的」在静态
// 提取阶段读不出来：ROM 里根本没有可读的引用关系。
//
// core/ui-components.js 在加载当前 layout 模型时求公共单元的闭包，再按
// 「提取出去能省多少格」贪心分解。列表和绘制入口消费同一份模型结果。
//
// 导出的组件是**一等 UI 条目**：
//
//   - 可以独立存在：窗口框本身就是一个可查看、可引用的 UI；
//   - 可以作为父 UI：商店、过场对话等整体布局几乎不变，变的只是嵌进来的
//     文本内容。子界面挂在公共窗口下，两边互相可跳转。
//
// 输入是已发布的 layout 记录；这里不从整帧采样中推测窗口或场景的边界。

export const COMMON_FRAME_PREFIX = "ui-screen:common:";

// 每条 layout 记录 → 引用它的界面集合。
//
// layout 节点本身没有 screen_id，归属只能从各界面的节点树自顶向下遍历得出。
function uiEditorLayoutUsage(document) {
  const nodes = uiEditorNodeMap(document);
  const usage = new Map();
  for (const screen of document?.screens || []) {
    if (!screen.root_node) continue;
    const seen = new Set();
    const stack = [screen.root_node];
    while (stack.length) {
      const id = stack.pop();
      if (seen.has(id)) continue;
      seen.add(id);
      const node = nodes.get(id);
      if (!node) continue;
      const record = node.type === "layout" ? node.properties?.record : null;
      if (record) {
        if (!usage.has(record)) usage.set(record, new Set());
        usage.get(record).add(screen.id);
      }
      for (const child of node.children || []) stack.push(child);
    }
  }
  return usage;
}

function uiEditorCommonFrames(document) {
  const library = uiConstructionModel().components_data?.components || [];
  if (!library.length) return [];

  const usage = uiEditorLayoutUsage(document);
  const screensById = new Map((document?.screens || []).map(item => [item.id, item]));
  return library.map(component => {
    // 组件横跨多条记录，用它的界面 = 引用了任一成员记录的界面。
    const screens = new Set();
    for (const member of component.members || []) {
      for (const screenId of usage.get(member) || []) screens.add(screenId);
    }
    const bounds = component.bounds || {};
    return {
      id: `${COMMON_FRAME_PREFIX}${component.id}`,
      component: component.id,
      members: component.members || [],
      memberCount: component.member_count || (component.members || []).length,
      users: [...screens].map(id => screensById.get(id)).filter(Boolean),
      userCount: screens.size,
      tileWrites: component.shared_cells || 0,
      savedCells: component.saved_cells || 0,
      rowSpan: Number.isInteger(bounds.first_row)
        ? [bounds.first_row, bounds.last_row] : null,
    };
  });
}

function uiEditorCommonFrameById(id, document) {
  if (!String(id || "").startsWith(COMMON_FRAME_PREFIX)) return null;
  return uiEditorCommonFrames(document).find(frame => frame.id === id) || null;
}

// 把公共窗口伪装成 screen，让它能走同一套选中 / 预览 / 检视器流程。
function uiEditorCommonFrameAsScreen(frame) {
  const span = frame.rowSpan
    ? `第 ${frame.rowSpan[0]}–${frame.rowSpan[1]} 行` : "";
  return {
    id: frame.id,
    label: `公共窗口 ${frame.component}`,
    category: "common-frame",
    domain: "ui",
    source_kind: "common-frame",
    source_kinds: ["common-frame"],
    root_node: null,
    viewport: {x: 0, y: 0, width: 256, height: 240},
    state_ui_role: "screen",
    commonFrame: frame,
    coverage: {
      status: "common-frame",
      composition: "derived-shared-window",
      note: span,
    },
  };
}

// 某个界面引用了哪些公共窗口（它的父 UI）。
function uiEditorParentCommonFrames(screenId, document) {
  return uiEditorCommonFrames(document)
    .filter(frame => frame.users.some(user => user.id === screenId));
}

// 公共窗口的预览草稿：只有一层导出图块，天然不含场景。
export function uiEditorCommonFrameDraft(componentOrId) {
  const id = String(componentOrId || "").startsWith(COMMON_FRAME_PREFIX)
    ? String(componentOrId).slice(COMMON_FRAME_PREFIX.length)
    : componentOrId;
  const library = uiConstructionModel().components_data?.components || [];
  if (!library.some(item => item.id === id)) return null;
  return {
    id: `common:${id}`,
    kind: "common-frame",
    viewport: {x: 0, y: 0, width: 256, height: 240},
    layers: [{kind: "layout", record: id}],
    commonFrame: true,
  };
}

// 界面模板（模板库模型）
//
// 一个界面 = 窗口骨架 + 这一次的内容。骨架由 UI 代码写进逻辑 nametable，内容
// 来自运行期数据提供器和该状态自己的文本记录；ROM 里同样没有「模板」这个概念，
// 因此拆分在构建期完成（engine/tools/rom_assets/ui/templates.py），前端只消费结论。
//
// 模板是**一等 UI 条目**：骨架不依赖任何运行状态，可以单独绘制出「不带文字
// 内容」的窗口；同族里没有自己预览的状态则复用骨架，再把自有记录填进已登记
// 的槽位，而不是借用别处的采样文字。
export const UI_TEMPLATE_PREFIX = "ui-template:";

// 绑定依据由构建期给出；这里只负责把它译成一句话，不重新判断强弱。
function uiEditorTemplateBasisLabel(basis) {
  return ({
    declared: "构造器归属已确认",
    "shared-layout-record": "共用主窗口记录",
    "evidence-shape": "按自有记录类别推定",
    "category-layout-evidence": "同分类界面族的主窗口记录",
  })[basis] || String(basis || "");
}

function uiEditorTemplates() {
  return (uiTemplateLibrary(uiConstructionModel())?.templates || [])
    .filter(template => template.reusable !== false);
}

function uiEditorTemplateById(id) {
  if (!String(id || "").startsWith(UI_TEMPLATE_PREFIX)) return null;
  return uiEditorTemplates().find(template => template.id === id) || null;
}

// 把模板伪装成 screen，让它走同一套选中 / 预览 / 检视器流程。
function uiEditorTemplateAsScreen(template) {
  return {
    id: template.id,
    label: `界面模板 ${template.label}`,
    category: "ui-template",
    domain: "ui",
    source_kind: "ui-template",
    source_kinds: ["ui-template"],
    root_node: null,
    viewport: template.viewport || {x: 0, y: 0, width: 256, height: 240},
    state_ui_role: "screen",
    uiTemplate: template,
    coverage: {
      status: "ui-template",
      composition: "derived-window-skeleton",
      note: `${template.frame_layers.length} 个骨架层`,
    },
  };
}

export function uiEditorTemplateDraft(id) {
  return uiTemplateFrameDraft(uiConstructionModel(), id);
}

// 某个界面状态复用了哪套模板（它的父 UI）。
export function uiEditorStateTemplateBinding(screen) {
  const stateId = screen?.interface_state_id;
  if (!stateId) return null;
  const library = uiTemplateLibrary(uiConstructionModel());
  const binding = uiScreenTemplateBinding(library, screen);
  if (!binding) return null;
  const template = (library?.templates || [])
    .find(item => item.id === binding.template);
  return template ? {binding, template} : null;
}

export function uiEditorPreviewDraft(screenId) {
  const document = uiEditorDocument();
  const screen = uiEditorScreenById(screenId, document);
  if (!screen) return null;
  const model = uiConstructionModel();
  const previewId = screen.source_preview_id
    || screen.visual_preview?.source_preview_id
    || screen.visual_preview?.source_preview_ids?.[0]
    || screen.reconstructed_preview_ids?.[0]
    || screen.id;
  const preview = model.menu_dispatch_data?.previews?.find(
    item => item.id === previewId
  );
  // 没有已登记预览的界面状态：退回结构预览（见 uiEditorStructuralDraft）。
  if (!preview) return uiEditorStructuralDraft(screen, document);
  const composition = preview.composition
    ? model.compositions?.compositions?.find(item => item.id === preview.composition)
    : null;
  const sourceLayers = composition?.layers || preview.layers || [];
  return {...preview, composition: null, layers: sourceLayers};
}

function uiEditorSourceStatus(node) {
  const source = node?.source || {};
  const unresolved = source.status === "unresolved"
    || node?.coverage?.status === "unresolved";
  if (unresolved) return {id: "unresolved", label: "来源待解析"};
  if (String(source.kind || "").includes("runtime")) {
    return {id: "context", label: "运行采样上下文"};
  }
  if (
    source.record || source.resource_uid || source.source_path
    || source.file_offset != null || source.prg_offset != null
  ) {
    return {id: "linked", label: "资产来源已关联"};
  }
  return {id: "context", label: "运行时与组合上下文"};
}

const UI_ELEMENT_TREE_TYPES = defineElementTreeTypes({
  screen: {icon: ELEMENT_TREE_ICONS.group, label: ELEMENT_TREE_LABELS.interface},
  backdrop: {
    icon: ELEMENT_TREE_ICONS.layer,
    label: ELEMENT_TREE_LABELS.previewBackdrop,
  },
  layout: {icon: ELEMENT_TREE_ICONS.layout, label: ELEMENT_TREE_LABELS.layout},
  text: {icon: ELEMENT_TREE_ICONS.text, label: ELEMENT_TREE_LABELS.writing},
  options: {icon: ELEMENT_TREE_ICONS.list, label: ELEMENT_TREE_LABELS.options},
  option: {icon: ELEMENT_TREE_ICONS.item, label: ELEMENT_TREE_LABELS.option},
  action: {icon: ELEMENT_TREE_ICONS.action, label: ELEMENT_TREE_LABELS.action},
  overlay: {icon: ELEMENT_TREE_ICONS.overlay, label: ELEMENT_TREE_LABELS.overlay},
  component: {
    icon: ELEMENT_TREE_ICONS.component,
    label: ELEMENT_TREE_LABELS.component,
  },
  "runtime-preview": {
    icon: ELEMENT_TREE_ICONS.preview,
    label: ELEMENT_TREE_LABELS.runtimePreview,
  },
});

function uiEditorSourcePanel(node) {
  const source = node?.source || {};
  const record = source.record || node?.properties?.record;
  const status = uiEditorSourceStatus(node);
  return `<div class="ui-editor-status ${esc(status.id)}"><b>${esc(status.label)}</b><span>${esc(source.kind || (record ? "界面脚本与布局记录" : "界面组合节点"))}</span></div>
    <div class="ui-editor-source"><small>权威来源</small>${record
      ? `<code>${esc(record)}</code>`
      : source.source_path
        ? String(source.source_path).toLowerCase().endsWith(".bin")
          ? `<code title="构建二进制不在编辑阶段打开">${esc(source.source_path)}</code>`
          : `<a href="${fileUrl(source.source_path)}" target="_blank">${esc(source.source_path)} ↗</a>`
        : `<span>运行时组合与工作台上下文</span>`}</div>`;
}

function uiEditorInspector(node, screen, document) {
  // 模板与公共窗口是合成条目，没有节点树；它们的检视器先于「选择一个节点」
  // 的空态判定，否则选中后右栏永远是空的。
  if (screen?.uiTemplate && (!node || node.type === "screen" || !node.type)) {
    const template = screen.uiTemplate;
    const slots = template.content_slots || [];
    const fillable = slots.filter(slot => slot.fillable);
    return `<p class="eyebrow">界面模板 · 可复用窗口骨架</p><h2>${esc(template.label)}</h2>
      <p>${esc(template.id)}</p>
      <dl class="ui-editor-fact-grid">
        <div><dt>骨架层</dt><dd>${template.frame_layers.length}</dd></div>
        <div><dt>内容槽位</dt><dd>${fillable.length}</dd></div>
        <div><dt>复用状态</dt><dd>${template.bound_states.length}</dd></div>
        <div><dt>来源</dt><dd>${esc(template.source?.preview || template.source?.id || template.source?.kind || "—")}</dd></div>
      </dl>
      <div class="section-line"><h2>骨架层 · 只依赖 ROM</h2><span>${template.frame_layers.length}</span></div>
      <div class="ui-editor-common-users">${template.frame_layers.map(layer => `<code>${esc(layer.kind)} ${esc(layer.record || layer.asset_id || "")}</code>`).join("")}</div>
      <div class="section-line"><h2>内容槽位 · 由各状态自有记录填充</h2><span>${fillable.length}</span></div>
      <div class="ui-editor-common-users">${fillable.length
        ? fillable.map(slot => `<code>${esc(slot.id)} · ${esc(slot.role)} · cursor ${Number(slot.cursor || 0)}</code>`).join("")
        : ``}</div>
      ${ownerReferenceListMarkup("复用本模板的界面状态", `data-ui-template-users="${esc(template.id)}"`)}
      `;
  }
  if (screen?.commonFrame && (!node || node.type === "screen" || !node.type)) {
    const frame = screen.commonFrame;
    return `<p class="eyebrow">公共窗口 · 可复用父界面</p><h2>${esc(frame.component)}</h2>
      <p>${esc(frame.id)}</p>
      <dl class="ui-editor-fact-grid">
        <div><dt>共有图块</dt><dd>${frame.tileWrites}</dd></div>
        <div><dt>共用记录</dt><dd>${frame.memberCount} 条</dd></div>
        <div><dt>省去重复</dt><dd>${frame.savedCells} 格</dd></div>
        <div><dt>占用行</dt><dd>${frame.rowSpan ? `${frame.rowSpan[0]}–${frame.rowSpan[1]}` : "—"}</dd></div>
      </dl>
      <div class="section-line"><h2>共用本窗口的布局记录</h2><span>${frame.memberCount}</span></div>
      <div class="ui-editor-common-users">${frame.members.map(member => `<code>${esc(member)}</code>`).join("")}</div>
      ${ownerReferenceListMarkup("嵌入本窗口的界面", `data-ui-common-frame-users="${esc(frame.id)}"`)}
      `;
  }
  if (!node) return `<div class="ui-editor-empty"><b>选择一个界面节点</b></div>`;
  const properties = node.properties || {};
  const source = node.source || {};
  if (node.type === "screen") {
    const kind = uiEditorScreenKind(screen);
    const category = uiEditorScreenCategory(screen);
    const representations = uiEditorScreenRepresentations(screen);
    const runtimePreview = uiEditorRuntimePreview(screen);
    const role = uiEditorScreenRole(screen);
    const roleLabel = ({
      "interface-state": "界面状态 · ui_role=screen",
      "reconstruction-evidence": "重建证据",
      "runtime-evidence": "运行证据",
      "supporting-evidence": "辅助证据",
    })[role];
    return `<p class="eyebrow">${esc(roleLabel)}</p><h2>${esc(screen.label)}</h2>
      <p>${esc(screen.id)}</p><div class="ui-editor-screen-badges"><span>${esc(kind.label)}</span><span>${esc(category.label)}</span>${representations.map(mode => `<span data-ui-representation="${esc(mode)}">${esc(uiEditorRepresentationLabel(mode))}</span>`).join("")}</div><dl class="ui-editor-fact-grid">
        <div><dt>宽</dt><dd>${Number(screen.viewport?.width || 256)}</dd></div>
        <div><dt>高</dt><dd>${Number(screen.viewport?.height || 240)}</dd></div>
        <div><dt>命令路径</dt><dd>${esc((screen.command_path || []).map(value => `0x${Number(value).toString(16).toUpperCase().padStart(2, "0")}`).join(" → ") || "构造器入口")}</dd></div>
      </dl>${(() => {
        const bound = uiEditorStateTemplateBinding(screen);
        if (!bound) return "";
        const {binding, template} = bound;
        const basisLabel = uiEditorTemplateBasisLabel(binding.basis);
        return `<div class="section-line"><h2>所用界面模板</h2><span>${binding.confidence === "confirmed" ? "已确认" : "推定"}</span></div>
          <div class="ui-editor-common-users"><button type="button" class="ui-editor-common-user" data-ui-editor-screen="${esc(template.id)}">
            <b>${esc(template.label)}</b><small>${esc(basisLabel)} · ${binding.fills.length} 个槽位由本状态填充</small>
          </button></div>
          `;
      })()}${(() => {
        const parents = uiEditorParentCommonFrames(screen.id, document);
        return parents.length ? `<div class="section-line"><h2>父公共窗口</h2><span>${parents.length}</span></div>
          <div class="ui-editor-common-users">${parents.map(frame => `<button type="button" class="ui-editor-common-user" data-ui-editor-screen="${esc(frame.id)}">
            <b>${esc(frame.component)}</b><small>${frame.tileWrites} 格 · ${frame.memberCount} 条记录共用</small>
          </button>`).join("")}</div>` : "";
      })()}${runtimePreview ? `<figure class="ui-editor-inspector-shot">
        <img src="${esc(uiEditorPackagePreviewUrl(runtimePreview))}" alt="${esc(screen?.label || "")}运行截图" loading="lazy" decoding="async">
        <figcaption>模拟器运行截图 · 对照证据</figcaption>
      </figure>` : ""}${uiEditorSourcePanel(node)}`;
  }
  if (["layout", "text", "overlay"].includes(node.type)) {
    const numericFields = ["cursor", "shift", "anchor_x", "anchor_y"]
      .filter(field => properties[field] !== undefined || properties.transform?.[field] !== undefined);
    const record = source.record || properties.record;
    const glyphText = (properties.glyph_slots || [])
      .map(slot => slot.unicode || "□").join("");
    return `<p class="eyebrow">${esc(elementTreeTypeLabel(UI_ELEMENT_TREE_TYPES, node.type))}</p><h2>${esc(node.label)}</h2>
      <dl class="ui-editor-fact-grid">
        ${numericFields.map(field => `<div><dt>${esc(field)} · 原始值</dt><dd>${Number(properties[field] ?? properties.transform?.[field] ?? 0)}</dd></div>`).join("")}
        <div><dt>图层类型</dt><dd>${esc(properties.kind || node.type)}</dd></div>
      </dl>
      ${node.type === "text" && record ? `<section class="ui-editor-text-block"><div class="section-line"><h3>文字与动态值</h3><span>${esc(record)}</span></div>
        ${currentTextRecordPlaceholder(uiLayerTextRecordIds(properties), "该层只含动态提供器或尚未映射的图块")}
        ${properties.glyph_slots?.length ? `<div class="ui-editor-glyph-summary"><b>${esc(glyphText)}</b><span>${properties.glyph_slots.length} 个已确认的 12×12 中文字符槽</span></div>` : ``}
        <div class="ui-editor-provider-list">${Object.entries({
          ...properties.provider_values,
          ...properties.provider_records,
          ...properties.provider_scripts,
          ...properties.providers?.provider_values,
          ...properties.providers?.provider_records,
          ...properties.providers?.provider_scripts,
        }).map(([id, value]) => `<span><b>#${esc(id)}</b>${esc(value)}</span>`).join("") || ``}</div>
      </section>` : ""}
      ${uiEditorSourcePanel(node)}`;
  }
  if (node.type === "options") {
    return `<p class="eyebrow">选项列表</p><h2>${esc(node.label)}</h2>
      <div class="ui-editor-option-list">${(node.children || []).map(id => {
        const option = document.nodes?.[id];
        if (!option) return "";
        const action = option.children?.length
          ? document.nodes?.[option.children[0]]
          : null;
        const rawCommand = option.properties?.command;
        const command = rawCommand === null || rawCommand === undefined
          ? Number.NaN : Number(rawCommand);
        const targetId = option.properties?.target_screen_id
          || action?.properties?.target_screen_id;
        const commandLabel = Number.isFinite(command)
          ? `0x${command.toString(16).toUpperCase().padStart(2, "0")}`
          : "行为";
        return `<div class="ui-editor-option-with-address">
          <button type="button" class="ui-editor-option" data-ui-editor-node="${esc(option.id)}"><b>${esc(option.label)}</b><span>${commandLabel}</span><small>${esc(targetId || "处理器或返回路径待解析")}</small></button>
        </div>`;
      }).join("")}</div>${uiEditorSourcePanel(node)}`;
  }
  if (node.type === "option" || node.type === "action") {
    const command = properties.command === null || properties.command === undefined
      ? Number.NaN : Number(properties.command);
    const action = node.type === "option" && node.children?.length
      ? document.nodes?.[node.children[0]]
      : null;
    const targetId = properties.target_screen_id
      || action?.properties?.target_screen_id;
    const target = targetId ? uiEditorScreenById(targetId, document) : null;
    return `<p class="eyebrow">${esc(elementTreeTypeLabel(UI_ELEMENT_TREE_TYPES, node.type))}</p><h2>${esc(node.label)}</h2>
      <dl class="ui-editor-action-facts"><div><dt>选项索引</dt><dd>${properties.index ?? "—"}</dd></div><div><dt>命令</dt><dd>${Number.isFinite(command) ? `0x${command.toString(16).toUpperCase().padStart(2, "0")}` : "—"}</dd></div><div><dt>目标</dt><dd>${esc(target?.label || targetId || "仅处理函数已定位")}</dd></div></dl>
      ${target ? `<button type="button" class="button primary" data-ui-editor-screen="${esc(target.id)}" title="子菜单" aria-label="子菜单">↗</button>` : ""}
      ${uiEditorSourcePanel(node)}`;
  }
  return `<p class="eyebrow">${esc(elementTreeTypeLabel(UI_ELEMENT_TREE_TYPES, node.type))}</p><h2>${esc(node.label || node.id)}</h2>${uiEditorSourcePanel(node)}`;
}

export function bindUiEditorReferenceLists(root = window.document) {
  root.querySelectorAll('[data-ui-template-users], [data-ui-common-frame-users]').forEach(host =>
    bindOwnerReferenceList(host, () => {
      const document = uiEditorDocument();
      const record = host.dataset.uiTemplateUsers
        ? {kind: 'ui-template', id: host.dataset.uiTemplateUsers}
        : {kind: 'ui-common-frame', frame: uiEditorCommonFrameById(host.dataset.uiCommonFrameUsers, document)};
      const users = withCurrentOwnerRecord(record, {document, library: uiTemplateLibrary(uiConstructionModel())},
        () => currentOwnerReferenceImpact());
      return `<div class="ui-editor-common-users">${users.map(user => `<button type="button" class="ui-editor-common-user" data-ui-editor-screen="${esc(user.id)}">
        <b>${esc(user.label)}</b><small>${esc(user.interface_state_id || user.category || '')}</small>
      </button>`).join('')}</div>`;
    }));
}
