// @editor-module 字段界面模块中已发布物理块的声明；派生图层不属于这里。
import {createPhysicalByteBlocksOwner} from "./physical-byte-blocks-owner.js";
import {fieldObjectControls} from './field-object.js';

function constrainedDataOwner(base, validateDocument) {
  return {...base, fieldOwner: Object.freeze({...base.fieldOwner,
    validate(original, overrides) {
      base.fieldOwner.validate(original, overrides);
      const candidate = structuredClone(original.document);
      const fields = new Map(base.fieldOwner.describe(original.document).map(field =>
        [JSON.stringify([field.entityHandle, field.fieldName]), field]));
      for (const row of overrides) {
        const field = fields.get(JSON.stringify([row.entity_handle, row.field_name]));
        const path = field.documentPath;
        const parent = path.slice(0, -1).reduce((node, key) => node[key], candidate);
        parent[path.at(-1)] = row.value;
      }
      validateDocument(candidate, original.document);
    },
  })};
}

export const uiWantedFieldOwner = createPhysicalByteBlocksOwner({
  owner: "ui-wanted", schema: "metalmaxcn.field-ui-module.asset.ui-wanted",
  blocksPath: ["code_blocks"]});

function physicalDataOwner({owner, schema}) {
  const base = createPhysicalByteBlocksOwner({owner, schema, blocksPath: ["blocks"]});
  const describe = document => base.fieldOwner.describe(document).map(field => {
    const block = document.blocks.find(candidate =>
      `${owner}:${candidate.id}` === field.entityHandle);
    const index = Number(field.fieldName.slice("value".length));
    const address = block?.address;
    if (!address || !Number.isInteger(index) || index < 0
        || address.length !== block.values.length || index >= address.length)
      throw new TypeError(`${owner} 字段物理位置无效`);
    const offset = address.offset + index;
    return {...field, physical: {space: address.space, offset, length: 1,
      end_exclusive: offset + 1}};
  });
  return {...base, fieldOwner: Object.freeze({...base.fieldOwner, describe})};
}

const rectangleOwner = constrainedDataOwner(physicalDataOwner({
  owner: "ui-tile-rectangle-service",
  schema: "metalmaxcn.field-ui-module.asset.ui-tile-rectangle-service"}), document => {
    for (const preset of document.rectangle_presets || []) rectanglePreset(document, preset.id);
  });

function rectanglePreset(document, id) {
  const preset = document.rectangle_presets?.find(row => row.id === id);
  const origin = document.blocks?.find(row => row.id === preset?.origin_block)?.values;
  const dimensions = document.blocks?.find(row => row.id === preset?.dimensions_block)?.values;
  if (origin?.length !== 2 || dimensions?.length !== 2)
    throw new TypeError(`矩形预设 ${id} 缺少来源字段`);
  const pointer = origin[0] | origin[1] << 8;
  if (pointer < 0x6000 || pointer >= 0x6400)
    throw new TypeError(`矩形预设 ${id} 不在逻辑画面缓冲区`);
  const logical_origin = pointer - 0x6000, [width_tiles, rows] = dimensions;
  if (width_tiles < 1 || rows < 1 || width_tiles > 32 || rows > 32
      || logical_origin % 32 + width_tiles > 32
      || logical_origin + (rows - 1) * 32 + width_tiles > 1024)
    throw new TypeError(`矩形预设 ${id} 超出逻辑画面缓冲区`);
  return {logical_origin, width_tiles, rows};
}

function rectangleFieldChanges(document, id, {column, row, width, rows}) {
  const preset = document.rectangle_presets.find(preset => preset.id === id);
  if (!preset || [column, row, width, rows].some(value => !Number.isInteger(value))
      || column < 0 || column > 31 || row < 0 || row > 31)
    throw new TypeError('矩形字段无效');
  const candidate = structuredClone(document), pointer = 0x6000 + row * 32 + column;
  const values = [[preset.origin_block, [pointer & 255, pointer >> 8]],
    [preset.dimensions_block, [width, rows]]];
  for (const [name, bytes] of values) candidate.blocks.find(block => block.id === name).values = bytes;
  rectanglePreset(candidate, id);
  return values.flatMap(([name, bytes]) => bytes.map((value, index) => ({
    entityHandle: `ui-tile-rectangle-service:${name}`, fieldName: `value${index}`, value,
  })));
}

export const uiTileRectangleServiceFieldOwner = {...rectangleOwner,
  fieldOwner: Object.freeze({...rectangleOwner.fieldOwner, rectanglePreset, rectangleFieldChanges,
    controls: fieldObjectControls('ui-tile-rectangle-service'),
  })};

