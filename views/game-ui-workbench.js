// @editor-module 游戏内整屏 UI 的共用三栏编辑现场
//
// 各业务页只登记语义组件、权威 preview 和少量运行预览控件。元素树、NES 舞台、
// 检查器、缩放以及 text-record / fixed-tile 保存链只在这里实现一次。

import {esc} from "../core/dom.js";
import {handleTextMarkup} from '../ui/handle.js';
import {eventFlagTextMarkup} from '../modules/save/event-flags.js';
import {state} from "../core/state.js";
import {currentTextReferenceLink} from "../core/resource-index.js";
import {textRecordComponents} from "../core/text-record-project.js";
import {uiTextComponentLabel} from '../core/ui-component-labels.js';
import {
  ELEMENT_TREE_ICONS,
  ELEMENT_TREE_LABELS,
  defineElementTreeTypes,
  elementTree,
  rerenderElementTreeKeepingSelectionVisible,
} from "../ui/element-tree.js";
import {fixedTextEditorMarkup} from "../ui/fixed-text-editor.js";
import {fixedTileEditorMarkup} from "../ui/fixed-tile-editor.js";
import {
  bindScreenWorkbenchZoom,
  screenWorkbench,
  screenWorkbenchCanvasStage,
} from "../ui/screen-workbench.js";
import {bindUiComponentEditors} from "./ui-component-editors.js";
import {textRecordStructureEditorMarkup} from '../ui/text-record-structure-editor.js';
import {interfacePreviewSceneMarkup, bindInterfacePreviewScene} from '../ui/interface-preview-scene.js';
import {bindScenePreview} from '../modules/scene/preview.js';
import {interfaceStateWorkbench} from '../ui/interface-state-workbench.js';

const selectedByNamespace = new Map();
const zoomByNamespace = new Map();

const GAME_UI_TREE_TYPES = defineElementTreeTypes({
  screen: {icon: ELEMENT_TREE_ICONS.group, label: ELEMENT_TREE_LABELS.screen},
  group: {icon: ELEMENT_TREE_ICONS.group, label: ELEMENT_TREE_LABELS.component},
  layout: {icon: ELEMENT_TREE_ICONS.layout, label: ELEMENT_TREE_LABELS.layout},
  text: {icon: ELEMENT_TREE_ICONS.text, label: ELEMENT_TREE_LABELS.text},
  dynamic: {icon: ELEMENT_TREE_ICONS.text, label: "动态内容"},
  object: {icon: ELEMENT_TREE_ICONS.actor, label: "场景物体"},
  image: {icon: ELEMENT_TREE_ICONS.layer, label: ELEMENT_TREE_LABELS.image},
  state: {icon: ELEMENT_TREE_ICONS.preview, label: "界面状态"},
  button: {icon: ELEMENT_TREE_ICONS.component, label: "按钮"},
});

/** 界面文本组件引用文本字段对象的分词范围，原节点保留整条记录与操作。 */
export function gameUiWorkbenchNodes(nodes, preview = null) {
  return (Array.isArray(nodes) ? nodes.filter(node => node?.id) : []).flatMap(node => {
    const recordId = node.recordId || node.selection?.record_id;
    const document_ = state.project?.text_record_edits;
    const record = document_?.records?.[recordId];
    const encoding = state.project?.text_record_encoding;
    if (!record || !encoding || node.textComponents || node.editors || node.editorType === 'tile') return [node];
    const components = textRecordComponents(record, encoding, document_, node.ranges || node.selection?.ranges);
    if (components.length < 2) return [node];
    return [{...node, kind: 'group', textComponents: true},
      ...components.map((component, index) => {
        const label = uiTextComponentLabel(record, component, preview);
        return {...node,
          id: `${node.id}:component:${index}`, kind: component.kind, textComponents: true,
          label,
          depth: (node.depth || 0) + 1, editorId: `${node.editorId || node.id}:component:${index}`,
          editorLabel: label, ranges: component.ranges,
          selection: {record_id: recordId, ranges: component.ranges},
          ...(node.inspectorMarkup ? {inspectorMarkup: `<div class="screen-workbench-inspector-body"><p>${esc(component.text)}</p>${
            currentTextReferenceLink(recordId)}</div>${node.controlsMarkup || ''}`} : {}),
        };
      })];
  });
}

/** Return the stable selected semantic node, falling back to the screen root. */
export function selectedGameUiWorkbenchNode(namespace, nodes) {
  const available = gameUiWorkbenchNodes(nodes);
  const selectedId = selectedByNamespace.get(String(namespace));
  const selected = available.find(node => node.id === selectedId)
    || available[0] || null;
  if (selected) selectedByNamespace.set(String(namespace), selected.id);
  return selected;
}

