import { registerModuleComponent, esc, currentTextReference, storySceneActionPresentation, storySceneDialogueReferences, renderModuleComponent, recordUid } from './element-tree-DsgOBeTK.js';
import { db, projectStoryScriptPrograms, STORY_DIALOGUE_OPERATIONS } from './battle-result-script-runtime-B_EClFew.js';
import { registerReferenceFieldPresentation, hydrateReferenceFieldPickers, referenceFieldPickerMarkup, updateReferencePickerItem, updateReferencePickerItems } from './scene-elevators-N46oPTJC.js';
import './visual-metasprites-DJP54-bV.js';
import './emulator-DynsZsth.js';
import { serviceFamilyPage } from './story-event-links-CRjG_25M.js';
import { eventFlagReferenceMarkup } from './timeline-player-y3hI_sah.js';
import { loadCurrentTextRecordDisplays } from './charset-C-1TZfXo.js';
import './document-controls-CnG0ytdg.js';

// @editor-module encounter-formation owner 的候选与预览
//
// 编队候选固定来自 battle-test-point/formations。怪物显示名则按当前
// monster-profile -> text-record 正文现查；提取期 name hint 只在文字权威尚未载入时提示。


const ENCOUNTER_FORMATION_MODULE_ID = "encounter-formation";
const ENCOUNTER_FORMATION_RESOURCE_ID = "battle-test-point";
const MONSTER_RESOURCE_ID = "monster-profile";

function formationId(entry) {
  if (entry?.id === null || entry?.id === undefined || entry?.id === "") return null;
  const id = Number(entry.id);
  return Number.isInteger(id) && id >= 0 && id <= 0xff ? id : null;
}

function formationIdFromReference({entry = null, handle = "", value = ""} = {}) {
  const fromEntry = formationId(entry);
  if (fromEntry !== null) return fromEntry;
  const reference = String(handle || "").trim();
  const match = /^encounter-formation:([0-9a-f]{1,2})$/iu.exec(reference);
  if (match) return Number.parseInt(match[1], 16);
  return formationId({id: value});
}

function formationIdHex(entry) {
  const id = formationId(entry);
  return id === null ? "??" : id.toString(16).toUpperCase().padStart(2, "0");
}

function monsterNameRecord(entry) {
  const direct = String(entry?.name_reference?.node_id || "");
  if (/^record:[0-9a-f]{2}:[0-9]{3}$/iu.test(direct)) return direct;
  const id = Number(entry?.name_text_record_id);
  const region = Number.parseInt(String(entry?.name_text_region ?? "01"), 16);
  if (!Number.isInteger(id) || id < 0 || id > 999
      || !Number.isInteger(region) || region < 0 || region > 0xff) return "";
  const regionHex = region.toString(16).toUpperCase().padStart(2, "0");
  return `record:${regionHex}:${String(id).padStart(3, "0")}`;
}

function currentMonsterName(entry, fallback) {
  const record = monsterNameRecord(entry);
  return record ? currentTextReference(record).label || fallback : fallback;
}

function activeSlots(entry) {
  return (Array.isArray(entry?.slots) ? entry.slots : []).filter(slot =>
    Number(slot?.count) > 0);
}

function formationLabel(entry) {
  const slots = activeSlots(entry);
  if (!slots.length) return "空编队";
  return slots.map(slot => {
    const fallback = `怪物 $${Number(slot.monster_id).toString(16)
      .toUpperCase().padStart(2, "0")}`;
    return `${slot.current_name || slot.monster_name_hint || fallback}×${Number(slot.count)}`;
  }).join(" + ");
}

function formationStat(entry) {
  const count = activeSlots(entry).reduce((sum, slot) => sum + Number(slot.count), 0);
  const status = count > 9 ? "超出运行时 9 体上限" : "运行时上限内";
  return `${activeSlots(entry).length} 组 · ${count} 体 · ${status}`;
}

