// @editor-module 自主脚本在场景中的条件与交互投影。
import {sceneActorStateObjects} from './scene-entry-states.js';
import {projectStoryScriptPrograms} from './story-script-layout.js';
import {projectFieldDraftOrigin, projectFieldDraftRevision, trackProjectFieldProjection} from './project-field-draft.js';
const hex = value => Number(value).toString(16).toUpperCase().padStart(2, '0');

const PRESENTATIONS = new Map([
  ['branch-if-event-flag-clear', ['事件位条件', ['条件事件位', '分支位移']]],
  ['remove-actor-if-event-flag-set', ['条件消失', ['消失事件位']]],
  ['wait-event-flag-set', ['等待事件位', ['等待事件位']]],
  ['set-event-flag', ['写入事件位', ['写入事件位']]],
  ['clear-event-flag', ['清除事件位', ['清除事件位']]],
  ['set-actor-position', ['角色位置', ['位置 X', '位置 Y']]],
  ['move-actor-to-position', ['移动', ['移动 X', '移动 Y']]],
  ['branch-on-player-position-exact', ['玩家位置条件', ['触发 X', '触发 Y', '不匹配位移']]],
  ['branch-on-player-position-rectangle', ['玩家范围条件',
    ['触发 X 起点', '触发 X 上界', '触发 Y 起点', '触发 Y 上界', '范围外位移']]],
  ['branch-on-player-direction', ['玩家朝向条件', ['触发朝向', '不匹配位移']]],
  ['set-motion-attributes', ['移动属性', ['移动属性']]],
  ['start-scripted-encounter', ['战斗', ['战斗编队', '胜利事件位', '剧情状态']]],
  ['end-story-state-with-scene-context', ['退出场景', []]],
  ['relative-cursor-advance', ['跳转', ['跳转位移']]],
  ['countdown-relative-branch', ['循环', ['循环位移', '循环次数']]],
  ['branch-if-runtime-result-nonzero', ['结果条件', ['分支位移']]],
  ['branch-if-runtime-slot-empty', ['空槽条件', ['队伍槽', '分支位移']]],
  ['branch-if-runtime-slot-present', ['占用槽条件', ['队伍槽', '分支位移']]],
  ['branch-if-runtime-party-actor-type-absent', ['队伍形象条件', ['角色形象', '分支位移']]],
  ['branch-if-runtime-slot-is-not-player-actor', ['队员条件', ['队伍槽', '分支位移']]],
  ['wander-inside-rectangle', ['移动范围', ['X 起点', 'X 上界', 'Y 起点', 'Y 上界']]],
  ['follow-rom-waypoint-loop', ['循环路径', ['路径']]],
  ['play-render-slot-offset-sequence', ['位置变化序列', ['序列', '角色形象']]],
  ['play-table-driven-actor-transformation', ['形象变化序列', ['序列']]],
  ['set-direct-frame-id', ['单帧形象', ['单帧形象']]],
  ['set-actor-type-animation-renderer', ['动画形象', ['角色形象']]],
  ['set-actor-type', ['角色形象', ['角色形象']]],
  ['replace-runtime-player-actor-type', ['队伍形象替换', ['原形象', '新形象']]],
  ['set-packed-camera-relative-position', ['镜头相对位置', ['相对位置']]],
  ['wait-operand-frames', ['等待', ['等待帧数']]],
  ['drive-scripted-input', ['自动输入', ['移动步数']]],
  ['sound-command', ['音频', ['音频命令']]],
  ['set-dialogue-actor-parameter', ['对话角色', ['对话角色']]],
  ['start-blocking-dialogue', ['文字', ['文字记录']]],
  ['start-blocking-ui-action', ['文字', ['文字记录']]],
  ['advance-global-screen-effect', ['画面效果', ['效果轮数']]],
  ['set-global-parameter', ['全局参数', ['全局参数']]],
  ['set-story-parameter', ['剧情参数', ['剧情参数']]],
  ['set-runtime-parameter-$9c', ['运行参数 9C', ['参数']]],
  ['set-runtime-parameter-$a2', ['运行参数 A2', ['参数']]],
  ['enter-dedicated-field-mode', ['场景模式', ['模式']]],
  ['set-runtime-party-slot-index', ['队伍槽', ['队伍槽']]],
  ['adopt-runtime-entity-state', ['接管现场角色', ['现场角色']]],
  ['transfer-actor-to-runtime-entity', ['转交队伍角色', ['队伍槽']]],
  ['subtract-party-money', ['扣除金钱', ['金额']]],
  ['write-field-tile-at-actor', ['角色位置地形', ['元图块']]],
  ['step-by-rom-direction-table', ['方向表移动', []]],
  ['step-toward-story-target', ['趋向目标', []]],
  ['attempt-tile-step', ['格步', []]],
  ['advance-wander-motion', ['游走', []]],
  ['move-actor-off-map', ['移出场景', []]],
  ['toggle-player-control-lock', ['切换操控锁', []]],
  ['clear-runtime-entity-render-slots', ['清除现场角色', []]],
  ['remove-actor', ['移除角色', []]],
  ['initialize-actor-motion-state', ['初始化移动', []]],
  ['face-opposite-runtime-direction', ['背向玩家', []]],
  ['set-direction', ['朝向', []]],
  ['end-actor-script', ['脚本结束', []]],
  ['set-runtime-entity-direction', ['现场角色朝向', []]],
  ['refresh-field-state', ['刷新场景状态', []]],
  ['mutate-field-tile-near-actor', ['附近地形变化', []]],
  ['pop-story-actor-slot', ['移除末尾角色', []]],
  ['wait', ['等待', []]],
]);

