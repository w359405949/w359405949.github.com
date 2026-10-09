import { esc, interfacePreviewState, hiddenTeleportDestination } from './element-tree-DsgOBeTK.js';
import { eventFlagReferenceMarkup } from './timeline-player-y3hI_sah.js';
import { ownerReferenceListMarkup, controllerAt, controllerHref, controllerSceneHref, controllerTargetLabel, controllerFlagId, bindOwnerReferenceList, withCurrentOwnerRecord, currentOwnerReferenceImpact } from './battle-result-state-machine-CED-HbAa.js';
import { createNesApuSynth, ensureSequenceExecutions } from './pattern-pixel-editor-B8puYQ8A.js';
import { previewSoundEnabled, subscribePreviewSound } from './overview-CxFLx7O1.js';
import { advanceNameEntry, initialNameEntry, db, HIDDEN_TELEPORT_RESOURCE_ID } from './battle-result-script-runtime-B_EClFew.js';
import { getSaveSlotStatus, previewSaveFileOperation, previewSaveFileFields } from './prg-loaders-BmwiQmdC.js';

// @editor-module 控制器、受控对象与存档事件位的往返链接。

function link$1(href, label, role) {
  return href ? `<a class="editor-inline-link" data-controller-link="${role}" href="${esc(href)}">${esc(label)} ↗</a>` : esc(label);
}

function controllerTargetsMarkup(instance, project) {
  const control = instance.switch;
  if (!control) return '';
  const targets = (control.targets || []).map(target => {
    const points = target.cells || (target.x == null ? [] : [{x: target.x, y: target.y}]);
    return `<p>${esc(target.label)} · ${points.length ? points.map(point => link$1(
      controllerSceneHref(target.scene_id, project, {object: target.scene_object,
        point: [point.x, point.y], mode: target.kind === 'map-replacement' ? 'tiles' : 'logic'}),
      `场景 $${Number(target.scene_id).toString(16).toUpperCase()} (${point.x}, ${point.y})`, 'target')).join(' · ')
      : link$1(controllerSceneHref(target.scene_id, project), controllerTargetLabel(target), 'target')}
      ${target.target_scene_id == null ? '' : ` → ${link$1(controllerSceneHref(target.target_scene_id, project),
        `场景 $${Number(target.target_scene_id).toString(16).toUpperCase()}`, 'target')}`}
      ${target.event_flag_reference ? ` · ${eventFlagReferenceMarkup(target.event_flag_reference, {attributes: 'data-controller-link="flag"'})}` : ''}</p>`;
  }).join('');
  const flag = controllerFlagId(control.event_flag_reference);
  return `${targets}<p>${eventFlagReferenceMarkup(flag, {attributes: 'data-controller-link="flag"'})}
    · ${control.password_required ? '正确密码置位'
      : '置位 / 清位 · 可反复切换'}</p>
    ${control.failure_flag_reference ? `<p>密码错误：${eventFlagReferenceMarkup(control.failure_flag_reference, {attributes: 'data-controller-link="flag"'})}</p>` : ''}`;
}

function controllerBacklink(instance, project) {
  return link$1(controllerHref(instance, project), `控制器 ${instance.scene_object_uid} · (${instance.x}, ${instance.y})`, 'controller');
}

function sceneControllerMarkup(object, project, sceneLogic) {
  return controllerAt(object, project, sceneLogic).map(instance => `<div data-controller-chain>
    <p>${controllerBacklink(instance, project)} → 受控对象</p>${controllerTargetsMarkup(instance, project)}</div>`).join('');
}

function controlledObjectMarkup(sceneId, selection, project) {
  return ownerReferenceListMarkup('控制器',
    `data-controlled-object-users="${esc(JSON.stringify({kind: 'controlled-object', sceneId, selection}))}"`);
}

function bindControlledObjectUsers(root, project, onLoaded) {
  root.querySelectorAll('[data-controlled-object-users]').forEach(host =>
    bindOwnerReferenceList(host, () => withCurrentOwnerRecord(
      JSON.parse(host.dataset.controlledObjectUsers), project,
      () => currentOwnerReferenceImpact()).map(instance =>
      `<p data-controlled-object>${controllerBacklink(instance, project)}</p>`).join(''), onLoaded));
}

