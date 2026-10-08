// @editor-module 构造攻击 CHR 上下文与不透明 tile 引用，解析像素和 owner 投影。
//
// battle-object-layout 的正文只保存本模块构造的不透明 tile reference。页面不知道
// PPU selector、bank、tile 编号或编码宽度；只有 shared-chr-bank owner 组件会按 VM context
// 解析像素，只有 visual-core compiler 会把 reference 还原为一字节 payload。

const ATTACK_CHR_CONTEXT_REFERENCE_SCHEMA =
  "metalmaxcn.shared-chr-bank-attack-context-reference";
const STATUS_CHR_CONTEXT_REFERENCE_SCHEMA =
  "metalmaxcn.shared-chr-bank-status-context-reference";
const ATTACK_CHR_TILE_REFERENCE_SCHEMA =
  "metalmaxcn.shared-chr-bank-attack-tile-reference";
const VISUAL_CHR_RESOURCE_ID = "shared-chr-bank";
export const BATTLE_ACTION_RESOURCE_ID = "battle-action";
export const BATTLE_OBJECT_LAYOUT_RESOURCE_ID = "battle-object-layout";
export const VISUAL_METASPRITES_RESOURCE_ID = "metasprite-record";
export const BATTLE_LAYOUT_CONTEXT_SOURCE = Object.freeze([
  Object.freeze({schema: "weapon-attack-parameter"}),
  Object.freeze({schema: "project.visuals", documentPath: Object.freeze(["metasprites", "contexts"])}),
  Object.freeze({resourceId: VISUAL_METASPRITES_RESOURCE_ID}),
  Object.freeze({resourceId: "ui-vehicle-status"}),
  Object.freeze({resourceId: "sprite-palette"}),
  Object.freeze({resourceId: BATTLE_ACTION_RESOURCE_ID}),
  Object.freeze({resourceId: BATTLE_OBJECT_LAYOUT_RESOURCE_ID}),
  Object.freeze({resourceId: "vehicle-visual-selector"}),
]);
export const BATTLE_LAYOUT_TILE_SOURCE = Object.freeze({resourceId: VISUAL_CHR_RESOURCE_ID});

/** 四组，每组三个非透明色；0 号位是硬件通用色，不在 ROM 里，也不可编辑。 */
export const EFFECT_PALETTE_GROUP_COUNT = 4;
const EFFECT_PALETTE_UNIVERSAL_COLOR = 0x0f;

const OPAQUE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TILE_SALT = 0x4d21;
const CONTEXT_SALT = 0xa76b;

function byte(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 0xff) {
    throw new TypeError(`${label} 必须是 0..255 的整数`);
  }
  return number;
}

function opaqueToken(value, salt) {
  const mixed = (value * 40503 + salt) & 0xffff;
  return [15, 10, 5, 0]
    .map(shift => OPAQUE_ALPHABET[(mixed >> shift) & 0x1f])
    .join("");
}

const TILE_TOKENS = Object.freeze(Array.from(
  {length: 0x100}, (_, value) => opaqueToken(value, TILE_SALT),
));
const CONTEXT_TOKENS = Object.freeze(Array.from(
  {length: 0x100}, (_, value) => opaqueToken(value, CONTEXT_SALT),
));
const STATUS_CONTEXTS = new Map();
const TILE_VALUES = new Map(TILE_TOKENS.map((token, value) => [token, value]));
const CONTEXT_VALUES = new Map(
  CONTEXT_TOKENS.map((token, value) => [token, value]),
);
const CHR_BANK_CACHES = new WeakMap();
const TILE_CANDIDATE_CACHES = new WeakMap();
const PROJECTED_OWNER_ASSETS = new WeakSet();

function opaqueReference(schema, token) {
  return Object.freeze({schema, resource_id: VISUAL_CHR_RESOURCE_ID, token});
}

function referenceToken(reference, schema, values, label) {
  if (!reference || typeof reference !== "object" || Array.isArray(reference)
      || Object.keys(reference).sort().join("|") !== "resource_id|schema|token"
      || reference.schema !== schema
      || reference.resource_id !== VISUAL_CHR_RESOURCE_ID
      || typeof reference.token !== "string"
      || !values.has(reference.token)) {
    throw new TypeError(`${label} 不是 shared-chr-bank owner 的不透明引用`);
  }
  return reference.token;
}