function encounterFormationPreviewMarkup({
  entry = null,
  handle = "",
  value = "",
  componentAttributes = "",
} = {}) {
  const id = formationIdFromReference({entry, handle, value});
  const resolved = entry || {};
  if (id === null) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>?</b><small>遭遇编队引用未解析</small></span>`;
  }
  return `<span class="module-reference-data-preview" ${componentAttributes}
    data-encounter-formation-id="${id}">
    <b>${esc(formationLabel(resolved))}</b>
    <small>${esc(formationStat(resolved))}</small>
  </span>`;
}

function encounterFormationReferenceItem(entry) {
  const id = formationId(entry);
  if (id === null) return null;
  const idHex = formationIdHex(entry);
  const label = formationLabel(entry);
  const stat = formationStat(entry);
  return {
    value: String(id),
    group: 'formation', groupLabel: '战斗编队',
    label: `${idHex} · ${label}`,
    description: stat,
    meta: `encounter-formation:${idHex}`,
    preview: encounterFormationPreviewMarkup({entry}),
    filter: [id, idHex, `0x${idHex}`, `$${idHex}`,
      `encounter-formation:${idHex}`, label, stat]
      .filter(Boolean).join(" ").toLowerCase(),
  };
}

function formationRows(documentValue) {
  const formations = documentValue?.formations;
  if (!Array.isArray(formations)) {
    throw new TypeError(`${ENCOUNTER_FORMATION_RESOURCE_ID} 缺少 formations 候选表`);
  }
  return formations;
}

function monsterRows(documentValue) {
  const records = documentValue?.records;
  return Array.isArray(records) ? records : [];
}

function enrichFormations(formations, monsters) {
  const monsterById = new Map(monsters.map(entry => [Number(entry.id), entry]));
  return formations.map(formation => ({
    ...formation,
    slots: (formation.slots || []).map(slot => {
      const monster = monsterById.get(Number(slot.monster_id));
      const monsterHex = Number(slot.monster_id).toString(16).toUpperCase().padStart(2, "0");
      const fallback = String(monster?.name || slot.monster_name_hint || `怪物 $${monsterHex}`);
      return {
        ...slot,
        current_name: monster ? currentMonsterName(monster, fallback) : fallback,
      };
    }),
  }));
}

async function prepareEncounterFormationComponent(props) {
  try {
    const [formationDocument, monsterDocument] = await Promise.all([
      db.getResourceDocument(ENCOUNTER_FORMATION_RESOURCE_ID, null),
      db.getResourceDocument(MONSTER_RESOURCE_ID, null),
    ]);
    const entries = enrichFormations(
      formationRows(formationDocument),
      monsterRows(monsterDocument),
    );
    const requestedId = formationIdFromReference(props);
    return {
      ...props,
      entries,
      entry: props.entry || entries.find(entry => formationId(entry) === requestedId) || null,
      formationDocument,
      monsterDocument,
      error: entries.length ? "" : "encounter-formation 的静态候选值域为空",
    };
  } catch (error) {
    return {
      ...props,
      entries: [],
      error: `候选项不可用：${error?.message || error}`,
    };
  }
}

function encounterFormationReferencePickerMarkup({
  entries = [],
  value = null,
  label = "遭遇编队",
  controlMarkup = "",
  componentAttributes = "",
  error = "",
  pending = false,
  picker = {},
} = {}) {
  return referenceFieldPickerMarkup({
    reference: {module: ENCOUNTER_FORMATION_MODULE_ID},
    picker,
    rows: entries,
    value,
    label,
    controlMarkup,
    componentAttributes,
    error,
    pending,
  });
}

async function hydrateEncounterFormationReference(root) {
  hydrateReferenceFieldPickers(root);
  const link = document.createElement('button');
  link.type = 'button';
  link.className = 'resource-inline-link';
  link.textContent = '编辑编队 ↗';
  const syncLink = () => {
    const id = formationIdFromReference({value: root.dataset.moduleReferenceValue});
    link.disabled = id === null;
    link.dataset.resourceTarget = `encounter-formation:${formationIdHex({id})}`;
  };
  syncLink();
  root.append(link);
  new MutationObserver(syncLink).observe(root, {
    attributes: true, attributeFilter: ['data-module-reference-value'],
  });
  const [resolved, monsters, fields] = await Promise.all([
    db.readResource(ENCOUNTER_FORMATION_RESOURCE_ID),
    db.getResourceDocument(MONSTER_RESOURCE_ID, null),
    db.getFields(ENCOUNTER_FORMATION_RESOURCE_ID),
  ]);
  const byHandle = new Map();
  const refresh = (target, formation) => updateReferencePickerItem(target,
    encounterFormationReferenceItem(enrichFormations([formation], monsterRows(monsters))[0]));
  for (const formation of formationRows(resolved.value.document)) {
    refresh(root, formation);
    for (let slot = 0; slot < 4; slot++)
      byHandle.set(`encounter-formation:${formationIdHex(formation)}:slot:${slot}`, formation);
  }
  for (const field of fields) {
    const formation = byHandle.get(field.entityHandle);
    if (formation) field.bind(root, (target, _value, _field, reason) => {
      if (reason !== "initial") refresh(target, formation);
    });
  }
}

registerReferenceFieldPresentation(ENCOUNTER_FORMATION_MODULE_ID, {
  item: encounterFormationReferenceItem,
  className: "encounter-formation-reference-field",
  filterLabel: "过滤遭遇编队",
  filterPlaceholder: "编队 ID／怪物名称／数量",
});

for (const kind of ["preview", "cover"]) {
  registerModuleComponent(ENCOUNTER_FORMATION_MODULE_ID, kind, {
    prepare: prepareEncounterFormationComponent,
    render: encounterFormationPreviewMarkup,
  });
}

registerModuleComponent(ENCOUNTER_FORMATION_MODULE_ID, "reference", {
  prepare: prepareEncounterFormationComponent,
  render: encounterFormationReferencePickerMarkup,
  hydrate: hydrateEncounterFormationReference,
});

// @editor-module 交互绑定按记录句柄定位内容编辑页面。

function interactionEditorHref(handle, argument = 0) {
  const parts = handle.split(':');
  const params = new URLSearchParams({resource: handle});
  if (parts[0] === 'record') {
    params.set('view', 'text');
    params.set('textMode', 'records');
    params.set('textRegion', parts[1]);
    params.set('textKind', 'all');
    params.set('textSearch', handle);
  } else if (['story-interaction-script', 'story-autonomous-script'].includes(parts[0])) {
    params.set('view', 'actors');
    params.set('actorPart', 'story');
    params.set('storyKind', parts[0] === 'story-interaction-script' ? 'interaction' : 'autonomous');
    params.set('record', String(Number.parseInt(parts.at(-1), 16)));
    return `?${params}#story-script-field-object`;
  } else if (parts[0] === 'application-command') {
    const command = Number.parseInt(parts[1], 16);
    const page = serviceFamilyPage(command);
    if (page) return `?${new URLSearchParams({...page.route, resource: handle,
      ...(page.route.view === 'shops' ? {shopConfig: argument} : {}),
      ...(page.route.view === 'vending' ? {vendingConfig: argument} : {}),
      ...(page.route.view === 'jukebox' ? {jukeboxConfig: argument} : {}),
      previewCommand: command, previewArgument: argument})}`;
    params.set('view', 'interfaceui');
    params.set('interface', 'interaction-service');
    params.set('record', String(argument));
  } else return '';
  return `?${params}`;
}

