// @editor-module 剧情页的执行链、角色绑定与语义指令编辑控件。
import {db} from '../../core/project-db.js';
import {state} from '../../core/state.js';
import {esc} from '../../core/dom.js';
import {createAutoSave} from '../../core/auto-save.js';
import {changeStoryPageInstructions} from '../../core/story-page-editing.js';
import {fieldCameraOrigin} from '../../core/story-camera.js';
import {storyCommandPresentation} from '../../core/story-command-presentation.js';
import {storyCommandPickerMarkup, bindStoryCommandPicker} from './command-picker.js';
import {storyInsertionBytes, mountStoryTokenOperands} from './inserted-command-controls.js';
import {scenePositionPickerMarkup, hydrateScenePositionPicker} from '../scene/components.js';
import {referencePickerMarkup, bindReferencePicker} from '../../ui/reference-picker.js';
import {prepareModuleComponent, renderModuleComponent, hydrateModuleComponents} from '../../ui/module-components.js';
import {actorAppearanceContextForScene, sceneActorVisualMarkup, hydrateStoryActorVisuals} from '../../ui/actor-appearance.js';
import {timelinePlayer} from '../../ui/timeline-player.js';
import {screenWorkbench, screenWorkbenchCanvasStage} from '../../ui/screen-workbench.js';
import {elementTree} from '../../ui/element-tree.js';
import {storyPageDefinitionForView} from '../../core/story-view-config.js';
import {sceneActorName} from '../../core/scene-actor-labels.js';
import {sceneActorRecord} from '../../core/scene-actors.js';

const selections = new Map();
const sessions = new Map();
const hex = value => Number(value).toString(16).toUpperCase().padStart(2, '0');
const pageId = () => state.view === 'story-page' ? state.storyPageId : null;
const sequenceLabel = (sequence, sequences) => String(sequence.content.label || '').trim()
  || `执行链 ${sequences.indexOf(sequence) + 1}`;
const actorLabel = handle => sceneActorName(sceneActorRecord(handle)).label;
const programLabel = program => program.kind === 'interaction' ? '交互指令' : '自主动作指令';
const selectionFor = page => {
  if (!selections.has(page)) selections.set(page, {});
  return selections.get(page);
};

export const storyPageAuthoringTreeMarkup = () => pageId() ? `<div data-story-page-authoring>
  <div class="story-workbench-tree-head"><h3>对象树</h3><button class="button ghost" type="button" data-story-page-add-sequence>＋ 执行链</button></div>
  <div data-story-page-document-tree></div>
</div>` : '';
export const storyPageAuthoringInspectorMarkup = () => pageId()
  ? '<section data-story-page-authoring-inspector><h3>详情</h3><div data-story-page-document-details></div><p data-story-page-edit-error role="alert" hidden></p></section>' : '';

export function storyPageEmptyWorkbenchMarkup() {
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

export function storyPageKeyEditorMarkup(command, {insertionPoint = null} = {}) {
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

export async function bindStoryPageAuthoring(root, rerender, semantics) {
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
  tree.querySelector('[data-story-page-add-sequence]').addEventListener('click', () => {
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
          entry_variant_id: `scene-actor-list:${hex(table.entry_id)}`, variant_ids: [`scene-actor-list:${hex(table.entry_id)}`],
          shots: [{shot_index: 0, kind: 'actor-list', variant_id: `scene-actor-list:${hex(table.entry_id)}`, scene_id: `scene:${hex(sceneId)}`}],
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
    const scene = await db.getResourceDocument(`scene:${hex(sceneId)}`);
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

export async function hydrateStoryPageKeyEditors(root, rerender) {
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
