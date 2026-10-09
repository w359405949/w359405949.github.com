import { recordUid, paintAttackVisualCanvases, setWeaponEffectPreviewPlayback, esc, attackVisualCanvas, renderModuleComponent, hydrateModuleComponents, writeAccessMarker, prepareModuleComponent, bindTextInputEvents, resourceLabel, syncModuleComponents, currentTextReference, moduleComponentDefinition, expandResourceByteRangeSlots, physicalLocationMarkup, showEditorError } from './element-tree-DsgOBeTK.js';
import { resetToOriginalButton, applyResetToOriginalStates, bindFieldResetToOriginalButtons, fixedTextFieldInputMarkup, dataTable, setStatus } from './pattern-pixel-editor-B8puYQ8A.js';
import { hex, resolveCandidateChoices, db, candidateRows, readCandidateDocument, atPath, candidateValueOf, candidateLabelOf, decodeFixedRuntimeText, trackAutoSavePreparation, autoSaveErrorOf, ITEM_CATEGORIES, fixedRuntimeTextBytes, fieldOwner } from './battle-result-script-runtime-B_EClFew.js';
import { editorLog } from './visual-metasprites-DJP54-bV.js';
import { state } from './emulator-DynsZsth.js';
import { hydrateItemPickers, setChrContextTileReferences, configureChrContextTileSelector, itemPickerFieldMarkup } from './attack-chr-tile-selector-DxIfuyLU.js';
import { bindPickerPreview, openPickerSurface, pickerVisibleOptions, closePickerSurface, markPickerSelection, configureAnimatedResourcePicker, setReferencePickerValue, bindReferencePicker, prepareReferenceFieldPresentation, referencePickerMarkup, referenceFieldCurrentLabel, setReferencePickerEmpty } from './scene-elevators-N46oPTJC.js';
import { loadWorldMetatileRenderer, loadSceneMetatileRenderer, worldZoneAt, handleMarkup } from './preview-DMSrQMyk.js';
import { nesColorGrid, nesColorCss, paletteSwatches } from './record-BUqGpJTU.js';
import { scenePositionPickerMarkup, hydrateScenePositionPicker, syncScenePositionPicker, scenePositionInputId } from './components-DqADvo3I.js';
import './text-record-structure-editor-nkc-6gHL.js';

// @editor-module 场景字段对象共用的 16×16 元图块选择器。
const views = new WeakMap();

function copyCanvas(source) {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  canvas.getContext('2d').drawImage(source, 0, 0);
  return canvas;
}

function paintCurrent(element) {
  const view = views.get(element);
  if (!view) return;
  const target = element.querySelector('[data-scene-metatile-current]');
  if (target) {
    target.replaceChildren();
    const image = view.images[view.value];
    if (image) target.append(copyCanvas(image));
    else target.textContent = `当前值 ${view.value}（不在已发布候选里）`;
  }
  const label = element.querySelector('[data-scene-metatile-value]');
  if (label) label.textContent = `$${Number(view.value).toString(16).toUpperCase().padStart(2, '0')}`;
  markPickerSelection([...element.querySelectorAll('[data-scene-metatile-id]')],
    view.value, button => button.dataset.sceneMetatileId);
}

function setSceneMetatileValue(element, value) {
  const view = views.get(element);
  if (!view) return;
  view.value = Number(value);
  paintCurrent(element);
}

function configureSceneMetatileSelector(element, {images, value, onSelect = null, presentation = 'picker'}) {
  if (!Array.isArray(images) || !images.length || images.some(image => !image?.matches?.('canvas')))
    throw new TypeError('场景元图块候选必须是已渲染的画布');
  if (onSelect !== null && typeof onSelect !== 'function')
    throw new TypeError('元图块选值回调必须是函数');
  if (!['picker', 'list'].includes(presentation))
    throw new TypeError('元图块候选显示方式无效');
  views.set(element, {images, value: Number(value), onSelect});
  element.classList.toggle('scene-metatile-list', presentation === 'list');
  const candidatesMarkup = '<div class="scene-metatile-candidates" role="listbox" aria-label="地图图块"></div>';
  element.innerHTML = presentation === 'list' ? candidatesMarkup
    : `<button type="button" class="button ghost scene-metatile-current" data-scene-metatile-open
    aria-label="选择元图块"><span data-scene-metatile-current></span><code data-scene-metatile-value></code></button>
    <dialog class="animated-resource-dialog scene-metatile-dialog">
      <form class="animated-resource-toolbar" method="dialog"><b>选择 16×16 元图块</b>
        <input type="search" data-scene-metatile-search aria-label="搜索元图块编号" placeholder="编号">
        <button class="button ghost" type="submit" value="cancel">关闭</button></form>
      ${candidatesMarkup}
    </dialog>`;
  paintCurrent(element);
  const dialog = element.querySelector('dialog');
  const candidates = element.querySelector('.scene-metatile-candidates');
  const commit = button => {
    const selected = Number(button.dataset.sceneMetatileId);
    const view = views.get(element);
    const changed = selected !== view.value;
    setSceneMetatileValue(element, selected);
    view.onSelect?.(selected);
    if (changed) element.dispatchEvent(new CustomEvent('change', {bubbles: true, detail: {value: selected}}));
  };
  const showPreview = dialog && bindPickerPreview(candidates, {selector: '[data-scene-metatile-id]',
    selected: () => candidates.querySelector(`[data-scene-metatile-id="${views.get(element).value}"]`),
    onConfirm: commit, render: button => {
    const preview = document.createElement('div');
    const label = document.createElement('b');
    label.textContent = button.textContent;
    preview.append(label, copyCanvas(images[Number(button.dataset.sceneMetatileId)]));
    return preview;
  }});
  const mountCandidates = () => {
    if (!candidates.childElementCount) {
      images.forEach((image, id) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'button ghost';
        button.dataset.sceneMetatileId = String(id);
        button.setAttribute('role', 'option');
        const label = `元图块 $${id.toString(16).toUpperCase().padStart(2, '0')}`;
        button.setAttribute('aria-label', label);
        button.title = label;
        button.append(copyCanvas(image), document.createTextNode(`$${id.toString(16).toUpperCase().padStart(2, '0')}`));
        candidates.append(button);
      });
    }
    paintCurrent(element);
  };
  if (!dialog) mountCandidates();
  element.querySelector('[data-scene-metatile-open]')?.addEventListener('click', () => {
    mountCandidates();
    element.querySelector('[data-scene-metatile-search]').value = '';
    candidates.querySelectorAll('[data-scene-metatile-id]').forEach(button => {button.hidden = false;});
    openPickerSurface(dialog, {filter: element.querySelector('[data-scene-metatile-search]'),
      selected: candidates.querySelector('[aria-selected="true"]')});
  });
  element.querySelector('[data-scene-metatile-search]')?.addEventListener('input', event => {
    const options = [...candidates.querySelectorAll('[data-scene-metatile-id]')];
    const {visible} = pickerVisibleOptions(options, {query: event.target.value,
      searchText: button => {
        const id = Number(button.dataset.sceneMetatileId);
        const hex = id.toString(16).padStart(2, '0');
        return `${id} ${hex} $${hex} 0x${hex}`;
      }, group: () => ''});
    options.forEach(button => {button.hidden = !visible.has(button);});
    void showPreview(options.find(button => visible.has(button) && button.getAttribute('aria-selected') === 'true')
      || options.find(button => visible.has(button)));
  });
  candidates.addEventListener('click', event => {
    if (dialog) return;
    const button = event.target.closest('[data-scene-metatile-id]');
    if (!button) return;
    commit(button);
  });
  dialog?.addEventListener('click', event => {
    if (event.target === dialog) closePickerSurface(dialog);
  });
}

// @editor-module 攻击视效选择器共用候选、名称与预览。


const ATTACK_VISUAL_MODULE_ID = "attack-visual";

/** 视效目录只取发布数据。 */
function attackVisualAssets() {
  return state.project?.visuals?.weapon_effect_catalog?.asset_catalog_data || {};
}

function attackVisualCatalog() {
  const clean = attackVisualAssets().clean_animations || {};
  return clean.catalog || clean.clips || [];
}

/** 条目正文取发布名称，缺名称时保留句柄。 */
function attackVisualOptionLabel(clip) {
  return String(clip.display_name || clip.stable_name
    || recordUid(ATTACK_VISUAL_MODULE_ID, Number(clip.visual_code)));
}

function attackVisualPickerOption(clip) {
  const code = Number(clip.visual_code);
  return {
    value: String(code),
    // 句柄优先取发布目录。
    handle: clip.handle || recordUid(ATTACK_VISUAL_MODULE_ID, code),
    label: attackVisualOptionLabel(clip),
    searchText: `${code} ${hex(code, 2)}`,
    clip,
  };
}

function attackVisualPickerPreview(option) {
  const clip = option?.clip;
  const code = Number(option?.value);
  if (!clip || clip.preview_status === "opaque-preserved-not-rendered") {
    return `<span class="resource-empty">${esc(
      recordUid(ATTACK_VISUAL_MODULE_ID, code))} · 不透明槽不可预览</span>`;
  }
  return attackVisualCanvas({
    visualCode: code,
    play: true,
    segment: "full",
    className: "equipment-attack-visual-canvas",
    label: recordUid(ATTACK_VISUAL_MODULE_ID, code),
  });
}

/** 候选未显式指定时取完整发布目录。 */
function configureAttackVisualPicker(
  picker,
  {value, options = null, preview = true} = {},
) {
  configureAnimatedResourcePicker(picker, {
    options: options || attackVisualCatalog().map(attackVisualPickerOption),
    value: value === null || value === undefined ? "" : String(value),
    // 只读总表关闭预览，不装载战斗图形运行时。
    renderPreview: preview ? attackVisualPickerPreview : null,
    paintPreview: preview
      ? root => paintAttackVisualCanvases(root, attackVisualAssets()) : null,
    setPreviewActive: preview ? setWeaponEffectPreviewPlayback : null,
  });
}

// @editor-module 共用带标签的位掩码勾选结构。

function labeledBitmaskMarkup({
  choices = [], active = () => false, inputAttributes = () => "",
  rootAttributes = "", className = "equipment-inline-roles",
} = {}) {
  return `<span class="${esc(className)}" data-labeled-bitmask ${rootAttributes}>${
    choices.map((choice, index) => `<label class="${esc(choice.className || "")}">
      <input type="checkbox" value="${esc(choice.value)}" ${inputAttributes(choice, index)}
        ${active(choice, index) ? "checked" : ""}><span>${esc(choice.label)}</span>
    </label>`).join("")
  }</span>`;
}

// @editor-module 页面嵌入字段对象的控件，控件共用自动保存与重置。

const controllers = new WeakMap();
const mountedControls = new WeakMap();
// 元素行共用一个字段：防抖窗口内的连笔编辑要在同一份待写值上累加。
const pendingFieldValues = new WeakMap();
const fieldKey = field => JSON.stringify([field.entityHandle, field.fieldName]);
const displayKey = (resource, handle, name) => JSON.stringify([resource, handle, name]);
const SEMANTIC_KINDS = new Set(["reference", "coordinate", "fixed-scene-coordinate", "scene-actor-coordinate", "image", "palette-index", "palette-array",
  "text-record", "value-dispatch-reference", "fixed-text", "bit-labels", "command-stream", "dimension", "raw-bytes"]);

function semanticKind(column) {
  const kind = column.semantic?.kind;
  if (kind !== undefined && !SEMANTIC_KINDS.has(kind))
    throw new TypeError(`${column.label} 语义类别无效：${kind}`);
  if ((kind === 'reference' || kind === 'text-record')
      && (!column.semantic.targetModule || !column.candidates))
    throw new TypeError(`${column.label} 缺少引用目标或候选`);
  if (kind === 'text-record' && (!Number.isInteger(column.semantic.region)
      || column.semantic.region < 0 || column.semantic.region > 255))
    throw new TypeError(`${column.label} 文字记录区域无效`);
  if (kind === 'value-dispatch-reference' && (!column.semantic.targetModule || !column.candidates
      || typeof column.semantic.relatedField !== 'string'
      || !Array.isArray(column.semantic.references) || !column.semantic.references.length))
    throw new TypeError(`${column.label} 按值分流引用声明无效`);
  if (kind === 'fixed-text' && (!Number.isInteger(column.semantic.source?.length)
      || column.semantic.source.length < 1
      || !['embedded', 'runtime-appended'].includes(column.semantic.source.terminator_mode)))
    throw new TypeError(`${column.label} 定长文字来源无效`);
  if (kind === 'coordinate' && ['scene', 'x', 'y'].some(part =>
    typeof column.semantic.fields?.[part] !== 'string'))
    throw new TypeError(`${column.label} 坐标组字段无效`);
  if (kind === 'fixed-scene-coordinate' && (!(Number.isInteger(column.semantic.sceneId)
      || column.semantic.sceneFromHandle === 'scene-actor-entry')
      || ['x', 'y'].some(part => typeof column.semantic.fields?.[part] !== 'string')))
    throw new TypeError(`${column.label} 固定场景坐标声明无效`);
  if (kind === 'scene-actor-coordinate' && (column.semantic.sceneFromHandle !== 'scene-actor-entry'
      || !column.semantic.previewScenesByEntry
      || ['x', 'y'].some(part => typeof column.semantic.fields?.[part] !== 'string')))
    throw new TypeError(`${column.label} 场景角色坐标声明无效`);
  if (kind === 'image' && !column.tile && !column.metatile)
    throw new TypeError(`${column.label} 缺少图像上下文`);
  if (kind === 'bit-labels' && !column.bits)
    throw new TypeError(`${column.label} 缺少位标签`);
  if (kind === 'command-stream' && !column.commands)
    throw new TypeError(`${column.label} 缺少命令流声明`);
  if (kind === 'dimension' && (typeof column.semantic.unit !== 'string'
      || !Number.isInteger(column.min) || !Number.isInteger(column.max)))
    throw new TypeError(`${column.label} 尺寸单位或范围无效`);
  if (kind === 'raw-bytes' && !(column.matrix
    ? Number.isInteger(column.matrix.rows) && column.matrix.rows > 0
      && Number.isInteger(column.matrix.width) && column.matrix.width > 0
    : column.array && Number.isInteger(column.length) && column.length > 0
      && column.min === 0 && column.max === 255))
    throw new TypeError(`${column.label} 原始字节声明无效`);
  if (kind === 'palette-array' && (column.semantic.palette !== 'nes'
      || !column.array || !Number.isInteger(column.length) || column.length < 1
      || column.min !== 0 || column.max !== 255))
    throw new TypeError(`${column.label} 调色板数组声明无效`);
  return kind;
}

function columnFieldNames(column) {
  if (column.linked) return column.linked.fields;
  if (column.semantic?.kind === 'coordinate'
      && column.name === column.semantic.fields.scene)
    return Object.values(column.semantic.fields);
  if (isHandleSceneCoordinate(column)
      && column.name === column.semantic.fields.x)
    return Object.values(column.semantic.fields);
  return [column.name];
}

function claimedByPage(object, handle, column, claims) {
  return columnFieldNames(column).every(name =>
    claims.has(displayKey(object.resourceId, handle, name)));
}

function isHandleSceneCoordinate(column) {
  return ['fixed-scene-coordinate', 'scene-actor-coordinate'].includes(column.semantic?.kind);
}

function editorColumnLabel(column) {
  const kind = column.semantic?.kind;
  if (!['coordinate', 'fixed-scene-coordinate', 'scene-actor-coordinate'].includes(kind)) return column.label;
  if (column.name !== column.semantic.fields[kind === 'coordinate' ? 'scene' : 'x']) return column.label;
  if (/^X(?:\s*坐标)?$/u.test(column.label)) return '场景位置';
  return column.label.replace(/(?:场景|\s*X)$/u, '位置');
}

function visibleEditorColumns(object, rowHandles, claims) {
  const columns = object.definition.editor.columns;
  const rows = object.definition.editor.rows.filter(row =>
    !rowHandles || rowHandles.includes(rowHandle(row)));
  const represented = new Map();
  const axisNames = new Set();
  for (const column of columns) {
    const kind = semanticKind(column);
    if (!((kind === 'coordinate' && column.name === column.semantic.fields.scene)
        || (isHandleSceneCoordinate(column) && column.name === column.semantic.fields.x))) continue;
    for (const axis of kind === 'coordinate' ? ['x', 'y'] : ['y']) {
      const name = column.semantic.fields[axis];
      axisNames.add(name);
      if (!columns.some(candidate => candidate.name === name))
        throw new TypeError(`${column.label} 坐标组缺少 ${axis.toUpperCase()} 列`);
      for (const row of rows) {
        if (rowElement(row) !== null) continue;
        const handle = rowHandle(row);
        if (isHandleSceneCoordinate(column) && fixedSceneId(column, handle) === null) continue;
        const parts = Object.values(column.semantic.fields).map(fieldName =>
          object.fields.find(field => field.entityHandle === handle && field.fieldName === fieldName));
        if (parts.every(field => field && !field.readOnly) && !column.readOnly) {
          if (!represented.has(handle)) represented.set(handle, new Set());
          represented.get(handle).add(name);
        }
      }
    }
  }
  const visible = columns.filter(column => rows.some(row => {
    const handle = rowHandle(row);
    if (axisNames.has(column.name) && represented.get(handle)?.has(column.name)) return false;
    if (claimedByPage(object, handle, column, claims)) return false;
    const field = object.fields.find(item => item.entityHandle === handle && item.fieldName === column.name);
    return Boolean(field || column.linked);
  }));
  return {visible, represented};
}

function fixedTextProjection(column, rawHex) {
  return decodeFixedRuntimeText({...column.semantic.source, raw_hex: rawHex},
    state.project?.text_record_encoding).text;
}

function fixedTextValue(column, text, rawHex) {
  const source = {...column.semantic.source, raw_hex: rawHex};
  const normalized = String(text).trimEnd();
  if (normalized === fixedTextProjection(column, rawHex)) return rawHex;
  const encoded = fixedRuntimeTextBytes(normalized, source,
    state.project?.text_record_encoding);
  if (!encoded.ok) throw new TypeError(`${encoded.reason}${encoded.unsupported?.length
    ? `：${encoded.unsupported.join(' ')}` : ''}`);
  return encoded.raw_hex;
}
function recordMountedControls(host, object, fields, control = null) {
  mountedControls.set(host, {object, fields: [...fields], control});
  host.dataset.fieldObjectMounted = '1';
}

function fixedSceneId(column, handle) {
  if (Number.isInteger(column.semantic.sceneId)) return column.semantic.sceneId;
  if (column.semantic.sceneFromHandle === 'scene-actor-entry') {
    const match = /^scene-actor:([0-9a-f]{2}):[0-9a-f]{2}$/iu.exec(handle);
    const id = match ? Number.parseInt(match[1], 16) : null;
    if (id !== null && id < 0xf0) return id;
    if (column.semantic.kind === 'scene-actor-coordinate')
      return column.semantic.previewScenesByEntry[id] ?? null;
  }
  return null;
}

function isPreviewScene(column, handle) {
  const match = /^scene-actor:([0-9a-f]{2}):[0-9a-f]{2}$/iu.exec(handle);
  return column.semantic?.kind === 'scene-actor-coordinate'
    && match && Number.parseInt(match[1], 16) >= 0xf0;
}

function mountedControlIndex(host, object) {
  const fields = new Map(), linked = new Map(), coordinates = new Set(), rawMatrices = new Set();
  for (const root of host.querySelectorAll('[data-field-object-coordinate]')) {
    const [handle, name] = JSON.parse(root.dataset.fieldObjectCoordinate);
    const column = object.definition.editor.columns.find(item => item.name === name);
    if (column) for (const fieldName of Object.values(column.semantic.fields))
      coordinates.add(JSON.stringify([handle, fieldName]));
  }
  for (const root of host.querySelectorAll('[data-field-object-raw-matrix]'))
    rawMatrices.add(root.dataset.fieldObjectRawMatrix);
  for (const node of host.querySelectorAll(
    '[data-field-object-field], [data-field-object-linked], [data-field-object-element], [data-field-object-bitmask], [data-field-object-command], [data-field-object-coordinate], [data-field-object-tile], [data-field-object-metatile], [data-field-object-palette], [data-field-object-attack-visual]')) {
    if (node.dataset.fieldObjectAttackVisual) {
      const [handle, name] = JSON.parse(node.dataset.fieldObjectAttackVisual);
      fields.set(JSON.stringify([handle, name]), node);
    }
    if (node.dataset.fieldObjectField) fields.set(node.dataset.fieldObjectField, node);
    if (node.dataset.fieldObjectMetatile) fields.set(node.dataset.fieldObjectMetatile, node);
    if (node.dataset.fieldObjectBitmask) fields.set(node.dataset.fieldObjectBitmask, node);
    if (node.dataset.fieldObjectCommand) fields.set(node.dataset.fieldObjectCommand, node);
    if (node.dataset.fieldObjectTile) fields.set(node.dataset.fieldObjectTile, node);
    if (node.dataset.fieldObjectPalette) fields.set(node.dataset.fieldObjectPalette, node);
    if (node.dataset.fieldObjectCoordinate) {
      const [handle, name] = JSON.parse(node.dataset.fieldObjectCoordinate);
      const column = object.definition.editor.columns.find(item => item.name === name);
      for (const fieldName of Object.values(column.semantic.fields))
        fields.set(JSON.stringify([handle, fieldName]), node);
    }
    if (node.dataset.fieldObjectLinked) {
      const [handle, name] = JSON.parse(node.dataset.fieldObjectLinked);
      linked.set(JSON.stringify([handle, name]), node);
    }
    if (node.dataset.fieldObjectElement) {
      const [handle, name] = JSON.parse(node.dataset.fieldObjectElement);
      fields.set(JSON.stringify([handle, name]), node);
    }
  }
  return {fields, linked, coordinates, rawMatrices,
    component: host.querySelector('[data-module-component-module][data-module-component-kind]')};
}

