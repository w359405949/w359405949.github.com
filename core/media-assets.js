// @editor-module 将已发布 Web 媒体 JSON 解码为字节与 CHR pattern 表。
//
// 物理地址的唯一权威仍是 resource-byte-ranges；这里仅负责把项目中已经提取出的
// JSON 表示还原成浏览器可组合的媒体数据。预览代码不得以地址为由去读 ROM/.bin。

import {db} from "./project-db.js";
import {sha256Hex} from "./rom-linker.js";
import {VISUAL_CHR_BANK_IDS} from "./visual-compiler.js";
import {state} from "./state.js";
import {projectFieldDraftOrigin} from './project-field-draft.js';
import {indexedByteSource} from './indexed-byte-source.js';

const chrBankFieldCaches = new Map();
const webByteCaches = new WeakMap();

export async function composeCorePatternTable({lazy = false} = {}) {
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

export function chrPatternByteSource(document, bankIds) {
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

export async function webByteArrayDescriptor({payload, physical_sources = null, runtime_source = null}) {
  const data = Uint8Array.from(payload, (value, index) => byte(value, `payload[${index}]`));
  const parts = [];
  for (let start = 0; start < data.length; start += 0x8000) {
    parts.push(String.fromCharCode(...data.subarray(start, start + 0x8000)));
  }
  const result = {
    schema: "metalmaxcn.web-byte-array", encoding: "base64", length: data.length,
    sha256: await sha256Hex(data), source_addresses: [...(physical_sources || [])],
    data: btoa(parts.join("")),
  };
  if (runtime_source !== null) result.runtime_source = runtime_source;
  return result;
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
export async function decodeWebByteArray(descriptor, context = "Web 媒体资产") {
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
export async function loadChrBankBytes(bankId) {
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
export async function listChrBankIds() {
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
export async function composeChrPatternTable(bankIds) {
  if (!Array.isArray(bankIds) || !bankIds.length) {
    throw new TypeError("CHR pattern table 必须声明 bank 顺序");
  }
  const banks = await Promise.all(bankIds.map(loadChrBankBytes));
  const result = new Uint8Array(banks.length * 0x400);
  banks.forEach((bank, index) => result.set(bank, index * 0x400));
  return result;
}