/** Owner/publisher boundary: turn one encoded selector into a logical reference. */
function attackChrTileReference(value) {
  return opaqueReference(
    ATTACK_CHR_TILE_REFERENCE_SCHEMA,
    TILE_TOKENS[byte(value, "攻击 CHR tile 编码")],
  );
}

/** Owner/compiler boundary; views must never call this function. */
export function attackChrTileEncoding(reference) {
  return TILE_VALUES.get(referenceToken(
    reference,
    ATTACK_CHR_TILE_REFERENCE_SCHEMA,
    TILE_VALUES,
    "攻击 CHR tile 引用",
  ));
}

/** VM/owner boundary: hide opcode-$04's physical mode from consumers. */
export function attackChrContextReference(value) {
  return opaqueReference(
    ATTACK_CHR_CONTEXT_REFERENCE_SCHEMA,
    CONTEXT_TOKENS[byte(value, "攻击 CHR context 编码")],
  );
}

function attackChrContextEncoding(reference) {
  return CONTEXT_VALUES.get(referenceToken(
    reference,
    ATTACK_CHR_CONTEXT_REFERENCE_SCHEMA,
    CONTEXT_VALUES,
    "攻击 CHR context 引用",
  ));
}

function statusChrContextReference(base, action, palette) {
  if (!Number.isInteger(base) || base < 0 || base > 0xfe || base % 2
      || !Number.isInteger(action) || action < 0 || action > 0xff
      || !Array.isArray(palette) || palette.length !== 4
      || palette.some(color => !Number.isInteger(color) || color < 0 || color > 0x3f)) {
    throw new TypeError("状态页 CHR 上下文无效");
  }
  const token = opaqueToken(base * 0x100 + action, CONTEXT_SALT);
  STATUS_CONTEXTS.set(token, {base, palette});
  return opaqueReference(STATUS_CHR_CONTEXT_REFERENCE_SCHEMA, token);
}

function statusChrContext(reference) {
  const token = referenceToken(reference, STATUS_CHR_CONTEXT_REFERENCE_SCHEMA,
    STATUS_CONTEXTS, "状态页 CHR context 引用");
  return STATUS_CONTEXTS.get(token);
}

export function attackChrReferenceKey(reference) {
  if (!reference || typeof reference !== "object") return "";
  return `${reference.schema || ""}:${reference.resource_id || ""}:${reference.token || ""}`;
}

function attackChrReferencesEqual(left, right) {
  return attackChrReferenceKey(left) === attackChrReferenceKey(right);
}

/** Let renderers preserve an explicitly supplied Working-owner projection. */
export function isBattleObjectOwnerProjection(value) {
  return Boolean(value && typeof value === "object"
    && PROJECTED_OWNER_ASSETS.has(value));
}

/** Owner/renderer bridge; UI code receives only the context reference. */
export function resolveAttackChrPatternBanks(contextReference) {
  if (contextReference?.schema === STATUS_CHR_CONTEXT_REFERENCE_SCHEMA) {
    const {base} = statusChrContext(contextReference);
    return [base, base + 1];
  }
  const mode = attackChrContextEncoding(contextReference);
  return [0x24, 0x25, mode & 0xfe, mode | 0x01];
}

function requireChrDocument(documentValue) {
  if (!documentValue || typeof documentValue !== "object"
      || !Array.isArray(documentValue.banks)) {
    throw new TypeError("shared-chr-bank owner 正文不可用");
  }
  const cached = CHR_BANK_CACHES.get(documentValue);
  if (cached) return cached;
  const banks = new Map();
  documentValue.banks.forEach((bank, index) => {
    const id = byte(bank?.id, `shared-chr-bank bank ${index + 1}`);
    if (banks.has(id) || !Array.isArray(bank?.tiles) || bank.tiles.length !== 64) {
      throw new TypeError("shared-chr-bank owner bank 候选为空、重复或不完整");
    }
    banks.set(id, bank);
  });
  CHR_BANK_CACHES.set(documentValue, banks);
  return banks;
}