function mountedControlType(index, field, column, fallback) {
  if (fallback) return fallback;
  if (index.coordinates.has(fieldKey(field))) return 'scene-position-picker';
  if (index.rawMatrices.has(fieldKey(field))) return 'byte-preview-editor';
  const control = index.fields.get(fieldKey(field)) || (column?.linked
    ? index.linked.get(JSON.stringify([field.entityHandle, column.name])) : null);
  if (!control) {
    if (index.component) return `module-${index.component.dataset.moduleComponentKind}`;
    return field.readOnly ? 'readonly-value' : 'unresolved-control';
  }
  if (control.matches('[data-field-object-coordinate]')) return 'scene-position-picker';
  if (control.matches('[data-field-object-attack-visual]')) return 'animated-resource-picker';
  if (control.matches('[data-field-object-palette]')) return 'palette-index';
  if (control.matches('[data-field-object-metatile]')) return 'scene-metatile-selector';
  if (control.matches('[data-field-object-tile]')) return 'chr-tile-selector';
  if (control.matches('[data-field-object-bitmask]')) return 'labeled-bitmask';
  if (control.matches('[data-field-object-fixed-text]')) return 'fixed-text-editor';
  const parent = control.parentElement;
  if (control.matches('[data-field-object-command]')) return 'command-editor';
  if (control.matches('[data-field-object-raw-bytes]')) return 'byte-preview-editor';
  if (control.matches('[data-field-object-palette-array]')) return 'palette-array-editor';
  if (control.closest('[data-module-reference-picker]')) return 'module-reference';
  if (control.closest('[data-module-component-kind="reference"]')) return 'module-reference';
  if (control.closest('.field-object-text-record')) return 'module-preview';
  if (parent?.querySelector('attack-chr-tile-selector')) return 'chr-tile-selector';
  if (parent?.querySelector('animated-resource-picker')) return 'animated-resource-picker';
  return control.tagName.toLowerCase() === 'input' ? `input:${control.type}`
    : control.tagName.toLowerCase();
}

/** Read-only evidence for controls that have actually mounted in this DOM subtree. */
function mountedFieldControls(root = document) {
  const hosts = [...root.querySelectorAll('[data-field-object-mounted]')];
  if (root.matches?.('[data-field-object-mounted]')) hosts.unshift(root);
  return hosts.flatMap(host => {
    const record = mountedControls.get(host);
    if (!record) return [];
    const {object, fields, control} = record;
    const index = mountedControlIndex(host, object);
    return fields.map(field => {
      const column = object.definition.editor?.columns?.find(item =>
        item.name === field.fieldName || item.linked?.fields?.includes(field.fieldName));
      return {
        resource: field.resourceId, field_name: field.fieldName,
        entity_handle: field.entityHandle, object_id: object.id,
        label: column?.label ?? field.fieldName,
        column: column ? {
          name: column.name, label: column.label, unit: column.unit,
          reference: column.reference, candidates: column.candidates,
          bits: column.bits, tile: Boolean(column.tile), metatile: Boolean(column.metatile),
          boolean: Boolean(column.boolean),
          text: Boolean(column.text), array: Boolean(column.array), matrix: Boolean(column.matrix),
          commands: Boolean(column.commands), linked: column.linked?.fields,
          min: column.min, max: column.max, semantic: column.semantic,
        } : null,
        references: field.serialization?.references ?? null,
        value_type: Array.isArray(field.value) ? 'array' : typeof field.value,
        control: mountedControlType(index, field, column, control),
      };
    });
  });
}

// 数组字段的一行：行可以是字段句柄，也可以是「句柄 + 元素序号」，
// 后者只改数组里那一个元素（字段身份仍是整个数组，元素位置只是投影）。
function rowHandle(row) {return typeof row === "string" ? row : row.handle;}
function rowElement(row) {return typeof row === "string" ? null : row.element;}

function withPath(value, path, next) {
  if (!path.length) return next;
  const [head, ...rest] = path;
  const copy = Array.isArray(value) ? [...value] : {...value};
  copy[head] = withPath(value?.[head], rest, next);
  return copy;
}

// 组合列：一行的若干 1 字节字段合成一个值（`linked.littleEndian` 低位在前），
// 候选来自已发布资源文档，选择一次写这一行的那几个字段。
function linkedFieldsOf(object, handle, column) {
  const linked = column.linked.fields.map(name =>
    object.fields.find(field => field.entityHandle === handle && field.fieldName === name));
  if (linked.some(field => !field)) throw new TypeError(`${column.label} 组合列缺少字段`);
  return linked;
}

function linkedValue(column, linked) {
  return linked.reduce((total, field, index) =>
    total + field.value * 2 ** (8 * (column.linked.littleEndian ? index : linked.length - 1 - index)), 0);
}

function linkedBytes(column, value) {
  return column.linked.fields.map((_, index) =>
    (value >>> (8 * (column.linked.littleEndian ? index : column.linked.fields.length - 1 - index))) & 0xff);
}

async function columnCandidates(object) {
  const candidates = new Map();
  for (const column of object.definition.editor.columns || []) {
    if (!column.candidates && !column.bits) continue;
    if (column.candidates?.textReference) {
      const rows = candidateRows(await readCandidateDocument(db, column.candidates), column.candidates);
      candidates.set(column.candidateKey ?? column.name, rows.map(row => {
        const reference = atPath(row, column.candidates.textReference);
        return {value: candidateValueOf(row, column.candidates.value),
          label: currentTextReference(reference).label || '无可读文字', title: reference};
      }));
      continue;
    }
    if (semanticKind(column) === 'value-dispatch-reference') {
      const rows = candidateRows(await readCandidateDocument(db, column.candidates), column.candidates);
      const choices = rows.map(row => {
        if (row.reference_module !== column.semantic.targetModule)
          throw new TypeError(`${column.label} 候选引用目标不一致`);
        const references = atPath(row, column.semantic.references);
        if (!Array.isArray(references) || references.some(ref => typeof ref !== 'string'))
          throw new TypeError(`${column.label} 候选缺少已发布引用`);
        return {value: candidateValueOf(row, column.candidates.value),
          label: candidateLabelOf(row, column.candidates.label), references};
      });
      if (new Set(choices.map(choice => String(choice.value))).size !== choices.length)
        throw new TypeError(`${column.label} 候选选择码重复`);
      candidates.set(column.candidateKey ?? column.name, choices);
      continue;
    }
    candidates.set(column.candidateKey ?? column.name,
      Array.isArray(column.bits) ? column.bits
        : await resolveCandidateChoices(db, column.candidates || column.bits));
  }
  return candidates;
}

// 图块列：owner 声明上下文与候选两份来源，按对象解析（同一帧的数值在不同 CHR
// 上下文下是不同的图，所以候选与像素都不能脱离上下文）。
async function tileSourceValue(source, label) {
  if (Array.isArray(source)) return Promise.all(source.map((item, index) =>
    tileSourceValue(item, `${label} ${index + 1}`)));
  const {resourceId, schema, documentPath} = source;
  if ((resourceId ? 1 : 0) + (schema ? 1 : 0) !== 1)
    throw new TypeError(`${label} 只能给 resourceId 或 document 之一`);
  const document_ = schema ? await db.getDocument(schema) : await db.getResourceDocument(resourceId);
  const value = documentPath ? atPath(document_, documentPath) : document_;
  if (value === undefined)
    throw new TypeError(`${label} ${schema || resourceId}/${(documentPath || []).join('.')} 不存在`);
  return value;
}

function arrayInputValue(value, column) {
  if (!Array.isArray(value) || value.length !== column.length) throw new TypeError(`${column.label} 必须包含 ${column.length} 个字节`);
  return value.join(",");
}

function structuredText(value) {
  return JSON.stringify(value, null, 2);
}

function parseStructuredInput(value) {
  const parsed = JSON.parse(String(value));
  if (parsed === null || typeof parsed !== 'object')
    throw new TypeError('结构化字段必须是对象或数组');
  return parsed;
}

// 按行分组的数组列：值 = 若干行、每行一段等长字节。文档里的嵌套形状不变——
// 取值时两种形状都认，写回时按值原本的形状重建（嵌套仍是嵌套，摊平仍是摊平）。
function matrixRows(value, column) {
  const {rows, width} = column.matrix;
  const isByte = byte => Number.isInteger(byte) && byte >= 0 && byte <= 0xff;
  if (Array.isArray(value) && value.length === rows
      && value.every(row => Array.isArray(row) && row.length === width && row.every(isByte)))
    return value.map(row => [...row]);
  if (Array.isArray(value) && value.length === rows * width && value.every(isByte))
    return Array.from({length: rows}, (_, index) => value.slice(index * width, (index + 1) * width));
  throw new TypeError(`${column.label} 必须是 ${rows} 行 × 每行 ${width} 个 0–255 整数`);
}

function matrixValue(rows, like) {
  return Array.isArray(like?.[0]) ? rows : rows.flat();
}

function parseMatrixRow(value, column) {
  return parseArrayInput(value, {label: column.label, length: column.matrix.width, min: 0, max: 0xff});
}

function parseArrayInput(value, column) {
  const values = String(value).split(",").map(item => item.trim()).map(Number);
  if (values.length !== column.length || values.some(item => !Number.isInteger(item)
      || item < column.min || item > column.max))
    throw new TypeError(`${column.label} 必须是 ${column.length} 个 ${column.min}..${column.max} 整数`);
  return values;
}

function parseRawBytesInput(value, column) {
  const tokens = String(value).split(',').map(item => item.trim());
  if (tokens.some(item => !/^\d+$/u.test(item)))
    throw new TypeError(`${column.label} 必须是 ${column.length} 个 0..255 整数`);
  return parseArrayInput(value, column);
}

function bytePreview(value) {
  const bytes = Array.isArray(value) ? value : [];
  const head = bytes.slice(0, 32).map(byte => byte.toString(16).toUpperCase().padStart(2, '0')).join(' ');
  return `${bytes.length} 字节 · ${head}${bytes.length > 32 ? ' …' : ''}`;
}

function parseNumericInput(value, column) {
  const raw = String(value).trim();
  const number = Number(raw);
  if (!/^-?\d+$/u.test(raw) || !Number.isSafeInteger(number)
      || (Number.isInteger(column?.min) && number < column.min)
      || (Number.isInteger(column?.max) && number > column.max)) {
    const range = Number.isInteger(column?.min) && Number.isInteger(column?.max)
      ? `${column.min}..${column.max}` : '整数';
    throw new TypeError(`${column?.label || '字段'}必须是 ${range}`);
  }
  return number;
}

function bitmaskMasks(choices, label) {
  const masks = choices.map(choice => Number(choice.value));
  if (masks.some(mask => !Number.isInteger(mask) || mask <= 0
      || (mask & (mask - 1)) !== 0) || new Set(masks).size !== masks.length)
    throw new TypeError(`${label} 位掩码候选无效`);
  return masks;
}

function bitmaskMarkup(field, choices, label) {
  const masks = bitmaskMasks(choices, label);
  return labeledBitmaskMarkup({
    choices, active: (_choice, index) => Boolean(field.value & masks[index]),
    rootAttributes: `data-field-object-bitmask="${esc(fieldKey(field))}"`,
  });
}

function bindBitmaskGroup(group, field, choices, shared, button = null) {
  const masks = bitmaskMasks(choices, field.fieldName);
  const controls = [...group.querySelectorAll('input[type="checkbox"]')];
  field.bind(group, (_target, value) => {
    controls.forEach((control, index) => {control.checked = Boolean(value & masks[index]);});
    if (button) {
      button.dataset.originalDirty = String(field.hasOverride);
      button.classList.toggle('dirty', field.hasOverride);
      button.disabled = !field.hasOverride;
    }
  });
  group.addEventListener('change', event => {
    if (!controls.includes(event.target)) return;
    const known = masks.reduce((value, mask) => value | mask, 0);
    const selected = controls.reduce((value, control, index) =>
      value | (control.checked ? masks[index] : 0), field.value & ~known);
    commit(shared, () => field.set(selected));
  });
}

// 保存由字段层负责（`core/project-db.js` 的字段写入链）：串行、同字段合并、版本在
// 写入那一刻取、失败按字段记账。页面只放置控件，提交一笔就是调用字段对象本身；
// 错误从同一份记账里读回来显示（`core/auto-save.js` 的 `autoSaveErrorOf`）。
function controller(object) {
  if (controllers.has(object)) return controllers.get(object);
  const hosts = new Set();
  const status = error => {
    if (error) editorLog.error("字段编辑", `${object.id}：${error.message || error}`, error);
    for (const reference of hosts) {
      const host = reference.deref();
      if (!host) {hosts.delete(reference); continue;}
      if (!host.isConnected) continue;
      const message = host.querySelector('[data-field-object-error]');
      if (message) {message.hidden = !error; message.textContent = error?.message || String(error || '');}
    }
  };
  // 控件显示自己这几个字段里第一处未解除的失败：别处写成功不替它抹掉，别处的失败也不被它顶掉。
  const refresh = () => status(autoSaveErrorOf(object.fields));
  const notify = fields => {
    for (const reference of hosts) {
      const host = reference.deref();
      if (!host) {hosts.delete(reference); continue;}
      if (!host.isConnected) continue;
      host.dispatchEvent(new CustomEvent('field-object-saved', {
        bubbles: true, detail: {fields},
      }));
    }
  };
  const value = {hosts, status, refresh, notify};
  controllers.set(object, value);
  return value;
}

// 提交一笔：本地校验失败就地显示，落定后以字段层的记账为准。
function commit(shared, run) {
  let outcome;
  try {outcome = run();} catch (error) {shared.status(error); return;}
  outcome.then(fields => {shared.refresh(); shared.notify(fields);}, () => shared.refresh());
}

function showFieldHostError(host, error) {
  if (error) editorLog.error("字段编辑", `字段控件失败：${error.message || error}`, error);
  const message = host.querySelector('[data-field-object-error]');
  if (!message) return;
  message.hidden = !error;
  message.textContent = error?.message || String(error || '');
}

