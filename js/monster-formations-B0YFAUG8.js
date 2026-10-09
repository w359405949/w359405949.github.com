import { recordUid, esc, $, hydrateModuleComponents, requireBrowserProjectRepository, setProjectFields, audioCommandLabel, screenWorkbench, elementTree, renderModuleComponent } from './element-tree-DsgOBeTK.js';
import { projectFieldDraftRevision, projectStoryScriptPrograms, battleTestFormationDraftError, hex, db, trackAutoSavePreparation, flushAllAutoSaves } from './battle-result-script-runtime-B_EClFew.js';
import { state, battleSimulatorMode } from './emulator-DynsZsth.js';
import { encounterCandidate, battleModeForPendingEventFlag, battleFirstMonsterId } from './encounter-DuEBgoNG.js';
import { hydrateScenePositionPicker, syncScenePositionPicker, sceneDetailHref } from './components-DqADvo3I.js';
import { battleTestFormationDisplayLabel, battleTestFormation, battleTestFormationDraft, BATTLE_TEST_EMPTY_FORMATION_SLOT, battleTestDraftFromDocument, rebuildBattleSelectedFormation, battleTestDraftError, battleTestEditorStatus, updateBattleTestOriginalControls, BATTLE_TEST_ENTRY_RESET_KEY, battleTestEntryLocalDirty, battleTestFormationResetKey, battleTestFormationLocalDirty, battleTestViewPending, battleTestDraftAfterEntryReset, battleTestDraftAfterFormationReset, battleTestEntryResetBlockedReason, renderBattleTestFormationInlineEditor } from './battle-7-3MjX6d.js';
import { editorLog } from './visual-metasprites-DJP54-bV.js';
import { battleScenePreviewCatalog, battleScenePreviewForFormation, normalizeBattleScenePreview, battlePartyVisualPosition } from './battle-actors-B548R92n.js';
import { simulateBattle, bindBattleSimulation, paintBattleSceneComposerCanvas } from './battle-simulation-player-ZYN9IgYB.js';
import { globalRandom } from './facility-window-semantics-BvUme8Kk.js';
import { bindBattleSceneComposer, battleSceneComposerControls } from './battle-scene-composer-2IiON3Cb.js';
import { replaceHistoryUrl, currentViewUrl, render, navigateInternalUrl } from './ui-editor-nodes-CtPdwTyu.js';
import { bindInPageTabs, inPageTabs } from './in-page-tabs-BYzTkeOF.js';
import { bindGroupedReferenceSelect, configureAnimatedResourcePicker, syncReferencePickerControl, referencePickerMarkup, bindReferencePicker } from './scene-elevators-N46oPTJC.js';
import { copyFieldDocumentView, ensureBattleSceneData } from './overview-CxFLx7O1.js';
import { copyEditorDraft } from './monsters-BPjlt1RQ.js';
import { bindFieldResetToOriginalButtons } from './pattern-pixel-editor-B8puYQ8A.js';
import { navigateToResourceTarget } from './preview-sound-DsPhxRYS.js';

// @editor-module 固定编队的当前引用与场景位置投影。

const hex2 = value => Number(value).toString(16).toUpperCase().padStart(2, '0');

async function formationUsage(database) {
  const [story, autonomous, interaction, events, zones, battle, wanted, actors] = await Promise.all([
    database.getDocument('project.story'),
    database.getResourceDocument('story-autonomous-script'),
    database.getResourceDocument('story-interaction-script'),
    database.getResourceDocument('world-event'),
    database.getDocument('scene-encounter-zone'),
    database.getDocument('battle-test-point'),
    database.getDocument('wanted-record'),
    database.getDocument('scene-actor'),
  ]);
  return database.reusePreviewProjection('formation-usage', [story, autonomous, interaction,
    events, zones, battle, wanted, actors,
    ...[story, autonomous, interaction, events, zones, battle, wanted, actors].map(projectFieldDraftRevision)],
  () => prepareFormationUsage(database, {story, autonomous, interaction, events, zones, battle, wanted, actors}));
}

async function prepareFormationUsage(database, {story, autonomous, interaction, events, zones, battle, wanted, actors}) {
  const uses = new Map();
  const append = (id, row) => {
    if (!Number.isInteger(id)) return;
    if (!uses.has(id)) uses.set(id, []);
    uses.get(id).push(row);
  };
  for (const row of events.records) append(Number(row.encounter_formation_id), {
    kind: 'coordinate', label: `固定坐标战斗 ${hex2(row.id)}`,
    sceneId: Number(row.scene_id), x: Number(row.trigger_x), y: Number(row.trigger_y),
    sceneObject: `event:${row.id}`,
  });
  const vm = story.browser_vm;
  const encounterOpcodes = new Set(vm.opcode_semantics.filter(row =>
    row.operation === 'start-scripted-encounter').map(row => row.opcode));
  const lists = [...vm.variants, ...vm.continuation_actor_lists, ...vm.extended_actor_lists,
    ...vm.interaction_actor_lists];
  for (const [kind, asset] of [['autonomous', autonomous], ['interaction', interaction]]) {
    const published = vm.programs.filter(row => (row.kind || 'autonomous') === kind);
    const known = new Set(published.map(row => row.id));
    const remaining = await Promise.all(story[kind].entries.filter(row => !known.has(row.id))
      .map(row => database.getPackageDocument(`game/story/${row.path}`)));
    const programs = projectStoryScriptPrograms(asset, [...published, ...remaining]);
    for (const program of programs) for (const command of program.commands) {
      if (!encounterOpcodes.has(command.opcode)) continue;
      const positions = (actors.records || []).filter(actor => kind === 'autonomous'
        ? Number(actor.autonomous_script_id) === program.id
        : actor.interaction_mode === 'interaction-script' && Number(actor.interaction_or_record_id) === program.id)
        .flatMap(actor => (actors.tables || []).filter(table => table.entry_id === actor.entry_id
          && Number.isInteger(table.owner?.scene_id)).map(table => ({sceneId: table.owner.scene_id,
            x: Number(actor.x), y: Number(actor.y), sceneObject: `actor:${actor.id}`})));
      for (const list of lists) for (const actor of list.actors || []) {
        if (kind !== 'autonomous' || Number(actor.autonomous_script_id) !== program.id) continue;
        const sceneId = list.story_mode_context?.scene_id ?? list.entry_context?.scene_id ?? list.selection?.scene_id ?? list.scene_id;
        if (Number.isInteger(sceneId)) positions.push({sceneId, x: Number(actor.x), y: Number(actor.y)});
      }
      append(Number(command.operands[0]), {
        kind: 'script', label: `${kind === 'autonomous' ? '自主' : '交互'}剧情 ${hex2(program.id)} · ${hex2(command.cursor)}`,
        href: `?view=actors&actorPart=story&storyKind=${kind}&record=${program.id}#story-script-field-object`,
        positions: positions.filter((row, index) => positions.findIndex(other =>
          other.sceneId === row.sceneId && other.x === row.x && other.y === row.y) === index),
      });
    }
  }
  for (const zone of zones.zones) {
    if (!Number(zone.zone_id)) continue;
    for (const entry of zone.entries) {
      const candidate = encounterCandidate(entry);
      if (candidate.empty || candidate.kind !== 'formation') continue;
      const positions = zones.scene_zones.assignments.filter(row => Number(row.zone_id) === Number(zone.zone_id))
        .map(row => ({sceneId: Number(row.scene_id), x: null, y: null, encounterZone: zone.zone_id}));
      for (const block of zones.world_grid.blocks.filter(row => Number(row.zone_id) === Number(zone.zone_id)))
        positions.push({sceneId: 0, x: Number(block.cell_x), y: Number(block.cell_y), encounterZone: zone.zone_id});
      append(candidate.value, {kind: 'random', label: `随机遇敌区 ${hex2(zone.zone_id)} · 槽 ${candidate.slot + 1}`,
        resource: `scene-encounter-zone:zone:${hex2(zone.zone_id)}`, slot: candidate.slot + 1, positions});
    }
  }
  for (let id = 1; id <= 11; id++) append(id, {
    kind: 'wanted', label: '通缉目标与结局回顾', href: `?view=wanted&resource=wanted-record:bounty:${id}`,
  });
  for (const row of [{...wanted.default_pair, index: 0}, ...wanted.targets]) {
    for (const id of new Set([Number(row.high_target_id), Number(row.low_target_id)]))
      append(id, {kind: 'poster', label: `通缉海报目标对 ${hex2(row.index)}`,
        href: `?view=wanted-ui&wantedTarget=${row.index === 0 ? 'default' : row.index}&wantedSide=${Number(row.high_target_id) === id ? 'high' : 'low'}`,
        ...(row.scene_id == null ? {} : {sceneId: Number(row.scene_id), x: null, y: null})});
  }
  append(Number(battle.encounter_id), {
    kind: 'test', label: '调查战斗测试', href: `?view=battle-test&battleFormation=${Number(battle.encounter_id)}`,
    sceneId: Number(battle.scene_id), x: Number(battle.x), y: Number(battle.y),
  });
  append(0, {kind: 'shared', label: '随机遇敌后续候选重映射', resource: 'code-module:random-encounter-service'});
  return uses;
}

const FORMATION_GROUPS = Object.freeze([
  ['wanted', '赏金首'], ['script', '剧情战斗'], ['coordinate', '固定坐标战斗'],
  ['random', '随机遇敌'], ['test', '战斗测试'], ['shared', '共用字节'], ['unused', '其他编队'],
]);

function formationGroup(uses) {
  return FORMATION_GROUPS.find(([kind]) => uses.some(row => row.kind === kind))?.[0] || 'unused';
}

// @editor-module 已发布的戈麦斯与红狼 Mesen 战斗事件投影。

const SOURCE = "project/evidence/mesen/redwolf-battle-trace/timeline.jsonl";
const PATTERN = "enemy-action-pattern:0A";
const actions = {
  "04": {resultScriptHandle: "battle-result-script:29", attackVisualHandle: "attack-visual:02",
    source: "monster:12:4", selectionSlot: 1},
  "05": {resultScriptHandle: "battle-result-script:01", attackVisualHandle: "attack-visual:01",
    source: "monster:12", selectionSlot: 0},
};
const runtime = {monsterId: 0x0C, enemyGroupCount: 1};