export function storySceneDialogueReferences(action) {
  const ui = action.command.blocking_ui;
  if (!ui) return [];
  // 文字区与记录双操作数沿用剧情生产端的 $26 读写定义。
  const variableRegion = action.command.opcode === 0x26;
  const index = variableRegion ? 1 : ui.record_operand_index ?? action.semantic.record_operand_index ?? 0;
  return [{index, regionId: variableRegion ? action.operands[0] : ui.region_id,
    recordId: action.operands[index]}];
}

export function storySceneActionPresentation(action) {
  const definition = PRESENTATIONS.get(action.operation);
  if (!definition) return null;
  const [label, names] = definition;
  const labels = action.command.opcode === 0x26 ? ['文字区', '文字记录'] : names;
  const flags = ['branch-if-event-flag-clear', 'remove-actor-if-event-flag-set',
    'wait-event-flag-set', 'set-event-flag', 'clear-event-flag'].includes(action.operation);
  const directions = {up: '上', down: '下', left: '左', right: '右'};
  const value = action.semantic.direction ? directions[action.semantic.direction]
    : action.operation === 'wait' ? `${action.semantic.frames} 帧`
      : action.operation === 'drive-scripted-input' ? directions[
        ['up', 'down', 'left', 'right'][action.semantic.input_value - 1]] : '';
  return {label, value, operands: labels.map((label, index) => ({label, index,
    eventFlag: flags && index === 0 || action.operation === 'start-scripted-encounter' && index === 1})),
    destination: action.operation === 'end-story-state-with-scene-context'};
}

export async function prepareStorySceneActions(records, document, story, database) {
  const ids = [...new Set(records.map(row => Number(row.autonomous_script_id)))];
  const entries = ids.filter(id => id > 0 && !story?.browser_vm?.programs?.some(row =>
    row.kind === 'autonomous' && Number(row.id) === id)).map(id =>
    story?.autonomous?.entries?.find(row => Number(row.id) === id)).filter(row => row?.path);
  const programs = await Promise.all(entries.map(entry =>
    database.getPackageDocument(`game/story/${entry.path}`, null)));
  const projection = Object.assign(Object.create(document), {
    scene_action_programs: programs.filter(program => program?.kind === 'autonomous')});
  const origin = projectFieldDraftOrigin(document);
  return origin ? trackProjectFieldProjection(projection, origin,
    () => projectFieldDraftRevision(document)) : projection;
}