function interactionEditorLink(href, label = '编辑交互内容') {
  return href ? `<a class="editor-inline-link" data-interaction-editor-link href="${esc(href)}" aria-label="${esc(label)}" title="${esc(label)}">↗</a>` : '';
}

// @editor-module 剧情详情与选择器共用当前指令投影。

async function paintStoryReferenceDetails(host) {
  await loadCurrentTextRecordDisplays(host);
}

async function prepareStoryReferenceDetails(document, kind, entries, currentPrograms = null, textDisplays = null) {
  return db.reusePreviewProjection('story-reference-details', [document, kind, entries, currentPrograms, textDisplays],
    () => buildStoryReferenceDetails(document, kind, entries, currentPrograms, textDisplays),
    {sources: [{kind: 'field', id: 'text-record'}]});
}

async function buildStoryReferenceDetails(document, kind, entries, currentPrograms, textDisplays) {
  const story = db.peekDocument('project.story', null) || await db.getDocument('project.story');
  const published = (story.browser_vm?.programs || []).filter(program => program.kind === kind);
  const missing = (story[kind]?.entries || []).filter(entry => entry.path
    && !published.some(program => Number(program.id) === Number(entry.id)));
  const programs = [...published, ...(await Promise.all(missing.map(entry =>
    db.getPackageDocument(`game/story/${entry.path}`, null)))).filter(Boolean)];
  const projected = currentPrograms || (document.layout ? projectStoryScriptPrograms(document, programs) : programs);
  const semantics = new Map(story.browser_vm.opcode_semantics.map(row =>
    [row.opcode, {...row, ...STORY_DIALOGUE_OPERATIONS[row.opcode]}]));
  return entries.map(entry => {
    const program = projected.find(program => Number(program.id) === Number(entry.id));
    const dialogues = [];
    const actionLabels = [];
    const actions = (program?.commands || []).map(command => {
      const semantic = semantics.get(command.opcode);
      if (!semantic) {
        const label = command.name || command.opcode_hex;
        actionLabels.push(label);
        return `<li>${esc(label)}</li>`;
      }
      const operands = command.currentOperands || command.operands || [];
      const ui = semantic.record_operand_index == null ? null : {
        region_id: semantic.region_id,
        record_operand_index: semantic.record_operand_index,
      };
      const action = {command: {...command, blocking_ui: command.blocking_ui || ui},
        semantic, operation: semantic.operation, operands};
      const service = semantic.operation === 'dispatch-interaction-service' && command.interaction_service;
      if (service) dialogues.push({
        application: {command: operands[semantic.region_operand_index],
          instance: operands[semantic.record_operand_index]}, operation: action.operation,
      });
      const presentation = storySceneActionPresentation(action);
      const conditional = semantic.operation === 'start-event-selected-dialogue';
      actionLabels.push(conditional ? '条件文字' : presentation?.label || command.name || semantic.operation);
      const references = service ? [] : conditional ? [
        {regionId: semantic.region_id, recordId: operands[semantic.set_record_operand_index], label: '事件位已设置'},
        {regionId: semantic.region_id, recordId: operands[semantic.clear_record_operand_index], label: '事件位未设置'},
      ] : storySceneDialogueReferences(action);
      const text = references.map(({regionId, recordId, label}) => {
        if (!Number.isInteger(regionId) || !Number.isInteger(recordId)) return '';
        dialogues.push({record: `record:${regionId.toString(16).toUpperCase().padStart(2, '0')}:${String(recordId).padStart(3, '0')}`,
          label, operation: action.operation, interactionWindow: true});
        const preview = renderModuleComponent('text-record', 'preview', {
          value: `record:${regionId.toString(16).toUpperCase().padStart(2, '0')}:${String(recordId).padStart(3, '0')}`,
          displayText: textDisplays?.get(`record:${regionId.toString(16).toUpperCase().padStart(2, '0')}:${String(recordId).padStart(3, '0')}`)});
        return `${label ? `<p>${esc(label)}</p>` : ''}${preview}`;
      }).join('');
      return `<li>${[
        esc(conditional ? '条件文字' : presentation?.label || command.name || semantic.operation),
        conditional ? eventFlagReferenceMarkup(operands[semantic.flag_operand_index]) : esc(presentation?.value || ''),
        ...(presentation?.operands || []).map(({label, index, eventFlag}) => eventFlag
          ? eventFlagReferenceMarkup(operands[index]) : esc(`${label} ${operands[index]}`)),
      ].filter(Boolean).join(' · ')}${text}</li>`;
    });
    const summary = [...new Set(actionLabels)].slice(0, 3).join(' · ') || '无动作';
    const firstText = dialogues.find(dialogue => dialogue.record)?.record;
    const text = firstText ? textDisplays?.get(firstText) || currentTextReference(firstText).label : '';
    const excerpt = text.length > 80 ? `${text.slice(0, 80)}…` : text;
    const pickerDetails = `<p>${esc(summary)}</p>${excerpt ? `<p>${esc(excerpt)}</p>` : ''}`;
    return {...entry, dialogues, pickerDetails,
      details: actions.length ? `<ol>${actions.join('')}</ol>` : '无动作'};
  });
}

