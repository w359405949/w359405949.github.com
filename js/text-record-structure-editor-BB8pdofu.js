import { paintMonsterFigureCanvases, registerModuleComponent, currentTextReference, monsterFigureCanvas, esc, uiPaintPattern } from './interface-state-preview-Dlotqlmn.js';
import { db, projectFieldDraftOrigin, textRecordStructureOwners, textRecordHandle, textRecordStructureFields, flushAllAutoSaves, TEXT_RECORD_UI_SCOPE, installTextRecordStructureValue } from './prg-loaders-DnCSmXk9.js';
import { registerReferenceFieldPresentation, hydrateReferenceFieldPickers, referenceFieldPickerMarkup, bindCanvasPickerPreview } from './timeline-player-YCH7Y-3h.js';
import { state } from './emulator-Bpa8EsFw.js';
import { dedicatedUiPageForScreen } from './editor-renderer-n2nBwXk_.js';
import { bindFieldResetToOriginalButtons, resetToOriginalButton } from './battle-result-script-runtime-BSeJpUGH.js';

// @editor-module 怪物 owner 的可嵌入封面

const MONSTER_MODULE_ID = "monster-profile";
const MONSTER_RESOURCE_ID = "monster-profile";

function referenceId(handle, value) {
  const named = String(handle || "").trim();
  const namedMatch = /^[a-z0-9._-]+:([0-9a-f]{1,4})$/iu.exec(named);
  if (namedMatch) return Number.parseInt(namedMatch[1], 16);
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 0 ? value : null;
  }
  const raw = String(value ?? "").trim();
  if (/^[0-9]+$/u.test(raw)) return Number(raw);
  const hex = /^(?:0x|\$)?([0-9a-f]*[a-f][0-9a-f]*)$/iu.exec(raw);
  return hex ? Number.parseInt(hex[1], 16) : null;
}

function monsterId(entry) {
  if (entry?.id === null || entry?.id === undefined || entry?.id === "") return null;
  const id = Number(entry.id);
  return Number.isInteger(id) && id >= 0 && id <= 0xff ? id : null;
}

function monsterIdHex(entry) {
  const id = monsterId(entry);
  return id === null ? "??" : id.toString(16).toUpperCase().padStart(2, "0");
}

function monsterNameRecord(entry) {
  const direct = String(entry?.name_reference?.node_id || "");
  if (/^record:[0-9a-f]{2}:[0-9]{3}$/iu.test(direct)) return direct;
  const record = Number(entry?.name_text_record_id);
  const region = Number.parseInt(String(entry?.name_text_region ?? "01"), 16);
  if (!Number.isInteger(record) || record < 0 || record > 999
      || !Number.isInteger(region) || region < 0 || region > 0xff) return "";
  const regionHex = region.toString(16).toUpperCase().padStart(2, "0");
  return `record:${regionHex}:${String(record).padStart(3, "0")}`;
}

function currentMonsterName(entry, fallback) {
  const record = monsterNameRecord(entry);
  return record ? currentTextReference(record).label || fallback : fallback;
}

function monsterStat(entry) {
  const values = [
    ["HP", entry?.hp?.value],
    ["攻", entry?.attack?.value],
    ["防", entry?.defense?.value],
    ["速", entry?.speed],
  ].filter(([, value]) => value !== null && value !== undefined && value !== "");
  return values.slice(0, 3).map(([label, value]) => `${label}${value}`).join(" · ");
}

function monsterPreviewMarkup({
  entry = null,
  handle = "",
  value = "",
  enemyId = null,
  graphicId = null,
  box = 64,
  componentAttributes = "",
  mode = "enemy",
} = {}) {
  const id = monsterId(entry) ?? referenceId(handle, value);
  const resolvedEnemy = enemyId ?? (mode === "enemy" ? id : null);
  const resolvedGraphic = graphicId ?? (mode === "graphic" ? id : null);
  const identity = String(handle || value || (id === null ? "—" : id));
  const fallback = String(entry?.name
    || (id === null ? "怪物" : `怪物 ${monsterIdHex({id})}`));
  const label = entry ? currentMonsterName(entry, fallback) : identity;
  return `<span class="monster-module-preview" ${componentAttributes}>
    ${id === null ? `<span class="resource-empty">怪物引用未解析</span>` : monsterFigureCanvas({
      enemyId: resolvedEnemy,
      graphicId: resolvedGraphic,
      box,
      className: "monster-module-preview-canvas",
      label,
    })}
    <small class="mono">${esc(entry ? `${label} · ${monsterStat(entry)}` : identity)}</small>
  </span>`;
}

