// @editor-module 重量文字按四位内部单位生成核心字体脚本。
export function runtimeWeightScript(internalUnits, {unit = true, overflow = false} = {}) {
  const raw = Math.max(0, Math.round(Number(internalUnits) || 0));
  const value = Math.min(9999, raw);
  const whole = Math.floor(value / 100), hundredths = value % 100;
  const digits = overflow && raw > 9999 ? [0x92, 0x92, 0x92, 0x92]
    : [whole >= 10 ? Math.floor(whole / 10) % 10 : 0xFF,
      whole % 10, Math.floor(hundredths / 10), hundredths % 10];
  return [digits[0], digits[1], 0x65, digits[2], digits[3], ...(unit ? [0x9C] : []), 0x9F]
    .map(byte => byte.toString(16).toUpperCase().padStart(2, '0')).join(' ');
}