// @editor-module story-autonomous-script owner 的 169 项脚本候选与流摘要

const AUTONOMOUS_MODULE_ID = "story-autonomous-script";

function scriptId$1(value) {
  const result = Number(value?.id ?? value);
  return Number.isInteger(result) && result >= 0 && result <= 0xa8 ? result : null;
}

function idHex$1(value) {
  const id = scriptId$1(value);
  return id === null ? "??" : id.toString(16).toUpperCase().padStart(2, "0");
}

function idFromReference({entry = null, handle = "", value = ""} = {}) {
  const direct = scriptId$1(entry);
  if (direct !== null) return direct;
  const match = /^(?:story:autonomous|story-autonomous-script):([0-9a-f]{1,2})$/iu.exec(
    String(handle || "").trim());
  return match ? Number.parseInt(match[1], 16) : scriptId$1(value);
}

function bytecode(entry) {
  return Array.isArray(entry?.bytecode) ? entry.bytecode : [];
}

function scriptSummary(entry) {
  const bytes = bytecode(entry);
  if (!bytes.length) return "空动作";
  const tail = Number(bytes.at(-1));
  return `${bytes.length} B · 末字节 $${tail.toString(16).toUpperCase().padStart(2, "0")}`;
}

function bytecodeLead(entry) {
  const bytes = bytecode(entry);
  return bytes.slice(0, 8).map(value => Number(value).toString(16)
    .toUpperCase().padStart(2, "0")).join(" ") + (bytes.length > 8 ? " …" : "");
}