function monsterReferenceItem(entry) {
  const id = monsterId(entry);
  if (id === null) return null;
  const idHex = monsterIdHex(entry);
  const fallback = String(entry?.name || `怪物 ${idHex}`);
  const name = currentMonsterName(entry, fallback);
  const stat = monsterStat(entry);
  const graphicId = Number(entry?.graphic_id);
  const description = Number.isInteger(graphicId)
    ? `图形 $${graphicId.toString(16).toUpperCase().padStart(2, "0")}` : "";
  return {
    value: String(id),
    label: `${idHex} · ${name}`,
    description,
    meta: stat,
    preview: monsterPreviewMarkup({entry, value: id, box: 52}),
    filter: [id, idHex, `0x${idHex}`, `$${idHex}`, `monster:${idHex}`,
      `monster-profile:${idHex}`, name, description, stat]
      .filter(Boolean).join(" ").toLowerCase(),
  };
}

function monsterRows(documentValue) {
  const records = documentValue?.records;
  if (!Array.isArray(records)) {
    throw new TypeError(`${MONSTER_RESOURCE_ID} 缺少 records 候选表`);
  }
  return records;
}

async function prepareMonsterComponent(props) {
  try {
    const documentValue = props.documentValue
      ?? await db.getResourceDocument(MONSTER_RESOURCE_ID, null);
    const entries = monsterRows(documentValue);
    const requestedId = monsterId(props.entry) ?? referenceId(props.handle, props.value);
    return {
      ...props,
      entries,
      entry: props.entry || entries.find(entry => monsterId(entry) === requestedId) || null,
      error: entries.length ? "" : "monster-profile 的静态候选值域为空",
    };
  } catch (error) {
    return {
      ...props,
      entries: [],
      error: `候选项不可用：${error?.message || error}`,
    };
  }
}

function monsterReferencePickerMarkup({
  entries = [],
  value = null,
  label = "怪物",
  controlMarkup = "",
  componentAttributes = "",
  error = "",
  emptyValue,
} = {}) {
  return referenceFieldPickerMarkup({
    reference: {
      module: MONSTER_MODULE_ID,
      ...(emptyValue === undefined ? {} : {
        key: ["id"],
        sentinels: [{value: emptyValue, label: "空", description: "数量 0", meta: ""}],
      }),
    },
    rows: entries,
    value,
    label,
    controlMarkup,
    componentAttributes,
    error,
  });
}

async function hydrateMonsterPreview(root = document) {
  await paintMonsterFigureCanvases(root);
}

/** 属性码的附加值与数值倍率由当前发布投影提供。 */
async function bindMonsterAttributeDetails(root, object) {
  const nodes = [...root.querySelectorAll('[data-monster-attribute-detail]')]
    .filter(node => !node.dataset.fieldMounted);
  if (!nodes.length) return;
  nodes.forEach(node => {node.dataset.fieldMounted = 'true';});
  let revision = 0;
  const refresh = async () => {
    const current = ++revision;
    const document = (await object.database.readResource(object.resourceId)).value.document;
    if (current !== revision || !root.isConnected) return;
    const record = document.records.find(row => Number(row.id) === object.fields[0].recordId);
    for (const node of nodes) {
      const name = node.dataset.monsterAttributeDetail;
      if (name === 'attack_code' || name === 'defense_code') {
        const stat = name === 'attack_code' ? 'attack' : 'defense';
        node.textContent = `附加值 ${record[`${stat}_aux`]} · ×${record[stat].multiplier}`;
      } else {
        node.textContent = `CODE 0x${Number(record[name].raw).toString(16).toUpperCase().padStart(2, '0')} × ${record[name].multiplier}`;
      }
    }
  };
  const errorNode = nodes[0];
  object.fields.forEach(field => field.bind(errorNode, (_target, _value, _field, reason) => {
    if (reason !== 'initial') void refresh().catch(error => {errorNode.textContent = error.message;});
  }));
  await refresh();
}

registerReferenceFieldPresentation(MONSTER_MODULE_ID, {
  item: monsterReferenceItem,
  paint: paintMonsterFigureCanvases,
  className: "monster-reference-field",
  filterLabel: "过滤怪物",
  filterPlaceholder: "ID／当前名称／图形／数值",
});

registerModuleComponent(MONSTER_MODULE_ID, "reference", {
  prepare: prepareMonsterComponent,
  render: monsterReferencePickerMarkup,
  hydrate: hydrateReferenceFieldPickers,
});

for (const kind of ["preview", "cover"]) {
  registerModuleComponent(MONSTER_MODULE_ID, kind, {
    prepare: prepareMonsterComponent,
    render: props => monsterPreviewMarkup({...props, mode: "enemy"}),
    hydrate: hydrateMonsterPreview,
  });
}

