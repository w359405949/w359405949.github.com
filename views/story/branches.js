// @editor-module 剧情预览条件、候选路径与分支键呈现。
import {esc} from "../../core/dom.js";
import {state} from "../../core/state.js";
import {projectFieldDraftRevision} from "../../core/project-data.js";
import {storyBranchCondition, storyCandidatePaths, storyPathPreviewConditions} from "../../core/story-branch-paths.js";
import {resolveTextRecordDialogue} from "../../core/text-record-project.js";
import {storyPreviewRuntimeOverrides} from "../../core/story-preview-conditions.js";
import {storyExecutionTrace} from "./trace.js";
import {storyVmCurrentPrograms, storyVmSemanticsMap, storyVmBlockingUiResolver,
  storyPartyMembers, storyPartyRuntimeOverrides, buildStoryVmSequence} from "./vm.js";
import {globalEventFlagHandle} from '../../core/global-event-flags.js';
import {eventFlagReferenceMarkup, eventFlagTextMarkup} from '../../modules/save/event-flags.js';

const models = new WeakMap();
const hex = value => Number(value).toString(16).toUpperCase().padStart(2, "0");
const previews = new Map();
const branchHistories = new WeakMap();
const compiledProgramIdentities = new WeakMap();

function branchProgramIdentities(compiled) {
  let identities = compiledProgramIdentities.get(compiled);
  if (!identities) {
    const programs = new Map();
    for (const frame of compiled.frames) for (const actor of frame.actors || []) {
      if (actor.currentCommand) programs.set(`${actor.scriptKind}:${actor.scriptId}`,
        {kind: actor.scriptKind || 'autonomous', id: actor.scriptId});
    }
    identities = [...programs.values()];
    compiledProgramIdentities.set(compiled, identities);
  }
  return identities;
}

