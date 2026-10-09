import { esc, referencePickerMarkup, bindReferencePicker, renderModuleComponent, prepareModuleComponent, hydrateModuleComponents, peekActorAppearance, recordUid, hex as hex$4, handleTextMarkup, resetToOriginalButton, applyResetToOriginalStates, datasetFacts, showEditorError, bindFixedTextEditors, handleMarkup, resourceForwardReferenceCell, syncReferencePickerControl, syncModuleComponents, currentTextReference, fixedTextEditorMarkup, loadChrBankBytes, fieldChrAnimationPlaybackPhase, ACTOR_ENTRY_TYPE_SELECTOR, actorSpriteSheetUrl, fieldPaletteSheetUrl, actorSetBanks, actorPoseForAppearance } from './monster-figure-C07vG7yu.js';
import { scenePositionPickerMarkup, hydrateScenePositionPicker, syncScenePositionPicker } from './components-wbruLTYI.js';
import { screenWorkbench, screenWorkbenchCanvasStage, bindOwnerReferenceList, withCurrentOwnerRecord, currentOwnerReferenceImpact, render, bindResourceQueries, ownerReferenceListMarkup, prepareSaveEditorWorkspace, previewSoundEnabled, battleModeForPendingEventFlag, battleFirstMonsterId, createAudioTimelinePlayer, bindPreviewSound, ensureAudioSequenceData, previewSoundControl, navigateInternalUrl } from './preview-sound-DHDXA99x.js';
import { db, flushAllAutoSaves, serializeStoryPageJson, createAutoSave, sceneActorRecord, storyCommandPresentation, playerTileFromSaveCamera, saveFieldBindings, readSaveField, projectFieldDraftRevision, storyPreviewRuntimeOverrides, resolveTextRecordDialogue, assembleStoryScriptLayout, changeStoryScriptSequence, storyScriptResetOwners, resetStoryScriptSequence, storySequencesForDefinition, SCENE_ACTORS_RESOURCE_ID, requireBrowserProjectRepository, storyPageWorkingKey, projectAssetSelectionsDirty, STORY_AUTONOMOUS_RESOURCE_ID, textRecord, decodeFixedTextRecord, applyTextCatalogToStoryProject, getSceneActorFields, applySceneActorRecordByte, applySceneActorAliasPatch, SCENE_ACTOR_EDITABLE_FIELDS, setStoryOperand, PARTY_MEMBER_COUNT, ACTOR_TYPE_COUNT, VISUAL_ACTORS_RESOURCE_ID, projectFieldsForSelectors, projectStoryOperands, resetProjectFieldsAtPaths, storyOperandPath, projectAssetSelectionStates, sceneActorAliasRecords, sceneActorEditableByteFields, encodeSceneActorRecordFields, setProjectFields, acceptProjectFieldDraft, fieldSubmenuCodeValues, FIELD_SUBMENU_CODE_PARAMETERS, fieldSubmenuCodeValue, dialogueRuntimeParameters, requireFrameByte, requireFrameVector, cloneFrameValue, createSceneOamServices, saveCurrentValue, sameFrameVector } from './scene-actors-Cftr7mCE.js';
import { editorLog, canonicalJsonEqual } from './project-store-values-klefznSR.js';
import { state, battleSimulatorHref, storyTimelineRowId } from './emulator-Bl-sLXnd.js';
import { storyInsertionBytes, storyCommandPickerMarkup, bindStoryCommandPicker, mountStoryTokenOperands, storyAudioLabel, storyResourceMarkup, storyActorHandle, storyScriptMarkup, storyInterfaceMarkup, mountStoryScriptOwner, storyCommandOperandReference, storyShotLabel, hydrateStoryScriptStructure, storyScriptStructureMarkup, storySceneLink, storyTextHandle, storyScriptHandle, storyTextMarkup, storyOperandReference, updateStorySceneLink } from './components-sq4R7sI1.js';
import { storyPageDefinitionForView, storyViewForSequenceId, storyEditableView, storyPlaybackView } from './baseline-assembly-C0KRII8X.js';
import { fieldCameraOrigin, elementTree, createSceneActionCore, sceneCameraCoordinate, uiDialogueActorName, sceneCameraByte, storyWaitingConditions, storyWaitResult, uiJsRenderSources, textCatalogRecordSource, uiPaintDialogueCanvas, invalidateTextCatalogDocument, textCatalogDocument, elementTreeRows, storyCompletionLabel, defineElementTreeTypes, ELEMENT_TREE_ICONS, ELEMENT_TREE_LABELS, spriteVisibleBands, loadSceneDrawProjectionParameters, loadSceneOamSources, createSceneActionState, createTextInteractionServices, packSceneDisplayDevice, unpackSceneDisplayRaster, unpackSceneDisplayDevice, initializeSceneContext, createSceneRenderServices, createSceneDrawSlotServices, resolveRasterDisplayResult, uiPaintFrameComposition, uiGlyphId, uiWriteGlyphCells, uiDialogueRuntimeKey, paintUiEditorPreviewCanvas, resolveEndingCreditsUiPreview, resolveStatusUiPreview, statusUiPreviewCanvas, VEHICLE_STATUS_DETAIL_SCREEN_ID } from './charset-BJ0aS3Xk.js';
import { sceneActorVisualMarkup, hydrateStoryActorVisuals, actorAppearanceContextForStory, actorAppearanceContextForParty, storyActorVisualMarkup } from './npcs-Dhp3qBbI.js';
import { timelinePlayer, paintScenePreviewTiles, timelineSummaryBlocks, syncScenePreviewRegions, syncScenePreviewObjects, bindScenePreview, scenePreviewControls, paintScenePreview, registerTimelineKeyRecords, prepareTimelineKeys, syncTimelinePlayer, loadScenePreviewSourceById, timelineSelectedBlocks, bindTimelinePlayer, timelineFrameAt, syncTimelineTree, timelineViewportControls, syncTimelineViewport } from './timeline-player-C0h-EABn.js';
import { sceneActorName, dialogueSpeakerName, storySequenceComponentLabel, storyComponentLabel } from './story-component-labels-C9k8orBA.js';
import { actorAppearanceContextForScene } from './write-access-marker-Q1IasgBx.js';
import { globalEventFlagHandle, eventFlagTextMarkup, eventFlagReferenceMarkup, physicalLocationMarkup, storyEventReferences, saveEventHref } from './writeback-capabilities-CGLIL9l3.js';
import './entity-detail-D8pHuYrZ.js';
import './text-record-structure-editor-COmgY10x.js';
import './actors-bind-DV2HGSY5.js';
import './components-lRLsNP5y.js';
import './components-BY2Q9sQf.js';
import './interaction-components-BXNxuJ8s.js';
import './zone-components-BHgfASiZ.js';
import './components-C4C2LoWv.js';
import './visual-components-CNmZ9fox.js';
import { DIRECTION_LABELS } from './components-E6ur3nf_.js';
import './step-effects-aB0T4dMU.js';
import './document-controls-Aq8h5H8g.js';
import './components-WokSyCfC.js';
import { mountFieldObjectArrayChoice, mountFieldObjectArrayPosition, mountFieldObjectArrayReference, mountFieldObjectField, bindFieldObjectProjections, mountFieldObjectReset, mountFieldObjectBitmask, fieldObjectProjectionMarkup } from './rectangle-preset-controls-MtKWNScU.js';
import { paintWantedPreviewCanvas } from './wanted-C5dzzQfy.js';
import { metaspriteStageSheetUrl, metaspriteStageOamCells } from './record-BbPQSBBw.js';
import { renderBattleTestFormationInlineEditor } from './battle-BewawxnM.js';
import './page-runtime-paths-_6fUGFtn.js';
import './machine-state-controller-CAdGM29s.js';
import './interface-state-frame-DebgoOld.js';
import './system-state-controller-2LgSXlEc.js';
import './battle-simulation-player-CZ8Cov7C.js';
import './battle-actors-XIvkcBal.js';
import './monsters-DSVVpGWY.js';
import './facility-configuration-controls-J3sIu6pM.js';
import './battle-scene-composer-BouUlKQZ.js';
import './generic-shop-CwrAX46z.js';

// @editor-module 剧情页的新建与 JSON 导入导出。

function storyPageIoMarkup() {
  return `<div class="story-page-io" data-story-page-io>
    ${storyPageDefinitionForView(state.view)?.editorOnly ? '<span title="暂不进 ROM">↛</span>' : ''}
    <button class="button" type="button" data-story-page-new>新增剧情页</button>
    <button class="button" type="button" data-story-page-import>导入 JSON</button>
    <button class="button" type="button" data-story-page-export>导出 JSON</button>
    ${state.view === 'story-page' ? '<button class="button" type="button" data-story-page-delete title="删除剧情页" aria-label="删除剧情页">×</button>' : ''}
    <input type="file" accept=".json,application/json" data-story-page-file hidden>
    <select data-story-custom-pages aria-label="项目剧情页" hidden></select>
    <pre data-story-page-error role="alert" hidden></pre>
  </div>`;
}

async function bindStoryPageIo(root, rerender) {
  const toolbar = root.querySelector('[data-story-page-io]');
  if (!toolbar || toolbar.dataset.bound) return;
  toolbar.dataset.bound = '1';
  const page = state.view === 'story-page' ? state.storyPageId : state.view;
  const error = toolbar.querySelector('[data-story-page-error]');
  const run = async operation => {
    error.hidden = true;
    try {await flushAllAutoSaves(); await operation();}
    catch (failure) {
      editorLog.error("字段编辑", `操作失败：${failure?.message || failure}`, failure);error.textContent = failure.message || String(failure); error.hidden = false;}
  };
  toolbar.querySelector('[data-story-page-new]').addEventListener('click', () => run(async () => {
    const id = await db.createStoryPageDocument();
    location.href = `?view=story-page&storyPage=${encodeURIComponent(id)}&storyPaused=1`;
  }));
  toolbar.querySelector('[data-story-page-delete]')?.addEventListener('click', () => run(async () => {
    await db.deleteStoryPageDocument(page);
    location.href = '?view=story-sequence&storyPaused=1';
  }));
  toolbar.querySelector('[data-story-page-export]').addEventListener('click', () => run(async () => {
    const document = await db.exportStoryPageDocument(page);
    const url = URL.createObjectURL(new Blob([serializeStoryPageJson(document)], {type: 'application/json'}));
    const link = root.ownerDocument.createElement('a');
    link.href = url;
    link.download = `${document.title.replace(/[\\/:*?"<>|]/gu, '-')}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }));
  const file = toolbar.querySelector('[data-story-page-file]');
  toolbar.querySelector('[data-story-page-import]').addEventListener('click', () => file.click());
  file.addEventListener('change', () => run(async () => {
    const selected = file.files[0];
    if (!selected) return;
    await db.importStoryPageDocument(page, await selected.text());
    state.storySequenceId = null;
    file.value = '';
    await rerender();
  }));
  const pages = await db.listStoryPageDocuments();
  if (!toolbar.isConnected) return;
  const customPages = pages.filter(row => row.id.startsWith('custom-'));
  const switcher = toolbar.querySelector('[data-story-custom-pages]');
  switcher.hidden = !customPages.length;
  switcher.innerHTML = `${customPages.some(row => row.id === page) ? '' : '<option value="">项目剧情页</option>'}${
    customPages.map(row => `<option value="${esc(row.id)}" title="${esc(row.id)}"${row.id === page ? ' selected' : ''}>${esc(row.title)}</option>`).join('')}`;
  switcher.addEventListener('change', () => {
    const id = switcher.value;
    if (id) void run(async () => {
      location.href = `?view=story-page&storyPage=${encodeURIComponent(id)}&storyPaused=1`;
    });
  });
}

// @editor-module 剧情页指令编辑的游标重排与分支目标保护。

function changeStoryPageInstructions(program, scripts, {action, cursor, bytes, targets = {}}) {
  const rows = program.instructions.map(instruction => ({instruction: structuredClone(instruction), origin: instruction.cursor}));
  const index = rows.findIndex(row => row.origin === cursor);
  if (index < 0 && action !== 'append') throw new TypeError('指令已删除');
  const fromBytes = position => scripts.instructionFromCommand({cursor: position, opcode: bytes[0], currentOperands: bytes.slice(1)});
  let inserted = null;
  if (action === 'insert' || action === 'insert-after' || action === 'append') {
    inserted = {instruction: fromBytes(0), origin: null};
    rows.splice(action === 'append' ? rows.length : index + (action === 'insert-after' ? 1 : 0), 0, inserted);
  } else if (action === 'copy') {
    rows.splice(index + 1, 0, {instruction: structuredClone(rows[index].instruction), origin: null});
  } else if (action === 'replace') {
    inserted = rows[index];
    inserted.instruction = {...fromBytes(cursor), ...(inserted.instruction.effect ? {effect: inserted.instruction.effect} : {})};
  } else if (action === 'delete') {
    if (rows.length === 1) throw new TypeError('指令序列须保留结束指令');
    if (rows.some(row => row.origin !== cursor && row.instruction.arguments.some(argument => argument.value?.target === cursor)))
      throw new TypeError('指令仍是分支目标');
    rows.splice(index, 1);
  } else if (action === 'up' || action === 'down') {
    const next = index + (action === 'up' ? -1 : 1);
    if (next < 0 || next >= rows.length) return program.instructions;
    [rows[index], rows[next]] = [rows[next], rows[index]];
  } else throw new TypeError('未知指令操作');
  const positions = new Map();
  let position = 0;
  for (const row of rows) {
    if (row.origin !== null) positions.set(row.origin, position);
    row.position = position;
    position += scripts.bytesFor(row.instruction).length;
  }
  if (position > 256) throw new TypeError('指令超过 256 字节容量');
  for (const row of rows) {
    row.instruction.cursor = row.position;
    row.instruction.arguments.forEach((argument, index) => {
      if (!argument.value || typeof argument.value !== 'object' || !Object.hasOwn(argument.value, 'target')) return;
      const target = row === inserted && Object.hasOwn(targets, index + 1) ? Number(targets[index + 1]) : argument.value.target;
      if (!positions.has(target)) throw new TypeError('分支目标须为现有指令');
      argument.value = {target: positions.get(target)};
    });
  }
  const instructions = rows.map(row => row.instruction);
  scripts.serializeProgram({...program, instructions});
  return instructions;
}

// @editor-module 剧情页的执行链、角色绑定与语义指令编辑控件。

const selections = new Map();
const sessions = new Map();
const hex$3 = value => Number(value).toString(16).toUpperCase().padStart(2, '0');
const pageId = () => state.view === 'story-page' ? state.storyPageId : null;
const sequenceLabel = (sequence, sequences) => String(sequence.content.label || '').trim()
  || `执行链 ${sequences.indexOf(sequence) + 1}`;
const actorLabel = handle => sceneActorName(sceneActorRecord(handle)).label;
const programLabel = program => program.kind === 'interaction' ? '交互指令' : '自主动作指令';
const selectionFor = page => {
  if (!selections.has(page)) selections.set(page, {});
  return selections.get(page);
};

const storyPageAuthoringTreeMarkup = () => pageId() ? `<div data-story-page-authoring>
  <div class="story-workbench-tree-head"><h3>对象树</h3></div>
  <div data-story-page-document-tree></div>
</div>` : '';
const storyPageAuthoringInspectorMarkup = () => pageId()
  ? '<section data-story-page-authoring-inspector><h3>详情</h3><button class="button ghost" type="button" data-story-page-add-sequence>＋ 执行链</button><div data-story-page-document-details></div><p data-story-page-edit-error role="alert" hidden></p></section>' : '';

function storyPageEmptyWorkbenchMarkup() {
  return `${screenWorkbench({namespace: 'story', className: 'story-workbench story-workbench-elements',
    heightMode: 'timeline', attributes: {'data-story-page-empty': ''}, treeTitle: null,
    treeClassName: 'story-workbench-tree-panel', treeScroll: 'body',
    treeMarkup: `${elementTree({nodes: [{id: 'page-root', label: storyPageDefinitionForView(state.view)?.title || '剧情页'}],
      selectedId: 'page-root', showIcons: false,
      buttonAttributes: () => ({'data-story-workbench-root': '', 'aria-pressed': 'true'}),
    })}${storyPageAuthoringTreeMarkup()}<div class="story-workbench-tree"></div>`,
    stageMarkup: screenWorkbenchCanvasStage({namespace: 'story', sizing: 'fill', zoomMarkup: '',
      className: 'story-stage-column', toolbarMarkup: '<button type="button" class="button" data-story-page-choose-scene>选择场景</button>',
      viewportClassName: 'story-stage-viewport story-page-empty-stage', viewportAttributes: {'data-story-page-stage': ''},
      canvasMarkup: '<canvas width="256" height="240" aria-label="舞台"></canvas>'}),
    inspectorTitle: null, inspectorClassName: 'story-inspector story-workbench-inspector',
    inspectorMarkup: storyPageAuthoringInspectorMarkup(),
  })}<section class="presentation-timeline"><div class="story-editable-playback" data-story-page-empty-timeline>${timelinePlayer({id: 'story-page-empty', totalFrames: 1, frame: 0, lanes: [], title: '轨道与时间轴'})}</div></section>`;
}

function storyPageKeyEditorMarkup(command, {insertionPoint = null} = {}) {
  return `<div data-story-page-key-editor="${esc(JSON.stringify({kind: command.scriptKind,
    programId: command.programId, cursor: command.cursor, insertionPoint}))}"></div>`;
}

async function sessionFor(page, rerender) {
  const editor = await db.getStoryPageEditor(page);
  let session = sessions.get(page);
  if (!session || session.project !== state.projectRepository) {
    session = {page, project: state.projectRepository, editor};
    session.chain = createAutoSave(async change => {
      const document = await session.editor.change(change);
      session.editor.document = document;
      return document;
    }, {delay: 0, scope: () => `story-page:${page}`});
    sessions.set(page, session);
  }
  session.editor = editor;
  session.rerender = rerender || session.rerender;
  return session;
}

async function save(session, host, change) {
  const error = host.querySelector('[data-story-page-key-error]')
    || host.closest('#content')?.querySelector('[data-story-page-edit-error]');
  if (error) error.hidden = true;
  try {
    const document = await session.chain.commit(crypto.randomUUID(), change);
    if (host.isConnected && pageId() === session.page) await session.rerender?.();
    return document;
  } catch (failure) {
    if (error) {error.textContent = failure.message; error.hidden = false;}
    throw failure;
  }
}

function programMarkup(program, selection) {
  return `<div class="story-page-program"><button class="record-link" type="button" title="${esc(programLabel(program))}" data-story-page-program="${esc(program.key)}">${esc(programLabel(program))}</button>
    <div>${program.instructions.map(instruction => `<button type="button" class="story-page-key${selection.program === program.key && selection.cursor === instruction.cursor ? ' active' : ''}"
      data-story-page-program="${esc(program.key)}" data-story-page-cursor="${instruction.cursor}">${esc(storyCommandPresentation({...instruction.options,
        operation: instruction.operation}).label)}</button>`).join('')}</div></div>`;
}

function showAuthoring(root, pageRootSelected = false) {
  state.storyTimelineRowId = null;
  if (!pageRootSelected) {
    (root.querySelector('[data-story-workbench-editable]') || root).dispatchEvent(new CustomEvent('story-page-authoring-select'));
    const button = root.querySelector('[data-story-workbench-root]');
    button?.setAttribute('aria-pressed', 'false');
    button?.closest('.element-tree-node')?.classList.remove('is-selected');
  }
  root.querySelector('[data-story-page-authoring-inspector]').hidden = false;
  for (const host of root.querySelectorAll('[data-story-object-inspector], [data-story-timeline-details], [data-story-object-sources]')) host.hidden = true;
}

async function bindStoryPageAuthoring(root, rerender, semantics) {
  const tree = root?.querySelector('[data-story-page-authoring]');
  const page = pageId();
  if (!tree || !page || tree.dataset.bound) return;
  tree.dataset.bound = '1';
  const session = await sessionFor(page, rerender), {document, scripts} = session.editor;
  session.semantics = semantics;
  const selection = selectionFor(page);
  const sequences = document.sequences;
  const sequence = sequences.find(row => row.content.id === state.storySequenceId) || sequences[0];
  const actorDocument = await db.getDocument('scene-actor');
  const scenes = (await db.getDocument('project.scenes')).editable_scenes || [];
  if (!tree.isConnected) return;
  session.scenes = scenes;
  tree.querySelector('[data-story-page-document-tree]').innerHTML = sequences.map(row => `<div class="story-page-chain">
    <button type="button" class="story-page-chain-title${row === sequence ? ' active' : ''}" title="${esc(sequenceLabel(row, sequences))}" data-story-page-sequence="${esc(row.content.id)}">${esc(sequenceLabel(row, sequences))}</button>
    ${document.bindings.filter(binding => binding.actor.startsWith(`${row.content.entry_variant_id.replace('scene-actor-list:', 'scene-actor:')}:`))
      .map(binding => `<div><span title="${esc(actorLabel(binding.actor))}">${esc(actorLabel(binding.actor))}</span>${['autonomous', 'interaction'].map(kind => document.programs.find(program => program.key === binding[kind]))
        .filter(Boolean).map(program => programMarkup(program, selection)).join('')}</div>`).join('')}
    </div>`).join('');
  root.querySelector('[data-story-page-add-sequence]').addEventListener('click', () => {
    selection.create = true; selection.program = null; selection.insert = false;
    void details();
  });
  root.querySelector('[data-story-page-choose-scene]')?.addEventListener('click', () => {
    selection.create = !sequence; selection.program = null; selection.insert = false;
    void details();
  });
  tree.addEventListener('click', event => {
    const chain = event.target.closest('[data-story-page-sequence]');
    if (chain) {
      state.storySequenceId = chain.dataset.storyPageSequence;
      selection.create = false; selection.program = null; selection.insert = false;
      void rerender();
    }
    const key = event.target.closest('[data-story-page-program]');
    if (key) {
      selection.program = key.dataset.storyPageProgram;
      selection.cursor = key.hasAttribute('data-story-page-cursor') ? Number(key.dataset.storyPageCursor) : null;
      selection.create = false; selection.insert = false;
      void details();
    }
  });
  const showObjects = () => {
    const inspector = root.querySelector('[data-story-object-inspector]');
    if (!inspector) return;
    root.querySelector('[data-story-page-authoring-inspector]').hidden = true;
    inspector.hidden = false;
    root.querySelector('[data-story-object-sources]').hidden = false;
  };
  root.querySelector('.story-workbench-tree')?.addEventListener('click', showObjects);
  root.addEventListener('story-object-select', showObjects);
  root.addEventListener('pointerdown', event => {
    if (event.target.closest('[data-story-row]')) showObjects();
  }, true);
  root.addEventListener('story-page-root-select', () => {
    selection.create = false; selection.program = null; selection.insert = false;
    void details(true);
  });
  root.querySelector('[data-story-page-empty] [data-story-workbench-root]')?.addEventListener('click', event => {
    const button = event.currentTarget;
    button.setAttribute('aria-pressed', 'true');
    button.closest('.element-tree-node').classList.add('is-selected');
    root.dispatchEvent(new CustomEvent('story-page-root-select'));
  });
  async function details(pageRootSelected = false) {
    const host = root.querySelector('[data-story-page-document-details]');
    if (!host) return;
    showAuthoring(root, pageRootSelected);
    const program = document.programs.find(row => row.key === selection.program);
    if (program) {
      const cursor = program.instructions.some(row => row.cursor === selection.cursor) ? selection.cursor : program.instructions.at(-1)?.cursor;
      host.innerHTML = `${sequence ? `<p title="${esc(sequence.handle)}">${esc(sequenceLabel(sequence, sequences))}</p>` : ''}<h4 title="${esc(program.key)}">${esc(programLabel(program, document.programs))}</h4>
        <button type="button" class="button" data-story-page-add-key>＋ key</button>
        ${storyPageKeyEditorMarkup({scriptKind: program.kind, programId: scripts.slotsFor(document).get(program.key), cursor}, {insertionPoint: selection.insert ? 'end' : null})}`;
      host.querySelector('[data-story-page-add-key]').addEventListener('click', () => {selection.insert = true; void details();});
      await hydrateStoryPageKeyEditors(host, rerender);
      return;
    }
    host.innerHTML = `<label>名称 <input data-story-page-title value="${esc(document.title)}"></label>
      ${sequence ? `<label title="${esc(sequence.handle)}">执行链 <input data-story-page-label value="${esc(sequence.content.label || '')}" placeholder="${esc(sequenceLabel(sequence, sequences))}"></label>` : ''}
      <div data-story-page-scene-picker></div><div data-story-page-actor-picker></div>`;
    host.querySelector('[data-story-page-title]').addEventListener('change', event => {
      const title = event.target.value.trim();
      void save(session, host, current => ({...current, title})).catch(() => {});
    });
    host.querySelector('[data-story-page-label]')?.addEventListener('change', event => {
      const label = event.target.value;
      void save(session, host, current => {
        current.sequences.find(row => row.handle === sequence.handle).content.label = label;
        return current;
      }).catch(() => {});
    });
    const creating = selection.create || !sequence;
    const sceneId = creating ? null : parseInt(sequence.content.shots[0].scene_id.split(':')[1], 16);
    const sceneHost = host.querySelector('[data-story-page-scene-picker]');
    const point = sequence?.content.entry;
    sceneHost.innerHTML = `${creating ? '<label>触发 <select data-story-page-trigger><option value="interaction">交互</option><option value="autonomous">进场</option></select></label>' : ''}${scenePositionPickerMarkup({entries: scenes, sceneId: sceneId ?? Number(scenes[0]?.id),
      x: creating ? 8 : point?.initial_player_map_x ?? 8, y: creating ? 7 : point?.initial_player_map_y ?? 7, label: '场景'})}`;
    if (creating) sceneHost.querySelector('summary').innerHTML = '<span data-scene-position-thumbnail></span><span>选择场景</span><i>⌄</i>';
    const picker = sceneHost.querySelector('[data-scene-position-picker]');
    hydrateScenePositionPicker(picker, {entries: scenes, onConfirm: async ({sceneId, x, y}) => {
      const table = actorDocument.tables.find(table => table.owner?.scene_id === sceneId && table.count > 0);
      if (!table) {
        const error = root.querySelector('[data-story-page-edit-error]');
        error.textContent = '场景没有可绑定角色'; error.hidden = false;
        return false;
      }
      const kind = sceneHost.querySelector('[data-story-page-trigger]')?.value || (sequence.content.kind === 'interaction-trigger-sequence' ? 'interaction' : 'autonomous');
      const id = creating ? `page-${crypto.randomUUID()}` : sequence.content.id;
      const [cameraX, cameraY] = fieldCameraOrigin(sceneId, x, y);
      try {await save(session, host, current => {
        const content = {id, label: creating ? `执行链 ${current.sequences.length + 1}` : sequence.content.label,
          kind: kind === 'interaction' ? 'interaction-trigger-sequence' : 'controllable-scene-event-variant',
          entry_variant_id: `scene-actor-list:${hex$3(table.entry_id)}`, variant_ids: [`scene-actor-list:${hex$3(table.entry_id)}`],
          shots: [{shot_index: 0, kind: 'actor-list', variant_id: `scene-actor-list:${hex$3(table.entry_id)}`, scene_id: `scene:${hex$3(sceneId)}`}],
          entry: {initial_player_map_x: x, initial_player_map_y: y, camera_tile_origin_x: cameraX, camera_tile_origin_y: cameraY}};
        if (creating) current.sequences.push({handle: `story-sequence:${id}`, content});
        else {
          const row = current.sequences.find(row => row.content.id === id);
          if (row.content.entry_variant_id !== content.entry_variant_id && row.content.interaction_trigger) delete row.content.interaction_trigger;
          row.content = {...row.content, ...content};
        }
        state.storySequenceId = id; selection.create = false;
        return current;
      });} catch {return false;}
    }});
    if (!sequence || creating) return;
    const actors = actorDocument.records.filter(actor => actor.entry_id === parseInt(sequence.content.entry_variant_id.split(':')[1], 16));
    const actorHost = host.querySelector('[data-story-page-actor-picker]');
    const scene = await db.getResourceDocument(`scene:${hex$3(sceneId)}`);
    const pair = actorAppearanceContextForScene(scene).pair;
    const kind = sequence.content.kind === 'interaction-trigger-sequence' ? 'interaction' : 'autonomous';
    const boundActor = sequence.content.interaction_trigger?.actor_record_id || document.bindings.find(binding =>
      binding[kind] && actors.some(actor => actor.uid === binding.actor))?.actor || '';
    actorHost.innerHTML = referencePickerMarkup({moduleId: 'scene-actor', label: '绑定角色', value: boundActor, compact: true,
      items: actors.map(actor => ({value: actor.uid, label: actorLabel(actor.uid), meta: `${actor.x}, ${actor.y}`,
        preview: sceneActorVisualMarkup({record: actor, pair, label: actorLabel(actor.uid), compact: true})})),
      controlMarkup: `<input type="hidden" data-story-page-actor value="${esc(boundActor)}">`, filterLabel: '搜索角色'});
    bindReferencePicker(actorHost.querySelector('[data-module-reference-picker]'), {paint: hydrateStoryActorVisuals, onSelect: actor => {
      void save(session, host, current => {
        let binding = current.bindings.find(row => row.actor === actor);
        if (!binding) {binding = {actor, autonomous: null, interaction: null}; current.bindings.push(binding);}
        if (!binding[kind]) {
          let suffix = 1;
          while (current.programs.some(program => program.key === `${kind}-${suffix}`)) suffix++;
          const key = `${kind}-${suffix}`;
          current.programs.push({key, kind, instructions: [scripts.instructionFromCommand({cursor: 0, opcode: 0, currentOperands: []})]});
          binding[kind] = key;
        }
        const row = current.sequences.find(row => row.handle === sequence.handle);
        if (kind === 'interaction') row.content.interaction_trigger = {actor_record_id: actor};
        selection.program = binding[kind]; selection.cursor = 0; selection.insert = false;
        return current;
      }).catch(() => {});
    }});
  }
  const pageRootSelected = Boolean(root.querySelector('[data-story-workbench-root][aria-pressed="true"]'));
  if (pageRootSelected) {selection.create = false; selection.program = null; selection.insert = false;}
  await details(pageRootSelected);
  await hydrateStoryPageKeyEditors(root, rerender);
  const emptyTimeline = root.querySelector('[data-story-page-empty-timeline]');
  if (emptyTimeline) {
    emptyTimeline.innerHTML = timelinePlayer({id: 'story-page-empty', totalFrames: 1, frame: 0,
      lanes: document.programs.map(program => ({id: program.key, label: programLabel(program, document.programs), kind: 'key', blocks: []})), title: '轨道与时间轴'});
    emptyTimeline.querySelector('[data-tl-play]').disabled = true;
  }
  const stage = root.querySelector('[data-story-page-stage]');
  if (stage && sequence) {
    const sceneId = parseInt(sequence.content.shots[0].scene_id.split(':')[1], 16);
    stage.innerHTML = renderModuleComponent('scene-header-map', 'cover', await prepareModuleComponent('scene-header-map', 'cover', {sceneId, width: 256, height: 240, interactive: false}));
    await hydrateModuleComponents(stage);
  }
}

async function hydrateStoryPageKeyEditors(root, rerender) {
  const page = pageId();
  if (!page) return;
  const session = await sessionFor(page, rerender), {document, scripts} = session.editor;
  const semantics = session.semantics;
  if (!semantics) return;
  for (const host of root.querySelectorAll('[data-story-page-key-editor]')) {
    if (host.dataset.ready) continue;
    host.dataset.ready = '1';
    const props = JSON.parse(host.dataset.storyPageKeyEditor);
    const program = document.programs.find(row => row.kind === props.kind && scripts.slotsFor(document).get(row.key) === props.programId);
    const instruction = program?.instructions.find(row => row.cursor === props.cursor);
    if (!instruction || !host.isConnected) continue;
    const inserting = Boolean(props.insertionPoint);
    const asset = await db.getResourceDraft(`story-${program.kind}-script`);
    if (!host.isConnected) continue;
    const declarations = asset.layout.declarations;
    let bytes = inserting ? storyInsertionBytes(declarations.find(row => row.opcode === 0x16), semantics.get(0x16)) : scripts.bytesFor(instruction);
    let targets = {};
    instruction.arguments.forEach((argument, index) => {if (argument.value?.target !== undefined) targets[index + 1] = argument.value.target;});
    const resetProgram = scripts.resetPrograms(document).find(row => row.key === program.key);
    const resetInstruction = resetProgram.instructions.find(row => row.cursor === instruction.cursor);
    const defaults = resetInstruction ? scripts.bytesFor(resetInstruction) : bytes;
    host.innerHTML = `${storyCommandPickerMarkup({resourceId: `story-${program.kind}-script`, declarations, semantics, opcode: bytes[0]})}
      <div data-story-page-operands></div>${inserting && !['start', 'end'].includes(props.insertionPoint)
        ? '<label>位置 <select data-story-page-insert-position><option value="before">选中 key 前</option><option value="after">选中 key 后</option></select></label>' : ''}
      <div class="story-script-structure-actions"><span data-script-location>远跳页</span>${inserting ? '<button type="button" class="button" data-story-page-key-action="insert">添加 key</button>'
        : `<button type="button" class="button ghost" data-story-page-key-insert>插入</button><button type="button" class="button ghost" data-story-page-key-action="up">前移</button><button type="button" class="button ghost" data-story-page-key-action="down">后移</button><button type="button" class="button ghost" data-story-page-key-action="copy">复制</button><button type="button" class="button ghost" data-story-page-key-action="delete">删除 key</button><button type="button" class="button ghost" data-story-page-key-reset${JSON.stringify(resetProgram) === JSON.stringify(program) ? ' disabled' : ''}>重置脚本</button>`}</div><p data-story-page-key-error role="alert" hidden></p>`;
    const change = async (action, nextBytes = bytes, selection = null) => save(session, host, current => {
      const currentProgram = current.programs.find(row => row.key === program.key);
      const index = currentProgram.instructions.findIndex(row => row.cursor === instruction.cursor);
      let merged = nextBytes;
      if (selection) {
        merged = scripts.bytesFor(currentProgram.instructions.find(row => row.cursor === instruction.cursor));
        for (const {offset, length} of selection) merged.splice(offset, length, ...nextBytes.slice(offset, offset + length));
      }
      currentProgram.instructions = changeStoryPageInstructions(currentProgram, scripts,
        {action: action === 'insert' && host.querySelector('[data-story-page-insert-position]')?.value === 'after' ? 'insert-after' : action,
          cursor: props.insertionPoint === 'end' ? currentProgram.instructions.at(-1).cursor : props.insertionPoint === 'start' ? currentProgram.instructions[0].cursor : instruction.cursor,
          bytes: merged, targets});
      selectionFor(page).insert = false;
      if (['up', 'down', 'copy', 'delete'].includes(action)) {
        const next = index + (action === 'up' ? -1 : ['down', 'copy'].includes(action) ? 1 : 0);
        selectionFor(page).cursor = currentProgram.instructions[Math.max(0, Math.min(next, currentProgram.instructions.length - 1))].cursor;
      }
      return current;
    });
    const bindings = [];
    const field = {resourceId: `story-page-working:${page}`, entityHandle: program.key, fieldName: 'sequence', readOnly: false,
      min: 0, max: 255, value: bytes, defaultValue: defaults, version: 0, hasOverride: JSON.stringify(bytes) !== JSON.stringify(defaults),
      bind(target, paint) {bindings.push({target, paint}); paint(target, this.value);},
      async set(value, options = {}) {
        if (inserting) {
          bytes = [...value]; this.value = bytes;
          for (const {target, paint} of bindings) if (target.isConnected) paint(target, bytes);
          return [this];
        }
        await change('replace', value, options.selection); return [this];
      }, reset(options) {return this.set(this.defaultValue, options);}};
    const object = {id: `${field.resourceId}:${program.key}`, resourceId: field.resourceId, entityHandle: program.key, fields: [field],
      definition: {editor: {kind: 'numeric-table', columns: [{name: 'sequence', label: '参数', min: 0, max: 255}]}}};
    const operands = host.querySelector('[data-story-page-operands]');
    const renderOperands = async () => {
      const declaration = declarations.find(row => row.opcode === bytes[0]);
      const sequence = document.sequences.find(row => row.content.id === state.storySequenceId) || document.sequences[0];
      const sceneId = sequence ? parseInt(sequence.content.shots[0].scene_id.split(':')[1], 16) : null;
      field.value = bytes;
      await mountStoryTokenOperands(operands, object, {declaration, semantic: semantics.get(bytes[0]), semantics,
        scenes: session.scenes, sceneId, insertion: inserting,
        choices: program.instructions.map(row => ({id: String(row.cursor), label: `${row.cursor} · ${storyCommandPresentation(row).label}`})),
        targets: declaration.dynamic_advance_operands.map(index => ({index, target: String(targets[index] ?? instruction.cursor)})),
        onTarget: (index, target) => {targets[index] = Number(target); if (!inserting) void change('replace').catch(() => {});}});
      for (const select of operands.querySelectorAll('[data-script-target]')) targets[Number(select.dataset.scriptTarget)] = Number(select.value);
    };
    bindStoryCommandPicker(host.querySelector('[data-module-reference-picker]'), {declarations, semantics});
    host.querySelector('[data-script-opcode]').addEventListener('change', event => {
      const declaration = declarations.find(row => row.opcode === Number(event.target.value));
      bytes = storyInsertionBytes(declaration, semantics.get(declaration.opcode));
      targets = Object.fromEntries(declaration.dynamic_advance_operands.map(index => [index, instruction.cursor]));
      if (inserting) void renderOperands(); else void change('replace').catch(() => {});
    });
    host.querySelector('[data-story-page-key-insert]')?.addEventListener('click', () => {
      host.dataset.storyPageKeyEditor = JSON.stringify({...props, insertionPoint: 'before'});
      delete host.dataset.ready;
      void hydrateStoryPageKeyEditors(host.parentElement, rerender);
    });
    host.querySelector('[data-story-page-key-reset]')?.addEventListener('click', () => {
      void save(session, host, current => {
        const reset = scripts.resetPrograms(current).find(row => row.key === program.key);
        current.programs = current.programs.map(row => row.key === program.key ? reset : row);
        return current;
      }).catch(() => {});
    });
    for (const button of host.querySelectorAll('[data-story-page-key-action]')) button.addEventListener('click', () => {
      if ([...operands.querySelectorAll('input[type="number"]')].some(input => !input.reportValidity())) return;
      button.disabled = true;
      void change(button.dataset.storyPageKeyAction).catch(() => {button.disabled = false;});
    });
    await renderOperands();
  }
}

// @editor-module 剧情预览注入当前仓库，页面只保留预览选项。

const core = createSceneActionCore({readProject: () => state.project, database: db,
  repositoryIdentity: () => state.projectRepository, actorAppearance: peekActorAppearance});
const storyVmCompilationCache = core.storyVmCompilationCache;
const storyVmSequenceCompilationCache = core.storyVmSequenceCompilationCache;
const storyBrowserVm = (...args) => core.storyBrowserVm(...args);
const storyActorIsVisible = (...args) => core.storyActorIsVisible(...args);
const storyVmEntryVariant = (...args) => core.storyVmEntryVariant(...args);
const storyPartyMembers = (...args) => core.storyPartyMembers(...args);
const storySnapshotActors = (...args) => core.storySnapshotActors(...args);
const storyVmCurrentPrograms = (...args) => core.storyVmCurrentPrograms(...args);
const storyVmBlockingUiResolver = (...args) => core.storyVmBlockingUiResolver(...args);
const storyVmSemanticsMap = (...args) => core.storyVmSemanticsMap(...args);
const storyAudioCommand = (...args) => core.storyAudioCommand(...args);
const storyAudioControl = (...args) => core.storyAudioControl(...args);
const storyVmAllActorLists = (...args) => core.storyVmAllActorLists(...args);
const storyVmSequences = (...args) => core.storyVmSequences(...args);
const storyVmStage = (...args) => core.storyVmStage(...args);
const storyCompiledDialogueRuns = (...args) => core.storyCompiledDialogueRuns(...args);
const buildStoryVmSequence = (...args) => core.buildStoryVmSequence(...args);

/** 剧情队伍槽优先取预览覆盖，其次取匹配存档，最后取人物初值。 */
function storyPartySlotsForSequence(sequenceId, includePreview = true) {
  const key = String(sequenceId || "");
  const override = state.storyPartyPreviewSlots.get(key);
  const slots = override instanceof Set ? new Set(override) : new Set(storySavedRuntimeOverrides(key).partySlots
    || storyPartyMembers().filter(member => member.defaultRendered).map(member => member.slot));
  for (const member of includePreview ? state.storyBranchPreviewConditions.get(key)?.party || [] : []) {
    if (member.state === "absent") slots.delete(member.slot);
    else if (member.state !== undefined) slots.add(member.slot);
  }
  return slots;
}

/** 切换某位成员是否参与本段剧情的运行时分支与舞台渲染。 */
function setStoryPartySlotForSequence(sequenceId, slot, rendered) {
  const key = String(sequenceId || "");
  const id = Number(slot);
  if (!key || !Number.isInteger(id) || id < 0) return;
  const slots = storyPartySlotsForSequence(key);
  if (rendered) slots.add(id);
  else slots.delete(id);
  state.storyPartyPreviewSlots.set(key, slots);
  const conditions = state.storyBranchPreviewConditions.get(key);
  if (conditions?.party?.some(member => member.slot === id)) {
    state.storyBranchPreviewConditions.set(key, {...conditions,
      party: conditions.party.map(member => member.slot === id ? {...member,
        state: rendered ? member.state === "dead" ? "dead" : "present" : "absent"} : member),
    });
  }
  storyVmCompilationCache.clear();
  storyVmSequenceCompilationCache.clear();
}

/** 供工作台、播放器和时间轴共用的 VM 入口覆盖。 */
function storyPartyRuntimeOverrides(sequenceId, includePreview = true) {
  const saved = {...storySavedRuntimeOverrides(sequenceId)};
  const sequence = core.storyVmSequences().find(row => row.id === sequenceId);
  const variant = core.storyVmAllActorLists().find(row => row.id === sequence?.entry_variant_id);
  // SAV 只提供队伍与持久事件；调用方声明拥有触发时的位置。
  if (sequence?.interaction_trigger || sequence?.preview_entry?.interaction_bootstrap
      || sequence?.preview_entry?.field_bootstrap || sequence?.preview_entry?.scene_entry_bootstrap
      || sequence?.preview_entry?.story_state_bootstrap || sequence?.preview_entry?.field_traversal?.entry_transition
      || sequence?.preview_entry?.coordinate_gate_source || variant?.coordinate_gate_source) {
    for (const key of ['playerMapX', 'playerMapY', 'playerDirection', 'cameraTileOriginX', 'cameraTileOriginY']) delete saved[key];
  }
  const vehicles = state.storyPartyPreviewVehicles.get(String(sequenceId));
  return {
    ...saved,
    externalStatePreview: true,
    externalResults: state.storyExternalPreviewResults.get(String(sequenceId)) || [],
    previewFieldInputs: state.storyPlayerPreviewInputs.get(String(sequenceId)),
    partySlots: [...storyPartySlotsForSequence(sequenceId, includePreview)]
      .sort((left, right) => left - right),
    partyMembers: (saved.partyMembers || storyPartyMembers()).map(member => vehicles?.has(member.slot)
      ? {...member, ridingVehicle: true, vehicleSlot: vehicles.get(member.slot)} : member),
    ...(includePreview && state.storyBranchPreviewConditions.has(String(sequenceId))
      ? {previewConditions: state.storyBranchPreviewConditions.get(String(sequenceId))} : {}),
  };
}

let savedRuntimeCache = null;
function storySavedRuntimeOverrides(sequenceId) {
  if (!['loaded', 'edited'].includes(state.saveCurrentSource) || !state.saveCurrentBytes || !state.saveByteMapDocument) return {};
  const sequence = core.storyVmSequences().find(row => row.id === sequenceId);
  const variant = core.storyVmAllActorLists().find(row => row.id === sequence?.entry_variant_id);
  const slot = state.savePageSlot || 1, prefix = `save.slot.${slot}.`;
  const read = field => readSaveField(state.saveCurrentBytes, prefix + field, state.saveByteMapDocument);
  const scene = read('scene_id');
  if (!variant?.scene_contexts?.some(context => context.scene_id === scene)) return {};
  const revision = ['character-initial-record', 'actor-visual', 'party-field-actor-type-map', 'vehicle-visual-selector']
    .map(id => db.fieldRevision(id)).join(':');
  if (savedRuntimeCache?.bytes === state.saveCurrentBytes && savedRuntimeCache.document === state.saveByteMapDocument
      && savedRuntimeCache.slot === slot && savedRuntimeCache.repository === state.projectRepository
      && savedRuntimeCache.revision === revision) return savedRuntimeCache.value;
  const x = read('camera_x'), y = read('camera_y'), player = playerTileFromSaveCamera(x, y);
  const partyMembers = storyPartyMembers().map(member => {
    const role = `role.${member.slug}.`, present = read(role + 'present');
    return {...member, defaultRendered: Boolean(present), status: read(role + 'status'),
      currentHp: read(role + 'current_hp'), level: read(role + 'level'),
      ridingVehicle: Boolean(present & 128), vehicleSlot: read(role + 'current_vehicle')};
  });
  const eventFlags = [...saveFieldBindings(state.saveByteMapDocument).keys()]
    .filter(id => id.startsWith(prefix + 'global_event_flag.') && readSaveField(state.saveCurrentBytes, id, state.saveByteMapDocument))
    .map(id => parseInt(id.split('.').at(-1), 16)).filter(id => id >= 8);
  const value = {playerMapX: player.x, playerMapY: player.y, playerDirection: 'up', cameraTileOriginX: sceneCameraCoordinate(scene, x),
    cameraTileOriginY: sceneCameraCoordinate(scene, y), partyMembers, partySlots: partyMembers.filter(member => member.defaultRendered).map(member => member.slot), eventFlags};
  savedRuntimeCache = {bytes: state.saveCurrentBytes, document: state.saveByteMapDocument,
    repository: state.projectRepository, slot, revision, value};
  return value;
}

function setStoryPartyVehicleForSequence(sequenceId, slot, vehicleSlot) {
  const vehicles = new Map(state.storyPartyPreviewVehicles.get(String(sequenceId)) || []);
  if (vehicleSlot === null) vehicles.delete(Number(slot));
  else if (Number.isInteger(vehicleSlot) && vehicleSlot >= 0 && vehicleSlot < 8)
    vehicles.set(Number(slot), vehicleSlot);
  else throw new TypeError("剧情预览战车槽无效");
  state.storyPartyPreviewVehicles.set(String(sequenceId), vehicles);
  storyVmCompilationCache.clear();
  storyVmSequenceCompilationCache.clear();
}

function drawStoryFieldTileOverlay(canvas, snapshot, context, stage) {
  return paintScenePreviewTiles(canvas, {tiles: snapshot.fieldTiles, sceneId: snapshot.sceneId,
    cameraX: Number(snapshot.cameraTileOriginX || 0), cameraY: Number(snapshot.cameraTileOriginY || 0),
    scrollOffsetY: Number(snapshot.screenScrollOffsetY || 0), animationPhase: snapshot.backgroundAnimationPhase,
    paletteDecrement: Number(snapshot.fieldPresentation?.paletteDecrement) || 0,
    backgroundFlash: Boolean(snapshot.fieldPresentation?.backgroundFlash), context, stage});
}

// @editor-module 从当前指令与文字计算剧情候选路径和入口条件。
const clone = value => structuredClone(value);
const hex$2 = value => Number(value).toString(16).toUpperCase().padStart(2, "0");

function storyBranchCondition(command, semantic) {
  const operands = command.currentOperands || command.operands || [];
  const [value, second] = operands;
  const operation = semantic?.operation;
  const condition = (key, label, jumpWhen, advanceIndex = semantic?.branch_operand_index) => ({
    key, label, jumpWhen, value, operands,
    normal: (command.cursor + command.normal_advance) & 255,
    jump: (command.cursor + Number(operands[advanceIndex])) & 255,
  });
  switch (operation) {
    case "branch-if-event-flag-clear": return condition(`flag:${value}`, globalEventFlagHandle(value), false);
    case "branch-if-party-member-alive": return condition(`alive:${value}`, `队员 ${value + 1} 存活`, true, 1);
    case "branch-if-runtime-slot-empty": return condition(`present:${value}`, `队员 ${value + 1} 在队`, false);
    case "branch-if-runtime-slot-present": return condition(`present:${value}`, `队员 ${value + 1} 在队`, true);
    case "branch-if-party-not-riding": return condition("riding", "乘车", false, 0);
    case "branch-if-investigation-acquired": return condition(`acquired:${value}`, `取得位 ${hex$2(value)}`, true, 1);
    case "branch-if-party-money-insufficient": return condition(`money:${value}`, `金钱 ≥ ${value}`, false, 1);
    case "branch-if-party-level-insufficient": return condition(`level:${value}`, `队伍等级 ≥ ${value}`, false, 1);
    case "branch-if-party-health-insufficient": return condition(`hp:${value}`, `队伍 HP ≥ ${value}`, false, 1);
    case "find-party-item-and-branch": return condition(`item:${value}`, `持有道具 ${hex$2(value)}`, false, 1);
    case "grant-party-item-and-branch": return condition(`item-space:${value}`, "背包有空位", false, 1);
    case "branch-if-party-descriptor-absent": return condition(`descriptor:${value}`, `队伍描述符 ${hex$2(value)}`, false, 1);
    case "branch-if-object-outside-scene": return condition(`object:${value}`, `对象 ${hex$2(value)} 在本场景`, false, 1);
    case "branch-if-runtime-result-nonzero": return condition("result", "返回值 D5 非零", true);
    case "branch-on-field-ui-target": return {...condition("target", "界面已选目标", true, 0), normal: (command.cursor + 1) & 255};
    case "branch-on-player-position-exact": return condition(`position:${value}:${second}`, `玩家位置 (${value}, ${second})`, false, semantic.mismatch_advance_operand_index);
    case "branch-on-player-direction": return condition(`direction:${value}`, `玩家朝向 ${["上", "下", "左", "右"][value & 3]}`, false, semantic.mismatch_advance_operand_index);
    case "branch-on-player-position-rectangle": return condition(`rectangle:${operands.slice(0, 4).join(":")}`, `玩家在范围 ${operands.slice(0, 4).join(" · ")}`, false, semantic.outside_advance_operand_index);
    default: return null;
  }
}

// 每条入口条件只赋值一次；脚本写入的值优先于入口条件。
function constrain(path, key, value) {
  const known = Object.hasOwn(path.values, key) ? path.values[key] : path.conditions[key];
  if (known !== undefined && known !== value) return null;
  const next = clone(path);
  if (known === undefined) next.conditions[key] = value;
  return next;
}

function storyCandidatePaths({program, semantics, resolveDialogue, resolveUi}) {
  const commands = new Map((program?.commands || []).map(command => [command.cursor, command]));
  const paths = [];
  const visit = (cursor, path, seen) => {
    const command = commands.get(cursor);
    if (!command || seen.has(cursor)) {
      paths.push({...path, termination: seen.has(cursor) ? "loop" : "end", cursor});
      return;
    }
    const semantic = semantics.get(command.opcode) || {};
    const operation = semantic.operation;
    const operands = command.currentOperands || command.operands || [];
    path = {...path, cursors: [...path.cursors, cursor]};
    const nextSeen = new Set([...seen, cursor]);
    const normal = (cursor + command.normal_advance) & 255;
    const branch = storyBranchCondition(command, semantic);
    if (branch) {
      const key = branch.key === "result" ? path.resultKey || "result" : branch.key;
      for (const value of [branch.jumpWhen, !branch.jumpWhen]) {
        const next = constrain(path, key, value);
        if (!next) continue;
        const jump = value === branch.jumpWhen;
        const target = jump ? branch.jump : branch.normal;
        next.decisions.push({cursor, key, value, label: branch.label, jump, target});
        if (operation === "find-party-item-and-branch" || operation === "grant-party-item-and-branch") {
          next.resultKey = null;
          next.values.result = !value;
        }
        visit(target, next, nextSeen);
      }
      return;
    }
    if (operation === "set-event-flag" || operation === "clear-event-flag")
      path.values[`flag:${operands[0]}`] = operation === "set-event-flag";
    if (operation === "restore-party-member-health") path.values[`alive:${operands[0]}`] = true;
    if (operation === "clear-runtime-party-slot") path.values[`present:${operands[0]}`] = false;
    if (operation === "dispatch-interaction-service" && operands[0] >= 16) {
      path.resultKey = `service:${path.services.length}`;
      path.services.push({selector: operands[0], parameter: operands[1]});
    } else if (["start-blocking-dialogue", "start-blocking-ui-action", "dispatch-interaction-service", "start-event-selected-dialogue"].includes(operation)) {
      const emit = (input, flags) => {
        const ui = resolveUi(command, flags).blockingUi;
        const expand = choices => {
          let index = 0;
          let missing = false;
          const stages = resolveDialogue(ui.region_id, ui.record_id, () => {
            if (index === choices.length) {missing = true; index++; return 0;}
            return choices[index++];
          });
          if (missing) {expand([...choices, 0]); expand([...choices, 1]); return;}
          const next = clone(input);
          for (const stage of stages) {
            next.texts.push({handle: `record:${hex$2(stage.region_id)}:${String(stage.record_id).padStart(3, "0")}`, text: stage.text});
            for (const choice of stage.choices || []) {
              const key = `choice:${next.choices.length}`;
              next.conditions[key] = choice.value !== 0;
              next.choices.push(choice);
              next.values.result = choice.value !== 0;
              next.resultKey = null;
            }
          }
          if (semantic.terminates_script) paths.push({...next, termination: "dialogue", cursor});
          else visit(normal, next, nextSeen);
        };
        expand([]);
      };
      if (operation === "start-event-selected-dialogue") {
        const flag = operands[semantic.flag_operand_index];
        for (const value of [false, true]) {
          const next = constrain(path, `flag:${flag}`, value);
          if (next) emit(next, value ? new Set([flag]) : new Set());
        }
      } else emit(path, new Set());
      return;
    }
    if (operation === "relative-cursor-advance") visit((cursor + operands[0]) & 255, path, nextSeen);
    else if (!command.normal_advance || ["start-scripted-encounter", "enter-field-travel-service", "end-actor-script", "terminate-or-change-mode"].includes(operation)) {
      paths.push({...path, termination: operation, cursor});
    }
    else visit(normal, path, nextSeen);
  };
  if (program) visit(0, {conditions: {}, values: {}, cursors: [], decisions: [], texts: [], choices: [], services: []}, new Set());
  return paths;
}

function storyPathPreviewConditions(conditions, defaults, sceneId) {
  const result = {};
  const party = new Map();
  const member = slot => {
    if (!party.has(slot)) party.set(slot, {slot});
    return party.get(slot);
  };
  const flags = new Set(defaults.eventFlags || []);
  const acquired = new Set(defaults.investigationBits || []);
  for (const [key, value] of Object.entries(conditions)) {
    const [kind, number, second] = key.split(":");
    const id = Number(number);
    if (kind === "flag") {if (value) flags.add(id); else flags.delete(id); result.eventFlags = [...flags];}
    else if (kind === "acquired") {if (value) acquired.add(id); else acquired.delete(id); result.investigationBits = [...acquired];}
    else if (kind === "present") member(id).state = value ? (conditions[`alive:${id}`] === false ? "dead" : "present") : "absent";
    else if (kind === "alive") {
      const original = defaults.partyMembers?.find(row => row.slot === id);
      if (!Object.hasOwn(conditions, `present:${id}`))
        member(id).state = value ? (defaults.partySlots?.includes(id) ? "present" : "absent") : "dead";
      member(id).status = value ? 0 : 255;
      if (original?.currentHp !== undefined) member(id).currentHp = original.currentHp;
    } else if (kind === "riding") result.ridingVehicle = value;
    else if (kind === "money") result.money = value ? id : Math.max(0, id - 1);
    else if (kind === "level" || kind === "hp") for (const row of defaults.partyMembers || []) {
      member(row.slot)[kind === "level" ? "level" : "currentHp"] = value ? id : Math.max(0, id - 1);
      member(row.slot).state = "present";
    } else if (kind === "choice") (result.choices ||= [])[id] = value ? 1 : 0;
    else if (kind === "service") (result.serviceResults ||= [])[id] = value ? 1 : 0;
    else if (kind === "result") result.runtimeResultD5 = value ? 1 : 0;
    else if (kind === "target") result.fieldUiTarget = value ? 0 : 255;
    else if (kind === "position") {result.playerMapX = value ? id : (id + 1) & 255; result.playerMapY = Number(second);}
    else if (kind === "direction") result.playerDirection = ["up", "down", "left", "right"][value ? id & 3 : (id + 1) & 3];
    else if (kind === "rectangle") {result.playerMapX = value ? id : Number(second); result.playerMapY = Number(key.split(":")[3]);}
    else if (kind === "object") (result.objectScenes ||= {})[id] = value ? sceneId : 255;
    else if (kind === "descriptor") {
      const descriptors = new Set(result.partyDescriptors || defaults.partyDescriptors || []);
      if (value) descriptors.add(id); else descriptors.delete(id);
      result.partyDescriptors = [...descriptors];
    } else if (kind === "item") {
      result.partyInventories ||= (defaults.partyInventories || Array.from({length: 3}, () => Array(8).fill(0))).map(row => [...row]);
      for (const row of result.partyInventories) for (let index = 0; index < row.length; index++) if (row[index] === id) row[index] = 0;
      if (value) {result.partyInventories[0][0] = id; member(0).state = "present";}
    } else if (kind === "item-space") {
      result.partyInventories = Array.from({length: 3}, () => Array(8).fill(value ? 0 : 1));
      member(0).state = "present";
    }
  }
  if (party.size) result.party = [...party.values()];
  return result;
}

// @editor-module 剧情玩家操控区段与实际等待条件的投影。
function storyPlayerSegments(compiled) {
  const frames = compiled.frames || [];
  const segments = [];
  for (let start = 0; start < frames.length; start += 1) {
    const snapshot = frames[start];
    const released = snapshot.actors?.find(actor => actor.currentCommand?.operation === "toggle-player-control-lock"
      && actor.currentCommand.controlLock === 0);
    if (!released || snapshot.controlLock !== 0 || frames[start - 1]?.controlLock === 0) continue;
    let end = start + 1;
    while (end < frames.length && frames[end].controlLock === 0
      && frames[end].sceneId === snapshot.sceneId) end += 1;
    const conditions = new Map();
    for (let frame = start; frame < end; frame += 1) {
      for (const actor of frames[frame].actors || []) {
        const command = actor.currentCommand;
        const condition = command?.playerCondition;
        if (!condition) continue;
        const {satisfied, ...predicate} = condition;
        const key = `${frames[frame].variantId}:${actor.actorSlot}:${actor.scriptKind}:${actor.scriptId}:${command.cursor}`;
        if (!conditions.has(key) && !satisfied) conditions.set(key, {
          key, condition: predicate, actorSlot: actor.actorSlot, variantId: frames[frame].variantId,
          scriptKind: actor.scriptKind, programId: actor.scriptId, command,
          start: frame, satisfiedAt: null,
        });
        const wait = conditions.get(key);
        if (wait && satisfied && wait.satisfiedAt === null) wait.satisfiedAt = frame;
      }
    }
    const waits = [...conditions.values()];
    const regions = waits.filter(wait => wait.condition.kind !== "event-flag");
    const trigger = (regions.length ? regions : waits).filter(wait => wait.satisfiedAt !== null)
      .sort((a, b) => a.satisfiedAt - b.satisfiedAt)[0];
    // 操控返回的最终帧没有自由移动区段。
    if (end === start + 1 && !waits.length) continue;
    if (end === frames.length && compiled.controlReturned && !regions.length) continue;
    segments.push({id: `player:${start}`, start, end: trigger?.satisfiedAt ?? end,
      sceneId: snapshot.sceneId, variantId: snapshot.variantId,
      release: {actorSlot: released.actorSlot, scriptKind: released.scriptKind,
        programId: released.scriptId, command: released.currentCommand},
      waits, regions, trigger, resumed: end < frames.length,
      inputs: snapshot.previewFieldInputs || []});
    start = end - 1;
  }
  return segments;
}

function storyPlayerRegion(condition) {
  return condition.kind === "player-position"
    ? {left: condition.x, right: condition.x + 1, top: condition.y, bottom: condition.y + 1}
    : condition.kind === "player-rectangle" ? condition : null;
}

function storyPlayerConditionLabel(condition) {
  return condition.kind === "event-flag" ? "触发：满足事件条件" : "触发：玩家进入区域";
}

// @editor-module 结局画面引用公共界面状态与当帧运行数据。

const ENDING_CREDITS_SCREEN_ID =
  "ui-screen:interface:ending-credits:state:ending-credits.credits-page";
const ENDING_MESSAGE_SCREEN_ID =
  "ui-screen:interface:ending-credits:state:ending-credits.message";
const WANTED_POSTER_SCREEN_ID =
  "ui-screen:interface:wanted-information:state:wanted-information.poster";

function storyInterfaceState(snapshot = {}) {
  const dialogue = snapshot.dialogue;
  if (dialogue?.operation === "start-blocking-ui-action") return {
    label: "界面窗口", operation: dialogue.operation,
    text: {region: dialogue.regionId, record: dialogue.recordId},
  };
  const operation = snapshot.endingOperation;
  if (!operation || operation === "actor-list-vm") return null;
  const record = dialogue && Number.isInteger(dialogue.regionId)
    ? `record:${dialogue.regionId.toString(16).toUpperCase().padStart(2, "0")}:${String(dialogue.recordId).padStart(3, "0")}`
    : null;
  const wanted = snapshot.endingWantedTargetId != null;
  const textScreen = record ? operation === "ending-credits-record"
    ? ENDING_CREDITS_SCREEN_ID : ENDING_MESSAGE_SCREEN_ID : null;
  const screen = dialogue?.uiScreenId || (wanted ? WANTED_POSTER_SCREEN_ID : textScreen);
  if (!screen && !dialogue) return null;
  return {stage: snapshot.endingStageId, label: snapshot.endingStageLabel, operation,
    screen, textScreen: wanted ? textScreen : null,
    context: dialogue?.uiPreviewContext || (record ? {record, page_index: dialogue.pageIndex} : null),
    target: snapshot.endingWantedTargetId ?? null, defeated: snapshot.endingWantedDefeated,
    text: record ? {region: dialogue.regionId, record: dialogue.recordId} : null};
}

const runtimeFrames = new WeakMap();

function storyInterfaceRuntime(compiled, frame) {
  let sources = runtimeFrames.get(compiled);
  if (!sources) {
    sources = (compiled.frames || []).flatMap((snapshot, index) =>
      snapshot.partyMembers || snapshot.vehicles ? [{snapshot, index}] : []);
    runtimeFrames.set(compiled, sources);
  }
  return sources.findLast(source => source.index <= frame)?.snapshot || {};
}

// @editor-module 剧情逐帧状态驱动与对象轨的投影。

const omitted = value => value === undefined || typeof value === 'function' || typeof value === 'symbol';
function same(left, right) {
  if (left === right) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object'
      || left.toJSON || right.toJSON) return JSON.stringify(left) === JSON.stringify(right);
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    for (let index = 0; index < left.length; index += 1) {
      if (index in left && left[index] !== right[index] && !same(omitted(left[index]) ? null : left[index],
        omitted(right[index]) ? null : right[index])) return false;
    }
    return true;
  }
  const keys = Object.keys(left), otherKeys = Object.keys(right);
  let matchingKeys = keys.length === otherKeys.length;
  for (let index = 0; matchingKeys && index < keys.length; index += 1)
    matchingKeys = keys[index] === otherKeys[index];
  if (matchingKeys) {
    for (const key of keys) if (!same(left[key], right[key])) return false;
    return true;
  }
  const leftKeys = keys.filter(key => !omitted(left[key]));
  const rightKeys = otherKeys.filter(key => !omitted(right[key]));
  return leftKeys.length === rightKeys.length && leftKeys.every((key, index) => key === rightKeys[index]
    && same(left[key], right[key]));
}
const hex$1 = value => Number(value).toString(16).toUpperCase().padStart(2, "0");
const actorId = (shot, actor) => actor.fieldEntityIndex !== undefined
  ? `${shot.id}:object:entity:${actor.fieldEntityIndex}`
  : actor.partySlot == null ? `${shot.id}:object:actor:${actor.actorSlot}`
    : `${shot.id}:object:party:${actor.partySlot}`;

// 字段与处理器的对应只用于连接已有脚本键；运行时变化不倒推脚本操作数。
const operations = {
  scene: ["switch-scene-inside-story-state", "set-story-state", "replace-runtime-entity-scene"],
  camera: ["drive-scripted-input", "switch-scene-inside-story-state", "set-story-state"],
  scroll: ["advance-global-screen-effect"],
  lock: ["toggle-player-control-lock"], input: ["drive-scripted-input"],
  dialogue: ["start-blocking-dialogue", "start-blocking-ui-action", "start-event-selected-dialogue"],
  flag: ["set-event-flag", "clear-event-flag"],
  position: ["set-actor-position", "set-packed-camera-relative-position", "move-actor-to-position",
    "attempt-tile-step", "drive-scripted-input", "follow-rom-waypoint-loop", "step-by-rom-direction-table",
    "step-toward-story-target", "step-toward-story-target-until-adjacent", "advance-wander-motion",
    "wander-inside-rectangle", "relocate-runtime-target", "transfer-actor-to-runtime-entity"],
  direction: ["set-direction", "face-opposite-runtime-direction", "set-runtime-entity-move-direction"],
  appearance: ["set-actor-type", "set-actor-type-animation-renderer", "set-direct-frame-id",
    "decrement-actor-type", "play-table-driven-actor-transformation"],
  visibility: ["remove-actor", "move-actor-off-map", "remove-actor-if-event-flag-set", "pop-story-actor-slot"],
  offset: ["play-render-slot-offset-sequence", "play-rom-recovery-effect"],
  motion: ["set-motion-attributes", "initialize-actor-motion-state"],
  tiles: ["mutate-field-tile-near-actor", "write-field-tile-at-actor", "refresh-field-state"],
  mode: ["terminate-or-change-mode", "end-story-state", "clear-story-state-and-mode",
    "enter-dedicated-field-mode", "end-story-state-with-scene-context", "start-scripted-encounter"],
  story: ["set-story-state", "end-story-state", "clear-story-state-and-mode", "start-scripted-encounter",
    "end-story-state-with-scene-context"],
  battle: ["start-scripted-encounter"], service: ["enter-field-travel-service"],
  parameters: ["set-global-parameter", "set-story-parameter", "set-dialogue-actor-parameter",
    "set-runtime-party-slot-index", "set-runtime-parameter-$9c", "set-runtime-parameter-$a2",
    "adopt-runtime-entity-state", "set-runtime-entity-move-direction"],
  result: ["find-party-item-and-branch", "grant-party-item-and-branch", "replace-party-item"],
  money: ["subtract-party-money"], inventory: ["replace-party-item", "grant-party-item-and-branch"],
  members: ["restore-party-member-health"], vehicles: ["park-selected-vehicle", "release-selected-vehicle"],
  party: ["join-party-and-remove-scene-actor", "clear-runtime-party-slot"],
  entities: ["push-temporary-field-entity", "clear-runtime-entity-render-slots"],
  execution: ["end-actor-script", "terminate-or-change-mode", "enter-dedicated-field-mode"],
  music: ["sound-command"], "music-status": ["sound-command"], "audio-fade": ["sound-command"],
};

function interfaceState(snapshot) {
  return storyInterfaceState(snapshot);
}

const emptyActors = [];
function sameDialogue(left, right) {
  if (left === right) return true;
  if (!left || !right) return false;
  return (left.regionId === right.regionId || same(left.regionId, right.regionId))
    && (left.recordId === right.recordId || same(left.recordId, right.recordId))
    && (left.pageIndex === right.pageIndex || same(left.pageIndex, right.pageIndex))
    && (left.lines === right.lines || same(left.lines, right.lines))
    && (left.prefixRecordId === right.prefixRecordId || same(left.prefixRecordId, right.prefixRecordId))
    && (left.interactionWindow === right.interactionWindow || same(left.interactionWindow, right.interactionWindow))
    && (left.operation === right.operation || same(left.operation, right.operation))
    && (left.uiScreenId === right.uiScreenId || same(left.uiScreenId, right.uiScreenId))
    && (left.uiPreviewContext === right.uiPreviewContext || same(left.uiPreviewContext, right.uiPreviewContext));
}
function sameDriverActor(actor, other) {
  return !(actor.actorSlot !== other.actorSlot
        || actor.partySlot !== other.partySlot
        || actor.fieldEntityIndex !== other.fieldEntityIndex
        || actor.x !== other.x
        || actor.y !== other.y
        || actor.direction !== other.direction
        || actor.actorType !== other.actorType
        || actor.renderMode !== other.renderMode
        || actor.palette !== other.palette
        || actor.hidden !== other.hidden
        || actor.screenOffsetX !== other.screenOffsetX
        || actor.screenOffsetY !== other.screenOffsetY
        || actor.motionAttributes !== other.motionAttributes
        || actor.ended !== other.ended
        || actor.blocked !== other.blocked);
}
function sameDriverActors(left, right) {
  return left.length === right.length && left.every((actor, index) => sameDriverActor(actor, right[index]));
}
function sameDriverGlobals(left, right) {
  return (left.sceneId === right.sceneId || same(left.sceneId, right.sceneId))
    && (left.actorListId === right.actorListId || same(left.actorListId, right.actorListId))
    && (left.playerMapX === right.playerMapX || same(left.playerMapX, right.playerMapX))
    && (left.playerMapY === right.playerMapY || same(left.playerMapY, right.playerMapY))
    && (left.cameraTileOriginX === right.cameraTileOriginX || same(left.cameraTileOriginX, right.cameraTileOriginX))
    && (left.cameraTileOriginY === right.cameraTileOriginY || same(left.cameraTileOriginY, right.cameraTileOriginY))
    && (left.cameraKnown === right.cameraKnown || same(left.cameraKnown, right.cameraKnown))
    && (left.screenScrollOffsetY === right.screenScrollOffsetY || same(left.screenScrollOffsetY, right.screenScrollOffsetY))
    && (left.fieldPresentation === right.fieldPresentation || same(left.fieldPresentation, right.fieldPresentation))
    && (left.endingFill === right.endingFill || same(left.endingFill, right.endingFill))
    && (left.backgroundAnimationPhase === right.backgroundAnimationPhase || same(left.backgroundAnimationPhase, right.backgroundAnimationPhase))
    && (left.controlLock === right.controlLock || same(left.controlLock, right.controlLock))
    && (left.scriptedInput === right.scriptedInput || same(left.scriptedInput, right.scriptedInput))
    && (left.mode === right.mode || same(left.mode, right.mode))
    && (left.storyState === right.storyState || same(left.storyState, right.storyState))
    && (left.battleEntry === right.battleEntry || same(left.battleEntry, right.battleEntry))
    && (left.fieldServiceEntry === right.fieldServiceEntry || same(left.fieldServiceEntry, right.fieldServiceEntry))
    && (left.runtimeResultD5 === right.runtimeResultD5 || same(left.runtimeResultD5, right.runtimeResultD5))
    && (left.fieldEntityCount === right.fieldEntityCount || same(left.fieldEntityCount, right.fieldEntityCount))
    && (left.temporaryEntityValue === right.temporaryEntityValue || same(left.temporaryEntityValue, right.temporaryEntityValue))
    && (left.parameters === right.parameters || same(left.parameters, right.parameters))
    && (left.partyMoney === right.partyMoney || same(left.partyMoney, right.partyMoney))
    && (left.partyInventories === right.partyInventories || same(left.partyInventories, right.partyInventories))
    && (left.partyEquipment === right.partyEquipment || same(left.partyEquipment, right.partyEquipment))
    && (left.partyMembers === right.partyMembers || same(left.partyMembers, right.partyMembers))
    && (left.vehicles === right.vehicles || same(left.vehicles, right.vehicles))
    && (left.runtimePartySlots === right.runtimePartySlots || same(left.runtimePartySlots, right.runtimePartySlots))
    && (left.fieldTiles === right.fieldTiles || same(left.fieldTiles, right.fieldTiles))
    && sameDialogue(left.dialogue, right.dialogue)
    && (left.variantId === right.variantId || same(left.dialogue, right.dialogue))
    && (left.eventFlags === right.eventFlags || same(left.eventFlags, right.eventFlags))
    && (left.endingOperation === right.endingOperation || same(left.endingOperation, right.endingOperation))
    && (left.endingStageId === right.endingStageId || same(left.endingStageId, right.endingStageId))
    && (left.endingStageLabel === right.endingStageLabel || same(left.endingStageLabel, right.endingStageLabel))
    && (left.endingWantedTargetId === right.endingWantedTargetId || same(left.endingWantedTargetId, right.endingWantedTargetId))
    && (left.endingWantedDefeated === right.endingWantedDefeated || same(left.endingWantedDefeated, right.endingWantedDefeated))
    && left.audioState?.currentMusicCommandId === right.audioState?.currentMusicCommandId
    && left.audioState?.musicStatus === right.audioState?.musicStatus
    && left.audioState?.fadeControlId === right.audioState?.fadeControlId;
}

function storySnapshotInterface(snapshot) {
  return interfaceState(snapshot || {});
}

function storyDriverTrace(compiled, {shots, commands}, actorsAt) {
  const drivers = [];
  const changes = [];
  const objects = new Map();
  const last = new Map();
  const actorValueKeys = new Map();
  let previous = new Map();
  const activeCommands = new Map();
  for (const run of commands) {
    if (!activeCommands.has(run.start)) activeCommands.set(run.start, []);
    activeCommands.get(run.start).push(run);
  }
  let active = [];
  const put = (values, objectId, group, property, label, value, runtimeSource, actor = null) => {
    const key = `${objectId}/${property}`;
    const old = previous.get(key);
    if (same(old?.value, value)) {
      if (old) {
        values.set(key, old);
      }
      return;
    }
    const item = {objectId, group, property, label, value, runtimeSource, actor};
    values.set(key, item);
  };
  const recordChanges = (values, snapshot, frame, shot) => {
    for (const [key, item] of values) {
      if (item.bookkeeping || item === previous.get(key)) continue;
      const before = previous.get(key)?.value;
      // 初值只列实际载入、显示和输入；其他字段须发生变化才成为驱动。
      if (frame === 0 && !["scene", "camera", "visibility", "dialogue", "lock", "input", "music", "music-status", "audio-fade", "field-fade"].includes(item.property)) continue;
      if (frame === 0 && (item.value == null || item.value === false)) continue;
      const sourceOperations = item.group === "interface" ? ["start-blocking-ui-action"] : operations[item.property] || [];
      const sourceCommand = active.findLast(run => sourceOperations.includes(run.operation)
        && (item.group !== "actor" || (run.actorSlot === item.actor?.actorSlot
          && run.variantId === snapshot.variantId))
        && (item.group !== "flags" || run.operands[0] === Number(item.objectId.split(":").at(-1))));
      const interfaceScreen = item.group === 'interface' ? item.value?.screen : null;
      const runtimeSource = interfaceScreen
        ? `${item.runtimeSource} / ${interfaceScreen}`
        : item.runtimeSource;
      const source = sourceCommand ? `script / ${sourceCommand.scriptKind}:${sourceCommand.programId} / ${sourceCommand.cursor}`
        : snapshot.endingOperation && snapshot.endingOperation !== "actor-list-vm"
          ? `${runtimeSource} / ${snapshot.endingStageId} / ${snapshot.endingOperation}` : runtimeSource;
      const change = {frame, objectId: item.objectId, property: item.property,
        before: before ?? null, value: item.value ?? null, source, commandId: sourceCommand?.id || null};
      changes.push(change);
      let driver = last.get(key);
      if (driver && driver.end === frame && driver.source === source && driver.command?.id === sourceCommand?.id) {
        driver.end = frame + 1;
        driver.value = item.value;
        driver.changes.push(change);
      } else {
        driver = {id: `driver:${frame}:${drivers.length}`, ...item, start: frame, end: frame + 1,
          shotId: shot.id, before, source, command: sourceCommand, changes: [change]};
        drivers.push(driver);
        last.set(key, driver);
      }
    }
  };
  const frames = compiled.frames || [];
  let previousSnapshot;
  let previousActors = [];
  let previousShot;
  let removedVisibility = false;
  const orderedShots = shots.every((shot, index) => index === 0 || shots[index - 1].start <= shot.start);
  let shotIndex = -1;
  frames.forEach((snapshot, frame) => {
    if (orderedShots) while (shotIndex + 1 < shots.length && shots[shotIndex + 1].start <= frame) shotIndex += 1;
    const shot = orderedShots ? shots[shotIndex] : shots.findLast(shot => shot.start <= frame);
    if (!shot) return;
    if (active.length) active = active.filter(run => frame < run.end);
    const starting = activeCommands.get(frame);
    if (starting) active.push(...starting);
    const currentActors = snapshot.actors?.length || snapshot.partyActors?.length || snapshot.temporaryEntities?.length
      ? actorsAt(snapshot) : emptyActors;
    const globalsUnchanged = previousSnapshot && previousShot === shot
      && sameDriverGlobals(previousSnapshot, snapshot);
    if (globalsUnchanged && sameDriverActors(previousActors, currentActors)) {
      if (removedVisibility) {
        const present = new Set(currentActors.map(actor => actorId(shot, actor)));
        for (const [key, item] of previous)
          if (item.group === 'actor' && !present.has(item.objectId)) previous.delete(key);
        removedVisibility = false;
      }
      // 淡入淡出单独变化时，只更新淡入淡出轨。
      if (!same(previousSnapshot.endingFadeOpacity, snapshot.endingFadeOpacity)) {
        const values = new Map();
        put(values, "object:camera", "camera", "fade", "淡入淡出", snapshot.endingFadeOpacity ?? 0,
          "buildStoryVmSequence / fadeOpacity");
        recordChanges(values, snapshot, frame, shot);
        for (const [key, item] of values) previous.set(key, item);
        for (const [key, item] of previous) {
          if (item.group === "flags" && !item.value
              && !(snapshot.eventFlags || []).includes(Number(item.objectId.split(":").at(-1)))) previous.delete(key);
        }
      }
      previousSnapshot = snapshot;
      previousActors = currentActors;
      return;
    }
    const values = new Map();
    const global = (group, property, label, value, source) => put(values, `object:${group}`, group,
      property, label, value, source);
    const field = snapshot.fieldDriver;
    const fieldSource = field?.kind === "scene-transition"
      ? `${field.owner} / transition:${hex$1(field.sourceSceneId)}:${hex$1(field.transitionId)} / ROM PRG ${[field.coordinateSource, field.targetSource].filter(Boolean).map(source => `$${hex$1(source.offset).padStart(6, "0")}`).join(" / ")} / (${field.sourceX},${field.sourceY}) → ${hex$1(field.destinationSceneId)} (${field.destinationX},${field.destinationY})`
      : field?.kind === "terrain-motion"
        ? `${field.owner} / ROM PRG $029034 / $0290E4 / $029116 / behavior $${hex$1(field.behaviorCode)} / ${field.direction} / (${field.x},${field.y}) / ${field.duration} 帧`
        : null;
    if (globalsUnchanged) {
      for (const [key, item] of previous) {
        if (item.group === "actor") continue;
        if (item.group === "flags" && !item.value
            && !(snapshot.eventFlags || []).includes(Number(item.objectId.split(":").at(-1)))) continue;
        values.set(key, item);
      }
      global("camera", "fade", "淡入淡出", snapshot.endingFadeOpacity ?? 0,
        "buildStoryVmSequence / fadeOpacity");
    } else {
      // 玩家落点只在加载帧显示；移动另归位置轨。
      const oldScene = previous.get("object:camera/scene");
      const scene = oldScene && oldScene.value.scene === snapshot.sceneId
        && oldScene.value.actorList === snapshot.actorListId ? oldScene.value
        : {scene: snapshot.sceneId, actorList: snapshot.actorListId,
          player: [snapshot.playerMapX, snapshot.playerMapY]};
      global("camera", "scene", "场景", scene, field?.kind === "scene-transition" ? fieldSource
        : "buildStoryVmVariant / settleTransition / scene initialiser");
      global("camera", "camera", "相机", [snapshot.cameraTileOriginX, snapshot.cameraTileOriginY,
        snapshot.cameraKnown], fieldSource
          || "buildStoryVmVariant / advancePreviewFieldInput / settleTransition");
      global("camera", "scroll", "滚屏", snapshot.screenScrollOffsetY ?? 0, "advance-global-screen-effect");
      global("camera", "fade", "淡入淡出", snapshot.endingFadeOpacity ?? 0, "buildStoryVmSequence / fadeOpacity");
      global("camera", "field-fade", "场景渐显", snapshot.fieldPresentation ? {
        phase: snapshot.fieldPresentation.phase, decrement: snapshot.fieldPresentation.paletteDecrement,
      } : null, "buildStoryVmVariant / fieldPresentation");
      global("camera", "fill", "底色", snapshot.endingFill ?? null, "buildStoryVmSequence / appendMachineStage");
      global("camera", "animation", "背景动画", snapshot.backgroundAnimationPhase ?? null,
        "advanceFieldChrAnimation");
      global("input", "lock", "操控锁", snapshot.controlLock, "buildStoryVmVariant / settleTransition");
      global("input", "input", "自动输入", snapshot.scriptedInput, "buildStoryVmVariant / drive-scripted-input");
      global("flow", "mode", "模式", snapshot.mode, "buildStoryVmVariant / requestTransition / settleTransition");
      global("flow", "story", "剧情状态", snapshot.storyState, "buildStoryVmVariant / requestTransition");
      global("flow", "battle", "战斗入口", snapshot.battleEntry ?? null, "start-scripted-encounter");
      global("flow", "service", "旅行入口", snapshot.fieldServiceEntry ?? null, "enter-field-travel-service");
      global("flow", "result", "运行结果", snapshot.runtimeResultD5, "buildStoryVmVariant / runtimeResultD5");
      global("flow", "entities", "实体槽", [snapshot.fieldEntityCount, snapshot.temporaryEntityValue],
        "buildStoryVmVariant / push-temporary-field-entity");
      global("flow", "parameters", "参数", snapshot.parameters, "buildStoryVmVariant / parameters");
      global("flow", "money", "金钱", snapshot.partyMoney, "subtract-party-money");
      global("flow", "inventory", "携带物", [snapshot.partyInventories, snapshot.partyEquipment],
        "STORY_PARTY_ITEM_OPERATIONS");
      global("flow", "members", "队伍状态", snapshot.partyMembers, "restore-party-member-health");
      global("flow", "vehicles", "战车状态", snapshot.vehicles, "buildStoryVmVariant / vehicles");
      global("flow", "party", "队伍槽", snapshot.runtimePartySlots, "buildStoryVmVariant / runtimePartySlots");
      global("camera", "tiles", "场景格", snapshot.fieldTiles || [], "sceneInteractionTileChanges / settleTransition");
      global("dialogue", "dialogue", "对话窗口", snapshot.dialogue ? {
        region: snapshot.dialogue.regionId, record: snapshot.dialogue.recordId,
        page: snapshot.dialogue.pageIndex, lines: snapshot.dialogue.lines,
        prefix: snapshot.dialogue.prefixRecordId, interaction: snapshot.dialogue.interactionWindow,
      } : null, "buildStoryVmVariant / activeDialogue / buildStoryVmSequence / dialogueForStage");
      global("interface", "visibility", "显隐", interfaceState(snapshot), "buildStoryVmSequence / appendMachineStage");
      global("audio", "music", "音乐", snapshot.audioState?.currentMusicCommandId ?? null,
        "applyStoryAudioEvent / advanceStoryAudioState");
      global("audio", "music-status", "播放状态", snapshot.audioState?.musicStatus ?? null,
        "applyStoryAudioEvent / advanceStoryAudioState");
      global("audio", "audio-fade", "音乐淡出", snapshot.audioState?.fadeControlId ?? null,
        "applyStoryAudioEvent / advanceStoryAudioState");
      const flags = new Set([...(snapshot.eventFlags || []), ...(previous.get("flags")?.value || [])]);
      for (const flag of flags) put(values, `object:flag:${flag}`, "flags", "flag", globalEventFlagHandle(flag),
        (snapshot.eventFlags || []).includes(flag), "buildStoryVmVariant / eventFlags / settleTransition");
      values.set("flags", {value: snapshot.eventFlags || [], bookkeeping: true});
    }
    const previousActorsById = new Map(previousShot === shot
      ? previousActors.map(actor => [actorId(shot, actor), actor]) : []);
    for (const actor of currentActors) {
      const id = actorId(shot, actor);
      const object = objects.get(id);
      if (!object || object.variantId !== snapshot.variantId || object.actorSlot !== actor.actorSlot
          || object.partySlot !== actor.partySlot || object.fieldEntityIndex !== actor.fieldEntityIndex)
        objects.set(id, {id, kind: "actor", shotId: shot.id, variantId: snapshot.variantId,
        start: shot.start, end: shot.end, actorSlot: actor.actorSlot, partySlot: actor.partySlot,
        fieldEntityIndex: actor.fieldEntityIndex,
        refs: [{variantId: snapshot.variantId, actorSlot: actor.actorSlot}]});
      const previousActor = previousActorsById.get(id);
      if (previousActor && sameDriverActor(previousActor, actor)) {
        let keys = actorValueKeys.get(id);
        if (!keys) {
          keys = ["position", "direction", "appearance", "visibility", "offset", "motion", "execution"]
            .map(property => `${id}/${property}`);
          actorValueKeys.set(id, keys);
        }
        for (const key of keys) {
          const item = previous.get(key);
          if (item) values.set(key, item);
        }
        continue;
      }
      const actorValue = (property, label, value, source) => put(values, id, "actor", property,
        label, value, source, actor);
      actorValue("position", "位置", [actor.x, actor.y], actor.partySlot != null && fieldSource
        ? fieldSource : "buildStoryVmVariant / actor.motion / advanceStoryFieldStep");
      actorValue("direction", "朝向", actor.direction, "buildStoryVmVariant / actor.direction");
      actorValue("appearance", "形象", [actor.actorType, actor.renderMode, actor.palette],
        "buildStoryVmVariant / actor rendering");
      actorValue("visibility", "显隐", !actor.hidden && (actor.renderMode === "type-animation" || actor.actorType !== 0),
        "buildStoryVmVariant / actor list / runtimePartySlots");
      actorValue("offset", "画面偏移", [actor.screenOffsetX || 0, actor.screenOffsetY || 0],
        "play-render-slot-offset-sequence / play-rom-recovery-effect");
      actorValue("motion", "运动属性", actor.motionAttributes, "buildStoryVmVariant / motionAttributes");
      actorValue("execution", "执行状态", [actor.ended, actor.blocked], "buildStoryVmVariant / actor dispatch");
    }
    removedVisibility = false;
    for (const [key, old] of previous) {
      if (old.group !== "actor" || values.has(key)) continue;
      if (old.property === "visibility" && old.value) {
        const actor = previousActors.findLast(actor => actorId(previousShot, actor) === old.objectId) || old.actor;
        put(values, old.objectId, old.group, old.property, old.label, false,
          "buildStoryVmVariant / actor list / settleTransition", actor);
        removedVisibility = true;
      }
    }
    recordChanges(values, snapshot, frame, shot);
    previous = values;
    previousSnapshot = snapshot;
    previousActors = currentActors;
    previousShot = shot;
  });
  // 界面显示键覆盖整个可见区段，隐藏键独立保留。
  const interfaces = drivers.filter(driver => driver.group === "interface");
  interfaces.forEach((driver, index) => {
    if (driver.value) driver.end = interfaces[index + 1]?.start ?? frames.length;
  });
  for (const event of compiled.audioEvents || []) {
    const command = commands.find(run => run.start === Number(event.frame)
      && run.programId === event.script_id && run.cursor === event.cursor
      && run.actorSlot === event.actor_slot && run.variantId === event.variant_id);
    drivers.push({
    id: `driver:audio:${drivers.length}`, group: "audio", objectId: "object:audio", property: "trigger",
    label: event.kind === "sound-effect" ? "音效" : event.kind === "fade-control" ? "音频控制" : "音乐命令",
    audioKind: event.kind, start: Number(event.frame), end: Number(event.frame) + 1,
    value: {command: `${event.kind === "fade-control" ? "audio-control" : "audio-command"}:${hex$1(event.command_id)}`, dispatch: event.dispatch},
    source: `applyStoryAudioEvent / ${event.dispatch}`, command, changes: [],
    });
  }
  for (const event of compiled.uiAutoInputs || []) drivers.push({
    id: `driver:confirm:${drivers.length}`, group: "input", objectId: "object:input", property: "confirm",
    label: "自动确认", start: Number(event.frame), end: Number(event.frame) + Math.max(1, Number(event.waitFrames) || 1),
    value: event, source: "buildStoryVmVariant / preview_input_policy", changes: [],
  });
  return {drivers, changes, objects: [...objects.values()]};
}

// @editor-module 剧情 VM 执行轨迹的三栏投影

const traces = new WeakMap();

function commandRuns(compiled) {
  const frames = compiled.frames || [];
  const active = new Map();
  const previousTerminal = new Map();
  const runs = [];
  const close = (actorKey, end) => {
    const run = active.get(actorKey);
    if (!run) return;
    active.delete(actorKey);
    const boundedEnd = Math.max(run.start + 1, Number(end) || 0);
    run.frames = boundedEnd - run.start;
    runs.push(run);
  };
  frames.forEach((snapshot, frame) => {
    const present = new Set();
    for (const actor of snapshot.actors || []) {
      const variantId = Number(snapshot.variantId);
      const actorSlot = Number(actor.actorSlot);
      const actorKey = `${variantId}:${actorSlot}`;
      present.add(actorKey);
      const command = actor.currentCommand;
      const scriptKind = String(actor.scriptKind || "autonomous");
      const programId = Number(actor.scriptId);
      const cursor = Number(command?.cursor);
      const opcode = Number(command?.opcode);
      if (!command || !Number.isInteger(programId)
          || !Number.isInteger(cursor) || !Number.isInteger(opcode)) {
        close(actorKey, frame);
        previousTerminal.delete(actorKey);
        continue;
      }
      const previous = active.get(actorKey) || previousTerminal.get(actorKey);
      const identity = previous?.scriptKind === scriptKind && previous.programId === programId
        && previous.cursor === cursor && previous.opcode === opcode ? previous.identity
        : `${scriptKind}:${programId}:${cursor}:${opcode}`;
      if (active.get(actorKey)?.identity !== identity) {
        close(actorKey, frame);
      }
      const terminal = Boolean(actor.ended || actor.blocked);
      if (terminal && previousTerminal.get(actorKey)?.identity === identity) {
        close(actorKey, frame);
        continue;
      }
      if (!terminal) previousTerminal.delete(actorKey);
      if (!active.has(actorKey)) {
        active.set(actorKey, {
          actorKey,
          actorSlot,
          variantId,
          scriptKind,
          programId,
          instructionId: command.instructionId,
          instructionSource: command.instructionSource,
          structureScriptId: command.structureScriptId,
          cursor,
          cursorHex: command.cursorHex,
          opcode,
          opcodeHex: command.opcodeHex,
          operation: command.operation,
          operands: command.operands || [],
          nextCursor: command.nextCursor,
          targetActor: command.targetActor,
          runtimeResult: command.runtimeResult,
          identity,
          start: frame,
        });
      }
      // 终止或阻塞命令只占终止帧，残留 currentCommand 不延长轨道。
      if (terminal) {
        const run = active.get(actorKey);
        close(actorKey, frame + 1);
        previousTerminal.set(actorKey, run);
      }
    }
    for (const actorKey of active.keys()) {
      if (!present.has(actorKey)) close(actorKey, frame);
    }
    for (const actorKey of previousTerminal.keys()) {
      if (!present.has(actorKey)) previousTerminal.delete(actorKey);
    }
  });
  const end = Math.max(frames.length, Number(compiled.duration) || 0);
  for (const actorKey of active.keys()) close(actorKey, end);
  return runs;
}


function storyExecutionTrace(compiled) {
  if (traces.has(compiled)) return traces.get(compiled);
  const actorFrames = new WeakMap();
  const actorsAt = snapshot => {
    let actors = actorFrames.get(snapshot);
    if (!actors) {
      actors = storySnapshotActors(snapshot);
      actorFrames.set(snapshot, actors);
    }
    return actors;
  };
  const playerSegments = storyPlayerSegments(compiled);
  const boundaries = new Map((compiled.shots || []).map(shot => [Number(shot.frame), shot]));
  for (const segment of playerSegments) {
    for (const [frame, label] of [[Math.min(segment.start + 1, segment.end), "玩家操控"],
      ...(segment.trigger ? [[segment.end, "触发续演"]] : [])]) {
      const snapshot = compiled.frames[frame];
      if (!snapshot) continue;
      boundaries.set(frame, {...boundaries.get(frame), frame, variantId: snapshot.variantId,
        sceneId: snapshot.sceneId, context: snapshot.context, label});
    }
  }
  const shots = [...boundaries.values()].sort((a, b) => a.frame - b.frame).map((shot, index, all) => ({
    ...shot,
    id: `shot:${index}:${Number(shot.variantId)}`,
    index,
    start: Number(shot.frame) || 0,
    end: Number(all[index + 1]?.frame ?? compiled.duration),
  }));
  const shotAt = frame => shots.findLast(shot => shot.start <= frame);
  const occurrences = new Map();
  const regularRuns = commandRuns(compiled);
  // 加载期间的指令归进场键，保留其操作数编辑入口。
  const initializationRuns = commandRuns({frames: compiled.frames?.[0]?.initializationFrames || []})
    .filter(run => !regularRuns.some(item => item.actorKey === run.actorKey && item.identity === run.identity))
    .map(run => ({...run, start: 0, frames: 1}));
  const orderedShots = shots.every((shot, index) => index === 0
    || shots[index - 1].start <= shot.start && shots[index - 1].end <= shot.end);
  const commands = [];
  for (const run of [...initializationRuns, ...regularRuns]) {
    const end = run.start + run.frames;
    let first = 0, limit = shots.length;
    while (orderedShots && first < limit) {
      const middle = (first + limit) >>> 1;
      if (shots[middle].end <= run.start) first = middle + 1;
      else limit = middle;
    }
    for (let index = first; index < shots.length && (!orderedShots || shots[index].start < end); index += 1) {
      const shot = shots[index];
      if (!(run.start < shot.end && end > shot.start)) continue;
      commands.push({...run, shotId: shot.id, start: Math.max(run.start, shot.start),
        end: Math.min(end, shot.end)});
    }
  }
  commands.sort((a, b) => a.start - b.start || a.actorSlot - b.actorSlot);
  commands.forEach((run, index) => {
    const key = `${run.actorKey}/${run.scriptKind}/${run.programId}/${run.instructionId}`;
    const occurrence = occurrences.get(key) || 0;
    occurrences.set(key, occurrence + 1);
    run.frames = run.end - run.start;
    run.id = run.instructionId ? `command:${key}/${occurrence}` : `command:${run.start}:${index}`;
  });
  const dialogues = shots.flatMap(shot => storyCompiledDialogueRuns(compiled,
    {start: shot.start, end: Math.min(shot.end, compiled.frames?.length || 0)}, true))
    .map((run, index) => {
      const source = compiled.frames[run.start].dialogue;
      const pages = source.pages ? source.pages.map(page => [...page]) : [];
      if (!pages.length) {
        for (let frame = run.start; frame < run.end; frame += 1) {
          const dialogue = compiled.frames[frame].dialogue;
          pages[dialogue.pageIndex || 0] = [...(dialogue.lines || [])];
        }
      }
      return {...run, id: `dialogue:${run.start}:${index}`, shotId: shotAt(run.start)?.id,
        dialogue: {...source, pages, text: source.text || pages.flat().join("\n")}};
    });
  const cameras = [];
  for (const shot of shots) {
    let previous = null;
    let previousSnapshot = null;
    for (let frame = shot.start; frame < shot.end; frame += 1) {
      const snapshot = compiled.frames[frame] || {};
      if (previousSnapshot && snapshot.sceneId === previousSnapshot.sceneId
          && snapshot.cameraKnown === previousSnapshot.cameraKnown
          && snapshot.cameraTileOriginX === previousSnapshot.cameraTileOriginX
          && snapshot.cameraTileOriginY === previousSnapshot.cameraTileOriginY) continue;
      const identity = JSON.stringify([snapshot.sceneId, snapshot.cameraKnown,
        snapshot.cameraTileOriginX, snapshot.cameraTileOriginY]);
      if (identity === previous) continue;
      if (cameras.at(-1)?.shotId === shot.id) cameras.at(-1).end = frame;
      cameras.push({id: `camera:${frame}:${cameras.length}`, start: frame,
        end: shot.end, shotId: shot.id, snapshot});
      previous = identity;
      previousSnapshot = snapshot;
    }
  }
  const audio = (compiled.audioEvents || []).map((event, index) => ({
    ...event, id: `audio:${event.frame}:${index}`, start: Number(event.frame) || 0,
    end: (Number(event.frame) || 0) + 1, shotId: shotAt(event.frame)?.id,
  }));
  const actors = shots.flatMap(shot => {
    const objects = new Map();
    const appeared = new Set();
    const commanded = new Set();
    for (let frame = shot.start; frame < shot.end; frame += 1) {
      const snapshot = compiled.frames[frame] || {};
      if (!snapshot.actors?.length && !snapshot.partyActors?.length && !snapshot.temporaryEntities?.length) continue;
      for (const source of snapshot.actors || []) {
        const target = source.currentCommand?.targetActor;
        if (!target) continue;
        const matches = actor => target.partySlot != null ? actor.partySlot === target.partySlot
          : actor.fieldEntityIndex === target.fieldEntityIndex;
        const actor = snapshot.partyActors?.find(matches) || snapshot.temporaryEntities?.find(matches);
        if (actor) commanded.add(storyActorObjectId(shot.id, actor));
      }
      for (const actor of actorsAt(snapshot)) {
        if (!actor.hidden) appeared.add(storyActorObjectId(shot.id, actor));
      }
      for (const actor of [...(snapshot.actors || []), ...(snapshot.partyActors || []),
          ...(snapshot.temporaryEntities || [])]) {
        const id = storyActorObjectId(shot.id, actor);
        if (actor.currentCommand) commanded.add(id);
        if (!objects.has(id)) objects.set(id, {id, kind: "actor", refs: [],
          shotId: shot.id, variantId: shot.variantId, start: shot.start, end: shot.end,
          partySlot: actor.partySlot, actorSlot: actor.actorSlot,
          fieldEntityIndex: actor.fieldEntityIndex});
        const object = objects.get(id);
        if (!object.refs.some(ref => ref.variantId === snapshot.variantId
            && ref.actorSlot === actor.actorSlot)) {
          object.refs.push({variantId: snapshot.variantId, actorSlot: actor.actorSlot});
        }
      }
    }
    return [...objects.values()].filter(actor => appeared.has(actor.id) || commanded.has(actor.id));
  });
  const stateDrivers = storyDriverTrace(compiled, {shots, commands}, actorsAt);
  const actorObjects = new Map(actors.map(actor => [actor.id, actor]));
  for (const object of stateDrivers.objects) if (!actorObjects.has(object.id)) actorObjects.set(object.id, object);
  const trace = {shots, commands, dialogues, cameras, audio, playerSegments,
    drivers: stateDrivers.drivers, driverChanges: stateDrivers.changes,
    objects: [...actorObjects.values(), {id: "object:dialogue", kind: "text"},
      {id: "object:interface", kind: "interface"},
      {id: "object:camera", kind: "camera"}, {id: "object:audio", kind: "audio"},
      ...(playerSegments.length ? [{id: "object:input", kind: "player-input"}] : [])]};
  traces.set(compiled, trace);
  return trace;
}

function storyActorObjectId(shotId, actor) {
  if (actor.fieldEntityIndex !== undefined) return `${shotId}:object:entity:${actor.fieldEntityIndex}`;
  return actor.partySlot === null || actor.partySlot === undefined
    ? `${shotId}:object:actor:${actor.actorSlot}` : `${shotId}:object:party:${actor.partySlot}`;
}

function storyTraceObjectAt(compiled, object, frame) {
  const snapshot = compiled.frames?.[frame] || {};
  if (object.kind !== "actor") return {snapshot};
  const withinShot = frame >= object.start && frame < object.end;
  const actor = withinShot ? storySnapshotActors(snapshot)
    .find(actor => storyActorObjectId(object.shotId, actor) === object.id) : null;
  return {snapshot, actor, withinShot};
}

// @editor-module 剧情预览条件、候选路径与分支键呈现。

const models = new WeakMap();
const hex = value => Number(value).toString(16).toUpperCase().padStart(2, "0");
const previews$1 = new Map();
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
  const cached = previews$1.get(entry.sequence.id);
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
  const declarations = new Map(programs.map(program => [program,
    new Map(program.commands.map(command => [command.cursor, command]).reverse())]));
  const model = {paths, conditions: [...conditions.values()], defaults, defaultConditions, sceneId: first.sceneId, baseline,
    declarations,
    programs: new Map(programs.map(program => [`${program.kind || "autonomous"}:${program.id}`, program])), semantics};
  previews$1.set(entry.sequence.id, {signature, model, document: state.project.text_record_edits});
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

function storyBranchPreviewMarkup(entry) {
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

function storyPreviewConditionChange(entry, key, value) {
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

function storyPreviewPath(entry, index) {
  const model = storyBranchModel(entry);
  const path = model.paths[index];
  return path && storyPathPreviewConditions(path.conditions, model.defaults, model.sceneId);
}

function storyBranchKeyMarkup(command, compiled) {
  const model = models.get(compiled);
  if (!model) return null;
  const program = model.programs.get(`${command.scriptKind}:${command.programId}`);
  const declaration = model.declarations.get(program)?.get(command.cursor);
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
  if (!declaration || !storyBranchCondition(command, semantic)) return null;
  const branch = storyBranchCondition({...declaration, ...command,
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

// @editor-module 剧情执行轨迹的对象列表与当前帧详情

const objectSourceIndexes = new WeakMap();
const objectPositionKeys = new WeakMap();
const objectInspectorControls = new WeakMap();

function objectInspectorControl(root, selector) {
  let controls = objectInspectorControls.get(root);
  if (!controls) objectInspectorControls.set(root, controls = new Map());
  const cached = controls.get(selector);
  if (cached?.isConnected && root.contains(cached)) return cached;
  const node = root.querySelector(selector);
  controls.set(selector, node);
  return node;
}

function syncObjectText(node, text) {
  if (!node || node.textContent === text) return;
  if (node.childNodes.length === 1 && node.firstChild.nodeType === globalThis.Node.TEXT_NODE) node.firstChild.nodeValue = text;
  else node.textContent = text;
}

function objectSourceIndex(context) {
  const cached = objectSourceIndexes.get(context);
  if (cached?.nodes === context.nodes && cached.trace === context.trace) return cached;
  const objects = new Map(context.trace.objects.map(object => {
    const sources = [...new Map(context.nodes.filter(node => node.kind === "actor" && node.parentId === object.shotId && object.refs?.some(ref =>
      Number(node.shot.variant_id) === ref.variantId && Number(node.actor.record_id) === ref.actorSlot))
      .map(node => [`${node.shot.variant_id}:${node.actor.record_id}`, node])).values()];
    const party = context.nodes.find(node => node.kind === "party-member"
      && node.partyMember.slot === object.partySlot);
    const fieldNodes = object.kind === "actor" ? sources : context.nodes.filter(node =>
      object.kind === "camera" ? ["camera", "camera-settings"].includes(node.kind)
        : object.kind === "text" && ["text", "script-text"].includes(node.kind));
    const fields = [...new Map(fieldNodes.flatMap(node => node.fields || []).map(field => [field.id, field])).values()];
    return [object.id, {sources, party, fields}];
  }));
  const index = {nodes: context.nodes, trace: context.trace, objects,
    nodesById: new Map(context.nodes.map(node => [node.id, node]))};
  objectSourceIndexes.set(context, index);
  return index;
}

function actorName(context, object, party, source) {
  if (object.fieldEntityIndex !== undefined) {
    return {label: '临时角色', nameSource: '现场实体槽'};
  }
  if (party) {
    const name = uiDialogueActorName(object.partySlot);
    return name ? {label: name.name, nameSource: `队伍身份 · ${name.source}`}
      : {label: party.label, nameSource: `队伍身份 · 槽 ${object.partySlot}`};
  }
  const handle = source && storyActorHandle(source.shot.variant_id, source.actor.record_id);
  const record = handle ? sceneActorRecord(handle) || {...source.actor, uid: handle} : source?.actor;
  if (state.project?.story?.npc_catalog?.records?.some(row => row.uid === record?.uid && row.label)) {
    return sceneActorName(record);
  }
  for (const run of context.trace.dialogues) {
    const dialogue = run.dialogue;
    if (dialogue.machineCodeOwned || !object.refs.some(ref =>
      ref.variantId === dialogue.sourceVariantId && ref.actorSlot === dialogue.actorSlot)) continue;
    const reference = `record:0C:${String(dialogue.prefixRecordId || 0).padStart(3, "0")}`;
    const label = dialogueSpeakerName(reference);
    if (label) return {label, nameSource: `说话人前缀 · ${reference}`};
  }
  return sceneActorName(record);
}

function storyObjectRows(context) {
  const index = objectSourceIndex(context).objects;
  return context.trace.objects.flatMap(object => {
    const {snapshot, actor, withinShot} = storyTraceObjectAt(context.entry.compiled, object, context.frame || 0);
    const {sources, party, fields} = index.get(object.id);
    const source = sources.find(node => Number(node.shot.variant_id) === snapshot.variantId) || sources[0];
    const variant = context.variantsById.get(object.kind === "actor" ? object.variantId : snapshot.variantId)
      || source?.variant || context.entry.variant;
    const appearance = actor ? {actor_type: actor.actorType, record_id: actor.actorSlot}
      : source?.actor || {actor_type: party?.partyMember.storyActorType};
    const name = object.kind === "actor" ? actorName(context, object, party, source)
      : {label: {text: "对话窗口", camera: "镜头／画面", audio: "音乐", interface: "界面", "player-input": "玩家操控"}[object.kind]};
    const {label} = name;
    const detail = object.kind === "actor" ? !withinShot ? "非当前幕" : actor ? `(${formatCoordinate(actor.x)}, ${formatCoordinate(actor.y)})${storyActorIsVisible(actor) ? "" : " · 隐藏"}` : "未出场"
      : object.kind === "text" ? snapshot.dialogue?.text || snapshot.dialogue?.lines?.join(" ") || (snapshot.dialogue ? "当前记录" : "隐藏")
      : object.kind === "camera" ? `(${snapshot.cameraTileOriginX ?? "—"}, ${snapshot.cameraTileOriginY ?? "—"})`
      : object.kind === "player-input" ? "预览模拟输入"
      : object.kind === "interface" ? storySnapshotInterface(snapshot)?.label || "隐藏"
      : snapshot.audioState?.currentMusicCommandId == null ? "未播放" : storyAudioLabel(snapshot.audioState.currentMusicCommandId);
    const audioHandle = snapshot.audioState?.currentMusicCommandId == null ? null
      : recordUid("audio-command", snapshot.audioState.currentMusicCommandId);
    const row = {...object, objectKind: object.kind, depth: 0, ...name, detail,
      detailMarkup: object.kind === "audio" && audioHandle
        ? storyResourceMarkup(audioHandle, detail, null) : null, actor, snapshot,
      sources, source, party, variant, appearance, fields,
      get thumbnail() {
        if (object.kind !== "actor") return "";
        if (!actor || actor.renderMode === "type-animation") return renderModuleComponent("actor-type", "preview", {
          ...(party ? actorAppearanceContextForParty(party.partyMember, variant, snapshot)
            : actorAppearanceContextForStory(appearance, variant, snapshot)),
          value: appearance.actor_type, compact: true, scale: 1, label,
        });
        return storyActorVisualMarkup({actor, record: source?.actor, variant, snapshot, label});
      }};
    if (object.kind !== 'text') return [row];
    const pages = context.nodes.filter(node => Number.isInteger(node.dialoguePage));
    return [row, ...pages.map(node => ({...row, id: node.id, depth: 1,
      label: node.label, detail: node.detail, fields: node.fields,
      dialoguePageNode: node, sources: [], source: node}))];
  });
}

function formatCoordinate(value) {
  return Number.isFinite(value) ? String(Number(value.toFixed(2))) : "—";
}

function eventList(nodes, selectedId = null) {
  return `<div class="story-object-events">${nodes.map(node => `<button type="button"
    class="story-object-event${node.id === selectedId ? " is-current" : ""}"
    data-story-object-event="${esc(node.id)}"><small>${Number.isInteger(node.start) ? `F${node.start}` : "未执行"}</small>
    <span>${handleTextMarkup(node.label)}</span></button>`).join("")}</div>`;
}

function sourceDetails(nodes) {
  return nodes.map(node => `<details class="story-object-source" data-story-object-source="${esc(node.id)}"><summary>${handleTextMarkup(node.label)}</summary><div data-story-object-source-body></div></details>`).join("");
}

function hydrateStoryObjectSources(root, context, renderSource, hydrate) {
  root.querySelectorAll("[data-story-object-source]").forEach(details => {
    const body = details.querySelector(":scope > [data-story-object-source-body]");
    if (!body || body.dataset.bound) return;
    body.dataset.bound = "true";
    const populate = () => {
      if (!details.open || body.dataset.loaded) return;
      const node = context.nodes.find(item => item.id === details.dataset.storyObjectSource);
      if (!node) return;
      body.innerHTML = renderSource(node);
      body.dataset.loaded = "true";
      hydrate(body);
    };
    details.addEventListener("toggle", populate);
    populate();
  });
}

function storyInspectorObject(context, id, rows = storyObjectRows(context)) {
  const object = rows.find(item => item.id === id);
  if (object) return object;
  const flag = /^object:flag:([0-9]+)$/u.exec(id || "");
  const kind = flag ? "flag" : {"object:flags": "flags", "object:input": "input",
    "object:flow": "flow"}[id];
  if (!kind) return null;
  const snapshot = context.entry.compiled.frames[context.frame || 0] || {};
  return {id, kind, label: flag ? globalEventFlagHandle(Number(flag[1]))
    : {flags: "事件位", input: "输入", flow: "流程"}[kind],
    flagId: flag ? Number(flag[1]) : null, snapshot, fields: [], sources: []};
}

function storyObjectInspector(context, object, renderSource, fixedMarkup = "") {
  if (object.dialoguePageNode) return renderSource(object.dialoguePageNode);
  const snapshot = object.snapshot;
  const frame = context.frame || 0;
  let current = "";
  let fixed = fixedMarkup;
  if (object.kind === "actor") {
    const actor = object.actor;
    const program = actor && storyBrowserVm().programs.find(program => program.id === actor.scriptId
      && (program.kind || "autonomous") === (actor.scriptKind || "autonomous"));
    fixed += `<dl class="story-inspector-fields"><dt>名称来源</dt><dd>${handleTextMarkup(object.nameSource)}</dd></dl>`;
    if (!fixedMarkup) fixed += "<p>运行时实体没有独立的 ROM 角色记录。</p>";
    current = actor ? `${scenePositionPickerMarkup({
      entries: context.project?.scenes?.editable_scenes || [], sceneId: snapshot.sceneId,
      x: actor.x, y: actor.y, coordinatesText: `${formatCoordinate(actor.x)}, ${formatCoordinate(actor.y)}`,
      label: "当前帧位置", disabled: true, componentAttributes: 'data-story-object-position',
    })}<dl class="story-inspector-fields">
      <dt>朝向</dt><dd data-story-object-direction>${esc({up: "上", down: "下", left: "左", right: "右"}[actor.direction] || actor.direction)}</dd>
      <dt>形象</dt><dd>${storyResourceMarkup(recordUid({
        "direct-actor-frame": "direct-frame", "generic-metasprite": "metasprite",
      }[actor.renderMode] || "actor-type", actor.actorType))} ${object.thumbnail}</dd>
      <dt>脚本</dt><dd>${actor.scriptId == null ? "—" : storyScriptMarkup(actor.scriptKind, actor.scriptId,
        program?.unwrittenOverflowBytes, {location: program?.scriptLocation, reason: program?.unwrittenReason})}</dd>
      <dt>当前指令</dt><dd data-story-object-command>${actor.currentCommand
        ? `${hex$4(actor.currentCommand.cursor, 2)} · ${esc(actor.currentCommand.operation || actor.currentCommand.opcodeHex)}` : "—"}</dd>
      <dt>显示</dt><dd data-story-object-visible>${storyActorIsVisible(actor) ? "可见" : "隐藏"}</dd></dl>`
      : `<p>${esc(object.detail)}</p>${object.thumbnail}`;
    if (object.party) current += `<label title="参与当前剧情预览：VM 按在队状态选择分支，舞台允许渲染">
      <input type="checkbox" data-story-party-render-slot="${Number(object.party.partyMember.slot)}"
        data-story-party-render-sequence="${esc(object.party.sequenceId)}"
        aria-label="渲染${esc(object.party.partyMember.name)}"${object.party.rendered ? ' checked' : ''}>
      参与预览</label><dl class="story-inspector-fields">
      <dt>乘车预览</dt><dd><select data-story-party-vehicle-slot="${Number(object.party.partyMember.slot)}"
        data-story-party-vehicle-sequence="${esc(context.entry.sequence.id)}" aria-label="乘车预览">
        <option value="">步行</option>${Array.from({length: 8}, (_, slot) =>
          `<option value="${slot}"${state.storyPartyPreviewVehicles.get(String(context.entry.sequence.id))
            ?.get(Number(object.party.partyMember.slot)) === slot ? " selected" : ""}>战车 ${slot + 1}</option>`).join("")}
      </select></dd>
    </dl>`;
  } else if (object.kind === "text") {
    fixed = `<dl class="story-inspector-fields"><dt>窗口</dt><dd>剧情对话窗口</dd>
      <dt>文字来源</dt><dd>文本记录</dd></dl>`;
    const currentNode = context.nodes.findLast(node => ["text", "interface-reference"].includes(node.kind)
      && node.start <= frame && frame < node.end);
    current = currentNode ? renderSource(currentNode, {currentState: true}) : "<p>隐藏</p>";
  } else if (object.kind === "camera") {
    current = `<dl class="story-inspector-fields"><dt>当前位置</dt><dd data-story-camera-current>${esc(object.detail)}</dd></dl>`;
  } else if (object.kind === "player-input") {
    const declared = context.entry.compiled.frames[0]?.previewFieldInputs || [];
    const inputs = declared.length ? declared : [{direction: "right", steps: 0, wait_for_release: true}];
    fixed = `<table title="预览假设；路线只改变预览，不写 ROM"><thead><tr><th>方向</th><th>步数</th></tr></thead><tbody>${inputs.map((input, index) =>
      `<tr><td><select data-story-player-input="direction" data-story-player-input-index="${index}">${Object.entries({up: "上", down: "下", left: "左", right: "右"}).map(([value, label]) =>
        `<option value="${value}"${input.direction === value ? " selected" : ""}>${label}</option>`).join("")}</select></td><td><input type="number" min="0" max="255" value="${input.steps}" data-story-player-input="steps" data-story-player-input-index="${index}" title="0：停住；不写 ROM"></td></tr>`).join("")}</tbody></table>
      <div><button type="button" class="button ghost" data-story-player-input="add" title="添加预览路线，不写 ROM">＋</button>
      <button type="button" class="button ghost" data-story-player-input="reset" title="重置预览路线，不写 ROM">↺</button></div>`;
    current = `${scenePositionPickerMarkup({entries: context.project?.scenes?.editable_scenes || [],
      sceneId: snapshot.sceneId, x: snapshot.playerMapX, y: snapshot.playerMapY,
      label: "玩家当前位置", disabled: true})}<div data-story-row-current></div>`;
  } else if (object.kind === "audio") {
    fixed = `<dl class="story-inspector-fields"><dt>资源来源</dt><dd>声音命令</dd></dl>`;
    current = `<dl class="story-inspector-fields"><dt>当前曲目</dt><dd>${object.detailMarkup ?? esc(object.detail)}</dd></dl>`;
  } else if (object.kind === "interface") {
    const interfaceState = storySnapshotInterface(snapshot);
    fixed = `<dl class="story-inspector-fields"><dt>对象</dt><dd>剧情界面</dd>
      <dt>来源</dt><dd>剧情界面构造</dd></dl>`;
    current = `<dl class="story-inspector-fields"><dt>界面</dt><dd>${esc(interfaceState?.label || "隐藏")}</dd>
      ${interfaceState?.screen ? `<dt>画面</dt><dd>${storyInterfaceMarkup(interfaceState)}</dd>` : ""}</dl>`;
  } else {
    fixed = `<dl class="story-inspector-fields"><dt>对象</dt><dd>${object.flagId === null
      ? esc(object.label) : storyResourceMarkup(recordUid("global-event-flag", object.flagId))}</dd>
      <dt>初值来源</dt><dd>剧情入口与运行现场</dd></dl>`;
    current = `<div data-story-row-current></div>`;
  }
  return `<article class="story-workbench-card" data-story-workbench-card="${esc(object.id)}">
    <header class="story-workbench-card-head"><h2>${object.labelMarkup ?? esc(object.label)}</h2></header>
    <section class="story-inspector-layer" data-story-object-fixed><h3>固定信息</h3>${fixed}</section>
    <section class="story-inspector-layer" data-story-object-current><h3 data-story-object-frame>当前状态 · F${frame}</h3>${current}</section>
  </article>`;
}

function storyObjectInspectorSources(context, object) {
  if (!object) return "";
  const frame = context.frame || 0;
  let sources = [];
  let commands = [];
  if (object.kind === "actor") {
    sources = [...object.sources, ...context.nodes.filter(node => node.kind === "script-text"
      && object.sources.some(source => source.id === node.parentId))];
    commands = context.nodes.filter(node => node.kind === "action" && node.shotId === object.shotId
      && object.refs.some(ref => ref.variantId === node.variantId && ref.actorSlot === node.actorSlot));
  } else if (object.kind === "text") {
    sources = context.nodes.filter(node => node.kind === "script-text");
    commands = context.nodes.filter(node => node.kind === "text");
  } else if (object.kind === "interface") {
    sources = context.nodes.filter(node => node.kind === "interface-reference" && node.stage);
    commands = context.nodes.filter(node => node.kind === "interface-reference" && !node.stage);
  } else if (object.kind === "camera") {
    sources = context.nodes.filter(node => ["sequence", "shot", "script-shot", "ending-stage", "party", "party-member"].includes(node.kind)
      || node.kind === "camera-settings" && !(node.start <= frame && frame < node.end));
    commands = context.nodes.filter(node => node.kind === "camera");
  } else if (object.kind === "player-input") {
    sources = context.nodes.filter(node => node.kind === "player-boundary");
    commands = sources;
  } else if (object.kind === "audio") commands = context.nodes.filter(node => node.kind === "audio");
  const current = commands.findLast(node => node.start <= frame && frame < node.end);
  let body = sourceDetails(sources) + `<h3>指令</h3>${eventList(commands, current?.id)}`;
  if (object.kind === "camera") body += `<h3>主角团队</h3>${context.nodes.filter(node => node.kind === "party-member").map(node => `<label>
    <input type="checkbox" data-story-party-render-slot="${node.partyMember.slot}"
      data-story-party-render-sequence="${esc(node.sequenceId)}"${node.rendered ? " checked" : ""}>${esc(node.label)}</label>`).join("")}`;
  const otherActors = [...new Map(context.nodes.filter(node => node.kind === "actor"
    && !context.trace.objects.some(item => item.shotId === node.parentId && item.refs?.some(ref =>
      ref.variantId === Number(node.shot.variant_id) && ref.actorSlot === Number(node.actor.record_id))))
    .map(node => [`${node.parentId}:${node.actor.record_id}`, {...node,
      label: `${context.nodes.find(item => item.id === node.parentId)?.label
        || recordUid("scene-actor-list", node.shot.variant_id)} · ${node.label}`}])).values()];
  if (otherActors.length) body += `<details class="story-object-source"><summary>本场景其他角色 · ${otherActors.length}</summary>${sourceDetails(otherActors)}</details>`;
  return body;
}

function storyObjectInspectorKey(context, object) {
  const actor = object.actor;
  const current = context.nodes.findLast(node => node.kind === object.kind
    && node.start <= context.frame && context.frame < node.end);
  return JSON.stringify([context.objectGeneration, object.id, object.label, object.nameSource, context.detailEventId,
    object.snapshot.sceneId, object.snapshot.variantId,
    actorAppearanceContextForStory(object.appearance, object.variant, object.snapshot).pair,
    actor ? [actor.actorType, actor.renderMode, actor.scriptKind, actor.scriptId] : null,
    ["actor", "camera"].includes(object.kind) ? null : [current?.id, object.detail],
    object.kind === "interface" ? storySnapshotInterface(object.snapshot) : null]);
}

function syncStoryObjectInspector(root, context, object) {
  const output = objectInspectorControl(root, "[data-story-object-frame]");
  const frameLabel = `当前状态 · F${context.frame}`;
  syncObjectText(output, frameLabel);
  const actor = object.actor;
  if (actor) for (const [selector, text] of [
    ["[data-story-object-direction]", {up: "上", down: "下", left: "左", right: "右"}[actor.direction] || actor.direction],
    ["[data-story-object-command]", actor.currentCommand
      ? `${hex$4(actor.currentCommand.cursor, 2)} · ${actor.currentCommand.operation || actor.currentCommand.opcodeHex}` : "—"],
    ["[data-story-object-visible]", storyActorIsVisible(actor) ? "可见" : "隐藏"],
  ]) {
    const value = objectInspectorControl(root, selector);
    syncObjectText(value, text);
  }
  const camera = objectInspectorControl(root, "[data-story-camera-current]");
  syncObjectText(camera, object.detail);
  const nodesById = objectSourceIndex(context).nodesById;
  root.querySelectorAll("[data-story-object-event]").forEach(button => {
    const node = nodesById.get(button.dataset.storyObjectEvent);
    const label = button.querySelector("span");
    if (node && label && label.textContent !== node.label) label.innerHTML = handleTextMarkup(node.label);
  });
  const picker = objectInspectorControl(root, "[data-story-object-position]");
  if (!picker || !object.actor) return;
  const {x, y} = object.actor;
  const key = [object.snapshot.sceneId, x, y, context.project?.scenes];
  const previous = objectPositionKeys.get(picker);
  if (previous && key.every((value, index) => value === previous[index])) return;
  objectPositionKeys.set(picker, key);
  picker.dataset.scenePositionSceneId = String(object.snapshot.sceneId);
  picker.dataset.scenePositionX = String(x);
  picker.dataset.scenePositionY = String(y);
  syncScenePositionPicker(picker, {entries: context.project?.scenes?.editable_scenes || [],
    sceneId: object.snapshot.sceneId, x, y});
  const coordinates = picker.querySelector("[data-scene-position-current]");
  if (coordinates) {
    const text = `${formatCoordinate(x)}, ${formatCoordinate(y)}`;
    syncObjectText(coordinates, text);
    coordinates.hidden = false;
  }
}

function hydrateStoryObjectPosition(root) {
  root.querySelectorAll("[data-scene-position-picker]").forEach(picker => hydrateScenePositionPicker(picker));
}

function storyObjectForEvent(context, event) {
  if (!event) return null;
  if (["player-input", "player-boundary"].includes(event.kind)) return "object:input";
  if (["text", "script-text"].includes(event.kind)) return "object:dialogue";
  if (event.kind === "interface-reference") return "object:interface";
  if (event.kind === "audio") return "object:audio";
  if (event.kind === "action") {
    const snapshot = context.entry.compiled.frames[event.start];
    const actor = snapshot?.actors?.find(actor => actor.actorSlot === event.actorSlot);
    return actor ? storyActorObjectId(event.shotId, actor) : null;
  }
  return "object:camera";
}

function highlightStoryObjectTracks(root, context, object) {
  root.closest("#content")?.querySelectorAll("[data-tl-lane]").forEach(lane => {
    lane.classList.remove("story-object-track-selected");
    lane.previousElementSibling?.classList.remove("story-object-track-selected");
  });
}

// @editor-module 剧情脚本指令的操作数控件与逐键重置。

function storyCommandByteBinding(command, programs, relativeIndex = 0) {
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

function storyCommandChoiceMarkup(command, semantics, programs) {
  const semantic = semantics.get(command.opcode);
  if (!["wait", "set-direction", "attempt-tile-step", "drive-scripted-input"].includes(semantic?.operation)) return "";
  const directions = {up: "上", down: "下", left: "左", right: "右"};
  const choices = [...semantics.values()].filter(item => item.operation === semantic.operation)
    .map(item => ({value: item.opcode, label: item.operation === "wait" ? `${item.frames} 帧`
      : directions[item.direction] || ["", "右", "左", "上", "下"][item.input_value]}));
  return `<div data-story-command-choice="${esc(JSON.stringify({...commandByteBinding(command, programs),
    choices, label: semantic.operation === "wait" ? "帧数" : "方向"}))}"></div>`;
}

async function hydrateStoryCommandChoices(root, database, onValue) {
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

function storyCommandFieldOperand(command, field, programs, semantics) {
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

function storyCommandOperandMarkup(command, program, fields = [], semantics = new Map(), programs = [], actorAppearance = {}) {
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

async function hydrateStoryCommandOperands(root, database, onValue, scenes = []) {
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

// @editor-module 连续单格移动的投影与脚本步数编辑。

function storyMovementGroups(commands) {
  const streams = new Map(), groups = new Map();
  for (const run of commands) {
    const key = `${run.shotId}/${run.actorKey}`;
    const previous = streams.get(key);
    if (run.operation !== 'attempt-tile-step' || !run.instructionId) {streams.delete(key); continue;}
    const adjacent = previous && previous.at(-1).programId === run.programId
      && previous.at(-1).scriptKind === run.scriptKind && previous.at(-1).opcode === run.opcode
      && previous.at(-1).cursor + 1 === run.cursor;
    const group = adjacent ? previous : [];
    group.push(run);
    streams.set(key, group);
    groups.set(run.id, group);
  }
  return groups;
}

function storyMovementInstructions(run, programs) {
  const program = programs.find(program => program.id === run.programId
    && (program.kind || 'autonomous') === run.scriptKind);
  const instructions = [];
  let cursor = run.cursor;
  while (program) {
    const command = program.commands.find(command => command.cursor === cursor);
    if (!command?.instructionId || command.opcode !== run.opcode || command.readWidth !== 1) break;
    instructions.push({...run, ...command, programId: run.programId, scriptKind: run.scriptKind});
    cursor += 1;
  }
  return instructions.length ? instructions : [run];
}

function changeStoryMovementSteps(asset, commandIds, count, createId) {
  if (!Number.isInteger(count) || count < 1) throw new TypeError('步数须为正整数');
  const assembled = assembleStoryScriptLayout(asset);
  const commands = commandIds.map(id => assembled.commands.find(command => command.id === id));
  const first = commands[0];
  if (!first || commands.some((command, index) => !command || command.width !== 1
      || command.opcode !== first.opcode || command.offset !== first.offset + index))
    throw new TypeError('移动指令已改变，请重新选择移动键');
  const scriptId = asset.layout.groups.find(group => group.id === first.group_id)?.script_id
    ?? asset.sequence.find(token => token.id === first.group_id)?.script_id;
  let current = asset;
  for (const command of commands.slice(count).reverse()) {
    current = {...current, sequence: changeStoryScriptSequence(current,
      {commandId: command.id, scriptId, action: 'delete'})};
  }
  let last = commands.at(-1).id;
  for (let index = commands.length; index < count; index += 1) {
    const id = createId();
    current = {...current, sequence: changeStoryScriptSequence(current,
      {commandId: last, scriptId, action: 'insert', after: true, bytes: [first.opcode], id})};
    last = id;
  }
  return current.sequence;
}

function storyMovementTimingChanges(before, after, edited) {
  const changed = new Map();
  const identities = runs => {
    const occurrences = new Map();
    return new Map(runs.map(run => {
      const key = `${run.actorKey}/${run.scriptKind}/${run.programId}/${run.instructionId}`;
      const occurrence = occurrences.get(key) || 0;
      occurrences.set(key, occurrence + 1);
      return [`${key}/${occurrence}`, run];
    }));
  };
  const originals = identities(before), currents = identities(after);
  const own = [...originals].filter(([, run]) => run.actorKey === edited.actorKey
    && run.scriptKind === edited.scriptKind && run.programId === edited.programId && run.start >= edited.start);
  for (const [identity, run] of originals) {
    if (run.actorKey === edited.actorKey) continue;
    const current = currents.get(identity);
    if (!current) continue;
    const simultaneous = own.filter(([, other]) => other.start === run.start
      || Math.max(other.start, run.start) < Math.min(other.end, run.end));
    for (const [otherIdentity, other] of simultaneous) {
      const next = currents.get(otherIdentity);
      if (next && (next.start - current.start !== other.start - run.start
          || next.end - current.end !== other.end - run.end)) {
        changed.set(current.id, `并行时机改变：与角色 ${other.actorSlot + 1} 的操作／后续键相对起点 ${other.start - run.start} → ${next.start - current.start} 帧，终点 ${other.end - run.end} → ${next.end - current.end} 帧`);
        break;
      }
    }
  }
  return changed;
}

// @editor-module 剧情脚本字段对象的连续移动方向与步数控件。

function storyMovementMarkup(command, semantics) {
  const runs = command.movementInstructions || command.movementRuns || [command];
  const choices = [...semantics.values()].filter(row => row.operation === 'attempt-tile-step')
    .map(row => ({value: row.opcode, label: {up: '上', down: '下', left: '左', right: '右'}[row.direction]}));
  return `<div data-story-movement="${esc(JSON.stringify({resourceId: `story-${command.scriptKind}-script`,
    commandIds: runs.map(run => run.instructionId), scriptId: command.structureScriptId,
    programId: command.programId, scriptKind: command.scriptKind, opcode: command.opcode, choices}))}"></div>`;
}

async function hydrateStoryMovement(root, database, onValue, beforeChange, programs) {
  for (const host of root.querySelectorAll('[data-story-movement]')) {
    if (host.dataset.ready) continue;
    host.dataset.ready = 'true';
    const props = JSON.parse(host.dataset.storyMovement);
    const object = await database.getFieldObject(props.resourceId, `${props.resourceId}:pool`);
    const field = object.fields.find(field => field.fieldName === 'sequence');
    if (!host.isConnected) continue;
    host.innerHTML = `<label class="story-command-operand">方向 <select data-story-movement-direction aria-label="方向">${props.choices.map(choice =>
      `<option value="${choice.value}"${choice.value === props.opcode ? ' selected' : ''}>${choice.label}</option>`).join('')}</select></label>
      <label class="story-command-operand">步数 <input data-story-movement-steps aria-label="步数" type="number" min="1" step="1" value="${props.commandIds.length}"></label>
      ${resetToOriginalButton(props.scriptId, {title: '重置脚本', attributes: {'data-story-movement-reset': ''}})}
      <p role="status" data-story-movement-error hidden></p>`;
    const controls = [...host.querySelectorAll('input,select,button')];
    const {value: initial} = await database.readResource(props.resourceId);
    const scriptObjects = await Promise.all(storyScriptResetOwners(initial, props.scriptId).map(id =>
      database.getFieldObject(props.resourceId, `${props.resourceId}:script:${id.toString(16).toUpperCase().padStart(2, '0')}`)));
    const resetFields = scriptObjects.flatMap(object => object.fields);
    const resetButton = host.querySelector('[data-story-movement-reset]');
    let busy = false;
    const syncReset = () => applyResetToOriginalStates(host, new Map([[String(props.scriptId),
      resetFields.some(field => field.hasOverride) || !canonicalJsonEqual(field.value,
        resetStoryScriptSequence({...initial, sequence: field.value}, props.scriptId))]]), {busy});
    for (const member of [field, ...resetFields]) member.bind(resetButton, syncReset);
    const errorHost = host.querySelector('[data-story-movement-error]');
    const currentInstructions = () => {
      const current = programs();
      const program = current.find(program => program.id === props.programId
        && (program.kind || 'autonomous') === props.scriptKind);
      const first = program?.commands.find(command => command.instructionId === props.commandIds[0]);
      if (!first || !props.choices.some(choice => choice.value === first.opcode))
        throw new TypeError('移动指令已改变，请重新选择移动键');
      return storyMovementInstructions({...first, programId: props.programId, scriptKind: props.scriptKind}, current);
    };
    const edit = async control => {
      errorHost.hidden = true;
      busy = true;
      controls.forEach(input => input.disabled = true);
      try {
        const {value: asset} = await database.readResource(props.resourceId);
        const version = field.version;
        if (control.hasAttribute('data-story-movement-reset')) {
          beforeChange(props.commandIds[0]);
          await database.writeFields([{field, value: resetStoryScriptSequence(asset, props.scriptId)},
            ...resetFields.map(field => ({field, reset: true}))], {expectedVersion: version});
        } else if (control.hasAttribute('data-story-movement-steps')) {
          const ids = currentInstructions().map(command => command.instructionId);
          const sequence = changeStoryMovementSteps(asset, ids, Number(control.value), () => `insert-${crypto.randomUUID()}`);
          beforeChange(props.commandIds[0]);
          await field.set(sequence, {expectedVersion: version});
        } else {
          const opcode = Number(control.value);
          if (!props.choices.some(choice => choice.value === opcode)) throw new TypeError('移动方向无效');
          const values = new Map();
          const sequence = structuredClone(field.value);
          const assembled = assembleStoryScriptLayout(asset);
          for (const instruction of currentInstructions()) {
            const id = instruction.instructionId;
            const command = assembled.commands.find(command => command.id === id);
            if (command.source_offset === undefined) sequence.find(token => token.id === command.group_id).bytes[0] = opcode;
            else {
              const binding = storyCommandByteBinding(instruction, programs());
              const owner = await database.getFieldObject(binding.resourceId, binding.handle);
              const bytecode = owner.fields.find(field => field.fieldName === 'bytecode');
              if (!values.has(bytecode)) values.set(bytecode, [...bytecode.value]);
              values.get(bytecode)[binding.byteIndex] = opcode;
            }
          }
          beforeChange(props.commandIds[0]);
          await database.writeFields([{field, value: sequence}, ...[...values].map(([field, value]) => ({field, value}))], {expectedVersion: version});
        }
        await onValue(props.resourceId);
        if (host.isConnected) {
          const current = currentInstructions();
          host.querySelector('[data-story-movement-steps]').value = current.length;
          host.querySelector('[data-story-movement-direction]').value = current[0].opcode;
        }
      } catch (error) {errorHost.textContent = error.message; errorHost.hidden = false;}
      finally {busy = false; controls.forEach(input => input.disabled = false); syncReset();}
    };
    controls.forEach(control => control.addEventListener(control.tagName === 'BUTTON' ? 'click' : 'change', () => {host.editCompletion = edit(control);}));
  }
}

// @editor-module 剧情工作台布局与侧栏



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
const actorRecordIndexes = new WeakMap();

function storyWorkbenchMountState() {
  return {context: openingWorkbenchContext, selected: selectedOpeningElementId,
    textEditor: openingTextEditorController};
}

function restoreStoryWorkbenchMount({context, selected, textEditor}) {
  openingWorkbenchContext = context;
  selectedOpeningElementId = selected;
  openingTextEditorController = textEditor;
}

function storyEditableWorkbenchView(view = state.view) {
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
  const records = document_?.records;
  if (!records) return new Map();
  let index = actorRecordIndexes.get(records);
  if (!index) {
    index = new Map(records.map(record => [String(record.uid), record]));
    actorRecordIndexes.set(records, index);
  }
  return index;
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
      variant_id: runtimeShot.variantId, variant_id_hex: hex$4(runtimeShot.variantId, 2),
      scene_id: runtimeShot.sceneId, scene_id_hex: hex$4(runtimeShot.sceneId, 2),
      scene_name: runtimeShot.context?.name || runtimeShot.label,
      story_state: snapshot.storyState ?? variant?.selection?.story_state ?? 0,
      story_state_hex: hex$4(snapshot.storyState ?? variant?.selection?.story_state ?? 0, 2),
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
        detail: `MODE ${hex$4(stage.mode, 2)} · ${Math.max(
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
        shot.story_state_hex || hex$4(shot.story_state, 2)} · ${actors.length} 个角色`,
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
      label: `角色 ${run.actorSlot + 1} · ${run.operation || hex$4(run.opcode, 2)}`,
      detail: `F${run.start}–${run.end - 1} · ${storyScriptHandle(run.scriptKind, run.programId)} · cursor ${hex$4(run.cursor, 2)}`,
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
      detail: `F${event.start} · ${event.kind} · ${event.kind === "fade-control" ? event.label || "" : storyAudioLabel(event.command_id)}`,
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
    nodes: nodes.map(node => ({...node, labelMarkup: esc(node.treeLabel || node.label), detail: '', detailMarkup: ''})),
    types: EDITABLE_STORY_ELEMENT_TREE_TYPES,
    showIcons: false,
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
  };
}

function openingObjectTreeRows(context) {
  const rows = storyObjectRows(context);
  const current = context.trace.shots.find(shot => shot.start <= (context.frame || 0)
    && (context.frame || 0) < shot.end);
  context.activeShotId = current?.id;
  return `<div class="story-object-shot-groups">${context.trace.shots.map(shot => {
      const actors = rows.filter(object => object.shotId === shot.id);
      const scene = context.project?.scenes?.editable_scenes?.find(scene => Number(scene.id) === shot.sceneId);
      const label = `第 ${shot.index + 1} 幕 · ${storyComponentLabel(scene?.name || storyShotLabel(shot.label) || '无场景')}`;
      const active = shot.id === current?.id;
      return `<details class="story-object-shot${active ? " is-current" : ""}"
        data-story-object-shot="${esc(shot.id)}">
        <summary title="${esc(label)}" aria-current="${active ? "true" : "false"}">
          <span>${esc(label)}</span></summary>
        ${actors.length ? elementTreeRows(openingElementTreeOptions(actors))
          : '<p class="story-object-shot-empty">无出场角色</p>'}</details>`;
    }).join("")}</div>
    <div class="story-object-global">${elementTreeRows(openingElementTreeOptions(
      rows.filter(object => object.kind !== "actor")))}</div>`;
}

function openingTreeMarkup(context) {
  const label = state.view === 'story-page' ? storyPageDefinitionForView(state.view)?.title || context.entry.label
    : storySequenceComponentLabel(context.entry.sequence.id, context.entry.label);
  return `<div class="element-tree">${elementTreeRows({
    nodes: [{id: STORY_ROOT_SELECTION, label}],
    selectedId: selectedOpeningElementId, showIcons: false,
    buttonAttributes: (_node, selected) => ({'data-story-workbench-root': '', 'aria-pressed': String(selected)}),
  })}</div><div>${storyPageAuthoringTreeMarkup()}
    <div class="story-workbench-tree-head"><h3>对象</h3></div>
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
    return `${values.map(value => hex$4(value, 2)).join(" ")} · ${values.join(", ")}`;
  }
  const value = values[0];
  const target = storyOperandReference(field, programs, storyVmSemanticsMap());
  if (target?.module === "text-record") return storyTextHandle(target.regionId, value);
  if (target) return recordUid(target.module === "scene-header-map" ? "scene" : target.module, value);
  const signed = field.encoding === "i8-in-u8"
    ? (value >= 0x80 ? value - 0x100 : value) : null;
  return `${hex$4(value, 2)} · ${value}${signed === null ? "" : `（有符号 ${signed}）`}`;
}

function hydrateStorySceneOperands(root) {
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
function storyEditableTimelineOperandFields({
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
  return `<dl class="story-inspector-fields">${node.runtimeResult ? `<dt>物品</dt><dd>${hex$4(node.runtimeResult.itemId, 2)}</dd>
      <dt>结果</dt><dd>${node.opcode === 0x39
        ? node.runtimeResult.d5 === 0 ? "持有" : "未持有"
        : node.opcode === 0x3A
          ? node.runtimeResult.replaced ? "已替换" : "背包外写入未预览"
        : node.runtimeResult.inserted ? "已放入" : "未放入"} · D5=${hex$4(node.runtimeResult.d5, 2)}</dd>
      ${node.runtimeResult.replacement === undefined ? ""
        : `<dt>替换物品</dt><dd>${hex$4(node.runtimeResult.replacement, 2)}</dd>`}
      ${node.runtimeResult.vehicleSlot === undefined ? ""
        : `<dt>战车槽</dt><dd>${hex$4(node.runtimeResult.vehicleSlot, 2)}</dd>`}
      ${node.runtimeResult.resultRecord === undefined ? ""
        : `<dt>返回记录</dt><dd>${hex$4(node.runtimeResult.resultRecord, 2)}</dd>`}
      <dt>下一游标</dt><dd>${hex$4(node.runtimeResult.nextCursor, 2)}</dd>` : ""}</dl>`;
}

function storyCommandActorAppearance(command) {
  const variant = storyVmAllActorLists().find(variant => Number(variant.id) === Number(command?.variantId))
    || openingWorkbenchContext.entry.variant;
  return actorAppearanceContextForStory(variant.actors?.find(actor => Number(actor.record_id) === Number(command?.actorSlot)), variant,
    openingWorkbenchContext.entry.compiled.frames[command?.start ?? openingWorkbenchContext.frame ?? 0]);
}

function storyTimelineCommandEditor(command, eventId = null, block = null) {
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

function hydrateStoryTimelineCommandEditor(root) {
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
    address === null ? "" : hex$4(address)}">
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
    if (originalValue) originalValue.innerHTML = handleTextMarkup(displayFieldBytes(original, field));
    if (currentValue) currentValue.innerHTML = handleTextMarkup(displayFieldBytes(current, field));
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
        <span>cursor ${esc(command.cursor_hex || hex$4(command.cursor, 2))}</span>
        <b>opcode ${esc(command.opcode_hex || hex$4(command.opcode, 2))}</b>
        <small>结构步长 ${Number(command.normal_advance) || 0}</small>
      </div>`).join("")}
    </details>
  </section>`;
}

function shotCardMarkup(node) {
  const shot = node.shot;
  return `<dl class="story-workbench-shot-facts">
    <div><dt>角色表</dt><dd>${handleMarkup(recordUid("scene-actor-list", shot.variant_id))}</dd></div>
    <div><dt>story state</dt><dd>${esc(shot.story_state_hex || hex$4(shot.story_state, 2))}</dd></div>
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
    <div><dt>专用模式</dt><dd>${esc(hex$4(stage.mode, 2))}</dd></div>
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
          {initialRecord: true, actorAppearance: actorAppearanceContextForStory(node.actor, node.variant,
            Number(node.shot.variant_id) === object.snapshot.variantId ? object.snapshot
              : context.entry.compiled.frames.find(frame => frame.variantId === Number(node.shot.variant_id)))})}</div>`).join("")}
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
    return node ? openingInspectorInner(context, node) : "";
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
      ...actorAppearanceContextForParty(member, node.variant, context.entry.compiled.frames[context.frame || 0]),
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
        ? "" : storyResourceMarkup(recordUid("actor-type", actorType))}</dd>
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
      <dt>命令</dt><dd>${hex$4(node.cursor, 2)} · ${hex$4(node.opcode, 2)}</dd>
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
        actorAppearance: actorAppearanceContextForStory(node.actor, node.variant, context.entry.compiled.frames[node.start || 0]),
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
      <h2>${node.labelMarkup ?? handleTextMarkup(node.label)}</h2>
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

function createEditableStoryWorkbench(entry, variantsById, renderStage, renderPlaybackPanel, toolbarMarkup, stageToolbarMarkup) {
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
    attributes: {'data-story-workbench-editable': entry.sequence.id}, toolbarMarkup, stageToolbarMarkup,
    treeTitle: null, treeClassName: 'story-browser story-workbench-tree-panel', treeScroll: 'body',
    treeMarkup: openingTreeMarkup(context), stageMarkup: renderStage(entry),
    inspectorTitle: null, inspectorClassName: 'story-inspector story-workbench-inspector',
    inspectorAttributes: {'data-story-workbench-inspector': ''},
    inspectorMarkup: `${storyPageAuthoringInspectorMarkup()}
      <div data-story-root-details${selectedOpeningElementId === STORY_ROOT_SELECTION ? '' : ' hidden'}>
      <p data-story-object-count>${context.trace.objects.length} 个对象</p>
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
  const shotCount = root.querySelector("[data-story-object-count]");
  if (shotCount) {
    shotCount.textContent = `${model.trace.objects.length} 个对象`;
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
      const field = db.peekField(SCENE_ACTORS_RESOURCE_ID, handle, name)
        || await db.getField(SCENE_ACTORS_RESOURCE_ID, handle, name);
      const object = db.peekFieldObject(SCENE_ACTORS_RESOURCE_ID, 'scene.actor.record-region')
        || await db.getFieldObject(SCENE_ACTORS_RESOURCE_ID, 'scene.actor.record-region');
      if (host.isConnected) mountFieldObjectReset(host, object.selectFields([field]));
      continue;
    }
    const fields = await getSceneActorFields(host.dataset.storyActorReset || host.dataset.storyActorMotion);
    const object = db.peekFieldObject(SCENE_ACTORS_RESOURCE_ID, 'scene.actor.record-region')
      || await db.getFieldObject(SCENE_ACTORS_RESOURCE_ID, "scene.actor.record-region");
    if (!host.isConnected) continue;
    if (host.hasAttribute("data-story-actor-motion"))
      await mountFieldObjectBitmask(host, object.selectFields(fields), "direction_attributes");
    else mountFieldObjectReset(host, object.selectFields(fields));
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

function syncStoryWorkbenchFrame(compiled, frame, preferredId = null, detailId = null) {
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
    const treeLabel = object.treeLabel || object.label;
    if (label && label.textContent !== treeLabel) label.textContent = treeLabel;
  }
  if (!target) return null;
  if (context.inspectorKey !== storyObjectInspectorKey(context, target) || previousId !== target.id || preferredId) {
    refreshOpeningSelection(root, {preserveEditor: previousId === target.id && !preferredId});
  }
  syncStoryObjectInspector(root, context, target);
  highlightStoryObjectTracks(root);
  return target;
}

function storyTimelineObjectLabels() {
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
  const {bindSceneBattleTestFormationEditor} = await import('./monster-formations-CNxDXbnT.js').then(function (n) { return n.battleBind; });
  if (context !== openingWorkbenchContext || !editor.isConnected) return;
  await bindSceneBattleTestFormationEditor(root, () => {
    if (context === openingWorkbenchContext && editor.isConnected) {
      refreshOpeningSelection(openingWorkbenchRoot());
    }
  });
}

function bindStoryWorkbench({refreshPlayback, refreshTimeline, seekPlayback} = {}) {
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
    const button = event.target.closest("[data-story-resume-wait], [data-story-clear-waits]");
    if (!button) return;
    const waitPanel = button.closest("[data-story-wait-preview]");
    if (!waitPanel) return;
    const sequenceId = waitPanel.dataset.storyWaitPreview;
    let results = state.storyExternalPreviewResults.get(sequenceId) || [];
    const entry = openingWorkbenchContext.entry;
    if (button.hasAttribute("data-story-clear-waits")) results = [];
    else {
      const waits = storyWaitingConditions(entry.compiled, {...state.project.story, browser_vm: storyBrowserVm()});
      const wait = waits.find(wait => wait.key === button.dataset.storyResumeWait);
      const selected = button.closest('[data-story-wait-key]').querySelector('[data-story-wait-result]').value;
      if (!wait || !selected) return;
      const coordinateInputs = button.closest('[data-story-wait-key]').querySelectorAll('[data-story-wait-coordinate]');
      if ([...coordinateInputs].some(input => !input.reportValidity())) return;
      const target = coordinateInputs.length ? Object.fromEntries([...coordinateInputs]
        .map(input => [input.dataset.storyWaitCoordinate, Number(input.value)])) : null;
      results = [...results.filter(result => result.key !== wait.key), storyWaitResult(wait, selected, target)];
    }
    state.storyExternalPreviewResults.set(sequenceId, results);
    storyVmCompilationCache.clear();
    storyVmSequenceCompilationCache.clear();
    state.storyCardFrame.set(Number(entry.variant.id), button.hasAttribute("data-story-clear-waits")
      ? 0 : Math.max(0, entry.compiled.frames.length - 1));
    if (!button.hasAttribute("data-story-clear-waits")) {
      state.storyCardPaused.delete(Number(entry.variant.id));
      state.storyPlaying = true;
    }
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
  const ready = [paintOpeningTextComponentCanvases(root), hydrateModuleComponents(root),
    hydrateStoryActorVisuals(root)];
  hydrateStorySceneOperands(root);
  hydrateStoryObjectPosition(root);
  ready.push(hydrateOpeningActorResets(root).catch(error => showEditorError(root, "角色重置", error)),
    bindOpeningEncounterFormationEditor(root));
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
    const summary = event.target.closest?.("[data-story-object-shot] > summary");
    if (!openingResetting && summary) {
      const shotId = summary.parentElement.dataset.storyObjectShot;
      const shot = openingWorkbenchContext.trace.shots.find(item => item.id === shotId);
      if (shot) seekPlayback?.(openingWorkbenchContext.entry.variant.id, shot.start, shot.id);
    }
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
    if (selected) highlightStoryObjectTracks(root);
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
  ready.push(refreshOpeningResetState(root));
  ready.push(bindFieldObjectProjections(root, db).catch(error => {
    root.dataset.fieldObjectError = String(error?.message || error);
  }));
  ready.push(Promise.all([
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
  }));
  return Promise.all(ready);
}

function storyVmSequencesForView(view = state.view) {
  return storySequencesForDefinition(storyVmSequences(), storyPageDefinitionForView(view) || {},
    state.storySequenceId);
}

function storyVmSelectedSequenceForView(view = state.view) {
  const sequences = storyVmSequencesForView(view);
  return sequences.find(sequence => sequence.id === state.storySequenceId)
    || sequences.find(sequence => sequence.id === storyPageDefinitionForView(view)?.sequenceId)
    || sequences[0] || null;
}

function renderStoryWorkbench(
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
  // 执行链按选中状态准备模型，组件树、舞台、检查器与表格使用同一模型。
  const entries = sequences.map((sequence, sequenceIndex) => {
    const sourceVariant = variantsById.get(Number(sequence.entry_variant_id));
    if (!sourceVariant) return null;
    const prepare = () => {
    const variant = storyVmEntryVariant(sequence, sourceVariant);
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
    const missing = missingOpcodes.map(opcode => hex$4(opcode, 2));
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
    const entry = {sequence};
    for (const key of ['variant', 'compiled', 'context', 'inventoryEntry', 'missing', 'partial', 'cameraLocated',
      'sourceStatus', 'controlLabel', 'completionLabel', 'note', 'chainLabel', 'storyShots', 'logicalIndex',
      'label', 'shotCount', 'shotLabel', 'resourceUid', 'blocked']) {
      Object.defineProperty(entry, key, {enumerable: true,
        get: () => (prepared ||= prepare())[key],
        set: value => {(prepared ||= prepare())[key] = value;}});
    }
    return entry;
  }).filter(Boolean);
  const locatedSequenceCount = storyEditableWorkbenchView(view) ? 0
    : entries.filter(item => item.cameraLocated).length;
  const selected = entries.find(item => item.sequence.id === state.storySequenceId)
    || entries.find(item => !item.blocked)
    || entries[0]
    || null;
  if (selected) {
    state.storySequenceId = selected.sequence.id;
    const id = Number(selected.variant.id);
    if (!state.storyCardFrame.has(id) && !selected.compiled.frames[0]?.cameraKnown) {
      const frame = selected.compiled.frames.findIndex(snapshot => snapshot.cameraKnown
        && snapshot.fieldPresentation?.enabled !== false);
      if (frame >= 0) state.storyCardFrame.set(id, frame);
    }
  }
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
        <input type="search" id="story-browser-filter" placeholder="按 ID／名称过滤" aria-label="过滤执行链">
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
      ? `交互 · 角色 ${hex$4(item.sequence.entry_variant_id, 2).slice(2)}·${
        hex$4(item.sequence.interaction_trigger.actor_record_id, 2).slice(2)}`
      : `进场 ${hex$4(item.sequence.entry_variant_id, 2).slice(2)}`);
    const sequenceSwitcher = storyPageDefinitionForView(view)?.collection ? `<div class="story-sequence-switcher">${
      referencePickerMarkup({moduleId: 'story', label: '剧情预览对象', value: selected.sequence.id,
        componentAttributes: 'data-story-sequence-select', pageSize: 24,
        items: entries.map(item => ({value: item.sequence.id,
          label: item.sequence.label || item.sequence.id, description: triggerLabel(item),
          group: String(item.sequence.entry_variant_id),
          groupLabel: `入口 ${hex$4(item.sequence.entry_variant_id, 2)}`, meta: item.sequence.id})),
      })}<span>${entries.length} 条执行链</span></div>` : entries.length > 1 ? `<nav class="story-sequence-switcher"
      data-story-sequence-switcher aria-label="本页触发点">
      ${entries.map(item => `<a class="button ${
        item === selected ? "primary" : "ghost"
      }" href="?view=${encodeURIComponent(view)}${state.storyPageId ? `&storyPage=${encodeURIComponent(state.storyPageId)}` : ''}&storySequence=${encodeURIComponent(
        item.sequence.id,
      )}&storyPaused=1" data-story-sequence-option="${esc(item.sequence.id)}">${esc(triggerLabel(item))}</a>`).join("")}
    </nav>` : "";
    const repeatsPageTitle = selected.label === storyPageDefinitionForView(view)?.title;
    const selectedLabel = [repeatsPageTitle ? "" : selected.label,
      entries.length > 1 ? triggerLabel(selected) : ""].filter(Boolean).join(" · ");
    const toolbarMarkup = selectedLabel ? `<div class="record-head story-sequence-handle">
      <span class="record-title" title="${esc(selected.resourceUid)}">${esc(selectedLabel)}</span>
      </div>` : "";
    return createEditableStoryWorkbench(selected, variantsById, renderStage, renderPlaybackPanel, toolbarMarkup, sequenceSwitcher);
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
  const waits = storyWaitingConditions(entry.compiled, {...state.project.story, browser_vm: storyBrowserVm()});
  const results = state.storyExternalPreviewResults.get(String(entry.sequence.id)) || [];
  const continuation = storyBrowserVm().wait_state_model?.story_state_continuations?.find(row =>
    row.story_state === entry.compiled.finalControlState.storyState
      && row.actor_list_id === entry.compiled.finalControlState.actorListId);
  const conditionLabel = condition => condition.kind === "battle-result"
    ? `编队 ${hex$4(condition.formationId, 2)} 战斗结果 · 胜利写入 ${recordUid("global-event-flag", condition.pendingEventFlag)}`
    : condition.kind === "player-direction" ? `玩家朝向 ${({up: "上", down: "下", left: "左", right: "右"})[condition.direction]}`
    : condition.kind === "event-flag"
    ? `事件位 ${recordUid("global-event-flag", condition.flagId)} 已置位`
    : condition.kind === "player-position" ? `玩家坐标 (${condition.x}, ${condition.y})`
      : `玩家坐标 ${condition.left}≤X<${condition.right}、${condition.top}≤Y<${condition.bottom}`;
  const writerMarkup = writer => {
    const label = writer.label || `${writer.actorHandle} · ${storyScriptHandle(writer.kind, writer.scriptId)} @ ${hex$4(writer.cursor, 2)}${
      writer.operation === "start-scripted-encounter" ? " · 战斗胜利后" : ""}`;
    return writer.href ? `<a class="editor-inline-link" href="${esc(writer.href)}" title="${esc(writer.condition || "")}">${esc(label)}</a>` : esc(label);
  };
  const addresses = values => values.filter(Number.isInteger).map(value => `PRG ${hex$4(value, 6)}`).join(" · ");
  const readerMarkup = wait => addresses([wait.readers?.instructionPrg, wait.readers?.handlerPrg]);
  return `<section class="story-wait-preview" data-story-wait-preview="${esc(entry.sequence.id)}">
    <h2>结束方式：<output data-story-completion>${esc(entry.completionLabel)}</output></h2>
    ${waits.map(wait => `<div data-story-wait-key="${esc(wait.key)}"><p>等待 ${eventFlagTextMarkup(conditionLabel(wait.condition))}<br>
      ${esc(storyScriptHandle(wait.scriptKind, wait.scriptId))} @ ${hex$4(wait.cursor, 2)} · ${esc(readerMarkup(wait))}<br>${
      wait.writers.length ? wait.writers.map(writerMarkup).join(" · ") : wait.condition.kind === "event-flag" ? "外部写入者未确认" : ""}</p>${
      wait.results.length ? `<label>结果<select data-story-wait-result aria-label="${esc(conditionLabel(wait.condition))}">
        <option value="">继续等待</option>${wait.results.map(result => `<option value="${esc(result.id)}">${esc(result.label)}</option>`).join("")}
      </select></label>${wait.condition.kind === "player-rectangle" ? `<label>X<input type="number" data-story-wait-coordinate="x"
        min="${wait.condition.left}" max="${wait.condition.right - 1}" value="${wait.condition.left}" required></label><label>Y<input type="number" data-story-wait-coordinate="y"
        min="${wait.condition.top}" max="${wait.condition.bottom - 1}" value="${wait.condition.top}" required></label>` : ""}
      <button type="button" class="button ghost" data-story-resume-wait="${esc(wait.key)}">续播</button>${
        wait.results.map(result => result.evidence_prg_offsets?.length || result.condition
          ? `<p>${esc(result.label)} · ${esc(result.condition || "")} ${esc(addresses(result.evidence_prg_offsets || []))}</p>` : "").join("")}` : ""}</div>`).join("")}
    ${results.length ? `<p>已选预览结果：${results.map(result => esc(result.label)).join(" · ")} · <button type="button" class="button ghost" data-story-clear-waits>清除结果</button></p>` : ""}
    ${entry.compiled.completion === "external-input-unreachable" ? "<p>当前位置没有可通行路径到达等待坐标。</p>" : ""}
    ${entry.compiled.completion === "waiting-for-story-continuation" ? `<p>剧情状态 ${hex$4(entry.compiled.finalControlState.storyState, 2)} 仍有效，等待后续场景动作或交互。</p>` : ""}
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
      ? `角色 ${hex$4(target.entry_variant_id, 2).slice(2)}·${hex$4(target.interaction_trigger.actor_record_id, 2).slice(2)} 交互`
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

// 左栏只列执行链名称。
function storyBrowserMarkup(entries, selected) {
  return `<div class="story-browser-list" id="story-browser-list">${entries.map(item => `
      <button type="button" class="story-browser-item ${item.sequence.id === selected.sequence.id ? "active" : ""} ${item.blocked ? "blocked" : ""}"
        data-story-sequence="${esc(item.sequence.id)}"
        data-story-search="${esc(`${item.logicalIndex} ${item.label} ${item.sequence.kind}`.toLowerCase())}"
        title="${esc(item.label)}">
        <b>${esc(storySequenceComponentLabel(item.sequence.id, item.label))}</b>
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
    ["物理角色表", handleTextMarkup(entry.chainLabel)],
    ["SHOT 链", handleTextMarkup(entry.shotLabel)],
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
    <td class="mono">${handleTextMarkup(entry.shotLabel)}</td>
    <td>${resourceForwardReferenceCell(resourceUid, ["map-scene"])}</td>
    <td>${resourceForwardReferenceCell(resourceUid, ["actor-animation", "actor-special-frame", "actor-chr-set"])}</td>
    <td>${resourceForwardReferenceCell(resourceUid, ["ui-script-record", "complete-menu", "ui-layout"])}</td>
    <td class="story-playback-note">${handleTextMarkup(entry.note)}</td>
  </tr>`;
}

// @editor-module 场景精灵按纵向重叠区间裁剪。
function applyFieldSpriteLimit(actors, viewportWidth, viewportHeight) {
  const sprites = [], groups = new Map();
  for (const actor of [...actors].sort((left, right) => right.oam.priority - left.oam.priority)) {
    const {cells, left, top, size, horizontalFlip, verticalFlip} = actor.oam;
    groups.set(actor, []);
    for (const cell of cells) {
      const x = horizontalFlip ? size - cell.x - 8 : cell.x;
      const y = verticalFlip ? size - cell.y - 8 : cell.y;
      if (left + x + 8 <= 0 || left + x >= viewportWidth) continue;
      const sprite = {cell, y: Math.round(top + y), height: 8};
      sprites.push(sprite); groups.get(actor).push(sprite);
    }
  }
  const visibility = spriteVisibleBands(sprites.slice(0, 64), viewportHeight);
  for (const [actor, submitted] of groups) {
    const rectangles = [];
    let clipped = false;
    for (const sprite of submitted) {
      const bands = visibility.get(sprite) || [];
      const visible = Math.max(0, Math.min(viewportHeight, sprite.y + 8) - Math.max(0, sprite.y));
      if (bands.reduce((sum, band) => sum + band.bottom - band.top, 0) < visible) clipped = true;
      for (const band of bands) {
        const y = actor.oam.verticalFlip ? sprite.cell.y + 8 - (band.bottom - sprite.y)
          : sprite.cell.y + band.top - sprite.y;
        rectangles.push(`<rect x="${sprite.cell.x}" y="${y}" width="8" height="${band.bottom - band.top}" fill="white"/>`);
      }
    }
    if (!clipped) continue;
    const {size} = actor.oam;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${rectangles.join("")}</svg>`;
    actor.styles["mask-image"] = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    actor.styles["mask-size"] = "100% 100%";
  }
}

// @editor-module 剧情时间轴按执行对象与指令语义组织的轨道投影。

const hexId = value => Number(value).toString(16).toUpperCase().padStart(2, "0");
const groups = {
  text: ["对话窗口", "▤", "object:dialogue"], camera: ["镜头／画面", "▣", "object:camera"],
  interface: ["界面", "▤", "object:interface"],
  flags: ["事件位", "⚑"], audio: ["音频", "♪", "object:audio"],
  input: ["输入", "⌨", "object:input"], flow: ["流程", "↪", "object:flow"],
};
const actorSpanIndexes = new WeakMap();

function timelineActorSpans(frames, shots, actorsAt) {
  const cached = actorSpanIndexes.get(frames);
  if (cached?.shots === shots && cached.actorsAt === actorsAt) return cached.spans;
  const spansByActor = new Map();
  for (const shot of shots) {
    for (let frame = shot.start; frame < Math.min(shot.end, frames.length); frame += 1) {
      for (const actor of actorsAt(frames[frame] || {})) {
        const id = storyActorObjectId(shot.id, actor);
        if (!spansByActor.has(id)) spansByActor.set(id, []);
        const spans = spansByActor.get(id);
        if (spans.at(-1)?.end === frame) spans.at(-1).end = frame + 1;
        else spans.push({start: frame, end: frame + 1});
      }
    }
  }
  actorSpanIndexes.set(frames, {shots, actorsAt, spans: spansByActor});
  return spansByActor;
}

function concurrentCommands(blocks) {
  let actorKey, end = -Infinity, otherEnd = -Infinity;
  for (const block of blocks) {
    const command = block.command;
    if (block.start < (command.actorKey === actorKey ? otherEnd : end)) return true;
    const commandEnd = Number(command.end);
    if (!Number.isFinite(commandEnd)) continue;
    if (command.actorKey === actorKey) end = Math.max(end, commandEnd);
    else if (commandEnd > end) {
      otherEnd = end;
      end = commandEnd;
      actorKey = command.actorKey;
    } else otherEnd = Math.max(otherEnd, commandEnd);
  }
  return false;
}
function storyTimelineTree({lanes: sources, trace, frames, actorsAt, objectLabels = new Map(), programs = []}) {
  const objectsById = new Map(trace.objects.map(object => [object.id, object]));
  const shotsById = new Map(trace.shots.map(shot => [shot.id, shot]));
  const roots = new Map();
  const rootsByObject = new Map();
  const children = new Map();
  const childFields = new Map();
  const childSources = new Map();
  const mappings = [];
  const mappingsByNode = new Map();
  let actorFolder = null;
  const root = (id, label, icon, objectId = null) => {
    if (!roots.has(id)) {
      roots.set(id, {id, label, icon, objectId, objectRoot: Boolean(objectId), kind: "key", blocks: []});
      if (objectId && !rootsByObject.has(objectId)) rootsByObject.set(objectId, roots.get(id));
    }
    return roots.get(id);
  };
  const group = name => {
    const [label, icon, objectId] = groups[name];
    return root(label, label, icon, objectId);
  };
  const actorRoot = (shotId, actor, variantId) => {
    const objectId = storyActorObjectId(shotId, actor);
    const object = objectsById.get(objectId);
    const shot = shotsById.get(shotId);
    const identity = actor.fieldEntityIndex !== undefined ? `临时实体-${actor.fieldEntityIndex}`
      : actor.partySlot != null ? `队伍-${hexId(actor.partySlot)}`
        : `角色-${hexId(object?.variantId ?? variantId)}:${hexId(actor.actorSlot)}`;
    const id = trace.shots.length > 1 ? `幕-${hexId(shot?.index || 0)}/${identity}` : identity;
    const label = objectLabels.get(objectId) || identity.replaceAll("-", " ");
    const lane = root(id, trace.shots.length > 1 ? `第 ${shot.index + 1} 幕 · ${label}` : label, "♟", objectId);
    lane.actorRoot = true;
    if (actorFolder) lane.parentId = actorFolder.id;
    return lane;
  };
  const actorsGroup = () => {
    actorFolder = root("角色", "角色", "♟");
    for (const lane of roots.values()) if (lane.actorRoot) lane.parentId = actorFolder.id;
    return actorFolder;
  };
  const child = (parent, property) => {
    const id = `${parent.id}/${property}`;
    if (!children.has(id)) children.set(id, {id, parentId: parent.id, objectId: parent.objectId,
      label: property, kind: "key", fields: [], blocks: [], sourceRows: []});
    return children.get(id);
  };
  const actorForRun = run => {
    const actor = frames[run.start]?.actors?.find(item => item.actorSlot === run.actorSlot)
      || {actorSlot: run.actorSlot};
    return actorRoot(run.shotId, actor, run.variantId);
  };
  actorsGroup();
  const commandTarget = run => {
    const operation = run.operation;
    if (["set-event-flag", "clear-event-flag"].includes(operation)) {
      const folder = group("flags");
      const flag = root(`${folder.id}/${hexId(run.operands[0])}`, globalEventFlagHandle(run.operands[0]), "⚑", `object:flag:${run.operands[0]}`);
      flag.parentId = folder.id;
      flag.flagId = run.operands[0];
      return flag;
    }
    if (operation === "start-blocking-ui-action") return group("interface");
    if (["start-blocking-dialogue", "start-event-selected-dialogue",
      "set-dialogue-actor-parameter"].includes(operation)) return group("text");
    if (operation === "sound-command") return group("audio");
    if (operation === "toggle-player-control-lock") return group("input");
    if (operation === "drive-scripted-input") return group("input");
    if (["switch-scene-inside-story-state", "advance-global-screen-effect", "set-story-state"].includes(operation)) {
      return group("camera");
    }
    if (["terminate-or-change-mode", "end-story-state", "clear-story-state-and-mode",
      "enter-dedicated-field-mode", "end-story-state-with-scene-context", "start-scripted-encounter",
      "subtract-party-money", "replace-party-item", "grant-party-item-and-branch"].includes(operation)) return group("flow");
    if (operation === "clear-runtime-entity-render-slots") return group("flow");
    if (operation === "clear-runtime-party-slot") return group("flow");
    if (operation === "replace-runtime-player-actor-type") return group("flow");
    const snapshot = frames[run.start] || {};
    if (["transfer-actor-to-runtime-entity", "relocate-runtime-target", "set-runtime-entity-move-direction",
      "restore-party-member-health"].includes(operation)) {
      const reference = run.targetActor;
      const target = reference && [...actorsAt(snapshot), ...(snapshot.partyActors || []),
        ...(snapshot.temporaryEntities || [])].find(actor => reference.partySlot != null
          ? actor.partySlot === reference.partySlot : actor.fieldEntityIndex === reference.fieldEntityIndex);
      if (target) return actorRoot(run.shotId, target, snapshot.variantId);
      return group("flow");
    }
    return actorForRun(run);
  };
  const runs = new Map(trace.commands.map(run => [run.id, run]));
  for (const source of sources) {
    source.blocks.forEach((block, index) => {
      const run = runs.get(block.data?.["story-node"]);
      if (!run) throw new Error(`剧情指令无执行来源：${source.id}`);
      const target = commandTarget(run);
      const lane = child(target, run.operation === "toggle-player-control-lock" ? "玩家操控" : "指令");
      lane.blocks.push({...block,
        sourceRow: source.id, sourceBlock: index, fields: source.fields || [],
        originalLabel: source.originalLabel, operation: run?.operation});
      if (!childFields.has(lane)) childFields.set(lane, new Map());
      for (const field of source.fields || []) childFields.get(lane).set(field.identity, field);
      if (!childSources.has(lane)) childSources.set(lane, new Set());
      childSources.get(lane).add(source.id);
      const mapping = {sourceRow: source.id, sourceBlock: index, nodeId: block.data?.["story-node"],
        target: lane.id, operation: run?.operation || source.id};
      mappings.push(mapping);
      if (!mappingsByNode.has(mapping.nodeId)) mappingsByNode.set(mapping.nodeId, mapping);
    });
  }
  for (const lane of children.values()) {
    lane.fields = [...(childFields.get(lane)?.values() || [])];
    lane.sourceRows = [...(childSources.get(lane) || [])];
  }
  for (const object of trace.objects.filter(item => item.kind === "actor")) {
    const snapshot = frames[object.start] || {};
    const actor = [...(snapshot.actors || []), ...(snapshot.partyActors || []),
      ...(snapshot.temporaryEntities || [])].find(item => storyActorObjectId(object.shotId, item) === object.id);
    if (actor) actorRoot(object.shotId, actor, snapshot.variantId);
  }
  group("camera");
  group("text");
  group("audio");
  group("interface");
  for (const segment of trace.playerSegments || []) {
    const lane = child(group("input"), "玩家操控");
    const block = (start, id, label, frames, source = null) => ({start, ...(frames ? {frames} : {}),
      label, title: label, tone: "command", data: {"story-node": id}, fields: [],
      command: source ? trace.commands.findLast(run => run.variantId === Number(source.variantId ?? segment.variantId)
        && run.actorSlot === Number(source.actorSlot) && run.scriptKind === source.scriptKind
        && run.programId === Number(source.programId) && run.cursor === source.command.cursor && run.start <= start) : null,
      runtimeSource: source ? null : "storyPlayerSegments / previewFieldInputs"});
    if (!trace.drivers?.some(driver => driver.property === "lock" && driver.start === segment.start
        && driver.value === 0)) lane.blocks.push(block(segment.start, `${segment.id}:release`, "解除操控", null, segment.release));
    lane.blocks.push(block(segment.start + 1, segment.id, "玩家操控（预览模拟输入）", Math.max(1, segment.end - segment.start - 1)));
    if (segment.trigger) lane.blocks.push(block(segment.end, `${segment.id}:trigger`,
      storyPlayerConditionLabel(segment.trigger.condition), null, segment.trigger));
  }
  if (actorFolder) {
    const paths = new Map();
    for (const parent of roots.values()) {
      if (!parent.actorRoot) continue;
      const id = parent.id;
      parent.id = `${actorFolder.id}/${id}`;
      for (const lane of children.values()) {
        if (lane.parentId !== id) continue;
        paths.set(lane.id, `${actorFolder.id}/${lane.id}`);
        lane.id = paths.get(lane.id);
        lane.parentId = parent.id;
      }
    }
    for (const mapping of mappings) mapping.target = paths.get(mapping.target) || mapping.target;
  }
  const ordered = [];
  for (const parent of roots.values()) {
    ordered.push(parent);
    for (const lane of children.values()) {
      if (lane.parentId !== parent.id) continue;
      lane.blocks.sort((a, b) => a.start - b.start);
      if (lane.label === "玩家操控" || lane.blocks.some(block => !block.command)) {
        lane.blocks.forEach((block, index) => block.data = {...block.data, "story-block-index": index});
        ordered.push(lane);
        continue;
      }
      const concurrent = concurrentCommands(lane.blocks);
      lane.concurrent = concurrent;
      lane.blocks.forEach(block => { block.frames = Math.max(1, block.command.frames); });
      if (!concurrent && parent.objectId !== "object:dialogue") {
        parent.blocks = lane.blocks;
        parent.fields = lane.fields;
        parent.sourceRows = lane.sourceRows;
        parent.control = `<small>${parent.blocks.length}</small>`;
        for (const mapping of mappings) if (mapping.target === lane.id) mapping.target = parent.id;
        parent.blocks.forEach((block, index) => block.data = {...block.data, "story-block-index": index});
        continue;
      }
      if (!concurrent) {
        lane.blocks.forEach((block, index) => block.data = {...block.data, "story-block-index": index});
        ordered.push(lane);
        continue;
      }
      const streams = new Map();
      for (const block of lane.blocks) {
        const run = block.command;
        if (!streams.has(run.actorKey)) streams.set(run.actorKey, {
          id: `${parent.id}/来源-${hexId(run.variantId)}:${hexId(run.actorSlot)}`,
          parentId: parent.id, objectId: parent.objectId, kind: "key",
          label: `来源 ${hexId(run.variantId)}:${hexId(run.actorSlot)}`, blocks: [], fields: [], sourceRows: [],
        });
        const stream = streams.get(run.actorKey);
        block.title += ` · 并行来源 ${run.actorKey}`;
        block.data = {...block.data, "story-block-index": stream.blocks.length};
        stream.blocks.push(block);
        stream.fields.push(...block.fields);
        stream.sourceRows.push(block.sourceRow);
        const mapping = mappingsByNode.get(run.id);
        mapping.target = stream.id;
      }
      parent.control = `<small>${lane.blocks.length}</small>`;
      for (const stream of streams.values()) {
        stream.fields = [...new Map(stream.fields.map(field => [field.identity, field])).values()];
        stream.sourceRows = [...new Set(stream.sourceRows)];
        stream.control = `<small>${stream.blocks.length}</small>`;
        ordered.push(stream);
      }
    }
  }
  const commandBlocks = new Map(ordered.flatMap(lane => lane.blocks.map(block => [block.command?.id, block])));
  const driverEnds = new Map();
  const nextDrivers = new Map();
  for (const driver of [...(trace.drivers || [])].sort((a, b) => b.start - a.start)) {
    const key = `${driver.objectId}/${driver.property}`;
    const end = driver.group === "actor" ? shotsById.get(driver.shotId)?.end ?? frames.length : frames.length;
    driverEnds.set(driver.id, Math.min(nextDrivers.get(key) ?? end, end));
    nextDrivers.set(key, driver.start);
  }
  const actorSpans = timelineActorSpans(frames, trace.shots, actorsAt);
  const lanesById = new Map(ordered.map(lane => [lane.id, lane]));
  for (const driver of trace.drivers || []) {
    let parent = rootsByObject.get(driver.objectId);
    if (!parent && driver.group === "actor") {
      parent = actorRoot(driver.shotId, driver.actor, frames[driver.start]?.variantId);
      if (actorFolder && !parent.id.startsWith(`${actorFolder.id}/`)) parent.id = `${actorFolder.id}/${parent.id}`;
    }
    if (!parent && driver.group === "flags") {
      const folder = group("flags");
      const flagId = Number(driver.objectId.split(":").at(-1));
      parent = root(`${folder.id}/${hexId(flagId)}`, globalEventFlagHandle(flagId), "⚑", driver.objectId);
      parent.parentId = folder.id;
      parent.flagId = flagId;
    }
    if (!parent) parent = group(driver.group === "dialogue" ? "text" : driver.group);
    if (!ordered.includes(parent)) {
      if (parent.parentId) {
        const folder = [...roots.values()].find(lane => lane.id === parent.parentId);
        if (folder && !ordered.includes(folder)) ordered.push(folder);
      }
      ordered.push(parent);
    }
    const id = driver.group === "audio" && driver.property === "trigger" ? `${parent.id}/触发/${driver.audioKind}`
      : driver.property === "lock" ? `${parent.id}/玩家操控`
      : driver.property === "dialogue" ? `${parent.id}/台词` : `${parent.id}/状态/${driver.property}`;
    let lane = lanesById.get(id);
    if (!lane) {
      lane = {id, parentId: parent.id, objectId: parent.objectId, label: driver.property === "lock" ? "玩家操控"
        : driver.property === "dialogue" ? "台词" : driver.label,
        kind: "key", blocks: [], fields: [], sourceRows: []};
      const end = ordered.findLastIndex(lane => lane.id === parent.id || lane.parentId === parent.id);
      ordered.splice(end + 1, 0, lane);
      lanesById.set(id, lane);
    }
    const sourceBlock = commandBlocks.get(driver.command?.id);
    const valueLabel = driver.property === "scene" ? `${driver.before ? `离开 ${hexId(driver.before.scene)} → ` : ""}场景 ${hexId(driver.value.scene)}`
      : driver.group === "interface" ? driver.value?.label || "隐藏"
        : driver.property === "dialogue" ? driver.value ? "台词" : "隐藏"
        : driver.property === "visibility" ? driver.value ? "显示" : "隐藏"
          : driver.property === "flag" ? driver.value ? "置位" : "清除"
            : driver.property === "lock" ? driver.value ? "锁定操控" : "解除操控" : driver.label;
    const actorEnd = driver.group === "actor" && driver.property !== "visibility"
      ? actorSpans.get(driver.objectId)?.find(span => span.start <= driver.start && driver.start < span.end)?.end : null;
    const end = ["trigger", "confirm"].includes(driver.property) || driver.property === "dialogue" && !driver.value
      ? driver.end : Math.min(driverEnds.get(driver.id), actorEnd ?? frames.length);
    if (driver.property === "lock" && sourceBlock?.start === driver.start && lane.blocks.includes(sourceBlock)) {
      sourceBlock.driver = driver;
      sourceBlock.frames = Math.max(1, end - driver.start);
      sourceBlock.label = valueLabel;
      sourceBlock.title = `${valueLabel} · ${driver.source}`;
      sourceBlock.data = {...sourceBlock.data, "story-node": driver.id, "story-driver-key": "true",
        "story-player-control-key": "true"};
      mappings.push({nodeId: driver.id, target: lane.id, operation: driver.property});
      continue;
    }
    const block = {start: driver.start, frames: Math.max(1, end - driver.start),
      label: valueLabel, title: `${valueLabel} · ${driver.source}`, tone: "command",
      driver, command: driver.command, fields: sourceBlock?.fields || [],
      data: {"story-node": driver.id, "story-driver-key": "true", "story-block-index": lane.blocks.length,
        ...(driver.property === "lock" ? {"story-player-control-key": "true"} : {})}};
    lane.blocks.push(block);
    mappings.push({nodeId: driver.id, target: lane.id, operation: driver.property});
  }
  const dialogue = group("text");
  for (let frame = 0; frame < frames.length; frame += 1) {
    if (!frames[frame].dialogue) continue;
    const previous = dialogue.blocks.at(-1);
    if (previous && previous.start + previous.frames === frame) {
      previous.frames += 1;
      continue;
    }
    const driver = trace.drivers?.find(driver => driver.property === "dialogue" && driver.start === frame);
    dialogue.blocks.push({start: frame, frames: 1, label: "对话窗口", title: "对话窗口", tone: "command", dialogueWindow: true,
      command: driver?.command, fields: commandBlocks.get(driver?.command?.id)?.fields || [],
      data: {"story-node": driver?.id || `dialogue-window:${frame}`}});
  }
  dialogue.summaryBlocks = dialogue.blocks;
  const movements = storyMovementGroups(trace.commands);
  for (const lane of ordered) {
    const grouped = new Map();
    lane.blocks = lane.blocks.filter(block => {
      const runs = movements.get(block.command?.id);
      if (!runs) return true;
      const first = runs[0];
      const previous = grouped.get(first.id);
      if (previous) {
        previous.frames = Math.max(previous.start + previous.frames, block.start + block.frames) - previous.start;
        if (previous.driver && block.driver) previous.driver = {...previous.driver,
          value: block.driver.value, changes: [...previous.driver.changes, ...block.driver.changes]};
        return false;
      }
      grouped.set(first.id, block);
      const instructions = programs.length ? storyMovementInstructions(first, programs) : runs;
      block.command = {...first, movementRuns: runs, movementInstructions: instructions};
      block.label = `走 ${instructions.length} 格`;
      block.title += ` · ${instructions.length} 步`;
      return true;
    });
    lane.keyMinWidth = 8;
    for (const block of lane.blocks) block.frames = Math.max(1, block.frames || 1);
    lane.blocks.sort((left, right) => left.start - right.start);
    lane.blocks.forEach((block, index) => block.data = {...block.data, "story-block-index": index});
    if (lane !== dialogue && lane.blocks.some(block => block.command) && ordered.some(child => child.parentId === lane.id)) {
      const starts = new Set(lane.blocks.map(block => block.start));
      lane.summaryBlocks = [...lane.blocks,
        ...timelineSummaryBlocks(ordered, lane.id).filter(block => !starts.has(block.start)
          && !lane.blocks.some(key => key.start <= block.start && block.start < key.start + (key.frames || 1)))];
    }
  }
  return {lanes: ordered, mappings};
}

// @editor-module 剧情舞台的地图外延与对象点选。

const controllers = new WeakMap();
const activeStages = new WeakSet();

function syncStoryPlayerRegions(screen, snapshot, segments, dimensions) {
  const regions = segments.filter(segment => segment.sceneId === snapshot.sceneId)
    .flatMap(segment => segment.regions.map(wait => {
      const region = storyPlayerRegion(wait.condition);
      return {...wait, region, attributes: {'data-story-stage-object': 'object:input'},
        title: `触发区域：${region.left}≤X<${region.right}、${region.top}≤Y<${region.bottom}；脚本操作数写入 ROM`};
    }));
  syncScenePreviewRegions(screen, regions, {x: snapshot.cameraTileOriginX,
    y: snapshot.cameraTileOriginY, scrollY: snapshot.screenScrollOffsetY}, dimensions);
}

function syncStoryStageMap(stage, snapshot, dimensions) {
  controllers.get(stage)?.setMapExtension(snapshot ? {sceneId: snapshot.context?.scene_id,
    cameraX: snapshot.cameraTileOriginX, cameraY: snapshot.cameraTileOriginY,
    animationPhase: snapshot.backgroundAnimationPhase, fieldTiles: snapshot.fieldTiles} : null, dimensions);
}

function storyStageZoomMarkup() {
  return scenePreviewControls("舞台缩放");
}

function bindStoryStage(stage, view, onSelect) {
  activeStages.add(stage);
  if (controllers.has(stage)) return;
  const viewport = stage.querySelector("[data-story-stage-viewport]");
  const screen = stage.querySelector('[data-role="story-vm-screen"]');
  if (!viewport || !screen) return;
  const controller = bindScenePreview({viewport, surface: screen,
    retainWhenDetached: true,
    isCurrent: () => activeStages.has(stage) && stage.isConnected,
    canvas: screen.querySelector('[data-role="story-vm-background"]'), controls: stage,
    key: `story:${view}`, size: () => ({width: Number(screen.dataset.stageWidth) || 256,
      height: Number(screen.dataset.stageHeight) || 240}), sizeElement: screen,
    onObjectSelect: onSelect, objectAttribute: 'storyStageObject',
    mapExtension: screen.querySelector('[data-role="story-vm-map"]'),
    onMapError: error => showEditorError(viewport, '场景地图预览失败', error)});
  const tooltip = document.createElement("span");
  tooltip.className = "story-stage-tooltip";
  tooltip.hidden = true;
  viewport.append(tooltip);
  viewport.addEventListener("pointermove", event => {
    const actor = event.target.closest?.("[data-story-stage-object]");
    tooltip.hidden = !actor || viewport.classList.contains("is-panning");
    if (actor) tooltip.textContent = actor.getAttribute("aria-label");
  });
  viewport.addEventListener("pointerleave", () => { tooltip.hidden = true; });
  controllers.set(stage, controller);
}

function disposeStoryStage(stage) {
  activeStages.delete(stage);
  controllers.get(stage)?.destroy();
  controllers.delete(stage);
}

function suspendStoryStage(stage) {
  activeStages.delete(stage);
  controllers.get(stage)?.invalidateMapExtension();
}
function resumeStoryStage(stage) { activeStages.add(stage); }

function storyStageActorAttributes(objectId, label, selectedId) {
  return {"data-story-stage-object": String(objectId), role: "button", tabindex: "0",
    "aria-label": label, "aria-pressed": String(objectId === selectedId)};
}

const syncStoryStageActors = syncScenePreviewObjects;

// @editor-module 剧情时间轴行名称、定位地址与详情。

const FIELD_NAMES = new Map([
  ["条件分支相对位移", "分支"],
  ["角色运动属性", "运动"],
  ["对话角色参数", "对话角色"],
  ["对话文本记录 id", "文本"],
  ["声音命令 id", "声音"],
  ["目标 story state", "剧情状态"],
  ["相机相对位置（高 / 低半字节为 X / Y）", "相机位置"],
  ["角色目标格 X（u8 地图坐标）", "目标 X"],
  ["角色目标格 Y（u8 地图坐标）", "目标 Y"],
  ["等待事件位 / 结束参数 2", "结束事件位"],
  ["战斗编队 id", "编队"],
  ["游标相对位移", "跳转"],
  ["运行时角色槽 id", "角色槽"],
  ["运行时目标槽 id", "目标槽"],
  ["运行时队伍槽 id", "队伍槽"],
  ["剧情内镜头路线 id", "镜头路线"],
  ["文本区域 id", "文本区"],
  ["文本记录 id", "文本"],
  ["漫游矩形左边界 X（u8 地图坐标）", "漫游左"],
  ["漫游矩形右边界 X（u8 地图坐标）", "漫游右"],
  ["漫游矩形上边界 Y（u8 地图坐标）", "漫游上"],
  ["漫游矩形下边界 Y（u8 地图坐标）", "漫游下"],
  ["朝向不匹配分支相对位移", "朝向分支"],
  ["空槽分支相对位移", "空槽分支"],
  ["已占用槽分支相对位移", "占用分支"],
  ["战斗后的 story state（$FF 为无后继状态）", "战后状态"],
  ["退出后的场景 id", "退出场景"],
  ["退出后的相机 tile 原点 X（有符号原始字节）", "退出相机 X"],
  ["退出后的相机 tile 原点 Y（有符号原始字节）", "退出相机 Y"],
  ["渲染偏移序列 id", "偏移序列"],
  ["序列结束后的角色类型", "结束角色"],
  ["向右脚本输入帧数", "向右"],
  ["向左脚本输入帧数", "向左"],
  ["向上脚本输入帧数", "向上"],
  ["向下脚本输入帧数", "向下"],
  ["运行结果非零分支相对位移", "结果分支"],
  ["非玩家角色分支相对位移", "角色分支"],
]);

function storyTimelineShortText(text) {
  const value = String(text || "");
  if (!value.includes(":")) return value;
  return value.replace(/\b[a-z][a-z0-9-]*(?::[A-Za-z0-9_-]+)+/gu,
    handle => handle.split(":").at(-1));
}

function storyTimelineFieldLabel(field) {
  const name = FIELD_NAMES.get(field.label) || String(field.label)
    .replace(/（[^）]*）/gu, "").replace(/\s+id$/iu, "")
    .replace(/^运行时/u, "").replace(/相对位移/gu, "位移")
    .replace(/story state/gu, "剧情状态");
  const handle = String(field.value).match(/\b[a-z][a-z0-9-]*(?::[A-Za-z0-9_-]+)+/u)?.[0];
  return handle ? `${name} ${handle.split(":").slice(handle.startsWith("record:") ? 1 : -1).join("·")}` : name;
}

function storyTimelineFieldsLabel(fields) {
  const names = fields.map(field => field.label);
  if (fields.length === 2 && fields.every(field => field.label.startsWith("角色目标格"))) return "目标格";
  if (fields.length === 4 && fields.every(field => field.label.startsWith("漫游矩形"))) return "漫游范围";
  if (names.some(name => name.startsWith("位置矩形"))) return "位置范围 / 分支";
  if (names.some(name => name.startsWith("玩家目标格"))) return "玩家位置 / 分支";
  if (fields.length === 2 && names.every(name => name.startsWith("角色格坐标"))) return "角色位置";
  if (names.some(name => name.startsWith("被替换的角色类型"))) return "角色替换";
  if (names.includes("战斗编队 id")) return storyTimelineFieldLabel(fields.find(field => field.label === "战斗编队 id"));
  if (names.includes("文本区域 id") && names.includes("文本记录 id")) return "文本";
  if (names.includes("循环次数")) return "循环";
  if (fields.length > 1 && fields.every(field => field.label.startsWith("退出后的"))) {
    return storyTimelineFieldLabel(fields.find(field => field.label === "退出后的场景 id") || fields[0]);
  }
  return fields.map(storyTimelineFieldLabel).join(" / ");
}

function storyTimelineRowAddress(view, sequenceId, laneId) {
  const query = new URLSearchParams({view, storyRow: storyTimelineRowId(view, sequenceId, laneId),
    storyPaused: "1"});
  if (state.storyPageId) query.set('storyPage', state.storyPageId);
  return `?${query}`;
}

function referencedTextMarkup(text) {
  const source = String(text || "");
  let cursor = 0;
  let markup = "";
  for (const match of source.matchAll(/\b[a-z][a-z0-9-]*(?::[A-Za-z0-9_-]+)+/gu)) {
    const handle = match[0];
    const target = handle.startsWith("record:") ? currentTextReference(handle).uid
      : handle.replace(/^story-(autonomous|interaction)-script:script:/u, "story:$1:");
    markup += esc(source.slice(cursor, match.index)) + storyResourceMarkup(handle, "", target);
    cursor = match.index + handle.length;
  }
  return markup + esc(source.slice(cursor));
}

function storyTimelineCommandSummary(block) {
  if (!block) return "";
  const dialogue = block.driver?.property === "dialogue"
    || ["start-blocking-dialogue", "start-event-selected-dialogue"].includes(block.command?.operation);
  const label = block.dialogueWindow ? "对话窗口" : block.branch ? block.label : dialogue ? "台词" : block.driver?.label
    || (block.command?.operation === "start-blocking-ui-action" ? "界面窗口"
      : block.command ? storyCommandPresentation(storyVmSemanticsMap().get(block.command.opcode)).label : block.label);
  const program = block.command && storyBrowserVm().programs.find(program => program.id === block.command.programId
    && (program.kind || "autonomous") === block.command.scriptKind);
  const reason = block.unwrittenReason || program?.unwrittenReason
    || (program?.unwrittenOverflowBytes ? `容量不足，超出 ${program.unwrittenOverflowBytes} 字节` : null);
  return `<h4>${esc(label)}${block.command?.movementRuns ? ` · ${(block.command.movementInstructions || block.command.movementRuns).length} 步` : ''}${block.dialogueWindow || block.runtimeSource || block.driver && !block.command ? ' · 只读' : ''}</h4>${
    reason ? `<span data-script-unwritten title="${esc(`未进 ROM：${reason}`)}">↛</span>` : ""}${
    block.driver && (!dialogue || !block.driver.value) ? storyDriverDetails(block.driver) : ""}`;
}

function storyDriverDetails(driver) {
  const value = item => item == null ? "—" : referencedTextMarkup(typeof item === "object" ? JSON.stringify(item) : String(item));
  const current = driver.value;
  const resource = (owner, id) => id == null ? "—"
    : storyResourceMarkup(`${owner}:${Number(id).toString(16).toUpperCase().padStart(2, "0")}`);
  let content;
  if (driver.property === "dialogue") content = `<dt>显示</dt><dd>隐藏</dd>`;
  else if (driver.property === "scene") content = `<dt>场景</dt><dd>${current.scene >= 0 ? storyResourceMarkup(`scene:${Number(current.scene).toString(16).toUpperCase().padStart(2, "0")}`) : "—"}</dd>
    <dt>落点</dt><dd>${value(current.player)}</dd>`;
  else if (driver.group === "interface") content = current ? `<dt>显示</dt><dd>${esc(current.label)}</dd>
    ${current.screen ? `<dt>界面</dt><dd>${storyInterfaceMarkup(current)}</dd>` : ""}
    ${current.context?.vehicle_slot != null ? `<dt>战车</dt><dd>${current.context.vehicle_slot + 1}</dd>` : ""}
    ${current.context?.role_slot != null ? `<dt>人物</dt><dd>${value(`character:${Number(current.context.role_slot).toString(16).toUpperCase().padStart(2, "0")}`)}</dd>` : ""}
    ${current.target != null ? `<dt>通缉目标</dt><dd>${value(`encounter-formation:${Number(current.target).toString(16).toUpperCase().padStart(2, "0")}`)}</dd>` : ""}`
    : "<dt>显示</dt><dd>隐藏</dd>";
  else if (driver.property === "appearance") content = `<dt>形象</dt><dd>${resource({
    "direct-actor-frame": "direct-frame", "generic-metasprite": "metasprite",
  }[current?.[1]] || "actor-type", current?.[0])}${current?.[2] == null ? "" : ` · P${current[2]}`}</dd>`;
  else if (driver.group === "audio") content = driver.property === "music"
    ? `<dt>音乐</dt><dd>${current == null ? "未播放" : resource("audio-command", current)}</dd>`
    : driver.property === "audio-fade" ? `<dt>淡出</dt><dd>${current == null ? "无" : resource("audio-control", current)}</dd>`
      : driver.property === "music-status" ? `<dt>播放</dt><dd>${esc({playing: "播放中", fading: "淡出中",
        "inherited-unknown": "继承现场", "stopped-after-fade-reset": "已停止"}[current] || current || "未载入")}</dd>`
      : `<dt>声音</dt><dd>${value(current?.command)}</dd>`;
  else if (["position", "camera"].includes(driver.property)) content = `<dt>位置</dt><dd>${value(current?.slice(0, 2))}</dd>`;
  else if (driver.property === "direction") content = `<dt>朝向</dt><dd>${esc({up: "上", down: "下", left: "左", right: "右"}[current] || current)}</dd>`;
  else if (driver.property === "visibility") content = `<dt>显示</dt><dd>${current ? "可见" : "隐藏"}</dd>`;
  else if (driver.property === "lock") content = `<dt>操控锁</dt><dd>${current ? "锁定" : "释放"}</dd>`;
  else if (driver.property === "flag") content = `<dt>当前值</dt><dd>${current ? "已置位" : "未置位"}</dd>`;
  else if (driver.property === "confirm") content = `<dt>确认</dt><dd>${current.presses} 次</dd><dt>等待</dt><dd>${current.waitFrames} 帧</dd>`;
  else if (driver.property === "fade") content = `<dt>不透明度</dt><dd>${Math.round(Number(current) * 100)}%</dd>`;
  else if (driver.property === "field-fade") content = current
    ? `<dt>阶段</dt><dd>${current.phase === "scene-loading" ? "装载场景" : "渐显"}</dd><dt>亮度减量</dt><dd>${value(current.decrement)}</dd>`
    : "<dt>渐显</dt><dd>结束</dd>";
  else if (driver.property === "scroll") content = `<dt>画面偏移 Y</dt><dd>${value(current)}</dd>`;
  else if (driver.property === "offset") content = `<dt>画面偏移</dt><dd>${value(current)}</dd>`;
  else if (driver.property === "execution") content = `<dt>执行</dt><dd>${current?.[1] ? "阻塞" : current?.[0] ? "结束" : "运行"}</dd>`;
  else if (driver.property === "battle") content = current ? `<dt>编队</dt><dd>${resource("encounter-formation", current.formationId)}</dd>
    <dt>战斗测试</dt><dd><a class="editor-inline-link" data-battle-simulator-link href="${esc(battleSimulatorHref({
      source: driver.source, formationId: current.formationId, flag: current.pendingEventFlag,
      storyState: current.targetStoryState}))}">战斗模拟器 ↗</a></dd>
    <dt>预览结果</dt><dd>${current.assumedResult === "victory" ? "假定胜利" : value(current.assumedResult)}</dd>` : "<dt>战斗</dt><dd>无</dd>";
  else if (driver.property === "service") content = `<dt>目的地</dt><dd>${value(current?.destination)}</dd>`;
  else if (driver.property === "party") content = `<dt>队员</dt><dd>${(current || []).map(slot => resource("character", slot)).join(" · ") || "无"}</dd>`;
  else if (driver.property === "entities") content = `<dt>实体数</dt><dd>${value(current?.[0])}</dd>`;
  else if (driver.property === "vehicles") content = (current || []).flatMap((vehicle, index) => {
    if (JSON.stringify(vehicle) === JSON.stringify(driver.before?.[index])) return [];
    const parked = vehicle.parked;
    return [`<dt>战车</dt><dd>${resource("vehicle", vehicle.slot)}</dd><dt>停放</dt><dd>${parked
      ? `${resource("scene", parked.sceneId)} · (${parked.x}, ${parked.y})` : "未停放"}</dd>`];
  }).join("") || "<dt>战车</dt><dd>未载入</dd>";
  else if (driver.property === "members") content = (current || []).flatMap((member, index) => {
    if (JSON.stringify(member) === JSON.stringify(driver.before?.[index])) return [];
    return [`<dt>队员</dt><dd>${resource("character", member.slot)}</dd><dt>HP</dt><dd>${value(member.currentHp)}</dd>`];
  }).join("") || "<dt>队伍</dt><dd>未载入</dd>";
  else if (driver.property === "inventory") content = (current || []).flatMap((rows, kind) => (rows || []).flatMap((items, slot) =>
    (items || []).flatMap((item, index) => item === driver.before?.[kind]?.[slot]?.[index] ? []
      : [`<dt>${kind === 0 ? "背包" : "装备"} ${index + 1}</dt><dd>${resource("character", slot)} · ${item ? resource("item-entry", item) : "空"}</dd>`]))).join("")
    || "<dt>携带物</dt><dd>未载入</dd>";
  else content = `<dt>当前值</dt><dd>${value(current)}</dd>`;
  return `<dl class="story-inspector-fields" data-story-driver-details>${content}</dl>`;
}

function storyTimelineRowDetails(model, lane, block, selectedLane = lane, editor = "") {
  if (selectedLane.objectRoot && !block) return "";
  const identity = `<a class="editor-inline-link" href="${esc(storyTimelineRowAddress(model.view, model.sequenceId, selectedLane.id))}">${handleMarkup(selectedLane.rowId)}</a>`;
  const script = block?.command ? `story-${block.command.scriptKind}-script:script:${Number(block.command.programId).toString(16).toUpperCase().padStart(2, "0")}` : null;
  const source = `<dl class="story-inspector-fields"><dt>键</dt><dd>${identity}</dd><dt>执行链</dt><dd>${referencedTextMarkup(`story-sequence:${model.sequenceId}`)}</dd>
    ${script ? `<dt>脚本</dt><dd>${referencedTextMarkup(script)}</dd>` : ""}</dl>`;
  const owners = [...editor.matchAll(/<span data-story-command-owner="[^"]*"><\/span>/gu)].map(match => match[0]).join("");
  editor = editor.replace(/<span data-story-command-owner="[^"]*"><\/span>/gu, "");
  const runtimeResult = editor.match(/<div data-story-key-runtime>[\s\S]*?<\/div>/u)?.[0] || "";
  editor = editor.replace(runtimeResult, "");
  const textEnd = editor.indexOf('<div data-story-key-operands>');
  const reset = editor.match(/<button[^>]*data-story-command-reset="[^"]*"[^>]*>⟲<\/button>/u)?.[0] || "";
  const keyReset = textEnd < 0 ? reset : "";
  if (reset) editor = editor.replace(reset, "");
  const text = textEnd < 0 ? editor : editor.slice(0, textEnd);
  const operands = textEnd < 0 ? "" : editor.slice(textEnd);
  const routine = block?.dialogueWindow ? "buildStoryVmVariant / activeDialogue / buildStoryVmSequence / dialogueForStage"
    : block?.runtimeSource || (block?.driver && !block.command ? block.driver.source : null);
  const runtimeSource = routine
    ? `<dl class="story-inspector-fields"><dt>来源例程</dt><dd>${esc(routine)}</dd></dl>` : "";
  const provenance = `<details data-story-key-source><summary>来源${textEnd < 0 ? "" : reset}</summary>${source}${runtimeSource}${owners}${runtimeResult}
      <div class="story-script-operands">${operands}</div></details>`;
  return `<section class="story-timeline-command is-current" data-story-timeline-command${block ? " data-story-key-inspector" : ""}>
    <div class="story-key-head"><div data-story-command-summary>${storyTimelineCommandSummary(block)}</div>${keyReset}</div>
    <div class="story-script-operands">${text}</div>
    ${provenance}
  </section>`;
}

function storyTimelineCurrentValues(model, lane, frame) {
  const snapshot = model.compiled?.frames[frame] || {};
  const object = model.trace?.objects.find(object => object.id === lane.objectId);
  const currentActor = object && frame >= object.start && frame < object.end
    ? [...(snapshot.actors || []), ...(snapshot.partyActors || []), ...(snapshot.temporaryEntities || [])]
      .find(item => object.partySlot != null ? item.partySlot === object.partySlot
        : object.fieldEntityIndex !== undefined ? item.fieldEntityIndex === object.fieldEntityIndex
          : item.actorSlot === object.actorSlot) : null;
  const value = (label, current) => `<dt>${label}</dt><dd>${current}</dd>`;
  const number = value => Number.isFinite(value) ? Number(value.toFixed(2)) : "—";
  let values = "";
  if (lane.actorRoot) {
    values = currentActor ? value("位置", `(${number(currentActor.x)}, ${number(currentActor.y)})`)
      + value("朝向", esc({up: "上", down: "下", left: "左", right: "右"}[currentActor.direction] || currentActor.direction))
      + value("形象", storyResourceMarkup(`${{"direct-actor-frame": "direct-frame", "generic-metasprite": "metasprite"}[currentActor.renderMode] || "actor-type"}:${Number(currentActor.actorType).toString(16).toUpperCase().padStart(2, "0")}`))
      + value("显示", storyActorIsVisible(currentActor) ? "可见" : "隐藏") : value("状态", "非当前幕");
  } else if (lane.objectId === "object:camera") {
    values = value("场景", snapshot.sceneId >= 0 ? storyResourceMarkup(`scene:${Number(snapshot.sceneId).toString(16).toUpperCase().padStart(2, "0")}`) : "—")
      + value("相机", `(${number(snapshot.cameraTileOriginX)}, ${number(snapshot.cameraTileOriginY)})`);
  } else if (lane.flagId !== undefined) values = value("当前值", (snapshot.eventFlags || []).includes(lane.flagId) ? "已置位" : "未置位");
  else if (lane.objectId === "object:input") values = value("操控锁", snapshot.controlLock ? "锁定" : "释放");
  else if (lane.objectId === "object:dialogue") values = value("台词", esc(snapshot.dialogue?.text || snapshot.dialogue?.lines?.join(" ") || "隐藏"));
  else if (lane.objectId === "object:interface") values = value("界面", esc(storySnapshotInterface(snapshot)?.label || "隐藏"));
  else if (lane.objectId === "object:audio") values = value("曲目", snapshot.audioState?.currentMusicCommandId == null ? "未播放"
    : storyResourceMarkup(`audio-command:${Number(snapshot.audioState.currentMusicCommandId).toString(16).toUpperCase().padStart(2, "0")}`));
  else if (lane.objectId === "object:flow") values = value("剧情状态", esc(String(snapshot.storyState ?? "—")))
    + value("场景", snapshot.sceneId == null ? "—"
      : storyResourceMarkup(`scene:${Number(snapshot.sceneId).toString(16).toUpperCase().padStart(2, "0")}`));
  return `<small data-story-row-frame>F${frame}</small><dl class="story-inspector-fields">${values}</dl>`;
}

// @editor-module 剧情时间轴源行与片段投影。

const directions$1 = {up: "上", down: "下", left: "左", right: "右"};

const COMMAND_LABELS = {
  "set-direction": (semantic, values, pair) => `朝${directions$1[semantic.direction] || "当前方向"}`,
  "attempt-tile-step": (semantic, values, pair) => `向${directions$1[semantic.direction]}走 1 格`,
  "move-actor-to-position": (semantic, values, pair) => `走到 ${pair}`,
  "set-actor-position": (semantic, values, pair) => `位置到 ${pair}`,
  "set-packed-camera-relative-position": (semantic, values, pair) => `相机相对 (${values[0] >> 4}, ${values[0] & 15})`,
  "drive-scripted-input": (semantic, values, pair) => `向${["", "右", "左", "上", "下"][semantic.input_value]}走 ${values[semantic.count_operand_index]} 格`,
  "wait-operand-frames": (semantic, values, pair) => `等 ${values[semantic.count_operand_index]} 帧`,
  "wait": (semantic, values, pair) => `等 ${semantic.frames} 帧`,
  "set-event-flag": (semantic, values, pair) => `置 ${globalEventFlagHandle(values[0])}`,
  "clear-event-flag": (semantic, values, pair) => `清 ${globalEventFlagHandle(values[0])}`,
  "wait-event-flag-set": (semantic, values, pair) => `等 ${globalEventFlagHandle(values[0])}`,
  "start-blocking-dialogue": (semantic, values, pair) => `显示台词 ${values.join(" · ")}`,
  "start-blocking-ui-action": (semantic, values, pair) => `显示窗口 ${values.join(" · ")}`,
  "start-event-selected-dialogue": (semantic, values, pair) => `条件台词 ${values.join(" · ")}`,
  "sound-command": (semantic, values, pair) => `播放 ${storyAudioLabel(values[0])}`,
  "switch-scene-inside-story-state": (semantic, values, pair) => `切换镜头 ${values[0]}`,
  "advance-global-screen-effect": (semantic, values, pair) => `滚屏 ${values.join(" · ")}`,
  "set-motion-attributes": (semantic, values, pair) => `运动 ${values[0]}`,
  "end-actor-script": (semantic, values, pair) => "脚本结束",
  "countdown-relative-branch": (semantic, values, pair) => `循环 ${values[semantic.count_operand_index]} 次 · 跳 ${values[semantic.branch_operand_index]}`,
  "toggle-player-control-lock": (semantic, values, pair) => "切换操控锁",
  "set-direct-frame-id": (semantic, values, pair) => `形象帧 ${values[0]}`,
  "set-actor-type-animation-renderer": (semantic, values, pair) => `动画形象 ${values[0]}`,
  "set-actor-type": (semantic, values, pair) => `形象 ${values[0]}`,
  "relative-cursor-advance": (semantic, values, pair) => `跳 ${values[0]}`,
  "move-actor-off-map": (semantic, values, pair) => "移出地图",
  "remove-actor": (semantic, values, pair) => "隐藏角色",
  "branch-if-event-flag-clear": (semantic, values, pair) => `${globalEventFlagHandle(values[0])} 分支 ${values[1]}`,
  "initialize-actor-motion-state": (semantic, values, pair) => "初始化运动",
  "set-dialogue-actor-parameter": (semantic, values, pair) => `说话人 ${values[0]}`,
  "set-story-state": (semantic, values, pair) => `剧情 ${values.join(" · ")}`,
  "end-story-state": (semantic, values, pair) => "剧情结束",
  "terminate-or-change-mode": (semantic, values, pair) => "切换模式",
  "follow-rom-waypoint-loop": (semantic, values, pair) => `沿路线 ${values[0]}`,
  "step-toward-story-target": (semantic, values, pair) => "向目标走 1 格",
  "step-toward-story-target-until-adjacent": (semantic, values, pair) => "走近目标",
  "advance-wander-motion": (semantic, values, pair) => "漫游 1 格",
  "wander-inside-rectangle": (semantic, values, pair) => `漫游 ${values.join(" · ")}`,
};
const COMMAND_NAMES = {
  "face-opposite-runtime-direction": "背向玩家", "branch-on-player-position-exact": "位置分支",
  "branch-if-runtime-result-nonzero": "结果分支", "branch-on-published-preview-route": "路线分支",
  "branch-if-runtime-slot-empty": "空槽分支", "branch-if-runtime-slot-present": "占用分支",
  "restore-party-member-health": "恢复生命", "branch-on-player-direction": "朝向分支",
  "play-rom-recovery-effect": "复活效果", "play-render-slot-offset-sequence": "偏移序列",
  "branch-on-player-position-rectangle": "范围分支", "start-scripted-encounter": "开始战斗",
  "clear-story-state-and-mode": "清除剧情", "decrement-actor-type": "前一形象",
  "set-global-parameter": "全局参数", "adopt-runtime-entity-state": "采用实体状态",
  "set-story-parameter": "镜头路线", "step-by-rom-direction-table": "按方向表走",
  "set-runtime-party-slot-index": "队伍槽", "clear-runtime-party-slot": "清除队伍槽",
  "play-table-driven-actor-transformation": "形象变换", "subtract-party-money": "扣金钱",
  "transfer-actor-to-runtime-entity": "接管实体", "mutate-field-tile-near-actor": "修改邻格",
  "relocate-runtime-target": "目标位置", "write-field-tile-at-actor": "写当前格",
  "branch-if-runtime-party-actor-type-absent": "队伍形象分支", "branch-if-runtime-slot-is-not-player-actor": "角色分支",
  "end-story-state-with-scene-context": "退出场景", "await-render-gate-then-refresh": "等刷新",
  "pop-story-actor-slot": "移除角色槽", "remove-actor-if-event-flag-set": "按事件位隐藏",
  "refresh-field-state": "刷新场景", "set-runtime-parameter-$9c": "参数 9C",
  "set-runtime-parameter-$a2": "参数 A2", "enter-dedicated-field-mode": "进入场景模式",
  "clear-runtime-entity-render-slots": "清除实体显示", "set-runtime-entity-move-direction": "实体方向",
  "replace-runtime-player-actor-type": "替换形象", "enter-field-travel-service": "场景旅行",
  "join-party-and-remove-scene-actor": "加入队伍", "release-selected-vehicle": "释放战车",
  "park-selected-vehicle": "停放战车", "branch-if-party-level-insufficient": "等级分支",
  "find-party-item-and-branch": "物品分支", "replace-party-item": "替换物品",
  "branch-if-party-money-insufficient": "金钱分支", "grant-party-item-and-branch": "获得物品",
  "branch-on-field-ui-target": "操作分支", "branch-if-party-health-insufficient": "生命分支",
  "push-temporary-field-entity": "加入临时实体",
};

function storyCommandLabel(run, command, semantic) {
  const operandCount = Math.max(0, Number(command?.readWidth || command?.normal_advance || 1) - 1,
    ...(command?.dynamic_advance_operands || []).map(index => Number(index) + 1));
  const values = (run.operands || []).slice(0, operandCount);
  const pair = `(${values[0]}, ${values[1]})`;
  return COMMAND_LABELS[run.operation]?.(semantic, values, pair) || `${COMMAND_NAMES[run.operation] || "命令"}${values.length ? ` ${values.join(" · ")}` : ""}`;
}

function storyCommandBlock(run, tone, compiled, programs, semantics, declarations, keyLabels) {
  const duration = Math.max(1, Number(run.frames) || 1);
  const program = programs.get(`${run.scriptKind}:${run.programId}`);
  if (program && !declarations.has(program)) declarations.set(program,
    new Map(program.commands.map(command => [command.cursor, command]).reverse()));
  const overflow = program?.unwrittenOverflowBytes || 0;
  const reason = program?.unwrittenReason || (overflow ? `容量不足，超出 ${overflow} 字节` : null);
  let label = storyCommandLabel(run, declarations.get(program)?.get(run.cursor), semantics.get(run.opcode) || {});
  const branch = storyBranchKeyMarkup(run, compiled);
  if (branch) label = branch.label;
  const battle = compiled.frames?.[run.start]?.battleEntry;
  if (run.operation === "start-scripted-encounter" && battle?.assumedResult === "victory")
    label = `战斗 ${battle.formationId} · 假定胜利`;
  if (run.operation === "move-actor-to-position") {
    const actor = compiled.frames?.[run.start]?.actors.find(actor => actor.actorSlot === run.actorSlot);
    if (actor) {
      const fromX = actor.motion?.fromX ?? actor.x, fromY = actor.motion?.fromY ?? actor.y;
      const distance = Math.abs(run.operands[0] - fromX) + Math.abs(run.operands[1] - fromY);
      label = `走 ${distance} 格到 (${run.operands[0]}, ${run.operands[1]})`;
    }
  }
  if (["set-story-state", "switch-scene-inside-story-state"].includes(run.operation)) {
    const snapshot = compiled.frames?.[run.start + duration];
    if (snapshot) label += ` · 相机 (${snapshot.cameraTileOriginX}, ${snapshot.cameraTileOriginY})`;
  }
  return {
    start: run.start,
    data: {"story-node": run.id, "story-command-key": "true", ...(branch ? {"story-branch-key": "true"} : {})},
    ...(duration > 1 ? {frames: duration} : {}),
    label: storyTimelineShortText(label) + (reason ? " ↛" : ""),
    labelMarkup: keyLabels ? `${eventFlagTextMarkup(storyTimelineShortText(label))}${branch?.marker || ''}` : '',
    ...(branch ? {branch: true} : {}),
    unwrittenReason: reason,
    command: run,
    tone,
    title: [label,
      reason ? `未进 ROM（${reason}）` : "",
      `第 ${run.start + 1} 帧起${duration > 1 ? ` · ${duration} 帧` : ""}`,
      `角色 ${run.actorSlot + 1}`,
      storyScriptHandle(run.scriptKind, run.programId),
      `cursor ${run.cursorHex || hex$4(run.cursor, 2)}`,
      run.operation,
    ].filter(Boolean).join(" · "),
  };
}

function storyCommandLanes(compiled, enabled, fieldsForRun, keyLabels) {
  const editable = new Map();
  const readonly = new Map();
  const programs = new Map((storyBrowserVm().programs || []).map(program => [
    `${program.kind || 'autonomous'}:${program.id}`, program,
  ]));
  const semantics = storyVmSemanticsMap();
  const declarations = new Map();
  const commandFields = new Map();
  for (const run of storyExecutionTrace(compiled).commands) {
    const identity = `${run.scriptKind}:${run.programId}:${run.cursor}:${run.opcode}`;
    if (!commandFields.has(identity)) commandFields.set(identity, fieldsForRun(run));
    const fields = commandFields.get(identity);
    if (fields.length) {
      const key = fields.map(field => field.identity).sort().join("|");
      if (!editable.has(key)) {
        editable.set(key, {key, fields, runs: [], firstStart: run.start});
      }
      const group = editable.get(key);
      group.runs.push(run);
      group.firstStart = Math.min(group.firstStart, run.start);
      continue;
    }
    if (!readonly.has(run.actorKey)) {
      readonly.set(run.actorKey, {
        key: run.actorKey,
        actorSlot: run.actorSlot,
        variantId: run.variantId,
        runs: [],
        firstStart: run.start,
      });
    }
    const group = readonly.get(run.actorKey);
    group.runs.push(run);
    group.firstStart = Math.min(group.firstStart, run.start);
  }
  const lanes = [...editable.values()].map(group => ({
    id: `operand:${group.key}`,
    label: storyTimelineFieldsLabel(group.fields),
    originalLabel: group.fields.map(field => `${field.label} · ${field.value}`).join(" / "),
    fields: group.fields,
    kind: "key",
    blocks: group.runs.map(run => storyCommandBlock(run, "operand", compiled, programs, semantics, declarations, keyLabels)),
    firstStart: group.firstStart,
  }));
  lanes.push(...[...readonly.values()].map(group => ({
    id: `command:${group.key}`,
    label: `角色 ${hex$4(group.variantId, 2).replace("0x", "")}·${hex$4(group.actorSlot, 2).replace("0x", "")} 命令`,
    originalLabel: `${storyActorHandle(group.variantId, group.actorSlot)} 命令`,
    control: `<small>${group.runs.length} 段</small>`,
    kind: "key",
    blocks: group.runs.map(run => storyCommandBlock(run, "command", compiled, programs, semantics, declarations, keyLabels)),
    firstStart: group.firstStart,
  })));
  return lanes.sort((left, right) => left.firstStart - right.firstStart
    || left.label.localeCompare(right.label));
}

function storyTimelineSourceLanes(compiled, {editable = true, fieldsForRun = () => [], keyLabels = true} = {}) {
  return storyCommandLanes(compiled, true, editable ? fieldsForRun : () => [], keyLabels);
}

// @editor-module 剧情快照只提供动作现场，显示复用场景进入、槽投影、OAM 与文本服务。

const directions = ['up', 'down', 'left', 'right'];
const available = result => {
  if (result?.status !== 'available') throw new Error(`剧情显示：${(result?.missing || [result?.continuation?.kind || result?.status]).join(', ')}`);
  return result;
};

function storyUsesSceneDisplay(compiled) {
  const first = compiled?.frames?.[0];
  return Boolean(first?.context && first.sceneId >= 0 && first.sceneId <= 0xEF && !compiled.endingAnimation);
}

async function createStoryDisplayPreview({database, readProject, workspaceDocument,
  saveDocument, saveRuntimeDocument, saveValue, saveSlot = 1, readGlyph, readCorePatterns, writeGlyphCells}) {
  const readDocument = id => database.getResourceDocument(id, null);
  const readField = source => database.getField(source.resource_id, source.entity_handle, source.field);
  const preparedSources = Promise.all([
    loadSceneDrawProjectionParameters({readDocument, readField}), loadSceneOamSources(database),
    database.getDocument('project.ui.frame-commits', null), database.getDocument('project.text-catalog', null),
    fieldSubmenuCodeValues(FIELD_SUBMENU_CODE_PARAMETERS.filter(row =>
      /^(glyph-cache-|dialogue-|confirm-|menu-text-origin-|field-ui-palette-)/.test(row.name)).map(row => row.name), readField),
    readDocument('chr-bank-mapping-service'),
    database.getDocument('project.text-providers', null),
  ]);
  const state = createSceneActionState({workspaceDocument, saveDocument, saveRuntimeDocument, saveValue, saveSlot});
  const [parameters, sources, interfaces, textCatalog, codeValues, chrPresets, providerCatalog] = await preparedSources;
  const frameCommitCatalog = interfaces.frame_commit_sources;
  const write = (id, value, index = 0) => {state.field(id, index).value = value;};
  const read = (id, index = 0) => state.field(id, index).value;
  const oamServices = createSceneOamServices({state, sources});
  const slotServices = createSceneDrawSlotServices({state, parameters,
    readDocument: id => database.peekResourceDocument(id, null),
  });
  const sceneRenderer = createSceneRenderServices({state, slotServices, oamServices});
  const actorScreenOffsets = new Map();
  const renderServices = {createExecution: options => sceneRenderer.createExecution({...options,
    advanceActions: false, advancePartyMotion: false, actorScreenOffsets})};
  const core = createSceneActionCore({readProject, database, sceneActionState: state,
    frameCommitCatalog});
  const glyphParameters = Object.fromEntries(FIELD_SUBMENU_CODE_PARAMETERS
    .filter(row => row.name.startsWith('glyph-cache-')).map(row =>
      [row.name.slice(12).replaceAll('-', '_'), fieldSubmenuCodeValue(codeValues, row.name)]));
  const runtime = dialogueRuntimeParameters(codeValues);
  const clearRectangles = Array.from({length: 3}, (_, index) => fieldSubmenuCodeValue(codeValues, `dialogue-clear-rectangle-${index}`));
  const interactions = createTextInteractionServices({state, catalog: frameCommitCatalog,
    displayServices: core.createSceneDisplayServices(),
    controllerServices: core.createControllerInputServices(interfaces.application_window_sources),
    windowCatalog: interfaces.application_window_sources,
    clearRectangles,
    recordOrigin: fieldSubmenuCodeValue(codeValues, 'menu-text-origin-low') | fieldSubmenuCodeValue(codeValues, 'menu-text-origin-high') << 8,
    renderScene: () => renderServices.createExecution(), createHookExecution: core.createSceneActionInlineExecution});
  let textCells = new Map();
  const onTextOutput = event => {
    if (event.kind === 'glyph') writeGlyphCells?.(textCells, event.glyph,
      event.cursor % 32 * 8 - (event.half ? 4 : 0), (event.cursor >> 5) * 8 - 4);
    else if (event.kind === 'tile') textCells.delete(event.position);
    else if (event.kind === 'scroll') {
      let {source, target} = event;
      for (let row = 0; row < event.rows; row++) {
        for (let column = 0; column < event.width; column++) {
          const pixels = textCells.get((source + column) & 1023);
          if (pixels) textCells.set((target + column) & 1023, pixels);
          else textCells.delete((target + column) & 1023);
        }
        source += event.source_step; target += event.target_step;
      }
    }
  };
  const textServices = core.createTextExecutionServices({...interactions, textCatalog, providerCatalog, codeValues, runtime, glyphParameters, readGlyph, onTextOutput,
    windowCatalog: interfaces.application_window_sources,
    controllerCatalog: interfaces.application_window_sources, renderServices});
  let entry = null, display = null, textKey = null;
  const entries = new Map(), textFrames = new Map(), textExecutions = new Map();
  const eventFields = state.fields().filter(field => field.fieldName.startsWith('save.active.global_event_flag.'));
  const textFields = state.fields().filter(field => (field.fieldName.startsWith('text.')
    || field.fieldName.startsWith('glyph.') || field.fieldName.startsWith('display.')
    || field.fieldName.startsWith('controller.') || field.fieldName === 'control.displayProfile')
    && field.knowledge === 'confirmed'
    && !['display.oamShadow', 'display.oamPending', 'display.frameCounter'].includes(field.fieldName));
  const buttons = a => Object.fromEntries(['a', 'b', 'select', 'start', ...directions].map(name => [name, name === 'a' && a]));
  const advanceAudio = ({state, display}) => ({status: 'available', state, display, effects: []});
  function drain(execution, {page = null, initial = null} = {}) {
    let result = initial || execution.advance(), ticks = 0;
    while (result.status === 'pending') {
      if (result.missing?.some(value => value !== result.continuation?.kind))
        throw new Error(`剧情文本：${result.missing.join(', ')}`);
      if (result.display) display = result.display;
      const confirmation = result.continuation?.kind === 'text-frame' && result.continuation.wait === 'controller';
      if (page !== null && confirmation && result.page >= page && !read('controller.current')) {
        result = execution.advance({display, buttons: buttons(false), advanceAudio});
        if (result.display) display = result.display;
        break;
      }
      if (++ticks > 8192) throw new Error('剧情文本未到达稳定边界');
      const choosing = result.continuation?.kind === 'text-choice';
      result = execution.advance({display, buttons: buttons((confirmation || choosing) && !(ticks & 1)), advanceAudio});
      if (result.status === 'pending' && result.missing?.length && !result.frame && !result.display)
        throw new Error(`剧情文本：${result.missing.join(', ')}`);
    }
    if (result.display) display = result.display;
    if (page === null) available(result);
    return result;
  }
  const position = (family, index, actor) => {
    const pose = actor.renderPose || actor, motion = pose.motion;
    write(`${family}.x`, (motion ? motion.toX : Math.round(pose.x)) & 255, index);
    write(`${family}.y`, (motion ? motion.toY : Math.round(pose.y)) & 255, index);
    write(`${family}.direction`, Math.max(0, directions.indexOf(pose.direction || actor.direction)), index);
    write(`${family}.motionPhase`, motion ? Math.max(0, Math.round(32 * (1 - motion.elapsed / motion.duration))) : 0, index);
    const direction = motion ? directions.findIndex(name => ({up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0]})[name]
      .every((delta, axis) => delta === Math.sign((axis ? motion.toY - motion.fromY : motion.toX - motion.fromX)))) + 1 : 0;
    write(`${family}.${family === 'party' ? 'motionDirection' : 'movementResult'}`, direction, index);
  };
  async function initialize(snapshot) {
    actorScreenOffsets.clear();
    // 横向32列保留可见旧列，纵向15行按格步目标覆盖旧行。
    const cameraX = Math.floor(snapshot.backgroundCameraTileOriginX ?? snapshot.cameraTileOriginX);
    const cameraY = Math.floor(snapshot.cameraTileOriginY);
    const mapChanges = (snapshot.fieldTiles || []).filter(tile => tile.sceneId === snapshot.sceneId)
      .map(tile => ({x: tile.x, y: tile.y, metatileId: tile.tileId}));
    const scrollTiles = {
      x: cameraX - Math.floor(snapshot.displayEntryCameraX ?? snapshot.cameraTileOriginX),
      y: cameraY - Math.floor(snapshot.displayEntryCameraY ?? snapshot.cameraTileOriginY),
    };
    const key = JSON.stringify([snapshot.sceneId, snapshot.actorListId, cameraX,
      cameraY, (snapshot.sceneMapEventFlags || snapshot.eventFlags || []).filter(flag => flag >= 8), mapChanges, scrollTiles]);
    const source = `scene:${snapshot.sceneId.toString(16).toUpperCase().padStart(2, '0')}`;
    const version = database.fieldRevision?.(source) ?? null;
    if (entry?.key === key && entry.sceneVersion === version) return;
    const cached = entries.get(key);
    if (cached && cached.entry.sceneVersion === version) {
      state.restore(cached.state); entry = cached.entry;
      display = packSceneDisplayDevice(entry.display); textKey = null; textCells = new Map(); return;
    }
    entry = available(await initializeSceneContext({state, readDocument, readField,
      createRenderServices: async () => {
        write('dispatch.commandWindow', Array(6).fill(0));
        return renderServices;
      },
      entry: {sceneId: snapshot.sceneId, cameraX,
        cameraY, storyState: snapshot.storyState || 0, mapChanges, scrollTiles}}));
    entry.scrollTiles = scrollTiles;
    entry.sceneVersion = database.fieldRevision?.(source) ?? null;
    entry.key = key; display = packSceneDisplayDevice(entry.display); textKey = null;
    textCells = new Map();
    for (const id of ['text.windowOffset', 'text.command', 'text.nestedState', 'text.active',
      'text.windowRow', 'text.nextRecord', 'text.regionId', 'text.clearPreset', 'text.recordCounter',
      'text.mode', 'text.outputCount', 'text.characterDelay']) write(id, 0);
    for (const field of state.fields().filter(field => ['oam.secondaryDescriptor', 'oam.secondaryFrame',
      'oam.secondaryX', 'oam.secondaryY'].includes(field.fieldName))) field.value = 0;
    entries.set(key, {entry, state: state.capture()});
    if (entries.size > 16) entries.delete(entries.keys().next().value);
  }
  function project(snapshot) {
    const pixel = (coordinate, anchor) => (((Math.floor(coordinate) + anchor) & 255) * 16
      + Math.round((coordinate - Math.floor(coordinate)) * 16)) & 65535;
    write('field.cameraPixelX', pixel(snapshot.actorCameraTileOriginX ?? snapshot.fieldCameraTileOriginX
      ?? snapshot.cameraTileOriginX, 9));
    write('field.cameraPixelY', pixel(snapshot.actorCameraTileOriginY ?? snapshot.fieldCameraTileOriginY
      ?? snapshot.cameraTileOriginY, 8));
    write('display.frameCounter', snapshot.renderFrameParity || 0);
    write('parameter.frameCountdown', 0);
    write('control.storyState', snapshot.storyState || 0);
    write('control.controlLock', snapshot.controlLock || 0);
    write('parameter.result', snapshot.runtimeResultD5 || 0);
    write('parameter.story', snapshot.parameters?.storyParameter || 0);
    for (let slot = 0; slot < 16; slot++) if ((read('render.marker', slot) & 63) !== 5) {
      write('render.marker', 0, slot); write('render.frame', 0, slot);
    }
    for (const actor of snapshot.actors || []) {
      if (actor.hidden || !Number.isInteger(actor.actorSlot) || actor.actorSlot >= 14) continue;
      const index = actor.actorSlot, slot = actor.renderSlot;
      if (!Number.isInteger(slot) || slot < 0 || slot > 15) continue;
      position('actor', index, actor);
      const pose = actor.renderPose || actor;
      if (pose.screenOffsetX || pose.screenOffsetY)
        actorScreenOffsets.set(slot, {x: pose.screenOffsetX || 0, y: pose.screenOffsetY || 0});
      write('actor.type', actor.renderPose?.actorType ?? actor.actorType, index);
      write('actor.motionAttributes', actor.motionAttributes || 0, index);
      write('render.marker', actor.renderMode === 'type-animation' ? 0x83 : actor.renderMode === 'direct-actor-frame' ? 0x44 : 4, slot);
      write('render.actorIndex', index, slot);
    }
    const usedParty = new Set((snapshot.actors || []).filter(actor => !actor.hidden && actor.partySlot != null).map(actor => actor.partySlot));
    for (const actor of snapshot.partyActors || []) {
      if (usedParty.has(actor.partySlot)) continue;
      const index = actor.fieldEntityIndex ?? actor.partySlot;
      if (index < 0 || index > 3) continue;
      let slot = 15;
      while (slot >= 0 && read('render.marker', slot)) slot--;
      if (slot < 0) break;
      position('party', index, actor);
      write('party.order', actor.partySlot, index);
      write('party.renderState', actor.actorType, index);
      write('render.marker', actor.renderMode === 'direct-actor-frame' ? 0x42 : 0x81, slot);
      write('render.actorIndex', index, slot);
    }
    for (const field of eventFields)
      field.value = Number((snapshot.eventFlags || []).includes(parseInt(field.fieldName.split('.').at(-1), 16)));
    const rendered = available(renderServices.createExecution({projectCamera: false}).advance());
    display = {...display, oam: Uint8Array.from(requireFrameVector(read('display.oamShadow'), 256, 'oam'))};
    write('display.oamPending', 0);
    return rendered;
  }
  function dialogue(snapshot) {
    const line = snapshot.dialogue;
    if (!line) {textKey = null; textCells = new Map(); return;}
    if (!line.recordFound || line.synthetic || line.uiScreenId) throw new Error('剧情台词缺少文本执行入口');
    const recordKey = JSON.stringify([entry.key, entry.sceneVersion, line.regionId, line.recordId, line.commandCursor,
      line.prefixRecordId, line.interactionWindow]);
    const page = line.pageIndex || 0, key = `${recordKey}:${page}`;
    if (textKey === key) return;
    const cached = textFrames.get(key);
    if (cached) {
      for (const field of cached.fields) write(field.id, cloneFrameValue(field.value), field.index);
      display = {...display, ...cloneFrameValue(cached.display)};
      textCells = new Map(cached.textCells); textKey = key; return;
    }
    const continuing = textExecutions.get(recordKey);
    if (continuing && continuing.page < page) {
      for (const field of continuing.fields) write(field.id, cloneFrameValue(field.value), field.index);
      display = {...display, ...cloneFrameValue(continuing.display)};
      textCells = new Map(continuing.textCells);
      drain(continuing.execution, {page, initial: continuing.execution.advance({display, buttons: buttons(true), advanceAudio})});
      remember(continuing.execution); return;
    }
    display = {...display, chr_ram: Uint8Array.from(requireFrameVector(readCorePatterns(), 2048, 'chr_ram'))};
    const preset = chrPresets.shared_chr_bank_register_4_5_preset_pairs[1];
    const banks = [...chrPresets.shared_chr_bank_register_0_3_prefix, preset.register_4, preset.register_5];
    write('display.primaryChrBanks', banks); write('display.rasterChrBanks', banks);
    write('display.textCameraX', entry.scrollTiles.x & 255); write('display.textCameraY', entry.scrollTiles.y & 255);
    write('display.logicalAttributeGate', 0);
    write('display.logicalTiles', Array(1024).fill(255));
    textCells = new Map();
    write('text.recordCounter', 0); write('text.active', 0);
    write('text.outputPointer', 0x6000 + readProject().ui.construction.dialogue_runtime.logical_layout_origin);
    drain(textServices.createExecution({record: line.interactionWindow ? 'record:03:007'
      : readProject().ui.construction.dialogue_runtime.common_layout_record, finalConfirmation: false}));
    const palette = [...read('display.paletteShadow')];
    ['background', 'foreground', 'light', 'dark'].forEach((name, index) => {
      palette[12 + index] = fieldSubmenuCodeValue(codeValues, `field-ui-palette-${name}`);
    });
    write('display.paletteShadow', palette); write('display.palettePending', 255);
    write('display.textCameraX', entry.scrollTiles.x & 255); write('display.textCameraY', entry.scrollTiles.y & 255);
    write('display.rasterCtrl', entry.display.ppu_ctrl);
    write('control.displayProfile', 1);
    write('text.windowOffset', line.interactionWindow ? 0x4C : runtime.text_origin);
    write('text.windowRow', line.interactionWindow ? 0x0E : runtime.line_origin);
    const clearPreset = line.interactionWindow ? 0
      : clearRectangles.indexOf(readProject().ui.construction.dialogue_runtime.clear_rectangle.selector);
    if (clearPreset < 0) throw new Error('剧情对白缺少清除矩形');
    write('text.command', 0); write('text.clearPreset', clearPreset); write('text.characterDelay', 0);
    write('text.recordCounter', 1); write('parameter.dialogueActor', line.prefixRecordId || 0);
    write('control.activeActor', line.actorSlot || 0);
    drain(interactions.prepareRecord({display}));
    const execution = textServices.createExecution({record: `record:${line.regionId.toString(16).toUpperCase().padStart(2, '0')}:${String(line.recordId).padStart(3, '0')}`});
    drain(execution, {page}); remember(execution);
    function remember(execution) {
      const cached = cloneFrameValue({display: Object.fromEntries(Object.entries(display).filter(([name]) => name !== 'oam')),
        textCells: [...textCells],
        fields: textFields.filter(field => field.value !== null).map(field => ({id: field.fieldName, index: field.index, value: field.value}))});
      textFrames.set(key, cached); textExecutions.set(recordKey, {...cached, page, execution});
      if (textFrames.size > 32) textFrames.delete(textFrames.keys().next().value);
      if (textExecutions.size > 16) textExecutions.delete(textExecutions.keys().next().value);
      textKey = key;
    }
  }
  return {async render(snapshot) {
    const before = state.capture(), previousEntry = entry, previousDisplay = display, previousTextKey = textKey,
      previousTextCells = new Map(textCells);
    try {
      for (const field of eventFields)
        field.value = Number((snapshot.sceneMapEventFlags || snapshot.eventFlags || []).includes(parseInt(field.fieldName.split('.').at(-1), 16)));
      await initialize(snapshot);
      if (!snapshot.dialogue) {
        display = packSceneDisplayDevice(entry.display);
        write('control.displayProfile', 0); write('display.chrShadow', [...entry.display.chr_banks]);
        write('display.paletteShadow', [...entry.display.ppu_palette]);
      }
      write('control.displayProfile', snapshot.dialogue ? 1 : 0);
      const rendered = project(snapshot);
      const offset = (coordinate, origin) => Math.round((coordinate - Math.floor(origin)) * 16);
      display = {...display,
        scroll_x: (entry.display.scroll_x + offset(snapshot.backgroundCameraTileOriginX ?? snapshot.cameraTileOriginX,
          snapshot.backgroundCameraTileOriginX ?? snapshot.cameraTileOriginX)) & 255,
        scroll_y: ((entry.display.scroll_y + offset(snapshot.backgroundCameraTileOriginY ?? snapshot.cameraTileOriginY,
          snapshot.cameraTileOriginY)) % 240 + 240) % 240};
      dialogue(snapshot);
      const banks = [...read('display.chrShadow')];
      banks[1] = requireFrameByte({spritePair: snapshot.parameters?.spritePair ?? entry.display.chr_banks[1]}, 'spritePair');
      write('display.chrShadow', banks);
      display = {...display, chr_banks: Uint8Array.from(banks)};
      const raster = available(core.createSceneDisplayServices().rasterFrame(display));
      const result = {status: 'available', display: unpackSceneDisplayDevice(display, entry.display),
        textCells: new Map([...textCells].map(([position, pixels]) => {
          let x = ((read('display.textCameraX') << 1) + (position & 31)) & 255;
          if (read('display.nametablePage')) x ^= 32;
          let y = ((read('display.textCameraY') << 1) + (position >> 5)) & 255;
          if (y >= 30) y = (y - 30) & 255;
          return [(x & 32) * 32 + (y & 31) * 32 + (x & 31), pixels];
        })),
        raster: unpackSceneDisplayRaster(raster, entry.display), state: state.capture(), rendered,
        randomActors: (snapshot.actors || []).filter(actor => actor.currentCommand?.operation?.includes('wander')).map(actor => actor.actorSlot)};
      return result;
    } catch (error) {
      state.restore(before); entry = previousEntry; display = previousDisplay; textKey = previousTextKey;
      textCells = previousTextCells;
      textExecutions.clear();
      throw error;
    }
  }, state, core};
}

// @editor-module 剧情显示从当前仓库和存档建立现场，完整画面按当前显示构造直接合成。

const previews = new WeakMap();
const sourceIds = ['scene-actor-runtime', 'scene-actor', 'actor-visual', 'metatile-page', 'metatile-set',
  'metasprite-record', 'metasprite', 'direct-frame', 'battle-action', 'battle-object-layout',
  'shared-chr-bank', 'core-latin', 'char', 'text.character-map', 'text-record', 'text-render-runtime',
  'code-module', 'code-module:application-dialogue-flow-vm', 'chr-bank-mapping-service',
  'field-scene-lifecycle-service', 'party-field-actor-type-map', 'vehicle-visual-selector',
  'runtime-workspace', 'save-container'];
const sceneSource = scene => `scene:${scene.toString(16).toUpperCase().padStart(2, '0')}`;
const sourceVersions = () => sourceIds.map(id => db.fieldRevision(id));
const sourcesChanged = (before, after) => before.some((version, index) => version !== null && version !== after[index]);
const wholeScreen = [{x: 0, y: 0, width: 256, height: 240}];

function prepareStorySceneDisplay(sceneId) {
  const readField = source => db.getField(source.resource_id, source.entity_handle, source.field);
  return Promise.all([prepareSaveEditorWorkspace(),
    ...['runtime-workspace', 'save-container', 'scene-actor-runtime', 'actor-visual',
      'metasprite-record', 'metasprite', 'direct-frame', 'battle-action', 'battle-object-layout']
      .map(id => db.getResourceDocument(id)),
    ...[sceneSource(sceneId), 'metatile-page', 'metatile-set', 'party-field-actor-type-map',
      'vehicle-visual-selector', 'chr-bank-mapping-service'].map(id => db.getResourceDocument(id, null)),
    db.getDocument('project.ui.frame-commits', null), db.getDocument('project.text-catalog', null),
    db.getDocument('project.text-providers', null), loadSceneOamSources(db),
    loadSceneDrawProjectionParameters({readDocument: id => db.getResourceDocument(id, null), readField}),
    fieldSubmenuCodeValues(FIELD_SUBMENU_CODE_PARAMETERS.filter(row =>
      /^(glyph-cache-|dialogue-|confirm-|menu-text-origin-|field-ui-palette-)/.test(row.name)).map(row => row.name), readField)]);
}

async function paintStorySceneDisplay(canvas, compiled, snapshot, isCurrent = () => true, sourceSnapshot = snapshot) {
  if (!storyUsesSceneDisplay(compiled) || !snapshot.cameraKnown || snapshot.sceneId < 0 || snapshot.sceneId > 0xEF) return false;
  const repository = state.projectRepository, saveBytes = state.saveCurrentBytes;
  const versions = sourceVersions(), sceneVersion = db.fieldRevision(sceneSource(snapshot.sceneId));
  const saveSlot = state.savePageSlot || 1;
  let cached = previews.get(compiled);
  if (cached && !db.isPreviewProjectionCurrent('story-display-context', await cached.promise)) cached = null;
  if (!cached || cached.repository !== repository || cached.saveBytes !== saveBytes
      || cached.saveSlot !== saveSlot || sourcesChanged(cached.versions, versions)
      || cached.scenes.has(snapshot.sceneId) && cached.scenes.get(snapshot.sceneId) !== sceneVersion) {
    const promise = (async () => {
      const [, workspaceDocument, saveRuntimeDocument] = await prepareStorySceneDisplay(snapshot.sceneId);
      if (!state.saveCurrentBytes || !state.saveByteMapDocument) throw new Error(state.saveError || '剧情显示缺少存档现场');
      return db.reusePreviewProjection('story-display-context', [state.saveCurrentBytes, saveSlot], async () => {
        let glyphs = null;
        const glyphBitmaps = new Map();
        const services = await createStoryDisplayPreview({database: db, readProject: () => state.project,
          workspaceDocument, saveDocument: state.saveByteMapDocument, saveRuntimeDocument,
          saveValue: saveCurrentValue(state.saveCurrentBytes), saveSlot,
          readCorePatterns: () => Uint8Array.from(glyphs.corePatterns),
          writeGlyphCells: (cells, handle, x, y) => {
            const [, lead, selector] = handle.split(':');
            const index = uiGlyphId(glyphs.model, parseInt(lead, 16), parseInt(selector, 16));
            uiWriteGlyphCells(cells, glyphs.glyphs, index, x, y);
          },
          readGlyph: handle => {
            if (glyphBitmaps.has(handle)) return glyphBitmaps.get(handle);
            const [, lead, selector] = handle.split(':');
            const index = uiGlyphId(glyphs?.model || {}, parseInt(lead, 16), parseInt(selector, 16));
            if (index === null) throw new Error(`剧情文字缺少字形：${handle}`);
            const bitmap = glyphs.glyphs.slice(index * 18, (index + 1) * 18);
            glyphBitmaps.set(handle, bitmap); return bitmap;
          }});
        let tail = Promise.resolve();
        return {services, async render(snapshot) {
          const previous = tail;
          let release;
          tail = new Promise(resolve => {release = resolve;});
          await previous;
          try {
            if (snapshot.dialogue && !glyphs) glyphs = await uiJsRenderSources();
            return await services.render(snapshot);
          } finally {release();}
        }};
      }, {sources: sourceIds.map(id => ({kind: id === 'text.character-map' ? 'table' : 'field', id}))});
    })();
    const entries = new WeakMap();
    let sceneEntry = null;
    for (const frame of compiled.frames) {
      if (!sceneEntry || sceneEntry.sceneId !== frame.sceneId)
        sceneEntry = {sceneId: frame.sceneId, displayEntryCameraX: frame.cameraTileOriginX,
          displayEntryCameraY: frame.cameraTileOriginY};
      entries.set(frame, sceneEntry);
    }
    cached = {repository, saveBytes, saveSlot, versions, promise, entries, scenes: new Map(), frames: new Map(),
      composition: {}, tail: Promise.resolve()};
    previews.set(compiled, cached);
    promise.catch(() => {if (previews.get(compiled) === cached) previews.delete(compiled);});
  }
  const previous = cached.tail;
  let release;
  cached.tail = new Promise(resolve => {release = resolve;});
  await previous;
  try {
    if (!isCurrent()) return false;
    let painted = cached.frames.get(snapshot);
    if (!painted) {
      const preview = await cached.promise;
      cached.saveBytes = state.saveCurrentBytes;
      const versions = sourceVersions(), sceneVersion = db.fieldRevision(sceneSource(snapshot.sceneId));
      const frame = await preview.render({...snapshot, ...cached.entries.get(sourceSnapshot)});
      const signature = JSON.stringify([frame.display.mirroring, frame.raster.frame.phases]);
      const previous = cached.last;
      const raster = previous?.signature === signature && sameFrameVector(previous.display.chr_ram, frame.display.chr_ram)
        ? previous.raster : await resolveRasterDisplayResult(frame.raster, frame.raster.state, loadChrBankBytes);
      if (raster.status !== 'available') throw new Error(raster.missing.join(', '));
      const unchanged = previous?.signature === signature
        && sameFrameVector(previous.display.nametables, frame.display.nametables)
        && sameFrameVector(previous.display.ppu_palette, frame.display.ppu_palette)
        && sameFrameVector(previous.display.oam, frame.display.oam)
        && sameFrameVector(previous.display.chr_ram, frame.display.chr_ram)
        && previous.textCells?.size === frame.textCells.size
        && [...frame.textCells].every(([position, pixels]) => sameFrameVector(previous.textCells.get(position), pixels));
      const regions = unchanged ? [] : wholeScreen;
      const image = regions.length ? {width: 256, height: 240,
        data: previous ? previous.image.data.slice() : new Uint8ClampedArray(256 * 240 * 4)} : previous.image;
      if (regions.length) uiPaintFrameComposition(image, {frame_state: frame.display, pattern_table: raster.frame.phases[0].pattern_table,
        raster_frame: raster.frame, regions, text_cells: frame.textCells}, undefined, cached.composition);
      const currentVersions = sourceVersions(), currentSceneVersion = db.fieldRevision(sceneSource(snapshot.sceneId));
      if (sourcesChanged(versions, currentVersions) || sceneVersion !== null && sceneVersion !== currentSceneVersion) return false;
      cached.versions = currentVersions;
      cached.scenes.set(snapshot.sceneId, currentSceneVersion);
      painted = {image, display: frame.display, raster, signature, textCells: frame.textCells};
      cached.frames.set(snapshot, painted);
      if (cached.frames.size > 32) cached.frames.delete(cached.frames.keys().next().value);
    }
    if (state.projectRepository !== repository || !isCurrent()
        || cached.saveBytes !== state.saveCurrentBytes || saveSlot !== (state.savePageSlot || 1)
        || sourcesChanged(cached.versions, sourceVersions())
        || cached.scenes.get(snapshot.sceneId) !== db.fieldRevision(sceneSource(snapshot.sceneId))) return false;
    cached.last = painted;
    await paintScenePreview(canvas, {raster: painted.image});
    return true;
  } finally {release();}
}

// @editor-module 剧情播放 UI 与状态推进

// 这一栏一次只编辑一条剧情，恢复目标唯一；共用按钮仍要一个 itemId。
const STORY_RESET_ITEM_ID = "cutscene";

const storyAudioPlayers = new WeakMap();
const storyTimelineModels = new Map();
const storyTimelineExpansions = new Map();
const storyPlaybackMarkup = new WeakMap();
const storyPlaybackControls = new WeakMap();
const storyTimelineViewports = new Map();
const storyAnimationSnapshots = new WeakMap();
const storyMounts = new Map();
const boundStoryTimelines = new WeakSet();
const completedStoryPlaybackStates = new WeakMap();
let mountedStory = null;
let storyMountGeneration = 0;

const storyMountKey = () => JSON.stringify([state.view, state.storyPageId, state.storySequenceId]);

function storyMountViewport(view) {
  let stage = null;
  try {stage = localStorage.getItem(`canvas-viewport:story:${view}`);} catch { /* 视口存储不可用时保留页内状态。 */ }
  return JSON.stringify([storyViewport(view), stage]);
}

function storyPlaybackState(stage) {
  const id = Number(stage.dataset.storyVmVariant);
  return {key: JSON.stringify([storyCardFrame(id), state.storyCardPaused.has(id),
    state.storyPlaying, state.storySpeed, state.storyTimelineRowId,
    stage.dataset.storySelectedNode, stage.dataset.storySelectedEvent]),
    saveBytes: state.saveCurrentBytes, saveSlot: state.savePageSlot};
}

function storyPlaybackStateMatches(stage) {
  const previous = completedStoryPlaybackStates.get(stage);
  const current = storyPlaybackState(stage);
  return previous && Object.keys(current).every(key => previous[key] === current[key]);
}

function disposeStoryMount(mount) {
  for (const stage of mount.nodes.flatMap(node => [...(node.querySelectorAll?.('[data-story-vm-variant]') || [])])) {
    storyAudioPlayers.get(stage)?.player.dispose();
    disposeStoryStage(stage);
  }
}

function leaveStoryPlayback(content) {
  storyMountGeneration += 1;
  storyTimelineObjectListener?.abort();
  content.querySelectorAll('[data-story-vm-variant]').forEach(suspendStoryStage);
  if (!mountedStory) {
    for (const stage of content.querySelectorAll('[data-story-vm-variant]')) {
      if ([...storyMounts.values()].some(mount => mount.nodes.some(node => node.contains?.(stage)))) continue;
      storyAudioPlayers.get(stage)?.player.dispose();
      disposeStoryStage(stage);
    }
    return;
  }
  for (const stage of content.querySelectorAll('[data-story-vm-variant]')) {
    const audio = storyAudioPlayers.get(stage);
    audio?.player.stop();
    if (audio) audio.playing = false;
  }
  if (content.dataset.renderedView === mountedStory.view) {
    mountedStory.nodes = [...content.childNodes].filter(node => !node.matches?.('.page-head'));
    mountedStory.workbench = storyWorkbenchMountState();
    mountedStory.viewport = storyMountViewport(mountedStory.view);
    mountedStory.models = new Map(storyTimelineModels);
    mountedStory.heading = content.querySelector('[data-story-page-heading]');
    mountedStory.onclick = content.onclick;
    mountedStory.onkeydown = content.onkeydown;
    const previous = storyMounts.get(mountedStory.key);
    if (previous && previous !== mountedStory) disposeStoryMount(previous);
    storyMounts.delete(mountedStory.key);
    storyMounts.set(mountedStory.key, mountedStory);
    while (storyMounts.size > 2) {
      const key = storyMounts.keys().next().value;
      disposeStoryMount(storyMounts.get(key));
      storyMounts.delete(key);
    }
  }
  mountedStory = null;
  content.onclick = null;
  content.onkeydown = null;
}

async function rememberStoryPlayback(content) {
  const generation = storyMountGeneration;
  const key = storyMountKey();
  const view = state.view;
  const input = [state.project, state.projectRepository];
  const {sources} = await db.collectPreviewSources(() => null, {includeLoaded: true});
  const token = await db.reusePreviewProjection(`story-mount:${key}`,
    input, () => ({}), {sources});
  if (generation !== storyMountGeneration || view !== state.view) return;
  mountedStory = {key, view, token, models: new Map(storyTimelineModels), nodes: []};
}

function restoreStoryPlayback(content) {
  const sequence = storyVmSelectedSequenceForView();
  if (sequence) state.storySequenceId = sequence.id;
  const key = storyMountKey();
  const mount = storyMounts.get(key);
  if (!mount) return false;
  if (!db.isPreviewProjectionCurrent(`story-mount:${key}`, mount.token)
      || mount.viewport !== storyMountViewport(state.view)) {
    disposeStoryMount(mount);
    storyMounts.delete(key);
    return false;
  }
  const entry = mount.workbench.context?.entry;
  if (entry && entry.compiled !== buildStoryVmSequence(entry.sequence, entry.variant,
      storyPartyRuntimeOverrides(entry.sequence.id))) {
    disposeStoryMount(mount);
    storyMounts.delete(key);
    return false;
  }
  content.replaceChildren(...mount.nodes);
  content.querySelectorAll('[data-story-vm-variant]').forEach(resumeStoryStage);
  if (mount.heading) content.prepend(mount.heading);
  restoreStoryWorkbenchMount(mount.workbench);
  storyTimelineModels.clear();
  for (const [id, model] of mount.models) storyTimelineModels.set(id, model);
  content.onclick = mount.onclick;
  content.onkeydown = mount.onkeydown;
  mountedStory = mount;
  return true;
}

function storyAnimationSnapshot(source, phase) {
  if (!source || phase === source.backgroundAnimationPhase) return source;
  let phases = storyAnimationSnapshots.get(source);
  if (!phases) storyAnimationSnapshots.set(source, phases = new Map());
  if (!phases.has(phase)) phases.set(phase, {...source, backgroundAnimationPhase: phase});
  return phases.get(phase);
}

function storyViewport(view) {
  if (!storyTimelineViewports.has(view)) {
    let stored = {};
    try {stored = JSON.parse(localStorage.getItem(`story-timeline-viewport:${view}`) || '{}');} catch { /* 本机无值时适应。 */ }
    storyTimelineViewports.set(view, stored);
  }
  return storyTimelineViewports.get(view);
}

function storyToolbarEmpty() {
  return ['插入', '删除指令', '前移', '后移', '复制'].map(label =>
    `<button type="button" class="button ghost" disabled title="请先选中指令键或指令轨的开头／结尾插入点">${label}</button>`).join('')
    + resetToOriginalButton('script-unselected', {disabled: true, title: "重置脚本；请先选中指令键或插入点"});
}

function storyPlaybackControl(stage, card, selector) {
  let controls = storyPlaybackControls.get(stage);
  if (!controls) storyPlaybackControls.set(stage, controls = new Map());
  const cached = controls.get(selector);
  if (cached?.isConnected && card.contains(cached)) return cached;
  const node = card.querySelector(selector);
  controls.set(selector, node);
  return node;
}

function syncStoryPlaybackMarkup(node, markup) {
  if (!node || storyPlaybackMarkup.get(node) === markup) return;
  node.innerHTML = markup;
  storyPlaybackMarkup.set(node, markup);
}

function syncStoryPlaybackText(node, text) {
  if (!node || node.textContent === text) return;
  if (node.childNodes.length === 1 && node.firstChild.nodeType === globalThis.Node.TEXT_NODE) node.firstChild.nodeValue = text;
  else node.textContent = text;
}

function syncStoryPlaybackHidden(node, hidden) {
  if (node.hidden !== hidden) node.hidden = hidden;
}

function storyTreeExpansions(view) {
  if (!storyTimelineExpansions.has(view)) {
    let stored = [];
    try { stored = JSON.parse(localStorage.getItem(`story-timeline-tree:${view}`) || "[]"); } catch { /* 无本机值时根展开。 */ }
    storyTimelineExpansions.set(view, new Map(stored));
  }
  return storyTimelineExpansions.get(view);
}

function setStoryTreeExpanded(root, id, expanded) {
  const model = storyTimelineModels.get(root.dataset.tl);
  if (!model) return;
  const expansions = storyTreeExpansions(model.view);
  expansions.set(id, expanded);
  for (const lane of model.lanes) lane.expanded = expansions.get(lane.id) !== false;
  try { localStorage.setItem(`story-timeline-tree:${model.view}`, JSON.stringify([...expansions])); } catch { /* 本机存储不可用时保留会话值。 */ }
  syncTimelineTree(root, expansions);
}

async function prepareStoryAudio() {
  const selected = storyVmSelectedSequenceForView();
  const sequences = selected ? [selected] : [];
  const lists = storyVmAllActorLists();
  const ids = new Set(sequences.flatMap(sequence => {
    const variants = new Set([sequence.entry_variant_id, ...(sequence.actor_list_ids || [])].map(Number));
    return [
      ...lists.filter(item => variants.has(Number(item.id))).flatMap(item => item.scene_contexts || []),
      ...(sequence.shots || []), ...(sequence.ending_animation?.scene_contexts || []),
    ].map(context => Number(context.scene_id));
  }).filter(id => Number.isInteger(id) && id >= 0 && id < 0xF0));
  for (const sequence of sequences) {
    const entryScene = sequence.preview_entry?.scene_entry_bootstrap?.scene_id
      ?? sequence.preview_entry?.field_traversal?.entry_transition?.scene_id
      ?? sequence.preview_entry?.field_bootstrap?.scene_id;
    if (entryScene != null) ids.add(Number(entryScene));
  }
  await Promise.all([
    ...[...ids].map(id => db.getResourceDocument(recordUid("scene", id), null)),
    db.getResourceDocument("metatile-page", null),
    db.getResourceDocument("metatile-set", null),
    db.getResourceDocument("palette-runtime-service", null),
    db.getResourceDocument("scene-actor-runtime", null),
    db.getResourceDocument("field-terrain-behavior-service", null),
    db.getDocument("vehicle-visual-selector", null),
    db.getResourceDocument("encounter-formation", null),
  ]);
}

function syncStoryAudio(stage, compiled, frame, paused) {
  let playback = storyAudioPlayers.get(stage);
  if (!previewSoundEnabled()) {
    if (playback?.playing) playback.player.stop();
    if (playback) playback.playing = false;
    return;
  }
  if (!state.project.audio?.sequence_graph) return;
  if (!playback || playback.compiled !== compiled) {
    playback?.player.dispose();
    playback = {compiled, player: createAudioTimelinePlayer(state.project.audio,
      compiled.audioEvents || [], compiled.duration), playing: false, frame, speed: state.storySpeed};
    storyAudioPlayers.set(stage, playback);
  }
  if (paused) {
    if (playback.playing) playback.player.stop();
    playback.playing = false;
  } else if ((!playback.playing || frame < playback.frame || playback.speed !== state.storySpeed)
      && (globalThis.navigator?.userActivation?.isActive || playback.player.unlocked)) {
    playback.playing = true;
    playback.speed = state.storySpeed;
    void playback.player.play(() => storyTimelineFrame(compiled, Number(stage.dataset.storyVmVariant),
      storyCardFrame(Number(stage.dataset.storyVmVariant))
        + (performance.now() - state.storyLastTick) * 60 / 1000 * state.storySpeed),
      state.storySpeed).catch(error => {
      showEditorError(storyPlaybackCard(stage), "剧情声音播放失败", error);
    });
  }
  playback.frame = frame;
}


//
// 来源：拆分前 engine/editor/app.js 第 6541-7168 行。


function storyPlayerViewActive() {
  return storyPlaybackView(state.view);
}


// 音频事件本身已经是时间轴上的一条轨（见 storyTimelineMarkup），这里只留时间轴
// 上没有的那部分：$6F 清除时**没被采用**的那条分支——它不发生在任何一帧上，
// 放进轨道就是在时间轴上画一件没发生的事。
function storyAudioAlternateMarkup(animation) {
  const alternate = animation?.audio?.alternate_branch_cues || [];
  if (!alternate.length) return "";
  return `<details class="story-audio-alternate">
    <summary>${storyResourceMarkup(recordUid("global-event-flag", 0x6F))} clear · 未采用音频分支（${alternate.length}）</summary>
    <div>${alternate.map(event => `<button type="button" class="resource-inline-link"
      data-resource-target="${esc(event.resource_id)}" title="${esc(event.resource_id)}">${handleMarkup(event.resource_id)} ${esc(event.role === "fade-control" ? event.label || "" : storyAudioLabel(event.command_id))} · ${
      esc(event.role)}</button>`).join("")}</div>
  </details>`;
}

function renderStoryPlayback(view = state.view) {
  storyTimelineModels.clear();
  return storyPageIoMarkup() + renderStoryWorkbench(
    view,
    entry => storyStageMarkup(entry, view),
    storyEditableTimelinePanelMarkup,
    entry => storyEditableWorkbenchView(view) ? '' : `<div class="page-global-info">
      <span class="mono">${esc(entry.logicalIndex)}</span>
      <b>${esc(entry.label)}</b>
      <span>${esc(entry.sequence.kind)} · ${esc(entry.controlLabel)}</span>
      ${storyPlaybackReadoutsMarkup(entry)}
      ${storyTimelineMarkup(entry.compiled, entry.variant)}
      ${storyAudioAlternateMarkup(entry.sequence.ending_animation)}
    </div>`,
  );
}

// `[data-story-vm-variant]` 是唯一的舞台与播放身份。所有专页（包括结局）的
// 时间轴是 #content 的另一个直接子节点，所以由 storyPlaybackCard() 把卡片边界
// 提升到 #content。画面、走带与
// 所有 data-role 读数都必须能从这个明确的卡片边界查到。
// ——— 演出时间轴 ————————————————————————————————————————————————
//
// 和开机演出用的是同一个壳（ui/timeline-player.js）：走带、总体时间刻度轴、
// 播放头、坐标映射、键盘定位都在那边，本页只负责「这条剧情有哪些轨道」。
//
// 时间源不同——开机演出是提取器发布的步骤表，这里是 VM 逐帧模拟出来的
// frames[]——但对壳来说都只是「总共多少帧 + 哪些块落在哪一帧」。
//
// 轨道全部来自 compile 的产物，本页不自己排：镜头来自 shots，音频来自
// audioEvents，自动输入来自 uiAutoInputs；可编辑剧情工作台再把 frames[].actors[] 中
// 连续执行的命令按底稿 reference 归到操作数字段。循环点与结束是两个记号。

function storyTimelineFrame(compiled, variantId, rawFrame = storyCardFrame(variantId)) {
  const total = Math.max(1, Number(compiled.duration) || 1);
  const raw = Math.max(0, Math.floor(rawFrame));
  const loopStart = Number(compiled.loopStart);
  const loopLength = total - loopStart;
  return Number.isInteger(loopStart)
    && loopStart >= 0 && loopLength > 0 && raw >= total
    ? loopStart + ((raw - loopStart) % loopLength)
    : raw % total;
}

function storyTimelineMarkup(compiled, variant) {
  const total = Math.max(1, Number(compiled.duration) || 1);
  const frame = storyTimelineFrame(compiled, variant.id);
  const paused = state.storyCardPaused.has(Number(variant.id)) || !state.storyPlaying;
  const trace = storyExecutionTrace(compiled);
  const shots = trace.shots;
  const lanes = storyTimelineSourceLanes(compiled, {editable: storyEditableWorkbenchView(),
    fieldsForRun: storyEditableTimelineOperandFields, keyLabels: false});
  const markers = [];
  const loopStart = Number(compiled.loopStart);
  if (Number.isInteger(loopStart) && loopStart >= 0) {
    markers.push({frame: loopStart, tone: "instant",
      title: `循环点：第 ${loopStart} 帧，之后在这里与结尾之间绕回`});
  }
  for (const shot of shots) {
    markers.push({frame: Number(shot.frame) || 0, title: "镜头切换"});
  }
  const sequenceId = state.storySequenceId;
  const sequence = storyVmSequencesForView().find(item => item.id === sequenceId);
  const objectLabels = storyTimelineObjectLabels();
  const tree = storyTimelineTree({lanes, trace, frames: compiled.frames || [], actorsAt: storySnapshotActors,
    objectLabels, programs: storyBrowserVm().programs});
  const model = {view: state.view, sequenceId, compiled, trace, objectLabels, keyRecords: [], lanes: tree.lanes, mappings: tree.mappings, references: [
    recordUid("scene-actor-list", variant.id),
    ...(sequence?.interaction_trigger ? [
      storyActorHandle(variant.id, sequence.interaction_trigger.actor_record_id),
      storyScriptHandle("interaction", sequence.interaction_trigger.script_id),
    ] : []),
  ]};
  storyTimelineModels.set(`story:${variant.id}`, model);
  const baseline = state.storyMovementTimingBaselines.get(String(sequenceId));
  const timingChanges = baseline ? storyMovementTimingChanges(baseline.commands, trace.commands, baseline.edited) : new Map();
  for (const lane of tree.lanes) {
    lane.expanded = storyTreeExpansions(model.view).get(lane.id) !== false;
    lane.rowId = storyTimelineRowId(model.view, sequenceId, lane.id);
    lane.data = {"story-row": lane.id,
      "story-row-id": lane.rowId,
      "story-row-address": storyTimelineRowAddress(model.view, sequenceId, lane.id),
      ...(lane.objectId ? {"story-object-id": lane.objectId} : {})};
    lane.labelMarkup = `<span class="story-timeline-row-label"><button type="button" class="story-timeline-operand${
      lane.fields?.some(field => field.changed) ? " is-changed" : ""
    }" data-story-row-select="${esc(lane.id)}" title="${esc(lane.rowId)}" aria-pressed="false">${esc(lane.label)}</button></span>`;
    for (const block of lane.blocks || []) {
      const timing = timingChanges.get(block.command?.id)
        || block.command?.movementRuns?.map(run => timingChanges.get(run.id)).find(Boolean);
      if (timing) {
        block.title += ` · ${timing}`;
        block.data = {...block.data, 'story-timing-changed': 'true'};
      }
      block.detailTitle = block.title;
      block.title = storyTimelineShortText(block.title);
      block.labelMarkup = "";
    }
  }
  return timelinePlayer({
    keyRecords: model.keyRecords,
    id: `story:${variant.id}`,
    step: true,
    totalFrames: total,
    frame,
    playing: !paused,
    live: true,
    lanes: tree.lanes,
    markers,
    status: storyTimelineStatus(compiled, frame, total),
    labelWidth: 240,
    viewport: storyViewport(model.view),
    toolbar: `<div class="story-timeline-toolbar" role="toolbar" aria-label="演出时间轴工作条">
      <div data-story-toolbar-command>${storyToolbarEmpty()}</div>
      ${timelineViewportControls()}
      <button type="button" class="button ghost" data-story-tree-all="true">全部展开</button>
      <button type="button" class="button ghost" data-story-tree-all="false">全部收拢</button>
      <span data-story-insertion-point></span></div>`,
    transport: `<button type="button" class="button ghost"
      data-story-card-restart="${variant.id}" title="从头播这一条">⟲</button>${previewSoundControl()}`,
  });
}

/** 走带右侧那行读数：现在在第几段镜头、循环点在哪、怎么收尾。 */
function storyTimelineStatus(compiled, frame, total) {
  const shots = storyExecutionTrace(compiled).shots;
  const index = shots.findLastIndex(shot => (Number(shot.frame) || 0) <= frame);
  const shot = index >= 0 ? shots[index] : null;
  const loopStart = Number(compiled.loopStart);
  return [
    shots.length ? `SHOT ${index + 1} / ${shots.length}` : "",
    storyTimelineShortText(storyShotLabel(shot?.label)) || shot?.operation || "",
    Number.isInteger(loopStart) && loopStart >= 0 ? `循环点 ${loopStart}` : "",
    frame + 1 >= total ? "已到末帧" : "",
  ].filter(Boolean).join("　");
}

function storyScreenMarkup(entry) {
  const {variant, context, cameraLocated, sequence} = entry;
  return `<div class="story-game-screen black" data-role="story-vm-screen"
    ${sequence.interaction_trigger ? 'data-story-interaction="true"' : ''}
    aria-label="${esc(variant.id_hex)} ROM 剧情 VM 预览">
    <canvas class="story-stage-map" data-role="story-vm-map" aria-hidden="true" hidden></canvas>
    <div class="story-stage-camera">
    <canvas class="story-stage-background" data-role="story-vm-background"
      aria-hidden="true" ${context?.scene_id !== null && context?.scene_id !== undefined
        && cameraLocated ? "" : "hidden"}></canvas>
    <canvas class="story-stage-field-tiles" data-role="story-vm-field-tiles"
      width="256" height="240" hidden></canvas>
    <canvas class="story-ending-wanted" data-role="story-ending-wanted"
      data-wanted-preview="constructor:wanted-poster-screen"
      aria-label="通缉令专用渲染器绘制的赏金首回顾" hidden></canvas>
    <div class="story-stage-actors" data-role="story-vm-actors"></div>
    <div class="story-stage-dialogue-text" data-role="story-vm-dialogue-text"
      aria-live="polite" hidden>
      ${statusUiPreviewCanvas({
        screenId: VEHICLE_STATUS_DETAIL_SCREEN_ID,
        kind: "vehicle",
        selection: "ending-runtime",
        label: "结局战车状态界面",
        className: "story-stage-status-ui",
        role: "story-vm-status-ui",
        hidden: true,
      })}
      <canvas class="story-stage-dialogue-canvas"
        data-role="story-vm-dialogue-canvas" width="256" height="240"
        aria-label="游戏字模绘制的对话" hidden></canvas>
      <div class="story-stage-dialogue-synthetic"
        data-role="story-vm-dialogue-synthetic" hidden></div>
      <small class="story-stage-dialogue-unavailable"
        data-role="story-vm-dialogue-unavailable" hidden></small>
    </div>
    <div class="story-ending-fade" data-role="story-ending-fade"></div>
    <div class="story-screen-scanlines"></div>
    </div>
    <div class="story-stage-camera-frame" aria-hidden="true"></div>
  </div>`;
}

function storyUnimplementedStop(entry) {
  const definitions = storyPageDefinitionForView(state.view)
    ?.unimplementedStops || [];
  for (const snapshot of entry.compiled.frames || []) {
    for (const actor of snapshot.actors || []) {
      const command = actor.currentCommand;
      if (actor.blockedReason !== "unimplemented-handler"
          || command?.operation !== "unimplemented-handler") continue;
      const definition = definitions.find(item => (
        String(item.sequenceId) === String(entry.sequence.id)
        && Number(item.scriptId) === Number(actor.scriptId)
        && Number(item.cursor) === Number(command.cursor)
      ));
      return {actor, command, definition};
    }
  }
  return null;
}

function storyPlaybackReadoutsMarkup(entry) {
  const {compiled} = entry;
  const shots = storyExecutionTrace(compiled).shots;
  const firstShot = shots[0] || null;
  const unimplementedStop = storyUnimplementedStop(entry);
  return `<div class="story-card-state">
    <span><small>VM 帧</small><b class="tl-readout"><i aria-hidden="true">${compiled.duration} / ${compiled.duration} ↻</i><samp data-role="story-vm-time">0 / ${compiled.duration}</samp></b></span>
    <span><small>动作</small><b data-role="story-vm-command">—</b></span>
    <span class="story-card-shot-state"><small>SHOT</small><b data-role="story-vm-shot">1 / ${
      shots.length || 1}</b>${storySceneLink(
      firstShot?.sceneId,
      null,
      {role: "story-vm-scene"},
    )}</span>
    <span><small>在场角色</small><b data-role="story-vm-actor-count">0</b></span>
    <span data-role="story-vm-battle-entry" hidden><small>战斗入口</small><b>—</b></span>
    ${unimplementedStop ? `<span data-role="story-vm-unimplemented-stop"><small>未实现指令停点</small><b>${esc(
      unimplementedStop.definition?.effect || "效果未实现",
    )}</b></span>` : ""}
    <span><small>阻塞项</small><b>${entry.missing.length}</b></span>
  </div>
  <div class="story-audio-hud" data-role="story-audio-hud">
    <span><small>BGM</small><b data-role="story-audio-bgm">继承 · ID 未知</b></span>
    <span><small>最近 SFX</small><b data-role="story-audio-sfx">—</b></span>
    <span><small>控制</small><b data-role="story-audio-control">—</b></span>
    <span class="story-audio-channel-cell"><small>APU 声道 / 入口</small><b data-role="story-audio-channels">—</b></span>
    <span><small>最近触发源</small><b data-role="story-audio-source">—</b></span>
  </div>`;
}

function storyEditableTimelinePanelMarkup(entry) {
  return `<section class="presentation-timeline story-presentation-timeline"><div class="story-editable-playback"
    data-story-editable-playback>
    ${storyTimelineMarkup(entry.compiled, entry.variant)}
    <div class="story-editable-readouts">
      ${storyPlaybackReadoutsMarkup(entry)}
      ${storyAudioAlternateMarkup(entry.sequence.ending_animation)}
    </div>
  </div></section>`;
}

function storyStageMarkup(entry, view) {
  const {sequence, variant} = entry;
  const editable = storyEditableWorkbenchView(view);
  return screenWorkbenchCanvasStage({namespace: 'story', sizing: 'fill', className: 'story-stage-column',
    attributes: {'data-story-vm-variant': variant.id, 'data-story-vm-sequence': sequence.id},
    toolbarMarkup: `<div class="story-stage-toolbar">${storyStageZoomMarkup()}${editable ? resetToOriginalButton(STORY_RESET_ITEM_ID, {
        title: "丢弃本剧情字段及其可选自动脚本操作数的全部改动，"
          + "退回导入时的 ROM 原始状态",
        dirty: false,
      }) : ''}</div>`,
    viewportClassName: 'story-stage-viewport', viewportAttributes: {'data-story-stage-viewport': ''},
    canvasMarkup: storyScreenMarkup(entry), zoomMarkup: '',
  });
}

function actorStagePose(
  appearance,
  {direction = "down", step = 0, sequenceIndex = 0, fallbackFrame = 0,
    fallbackHorizontalFlip = false} = {},
) {
  if (!appearance) {
    return {
      frameIndex: Math.max(0, Math.min(5, Number(fallbackFrame) || 0)),
      columns: 6,
      palette: null,
      horizontalFlip: Boolean(fallbackHorizontalFlip),
      verticalFlip: false,
    };
  }
  const pose = actorPoseForAppearance(appearance, {
    direction,
    step,
    sequenceIndex,
  });
  return {...pose, columns: appearance.frames.length};
}

function actorStagePoseCss(pose, paletteFallback = 0) {
  const columns = Math.max(1, Number(pose.columns) || 1);
  const frameIndex = Math.max(
    0,
    Math.min(columns - 1, Number(pose.frameIndex) || 0),
  );
  const positionX = columns === 1 ? 0 : frameIndex * 100 / (columns - 1);
  const palette = Math.max(0, Math.min(
    3,
    pose.palette !== null && pose.palette !== undefined
      && Number.isInteger(Number(pose.palette))
      ? Number(pose.palette) : Number(paletteFallback) || 0,
  ));
  return {
    frameIndex,
    palette,
    backgroundSize: `${columns * 100}% 400%`,
    backgroundPosition: `${positionX}% ${palette * (100 / 3)}%`,
    transform: `scale(${pose.horizontalFlip ? -1 : 1},${pose.verticalFlip ? -1 : 1})`,
  };
}


function storyDialogueTargets(textTarget) {
  return {
    statusUi: textTarget?.querySelector(
      '[data-role="story-vm-status-ui"]',
    ),
    canvas: textTarget?.querySelector('[data-role="story-vm-dialogue-canvas"]'),
    synthetic: textTarget?.querySelector(
      '[data-role="story-vm-dialogue-synthetic"]',
    ),
    unavailable: textTarget?.querySelector(
      '[data-role="story-vm-dialogue-unavailable"]',
    ),
  };
}

function showStoryDialogueUnavailable(textTarget, targets, message) {
  syncStoryPlaybackHidden(textTarget, false);
  if (targets.statusUi) syncStoryPlaybackHidden(targets.statusUi, true);
  syncStoryPlaybackHidden(targets.canvas, true);
  syncStoryPlaybackHidden(targets.synthetic, true);
  syncStoryPlaybackHidden(targets.unavailable, false);
  syncStoryPlaybackText(targets.unavailable, message);
}

const storyDialoguePaintedKeys = new WeakMap();

async function updateStoryVmCurrentText(textTarget, dialogue, runtime = {}, isCurrent = () => textTarget.isConnected) {
  if (!textTarget) return;
  const targets = storyDialogueTargets(textTarget);
  if (!targets.canvas || !targets.synthetic || !targets.unavailable) return;
  if (!dialogue) {
    delete textTarget.dataset.dialogueKey;
    syncStoryPlaybackHidden(textTarget, true);
    if (targets.statusUi) syncStoryPlaybackHidden(targets.statusUi, true);
    syncStoryPlaybackHidden(targets.canvas, true);
    syncStoryPlaybackHidden(targets.synthetic, true);
    syncStoryPlaybackHidden(targets.unavailable, true);
    return;
  }
  if (dialogue.uiScreenId && targets.statusUi) {
    const context = dialogue.uiPreviewContext || {};
    const revisions = ["text-record", "ui-role-status", "ui-vehicle-status", "character-initial-record",
      "vehicle-preset", "shared-chr-bank"].map(id => db.fieldRevision(id));
    const dialogueKey = `ui:${dialogue.uiScreenId}:${JSON.stringify([context, runtime.partyMembers,
      runtime.vehicles, runtime.partyMoney, revisions])}:${uiDialogueRuntimeKey()}`;
    syncStoryPlaybackHidden(textTarget, false);
    syncStoryPlaybackHidden(targets.canvas, true);
    syncStoryPlaybackHidden(targets.synthetic, true);
    if (textTarget.dataset.dialogueKey === dialogueKey
        && targets.statusUi.dataset.statusUiKey === dialogueKey) {
      syncStoryPlaybackHidden(targets.statusUi, false);
      syncStoryPlaybackHidden(targets.unavailable, true);
      return;
    }
    if (targets.statusUi.dataset.statusUiPending === dialogueKey) return;
    textTarget.dataset.dialogueKey = dialogueKey;
    targets.statusUi.dataset.statusUiPending = dialogueKey;
    syncStoryPlaybackHidden(targets.statusUi, true);
    syncStoryPlaybackHidden(targets.unavailable, false);
    targets.unavailable.textContent = "正在读取通用状态界面…";
    try {
      const painted = await paintUiEditorPreviewCanvas(
        targets.statusUi,
        dialogue.uiScreenId,
        {
          resolvePreview: preview => context.record
            ? resolveEndingCreditsUiPreview(preview, context, state.project)
            : resolveStatusUiPreview(preview, context, state.project, runtime),
          isCurrent,
        },
      );
      if (!isCurrent()) return;
      if (!painted) {
        throw new Error(`找不到界面资源 ${dialogue.uiScreenId}`);
      }
      if (!isCurrent() || textTarget.dataset.dialogueKey !== dialogueKey) return;
      targets.statusUi.dataset.statusUiKey = dialogueKey;
      syncStoryPlaybackHidden(targets.statusUi, false);
      syncStoryPlaybackHidden(targets.unavailable, true);
    } catch (error) {
      if (!isCurrent() || textTarget.dataset.dialogueKey !== dialogueKey) return;
      if (error?.name === "AbortError") {
        delete textTarget.dataset.dialogueKey;
        return;
      }
      showStoryDialogueUnavailable(
        textTarget,
        targets,
        `状态界面预览不可用：${error.message || error}`,
      );
    } finally {
      if (targets.statusUi.dataset.statusUiPending === dialogueKey) {
        delete targets.statusUi.dataset.statusUiPending;
      }
    }
    return;
  }
  if (dialogue?.synthetic && dialogue.recordFound) {
    // 仅供仍拥有 panel_lines 的机器码阶段使用；状态界面已在上面的 canonical
    // UI screen 分支处理。合成摘要没有 record:XX:NNN 字节可交给文字 VM。
    const lines = dialogue.lines || [];
    syncStoryPlaybackHidden(textTarget, !lines.length);
    if (targets.statusUi) syncStoryPlaybackHidden(targets.statusUi, true);
    syncStoryPlaybackHidden(targets.canvas, true);
    syncStoryPlaybackHidden(targets.unavailable, true);
    syncStoryPlaybackHidden(targets.synthetic, !lines.length);
    syncStoryPlaybackMarkup(targets.synthetic, lines.length
      ? `<b>${lines.map(line => esc(line)).join("<br>")}</b>`
      : "");
    textTarget.dataset.dialogueKey = `synthetic:${lines.join("\n")}`;
    return;
  }
  if (!dialogue.recordFound
      || dialogue.regionId < 0 || dialogue.recordId < 0) {
    textTarget.dataset.dialogueKey = "unavailable-record";
    showStoryDialogueUnavailable(
      textTarget,
      targets,
      "对话预览不可用：当前有效记录没有原始字节。",
    );
    return;
  }
  const regionHex = Number(dialogue.regionId)
    .toString(16).toUpperCase().padStart(2, "0");
  const recordId = `record:${regionHex}:${Number(dialogue.recordId)
    .toString().padStart(3, "0")}`;
  // 当前该显示的那一页完全采用 VM 的 pageIndex；token 流的分页仍只由
  // uiPaintInterfaceScript 解释，剧情页不另算一份。
  const pageIndex = Number(dialogue.pageIndex) || 0;
  // 普通剧情文字共用地图对话窗口。
  const fieldWindow = !dialogue.machineCodeOwned;
  const prefixRecord = fieldWindow ? `record:0C:${Number(dialogue.prefixRecordId || 0)
    .toString().padStart(3, "0")}` : null;
  const dialogueKey = `${recordId}:${pageIndex}:${fieldWindow ? "field" : "record"}:${
    prefixRecord}:${Boolean(dialogue.interactionWindow)}:${
    JSON.stringify(dialogue.pages || [])}:${uiDialogueRuntimeKey()}`;
  if (textTarget.dataset.dialogueKey === dialogueKey && storyDialoguePaintedKeys.get(textTarget) === dialogueKey) return;
  storyDialoguePaintedKeys.delete(textTarget);
  textTarget.dataset.dialogueKey = dialogueKey;
  showStoryDialogueUnavailable(textTarget, targets, "正在读取对话记录…");
  try {
    const [renderSources, source] = await Promise.all([
      uiJsRenderSources(),
      textCatalogRecordSource(recordId),
    ]);
    if (!isCurrent() || textTarget.dataset.dialogueKey !== dialogueKey) return;
    if (!Array.isArray(source.bytes)) {
      showStoryDialogueUnavailable(
        textTarget,
        targets,
        `对话预览不可用：${recordId} 没有原始字节。`,
      );
      storyDialoguePaintedKeys.set(textTarget, dialogueKey);
      return;
    }
    uiPaintDialogueCanvas(
      targets.canvas,
      recordId,
      pageIndex,
      renderSources,
      source.records,
      {fieldWindow, prefixRecord, interactionWindow: Boolean(dialogue.interactionWindow)},
    );
    if (!isCurrent() || textTarget.dataset.dialogueKey !== dialogueKey) return;
    syncStoryPlaybackHidden(textTarget, false);
    if (targets.statusUi) syncStoryPlaybackHidden(targets.statusUi, true);
    syncStoryPlaybackHidden(targets.canvas, false);
    syncStoryPlaybackHidden(targets.synthetic, true);
    syncStoryPlaybackHidden(targets.unavailable, true);
    storyDialoguePaintedKeys.set(textTarget, dialogueKey);
  } catch (error) {
    if (!isCurrent() || textTarget.dataset.dialogueKey !== dialogueKey) return;
    if (error?.name === "AbortError") {
      delete textTarget.dataset.dialogueKey;
      return;
    }
    showStoryDialogueUnavailable(
      textTarget,
      targets,
      `对话预览不可用：${error.message || error}`,
    );
    storyDialoguePaintedKeys.set(textTarget, dialogueKey);
  }
}

function storyPlaybackCard(stage) {
  if (!stage) return null;
  // 剧情专页的工作台与「演出时间轴」面板都是 #content 的直接子节点；以共同的
  // #content 为卡片才能让逐帧查询同时覆盖舞台和下方面板。
  return stage.closest("#content") || stage;
}

// 场景现画会跨过一次或多次输入/计时器 tick。按舞台记录本轮刷新身份，避免旧场景
// 在用户已经拖到通缉令或职员表后才返回，并把应隐藏的背景画布重新显示出来。
const storyPlaybackUpdateRevisions = new WeakMap();
const storyAnimatedBackgrounds = new WeakMap();

function animatedBackgroundSurfaces(background, sceneId) {
  const documents = [db.peekResourceDocument(recordUid("scene", Number(sceneId)), null),
    db.peekDocument("shared-chr-bank", null), db.peekResourceDocument("metatile-page", null),
    db.peekResourceDocument("metatile-set", null), db.peekResourceDocument("palette-runtime-service", null)];
  let cached = storyAnimatedBackgrounds.get(background);
  if (!cached || documents.some((document, index) => document !== cached.documents[index])) {
    cached = {documents, surfaces: new Map()};
    storyAnimatedBackgrounds.set(background, cached);
  }
  return cached.surfaces;
}

function updateStoryPlayback(compilations = null) {
  if (!storyPlayerViewActive()) return;
  const generation = storyMountGeneration;
  const view = state.view;
  const allActorLists = storyVmAllActorLists();
  const sequences = storyVmSequencesForView();
  // 同一快照的背景、图块与角色完成绘制后返回。
  return Promise.all([...document.querySelectorAll("[data-story-vm-variant]")].map(async stageElement => {
    const playbackState = storyPlaybackState(stageElement);
    const updateRevision = (storyPlaybackUpdateRevisions.get(stageElement) || 0) + 1;
    storyPlaybackUpdateRevisions.set(stageElement, updateRevision);
    const updateIsCurrent = () => (
      stageElement.isConnected
      && generation === storyMountGeneration && view === state.view
      && storyPlaybackUpdateRevisions.get(stageElement) === updateRevision
    );
    const card = storyPlaybackCard(stageElement);
    if (!card) return;
    const find = selector => storyPlaybackControl(stageElement, card, selector);
    const variant = allActorLists.find(
      item => Number(item.id) === Number(stageElement.dataset.storyVmVariant)
    );
    if (!variant) return;
    const sequence = sequences.find(
      item => item.id === stageElement.dataset.storyVmSequence,
    );
    if (!sequence) return;
    const compiled = compilations?.get?.(sequence.id) || buildStoryVmSequence(
      sequence,
      variant,
      storyPartyRuntimeOverrides(sequence.id),
    );
    // 每条剧情走自己的帧游标：长度从几百帧到上万帧不等，共用全局帧号会让短的
    // 一直在循环、长的还没开始。
    const frameIndex = storyTimelineFrame(compiled, variant.id);
    const sourceSnapshot = compiled.frames[frameIndex];
    const playbackPhase = fieldChrAnimationPlaybackPhase(compiled, frameIndex,
      Math.max(0, Math.floor(storyCardFrame(variant.id))));
    const snapshot = storyAnimationSnapshot(sourceSnapshot, playbackPhase) || {
      variantId: Number(variant.id),
      context: variant.scene_contexts?.[0] || null,
      actors: [],
    };
    // 走带同步必须留在第一个 await 之前：背景加载可能跨过下一次输入/计时器 tick，
    // 若在异步尾部才写读数，旧 compiled 会反过来覆盖更新后的总长。
    const paused = state.storyCardPaused.has(Number(variant.id))
      || !state.storyPlaying;
    const preferredId = stageElement.dataset.storySelectedNode || null;
    const detailId = stageElement.dataset.storySelectedEvent || null;
    delete stageElement.dataset.storySelectedNode;
    delete stageElement.dataset.storySelectedEvent;
    const selectedObject = syncStoryWorkbenchFrame(compiled, frameIndex, preferredId, detailId);
    syncStoryAudio(stageElement, compiled, frameIndex, paused);
    syncTimelinePlayer(find(`[data-tl="story:${variant.id}"]`), {
      frame: frameIndex,
      totalFrames: Math.max(1, compiled.duration),
      playing: !paused,
      live: true,
      status: storyTimelineStatus(compiled, frameIndex, compiled.duration),
      currentBlockFrame: null,
    });
    const timeline = find(`[data-tl="story:${variant.id}"]`);
    syncStoryTimelineCurrentValues(timeline, frameIndex);
    if (timeline && storyTimelineSelectedBlocks.get(timeline)?.blockIndex == null)
      syncSelectedStoryTimelineRow(timeline);
    const actors = storySnapshotActors(snapshot);
    const audioState = snapshot.audioState || {};
    const music = audioState.currentMusicCommandId == null
      ? null : storyAudioCommand(audioState.currentMusicCommandId);
    const sfx = audioState.lastSfxCommandId == null
      ? null : storyAudioCommand(audioState.lastSfxCommandId);
    const fadeControl = audioState.fadeControlId == null
      ? null : storyAudioControl(audioState.fadeControlId);
    const frameVariant = allActorLists.find(
      item => Number(item.id) === Number(snapshot.variantId),
    ) || variant;
    const needsLocatedEntryCamera =
      frameVariant.selection?.kind === "extended-logical-story-index"
      && !compiled.endingAnimation;
    const playbackContextAvailable =
      !needsLocatedEntryCamera || Boolean(snapshot.cameraKnown);
    const fieldVisible = playbackContextAvailable && snapshot.fieldPresentation?.enabled !== false;
    const paletteDecrement = Number(snapshot.fieldPresentation?.paletteDecrement) || 0;
    const backgroundFlash = Boolean(snapshot.fieldPresentation?.backgroundFlash);
    const screen = find('[data-role="story-vm-screen"]');
    const background = find('[data-role="story-vm-background"]');
    const fieldTiles = find(
      '[data-role="story-vm-field-tiles"]',
    );
    const context = snapshot.context || null;
    const stage = storyVmStage(context);
    const cameraTileOriginX = Number(snapshot.cameraTileOriginX || 0);
    const cameraTileOriginY = Number(snapshot.cameraTileOriginY || 0);
    const scrollOffsetY = Number(snapshot.screenScrollOffsetY || 0);
    if (screen) {
      syncStoryPlaybackHidden(screen, !playbackContextAvailable);
      screen.style.backgroundColor = fieldVisible ? "" : "black";
      const backdrop = snapshot.endingFill || (context?.kind === "interior"
        ? "interior-blue"
        : "field-green");
      const className = `story-game-screen ${backdrop}`;
      if (screen.className !== className) screen.className = className;
      screen.style.aspectRatio = `${stage.viewportWidth} / ${stage.viewportHeight}`;
      if (screen.dataset.stageWidth !== String(stage.viewportWidth)) screen.dataset.stageWidth = String(stage.viewportWidth);
      if (screen.dataset.stageHeight !== String(stage.viewportHeight)) screen.dataset.stageHeight = String(stage.viewportHeight);
    }
    let composedDisplay = false;
    const executionTrace = storyExecutionTrace(compiled);
    const objectLabels = storyTimelineModels.get(`story:${variant.id}`)?.objectLabels;
    if (screen && fieldVisible && snapshot.cameraKnown && storyUsesSceneDisplay(compiled)) {
      let canvas = screen.querySelector('[data-role="story-scene-display"]');
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.dataset.role = 'story-scene-display';
        screen.prepend(canvas);
      }
      try {
        composedDisplay = await paintStorySceneDisplay(canvas, compiled, snapshot, updateIsCurrent, sourceSnapshot);
        delete screen.dataset.displayError;
      } catch (error) {
        screen.dataset.displayError = error.message;
      }
      if (!updateIsCurrent()) return;
    }
    if (screen) screen.dataset.sceneDisplay = composedDisplay ? 'composed' : 'semantic';
    syncStoryStageMap(stageElement, playbackContextAvailable ? snapshot : null, stage);
    if (composedDisplay) {
      const traceShot = executionTrace.shots.findLast(item => item.start <= frameIndex);
      syncStoryPlayerRegions(screen, snapshot, executionTrace.playerSegments, stage);
      syncStoryStageActors(find('[data-role="story-vm-actors"]'), actors.filter(actor => !actor.hidden).map(actor => {
        const pose = actor.renderPose || actor;
        const id = storyActorObjectId(traceShot?.id, actor);
        const label = (objectLabels?.get(id) || storyActorHandle(snapshot.variantId, actor.actorSlot))
          + (actor.wanderDirection !== undefined || actor.currentCommand?.operation?.includes('wander') ? ' · 随机' : '');
        return {id, attributes: {class: `story-game-actor${id === selectedObject?.id ? ' is-selected' : ''}`,
          ...storyStageActorAttributes(id, label, selectedObject?.id), title: label,
          ...(actor.partySlot == null ? {} : {'data-party-slot': String(actor.partySlot)})}, styles: {
          left: `${(pose.x - cameraTileOriginX) * 16 / 256 * 100}%`,
          top: `${(pose.y - cameraTileOriginY) * 16 / 240 * 100}%`,
          width: `${16 / 256 * 100}%`, height: `${16 / 240 * 100}%`,
        }};
      }));
    } else {
    const backgroundSceneId = context?.scene_id;
    const hasBackgroundScene = backgroundSceneId !== null
      && backgroundSceneId !== undefined;
    if (background && hasBackgroundScene && fieldVisible) {
      const backgroundCameraX = snapshot.backgroundCameraTileOriginX ?? cameraTileOriginX;
      const backgroundCameraY = snapshot.backgroundCameraTileOriginY ?? cameraTileOriginY;
      // 舞台背景与场景编辑页共用同一个渲染器；以前这里 `<img src>` 拉
      // scenes/<slug>/preview.png，是同一批像素的第二条来源，而且用文件路径
      // 而不是资源 ID 引用场景。
      const animationPhase = snapshot.backgroundAnimationPhase;
      const compositing = animationPhase == null ? "" : "transform";
      if (background.style.willChange !== compositing) background.style.willChange = compositing;
      const source = `scene:${backgroundSceneId}:${backgroundCameraX}:${backgroundCameraY}:${scrollOffsetY}:${animationPhase ?? "static"}:${paletteDecrement}:${Number(backgroundFlash)}`;
      if (background.dataset.source !== source) {
        const surfaces = animationPhase == null ? null
          : animatedBackgroundSurfaces(background, backgroundSceneId);
        const surface = surfaces?.get(source) || await loadScenePreviewSourceById(Number(backgroundSceneId), {view: 'viewport',
          cameraX: backgroundCameraX, cameraY: backgroundCameraY,
          width: stage.viewportWidth, height: stage.viewportHeight,
          cellSize: stage.tileSize,
          animationPhase,
        });
        if (!updateIsCurrent()) return;
        if (surface) {
          if (surfaces) {
            surfaces.set(source, surface);
            if (surfaces.size > 16) surfaces.delete(surfaces.keys().next().value);
          }
          await paintScenePreview(background, {surface, scrollY: scrollOffsetY, paletteDecrement, backgroundFlash});
          background.dataset.source = source;
        }
      }
      syncStoryPlaybackHidden(background, false);
      background.style.left = "0";
      background.style.top = "0";
      background.style.width = "100%";
      background.style.height = "100%";
    } else if (background) {
      syncStoryPlaybackHidden(background, true);
    }
    const endingWanted = find('[data-role="story-ending-wanted"]');
    const endingWantedTargetId = snapshot.endingWantedTargetId;
    if (
      endingWanted
      && endingWantedTargetId !== null
      && endingWantedTargetId !== undefined
    ) {
      // 结局只决定当前目标与击破状态；海报底板、编队图形、名称、赏金和击破
      // 标记全部交给导航栏「通缉令」页使用的同一个专用组件。
      const defeated = snapshot.endingWantedDefeated === true;
      const source = `wanted:${Number(endingWantedTargetId)}:${
        defeated ? "defeated" : "active"}`;
      if (endingWanted.dataset.source !== source) {
        endingWanted.dataset.source = source;
        delete endingWanted.dataset.readySource;
        delete endingWanted.dataset.wantedPreviewError;
        syncStoryPlaybackHidden(endingWanted, true);
        const isCurrent = () => (
          endingWanted.isConnected && endingWanted.dataset.source === source
        );
        paintWantedPreviewCanvas(endingWanted, {
          targetId: Number(endingWantedTargetId),
          defeated,
          isCurrent,
        }).then(resolved => {
          if (!resolved || !isCurrent()) return;
          endingWanted.dataset.readySource = source;
          syncStoryPlaybackHidden(endingWanted, false);
        }).catch(error => {
          if (!isCurrent()) return;
          endingWanted.dataset.wantedPreviewError = String(
            error?.message || error,
          );
        });
      }
      syncStoryPlaybackHidden(endingWanted, endingWanted.dataset.readySource !== source);
    } else if (endingWanted) {
      syncStoryPlaybackHidden(endingWanted, true);
    }
    const endingFade = find('[data-role="story-ending-fade"]');
    if (endingFade) {
      endingFade.style.opacity = String(
        Math.max(0, Math.min(1, Number(snapshot.endingFadeOpacity) || 0)),
      );
    }
    await drawStoryFieldTileOverlay(
      fieldTiles,
      fieldVisible ? snapshot : {...snapshot, fieldTiles: []},
      context,
      stage,
    );
    if (!updateIsCurrent()) return;
    syncStoryPlayerRegions(screen, snapshot, executionTrace.playerSegments, stage);
    const traceShot = executionTrace.shots.findLast(item => item.start <= frameIndex);
    const rendered = await Promise.all((fieldVisible && snapshot.actorPresentationEnabled !== false ? actors : [])
      .map(actor => ({...actor, ...actor.renderPose}))
      .filter(storyActorIsVisible).map(async actor => {
      const renderSlot = actor.runtimePartyEntity
        ? 15 - snapshot.partyActors.findIndex(entity => entity.actorSlot === actor.actorSlot)
        : actor.fieldEntityIndex !== undefined ? 15 - actor.fieldEntityIndex
          : actor.renderSlot ?? 16 - Number(snapshot.fieldEntityCount) - snapshot.actors.length + Number(actor.actorSlot);
      // PRG $0341B8 先提交领队，$034221 按帧奇偶交替遍历其余渲染槽。
      const renderParity = Number(snapshot.renderFrameParity ?? frameIndex) & 1;
      const oamPriority = renderSlot === 15 ? 16 : renderParity ? renderSlot : 14 - renderSlot;
      const publishedActorRecipe =
        frameVariant.sprite_sheets_by_actor_type?.[String(actor.actorType)]
        || frameVariant.actors?.find(
          item => Number(item.record_id) === actor.actorSlot,
        )?.sprite_recipe;
      const spritePair = actorAppearanceContextForStory({actor_type: actor.actorType,
        record_id: actor.actorSlot}, frameVariant, snapshot).pair;
      const literalRecipe = kind => Number.isInteger(spritePair) ? {
        kind, id: actor.actorType, chr_banks: actorSetBanks(spritePair),
        cell_size: 64, offset_x: -32, offset_y: -32,
      } : null;
      const genericSprite = actor.renderMode === "generic-metasprite"
        ? {...frameVariant.generic_metasprite_sheets?.[String(actor.actorType)],
          ...literalRecipe("generic-metasprite")}
        : null;
      const directSprite = actor.renderMode === "direct-actor-frame"
        ? {...frameVariant.direct_frame_sheets?.[String(actor.actorType)],
          ...literalRecipe("direct-frame")}
        : null;
      // 三条来源都已经是配方：metasprite / 直接帧走 metasprite 渲染器，
      // 其余走角色图集渲染器。两者都现画成 data URL 并按正文 identity 缓存。
      const metaspriteRecipe = genericSprite || directSprite || null;
      if (actor.renderMode !== "type-animation" && !metaspriteRecipe) return null;
      const liveActorRecipe = publishedActorRecipe ? {
        actor_set: spritePair,
        actor_type: actor.actorType,
        entry_point: publishedActorRecipe.entry_point,
      } : null;
      const liveActorAppearance = metaspriteRecipe
        ? null : peekActorAppearance(actor.actorType, {
            entryPoint: liveActorRecipe?.entry_point || ACTOR_ENTRY_TYPE_SELECTOR,
          });
      const sprite = metaspriteRecipe
        ? await metaspriteStageSheetUrl(metaspriteRecipe).catch(() => null)
        : liveActorRecipe ? await actorSpriteSheetUrl(liveActorRecipe).catch(() => null) : null;
      if (!sprite) return null;
      const directionIndex = {up: 0, down: 1, left: 2, right: 2}[actor.direction] ?? 1;
      const renderPose = actor.renderPose || actor;
      // $A3B6/$A57A 在停止步态时取属性 bit 3，否则取剩余格步计数 bit 4。
      const animationTick = renderPose.motion?.animate
        ? (Math.floor(32 * (1 - renderPose.motion.elapsed / renderPose.motion.duration)) >> 4) & 1
        : (actor.motionAttributes & 0x40) ? (actor.motionAttributes >> 3) & 1 : 0;
      const fallbackFrame = directionIndex * 2 + animationTick % 2;
      const pose = metaspriteRecipe ? {
        frameIndex: fallbackFrame,
        columns: 6,
        palette: Number(actor.palette) || 0,
        horizontalFlip: false,
        verticalFlip: false,
      } : actorStagePose(liveActorAppearance, {
        direction: actor.direction,
        step: animationTick,
        sequenceIndex: animationTick,
        fallbackFrame,
        fallbackHorizontalFlip: actor.direction === "right",
      });
      const poseCss = actorStagePoseCss(pose, actor.palette);
      const renderAsset = genericSprite || directSprite;
      const renderSize = Number(renderAsset?.cell_size || stage.tileSize);
      const actorCameraX = snapshot.actorCameraTileOriginX ?? cameraTileOriginX;
      const actorCameraY = snapshot.actorCameraTileOriginY ?? cameraTileOriginY;
      const left = (
        (renderPose.x - actorCameraX) * stage.tileSize
        + Number(actor.screenOffsetX || 0)
        + Number(renderAsset?.offset_x || 0)
      ) / stage.viewportWidth * 100;
      const top = (
        (renderPose.y - actorCameraY) * stage.tileSize
        + Number(actor.screenOffsetY || 0)
        + Number(renderAsset?.offset_y || 0)
        + Number(pose.screenOffsetY || 0)
      ) / stage.viewportHeight * 100;
      const width = renderSize / stage.viewportWidth * 100;
      const height = renderSize / stage.viewportHeight * 100;
      const objectId = storyActorObjectId(traceShot?.id, actor);
      const label = objectLabels?.get(objectId) || storyActorHandle(snapshot.variantId, actor.actorSlot);
      return {
        id: objectId,
        oam: {
          priority: oamPriority,
          left: left / 100 * stage.viewportWidth,
          top: top / 100 * stage.viewportHeight,
          size: renderSize,
          horizontalFlip: pose.horizontalFlip,
          verticalFlip: pose.verticalFlip,
          cells: metaspriteRecipe ? await metaspriteStageOamCells(metaspriteRecipe)
            : [{x: 0, y: 0}, {x: 8, y: 0}, {x: 0, y: 8}, {x: 8, y: 8}],
        },
        attributes: {
          class: `story-game-actor${objectId === selectedObject?.id ? " is-selected" : ""}`,
          ...storyStageActorAttributes(objectId, label, selectedObject?.id),
          ...(actor.partySlot === null || actor.partySlot === undefined
            ? {} : {"data-party-slot": String(Number(actor.partySlot))}),
          "data-motion": actor.motion?.operation || "idle",
          "data-animation-frame": String(poseCss.frameIndex),
          title: `${label} · ${storyActorHandle(snapshot.variantId, actor.actorSlot)} · ${storyScriptHandle(actor.scriptKind, actor.scriptId)} · (${actor.x.toFixed(2)}, ${actor.y.toFixed(2)})`,
        },
        styles: {
          left: "0", top: "0",
          translate: `calc(100cqw * ${left / 100}) calc(100cqh * ${top / 100})`,
          width: `${width}%`, height: `${height}%`,
          "z-index": String(100 + oamPriority),
          "background-image": `url('${await fieldPaletteSheetUrl(sprite, paletteDecrement)}')`,
          "background-size": poseCss.backgroundSize,
          "background-position": poseCss.backgroundPosition,
          transform: poseCss.transform,
        },
      };
    }));
    if (!updateIsCurrent()) return;
    const actorLayer = find('[data-role="story-vm-actors"]');
    const visibleActors = rendered.filter(Boolean);
    applyFieldSpriteLimit(visibleActors, stage.viewportWidth, stage.viewportHeight);
    syncStoryStageActors(actorLayer, visibleActors);
    const dialogueTarget = find(
      '[data-role="story-vm-dialogue-text"]',
    );
    if (dialogueTarget) {
      const layout = snapshot.endingOperation || "";
      if (dialogueTarget.dataset.endingLayout !== layout) dialogueTarget.dataset.endingLayout = layout;
    }
    const interfaceState = storyInterfaceState(snapshot);
    const textScreen = interfaceState?.textScreen || (interfaceState?.context?.record ? interfaceState.screen : null);
    const dialogue = textScreen ? {...snapshot.dialogue, uiScreenId: textScreen,
      uiPreviewContext: interfaceState.context} : snapshot.dialogue;
    await updateStoryVmCurrentText(dialogueTarget, fieldVisible ? dialogue : null,
      compiled.endingAnimation ? storyInterfaceRuntime(compiled, frameIndex) : snapshot, updateIsCurrent);
    if (!updateIsCurrent()) return;
    }
    const commands = actors
      .map(actor => actor.currentCommand)
      .filter(Boolean);
    const command = commands[0] || null;
    const time = find('[data-role="story-vm-time"]');
    const commandLabel = find('[data-role="story-vm-command"]');
    const actorCount = find('[data-role="story-vm-actor-count"]');
    const battleEntry = find(
      '[data-role="story-vm-battle-entry"]',
    );
    const shotLabel = find('[data-role="story-vm-shot"]');
    const sceneLink = find('[data-role="story-vm-scene"]');
    const audioHud = find('[data-role="story-audio-hud"]');
    const bgmLabel = find('[data-role="story-audio-bgm"]');
    const sfxLabel = find('[data-role="story-audio-sfx"]');
    const controlLabel = find(
      '[data-role="story-audio-control"]',
    );
    const channelLabel = find(
      '[data-role="story-audio-channels"]',
    );
    const sourceLabel = find(
      '[data-role="story-audio-source"]',
    );
    if (audioHud) {
      const event = snapshot.audioEvents?.length ? "active" : "";
      if (audioHud.dataset.event !== event) audioHud.dataset.event = event;
    }
    if (bgmLabel) {
      syncStoryPlaybackMarkup(bgmLabel, music
        ? `${storyResourceMarkup(recordUid("audio-command", music.id), storyAudioLabel(music.id))}${audioState.musicStatus === "fading" ? " · 淡出中" : ""}`
        : audioState.musicStatus === "fading" ? "淡出中" : "—");
      bgmLabel.title = music?.header
        ? "当前声音命令的轨道头"
        : audioState.musicStatus === "stopped-after-fade-reset"
          ? "F2 的 16 步淡出结束后，音频驱动执行复位"
          : "结局入口前的声音命令不在本执行链中，无法静态确定";
    }
    if (sfxLabel) {
      syncStoryPlaybackMarkup(sfxLabel, sfx
        ? storyResourceMarkup(recordUid("audio-command", sfx.id), storyAudioLabel(sfx.id))
        : "—");
    }
    if (controlLabel) {
      syncStoryPlaybackMarkup(controlLabel, fadeControl
        ? `${storyResourceMarkup(recordUid("audio-control", fadeControl.id))} · FADE interval ${fadeControl.interval} · ${Number(audioState.fadeUpdatesRemaining || 0)} updates`
        : "—");
    }
    if (channelLabel) {
      const tracks = music?.tracks || music?.stream_pointers || [];
      syncStoryPlaybackMarkup(channelLabel, tracks.length
        ? tracks.map(track => {
          const label = track.channel_short_label
            || track.channel_label
            || track.channel?.short_label
            || track.channel?.label
            || `TRACK ${Number(track.index) + 1}`;
          const registers = track.apu_registers || track.channel?.apu_registers;
          return `<i title="${esc(`${label}${
            registers ? ` · ${Array.isArray(registers) ? registers.join("-") : registers}` : ""
          }`)}">${esc(label)}</i>`;
        }).join("")
        : `<i class="unknown">${audioState.musicStatus === "stopped-after-fade-reset"
          ? "无活动 BGM 声道"
          : audioState.musicStatus === "fading"
            ? audioState.fadeSourceMusicStatus === "stopped-after-fade-reset"
              ? "无活动 BGM 声道 · 驱动复位中"
              : "活动声道未识别 · 淡出/复位中"
            : "声道入口未知"}</i>`);
    }
    if (sourceLabel) {
      const lastEvent = audioState.lastEvent;
      syncStoryPlaybackText(sourceLabel, lastEvent
        ? `${lastEvent.dispatch || lastEvent.role}`
        : "入口未显式提交");
    }
    if (time) {
      syncStoryPlaybackText(time, `${frameIndex + 1} / ${compiled.duration}${
        compiled.loopStart === null ? "" : " ↻"
      }`);
    }
    if (commandLabel) {
      commandLabel.title = screen?.dataset.displayError || '';
      syncStoryPlaybackText(commandLabel, snapshot.endingOperation
        ? snapshot.endingOperation
        : command
        ? `${command.opcodeHex} ${command.operation}`
        : `$0481=${hex$4(snapshot.storyState || 0, 2)} $0487=${hex$4(
          snapshot.controlLock || 0,
          2,
        )} $2F=${hex$4(
          snapshot.mode || 0,
          2,
        )}`);
    }
    syncStoryPlaybackText(actorCount, String(
      actors.filter(storyActorIsVisible).length
    ));
    if (battleEntry) {
      syncStoryPlaybackHidden(battleEntry, !snapshot.battleEntry);
      const value = battleEntry.querySelector("b");
      if (value && snapshot.battleEntry) {
        const formation = db.peekResourceDocument("encounter-formation", null)?.records?.find(
          row => Number(row.id) === Number(snapshot.battleEntry.formationId));
        const mode = battleModeForPendingEventFlag(snapshot.battleEntry.pendingEventFlag,
          battleFirstMonsterId(formation?.slots));
        syncStoryPlaybackMarkup(value, `编队 ${storyResourceMarkup(recordUid("encounter-formation", snapshot.battleEntry.formationId))} · 待置事件位 ${
          storyResourceMarkup(recordUid("global-event-flag", snapshot.battleEntry.pendingEventFlag))}${mode ? ` · 战斗类型 ${esc(mode.label)}` : ''} · BGM ${
          mode ? storyResourceMarkup(recordUid("audio-command", mode.musicCommand), storyAudioLabel(mode.musicCommand)) : "—"} · 死亡效果 ${
          mode ? esc(hex$4(mode.deathEffect, 2)) : "—"}${snapshot.battleEntry.assumedResult === "victory" ? " · 假定胜利" : ""}
          · <a class="editor-inline-link" data-battle-simulator-link href="${esc(battleSimulatorHref({
            source: state.storySequenceId, formationId: snapshot.battleEntry.formationId,
            flag: snapshot.battleEntry.pendingEventFlag, storyState: snapshot.battleEntry.targetStoryState}))}">战斗模拟器 ↗</a>`);
      }
    }
    const shotIndex = Math.max(
      0,
      executionTrace.shots.findLastIndex(
        shot => Number(shot.frame) <= frameIndex,
      ),
    );
    const shot = executionTrace.shots[shotIndex] || null;
    if (shotLabel) {
      syncStoryPlaybackMarkup(shotLabel, shot
        ? `${shotIndex + 1} / ${executionTrace.shots.length} · ${
          handleTextMarkup(storyShotLabel(shot.label).replace(` / ${recordUid("scene", shot.sceneId)}`, "")
            || recordUid("scene-actor-list", shot.variantId))
        }`
        : "1 / 1");
    }
    updateStorySceneLink(
      sceneLink,
      shot?.sceneId,
    );
    if (updateIsCurrent()) completedStoryPlaybackStates.set(stageElement, playbackState);
  }));
}

function storyTimelineElement(markup) {
  const template = document.createElement("template");
  template.innerHTML = markup.trim();
  return template.content.firstElementChild;
}

function syncStoryTimelineAttributes(current, fresh) {
  for (const name of current.getAttributeNames()) {
    if (!fresh.hasAttribute(name)) current.removeAttribute(name);
  }
  for (const attribute of fresh.attributes) {
    current.setAttribute(attribute.name, attribute.value);
  }
}

function syncStoryTimelineLabel(current, fresh) {
  syncStoryTimelineAttributes(current, fresh);
  if (current.innerHTML === fresh.innerHTML) {
    storyTimelinePendingLabels.get(current.closest("[data-tl]"))?.delete(current);
    return;
  }
  if (current.contains(document.activeElement)) {
    queueStoryTimelineLabelSync(current, fresh);
    return;
  }
  storyTimelinePendingLabels.get(current.closest("[data-tl]"))?.delete(current);
  current.innerHTML = fresh.innerHTML;
}

const storyTimelinePointerRoots = new WeakSet();
const storyTimelineActivePointers = new WeakMap();
const storyTimelinePendingRemoval = new WeakMap();
const storyTimelinePendingLabels = new WeakMap();
const storyTimelinePendingOrder = new WeakMap();
const storyTimelinePointerOwners = new Map();
const storyTimelinePendingSelections = new WeakMap();
const storyTimelineScheduledFlush = new WeakSet();
let storyTimelineDocumentPointersBound = false;

function applyStoryTimelineOrder(root, ids) {
  const grid = root.querySelector(".tl-grid");
  if (!grid) return;
  const lanes = new Map([...root.querySelectorAll("[data-tl-lane]")].map(
    lane => [lane.dataset.tlLane, lane],
  ));
  for (const id of ids) {
    const lane = lanes.get(id);
    const label = lane?.previousElementSibling;
    if (!lane || !label?.classList.contains("tl-label")) continue;
    grid.append(label, lane);
  }
}

function storyTimelineLaneHasFocus(root, activeElement = document.activeElement) {
  const row = activeElement?.closest?.(".tl-label, [data-tl-lane]");
  return Boolean(row && root.contains(row));
}

function flushStoryTimelinePending(root) {
  if (storyTimelineActivePointers.get(root)?.size) return;
  const activeElement = document.activeElement;
  const labels = storyTimelinePendingLabels.get(root);
  if (labels) {
    for (const [label, fresh] of [...labels]) {
      if (label.dataset.storyTimelineStale === "true" || !label.isConnected) {
        labels.delete(label);
      } else if (!label.contains(activeElement)) {
        labels.delete(label);
        syncStoryTimelineLabel(label, fresh);
      }
    }
  }
  const pending = storyTimelinePendingRemoval.get(root);
  if (pending) {
    for (const node of [...pending]) {
      if (!node.contains(activeElement)) {
        pending.delete(node);
        labels?.delete(node);
        if (node.dataset.storyTimelineStale === "true") node.remove();
      }
    }
  }
  const order = storyTimelinePendingOrder.get(root);
  if (order && !storyTimelineLaneHasFocus(root, activeElement)) {
    storyTimelinePendingOrder.delete(root);
    applyStoryTimelineOrder(root, order);
  }
}

function scheduleStoryTimelineFlush(root) {
  if (storyTimelineScheduledFlush.has(root)) return;
  storyTimelineScheduledFlush.add(root);
  setTimeout(() => {
    storyTimelineScheduledFlush.delete(root);
    flushStoryTimelinePending(root);
  }, 0);
}

function releaseStoryTimelinePointer(event) {
  const roots = storyTimelinePointerOwners.get(event.pointerId);
  storyTimelinePointerOwners.delete(event.pointerId);
  for (const root of roots || []) {
    const selection = storyTimelinePendingSelections.get(root);
    if (selection?.pointerId === event.pointerId) {
      storyTimelinePendingSelections.delete(root);
      if (event.type === 'pointerup' && !selection.moved
          && event.clientX === selection.x && event.clientY === selection.y
          && root.isConnected && root.contains(event.target)) {
        selectStoryTimelineRow(root, selection.rowId, selection.block,
          selection.pick ? null : selection.start, selection.insertionPoint, selection.nodeId);
        if (selection.pick) storyTimelineBinding(root).onSeek(storyTimelineBinding(root).currentFrame());
        if (selection.pick || selection.key) document.querySelector('.story-workbench-inspector')?.scrollTo(0, 0);
      }
    }
    // 指针保护延续到本次手势的 click/change 完成。
    setTimeout(() => {
      storyTimelineActivePointers.get(root)?.delete(event.pointerId);
      flushStoryTimelinePending(root);
    }, 0);
  }
}

function moveStoryTimelinePointer(event) {
  for (const root of storyTimelinePointerOwners.get(event.pointerId) || []) {
    const selection = storyTimelinePendingSelections.get(root);
    if (selection?.pointerId === event.pointerId
        && (event.clientX !== selection.x || event.clientY !== selection.y)) selection.moved = true;
  }
}

function releaseAllStoryTimelinePointers() {
  const roots = new Set();
  for (const owners of storyTimelinePointerOwners.values()) {
    owners.forEach(root => roots.add(root));
  }
  storyTimelinePointerOwners.clear();
  for (const root of roots) {
    storyTimelinePendingSelections.delete(root);
    setTimeout(() => {
      storyTimelineActivePointers.get(root)?.clear();
      flushStoryTimelinePending(root);
    }, 0);
  }
}

function bindStoryTimelineDocumentPointers() {
  if (storyTimelineDocumentPointersBound) return;
  storyTimelineDocumentPointersBound = true;
  document.addEventListener("pointermove", moveStoryTimelinePointer, true);
  document.addEventListener("pointerup", releaseStoryTimelinePointer, true);
  document.addEventListener("pointercancel", releaseStoryTimelinePointer, true);
  globalThis.addEventListener?.("blur", releaseAllStoryTimelinePointers);
}

function trackStoryTimelinePointers(root) {
  if (storyTimelinePointerRoots.has(root)) return;
  storyTimelinePointerRoots.add(root);
  bindStoryTimelineDocumentPointers();
  const active = new Set();
  storyTimelineActivePointers.set(root, active);
  root.addEventListener("pointerdown", event => {
    active.add(event.pointerId);
    if (!storyTimelinePointerOwners.has(event.pointerId)) {
      storyTimelinePointerOwners.set(event.pointerId, new Set());
    }
    storyTimelinePointerOwners.get(event.pointerId).add(root);
  }, true);
  root.addEventListener("focusout", () => {
    scheduleStoryTimelineFlush(root);
  }, true);
}

function queueStoryTimelineLabelSync(current, fresh) {
  const root = current.closest("[data-tl]");
  if (!root) return;
  if (!storyTimelinePendingLabels.has(root)) {
    storyTimelinePendingLabels.set(root, new Map());
  }
  storyTimelinePendingLabels.get(root).set(current, fresh.cloneNode(true));
}

function pruneStoryTimelineNodes(root, nodes) {
  if (!nodes.length) return;
  const activeElement = document.activeElement;
  const focused = nodes.some(node => node.contains(activeElement));
  if (!storyTimelineActivePointers.get(root)?.size && !focused) {
    nodes.forEach(node => node.remove());
    return;
  }
  if (!storyTimelinePendingRemoval.has(root)) {
    storyTimelinePendingRemoval.set(root, new Set());
  }
  const pending = storyTimelinePendingRemoval.get(root);
  nodes.forEach(node => pending.add(node));
}

function orderStoryTimelineNodes(root, ids) {
  const active = storyTimelineActivePointers.get(root)?.size;
  if (!active && !storyTimelineLaneHasFocus(root)) {
    applyStoryTimelineOrder(root, ids);
    return;
  }
  storyTimelinePendingOrder.set(root, [...ids]);
}

function syncStoryTimelineLayout(current, fresh) {
  syncStoryTimelineAttributes(current, fresh);
  for (const selector of ["[data-tl-play]", "[data-tl-readout]", "[data-tl-status]"]) {
    const target = current.querySelector(selector);
    const source = fresh.querySelector(selector);
    if (!target || !source) continue;
    target.innerHTML = source.innerHTML;
    if (source.hasAttribute("title")) target.title = source.title;
    else target.removeAttribute("title");
  }
  const ruler = current.querySelector("[data-tl-ruler]");
  const freshRuler = fresh.querySelector("[data-tl-ruler]");
  if (ruler && freshRuler) {
    syncStoryTimelineAttributes(ruler, freshRuler);
    ruler.innerHTML = freshRuler.innerHTML;
  }
  const grid = current.querySelector(".tl-grid");
  if (!grid) return;
  const lanes = new Map([...current.querySelectorAll("[data-tl-lane]")].map(
    lane => [lane.dataset.tlLane, lane],
  ));
  const freshIds = new Set();
  for (const freshLane of fresh.querySelectorAll("[data-tl-lane]")) {
    const id = freshLane.dataset.tlLane;
    freshIds.add(id);
    const freshLabel = freshLane.previousElementSibling;
    let lane = lanes.get(id);
    if (lane) {
      lane.removeAttribute("data-story-timeline-stale");
      const label = lane.previousElementSibling;
      label?.removeAttribute("data-story-timeline-stale");
      const pending = storyTimelinePendingRemoval.get(current);
      pending?.delete(lane);
      if (label) pending?.delete(label);
      syncStoryTimelineAttributes(lane, freshLane);
      lane.innerHTML = freshLane.innerHTML;
      if (label && freshLabel) syncStoryTimelineLabel(label, freshLabel);
      continue;
    }
    if (!freshLabel) continue;
    const label = freshLabel.cloneNode(true);
    lane = freshLane.cloneNode(true);
    bindStoryTimelineLane(current, lane);
    grid.append(label, lane);
  }
  const stale = [];
  for (const [id, lane] of lanes) {
    if (freshIds.has(id)) continue;
    const label = lane.previousElementSibling;
    lane.dataset.storyTimelineStale = "true";
    // 输入或指针手势尚未结束时，旧 lane 节点要留到安全时机再移除；但旧块已经
    // 不属于新编译结果，必须立刻清掉，否则活动 DOM 的几何仍会混入旧时间轴。
    lane.replaceChildren();
    stale.push(lane);
    if (label?.classList.contains("tl-label")) {
      label.dataset.storyTimelineStale = "true";
      stale.push(label);
    }
  }
  pruneStoryTimelineNodes(current, stale);
  orderStoryTimelineNodes(current, [...freshIds]);
  const model = storyTimelineModels.get(current.dataset.tl);
  prepareTimelineKeys(current, model.keyRecords);
  syncTimelineViewport(current, Number(freshRuler?.getAttribute('aria-valuemax')) || 1, storyViewport(model.view));
}

/**
 * 操作数 working 值变化后重算这一条时间轴的刻度与块位置。
 *
 * 逐帧播放绝不调用这里：计时器仍只走 updateStoryPlayback →
 * syncTimelinePlayer。这里也保留现有 transport、ruler、lane 与输入节点，只更新
 * 它们的属性/子块；因此失焦提交与 pointerdown 落在同一手势时也不会丢捕获。
 */
function refreshStoryTimelineLayout(root, entry) {
  if (!root?.isConnected || !entry?.sequence || !entry?.variant) return;
  const variantId = Number(entry.variant.id);
  // 先从当前工作台锁定唯一舞台，再沿逐帧刷新的同一条卡片边界找走带；剧情专页
  // 的走带是 #content 下的兄弟面板。
  const stage = root.querySelector(`[data-story-vm-variant="${variantId}"]`);
  const current = storyPlaybackCard(stage)?.querySelector(
    `[data-tl="story:${variantId}"]`,
  );
  if (!current) return;
  const compiled = buildStoryVmSequence(
    entry.sequence,
    entry.variant,
    storyPartyRuntimeOverrides(entry.sequence.id),
  );
  const next = storyTimelineElement(storyTimelineMarkup(compiled, entry.variant));
  if (!next) return;
  syncStoryTimelineLayout(current, next);
  storyTimelineSelectionMarkup.delete(current);
  const selected = storyTimelineSelectedBlocks.get(current);
  if (selected?.nodeId) {
    const model = storyTimelineModels.get(current.dataset.tl);
    const matches = block => block.data?.["story-node"] === selected.nodeId
      || (selected.commandId && block.command?.id === selected.commandId);
    const lane = model.lanes.find(item => item.rowId === state.storyTimelineRowId && item.blocks.some(matches))
      || model.lanes.find(item => item.blocks.some(matches));
    if (lane) {
      state.storyTimelineRowId = lane.rowId;
      selected.blockIndex = lane.blocks.findIndex(matches);
      const block = lane.blocks[selected.blockIndex];
      selected.nodeId = block.data?.["story-node"];
      selected.start = block.start;
    }
  }
  syncSelectedStoryTimelineRow(current);
}

function bindStoryPlayback(content) {
  bindReferencePicker(content.querySelector('[data-story-sequence-select]'), {onSelect: value => {
    const url = new URL(location.href);
    url.searchParams.set('storySequence', value);
    url.searchParams.set('storyPaused', '1');
    url.searchParams.delete('storyRow');
    void navigateInternalUrl(url);
  }});
  const root = content.querySelector('[data-story-workbench-editable]');
  const ready = [bindStoryPageIo(content, render),
    bindStoryPageAuthoring(content, render, storyVmSemanticsMap())
      .catch(error => {if (root?.isConnected) showEditorError(root, '剧情页', error);})];
  hydrateStorySceneOperands(document);
  document.querySelectorAll("#content [data-scene-position-picker]")
    .forEach(picker => hydrateScenePositionPicker(picker));
  ready.push(bindStoryWorkbench({
    refreshPlayback: updateStoryPlayback,
    refreshTimeline: refreshStoryTimelineLayout,
    seekPlayback: (id, frame, nodeId) => {
      state.storyCardFrame.set(Number(id), frame);
      state.storyCardPaused.add(Number(id));
      const stage = document.querySelector(`[data-story-vm-variant="${id}"]`);
      if (stage) stage.dataset.storySelectedNode = nodeId;
      updateStoryPlayback();
    },
  }));
  document.querySelectorAll("[data-story-vm-variant]").forEach(stage => {
    bindStoryStage(stage, state.view, objectId => {
      stage.dataset.storySelectedNode = objectId;
      updateStoryPlayback();
      stage.dispatchEvent(new CustomEvent("story-object-select", {
        bubbles: true, detail: {objectId},
      }));
    });
  });
  return Promise.all(ready);
}

async function startStoryTimer({reuse = false} = {}) {
  const timelines = document.querySelectorAll('#content [data-tl^="story:"]');
  timelines.forEach(root =>
    registerTimelineKeyRecords(root, storyTimelineModels.get(root.dataset.tl)?.keyRecords));
  const binding = reuse ? null : bindStoryPlayback(document.querySelector('#content'));
  const sound = previewSoundEnabled();
  document.querySelectorAll('#content [data-preview-sound]').forEach(control => {control.checked = sound;});
  const painted = reuse && !sound
    && [...document.querySelectorAll('[data-story-vm-variant]')].every(storyPlaybackStateMatches);
  const generation = storyMountGeneration;
  timelines.forEach(root => prepareTimelineKeys(root));
  const initialPlayback = Promise.resolve(binding).then(async () => {
    if (generation !== storyMountGeneration) return;
    bindStoryTimelines();
    if (!painted) await updateStoryPlayback();
  });
  const variantsById = new Map(
    storyVmAllActorLists().map(
      variant => [Number(variant.id), variant],
    ),
  );
  const entries = storyVmSequencesForView().map(sequence => ({
    sequence,
    variant: variantsById.get(Number(sequence.entry_variant_id)),
  })).filter(item => Boolean(item.variant));
  // 首帧绘制完成后再推进播放帧，避免计时器使异步绘制失效。
  await initialPlayback;
  if (generation !== storyMountGeneration || !entries.length) return;
  state.storyLastTick = performance.now();
  const timer = setInterval(() => {
    if (generation !== storyMountGeneration) {
      clearInterval(timer);
      if (state.storyTimer === timer) state.storyTimer = null;
      return;
    }
    const now = performance.now();
    const elapsed = now - state.storyLastTick;
    state.storyLastTick = now;
    const step = elapsed * 60 / 1000 * state.storySpeed;
    let advanced = false;
    const compilations = new Map();
    for (const {sequence, variant} of entries) {
      if (sequence.id !== state.storySequenceId) continue;
      // 全局暂停是总开关；单条暂停只影响自己。
      if (!state.storyPlaying || state.storyCardPaused.has(Number(variant.id))) {
        continue;
      }
      const compiled = buildStoryVmSequence(sequence, variant,
        storyPartyRuntimeOverrides(sequence.id));
      compilations.set(sequence.id, compiled);
      const duration = Math.max(1, compiled.duration);
      let next = storyCardFrame(variant.id) + step;
      if (next > duration * 1024) next %= duration;
      state.storyCardFrame.set(Number(variant.id), next);
      advanced = true;
    }
    if (advanced) updateStoryPlayback(compilations);
  }, 50);
  state.storyTimer = timer;
  return initialPlayback;
}

/**
 * 把每条剧情的时间轴接到壳上。
 *
 * 剧情的帧游标在 `state.storyCardFrame` 里，一条一个；拖动即暂停这一条，否则
 * 松手瞬间就被计时器推走了。壳只管交出「拖到了第几帧」。
 */
function storyTimelineBinding(root) {
  const id = Number(root.dataset.tl.split(":")[1]);
  const total = () => Math.max(1, Number(root.querySelector("[data-tl-ruler]")
    ?.getAttribute("aria-valuemax")) || 1);
  return {
    totalFrames: total,
    keyRecords: storyTimelineModels.get(root.dataset.tl)?.keyRecords,
    currentFrame: () => Math.floor(storyCardFrame(id)) % total(),
    onSeek: frame => {
      state.storyCardFrame.set(id, Math.max(0, Math.min(total() - 1, frame)));
      state.storyCardPaused.add(id);
      state.storyLastTick = performance.now();
      updateStoryPlayback();
    },
    onToggle: () => {
      if (!state.storyPlaying) {
        state.storyPlaying = true;
        state.storyCardPaused.delete(id);
      } else if (state.storyCardPaused.has(id)) state.storyCardPaused.delete(id);
      else state.storyCardPaused.add(id);
      state.storyLastTick = performance.now();
      updateStoryPlayback();
    },
    skip: event => Boolean(event.target.closest?.("[data-tl-frame], input, select, button")),
    onExpand: (laneId, expanded) => setStoryTreeExpanded(root, laneId, expanded),
    onViewport: value => {
      const view = storyTimelineModels.get(root.dataset.tl)?.view;
      if (!view) return;
      storyTimelineViewports.set(view, value);
      try {localStorage.setItem(`story-timeline-viewport:${view}`, JSON.stringify(value));} catch { /* 本机不可写时保留会话值。 */ }
    },
  };
}

function bindStoryTimelineLane(root, lane) {
  const host = document.createElement("div");
  host.append(lane);
  bindTimelinePlayer(host, {...storyTimelineBinding(root), coordinateRoot: root});
}

const storyTimelineSelectedBlocks = new WeakMap();
const storyTimelineDetailMarkup = new WeakMap();
const storyTimelineCurrentMarkup = new WeakMap();
const storyTimelineSelectionMarkup = new WeakMap();

function syncStoryTimelineCurrentValues(root, frame = null) {
  if (!root) return;
  const model = storyTimelineModels.get(root.dataset.tl);
  const lane = model?.lanes.find(item => item.rowId === state.storyTimelineRowId);
  if (!lane) return;
  const subject = lane.objectRoot ? lane : model.lanes.find(item => item.id === lane.parentId) || lane;
  const host = document.querySelector("[data-story-row-current]");
  if (!host) return;
  const markup = storyTimelineCurrentValues(model, subject, frame ?? storyTimelineBinding(root).currentFrame());
  if (storyTimelineCurrentMarkup.get(host) !== markup) {
    host.innerHTML = markup;
    storyTimelineCurrentMarkup.set(host, markup);
  }
}

function syncSelectedStoryTimelineRow(root) {
  const model = storyTimelineModels.get(root.dataset.tl);
  const lane = model?.lanes.find(item => item.rowId === state.storyTimelineRowId);
  const selection = storyTimelineSelectedBlocks.get(root);
  const selectedBlock = selection?.blockIndex == null ? null : lane?.blocks?.[selection.blockIndex];
  const pointCommand = selection?.insertionPoint ? (selection.insertionPoint === 'end'
    ? lane?.blocks?.findLast(block => block.command?.instructionId) : lane?.blocks?.find(block => block.command?.instructionId))?.command : null;
  const command = selectedBlock?.command || pointCommand;
  const toolbar = root.querySelector('[data-story-toolbar-command]');
  if (toolbar) {
    const key = `${lane?.id || ''}:${command?.instructionId || ''}:${selection?.insertionPoint || ''}`;
    if (toolbar.dataset.selection !== key) {
      toolbar.dataset.selection = key;
      toolbar.innerHTML = command?.instructionId ? (state.view === 'story-page' && !command.instructionBindings?.length ? storyPageKeyEditorMarkup : storyScriptStructureMarkup)(command,
        {insertionPoint: selection?.insertionPoint || null}) : storyToolbarEmpty();
      if (command?.instructionId) hydrateStoryTimelineCommandEditor(toolbar);
    }
    root.querySelector('[data-story-insertion-point]').textContent = selection?.insertionPoint === 'start'
      ? '在开头插入' : selection?.insertionPoint === 'end' ? '在结尾追加' : '';
  }
  const parent = lane?.objectRoot ? null : model?.lanes.find(item => item.id === lane?.parentId);
  const blocks = timelineSelectedBlocks(model?.lanes || [], lane?.id,
    selection?.start, selection?.blockIndex ?? null).filter(item => item.laneId === lane?.id);
  const selectionKey = JSON.stringify([lane?.id, parent?.id, selection?.start,
    blocks.map(block => block.blockIndex)]);
  const previous = storyTimelineSelectionMarkup.get(root);
  if (previous?.model !== model || previous?.key !== selectionKey) {
    root.querySelectorAll('[data-story-block-index].is-selected, .tl-block--summary.is-selected')
      .forEach(node => node.classList.remove('is-selected'));
    const selectedLane = lane && root.querySelector(`[data-tl-lane="${CSS.escape(lane.id)}"]`);
    for (const block of blocks) selectedLane?.querySelectorAll(
      `[data-story-block-index="${block.blockIndex}"]`).forEach(node => node.classList.add('is-selected'));
    if (selection) selectedLane?.querySelectorAll(`.tl-block--summary[data-tl-frame="${selection.start}"]`)
      .forEach(node => node.classList.add('is-selected'));
    root.querySelectorAll("[data-story-row]").forEach(row => {
      const selected = row.dataset.storyRow === lane?.id || row.dataset.storyRow === parent?.id;
      row.classList.remove("story-object-track-selected");
      row.classList.toggle("is-story-row-selected", selected);
      row.querySelector("[data-story-row-select]")?.setAttribute("aria-pressed", String(selected));
    });
    storyTimelineSelectionMarkup.set(root, {model, key: selectionKey});
  }
  const details = document.querySelector("[data-story-timeline-details]");
  if (!details) return;
  syncStoryPlaybackHidden(details, !lane);
  if (!lane) return;
  const updateCurrent = () => syncStoryTimelineCurrentValues(root);
  updateCurrent();
  const selected = storyTimelineSelectedBlocks.get(root);
  const frame = storyTimelineBinding(root).currentFrame();
  const block = selected?.blockIndex == null
    ? lane.objectRoot ? null : lane.blocks?.findLast(block => block.start <= frame && frame < block.start + (block.frames || 1))
    : lane.blocks?.[selected.blockIndex];
  const key = `${lane.id}:${block?.driver?.id || block?.command?.identity || ""}`;
  const summary = details.querySelector("[data-story-command-summary]");
  if (details.dataset.storySelectedKey === key && summary) {
    const markup = storyTimelineCommandSummary(block);
    if (summary.innerHTML !== markup) summary.innerHTML = markup;
  }
  if (details.dataset.storySelectedKey === key && details.contains(document.activeElement)
      && document.activeElement.matches("input, select, textarea, [contenteditable]")) return;
  details.dataset.storySelectedKey = key;
  const markup = storyTimelineRowDetails(model, parent || lane, block, lane,
    storyTimelineCommandEditor(block?.command, block?.data?.["story-node"], block));
  if (storyTimelineDetailMarkup.get(details) !== markup) {
    details.innerHTML = markup;
    storyTimelineDetailMarkup.set(details, markup);
    bindResourceQueries(details);
    hydrateStoryTimelineCommandEditor(details);
    details.onfocusout = () => queueMicrotask(() => syncSelectedStoryTimelineRow(root));
    updateCurrent();
  }
}

function selectStoryTimelineRow(root, rowId, block, start = null, insertionPoint = null, nodeId = null) {
  state.storyTimelineRowId = rowId;
  const model = storyTimelineModels.get(root.dataset.tl);
  const lane = model?.lanes.find(item => item.rowId === rowId);
  if (block?.command) state.storyMovementTimingBaselines.set(String(model.sequenceId), {
    commands: model.trace.commands, edited: block.command,
  });
  storyTimelineSelectedBlocks.set(root, {nodeId: block?.data?.["story-node"],
    commandId: block?.command?.id,
    blockIndex: block ? lane.blocks.indexOf(block) : null,
    start: start ?? block?.start ?? storyTimelineBinding(root).currentFrame(), insertionPoint});
  const id = Number(root.dataset.tl.split(":")[1]);
  const stage = document.querySelector(`[data-story-vm-variant="${id}"]`);
  if (stage) {
    stage.dataset.storySelectedNode = lane?.objectId || block?.data?.["story-node"] || nodeId || "";
    stage.dataset.storySelectedEvent = block?.data?.["story-node"] || "";
  }
  syncSelectedStoryTimelineRow(root);
}

function bindStoryTimeline(root) {
  if (boundStoryTimelines.has(root)) {
    restoreStoryTimelineRow(root);
    return;
  }
  boundStoryTimelines.add(root);
  storyTimelineSelectionMarkup.delete(root);
  trackStoryTimelinePointers(root);
  bindTimelinePlayer(root, storyTimelineBinding(root));
  bindPreviewSound(root, enabled => {
    if (!enabled) {updateStoryPlayback(); return;}
    void ensureAudioSequenceData().then(() => updateStoryPlayback())
      .catch(error => showEditorError(root, "剧情声音", error));
  });
  root.addEventListener("pointerdown", event => {
    if (event.button || event.target.closest?.("[data-tl-expand], input, select, .story-timeline-toolbar, [data-story-preview-path]")) return;
    const row = event.target.closest?.("[data-story-row]");
    if (!row) return;
    const lane = storyTimelineModels.get(root.dataset.tl)?.lanes.find(item => item.id === row.dataset.storyRow);
    if (!lane) return;
    const node = event.target.closest?.("[data-tl-frame]");
    const block = node?.hasAttribute("data-story-block-index")
      ? lane.blocks[Number(node.dataset.storyBlockIndex)] : null;
    const start = node ? Number(node.dataset.tlFrame) : row.hasAttribute("data-tl-lane")
      ? timelineFrameAt(root, row, event, storyTimelineBinding(root).totalFrames())
        : storyTimelineBinding(root).currentFrame();
    const insertionPoint = !block && row.hasAttribute('data-tl-lane')
      && lane.blocks?.some(block => block.command?.instructionId)
      ? start < 0 ? 'start' : start > storyTimelineBinding(root).totalFrames() ? 'end' : null : null;
    const pick = event.target.closest?.('[data-story-row-select]');
    storyTimelinePendingSelections.set(root, {pointerId: event.pointerId,
      x: event.clientX, y: event.clientY, moved: false, rowId: lane.rowId,
      block, start, insertionPoint, pick: Boolean(pick), key: Boolean(node), nodeId: node?.dataset.storyNode});
    if (!pick) event.preventDefault();
  }, true);
  root.addEventListener("click", event => {
    if (event.target.closest?.("[data-story-preview-path]")) return;
    if (event.target.closest?.("[data-tl-expand]")) return;
    const all = event.target.closest?.("[data-story-tree-all]");
    if (all) {
      for (const lane of storyTimelineModels.get(root.dataset.tl)?.lanes || []) {
        if (storyTimelineModels.get(root.dataset.tl).lanes.some(child => child.parentId === lane.id)) {
          setStoryTreeExpanded(root, lane.id, all.dataset.storyTreeAll === "true");
        }
      }
      return;
    }
    const pick = event.target.closest?.("[data-story-row-select]");
    if (pick && event.detail === 0) {
      const lane = storyTimelineModels.get(root.dataset.tl)?.lanes.find(item => item.id === pick.dataset.storyRowSelect);
      if (lane) {
        selectStoryTimelineRow(root, lane.rowId, null);
        storyTimelineBinding(root).onSeek(storyTimelineBinding(root).currentFrame());
        document.querySelector(".story-workbench-inspector")?.scrollTo(0, 0);
      }
    }
    const node = event.target.closest?.("[data-tl-frame]");
    const nodeId = node?.dataset.storyNode;
    const id = Number(root.dataset.tl.split(":")[1]);
    const stage = document.querySelector(`[data-story-vm-variant="${id}"]`);
    const selectedLane = storyTimelineModels.get(root.dataset.tl)?.lanes.find(item => item.rowId === state.storyTimelineRowId);
    if (nodeId && stage && event.detail === 0) stage.dataset.storySelectedNode = selectedLane?.objectId || nodeId;
    if (node && event.detail === 0) {
      syncSelectedStoryTimelineRow(root);
      document.querySelector(".story-workbench-inspector")?.scrollTo(0, 0);
    }
  }, true);
  restoreStoryTimelineRow(root);
}

function restoreStoryTimelineRow(root) {
  const lane = storyTimelineModels.get(root.dataset.tl)?.lanes.find(item => item.rowId === state.storyTimelineRowId);
  if (lane) {
    revealStoryTimelineRow(root, lane);
    selectStoryTimelineRow(root, lane.rowId, null);
    const id = Number(root.dataset.tl.split(':')[1]);
    state.storyCardFrame.set(id, Number(lane.blocks[0]?.start) || 0);
    state.storyCardPaused.add(id);
    state.storyLastTick = performance.now();
    document.querySelector(".story-workbench-inspector")?.scrollTo(0, 0);
  }
}

function revealStoryTimelineRow(root, lane) {
  const model = storyTimelineModels.get(root.dataset.tl);
  let parentId = lane.parentId;
  while (parentId) {
    setStoryTreeExpanded(root, parentId, true);
    parentId = model.lanes.find(item => item.id === parentId)?.parentId;
  }
  const row = [...root.querySelectorAll("[data-tl-lane]")].find(node => node.dataset.tlLane === lane.id);
  const scroll = root.querySelector(".tl-tree-scroll");
  if (row && scroll) scroll.scrollTop += row.getBoundingClientRect().top - scroll.getBoundingClientRect().top - 20;
}

function bindStoryTimelines() {
  document.querySelectorAll('[data-tl^="story:"]').forEach(bindStoryTimeline);
  const content = document.querySelector("#content");
  content?.addEventListener("story-object-select", event => {
    content.querySelectorAll("[data-story-stage-object]").forEach(actor => {
      const selected = actor.dataset.storyStageObject === event.detail.objectId;
      actor.classList.toggle("is-selected", selected);
      actor.setAttribute("aria-pressed", String(selected));
    });
    for (const root of content.querySelectorAll('[data-tl^="story:"]')) {
      const lane = storyTimelineModels.get(root.dataset.tl)?.lanes.find(item => item.objectRoot
        && item.objectId === event.detail.objectId);
      if (!lane) continue;
      setStoryTreeExpanded(root, lane.id, true);
      revealStoryTimelineRow(root, lane);
      selectStoryTimelineRow(root, lane.rowId, null);
    }
  }, {signal: storyTimelineObjectListenerSignal()});
}

let storyTimelineObjectListener;
function storyTimelineObjectListenerSignal() {
  storyTimelineObjectListener?.abort();
  storyTimelineObjectListener = new globalThis.AbortController();
  return storyTimelineObjectListener.signal;
}

// 某一条的当前帧。没有记录过就是 0。
function storyCardFrame(variantId) {
  return Number(state.storyCardFrame.get(Number(variantId))) || 0;
}

function renderCutsceneAnimation(view) {
  return renderStoryPlayback(view);
}

export { STORY_RESET_ITEM_ID, leaveStoryPlayback, prepareStoryAudio, rememberStoryPlayback, renderCutsceneAnimation, restoreStoryPlayback, startStoryTimer, updateStoryPlayback };