function renderFieldObjects(objects, candidates = new Map(), {rowHandles = null, presentations = new Map(), sceneEntries = [],
  suppressedFieldKeys = new Set(), compactIdentity = false, stacked = false, matrixRowIndices = null,
  rowHeader = null, rowLabels = {}, tableClass = '', pickerValueInput = false,
  referencePickerOptions = {}, reset = true} = {}) {
  return objects.map(object => {
    const {editor} = object.definition;
    if (!['reference-table', 'numeric-table', 'bitfield-table', 'command-table'].includes(editor.kind)) {
      throw new TypeError('字段对象控件类型未实现');
    }
    if (rowHandles && rowHandles.some(handle =>
      !editor.rows.some(row => rowHandle(row) === handle)))
      throw new TypeError('字段对象缺少所选行');
    const {visible: visibleColumns, represented} = visibleEditorColumns(object, rowHandles, suppressedFieldKeys);
    const rowLabel = index => esc(rowLabels[rowHandle(editor.rows[index])]
      ?? editor.rowLabels?.[index] ?? String(index + 1));
    const showRowLabels = !compactIdentity || rowHeader !== null;
    const seenHandles = new Set();
    const records = editor.rows.flatMap((row, index) => {
      if (rowHandles && !rowHandles.includes(rowHandle(row))) return [];
      const handle = rowHandle(row), element = rowElement(row);
      const cells = visibleColumns.map(column => {
        if (represented.get(handle)?.has(column.name)) return '<td></td>';
        if (claimedByPage(object, handle, column, suppressedFieldKeys)) return '<td></td>';
        const semantic = semanticKind(column);
        if (semantic === 'reference' && Number.isInteger(column.visualMask)) {
          return `<td><div data-field-object-attack-visual="${esc(JSON.stringify([handle, column.name]))}"></div></td>`;
        }
        let options = isHandleSceneCoordinate(column)
          && fixedSceneId(column, handle) === null ? undefined
          : candidates.get(column.candidateKey ?? column.name);
        if (semantic === 'reference' && column.semantic.picker === 'generic') {
          options = options?.map(option => {
            const label = referenceFieldCurrentLabel(column.semantic.targetModule,
              {value: option.value}, option.label);
            return label === option.label ? option : {...option, label, meta: String(option.value)};
          });
        }
        const select = (attributes, current) => {
          const numeric = Number.isInteger(options[0]?.value);
          const nullable = column.nullable === true;
          const published = (nullable && current === null)
            || options.some(option => String(option.value) === String(current));
          return `<select ${attributes}${numeric ? ' data-field-object-numeric="1"' : ''}
            ${nullable ? ' data-field-object-nullable="1"' : ''}
            aria-label="第 ${index + 1} 行${esc(column.label)}">${
            published ? '' : `<option value="${esc(String(current))}" selected>当前值 ${esc(String(current))}（不在已发布候选里）</option>`
          }${
            nullable ? `<option value=""${current === null ? ' selected' : ''}>${esc(column.nullLabel || '空')}</option>` : ''
          }${
            options.map(option => `<option value="${esc(String(option.value))}"${
              String(option.value) === String(current) ? ' selected' : ''}${option.title ? ` title="${esc(option.title)}"` : ''}>${esc(option.label)}</option>`).join('')
          }</select>`;
        };
        if (element !== null) {
          if (!column.element) throw new TypeError(`${column.label} 不是数组元素列`);
          const field = object.fields.find(field => field.entityHandle === handle && field.fieldName === column.name);
          if (!field) throw new TypeError('字段对象控件缺少字段');
          const current = atPath(field.value?.[element], column.element.path);
          const attributes = `data-field-object-element="${esc(JSON.stringify(
            [handle, column.name, element, column.element.path]))}"`;
          if (field.readOnly || column.readOnly) return `<td><code>${esc(current)}</code></td>`;
          if (options) {
            const controlMarkup = select(attributes, current);
            if (semantic === 'reference' && presentations.has(column.name))
              return `<td class="field-object-linked-reference">${renderModuleComponent(
                column.semantic.targetModule, 'reference', {
                  ...presentations.get(column.name), value: current, label: column.label, controlMarkup,
                })}</td>`;
            return `<td>${controlMarkup}</td>`;
          }
          if (column.boolean) return `<td><input type="checkbox"${current ? ' checked' : ''}
            ${attributes} aria-label="第 ${index + 1} 行${esc(column.label)}"></td>`;
          const min = Number.isInteger(column.min) ? ` min="${column.min}"` : '';
          const max = Number.isInteger(column.max) ? ` max="${column.max}"` : '';
          return `<td><input type="number" inputmode="numeric"${min}${max} value="${esc(current)}"
            ${attributes} aria-label="第 ${index + 1} 行${esc(column.label)}"></td>`;
        }
        if (column.linked) {
          const linked = linkedFieldsOf(object, handle, column), value = linkedValue(column, linked);
          // 任何一半只读就整列只读：组合值不能只写一半。
          if (linked.some(field => field.readOnly)) return `<td><code>${esc(value)}</code></td>`;
          if (!options) throw new TypeError(`${column.label} 组合列缺少候选`);
          if (semantic === 'reference' && presentations.has(column.name)) {
            const controlMarkup = select(`data-field-object-linked="${esc(JSON.stringify([handle, column.name]))}"`, value);
            return `<td class="field-object-linked-reference">${renderModuleComponent(column.semantic.targetModule, 'reference', {
              ...presentations.get(column.name), value, label: column.label, controlMarkup,
            })}</td>`;
          }
          return `<td>${select(`data-field-object-linked="${esc(JSON.stringify([handle, column.name]))}"`, value)}</td>`;
        }
        const field = object.fields.find(field => field.entityHandle === handle && field.fieldName === column.name);
        if (!field) {
          if (column.rows && !column.rows.includes(handle)) return '<td></td>';
          throw new TypeError('字段对象控件缺少字段');
        }
        if (column.eventFlag || column.reference === 'global-event-flag') {
          if (field.readOnly) return `<td>${renderModuleComponent('global-event-flag', 'reference', {value: field.value})}</td>`;
          return `<td class="field-object-linked-reference">${renderModuleComponent('save-container', 'event-flag-reference', {
            value: field.value, label: column.label, valueAsHandle: column.reference === 'global-event-flag',
            picker: referencePickerOptions[column.name],
            controlMarkup: column.reference === 'global-event-flag'
              ? `<input type="hidden" value="${esc(field.value)}" data-field-object-field="${esc(fieldKey(field))}">`
              : `<input type="number" hidden value="${esc(field.value)}" min="${column.min ?? 0}" max="${column.max ?? 255}" data-field-object-field="${esc(fieldKey(field))}">`,
          })}</td>`;
        }
        // 按行分组的数组列：一格里按行排 value 的每一行，改一行就整段重写。
        if (column.matrix) {
          const rows = matrixRows(field.value, column);
          if (field.readOnly)
            return `<td><code>${esc(rows.map(row => row.join(",")).join(" / "))}</code></td>`;
          return `<td><div class="field-object-matrix"${semantic === 'raw-bytes'
            ? ` data-field-object-raw-matrix="${esc(fieldKey(field))}"` : ''}
            style="--matrix-columns:${column.matrix.columns}">${
            rows.flatMap((row, index) => matrixRowIndices && !matrixRowIndices.includes(index) ? [] : [`<input type="text" inputmode="numeric" value="${esc(row.join(","))}"
              data-field-object-matrix="${esc(JSON.stringify([fieldKey(field), index]))}"
              aria-label="第 ${index + 1} 行${esc(column.label)}">`]).join('')}${
            semantic === 'raw-bytes' ? `<code data-field-object-byte-preview>${esc(bytePreview(rows.flat()))}</code>`
              : ''}</div></td>`;
        }
        if (field.readOnly) {
          if (field.value !== null && typeof field.value === 'object')
            return `<td><details class="field-object-structured"><summary>结构化值</summary><pre>${
              esc(structuredText(field.value))}</pre></details></td>`;
          const value = Array.isArray(field.value) ? field.value.join(",") : field.value;
          const sceneId = field.value;
          if (column.name === 'scene_id' && column.label === '所属场景'
            && Number.isInteger(sceneId) && sceneId >= 0 && sceneId <= 0xef) {
            const handle = `scene:${sceneId.toString(16).toUpperCase().padStart(2, '0')}`;
            return `<td>${handleMarkup(handle)}</td>`;
          }
          return `<td><code>${esc(value)}</code></td>`;
        }
        if (semantic === 'coordinate' && column.name === column.semantic.fields.scene) {
          const part = name => object.fields.find(item => item.entityHandle === handle && item.fieldName === name);
          const x = part(column.semantic.fields.x), y = part(column.semantic.fields.y);
          if (!x || !y) throw new TypeError(`${column.label} 坐标组缺少轴字段`);
          return `<td>${scenePositionPickerMarkup({entries: sceneEntries, sceneId: field.value,
            x: x.value, y: y.value, label: editorColumnLabel(column), minSceneId: column.min, maxSceneId: column.max,
            minX: editor.columns.find(item => item.name === column.semantic.fields.x)?.min,
            maxX: editor.columns.find(item => item.name === column.semantic.fields.x)?.max,
            minY: editor.columns.find(item => item.name === column.semantic.fields.y)?.min,
            maxY: editor.columns.find(item => item.name === column.semantic.fields.y)?.max,
            componentAttributes: `data-field-object-coordinate="${esc(JSON.stringify([handle, column.name]))}"`})}</td>`;
        }
        if (isHandleSceneCoordinate(column) && column.name === column.semantic.fields.x) {
          const other = object.fields.find(item => item.entityHandle === handle
            && item.fieldName === column.semantic.fields.y);
          if (!other) throw new TypeError(`${column.label} 缺少 Y 字段`);
          const id = fixedSceneId(column, handle);
          if (id !== null) return `<td>${scenePositionPickerMarkup({entries: sceneEntries, sceneId: id,
            x: field.value, y: other.value,
            label: isPreviewScene(column, handle) ? `${editorColumnLabel(column)} · 已知出现场景，未穷尽` : editorColumnLabel(column),
            minSceneId: id, maxSceneId: id,
            minX: column.min, maxX: column.max,
            minY: editor.columns.find(item => item.name === other.fieldName)?.min,
            maxY: editor.columns.find(item => item.name === other.fieldName)?.max,
            componentAttributes: `data-field-object-coordinate="${esc(JSON.stringify([handle, column.name]))}"`})}</td>`;
        }
        if (semantic === 'bit-labels' && options && column.bits) {
          return `<td>${bitmaskMarkup(field, options, column.label)}</td>`;
        }
        if (semantic === 'text-record' && options) {
          const region = Number(column.semantic.region).toString(16).toUpperCase().padStart(2, '0');
          const handleOf = value => `record:${region}:${String(value).padStart(3, '0')}`;
          return `<td><span class="field-object-text-record" data-field-object-text-preview="${esc(fieldKey(field))}">
            ${select(`data-field-object-field="${esc(fieldKey(field))}"`, field.value)}
            ${renderModuleComponent(column.semantic.targetModule, 'preview', {value: handleOf(field.value)})}
          </span></td>`;
        }
        if (semantic === 'value-dispatch-reference' && options) {
          const related = object.fields.find(item => item.entityHandle === handle
            && item.fieldName === column.semantic.relatedField);
          if (!related) throw new TypeError(`${column.label} 缺少同行记录号字段`);
          const reference = options.find(choice => String(choice.value) === String(field.value))
            ?.references[related.value];
          const listId = `field-dispatch-${index}-${column.name}`;
          return `<td><span class="field-object-text-record"
            data-field-object-value-dispatch-preview="${esc(fieldKey(field))}">
            <input type="number" inputmode="numeric"${Number.isInteger(column.min) ? ` min="${column.min}"` : ''}${
              Number.isInteger(column.max) ? ` max="${column.max}"` : ''}
              list="${esc(listId)}" value="${esc(field.value)}"
              data-field-object-field="${esc(fieldKey(field))}"
              aria-label="第 ${index + 1} 行${esc(column.label)}">
            <datalist id="${esc(listId)}">${options.map(choice =>
              `<option value="${esc(String(choice.value))}" label="${esc(choice.label)}"></option>`).join('')}</datalist>
            <span data-field-object-dispatch-preview>${reference
              && moduleComponentDefinition(column.semantic.targetModule, 'preview')
              ? renderModuleComponent(column.semantic.targetModule, 'preview', {value: reference}) : ''}</span>
          </span></td>`;
        }
        if (semantic === 'reference' && options
            && column.semantic.targetModule === 'item-entry') {
          return `<td class="field-object-linked-reference">${itemPickerFieldMarkup({
            records: state.project?.game_data?.items?.records || [], value: field.value ?? '',
            label: column.label, allowedCategories: ITEM_CATEGORIES,
            emptyValue: column.nullable ? '' : null,
            emptyLabel: column.nullLabel || '空',
            controlMarkup: select(`data-field-object-field="${esc(fieldKey(field))}"`, field.value),
            lazy: true,
          })}</td>`;
        }
        if (semantic === 'reference' && options && column.semantic.picker === 'generic') {
          const controlMarkup = select(`data-field-object-field="${esc(fieldKey(field))}"`, field.value);
          return `<td class="field-object-linked-reference">${referencePickerMarkup({
            ...referencePickerOptions[column.name],
            moduleId: column.semantic.targetModule, value: field.value, label: column.label,
            items: referencePickerOptions[column.name]?.previewOnlySummary
              ? options.map(option => ({...option, preview: renderModuleComponent(
                column.semantic.targetModule, 'reference', {value: option.value, compact: true})})) : options,
            controlMarkup, componentAttributes: 'data-field-object-reference="1"',
          })}</td>`;
        }
        if (semantic === 'reference' && options && presentations.has(column.name)) {
          const controlMarkup = pickerValueInput
            ? `<input type="hidden" data-field-object-field="${esc(fieldKey(field))}" data-field-object-picker-value="1"
              ${Number.isInteger(options[0]?.value) ? 'data-field-object-numeric="1"' : ''}
              value="${esc(field.value ?? '')}">`
            : select(`data-field-object-field="${esc(fieldKey(field))}"`, field.value);
          return `<td class="field-object-linked-reference">${renderModuleComponent(column.semantic.targetModule, 'reference', {
            ...presentations.get(column.name), value: field.value, label: column.label, controlMarkup,
          })}</td>`;
        }
        if (options)
          return `<td>${select(`data-field-object-field="${esc(fieldKey(field))}"`, field.value)}</td>`;
        if (semantic === 'command-stream' && column.commands) {
          const commands = Array.isArray(field.value) ? field.value : [];
          const rowsMarkup = commands.map((command, commandIndex) => {
            const operands = (command.operands || []).map((operand, operandIndex) => {
              const moduleId = column.semantic.operandReferences?.[operand.name];
              const uid = moduleId ? recordUid(moduleId, operand.value) : null;
              return `<label class="field-object-operand">${esc(operand.name)}
                ${uid ? `<b data-field-object-operand-reference="${esc(moduleId)}" title="${esc(uid)}">${esc(resourceLabel(uid, uid))}</b>` : ''}
                <input type="number" min="0" max="255" value="${esc(String(operand.value))}"
                  data-field-object-operand="${esc(JSON.stringify([fieldKey(field), commandIndex, operandIndex]))}"
                  aria-label="第 ${index + 1} 行第 ${commandIndex + 1} 条命令${esc(operand.name)}"></label>`;
            }).join('');
            return `<span class="field-object-command"><b>${esc(String(command.opcode_hex ?? ''))}</b>
              <i>${esc(command.name ?? '')}</i>${operands}</span>`;
          }).join('');
          const encodedLength = commands.reduce((total, command) => total + Number(command.length || 1), 0);
          return `<td><div class="field-object-command-stack" data-field-object-command="${esc(fieldKey(field))}"
            title="编码长度 ${encodedLength} 字节">${rowsMarkup || '<span class="resource-empty">—</span>'}</div></td>`;
        }
        if (semantic === 'raw-bytes') {
          return `<td><span class="field-object-byte-preview"><input type="text" inputmode="numeric"
            value="${esc(arrayInputValue(field.value, column))}"
            data-field-object-field="${esc(fieldKey(field))}" data-field-object-raw-bytes="1"
            aria-label="第 ${index + 1} 行${esc(column.label)}">
            <code data-field-object-byte-preview>${esc(bytePreview(field.value))}</code></span></td>`;
        }
        if (semantic === 'palette-array') {
          return `<td><span class="field-object-palette-array"><input type="text" inputmode="numeric"
            value="${esc(arrayInputValue(field.value, column))}"
            data-field-object-field="${esc(fieldKey(field))}" data-field-object-palette-array="1"
            aria-label="第 ${index + 1} 行${esc(column.label)}">
            <span data-field-object-palette-preview>${paletteSwatches(field.value, {
              className: 'palette-swatches is-tight'})}</span></span></td>`;
        }
        if (semantic === 'image' && column.tile && Array.isArray(field.value)) {
          return `<td><div class="field-object-tile">
            <textarea data-field-object-field="${esc(fieldKey(field))}" data-field-object-structured="1"
              aria-label="第 ${index + 1} 行${esc(column.label)}" hidden>${esc(structuredText(field.value))}</textarea>
            <attack-chr-tile-selector data-field-object-tile="${esc(fieldKey(field))}"></attack-chr-tile-selector>
          </div></td>`;
        }
        if (field.value !== null && typeof field.value === 'object')
          return `<td><textarea data-field-object-field="${esc(fieldKey(field))}"
            data-field-object-structured="1" aria-label="第 ${index + 1} 行${esc(column.label)}">${
            esc(structuredText(field.value))}</textarea></td>`;
        if (editor.kind === 'reference-table' || column.reference) {
          if (!field.serialization?.references) throw new TypeError('引用字段缺少候选');
          return `<td><select data-field-object-field="${esc(fieldKey(field))}" aria-label="第 ${index + 1} 行${esc(column.label)}">${
            field.serialization.references.map(reference => `<option value="${esc(reference)}"${reference === field.value ? ' selected' : ''}>${esc(reference)}</option>`).join('')
          }</select></td>`;
        }
        // 布尔列沿用模块编辑器里的勾选框（约束第 19 条：控件类别属本线范围）。
        if (column.boolean) {
          return `<td><input type="checkbox"${field.value ? ' checked' : ''}
            data-field-object-field="${esc(fieldKey(field))}"
            aria-label="第 ${index + 1} 行${esc(column.label)}"></td>`;
        }
        // 图块列：数值照样可编辑，候选与像素由 owner 按该帧的已发布上下文解析；
        // 同一帧有多个上下文时选择上下文只改预览，不改字段。
        if (semantic === 'image' && column.metatile) {
          return `<td><div class="field-object-metatile">
            <input type="number" inputmode="numeric" min="${esc(String(column.min ?? 0))}" max="${esc(String(column.max ?? 255))}"
              value="${esc(field.value)}" data-field-object-field="${esc(fieldKey(field))}" hidden
              aria-label="第 ${index + 1} 行${esc(column.label)}">
            <scene-metatile-selector data-field-object-metatile="${esc(fieldKey(field))}"></scene-metatile-selector>
          </div></td>`;
        }
        if (semantic === 'image' && column.tile) {
          return `<td><div class="field-object-tile">
            <input type="number" inputmode="numeric" min="${esc(String(column.min ?? 0))}" max="${esc(String(column.max ?? 255))}"
              value="${esc(field.value)}" data-field-object-field="${esc(fieldKey(field))}" hidden
              aria-label="第 ${index + 1} 行${esc(column.label)}">
            <attack-chr-tile-selector data-field-object-tile="${esc(fieldKey(field))}"></attack-chr-tile-selector>
          </div></td>`;
        }
        if (semantic === 'palette-index') {
          if (column.semantic.palette !== 'nes') throw new TypeError(`${column.label} 色板未登记`);
          return `<td><span class="field-object-palette-index" data-field-object-palette="${esc(fieldKey(field))}">
            <i style="--swatch:${nesColorCss(field.value)}"></i>
            <details class="field-object-palette-picker"><summary>NES $${Number(field.value).toString(16).toUpperCase().padStart(2, '0')}</summary>
              <span data-field-object-palette-grid="${esc(fieldKey(field))}"></span>
            </details></span></td>`;
        }
        if (semantic === 'dimension') {
          return `<td><span class="field-object-dimension"><input type="number" inputmode="numeric"
            min="${esc(column.min)}" max="${esc(column.max)}" value="${esc(field.value)}"
            data-field-object-field="${esc(fieldKey(field))}" aria-label="第 ${index + 1} 行${esc(column.label)}">
            <small>${esc(column.semantic.unit)}</small></span></td>`;
        }
        if (field.fieldName === 'content_id' && String(field.resourceId).startsWith('scene:')) {
          const controlMarkup = `<input type="number" min="0" max="251" hidden
            value="${esc(field.value)}" data-field-object-field="${esc(fieldKey(field))}"
            aria-label="第 ${index + 1} 行${esc(column.label)}">`;
          const money = Array.from({length: 11}, (_, offset) => {
            const value = 0xf0 + offset;
            const code = `$${value.toString(16).toUpperCase()}`;
            return {value: String(value), label: `金钱奖励 ${code}`,
              group: 'money', groupLabel: '金钱奖励', meta: code,
              filter: `${value} ${code} 金钱 奖励`};
          }).concat([{value: '251', label: '5 号战车挖掘', group: 'buried-vehicle',
            groupLabel: '战车挖掘', filter: '251 FB 5 号战车 挖掘'}]);
          return `<td class="field-object-linked-reference">${itemPickerFieldMarkup({
            records: state.project?.game_data?.items?.records || [], value: field.value,
            label: column.label, allowedCategories: ITEM_CATEGORIES,
            extraChoices: money, controlMarkup,
          })}</td>`;
        }
        if (semantic === 'fixed-text') {
          return `<td><span class="fixed-text-editor fixed-text-editor--compact">${fixedTextFieldInputMarkup({
            value: fixedTextProjection(column, field.value), label: `第 ${index + 1} 行${column.label}`,
            maxLength: column.semantic.source.length,
            attributes: `data-field-object-field="${esc(fieldKey(field))}" data-field-object-fixed-text="1"`,
          })}</span></td>`;
        }
        const numeric = !column.array && !column.text;
        const min = numeric && Number.isInteger(column.min) ? ` min="${column.min}"` : '';
        const max = numeric && Number.isInteger(column.max) ? ` max="${column.max}"` : '';
        const step = numeric && Number.isInteger(column.step) ? ` step="${column.step}"` : '';
        const inputType = column.array || column.text ? 'text' : 'number';
        const inputMode = column.text && !column.array ? '' : ' inputmode="numeric"';
        const inputValue = column.array ? arrayInputValue(field.value, column) : field.value ?? '';
        return `<td><input type="${inputType}"${inputMode}${min}${max}${step}
          value="${esc(inputValue)}" data-field-object-field="${esc(fieldKey(field))}"
          ${column.nullable === true ? 'data-field-object-nullable="1"' : ''}
          aria-label="第 ${index + 1} 行${esc(column.label)}"></td>`;
      });
      // 元素行共用同一个字段：重置只出现一次。
      const first = !seenHandles.has(handle);
      seenHandles.add(handle);
      if (stacked) return [((rowHandles || editor.rows).length > 1 ? `<tr><th colspan="3">${rowLabel(index)}</th></tr>` : '')
        + visibleColumns.map((column, position) =>
        `<tr><th>${esc(editorColumnLabel(column))}</th>${cells[position]}${reset && position === 0
          ? `<td class="reset-column" rowspan="${visibleColumns.length}">${first ? resetToOriginalButton(handle) : ''}</td>` : ''}</tr>`).join('')];
      return [`<tr>${showRowLabels ? `<td>${rowLabel(index)}</td>` : ''}${cells.join('')}${reset
        ? `<td class="reset-column">${first ? resetToOriginalButton(handle) : ''}</td>` : ''}</tr>`];
    }).join('');
    if (!visibleColumns.length && !editor.protectedRows?.length) return '';
    const protectedRows = (editor.protectedRows || []).map(row => `<tr><td>${esc(row.kind)}</td><td>${esc(row.handle)}</td><td>${
      esc(JSON.stringify(Object.fromEntries(Object.entries(row).filter(([key]) => !['kind', 'handle'].includes(key)))))}</td></tr>`).join('');
    const protectedPanel = protectedRows ? `<details><summary>其它场景规则</summary><table><tbody>${protectedRows}</tbody></table></details>` : '';
    // 写入许可未发布的列：保留编辑，极简标明它这一轮不进 ROM（约束第 10 条）。
    // 组合列的列名不是字段名，按它声明的那几个字段判。
    const pendingColumns = visibleColumns
      .filter(column => object.fields.some(field =>
        (column.semantic?.kind === 'coordinate' && column.name === column.semantic.fields.scene
          ? Object.values(column.semantic.fields) : column.linked?.fields ?? [column.name])
          .includes(field.fieldName)
        && field.writeback?.state === "unpermitted"))
      .map(editorColumnLabel);
    const pendingMark = pendingColumns.length
      ? writeAccessMarker({writebackMissing: true}, {fields: pendingColumns}) : '';
    return `<section data-field-object="${esc(object.id)}">${compactIdentity ? pendingMark : `<h3>${esc(object.definition.label)} ${pendingMark}</h3>`}
      <p data-field-object-error role="status" hidden></p>
      <div class="table-wrap"><table${tableClass ? ` class="${esc(tableClass)}"` : ''}>${stacked ? '' : `<thead><tr>${showRowLabels ? `<th>${esc(rowHeader ?? '顺序')}</th>` : ''}${visibleColumns.map(column => `<th>${esc(editorColumnLabel(column))}</th>`).join('')}${reset ? '<th class="reset-column" aria-label="恢复原值" title="恢复原值"></th>' : ''}</tr></thead>`}<tbody>${records}</tbody></table></div>
      ${protectedPanel}</section>`;
  }).join('');
}