function retainedDamageSequence(promptRecord, damageRecord) {
  return [
    {state: "battle-messages.action", slot: "slot:message:0",
      text_record_ref: {resource_id: "text-record", node_id: promptRecord},
      retain_previous: false},
    {state: "battle-messages.damage", slot: "slot:message:0",
      text_record_ref: {resource_id: "text-record", node_id: damageRecord},
      retain_previous: true},
  ];
}

function turn(frame, number, hp, shield, seed) {
  return {frame, event: `第 ${number} 回合开始`, message: `红狼 HP ${hp}；戈麦斯护罩 ${shield}`,
    hp: String(hp), shield, statusWindow: {label: "HP", value: hp},
    actionPatternHandle: PATTERN,
    romBasis: `PRG $02052B 排序；$37/$38=${seed}；PRG $0203FD 选择敌方行动`,
    evidence: `${SOURCE}：${frame === 2738 ? 2741 : frame} turn-queue；画面取第 ${frame} 帧`};
}

function attack(frame, sourceFrame, action, hp, attackFrameIndex = null) {
  const {source, selectionSlot, ...handles} = actions[action];
  return {frame, event: "戈斯战车攻击红狼", message: "戈斯战车的攻击！",
    hp: String(hp), statusWindow: {label: "HP", value: hp},
    actionPatternHandle: PATTERN, actionHandle: `enemy-action:${action}`,
    ...handles, attack: {side: "enemy", attacker: 0, partyTarget: 0, source, selectionSlot},
    attackFrameIndex,
    messageRecordId: "record:0A:112", messageRuntime: runtime,
    romBasis: `PRG $020506 写 $71B5=$${action}；行动 ${action} 指向消息 112、结果脚本与攻击视觉`,
    evidence: `${SOURCE}：${sourceFrame} gomez-attack-message；画面第 ${frame} 帧`
      + (attackFrameIndex === null ? "" : `；攻击视觉剪辑第 ${attackFrameIndex} 帧与 Mesen 同帧核对`),
    missing: attackFrameIndex === null ? ["本次视觉特效起止帧与攻击位置"]
      : ["攻击视觉结束帧与受击时序"]};
}

function wolfDamage(frame, sourceFrame, amount, hp, statusWindow = {label: "HP", value: hp}) {
  return {frame, event: "红狼受伤", message: `狼损伤了 ${amount}！；HP ${hp}`,
    hp: statusWindow.label === "SI" ? "SI 0" : String(hp), statusWindow,
    messageRecordId: "record:0A:008",
    messageSequence: retainedDamageSequence("record:0A:112", "record:0A:008"),
    messageRuntime: {monsterId: 0x0C, enemyGroupCount: 1, placeholders: {
      "ui-text-provider-workspace.current-string": {text: "狼", label: "Mesen 文本观察"},
      "ui-text-provider-zero-page-overlays.battle-quantity": {text: String(amount), label: "Mesen 伤害观察"},
    }},
    romBasis: "PRG $02EF03 计算伤害；PRG $02F011 扣除红狼 HP",
    evidence: `${SOURCE}：${sourceFrame} wolf-damage；画面第 ${frame} 帧；Mesen 保留行动 112 后显示伤害 008`};
}

function wolfAttack(frame, sourceFrame, hp) {
  return {frame, event: "红狼攻击戈麦斯", message: "红狼的攻击", hp: String(hp),
    statusWindow: {label: "HP", value: hp}, messageRecordId: "record:0A:020",
    messageRuntime: {placeholders: {
      "ui-text-provider-workspace.current-string": {text: "狼", label: "Mesen 出手者观察"},
    }},
    romBasis: "PRG $02ECA5；record:0A:020",
    evidence: `${SOURCE}：${sourceFrame} wolf-attack-message；画面第 ${frame} 帧`,
    missing: ["红狼指令与攻击视觉的运行时选择"]};
}

function shieldDamage(frame, sourceFrame, amount, shield, hp) {
  return {frame, event: "戈麦斯护罩受伤", message: `戈斯战车损伤了 ${amount}！；护罩剩余 ${shield}`,
    hp: String(hp), shield, statusWindow: {label: "HP", value: hp},
    messageRecordId: "record:0A:016",
    messageSequence: retainedDamageSequence("record:0A:020", "record:0A:016"),
    messageRuntime: {enemyGroupCount: 1, placeholders: {
      "ui-text-provider-workspace.current-string": {text: "狼", label: "Mesen 出手者观察"},
      "ui-text-provider-zero-page-overlays.current-record": {text: "戈斯战车", label: "Mesen 受击者观察"},
      "ui-text-provider-zero-page-overlays.battle-quantity": {text: String(amount), label: "Mesen 护罩伤害观察"},
    }},
    romBasis: "PRG $02EDDB 计算；PRG $02ECA5 结算护罩",
    evidence: `${SOURCE}：${sourceFrame} gomez-shield-damage；画面第 ${frame} 帧；Mesen 保留行动 020 后显示伤害 016`,
    missing: ["护罩状态窗取值"]};
}

const REDWOLF_BATTLE_SEQUENCE = Object.freeze({
  id: "gomez-redwolf-trace", title: "戈麦斯与红狼 · 已观察战斗回放",
  formationId: 0x0C, bgm: "音频命令 $07",
  romBasis: "PRG $025C1A 经剧情 opcode $37 进入编队 $0C；逐帧依据见 redwolf-battle-trace",
  steps: [
    {frame: 2670, event: "战斗入场", message: "戈斯战车出现", hp: "3779",
      messageRecordId: "record:0A:013", messageRuntime: runtime,
      romBasis: "PRG $0399C1 编队 $0C；record:0A:013；音频命令 $07",
      evidence: `${SOURCE}：2491 battle-entry、2620 text-selector；entry.png`,
      missing: ["入场字幕与画面逐帧时序"]},
    turn(2738, 1, 3779, 175, "$F5/$A0"),
    attack(2790, 2755, "04", 3779, 0), wolfDamage(2835, 2801, 294, 3485),
    attack(2880, 2842, "05", 3485, 0), wolfDamage(2970, 2938, 753, 2732),
    attack(3095, 2979, "05", 2732), wolfDamage(3105, 3075, 603, 2129),
    wolfAttack(3145, 3116, 2129), shieldDamage(3240, 3210, 17, 158, 2129),
    turn(3278, 2, 2129, 158, "$15/$26"),
    attack(3393, 3292, "05", 2129), wolfDamage(3420, 3388, 547, 1582),
    attack(3460, 3428, "04", 1582), wolfDamage(3500, 3474, 405, 1177),
    attack(3560, 3514, "05", 1177), wolfDamage(3640, 3610, 535, 642),
    wolfAttack(3670, 3651, 642), shieldDamage(3780, 3745, 16, 142, 642),
    turn(3813, 3, 642, 142, "$FD/$A4"),
    attack(3940, 3827, "05", 642), wolfDamage(3950, 3923, 700, 0, {label: "SI", value: 0}),
    {frame: 4000, event: "红狼死亡", message: "狼死了！；SI 0", hp: "SI 0",
      statusWindow: {label: "SI", value: 0}, messageRecordId: "record:0A:011",
      romBasis: "PRG $02EF74 死亡分支；3984 party-wipe 与 wolf-death-recovery",
      evidence: `${SOURCE}：3964 wolf-death-message；wolf-death.png`,
      missing: ["死亡形态与退场动画", "死亡消息运行时姓名绑定"]},
    {frame: 4500, phase: "exit", event: "剧情场景返回", message: "场景 $84",
      romBasis: "PRG $02EF74 返回剧情", evidence: `${SOURCE}：4140 story-return；story-return.png`,
      missing: ["剧情场景画面与战斗回放的切换接口"]},
  ],
});

// @editor-module 固定战斗只提供模拟器的阵容与剧情输入。

function gomezRedWolfBattlePreset(project) {
  const entry = project.gomez_battle_entry;
  if (!entry || entry.missing) throw new TypeError(entry?.missing || '缺少剧情战斗入口');
  const catalog = battleScenePreviewCatalog(project);
  const appearance = catalog.appearances.find(row => row.partyRoleId === entry.partyRoleId);
  if (!appearance) throw new TypeError('战斗形象目录缺少红狼');
  const formation = battleScenePreviewForFormation(project, entry.formationId, {guides: false});
  const preview = normalizeBattleScenePreview({...formation, guides: false,
    party: formation.party.map((member, index) => ({...member,
      ...battlePartyVisualPosition(index, 1), visible: index === 0, riding: false,
      companion: index === 0 ? 'redwolf' : null,
      normalAppearance: index === 0 ? appearance.key : member.normalAppearance,
      attacks: {...member.attacks, melee: index === 0
        ? catalog.humanWeaponSources.find(source => source.source.id === 0x3C)?.key || ''
        : member.attacks.melee}}))}, project);
  return {preview, encounter: {kind: 'redwolf', pendingEventFlag: entry.victoryFlag},
    trace: {...REDWOLF_BATTLE_SEQUENCE, formationId: entry.formationId}};
}

// @editor-module 随机行动与手动指令共用战斗回合、随机状态与结算。

const alive = actor => (actor.hp > 0 || actor.shield > 0) && !(actor.status & 128);

function battleSimulationCommands(actors) {
  return actors.filter(actor => actor.side === 'party' && alive(actor)).map(actor => ({
    role: actor.roleId ?? actor.slot,
    kind: actor.riding ? 'vehicle-weapon' : 'weapon',
    command: actor.riding ? 4 : 0x0C, item: actor.weaponId, part: 0,
  }));
}