for (const moduleId of ["monster-figure", "monster-graphic"]) {
  for (const kind of ["preview", "cover"]) {
    registerModuleComponent(moduleId, kind, {
      render: props => monsterPreviewMarkup({...props, mode: "graphic"}),
      hydrate: hydrateMonsterPreview,
    });
  }
}

// @editor-module 文本字段对象在界面组件详情中提供定长结构控件与局部重置。

const hex = value => Number(value).toString(16).toUpperCase().padStart(2, '0');

function textRecordStructureEditorMarkup(id, document = state.project?.text_record_edits) {
  const origin = projectFieldDraftOrigin(document) || document;
  return textRecordStructureOwners(document, id, origin).map(owner => {
    const controls = `<section class="text-record-structure-editor" data-text-record-structure="${esc(owner)}"></section>`;
    return owner === id ? controls : `<details class="text-record-structure-reference" data-collapse-key="text-structure-reference:${esc(owner)}"><summary>引用记录 ${textRecordHandle(owner)}</summary>${controls}</details>`;
  }).join('');
}

function consumersMarkup(id) {
  const consumers = TEXT_RECORD_UI_SCOPE.get(id)?.consumers || [];
  return `<details class="text-record-structure-consumers" data-collapse-key="text-structure-consumers" open><summary>受影响的界面</summary>${consumers.map(id => { // structure-check-exempt 6: 合同要求文本字段对象在当前记录详情中列出字节影响面。
    const screen = state.project?.ui?.editor?.screens?.find(screen => screen.interface_state_id === id);
    const destination = dedicatedUiPageForScreen(screen || {interface_state_id: id, interface_id: id.split('.')[0]});
    if (!destination) return `<span>${esc(id)}</span>`;
    const query = new URLSearchParams({view: destination.view,
      ...(destination.interfacePage ? {interface: destination.interfacePage} : {}),
      ...(screen ? {interfaceScreen: screen.id} : {}),
      ...(destination.shopTab ? {shopTab: destination.shopTab} : {})});
    return `<a href="?${esc(query)}" title="${esc(id)}">${esc(screen?.label || id)} ↗</a>`;
  }).join('')}</details>`;
}

function controlMarkup(field, index) {
  const input = field.kind === 'reference'
    ? `<select data-text-structure-input="${index}">${field.allowed.map(id =>
      `<option value="${esc(id)}">${textRecordHandle(id)}</option>`).join('')}</select>`
    : field.kind === 'tile' ? `<button type="button" class="button ghost" data-text-structure-tile="${index}"
        aria-label="选择${esc(field.label)} ${hex(field.offset)}"><canvas width="8" height="8" data-text-structure-preview="${index}"></canvas><span data-text-structure-value="${index}"></span></button>`
      : `<input type="number" min="${field.min}" max="${field.max}" step="1" data-text-structure-input="${index}">`;
  return `<div class="text-record-structure-field"><label><span>${esc(field.label)} <small>+${hex(field.offset)}</small></span>${input}</label>${
    resetToOriginalButton(field.id, {title: '恢复此属性'})}</div>`;
}

