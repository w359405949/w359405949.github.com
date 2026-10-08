// @editor-module 只读 JSON 的呈现容器在访问时复制，修改只留在投影中。
export function mutableJsonProjection(source) {
  if (!source || typeof source !== 'object') return source;
  const target = Array.isArray(source) ? [...source] : {...source};
  for (const key of Object.keys(target)) {
    const value = target[key];
    if (!value || typeof value !== 'object') continue;
    const replace = value => Object.defineProperty(target, key, {
      value, enumerable: true, configurable: true, writable: true,
    });
    Object.defineProperty(target, key, {
      enumerable: true, configurable: true,
      get() {
        const projected = mutableJsonProjection(value);
        replace(projected);
        return projected;
      },
      set: replace,
    });
  }
  return target;
}