async function mountFieldObjectSelect(host, object, fieldName,
  {reset = true, itemCategories = null} = {}) {
  const column = object.definition.editor.columns.find(item => item.name === fieldName);
  const field = object.fields.find(item => item.fieldName === fieldName);
  if (!column?.candidates || !field || field.readOnly) {
    throw new TypeError(`字段对象缺少可选择字段：${object.id}/${fieldName}`);
  }
  const options = await resolveCandidateChoices(db, column.candidates);
  const choices = new Map(options.map(option => [String(option.value), option]));
  if (!choices.size || choices.size !== options.length) throw new TypeError('字段候选为空或重复');
  const optionMarkup = option => `<option value="${esc(String(option.value))}">${
    esc(option.label)}${column.unit ? ` ${esc(column.unit)}` : ''}</option>`;
  const selectMarkup = `<select class="inline-data-select" aria-label="${esc(column.label)}">${
    column.nullable ? `<option value="">${esc(column.nullLabel || '空')}</option>` : ''}${
    options.map(optionMarkup).join('')}</select>`;
  host.classList.add('field-object-inline');
  host.innerHTML = `${itemCategories ? itemPickerFieldMarkup({
    records: state.project?.game_data?.items?.records || [], value: field.value ?? "",
    label: column.label, allowedCategories: itemCategories,
    emptyValue: column.nullable ? "" : null, emptyLabel: column.nullLabel || "空",
    controlMarkup: selectMarkup, lazy: true,
  }) : selectMarkup}${reset ? resetToOriginalButton(object.id) : ''}
    <span data-field-object-error role="status" hidden></span>`;
  const select = host.querySelector('select');
  const resetButton = host.querySelector('[data-reset-to-original]');
  const shared = controller(object);
  shared.hosts.add(new WeakRef(host));
  field.bind(select, (target, value) => {
    if (!(column.nullable && value === null) && !choices.has(String(value))) {
      target.insertAdjacentHTML('afterbegin', `<option value="${esc(String(value))}">${
        esc(String(value))}（未列入候选）</option>`);
    }
    target.value = column.nullable && value === null ? '' : String(value);
    if (itemCategories) void setReferencePickerValue(
      host.querySelector('[data-item-picker]'), target.value);
    if (resetButton) {
      resetButton.dataset.originalDirty = String(field.hasOverride);
      resetButton.classList.toggle('dirty', field.hasOverride);
      resetButton.disabled = !field.hasOverride;
    }
  });
  select.addEventListener('change', () => {
    if (select.selectedIndex < 0) {
      showFieldHostError(host, new TypeError(`${column.label} 不在已发布候选中`));
      select.value = column.nullable && field.value === null ? '' : String(field.value);
      return;
    }
    if (column.nullable && select.value === '') {
      showFieldHostError(host, null);
      commit(shared, () => field.set(null));
      return;
    }
    const option = choices.get(select.value);
    if (!option) {
      showFieldHostError(host, new TypeError(`${column.label} 不在已发布候选中`));
      select.value = String(field.value);
      return;
    }
    showFieldHostError(host, null);
    commit(shared, () => field.set(option.value));
  });
  if (itemCategories) hydrateItemPickers(host);
  if (reset) bindFieldResetToOriginalButtons(host, new Map([[object.id, field]]), {
    onError: error => shared.status(error),
  });
  recordMountedControls(host, object, [field], 'select');
}

function mountFieldObjectNumber(host, object, fieldName, {
  min, max, step = 1, reset = false, radix = 10, digits = 2, onValue,
} = {}) {
  const column = object.definition.editor.columns.find(item => item.name === fieldName);
  const field = object.fields.find(item => item.fieldName === fieldName);
  if (!column || !field || field.readOnly) throw new TypeError(`字段对象缺少可编辑数值：${object.id}/${fieldName}`);
  min ??= column.min ?? 0;
  max ??= column.max ?? 255;
  if (![10, 16].includes(radix)) throw new TypeError('数值进制必须是 10 或 16');
  const format = value => radix === 16
    ? `$${Number(value).toString(16).toUpperCase().padStart(digits, '0')}` : String(value);
  host.classList.add('field-object-inline');
  host.innerHTML = `<input class="inline-data-input" type="${radix === 16 ? 'text' : 'number'}"
    ${radix === 16 ? 'spellcheck="false"' : 'inputmode="numeric"'}
    min="${esc(min)}" max="${esc(max)}" step="${esc(step)}"
    aria-label="${esc(column.label)}">${reset ? resetToOriginalButton(object.id) : ''}
    <span data-field-object-error role="status" hidden></span>`;
  const input = host.querySelector('input');
  const resetButton = host.querySelector('[data-reset-to-original]');
  const shared = controller(object);
  shared.hosts.add(new WeakRef(host));
  field.bind(input, (target, value) => {
    target.value = format(value);
    target.setAttribute('aria-invalid', 'false');
    if (resetButton) {
      resetButton.dataset.originalDirty = String(field.hasOverride);
      resetButton.classList.toggle('dirty', field.hasOverride);
      resetButton.disabled = !field.hasOverride;
    }
    onValue?.(value);
  });
  const validated = () => {
    const raw = input.value.trim();
    const value = radix === 16 ? /^(?:\$|0x)?[0-9a-f]+$/iu.test(raw)
      ? Number.parseInt(raw.replace(/^(?:\$|0x)/iu, ''), 16) : null : Number(raw);
    const valid = raw !== '' && Number.isInteger(value)
      && value >= min && value <= max && (value - min) % step === 0;
    input.setAttribute('aria-invalid', String(!valid));
    showFieldHostError(host, valid ? null
      : new TypeError(`${column.label} 必须是 ${format(min)}..${format(max)} 且步长为 ${step} 的整数`));
    return valid ? value : null;
  };
  input.addEventListener('input', validated);
  input.addEventListener('change', () => {
    const value = validated();
    if (value !== null) commit(shared, () => field.set(value));
  });
  if (reset) bindFieldResetToOriginalButtons(host, new Map([[object.id, field]]), {
    onError: error => shared.status(error),
    afterReset: fields => {shared.refresh(); shared.notify(fields);},
  });
  recordMountedControls(host, object, [field], radix === 16 ? 'input:text' : 'input:number');
}

function mountFieldObjectNumericCodeValue(host, object, fieldName, numericCodes, {reset = false} = {}) {
  const column = object.definition.editor.columns.find(item => item.name === fieldName);
  const field = object.fields.find(item => item.fieldName === fieldName);
  if (!column || !field || field.readOnly) throw new TypeError(`字段对象缺少数值字段：${object.id}/${fieldName}`);
  const choices = numericCodes.filter(item => item.available && Number.isInteger(item.value)
    && Number.isInteger(item.raw_code));
  if (!choices.length) throw new TypeError('已发布数值表没有可用值');
  const byCode = new Map(numericCodes.map(item => [Number(item.raw_code), item]));
  const byValue = new Map();
  for (const choice of choices) {
    if (!byValue.has(choice.value)) byValue.set(choice.value, []);
    byValue.get(choice.value).push(choice.raw_code);
  }
  if (reset) host.classList.add('field-object-inline');
  host.innerHTML = `<span class="field-object-mapped-number"><input class="inline-data-input"
    type="number" inputmode="numeric" min="${Math.min(...byValue.keys())}"
    max="${Math.max(...byValue.keys())}" step="1" aria-label="${esc(column.label)}">
    </span>${reset ? resetToOriginalButton(object.id) : ''}
    <span data-field-object-error role="status" hidden></span>`;
  const input = host.querySelector('input');
  const shared = controller(object);
  shared.hosts.add(new WeakRef(host));
  field.bind(input, (target, code) => {
    const entry = byCode.get(Number(code));
    target.value = entry?.available ? String(entry.value) : '';
    target.placeholder = entry?.available ? '' : '非数值';
    target.setAttribute('aria-invalid', 'false');
    target.title = `CODE ${entry?.raw_code_hex || String(code)}`;
    showFieldHostError(host, null);
  });
  const selectedCode = () => {
    const value = Number(input.value);
    const matches = input.value !== '' && Number.isInteger(value) ? byValue.get(value) : null;
    input.setAttribute('aria-invalid', String(!matches));
    showFieldHostError(host, matches ? null
      : new TypeError(`${column.label} 必须是共享数值表中已发布的数值`));
    return matches ? (matches.includes(field.value) ? field.value : matches[0]) : null;
  };
  input.addEventListener('input', selectedCode);
  input.addEventListener('change', () => {
    const code = selectedCode();
    if (code !== null) commit(shared, () => field.set(code));
  });
  if (reset) bindFieldResetToOriginalButtons(host, new Map([[object.id, field]]), {
    onError: error => shared.status(error),
  });
  recordMountedControls(host, object, [field], 'input:number');
}

function mountFieldObjectReset(host, object, {
  label = null, title, beforeReset = null, afterReset = null,
} = {}) {
  const selected = object.fields.filter(field => !field.readOnly);
  host.innerHTML = `${resetToOriginalButton(object.id, {label, title})}<span data-field-object-error role="status" hidden></span>`;
  const button = host.querySelector('[data-reset-to-original]');
  const shared = controller(object);
  shared.hosts.add(new WeakRef(host));
  const refresh = () => {
    const dirty = selected.some(field => field.hasOverride);
    button.dataset.originalDirty = String(dirty);
    button.classList.toggle('dirty', dirty);
    button.disabled = !dirty;
  };
  for (const field of selected) field.bind(button, refresh);
  bindFieldResetToOriginalButtons(host, new Map([[object.id, selected]]), {
    database: object.database,
    beforeReset,
    afterReset: async (fields, context) => {
      await afterReset?.(fields, context);
      shared.refresh();
      shared.notify(fields);
    },
    onError: error => shared.status(error),
  });
}

async function mountFieldObjectBitmask(host, object, fieldName, {reset = false} = {}) {
  const column = object.definition.editor.columns.find(item => item.name === fieldName);
  const field = object.fields.find(item => item.fieldName === fieldName);
  if (!column?.bits || !field || field.readOnly) throw new TypeError(`字段对象缺少位掩码：${object.id}/${fieldName}`);
  const choices = Array.isArray(column.bits) ? column.bits
    : await resolveCandidateChoices(db, column.bits);
  host.classList.add('field-object-inline');
  host.innerHTML = `${bitmaskMarkup(field, choices, column.label)}${reset ? resetToOriginalButton(object.id) : ''}
    <span data-field-object-error role="status" hidden></span>`;
  const button = host.querySelector('[data-reset-to-original]');
  const shared = controller(object);
  shared.hosts.add(new WeakRef(host));
  bindBitmaskGroup(host.querySelector('[data-field-object-bitmask]'),
    field, choices, shared, button);
  if (reset) bindFieldResetToOriginalButtons(host, new Map([[object.id, field]]), {
    onError: error => shared.status(error),
  });
  recordMountedControls(host, object, [field], 'labeled-bitmask');
}

function mountFieldObjectSet(host, object, fieldName, {reset = false} = {}) {
  const options = object.definition.editor.sets?.[fieldName];
  const field = object.fields.find(item => item.fieldName === fieldName);
  if (!Array.isArray(options) || !field || field.readOnly) throw new TypeError(`字段对象缺少集合字段：${object.id}/${fieldName}`);
  host.classList.add('field-object-inline');
  host.innerHTML = `<span class="equipment-inline-roles">${options.map(([value, label]) => `<label>
    <input type="checkbox" value="${esc(value)}"><span>${esc(label)}</span>
  </label>`).join('')}</span>${reset ? resetToOriginalButton(object.id) : ''}
    <span data-field-object-error role="status" hidden></span>`;
  const controls = [...host.querySelectorAll('input')];
  const button = host.querySelector('[data-reset-to-original]');
  const shared = controller(object);
  shared.hosts.add(new WeakRef(host));
  field.bind(host, (_target, value) => {
    controls.forEach(control => {control.checked = value.includes(control.value);});
    if (button) {
      button.dataset.originalDirty = String(field.hasOverride);
      button.classList.toggle('dirty', field.hasOverride);
      button.disabled = !field.hasOverride;
    }
  });
  host.addEventListener('change', event => {
    if (!controls.includes(event.target)) return;
    commit(shared, () => field.set(controls.filter(control => control.checked).map(control => control.value)));
  });
  if (reset) bindFieldResetToOriginalButtons(host, new Map([[object.id, field]]), {
    onError: error => shared.status(error),
  });
  recordMountedControls(host, object, [field], 'labeled-set');
}

function mountFieldObjectAttackVisual(host, object, fieldName, {preview = true, reset = true} = {}) {
  const column = object.definition.editor.columns.find(item => item.name === fieldName);
  const field = object.fields.find(item => item.fieldName === fieldName);
  if (!field || field.readOnly || !Number.isInteger(column?.visualMask)
      || column.visualMask < 1 || column.visualMask > 0xff)
    throw new TypeError(`字段对象缺少攻击特效字段：${object.id}/${fieldName}`);
  host.classList.add('field-object-inline');
  host.innerHTML = `<animated-resource-picker></animated-resource-picker>
    ${reset ? resetToOriginalButton(object.id) : ''}
    ${field.writeback?.state === 'unpermitted'
      ? writeAccessMarker({writebackMissing: true}) : ''}
    <span data-field-object-error role="status" hidden></span>`;
  const picker = host.querySelector('animated-resource-picker');
  const resetButton = host.querySelector('[data-reset-to-original]');
  const shared = controller(object);
  shared.hosts.add(new WeakRef(host));
  configureAttackVisualPicker(picker, {value: field.value & column.visualMask, preview});
  field.bind(picker, (target, value) => {
    target.value = String(value & column.visualMask);
    if (resetButton) {
      resetButton.dataset.originalDirty = String(field.hasOverride);
      resetButton.classList.toggle('dirty', field.hasOverride);
      resetButton.disabled = !field.hasOverride;
    }
  });
  picker.addEventListener('change', () => {
    const code = Number(picker.value);
    if (!picker.options.some(option => option.value === picker.value)
        || !Number.isInteger(code) || code < 0 || code > column.visualMask) {
      showFieldHostError(host, new TypeError(`${column.label} 不在已发布候选中`));
      picker.value = String(field.value & column.visualMask);
      return;
    }
    const next = (field.value & ~column.visualMask) | code;
    showFieldHostError(host, null);
    commit(shared, () => field.set(next));
  });
  if (reset) bindFieldResetToOriginalButtons(host, new Map([[object.id, field]]), {
    onError: error => shared.status(error),
  });
  recordMountedControls(host, object, [field], 'animated-resource-picker');
}

