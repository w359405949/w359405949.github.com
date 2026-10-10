import { db, loadByteMapSpace } from './prg-loaders-DnCSmXk9.js';
import { state } from './emulator-Bpa8EsFw.js';
import { currentTextReference } from './interface-state-preview-Dlotqlmn.js';

// @editor-module 从符号表注释派生事件位用途。
const globalEventFlagHandle = id => `global-event-flag:${Number(id).toString(16).toUpperCase().padStart(2, '0')}`;

function globalEventFlagPurposes(annotations) {
  const labels = new Map(annotations.filter(row => row.binding?.slot === 1
    && Number.isInteger(row.binding.flag_id) && !/treasure/u.test(row.field_id || '')
    && row.semantic_status !== 'unproven' && !/查不实|未知|未确认/u.test(row.binding.label || ''))
    .map(row => [row.binding.flag_id, {label: row.binding.label,
      purposeTextReference: row.binding.purpose_text_reference}]));
  return Array.from({length: 256}, (_, id) => ({id, handle: globalEventFlagHandle(id),
    ...(labels.get(id) || {label: '未知用途'})}));
}

// @editor-module 全局事件位的句柄与已确认用途。
let entries = Array.from({length: 256}, (_, id) => ({id, handle: globalEventFlagHandle(id), label: '未知用途'}));

function globalEventFlagEntries() { return entries.map(row => globalEventFlagEntry(row.id)); }

function globalEventFlagEntry(value) {
  if (value === null || value === undefined || value === '') return null;
  const id = typeof value === 'string' && value.startsWith('global-event-flag:')
    ? Number.parseInt(value.split(':')[1], 16) : Number(value);
  if (!Number.isInteger(id) || id < 0 || id >= 256) return null;
  const row = entries[id];
  return row.purposeTextReference ? {...row,
    get label() {return `${row.label} · ${currentTextReference(row.purposeTextReference).label}`;}} : row;
}

async function prepareGlobalEventFlags() {
  const path = state.browserPackageManifest?.browser_prepared_inputs?.global_event_flags;
  if (path) {
    const document = await db.getPackageDocument(path, null, {readonly: true});
    entries = document.entries;
  } else {
    const document = await loadByteMapSpace('sram', {allPages: true});
    entries = globalEventFlagPurposes(document.annotations);
  }
  return globalEventFlagEntries();
}

// @editor-module D02E 的双字节随机状态转换。
function advanceGlobalRandom(high, low) {
  const shifted = ((high << 2) | (low >>> 6)) & 255;
  let sum = low + low + ((high >>> 6) & 1);
  sum = (sum & 255) + 17 + (sum >>> 8);
  const nextLow = sum & 255;
  sum = high + shifted + (sum >>> 8);
  sum = (sum & 255) + 55 + (sum >>> 8);
  return {high: sum & 255, low: nextLow, workspaceHigh: shifted};
}

function createRuntimeRandomServices({state}) {
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
function globalRandomCycles() {
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

function globalRandom(seed = 0) {
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

export { advanceGlobalRandom, createRuntimeRandomServices, globalEventFlagEntries, globalEventFlagEntry, globalEventFlagHandle, globalRandom, globalRandomCycles, prepareGlobalEventFlags };
