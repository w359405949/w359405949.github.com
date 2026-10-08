// @editor-module 结果页复用状态图、预览快照与所属字段对象的组件。
import {state} from '../core/state.js';
import {db} from '../core/project-db.js';
import {esc} from '../core/dom.js';
import {interfacePreviewContext} from '../core/interface-preview-context.js';
import {ensureSaveCurrentFieldObjects} from '../core/save-build.js';
import {battleResultRewardTotals} from '../core/battle-result-values.js';
import {battleEncounterResult} from '../render/battle-encounter-result.js';
import {battleResultGraph, battleResultExecution} from '../render/battle-result-state-machine.js';
import {InterfacePreviewSession} from '../render/interface-state-preview.js';
import {createInterfaceStateControllerWorkbench} from './interface-state-workbench.js';
import {gameUiStateComponents} from '../views/game-ui-workbench.js';
import {bindScreenWorkbenchBottomResize} from './screen-workbench.js';
import {showEditorError} from './editor-error.js';

const sessions = new Map();
const presentation = {namespace: 'battle-result-state', dataPrefix: 'battle-result-state', exitLabel: '返回调用者', notice: ''};
const current = () => {
  if (!sessions.has(state.projectRepository)) sessions.set(state.projectRepository, {path: '', node: null, fullGraph: false});
  return sessions.get(state.projectRepository);
};
const graphFor = () => battleResultGraph(state.project.ui.construction.menu_dispatch_data.previews);

export function battleResultStateControls(model) {
  if (model.id !== 'battle-results') return null;
  const selected = current(), context = interfacePreviewContext();
  const key = JSON.stringify([context.slot, context.actor, context.scene, context.formation, context.partyRoles, context.dropRoll]);
  if (selected.key !== key) {selected.path = ''; selected.node = null; delete selected.session;}
  selected.key = key; selected.model = model;
  if (selected.path && selected.session) selected.node = selected.session.state.node;
  else if (!selected.node || selected.screen !== model.selectedScreen?.id) selected.node = graphFor().nodes
    .find(node => node.id === state.interfacePageEntry)?.id || model.selectedScreen?.interface_state_id;
  selected.screen = model.selectedScreen?.id;
  const snapshot = selected.path ? selected.session?.state : null;
  selected.workbench = createInterfaceStateControllerWorkbench({pageId: model.id,
    contextRequirements: ['preview-context', 'save-fields', 'battle-completion', 'drop-roll'],
    entry: {pageId: model.id, outcome: selected.path, caller: 'battle'}, selection: current, graph: graphFor,
    presentation: {...presentation, count: '5 个状态'}, available: () => true,
    initialize: async value => {Object.assign(selected, await start(value)); selected.path = value;},
    inputs: () => selected.session?.state.execution.status === 'waiting' ? ['a', 'b'] : [],
    preview: resultPreview,
    components: gameUiStateComponents(`interface-page:${model.id}`, () => model.nodes)});
  return {toolbar: `<label>路径 <select data-battle-result-state-path>
    <option value="">自由查看</option><option value="victory"${selected.path === 'victory' ? ' selected' : ''}>胜利结算</option>
    <option value="defeat"${selected.path === 'defeat' ? ' selected' : ''}>败北返回</option>
    <option value="unknown"${selected.path === 'unknown' ? ' selected' : ''}>未分胜负</option></select></label>
    <button class="button" data-battle-result-state-previous${!snapshot || selected.session.position === 0 ? ' disabled' : ''}>上一步</button>
    ${snapshot ? ['a', 'b'].map(type => `<button class="button" data-battle-result-state-input="${type}"${snapshot.execution.status === 'waiting' ? '' : ' disabled'}>${type.toUpperCase()}</button>`).join('') : ''}
    <span data-battle-result-state-status>${esc(snapshot?.execution.reason || '')}</span>
    ${snapshot?.domainResults.battleResult.unconfirmed.length ? `<span>${esc(snapshot.domainResults.battleResult.unconfirmed.join('；'))}；未提交这些结果</span>` : ''}`,
    bottom: selected.workbench.graphMarkup()};
}

export function battleResultStatePreview(preview) {
  if (!preview?.battle_results) return preview;
  return current().workbench ? current().workbench.preview(preview) : resultPreview(preview);
}

function resultPreview(preview) {
  const selected = current(), snapshot = selected.path ? selected.session?.state : null;
  const phase = (snapshot?.node || selected.node)?.split('.').at(-1);
  const source = graphFor().nodes.find(row => row.phase === phase)?.publishedPreview;
  if (!snapshot) return phase === 'story-commit' ? {...preview, battle_results: {phase: 'returned'}, layers: []} : source || preview;
  return {...(source || preview), battle_result_execution: snapshot,
    ...(snapshot.execution.status === 'returned' ? {battle_results: {phase: 'returned'}, layers: []} : {})};
}

