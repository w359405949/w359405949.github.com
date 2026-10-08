// @editor-module 开机演出字段对象提供参数许可与序列化。
import {ROM_WRITE_PENDING, validateFieldOverrides, fieldFragmentId} from "./field-codec.js";
import {createNamedByteTablesOwner} from "./named-byte-tables-owner.js";

const BOOT_PRESENTATION_OWNER = "boot-presentation";
export const BOOT_PRESENTATION_SCHEMA = "metalmaxcn.boot-presentation.asset";
export const BOOT_PARAMETER_COMPILER_ID = "boot-parameters/v1";
export const BOOT_PARAMETER_COMPONENT_CODEC = "metalmaxcn.boot-parameter-byte";
const PARAMETER_SPECS = Object.freeze([
  ["boot-logo", "hold_frames", "boot-presentation.logo-parameter.hold_frames"],
  ...["scroll_y_start", "scroll_y_end", "segment_frames", "fade_frames_title_letters",
    "fade_frames_mountains", "fade_frames_captions"].map(name =>
    ["title", name, `boot-presentation.title-parameter.${name}`]),
]);

export function bootParameterComponentSpecs(resourceId) {
  bootParameterAssetSchema(resourceId);
  return PARAMETER_SPECS.map(([, , fragmentId]) => ({fragmentId, length: 1}));
}

export function bootParameterAssetSchema(resourceId) {
  if (resourceId !== BOOT_PRESENTATION_OWNER) throw new TypeError("启动参数身份无效");
  return BOOT_PRESENTATION_SCHEMA;
}

function permittedParameterFields(document) {
  const components = document?.writeback_components;
  if (document?.writeback?.compiler_id !== BOOT_PARAMETER_COMPILER_ID
      || components?.length !== PARAMETER_SPECS.length)
    throw new TypeError("启动参数写入许可未发布");
  return new Map(PARAMETER_SPECS.map(([screenId, name, fragmentId], index) => {
    const component = components[index];
    const bounds = component?.edit_domain?.allowed_integer_values;
    if (component?.fragment_id !== fragmentId || component.web_editable !== true
        || component.edit_domain?.status !== "confirmed"
        || bounds?.minimum !== (screenId === "boot-logo" ? 1 : 0) || bounds?.maximum !== 255)
      throw new TypeError("启动参数写入许可无效");
    return [`${BOOT_PRESENTATION_OWNER}:${screenId}.parameters/${name}`, {
      fragmentId, offsetInFragment: 0, byteLength: 1,
      editDomain: structuredClone(component.edit_domain),
    }];
  }));
}

function bootFieldDescriptions(document) {
  const permitted = permittedParameterFields(document);
  return codec.fieldOwner.describe(document).map(field => {
    const permission = permitted.get(`${field.entityHandle}/${field.fieldName}`);
    if (!permission) return field;
    const {writeback, ...description} = field;
    return {...description, ...permission};
  });
}

const SPRITE_TILE_SCHEMA = "metalmaxcn.boot-sprite-tile-reference";
const SPRITE_CONTEXT_SCHEMA = "metalmaxcn.boot-sprite-context-reference";
const TITLE_TILE_SOURCE = Object.freeze({resourceId: BOOT_PRESENTATION_OWNER});
const CHR_TILE_SOURCE = Object.freeze({resourceId: "shared-chr-bank"});

function spriteReference(schema, token) {
  return {schema, resource_id: "shared-chr-bank", token};
}

function spriteToken(reference, schema, prefix) {
  if (reference?.schema !== schema || reference.resource_id !== "shared-chr-bank"
      || typeof reference.token !== "string" || !reference.token.startsWith(prefix))
    throw new TypeError("标题精灵图块引用无效");
  return reference.token;
}

function spriteTileValue(reference) {
  const token = spriteToken(reference, SPRITE_TILE_SCHEMA, "T");
  if (!/^T[0-9A-F]{2}$/u.test(token)) throw new TypeError("标题精灵图块编号无效");
  return Number.parseInt(token.slice(1), 16);
}

function spriteTileReference(value) {
  if (!Number.isInteger(value) || value < 0 || value > 255)
    throw new TypeError("标题精灵图块编号须为字节");
  return spriteReference(SPRITE_TILE_SCHEMA, `T${value.toString(16).toUpperCase().padStart(2, "0")}`);
}

