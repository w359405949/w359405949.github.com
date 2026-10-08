// @editor-module 角色帧图块的 owner 解析：按帧的已发布 CHR 消费上下文枚举候选与像素。
//
// 同一个 `frames[].tile_a` 数值在不同角色上下文下是不同的图，所以候选与像素都按
// 「帧 → 已发布消费上下文」解析。上下文引用不透明，编号映射、pattern-table 解释与
// 像素解析只留在本模块；消费端（字段对象的图块列、旧引用控件）只拿到操作方法。

const ACTOR_CHR_CONTEXT_SCHEMA = "metalmaxcn.shared-chr-bank-actor-context-reference";
const ACTOR_CHR_TILE_SCHEMA = "metalmaxcn.shared-chr-bank-actor-tile-reference";
const VISUAL_CHR_RESOURCE_ID = "shared-chr-bank";

/** 已发布的角色集／特殊形象正文，帧的消费上下文从这里取。 */
export const VISUAL_ACTORS_CONTEXT_SOURCE = Object.freeze({
  schema: "project.visuals",
  documentPath: Object.freeze(["actors"]),
});

/** 候选与像素的 owner 正文。 */
export const VISUAL_CHR_CANDIDATE_SOURCE = Object.freeze({
  resourceId: VISUAL_CHR_RESOURCE_ID,
});

const OPAQUE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ACTOR_TILE_TOKENS = Object.freeze(Array.from({length: 0x100}, (_, value) => {
  const mixed = (value * 40503 + 0x2b91) & 0xffff;
  return [15, 10, 5, 0].map(shift => OPAQUE_ALPHABET[(mixed >> shift) & 0x1f]).join("");
}));
const ACTOR_TILE_VALUES = new Map(
  ACTOR_TILE_TOKENS.map((token, value) => [token, value]),
);

function plainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function byteValue(value, label) {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) {
    throw new TypeError(`${label} 必须是 u8`);
  }
  return value;
}

function actorChrReference(schema, token) {
  return Object.freeze({schema, resource_id: VISUAL_CHR_RESOURCE_ID, token});
}

function actorChrReferenceToken(reference, schema, tokens, label) {
  if (!plainObject(reference)
      || Object.keys(reference).sort().join("|") !== "resource_id|schema|token"
      || reference.schema !== schema
      || reference.resource_id !== VISUAL_CHR_RESOURCE_ID
      || typeof reference.token !== "string"
      || !tokens.has(reference.token)) {
    throw new TypeError(`${label} 不是 shared-chr-bank owner 的不透明引用`);
  }
  return reference.token;
}

/** 一个帧图块编号（0..255）对应的不透明引用。 */
function actorChrTileReference(value) {
  return actorChrReference(
    ACTOR_CHR_TILE_SCHEMA,
    ACTOR_TILE_TOKENS[byteValue(value, "角色 CHR tile 编码")],
  );
}

/** 不透明引用还原成图块编号；只有 owner 与序列化边界可以用。 */
function actorChrTileEncoding(reference) {
  return ACTOR_TILE_VALUES.get(actorChrReferenceToken(
    reference,
    ACTOR_CHR_TILE_SCHEMA,
    ACTOR_TILE_VALUES,
    "角色 CHR tile 引用",
  ));
}

function actorChrReferenceKey(reference) {
  return `${reference?.schema || ""}:${reference?.resource_id || ""}:${reference?.token || ""}`;
}

function actorChrReferencesEqual(left, right) {
  return actorChrReferenceKey(left) === actorChrReferenceKey(right);
}

/** 帧的已发布消费上下文：常规角色集按动画帧命中，特殊形象按 `context_pairs` 展开。 */
function actorChrContextEntries(actors, frameId) {
  if (!plainObject(actors) || !Array.isArray(actors.sets)
      || !Array.isArray(actors.special_assets)) {
    throw new TypeError("project.visuals.actors owner 正文不可用");
  }
  const sets = new Map();
  actors.sets.forEach((entry, index) => {
    if (!plainObject(entry) || !Number.isInteger(entry.id) || sets.has(entry.id)
        || !plainObject(entry.pattern_table)) {
      throw new TypeError(`角色 CHR owner sets[${index}] 无效或重复`);
    }
    sets.set(entry.id, entry);
  });
  const selected = [];
  actors.sets.forEach(entry => {
    if (Array.isArray(entry.animations) && entry.animations.some(animation =>
      Array.isArray(animation?.frames) && animation.frames.includes(frameId))) {
      selected.push(entry);
    }
  });
  actors.special_assets.forEach((entry, index) => {
    if (!Array.isArray(entry?.frames) || !entry.frames.includes(frameId)) return;
    if (!Array.isArray(entry.context_pairs)) {
      throw new TypeError(`角色 CHR owner special_assets[${index}] 缺少 context_pairs`);
    }
    entry.context_pairs.forEach(setId => {
      const set = sets.get(setId);
      if (!set) throw new TypeError(`角色 CHR owner 上下文 ${setId} 没有已发布 set`);
      selected.push(set);
    });
  });
  // 同一张 pattern table 由多个集共用时是同一个像素来源，标签并列写清是谁给的。
  const unique = new Map();
  selected.forEach(entry => {
    const key = JSON.stringify(entry.pattern_table);
    if (!unique.has(key)) unique.set(key, {pattern_table: entry.pattern_table, labels: []});
    const label = typeof entry.label === "string" && entry.label ? entry.label : `角色集 ${entry.id}`;
    const labels = unique.get(key).labels;
    if (!labels.includes(label)) labels.push(label);
  });
  if (!unique.size) throw new TypeError(`角色帧 ${frameId} 没有已发布 CHR 上下文`);
  return [...unique.values()];
}

