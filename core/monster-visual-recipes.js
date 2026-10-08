// @editor-module 统一解码怪物图形配方及战斗排布占格信息。
//
// monster-visual-layout 同时服务于立绘渲染和战斗排布。前者需要 tile、bank、调色板，
// 后者只需要怪物在 16×16 排布网格中占几格；两种消费都必须从这里取得语义结果，
// 不能各自解释 dimension、bank_code 或布局指针等物理字段。

export const MONSTER_SEQUENTIAL_GRAPHICS = 72;

const LAYOUT_BANK_PRG_BASE = 0x022000;
const DUAL_PALETTE_GRAPHICS = 18;
const UNIVERSAL_BACKGROUND = 0x0f;
const PALETTE_PAIR_COUNT = 0x1b;
const ATTACK_SELECTION_SLOTS = 6;
const recipeCaches = new WeakMap();
const footprintCaches = new WeakMap();

function integer(value, label, minimum, maximum) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < minimum || result > maximum) {
    throw new TypeError(`${label}: 必须是 ${minimum}..${maximum} 的整数`);
  }
  return result;
}

/** 把 `{id, value}` 稳定字节记录还原成扁平数组。 */
function byteRecords(records, label) {
  if (!Array.isArray(records) || !records.length) {
    throw new TypeError(`${label}: 缺少稳定字节记录`);
  }
  const result = new Uint8Array(records.length);
  const seen = new Set();
  for (const record of records) {
    const id = integer(record?.id, `${label}.id`, 0, records.length - 1);
    if (seen.has(id)) throw new TypeError(`${label}: 字节记录 ${id} 重复`);
    result[id] = integer(record?.value, `${label}[${id}].value`, 0, 0xff);
    seen.add(id);
  }
  if (seen.size !== records.length) {
    throw new TypeError(`${label}: 字节记录不连续`);
  }
  return result;
}

/** `_monster_bank_set`：$F0 以上是三连页的特殊码。 */
export function bankSet(bankCode, specialRoots) {
  if (bankCode < 0xf0) return [bankCode];
  const index = bankCode & 0x0f;
  if (index >= specialRoots.length) {
    throw new TypeError(`怪物多页 bank 码无效：${bankCode.toString(16)}`);
  }
  const first = specialRoots[index];
  return [first, first + 1, first + 2];
}

/** `_monster_stream_length`。 */
export function streamLength(graphicId, dimension) {
  const cells = (dimension >> 4) * 2 * ((dimension & 0x0f) * 2);
  return graphicId < MONSTER_SEQUENTIAL_GRAPHICS ? Math.ceil(cells / 8) : cells;
}

// AttackCmd13_AlternateSpawnObject ($17:$BA9E) 先以图形 ID 取一对
// 源锚点；X 的 bit7 表示按本次 AI 六槽序号跳到尾部变体记录。
export function attackSourceAnchor(records, graphicId, selectionSlot) {
  let recordId = graphicId;
  const visited = new Set();
  while (!visited.has(recordId)) {
    visited.add(recordId);
    const offset = recordId * 2;
    if (offset < 0 || offset + 1 >= records.length) return null;
    const rawX = records[offset];
    const rawY = records[offset + 1];
    if (rawX & 0x80) {
      recordId = ((rawX & 0x7f) + selectionSlot) & 0xff;
      continue;
    }
    // 负 Y 会让原处理器落入 `$12` 目标锚点分支；此处没有固定源点。
    if (rawY & 0x80) return null;
    return Object.freeze({
      x: rawX,
      y: rawY,
      recordId,
      redirected: recordId !== graphicId,
    });
  }
  throw new TypeError(`怪物攻击锚点 ${graphicId} 出现重定向环`);
}