function scriptLabel(entry) {
  return String(entry?.label || `自动动作 ${idHex$1(entry)}`);
}

function autonomousPreviewMarkup({
  entry = null, handle = "", value = "", componentAttributes = "",
} = {}) {
  const id = idFromReference({entry, handle, value});
  if (id === null) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>?</b><small>自动行动脚本引用未解析</small></span>`;
  }
  const resolved = entry || {id};
  return `<span class="module-reference-data-preview" ${componentAttributes}>
    <b>${esc(scriptLabel(resolved))}</b><small>自主动作</small>
  </span>`;
}

function autonomousReferenceItem(entry) {
  const id = scriptId$1(entry);
  if (id === null) return null;
  const hex = idHex$1(id);
  const label = scriptLabel(entry);
  const summary = scriptSummary(entry);
  const lead = bytecodeLead(entry);
  return {
    value: String(id),
    group: 'autonomous', groupLabel: '自主动作',
    label,
    description: '自主动作',
    meta: recordUid(`${AUTONOMOUS_MODULE_ID}:script`, id),
    preview: autonomousPreviewMarkup({entry}),
    details: `${entry.pickerDetails || ''}${interactionEditorLink(interactionEditorHref(recordUid(`${AUTONOMOUS_MODULE_ID}:script`, id)))}`,
    filter: [id, hex, `story:autonomous:${hex}`, `story-autonomous-script:${hex}`,
      label, summary, lead].filter(Boolean).join(" ").toLowerCase(),
  };
}

async function prepareAutonomousComponent(props) {
  try {
    const documentValue = db.peekResourceDocument(AUTONOMOUS_MODULE_ID, null)
      || await db.getResourceDocument(AUTONOMOUS_MODULE_ID, null);
    let entries = documentValue?.scripts;
    if (!Array.isArray(entries)) {
      throw new TypeError(`${AUTONOMOUS_MODULE_ID} 缺少 scripts 候选表`);
    }
    entries = await prepareStoryReferenceDetails(documentValue, 'autonomous', entries);
    const requestedId = idFromReference(props);
    return {
      ...props,
      entries,
      entry: props.entry || entries.find(entry => scriptId$1(entry) === requestedId) || null,
      error: entries.length ? "" : `${AUTONOMOUS_MODULE_ID} 的静态候选值域为空`,
    };
  } catch (error) {
    return {...props, entries: [], error: `候选项不可用：${error?.message || error}`};
  }
}

function autonomousReferencePickerMarkup({
  entries = [], value = null, label = "自动行动脚本", controlMarkup = "",
  componentAttributes = "", error = "", picker = {},
} = {}) {
  return referenceFieldPickerMarkup({
    reference: {module: AUTONOMOUS_MODULE_ID},
    picker,
    rows: entries,
    value,
    label,
    controlMarkup,
    componentAttributes,
    error,
  });
}

registerReferenceFieldPresentation(AUTONOMOUS_MODULE_ID, {
  item: autonomousReferenceItem,
  paint: paintStoryReferenceDetails,
  className: "autonomous-reference-field",
  filterLabel: "过滤自动行动脚本",
  filterPlaceholder: "ID／脚本名称／长度／起始字节",
});

async function hydrateAutonomousReferences(root) {
  if (root.classList.contains('reference-detail-field')) {
    const prepared = await prepareAutonomousComponent({});
    if (prepared.error) throw new TypeError(prepared.error);
    updateReferencePickerItems(root, prepared.entries.map(autonomousReferenceItem), prepared.entries);
  }
  hydrateReferenceFieldPickers(root);
}

registerModuleComponent(AUTONOMOUS_MODULE_ID, "reference", {
  prepare: prepareAutonomousComponent,
  render: autonomousReferencePickerMarkup,
  hydrate: hydrateAutonomousReferences,
});

for (const kind of ["preview", "cover"]) {
  registerModuleComponent(AUTONOMOUS_MODULE_ID, kind, {
    prepare: prepareAutonomousComponent,
    render: autonomousPreviewMarkup,
  });
}

// @editor-module story-interaction-script owner 的精确引用供给
//
// 108 项候选固定来自 story-interaction-script 正文。引用卡只展示 owner 发布的标签与
// 稳定资源身份；opcode 流保持不透明，不在消费页另造一份剧情解释器。


const INTERACTION_MODULE_ID = "story-interaction-script";
const EXPECTED_SCHEMA = "metalmaxcn.story.asset.interaction";
const EXPECTED_SCRIPTS = 108;

function scriptId(value) {
  const number = Number(value?.id ?? value);
  return Number.isInteger(number) && number >= 1 && number <= EXPECTED_SCRIPTS
    ? number : null;
}

function idHex(value) {
  const id = scriptId(value);
  return id === null ? "??" : id.toString(16).toUpperCase().padStart(2, "0");
}

function normalizeResourceId(value) {
  const match = /^story-interaction-script\.script\.([0-9a-f]{2})$/iu.exec(
    String(value || "").trim(),
  );
  if (!match) return "";
  const id = scriptId(Number.parseInt(match[1], 16));
  return id === null ? "" : `story-interaction-script.script.${idHex(id)}`;
}

function requestedId({entry = null, handle = "", value = ""} = {}) {
  const direct = scriptId(entry);
  if (direct !== null) return direct;
  const resourceId = normalizeResourceId(handle || value);
  return resourceId ? Number.parseInt(resourceId.split(".").at(-1), 16) : scriptId(value);
}

function valueAtPath(value, path = []) {
  let current = value;
  for (const segment of path) {
    if (current === null || typeof current !== "object"
        || !Object.hasOwn(current, segment)) return undefined;
    current = current[segment];
  }
  return current;
}

function declaredText(entry, path) {
  if (!Array.isArray(path)) return "";
  const value = valueAtPath(entry, path);
  return value === null || value === undefined ? "" : String(value);
}

function interactionPreviewMarkup({
  entry = null, handle = "", value = "", componentAttributes = "", error = "",
} = {}) {
  const id = requestedId({entry, handle, value});
  if (id === null || error) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>交互动作 ?</b><small>${esc(error || "交互动作脚本引用未解析")}</small>
    </span>`;
  }
  return `<span class="module-reference-data-preview" ${componentAttributes}>
    <b>交互 ${idHex(id)}</b><small>场景交互</small>
  </span>`;
}

