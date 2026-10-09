import { currentTextReference, esc, registerModuleComponent, resourcePhysicalAddressSummary, compactResourceAddress, physicalAddressLink, directPhysicalAddress } from './monster-figure-C07vG7yu.js';
import { HIDDEN_TELEPORT_RESOURCE_ID, db, loadByteMapSpace, WORLD_TIDE_OWNER, BOOTSTRAP_DIGEST_KEY, createStaticPackageBootstrapProvider } from './scene-actors-Cftr7mCE.js';
import { state } from './emulator-Bl-sLXnd.js';
import { storyViewForSequenceId, storyPageDefinitionForView, storySequencePreludeIdForView } from './baseline-assembly-C0KRII8X.js';

// @editor-module 错误传送与大门的已发布条件及预览。

function hiddenTeleportDestination(project) {
  return project?.facilities?.facilities?.find(row => row.id === 'teleport-terminal')
    ?.configuration?.hidden_destination || null;
}

async function prepareHiddenTeleportDestination(project) {
  const facility = project?.facilities?.facilities?.find(row => row.id === 'teleport-terminal');
  if (facility) facility.configuration.hidden_destination =
    await db.getResourceDocument(HIDDEN_TELEPORT_RESOURCE_ID, null);
}

function hiddenTeleportFlags(project) {
  const hidden = hiddenTeleportDestination(project);
  return hidden ? [...hidden.trigger_flags, {id: hidden.set_flag, value: 1, label: hidden.flag_label}] : [];
}

function hiddenTeleportGate(project) {
  const hidden = hiddenTeleportDestination(project);
  if (!hidden) return null;
  const gate = hidden.gate;
  return {
    key: HIDDEN_TELEPORT_RESOURCE_ID, object: null,
    scene_id: gate.scene_id, x: gate.cells[0].x, y: gate.cells[0].y,
    label: `scene:${gate.scene_id.toString(16).toUpperCase()} 下方大门`,
    appearance_condition: {
      label: '错误传送后下方大门开放',
      flags: [gate.event_flag], flag_labels: {[gate.event_flag]: hidden.flag_label},
      persistence: '置位开放，清位关闭，随存档保存。',
      triggers: [{flag: gate.event_flag, reference: HIDDEN_TELEPORT_RESOURCE_ID,
        label: '时空隧道错误传送', href: '?view=teleport&facilityTab=config#hidden-teleport'}],
      states: [
        {id: 'before', label: '关闭', cells: []},
        {id: 'after', label: '开放', cells: gate.cells},
      ],
      note: `地图格 ${gate.cells.map(cell => `(${cell.x},${cell.y}) → $${
        cell.metatile_id.toString(16).toUpperCase().padStart(2, '0')}`).join('、')}`,
      destination: {label: `隐藏目的地 scene:${hidden.scene_id.toString(16).toUpperCase()}`,
        scene_id: hidden.scene_id},
      sources: [gate.source],
    },
  };
}

// @editor-module 从符号表注释派生事件位用途。
const globalEventFlagHandle = id => `global-event-flag:${Number(id).toString(16).toUpperCase().padStart(2, '0')}`;

function globalEventFlagPurposes(annotations) {
  const labels = new Map(annotations.filter(row => row.binding?.slot === 1
    && Number.isInteger(row.binding.flag_id) && !/treasure/u.test(row.field_id || '')
    && row.semantic_status !== 'unproven' && !/查不实|未知|未确认/u.test(row.binding.label || ''))
    .map(row => [row.binding.flag_id, {label: row.binding.label,
      purposeTextReference: row.binding.purpose_text_reference}]));
  return Array.from({length: 256}, (_, id) => ({id, handle: globalEventFlagHandle(id),
    ...(labels.get(id) || {label: '未知用途'})}));
}

// @editor-module 全局事件位的句柄与已确认用途。
let entries = Array.from({length: 256}, (_, id) => ({id, handle: globalEventFlagHandle(id), label: '未知用途'}));

function globalEventFlagEntries() { return entries.map(row => globalEventFlagEntry(row.id)); }

