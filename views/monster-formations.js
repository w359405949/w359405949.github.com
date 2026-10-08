// @editor-module 怪物编队的列表、战斗预览、字段编辑与使用处。
import {esc} from '../core/dom.js';
import {db} from '../core/project-db.js';
import {state} from '../core/state.js';
import {formationUsage, formationGroup, FORMATION_GROUPS} from '../core/formation-usage.js';
import {encounterFormationGroups} from '../core/scene-encounter-probabilities.js';
import {battleScenePreviewForFormation} from '../core/battle-scene-preview.js';
import {screenWorkbench} from '../ui/screen-workbench.js';
import {elementTree} from '../ui/element-tree.js';
import {battleSimulationMarkup, bindBattleSimulation} from '../ui/battle-simulation-player.js';
import {scenePositionPickerMarkup, hydrateScenePositionPicker} from '../modules/scene/components.js';
import {renderBattleTestFormationInlineEditor, battleTestFormationDisplayLabel} from './battle.js';
import {bindSceneBattleTestFormationEditor} from './battle-bind.js';
import {navigateToResourceTarget} from '../core/resource-nav.js';
import {flushAllAutoSaves} from '../core/auto-save.js';

const handle = id => `encounter-formation:${Number(id).toString(16).toUpperCase().padStart(2, '0')}`;
const resourceLink = (resource, label) => `<button type="button" class="resource-inline-link"
  data-resource-target="${esc(resource)}">${esc(label)}</button>`;

function positionMarkup(position) {
  return scenePositionPickerMarkup({entries: state.project.scenes.editable_scenes,
    sceneId: position.sceneId, x: position.x, y: position.y,
    sceneObject: position.sceneObject, encounterZone: position.encounterZone,
    readOnly: true, deferCandidates: true, label: '使用位置'});
}

function usageMarkup(rows) {
  if (!rows.length) return '<p class="resource-empty">已确认消费者中未见引用。</p>';
  return rows.map(row => `<section class="formation-use"><h4>${row.resource
    ? resourceLink(row.resource, row.label) : row.href
      ? `<a class="editor-inline-link" href="${esc(row.href)}">${esc(row.label)} ↗</a>` : esc(row.label)}</h4>${
    Number.isInteger(row.sceneId) ? positionMarkup(row) : (row.positions || []).map(positionMarkup).join('')
  }</section>`).join('');
}

export async function renderMonsterFormations() {
  const project = state.project;
  const formations = project.game_data.battle_test.formations;
  const monsters = project.game_data.monsters.records;
  const uses = await formationUsage(db);
  const requested = /^encounter-formation:([0-9A-F]{2})$/iu.exec(state.resourceId || state.recordId || '');
  const selected = formations.find(row => Number(row.id) === (requested ? parseInt(requested[1], 16) : 1)) || formations[0];
  const selectedUses = uses.get(Number(selected.id)) || [];
  return screenWorkbench({namespace: 'monster-formations', treeTitle: '编队', treeScroll: 'body', inspectorScroll: 'body',
    attributes: {'data-formation-id': selected.id},
    treeMarkup: FORMATION_GROUPS.map(([kind, label]) => {
      const rows = formations.filter(row => formationGroup(uses.get(Number(row.id)) || []) === kind);
      return rows.length ? `<h3>${label}</h3>${elementTree({showIcons: false, selectedId: handle(selected.id),
        nodes: rows.map(row => ({id: handle(row.id), label: battleTestFormationDisplayLabel(row, monsters)})),
        buttonAttributes: node => ({'data-formation-select': node.id}),
      })}` : '';
    }).join(''),
    stageMarkup: `<div class="screen-workbench-stage-content">${battleSimulationMarkup({singleAction: true})}</div>`,
    inspectorTitle: null,
    inspectorMarkup: `<div>${renderBattleTestFormationInlineEditor(selected.id)}<h3>使用处</h3>${usageMarkup(selectedUses)}</div>`,
  });
}

export async function bindMonsterFormations() {
  const root = document.querySelector('[data-screen-workbench="monster-formations"]');
  if (!root) return;
  root.querySelector('.element-tree-node.is-selected')?.scrollIntoView({block: 'nearest'});
  const id = Number(root.dataset.formationId);
  let player;
  const preview = () => {
    const project = state.project;
    const formations = project.game_data.battle_test.formations;
    const groups = encounterFormationGroups(formations, id);
    const formation = formations.find(row => Number(row.id) === id);
    const previewProject = {...project, game_data: {...project.game_data, battle_test: {...project.game_data.battle_test,
      formations: formations.map(row => Number(row.id) === id ? {...formation,
        slots: Array.from({length: 4}, (_, index) => ({monster_id: groups[index]?.monsterId || 0,
          count: groups[index]?.count || 0}))} : row),
    }}};
    return battleScenePreviewForFormation(previewProject, id);
  };
  const repaint = async () => {
    if (!root.isConnected) return;
    const formation = state.project.game_data.battle_test.formations.find(row => Number(row.id) === id);
    root.querySelector('.element-tree-node.is-selected b').textContent =
      battleTestFormationDisplayLabel(formation, state.project.game_data.monsters.records);
    if (player) await player.update({project: state.project, preview: preview()});
  };
  await bindSceneBattleTestFormationEditor(root, repaint);
  for (const field of (await db.getFields('battle-test-point')).filter(row => row.recordId === id))
    field.bind(root, (_host, _value, _field, reason) => {
      if (reason !== 'initial') void repaint();
    });
  player = await bindBattleSimulation(root.querySelector('[data-battle-simulation]'),
    {project: state.project, preview: preview()});
  for (const picker of root.querySelectorAll('[data-scene-position-picker]'))
    hydrateScenePositionPicker(picker, {entries: state.project.scenes.editable_scenes});
  for (const button of root.querySelectorAll('[data-formation-select]')) button.addEventListener('click', async () => {
    await flushAllAutoSaves();
    await navigateToResourceTarget(button.dataset.formationSelect);
  });
}
