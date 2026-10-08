// @editor-module 场景渐显按 NES 色号的亮度减量绘制。
import {nesPalette} from "./nes.js";

const colors = new Map(nesPalette.map((rgb, index) => [rgb.join(","), index]));
const sheets = new Map();

// PRG $07E0A8–$07E0C8 将 $30 归为 $20，亮度减量越界时取 $0F。
function fieldPaletteColor(color, decrement) {
  const source = color === 0x30 ? 0x20 : color;
  const brightness = ((source & 0xf0) - decrement) & 0xff;
  return brightness < 0x40 ? brightness | (color & 0x0f) : 0x0f;
}

export function paintFieldPalette(context, decrement, flash = false) {
  if (!decrement && !flash) return;
  const image = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
  for (let index = 0; index < image.data.length; index += 4) {
    if (!image.data[index + 3]) continue;
    const rgb = Array.from(image.data.slice(index, index + 3)).join(",");
    const color = flash && rgb === nesPalette[0x0f].join(",") ? 0x0f : colors.get(rgb);
    if (color === undefined) continue;
    // PRG $07E1C8–$07E1E0 保留 $0F，其余色号取下一档灰阶并将 $40 归为 $30。
    const gray = color === 0x0f ? 0x0f : Math.min(0x30, (color & 0xf0) + 0x10);
    image.data.set(nesPalette[flash ? gray : fieldPaletteColor(color, decrement)], index);
  }
  context.putImageData(image, 0, 0);
}

export async function fieldPaletteSheetUrl(source, decrement) {
  if (!decrement) return source;
  const key = `${decrement}:${source}`;
  if (!sheets.has(key)) sheets.set(key, (async () => {
    const image = new Image();
    image.src = source;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    paintFieldPalette(context, decrement);
    return canvas.toDataURL();
  })());
  return sheets.get(key);
}