function createBattleSimulationSession(input, {seed = 0, manualCompanions = false} = {}) {
  input = structuredClone(input);
  let round = 0;
  let result = simulateBattle(input, {seed, maxRounds: 0, roundMode: true});
  result.steps = result.steps.filter(step => step.kind === 'entry');
  const currentActors = () => result.continuation.actors;
  const finished = () => !currentActors().some(actor => actor.side === 'party' && alive(actor))
    || !currentActors().some(actor => actor.side === 'enemy' && alive(actor));
  const advance = (commands = [], {automatic = false} = {}) => {
    if (finished()) throw new TypeError('战斗已结束');
    const actors = structuredClone(currentActors());
    const party = actors.filter(actor => actor.side === 'party');
    const randomState = result.continuation.randomState;
    const random = globalRandom(randomState.high * 256 + randomState.low);
    const groups = [...new Set(actors.filter(actor => actor.side === 'enemy' && alive(actor)).map(actor => actor.groupIndex))];
    commands = party.filter(alive).map(actor => {
      if (!automatic && (manualCompanions || actor.playerControlled !== false))
        return commands.find(row => row.role === (actor.roleId ?? actor.slot));
      const action = random.below(3);
      const kind = [actor.riding ? 'vehicle-weapon' : 'weapon', 'defend', 'protect'][action];
      return {role: actor.roleId ?? actor.slot, kind, command: [actor.riding ? 4 : 0x0C, 0x17, 0x18][action],
        vehicle: actor.riding ? actor.currentVehicle : null, part: 0,
        item: actor.weaponId, group: groups[random.below(groups.length)]};
    }).filter(Boolean);
    const nextRandom = {...random.snapshot(), calls: randomState.calls + random.snapshot().calls};
    for (const actor of party) {
      const command = commands.find(row => row.role === (actor.roleId ?? actor.slot));
      if (alive(actor) && !command) throw new TypeError('每位存活队员须选择指令');
      actor.selectedCommand = command;
      actor.selectedGroup = command?.group;
    }
    const next = simulateBattle({...input, party, enemies: actors.filter(actor => actor.side === 'enemy'),
      encounter: {...input.encounter, ...result.continuation, randomState: nextRandom, commands}},
    {seed, roundMode: true, roundOffset: round, maxRounds: 1});
    const newSteps = next.steps.filter(step => !(round && step.kind === 'entry'));
    if (!round) newSteps.shift();
    result = {...next, steps: [...result.steps, ...newSteps].map((step, index) => ({...step, index}))};
    round++;
    return result;
  };
  return {
    get result() {return result;}, get actors() {return structuredClone(currentActors());},
    get round() {return round;}, get finished() {return finished();}, advance,
    run() {
      let stalled = 0;
      while (!finished() && round < 1000) {
        const before = JSON.stringify(currentActors().map(actor => [actor.hp, actor.shield, actor.status,
          actor.vehicle?.sp, actor.monsterId]));
        advance([], {automatic: true});
        stalled = before === JSON.stringify(currentActors().map(actor => [actor.hp, actor.shield,
          actor.status, actor.vehicle?.sp, actor.monsterId])) ? stalled + 1 : 0;
        if (stalled >= 100)
          throw new TypeError('完整演示未能推进：请调整阵容或指令，查看未确认的结算');
      }
      if (!finished()) throw new TypeError('完整演示达到回合上限，未分胜负');
      return result;
    },
  };
}

// @editor-module 阵容、随机行动与手动指令组织同一个战斗模拟器。

const stats = [['hp', 'HP', 65535], ['maxHp', '最大 HP', 65535], ['attack', '攻击', 65535],
  ['defense', '防御', 65535], ['speed', '速度', 255], ['attackSkill', '攻击技能', 255],
  ['defenseSkill', '防御技能', 255]];
const living = actor => actor.side === 'party' && (actor.hp > 0 || actor.shield > 0) && !(actor.status & 128);