// @editor-module 用现有合成器按剧情帧合成音乐、音效与淡出。
async function renderAudioTimeline(audio, synth, events, durationFrames, fps = 60) {
  const durationSeconds = Math.max(1 / fps, durationFrames / fps);
  const sampleRate = synth.sampleRate;
  const count = Math.ceil(durationSeconds * sampleRate);
  const channels = ["pulse-1", "pulse-2", "triangle", "noise", "dpcm"];
  const channelPcm = Object.fromEntries(channels.map(key => [key, new Float32Array(count)]));
  const commands = new Map((audio.commands || []).map(command => [Number(command.id), command]));
  const controls = new Map((audio.controls || []).map(control => [Number(control.id), control]));
  const renderedCommands = new Map();
  let music = null;
  const effects = new Map();
  let fade = null;
  let cursor = 0;
  const sorted = events.map((event, index) => ({...event, index}))
    .sort((a, b) => a.frame - b.frame || a.index - b.index);
  const renderSeconds = durationSeconds + Math.max(0, -(Number(sorted[0]?.frame) || 0) / fps);
  const reports = [];
  const mixUntil = end => {
    for (; cursor < end; cursor++) {
      const frame = cursor / sampleRate * fps;
      const fadeSteps = fade ? Math.floor((frame - fade.frame) / fade.interval) : 0;
      if (fade && fadeSteps >= 16) {
        music = null;
        effects.clear();
        fade = null;
      }
      const level = fade ? Math.max(0, 1 - fadeSteps / 16) : 1;
      for (const key of channels) {
        const effect = effects.get(key);
        const effectIndex = effect ? cursor - effect.start : -1;
        const source = effect && effectIndex < effect.pcm.length ? effect : music;
        const pcm = source?.rendered?.channelPcm?.[key] || source?.pcm;
        const index = source ? cursor - source.start : -1;
        if (pcm && index >= 0 && index < pcm.length) channelPcm[key][cursor] = pcm[index] * level;
      }
    }
  };
  for (const event of sorted) {
    const start = Math.min(count, Math.round(Number(event.frame) / fps * sampleRate));
    mixUntil(Math.max(0, start));
    const id = Number(event.command_id);
    const control = controls.get(id);
    if (control) {
      if (!(Number(control.interval) > 0)) throw new Error(`声音控制 ${id} 的步进时长未确认`);
      fade = {frame: Number(event.frame), interval: Number(control.interval)};
      reports.push({frame: event.frame, commandId: id, kind: "fade-control"});
      continue;
    }
    const command = commands.get(id);
    if (!command) throw new Error(`未知剧情声音命令 ${id}`);
    if (command.status === "audio-reset") {
      music = null;
      effects.clear();
      fade = null;
      reports.push({frame: event.frame, commandId: id, kind: "audio-reset"});
      continue;
    }
    let rendered = renderedCommands.get(id);
    if (!rendered) {
      rendered = await synth.renderCommand(id, {maxSeconds: renderSeconds,
        timelineSeconds: renderSeconds, dpcmGatePolicy: "assume-open"});
      if (!rendered.ok) throw new Error(rendered.reason || "剧情声音合成失败");
      if (rendered.trackReports.length && rendered.trackReports.every(track => track.status === "unplayable")) {
        throw new Error(`剧情声音命令 ${id} 缺少可播放音序`);
      }
      renderedCommands.set(id, rendered);
    }
    reports.push({frame: event.frame, commandId: id, kind: command.kind, warnings: rendered.warnings});
    if (command.kind === "music") {
      if (music?.rendered.commandId === id
          && ["scene-entry-music", "queue-sound-command-if-changed"].includes(event.dispatch)) continue;
      music = {rendered, start};
      fade = null;
    } else {
      for (const track of command.tracks || []) {
        const pcm = rendered.channelPcm?.[track.channel_key];
        const report = rendered.trackReports.find(item => item.channelKey === track.channel_key);
        if (pcm) effects.set(track.channel_key, {
          pcm: pcm.subarray(0, Math.ceil(Number(report?.durationSeconds ?? rendered.durationSeconds) * sampleRate)), start});
      }
    }
  }
  mixUntil(count);
  return {ok: true, status: "rendered", sampleRate, durationSeconds, channelPcm,
    reports, fidelity: "existing-command-synth-with-channel-overrides"};
}

