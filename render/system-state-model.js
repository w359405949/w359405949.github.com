// @editor-module 系统状态图保留文件、命名与结局的稳定等待点及领域交接。
import {interfacePreviewState} from './interface-state-preview.js';
import {initialNameEntry, advanceNameEntry} from '../core/ui-name-entry-owner.js';
import {getSaveSlotStatus, previewSaveFileOperation, previewSaveFileFields} from '../core/save-codec.js';

export const SYSTEM_STATE_PAGES = ['startup-load', 'save-management', 'name-entry', 'ending-credits'];
const EVIDENCE = 'project/evidence/system-state-machine/observations.json';
const node = (id, label, previewId, role = 'screen') => ({id, label, previewId, role});

export function systemStateGraph(page, previews, variant = 'player-name') {
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

export function systemStateExecution({page, graph, protocol, byteMap, variant = 'player-name'}) {
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