async function bindBattleSimulator(panel, mountControls) {
  const project = state.project;
  const catalog = battleScenePreviewCatalog(project);
  const request = state.battleSimulatorRequest;
  const presetControl = panel.querySelector('[data-battle-simulator-preset]');
  const modeTabs = panel.querySelector('#battle-simulator-mode-panel').closest('[data-in-page-tabs]');
  const formationControl = panel.querySelector('[data-battle-simulator-formation]');
  const execute = panel.querySelector('[data-battle-simulator-execute]');
  const host = panel.querySelector('[data-battle-simulation]');
  const single = panel.querySelector('[data-single-action]');
  const source = panel.querySelector('[data-battle-simulator-source]');
  bindGroupedReferenceSelect(formationControl);
  const formationPicker = formationControl.parentElement.querySelector('animated-resource-picker');
  formationControl.parentElement.classList.add('battle-test-formation-picker');
  const formationPickerConfig = {
    renderPreview: (_option, {current}) => current ? ''
      : '<canvas width="256" height="240" aria-label="敌方编队预览"></canvas>',
    paintPreview: async (root, option, {current}) => {
      if (current) return;
      const formation = battleScenePreviewForFormation(project, Number(option.value), {guides: false});
      const preview = normalizeBattleScenePreview({...formation,
        party: formation.party.map(member => ({...member, visible: false}))}, project);
      const canvas = root.querySelector('canvas');
      if (!await paintBattleSceneComposerCanvas(canvas, {project, preview, messageRecordId: null}))
        throw new Error(canvas.dataset.battleSceneComposerError || '敌方编队预览失败');
    },
  };
  const refreshFormationPicker = () => configureAnimatedResourcePicker(formationPicker, {
    ...formationPickerConfig,
    options: [...formationControl.options].map(option => ({value: option.value, label: option.textContent})),
    value: formationControl.value,
  });
  refreshFormationPicker();
  let preset = null, session = null, player, singlePlayer, initialActors = [], commands = [];
  let resetting = false, resetGeneration = 0;
  let mode = battleSimulatorMode(request);
  request.battleMode = mode;
  const playback = panel.querySelector('[data-battle-test-playback]');
  const playbackBar = playback.querySelector('.battle-sequence-replay-controls');
  playbackBar.prepend(panel.querySelector('[data-battle-simulator-status]'));
  playbackBar.append(execute);
  const progressLabel = playback.querySelector('.simulation-progress > label');
  const progressCaption = document.createElement('span');
  progressCaption.className = 'battle-test-progress-caption';
  progressCaption.append(progressLabel.firstElementChild, progressLabel.querySelector('output'));
  playbackBar.append(progressCaption, playback.querySelector('.simulation-progress'));
  const singlePlayback = panel.querySelector('[data-battle-test-single-action-playback]');
  const singleControls = single.querySelector('[data-single-action-playback]');
  singleControls.setAttribute('data-battle-simulation', '');
  const singleBar = singleControls.querySelector('.battle-sequence-replay-controls');
  singleBar.append(singleControls.querySelector('.simulation-progress'),
    singleControls.querySelector('[data-single-action-outcome]'),
    singleControls.querySelector('[data-simulation-event]'), panel.querySelector('[data-battle-test-return]'));
  singleControls.hidden = true;
  singlePlayback.append(singleControls);
  const details = host.querySelector('.battle-sequence-replay-detail');
  const syncModeLayout = () => {
    host.dataset.simulationExecutionMode = mode;
    panel.querySelector(`[data-battle-test-${mode}-playback]`).append(playback);
    panel.querySelector(`[data-battle-test-${mode}-details]`).append(details);
    for (const group of panel.querySelectorAll('[data-battle-simulator-mode-show]'))
      group.hidden = group.dataset.battleSimulatorModeShow !== mode;
  };
  syncModeLayout();
  const selectedFormation = () => project.game_data.battle_test.formations
    .find(formation => Number(formation.id) === Number(formationControl.value));
  const selectedFormationSignature = () => JSON.stringify(selectedFormation()?.slots);
  let formationSignature;
  const reportError = error => {
    panel.querySelector('[data-battle-test-preview-status]').textContent = error.message || String(error);
  };
  const perform = task => () => {void task().catch(reportError);};
  const saveRoute = () => replaceHistoryUrl(currentViewUrl());
  const applyFormation = id => {
    const formation = battleScenePreviewForFormation(project, id, {guides: false});
    const error = battleTestFormationDraftError(formation.enemyGroups.map(group =>
      ({monster_id: group.monsterId, count: group.count})));
    if (error) throw new TypeError(`${recordUid('encounter-formation', id)}：${error}`);
    state.battleScenePreview = normalizeBattleScenePreview({...state.battleScenePreview, guides: false,
      enemyGroups: formation.enemyGroups, enemyEvents: [], manualEnemySlots: {}}, project);
    formationControl.value = String(id);
    formationPicker.value = formationControl.value;
    formationSignature = selectedFormationSignature();
  };
  const applyPreset = key => {
    preset = key === 'redwolf' ? gomezRedWolfBattlePreset(project) : null;
    presetControl.value = preset ? 'redwolf' : 'custom';
    state.battleSimulatorPartyStats = {};
    if (preset) {
      state.battleScenePreview = preset.preview;
      formationControl.value = String(preset.trace.formationId);
      formationPicker.value = formationControl.value;
      request.battlePreset = 'redwolf';
    } else delete request.battlePreset;
    session = null;
  };
  applyFormation(request.battleFormation ?? state.battleTestView.encounter_id);
  if (Number.isInteger(request.battleMonster)) state.battleScenePreview = normalizeBattleScenePreview({
    ...state.battleScenePreview, enemyGroups: state.battleScenePreview.enemyGroups.map((group, index) => ({
      ...group, monsterId: index === 0 ? request.battleMonster : group.monsterId, count: index === 0 ? 1 : 0}))}, project);
  if (request.battlePreset === 'redwolf') applyPreset('redwolf');
  if (preset && Number.isInteger(request.battleFormation)) applyFormation(request.battleFormation);
  request.battleFormation = Number(formationControl.value);
  formationSignature = selectedFormationSignature();
  panel.querySelector('[data-battle-test-entry-details]').open = !preset;
  modeTabs.dataset.activeTab = mode;
  source.textContent = request.battleSource || '';
  const encounter = () => ({...preset?.encounter, configureParty: true,
    manualCompanions: mode === 'attack-test',
    partyStats: state.battleSimulatorPartyStats,
    pendingEventFlag: request.battleFlag ?? preset?.encounter.pendingEventFlag ?? 0,
    targetStoryState: request.battleStoryState ?? 0});
  const refreshExecution = () => {
    execute.hidden = mode !== 'attack-test';
    execute.disabled = resetting || host.dataset.simulationReady !== 'true'
      || !session || session.finished || !session.actors.some(living);
  };
  const renderCommands = () => {
    const actors = session?.actors.filter(living) || [];
    const groups = state.battleScenePreview.enemyGroups;
    const kinds = [['weapon', '人物武器'], ['defend', '防卫'], ['protect', '保护同伴'],
      ['item', '使用工具'], ['vehicle-weapon', '战车武器'], ['shell', '特殊炮弹'], ['escape', '逃跑']];
    const selected = (value, expected) => value === expected ? ' selected' : '';
    const commandHost = panel.querySelector('[data-battle-simulator-commands]');
    commandHost.hidden = mode !== 'attack-test';
    commandHost.innerHTML = actors.map(actor => {
      const id = actor.roleId ?? actor.slot;
      const command = commands.find(row => row.role === id) || battleSimulationCommands([actor])[0];
      return `<section data-battle-simulator-command="${id}"><h4>${esc(actor.label)} · HP ${actor.hp}${actor.riding ? ` · SP ${actor.vehicle?.sp}` : ''}</h4>
        <label>指令 <select data-battle-simulator-command-kind>${kinds.filter(([kind]) =>
          actor.riding || !['vehicle-weapon', 'shell'].includes(kind)).map(([kind, label]) =>
          `<option value="${kind}"${selected(kind, command.kind)}>${label}</option>`).join('')}</select></label>
        <label>目标敌群 <select data-battle-simulator-command-group><option value="">随机</option>${groups.flatMap((group, index) =>
          group.count ? [`<option value="${index}"${selected(index, command.group)}>G${index + 1}</option>`] : []).join('')}</select></label>
        <label${command.kind === 'weapon' ? '' : ' hidden'}>武器 <select data-battle-simulator-command-weapon>${catalog.humanWeaponSources.map(source =>
          `<option value="${esc(source.key)}"${selected(source.source.id, actor.weaponId)}>${esc(source.label)}</option>`).join('')}</select></label>
        <label${['item', 'shell', 'vehicle-weapon'].includes(command.kind) ? '' : ' hidden'}>槽位 <select data-battle-simulator-command-slot>${Array.from({length: command.kind === 'vehicle-weapon' ? 3 : command.kind === 'shell' ? 6 : 8}, (_, index) =>
          `<option value="${index}"${selected(index, command.slot ?? command.part ?? 0)}>槽 ${index + 1}${command.kind === 'item' ? ` · ${esc(project.game_data.items.records.find(item => item.id === (actor.riding ? actor.vehicle?.inventory : actor.inventory)?.[index])?.name || '空')}` : ''}</option>`).join('')}</select></label>
      </section>`;
    }).join('');
    commandHost.querySelectorAll('[data-battle-simulator-command-weapon]').forEach(control => control.addEventListener('change', perform(async () => {
      const role = Number(control.closest('[data-battle-simulator-command]').dataset.battleSimulatorCommand);
      const actor = session.actors.find(actor => (actor.roleId ?? actor.slot) === role && actor.side === 'party');
      state.battleScenePreview.party[actor.slot].attacks.melee = control.value;
      await reset();
    })));
    commandHost.querySelectorAll('select:not([data-battle-simulator-command-weapon])').forEach(control => control.addEventListener('change', () => {
      commands = readCommands(); renderCommands();
    }));
    refreshExecution();
  };
  const readCommands = () => [...panel.querySelectorAll('[data-battle-simulator-command]')].map(row => {
    const role = Number(row.dataset.battleSimulatorCommand);
    const actor = session.actors.find(actor => (actor.roleId ?? actor.slot) === role && actor.side === 'party');
    const kind = row.querySelector('[data-battle-simulator-command-kind]').value;
    const group = row.querySelector('[data-battle-simulator-command-group]').value;
    const slot = Number(row.querySelector('[data-battle-simulator-command-slot]').value);
    return {role, kind, command: {protect: 0x18, defend: 0x17, escape: 0x16, shell: 0x13,
      'vehicle-weapon': 4, weapon: 0x0C}[kind], vehicle: actor.riding ? actor.currentVehicle : null,
      item: actor.weaponId, slot, part: slot, ...(group === '' ? {} : {group: Number(group)})};
  });
  const facts = result => {
    const flag = encounter().pendingEventFlag;
    const modeInfo = battleModeForPendingEventFlag(flag, state.battleScenePreview.enemies.find(Boolean)?.monsterId);
    panel.querySelector('[data-battle-simulator-facts]').textContent = `${modeInfo.label} · 事件 ${hex(flag, 2)} · 我方 ${initialActors.length} 人 · 敌方 ${state.battleScenePreview.enemies.filter(Boolean).length} 个`;
    const monsters = project.game_data.monsters.records;
    const counts = new Map();
    for (const enemy of state.battleScenePreview.enemies.filter(enemy => enemy?.visible))
      counts.set(enemy.monsterId, (counts.get(enemy.monsterId) || 0) + 1);
    const formationLabel = battleTestFormationDisplayLabel({slots: [...counts].map(([monster_id, count]) =>
      ({monster_id, count}))}, monsters);
    for (const option of formationControl.options) {
      const formation = project.game_data.battle_test.formations.find(formation => Number(formation.id) === Number(option.value));
      option.textContent = `${recordUid('encounter-formation', formation.id)} · ${Number(option.value) === Number(formationControl.value)
        ? formationLabel : battleTestFormationDisplayLabel(formation, monsters)}`;
    }
    refreshFormationPicker();
    panel.querySelector('[data-battle-simulator-entry]').textContent = `当前战斗来源：${preset ? '戈麦斯红狼 · 剧情战斗' : request.battleSource || '自定义阵容'} · ${formationControl.selectedOptions[0].textContent} · 事件 ${hex(flag, 2)}`;
    const testPoint = panel.querySelector('[data-battle-test-encounter-summary]');
    const testPointLabel = battleTestFormationDisplayLabel({slots: state.battleTestView.formation}, monsters);
    testPoint.hidden = Number(formationControl.value) === state.battleTestView.encounter_id && formationLabel === testPointLabel;
    testPoint.textContent = `测试点遭遇：${recordUid('encounter-formation', state.battleTestView.encounter_id)} · ${testPointLabel}`;
    panel.querySelector('[data-battle-simulator-status]').textContent = session?.finished ? result.outcome
      : `第 ${(session?.round || 0) + 1} 回合 · 等待指令`;
    host.dataset.simulationExecutionMode = mode;
    renderCommands();
  };
  const renderStats = () => {
    for (const row of panel.querySelectorAll('[data-battle-scene-party-row]')) {
      const slot = Number(row.dataset.battleScenePartyRow);
      const actor = initialActors.find(actor => actor.slot === slot);
      if (!actor) continue;
      if (actor.playerControlled === false) {
        row.querySelector('.battle-scene-object-toggle span').textContent = mode === 'full-demo' ? '红狼 · 随机行动' : '红狼';
        for (const control of row.querySelectorAll('[data-battle-scene-party-field]')) {
          if (control.dataset.battleScenePartyField !== 'visible') control.setAttribute('disabled', '');
        }
      }
      const grid = document.createElement('div');
      grid.className = 'character-number-grid';
      grid.innerHTML = stats.map(([key, label, max]) => `<label><small>${label}</small>
        <input type="number" min="0" max="${max}" value="${state.battleSimulatorPartyStats[slot]?.[key] ?? actor[key] ?? 0}"
          data-battle-simulator-stat="${key}" data-battle-simulator-stat-slot="${slot}"></label>`).join('');
      row.append(grid);
      grid.querySelectorAll('input').forEach(control => control.addEventListener('change', perform(async () => {
        if (!control.checkValidity()) throw new TypeError('阵容数值超出允许范围');
        const value = Number(control.value), key = control.dataset.battleSimulatorStat;
        const values = {...state.battleSimulatorPartyStats[slot], [key]: value};
        if ((values.hp ?? actor.hp) > (values.maxHp ?? actor.maxHp)) throw new TypeError('HP 不得超过最大 HP');
        state.battleSimulatorPartyStats[slot] = values;
        await reset();
      })));
    }
  };
  const showBattle = () => {
    host.querySelector('.battle-sequence-replay-visual').hidden = false;
    panel.querySelector('[data-battle-test-single-action]').hidden = true;
    playback.hidden = false;
    singlePlayback.hidden = true;
    singleControls.hidden = true;
    panel.querySelector('.battle-scene-party-attack-channel.is-playing, [data-battle-test-enemy-action-controls] .is-playing')?.classList.remove('is-playing');
    host.querySelector('.screen-workbench-stage-toolbar > .screen-workbench-zoom').hidden = false;
  };
  const controls = () => {
    singlePlayback.append(singleControls);
    mountControls(panel); renderStats(); renderCommands();
    panel.querySelector('[data-battle-scene-reset]').addEventListener('click', perform(async () => {
      const original = await db.readPreviewOriginal('battle-test-point');
      const formation = battleScenePreviewForFormation({...project,
        game_data: {...project.game_data, battle_test: original.value.document || original.value}},
      Number(formationControl.value));
      state.battleScenePreview = normalizeBattleScenePreview({...state.battleScenePreview,
        enemyGroups: formation.enemyGroups, enemyEvents: [], manualEnemySlots: {},
        attack: {...state.battleScenePreview.attack, enemyTarget: 0,
          target: state.battleScenePreview.attack.side === 'enemy'
            ? state.battleScenePreview.attack.partyTarget : 0, frame: 0, playNonce: 0}}, project);
      await reset();
    }));
    bindBattleSceneComposer({rerender: async () => {controls(); await reset();}, repaint: reset,
      playAttack: async () => {
        host.querySelector('.battle-sequence-replay-visual').hidden = true;
        panel.querySelector('[data-battle-test-single-action]').hidden = false;
        playback.hidden = true;
        const attack = state.battleScenePreview.attack;
        const row = attack.side === 'party'
          ? panel.querySelector(`[data-battle-scene-play-party-attack="${attack.attacker}"][data-battle-scene-party-attack-channel="${attack.channel}"]`).closest('.battle-scene-party-attack-channel')
          : [...panel.querySelectorAll('[data-battle-test-enemy-action-controls] [data-battle-scene-quick-attack]')]
            .find(button => Number(button.dataset.battleSceneAttackAttacker) === attack.attacker && button.dataset.battleSceneAttackSource === attack.source).parentElement;
        row.classList.add('is-playing');
        row.append(singleControls);
        singleControls.hidden = false;
        host.querySelector('.screen-workbench-stage-toolbar > .screen-workbench-zoom').hidden = true;
        if (!singlePlayer) singlePlayer = await bindBattleSimulation(single, {project,
          preview: state.battleScenePreview, singleActionControls: singleControls});
        await singlePlayer.update({preview: state.battleScenePreview, autoplay: true});
      }});
  };
  const reset = async () => {
    const generation = ++resetGeneration;
    resetting = true; execute.disabled = true;
    session = null; commands = []; showBattle();
    const count = state.battleScenePreview.party.filter(member => member.visible).length;
    state.battleScenePreview.party = state.battleScenePreview.party.map((member, index) =>
      member.companion && member.visible ? {...member, ...battlePartyVisualPosition(index, count)} : member);
    panel.querySelector('[data-battle-test-preview-status]').textContent = '';
    try {
      await player.update({preview: state.battleScenePreview, encounter: encounter(), trace: preset?.trace,
        automaticMessages: mode === 'full-demo', restart: true});
    } finally {
      if (generation === resetGeneration) {resetting = false; controls();}
    }
  };
  player = await bindBattleSimulation(host, {project, preview: state.battleScenePreview,
    encounter: encounter(), trace: preset?.trace, automaticMessages: mode === 'full-demo',
    calculate: (input, options) => {
      if (!session || options.restart) {
        initialActors = structuredClone(input.party);
        session = createBattleSimulationSession(input, {...options, manualCompanions: mode === 'attack-test'});
        if (mode === 'full-demo') session.run();
      }
      return session.result;
    }, onCalculated: facts});
  controls();
  new MutationObserver(refreshExecution).observe(host, {attributes: true,
    attributeFilter: ['data-simulation-ready']});
  panel.querySelector('[data-battle-test-return]').addEventListener('click', showBattle);
  presetControl.addEventListener('change', perform(async () => {
    applyPreset(presetControl.value);
    state.battleTestPartyTab = 'p1';
    panel.querySelector('[data-battle-simulator-companion-status]').textContent = '';
    panel.querySelector('[data-battle-test-entry-details]').open = !preset;
    delete request.battleMode;
    mode = battleSimulatorMode(request);
    request.battleMode = mode;
    syncModeLayout();
    modeTabs.querySelector(`[data-in-page-tab="${mode}"]`).click();
    if (!preset) applyFormation(Number(formationControl.value));
    delete request.battleMonster; delete request.battleFlag; delete request.battleStoryState;
    request.battleFormation = Number(formationControl.value); delete request.battleSource; source.textContent = '';
    saveRoute(); await reset();
  }));
  formationControl.addEventListener('change', perform(async () => {
    try {applyFormation(Number(formationControl.value));}
    catch (error) {
      formationControl.value = String(request.battleFormation);
      formationPicker.value = formationControl.value;
      throw error;
    }
    preset = null; presetControl.value = 'custom'; delete request.battlePreset;
    panel.querySelector('[data-battle-test-entry-details]').open = true;
    request.battleFormation = Number(formationControl.value); delete request.battleMonster;
    saveRoute(); await reset();
  }));
  bindInPageTabs(modeTabs, {onChange: next => {
    if (mode === next) return;
    mode = next; request.battleMode = mode;
    syncModeLayout(); saveRoute(); void reset().catch(reportError);
  }});
  panel.querySelector('[data-battle-simulator-add-companion]').addEventListener('click', perform(async () => {
    const party = state.battleScenePreview.party;
    const status = panel.querySelector('[data-battle-simulator-companion-status]');
    const slot = party.findIndex(member => !member.visible);
    if (slot < 0) {status.textContent = '队伍格已满，无法加入红狼'; return;}
    if (party.some(member => member.visible && member.companion === 'redwolf')) {
      status.textContent = '红狼已在队伍中'; return;
    }
    const member = gomezRedWolfBattlePreset(project).preview.party[0];
    const count = party.filter(member => member.visible).length + 1;
    state.battleScenePreview = normalizeBattleScenePreview({...state.battleScenePreview,
      party: party.map((current, index) => ({...(index === slot ? member : current),
        ...battlePartyVisualPosition(index, count)}))}, project);
    delete state.battleSimulatorPartyStats[slot];
    status.textContent = `红狼加入 P${slot + 1}`;
    state.battleTestPartyTab = `p${slot + 1}`;
    await reset();
  }));
  execute.addEventListener('click', perform(async () => {
    execute.disabled = true;
    const position = session.result.steps.length;
    session.advance(readCommands());
    await player.update({position});
  }));
  saveRoute();
  return {update: async () => {
    if (selectedFormationSignature() !== formationSignature) applyFormation(Number(formationControl.value));
    await reset();
  }};
}

