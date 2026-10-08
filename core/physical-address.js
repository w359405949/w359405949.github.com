// @editor-module 校验与格式化物理地址，解析跳转目标并汇总范围。
//
// 这是 engine/tools/byte_map/producer.py 里 ADDRESS_SPACES / format_physical_address
// 的浏览器镜像。两边必须一起改：Python 落盘 `address_spaces[]`，本模块只做
// 格式化与校验，不重新推导任何地址。
//
// 一项内容的物理地址只有两段：`<space>:<offset>`。空间按**介质**命名，不按
// 用途命名——`sram` 那 8 KiB 里只有 $6800-$6FFF 两个 1 KiB 槽是存档，其余是
// UI、活动状态、地图和战斗工作区；「存档」是这块 SRAM 的一个用途视图，用途
// 名留给 save-codec 与 field_id（`save.slot.1.gold`），不进物理地址。
//
// **bank 不进地址**：它是 prg/chr 自己的内禀属性（`bank_size`），外部消费者
// 不需要关心。三段式 `space:bank:offset` 会把「起点落在 bank 3」写成「属于
// bank 3」，而 PRG 15 条、CHR 16 条注解本来就跨 bank。需要 bank 的视图（CHR
// 图块导航等）自己用 addressBank() 现算。

export const ADDRESS_SPACE_IDS = Object.freeze(["prg", "chr", "sram"]);

// 只放格式化必需的静态属性；length / cpu_base 等按 ROM 变化的量一律从落盘的
// address_spaces[] 读，不在这里复制一份。
const OFFSET_DIGITS = Object.freeze({prg: 6, chr: 6, sram: 4});
const BANK_SIZE = Object.freeze({prg: 0x2000, chr: 0x400, sram: 0x2000});

export function isAddressSpace(space) {
  return ADDRESS_SPACE_IDS.includes(String(space));
}

/** `sram:07F0` / `prg:061A40` —— 一项内容的物理地址的唯一写法。 */
export function formatPhysicalAddress(space, offset) {
  const id = String(space);
  const digits = OFFSET_DIGITS[id];
  const value = Number(offset);
  if (digits === undefined || !Number.isInteger(value) || value < 0) return null;
  return `${id}:${value.toString(16).toUpperCase().padStart(digits, "0")}`;
}

/** 从 `{space, offset}` 形状的地址直接取物理地址串。 */
export function physicalAddressOf(address) {
  if (!address) return null;
  const offset = address.offset ?? address.prg_offset ?? address.chr_offset;
  if (offset === null || offset === undefined) return null;
  return formatPhysicalAddress(address.space, offset);
}

/**
 * 物理地址对应的字节地图深链。
 *
 * CHR 页面以 16 字节图块为最小可选单位，所以 `focus` 是包含目标字节的 tile；
 * `offset` 仍保留精确的 CHR 字节偏移，调用方不需要重新理解各页面的查询参数。
 */
export function physicalAddressTarget(address) {
  const space = String(address?.space || "");
  if (address?.offset === null || address?.offset === undefined) return null;
  const offset = Number(address?.offset);
  if (!isAddressSpace(space) || !Number.isInteger(offset) || offset < 0) return null;
  if (space === "prg") {
    return {space, offset, view: "bytemap-prg", parameter: "romOffset", focus: offset};
  }
  if (space === "chr") {
    return {
      space,
      offset,
      view: "bytemap-chr",
      parameter: "chrTile",
      focus: Math.floor(offset / 16),
    };
  }
  return {space, offset, view: "bytemap-sram", parameter: "sramOffset", focus: offset};
}

function primaryRangeRank(range) {
  const explicit = range?.primary === true || range?.is_primary === true ? 0 : 1;
  const priority = Number(range?.display_priority ?? range?.priority);
  return [explicit, Number.isFinite(priority) ? priority : Number.MAX_SAFE_INTEGER];
}

function comparePhysicalRanges(left, right) {
  const [leftExplicit, leftPriority] = primaryRangeRank(left);
  const [rightExplicit, rightPriority] = primaryRangeRank(right);
  return leftExplicit - rightExplicit
    || leftPriority - rightPriority
    || Number(left.offset) - Number(right.offset)
    || Number(left.length ?? 0) - Number(right.length ?? 0);
}