function actorChrBanks(documentValue) {
  if (!plainObject(documentValue) || !Array.isArray(documentValue.banks)) {
    throw new TypeError("shared-chr-bank owner 正文不可用");
  }
  const banks = new Map();
  documentValue.banks.forEach((bank, index) => {
    const id = byteValue(bank?.id, `shared-chr-bank bank ${index + 1}`);
    if (banks.has(id) || !Array.isArray(bank?.tiles) || bank.tiles.length !== 64) {
      throw new TypeError("shared-chr-bank owner bank 候选为空、重复或不完整");
    }
    banks.set(id, bank);
  });
  return banks;
}

function actorChrPixels(banks, pattern, tileReference) {
  if (!plainObject(pattern)
      || pattern.schema !== "metalmaxcn.shared-chr-bank-pattern-table-reference"
      || pattern.resource_id !== VISUAL_CHR_RESOURCE_ID
      || !Array.isArray(pattern.banks) || pattern.banks.length !== 4) {
    throw new TypeError("角色 CHR 上下文没有有效的 owner pattern-table 引用");
  }
  const selector = actorChrTileEncoding(tileReference);
  const bank = banks.get(byteValue(pattern.banks[selector >> 6], "角色 CHR context bank"));
  const tileId = selector & 0x3f;
  const tile = bank?.tiles?.find(entry => Number(entry?.id) === tileId);
  if (!tile || !Array.isArray(tile.plane_0) || tile.plane_0.length !== 8
      || !Array.isArray(tile.plane_1) || tile.plane_1.length !== 8) {
    throw new TypeError("当前角色 CHR context 在 shared-chr-bank owner 中不完整");
  }
  const pixels = new Uint8Array(64);
  for (let y = 0; y < 8; y += 1) {
    const low = byteValue(tile.plane_0[y], "shared-chr-bank plane 0");
    const high = byteValue(tile.plane_1[y], "shared-chr-bank plane 1");
    for (let x = 0; x < 8; x += 1) {
      const mask = 1 << (7 - x);
      pixels[y * 8 + x] = (low & mask ? 1 : 0) | (high & mask ? 2 : 0);
    }
  }
  return Object.freeze({pixels, transparent: selector === 0});
}

/**
 * 一个帧图块字段的 owner 绑定：上下文、当前引用、编码与预览操作。
 *
 * `contexts` 是 `project.visuals.actors` 正文，`candidates` 是 `shared-chr-bank` 正文，
 * `consumer` 是帧号；候选取当前上下文的 pattern table，像素取自 `shared-chr-bank`。
 */
export function actorChrTileBinding({contexts: actors, candidates: chrDocument, consumer: frameId, value}) {
  const frame = byteValue(frameId, "角色 CHR consumer 帧号");
  const banks = actorChrBanks(chrDocument);
  const entries = actorChrContextEntries(actors, frame);
  const contextPatterns = new Map();
  const contextReferences = entries.map((entry, index) => {
    const token = `C${String(index + 1).padStart(3, "0")}`;
    contextPatterns.set(token, entry.pattern_table);
    return actorChrReference(ACTOR_CHR_CONTEXT_SCHEMA, token);
  });
  const contextTokens = new Set(contextPatterns.keys());
  const patternFor = reference => contextPatterns.get(actorChrReferenceToken(
    reference,
    ACTOR_CHR_CONTEXT_SCHEMA,
    contextTokens,
    "角色 CHR context 引用",
  ));
  const clone = reference => reference?.schema === ACTOR_CHR_CONTEXT_SCHEMA
    ? actorChrReference(
      ACTOR_CHR_CONTEXT_SCHEMA,
      actorChrReferenceToken(reference, ACTOR_CHR_CONTEXT_SCHEMA, contextTokens,
        "角色 CHR context 引用"),
    )
    : actorChrTileReference(actorChrTileEncoding(reference));
  const cache = new Map();
  const candidates = context => {
    const contextKey = actorChrReferenceKey(context);
    if (!cache.has(contextKey)) {
      const pattern = patternFor(context);
      cache.set(contextKey, Object.freeze(ACTOR_TILE_TOKENS.map((_token, tile) => {
        const reference = actorChrTileReference(tile);
        return Object.freeze({reference, ...actorChrPixels(banks, pattern, reference)});
      })));
    }
    return cache.get(contextKey);
  };
  return Object.freeze({
    contexts: Object.freeze(contextReferences),
    contextLabels: Object.freeze(entries.map(entry => entry.labels.join(" / "))),
    reference: actorChrTileReference(value),
    encode: actorChrTileEncoding,
    adapter: Object.freeze({
      clone,
      key: actorChrReferenceKey,
      equal: actorChrReferencesEqual,
      token: reference => reference.token,
      reference: actorChrTileReference,
      candidates,
      pixels: (context, reference) => actorChrPixels(banks, patternFor(context), reference),
    }),
  });
}
