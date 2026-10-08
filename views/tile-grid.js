// @editor-module 可复用的二维格画布外壳与交互几何
//
// 这里只拥有画布尺寸、格坐标换算和逐格绘制循环。格子表示地图图块、战斗对象
// 布局还是别的领域数据，由调用方决定；图案解码、调色板、业务叠层和保存规则都
// 留在各自 owner 内。

import {esc} from "../core/dom.js";

const positiveInteger = (value, label) => {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new TypeError(`${label} 必须是正整数`);
  }
  return number;
};

function declaredGeometry({columns, rows, cellWidth, cellHeight}) {
  const normalizedCellWidth = positiveInteger(cellWidth, "格宽");
  const normalizedCellHeight = positiveInteger(cellHeight, "格高");
  const normalizedColumns = positiveInteger(columns, "列数");
  const normalizedRows = positiveInteger(rows, "行数");
  return {
    columns: normalizedColumns,
    rows: normalizedRows,
    cellWidth: normalizedCellWidth,
    cellHeight: normalizedCellHeight,
    width: normalizedColumns * normalizedCellWidth,
    height: normalizedRows * normalizedCellHeight,
  };
}

function additionalDataAttributes(data) {
  return Object.entries(data || {}).map(([key, value]) => {
    if (!/^[a-z][a-z0-9-]*$/u.test(key) || key.startsWith("tile-grid-")) {
      throw new TypeError(`二维格画布 data 属性无效：${key}`);
    }
    return ` data-${key}="${esc(value)}"`;
  }).join("");
}

/**
 * 输出领域无关的二维格 canvas。调用方只声明语义 owner、格数与显示尺寸；
 * 不把 tile 编号、bank、地址或编码宽度放进公共组件。
 */
export function renderTileGridCanvas({
  id = "",
  owner,
  role = "grid",
  columns,
  rows,
  cellWidth,
  cellHeight = cellWidth,
  className = "",
  style = "",
  label = "二维格画布",
  readOnly = false,
  data = {},
} = {}) {
  const geometry = declaredGeometry({columns, rows, cellWidth, cellHeight});
  if (!String(owner || "").trim()) throw new TypeError("二维格画布缺少 owner");
  return `<canvas${id ? ` id="${esc(id)}"` : ""}${
    className ? ` class="${esc(className)}"` : ""
  } width="${geometry.width}" height="${geometry.height}"${
    style ? ` style="${esc(style)}"` : ""
  } aria-label="${esc(label)}"${additionalDataAttributes(data)}
    data-tile-grid-component="tile-grid/v1"
    data-tile-grid-owner="${esc(owner)}"
    data-tile-grid-role="${esc(role)}"
    data-tile-grid-columns="${geometry.columns}"
    data-tile-grid-rows="${geometry.rows}"
    data-tile-grid-cell-width="${geometry.cellWidth}"
    data-tile-grid-cell-height="${geometry.cellHeight}"
    data-tile-grid-read-only="${readOnly ? "true" : "false"}"></canvas>`;
}

/** 只从公共组件声明读取几何，领域代码不再各写一份固定除数。 */
export function tileGridGeometry(canvas) {
  if (!canvas?.dataset) throw new TypeError("二维格画布不存在");
  const geometry = declaredGeometry({
    columns: canvas.dataset.tileGridColumns,
    rows: canvas.dataset.tileGridRows,
    cellWidth: canvas.dataset.tileGridCellWidth,
    cellHeight: canvas.dataset.tileGridCellHeight,
  });
  if (Number(canvas.width) !== geometry.width || Number(canvas.height) !== geometry.height) {
    throw new TypeError("二维格画布尺寸与格声明不一致");
  }
  return geometry;
}

function contextGeometry(context, options) {
  const explicit = [
    options.columns,
    options.rows,
    options.cellWidth,
    options.cellHeight,
  ].every(value => value !== undefined);
  return explicit
    ? declaredGeometry(options)
    : tileGridGeometry(options.canvas || context?.canvas);
}

/** 在已有领域画面上叠加公共格线；不参与格内内容的解释。 */
export function paintTileGridLines(context, {
  canvas = null,
  columns,
  rows,
  cellWidth,
  cellHeight,
  color = "rgba(216,242,49,.28)",
  lineWidth = 0.5,
} = {}) {
  if (!context) throw new TypeError("二维格画布缺少绘图上下文");
  const geometry = contextGeometry(context, {
    canvas, columns, rows, cellWidth, cellHeight,
  });
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  for (let column = 0; column <= geometry.columns; column += 1) {
    const x = column * geometry.cellWidth;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, geometry.height);
    context.stroke();
  }
  for (let row = 0; row <= geometry.rows; row += 1) {
    const y = row * geometry.cellHeight;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(geometry.width, y);
    context.stroke();
  }
  return geometry;
}

/**
 * 领域提供单格 painter，公共组件只负责遍历和坐标。适合静态矩阵预览，也能作为
 * 后续带 owner 上下文的逐格编辑画布底座。
 */
export function paintTileGridCells(canvas, paintCell, {clear = true} = {}) {
  if (typeof paintCell !== "function") throw new TypeError("二维格画布缺少单格 painter");
  const geometry = tileGridGeometry(canvas);
  const context = canvas.getContext("2d");
  if (!context) throw new TypeError("二维格画布无法取得绘图上下文");
  if (clear) context.clearRect(0, 0, geometry.width, geometry.height);
  let painted = 0;
  for (let row = 0; row < geometry.rows; row += 1) {
    for (let column = 0; column < geometry.columns; column += 1) {
      paintCell({
        canvas,
        context,
        column,
        row,
        x: column * geometry.cellWidth,
        y: row * geometry.cellHeight,
        width: geometry.cellWidth,
        height: geometry.cellHeight,
      });
      painted += 1;
    }
  }
  canvas.dataset.tileGridPaintedCells = String(painted);
  return painted;
}