function globalEventFlagEntry(value) {
  if (value === null || value === undefined || value === '') return null;
  const id = typeof value === 'string' && value.startsWith('global-event-flag:')
    ? Number.parseInt(value.split(':')[1], 16) : Number(value);
  if (!Number.isInteger(id) || id < 0 || id >= 256) return null;
  const row = entries[id];
  return row.purposeTextReference ? {...row,
    get label() {return `${row.label} · ${currentTextReference(row.purposeTextReference).label}`;}} : row;
}

async function prepareGlobalEventFlags() {
  const path = state.browserPackageManifest?.browser_prepared_inputs?.global_event_flags;
  if (path) {
    const document = await db.getPackageDocument(path, null, {readonly: true});
    entries = document.entries;
  } else {
    const document = await loadByteMapSpace('sram', {allPages: true});
    entries = globalEventFlagPurposes(document.annotations);
  }
  return globalEventFlagEntries();
}

// @editor-module 剧情执行链与存档事件位的双向引用投影。
const storiesByFlag = new WeakMap();

function storyEventReferences(sequenceId, story) {
  const sequence = story?.browser_vm?.sequences?.find(row => row.id === sequenceId);
  if (!sequence) return [];
  const lists = [...(story.browser_vm.variants || []),
    ...(story.browser_vm.continuation_actor_lists || []),
    ...(story.browser_vm.extended_actor_lists || []),
    ...(story.browser_vm.interaction_actor_lists || [])];
  const ids = new Set([...(sequence.variant_ids || []),
    ...(sequence.shots || []).map(row => row.variant_id)]);
  const selectedLists = lists.filter(row => ids.has(row.id));
  const autonomous = new Set(sequence.source_script_ids || []);
  for (const list of selectedLists) for (const actor of list.actors || []) {
    autonomous.add(actor.autonomous_script_id);
  }
  const interaction = new Set();
  if (sequence.interaction_trigger) interaction.add(sequence.interaction_trigger.script_id);
  for (const list of selectedLists) if (list.initial_state_source?.kind === "rom-interaction-script") {
    interaction.add(list.initial_state_source.script_id);
  }
  const references = new Map();
  for (const source of story.browser_vm.wait_state_model?.external_writers || []) {
    if (!ids.has(source.actor_list_id)) continue;
    if (!references.has(source.flag_id)) references.set(source.flag_id,
      {flag_id: source.flag_id, accesses: new Set(), sources: []});
    const row = references.get(source.flag_id);
    row.accesses.add("外部写入");
    row.sources.push(source);
  }
  for (const [kind, scripts] of [["autonomous", autonomous], ["interaction", interaction]]) {
    for (const script of story[kind]?.entries || []) {
      if (!scripts.has(script.id)) continue;
      for (const reference of script.state_references || []) {
        const flag = reference.flag_id;
        if (!references.has(flag)) references.set(flag, {flag_id: flag, accesses: new Set(), sources: []});
        const row = references.get(flag);
        row.accesses.add(reference.operation === "set-after-victory" ? "战斗胜利写入"
          : reference.access === "write" ? "写入" : "读取");
        row.sources.push({kind, script_id: script.id, ...reference});
      }
    }
  }
  const events = (story.browser_vm.entry_events || []).filter(row => row.sequence_id === sequenceId);
  for (const event of events) for (const flag of event.completion_flags || []) {
    if (!references.has(flag)) references.set(flag, {flag_id: flag, accesses: new Set(), sources: []});
    references.get(flag).completion = true;
    if ((event.victory_flags || []).includes(flag)) {
      references.get(flag).accesses.add("战斗胜利写入");
    }
  }
  for (const event of events) if (event.entry_music) {
    const flag = event.entry_music.flag_id;
    if (!references.has(flag)) references.set(flag, {flag_id: flag, accesses: new Set(), sources: []});
    const row = references.get(flag);
    row.accesses.add("读取（入口音乐）");
    row.sources.push({kind: "scene-entry-music", ...event.entry_music});
  }
  if (sequence.ending_animation) {
    const flags = new Set([sequence.ending_animation.audio?.event_flag,
      ...sequence.ending_animation.timeline.filter(stage => stage.conditional)
        .map(stage => stage.event_flag)].filter(Number.isInteger));
    for (const flag of flags) {
      if (!references.has(flag)) references.set(flag, {flag_id: flag, accesses: new Set(), sources: []});
      const row = references.get(flag);
      row.accesses.add("读取（结局分支）");
      row.sources.push({kind: "ending-machine-code", flag_id: flag,
        evidence: story.caller_audit?.ending_credits_runtime?.machine_loops});
    }
  }
  const transient = new Set(story.browser_vm.control_state_model?.scene_reload_cleared_event_flags || []);
  const preludeId = storySequencePreludeIdForView(storyViewForSequenceId(sequenceId));
  if (preludeId && preludeId !== sequenceId) {
    for (const reference of storyEventReferences(preludeId, story)) {
      if (!references.has(reference.flag_id)) references.set(reference.flag_id,
        {...reference, accesses: new Set(reference.accesses)});
      else {
        const target = references.get(reference.flag_id);
        reference.accesses.forEach(access => target.accesses.add(access));
        target.sources.push(...reference.sources);
        target.completion ||= reference.completion;
      }
    }
  }
  return [...references.values()].sort((a, b) => a.flag_id - b.flag_id).map(row => ({
    ...row, accesses: [...row.accesses], transient: transient.has(row.flag_id),
  }));
}