// @editor-module 时间轴声音的准备、定位与播放生命周期。

const players = new Set();
subscribePreviewSound(enabled => {
  if (!enabled) for (const player of players) player.stop();
});

function createAudioTimelinePlayer(audio, events, duration, fps = 60) {
  const synth = createNesApuSynth(audio, {dpcmGatePolicy: "assume-open"});
  let token = 0;
  let disposed = false;
  let activated = false;
  let pending = null;
  const prepare = () => {
    pending ||= ensureSequenceExecutions(audio).then(() =>
      renderAudioTimeline(audio, synth, events, duration, fps));
    return pending;
  };
  const player = {
    synth, get ready() { return prepare(); }, get unlocked() { return activated; },
    async play(currentFrame, rate = 1) {
      if (!previewSoundEnabled()) return;
      const serial = ++token;
      const unlocked = await synth.unlock();
      if (serial !== token || disposed) return;
      if (!unlocked.ok) throw new Error(unlocked.error || unlocked.reason);
      activated = true;
      const rendered = await prepare();
      if (serial !== token || disposed) return;
      const frame = typeof currentFrame === "function" ? currentFrame() : currentFrame;
      const result = await synth.playTimeline(rendered, {offsetSeconds: frame / fps, rate});
      if (!result.ok && result.status !== "cancelled") throw new Error(result.reason);
      return result;
    },
    stop() {
      token++;
      synth.stop("timeline-paused");
    },
    dispose() {
      disposed = true;
      token++;
      players.delete(player);
      void synth.dispose();
    },
  };
  players.add(player);
  return player;
}

function stopAudioTimelines() {
  for (const player of [...players]) player.dispose();
}

// @editor-module 系统状态图保留文件、命名与结局的稳定等待点及领域交接。


const EVIDENCE = 'project/evidence/system-state-machine/observations.json';
const node = (id, label, previewId, role = 'screen') => ({id, label, previewId, role});