function requireTile(bank, tileId) {
  const tile = bank?.tiles?.find(item => Number(item?.id) === tileId);
  if (!tile || !Array.isArray(tile.plane_0) || tile.plane_0.length !== 8
      || !Array.isArray(tile.plane_1) || tile.plane_1.length !== 8) {
    throw new TypeError("shared-chr-bank owner tile 候选不完整");
  }
  return tile;
}

/**
 * Resolve a logical tile under one attack context to paintable 2bpp pixels.
 * The return value deliberately carries no bank/tile/selector identity.
 */
function attackChrTilePixels(
  chrDocument,
  contextReference,
  tileReference,
) {
  const banks = requireChrDocument(chrDocument);
  const selector = attackChrTileEncoding(tileReference);
  const contextBanks = resolveAttackChrPatternBanks(contextReference);
  if (selector >= contextBanks.length * 64)
    throw new TypeError("图块超出已查实的状态页 CHR 窗口");
  const bank = banks.get(contextBanks[selector >> 6]);
  if (!bank) throw new TypeError("当前攻击 CHR context 不在 shared-chr-bank owner 中");
  const tile = requireTile(bank, selector & 0x3f);
  const pixels = new Uint8Array(64);
  for (let y = 0; y < 8; y += 1) {
    const low = byte(tile.plane_0[y], "shared-chr-bank plane 0");
    const high = byte(tile.plane_1[y], "shared-chr-bank plane 1");
    for (let x = 0; x < 8; x += 1) {
      const mask = 1 << (7 - x);
      pixels[y * 8 + x] = (low & mask ? 1 : 0) | (high & mask ? 2 : 0);
    }
  }
  return Object.freeze({
    pixels,
    transparent: selector === 0,
  });
}

/** Enumerate the complete logical selector domain without exposing its encoding. */
function attackChrTileCandidates(chrDocument, contextReference) {
  // Resolve every candidate now so a missing context/bank fails before the editor opens.
  let byContext = TILE_CANDIDATE_CACHES.get(chrDocument);
  if (!byContext) {
    byContext = new Map();
    TILE_CANDIDATE_CACHES.set(chrDocument, byContext);
  }
  const contextKey = attackChrReferenceKey(contextReference);
  if (byContext.has(contextKey)) return byContext.get(contextKey);
  const candidates = Object.freeze(TILE_TOKENS.slice(0,
    contextReference?.schema === STATUS_CHR_CONTEXT_REFERENCE_SCHEMA ? 0x80 : 0x100)
    .map((_, value) => {
    const reference = attackChrTileReference(value);
    const resolved = attackChrTilePixels(chrDocument, contextReference, reference);
    return Object.freeze({reference, ...resolved});
  }));
  byContext.set(contextKey, candidates);
  return candidates;
}