export function storySceneActions(record, document, story) {
  const script = document?.scripts?.find(row => Number(row.id) === Number(record.autonomous_script_id));
  let programs = [...(story?.browser_vm?.programs || []), ...(document?.scene_action_programs || [])]
    .filter(row => row.kind === 'autonomous');
  if (document?.layout) programs = projectStoryScriptPrograms(document, programs);
  const program = programs
    .find(row => row.kind === 'autonomous' && Number(row.id) === Number(script?.id));
  if (!script || !program) return [];
  const semantics = new Map(story.browser_vm.opcode_semantics.map(row => [row.opcode, row]));
  const segments = (document.scripts || []).map(script => ({script,
    range: story.autonomous.entries.find(row => Number(row.id) === Number(script.id))?.encoded_range}))
    .filter(row => row.range);
  const fieldAt = offset => {
    const segment = segments.find(row => offset >= row.range.start_prg
      && offset < row.range.end_prg_exclusive);
    if (!segment) return null;
    const byteIndex = offset - segment.range.start_prg;
    return {entityHandle: `story-autonomous-script:script:${hex(segment.script.id)}`,
      byteIndex, value: segment.script.bytecode[byteIndex]};
  };
  return program.commands.flatMap(command => {
    const cursor = Number(command.cursor);
    const declared = command.instructionBindings;
    const bound = index => {
      const binding = declared?.[index];
      if (!binding) return null;
      return binding.kind === 'sequence' ? {entityHandle: 'story-autonomous-script:pool',
        tokenId: binding.tokenId, operandIndex: binding.index, value: index ? command.currentOperands[index - 1] : command.opcode}
        : {entityHandle: binding.handle, byteIndex: binding.byteIndex,
          value: index ? command.currentOperands[index - 1] : command.opcode};
    };
    const location = declared ? bound(0) : fieldAt(command.prg_offset);
    if (!location || location.value !== command.opcode) return [];
    const semantic = semantics.get(command.opcode);
    if (!semantic) return [];
    const operandFields = Array.from({length: 5}, (_, index) => declared ? bound(index + 1) : fieldAt(command.prg_offset + index + 1));
    return [{cursor, operation: semantic.operation, semantic, command,
      handle: location.entityHandle, byteCursor: location.byteIndex, operandFields,
      operands: operandFields.map(field => field?.value)}];
  });
}

export function storyActorCondition(record, document, story, actors) {
  const actions = storySceneActions(record, document, story);
  const action = actions.find(row => row.cursor === 0);
  if (!action || !['branch-if-event-flag-clear', 'remove-actor-if-event-flag-set'].includes(action.operation)) return null;
  const flag = action.operands[0];
  let removedWhenSet = action.operation === 'remove-actor-if-event-flag-set';
  const clearCursor = action.operands[action.semantic.branch_operand_index];
  for (let cursor = action.command.normal_advance; cursor < clearCursor;) {
    const step = actions.find(row => row.cursor === cursor);
    if (!step) break;
    if (step.operation === 'remove-actor') {removedWhenSet = true; break;}
    if (step.semantic.fidelity !== 'exact' || step.command.terminal_side_effect
        || step.command.edges.some(edge => edge.kind !== 'normal')
        || !(step.command.normal_advance > 0)) break;
    cursor += step.command.normal_advance;
  }
  const poses = sceneActorStateObjects({record}, document, story).map(row => row.pose);
  const triggers = (actors?.records || []).filter(row => row.entry_id === record.entry_id)
    .flatMap(actor => storySceneActions(actor, document, story).filter(row =>
      row.operation === 'start-scripted-encounter' && row.operands[1] === flag)
      .map(() => ({flag, label: '战斗胜利', reference: actor.uid,
        scene_id: actor.entry_id, object: `actor:${actor.id}`})));
  return {label: '自主动作条件', flags: [flag], flag_labels: {[flag]: '事件位'},
    triggers, states: [false, true].map(set => ({id: set ? 'set' : 'clear',
      label: `${hex(flag)} = ${Number(set)}`, cells: [],
      actor_hidden: set && removedWhenSet,
      actor_pose: poses.find(pose => pose.conditions.includes(`global-event-flag:${hex(flag)} = ${Number(set)}`)),
    }))};
}
