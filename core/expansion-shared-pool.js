// @editor-module 从目标的未绑定扩展区为稳定内容身份分配单 bank 槽。
import {canonicalHash, compareText, sha256Hex} from './rom-linker.js';

const PREFIX = 'expansion-shared-pool.';
const SCHEMA = 'metalmaxcn.expansion-shared-pool';
const BANK_BYTES = 8192;
const requireValue = (value, message) => {if (!value) throw new TypeError(`扩展共用池：${message}`);};
const integer = value => Number.isSafeInteger(value) && value >= 0;
const text = value => typeof value === 'string' && value.trim().length > 0;
const aligned = (offset, alignment) => Math.ceil(offset / alignment) * alignment;
const end = row => row.bank_offset + row.capacity;

function expansionSharedPoolSlotId(contentType, identity) {
  requireValue(text(contentType) && text(identity), '内容类型与稳定身份不能为空');
  return `${PREFIX}${encodeURIComponent(contentType)}:${encodeURIComponent(identity)}`;
}

function baseSlots(buildMap) {
  const allocated = new Set((buildMap.expansion_shared_pool?.allocations || []).map(row => row.slot_id));
  return buildMap.slots.filter(slot => !allocated.has(slot.slot_id));
}

// 剧情合法入口的页绑定全数扣除；读取器、应用目录、大表预算、地图池与固定镜像不参与分配。
export function expansionSharedPoolRanges(buildMap) {
  const slots = baseSlots(buildMap), ranges = [];
  for (const bank of [...Array.from({length: 27}, (_, index) => 0x41 + index), 0x5F]) {
    let cursor = bank === 0x5F ? 3088 : 0;
    const occupied = slots.filter(slot => slot.region === 'prg' && slot.bank_index === bank)
      .sort((a, b) => a.bank_offset - b.bank_offset);
    const append = limit => {
      if (limit <= cursor) return;
      ranges.push({range_id: `${PREFIX}range.${bank.toString(16)}.${cursor.toString(16)}`,
        bank_index: bank, bank_offset: cursor, capacity: limit - cursor,
        file_offset: 16 + bank * BANK_BYTES + cursor, runtime_address: 0x8000 + cursor});
    };
    for (const slot of occupied) {
      append(Math.min(slot.bank_offset, BANK_BYTES));
      cursor = Math.max(cursor, end(slot));
    }
    append(BANK_BYTES);
  }
  return ranges;
}

function validateAllocation(row, ranges) {
  const range = ranges.find(range => range.range_id === row.range_id);
  requireValue(row.slot_id === expansionSharedPoolSlotId(row.content_type, row.identity)
    && text(row.asset_id) && integer(row.capacity) && row.capacity > 0
    && integer(row.alignment) && Number.isInteger(Math.log2(row.alignment))
    && integer(row.offset_in_range) && range && row.offset_in_range + row.capacity <= range.capacity
    && (range.bank_offset + row.offset_in_range) % row.alignment === 0, '分配身份、容量或 bank 边界无效');
  return range;
}

function validateAllocations(rows, ranges) {
  requireValue(Array.isArray(rows) && new Set(rows.map(row => row.slot_id)).size === rows.length,
    '分配身份重复');
  const occupied = new Map();
  for (const row of rows) {
    validateAllocation(row, ranges);
    const peers = occupied.get(row.range_id) || [];
    requireValue(!peers.some(peer => row.offset_in_range < peer.offset_in_range + peer.capacity
      && peer.offset_in_range < row.offset_in_range + row.capacity), '分配槽重叠');
    peers.push(row); occupied.set(row.range_id, peers);
  }
}

function expansionSharedPoolUsage(ranges, allocations) {
  const capacity = ranges.reduce((sum, row) => sum + row.capacity, 0);
  const used = allocations.reduce((sum, row) => sum + row.capacity, 0);
  return {capacity, used, remaining: capacity - used,
    allocations: allocations.map(row => ({...row})),
    banks: [...new Set(ranges.map(row => row.bank_index))].map(bank => {
      const total = ranges.filter(row => row.bank_index === bank).reduce((sum, row) => sum + row.capacity, 0);
      const occupied = allocations.filter(row => ranges.find(range => range.range_id === row.range_id).bank_index === bank)
        .reduce((sum, row) => sum + row.capacity, 0);
      return {bank_index: bank, capacity: total, used: occupied, remaining: total - occupied};
    })};
}

