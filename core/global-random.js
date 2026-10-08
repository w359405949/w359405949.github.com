// @editor-module D02E 的双字节随机状态转换。
export function advanceGlobalRandom(high, low) {
  const shifted = ((high << 2) | (low >>> 6)) & 255;
  let sum = low + low + ((high >>> 6) & 1);
  sum = (sum & 255) + 17 + (sum >>> 8);
  const nextLow = sum & 255;
  sum = high + shifted + (sum >>> 8);
  sum = (sum & 255) + 55 + (sum >>> 8);
  return {high: sum & 255, low: nextLow, workspaceHigh: shifted};
}

export function createRuntimeRandomServices({state}) {
  return Object.freeze({
    advance() {
      try {
        const fields = Object.fromEntries(["high", "low", "workspaceHigh", "workspaceLow"].map(name => {
          const field = state.field(`random.${name}`);
          if (field.knowledge !== "confirmed") throw new TypeError(`random.${name}`);
          return [name, field];
        }));
        const high = fields.high.value, low = fields.low.value;
        if (![high, low].every(value => Number.isInteger(value) && value >= 0 && value <= 255))
          throw new TypeError("random-state");
        const next = advanceGlobalRandom(high, low);
        fields.high.value = next.high;
        fields.low.value = next.low;
        fields.workspaceHigh.value = next.workspaceHigh;
        fields.workspaceLow.value = low;
        return {status: "available", state: state.capture(), effects: [{kind: "random-update"}]};
      } catch (error) {return {status: "unavailable", missing: [error.message]};}
    },
  });
}

let cycles = null;
export function globalRandomCycles() {
  if (cycles) return cycles;
  const visited = new Uint8Array(65536), found = [];
  for (let seed = 0; seed < 65536; seed += 1) {
    if (visited[seed]) continue;
    const path = new Map();
    let current = seed;
    while (!visited[current] && !path.has(current)) {
      path.set(current, path.size);
      const next = advanceGlobalRandom(current >> 8, current & 255);
      current = (next.high << 8) | next.low;
    }
    if (path.has(current)) found.push(Object.freeze([...path.keys()].slice(path.get(current))));
    for (const value of path.keys()) visited[value] = 1;
  }
  cycles = Object.freeze(found.sort((left, right) => left.length - right.length));
  return cycles;
}

export function globalRandom(seed = 0) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 65535) throw new RangeError("种子须为 0–65535");
  let high = seed >>> 8, low = seed & 255, calls = 0;
  const next = () => {
    ({high, low} = advanceGlobalRandom(high, low));
    calls++;
    return high;
  };
  return {next, below: bound => Math.floor(next() * bound / 256),
    snapshot: () => ({high, low, calls})};
}