function statusLayoutContexts(statusDocument, paletteDocument, originalActions, actions, selectors, handle) {
  const artifacts = statusDocument?.portrait_part_art;
  if (!Array.isArray(artifacts)) return [];
  const byAction = new Map(actions.map(action => [
    `battle-action:${action.id.toString(16).toUpperCase().padStart(2, "0")}`, action,
  ]));
  const originals = new Map(originalActions.map(action => [
    `battle-action:${action.id.toString(16).toUpperCase().padStart(2, "0")}`, action,
  ]));
  const result = new Map();
  for (const art of artifacts) {
    const current = byAction.get(art?.action_reference?.resource_id);
    if (!current || current.layout_reference !== handle) continue;
    const action = originals.get(art?.action_reference?.resource_id);
    if (!action || !Array.isArray(action.tiles) || !Array.isArray(art.tiles)
        || art.width !== action.columns * 8 || art.height !== action.rows * 8
        || art.sprite_palette_slot !== (action.config & 3)
        || art.tiles.length !== action.tiles.filter(tile => tile !== 0).length) {
      throw new TypeError(`${handle} 的状态页图像与战斗布局不一致`);
    }
    const bases = new Set();
    for (const tile of art.tiles) {
      const x = Number(tile.x), y = Number(tile.y);
      const index = y / 8 * action.columns + x / 8;
      const selector = action.tiles[index];
      const physical = tile.chr_reference;
      if (!Number.isInteger(index) || !Number.isInteger(selector) || selector === 0
          || selector >= 0x80 || physical?.resource_id !== VISUAL_CHR_RESOURCE_ID
          || physical.tile_id !== selector % 64) {
        throw new TypeError(`${handle} 的状态页图块来源不一致`);
      }
      bases.add(physical.bank_id - Math.floor(selector / 64));
    }
    if (bases.size !== 1) throw new TypeError(`${handle} 的状态页 CHR 来源不唯一`);
    const [originalBase] = bases;
    if (!Number.isInteger(originalBase) || originalBase < 0 || originalBase > 0xfe || originalBase % 2)
      throw new TypeError(`${handle} 的状态页 CHR 来源无效`);
    const selector = selectors?.status_sprite_chr_banks?.find(row => row.chassis_id === art.chassis_id);
    if (!selector || !Number.isInteger(selector.chr_bank) || selector.chr_bank < 0
        || selector.chr_bank > 255 || ![1, 2].includes(current.palette_id))
      throw new TypeError(`${handle} 的状态页选择器或调色板不可用`);
    const base = selector.chr_bank & 0xfe;
    const paletteRecord = paletteDocument?.records?.find(record =>
      record.id === 0x12 + current.palette_id - 1);
    const palette = [0x0f, ...(paletteRecord?.fields?.nontransparent_colors || [])];
    const reference = statusChrContextReference(base, current.id, palette);
    result.set(attackChrReferenceKey(reference), {
      reference, label: `状态 $${art.chassis_id.toString(16).toUpperCase()} · 动作 $${
        current.id.toString(16).toUpperCase().padStart(2, "0")} · CHR $${
        base.toString(16).toUpperCase()}/$${(base + 1).toString(16).toUpperCase()}`,
    });
  }
  return [...result.values()];
}