/** Select a semantic node before rendering (for deep links and flow previews). */
export function selectGameUiWorkbenchNode(namespace, nodeId) {
  const key = String(namespace);
  if (nodeId) selectedByNamespace.set(key, String(nodeId));
  else selectedByNamespace.delete(key);
}

/** Selection consumed by the canonical UI painter (record ranges or bounds). */
export function gameUiWorkbenchPreviewSelection(namespace, nodes) {
  return selectedGameUiWorkbenchNode(namespace, nodes)?.selection || null;
}

export function gameUiStateComponents(namespace, nodes) {
  const current = () => gameUiWorkbenchNodes(nodes());
  return {
    current,
    selected: () => selectedGameUiWorkbenchNode(namespace, nodes())?.id || null,
    select: id => selectGameUiWorkbenchNode(namespace, id),
    fields: id => {
      const node = current().find(row => row.id === id);
      const recordId = node?.recordId || node?.selection?.record_id;
      const editors = node?.editors || (recordId ? [{recordId, ranges: node.ranges || node.selection?.ranges}] : []);
      return editors.map(editor => ({resourceId: 'text-record', handle: editor.recordId,
        field: null, ranges: editor.ranges || null}));
    },
    mount: (detail, id, bindings = {}) => {
      const node = current().find(row => row.id === id);
      if (!node) return null;
      updateInspectorDetail(detail, node);
      return bindUiComponentEditors(detail, bindings);
    },
  };
}

function editorMarkup(editor, node) {
  if (editor?.type === "tile") {
    return fixedTileEditorMarkup({
      recordId: editor.recordId,
      editorId: editor.editorId || `${node.id}:tile`,
      ranges: editor.ranges,
      label: editor.label || node.label,
      description: "",
    });
  }
  return fixedTextEditorMarkup({
    recordId: editor.recordId,
    editorId: editor.editorId || `${node.id}:text`,
    mode: editor.mode ?? node.editorMode,
    ranges: editor.ranges ?? null,
    label: editor.label || node.label,
    description: "",
  });
}

function factsMarkup(facts) {
  if (!Array.isArray(facts) || !facts.length) return "";
  return `<dl class="screen-workbench-facts">${facts.map(fact => `<div>
    <dt>${esc(fact?.label || "")}</dt>
    <dd${fact?.mono ? ` class="mono"` : ""}${fact?.handle ? ` data-resource-handle="${esc(fact.handle)}" title="${esc(fact.handle)}"` : ''}>${String(fact?.value).includes('global-event-flag:')
      ? eventFlagTextMarkup(fact.value, {label: fact.referenceLabel}) : handleTextMarkup(fact?.value ?? "—")}</dd>
  </div>`).join("")}</dl>`;
}

function defaultInspectorMarkup(node) {
  if (!node) return `<div class="screen-workbench-inspector-body">
  </div>`;
  const editors = Array.isArray(node.editors) ? node.editors
    : node.recordId ? [{
        type: node.editorType || "text",
        recordId: node.recordId,
        editorId: node.editorId,
        ranges: node.ranges,
        label: node.editorLabel,
        description: node.description,
      }] : [];
  return `<div class="screen-workbench-inspector-body">
    ${factsMarkup(node.facts)}
    ${node.controlsMarkup || ""}
    ${editors.map(editor => editorMarkup(editor, node)).join("")}
  </div>`;
}

function inspectorDetailMarkup(node, {inspectorMarkup = null, textOnlyTree = true} = {}) {
  const markup = typeof inspectorMarkup === 'function'
    ? inspectorMarkup(node) : node?.inspectorMarkup ?? defaultInspectorMarkup(node);
  const structureRecord = node?.recordId || node?.selection?.record_id || node?.sourceRecord
    || node?.facts?.find(fact => fact.label === '布局记录')?.value;
  return `${markup}${node?.structureRecord === false ? '' : textRecordStructureEditorMarkup(structureRecord)}${textOnlyTree && node?.href
    ? `<p><a class="editor-inline-link" href="${esc(node.href)}">${esc(node.label)} ↗</a></p>` : ''}`;
}

function updateInspectorDetail(detail, node) {
  const template = document.createElement('template');
  template.innerHTML = inspectorDetailMarkup(node);
  const mounted = new Map([...detail.querySelectorAll('[data-text-record-structure]')]
    .map(host => [host.dataset.textRecordStructure, host]));
  const retained = new Map();
  for (const host of template.content.querySelectorAll('[data-text-record-structure]')) {
    const previous = mounted.get(host.dataset.textRecordStructure);
    if (!previous) continue;
    const container = '.text-record-structure-reference';
    retained.set(host.closest(container) || host, previous.closest(container) || previous);
  }
  const children = [...template.content.childNodes].map(node => retained.get(node) || node);
  for (const child of [...detail.childNodes]) if (!children.includes(child)) child.remove();
  let next = detail.firstChild;
  for (const child of children) {
    if (child === next) next = next.nextSibling;
    else detail.insertBefore(child, next);
  }
}