async function mountFieldObjectEditor(host, object, options = {}) {
  const presentations = new Map();
  for (const column of object.definition.editor.columns) {
    if (semanticKind(column) === 'reference' && column.semantic.picker === 'generic') {
      await prepareReferenceFieldPresentation(column.semantic.targetModule);
      if (options.referencePickerOptions?.[column.name]?.previewOnlySummary)
        await prepareModuleComponent(column.semantic.targetModule, 'reference');
    }
    if (semanticKind(column) === 'reference' && column.semantic.picker !== 'generic'
        && column.semantic.targetModule !== 'item-entry') {
      presentations.set(column.name, await prepareModuleComponent(
        column.semantic.targetModule, 'reference'));
    }
  }
  const coordinate = object.definition.editor.columns.find(column =>
    (semanticKind(column) === 'coordinate' && column.name === column.semantic.fields.scene)
    || (isHandleSceneCoordinate(column)
      && column.name === column.semantic.fields.x));
  if (coordinate && !coordinate.candidates) throw new TypeError('场景坐标缺少静态候选声明');
  const sceneEntries = coordinate ? candidateRows(
    await readCandidateDocument(db, coordinate.candidates), coordinate.candidates) : [];
  const candidates = await columnCandidates(object);
  host.innerHTML = renderFieldObjects([object], candidates, {
    ...options, presentations, sceneEntries,
  });
  host.querySelectorAll('[data-field-object-attack-visual]').forEach(root =>
    mountFieldObjectAttackVisual(root, object,
      JSON.parse(root.dataset.fieldObjectAttackVisual)[1]));
  if (host.querySelector('[data-module-component-module]')) await hydrateModuleComponents(host);
  hydrateItemPickers(host);
  host.querySelectorAll('[data-field-object-reference]')
    .forEach(picker => bindReferencePicker(picker));
  const shared = controller(object), fields = new Map(object.fields.map(field => [fieldKey(field), field]));
  for (const root of host.querySelectorAll('[data-field-object-coordinate]')) {
    const [handle, name] = JSON.parse(root.dataset.fieldObjectCoordinate);
    const column = object.definition.editor.columns.find(item => item.name === name);
    const names = column.semantic.fields;
    const fixed = isHandleSceneCoordinate(column);
    const selected = (fixed ? [names.x, names.y] : [names.scene, names.x, names.y]).map(fieldName =>
      fields.get(fieldKey({entityHandle: handle, fieldName})));
    if (selected.some(field => !field || field.readOnly)) throw new TypeError(`${column.label} 坐标组不可编辑`);
    hydrateScenePositionPicker(root, {entries: sceneEntries, onConfirm: async ({sceneId, x, y}) => {
      try {
        const entry = sceneEntries.find(item => Number(item.id) === sceneId);
        if (!entry || x < 0 || y < 0 || x >= Number(entry.width) || y >= Number(entry.height))
          throw new TypeError('坐标不在已发布场景范围内');
        if (fixed && sceneId !== fixedSceneId(column, handle))
          throw new TypeError('场景身份由资源固定');
        const changed = await object.database.writeFields(selected.map((field, index) =>
          ({field, value: (fixed ? [x, y] : [sceneId, x, y])[index]})));
        shared.refresh(); shared.notify(changed);
      } catch (error) {shared.status(error); return false;}
    }});
    for (const input of root.querySelectorAll('[data-scene-position-scene-id], [data-scene-position-axis]')) {
      input.addEventListener('input', () => {
        const sceneInput = root.querySelector('[data-scene-position-scene-id]');
        const sceneId = scenePositionInputId(sceneInput);
        const x = Number(root.querySelector('[data-scene-position-axis="x"]').value);
        const y = Number(root.querySelector('[data-scene-position-axis="y"]').value);
        const entry = sceneEntries.find(item => Number(item.id) === sceneId);
        const valid = input.value !== '' && (input === sceneInput
          ? sceneId !== null : Number.isInteger(Number(input.value)))
          && input.checkValidity() && entry && x >= 0 && y >= 0
          && x < Number(entry.width) && y < Number(entry.height);
        input.setAttribute('aria-invalid', String(!valid));
        shared.status(valid ? null : new TypeError('坐标必须是已发布场景范围内的整数'));
      });
    }
    const refresh = () => syncScenePositionPicker(root, {entries: sceneEntries,
      sceneId: fixed ? fixedSceneId(column, handle) : selected[0].value,
      x: selected[fixed ? 0 : 1].value, y: selected[fixed ? 1 : 2].value});
    selected.forEach(field => field.bind(root, refresh));
  }
  for (const root of host.querySelectorAll('[data-field-object-palette]')) {
    const field = fields.get(root.dataset.fieldObjectPalette);
    root.querySelector('.field-object-palette-picker').addEventListener('toggle', event => {
      if (!event.target.open) return;
      const grid = root.querySelector('[data-field-object-palette-grid]');
      if (!grid.firstElementChild) grid.innerHTML = nesColorGrid({current: field.value,
        pickAttribute: 'data-field-object-palette-pick'});
    });
    field.bind(root, (_target, value) => {
      root.querySelector('i').style.setProperty('--swatch', nesColorCss(value));
      const summary = root.querySelector('.field-object-palette-picker summary');
      if (summary) summary.textContent = `NES $${Number(value).toString(16).toUpperCase().padStart(2, '0')}`;
      root.querySelectorAll('[data-nes-colour-index]').forEach(button =>
        button.classList.toggle('is-current', Number(button.dataset.nesColourIndex) === value));
    });
    root.addEventListener('nes-colour-confirm', event => {
      const button = event.target.closest('[data-field-object-palette-pick]');
      if (!button) return;
      commit(shared, () => field.set(Number(button.dataset.fieldObjectPalettePick)));
    });
  }
  for (const root of host.querySelectorAll('[data-field-object-text-preview]')) {
    const field = fields.get(root.dataset.fieldObjectTextPreview);
    const column = object.definition.editor.columns.find(item => item.name === field.fieldName);
    field.bind(root, (_target, value) => {
      const preview = root.querySelector('[data-module-component-module]');
      if (!preview) return;
      const region = Number(column.semantic.region).toString(16).toUpperCase().padStart(2, '0');
      preview.outerHTML = renderModuleComponent(column.semantic.targetModule, 'preview', {
        value: `record:${region}:${String(value).padStart(3, '0')}`,
      });
      void hydrateModuleComponents(root).catch(shared.status);
    });
  }
  for (const root of host.querySelectorAll('[data-field-object-value-dispatch-preview]')) {
    const field = fields.get(root.dataset.fieldObjectValueDispatchPreview);
    const column = object.definition.editor.columns.find(item => item.name === field.fieldName);
    const related = fields.get(fieldKey({entityHandle: field.entityHandle,
      fieldName: column.semantic.relatedField}));
    const choices = candidates.get(column.candidateKey ?? column.name);
    const refresh = () => {
      const reference = choices.find(choice => String(choice.value) === String(field.value))
        ?.references[related.value];
      const preview = reference && moduleComponentDefinition(column.semantic.targetModule, 'preview');
      root.querySelector('[data-field-object-dispatch-preview]').innerHTML = preview
        ? renderModuleComponent(column.semantic.targetModule, 'preview', {value: reference}) : '';
      if (preview) void hydrateModuleComponents(root).catch(shared.status);
    };
    field.bind(root, refresh);
    related.bind(root, refresh);
  }
  shared.hosts.add(new WeakRef(host));
  const rows = new Map();
  for (const field of object.fields) {
    if (!rows.has(field.entityHandle)) rows.set(field.entityHandle, []);
    rows.get(field.entityHandle).push(field);
  }
  for (const control of host.querySelectorAll('[data-field-object-field]:not([data-field-object-bitmask])')) {
    const field = fields.get(control.dataset.fieldObjectField);
    const column = object.definition.editor.columns.find(item => item.name === field.fieldName);
    const emptyWhen = column.semantic?.emptyWhen;
    const emptyField = emptyWhen && fields.get(fieldKey({entityHandle: field.entityHandle,
      fieldName: emptyWhen.field}));
    if (emptyWhen && !emptyField) throw new TypeError(`${column.label} 缺少空态字段`);
    const syncReference = () => {
      const picker = control.closest('[data-module-reference-picker]');
      if (picker) {
        if (emptyField) setReferencePickerEmpty(picker, emptyField.value === emptyWhen.value);
        void setReferencePickerValue(picker, control.value);
      }
      else {
        const component = control.closest('[data-module-component-kind="reference"]');
        if (component) syncModuleComponents(component);
      }
    };
    if (emptyField) emptyField.bind(control, syncReference);
    field.bind(control, (target, value) => {
      if (target.type === 'checkbox') target.checked = Boolean(value);
      else target.value = target.dataset.fieldObjectFixedText === '1'
        ? fixedTextProjection(column, value)
        : target.dataset.fieldObjectStructured === '1' ? structuredText(value) : value ?? '';
      if (target.dataset.fieldObjectRawBytes === '1') {
        target.closest('.field-object-byte-preview').querySelector('[data-field-object-byte-preview]')
          .textContent = bytePreview(value);
        target.setAttribute('aria-invalid', 'false');
      }
      if (target.dataset.fieldObjectPaletteArray === '1') {
        target.closest('.field-object-palette-array').querySelector('[data-field-object-palette-preview]')
          .innerHTML = paletteSwatches(value, {className: 'palette-swatches is-tight'});
        target.setAttribute('aria-invalid', 'false');
      }
      syncReference();
      if (target.type === 'number') target.setAttribute('aria-invalid', 'false');
      if (target.dataset.fieldObjectFixedText === '1') {
        target.setCustomValidity('');
        target.setAttribute('aria-invalid', 'false');
      }
    });
    const validateFixedText = () => {
      try {
        fixedTextValue(column, control.value, field.value);
        control.setCustomValidity('');
        control.setAttribute('aria-invalid', 'false');
        shared.status(null);
      } catch (error) {
        control.setCustomValidity(String(error?.message || error));
        control.setAttribute('aria-invalid', 'true');
        shared.status(error);
      }
    };
    if (control.type === 'number') control.addEventListener('input', () => {
      const value = Number(control.value);
      const valid = ((column?.nullable || control.dataset.fieldObjectNullable === '1')
        && control.value === '') || (control.value !== '' && Number.isInteger(value)
        && control.checkValidity());
      control.setAttribute('aria-invalid', String(!valid));
      shared.status(valid ? null : new TypeError(`${column.label} 超出允许范围或步长`));
    });
    if (control.dataset.fieldObjectRawBytes === '1'
        || control.dataset.fieldObjectPaletteArray === '1') control.addEventListener('input', () => {
      let error = null;
      try {parseRawBytesInput(control.value, column);} catch (caught) {error = caught;}
      control.setAttribute('aria-invalid', String(Boolean(error)));
      shared.status(error);
    });
    bindTextInputEvents(control, {
      onInput: control.dataset.fieldObjectFixedText === '1' ? validateFixedText : null,
      onChange: () => {
      if (control.dataset.fieldObjectPickerValue === '1'
          && !(column.nullable && control.value === '')
          && !candidates.get(column.candidateKey ?? column.name)?.some(option =>
            String(option.value) === control.value)) {
        shared.status(new TypeError(`${column.label} 不在已发布候选中`));
        control.value = String(field.value);
        syncReference();
        return;
      }
      if (control.type === 'number' && control.getAttribute('aria-invalid') === 'true') return;
      if ((control.dataset.fieldObjectFixedText === '1'
          || control.dataset.fieldObjectRawBytes === '1'
          || control.dataset.fieldObjectPaletteArray === '1')
          && control.getAttribute('aria-invalid') === 'true') return;
      if (control.tagName === 'SELECT' && ['text-record', 'reference'].includes(semanticKind(column))
          && (control.selectedIndex < 0 || ![...control.options].some(option =>
            option.value === control.value && !option.disabled))) {
        shared.status(new TypeError(`${column.label} 不在已发布候选中`));
        control.value = String(field.value);
        syncReference();
        return;
      }
      if (semanticKind(column) === 'reference') syncReference();
      commit(shared, () => {
        const value = control.type === 'checkbox' ? Boolean(control.checked)
        : (column?.nullable || control.dataset.fieldObjectNullable === '1') && control.value === '' ? null
        : control.type === 'number' || control.dataset.fieldObjectNumeric === '1'
          ? parseNumericInput(control.value, column)
          : control.dataset.fieldObjectStructured === '1' ? parseStructuredInput(control.value)
            : control.dataset.fieldObjectFixedText === '1'
              ? fixedTextValue(column, control.value, field.value)
              : column?.array ? (['raw-bytes', 'palette-array'].includes(semanticKind(column))
              ? parseRawBytesInput(control.value, column) : parseArrayInput(control.value, column))
              : control.value;
        return field.set(value);
      });
    }});
  }
  for (const group of host.querySelectorAll('[data-field-object-bitmask]')) {
    const field = fields.get(group.dataset.fieldObjectBitmask);
    const column = object.definition.editor.columns.find(item => item.name === field?.fieldName);
    const choices = candidates.get(column.candidateKey ?? column.name);
    bindBitmaskGroup(group, field, choices, shared);
  }
  // 组合列的两半必须一起变：一次批次写，整行的字段同时发布。
  for (const control of host.querySelectorAll('[data-field-object-linked]')) {
    const [handle, name] = JSON.parse(control.dataset.fieldObjectLinked);
    const column = object.definition.editor.columns.find(item => item.name === name);
    const linked = linkedFieldsOf(object, handle, column);
    const relabel = () => {
      control.value = String(linkedValue(column, linked));
      const picker = control.closest('[data-module-reference-picker]');
      if (picker) void setReferencePickerValue(picker, control.value);
    };
    for (const field of linked) field.bind(control, relabel);
    control.addEventListener('change', () => {
      if (presentations.has(column.name)
          && (!control.selectedOptions.length || ![...control.options].some(option =>
            option.value === control.value && !option.disabled))) {
        shared.status(new TypeError(`${column.label} 不在已发布候选中`));
        relabel();
        return;
      }
      const bytes = linkedBytes(column, Number(control.value));
      const changes = linked.map((field, index) => ({field, value: bytes[index]}));
      commit(shared, () => object.database.writeFields(changes));
    });
  }
  // 按行分组列：整格绑定同一字段（重置与别处写入都会刷新这一格），改一行按当前整段值
  // 重建成同一形状后整段写回（嵌套形状原样存文档）。
  for (const cell of host.querySelectorAll('.field-object-matrix')) {
    const inputs = [...cell.querySelectorAll('[data-field-object-matrix]')];
    const field = fields.get(JSON.parse(inputs[0].dataset.fieldObjectMatrix)[0]);
    if (!field || field.readOnly) continue;
    const column = object.definition.editor.columns.find(item => item.name === field.fieldName);
    field.bind(cell, (target, value) => {
      const rows = matrixRows(value, column);
      [...target.querySelectorAll('input')].forEach(input => {
        const index = JSON.parse(input.dataset.fieldObjectMatrix)[1];
        input.value = rows[index].join(',');
        input.setAttribute('aria-invalid', 'false');
      });
      if (semanticKind(column) === 'raw-bytes')
        target.querySelector('[data-field-object-byte-preview]').textContent = bytePreview(rows.flat());
    });
    for (const control of inputs) {
      const rowIndex = JSON.parse(control.dataset.fieldObjectMatrix)[1];
      if (semanticKind(column) === 'raw-bytes') control.addEventListener('input', () => {
        let error = null;
        try {parseRawBytesInput(control.value, {label: column.label,
          length: column.matrix.width, min: 0, max: 255});} catch (caught) {error = caught;}
        control.setAttribute('aria-invalid', String(Boolean(error)));
        shared.status(error);
      });
      control.addEventListener('change', () => {
        if (control.getAttribute('aria-invalid') === 'true') return;
        const base = pendingFieldValues.get(field) ?? field.value;
        const rows = matrixRows(base, column);
        const next = matrixValue(rows.map((row, index) =>
          index === rowIndex && semanticKind(column) === 'raw-bytes'
            ? parseRawBytesInput(control.value, {label: column.label,
              length: column.matrix.width, min: 0, max: 255})
            : index === rowIndex ? parseMatrixRow(control.value, column) : row), base);
        pendingFieldValues.set(field, next);
        commit(shared, () => field.set(next));
      });
    }
  }
  // 命令列：一次改一条命令里的一个操作数，重建整个命令数组（值与十六进制、有符号值同步）。
  for (const control of host.querySelectorAll('[data-field-object-operand]')) {
    const [key, commandIndex, operandIndex] = JSON.parse(control.dataset.fieldObjectOperand);
    const field = fields.get(key);
    if (!field || field.readOnly) continue;
    field.bind(control, (target, commands) => {
      target.value = String(commands?.[commandIndex]?.operands?.[operandIndex]?.value ?? '');
      const label = target.parentElement.querySelector('[data-field-object-operand-reference]');
      if (label) {
        const uid = recordUid(label.dataset.fieldObjectOperandReference, target.value);
        label.textContent = resourceLabel(uid, uid);
        label.title = uid;
      }
      target.setAttribute('aria-invalid', 'false');
    });
    control.addEventListener('input', () => {
      const valid = /^\d+$/u.test(control.value) && Number(control.value) <= 255;
      control.setAttribute('aria-invalid', String(!valid));
      shared.status(valid ? null : new TypeError('操作数必须是 0..255 的整数'));
    });
    control.addEventListener('change', () => {
      let value;
      try {value = parseNumericInput(control.value, {label: '操作数', min: 0, max: 255});}
      catch (error) {shared.status(error); return;}
      const source = pendingFieldValues.get(field) ?? field.value;
      const commands = source.map((command, index) => index !== commandIndex ? command : {
        ...command,
        operands: command.operands.map((operand, position) => position !== operandIndex ? operand : {
          ...operand, value,
          value_hex: `0x${value.toString(16).toUpperCase().padStart(2, '0')}`,
          ...(typeof operand.signed_value === 'number'
            ? {signed_value: value < 0x80 ? value : value - 0x100} : {}),
        }),
      });
      pendingFieldValues.set(field, commands);
      commit(shared, () => field.set(commands));
    });
  }
  // 元素行：一次改数组字段里的一个元素；同字段的连笔编辑在同一个待写值上累加，
  // 写入走字段层的同一条链（版本在写入那一刻才取，不与别的字段抢）。
  for (const control of host.querySelectorAll('[data-field-object-element]')) {
    const [handle, name, element, path] = JSON.parse(control.dataset.fieldObjectElement);
    const column = object.definition.editor.columns.find(item => item.name === name
      && (path === undefined || JSON.stringify(item.element?.path) === JSON.stringify(path)));
    const field = fields.get(fieldKey({entityHandle: handle, fieldName: name}));
    const syncReference = () => {
      const reference = control.closest('[data-module-component-kind="reference"]');
      if (reference) syncModuleComponents(reference);
    };
    field.bind(control, (_target, value) => {
      const current = atPath(value?.[element], column.element.path);
      if (control.type === 'checkbox') control.checked = Boolean(current);
      else control.value = column.nullable === true && current === null ? '' : String(current);
      syncReference();
    });
    control.addEventListener('change', () => {
      if (semanticKind(column) === 'reference'
          && (control.selectedIndex < 0 || ![...control.options].some(option =>
            option.value === control.value && !option.disabled))) {
        shared.status(new TypeError(`${column.label} 不在已发布候选中`));
        control.value = String(atPath(field.value?.[element], column.element.path));
        syncReference();
        return;
      }
      if (semanticKind(column) === 'reference') syncReference();
      const value = control.dataset.fieldObjectNullable === '1' && control.value === '' ? null
        : control.type === 'checkbox' ? Boolean(control.checked)
        : control.type === 'number' || control.dataset.fieldObjectNumeric === '1'
          ? parseNumericInput(control.value, column) : control.value;
      const next = withPath(pendingFieldValues.get(field) ?? field.value, [element, ...column.element.path], value);
      pendingFieldValues.set(field, next);
      commit(shared, () => field.set(next));
    });
  }
  // 图块列：候选与像素由 owner 按对象解析（同一数值在不同上下文下是不同的图）。上下文
  // 切换只改预览；选图块写回同一个字段对象；取不到已发布上下文时如实报因，数值编辑照旧。
  for (const element of host.querySelectorAll('[data-field-object-metatile]')) {
    const field = fields.get(element.dataset.fieldObjectMetatile);
    const column = object.definition.editor.columns.find(item => item.name === field?.fieldName);
    if (!field || field.readOnly || !column?.metatile) continue;
    try {
      const resourceId = column.metatile.context === 'scene'
        ? options.metatileResourceId : column.metatile.resourceId;
      const document_ = await db.getResourceDocument(resourceId);
      const scene = document_?.scene;
      if (!scene) throw new TypeError(`${resourceId} 场景正文不可用`);
      const renderer = Number(scene.id) === 0
        ? await loadWorldMetatileRenderer(scene) : await loadSceneMetatileRenderer(scene);
      const coordinate = axis => object.fields.find(item => item.entityHandle === field.entityHandle
        && item.fieldName === axis)?.value;
      const images = Number(scene.id) === 0
        ? renderer?.zones?.get(worldZoneAt(coordinate('x'), coordinate('y')))?.metatiles
        : renderer?.metatiles;
      configureSceneMetatileSelector(element, {images, value: field.value});
      field.bind(element, (_target, value) => setSceneMetatileValue(element, value));
      element.addEventListener('change', event => {
        const value = event.detail?.value;
        if (Number.isInteger(value) && value !== field.value)
          commit(shared, () => field.set(value));
      });
    } catch (error) {
      editorLog.error("字段编辑", `操作失败：${error?.message || error}`, error);
      element.parentElement.querySelector('[data-field-object-field]').hidden = false;
      element.outerHTML = `<span class="resource-empty" role="alert">${esc(`元图块无法解析：${error?.message || error}`)}</span>`;
    }
  }
  for (const element of host.querySelectorAll('[data-field-object-tile]')) {
    const field = fields.get(element.dataset.fieldObjectTile);
    const column = object.definition.editor.columns.find(item => item.name === field?.fieldName);
    if (!field || field.readOnly || !column?.tile) continue;
    let binding;
    try {
      const [contexts, candidates] = await Promise.all([
        tileSourceValue(column.tile.contexts, `${column.label}的 CHR 上下文`),
        tileSourceValue(column.tile.candidates, `${column.label}的图块候选`),
      ]);
      binding = column.tile.bind({contexts, candidates, consumer: column.tile.consumer, value: field.value});
    } catch (error) {
      editorLog.error("字段编辑", `操作失败：${error?.message || error}`, error);
      element.parentElement.querySelector('[data-field-object-field]').hidden = false;
      element.outerHTML = `<span class="resource-empty" role="alert">${
        esc(`图块无法解析：${error?.message || error}`)}</span>`;
      continue;
    }
    field.bind(element, (_target, value) => {
      const references = Array.isArray(value) ? value.map(binding.adapter.reference)
        : [binding.adapter.reference(value)];
      if (element.dataset.fieldObjectTileReady === '1') setChrContextTileReferences(element, references);
      else {
        configureChrContextTileSelector(element, {
          contexts: binding.contexts, contextLabels: binding.contextLabels,
          references, columns: binding.columns ?? 1, rows: binding.rows ?? 1,
          adapter: binding.adapter,
        });
        element.dataset.fieldObjectTileReady = '1';
      }
    });
    element.addEventListener('change', event => {
      const references = event.detail?.references;
      if (!references?.length) return;
      let encoded;
      try {encoded = binding.encode(Array.isArray(field.value) ? references : references[0]);}
      catch (error) {shared.status(error); return;}
      if (JSON.stringify(encoded) === JSON.stringify(field.value)) return;
      commit(shared, () => field.set(encoded));
    });
  }
  bindFieldResetToOriginalButtons(host, rows, {database: object.database,
    // 重置与写入排进同一条链：同一字段的待写被这一笔顶掉，成功即解除它自己那处失败。
    beforeReset: async selected => {selected.forEach(field => pendingFieldValues.delete(field));},
    afterReset: selected => {shared.refresh(); shared.notify(selected);},
    onError: shared.status});
  shared.refresh();
  const shownNames = new Set(object.definition.editor.columns.flatMap(column =>
    column.linked?.fields ?? [column.name]));
  const shownHandles = new Set((options.rowHandles ?? object.definition.editor.rows)
    .map(row => rowHandle(row)));
  recordMountedControls(host, object, object.fields.filter(field =>
    shownNames.has(field.fieldName) && shownHandles.has(field.entityHandle)
    && !options.suppressedFieldKeys?.has(displayKey(
      field.resourceId, field.entityHandle, field.fieldName))));
  host.dataset.fieldObjectReady = object.id;
  return object;
}

/** 存档域也由字段对象提供值；字节地图仅决定控件在页面中的位置。 */
function saveNameFieldInputMarkup(object, {label = null} = {}) {
  return `<input class="inline-data-input" type="text" spellcheck="false"
    data-save-page-name="${esc(object.fieldId)}"
    aria-label="${esc(label || object.binding?.label || object.valueMeaning || "姓名")}" value="${esc(object.nameText)}">`;
}

function renderSaveCurrentFieldObject(object, {label = null} = {}) {
  const value = object.value;
  const binding = object.binding || {};
  const name = label || binding.label || object.fieldId;
  const reset = resetToOriginalButton(object.fieldId, {dirty: object.edited});
  const attributes = `data-byte-map-field-id="${esc(object.fieldId)}"`;
  let control;
  if (binding.control === 'checkbox') {
    control = `<input type="checkbox" ${attributes}${value ? ' checked' : ''}>`;
  } else if (binding.encoding === 'bytes') {
    const bytes = value instanceof Uint8Array ? value : Uint8Array.from(value);
    const hex = [...bytes].map(byte => byte.toString(16).toUpperCase().padStart(2, '0')).join(' ');
    control = `<input class="inline-data-input" type="text" ${attributes}
      data-byte-map-value-kind="bytes" spellcheck="false" value="${esc(hex)}">`;
  } else {
    control = `<input class="inline-data-input" type="number" ${attributes}
      min="${esc(binding.min ?? 0)}" max="${esc(binding.max ?? '')}" step="1"
      value="${esc(value)}">`;
  }
  return `<span class="inline-original-editor" data-save-field-dirty="${object.edited}"
    data-field-object="${esc(object.fieldId)}">
    <label class="byte-map-field-editor" title="${esc(object.fieldId)}">
      <span>${esc(name)}</span>${control}</label>
    <span class="original-reset-control${object.edited ? ' is-unsaved-dirty' : ''}">${reset}</span>
  </span>`;
}

function mountSaveCurrentFieldObject(host, object) {
  const draw = () => {host.innerHTML = renderSaveCurrentFieldObject(object);};
  if (object.bind) object.bind(host, draw); else draw();
  host.addEventListener('change', async event => {
    const input = event.target.closest('[data-byte-map-field-id]');
    if (!input) return;
    try {
      const value = input.type === 'checkbox' ? input.checked
        : input.dataset.byteMapValueKind === 'bytes'
          ? Uint8Array.from(input.value.trim().split(/\s+/u).map(part => {
            if (!/^[0-9a-f]{2}$/iu.test(part)) throw new TypeError('字节必须为两位十六进制');
            return Number.parseInt(part, 16);
          })) : Number(input.value);
      await object.set(value);
      draw();
    } catch (error) {host.dataset.fieldObjectError = String(error?.message || error);}
  });
  host.addEventListener('click', async event => {
    if (!event.target.closest('[data-reset-to-original]')) return;
    try {await object.reset(); draw();}
    catch (error) {host.dataset.fieldObjectError = String(error?.message || error);}
  });
  host.dataset.fieldObjectReady = object.id;
  return object;
}

/** Bind field, array-element and field-group resets through save-current objects. */

/** 在原对象的一组列上使用同一编辑器，字段身份与写入链保持原样。 */
async function mountFieldObjectColumns(host, object, names) {
  const selected = new Set(names);
  const columns = object.definition.editor.columns.filter(column => selected.has(column.name));
  if (!columns.length || columns.length !== selected.size)
    throw new TypeError('字段对象控件缺少所选列');
  const fields = object.fields.filter(field => selected.has(field.fieldName));
  const projection = {...object, fields, definition: {...object.definition,
    editor: {...object.definition.editor, columns}}};
  return mountFieldObjectEditor(host, projection);
}