/** `decode_monster_layout`：返回 `null` 表示该格不画图块。 */
export function decodeLayout(graphicId, dimension, tileOffset, stream) {
  const width = (dimension >> 4) * 2;
  const height = (dimension & 0x0f) * 2;
  const cells = width * height;
  const tiles = [];
  if (graphicId < MONSTER_SEQUENTIAL_GRAPHICS) {
    if (!Number.isInteger(tileOffset)) {
      throw new TypeError(`怪物图形 ${graphicId} 缺少 tile_offset`);
    }
    if (stream.length < Math.ceil(cells / 8)) throw new TypeError("monster mask stream is truncated");
    let next = tileOffset;
    for (let cell = 0; cell < cells; cell += 1) {
      if (stream[cell >> 3] & (0x80 >> (cell & 7))) {
        next = (next + 1) & 0xff;
        tiles.push(next);
      } else {
        tiles.push(null);
      }
    }
  } else {
    for (let cell = 0; cell < Math.min(cells, stream.length); cell += 1) {
      const value = stream[cell];
      tiles.push(value === 0xff ? null : value);
    }
  }
  return {width, height, tiles};
}

/** `_monster_dual_palette_layouts`：$FF 分隔的 2 bit 属性图。 */
export function dualPaletteCells(raw, dimensions, {sourceDetails = false, rejectTrailing = false} = {}) {
  // $17:$BED6 把 $8BB5 装进间接指针，读取前先自增，所以第 0 字节是记录 0 的前驱。
  let cursor = 1;
  const result = new Map();
  for (let graphicId = 0; graphicId < DUAL_PALETTE_GRAPHICS; graphicId += 1) {
    const end = raw.indexOf(0xff, cursor);
    if (end < 0) throw new TypeError("怪物双调色板属性表被截断");
    const stream = raw.subarray(cursor, end);
    const dimension = dimensions.get(graphicId) ?? 0;
    const cellCount = (dimension >> 4) * (dimension & 0x0f);
    if (stream.length !== Math.ceil(cellCount / 4)) {
      throw new TypeError(`怪物调色板布局 ${graphicId} 长度不符`);
    }
    const cells = [];
    for (let index = 0; index < cellCount; index += 1) {
      cells.push((stream[index >> 2] >> (6 - (index & 3) * 2)) & 0x03);
    }
    result.set(graphicId, {
      ...(sourceDetails ? {streamOffset: cursor, stream: Array.from(stream)} : {}),
      attributeWidth: dimension >> 4,
      attributeHeight: dimension & 0x0f,
      cells,
    });
    cursor = end + 1;
  }
  if (rejectTrailing && cursor !== raw.length) throw new TypeError("monster dual-palette layout table has trailing bytes");
  return result;
}

/** `_monster_palette_ids`：$80 以上取配对表。 */
export function paletteIdsOf(code, pairs) {
  if (code < 0x80) return [code];
  const pairId = code & 0x7f;
  if (pairId >= PALETTE_PAIR_COUNT) {
    throw new TypeError(`怪物调色板配对码无效：${code.toString(16)}`);
  }
  const pair = pairs.get(pairId);
  if (!pair) throw new TypeError(`怪物调色板配对 ${pairId} 缺失`);
  return [pair.first, pair.second];
}

/**
 * 把可编辑的 `monster-visual-layout` 正文解成渲染配方。
 *
 * 缓存以 document identity 为键（WeakMap）：正文换了缓存自动失效。
 */
