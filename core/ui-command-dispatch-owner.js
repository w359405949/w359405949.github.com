// @editor-module 模式命令指针由代码字段对象按已确认的调用契约编辑与序列化。
import {canonicalJsonEqual} from './project-store-values.js';
import {validateFieldOverrides, fieldRomValue} from './field-codec.js';
import {selectionMovementFieldOwner} from './selection-movement-owner.js';
import {uiLayoutComponentSpecs} from './ui-layout-data.js';

export const UI_COMMAND_DISPATCH_COMPILER_ID = 'ui-command-dispatch/v1';
export const UI_COMMAND_DISPATCH_COMPONENT_CODEC = 'metalmaxcn.ui-command-dispatch';
export const UI_MODE_COMMANDS = Object.freeze([0x41, 0x42, 0x43, 0x44]);
const OWNER = 'code-module';
const FRAGMENT = `${OWNER}.ui-mode-command-handlers`;
const handle = command => `${OWNER}:${command.toString(16).toUpperCase().padStart(2, '0')}`;
const require = (valid, message) => {if (!valid) throw new TypeError(message);};

export function uiCommandDispatchComponentSpecs(resourceId) {
  require(resourceId === OWNER, '界面命令字段对象身份无效');
  return [...uiLayoutComponentSpecs(resourceId), {fragmentId: FRAGMENT, length: 8}];
}

export function uiCommandDispatchAssetSchema(resourceId) {
  uiCommandDispatchComponentSpecs(resourceId);
  return `metalmaxcn.module-asset.${OWNER}`;
}

function table(document) {
  const index = document?.records?.findIndex(row => row.id === FRAGMENT);
  const record = document?.records?.[index];
  require(document?.module_id === OWNER && record?.values?.length === 8
    && record.values.every(value => Number.isInteger(value) && value >= 0 && value <= 255)
    && record.handlers?.length === 4 && record.address?.space === 'prg'
    && record.address.length === 8 && Number.isInteger(record.address.offset)
    && record.compatibility?.status === 'confirmed'
    && record.compatibility.handler_bank === 0x19
    && canonicalJsonEqual(record.compatibility.commands, UI_MODE_COMMANDS),
  '模式命令指针或调用契约未发布');
  const candidates = UI_MODE_COMMANDS.map((command, index) => ({command,
    value: record.values[index * 2] | record.values[index * 2 + 1] << 8}));
  require(new Set(candidates.map(row => row.value)).size === 4
    && candidates.every(row => row.value >= 0xa000 && row.value < 0xc000)
    && record.handlers.every(value => candidates.some(row => row.value === value)),
  '模式命令须选择调用现场兼容的既有处理器');
  return {record, index, candidates};
}

export function uiCommandDispatchTarget(document, command) {
  const index = UI_MODE_COMMANDS.indexOf(command);
  if (index < 0) return command;
  const {record, candidates} = table(document);
  return candidates.find(row => row.value === record.handlers[index]).command;
}

function describe(document) {
  const {record, index, candidates} = table(document);
  return UI_MODE_COMMANDS.map((command, slot) => ({resourceId: OWNER,
    entityHandle: handle(command), fieldName: 'handler_cpu',
    documentPath: ['records', index, 'handlers', slot], defaultValue: record.handlers[slot],
    allowedValues: candidates.map(row => row.value), fragmentId: FRAGMENT,
    offsetInFragment: slot * 2, byteLength: 2}));
}

function validateAsset(candidate, original) {
  require(candidate?.resource_id === OWNER && candidate.schema === uiCommandDispatchAssetSchema(OWNER)
    && candidate.edit_policy === 'mutable', '界面命令记录身份无效');
  const {record: next, index} = table(candidate.document);
  table(original.document);
  const expected = structuredClone(original);
  expected.document.records[index].handlers = structuredClone(next.handlers);
  require(canonicalJsonEqual(candidate, expected), '仅可修改模式命令的既有处理器绑定');
}

