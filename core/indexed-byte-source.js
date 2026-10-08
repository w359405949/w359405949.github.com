// @editor-module 位图字节投影按读取位置解引用当前字段值。
export function indexedByteSource(length, readByte) {
  const index = value => Number.isInteger(Number(value)) && Number(value) >= 0 && String(Number(value)) === value;
  const range = (start = 0, end = length) => {
    const bound = value => value < 0 ? Math.max(0, length + Math.trunc(value)) : Math.min(length, Math.trunc(value));
    start = bound(start); end = Math.max(start, bound(end));
    return Uint8Array.from({length: end - start}, (_, offset) => readByte(start + offset));
  };
  return new Proxy({length, slice: range, subarray: range,
    *[Symbol.iterator]() {for (let offset = 0; offset < length; offset++) yield readByte(offset);}}, {
    get(target, key, receiver) {
      if (typeof key === 'string' && index(key)) return Number(key) < length ? readByte(Number(key)) : undefined;
      return Reflect.get(target, key, receiver);
    },
  });
}