function storiesForEventFlag(flagId, story) {
  if (!story) return [];
  if (storiesByFlag.has(story)) return storiesByFlag.get(story).get(Number(flagId)) || [];
  const result = new Map();
  for (const sequence of story.browser_vm?.sequences || []) {
    const view = storyViewForSequenceId(sequence.id);
    if (!view) continue;
    for (const reference of storyEventReferences(sequence.id, story)) {
      if (!result.has(reference.flag_id)) result.set(reference.flag_id, []);
      result.get(reference.flag_id).push({...reference, sequence_id: sequence.id,
        label: storyPageDefinitionForView(view)?.title || sequence.label || sequence.id,
        href: `?view=${encodeURIComponent(view)}&storySequence=${encodeURIComponent(sequence.id)}&storyPaused=1`});
    }
  }
  for (const kind of ["autonomous", "interaction"]) {
    for (const script of story[kind]?.entries || []) {
      for (const reference of script.state_references || []) {
        const flag = reference.flag_id;
        if (!result.has(flag)) result.set(flag, []);
        const rows = result.get(flag);
        if (rows.some(row => row.sources?.some(source =>
          source.kind === kind && source.script_id === script.id))) continue;
        const scriptKey = `${kind}:${script.id}`;
        const existing = rows.find(row => row.script_key === scriptKey);
        const access = reference.operation === "set-after-victory" ? "战斗胜利写入"
          : reference.access === "write" ? "写入" : "读取";
        if (existing) {
          if (!existing.accesses.includes(access)) existing.accesses.push(access);
          continue;
        }
        const scenes = [...new Set((story.npc_catalog?.records || [])
          .filter(actor => actor[`${kind}_script`]?.id === script.id)
          .flatMap(actor => (actor.scenes || []).map(scene => scene.name)))];
        rows.push({flag_id: flag, script_key: scriptKey, accesses: [access],
          label: `${scenes.join("、") || "剧情"} · ${script.label || script.id_hex}`,
          href: `?view=actors&actorPart=story&storyKind=${kind}&record=${script.id}#story-script-field-object`});
      }
    }
  }
  storiesByFlag.set(story, result);
  return result.get(Number(flagId)) || [];
}

// @editor-module 按已确认的读写路径关联战斗入口与存档事件位。

const hexId = value => Number(value).toString(16).toUpperCase().padStart(2, "0");