/** Render one canonical NES UI screen in the same workbench used by boot/status UI. */
export function renderGameUiWorkbench({
  namespace,
  id = "",
  className = "",
  heightMode = 'page',
  nodes = [],
  canvasMarkup = "",
  domainMarkup = "",
  toolbarMarkup = "",
  pageToolbarMarkup = "",
  toolbarInStage = false,
  stageToolbarMarkup = '',
  footerBadge = "通用 UI 资源",
  footerText = "画布直接引用游戏界面的权威构造资源。",
  treeTitle = "UI 树",
  inspectorMarkup = null,
  bottomMarkup = "",
  bottomSize = 'content',
  bottomFit = false,
  treeExtraMarkup = "",
  inspectorExtraMarkup = "",
  inspectorExtraHidden = false,
  textOnlyTree = true,
} = {}) {
  const available = gameUiWorkbenchNodes(nodes);
  const selected = selectedGameUiWorkbenchNode(namespace, available);
  const selectedInspectorMarkup = inspectorDetailMarkup(selected, {inspectorMarkup, textOnlyTree});
  const tree = elementTree({
    nodes: available.map(node => ({...node, hoverDetail: node.detail, detail: "",
      ...(textOnlyTree ? {labelMarkup: esc(node.label), detailMarkup: ""} : {})})),
    types: GAME_UI_TREE_TYPES,
    showIcons: !textOnlyTree,
    selectedId: selected?.id || null,
    buttonAttributes: node => ({
      "data-game-ui-workbench-node": node.id,
      title: textOnlyTree ? node.label : node.hoverDetail || "",
    }),
    afterNode: node => !textOnlyTree && node.href ? `<a class="editor-inline-link" href="${esc(node.href)}"
      aria-label="${esc(node.label)}入口">↗</a>` : "",
  });
  if (canvasMarkup) stageToolbarMarkup += interfacePreviewSceneMarkup();
  const stage = domainMarkup || (canvasMarkup || toolbarInStage && toolbarMarkup || stageToolbarMarkup ? screenWorkbenchCanvasStage({
    namespace,
    canvasMarkup,
    toolbarMarkup,
    footerMarkup: "",
  }) : "");
  return screenWorkbench({
    namespace,
    toolbarMarkup: pageToolbarMarkup,
    id,
    heightMode,
    className: `game-ui-component-workbench${className ? ` ${esc(className)}` : ""}`,
    treeTitle,
    treeMarkup: `${tree}${textOnlyTree ? "" : treeExtraMarkup}${stage || textOnlyTree ? "" : toolbarMarkup}`,
    stageMarkup: stage,
    stageToolbarMarkup,
    inspectorTitle: selected?.label || "属性",
    inspectorMarkup: `<div data-game-ui-inspector-detail>${selectedInspectorMarkup}</div><div data-game-ui-inspector-extra${inspectorExtraHidden ? ' hidden' : ''}>${inspectorExtraMarkup}${textOnlyTree ? treeExtraMarkup : ""}${!stage && textOnlyTree ? toolbarMarkup : ""}</div>`,
    inspectorClassName: "game-ui-component-inspector",
    bottomMarkup,
    bottomSize,
    bottomFit,
  });
}

