// @editor-module 剧情脚本指令的操作数控件与逐键重置。
import {esc} from "../../core/dom.js";
import {storyCommandOperandReference} from "./operand-references.js";
import {prepareModuleComponent} from "../../ui/module-components.js";
import {mountFieldObjectArrayChoice, mountFieldObjectField, mountFieldObjectArrayReference,
  mountFieldObjectArrayPosition} from "../../ui/field-object-editor.js";
import {sceneCameraCoordinate, sceneCameraByte} from "../../core/story-camera.js";
import {mountStoryScriptOwner} from "./page-working-controls.js";
import {storyCommandPresentation} from "../../core/story-command-presentation.js";

export function storyCommandByteBinding(command, programs, relativeIndex = 0) {
  const source = programs.find(program => program.id === command.programId && (program.kind || "autonomous") === command.scriptKind);
  const binding = source?.commands.find(row => row.instructionId && row.instructionId === command.instructionId)?.instructionBindings?.[relativeIndex];
  if (binding) return binding;
  const address = source.pointer_prg + command.cursor + relativeIndex;
  const owner = programs.find(program => (program.kind || "autonomous") === command.scriptKind
    && address >= program.pointer_prg && address < program.pointer_prg + program.encoded_range.length);
  if (!owner) throw new TypeError("剧情指令字节缺少字段对象归属");
  const resourceId = `story-${command.scriptKind}-script`;
  return {resourceId, handle: `${resourceId}:script:${owner.id.toString(16).toUpperCase().padStart(2, "0")}`,
    byteIndex: address - owner.pointer_prg};
}
const commandByteBinding = storyCommandByteBinding;

export function storyCommandChoiceMarkup(command, semantics, programs) {
  const semantic = semantics.get(command.opcode);
  if (!["wait", "set-direction", "attempt-tile-step", "drive-scripted-input"].includes(semantic?.operation)) return "";
  const directions = {up: "上", down: "下", left: "左", right: "右"};
  const choices = [...semantics.values()].filter(item => item.operation === semantic.operation)
    .map(item => ({value: item.opcode, label: item.operation === "wait" ? `${item.frames} 帧`
      : directions[item.direction] || ["", "右", "左", "上", "下"][item.input_value]}));
  return `<div data-story-command-choice="${esc(JSON.stringify({...commandByteBinding(command, programs),
    choices, label: semantic.operation === "wait" ? "帧数" : "方向"}))}"></div>`;
}

export async function hydrateStoryCommandChoices(root, database, onValue) {
  for (const host of root.querySelectorAll("[data-story-command-choice]")) {
    if (host.dataset.fieldObjectReady) continue;
    const props = JSON.parse(host.dataset.storyCommandChoice);
    const object = await database.getFieldObject(props.resourceId, props.handle);
    if (!host.isConnected) continue;
    let previous;
    mountFieldObjectArrayChoice(host, object, {...props, entityHandle: props.handle, fieldName: "bytecode",
      onValue: value => {
        const signature = JSON.stringify(value);
        if (host.isConnected && previous !== undefined && signature !== previous) onValue(props.resourceId, value);
        previous = signature;
      }});
  }
}

export function storyCommandFieldOperand(command, field, programs, semantics) {
  const resourceId = field.owner_ref.resource_id;
  const scriptId = parseInt(field.owner_ref.script_resource_id.split(".").at(-1), 16);
  const owner = programs.find(item => item.id === scriptId && (item.kind || "autonomous") === command.scriptKind);
  const source = programs.find(item => item.id === command.programId && (item.kind || "autonomous") === command.scriptKind);
  const operandIndex = owner.pointer_prg + field.owner_ref.byte_index - source.pointer_prg - command.cursor - 1;
  const declaration = source.commands.find(item => item.cursor === command.cursor);
  return {resourceId, handle: `${resourceId}:script:${scriptId.toString(16).toUpperCase().padStart(2, "0")}`,
    byteIndex: field.owner_ref.byte_index, operandIndex,
    reference: storyCommandOperandReference(declaration, semantics.get(command.opcode), operandIndex, command.operands)};
}