/**
 * 把一行资源的若干物理片段规范为统一展示模型。
 *
 * `ranges` 按地址空间、primary 与 display_priority 排好，供地址列逐段显示全部
 * 非连续起点；`entries` 仍给只需每种介质一个语义入口的导航逻辑使用。当前字节
 * 地图没有为所有资源声明 primary，因此缺省时再按物理偏移稳定排序，不能依赖
 * producer 的输入顺序。
 */
export function summarizePhysicalRanges(ranges) {
  const valid = (Array.isArray(ranges) ? ranges : []).filter(range => (
    isAddressSpace(range?.space)
      && range?.offset !== null
      && range?.offset !== undefined
      && Number.isInteger(Number(range?.offset))
      && Number(range.offset) >= 0
  ));
  if (!valid.length) {
    return {
      kind: "unregistered",
      totalRangeCount: 0,
      remainingRangeCount: 0,
      ranges: [],
      entries: [],
    };
  }
  const groups = new Map();
  for (const range of valid) {
    const space = String(range.space);
    if (!groups.has(space)) groups.set(space, []);
    groups.get(space).push(range);
  }
  for (const group of groups.values()) group.sort(comparePhysicalRanges);
  const spaces = ADDRESS_SPACE_IDS.filter(space => groups.has(space));
  const entries = spaces.map(space => {
    const group = groups.get(space);
    return {space, range: group[0], rangeCount: group.length};
  });
  const kind = valid.length === 1
    ? "single"
    : entries.length === 1 ? "same-space-multi" : "cross-space";
  return {
    kind,
    totalRangeCount: valid.length,
    remainingRangeCount: valid.length - entries.length,
    ranges: spaces.flatMap(space => groups.get(space)),
    entries,
  };
}


/** bank 是派生量，不是地址的一部分；只给确实按 bank 组织的视图用。 */
export function addressBank(space, offset) {
  const size = BANK_SIZE[String(space)];
  if (size === undefined || !Number.isInteger(Number(offset))) return null;
  return Math.floor(Number(offset) / size);
}


/** Canonical imported ROM range. CPU mapping and confidence are optional metadata. */
export function romPhysicalAddress({space, offset, length, cpu_address = null, confidence = null}) {
  if (!["prg", "chr"].includes(space)) throw new Error(`unsupported ROM address space: ${space}`);
  if (!["number", "boolean"].includes(typeof offset) || !["number", "boolean"].includes(typeof length)
      || offset < 0 || length < 1) throw new Error(`invalid ${space} range: offset=${offset} length=${length}`);
  const address = {space, offset, length, end_exclusive: Number(offset) + Number(length)};
  if (cpu_address !== null) address.cpu_address = cpu_address;
  if (confidence !== null) address.confidence = confidence;
  return address;
}

/** Import a file range only when it lies wholly in the declared PRG or CHR payload.
 * Header, trainer and trailing bytes have no canonical physical address.
 * Overlapping declarations retain the original PRG-first resolution order.
 */
export function romFileRange({offset, length, rom}) {
  const numeric = value => {
    if (!["number", "boolean"].includes(typeof value)) throw new TypeError("ROM range requires numeric offsets and lengths");
    return Number(value);
  };
  const end = numeric(offset) + numeric(length);
  const prgStart = numeric(rom.prg_file_offset), chrStart = numeric(rom.chr_file_offset);
  const prgEnd = prgStart + numeric(rom.prg_rom_bytes), chrEnd = chrStart + numeric(rom.chr_rom_bytes);
  if (offset >= prgStart && end <= prgEnd) return romPhysicalAddress({space: "prg", offset: offset - prgStart, length});
  if (offset >= chrStart && end <= chrEnd) return romPhysicalAddress({space: "chr", offset: offset - chrStart, length});
  throw new Error("ROM file range is not inside the PRG or CHR address space (header, trainer and trailing bytes have no physical address)");
}