/** Bind selection, zoom and shared component persistence for one workbench. */
export function bindGameUiWorkbench({
  namespace,
  nodes = [],
  rerender = async () => {},
  repaint = () => {},
  onSelect = () => {},
  fixedTiles = false,
  root = document,
  updateInspectorOnSelection = true,
  bindInspector = () => {},
  selectPreview = repaint,
} = {}) {
  const workbench = root?.querySelector?.(
    `[data-screen-workbench="${CSS.escape(String(namespace || ""))}"]`,
  );
  if (!workbench) return null;
  void bindInterfacePreviewScene(workbench, {rerender});
  bindScreenWorkbenchZoom({
    namespace,
    bindViewport: bindScenePreview,
    canPan: () => true,
    zoom: zoomByNamespace.get(String(namespace)) || "fit",
    onChange: value => zoomByNamespace.set(String(namespace), value),
    root,
  });
  const available = gameUiWorkbenchNodes(nodes);
  const bindEditors = host => host.querySelector("[data-fixed-text-editor], [data-fixed-tile-editor], [data-text-record-structure]")
    ? bindUiComponentEditors(host, {fixedTiles, repaint, rerender}) : null;
  const buttons = [...workbench.querySelectorAll('[data-game-ui-workbench-node]')];
  const tree = workbench.querySelector('.element-tree');
  let inspectorProjection = '';
  let inspectorControlsProjection = '';
  const controlsProjection = node => JSON.stringify([node?.id, node?.editors, node?.selection,
    node?.controlsMarkup, node?.recordId, node?.ranges, node?.inspectorMarkup]);
  const detailProjection = node => JSON.stringify([controlsProjection(node), node?.facts]);
  const select = (button, force = false) => {
    const id = button.dataset.gameUiWorkbenchNode;
    if (!id || !force && selectedByNamespace.get(String(namespace)) === id) return;
    const node = available.find(item => item.id === id) || null;
    const host = interfaceStateWorkbench(workbench) || interfaceStateWorkbench(workbench.closest('[data-state-machine-source]'));
    if (host) host.selectComponent(id);
    else selectedByNamespace.set(String(namespace), id);
    onSelect(node);
    if (updateInspectorOnSelection) {
      const inspector = workbench.querySelector('.workspace-inspector');
      if (inspector) {
        const {scrollTop, scrollLeft} = inspector;
        inspector.querySelector('h3').textContent = node?.label || '属性';
        const detail = inspector.querySelector('[data-game-ui-inspector-detail]');
        updateInspectorDetail(detail, node);
        inspectorControlsProjection = controlsProjection(node);
        inspectorProjection = detailProjection(node);
        inspector.querySelector('[data-game-ui-inspector-extra]').hidden = node?.kind !== 'screen';
        bindEditors(detail);
        bindInspector(detail, node);
        inspector.scrollTop = scrollTop;
        inspector.scrollLeft = scrollLeft;
      }
      workbench.querySelectorAll('[data-game-ui-workbench-node]').forEach(item =>
        item.closest('.element-tree-node')?.classList.toggle('is-selected', item === button));
      selectPreview(node);
    } else void rerenderElementTreeKeepingSelectionVisible(button, rerender);
  };
  buttons.forEach(button => button.addEventListener('click', () => select(button)));
  const setVisibleNodes = (next, {refreshInspector = false} = {}) => {
    available.splice(0, available.length, ...gameUiWorkbenchNodes(next));
    const known = new Set(buttons.map(button => button.dataset.gameUiWorkbenchNode));
    for (const node of available.filter(node => !known.has(node.id))) {
      const template = document.createElement('template');
      template.innerHTML = elementTree({nodes: [{...node, labelMarkup: esc(node.label), detailMarkup: ''}],
        types: GAME_UI_TREE_TYPES, showIcons: false,
        buttonAttributes: item => ({'data-game-ui-workbench-node': item.id, title: item.label})});
      const button = template.content.querySelector('[data-game-ui-workbench-node]');
      button.addEventListener('click', () => select(button));
      buttons.push(button);
    }
    const ids = new Set(available.map(node => node.id));
    const displayed = [...tree.querySelectorAll('[data-game-ui-workbench-node]')];
    if (displayed.length !== available.length
        || displayed.some((button, index) => button.dataset.gameUiWorkbenchNode !== available[index].id)) {
      const byId = new Map(buttons.map(button => [button.dataset.gameUiWorkbenchNode, button]));
      for (const node of available) tree.append(byId.get(node.id).closest('.element-tree-node'));
      for (const button of buttons) if (!ids.has(button.dataset.gameUiWorkbenchNode))
        button.closest('.element-tree-node').remove();
    }
    if (!ids.has(selectedByNamespace.get(String(namespace)))) {
      const first = buttons.find(button => button.dataset.gameUiWorkbenchNode === available[0]?.id);
      if (first) select(first, true);
    }
    if (refreshInspector) {
      const node = selectedGameUiWorkbenchNode(namespace, available);
      const projection = detailProjection(node);
      if (projection !== inspectorProjection) {
        inspectorProjection = projection;
        const detail = workbench.querySelector('[data-game-ui-inspector-detail]');
        const controls = controlsProjection(node);
        const facts = detail.querySelector('.screen-workbench-inspector-body > .screen-workbench-facts');
        if (controls === inspectorControlsProjection && facts) {
          facts.outerHTML = factsMarkup(node?.facts);
          return;
        }
        inspectorControlsProjection = controls;
        updateInspectorDetail(detail, node);
        bindEditors(detail);
        bindInspector(detail, node);
      }
    }
  };
  const editors = bindEditors(workbench);
  return {workbench, editors, setVisibleNodes};
}
