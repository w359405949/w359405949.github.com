// @editor-module 剧情工作台布局与侧栏
import {editorLog} from "../../core/editor-log.js";
import {ownerReferenceListMarkup, bindOwnerReferenceList, withCurrentOwnerRecord, currentOwnerReferenceImpact} from "../../ui/owner-reference-impact.js";
import {flushAllAutoSaves} from "../../core/auto-save.js";
import {showEditorError} from "../../ui/editor-error.js";
import {storyBranchPreviewMarkup, storyBranchKeyMarkup, storyPreviewConditionChange, storyPreviewPath} from "./branches.js";
import {DIRECTION_LABELS} from "../../ui/direction-options.js";
import {syncReferencePickerControl} from "../../ui/reference-picker.js";
import {esc, hex} from "../../core/dom.js";
import {screenWorkbench} from "../../ui/screen-workbench.js";
import {handleMarkup, handleTextMarkup as storyHandleTextMarkup} from "../../ui/handle.js";
import {eventFlagReferenceMarkup, eventFlagTextMarkup} from '../../modules/save/event-flags.js';
import {bindResourceQueries, render} from "../../main.js";
import {currentTextReference, recordUid, resourceForwardReferenceCell} from "../../core/resource-index.js";
import {physicalLocationMarkup} from "../../ui/physical-location.js";
import {
  projectAssetSelectionStates,
  projectAssetSelectionsDirty,
  requireBrowserProjectRepository,
  resetProjectFieldsAtPaths,
  setProjectFields,
  projectFieldsForSelectors,
  acceptProjectFieldDraft,
} from "../../core/project-data.js";
import {
  STORY_AUTONOMOUS_RESOURCE_ID,
  projectStoryOperands,
  setStoryOperand,
  storyOperandPath,
} from "../../core/story-field-routing.js";
import {db} from "../../core/project-db.js";
import {
  applySceneActorAliasPatch,
  SCENE_ACTOR_EDITABLE_FIELDS,
  SCENE_ACTORS_RESOURCE_ID,
  sceneActorAliasRecords,
  getSceneActorFields,
} from "../../core/scene-actors.js";
import {
  applySceneActorRecordByte,
  encodeSceneActorRecordFields,
  sceneActorEditableByteFields,
} from "../../core/scene-compiler.js";
import {state} from "../../core/state.js";
import {storyComponentLabel, storySequenceComponentLabel} from '../../core/story-component-labels.js';
import {storySequencesForDefinition} from "../../core/story-page-json.js";
import {storyEventReferences} from "../../core/story-event-links.js";
import {storyWaitingConditions, storyCompletionLabel} from "../../core/story-wait-state.js";
import {saveEventHref} from "../../core/save-page-links.js";
import {
  bindFieldObjectProjections,
  fieldObjectProjectionMarkup,
  mountFieldObjectReset,
  mountFieldObjectBitmask,
} from "../../ui/field-object-editor.js";
import {
  applyResetToOriginalStates,
} from "../../ui/table.js";
import {STORY_RESET_ITEM_ID} from "./playback.js";
import {
  ACTOR_TYPE_COUNT,
  PARTY_MEMBER_COUNT,
  VISUAL_ACTORS_RESOURCE_ID,
} from "../../core/visual-actors.js";
import {
  storyEditableView,
  storyPageDefinitionForView,
  storyViewForSequenceId,
} from "../../core/story-view-config.js";
import {
  invalidateTextCatalogDocument,
  textCatalogDocument,
  textCatalogRecordSource,
} from "../text/catalog.js";
import {
  applyTextCatalogToStoryProject,
  decodeFixedTextRecord,
  textRecord,
} from "../../core/text-record-project.js";
import {uiJsRenderSources, uiPaintDialogueCanvas} from "../../modules/visual/ui-construction-preview.js";
import {
  defineElementTreeTypes,
  ELEMENT_TREE_ICONS,
  ELEMENT_TREE_LABELS,
  elementTreeRows,
} from "../../ui/element-tree.js";
import {datasetFacts} from "../../ui/shell.js";
import {
  actorAppearanceContextForStory,
  actorAppearanceContextForParty,
  hydrateStoryActorVisuals,
} from "../../ui/actor-appearance.js";
import {
  hydrateModuleComponents,
  prepareModuleComponent,
  renderModuleComponent,
  syncModuleComponents,
} from "../../ui/module-components.js";
import {
  bindFixedTextEditors,
  fixedTextEditorMarkup,
} from "../../ui/fixed-text-editor.js";
import {
  buildStoryVmSequence,
  storyBrowserVm,
  storyPartyMembers,
  storyPartyRuntimeOverrides,
  setStoryPartyVehicleForSequence,
  storyPartySlotsForSequence,
  storyVmBlockingUiResolver,
  storyVmAllActorLists,
  storyVmEntryVariant,
  storyVmCompilationCache,
  storyVmSequenceCompilationCache,
  storyVmSemanticsMap,
  storyVmSequences,
  setStoryPartySlotForSequence,
} from "./vm.js";
import {storyExecutionTrace} from "./trace.js";
import {storyPlayerConditionLabel} from "./player-control.js";
import {storyObjectRows, storyObjectInspector, storyObjectForEvent,
  highlightStoryObjectTracks, hydrateStoryObjectPosition, storyObjectInspectorKey,
  syncStoryObjectInspector, hydrateStoryObjectSources, storyObjectInspectorSources,
  storyInspectorObject} from "./objects.js";
import {storyAudioLabel as audioCommandLabel} from "./handles.js";
import {storySceneLink} from "./scene-link.js";
import {storyActorHandle, storyScriptHandle, storyScriptMarkup, storyResourceMarkup,
  storyTextHandle, storyTextMarkup, storyShotLabel, storyInterfaceMarkup} from "./handles.js";
import {storyInterfaceState} from "../../core/story-interface.js";
import {scenePositionPickerMarkup, hydrateScenePositionPicker} from "../../modules/scene/components.js";
import {storyOperandReference} from "../../modules/story/operand-references.js";
import {storyCommandChoiceMarkup, hydrateStoryCommandChoices, storyCommandOperandMarkup, hydrateStoryCommandOperands,
  storyCommandFieldOperand} from "../../modules/story/command-fields.js";
import {storyScriptStructureMarkup, hydrateStoryScriptStructure} from "../../modules/story/script-structure-controls.js";
import {storyMovementMarkup, hydrateStoryMovement} from '../../modules/story/movement-controls.js';
import {storyPageWorkingKey} from "../../core/story-page-working.js";
import {storyPageAuthoringTreeMarkup, storyPageAuthoringInspectorMarkup, storyPageEmptyWorkbenchMarkup,
  storyPageKeyEditorMarkup, hydrateStoryPageKeyEditors} from '../../modules/story/page-editor-controls.js';
import "../../modules/scene/components.js";
import "../../modules/encounter/components.js";
import "../../modules/story/components.js";
import "../../modules/story/interaction-components.js";
import "../../modules/text/components.js";
import "../../modules/audio/components.js";
import "../../modules/metasprite/direct-frame-components.js";
import "../../modules/save/components.js";
import {renderBattleTestFormationInlineEditor} from "../battle.js";



const STORY_CUTSCENE_RESOURCE_ID = "cutscene";
const FIELD_SCENE_LIFECYCLE_RESOURCE_ID = "field-scene-lifecycle-service";
const EDITABLE_STORY_ELEMENT_TREE_TYPES = defineElementTreeTypes({
  "player-input": {icon: ELEMENT_TREE_ICONS.action, label: "玩家操控"},
  "player-boundary": {icon: ELEMENT_TREE_ICONS.action, label: "操控分界"},
  sequence: {
    icon: ELEMENT_TREE_ICONS.group,
    label: ELEMENT_TREE_LABELS.presentation,
  },
  party: {icon: ELEMENT_TREE_ICONS.group, label: "主角团队"},
  "party-member": {
    icon: ELEMENT_TREE_ICONS.actor,
    label: "主角团队成员",
  },
  "script-shot": {icon: ELEMENT_TREE_ICONS.layer, label: "脚本角色表"},
  shot: {icon: ELEMENT_TREE_ICONS.layer, label: ELEMENT_TREE_LABELS.shot},
  "ending-stage": {icon: ELEMENT_TREE_ICONS.layer, label: "结局阶段"},
  "camera-settings": {icon: ELEMENT_TREE_ICONS.target, label: "镜头配置"},
  camera: {icon: ELEMENT_TREE_ICONS.target, label: ELEMENT_TREE_LABELS.camera},
  actor: {icon: ELEMENT_TREE_ICONS.actor, label: ELEMENT_TREE_LABELS.actor},
  text: {icon: ELEMENT_TREE_ICONS.text, label: ELEMENT_TREE_LABELS.text},
  interface: {icon: ELEMENT_TREE_ICONS.text, label: "界面"},
  "script-text": {icon: ELEMENT_TREE_ICONS.text, label: "脚本文本"},
  "interface-reference": {icon: ELEMENT_TREE_ICONS.text, label: "界面文字"},
  action: {icon: ELEMENT_TREE_ICONS.action, label: "角色动作"},
  audio: {icon: ELEMENT_TREE_ICONS.item, label: "音频事件"},
});
let selectedOpeningElementId = null;
const STORY_ROOT_SELECTION = 'page-root';
let openingWorkbenchContext = null;
let openingOriginalRepository = null;
let openingOriginalProject = null;
let openingOriginalDocument = null;
let openingEncounterFormationSource = null;
let openingEncounterFormationLoad = null;
let openingEncounterFormationLoadContext = null;
let openingEncounterFormationProject = null;
let openingEncounterFormationRepository = null;
let openingOriginalPromise = null;
let openingOriginalError = null;
let openingSceneActorOriginalDocument = null;
let openingSceneActorOriginalPromise = null;
let openingSceneActorOriginalError = null;
let openingChangeGeneration = 0;
let openingResetRequest = 0;
let openingResetting = false;
const openingByteGenerations = new Map();
let openingTextEditorController = null;
let openingPartyAppearanceSaveGeneration = 0;
const documentSegments = new WeakMap();

export function storyEditableWorkbenchView(view = state.view) {
  return storyEditableView(view);
}