function systemStateGraph(page, previews, variant = 'player-name') {
  let nodes = [], routes = [];
  if (page === 'startup-load') {
    nodes = [node('title', '等待开始', null, 'title'),
      node('files', '文件菜单', 'constructor:startup-load-file-menu'),
      node('file-slot', '文件槽选择', 'constructor:startup-load-file-menu'),
      node('player-name', '主角命名', 'constructor:player-name'),
      node('game', '进入游戏', null, 'call')];
    routes = [['title', 'files', 'A / START', '有效记录存在'], ['title', 'player-name', 'A / START', '没有有效记录'],
      ['files', 'file-slot', '继续 / 移动 / 删除 · A', ''],
      ['file-slot', 'game', '继续 · A', '所选记录有效'], ['file-slot', 'files', '移动 / 删除 · A', '所选记录有效'],
      ['file-slot', 'file-slot', 'A', '所选记录无效'], ['files', 'player-name', '重开 · A', ''],
      ['file-slot', 'files', 'B', ''],
      ['player-name', 'game', 'END · A', '']];
  } else if (page === 'save-management') {
    nodes = [node('save-prompt', '存档确认', 'constructor:save-prompt'),
      node('save-slot', '存档槽选择', 'constructor:slot-select'),
      node('save-overwrite', '覆盖确认', 'constructor:save-management-overwrite'),
      node('saved', '保存完成', 'constructor:saved'),
      node('save-continue', '继续游戏', 'constructor:save-management-continue'),
      node('save-bed', '就寝提示', 'constructor:save-management-bed')];
    routes = [['save-prompt', 'save-slot', '是 · A', '首次保存'], ['save-prompt', 'saved', '是 · A', '已有当前文件槽'],
      ['save-prompt', null, '否 / B', ''], ['save-slot', 'save-overwrite', 'A', '已有有效记录'],
      ['save-slot', 'saved', 'A', '空记录'], ['save-slot', null, 'B', ''],
      ['save-overwrite', 'saved', '是 · A', ''], ['save-overwrite', null, '否 / B', ''],
      ['saved', 'save-continue', 'A / B', '正文续接'], ['save-continue', null, '是 · A', ''],
      ['save-continue', 'save-bed', '否 / B', ''], ['save-bed', null, 'A / B', '结束游戏并等待重启或关机']];
  } else if (page === 'name-entry') {
    const stem = variant === 'vehicle-name' ? 'vehicle-name' : 'player-name';
    nodes = [node('name-grid', '字符表', `constructor:${stem}`), node('name-typed', '已输入姓名', `constructor:${stem}-typed`),
      node('name-end', 'END 选中', `constructor:${stem}-end`), node('name-return', '返回调用者', null, 'call')];
    routes = [['name-grid', 'name-typed', '字符 · A', ''], ['name-typed', 'name-typed', '字符 / 删除', ''],
      ['name-grid', 'name-end', '方向键', ''], ['name-typed', 'name-end', '方向键', ''],
      ['name-end', 'name-grid', '方向键', ''], ['name-end', 'name-return', 'A', variant === 'vehicle-name' ? '名字非空' : '']];
  } else if (page === 'ending-credits') {
    nodes = [node('ending-retirement', '退隐终页', 'constructor:ending-retirement-message'),
      node('ending-noah', '诺亚结局消息', 'constructor:ending-message-10'),
      node('ending-record', '通关记录', 'constructor:ending-message-11'),
      node('ending-terminal', '终页等待', 'constructor:ending-message-12'),
      node('credits', '职员表播放', null, 'call')];
    routes = [['ending-retirement', null, '任意新按键', '重启边界'], ['ending-noah', 'credits', '领域交接', ''],
      ['ending-record', 'credits', '领域交接', '']];
  }
  for (const row of nodes) {
    if (page === 'startup-load' && row.id === 'player-name') row.referenceTarget = {
      pageId: 'name-entry', nodeId: 'name-grid', label: '命名'};
    if (row.id === 'game') row.referenceTarget = {pageId: 'scenes', label: '场景进入', route: {view: 'scenes'}};
    if (row.id === 'credits') row.referenceTarget = {label: '结局与职员表',
      identity: {id: 'story:extended-fa-ending', domain: 'story', key: 'extended-fa-ending'},
      route: {view: 'ending', storySequence: 'extended-fa-ending'}};
  }
  nodes = nodes.map(row => ({...row, publishedPreview: previews.find(preview => preview.id === row.previewId) || null}));
  const transitions = routes.map(([from, to, input, condition], index) => ({id: `system:${page}:${index}`,
    from, to: nodes.some(row => row.id === to) ? to : null, input, condition, evidence: EVIDENCE,
    executable: true, unknown: false,
    ...(from === 'save-bed' ? {evidence: 'project/evidence/reverse-engineering/small-service-groups/observations.json',
      scope: 'A000 交接结束游戏提示；保存记录不执行旅馆 HP 恢复；重启后的开机流程归调用者'} : {})}));
  return {nodes, transitions, edges: transitions.map(row => ({...row, routes: [row]})),
    entry: page === 'startup-load' ? 'files' : nodes[0]?.id};
}