class ExpansionSharedPoolCapacityError extends Error {
  constructor(request, usage, largestFree) {
    const occupied = usage.allocations.map(row => `${row.content_type}/${row.identity}=${row.capacity}`).join(', ') || '无';
    super(`扩展共用池容量不足：${request.content_type}/${request.identity} 所需 ${request.capacity} 字节，`
      + `剩余 ${usage.remaining} 字节，缺口 ${Math.max(0, request.capacity - usage.remaining)} 字节，`
      + `单 bank 最大可用 ${largestFree} 字节；占用 ${usage.used}/${usage.capacity} 字节：${occupied}`);
    this.name = 'ExpansionSharedPoolCapacityError';
    this.required = request.capacity;
    this.shortfall = Math.max(0, request.capacity - usage.remaining);
    this.largest_free = largestFree;
    this.usage = usage;
  }
}

// requests 是当前仍有 Working 的完整集合；撤销的身份不保留分配。
function planExpansionSharedPool(policy, requests, previous = policy?.allocations || []) {
  requireValue(policy?.schema === SCHEMA && Array.isArray(policy.ranges) && Array.isArray(requests), '缺目标池许可');
  const ranges = policy.ranges;
  validateAllocations(previous, ranges);
  const wanted = requests.map(request => {
    const row = {content_type: request.content_type, identity: request.identity, asset_id: request.asset_id,
      slot_id: expansionSharedPoolSlotId(request.content_type, request.identity),
      capacity: request.length, alignment: request.alignment ?? 1};
    requireValue(text(row.asset_id) && integer(row.capacity) && row.capacity > 0
      && integer(row.alignment) && Number.isInteger(Math.log2(row.alignment)), '请求的归属、长度或对齐无效');
    return row;
  }).sort((a, b) => compareText(a.slot_id, b.slot_id));
  requireValue(new Set(wanted.map(row => row.slot_id)).size === wanted.length, '请求身份重复');
  const placed = [], old = new Map(previous.map(row => [row.slot_id, row]));
  const gaps = range => {
    let cursor = 0;
    const free = [];
    for (const row of placed.filter(row => row.range_id === range.range_id)
      .sort((a, b) => a.offset_in_range - b.offset_in_range)) {
      if (cursor < row.offset_in_range) free.push([cursor, row.offset_in_range]);
      cursor = row.offset_in_range + row.capacity;
    }
    if (cursor < range.capacity) free.push([cursor, range.capacity]);
    return free;
  };
  const fits = (row, range, offset) => (range.bank_offset + offset) % row.alignment === 0
    && gaps(range).some(([start, limit]) => start <= offset && offset + row.capacity <= limit);
  for (const row of wanted) {
    const prior = old.get(row.slot_id);
    if (!prior) continue;
    requireValue(prior.asset_id === row.asset_id, '稳定身份的归属改变');
    const range = ranges.find(range => range.range_id === prior.range_id);
    if (row.capacity <= prior.capacity && fits(row, range, prior.offset_in_range))
      placed.push({...row, range_id: range.range_id, offset_in_range: prior.offset_in_range});
  }
  for (const row of wanted.filter(row => !placed.some(item => item.slot_id === row.slot_id))) {
    const prior = old.get(row.slot_id), priorRange = ranges.find(range => range.range_id === prior?.range_id);
    let location = priorRange && fits(row, priorRange, prior.offset_in_range)
      ? {range_id: priorRange.range_id, offset_in_range: prior.offset_in_range} : null;
    let largestFree = 0;
    for (const range of ranges) for (const [start, limit] of gaps(range)) {
      const offset = aligned(range.bank_offset + start, row.alignment) - range.bank_offset;
      largestFree = Math.max(largestFree, limit - offset);
      if (!location && offset + row.capacity <= limit) location = {range_id: range.range_id, offset_in_range: offset};
    }
    if (!location) throw new ExpansionSharedPoolCapacityError(row, expansionSharedPoolUsage(ranges, placed), largestFree);
    placed.push({...row, ...location});
  }
  placed.sort((a, b) => compareText(a.slot_id, b.slot_id));
  return {allocations: placed, usage: expansionSharedPoolUsage(ranges, placed)};
}

