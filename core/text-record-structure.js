// @editor-module 文本字段对象提供保持记录结构与输出上界的属性编辑域。
import {TEXT_RECORD_UI_SCOPE} from './text-record-ui-scope.js';

const hex = value => Number(value).toString(16).toUpperCase().padStart(2, '0');
export const textRecordHandle = id => {
  const [, region, record] = String(id).split(':');
  return `text-record:${region}:${Number(record).toString(16).toUpperCase().padStart(3, '0')}`;
};
const recordId = (region, id) => `record:${hex(region)}:${String(id).padStart(3, '0')}`;
const referenceRegions = new Map([[0x43, 9], [0xEA, 0x13], [0xEC, 0x14], [0xF2, 9], [0xF3, 0x11]]);
const exitRaw = record => record?.protected_ranges?.at(-1)?.semantic === 'raw-mode-terminator';
const rawTile = value => ![0x43, 0x63, 0x8C, 0x9E, 0x9F].includes(value);
const normalTile = value => value === 0xFF || value < 0xE2 && value !== 0x9F
  && value !== 0x42 && !(value >= 0x16 && value <= 0x34);
const shapes = new WeakMap();
const fieldsByDocument = new WeakMap();

export function textRecordStaticOptionCount(document, id, active = new Set()) {
  const record = document?.records?.[id];
  if (!record || active.has(id)) throw new TypeError('选项文字缺失或引用循环');
  active = new Set([...active, id]);
  let breaks = 0;
  for (const range of record.protected_ranges) {
    if (range.kind !== 'command') continue;
    const target = referenceAt(record, range);
    if (target) breaks += textRecordStaticOptionCount(document, target, active) - 1;
    else if (range.token === 0xE5) breaks++;
    else if (range.token !== 0xED) throw new TypeError('选项文字含未确认的消费');
  }
  return breaks + 1;
}

function referenceAt(record, range) {
  const region = range.token === 0xF7 ? record.bytes[range.offset + 2] : referenceRegions.get(range.token);
  return region === undefined ? null : recordId(region, record.bytes[range.offset + 1]);
}

export function textRecordProviderCalls(document, id, tokens, active = new Set()) {
  const record = document?.records?.[id];
  if (!record) throw new TypeError(`文字提供器缺少记录：${id}`);
  if (active.has(id)) throw new TypeError(`文字提供器引用循环：${id}`);
  active = new Set([...active, id]);
  return record.protected_ranges.flatMap(range => {
    if (range.kind !== 'command') return [];
    const target = referenceAt(record, range);
    if (target) return textRecordProviderCalls(document, target, tokens, active);
    return tokens.includes(range.token) ? [{record: id, offset: range.offset,
      token: range.token, provider: range.token === 0xE8 ? 7 : record.bytes[range.offset + 1]}] : [];
  });
}

function recordShape(record) {
  const ranges = new Map(record.protected_ranges.map(range => [range.offset, range]));
  const shape = [];
  for (let offset = 0; offset < record.capacity;) {
    const range = ranges.get(offset);
    if (range) {
      shape.push(range.kind === 'fixed-tile' ? 'tile' : `${range.kind}:${record.bytes.slice(offset, offset + range.length).join(',')}`);
      offset += range.length;
    } else {
      const pair = record.bytes[offset] >= 0x24 && record.bytes[offset] <= 0x2E;
      shape.push(pair ? 'glyph' : normalTile(record.bytes[offset]) ? 'literal' : `literal:${record.bytes[offset]}`);
      offset += pair ? 2 : 1;
    }
  }
  return JSON.stringify(shape);
}

function matchingReferences(document, targetId, region) {
  if (!document.records[targetId]) return [];
  let byShape = shapes.get(document);
  if (!byShape) {
    byShape = new Map();
    for (const record of Object.values(document.records)) {
      const key = recordShape(record);
      if (!byShape.has(key)) byShape.set(key, []);
      byShape.get(key).push(record.node_id);
    }
    shapes.set(document, byShape);
  }
  return (byShape.get(recordShape(document.records[targetId])) || []).filter(id =>
    document.records[id].id <= 255 && (region === null || document.records[id].region_id === region));
}