// @editor-module 战斗测试编辑器绑定


const BATTLE_TEST_RESOURCE_ID = "battle-test-point";

const previewControllers = new WeakMap();

function mountBattleTestComposerControls(panel) {
  const source = document.createElement("div");
  source.innerHTML = battleSceneComposerControls(state.project, {includeInventory: true});
  const party = source.querySelector(".battle-scene-party-section");
  const enemy = source.querySelector(".battle-scene-enemy-section");
  for (const section of [party, enemy]) {
    section.hidden = false;
    section.removeAttribute("role");
    section.removeAttribute("aria-labelledby");
  }
  const actions = panel.querySelector("[data-battle-test-action-controls]");
  actions.replaceChildren();
  for (const row of party.querySelectorAll("[data-battle-scene-party-row]")) {
    const group = document.createElement("section");
    group.className = "battle-test-party-actions";
    group.innerHTML = `<h4>${esc(row.querySelector(".battle-scene-slot-id").textContent)} · ${
      esc(row.querySelector(".battle-scene-object-toggle span").textContent)
    }</h4>`;
    group.append(row.querySelector(".battle-scene-party-attacks"));
    actions.append(group);
    row.dataset.inPageTabsShow = `p${Number(row.dataset.battleScenePartyRow) + 1}`;
  }
  const enemyActions = panel.querySelector('[data-battle-test-enemy-action-controls]');
  enemyActions.replaceChildren();
  for (const row of enemy.querySelectorAll('[data-battle-scene-enemy-row]')) {
    const buttons = row.querySelectorAll('[data-battle-scene-quick-attack]');
    if (!buttons.length) continue;
    const group = document.createElement('div');
    group.className = 'battle-scene-row-actions';
    group.setAttribute('aria-label', `${row.querySelector('.battle-scene-slot-id').textContent} · ${
      row.querySelector('.battle-scene-slot-state b').textContent}`);
    group.append(...buttons);
    enemyActions.append(group);
  }
  const partyTabHost = panel.querySelector('[data-battle-test-party-tabs]');
  partyTabHost.innerHTML = inPageTabs({
    id: 'battle-test-party', label: '友方槽位', active: state.battleTestPartyTab,
    tabs: [{id: 'p1', label: 'P1'}, {id: 'p2', label: 'P2'}, {id: 'p3', label: 'P3'}],
    content: '<div data-battle-test-party-controls></div>',
  });
  partyTabHost.querySelector('[data-battle-test-party-controls]').append(party);
  party.querySelector('header > span').remove();
  const partyTabs = panel.querySelector('#battle-test-party-panel').closest('[data-in-page-tabs]');
  partyTabs.dataset.activeTab = state.battleTestPartyTab;
  bindInPageTabs(partyTabs, {onChange: active => {
    state.battleTestPartyTab = active; replaceHistoryUrl(currentViewUrl());
  }});
  panel.querySelector("[data-battle-test-formation-controls]").replaceChildren(
    enemy.querySelector('.battle-scene-enemy-operations'),
    source.querySelector('[data-battle-scene-reset]'),
  );
  panel.querySelector("[data-battle-test-enemy-controls]").replaceChildren(enemy);
  panel.querySelector("[data-battle-test-preview-controls]").replaceChildren(
    source.querySelector(".battle-scene-preview-actions"),
  );
  panel.querySelector("[data-battle-test-composer-status]").replaceChildren(
    source.querySelector(".battle-scene-control-status"),
  );
}

function bindBattleTestTabs(panel) {
  bindInPageTabs(panel.querySelector('#battle-test-enemy-panel').closest('[data-in-page-tabs]'), {
    onChange: active => {state.battleTestEnemyTab = active; replaceHistoryUrl(currentViewUrl());},
  });
}

async function prepareBattleTestPreview(form) {
  const failures = await ensureBattleSceneData({includeInventory: true});
  if (failures.length) throw new Error(`战斗资源不可用：${failures.join('、')}`);
  if (!form.isConnected) return null;
  return bindBattleSimulator(form.closest('[data-battle-panel]'), mountBattleTestComposerControls);
}

async function paintBattleTestPreview(form) {
  if (!form?.isConnected) return;
  const status = form.closest("[data-battle-panel]").querySelector("[data-battle-test-preview-status]");
  try {
    if (!previewControllers.has(form)) {
      const pending = prepareBattleTestPreview(form);
      previewControllers.set(form, pending);
      await pending;
    } else {
      const controller = await previewControllers.get(form);
      if (form.isConnected) await controller?.update();
    }
  } catch (error) {
    editorLog.error("编辑页面", `操作失败：${error?.message || error}`, error);
    if (form.isConnected) status.textContent = `预览不可用：${error.message || error}`;
  }
}

function syncBattleTestFormationSlotControls(root, slotIndex, slot) {
  const control = root?.querySelector?.(
    `[data-battle-formation-slot="${slotIndex}"][data-battle-formation-field="monster_id"]`,
  );
  const count = root?.querySelector?.(
    `[data-battle-formation-slot="${slotIndex}"][data-battle-formation-field="count"]`,
  );
  const active = Number(slot.count) !== 0;
  if (control) {
    control.value = active
      ? String(Number(slot.monster_id))
      : BATTLE_TEST_EMPTY_FORMATION_SLOT;
    control.dataset.battleEmptyMonsterId = String(Number(slot.monster_id));
    void syncReferencePickerControl(control);
  }
  if (count) {
    count.value = String(Number(slot.count));
    count.disabled = !active;
  }
}

function preservedBattleTestFormationMonsterId(root, slotIndex) {
  const value = Number(root?.querySelector?.(
    `[data-battle-formation-slot="${slotIndex}"][data-battle-formation-field="monster_id"]`,
  )?.dataset.battleEmptyMonsterId);
  return Number.isInteger(value) ? value : null;
}

function applyBattleTestFormationControl(formationDraft, input, root = document) {
  const slotIndex = Number(input?.dataset?.battleFormationSlot);
  const field = input?.dataset?.battleFormationField;
  const slot = formationDraft?.[slotIndex];
  if (!slot || !["monster_id", "count"].includes(field)) {
    throw new Error("未知的战斗编队槽控件");
  }
  if (field === "monster_id") {
    if (input.value === BATTLE_TEST_EMPTY_FORMATION_SLOT) {
      // count=0 才是 ROM 的空槽标志；保留 monster_id 原字节，不能拿真实怪物
      // 0x00（电脑墙）冒充空值。
      const preservedMonsterId = preservedBattleTestFormationMonsterId(
        root,
        slotIndex,
      );
      if (preservedMonsterId !== null) slot.monster_id = preservedMonsterId;
      slot.count = 0;
    } else {
      slot.monster_id = Number(input.value);
      if (Number(slot.count) < 1) slot.count = 1;
    }
  } else {
    slot.count = Number(input.value);
    if (slot.count === 0) {
      const preservedMonsterId = preservedBattleTestFormationMonsterId(
        root,
        slotIndex,
      );
      if (preservedMonsterId !== null) slot.monster_id = preservedMonsterId;
    }
  }
  syncBattleTestFormationSlotControls(root, slotIndex, slot);
  return slot;
}