async function start(outcome) {
  const context = structuredClone(interfacePreviewContext());
  const [save, formations, monsters, growth] = await Promise.all([ensureSaveCurrentFieldObjects(state),
    db.getResourceDocument('battle-test-point'), db.getAll('monster'), db.getResourceDocument('character-growth')]);
  const fields = Object.fromEntries(save.all(`save.slot.${context.slot}.`).map(field => [field.fieldId, structuredClone(field.value)]));
  const slugs = ['hunter', 'mechanic', 'soldier'];
  const party = context.partyRoles.map(slot => {
    const slug = slugs[slot], prefix = `save.slot.${context.slot}.role.${slug}.`;
    return {id: `party:${slot}`, roleId: slot, side: 'party', slug, currentVehicle: fields[`${prefix}current_vehicle`],
      present: fields[`${prefix}present`] || slot + 1, hp: outcome === 'defeat' ? 0 : fields[`${prefix}current_hp`],
      status: outcome === 'defeat' ? 255 : fields[`${prefix}status`]};
  });
  const formation = formations.formations.find(row => row.id === context.formation);
  const deaths = formation?.slots.flatMap((group, index) => Array.from({length: group.count}, (_, item) => {
    const monster = monsters.find(row => row.id === group.monster_id);
    return {instance: `${index}:${item}`, monsterId: group.monster_id,
      experience: monster?.experience.value, gold: monster?.gold.value};
  })) || [];
  const enemy = {side: 'enemy', hp: outcome === 'victory' ? 0 : 1, status: outcome === 'victory' ? 255 : 0};
  const input = {monsters, growth, encounter: {saveSlot: context.slot, fields, pendingEventFlag: 0,
    targetStoryState: 0, scene: context.scene || {sceneId: fields[`save.slot.${context.slot}.scene_id`]}}};
  const completion = battleEncounterResult(input, [...party, enemy], battleResultRewardTotals(deaths), [], {deaths, dropRoll: context.dropRoll});
  const adapter = battleResultExecution(completion);
  return {adapter, session: new InterfacePreviewSession(adapter.initial({fields, context, returnStack: [{caller: 'battle'}]}))};
}

export function bindBattleResultStateController(root, {rerender}) {
  const path = root?.querySelector('[data-battle-result-state-path]');
  if (!path) return;
  const selected = current();
  bindScreenWorkbenchBottomResize({root, namespace: 'interface-page:battle-results'});
  selected.workbench.bind(root, {cacheKey: 'battle-result-state'});
  const perform = action => async event => {
    try {
      await action(event);
      if (selected.path && selected.session) {
        selected.node = selected.session.state.node;
        const screen = state.project.ui.editor.screens.find(row => row.interface_state_id === selected.node);
        if (screen) state.interfacePageScreen = screen.id;
      }
      await rerender();
    }
    catch (error) {showEditorError(root, '结果输入', error);}
  };
  path.addEventListener('change', perform(async event => {
    const value = event.target.value;
    if (!value) {selected.path = ''; delete selected.session; return;}
    await selected.workbench.initialize(value);
  }));
  root.querySelector('[data-battle-result-state-previous]').addEventListener('click', perform(() => selected.session.previous()));
  root.querySelectorAll('[data-battle-result-state-input]').forEach(button => button.addEventListener('click', perform(() =>
    selected.workbench.advance({type: button.dataset.battleResultStateInput}))));
  root.querySelectorAll('[data-battle-result-state-node]').forEach(button => button.addEventListener('click', perform(() => {
    selected.path = ''; delete selected.session; selected.node = button.dataset.battleResultStateNode;
    const source = graphFor().nodes.find(row => row.id === selected.node)?.publishedPreview;
    if (source) state.interfacePageScreen = state.project.ui.editor.screens.find(row => row.interface_state_id === source.interface_state_id)?.id;
  })));
  root.querySelector('[data-battle-result-state-full-graph]').addEventListener('click', perform(() => {selected.fullGraph = !selected.fullGraph;}));
  root.querySelectorAll('[data-battle-result-state-edge]').forEach(button => button.addEventListener('click', () => {
    const edge = graphFor().edges.find(row => row.id === button.dataset.battleResultStateEdge);
    selected.edge = edge.id;
    root.querySelector('[data-game-ui-inspector-detail]').innerHTML = `<dl><dt>输入</dt><dd>${esc(edge.input)}</dd><dt>条件</dt><dd>${esc(edge.condition)}</dd></dl>`;
  }));
  root.addEventListener('field-object-saved', () => {selected.path = ''; delete selected.session;});
}
