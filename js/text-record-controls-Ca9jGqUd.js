import { projectFieldDraftRevision, projectStoryScriptPrograms, projectFieldDraftOrigin, textRecordComponents, decodeFixedTextRecord, decodeFixedTextRecordSelection, textRecordListReferenceChoices, textRecordEditorBytes, createTextRecordEncoding } from './prg-loaders-DnCSmXk9.js';
import { encounterCandidate } from './scene-encounter-probabilities-C0m_IdC-.js';
import { fixedTextEditorMarkup, bindFixedTextEditors } from './timeline-player-YCH7Y-3h.js';
import { state } from './emulator-Bpa8EsFw.js';
import { mountLinkedFieldChoice, mountFieldObjectEditor } from './field-object-editor-Blro4OF0.js';
import { resetToOriginalButton, bindFieldResetToOriginalButtons } from './battle-result-script-runtime-BSeJpUGH.js';
import { esc } from './interface-state-preview-Dlotqlmn.js';

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

// @editor-module 文字记录所属控件共用定长文字与脚本参数编辑器。

async function mountTextRecordControls(host, object, {onSaved = () => {}} = {}) {
  const database = object.database;
  let document = await database.getDocument('text-record');
  const href = `?${new URLSearchParams({view: 'text', textMode: 'records',
    textRegion: object.id.split(':')[1], textKind: 'all', textSearch: object.id})}`;
  const link = `<a class="editor-inline-link" data-scene-destination="${esc(href)}"
    href="${esc(href)}" title="${esc(object.id)}" aria-label="跳转到 ${esc(object.id)}">↗</a>`;
  const encoding = state.project?.text_record_encoding || createTextRecordEncoding(
    await database.getDocument('text.character-map'), await database.getDocument('project.text-catalog'),
    await database.getDocument('project.text-fonts'));
  if (!document.records[object.id]?.editable) {
    await mountFieldObjectEditor(host, object,
      {rowHandles: [object.id], compactIdentity: true, stacked: true});
    host.insertAdjacentHTML('afterbegin', fixedTextEditorMarkup({recordId: object.id,
      document, encoding, readonly: true}) + link);
    return;
  }
  const recordId = object.id;
  host.innerHTML = fixedTextEditorMarkup({recordId, document, encoding,
    label: recordId, compact: true, runtime: true});
  (host.querySelector('.fixed-text-editor-field') || host).insertAdjacentHTML('beforeend', link);
  const controller = bindFixedTextEditors(host, {database, getDocument: () => document,
    getEncoding: () => encoding, onSaved: async event => {
      document = event.saved.value.document;
      await onSaved(event);
    }});
  await controller.ready;
  host.dataset.fieldObjectReady = object.id;
}

async function mountTextRecordOrderControls(host, object, {group, recordContent = false,
  onSaved = () => {}, references = ''}) {
  const document = await object.database.getDocument('text-record');
  const origin = projectFieldDraftOrigin(document) || document;
  const record = origin.records[object.id];
  const encoding = state.project.text_record_encoding;
  if (record.byte_variants || record.list_order && record.list_order.group_id === group?.id) {
    const field = object.fields.find(field => field.fieldName === 'bytes');
    const choices = [{values: [[...field.value]], label: '当前内容'}];
    if (record.byte_variants) choices.push(...record.byte_variants.map(bytes => ({values: [bytes],
      label: `图块 ${bytes.slice(0, -1).map(value => value.toString(16).toUpperCase()).join(' ')}`})));
    else {
      const slots = record.list_order.slots;
      for (let first = 0; first < slots.length; first++) for (let second = first + 1; second < slots.length; second++) {
        const bytes = [...field.value];
        slots[first].offsets.forEach((offset, index) => {
          const other = slots[second].offsets[index];
          bytes[offset] = field.value[other]; bytes[other] = field.value[offset];
        });
        choices.push({values: [bytes], label: `${first + 1} ↔ ${second + 1}`});
      }
    }
    host.innerHTML = `<div data-text-list-order></div>${resetToOriginalButton(object.id)}${record.byte_variants
      ? '' : '<p>命令按选项序号执行。</p>'}${references}`;
    mountLinkedFieldChoice(host.querySelector('[data-text-list-order]'), object, ['bytes'], choices,
      {label: record.byte_variants ? '固定图块字样' : '图块顺序'});
    bindFieldResetToOriginalButtons(host, new Map([[object.id, field]]), {afterReset: onSaved});
    let ready = false;
    field.bind(host, () => {if (ready) void onSaved();});
    ready = true;
    return;
  }
  if (recordContent) {
    await mountTextRecordControls(host, object);
    const field = object.fields.find(field => field.fieldName === 'bytes');
    let ready = false;
    field.bind(host, () => {if (ready) void onSaved();});
    ready = true;
    return;
  }
  if (!record?.editable || group.record !== object.id || !encoding) return;
  const components = textRecordComponents(record, encoding);
  const lines = decodeFixedTextRecord(record, encoding).formatted_text.split('\n');
  const slots = group.choices.map(choice => components.find(component => component.kind === 'text'
    && (choice.visible_text || lines[choice.label_reference?.line] || '').trim().startsWith(component.text.trim())))
    .filter(Boolean);
  if (new Set(slots).size !== slots.length) return;
  const field = object.fields.find(field => field.fieldName === 'bytes');
  const current = {...origin, records: {...origin.records,
    [object.id]: {...record, bytes: [...field.value]}}};
  const labels = slots.map(slot => decodeFixedTextRecordSelection({...record,
    bytes: [...field.value]}, encoding, slot.ranges).text.trim());
  const choices = [{values: [[...field.value]], label: '当前顺序'}];
  if (group.id === 'commands:41-44') choices.push(...textRecordListReferenceChoices({...record,
    bytes: [...field.value]}, encoding, origin));
  for (let first = 0; first < slots.length; first++) for (let second = first + 1; second < slots.length; second++) {
    try {
      const one = textRecordEditorBytes(current, object.id, labels[second], encoding, slots[first].ranges);
      if (!one.ok) continue;
      const swapped = {...current, records: {...current.records,
        [object.id]: {...record, bytes: one.bytes}}};
      const two = textRecordEditorBytes(swapped, object.id, labels[first], encoding, slots[second].ranges);
      if (!two.ok) continue;
      choices.push({values: [two.bytes], label: `${first + 1} ↔ ${second + 1} · ${labels[first]} / ${labels[second]}`});
    } catch (_) {}
  }
  host.innerHTML = `<div data-text-list-order></div>${resetToOriginalButton(object.id)}<p>命令按选项序号执行。</p>${references}<div data-text-list-content></div>`;
  mountLinkedFieldChoice(host.querySelector('[data-text-list-order]'), object, ['bytes'], choices,
    {label: '文字顺序'});
  bindFieldResetToOriginalButtons(host, new Map([[object.id, field]]), {afterReset: onSaved});
  if (choices.length === 1 || slots.length !== group.choices.length)
    await mountTextRecordControls(host.querySelector('[data-text-list-content]'), object);
  let ready = false;
  field.bind(host, () => {if (ready) void onSaved();});
  ready = true;
}

var textRecordControls = /*#__PURE__*/Object.freeze({
  __proto__: null,
  mountTextRecordControls: mountTextRecordControls,
  mountTextRecordOrderControls: mountTextRecordOrderControls
});

export { FORMATION_GROUPS, formationGroup, formationUsage, textRecordControls };