// 只生成本次构建的绑定，不改 Origin、Working 或 ROM 字节。
export async function allocateExpansionSharedPool({baseline, target, buildMap, requests, previous}) {
  await validateExpansionSharedPool({baseline, target, buildMap});
  requireValue(await canonicalHash(buildMap) === target.build_map_sha256, '目标未固定池许可摘要');
  const plan = planExpansionSharedPool(buildMap.expansion_shared_pool, requests, previous);
  const map = structuredClone(buildMap), profile = structuredClone(target);
  map.slots = baseSlots(buildMap).map(row => ({...row}));
  map.expansion_shared_pool.allocations = plan.allocations;
  for (const row of plan.allocations) {
    const range = map.expansion_shared_pool.ranges.find(range => range.range_id === row.range_id);
    const offset = row.offset_in_range, fileOffset = range.file_offset + offset;
    map.slots.push({slot_id: row.slot_id, region: 'prg', file_offset: fileOffset,
      capacity: row.capacity, bank_index: range.bank_index, bank_offset: range.bank_offset + offset,
      baseline_bin: range.baseline_bin, preimage_sha256: await sha256Hex(baseline.subarray(fileOffset, fileOffset + row.capacity)),
      owner: row.asset_id, alignment: row.alignment, fill: null, runtime_address: range.runtime_address + offset,
      alias_of: null, mirror_of: null, atomic_group: null});
  }
  map.slots.sort((a, b) => compareText(a.slot_id, b.slot_id));
  profile.build_map_sha256 = await canonicalHash(map);
  return {target: profile, buildMap: map, ...plan};
}

export async function validateExpansionSharedPool({baseline, target, buildMap}) {
  const policy = buildMap.expansion_shared_pool;
  if (!policy) return;
  const prg = target.regions.find(row => row.kind === 'prg');
  requireValue(policy.schema === SCHEMA && target.mapper === 74 && prg?.size === 1048576
    && prg.file_offset === 16 && prg.bank_size === BANK_BYTES
    && policy.baseline_sha256 === target.baseline_sha256 && Array.isArray(policy.ranges), '目标布局或池原像不同');
  const geometry = expansionSharedPoolRanges(buildMap);
  requireValue(policy.ranges.length === geometry.length && policy.ranges.every((row, index) =>
    Object.entries(geometry[index]).every(([key, value]) => row[key] === value)
    && text(row.baseline_bin)), '池范围与未绑定扩展区不同');
  validateAllocations(policy.allocations, policy.ranges);
  const allocated = new Map(policy.allocations.map(row => [row.slot_id, row]));
  requireValue(buildMap.slots.filter(slot => slot.slot_id.startsWith(PREFIX)).length === allocated.size, '池槽与分配明细不同');
  for (const row of policy.allocations) {
    const range = policy.ranges.find(range => range.range_id === row.range_id);
    const slot = buildMap.slots.find(slot => slot.slot_id === row.slot_id);
    requireValue(slot && slot.owner === row.asset_id && slot.region === 'prg'
      && slot.capacity === row.capacity && slot.bank_index === range.bank_index
      && slot.bank_offset === range.bank_offset + row.offset_in_range
      && slot.file_offset === range.file_offset + row.offset_in_range
      && slot.runtime_address === range.runtime_address + row.offset_in_range
      && slot.baseline_bin === range.baseline_bin && slot.alignment === row.alignment
      && slot.fill === null && slot.alias_of === null && slot.mirror_of === null && slot.atomic_group === null,
    '分配槽偏离池许可');
  }
  for (const range of policy.ranges) requireValue(
    await sha256Hex(baseline.subarray(range.file_offset, range.file_offset + range.capacity)) === range.preimage_sha256,
    '池范围原像摘要不同');
}