function interactionReferenceItem(entry, reference = null) {
  const id = scriptId(entry);
  const resourceId = normalizeResourceId(entry?.resource_id);
  const label = String(entry?.label || "").trim();
  if (id === null || !resourceId || !label) return null;
  return {
    value: declaredText(entry, reference?.key) || String(id),
    group: 'interaction', groupLabel: '交互动作',
    label,
    description: "场景角色交互流程",
    meta: recordUid(`${INTERACTION_MODULE_ID}:script`, id),
    preview: interactionPreviewMarkup({entry}),
    details: `${entry.pickerDetails || ''}${interactionEditorLink(interactionEditorHref(recordUid(`${INTERACTION_MODULE_ID}:script`, id)))}`,
    filter: [id, idHex(id), label, resourceId, "场景角色交互流程"]
      .join(" ").toLowerCase(),
  };
}

function validateEntries(documentValue) {
  const scripts = documentValue?.scripts;
  if (documentValue?.schema !== EXPECTED_SCHEMA
      || Number(documentValue?.first_valid_id) !== 1
      || Number(documentValue?.pointer_count) !== EXPECTED_SCRIPTS + 1
      || !Array.isArray(scripts) || scripts.length !== EXPECTED_SCRIPTS) {
    throw new TypeError(`${INTERACTION_MODULE_ID} 必须发布 ${EXPECTED_SCRIPTS} 项脚本候选`);
  }
  const entries = scripts.map(script => {
    const id = scriptId(script);
    const resourceId = normalizeResourceId(script?.resource_id);
    const label = String(script?.label || "").trim();
    if (id === null || resourceId !== `story-interaction-script.script.${idHex(id)}`
        || !label || !Array.isArray(script?.bytecode)) {
      throw new TypeError(`${script?.resource_id || INTERACTION_MODULE_ID} 脚本候选无效`);
    }
    return {id, resource_id: resourceId, label};
  });
  if (new Set(entries.map(entry => entry.id)).size !== entries.length
      || new Set(entries.map(entry => entry.resource_id)).size !== entries.length) {
    throw new TypeError(`${INTERACTION_MODULE_ID} 的候选身份重复`);
  }
  return entries;
}