/** Resolve a layout only through actions observed under published ROM CHR contexts. */
export function battleLayoutTileBinding({contexts: sources, candidates: chrDocument, consumer, value}) {
  const [assets, visualContexts, metaspriteDocument, statusDocument, paletteDocument,
    actionDocument, layoutDocument, selectors] =
    Array.isArray(sources) ? sources : [];
  const {handle, sourceOffset, tileCount} = consumer || {};
  if (!/^battle-object-layout:[0-9A-F]{3}$/u.test(handle || "")
      || !Number.isInteger(sourceOffset) || !Array.isArray(value)
      || value.length !== tileCount || !Array.isArray(assets?.battle_objects?.actions)
      || !Array.isArray(assets?.clean_animations?.action_previews?.context_atlases)
      || !Array.isArray(visualContexts) || !metaspriteDocument) {
    throw new TypeError("战斗布局图块的已发布来源或数组形状无效");
  }
  const layout = layoutRecords(layoutDocument).get(handle);
  if (layout?.source?.offset !== sourceOffset)
    throw new TypeError(`${handle} 的布局来源不一致`);
  const actions = projectBattleObjectOwners(assets, actionDocument, layoutDocument, metaspriteDocument)
    .battle_objects.actions.filter(action => action.available === true && action.layout_reference === handle);
  const actionIds = new Set(actions.map(action => action.id));
  const modes = [...new Set(assets.clean_animations.action_previews.context_atlases
    .filter(atlas => atlas.used_actions?.some(id => actionIds.has(id)))
    .map(atlas => atlas.chr_effect_bank))];
  const vehicleActions = actions.length > 0 && actions.every(action =>
    Number.isInteger(action.id) && action.id >= 1 && action.id <= 8);
  const battleUi = visualContexts.find(context => context.pair === 0x94
    && context.kind === "battle-ui" && context.source_prg_offset === 0x28aba
    && context.chr_banks?.join(",") === "36,37,38,39"
    && Array.isArray(context.palettes) && context.palettes.length === 4);
  if (vehicleActions && battleUi && !modes.includes(battleUi.chr_banks[2]))
    modes.push(battleUi.chr_banks[2]);
  const statusContexts = statusLayoutContexts(statusDocument, paletteDocument,
    assets.battle_objects.actions, actions, selectors, handle);
  if (!modes.length && !statusContexts.length)
    throw new TypeError(`${handle} 没有已发布的实际 CHR 使用上下文`);
  const shape = actions.find(action => action.columns * action.rows === tileCount);
  if (!shape || shape.columns > 8 || shape.rows > 8)
    throw new TypeError(`${handle} 没有已发布的图块排列`);
  const contexts = [...modes.map(attackChrContextReference),
    ...statusContexts.map(item => item.reference)];
  const palette = vehicleActions ? effectPaletteValues(metaspriteDocument)
    .slice(shape.palette_id * 4, shape.palette_id * 4 + 4) : null;
  const paletteFor = context => context?.schema === STATUS_CHR_CONTEXT_REFERENCE_SCHEMA
    ? statusChrContext(context).palette : palette;
  const pixels = (context, reference) => ({...attackChrTilePixels(chrDocument, context, reference),
    ...(paletteFor(context) ? {palette: paletteFor(context)} : {})});
  const clone = reference => reference.schema === ATTACK_CHR_CONTEXT_REFERENCE_SCHEMA
    ? attackChrContextReference(attackChrContextEncoding(reference))
    : reference.schema === STATUS_CHR_CONTEXT_REFERENCE_SCHEMA
      ? opaqueReference(STATUS_CHR_CONTEXT_REFERENCE_SCHEMA,
        referenceToken(reference, STATUS_CHR_CONTEXT_REFERENCE_SCHEMA, STATUS_CONTEXTS,
          "状态页 CHR context 引用"))
      : attackChrTileReference(attackChrTileEncoding(reference));
  const adapter = Object.freeze({clone, key: attackChrReferenceKey,
    equal: attackChrReferencesEqual, token: reference => reference.token,
    reference: clone, candidates: context => attackChrTileCandidates(chrDocument, context)
      .map(candidate => ({...candidate, ...(paletteFor(context) ? {palette: paletteFor(context)} : {})})),
    pixels});
  return Object.freeze({contexts, contextLabels: [
    ...modes.map(mode => `CHR $${mode.toString(16).toUpperCase().padStart(2, "0")}`),
    ...statusContexts.map(item => item.label)],
    references: value.map(clone), columns: shape.columns, rows: shape.rows,
    encode: references => references.map(attackChrTileEncoding).map(attackChrTileReference), adapter});
}

function integer(value, label, minimum, maximum) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new TypeError(`${label} 必须是 ${minimum}..${maximum} 的整数`);
  }
  return number;
}

function layoutRecords(documentValue) {
  if (!documentValue || documentValue.module_id !== BATTLE_OBJECT_LAYOUT_RESOURCE_ID
      || !Array.isArray(documentValue.records)
      || Number(documentValue.record_count) !== documentValue.records.length) {
    throw new TypeError("battle-object-layout owner 正文不可用");
  }
  return new Map(documentValue.records.map(record => [String(record?.handle || ""), record]));
}

/**
 * 战斗特效那 16 个色值的唯一读取出口。
 *
 * ROM 里只有 12 字节（`metasprite-record.battle-sprite-palettes`，PRG $022B56
 * 起四条 3 字节记录）；0 号位由硬件补通用色 `$0F`。发布数据里
 * `clean_animations.palette.values` 是同一段字节的**提取快照**——它不随编辑变化，
 * 拿它画预览就等于告诉用户「改了没用」。所以现算，别读那份副本。
 */
export function effectPaletteValues(metaspriteDocument) {
  const records = metaspriteDocument?.battle_sprite_palettes;
  if (!Array.isArray(records) || records.length !== EFFECT_PALETTE_GROUP_COUNT) {
    throw new TypeError("metasprite-record 的 battle_sprite_palettes 正文不可用");
  }
  const values = [];
  for (let group = 0; group < EFFECT_PALETTE_GROUP_COUNT; group += 1) {
    const record = records.find(item => Number(item?.id) === group);
    const colors = record?.colors;
    if (!Array.isArray(colors) || colors.length !== 3) {
      throw new TypeError(`battle_sprite_palettes[${group}] 不是三色记录`);
    }
    values.push(EFFECT_PALETTE_UNIVERSAL_COLOR, ...colors.map((value, index) =>
      integer(value, `battle_sprite_palettes[${group}].colors[${index}]`, 0, 0x3f)));
  }
  return values;
}