function resolveBattleStateCatalog({review = {}, story = {}, actors = {}, zones = {}} = {}) {
  const wantedByFormation = new Map((review.formation_targets || [])
    .map(row => [row.formation_id, row.wanted_id]));
  const actorByUid = new Map((actors.records || []).map(row => [row.uid, row]));
  const entries = (story.world_event_triggers?.entries || []).map(row => ({
    id: `event:${hexId(row.scene_id)}:${hexId(row.id)}`,
    scene_id: row.scene_id, object_key: `event:${row.id}`, kind: "coordinate",
    x: row.trigger_x, y: row.trigger_y, formation_id: row.encounter_formation_id,
    victory_flag: row.event_flag, suppression_flag: row.event_flag, one_time: true,
    shadowed_by: (review.coordinate_exceptions || []).find(item => item.event_id === row.id)
      ?.shadowed_by_event_id ?? null,
  }));
  for (const battle of review.script_battles || []) {
    const users = (story.npc_catalog?.records || []).filter(actor =>
      actor[`${battle.kind}_script`]?.id === battle.script_id);
    for (const user of users) {
      const actor = actorByUid.get(user.uid);
      const contexts = user.scenes?.length ? user.scenes
        : (story.story_mode_contexts?.entries || [])
          .filter(row => row.scene_actor_entry === user.entry_id);
      for (const context of contexts) entries.push({
        ...battle, id: `${battle.kind}:${hexId(battle.script_id)}:${battle.cursor}:${user.uid}:${hexId(context.scene_id ?? context.id)}`,
        scene_id: context.scene_id ?? context.id, object_key: `actor:${user.record_id}`,
        actor_uid: user.uid, x: actor?.x ?? null, y: actor?.y ?? null,
      });
    }
  }
  for (const row of review.investigation_battles || []) entries.push({
    ...row, id: `${hexId(row.scene_id)}:${row.object_key}`, kind: "investigation",
  });
  const flagMap = review.wanted_targets || [];
  for (const zone of zones.zones || []) {
    if (!Number(zone.zone_id)) continue;
    for (const row of zone.entries || []) {
      if (row.empty || row.slot < 10) continue;
      const wanted = flagMap.find(target => target.defeat_flag === row.event_flag
        && target.wanted_id === Number(row.monster_id));
      if (!wanted) continue;
      const locations = [
        ...(zones.scene_zones?.assignments || []).filter(item => item.zone_id === zone.zone_id)
          .map(item => ({scene_id: item.scene_id, x: null, y: null})),
        ...(zones.world_grid?.blocks || []).filter(item => item.zone_id === zone.zone_id)
          .map(item => ({scene_id: 0, x: item.block_x, y: item.block_y})),
      ];
      for (const location of locations) entries.push({
        ...location, id: `zone:${hexId(zone.zone_id)}:${row.slot}:${hexId(location.scene_id)}:${location.x ?? ""},${location.y ?? ""}`,
        kind: "random", object_key: "", zone_id: zone.zone_id, slot: row.slot,
        ...(location.scene_id === 0 ? {block_cell_size: Number(zones.world_grid?.block_cell_size)} : {}),
        formation_id: Number(row.monster_id), wanted_id: wanted.wanted_id,
        victory_flag: wanted.defeat_flag, suppression_flag: wanted.defeat_flag, one_time: true,
      });
    }
  }
  return {
    wanted: flagMap,
    entries: [...new Map(entries.map(row => [row.id, row])).values()].map(row => ({...row,
      wanted_id: row.wanted_id ?? wantedByFormation.get(row.formation_id) ?? null})),
    formation_targets: review.formation_targets || [],
  };
}

function battleFlagSections(catalog) {
  const sections = new Map();
  for (const row of catalog.entries) {
    if (row.one_time && row.shadowed_by == null && row.suppression_flag != null)
      sections.set(row.suppression_flag, row.wanted_id == null ? "battles" : "wanted");
  }
  for (const row of catalog.wanted) {
    sections.set(row.defeat_flag, "wanted");
    sections.set(row.claim_flag, "wanted");
  }
  return sections;
}

function targetBattleState(catalog, targetId) {
  const canonical = catalog.formation_targets.find(row => row.formation_id === Number(targetId));
  const wanted = canonical ? catalog.wanted.find(row => row.wanted_id === canonical.wanted_id) : null;
  return {wanted, entries: catalog.entries.filter(row => wanted
    ? row.wanted_id === wanted.wanted_id : row.formation_id === Number(targetId))};
}

// @editor-module 存档事件字段的页面地址。