let battlePersistedResetStates = new Map();
let battleResetRefreshGeneration = 0;
let battleTestResetting = false;

function battleTestLocalResetStates() {
  const draft = state.battleTestView;
  const configuration = state.project.game_data?.battle_test;
  if (!draft || !state.battleTestPersistedView || !configuration) return new Map();
  return new Map([
    [BATTLE_TEST_ENTRY_RESET_KEY, battleTestEntryLocalDirty(
      draft,
      state.battleTestPersistedView,
    )],
    [battleTestFormationResetKey(draft.encounter_id),
      battleTestFormationLocalDirty(draft, configuration)],
  ]);
}

function updateBattleTestEditorState(message = null) {
  if (!state.battleTestView || !state.battleTestPersistedView) return;
  if (message !== null) state.battleTestMessage = message;
  const error = battleTestDraftError();
  const form = $("#battle-test-editor"), draft = state.battleTestView;
  const total = draft.formation.reduce((sum, slot) => sum + Number(slot.count || 0), 0);
  const formationSummary = form?.querySelector("[data-battle-formation-summary]");
  if (formationSummary) formationSummary.textContent = `${total} / 9 MONSTER SLOTS`;
  const title = form?.querySelector("[data-battle-formation-title]");
  if (title) title.textContent = `编队 ${hex(draft.encounter_id, 2)}`;
  const reference = form?.closest("[data-battle-panel]")?.querySelector("[data-battle-formation-reference]");
  if (reference) reference.textContent = recordUid('encounter-formation', draft.encounter_id);
  const modeReadout = form?.querySelector("[data-battle-mode-readout]");
  const mode = battleModeForPendingEventFlag(draft.state_flag, battleFirstMonsterId(draft.formation));
  if (modeReadout && mode) modeReadout.textContent = `${mode.label} · BGM ${audioCommandLabel(mode.musicCommand)} · 死亡效果 ${hex(mode.deathEffect, 2)}`;
  const monsters = state.project.game_data?.monsters?.records || [];
  for (const option of form?.querySelectorAll('[data-battle-test-field="encounter_id"] option') || []) {
    const id = Number(option.value);
    const formation = id === draft.encounter_id ? {slots: draft.formation}
      : battleTestFormation(state.project.game_data.battle_test, id);
    const label = `${recordUid('encounter-formation', id)} · ${battleTestFormationDisplayLabel(formation, monsters)}`;
    if (option.textContent !== label) option.textContent = label;
  }
  const status = $("#battle-test-save-state");
  if (status) {
    status.textContent = battleTestEditorStatus();
    status.classList.toggle("invalid", Boolean(error));
    status.hidden = !battleTestEditorStatus();
  }
  updateBattleTestOriginalControls($("#battle-test-editor"), {
    persistedStates: battlePersistedResetStates,
    localStates: battleTestLocalResetStates(),
    busy: battleTestResetting || state.battleTestBuilding,
  });
}

async function battleTestResetSnapshot() {
  const repository = requireBrowserProjectRepository(state);
  const fields = await db.getFields(BATTLE_TEST_RESOURCE_ID);
  const resolved = await db.readResource(BATTLE_TEST_RESOURCE_ID);
  const original = await repository.getOriginal(BATTLE_TEST_RESOURCE_ID);
  return {repository, fields, document: resolved.value.document,
    baseDocument: original.value.document, version: fields[0].version};
}

const selectedBattleFields = (fields, id) => fields.filter(field => field.recordId === id);
const battleSlotResetGroups = fields => {
  const groups = new Map();
  for (const field of fields.filter(field => Number.isInteger(field.slotId))) {
    if (!groups.has(field.entityHandle)) groups.set(field.entityHandle, []);
    groups.get(field.entityHandle).push(field);
  }
  return groups;
};
const battleResetGroups = fields => new Map([
  ["entry", selectedBattleFields(fields, "entry")],
  ...[...new Set(fields.filter(field => field.recordId !== "entry").map(field => field.recordId))]
    .map(id => [battleTestFormationResetKey(id), selectedBattleFields(fields, id)]),
  ...battleSlotResetGroups(fields),
]);

function applyBattleTestProjection(saved) {
  const previous = state.project.game_data?.battle_test;
  const document_ = copyFieldDocumentView(saved.value.document);
  rebuildBattleSelectedFormation(document_);
  if (!Object.hasOwn(document_, "writeback_state") && previous?.writeback_state) {
    document_.writeback_state = copyEditorDraft(previous.writeback_state);
  }
  state.project.game_data.battle_test = document_;
  return document_;
}

function clearBattleTestPageViewAfterExternalWrite() {
  if ($("#battle-test-editor")?.isConnected) return;
  // 外部字段写入后，下一次进入战斗页须从 Working 重建视图。
  state.battleTestView = null;
  state.battleTestPersistedView = null;
  state.battleTestMessage = "";
  battlePersistedResetStates = new Map();
}

async function persistBattleTestEdit(payload) {
  if (state.projectRepository !== payload.repository || state.project !== payload.project)
    throw new Error("战斗测试项目会话已改变");
  const fields = await db.getFields(BATTLE_TEST_RESOURCE_ID), changes = [];
  const append = (field, value, before) => {
    if (value !== before && value !== field.value) changes.push({field, value});
  };
  if (payload.kind === "page") for (const field of selectedBattleFields(fields, "entry"))
    append(field, payload.draft[field.fieldName], payload.baseline[field.fieldName]);
  const id = payload.kind === "page" ? payload.draft.encounter_id : payload.formationId;
  const formation = payload.kind === "page" ? payload.draft.formation : payload.formationDraft;
  const baseline = payload.formationBaseline;
  for (const field of selectedBattleFields(fields, id))
    append(field, formation[field.slotId][field.fieldName], baseline[field.slotId][field.fieldName]);
  if (changes.length) await setProjectFields(db, changes, {expectedVersion: fields[0].version});
  return {...await db.readResource(BATTLE_TEST_RESOURCE_ID), changed: changes.length > 0};
}

async function writeBattleTestEdit(payload) {
  try {
    const saved = await persistBattleTestEdit(payload);
    if (state.projectRepository !== payload.repository ||
        state.project !== payload.project) return saved;
    const document_ = applyBattleTestProjection(saved);
    if (payload.kind === "page") {
      if (state.battleTestView === payload.draftTarget) {
        state.battleTestPersistedView = battleTestDraftFromDocument(document_);
        state.battleTestMessage = "";
        battlePersistedResetStates = new Map();
        updateBattleTestEditorState();
        const root = $("#battle-test-editor");
        if (root) {
          void refreshBattleTestOriginalStates(root).catch(error => {
            if (root.isConnected) editorLog.error("后台准备", "战斗测试 Origin 状态刷新失败", error);
          });
        }
      }
    } else {
      clearBattleTestPageViewAfterExternalWrite();
      payload.onSaved?.(saved, document_);
    }
    return saved;
  } catch (error) {
    payload.onError?.(error);
    throw error;
  }
}

function commitBattleTestPage({clearMessage = true} = {}) {
  const draftTarget = state.battleTestView;
  if (!draftTarget) return;
  if (battleTestResetting) {
    updateBattleTestEditorState();
    return;
  }
  const error = battleTestDraftError();
  if (error) {
    updateBattleTestEditorState();
    return;
  }
  try {
    const repository = requireBrowserProjectRepository(state);
    if (clearMessage) state.battleTestMessage = "";
    trackAutoSavePreparation(writeBattleTestEdit({
      kind: "page",
      repository,
      project: state.project,
      draftTarget,
      draft: copyEditorDraft(draftTarget),
      baseline: copyEditorDraft(state.battleTestPersistedView),
      formationBaseline: copyEditorDraft(state.battleTestPersistedView.encounter_id === draftTarget.encounter_id
        ? state.battleTestPersistedView.formation
        : battleTestFormationDraft(battleTestFormation(state.project.game_data.battle_test, draftTarget.encounter_id))),
      onError: error_ => {
        if (state.projectRepository === repository &&
            state.battleTestView === draftTarget) {
          updateBattleTestEditorState(`保存失败：${error_?.message || error_}`);
        }
      },
    }).catch(() => {}));
    updateBattleTestEditorState();
  } catch (error_) {
    updateBattleTestEditorState(`保存失败：${error_?.message || error_}`);
  }
}

async function refreshBattleTestOriginalStates(root) {
  if (!root?.querySelectorAll) return;
  const generation = ++battleResetRefreshGeneration;
  const fields = await db.getFields(BATTLE_TEST_RESOURCE_ID);
  if (generation !== battleResetRefreshGeneration || !root.isConnected) return;
  battlePersistedResetStates = new Map([...battleResetGroups(fields)].map(([key, selected]) =>
    [key, selected.some(field => field.hasOverride)]));
  updateBattleTestEditorState();
}

async function prepareBattlePageReset(id) {
  const draftTarget = state.battleTestView;
  if (id !== "entry" && Number(draftTarget?.encounter_id) !== id) throw new Error("所选编队已变化，请重新执行重置");
  await flushAllAutoSaves();
  const snapshot = await battleTestResetSnapshot();
  if (id === "entry") {
    const blocked = battleTestEntryResetBlockedReason(draftTarget, snapshot.document, snapshot.baseDocument);
    if (blocked) throw new Error(blocked);
  }
  return {id, snapshot, previousDraft: copyEditorDraft(draftTarget), expectedVersion: snapshot.version,
    selected: selectedBattleFields(snapshot.fields, id)};
}

async function finishBattlePageReset(context) {
  const {id, previousDraft} = context;
  const saved = {...await db.readResource(BATTLE_TEST_RESOURCE_ID), changed: context.changed};
  const document_ = applyBattleTestProjection(saved);
  state.battleTestView = id === "entry" ? battleTestDraftAfterEntryReset(previousDraft, document_)
    : battleTestDraftAfterFormationReset(previousDraft, document_, id);
  state.battleTestPersistedView = battleTestDraftFromDocument(document_);
  battlePersistedResetStates = new Map();
  return saved;
}