/** 多个字段必须同笔修改时，统一组件提交同一对象里的字段批次。 */
function mountLinkedFieldChoice(host, object, names, choices, {label = ''} = {}) {
  const fields = names.map(name => object.fields.find(field => field.fieldName === name));
  if (fields.some(field => !field)) throw new TypeError('字段对象组合选择缺少字段');
  const valueOf = choice => JSON.stringify(choice.values);
  const current = JSON.stringify(fields.map(field => field.value));
  host.innerHTML = `<label>${esc(label)}<select data-field-object-linked-choice>${
    choices.map(choice => `<option value="${esc(valueOf(choice))}"${
      current === valueOf(choice) ? ' selected' : ''}>${esc(choice.label)}</option>`).join('')
  }</select></label><p data-field-object-error role="status" hidden></p>`;
  const input = host.querySelector('[data-field-object-linked-choice]');
  const shared = controller(object);
  shared.hosts.add(new WeakRef(host));
  input.addEventListener('change', () => {
    const values = JSON.parse(input.value);
    commit(shared, () => object.database.writeFields(fields.map((field, index) =>
      ({field, value: values[index]}))));
  });
  for (const field of fields) field.bind(input, () => {
    const current = JSON.stringify(fields.map(member => member.value));
    if ([...input.options].some(option => option.value === current)) input.value = current;
  });
  recordMountedControls(host, object, fields, 'select');
  host.dataset.fieldObjectReady = object.id;
  return object;
}

/** 带字段身份的内联输入由共用组件绘制并订阅同一字段对象。 */
function fieldObjectInputMarkup({handle, name, type = 'number', value,
  min = null, max = null, className = '', attributes = ''}) {
  if (!handle || !name || !['number', 'text'].includes(type))
    throw new TypeError('内联字段控件缺少身份或类型');
  return `<input type="${type}"${className ? ` class="${esc(className)}"` : ''}
    data-field-object-inline="${esc(JSON.stringify([handle, name]))}"
    value="${esc(value)}"${min !== null ? ` min="${esc(min)}"` : ''}${
    max !== null ? ` max="${esc(max)}"` : ''} ${attributes}>`;
}

/** Owner 字段的局部字节投影仍沿用页面的批量写入链。 */
function fieldObjectProjectionMarkup({resourceId, handle, name, value,
  min, max, options = null, className = '', attributes = '', inputType = 'number'}) {
  if (!resourceId || !handle || !name) throw new TypeError('字段投影缺少 owner 身份');
  const identity = `data-field-object-projection="${esc(JSON.stringify(
    [resourceId, handle, name]))}"`;
  const classes = className ? ` class="${esc(className)}"` : '';
  if (options) return `<select${classes} ${identity} ${attributes}>${options.map(option =>
    `<option value="${esc(option.value)}"${Number(option.value) === Number(value)
      ? ' selected' : ''}>${esc(option.label)}</option>`).join('')}</select>`;
  if (!['number', 'hidden'].includes(inputType)) throw new TypeError('字段投影控件类型无效');
  return `<input${classes} type="${inputType}" inputmode="numeric" step="1"
    min="${esc(min)}" max="${esc(max)}" value="${esc(value)}"
    ${identity} ${attributes}>`;
}

async function bindFieldObjectProjections(root, database) {
  await Promise.all([...root.querySelectorAll('[data-field-object-projection]')].map(
    async control => {
      const [resourceId, handle, name] = JSON.parse(control.dataset.fieldObjectProjection);
      const field = database.peekField?.(resourceId, handle, name)
        || await database.getField(resourceId, handle, name);
      if (!control.isConnected) return;
      field.bind(control, () => {});
      control.dataset.fieldObjectReady = '1';
    },
  ));
}

function mountFieldObjectInlineControls(root, fields) {
  const byKey = new Map(fields.map(field => [fieldKey(field), field]));
  for (const control of root.querySelectorAll('[data-field-object-inline]')) {
    const key = control.dataset.fieldObjectInline;
    const field = byKey.get(key);
    if (!field) throw new TypeError(`内联字段控件缺少字段对象：${key}`);
    const host = document.createElement('span');
    host.className = 'field-object-inline';
    control.replaceWith(host);
    host.append(control);
    if (control.type === 'number') {
      field.bind(host, () => {
        if (control !== document.activeElement) control.value = String(field.value);
      });
      control.addEventListener('input', () => {
        const valid = control.value !== '' && Number.isInteger(Number(control.value))
          && control.checkValidity();
        control.setAttribute('aria-invalid', String(!valid));
      });
    } else field.bind(host, () => {});
    host.dataset.fieldObjectInlineMounted = '1';
    host.dataset.fieldObjectReady = '1';
  }
}

function mountFieldObjectField(host, object, {entityHandle, fieldName, onValue,
  beforeCommit, scale = 1, label = null, byteIndex = null, resetHost = null,
  resettable = byteIndex !== null} = {}) {
  const field = object.fields.find(item => item.entityHandle === entityHandle
    && item.fieldName === fieldName);
  const column = object.definition.editor?.columns?.find(item => item.name === fieldName);
  if (!field || !column || !['numeric-table', 'bitfield-table'].includes(object.definition.editor.kind))
    throw new TypeError(`字段对象缺少数值控件：${entityHandle}/${fieldName}`);
  if (byteIndex !== null && (!Array.isArray(field.value) || !Number.isInteger(byteIndex)
      || byteIndex < 0 || byteIndex >= field.value.length)) throw new TypeError('数组字段索引无效');
  const read = value => byteIndex === null ? value : value[byteIndex];
  const write = value => byteIndex === null ? value : Object.assign([...field.value], {[byteIndex]: value});
  const selection = byteIndex === null ? undefined : [{offset: byteIndex, length: 1}];
  if (!Number.isInteger(scale) || scale < 1 || !Number.isInteger(Math.log10(scale)))
    throw new TypeError('字段对象显示倍率必须是十的非负整数次幂');
  const shared = controller(object);
  const caption = label || column.label;
  const minimum = Number.isInteger(column.min) ? ` min="${column.min / scale}"` : '';
  const maximum = Number.isInteger(column.max) ? ` max="${column.max / scale}"` : '';
  const places = Math.log10(scale);
  const display = value => (value / scale).toFixed(places);
  host.classList.add('field-object-inline');
  host.innerHTML = field.readOnly ? `<code>${esc(display(read(field.value)))}</code>`
    : `<input class="inline-data-input" type="number" step="${1 / scale}"${minimum}${maximum} value="${esc(display(read(field.value)))}"
        aria-label="${esc(caption)}" data-field-object-value>
      ${!resettable ? '' : resetToOriginalButton(fieldKey(field), {
        attributes: {'data-field-object-byte-reset': ''},
      })}
      <p data-field-object-error role="status" hidden></p>`;
  shared.hosts.add(new WeakRef(host));
  if (resetHost) resetHost.append(...host.querySelectorAll('[data-field-object-byte-reset]'));
  const input = host.querySelector('[data-field-object-value]');
  field.bind(host, (target, value) => {
    if (input) input.value = display(read(value));
    else target.querySelector('code').textContent = display(read(value));
    const resetRoot = resetHost || target;
    const button = resetRoot.querySelector('[data-field-object-byte-reset]');
    if (button) applyResetToOriginalStates(resetRoot, new Map([[fieldKey(field),
      !field.readOnly && read(value) !== read(field.defaultValue)]]));
    onValue?.(value);
  });
  if (input) {
    const valid = () => input.value !== '' && input.validity.valid
      && Math.abs(Number(input.value) * scale - Math.round(Number(input.value) * scale)) < 1e-7;
    input.addEventListener('input', () => {
      if (!valid()) shared.status(new TypeError(`${caption} 必须是 ${column.min / scale}..${column.max / scale}，步长 ${1 / scale}`));
    });
    input.addEventListener('change', () => {
      if (!valid()) {
        shared.status(new TypeError(`${caption} 必须是 ${column.min / scale}..${column.max / scale}，步长 ${1 / scale}`));
        input.reportValidity();
        return;
      }
      commit(shared, async () => {
        await beforeCommit?.();
        return field.set(write(Math.round(Number(input.value) * scale)), {selection});
      });
    });
  }
  (resetHost || host).querySelector('[data-field-object-byte-reset]')?.addEventListener('click', () =>
    commit(shared, () => field.reset({selection})));
  shared.refresh();
  recordMountedControls(host, object, [field], 'input:number');
  host.dataset.fieldObjectReady = object.id;
  return field;
}

// 脚本坐标须共用场景位置选择器。
function mountFieldObjectArrayPosition(host, object, {
  entityHandle, fieldName, indices, entries, label = '目的地', anchor = [0, 0],
  sceneId = null, resetHost = null, onValue,
  decodeCoordinate = (_sceneId, value) => value, encodeCoordinate = (_sceneId, value) => value,
}) {
  const field = object.fields.find(row => row.entityHandle === entityHandle && row.fieldName === fieldName);
  const fixedScene = Number.isInteger(sceneId);
  if (!field || indices.length !== (fixedScene ? 2 : 3) || indices.some(index => !Number.isInteger(index)
      || index < 0 || index >= field.value.length)) throw new TypeError('数组坐标字段无效');
  const position = bytes => {
    const id = fixedScene ? sceneId : bytes[indices[0]];
    return {sceneId: id,
      x: decodeCoordinate(id, bytes[indices[fixedScene ? 0 : 1]]) + anchor[0],
      y: decodeCoordinate(id, bytes[indices[fixedScene ? 1 : 2]]) + anchor[1]};
  };
  const selection = [...indices].sort((a, b) => a - b).map(offset => ({offset, length: 1}));
  const shared = controller(object);
  shared.hosts.add(new WeakRef(host));
  host.classList.add('field-object-inline');
  host.innerHTML = `${scenePositionPickerMarkup({entries, ...position(field.value), label,
    ...(fixedScene ? {minSceneId: sceneId, maxSceneId: sceneId} : {}),
    disabled: field.readOnly})}${resetToOriginalButton(fieldKey(field), {
      attributes: {'data-field-object-position-reset': ''},
    })}
    <p data-field-object-error role="status" hidden></p>`;
  if (resetHost) resetHost.append(...host.querySelectorAll('[data-field-object-position-reset]'));
  const picker = host.querySelector('[data-scene-position-picker]');
  const write = values => {
    const bytes = [...field.value];
    indices.forEach((index, part) => bytes[index] = values[part]);
    return field.set(bytes, {selection});
  };
  hydrateScenePositionPicker(picker, {entries, onConfirm: async ({sceneId, x, y}) => {
    try {
      const entry = entries.find(row => Number(row.id) === sceneId);
      const values = [...(fixedScene ? [] : [sceneId]), encodeCoordinate(sceneId, x - anchor[0]),
        encodeCoordinate(sceneId, y - anchor[1])];
      if (field.readOnly || !entry || !fixedScene && (x < 0 || y < 0 || x >= entry.width || y >= entry.height)
          || values.some(value => !Number.isInteger(value) || value < 0 || value > 255))
        throw new TypeError('目的地超出场景或脚本坐标范围');
      const changed = await write(values);
      shared.refresh(); shared.notify(changed);
    } catch (error) {shared.status(error); return false;}
  }});
  field.bind(host, (_host, value) => {
    syncScenePositionPicker(picker, {entries, ...position(value)});
    applyResetToOriginalStates(resetHost || host, new Map([[fieldKey(field), !field.readOnly
      && indices.some(index => value[index] !== field.defaultValue[index])]]));
    onValue?.(value);
  });
  (resetHost || host).querySelector('[data-field-object-position-reset]').addEventListener('click', () => {
    if (!field.readOnly) commit(shared, () => field.reset({selection}));
  });
  shared.refresh();
  recordMountedControls(host, object, [field], 'scene-position-picker');
  host.dataset.fieldObjectReady = object.id;
  return field;
}

function mountFieldObjectArrayChoice(host, object, {
  entityHandle, fieldName, byteIndex, choices, label, onValue,
}) {
  const field = object.fields.find(row => row.entityHandle === entityHandle && row.fieldName === fieldName);
  if (!field || !Array.isArray(field.value) || !Number.isInteger(byteIndex)
      || byteIndex < 0 || byteIndex >= field.value.length || !choices.length)
    throw new TypeError('数组枚举字段无效');
  const selection = [{offset: byteIndex, length: 1}];
  const shared = controller(object);
  shared.hosts.add(new WeakRef(host));
  host.innerHTML = `<label>${esc(label)}<select data-field-object-value${field.readOnly ? ' disabled' : ''}>
    ${choices.map(choice => `<option value="${choice.value}">${esc(choice.label)}</option>`).join('')}
    </select></label><button class="button reset-to-original" type="button" data-field-object-byte-reset>⟲</button>
    <p data-field-object-error role="status" hidden></p>`;
  const select = host.querySelector('select');
  field.bind(host, (_host, value) => {
    select.value = String(value[byteIndex]);
    host.querySelector('[data-field-object-byte-reset]').disabled = field.readOnly
      || value[byteIndex] === field.defaultValue[byteIndex];
    onValue?.(value);
  });
  select.addEventListener('change', () => commit(shared, () => {
    const value = Number(select.value);
    if (!choices.some(choice => choice.value === value)) throw new TypeError('枚举值无效');
    return field.set(Object.assign([...field.value], {[byteIndex]: value}), {selection});
  }));
  host.querySelector('[data-field-object-byte-reset]').addEventListener('click', () =>
    commit(shared, () => field.reset({selection})));
  shared.refresh();
  recordMountedControls(host, object, [field], 'select');
  host.dataset.fieldObjectReady = object.id;
  return field;
}

// 引用选择器须经原字段对象编辑脚本数组选区。
async function mountFieldObjectArrayReference(host, object, {
  entityHandle, fieldName, indices, moduleId, kind = 'reference', prepared = {},
  label, resetHost, onValue, decode = values => values[0], encode = value => [Number(value)],
  candidateSelector = '[data-reference-picker-option]',
  candidateValue = row => row.dataset.referencePickerControlValue,
  picker: presentation = {}, resettable = false,
}) {
  const field = object.fields.find(row => row.entityHandle === entityHandle && row.fieldName === fieldName);
  if (!field || !Array.isArray(field.value) || !indices.length || indices.some(index =>
    !Number.isInteger(index) || index < 0 || index >= field.value.length)) throw new TypeError('引用字段无效');
  const current = () => decode(indices.map(index => field.value[index]));
  const selection = indices.map(offset => ({offset, length: 1}));
  const shared = controller(object);
  shared.hosts.add(new WeakRef(host));
  host.innerHTML = `${renderModuleComponent(moduleId, kind, {...prepared, value: current(), label,
    picker: presentation,
    controlMarkup: `<input type="hidden" data-field-object-value value="${esc(current())}"${field.readOnly ? ' disabled' : ''}>`})}
    <p data-field-object-error role="status" hidden></p>`;
  const input = host.querySelector('[data-field-object-value]');
  const picker = host.querySelector('[data-module-reference-picker]');
  const sync = () => {
    if (!picker) {
      input.value = String(current());
      syncModuleComponents(host);
      return;
    }
    const option = [...picker.querySelectorAll('[data-reference-picker-option]')]
      .find(row => row.dataset.referencePickerControlValue === String(current()));
    void setReferencePickerValue(picker, option?.dataset.referencePickerOption ?? current());
  };
  field.bind(host, (_host, value) => {sync(); onValue?.(value);});
  input.addEventListener('change', () => {
    const values = encode(input.value);
    const valid = [...host.querySelectorAll(candidateSelector)]
      .some(row => candidateValue(row) === input.value && !row.disabled);
    if (field.readOnly || !valid || values.length !== indices.length
        || values.some(value => !Number.isInteger(value) || value < 0 || value > 255)) {
      shared.status(new TypeError(`${label || fieldName} 必须选择已发布的引用`)); sync(); return;
    }
    const bytes = [...field.value];
    indices.forEach((index, part) => bytes[index] = values[part]);
    commit(shared, () => field.set(bytes, {selection}));
  });
  if (resettable && !resetHost) {
    resetHost = document.createElement('span');
    resetHost.className = 'field-object-reference-reset';
    host.append(resetHost);
    host.classList.add('field-object-inline');
  }
  if (resetHost) {
    resetHost.innerHTML = resetToOriginalButton(fieldKey(field));
    field.bind(resetHost, () => applyResetToOriginalStates(resetHost, new Map([[fieldKey(field),
      !field.readOnly && indices.some(index => field.value[index] !== field.defaultValue[index])]])));
    resetHost.querySelector('button').addEventListener('click', () => {
      if (!field.readOnly) commit(shared, () => field.reset({selection}));
    });
  }
  await hydrateModuleComponents(host);
  shared.refresh();
  recordMountedControls(host, object, [field], 'reference-picker');
  host.dataset.fieldObjectReady = object.id;
  return field;
}

/** A compact reference choice that reads and commits one published field. */
function mountFieldObjectChoice(host, object, {
  entityHandle, fieldName, optionsMarkup, label, onValue, beforeCommit, afterCommit, onMount,
  nullable = false, pickerMarkup = null, paintPreview = null,
} = {}) {
  const field = object.fields.find(item => item.entityHandle === entityHandle
    && item.fieldName === fieldName);
  if (!field) throw new TypeError(`字段对象缺少选择控件：${entityHandle}/${fieldName}`);
  const shared = controller(object);
  const selectMarkup = `<select class="inline-data-select" aria-label="${esc(label || fieldName)}"
    data-field-object-value>${optionsMarkup(field.value)}</select>`;
  host.innerHTML = field.readOnly ? `<code>${esc(field.value)}</code>`
    : `${pickerMarkup ? pickerMarkup(field.value, selectMarkup) : selectMarkup}
      <p data-field-object-error role="status" hidden></p>`;
  shared.hosts.add(new WeakRef(host));
  const select = host.querySelector('[data-field-object-value]');
  field.bind(host, (_target, value) => {
    if (select) select.value = nullable && value === null ? '' : String(value);
    else host.querySelector('code').textContent = String(value);
    const picker = host.querySelector('[data-module-reference-picker]');
    if (picker) void setReferencePickerValue(picker, value);
    onValue?.(value);
  });
  if (select) {
    const valid = () => select.selectedOptions.length === 1
      && ((nullable && select.value === '') || Number.isInteger(Number(select.value)));
    select.addEventListener('input', () => {
      if (!valid()) shared.status(new TypeError(`${label || fieldName} 必须选择已发布的编号`));
    });
    select.addEventListener('change', () => {
      if (!valid()) {
        shared.status(new TypeError(`${label || fieldName} 必须选择已发布的编号`));
        return;
      }
      const value = nullable && select.value === '' ? null : Number(select.value);
      commit(shared, async () => {
        await beforeCommit?.();
        await field.set(value);
        await afterCommit?.();
        return field;
      });
    });
    if (pickerMarkup) {
      const picker = host.querySelector('[data-module-reference-picker]');
      if (picker.matches('[data-item-picker]')) hydrateItemPickers(host);
      else {
        bindReferencePicker(picker, {paint: paintPreview});
        void hydrateModuleComponents(picker);
        picker.querySelector('details.module-reference-picker')?.addEventListener('toggle', event => {
          if (event.target.open) void hydrateModuleComponents(event.target);
        });
      }
    } else onMount?.(select);
  }
  shared.refresh();
  recordMountedControls(host, object, [field], 'select');
  host.dataset.fieldObjectReady = object.id;
  return field;
}

/** One published formation reference, including a byte inside a script field. */
async function mountFieldObjectFormationChoice(host, object, {
  entityHandle, fieldName, byteIndex = null, prepared, picker = null,
} = {}) {
  const field = object.fields.find(item => item.entityHandle === entityHandle
    && item.fieldName === fieldName);
  if (!field || (byteIndex !== null && (!Array.isArray(field.value)
      || !Number.isInteger(byteIndex) || byteIndex < 0 || byteIndex >= field.value.length)))
    throw new TypeError(`字段对象缺少编队引用：${entityHandle}/${fieldName}`);
  const current = () => Number(byteIndex === null ? field.value : field.value[byteIndex]);
  const original = () => Number(byteIndex === null
    ? field.defaultValue : field.defaultValue[byteIndex]);
  const choices = prepared?.entries || [];
  if (!choices.some(entry => Number(entry.id) === current()))
    throw new TypeError(`编队引用不在已发布候选中：${current()}`);
  if (field.readOnly) {
    host.innerHTML = picker ? referencePickerMarkup({moduleId: 'scene-actor', label: '战斗交互',
      value: current(), items: picker.items, grouped: true, compact: true, disabled: true})
      : `<select aria-label="编队" disabled><option>${esc(current())}</option></select>`;
    recordMountedControls(host, object, [field], 'select');
    return field;
  }
  const shared = controller(object);
  shared.hosts.add(new WeakRef(host));
  host.classList.add('field-object-inline');
  host.innerHTML = `${picker ? referencePickerMarkup({moduleId: 'scene-actor', label: '交互',
    value: current(), items: picker.items, grouped: true, previewPanel: true, compact: true})
    : renderModuleComponent('encounter-formation', 'reference', {
    ...prepared, value: current(), label: '编队',
  })}${resetToOriginalButton(fieldKey(field), {attributes: {'data-field-object-formation-reset': ''}})}
    <p data-field-object-error role="status" hidden></p>`;
  if (picker) bindReferencePicker(host.querySelector('[data-module-reference-picker]'), picker);
  else await hydrateModuleComponents(host);
  const reference = host.querySelector('[data-module-reference-picker]');
  const reset = host.querySelector('[data-field-object-formation-reset]');
  const sync = () => {
    if (!host.isConnected) return;
    void setReferencePickerValue(reference, current());
    applyResetToOriginalStates(host, new Map([[fieldKey(field), !field.readOnly && current() !== original()]]));
  };
  field.bind(host, sync);
  sync();
  const write = value => byteIndex === null ? field.set(value)
    : field.set(Object.assign([...field.value], {[byteIndex]: value}));
  host.addEventListener('module-reference-change', event => {
    if (field.readOnly) return;
    const value = Number(event.detail.value);
    if (!Number.isInteger(value) || !choices.some(entry => Number(entry.id) === value)) {
      shared.status(new TypeError('编队引用不在已发布候选中'));
      sync();
      return;
    }
    if (value === current()) return;
    commit(shared, () => write(value).catch(error => {sync(); throw error;}));
  });
  reset.addEventListener('click', () => {
    if (field.readOnly || current() === original()) return;
    commit(shared, () => byteIndex === null ? field.reset() : write(original()));
  });
  shared.refresh();
  recordMountedControls(host, object, [field], 'select');
  host.dataset.fieldObjectReady = object.id;
  return field;
}

