// @editor-module 应用命令持有入口与程序引用，迁移只写远跳入口。
import {canonicalJsonEqual} from "./project-store-values.js";
import {ROM_WRITE_PENDING, validateFieldOverrides} from "./field-codec.js";
import {APPLICATION_PROGRAM_COMPILER} from './application-program.js';
import {EXTENDED_APPLICATION_COMMANDS, applicationCommandId} from './application-program-format.js';

const PREFIX = "application-command:";
export const APPLICATION_COMMAND_RECORD_IDS = Object.freeze(
  Array.from({length: 240}, (_, index) => applicationCommandId(index + 0x10)));
const require = (valid, message) => {if (!valid) throw new TypeError(message);};

function resourceIdOf(document, asset) {
  const resourceId = asset?.resource_id ?? `${PREFIX}${document?.command_id_hex?.slice(2)}`;
  require(APPLICATION_COMMAND_RECORD_IDS.includes(resourceId)
    && (!asset || (asset.schema === "metalmaxcn.field-ui-module.asset.application-command"
      && asset.edit_policy === "mutable"))
    && document?.command_id === Number.parseInt(resourceId.slice(PREFIX.length), 16),
  "应用命令记录身份无效");
  return resourceId;
}

function describe(document, {asset} = {}) {
  const resourceId = resourceIdOf(document, asset);
  if (EXTENDED_APPLICATION_COMMANDS.includes(document.command_id)) return [{resourceId, entityHandle: resourceId,
    fieldName: 'program_reference', defaultValue: document.program_reference, documentPath: ['program_reference'],
    writeback: {target: 'rom', state: 'permitted', compiler_id: APPLICATION_PROGRAM_COMPILER}}];
  const pointer = document.application_script_pointer_entry;
  const script = document.application_script;
  require(pointer?.space === "prg" && pointer.length === 2
    && Number.isInteger(pointer.offset) && pointer.offset >= 0
    && script?.space === "prg" && Number.isInteger(script.cpu_address)
    && script.cpu_address >= 0 && script.cpu_address <= 0xffff,
  "应用命令脚本指针无效");
  const fields = [{resourceId, entityHandle: resourceId, fieldName: "script_pointer_cpu",
    defaultValue: script.cpu_address, documentPath: ["application_script", "cpu_address"],
    writeback: ROM_WRITE_PENDING}];
  if (document.program_reference) fields.push({resourceId, entityHandle: resourceId, fieldName: 'program_reference',
    defaultValue: document.program_reference, documentPath: ['program_reference'],
    writeback: {target: 'rom', state: 'permitted', compiler_id: APPLICATION_PROGRAM_COMPILER}});
  const slots = document.dialogue_flow?.runtime_record_slots?.slots || [];
  for (const [index, slot] of slots.entries()) {
    require(Number.isInteger(slot.slot) && Number.isInteger(slot.record_id)
      && slot.record_id >= 0 && slot.record_id <= 255, "运行时记录槽无效");
    fields.push({resourceId, entityHandle: `${resourceId}:runtime-record-slot:${slot.slot}`,
      fieldName: "record_id", defaultValue: slot.record_id, readOnly: true,
      publishedAddress: {space: 'prg', offset: slot.prg_offset, length: 1,
        end_exclusive: slot.prg_offset + 1},
      documentPath: ["dialogue_flow", "runtime_record_slots", "slots", index, "record_id"],
      writeback: ROM_WRITE_PENDING});
  }
  for (const [segmentIndex, segment] of (document.dialogue_flow?.segments || []).entries()) {
    for (const [index, read] of (segment.callback_reads || []).entries()) {
      if (read.confirmation_status !== 'confirmed'
          || !['text-record', 'menu-context'].includes(read.role)) continue;
      fields.push({resourceId, entityHandle: `${resourceId}:callback-read:${read.prg_offset}`,
        fieldName: 'value', defaultValue: read.value, readOnly: true,
        publishedAddress: {space: 'prg', offset: read.prg_offset, length: 1,
          end_exclusive: read.prg_offset + 1},
        documentPath: ['dialogue_flow', 'segments', segmentIndex, 'callback_reads', index, 'value'],
        writeback: ROM_WRITE_PENDING});
    }
    for (const [actionIndex, action] of (segment.actions || []).entries()) {
      if (action.kind === 'indexed-segment-table' && action.opcode === 0x8F) {
        for (const [index, alternative] of (action.alternatives || []).entries()) {
          fields.push({resourceId, entityHandle: `${resourceId}:choice-branches:${action.prg_offset}`,
            fieldName: `target:${index}`, defaultValue: alternative.selector_value, readOnly: true,
            publishedAddress: {space: 'prg', offset: alternative.prg_offset, length: 1,
              end_exclusive: alternative.prg_offset + 1},
            documentPath: ['dialogue_flow', 'segments', segmentIndex, 'actions', actionIndex,
              'alternatives', index, 'selector_value'], writeback: ROM_WRITE_PENDING});
        }
      }
      if (action.kind !== 'text-record' || (action.source !== 'application-vm-literal'
          && !(resourceId === 'application-command:35' && action.source === 'application-callback-record'
            && action.reader?.offset === 0x30E4D && action.prg_offset === 0x31E22))) continue;
      const entityHandle = `${resourceId}:text-record:${action.prg_offset}`;
      const path = ['dialogue_flow', 'segments', segmentIndex, 'actions', actionIndex];
      fields.push({resourceId, entityHandle, fieldName: 'record_id', defaultValue: action.record_id,
        readOnly: true, publishedAddress: {space: 'prg', offset: action.prg_offset, length: 1,
          end_exclusive: action.prg_offset + 1}, documentPath: [...path, 'record_id'],
        writeback: ROM_WRITE_PENDING});
      if (action.region_selection?.kind === 'application-region-opcode')
        fields.push({resourceId, entityHandle, fieldName: 'region_id', defaultValue: action.region_id,
          readOnly: true, publishedAddress: {space: 'prg', offset: action.region_selection.offset,
            length: 1, end_exclusive: action.region_selection.offset + 1},
          documentPath: [...path, 'region_id'], writeback: ROM_WRITE_PENDING});
    }
    for (const [operationIndex, operation] of (segment.operations || []).entries()) {
      if (operation.opcode === 0xCE && !operation.truncated && operation.operands.length === 1) {
        fields.push({resourceId, entityHandle: `${resourceId}:numeric-input-label:${operation.prg_offset}`,
          fieldName: 'record_id', defaultValue: operation.operands[0], readOnly: true,
          publishedAddress: {space: 'prg', offset: operation.prg_offset + 1, length: 1,
            end_exclusive: operation.prg_offset + 2},
          documentPath: ['dialogue_flow', 'segments', segmentIndex, 'operations', operationIndex,
            'operands', 0], writeback: ROM_WRITE_PENDING});
      }
      if (operation.opcode === 0xD0 && !operation.truncated && operation.operands.length === 1) {
        const offset = operation.prg_offset + 1;
        fields.push({resourceId, entityHandle: `${resourceId}:selection-layout:${operation.prg_offset}`,
          fieldName: 'selector', defaultValue: operation.operands[0], readOnly: true,
          publishedAddress: {space: 'prg', offset, length: 1, end_exclusive: offset + 1},
          documentPath: ['dialogue_flow', 'segments', segmentIndex, 'operations', operationIndex,
            'operands', 0], writeback: ROM_WRITE_PENDING});
      }
      if (operation.opcode === 0xFD && !operation.truncated && operation.operands.length === 4) {
        const offset = operation.prg_offset + 1;
        fields.push({resourceId, entityHandle: `${resourceId}:engine-branches:${operation.prg_offset}`,
          fieldName: 'targets', defaultValue: operation.operands, readOnly: true,
          publishedAddress: {space: 'prg', offset, length: 4, end_exclusive: offset + 4},
          documentPath: ['dialogue_flow', 'segments', segmentIndex, 'operations', operationIndex,
            'operands'], writeback: ROM_WRITE_PENDING});
      }
      if (operation.opcode === 0xCF && !operation.truncated && operation.operands.length === 1) {
        const offset = operation.prg_offset + 1;
        fields.push({resourceId, entityHandle: `${resourceId}:runtime-value:${operation.prg_offset}`,
          fieldName: 'value', defaultValue: operation.operands[0], readOnly: true,
          publishedAddress: {space: 'prg', offset, length: 1, end_exclusive: offset + 1},
          documentPath: ['dialogue_flow', 'segments', segmentIndex, 'operations', operationIndex,
            'operands', 0], writeback: ROM_WRITE_PENDING});
      }
      if ([0xCD, 0xCE].includes(operation.opcode) && !operation.truncated && operation.operands.length === 1) {
        const offset = operation.prg_offset + 1;
        const kind = operation.opcode === 0xCE ? 'quantity-title' : 'layout-record';
        fields.push({resourceId, entityHandle: `${resourceId}:${kind}:${operation.prg_offset}`,
          fieldName: 'record_id', defaultValue: operation.operands[0], readOnly: true,
          publishedAddress: {space: 'prg', offset, length: 1, end_exclusive: offset + 1},
          documentPath: ['dialogue_flow', 'segments', segmentIndex, 'operations', operationIndex,
            'operands', 0], writeback: ROM_WRITE_PENDING});
      }
      if (operation.opcode === 0xD3 && !operation.truncated && operation.operands.length === 2) {
        for (const [index, fieldName] of ['selector', 'count'].entries()) {
          const offset = operation.prg_offset + 1 + index;
          fields.push({resourceId, entityHandle: `${resourceId}:selection-layout:${operation.prg_offset}`,
            fieldName, defaultValue: operation.operands[index], readOnly: true,
            publishedAddress: {space: 'prg', offset, length: 1, end_exclusive: offset + 1},
            documentPath: ['dialogue_flow', 'segments', segmentIndex, 'operations', operationIndex,
              'operands', index], writeback: ROM_WRITE_PENDING});
        }
      }
      if (operation.opcode !== 0xD4 || operation.truncated || operation.operands.length !== 2) continue;
      for (const [index, fieldName] of ['record_id', 'selector'].entries()) {
        const offset = operation.prg_offset + 1 + index;
        fields.push({resourceId, entityHandle: `${resourceId}:selection-prompt:${operation.prg_offset}`,
          fieldName, defaultValue: operation.operands[index], readOnly: true,
          publishedAddress: {space: 'prg', offset, length: 1, end_exclusive: offset + 1},
          documentPath: ['dialogue_flow', 'segments', segmentIndex, 'operations', operationIndex,
            'operands', index], writeback: ROM_WRITE_PENDING});
      }
    }
  }
  return fields;
}