export function textRecordStructureFields(document, id) {
  const scope = TEXT_RECORD_UI_SCOPE.get(id);
  const record = document?.records?.[id];
  if (!scope || !record) return [];
  let cached = fieldsByDocument.get(document);
  if (!cached) fieldsByDocument.set(document, cached = new Map());
  if (cached.has(id)) return cached.get(id);
  const fields = [];
  const has = attribute => scope.attributes.includes(attribute);
  const add = (attribute, offset, length, label, options) => {
    if (has(attribute)) fields.push({id: `${id}:${offset}`, attribute, offset, length, label, ...options});
  };
  let raw = false;
  for (const range of record.protected_ranges) {
    const {offset, token} = range;
    if (range.kind === 'fixed-tile') {
      const allowed = Array.from({length: 256}, (_, value) => value).filter(raw ? rawTile : normalTile);
      if (allowed.includes(record.bytes[offset])) add('content', offset, 1, '图块', {kind: 'tile', allowed});
      continue;
    }
    if (range.kind !== 'command') continue;
    if ([0xED, 0x9E].includes(token)) add('position', offset + 1, 1, '位移',
      {kind: 'number', min: 0, max: record.bytes[offset + 1]});
    if ([0xEF, 0x8C].includes(token)) {
      add('size', offset + 1, 1, '填充长度', {kind: 'number', min: 1, max: record.bytes[offset + 1]});
      add('content', offset + 2, 1, '填充图块', {kind: 'tile', allowed: Array.from({length: 256}, (_, value) => value)});
    }
    if (token === 0xF4 && range.repeat_role === 'begin') add('size', offset + 1, 1, '重复次数',
      {kind: 'number', min: 1, max: record.bytes[offset + 1]});
    const target = referenceAt(record, range);
    if (target) {
      const region = token === 0xF7 ? null : referenceRegions.get(token);
      const allowed = matchingReferences(document, target, region);
      if (allowed.length > 1) add('reference', offset + 1, token === 0xF7 ? 2 : 1, '引用记录',
        {kind: 'reference', allowed, region});
      raw = exitRaw(document.records[target]);
    }
    if (range.semantic === 'enter-raw-tile-mode') raw = true;
    if (range.semantic === 'leave-raw-tile-mode') raw = false;
  }
  const result = fields.filter(field => field.kind !== 'number' || field.max > field.min);
  cached.set(id, result);
  return result;
}

export function textRecordStructureOwners(document, id, original = document) {
  const seen = new Set();
  const visit = id => {
    const record = document?.records?.[id];
    if (!record || seen.has(id)) return;
    seen.add(id);
    for (const range of record.protected_ranges) {
      if (range.kind !== 'command') continue;
      const target = referenceAt(record, range);
      if (target) visit(target);
    }
  };
  visit(id);
  return [...seen].filter(id => textRecordStructureFields(original, id).length);
}

export function textRecordStructureReplacementAllowed(document, id, offset, value) {
  return textRecordStructureFields(document, id).some(field => offset >= field.offset
    && offset < field.offset + field.length && (field.kind === 'number'
      ? value >= field.min && value <= field.max
      : field.kind === 'tile' ? field.allowed.includes(value) : true));
}

export function validateTextRecordStructure(candidate, original, id) {
  const record = candidate.records[id];
  const before = original.records[id];
  for (const field of textRecordStructureFields(original, id)) {
    const value = record.bytes[field.offset];
    if (field.kind === 'reference') {
      if (record.bytes.slice(field.offset, field.offset + field.length)
        .every((value, index) => value === before.bytes[field.offset + index])) continue;
      const target = recordId(field.region ?? record.bytes[field.offset + 1], value);
      if (!field.allowed.includes(target)) throw new TypeError(`${id}: 引用记录不在同结构编辑域`);
      const sourceRange = before.protected_ranges.find(range => range.offset === field.offset - 1);
      const oldTarget = referenceAt(before, sourceRange);
      if (recordShape(candidate.records[target]) !== recordShape(original.records[oldTarget]))
        throw new TypeError(`${id}: 引用目标的结构已改变`);
    } else if (!textRecordStructureReplacementAllowed(original, id, field.offset, value)) {
      throw new TypeError(`${id}: 属性超过保持输出上界的编辑域`);
    }
  }
}

export function installTextRecordStructureValue(document, original, id, fieldId, value) {
  const field = textRecordStructureFields(original, id).find(field => field.id === fieldId);
  if (!field) throw new TypeError('文本属性未开放');
  const record = document.records[id];
  if (field.kind === 'reference') {
    if (!field.allowed.includes(value)) throw new TypeError('引用记录不在同结构编辑域');
    const target = original.records[value];
    record.bytes[field.offset] = target.id;
    if (field.length === 2) record.bytes[field.offset + 1] = target.region_id;
  } else {
    const number = Number(value);
    if (!Number.isInteger(number) || !textRecordStructureReplacementAllowed(original, id, field.offset, number))
      throw new TypeError('文本属性值不在编辑域');
    record.bytes[field.offset] = number;
  }
  validateTextRecordStructure(document, original, id);
  return {offset: field.offset, length: field.length};
}