/** A selector whose displayed choice maps to one published field value. */
function mountFieldObjectMappedChoice(host, object, {
  entityHandle, fieldName, label, optionsMarkup, selectionValue,
  fieldValueFor, allowedSelection, disabled = () => false, onValue, afterCommit,
}) {
  const field = object.fields.find(item => item.entityHandle === entityHandle
    && item.fieldName === fieldName);
  if (!field) throw new TypeError(`字段对象缺少映射选择控件：${entityHandle}/${fieldName}`);
  const shared = controller(object);
  host.innerHTML = `<select class="inline-data-select" aria-label="${esc(label || fieldName)}"
    data-field-object-value>${optionsMarkup()}</select><p data-field-object-error role="status" hidden></p>`;
  shared.hosts.add(new WeakRef(host));
  const select = host.querySelector('[data-field-object-value]');
  let pending = null;
  field.bind(host, (_target, value) => {
    onValue?.(value);
    select.value = pending ?? String(selectionValue(value));
    select.disabled = field.readOnly || disabled();
  });
  select.addEventListener('change', () => {
    if (select.selectedOptions.length !== 1 ||
        (allowedSelection && !allowedSelection(select.value))) {
      shared.status(new TypeError(`${label || fieldName} 必须选择已发布的槽位`));
      return;
    }
    const selected = select.value;
    pending = selected;
    commit(shared, async () => {
      try {
        await field.set(fieldValueFor(selected, field.value));
        await afterCommit?.(selected, field.value);
      } finally {
        pending = null;
        select.value = String(selectionValue(field.value));
      }
    });
  });
  shared.refresh();
  recordMountedControls(host, object, [field], 'select');
  host.dataset.fieldObjectReady = object.id;
  return {field, select};
}

/** A semantic choice over fields in one published record. */
function mountFieldObjectRecordChoice(host, object, {
  entityHandle, fieldNames, label, choices, selected, valuesFor, picker = null,
}) {
  host.classList.add('field-object-record-choice');
  const fields = fieldNames.map(name => object.fields.find(field =>
    field.entityHandle === entityHandle && field.fieldName === name));
  if (fields.some(field => !field)) throw new TypeError(`${label} 缺少字段对象字段`);
  const shared = controller(object);
  const render = () => {
    const options = choices();
    const current = String(selected(Object.fromEntries(fields.map(field =>
      [field.fieldName, field.value]))));
    const destination = picker?.destination?.(current);
    const controlMarkup = `<select data-field-object-record-choice aria-label="${esc(label)}"
      ${fields.some(field => field.readOnly) ? 'disabled' : ''}>
      ${options.some(option => String(option.value) === current) ? ''
        : `<option value="${esc(current)}" selected disabled>当前值 ${esc(current)}（不在已发布候选中）</option>`}
      ${options.map(option => `<option value="${esc(String(option.value))}"${String(option.value) === current
        ? ' selected' : ''}${option.disabled ? ' disabled' : ''}>${esc(option.label)}</option>`).join('')}
    </select>`;
    host.innerHTML = `<label class="scene-content-field">${esc(label)}${picker
      ? picker.preview ? referencePickerMarkup({moduleId: picker.moduleId, items: options,
        value: current, label, controlMarkup, grouped: true, compact: true,
        pageSize: 60, previewPanel: true})
      : renderModuleComponent(picker.moduleId, 'reference', {...picker.prepared, value: current,
        label, controlMarkup}) : controlMarkup}</label>${(picker?.writebackMissing
          ? picker.writebackMissing() : fields.some(field => field.writeback?.state === 'unpermitted'))
          ? writeAccessMarker({writebackMissing: true}) : ''}${picker?.resettable
          ? resetToOriginalButton(entityHandle, {attributes: {'data-record-choice-reset': ''},
            dirty: fields.some(field => field.hasOverride),
            disabled: fields.every(field => !field.hasOverride) || fields.some(field => field.readOnly)}) : ''}
      ${destination ? `<a class="editor-inline-link" data-field-object-choice-destination
        href="${esc(destination)}" aria-label="编辑${esc(label)}" title="编辑${esc(label)}">↗</a>` : ''}
      <p data-field-object-error role="status" hidden></p>`;
    if (picker?.preview) bindReferencePicker(host.querySelector('[data-module-reference-picker]'),
      {preview: picker.preview, paint: picker.paint, onOpen: picker.onOpen});
    else if (picker) void hydrateModuleComponents(host);
    host.querySelector('[data-record-choice-reset]')?.addEventListener('click', () => {
      if (fields.some(field => field.readOnly)) return;
      commit(shared, () => object.database.writeFields(fields.map(field =>
        ({field, value: field.defaultValue, reset: true}))));
    });
    host.querySelector('select').addEventListener('change', async event => {
      const choice = options.find(option => String(option.value) === event.target.value);
      if (!choice || choice.disabled) {render(); shared.status(new TypeError(`${label} 不在已发布可写候选中`)); return;}
      const currentValues = Object.fromEntries(fields.map(field => [field.fieldName, field.value]));
      let next;
      try {next = await trackAutoSavePreparation(Promise.resolve(valuesFor(choice.value, currentValues)));}
      catch (error) {render(); shared.status(error); return;}
      commit(shared, () => object.database.writeFields(fields.filter(field => Object.hasOwn(next, field.fieldName))
        .map(field => ({field, value: next[field.fieldName]}))));
    });
  };
  shared.hosts.add(new WeakRef(host));
  fields.forEach(field => field.bind(host, render));
  render();
  shared.refresh();
  recordMountedControls(host, object, fields, 'select');
  host.dataset.fieldObjectReady = object.id;
}

function mountFieldObjectElementReset(host, object, {handle, index, maxValue = 127, beforeReset = null}) {
  const field = object.fields.find(item => item.entityHandle === handle && item.fieldName === 'cells');
  if (!field || !Array.isArray(field.value) || !Array.isArray(field.defaultValue)
      || !Number.isInteger(index) || index < 0 || index >= field.value.length)
    throw new TypeError('字段对象缺少所选地图格');
  const shared = controller(object);
  shared.hosts.add(new WeakRef(host));
  host.innerHTML = `<div class="field-object-inline" data-field-object="${esc(object.id)}">
    <p data-field-object-error role="status" hidden></p>
    <label>元图块 <input type="text" aria-label="元图块编号" spellcheck="false"
      data-field-object-element-value value="0x${Number(field.value[index]).toString(16).toUpperCase().padStart(2, '0')}">
    ${field.writeback?.state === 'unpermitted'
      ? writeAccessMarker({writebackMissing: true}) : ''}</label>
    ${resetToOriginalButton(handle, {})}
  </div>`;
  const button = host.querySelector('[data-reset-to-original]');
  const input = host.querySelector('[data-field-object-element-value]');
  field.bind(host, () => {
    input.value = `0x${Number(field.value[index]).toString(16).toUpperCase().padStart(2, '0')}`;
    applyResetToOriginalStates(host, new Map([[handle, field.value[index] !== field.defaultValue[index]]]));
  });
  input.addEventListener('change', () => {
    commit(shared, () => {
      const raw = input.value.trim();
      const value = Number.parseInt(raw.replace(/^0x/iu, ''), 16);
      if (!/^(?:0x)?[0-9a-f]{1,2}$/iu.test(raw) || value > maxValue)
        throw new TypeError(`元图块编号必须是 0x00–0x${maxValue.toString(16).toUpperCase().padStart(2, '0')}`);
      return (async () => {
        await beforeReset?.();
        const next = [...field.value];
        next[index] = value;
        return field.set(next);
      })();
    });
  });
  button.addEventListener('click', () => {
    commit(shared, async () => {
      await beforeReset?.();
      const next = [...field.value];
      next[index] = field.defaultValue[index];
      return field.set(next);
    });
  });
  shared.refresh();
  recordMountedControls(host, object, [field], 'input:text');
  host.dataset.fieldObjectReady = object.id;
  return object;
}

/** Commit a scene-position picker as one field-object batch. */
function bindFieldObjectPositionPicker(root, object, {
  entityHandle, entries, hydrate, beforeCommit, onValue, afterCommit,
}) {
  const fields = ['scene_id', 'x', 'y'].map(name => object.fields.find(field =>
    field.entityHandle === entityHandle && field.fieldName === name));
  if (fields.some(field => !field || field.readOnly))
    throw new TypeError(`字段对象缺少可写位置：${entityHandle}`);
  const status = document.createElement('small');
  status.setAttribute('role', 'status');
  status.hidden = true;
  root.append(status);
  hydrate(root, {entries, onConfirm: async ({sceneId, x, y}) => {
    try {
      if (!entries.some(entry => Number(entry.id) === sceneId))
        throw new RangeError('所在地图未在已发布场景中');
      await beforeCommit?.();
      await object.database.writeFields([
        {field: fields[0], value: sceneId},
        {field: fields[1], value: x},
        {field: fields[2], value: y},
      ]);
      status.textContent = '';
      status.hidden = true;
      onValue?.({sceneId: fields[0].value, x: fields[1].value, y: fields[2].value});
      await afterCommit?.();
    } catch (error) {
      editorLog.error("字段编辑", `操作失败：${error?.message || error}`, error);
      status.textContent = String(error?.message || error);
      status.hidden = false;
      return false;
    }
  }});
  root.dataset.fieldObjectReady = object.id;
  recordMountedControls(root, object, fields, 'scene-position-picker');
  return fields;
}

/** Text shown through a domain codec while its published field stores raw bytes. */
function mountFieldObjectText(host, object, {
  entityHandle, fieldName, label, maxLength = null, format, parse, onValue, beforeCommit,
} = {}) {
  const field = object.fields.find(item => item.entityHandle === entityHandle
    && item.fieldName === fieldName);
  if (!field || typeof format !== 'function' || typeof parse !== 'function')
    throw new TypeError(`字段对象缺少文字控件：${entityHandle}/${fieldName}`);
  const shared = controller(object);
  const caption = label || fieldName;
  host.classList.add('fixed-text-editor', 'fixed-text-editor--compact');
  host.innerHTML = field.readOnly ? `<code>${esc(format(field.value))}</code>`
    : `${fixedTextFieldInputMarkup({value: format(field.value), label: caption,
      maxLength, className: 'inline-data-input', attributes: 'data-field-object-value'})}
      <p data-field-object-error role="status" hidden></p>`;
  shared.hosts.add(new WeakRef(host));
  const input = host.querySelector('[data-field-object-value]');
  field.bind(host, (_target, value) => {
    if (input) input.value = format(value);
    else host.querySelector('code').textContent = format(value);
    onValue?.(value);
  });
  if (input) {
    bindTextInputEvents(input, {onInput: () => {
      try {
        parse(input.value, field.value);
        input.setCustomValidity('');
        input.setAttribute('aria-invalid', 'false');
        shared.status(null);
      } catch (error) {
        input.setCustomValidity(String(error?.message || error));
        input.setAttribute('aria-invalid', 'true');
        shared.status(error);
      }
    }, onChange: () => {
      let value;
      try {value = parse(input.value, field.value);}
      catch (error) {shared.status(error); return;}
      commit(shared, async () => {
        await beforeCommit?.();
        await field.set(value);
      });
    }});
  }
  shared.refresh();
  recordMountedControls(host, object, [field], 'fixed-text-editor');
  host.dataset.fieldObjectReady = object.id;
  return field;
}

function mountFieldObjectBit(host, object, {
  entityHandle, fieldName, bit, label, disabled = false, makeValue, onValue, beforeCommit,
} = {}) {
  const field = object.fields.find(item => item.entityHandle === entityHandle
    && item.fieldName === fieldName);
  if (!field || !Number.isInteger(bit) || bit < 1 || bit > 0x80 || (bit & (bit - 1)))
    throw new TypeError(`字段对象缺少位控件：${entityHandle}/${fieldName}/${bit}`);
  const shared = controller(object);
  host.innerHTML = field.readOnly ? `<code>${esc(Boolean(field.value & bit))}</code>`
    : `<input type="checkbox" aria-label="${esc(label || fieldName)}"
        data-field-object-value${field.value & bit ? ' checked' : ''}${disabled ? ' disabled' : ''}>
      <p data-field-object-error role="status" hidden></p>`;
  shared.hosts.add(new WeakRef(host));
  const input = host.querySelector('[data-field-object-value]');
  field.bind(host, (_target, value) => {
    if (input) input.checked = Boolean(value & bit);
    else host.querySelector('code').textContent = String(Boolean(value & bit));
    onValue?.(value);
  });
  if (input) input.addEventListener('change', () => commit(shared, async () => {
    await beforeCommit?.();
    const value = makeValue ? makeValue(input.checked, field.value)
      : input.checked ? field.value | bit : field.value & ~bit;
    await field.set(value);
  }));
  shared.refresh();
  recordMountedControls(host, object, [field], 'input:checkbox');
  host.dataset.fieldObjectReady = object.id;
  return field;
}

function bindFieldObjectPicker(picker, object, {
  entityHandle, fieldName, label, allowedValues, beforeCommit, onStart, onSettled,
} = {}) {
  const field = object.fields.find(item => item.entityHandle === entityHandle
    && item.fieldName === fieldName);
  if (!field) throw new TypeError(`字段对象缺少选择控件：${entityHandle}/${fieldName}`);
  const host = picker.parentElement;
  if (!host) throw new TypeError('字段对象选择控件尚未挂载');
  if (!host.querySelector('[data-field-object-error]')) {
    const error = document.createElement('span');
    error.dataset.fieldObjectError = '';
    error.setAttribute('role', 'status');
    error.hidden = true;
    host.append(error);
  }
  const shared = controller(object);
  shared.hosts.add(new WeakRef(host));
  const control = document.createElement('span');
  control.className = 'field-object-inline';
  host.insertBefore(control, picker);
  control.append(picker);
  control.insertAdjacentHTML('beforeend', resetToOriginalButton(fieldKey(field), {
    attributes: {'data-field-object-reset': ''},
  }));
  const reset = control.querySelector('[data-field-object-reset]');
  field.bind(picker, (node, value) => {
    node.value = String(value);
    applyResetToOriginalStates(control, new Map([[fieldKey(field), field.hasOverride && !field.readOnly]]));
  });
  const change = (value, resetting = false) => commit(shared, async () => {
    onStart?.();
    let error = null;
    const changed = resetting ? field.hasOverride : field.value !== value;
    try {
      if (changed) {
        await beforeCommit?.(value, field, resetting);
        if (resetting) await field.reset({expectedVersion: field.version});
        else await field.set(value, {expectedVersion: field.version});
      }
    } catch (failure) {
      error = failure;
      throw failure;
    } finally {
      await onSettled?.(error, changed, resetting);
    }
  });
  if (field.readOnly) picker.setAttribute('disabled', '');
  else picker.addEventListener('change', () => {
    const value = Number(picker.value);
    if (!Number.isInteger(value) || !allowedValues.includes(value)) {
      shared.status(new TypeError(`${label || fieldName} 必须选择已发布的编号`));
      return;
    }
    change(value);
  });
  reset.addEventListener('click', () => change(undefined, true));
  shared.refresh();
  recordMountedControls(picker, object, [field], picker.tagName.toLowerCase());
  picker.dataset.fieldObjectReady = object.id;
  return field;
}

var fieldObjectEditor = /*#__PURE__*/Object.freeze({
  __proto__: null,
  bindFieldObjectPicker: bindFieldObjectPicker,
  bindFieldObjectPositionPicker: bindFieldObjectPositionPicker,
  bindFieldObjectProjections: bindFieldObjectProjections,
  fieldObjectInputMarkup: fieldObjectInputMarkup,
  fieldObjectProjectionMarkup: fieldObjectProjectionMarkup,
  mountFieldObjectArrayChoice: mountFieldObjectArrayChoice,
  mountFieldObjectArrayPosition: mountFieldObjectArrayPosition,
  mountFieldObjectArrayReference: mountFieldObjectArrayReference,
  mountFieldObjectAttackVisual: mountFieldObjectAttackVisual,
  mountFieldObjectBit: mountFieldObjectBit,
  mountFieldObjectBitmask: mountFieldObjectBitmask,
  mountFieldObjectChoice: mountFieldObjectChoice,
  mountFieldObjectColumns: mountFieldObjectColumns,
  mountFieldObjectEditor: mountFieldObjectEditor,
  mountFieldObjectElementReset: mountFieldObjectElementReset,
  mountFieldObjectField: mountFieldObjectField,
  mountFieldObjectFormationChoice: mountFieldObjectFormationChoice,
  mountFieldObjectInlineControls: mountFieldObjectInlineControls,
  mountFieldObjectMappedChoice: mountFieldObjectMappedChoice,
  mountFieldObjectNumber: mountFieldObjectNumber,
  mountFieldObjectNumericCodeValue: mountFieldObjectNumericCodeValue,
  mountFieldObjectRecordChoice: mountFieldObjectRecordChoice,
  mountFieldObjectReset: mountFieldObjectReset,
  mountFieldObjectSelect: mountFieldObjectSelect,
  mountFieldObjectSet: mountFieldObjectSet,
  mountFieldObjectText: mountFieldObjectText,
  mountLinkedFieldChoice: mountLinkedFieldChoice,
  mountSaveCurrentFieldObject: mountSaveCurrentFieldObject,
  mountedFieldControls: mountedFieldControls,
  renderSaveCurrentFieldObject: renderSaveCurrentFieldObject,
  saveNameFieldInputMarkup: saveNameFieldInputMarkup
});

// @editor-module 详情页字段值表与已登记物理片段的对账
//
// 字段定义与字节地图取并集；物理片段由记录页的折叠区显示。


function normalizedFieldDefinitions(fields) {
  if (!Array.isArray(fields)) {
    throw new TypeError("fields 必须是 [key, label] 或 {key, label} 的数组");
  }
  const keys = new Set();
  return fields.map(definition => {
    const key = String(Array.isArray(definition)
      ? definition[0] : definition?.key ?? "");
    if (!key) throw new TypeError("字段定义缺少 key");
    if (keys.has(key)) throw new TypeError(`字段定义重复：${key}`);
    keys.add(key);
    const rawLabel = Array.isArray(definition) ? definition[1] : definition?.label;
    return {key, label: String(rawLabel ?? key)};
  });
}

function normalizedFieldRoles(fieldRoles) {
  if (!Array.isArray(fieldRoles)) {
    throw new TypeError("fieldRoles 必须是 role 字符串数组");
  }
  const roles = new Set();
  for (const rawRole of fieldRoles) {
    const role = String(rawRole || "");
    if (!role) throw new TypeError("fieldRoles 不能包含空 role");
    if (roles.has(role)) throw new TypeError(`fieldRoles 重复：${role}`);
    roles.add(role);
  }
  return roles;
}

function declarationForRole(declarations, role) {
  if (declarations instanceof Map) return declarations.get(role) || null;
  if (!declarations || typeof declarations !== "object"
      || !Object.prototype.hasOwnProperty.call(declarations, role)) return null;
  return declarations[role] || null;
}

function slotLabel(range, declarations) {
  const declaration = declarationForRole(declarations, range.role);
  const declared = declaration?.label;
  if (typeof declared === "function") {
    return String(declared(range.slotIndex, range));
  }
  const base = String(declared || range.role || range.key);
  return range.slotIndex === null ? base : `${base} ${range.slotIndex + 1}`;
}

function rowFromRange(range, {key, label, origin, kind}) {
  return {
    key,
    label,
    origin,
    kind,
    role: range?.role || `field:${key}`,
    fieldKey: range?.fieldKey ?? (kind === "field" ? key : null),
    slotIndex: range?.slotIndex ?? null,
    hasRange: Boolean(range),
    address: range || null,
    space: range?.space || null,
    offset: range?.offset ?? null,
    length: range?.length ?? null,
    status: range?.status || null,
  };
}

/**
 * 对账字段定义与物理片段，并返回表格行。
 *
 * `fields` 保持调用方顺序；同 key 有多段地址时每段各占一行。范围侧独有的
 * `field:` 以及声明展开后的槽行接在其后。`valueFor(row)` 返回值单元格 HTML。
 * `fieldRoles` 可把调用方指定的非 `field:` role 按同名字段参与对账；默认不启用，
 * 原语本身不认识任何业务 role。
 */