function systemStateExecution({page, graph, protocol, byteMap, variant = 'player-name'}) {
  const status = state => getSaveSlotStatus(state.execution.files, state.selections.slot, byteMap);
  const selectNode = state => {
    const name = state.execution.name;
    state.node = name.confirmed ? (page === 'startup-load' ? 'game' : 'name-return')
      : page === 'startup-load' ? 'player-name'
      : name.index === protocol.endIndex ? 'name-end' : name.buffer.some(code => code < 159) ? 'name-typed' : 'name-grid';
    if (name.confirmed) {
      state.domainResults.name = {variant: name.variant, codes: [...name.buffer], confirmed: true};
      const suffix = name.variant === 'player-name' ? 'role.hunter' : `vehicle.${state.context.vehicle || 0}`;
      if (name.buffer[0] < 159) state.fields[`save.slot.${state.context.slot || 1}.${suffix}.name_codes`] = Uint8Array.from(name.buffer);
      state.execution.status = 'called';
      state.domainResults.call = {kind: page === 'startup-load' ? 'new-game' : 'name-return', confirmed: true};
    }
  };
  const save = state => {
    state.execution.files = previewSaveFileOperation(state.execution.files,
      {operation: 'save', slot: state.selections.slot, from: state.context.slot}, byteMap);
    state.fields = previewSaveFileFields(state.execution.files, byteMap);
    state.execution.currentSlot = state.selections.slot;
    state.domainResults.file = {operation: 'save', slot: state.selections.slot, confirmed: true};
    state.node = 'saved'; state.selections.choice = 0;
  };
  return {
    initial({fields = {}, context = {}, files = [], currentSlot = null, node: entry = graph.entry} = {}) {
      const initial = interfacePreviewState({fields, context, node: entry, entry,
        selections: {choice: 0, slot: context.slot || 1},
        execution: {files: Uint8Array.from(files), currentSlot, status: 'waiting', name: null, trace: []}});
      if (page === 'name-entry') initial.execution.name = initialNameEntry(protocol, variant);
      if (page === 'ending-credits' && entry !== 'ending-retirement') {
        initial.execution.status = entry === 'ending-terminal' ? 'terminal' : 'called';
        if (entry !== 'ending-terminal') initial.domainResults.call = {kind: 'credits', confirmed: true};
      }
      return initial;
    },
    advance(previous, input) {
      const state = structuredClone(previous), type = typeof input === 'string' ? input : input.type;
      if (state.execution.status !== 'waiting') return state;
      state.execution.trace.push({node: state.node, input: structuredClone(input), evidence: EVIDENCE});
      if (state.node === 'ending-retirement' && ['up', 'down', 'left', 'right', 'a', 'b', 'start', 'select'].includes(type)) {
        state.execution.status = 'called'; state.domainResults.call = {kind: 'reset', confirmed: true}; return state;
      }
      if (state.execution.name) {
        state.execution.name = advanceNameEntry(state.execution.name, type, protocol); selectNode(state); return state;
      }
      if (type === 'slot') {state.selections.slot = input.slot; return state;}
      if (type === 'option') {state.selections.choice = input.index; return state;}
      if (['up', 'down', 'left', 'right'].includes(type)) {
        const value = state.selections.choice;
        state.selections.choice = state.node === 'files'
          ? type === 'up' ? value % 2 : type === 'down' ? value % 2 + 2
          : type === 'left' ? value & 2 : (value & 2) + 1
          : type === 'up' || type === 'left' ? 0 : 1;
        return state;
      }
      if (state.node === 'title' && ['a', 'start'].includes(type)) {
        if ([1, 2].some(slot => getSaveSlotStatus(state.execution.files, slot, byteMap).valid)) state.node = 'files';
        else {state.node = 'player-name'; state.execution.name = initialNameEntry(protocol, 'player-name');}
      } else if (state.node === 'files' && type === 'a') {
        const operation = ['load', 'clone', 'restart', 'delete'][state.selections.choice];
        state.execution.operation = operation;
        if (operation === 'restart') {
          state.domainResults.file = {operation, confirmed: true};
          state.node = 'player-name'; state.execution.name = initialNameEntry(protocol, 'player-name');
        }
        else {state.node = 'file-slot'; state.selections.choice = 0;}
      } else if (state.node === 'file-slot' && type === 'a') {
        const operation = state.execution.operation;
        state.selections.slot = state.selections.choice + 1;
        if (!status(state).valid) return state;
        else if (operation === 'load') {
          state.execution.currentSlot = state.selections.slot;
          state.domainResults.file = {operation, slot: state.selections.slot, confirmed: true};
          state.domainResults.call = {kind: 'load-game', slot: state.selections.slot, confirmed: true};
          state.execution.status = 'called'; state.node = 'game';
        } else {
          const from = state.selections.slot;
          const slot = operation === 'clone' ? 3 - from : from;
          state.execution.files = previewSaveFileOperation(state.execution.files, {operation, slot, from}, byteMap);
          state.fields = previewSaveFileFields(state.execution.files, byteMap);
          state.domainResults.file = {operation, from, slot, confirmed: true};
          state.node = 'files'; state.selections.choice = 0;
        }
      } else if (state.node === 'file-slot' && type === 'b') {state.node = 'files'; state.selections.choice = 0;}
      else if (state.node === 'save-prompt' && ['a', 'b'].includes(type)) {
        if (type === 'b' || state.selections.choice) state.execution.status = 'returned';
        else if (state.execution.currentSlot) {state.selections.slot = state.execution.currentSlot; save(state);}
        else {state.node = 'save-slot'; state.selections.choice = 0;}
      } else if (state.node === 'save-slot' && type === 'a') {
        state.selections.slot = state.selections.choice + 1;
        if (status(state).valid) {state.node = 'save-overwrite'; state.selections.choice = 0;}
        else save(state);
      } else if (state.node === 'save-overwrite' && type === 'a' && !state.selections.choice) save(state);
      else if (['save-slot', 'save-overwrite'].includes(state.node) && ['a', 'b'].includes(type)) state.execution.status = 'returned';
      else if (state.node === 'saved' && ['a', 'b'].includes(type)) state.node = 'save-continue';
      else if (state.node === 'save-continue' && ['a', 'b'].includes(type)) {
        if (type === 'a' && !state.selections.choice) state.execution.status = 'returned';
        else state.node = 'save-bed';
      } else if (state.node === 'save-bed' && ['a', 'b'].includes(type)) {
        state.execution.status = 'terminal';
        state.domainResults.call = {kind: 'power-off-prompt', confirmed: true};
      }
      return state;
    },
  };
}