const SAVE_EVENT_SECTIONS = Object.freeze([
  ["vehicle-acquisition", "战车取得"],
  ["treasures", "调查物取得"],
  ["home-decor", "家庭装饰"],
  ["teleport", "时空隧道"],
  ["wanted", "赏金首"],
  ["battles", "一次性战斗"],
  ["global", "剧情与全局事件"],
  ["unknown", "未知用途"],
]);

// 引用图的 story-interaction-script 与 battle-result-script 声明事件位 $4C。
const FIXED_GLOBAL_FLAGS = [0x4C];
let referencedGlobalFlags = new Set(FIXED_GLOBAL_FLAGS);
let battleCatalog = resolveBattleStateCatalog();
let battleSections = new Map();
let hiddenFlags = new Set();
let acquisitionFlags = new Set();
function saveBattleCatalog() { return battleCatalog; }

async function prepareSaveEventLinks() {
  const [story, encounters, lifecycle, actors, zones, facilities, sceneLogic, tide, investigation] = await Promise.all([
    db.getDocument("project.story", null),
    db.getResourceDocument("encounter-event-flag-map", null),
    db.getResourceDocument("field-scene-lifecycle-service", null),
    db.getDocument("scene-actor", null),
    db.getDocument("scene-encounter-zone", null),
    db.getDocument("project.facilities", null),
    db.getDocument("project.scenes.logic", null),
    db.getResourceDocument(WORLD_TIDE_OWNER, null),
    db.getResourceDocument('nearby-object-investigation-service', null),
  ]);
  battleCatalog = resolveBattleStateCatalog({review: encounters?.battle_state_review,
    story: story || {}, actors: actors || {}, zones: zones || {}});
  battleSections = battleFlagSections(battleCatalog);
  const project = {facilities};
  await prepareHiddenTeleportDestination(project);
  hiddenFlags = new Set(hiddenTeleportFlags(project).map(flag => flag.id));
  acquisitionFlags = new Set((investigation?.reward_calls || []).flatMap(call =>
    call.acquisition_condition ? [Number.parseInt(call.acquisition_condition.flag_reference.split(':').at(-1), 16)] : []));
  referencedGlobalFlags = new Set([
    ...FIXED_GLOBAL_FLAGS,
    ...(sceneLogic?.point_transitions || []).flatMap(record => record.appearance_condition?.flags || []),
    ...(tide?.persistent ? [tide.event_flag] : []),
    ...(facilities?.facilities || []).filter(row => row.id === 'computer-controller')
      .flatMap(row => (row.instances || []).flatMap(instance => [instance.switch?.event_flag_reference,
        instance.switch?.failure_flag_reference].filter(Boolean).map(reference =>
        Number.parseInt(reference.split(':').at(-1), 16)))),
    ...(story?.world_event_triggers?.entries || []).map(row => Number(row.event_flag)),
    ...(story?.browser_vm?.entry_events || []).flatMap(row => row.completion_flags || []),
    ...(story?.browser_vm?.sequences || []).flatMap(sequence =>
      storyEventReferences(sequence.id, story).map(reference => reference.flag_id)),
    ...[...(story?.npc_catalog?.records || []), ...(story?.autonomous?.entries || []),
      ...(story?.interaction?.entries || [])].flatMap(row =>
      (row.state_references || []).map(reference => Number(reference.flag_id))),
    ...(encounters?.encounter_selector_to_global_event_flag || [])
      .map(row => Number(row.global_event_flag_id)),
    ...(lifecycle?.records || []).flatMap(row => {
      const match = /^global-event-flag:([0-9A-F]{2})$/i.exec(row.global_event_flag_reference || "");
      return match ? [parseInt(match[1], 16)] : [];
    }),
  ]);
}