export function monsterVisualRecipes(document_) {
  if (!document_ || typeof document_ !== "object") {
    throw new TypeError("monster-visual-layout 配方正文不可用");
  }
  const cached = recipeCaches.get(document_);
  if (cached) return cached;
  const graphics = document_.graphics;
  if (!Array.isArray(graphics) || !graphics.length) {
    throw new TypeError("monster-visual-layout 缺少 graphics");
  }
  const specialRoots = byteRecords(document_.special_bank_roots, "special_bank_roots");
  const attackSourceAnchors = byteRecords(
    document_.attack_source_anchor_region, "attack_source_anchor_region");
  const layoutRegion = byteRecords(document_.layout_region, "layout_region");
  const dualRaw = byteRecords(
    document_.dual_palette_layout_region, "dual_palette_layout_region");

  const dimensions = new Map();
  for (const graphic of graphics) {
    dimensions.set(
      integer(graphic?.id, "graphic.id", 0, 0xff),
      integer(graphic?.dimension, "graphic.dimension", 0, 0xff));
  }
  const dualLayouts = dualPaletteCells(dualRaw, dimensions);
  const layoutStart = Math.min(...graphics.map(graphic =>
    LAYOUT_BANK_PRG_BASE
    + integer(graphic?.layout_pointer_cpu, "layout_pointer_cpu", 0, 0xffff)
    - 0x8000 + 1));

  const palettes = new Map();
  for (const record of document_.palettes || []) {
    const colors = record?.colors;
    if (!Array.isArray(colors) || colors.length !== 3) {
      throw new TypeError(`怪物调色板 ${record?.id} 必须是 3 个 ROM 颜色`);
    }
    palettes.set(integer(record.id, "palette.id", 0, 0xff), [
      UNIVERSAL_BACKGROUND,
      ...colors.map((value, index) =>
        integer(value, `palette.colors[${index}]`, 0, 0x3f)),
    ]);
  }
  const pairs = new Map();
  for (const record of document_.palette_pairs || []) {
    pairs.set(integer(record?.id, "palette_pair.id", 0, 0xff), {
      first: integer(record?.first_palette_id, "first_palette_id", 0, 0xff),
      second: integer(record?.second_palette_id, "second_palette_id", 0, 0xff),
    });
  }

  const byGraphic = new Map();
  for (const graphic of graphics) {
    const id = Number(graphic.id);
    const dimension = Number(graphic.dimension);
    const banks = bankSet(
      integer(graphic?.bank_code, "graphic.bank_code", 0, 0xff), specialRoots);
    const length = streamLength(id, dimension);
    const offset = LAYOUT_BANK_PRG_BASE + Number(graphic.layout_pointer_cpu)
      - 0x8000 + 1 - layoutStart;
    if (offset < 0 || offset + length > layoutRegion.length) {
      throw new TypeError(`怪物布局 ${id} 指向紧凑记录区之外`);
    }
    const {width, height, tiles} = decodeLayout(
      id,
      dimension,
      id < MONSTER_SEQUENTIAL_GRAPHICS ? Number(graphic.tile_offset) : null,
      layoutRegion.subarray(offset, offset + length));
    byGraphic.set(id, {
      id,
      banks,
      widthTiles: width,
      heightTiles: height,
      tiles,
      dual: dualLayouts.get(id) || null,
      attackAnchors: Object.freeze(Array.from(
        {length: ATTACK_SELECTION_SLOTS},
        (_, selectionSlot) => attackSourceAnchor(
          attackSourceAnchors, id, selectionSlot),
      )),
    });
  }

  const byEnemy = new Map();
  for (const enemy of document_.enemies || []) {
    const id = integer(enemy?.id, "enemy.id", 0, 0xff);
    byEnemy.set(id, {
      id,
      graphicId: integer(enemy?.graphic_id, "enemy.graphic_id", 0, 0xff),
      paletteIds: paletteIdsOf(
        integer(enemy?.palette_code, "enemy.palette_code", 0, 0xff), pairs),
    });
  }

  const result = {byGraphic, byEnemy, palettes};
  recipeCaches.set(document_, result);
  return result;
}

/**
 * 给战斗排布使用的语义投影。网格消费者只看到占格和像素尺寸，不接触 dimension。
 */
export function monsterFormationFootprints(document_) {
  const cached = footprintCaches.get(document_);
  if (cached) return cached;
  const {byGraphic, byEnemy} = monsterVisualRecipes(document_);
  const result = [...byEnemy.values()].map(enemy => {
    const figure = byGraphic.get(enemy.graphicId);
    if (!figure) {
      throw new TypeError(`怪物 ${enemy.id} 引用了不存在的图形 ${enemy.graphicId}`);
    }
    return Object.freeze({
      monsterId: enemy.id,
      graphicId: enemy.graphicId,
      widthCells: figure.widthTiles / 2,
      heightCells: figure.heightTiles / 2,
      widthPixels: figure.widthTiles * 8,
      heightPixels: figure.heightTiles * 8,
      attackAnchors: figure.attackAnchors,
    });
  }).sort((left, right) => left.monsterId - right.monsterId);
  const frozen = Object.freeze(result);
  footprintCaches.set(document_, frozen);
  return frozen;
}
