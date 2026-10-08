// @editor-module 跨视图共用的可选元素树
//
// 调用方把本域数据摊成带 id/kind/label/detail/depth 的顺序节点；本模块只负责
// 树容器与节点行。beforeNode/afterNode 是行两侧的插槽，供某一页放可见性开关、
// 跳转或地址等附加件，不把这些域知识带进共用行。重绘交互统一走文件末尾的入口，
// 由它恢复树的观察位置、选中节点可见性和被替换按钮的焦点。

import {esc} from "../core/dom.js";

// 字形只有这一份。调用方仍负责把自己的 kind 登记到哪一种字形和哪一个类型名。
export const ELEMENT_TREE_ICONS = Object.freeze({
  group: "▣",
  layer: "▧",
  text: "T",
  target: "⌖",
  actor: "♟",
  layout: "▤",
  list: "☷",
  item: "○",
  action: "→",
  overlay: "◇",
  component: "◫",
  preview: "▶",
  fallback: "·",
});

// 同一概念在不同页面沿用各自原有措辞；页面只把 kind 登记到这些既有显示词。
export const ELEMENT_TREE_LABELS = Object.freeze({
  interface: "界面",
  previewBackdrop: "预览背景",
  layout: "布局",
  writing: "文字",
  options: "选项列表",
  option: "选项",
  action: "行为",
  overlay: "叠加层",
  component: "组件",
  runtimePreview: "运行预览",
  screen: "画面",
  image: "图像",
  text: "文本",
  presentation: "演出",
  shot: "幕",
  camera: "镜头",
  actor: "角色",
  fallback: "节点",
});

/** 建立本页的 kind → {icon, label} 词表。 */
export function defineElementTreeTypes(entries) {
  return Object.freeze(Object.fromEntries(
    Object.entries(entries || {}).map(([kind, entry]) => [
      kind,
      Object.freeze({...entry}),
    ]),
  ));
}

export function elementTreeTypeLabel(
  types,
  kind,
  fallback = ELEMENT_TREE_LABELS.fallback,
) {
  return types?.[kind]?.label || kind || fallback;
}

function attributesMarkup(attributes) {
  return Object.entries(attributes || {}).map(([name, value]) => {
    if (value === undefined || value === null || value === false) return "";
    if (value === true) return ` ${esc(name)}`;
    return ` ${esc(name)}="${esc(value)}"`;
  }).join("");
}

/** 只画节点行；供局部重建树内容时复用，行结构仍只有这一份。 */
export function elementTreeRows({
  nodes = [],
  types = {},
  selectedId = null,
  rowAttributes = () => ({}),
  buttonAttributes = () => ({}),
  iconAttributes = () => ({}),
  showIcons = true,
  beforeNode = () => "",
  afterNode = () => "",
} = {}) {
  return nodes.map(node => {
    const selected = node.id === selectedId;
    const type = types?.[node.kind] || {};
    const depth = Number.isFinite(Number(node.depth)) ? Number(node.depth) : 0;
    return `<div class="element-tree-node${selected ? " is-selected" : ""}"
      style="--element-tree-depth:${depth}"${
        attributesMarkup(rowAttributes(node, selected))}>
      ${beforeNode(node, selected)}
      <button type="button" class="element-tree-node-button"${
        attributesMarkup(buttonAttributes(node, selected))}>
        ${showIcons ? `<span class="element-tree-node-icon"${
          attributesMarkup(iconAttributes(node, selected))}>${
          esc(type.icon || ELEMENT_TREE_ICONS.fallback)}</span>` : ""}
        <span class="element-tree-node-copy"><b>${node.labelMarkup ?? esc(node.label)}</b>${
          node.detailMarkup || node.detail ? `<small>${node.detailMarkup ?? esc(node.detail)}</small>` : ""}</span>
      </button>
      ${afterNode(node, selected)}
    </div>`;
  }).join("");
}