function position(field) {
  const index = UI_MODE_COMMANDS.findIndex(command => handle(command) === field.entityHandle);
  require(field.resourceId === OWNER && field.fieldName === 'handler_cpu' && index >= 0,
    '界面命令字段身份无效');
  return index;
}

function serializeUiCommandDispatchField(field) {
  position(field);
  require(Number.isInteger(field.value) && field.allowedValues.includes(field.value),
    '模式命令须选择调用现场兼容的既有处理器');
  return Uint8Array.of(field.value & 255, field.value >> 8);
}

function encode(fields, options = {}) {
  const bytes = new Uint8Array(8), seen = new Set();
  for (const field of fields) {
    const slot = position(field);
    require(!seen.has(slot), '界面命令字段重复');
    seen.add(slot);
    bytes.set(serializeUiCommandDispatchField({...field, value: fieldRomValue(field, options)}), slot * 2);
  }
  require(seen.size === 4, '模式命令字段不完整');
  return [{fragment_id: FRAGMENT, payload: bytes, relocations: []}];
}

function validatePreimage(fields, fragmentId, bytes) {
  require(fragmentId === FRAGMENT && fields.length === 4 && bytes.length === 8,
    '模式命令 Origin 长度或身份无效');
  const seen = new Set();
  for (const field of fields) {
    const slot = position(field);
    require(!seen.has(slot) && (bytes[slot * 2] | bytes[slot * 2 + 1] << 8) === field.defaultValue,
      '模式命令 Origin 与绑定基线不符');
    seen.add(slot);
  }
}

function objects(document) {
  const {index} = table(document);
  const handles = UI_MODE_COMMANDS.map(handle);
  return [{id: FRAGMENT, label: '模式命令', fragmentIds: [FRAGMENT],
    fields: handles.map(handle => [handle, 'handler_cpu']),
    editor: {kind: 'numeric-table', rows: handles,
      rowLabels: ['冒险数据', '情报', '动画', '音响'],
      columns: [{name: 'handler_cpu', label: '处理器', candidates: {
        resourceId: OWNER, documentPath: ['records', index, 'handler_candidates'],
        value: ['value'], label: ['label'],
      }}]},
  }];
}

const movementFragment = 'code-module.fixed-ui-table-core-a';
const describeCodeModule = document => [...describe(document), ...selectionMovementFieldOwner.describe(document)];

function validateCodeModuleAsset(asset, original) {
  const commands = structuredClone(asset);
  commands.document.records.find(row => row.id === movementFragment).values = structuredClone(
    original.document.records.find(row => row.id === movementFragment).values);
  validateAsset(commands, original);
  const movement = structuredClone(asset);
  movement.document.records.find(row => row.id === FRAGMENT).handlers = structuredClone(
    original.document.records.find(row => row.id === FRAGMENT).handlers);
  selectionMovementFieldOwner.validateAsset(movement, original);
}

export const uiCommandDispatchFieldOwner = Object.freeze({compilerId: UI_COMMAND_DISPATCH_COMPILER_ID,
  describe: describeCodeModule,
  validate: (original, overrides) => validateFieldOverrides(original, overrides, describeCodeModule, validateCodeModuleAsset),
  encode: (fields, options) => [
    ...selectionMovementFieldOwner.encode(fields.filter(field => field.fieldName !== 'handler_cpu'), options),
    ...encode(fields.filter(field => field.fieldName === 'handler_cpu'), options)],
  serializeField: field => field.fieldName === 'handler_cpu' ? serializeUiCommandDispatchField(field)
    : selectionMovementFieldOwner.serializeField(field),
  validatePreimage: (fields, fragmentId, bytes) => fragmentId === movementFragment
    ? selectionMovementFieldOwner.validatePreimage(fields, fragmentId, bytes)
    : validatePreimage(fields, fragmentId, bytes),
  objects: document => [...objects(document), ...selectionMovementFieldOwner.objects(document)],
  documentView: true, legacyClosed: true});
