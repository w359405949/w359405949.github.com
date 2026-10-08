// @editor-module NES 颜色的唯一呈现出口
//
// 「把一个 0..$3F 的色号画成一块颜色」这件事，全项目此前有六处各写一遍
// （怪物调色板、精灵调色板、视觉引用、战斗列表、调色板作者页，还有一处新加的），
// 每处自己算 `nesPalette[id]`、自己拼 `background:rgb(...)`、自己决定标不标色号。
// 取色格更明显：`boot-presentation` 写了一份，`attack-stage-catalog` 直接借用了
// 它的 CSS 类名——**样式已经在共用，代码却没有**。收在这里。
//
// 这里只管「画成什么样」。**哪些色号属于哪条记录、改了写回哪个模块，都不在这**——
// 那是各 owner 自己的事，收进来就会变成第二处调色板语义。

import {esc} from "../core/dom.js";
import {nesPalette} from "../render/nes.js";

if (typeof document !== "undefined") {
  const preview = cell => {
    const detail = cell.closest('.nes-colour-choice')?.querySelector('.picker-candidate-preview');
    if (!detail) return;
    const index = Number(cell.dataset.nesColourIndex);
    detail.innerHTML = `<b>${nesColorHex(index)}</b><span class="nes-colour-preview" style="background:${nesColorCss(index)}"></span>`;
  };
  for (const eventName of ['pointerover', 'focusin']) document.addEventListener(eventName, event => {
    const cell = event.target.closest?.('[data-nes-colour-index]');
    if (cell) preview(cell);
  });
  const filter = details => {
    const query = details.querySelector("[data-nes-colour-search]")?.value.trim().toLowerCase() || "";
    const group = details.dataset.nesColourGroup || "";
    details.querySelectorAll("[data-nes-colour-index]").forEach(cell => {
      const index = Number(cell.dataset.nesColourIndex);
      cell.hidden = Boolean((group && Math.floor(index / 16) !== Number(group))
        || (query && !`${index} ${nesColorHex(index).toLowerCase()}`.includes(query)));
    });
  };
  document.addEventListener("input", event => {
    if (event.target.matches?.("[data-nes-colour-search]")) filter(event.target.closest(".nes-colour-choice"));
  });
  document.addEventListener("click", event => {
    const group = event.target.closest?.("[data-nes-colour-group]");
    if (group) {
      const details = group.closest(".nes-colour-choice");
      details.dataset.nesColourGroup = group.dataset.nesColourGroup;
      details.querySelectorAll("[data-nes-colour-group]").forEach(button =>
        button.setAttribute("aria-pressed", String(button === group)));
      filter(details);
    }
    const cell = event.target.closest?.("[data-nes-colour-index]");
    if (cell) {
      const details = cell.closest(".nes-colour-choice");
      if (details) details.open = false;
    }
  });
}

const NES_COLOR_MAX = 0x3f;

function nesColorIndex(value) {
  return Number(value) & NES_COLOR_MAX;
}

function nesColorHex(value) {
  return `$${nesColorIndex(value).toString(16).toUpperCase().padStart(2, "0")}`;
}

/** `rgb(r, g, b)`。**只此一处**——空格式与逗号式混用过，比对样式时很难发现。 */
export function nesColorCss(value) {
  const [red, green, blue] = nesPalette[nesColorIndex(value)] || [0, 0, 0];
  return `rgb(${red}, ${green}, ${blue})`;
}

/**
 * 一条色块。
 *
 * 尺寸交给 CSS：调用方给 `className`，样式写在自己那一节。以前各处把宽高写死在
 * 行内（6×12 / 10×14 / 13×13），换一处就得翻三个文件。
 *
 * `label` 给了就是有意义的图形（`aria-label`），不给就是纯装饰（`aria-hidden`）——
 * 一串没有名字的色块对读屏来说只是噪音。
 */
export function paletteSwatches(colors, {
  className = "palette-swatches",
  swatchClassName = "",
  label = "",
  swatchAttributes = () => "",
} = {}) {
  const values = Array.isArray(colors) ? colors : [];
  return `<span class="${esc(className)}" ${
    label ? `aria-label="${esc(label)}"` : 'aria-hidden="true"'
  }>${values.map((value, index) => {
    const extra = String(swatchAttributes(value, index) || "");
    return `<i ${swatchClassName ? `class="${esc(swatchClassName)}" ` : ""}style="--swatch:${
      nesColorCss(value)}" title="${nesColorHex(value)}" ${extra}></i>`;
  }).join("")}</span>`;
}

/**
 * 64 色取色格，按 PPU 的 16×4 排布。
 *
 * `pickAttribute` 是每一格上携带色号的属性名——各页的事件委托认的是自己的属性，
 * 不统一成一个名字，是因为一页上可能同时开着好几个取色格，靠属性名区分归谁管。
 */
export function nesColorGrid({
  current = null,
  pickAttribute = "data-nes-colour-pick",
  gridAttributes = "",
  cellAttributes = () => "",
} = {}) {
  const selected = current === null || current === undefined
    ? null : nesColorIndex(current);
  return `<details class="nes-colour-choice" open>
    <summary>${selected === null ? "选择 NES 颜色" : `NES 颜色 ${nesColorHex(selected)}`}</summary>
    <div class="nes-colour-choice-panel">
      <label class="module-reference-picker-filter">搜索色号
        <input type="search" data-nes-colour-search placeholder="十进制或 $ 十六进制"></label>
      <nav class="module-reference-picker-groups" aria-label="颜色分组">
        <button type="button" data-nes-colour-group="" aria-pressed="true">全部</button>
        ${[0, 1, 2, 3].map(group => `<button type="button" data-nes-colour-group="${group}"
          aria-pressed="false">$${(group * 16).toString(16).toUpperCase()}–$${(group * 16 + 15).toString(16).toUpperCase()}</button>`).join("")}
      </nav>
      <div class="picker-candidates-body"><div class="nes-colour-grid" ${gridAttributes}>${
    nesPalette.slice(0, NES_COLOR_MAX + 1).map((_rgb, index) => `<button type="button"
      class="nes-colour-cell${index === selected ? " is-current" : ""}"
      style="--swatch:${nesColorCss(index)}"
      data-nes-colour-index="${index}"
      ${pickAttribute}="${index}" title="${nesColorHex(index)}"
      aria-label="NES 颜色 ${nesColorHex(index)}"
      ${String(cellAttributes(index) || "")}></button>`).join("")}</div>
      <div class="picker-candidate-preview">${selected === null ? '' : `<b>${nesColorHex(selected)}</b><span class="nes-colour-preview" style="background:${nesColorCss(selected)}"></span>`}</div></div>
    </div>
  </details>`;
}