function resetConfirmation(itemId) {
  if (itemId.startsWith("encounter-formation:"))
    return "只恢复这一槽怪物与数量；其他槽和测试入口保留。继续吗？";
  return itemId === BATTLE_TEST_ENTRY_RESET_KEY
    ? "只把测试入口字段恢复为本次导入值；持久化编队不会改变。若会隐藏无效的当前编队编辑，操作将被拒绝。继续吗？"
    : "只把当前选中的编队恢复为本次导入值；测试入口和其他编队都会保留。继续吗？";
}

async function bindSceneBattleTestFormationEditor(root = document, onSaved = null) {
  const editor = root?.querySelector?.("[data-scene-battle-formation-editor]");
  if (!editor || editor.dataset.sceneBattleFormationBound) return;
  editor.dataset.sceneBattleFormationBound = "loading";
  const formationId = Number(editor.dataset.formationId);
  const formation = battleTestFormation(
    state.project.game_data?.battle_test,
    formationId,
  );
  const draft = battleTestFormationDraft(formation);
  const baseline = copyEditorDraft(draft);
  const inputs = [...editor.querySelectorAll("[data-battle-formation-field]")];
  const reset = editor.querySelector('[data-reset-to-original="scene-formation"]');
  // Field loading is asynchronous; an enabled control must already have its
  // change listener, otherwise the first user edit is silently lost.
  inputs.forEach(input => {input.disabled = true;});
  if (reset) reset.disabled = true;
  const fields = selectedBattleFields(await db.getFields(BATTLE_TEST_RESOURCE_ID), formationId);
  const status = editor.querySelector("[data-scene-battle-formation-status]");
  const total = editor.querySelector("[data-scene-battle-formation-total]");
  let resetting = false;

  const syncControls = () => {
    for (const input of inputs) {
      const slotIndex = Number(input.dataset.battleFormationSlot);
      const isEmptyCount = input.dataset.battleFormationField === "count"
        && Number(draft[slotIndex]?.count) === 0;
      input.disabled = resetting || isEmptyCount;
    }
    for (const button of editor.querySelectorAll('[data-reset-to-original]')) button.disabled = resetting;
  };

  const update = (message = "") => {
    const error = battleTestFormationDraftError(draft);
    if (total) {
      total.textContent = String(draft.reduce(
        (sum, slot) => sum + Number(slot.count || 0),
        0,
      ));
    }
    if (status) {
      const alert = message || (error ? `无法自动保存：${error}` : "");
      status.textContent = alert;
      status.hidden = !alert;
      status.classList.toggle("invalid", Boolean(alert));
    }
    syncControls();
  };

  const syncDraftFromProject = () => {
    const current = battleTestFormationDraft(battleTestFormation(
      state.project.game_data?.battle_test,
      formationId,
    ));
    draft.splice(0, draft.length, ...copyEditorDraft(current));
    draft.forEach((slot, slotIndex) => {
      syncBattleTestFormationSlotControls(editor, slotIndex, slot);
    });
  };

  const commit = () => {
    const error = battleTestFormationDraftError(draft);
    if (error) {
      update();
      return;
    }
    try {
      const repository = requireBrowserProjectRepository(state);
      const project = state.project;
      trackAutoSavePreparation(writeBattleTestEdit({
        kind: "formation",
        repository,
        project,
        formationId,
        formationDraft: copyEditorDraft(draft),
        formationBaseline: copyEditorDraft(baseline),
        onSaved: () => {
          if (editor.isConnected) update();
          void onSaved?.();
        },
        onError: error_ => {
          if (editor.isConnected && state.projectRepository === repository &&
              state.project === project) {
            update(`自动保存失败：${error_?.message || error_}`);
          }
        },
      }).catch(() => {}));
      update();
    } catch (error_) {
      update(`自动保存失败：${error_.message}`);
    }
  };

  for (const input of inputs) {
    input.addEventListener("change", event => {
      if (resetting) return;
      const previous = copyEditorDraft(draft);
      applyBattleTestFormationControl(draft, event.target, editor);
      const error = battleTestFormationDraftError(draft);
      if (error) {
        draft.splice(0, draft.length, ...previous);
        previous.forEach((slot, index) => syncBattleTestFormationSlotControls(editor, index, slot));
        update(`输入无效：${error}`);
        return;
      }
      commit();
    });
  }
  await hydrateModuleComponents(editor);
  for (const field of fields) field.bind(editor, () => {
    const slot = field.slotId, name = field.fieldName;
    if (draft[slot][name] === baseline[slot][name]) draft[slot][name] = field.value;
    baseline[slot][name] = field.value;
    syncBattleTestFormationSlotControls(editor, slot, draft[slot]);
    update();
  });
  bindFieldResetToOriginalButtons(editor, new Map([["scene-formation", fields], ...battleSlotResetGroups(fields)]), {
    database: db,
    beforeReset: async () => {
      resetting = true; update(); await flushAllAutoSaves();
      return {expectedVersion: fields[0].version};
    },
    afterReset: async () => {
      try {
        const saved = await db.readResource(BATTLE_TEST_RESOURCE_ID);
        applyBattleTestProjection(saved); syncDraftFromProject();
        baseline.splice(0, baseline.length, ...copyEditorDraft(draft));
        await onSaved?.(saved);
      } finally {resetting = false; if (editor.isConnected) update();}
    },
    onError: error => {resetting = false; update(`重置失败：${error.message}`);},
  });
  update();
  editor.dataset.sceneBattleFormationBound = "1";
}

async function bindBattleTestEditor() {
  await bindSceneBattleTestFormationEditor();
  $("[data-scene-battle-formation-editor]")?.scrollIntoView({block: "start"});
  const form = $("#battle-test-editor");
  if (!form || !state.battleTestView) return;
  bindBattleTestTabs(form.closest("[data-battle-panel]"));
  const sceneEntries = state.project?.scenes?.editable_scenes || [];
  const scenePicker = form.querySelector('[data-scene-position-picker]');
  hydrateScenePositionPicker(scenePicker, {entries: sceneEntries, onConfirm: ({sceneId, x, y}) => {
    Object.assign(state.battleTestView, {scene_id: sceneId, x, y});
    commitBattleTestPage();
  }});
  const fields = await db.getFields(BATTLE_TEST_RESOURCE_ID);
  const catalog = await db.getDocument("project.text-catalog", null);
  const records = (catalog?.records || []).filter(record =>
    Number(record.region) === 5 && Number.isInteger(record.record) && record.record <= 255);
  if (!records.length) throw new TypeError("战斗测试文字区 05 没有已发布记录候选");
  const items = [{value: 255, label: "未指定", meta: "0xFF"}, ...records.map(record => ({
    value: record.record,
    label: record.display_text || record.unicode_preview || "（无可读文字）",
    meta: record.node_id,
  }))];
  for (const host of form.querySelectorAll("[data-battle-text-picker]")) {
    const field = host.dataset.battleTextPicker;
    const value = state.battleTestView[field];
    host.innerHTML = referencePickerMarkup({
      moduleId: "text-record", value, label: field === "intro_text_record_id" ? "战前文字" : "完成文字",
      items, compact: true, pageSize: 24,
      controlMarkup: `<input type="number" min="0" max="255" data-battle-test-field="${field}" value="${value}">`,
    });
  }
  battlePersistedResetStates = new Map();
  form.addEventListener("submit", event => event.preventDefault());
  form.querySelectorAll("[data-battle-test-field]").forEach(input => {
    const apply = event => {
      const field = event.target.dataset.battleTestField;
      const previous = state.battleTestView[field];
      const value = event.target.type === "checkbox"
        ? event.target.checked : Number(event.target.value);
      if (event.target.type !== "checkbox"
          && (!event.target.value.trim() || !Number.isInteger(value)
            || value < 0 || value > ({scene_id: 0xEF, encounter_id: 0x38}[field] ?? 0xFF)
            || (event.target.tagName === "SELECT" && ![...event.target.options].some(option => option.value === event.target.value)))) {
        event.target.value = String(previous);
        updateBattleTestEditorState(`输入无效：${field} 超出允许范围`);
        return;
      }
      state.battleTestView[field] = value;
      if (field === "encounter_id") {
        const formation = battleTestFormation(
          state.project.game_data?.battle_test,
          state.battleTestView.encounter_id,
        );
        state.battleTestView.formation = battleTestFormationDraft(formation);
        commitBattleTestPage();
        render();
        return;
      }
      commitBattleTestPage();
    };
    input.addEventListener(
      input.matches("select, input[type=checkbox]") ? "change" : "input",
      apply,
    );
  });
  form.querySelectorAll("[data-battle-text-picker] [data-module-reference-picker]")
    .forEach(picker => bindReferencePicker(picker));
  form.querySelectorAll("[data-battle-formation-field]").forEach(input =>
    input.addEventListener(input.dataset.battleFormationField === "monster_id" ? "change" : "input", event => {
      const previous = copyEditorDraft(state.battleTestView.formation);
      applyBattleTestFormationControl(
        state.battleTestView.formation,
        event.target,
        form,
      );
      const error = battleTestFormationDraftError(state.battleTestView.formation);
      if (error) {
        state.battleTestView.formation = previous;
        previous.forEach((slot, index) => syncBattleTestFormationSlotControls(form, index, slot));
        updateBattleTestEditorState(`输入无效：${error}`);
        return;
      }
      commitBattleTestPage();
      void paintBattleTestPreview(form);
    })
  );
  await hydrateModuleComponents(form);
  const resetGroups = battleResetGroups(fields);
  let initializing = true;
  for (const field of fields) field.bind(form, () => {
    const draft = state.battleTestView, baseline = state.battleTestPersistedView;
    if (!draft || !baseline) return;
    if (field.recordId === "entry") {
      const name = field.fieldName, old = baseline[name], clean = draft[name] === old;
      baseline[name] = field.value;
      if (clean) {
        draft[name] = field.value;
        const input = form.querySelector(`[data-battle-test-field="${name}"]`);
        if (input) {if (input.type === "checkbox") input.checked = field.value; else input.value = String(field.value);}
        if (["scene_id", "x", "y"].includes(name)) syncScenePositionPicker(scenePicker, {
          entries: sceneEntries, sceneId: draft.scene_id, x: draft.x, y: draft.y,
        });
        if (name === "encounter_id") {
          draft.formation = battleTestFormationDraft(battleTestFormation(state.project.game_data.battle_test, field.value));
          baseline.formation = copyEditorDraft(draft.formation);
          draft.formation.forEach((slot, index) => syncBattleTestFormationSlotControls(form, index, slot));
          form.querySelectorAll('.battle-formation-slots tbody [data-reset-to-original]').forEach((button, index) => {
            button.dataset.resetToOriginal = fields.find(value =>
              value.recordId === field.value && value.slotId === index).entityHandle;
          });
          const holder = form.querySelector('[data-battle-original-control^="formation:"]');
          if (holder) {holder.dataset.battleOriginalControl = battleTestFormationResetKey(field.value);
            holder.querySelector('[data-reset-to-original]').dataset.resetToOriginal = battleTestFormationResetKey(field.value);}
        }
      }
    } else if (field.recordId === draft.encounter_id && baseline.encounter_id === draft.encounter_id) {
      const slot = field.slotId, name = field.fieldName;
      if (draft.formation[slot][name] === baseline.formation[slot][name]) draft.formation[slot][name] = field.value;
      baseline.formation[slot][name] = field.value;
      syncBattleTestFormationSlotControls(form, slot, draft.formation[slot]);
    }
    if (!initializing) {
      battlePersistedResetStates = new Map([...resetGroups].map(([key, selected]) => [key, selected.some(value => value.hasOverride)]));
      updateBattleTestEditorState();
    }
    if (form.dataset.battleFieldsReady === "true" &&
        (field.recordId === draft.encounter_id ||
          (field.recordId === "entry" && field.fieldName === "encounter_id"))) {
      void paintBattleTestPreview(form);
    }
  });
  initializing = false;
  battlePersistedResetStates = new Map([...resetGroups].map(([key, selected]) => [key, selected.some(value => value.hasOverride)]));
  bindFieldResetToOriginalButtons(form, resetGroups, {
    database: db, confirmMessage: resetConfirmation,
    beforeReset: async selected => {
      battleTestResetting = true; updateBattleTestEditorState();
      const context = await prepareBattlePageReset(selected[0].recordId);
      context.changed = selected.some(field => field.hasOverride);
      return context;
    },
    afterReset: async (_selected, context) => {
      try {await finishBattlePageReset(context); await render();}
      finally {battleTestResetting = false; if (battleTestViewPending() && !battleTestDraftError()) commitBattleTestPage();}
    },
    onError: error => {battleTestResetting = false; updateBattleTestEditorState(`恢复失败：${error.message}`);},
  });
  form.dataset.battleFieldsReady = "true";
  updateBattleTestEditorState(state.battleTestMessage);
  await paintBattleTestPreview(form);
  void refreshBattleTestOriginalStates(form).catch(error => {
    if (form.isConnected) {
      updateBattleTestEditorState(`Original 状态读取失败：${error.message}`);
    }
  });
}

