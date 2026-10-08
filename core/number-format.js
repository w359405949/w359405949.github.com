// @editor-module 格式化十六进制数值。
export const hex = (value, width = 6) => `0x${Number(value).toString(16).toUpperCase().padStart(width, "0")}`;
