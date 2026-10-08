// @editor-module 显示现场的字节与向量在共享边界校验。
const byte = value => Number.isInteger(value) && value >= 0 && value <= 255;
const validatedVectors = new WeakSet();
export function requireFrameByte(state, key) {
  if (!byte(state[key])) throw new Error(key);
  return state[key];
}
export function requireFrameVector(value, size, key) {
  if (!(Array.isArray(value) || ArrayBuffer.isView(value)) || value.length !== size) throw new Error(key);
  if (value instanceof Uint8Array || value instanceof Uint8ClampedArray) return value;
  if (validatedVectors.has(value)) return value;
  for (const item of value) if (!byte(item)) throw new Error(key);
  if (Object.isFrozen(value)) validatedVectors.add(value);
  return value;
}

export function cloneFrameValue(value, seen = new Map()) {
  if (value === null || typeof value !== 'object')
    return ['function', 'symbol'].includes(typeof value) ? structuredClone(value) : value;
  if (seen.has(value)) return seen.get(value);
  if ((value instanceof Uint8Array || value instanceof Uint8ClampedArray) && value.buffer instanceof ArrayBuffer) {
    const result = value instanceof Uint8ClampedArray
      ? new Uint8ClampedArray(value) : new Uint8Array(value);
    seen.set(value, result); return result;
  }
  const array = Array.isArray(value);
  if (!array && Object.getPrototypeOf(value) !== Object.prototype) {
    const result = structuredClone(value); seen.set(value, result); return result;
  }
  const result = array ? value.slice() : {};
  seen.set(value, result);
  if (array) {
    if (validatedVectors.has(value)) return result;
    for (let index = 0; index < result.length; index++) {
      const type = typeof result[index];
      if (result[index] !== null && type === 'object' || type === 'function' || type === 'symbol')
        result[index] = cloneFrameValue(result[index], seen);
    }
  } else for (const key of Object.keys(value)) {
    const cloned = cloneFrameValue(value[key], seen);
    if (key === '__proto__') Object.defineProperty(result, key, {value: cloned, enumerable: true, writable: true, configurable: true});
    else result[key] = cloned;
  }
  return result;
}

function sameByteVector(left, right) {
  for (let index = 0; index < left.length; index++)
    if (left[index] !== right[index]) return false;
  return true;
}

export function sameFrameVector(left, right) {
  if (left === right) return true;
  if (left?.length !== right?.length) return false;
  if (left instanceof Uint8Array || left instanceof Uint8ClampedArray)
    return sameByteVector(left, right);
  if (!Array.isArray(left)) return left.every((value, index) => value === right[index]);
  for (let index = 0; index < left.length; index++)
    if (left[index] !== right[index] && index in left) return false;
  return true;
}