function previousBranchDecisions(compiled, command) {
  let histories = branchHistories.get(compiled);
  if (!histories) {
    histories = new Map();
    compiled.frames.forEach((frame, index) => {
      const seen = new Set();
      for (const actor of frame.actors || []) {
        const key = `${actor.actorSlot}:${actor.scriptId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (!actor.currentCommand) continue;
        let cursors = histories.get(key);
        if (!cursors) histories.set(key, cursors = new Map());
        const {cursor, nextCursor} = actor.currentCommand;
        let changes = cursors.get(cursor);
        if (!changes) cursors.set(cursor, changes = []);
        if (!changes.length || changes.at(-1).nextCursor !== nextCursor) changes.push({frame: index, nextCursor});
      }
    });
    branchHistories.set(compiled, histories);
  }
  const previous = new Map();
  for (const [cursor, changes] of histories.get(`${command.actorSlot}:${command.programId}`) || []) {
    if (cursor === command.cursor) continue;
    let low = 0, high = changes.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (changes[middle].frame < command.start) low = middle + 1;
      else high = middle;
    }
    if (low) previous.set(cursor, changes[low - 1].nextCursor);
  }
  return previous;
}

function storyBranchModel(entry) {
  const semantics = storyVmSemanticsMap();
  const trigger = entry.sequence.interaction_trigger;
  const identities = trigger ? [{kind: "interaction", id: trigger.script_id}]
    : branchProgramIdentities(entry.compiled);
  const programs = storyVmCurrentPrograms(identities);
  const selected = programs;
  const overrides = storyPartyRuntimeOverrides(entry.sequence.id, false);
  const signature = JSON.stringify([selected.map(program => program.commands.map(command =>
    [command.cursor, command.opcode, command.currentOperands, command.normal_advance])),
    projectFieldDraftRevision(state.project.text_record_edits), overrides]);
  const cached = previews.get(entry.sequence.id);
  if (cached?.signature === signature && cached.document === state.project.text_record_edits) {
    models.set(entry.compiled, cached.model); return cached.model;
  }
  const baseline = buildStoryVmSequence(entry.sequence, entry.variant, overrides);
  const first = baseline.frames[0] || {};
  const defaults = {...overrides, eventFlags: first.eventFlags || [], partyMoney: first.partyMoney || 0, sceneId: first.sceneId,
    partyInventories: first.partyInventories, playerMapX: first.playerMapX, playerMapY: first.playerMapY,
    partyDescriptors: first.partyMembers?.map(member => member.ridingVehicle ? member.vehicleSlot : 255),
  };
  const resolveUi = storyVmBlockingUiResolver(programs, command => command.currentOperands);
  const paths = selected.flatMap(program => storyCandidatePaths({program, semantics, resolveUi,
    resolveDialogue: (region, record, choose) => resolveTextRecordDialogue(state.project.text_record_edits,
      state.project.text_record_encoding, region, record, choose),
  }).map(path => ({...path, programId: program.id, scriptKind: program.kind || "autonomous"})));
  const conditions = new Map();
  for (const branch of entry.sequence.ending_animation?.branches || [])
    conditions.set(`flag:${branch.event_flag}`, {key: `flag:${branch.event_flag}`, label: '击败诺亚'});
  for (const program of selected) for (const command of program.commands) {
    const branch = storyBranchCondition(command, semantics.get(command.opcode));
    if (branch && branch.key !== "result") conditions.set(branch.key, branch);
    if (semantics.get(command.opcode)?.operation === "start-event-selected-dialogue") {
      const flag = command.currentOperands[0];
      conditions.set(`flag:${flag}`, {key: `flag:${flag}`, label: globalEventFlagHandle(flag)});
    }
  }
  for (const path of paths) for (const key of Object.keys(path.conditions)) if (!conditions.has(key)) {
    const [kind, index] = key.split(":");
    const choice = path.choices[Number(index)];
    const service = path.services[Number(index)];
    const label = kind === "choice" ? `第 ${Number(index) + 1} 次是／否 · ${choice?.record || ""}`
      : kind === "service" ? `第 ${Number(index) + 1} 次服务返回 · ${hex(service?.selector)}` : "返回值 D5 非零";
    conditions.set(key, {key, label});
  }
  // 服务即使不读取返回值，也提供本页实际调用的返回输入。
  for (const path of paths) path.services.forEach((service, index) => conditions.set(`service:${index}`,
    {key: `service:${index}`, label: `第 ${index + 1} 次服务返回 · ${hex(service.selector)}`}));
  const baselineTrace = storyExecutionTrace(baseline);
  const defaultPath = paths.find(path => {
    const cursors = baselineTrace.commands.filter(command => command.programId === path.programId
      && command.scriptKind === path.scriptKind).map(command => command.cursor);
    return JSON.stringify(cursors) === JSON.stringify(path.cursors);
  });
  const defaultConditions = defaultPath ? storyPathPreviewConditions(defaultPath.conditions, defaults, first.sceneId) : {};
  const model = {paths, conditions: [...conditions.values()], defaults, defaultConditions, sceneId: first.sceneId, baseline,
    programs: new Map(programs.map(program => [`${program.kind || "autonomous"}:${program.id}`, program])), semantics};
  previews.set(entry.sequence.id, {signature, model, document: state.project.text_record_edits});
  models.set(entry.compiled, model);
  return model;
}

function effectiveInputs(entry, model) {
  const defaults = storyPreviewRuntimeOverrides({...model.defaults, previewConditions: model.defaultConditions}, storyPartyMembers());
  return storyPreviewRuntimeOverrides({...defaults,
    previewConditions: state.storyBranchPreviewConditions.get(String(entry.sequence.id))}, storyPartyMembers());
}

function conditionValue(key, inputs) {
  const [kind, number, second] = key.split(":");
  const id = Number(number);
  const party = inputs.partyMembers || [];
  if (kind === "flag") return inputs.eventFlags?.includes(id) || false;
  if (kind === "acquired") return inputs.investigationBits?.includes(id) || false;
  if (kind === "present") return inputs.partySlots?.includes(id) || false;
  if (kind === "alive") return party.find(member => member.slot === id)?.status !== 255;
  if (kind === "riding") return party.some(member => member.ridingVehicle);
  if (kind === "money") return (inputs.partyMoney || 0) >= id;
  if (kind === "level") return party.some(member => inputs.partySlots?.includes(member.slot) && member.status !== 255 && member.level >= id);
  if (kind === "hp") return party.some(member => inputs.partySlots?.includes(member.slot) && member.status < 128 && member.currentHp >= id);
  if (kind === "item") return inputs.partyInventories?.some((row, slot) => inputs.partySlots?.includes(slot) && row.includes(id)) || false;
  if (kind === "item-space") return inputs.partyInventories?.some((row, slot) => inputs.partySlots?.includes(slot) && row[7] === 0) || false;
  if (kind === "choice") return (inputs.choices?.[id] || 0) !== 0;
  if (kind === "service") return (inputs.serviceResults?.[id] || 0) !== 0;
  if (kind === "result") return (inputs.runtimeResultD5 || 0) !== 0;
  if (kind === "target") return (inputs.fieldUiTarget ?? 255) !== 255;
  if (kind === "position") return inputs.playerMapX === id && inputs.playerMapY === Number(second);
  if (kind === "direction") return inputs.playerDirection === ["up", "down", "left", "right"][id & 3];
  if (kind === "rectangle") {
    const [, left, right, top, bottom] = key.split(":").map(Number);
    return inputs.playerMapX >= left && inputs.playerMapX < right && inputs.playerMapY >= top && inputs.playerMapY < bottom;
  }
  if (kind === "descriptor") return inputs.partyDescriptors?.includes(id) || false;
  if (kind === "object") return inputs.objectScenes?.[id] === inputs.sceneId;
  return false;
}

function conditionLabel(key, value, model) {
  const label = model.conditions.find(condition => condition.key === key)?.label || key;
  return `${label}：${key.startsWith("choice:") ? value ? "否" : "是" : value ? "是" : "否"}`;
}

export function storyBranchPreviewMarkup(entry) {
  const model = storyBranchModel(entry);
  if (!model.conditions.length) return "";
  const inputs = effectiveInputs(entry, model);
  const partySlots = [...new Set([
    ...model.conditions.filter(condition => /^(alive|present):/u.test(condition.key)).map(condition => Number(condition.key.split(":")[1])),
    ...(model.conditions.some(condition => /^(level|hp):/u.test(condition.key)) ? inputs.partyMembers.map(member => member.slot) : []),
  ])];
  const select = (key, value, options) => `<select data-story-preview-condition="${esc(key)}" aria-label="${esc(key)}">${options.map(([id, label]) =>
    `<option value="${esc(id)}"${String(id) === String(value) ? " selected" : ""}>${esc(label)}</option>`).join("")}</select>`;
  const rows = partySlots.map(slot => {
    const member = inputs.partyMembers.find(member => member.slot === slot);
    const value = !inputs.partySlots.includes(slot) ? "absent" : member?.status === 255 ? "dead" : "present";
    return `<label>${esc(member?.name || `队员 ${slot + 1}`)}${select(`party:${slot}`, value,
      [["absent", "缺席"], ["present", "在队存活"], ["dead", "在队死亡"]])}</label>`;
  });
  const numeric = new Set();
  for (const condition of model.conditions) {
    const [kind] = condition.key.split(":");
    if (["alive", "present"].includes(kind)) continue;
    if (kind === "service" || kind === "result") {
      const value = kind === "service" ? inputs.serviceResults?.[Number(condition.key.split(":")[1])] : inputs.runtimeResultD5;
      rows.push(`<label>${esc(condition.label)}<input type="number" min="0" max="255" value="${value || 0}" data-story-preview-number="${esc(condition.key)}"></label>`);
      continue;
    }
    if (["money", "level", "hp"].includes(kind)) {
      if (numeric.has(kind)) continue;
      numeric.add(kind);
      if (kind === "money") rows.push(`<label>金钱<input type="number" min="0" max="16777215" value="${inputs.partyMoney || 0}" data-story-preview-number="money"></label>`);
      else for (const member of inputs.partyMembers) rows.push(`<label>${esc(member.name)} ${kind === "level" ? "等级" : "HP"}<input type="number" min="0" max="${kind === "level" ? 255 : 65535}" value="${member[kind === "level" ? "level" : "currentHp"] || 0}" data-story-preview-number="${kind}" data-story-preview-slot="${member.slot}"></label>`);
      continue;
    }
    const options = kind === "choice" ? [[false, "是"], [true, "否"]] : [[false, "否"], [true, "是"]];
    rows.push(`<label>${eventFlagTextMarkup(condition.label)}${select(condition.key, conditionValue(condition.key, inputs), options)}</label>`);
  }
  const selected = state.storyBranchPreviewConditions.get(String(entry.sequence.id));
  return `<section class="story-branch-preview" data-story-branch-preview><h3>预览条件</h3><div class="story-preview-conditions">${rows.join("")}</div>
    <h3>分支概览 · ${model.paths.length} 条</h3><div class="story-branch-paths">${model.paths.map((path, index) => {
      const previewConditions = storyPathPreviewConditions(path.conditions, model.defaults, model.sceneId);
      const active = selected && JSON.stringify(selected) === JSON.stringify(previewConditions);
      return `<button type="button" data-story-preview-path="${index}"${active ? ' class="is-current"' : ""}><span>${Object.entries(path.conditions)
        .map(([key, value]) => esc(conditionLabel(key, value, model))).join("；") || "默认"}</span><span>${path.texts.length ? path.texts.map(text =>
          `${esc(text.handle)}「${esc(text.text)}」`).join(" → ") : "—"}${path.termination === "loop" ? " ↻" : ""}</span></button>`;
    }).join("")}</div></section>`;
}

export function storyPreviewConditionChange(entry, key, value) {
  const model = storyBranchModel(entry);
  const current = state.storyBranchPreviewConditions.get(String(entry.sequence.id)) || {};
  if (key.startsWith("party:")) {
    const slot = Number(key.split(":")[1]);
    const party = (current.party || []).filter(member => member.slot !== slot);
    const member = {...current.party?.find(member => member.slot === slot), slot, state: value};
    delete member.status;
    party.push(member);
    return {...current, party};
  }
  const inputs = effectiveInputs(entry, model);
  const next = storyPathPreviewConditions({[key]: value}, inputs, model.sceneId);
  for (const field of ["choices", "serviceResults", "objectScenes"])
    if (next[field]) next[field] = Object.assign(Array.isArray(next[field]) ? [...(inputs[field] || [])] : {...inputs[field]}, next[field]);
  return {...current, ...next,
    ...(next.party ? {party: [...(current.party || []).filter(member => !next.party.some(row => row.slot === member.slot)),
      ...next.party.map(member => ({...current.party?.find(row => row.slot === member.slot), ...member}))]} : {}),
  };
}

export function storyPreviewPath(entry, index) {
  const model = storyBranchModel(entry);
  const path = model.paths[index];
  return path && storyPathPreviewConditions(path.conditions, model.defaults, model.sceneId);
}

export function storyBranchKeyMarkup(command, compiled) {
  const model = models.get(compiled);
  if (!model) return null;
  const program = model.programs.get(`${command.scriptKind}:${command.programId}`);
  const declaration = program?.commands.find(row => row.cursor === command.cursor);
  const semantic = model.semantics.get(command.opcode);
  if (semantic?.operation === "start-event-selected-dialogue") {
    const [flag, setRecord, clearRecord] = command.operands;
    const value = compiled.frames[command.start]?.eventFlags?.includes(flag) || false;
    const candidate = model.paths.find(path => path.programId === command.programId
      && path.scriptKind === command.scriptKind && path.conditions[`flag:${flag}`] === !value);
    const index = model.paths.indexOf(candidate);
    const handle = record => `record:${hex(semantic.region_id)}:${String(record).padStart(3, "0")}`;
    const marker = index < 0 ? "" : `<span role="button" tabindex="0" class="story-branch-alternate" data-story-preview-path="${index}" title="未走：${handle(value ? clearRecord : setRecord)}" aria-label="切换条件台词">◇</span>`;
    return {label: `${globalEventFlagHandle(flag)} → ${handle(value ? setRecord : clearRecord)}`, marker,
      details: `<dl class="story-inspector-fields"><dt>条件</dt><dd>${eventFlagReferenceMarkup(flag)}</dd><dt>成立</dt><dd>${handle(setRecord)}</dd><dt>不成立</dt><dd>${handle(clearRecord)}</dd></dl>`};
  }
  const branch = declaration && storyBranchCondition({...declaration, ...command,
    normal_advance: declaration.normal_advance}, semantic);
  if (!model || !branch) return null;
  const matching = model.paths.filter(path => path.programId === command.programId && path.scriptKind === command.scriptKind);
  const target = command.nextCursor;
  const chosen = target === branch.jump ? branch.jump : branch.normal;
  const alternative = chosen === branch.jump ? branch.normal : branch.jump;
  const alternatives = matching.filter(path => path.decisions.some(decision => decision.cursor === command.cursor && decision.target === alternative));
  const previous = previousBranchDecisions(compiled, command);
  const candidate = alternatives.find(path => path.decisions.every(decision => !previous.has(decision.cursor)
    || previous.get(decision.cursor) === decision.target)) || alternatives[0];
  const index = candidate ? model.paths.indexOf(candidate) : -1;
  const marker = index < 0 ? "" : `<span role="button" tabindex="0" class="story-branch-alternate" data-story-preview-path="${index}" data-story-preview-cursor="${command.cursor}" title="未走：${esc(branch.label)} → ${hex(alternative)}" aria-label="切换到未走的分支 ${hex(alternative)}">◇</span>`;
  return {label: `${branch.label} → ${hex(chosen)}`, marker,
    details: `<dl class="story-inspector-fields"><dt>条件</dt><dd>${eventFlagTextMarkup(branch.label)}</dd><dt>成立</dt><dd>${hex(branch.jumpWhen ? branch.jump : branch.normal)}</dd><dt>不成立</dt><dd>${hex(branch.jumpWhen ? branch.normal : branch.jump)}</dd></dl>`};
}