function saveEventSection(flagId, {treasure = false} = {}) {
  const flag = Number(flagId);
  if (treasure) return flag === 0x51 ? "vehicle-acquisition" : flag < 0x5B ? "treasures" : "unknown";
  const purpose = globalEventFlagEntry(flag)?.label;
  if (purpose?.startsWith('已购装饰品')) return 'home-decor';
  if (/战车.*取得状态位/u.test(purpose || '')) return 'vehicle-acquisition';
  if (flag >= 8 && flag <= 15) return "vehicle-acquisition";
  if (acquisitionFlags.has(flag)) return 'treasures';
  if (flag >= 0x30 && flag <= 0x3B) return "teleport";
  if (hiddenFlags.has(flag)) return 'teleport';
  if (battleSections.has(flag)) return battleSections.get(flag);
  if (flag >= 0x60 && flag <= 0x6A) return "wanted";
  return referencedGlobalFlags.has(flag) || (purpose && purpose !== '未知用途') ? "global" : "unknown";
}

function saveEventHref(slot, flagId, {treasure = false} = {}) {
  const flag = Number(flagId);
  const section = saveEventSection(flag, {treasure});
  const anchor = `save-event-bit-${slot}-${treasure ? "treasure" : "global"}-${
    flag.toString(16).toUpperCase().padStart(2, "0")}`;
  return `?view=save${Number(slot) === 2 ? "&saveSlot=2" : ""}&saveSection=${
    treasure || ['vehicle-acquisition', 'home-decor', 'wanted'].includes(section) ? section : 'global'}#${anchor}`;
}

// @editor-module 全局事件位字段对象的只读引用显示。

function eventFlagReferenceMarkup(value, {slot = 1, attributes = '', link = true, compact = false, label = null} = {}) {
  const row = globalEventFlagEntry(value);
  if (!row) return '—';
  const identity = `<span class="record-handle" data-resource-handle="${row.handle}">${row.handle}</span>`;
  const content = label == null ? `${identity}${compact ? '' : ` · <span data-event-flag-purpose>${esc(row.label)}</span>`}`
    : `<span data-resource-handle="${row.handle}">${esc(label)}</span>`;
  const title = label == null ? compact ? row.label : null : `${row.handle} · ${row.label}`;
  const props = `data-event-flag-reference="${row.handle}"${title ? ` title="${esc(title)}"` : ''} ${attributes}`;
  return link ? `<a class="editor-inline-link" ${props} href="${esc(saveEventHref(slot, row.id))}">${content} ↗</a>`
    : `<span ${props}>${content}</span>`;
}

function eventFlagTextMarkup(text, {label = null} = {}) {
  const source = String(text || '').replace(/(?:0x|\$)([0-9A-F]{1,2})(?=\s*(?:读取|写入|修改)记录)/giu,
    (_, id) => `global-event-flag:${id.toUpperCase().padStart(2, '0')}`)
    .replace(/(?:全局事件\s*flag|全局事件位|事件位|global event flag|\bFLAG)\s*`?(?:0x|\$)([0-9A-F]{1,2})`?(?:\s*([-–])\s*`?\$([0-9A-F]{1,2})`?)?/giu,
    (_, first, separator, last) => `global-event-flag:${first.toUpperCase().padStart(2, '0')}${
      last ? `${separator}global-event-flag:${last.toUpperCase().padStart(2, '0')}` : ''}`);
  let result = '', cursor = 0;
  for (const match of source.matchAll(/global-event-flag:([0-9A-F]{2})\b/gu)) {
    result += esc(source.slice(cursor, match.index)) + eventFlagReferenceMarkup(match[0], {label});
    cursor = match.index + match[0].length;
  }
  return result + esc(source.slice(cursor));
}

registerModuleComponent('global-event-flag', 'reference', {
  prepare: async props => {await prepareGlobalEventFlags(); return props;},
  render: ({value, componentAttributes, slot, compact, label}) => eventFlagReferenceMarkup(value,
    {slot, attributes: componentAttributes, compact, label}),
});

// @editor-module 详情页共用的物理位置折叠区。