const textRuntimeOwner = constrainedDataOwner(physicalDataOwner({
  owner: "text-render-runtime", schema: "metalmaxcn.field-ui-module.asset.text-render-runtime"}), document => {
    windowClearPreset(document);
    for (const preset of document.tile_transfer_presets || []) tileTransferPreset(document, preset.id);
  });

function windowClearPreset(document) {
  const selector = document.blocks?.find(row => row.id === 'window-clear-selector')?.values;
  if (selector?.length !== 1 || selector[0] % 2 !== 0 || ![0, 2, 6, 0x28, 0x2E].includes(selector[0]))
    throw new TypeError('窗口清除选择量缺少来源字段或不是双字节索引');
  return selector[0].toString(16).toUpperCase().padStart(2, '0');
}

function tileTransferPreset(document, id) {
  const preset = document.tile_transfer_presets?.find(row => row.id === id);
  const origin = document.blocks?.find(row => row.id === preset?.origin_block)?.values;
  const geometry = document.blocks?.find(row => row.id === preset?.geometry_block)?.values;
  const pointer = origin?.[0] | origin?.[1] << 8;
  if (origin?.length !== 2 || geometry?.length !== 4 || pointer < 0x6000 || pointer >= 0x6400)
    throw new TypeError(`图块传送预设 ${id} 缺少来源字段`);
  const logical_origin = pointer - 0x6000;
  const [column_offset, row_offset, width_tiles, rows] = geometry;
  if (width_tiles < 1 || rows < 1 || logical_origin % 32 + width_tiles > 32
      || logical_origin + (rows - 1) * 32 + width_tiles > 1024
      || column_offset + width_tiles > 32 || row_offset + rows > 30)
    throw new TypeError(`图块传送预设 ${id} 超出画面范围`);
  return {logical_origin, column_offset, row_offset, width_tiles, rows};
}

function tileTransferFieldChanges(document, id, {column, row, width, rows, destinationColumn, destinationRow}) {
  const preset = document.tile_transfer_presets.find(preset => preset.id === id);
  if (!preset || [column, row, width, rows, destinationColumn, destinationRow].some(value => !Number.isInteger(value))
      || column < 0 || column > 31 || row < 0 || row > 31
      || destinationColumn < 0 || destinationRow < 0)
    throw new TypeError('图块传送字段无效');
  const candidate = structuredClone(document), pointer = 0x6000 + row * 32 + column;
  const values = [[preset.origin_block, [pointer & 255, pointer >> 8]],
    [preset.geometry_block, [destinationColumn, destinationRow, width, rows]]];
  for (const [name, bytes] of values) candidate.blocks.find(block => block.id === name).values = bytes;
  tileTransferPreset(candidate, id);
  return values.flatMap(([name, bytes]) => bytes.map((value, index) => ({
    entityHandle: `text-render-runtime:${name}`, fieldName: `value${index}`, value,
  })));
}

export const textRenderRuntimeFieldOwner = {...textRuntimeOwner,
  fieldOwner: Object.freeze({...textRuntimeOwner.fieldOwner, windowClearPreset, tileTransferPreset, tileTransferFieldChanges,
    windowClearChoices: Object.freeze([0, 2, 6, 0x28, 0x2E]),
    controls: fieldObjectControls('text-render-runtime'),
  })};

const roleStatusOwner = constrainedDataOwner(physicalDataOwner({
  owner: "ui-role-status", schema: "metalmaxcn.field-ui-module.asset.ui-role-status"}), document => {
    for (const block of document.blocks) {
      const choices = block.id === 'experience-offset-table' ? [0, 3, 6] : [0x22, 0x23];
      if (block.values.some(value => !choices.includes(value))) throw new TypeError('人物状态引用超出已确认槽位');
    }
  });

export const uiRoleStatusFieldOwner = {...roleStatusOwner,
  objects: document => roleStatusOwner.objects(document).map(object => ({...object,
    editor: {...object.editor, columns: object.editor.columns.map((column, index) => ({...column,
      label: ['猎人', '机械师', '士兵'][index],
      min: object.id.endsWith('sex-record-table') ? 34 : 0,
      max: object.id.endsWith('sex-record-table') ? 35 : 6,
      step: object.id.endsWith('sex-record-table') ? 1 : 3,
    }))},
  })),
};

export const uiEquipmentControlFieldOwner = physicalDataOwner({
  owner: "ui-equipment-control", schema: "metalmaxcn.field-ui-module.asset.ui-equipment-control"});

export const uiPartyPairedSelectorFieldOwner = physicalDataOwner({
  owner: "ui-party-paired-selector", schema: "metalmaxcn.field-ui-module.asset.ui-party-paired-selector"});

export const saveSlotRuntimeServiceFieldOwner = physicalDataOwner({
  owner: "save-slot-runtime-service",
  schema: "metalmaxcn.field-ui-module.asset.save-slot-runtime-service"});