function titleSpriteTileBinding({contexts, candidates, consumer, value}) {
  if (consumer !== "title.sprites.tile" || !Array.isArray(contexts?.screens)
      || !Array.isArray(candidates?.banks)) throw new TypeError("标题精灵图像上下文缺失");
  const screen = contexts.screens.find(item => item.id === "title");
  const recipe = screen?.sprite_tile_context;
  if (recipe?.pattern_base !== 0x1000 || recipe.bank_window_bytes !== 0x800
      || recipe.bank_registers?.join(",") !== "0,1" || recipe.palette_index !== 0
      || !Array.isArray(screen?.palette) || screen.palette.length < 4)
    throw new TypeError("标题精灵图案表或调色板未发布");
  const bankStarts = recipe.bank_registers.map(register => {
    const bank = screen.chr_banks?.[String(register)];
    if (!Number.isInteger(bank) || bank < 0 || bank > 255)
      throw new TypeError("标题精灵 CHR bank 未发布");
    return bank & ~1;
  });
  const banks = new Map(candidates.banks.map(bank => [bank.id, bank]));
  const context = spriteReference(SPRITE_CONTEXT_SCHEMA, "TITLE");
  const pixels = (_context, reference) => {
    spriteToken(_context, SPRITE_CONTEXT_SCHEMA, "TITLE");
    const tileId = spriteTileValue(reference);
    const bankId = bankStarts[tileId >> 7] + ((tileId & 0x7f) >> 6);
    const tile = banks.get(bankId)?.tiles?.find(item => Number(item.id) === (tileId & 0x3f));
    if (!tile || tile.plane_0?.length !== 8 || tile.plane_1?.length !== 8)
      throw new TypeError(`标题精灵 CHR bank ${bankId} 图块缺失`);
    const result = new Uint8Array(64);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const bit = 1 << (7 - x);
      result[y * 8 + x] = (tile.plane_0[y] & bit ? 1 : 0)
        | (tile.plane_1[y] & bit ? 2 : 0);
    }
    return {pixels: result, palette: screen.palette.slice(0, 4), transparent: false};
  };
  const clone = reference => spriteReference(reference.schema,
    spriteToken(reference, reference.schema, reference.schema === SPRITE_CONTEXT_SCHEMA ? "TITLE" : "T"));
  const adapter = {clone, key: reference => `${reference.schema}:${reference.token}`,
    equal: (left, right) => left.schema === right.schema && left.token === right.token,
    token: reference => reference.token,
    reference: spriteTileReference,
    candidates: () => Array.from({length: 256}, (_, tile) => {
      const reference = spriteTileReference(tile);
      return {reference, ...pixels(context, reference)};
    }), pixels};
  return {contexts: [context], contextLabels: ["标题精灵 · 调色板 0"],
    reference: spriteTileReference(value), encode: spriteTileValue, adapter};
}

/**
 * 表名取「屏 id + 分量名」，与 `scene:<id>.map` 这类「记录 + 分量」同形；
 * 参数在可编辑正文里是一张「名字 → 字节」的图，所以一个参数一个字段。
 */
function screenTables(document) {
  const screens = document?.screens;
  if (!Array.isArray(screens) || !screens.length)
    throw new TypeError("boot-presentation: 缺少 screens");
  return screens.flatMap((screen, index) => {
    if (typeof screen?.id !== "string" || !screen.id)
      throw new TypeError("boot-presentation: 屏缺少 id");
    const parameters = screen.parameters;
    const names = parameters && typeof parameters === "object" && !Array.isArray(parameters)
      ? Object.keys(parameters) : null;
    if (!names || !names.length)
      throw new TypeError(`boot-presentation: 屏 ${screen.id} 缺少 parameters（现见 ${Object.keys(screen).join("、")}）`);
    for (const name of names) {
      const value = parameters[name];
      if (!Number.isInteger(value) || value < 0 || value > 0xff)
        throw new TypeError(`boot-presentation: 屏 ${screen.id} 的参数 ${name} 不是 0–255：${value}`);
    }
    return [
      // 参数在可编辑正文里是一张「名字 → 字节」的图：一个参数一个字段。
      {name: `${screen.id}.parameters`, label: `${screen.id} 参数`,
        length: names.length, fragmentId: null,
        pathBase: ["screens", index, "parameters"],
        keys: names.map(name => ({name, label: name}))},
      byteArrayTable(screen, index, "nametable"),
      byteArrayTable(screen, index, "palette"),
      ...(channelTable(screen, index) ? [channelTable(screen, index)] : []),
      ...fadeTables(screen, index),
      ...spriteTables(screen, index),
    ];
  });
}

/** 整段字节数组（nametable、调色板 entrada）：一段一个字段，与调色板种子同形。 */
function byteArrayTable(screen, index, name) {
  const value = screen?.[name];
  if (!Array.isArray(value) || !value.length)
    throw new TypeError(`boot-presentation: 屏 ${screen?.id} 的 ${name} 不是非空数组`);
  if (!value.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 0xff))
    throw new TypeError(`boot-presentation: 屏 ${screen.id} 的 ${name} 含非字节值`);
  return {name: `${screen.id}.${name}`, label: `${screen.id} ${name}`,
    length: 1, fragmentId: null, array: true, arrayWidth: value.length,
    pathAt: () => ["screens", index, name]};
}

/** CHR bank 通道：可编辑正文里是「寄存器号 → bank」的图，无该分量时不给表。 */
function channelTable(screen, index) {
  const channels = screen?.chr_banks;
  if (!channels || typeof channels !== "object" || Array.isArray(channels)) return null;
  const names = Object.keys(channels);
  if (!names.length) return null;
  for (const name of names) {
    const bank = channels[name];
    if (!Number.isInteger(bank) || bank < 0 || bank > 0xff)
      throw new TypeError(`boot-presentation: 屏 ${screen.id} 的 chr_banks ${name} 不是 0–255：${bank}`);
  }
  return {name: `${screen.id}.chr_banks`, label: `${screen.id} CHR bank 通道`,
    length: names.length, fragmentId: null,
    pathBase: ["screens", index, "chr_banks"],
    keys: names.map(name => ({name, label: `寄存器 ${name}`}))};
}