function physicalLocationMarkup({uid = null, rows = [], content = ""} = {}) {
  const entries = [...(uid
    ? resourcePhysicalAddressSummary(uid).ranges.map((address, index) => ({
      label: address.role || `片段 ${index + 1}`, address,
    })) : []), ...rows].map(row => {
      const source = row.address?.offset == null && row.address?.prg_offset != null
        ? {...row.address, space: row.address.space || "prg",
          offset: Number(row.address.prg_offset)} : row.address;
      return {...row, address: source};
    }).filter(row => row.address?.offset != null
      && Number.isInteger(Number(row.address.offset)));
  if (!entries.length) return "";
  const singleResource = uid && rows.length === 0 && entries.length === 1;
  return `<details class="physical-location" data-physical-location>
    <summary>物理位置</summary>
    <div class="table-wrap"><table><thead><tr><th>字段</th><th>地址</th><th>字节数</th></tr></thead>
      <tbody>${entries.map(row => `<tr><th>${esc(row.label || row.key || "片段")}</th>
        <td>${singleResource ? compactResourceAddress(uid)
          : row.address.prg_offset != null ? physicalAddressLink(row.address)
            : directPhysicalAddress(row.address)}</td>
        <td>${Number.isInteger(Number(row.length ?? row.address?.length))
          ? esc(String(row.length ?? row.address.length)) : "—"}</td></tr>`).join("")}</tbody>
    </table></div>${content}
  </details>`;
}

// @editor-module 加载 target 定义并只读检查各资源的写回能力。
// Read-only capability inspection follows the same target hydration as a build.

// Only package documents are cached, never Working values or inspection results.
// A new repository facade or package manifest starts a new session. Include the
// build identity and target declarations to also detect updates within a session.
const sessionTargets = new WeakMap();

async function loadSessionTargets(repository, packageManifest, manifest) {
  const session = repository || packageManifest;
  const identity = JSON.stringify([
    manifest[BOOTSTRAP_DIGEST_KEY], manifest.default_target, manifest.targets,
  ]);
  let cached = sessionTargets.get(session);
  if (!cached || cached.packageManifest !== packageManifest || cached.identity !== identity) {
    cached = {packageManifest, identity,
      pending: createStaticPackageBootstrapProvider({
        readJson: path => db.getPackageDocument(path),
      }).loadTargets(manifest)};
    sessionTargets.set(session, cached);
  }
  try {
    return await cached.pending;
  } catch (error) {
    // A failed fetch must remain retryable; don't evict a newer concurrent load.
    if (sessionTargets.get(session) === cached) sessionTargets.delete(session);
    throw error;
  }
}

async function loadWritebackCapabilities(repository, packageManifest) {
  try {
    const project = await repository?.getManifest?.();
    // Persisted build targets may predate the package opened by this session.
    // Reuse them only for that same build, or for a standalone imported project.
    const manifest = project?.default_target && (!packageManifest?.default_target ||
      (project[BOOTSTRAP_DIGEST_KEY] &&
        project[BOOTSTRAP_DIGEST_KEY] === packageManifest[BOOTSTRAP_DIGEST_KEY]))
      ? project : packageManifest;
    const targetId = manifest?.default_target;
    if (!targetId) throw new Error("当前项目没有构建目标");
    const targets = await loadSessionTargets(repository, packageManifest, manifest);
    const definition = targets[targetId];
    if (!definition) throw new Error(`缺少目标 ${targetId}`);
    const {inspectAssetWriteback} = await import('./asset-compiler-C7dKwwA7.js');
    const byResource = inspectAssetWriteback({targetProfileId: targetId,
      target: definition.profile, buildMap: definition.build_map, bindings: definition.bindings});
    return {targetId, byResource, error: ""};
  } catch (error) {
    // Keep drafts usable, but show the actual target error and never claim bound.
    return {targetId: null, byResource: new Map(), error: String(error?.message || error)};
  }
}

export { SAVE_EVENT_SECTIONS, eventFlagReferenceMarkup, eventFlagTextMarkup, globalEventFlagEntries, globalEventFlagEntry, globalEventFlagHandle, hiddenTeleportDestination, hiddenTeleportFlags, hiddenTeleportGate, loadWritebackCapabilities, physicalLocationMarkup, prepareGlobalEventFlags, prepareHiddenTeleportDestination, prepareSaveEventLinks, resolveBattleStateCatalog, saveBattleCatalog, saveEventHref, saveEventSection, storiesForEventFlag, storyEventReferences, targetBattleState };
