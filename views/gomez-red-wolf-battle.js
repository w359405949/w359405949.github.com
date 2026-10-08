// @editor-module 戈麦斯基地红狼战斗复用当前剧情入口与战斗组合器。

import {esc, hex} from "../core/dom.js";
import {
  battlePartyVisualPosition,
  battleScenePreviewCatalog,
  battleScenePreviewForFormation,
  normalizeBattleScenePreview,
} from "../core/battle-scene-preview.js";
import {state} from "../core/state.js";
import {REDWOLF_BATTLE_SEQUENCE} from "../core/redwolf-battle-sequence.js";
import {battleSimulationMarkup, bindBattleSimulation} from "../ui/battle-simulation-player.js";
import {elementTree} from '../ui/element-tree.js';

function gomezRedWolfBattleModel(project = state.project) {
  const entry = project?.gomez_battle_entry;
  if (!entry || entry.missing) throw new TypeError(entry?.missing || '缺少剧情战斗入口');
  const catalog = battleScenePreviewCatalog(project);
  const redWolfAppearance = catalog.appearances.find(row => row.partyRoleId === entry.partyRoleId);
  if (!redWolfAppearance) {
    throw new TypeError("战斗形象目录缺少红狼的 NPC 狼战斗形象");
  }
  const formation = (project?.game_data?.battle_test?.formations || [])
    .find(item => Number(item.id) === entry.formationId);
  if (!formation) {
    throw new TypeError(`battle-test-point 缺少剧情编队 ${hex(entry.formationId, 2)}`);
  }
  const formationPreview = battleScenePreviewForFormation(
    project,
    entry.formationId,
    {guides: false},
  );
  const preview = normalizeBattleScenePreview({
    ...formationPreview,
    guides: false,
    party: formationPreview.party.map((member, index) => ({
      ...member,
      ...battlePartyVisualPosition(index, 1),
      visible: index === 0,
      normalAppearance: index === 0
        ? redWolfAppearance.key : member.normalAppearance,
      riding: false,
    })),
  }, project);
  const enemyGroups = preview.enemyGroups.flatMap(group => {
    if (!group.count) return [];
    const monster = catalog.monsters.find(
      item => Number(item.id) === Number(group.monsterId),
    );
    return [{...group, label: monster?.label || `怪物 ${hex(group.monsterId, 2)}`}];
  });
  return {
    preview,
    formation,
    redWolfAppearance,
    enemyGroups,
    entry,
  };
}

function sideFacts(entries) {
  return `<dl>${entries.map(([label, value]) => `<div>
    <dt>${esc(label)}</dt><dd>${esc(value)}</dd>
  </div>`).join("")}</dl>`;
}

export function renderGomezRedWolfBattle(project = state.project) {
  let model;
  try {model = gomezRedWolfBattleModel(project);}
  catch (error) {return `<p class="muted">${esc(error.message)}</p>`;}
  const enemyLabel = model.formation.label || model.enemyGroups.map(
    group => `${group.label}×${group.count}`,
  ).join(" + ");
  return battleSimulationMarkup({workbench: {
    namespace: 'gomez-red-wolf-battle', className: 'gomez-red-wolf-battle',
    attributes: {'data-gomez-red-wolf-battle': '', 'data-battle-scene-preview-host': ''},
    inspectorTitle: null, inspectorClassName: 'gomez-battle-side',
    inspectorMarkup: `<section data-gomez-battle-root-details><div class="page-global-info"><b>戈麦斯与红狼 · 战斗演算</b></div></section>
      <section data-gomez-battle-side="party"><div class="gomez-battle-side-body">
        <span class="badge confirmed">友方</span>
        <b>红狼</b>
        <p>步行参战</p>
        ${sideFacts([
          ["战斗形象", model.redWolfAppearance.label],
          ["资产引用", model.redWolfAppearance.key],
        ])}
      </div></section>
      <section data-gomez-battle-side="enemy"><div class="gomez-battle-side-body">
        <span class="badge confirmed">敌方</span>
        <b>${esc(enemyLabel)}</b>
        <p>${esc(model.enemyGroups.map(
          group => `${group.label} × ${group.count}`,
        ).join(" + "))}</p>
        ${sideFacts([
          ["剧情编队", `$${hex(model.entry.formationId, 2).slice(2)}`],
          ["在场敌人", `${model.preview.enemies.filter(Boolean).length}`],
        ])}
      </div></section>
    `,
    treeTitle: null, treeClassName: 'gomez-battle-side',
    treeMarkup: elementTree({showIcons: false,
      nodes: [{id: 'page-root', label: '戈麦斯与红狼'},
        {id: 'party', label: '友方预设', depth: 1}, {id: 'enemy', label: '敌方预设', depth: 1}],
      selectedId: 'page-root',
      buttonAttributes: (node, selected) => ({'data-gomez-battle-node': node.id, 'aria-pressed': String(selected)}),
    }),
  }});
}

export async function paintGomezRedWolfBattle(
  root = document,
  project = state.project,
) {
  const replay = root.querySelector("[data-battle-simulation]");
  if (!replay) return false;
  const workbench = replay.closest('[data-gomez-red-wolf-battle]');
  workbench.querySelectorAll('[data-gomez-battle-node]').forEach(button => {
    button.addEventListener('click', () => {
      const selected = button.dataset.gomezBattleNode;
      for (const node of workbench.querySelectorAll('[data-gomez-battle-node]')) {
        const active = node === button;
        node.setAttribute('aria-pressed', String(active));
        node.closest('.element-tree-node').classList.toggle('is-selected', active);
      }
      workbench.querySelector('[data-gomez-battle-root-details]').hidden = selected !== 'page-root';
      for (const details of workbench.querySelectorAll('[data-gomez-battle-side]'))
        details.hidden = selected !== 'page-root' && details.dataset.gomezBattleSide !== selected;
    });
  });
  const {preview, entry} = gomezRedWolfBattleModel(project);
  await bindBattleSimulation(replay, {
    trace: {...REDWOLF_BATTLE_SEQUENCE, formationId: entry.formationId}, preview, project,
    encounter: {kind: 'redwolf'},
  });
  return true;
}