function objects(document, {asset} = {}) {
  const field = describe(document, {asset})[0];
  if (EXTENDED_APPLICATION_COMMANDS.includes(document.command_id)) return [{id: field.resourceId,
    label: document.label, fragmentIds: [], fields: [[field.entityHandle, field.fieldName]]}];
  return [{id: field.resourceId, label: document.label,
    fragmentIds: [], fields: describe(document, {asset}).filter(field => ['script_pointer_cpu', 'program_reference'].includes(field.fieldName))
      .map(field => [field.entityHandle, field.fieldName]),
    editor: {kind: "numeric-table", rows: [field.entityHandle],
      columns: [{name: field.fieldName, label: "脚本入口指针", min: 0, max: 65535}]}}];
}

function validate(candidate, original) {
  const resourceId = resourceIdOf(original.document, original);
  if (EXTENDED_APPLICATION_COMMANDS.includes(original.document.command_id)) {
    const expected = structuredClone(original);
    const reference = candidate.document?.program_reference;
    require(reference === null || /^application-program:[0-9A-F]{2}$/.test(reference), '扩展命令程序引用无效');
    expected.document.program_reference = reference;
    require(canonicalJsonEqual(candidate, expected), '扩展命令只允许修改程序引用');
    return;
  }
  require(candidate?.resource_id === resourceId && candidate.schema === original.schema
    && candidate.edit_policy === original.edit_policy
    && Number.isInteger(candidate.document?.application_script?.cpu_address)
    && candidate.document.application_script.cpu_address >= 0
    && candidate.document.application_script.cpu_address <= 0xffff,
  "应用命令脚本指针取值无效");
  const expected = structuredClone(original);
  expected.document.application_script.cpu_address = candidate.document.application_script.cpu_address;
  if (original.document.program_reference) {
    require(/^application-program:[0-9A-F]{2}$/.test(candidate.document.program_reference), '应用命令程序引用无效');
    expected.document.program_reference = candidate.document.program_reference;
  }
  require(canonicalJsonEqual(candidate, expected), "应用命令只允许修改脚本入口指针与程序引用");
}

export function applicationCommandRecordFieldOwner(resourceId) {
  require(APPLICATION_COMMAND_RECORD_IDS.includes(resourceId), "应用命令记录 owner 身份无效");
  return Object.freeze({compilerId: ['10', '11', '12', '13'].includes(resourceId.slice(-2))
    || EXTENDED_APPLICATION_COMMANDS.includes(Number.parseInt(resourceId.slice(-2), 16)) ? APPLICATION_PROGRAM_COMPILER : null, physicalWriteback: false,
    writeback: ROM_WRITE_PENDING, describe, objects,
    validate: (original, overrides) => validateFieldOverrides(
      original, overrides, describe, validate),
    encode: () => [], documentView: true, legacyClosed: true});
}
