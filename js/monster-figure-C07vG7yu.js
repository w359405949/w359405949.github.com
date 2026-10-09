import { db, VISUAL_CHR_BANK_IDS, projectFieldDraftOrigin, isBattleObjectOwnerProjection, VISUAL_METASPRITES_RESOURCE_ID, projectBattleObjectOwners, prepareAttackChrEntryContext, attackInitialEffectBank, resolveAttackChrPatternBanks, attackChrContextReference, effectPaletteAfterCommand, decodeFixedTextRecordSelection, decodeFixedTextRecord, summarizePhysicalRanges, physicalAddressOf, physicalAddressTarget, StoryPageDataError, uiFacilityElevatorDestinationScene, ACTOR_FRAME_COUNT, sceneFieldChrAnimation, ACTIVE_PROJECT_ID, clearAutoSaveErrorsOf, textRecordRuntimeTokens, TEXT_CONTROL_CODES, textFillDetails, textRecordEditorTokens, textControlMarker, TEXT_RECORDS_RESOURCE_ID, editTextRecordFill, TEXT_FILL_OPERANDS, requireBrowserProjectRepository, textRecord, textRecordEditorSelection, textRecordEditorText, hasPendingAutoSaves, flushAllAutoSaves, exactFixedTextRecordBytes, fixedTextRecordBytes, textRecordEditorBytes, installEncodedTextRecord, textRecordRuntimeWritableRanges, monsterVisualRecipes, MONSTER_SEQUENTIAL_GRAPHICS } from './scene-actors-Cftr7mCE.js';
import { state, nesVideoStandard, nesFrameDurationMs, startNesFrameClock } from './emulator-Bl-sLXnd.js';
import { sha256Hex, editorLog, canonicalJsonStringify } from './project-store-values-klefznSR.js';

// @editor-module 格式化十六进制数值。
const hex$1 = (value, width = 6) => `0x${Number(value).toString(16).toUpperCase().padStart(width, "0")}`;

// @editor-module 提供 DOM 查询、转义、格式化与文字输入事件绑定。


const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));
const bytes = (value) => value >= 1024 ? `${(value / 1024).toFixed(value % 1024 ? 1 : 0)} KiB` : `${value} B`;

/** 组字期间保留输入原文，结束后恢复长度限制并处理已提交文字。 */
function bindTextInputEvents(root, {selector = null, onInput = null, onChange = null} = {}) {
  if (!root) return;
  const composing = new WeakMap();
  const target = event => selector ? event.target.closest?.(selector) : event.target;
  const limit = (input, selection = null) => {
    const maximum = input.maxLength;
    if (!Number.isInteger(maximum) || maximum < 0 || input.value.length <= maximum) return;
    const prefix = selection?.prefix ?? '';
    const suffix = selection?.suffix ?? '';
    const preserve = input.value.startsWith(prefix) && input.value.endsWith(suffix)
      && prefix.length + suffix.length <= maximum;
    const available = preserve ? maximum - prefix.length - suffix.length : maximum;
    const source = preserve ? input.value.slice(prefix.length, input.value.length - suffix.length) : input.value;
    let text = '';
    for (const character of source) {
      if (text.length + character.length > available) break;
      text += character;
    }
    input.value = preserve ? prefix + text + suffix : text;
    const caret = preserve ? prefix.length + text.length : text.length;
    input.setSelectionRange?.(caret, caret);
  };
  root.addEventListener('compositionstart', event => {
    const input = target(event);
    if (!input || composing.has(input)) return;
    const maximum = input.getAttribute('maxlength');
    composing.set(input, {maximum,
      prefix: maximum === null ? '' : input.value.slice(0, input.selectionStart),
      suffix: maximum === null ? '' : input.value.slice(input.selectionEnd)});
    input.removeAttribute('maxlength');
  });
  root.addEventListener('input', event => {
    const input = target(event);
    if (!input || event.isComposing || composing.has(input)) return;
    limit(input);
    onInput?.(event);
  });
  root.addEventListener('compositionend', event => {
    const input = target(event);
    if (!input) return;
    const selection = composing.get(input);
    composing.delete(input);
    const maximum = selection?.maximum;
    if (maximum !== null && maximum !== undefined) input.setAttribute('maxlength', maximum);
    limit(input, selection);
    onInput?.(event);
  });
  if (onChange) root.addEventListener('change', event => {
    const input = target(event);
    if (!input || event.isComposing || composing.has(input)) return;
    limit(input);
    onChange(event);
  });
}

// @editor-module 按字段对象名与序号组成记录句柄。
function recordUid(domain, id) {
  if (id === null || id === undefined) return null;
  return `${domain}:${Number(id).toString(16).toUpperCase().padStart(2, "0")}`;
}

// @editor-module 位图字节投影按读取位置解引用当前字段值。
function indexedByteSource(length, readByte) {
  const index = value => Number.isInteger(Number(value)) && Number(value) >= 0 && String(Number(value)) === value;
  const range = (start = 0, end = length) => {
    const bound = value => value < 0 ? Math.max(0, length + Math.trunc(value)) : Math.min(length, Math.trunc(value));
    start = bound(start); end = Math.max(start, bound(end));
    return Uint8Array.from({length: end - start}, (_, offset) => readByte(start + offset));
  };
  return new Proxy({length, slice: range, subarray: range,
    *[Symbol.iterator]() {for (let offset = 0; offset < length; offset++) yield readByte(offset);}}, {
    get(target, key, receiver) {
      if (typeof key === 'string' && index(key)) return Number(key) < length ? readByte(Number(key)) : undefined;
      return Reflect.get(target, key, receiver);
    },
  });
}

// @editor-module 将已发布 Web 媒体 JSON 解码为字节与 CHR pattern 表。
//
// 物理地址的唯一权威仍是 resource-byte-ranges；这里仅负责把项目中已经提取出的
// JSON 表示还原成浏览器可组合的媒体数据。预览代码不得以地址为由去读 ROM/.bin。


const chrBankFieldCaches = new Map();
const webByteCaches = new WeakMap();

async function composeCorePatternTable({lazy = false} = {}) {
  const [core, characters] = await Promise.all([
    db.getResourceDocument('core-latin'), db.getResourceDocument('char'),
  ]);
  const slots = core?.font_template?.slots;
  if (slots?.length !== 128) throw new TypeError('核心字模模板槽数量无效');
  const origin = projectFieldDraftOrigin(characters) || characters;
  const glyphs = new Map(origin.records.flatMap((record, index) => record.kind === 'core-8x8'
    ? [[record.handle, index]] : []));
  const bitmap = slot => slot.glyph_reference
    ? characters.records[glyphs.get(slot.glyph_reference)]?.core_glyph_bitmap : slot.opaque_bitmap;
  if (lazy) return indexedByteSource(2048, offset => {
    const slot = slots[Math.floor(offset / 16)];
    const values = bitmap(slot);
    if (!Array.isArray(values) || values.length !== 16 || slot.glyph_index !== Math.floor(offset / 16))
      throw new TypeError('核心字模位图或引用无效');
    return byte(values[offset % 16], '核心字模');
  });
  const bytes = new Uint8Array(2048);
  for (const slot of slots) {
    const values = bitmap(slot);
    if (!Array.isArray(values) || values.length !== 16 || !Number.isInteger(slot.glyph_index)
        || slot.glyph_index < 0 || slot.glyph_index > 127)
      throw new TypeError('核心字模位图或引用无效');
    bytes.set(values.map(value => byte(value, '核心字模')), slot.glyph_index * 16);
  }
  return bytes;
}

function chrPatternByteSource(document, bankIds) {
  const origin = projectFieldDraftOrigin(document) || document;
  const banks = new Map(origin.banks.map((bank, index) => [bank.id, index]));
  if (!bankIds.length || bankIds.some(id => !banks.has(id))) throw new TypeError('CHR pattern 表缺少已发布 bank');
  const values = new Map();
  return indexedByteSource(bankIds.length * 1024, offset => {
    const bank = bankIds[Math.floor(offset / 1024)], local = offset % 1024;
    const tile = Math.floor(local / 16), plane = local % 16 < 8 ? 'plane_0' : 'plane_1';
    const key = `${bank}:${tile}`;
    if (!values.has(key)) values.set(key, document.banks[banks.get(bank)].tiles[tile]);
    return byte(values.get(key)[plane][local % 8], 'CHR 位面');
  });
}

function byte(value, context) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 0xff) {
    throw new TypeError(`${context}: 必须是 0..255 的字节`);
  }
  return number;
}

function chrBankId(value) {
  const number = typeof value === "string"
    ? Number.parseInt(value.replace(/^0x/i, ""), 16)
    : Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 0xff) {
    throw new TypeError(`CHR bank 无效：${value}`);
  }
  return number;
}

function encodeChrBank(bank, expectedId) {
  if (Number(bank?.id) !== expectedId || !Array.isArray(bank?.tiles)) {
    throw new TypeError(`shared-chr-bank 缺少 CHR bank ${expectedId.toString(16).padStart(2, "0")}`);
  }
  const result = new Uint8Array(0x400);
  const seen = new Set();
  for (const tile of bank.tiles) {
    const tileId = Number(tile?.id);
    if (!Number.isInteger(tileId) || tileId < 0 || tileId >= 0x40 || seen.has(tileId)) {
      throw new TypeError(`CHR bank ${expectedId.toString(16)} 的 tile id 无效`);
    }
    if (!Array.isArray(tile.plane_0) || tile.plane_0.length !== 8 ||
        !Array.isArray(tile.plane_1) || tile.plane_1.length !== 8) {
      throw new TypeError(`CHR bank ${expectedId.toString(16)} tile ${tileId} 位面无效`);
    }
    const offset = tileId * 16;
    tile.plane_0.forEach((value, row) => {
      result[offset + row] = byte(value, `plane_0[${row}]`);
    });
    tile.plane_1.forEach((value, row) => {
      result[offset + 8 + row] = byte(value, `plane_1[${row}]`);
    });
    seen.add(tileId);
  }
  if (seen.size !== 0x40) {
    throw new TypeError(`CHR bank ${expectedId.toString(16)} 只有 ${seen.size}/64 个 tile`);
  }
  return result;
}

function base64Bytes(value, context) {
  if (typeof value !== "string") {
    throw new TypeError(`${context}: base64 正文必须是字符串`);
  }
  let decoded;
  try {
    decoded = atob(value);
  } catch (error) {
    throw new TypeError(`${context}: base64 正文无效`, {cause: error});
  }
  if (btoa(decoded) !== value) {
    throw new TypeError(`${context}: base64 正文不是 canonical 编码`);
  }
  const result = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index += 1) {
    result[index] = decoded.charCodeAt(index);
  }
  return result;
}

/**
 * 把提取阶段发布的 JSON 字节值还原为只读 Uint8Array。
 *
 * 这不是 package binary 适配层：正文、来源地址和摘要都在当前页面已加载的 JSON
 * document 中。缓存以 descriptor identity 为键，项目切换或正文失效后不会串用。
 */
async function decodeWebByteArray(descriptor, context = "Web 媒体资产") {
  if (!descriptor || typeof descriptor !== "object") {
    throw new TypeError(`${context}: 缺少 JSON 字节表示`);
  }
  if (webByteCaches.has(descriptor)) return webByteCaches.get(descriptor);
  const promise = (async () => {
    if (descriptor.schema !== "metalmaxcn.web-byte-array") {
      throw new TypeError(`${context}: JSON 字节 schema 无效`);
    }
    if (descriptor.encoding !== "base64") {
      throw new TypeError(`${context}: JSON 字节 encoding 必须是 base64`);
    }
    const bytes = base64Bytes(descriptor.data, context);
    if (!Number.isInteger(descriptor.length) || descriptor.length < 0
        || descriptor.length !== bytes.length) {
      throw new TypeError(
        `${context}: 声明长度 ${descriptor.length} 与正文 ${bytes.length} 不一致`,
      );
    }
    if (!/^[0-9a-f]{64}$/.test(descriptor.sha256 || "")
        || descriptor.sha256 !== await sha256Hex(bytes)) {
      throw new TypeError(`${context}: SHA-256 与正文不一致`);
    }
    return bytes;
  })();
  webByteCaches.set(descriptor, promise);
  return promise;
}

/**
 * 从 shared-chr-bank Original/Working 读取一个 1 KiB bank。
 *
 * 返回值按字段会话与版本缓存并视为只读；调用方若要修改，必须先 `.slice()`。
 */
async function loadChrBankBytes(bankId) {
  const id = chrBankId(bankId);
  const cached = chrBankFieldCaches.get(id);
  if (cached?.repository === state.projectRepository
      && cached.packageManifest === state.browserPackageManifest) {
    if (cached.pending) return cached.pending;
    try {
      if (cached.field.version === cached.version) return cached.bytes;
    } catch {
      chrBankFieldCaches.delete(id);
    }
  }
  const entry = {repository: state.projectRepository,
    packageManifest: state.browserPackageManifest, pending: null};
  entry.pending = (async () => {
    const index = VISUAL_CHR_BANK_IDS.indexOf(id);
    if (index < 0) throw new TypeError(`shared-chr-bank 缺少 CHR bank ${id.toString(16).padStart(2, "0")}`);
    const objects = await db.getFieldObjects("shared-chr-bank", {offset: index * 64, limit: 64});
    if (objects.length !== 64) throw new TypeError(`shared-chr-bank bank ${id.toString(16)} 缺少 tile`);
    const firstField = objects[0].fields[0];
    const version = firstField.version;
    const tiles = objects.map(object => {
      const planes = new Map(object.fields.map(field => [field.fieldName, field]));
      if (object.fields.some(field => field.recordId !== id))
        throw new TypeError(`shared-chr-bank bank ${id.toString(16)} 字段身份无效`);
      return {id: object.fields[0].tileId,
        plane_0: planes.get("plane_0")?.value, plane_1: planes.get("plane_1")?.value};
    });
    const bytes = encodeChrBank({id, tiles}, id);
    if (chrBankFieldCaches.get(id) === entry) {
      Object.assign(entry, {field: firstField, version, bytes, pending: null});
    }
    return bytes;
  })();
  chrBankFieldCaches.set(id, entry);
  try {
    return await entry.pending;
  } catch (error) {
    if (chrBankFieldCaches.get(id) === entry) chrBankFieldCaches.delete(id);
    throw error;
  }
}

/** shared-chr-bank 里现有的 bank 号，升序。选 bank 的界面按它列举，不猜连续区间。 */
async function listChrBankIds() {
  const document_ = await db.getDocument("shared-chr-bank", null);
  if (!document_ || !Array.isArray(document_.banks)) {
    throw new TypeError("shared-chr-bank 图像基础表不可用");
  }
  return document_.banks
    .map(bank => Number(bank?.id))
    .filter(id => Number.isInteger(id) && id >= 0)
    .sort((left, right) => left - right);
}

/** 把若干 1 KiB CHR bank 按给定顺序拼成 PPU pattern table。 */
async function composeChrPatternTable(bankIds) {
  if (!Array.isArray(bankIds) || !bankIds.length) {
    throw new TypeError("CHR pattern table 必须声明 bank 顺序");
  }
  const banks = await Promise.all(bankIds.map(loadChrBankBytes));
  const result = new Uint8Array(banks.length * 0x400);
  banks.forEach((bank, index) => result.set(bank, index * 0x400));
  return result;
}

// @editor-module NES 渲染原语：调色板、pattern 解码与图块合成。
// 显示现场的区域合成由 frame-composition.js 提供。

// RGB 对照采用 Mesen NesDefaultVideoFilter 的 2C02 色表。
const nesPalette = [
  [102,102,102],[0,42,136],[20,18,167],[59,0,164],[92,0,126],[110,0,64],[108,6,0],[86,29,0],
  [51,53,0],[11,72,0],[0,82,0],[0,79,8],[0,64,77],[0,0,0],[0,0,0],[0,0,0],
  [173,173,173],[21,95,217],[66,64,255],[117,39,254],[160,26,204],[183,30,123],[181,49,32],[153,78,0],
  [107,109,0],[56,135,0],[12,147,0],[0,143,50],[0,124,141],[0,0,0],[0,0,0],[0,0,0],
  [255,254,255],[100,176,255],[146,144,255],[198,118,255],[243,106,255],[254,110,204],[254,129,112],[234,158,34],
  [188,190,0],[136,216,0],[92,228,48],[69,224,130],[72,205,222],[79,79,79],[0,0,0],[0,0,0],
  [255,254,255],[192,223,255],[211,210,255],[232,200,255],[251,194,255],[254,196,234],[254,204,197],[247,216,165],
  [228,229,148],[207,239,150],[189,244,171],[179,243,204],[181,235,242],[184,184,184],[0,0,0],[0,0,0],
];

function uiHexBytes(rawHex) {
  return String(rawHex || "").trim().split(/\s+/)
    .filter(Boolean)
    .map(value => Number.parseInt(value, 16));
}

function uiPutRgb(pixels, width, x, y, colour) {
  if (x < 0 || y < 0 || x >= width || y * width * 4 >= pixels.length) return;
  const offset = (y * width + x) * 4;
  pixels[offset] = colour[0];
  pixels[offset + 1] = colour[1];
  pixels[offset + 2] = colour[2];
  pixels[offset + 3] = 255;
}

function uiPaintPattern(
  pixels, width, height, patterns, corePatterns, tileId, originX, originY,
  patternProfiles = [], paletteValues = null
) {
  const palette = (paletteValues || [0x0F, 0x30, 0x10, 0x00])
    .map(index => nesPalette[Number(index) & 0x3F]);
  const profiles = Array.isArray(patternProfiles)
    ? patternProfiles : patternProfiles ? [patternProfiles] : [];
  const patternProfile = profiles.find(profile => (
    tileId >= Number(profile?.first_tile ?? -1)
    && tileId <= Number(profile?.last_tile ?? -1)
  )) || null;
  const coreMatch = !patternProfile && tileId <= 0x7F;
  const profileFirst = Number(patternProfile?.first_tile ?? -1);
  const profileLast = Number(patternProfile?.last_tile ?? -1);
  const profileMatch = (
    patternProfile
    && tileId >= profileFirst
    && tileId <= profileLast
  );
  const source = coreMatch
    ? corePatterns
    : profileMatch ? patternProfile.patterns : patterns;
  const patternOffset = coreMatch
    ? tileId * 16
    : profileMatch ? (tileId - profileFirst) * 16 : (tileId - 0x80) * 16;
  if (patternOffset < 0 || patternOffset + 16 > source.length) {
    const warning = [154, 67, 88];
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        if (!((x + y) & 1)) uiPutRgb(pixels, width, originX + x, originY + y, warning);
      }
    }
    return;
  }
  for (let y = 0; y < 8; y += 1) {
    const low = source[patternOffset + y];
    const high = source[patternOffset + 8 + y];
    for (let x = 0; x < 8; x += 1) {
      const shift = 7 - x;
      const value = ((low >> shift) & 1) | (((high >> shift) & 1) << 1);
      uiPutRgb(pixels, width, originX + x, originY + y, palette[value]);
    }
  }
}

// rowProfiles 描述帧内切 CHR bank 的整屏画面：青蛙赛跑在第 18 行换掉背景
// bank，上半屏是赛道图、下半屏的消息窗回到常规 UI bank。用同一对 bank 铺整屏
// 会把其中一半画成乱码，所以按行段选图块。
function uiPaintRomNametable(
  image, layer, patterns, corePatterns, patternProfiles, rowProfiles = []
) {
  const source = uiHexBytes(layer.raw_hex);
  if (source.length !== 0x400) return;
  const paletteSets = layer.palette_sets || [];
  const segments = Array.isArray(rowProfiles) ? rowProfiles : [];
  for (let position = 0; position < 32 * 30; position += 1) {
    const tileX = position % 32;
    const tileY = Math.floor(position / 32);
    const attribute = source[0x3C0 + Math.floor(tileY / 4) * 8
      + Math.floor(tileX / 4)];
    const shift = ((tileY & 0x02) << 1) | (tileX & 0x02);
    const paletteId = (attribute >> shift) & 0x03;
    const segment = segments.find(item => (
      tileY >= Number(item?.first_row ?? -1)
      && tileY <= Number(item?.last_row ?? -1)
    ));
    uiPaintPattern(
      image.data, image.width, image.height, patterns, corePatterns,
      source[position], tileX * 8, tileY * 8,
      segment ? [...segment.profiles, ...patternProfiles] : patternProfiles,
      paletteSets[paletteId]
    );
  }
}

function uiPaintSpritePattern(
  image, tileId, originX, originY, patternProfiles, paletteValues,
  horizontalFlip = false, verticalFlip = false,
  behindBackground = false
) {
  const profile = (patternProfiles || []).find(item => (
    tileId >= Number(item?.first_tile ?? -1)
    && tileId <= Number(item?.last_tile ?? -1)
  ));
  if (!profile?.patterns) return;
  const patternOffset = (tileId - Number(profile.first_tile)) * 16;
  if (patternOffset < 0 || patternOffset + 16 > profile.patterns.length) return;
  const palette = (paletteValues || [0x0F, 0x30, 0x10, 0x00])
    .map(value => nesPalette[Number(value) & 0x3F]);
  for (let outputY = 0; outputY < 8; outputY += 1) {
    const sourceY = verticalFlip ? 7 - outputY : outputY;
    const low = profile.patterns[patternOffset + sourceY];
    const high = profile.patterns[patternOffset + 8 + sourceY];
    for (let outputX = 0; outputX < 8; outputX += 1) {
      const sourceX = horizontalFlip ? 7 - outputX : outputX;
      const shift = 7 - sourceX;
      const value = ((low >> shift) & 1) | (((high >> shift) & 1) << 1);
      if (value) {
        const targetOffset = (
          (originY + outputY) * image.width + originX + outputX
        ) * 4;
        const background = nesPalette[0x0F];
        if (
          behindBackground
          && (
            image.data[targetOffset] !== background[0]
            || image.data[targetOffset + 1] !== background[1]
            || image.data[targetOffset + 2] !== background[2]
          )
        ) {
          continue;
        }
        uiPutRgb(
          image.data, image.width, originX + outputX, originY + outputY,
          palette[value]
        );
      }
    }
  }
}

function uiPaintRomTileGrid(
  image, layer, patterns, corePatterns, patternProfiles
) {
  const source = uiHexBytes(layer.raw_hex);
  const rows = Number(layer.rows || 0);
  const groups = Number(layer.groups_per_row || 0);
  const cells = Number(layer.cells_per_group || 0);
  const groupGap = Number(layer.group_gap || 0);
  const rowStride = Number(layer.row_stride || 0);
  let sourceIndex = 0;
  let rowCursor = Number(layer.destination_cursor || 0) & 0x3FF;
  const paint = (position, tile) => {
    const logical = Number(position) & 0x3FF;
    const tileY = Math.floor(logical / 32);
    if (tileY >= 30) return;
    uiPaintPattern(
      image.data, image.width, image.height, patterns, corePatterns,
      Number(tile), (logical % 32) * 8, tileY * 8, patternProfiles
    );
  };
  for (let row = 0; row < rows; row += 1) {
    let cursor = rowCursor;
    for (let group = 0; group < groups; group += 1) {
      for (let cell = 0; cell < cells; cell += 1) {
        if (sourceIndex < source.length) paint(cursor, source[sourceIndex]);
        sourceIndex += 1;
        cursor = (cursor + 1) & 0x3FF;
      }
      cursor = (cursor + groupGap) & 0x3FF;
    }
    rowCursor = (rowCursor + rowStride) & 0x3FF;
  }
  for (const [position, tile] of layer.extra_writes || []) {
    paint(position, tile);
  }
}

// 运行期把实体图形、数字等写回同一张逻辑 nametable。constructor 只保存这些
// 语义写入，不保存截图；图块像素仍从已登记的 ROM / 核心字体 pattern 读取。
function uiPaintTileWrites(
  image, layer, patterns, corePatterns, patternProfiles
) {
  const paletteSets = layer.palette_sets || [];
  const defaultAttribute = Number(layer.default_attribute ?? 0xFF) & 0xFF;
  const attributes = new Map(
    (layer.attribute_writes || []).map(([position, value]) => [
      Number(position) & 0x3FF, Number(value) & 0xFF,
    ])
  );
  for (const [rawPosition, rawTile] of layer.writes || []) {
    const position = Number(rawPosition) & 0x3FF;
    const tileY = Math.floor(position / 32);
    if (tileY >= 30) continue;
    const tileX = position % 32;
    const attributePosition = 0x3C0
      + Math.floor(tileY / 4) * 8 + Math.floor(tileX / 4);
    const attribute = attributes.get(attributePosition) ?? defaultAttribute;
    const shift = ((tileY & 0x02) << 1) | (tileX & 0x02);
    const paletteId = (attribute >> shift) & 0x03;
    uiPaintPattern(
      image.data, image.width, image.height, patterns, corePatterns,
      Number(rawTile), tileX * 8, tileY * 8, patternProfiles,
      paletteSets[paletteId]
    );
  }
}

function uiPaintTileFill(
  image, layer, patterns, corePatterns, patternProfiles
) {
  const writes = [];
  const originX = Number(layer.x || 0);
  const originY = Number(layer.y || 0);
  const width = Number(layer.width || 0);
  const height = Number(layer.height || 0);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      writes.push([(originY + y) * 32 + originX + x, Number(layer.tile)]);
    }
  }
  uiPaintTileWrites(
    image, {...layer, writes}, patterns, corePatterns, patternProfiles
  );
}

function uiPaintResolvedMetasprite(image, layer, patternProfiles, preview) {
  const anchorX = Number(layer.anchor_x || 0);
  const anchorY = Number(layer.anchor_y || 0);
  const yBias = Number(layer.oam_y_bias ?? 1);
  const paletteSets = layer.palette_sets || preview.sprite_palettes || [];
  const sprites = layer.kind === "rom_oam"
    ? [...(layer.sprites || [])].reverse()
    : (layer.sprites || []);
  for (const sprite of sprites) {
    if (sprite.transparent_tile) continue;
    const attribute = Number(sprite.attribute || 0);
    uiPaintSpritePattern(
      image, Number(sprite.tile),
      anchorX + Number(sprite.x || 0),
      anchorY + Number(sprite.y || 0) + yBias,
      patternProfiles,
      paletteSets[attribute & 0x03],
      Boolean(sprite.horizontal_flip ?? (attribute & 0x40)),
      Boolean(sprite.vertical_flip ?? (attribute & 0x80)),
      Boolean(sprite.behind_background ?? (attribute & 0x20))
    );
  }
}

function uiBlankCanvas(canvas, {transparent = false} = {}) {
  canvas.width = 256;
  canvas.height = 240;
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  const image = context.createImageData(canvas.width, canvas.height);
  if (transparent) return {context, image};
  const background = nesPalette[0x0F];
  for (let offset = 0; offset < image.data.length; offset += 4) {
    image.data[offset] = background[0];
    image.data[offset + 1] = background[1];
    image.data[offset + 2] = background[2];
    image.data[offset + 3] = 255;
  }
  return {context, image};
}

// @editor-module CHR 图块光栅化的共享底座
//
// 每个「配方 + shared-chr-bank → 像素」的渲染器都要做同两件事：从图案表里解一个
// 8×8 的 2bpp 图块，然后按调色板画到某个坐标上。这里只放这两件事，别的都不放。
//
// 与 Python 侧的对应（两边必须逐像素一致）：
//   `decodeChrTile`  ← `mm_trace_analyze.decode_chr_tile`
//   `paintChrTile`   ← `mm_visual._paint_tile`
//
// **色号 0 是透明**，画成 `background`（默认与 Python 预览同一个显示衬底色）。
// 那不是 NES 的颜色，只是「透明」的可见表示；真正需要 alpha 的场合传
// `transparent: true` 且 `background: null`。


/** Python 预览用的显示衬底色。黑色轮廓在深色背景上才看得见。 */
const MATTE = Object.freeze([11, 14, 16]);

/** 从 4 KiB（或更长）图案表里解出一个 8×8 图块的 4 色索引。 */
function decodeChrTile(patternTable, tileId) {
  const start = tileId * 16;
  if (start < 0 || start + 16 > patternTable.length) {
    throw new RangeError(`图块 ${tileId} 超出图案表（${patternTable.length} 字节）`);
  }
  const pixels = new Uint8Array(64);
  for (let row = 0; row < 8; row += 1) {
    const low = patternTable[start + row];
    const high = patternTable[start + row + 8];
    for (let column = 0; column < 8; column += 1) {
      const bit = 7 - column;
      pixels[row * 8 + column] = ((low >> bit) & 1) | (((high >> bit) & 1) << 1);
    }
  }
  return pixels;
}

/** 一次解开整张图案表，避免同一图块被反复解。 */
function decodeChrTiles(patternTable) {
  const count = Math.floor(patternTable.length / 16);
  const tiles = new Array(count);
  for (let id = 0; id < count; id += 1) tiles[id] = decodeChrTile(patternTable, id);
  return tiles;
}

/**
 * 把一个已解开的图块画进 RGBA 缓冲区。
 *
 * `palette` 是 4 个 NES 系统调色板下标。`transparent` 为真时色号 0 不落笔
 * （`background` 为 null）或落成衬底色。
 */
function paintChrTile(data, imageWidth, originX, originY, tile, palette, {
  hflip = false, vflip = false, scale = 1,
  transparent = true, background = MATTE,
} = {}) {
  for (let y = 0; y < 8; y += 1) {
    const sourceY = vflip ? 7 - y : y;
    for (let x = 0; x < 8; x += 1) {
      const sourceX = hflip ? 7 - x : x;
      const colorIndex = tile[sourceY * 8 + sourceX];
      let color;
      let alpha = 255;
      if (transparent && colorIndex === 0) {
        if (!background) continue;          // 真 alpha：这一格不落笔
        color = background;
      } else {
        color = nesPalette[palette[colorIndex] & 0x3f];
      }
      for (let sy = 0; sy < scale; sy += 1) {
        const row = (originY + y * scale + sy) * imageWidth;
        for (let sx = 0; sx < scale; sx += 1) {
          const target = (row + originX + x * scale + sx) * 4;
          if (target < 0 || target + 3 >= data.length) continue;
          data[target] = color[0];
          data[target + 1] = color[1];
          data[target + 2] = color[2];
          data[target + 3] = alpha;
        }
      }
    }
  }
}

/** 建一块填好衬底色的 RGBA 缓冲区；`background` 为 null 则全透明。 */
function createRaster(width, height, background = MATTE) {
  const data = new Uint8ClampedArray(width * height * 4);
  if (background) {
    const [red, green, blue] = background;
    const pixel = new Uint8ClampedArray([red, green, blue, 255]);
    new Uint32Array(data.buffer).fill(new Uint32Array(pixel.buffer)[0]);
  }
  return {width, height, data};
}

/** 把 RGBA 缓冲区画进 canvas。canvas 尺寸随之调整。 */
function blitRaster(canvas, raster) {
  canvas.width = raster.width;
  canvas.height = raster.height;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.imageSmoothingEnabled = false;
  context.putImageData(new ImageData(raster.data, raster.width, raster.height), 0, 0);
}

/** `{id, value}` 稳定字节记录 → 扁平 Uint8Array。 */
function byteRecords(records, label) {
  if (!Array.isArray(records) || !records.length) {
    throw new TypeError(`${label}: 缺少稳定字节记录`);
  }
  const result = new Uint8Array(records.length);
  const seen = new Set();
  for (const record of records) {
    const id = Number(record?.id);
    const value = Number(record?.value);
    if (!Number.isInteger(id) || id < 0 || id >= records.length || seen.has(id)) {
      throw new TypeError(`${label}: 字节记录 id ${record?.id} 无效或重复`);
    }
    if (!Number.isInteger(value) || value < 0 || value > 0xff) {
      throw new TypeError(`${label}[${id}]: 字节值必须是 0..255`);
    }
    result[id] = value;
    seen.add(id);
  }
  return result;
}

// @editor-module 武器攻击特效的浏览器视觉脚本 VM 与帧回放
//
// 配方权威是已发布的视觉脚本命令流（`clean_animations` 之外的 `scripts.primary`
// / `scripts.auxiliary`）与战斗对象动作布局；像素权威是 `shared-chr-bank`。
//
// **为什么必须在浏览器里跑 VM**：逐帧状态（每帧每个对象槽的动作码与坐标）不在
// 包里，它是 `mm_weapon_effects._clean_animation_states` 在提取期算出来的。要么
// 把 states 也发进 JSON（等于又造一份派生表，正是要消除的东西），要么把 VM 搬过
// 来。选后者。见 shiftboss/plans/archive/docs-history/metalmaxcn_base_assets_and_references.md §5.2 E5-b。
//
// 与 Python 侧的对应（逐帧必须完全一致）：
//   `expandAttackCommands`  ← `_expand_attack_commands`（内联调用与 repeat 块）
//   `cleanAnimationStates`  ← `_clean_animation_states`（对象槽 VM）
//   `paintBattleAction`     ← `_paint_battle_action`
//   `battleActionPlacements`← `_battle_action_tile_placements`


// 干净舞台的归一锚点。刻意不是战场坐标——预览要的是可比较的固定构图。
const ACTOR_ANCHOR = Object.freeze([42.0, 76.0]);
const TARGET_ANCHOR = Object.freeze([210.0, 56.0]);
// `RenderBattleObject` 看 $0314 bit 0；干净舞台把角色放左边，因此所有效果对象
// 都走渲染器的镜像分支。
const CLEAN_STAGE_FLIP_X = true;
const MAX_FRAMES = 360;
const MAX_COMMANDS = 2500;
const CLEAN_CANVAS = Object.freeze({width: 256, height: 240});
// 干净舞台的背景色。它是「舞台」，不是 NES 颜色。
const STAGE_BACKGROUND = Object.freeze([7, 10, 12]);

const signedByte = value => (value < 0x80 ? value : value - 0x100);

/** `_command_operand` 的镜像：命令的 operands 是 `[{name, value}]`。 */
function operand(command, name) {
  for (const item of command?.operands || []) {
    if (String(item?.name) === name) {
      const value = Number(item.value);
      return Number.isFinite(value) ? value : null;
    }
  }
  return null;
}

/** `_expand_attack_commands` 的镜像：把调用与 repeat 块内联成一条命令流。 */
function expandAttackCommands(rootVisual, primary, auxiliary) {
  const expanded = [];

  const appendScript = (namespace, scriptId, stack) => {
    const node = `${namespace}:${scriptId.toString(16).toUpperCase().padStart(2, "0")}`;
    if (stack.includes(node) || expanded.length >= MAX_COMMANDS) return;
    const script = namespace === "visual"
      ? primary.get(scriptId) : auxiliary.get(scriptId);
    if (!script) return;
    const commands = script.commands || [];

    const replay = (command, currentNode, sourceCommandIndex) => {
      const name = String(command.name);
      if (name === "call_visual_script") {
        const target = operand(command, "visual_code");
        if (target !== null && primary.has(target)) {
          appendScript("visual", target, [...stack, currentNode]);
        }
      } else if (name === "call_aux_script") {
        const target = operand(command, "script_id");
        if (target !== null && auxiliary.has(target)) {
          appendScript("aux", target, [...stack, currentNode]);
        }
      } else if (!command.marker) {
        expanded.push({
          ...command,
          source_node: currentNode,
          source_command_index: Number(sourceCommandIndex),
        });
      }
    };

    let index = 0;
    while (index < commands.length && expanded.length < MAX_COMMANDS) {
      const command = commands[index];
      const name = String(command.name);
      if (name === "end_record") break;
      if (name === "end_repeat_block") {
        index += 1;
        continue;
      }
      if (name === "repeat_command_block") {
        const blockStart = index + 1;
        let blockEnd = blockStart;
        let depth = 1;
        while (blockEnd < commands.length) {
          const blockName = String(commands[blockEnd].name);
          if (blockName === "repeat_command_block") depth += 1;
          else if (blockName === "end_repeat_block") {
            depth -= 1;
            if (depth === 0) break;
          }
          blockEnd += 1;
        }
        const count = Math.min(Math.max(operand(command, "repeat_count") ?? 1, 1), 16);
        for (let pass = 0; pass < count; pass += 1) {
          for (let cursor = blockStart; cursor < blockEnd; cursor += 1) {
            replay(commands[cursor], node, cursor);
            if (expanded.length >= MAX_COMMANDS) break;
          }
          if (expanded.length >= MAX_COMMANDS) break;
        }
        index = Math.min(blockEnd + 1, commands.length);
        continue;
      }
      replay(command, node, index);
      index += 1;
    }
  };

  appendScript("visual", rootVisual, []);
  return expanded;
}

/** `_clean_animation_states` 的镜像：对象槽 VM，产出逐帧状态。 */
function cleanAnimationStates(closure, commands, actionById, {
  actorAnchor = ACTOR_ANCHOR, targetAnchor = TARGET_ANCHOR,
  gamePath = false,
  initialEffectBank,
} = {}) {
  if (!Number.isInteger(initialEffectBank) || initialEffectBank < 0 || initialEffectBank > 255)
    throw new TypeError('缺少攻击初始 CHR 上下文');
  let effectBank = initialEffectBank;
  let spritePaletteSelector = null;
  let actorStateDelta = 0;
  let actorXDeltaNormal = 0;
  let actorXDeltaAlternate = 0;
  const objects = new Map();
  const frames = [];

  const packedSlot = command => {
    const packed = command?.packed_object_delay;
    if (!packed) return [0, 0];
    return [Number(packed.object_slot), Math.min(Number(packed.delay), 0x0f)];
  };

  // Python 的 `state_signature()` 首元素永远是 chr_effect_bank，所以它**永不为
  // 空**——`if not signature: return` 那道门实际上从不生效，对象为零时同样会记一帧
  // （objects 为空数组）。这里必须照样记，否则每条剪辑都会少掉那些空帧。
  const snapshot = (command, hold = 1, commandIndex = commands.length) => {
    if (hold <= 0) return;
    const event = typeof command === "string"
      ? command : String(command?.name || "");
    const sourceNode = typeof command === "string"
      ? "" : String(command?.source_node || "");
    const copies = [...objects.keys()].sort((a, b) => a - b).map(slot => {
      const item = objects.get(slot);
      return {
        slot,
        action: item.action,
        x: item.x,
        y: item.y,
        flipX: item.flipX,
        spawnAnchor: item.spawnAnchor,
        spawnAction: item.spawnAction,
        spawnSourceNode: item.spawnSourceNode,
        spawnSourceCommandIndex: item.spawnSourceCommandIndex,
      };
    });
    const repeat = Math.min(hold, Math.max(0, MAX_FRAMES - frames.length));
    for (let step = 0; step < repeat; step += 1) {
      frames.push({
        event,
        commandIndex,
        sourceNode,
        effectBank,
        spritePaletteSelector,
        chrContext: attackChrContextReference(effectBank),
        actorStateDelta,
        actorXDeltaNormal,
        actorXDeltaAlternate,
        objects: copies,
      });
    }
  };

  const available = value =>
    actionById.has(value) && Boolean(actionById.get(value).available);

  for (const [commandIndex, command] of commands.entries()) {
    const name = String(command.name);
    const [slot, hold] = packedSlot(command);
    const actionValue = operand(command, "action");
    if (name === "set_frame_mode_and_wait") {
      const mode = operand(command, "mode");
      if (mode !== null) effectBank = mode;
      // opcode $04 直接尾调 WaitForNextFrame，不走常规 packed delay 字段。
      snapshot(command, 1, commandIndex);
    } else if (name === "set_battle_sprite_palette") {
      spritePaletteSelector = operand(command, "palette_offset");
      if (spritePaletteSelector === null) {
        throw new TypeError("set_battle_sprite_palette 缺少调色板选择器");
      }
    } else if (name === "increment_actor_state"
        || name === "decrement_actor_state") {
      actorStateDelta += name === "increment_actor_state" ? 1 : -1;
      snapshot(command, operand(command, "delay") ?? 0, commandIndex);
    } else if (name === "move_actor_x_or_skip"
        || name === "skip_or_move_actor_x") {
      const delta = signedByte(operand(command, "delta_x") ?? 0);
      if (name === "move_actor_x_or_skip") actorXDeltaNormal += delta;
      else actorXDeltaAlternate += delta;
    } else if (name === "spawn_object_at_actor" || name === "spawn_object_at_target") {
      const anchor = name === "spawn_object_at_actor" ? actorAnchor : targetAnchor;
      if (actionValue !== null) {
        objects.set(slot, {
          action: actionValue,
          x: anchor[0],
          y: anchor[1],
          flipX: CLEAN_STAGE_FLIP_X,
          spawnAnchor: name === "spawn_object_at_actor" ? "actor" : "target",
          spawnAction: actionValue,
          spawnSourceNode: String(command.source_node || ""),
          spawnSourceCommandIndex: Number(command.source_command_index),
        });
        snapshot(command, hold, commandIndex);
      }
    } else if (name === "set_object_action") {
      if (objects.has(slot) && actionValue !== null) {
        objects.get(slot).action = actionValue;
        snapshot(command, hold, commandIndex);
      }
    } else if (name === "increment_object_action" || name === "decrement_object_action") {
      if (objects.has(slot)) {
        const delta = name.startsWith("increment") ? 1 : -1;
        const candidate = (objects.get(slot).action + delta) & 0xff;
        if (available(candidate)) {
          objects.get(slot).action = candidate;
          snapshot(command, hold, commandIndex);
        }
      }
    } else if (name === "move_object_x" || name === "move_object_xy") {
      if (objects.has(slot)) {
        const item = objects.get(slot);
        item.x += signedByte(operand(command, "delta_x") ?? 0);
        if (name === "move_object_xy") {
          item.y += signedByte(operand(command, "delta_y") ?? 0);
        }
        snapshot(command, hold, commandIndex);
      }
    } else if (name === "clear_object_set_delay") {
      objects.delete(slot);
      snapshot(command, hold, commandIndex);
    } else if (name === "clear_effect_objects" || name === "clear_object0_y") {
      if (name === "clear_effect_objects") objects.clear();
      else objects.delete(0);
    } else if (name.startsWith("animate_")) {
      // 六个路径 handler 都把对象 0 硬编码在 $0337/$0347。
      const pathSlot = 0;
      if (!objects.has(pathSlot)) {
        const fallback = (closure.object_actions || [])
          .map(Number).find(value => available(value));
        if (fallback === undefined) continue;
        objects.set(pathSlot, {
          action: fallback, x: actorAnchor[0], y: actorAnchor[1],
          flipX: CLEAN_STAGE_FLIP_X, spawnAnchor: "actor",
          spawnAction: null,
          spawnSourceNode: "",
          spawnSourceCommandIndex: null,
        });
      }
      const item = objects.get(pathSlot);
      const startX = item.x;
      const startY = item.y;
      const [endX, endY] = targetAnchor;
      const duration = operand(command, "duration");
      const parameter = Math.max(1, operand(command, "path_parameter") ?? 1);
      // InitAttackPathFromActorAnchor 用「水平距离 / path_parameter」当 $D7；
      // opcode $18/$19 再用自己的 duration 字节替换它，并不每次都插值到终点。
      const fullSteps = Math.max(1, Math.floor(Math.abs(endX - startX) / parameter));
      const steps = duration !== null ? Math.max(1, duration) : fullSteps;
      const stepX = endX >= actorAnchor[0] ? parameter : -parameter;
      const stepY = (endY - startY) / fullSteps;
      const pathYStep = Math.floor(Math.abs(stepY) * 256);
      const signedPathYStep = stepY < 0 ? -pathYStep - 1 : pathYStep;
      const trailCount = operand(command, "trail_object_count") ?? 0;
      const toggled = name.includes("toggled");
      for (let step = 0; step < steps; step += 1) {
        // CopyAttackPathPositionHistory 按降序把真实槽坐标从 N-1 拷到 N。
        // 拖尾是有自己动作码的实心 metasprite，不是合成的半透明残影。
        for (let trailSlot = trailCount; trailSlot > 0; trailSlot -= 1) {
          const previous = objects.get(trailSlot - 1);
          const follower = objects.get(trailSlot);
          if (!previous || !follower) continue;
          follower.x = previous.x;
          follower.y = previous.y;
        }
        if (toggled) {
          const candidate = item.action ^ 1;
          if (available(candidate)) item.action = candidate;
        }
        item.x += stepX;
        item.y = gamePath
          ? Math.floor(startY + signedPathYStep * (step + 1) / 256)
          : item.y + stepY;
        snapshot(command, 1, commandIndex);
      }
    } else if (name === "set_delay") {
      snapshot(command, operand(command, "frames") ?? 0, commandIndex);
    }
    if (frames.length >= MAX_FRAMES) break;
  }

  if (!frames.length) {
    for (const action of (closure.object_actions || []).map(Number)) {
      if (!available(action)) continue;
      objects.clear();
      objects.set(0, {
        action, x: 128.0, y: 64.0, flipX: CLEAN_STAGE_FLIP_X,
        spawnAction: null,
        spawnSourceNode: "",
        spawnSourceCommandIndex: null,
      });
      snapshot("action_fallback", 3);
    }
  }
  return frames;
}

/**
 * 找出完整攻击里可按目标重播的受击段起点。
 *
 * 攻击脚本通常先用 `$13` 从攻击者锚点生成发射物，弹道结束后清空对象，再用
 * `$12` 从目标锚点进入命中特效。少数脚本（例如 `$02`）不在两段之间清空，
 * 因此以“最后一个攻击者对象之后的第一个目标对象”为硬边界；清空命令只用于把
 * 紧邻命中特效的空白/换 CHR 帧一并纳入。没有 `$12` 的震屏类命中段则退回到最后
 * 一次清空之后。无法识别时返回 `frames.length`，宁可不追加也不重播整次攻击。
 */
function attackImpactCommandStart(commands, frames) {
  const nameAt = index => String(commands[index]?.name || "");
  let lastActorSpawn = -1;
  for (let index = 0; index < commands.length; index += 1) {
    if (nameAt(index) === "spawn_object_at_actor") lastActorSpawn = index;
  }

  let targetSpawn = -1;
  for (let index = lastActorSpawn + 1; index < commands.length; index += 1) {
    if (nameAt(index) === "spawn_object_at_target") {
      targetSpawn = index;
      break;
    }
  }

  let boundaryCommand = targetSpawn;
  if (targetSpawn >= 0) {
    for (let index = lastActorSpawn + 1; index < targetSpawn; index += 1) {
      if (nameAt(index) === "clear_effect_objects") boundaryCommand = index + 1;
    }
  } else {
    for (let index = lastActorSpawn + 1; index < commands.length; index += 1) {
      if (nameAt(index) !== "clear_effect_objects") continue;
      if (frames.some(frame => Number(frame.commandIndex) > index)) {
        boundaryCommand = index + 1;
      }
    }
  }
  return boundaryCommand < 0 ? commands.length : boundaryCommand;
}

function attackImpactFrameStart(commands, frames) {
  if (!frames.length) return 0;
  const boundaryCommand = attackImpactCommandStart(commands, frames);
  if (boundaryCommand >= commands.length) return frames.length;
  const frameIndex = frames.findIndex(
    frame => Number(frame.commandIndex) >= boundaryCommand,
  );
  return frameIndex < 0 ? frames.length : frameIndex;
}

/**
 * 把完整攻击按 VM 的真实命令边界切成发射、弹道、击中三段。
 *
 * 发射段从脚本开头持续到第一个对象位移/路径命令；弹道段从该位移开始，到
 * `attackImpactFrameStart` 找出的目标对象边界；击中段则保留余下所有目标效果。
 * 没有位移命令的近战、枪口闪光等攻击自然得到 0 帧弹道，而不是硬按帧数三等分。
 */
function attackAnimationSegments(commands, frames) {
  const fullEnd = frames.length;
  const impactStart = Math.min(
    Math.max(attackImpactFrameStart(commands, frames), 0),
    fullEnd,
  );
  const trajectoryIndex = frames.findIndex((frame, index) => {
    if (index >= impactStart) return false;
    const event = String(frame.event || "");
    return event.startsWith("animate_") ||
      event === "move_object_x" || event === "move_object_xy";
  });
  const trajectoryStart = trajectoryIndex < 0 ? impactStart : trajectoryIndex;
  const range = (start, end) => ({
    start,
    end,
    count: Math.max(0, end - start),
  });
  return {
    launch: range(0, trajectoryStart),
    trajectory: range(trajectoryStart, impactStart),
    impact: range(impactStart, fullEnd),
    full: range(0, fullEnd),
  };
}

/**
 * 给 owner 命令定位到与逐帧切分一致的语义段。
 *
 * 范围使用 VM 展开后的命令序号；消费方只需拿 `source_node` 与
 * `source_command_index` 对照 owner 命令，不需要看字节偏移。一个 repeat 中的同一条
 * owner 命令可能跨段执行，因此调用方应保留它命中的全部段。
 */
function attackAnimationCommandSegments(commands, frames, segments = null) {
  const frameSegments = segments || attackAnimationSegments(commands, frames);
  const impactStart = Math.min(
    Math.max(attackImpactCommandStart(commands, frames), 0),
    commands.length,
  );
  const firstTrajectoryFrame = frameSegments.trajectory.count > 0
    ? frames[frameSegments.trajectory.start] : null;
  const trajectoryStart = Math.min(
    Math.max(
      firstTrajectoryFrame == null
        ? impactStart : Number(firstTrajectoryFrame.commandIndex),
      0,
    ),
    impactStart,
  );
  const range = (start, end) => ({
    start,
    end,
    count: Math.max(0, end - start),
  });
  return {
    launch: range(0, trajectoryStart),
    trajectory: range(trajectoryStart, impactStart),
    impact: range(impactStart, commands.length),
    full: range(0, commands.length),
  };
}

/**
 * `_battle_action_tile_placements` 的镜像。
 *
 * 打包的 `origin` **不是视觉中心**：高/低 nibble 分别是 X/Y 的四分之一图块锚点
 * 偏移。镜像路径反转 X 步长，并给每个发出的图块置上 OAM 水平翻转位。
 */
function battleActionPlacements(action, flipX = false) {
  if (!action?.available) return [];
  const origin = Number(action.origin);
  const originX = (origin >> 4) * 4;
  const originY = (origin & 0x0f) * 4;
  const startX = flipX ? originX : -originX - 1;
  const startY = -originY - 1;
  const stepX = flipX ? -8 : 8;
  const columns = Number(action.columns);
  const placements = [];
  (action.tiles || []).forEach((tileId, index) => {
    placements.push([
      Number(tileId),
      startX + (index % columns) * stepX,
      startY + Math.floor(index / columns) * 8,
      flipX,
    ]);
  });
  return placements;
}

/** `_paint_battle_action` 的镜像。`gameAnchor` 时坐标就是对象锚点。 */
function paintBattleAction(
  raster, action, tiles, palettes, x, y,
  {scale = 1, gameAnchor = false, flipX = false, tileVisible = null} = {},
) {
  if (!action?.available) return;
  const placements = battleActionPlacements(action, flipX);
  if (!placements.length) return;
  let offsetX = x;
  let offsetY = y;
  if (!gameAnchor) {
    const xs = placements.map(item => item[1]);
    const ys = placements.map(item => item[2]);
    const minimumX = Math.min(...xs);
    const maximumX = Math.max(...xs) + 8;
    const minimumY = Math.min(...ys);
    const maximumY = Math.max(...ys) + 8;
    offsetX = Math.round(x - (minimumX + maximumX) * scale / 2);
    offsetY = Math.round(y - (minimumY + maximumY) * scale / 2);
  }
  const paletteId = Number(action.palette_id);
  const palette = palettes.slice(paletteId * 4, paletteId * 4 + 4);
  for (const [tileId, relativeX, relativeY, tileFlipX] of placements) {
    if (tileId === 0) continue;
    const tileX = offsetX + relativeX * scale;
    // OAM 的 Y 是图块首行前一条扫描线。
    const tileY = offsetY + (relativeY + (gameAnchor ? 1 : 0)) * scale;
    if (tileVisible && !tileVisible(tileX, tileY)) continue;
    paintChrTile(
      raster.data, raster.width,
      tileX, tileY,
      tiles[tileId], palette,
      {hflip: tileFlipX, scale, background: null});
  }
}

/** 把一帧状态画成干净舞台画面。 */
function paintCleanFrame(frame, {tilesByBank, actionById, palettes}) {
  const raster = createRaster(
    CLEAN_CANVAS.width, CLEAN_CANVAS.height, STAGE_BACKGROUND);
  const tiles = tilesByBank.get(frame.effectBank);
  if (!tiles) return raster;
  for (const item of frame.objects) {
    const action = actionById.get(item.action);
    if (!action?.available) continue;
    paintBattleAction(
      raster, action, tiles, attackFramePalettes(frame, palettes),
      Math.round(item.x), Math.round(item.y),
      {gameAnchor: true, flipX: item.flipX});
  }
  return raster;
}

// ---------------------------------------------------------------------------
// 数据装配

const sourceCaches = new WeakMap();
const attackVisualPlaybacks = new WeakMap();
let attackVisualObserver = null;

function observeAttackVisualPlayback(canvas, start, stop) {
  attackVisualPlaybacks.set(canvas, {start, stop});
  if (typeof IntersectionObserver !== "function") {
    start();
    return;
  }
  attackVisualObserver ||= new IntersectionObserver(entries => {
    for (const entry of entries) {
      const playback = attackVisualPlaybacks.get(entry.target);
      if (!playback) continue;
      if (entry.isIntersecting) playback.start();
      else playback.stop();
    }
  }, {rootMargin: "160px 0px"});
  attackVisualObserver.observe(canvas);
}

/** 自定义缩略图选择器显隐时，立即启停已建立的 VM 时钟。 */
function setWeaponEffectPreviewPlayback(root, active) {
  if (!root) return;
  const canvases = [];
  if (root.matches?.("canvas[data-attack-visual], canvas[data-effect-object-motion]")) {
    canvases.push(root);
  }
  canvases.push(...(root.querySelectorAll?.(
    "canvas[data-attack-visual], canvas[data-effect-object-motion]",
  ) || []));
  canvases.forEach(canvas => {
    const playback = attackVisualPlaybacks.get(canvas);
    if (!playback) return;
    if (active) playback.start();
    else playback.stop();
  });
}

/** 战斗特效图案表：固定对 + 效果对，按 `chr_effect_bank` 选。 */
function battleEffectChrBanks(effectBank) {
  return resolveAttackChrPatternBanks(attackChrContextReference(effectBank));
}

const projectedOwnerAssets = new WeakMap();

async function effectiveBattleObjectAssets(assets) {
  if (!assets || typeof assets !== "object") return assets;
  if (isBattleObjectOwnerProjection(assets)) return assets;
  const [actionDocument, layoutDocument, metaspriteDocument] = await Promise.all([
    db.getResourceDocument("battle-action", null),
    db.getResourceDocument("battle-object-layout", null),
    db.getDocument(VISUAL_METASPRITES_RESOURCE_ID, null),
  ]);
  if (!actionDocument || !layoutDocument || !metaspriteDocument) {
    throw new TypeError("战斗预览缺少当前 battle-action / battle-object-layout / metasprite-record 正文");
  }
  const revision = ["battle-action", "battle-object-layout", VISUAL_METASPRITES_RESOURCE_ID]
    .map(id => db.fieldRevision(id)).join("|");
  const cached = projectedOwnerAssets.get(assets);
  if (cached?.actionDocument === actionDocument
      && cached?.layoutDocument === layoutDocument
      && cached?.metaspriteDocument === metaspriteDocument && cached.revision === revision) return cached.value;
  const value = projectBattleObjectOwners(
    assets, actionDocument, layoutDocument, metaspriteDocument);
  projectedOwnerAssets.set(
    assets, {actionDocument, layoutDocument, metaspriteDocument, revision, value});
  return value;
}

async function weaponEffectSources(assets) {
  await prepareAttackChrEntryContext();
  const [chrDocument, spritePaletteDocument] = await Promise.all([
    db.getDocument("shared-chr-bank", null),
    db.getResourceDocument("sprite-palette", null),
  ]);
  const revision = ["shared-chr-bank", "sprite-palette"].map(id => db.fieldRevision(id)).join("|");
  let byAssets = sourceCaches.get(chrDocument);
  if (!byAssets) {
    byAssets = new WeakMap();
    sourceCaches.set(chrDocument, byAssets);
  }
  let cache = byAssets.get(assets);
  if (!cache || cache.spritePaletteDocument !== spritePaletteDocument || cache.revision !== revision) {
    cache = {
      assets,
      spritePaletteDocument,
      revision,
      tilesByBank: new Map(),
      tileRequests: new Map(),
      states: new Map(),
      objectMotions: new Map(),
    };
    byAssets.set(assets, cache);
  }
  return cache;
}

async function effectTiles(cache, effectBank) {
  if (cache.tilesByBank.has(effectBank)) return;
  if (!cache.tileRequests.has(effectBank)) {
    const request = composeChrPatternTable(battleEffectChrBanks(effectBank))
      .then(table => {cache.tilesByBank.set(effectBank, decodeChrTiles(table));})
      .finally(() => {cache.tileRequests.delete(effectBank);});
    cache.tileRequests.set(effectBank, request);
  }
  await cache.tileRequests.get(effectBank);
}

function resolveFramePalettes(animation, documentValue) {
  const palettesBySelector = new Map();
  for (const frame of animation.frames) {
    const selector = frame.spritePaletteSelector;
    if (selector === null || selector === undefined) continue;
    if (!palettesBySelector.has(selector)) {
      palettesBySelector.set(selector,
        effectPaletteAfterCommand(animation.palettes, documentValue, selector));
    }
    frame.palettes = palettesBySelector.get(selector);
  }
}

function attackFramePalettes(frame, initialPalettes) {
  if (frame.spritePaletteSelector !== null && frame.spritePaletteSelector !== undefined) {
    if (!frame.palettes) throw new TypeError("攻击帧调色板尚未解析");
    return frame.palettes;
  }
  return initialPalettes;
}

/**
 * 解析一条视觉脚本的逐帧画面。
 *
 * `assets` 是 `clean_animations` 所在的武器特效资产文档。
 */
function attackAnimationState(assets, visualCode, {
  spawnActionOverride = null,
  actorAnchor = ACTOR_ANCHOR, targetAnchor = TARGET_ANCHOR,
  gamePath = false,
  initialEffectBank = attackInitialEffectBank(),
} = {}) {
  const scripts = assets.scripts || {};
  const primary = new Map(
    (scripts.primary || []).map(item => [Number(item.id), item]));
  const auxiliary = new Map(
    (scripts.auxiliary || []).map(item => [Number(item.id), item]));
  const actionById = new Map(
    (assets.battle_objects?.actions || [])
      .map(item => [Number(item.id), item]));
  const closure = (assets.dependency_closures || []).find(
    item => Number(item.visual_code) === Number(visualCode)) || {};
  const script = primary.get(Number(visualCode));
  if (!script || String(script.decode_status) !== "decoded") return null;

  let commands = expandAttackCommands(Number(visualCode), primary, auxiliary);
  if (spawnActionOverride) {
    const sourceNode = `visual:${Number(visualCode)
      .toString(16).toUpperCase().padStart(2, "0")}`;
    const sourceCommandIndex = Number(spawnActionOverride.sourceCommandIndex);
    const actionId = Number(spawnActionOverride.actionId);
    commands = commands.map(command => {
      if (command.source_node !== sourceNode
          || Number(command.source_command_index) !== sourceCommandIndex
          || !["spawn_object_at_actor", "spawn_object_at_target"].includes(
            String(command.name),
          )) return command;
      return {
        ...command,
        operands: (command.operands || []).map(item => item?.name === "action"
          ? {...item, value: actionId}
          : item),
      };
    });
  }
  const frames = cleanAnimationStates(closure, commands, actionById,
    {actorAnchor, targetAnchor, gamePath, initialEffectBank});
  const segments = attackAnimationSegments(commands, frames);
  const commandSegments = attackAnimationCommandSegments(commands, frames, segments);
  const impactFrameStart = segments.impact.start;
  const palettes = Uint8Array.from(
    (assets.clean_animations?.palette?.values || []).map(Number));
  return {
    commands,
    actorAnchor,
    targetAnchor,
    frames,
    segments,
    commandSegments,
    impactFrameStart,
    impactFrameCount: Math.max(0, frames.length - impactFrameStart),
    impactUsesTargetObjects: frames.slice(impactFrameStart).some(frame =>
      (frame.objects || []).some(item => item.spawnAnchor === "target")
    ),
    actionById,
    palettes,
  };
}

function realSpawnIdentity(item) {
  if (!String(item?.spawnSourceNode || "")
      || !Number.isInteger(Number(item?.spawnSourceCommandIndex))) return "";
  return [
    item.spawnSourceNode,
    Number(item.spawnSourceCommandIndex),
    Number(item.slot),
  ].join(":");
}

function spawnedObjectFrames(animation, matchesObject, projectObject = item => item) {
  if (!animation?.frames?.length) return [];
  const projected = [];
  for (const frame of animation.frames) {
    const objects = (frame.objects || []).filter(item =>
      realSpawnIdentity(item) && matchesObject(item)
    ).map(projectObject);
    if (objects.length) projected.push({...frame, objects});
  }
  return projected;
}

/**
 * 物品“核心效果对象”预览。游戏的六种路径 handler 都硬编码推进效果对象槽 0
 * （$0337/$0347）；拖尾只把该坐标复制给其它槽。因此这里从真实 spawn 中选择第一条
 * 确实移动过的槽 0 载体，只借它的逐帧坐标，再用 equipment flags 选出的独立核心
 * action 重绘。VM 的 action_fallback、其它对象、背景均不进入结果。
 */
function coreEffectMotionState(assets, visualCode, actionId) {
  if (actionId === null || actionId === undefined || actionId === ""
      || !Number.isInteger(Number(actionId))) return null;
  const animation = attackAnimationState(assets, visualCode);
  if (!animation) return null;
  const wantedAction = Number(actionId);
  const carriers = new Map();
  for (const frame of animation.frames) {
    for (const item of frame.objects || []) {
      const identity = realSpawnIdentity(item);
      if (!identity || Number(item.slot) !== 0) continue;
      let carrier = carriers.get(identity);
      if (!carrier) {
        carrier = {
          identity,
          sourceNode: item.spawnSourceNode,
          sourceCommandIndex: Number(item.spawnSourceCommandIndex),
          spawnAction: Number(item.spawnAction),
          positions: new Set(),
        };
        carriers.set(identity, carrier);
      }
      carrier.positions.add(
        `${Number(item.x).toFixed(4)},${Number(item.y).toFixed(4)}`,
      );
    }
  }
  const carrier = [...carriers.values()].find(item => item.positions.size > 1);
  const frames = carrier ? spawnedObjectFrames(
    animation,
    item => realSpawnIdentity(item) === carrier.identity,
    item => ({...item, sourceAction: item.action, action: wantedAction}),
  ) : [];
  return {
    ...animation,
    frames,
    sourceFrameCount: animation.frames.length,
    computedFrameCount: frames.length,
    projectedAction: wantedAction,
    projectedSourceCommandIndex: carrier?.sourceCommandIndex ?? null,
    carrierSpawnAction: carrier?.spawnAction ?? null,
  };
}

/**
 * 分段 battle-action 候选预览：把指定 owner spawn 的 action 临时替换成候选，
 * 再跑同一套 VM，只投影该 spawn 产生的对象。它不修改 Working 草稿。
 */
function attackActionCandidateMotionState(
  assets,
  visualCode,
  sourceCommandIndex,
  actionId,
) {
  const commandIndex = Number(sourceCommandIndex);
  const candidate = Number(actionId);
  if (!Number.isInteger(commandIndex) || !Number.isInteger(candidate)) return null;
  const animation = attackAnimationState(assets, visualCode, {
    spawnActionOverride: {sourceCommandIndex: commandIndex, actionId: candidate},
  });
  if (!animation) return null;
  const sourceNode = `visual:${Number(visualCode)
    .toString(16).toUpperCase().padStart(2, "0")}`;
  const frames = spawnedObjectFrames(animation, item =>
    item.spawnSourceNode === sourceNode
      && Number(item.spawnSourceCommandIndex) === commandIndex
      && Number(item.spawnAction) === candidate
  );
  return {
    ...animation,
    frames,
    sourceFrameCount: animation.frames.length,
    computedFrameCount: frames.length,
    projectedAction: candidate,
    projectedSourceCommandIndex: commandIndex,
  };
}

async function cleanAnimationFrames(assets, visualCode, options = {}) {
  const document_ = await effectiveBattleObjectAssets(assets);
  const cache = await weaponEffectSources(document_);
  return animationFrames(document_, cache, visualCode, options);
}

async function animationFrames(document_, cache, visualCode, options = {}) {
  const currentOptions = {initialEffectBank: attackInitialEffectBank(), ...options};
  const key = JSON.stringify([visualCode, currentOptions]);
  if (cache.states.has(key)) return cache.states.get(key);

  const animation = attackAnimationState(document_, visualCode, currentOptions);
  if (!animation) return null;
  resolveFramePalettes(animation, cache.spritePaletteDocument);
  for (const effectBank of new Set(animation.frames.map(frame => frame.effectBank))) {
    await effectTiles(cache, effectBank);
  }
  const result = {
    ...animation,
    tilesByBank: cache.tilesByBank,
  };
  cache.states.set(key, result);
  return result;
}

async function objectMotionFrames(cache, key, createState) {
  if (cache.objectMotions.has(key)) return cache.objectMotions.get(key);
  const animation = createState();
  if (!animation) {
    cache.objectMotions.set(key, null);
    return null;
  }
  resolveFramePalettes(animation, cache.spritePaletteDocument);
  for (const effectBank of new Set(animation.frames.map(frame => frame.effectBank))) {
    await effectTiles(cache, effectBank);
  }
  const result = {...animation, tilesByBank: cache.tilesByBank};
  cache.objectMotions.set(key, result);
  return result;
}

/**
 * 渲染后统一扫一遍 `[data-attack-visual]` 并批量画。
 *
 * 一条剪辑有几十帧。各画布先画所选分段的第一帧，需要动画的地方用
 * `data-attack-visual-play`；每个 VM 状态就是一个 NES 帧，实际步进速度由
 * `data-attack-visual-standard` 的 PAL / NTSC 制式决定。
 */
async function paintAttackVisualCanvases(root = document, assets = null) {
  const canvases = [...root.querySelectorAll("canvas[data-attack-visual]")];
  if (!canvases.length) return;
  const sourceDocument = assets
    || await db.getDocument("weapon-attack-parameter", null);
  if (!sourceDocument) return;
  const document_ = await effectiveBattleObjectAssets(sourceDocument);
  const cache = await weaponEffectSources(document_);
  // 同一批画布共用当前字段快照与 VM，取数不按画布重复。
  const resolvedByCode = new Map();
  const firstFrames = new Map();
  let emptyFrame;
  const resolveVisual = visualCode => {
    if (!resolvedByCode.has(visualCode)) {
      resolvedByCode.set(
        visualCode,
        animationFrames(document_, cache, visualCode),
      );
    }
    return resolvedByCode.get(visualCode);
  };
  for (const canvas of canvases) {
    if (canvas.dataset.attackVisualPainted === "1" || !canvas.isConnected) continue;
    try {
      const resolved = await resolveVisual(Number(canvas.dataset.attackVisual));
      if (!resolved?.frames.length) {
        canvas.dataset.attackVisualError = "该视觉脚本没有可解码帧";
        continue;
      }
      const context = canvas.getContext("2d");
      if (!context) continue;
      canvas.width = CLEAN_CANVAS.width;
      canvas.height = CLEAN_CANVAS.height;
      context.imageSmoothingEnabled = false;
      const segmentId = String(canvas.dataset.attackVisualSegment || "full");
      const segment = resolved.segments?.[segmentId];
      if (!segment) throw new TypeError(`未知攻击特效分段：${segmentId}`);
      canvas.dataset.attackVisualSegment = segmentId;
      canvas.dataset.attackVisualSegmentStart = String(segment.start);
      canvas.dataset.attackVisualSegmentEnd = String(segment.end);
      canvas.dataset.attackVisualFrames = String(segment.count);
      canvas.dataset.attackVisualComputedFrames = String(segment.count);
      canvas.dataset.attackVisualRenderedFrames = "0";
      canvas.dataset.attackVisualTotalFrames = String(resolved.frames.length);
      const status = canvas.closest("[data-attack-visual-segment-card]")
        ?.querySelector("[data-attack-visual-status]");
      if (status) {
        status.textContent = segment.count ? `${segment.count} 帧` : "";
      }
      const renderedFrames = new Set();
      const draw = index => {
        let image;
        if (!renderedFrames.size) {
          let frames = firstFrames.get(resolved);
          if (!frames) firstFrames.set(resolved, frames = new Map());
          image = frames.get(index);
          if (!image) {
            const raster = paintCleanFrame(resolved.frames[index], resolved);
            image = new ImageData(raster.data, raster.width, raster.height);
            frames.set(index, image);
          }
        } else {
          const raster = paintCleanFrame(resolved.frames[index], resolved);
          image = new ImageData(raster.data, raster.width, raster.height);
        }
        context.putImageData(image, 0, 0);
        if (index >= segment.start && index < segment.end) {
          renderedFrames.add(index - segment.start);
          canvas.dataset.attackVisualRenderedFrames = String(renderedFrames.size);
        }
      };
      if (segment.count) {
        draw(segment.start + Math.min(
          Number(canvas.dataset.attackVisualFrame || 0),
          segment.count - 1));
        delete canvas.dataset.attackVisualEmpty;
      } else {
        if (!emptyFrame) {
          const raster = createRaster(CLEAN_CANVAS.width, CLEAN_CANVAS.height, STAGE_BACKGROUND);
          emptyFrame = new ImageData(raster.data, raster.width, raster.height);
        }
        context.putImageData(emptyFrame, 0, 0);
        canvas.dataset.attackVisualEmpty = "1";
      }
      canvas.dataset.attackVisualPainted = "1";
      const video = nesVideoStandard(canvas.dataset.attackVisualStandard);
      canvas.dataset.attackVisualStandard = video.key;
      canvas.dataset.attackVisualPlaybackHz = video.hz.toFixed(5);
      canvas.dataset.attackVisualFrameDurationMs = nesFrameDurationMs(video.key)
        .toFixed(4);
      delete canvas.dataset.attackVisualError;
      if (canvas.dataset.attackVisualPlay === "1" && segment.count) {
        let clock = null;
        const stop = () => {
          clock?.cancel();
          clock = null;
          delete canvas.dataset.attackVisualTimer;
        };
        const start = () => {
          if (clock || !canvas.isConnected) return;
          clock = startNesFrameClock({
            standard: video.key,
            frameCount: segment.count,
            loop: true,
            shouldContinue: () => canvas.isConnected,
            onFrame: index => draw(segment.start + index),
          });
          canvas.dataset.attackVisualTimer = "1";
        };
        observeAttackVisualPlayback(canvas, start, stop);
      }
    } catch (error) {
      canvas.dataset.attackVisualError = String(error?.message || error);
    }
  }
  firstFrames.clear();
}

function paintEffectObjectMotionFrame(frame, {
  tilesByBank,
  actionById,
  palettes,
}) {
  const raster = createRaster(CLEAN_CANVAS.width, CLEAN_CANVAS.height, null);
  const tiles = tilesByBank.get(frame.effectBank);
  if (!tiles) return raster;
  for (const item of frame.objects || []) {
    const action = actionById.get(Number(item.action));
    if (!action?.available) continue;
    paintBattleAction(
      raster,
      action,
      tiles,
      attackFramePalettes(frame, palettes),
      Math.round(item.x),
      Math.round(item.y),
      {gameAnchor: true, flipX: item.flipX},
    );
  }
  return raster;
}

/**
 * 核心效果与 battle-action 候选共用的“单个真实 spawn 对象”画布。核心模式没有
 * 真实槽 0 运动时保持透明，并把现算/渲染帧数都置为 0。
 */
async function paintEffectObjectMotionCanvases(
  root = document,
  assets = null,
) {
  const canvases = [...root.querySelectorAll("canvas[data-effect-object-motion]")];
  if (!canvases.length) return;
  const sourceDocument = assets
    || await db.getDocument("weapon-attack-parameter", null);
  if (!sourceDocument) return;
  const document_ = await effectiveBattleObjectAssets(sourceDocument);
  const cache = await weaponEffectSources(document_);
  for (const canvas of canvases) {
    if (canvas.dataset.effectObjectMotionPainted === "1" || !canvas.isConnected) continue;
    const visualText = canvas.getAttribute("data-effect-object-visual");
    const visualCode = visualText === null || visualText === ""
      ? null : Number(visualText);
    const actionText = canvas.getAttribute("data-effect-object-action");
    const actionId = actionText === null || actionText === ""
      ? null : Number(actionText);
    const sourceText = canvas.getAttribute("data-effect-object-source-command");
    const sourceCommandIndex = sourceText === null || sourceText === ""
      ? null : Number(sourceText);
    const context = canvas.getContext("2d");
    if (!context) continue;
    canvas.width = CLEAN_CANVAS.width;
    canvas.height = CLEAN_CANVAS.height;
    context.imageSmoothingEnabled = false;
    const status = canvas.closest("[data-effect-object-motion-card]")
      ?.querySelector("[data-effect-object-motion-status]");
    const paintEmpty = () => {
      context.clearRect(0, 0, CLEAN_CANVAS.width, CLEAN_CANVAS.height);
      canvas.dataset.effectObjectMotionComputedFrames = "0";
      canvas.dataset.effectObjectMotionRenderedFrames = "0";
      canvas.dataset.effectObjectMotionEmpty = "1";
      canvas.dataset.effectObjectMotionPainted = "1";
      if (status) {
        status.textContent = sourceCommandIndex === null
          ? "这个核心效果没有可播的运动"
          : "这个候选没有可播的帧";
      }
    };
    try {
      if (!Number.isInteger(visualCode) || !Number.isInteger(actionId)) {
        paintEmpty();
        continue;
      }
      const key = sourceCommandIndex === null
        ? `core:${visualCode}:${actionId}`
        : `candidate:${visualCode}:${sourceCommandIndex}:${actionId}`;
      const resolved = await objectMotionFrames(cache, key, () =>
        sourceCommandIndex === null
          ? coreEffectMotionState(document_, visualCode, actionId)
          : attackActionCandidateMotionState(
              document_, visualCode, sourceCommandIndex, actionId,
            )
      );
      if (!resolved?.frames?.length) {
        paintEmpty();
        continue;
      }
      const renderedFrames = new Set();
      const draw = index => {
        const raster = paintEffectObjectMotionFrame(resolved.frames[index], resolved);
        context.putImageData(
          new ImageData(raster.data, raster.width, raster.height),
          0,
          0,
        );
        renderedFrames.add(index);
        canvas.dataset.effectObjectMotionRenderedFrames = String(
          renderedFrames.size,
        );
      };
      const computed = resolved.frames.length;
      canvas.dataset.effectObjectMotionComputedFrames = String(computed);
      canvas.dataset.effectObjectMotionRenderedFrames = "0";
      canvas.dataset.effectObjectMotionSourceFrames = String(
        resolved.sourceFrameCount,
      );
      canvas.dataset.effectObjectMotionMaxObjects = String(Math.max(
        0,
        ...resolved.frames.map(frame => frame.objects?.length || 0),
      ));
      canvas.dataset.effectObjectMotionSpawnActions = [...new Set(
        resolved.frames.flatMap(frame =>
          (frame.objects || []).map(item => Number(item.spawnAction))
        ),
      )].join(",");
      if (resolved.projectedSourceCommandIndex !== null
          && resolved.projectedSourceCommandIndex !== undefined) {
        canvas.dataset.effectObjectMotionCarrierCommand = String(
          resolved.projectedSourceCommandIndex,
        );
      }
      if (resolved.carrierSpawnAction !== null
          && resolved.carrierSpawnAction !== undefined) {
        canvas.dataset.effectObjectMotionCarrierSpawnAction = String(
          resolved.carrierSpawnAction,
        );
      }
      draw(Math.min(
        Number(canvas.dataset.effectObjectMotionFrame || 0),
        computed - 1,
      ));
      delete canvas.dataset.effectObjectMotionEmpty;
      canvas.dataset.effectObjectMotionPainted = "1";
      if (status) {
        status.textContent = status.hasAttribute("data-effect-object-motion-compact-status")
          ? `${computed} 帧`
          : `${computed} 帧 · 只播放核心效果对象`;
      }
      const video = nesVideoStandard(canvas.dataset.effectObjectMotionStandard);
      canvas.dataset.effectObjectMotionStandard = video.key;
      canvas.dataset.effectObjectMotionPlaybackHz = video.hz.toFixed(5);
      delete canvas.dataset.effectObjectMotionError;
      if (canvas.dataset.effectObjectMotionPlay === "1") {
        let clock = null;
        const stop = () => {
          clock?.cancel();
          clock = null;
          delete canvas.dataset.effectObjectMotionTimer;
        };
        const start = () => {
          if (clock || !canvas.isConnected) return;
          clock = startNesFrameClock({
            standard: video.key,
            frameCount: computed,
            loop: true,
            shouldContinue: () => canvas.isConnected,
            onFrame: draw,
          });
          canvas.dataset.effectObjectMotionTimer = "1";
        };
        observeAttackVisualPlayback(canvas, start, stop);
      }
    } catch (error) {
      paintEmpty();
      canvas.dataset.effectObjectMotionError = String(error?.message || error);
    }
  }
}

/**
 * 单个「CHR 模式 / 动作码」的对照格。
 *
 * 取代 `previews/clean/action-atlases/*.png` 与那张总图 `action-atlas.png`：
 * 图集本来就是把同一个动作在不同 opcode-$04 模式下各画一格，现画之后按格渲染，
 * 不需要预先拼成一张大图。
 */
async function paintBattleActionCanvases(root = document, assets = null) {
  const canvases = [...root.querySelectorAll("canvas[data-battle-action]")];
  if (!canvases.length) return;
  const sourceDocument = assets
    || await db.getDocument("weapon-attack-parameter", null);
  if (!sourceDocument) return;
  const document_ = await effectiveBattleObjectAssets(sourceDocument);
  const actionById = new Map(
    (document_.battle_objects?.actions || []).map(item => [Number(item.id), item]));
  const palettes = Uint8Array.from(
    (document_.clean_animations?.palette?.values || []).map(Number));
  const cache = await weaponEffectSources(document_);
  const cell = 64;
  for (const canvas of canvases) {
    if (canvas.dataset.battleActionPainted === "1" || !canvas.isConnected) continue;
    try {
      const effectBank = Number(canvas.dataset.battleActionBank);
      const action = actionById.get(Number(canvas.dataset.battleAction));
      if (!action) throw new TypeError("动作码不存在");
      await effectTiles(cache, effectBank);
      const raster = createRaster(cell, cell, STAGE_BACKGROUND);
      paintBattleAction(
        raster, action, cache.tilesByBank.get(effectBank), palettes,
        cell / 2, cell / 2 + 5, {scale: 1});
      canvas.width = cell;
      canvas.height = cell;
      const context = canvas.getContext("2d");
      if (!context) continue;
      context.imageSmoothingEnabled = false;
      context.putImageData(new ImageData(raster.data, cell, cell), 0, 0);
      canvas.dataset.battleActionPainted = "1";
      delete canvas.dataset.battleActionError;
    } catch (error) {
      canvas.dataset.battleActionError = String(error?.message || error);
    }
  }
}

/** 单个真实 spawn 对象运动预览的标记生成器。 */
function effectObjectMotionCanvas({
  visualCode,
  action,
  sourceCommandIndex = null,
  frame = 0,
  play = false,
  className = "",
  label = "",
} = {}) {
  const attributes = [
    "data-effect-object-motion",
    `data-effect-object-visual="${visualCode === null || visualCode === undefined
      ? "" : Number(visualCode)}"`,
    `data-effect-object-action="${action === null || action === undefined
      ? "" : Number(action)}"`,
    sourceCommandIndex === null || sourceCommandIndex === undefined
      ? "" : `data-effect-object-source-command="${Number(sourceCommandIndex)}"`,
    frame ? `data-effect-object-motion-frame="${Number(frame)}"` : "",
    play ? 'data-effect-object-motion-play="1"' : "",
    className ? `class="${className}"` : "",
    label ? `aria-label="${label}"` : "",
  ].filter(Boolean).join(" ");
  return `<canvas ${attributes}></canvas>`;
}

/** 动作对照格的标记生成器。 */
function battleActionCanvas({effectBank, action, className = "", label = ""} = {}) {
  const attributes = [
    `data-battle-action="${Number(action)}"`,
    `data-battle-action-bank="${Number(effectBank)}"`,
    className ? `class="${className}"` : "",
    label ? `aria-label="${label}"` : "",
  ].filter(Boolean).join(" ");
  return `<canvas ${attributes}></canvas>`;
}

/** 给消费方用的标记生成器。 */
function attackVisualCanvas({
  visualCode, frame = 0, play = false, segment = "full", className = "", label = "",
} = {}) {
  const segmentId = ["launch", "trajectory", "impact", "full"].includes(segment)
    ? segment : "full";
  const attributes = [
    `data-attack-visual="${Number(visualCode)}"`,
    `data-attack-visual-segment="${segmentId}"`,
    frame ? `data-attack-visual-frame="${Number(frame)}"` : "",
    play ? 'data-attack-visual-play="1"' : "",
    className ? `class="${className}"` : "",
    label ? `aria-label="${label}"` : "",
  ].filter(Boolean).join(" ");
  return `<canvas ${attributes}></canvas>`;
}

var weaponEffectVm = /*#__PURE__*/Object.freeze({
  __proto__: null,
  ACTOR_ANCHOR: ACTOR_ANCHOR,
  CLEAN_CANVAS: CLEAN_CANVAS,
  attackAnimationCommandSegments: attackAnimationCommandSegments,
  attackAnimationState: attackAnimationState,
  attackFramePalettes: attackFramePalettes,
  attackVisualCanvas: attackVisualCanvas,
  battleActionCanvas: battleActionCanvas,
  battleActionPlacements: battleActionPlacements,
  battleEffectChrBanks: battleEffectChrBanks,
  cleanAnimationFrames: cleanAnimationFrames,
  cleanAnimationStates: cleanAnimationStates,
  effectObjectMotionCanvas: effectObjectMotionCanvas,
  expandAttackCommands: expandAttackCommands,
  paintAttackVisualCanvases: paintAttackVisualCanvases,
  paintBattleAction: paintBattleAction,
  paintBattleActionCanvases: paintBattleActionCanvases,
  paintCleanFrame: paintCleanFrame,
  paintEffectObjectMotionCanvases: paintEffectObjectMotionCanvases,
  setWeaponEffectPreviewPlayback: setWeaponEffectPreviewPlayback
});

// @editor-module 解析资源外键、文本引用、字节范围与地址展示单元格。
//
// 来源：拆分前 engine/editor/app.js 第 1232-1493 行。


function romMapAddressHref(address) {
  const target = physicalAddressTarget(address);
  return target
    ? `?view=${target.view}&amp;${target.parameter}=${target.focus}`
    : null;
}

// 地址里的十六进制一律在这儿现算。投影不再把 bank_hex / prg_offset_hex 这类
// 数值字段的孪生字符串一起发过来——26 854 条记录发两遍是 7.5 MiB 的纯冗余。

// 一行的物理地址就是 `<space>:<offset>`，三个空间同一种写法。以前这里是
// `space === "chr" ? CHR : PRG`——任何非 CHR 空间都会被标成 "PRG"，sram 一旦
// 登记 resource_ids 就会显示成错误的空间。
/** 资源 UID 关联范围只从实际字段对象组成的视图取得；缺少登记须单独报告。 */
function resourceByteRangeLookup(uid) {
  const key = uid === null || uid === undefined ? "" : String(uid);
  if (!key) return {uid: key, status: "no-uid", ranges: []};
  const associations = state.resourceRangeFieldViews;
  if (!associations) {
    return {uid: key, status: "unavailable", ranges: []};
  }
  if (associations.has(key)) {
    const ranges = associations.ranges(key);
    return Array.isArray(ranges)
      ? {uid: key, status: "found", ranges}
      : {uid: key, status: "invalid", ranges: []};
  }
  const addressKind = String(indexedResource(key)?.physical_address_kind || "");
  if (addressKind === "composite" || addressKind === "derived") {
    return {uid: key, status: "addressless", ranges: []};
  }
  const expectedShard = resourceDomain(key)
    || associations.expectedShard(key)
    || null;
  if (expectedShard && !associations.loadedShards.includes(expectedShard)) {
    return {uid: key, status: "not-loaded", ranges: []};
  }
  return {uid: key, status: "missing", ranges: []};
}

let reportedByteRangeSource = null;
const reportedByteRangeIssues = new Set();

function reportResourceByteRangeIssue(lookup) {
  const source = state.resourceRangeFieldViews || null;
  if (source !== reportedByteRangeSource) {
    reportedByteRangeSource = source;
    reportedByteRangeIssues.clear();
  }
  const issue = `${lookup.status}:${lookup.uid}`;
  if (reportedByteRangeIssues.has(issue)) return;
  reportedByteRangeIssues.add(issue);
  if (lookup.status === "missing") {
    editorLog.record({source: "数据载入", level: "warning", message: `${lookup.uid} 不在已加载的字段对象关联视图中`});
  } else if (lookup.status === "invalid") {
    editorLog.record({source: "数据载入", level: "warning", message: `${lookup.uid} 的关联范围无效`});
  }
}

function resourceByteRanges(uid) {
  const lookup = resourceByteRangeLookup(uid);
  if (lookup.status === "missing" || lookup.status === "invalid") {
    reportResourceByteRangeIssue(lookup);
  }
  return lookup.ranges;
}

/** 这一行的 ROM 范围登记了没有。 */

const FIELD_RANGE_ROLE_PREFIX = "field:";

function normalizedResourceByteRange(range, rangeIndex) {
  const role = String(range?.role || "");
  const rawOffset = range?.offset;
  const numericOffset = rawOffset === null || rawOffset === undefined
    ? null : Number(rawOffset);
  const rawLength = range?.length;
  const numericLength = rawLength === null || rawLength === undefined
    ? null : Number(rawLength);
  const fieldKey = role.startsWith(FIELD_RANGE_ROLE_PREFIX)
    ? role.slice(FIELD_RANGE_ROLE_PREFIX.length) : null;
  return {
    key: fieldKey ?? role,
    fieldKey,
    role,
    space: String(range?.space || "").toLowerCase(),
    offset: Number.isInteger(numericOffset) && numericOffset >= 0
      ? numericOffset : null,
    length: Number.isInteger(numericLength) && numericLength >= 0
      ? numericLength : null,
    status: range?.status === null || range?.status === undefined
      ? "" : String(range.status),
    source: range?.source === null || range?.source === undefined
      ? "" : String(range.source),
    rangeIndex,
    slotIndex: null,
    slotCount: null,
    slotWidth: null,
  };
}

/** uid 下所有 `field:<key>` 片段的统一展示模型。 */
function resourceFieldByteRanges(uid) {
  const ranges = resourceByteRanges(uid);
  if (!Array.isArray(ranges)) return [];
  return ranges.flatMap((range, rangeIndex) => {
    if (!String(range?.role || "").startsWith(FIELD_RANGE_ROLE_PREFIX)) return [];
    return [normalizedResourceByteRange(range, rangeIndex)];
  });
}

function slotDeclaration(declarations, role) {
  if (declarations instanceof Map) return declarations.get(role) || null;
  if (!declarations || typeof declarations !== "object"
      || !Object.prototype.hasOwnProperty.call(declarations, role)) return null;
  return declarations[role] || null;
}

/**
 * 把资源片段按调用方声明的 `{slotCount, slotWidth}` 展开。
 *
 * 原语不认识任何业务 role；没有声明的片段保留为一行。声明必须恰好覆盖整段，
 * 否则立刻报错，避免提取器改变段长后仍用旧槽宽悄悄错位。
 */
function expandResourceByteRangeSlots(uid, declarations = {}) {
  const ranges = resourceByteRanges(uid);
  if (!Array.isArray(ranges)) return [];
  return ranges.flatMap((range, rangeIndex) => {
    const normalized = normalizedResourceByteRange(range, rangeIndex);
    const declaration = slotDeclaration(declarations, normalized.role);
    if (!declaration) return [normalized];
    const slotCount = Number(declaration.slotCount);
    const slotWidth = Number(declaration.slotWidth);
    if (!Number.isInteger(slotCount) || slotCount <= 0
        || !Number.isInteger(slotWidth) || slotWidth <= 0) {
      throw new TypeError(
        `${normalized.role || "（无 role）"} 的槽声明必须给出正整数 slotCount / slotWidth`,
      );
    }
    if (normalized.offset === null || normalized.length === null
        || normalized.length !== slotCount * slotWidth) {
      throw new RangeError(
        `${String(uid || "（无 uid）")} 的 ${normalized.role || "（无 role）"} `
        + `长度为 ${normalized.length ?? "未登记"} B，不能按 ${slotCount} × ${slotWidth} B 展开`,
      );
    }
    return Array.from({length: slotCount}, (_, slotIndex) => ({
      ...normalized,
      key: `${normalized.key}[${slotIndex}]`,
      offset: normalized.offset + slotIndex * slotWidth,
      length: slotWidth,
      slotIndex,
      slotCount,
      slotWidth,
      segmentOffset: normalized.offset,
      segmentLength: normalized.length,
    }));
  });
}

// 资源索引按模块存放，用命名规则寻址。
//
// uid 是 `表名:序号`，62 种前缀零跨域歧义，所以前缀本身就够定位它属于哪个模块
// （投影里的 `resource_index.uid_domains` 就是那张 1.5 KB 的路由表）。以前这里
// 是一个 26 854 条的全局数组，任何一次查询都要先把整块建成 Map；现在每个模块
// 一份，查询按前缀直达自己那一份。
//
// 每份表按**来源数组身份**缓存，而不是"建一次就永远用"：字符映射保存后会重算
// 并替换 state.project，按需分段补进来时也会换掉数组。用身份做键，两种情况都
// 自动重建，调用点不需要记得手动失效。
const domainMaps = new Map();
const domainSources = new Map();

function domainRecords(domain) {
  return state.project?.resource_index?.by_domain?.[domain] || null;
}

function domainIndex(domain) {
  const records = domainRecords(domain);
  if (!records) return null;
  if (domainSources.get(domain) !== records) {
    domainMaps.set(domain, new Map(records.map(record => [record.uid, record])));
    domainSources.set(domain, records);
  }
  return domainMaps.get(domain);
}

/** uid 前缀 → 它属于哪个模块。 */
function resourceDomain(uid) {
  const prefix = String(uid || "").split(":", 1)[0];
  return state.project?.resource_index?.uid_domains?.[prefix] || null;
}

function indexedResource(uid) {
  if (!uid) return null;
  const domain = resourceDomain(uid);
  if (!domain) return null;
  return domainIndex(domain)?.get(String(uid)) || null;
}

function addresslessResourceKind(record) {
  const declared = String(record?.physical_address_kind || "");
  if (declared === "composite" || declared === "derived") return declared;
  // 是否无独立地址是生成期逐资源审计的事实，不能靠前端 kind 白名单猜测。
  // 未声明且没有 range 的记录一律暴露为登记缺口。
  return "unregistered";
}

/** 资源 UID 对应的统一物理地址展示模型。 */
function resourcePhysicalAddressSummary(uid) {
  const summary = summarizePhysicalRanges(resourceByteRanges(uid));
  if (summary.kind !== "unregistered") return {...summary, uid: String(uid || "")};
  return {
    ...summary,
    uid: String(uid || ""),
    kind: addresslessResourceKind(indexedResource(uid)),
  };
}

/** 资源跳转没有专属页面时所用的语义主入口；无声明时才回退到展示首项。 */
function resourcePrimaryAddress(uid) {
  const summary = resourcePhysicalAddressSummary(uid);
  return summary.ranges.find(range => range?.primary === true || range?.is_primary === true)
    || summary.entries[0]?.range
    || null;
}

/**
 * 遍历所有模块的索引记录。
 *
 * 只给「按 kind 找一批记录」这类需求用（CHR bank、字模、调查图块）。按 uid 找
 * 单条一律走 `indexedResource()`，那是 O(1) 的。
 */

// 引用处显示的名字是**副本**：权威在各自的域表里。副本不许编辑，也不该缓存
// ——渲染时现查，实时查询的开销完全可以接受。这里按 kind 路由到权威表；投影
// 里已经不再发这些 kind 的 label（见 mm_preview.COPIED_LABEL_KINDS）。
//
// 没登记的 kind 的 label 不是副本，是索引自己合成的显示名（「场景 02 图块调查
// 格 (1,3)」这种），没有别处可查，照用索引里的那一份。
function uidTail(uid, prefix) {
  return String(uid || "").startsWith(`${prefix}:`)
    ? String(uid).slice(prefix.length + 1) : null;
}

function gameDataName(section, uid, prefix) {
  const tail = uidTail(uid, prefix);
  if (tail === null) return null;
  const id = Number.parseInt(tail, 16);
  if (!Number.isInteger(id)) return null;
  const records = state.project?.game_data?.[section]?.records || [];
  return records.find(record => Number(record.id) === id)?.name || null;
}

const LABEL_AUTHORITIES = {
  "monster-stat": uid => gameDataName("monsters", uid, "monster"),
  item: uid => gameDataName("items", uid, "item"),
  "normal-shell": uid => gameDataName("shells", uid, "shell"),
  "special-shell": uid => gameDataName("shells", uid, "shell"),
  "map-scene": uid => {
    const tail = uidTail(uid, "scene");
    const id = tail === null ? null : Number.parseInt(tail, 16);
    if (!Number.isInteger(id)) return null;
    return (state.project?.scenes?.editable_scenes || [])
      .find(entry => Number(entry.id) === id)?.name || null;
  },
  "ui-script-record": uid => currentTextReference(uid).label || null,
  "font-glyph": uid => {
    const code = String(uid).replace(/^font-glyph:/, "").replaceAll(":", " ");
    const unicode = state.project?.text_references?.glyphs?.[code]?.unicode;
    return unicode ? `字符「${unicode}」 · ${code}` : `字符 ${code}`;
  },
};

/**
 * 按资源 ID 取当前显示名。
 *
 * 名字来自 ROM 文本，会随字符映射编辑而变。以前索引里存一份 label 副本，还要
 * 靠一段回写逻辑维持同步；现在直接到权威表里查，副本不复存在，也就没有"文本
 * 更新了、引用处还是旧名"这回事。
 */
function resourceLabel(uid, fallback = null) {
  if (!uid) return fallback;
  if (String(uid).startsWith("audio-command:")) {
    return audioCommandLabel(Number.parseInt(uidTail(uid, "audio-command"), 16));
  }
  const record = indexedResource(uid);
  const authority = LABEL_AUTHORITIES[record?.kind];
  if (authority) return authority(uid, record) || record?.label || fallback || uid;
  return record?.label || fallback;
}

// 物品类别按已发布 UID 关联判断，UID 不作为物理字段对象的 owner。
const ITEM_ASSOCIATION_UID_PREFIXES = Object.freeze(["human-item", "tank-item"]);

function itemResourceUid(itemOrId) {
  const id = Number(itemOrId && typeof itemOrId === "object" ? itemOrId.id : itemOrId);
  if (!Number.isInteger(id) || id < 0 || id > 0xFF) {
    throw new TypeError(`无效的物品 ID：${String(id)}`);
  }
  const associations = state.resourceRangeFieldViews;
  if (!associations) {
    throw new Error("物品资源关联范围尚未加载");
  }
  const candidates = ITEM_ASSOCIATION_UID_PREFIXES
    .map(prefix => recordUid(prefix, id))
    .filter(uid => associations.has(uid));
  if (candidates.length !== 1) {
    const suffix = id.toString(16).toUpperCase().padStart(2, "0");
    throw new RangeError(
      `字段对象关联视图没有给物品 ${suffix} 唯一类别（命中：${candidates.join("、") || "0"}）`,
    );
  }
  return candidates[0];
}

function uiScriptResourceUid(reference) {
  const value = String(reference || "");
  return value.startsWith("record:")
    ? `ui-script:${value.slice("record:".length)}`
    : value;
}

function currentTextReference(reference, {ranges = null} = {}) {
  const uid = uiScriptResourceUid(reference);
  const resource = indexedResource(uid);
  const nodeId = uid.startsWith("ui-script:") ? `record:${uid.slice("ui-script:".length)}` : "";
  const project = state.project;
  const record = project?.text_record_edits?.records?.[nodeId];
  const encoding = project?.text_record_encoding;
  return {
    uid,
    label: record && encoding
      ? ranges ? decodeFixedTextRecordSelection(record, encoding, ranges).text
        : decodeFixedTextRecord(record, encoding, {fillPlaceholders: true}).formatted_text
      : String(project?.text_references?.records?.[nodeId]?.text || ""),
    status: resource?.status || null,
  };
}

function currentTextChoiceLabel(reference) {
  const match = /^text-record:([0-9A-F]{2}):([0-9A-F]{3})$/u.exec(reference?.record || '');
  if (!match) return '';
  const record = `record:${match[1]}:${String(parseInt(match[2], 16)).padStart(3, '0')}`;
  const text = currentTextReference(record).label;
  if (Number.isInteger(reference.line)) return text.split('\n')[reference.line]?.trim() || '';
  if (Number.isInteger(reference.glyph_index)) return [...text.replace(/\s/gu, '')][reference.glyph_index] || '';
  return text.trim();
}

/** 曲名只解引用点唱机声明的游戏文字；无曲名时显示命令编号。 */
function audioCommandLabel(id) {
  const entry = (state.project?.facilities?.configuration_loader?.pointer_entries || [])
    .find(item => Number(item.family_id) === 0x0A);
  const good = (entry?.value_namespace?.goods || [])
    .find(item => Number(item.value) === Number(id));
  return currentTextReference(good?.text_record || good?.resource_uid).label
    || `音频命令 ${hex$1(Number(id), 2)}`;
}

function currentTextReferenceLink(reference, fallback = null) {
  const current = currentTextReference(reference);
  const label = current.label || fallback || reference || current.uid;
  return `<button class="resource-inline-link current-text-reference" type="button" data-resource-target="${esc(current.uid)}" title="${esc(current.uid)}"><b>${esc(label)}</b><small>${esc(current.uid)}</small></button>`;
}

function currentTextReferenceStatusLabel(status) {
  const mappingStatus = String(status || "").match(/unicode-([^/]+)$/)?.[1];
  if (mappingStatus === "confirmed") return "人工确认";
  if (mappingStatus === "candidate-complete") return "完整映射";
  return String(status || "状态未登记");
}

/** 引用处的当前正文：附注进 title，视觉上只保留可点击文字。 */
function plainTextRecordReferences(
  recordIds,
  emptyLabel = "",
) {
  const ids = [...new Set((recordIds || []).filter(Boolean).map(String))];
  const links = ids.map(reference => {
    const current = currentTextReference(reference);
    if (!current.label) return "";
    const nodeId = String(indexedResource(current.uid)?.game_id || reference);
    const title = `${nodeId} · ${currentTextReferenceStatusLabel(current.status)}`;
    return `<button class="resource-inline-link plain-text-reference" type="button" data-resource-target="${esc(current.uid)}" title="${esc(title)}">${esc(current.label)}</button>`;
  }).filter(Boolean);
  return links.length
    ? `<span class="plain-text-references">${links.join("")}</span>`
    : emptyLabel ? `<span class="resource-empty">${esc(emptyLabel)}</span>` : "";
}

function textRecordDisplayText(record) {
  if (!record) return "";
  const direct = String(record.formatted_text || record.display_text || "");
  if (direct) return direct;
  const mapping = record.unicode_mapping || {};
  const preview = String(record.unicode_preview || "");
  return mapping.confirmed_complete && preview && !preview.includes("□")
    ? preview : "";
}

/**
 * 不要在普通引用处调用这套重建式呈现：卡片外壳会挤占表格与记录页的视觉空间。
 * 引用处请调用 plainTextRecordReferences()；重建式卡片只归 views/text/ 的文本
 * 管理页与 views/ui-editor.js 的 1:1 UI 重建。
 */
function currentTextRecordCard(record, {compact = false} = {}) {
  const text = currentTextReference(record?.node_id).label || textRecordDisplayText(record);
  if (!text) return "";
  const resourceUid = uiScriptResourceUid(record.node_id);
  return `<button class="current-text-record ${compact ? "compact" : ""}" type="button" data-resource-target="${esc(resourceUid)}" title="${esc(resourceUid)}">
    <span>${esc(text)}</span><small>${esc(record.node_id)}</small>
  </button>`;
}

function physicalRangeTitle(range) {
  const label = physicalAddressOf(range) || "无效地址";
  const length = Number(range?.length);
  const size = Number.isInteger(length) && length > 0 ? `${length} B` : "长度未登记";
  const roles = Array.isArray(range?.roles) && range.roles.length
    ? range.roles.join(" / ") : range?.role;
  return [label, size, roles, range?.status || "未分级"].filter(Boolean).join(" · ");
}

/** 已有直接 `{space, offset}` source 的可点击物理地址。 */
function directPhysicalAddress(address, options = {}) {
  const label = options.label || physicalAddressOf(address);
  const href = romMapAddressHref(address);
  if (!label || !href) {
    return "";
  }
  const title = options.title || physicalRangeTitle(address);
  const deferredTitle = options.deferredAddressTitle
    ? ` data-address-title-space="${esc(String(address.space || ""))}"` : "";
  return `<a class="mono resource-address-link" href="${href}" title="${esc(title)}"${deferredTitle}>${esc(label)}</a>`;
}

function physicalAddressLink(source, {
  label = "", fallback = "", missingClass = "resource-unregistered",
  includeCpu = false, invalidFallback = null, ...options
} = {}) {
  const value = source?.offset != null || source?.prg_offset != null
    ? source : source?.source;
  const offset = value?.offset ?? value?.prg_offset;
  if (offset == null || !Number.isInteger(Number(offset))) {
    return `<span class="${esc(missingClass)}">${esc(fallback)}</span>`;
  }
  const address = {...value, space: value.space || "prg", offset: Number(offset),
    length: Number(value.length ?? value.width ?? 1)};
  if (invalidFallback !== null && !romMapAddressHref(address)) {
    return `<span class="${esc(missingClass)}">${esc(invalidFallback)}</span>`;
  }
  const text = label || (includeCpu
    ? `${physicalAddressOf(address) || "—"} · CPU ${address.cpu_address != null ? hex$1(address.cpu_address, 4) : "—"}`
    : physicalAddressOf(address));
  return directPhysicalAddress(address, {...options, label: text});
}

/** 明确表示该行只是组合/派生视图，不把子资源入口冒充成自身地址。 */
function noIndependentPhysicalAddress(label = "") {
  return `<span class="resource-empty" title="该行引用其他资源，但没有可归属给自身的独立物理字节">${esc(label)}</span>`;
}

function unregisteredResourceAddress(uid) {
  return "";
}

let compactAddressTitleBound = false;

function bindCompactAddressTitle() {
  if (compactAddressTitleBound || typeof document === "undefined") return;
  compactAddressTitleBound = true;
  const expand = event => {
    const link = event.target.closest?.("[data-address-title-space]");
    if (!link) return;
    const details = link.closest("[data-address-details]")?.dataset.addressDetails;
    if (!details) return;
    link.title += `\n点击打开 ${link.dataset.addressTitleSpace.toUpperCase()} 字节地图\n\n全部物理片段：\n${details}`;
    link.removeAttribute("data-address-title-space");
  };
  document.addEventListener("pointerover", expand, true);
  document.addEventListener("focusin", expand, true);
}

function compactResourceAddress(uid, {deferFullTitle = false} = {}) {
  const summary = resourcePhysicalAddressSummary(uid);
  if (summary.kind === "composite") return noIndependentPhysicalAddress();
  if (summary.kind === "derived") return noIndependentPhysicalAddress("派生资源（无独立地址）");
  if (summary.kind === "unregistered") return unregisteredResourceAddress();
  const details = summary.ranges.map(physicalRangeTitle).join("\n");
  // 非连续片段全部实际渲染。此前只露出每个介质的一个入口、把「另 N 段」藏在
  // tooltip，用户无法直接比较或跳到余下地址；现在每一段都有自己的可点击深链。
  if (deferFullTitle) bindCompactAddressTitle();
  const links = summary.ranges.map(range => directPhysicalAddress(range, {
    title: deferFullTitle ? physicalRangeTitle(range)
      : `${physicalRangeTitle(range)}\n点击打开 ${String(range.space).toUpperCase()} 字节地图\n\n全部物理片段：\n${details}`,
    deferredAddressTitle: deferFullTitle,
  })).join("");
  return `<div class="compact-resource-address" data-address-kind="${summary.kind}"${deferFullTitle ? ` data-address-details="${esc(details)}"` : ""}>${links}</div>`;
}

function tableValueStack(values, empty = "—") {
  const items = (values || []).filter(value => value !== null && value !== undefined && String(value) !== "");
  if (!items.length) return `<span class="resource-empty">${esc(empty)}</span>`;
  return `<div class="table-cell-stack">${items.map(value => `<span>${esc(value)}</span>`).join("")}</div>`;
}

const resourceRelationLabels = {
  "uses-text": "使用文本",
  "uses-name": "使用名称文本",
  "uses-script": "引用界面或文本记录",
  "uses-layout": "引用界面布局",
  "uses-composition": "使用界面组合",
  "uses-scene": "使用场景",
  "uses-story-actor-list": "使用剧情角色表",
  "uses-actor-set": "使用角色图形组",
  "uses-actor-type": "使用角色类型",
  "uses-actor-motion": "使用角色运动",
  "uses-scene-entry-motion": "场景入口覆盖运动",
  "uses-attack-visual": "引用攻击特效",
  "uses-attack-script": "使用攻击脚本",
  "uses-battle-action": "使用战斗对象动作",
  "uses-chr-bank": "使用 CHR bank",
  "uses-core-font-glyph": "使用 PRG 基础字模",
  "uses-static-font-glyph": "使用 CHR 固定字模",
  "contains-core-font-glyph": "包含基础字模",
  "part-of-font-template": "属于基础字模模板",
  "part-of-chr-bank": "属于 CHR bank",
  "uses-monster-graphic": "使用怪物图形",
  "uses-monster-palette": "使用怪物调色板",
  "uses-monster-palette-pair": "使用怪物双色组合",
  "uses-battle-figure": "引用角色或怪物图形",
  "uses-sprite-context": "引用精灵图形上下文",
  "uses-npc-service": "关联 NPC 服务入口",
  "uses-vehicle-portrait": "使用战车立绘",
  "uses-ui-script": "使用 UI / 文本记录",
  "includes-record": "嵌入文本记录",
  "runs-inline-story-action": "触发内联剧情动作",
  "contains-scene-actor": "包含场景角色",
  "runs-autonomous-script": "运行自动动作脚本",
  "selects-autonomous-script": "选择自动动作脚本",
  "selects-interaction-script": "选择交互动作脚本",
  "belongs-to-scene": "属于场景",
  "calls-primary-script": "调用主攻击脚本",
  "calls-auxiliary-script": "调用辅助攻击脚本",
  "initial-item": "初始装备 / 道具",
  "contains-item": "包含道具",
  "has-field-use": "具有非战斗使用记录",
  "has-battle-use": "具有战斗使用记录",
  "uses-item-definition": "引用道具信息与名称",
  "uses-field-item-dispatch": "使用非战斗调度",
  "uses-battle-item-dispatch": "使用战斗调度",
  "uses-audio-sequence-region": "使用音序区",
  "contains-audio-track": "包含音频轨道",
  "uses-audio-sequence-stream": "使用音序流",
  "decoded-from-audio-command": "由声音命令引用",
  "resolves-audio-sequence-execution": "使用解析执行",
  "resolved-by-audio-sequence-execution": "由解析执行展开",
  "executes-audio-sequence-stream": "执行音序流",
  "part-of-audio-sequence-stream": "属于音序流",
  "uses-audio-opcode-definition": "使用音序 opcode",
  "selects-audio-voice": "选择音色 / 包络",
  "contains-audio-voice-instruction": "包含包络指令",
  "part-of-audio-voice": "属于音色 / 包络",
  "triggers-dpcm-sample": "触发 DPCM 参数",
  "aliases-audio-command": "共用声音 header",
  "selects-audio-command": "选择声音命令",
  "plays-audio-command": "播放声音命令",
  "uses-audio-control": "使用音频控制",
  "has-configuration": "包含设施配置",
  "activates-facility-configuration": "调查后激活设施配置",
  "dispatches-investigation-command": "分派到调查命令",
  "has-investigation-configuration": "包含调查配置",
  "configuration-of-investigation-command": "属于调查命令",
  "uses-facility-ui": "使用完整设施 UI",
  "used-by-investigation-instance": "被调查实例使用",
  "has-track": "包含曲目",
  "track-of-facility": "属于点唱机",
  "has-routine": "包含运行入口",
  "routine-of-facility": "属于设施应用",
  "offers-item": "售卖道具",
  "offers-shell": "售卖炮弹",
  "lottery-prize-item": "抽奖奖品",
};

// 总表里的引用只显示条数：资源索引还在变大，逐行铺开会持续把表撑宽，而读总表的人
// 多数时候并不需要它。要看引用关系去具体资产的编辑/预览界面，那里用
// resourceReferenceList() 给完整列表。悬停可看明细，不必点。
function referenceCountCell(edges) {
  if (!edges.length) return `<span class="resource-empty">—</span>`;
  const lines = edges.map(edge =>
    `${resourceRelationLabels[edge.relation] || edge.relation} → ${
      currentTextReference(edge.target).label || (indexedResource(edge.target)?.kind === "audio-command"
        ? resourceLabel(edge.target) : "") || edge.target}`
  );
  return `<span class="resource-reference-count" title="${esc(lines.join("\n"))}">${edges.length}</span>`;
}

function resourceForwardReferenceCell(uid, targetKinds = null) {
  const edges = (indexedResource(uid)?.references || []).filter(edge =>
    !targetKinds || targetKinds.includes(indexedResource(edge.target)?.kind)
  );
  return referenceCountCell(edges);
}

const textCharacterResourceKinds = new Set([
  "font-glyph",
  "font-core-glyph",
  "font-static-glyph",
]);

function textCharacterResourceUid(reference) {
  const encoded = String(reference?.encoded_hex || "").trim();
  if (encoded) return `font-glyph:${encoded.replaceAll(" ", ":")}`;
  const tile = Number(reference?.tile_id);
  if (!Number.isFinite(tile)) return null;
  const prefix = reference?.font_source === "chr-static-pattern" || tile >= 0x80
    ? "font-static-glyph"
    : "font-core-glyph";
  return `${prefix}:${tile.toString(16).toUpperCase().padStart(2, "0")}`;
}

function textCharacterEncodingSequence(record) {
  const references = [
    ...(record?.glyph_references || []),
    ...(record?.literal_tile_references || []),
  ].sort((left, right) => Number(left.offset) - Number(right.offset));
  if (!references.length) return "";
  const tokens = references.map(reference => {
    const code = String(
      reference.encoded_hex || reference.tile_id_hex || "??"
    ).toUpperCase();
    const unicode = reference.unicode === " "
      ? "空格"
      : String(reference.unicode || "待识别");
    const uid = textCharacterResourceUid(reference);
    const title = `${unicode} · ${code}${uid ? ` · ${uid}` : ""}`;
    return uid && indexedResource(uid)
      ? `<button type="button" class="text-encoding-token" data-resource-target="${esc(uid)}" title="${esc(title)}">${esc(code)}</button>`
      : `<span class="text-encoding-token" title="${esc(title)}">${esc(code)}</span>`;
  }).join("");
  return `<div class="text-encoding-reference"><small>字符编码 · ${references.length} token</small><div class="text-encoding-sequence">${tokens}</div></div>`;
}

function textRecordReferenceCell(record, uid) {
  const otherEdges = (indexedResource(uid)?.references || []).filter(
    edge => !textCharacterResourceKinds.has(indexedResource(edge.target)?.kind)
  );
  const sequence = textCharacterEncodingSequence(record);
  const otherReferences = otherEdges.length
    ? `<div class="text-record-other-references">${referenceCountCell(otherEdges)}</div>`
    : "";
  return sequence || otherReferences
    ? `<div class="text-record-reference-cell">${sequence}${otherReferences}</div>`
    : `<span class="resource-empty">—</span>`;
}

// @editor-module 场景显示名的地点部分解引用当前城镇名称文本。

function applyTeleportDestinationNames(project) {
  const destinations = project?.facilities?.facilities?.find(row => row.id === 'teleport-terminal')?.configuration?.destinations || [];
  for (const row of destinations) Object.defineProperty(row, 'name', {enumerable: true, configurable: true,
    get: () => currentTextReference(row.text_record).label.trim()});
}

function applySceneTownNames(project) {
  for (const scene of project?.scenes?.editable_scenes || []) {
    if (!scene.name_reference || Object.getOwnPropertyDescriptor(scene, 'name')?.get) continue;
    const detail = scene.name;
    if (detail.includes(' · ') && !scene.name_reference_prefix) continue;
    Object.defineProperty(scene, 'name', {enumerable: true, configurable: true,
      get: () => {
        const town = currentTextChoiceLabel({record: scene.name_reference});
        return town ? scene.name_reference_prefix
          ? `${town}${detail.slice(scene.name_reference_prefix.length)}` : `${town} · ${detail}` : detail;
      }});
  }
}

// @editor-module 通用 nametable 编辑器
//
// 一张 nametable 就是定长格子表：前 columns×rows 字节是 tile 编号，尾部是属性
// 表，一格属性管 4×4 tile。游戏里哪一屏用它、字节存在 CHR 还是 PRG、改动写到
// 哪个资源——全是调用方的事。所以这里只要几何、数据和两个写回回调，不认识任何
// 具体画面。
//
// 图块字节一律由调用方传入，并且应当来自 shared-chr-bank 的 original/working
// （engine/editor/core/media-assets.js）。本模块不自己取 CHR，也不写 CHR：
// 图元编辑是跨模块的通用能力，不能让每个用到 nametable 的页面各长一份。


const NAMETABLE_COLUMNS = 32;
const NAMETABLE_ROWS = 30;
const NAMETABLE_ATTRIBUTE_BASE = 0x3C0;
const TILE_BYTES = 16;
const PALETTE_MAX = 0x3F;
const PICKER_COLUMNS = 16;
const PICKER_TILES = 256;

const OUTLINE = [236, 88, 180];

const defaultGeometry = Object.freeze({
  columns: NAMETABLE_COLUMNS,
  rows: NAMETABLE_ROWS,
  attributeBase: NAMETABLE_ATTRIBUTE_BASE,
});

/** 属性表一格管 4×4 tile，组号由行列的第 1 位选出。 */
function attributeGroupAt(tiles, geometry, row, column) {
  const attribute = tiles[
    geometry.attributeBase + Math.floor(row / 4) * 8 + Math.floor(column / 4)
  ];
  return (attribute >> (((row & 2) << 1) | (column & 2))) & 0x03;
}

/** 返回改写后的属性字节；调用方决定要不要落到自己的数据上。 */
function attributeByteWith(current, row, column, group) {
  const shift = ((row & 2) << 1) | (column & 2);
  return (current & ~(0x03 << shift)) | ((group & 0x03) << shift);
}

function attributeIndexAt(geometry, row, column) {
  return geometry.attributeBase + Math.floor(row / 4) * 8 + Math.floor(column / 4);
}

function groupColours(palette, group, background) {
  const colours = [0, 1, 2, 3].map(index =>
    nesPalette[Number(palette[group * 4 + index] || 0) & PALETTE_MAX]
  );
  // 每个 tile 的颜色 0 都取整屏通用色，这是 PPU 行为而不是分组色。
  if (background) colours[0] = background;
  return colours;
}

function paintTilePixels(image, patterns, tile, originX, originY, colours) {
  const offset = Number(tile) * TILE_BYTES;
  if (offset + TILE_BYTES > patterns.length) return;
  for (let y = 0; y < 8; y += 1) {
    const low = patterns[offset + y];
    const high = patterns[offset + 8 + y];
    for (let x = 0; x < 8; x += 1) {
      const shift = 7 - x;
      const value = ((low >> shift) & 1) | (((high >> shift) & 1) << 1);
      uiPutRgb(image.data, image.width, originX + x, originY + y, colours[value]);
    }
  }
}

/**
 * 框一个区域。`dash` 是虚线周期（前一半实、后一半虚），给 0 画实线。
 *
 * 同一屏上常要同时框几种含义不同的区域——「这个组件的地盘」和「它实际占了
 * 多少格」不该长得一样重。颜色与线型因此可调，默认仍是原来的粉色虚线。
 */
function outlineBox(image, box, {colour = OUTLINE, dash = 4} = {}) {
  const right = box.x + box.width - 1;
  const bottom = box.y + box.height - 1;
  const on = offset => !dash || offset % dash < dash / 2;
  for (let x = box.x; x <= right; x += 1) {
    if (!on(x - box.x)) continue;
    uiPutRgb(image.data, image.width, x, box.y, colour);
    uiPutRgb(image.data, image.width, x, bottom, colour);
  }
  for (let y = box.y; y <= bottom; y += 1) {
    if (!on(y - box.y)) continue;
    uiPutRgb(image.data, image.width, box.x, y, colour);
    uiPutRgb(image.data, image.width, right, y, colour);
  }
}

function fillBackground(image, colour) {
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) uiPutRgb(image.data, image.width, x, y, colour);
  }
}

/**
 * 把一张 nametable 画进 image。
 *
 * `tiles` 是完整的一页（tile 区 + 属性区），`patterns` 是本屏映射后的图案表，
 * `palette` 是 32 字节整版调色板。精灵之类的叠加层由调用方在返回后自己画。
 */
function paintNametable(image, {tiles, patterns, palette, geometry = defaultGeometry}) {
  const background = nesPalette[Number(palette[0] || 0x0F) & PALETTE_MAX];
  fillBackground(image, background);
  for (let row = 0; row < geometry.rows; row += 1) {
    for (let column = 0; column < geometry.columns; column += 1) {
      paintTilePixels(
        image, patterns, tiles[row * geometry.columns + column],
        column * 8, row * 8,
        groupColours(palette, attributeGroupAt(tiles, geometry, row, column), background)
      );
    }
  }
  return background;
}

/**
 * 按 PPU 的取景方式画一屏：若干页拼成一个平面，滚动量在平面上截一个窗口。
 *
 * 编辑视图按 nametable 原点画一页，那是「你能改哪一格」的视图；跑起来看到的却是
 * 滚动影子截出来的窗口，越过页边界就接上相邻的那一页，并在平面边界处绕回。
 * 两者只差这一个函数，所以别在调用方里另写一遍带取模的合成循环。
 *
 * `pages` 是按页排布的二维数组（`pages[行][列]`），每项是一整页格子表或 null。
 * 相邻关系由调用方按镜像方式给出——本模块不认识镜像寄存器。
 */
function paintNametableWindow(image, {
  pages, patterns, palette, scrollX = 0, scrollY = 0, geometry = defaultGeometry,
}) {
  const background = nesPalette[Number(palette[0] || 0x0F) & PALETTE_MAX];
  fillBackground(image, background);
  const planeColumns = pages[0].length * geometry.columns;
  const planeRows = pages.length * geometry.rows;
  const originColumn = Math.floor(scrollX / 8);
  const originRow = Math.floor(scrollY / 8);
  // 多画一列一行：滚动量不是 8 的倍数时，首尾各有半格露在窗口里。
  const columns = Math.ceil(image.width / 8) + 1;
  const rows = Math.ceil(image.height / 8) + 1;
  for (let row = 0; row < rows; row += 1) {
    const planeRow = (originRow + row) % planeRows;
    for (let column = 0; column < columns; column += 1) {
      const planeColumn = (originColumn + column) % planeColumns;
      const page = pages[Math.floor(planeRow / geometry.rows)]
        [Math.floor(planeColumn / geometry.columns)];
      if (!page) continue;
      const pageRow = planeRow % geometry.rows;
      const pageColumn = planeColumn % geometry.columns;
      paintTilePixels(
        image, patterns, page[pageRow * geometry.columns + pageColumn],
        (originColumn + column) * 8 - scrollX,
        (originRow + row) * 8 - scrollY,
        groupColours(palette, attributeGroupAt(page, geometry, pageRow, pageColumn),
          background)
      );
    }
  }
  return background;
}

function cellFromEvent(canvas, event, geometry = defaultGeometry) {
  const rect = canvas.getBoundingClientRect();
  const column = Math.floor((event.clientX - rect.left) / rect.width * geometry.columns);
  const row = Math.floor((event.clientY - rect.top) / rect.height * geometry.rows);
  if (row < 0 || row >= geometry.rows || column < 0 || column >= geometry.columns) {
    return null;
  }
  return {row, column};
}

function pickerTileFromEvent(canvas, event, {
  columns = PICKER_COLUMNS, rows = PICKER_TILES / PICKER_COLUMNS,
} = {}) {
  const rect = canvas.getBoundingClientRect();
  const column = Math.floor((event.clientX - rect.left) / rect.width * columns);
  const row = Math.floor((event.clientY - rect.top) / rect.height * rows);
  if (column < 0 || column >= columns || row < 0 || row >= rows) return null;
  return row * columns + column;
}

/**
 * 绑定「按住拖动连续画」。
 *
 * `paint(cell)` 由调用方实现：它拿到格子坐标，自己决定改 tile 还是改属性、
 * 改到哪份数据上，返回是否真的变了。`onStroke` 在一笔开始前调用，适合压撤销栈。
 */
function bindNametablePainting(canvas, {
  enabled = true, geometry = defaultGeometry, paint, onStroke, onChange,
}) {
  if (!canvas || !enabled || typeof paint !== "function") return;
  let pointer = null;
  const stop = event => {
    if (pointer === null) return;
    if (event?.pointerId != null && event.pointerId !== pointer) return;
    if (canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
    pointer = null;
  };
  const apply = event => {
    const cell = cellFromEvent(canvas, event, geometry);
    if (cell && paint(cell)) onChange?.();
  };
  canvas.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    if (typeof enabled === 'function' && !enabled()) return;
    pointer = event.pointerId;
    canvas.setPointerCapture(event.pointerId);
    onStroke?.();
    apply(event);
  });
  canvas.addEventListener("pointermove", event => {
    if (event.pointerId !== pointer) return;
    if ((event.buttons & 1) === 0) {
      stop(event);
      return;
    }
    apply(event);
  });
  canvas.addEventListener("pointerup", stop);
  canvas.addEventListener("pointercancel", stop);
  canvas.addEventListener("lostpointercapture", stop);
}

// @editor-module 浮层选择器共用过滤、选值与预览交互。
// 组与候选只由点击或键盘操作切换。

function pickerVisibleOptions(options, {
  query = "", category = "", searchText, group, page = 0, pageSize = Infinity,
}) {
  const terms = String(query).trim().toLocaleLowerCase("zh-CN").split(/\s+/u).filter(Boolean);
  const matches = options.filter(option => (!category || group(option) === category)
    && terms.every(term => String(searchText(option) || "")
      .toLocaleLowerCase("zh-CN").includes(term)));
  const pages = Math.max(1, Math.ceil(matches.length / pageSize));
  const selectedPage = Math.max(0, Math.min(page, pages - 1));
  return {matches, pages, page: selectedPage,
    visible: new Set(matches.slice(selectedPage * pageSize, (selectedPage + 1) * pageSize))};
}

function markPickerSelection(options, value, valueOf, activeClass = "active") {
  options.forEach(option => {
    const selected = String(valueOf(option)) === String(value);
    option.classList.toggle(activeClass, selected);
    option.setAttribute("aria-selected", String(selected));
  });
}

function openPickerSurface(surface, {filter = null, selected = null} = {}) {
  if (!surface) return;
  if (surface.tagName === "DIALOG") {
    if (!surface.open) surface.showModal();
  } else surface.open = true;
  requestAnimationFrame(() => {
    filter?.focus({preventScroll: true});
    selected?.scrollIntoView({block: "nearest"});
  });
}

function closePickerSurface(surface) {
  if (!surface?.open) return;
  if (surface.tagName === "DIALOG") surface.close();
  else surface.open = false;
}

const pickerPreviews = new WeakMap();

function bindPickerConfirmation(surface, {
  host = surface, confirm, onOpen = null, canConfirm = () => true,
} = {}) {
  if (!surface || !host) return {refresh() {}};
  const actions = document.createElement('div');
  actions.className = 'picker-actions';
  actions.innerHTML = '<button class="button ghost" type="button" data-picker-cancel>取消</button>'
    + '<button class="button" type="button" data-picker-confirm>确认</button>';
  host.append(actions);
  const button = actions.querySelector('[data-picker-confirm]');
  const refresh = () => {button.disabled = !canConfirm();};
  let busy = false;
  const submit = async () => {
    if (!surface.open || busy || !canConfirm()) return;
    busy = true;
    try {
      if (await confirm() !== false) closePickerSurface(surface);
    } finally {
      busy = false;
      refresh();
    }
  };
  button.addEventListener('click', () => void submit());
  actions.querySelector('[data-picker-cancel]').addEventListener('click', () => closePickerSurface(surface));
  surface.addEventListener('keydown', event => {
    if (!surface.open || event.target.closest('details, dialog') !== surface) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closePickerSurface(surface);
    } else if (event.key === 'Enter' && !event.isComposing) {
      const target = event.target.closest('button, summary, a, textarea');
      if (target && target.getAttribute('role') !== 'option') return;
      event.preventDefault();
      event.stopPropagation();
      void submit();
    }
  });
  surface.addEventListener('toggle', () => {
    if (surface.open) onOpen?.();
    refresh();
  });
  refresh();
  return {refresh};
}

function bindPickerPreview(list, {selector, render, initial = null,
  onConfirm = null, selected = null} = {}) {
  if (!list) return;
  if (pickerPreviews.has(list)) {
    const state = pickerPreviews.get(list);
    state.render = render;
    state.onConfirm = onConfirm;
    state.selected = selected;
    if (initial) void state.show(initial);
    return state.show;
  }
  list.dataset.pickerPreviewBound = '1';
  const body = document.createElement('div');
  body.className = 'picker-candidates-body';
  const detail = document.createElement('div');
  detail.className = 'picker-candidate-preview';
  list.before(body);
  body.append(list, detail);
  const state = {render, show: null, onConfirm, selected, pending: null};
  pickerPreviews.set(list, state);
  let generation = 0;
  const show = async candidate => {
    const current = ++generation;
    if (!candidate) {detail.replaceChildren(); return;}
    try {
      const content = await state.render(candidate);
      if (current !== generation || !detail.isConnected) return;
      detail.removeAttribute('role');
      if (content instanceof globalThis.Node) detail.replaceChildren(content);
      else detail.innerHTML = String(content || '');
    } catch (error) {
      editorLog.error("字段编辑", `操作失败：${error?.message || error}`, error);
      if (current !== generation) return;
      detail.textContent = error.message;
      detail.setAttribute('role', 'alert');
    }
  };
  state.show = show;
  let confirmation = null;
  for (const eventName of ['click', 'focusin']) list.addEventListener(eventName, event => {
    const candidate = event.target.closest(selector);
    if (!candidate || !list.contains(candidate) || candidate.disabled) return;
    if (state.onConfirm) {
      state.pending = candidate;
      markPickerSelection(list.querySelectorAll(selector), true, option => option === candidate);
      confirmation.refresh();
    }
    void show(candidate);
  });
  const surface = list.closest('details, dialog');
  if (surface && onConfirm) confirmation = bindPickerConfirmation(surface, {
    host: surface.tagName === 'DIALOG' ? surface : body.parentElement,
    canConfirm: () => Boolean(state.pending && !state.pending.disabled),
    confirm: () => state.onConfirm(state.pending),
    onOpen: () => {
      state.pending = state.selected?.() || null;
      markPickerSelection(list.querySelectorAll(selector), true, option => option === state.pending);
      if (state.pending) void show(state.pending);
    },
  });
  surface?.addEventListener('toggle', () => {
    if (surface.open) {
      const candidate = list.querySelector('[aria-selected="true"]') || list.querySelector(selector);
      if (candidate) void show(candidate);
    }
  });
  if (initial) void show(initial);
  return show;
}

function bindCanvasPickerPreview(canvas, {list = canvas, cellWidth = 8, cellHeight = 8,
  label = index => String(index), selected = () => 0, onConfirm = null,
  allowed = () => true} = {}) {
  if (!canvas || canvas.dataset.pickerPreviewBound === '1') return;
  canvas.dataset.pickerPreviewBound = '1';
  canvas.tabIndex = 0;
  const body = document.createElement('div');
  body.className = 'picker-candidates-body';
  const detail = document.createElement('div');
  detail.className = 'picker-candidate-preview';
  const image = document.createElement('canvas');
  image.width = cellWidth;
  image.height = cellHeight;
  const name = document.createElement('b');
  detail.append(name, image);
  list.before(body);
  body.append(list, detail);
  const paint = (column, row) => {
    name.textContent = label(row * Math.floor(canvas.width / cellWidth) + column);
    image.getContext('2d').clearRect(0, 0, cellWidth, cellHeight);
    image.getContext('2d').drawImage(canvas, column * cellWidth, row * cellHeight,
      cellWidth, cellHeight, 0, 0, cellWidth, cellHeight);
  };
  let pending = selected();
  const columns = Math.floor(canvas.width / cellWidth);
  const choose = index => {
    pending = index;
    paint(index % columns, Math.floor(index / columns));
    confirmation?.refresh();
  };
  const surface = canvas.closest('details');
  const confirmation = surface && onConfirm ? bindPickerConfirmation(surface, {
    host: body.parentElement,
    canConfirm: () => pending !== null && allowed(pending),
    confirm: () => onConfirm(pending),
    onOpen: () => choose(selected()),
  }) : null;
  canvas.addEventListener('click', event => {
    const index = pickerTileFromEvent(canvas, event, {columns, rows: Math.floor(canvas.height / cellHeight)});
    if (index !== null) choose(index);
  });
  canvas.addEventListener('keydown', event => {
    const delta = {ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns}[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    choose(Math.max(0, Math.min(columns * Math.floor(canvas.height / cellHeight) - 1, (pending ?? 0) + delta)));
  });
  if (!onConfirm) surface?.addEventListener('toggle', () => {if (surface.open) choose(selected());});
}

// @editor-module 带动画缩略图的资源选择器
//
// 原生 select 的 option 不能承载 canvas。本组件只负责选择器交互与可见性：候选的
// 标记、绘制和播放启停由 owner 注入，因此装备视觉脚本与 battle-action operand
// 仍各自只从自己的 owner 取数、写回自己的既有入口。
//
// **一个对话框里可以并排放几栏候选**（`panes`）。有些选择本来就是几条引用一起
// 定的——怪物的形象与调色板就是：图形只有 2 bit 像素索引，颜色全由 palette 决定，
// 单看哪一边都判断不了配出来是什么样。并排放，才能一边挑一边看另一边的效果。
// 不给 `panes` 时只显示一栏。


const ELEMENT_NAME$1 = "animated-resource-picker";
const configurations$1 = new WeakMap();
const normalizedOptions = new WeakSet();
const confirmations = new WeakMap();

function normalizedOption(option) {
  if (normalizedOptions.has(option)) return option;
  const value = String(option?.value ?? "");
  const handle = String(option?.handle || value);
  const label = String(option?.label || handle);
  const normalized = Object.freeze({
    ...option,
    value,
    handle,
    label,
    disabled: Boolean(option?.disabled),
    searchText: [
      value,
      handle,
      label,
      option?.searchText || "",
    ].join(" ").toLocaleLowerCase("zh-CN"),
  });
  normalizedOptions.add(normalized);
  return normalized;
}

const prepareAnimatedResourceOptions = options => Object.freeze(options.map(normalizedOption));

function configuration(element) {
  return configurations$1.get(element) || null;
}

function currentOption(element) {
  const config = configuration(element);
  return config?.options.find(option => option.value === element.value) || null;
}

function previewRoot(card) {
  return card?.querySelector?.("[data-animated-resource-preview]") || null;
}

function setCardPlayback(element, card, active) {
  const root = previewRoot(card);
  const config = configuration(element);
  if (root && config?.setPreviewActive) {
    config.setPreviewActive(root, Boolean(active));
  }
  if (card) card.dataset.previewActive = String(Boolean(active));
}

async function mountCardPreview(element, card, option, current = false) {
  const config = configuration(element);
  if (!config || !card || card.dataset.previewMounted === "1") return;
  const root = previewRoot(card);
  if (!root) return;
  card.dataset.previewMounted = "1";
  try {
    const panes = current ? config.panes : config.pendingPanes || config.panes;
    const markup = config.renderPreview?.(option, {current,
      values: Object.fromEntries(panes.map(pane => [pane.id, pane.value]))}) || "";
    if (markup instanceof globalThis.Node) root.replaceChildren(markup);
    else root.innerHTML = String(markup);
    await config.paintPreview?.(root, option, {current});
    if (!card.isConnected) return;
    card.dataset.previewState = "ready";
  } catch (error) {
    editorLog.error("字段编辑", `操作失败：${error?.message || error}`, error);
    card.dataset.previewState = "error";
    card.dataset.previewError = String(error?.message || error);
    root.textContent = "预览失败";
  }
}

function candidateMarkup(option) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "animated-resource-option";
  button.dataset.animatedResourceOption = option.value;
  button.dataset.resourceHandle = option.handle;
  button.disabled = option.disabled;
  button.setAttribute("role", "option");
  button.setAttribute("aria-selected", "false");
  const preview = document.createElement("span");
  preview.className = "animated-resource-option-preview";
  preview.dataset.animatedResourcePreview = "";
  preview.setAttribute("aria-hidden", "true");
  const label = document.createElement("span");
  label.className = "animated-resource-option-label";
  label.textContent = option.label;
  button.append(preview, label);
  return button;
}

function stopCandidatePreviews(element) {
  element.querySelectorAll?.("[data-animated-resource-option], [data-animated-resource-detail-card]").forEach(card =>
    setCardPlayback(element, card, false)
  );
}

function refreshCandidatePreview(element) {
  const cards = [...element.querySelectorAll('[data-animated-resource-option]:not([hidden])')];
  const card = cards.find(card => card.getAttribute('aria-selected') === 'true') || cards[0];
  if (card) void showCandidatePreview(element, card);
  else {
    stopCandidatePreviews(element);
    element.querySelector('[data-animated-resource-detail]')?.replaceChildren();
  }
}

async function showCandidatePreview(element, candidate) {
  const config = configuration(element), pane = paneOf(element, candidate);
  const detail = element.querySelector('[data-animated-resource-detail]');
  const option = pane?.options.find(option => option.value === candidate.dataset.animatedResourceOption);
  if (!config || !detail || !option) return;
  const key = `${pane.id}:${option.value}`;
  if (detail.dataset.previewKey === key && detail.firstChild) return;
  stopCandidatePreviews(element);
  const card = document.createElement('div');
  card.dataset.animatedResourceDetailCard = '';
  const label = document.createElement('b');
  label.textContent = option.label;
  const preview = document.createElement('div');
  preview.dataset.animatedResourcePreview = '';
  card.append(label, preview);
  detail.dataset.previewKey = key;
  detail.replaceChildren(card);
  await mountCardPreview(element, card, option);
  setCardPlayback(element, card, card.isConnected && element.dataset.animatedResourceOpen === 'true');
}

function applyFilter(element) {
  const config = configuration(element);
  const input = element.querySelector("[data-animated-resource-filter]");
  const cards = [...element.querySelectorAll?.("[data-animated-resource-option]") || []];
  const optionOf = card => config?.options.find(item =>
    item.value === card.dataset.animatedResourceOption);
  const {visible} = pickerVisibleOptions(cards.filter(optionOf), {
    query: input?.value, category: config?.category,
    searchText: card => optionOf(card)?.searchText,
    group: card => optionOf(card)?.group || '',
  });
  let shown = 0;
  cards.forEach(card => {
    const hidden = !visible.has(card);
    card.hidden = hidden;
    if (hidden) setCardPlayback(element, card, false);
    else shown += 1;
  });
  element.dataset.animatedResourceFilteredCount = String(shown);
  const status = element.querySelector("[data-animated-resource-filter-status]");
  if (status) status.textContent = `${shown} / ${config?.options.length || 0} 个候选`;
  element.querySelectorAll("[data-animated-resource-group]").forEach(group => {
    group.hidden = ![...group.querySelectorAll("[data-animated-resource-option]")].some(card => !card.hidden);
  });
  refreshCandidatePreview(element);
}

function closePicker(element) {
  const dialog = element.querySelector("dialog[data-animated-resource-dialog]");
  closePickerSurface(dialog);
  stopCandidatePreviews(element);
  element.dataset.animatedResourceOpen = "false";
  const config = configuration(element);
  if (config) config.pendingPanes = null;
}

function openPicker(element) {
  if (element.disabled) return;
  const config = configuration(element);
  const dialog = element.querySelector("dialog[data-animated-resource-dialog]");
  if (!config || !dialog) return;
  for (const pane of config.panes) {
    const grid = element.querySelector(
      `[data-animated-resource-grid="${CSS.escape(pane.id)}"]`);
    if (!grid) continue;
    if (!grid.childElementCount) {
      const fragment = document.createDocumentFragment();
      const groups = new Map();
      pane.options.forEach(option => {
        if (option.group === undefined) { fragment.append(candidateMarkup(option)); return; }
        if (!groups.has(option.group)) {
          const section = document.createElement("section");
          section.dataset.animatedResourceGroup = option.group;
          const heading = document.createElement("h3");
          heading.textContent = option.groupLabel || "其他";
          section.append(heading);
          groups.set(option.group, section);
          fragment.append(section);
        }
        groups.get(option.group).append(candidateMarkup(option));
      });
      grid.append(fragment);
    }
  }
  if (config.panes.length === 1) config.panes[0].value = element.value;
  config.pendingPanes = config.panes.map(pane => ({...pane}));
  markSelection(element);
  const input = element.querySelector("[data-animated-resource-filter]");
  if (input) input.value = "";
  openPickerSurface(dialog, {filter: input,
    selected: element.querySelector("[aria-selected=\"true\"]")});
  config.category = config.options.find(option => option.value === element.value)?.group || '';
  element.querySelectorAll('[data-animated-resource-category]').forEach(button =>
    button.setAttribute('aria-pressed', String(button.dataset.animatedResourceCategory === config.category)));
  element.dataset.animatedResourceOpen = "true";
  element.querySelector('[data-animated-resource-detail]').replaceChildren();
  applyFilter(element);
}

/** 每一栏一个网格。只有一栏时不写栏头——那时它就是从前那个单栏选择器。 */
function renderPanes(element) {
  const config = configuration(element);
  const host = element.querySelector("[data-animated-resource-panes]");
  if (!config || !host) return;
  host.dataset.animatedResourcePaneCount = String(config.panes.length);
  host.replaceChildren();
  for (const pane of config.panes) {
    const column = document.createElement("div");
    column.className = "animated-resource-pane";
    column.dataset.animatedResourcePane = pane.id;
    if (config.panes.length > 1 && pane.label) {
      const heading = document.createElement("b");
      heading.className = "animated-resource-pane-label";
      heading.textContent = pane.label;
      column.append(heading);
    }
    const grid = document.createElement("div");
    grid.className = "animated-resource-grid";
    grid.dataset.animatedResourceGrid = pane.id;
    grid.setAttribute("role", "listbox");
    column.append(grid);
    host.append(column);
  }
}

function paneOf(element, card) {
  const config = configuration(element);
  const id = String(card.closest("[data-animated-resource-pane]")
    ?.dataset.animatedResourcePane ?? "");
  return (config?.pendingPanes || config?.panes)?.find(pane => pane.id === id) || null;
}

// 点击只更新待确认组合；预览按组合重画。
function pickCandidate(element, card) {
  const config = configuration(element);
  const pane = paneOf(element, card);
  if (!config || !pane || card.disabled) return;
  pane.value = String(card.dataset.animatedResourceOption);
  markSelection(element);
  // 另一栏画的是「配上这一栏的新值会是什么样」，所以它们的预览必须作废重画。
  element.querySelectorAll("[data-animated-resource-option]").forEach(item => {
    if (item.closest("[data-animated-resource-pane]") === card.closest(
      "[data-animated-resource-pane]")) return;
    item.dataset.previewMounted = "0";
    const root = previewRoot(item);
    if (root) root.replaceChildren();
  });
  element.querySelector('[data-animated-resource-detail]').replaceChildren();
  void showCandidatePreview(element, card);
  config.confirmation?.refresh();
}

function markSelection(element) {
  const config = configuration(element);
  if (!config) return;
  for (const pane of config.pendingPanes || config.panes) {
    markPickerSelection(element.querySelectorAll(
      `[data-animated-resource-pane="${CSS.escape(pane.id)}"] [data-animated-resource-option]`,
    ), pane.value, card => card.dataset.animatedResourceOption, "selected");
  }
}

function triggerCard(element) {
  return element.querySelector("[data-animated-resource-current]");
}

function paneLabels(element) {
  const config = configuration(element);
  if (!config || config.panes.length < 2) return "";
  return config.panes.map(pane =>
    pane.options.find(item => item.value === pane.value)?.label || pane.value)
    .join(" · ");
}

function renderCurrent(element) {
  const config = configuration(element);
  const option = currentOption(element);
  const card = triggerCard(element);
  if (!config || !card) return;
  setCardPlayback(element, card, false);
  card.dataset.previewMounted = "0";
  card.dataset.animatedResourceCurrent = option?.value || "";
  card.dataset.resourceHandle = option?.handle || "";
  const label = card.querySelector("[data-animated-resource-current-label]");
  if (label) {
    // **当前项的写法归 owner。** 有些引用写成文字就没了信息——调色板写成
    // 「双 00」占一行还看不出是什么色；给了 renderLabel 就由 owner 自己画。
    if (config.renderLabel) {
      label.innerHTML = String(config.renderLabel({
        panes: config.panes,
        values: Object.fromEntries(config.panes.map(pane => [pane.id, pane.value])),
      }) || "");
    } else {
      label.textContent = paneLabels(element)
        || option?.label || `未知候选 ${element.value}`;
    }
  }
  const root = previewRoot(card);
  if (root) root.replaceChildren();
  if (!option) return;
  // 画布自己的 viewport observer 决定当前按钮是否启播；这里不把表外的几十个
  // 当前项全部强制启动。
  void mountCardPreview(element, card, option, true);
}

function renderSkeleton(element) {
  if (element.dataset.animatedResourceBound === "1") return;
  element.dataset.animatedResourceBound = "1";
  element.innerHTML = `<button class="animated-resource-trigger" type="button"
      data-animated-resource-trigger aria-haspopup="dialog">
    <span class="animated-resource-current" data-animated-resource-current>
      <span class="animated-resource-current-preview"
        data-animated-resource-preview aria-hidden="true"></span>
      <span class="animated-resource-current-label"
        data-animated-resource-current-label></span>
    </span>
    <span class="animated-resource-chevron" aria-hidden="true">▾</span>
  </button>
  <dialog class="animated-resource-dialog" data-animated-resource-dialog>
    <div class="animated-resource-toolbar">
      <label>按编号 / 名称过滤
        <input type="search" autocomplete="off"
          data-animated-resource-filter placeholder="输入编号或名称">
      </label>
      <span data-animated-resource-filter-status></span>
      <button class="button ghost" type="button" data-animated-resource-close>关闭</button>
    </div>
    <div class="animated-resource-body">
      <div class="animated-resource-panes" data-animated-resource-panes></div>
      <div class="animated-resource-detail" data-animated-resource-detail></div>
    </div>
  </dialog>`;
  element.querySelector("[data-animated-resource-trigger]")?.addEventListener(
    "click", () => openPicker(element),
  );
  element.querySelector("[data-animated-resource-filter]")?.addEventListener(
    "input", () => {
      configuration(element).category = "";
      element.querySelectorAll("[data-animated-resource-category]").forEach(button =>
        button.setAttribute("aria-pressed", String(!button.dataset.animatedResourceCategory)));
      applyFilter(element);
    },
  );
  const dialog = element.querySelector("dialog[data-animated-resource-dialog]");
  const confirmation = bindPickerConfirmation(dialog, {
    canConfirm: () => !element.disabled && Boolean(configuration(element)?.pendingPanes?.every(pane =>
      pane.options.some(option => option.value === pane.value && !option.disabled))),
    confirm: () => {
      const config = configuration(element);
      config.panes.forEach((pane, index) => {pane.value = config.pendingPanes[index].value;});
      element.dataset.animatedResourceValue = config.panes[0].value;
      renderCurrent(element);
      element.dispatchEvent(new Event('change', {bubbles: true}));
    },
  });
  confirmations.set(element, confirmation);
  element.querySelector("[data-animated-resource-close]")?.addEventListener(
    "click", () => closePicker(element),
  );
  dialog?.addEventListener("close", () => closePicker(element));
  dialog?.addEventListener("click", event => {
    if (event.target === dialog) closePicker(element);
  });
  element.querySelector("[data-animated-resource-panes]")?.addEventListener(
    "click", event => {
      const card = event.target.closest?.("[data-animated-resource-option]");
      if (!card || card.disabled) return;
      pickCandidate(element, card);
    },
  );
  element.querySelector('[data-animated-resource-panes]').addEventListener('focusin', event => {
    const card = event.target.closest('[data-animated-resource-option]');
    if (card) pickCandidate(element, card);
  });
}

const HTMLElementBase$1 = globalThis.HTMLElement || class {};

class AnimatedResourcePicker extends HTMLElementBase$1 {
  connectedCallback() {
    renderSkeleton(this);
    if (configuration(this)) renderCurrent(this);
  }

  disconnectedCallback() {
    stopCandidatePreviews(this);
    setCardPlayback(this, triggerCard(this), false);
  }

  get value() {
    return String(this.dataset.animatedResourceValue || "");
  }

  set value(value) {
    const next = String(value ?? "");
    if (this.dataset.animatedResourceValue === next) return;
    this.dataset.animatedResourceValue = next;
    const config = configuration(this);
    if (config?.panes.length === 1) config.panes[0].value = next;
    renderCurrent(this);
  }

  get options() {
    return configuration(this)?.options || [];
  }

  /** 多栏时每一栏各自的当前值；单栏时只有那一栏。 */
  get values() {
    return Object.fromEntries(
      (configuration(this)?.panes || []).map(pane => [pane.id, pane.value]));
  }

  get disabled() {
    return this.hasAttribute("disabled");
  }

  set disabled(value) {
    this.toggleAttribute("disabled", Boolean(value));
    const trigger = this.querySelector("[data-animated-resource-trigger]");
    if (trigger) trigger.disabled = Boolean(value);
    if (value) closePicker(this);
  }

  open() {
    openPicker(this);
  }

  close() {
    closePicker(this);
  }
}

if (globalThis.customElements && globalThis.HTMLElement
    && !globalThis.customElements.get(ELEMENT_NAME$1)) {
  globalThis.customElements.define(ELEMENT_NAME$1, AnimatedResourcePicker);
}

/** 给已有元素安装 owner 候选与预览回调；重复调用会刷新当前项并丢弃旧候选 DOM。 */
function configureAnimatedResourcePicker(element, {
  options = [],
  value = "",
  panes = null,
  renderPreview = null,
  renderLabel = null,
  paintPreview = null,
  setPreviewActive = null,
} = {}) {
  if (!element?.matches?.(ELEMENT_NAME$1)) {
    throw new TypeError(`${ELEMENT_NAME$1} element is required`);
  }
  renderSkeleton(element);
  stopCandidatePreviews(element);
  const normalizedPanes = (Array.isArray(panes) && panes.length
    ? panes
    : [{id: "", label: "", options, value}]
  ).map(pane => ({
    id: String(pane.id ?? ""),
    label: String(pane.label ?? ""),
    options: (pane.options || []).map(normalizedOption),
    value: String(pane.value ?? ""),
  }));
  const normalized = normalizedPanes.flatMap(pane => pane.options);
  configurations$1.set(element, {
    panes: normalizedPanes,
    options: normalized,
    renderPreview,
    renderLabel,
    paintPreview,
    setPreviewActive,
    confirmation: confirmations.get(element),
  });
  element.dataset.animatedResourceOptionCount = String(normalized.length);
  element.dataset.animatedResourcePaneCount = String(normalizedPanes.length);
  renderPanes(element);
  element.querySelector("[data-animated-resource-categories]")?.remove();
  const groups = new Map(normalized.map(option => [option.group || '', option.groupLabel]));
  if (groups.size > 1) {
    const categories = document.createElement("div");
    categories.className = 'module-reference-picker-groups';
    categories.dataset.animatedResourceCategories = "";
    for (const [id, label] of [["", "全部"], ...[...groups].filter(([id]) => id)]) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button ghost";
      button.textContent = label;
      button.dataset.animatedResourceCategory = id;
      button.setAttribute("aria-pressed", String(!id));
      button.addEventListener("click", () => {
        configuration(element).category = id;
        categories.querySelectorAll("button").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
        applyFilter(element);
      });
      categories.append(button);
    }
    element.querySelector('.animated-resource-body').before(categories);
  }
  element.dataset.animatedResourceValue = String(
    panes ? normalizedPanes[0].value : (value ?? ""));
  renderCurrent(element);
  element.disabled = element.hasAttribute("disabled");
  const label = element.getAttribute("aria-label");
  if (label) {
    element.querySelector("[data-animated-resource-trigger]").setAttribute("aria-label", label);
    element.querySelector("[data-animated-resource-dialog]").setAttribute("aria-label", label);
  }
  return element;
}

// @editor-module 可选中复制的记录句柄。

function handleMarkup(handle, {label = handle} = {}) {
  const value = String(handle || "");
  if (!value) return "";
  return `<span class="record-handle" data-resource-handle="${esc(value)}" title="${esc(value)}">${esc(label)}</span>`;
}

function handleTextMarkup(text) {
  const source = String(text || "");
  let cursor = 0;
  let markup = "";
  for (const match of source.matchAll(/\b[a-z][a-z0-9-]*(?::[A-Za-z0-9_-]+)+/gu)) {
    markup += esc(source.slice(cursor, match.index)) + handleMarkup(match[0]);
    cursor = match.index + match[0].length;
  }
  return markup + esc(source.slice(cursor));
}

// @editor-module 各 owner 共用的富引用下拉框交互骨架
//
// owner 负责候选项、名称、封面和补充说明；本文件只负责过滤、键盘、惰性绘制、
// 当前项同步和 change 事件。它不认识 scene / actor / item 等业务 ID。


if (typeof document !== "undefined") document.addEventListener("pointerdown", event => {
  document.querySelectorAll(".module-reference-picker[open], .scene-position-picker[open], .actor-appearance-details[open], .fixed-tile-choice[open], .boot-choice[open], .nes-colour-choice[open]")
    .forEach(details => {
      if (details.matches(".scene-position-panel .module-reference-picker")) return;
      if (event.target === details || !details.contains(event.target)) details.open = false;
    });
});

if (typeof document !== 'undefined') document.addEventListener('wheel', event => {
  const groups = event.target.closest?.('.module-reference-picker-groups');
  if (!groups || groups.scrollWidth <= groups.clientWidth) return;
  const previous = groups.scrollLeft;
  groups.scrollLeft += event.deltaX || event.deltaY;
  if (groups.scrollLeft !== previous) event.preventDefault();
}, {passive: false});

const UNAVAILABLE_TITLES = Object.freeze({
  "unpublished-resource": "没有已发布资源",
  "path-mismatch": "候选路径不匹配",
  "empty-domain": "引用值域为空",
});

const ownerEnhancements = new Map();

function registerReferencePickerEnhancement(moduleId, enhance) {
  if (ownerEnhancements.has(moduleId) || typeof enhance !== 'function')
    throw new TypeError(`引用选择器增强登记无效：${moduleId}`);
  ownerEnhancements.set(moduleId, enhance);
}

function unavailableTitle(kind, busy) {
  if (busy) return "正在读取候选项";
  return UNAVAILABLE_TITLES[kind] || "引用候选不可用";
}

function normalizedItem(item, index) {
  if (!item || typeof item !== "object") {
    throw new TypeError(`引用候选 ${index} 不是对象`);
  }
  const value = String(item.value ?? "");
  const empty = item.empty === true;
  if (!value && !empty) throw new TypeError(`引用候选 ${index} 缺少 value`);
  return {
    value,
    controlValue: String(item.controlValue ?? value),
    empty,
    group: String(item.group ?? ""),
    groupLabel: String(item.groupLabel ?? ""),
    label: String(item.label ?? value),
    currentLabel: String(item.currentLabel ?? ''),
    description: String(item.description ?? ""),
    meta: String(item.meta ?? ""),
    preview: String(item.preview ?? ""),
    details: String(item.details ?? ""),
    filter: [value, item.currentLabel, item.filter ?? [item.label, item.description, item.meta]
      .filter(Boolean).join(" ")].filter(Boolean).join(' ').toLowerCase(),
    disabled: item.disabled === true,
    previewOnly: item.previewOnly === true,
  };
}

function currentMarkup(item, label, disabled = false, compact = false, summaryOnly = false,
  previewOnlySummary = false) {
  return `${item.preview && !summaryOnly ? `<span class="module-reference-picker-preview"
      data-reference-picker-current-preview>${item.preview}</span>` : ""}
    ${previewOnlySummary && item.preview ? '' : `<span class="module-reference-picker-current-copy"
      data-reference-picker-current-copy>
      ${compact ? "" : `<small>${esc(label)}</small>`}<b>${handleTextMarkup(item.currentLabel || item.label)}</b>
      ${!compact && item.description ? `<small>${handleTextMarkup(item.description)}</small>` : ""}
    </span>`}
    <i data-reference-picker-current-meta>${summaryOnly ? "" : handleTextMarkup(item.meta)}${disabled ? ""
      : '<em aria-hidden="true">⌄</em>'}</i>`;
}

function optionMarkup(item, selected) {
  return `<button type="button"
    class="module-reference-picker-option${selected ? " active" : ""}${item.preview ? " has-preview" : ""}${item.details ? " has-details" : ""}"
    data-reference-picker-option="${esc(item.value)}"
    data-reference-picker-control-value="${esc(item.controlValue)}"
    data-reference-picker-current-label="${esc(item.currentLabel)}"
    ${item.previewOnly ? 'data-reference-picker-preview-only' : ''}
    data-reference-picker-search="${esc(item.filter)}"
    role="option" aria-selected="${selected}"${item.disabled
      ? item.previewOnly ? ' aria-disabled="true"' : ' disabled' : ''}>
    ${item.preview ? `<span class="module-reference-picker-preview"
      data-reference-picker-option-preview><template data-reference-picker-preview-content>${item.preview}</template></span>` : ""}
    <span class="module-reference-picker-option-copy"
      data-reference-picker-option-copy>
      <b>${handleTextMarkup(item.label)}</b>${item.description ? `<small>${handleTextMarkup(item.description)}</small>` : ""}
    </span>
    <code data-reference-picker-option-meta>${handleTextMarkup(item.meta)}</code>
    ${item.details ? `<span class="module-reference-picker-option-details">${item.details}</span>` : ""}
  </button>`;
}

function groupedOptionsMarkup(options, selectedValue) {
  const groups = new Map();
  for (const item of options) {
    if (!groups.has(item.group)) groups.set(item.group, []);
    groups.get(item.group).push(item);
  }
  return [...groups].map(([id, items]) => `<div role="group"
    data-reference-picker-group="${esc(id)}" aria-label="${esc(items[0].groupLabel || "空栏")}">
    ${id ? `<h4>${esc(items[0].groupLabel)}</h4>` : ""}
    ${items.map(item => optionMarkup(item, item.value === selectedValue)).join("")}
  </div>`).join("");
}

function groupNavigationMarkup(groups) {
  if (groups.size <= 1) return '';
  return `<nav class="module-reference-picker-groups" aria-label="按类别选择">
    <button type="button" data-reference-picker-category="" aria-pressed="true">全部</button>
    ${[...groups].filter(([id]) => id).map(([id, name]) => `<button type="button"
      data-reference-picker-category="${esc(id)}" aria-pressed="false">${esc(name)}</button>`).join('')}
  </nav>`;
}

function referenceMenuMarkup({options, selectedValue, filterLabel, filterPlaceholder,
  grouped, previewPanel, pageSize, label}) {
  return `<label class="module-reference-picker-filter"><span>${esc(filterLabel)}</span>
      <input type="search" data-reference-picker-filter
        placeholder="${esc(filterPlaceholder)}" autocomplete="off">
    </label>
    ${grouped ? groupNavigationMarkup(new Map(options.map(item => [item.group, item.groupLabel]))) : ''}
    ${previewPanel ? '<div class="module-reference-picker-body">' : ''}
    <div class="module-reference-picker-list" data-reference-picker-list
      role="listbox" aria-label="${esc(label)}候选列表">
      ${options.length
        ? grouped ? groupedOptionsMarkup(options, selectedValue)
          : options.map(item => optionMarkup(item, item.value === selectedValue)).join("")
        : `<p class="module-reference-picker-empty">没有可用候选</p>`}
    </div>
    ${previewPanel ? '<div class="module-reference-picker-detail" data-reference-picker-detail></div></div>' : ''}
    ${pageSize > 0 ? `<nav data-reference-picker-pagination data-page-size="${Number(pageSize)}" aria-label="候选分页"><button type="button" data-reference-picker-previous>上一页</button><span data-reference-picker-page></span><button type="button" data-reference-picker-next>下一页</button></nav>` : ""}`;
}

function mountReferenceMenu(deferred) {
  deferred.insertAdjacentHTML('beforebegin', referenceMenuMarkup(JSON.parse(deferred.textContent)));
  deferred.remove();
}

function refreshReferencePickerGroups(picker) {
  const menu = picker.querySelector('.module-reference-picker-menu');
  const groups = new Map([...picker.querySelectorAll('[data-reference-picker-list] > [data-reference-picker-group]')]
    .map(group => [group.dataset.referencePickerGroup, group.getAttribute('aria-label')]));
  menu.querySelector('.module-reference-picker-groups')?.remove();
  menu.querySelector('.module-reference-picker-filter').insertAdjacentHTML('afterend', groupNavigationMarkup(groups));
  picker.dispatchEvent(new Event('reference-picker-groups-change'));
}

/**
 * `controlMarkup` 是消费页原有的精确值控件；通用选择器只派发 input/change，
 * 不接管保存。没有原生控件的组合工作台可监听 `module-reference-change`。
 */
function referencePickerMarkup({
  moduleId,
  value,
  label = "引用",
  items = [],
  current = null,
  controlMarkup = "",
  componentAttributes = "",
  className = "",
  filterLabel = "过滤候选",
  filterPlaceholder = "按 ID、名称或属性过滤",
  unavailableReason = "",
  unavailableKind = "",
  busy = false,
  disabled = false,
  pageSize = 0,
  grouped = true,
  compact = false,
  previewPanel = true,
  previewOnlySummary = false,
  lazyOptions = false,
} = {}) {
  const options = items.map(normalizedItem);
  const selectedValue = String(value ?? "");
  const selected = current
    ? normalizedItem(current, -1)
    : options.find(item => item.value === selectedValue)
      || normalizedItem({value: selectedValue || "—", label: selectedValue || "未选择"}, -1);
  const reason = String(unavailableReason || "");
  if (previewOnlySummary) className = `${className} reference-preview-only-summary`.trim();
  if (previewPanel && !className.split(/\s/u).includes('reference-preview-panel')) {
    className = `${className} reference-preview-panel`.trim();
  }
  const summaryOnly = className.split(/\s/u).includes('reference-detail-field');
  const unavailableState = busy ? "loading" : reason
    ? String(unavailableKind || "load-failed") : "";
  const unavailableData = busy || ['unpublished-resource', 'empty-domain'].includes(unavailableState);
  const controlsDisabled = disabled || unavailableData || !options.length;
  const menu = {options, selectedValue, filterLabel, filterPlaceholder, grouped, previewPanel, pageSize, label};
  const pickerMarkup = reason && unavailableData
    ? `<div class="module-reference-picker-disabled${selected.preview ? ' has-preview' : ''}"
        data-reference-picker-unavailable data-reference-picker-unavailable-kind="${esc(unavailableState)}" aria-disabled="true">
        ${currentMarkup({...selected, description: ''}, label, true, compact, summaryOnly, previewOnlySummary)}
      </div>`
    : reason
    ? `<div class="module-reference-picker-unavailable${busy ? " loading" : " error"}"
        data-reference-picker-unavailable
        data-reference-picker-unavailable-kind="${esc(unavailableState)}"
        role="${busy ? "status" : "alert"}"
        aria-live="polite">
        ${selected.preview ? `<span class="module-reference-picker-preview">${selected.preview}</span>` : ""}
        <span class="module-reference-picker-current-copy">
          <small>${esc(label)}</small>
          <b>${esc(unavailableTitle(unavailableState, busy))}</b>
          <small data-reference-picker-unavailable-reason>${esc(reason)}</small>
        </span>
        <code>${esc(String(moduleId || ""))}</code>
      </div>`
    : controlsDisabled ? `<div class="module-reference-picker-disabled${selected.preview ? " has-preview" : ""}">
        ${currentMarkup(selected, label, true, compact, summaryOnly, previewOnlySummary)}
      </div>`
    : `<details class="module-reference-picker${compact ? " compact" : ""}">
      <summary aria-label="${esc(label)}" class="${selected.preview && !summaryOnly ? "has-preview" : ""}">${currentMarkup(selected, label, false, compact, summaryOnly, previewOnlySummary)}</summary>
      <div class="module-reference-picker-menu">
        ${lazyOptions ? `<script type="application/json" data-reference-picker-lazy-menu>${
          JSON.stringify(menu).replaceAll('<', '\\u003c')}</script>` : referenceMenuMarkup(menu)}
      </div>
    </details>`;
  return `<section class="module-reference-field${compact ? " compact" : ""}${className ? ` ${esc(className)}` : ""}"
    ${componentAttributes} data-module-reference-picker
    data-module-reference-module="${esc(String(moduleId || ""))}"
    data-module-reference-value="${esc(selectedValue)}"${busy ? " aria-busy=\"true\"" : ""}
    ${controlsDisabled ? 'data-reference-picker-disabled="true" aria-disabled="true"' : ""}>
    ${pickerMarkup}
    ${controlMarkup && !controlsDisabled ? `<div class="module-reference-native"
      data-module-reference-value-control>${controlMarkup}</div>` : ""}
  </section>`;
}

function nativeControl(picker) {
  return picker.querySelector(
    ":scope > [data-module-reference-value-control] input,"
    + ":scope > [data-module-reference-value-control] select",
  );
}

function previewMarkup(node) {
  return node?.querySelector(':scope > template[data-reference-picker-preview-content]')?.innerHTML
    ?? node?.innerHTML ?? '';
}

function copyOptionToCurrent(picker, option) {
  let preview = picker.querySelector("[data-reference-picker-current-preview]");
  const compact = picker.querySelector(':scope > details')?.classList.contains('compact');
  const summaryOnly = picker.classList.contains('reference-detail-field');
  const optionPreview = summaryOnly ? null : option.querySelector("[data-reference-picker-option-preview]");
  const current = picker.querySelector(".module-reference-picker > summary");
  const currentCopy = picker.querySelector("[data-reference-picker-current-copy]");
  const meta = picker.querySelector("[data-reference-picker-current-meta]");
  if (picker.dataset.referencePickerEmpty === "true") {
    preview?.remove();
    current?.classList.remove("has-preview");
    if (currentCopy) currentCopy.innerHTML = `<small>${esc(
      currentCopy.querySelector("small")?.textContent || "引用")}</small><b>空</b>`;
    if (meta) meta.innerHTML = '<em aria-hidden="true">⌄</em>';
    return;
  }
  if (optionPreview && !preview && current) {
    preview = document.createElement("span");
    preview.className = "module-reference-picker-preview";
    preview.dataset.referencePickerCurrentPreview = "";
    current.prepend(preview);
  }
  if (preview && optionPreview) preview.innerHTML = previewMarkup(optionPreview);
  else if (preview) preview.remove();
  current?.classList.toggle("has-preview", Boolean(optionPreview));
  const optionCopy = option.querySelector("[data-reference-picker-option-copy]");
  if (currentCopy && optionCopy) {
    const fieldLabel = currentCopy.querySelector("small")?.textContent || "引用";
    currentCopy.innerHTML = option.dataset.referencePickerCurrentLabel
      ? `<b>${handleTextMarkup(option.dataset.referencePickerCurrentLabel)}</b>`
      : compact ? optionCopy.querySelector('b').outerHTML
        : `<small>${esc(fieldLabel)}</small>${optionCopy.innerHTML}`;
  }
  const optionMeta = option.querySelector("[data-reference-picker-option-meta]");
  if (meta) {
    meta.innerHTML = `${summaryOnly ? '' : handleTextMarkup(optionMeta?.textContent || "")}<em aria-hidden="true">⌄</em>`;
  }
}

/** 引用的空态只改变呈现，保留原生值与候选。 */
function setReferencePickerEmpty(picker, empty) {
  picker.dataset.referencePickerEmpty = String(Boolean(empty));
  const option = [...picker.querySelectorAll("[data-reference-picker-option]")]
    .find(candidate => candidate.dataset.referencePickerOption === picker.dataset.moduleReferenceValue);
  if (option) copyOptionToCurrent(picker, option);
}

/** 共享字段变化后更新候选呈现，保留选值与交互绑定。 */
function updateReferencePickerItem(picker, item) {
  updateReferencePickerItems(picker, [item]);
}

const itemBatchIdentities = new WeakMap();
let nextItemBatchIdentity = 0;

function updateReferencePickerItems(picker, items, source = null) {
  let identity = null;
  if (source) {
    if (!itemBatchIdentities.has(source)) itemBatchIdentities.set(source, String(++nextItemBatchIdentity));
    identity = itemBatchIdentities.get(source);
    if (picker.dataset.referencePickerItemBatch === identity) return;
  }
  const options = new Map([...picker.querySelectorAll('[data-reference-picker-option]')]
    .map(option => [option.dataset.referencePickerOption, option]));
  const selected = items.map(item => normalizedItem(item, -1))
    .filter(item => options.has(item.value));
  if (!selected.length) return;
  const template = document.createElement("template");
  template.innerHTML = selected.map(item => optionMarkup(item,
    options.get(item.value).getAttribute('aria-selected') === 'true')).join('');
  const rendered = [...template.content.children];
  selected.forEach((normalized, index) => {
    const option = options.get(normalized.value);
    option.replaceChildren(...rendered[index].childNodes);
    option.dataset.referencePickerSearch = normalized.filter;
    option.dataset.referencePickerCurrentLabel = normalized.currentLabel;
    option.dataset.referencePickerControlValue = normalized.controlValue;
    option.classList.toggle("has-preview", Boolean(normalized.preview));
    option.classList.toggle("has-details", Boolean(normalized.details));
    if (picker.dataset.moduleReferenceValue === normalized.value) copyOptionToCurrent(picker, option);
  });
  if (identity) picker.dataset.referencePickerItemBatch = identity;
  else delete picker.dataset.referencePickerItemBatch;
}

function referenceChangeEvent(picker, value, previousValue) {
  return new CustomEvent("module-reference-change", {
    bubbles: true,
    detail: {
      moduleId: picker.dataset.moduleReferenceModule,
      value,
      previousValue,
    },
  });
}

/** 同步当前项，可供消费页的 Original 恢复或关联字段联动使用。 */
async function setReferencePickerValue(
  picker,
  value,
  {emit = false, paint = null} = {},
) {
  const normalized = String(value ?? "");
  const option = [...picker.querySelectorAll("[data-reference-picker-option]")]
    .find(candidate => candidate.dataset.referencePickerOption === normalized);
  const previousValue = picker.dataset.moduleReferenceValue || "";
  picker.dataset.moduleReferenceValue = normalized;
  markPickerSelection(picker.querySelectorAll("[data-reference-picker-option]"),
    true, candidate => candidate === option);
  if (option) copyOptionToCurrent(picker, option);
  const control = nativeControl(picker);
  const controlValue = option?.dataset.referencePickerControlValue ?? normalized;
  if (control && control.value !== controlValue) control.value = controlValue;
  // 选值和保存不能等待 owner 的像素预览；场景缩略图可能需要异步加载多份资产。
  // 先沿消费页原有的 input/change 路径提交，再补画当前封面。
  if (emit) {
    if (control) {
      control.dispatchEvent(new Event("input", {bubbles: true}));
      control.dispatchEvent(new Event("change", {bubbles: true}));
    }
    picker.dispatchEvent(referenceChangeEvent(picker, normalized, previousValue));
  }
  if (paint) {
    const currentPreview = picker.querySelector("[data-reference-picker-current-preview]");
    if (currentPreview) await paint(currentPreview);
  }
  return Boolean(option);
}

/**
 * 给 owner 生成的引用框装上统一行为。`paint` 只接收局部根节点，因而场景、角色、
 * 怪物等模块仍使用自己的像素渲染器。
 */
const controlRenderers = new WeakMap();
function bindReferenceControlProjection(control, render) {
  let renderers = controlRenderers.get(control);
  if (!renderers) controlRenderers.set(control, renderers = new Set());
  renderers.add(render);
}
// Field bindings project a value without synthesizing an edit or a save event.
function syncReferencePickerControl(control) {
  return Promise.all([...(controlRenderers.get(control) || [])].map(render => render()));
}

function bindReferencePicker(picker, {paint = null, preview = null, onSelect = null, onOpen = null} = {}) {
  if (!picker?.matches?.("[data-module-reference-picker]")
      || picker.dataset.moduleReferenceBound === "1") return;
  const deferred = picker.querySelector('[data-reference-picker-lazy-menu]');
  const menuDetails = picker.querySelector(':scope > details');
  if (deferred && !menuDetails.open) {
    if (picker.dataset.referenceMenuDeferred === '1') return;
    picker.dataset.referenceMenuDeferred = '1';
    const control = nativeControl(picker);
    const mount = () => {
      if (!deferred.isConnected) return;
      mountReferenceMenu(deferred);
      menuDetails.removeEventListener('toggle', open);
      control?.removeEventListener('input', input);
      bindReferencePicker(picker, {paint, preview, onSelect, onOpen});
    };
    const open = () => {if (menuDetails.open) mount();};
    const sync = () => {
      if (!deferred.isConnected) return;
      mount();
      return setReferencePickerValue(picker, control.value, {paint});
    };
    const input = () => {void sync();};
    menuDetails.addEventListener('toggle', open);
    if (control) {
      control.addEventListener('input', input);
      bindReferenceControlProjection(control, sync);
    }
    const current = picker.querySelector('[data-reference-picker-current-preview]');
    if (current && paint) void paint(current);
    return;
  }
  if (deferred) mountReferenceMenu(deferred);
  picker.dataset.moduleReferenceBound = "1";
  ownerEnhancements.get(picker.dataset.moduleReferenceModule)?.(picker);
  const details = picker.querySelector(":scope > details");
  const summary = details?.querySelector(":scope > summary");
  const list = picker.querySelector("[data-reference-picker-list]");
  const options = [...picker.querySelectorAll("[data-reference-picker-option]")];
  const detail = picker.querySelector('[data-reference-picker-detail]');
  let previewGeneration = 0;
  const showPreview = async option => {
    if (!detail || !option) return;
    const generation = ++previewGeneration;
    try {
      const content = option.querySelector('.module-reference-picker-option-details')
        || option.querySelector('[data-reference-picker-option-preview]');
      const markup = preview ? await preview(option.dataset.referencePickerOption)
        : `${option.querySelector('[data-reference-picker-option-copy]').outerHTML}
          ${option.querySelector('[data-reference-picker-option-meta]').outerHTML}
          ${previewMarkup(content)}`;
      if (generation !== previewGeneration || !detail.isConnected) return;
      detail.removeAttribute('role');
      detail.innerHTML = markup;
      detail.querySelectorAll('[data-compact]').forEach(node => {node.dataset.compact = '0';});
      if (paint) await paint(detail);
    } catch (error) {
      editorLog.error("字段编辑", `操作失败：${error?.message || error}`, error);
      if (generation !== previewGeneration) return;
      detail.textContent = error?.message || String(error);
      detail.setAttribute('role', 'alert');
    }
  };
  let pending = null;
  let confirmation = null;
  const stage = option => {
    if (option.disabled || nativeControl(picker)?.disabled) return;
    pending = option;
    markPickerSelection(options, true, candidate => candidate === pending);
    confirmation?.refresh();
    void showPreview(option);
  };
  const resetPending = () => {
    pending = options.find(option => option.dataset.referencePickerOption === picker.dataset.moduleReferenceValue) || null;
    markPickerSelection(options, true, candidate => candidate === pending);
    confirmation?.refresh();
  };
  const customConfirmation = picker.dataset.referencePickerCustomConfirm === 'true';
  if (!customConfirmation) {
    confirmation = bindPickerConfirmation(details, {
      host: picker.querySelector('.module-reference-picker-menu'),
      canConfirm: () => Boolean(pending && !pending.disabled
        && !pending.hasAttribute('data-reference-picker-preview-only') && !nativeControl(picker)?.disabled),
      confirm: async () => {
        const value = pending.dataset.referencePickerOption;
        await setReferencePickerValue(picker, value, {emit: true, paint});
        await onSelect?.(value);
      },
    });
    options.forEach(option => option.addEventListener('focus', () => stage(option)));
  }
  let paintQueue = Promise.resolve();
  const enqueuePaint = node => {
    if (!node || node.dataset.referencePreviewQueued === "1") return;
    node.dataset.referencePreviewQueued = "1";
    paintQueue = paintQueue.then(async () => {
      const option = node.closest('[data-reference-picker-option]');
      if (!node.isConnected || option && (!details?.open || option.hidden
          || option.dataset.referencePreviewVisible !== 'true')) {
        delete node.dataset.referencePreviewQueued;
        return;
      }
      const template = node.querySelector(':scope > template[data-reference-picker-preview-content]');
      if (template && node.dataset.referencePreviewMounted !== '1') {
        node.append(template.content.cloneNode(true));
        node.dataset.referencePreviewMounted = '1';
      }
      await paint?.(node);
    });
  };
  enqueuePaint(picker.querySelector("[data-reference-picker-current-preview]"));
  let observer = null;

  const filter = picker.querySelector("[data-reference-picker-filter]");
  const pagination = picker.querySelector("[data-reference-picker-pagination]");
  const pageSize = Number(pagination?.dataset.pageSize) || options.length || 1;
  const selectedCategory = () => options.find(option => option.getAttribute('aria-selected') === 'true')
    ?.closest('[data-reference-picker-group]')?.dataset.referencePickerGroup || '';
  let category = selectedCategory();
  let page = 0;
  const updatePage = () => {
    const result = pickerVisibleOptions(options, {query: filter.value, category, page, pageSize,
      searchText: option => option.dataset.referencePickerSearch,
      group: option => option.closest("[data-reference-picker-group]")?.dataset.referencePickerGroup});
    const {matches, pages, visible} = result;
    page = result.page;
    options.forEach(option => {
      const hidden = !visible.has(option);
      if (option.hidden !== hidden) option.hidden = hidden;
    });
    list?.querySelectorAll('[data-reference-picker-group]').forEach(group => {
      group.hidden = ![...group.querySelectorAll("[data-reference-picker-option]")]
        .some(option => visible.has(option));
    });
    picker.querySelectorAll('[data-reference-picker-category]').forEach(button => {
      if (button.closest('[data-module-reference-picker]') === picker)
        button.setAttribute('aria-pressed', String(button.dataset.referencePickerCategory === category));
    });
    if (pagination) {
      pagination.querySelector("[data-reference-picker-page]").textContent = `${page + 1} / ${pages} · ${matches.length} 项`;
      pagination.querySelector("[data-reference-picker-previous]").disabled = page === 0;
      pagination.querySelector("[data-reference-picker-next]").disabled = page === pages - 1;
    }
    if (list) list.scrollTop = 0;
    if (details?.open) {
      observeMenu();
      const candidate = options.find(option => visible.has(option)
        && option.getAttribute('aria-selected') === 'true') || options.find(option => visible.has(option));
      if (candidate) void showPreview(candidate);
      else if (detail) { previewGeneration += 1; detail.replaceChildren(); }
    }
  };
  pagination?.querySelector("[data-reference-picker-previous]").addEventListener("click", () => { page -= 1; updatePage(); });
  pagination?.querySelector("[data-reference-picker-next]").addEventListener("click", () => { page += 1; updatePage(); });
  picker.addEventListener('reference-picker-groups-change', () => {
    category = filter?.value ? '' : selectedCategory();
    page = 0;
    updatePage();
  });
  picker.addEventListener('click', event => {
    const button = event.target.closest('[data-reference-picker-category]');
    if (!button || button.closest('[data-module-reference-picker]') !== picker) return;
    category = button.dataset.referencePickerCategory;
    page = 0;
    updatePage();
  });
  filter?.addEventListener("input", () => {
    page = 0;
    category = "";
    updatePage();
  });
  filter?.addEventListener("keydown", event => {
    if (event.key !== "ArrowDown") return;
    const first = options.find(option => !option.hidden && !option.disabled);
    if (!first) return;
    event.preventDefault();
    first.focus();
  });
  const observeMenu = () => {
    observer?.disconnect();
    if (detail) return;
    options.forEach(option => { option.dataset.referencePreviewVisible = 'false'; });
    const visibleOptions = options.filter(option => !option.hidden
      && option.querySelector('[data-reference-picker-option-preview]'));
    if (typeof IntersectionObserver === "function" && list) {
      observer ||= new IntersectionObserver(records => {
        records.forEach(record => {
          const option = record.target;
          const visible = details?.open && !option.hidden && record.isIntersecting;
          option.dataset.referencePreviewVisible = String(Boolean(visible));
          if (visible) enqueuePaint(option.querySelector('[data-reference-picker-option-preview]'));
        });
      }, {root: list, rootMargin: "0px", threshold: 0.01});
      visibleOptions.forEach(option => observer.observe(option));
    } else {
      const bounds = list?.getBoundingClientRect();
      visibleOptions.forEach(option => {
        const rect = option.getBoundingClientRect();
        const visible = bounds && rect.bottom > bounds.top && rect.top < bounds.bottom;
        option.dataset.referencePreviewVisible = String(Boolean(visible));
        if (visible) enqueuePaint(option.querySelector('[data-reference-picker-option-preview]'));
      });
    }
  };
  const initializeMenu = () => {
    if (!customConfirmation) resetPending();
    onOpen?.();
    if (filter) updatePage();
    observeMenu();
  };
  if (details?.open) initializeMenu();
  details?.addEventListener("toggle", () => {
    if (!details.open) {
      observer?.disconnect();
      options.forEach(option => { option.dataset.referencePreviewVisible = 'false'; });
      return;
    }
    initializeMenu();
    openPickerSurface(details, {filter,
      selected: picker.querySelector('[aria-selected="true"]')});
  });
  details?.addEventListener("keydown", event => {
    if (event.key !== "Escape" || !details.open) return;
    event.preventDefault();
    event.stopPropagation();
    closePickerSurface(details);
    summary?.focus();
  });
  options.forEach(option => option.addEventListener("click", async () => {
    if (option.disabled || nativeControl(picker)?.disabled) return;
    if (!customConfirmation) {stage(option); return;}
    if (option.hasAttribute('data-reference-picker-preview-only')) {
      await showPreview(option);
      return;
    }
    if (option.disabled) return;
    void showPreview(option);
    const value = option.dataset.referencePickerOption;
    const changed = value !== picker.dataset.moduleReferenceValue;
    await setReferencePickerValue(picker, value, {emit: changed, paint});
    onSelect?.(value);
    if (details && !details.closest(".scene-position-panel")) closePickerSurface(details);
  }));
  const control = nativeControl(picker);
  const sync = () => {
    const controlValue = control.value;
    const option = options.find(candidate =>
      candidate.dataset.referencePickerControlValue === controlValue);
    return setReferencePickerValue(
      picker,
      option?.dataset.referencePickerOption ?? controlValue,
      {paint},
    );
  };
  if (control) {
    bindReferenceControlProjection(control, sync);
    control.addEventListener("input", sync);
  }
}

/** Enhance an existing value control without replacing its owner/save listeners. */
function bindGroupedReferenceSelect(select) {
  if (select.closest(".carry-item-picker")) return;
  const host = document.createElement("div");
  host.className = "carry-item-picker plain-reference-picker";
  const picker = document.createElement("animated-resource-picker");
  picker.setAttribute("aria-label", select.getAttribute("aria-label") || "选择装备");
  select.before(host);
  host.append(picker, select);
  select.hidden = true;
  host.addEventListener("click", event => event.stopPropagation());
  configureAnimatedResourcePicker(picker, {
    options: [...select.options].map(option => ({
      value: option.value, label: option.textContent, disabled: option.disabled,
      group: option.dataset.referenceGroup || "", groupLabel: option.dataset.referenceGroupLabel || "空",
    })),
    value: select.value,
  });
  picker.disabled = select.disabled;
  picker.addEventListener("change", event => {
    if (event.target !== picker) return;
    event.stopPropagation();
    if (select.disabled) return;
    select.value = picker.value;
    select.dispatchEvent(new Event("input", {bubbles: true}));
    select.dispatchEvent(new Event("change", {bubbles: true}));
  });
  select.addEventListener("input", () => { picker.value = select.value; });
  select.addEventListener("change", () => { picker.value = select.value; });
  new MutationObserver(() => { picker.disabled = select.disabled; })
    .observe(select, {attributes: true, attributeFilter: ["disabled"]});
}

function equipmentItemChoices(items, {inventory = false, allowedIds = null} = {}) {
  return items.filter(item => {
    const id = Number(item.id);
    if (allowedIds && !allowedIds.has(id)) return false;
    if (id === 0) return true;
    if (item.category?.owner !== "human" && !allowedIds) return false;
    return inventory || allowedIds !== null || item.category?.id !== "human-item";
  }).map(item => ({
    value: String(Number(item.id)),
    label: `${item.id_hex} · ${item.name}${Number(item.id) ? `［${item.category.name}］` : ""}`,
    group: Number(item.id) ? item.category?.id || "" : "",
    groupLabel: Number(item.id) ? item.category?.name || "" : "",
  }));
}

// @editor-module 将编辑器错误与调用栈上报日志并保留出错位置与恢复操作。

function storyPageRecoveryButton(page) {
  return `<button class="button ghost" data-clear-story-page="${esc(page)}" title="丢弃本剧情页的修改；其他页面和字段修改保留">清理本页修改</button>`;
}

function bindStoryPageRecovery(root, {database, afterReset, onError}) {
  for (const button of root?.querySelectorAll("[data-clear-story-page]") || []) {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await database.resetStoryPageWorking(button.dataset.clearStoryPage);
        await afterReset();
      } catch (error) {onError(error);}
      finally {button.disabled = false;}
    });
  }
}

function editorErrorMarkup(block, error, {storyRecovery = false} = {}) {
  editorLog.error("编辑页面", `${block}：${error?.message || error}`, error);
  return `<div class="editor-error"><b>${esc(block)}</b>
    ${storyRecovery && error instanceof StoryPageDataError ? storyPageRecoveryButton(error.storyPage) : ""}</div>`;
}

/** Render at the failed subview, without replacing its controls or other errors. */
function showEditorError(root, block, error) {
  if (!root?.isConnected) {
    // Failed writes can finish after navigation. Keep their named block visible
    // on the current page rather than losing the error with the detached panel.
    root = document.querySelector("#content");
    if (!root) throw error;
  }
  let host = [...root.children].find(node => node.dataset.editorErrorBlock === block);
  if (!host) {
    host = document.createElement("div");
    host.dataset.editorErrorBlock = block;
    root.prepend(host);
  }
  host.innerHTML = editorErrorMarkup(block, error);
}

// @editor-module 画布视口的缩放、平移与坐标换算。

const scales = [0.125, 0.25, 0.5, 1, 2, 3, 4, 6, 8, 16, 24, 32, 48, 64];
const presets = scales.filter(scale => scale <= 16);
const controllers = new WeakMap();
const pendingLayouts = new Map();
let layoutFrame = null;

function flushCanvasViewportLayouts() {
  if (layoutFrame !== null) cancelAnimationFrame(layoutFrame);
  layoutFrame = null;
  const jobs = [...pendingLayouts].filter(([viewport]) => viewport.isConnected).map(([, job]) => job);
  pendingLayouts.clear();
  const measurements = jobs.map(job => job.measure());
  const applied = jobs.map((job, index) => job.apply(measurements[index]));
  jobs.forEach((job, index) => {if (applied[index]) job.after();});
}

function scheduleLayout(viewport, job) {
  pendingLayouts.set(viewport, job);
  if (layoutFrame === null) layoutFrame = requestAnimationFrame(flushCanvasViewportLayouts);
}

const clampScale = value => Math.max(0.125, Math.min(64, Number(value)));

function canvasViewportControls(label = "画布缩放") {
  return `<div class="canvas-viewport-controls">
    <button type="button" class="button ghost" data-canvas-zoom-step="-1" title="缩小">−</button>
    <input type="range" min="-3" max="6" step="0.001" value="0" data-canvas-zoom-range aria-label="${esc(label)}">
    <select data-canvas-zoom aria-label="缩放档位"><option value="fit">适应</option>${presets.map(scale =>
      `<option value="${scale}">${scale * 100}%</option>`).join("")}<option value="custom" disabled>自定</option></select>
    <button type="button" class="button ghost" data-canvas-zoom-step="1" title="放大">＋</button>
    <button type="button" class="button ghost" data-canvas-zoom-fit>适应</button>
    <output data-canvas-zoom-value></output>
  </div>`;
}

function canvasViewportPoint(surface, point, {width, height} = {}) {
  const rect = surface.getBoundingClientRect();
  return {x: (point.clientX - rect.left) * (width || surface.width) / rect.width,
    y: (point.clientY - rect.top) * (height || surface.height) / rect.height};
}

function bindCanvasViewport({viewport, surface, controls, key, size = () => surface,
  sizeElement = surface, zoom = "fit", fitAlignment = {x: .5, y: .5},
  onChange = () => {}, onLayout = () => {}, canPan = () => true, retainWhenDetached = false} = {}) {
  if (!viewport || !surface || !controls) return null;
  if (controllers.has(viewport)) return controllers.get(viewport);
  const storageKey = `canvas-viewport:${key}`;
  let saved;
  try { saved = JSON.parse(localStorage.getItem(storageKey)); } catch { /* 本机值缺失时使用初值。 */ }
  let mode = saved?.zoom === "fit" ? "fit"
    : Number.isFinite(saved?.zoom) ? clampScale(saved.zoom) : zoom;
  let panX = Number.isFinite(saved?.x) ? saved.x : 0;
  let panY = Number.isFinite(saved?.y) ? saved.y : 0;
  let scale = 1;
  let lastLayout;
  let viewportSize;
  let drag = null;
  let suppressClick = false;
  const listeners = [];
  const listen = (target, event, callback, options = {}) => {
    target.addEventListener(event, callback, options);
    listeners.push(() => target.removeEventListener(event, callback, options));
  };
  viewport.classList.add("canvas-viewport");
  surface.dataset.canvasViewportSurface = "";
  const surfaceDimensions = () => {
    const value = size();
    return {width: Number(value.width) || 256, height: Number(value.height) || 240};
  };
  const geometry = (bounds = null) => {
    const {width, height} = surfaceDimensions();
    const viewportWidth = bounds?.width ?? viewport.clientWidth;
    const viewportHeight = bounds?.height ?? viewport.clientHeight;
    const fit = Math.min(viewportWidth / width, viewportHeight / height);
    const pixelSurface = surface.matches("canvas") || surface.querySelector("canvas");
    return {width, height, viewportWidth, viewportHeight,
      fit: pixelSurface && fit >= 1 ? Math.floor(fit) : fit};
  };
  const persist = () => {
    try { localStorage.setItem(storageKey, JSON.stringify({zoom: mode, x: panX, y: panY})); }
    catch { /* 本机存储不可用时保留页内值。 */ }
    onChange(mode);
  };
  const applyLayout = ({width, height, viewportWidth, viewportHeight, fit}) => {
    if (!(fit > 0)) return;
    scale = mode === "fit" ? fit : clampScale(mode);
    const values = [width, height, viewportWidth, viewportHeight, scale, mode, panX, panY];
    if (lastLayout && values.every((value, index) => value === lastLayout[index])) return false;
    lastLayout = values;
    surface.style.width = `${width * scale}px`;
    surface.style.height = `${height * scale}px`;
    surface.style.left = `${(viewportWidth - width * scale) * (mode === "fit" ? fitAlignment.x : .5) + panX}px`;
    surface.style.top = `${(viewportHeight - height * scale) * (mode === "fit" ? fitAlignment.y : .5) + panY}px`;
    const range = controls.querySelector("[data-canvas-zoom-range]");
    const percentage = `${Math.round(scale * 1000) / 10}%`;
    range.value = String(Math.log2(scale));
    range.setAttribute("aria-valuetext", percentage);
    controls.querySelector("[data-canvas-zoom]").value = mode === "fit" ? "fit"
      : presets.includes(scale) ? String(scale) : "custom";
    controls.querySelector("[data-canvas-zoom-value]").textContent = percentage;
    return true;
  };
  const layout = (measurements = geometry()) => {
    pendingLayouts.delete(viewport);
    if (applyLayout(measurements)) onLayout();
  };
  const schedule = () => {
    if (viewport.isConnected && viewportSize) scheduleLayout(viewport,
      {measure: () => geometry(viewportSize), apply: applyLayout, after: onLayout});
  };
  const setZoom = (next, point = null) => {
    if (next === "fit" && !point) {
      panX = 0; panY = 0; mode = "fit";
      schedule(); persist();
      return;
    }
    const rect = viewport.getBoundingClientRect();
    const x = point ? point.clientX - rect.left - viewport.clientLeft - viewport.clientWidth / 2 : 0;
    const y = point ? point.clientY - rect.top - viewport.clientTop - viewport.clientHeight / 2 : 0;
    const {width, height, viewportWidth, viewportHeight, fit} = geometry();
    const offsetX = panX + (mode === "fit" ? (viewportWidth - width * scale) * (fitAlignment.x - .5) : 0);
    const offsetY = panY + (mode === "fit" ? (viewportHeight - height * scale) * (fitAlignment.y - .5) : 0);
    const nextScale = next === "fit" ? fit : clampScale(next);
    if (!(nextScale > 0)) return;
    panX = next === "fit" ? 0 : x - (x - offsetX) * nextScale / scale;
    panY = next === "fit" ? 0 : y - (y - offsetY) * nextScale / scale;
    mode = next === "fit" ? "fit" : nextScale;
    layout({width, height, viewportWidth, viewportHeight, fit});
    persist();
  };
  const panBy = (x, y) => { panX += x; panY += y; layout(); persist(); };
  const step = direction => setZoom(direction > 0
    ? scales.find(value => value > scale + .001) ?? scales.at(-1)
    : scales.findLast(value => value < scale - .001) ?? scales[0]);
  listen(controls.querySelector("[data-canvas-zoom]"), "change", event =>
    setZoom(event.target.value === "fit" ? "fit" : Number(event.target.value)));
  listen(controls.querySelector("[data-canvas-zoom-range]"), "input", event => setZoom(2 ** Number(event.target.value)));
  controls.querySelectorAll("[data-canvas-zoom-step]").forEach(button =>
    listen(button, "click", () => step(Number(button.dataset.canvasZoomStep))));
  listen(controls.querySelector("[data-canvas-zoom-fit]"), "click", () => setZoom("fit"));
  listen(viewport, "wheel", event => {
    if (!event.deltaY) return;
    event.preventDefault();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1);
    setZoom(scale * Math.exp(-delta * .0015), event);
  }, {passive: false});
  listen(viewport, "pointerdown", event => {
    suppressClick = false;
    if (![0, 1].includes(event.button) || !canPan(event)) return;
    if (event.button === 1) event.preventDefault();
    viewport.ownerDocument.getSelection()?.removeAllRanges();
    drag = {id: event.pointerId, x: event.clientX, y: event.clientY, panX, panY, moved: false};
  });
  for (const type of ["selectstart", "dragstart"]) listen(viewport, type, event => {
    if (drag) event.preventDefault();
  });
  listen(viewport, "pointermove", event => {
    if (!drag || event.pointerId !== drag.id) return;
    if ((event.buttons & 5) === 0) { release(event); return; }
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    if (!drag.moved) viewport.setPointerCapture(event.pointerId);
    drag.moved = true;
    suppressClick = true;
    viewport.classList.add("is-panning");
    panX = drag.panX + dx;
    panY = drag.panY + dy;
    layout();
  });
  const release = event => {
    if (event.pointerId !== drag?.id) return;
    if (drag.moved) persist();
    drag = null;
    viewport.classList.remove("is-panning");
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
  };
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) listen(viewport, type, release);
  listen(viewport, "click", event => {
    if (suppressClick) { event.preventDefault(); event.stopImmediatePropagation(); suppressClick = false; }
  }, {capture: true});
  listen(viewport, "auxclick", event => { if (event.button === 1) event.preventDefault(); });
  listen(viewport, "keydown", event => {
    if (event.target !== viewport || event.altKey || event.metaKey) return;
    const directions = {ArrowLeft: [40, 0], ArrowRight: [-40, 0], ArrowUp: [0, 40], ArrowDown: [0, -40]};
    if (["+", "=", "-", "_"].includes(event.key)) step(["+", "="].includes(event.key) ? 1 : -1);
    else if (event.key === "0") setZoom(1);
    else if (directions[event.key]) panBy(...directions[event.key].map(value => value * (event.shiftKey ? 4 : 1)));
    else return;
    event.preventDefault();
  });
  const observer = new ResizeObserver(() => {
    if (!viewport.isConnected) { if (!retainWhenDetached) controller.destroy(); return; }
    viewportSize = {width: viewport.clientWidth, height: viewport.clientHeight};
    schedule();
  });
  const dimensions = new MutationObserver(schedule);
  dimensions.observe(sizeElement, {attributes: true,
    attributeFilter: ["width", "height", "data-stage-width", "data-stage-height"]});
  const controller = {layout: schedule, setZoom, panBy, zoom: () => mode,
    point: point => canvasViewportPoint(surface, point, surfaceDimensions()),
    center: (x, y) => {
      const {width, height} = surfaceDimensions();
      panX = (width / 2 - x) * scale;
      panY = (height / 2 - y) * scale;
      layout(); persist();
    },
    destroy: () => {
      observer.disconnect(); dimensions.disconnect();
      pendingLayouts.delete(viewport);
      listeners.forEach(remove => remove());
      controllers.delete(viewport);
    }};
  controllers.set(viewport, controller);
  observer.observe(viewport);
  schedule();
  return controller;
}

// @editor-module 按场景引用取得元图块属性记录。
function sceneMetatileAttributeRecords(scene, {pages, sets}) {
  const set = sets?.records?.find(record => (record.scene_references || [])
    .includes(`scene:${Number(scene.id).toString(16).toUpperCase().padStart(2, "0")}`));
  if (!set) throw new TypeError(`scene:${scene.id} 缺少元图块集引用`);
  const records = Number(scene.id) === 0 ? [set]
    : [set.lower_metatile_page, set.upper_metatile_page].map(handle =>
      pages?.records?.find(record => record.handle === handle));
  if (records.some(record => !record)) throw new TypeError("元图块页引用无效");
  return records;
}

function projectSceneMetatileSources(scene, documents) {
  const records = sceneMetatileAttributeRecords(scene, documents);
  const definitions = records.flatMap(record => documents.edits?.find(edit => edit.handle === record.handle)?.definitions
    || record.metatile_definitions || record.metatile_definition_page || []);
  const attributes = records.flatMap(record => documents.edits?.find(edit => edit.handle === record.handle)?.attributes
    || record.metatile_attributes || record.metatile_attribute_page || []);
  if (!definitions.length || definitions.length !== attributes.length)
    throw new TypeError("元图块定义与属性不完整");
  return {...scene, metatile_definitions: definitions,
    metatile_palette_ids: attributes.map(value => value & 3)};
}

const cache = new WeakMap();

async function projectSceneMetatiles(scene, {edits = []} = {}) {
  const [pages, sets] = await Promise.all([
    db.getResourceDocument("metatile-page", null),
    db.getResourceDocument("metatile-set", null),
  ]);
  if (edits.length) return projectSceneMetatileSources(scene, {pages, sets, edits});
  const previous = cache.get(scene);
  if (previous?.pages === pages && previous.sets === sets) return previous.value;
  const value = projectSceneMetatileSources(scene, {pages, sets});
  cache.set(scene, {pages, sets, value});
  return value;
}

// @editor-module 元图块行为码的已证实局部移动效果。
// 依据：project/evidence/reverse-engineering/metatile-attribute-bits/observations.md。
const effects = new Map([
  [0, "人物通过目标格"], [1, "改变位移方向"], [2, "改变位移方向"],
  [3, "人物通过目标格"], [4, "人物通过目标格，落点有别"],
  [5, "人物通过目标格"], [6, "人物通过；世界地图战车受阻"],
  [7, "人物通过目标格"], [8, "人物停在目标格前"],
  [9, "人物停在目标格前"], [10, "人物停在目标格前"],
  [11, "人物停在目标格前"], [12, "人物停在目标格前"],
  [13, "通过；同格有入口时转场"], [14, "人物通过目标格"],
  [15, "人物通过目标格"], [16, "人物停在目标格前"],
  [17, "人物通过目标格"], [18, "人物通过目标格"],
  [19, "人物通过目标格"], [20, "此处转入另一场景"],
  [21, "人物通过目标格"], [22, "人物停在目标格前"],
  [23, "人物停在目标格前"], [24, "人物停在目标格前"],
  ...Array.from({length: 7}, (_, index) => [25 + index, "人物通过目标格"]),
  [32, "人物停在目标格前"], [33, "人物停在目标格前"],
  [38, "人物停在目标格前"], [52, "人物停在目标格前"],
  [63, "人物停在目标格前"],
]);

const metatileBehaviorCode = attribute => (Number(attribute) >> 2) & 0x3f;
const metatileBehaviorLabel = code => effects.get(code) || "局部移动效果未确认";
const metatileBehaviorOptions = Array.from({length: 64}, (_, code) => ({
  code, label: `$${code.toString(16).toUpperCase().padStart(2, "0")} · ${metatileBehaviorLabel(code)}`,
}));

function metatileAttributeWithBehavior(attribute, code) {
  if (!Number.isInteger(attribute) || attribute < 0 || attribute > 255
      || !Number.isInteger(code) || code < 0 || code > 63)
    throw new TypeError("元图块行为码必须是 0–63 的整数");
  return (code << 2) | (attribute & 3);
}

// @editor-module owner 模块向消费页公开可嵌入 UI 能力
//
// 模块图决定数据与引用归属；本注册表只决定一个 owner 怎样提供可嵌入的
// reference / preview / cover。编辑控件只由字段对象提供。
// 消费页按 `module id + component kind` 取组件，
// 不再复制名称解析、候选目录、缩略图和水合代码。字段结构、编码与保存规则仍是
// 模块专有函数，不在这里描述，因而这不是通用表单 schema 或逐字节解释器。


const MODULE_ID$1 = /^[a-z0-9][a-z0-9._-]*$/u;
const COMPONENT_KIND = /^[a-z][a-z0-9-]*$/u;
const registry = new Map();
const fallbacks = new Map();
const hydrationByHost = new WeakMap();

function identity(moduleId, kind) {
  const normalizedModule = String(moduleId || "");
  const normalizedKind = String(kind || "");
  if (!MODULE_ID$1.test(normalizedModule)) {
    throw new TypeError(`模块组件 ID 无效：${normalizedModule || "（空）"}`);
  }
  if (!COMPONENT_KIND.test(normalizedKind)) {
    throw new TypeError(`模块组件类型无效：${normalizedKind || "（空）"}`);
  }
  return {moduleId: normalizedModule, kind: normalizedKind};
}

function componentKey(moduleId, kind) {
  return `${moduleId}:${kind}`;
}

function validateDefinition(moduleId, kind, definition) {
  if (!definition || typeof definition !== "object") {
    throw new TypeError(`${moduleId}:${kind} 必须提供组件定义`);
  }
  if (typeof definition.render !== "function") {
    throw new TypeError(`${moduleId}:${kind} 缺少 render`);
  }
  for (const hook of ["prepare", "hydrate", "sync", "dispose"]) {
    if (definition[hook] !== undefined && typeof definition[hook] !== "function") {
      throw new TypeError(`${moduleId}:${kind}.${hook} 必须是函数`);
    }
  }
  return Object.freeze({...definition});
}

/** owner 可分散登记 reference / preview / cover，但同种能力只有一个实现。 */
function registerModuleComponent(moduleId, kind, definition) {
  const id = identity(moduleId, kind);
  if (id.kind === "editor") {
    throw new TypeError("editor 不能作为通用组件");
  }
  const key = componentKey(id.moduleId, id.kind);
  if (registry.has(key)) {
    throw new TypeError(`模块组件重复登记：${key}`);
  }
  registry.set(key, validateDefinition(id.moduleId, id.kind, definition));
}

/**
 * 所有 owner 都有的保底嵌入能力。精确登记始终优先；fallback 只提供身份卡，
 * 不包含 editor、ROM 字段、编码或模块专有布局。
 */
function registerModuleComponentFallback(kind, definition) {
  const normalizedKind = identity("fallback", kind).kind;
  if (normalizedKind === "editor") {
    throw new TypeError("editor 禁止 fallback");
  }
  if (fallbacks.has(normalizedKind)) {
    throw new TypeError(`模块组件 fallback 重复登记：${normalizedKind}`);
  }
  fallbacks.set(
    normalizedKind,
    validateDefinition("fallback", normalizedKind, definition),
  );
}

function moduleComponentDefinition(moduleId, kind) {
  const id = identity(moduleId, kind);
  return registry.get(componentKey(id.moduleId, id.kind))
    || fallbacks.get(id.kind)
    || null;
}

/** 异步读取 owner 资源、目录或缓存；render 本身继续保持纯同步字符串函数。 */
async function prepareModuleComponent(moduleId, kind, props = {}) {
  const id = identity(moduleId, kind);
  const definition = moduleComponentDefinition(id.moduleId, id.kind);
  if (!definition) throw new TypeError(`模块没有登记 ${id.kind} 组件：${id.moduleId}`);
  if (!definition.prepare) return props;
  const prepared = await definition.prepare({
    ...props,
    moduleId: id.moduleId,
    componentKind: id.kind,
  });
  return prepared === undefined ? props : prepared;
}

/** owner 渲染根节点时带上这两个属性，通用水合器才能按模块把行为送回 owner。 */
function moduleComponentAttributes(moduleId, kind) {
  const id = identity(moduleId, kind);
  return `data-module-component-module="${esc(id.moduleId)}" `
    + `data-module-component-kind="${esc(id.kind)}"`;
}

/** 消费页唯一需要调用的渲染入口。具体 HTML 仍由 owner 的 render 决定。 */
function renderModuleComponent(moduleId, kind, props = {}) {
  const id = identity(moduleId, kind);
  const definition = moduleComponentDefinition(id.moduleId, id.kind);
  if (!definition) {
    throw new TypeError(`模块没有登记 ${id.kind} 组件：${id.moduleId}`);
  }
  return definition.render({
    ...props,
    moduleId: id.moduleId,
    componentKind: id.kind,
    componentAttributes: moduleComponentAttributes(id.moduleId, id.kind),
  });
}

function componentHosts(root) {
  if (!root) return [];
  const selector = "[data-module-component-module][data-module-component-kind]";
  return [
    ...(root.matches?.(selector) ? [root] : []),
    ...(root.querySelectorAll?.(selector) || []),
  ].filter(host => {
    const menu = host.closest(".module-reference-picker-menu");
    const picker = menu?.closest("[data-save-item-picker]");
    return !picker || Boolean(menu.closest("details.module-reference-picker")?.open);
  });
}

async function hydrateHost(host) {
  if (host.dataset.moduleComponentHydrated === "1") return;
  const pending = hydrationByHost.get(host);
  if (pending) return pending;
  const {moduleComponentModule: moduleId, moduleComponentKind: kind} = host.dataset;
  const id = identity(moduleId, kind);
  const key = componentKey(id.moduleId, id.kind);
  const definition = moduleComponentDefinition(id.moduleId, id.kind);
  if (!definition) throw new TypeError(`页面使用了未登记的模块组件：${key}`);
  let resolveHydration;
  let rejectHydration;
  const hydration = new Promise((resolve, reject) => {
    resolveHydration = resolve;
    rejectHydration = reject;
  });
  // 先公布进行中的任务，再调用 owner hook。这样重入会复用同一个 Promise，
  // 而场景过滤/键盘绑定这类同步工作仍在 DOM 交给用户前立即完成。
  hydrationByHost.set(host, hydration);
  void (async () => {
    try {
      if (definition.hydrate) await definition.hydrate(host, {
        moduleId: id.moduleId,
        componentKind: id.kind,
      });
      host.dataset.moduleComponentHydrated = "1";
      resolveHydration();
    } catch (error) {
      rejectHydration(error);
    } finally {
      hydrationByHost.delete(host);
    }
  })();
  return hydration;
}

/**
 * 页面只调一次统一水合；首次渲染与局部刷新即使重叠，也会复用同一宿主正在进行的
 * Promise。模块 hook 只拿到自己的宿主，不会越过边界扫描或重复绑定相邻组件。
 */
async function hydrateModuleComponents(root = document) {
  await Promise.all(componentHosts(root).map(hydrateHost));
}

/** Original 恢复或共享字段联动后，让各 owner 从原生控件重新同步自己的组件。 */
function syncModuleComponents(root = document) {
  const groups = new Map();
  for (const host of componentHosts(root)) {
    const {moduleComponentModule: moduleId, moduleComponentKind: kind} = host.dataset;
    const id = identity(moduleId, kind);
    const key = componentKey(id.moduleId, id.kind);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(host);
  }
  for (const [key] of groups) {
    const [moduleId, ...kindParts] = key.split(":");
    const kind = kindParts.join(":");
    const definition = moduleComponentDefinition(moduleId, kind);
    if (!definition) throw new TypeError(`页面使用了未登记的模块组件：${key}`);
    definition.sync?.(root);
  }
}

/** 只供目录页与薄合同枚举能力；页面不能靠这个结果猜字段或保存方式。 */

// @editor-module 已发布物品目录的分组选择器。


const HUMAN_EQUIPMENT_CATEGORIES = Object.freeze([
  "human-head", "human-body", "human-feet", "human-protector", "human-hands", "human-weapon",
]);
const TANK_EQUIPMENT_CATEGORIES = Object.freeze([
  "tank-main-gun", "tank-special", "tank-sub-gun", "tank-c-unit", "tank-engine", "tank-chassis",
]);
const HUMAN_CATEGORIES = Object.freeze([...HUMAN_EQUIPMENT_CATEGORIES, "human-item"]);
const ITEM_CATEGORIES = Object.freeze([
  ...HUMAN_CATEGORIES, ...TANK_EQUIPMENT_CATEGORIES, "tank-item",
]);
const lazyPickers = new Map();
let lazyPickerId = 0;

function itemPickerEntries({records, shells, allowedCategories, emptyValue, emptyLabel,
  extraChoices, valueForRecord}) {
  const allowed = allowedCategories === null ? null : new Set(allowedCategories);
  const entries = [];
  if (emptyValue !== null) entries.push({value: String(emptyValue), empty: emptyValue === '',
    label: emptyLabel,
    group: "empty", groupLabel: "空", meta: "", filter: emptyLabel});
  for (const record of records) {
    const id = Number(record.id);
    if (id === 0 || allowed && !allowed.has(record.category?.id)) continue;
    const hex = `0x${id.toString(16).toUpperCase().padStart(2, "0")}`;
    const category = record.category;
    const name = String(record.name || hex);
    const previewOwner = category?.owner === "tank" ? "tank-item" : "human-item";
    entries.push({
      value: String(valueForRecord ? valueForRecord(record) : id),
      label: `${hex} · ${name}`,
      group: String(category?.id || "unpublished"),
      groupLabel: String(category?.name || "—"),
      meta: hex,
      preview: moduleComponentDefinition(previewOwner, "preview")
        ? renderModuleComponent(previewOwner, "preview", {entry: record}) : "",
      filter: `${id} ${hex} ${name} ${category?.name || ""}`.toLowerCase(),
    });
  }
  if (!allowed || allowed.has("shell")) for (const shell of shells) {
    const id = Number(shell.id);
    const hex = `0x${id.toString(16).toUpperCase().padStart(2, "0")}`;
    entries.push({value: String(id), label: `${hex} · ${shell.name || hex}`,
      group: "shell", groupLabel: "炮弹", meta: hex,
      preview: '<span class="item-category-glyph" aria-hidden="true">弹</span>',
      filter: `${id} ${hex} ${shell.name || ""} 炮弹`.toLowerCase()});
  }
  return entries.concat(extraChoices);
}

function itemPickerMarkup({records = [], value = 0, label = "物品", fieldId = "", disabled = false,
  arrayIndex = null, compact = false, allowedCategories = null, shells = [],
  emptyValue = 0, emptyLabel = "空"} = {}) {
  return itemPickerFieldMarkup({records, shells, value, label, disabled, compact,
    allowedCategories, emptyValue, emptyLabel, lazy: true,
    componentAttributes: `data-save-item-picker="${esc(fieldId)}"`,
    controlMarkup: `<input type="hidden" value="${esc(value)}"${disabled ? " disabled" : ""}
      ${Number.isInteger(arrayIndex)
        ? `data-save-page-array-field="${esc(fieldId)}" data-save-page-array-index="${arrayIndex}"`
        : `data-save-page-field="${esc(fieldId)}"`}>`,
  });
}

function itemPickerFieldMarkup({records = [], value = 0, label = "物品", disabled = false,
  compact = true, allowedCategories = null, shells = [], emptyValue = 0, emptyLabel = "空",
  extraChoices = [], valueForRecord = null, componentAttributes = "", controlMarkup = "",
  lazy = true, picker = {}} = {}) {
  const presentation = {previewPanel: picker.previewPanel !== false,
    className: picker.previewPanel ? 'reference-detail-field' : '', pageSize: picker.pageSize || 24};
  const config = {records, shells, value, label, disabled, compact,
    allowedCategories, emptyValue, emptyLabel, extraChoices, valueForRecord, presentation};
  const key = lazy && !disabled ? String(++lazyPickerId) : "";
  if (key) lazyPickers.set(key, config);
  const selected = lazy ? records.filter(record => String(valueForRecord
    ? valueForRecord(record) : record.id) === String(value)) : records;
  const selectedShells = lazy ? shells.filter(record => Number(record.id) === Number(value)) : shells;
  const selectedExtras = lazy ? extraChoices.filter(choice => String(choice.value) === String(value)) : extraChoices;
  return referencePickerMarkup({
    moduleId: allowedCategories?.length === 1 && allowedCategories[0] === "shell"
      ? "shell-record" : "item-entry",
    value,
    label,
    items: itemPickerEntries({...config, records: selected, shells: selectedShells,
      extraChoices: selectedExtras}),
    grouped: true,
    disabled,
    compact,
    ...presentation,
    filterLabel: "搜索物品",
    filterPlaceholder: "名称、编号或类别",
    componentAttributes: `${componentAttributes} data-item-picker${key
      ? ` data-item-picker-lazy="${key}"` : ""}`, controlMarkup,
  });
}

function hydrateItemPickers(root = document) {
  root.querySelectorAll("[data-item-picker]").forEach(picker => {
    const key = picker.dataset.itemPickerLazy;
    if (key) {
      const config = lazyPickers.get(key);
      const details = picker.querySelector('details.module-reference-picker');
      if (!config || !details) return;
      lazyPickers.delete(key);
      delete picker.dataset.itemPickerLazy;
      const control = picker.querySelector(
        '[data-module-reference-value-control] input, [data-module-reference-value-control] select');
      if (control) {
        const sync = () => {
          if (!details.isConnected || picker.dataset.moduleReferenceValue === control.value) return;
          const records = config.records.filter(record => String(config.valueForRecord
            ? config.valueForRecord(record) : record.id) === control.value);
          const shells = config.shells.filter(record => String(record.id) === control.value);
          const extraChoices = config.extraChoices.filter(choice =>
            String(choice.value) === control.value);
          const markup = referencePickerMarkup({moduleId: "item-entry",
            value: control.value, label: config.label,
            items: itemPickerEntries({...config, records, shells, extraChoices}),
            compact: config.compact, ...config.presentation});
          const template = document.createElement('template');
          template.innerHTML = markup;
          details.querySelector('summary').innerHTML =
            template.content.querySelector('summary').innerHTML;
          picker.dataset.moduleReferenceValue = control.value;
          void hydrateModuleComponents(details);
        };
        control.addEventListener('input', sync);
        bindReferenceControlProjection(control, sync);
      }
      details.addEventListener('toggle', () => {
        if (!details.open) return;
        const full = referencePickerMarkup({moduleId: config.allowedCategories?.length === 1
          && config.allowedCategories[0] === "shell" ? "shell-record" : "item-entry",
          value: picker.dataset.moduleReferenceValue ?? config.value,
          label: config.label,
          items: itemPickerEntries(config), grouped: true, compact: config.compact,
          ...config.presentation, filterLabel: "搜索物品",
          filterPlaceholder: "名称、编号或类别"});
        const template = document.createElement('template');
        template.innerHTML = full;
        const expanded = template.content.querySelector('details.module-reference-picker');
        details.replaceWith(expanded);
        bindReferencePicker(picker, {paint: hydrateModuleComponents});
        expanded.open = true;
        void hydrateModuleComponents(expanded);
      }, {once: true});
      return;
    }
    bindReferencePicker(picker, {paint: hydrateModuleComponents});
    const menu = picker.querySelector("details.module-reference-picker");
    if (!menu || menu.dataset.itemPreviewBound === "1") return;
    menu.dataset.itemPreviewBound = "1";
    menu.addEventListener("toggle", () => {
      if (menu.open) void hydrateModuleComponents(menu);
    });
  });
}

// @editor-module 表字段与 owner 引用选择器之间的通用装配层
//
// 字段声明提供候选表与键；字段对象可登记当前显示名、预览与必要的准备步骤。


const MODULE_ID = /^[a-z0-9][a-z0-9._-]*$/u;
const presentations = new Map();

function valueAtPath(value, path = []) {
  let current = value;
  for (const segment of path) {
    if (current === null || typeof current !== "object"
        || !Object.hasOwn(current, segment)) return undefined;
    current = current[segment];
  }
  return current;
}

function genericPreview(reference, row, label, meta) {
  const configured = reference?.preview?.path
    ? valueAtPath(row, reference.preview.path) : "";
  const text = String(configured ?? "");
  const glyph = (text || label || "?").trim().slice(0, 2) || "?";
  return `<span class="module-reference-data-preview" aria-hidden="true">
    <b>${esc(glyph)}</b>${meta ? `<small>${esc(meta)}</small>` : ""}
  </span>`;
}

function genericItem(row, reference, index) {
  if (!row || typeof row !== "object") {
    throw new TypeError(`引用候选表第 ${index + 1} 行不是对象`);
  }
  const rawValue = valueAtPath(row, reference.key);
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    throw new TypeError(`引用候选表第 ${index + 1} 行缺少声明的键`);
  }
  const value = String(rawValue);
  const rawLabel = valueAtPath(row, reference.name);
  const label = String(rawLabel ?? value);
  const description = reference.description
    ? String(valueAtPath(row, reference.description) ?? "") : "";
  const meta = reference.meta
    ? String(valueAtPath(row, reference.meta) ?? "") : value;
  return {
    value,
    rawValue,
    label,
    description,
    meta,
    preview: genericPreview(reference, row, label, meta),
    filter: [value, label, description, meta].filter(Boolean).join(" ").toLowerCase(),
  };
}

function requireModuleId(moduleId) {
  const value = String(moduleId || "");
  if (!MODULE_ID.test(value)) {
    throw new TypeError(`引用呈现模块 ID 无效：${value || "（空）"}`);
  }
  return value;
}

/** owner 登记候选行怎样成为 picker item；字段机制仍只看静态声明。 */
function registerReferenceFieldPresentation(moduleId, definition) {
  const id = requireModuleId(moduleId);
  if (!definition || typeof definition !== "object"
      || typeof definition.item !== "function") {
    throw new TypeError(`${id}: 引用呈现必须提供 item`);
  }
  if (definition.paint !== undefined && typeof definition.paint !== "function") {
    throw new TypeError(`${id}: 引用呈现 paint 必须是函数`);
  }
  for (const key of ["prepare", "currentLabel"]) {
    if (definition[key] !== undefined && typeof definition[key] !== "function") {
      throw new TypeError(`${id}: 引用呈现 ${key} 必须是函数`);
    }
  }
  if (presentations.has(id)) throw new TypeError(`引用呈现重复登记：${id}`);
  presentations.set(id, Object.freeze({...definition}));
}

function presentationFor(moduleId) {
  return presentations.get(requireModuleId(moduleId)) || null;
}

async function prepareReferenceFieldPresentation(moduleId) {
  await presentationFor(moduleId)?.prepare?.();
}

function referenceFieldCurrentLabel(moduleId, row, fallback) {
  return presentationFor(moduleId)?.currentLabel?.(row) ?? fallback;
}

function presentedItem(row, reference, index, moduleId) {
  const presentation = presentationFor(moduleId);
  const itemFactory = presentation?.item || genericItem;
  const declared = genericItem(row, reference, index);
  const item = itemFactory(row, reference, index);
  if (!item) return item;
  const resolved = !presentation || !Array.isArray(reference?.name) ? item : {
    ...item,
    label: referenceFieldCurrentLabel(moduleId, row, declared.label),
    filter: [item.filter, declared.filter].filter(Boolean).join(" ").toLowerCase(),
  };
  return {...resolved, rawValue: declared.rawValue};
}

function declaredKeyPickerItem(item, reference) {
  if (!item || !Array.isArray(reference?.key)) return item;
  const value = String(item.rawValue);
  // owner 自己直接生成 picker 时可以自定 value；字段声明一旦给出 key，候选身份与
  // 原生控件写回值都必须服从这个键。只读 owner 预览仍可展示 owner 的句柄身份。
  return {...item, value, controlValue: value};
}

function multiTargetItem(row, reference, index, moduleId) {
  const {targets: _targets, ...sharedReference} = reference;
  const targetReference = {...sharedReference, module: moduleId};
  const item = presentedItem(row, targetReference, index, moduleId);
  if (!item) {
    throw new TypeError(`引用候选表第 ${index + 1} 行不属于发布归属模块 ${moduleId}`);
  }
  return {
    ...item,
    description: [moduleId, item.description].filter(Boolean).join(" · "),
    filter: [item.filter, moduleId].filter(Boolean).join(" ").toLowerCase(),
  };
}

function candidateUnionItem(row, reference, index) {
  const moduleId = requireModuleId(reference?.module);
  const item = presentedItem(row, reference, index, moduleId);
  if (!item) {
    throw new TypeError(`引用候选表第 ${index + 1} 行不能呈现为 ${moduleId}`);
  }
  return {
    ...item,
    description: [moduleId, item.description].filter(Boolean).join(" · "),
    filter: [item.filter, moduleId].filter(Boolean).join(" ").toLowerCase(),
  };
}

function declaredSentinelItems(reference, items) {
  const nullable = reference?.nullable;
  const sentinels = reference?.sentinels || [];
  if (nullable === undefined && !sentinels.length) return items;
  const candidateValues = new Set();
  const candidates = items.map((item, index) => {
    if (!new Set(["number", "string"]).has(typeof item.rawValue)
        || (typeof item.rawValue === "number" && !Number.isFinite(item.rawValue))) {
      throw new TypeError(`带哨兵引用候选 ${index + 1} 的原始键不是数字或字符串`);
    }
    const pickerValue = String(item.rawValue);
    candidateValues.add(pickerValue);
    return {
      ...item,
      controlValue: nullable === undefined
        ? pickerValue : JSON.stringify(item.rawValue),
    };
  });
  const exactSentinels = sentinels.map(sentinel => {
    const pickerValue = String(sentinel.value);
    if (candidateValues.has(pickerValue)) {
      throw new TypeError(`声明哨兵 ${pickerValue} 与目标候选键冲突`);
    }
    return {
      value: pickerValue,
      controlValue: nullable === undefined
        ? pickerValue : JSON.stringify(sentinel.value),
      label: sentinel.label,
      description: sentinel.description || "明确的非引用保留值",
      meta: sentinel.meta ?? pickerValue,
      preview: '<span class="module-reference-data-preview" aria-hidden="true"><b>—</b></span>',
      filter: [pickerValue, sentinel.label, sentinel.description, sentinel.meta]
        .filter(Boolean).join(" ").toLowerCase(),
    };
  });
  const nullSentinel = nullable === undefined ? [] : [{
    value: "",
    controlValue: "null",
    empty: true,
    label: nullable.label,
    description: nullable.description || "明确的空引用哨兵",
    meta: nullable.meta || "null",
    preview: '<span class="module-reference-data-preview" aria-hidden="true"><b>∅</b></span>',
    filter: ["null", nullable.label, nullable.description]
      .filter(Boolean).join(" ").toLowerCase(),
  }];
  return [...nullSentinel, ...exactSentinels, ...candidates];
}

/**
 * 把一张已经按静态声明取出的目标表装进统一 picker。场景等 owner 可以登记像素
 * 呈现；没有专有呈现的表仍使用声明的 name/description/meta/preview.path。
 */
function referenceFieldPickerMarkup({
  reference,
  rows = [],
  rowModules = [],
  rowReferences = [],
  candidatePresentation = "owner",
  candidateControlValue = null,
  value = null,
  label = "引用",
  controlMarkup = "",
  componentAttributes = "",
  error = "",
  unavailableKind = "",
  pending = false,
  picker = {},
} = {}) {
  if (!Array.isArray(rows)) throw new TypeError("引用候选不是数组");
  if (!["owner", "declared"].includes(candidatePresentation)) {
    throw new TypeError(`引用候选呈现方式无效：${String(candidatePresentation)}`);
  }
  if (candidateControlValue !== null && typeof candidateControlValue !== "function") {
    throw new TypeError("引用候选 control value 转换器必须是函数");
  }
  const multiTarget = reference?.targets !== undefined;
  const candidateUnion = reference?.container?.kind === "candidate-union";
  const crossTarget = multiTarget || candidateUnion;
  if (crossTarget && candidatePresentation !== "owner") {
    throw new TypeError("跨目标引用不能绕过逐 owner 候选呈现");
  }
  const targetModules = candidateUnion
    ? reference.container.domains.map(domain => requireModuleId(domain.reference?.module))
    : multiTarget
    ? reference.targets.domains.map(domain => requireModuleId(domain.module))
    : [requireModuleId(reference?.module)];
  if (multiTarget && (!Array.isArray(rowModules) || rowModules.length !== rows.length)) {
    throw new TypeError("多目标引用候选必须逐行携带发布归属模块");
  }
  if (candidateUnion && (!Array.isArray(rowReferences)
      || rowReferences.length !== rows.length)) {
    throw new TypeError("跨表引用候选必须逐行携带静态 owner 表声明");
  }
  const moduleId = crossTarget ? "multi-target" : targetModules[0];
  const presentation = crossTarget || candidatePresentation === "declared"
    ? null : presentationFor(moduleId);
  const targetItems = rows.map((row, index) => {
    let item;
    if (candidateUnion) {
      const rowReference = rowReferences[index];
      item = declaredKeyPickerItem(
        candidateUnionItem(row, rowReference, index),
        rowReference,
      );
    } else {
      item = declaredKeyPickerItem(multiTarget
        ? multiTargetItem(row, reference, index, requireModuleId(rowModules[index]))
        : candidatePresentation === "declared"
          ? genericItem(row, reference, index)
          : presentedItem(row, reference, index, moduleId), reference);
    }
    if (!item || candidateControlValue === null) return item;
    return {
      ...item,
      controlValue: String(candidateControlValue(item.rawValue, row, index)),
    };
  }).filter(Boolean);
  const items = declaredSentinelItems(reference, targetItems).map(item => ({...item,
    ...(picker.compact && picker.previewPanel ? {label: item.compactLabel || item.label} : {}),
    ...(picker.identityOnly ? {currentLabel: item.value} : {}),
  }));
  const selectedValue = String(value ?? "");
  const current = items.find(item => String(item.value) === selectedValue) || {
    value: selectedValue || "—",
    label: selectedValue || "未选择",
    description: selectedValue ? "目标表中没有这个键" : "尚未选择引用",
    meta: "",
    preview: "",
  };
  let unavailableReason = String(error || "");
  let unavailableState = String(unavailableKind || "");
  if (!pending && !unavailableReason && !targetItems.length) {
    unavailableReason = "候选表已读取且路径匹配，但 owner 呈现后的引用值域为空";
    unavailableState = "empty-domain";
  }
  return referencePickerMarkup({
    ...picker,
    moduleId,
    value: selectedValue,
    label,
    items,
    current,
    controlMarkup,
    componentAttributes: [
      componentAttributes,
      crossTarget ? `data-module-reference-targets="${esc(targetModules.join(","))}"` : "",
      candidatePresentation === "declared"
        ? 'data-module-reference-candidate-presentation="declared"' : "",
    ].filter(Boolean).join(" "),
    className: [
      "module-table-reference-field",
      picker.previewPanel ? 'reference-detail-field' : '',
      presentation?.className,
      ...(crossTarget ? [...new Set(targetModules.map(target =>
        presentationFor(target)?.className).filter(Boolean))] : []),
    ]
      .filter(Boolean).join(" "),
    filterLabel: presentation?.filterLabel || "过滤候选",
    filterPlaceholder: presentation?.filterPlaceholder || "按键、名称或说明过滤",
    unavailableReason: pending ? "正在读取声明的候选表" : unavailableReason,
    unavailableKind: pending ? "loading" : unavailableState,
    busy: pending,
  });
}

/** 给字段表或 owner 自己生成的 picker 装上同一套交互与惰性预览。 */
function hydrateReferenceFieldPickers(root = document, {paint = undefined} = {}) {
  const selector = "[data-module-reference-picker]";
  const pickers = [
    ...(root?.matches?.(selector) ? [root] : []),
    ...(root?.querySelectorAll?.(selector) || []),
  ];
  pickers.forEach(picker => {
    const declaredCandidates = picker.dataset.moduleReferenceCandidatePresentation === "declared";
    const presentation = declaredCandidates
      ? null : presentationFor(picker.dataset.moduleReferenceModule);
    let pickerPaint = paint;
    if (pickerPaint === undefined) {
      const targetModules = String(picker.dataset.moduleReferenceTargets || "")
        .split(",").filter(Boolean);
      const painters = [...new Set(targetModules.map(moduleId =>
        presentationFor(moduleId)?.paint).filter(candidate => typeof candidate === "function"))];
      pickerPaint = painters.length
        ? async target => {
          for (const painter of painters) await painter(target);
        }
        : presentation?.paint || null;
    }
    bindReferencePicker(picker, {
      paint: pickerPaint,
    });
  });
}

// @editor-module CHR 上下文共用的图块选择与矩阵控件。
//
// 消费页只交入 context reference 与 tile reference，并接回同形状引用。候选枚举、
// context 切换、像素解析和 selector 编码全留在 owner 边界内。


const ELEMENT_NAME = "attack-chr-tile-selector";
const configurations = new WeakMap();
const GRAYS = Object.freeze([
  [24, 28, 31, 255],
  [104, 114, 120, 255],
  [184, 194, 198, 255],
  [248, 250, 250, 255],
]);


function dialogOpen(dialog) {
  return Boolean(dialog?.open || dialog?.hasAttribute?.("open"));
}

function showDialog(dialog) {
  if (!dialog || dialogOpen(dialog)) return;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function closeDialog(dialog) {
  if (!dialog || !dialogOpen(dialog)) return;
  if (typeof dialog.close === "function") dialog.close();
  else {
    dialog.removeAttribute("open");
    dialog.dispatchEvent(new Event("close"));
  }
}

function paintPixels(canvas, resolved) {
  const context = canvas?.getContext?.("2d");
  if (!context) return;
  canvas.width = 8;
  canvas.height = 8;
  context.imageSmoothingEnabled = false;
  const image = context.createImageData(8, 8);
  const palette = Array.isArray(resolved.palette) && resolved.palette.length === 4
    ? resolved.palette : null;
  for (let index = 0; index < 64; index += 1) {
    const pixel = Number(resolved.pixels[index]) & 3;
    const color = resolved.transparent || (!resolved.opaque && palette && pixel === 0) ? [0, 0, 0, 0]
      : palette ? [...nesPalette[palette[pixel] & 0x3f], 255] : GRAYS[pixel];
    image.data.set(color, index * 4);
  }
  context.putImageData(image, 0, 0);
  canvas.dataset.attackChrTilePainted = "1";
  canvas.classList.toggle("transparent", Boolean(resolved.transparent));
}

function currentContext(config) {
  return config.contexts[config.contextIndex] || null;
}

function paintMatrix(element) {
  const config = configurations.get(element);
  const context = currentContext(config);
  if (!config || !context) return;
  element.querySelectorAll("canvas[data-attack-chr-matrix-tile]").forEach(canvas => {
    const index = Number(canvas.dataset.attackChrMatrixTile);
    try {
      paintPixels(
        canvas,
        config.adapter.pixels(context, config.references[index]),
      );
      delete canvas.dataset.attackChrTileError;
    } catch (error) {
      canvas.dataset.attackChrTileError = String(error?.message || error);
    }
  });
}

function matrixMarkup(config) {
  return `<div class="attack-chr-tile-matrix" data-attack-chr-tile-matrix
      style="display:grid;grid-template-columns:repeat(${config.columns},minmax(30px,42px));gap:5px">
    ${config.references.map((_, index) => `<button type="button"
      class="attack-chr-tile-cell" data-attack-chr-tile-cell="${index}"
      aria-label="编辑画面格 ${index + 1}" ${config.disabled ? "disabled" : ""}
      style="padding:3px;aspect-ratio:1;min-width:0">
        <canvas data-attack-chr-matrix-tile="${index}" width="8" height="8"
          style="width:100%;height:100%;image-rendering:pixelated"></canvas>
      </button>`).join("")}
  </div>`;
}

function render(element) {
  const config = configurations.get(element);
  if (!config) {
    element.innerHTML = "";
    return;
  }
  element.dataset.attackChrTileCount = String(config.references.length);
  element.dataset.attackChrContextCount = String(config.contexts.length);
  element.dataset.attackChrColumns = String(config.columns);
  element.dataset.attackChrRows = String(config.rows);
  element.innerHTML = `<div class="attack-chr-tile-selector-toolbar"
      style="display:flex;gap:8px;align-items:end;flex-wrap:wrap">
    ${config.contexts.length > 1 ? `<label>像素上下文
      <select data-attack-chr-context ${config.disabled ? "disabled" : ""}>${
        config.contexts.map((_, index) => `<option value="${index}" ${
          index === config.contextIndex ? "selected" : ""
        }>${esc(config.contextLabels?.[index] ?? `实机画面 ${index + 1}`)}</option>`).join("")
      }</select></label>` : ""}
    <small data-attack-chr-selector-status></small>
  </div>
  ${matrixMarkup(config)}
  <dialog class="animated-resource-dialog" data-attack-chr-tile-dialog>
    <form class="animated-resource-toolbar" method="dialog">
      <b>选择当前上下文中的图块</b>
      <input type="search" data-attack-chr-filter aria-label="搜索图块" placeholder="搜索图块编号">
      <button class="button ghost" type="submit" value="cancel">关闭</button>
    </form>
    <nav class="module-reference-picker-groups" data-attack-chr-groups aria-label="图块分组"></nav>
    <div data-attack-chr-tile-candidates role="listbox"
      style="display:grid;grid-template-columns:repeat(auto-fill,minmax(34px,1fr));gap:3px;
        max-height:min(70vh,620px);overflow:auto;padding:8px"></div>
  </dialog>`;
  bind(element);
  paintMatrix(element);
}

function renderCandidates(element) {
  const config = configurations.get(element);
  const host = element.querySelector("[data-attack-chr-tile-candidates]");
  const context = currentContext(config);
  if (!config || !host || !context) return;
  const contextKey = config.adapter.key(context);
  if (host.dataset.attackChrContextKey === contextKey && host.childElementCount) return;
  host.replaceChildren();
  host.dataset.attackChrContextKey = contextKey;
  const candidates = config.adapter.candidates(context);
  const selected = config.references[config.selectedIndex];
  const groups = element.querySelector("[data-attack-chr-groups]");
  groups.replaceChildren();
  const all = document.createElement("button");
  all.type = "button";
  all.dataset.attackChrGroup = "";
  all.textContent = "全部";
  groups.append(all);
  for (let first = 0; first < candidates.length; first += 16) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.attackChrGroup = String(first / 16);
    button.textContent = `${first}–${Math.min(first + 15, candidates.length - 1)}`;
    groups.append(button);
  }
  groups.hidden = candidates.length <= 16;
  candidates.forEach((candidate, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "attack-chr-tile-candidate";
    button.dataset.attackChrTileToken = config.adapter.token(candidate.reference);
    button.dataset.attackChrTileIndex = String(index);
    button.setAttribute("role", "option");
    button.setAttribute(
      "aria-selected",
      String(config.adapter.equal(candidate.reference, selected)),
    );
    button.setAttribute("aria-label", `图块候选 ${config.adapter.token(candidate.reference)}`);
    button.style.cssText = "padding:2px;width:34px;height:34px";
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "width:100%;height:100%;image-rendering:pixelated";
    paintPixels(canvas, candidate);
    button.append(canvas);
    host.append(button);
  });
  element.dataset.attackChrCandidateCount = String(candidates.length);
  config.showPreview = bindPickerPreview(host, {selector: '[data-attack-chr-tile-token]',
    selected: () => host.querySelector(`[data-attack-chr-tile-token="${CSS.escape(config.adapter.token(config.references[config.selectedIndex]))}"]`),
    onConfirm: button => selectCandidate(element, button.dataset.attackChrTileToken), render: button => {
    const preview = document.createElement('div');
    const label = document.createElement('b');
    label.textContent = button.getAttribute('aria-label');
    const canvas = document.createElement('canvas');
    paintPixels(canvas, candidates[Number(button.dataset.attackChrTileIndex)]);
    preview.append(label, canvas);
    return preview;
  }, initial: host.querySelector('[aria-selected="true"]') || host.firstChild});
}

function filterCandidates(element) {
  const query = element.querySelector("[data-attack-chr-filter]")?.value.trim().toLowerCase() || "";
  const group = element.dataset.attackChrGroup || "";
  element.querySelectorAll("[data-attack-chr-tile-token]").forEach(button => {
    button.hidden = Boolean((group && String(Math.floor(Number(button.dataset.attackChrTileIndex) / 16)) !== group)
      || (query && !`${button.dataset.attackChrTileIndex} ${button.dataset.attackChrTileToken}`.toLowerCase().includes(query)));
  });
  const options = [...element.querySelectorAll('[data-attack-chr-tile-token]')].filter(button => !button.hidden);
  void configurations.get(element).showPreview?.(options.find(button => button.getAttribute('aria-selected') === 'true')
    || options[0]);
}

function openForCell(element, index) {
  const config = configurations.get(element);
  if (!config || config.disabled || !Number.isInteger(index)
      || index < 0 || index >= config.references.length) return;
  config.selectedIndex = index;
  const status = element.querySelector("[data-attack-chr-selector-status]");
  if (status) status.textContent = `正在编辑画面格 ${index + 1}`;
  renderCandidates(element);
  markPickerSelection(element.querySelectorAll('[data-attack-chr-tile-token]'),
    config.adapter.token(config.references[index]), button => button.dataset.attackChrTileToken);
  element.dataset.attackChrGroup = "";
  const filter = element.querySelector("[data-attack-chr-filter]");
  if (filter) filter.value = "";
  filterCandidates(element);
  showDialog(element.querySelector("[data-attack-chr-tile-dialog]"));
}

function selectCandidate(element, token) {
  const config = configurations.get(element);
  if (!config || config.disabled) return;
  const candidate = config.adapter.candidates(currentContext(config))
    .find(item => config.adapter.token(item.reference) === token);
  if (!candidate) throw new TypeError("所选 tile 不在 shared-chr-bank owner 候选中");
  config.references[config.selectedIndex] = config.adapter.clone(candidate.reference);
  closeDialog(element.querySelector("[data-attack-chr-tile-dialog]"));
  render(element);
  element.dispatchEvent(new CustomEvent("change", {
    bubbles: true,
    detail: {references: config.references.map(config.adapter.clone)},
  }));
}

function bind(element) {
  element.querySelector("[data-attack-chr-filter]")?.addEventListener("input", () => filterCandidates(element));
  element.querySelector("[data-attack-chr-groups]")?.addEventListener("click", event => {
    const button = event.target.closest("[data-attack-chr-group]");
    if (!button) return;
    element.dataset.attackChrGroup = button.dataset.attackChrGroup;
    filterCandidates(element);
  });
  element.querySelector("[data-attack-chr-tile-dialog]")?.addEventListener("click", event => {
    if (event.target === event.currentTarget) closeDialog(event.currentTarget);
  });
  element.querySelector("[data-attack-chr-context]")?.addEventListener(
    "change",
    event => {
      const config = configurations.get(element);
      const index = Number(event.target.value);
      if (!config || !Number.isInteger(index) || !config.contexts[index]) return;
      config.contextIndex = index;
      paintMatrix(element);
      const candidates = element.querySelector("[data-attack-chr-tile-candidates]");
      if (candidates) candidates.replaceChildren();
    },
  );
  element.querySelector("[data-attack-chr-tile-matrix]")?.addEventListener(
    "click",
    event => {
      const cell = event.target.closest?.("[data-attack-chr-tile-cell]");
      if (cell) openForCell(element, Number(cell.dataset.attackChrTileCell));
    },
  );
}

const HTMLElementBase = globalThis.HTMLElement || class {};

class AttackChrTileSelector extends HTMLElementBase {
  connectedCallback() {
    render(this);
  }

  get references() {
    const config = configurations.get(this);
    return config ? config.references.map(config.adapter.clone) : [];
  }
}

if (globalThis.customElements && globalThis.HTMLElement
    && !globalThis.customElements.get(ELEMENT_NAME)) {
  globalThis.customElements.define(ELEMENT_NAME, AttackChrTileSelector);
}


/**
 * 通用入口只接收 owner 给出的不透明引用及操作；选择器本身不解释 context 或 tile。
 * 攻击专页继续走上面的旧包装，因此它的 DOM 合同和 owner 边界均保持不变。
 */
function configureChrContextTileSelector(element, {
  contexts,
  references,
  columns,
  rows,
  adapter,
  contextLabels = null,
  contextIndex = 0,
  disabled = false,
} = {}) {
  if (!element?.matches?.(ELEMENT_NAME)) {
    throw new TypeError(`${ELEMENT_NAME} element is required`);
  }
  const width = Number(columns);
  const height = Number(rows);
  const requiredOperations = ["clone", "key", "equal", "token", "candidates", "pixels"];
  if (!adapter || requiredOperations.some(name => typeof adapter[name] !== "function")
      || !Number.isInteger(width) || width < 1 || width > 8
      || !Number.isInteger(height) || height < 1 || height > 8
      || !Array.isArray(references) || references.length !== width * height
      || !Array.isArray(contexts) || !contexts.length) {
    throw new TypeError("CHR tile 矩阵的形状、不透明引用或 owner 操作无效");
  }
  if (!Number.isInteger(contextIndex) || contextIndex < 0 || contextIndex >= contexts.length) {
    throw new TypeError("CHR tile 矩阵的上下文序号无效");
  }
  if (contextLabels !== null && (!Array.isArray(contextLabels)
      || contextLabels.length !== contexts.length
      || contextLabels.some(label => typeof label !== "string" || !label))) {
    throw new TypeError("CHR tile 矩阵的上下文标签必须与上下文一一对应");
  }
  contexts.forEach(context => adapter.pixels(context, references[0]));
  references.forEach(reference => adapter.pixels(contexts[0], reference));
  configurations.set(element, {
    contexts: contexts.map(adapter.clone),
    contextLabels: contextLabels === null ? null : [...contextLabels],
    references: references.map(adapter.clone),
    columns: width,
    rows: height,
    contextIndex,
    selectedIndex: 0,
    disabled: Boolean(disabled),
    adapter: Object.freeze({...adapter}),
  });
  render(element);
  return element;
}

/** 换掉当前值的引用而保留所选上下文：字段值在别处改变时只重画这一格。 */
function setChrContextTileReferences(element, references) {
  const config = configurations.get(element);
  if (!config) throw new TypeError("CHR tile 矩阵尚未配置");
  if (!Array.isArray(references) || references.length !== config.references.length) {
    throw new TypeError("CHR tile 矩阵的引用数与其形状不符");
  }
  const next = references.map(config.adapter.clone);
  next.forEach(reference => config.adapter.pixels(config.contexts[config.contextIndex], reference));
  next.forEach((reference, index) => {config.references[index] = reference;});
  render(element);
  return element;
}

// @editor-module 地形行为处理器的电梯分派语义。
// 依据：project/evidence/reverse-engineering/scene-elevator-dynamic-list/observations.json。
function fieldElevatorSceneRanges(document) {
  const values = name => document?.blocks?.find(block =>
    block.id === `field-terrain-behavior-service.elevator-scene-${name}`)?.values;
  const lower = values('lower'), upper = values('upper');
  if (lower?.length !== 5 || upper?.length !== 5) throw new TypeError('电梯场景范围表未发布');
  return lower.map((value, instance) => [value, upper[instance]]);
}

function fieldElevatorInstance(sceneId, behaviorCode, document) {
  if (behaviorCode !== 0x11) return null;
  const instance = fieldElevatorSceneRanges(document).findIndex(([lower, upper]) =>
    sceneId >= lower && sceneId < upper);
  return instance < 0 ? null : instance;
}

function sceneHasElevatorDispatch(sceneId, document) {
  return fieldElevatorInstance(sceneId, 0x11, document) !== null;
}

// PRG $029034、$0290AA..$02911E 的移动前地形分派。
function fieldTerrainMotion(document, behaviorCode, animationStep) {
  const blocks = document?.blocks || document?.document?.blocks || [];
  const whitelist = blocks.find(block => block.id === "field-terrain-behavior-service.whitelist-b065")?.values || [];
  if (!whitelist.slice(0, whitelist.indexOf(0)).includes(behaviorCode)) return null;
  if (behaviorCode >= 1 && behaviorCode <= 4) {
    return {directionCode: behaviorCode, speedIndex: 2, transported: true};
  }
  if (behaviorCode < 6 || behaviorCode > 10 || !animationStep) return null;
  const directions = blocks.find(block => block.id === "field-terrain-behavior-service.conveyor-directions")?.values;
  const index = 2 * (animationStep + 1) + behaviorCode - 8;
  const directionCode = directions?.[index];
  return directionCode >= 1 && directionCode <= 4
    ? {directionCode, speedIndex: 0, transported: true} : null;
}

// @editor-module 按已发布的加载配方投影运行地图与源地图格。

function sceneRuntimeMetatileOverlays(scene, logic, {visibleLayers = null, resolveMetatileId = null} = {}) {
  return Object.entries(logic?.layers || {}).flatMap(([layerName, records]) => {
    if (!Array.isArray(records) || visibleLayers?.[layerName] === false) return [];
    return records.flatMap(record => {
      const overlay = record?.runtime_metatile_overlay;
      const x = Number(record.x), y = Number(record.y);
      if (!overlay || !Number.isInteger(x) || !Number.isInteger(y)
        || x < 0 || y < 0 || x >= scene.width || y >= scene.height) return [];
      const metatileId = Number(resolveMetatileId ? resolveMetatileId({layerName, record, overlay})
        : overlay.uncollected_metatile_id ?? overlay.metatile_id);
      return Number.isInteger(metatileId) ? [{x, y, metatileId}] : [];
    });
  });
}

function sceneInteractionTileChanges(scene, actor, documents, currentTiles = []) {
  if (!scene || Number(scene.id) === 0) return [];
  const replacement = scene.header_extension?.[4];
  if (!Number.isInteger(replacement)) return [];
  const attributes = sceneMetatileAttributeRecords(scene, documents).flatMap(record =>
    record.metatile_attributes || record.metatile_attribute_page || []);
  const deltaY = {up: -1, down: 1, left: 0, right: 0}[actor.direction] ?? 0;
  const x = Math.round(actor.x), y = Math.round(actor.y);
  const result = [];
  const apply = column => {
    for (const row of new Set([y + deltaY, y + deltaY * 2])) {
      if (sceneMapCell(scene, column, row)) {
        result.push({sceneId: Number(scene.id), x: column, y: row, tileId: replacement});
      }
    }
  };
  const interactive = column => {
    const row = y + deltaY;
    const override = [...currentTiles, ...result].findLast(tile =>
      Number(tile.sceneId) === Number(scene.id) && tile.x === column && tile.y === row);
    const id = override?.tileId ?? sceneMapCell(scene, column, row)?.metatileId;
    const behavior = Number(attributes[id]) & 0x7c;
    return behavior === 0x3c || behavior === 0x68;
  };
  // PRG $035F42..$035FB5 改写纵向两格，并优先检查右侧相邻门体。
  apply(x);
  if (interactive(x + 1)) apply(x + 1);
  else if (interactive(x - 1)) apply(x - 1);
  return result;
}

function sceneMapCell(scene, x, y) {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0
      || x >= scene.width || y >= scene.height) return null;
  const recipe = scene.runtime_map;
  if (!recipe) return {metatileId: scene.map[y]?.[x], sourceX: x, sourceY: y};
  const sourceY = y % recipe.block_height;
  const source = sourceY < recipe.source_height;
  const override = (y < recipe.block_height ? recipe.first_cells : recipe.repeated_cells)
    .find(cell => cell.x === x && cell.y === sourceY);
  return {metatileId: override?.metatile_id ?? (source ? scene.map[sourceY][x] : recipe.fill_metatile),
    sourceX: source ? x : null, sourceY: source ? sourceY : null};
}

function sceneRuntimeMetatileId(scene, x, y, readCell = (x, y) => sceneMapCell(scene, x, y)?.metatileId) {
  const cell = readCell(x, y);
  if (Number(scene.id) !== 0 || cell !== 2) return cell;
  // PRG $07DDC7..$07DE75 按原始邻格与坐标奇偶选择世界地图 $02 的显示图块。
  if (readCell((x - 1) & 0xff, y) !== 2) return 0x0a;
  if (readCell((x + 1) & 0xff, y) !== 2) return 0x0b;
  return ((x + y) & 1) ? 2 : 3;
}

function sceneRuntimeMap(scene) {
  if (!scene.runtime_map) return scene.map;
  return Array.from({length: scene.height}, (_, y) =>
    Array.from({length: scene.width}, (_, x) => sceneMapCell(scene, x, y).metatileId));
}

// @editor-module 从场景与元图块当前值投影电梯触发格。

async function loadElevatorMetatiles(database) {
  const [pages, sets, terrain] = await Promise.all([
    database.getResourceDocument("metatile-page", null),
    database.getResourceDocument("metatile-set", null),
    database.getResourceDocument("field-terrain-behavior-service", null),
  ]);
  return {pages, sets, terrain};
}

function sceneElevatorPoints(scene, metatiles) {
  if (!scene || !metatiles || !sceneHasElevatorDispatch(Number(scene.id), metatiles.terrain)) return [];
  if (!elevatorBehaviorEnabled(metatiles.terrain)) return [];
  const attributes = sceneMetatileAttributeRecords(scene, metatiles).flatMap(record =>
    record.metatile_attributes || record.metatile_attribute_page || []);
  return (sceneRuntimeMap(scene) || []).flatMap((row, y) => row.flatMap((tile, x) => {
    const attribute = attributes[tile];
    if (!Number.isInteger(attribute)) return [];
    const instanceId = fieldElevatorInstance(Number(scene.id), metatileBehaviorCode(attribute), metatiles.terrain);
    if (instanceId === null) return [];
    const id = y * scene.width + x;
    return [{id, x, y, instance_id: instanceId,
      configuration_handle: `application-config-instance:0F:${String(instanceId).padStart(2, "0")}`,
      map_handle: `scene:${Number(scene.id).toString(16).toUpperCase().padStart(2, "0")}:map:${sceneMapCell(scene, x, y).sourceY.toString(16).toUpperCase().padStart(2, "0")}`}];
  }));
}

async function loadSceneElevators(database, scenes) {
  const metatiles = await loadElevatorMetatiles(database);
  const groups = await Promise.all(scenes.filter(scene => sceneHasElevatorDispatch(Number(scene.id), metatiles.terrain))
    .map(async scene => {
      const handle = `scene:${Number(scene.id).toString(16).toUpperCase().padStart(2, "0")}`;
      const document = await database.getResourceDocument(handle, null);
      if (!document?.scene) throw new TypeError(`${handle} 缺少场景正文`);
      return sceneElevatorPoints(document?.scene, metatiles)
        .map(elevator => ({scene, elevator, selection: `elevator:${elevator.id}`}));
    }));
  return groups.flat();
}

function sceneElevatorDestinations(elevator, values, facilities, scenes) {
  return [...values].reverse().map((value, selection) => {
    const sceneId = uiFacilityElevatorDestinationScene(facilities, elevator.instance_id, selection);
    const scene = scenes.editable_scenes.find(row => Number(row.id) === sceneId);
    const x = elevator.x, y = (elevator.y + 1) & 255;
    return {value, selection, sceneId, scene, x, y,
      href: scene ? `?${new URLSearchParams({view: 'scenes', scene: scene.slug,
        sceneMode: 'logic', scenePoint: `${x},${y}`})}` : null};
  });
}

function elevatorBehaviorEnabled(terrain) {
  const values = terrain?.blocks?.find(block =>
    block.id === "field-terrain-behavior-service.whitelist-b075")?.values;
  if (!values) throw new TypeError("地形行为白名单正文不完整");
  const terminator = values.indexOf(0);
  return values.slice(0, terminator < 0 ? values.length : terminator).includes(0x11);
}

// @editor-module 角色单帧四象限的纯计算，供渲染与导入共用。
const ACTOR_MOTION_SINGLE = "single-frame";
const ACTOR_MOTION_DIRECTIONLESS = "directionless-sequence";
const ACTOR_MOTION_DIRECTIONAL = "directional-4x2";
const ACTOR_MOTION_DIRECTIONAL_TAIL = "directional-4x2-tail";

// PRG $02636A 减 4，$026474 的两组纵偏移为 1/9 与 2/10，OAM 显示行再加 1。
function actorFrameScreenOffsetY(frame, {descriptors}) {
  const id = integer$2(frame, "角色帧", 0, ACTOR_FRAME_COUNT - 1);
  return -2 + (descriptors[id] >>> 7);
}

function integer$2(value, label, minimum, maximum) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < minimum || result > maximum) {
    throw new TypeError(`${label} 超出 ${minimum}..${maximum}：${value}`);
  }
  return result;
}


function actorTiles(
  frame, {descriptors, tileA, tileB, deltas}, oamAttributes = 0,
) {
  const id = integer$2(frame, "角色帧", 0, ACTOR_FRAME_COUNT - 1);
  const attributes = integer$2(oamAttributes, "角色 OAM 属性", 0, 0xff);
  const descriptor = descriptors[id];
  const selector = descriptor & 0x07;
  const signed = value => (value > 0x7f ? value - 0x100 : value);
  const deltaA = signed(deltas[selector]);
  const deltaB = signed(deltas[8 + selector]);
  const values = [
    tileA[id],
    (tileA[id] + deltaA) & 0xff,
    tileB[id],
    (tileB[id] + deltaB) & 0xff,
  ];
  const globalHflip = Boolean(attributes & 0x40);
  const globalVflip = Boolean(attributes & 0x80);
  return values.map((tile, quadrant) => ({
    tile,
    x: (quadrant & 1) ^ Number(globalHflip),
    y: (quadrant >> 1) ^ Number(globalVflip),
    hflip: Boolean(descriptor & (1 << (quadrant + 3))) !== globalHflip,
    vflip: globalVflip,
    // 低两位选择身体，其上两位选择头部；调色板随图块一起翻转。
    palette: (attributes >> (quadrant < 2 ? 2 : 0)) & 0x03,
  }));
}

// @editor-module 场景角色形象与运动的共享浏览器渲染器
//
// `actor-visual.motions` 是场景、剧情舞台和角色页唯一的取帧权威。角色类型只引用
// motion_id 并附带 OAM 属性；消费端不得再从帧号连续性猜测“六帧动画”。运动明确分为：
// 单帧、无方向序列，以及四方向 × 两步（左右共用侧面帧，右向水平翻转）。
//
// 像素来自 `shared-chr-bank`。角色的三张帧表、tile delta、OAM 属性和调色板均由
// `actor-visual` 当前 working 正文提供，保存任一正文都会通过 identity 缓存自然失效。


const ACTOR_ENTRY_TYPE_SELECTOR = "type-selector";
const ACTOR_ENTRY_SCENE_OBJECT = "scene-object";
const ACTOR_MOTION_KINDS = new Set([
  ACTOR_MOTION_SINGLE,
  ACTOR_MOTION_DIRECTIONLESS,
  ACTOR_MOTION_DIRECTIONAL,
  ACTOR_MOTION_DIRECTIONAL_TAIL,
]);
const DIRECTION_IDS = Object.freeze(["up", "down", "left", "right"]);
const PREVIEW_DIRECTION_IDS = Object.freeze([
  "down",
  ...DIRECTION_IDS.filter(id => id !== "down"),
]);

const recipeCaches = new WeakMap();
const atlasCaches = new WeakMap();
const catalogCaches = new WeakMap();
const canvasPaints = new WeakMap();
let atlasInputRequest = null;

function atlasInputs() {
  const documents = ['shared-chr-bank', 'actor-visual', 'project.visuals']
    .map(schema => db.peekDocument(schema, null));
  if (documents.every(Boolean)) return Promise.resolve(documents);
  if ((documents[0] || documents[1]) && atlasInputRequest
      && documents.every((value, index) => value === atlasInputRequest.documents[index]))
    return atlasInputRequest.promise;
  const request = {documents, promise: Promise.all([
    db.getDocument('shared-chr-bank', null), db.getDocument('actor-visual', null),
    db.getDocument('project.visuals', null),
  ])};
  atlasInputRequest = request;
  const clear = () => {if (atlasInputRequest === request) atlasInputRequest = null;};
  request.promise.then(clear, clear);
  return request.promise;
}

function integer$1(value, label, minimum, maximum) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < minimum || result > maximum) {
    throw new TypeError(`${label} 超出 ${minimum}..${maximum}：${value}`);
  }
  return result;
}

function modulo(value, divisor) {
  return ((Number(value) % divisor) + divisor) % divisor;
}

/**
 * 一帧四个象限的 tile、落点和最终翻转。
 *
 * descriptor 的四个水平翻转位先作用在各象限；角色类型 OAM 的 $40/$80 是整张
 * 16×16 形象的水平/垂直翻转，因此既重排象限，也切换每个 8×8 tile 的翻转。
 */

function directionalSelector(document_) {
  const source = document_?.directional_selector;
  if (!source || typeof source !== "object") {
    throw new TypeError("actor-visual 缺少 directional_selector");
  }
  const steps = integer$1(
    source.steps_per_direction,
    "directional_selector.steps_per_direction",
    1,
    8,
  );
  if (steps !== 2) {
    throw new TypeError("directional-4x2 必须每方向两帧");
  }
  const directions = new Map();
  for (const [index, raw] of (source.directions || []).entries()) {
    const id = String(raw?.id || "");
    if (!DIRECTION_IDS.includes(id) || directions.has(id)) {
      throw new TypeError(`方向选择器 ${index} 的 id 无效：${id}`);
    }
    if (!Array.isArray(raw.frame_indexes) || raw.frame_indexes.length !== steps) {
      throw new TypeError(`方向 ${id} 必须引用 ${steps} 个帧索引`);
    }
    directions.set(id, {
      id,
      frameIndexes: raw.frame_indexes.map((value, frameIndex) => integer$1(
        value,
        `方向 ${id} 帧索引 ${frameIndex}`,
        0,
        5,
      )),
      oamAttributeOr: integer$1(
        raw.oam_attribute_or,
        `方向 ${id} OAM 属性`,
        0,
        0xff,
      ),
    });
  }
  if (DIRECTION_IDS.some(id => !directions.has(id))) {
    throw new TypeError("directional_selector 必须包含上、下、左、右");
  }
  return {stepsPerDirection: steps, directions};
}

function motionRecords(document_) {
  if (!Array.isArray(document_?.motions) || !document_.motions.length) {
    throw new TypeError("actor-visual 缺少 motions");
  }
  const motions = new Map();
  for (const [index, raw] of document_.motions.entries()) {
    const id = String(raw?.id || "");
    const resourceId = String(raw?.resource_id || "");
    const kind = String(raw?.kind || "");
    if (!id || motions.has(id)) {
      throw new TypeError(`角色运动 ${index} 的 id 无效或重复：${id}`);
    }
    if (resourceId !== `actor-motion:${id}`) {
      throw new TypeError(`角色运动 ${id} 缺少有效资源 ID`);
    }
    if (!ACTOR_MOTION_KINDS.has(kind)) {
      throw new TypeError(`角色运动 ${id} 的类型无效：${kind}`);
    }
    const readFrames = () => {
      if (!Array.isArray(raw.frame_ids)) {
        throw new TypeError(`角色运动 ${id} 缺少 frame_ids`);
      }
      const frames = raw.frame_ids.map((value, frameIndex) => integer$1(
        value,
        `角色运动 ${id} 帧 ${frameIndex}`,
        0,
        ACTOR_FRAME_COUNT - 1,
      ));
      const expected = kind === ACTOR_MOTION_SINGLE ? 1
        : kind === ACTOR_MOTION_DIRECTIONAL ? 6 : null;
      if ((expected !== null && frames.length !== expected)
          || (kind === ACTOR_MOTION_DIRECTIONAL_TAIL && frames.length !== 3)
          || (kind === ACTOR_MOTION_DIRECTIONLESS
            && (frames.length < 2 || frames.length > 6))) {
        throw new TypeError(`角色运动 ${id} 的帧数与 ${kind} 不符`);
      }
      if (frames.some((frame, frameIndex) => frame !== frames[0] + frameIndex)) {
        throw new TypeError(`角色运动 ${id} 的选择帧必须连续`);
      }
      return frames;
    };
    let projectedFrames;
    motions.set(id, {
      id,
      resourceId,
      kind,
      label: String(raw.label || id),
      get frames() {return projectedFrames ||= readFrames();},
    });
  }
  return motions;
}

function buildRecipe(document_) {
  const frames = document_?.frames;
  if (!Array.isArray(frames) || frames.length !== ACTOR_FRAME_COUNT) {
    throw new TypeError(`actor-visual.frames 必须有 ${ACTOR_FRAME_COUNT} 条`);
  }
  const descriptors = new Array(ACTOR_FRAME_COUNT);
  const tileA = new Array(ACTOR_FRAME_COUNT);
  const tileB = new Array(ACTOR_FRAME_COUNT);
  const seenFrames = new Set();
  for (const frame of frames) {
    const id = integer$1(frame?.id, "角色帧 id", 0, ACTOR_FRAME_COUNT - 1);
    if (seenFrames.has(id)) throw new TypeError(`角色帧 id 重复：${id}`);
    seenFrames.add(id);
    for (const [target, name] of [[descriptors, "descriptor"], [tileA, "tile_a"], [tileB, "tile_b"]]) {
      let value;
      Object.defineProperty(target, id, {enumerable: true,
        get: () => value ??= integer$1(frame[name], `角色帧 ${id} ${name}`, 0, 0xff)});
    }
  }

  const deltas = byteRecords(document_.tile_deltas, "tile_deltas");
  if (deltas.length !== 16) throw new TypeError("tile_deltas 必须是 16 字节");
  const palettes = [];
  for (const record of document_.field_sprite_palettes || []) {
    const id = integer$1(record?.id, "场景精灵调色板 id", 0, 3);
    if (!Array.isArray(record.colors) || record.colors.length !== 4) {
      throw new TypeError(`场景精灵调色板 ${id} 必须是 4 色`);
    }
    palettes[id] = record.colors.map((value, index) => integer$1(
      value, `场景精灵调色板 ${id} 色 ${index}`, 0, 0x3f,
    ));
  }
  if (palettes.length !== 4 || palettes.some(item => !item)) {
    throw new TypeError("actor-visual 必须发布四组场景精灵调色板");
  }

  const selector = directionalSelector(document_);
  const motions = motionRecords(document_);
  const actorTypes = new Map();
  for (const [index, raw] of (document_.actor_types || []).entries()) {
    const id = integer$1(raw?.id, `角色类型 ${index} id`, 0, 0x3e);
    const resourceId = String(raw?.resource_id || "");
    const motionId = String(raw?.motion_id || "");
    if (actorTypes.has(id)) throw new TypeError(`角色类型 id 重复：${id}`);
    if (resourceId !== `actor-type:${id.toString(16).toUpperCase().padStart(2, "0")}`) {
      throw new TypeError(`角色类型 ${id} 缺少有效资源 ID`);
    }
    if (!motions.has(motionId)) {
      throw new TypeError(`角色类型 ${id} 引用了不存在的运动：${motionId}`);
    }
    const overrides = new Map();
    for (const [overrideIndex, override] of (raw.entry_overrides || []).entries()) {
      const entryPoint = String(override?.entry_point || "");
      const overrideMotion = String(override?.motion_id || "");
      if (!entryPoint || overrides.has(entryPoint) || !motions.has(overrideMotion)) {
        throw new TypeError(`角色类型 ${id} 的入口覆盖 ${overrideIndex} 无效`);
      }
      overrides.set(entryPoint, overrideMotion);
    }
    let oamAttributes;
    actorTypes.set(id, {
      id,
      resourceId,
      motionId,
      get oamAttributes() {return oamAttributes ??= integer$1(
        raw.oam_attributes,
        `角色类型 ${id} OAM 属性`,
        0,
        0xff,
      );},
      entryOverrides: overrides,
    });
  }
  if (actorTypes.size !== 63) {
    throw new TypeError("actor-visual 必须发布 63 个角色类型");
  }
  return {
    descriptors,
    tileA,
    tileB,
    deltas,
    palettes,
    selector,
    motions,
    actorTypes,
  };
}

async function actorRecipe() {
  const document_ = db.peekDocument('actor-visual', null) || await db.getDocument("actor-visual", null);
  if (!document_) throw new TypeError("actor-visual 配方正文不可用");
  return actorRecipeFromDocument(document_);
}

function actorRecipeFromDocument(document_) {
  let recipe = recipeCaches.get(document_);
  if (!recipe) {
    recipe = buildRecipe(document_);
    recipeCaches.set(document_, recipe);
  }
  return recipe;
}

function representativeFrameForMotion(motion, selector) {
  const frameIndex = [ACTOR_MOTION_DIRECTIONAL, ACTOR_MOTION_DIRECTIONAL_TAIL].includes(motion.kind)
    ? selector.directions.get("down").frameIndexes[0]
    : 0;
  return motion.frames[frameIndex];
}

function actorAppearanceFromRecipe(
  recipe, actorType, entryPoint = ACTOR_ENTRY_TYPE_SELECTOR,
) {
  const id = Number(actorType);
  const type = recipe.actorTypes.get(id);
  if (!type) throw new TypeError(`actor-visual 没有角色类型：${actorType}`);
  const motionId = type.entryOverrides.get(entryPoint) || type.motionId;
  const motion = recipe.motions.get(motionId);
  if (!motion) throw new TypeError(`角色类型 ${id} 的运动 ${motionId} 不存在`);
  return {
    id,
    resourceId: type.resourceId,
    motionId,
    motionResourceId: motion.resourceId,
    motionKind: motion.kind,
    motionLabel: motion.label,
    frames: [...motion.frames],
    screenOffsetsY: motion.frames.map(frame => actorFrameScreenOffsetY(frame, recipe)),
    representativeFrame: representativeFrameForMotion(motion, recipe.selector),
    entryPoint,
    oamAttributes: type.oamAttributes,
    palette: type.oamAttributes & 0x03,
    directionalSelector: recipe.selector,
  };
}

/** 按运动语义取某一时刻的实际帧与最终 OAM 翻转。 */
function actorPoseForAppearance(
  appearance,
  {direction = "down", step = 0, sequenceIndex = null} = {},
) {
  if (!appearance || !Array.isArray(appearance.frames)
      || !appearance.frames.length) {
    throw new TypeError("角色形象缺少运动帧");
  }
  let frameIndex = 0;
  let directionId = null;
  let directionAttributes = 0;
  const directional = [ACTOR_MOTION_DIRECTIONAL, ACTOR_MOTION_DIRECTIONAL_TAIL].includes(appearance.motionKind);
  if (directional) {
    const selector = appearance.directionalSelector;
    const entry = selector?.directions?.get(direction)
      || selector?.directions?.get("down");
    if (!entry) throw new TypeError("角色形象缺少四方向选择器");
    frameIndex = entry.frameIndexes[modulo(step, entry.frameIndexes.length)];
    if (frameIndex >= appearance.frames.length) {
      throw new TypeError(`角色运动 ${appearance.motionId} 的 ${direction} 第 ${modulo(step, 2)} 步超出帧表`);
    }
    directionId = entry.id;
    directionAttributes = entry.oamAttributeOr;
  } else if (appearance.motionKind === ACTOR_MOTION_DIRECTIONLESS) {
    frameIndex = modulo(sequenceIndex ?? step, appearance.frames.length);
  }
  const oamAttributes = appearance.oamAttributes | directionAttributes;
  return {
    frame: appearance.frames[frameIndex],
    frameIndex,
    screenOffsetY: appearance.screenOffsetsY?.[frameIndex] ?? 0,
    direction: directionId,
    step: directional
      ? modulo(step, 2) : frameIndex,
    oamAttributes,
    palette: oamAttributes & 0x03,
    horizontalFlip: Boolean(oamAttributes & 0x40),
    verticalFlip: Boolean(oamAttributes & 0x80),
  };
}

/** 生成完整语义预览：普通行走显示下/上/左/右各两帧。 */
function actorPreviewPoses(appearance) {
  if ([ACTOR_MOTION_DIRECTIONAL, ACTOR_MOTION_DIRECTIONAL_TAIL].includes(appearance.motionKind)) {
    return PREVIEW_DIRECTION_IDS.flatMap(direction => [0, 1].filter(step =>
      appearance.directionalSelector.directions.get(direction).frameIndexes[step] < appearance.frames.length).map(step => (
      actorPoseForAppearance(appearance, {direction, step})
    )));
  }
  return appearance.frames.map((_, sequenceIndex) => actorPoseForAppearance(
    appearance, {sequenceIndex},
  ));
}

/** 从一份 `actor-visual` 正文生成角色类型目录；浏览器合同也走这条纯函数。 */
function actorAppearanceCatalogFromDocument(
  document_, {entryPoint = ACTOR_ENTRY_TYPE_SELECTOR} = {},
) {
  const recipe = buildRecipe(document_);
  return [...recipe.actorTypes.keys()].sort((left, right) => left - right)
    .map(id => actorAppearanceFromRecipe(recipe, id, entryPoint));
}

/** 从同一正文生成去重后的运动目录，不把动画帧冒充成独立形象。 */
function actorMotionCatalogFromDocument(document_) {
  const recipe = buildRecipe(document_);
  return [...recipe.motions.values()].map(motion => {
    const primaryTypes = [...recipe.actorTypes.values()]
      .filter(type => type.motionId === motion.id)
      .map(type => type.id);
    const entryReferences = [...recipe.actorTypes.values()].flatMap(type => (
      [...type.entryOverrides.entries()]
        .filter(([, motionId]) => motionId === motion.id)
        .map(([entryPoint]) => ({actorType: type.id, entryPoint}))
    ));
    const appearanceVariants = [
      ...primaryTypes.map(actorType => ({
        actorType,
        entryPoint: ACTOR_ENTRY_TYPE_SELECTOR,
        appearance: actorAppearanceFromRecipe(
          recipe, actorType, ACTOR_ENTRY_TYPE_SELECTOR,
        ),
      })),
      ...entryReferences.map(reference => ({
        ...reference,
        appearance: actorAppearanceFromRecipe(
          recipe, reference.actorType, reference.entryPoint,
        ),
      })),
    ].map(variant => ({
      ...variant,
      poses: actorPreviewPoses(variant.appearance),
    }));
    const previewAppearance = appearanceVariants[0]?.appearance || {
      id: null,
      resourceId: null,
      motionId: motion.id,
      motionResourceId: motion.resourceId,
      motionKind: motion.kind,
      motionLabel: motion.label,
      frames: [...motion.frames],
      representativeFrame: representativeFrameForMotion(motion, recipe.selector),
      entryPoint: null,
      oamAttributes: 0,
      palette: 0,
      directionalSelector: recipe.selector,
    };
    return {
      id: motion.id,
      resourceId: motion.resourceId,
      kind: motion.kind,
      label: motion.label,
      frames: [...motion.frames],
      primaryActorTypes: primaryTypes,
      entryReferences,
      appearanceVariants,
      previewAppearance,
      previewPoses: appearanceVariants[0]?.poses
        || actorPreviewPoses(previewAppearance),
    };
  });
}

/** 读取当前 working 生效值，而不是提取期派生的剧情/场景投影。 */
async function actorAppearanceCatalog(
  {entryPoint = ACTOR_ENTRY_TYPE_SELECTOR} = {},
) {
  const recipe = await actorRecipe();
  let catalogs = catalogCaches.get(recipe);
  if (!catalogs) catalogCaches.set(recipe, catalogs = new Map());
  if (!catalogs.has(entryPoint)) catalogs.set(entryPoint,
    [...recipe.actorTypes.keys()].sort((left, right) => left - right)
      .map(id => actorAppearanceFromRecipe(recipe, id, entryPoint)));
  return catalogs.get(entryPoint);
}

/** 已准备好 actor-visual 时供逐帧舞台同步读取；未加载或类型无效则返回 null。 */
function peekActorAppearance(
  actorType, {entryPoint = ACTOR_ENTRY_TYPE_SELECTOR} = {},
) {
  const document_ = db.peekDocument("actor-visual", null);
  if (!document_) return null;
  let recipe = recipeCaches.get(document_);
  if (!recipe) {
    recipe = buildRecipe(document_);
    recipeCaches.set(document_, recipe);
  }
  try {
    return actorAppearanceFromRecipe(recipe, actorType, entryPoint);
  } catch {
    return null;
  }
}

/** 角色集 `pair` 的四页图案表 bank 顺序。 */
function actorSetBanks(pair, visuals = db.peekDocument('project.visuals', null)) {
  const id = integer$1(pair, "角色集 pair", 0, 0xff);
  const context = visuals?.actors?.sets?.find(row => Number(row.id) === id)
    || visuals?.metasprites?.contexts?.find(row => Number(row.pair) === id);
  const banks = context?.pattern_table?.banks;
  if (!Array.isArray(banks) || banks.length !== 4)
    throw new TypeError(`角色集 ${id} 缺少图案表上下文`);
  return banks.map((bank, index) => integer$1(bank, `角色集 ${id} 图案页 ${index}`, 0, 255));
}

/** 候选封面只取该类型的已发布消费上下文，未确认时返回 null。 */
function actorAppearanceThumbnail(appearance, visuals = db.peekDocument('project.visuals', null)) {
  const actors = visuals?.actors;
  const direct = actors?.special_assets.find(asset => asset.playback === 'single-frame-observed'
    && asset.context_pairs.length && asset.actor_type_ids.includes(appearance.id));
  const pose = actorPoseForAppearance(appearance, {direction: direct ? 'up' : 'down', step: 0});
  const entries = actors?.scene_actor_entries.filter(entry =>
    entry.records.some(record => record.actor_type === appearance.id));
  const sceneSets = actors?.sets.filter(set => set.scene_ids.some(sceneId =>
    entries.some(entry => entry.id === sceneId)));
  const vehicleSet = !sceneSets?.length && visuals.vehicle_selectors?.map_actor_types
    .some(record => record.actor_type === appearance.id)
    ? actors.sets.find(set => set.kind === 'world-map-runtime') : null;
  const pairs = [...new Set(sceneSets?.length ? sceneSets.map(set => set.id)
    : vehicleSet ? [vehicleSet.id]
    : [...entries.flatMap(entry => entry.context_pairs),
      ...actors.special_assets.filter(asset => asset.actor_type_ids.includes(appearance.id))
        .flatMap(asset => asset.context_pairs)])]
    .sort((left, right) => left - right);
  if (!pairs.length) return null;
  const set = actors.sets.find(item => item.id === pairs[0]);
  if (!set) throw new TypeError(`角色类型 ${appearance.id} 缺少角色图块集`);
  return {...pose, pair: set.id};
}

function normalizedPoses(frames, attributes = []) {
  return frames.map((frame, index) => ({
    frame: Number(frame),
    oamAttributes: attributes[index] === undefined ? null : Number(attributes[index]),
  }));
}

/**
 * 横向每个 pose 16 px；纵向各行选择身体调色板，头部按属性取色。
 * 传入 paletteId 时只画该行。
 * 单帧缩略图应使用单行模式，避免靠 CSS 位移整张 atlas 时露出相邻行。
 */
function actorAtlasImage(
  {tiles, recipe}, poses, scale = 4, paletteId = null,
) {
  const paletteIds = paletteId === null || paletteId === undefined
    ? [0, 1, 2, 3]
    : [integer$1(paletteId, "角色图集调色板", 0, 3)];
  const width = poses.length * 16 * scale;
  const height = paletteIds.length * 16 * scale;
  const raster = createRaster(width, height);
  paletteIds.forEach((sourcePaletteId, row) => {
    poses.forEach((pose, column) => {
      const attributes = pose.oamAttributes === null || pose.oamAttributes === undefined
        ? sourcePaletteId * 5 : (pose.oamAttributes & 0xfc) | sourcePaletteId;
      actorTiles(pose.frame, recipe, attributes)
        .forEach(({tile, x, y, hflip, vflip, palette}) => {
          paintChrTile(
            raster.data,
            width,
            (column * 16 + x * 8) * scale,
            (row * 16 + y * 8) * scale,
            tiles[tile],
            recipe.palettes[palette],
            {hflip, vflip, scale},
          );
        });
    });
  });
  return raster;
}

/** 取一个角色集的绘制输入（图案表已解开、配方已归一）。 */
async function actorSetSources(pair) {
  const [recipe, visuals] = await Promise.all([actorRecipe(),
    db.peekDocument('project.visuals', null) || db.getDocument('project.visuals')]);
  return actorSetSourcesFromRecipe(pair, recipe, visuals);
}

async function actorSetSourcesFromRecipe(pair, recipe, visuals) {
  const patternTable = await composeChrPatternTable(actorSetBanks(pair, visuals));
  return {recipe, tiles: decodeChrTiles(patternTable), patternTable};
}

/** 按角色类型引用或明确 pose 序列画图集。 */

/** 渲染后统一扫一遍 `[data-actor-atlas]` 并批量画。 */
async function paintActorAtlasCanvases(root = document) {
  const canvases = [...root.querySelectorAll("canvas[data-actor-atlas]")]
    .filter(canvas => canvas.dataset.actorAtlasPainted !== '1' && canvas.isConnected);
  if (!canvases.length) return;
  let chrDocument;
  let actorDocument;
  let visuals;
  try {
    [chrDocument, actorDocument, visuals] = await atlasInputs();
  } catch (error) {
    canvases.forEach(canvas => {
      canvas.dataset.actorAtlasError = String(error?.message || error);
    });
    return;
  }
  if (!chrDocument || typeof chrDocument !== "object"
      || !actorDocument || typeof actorDocument !== "object") {
    canvases.forEach(canvas => {
      canvas.dataset.actorAtlasError = "shared-chr-bank / actor-visual 正文不可用";
    });
    return;
  }
  let byPair = atlasCaches.get(chrDocument);
  if (!byPair || byPair.actorDocument !== actorDocument || byPair.visuals !== visuals) {
    byPair = {actorDocument, visuals, sources: new Map(), rasters: new Map()};
    atlasCaches.set(chrDocument, byPair);
  }
  await Promise.all(canvases.map(canvas => paintActorCanvas(canvas, byPair)));
}

async function paintActorCanvas(canvas, byPair) {
  if (canvas.dataset.actorAtlasPainted === '1' || !canvas.isConnected) return;
  const pending = canvasPaints.get(canvas);
  if (pending) return pending;
  const painting = (async () => {
    try {
      const pair = Number(canvas.dataset.actorAtlas);
      if (!byPair.sources.has(pair)) {
        const request = actorSetSourcesFromRecipe(pair,
          actorRecipeFromDocument(byPair.actorDocument), byPair.visuals);
        byPair.sources.set(pair, request);
        request.catch(() => {
          if (byPair.sources.get(pair) === request) byPair.sources.delete(pair);
        });
      }
      const sources = await byPair.sources.get(pair);
      if (!canvas.isConnected) return;
      let poses;
      if (canvas.dataset.actorAtlasType !== undefined) {
        const appearance = actorAppearanceFromRecipe(
          sources.recipe,
          Number(canvas.dataset.actorAtlasType),
          canvas.dataset.actorAtlasEntry || ACTOR_ENTRY_TYPE_SELECTOR,
        );
        poses = normalizedPoses(
          appearance.frames,
          appearance.frames.map(() => appearance.oamAttributes),
        );
      } else {
        const frames = String(canvas.dataset.actorAtlasFrames || "")
          .split(",").filter(Boolean).map(Number);
        const attributes = String(canvas.dataset.actorAtlasAttributes || "")
          .split(",").filter(Boolean).map(Number);
        poses = normalizedPoses(frames, attributes);
      }
      if (!poses.length) throw new TypeError("角色图集没有要绘制的 pose");
      const palette = canvas.dataset.actorAtlasPalette === undefined
        ? null : Number(canvas.dataset.actorAtlasPalette);
      const scale = Number(canvas.dataset.actorAtlasScale || 4);
      const key = JSON.stringify([pair, poses, scale, palette]);
      if (!byPair.rasters.has(key)) byPair.rasters.set(key,
        actorAtlasImage(sources, poses, scale, palette));
      blitRaster(canvas, byPair.rasters.get(key));
      canvas.dataset.actorAtlasPainted = "1";
      delete canvas.dataset.actorAtlasError;
    } catch (error) {
      canvas.dataset.actorAtlasError = String(error?.message || error);
    }
  })();
  canvasPaints.set(canvas, painting);
  try {await painting;}
  finally {if (canvasPaints.get(canvas) === painting) canvasPaints.delete(canvas);}
}

// 剧情舞台使用横向物理帧、纵向四组身体调色板的透明精灵表。运动类别和实际列索引由
// actorPoseForAppearance 选择；单帧与三帧序列不再被强行套进六列 CSS。
const spriteSheetUrlCaches = new WeakMap();

/** 把一条语义 actor-sprite-recipe 画成 data URL。 */
async function actorSpriteSheetUrl(recipe) {
  const pair = Number(recipe?.actor_set);
  if (!Number.isInteger(pair)) return null;
  const chrDocument = await db.getDocument("shared-chr-bank", null);
  const actorDocument = await db.getDocument("actor-visual", null);
  if (!chrDocument || !actorDocument) return null;
  let actorRecipeDocument = recipeCaches.get(actorDocument);
  if (!actorRecipeDocument) {
    actorRecipeDocument = buildRecipe(actorDocument);
    recipeCaches.set(actorDocument, actorRecipeDocument);
  }
  const actorType = Number(recipe?.actor_type);
  const entryPoint = String(recipe?.entry_point || ACTOR_ENTRY_TYPE_SELECTOR);
  const appearance = Number.isInteger(actorType)
    ? actorAppearanceFromRecipe(actorRecipeDocument, actorType, entryPoint)
    : null;
  const frames = appearance?.frames
    || (Array.isArray(recipe?.frames) ? recipe.frames.map(Number) : []);
  if (!frames.length) return null;
  const headPalette = appearance ? (appearance.oamAttributes >> 2) & 0x03 : null;
  let byActor = spriteSheetUrlCaches.get(chrDocument);
  if (!byActor || byActor.actorDocument !== actorDocument) {
    byActor = {actorDocument, urls: new Map(), sources: new Map()};
    spriteSheetUrlCaches.set(chrDocument, byActor);
  }
  const key = `${pair}:${frames.join(",")}:${headPalette ?? "row"}`;
  if (byActor.urls.has(key)) return byActor.urls.get(key);
  if (!byActor.sources.has(pair)) {
    byActor.sources.set(pair, await actorSetSources(pair));
  }
  const sources = byActor.sources.get(pair);
  const scale = 4;
  const width = frames.length * 16 * scale;
  const height = 4 * 16 * scale;
  const raster = createRaster(width, height, null);
  for (let paletteId = 0; paletteId < 4; paletteId += 1) {
    const attributes = ((headPalette ?? paletteId) << 2) | paletteId;
    frames.forEach((frame, column) => {
      actorTiles(frame, sources.recipe, attributes)
        .forEach(({tile, x, y, hflip, vflip, palette}) => {
          paintChrTile(
            raster.data,
            width,
            (column * 16 + x * 8) * scale,
            (paletteId * 16 + y * 8) * scale,
            sources.tiles[tile],
            sources.recipe.palettes[palette],
            {hflip, vflip, scale, background: null},
          );
        });
    });
  }
  const canvas = document.createElement("canvas");
  blitRaster(canvas, raster);
  const url = canvas.toDataURL("image/png");
  byActor.urls.set(key, url);
  return url;
}

/** 给消费方用的标记生成器。 */
function actorAtlasCanvas({
  pair,
  actorType = null,
  entryPoint = ACTOR_ENTRY_TYPE_SELECTOR,
  frames = null,
  attributes = null,
  scale = 4,
  palette = null,
  className = "",
  label = "",
  style = "",
} = {}) {
  const canvasAttributes = [
    `data-actor-atlas="${Number(pair)}"`,
    actorType !== null && actorType !== undefined
      ? `data-actor-atlas-type="${Number(actorType)}"` : "",
    entryPoint !== ACTOR_ENTRY_TYPE_SELECTOR
      ? `data-actor-atlas-entry="${entryPoint}"` : "",
    Array.isArray(frames) && frames.length
      ? `data-actor-atlas-frames="${frames.map(Number).join(",")}"` : "",
    Array.isArray(attributes) && attributes.length
      ? `data-actor-atlas-attributes="${attributes.map(Number).join(",")}"` : "",
    scale !== 4 ? `data-actor-atlas-scale="${Number(scale)}"` : "",
    palette !== null && palette !== undefined
      ? `data-actor-atlas-palette="${Number(palette)}"` : "",
    className ? `class="${className}"` : "",
    label ? `aria-label="${label}"` : "",
    style ? `style="${style}"` : "",
  ].filter(Boolean).join(" ");
  return `<canvas ${canvasAttributes}></canvas>`;
}

var actorAtlas = /*#__PURE__*/Object.freeze({
  __proto__: null,
  ACTOR_ENTRY_SCENE_OBJECT: ACTOR_ENTRY_SCENE_OBJECT,
  ACTOR_ENTRY_TYPE_SELECTOR: ACTOR_ENTRY_TYPE_SELECTOR,
  ACTOR_MOTION_DIRECTIONAL: ACTOR_MOTION_DIRECTIONAL,
  ACTOR_MOTION_DIRECTIONAL_TAIL: ACTOR_MOTION_DIRECTIONAL_TAIL,
  ACTOR_MOTION_DIRECTIONLESS: ACTOR_MOTION_DIRECTIONLESS,
  ACTOR_MOTION_SINGLE: ACTOR_MOTION_SINGLE,
  actorAppearanceCatalog: actorAppearanceCatalog,
  actorAppearanceCatalogFromDocument: actorAppearanceCatalogFromDocument,
  actorAppearanceThumbnail: actorAppearanceThumbnail,
  actorAtlasCanvas: actorAtlasCanvas,
  actorAtlasImage: actorAtlasImage,
  actorMotionCatalogFromDocument: actorMotionCatalogFromDocument,
  actorPoseForAppearance: actorPoseForAppearance,
  actorPreviewPoses: actorPreviewPoses,
  actorSetBanks: actorSetBanks,
  actorSetSources: actorSetSources,
  actorSpriteSheetUrl: actorSpriteSheetUrl,
  actorTiles: actorTiles,
  paintActorAtlasCanvases: paintActorAtlasCanvases,
  peekActorAppearance: peekActorAppearance
});

// @editor-module 场景渐显按 NES 色号的亮度减量绘制。

const colors = new Map(nesPalette.map((rgb, index) => [rgb.join(","), index]));
const sheets = new Map();

// PRG $07E0A8–$07E0C8 将 $30 归为 $20，亮度减量越界时取 $0F。
function fieldPaletteColor(color, decrement) {
  const source = color === 0x30 ? 0x20 : color;
  const brightness = ((source & 0xf0) - decrement) & 0xff;
  return brightness < 0x40 ? brightness | (color & 0x0f) : 0x0f;
}

function paintFieldPalette(context, decrement, flash = false) {
  if (!decrement && !flash) return;
  const image = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
  for (let index = 0; index < image.data.length; index += 4) {
    if (!image.data[index + 3]) continue;
    const rgb = Array.from(image.data.slice(index, index + 3)).join(",");
    const color = flash && rgb === nesPalette[0x0f].join(",") ? 0x0f : colors.get(rgb);
    if (color === undefined) continue;
    // PRG $07E1C8–$07E1E0 保留 $0F，其余色号取下一档灰阶并将 $40 归为 $30。
    const gray = color === 0x0f ? 0x0f : Math.min(0x30, (color & 0xf0) + 0x10);
    image.data.set(nesPalette[flash ? gray : fieldPaletteColor(color, decrement)], index);
  }
  context.putImageData(image, 0, 0);
}

async function fieldPaletteSheetUrl(source, decrement) {
  if (!decrement) return source;
  const key = `${decrement}:${source}`;
  if (!sheets.has(key)) sheets.set(key, (async () => {
    const image = new Image();
    image.src = source;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    paintFieldPalette(context, decrement);
    return canvas.toDataURL();
  })());
  return sheets.get(key);
}

// @editor-module 管理可丢弃的媒体预览缓存。
// 删除缓存后，媒体预览由当前字段对象重绘。
// 缓存不进入项目导出与构建输入。

const PREVIEW_CACHE_DATABASE_NAME = "metalmaxcn-preview-cache";
const PREVIEW_CACHE_DATABASE_VERSION = 3;
const PREVIEW_CACHE_STORE = "previews";
const PREVIEW_CACHE_MAX_BYTES = 32 * 1024 * 1024;
const PREVIEW_CACHE_MAX_ENTRIES = 512;

const INDEX_BY_PROJECT = "by_project";

function nonEmptyString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  return value;
}

function positiveInteger(value, label) {
  const result = Number(value);
  if (!Number.isInteger(result) || result <= 0) {
    throw new TypeError(`${label} must be a positive integer`);
  }
  return result;
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(
      request.error || new Error("preview cache IndexedDB request failed"),
    );
  });
}

function transactionCompletion(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(
      transaction.error || new Error("preview cache transaction aborted"),
    );
    transaction.onerror = () => {
      // transaction abort owns the rejection so the original IDB error wins.
    };
  });
}

async function transact(database, mode, callback) {
  const transaction = database.transaction(PREVIEW_CACHE_STORE, mode);
  const completion = transactionCompletion(transaction);
  try {
    const result = await callback(transaction.objectStore(PREVIEW_CACHE_STORE));
    await completion;
    return result;
  } catch (error) {
    try {
      transaction.abort();
    } catch (_abortError) {
      // The request may already have aborted the transaction.
    }
    try {
      await completion;
    } catch (_transactionError) {
      // Preserve the more specific callback/request error.
    }
    throw error;
  }
}

function openPreviewCacheDatabase({
  name = PREVIEW_CACHE_DATABASE_NAME,
  indexedDBFactory = globalThis.indexedDB,
} = {}) {
  if (!indexedDBFactory || typeof indexedDBFactory.open !== "function") {
    return Promise.reject(new Error("IndexedDB is unavailable for preview cache"));
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    const request = indexedDBFactory.open(name, PREVIEW_CACHE_DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (database.objectStoreNames.contains("package_json")) {
        database.deleteObjectStore("package_json");
      }
      if (!database.objectStoreNames.contains(PREVIEW_CACHE_STORE)) {
        const store = database.createObjectStore(PREVIEW_CACHE_STORE, {
          keyPath: ["project_id", "cache_key"],
        });
        store.createIndex(INDEX_BY_PROJECT, "project_id", {unique: false});
      }
    };
    request.onerror = () => {
      settled = true;
      reject(request.error || new Error("failed to open preview cache"));
    };
    request.onblocked = () => {
      settled = true;
      reject(new Error("preview cache upgrade is blocked by another tab"));
    };
    request.onsuccess = () => {
      if (settled) {
        request.result.close();
        return;
      }
      settled = true;
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
  });
}

function copyRecord(record) {
  if (!record) return null;
  const {data, ...metadata} = record;
  return {...metadata, data};
}

class IndexedDbPreviewCache {
  static async open(options = {}) {
    const database = await openPreviewCacheDatabase(options);
    return new IndexedDbPreviewCache(database);
  }

  constructor(database) {
    if (!database || typeof database.transaction !== "function") {
      throw new TypeError("preview cache requires an open IDBDatabase");
    }
    this.database = database;
  }

  close() {
    this.database.close();
  }

  async get(projectId, cacheKey) {
    const project = nonEmptyString(projectId, "projectId");
    const key = nonEmptyString(cacheKey, "cacheKey");
    return transact(this.database, "readwrite", async store => {
      const record = await requestResult(store.get([project, key]));
      if (!record) return null;
      record.last_accessed_at = Date.now();
      store.put(record);
      return copyRecord(record);
    });
  }

  async put(projectId, cacheKey, data, {
    width,
    height,
    mediaType = "image/png",
  } = {}) {
    const project = nonEmptyString(projectId, "projectId");
    const key = nonEmptyString(cacheKey, "cacheKey");
    if (!(data instanceof Blob)) {
      throw new TypeError("preview cache data must be a Blob");
    }
    const now = Date.now();
    const record = {
      schema: "metalmaxcn.derived-preview/v1",
      project_id: project,
      cache_key: key,
      media_type: data.type || mediaType,
      width: positiveInteger(width, "width"),
      height: positiveInteger(height, "height"),
      byte_length: data.size,
      created_at: now,
      last_accessed_at: now,
      data,
    };
    return transact(this.database, "readwrite", async store => {
      store.put(record);
      return copyRecord(record);
    });
  }

  async delete(projectId, cacheKey) {
    const project = nonEmptyString(projectId, "projectId");
    const key = nonEmptyString(cacheKey, "cacheKey");
    return transact(this.database, "readwrite", async store => {
      store.delete([project, key]);
    });
  }

  async deleteProject(projectId) {
    const project = nonEmptyString(projectId, "projectId");
    return transact(this.database, "readwrite", async store => {
      const index = store.index(INDEX_BY_PROJECT);
      const keys = await requestResult(index.getAllKeys(project));
      keys.forEach(key => store.delete(key));
      return keys.length;
    });
  }

  async stats(projectId) {
    const project = nonEmptyString(projectId, "projectId");
    return transact(this.database, "readonly", async store => {
      const records = await requestResult(store.index(INDEX_BY_PROJECT).getAll(project));
      return records.reduce((summary, record) => ({
        entries: summary.entries + 1,
        bytes: summary.bytes + Math.max(0, Number(record.byte_length) || 0),
        lastAccessedAt: Math.max(
          summary.lastAccessedAt,
          Number(record.last_accessed_at) || Number(record.created_at) || 0,
        ),
      }), {entries: 0, bytes: 0, lastAccessedAt: 0});
    });
  }

  async prune({
    maxBytes = PREVIEW_CACHE_MAX_BYTES,
    maxEntries = PREVIEW_CACHE_MAX_ENTRIES,
  } = {}) {
    const byteLimit = positiveInteger(maxBytes, "maxBytes");
    const entryLimit = positiveInteger(maxEntries, "maxEntries");
    return transact(this.database, "readwrite", async store => {
      const records = await requestResult(store.getAll());
      records.sort((left, right) =>
        Number(right.last_accessed_at || 0) - Number(left.last_accessed_at || 0)
        || Number(right.created_at || 0) - Number(left.created_at || 0));
      let keptEntries = 0;
      let keptBytes = 0;
      let deletedEntries = 0;
      for (const record of records) {
        const size = Math.max(0, Number(record.byte_length) || 0);
        const keep = keptEntries < entryLimit && keptBytes + size <= byteLimit;
        if (keep) {
          keptEntries += 1;
          keptBytes += size;
        } else {
          store.delete([record.project_id, record.cache_key]);
          deletedEntries += 1;
        }
      }
      return {keptEntries, keptBytes, deletedEntries};
    });
  }
}

let sharedCachePromise = null;

function announcePreviewCacheChange(projectId = null) {
  if (typeof globalThis.dispatchEvent !== "function"
      || typeof globalThis.CustomEvent !== "function") return;
  globalThis.dispatchEvent(new CustomEvent("mmeditor:preview-cache-change", {
    detail: {projectId},
  }));
}

async function sharedCache() {
  if (!sharedCachePromise) {
    sharedCachePromise = IndexedDbPreviewCache.open().then(async cache => {
      await cache.prune();
      return cache;
    }).catch(() => null);
  }
  return sharedCachePromise;
}

/** 缓存故障永远退化成 miss，不能让派生视图阻断编辑器。 */
async function getPreviewCacheEntry(projectId, cacheKey) {
  try {
    return await (await sharedCache())?.get(projectId, cacheKey) || null;
  } catch (_error) {
    return null;
  }
}

async function putPreviewCacheEntry(projectId, cacheKey, data, metadata) {
  try {
    const result = await (await sharedCache())?.put(projectId, cacheKey, data, metadata) || null;
    if (result) announcePreviewCacheChange(projectId);
    return result;
  } catch (_error) {
    return null;
  }
}

async function deletePreviewCacheEntry(projectId, cacheKey) {
  try {
    await (await sharedCache())?.delete(projectId, cacheKey);
    announcePreviewCacheChange(projectId);
  } catch (_error) {
    // A corrupt cache entry is still only a cache miss.
  }
}

async function deletePreviewCacheProject(projectId) {
  try {
    const deleted = await (await sharedCache())?.deleteProject(projectId) || 0;
    announcePreviewCacheChange(projectId);
    return deleted;
  } catch (_error) {
    return 0;
  }
}

async function previewCacheProjectStats(projectId) {
  try {
    return await (await sharedCache())?.stats(projectId) || {
      entries: 0,
      bytes: 0,
      lastAccessedAt: 0,
    };
  } catch (_error) {
    return null;
  }
}

async function prunePreviewCache(options) {
  try {
    const result = await (await sharedCache())?.prune(options) || null;
    if (result?.deletedEntries) announcePreviewCacheChange(null);
    return result;
  } catch (_error) {
    return null;
  }
}

// @editor-module 调色板运行时字段对象的场景 CHR 动画预览。

function fieldChrAnimationRecipe(document) {
  return document?.field_chr_animation || null;
}

function fieldChrAnimationDuration(recipe, scene) {
  if (Number(scene?.id) === 0) return Number(recipe?.world?.step_frames) || 0;
  if (!recipe || !sceneFieldChrAnimation(scene)) return 0;
  return Number(scene.id) === recipe.slow_scene_id
    ? recipe.slow_step_frames : recipe.step_frames;
}

function fieldChrAnimationMask(recipe, scene) {
  return Number(scene?.id) === 0 ? recipe.world.phase_mask : recipe.phase_mask;
}

function advanceFieldChrAnimation(animation, recipe, scene, step) {
  const duration = fieldChrAnimationDuration(recipe, scene);
  if (!duration) return;
  animation.timer += 1;
  if (animation.timer < duration) return;
  animation.timer = 0;
  animation.phase = (animation.phase + step) & fieldChrAnimationMask(recipe, scene);
}

const loopClocks = new WeakMap();

function fieldChrAnimationPlaybackPhase(compiled, frameIndex, rawFrame) {
  const snapshot = compiled.frames[frameIndex];
  if (!snapshot?.backgroundAnimationClock?.duration) return snapshot?.backgroundAnimationPhase;
  const start = compiled.loopStart;
  if (start == null || rawFrame < compiled.duration) return snapshot.backgroundAnimationPhase;
  let profile = loopClocks.get(compiled);
  if (!profile) {
    const cycle = compiled.frames.slice(start);
    const first = cycle.find(frame => frame.backgroundAnimationClock);
    const clock = {...(first?.backgroundAnimationVisibleClock || first?.backgroundAnimationClock)};
    const phases = [], seen = new Map();
    while (!seen.has(clock.timer)) {
      seen.set(clock.timer, phases.length);
      for (const frame of cycle) {
        phases.push(clock.phase);
        const tick = frame.backgroundAnimationVisibleClock || frame.backgroundAnimationClock;
        if (!tick?.duration) continue;
        clock.timer += 1;
        if (clock.timer < tick.duration) continue;
        clock.timer = 0;
        clock.phase = (clock.phase + tick.step) & tick.mask;
      }
    }
    const repeat = seen.get(clock.timer);
    profile = {phases, repeat, length: phases.length - repeat,
      delta: clock.phase - phases[repeat], mask: clock.mask};
    loopClocks.set(compiled, profile);
  }
  const offset = rawFrame - start;
  if (offset < profile.phases.length) return profile.phases[offset];
  const cycles = Math.floor((offset - profile.repeat) / profile.length);
  return (profile.phases[profile.repeat + (offset - profile.repeat) % profile.length]
    + cycles * profile.delta) & profile.mask;
}

function fieldChrAnimationBanks(scene, recipe, phase) {
  const banks = scene.render?.mmc3_banks;
  if (phase == null || !recipe || !sceneFieldChrAnimation(scene)) return banks;
  const result = [...banks];
  const firstBank = Number(scene.id) === recipe.first_bank_scene_id;
  result[firstBank ? 0 : 2] = recipe.banks[firstBank
    ? (phase & recipe.phase_mask) >> 1 : phase % recipe.banks.length];
  return result;
}

function worldChrAnimationBank(recipe, phase) {
  return phase == null || !recipe?.world ? null
    : recipe.world.banks[phase & recipe.world.phase_mask];
}

// @editor-module 场景视觉字段对象提供普通场景、世界地图及剧情引用的预览与可点选单元。
// Browser scene raster sources.  Everything here comes from semantic JSON:
// scene:* supplies metatiles/palette/bank selection and shared-chr-bank supplies
// the editable NES 2bpp planes.  No ROM baseline, build result, or package
// binary is a valid preview dependency.


const renderersByScene = new WeakMap();
const worldRenderersByScene = new WeakMap();

// 世界地图的四组地理 CHR 不是简单的四象限，边界来自渲染器 $AF50。
// 与 `mm_scene._world_zone` 必须逐格一致。
const WORLD_WIDTH = 256;
const WORLD_HEIGHT = 256;
const WORLD_ZONE_NAMES = Object.freeze(
  ["northwest", "northeast", "southwest", "southeast"]);
const SCENE_MAP_THUMBNAIL_CACHE_SCHEMA = "scene-map-thumbnail/v1";
const sceneThumbnailSourceDigests = new WeakMap();
const sceneThumbnailBankDigests = new WeakMap();

/** `mm_scene._world_zone` 的镜像：按 metatile 坐标选地理 CHR 组。 */
function worldZoneAt(x, y) {
  if (x < 0x80 && y < 0x91) return "northwest";
  if (y < 0x61) return "northeast";
  if (x < 0x60) return "southwest";
  return "southeast";
}

function integer(value, label, minimum, maximum) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < minimum || result > maximum) {
    throw new TypeError(`${label}: 必须是 ${minimum}..${maximum} 的整数`);
  }
  return result;
}

function sceneResourceId(sceneId) {
  const id = integer(sceneId, "scene_id", 0, 0xff);
  return `scene:${id.toString(16).toUpperCase().padStart(2, "0")}`;
}

async function sha256Text(value) {
  if (!globalThis.crypto?.subtle || typeof TextEncoder !== "function") return null;
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function sceneThumbnailSource(scene) {
  const render = scene?.render || {};
  return {
    id: Number(scene?.id),
    preview_only: Boolean(scene?.preview_only),
    width: Number(scene?.width),
    height: Number(scene?.height),
    map: scene?.map || null,
    metatile_definitions: scene?.metatile_definitions || null,
    metatile_palette_ids: scene?.metatile_palette_ids || null,
    render: {
      background_palette: render.background_palette || null,
      mmc3_banks: render.mmc3_banks || null,
      zones: render.zones || null,
    },
  };
}

function sceneThumbnailChrBankIds(scene) {
  const source = Number(scene?.id) === 0
    ? (scene?.render?.zones || []).flatMap(zone => zone?.mmc3_banks || [])
    : scene?.render?.mmc3_banks || [];
  const result = [];
  const seen = new Set();
  for (const rawId of source) {
    const id = Number(rawId);
    if (!Number.isInteger(id) || id < 0 || id > 0xff || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

async function sceneThumbnailSourceDigest(scene) {
  if (sceneThumbnailSourceDigests.has(scene)) {
    return sceneThumbnailSourceDigests.get(scene);
  }
  const promise = sha256Text(canonicalJsonStringify(sceneThumbnailSource(scene)));
  sceneThumbnailSourceDigests.set(scene, promise);
  return promise;
}

async function sceneThumbnailBankDigest(bank) {
  if (sceneThumbnailBankDigests.has(bank)) {
    return sceneThumbnailBankDigests.get(bank);
  }
  // DB field views expose live getters. Hash their current values without
  // treating those accessors as a persistent JSON document.
  const promise = sha256Text(canonicalJsonStringify(structuredClone(bank)));
  sceneThumbnailBankDigests.set(bank, promise);
  return promise;
}

async function sceneMapThumbnailCacheKey(
  sceneId,
  {cellSize, width, height},
) {
  const document_ = await loadSceneResourceDocumentById(sceneId);
  const scene = document_?.scene || document_;
  if (!scene) return null;
  const visualDocument = await db.getDocument("shared-chr-bank", null);
  if (!visualDocument || !Array.isArray(visualDocument.banks)) return null;
  const sceneDigest = await sceneThumbnailSourceDigest(scene);
  if (!sceneDigest) return null;
  const bankDigests = [];
  for (const id of sceneThumbnailChrBankIds(scene)) {
    const bank = visualDocument.banks.find(item => Number(item?.id) === id);
    if (!bank) return null;
    const digest = await sceneThumbnailBankDigest(bank);
    if (!digest) return null;
    bankDigests.push([id, digest]);
  }
  const digest = await sha256Text(canonicalJsonStringify({
    schema: SCENE_MAP_THUMBNAIL_CACHE_SCHEMA,
    scene_id: Number(sceneId),
    cell_size: Number(cellSize),
    width: Number(width),
    height: Number(height),
    scene_sha256: sceneDigest,
    chr_banks: bankDigests,
  }));
  return digest ? `${SCENE_MAP_THUMBNAIL_CACHE_SCHEMA}:${digest}` : null;
}

function sceneThumbnailCacheProjectId() {
  const projectId = state.projectRepository?.projectId;
  return typeof projectId === "string" && projectId
    ? projectId : ACTIVE_PROJECT_ID;
}

/**
 * 当前会话里场景编辑器的草稿也是场景模块的有效正文。
 *
 * 草稿尚未保存时不能进 IndexedDB，但同一编辑器会话内的缩略图、目标预览与剧情舞台
 * 都必须看见它；否则这些消费者读 repository 时会各自得到另一张“当前场景”。
 */
function activeSceneEditorDocument(sceneId) {
  if (Number(state.sceneEntry?.id) !== Number(sceneId)
      || Number(state.scene?.id) !== Number(sceneId)
      || !state.scene || typeof state.scene !== "object"
      || state.sceneDraftRepository !== state.projectRepository) return null;
  return {scene: state.scene, logic: state.sceneLogic || null};
}

/** 以场景编辑草稿优先、浏览器 repository 次之，解析一份当前场景正文。 */
async function loadSceneResourceDocumentById(sceneId) {
  const id = integer(sceneId, "scene_id", 0, 0xff);
  return activeSceneEditorDocument(id)
    || db.getResourceDocument(sceneResourceId(id), null);
}

/** Validate and normalize the JSON-only recipe for one regular scene. */
function sceneRenderRecipe(scene) {
  if (!scene || typeof scene !== "object") {
    throw new TypeError("场景渲染正文不可用");
  }
  if (scene.preview_only) return null;
  const bankValues = scene.render?.mmc3_banks;
  if (!Array.isArray(bankValues) || bankValues.length !== 4) {
    throw new TypeError("普通场景必须声明四个 MMC3 背景 CHR bank");
  }
  const banks = bankValues.map((value, index) =>
    integer(value, `render.mmc3_banks[${index}]`, 0, 0xff));
  const palette = scene.render?.background_palette;
  if (palette?.format !== "nes-system-palette-indices/v1" ||
      !Array.isArray(palette.colors) || palette.colors.length !== 16) {
    throw new TypeError("普通场景缺少 16 色 JSON 背景 palette");
  }
  const colors = Uint8Array.from(palette.colors.map((value, index) =>
    integer(value, `render.background_palette.colors[${index}]`, 0, 0x3f)));
  if (!Array.isArray(scene.metatile_definitions) ||
      scene.metatile_definitions.length !== 128 ||
      scene.metatile_definitions.some(item => !Array.isArray(item) || item.length !== 4)) {
    throw new TypeError("普通场景必须包含 128 个四象限 metatile 定义");
  }
  if (!Array.isArray(scene.metatile_palette_ids) ||
      scene.metatile_palette_ids.length !== 128) {
    throw new TypeError("普通场景必须包含 128 个 metatile palette ID");
  }
  scene.metatile_definitions.forEach((definition, metatileId) => {
    definition.forEach((value, quadrant) => integer(
      value,
      `metatile_definitions[${metatileId}][${quadrant}]`,
      0,
      0xff,
    ));
  });
  scene.metatile_palette_ids.forEach((value, metatileId) => integer(
    value, `metatile_palette_ids[${metatileId}]`, 0, 3,
  ));
  return {banks, palette: colors};
}

/** Decode one 8×8 NES 2bpp tile from a composed 4 KiB pattern table. */
function decodeSceneTile(patternTable, tileId) {
  if (!(patternTable instanceof Uint8Array) || patternTable.length !== 0x1000) {
    throw new TypeError("场景 pattern table 必须是 4 KiB Uint8Array");
  }
  const id = integer(tileId, "tile_id", 0, 0xff);
  const start = id * 16;
  const result = new Uint8Array(64);
  for (let y = 0; y < 8; y += 1) {
    const low = patternTable[start + y];
    const high = patternTable[start + y + 8];
    for (let x = 0; x < 8; x += 1) {
      const bit = 7 - x;
      result[y * 8 + x] = ((high >> bit) & 1) * 2 + ((low >> bit) & 1);
    }
  }
  return result;
}

/**
 * Rasterize one 16×16 metatile into a reusable canvas.
 *
 * 上界取该场景自己的定义表长度：普通场景是 128，世界地图是 187。写死 0x7F 会把
 * 世界地图挡在门外，而世界地图用的是同一套 metatile 语义。
 */
function sceneMetatileImage(scene, patternTable, palette, metatileId) {
  const count = Array.isArray(scene?.metatile_definitions)
    ? scene.metatile_definitions.length : 0;
  const id = integer(metatileId, "metatile_id", 0, Math.max(0, count - 1));
  const data = new Uint8ClampedArray(16 * 16 * 4);
  const paletteId = integer(
    scene.metatile_palette_ids[id], `metatile_palette_ids[${id}]`, 0, 3,
  );
  scene.metatile_definitions[id].forEach((rawTileId, quadrant) => {
    const tile = decodeSceneTile(patternTable, rawTileId);
    const qx = (quadrant & 1) * 8;
    const qy = (quadrant >> 1) * 8;
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        const colorIndex = tile[y * 8 + x];
        const colorId = palette[paletteId * 4 + colorIndex] & 0x3f;
        const color = nesPalette[colorId];
        const target = ((qy + y) * 16 + qx + x) * 4;
        data[target] = color[0];
        data[target + 1] = color[1];
        data[target + 2] = color[2];
        data[target + 3] = 255;
      }
    }
  });
  return {width: 16, height: 16, data};
}

/**
 * Rasterize one 16×16 metatile into a reusable canvas.
 *
 * 像素计算在 `sceneMetatileImage` 里，不碰 DOM——对拍合同要在 Node 里跑它。
 */
function createSceneMetatileCanvas(
  scene, patternTable, palette, metatileId,
) {
  const {width, height, data} = sceneMetatileImage(
    scene, patternTable, palette, metatileId);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").putImageData(new ImageData(data, width, height), 0, 0);
  return canvas;
}

/**
 * Resolve one regular scene's live raster sources.
 *
 * The two-level WeakMap makes cache identity depend on both effective scene
 * JSON and effective shared-chr-bank JSON.  Saving either asset, switching project,
 * or resetting project-db therefore cannot reuse stale pixels.
 */
async function loadSceneMetatileRenderer(scene, {animationPhase = null,
  metatileEdits = [], transformPatternTable = null} = {}) {
  scene = await projectSceneMetatiles(scene, {edits: metatileEdits});
  const recipe = sceneRenderRecipe(scene);
  if (!recipe) return null;
  const animation = animationPhase == null ? null
    : fieldChrAnimationRecipe(await db.getResourceDocument("palette-runtime-service", null));
  const banks = fieldChrAnimationBanks(scene, animation, animationPhase);
  const key = banks.join(":");
  const visualDocument = await db.getDocument("shared-chr-bank", null);
  if (!visualDocument || typeof visualDocument !== "object") {
    throw new TypeError("shared-chr-bank 图像基础表不可用");
  }
  let byVisual = renderersByScene.get(scene);
  if (!byVisual) {
    byVisual = new WeakMap();
    renderersByScene.set(scene, byVisual);
  }
  let byBanks = byVisual.get(visualDocument);
  if (!byBanks) { byBanks = new Map(); byVisual.set(visualDocument, byBanks); }
  const cached = transformPatternTable ? null : byBanks.get(key);
  if (cached) return cached;
  let promise;
  promise = (async () => {
    const patternTable = await composeChrPatternTable(banks);
    transformPatternTable?.(patternTable, banks);
    // An invalidate/project switch can land while four banks are loading.
    // Never publish that mixed generation under the old document identity.
    const currentVisual = await db.getDocument("shared-chr-bank", null);
    if (currentVisual !== visualDocument) {
      byVisual.delete(visualDocument);
      return loadSceneMetatileRenderer(scene, {animationPhase, metatileEdits, transformPatternTable});
    }
    const metatiles = Array.from({length: 128}, (_, id) =>
      createSceneMetatileCanvas(scene, patternTable, recipe.palette, id));
    return {metatiles};
  })().catch(error => {
    if (byBanks.get(key) === promise) byBanks.delete(key);
    throw error;
  });
  if (!transformPatternTable) byBanks.set(key, promise);
  return promise;
}

/**
 * 校验并归一世界地图的渲染配方。
 *
 * 世界地图和普通场景是同一套 metatile 语义，差别只有一条：它把画面分成四个地理
 * 区，每区挂一组 CHR bank（`render.zones[].mmc3_banks`），因此同一个 metatile 号
 * 在不同区会画出不同图案。`preview_only` 说的是「背景当前不可编辑」，不是
 * 「只能看预渲染图」——像素照样是包内 JSON 的纯函数。
 */
function worldRenderRecipe(scene) {
  if (!scene || typeof scene !== "object") {
    throw new TypeError("世界地图渲染正文不可用");
  }
  if (Number(scene.id) !== 0) return null;
  const palette = scene.render?.background_palette;
  if (!Array.isArray(palette?.colors) || palette.colors.length !== 16) {
    throw new TypeError("世界地图缺少 16 色 JSON 背景 palette");
  }
  const colors = Uint8Array.from(palette.colors.map((value, index) =>
    integer(value, `render.background_palette.colors[${index}]`, 0, 0x3f)));
  const zones = new Map();
  for (const zone of scene.render?.zones || []) {
    const name = String(zone?.name || "");
    if (!WORLD_ZONE_NAMES.includes(name)) {
      throw new TypeError(`世界地图地理区名无效：${name}`);
    }
    const banks = zone?.mmc3_banks;
    if (!Array.isArray(banks) || banks.length !== 4) {
      throw new TypeError(`世界地图 ${name} 必须声明四个 CHR bank`);
    }
    zones.set(name, banks.map((value, index) =>
      integer(value, `render.zones.${name}.mmc3_banks[${index}]`, 0, 0xff)));
  }
  for (const name of WORLD_ZONE_NAMES) {
    if (!zones.has(name)) throw new TypeError(`世界地图缺少地理区 ${name}`);
  }
  if (!Array.isArray(scene.metatile_definitions)
      || !Array.isArray(scene.metatile_palette_ids)
      || scene.metatile_definitions.length !== scene.metatile_palette_ids.length) {
    throw new TypeError("世界地图的 metatile 定义与 palette ID 数量不一致");
  }
  if (!Array.isArray(scene.map) || scene.map.length !== WORLD_HEIGHT
      || scene.map.some(row => !Array.isArray(row) || row.length !== WORLD_WIDTH)) {
    throw new TypeError(`世界地图必须是 ${WORLD_WIDTH}×${WORLD_HEIGHT} 的 metatile 表`);
  }
  return {zones, palette: colors};
}

// 世界地图画布按场景正文、shared-chr-bank 正文与动画 CHR bank 缓存。
async function loadWorldMetatileRenderer(scene, {animationPhase = null,
  metatileEdits = [], transformPatternTable = null} = {}) {
  scene = await projectSceneMetatiles(scene, {edits: metatileEdits});
  const recipe = worldRenderRecipe(scene);
  if (!recipe) return null;
  const visualDocument = await db.getDocument("shared-chr-bank", null);
  if (!visualDocument || typeof visualDocument !== "object") {
    throw new TypeError("shared-chr-bank 图像基础表不可用");
  }
  let byVisual = worldRenderersByScene.get(scene);
  if (!byVisual) {
    byVisual = new WeakMap();
    worldRenderersByScene.set(scene, byVisual);
  }
  let byBank = byVisual.get(visualDocument);
  if (!byBank) { byBank = new Map(); byVisual.set(visualDocument, byBank); }
  const animation = animationPhase == null ? null
    : fieldChrAnimationRecipe(await db.getResourceDocument("palette-runtime-service", null));
  const animationBank = worldChrAnimationBank(animation, animationPhase);
  const cached = transformPatternTable ? null : byBank.get(animationBank);
  if (cached) return cached;
  let promise;
  promise = (async () => {
    const count = scene.metatile_definitions.length;
    const zones = new Map();
    for (const name of WORLD_ZONE_NAMES) {
      const banks = [...recipe.zones.get(name)];
      if (animationBank !== null) banks[0] = animationBank;
      const patternTable = await composeChrPatternTable(banks);
      transformPatternTable?.(patternTable, banks);
      zones.set(name, {
        metatiles: Array.from({length: count}, (_, id) =>
          createSceneMetatileCanvas(scene, patternTable, recipe.palette, id)),
      });
    }
    // 四组 bank 加载期间可能发生保存或项目切换；别把混代的结果挂在旧 identity 上。
    const currentVisual = await db.getDocument("shared-chr-bank", null);
    if (currentVisual !== visualDocument) {
      byVisual.delete(visualDocument);
      return loadWorldMetatileRenderer(scene, {animationPhase, metatileEdits, transformPatternTable});
    }
    return {zones, zoneAt: worldZoneAt};
  })().catch(error => {
    if (byBank.get(animationBank) === promise) {
      byBank.delete(animationBank);
    }
    throw error;
  });
  if (!transformPatternTable) byBank.set(animationBank, promise);
  return promise;
}

function sceneMapSize(scene) {
  const rows = scene?.map;
  if (!Array.isArray(rows) || !rows.length || !Array.isArray(rows[0])
      || !rows[0].length) {
    throw new TypeError("场景缺少非空 metatile 地图");
  }
  const width = rows[0].length;
  if (rows.some(row => !Array.isArray(row) || row.length !== width)) {
    throw new TypeError("场景 metatile 地图必须是矩形");
  }
  return {rows, width: Number(scene.width), height: Number(scene.height)};
}

function sceneCellMetatile(scene, renderer, x, y) {
  return sceneMetatileAt(scene, renderer, x, y, sceneRuntimeMetatileId(scene, x, y));
}

function sceneMetatileAt(scene, renderer, x, y, metatileId, zone = null) {
  const tiles = Number(scene.id) === 0
    ? renderer?.zones?.get(zone || worldZoneAt(x, y))?.metatiles
    : renderer?.metatiles;
  return tiles?.[Number(metatileId)] || null;
}

function paintSceneMetatileCells(context, scene, renderer, cells, {zone = null} = {}) {
  context.imageSmoothingEnabled = false;
  for (const {x, y, metatile_id} of cells) {
    const tile = sceneMetatileAt(scene, renderer, x, y, metatile_id, zone);
    if (tile) context.drawImage(tile, x * 16, y * 16, 16, 16);
  }
}

/**
 * 场景模块的原始地图流拼装入口。
 *
 * 图块编辑器和场景资产列表必须看这一层；剧情、传送目标缩略图和场景逻辑视图
 * 在它之上统一走 `paintSceneRuntimeMap`，再叠加场景加载器产生的运行时 metatile。
 */
function paintSceneMap(
  context,
  scene,
  renderer,
  {cellSize = 16, region = null, wrap = false} = {},
) {
  if (!context || typeof context.drawImage !== "function") {
    throw new TypeError("场景绘制需要 Canvas 2D context");
  }
  const size = integer(cellSize, "cellSize", 1, 16);
  const {width, height} = sceneMapSize(scene);
  context.imageSmoothingEnabled = false;
  const left = region ? Math.floor(region.x / size) : 0;
  const top = region ? Math.floor(region.y / size) : 0;
  const right = region ? Math.ceil((region.x + region.width) / size) : width;
  const bottom = region ? Math.ceil((region.y + region.height) / size) : height;
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const sourceX = wrap ? ((x % width) + width) % width : x;
      const sourceY = wrap ? ((y % height) + height) % height : y;
      if (sourceX < 0 || sourceY < 0 || sourceX >= width || sourceY >= height) continue;
      const tile = sceneCellMetatile(scene, renderer, sourceX, sourceY);
      if (tile) {
        context.drawImage(
          tile,
          x * size,
          y * size,
          size,
          size,
        );
      }
    }
  }
  return {width: width * size, height: height * size};
}

/**
 * 绘制场景加载器在运行时注入的 metatile 层。
 *
 * 这类图块不在 `scene.map` 的地图流里。以宝箱为例，地图流保存的是地面，加载器再按
 * `logic.layers.treasures[].runtime_metatile_overlay` 把未取得宝箱写进 SRAM 地图。字段
 * 来自场景基础模块已经解出的运行语义；消费端只负责合成，不复刻 ROM 偏移或算法。
 *
 * 扫描所有逻辑层而不是写死 treasures：今后其他场景对象只要发布同一语义字段，也会
 * 自动进入同一合成管线。`visibleLayers` 只供场景编辑器隐藏诊断层；剧情和传送目标
 * 缩略图默认显示全部运行时图层。
 */
function paintSceneRuntimeMetatileOverlays(
  context,
  scene,
  logic,
  renderer,
  {
    cellSize = 16,
    visibleLayers = null,
    resolveMetatileId = null,
  } = {},
) {
  if (!context || typeof context.drawImage !== "function") {
    throw new TypeError("场景绘制需要 Canvas 2D context");
  }
  const size = integer(cellSize, "cellSize", 1, 16);
  context.imageSmoothingEnabled = false;
  let painted = 0;
  for (const {x, y, metatileId} of sceneRuntimeMetatileOverlays(scene, logic, {visibleLayers, resolveMetatileId})) {
    const tile = sceneMetatileAt(scene, renderer, x, y, metatileId);
    if (!tile) continue;
    context.drawImage(tile, x * size, y * size, size, size);
    painted += 1;
  }
  return painted;
}

/**
 * 场景模块唯一的运行时画面合成入口：原始地图 + 场景加载器注入的 metatile 层。
 * 编辑器的图块模式仍显式调用 `paintSceneMap`，因为那里编辑的是原始地图流。
 */
function paintSceneRuntimeMap(
  context,
  scene,
  logic,
  renderer,
  options = {},
) {
  const bounds = paintSceneMap(context, scene, renderer, options);
  const runtimeMetatileOverlays = paintSceneRuntimeMetatileOverlays(
    context, scene, logic, renderer, options,
  );
  for (const overlay of options.actionOverlays || []) {
    if (Number(overlay.sceneId) !== Number(scene.id)) continue;
    const tile = sceneMetatileAt(scene, renderer, overlay.x, overlay.y, overlay.metatileId);
    const size = options.cellSize ?? 16;
    if (tile) context.drawImage(tile, overlay.x * size, overlay.y * size, size, size);
  }
  return {...bounds, runtimeMetatileOverlays};
}

/** 用同一套场景拼装规则重画一个格；供场景编辑器的画笔即时反馈使用。 */
function paintSceneMapCell(
  context,
  scene,
  renderer,
  x,
  y,
  {cellSize = 16, targetX = null, targetY = null} = {},
) {
  if (!context || typeof context.drawImage !== "function") {
    throw new TypeError("场景绘制需要 Canvas 2D context");
  }
  const size = integer(cellSize, "cellSize", 1, 16);
  const {width, height} = sceneMapSize(scene);
  const cellX = integer(x, "scene_x", 0, width - 1);
  const cellY = integer(y, "scene_y", 0, height - 1);
  const tile = sceneCellMetatile(scene, renderer, cellX, cellY);
  if (!tile) return false;
  context.imageSmoothingEnabled = false;
  context.drawImage(
    tile,
    targetX === null ? cellX * size : Number(targetX),
    targetY === null ? cellY * size : Number(targetY),
    size,
    size,
  );
  return true;
}

/**
 * 把整张场景画进一块离屏 canvas，按 metatile 尺寸缩放。
 *
 * 这是原始地图面的离屏缓存。场景资产列表直接使用它；传送目标预览和剧情舞台通过
 * `loadSceneRuntimeSurface` 在这一语义之上叠加场景逻辑，不再各自读取或拼装 PNG。
 *
 * `cellSize` 是第一层缩放——16 是原尺寸，列表页用 8 保留更多图块内容。列表随后
 * 把整张 surface 等比放进固定显示画布，并可把最终 PNG 写入独立的可丢弃预览缓存；
 * 它不是包内资产，也不进入项目导出。
 *
 * 本函数的内存缓存以「场景正文 identity × metatile renderer identity × cellSize」
 * 为键；场景保存会换正文，shared-chr-bank 保存会换 renderer。编辑中的同一草稿原地改
 * map 时，由 invalidateSceneSurface 显式作废。
 */
const surfacesByScene = new WeakMap();
const runtimeSurfacesByScene = new WeakMap();
const regionRevisions = new WeakMap();

function invalidateSceneSurface(scene) {
  if (!scene || typeof scene !== "object") return;
  surfacesByScene.delete(scene);
  runtimeSurfacesByScene.delete(scene);
  regionRevisions.set(scene, (regionRevisions.get(scene) || 0) + 1);
  sceneThumbnailSourceDigests.delete(scene);
}

async function loadSceneSurface(scene, {cellSize = 16, animationPhase = null} = {}) {
  if (!scene || typeof scene !== "object") return null;
  const size = integer(cellSize, "cellSize", 1, 16);
  const world = Number(scene.id) === 0;
  const renderer = world
    ? await loadWorldMetatileRenderer(scene, {animationPhase})
    : await loadSceneMetatileRenderer(scene, {animationPhase});
  if (!renderer) return null;
  let byRenderer = surfacesByScene.get(scene);
  if (!byRenderer) {
    byRenderer = new WeakMap();
    surfacesByScene.set(scene, byRenderer);
  }
  let bySize = byRenderer.get(renderer);
  if (!bySize) {
    bySize = new Map();
    byRenderer.set(renderer, bySize);
  }
  const cached = bySize.get(size);
  if (cached) return cached;
  const promise = (async () => {
    const {width, height} = sceneMapSize(scene);
    const canvas = document.createElement("canvas");
    canvas.width = width * size;
    canvas.height = height * size;
    const context = canvas.getContext("2d");
    paintSceneMap(context, scene, renderer, {cellSize: size});
    return canvas;
  })().catch(error => {
    if (bySize.get(size) === promise) bySize.delete(size);
    throw error;
  });
  bySize.set(size, promise);
  return promise;
}

/** 把场景正文与逻辑正文合成为加载后的运行时画面。 */
async function loadSceneRuntimeSurface(
  scene,
  logic,
  {cellSize = 16, animationPhase = null} = {},
) {
  if (!scene || typeof scene !== "object") return null;
  if (!logic || typeof logic !== "object") {
    return loadSceneSurface(scene, {cellSize, animationPhase});
  }
  const size = integer(cellSize, "cellSize", 1, 16);
  const renderer = Number(scene.id) === 0
    ? await loadWorldMetatileRenderer(scene, {animationPhase})
    : await loadSceneMetatileRenderer(scene, {animationPhase});
  if (!renderer) return null;
  let byLogic = runtimeSurfacesByScene.get(scene);
  if (!byLogic) {
    byLogic = new WeakMap();
    runtimeSurfacesByScene.set(scene, byLogic);
  }
  let byRenderer = byLogic.get(logic);
  if (!byRenderer) {
    byRenderer = new WeakMap();
    byLogic.set(logic, byRenderer);
  }
  let bySize = byRenderer.get(renderer);
  if (!bySize) {
    bySize = new Map();
    byRenderer.set(renderer, bySize);
  }
  const cached = bySize.get(size);
  if (cached) return cached;
  const promise = (async () => {
    const {width, height} = sceneMapSize(scene);
    const canvas = document.createElement("canvas");
    canvas.width = width * size;
    canvas.height = height * size;
    paintSceneRuntimeMap(
      canvas.getContext("2d"), scene, logic, renderer, {cellSize: size},
    );
    return canvas;
  })().catch(error => {
    if (bySize.get(size) === promise) bySize.delete(size);
    throw error;
  });
  bySize.set(size, promise);
  return promise;
}

/**
 * 按场景 ID 画整张场景。
 *
 * 传送目标与剧情默认看加载后的运行时画面；地图资产列表显式传
 * `includeRuntime: false`，使其内容与图块编辑器的原始地图面一致。
 */
async function loadSceneSurfaceById(
  sceneId,
  {includeRuntime = true, ...options} = {},
) {
  const id = integer(sceneId, "scene_id", 0, 0xff);
  const document_ = await loadSceneResourceDocumentById(id);
  const scene = document_?.scene || document_;
  if (!scene) return null;
  return includeRuntime
    ? loadSceneRuntimeSurface(scene, document_?.logic || null, options)
    : loadSceneSurface(scene, options);
}

const animatedViewportsBySurface = new WeakMap();
const regionsByRenderer = new WeakMap();

// 可见地图按正文、图块绘制器与区域缓存，剧情改写在运行时叠层之后绘制。
async function loadSceneRegionById(sceneId, {
  x = 0, y = 0, width = 256, height = 240, animationPhase = null, fieldTiles = [],
} = {}) {
  const document_ = await loadSceneResourceDocumentById(sceneId);
  const scene = document_?.scene || document_;
  if (!scene) return null;
  const renderer = Number(scene.id) === 0
    ? await loadWorldMetatileRenderer(scene, {animationPhase})
    : await loadSceneMetatileRenderer(scene, {animationPhase});
  if (!renderer) return null;
  const mapWidth = Number(scene.width) * 16, mapHeight = Number(scene.height) * 16;
  const left = Math.max(0, Math.floor(x / 256) * 256);
  const top = Math.max(0, Math.floor(y / 256) * 256);
  const right = Math.min(mapWidth, Math.ceil((x + width) / 256) * 256);
  const bottom = Math.min(mapHeight, Math.ceil((y + height) / 256) * 256);
  if (right <= left || bottom <= top) return null;
  let cached = regionsByRenderer.get(renderer);
  const revision = regionRevisions.get(scene) || 0;
  if (!cached || cached.scene !== scene || cached.logic !== document_?.logic || cached.revision !== revision) {
    cached = {scene, logic: document_?.logic, revision, regions: new Map()};
    regionsByRenderer.set(renderer, cached);
  }
  const key = JSON.stringify([left, top, right, bottom, fieldTiles]);
  if (cached.regions.has(key)) return cached.regions.get(key);
  const canvas = document.createElement("canvas");
  canvas.width = right - left;
  canvas.height = bottom - top;
  const drawing = canvas.getContext("2d");
  drawing.translate(-left, -top);
  paintSceneRuntimeMap(drawing, scene, document_?.logic, renderer, {
    region: {x: left, y: top, width: canvas.width, height: canvas.height},
    actionOverlays: fieldTiles.map(tile => ({sceneId: Number(scene.id),
      x: Number(tile.x), y: Number(tile.y), metatileId: Number(tile.tileId) & 0x7F})),
  });
  const result = {canvas, x: left, y: top};
  cached.regions.set(key, result);
  if (cached.regions.size > 8) cached.regions.delete(cached.regions.keys().next().value);
  return result;
}

/** 场景字段对象按相机取样完整视口；本地图外使用加载器的背景图块。 */
async function loadSceneViewportById(sceneId, {
  cameraX = 0, cameraY = 0, width = 256, height = 240, cellSize = 16, animationPhase = null,
} = {}) {
  const document_ = await loadSceneResourceDocumentById(sceneId);
  const scene = document_?.scene || document_;
  if (!scene) return null;
  const surface = Number(scene.id) === 0 ? null
    : await loadSceneSurfaceById(sceneId, {cellSize, animationPhase});
  if (Number(scene.id) !== 0 && !surface) return null;
  const viewportKey = `${cameraX}:${cameraY}:${width}:${height}:${cellSize}`;
  const cached = animationPhase == null ? null : animatedViewportsBySurface.get(surface);
  if (cached?.key === viewportKey) return cached.canvas;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const drawing = canvas.getContext("2d");
  drawing.imageSmoothingEnabled = false;
  if (Number(scene.id) === 0) {
    // PRG $028F58..$028F98 按相机原点为整个视口选择同一组 CHR。
    const renderer = await loadWorldMetatileRenderer(scene, {animationPhase});
    const tiles = renderer.zones.get(worldZoneAt(cameraX & 0xff, cameraY & 0xff)).metatiles;
    const viewportRenderer = {...renderer, zones: new Map([...renderer.zones.keys()]
      .map(zone => [zone, {metatiles: tiles}]))};
    drawing.save();
    drawing.translate(-cameraX * cellSize, -cameraY * cellSize);
    paintSceneMap(drawing, scene, viewportRenderer, {cellSize, wrap: true,
      region: {x: cameraX * cellSize, y: cameraY * cellSize, width, height}});
    drawing.restore();
    for (const wrapY of [0, 256]) {
      for (const wrapX of [0, 256]) {
        drawing.save();
        drawing.translate((wrapX - cameraX) * cellSize, (wrapY - cameraY) * cellSize);
        paintSceneRuntimeMetatileOverlays(drawing, scene, document_?.logic, viewportRenderer,
          {cellSize});
        drawing.restore();
      }
    }
  } else {
    // $A7AD 将扩展记录后四字节复制到 $8B..$8E；$DD94 越界取 $8D。
    const renderer = await loadSceneMetatileRenderer(scene, {animationPhase});
    const tile = renderer?.metatiles[Number(scene.header_extension?.[6])];
    if (tile) {
      const offsetX = -((cameraX % 1 + 1) % 1) * cellSize;
      const offsetY = -((cameraY % 1 + 1) % 1) * cellSize;
      const pattern = drawing.createPattern(tile, "repeat");
      pattern.setTransform({a: cellSize / tile.width, d: cellSize / tile.height,
        e: offsetX, f: offsetY});
      drawing.fillStyle = pattern;
      drawing.fillRect(0, 0, width, height);
    }
    drawing.drawImage(surface, -cameraX * cellSize, -cameraY * cellSize);
    if (animationPhase != null) animatedViewportsBySurface.set(surface, {key: viewportKey, canvas});
  }
  return canvas;
}

const sceneMarkerColors = {
  actor: [34, 211, 238], treasure: [246, 190, 48], vehicle: [255, 122, 24],
  investigation: [190, 126, 255], "investigation-special": [255, 126, 210],
  "investigation-tile": [139, 104, 220], transition: [220, 242, 49], elevator: [220, 242, 49],
  event: [239, 89, 108], tide: [40, 200, 190],
};

/** 场景详情与引用预览共用的逻辑图层标记。 */
function paintSceneLogicMarkers(context, objects, {width, height, cellSize = 16, actorImages = false} = {}) {
  const scale = cellSize / 16;
  context.save();
  context.font = `bold ${Math.max(6, 8 * scale)}px monospace`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  for (const {kind, record, x, y, selected = false} of objects) {
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0
        || x >= width || y >= height || !sceneMarkerColors[kind]) continue;
    const [red, green, blue] = sceneMarkerColors[kind];
    const markerText = kind === 'tide' ? ['↑', '↓', '←', '→'][record.direction]
      : kind === "elevator" ? "E" : kind === "investigation-tile"
      ? String(record.behavior_code_hex || "").replace(/^0x/, "")
      : Number(record.id).toString(16).toUpperCase();
    if (kind === 'actor' && actorImages) {
      if (selected) {
        context.strokeStyle = '#fff'; context.lineWidth = 2 * scale;
        context.strokeRect(x * cellSize + scale, y * cellSize + scale, cellSize - 2 * scale, cellSize - 2 * scale);
      }
      context.fillStyle = 'rgba(7,16,19,.78)';
      context.fillRect(x * cellSize, y * cellSize, 7 * scale, 7 * scale);
      context.fillStyle = `rgb(${red},${green},${blue})`;
      context.fillText(markerText, x * cellSize + 3.5 * scale, y * cellSize + 3.5 * scale);
      continue;
    }
    if (kind === "treasure" && record.runtime_metatile_overlay) {
      context.strokeStyle = selected ? "#fff" : `rgba(${red},${green},${blue},.95)`;
      context.lineWidth = (selected ? 2.5 : 1.5) * scale;
      context.strokeRect(x * cellSize + scale, y * cellSize + scale,
        cellSize - 2 * scale, cellSize - 2 * scale);
      context.fillStyle = "rgba(7,16,19,.78)";
      context.fillRect(x * cellSize + scale, y * cellSize + scale, 8 * scale, 7 * scale);
      context.textAlign = "left";
      context.fillStyle = `rgb(${red},${green},${blue})`;
      context.fillText(markerText, x * cellSize + 2.5 * scale, y * cellSize + 5 * scale);
      context.textAlign = "center";
      continue;
    }
    const cx = (x + .5) * cellSize, cy = (y + .5) * cellSize;
    context.fillStyle = `rgba(${red},${green},${blue},.82)`;
    context.fillRect(cx - 6 * scale, cy - 6 * scale, 12 * scale, 12 * scale);
    context.strokeStyle = selected ? "#fff" : "rgba(0,0,0,.8)";
    context.lineWidth = (selected ? 2 : 1) * scale;
    context.strokeRect(cx - 6.5 * scale, cy - 6.5 * scale, 13 * scale, 13 * scale);
    context.fillStyle = "#071013";
    context.fillText(markerText, cx, cy + .5 * scale);
  }
  context.restore();
}

function paintSceneBoundaryMarkers(context, records, {width, height, cellSize = 16} = {}) {
  const pixelWidth = width * cellSize, pixelHeight = height * cellSize;
  const scale = cellSize / 16;
  context.save();
  context.font = `bold ${Math.max(6, 8 * scale)}px monospace`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  for (const {record, sides = null, selected = false} of records) {
    const direction = sides || {1: ["up"], 2: ["down"], 3: ["left"], 4: ["right"]}[
      Number(record.direction_code)] || ["up", "down", "left", "right"];
    const destination = Number(record.destination_scene_id).toString(16).toUpperCase().padStart(2, "0");
    for (const side of direction) {
      const geometry = {
        up: {fill: [0, 0, pixelWidth, 7 * scale], line: [0, 2.5 * scale, pixelWidth, 2.5 * scale], text: [pixelWidth / 2, 4 * scale], arrow: "↑"},
        down: {fill: [0, pixelHeight - 7 * scale, pixelWidth, 7 * scale], line: [0, pixelHeight - 2.5 * scale, pixelWidth, pixelHeight - 2.5 * scale], text: [pixelWidth / 2, pixelHeight - 4 * scale], arrow: "↓"},
        left: {fill: [0, 0, 7 * scale, pixelHeight], line: [2.5 * scale, 0, 2.5 * scale, pixelHeight], text: [4 * scale, pixelHeight / 2], arrow: "←"},
        right: {fill: [pixelWidth - 7 * scale, 0, 7 * scale, pixelHeight], line: [pixelWidth - 2.5 * scale, 0, pixelWidth - 2.5 * scale, pixelHeight], text: [pixelWidth - 4 * scale, pixelHeight / 2], arrow: "→"},
      }[side];
      context.fillStyle = `rgba(132,204,22,${selected ? ".72" : ".42"})`;
      context.fillRect(...geometry.fill);
      context.beginPath();
      context.moveTo(geometry.line[0], geometry.line[1]);
      context.lineTo(geometry.line[2], geometry.line[3]);
      context.strokeStyle = selected ? "#fff" : "rgb(132,204,22)";
      context.lineWidth = (selected ? 3 : 1.5) * scale;
      context.stroke();
      context.fillStyle = selected ? "#fff" : "#071013";
      context.fillText(`${geometry.arrow}${destination}`, geometry.text[0], geometry.text[1]);
    }
  }
  context.restore();
}

function fixedSceneThumbnailSize(canvas) {
  const width = Number(canvas.dataset.sceneThumbWidth);
  const height = Number(canvas.dataset.sceneThumbHeight);
  return Number.isInteger(width) && width > 0
      && Number.isInteger(height) && height > 0
    ? {width, height} : null;
}

function sceneThumbnailCrop(canvas, surface, cellSize) {
  const value = canvas.dataset.sceneThumbCrop;
  if (!value) return null;
  const match = /^(\d+),(\d+),(\d+),(\d+)$/u.exec(value);
  if (!match) throw new Error("Invalid scene thumbnail crop");
  const [x, y, width, height] = match.slice(1).map(Number);
  if (!width || !height || (x + width) * cellSize > surface.width
      || (y + height) * cellSize > surface.height) {
    throw new Error("Scene thumbnail crop exceeds the map");
  }
  return {x: x * cellSize, y: y * cellSize,
    width: width * cellSize, height: height * cellSize};
}

function paintSceneThumbnailSurface(canvas, surface, fixedSize = null, crop = null) {
  if (fixedSize) {
    canvas.width = fixedSize.width;
    canvas.height = fixedSize.height;
  } else {
    canvas.width = surface.width;
    canvas.height = surface.height;
  }
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = false;
  if (!fixedSize) {
    context.drawImage(surface, 0, 0);
    return;
  }
  const source = crop || {x: 0, y: 0, width: surface.width, height: surface.height};
  const scale = Math.min(
    fixedSize.width / source.width,
    fixedSize.height / source.height,
  );
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const x = Math.floor((fixedSize.width - width) / 2);
  const y = Math.floor((fixedSize.height - height) / 2);
  context.drawImage(surface, source.x, source.y, source.width, source.height,
    x, y, width, height);
}

async function paintSceneThumbnailCacheRecord(canvas, record, fixedSize) {
  if (!record || !(record.data instanceof Blob)
      || Number(record.width) !== fixedSize.width
      || Number(record.height) !== fixedSize.height
      || typeof createImageBitmap !== "function") return false;
  const bitmap = await createImageBitmap(record.data);
  try {
    canvas.width = fixedSize.width;
    canvas.height = fixedSize.height;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = false;
    context.drawImage(bitmap, 0, 0);
    return true;
  } finally {
    bitmap.close?.();
  }
}

function sceneThumbnailPngBlob(canvas) {
  if (typeof canvas.toBlob !== "function") return Promise.resolve(null);
  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), "image/png");
  });
}

/**
 * 渲染后统一扫一遍 `[data-scene-thumb]` 并批量画。
 *
 * 与 `paintUiConstructionCanvases` / `paintMonsterFigureCanvases` 同一形状。240 个
 * 场景各自要四页 CHR，所以**逐个 await**而不是 `Promise.all`：并发全部展开会同时
 * 持有 240 张离屏画面。列表页先用 8 px/metatile 保住图块内容，再等比放入固定画布，
 * 并缓存这张最终 PNG；其他场景缩略图也按至少 8 px/metatile 取样。
 */
async function paintSceneThumbnailCanvases(root = document) {
  const canvases = [...root.querySelectorAll("canvas[data-scene-thumb]")].filter(canvas => {
    const menu = canvas.closest(".module-reference-picker-menu");
    return !menu || Boolean(menu.closest("details.module-reference-picker")?.open);
  });
  await paintSceneThumbnailBatch(canvases);
}

/** 列表只等首屏；滚动和过滤后进入视口的行继续复用同一个 painter。 */
function paintVisibleSceneThumbnailCanvases(root, {isCurrent}) {
  const canvases = [...root.querySelectorAll("canvas[data-scene-thumb]")];
  if (!canvases.length) return Promise.resolve();
  return new Promise(resolve => {
    const pending = new Set();
    let painting = false;
    let firstBatch = true;
    const active = () => root.isConnected && isCurrent();
    const stop = () => {
      visibility.disconnect();
      lifecycle.disconnect();
      pending.clear();
      resolve();
    };
    const paintPending = async () => {
      if (painting) return;
      if (!active()) { stop(); return; }
      painting = true;
      const initial = firstBatch;
      firstBatch = false;
      const batch = [...pending];
      pending.clear();
      batch.forEach(canvas => visibility.unobserve(canvas));
      await paintSceneThumbnailBatch(batch, active);
      painting = false;
      if (initial) resolve();
      if (!active()) stop();
      else if (pending.size) void paintPending();
    };
    const visibility = new IntersectionObserver(entries => {
      if (!active()) { stop(); return; }
      for (const entry of entries) {
        if (entry.isIntersecting) pending.add(entry.target);
        else pending.delete(entry.target);
      }
      void paintPending();
    });
    // #content 本身会复用；换页/重渲染后按 generation 清理旧观察器和队列。
    const lifecycle = new MutationObserver(() => {
      if (!active()) stop();
    });
    lifecycle.observe(root, {childList: true, subtree: true});
    canvases.forEach(canvas => visibility.observe(canvas));
  });
}

async function paintSceneThumbnailBatch(canvases, isCurrent = () => true) {
  if (!canvases.length) return;
  let wroteCache = false;
  for (const canvas of canvases) {
    // 缓存命中也要在两张之间给输入和滚动一次处理机会。
    if (canvas !== canvases[0]) await new Promise(resolve => setTimeout(resolve, 0));
    if (!isCurrent()) break;
    if (canvas.dataset.sceneThumbPainted === "1" || !canvas.isConnected) continue;
    try {
      const sceneId = Number(canvas.dataset.sceneThumb);
      const cellSize = Number(canvas.dataset.sceneThumbCell || 4);
      const mapContent = canvas.dataset.sceneThumbContent === "map";
      const fixedSize = fixedSceneThumbnailSize(canvas);
      const cacheEligible = mapContent && Boolean(fixedSize)
        && !canvas.dataset.sceneThumbCrop;
      const projectId = sceneThumbnailCacheProjectId();
      let cacheKey = null;
      if (cacheEligible) {
        try {
          cacheKey = await sceneMapThumbnailCacheKey(
            sceneId,
            {cellSize, ...fixedSize},
          );
        } catch (_cacheKeyError) {
          cacheKey = null;
        }
      }
      if (cacheKey) {
        const record = await getPreviewCacheEntry(projectId, cacheKey);
        if (!isCurrent()) break;
        if (!canvas.isConnected) continue;
        if (record) {
          try {
            if (await paintSceneThumbnailCacheRecord(canvas, record, fixedSize)) {
              canvas.dataset.sceneThumbPainted = "1";
              canvas.dataset.sceneThumbCache = "hit";
              delete canvas.dataset.sceneThumbCacheStored;
              delete canvas.dataset.sceneThumbError;
              continue;
            }
          } catch (_cacheDecodeError) {
            // Corrupt/unsupported image data is deleted, then rendered normally.
          }
          await deletePreviewCacheEntry(projectId, cacheKey);
        }
      }
      const surface = await loadSceneSurfaceById(
        sceneId,
        {
          cellSize,
          includeRuntime: !mapContent,
        });
      if (!isCurrent()) break;
      if (!canvas.isConnected) continue;
      if (!surface) continue;
      paintSceneThumbnailSurface(
        canvas, surface, fixedSize, sceneThumbnailCrop(canvas, surface, cellSize),
      );
      canvas.dataset.sceneThumbPainted = "1";
      canvas.dataset.sceneThumbCache = cacheKey ? "miss" : "bypass";
      delete canvas.dataset.sceneThumbError;
      if (cacheKey) {
        const blob = await sceneThumbnailPngBlob(canvas);
        const stored = blob && await putPreviewCacheEntry(
          projectId,
          cacheKey,
          blob,
          {width: fixedSize.width, height: fixedSize.height},
        );
        if (stored) {
          canvas.dataset.sceneThumbCacheStored = "1";
          wroteCache = true;
        }
      }
    } catch (error) {
      canvas.dataset.sceneThumbError = String(error?.message || error);
    }
  }
  if (wroteCache) await prunePreviewCache();
}

/** Resolve a story scene context through repository JSON, then package JSON. */
async function loadStorySceneMetatileRenderer(context, options = {}) {
  if (!context || typeof context !== "object") return null;
  const numericId = Number(context.scene_id);
  let document_ = Number.isInteger(numericId) && numericId >= 0 && numericId <= 0xff
    ? await loadSceneResourceDocumentById(numericId)
    : null;
  if (!document_ && typeof context.package === "string" && context.package) {
    document_ = await db.getPackageDocument(context.package, null);
  }
  const scene = document_?.scene || document_;
  if (!scene || Number(scene.id) === 0 || scene.preview_only) return null;
  return loadSceneMetatileRenderer(scene, options);
}

// @editor-module 外壳行为：导航栏收起、导航分组折叠与状态栏。


const COLLAPSE_KEY = "mm-editor.nav-collapsed";

const SIDEBAR_COLLAPSE_KEY = "mm-editor.sidebar-collapsed";

function bindSidebarToggle() {
  const button = $("#sidebar-toggle");
  if (!button || button.dataset.bound === "true") return;
  button.dataset.bound = "true";
  const apply = collapsed => {
    document.body.dataset.sidebarCollapsed = String(collapsed);
    button.textContent = collapsed ? "›" : "‹";
    button.setAttribute("aria-expanded", String(!collapsed));
    const label = collapsed ? "展开导航栏" : "收起导航栏";
    button.setAttribute("aria-label", label);
    button.title = label;
  };
  try {
    apply(localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === "true");
  } catch {
    apply(false);
  }
  button.addEventListener("click", () => {
    const collapsed = document.body.dataset.sidebarCollapsed !== "true";
    apply(collapsed);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSE_KEY, String(collapsed));
    } catch {
      // 浏览器禁止保存偏好时仍允许收起与展开。
    }
  });
}

function collapsedGroups() {
  try {
    const raw = localStorage.getItem(COLLAPSE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function persistCollapsed(groups) {
  try {
    localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...groups]));
  } catch {
    // 隐私模式下 localStorage 可能不可写：折叠状态是便利功能，不值得中断渲染。
  }
}

/** 分组折叠。状态存本地，因为它是「这台机器上我怎么用」，不属于项目数据。 */
function bindNavigationTree() {
  const nav = $("#navigation");
  if (!nav) return;
  const restore = () => {
    const collapsed = collapsedGroups();
    for (const group of nav.querySelectorAll(".nav-group")) {
      const name = group.dataset.group || "";
      group.dataset.collapsed = String(collapsed.has(name));
    }
  };
  restore();
  if (nav.dataset.navigationTreeBound === "1") return;
  nav.dataset.navigationTreeBound = "1";
  // 页面导航重新挂载时恢复分组折叠状态。
  new MutationObserver(restore).observe(nav, {childList: true});
  nav.addEventListener("click", event => {
    const label = event.target.closest(".nav-label");
    if (!label) return;
    const group = label.closest(".nav-group");
    if (!group) return;
    const name = group.dataset.group || "";
    const next = group.dataset.collapsed !== "true";
    group.dataset.collapsed = String(next);
    const store = collapsedGroups();
    if (next) store.add(name);
    else store.delete(name);
    persistCollapsed(store);
  });
}

/** 当前页面的行数、选中、未保存与地址统一交给日志服务驱动状态栏。 */
function setStatus({rows, selection, dirty, address} = {}) {
  editorLog.setContext({rows, selection, dirty, address});
}

/**
 * 资源错误只上报统一日志，重试入口由日志页提供。
 */
function setResourceAlert({title = "资源加载失败", detail = "", retry, error} = {}) {
  return editorLog.error("资源载入", `${title}：${detail}`, error, {retry});
}

/** 表格页的通用状态：可见行 / 总行数，以及未保存条数。 */
function setTableStatus(visible, total, {dirty = 0, address = ""} = {}) {
  setStatus({
    rows: visible === total
      ? `${total} 行`
      : `${visible} / ${total} 行`,
    dirty: dirty ? `未保存 ${dirty}` : "",
    address,
  });
}

/**
 * 数据集事实：一行紧凑文字，不是一排数字方块。
 *
 * 旧版每页顶部铺 4-8 个 24px 大字方块，其中多数只是「表里有几行」——表格自己
 * 就在显示这件事，状态栏也在显示。方块把首屏让给了重复信息，真正的工作区被
 * 推到下面去了。
 *
 * 留下来的只有两种：表里数不出来的派生事实（去重后画面数、可达指令数），
 * 以及指向别处的资源链接。它们放在过滤条那一行，跟着表走。
 */
function datasetFacts(entries) {
  const cells = entries
    .filter(entry => entry && entry[1] !== null && entry[1] !== undefined)
    .map(([label, value]) => `<span><i>${label}</i>${value}</span>`)
    .join("");
  return cells ? `<div class="dataset-facts">${cells}</div>` : "";
}

// @editor-module 数据网格：列宽由列声明决定，长内容在单元格内换行。
// 列宽总和决定表格最小宽度，放不下时横向滚动。


const DEFAULT_COLUMN_WIDTH = 120;
const virtualTables = new Map();
const virtualTableBindings = new WeakMap();
const VIRTUAL_WINDOW = 18;
const VIRTUAL_ROW_HEIGHT = 52;

function columnWidth(column) {
  const declared = Number(column.width);
  return Number.isFinite(declared) && declared > 0
    ? declared
    : DEFAULT_COLUMN_WIDTH;
}
function contentWidth(value) {
  return Array.from(String(value ?? "")).reduce((total, character) =>
    total + (character.codePointAt(0) > 0xff ? 12 : 8), 24);
}

function fitColumn(column, rows) {
  if (!column.fit || column.width !== undefined || column.sticky) return column;
  let width = contentWidth(column.label);
  for (const row of rows) {
    width = Math.max(width, contentWidth(column.fitValue?.(row) ?? row[column.key]));
    if (width >= 240) break;
  }
  return {...column, width: Math.max(48, Math.min(240, width))};
}
/** 列定义 → <colgroup>，让宽度由列声明而不是内容决定。 */
function columnGroup(columns) {
  const declaredGrow = columns.findIndex(column => column.grow && !column.sticky);
  const growIndex = declaredGrow >= 0 ? declaredGrow : columns.reduce((selected, column, index) =>
    !column.sticky && (selected < 0
      || columnWidth(column) >= columnWidth(columns[selected])) ? index : selected, -1);
  return `<colgroup>${columns.map((column, index) =>
    index === growIndex ? "<col>" : `<col style="width:${columnWidth(column)}px">`
  ).join("")}</colgroup>`;
}

function tableMinWidth(columns) {
  return columns.reduce((total, column) => total + columnWidth(column), 0);
}

function headerCell(column, index) {
  const classes = [
    column.reset ? "reset-column" : "",
    column.mono ? "mono" : "",
    column.align === "right" ? "right" : "",
    column.sticky ? "sticky-col" : "",
  ].filter(Boolean).join(" ");
  return `<th${classes ? ` class="${classes}"` : ""}
    ${column.sticky ? `style="left:${stickyOffset(index)}px"` : ""}
    ${column.title ? `title="${esc(column.title)}"` : ""}${column.reset ? ' aria-label="恢复原值"' : ''}>${esc(column.label)}</th>`;
}

// 前置固定列的偏移由前面几列的宽度累加。固定列应显式给 width；漏写时也要
// 使用统一兜底，否则浏览器无法在横向滚动时把它们钉住。
let stickyWidths = [];
function stickyOffset(index) {
  return stickyWidths.slice(0, index).reduce((total, width) => total + width, 0);
}

function bodyCell(column, row, index) {
  const classes = [
    column.reset ? "reset-column" : "",
    column.mono ? "mono" : "",
    column.align === "right" ? "right" : "",
    column.wrap ? "wrap" : "",
    column.sticky ? "sticky-col" : "",
  ].filter(Boolean).join(" ");
  const content = column.cell
    ? column.cell(row)
    : esc(row[column.key] ?? "");
  return `<td${classes ? ` class="${classes}"` : ""}
    ${column.sticky ? `style="left:${stickyOffset(index)}px"` : ""}>${content}</td>`;
}

/**
 * 不要在视图 CSS 里给表格补最小宽度：那会复制并漂移列定义。表被压扁时，
 * 请在 columns 的对应列声明 width；这里是汇总列宽并把最小宽度落到表格的唯一入口。
 */
function dataTable({
  columns,
  rows,
  renderRow = null,
  rowId = row => row.id,
  recordRoute = null,
  selectedId = null,
  empty = "没有匹配的记录",
  total = null,
  dirty = 0,
  reportStatus = true,
  virtualKey = null,
}) {
  // 行数报给状态栏。以前每页顶部都用一个大字方块说「N 条记录」——表格自己就在
  // 显示这件事，方块只是把工作区往下推。
  if (reportStatus) setTableStatus(rows.length, total === null ? rows.length : total, {dirty});
  const visible = columns.filter(column => column.hidden !== true)
    .map(column => fitColumn(column, rows));
  const widths = visible.map(column =>
    column.sticky ? columnWidth(column) : 0);
  stickyWidths = widths;
  const minWidth = tableMinWidth(visible);
  const rowHtml = row => {
    stickyWidths = widths;
    const id = rowId(row);
    const route = recordRoute ? recordRoute(row) : null;
    if (renderRow) return renderRow(row);
    return `<tr data-row-id="${esc(id)}"
      ${route ? `data-record-link="${esc(route)}"` : ""}
      ${String(id) === String(selectedId) ? 'aria-selected="true"' : ""}
    >${visible.map((column, index) => bodyCell(column, row, index)).join("")}</tr>`;
  };
  if (virtualKey !== null) virtualTables.set(virtualKey, {rows, rowHtml, columns: visible.length});
  if (!rows.length) {
    return `<div class="table-wrap"><table class="data-table" style="min-width:${minWidth}px;table-layout:fixed">${columnGroup(visible)}
      <thead><tr>${visible.map(headerCell).join("")}</tr></thead>
      <tbody><tr><td class="table-empty" colspan="${visible.length}">${esc(empty)}</td></tr></tbody>
    </table></div>`;
  }
  return `<div class="table-wrap${virtualKey !== null ? ' virtual-table-wrap' : ''}"${virtualKey !== null ? ` data-virtual-table="${esc(virtualKey)}"` : ''}><table class="data-table" style="min-width:${minWidth}px;table-layout:fixed">${columnGroup(visible)}
    <thead><tr>${visible.map(headerCell).join("")}</tr></thead>
    <tbody>${(virtualKey !== null ? rows.slice(0, VIRTUAL_WINDOW) : rows).map(rowHtml).join("")}${virtualKey !== null ? spacer(rows.length - VIRTUAL_WINDOW, visible.length, VIRTUAL_ROW_HEIGHT) : ''}</tbody>
  </table></div>`;
}

function spacer(count, columns, height) {
  return count > 0 ? `<tr class="virtual-table-spacer" data-virtual-count="${count}" aria-hidden="true"><td colspan="${columns}" style="height:${count * height}px"></td></tr>` : '';
}

/** 窗口重叠的行须保留节点，新增行在插入前绑定事件。 */
function updateTableRowWindow(body, mountedRows, {
  first, end, rowHtml, before = null, bindRows = () => {},
}) {
  for (const [index, row] of mountedRows) {
    if (index >= first && index < end) continue;
    row.remove();
    mountedRows.delete(index);
  }
  const range = body.ownerDocument.createRange();
  range.selectNodeContents(body);
  for (let index = first; index < end;) {
    if (mountedRows.has(index)) {
      index += 1;
      continue;
    }
    const start = index;
    let html = '';
    while (index < end && !mountedRows.has(index)) {
      html += rowHtml(index);
      index += 1;
    }
    const rows = range.createContextualFragment(html);
    [...rows.children].forEach((row, offset) => mountedRows.set(start + offset, row));
    bindRows(rows);
    body.insertBefore(rows, mountedRows.get(index) || before);
  }
}

function bindVirtualTables(root, open, afterRowsMounted = () => {}) {
  virtualTableBindings.get(root)?.();
  const cleanups = [];
  virtualTableBindings.set(root, () => cleanups.forEach(cleanup => cleanup()));
  root.querySelectorAll('[data-virtual-table]').forEach(wrap => {
    const source = virtualTables.get(wrap.dataset.virtualTable);
    if (!source) return;
    const view = wrap.ownerDocument.defaultView;
    let scroller = wrap.parentElement;
    while (scroller && !/^(auto|scroll|overlay)$/u.test(view.getComputedStyle(scroller).overflowY))
      scroller = scroller.parentElement;
    scroller ||= wrap.ownerDocument.scrollingElement;
    const scrollTarget = scroller === wrap.ownerDocument.scrollingElement ? view : scroller;
    const body = wrap.querySelector('tbody');
    let first = 0;
    let mountedCount = Math.min(source.rows.length, VIRTUAL_WINDOW);
    let rowHeight = VIRTUAL_ROW_HEIGHT;
    let pinnedBottom = false;
    const mountedRows = new Map([...body.querySelectorAll(':scope > tr[data-row-id]')]
      .map((row, index) => [index, row]));
    const template = body.ownerDocument.createElement('template');
    template.innerHTML = spacer(1, source.columns, rowHeight);
    const topSpacer = template.content.firstElementChild;
    const bottomSpacer = body.querySelector('.virtual-table-spacer') || topSpacer.cloneNode(true);
    const setSpacer = (row, count) => {
      row.hidden = count === 0;
      row.dataset.virtualCount = String(count);
      row.firstElementChild.style.height = `${count * rowHeight}px`;
    };
    setSpacer(topSpacer, 0);
    setSpacer(bottomSpacer, source.rows.length - mountedCount);
    body.prepend(topSpacer);
    body.append(bottomSpacer);
    const measure = () => {
      const heights = [...body.querySelectorAll('tr[data-row-id]')]
        .map(row => row.getBoundingClientRect().height).filter(height => height > 0)
        .sort((left, right) => left - right);
      const measured = heights[Math.floor(heights.length / 2)];
      if (!measured || Math.abs(measured - rowHeight) < 1) return;
      rowHeight = measured;
      body.querySelectorAll('.virtual-table-spacer').forEach(row => {
        row.firstElementChild.style.height = `${Number(row.dataset.virtualCount) * rowHeight}px`;
      });
      if (pinnedBottom) scroller.scrollTop = scroller.scrollHeight - scroller.clientHeight;
    };
    const observer = new ResizeObserver(() => {measure(); update();});
    const observeRows = () => {
      observer.disconnect();
      observer.observe(scroller);
      body.querySelectorAll('tr[data-row-id]').forEach(row => observer.observe(row));
    };
    const update = () => {
      if (!wrap.isConnected) return;
      const viewportTop = scrollTarget === view ? 0
        : scroller.getBoundingClientRect().top + scroller.clientTop;
      const viewportHeight = scrollTarget === view ? view.innerHeight : scroller.clientHeight;
      const offset = Math.max(0, viewportTop - body.getBoundingClientRect().top);
      pinnedBottom = scroller.scrollTop > 0
        && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;
      const count = Math.min(source.rows.length, Math.max(VIRTUAL_WINDOW,
        Math.ceil(viewportHeight / rowHeight) + 8));
      const next = Math.min(Math.max(0, Math.floor(offset / rowHeight) - 4),
        Math.max(0, source.rows.length - count));
      if (next === first && count === mountedCount) return;
      first = next;
      mountedCount = count;
      updateTableRowWindow(body, mountedRows, {
        first, end: first + count, before: bottomSpacer,
        rowHtml: index => source.rowHtml(source.rows[index]),
        bindRows: rows => bindRecordLinks(rows, open),
      });
      setSpacer(topSpacer, first);
      setSpacer(bottomSpacer, source.rows.length - first - count);
      observeRows();
      wrap.dispatchEvent(new CustomEvent('virtual-table-rows', {bubbles: true}));
      afterRowsMounted(wrap);
      if (pinnedBottom) scroller.scrollTop = scroller.scrollHeight - scroller.clientHeight;
    };
    observeRows();
    scrollTarget.addEventListener('scroll', update, {passive: true});
    view.addEventListener('resize', update);
    cleanups.push(() => {
      observer.disconnect();
      scrollTarget.removeEventListener('scroll', update);
      view.removeEventListener('resize', update);
    });
    update();
  });
}

/**
 * 行点击 → 记录页。只在没点到交互元件时触发，否则表内编辑会被劫持。
 */
function bindRecordLinks(root, open) {
  root.querySelectorAll("tr[data-record-link]").forEach(row => {
    row.addEventListener("click", event => {
      if (event.target.closest("input, select, textarea, button, a, label, details, summary")) return;
      open(row.dataset.recordLink, row.dataset.rowId);
    });
  });
}

/** Standard action cell for restoring one persisted record to its original. */
function resetToOriginalButton(itemId, {
  title = "只恢复这一项；同一资源中的其他编辑会保留",
  disabled = false,
  dirty = null,
  label = null,
  attributes = {},
  ...unsupported
} = {}) {
  if (Object.keys(unsupported).length) {
    throw new TypeError(`Unsupported reset options: ${Object.keys(unsupported).join(", ")}`);
  }
  if (itemId === undefined || itemId === null || itemId === "") {
    throw new TypeError("itemId is required");
  }
  const knownDirty = typeof dirty === "boolean";
  const isDisabled = disabled || (label === null ? dirty !== true : dirty === false);
  const extra = Object.entries(attributes).map(([name, value]) => {
    if (!/^data-[a-z0-9-]+$/u.test(name) || name === 'data-reset-to-original')
      throw new TypeError(`Unsupported reset attribute: ${name}`);
    return `${name}="${esc(String(value))}"`;
  }).join(' ');
  const hint = `恢复原值：${title}`;
  return `<button class="button ghost reset-to-original${label === null ? " reset-icon" : ""}${dirty === true ? " dirty" : ""}" type="button"
    data-reset-to-original="${esc(String(itemId))}"
    ${knownDirty ? `data-original-dirty="${dirty}"` : ""}
    ${extra} aria-label="${esc(label ?? hint)}" title="${esc(hint)}" ${isDisabled ? "disabled" : ""}>${label === null ? '<span aria-hidden="true">↺</span>' : esc(label)}</button>`;
}

/** Apply a batch selectionStates result without issuing per-row DB reads. */
function applyResetToOriginalStates(root, states, {busy = false} = {}) {
  if (!root || typeof root.querySelectorAll !== "function") {
    throw new TypeError("root must be a DOM container");
  }
  if (!states || typeof states !== "object") {
    throw new TypeError("states must be an object or Map");
  }
  root.querySelectorAll("[data-reset-to-original]").forEach(button => {
    const key = button.dataset.resetToOriginal;
    const dirty = states instanceof Map ? states.get(key) : states[key];
    if (typeof dirty !== "boolean") return;
    button.dataset.originalDirty = String(dirty);
    button.classList.toggle("dirty", dirty);
    button.disabled = busy || !dirty;
  });
}

/**
 * Bind every standard per-item reset button below root.  Pages own projection
 * refresh and error messaging; this helper centralizes confirmation and the
 * in-flight disabled state.
 */
function bindResetToOriginalButtons(root, onReset, {
  confirmMessage = null,
  states = null,
  busy = false,
} = {}) {
  if (!root || typeof root.querySelectorAll !== "function") {
    throw new TypeError("root must be a DOM container");
  }
  if (typeof onReset !== "function") {
    throw new TypeError("onReset must be callable");
  }
  if (states) applyResetToOriginalStates(root, states, {busy});
  root.querySelectorAll("[data-reset-to-original]").forEach(button => {
    button.addEventListener("click", () => {
      if (button.disabled || button.dataset.resetPending === "true") return;
      button.resetCompletion = (async () => {
        const itemId = button.dataset.resetToOriginal;
        const question = typeof confirmMessage === "function"
          ? confirmMessage(itemId, button)
          : confirmMessage;
        if (question && typeof globalThis.confirm === "function" &&
            !globalThis.confirm(question)) return;
        button.dataset.resetPending = "true";
        button.setAttribute("aria-busy", "true");
        button.disabled = true;
        try {
          await onReset(itemId, button);
        } finally {
          if (button.isConnected) {
            delete button.dataset.resetPending;
            button.removeAttribute("aria-busy");
            button.disabled = button.dataset.originalDirty === "false";
          }
        }
      })();
      return button.resetCompletion;
    });
  });
}

/** Field hosts use the standard control and delegate deletion to the field object. */
function bindFieldResetToOriginalButtons(root, fields, {
  beforeReset = null, afterReset = null, database = null, resourceId = null,
  changesFor = null, confirmMessage = null, onError = null,
  dirtyFor = selection => (Array.isArray(selection) ? selection : [selection])
    .some(field => field.hasOverride),
} = {}) {
  if (!(fields instanceof Map)) throw new TypeError("fields must be a Map");
  for (const button of root.querySelectorAll('[data-reset-to-original]')) {
    const selection = fields.get(button.dataset.resetToOriginal);
    const selected = Array.isArray(selection) ? selection : [selection];
    if (!selected.length || selected.some(field => !field || typeof field.bind !== 'function')) continue;
    const refresh = () => applyResetToOriginalStates(button.parentElement,
      new Map([[button.dataset.resetToOriginal, dirtyFor(selection)]]),
      {busy: button.dataset.resetPending === 'true'});
    let initializing = true;
    for (const field of selected) field.bind(button, () => {
      if (!initializing) refresh();
    });
    initializing = false;
    refresh();
  }
  bindResetToOriginalButtons(root, async key => {
    try {
      const selection = fields.get(key);
      const selected = Array.isArray(selection) ? selection : [selection];
      if (!selected.length || selected.some(field => !field || typeof field.reset !== "function")) {
        throw new TypeError(`未绑定重置字段：${key}`);
      }
      const context = await beforeReset?.(selection);
      // 版本只在调用方点名要固定时才传；其余交给字段层在写入那一刻取。
      const version = context?.expectedVersion;
      const saved = database ? await resetFieldObjectChanges(database,
        changesFor?.(selection, context) ??
          selected.map(field => ({field, reset: true, ...context?.fieldOptions})),
        {expectedVersion: version, resourceId, key}) : null;
      if (!database) for (const field of selected)
        await field.reset({...context?.fieldOptions, expectedVersion: version});
      // 只有恢复 Origin 真的成功才解除这一处失败；同一处可能同时挂在别的链上。
      // 失败的重置不动任何失败——原来那处保存失败要继续报。
      if (!database) clearAutoSaveErrorsOf(resetScopesOf(selection, key));
      await afterReset?.(selection, context, saved);
    } catch (error) {
      if (!onError) throw error;
      onError(error);
    }
  }, {confirmMessage});
}

/** Commit one atomic field-object reset batch and optionally reload its resource. */
async function resetFieldObjectChanges(database, changes, {
  expectedVersion = undefined, resourceId = null, key = null,
} = {}) {
  if (!Array.isArray(changes) || !changes.length ||
      changes.some(change => !change?.field || (change.reset !== true && !('value' in change))))
    throw new TypeError('字段对象重置批次无效');
  await database.writeFields(changes, {expectedVersion});
  clearAutoSaveErrorsOf(resetScopesOf(changes.map(change => change.field), key));
  return resourceId ? database.readResource(resourceId) : undefined;
}

// 重置的解除范围：这一处的字段与它们所属资源（旧入口按资源记账）。
function resetScopesOf(selection, key) {
  const selected = Array.isArray(selection) ? selection : [selection];
  const scopes = [key];
  for (const field of selected) {
    if (!field) continue;
    scopes.push(field);
    if (field.resourceId !== undefined) scopes.push(field.resourceId);
  }
  return scopes;
}

// @editor-module 文本字段对象的控制码标记、键入与插入菜单。

const hex = value => Number(value).toString(16).toUpperCase().padStart(2, "0");
const sample = (token, recordId) => textFillDetails(token, recordId)?.[2] || "示例值";

function tokenMarkup(item, recordId) {
  if (item.kind === 'fill') {
    const [short, full, example] = textFillDetails(item.token, recordId);
    return `<span class="text-runtime-token" title="${esc(`${full} · 示例：${example}`)}"><b>〔${esc(short)}〕</b>
      <small>$${hex(item.token)}${item.operands.map(value => ` $${hex(value)}`).join("")}</small>
      <button type="button" data-runtime-delete="${item.offset}" aria-label="删除 $${hex(item.token)} 填值码">删除</button></span>`;
  }
  return `<span class="text-runtime-character" title="${item.bytes.map(hex).join(" ")}">${esc(item.text)}</span>`;
}

function preview(record, tokens) {
  const tokenByOffset = new Map(tokens.map(item => [item.offset, item]));
  const structure = new Map(record.protected_ranges
    .filter(range => !Object.hasOwn(TEXT_FILL_OPERANDS, Number(range.token)))
    .map(range => [range.offset, range]));
  let result = "";
  for (let offset = 0; offset < record.capacity;) {
    const protectedRange = structure.get(offset);
    if (protectedRange) {
      if (protectedRange.token === 0xE5) result += "\n";
      offset += protectedRange.length;
      continue;
    }
    const item = tokenByOffset.get(offset);
    if (item) result += item.kind === "fill" ? sample(item.token, record.node_id) : item.text;
    offset += item?.bytes.length || 1;
  }
  return result.trim();
}

function runtimeEditorMarkup(document_, recordId, encoding, {compact = false} = {}) {
  const record = document_?.records?.[recordId];
  if (!record?.editable) return "";
  let tokens;
  try {
    tokens = textRecordRuntimeTokens(record, encoding, document_);
  } catch (error) {
    return `<section class="text-runtime-editor warning">${esc(error.message)}</section>`;
  }
  const options = [...TEXT_CONTROL_CODES].map(([token, [label]]) => {
    return `<option value="${token}">${esc(textFillDetails(token, recordId)?.[0] || label)} · $${hex(token)}</option>`;
  }).join("");
  return `<section class="text-runtime-editor" data-runtime-editor="${esc(recordId)}">
    <div class="section-line"><h3>控制码 · ${esc(recordId)}</h3><span>固定 ${record.capacity} B</span></div>
    <div class="text-runtime-token-list">${textRecordEditorTokens(record, encoding).map(item => tokenMarkup(item, recordId)).join("")}</div>
    <div class="text-runtime-example"><b>示例值预览</b><pre>${esc(preview(record, tokens))}</pre></div>
    ${compact ? `<details><summary>插入控制码</summary>` : ""}<div class="text-runtime-controls"><label>插入位置<select data-runtime-position>
      ${tokens.map(item => `<option value="${item.offset}">${item.offset} · ${esc(item.kind === "fill" ? `$${hex(item.token)}` : item.text)}</option>`).join("")}</select></label>
      <label>控制码<select data-runtime-token>${options}</select></label>
      <label>参数（十六进制，空格分隔）<input data-runtime-operands value="" spellcheck="false" placeholder="按控制码所需参数填写"></label>
      <button type="button" data-runtime-insert>插入</button>
      ${compact ? "" : resetToOriginalButton(recordId, {title: "恢复当前文字记录", attributes: {'data-runtime-reset': ''}})}</div>${compact ? "</details>" : ""}
    <details class="text-runtime-legend"${compact ? "" : " open"}><summary>键入写法</summary><table><thead><tr><th>标记</th><th>控制码</th><th>参数</th></tr></thead><tbody>
      ${[...TEXT_CONTROL_CODES].map(([token, [, operands]]) => `<tr><td>${esc(textControlMarker(token,
        operands.map(() => 0), recordId))}</td><td>$${hex(token)}</td><td>${esc(operands.join('、'))}</td></tr>`).join('')}
      <tr><td>〔字节:AB CD〕</td><td>AB CD</td><td>原始字节</td></tr>
    </tbody></table></details>
    <small data-runtime-operand-hint></small><div data-runtime-state role="status" aria-live="polite"></div>
  </section>`;
}

function bindRuntimeEditor(host, {getDocument, getEncoding, onSaved, beforeEdit = async () => {}, ranges = null, quiet = false}) {
  if (!host) return;
  const recordId = host.dataset.runtimeEditor;
  const status = host.querySelector("[data-runtime-state]");
  const tokenSelect = host.querySelector("[data-runtime-token]");
  const hint = host.querySelector("[data-runtime-operand-hint]");
  const updateHint = () => {
    const kinds = TEXT_CONTROL_CODES.get(Number(tokenSelect.value))[1];
    hint.textContent = kinds.length ? `需要 ${kinds.length} 个参数：${kinds.join("、")}` : "此控制码没有参数";
    host.querySelector("[data-runtime-operands]").title = hint.textContent;
  };
  tokenSelect.addEventListener("change", updateHint);
  updateHint();
  let busy = false;
  const resetButton = host.querySelector('[data-runtime-reset]');
  let resetField;
  const refreshReset = () => {
    if (resetButton && resetField) applyResetToOriginalStates(resetButton.parentElement,
      new Map([[recordId, resetField.hasOverride]]), {busy});
  };
  if (resetButton) void db.getField(TEXT_RECORDS_RESOURCE_ID, recordId, 'bytes').then(field => {
    resetField = field;
    field.bind(resetButton, refreshReset);
  }).catch(error => {editorLog.error("字段编辑", `文本字段载入失败：${error.message || error}`, error);});
  host.addEventListener("click", async event => {
    const insert = event.target.closest("[data-runtime-insert]");
    const deletion = event.target.closest("[data-runtime-delete]");
    const reset = event.target.closest("[data-runtime-reset]");
    if (!insert && !deletion && !reset || busy) return;
    busy = true;
    refreshReset();
    status.textContent = "";
    try {
      await beforeEdit();
      const field = await db.getField(TEXT_RECORDS_RESOURCE_ID, recordId, "bytes");
      if (reset) {
        await field.reset({expectedVersion: field.version});
      } else {
        const document_ = getDocument();
        const current = {...document_, records: {...document_.records,
          [recordId]: {...document_.records[recordId], bytes: [...field.value]}}};
        const operandsText = host.querySelector("[data-runtime-operands]").value.trim();
        const operands = operandsText ? operandsText.split(/\s+/u).map(value =>
          /^[0-9a-f]{1,2}$/iu.test(value) ? Number.parseInt(value, 16) : -1) : [];
        const result = editTextRecordFill(current, recordId, getEncoding(), {
          action: insert ? "insert" : "delete",
          offset: Number(insert ? host.querySelector("[data-runtime-position]").value : deletion.dataset.runtimeDelete),
          token: Number(tokenSelect.value), operands,
        });
        if (ranges && result.bytes.some((value, offset) => value !== field.value[offset]
          && !ranges.some(range => offset >= range.offset && offset < range.offset + range.length))) {
          throw new TypeError("该字段没有足够的空白字节");
        }
        await db.writeFields([{field, value: result.bytes, selection: ranges || field.editableRanges}],
          {expectedVersion: field.version});
      }
      await db.readResource(TEXT_RECORDS_RESOURCE_ID);
      status.textContent = "";
      await onSaved();
    } catch (error) {
      editorLog.error("字段编辑", `文本修改失败：${error.message || error}`, error);
    } finally {
      busy = false;
      refreshReset();
    }
  });
}

function inlineRuntimeEditorMarkup(document_, recordId, encoding, {ranges = null, editorId, label, mode = "capacity"} = {}) {
  const record = document_.records[recordId];
  const tokens = textRecordEditorTokens(record, encoding).filter(item =>
    !ranges || ranges.some(range => item.offset >= range.offset
      && item.offset + item.bytes.length <= range.offset + range.length));
  const parts = [];
  let run = [];
  const finish = () => {
    if (!run.length) return;
    const offset = run[0].offset;
    const length = run.at(-1).offset + run.at(-1).bytes.length - offset;
    const visible = [...run];
    while (visible.at(-1)?.kind === 'padding') visible.pop();
    const text = visible.map(item => item.text).join('');
    parts.push(`<span contenteditable="plaintext-only" data-runtime-plain
      data-runtime-ranges="${esc(JSON.stringify([{offset, length}]))}" role="textbox"
      aria-label="${esc(label)}" spellcheck="false">${esc(text || "\u200B")}</span>`);
    run = [];
  };
  for (const item of tokens) {
    if (item.kind === "protected") {
      finish();
      parts.push(`<span class="text-runtime-inline-token" contenteditable="false"
        title="${esc(item.bytes.map(hex).join(' '))}">${esc(item.text)}</span>`);
    } else if (item.kind === 'fill') {
      finish();
      const [, full, example] = textFillDetails(item.token, recordId);
      parts.push(`<span class="text-runtime-inline-token" title="${esc(`${full} · 示例：${example}`)}"><span
        contenteditable="plaintext-only" data-runtime-plain role="textbox" aria-label="${esc(label)}" spellcheck="false"
        data-runtime-ranges="${esc(JSON.stringify([{offset: item.offset, length: item.bytes.length}]))}">${esc(item.text)}</span><button type="button"
        data-runtime-delete="${item.offset}" aria-label="删除 ${esc(item.text)} 填值码">×</button></span>`);
    } else {
      if (run.length && run.at(-1).offset + run.at(-1).bytes.length !== item.offset) finish();
      run.push(item);
    }
  }
  finish();
  return `<div class="fixed-text-runtime-input" data-runtime-inline="${esc(recordId)}"
    data-runtime-editor-id="${esc(editorId)}" data-runtime-mode="${esc(mode)}" aria-label="${esc(label)}"
    title="键入：〔换行〕、〔等待〕、〔分页〕、〔名〕；参数：〔等帧:10〕；字节：〔字节:AB CD〕">${parts.join("")}</div>`;
}

const inlineBindings = new WeakMap();

function bindInlineRuntimeEditors(root, options) {
  if (!root.isConnected) return;
  const document_ = root.ownerDocument;
  const content = document_.querySelector("#content") || root;
  const fields = root.querySelectorAll("[data-runtime-inline]");
  if (!fields.length) return;
  let panel = content.querySelector("[data-runtime-page-panel]");
  if (!panel) {
    panel = document_.createElement("details");
    panel.className = "text-runtime-page-panel";
    panel.dataset.runtimePagePanel = "";
    content.append(panel);
  }
  const selectField = input => {
    panel.runtimeTarget = input;
    const binding = inlineBindings.get(input);
    if (!binding) return;
    const owner = input.closest("[data-fixed-text-editor]");
    const recordId = input.dataset.runtimeInline;
    const template = document_.createElement("template");
    template.innerHTML = runtimeEditorMarkup(binding.getDocument(), recordId, binding.getEncoding());
    const source = template.content.querySelector("[data-runtime-editor]");
    const controls = source.querySelector(".text-runtime-controls");
    controls.querySelector("[data-runtime-reset]").remove();
    const ranges = owner.dataset.fixedTextRanges ? JSON.parse(owner.dataset.fixedTextRanges) : null;
    if (ranges) for (const option of controls.querySelector("[data-runtime-position]").options) {
      if (!ranges.some(range => Number(option.value) >= range.offset
        && Number(option.value) < range.offset + range.length)) option.remove();
    }
    const record = binding.getDocument().records[recordId];
    const tokens = textRecordRuntimeTokens(record, binding.getEncoding(), binding.getDocument())
      .filter(item => !ranges || ranges.some(range => item.offset >= range.offset
        && item.offset + item.bytes.length <= range.offset + range.length));
    const example = ranges ? tokens.map(item => item.kind === "fill"
      ? sample(item.token, recordId) : item.text).join("").trimEnd() : preview(record, tokens);
    const targets = [...content.querySelectorAll("[data-runtime-inline]")];
    panel.innerHTML = `<summary>插入控制码</summary><section data-runtime-editor="${esc(recordId)}">
      <label>文字<select data-runtime-target>${targets.map((target, index) => `<option value="${index}"${target === input ? " selected" : ""}>${esc(target.dataset.runtimeEditorId)}</option>`).join("")}</select></label>
      <div class="text-runtime-example"><pre>${esc(example)}</pre></div>
      ${controls.outerHTML}${source.querySelector(".text-runtime-legend").outerHTML}
      <small data-runtime-operand-hint hidden></small><div data-runtime-state role="status"></div></section>`;
    panel.querySelector(".text-runtime-legend").removeAttribute("open");
    panel.querySelector("[data-runtime-target]").addEventListener("change", event =>
      selectField(targets[Number(event.target.value)]));
    bindRuntimeEditor(panel.querySelector("[data-runtime-editor]"), {...binding, ranges, quiet: true});
  };
  for (const input of fields) {
    const previous = inlineBindings.get(input);
    inlineBindings.set(input, options);
    const owner = input.closest("[data-fixed-text-editor]");
    if (options.resetRecordId === input.dataset.runtimeInline || !input.contains(document_.activeElement)
        || !document_.activeElement.matches("[data-runtime-plain]")) {
      const ranges = owner.dataset.fixedTextRanges ? JSON.parse(owner.dataset.fixedTextRanges) : null;
      const template = document_.createElement("template");
      template.innerHTML = inlineRuntimeEditorMarkup(options.getDocument(), input.dataset.runtimeInline,
        options.getEncoding(), {ranges, editorId: input.dataset.runtimeEditorId,
          label: input.getAttribute("aria-label"), mode: input.dataset.runtimeMode});
      input.innerHTML = template.content.firstElementChild.innerHTML;
      input.title = template.content.firstElementChild.title;
    }
    if (previous) continue;
    input.addEventListener("focusin", () => selectField(input));
    bindTextInputEvents(input, {selector: '[data-runtime-plain]',
      onInput: event => editPlain(event.target)});
    const editPlain = segment => {
      if (!segment.matches("[data-runtime-plain]")) return;
      inlineBindings.get(input).onInput({
        dataset: {fixedTextInput: input.dataset.runtimeEditorId,
          fixedTextRecord: input.dataset.runtimeInline,
          fixedTextRanges: segment.dataset.runtimeRanges, fixedTextMode: input.dataset.runtimeMode},
        value: segment.textContent.replaceAll("\u200B", ""),
        runtimeSegment: segment, setAttribute: (key, value) => input.setAttribute(key, value),
      });
    };
    input.addEventListener("click", event => {
      const deletion = event.target.closest("[data-runtime-delete]");
      if (!deletion) {
        if (event.target === input) input.querySelector("[data-runtime-plain]")?.focus();
        return;
      }
      selectField(input);
      const action = deletion.cloneNode(true);
      action.hidden = true;
      panel.querySelector("[data-runtime-editor]").append(action);
      action.click();
    });
  }
  selectField(panel.runtimeTarget?.isConnected ? panel.runtimeTarget : fields[0]);
}

// @editor-module text-record 的共用定长文字组件
//
// 页面只声明要编辑哪条稳定 record ID。本组件统一负责 Unicode 输入、按完整
// 字符截断、空字节补齐、保护结构命令与固定图块、延迟写入 working 层及单条还原；剧情、
// 游戏 UI 等消费者不再各写一套 text-record 保存循环。exact 模式拒绝任何字节数
// 变化；readonly 模式只投影同一条记录，不创建输入或保存入口。


const cloneJson = value => typeof structuredClone === "function"
  ? structuredClone(value) : JSON.parse(JSON.stringify(value));
const boundRoots = new WeakMap();
const liveControllers = new Set();

async function flushFixedTextEditors() {
  for (const reference of liveControllers) {
    const controller = reference.deref();
    if (!controller) {
      liveControllers.delete(reference);
      continue;
    }
    if (controller.error) throw new Error(controller.error);
    await controller.flush();
  }
}

function fixedTextFieldInputMarkup({value, label, maxLength = null,
  className = '', attributes = ''} = {}) {
  return `<input${className ? ` class="${esc(className)}"` : ''} type="text"
    value="${esc(value)}" aria-label="${esc(label)}" aria-invalid="false"
    autocomplete="off" spellcheck="false"${
      maxLength === null ? '' : ` maxlength="${esc(maxLength)}"`} ${attributes}>`;
}

function fixedTextInput(root, editorId) {
  return root?.querySelector?.(
    `[data-fixed-text-input="${CSS.escape(String(editorId || ""))}"], [data-runtime-editor-id="${CSS.escape(String(editorId || ""))}"]`,
  ) || null;
}

function fixedTextState(root, editorId) {
  return root?.querySelector?.(
    `[data-fixed-text-save-state="${CSS.escape(String(editorId || ""))}"]`,
  ) || null;
}

function sayFixedTextState(root, editorId, message, {invalid = false} = {}) {
  const input = fixedTextInput(root, editorId);
  if (input) {
    input.setAttribute("aria-invalid", String(invalid));
    input.setCustomValidity?.(invalid ? message : "");
  }
  const status = fixedTextState(root, editorId);
  if (status) {
    status.textContent = message;
    status.hidden = !message;
    status.classList.toggle("invalid", invalid);
  }
}

function fixedTextResultMessage(result) {
  if (result?.truncated_characters) {
    return `已按容量截断 ${result.truncated_characters} 个字`;
  }
  if (result?.padded_bytes) {
    return `剩余 ${result.padded_bytes} B 已自动补空`;
  }
  return "";
}

/** Unicode projection for plain-text consumers (titles, filters and options). */
function fixedTextRecordText(recordId, {
  document: document_ = state.project?.text_record_edits,
  encoding = state.project?.text_record_encoding,
} = {}) {
  const record = document_?.records?.[recordId];
  if (!record || !encoding) return "";
  return decodeFixedTextRecord(record, encoding).text;
}

/** 画面文字片段包含其后同一可写区间的补空字节。 */
function fixedTextRecordRangesWithPadding(recordId, ranges, {
  document: document_ = state.project?.text_record_edits,
  encoding = state.project?.text_record_encoding,
} = {}) {
  const record = textRecord(document_, recordId);
  const paddingEnds = new Map();
  for (const token of textRecordEditorTokens(record, encoding).reverse()) {
    if (token.kind !== 'padding') continue;
    const end = token.offset + token.bytes.length;
    paddingEnds.set(token.offset, paddingEnds.get(end) ?? end);
  }
  const writable = textRecordRuntimeWritableRanges(record);
  return ranges.map(({offset, length}) => {
    const span = writable.find(span => offset >= span.offset && offset + length <= span.offset + span.length);
    const end = Math.min(paddingEnds.get(offset + length) ?? offset + length,
      span ? span.offset + span.length : offset + length);
    return {offset, length: end - offset};
  });
}

/** 生成一条固定容量文字输入；内容始终从 text-record 当前文档现场解码。 */
function fixedTextEditorMarkup({
  recordId,
  editorId = recordId,
  ranges = null,
  document: document_ = state.project?.text_record_edits,
  encoding = state.project?.text_record_encoding,
  label = "字段名",
  description = "",
  className = "",
  mode = "capacity",
  compact = false,
  readonly = false,
  reset = true,
  resetOnly = false,
  runtime = true,
} = {}) {
  const id = String(recordId || "");
  const editor = String(editorId || id);
  let record = null;
  let decoded = null;
  let failure = "";
  try {
    record = document_ ? textRecord(document_, id) : null;
    if (!record) failure = "当前项目没有这条定长文字记录。";
    else if (!encoding) failure = "当前项目没有可用字符映射。";
    else decoded = ranges === null || ranges === undefined
      ? decodeFixedTextRecord(record, encoding)
      : runtime ? textRecordEditorSelection(record, encoding, document_, ranges)
        : decodeFixedTextRecordSelection(record, encoding, ranges);
  } catch (error) {
    failure = error?.message || String(error);
  }
  const capacity = Number(
    decoded?.editable_byte_capacity ?? record?.editable_byte_capacity,
  ) || 0;
  const editable = Boolean(!readonly && record?.editable && decoded && capacity > 0 && !failure);
  const reason = editable
    ? mode === "exact"
      ? `定长替换必须保持 ${capacity} 个编码字节；不足或超出均拒绝保存。`
      : runtime ? `固定容量；不足自动补空，超出拒绝写入，结构命令和固定图块保持原位。`
        : `固定 ${capacity} 个文字字节；不足自动补空，超出按完整字符截断，结构命令和固定图块保持原位。`
    : failure || record?.readonly_reason || "这条记录不可逐字编辑。";
  if (readonly || !editable) {
    return `<span class="fixed-text-readonly" data-fixed-text-record="${esc(id)}"
      data-fixed-text-runtime="${runtime}"
      data-fixed-text-ranges="${esc(ranges ? JSON.stringify(ranges) : "")}"
      title="${esc(readonly ? description : reason)}">${esc(record && encoding && !ranges
        ? textRecordEditorText(record, encoding) : decoded?.text || "—")}</span>`;
  }
  const serializedRanges = ranges === null || ranges === undefined
    ? "" : JSON.stringify(ranges);
  return `<div class="fixed-text-editor${compact ? " fixed-text-editor--compact" : ""}${className ? ` ${esc(className)}` : ""}"
    data-fixed-text-editor="${esc(editor)}"
    data-fixed-text-runtime="${runtime}"
    data-fixed-text-record="${esc(id)}"
    data-fixed-text-ranges="${esc(serializedRanges)}">
    ${resetOnly ? "" : `<label class="fixed-text-editor-field" title="${esc(description || reason)}">
      ${compact ? "" : `<span><b>${esc(label)}</b><small>${esc(id)}</small></span>`}
      ${runtime ? inlineRuntimeEditorMarkup(document_, id, encoding, {ranges, editorId: editor, label, mode}) : fixedTextFieldInputMarkup({value: decoded?.text || '', label,
        attributes: `data-fixed-text-input="${esc(editor)}"
          data-fixed-text-record="${esc(id)}"
          data-fixed-text-ranges="${esc(serializedRanges)}"
          data-fixed-text-mode="${esc(mode)}"${editable ? '' : ' disabled'}`})}
    </label>`}
    <div class="fixed-text-editor-actions">
      ${resetOnly ? "" : `<span data-fixed-text-save-state="${esc(editor)}" aria-live="polite" hidden></span>`}
      ${reset ? resetToOriginalButton(editor, {
        title: serializedRanges
          ? "只把这个字段恢复到 Original；同一条记录的其他字段保留"
          : "把这条文字恢复到 Original；同一资源里的其他编辑保留",
        disabled: !editable,
      }) : ""}
    </div>
  </div>`;
}

/**
 * 绑定一个根节点下的全部固定文字输入。回调只处理页面自己的投影/重绘；编码、
 * 校验与还原由本组件拥有，写入的等待、排队与失败记账归字段层的自动写入链。
 */
function bindFixedTextEditors(root, {
  database = db,
  reuse = null,
  getDocument = () => state.project?.text_record_edits || null,
  getEncoding = () => state.project?.text_record_encoding || null,
  getRepository = () => requireBrowserProjectRepository(state),
  onDraft = () => {},
  onSaved = null,
  onReset = async () => {},
  onState = () => {},
} = {}) {
  if (!root) return null;
  if (boundRoots.has(root)) {
    const controller = boundRoots.get(root);
    controller.refreshBindings();
    return controller;
  }
  if (reuse?.rebind(root)) return reuse;
  const project = state.project;
  const repository = getRepository();
  const revision = state.browserProjectManifest?.active_original_revision_id;
  const sessionMatches = () => state.project === project &&
    state.projectRepository === repository &&
    state.browserProjectManifest?.active_original_revision_id === revision;
  const notifySaved = async event => {
    if (sessionMatches()) {
      project.text_record_edits = event.saved.value.document;
      project.text_record_dirty = Boolean(event.saved.dirty);
    }
    if (onSaved) await onSaved(event);
    refreshRuntimeEditors({resetRecordId: event.reset ? event.recordId : null});
  };
  const refreshRuntimeEditors = ({resetRecordId = null} = {}) => bindInlineRuntimeEditors(root, {
    getDocument, getEncoding, resetRecordId,
    beforeEdit: async () => {
      await flush();
      if (!sessionMatches()) throw new Error("项目会话已切换，请重新打开文字编辑器");
    },
    onSaved: async () => {
      const saved = await database.readResource(TEXT_RECORDS_RESOURCE_ID);
      await notifySaved({saved, changes: [], root});
    },
    onInput: handleInput,
  });
  let generation = 0;
  const latest = new Map();
  const pending = new Map();
  const invalid = new Map();
  const saving = new Map();

  const queue = (editorId, recordId, ranges, result) => {
    const changeGeneration = ++generation;
    latest.set(editorId, changeGeneration);
    pending.set(editorId, {
      editorId,
      recordId,
      ranges,
      bytes: result.bytes.slice(),
      result,
      generation: changeGeneration,
    });
    onState();
    // 等待防抖、排队与正在提交都归字段层那一条链（`core/project-db.js`）：
    // 这一笔不进任何自建计时器，改动立即排进去，状态栏从同一份记账读。
    void flush().catch(error => showEditorError(root, "定长文字自动写入失败", error));
  };

  const flush = async () => {
    const changes = [...pending.values()].sort(
      (left, right) => left.generation - right.generation,
    );
    if (!changes.length) {
      // 只有还在字段层链上的写入：等它落定，好让调用方看到落盘后的值。
      if (hasPendingAutoSaves()) await flushAllAutoSaves();
      return;
    }
    for (const change of changes) saving.set(change.editorId, change);
    await (async () => {
      try {
        if (state.browserProjectManifest?.active_original_revision_id !== revision ||
            state.projectRepository !== repository) {
          throw new Error("项目会话已切换，请重新打开文字编辑器");
        }
        const grouped = new Map();
        for (const change of changes) {
          const field = await database.getField(TEXT_RECORDS_RESOURCE_ID, change.recordId, "bytes");
          let entry = grouped.get(field);
          if (!entry) grouped.set(field, entry = {field, value: [...field.value], indices: new Set()});
          const ranges = change.ranges || field.editableRanges;
          for (const range of ranges) for (let offset = range.offset; offset < range.offset + range.length; offset++) {
            entry.value[offset] = change.bytes[offset];
            entry.indices.add(offset);
          }
        }
        const writes = [...grouped.values()].map(({field, value, indices}) => {
          const selection = [];
          for (const offset of [...indices].sort((a, b) => a - b)) {
            const last = selection.at(-1);
            if (last && last.offset + last.length === offset) last.length++;
            else selection.push({offset, length: 1});
          }
          return {field, value, selection};
        });
        await database.writeFields(writes, {expectedVersion: writes[0].field.version});
        const saved = await database.readResource(TEXT_RECORDS_RESOURCE_ID);
        await notifySaved({saved, changes, root});
        for (const change of changes) {
          if (latest.get(change.editorId) === change.generation) {
            sayFixedTextState(
              root,
              change.editorId,
              root.querySelector("[data-runtime-inline]") ? "" : fixedTextResultMessage(change.result),
            );
          }
        }
      } catch (error) {
        for (const change of changes) {
          if (latest.get(change.editorId) === change.generation) {
            sayFixedTextState(
              root,
              change.editorId,
              `保存失败：${error?.message || error}`,
              {invalid: true},
            );
          }
        }
        throw error;
      } finally {
        for (const change of changes) {
          // 这一笔落定才把同代次的待写清掉：更新的一笔仍留着，写的是更全的值。
          if (latest.get(change.editorId) === change.generation) pending.delete(change.editorId);
          if (saving.get(change.editorId) === change) saving.delete(change.editorId);
        }
        onState();
      }
    })();
  };

  const handleInput = input => {
    if (input.disabled || input.readOnly) return;
    const editorId = String(input?.dataset.fixedTextInput || "");
    const recordId = String(input?.dataset.fixedTextRecord || "");
    const ranges = input?.dataset.fixedTextRanges
      ? JSON.parse(input.dataset.fixedTextRanges) : null;
    const source = getDocument();
    const encoding = getEncoding();
    if (!editorId || !recordId || !source || !encoding) return;
    const document_ = cloneJson(source);
    let result;
    try {
      const encode = input.dataset.fixedTextMode === "exact"
        ? exactFixedTextRecordBytes : fixedTextRecordBytes;
      result = input.runtimeSegment ? textRecordEditorBytes(document_, recordId, input.value,
        encoding, ranges, {exact: input.dataset.fixedTextMode === 'exact'}) : encode(
        document_, recordId, input.value, encoding, ranges,
      );
    } catch (error) {
      result = {ok: false, reason: `不能编码：${error?.message || error}`};
    }
    if (!result.ok) {
      const suffix = result.unsupported?.length
        ? `：${result.unsupported.join(" ")}` : "";
      const reason = `${result.reason}${suffix}`;
      invalid.set(editorId, {recordId, ranges, reason});
      pending.delete(editorId);
      latest.set(editorId, ++generation);
      sayFixedTextState(root, editorId, reason, {invalid: true});
      onState();
      return;
    }
    invalid.delete(editorId);
    installEncodedTextRecord(document_, result);
    input.value = result.text;
    if (input.runtimeSegment && result.truncated_characters) input.runtimeSegment.textContent = result.text || "\u200B";
    input.setAttribute("aria-invalid", "false");
    onDraft({
      document: document_, result, editorId, recordId, ranges, input, root,
    });
    sayFixedTextState(root, editorId, input.runtimeSegment ? "" : fixedTextResultMessage(result));
    queue(editorId, recordId, ranges, result);
  };

  // 身份读容器：`.fixed-text-editor` 上本来就有 editor / record / ranges，
  // 共用按钮只带 itemId，不再重复挂一份。
  const prepareReset = async (recordId, ranges) => {
    const matches = change => change.recordId === recordId &&
      (ranges === null || change.ranges?.every(range => ranges.some(selection =>
        range.offset >= selection.offset && range.offset + range.length <= selection.offset + selection.length)));
    for (const [id, change] of pending) if (matches(change)) pending.delete(id);
    for (const [id, change] of invalid) if (matches(change)) invalid.delete(id);
    for (const input of root.querySelectorAll("[data-fixed-text-input]")) {
      const inputRanges = input.dataset.fixedTextRanges ? JSON.parse(input.dataset.fixedTextRanges) : null;
      if (matches({recordId: input.dataset.fixedTextRecord, ranges: inputRanges})) input.__fieldResetPending = true;
    }
    await flush();
    if (!sessionMatches()) throw new Error("项目会话已切换，请重新打开文字编辑器");
    const field = await database.getField(TEXT_RECORDS_RESOURCE_ID, recordId, "bytes");
    return {field, expectedVersion: field.version, fieldOptions: {selection: ranges}, recordId, ranges};
  };
  const finishReset = async ({recordId, ranges}) => {
    const saved = await database.readResource(TEXT_RECORDS_RESOURCE_ID);
    await notifySaved({saved, changes: [], root, reset: true, recordId, ranges});
    onState();
    return saved;
  };
  const resetRecord = async (recordId, ranges = null) => {
    const context = await prepareReset(recordId, ranges);
    await context.field.reset({...context.fieldOptions, expectedVersion: context.expectedVersion});
    return finishReset(context);
  };
  const boundFields = new WeakSet();
  let ready = Promise.resolve();
  const bindFields = async () => {
    const hosts = root.querySelectorAll("[data-fixed-text-record]");
    for (const host of hosts) {
      if (boundFields.has(host)) continue;
      boundFields.add(host);
      const recordId = host.dataset.fixedTextRecord;
      const field = await database.getField(TEXT_RECORDS_RESOURCE_ID, recordId, "bytes");
      if (!host.isConnected || !sessionMatches()) continue;
      const ranges = host.dataset.fixedTextRanges ? JSON.parse(host.dataset.fixedTextRanges) : null;
      const editorId = host.dataset.fixedTextInput || host.dataset.fixedTextEditor;
      let previousText;
      field.bind(host, (element, bytes) => {
        const record = {...textRecord(getDocument(), recordId), bytes};
        const decoded = ranges
          ? host.dataset.fixedTextRuntime === 'true'
            ? textRecordEditorSelection(record, getEncoding(), getDocument(), ranges)
            : decodeFixedTextRecordSelection(record, getEncoding(), ranges)
          : decodeFixedTextRecord(record, getEncoding());
        if (element.matches("[data-fixed-text-input]")) {
          if (element.__fieldResetPending || (!pending.has(editorId) && !saving.has(editorId) && !invalid.has(editorId)
              && (previousText === undefined || element.value === previousText))) element.value = decoded.text;
          delete element.__fieldResetPending;
        } else if (element.matches(".fixed-text-readonly")) element.textContent = decoded.text || "—";
        previousText = decoded.text;
      });
      if (host.matches("[data-fixed-text-editor]")) bindFieldResetToOriginalButtons(host,
        new Map([[editorId, field]]), {
          dirtyFor: field => ranges ? ranges.some(({offset, length}) =>
            field.value.slice(offset, offset + length).some((value, index) =>
              value !== field.defaultValue[offset + index])) : field.hasOverride,
          beforeReset: () => prepareReset(recordId, ranges),
          afterReset: async (_field, context) => {
            const saved = await finishReset(context);
            await onReset({saved, editorId, recordId, ranges, root});
            sayFixedTextState(root, editorId, "");
          },
          onError: error => sayFixedTextState(root, editorId, `还原失败：${error?.message || error}`, {invalid: true}),
        });
    }
  };

  const refreshBindings = () => {
    refreshRuntimeEditors();
    ready = bindFields();
    void ready.catch(error => showEditorError(root, "文字字段绑定失败", error));
    return ready;
  };

  const bindRoot = () => {
    bindTextInputEvents(root, {selector: '[data-fixed-text-input]', onInput: event => {
      if (event.composedPath().find(node => boundRoots.has(node)) !== root) return;
      const input = event.target.closest?.("[data-fixed-text-input]");
      if (input) handleInput(input);
    }});
    refreshBindings();
  };

  const controller = Object.freeze({
    // A list/detail rerender replaces the form, not the pending text edit.
    // Keep its queue and validation so a later invalid input cancels the same
    // pending record. Never transfer a controller between project sessions.
    rebind(nextRoot) {
      if (root.isConnected || !sessionMatches()) return false;
      boundRoots.delete(root);
      root = nextRoot;
      boundRoots.set(root, controller);
      bindRoot();
      return true;
    },
    // 落定这一页的待写：字段层的链没有自建计时器，直接等它跑完。
    flush,
    resetRecord,
    prepareReset,
    finishReset,
    refreshBindings,
    get ready() { return ready; },
    isDirty(recordId) {
      return [...pending.values(), ...saving.values(), ...invalid.values()]
        .some(change => change.recordId === recordId);
    },
    get error() { return invalid.values().next().value?.reason || ""; },
    get dirtyCount() {
      return new Set([...pending.values(), ...saving.values(), ...invalid.values()]
        .map(change => change.recordId)).size;
    },
    get pending() { return pending.size > 0 || saving.size > 0; },
  });
  boundRoots.set(root, controller);
  liveControllers.add(new WeakRef(controller));
  bindRoot();
  return controller;
}

// @editor-module 怪物战斗图形的浏览器现画
//
// 像素权威是 `shared-chr-bank` 的 2bpp 位面，配方权威是可编辑的 `monster-visual-layout`
// 正文。这里不消费任何预渲染 PNG，也不读 `game/visuals/index.json` 那份提取期
// 派生视图——派生视图已经把 bank_code/dimension 展开成 chr_banks/width/height/
// tiles，改了原始字段它不会跟着变。
//
// 与 Python 侧 `mm_visual._render_monster` 的对应关系（两边必须逐像素一致）：
//   bank 选择   `_monster_bank_set`
//   流长度      `_monster_stream_length`
//   布局解码    `decode_monster_layout`（$02FEBE-$02FFBA 建的 nametable 矩阵）
//   双调色板    `_monster_dual_palette_layouts`（$17:$BED6 的 $FF 分隔属性图）
//   取图块      `_monster_tile`
//   上色        `_paint_tile`（色号 0 = 透明衬底）


// 与 Python 预览一致的显示衬底色。它只是「透明」的可见表示，不是 NES 颜色。
const FIGURE_MATTE = Object.freeze([11, 14, 16]);

const paintedMonsterCanvases = new WeakSet();

async function monsterRecipes() {
  const document_ = await db.getDocument("monster-visual-layout", null);
  if (!document_) throw new TypeError("monster-visual-layout 配方正文不可用");
  return monsterVisualRecipes(document_);
}

/** `_monster_tile`：把 tile 号解成 8×8 的 4 色索引。 */
function decodeTile(banks, tileId, sequential) {
  let bankIndex;
  let local;
  if (sequential && banks.length === 1) {
    bankIndex = 0;
    local = tileId & 0x3f;
  } else {
    bankIndex = Math.floor(tileId / 0x40);
    local = tileId % 0x40;
  }
  if (bankIndex >= banks.length) {
    throw new TypeError(`怪物图块 ${tileId.toString(16)} 超出已映射的 CHR 页`);
  }
  const bank = banks[bankIndex];
  const start = local * 16;
  const pixels = new Uint8Array(64);
  for (let row = 0; row < 8; row += 1) {
    const low = bank[start + row];
    const high = bank[start + row + 8];
    for (let column = 0; column < 8; column += 1) {
      const bit = 7 - column;
      pixels[row * 8 + column] =
        ((low >> bit) & 1) | (((high >> bit) & 1) << 1);
    }
  }
  return pixels;
}

/**
 * 解析一个怪物图形的完整绘制输入。
 *
 * `enemyId` 决定调色板（同一图形不同敌人可以换色）；不给就用该图形的第一个敌人。
 */
async function monsterFigureSources({
  graphicId, enemyId = null, paletteIds = null,
}) {
  const {byGraphic, byEnemy, palettes} = await monsterRecipes();
  let figure = null;
  let enemy = null;
  if (enemyId !== null && enemyId !== undefined && enemyId !== "") {
    enemy = byEnemy.get(Number(enemyId)) || null;
    if (enemy) figure = byGraphic.get(enemy.graphicId) || null;
  }
  if (!figure) {
    const id = Number(graphicId ?? enemy?.graphicId);
    figure = byGraphic.get(id) || null;
    if (!enemy) {
      for (const candidate of byEnemy.values()) {
        if (candidate.graphicId === id) {
          enemy = candidate;
          break;
        }
      }
    }
  }
  if (!figure) throw new TypeError(`怪物图形 ${graphicId} 不在 monster-visual-layout 里`);
  // **显式调色板优先。** 「这个图形换成那组色是什么样」是选色时唯一要回答的问题；
  // 没有这条覆盖，就只能拿某只怪物现有的配色去预览，等于看不到候选。
  const effectivePaletteIds = Array.isArray(paletteIds) && paletteIds.length
    ? paletteIds.map(Number)
    : (enemy?.paletteIds?.length ? enemy.paletteIds : [0]);
  const resolved = effectivePaletteIds.map(id => {
    const palette = palettes.get(Number(id));
    if (!palette) throw new TypeError(`怪物调色板 ${id} 缺失`);
    return palette;
  });
  // 直接 tilemap 会故意指向尚未分配的战斗槽；游戏在 $BFC0 装页之前把它们初始化
  // 成共享战斗页 $13，这里照做，否则会误报「超出已映射的 CHR 页」。
  const bankIds = [...figure.banks];
  if (figure.id >= MONSTER_SEQUENTIAL_GRAPHICS) {
    while (bankIds.length < 4) bankIds.push(0x13);
  }
  const banks = await Promise.all(bankIds.map(loadChrBankBytes));
  return {figure, banks, palettes: resolved};
}

/**
 * 按 `_render_monster` 的几何算出 RGBA 像素。
 *
 * 刻意不碰 DOM：返回裸缓冲区，`ImageData` 只在真正要画到 canvas 时才构造。
 * 对拍合同就是直接调它，Node 里没有 `ImageData` 也能跑。
 *
 * `scale` 是逻辑像素倍率，四周留 4 个逻辑像素的边——和 Python 预览完全一致，
 * 这样两边才能逐像素比。
 */
function monsterFigureImage(
  {figure, banks, palettes}, scale = 4,
  {background = FIGURE_MATTE} = {},
) {
  const padding = 4;
  const width = (figure.widthTiles * 8 + padding * 2) * scale;
  const height = (figure.heightTiles * 8 + padding * 2) * scale;
  const data = new Uint8ClampedArray(width * height * 4);
  if (background) {
    const [matteR, matteG, matteB] = background;
    for (let index = 0; index < data.length; index += 4) {
      data[index] = matteR;
      data[index + 1] = matteG;
      data[index + 2] = matteB;
      data[index + 3] = 255;
    }
  }
  const attributeWidth = Math.max(1, figure.widthTiles >> 1);
  const cells = figure.dual && palettes.length > 1 ? figure.dual.cells : null;
  const sequential = figure.id < MONSTER_SEQUENTIAL_GRAPHICS;
  figure.tiles.forEach((tileId, index) => {
    if (tileId === null) return;
    const tile = decodeTile(banks, tileId, sequential);
    const originX = (padding + (index % figure.widthTiles) * 8) * scale;
    const originY = (padding
      + Math.floor(index / figure.widthTiles) * 8) * scale;
    let component = 0;
    if (cells) {
      const attributeIndex =
        Math.floor(Math.floor(index / figure.widthTiles) / 2) * attributeWidth
        + Math.floor((index % figure.widthTiles) / 2);
      if (attributeIndex < cells.length) component = cells[attributeIndex];
    }
    const palette = palettes[component] || palettes[0];
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        const colorIndex = tile[y * 8 + x];
        if (colorIndex === 0) continue;   // 色号 0 是透明，保留衬底
        const [red, green, blue] = nesPalette[palette[colorIndex] & 0x3f];
        for (let sy = 0; sy < scale; sy += 1) {
          const rowStart = ((originY + y * scale + sy) * width) * 4;
          for (let sx = 0; sx < scale; sx += 1) {
            const target = rowStart + (originX + x * scale + sx) * 4;
            data[target] = red;
            data[target + 1] = green;
            data[target + 2] = blue;
            data[target + 3] = 255;
          }
        }
      }
    }
  });
  return {width, height, data};
}

/**
 * 把一个怪物图形画进 canvas。
 *
 * `box` 给定时画成固定见方画布并居中（取代原来 320×320 的 thumbnail PNG），
 * 否则按 `scale` 画成原始尺寸（取代 previews PNG）。
 */
async function paintMonsterFigure(canvas, {
  graphicId, enemyId, scale = 4, box = 0, paletteIds = null,
}) {
  const sources = await monsterFigureSources({graphicId, enemyId, paletteIds});
  const {figure} = sources;
  let effectiveScale = scale;
  if (box) {
    const logicalWidth = figure.widthTiles * 8 + 8;
    const logicalHeight = figure.heightTiles * 8 + 8;
    effectiveScale = Math.max(1, Math.min(
      5,
      Math.floor(box / logicalWidth),
      Math.floor(box / logicalHeight)));
  }
  const {width, height, data} = monsterFigureImage(sources, effectiveScale);
  const context = canvas.getContext("2d", {willReadFrequently: false});
  if (!context) return;
  const image = new ImageData(data, width, height);
  if (box) {
    // **`box` 是下限不是上限。** 整数缩放最小就是 1 倍，79 个怪物图形里有 13 个
    // 那时仍然超出方框（最大 104×136）——按 box 裁掉，画面上就只剩中间一截。
    // 画布取 box 与内容的较大者，整只怪物一定在里面；显示尺寸交给 CSS 去收。
    const canvasWidth = Math.max(box, width);
    const canvasHeight = Math.max(box, height);
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    context.fillStyle = `rgb(${FIGURE_MATTE.join(",")})`;
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    context.putImageData(
      image,
      Math.floor((canvasWidth - width) / 2),
      Math.floor((canvasHeight - height) / 2));
  } else {
    canvas.width = width;
    canvas.height = height;
    context.putImageData(image, 0, 0);
  }
  canvas.dataset.monsterFigurePainted = "1";
  paintedMonsterCanvases.add(canvas);
}

/**
 * 渲染后统一扫一遍 `[data-monster-figure]` 并批量画。
 *
 * 与 `paintUiConstructionCanvases` 同一形状：共享正文只取一次，没有目标就直接
 * 返回，绝不为一张缩略图单独拉一次配方。
 */
async function paintMonsterFigureCanvases(root = document) {
  const canvases = [...root.querySelectorAll("canvas[data-monster-figure]")];
  if (!canvases.length) return;
  try {
    await monsterRecipes();
  } catch (error) {
    canvases.forEach(canvas => {
      canvas.dataset.monsterFigureError = String(error?.message || error);
    });
    return;
  }
  await Promise.all(canvases.map(async canvas => {
    if (paintedMonsterCanvases.has(canvas)) return;
    try {
      await paintMonsterFigure(canvas, {
        graphicId: canvas.dataset.monsterFigure === ""
          ? null : Number(canvas.dataset.monsterFigure),
        enemyId: canvas.dataset.monsterFigureEnemy === undefined
          ? null : Number(canvas.dataset.monsterFigureEnemy),
        scale: Number(canvas.dataset.monsterFigureScale || 4),
        box: Number(canvas.dataset.monsterFigureBox || 0),
        paletteIds: canvas.dataset.monsterFigurePalettes
          ? canvas.dataset.monsterFigurePalettes.split(",").map(Number) : null,
      });
      delete canvas.dataset.monsterFigureError;
    } catch (error) {
      canvas.dataset.monsterFigureError = String(error?.message || error);
    }
  }));
}

/** 给消费方用的标记生成器，避免每个视图各拼一遍 dataset。 */
function monsterFigureCanvas({
  graphicId = null, enemyId = null, box = 0, scale = 4, className = "", label = "",
  paletteIds = null,
} = {}) {
  const attributes = [
    `data-monster-figure="${graphicId === null ? "" : Number(graphicId)}"`,
    Array.isArray(paletteIds) && paletteIds.length
      ? `data-monster-figure-palettes="${paletteIds.map(Number).join(",")}"` : "",
    enemyId === null || enemyId === undefined
      ? "" : `data-monster-figure-enemy="${Number(enemyId)}"`,
    box ? `data-monster-figure-box="${Number(box)}"` : "",
    scale !== 4 ? `data-monster-figure-scale="${Number(scale)}"` : "",
    className ? `class="${className}"` : "",
    label ? `aria-label="${label}"` : "",
  ].filter(Boolean).join(" ");
  return `<canvas ${attributes}></canvas>`;
}

var monsterFigure = /*#__PURE__*/Object.freeze({
  __proto__: null,
  monsterFigureCanvas: monsterFigureCanvas,
  monsterFigureImage: monsterFigureImage,
  monsterFigureSources: monsterFigureSources,
  paintMonsterFigureCanvases: paintMonsterFigureCanvases
});

export { $, ACTOR_ANCHOR, ACTOR_ENTRY_SCENE_OBJECT, ACTOR_ENTRY_TYPE_SELECTOR, ACTOR_MOTION_DIRECTIONAL, ACTOR_MOTION_DIRECTIONLESS, ACTOR_MOTION_SINGLE, CLEAN_CANVAS, HUMAN_CATEGORIES, HUMAN_EQUIPMENT_CATEGORIES, ITEM_CATEGORIES, PALETTE_MAX, PICKER_COLUMNS, PICKER_TILES, TANK_EQUIPMENT_CATEGORIES, TILE_BYTES, actorAppearanceCatalog, actorAppearanceCatalogFromDocument, actorAppearanceThumbnail, actorAtlas, actorAtlasCanvas, actorAtlasImage, actorMotionCatalogFromDocument, actorPoseForAppearance, actorPreviewPoses, actorSetBanks, actorSetSources, actorSpriteSheetUrl, actorTiles, advanceFieldChrAnimation, applyResetToOriginalStates, applySceneTownNames, applyTeleportDestinationNames, attackAnimationCommandSegments, attackAnimationState, attackFramePalettes, attackVisualCanvas, attributeByteWith, attributeIndexAt, audioCommandLabel, battleActionCanvas, battleActionPlacements, bindCanvasPickerPreview, bindCanvasViewport, bindFieldResetToOriginalButtons, bindFixedTextEditors, bindGroupedReferenceSelect, bindNametablePainting, bindNavigationTree, bindPickerConfirmation, bindPickerPreview, bindRecordLinks, bindReferencePicker, bindResetToOriginalButtons, bindRuntimeEditor, bindSidebarToggle, bindStoryPageRecovery, bindTextInputEvents, bindVirtualTables, blitRaster, byteRecords, bytes, canvasViewportControls, canvasViewportPoint, chrPatternByteSource, cleanAnimationFrames, closePickerSurface, compactResourceAddress, composeChrPatternTable, composeCorePatternTable, configureAnimatedResourcePicker, configureChrContextTileSelector, createRaster, currentTextChoiceLabel, currentTextRecordCard, currentTextReference, currentTextReferenceLink, dataTable, datasetFacts, decodeChrTile, decodeChrTiles, decodeWebByteArray, defaultGeometry, deletePreviewCacheProject, directPhysicalAddress, editorErrorMarkup, effectObjectMotionCanvas, equipmentItemChoices, esc, expandResourceByteRangeSlots, fieldChrAnimationDuration, fieldChrAnimationMask, fieldChrAnimationPlaybackPhase, fieldChrAnimationRecipe, fieldElevatorSceneRanges, fieldPaletteSheetUrl, fieldTerrainMotion, fixedTextEditorMarkup, fixedTextFieldInputMarkup, fixedTextRecordRangesWithPadding, fixedTextRecordText, flushCanvasViewportLayouts, flushFixedTextEditors, handleMarkup, handleTextMarkup, hex$1 as hex, hydrateItemPickers, hydrateModuleComponents, hydrateReferenceFieldPickers, indexedByteSource, indexedResource, invalidateSceneSurface, itemPickerFieldMarkup, itemPickerMarkup, itemResourceUid, listChrBankIds, loadChrBankBytes, loadElevatorMetatiles, loadSceneElevators, loadSceneMetatileRenderer, loadSceneRegionById, loadSceneResourceDocumentById, loadSceneSurface, loadSceneSurfaceById, loadSceneViewportById, loadStorySceneMetatileRenderer, loadWorldMetatileRenderer, markPickerSelection, metatileAttributeWithBehavior, metatileBehaviorCode, metatileBehaviorLabel, metatileBehaviorOptions, moduleComponentDefinition, monsterFigure, monsterFigureCanvas, monsterFigureImage, monsterFigureSources, nesPalette, openPickerSurface, outlineBox, paintActorAtlasCanvases, paintAttackVisualCanvases, paintBattleAction, paintBattleActionCanvases, paintChrTile, paintCleanFrame, paintEffectObjectMotionCanvases, paintFieldPalette, paintMonsterFigureCanvases, paintNametable, paintNametableWindow, paintSceneBoundaryMarkers, paintSceneLogicMarkers, paintSceneMap, paintSceneMapCell, paintSceneMetatileCells, paintSceneRuntimeMap, paintSceneThumbnailCanvases, paintVisibleSceneThumbnailCanvases, peekActorAppearance, physicalAddressLink, pickerVisibleOptions, plainTextRecordReferences, prepareAnimatedResourceOptions, prepareModuleComponent, prepareReferenceFieldPresentation, previewCacheProjectStats, projectSceneMetatileSources, recordUid, referenceFieldCurrentLabel, referenceFieldPickerMarkup, referencePickerMarkup, refreshReferencePickerGroups, registerModuleComponent, registerModuleComponentFallback, registerReferenceFieldPresentation, registerReferencePickerEnhancement, renderModuleComponent, resetToOriginalButton, resourceByteRanges, resourceDomain, resourceFieldByteRanges, resourceForwardReferenceCell, resourceLabel, resourcePhysicalAddressSummary, resourcePrimaryAddress, romMapAddressHref, runtimeEditorMarkup, sceneElevatorDestinations, sceneElevatorPoints, sceneInteractionTileChanges, sceneMapCell, sceneMetatileAttributeRecords, sceneRuntimeMap, sceneRuntimeMetatileId, sceneRuntimeMetatileOverlays, setChrContextTileReferences, setReferencePickerEmpty, setReferencePickerValue, setResourceAlert, setStatus, setTableStatus, setWeaponEffectPreviewPlayback, showEditorError, storyPageRecoveryButton, syncModuleComponents, syncReferencePickerControl, tableValueStack, textCharacterResourceUid, textRecordDisplayText, textRecordReferenceCell, uiBlankCanvas, uiHexBytes, uiPaintPattern, uiPaintResolvedMetasprite, uiPaintRomNametable, uiPaintRomTileGrid, uiPaintTileFill, uiPaintTileWrites, uiPutRgb, updateReferencePickerItem, updateReferencePickerItems, updateTableRowWindow, weaponEffectVm, worldZoneAt };
