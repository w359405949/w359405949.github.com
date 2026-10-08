// @editor-module 元图块行为码的已证实局部移动效果。
// 依据：project/evidence/reverse-engineering/metatile-attribute-bits/observations.md。
const effects = new Map([
  [0, "人物通过目标格"], [1, "改变位移方向"], [2, "改变位移方向"],
  [3, "人物通过目标格"], [4, "人物通过目标格，落点有别"],
  [5, "人物通过目标格"], [6, "人物通过；世界地图战车受阻"],
  [7, "人物通过目标格"], [8, "人物停在目标格前"],
  [9, "人物停在目标格前"], [10, "人物停在目标格前"],
  [11, "人物停在目标格前"], [12, "人物停在目标格前"],
  [13, "通过；同格有入口时转场"], [14, "人物通过目标格"],
  [15, "人物通过目标格"], [16, "人物停在目标格前"],
  [17, "人物通过目标格"], [18, "人物通过目标格"],
  [19, "人物通过目标格"], [20, "此处转入另一场景"],
  [21, "人物通过目标格"], [22, "人物停在目标格前"],
  [23, "人物停在目标格前"], [24, "人物停在目标格前"],
  ...Array.from({length: 7}, (_, index) => [25 + index, "人物通过目标格"]),
  [32, "人物停在目标格前"], [33, "人物停在目标格前"],
  [38, "人物停在目标格前"], [52, "人物停在目标格前"],
  [63, "人物停在目标格前"],
]);

export const metatileBehaviorCode = attribute => (Number(attribute) >> 2) & 0x3f;
export const metatileBehaviorLabel = code => effects.get(code) || "局部移动效果未确认";
export const metatileBehaviorOptions = Array.from({length: 64}, (_, code) => ({
  code, label: `$${code.toString(16).toUpperCase().padStart(2, "0")} · ${metatileBehaviorLabel(code)}`,
}));

export function metatileAttributeWithBehavior(attribute, code) {
  if (!Number.isInteger(attribute) || attribute < 0 || attribute > 255
      || !Number.isInteger(code) || code < 0 || code > 63)
    throw new TypeError("元图块行为码必须是 0–63 的整数");
  return (code << 2) | (attribute & 3);
}