export function effectPaletteAfterCommand(palettes, documentValue, selector) {
  const record = documentValue?.records?.find(item =>
    Number(item.legacy_byte_offset) === selector);
  const colors = record?.fields?.nontransparent_colors;
  if (palettes?.length !== 16 || !Array.isArray(colors) || colors.length !== 3) {
    throw new TypeError(`sprite-palette 换色输入不完整：${selector}`);
  }
  const result = Uint8Array.from(palettes);
  result.set(colors.map((value, index) =>
    integer(value, `${record.handle}.colors[${index}]`, 0, 0x3f)), 13);
  return result;
}

/**
 * Overlay the canonical owners onto the VM's read-only extraction projection.
 * Consumers receive the existing VM shape; all byte decoding remains in this adapter.
 *
 * **三个 owner 都是必填的。** 少传一个就会静默退回提取快照，而快照与 owner 只在
 * 「还没人改过」时相等——那正是这种回退最不容易被发现的时候。
 */
export function projectBattleObjectOwners(
  assets,
  actionDocument,
  layoutDocument,
  metaspriteDocument,
) {
  if (!assets || typeof assets !== "object"
      || !Array.isArray(assets.battle_objects?.actions)
      || !actionDocument || actionDocument.module_id !== BATTLE_ACTION_RESOURCE_ID
      || !Array.isArray(actionDocument.records)) {
    throw new TypeError("攻击动作 owner 投影输入不完整");
  }
  const actions = new Map(actionDocument.records.map(record => [Number(record?.id), record]));
  const layouts = layoutRecords(layoutDocument);
  const projected = assets.battle_objects.actions.map(base => {
    const action = actions.get(Number(base?.id));
    if (!action) throw new TypeError(`battle-action:${base?.id} 缺少 canonical owner`);
    if (action.available !== true || action.layout_reference === null) {
      return {...base, available: false};
    }
    const layout = layouts.get(String(action.layout_reference));
    const fields = layout?.fields;
    const origin = fields?.origin;
    const references = fields?.tile_references;
    const columns = integer(action.columns, `${action.handle}.columns`, 1, 8);
    const rows = integer(action.rows, `${action.handle}.rows`, 1, 8);
    const paletteId = integer(action.palette_id, `${action.handle}.palette_id`, 0, 3);
    if (!layout || !origin || !Array.isArray(references)
        || references.length !== columns * rows) {
      throw new TypeError(`${action.handle} 与 ${action.layout_reference} 的定长布局不一致`);
    }
    const originX = integer(
      origin.x_quarter_tiles,
      `${layout.handle}.origin.x_quarter_tiles`,
      0,
      15,
    );
    const originY = integer(
      origin.y_quarter_tiles,
      `${layout.handle}.origin.y_quarter_tiles`,
      0,
      15,
    );
    const tiles = references.map(attackChrTileEncoding);
    return {
      ...base,
      available: true,
      columns,
      rows,
      width: columns * 8,
      height: rows * 8,
      palette_id: paletteId,
      origin: (originX << 4) | originY,
      origin_x_quarter_tiles: originX,
      origin_y_quarter_tiles: originY,
      tiles,
      tile_matrix: Array.from(
        {length: rows},
        (_, row) => tiles.slice(row * columns, (row + 1) * columns),
      ),
      layout_reference: action.layout_reference,
    };
  });
  const values = effectPaletteValues(metaspriteDocument);
  const result = {
    ...assets,
    battle_objects: {...assets.battle_objects, actions: projected},
    clean_animations: {
      ...assets.clean_animations,
      palette: {
        ...(assets.clean_animations?.palette || {}),
        values,
        values_hex: values.map(value =>
          `0x${value.toString(16).toUpperCase().padStart(2, "0")}`),
      },
    },
  };
  PROJECTED_OWNER_ASSETS.add(result);
  return result;
}