var battleBind = /*#__PURE__*/Object.freeze({
  __proto__: null,
  bindBattleTestEditor: bindBattleTestEditor,
  bindSceneBattleTestFormationEditor: bindSceneBattleTestFormationEditor
});

// @editor-module 怪物编队的列表、字段编辑、使用处与模拟器入口。

const handle = id => `encounter-formation:${Number(id).toString(16).toUpperCase().padStart(2, '0')}`;
const USAGE_TYPES = [
  ['random', '随机遇敌'], ['script', '剧情战斗'], ['coordinate', '固定坐标战斗'],
  ['wanted', '通缉目标'], ['poster', '通缉海报'], ['test', '战斗测试'], ['shared', '遇敌服务'],
];

function usageGroups(rows) {
  const groups = new Map(USAGE_TYPES.map(([kind]) => [kind, []]));
  const random = new Map();
  for (const row of rows) {
    const positions = Number.isInteger(row.sceneId) ? [row] : row.positions || [];
    if (row.kind !== 'random') {
      groups.get(row.kind).push(...(positions.length ? positions : [null])
        .map(position => ({...row, positions: position ? [position] : []})));
      continue;
    }
    for (const position of positions.length ? positions : [null]) {
      const key = `${row.resource}:${position?.sceneId ?? ''}`;
      if (!random.has(key)) {
        const merged = {...row, positions: [], slots: []};
        random.set(key, merged);
        groups.get(row.kind).push(merged);
      }
      const merged = random.get(key);
      if (!merged.slots.includes(row.slot)) merged.slots.push(row.slot);
      if (position && !merged.positions.some(other => other.x === position.x && other.y === position.y))
        merged.positions.push(position);
    }
  }
  return groups;
}

function usageRowMarkup(row) {
  const position = row.positions[0];
  const scene = state.project.scenes.editable_scenes.find(entry => Number(entry.id) === position?.sceneId);
  const sceneHref = sceneDetailHref(scene, position);
  const href = row.kind === 'random' ? sceneHref : row.href || sceneHref;
  const target = href ? '' : row.resource;
  const label = row.kind === 'random' ? `遇敌区 ${row.resource.split(':').at(-1)} · 槽 ${row.slots.join('、')}`
    : row.kind === 'wanted' ? '赏金与结局回顾'
    : row.kind === 'test' ? '调查测试'
    : row.label.replace(/^固定坐标战斗 /u, '').replace(/^通缉海报/u, '').replace(/剧情/u, '');
  const caption = row.href ? `<a href="${esc(row.href)}">${esc(label)}</a>` : `<span>${esc(label)}</span>`;
  const preview = scene ? `<a class="formation-use-scene" href="${esc(sceneHref)}">${
    renderModuleComponent('scene-header-map', 'preview', {entry: scene,
      width: 32, height: 20, interactive: false, showName: true})}</a>` : '';
  const coordinates = row.positions.filter(point => Number.isInteger(point.x) && Number.isInteger(point.y))
    .map(point => row.kind === 'random'
      ? `<a href="${esc(sceneDetailHref(scene, point))}">${point.x},${point.y}</a>`
      : `<span>${point.x},${point.y}</span>`).join('');
  return `<li class="formation-use-row" role="link" tabindex="0"
    ${href ? `data-formation-use-href="${esc(href)}"` : `data-formation-use-target="${esc(target)}"`}>
    <span class="formation-use-label">${caption}</span>${preview}
    <span class="formation-use-coordinates">${coordinates}</span></li>`;
}

function usageMarkup(rows) {
  const groups = usageGroups(rows);
  return `<div class="formation-usage">${USAGE_TYPES.map(([kind, label]) => {
    const uses = groups.get(kind);
    return uses.length ? `<section class="formation-use-group" data-formation-use-kind="${kind}">
      <h4>${label}</h4><ul>${uses.map(usageRowMarkup).join('')}</ul></section>` : '';
  }).join('')}</div>`;
}

async function renderMonsterFormations() {
  const project = state.project;
  const formations = project.game_data.battle_test.formations;
  const monsters = project.game_data.monsters.records;
  const uses = await formationUsage(db);
  const requested = /^encounter-formation:([0-9A-F]{2})$/iu.exec(state.resourceId || state.recordId || '');
  const selected = formations.find(row => Number(row.id) === (requested ? parseInt(requested[1], 16) : 1)) || formations[0];
  const selectedUses = uses.get(Number(selected.id)) || [];
  return screenWorkbench({namespace: 'monster-formations', treeTitle: '编队', treeScroll: 'body', inspectorScroll: 'body',
    attributes: {'data-formation-id': selected.id},
    toolbarMarkup: `<a class="editor-inline-link" href="?view=battle-test&amp;battleFormation=${selected.id}">战斗模拟器 ↗</a>`,
    treeMarkup: FORMATION_GROUPS.map(([kind, label]) => {
      const rows = formations.filter(row => formationGroup(uses.get(Number(row.id)) || []) === kind);
      return rows.length ? `<h3>${label}</h3>${elementTree({showIcons: false, selectedId: handle(selected.id),
        nodes: rows.map(row => ({id: handle(row.id), label: [...new Set(row.slots
          .filter(slot => Number(slot.count) > 0).map(slot => monsters.find(monster =>
            Number(monster.id) === Number(slot.monster_id))?.name || '怪物'))].join(' / ') || '空编队'})),
        buttonAttributes: node => ({'data-formation-select': node.id}),
      })}` : '';
    }).join(''),
    inspectorTitle: null,
    inspectorMarkup: `<div><p>${esc(battleTestFormationDisplayLabel(selected, monsters))}</p>${renderBattleTestFormationInlineEditor(selected.id)}<h3>使用处</h3>${usageMarkup(selectedUses)}</div>`,
  });
}

async function bindMonsterFormations() {
  const root = document.querySelector('[data-screen-workbench="monster-formations"]');
  if (!root) return;
  root.querySelector('.element-tree-node.is-selected')?.scrollIntoView({block: 'nearest'});
  const id = Number(root.dataset.formationId);
  const repaint = async () => {
    if (!root.isConnected) return;
    const formation = state.project.game_data.battle_test.formations.find(row => Number(row.id) === id);
    root.querySelector('.element-tree-node.is-selected b').textContent =
      battleTestFormationDisplayLabel(formation, state.project.game_data.monsters.records);
  };
  await bindSceneBattleTestFormationEditor(root, repaint);
  for (const field of (await db.getFields('battle-test-point')).filter(row => row.recordId === id))
    field.bind(root, (_host, _value, _field, reason) => {
      if (reason !== 'initial') void repaint();
    });
  await hydrateModuleComponents(root);
  for (const row of root.querySelectorAll('.formation-use-row')) {
    const navigate = async () => {
      await flushAllAutoSaves();
      if (row.dataset.formationUseTarget) await navigateToResourceTarget(row.dataset.formationUseTarget);
      else await navigateInternalUrl(new URL(row.dataset.formationUseHref, location.href));
    };
    row.addEventListener('click', event => {
      if (event.target.closest('a') || event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      void navigate();
    });
    row.addEventListener('keydown', event => {
      if (event.target !== row || !['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      void navigate();
    });
  }
  for (const button of root.querySelectorAll('[data-formation-select]')) button.addEventListener('click', async () => {
    await flushAllAutoSaves();
    await navigateToResourceTarget(button.dataset.formationSelect);
  });
}

var monsterFormations = /*#__PURE__*/Object.freeze({
  __proto__: null,
  bindMonsterFormations: bindMonsterFormations,
  renderMonsterFormations: renderMonsterFormations
});

export { battleBind, bindSceneBattleTestFormationEditor, monsterFormations };