/** 画完整树；className 只给页面自己的布局壳追加类名。 */
export function elementTree({
  className = "",
  attributes = {},
  empty = "",
  ...rowOptions
} = {}) {
  const rows = elementTreeRows(rowOptions);
  return `<div class="element-tree${className ? ` ${esc(className)}` : ""}"${
    attributesMarkup(attributes)}>${rows || empty}</div>`;
}

function verticalScrollContainer(tree) {
  const ownerDocument = tree?.ownerDocument;
  const view = ownerDocument?.defaultView;
  for (let node = tree; node && node !== ownerDocument?.body
      && node !== ownerDocument?.documentElement; node = node.parentElement) {
    const overflow = view?.getComputedStyle(node)?.overflowY || "";
    if (/^(auto|scroll|overlay)$/.test(overflow)
        && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
}

function visibleVerticalBounds(scroller, tree) {
  const bounds = scroller.getBoundingClientRect();
  let top = bounds.top + scroller.clientTop;
  let bottom = top + scroller.clientHeight;
  if (scroller === tree) return {top, bottom};

  // screen-workbench 的标题黏在滚动栏顶部。它不是树的一部分，但会盖住滚到
  // 最上沿的节点；这里按实际几何扣掉这类黏性兄弟，不把页面或域布局写进组件。
  for (const child of scroller.children) {
    if (child === tree
        || tree.contains(child)
        || getComputedStyle(child).position !== "sticky") continue;
    const childBounds = child.getBoundingClientRect();
    if (childBounds.top <= top && childBounds.bottom > top) {
      top = Math.min(bottom, childBounds.bottom);
    } else if (childBounds.top < bottom && childBounds.bottom >= bottom) {
      bottom = Math.max(top, childBounds.top);
    }
  }
  return {top, bottom};
}

function revealSelectedElementTreeNode(tree, scroller) {
  const selected = tree?.querySelector(
    ".element-tree-node.is-selected > .element-tree-node-button",
  );
  if (!selected || !scroller) return selected;
  const row = selected.closest(".element-tree-node") || selected;
  const {top, bottom} = visibleVerticalBounds(scroller, tree);
  const bounds = row.getBoundingClientRect();
  if (bounds.top < top) scroller.scrollTop += bounds.top - top;
  else if (bounds.bottom > bottom) scroller.scrollTop += bounds.bottom - bottom;
  return selected;
}

/**
 * 执行一次会重建树 DOM 的更新，并让新树里的选中节点仍可见。
 *
 * 旧 scrollTop 只作为新树的观察起点：选中节点若因筛选或结构变化移出视口，
 * 会再滚到最近边缘。滚动只写树自身或最近的非页面滚动容器。只有触发按钮原本
 * 持有焦点时，才把焦点放回新按钮，并用 preventScroll 避免牵动整页。
 */
export async function rerenderElementTreeKeepingSelectionVisible(
  trigger,
  rerender,
) {
  const tree = trigger?.closest?.(".element-tree") || null;
  const root = tree?.getRootNode?.() || null;
  const trees = root?.querySelectorAll ? [...root.querySelectorAll(".element-tree")] : [];
  const treeIndex = trees.indexOf(tree);
  const scroller = verticalScrollContainer(tree);
  const scrollTop = scroller?.scrollTop || 0;
  const restoreFocus = trigger === trigger?.ownerDocument?.activeElement;

  await rerender();
  if (!tree) return null;

  const nextTrees = root?.querySelectorAll
    ? [...root.querySelectorAll(".element-tree")] : [];
  const nextTree = tree.isConnected ? tree : nextTrees[treeIndex] || null;
  const nextScroller = verticalScrollContainer(nextTree);
  if (nextScroller) nextScroller.scrollTop = scrollTop;
  const selected = revealSelectedElementTreeNode(nextTree, nextScroller);
  if (restoreFocus) selected?.focus({preventScroll: true});
  return selected;
}