async function prepareInteractionComponent(props) {
  try {
    const document = db.peekResourceDocument(INTERACTION_MODULE_ID, null)
      || await db.getResourceDocument(INTERACTION_MODULE_ID, null);
    const entries = await prepareStoryReferenceDetails(document, 'interaction', validateEntries(document));
    const requested = requestedId(props);
    return {
      ...props,
      entries,
      entry: props.entry || entries.find(entry => entry.id === requested) || null,
      error: "",
    };
  } catch (error) {
    return {...props, entries: [], error: `候选项不可用：${error?.message || error}`};
  }
}

function interactionReferencePickerMarkup({
  entries = [], value = null, label = "交互动作脚本", controlMarkup = "",
  componentAttributes = "", error = "", reference = null, picker = {},
} = {}) {
  return referenceFieldPickerMarkup({
    reference: reference || {module: INTERACTION_MODULE_ID, key: ["id"]},
    picker,
    rows: entries,
    value,
    label,
    controlMarkup,
    componentAttributes,
    error,
  });
}

registerReferenceFieldPresentation(INTERACTION_MODULE_ID, {
  item: interactionReferenceItem,
  paint: paintStoryReferenceDetails,
  className: "interaction-script-reference-field",
  filterLabel: "过滤交互动作脚本",
  filterPlaceholder: "ID／脚本名称／资源身份",
});

async function hydrateInteractionReferences(root) {
  if (root.classList.contains('reference-detail-field')) {
    const prepared = await prepareInteractionComponent({});
    if (prepared.error) throw new TypeError(prepared.error);
    updateReferencePickerItems(root, prepared.entries.map(interactionReferenceItem), prepared.entries);
  }
  hydrateReferenceFieldPickers(root);
}

registerModuleComponent(INTERACTION_MODULE_ID, "reference", {
  prepare: prepareInteractionComponent,
  render: interactionReferencePickerMarkup,
  hydrate: hydrateInteractionReferences,
});

for (const kind of ["preview", "cover"]) {
  registerModuleComponent(INTERACTION_MODULE_ID, kind, {
    prepare: prepareInteractionComponent,
    render: interactionPreviewMarkup,
  });
}

export { interactionEditorHref, interactionEditorLink, paintStoryReferenceDetails, prepareStoryReferenceDetails };