export function storyCommandOperandMarkup(command, program, fields = [], semantics = new Map(), programs = [], actorAppearance = {}) {
  const opcode = commandByteBinding(command, programs);
  const declaration = program?.commands.find(item => item.cursor === command.cursor);
  const operandCount = declaration?.readWidth ? declaration.readWidth - 1 : Math.max(0, Number(declaration?.normal_advance || 1) - 1,
    ...(declaration?.dynamic_advance_operands || []).map(index => Number(index) + 1));
  const operands = fields.length ? fields.map(field => storyCommandFieldOperand(command, field, programs, semantics))
    : Array.from({length: operandCount}, (_, index) => ({...commandByteBinding(command, programs, index + 1),
      operandIndex: index, reference: storyCommandOperandReference(declaration, semantics.get(command.opcode), index, command.operands)}));
  const semantic = semantics.get(command.opcode);
  const labels = semantic?.operation === "wait-operand-frames" ? ["帧数"]
    : semantic?.operation === "drive-scripted-input" ? ["格数"]
    : ["move-actor-to-position", "set-actor-position"].includes(semantic?.operation) ? ["目标 X", "目标 Y"]
    : ({
      "branch-if-party-member-alive": ["检测队员", "跳转距离"],
      "branch-if-runtime-slot-empty": ["检测队员", "跳转距离"],
      "branch-if-runtime-slot-present": ["检测队员", "跳转距离"],
      "branch-if-event-flag-clear": ["事件位", "跳转距离"],
      "branch-if-investigation-acquired": ["取得位", "跳转距离"],
      "branch-if-party-money-insufficient": ["金钱下限", "跳转距离"],
      "branch-if-party-level-insufficient": ["等级下限", "跳转距离"],
      "branch-if-party-health-insufficient": ["HP 下限", "跳转距离"],
      "branch-if-party-descriptor-absent": ["队伍描述符", "跳转距离"],
      "branch-if-object-outside-scene": ["对象", "跳转距离"],
      "branch-if-runtime-result-nonzero": ["跳转距离"],
      "branch-if-party-not-riding": ["跳转距离"],
      "start-event-selected-dialogue": ["事件位", "已置位台词", "未置位台词"],
    })[semantic?.operation] || [];
  const variableRegion = command.opcode === 0x26;
  const destination = semantic?.operation === "end-story-state-with-scene-context";
  const operandLabels = storyCommandPresentation(semantic).operands;
  const groups = new Map();
  for (const binding of [opcode, ...operands]) {
    if (!groups.has(binding.handle)) groups.set(binding.handle, {resourceId: binding.resourceId, handle: binding.handle, offsets: []});
    groups.get(binding.handle).offsets.push(binding.byteIndex);
  }
  return `${operands.map(({resourceId, handle, byteIndex, operandIndex: index, reference}) => {
    if (fields.length && !reference || variableRegion && index === 0
        || destination && !reference) return "";
    const label = labels[index] || operandLabels[index] || {"global-event-flag": "事件位", "text-record": "文字", "audio-command": "声音", "scene-header-map": "场景",
      "actor-type": "形象", "encounter-formation": "编队", "direct-frame": "形象帧", "item-entry": "物品"}[reference?.module]
      || `操作数 ${index + 1}`;
    const cursor = byteIndex - index - 1;
    const tag = reference && !destination ? "div" : "label";
    return `<${tag} class="story-command-operand">${esc(label)}<span data-story-command-number="${esc(JSON.stringify({resourceId, handle, byteIndex, label, reference,
      ...(reference?.module === "actor-type" ? {actorAppearance} : {}),
      variableRegion, destination, indices: destination ? [cursor + 1, cursor + 2, cursor + 3]
        : variableRegion && reference ? [cursor + 1, byteIndex] : [byteIndex]}))}"></span></${tag}>`;
  }).join("")}
    ${[...groups.values()].map(group => `<span data-story-command-owner="${esc(JSON.stringify({resourceId: group.resourceId,
      scriptId: parseInt(group.handle.split(":").at(-1), 16)}))}"></span>`).join("")}
    <button type="button" class="button ghost" disabled data-story-command-reset="${esc(JSON.stringify({resourceId: opcode.resourceId,
      groups: [...groups.values()].map(group => ({...group, offsets: [...new Set(group.offsets)]}))}))}" title="重置指令">⟲</button>`;
}