/** 渐显：一个名字一张表，一步一步一页四字节的调色板。 */
function fadeTables(screen, index) {
  const fades = screen?.fades;
  if (!fades || typeof fades !== "object" || Array.isArray(fades)) return [];
  return Object.keys(fades).flatMap(name => {
    const steps = fades[name];
    if (!Array.isArray(steps) || !steps.length || !steps.every(step =>
      Array.isArray(step) && step.length === 4
      && step.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 0xff)))
      throw new TypeError(`boot-presentation: 屏 ${screen.id} 的渐显 ${name} 不是每步四字节`);
    return [{name: `${screen.id}.fades.${name}`, label: `${screen.id} 渐显 ${name}`,
      length: steps.length, fragmentId: null, array: true, arrayWidth: 4,
      pathAt: position => ["screens", index, "fades", name, position]}];
  });
}

/** 精灵：一行一列一图块各一张表，逐行改得动，行序就是发布顺序。 */
function spriteTables(screen, index) {
  const sprites = screen?.sprites;
  if (!Array.isArray(sprites) || !sprites.length) return [];
  const columns = Object.keys(sprites[0]);
  for (const sprite of sprites) {
    if (Object.keys(sprite).join("、") !== columns.join("、"))
      throw new TypeError(`boot-presentation: 屏 ${screen.id} 的精灵行字段不一致`);
    for (const column of columns)
      if (!Number.isInteger(sprite[column]) || sprite[column] < 0 || sprite[column] > 0xff)
        throw new TypeError(`boot-presentation: 屏 ${screen.id} 的精灵 ${column} 不是 0–255`);
  }
  return columns.map(column => ({name: `${screen.id}.sprites.${column}`,
    label: `${screen.id} 精灵 ${column}`, length: sprites.length, fragmentId: null,
    pathAt: position => ["screens", index, "sprites", position, column]}));
}

const codec = createNamedByteTablesOwner({owner: BOOT_PRESENTATION_OWNER,
  schema: BOOT_PRESENTATION_SCHEMA, tables: screenTables, writeback: ROM_WRITE_PENDING});

export function bootPresentationObjects(document, options) {
  const fields = bootFieldDescriptions(document);
  return codec.objects(document, options).map(object => ({...object,
    fragmentIds: fields.filter(field => field.entityHandle === object.id)
      .map(field => field.fragmentId).filter(Boolean),
  })).map(object => object.id === `${BOOT_PRESENTATION_OWNER}:title.sprites.tile`
    ? {...object, editor: {...object.editor, columns: object.editor.columns.map(column => ({
      ...column, semantic: {kind: "image"}, tile: {
        contexts: TITLE_TILE_SOURCE, candidates: CHR_TILE_SOURCE,
        consumer: "title.sprites.tile", bind: titleSpriteTileBinding,
      },
    }))}} : object);
}
export function serializeBootPresentationField(field) {
  if (field.editDomain) {
    const bounds = field.editDomain.allowed_integer_values;
    if (!Number.isInteger(field.value) || field.value < bounds.minimum || field.value > bounds.maximum)
      throw new TypeError("启动参数超出写入许可");
  }
  return codec.serializeField(field);
}
export const bootPresentationFieldOwner = Object.freeze({...codec.fieldOwner,
  compilerId: BOOT_PARAMETER_COMPILER_ID, describe: bootFieldDescriptions, writeback: undefined,
  validatePreimage(fields, fragmentId, baseline) {
    const selected = fields.filter(field => fieldFragmentId(field) === fragmentId);
    if (selected.length !== 1 || baseline.length !== 1 || baseline[0] !== selected[0].defaultValue)
      throw new TypeError("启动参数 Origin 与基线不符");
  },
  validate(original, overrides) {
    validateFieldOverrides(original, overrides, bootFieldDescriptions, (asset, origin) => {
      codec.validateAsset(asset, origin);
      for (const field of bootFieldDescriptions(origin.document)) {
        if (!field.editDomain) continue;
        const value = field.documentPath.reduce((node, key) => node[key], asset.document);
        const bounds = field.editDomain.allowed_integer_values;
        if (value < bounds.minimum || value > bounds.maximum)
          throw new TypeError("启动参数超出写入许可");
      }
    });
  },
  encode(fields, {defaults = false} = {}) {
    return PARAMETER_SPECS.map(([, , fragmentId]) => {
      const field = fields.find(candidate => candidate.fragmentId === fragmentId);
      if (!field) throw new TypeError("启动参数片段缺失");
      return {fragment_id: fragmentId,
        payload: serializeBootPresentationField({...field, value: defaults ? field.defaultValue : field.value}),
        relocations: []};
    });
  },
});