function reconcileFieldAddressRows({
  uid,
  fields = [],
  fieldRoles = [],
  slotDeclarations = {},
  valueFor = () => null,
} = {}) {
  if (typeof valueFor !== "function") throw new TypeError("valueFor 必须是函数");
  const definitions = normalizedFieldDefinitions(fields);
  const declaredFieldRoles = normalizedFieldRoles(fieldRoles);
  const ranges = expandResourceByteRangeSlots(uid, slotDeclarations).map(range =>
    range.fieldKey === null && declaredFieldRoles.has(range.role)
      ? {...range, key: range.role, fieldKey: range.role}
      : range
  );
  const fieldRanges = ranges.filter(
    range => range.fieldKey !== null && range.slotIndex === null,
  );
  const otherRanges = ranges.filter(
    range => range.fieldKey === null || range.slotIndex !== null,
  );
  const rangesByField = new Map();
  for (const range of fieldRanges) {
    if (!rangesByField.has(range.fieldKey)) rangesByField.set(range.fieldKey, []);
    rangesByField.get(range.fieldKey).push(range);
  }

  const declaredKeys = new Set(definitions.map(definition => definition.key));
  const rows = [];
  for (const definition of definitions) {
    const matches = rangesByField.get(definition.key) || [];
    if (!matches.length) {
      rows.push(rowFromRange(null, {
        ...definition,
        origin: "definition",
        kind: "field",
      }));
      continue;
    }
    for (const range of matches) {
      rows.push(rowFromRange(range, {
        ...definition,
        origin: "definition+range",
        kind: "field",
      }));
    }
  }
  for (const range of fieldRanges) {
    if (declaredKeys.has(range.fieldKey)) continue;
    rows.push(rowFromRange(range, {
      key: range.fieldKey,
      label: range.fieldKey,
      origin: "range",
      kind: "field",
    }));
  }
  for (const range of otherRanges) {
    const label = slotLabel(range, slotDeclarations);
    const key = range.key || range.role;
    if (!key || !label) continue;
    rows.push(rowFromRange(range, {
      key,
      label,
      origin: "range",
      kind: range.slotIndex === null ? "range" : "slot",
    }));
  }

  return rows.map((row, index) => {
    const identified = {...row, id: `${row.kind}:${row.key}:${index}`};
    return {...identified, value: valueFor(identified)};
  });
}

function fieldCell(row) {
  const key = `<small class="mono">${esc(row.key)}</small>`;
  return `<div class="table-cell-stack" data-field-address-key="${esc(row.key)}">
    <b>${esc(row.label)}</b>${row.label === row.key ? "" : key}
  </div>`;
}

function valueCell(row) {
  return row.value === null || row.value === undefined || row.value === ""
    ? '<span class="resource-empty">—</span>' : String(row.value);
}

function statusCell(row) {
  return row.hasRange
    ? `<span data-field-address-status="${esc(row.status || "未分级")}">${
      esc(row.status || "未分级")
    }</span>`
    : '<span class="resource-unregistered" data-field-address-status="未登记">未登记</span>';
}

const FIELD_ADDRESS_COLUMNS = [
  {key: "label", label: "字段", width: 190, sticky: true, cell: fieldCell},
  {key: "value", label: "值", width: 180, wrap: true, cell: valueCell},
  {key: "status", label: "状态", width: 110, cell: statusCell},
];

/**
 * 构造详情页字段地址表。
 *
 * `dataTable` 会把字段行数写成“记录数”；这对详情页是错误语义。因此表生成后用
 * 调用方给的 `pageStatus` 覆盖四个状态槽，默认全部清空，上一页状态也不会残留。
 * 已按用途分块的页面可传入 reconcileFieldAddressRows 的 rows 子集，其余行由各块展示。
 */
function fieldAddressTable({pageStatus = {}, rows = null, showStatus = true, ...options} = {}) {
  rows ??= reconcileFieldAddressRows(options);
  const markup = dataTable({
    columns: showStatus ? FIELD_ADDRESS_COLUMNS : FIELD_ADDRESS_COLUMNS.filter(column => column.key !== "status"),
    rows,
    rowId: row => row.id,
    empty: "没有字段或物理片段",
  });
  setStatus({...pageStatus, address: ""});
  return `<div class="field-address-table" data-field-address-table
    data-field-address-row-count="${rows.length}">${markup}</div>`;
}

// @editor-module 人物与战车共用的实体详情分组。


function entityDetailFieldTableMarkup({fields = [], pageStatus = null} = {}) {
  const has = key => fields.some(field => field[key] !== undefined);
  const columns = [
    {key: "label", label: "字段", width: 230, sticky: true,
      cell: field => field.labelMarkup || esc(field.label || field.id)},
    {key: "value", label: "当前值", width: 340, wrap: true,
      cell: field => field.valueMarkup ?? "—"},
    ...(has("resetMarkup") ? [{key: "reset", label: "", title: "恢复原值", width: 36, reset: true,
      cell: field => field.resetMarkup ?? ""}] : []),
  ];
  const markup = dataTable({reportStatus: false, rows: fields,
    rowId: field => field.id, columns});
  if (pageStatus) setStatus({...pageStatus, address: ""});
  return `<div class="entity-detail-field-table"${pageStatus
    ? ` data-field-address-table data-field-address-row-count="${fields.length}"` : ""}>${markup}</div>`;
}

const equipmentStyle = `<style>
  .record-grid > .entity-detail-page {
    grid-column: 1 / -1;
    min-width: 0;
  }
  .entity-detail-page .entity-equipment-heading,
  .entity-detail-page .entity-equipment-row {
    grid-template-columns: 94px minmax(190px, 1.5fr) minmax(136px, 1fr) minmax(82px, .55fr) minmax(116px, auto);
    gap: 10px;
    min-width: 680px;
    padding: 6px 8px;
  }
  .entity-detail-page .entity-equipment--inventory .entity-equipment-heading,
  .entity-detail-page .entity-equipment--inventory .entity-equipment-row {
    grid-template-columns: 94px minmax(190px, 1.1fr) minmax(220px, 1fr) minmax(130px, .55fr);
  }
  .entity-detail-page .entity-equipment-row > [role="cell"]:last-child {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  .entity-detail-page .entity-equipment-row > [role="cell"]:first-child {
    font-weight: 600;
    white-space: nowrap;
  }
  .entity-detail-page .entity-equipment-row > [role="cell"]:first-child small {
    font-weight: 400;
  }
</style>`;

function entityDetailEquipmentMarkup({rows = [], inventory = false} = {}) {
  const headings = inventory ? ["携带槽", "物品", "战斗文本", "操作"]
    : ["携带槽", "物品", "所在槽", "状态", "操作"];
  return `${equipmentStyle}<div class="entity-equipment${inventory ? " entity-equipment--inventory" : ""}" role="table">
    <div class="entity-equipment-heading" role="row">${headings.map(label =>
      `<b role="columnheader">${esc(label)}</b>`).join("")}</div>
    ${rows.map(row => `<div class="entity-equipment-row" role="row" data-entity-equipment-row="${esc(row.id)}" ${row.attributes || ""}>
      <span role="cell">${row.labelMarkup || esc(row.label)}</span>
      <div role="cell">${row.itemMarkup || "—"}</div>
      ${inventory ? `<div role="cell">${row.statusMarkup || "—"}</div>`
    : `<div role="cell">${row.stateMarkup || "—"}</div>
      <div role="cell">${row.statusMarkup || "—"}</div>`}
      <div role="cell">${row.actionsMarkup ?? `${row.resetMarkup || ""}${row.previewMarkup || ""}`}</div>
    </div>`).join("")}</div>`;
}

function entityDetailPageMarkup({title, sections = [], heading = true, physicalRows = []} = {}) {
  return `<div class="entity-detail-page record-panel--wide">${heading
    ? `<header class="entity-detail-heading"><h2>${esc(title)}</h2></header>` : ""}
    ${entityDetailSectionsMarkup({sections})}${physicalRows.length
      ? physicalLocationMarkup({rows: physicalRows}) : ""}</div>`;
}

function entityAddressFields(rows) {
  return rows.map(row => ({
    id: row.id,
    label: row.label,
    labelMarkup: `<div class="table-cell-stack" data-field-address-key="${esc(row.key)}">
      <b>${esc(row.label)}</b>${row.label === row.key ? ""
        : `<small class="mono">${esc(row.key)}</small>`}</div>`,
    valueMarkup: row.value === null || row.value === undefined || row.value === ""
      ? '<span class="resource-empty">—</span>' : String(row.value),
  }));
}

const SECTION_ORDER = ["appearance", "fields", "equipment", "equipment-state",
  "inventory", "shells", "crew", "placement", "other"];

function entityDetailSection(id, label, content, {wide = true, flat = true} = {}) {
  return {id, label, content, wide, flat};
}

function entityDetailPanel(label, content, options = {}) {
  const id = /视觉绑定|形象|立绘/.test(label) ? "appearance"
    : /装备|携带物|战斗预览/.test(label) ? "equipment"
      : /停放|位置/.test(label) ? "placement" : "other";
  return entityDetailSection(id, label, content, options);
}

function entityDetailSectionsMarkup({sections = []} = {}) {
  const ordered = sections.filter(section => section?.content || section?.fields)
    .map((section, index) => ({section, index})).sort((left, right) => {
      const rank = entry => {
        if (Number.isFinite(entry.section.order)) return entry.section.order;
        const value = SECTION_ORDER.indexOf(entry.section.kind || entry.section.id);
        return value < 0 ? SECTION_ORDER.length : value;
      };
      return rank(left) - rank(right) || left.index - right.index;
    });
  return `<div class="entity-detail-groups">${ordered.map(({section}) =>
    `<section class="record-panel entity-detail-group${section.wide ? " record-panel--wide" : ""}${
      section.flat ? " record-panel--flat" : ""}"
      ${section.anchor ? `id="${esc(section.anchor)}"` : ""}
      data-entity-detail-group="${esc(section.id)}">
      <h3>${esc(section.label)}${section.headingSuffixMarkup || ""}</h3>
      ${section.renderFields ? section.renderFields(section.fields || []) : section.content}
    </section>`).join("")}</div>`;
}

function entityDetailSelectorMarkup({entities = [], selected = "", componentAttributes = ""} = {}) {
  return `<div class="entity-detail-layout" ${componentAttributes}>
    <nav class="entity-detail-list" aria-label="实体列表">${entities.map(entity =>
      `<button type="button" data-entity-detail-select="${esc(entity.id)}"
        aria-current="${entity.id === selected ? "page" : "false"}">
        ${entity.previewMarkup || ""}<span>${esc(entity.label)}</span>
      </button>`).join("")}</nav>
    <div class="entity-detail-content">${entities.map(entity =>
      `<section data-entity-detail="${esc(entity.id)}"${entity.id === selected ? "" : " hidden"}>
        ${entityDetailPageMarkup({title: entity.label, sections: entity.groups,
          physicalRows: entity.physicalRows || []})}
      </section>`).join("")}</div>
  </div>`;
}

function bindEntityDetailSelector(root) {
  if (!root) return;
  root.querySelectorAll("[data-entity-detail-select]").forEach(button => {
    button.addEventListener("click", () => {
      const selected = button.dataset.entityDetailSelect;
      root.querySelectorAll("[data-entity-detail-select]").forEach(candidate =>
        candidate.setAttribute("aria-current", String(candidate === button ? "page" : "false")));
      root.querySelectorAll("[data-entity-detail]").forEach(detail => {
        detail.hidden = detail.dataset.entityDetail !== selected;
      });
    });
  });
}

// @editor-module 设施配置所属控件使用已发布的槽位用途与引用命名空间。

async function mountFacilityConfigurationControls(host, object, options) {
  const [document, facilities] = await Promise.all([
    object.database.getDocument('facility-config'), object.database.getDocument('project.facilities'),
  ]);
  const family = document.families.find(row => row.records.some(record => record.record_id === object.id));
  const entry = facilities.configuration_loader.pointer_entries.find(row => Number(row.family_id) === Number(family.id));
  const namespace = entry.value_namespace;
  const columns = object.definition.editor.columns.map(column => {
    if (!column.name.startsWith('slot:')) return column;
    const slot = Number(column.name.slice(5));
    const schema = namespace?.slot_schema?.slots.find(row => Number(row.slot) === slot);
    const domain = schema?.namespace || (namespace?.slot_schema ? null : namespace?.namespace);
    const label = schema?.label || `${namespace?.goods_label || '项目'} ${slot + 1}`;
    const base = {...column, label};
    if (Number(family.id) === 0x0a) return {...base,
      candidates: {resourceId: 'audio-command', documentPath: ['records'], value: ['id'], label: ['label', 'id'],
        filter: {path: ['id'], values: namespace.goods.map(row => Number(row.value))}}};
    if (domain === 'item') return {...base, semantic: {kind: 'reference', targetModule: 'item-entry'},
      candidates: {resourceId: 'item-entry', documentPath: ['records'], value: ['id'], label: ['name', 'id']}};
    if (domain === 'shell') return {...base, semantic: {kind: 'reference', targetModule: 'shell-record'},
      candidates: {resourceId: 'shell-record', documentPath: ['records'], value: ['id'], label: ['name', 'id']}};
    if (domain === 'service-goods') return {...base, candidates: {document: 'project.facilities',
      documentPath: ['configuration_loader', 'pointer_entries', facilities.configuration_loader.pointer_entries.indexOf(entry),
        'value_namespace', 'goods'], value: ['value'], label: ['value'], textReference: ['text_record']}};
    return base;
  });
  return mountFieldObjectEditor(host, {...object, definition: {...object.definition,
    editor: {...object.definition.editor, columns}}}, options);
}

var facilityConfigurationControls = /*#__PURE__*/Object.freeze({
  __proto__: null,
  mountFacilityConfigurationControls: mountFacilityConfigurationControls
});

// @editor-module 清除矩形控件通过所属字段对象转换坐标并同笔修改原点与尺寸。

function mountWindowClearSelectorControls(host, object) {
  const field = object.fields[0];
  host.innerHTML = `${writeAccessMarker({writebackMissing: field.writeback?.state === 'unpermitted'})}
    <span data-window-clear-choice></span>${resetToOriginalButton(object.id)}`;
  mountLinkedFieldChoice(host.querySelector('[data-window-clear-choice]'), object, [field.fieldName],
    fieldOwner(object.resourceId).windowClearChoices.map(value => ({values: [value],
      label: `预设 ${value.toString(16).toUpperCase().padStart(2, '0')}`})), {label: '确认窗口'});
  bindFieldResetToOriginalButtons(host, new Map([[object.id, field]]));
  host.dataset.fieldObjectReady = object.id;
}

async function mountRectanglePresetControls(host, object, {rectanglePreset, transferPreset, onValue = () => {}}) {
  const database = object.database, resource = object.resourceId, owner = fieldOwner(resource);
  const transfer = Boolean(transferPreset), id = transferPreset || rectanglePreset;
  const document = await database.getResourceDocument(resource);
  const preset = (transfer ? document.tile_transfer_presets : document.rectangle_presets).find(preset => preset.id === id);
  if (!preset) throw new TypeError(`矩形预设 ${id} 未发布`);
  const objects = await Promise.all([preset.origin_block, transfer ? preset.geometry_block : preset.dimensions_block]
    .map(name => database.getFieldObject(resource, `${resource}:${name}`)));
  const fields = objects.flatMap(object => object.fields);
  const columns = [['column', '来源列', 0, 31], ['row', '来源行', 0, 31], ['width', '宽度', 1, 32], ['rows', '行数', 1, 32],
    ...(transfer ? [['destinationColumn', '目标列', 0, 31], ['destinationRow', '目标行', 0, 29]] : [])];
  host.innerHTML = `<div data-rectangle-preset="${esc(id)}"><code>${esc(resource)}:${esc(id)}</code>
    ${fields.some(field => field.writeback?.state === 'unpermitted') ? writeAccessMarker({writebackMissing: true}) : ''}
    ${columns
      .map(([name, label, min, max]) => `<label>${label}<input type="number" data-rectangle-value="${name}" min="${min}" max="${max}" step="1"></label>`).join('')}
    ${resetToOriginalButton(id)}<canvas width="256" height="256" data-rectangle-preview aria-label="矩形范围预览"></canvas></div>`;
  let generation = 0, pending = 0, writes = Promise.resolve();
  const sync = async () => {
    const current = ++generation;
    const document = await database.getResourceDocument(resource);
    const rectangle = transfer ? owner.tileTransferPreset(document, id) : owner.rectanglePreset(document, id);
    if (current !== generation || !host.isConnected) return;
    const values = {column: rectangle.logical_origin % 32, row: Math.floor(rectangle.logical_origin / 32),
      width: rectangle.width_tiles, rows: rectangle.rows,
      destinationColumn: rectangle.column_offset, destinationRow: rectangle.row_offset};
    for (const input of host.querySelectorAll('[data-rectangle-value]')) input.value = values[input.dataset.rectangleValue];
    applyResetToOriginalStates(host, new Map([[id, fields.some(field => field.hasOverride)]]), {busy: pending > 0});
    const context = host.querySelector('[data-rectangle-preview]').getContext('2d');
    context.fillStyle = '#111'; context.fillRect(0, 0, 256, 256);
    context.strokeStyle = '#444'; context.lineWidth = 1;
    for (let line = 0; line <= 256; line += 8) {
      context.beginPath(); context.moveTo(line, 0); context.lineTo(line, 256); context.stroke();
      context.beginPath(); context.moveTo(0, line); context.lineTo(256, line); context.stroke();
    }
    context.fillStyle = '#84b8ff88';
    context.fillRect(values.column * 8, values.row * 8, values.width * 8, values.rows * 8);
    if (transfer) {
      context.strokeStyle = '#f8ce59'; context.lineWidth = 2;
      context.strokeRect(values.destinationColumn * 8 + 1, values.destinationRow * 8 + 1,
        values.width * 8 - 2, values.rows * 8 - 2);
    }
  };
  const perform = action => {
    pending++;
    writes = writes.then(action).then(() => {
      host.querySelector('[data-editor-error-block]')?.remove();
      return onValue();
    })
      .catch(error => showEditorError(host, '清除矩形', error)).finally(async () => {pending--; await sync();});
  };
  for (const input of host.querySelectorAll('[data-rectangle-value]')) input.addEventListener('change', () => {
    if ([...host.querySelectorAll('[data-rectangle-value]')].some(input => !input.checkValidity() || input.value === '')) return;
    const geometry = Object.fromEntries([...host.querySelectorAll('[data-rectangle-value]')]
      .map(input => [input.dataset.rectangleValue, Number(input.value)]));
    perform(async () => {
      const document = await database.getResourceDocument(resource);
      const changes = transfer ? owner.tileTransferFieldChanges(document, id, geometry)
        : owner.rectangleFieldChanges(document, id, geometry);
      await database.writeFields(changes.map(change => ({field: fields.find(field =>
        field.entityHandle === change.entityHandle && field.fieldName === change.fieldName), value: change.value})));
    });
  });
  host.querySelector('[data-reset-to-original]').addEventListener('click', () =>
    perform(() => database.writeFields(fields.map(field => ({field, value: field.defaultValue, reset: true})))));
  for (const field of fields) field.bind(host, () => {void sync();});
  await sync();
  host.dataset.fieldObjectReady = object.id;
}

var rectanglePresetControls = /*#__PURE__*/Object.freeze({
  __proto__: null,
  mountRectanglePresetControls: mountRectanglePresetControls,
  mountWindowClearSelectorControls: mountWindowClearSelectorControls
});

export { attackVisualAssets, attackVisualOptionLabel, bindEntityDetailSelector, bindFieldObjectPicker, bindFieldObjectPositionPicker, bindFieldObjectProjections, configureAttackVisualPicker, configureSceneMetatileSelector, entityAddressFields, entityDetailEquipmentMarkup, entityDetailFieldTableMarkup, entityDetailPageMarkup, entityDetailPanel, entityDetailSection, entityDetailSelectorMarkup, facilityConfigurationControls, fieldAddressTable, fieldObjectEditor, fieldObjectInputMarkup, fieldObjectProjectionMarkup, labeledBitmaskMarkup, mountFieldObjectArrayChoice, mountFieldObjectArrayPosition, mountFieldObjectArrayReference, mountFieldObjectAttackVisual, mountFieldObjectBit, mountFieldObjectBitmask, mountFieldObjectChoice, mountFieldObjectColumns, mountFieldObjectEditor, mountFieldObjectElementReset, mountFieldObjectField, mountFieldObjectFormationChoice, mountFieldObjectInlineControls, mountFieldObjectMappedChoice, mountFieldObjectNumber, mountFieldObjectNumericCodeValue, mountFieldObjectRecordChoice, mountFieldObjectReset, mountFieldObjectSelect, mountFieldObjectSet, mountFieldObjectText, mountLinkedFieldChoice, mountedFieldControls, reconcileFieldAddressRows, rectanglePresetControls, renderSaveCurrentFieldObject, saveNameFieldInputMarkup, setSceneMetatileValue };