export async function hydrateStoryCommandOperands(root, database, onValue, scenes = []) {
  for (const host of root.querySelectorAll("[data-story-command-number]")) {
    if (host.dataset.fieldObjectReady) continue;
    const props = JSON.parse(host.dataset.storyCommandNumber);
    const object = await database.getFieldObject(props.resourceId, props.handle);
    if (!host.isConnected) continue;
    let previous;
    const options = {entityHandle: props.handle, fieldName: "bytecode", byteIndex: props.byteIndex, label: props.label,
      onValue: value => {
        const signature = JSON.stringify(value);
        if (host.isConnected && previous !== undefined && signature !== previous) onValue(props.resourceId);
        previous = signature;
      }};
    if (props.destination) {
      mountFieldObjectArrayPosition(host, object, {...options, indices: props.indices, entries: scenes,
        anchor: [8, 7], decodeCoordinate: sceneCameraCoordinate, encodeCoordinate: sceneCameraByte});
    } else if (props.reference) {
      const {module, regionId} = props.reference;
      const component = module === "global-event-flag" ? "save-container" : module;
      const kind = module === "global-event-flag" ? "event-flag-reference" : "reference";
      const prepared = await prepareModuleComponent(component, kind, {
        ...(module === "actor-type" ? props.actorAppearance : {}),
        ...(!props.variableRegion && module === "text-record" ? {regionId} : {}),
        ...(module === "direct-frame" ? {reference: {module, key: ["id"]}} : {}),
      });
      if (!host.isConnected) continue;
      await mountFieldObjectArrayReference(host, object, {...options, indices: props.indices, moduleId: component, kind, prepared,
        picker: {compact: true, grouped: true, pageSize: 48, previewPanel: true,
          identityOnly: module === "text-record"}, resettable: true,
        ...(module === "actor-type" ? {candidateSelector: '[data-actor-appearance-option]',
          candidateValue: row => row.dataset.actorAppearanceOption} : {}),
        ...(props.variableRegion ? {
          decode: ([region, record]) => `record:${region.toString(16).toUpperCase().padStart(2, "0")}:${String(record).padStart(3, "0")}`,
          encode: value => [parseInt(value.split(":")[1], 16), Number(value.split(":")[2])],
        } : {}),
      });
    } else mountFieldObjectField(host, object, options);
  }
  for (const host of root.querySelectorAll("[data-story-command-owner]")) {
    const {resourceId, scriptId} = JSON.parse(host.dataset.storyCommandOwner);
    await mountStoryScriptOwner(host, database, resourceId, scriptId);
  }
  for (const button of root.querySelectorAll("[data-story-command-reset]")) {
    if (button.dataset.bound) continue;
    button.dataset.bound = "true";
    const props = JSON.parse(button.dataset.storyCommandReset);
    const fields = await Promise.all(props.groups.map(async group => {
      const object = await database.getFieldObject(group.resourceId, group.handle);
      return {field: object.fields.find(field => field.entityHandle === group.handle && field.fieldName === "bytecode"),
        offsets: group.offsets};
    }));
    let busy = false;
    const refresh = () => {
      button.disabled = busy || !fields.some(({field, offsets}) => offsets.some(offset =>
        field.value[offset] !== field.defaultValue[offset]));
    };
    for (const {field} of fields) field.bind(button, refresh);
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      busy = true;
      refresh();
      button.resetCompletion = (async () => {
        for (const group of props.groups) {
          const object = await database.getFieldObject(group.resourceId, group.handle);
          const field = object.fields.find(field => field.entityHandle === group.handle && field.fieldName === "bytecode");
          await field.reset({selection: group.offsets.map(offset => ({offset, length: 1}))});
        }
        await onValue(props.resourceId);
      })().catch(error => {
        const message = document.createElement("p");
        message.setAttribute("role", "status");
        message.textContent = error.message;
        button.after(message);
        throw error;
      }).finally(() => {busy = false; refresh();});
    });
  }
}