// @editor-module 隐藏目的地、大门与存档事件位的往返链接。

const hex = value => Number(value).toString(16).toUpperCase().padStart(2, '0');
const link = (href, label) => `<a class="editor-inline-link" href="${esc(href)}">${esc(label)} ↗</a>`;

function hiddenTeleportConditionsMarkup(project) {
  const hidden = hiddenTeleportDestination(project);
  if (!hidden) return '';
  return `仅错误传送可达 · ${hidden.trigger_flags.map(flag => `${eventFlagReferenceMarkup(flag.id)} = ${flag.value}`).join(' 且 ')}
    <p>触发后 ${eventFlagReferenceMarkup(hidden.set_flag)} = 1；
    ${link(controllerSceneHref(hidden.gate.scene_id, project, {point: [hidden.gate.cells[0].x,
      hidden.gate.cells[0].y]}), '下方大门开放')}</p>`;
}

function hiddenTeleportSceneMarkup(sceneId, selection, project) {
  const hidden = hiddenTeleportDestination(project);
  if (!hidden) return '';
  if (Number(sceneId) !== hidden.scene_id) return '';
  return `<div data-hidden-teleport-source><p>${link('?view=teleport&facilityTab=config#hidden-teleport',
    '来源：时空隧道错误传送')}</p>
    ${hiddenTeleportConditionsMarkup(project)}
    <p>${link(controllerSceneHref(hidden.scene_id, project), `隐藏目的地 scene:${hex(hidden.scene_id)}`)}</p></div>`;
}

async function bindHiddenTeleportControls(root = document) {
  for (const host of root.querySelectorAll('[data-hidden-teleport-fields]')) {
    const object = (await db.getFieldObjects(HIDDEN_TELEPORT_RESOURCE_ID))[0];
    if (host.isConnected) await object.mount(host, {compactIdentity: true, stacked: true});
  }
}

export { bindControlledObjectUsers, bindHiddenTeleportControls, controlledObjectMarkup, controllerTargetsMarkup, createAudioTimelinePlayer, hiddenTeleportConditionsMarkup, hiddenTeleportSceneMarkup, sceneControllerMarkup, stopAudioTimelines, systemStateExecution, systemStateGraph };