function cloneJson(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function compactHexId(value) {
  return Number(value).toString(16).toLowerCase().padStart(2, "0");
}

function segmentMap(document_) {
  const segments = document_?.segments;
  if (!segments) return new Map();
  let index = documentSegments.get(segments);
  if (index) return index;
  index = new Map(segments.map(segment => [
    String(segment.id),
    segment,
  ]));
  documentSegments.set(segments, index);
  return index;
}

function fieldAddress(field, segments) {
  const direct = Number(field?.prg_offset);
  if (Number.isInteger(direct)) return direct;
  const segment = segments.get(String(field?.segment));
  const prg = Number(segment?.prg);
  const offset = Number(field?.offset);
  return Number.isInteger(prg) && Number.isInteger(offset)
    ? prg + offset : null;
}

function fieldBytes(document_, field) {
  const segment = segmentMap(document_).get(String(field?.segment));
  const offset = Number(field?.offset);
  const length = Number(field?.length);
  const values = segment?.bytes;
  if (!Array.isArray(values) || !Number.isInteger(offset)
      || !Number.isInteger(length) || offset < 0 || length < 1
      || offset + length > values.length) return null;
  return values.slice(offset, offset + length).map(value => Number(value) & 0xFF);
}

function sceneActorRecordMap(document_) {
  return new Map((document_?.records || []).map(record => [
    String(record.uid),
    record,
  ]));
}

function sceneActorFieldBytes(document_, field) {
  if (field?.resource_id !== SCENE_ACTORS_RESOURCE_ID) return null;
  const record = sceneActorRecordMap(document_).get(String(field.scene_actor_uid));
  const byteIndex = Number(field.scene_actor_byte_index);
  if (!record || !Number.isInteger(byteIndex)) return null;
  try {
    const encoded = encodeSceneActorRecordFields(record, String(record.uid));
    return byteIndex >= 0 && byteIndex < encoded.length
      ? [Number(encoded[byteIndex]) & 0xff] : null;
  } catch (_error) {
    return null;
  }
}

function workbenchFieldBytes(context, field, original = false) {
  if (field?.resource_id === SCENE_ACTORS_RESOURCE_ID) {
    return sceneActorFieldBytes(
      original
        ? context?.sceneActorOriginalDocument
        : context?.sceneActorCurrentDocument,
      field,
    );
  }
  return fieldBytes(
    original ? context?.originalDocument : context?.currentDocument,
    field,
  );
}

function sceneActorFields(entryId, actor, actorDocument) {
  const record = (actorDocument?.records || []).find(item => (
    Number(item.entry_id) === Number(entryId)
      && Number(item.id) === Number(actor?.record_id)
  ));
  if (!record) return [];
  const aliasUids = sceneActorAliasRecords(actorDocument, record)
    .map(item => String(item.uid));
  return sceneActorEditableByteFields(record).map(field => ({
    ...field,
    scene_actor_alias_uids: aliasUids,
  }));
}

function sameBytes(left, right) {
  return Array.isArray(left) && Array.isArray(right)
    && left.length === right.length
    && left.every((value, index) => value === right[index]);
}

function sharedFieldIndex(fields, segments) {
  const fieldsByAddress = new Map();
  for (const field of fields) {
    const start = fieldAddress(field, segments);
    const length = Number(field.length);
    if (!Number.isInteger(start) || !Number.isInteger(length) || length < 1) continue;
    for (let offset = 0; offset < length; offset += 1) {
      const address = start + offset;
      if (!fieldsByAddress.has(address)) fieldsByAddress.set(address, []);
      fieldsByAddress.get(address).push(field);
    }
  }
  const peersById = new Map();
  for (const field of fields) {
    const peers = new Map();
    const start = fieldAddress(field, segments);
    const length = Number(field.length);
    if (Number.isInteger(start) && Number.isInteger(length)) {
      for (let offset = 0; offset < length; offset += 1) {
        for (const peer of fieldsByAddress.get(start + offset) || []) {
          if (peer.id !== field.id) peers.set(String(peer.id), peer);
        }
      }
    }
    peersById.set(String(field.id), [...peers.values()]);
  }
  return peersById;
}

function sortedFields(fields, segments) {
  return [...fields].sort((left, right) => (
    (fieldAddress(left, segments) ?? Number.MAX_SAFE_INTEGER)
    - (fieldAddress(right, segments) ?? Number.MAX_SAFE_INTEGER)
    || String(left.id).localeCompare(String(right.id))
  ));
}

function storyLifecycleContexts(document_) {
  if (!document_) return new Map();
  if (!Array.isArray(document_.records)) {
    throw new TypeError(`${FIELD_SCENE_LIFECYCLE_RESOURCE_ID} 正文缺少 records`);
  }
  const contexts = new Map();
  for (const record of document_.records.filter(item => item?.kind === "story-context")) {
    const storyContext = Number(record.story_context);
    const handle = String(record.handle || "");
    const sceneReference = String(record.scene_reference || "");
    if (!Number.isInteger(storyContext) || !handle || !sceneReference
        || !Number.isInteger(Number(record.camera_origin_x))
        || !Number.isInteger(Number(record.camera_origin_y))) {
      throw new TypeError(
        `${FIELD_SCENE_LIFECYCLE_RESOURCE_ID} story-context 记录不完整`,
      );
    }
    if (contexts.has(storyContext)) {
      throw new TypeError(
        `${FIELD_SCENE_LIFECYCLE_RESOURCE_ID} 重复 story context ${storyContext}`,
      );
    }
    contexts.set(storyContext, record);
  }
  return contexts;
}

function currentOriginalDocument() {
  const repository = state.projectRepository || null;
  const project = state.project || null;
  if (repository !== openingOriginalRepository
      || project !== openingOriginalProject) {
    // 这一页不再自建待写队列：本页的写入都直接排在字段层那一条链上。
    void flushAllAutoSaves();
    if (openingTextEditorController?.pending) {
      void openingTextEditorController.flush().catch(error => showEditorError(
        openingWorkbenchRoot() || document.querySelector("#content"),
        "切换剧情前的文字写入失败", error,
      ));
    }
    openingTextEditorController = null;
    openingOriginalRepository = repository;
    openingOriginalProject = project;
    openingOriginalDocument = null;
    openingOriginalPromise = null;
    openingOriginalError = null;
    openingSceneActorOriginalDocument = null;
    openingSceneActorOriginalPromise = null;
    openingSceneActorOriginalError = null;
  }
  if (openingOriginalDocument) return openingOriginalDocument;
  // Current segments include an owner Working projection; they cannot prove
  // Original even when the legacy cutscene resource itself has no overrides.
  return openingOriginalDocument;
}

function currentSceneActorOriginalDocument() {
  currentOriginalDocument();
  return openingSceneActorOriginalDocument;
}

async function loadOpeningOriginalDocument() {
  currentOriginalDocument();
  const repository = state.projectRepository || null;
  const project = state.project || null;
  const requestStillCurrent = () => repository === openingOriginalRepository
    && project === openingOriginalProject;
  if (openingOriginalDocument) return openingOriginalDocument;
  if (!repository || typeof repository.getOriginal !== "function") {
    return currentOriginalDocument();
  }
  if (!openingOriginalPromise) {
    const request = repository.getOriginal(STORY_CUTSCENE_RESOURCE_ID)
      .then(record => {
        if (!requestStillCurrent()) return null;
        const document_ = record?.value?.document || null;
        if (!Array.isArray(document_?.segments)
            || !Array.isArray(document_?.editable_fields)) {
          throw new TypeError("cutscene Original 正文不完整");
        }
        openingOriginalDocument = document_;
        openingOriginalError = null;
        return document_;
      })
      .catch(error => {
        if (requestStillCurrent()) openingOriginalError = error;
        return null;
      })
      .finally(() => {
        if (requestStillCurrent() && openingOriginalPromise === request) {
          openingOriginalPromise = null;
        }
      });
    openingOriginalPromise = request;
  }
  return openingOriginalPromise;
}

async function loadOpeningSceneActorOriginalDocument() {
  currentSceneActorOriginalDocument();
  const repository = state.projectRepository || null;
  const project = state.project || null;
  const requestStillCurrent = () => repository === openingOriginalRepository
    && project === openingOriginalProject;
  if (openingSceneActorOriginalDocument) {
    return openingSceneActorOriginalDocument;
  }
  if (!repository || typeof repository.getOriginal !== "function") {
    return currentSceneActorOriginalDocument();
  }
  if (!openingSceneActorOriginalPromise) {
    const request = repository.getOriginal(SCENE_ACTORS_RESOURCE_ID)
      .then(record => {
        if (!requestStillCurrent()) return null;
        const document_ = record?.value?.document || null;
        if (!Array.isArray(document_?.records)) {
          throw new TypeError("scene-actor Original 正文不完整");
        }
        openingSceneActorOriginalDocument = document_;
        openingSceneActorOriginalError = null;
        return document_;
      })
      .catch(error => {
        if (requestStillCurrent()) openingSceneActorOriginalError = error;
        return null;
      })
      .finally(() => {
        if (requestStillCurrent()
            && openingSceneActorOriginalPromise === request) {
          openingSceneActorOriginalPromise = null;
        }
      });
    openingSceneActorOriginalPromise = request;
  }
  return openingSceneActorOriginalPromise;
}

function effectiveActorScriptId(
  actor,
  actorFields,
  document_,
  sceneActorDocument,
) {
  const id = `actor-${compactHexId(actor?.entry_id)}-${
    compactHexId(actor?.record_id)}-byte-5`;
  const field = actorFields.find(item => String(item.id) === id);
  const bytes = field?.resource_id === SCENE_ACTORS_RESOURCE_ID
    ? sceneActorFieldBytes(sceneActorDocument, field)
    : fieldBytes(document_, field);
  return bytes?.[0]
    ?? Number(actor?.autonomous_script_id);
}

function isActorScriptIdField(field) {
  return field?.kind === "actor-record"
    && String(field.id).endsWith("-byte-5");
}

function isEncounterFormationOperandField(field) {
  return field?.kind === "script-operand"
    && String(field.label) === "战斗编队 id"
    && (field.references || []).some(reference => Number(reference.opcode) === 0x37);
}

function resetOpeningEncounterFormationSource() {
  const project = state.project || null;
  const repository = state.projectRepository || null;
  if (project === openingEncounterFormationProject
      && repository === openingEncounterFormationRepository) return;
  openingEncounterFormationProject = project;
  openingEncounterFormationRepository = repository;
  openingEncounterFormationSource = null;
  openingEncounterFormationLoad = null;
  openingEncounterFormationLoadContext = null;
}

function installOpeningEncounterFormationProjection(prepared) {
  const project = state.project;
  if (!project || !prepared?.formationDocument || !prepared?.monsterDocument) return;
  project.game_data ||= {};
  project.game_data.battle_test = cloneJson(prepared.formationDocument);
  project.game_data.monsters = cloneJson(prepared.monsterDocument);
}

function openingEncounterFormationProps(value, label, controlMarkup) {
  const source = openingEncounterFormationSource;
  return {
    ...(source || {}),
    entries: source?.entries || [],
    value,
    label,
    controlMarkup,
    pending: !source,
    error: source?.error || "",
  };
}

function loadOpeningEncounterFormationSource(root) {
  resetOpeningEncounterFormationSource();
  const context = openingWorkbenchContext;
  if (openingEncounterFormationSource) {
    return Promise.resolve(openingEncounterFormationSource);
  }
  if (openingEncounterFormationLoad
      && openingEncounterFormationLoadContext === context) {
    return openingEncounterFormationLoad;
  }
  if (!context?.fields?.some(isEncounterFormationOperandField)) return Promise.resolve(null);
  const project = state.project;
  const repository = state.projectRepository;
  const request = prepareModuleComponent("encounter-formation", "reference", {
    label: "遭遇编队",
  }).then(prepared => {
    if (context !== openingWorkbenchContext || project !== state.project
        || repository !== state.projectRepository) return null;
    openingEncounterFormationSource = prepared;
    installOpeningEncounterFormationProjection(prepared);
    rebuildOpeningModel(
      root,
      context.originalDocument || currentOriginalDocument() || context.currentDocument,
    );
    refreshOpeningSelection(root);
    context.refreshTimeline?.(root, context.entry);
    return prepared;
  }).finally(() => {
    if (openingEncounterFormationLoad === request) {
      openingEncounterFormationLoad = null;
      openingEncounterFormationLoadContext = null;
    }
  });
  openingEncounterFormationLoad = request;
  openingEncounterFormationLoadContext = context;
  return request;
}

const operandReferenceIndexes = new WeakMap();

function operandReferenceIndex(fields) {
  let index = operandReferenceIndexes.get(fields);
  if (!index) {
    index = {byCommand: new Map(), order: new Map()};
    fields.forEach((field, position) => {
      if (field.kind !== "script-operand") return;
      index.order.set(field, position);
      for (const reference of field.references || []) {
        const key = `${Number(reference.program_id)}:${Number(reference.cursor)}:${Number(reference.opcode)}`;
        if (!index.byCommand.has(key)) index.byCommand.set(key, new Set());
        index.byCommand.get(key).add(field);
      }
    });
    operandReferenceIndexes.set(fields, index);
  }
  return index;
}

function referencedScriptFields(fields, program) {
  if (!program) return [];
  const index = operandReferenceIndex(fields), selected = new Set();
  for (const command of program.commands || []) {
    const key = `${Number(program.id)}:${Number(command.cursor)}:${Number(command.opcode)}`;
    for (const field of index.byCommand.get(key) || []) selected.add(field);
  }
  return [...selected].sort((left, right) => index.order.get(left) - index.order.get(right));
}

function openingElementNodes(
  entry,
  variantsById,
  authorityDocument,
  currentDocument,
  sceneActorOriginalDocument,
  sceneActorCurrentDocument,
  lifecycleDocument,
) {
  const fields = [...(authorityDocument?.editable_fields || [])];
  if (authorityDocument?.editable_fields)
    operandReferenceIndexes.set(fields, operandReferenceIndex(authorityDocument.editable_fields));
  const segments = segmentMap(authorityDocument);
  const peersById = sharedFieldIndex(fields, segments);
  const lifecycleContexts = storyLifecycleContexts(lifecycleDocument);
  const programsById = new Map(
    (storyBrowserVm().programs || [])
      .filter(program => (program.kind || "autonomous") === "autonomous")
      .map(program => [Number(program.id), program]),
  );
  const resolveBlockingUi = storyVmBlockingUiResolver(programsById);
  const pointerEntriesById = new Map(
    (state.project?.story?.autonomous?.entries || []).map(item => [Number(item.id), item]),
  );
  const rootId = `sequence:${entry.sequence.id}`;
  const partyMembers = storyPartyMembers();
  const partySlots = storyPartySlotsForSequence(entry.sequence.id);
  const nodes = [{
    id: rootId,
    kind: "sequence",
    depth: 0,
    label: entry.label,
    detail: `${entry.compiled.duration} 帧 · ${entry.shotCount} SHOT`,
    entry,
    shotCount: entry.shotCount,
    start: 0, end: entry.compiled.duration,
    fields: [],
  }];
  const partyId = `${rootId}:party`;
  nodes.push({
    id: partyId,
    kind: "party",
    depth: 1,
    parentId: rootId,
    label: "主角团队",
    detail: `${partyMembers.length} 名`,
    partyMembers,
    start: 0, end: entry.compiled.duration,
    fields: [],
  });
  for (const member of partyMembers) {
    const rendered = partySlots.has(Number(member.slot));
    nodes.push({
      id: `${partyId}:member:${Number(member.slot)}`,
      kind: "party-member",
      depth: 2,
      parentId: partyId,
      label: member.name,
      detail: `队伍槽 ${Number(member.slot)}`,
      partyMember: member,
      rendered,
      sequenceId: entry.sequence.id,
      start: 0, end: entry.compiled.duration,
      variant: entry.variant,
      fields: [],
    });
  }
  const collapsedDialogueCommands = new Set(
    (entry.compiled.collapsedDialogueCommands || []).map(command => `${
      Number(command.sourceVariantId)}:${Number(command.scriptId)}:${
      Number(command.commandCursor)}:${Number(command.opcode)}`),
  );
  const seenDialogueCommands = new Set();
  const trace = storyExecutionTrace(entry.compiled);
  const endingTimeline = entry.sequence.ending_animation?.timeline || [];
  const structuralItems = trace.shots.map(runtimeShot => {
    const stage = endingTimeline.find(item => item.id === runtimeShot.stageId);
    if (stage && stage.kind !== "actor-list-vm") {
      return {stage, stageIndex: runtimeShot.index, runtimeShot};
    }
    const snapshot = entry.compiled.frames[runtimeShot.start] || {};
    const variant = variantsById.get(Number(runtimeShot.variantId));
    return {runtimeShot, stageIndex: runtimeShot.index, shot: {
      variant_id: runtimeShot.variantId, variant_id_hex: hex(runtimeShot.variantId, 2),
      scene_id: runtimeShot.sceneId, scene_id_hex: hex(runtimeShot.sceneId, 2),
      scene_name: runtimeShot.context?.name || runtimeShot.label,
      story_state: snapshot.storyState ?? variant?.selection?.story_state ?? 0,
      story_state_hex: hex(snapshot.storyState ?? variant?.selection?.story_state ?? 0, 2),
      shot_index: runtimeShot.index, phase_label: runtimeShot.label,
    }};
  });
  const performedSources = new Set(structuralItems.filter(item => item.shot)
    .map(item => `${item.shot.variant_id}:${item.shot.scene_id}`));
  for (const [index, shot] of (entry.sequence.shots || []).entries()) {
    if (performedSources.has(`${shot.variant_id}:${shot.scene_id}`)) continue;
    structuralItems.push({shot, stageIndex: index, runtimeShot: {
      id: `script-shot:${index}:${shot.variant_id}`, index, sourceOnly: true,
    }});
  }
  const endingTextRecords = new Set();
  for (const [shotPosition, item] of structuralItems.entries()) {
    if (item.stage) {
      const stage = item.stage;
      const stageId = item.runtimeShot.id;
      nodes.push({
        id: stageId,
        kind: "ending-stage",
        depth: 1,
        parentId: rootId,
        label: `第 ${item.stageIndex + 1} 幕 · ${stage.label || stage.id}`,
        detail: `MODE ${hex(stage.mode, 2)} · ${Math.max(
          1, Number(stage.duration_frames) || 1,
        )} 帧 · ${stage.operation || stage.kind}`,
        stage,
        start: item.runtimeShot.start, end: item.runtimeShot.end,
        stageIndex: item.stageIndex,
        fields: [],
      });
      const blockingUi = stage.ui_record;
      const regionId = Number(blockingUi?.region_id ?? -1);
      const recordId = Number(blockingUi?.record_id ?? -1);
      const recordKey = `${regionId}:${recordId}`;
      if (!blockingUi?.record_found || regionId < 0 || recordId < 0
          || endingTextRecords.has(recordKey)) continue;
      endingTextRecords.add(recordKey);
      nodes.push({
        id: `${stageId}:text:${regionId}:${recordId}`,
        kind: "interface-reference",
        depth: 2,
        parentId: stageId,
        label: currentTextReference(openingTextRecordReference(blockingUi)).label || String(blockingUi.text || "")
          || storyTextHandle(regionId, recordId),
        detail: storyTextHandle(regionId, recordId),
        stage,
        start: item.runtimeShot.start, end: item.runtimeShot.end,
        stageIndex: item.stageIndex,
        fields: [],
        interfaceState: endingStageInterface(stage),
        reference: openingTextRecordReference(blockingUi),
      });
      continue;
    }
    const shot = item.shot;
    const variant = variantsById.get(Number(shot.variant_id));
    const actors = variant?.actors || [];
    const shotIndex = Number.isInteger(Number(shot.shot_index))
      ? Number(shot.shot_index) : shotPosition;
    const shotId = item.runtimeShot.id;
    const sceneName = shot.scene_name || recordUid("scene", shot.scene_id)
      || recordUid("scene-actor-list", shot.variant_id);
    const lifecycleContext = lifecycleContexts.get(Number(shot.story_state)) || null;
    nodes.push({
      id: shotId,
      kind: item.runtimeShot.sourceOnly ? "script-shot" : "shot",
      depth: 1,
      parentId: rootId,
      label: `${item.runtimeShot.sourceOnly ? "脚本角色表" : `第 ${shotIndex + 1} 幕`}${
        shot.phase_label ? ` · ${shot.phase_label}` : ""
      } · ${sceneName}`,
      detail: `${recordUid("scene-actor-list", shot.variant_id)} · STATE ${
        shot.story_state_hex || hex(shot.story_state, 2)} · ${actors.length} 个角色`,
      shot,
      start: item.runtimeShot.start, end: item.runtimeShot.end,
      variant,
      actors,
      fields: [],
    });

    const statePrefix = `story-state-${compactHexId(shot.story_state)}-`;
    const primaryCameraFields = fields.filter(field =>
      field.kind === "story-mode-row" && String(field.id).startsWith(statePrefix)
    );
    const cameraFieldIds = new Set(primaryCameraFields.map(field => String(field.id)));
    for (const field of primaryCameraFields) {
      for (const peer of peersById.get(String(field.id)) || []) {
        if (peer.kind === "story-mode-row") cameraFieldIds.add(String(peer.id));
      }
    }
    const cameraFields = sortedFields(
      fields.filter(field => cameraFieldIds.has(String(field.id))),
      segments,
    );
    nodes.push({
      id: `${shotId}:camera`,
      kind: "camera-settings",
      depth: 2,
      parentId: shotId,
      label: `${sceneName} · 镜头`,
      detail: lifecycleContext
        ? `${lifecycleContext.scene_reference} · 镜头原点 (${
          Number(lifecycleContext.camera_origin_x)}, ${
          Number(lifecycleContext.camera_origin_y)}) · 只读`
        : recordUid("scene", shot.scene_id),
      shot,
      variant,
      fields: cameraFields,
      storyContext: lifecycleContext,
      start: item.runtimeShot.start, end: item.runtimeShot.end,
    });

    for (const actor of actors) {
      const actorWithEntry = {...actor, entry_id: shot.variant_id};
      // 所有剧情角色记录都由 scene-actor 基础资产唯一拥有；cutscene
      // 里的同地址 editable_fields 只是旧发布投影，不能再成为第二套 working 值。
      const sceneActorRecordFields = sceneActorFields(
        shot.variant_id,
        actorWithEntry,
        sceneActorCurrentDocument,
      );
      fields.push(...sceneActorRecordFields);
      const actorFields = sortedFields(sceneActorRecordFields, segments);
      const scriptId = effectiveActorScriptId(
        actorWithEntry,
        actorFields,
        currentDocument,
        sceneActorCurrentDocument,
      );
      const program = programsById.get(Number(scriptId)) || null;
      const scriptFields = sortedFields(
        referencedScriptFields(fields, program),
        segments,
      );
      const actorId = `${shotId}:actor:${Number(actor.record_id)}`;
      const dialogueNodes = [...(program?.commands || [])]
        .filter(command => {
          if (!command.blocking_ui) return false;
          const commandKey = `${Number(program.id)}:${Number(command.cursor)}:${
            Number(command.opcode)}`;
          const shotCommandKey = `${Number(shot.variant_id)}:${commandKey}`;
          if (collapsedDialogueCommands.has(shotCommandKey)) return false;
          if (seenDialogueCommands.has(commandKey)) return false;
          seenDialogueCommands.add(commandKey);
          return true;
        })
        .sort((left, right) => Number(left.cursor) - Number(right.cursor))
        .map((command, dialogueIndex) => {
          // reference 三元组先划定这条命令的字段；记录号具体落在哪个字段，
          // 再按 VM resolver 反推出的 operand 位置换算成绝对 PRG 地址。
          // 显示文案不参与认领，operand 位置也不在页面另算一遍。
          const commandFields = sortedFields(
            referencedScriptFields(fields, {
              id: program.id,
              commands: [command],
            }),
            segments,
          );
          const {
            blockingUi,
            recordOperandIndex,
          } = resolveBlockingUi(command);
          const commandPrgOffset = Number(command.prg_offset);
          const recordOperandAddress = Number.isInteger(commandPrgOffset)
              && Number.isInteger(recordOperandIndex)
              && recordOperandIndex >= 0
            ? commandPrgOffset + 1 + recordOperandIndex : null;
          const recordField = Number.isInteger(recordOperandAddress)
            ? commandFields.find(field => (
              fieldAddress(field, segments) === recordOperandAddress
            )) || null
            : null;
          const regionId = Number(blockingUi.region_id ?? -1);
          const recordId = Number(blockingUi.record_id ?? -1);
          const text = currentTextReference(openingTextRecordReference(blockingUi)).label || String(blockingUi.text || "");
          const textRecords = state.project?.text_record_edits || null;
          const fixedTextRecord = textRecords && regionId >= 0 && recordId >= 0
            ? textRecord(textRecords, regionId, recordId) : null;
          const textEncoding = state.project?.text_record_encoding || null;
          return {
            id: `${actorId}:text:${Number(command.cursor)}:${
              Number(command.opcode)}`,
            kind: "script-text",
            depth: 3,
            parentId: actorId,
            label: text || storyTextHandle(regionId, recordId) || "未找到",
            detail: `第 ${dialogueIndex + 1} 条 · ${storyTextHandle(regionId, recordId) || "—"}`,
            shot,
            variant,
            actor,
            scriptId,
            programId: Number(program.id),
            program,
            command,
            recordField,
            fields: recordField ? [recordField] : [],
            textComponent: {
              kind: "text",
              font: {glyphs: textEncoding?.glyphs || new Map()},
              encoding: textEncoding,
              textRecord: fixedTextRecord,
              blockingUi,
              recordField,
            },
          };
        });
      const dialogueFieldIds = new Set(dialogueNodes
        .flatMap(node => node.fields)
        .map(field => String(field.id)));
      const actorScriptFields = scriptFields.filter(
        field => !dialogueFieldIds.has(String(field.id)),
      );
      nodes.push({
        id: actorId,
        kind: "actor",
        depth: 2,
        parentId: shotId,
        label: storyActorHandle(shot.variant_id, actor.record_id),
        detail: `${recordUid("actor-type", actor.actor_type)} · ${
          storyScriptHandle("autonomous", scriptId)} · ${actorFields.length + actorScriptFields.length} 个字段`,
        shot,
        variant,
        actor,
        scriptId,
        programId: Number(scriptId),
        program,
        pointerEntry: pointerEntriesById.get(Number(scriptId)) || null,
        actorFields,
        start: item.runtimeShot.start, end: item.runtimeShot.end,
        scriptFields: actorScriptFields,
        fields: [...actorFields, ...actorScriptFields],
      });
      nodes.push(...dialogueNodes);
    }
  }
  const sourceNodes = [...nodes];
  const actorNodeFor = (event, shotId) => sourceNodes.find(node => node.kind === "actor"
    && node.parentId === shotId && Number(node.actor.record_id) === Number(event.actorSlot));
  const scriptPrograms = new Map((storyBrowserVm().programs || []).map(program => [
    `${program.kind || "autonomous"}:${Number(program.id)}`, program,
  ]));
  for (const run of trace.dialogues) {
    const parent = actorNodeFor(run, run.shotId)
      || sourceNodes.find(node => node.id === run.shotId);
    const snapshot = entry.compiled.frames[run.start];
    const runtimeActor = snapshot.actors?.find(actor => Number(actor.actorSlot) === run.actorSlot);
    const scriptKind = runtimeActor?.scriptKind || "autonomous";
    const program = scriptPrograms.get(`${scriptKind}:${run.scriptId}`);
    const command = program?.commands?.find(command => Number(command.cursor) === run.commandCursor);
    const template = sourceNodes.find(node => node.kind === "script-text"
      && node.programId === run.scriptId && Number(node.command?.cursor) === run.commandCursor
      && node.parentId === parent?.id);
    const dialogue = run.dialogue;
    const blockingUi = {...(template?.textComponent?.blockingUi || {}),
      region_id: run.regionId, record_id: run.recordId,
      record_found: dialogue.recordFound, pages: dialogue.pages, text: dialogue.text,
      page_breaks: Math.max(0, dialogue.pages.length - 1)};
    const reference = openingTextRecordReference(blockingUi);
    const textEncoding = state.project?.text_record_encoding || null;
    const dialogueNode = {...template, ...run, kind: dialogue.machineCodeOwned ? "interface-reference" : "text", depth: 2,
      interfaceState: dialogue.machineCodeOwned
        ? storyInterfaceState(entry.compiled.frames[run.start]) : null,
      parentId: run.shotId || rootId,
      label: dialogue.text || currentTextReference(reference).label || reference,
      detail: `${reference} · F${run.start}–${run.end - 1}`,
      program, command, programId: run.scriptId, scriptId: run.scriptId,
      fields: template?.fields || [],
      textComponent: {...template?.textComponent, kind: "text",
        font: {glyphs: textEncoding?.glyphs || new Map()}, encoding: textEncoding,
        textRecord: state.project?.text_record_edits
          ? textRecord(state.project.text_record_edits, run.regionId, run.recordId) : null,
        blockingUi, fieldWindow: !dialogue.machineCodeOwned,
        prefixRecord: dialogue.machineCodeOwned ? null
          : `record:0C:${String(dialogue.prefixRecordId || 0).padStart(3, "0")}`,
        interactionWindow: Boolean(dialogue.interactionWindow),
        recordField: template?.recordField || null},
    };
    nodes.push(dialogueNode);
    if (!dialogue.machineCodeOwned && dialogue.pages.length > 1) {
      const pages = new Map();
      for (let frame = run.start; frame < run.end; frame++) {
        const page = entry.compiled.frames[frame].dialogue?.pageIndex;
        if (!Number.isInteger(page)) continue;
        if (!pages.has(page)) pages.set(page, {start: frame, end: frame + 1});
        else pages.get(page).end = frame + 1;
      }
      nodes.push(...[...pages].map(([page, range]) => ({...dialogueNode, ...range,
        id: `${run.id}:page:${page}`, parentId: run.id, depth: 3,
        label: `第 ${page + 1} 页`, dialoguePage: page,
        detail: `${reference} · F${range.start}–${range.end - 1}`,
      })));
    }
    if (template) template.performed = true;
  }
  for (const run of trace.commands) {
    const program = scriptPrograms.get(`${run.scriptKind}:${run.programId}`);
    const command = program?.commands?.find(command => Number(command.cursor) === run.cursor);
    nodes.push({...run, kind: "action", depth: 2,
      parentId: run.shotId || rootId, program, command,
      label: `角色 ${run.actorSlot + 1} · ${run.operation || hex(run.opcode, 2)}`,
      detail: `F${run.start}–${run.end - 1} · ${storyScriptHandle(run.scriptKind, run.programId)} · cursor ${hex(run.cursor, 2)}`,
      fields: run.scriptKind === "autonomous"
        ? referencedScriptFields(fields, {id: run.programId, commands: command ? [command] : []}) : [],
    });
  }
  for (const run of trace.cameras) {
    nodes.push({...run, kind: "camera", parentId: run.shotId, depth: 2,
      label: `镜头 · (${run.snapshot.cameraTileOriginX ?? "—"}, ${
        run.snapshot.cameraTileOriginY ?? "—"})`,
      detail: `F${run.start}–${run.end - 1}`,
      fields: sourceNodes.find(node => node.id === `${run.shotId}:camera`)?.fields || [],
    });
  }
  for (const segment of trace.playerSegments || []) {
    nodes.push({...segment, kind: "player-input", label: "玩家操控（预览模拟输入）", fields: []});
    const eventNode = (id, start, source, label) => {
      const program = scriptPrograms.get(`${source.scriptKind}:${source.programId}`);
      const command = program?.commands?.find(item => item.cursor === source.command.cursor);
      return {id, start, end: start + 1, kind: "player-boundary", label,
        scriptKind: source.scriptKind, programId: source.programId, program, command,
        fields: source.scriptKind === "autonomous"
          ? referencedScriptFields(fields, {id: source.programId, commands: command ? [command] : []}) : []};
    };
    nodes.push(eventNode(`${segment.id}:release`, segment.start, segment.release, "解除操控"));
    if (segment.trigger) nodes.push(eventNode(`${segment.id}:trigger`, segment.end,
      segment.trigger, storyPlayerConditionLabel(segment.trigger.condition)));
    for (const region of segment.regions) nodes.push(eventNode(`${segment.id}:region:${region.key}`,
      region.start, region, "触发区域"));
  }
  for (const event of trace.audio) {
    nodes.push({...event, kind: "audio", parentId: event.shotId, depth: 2,
      label: event.resource_id || recordUid(event.kind === "fade-control" ? "audio-control" : "audio-command", event.command_id),
      detail: `F${event.start} · ${event.kind} · ${event.kind === "fade-control" ? event.label || "" : audioCommandLabel(event.command_id)}`,
      audioKind: event.kind, fields: [],
    });
  }
  const retained = nodes.filter(node => !node.performed);
  const children = new Map();
  for (const node of retained) {
    const parent = node.parentId || null;
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(node);
  }
  const ordered = [];
  const append = parentId => {
    const siblings = children.get(parentId) || [];
    siblings.sort((a, b) => (a.start ?? Infinity) - (b.start ?? Infinity));
    for (const node of siblings) { ordered.push(node); append(node.id); }
  };
  append(null);
  return {
    nodes: ordered,
    trace,
    fields,
    segments,
    peersById,
    fieldsById: new Map(fields.map(field => [String(field.id), field])),
    sceneActorOriginalDocument,
    sceneActorCurrentDocument,
  };
}

function openingWorkbenchRoot() {
  return document.querySelector("[data-story-workbench-editable]");
}

function openingPlaybackScope(root = openingWorkbenchRoot()) {
  // 可编辑剧情工作台和时间轴面板是 #content 下的两个直接子节点。字段控件同时
  // 存在于右栏和下方面板里，所以保存、同步与还原必须以共同的 #content 为边界。
  return root?.closest("#content") || root;
}

function uniqueOpeningFields(nodes) {
  const fields = new Map();
  for (const node of nodes || []) {
    for (const field of node.fields || []) fields.set(String(field.id), field);
  }
  return [...fields.values()];
}

function openingResetPaths(context) {
  const owned = new Map();
  const scriptRanges = [];
  for (const node of context?.nodes || []) {
    const nodeFields = ["camera", "camera-settings"].includes(node.kind)
      ? node.fields : node.kind === "actor" ? node.actorFields : [];
    for (const field of nodeFields || []) {
      owned.set(String(field.id), field);
      if (isActorScriptIdField(field)) {
        scriptRanges.push([Number(field.min), Number(field.max)]);
      }
    }
  }
  // 自动脚本 id 本身可改。凡 id 落在底稿声明范围内的 program operand，
  // 都是这个工作台稳定可达的字段；不能只看刷新瞬间挂载的那一条脚本，
  // 否则 A→B、改 B、再切回 A 后会漏掉 B 的 working 覆盖。
  for (const field of context?.fields || []) {
    if (field.kind !== "script-operand") continue;
    const reachable = (field.references || []).some(reference => {
      const programId = Number(reference.program_id);
      return Number.isInteger(programId) && scriptRanges.some(
        ([minimum, maximum]) => programId >= minimum && programId <= maximum,
      );
    });
    if (reachable) owned.set(String(field.id), field);
  }
  return [...owned.values()].filter(field => field.kind === "script-operand")
    .map(field => storyOperandPath(context.project.story_autonomous_edits, field));
}

function openingSceneActorResetPaths(context) {
  const records = context?.sceneActorCurrentDocument?.records || [];
  const indexes = new Map(records.map((record, index) => [
    String(record.uid),
    index,
  ]));
  const ownedUids = new Set((context?.nodes || [])
    .filter(node => node.kind === "actor")
    .flatMap(node => node.actorFields || [])
    .filter(field => field.resource_id === SCENE_ACTORS_RESOURCE_ID)
    .flatMap(field => field.scene_actor_alias_uids?.length
      ? field.scene_actor_alias_uids.map(String)
      : [String(field.scene_actor_uid)]));
  const paths = new Map();
  for (const uid of ownedUids) {
    const index = indexes.get(uid);
    if (!Number.isInteger(index)) continue;
    for (const field of SCENE_ACTOR_EDITABLE_FIELDS) {
      const path = ["document", "records", index, field];
      paths.set(path.join("."), path);
    }
  }
  return [...paths.values()];
}

async function dirtyOpeningResetPaths(repository, resourceId, paths) {
  if (!paths.length) return [];
  const groups = paths.map((path, index) => ({
    key: String(index),
    selectors: [{kind: "path", path}],
  }));
  const result = await projectAssetSelectionStates(
    repository,
    resourceId,
    groups,
  );
  return paths.filter((_path, index) => result.states?.[String(index)]);
}

function sayOpeningSaveState(address, text, context = openingWorkbenchContext) {
  if (context !== openingWorkbenchContext || !Number.isInteger(address)) return;
  const root = openingWorkbenchRoot();
  openingPlaybackScope(root)?.querySelectorAll(
    `[data-story-workbench-address="${Number(address)}"] `
      + "[data-story-workbench-save-state]",
  ).forEach(node => { node.textContent = text; });
}

function clearOpeningSaveStates(root) {
  openingPlaybackScope(root)?.querySelectorAll(
    "[data-story-workbench-save-state]",
  ).forEach(node => {
    node.textContent = "";
  });
}

// 本页没有自建的待写队列：立即落定共用链上属于本页的写入。
async function cancelPendingOpeningSave() {
  await flushAllAutoSaves();
}

// 写入直接进字段层那一条链（`core/project-db.js`）：等待、排队、串行与失败记账
// 都归它，这一页只说清楚每一笔写什么。
async function writeOpeningChanges(changes) {
  const context = changes[0]?.context || openingWorkbenchContext;
  try {
    const repository = changes[0]?.repository
      || requireBrowserProjectRepository(state);
    const changesByResource = new Map();
    for (const change of changes) {
      const resourceId = change.resourceId;
      if (!changesByResource.has(resourceId)) {
        changesByResource.set(resourceId, []);
      }
      changesByResource.get(resourceId).push(change);
    }
    for (const [resourceId, resourceChanges] of changesByResource) {
      const fieldChanges = new Map();
      if (repository !== requireBrowserProjectRepository(state)) throw new Error("剧情字段会话已改变");
      if (resourceId === STORY_AUTONOMOUS_RESOURCE_ID) {
        const original = (await repository.getOriginal(resourceId)).value;
        for (const change of resourceChanges) {
          const [field] = await projectFieldsForSelectors(repository, resourceId,
            [{kind: "path", path: storyOperandPath(original, change.field)}]);
          const [, scriptIndex] = storyOperandPath(
            context.project.story_autonomous_edits, change.field,
          );
          // 同一字段的连笔合并须保留草稿内全部操作数。
          fieldChanges.set(field, {field, value: [
            ...context.project.story_autonomous_edits.scripts[scriptIndex].bytecode,
          ]});
        }
      } else if (resourceId === SCENE_ACTORS_RESOURCE_ID) {
        for (const change of resourceChanges) for (const field of await getSceneActorFields(change.sceneActorUid))
          fieldChanges.set(field, {field, value: change.sceneActorPatch[field.fieldName]});
      } else throw new Error(`不支持的剧情字段 owner：${resourceId}`);
      await setProjectFields(db, [...fieldChanges.values()]);
      if (resourceId === SCENE_ACTORS_RESOURCE_ID)
        acceptProjectFieldDraft(context.sceneActorCurrentDocument, [...fieldChanges.keys()]);
      if (resourceId === STORY_AUTONOMOUS_RESOURCE_ID)
        acceptProjectFieldDraft(context.project.story_autonomous_edits, [...fieldChanges.keys()]);
    }
    for (const change of changes) {
      if (openingByteGenerations.get(change.key) === change.generation) {
        sayOpeningSaveState(change.address, "", context);
      }
    }
    if (context?.project === openingWorkbenchContext?.project
        && context?.repository === openingWorkbenchContext?.repository) {
      await refreshOpeningResetState(openingWorkbenchRoot());
    }
  } catch (error) {
    for (const change of changes) {
      if (openingByteGenerations.get(change.key) === change.generation) {
        sayOpeningSaveState(
          change.address,
          `保存失败：${error.message}`,
          context,
        );
      }
    }
  }
}

function queueOpeningByteChange(field, address, value, context) {
  const segmentId = String(field.segment);
  const offset = Number(field.offset);
  const key = `${segmentId}:${offset}`;
  const generation = ++openingChangeGeneration;
  openingByteGenerations.set(key, generation);
  sayOpeningSaveState(address, "", context);
  void writeOpeningChanges([{
    key,
    segmentId,
    offset,
    value,
    resourceId: STORY_AUTONOMOUS_RESOURCE_ID,
    field,
    address,
    generation,
    context,
    repository: context.repository,
    project: context.project,
  }]);
}

function queueOpeningSceneActorChange(field, address, record, context) {
  const sceneActorUid = String(field.scene_actor_uid);
  const key = `${SCENE_ACTORS_RESOURCE_ID}:${sceneActorUid}:byte-${
    Number(field.scene_actor_byte_index)}`;
  const generation = ++openingChangeGeneration;
  openingByteGenerations.set(key, generation);
  sayOpeningSaveState(address, "正在保存…", context);
  void writeOpeningChanges([{
    key,
    resourceId: SCENE_ACTORS_RESOURCE_ID,
    sceneActorUid,
    sceneActorPatch: Object.fromEntries(
      SCENE_ACTOR_EDITABLE_FIELDS.map(name => [name, Number(record[name])]),
    ),
    address,
    generation,
    context,
    repository: context.repository,
    project: context.project,
  }]);
}

function openingTextIdentity(nodeId) {
  const match = String(nodeId || "").match(/^record:([0-9a-f]{2}):(\d{3})$/iu);
  return match
    ? {region: Number.parseInt(match[1], 16), record: Number.parseInt(match[2], 10)}
    : null;
}

function updateOpeningTextCopies(root, pages, recordId) {
  root?.querySelectorAll("[data-story-workbench-dialogue-copy]").forEach(node => {
    const canvas = node.parentElement?.querySelector("[data-story-workbench-dialogue-record]");
    if (canvas?.dataset.storyWorkbenchDialogueRecord !== recordId) return;
    const index = Number(node.dataset.storyWorkbenchDialogueCopy);
    const lines = pages?.[index] || [];
    node.innerHTML = lines.length
      ? lines.map(line => esc(line)).join("<br>")
      : "<em>这一页没有文字</em>";
  });
}

function applyOpeningTextResult(result, context = openingWorkbenchContext) {
  const identity = openingTextIdentity(result?.node_id);
  if (!identity || !context?.project) return;
  const record = textRecord(context.project.text_record_edits, result.node_id);
  const decoded = decodeFixedTextRecord({...record, bytes: result.bytes}, context.project.text_record_encoding);
  applyTextCatalogToStoryProject(context.project, {
    records: [{
      region: identity.region,
      record: identity.record,
      current_pages: decoded.pages,
      current_page_breaks: decoded.pages.length - 1,
      current_text: decoded.text,
    }],
  });
  storyVmCompilationCache.clear();
  storyVmSequenceCompilationCache.clear();
}

async function paintOpeningTextDraft(root, result) {
  const recordId = String(result?.node_id || "");
  const canvases = [...(root?.querySelectorAll(
    "[data-story-workbench-dialogue-page]",
  ) || [])].filter(canvas => (
    canvas.dataset.storyWorkbenchDialogueRecord === recordId
  ));
  if (!canvases.length) return;
  try {
    const [renderSources, source] = await Promise.all([
      uiJsRenderSources(),
      textCatalogRecordSource(recordId),
    ]);
    const records = new Map(source.records);
    records.set(recordId, result.bytes.slice());
    for (const canvas of canvases) {
      if (!canvas.isConnected) continue;
      uiPaintDialogueCanvas(
        canvas,
        recordId,
        Number(canvas.dataset.storyWorkbenchDialoguePage) || 0,
        renderSources,
        records,
        {
          fieldWindow: canvas.dataset.storyWorkbenchDialogueFieldWindow !== "false",
          prefixRecord: canvas.dataset.storyWorkbenchDialoguePrefix || null,
          interactionWindow: canvas.dataset.storyWorkbenchDialogueInteraction === "true",
        },
      );
      canvas.hidden = false;
      const status = canvas.parentElement?.querySelector(
        "[data-story-workbench-dialogue-status]",
      );
      if (status) status.hidden = true;
    }
  } catch (error) {
    showEditorError(root, `剧情文字 ${recordId} 草稿绘制失败`, error);
  }
}

async function installSavedOpeningTextDocument(
  root,
  document_,
  dirty,
  context,
) {
  if (context !== openingWorkbenchContext || state.project !== context.project) return;
  context.project.text_record_edits = cloneJson(document_);
  context.project.text_record_dirty = Boolean(dirty);
  invalidateTextCatalogDocument();
  const catalog = await textCatalogDocument();
  if (context !== openingWorkbenchContext || state.project !== context.project) return;
  applyTextCatalogToStoryProject(context.project, catalog);
  storyVmCompilationCache.clear();
  storyVmSequenceCompilationCache.clear();
  rebuildOpeningModel(
    root,
    context.originalDocument || currentOriginalDocument() || context.currentDocument,
  );
  root.querySelectorAll('[data-role="story-vm-dialogue-text"]').forEach(target => {
    delete target.dataset.dialogueKey;
  });
  context.refreshPlayback?.();
  void paintOpeningTextComponentCanvases(root);
}

async function refreshOpeningResetState(root) {
  const button = root?.querySelector("[data-reset-to-original]");
  const context = openingWorkbenchContext;
  const request = ++openingResetRequest;
  if (!button || !root || !context) return;
  const storyPaths = openingResetPaths(context);
  const actorPaths = openingSceneActorResetPaths(context);
  try {
    const repository = context.repository || requireBrowserProjectRepository(state);
    const dirtyStates = await Promise.all([
      repository.listStoryPageWorking().then(rows => rows.some(row => row.resource_id === storyPageWorkingKey(state.view))),
      storyPaths.length
        ? projectAssetSelectionsDirty(
          repository,
          STORY_AUTONOMOUS_RESOURCE_ID,
          storyPaths.map(path => ({kind: "path", path})),
        ) : false,
      actorPaths.length
        ? projectAssetSelectionsDirty(
          repository,
          SCENE_ACTORS_RESOURCE_ID,
          actorPaths.map(path => ({kind: "path", path})),
        ) : false,
    ]);
    const dirty = dirtyStates.some(Boolean);
    if (request === openingResetRequest
        && root.querySelector("[data-reset-to-original]") === button
        && openingWorkbenchRoot() === root
        && context === openingWorkbenchContext
        && state.project === context.project) {
      applyResetToOriginalStates(root, {[STORY_RESET_ITEM_ID]: dirty});
    }
  } catch (error) {
    showEditorError(root, "剧情还原状态读取失败", error);
  }
}

async function resetOpeningChanges(root, refreshPlayback) {
  const button = root?.querySelector("[data-reset-to-original]");
  const context = openingWorkbenchContext;
  if (!button || !context || openingResetting) return;
  const scope = openingPlaybackScope(root);
  openingResetting = true;
  openingResetRequest += 1;
  button.disabled = true;
  button.title = "丢弃本剧情字段、普通场景角色记录及可选自动脚本操作数的全部改动，退回导入时的 ROM 原始状态";
  const controls = [...scope.querySelectorAll("[data-story-workbench-control]")];
  const treeButtons = [...root.querySelectorAll("[data-story-workbench-node]")];
  const controlStates = new Map(controls.map(control => [control, control.disabled]));
  const treeButtonStates = new Map(
    treeButtons.map(treeButton => [treeButton, treeButton.disabled]),
  );
  controls.forEach(control => { control.disabled = true; });
  treeButtons.forEach(treeButton => { treeButton.disabled = true; });
  scope.setAttribute("aria-busy", "true");
  await cancelPendingOpeningSave();
  clearOpeningSaveStates(root);
  try {
    if (context !== openingWorkbenchContext
        || state.project !== context.project
        || openingWorkbenchRoot() !== root) return;
    // 在途保存可能在上面的 await 期间失败并回写旧错误；save chain 排空后再清
    // 一次，且必须早于 paths.length===0 的返回分支。
    clearOpeningSaveStates(root);
    const repository = context.repository || requireBrowserProjectRepository(state);
    const pageChanges = await db.resetStoryPageWorking(state.view);
    const storyPaths = await dirtyOpeningResetPaths(
      repository,
      STORY_AUTONOMOUS_RESOURCE_ID,
      openingResetPaths(context),
    );
    const actorPaths = await dirtyOpeningResetPaths(
      repository,
      SCENE_ACTORS_RESOURCE_ID,
      openingSceneActorResetPaths(context),
    );
    if (context !== openingWorkbenchContext
        || state.project !== context.project
        || openingWorkbenchRoot() !== root) return;
    if (!storyPaths.length && !actorPaths.length && !pageChanges.length) {
      await refreshOpeningResetState(root);
      return;
    }
    if (storyPaths.length) {
      const selections = new Map();
      for (const path of storyPaths) {
        const [field] = await projectFieldsForSelectors(repository,
          STORY_AUTONOMOUS_RESOURCE_ID, [{kind: "path", path}]);
        if (await db.storyScriptOwner(STORY_AUTONOMOUS_RESOURCE_ID, field.recordId)) continue;
        if (!selections.has(field)) selections.set(field, new Set());
        selections.get(field).add(Number(path.at(-1)));
      }
      if (selections.size) await db.writeFields([...selections].map(([field, offsets]) => ({
        field, reset: true, selection: [...offsets].sort((a, b) => a - b)
          .map(offset => ({offset, length: 1})),
      })));
      context.project.story_autonomous_edits = await db.getResourceDraft(STORY_AUTONOMOUS_RESOURCE_ID);
      projectStoryOperands(context.project.story_cutscene_edits, context.project.story_autonomous_edits);
    }
    if (pageChanges.includes(STORY_AUTONOMOUS_RESOURCE_ID) && !storyPaths.length) {
      context.project.story_autonomous_edits = await db.getResourceDraft(STORY_AUTONOMOUS_RESOURCE_ID);
      projectStoryOperands(context.project.story_cutscene_edits, context.project.story_autonomous_edits);
    }
    if (pageChanges.includes("story-interaction-script"))
      context.project.story_interaction_edits = await db.getResourceDraft("story-interaction-script");
    if (actorPaths.length) {
      await resetProjectFieldsAtPaths(
        SCENE_ACTORS_RESOURCE_ID,
        actorPaths,
      );
      context.project.story_scene_actor_edits = await db.getResourceDraft(SCENE_ACTORS_RESOURCE_ID);
    }
    if (context !== openingWorkbenchContext
        || state.project !== context.project
        || openingWorkbenchRoot() !== root) return;
    rebuildOpeningModel(
      root,
      context.originalDocument
        || currentOriginalDocument()
        || context.project.story_cutscene_edits,
    );
    refreshOpeningSelection(root);
    refreshPlayback?.();
    context.refreshTimeline?.(root, context.entry);
    // selection 与 timeline 都可能因 reset 后的脚本/控制流新增控件。把这些 fresh
    // 节点的默认状态也记进同一张表，busy 期间统一禁用，finally 再准确恢复。
    scope.querySelectorAll("[data-story-workbench-control]").forEach(control => {
      if (!controlStates.has(control)) controlStates.set(control, control.disabled);
      control.disabled = true;
    });
    await refreshOpeningResetState(root);
  } catch (error) {
    button.title = `还原失败：${error.message}`;
    await refreshOpeningResetState(root);
  } finally {
    openingResetting = false;
    scope.removeAttribute("aria-busy");
    scope.querySelectorAll("[data-story-workbench-control]").forEach(control => {
      if (controlStates.has(control)) control.disabled = controlStates.get(control);
    });
    root.querySelectorAll("[data-story-workbench-node]").forEach(treeButton => {
      if (treeButtonStates.has(treeButton)) {
        treeButton.disabled = treeButtonStates.get(treeButton);
      }
    });
  }
}

function openingElementTreeOptions(nodes) {
  return {
    nodes: nodes.map(node => ({...node, labelMarkup: esc(node.label), detail: '', detailMarkup: ''})),
    types: EDITABLE_STORY_ELEMENT_TREE_TYPES,
    selectedId: selectedOpeningElementId,
    rowAttributes: node => ({
      "data-story-workbench-kind": node.kind,
      "data-story-workbench-start": node.start,
      "data-story-workbench-end": node.end,
      "data-story-workbench-parent": node.parentId,
      "data-story-workbench-program": Number.isInteger(node.programId)
        ? node.programId : null,
      "data-story-workbench-cursor": node.command
        ? Number(node.command.cursor) : null,
      "data-story-workbench-opcode": node.command
        ? Number(node.command.opcode) : null,
      "data-story-party-slot": node.kind === "party-member"
        ? Number(node.partyMember?.slot) : null,
    }),
    buttonAttributes: (node, selected) => ({
      "aria-pressed": String(selected),
      "data-story-workbench-node": node.id,
    }),
    iconAttributes: () => ({"aria-hidden": "true"}),
    beforeNode: node => node.thumbnail ? `<span class="story-object-thumbnail" data-appearance-key="${esc(
      `${node.variant?.id}:${node.actor?.renderMode}:${node.appearance.actor_type}`,
    )}">${node.thumbnail}</span>` : "",
    afterNode: object => {
      const node = object.party || object;
      return node.kind === "party-member"
      ? `<label class="story-party-render-toggle"
          title="参与当前剧情预览：VM 按在队状态选择分支，舞台允许渲染">
          <input type="checkbox"
            data-story-party-render-slot="${Number(node.partyMember.slot)}"
            data-story-party-render-sequence="${esc(node.sequenceId)}"
            aria-label="渲染${esc(node.partyMember.name)}"${
            node.rendered ? " checked" : ""}>
          <span aria-hidden="true"></span>
        </label>`
      : "";
    },
  };
}

function openingObjectTreeRows(context) {
  const rows = storyObjectRows(context);
  const current = context.trace.shots.find(shot => shot.start <= (context.frame || 0)
    && (context.frame || 0) < shot.end);
  context.activeShotId = current?.id;
  return `<div class="story-object-global">${elementTreeRows(openingElementTreeOptions(
    rows.filter(object => object.kind !== "actor")))}</div>
    <div class="story-object-shot-groups">${context.trace.shots.map(shot => {
      const actors = rows.filter(object => object.shotId === shot.id);
      const scene = context.project?.scenes?.editable_scenes?.find(scene => Number(scene.id) === shot.sceneId);
      const label = `第 ${shot.index + 1} 幕 · ${storyComponentLabel(scene?.name || storyShotLabel(shot.label) || '无场景')}`;
      const active = shot.id === current?.id;
      return `<details class="story-object-shot${active ? " is-current" : ""}"
        data-story-object-shot="${esc(shot.id)}"${active ? " open" : ""}>
        <summary title="${esc(label)}" aria-current="${active ? "true" : "false"}">
          <span>${esc(label)}</span></summary>
        ${actors.length ? elementTreeRows(openingElementTreeOptions(actors))
          : '<p class="story-object-shot-empty">无出场角色</p>'}</details>`;
    }).join("")}</div>`;
}

function openingTreeMarkup(context) {
  const label = state.view === 'story-page' ? storyPageDefinitionForView(state.view)?.title || context.entry.label
    : storySequenceComponentLabel(context.entry.sequence.id, context.entry.label);
  return `<div class="element-tree">${elementTreeRows({
    nodes: [{id: STORY_ROOT_SELECTION, label}],
    selectedId: selectedOpeningElementId, showIcons: false,
    buttonAttributes: (_node, selected) => ({'data-story-workbench-root': '', 'aria-pressed': String(selected)}),
  })}</div><div>${storyPageAuthoringTreeMarkup()}
    <div class="story-workbench-tree-head"><h3>对象</h3><span>${context.trace.objects.length} 个</span></div>
    <div class="element-tree story-workbench-tree">${openingObjectTreeRows(context)}</div>
    </div>
  `;
}

const openingTreeControls = new WeakMap();

function openingObjectTreeControls(root) {
  const tree = root.querySelector(".story-workbench-tree");
  const cached = openingTreeControls.get(root);
  if (cached?.tree === tree && cached.anchor === tree.firstElementChild) return cached;
  const nodes = new Map([...tree.querySelectorAll("[data-story-workbench-node]")].map(button => [
    button.dataset.storyWorkbenchNode, {
      label: button.querySelector(".element-tree-node-copy b"),
      detail: button.querySelector(".element-tree-node-copy small"),
      thumbnail: button.parentElement.querySelector(".story-object-thumbnail"),
    },
  ]));
  const controls = {tree, anchor: tree.firstElementChild, nodes,
    shots: [...tree.querySelectorAll("[data-story-object-shot]")].map(group => ({group, summary: group.querySelector("summary")})),
    scroller: tree.querySelector(".story-object-shot-groups")};
  openingTreeControls.set(root, controls);
  return controls;
}

function syncOpeningShotGroups(root, context, controls) {
  const shot = context.trace.shots.find(shot => shot.start <= context.frame && context.frame < shot.end);
  const changed = context.activeShotId !== shot?.id;
  let activeGroup = null;
  controls.shots.forEach(({group, summary}) => {
    const active = group.dataset.storyObjectShot === shot?.id;
    group.classList.toggle("is-current", active);
    if (summary.getAttribute("aria-current") !== String(active)) {
      summary.setAttribute("aria-current", String(active));
    }
    if ((changed || active) && group.open !== active) group.open = active;
    if (active) activeGroup = group;
  });
  context.activeShotId = shot?.id;
  const scroller = controls.scroller;
  if (!changed || !activeGroup || !scroller) return;
  const bounds = activeGroup.getBoundingClientRect();
  const viewport = scroller.getBoundingClientRect();
  if (bounds.top < viewport.top || bounds.height > viewport.height) {
    scroller.scrollTop += bounds.top - viewport.top;
  } else if (bounds.bottom > viewport.bottom) {
    scroller.scrollTop += bounds.bottom - viewport.bottom;
  }
}

function displayFieldBytes(values, field, programs = storyBrowserVm().programs || []) {
  if (!Array.isArray(values)) return "读取中…";
  if (values.length !== 1) {
    return `${values.map(value => hex(value, 2)).join(" ")} · ${values.join(", ")}`;
  }
  const value = values[0];
  const target = storyOperandReference(field, programs, storyVmSemanticsMap());
  if (target?.module === "text-record") return storyTextHandle(target.regionId, value);
  if (target) return recordUid(target.module === "scene-header-map" ? "scene" : target.module, value);
  const signed = field.encoding === "i8-in-u8"
    ? (value >= 0x80 ? value - 0x100 : value) : null;
  return `${hex(value, 2)} · ${value}${signed === null ? "" : `（有符号 ${signed}）`}`;
}

export function hydrateStorySceneOperands(root) {
  root.querySelectorAll("[data-story-scene-operand]").forEach(picker => {
    hydrateScenePositionPicker(picker, {
      entries: state.project?.scenes?.editable_scenes || [],
      onConfirm: ({sceneId}) => {
        const control = picker.querySelector("[data-story-workbench-control]");
        if (!control || control.disabled) return;
        control.value = String(sceneId);
        control.dispatchEvent(new Event("change", {bubbles: true}));
      },
    });
  });
}

function openingFieldControlMarkup(
  field,
  descriptor,
  currentByte,
  address,
  bitIndex,
  compact = false,
  labelOverride = null,
  actorAppearance = null,
) {
  const minimum = Number(descriptor.min);
  const maximum = Number(descriptor.max);
  const hasRange = Number.isInteger(minimum) && Number.isInteger(maximum)
    && minimum <= maximum;
  const disabled = !Number.isInteger(currentByte) || !hasRange;
  const mask = bitIndex === null ? null : Number(descriptor.mask);
  const shift = bitIndex === null ? 0 : Number(descriptor.shift);
  const value = disabled ? "" : mask === null
    ? currentByte
    : (currentByte & mask) >>> shift;
  const label = labelOverride || (bitIndex === null ? "值" : descriptor.label);
  const attributes = `data-story-workbench-control="${esc(field.id)}"
    data-story-workbench-control-address="${address === null ? "" : address}"
    data-story-workbench-bit-index="${bitIndex === null ? "" : bitIndex}"
    data-story-workbench-min="${hasRange ? minimum : ""}"
    data-story-workbench-max="${hasRange ? maximum : ""}"
    aria-label="${esc(`${field.label} · ${label}`)}"${disabled ? " disabled" : ""}`;
  const direction = String(descriptor.label || field.label).includes("朝向")
    && minimum === 0 && maximum === DIRECTION_LABELS.length - 1;
  const resourceId = field.resource_id || field.owner_ref?.resource_id;
  const byteIndex = Number(field.scene_actor_byte_index ?? field.owner_ref?.byte_index);
  const actorNames = [
    ["actor_type", "direction"], ["x", "direction_attributes"],
    ["y", "direction_attributes"],
    ["text_region", "render_slot_marker"],
    ["interaction_or_record_id"], ["autonomous_script_id"],
  ];
  const script = resourceId === STORY_AUTONOMOUS_RESOURCE_ID
    ? openingWorkbenchContext?.project?.story_autonomous_edits?.scripts?.find(item =>
      item.resource_id === field.owner_ref?.script_resource_id) : null;
  if (resourceId === STORY_AUTONOMOUS_RESOURCE_ID
      && !Number.isInteger(Number(script?.id))) {
    throw new TypeError(`${field.id}: 自主脚本字段对象不存在`);
  }
  const owner = resourceId === SCENE_ACTORS_RESOURCE_ID
    ? {handle: String(field.scene_actor_uid || field.owner_ref?.record_uid),
      name: actorNames[byteIndex]?.[bitIndex ?? 0]}
    : {handle: `${STORY_AUTONOMOUS_RESOURCE_ID}:script:${Number(script?.id)
      .toString(16).toUpperCase().padStart(2, "0")}`, name: "bytecode"};
  let referenceModule = null;
  let regionId = null;
  const operandTarget = resourceId === STORY_AUTONOMOUS_RESOURCE_ID
    ? storyOperandReference(field, storyBrowserVm().programs || [], storyVmSemanticsMap()) : null;
  if (resourceId === SCENE_ACTORS_RESOURCE_ID && byteIndex === 5) {
    referenceModule = STORY_AUTONOMOUS_RESOURCE_ID;
  } else if (resourceId === SCENE_ACTORS_RESOURCE_ID && byteIndex === 4) {
    const document_ = openingWorkbenchContext?.sceneActorCurrentDocument;
    const record = document_?.records?.find(item => item.uid === owner.handle);
    const modes = document_?.interaction_semantics?.interaction_modes || [];
    const selector = Number(record?.text_region);
    const interaction = modes.find(mode => mode.id === "interaction-script");
    const direct = modes.find(mode => mode.id === "direct-dialogue");
    if (selector === interaction?.selector) referenceModule = "story-interaction-script";
    else if (direct?.regions?.some(region => region.selector === selector)) {
      referenceModule = "text-record";
      regionId = selector;
    }
  } else if (resourceId === STORY_AUTONOMOUS_RESOURCE_ID) {
    const textNode = openingWorkbenchContext?.nodes?.find(node =>
      node.recordField?.id === field.id);
    if (textNode) {
      referenceModule = "text-record";
      regionId = Number(textNode.textComponent.blockingUi.region_id);
    } else {
      if (operandTarget && !["encounter-formation", "scene-header-map"].includes(operandTarget.module)) {
        referenceModule = operandTarget.module;
        regionId = operandTarget.regionId ?? null;
      }
    }
  }
  const control = fieldObjectProjectionMarkup({
    resourceId, ...owner, value,
    min: hasRange ? minimum : "", max: hasRange ? maximum : "",
    className: compact ? "tl-number" : "", attributes,
    inputType: referenceModule ? "hidden" : "number",
    options: direction ? Array.from({length: maximum - minimum + 1}, (_, index) => ({
      value: minimum + index,
      label: `${minimum + index} · ${DIRECTION_LABELS[minimum + index]}`,
    })) : null,
  });
  if (operandTarget?.module === "scene-header-map") return scenePositionPickerMarkup({
    entries: state.project?.scenes?.editable_scenes || [], sceneId: value,
    x: null, y: null, label: "场景", footerMarkup: control,
    componentAttributes: `data-story-scene-operand="${esc(field.id)}"`,
  });
  if (referenceModule === "global-event-flag") return renderModuleComponent("save-container", "event-flag-reference", {
    value, label, controlMarkup: control,
  });
  if (referenceModule) {
    const reference = renderModuleComponent(referenceModule, "reference", {
      value, regionId, label, controlMarkup: control,
      picker: resourceId === SCENE_ACTORS_RESOURCE_ID
        ? {compact: true, grouped: true, pageSize: 48, previewPanel: true} : {},
      ...(referenceModule === STORY_AUTONOMOUS_RESOURCE_ID
        ? {entries: openingWorkbenchContext?.project?.story_autonomous_edits?.scripts || []} : {}),
      ...(referenceModule === "story-interaction-script"
        ? {entries: openingWorkbenchContext?.project?.story_interaction_edits?.scripts || []} : {}),
      ...(referenceModule === "direct-frame" ? {reference: {module: referenceModule, key: ["id"]}} : {}),
      ...(referenceModule === "story-interaction-script" ? {reference: {
        module: referenceModule, key: ["id"],
        sentinels: [{value: 0, label: "无主动交互"}],
      }} : {}),
    });
    return resourceId === SCENE_ACTORS_RESOURCE_ID
      ? `<span class="story-reference-choice">${reference}<span data-story-reference-reset="${esc(JSON.stringify(owner))}"></span></span>`
      : reference;
  }
  if (compact) return control;
  const labeledControl = `<label class="story-workbench-field-control">
    <span title="${hasRange ? `${minimum}–${maximum}` : ""}">${esc(label)}</span>
    ${control}
  </label>`;
  if (actorAppearance) {
    return renderModuleComponent("actor-type", "reference", {
      ...actorAppearance,
      value,
      label: "角色形象",
      controlMarkup: labeledControl,
    });
  }
  return labeledControl;
}

function openingFieldControlsMarkup(
  field,
  current,
  address,
  compact = false,
  labelOverride = null,
  options = {},
) {
  const currentByte = Array.isArray(current) && current.length === 1
    ? Number(current[0]) : null;
  const bitFields = field.bit_fields || [];
  const controls = bitFields.length
    ? bitFields.flatMap((bitField, index) => options.initialRecord
        && bitField.label.startsWith("渲染属性") ? [] : [openingFieldControlMarkup(
      field,
      bitField,
      currentByte,
      address,
      index,
      compact,
      labelOverride,
      options.actorAppearance && bitField.label === "角色类型"
        ? options.actorAppearance : null,
    )])
    : [openingFieldControlMarkup(
      field,
      field,
      currentByte,
      address,
      null,
      compact,
      labelOverride,
      options.actorAppearance && field.label === "角色类型"
        ? options.actorAppearance : null,
    )];
  const controlMarkup = compact
    ? controls.join("")
    : `<div class="story-workbench-field-controls">${controls.join("")}</div>`;
  if (!isEncounterFormationOperandField(field)) return controlMarkup;
  return renderModuleComponent(
    "encounter-formation",
    "reference",
    openingEncounterFormationProps(currentByte, "遭遇编队", controlMarkup),
  );
}

function openingEncounterFormationEditorMarkup(field, context) {
  if (!isEncounterFormationOperandField(field)) return "";
  const value = Number(workbenchFieldBytes(context, field)?.[0]);
  const error = openingEncounterFormationSource?.error || "";
  if (!openingEncounterFormationSource) {
    return `<p class="story-workbench-empty-note"
      data-story-formation-editor-unavailable>正在读取既有编队编辑器所需的 owner 正文…</p>`;
  }
  if (error) {
    return `<p class="story-workbench-empty-note"
      data-story-formation-editor-unavailable>编队编辑器不可用：${esc(error)}</p>`;
  }
  try {
    return renderBattleTestFormationInlineEditor(value);
  } catch (exception) {
    return `<p class="story-workbench-empty-note"
      data-story-formation-editor-unavailable>编队编辑器不可用：${
      esc(exception?.message || exception)}</p>`;
  }
}

/** 时间轴按已发布的 reference 三元组显示操作数，编辑控件放在检查器。 */
export function storyEditableTimelineOperandFields({
  scriptKind = "autonomous",
  programId,
  cursor,
  opcode,
}) {
  const context = openingWorkbenchContext;
  if (scriptKind !== "autonomous"
      || !storyEditableWorkbenchView() || !context) return [];
  const identity = `${Number(programId)}:${Number(cursor)}:${Number(opcode)}`;
  const fields = sortedFields(
    [...(operandReferenceIndex(context.fields).byCommand.get(identity) || [])],
    context.segments,
  );
  context.operandPrograms ||= new Map((storyBrowserVm().programs || [])
    .filter(program => program.kind !== 'interaction').map(program => [
      `story-autonomous-script.script.${compactHexId(program.id)}`, [program],
    ]));
  return fields.map(field => {
    const original = fieldBytes(context.originalDocument, field);
    const current = fieldBytes(context.currentDocument, field);
    const changed = Array.isArray(original) && Array.isArray(current)
      && !sameBytes(original, current);
    return {
      id: String(field.id),
      identity: `${field.owner_ref.script_resource_id}.bytecode.${field.owner_ref.byte_index}`,
      label: String(field.label || field.id).replace(/等待的事件 flag id/gu, "等待事件位")
        .replace(/事件 flag id/gu, "事件位"),
      value: displayFieldBytes(current, field, context.operandPrograms.get(field.owner_ref.script_resource_id) || []),
      changed,
    };
  });
}

function storyRuntimeResultMarkup(node) {
  return `<dl class="story-inspector-fields">${node.runtimeResult ? `<dt>物品</dt><dd>${hex(node.runtimeResult.itemId, 2)}</dd>
      <dt>结果</dt><dd>${node.opcode === 0x39
        ? node.runtimeResult.d5 === 0 ? "持有" : "未持有"
        : node.opcode === 0x3A
          ? node.runtimeResult.replaced ? "已替换" : "背包外写入未预览"
        : node.runtimeResult.inserted ? "已放入" : "未放入"} · D5=${hex(node.runtimeResult.d5, 2)}</dd>
      ${node.runtimeResult.replacement === undefined ? ""
        : `<dt>替换物品</dt><dd>${hex(node.runtimeResult.replacement, 2)}</dd>`}
      ${node.runtimeResult.vehicleSlot === undefined ? ""
        : `<dt>战车槽</dt><dd>${hex(node.runtimeResult.vehicleSlot, 2)}</dd>`}
      ${node.runtimeResult.resultRecord === undefined ? ""
        : `<dt>返回记录</dt><dd>${hex(node.runtimeResult.resultRecord, 2)}</dd>`}
      <dt>下一游标</dt><dd>${hex(node.runtimeResult.nextCursor, 2)}</dd>` : ""}</dl>`;
}

function storyCommandActorAppearance(command) {
  const variant = storyVmAllActorLists().find(variant => Number(variant.id) === Number(command?.variantId))
    || openingWorkbenchContext.entry.variant;
  return actorAppearanceContextForStory(variant.actors?.find(actor => Number(actor.record_id) === Number(command?.actorSlot)), variant);
}

export function storyTimelineCommandEditor(command, eventId = null, block = null) {
  const context = openingWorkbenchContext;
  if (!context) return "";
  if (block?.dialogueWindow) return "";
  const textKey = !block?.driver || block.driver.group === "dialogue";
  const program = command && storyBrowserVm().programs.find(program => program.id === command.programId
    && (program.kind || "autonomous") === command.scriptKind);
  const declaration = program?.commands.find(row => command.instructionId
    ? row.instructionId === command.instructionId : row.cursor === command.cursor);
  const snapshot = context.entry.compiled.frames[command?.start ?? block?.start ?? 0] || {};
  const machineInterface = snapshot.endingOperation !== "actor-list-vm"
    && storyInterfaceState(snapshot);
  if (!command && machineInterface?.screen)
    return `<dl class="story-inspector-fields"><dt>界面</dt><dd>${storyInterfaceMarkup(machineInterface)}</dd></dl>`;
  const dialogue = block?.driver?.property === "dialogue" ? block.driver.value : null;
  const textCommand = ["start-blocking-dialogue", "start-event-selected-dialogue"].includes(command?.operation);
  const textNode = context.nodes.find(node => node.kind === "text" && (dialogue
    ? node.start <= block.start && block.start < node.end
    : textCommand && node.scriptId === command.programId && node.commandCursor === command.cursor
      && node.start <= command.start && command.start < node.end));
  const text = !textKey ? "" : textNode ? openingTextComponentMarkup(textNode, context)
    : (dialogue || textCommand) ? openingTextComponentMarkup({id: eventId, textComponent: {
      blockingUi: dialogue ? {region_id: dialogue.region, record_id: dialogue.record}
        : storyVmBlockingUiResolver()({...declaration, opcode: command.opcode, currentOperands: command.operands},
          new Set(snapshot.eventFlags || [])).blockingUi,
      prefixRecord: dialogue && !dialogue.interaction ? `record:0C:${String(dialogue.prefix || 0).padStart(3, "0")}` : null,
    }}, context) : "";
  const branch = command && storyBranchKeyMarkup(command, context.entry.compiled);
  const wrap = operands => (branch ? `${branch.details}${branch.marker}` : "")
    + (text ? `${text}<div data-story-key-operands>${operands}</div>` : operands);
  if (!command) {
    const event = context.nodes.find(node => node.id === eventId && node.kind === "player-boundary");
    return text || (event ? openingInspectorInner(context, event) : "");
  }
  const fields = storyEditableTimelineOperandFields(command)
    .map(item => context.fieldsById.get(item.id)).filter(Boolean);
  const programs = storyBrowserVm().programs;
  const semantics = storyVmSemanticsMap();
  const actorAppearance = storyCommandActorAppearance(command);
  const result = command.runtimeResult ? `<div data-story-key-runtime>${storyRuntimeResultMarkup(command)}</div>` : "";
  if (state.view === 'story-page' && !command.instructionBindings?.length)
    return wrap(`${result}${storyPageKeyEditorMarkup(command)}`);
  if (command.operation === 'attempt-tile-step' && command.instructionId)
    return wrap(`${result}${storyMovementMarkup(command, semantics)}`);
  if (command.instructionId) return wrap(`${result}${command.instructionSource?.kind === 'sequence' ? storyScriptStructureMarkup(command, {operandsOnly: true}) : ''}${command.instructionSource?.kind === "sequence" ? ""
    : storyCommandChoiceMarkup(command, semantics, programs) + storyCommandOperandMarkup(command, program, [], semantics, programs, actorAppearance)}`);
  const operands = fields.map(field => storyCommandFieldOperand(command, field, programs, semantics));
  const destination = operands.some(operand => operand.reference?.module === "scene-header-map");
  const numeric = fields.filter((_field, index) => !operands[index].reference && !destination
    && !(command.opcode === 0x26 && operands[index].operandIndex === 0));
  return wrap(`${result}${storyCommandChoiceMarkup(command, semantics, programs)}${numeric.map(field => editableFieldMarkup(field, context)).join("")}
    ${storyCommandOperandMarkup(command, program, fields, semantics, programs, actorAppearance)}`);
}

export function hydrateStoryTimelineCommandEditor(root) {
  openingTextEditorController?.refreshBindings();
  void hydrateModuleComponents(root);
  if (state.view === 'story-page') {
    void hydrateStoryPageKeyEditors(root, render).catch(error => showEditorError(root, 'key', error));
    if (root.querySelector('[data-story-page-key-editor]')) return;
  }
  hydrateStorySceneOperands(root);
  const onValue = async resourceId => {
    const context = openingWorkbenchContext;
    if (resourceId === STORY_AUTONOMOUS_RESOURCE_ID) {
      context.project.story_autonomous_edits = await db.getResourceDraft(STORY_AUTONOMOUS_RESOURCE_ID);
      projectStoryOperands(context.project.story_cutscene_edits, context.project.story_autonomous_edits);
    }
    if (resourceId === "story-interaction-script") context.project.story_interaction_edits = await db.getResourceDraft(resourceId);
    rebuildOpeningModel(openingWorkbenchRoot(), context.originalDocument || context.currentDocument);
    for (const field of context.fields) if (field.kind === "script-operand")
      syncOpeningAddress(openingWorkbenchRoot(), fieldAddress(field, context.segments));
    context.refreshPlayback?.();
    context.refreshTimeline?.(openingWorkbenchRoot(), context.entry);
    await refreshOpeningResetState(openingWorkbenchRoot());
  };
  const changed = resourceId => onValue(resourceId).catch(error => showEditorError(root, "指令", error));
  void hydrateStoryMovement(root, db, onValue, instructionId => {
    const compiled = openingWorkbenchContext.entry.compiled;
    const trace = storyExecutionTrace(compiled);
    const edited = trace.commands.find(run => run.instructionId === instructionId);
    if (edited) state.storyMovementTimingBaselines.set(String(state.storySequenceId), {commands: trace.commands, edited});
  }, () => storyBrowserVm().programs).catch(error => showEditorError(root, '移动', error));
  void hydrateStoryCommandChoices(root, db, changed).catch(error => showEditorError(root, "指令枚举", error));
  void hydrateStoryCommandOperands(root, db, changed, openingWorkbenchContext.project?.scenes?.editable_scenes || []).catch(error => showEditorError(root, "指令操作数", error));
  void hydrateStoryScriptStructure(root, db, changed, storyVmSemanticsMap(), {
    actorAppearanceFor: storyCommandActorAppearance,
    scenes: openingWorkbenchContext.project?.scenes?.editable_scenes || [],
    sceneAt: frame => openingWorkbenchContext.entry?.compiled.frames[frame || 0]?.sceneId,
  }).catch(error => showEditorError(root, "指令结构", error));
  void bindFieldObjectProjections(root, db).catch(error => showEditorError(root, "指令操作数", error));
}

function editableFieldMarkup(field, context, options = {}) {
  const address = fieldAddress(field, context.segments);
  const original = workbenchFieldBytes(context, field, true);
  const current = workbenchFieldBytes(context, field);
  const changed = Array.isArray(original) && Array.isArray(current)
    && !sameBytes(original, current);
  return `<article class="story-workbench-field${
    changed ? " story-workbench-field-changed" : ""
  }" data-story-workbench-field="${esc(field.id)}"
    data-story-workbench-address="${address === null ? "" : address}"
    data-story-workbench-prg="${
    address === null ? "" : hex(address)}">
    <header class="story-workbench-field-head">
      <b>${esc(field.label)}</b>
    </header>
    ${options.controls === false ? "" : openingFieldControlsMarkup(field, current, address, false, null, options)}
    ${openingEncounterFormationEditorMarkup(field, context)}
    <span class="story-workbench-save-state" data-story-workbench-save-state
      aria-live="polite"></span>
  </article>`;
}

function editableFieldSection(title, fields, context, options = {}) {
  return `<section class="story-workbench-field-section">
    <h4>${esc(title)}</h4>
    ${fields.length
      ? fields.map(field => editableFieldMarkup(field, context, options)).join("")
      : ``}
  </section>`;
}

function controlFieldValue(control, field, rawByte) {
  const bitIndex = control.dataset.storyWorkbenchBitIndex === ""
    ? null : Number(control.dataset.storyWorkbenchBitIndex);
  if (bitIndex === null) return rawByte;
  const bitField = field.bit_fields?.[bitIndex];
  if (!bitField) return null;
  return (rawByte & Number(bitField.mask)) >>> Number(bitField.shift);
}

function syncOpeningAddress(root, address, sourceControl = null) {
  const context = openingWorkbenchContext;
  if (!context || !Number.isInteger(address)) return;
  openingPlaybackScope(root)?.querySelectorAll(
    `[data-story-workbench-address="${address}"]`,
  ).forEach(article => {
    const field = context.fieldsById.get(article.dataset.storyWorkbenchField);
    if (!field) return;
    const original = workbenchFieldBytes(context, field, true);
    const current = workbenchFieldBytes(context, field);
    const changed = Array.isArray(original) && Array.isArray(current)
      && !sameBytes(original, current);
    article.classList.toggle("story-workbench-field-changed", changed);
    const badge = article.querySelector("[data-story-workbench-changed-badge]");
    if (badge) badge.hidden = !changed;
    const currentValue = article.querySelector(
      "[data-story-workbench-current-value]",
    );
    const originalValue = article.querySelector(
      "[data-story-workbench-original-value]",
    );
    if (originalValue) originalValue.innerHTML = storyHandleTextMarkup(displayFieldBytes(original, field));
    if (currentValue) currentValue.innerHTML = storyHandleTextMarkup(displayFieldBytes(current, field));
    const rawByte = Array.isArray(current) && current.length === 1
      ? Number(current[0]) : null;
    article.querySelectorAll("[data-story-workbench-control]").forEach(control => {
      const value = Number.isInteger(rawByte)
        ? controlFieldValue(control, field, rawByte) : null;
      if (control !== sourceControl && value !== null) control.value = String(value);
      void syncReferencePickerControl(control);
      control.setAttribute("aria-invalid", "false");
    });
    syncModuleComponents(article);
  });
}

function openingControlDescriptor(control, field) {
  const bitIndex = control.dataset.storyWorkbenchBitIndex === ""
    ? null : Number(control.dataset.storyWorkbenchBitIndex);
  return bitIndex === null ? {bitIndex, descriptor: field} : {
    bitIndex,
    descriptor: field.bit_fields?.[bitIndex] || null,
  };
}

function handleOpeningControlInput(root, control) {
  const context = openingWorkbenchContext;
  const field = context?.fieldsById.get(control.dataset.storyWorkbenchControl);
  if (!context || !field) return;
  const {bitIndex, descriptor} = openingControlDescriptor(control, field);
  const minimum = Number(descriptor?.min);
  const maximum = Number(descriptor?.max);
  const value = control.tagName === "INPUT" && control.type === "number"
    ? control.valueAsNumber : Number(control.value);
  const address = fieldAddress(field, context.segments);
  const valid = descriptor && Number.isInteger(value)
    && Number.isInteger(minimum) && Number.isInteger(maximum)
    && value >= minimum && value <= maximum
    && control.validity?.valid !== false;
  if (!valid) {
    control.setAttribute("aria-invalid", "true");
    sayOpeningSaveState(address, `请输入 ${minimum}–${maximum}`, context);
    return;
  }
  const currentByte = Number(workbenchFieldBytes(context, field)?.[0]);
  if (!Number.isInteger(currentByte)) return;
  let nextByte = value;
  if (bitIndex !== null) {
    const mask = Number(descriptor.mask);
    const shift = Number(descriptor.shift);
    nextByte = (currentByte & (~mask & 0xFF)) | ((value << shift) & mask);
  }
  nextByte &= 0xFF;
  control.setAttribute("aria-invalid", "false");
  if (nextByte === (currentByte & 0xFF)) {
    syncOpeningAddress(root, address, control);
    return;
  }
  if (field.resource_id === SCENE_ACTORS_RESOURCE_ID) {
    const record = sceneActorRecordMap(
      context.sceneActorCurrentDocument,
    ).get(String(field.scene_actor_uid));
    if (!record) return;
    try {
      applySceneActorRecordByte(
        record,
        Number(field.scene_actor_byte_index),
        nextByte,
        String(field.scene_actor_uid),
      );
      applySceneActorAliasPatch(
        context.sceneActorCurrentDocument,
        field.scene_actor_uid,
        Object.fromEntries(
          SCENE_ACTOR_EDITABLE_FIELDS.map(name => [name, Number(record[name])]),
        ),
      );
    } catch (error) {
      control.setAttribute("aria-invalid", "true");
      sayOpeningSaveState(address, `不能编码：${error.message}`, context);
      return;
    }
    queueOpeningSceneActorChange(field, address, record, context);
  } else {
    const segment = segmentMap(context.currentDocument).get(String(field.segment));
    const offset = Number(field.offset);
    if (!Array.isArray(segment?.bytes)
        || offset < 0 || offset >= segment.bytes.length) return;
    segment.bytes[offset] = nextByte;
    setStoryOperand(context.project.story_autonomous_edits, field, nextByte);
    queueOpeningByteChange(field, address, nextByte, context);
  }
  syncOpeningAddress(root, address, control);
  context.refreshPlayback?.();
  // 输入事件不是播放帧推进；时间轴回调只就地更新刻度/块并保留现有控件节点，
  // 所以 working 值一变，几何可以立即跟上而不会打断正在编辑的 input。
  context.refreshTimeline?.(root, context.entry);
}

function restoreInvalidOpeningControl(root, control) {
  if (control.getAttribute("aria-invalid") !== "true") return;
  const context = openingWorkbenchContext;
  const field = context?.fieldsById.get(control.dataset.storyWorkbenchControl);
  const address = field ? fieldAddress(field, context.segments) : null;
  syncOpeningAddress(root, address);
  sayOpeningSaveState(address, "", context);
}

function finishOpeningControlChange(root, control) {
  const context = openingWorkbenchContext;
  const field = context?.fieldsById.get(control.dataset.storyWorkbenchControl);
  if (control.getAttribute("aria-invalid") === "true") {
    restoreInvalidOpeningControl(root, control);
  }
  const actorReference = field?.resource_id === SCENE_ACTORS_RESOURCE_ID
    && [3, 4].includes(Number(field.scene_actor_byte_index));
  if (isActorScriptIdField(field) || actorReference || field?.kind === "script-operand") {
    // 引用提交后重建脚本与文本节点。
    const inspector = root.querySelector("[data-story-workbench-inspector]");
    const scrollTop = inspector?.scrollTop || 0;
    rebuildOpeningModel(
      root,
      context.originalDocument || currentOriginalDocument() || context.currentDocument,
    );
    refreshOpeningSelection(root);
    if (inspector) inspector.scrollTop = scrollTop;
  }
  // change 后再同步一次：actor script id 会在上面重建字段模型；无效输入也可能
  // 已恢复旧值。回调保留既有时间轴与控件节点，不会截断当前手势。
  context?.refreshTimeline?.(root, context.entry);
}

function immutableScriptMarkup(node) {
  const program = node.program;
  if (!program) return ``;
  const commands = program.commands || [];
  return `<section class="story-workbench-readonly">
    <details open>
      <summary>不可编辑结构 · ${commands.length} 条命令</summary>
      ${commands.map(command => `<div class="story-workbench-readonly-row"
        data-story-workbench-readonly="opcode"
        data-story-workbench-readonly-address="${Number(command.prg_offset)}">
        <span>cursor ${esc(command.cursor_hex || hex(command.cursor, 2))}</span>
        <b>opcode ${esc(command.opcode_hex || hex(command.opcode, 2))}</b>
        <small>结构步长 ${Number(command.normal_advance) || 0}</small>
      </div>`).join("")}
    </details>
  </section>`;
}

function shotCardMarkup(node) {
  const shot = node.shot;
  return `<dl class="story-workbench-shot-facts">
    <div><dt>角色表</dt><dd>${handleMarkup(recordUid("scene-actor-list", shot.variant_id))}</dd></div>
    <div><dt>story state</dt><dd>${esc(shot.story_state_hex || hex(shot.story_state, 2))}</dd></div>
    <div><dt>场景</dt><dd class="story-workbench-scene-reference">
      ${renderModuleComponent("scene-header-map", "preview", {
        sceneId: shot.scene_id,
        name: shot.scene_name,
        detailLinkMarkup: storySceneLink(shot.scene_id, "↗"),
        entry: (state.project?.scenes?.editable_scenes || []).find(entry =>
          Number(entry.id) === Number(shot.scene_id)),
        width: 72,
        height: 44,
      })}
    </dd></div>
    <div><dt>角色</dt><dd>${node.actors.length} 条记录</dd></div>
  </dl>
  `;
}

function endingStageCardMarkup(node) {
  const stage = node.stage || {};
  const record = stage.ui_record || null;
  const sceneId = Number(stage.scene_id);
  const scene = Number.isInteger(sceneId) && sceneId >= 0
    ? storySceneLink(sceneId) : "—";
  const recordReference = record
    ? openingTextRecordReference(record) : null;
  const interfaceState = endingStageInterface(stage);
  return `<dl class="story-workbench-shot-facts">
    <div><dt>专用模式</dt><dd>${esc(hex(stage.mode, 2))}</dd></div>
    <div><dt>操作</dt><dd>${esc(stage.operation || stage.kind || "—")}</dd></div>
    <div><dt>持续</dt><dd>${Number.isInteger(node.start) ? node.end - node.start
      : Math.max(1, Number(stage.duration_frames) || 1)} 帧</dd></div>
    <div><dt>场景</dt><dd>${scene}</dd></div>
    <div><dt>画面底色</dt><dd>${esc(stage.fill || "按场景")}</dd></div>
    <div><dt>文字记录</dt><dd>${recordReference
      ? storyTextMarkup(recordReference) : "—"}</dd></div>
    ${interfaceState?.screen ? `<div><dt>界面</dt><dd>${storyInterfaceMarkup(interfaceState)}</dd></div>` : ""}
  </dl>
  `;
}

function endingStageInterface(stage) {
  return storyInterfaceState({endingOperation: stage.operation, endingStageId: stage.id,
    endingStageLabel: stage.label, endingWantedTargetId: stage.formation_id,
    dialogue: stage.ui_screen_id ? {uiScreenId: stage.ui_screen_id,
      uiPreviewContext: stage.ui_preview_context} : stage.ui_record ? {
      regionId: stage.ui_record.region_id, recordId: stage.ui_record.record_id, pageIndex: 0,
    } : null});
}

function openingTextRecordReference(blockingUi) {
  const regionId = Number(blockingUi?.region_id);
  const recordId = Number(blockingUi?.record_id);
  if (!Number.isInteger(regionId) || regionId < 0
      || !Number.isInteger(recordId) || recordId < 0) return null;
  const region = regionId.toString(16).toUpperCase().padStart(2, "0");
  const record = String(recordId).padStart(3, "0");
  return `record:${region}:${record}`;
}

async function paintOpeningTextComponentCanvases(root) {
  const canvases = [...root.querySelectorAll(
    "[data-story-workbench-dialogue-page]",
  )];
  await Promise.all(canvases.map(async canvas => {
    const status = canvas.parentElement?.querySelector(
      "[data-story-workbench-dialogue-status]",
    );
    const record = canvas.dataset.storyWorkbenchDialogueRecord || "";
    if (canvas.dataset.storyWorkbenchDialogueRecordFound === "false" || !record) {
      canvas.hidden = true;
      if (status) {
        status.hidden = false;
        status.textContent = "预览不可用：当前有效记录没有原始字节。";
      }
      return;
    }
    try {
      const [renderSources, source] = await Promise.all([
        uiJsRenderSources(),
        textCatalogRecordSource(record),
      ]);
      if (!canvas.isConnected) return;
      if (!Array.isArray(source.bytes)) {
        canvas.hidden = true;
        if (status) {
          status.hidden = false;
          status.textContent = `预览不可用：${record} 没有原始字节。`;
        }
        return;
      }
      uiPaintDialogueCanvas(
        canvas,
        record,
        Number(canvas.dataset.storyWorkbenchDialoguePage) || 0,
        renderSources,
        source.records,
        {
          fieldWindow: canvas.dataset.storyWorkbenchDialogueFieldWindow !== "false",
          prefixRecord: canvas.dataset.storyWorkbenchDialoguePrefix || null,
          interactionWindow: canvas.dataset.storyWorkbenchDialogueInteraction === "true",
        },
      );
      canvas.hidden = false;
      if (status) status.hidden = true;
    } catch (error) {
      editorLog.error("剧情", `操作失败：${error?.message || error}`, error);
      if (!canvas.isConnected) return;
      canvas.hidden = true;
      if (status) {
        status.hidden = false;
        status.textContent = `预览不可用：${error.message || error}`;
      }
    }
  }));
}

function openingTextComponentMarkup(node, context) {
  const component = node.textComponent || {};
  const reference = openingTextRecordReference(component.blockingUi || {});
  const references = [...new Set([component.prefixRecord, reference].filter(Boolean))];
  return `<div class="story-workbench-text-component" data-story-key-text
    data-story-workbench-text-component="${esc(node.id)}">${Number.isInteger(node.dialoguePage)
      ? `<pre>${esc((component.blockingUi?.pages?.[node.dialoguePage] || []).join('\n'))}</pre>` : ''}${references.map(recordId => {
    const current = currentTextReference(recordId);
    return `<section class="story-workbench-text-record">
      ${storyResourceMarkup(recordId, "", current.uid)}
      ${fixedTextEditorMarkup({recordId, editorId: `${node.id}:${recordId}`,
        document: context.project?.text_record_edits, encoding: context.project?.text_record_encoding,
        label: recordId, compact: true, className: "story-workbench-text-edit"})}
    </section>`;
  }).join("")}</div>`;
}

function storyLifecycleContextMarkup(node) {
  const record = node.storyContext;
  if (!record) {
    return ``;
  }
  const handle = String(record.handle);
  const sceneReference = String(record.scene_reference);
  const cameraX = Number(record.camera_origin_x);
  const cameraY = Number(record.camera_origin_y);
  return `<section class="story-workbench-lifecycle-context"
    data-story-lifecycle-context="${esc(handle)}"
    data-story-lifecycle-scene-reference="${esc(sceneReference)}"
    data-story-lifecycle-camera-x="${cameraX}"
    data-story-lifecycle-camera-y="${cameraY}">
    <dl class="story-inspector-fields">
      <dt>权威记录</dt><dd>${handleMarkup(handle)}</dd>
      <dt>场景引用</dt><dd>${scenePositionPickerMarkup({
        entries: state.project?.scenes?.editable_scenes || [],
        sceneId: Number.parseInt(sceneReference.split(":").at(-1), 16),
        x: cameraX, y: cameraY, disabled: true, label: "镜头位置"})}</dd>
      <dt>镜头原点 X</dt><dd>${cameraX}</dd>
      <dt>镜头原点 Y</dt><dd>${cameraY}</dd>
    </dl>
  </section>`;
}

function openingObjectFixedMarkup(context, object) {
  if (object.kind === "actor") return object.sources.map(node => {
    const uid = storyActorHandle(node.shot.variant_id, node.actor.record_id);
    return `<section class="story-workbench-field-section"><h4>${handleMarkup(uid)}
      <span data-story-actor-reset="${esc(uid)}"></span></h4>
      ${node.actorFields.map(field => `<div class="story-workbench-field-section"
        data-story-workbench-field="${esc(field.id)}"
        data-story-workbench-address="${fieldAddress(field, context.segments)}">
        ${field.bit_fields?.length ? "" : `<small>${esc(field.label)}</small>`}${openingFieldControlsMarkup(field,
          workbenchFieldBytes(context, field), fieldAddress(field, context.segments), false, null,
          {initialRecord: true, actorAppearance: actorAppearanceContextForStory(node.actor, node.variant)})}</div>`).join("")}
      <div class="story-workbench-field-section"><small>移动与朝向属性</small>
        <span data-story-actor-motion="${esc(uid)}"></span></div>
      </section>`;
  }).join("") + (object.party ? openingInspectorInner(context, object.party) : "")
    + (object.nameSource.match(/record:0C:[0-9]+/u) ? fixedTextEditorMarkup({
      recordId: object.nameSource.match(/record:0C:[0-9]+/u)[0],
      document: context.project?.text_record_edits, encoding: context.project?.text_record_encoding,
      label: "名称", compact: true,
    }) : "");
  if (object.kind === "camera") {
    const node = context.nodes.find(node => node.kind === "camera-settings"
      && node.start <= (context.frame || 0) && (context.frame || 0) < node.end);
    return node ? openingInspectorInner(context, node) : "<p>没有已发布的镜头初值。</p>";
  }
  return "";
}

function openingInspectorInner(context, sourceNode = null, options = {}) {
  if (!sourceNode && selectedOpeningElementId === STORY_ROOT_SELECTION) return '';
  const object = !sourceNode && storyInspectorObject(context, selectedOpeningElementId);
  if (object) return storyObjectInspector(context, object,
    (node, options) => openingInspectorInner(context, node, options), openingObjectFixedMarkup(context, object));
  const node = sourceNode || context.nodes.find(item => item.id === selectedOpeningElementId)
    || context.nodes[0]
    || null;
  if (!node) return `<div class="empty"><b>没有可显示的演出元素</b></div>`;
  if (node.kind === "sequence") return storyInspectorInnerMarkup(context.entry);
  const fields = node.fields || [];
  const handle = ["camera", "camera-settings"].includes(node.kind) && node.storyContext
    ? String(node.storyContext.handle) : "";
  let body;
  if (["shot", "script-shot"].includes(node.kind)) {
    body = shotCardMarkup(node);
  } else if (node.kind === "ending-stage") {
    body = endingStageCardMarkup(node);
  } else if (node.kind === "party") {
    body = ``;
  } else if (node.kind === "party-member") {
    const member = node.partyMember;
    const actorType = Number.isInteger(Number(member.storyActorType))
      ? Number(member.storyActorType) : null;
    body = `${renderModuleComponent("actor-type", "reference", {
      ...actorAppearanceContextForParty(member, node.variant),
      value: actorType,
      label: `${member.name}形象`,
      controlMarkup: `<label class="boot-text-field">
        <small>角色类型（精确值）</small>
        ${fieldObjectProjectionMarkup({resourceId: VISUAL_ACTORS_RESOURCE_ID,
          handle: `${VISUAL_ACTORS_RESOURCE_ID}:party:${Number(member.slot)}`,
          name: "actor_type", value: actorType ?? "", min: 0,
          max: ACTOR_TYPE_COUNT - 1,
          attributes: `data-story-party-appearance-control="${Number(member.slot)}"
            aria-label="${esc(`${member.name}角色类型`)}"`})}
      </label>
      <span class="story-workbench-save-state"
        data-story-party-appearance-save-state="${Number(member.slot)}"
        aria-live="polite"></span>`,
    })}
    <dl class="story-inspector-fields">
      <dt>队伍槽</dt><dd>${Number(member.slot)}</dd>
      <dt>当前预览</dt><dd>${node.rendered ? "参与 VM 并渲染" : "不渲染"}</dd>
      <dt>默认值</dt><dd>${member.defaultRendered
        ? "角色数据标记为初始在队" : "角色数据标记为后续入队"}</dd>
      <dt>存活形象类型</dt><dd>${actorType === null
        ? "未确认" : storyResourceMarkup(recordUid("actor-type", actorType))}</dd>
    </dl>
    `;
  } else if (["camera", "camera-settings"].includes(node.kind)) {
    body = `${node.snapshot ? `<dl class="story-inspector-fields">
      <dt>场景</dt><dd>${scenePositionPickerMarkup({
        entries: state.project?.scenes?.editable_scenes || [], sceneId: node.snapshot.sceneId,
        x: node.snapshot.cameraTileOriginX, y: node.snapshot.cameraTileOriginY,
        disabled: true, label: "镜头位置", componentAttributes: "data-story-workbench-position"})}</dd>
      <dt>镜头 X</dt><dd>${node.snapshot.cameraTileOriginX ?? "—"}</dd>
      <dt>镜头 Y</dt><dd>${node.snapshot.cameraTileOriginY ?? "—"}</dd></dl>` : ""}${
      node.storyContext ? storyLifecycleContextMarkup(node)
        : editableFieldSection("镜头", node.fields, context)}`;
  } else if (node.kind === "interface-reference") {
    body = `<dl class="story-inspector-fields"><dt>界面</dt><dd>${storyInterfaceMarkup(node.interfaceState || endingStageInterface(node.stage))}</dd>
      <dt>文字</dt><dd>${storyTextMarkup(node.reference || openingTextRecordReference(node.textComponent?.blockingUi))}</dd></dl>`;
  } else if (["text", "script-text"].includes(node.kind)) {
    body = openingTextComponentMarkup({...node,
      textComponent: {...node.textComponent, inspectorCurrent: options.currentState}}, context)
      + (node.kind === "script-text" && node.recordField ? `<details><summary>来源</summary>${
        editableFieldMarkup(node.recordField, context)}</details>` : "");
  } else if (node.kind === "player-boundary") {
    body = `${storyScriptMarkup(node.scriptKind, node.programId)}${editableFieldSection("操作数", node.fields, context)}`;
  } else if (node.kind === "action") {
    body = `<dl class="story-inspector-fields"><dt>角色</dt><dd>${node.actorSlot + 1}</dd>
      <dt>动作</dt><dd>${esc(node.operation)}</dd>
      <dt>脚本</dt><dd>${storyScriptMarkup(node.scriptKind, node.programId, node.program?.unwrittenOverflowBytes, {location: node.program?.scriptLocation, reason: node.program?.unwrittenReason})}</dd>
      <dt>命令</dt><dd>${hex(node.cursor, 2)} · ${hex(node.opcode, 2)}</dd>
      </dl>${node.runtimeResult ? storyRuntimeResultMarkup(node) : ""}
      ${editableFieldSection("操作数", node.fields, context)}`;
  } else if (node.kind === "audio") {
    body = `<dl class="story-inspector-fields"><dt>类型</dt><dd>${esc(node.audioKind)}</dd>
      <dt>命令</dt><dd>${storyResourceMarkup(node.resource_id || recordUid("audio-command", node.command_id))}</dd>
      <dt>资源</dt><dd>${handleMarkup(node.resource_id || "")}</dd></dl>`;
  } else if (node.kind === "actor") {
    body = `${handleMarkup(storyActorHandle(node.shot.variant_id, node.actor.record_id))}
      ${storyScriptMarkup("autonomous", node.scriptId, node.program?.unwrittenOverflowBytes, {location: node.program?.scriptLocation, reason: node.program?.unwrittenReason})}
      ${editableFieldSection("角色记录", node.actorFields, context, {
        controls: !context.trace.objects.some(object => object.refs?.some(ref =>
          ref.variantId === Number(node.shot.variant_id) && ref.actorSlot === Number(node.actor.record_id))),
        actorAppearance: actorAppearanceContextForStory(node.actor, node.variant),
      })}
      ${editableFieldSection(
        "自动动作脚本",
        node.scriptFields,
        context,
      )}
      ${immutableScriptMarkup(node)}`;
  } else {
    body = ``;
  }
  const originalMissing = fields.length > 0 && (
    !context.originalDocument
    || (fields.some(field => field.resource_id === SCENE_ACTORS_RESOURCE_ID)
      && !context.sceneActorOriginalDocument)
  );
  return `<article class="story-workbench-card" data-story-workbench-card="${esc(node.id)}">
    <header class="story-workbench-card-head">
      <span>${esc(EDITABLE_STORY_ELEMENT_TREE_TYPES[node.kind]?.label || node.kind)}</span>
      <h2>${node.labelMarkup ?? storyHandleTextMarkup(node.label)}</h2>
      ${handle ? handleMarkup(handle) : ""}
    </header>
    ${originalMissing ? `<p class="story-workbench-original-note"
      data-story-workbench-original-note>${
      openingOriginalError || openingSceneActorOriginalError
        ? `ROM 原值读取失败：${esc((
          openingOriginalError || openingSceneActorOriginalError
        ).message || (openingOriginalError || openingSceneActorOriginalError))}`
        : "正在从项目 repository 读取 ROM Original…"}</p>` : ""}
    ${Number.isInteger(node.start) ? `<p>F${node.start}–${node.end - 1}</p>` : ""}
    ${body}
  </article>`;
}

function openingSelectedPhysicalMarkup(context) {
  const node = storyObjectRows(context).find(item => item.id === selectedOpeningElementId);
  const rows = (node?.fields || []).map(field => ({
    label: field.label || field.id,
    address: {space: "prg", offset: fieldAddress(field, context.segments)},
    length: Number(field.length) || 1,
  }));
  return physicalLocationMarkup({uid: context.entry.resourceUid, rows});
}

function createEditableStoryWorkbench(entry, variantsById, renderStage, renderPlaybackPanel, toolbarMarkup) {
  const currentDocument = state.project?.story_cutscene_edits || null;
  const originalDocument = currentOriginalDocument();
  const sceneActorCurrentDocument =
    state.project?.story_scene_actor_edits || null;
  const sceneActorOriginalDocument = currentSceneActorOriginalDocument();
  const authorityDocument = originalDocument || currentDocument;
  const model = openingElementNodes(
    entry,
    variantsById,
    authorityDocument,
    currentDocument,
    sceneActorOriginalDocument,
    sceneActorCurrentDocument,
    state.project?.field_scene_lifecycle || null,
  );
  if (openingWorkbenchContext?.pageKey !== `${state.view}:${state.storyPageId || ''}:${entry.sequence.id}`
    || selectedOpeningElementId !== STORY_ROOT_SELECTION
      && !model.trace.objects.some(node => node.id === selectedOpeningElementId)) {
    selectedOpeningElementId = STORY_ROOT_SELECTION;
  }
  const context = {
    ...model,
    entry,
    variantsById,
    currentDocument,
    originalDocument,
    repository: state.projectRepository || null,
    project: state.project || null,
    pageKey: `${state.view}:${state.storyPageId || ''}:${entry.sequence.id}`,
  };
  openingWorkbenchContext = context;
  const branchPreview = storyBranchPreviewMarkup(entry);
  return `${screenWorkbench({namespace: 'story', className: 'story-workbench story-workbench-elements',
    heightMode: 'timeline',
    attributes: {'data-story-workbench-editable': entry.sequence.id}, toolbarMarkup,
    treeTitle: null, treeClassName: 'story-browser story-workbench-tree-panel', treeScroll: 'body',
    treeMarkup: openingTreeMarkup(context), stageMarkup: renderStage(entry),
    inspectorTitle: null, inspectorClassName: 'story-inspector story-workbench-inspector',
    inspectorAttributes: {'data-story-workbench-inspector': ''},
    inspectorMarkup: `${storyPageAuthoringInspectorMarkup()}
      <div data-story-root-details${selectedOpeningElementId === STORY_ROOT_SELECTION ? '' : ' hidden'}>
      <div class="page-global-info">
        ${(storyPageDefinitionForView(state.view)?.links || []).map(link =>
          `<a class="editor-inline-link" href="${esc(link.href)}">${esc(link.label)}</a>`).join('')}
        ${storyEventLinksMarkup(entry.sequence)}
      </div>
      ${storyWaitPreviewMarkup(entry)}
      ${branchPreview}
      </div>
      <div data-story-object-inspector${selectedOpeningElementId === STORY_ROOT_SELECTION ? ' hidden' : ''}>${openingInspectorInner(context)}</div>
      <section class="story-timeline-details" data-story-timeline-details hidden></section>
      <details data-story-object-sources${selectedOpeningElementId === STORY_ROOT_SELECTION ? ' hidden' : ''}><summary>对象来源与其他指令</summary><div data-story-object-extra></div></details>
    `,
  })}${renderPlaybackPanel?.(entry) || ""}
  <div data-story-workbench-physical>${openingSelectedPhysicalMarkup(context)}</div>`;
}

function rebuildOpeningModel(root, originalDocument) {
  const context = openingWorkbenchContext;
  if (!context) return;
  const currentDocument = state.project?.story_cutscene_edits || context.currentDocument;
  const model = openingElementNodes(
    context.entry,
    context.variantsById,
    originalDocument,
    currentDocument,
    currentSceneActorOriginalDocument(),
    state.project?.story_scene_actor_edits
      || context.sceneActorCurrentDocument,
    state.project?.field_scene_lifecycle || null,
  );
  Object.assign(context, model, {currentDocument, originalDocument});
  context.operandPrograms = null;
  context.objectGeneration = (context.objectGeneration || 0) + 1;
  if (selectedOpeningElementId !== STORY_ROOT_SELECTION && !context.authoringSelected
    && !storyInspectorObject(context, selectedOpeningElementId)) {
    selectedOpeningElementId = STORY_ROOT_SELECTION;
  }
  const tree = root.querySelector(".story-workbench-tree");
  if (tree) tree.innerHTML = openingObjectTreeRows(context);
  const shotCount = root.querySelector(".story-workbench-tree-head span");
  if (shotCount) {
    shotCount.textContent = `${model.trace.objects.length} 个`;
  }
  const branchPreview = root.querySelector("[data-story-branch-preview]");
  if (branchPreview) branchPreview.outerHTML = storyBranchPreviewMarkup(context.entry);
}

function sayOpeningPartyAppearanceState(root, partySlot, message, invalid = false) {
  const output = root.querySelector(
    `[data-story-party-appearance-save-state="${Number(partySlot)}"]`,
  );
  if (!output) return;
  output.textContent = message;
  output.classList.toggle("error", invalid);
}

function saveOpeningPartyAppearance(root, control) {
  const context = openingWorkbenchContext;
  const slot = Number(control?.dataset.storyPartyAppearanceControl);
  const actorType = Number(control?.value);
  if (!context || !Number.isInteger(slot) || slot < 0
      || slot >= PARTY_MEMBER_COUNT || !Number.isInteger(actorType)
      || actorType < 0 || actorType >= ACTOR_TYPE_COUNT) {
    control?.setAttribute("aria-invalid", "true");
    sayOpeningPartyAppearanceState(root, slot, "请输入 0–62 的角色类型。", true);
    return;
  }
  let repository;
  try {
    repository = requireBrowserProjectRepository(state);
  } catch (error) {
    sayOpeningPartyAppearanceState(
      root, slot, error?.message || String(error), true,
    );
    return;
  }
  const generation = ++openingPartyAppearanceSaveGeneration;
  const picker = control.closest("[data-actor-appearance-picker]");
  control.disabled = true;
  control.setAttribute("aria-invalid", "false");
  picker?.setAttribute("aria-busy", "true");
  sayOpeningPartyAppearanceState(root, slot, "正在保存到角色形象基础表…");

  const stillCurrent = () => generation === openingPartyAppearanceSaveGeneration
    && context === openingWorkbenchContext
    && repository === state.projectRepository
    && root === openingWorkbenchRoot();
  const outcome = (async () => {
    const actorResource = await db.readResource(VISUAL_ACTORS_RESOURCE_ID);
    if (!actorResource?.value?.document
        || actorResource.version === undefined) {
      throw new Error("actor-visual 字段正文不可用");
    }
    const actorField = await db.getField(
      VISUAL_ACTORS_RESOURCE_ID,
      `${VISUAL_ACTORS_RESOURCE_ID}:party:${slot}`,
      "actor_type",
    );
    await actorField.set(actorType, {expectedVersion: actorField.version});
    const saved = await db.readResource(VISUAL_ACTORS_RESOURCE_ID);
    if (!stillCurrent()) return;
    const currentActorDocument = await db.getDocument(
      VISUAL_ACTORS_RESOURCE_ID,
      null,
    );
    if (!currentActorDocument
        || Number(currentActorDocument.party_alive_actor_types?.find(
          item => Number(item?.id) === slot,
        )?.actor_type) !== actorType) {
      throw new Error("保存后的 actor-visual 正文没有返回所选角色类型");
    }
    if (!stillCurrent()) return;
    storyVmCompilationCache.clear();
    storyVmSequenceCompilationCache.clear();
    context.entry.compiled = buildStoryVmSequence(
      context.entry.sequence,
      context.entry.variant,
      storyPartyRuntimeOverrides(context.entry.sequence.id),
    );
    rebuildOpeningModel(
      root,
      context.originalDocument || currentOriginalDocument() || context.currentDocument,
    );
    refreshOpeningSelection(root);
    context.refreshPlayback?.();
    context.refreshTimeline?.(root, context.entry);
    sayOpeningPartyAppearanceState(
      root,
      slot,
      saved.dirty ? "已保存；当前项目含角色形象覆盖。" : "已保存为 ROM 原值。",
    );
  })();
  void outcome.catch(error => {
    if (!stillCurrent()) return;
    control.disabled = false;
    control.setAttribute("aria-invalid", "true");
    picker?.removeAttribute("aria-busy");
    sayOpeningPartyAppearanceState(
      root, slot, `保存失败：${error?.message || error}`, true,
    );
  });
}

function hydrateOpeningInspectorContent(inspector) {
  openingTextEditorController?.refreshBindings();
  bindResourceQueries(inspector);
  void paintOpeningTextComponentCanvases(inspector);
  void hydrateModuleComponents(inspector);
  void hydrateStoryActorVisuals(inspector);
  hydrateStorySceneOperands(inspector);
  hydrateStoryObjectPosition(inspector);
  void hydrateOpeningActorResets(inspector).catch(error => showEditorError(inspector, "角色重置", error));
  void bindOpeningEncounterFormationEditor(inspector);
  void bindFieldObjectProjections(inspector, db).catch(error => {
    inspector.dataset.fieldObjectError = String(error?.message || error);
  });
}

async function hydrateOpeningActorResets(root) {
  for (const host of root.querySelectorAll("[data-story-actor-reset], [data-story-actor-motion], [data-story-reference-reset]")) {
    if (host.dataset.bound) continue;
    host.dataset.bound = "true";
    if (host.hasAttribute('data-story-reference-reset')) {
      const {handle, name} = JSON.parse(host.dataset.storyReferenceReset);
      const field = await db.getField(SCENE_ACTORS_RESOURCE_ID, handle, name);
      const object = await db.getFieldObject(SCENE_ACTORS_RESOURCE_ID, 'scene.actor.record-region');
      if (host.isConnected) mountFieldObjectReset(host, {...object, fields: [field]});
      continue;
    }
    const fields = await getSceneActorFields(host.dataset.storyActorReset || host.dataset.storyActorMotion);
    const object = await db.getFieldObject(SCENE_ACTORS_RESOURCE_ID, "scene.actor.record-region");
    if (!host.isConnected) continue;
    if (host.hasAttribute("data-story-actor-motion"))
      await mountFieldObjectBitmask(host, {...object, fields}, "direction_attributes");
    else mountFieldObjectReset(host, {...object, fields});
  }
}

function bindOpeningObjectSources(root) {
  const context = openingWorkbenchContext;
  hydrateStoryObjectSources(root, context,
    node => openingInspectorInner(context, node), hydrateOpeningInspectorContent);
}

function refreshOpeningSelection(root, {preserveEditor = false} = {}) {
  const context = openingWorkbenchContext;
  if (!context) return;
  context.currentDocument = state.project?.story_cutscene_edits || context.currentDocument;
  context.originalDocument = currentOriginalDocument();
  context.sceneActorCurrentDocument = state.project?.story_scene_actor_edits
    || context.sceneActorCurrentDocument;
  context.sceneActorOriginalDocument = currentSceneActorOriginalDocument();
  const pageRootSelected = selectedOpeningElementId === STORY_ROOT_SELECTION;
  const rootButton = root.querySelector('[data-story-workbench-root]');
  rootButton?.setAttribute('aria-pressed', String(pageRootSelected));
  rootButton?.closest('.element-tree-node')?.classList.toggle('is-selected', pageRootSelected);
  root.querySelector('[data-story-root-details]').hidden = !pageRootSelected;
  root.querySelector('[data-story-object-inspector]').hidden = pageRootSelected;
  root.querySelector('[data-story-object-sources]').hidden = pageRootSelected;
  if (pageRootSelected) root.querySelector('[data-story-timeline-details]').hidden = true;
  root.querySelectorAll("[data-story-workbench-node]").forEach(button => {
    const selected = button.dataset.storyWorkbenchNode === selectedOpeningElementId;
    button.setAttribute("aria-pressed", String(selected));
    button.closest(".element-tree-node")?.classList.toggle(
      "is-selected",
      selected,
    );
  });
  const inspector = root.querySelector("[data-story-workbench-inspector]");
  if (inspector) {
    if (preserveEditor && inspector.contains(document.activeElement)
        && document.activeElement?.matches("input, textarea, [contenteditable]")) return;
    const scrollTop = pageRootSelected ? null : inspector.scrollTop;
    const openSources = new Set([...inspector.querySelectorAll("[data-story-object-source][open]")]
      .map(details => details.dataset.storyObjectSource));
    inspector.querySelector("[data-story-object-inspector]").innerHTML =
      openingInspectorInner(context);
    const object = storyInspectorObject(context, selectedOpeningElementId);
    inspector.querySelector("[data-story-object-extra]").innerHTML = storyObjectInspectorSources(context, object);
    bindOpeningObjectSources(inspector);
    inspector.querySelectorAll("[data-story-object-source]").forEach(details => {
      details.open = openSources.has(details.dataset.storyObjectSource);
    });
    context.inspectorKey = object ? storyObjectInspectorKey(context, object) : null;
    if (scrollTop !== null) inspector.scrollTop = scrollTop;
    hydrateOpeningInspectorContent(inspector);
  }
  const physical = openingPlaybackScope(root)?.querySelector("[data-story-workbench-physical]");
  if (physical) physical.innerHTML = openingSelectedPhysicalMarkup(context);
}

export function syncStoryWorkbenchFrame(compiled, frame, preferredId = null, detailId = null) {
  const context = openingWorkbenchContext;
  const root = openingWorkbenchRoot();
  if (!context || !root) return null;
  if (context.entry.compiled !== compiled) {
    context.entry.compiled = compiled;
    context.entry.shotCount = storyExecutionTrace(compiled).shots.length;
    context.entry.storyShots = storyExecutionTrace(compiled).shots.map(shot => ({variant_id: shot.variantId,
      scene_id: shot.sceneId, phase_label: shot.label}));
    context.entry.chainLabel = storyExecutionTrace(compiled).shots.map(shot => recordUid("scene-actor-list", shot.variantId)).join(" → ");
    context.entry.shotLabel = storyExecutionTrace(compiled).shots.map(shot => storyShotLabel(shot.label)
      || `${recordUid("scene-actor-list", shot.variantId)} / ${recordUid("scene", shot.sceneId)}`).join(" → ");
    rebuildOpeningModel(root, context.originalDocument || context.currentDocument);
    context.refreshTimeline?.(root, context.entry);
  }
  const previousId = selectedOpeningElementId;
  const event = context.nodes.find(node => node.id === (detailId || preferredId));
  if (preferredId) {
    context.authoringSelected = false;
    context.detailEventId = event?.id;
    selectedOpeningElementId = storyInspectorObject(context, preferredId)
      ? preferredId : storyObjectForEvent(context, event) || selectedOpeningElementId;
  }
  context.frame = frame;
  const treeControls = openingObjectTreeControls(root);
  syncOpeningShotGroups(root, context, treeControls);
  const rows = storyObjectRows(context);
  const target = selectedOpeningElementId === STORY_ROOT_SELECTION || context.authoringSelected
    ? null : storyInspectorObject(context, selectedOpeningElementId, rows) || rows[0];
  if (target) selectedOpeningElementId = target.id;
  for (const object of rows) {
    const controls = treeControls.nodes.get(object.id);
    const label = controls?.label;
    if (label && label.textContent !== object.label) label.innerHTML = object.labelMarkup ?? storyHandleTextMarkup(object.label);
    const detail = controls?.detail;
    if (detail && detail.textContent !== object.detail) {
      const markup = object.detailMarkup ?? storyHandleTextMarkup(object.detail);
      if (markup.includes("<")) detail.innerHTML = markup;
      else if (detail.childNodes.length === 1 && detail.firstChild.nodeType === globalThis.Node.TEXT_NODE) detail.firstChild.nodeValue = object.detail;
      else detail.textContent = object.detail;
    }
    const thumbnail = controls?.thumbnail;
    const appearanceKey = `${object.variant?.id}:${object.actor?.renderMode}:${object.appearance.actor_type}`;
    if (thumbnail && thumbnail.dataset.appearanceKey !== appearanceKey) {
      thumbnail.dataset.appearanceKey = appearanceKey;
      thumbnail.innerHTML = object.thumbnail;
      void hydrateModuleComponents(thumbnail);
      void hydrateStoryActorVisuals(thumbnail);
    }
  }
  if (!target) return null;
  if (context.inspectorKey !== storyObjectInspectorKey(context, target) || previousId !== target.id || preferredId) {
    refreshOpeningSelection(root, {preserveEditor: previousId === target.id && !preferredId});
  }
  syncStoryObjectInspector(root, context, target);
  highlightStoryObjectTracks(root, context, target);
  return target;
}

export function storyTimelineObjectLabels() {
  return new Map((openingWorkbenchContext ? storyObjectRows(openingWorkbenchContext) : [])
    .map(object => [object.id, object.label]));
}

async function bindOpeningEncounterFormationEditor(root) {
  if (root?.querySelector?.("[data-story-formation-editor-unavailable]")) {
    await loadOpeningEncounterFormationSource(openingWorkbenchRoot());
  }
  const editor = root?.querySelector?.("[data-scene-battle-formation-editor]");
  if (!editor) return;
  const context = openingWorkbenchContext;
  const {bindSceneBattleTestFormationEditor} = await import("../battle-bind.js");
  if (context !== openingWorkbenchContext || !editor.isConnected) return;
  await bindSceneBattleTestFormationEditor(root, () => {
    if (context === openingWorkbenchContext && editor.isConnected) {
      refreshOpeningSelection(openingWorkbenchRoot());
    }
  });
}

export function bindStoryWorkbench({refreshPlayback, refreshTimeline, seekPlayback} = {}) {
  document.querySelectorAll('[data-story-sequence-users]').forEach(host =>
    bindOwnerReferenceList(host, () => {
      const sequence = storyBrowserVm().sequences.find(row => row.id === host.dataset.storySequenceUsers);
      const users = withCurrentOwnerRecord({kind: 'story-sequence', sequence}, state.project.story,
        () => currentOwnerReferenceImpact());
      return users.map(row => `<a class="editor-inline-link" href="?view=${esc(storyViewForSequenceId(row.id))}&amp;storySequence=${esc(row.id)}&amp;storyPaused=1">${esc(row.label)} ↗</a>`).join(' · ');
    }));
  if (!storyEditableWorkbenchView()) return;
  const root = document.querySelector("[data-story-workbench-editable]");
  if (!root || !openingWorkbenchContext) return;
  const playback = openingPlaybackScope(root)?.querySelector(
    "[data-story-editable-playback]",
  );
  openingWorkbenchContext.refreshPlayback = refreshPlayback;
  openingWorkbenchContext.refreshTimeline = refreshTimeline;
  const setPreview = async (conditions, cursor = null) => {
    const entry = openingWorkbenchContext.entry;
    state.storyBranchPreviewConditions.set(String(entry.sequence.id), conditions);
    state.storyCardFrame.set(Number(entry.variant.id), 0);
    state.storyCardPaused.add(Number(entry.variant.id));
    storyVmCompilationCache.clear();
    storyVmSequenceCompilationCache.clear();
    await render();
    const nextEntry = openingWorkbenchContext.entry;
    document.querySelector('[data-story-editable-playback] [data-tl-fit]')?.click();
    const branchFrame = cursor === null ? 0 : nextEntry.compiled.frames.findIndex(snapshot => snapshot.actors?.some(actor => actor.currentCommand?.cursor === cursor));
    const firstDialogue = nextEntry.compiled.frames.findIndex((snapshot, frame) => frame >= branchFrame && snapshot.dialogue);
    seekPlayback?.(nextEntry.variant.id, Math.max(0, firstDialogue));
  };
  root.addEventListener("change", event => {
    const control = event.target.closest("[data-story-preview-condition], [data-story-preview-number]");
    if (!control) return;
    const entry = openingWorkbenchContext.entry;
    let conditions;
    if (control.dataset.storyPreviewNumber) {
      const current = structuredClone(state.storyBranchPreviewConditions.get(String(entry.sequence.id)) || {});
      const value = Math.max(0, Math.min(Number(control.max), Math.trunc(Number(control.value) || 0)));
      if (control.dataset.storyPreviewNumber === "money") current.money = value;
      else if (control.dataset.storyPreviewNumber.startsWith("service:")) {
        current.serviceResults ||= [];
        current.serviceResults[Number(control.dataset.storyPreviewNumber.split(":")[1])] = value;
      } else if (control.dataset.storyPreviewNumber === "result") current.runtimeResultD5 = value;
      else {
        const slot = Number(control.dataset.storyPreviewSlot);
        current.party ||= [];
        let member = current.party.find(member => member.slot === slot);
        if (!member) {member = {slot}; current.party.push(member);}
        member[control.dataset.storyPreviewNumber === "level" ? "level" : "currentHp"] = value;
      }
      conditions = current;
    } else conditions = storyPreviewConditionChange(entry, control.dataset.storyPreviewCondition,
      control.dataset.storyPreviewCondition.startsWith("party:") ? control.value : control.value === "true");
    void setPreview(conditions).catch(error => showEditorError(root, "预览条件", error));
  });
  const previewHost = root.closest("#content");
  const choosePath = event => {
    const control = event.target.closest("[data-story-preview-path]");
    if (!control || !root.isConnected) return;
    event.preventDefault();
    event.stopPropagation();
    const conditions = storyPreviewPath(openingWorkbenchContext.entry, Number(control.dataset.storyPreviewPath));
    if (conditions) void setPreview(conditions, control.hasAttribute("data-story-preview-cursor")
      ? Number(control.dataset.storyPreviewCursor) : null).catch(error => showEditorError(root, "分支路径", error));
  };
  previewHost.onclick = choosePath;
  previewHost.onkeydown = event => {
    if (["Enter", " "].includes(event.key) && event.target.matches(".story-branch-alternate")) choosePath(event);
  };
  root.addEventListener("field-object-saved", async event => {
    const fields = Array.isArray(event.detail.fields) ? event.detail.fields : [event.detail.fields];
    if (!fields.some(field => field.resourceId === SCENE_ACTORS_RESOURCE_ID)) return;
    const context = openingWorkbenchContext;
    try {
      const draft = await db.getResourceDraft(SCENE_ACTORS_RESOURCE_ID);
      if (context !== openingWorkbenchContext || !root.isConnected) return;
      context.project.story_scene_actor_edits = draft;
      storyVmCompilationCache.clear();
      storyVmSequenceCompilationCache.clear();
      context.refreshPlayback?.();
      rebuildOpeningModel(root, context.originalDocument || context.currentDocument);
      refreshOpeningSelection(root);
      context.refreshTimeline?.(root, context.entry);
      await refreshOpeningResetState(root);
    } catch (error) {showEditorError(root, "角色记录", error);}
  });
  bindOpeningObjectSources(root);
  root.addEventListener("change", async event => {
    const control = event.target.closest("[data-story-player-input]");
    if (!control) return;
    const sequenceId = openingWorkbenchContext.entry.sequence.id;
    const inputs = openingWorkbenchContext.entry.compiled.frames[0]?.previewFieldInputs || [];
    const next = inputs.map(input => ({...input}));
    if (control.dataset.storyPlayerInput === "reset") state.storyPlayerPreviewInputs.delete(sequenceId);
    else {
      if (control.dataset.storyPlayerInput === "add") next.push({direction: "right", steps: 1, wait_for_release: true});
      else {
        const index = Number(control.dataset.storyPlayerInputIndex);
        if (!next[index]) next[index] = {direction: "right", steps: 0, wait_for_release: true};
        const value = control.dataset.storyPlayerInput === "direction" ? control.value
          : Math.max(0, Math.min(255, Math.trunc(Number(control.value) || 0)));
        next[index][control.dataset.storyPlayerInput] = value;
      }
      state.storyPlayerPreviewInputs.set(sequenceId, next);
    }
    storyVmCompilationCache.clear();
    storyVmSequenceCompilationCache.clear();
    await render();
  });
  root.addEventListener("click", event => {
    const button = event.target.closest('button[data-story-player-input]');
    if (button) button.dispatchEvent(new Event("change", {bubbles: true}));
  });
  root.addEventListener("click", async event => {
    const button = event.target.closest("[data-story-assume-wait], [data-story-clear-waits]");
    if (!button) return;
    const waitPanel = button.closest("[data-story-wait-preview]");
    if (!waitPanel) return;
    const sequenceId = waitPanel.dataset.storyWaitPreview;
    const assumptions = new Set(state.storyWaitPreviewAssumptions.get(sequenceId) || []);
    if (button.hasAttribute("data-story-clear-waits")) assumptions.clear();
    else assumptions.add(button.dataset.storyAssumeWait);
    state.storyWaitPreviewAssumptions.set(sequenceId, assumptions);
    storyVmCompilationCache.clear();
    storyVmSequenceCompilationCache.clear();
    state.storyCardFrame.set(Number(openingWorkbenchContext.entry.variant.id), 0);
    await render();
  });
  const textEditorContext = openingWorkbenchContext;
  openingTextEditorController = bindFixedTextEditors(root, {
    getDocument: () => openingResetting
      ? null : textEditorContext.project?.text_record_edits || null,
    getEncoding: () => openingResetting
      ? null : textEditorContext.project?.text_record_encoding || null,
    getRepository: () => textEditorContext.repository
      || requireBrowserProjectRepository(state),
    onDraft: ({document: document_, result}) => {
      if (textEditorContext !== openingWorkbenchContext
          || state.project !== textEditorContext.project) return;
      textEditorContext.project.text_record_edits = document_;
      textEditorContext.project.text_record_dirty = true;
      updateOpeningTextCopies(root, result.pages, result.node_id);
      applyOpeningTextResult(result, textEditorContext);
      textEditorContext.refreshPlayback?.();
      void paintOpeningTextDraft(root, result);
    },
    onSaved: async ({saved}) => {
      await installSavedOpeningTextDocument(
        root,
        saved.value.document,
        saved.dirty,
        textEditorContext,
      );
    },
    onReset: async () => {
      if (textEditorContext === openingWorkbenchContext) {
        refreshOpeningSelection(root);
      }
    },
  });
  void paintOpeningTextComponentCanvases(root);
  void hydrateModuleComponents(root);
  void hydrateStoryActorVisuals(root);
  hydrateStorySceneOperands(root);
  hydrateStoryObjectPosition(root);
  void hydrateOpeningActorResets(root).catch(error => showEditorError(root, "角色重置", error));
  void bindOpeningEncounterFormationEditor(root);
  root.querySelector('[data-story-workbench-root]')?.addEventListener('click', () => {
    if (openingResetting) return;
    selectedOpeningElementId = STORY_ROOT_SELECTION;
    openingWorkbenchContext.authoringSelected = false;
    openingWorkbenchContext.detailEventId = null;
    state.storyTimelineRowId = null;
    refreshOpeningSelection(root);
    root.dispatchEvent(new CustomEvent('story-page-root-select', {bubbles: true}));
    const inspector = root.querySelector('[data-story-workbench-inspector]');
    if (inspector) inspector.scrollTop = 0;
  });
  root.addEventListener('story-page-authoring-select', () => {
    selectedOpeningElementId = null;
    openingWorkbenchContext.authoringSelected = true;
    const button = root.querySelector('[data-story-workbench-root]');
    button?.setAttribute('aria-pressed', 'false');
    button?.closest('.element-tree-node')?.classList.remove('is-selected');
    root.querySelector('[data-story-root-details]').hidden = true;
    root.querySelectorAll('[data-story-workbench-node]').forEach(button => {
      button.setAttribute('aria-pressed', 'false');
      button.closest('.element-tree-node')?.classList.remove('is-selected');
    });
  });
  root.querySelector(".story-workbench-tree")?.addEventListener("click", event => {
    const summary = event.target.closest?.("[data-story-object-shot].is-current > summary");
    if (summary) event.preventDefault();
    const button = event.target.closest?.("[data-story-workbench-node]");
    if (openingResetting || !button) return;
    selectedOpeningElementId = button.dataset.storyWorkbenchNode;
    openingWorkbenchContext.authoringSelected = false;
    openingWorkbenchContext.detailEventId = null;
    refreshOpeningSelection(root);
    const selected = storyObjectRows(openingWorkbenchContext).find(node => node.id === selectedOpeningElementId);
    if (selected?.dialoguePageNode) {
      seekPlayback?.(openingWorkbenchContext.entry.variant.id,
        selected.dialoguePageNode.start, selected.dialoguePageNode.id);
    }
    if (selected) highlightStoryObjectTracks(root, openingWorkbenchContext, selected);
    if (selected) root.dispatchEvent(new CustomEvent("story-object-select", {
      bubbles: true, detail: {objectId: selected.id},
    }));
    const inspector = root.querySelector("[data-story-workbench-inspector]");
    if (inspector) inspector.scrollTop = 0;
  });
  root.addEventListener("click", event => {
    const button = event.target.closest?.("[data-story-object-event]");
    if (openingResetting || !button) return;
    const node = openingWorkbenchContext.nodes.find(node => node.id === button.dataset.storyObjectEvent);
    if (Number.isInteger(node?.start)) {
      seekPlayback?.(openingWorkbenchContext.entry.variant.id, node.start, node.id);
    }
  });
  root.addEventListener(
    "change",
    event => {
      const toggle = event.target.closest?.("[data-story-party-render-slot]");
      if (openingResetting || !toggle) return;
      const sequenceId = toggle.dataset.storyPartyRenderSequence;
      const slot = Number(toggle.dataset.storyPartyRenderSlot);
      setStoryPartySlotForSequence(sequenceId, slot, toggle.checked);
      const context = openingWorkbenchContext;
      if (!context || String(context.entry.sequence.id) !== String(sequenceId)) {
        return;
      }
      context.entry.compiled = buildStoryVmSequence(
        context.entry.sequence,
        context.entry.variant,
        storyPartyRuntimeOverrides(sequenceId),
      );
      rebuildOpeningModel(
        root,
        context.originalDocument
          || currentOriginalDocument()
          || context.currentDocument,
      );
      refreshOpeningSelection(root);
      refreshPlayback?.();
      refreshTimeline?.(root, context.entry);
    },
  );
  [root, playback].filter(Boolean).forEach(controlHost => {
    controlHost.addEventListener("input", event => {
      const control = event.target.closest?.("[data-story-workbench-control]");
      if (!openingResetting && control) handleOpeningControlInput(root, control);
    });
    controlHost.addEventListener("change", event => {
      const vehicle = event.target.closest?.("[data-story-party-vehicle-slot]");
      if (!openingResetting && vehicle) {
        setStoryPartyVehicleForSequence(vehicle.dataset.storyPartyVehicleSequence,
          Number(vehicle.dataset.storyPartyVehicleSlot), vehicle.value === "" ? null : Number(vehicle.value));
        const context = openingWorkbenchContext;
        context.entry.compiled = buildStoryVmSequence(context.entry.sequence,
          context.entry.variant, storyPartyRuntimeOverrides(context.entry.sequence.id));
        rebuildOpeningModel(root, context.originalDocument || context.currentDocument);
        refreshOpeningSelection(root);
        refreshPlayback?.();
        refreshTimeline?.(root, context.entry);
        return;
      }
      const partyAppearance = event.target.closest?.(
        "[data-story-party-appearance-control]",
      );
      if (!openingResetting && partyAppearance) {
        saveOpeningPartyAppearance(root, partyAppearance);
        return;
      }
      const control = event.target.closest?.("[data-story-workbench-control]");
      if (!openingResetting && control) finishOpeningControlChange(root, control);
    });
  });
  // 检视器可含共用编队编辑器；只接管剧情工具栏的按钮。
  root.querySelectorAll(".story-stage-toolbar [data-reset-to-original]").forEach(button => {
    button.addEventListener("click", () => {
      if (button.disabled || button.dataset.resetPending === "true") return;
      button.resetCompletion = (async () => {
        button.dataset.resetPending = "true";
        button.setAttribute("aria-busy", "true");
        button.disabled = true;
        try {
          await resetOpeningChanges(root, refreshPlayback);
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
  refreshOpeningResetState(root);
  void bindFieldObjectProjections(root, db).catch(error => {
    root.dataset.fieldObjectError = String(error?.message || error);
  });
  Promise.all([
    loadOpeningOriginalDocument(),
    loadOpeningSceneActorOriginalDocument(),
  ]).then(([document_]) => {
    if (!storyEditableWorkbenchView()
        || document.querySelector("[data-story-workbench-editable]") !== root) return;
    if (document_ && (openingWorkbenchContext.originalDocument !== document_
        || openingWorkbenchContext.sceneActorOriginalDocument !== currentSceneActorOriginalDocument())) {
      rebuildOpeningModel(root, document_);
      refreshOpeningSelection(root);
      const addresses = new Set([...openingPlaybackScope(root).querySelectorAll(
        "[data-story-workbench-address]",
      )].map(article => Number(article.dataset.storyWorkbenchAddress)).filter(
        Number.isInteger,
      ));
      addresses.forEach(address => syncOpeningAddress(root, address));
      root.querySelector("[data-story-workbench-original-note]")?.remove();
    } else {
      const note = root.querySelector("[data-story-workbench-original-note]");
      const error = openingOriginalError || openingSceneActorOriginalError;
      if (note && error) {
        note.textContent = `ROM 原值读取失败：${error.message || error}`;
      }
    }
  });
}

export function storyVmSequencesForView(view = state.view) {
  return storySequencesForDefinition(storyVmSequences(), storyPageDefinitionForView(view) || {},
    state.storySequenceId);
}

export function storyVmSelectedSequenceForView(view = state.view) {
  const sequences = storyVmSequencesForView(view);
  return sequences.find(sequence => sequence.id === state.storySequenceId)
    || sequences.find(sequence => sequence.id === storyPageDefinitionForView(view)?.sequenceId)
    || sequences[0] || null;
}

export function renderStoryWorkbench(
  view = state.view,
  renderStage,
  renderPlaybackPanel,
  renderInspectorExtra,
) {
  const vm = storyBrowserVm();
  const inventory = state.project.story?.cutscene_inventory || {};
  const inventorySummary = inventory.summary || {};
  const inventoryById = new Map(
    (inventory.entries || []).map(item => [String(item.id), item]),
  );
  const allActorLists = storyVmAllActorLists();
  const variantsById = new Map(
    allActorLists.map(variant => [Number(variant.id), variant]),
  );
  const sequences = storyVmSequencesForView(view);
  const coverage = vm.coverage || {};
  const semantics = storyVmSemanticsMap();
  // 每条执行链先算成一个模型对象，左栏列表、舞台、检查器和下方表格都从它取值——
  // 以前这些字段是在拼 <tr> 的过程中顺手算出来的，四个消费方就没法共用。
  const entries = sequences.map((sequence, sequenceIndex) => {
    const variant = storyVmEntryVariant(sequence, variantsById.get(Number(sequence.entry_variant_id)));
    if (!variant) return null;
    const prepare = () => {
    const inventoryEntry = inventoryById.get(String(sequence.id));
    const sequenceVariants = (sequence.variant_ids || [])
      .map(id => variantsById.get(Number(id)))
      .filter(Boolean);
    const compiled = buildStoryVmSequence(
      sequence,
      variant,
      storyPartyRuntimeOverrides(sequence.id),
    );
    const context = compiled.frames[0]?.context || variant.scene_contexts?.[0] || null;
    const missingOpcodes = [...new Set([
      ...sequenceVariants.flatMap(
        item => (item.unimplemented_handler_opcodes || []).map(Number),
      ),
      ...compiled.unsupported.map(Number),
    ])].sort((a, b) => a - b);
    const missing = missingOpcodes.map(opcode => hex(opcode, 2));
    const partial = [...new Set(sequenceVariants.flatMap(
      item => (item.opcodes || []).map(Number),
    ))]
      .map(opcode => semantics.get(Number(opcode)))
      .filter(item => item?.fidelity === "partial");
    const entryContextStatus = variant.entry_context?.status || null;
    const cameraLocated = Boolean(sequence.ending_animation)
      || Boolean(compiled.frames[0]?.cameraKnown);
    const sourceStatus = variant.blocking_caller_entry
      ? "ROM 调用者入口已定位"
      : entryContextStatus || variant.entry_sources?.status || (
        variant.selection?.kind === "scene-event-flag-variant"
          ? "ROM 场景/事件标志入口"
          : "入口尚未定位"
      );
    const controlLabel = {
      locked: "剧情锁定操控",
      retained: "玩家可操控",
      "scripted-lock": "条件触发后锁定",
    }[sequence.player_control] || "操控状态未分类";
    const completionLabel = storyCompletionLabel(compiled, state.project.story);
    let note = "本角色表使用的 opcode 已全部按已确认语义执行。";
    if (!cameraLocated) {
      note = "已定位控制锁脚本，但尚未从 ROM 调用者恢复进入该场景时的玩家/相机状态；此条目保留在审计清单中，不用地图原点伪装成可执行剧情。";
    } else if (missing.length) {
      note = `阻塞项：${missing.join(" · ")}；未知处理器或缺少运行时依赖的角色会停在该指令处，不把未知副作用当成空操作跳过。`;
    } else if (compiled.executionStop) {
      note = `${compiled.executionStop.kind === "loop" ? "循环" : "超限"}，于 cursor ${
        compiled.executionStop.cursorHex || "未知"
      }；已执行 ${Number(compiled.executionSteps || 0)} 步，用时 ${Number(
        compiled.executionElapsedMs || 0,
      ).toFixed(1)} ms。`;
    } else if (compiled.completion === "terminal-ending-loop") {
      note = `${recordUid("scene-actor-list", 0x02)} → MODE $0D 的世界镜头、赏金首与战车回顾、15 组职员表，再接 ${recordUid("scene-actor-list", 0x03)} → MODE $0E；终页按 ROM 行为循环等待 RESET。条件内容采用全部镜头、全部赏金首已歼和 8 辆战车已取得的最大内容有效存档路径。`;
    } else if (compiled.completion === "field-service-entry") {
      note = "已交出 MODE $05、结果 $26 的旅行服务入口；后续由场景服务继续执行。";
    } else if (compiled.completion === "waiting-for-external-state") {
      note = "VM 检测到状态循环，正在等待外部事件；循环点来自完整状态重复，不是人为帧数截断。";
    } else if (compiled.completion === "state-routed-story-preview") {
      note = "三段演出按 ROM 脚本的持久事件分支、普通场景续段、交互入口和战斗完成旗标串联；场景事件表只作为后续世界状态，不再被误拼成剧情镜头。";
    } else if (compiled.completion === "ambient-loop") {
      note = "该条目是可操控场景的常驻角色循环，不是独立剧情；播放器按 ROM 状态循环点回放。";
    } else if (compiled.uiAutoInputs.length) {
      note = `已到达真实控制权终点；${compiled.uiAutoInputs.length} 个文本与界面记录按统一自动按键策略推进，剧情结束仍只由控制状态判定。`;
    } else if (partial.length) {
      note = `已接入但仍非等价的处理器：${partial.map(item => item.opcode_hex).join(" · ")}；缺少碰撞、文本与界面、摄像机或转场依赖。`;
    }
    const storyShots = storyExecutionTrace(compiled).shots.map(shot => ({
      variant_id: shot.variantId, scene_id: shot.sceneId, phase_label: shot.label,
    }));
    const chainLabel = (storyShots.length ? storyShots.map(shot => shot.variant_id)
      : sequence.actor_list_ids || [variant.id])
      .map(id => recordUid("scene-actor-list", id)).join(" → ");
    const logicalIndex = sequence.logical_index_hex
      || sequence.entry_variant_id_hex
      || variant.id_hex;
    return {
      sequence,
      variant,
      compiled,
      context,
      inventoryEntry,
      missing,
      partial,
      cameraLocated,
      sourceStatus,
      controlLabel,
      completionLabel,
      note,
      chainLabel,
      storyShots,
      logicalIndex,
      label: String(sequence.label || '').trim() || (view === 'story-page' ? `执行链 ${sequenceIndex + 1}`
        : context?.name || "场景上下文未定位"),
      shotCount: storyExecutionTrace(compiled).shots.length,
      shotLabel: storyExecutionTrace(compiled).shots.map(shot => storyShotLabel(shot.label)
        || `${recordUid("scene-actor-list", shot.variantId)} / ${recordUid("scene", shot.sceneId)}`).join(" → "),
      resourceUid: `story-sequence:${sequence.id}`,
      blocked: Boolean(missing.length || partial.length) || !cameraLocated,
    };
    };
    let prepared;
    const entry = {sequence, variant};
    for (const key of ['compiled', 'context', 'inventoryEntry', 'missing', 'partial', 'cameraLocated',
      'sourceStatus', 'controlLabel', 'completionLabel', 'note', 'chainLabel', 'storyShots', 'logicalIndex',
      'label', 'shotCount', 'shotLabel', 'resourceUid', 'blocked']) {
      Object.defineProperty(entry, key, {enumerable: true, get: () => (prepared ||= prepare())[key]});
    }
    return entry;
  }).filter(Boolean);
  const locatedSequenceCount = storyEditableWorkbenchView(view) ? 0
    : entries.filter(item => item.cameraLocated).length;
  const selected = entries.find(item => item.sequence.id === state.storySequenceId)
    || entries.find(item => !item.blocked)
    || entries[0]
    || null;
  if (selected) state.storySequenceId = selected.sequence.id;
  const toolbarCopy = {
    eyebrow: "ROM SCRIPT PLAYER",
    title: `${locatedSequenceCount} 条入口可执行 · ${entries.length - locatedSequenceCount} 条待定位`,
    description: `当前剧情目录共 ${entries.length} 条执行链；开场、死亡复活、洞窟狼孩与结局已拆到左侧独立页面。完整场景审计共 ${Number(inventorySummary.execution_chains || entries.length)} 条：${Number(inventorySummary.confirmed_narrative_cutscenes || 0)} 条剧情已确认，${Number(inventorySummary.control_lock_cutscene_candidates || 0)} 条剧情含义未定但确认会禁用操控，${Number(inventorySummary.listed_non_cutscene_scene_actions || 0)} 条相关常驻动作明确不锁操控。`,
  };
  const toolbar = storyEditableWorkbenchView(view) ? "" : `<div class="story-gallery-toolbar">
      <div><p class="eyebrow">${esc(toolbarCopy.eyebrow)}</p>
        <h2>${esc(toolbarCopy.title)}</h2>
        </div>
      <div class="story-gallery-controls">
        <button class="button primary" id="story-play-toggle">${state.storyPlaying ? "暂停" : "播放"}</button>
        <button class="button ghost" id="story-restart">从头播放</button>
        <select id="story-speed" aria-label="播放速度">
          ${[0.5, 1, 2, 4].map(value => `<option value="${value}" ${state.storySpeed === value ? "selected" : ""}>${value}×</option>`).join("")}
        </select>
      </div>
    </div>`;
  if (!selected) {
    openingWorkbenchContext = null;
    if (view === 'story-page') return storyPageEmptyWorkbenchMarkup();
    return `${toolbar}`;
  }
  if (storyEditableWorkbenchView(view)) {
    const triggerLabel = item => item.sequence.trigger_label || (item.sequence.interaction_trigger
      ? `交互 · 角色 ${hex(item.sequence.entry_variant_id, 2).slice(2)}·${
        hex(item.sequence.interaction_trigger.actor_record_id, 2).slice(2)}`
      : `进场 ${hex(item.sequence.entry_variant_id, 2).slice(2)}`);
    const sequenceSwitcher = entries.length > 1 ? `<nav class="story-sequence-switcher"
      data-story-sequence-switcher aria-label="本页触发点">
      ${entries.map(item => `<a class="button ${
        item === selected ? "primary" : "ghost"
      }" href="?view=${encodeURIComponent(view)}${state.storyPageId ? `&storyPage=${encodeURIComponent(state.storyPageId)}` : ''}&storySequence=${encodeURIComponent(
        item.sequence.id,
      )}&storyPaused=1" data-story-sequence-option="${esc(item.sequence.id)}">${esc(triggerLabel(item))}</a>`).join("")}
    </nav>` : "";
    const toolbarMarkup = `<div class="record-head story-sequence-handle">
      <span class="record-title" title="${esc(selected.resourceUid)}">${esc(selected.label)}${entries.length > 1 ? ` · ${esc(triggerLabel(selected))}` : ""}</span>
      </div>${sequenceSwitcher}`;
    return createEditableStoryWorkbench(selected, variantsById, renderStage, renderPlaybackPanel, toolbarMarkup);
  }
  return `${screenWorkbench({namespace: 'story', className: 'story-workbench', toolbarMarkup: toolbar,
    treeTitle: null, treeClassName: 'story-browser', treeScroll: 'body', treeMarkup: storyBrowserMarkup(entries, selected),
    stageMarkup: renderStage(selected), inspectorTitle: null, inspectorClassName: 'story-inspector',
    inspectorMarkup: storyInspectorMarkup(selected, renderInspectorExtra?.(selected) || ''),
  })}
    ${physicalLocationMarkup({uid: selected.resourceUid})}
    ${datasetFacts([
      ["ROM 角色程序", `<b>${coverage.programs || 0}</b>`],
      ["涉及处理器", `<b>${coverage.used_opcodes || 0}</b>`],
      ["已实现语义", `<b>${coverage.implemented_handler_opcodes || 0}</b>`],
      ["显式缺口", `<b>${coverage.unimplemented_handler_opcodes?.length || 0}</b>`],
    ])}
    <div class="section-line"><h2>执行链</h2><span>${entries.length} 条</span></div>
    <div class="table-wrap story-playback-table"><table>
      <thead><tr>
        <th>资源 ID</th><th>游戏索引 ID</th><th>类别</th><th>名称</th><th>场景</th>
        <th>操控</th><th>SHOT 数</th><th>帧数</th><th>完成方式</th><th>循环点</th>
        <th>阻塞项</th><th>非等价处理器</th><th>入口状态</th><th>场景证据</th><th>SHOT 链</th>
        <th>场景引用</th><th>角色资产引用</th><th>界面与文本引用</th><th>说明</th>
      </tr></thead>
      <tbody>${entries.map(item => storyTableRow(item, selected)).join("")}</tbody>
    </table></div>`;
}

function storyWaitPreviewMarkup(entry) {
  const waits = storyWaitingConditions(entry.compiled, state.project.story);
  const assumptions = state.storyWaitPreviewAssumptions.get(entry.sequence.id) || new Set();
  const continuation = storyBrowserVm().wait_state_model?.story_state_continuations?.find(row =>
    row.story_state === entry.compiled.finalControlState.storyState
      && row.actor_list_id === entry.compiled.finalControlState.actorListId);
  const conditionLabel = condition => condition.kind === "event-flag"
    ? `事件位 ${recordUid("global-event-flag", condition.flagId)} 已置位`
    : condition.kind === "player-position" ? `玩家坐标 (${condition.x}, ${condition.y})`
      : `玩家坐标 ${condition.left}≤X<${condition.right}、${condition.top}≤Y<${condition.bottom}`;
  const writerMarkup = writer => {
    const label = writer.label || `${writer.actorHandle} · ${storyScriptHandle(writer.kind, writer.scriptId)} @ ${hex(writer.cursor, 2)}${
      writer.operation === "start-scripted-encounter" ? " · 战斗胜利后" : ""}`;
    return writer.href ? `<a class="editor-inline-link" href="${esc(writer.href)}" title="${esc(writer.condition || "")}">${esc(label)}</a>` : esc(label);
  };
  return `<section class="story-wait-preview" data-story-wait-preview="${esc(entry.sequence.id)}">
    <h2>结束方式：<output data-story-completion>${esc(entry.completionLabel)}</output></h2>
    ${waits.map(wait => `<p data-story-wait-key="${esc(wait.key)}">等待 ${eventFlagTextMarkup(conditionLabel(wait.condition))} → ${
      wait.writers.length ? wait.writers.map(writerMarkup).join(" · ") : "同场景写入者未确认"} · <button type="button" class="button ghost"
      data-story-assume-wait="${esc(wait.key)}">假定已满足</button></p>`).join("")}
    ${assumptions.size ? `<p>预览假设 ${assumptions.size} 项 · <button type="button" class="button ghost" data-story-clear-waits>清除假设</button></p>` : ""}
    ${entry.compiled.completion === "waiting-for-story-continuation" ? `<p>剧情状态 ${hex(entry.compiled.finalControlState.storyState, 2)} 仍有效，等待后续场景动作或交互。</p>` : ""}
    ${continuation ? `<p>${eventFlagTextMarkup(continuation.label)}</p>` : ""}
  </section>`;
}

function storyEventLinksMarkup(sequence) {
  const references = storyEventReferences(sequence.id, state.project.story);
  const entries = (storyBrowserVm().entry_events || []).filter(row => row.sequence_id === sequence.id);
  const scenes = state.project.scenes?.editable_scenes || [];
  const triggers = entries.map(entry => {
    return `<p>${scenePositionPickerMarkup({entries: scenes, sceneId: entry.scene_id,
      x: null, y: null, disabled: true, label: "触发场景", sceneObject: `entry-story:${sequence.id}`})} · ${eventFlagTextMarkup(entry.trigger)}</p>`;
  }).join("");
  const related = (sequence.related_sequence_ids || []).map(id => {
    const target = storyBrowserVm().sequences.find(row => row.id === id);
    const view = storyViewForSequenceId(id);
    const label = target?.interaction_trigger
      ? `角色 ${hex(target.entry_variant_id, 2).slice(2)}·${hex(target.interaction_trigger.actor_record_id, 2).slice(2)} 交互`
      : target?.label;
    return target && view ? `<a class="editor-inline-link" href="?view=${esc(view)}&amp;storySequence=${esc(id)}&amp;storyPaused=1">${esc(label)} ↗</a>` : "";
  }).filter(Boolean).join(" · ");
  const actors = (sequence.trigger_actor_handles || []).map(handle => storyResourceMarkup(handle)).join(" · ");
  return `<section class="panel" data-story-event-links="${esc(sequence.id)}"><h2>存档事件位</h2>${related ? `<p>${related}</p>` : ""}${ownerReferenceListMarkup("引用剧情", `data-story-sequence-users="${esc(sequence.id)}"`)}${actors ? `<p>${actors}</p>` : ""}${triggers}${
    references.map(row => `<p data-story-event-flag="${row.flag_id}">${eventFlagReferenceMarkup(row.flag_id)} · ${esc(row.accesses.join("/"))}${
      row.transient ? " · 场景同步位" : row.completion ? " · 已触发" : ""} · ${[1, 2].map(slot =>
      `<a class="editor-inline-link" href="${esc(saveEventHref(slot, row.flag_id))}">槽 ${slot}</a>`
    ).join(" · ")}${row.sources.filter(source => source.href).map(source =>
      ` · <a class="editor-inline-link" href="${esc(source.href)}">${esc(source.label)}</a>`).join("")}</p>`).join("")}</section>`;
}

// 左栏：执行链列表。以前每一行表格里都嵌着一个 256×240 播放器，几十条同时跑；
// 现在这里只负责选，舞台上只播选中的那一条。
function storyBrowserMarkup(entries, selected) {
  return `<div class="story-browser-head">
      <input type="search" id="story-browser-filter" placeholder="按 ID／名称过滤" aria-label="过滤执行链">
    </div>
    <div class="story-browser-list" id="story-browser-list">${entries.map(item => `
      <button type="button" class="story-browser-item ${item.sequence.id === selected.sequence.id ? "active" : ""} ${item.blocked ? "blocked" : ""}"
        data-story-sequence="${esc(item.sequence.id)}"
        data-story-search="${esc(`${item.logicalIndex} ${item.label} ${item.sequence.kind}`.toLowerCase())}"
        title="${esc(item.label)}">
        ${handleMarkup(item.resourceUid, {inline: true})}<b>${esc(item.label)}</b><i>${item.compiled.duration}F</i>
      </button>`).join("")}</div>
  `;
}

// 序列详情的镜头与台词从当前执行轨迹取值。
function storyInspectorInnerMarkup(entry) {
  const {sequence, variant, compiled, context, resourceUid} = entry;
  const loopStart = compiled.loopStart === null || compiled.loopStart === undefined
    ? null : compiled.loopStart;
  const rows = [
    ["帧数", String(compiled.duration)],
    ["完成方式", esc(entry.completionLabel)],
    ["循环点", loopStart === null ? "无" : String(loopStart)],
    ["SHOT 数", String(entry.shotCount)],
    ["台词数", String(storyExecutionTrace(compiled).dialogues.length)],
    ["操控", esc(entry.controlLabel)],
    ["入口状态", esc(entry.sourceStatus)],
    ["场景证据", esc(context?.evidence || "未找到")],
    ["场景尺寸", context
      ? `${Number(context.width)}×${Number(context.height)} 格 · 视口 256×240`
      : "场景/相机上下文未定位"],
    ["物理角色表", storyHandleTextMarkup(entry.chainLabel)],
    ["SHOT 链", storyHandleTextMarkup(entry.shotLabel)],
    ["阻塞项", entry.missing.length ? esc(entry.missing.join(" · ")) : "无"],
    ["非等价处理器", entry.partial.length
      ? esc(entry.partial.map(item => item.opcode_hex).join(" · ")) : "无"],
    ["自动文本输入", String(compiled.uiAutoInputs.length)],
    ["清单分类", esc(sequence.inventory_classification || "—")],
    ["运行时状态", variant.blocking_caller_entry
      ? `CALLER 先装入 ${storySceneLink(variant.blocking_caller_entry.scene_id)} / $0481=${esc(variant.blocking_caller_entry.active_state_hex)} 等待 → $0481=$00,$2F=$01`
      : variant.selection?.story_state
        ? `$0481=${esc(variant.selection.story_state_hex)} / $0487 锁 → $0481=$00,$0487=$00,$2F=$01`
        : esc(entry.controlLabel)],
  ];
  const clues = storyExecutionTrace(compiled).dialogues.slice(0, 4);
  return `<h2>${esc(entry.label)}</h2>${handleMarkup(resourceUid)}
    <dl class="story-inspector-fields">${rows.map(([key, value]) =>
      `<dt>${esc(key)}</dt><dd>${value}</dd>`).join("")}</dl>
    <h2>引用</h2>
    <dl class="story-inspector-fields">
      <dt>场景</dt><dd>${resourceForwardReferenceCell(resourceUid, ["map-scene"])}</dd>
      <dt>角色资产</dt><dd>${resourceForwardReferenceCell(resourceUid, ["actor-animation", "actor-special-frame", "actor-chr-set"])}</dd>
      <dt>界面与文本</dt><dd>${resourceForwardReferenceCell(resourceUid, ["ui-script-record", "complete-menu", "ui-layout"])}</dd>
    </dl>
    <h2>台词</h2>
    <ul class="story-inspector-clues">${clues.length ? clues.map(clue =>
      `<li><code>F${clue.start}</code>${esc(clue.dialogue.text)}</li>`).join("")
      : `<li>0 条</li>`}</ul>
    `;
}

function storyInspectorMarkup(entry, extraMarkup = '') {
  return `${extraMarkup}${storyInspectorInnerMarkup(entry)}`;
}

function storyTableRow(entry, selected) {
  const {sequence, compiled, context, resourceUid} = entry;
  const loopStart = compiled.loopStart === null || compiled.loopStart === undefined
    ? "—" : String(compiled.loopStart);
  return `<tr class="${entry.blocked ? "story-playback-unavailable" : ""} ${
    sequence.id === selected.sequence.id ? "story-row-active" : ""
  }">
    <td><button class="resource-uid" type="button" data-resource-query="${esc(resourceUid)}">${handleMarkup(resourceUid)}</button></td>
    <td class="mono">${handleMarkup(recordUid("scene-actor-list", sequence.entry_variant_id))}</td>
    <td class="mono">${esc(sequence.kind)}</td>
    <td><button class="record-link" type="button" data-story-sequence="${esc(sequence.id)}">${esc(entry.label)}</button></td>
    <td>${storySceneLink(context?.scene_id)}</td>
    <td>${esc(entry.controlLabel)}</td>
    <td class="mono num">${entry.shotCount}</td>
    <td class="mono num">${compiled.duration}</td>
    <td class="mono">${esc(entry.completionLabel)}</td>
    <td class="mono num">${loopStart}</td>
    <td class="mono">${entry.missing.length ? esc(entry.missing.join(" ")) : "—"}</td>
    <td class="mono">${entry.partial.length ? esc(entry.partial.map(item => item.opcode_hex).join(" ")) : "—"}</td>
    <td>${esc(entry.sourceStatus)}</td>
    <td>${esc(context?.evidence || "未找到")}</td>
    <td class="mono">${storyHandleTextMarkup(entry.shotLabel)}</td>
    <td>${resourceForwardReferenceCell(resourceUid, ["map-scene"])}</td>
    <td>${resourceForwardReferenceCell(resourceUid, ["actor-animation", "actor-special-frame", "actor-chr-set"])}</td>
    <td>${resourceForwardReferenceCell(resourceUid, ["ui-script-record", "complete-menu", "ui-layout"])}</td>
    <td class="story-playback-note">${storyHandleTextMarkup(entry.note)}</td>
  </tr>`;
}