async function mountTextRecordStructureEditor(host, object, {
  onSaved = () => {}, getRenderSources = async () => null,
} = {}) {
  const database = object.database;
  const field = object.fields.find(field => field.fieldName === 'bytes');
  const document = await database.getDocument('text-record');
  const origin = projectFieldDraftOrigin(document) || document;
  const fields = textRecordStructureFields(origin, object.id);
  if (!fields.length || !host.isConnected) return;
  host.innerHTML = `<div class="section-line"><h3>记录属性</h3><span>${textRecordHandle(object.id)}</span></div>
    <div class="text-record-structure-fields">${fields.map(controlMarkup).join('')}</div>
    ${fields.some(field => field.kind === 'tile') ? `<details class="fixed-tile-choice" data-text-structure-picker-panel><summary>选择图块</summary><div class="fixed-tile-choice-panel"><canvas width="128" height="128" data-text-structure-picker aria-label="图块图案表"></canvas></div></details>` : ''}
    <span data-text-structure-error role="alert"></span>${consumersMarkup(object.id)}`;
  const sources = fields.some(field => field.kind === 'tile') ? await getRenderSources() : null;
  if (!host.isConnected) return;
  const controls = fields.map((definition, index) => ({
    input: host.querySelector(`[data-text-structure-input="${index}"]`),
    label: host.querySelector(`[data-text-structure-value="${index}"]`),
    canvas: host.querySelector(`[data-text-structure-preview="${index}"]`),
  }));
  const resetButtons = new Map([...host.querySelectorAll('[data-reset-to-original]')]
    .map(button => [button.dataset.resetToOriginal, button]));
  let active = fields.findIndex(field => field.kind === 'tile');
  const showError = error => {host.querySelector('[data-text-structure-error]').textContent = error?.message || String(error);};
  const paintTile = (canvas, value) => {
    if (!canvas || !sources) return;
    const context = canvas.getContext('2d');
    const image = context.createImageData(8, 8);
    uiPaintPattern(image.data, 8, 8, sources.patterns, sources.corePatterns, value, 0, 0);
    context.putImageData(image, 0, 0);
  };
  const paintPicker = () => {
    const canvas = host.querySelector('[data-text-structure-picker]');
    if (!canvas || !sources || active < 0) return;
    const context = canvas.getContext('2d');
    const image = context.createImageData(128, 128);
    for (let tile = 0; tile < 256; tile += 1) {
      const x = tile % 16 * 8, y = Math.floor(tile / 16) * 8;
      uiPaintPattern(image.data, 128, 128, sources.patterns, sources.corePatterns, tile, x, y);
      if (!fields[active].allowed.includes(tile)) for (let row = y; row < y + 8; row += 1)
        for (let column = x; column < x + 8; column += 1) {
          const pixel = (row * 128 + column) * 4;
          for (let color = 0; color < 3; color += 1) image.data[pixel + color] *= 0.2;
        }
    }
    context.putImageData(image, 0, 0);
  };
  field.bind(host, (host, bytes) => {
    fields.forEach((definition, index) => {
      const {input, label, canvas} = controls[index];
      if (input) input.value = definition.kind === 'reference'
        ? `record:${hex(definition.region ?? bytes[definition.offset + 1])}:${String(bytes[definition.offset]).padStart(3, '0')}`
        : bytes[definition.offset];
      if (label) label.textContent = hex(bytes[definition.offset]);
      paintTile(canvas, bytes[definition.offset]);
    });
  });
  const saved = async () => {
    await onSaved({saved: await database.readResource('text-record')});
  };
  const save = async (index, value) => {
    const draft = structuredClone(await database.getDocument('text-record'));
    draft.records[object.id].bytes = [...field.value];
    const selection = installTextRecordStructureValue(draft, origin, object.id, fields[index].id, value);
    await field.set(draft.records[object.id].bytes, {selection: [selection]});
    host.querySelector('[data-text-structure-error]').textContent = '';
    await saved();
  };
  host.querySelectorAll('[data-text-structure-input]').forEach(input => input.addEventListener('change', () => {
    void save(Number(input.dataset.textStructureInput), input.value).catch(showError);
  }));
  fields.forEach(definition => {
    const button = resetButtons.get(definition.id);
    bindFieldResetToOriginalButtons(button.parentElement, new Map([[definition.id, field]]), {
      dirtyFor: field => field.value.slice(definition.offset, definition.offset + definition.length)
        .some((value, index) => value !== field.defaultValue[definition.offset + index]),
      beforeReset: async () => {await flushAllAutoSaves(); return {expectedVersion: field.version,
        fieldOptions: {selection: [{offset: definition.offset, length: definition.length}]}};},
      afterReset: saved, onError: showError,
    });
  });
  host.querySelectorAll('[data-text-structure-tile]').forEach(button => button.addEventListener('click', () => {
    active = Number(button.dataset.textStructureTile);
    host.querySelector('[data-text-structure-picker-panel]').open = true;
    host.querySelectorAll('[data-text-structure-tile]').forEach(button =>
      button.classList.toggle('is-active', Number(button.dataset.textStructureTile) === active));
    paintPicker();
  }));
  bindCanvasPickerPreview(host.querySelector('[data-text-structure-picker]'), {
    label: tile => `图块 ${hex(tile)}`,
    selected: () => field.value[fields[active].offset],
    allowed: tile => fields[active].allowed.includes(tile),
    onConfirm: async tile => {
      try {await save(active, tile);}
      catch (error) {showError(error); return false;}
    },
  });
  host.querySelector('[data-text-structure-picker-panel]')?.addEventListener('toggle', event => {
    if (event.currentTarget.open) paintPicker();
  });
  host.dataset.textStructureReady = 'true';
}

var textRecordStructureEditor = /*#__PURE__*/Object.freeze({
  __proto__: null,
  mountTextRecordStructureEditor: mountTextRecordStructureEditor,
  textRecordStructureEditorMarkup: textRecordStructureEditorMarkup
});

export { bindMonsterAttributeDetails, textRecordStructureEditor, textRecordStructureEditorMarkup };
