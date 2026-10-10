import { showEditorError, requireBrowserProjectRepository, esc, uiPaintPattern, currentTextReferenceLink } from './interface-state-preview-Dlotqlmn.js';
import { bindScenePreview, handleTextMarkup } from './record-6_wsSDi2.js';
import { eventFlagTextMarkup } from './scene-encounter-probabilities-C0m_IdC-.js';
import { state } from './emulator-Bpa8EsFw.js';
import { TEXT_RECORDS_RESOURCE_ID, db, textRecordProtectedReplacementAllowed, flushAllAutoSaves, textRecord, textRecordFixedTileValueAllowed, invalidateTextRecordsValidation, trackProjectFieldProjection, projectFieldDraftOrigin, applyCurrentTextReferencesToProject, textRecordComponents } from './prg-loaders-DnCSmXk9.js';
import { bindInterfacePreviewScene, uiTextComponentLabel, interfaceStateWorkbench, interfacePreviewSceneMarkup } from './story-component-labels-CSjCRgXX.js';
import { bindScreenWorkbenchZoom, elementTree, screenWorkbenchCanvasStage, screenWorkbench, rerenderElementTreeKeepingSelectionVisible, defineElementTreeTypes, ELEMENT_TREE_ICONS, ELEMENT_TREE_LABELS } from './element-tree-C1bWRgTl.js';
import { bindCanvasPickerPreview, bindFixedTextEditors, fixedTextEditorMarkup } from './timeline-player-YCH7Y-3h.js';
import { bindFieldResetToOriginalButtons, resetToOriginalButton, PICKER_TILES, outlineBox, PICKER_COLUMNS } from './battle-result-script-runtime-BSeJpUGH.js';
import { invalidateTextCatalogDocument, textCatalogDocument } from './charset-j6-kYKbE.js';
import { uiJsRenderSources } from './ui-construction-preview-BuoQ5mM6.js';
import { textRecordStructureEditorMarkup } from './text-record-structure-editor-BB8pdofu.js';

// @editor-module text-record 内固定图块的共用图像组件
//
// 有些界面字段名不是文字，而是脚本直接输出的一组 UI 图块。本组件只接收文本
// 资产模块已经定位好的 fixed-tile 范围，统一负责图块预览、图案表选择、保存与
// 局部还原；消费页面不接触图块编号或字节位置。


const cloneJson = value => typeof structuredClone === "function"
  ? structuredClone(value) : JSON.parse(JSON.stringify(value));

const oneByte = value => {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 0xFF) {
    throw new TypeError("图块编号必须是 0–255 的整数");
  }
  return number;
};

function fixedTileOffsets(document_, recordId, ranges) {
  const record = textRecord(document_, recordId);
  if (!record) throw new TypeError("当前项目没有这条固定图块记录");
  if (!Array.isArray(ranges) || !ranges.length) {
    throw new TypeError("图像组件没有 fixed-tile 范围");
  }
  const fixed = new Set((record.protected_ranges || [])
    .filter(range => range.kind === "fixed-tile")
    .flatMap(range => Array.from(
      {length: Number(range.length)},
      (_, index) => Number(range.offset) + index,
    )));
  const offsets = ranges.flatMap((range, rangeIndex) => {
    const offset = Number(range?.offset);
    const length = Number(range?.length);
    if (!Number.isInteger(offset) || !Number.isInteger(length) || length < 1) {
      throw new TypeError(`固定图块范围 ${rangeIndex} 无效`);
    }
    return Array.from({length}, (_, index) => offset + index);
  });
  if (!offsets.length || offsets.some(offset => !fixed.has(offset))) {
    throw new TypeError("图像组件范围包含非 fixed-tile 字节");
  }
  return {record, offsets};
}

/** Update exactly one tile slot while preserving the rest of the text script. */
function installFixedTileValue(
  document_, recordId, ranges, slotIndex, tile
) {
  const {record, offsets} = fixedTileOffsets(document_, recordId, ranges);
  const index = Number(slotIndex);
  if (!Number.isInteger(index) || index < 0 || index >= offsets.length) {
    throw new TypeError("固定图块槽位超出组件范围");
  }
  const value = oneByte(tile);
  if (!textRecordFixedTileValueAllowed(value)) {
    throw new TypeError("这个编号会被文字脚本解释为命令或字形前缀，不能作为固定图块");
  }
  record.bytes[offsets[index]] = value;
  invalidateTextRecordsValidation(document_);
  return {record, offsets, offset: offsets[index], tile: value, slotIndex: index};
}

function tileHex(value) {
  return oneByte(value).toString(16).toUpperCase().padStart(2, "0");
}

function fixedTileState(editor, message, {invalid = false} = {}) {
  const status = editor?.querySelector?.("[data-fixed-tile-save-state]");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("invalid", invalid);
}

function serializedRangesFrom(element) {
  return JSON.parse(String(element?.dataset.fixedTileRanges || "[]"));
}

function fixedTileEditorMarkup({
  recordId,
  editorId = recordId,
  ranges,
  document: document_ = state.project?.text_record_edits,
  label = "图像字段名",
  description = "固定 UI 图块",
  className = "",
} = {}) {
  const id = String(recordId || "");
  const editor = String(editorId || id);
  let values = [];
  let failure = "";
  try {
    const resolved = document_ ? fixedTileOffsets(document_, id, ranges) : null;
    if (!resolved) return "";
    values = resolved.offsets.map(offset => resolved.record.bytes[offset]);
  } catch (error) {
    failure = error?.message || String(error);
  }
  const serializedRanges = JSON.stringify(ranges || []);
  const enabled = values.length > 0 && !failure;
  const slots = values.map((tile, index) => `<button type="button"
      class="fixed-tile-slot${index === 0 ? " is-active" : ""}"
      data-fixed-tile-slot="${index}" title="选择第 ${index + 1} 个图块">
      <canvas width="8" height="8" data-fixed-tile-preview="${index}"
        aria-label="第 ${index + 1} 个固定图块"></canvas>
      <small data-fixed-tile-value="${index}">图块 ${tileHex(tile)}</small>
    </button>`).join("");
  return `<div class="fixed-tile-editor${className ? ` ${esc(className)}` : ""}"
    data-fixed-tile-editor="${esc(editor)}"
    data-fixed-tile-record="${esc(id)}"
    data-fixed-tile-ranges="${esc(serializedRanges)}"
    data-fixed-tile-active="0" title="${esc(description)}">
    <div class="fixed-tile-editor-heading"><b>${esc(label)}</b><small>${esc(id)}</small></div>
    ${failure ? `<p class="fixed-tile-editor-error">${esc(failure)}</p>` : `
      <div class="fixed-tile-slots">${slots}</div>
      <details class="fixed-tile-choice">
        <summary>选择 UI 图块</summary>
        <div class="fixed-tile-choice-panel">
          <label class="module-reference-picker-filter">图块编号
            <input type="search" data-fixed-tile-search placeholder="十进制或 0x 十六进制"></label>
          <nav class="module-reference-picker-groups" aria-label="图块分组">
            <button type="button" data-fixed-tile-group="" aria-pressed="true">全部</button>
            ${[0, 1, 2, 3].map(group => `<button type="button" data-fixed-tile-group="${group}"
              aria-pressed="false">${group * 64}–${group * 64 + 63}</button>`).join("")}
          </nav>
          <label class="fixed-tile-picker-field" title="暗色图块不可用于当前字段"><span>UI 图案表</span>
            <canvas width="128" height="128" data-fixed-tile-picker
              aria-label="选择 UI 图块"></canvas>
          </label>
        </div>
      </details>`}
    <div class="fixed-tile-editor-actions">
      <span data-fixed-tile-save-state aria-live="polite"></span>
      ${resetToOriginalButton(editor, {
        title: "把这个图块恢复到 Original；同一资源里的其他编辑保留",
        disabled: !enabled,
      })}
    </div>
  </div>`;
}

function paintFixedTileEditor(editor, sources) {
  const document_ = editor.__fixedTileDocument?.() || null;
  const recordId = String(editor.dataset.fixedTileRecord || "");
  const ranges = serializedRangesFrom(editor);
  const {record, offsets} = fixedTileOffsets(document_, recordId, ranges);
  const active = Math.max(
    0,
    Math.min(offsets.length - 1, Number(editor.dataset.fixedTileActive) || 0),
  );
  editor.dataset.fixedTileActive = String(active);
  editor.querySelectorAll("[data-fixed-tile-slot]").forEach(button => {
    const index = Number(button.dataset.fixedTileSlot);
    const tile = record.bytes[offsets[index]];
    button.classList.toggle("is-active", index === active);
    const canvas = button.querySelector("[data-fixed-tile-preview]");
    const context = canvas?.getContext("2d");
    if (context) {
      const image = context.createImageData(8, 8);
      uiPaintPattern(
        image.data, 8, 8, sources.patterns, sources.corePatterns,
        tile, 0, 0,
      );
      context.putImageData(image, 0, 0);
    }
    const value = button.querySelector("[data-fixed-tile-value]");
    if (value) value.textContent = `图块 ${tileHex(tile)}`;
  });
  const picker = editor.querySelector("[data-fixed-tile-picker]");
  const context = picker?.getContext("2d");
  if (context) {
    const image = context.createImageData(128, 128);
    for (let tile = 0; tile < PICKER_TILES; tile += 1) {
      const originX = (tile % PICKER_COLUMNS) * 8;
      const originY = Math.floor(tile / PICKER_COLUMNS) * 8;
      uiPaintPattern(
        image.data, 128, 128, sources.patterns, sources.corePatterns,
        tile, originX, originY,
      );
      if (!editor.__fixedTileAllowed?.(offsets[active], tile)) {
        for (let y = 0; y < 8; y += 1) {
          for (let x = 0; x < 8; x += 1) {
            const pixel = ((originY + y) * 128 + originX + x) * 4;
            image.data[pixel] = Math.floor(image.data[pixel] * 0.28);
            image.data[pixel + 1] = Math.floor(image.data[pixel + 1] * 0.28);
            image.data[pixel + 2] = Math.floor(image.data[pixel + 2] * 0.28);
          }
        }
      }
    }
    const tile = record.bytes[offsets[active]];
    outlineBox(image, {
      x: (tile % PICKER_COLUMNS) * 8,
      y: Math.floor(tile / PICKER_COLUMNS) * 8,
      width: 8,
      height: 8,
    });
    context.putImageData(image, 0, 0);
    const group = editor.dataset.fixedTileGroup;
    if (group !== undefined && group !== "") {
      context.fillStyle = "rgb(0 0 0 / 70%)";
      const firstRow = Number(group) * 4;
      context.fillRect(0, 0, 128, firstRow * 8);
      context.fillRect(0, (firstRow + 4) * 8, 128, (12 - firstRow) * 8);
    }
    const search = String(editor.dataset.fixedTileSearch || "").trim();
    const sought = /^0x[0-9a-f]+$/iu.test(search) ? Number.parseInt(search.slice(2), 16)
      : /^\d+$/u.test(search) ? Number(search) : null;
    if (Number.isInteger(sought) && sought >= 0 && sought < PICKER_TILES) {
      context.strokeStyle = "#ffdf61";
      context.lineWidth = 1;
      context.strokeRect((sought % PICKER_COLUMNS) * 8 + 0.5,
        Math.floor(sought / PICKER_COLUMNS) * 8 + 0.5, 7, 7);
    }
  }
}

function bindFixedTileEditors(root, {
  database = db,
  getDocument = () => state.project?.text_record_edits || null,
  getRepository = () => requireBrowserProjectRepository(state),
  getRenderSources,
  onDraft = () => {},
  onSaved = async () => {},
  onReset = async () => {},
} = {}) {
  if (!root) return null;
  const editors = [...root.querySelectorAll("[data-fixed-tile-editor]")];
  if (!editors.length) return null;
  if (typeof getRenderSources !== "function") {
    throw new TypeError("固定图块编辑器需要 UI 图案表渲染源");
  }
  let generation = 0;
  let latestGeneration = 0;
  const repository = getRepository();
  const project = state.project, revision = state.browserProjectManifest?.active_original_revision_id;
  const assertSession = () => {
    if (getRepository() !== repository || state.projectRepository !== repository || state.project !== project
        || state.browserProjectManifest?.active_original_revision_id !== revision)
      throw new Error("项目会话已切换，请重新打开图块编辑器");
  };
  const sourcesPromise = Promise.resolve().then(getRenderSources);
  for (const editor of editors) editor.__fixedTileDocument = getDocument;

  const paint = async editor => {
    try {
      paintFixedTileEditor(editor, await sourcesPromise);
    } catch (error) {
      fixedTileState(
        editor, `图块预览失败：${error?.message || error}`, {invalid: true},
      );
    }
  };
  editors.forEach(editor => {
    const canvas = editor.querySelector('[data-fixed-tile-picker]');
    const current = () => {
      const {record, offsets} = fixedTileOffsets(editor.__fixedTileDocument(),
        editor.dataset.fixedTileRecord, serializedRangesFrom(editor));
      return {record, offset: offsets[Number(editor.dataset.fixedTileActive) || 0]};
    };
    bindCanvasPickerPreview(canvas, {list: canvas?.closest('.fixed-tile-picker-field'),
      label: tile => `图块 ${tileHex(tile)}`,
      selected: () => current().record.bytes[current().offset],
      allowed: tile => editor.dataset.fixedTileFieldsReady === 'true'
        && editor.__fixedTileAllowed(current().offset, tile),
      onConfirm: async tile => {
        try {await save(editor, Number(editor.dataset.fixedTileActive) || 0, tile);}
        catch (error) {
          showEditorError(editor, `固定图块 ${editor.dataset.fixedTileRecord} 写入失败`, error);
          return false;
        }
      },
    });
    void paint(editor);
  });
  root.addEventListener("input", event => {
    if (!event.target.matches?.("[data-fixed-tile-search]")) return;
    const editor = event.target.closest("[data-fixed-tile-editor]");
    editor.dataset.fixedTileSearch = event.target.value;
    void paint(editor);
  });
  root.addEventListener("click", event => {
    const button = event.target.closest?.("[data-fixed-tile-group]");
    if (!button) return;
    const editor = button.closest("[data-fixed-tile-editor]");
    editor.dataset.fixedTileGroup = button.dataset.fixedTileGroup;
    editor.querySelectorAll("[data-fixed-tile-group]").forEach(candidate =>
      candidate.setAttribute("aria-pressed", String(candidate === button)));
    void paint(editor);
  });

  const save = (editor, slotIndex, tile) => {
    const recordId = String(editor.dataset.fixedTileRecord || "");
    const ranges = serializedRangesFrom(editor);
    const changeGeneration = ++generation;
    latestGeneration = changeGeneration;
    const draft = cloneJson(getDocument());
    const change = installFixedTileValue(
      draft, recordId, ranges, slotIndex, tile,
    );
    onDraft({document: draft, recordId, ranges, change, editor, root});
    fixedTileState(editor, "正在保存…");
    void paint(editor);
    // 排队、等待与重试都归字段层那一条链（`core/project-db.js`）：这里只发一笔。
    return (async () => {
      try {
        assertSession();
        const field = await database.getField(TEXT_RECORDS_RESOURCE_ID, recordId, "bytes");
        assertSession();
        const value = [...field.value];
        value[change.offset] = change.tile;
        await field.set(value, {selection: [{offset: change.offset, length: 1}]});
        const saved = await database.readResource(TEXT_RECORDS_RESOURCE_ID);
        await onSaved({saved, recordId, ranges, change, editor, root});
        if (latestGeneration === changeGeneration && editor.isConnected) {
          fixedTileState(editor, "已保存");
          await paint(editor);
        }
      } catch (error) {
        if (latestGeneration === changeGeneration && editor.isConnected) {
          fixedTileState(
            editor, `保存失败：${error?.message || error}`, {invalid: true},
          );
        }
        throw error;
      }
    })();
  };

  root.addEventListener("click", event => {
    const slot = event.target.closest?.("[data-fixed-tile-slot]");
    if (slot) {
      const editor = slot.closest("[data-fixed-tile-editor]");
      editor.dataset.fixedTileActive = slot.dataset.fixedTileSlot;
      void paint(editor);
      return;
    }
  });
  const ready = Promise.all(editors.map(async editor => {
    const recordId = editor.dataset.fixedTileRecord, ranges = serializedRangesFrom(editor);
    const buttons = [...editor.querySelectorAll("[data-reset-to-original]")];
    buttons.forEach(button => {button.disabled = true;});
    const original = await repository.getOriginal(TEXT_RECORDS_RESOURCE_ID);
    const field = await database.getField(TEXT_RECORDS_RESOURCE_ID, recordId, "bytes");
    assertSession();
    editor.__fixedTileAllowed = (offset, tile) =>
      textRecordProtectedReplacementAllowed(original.value.document.records[recordId], offset, tile);
    const source = getDocument();
    editor.__fixedTileDocument = () => ({...source, records: {...source.records,
      [recordId]: {...source.records[recordId], bytes: field.value}}});
    field.bind(editor, element => { void paint(element); });
    bindFieldResetToOriginalButtons(editor, new Map([[editor.dataset.fixedTileEditor, field]]), {
      dirtyFor: field => ranges ? ranges.some(({offset, length}) =>
        field.value.slice(offset, offset + length).some((value, index) =>
          value !== field.defaultValue[offset + index])) : field.hasOverride,
      beforeReset: async () => {
        // 待写的图块先进字段层那一条链，再按当时版本恢复 Origin。
        await flushAllAutoSaves();
        assertSession();
        return {expectedVersion: field.version, fieldOptions: {selection: ranges}};
      },
      afterReset: async () => {
        const saved = await database.readResource(TEXT_RECORDS_RESOURCE_ID);
        await onSaved({saved, recordId, ranges, editor, root, reset: true});
        await onReset({saved, recordId, ranges, editor, root});
        fixedTileState(editor, "已重置");
      },
      onError: error => fixedTileState(editor, `重置失败：${error?.message || error}`, {invalid: true}),
    });
    editor.dataset.fixedTileFieldsReady = "true";
  }));
  void ready.catch(error => showEditorError(root, "固定图块字段绑定失败", error));
  return Object.freeze({
    ready,
    paint: () => Promise.all(editors.map(paint)),
    flush: () => flushAllAutoSaves(),
  });
}

// @editor-module 游戏 UI 工作台共用的组件保存控制器

async function installUiTextDocument(saved, project, repaint) {
  if (!project || state.project !== project || !saved?.value?.document) return;
  const document = await db.getDocument('text-record');
  if (state.project !== project) return;
  project.text_record_edits = document;
  project.text_record_dirty = Boolean(saved.dirty);
  invalidateTextCatalogDocument();
  const catalog = await textCatalogDocument();
  if (state.project !== project) return;
  const characterMap = db.peekDocument("text.character-map", null);
  if (characterMap) {
    applyCurrentTextReferencesToProject(project, catalog, characterMap);
  }
  repaint();
}

/**
 * Bind the fixed-text/fixed-image component architecture shared by every game
 * UI workbench. A page only supplies its repaint and rerender callbacks.
 */
function bindUiComponentEditors(root, {
  fixedTiles = false,
  repaint = () => {},
  rerender = async () => {},
} = {}) {
  if (!root) return null;
  const project = state.project;
  const repository = requireBrowserProjectRepository(state);
  const onDraft = ({document: document_}) => {
    if (!project || state.project !== project) return;
    const source = db.peekDocument('text-record', project.text_record_edits);
    project.text_record_edits = trackProjectFieldProjection(document_, projectFieldDraftOrigin(source) || source, null);
    project.text_record_dirty = true;
    repaint();
  };
  const onSaved = async ({saved}) => {
    await installUiTextDocument(saved, project, repaint);
  };
  const onReset = async () => {
    await rerender();
  };
  const text = bindFixedTextEditors(root, {
    getDocument: () => project?.text_record_edits || null,
    getEncoding: () => project?.text_record_encoding || null,
    getRepository: () => repository,
    onDraft,
    onSaved,
    onReset,
  });
  const tiles = fixedTiles ? bindFixedTileEditors(root, {
    getDocument: () => project?.text_record_edits || null,
    getRepository: () => repository,
    getRenderSources: uiJsRenderSources,
    onDraft,
    onSaved,
    onReset,
  }) : null;
  const structures = [...root.querySelectorAll('[data-text-record-structure]')]
    .filter(host => !host.dataset.textStructureBound).map(host => {
      host.dataset.textStructureBound = 'true';
      const panels = [];
      for (let panel = host.closest('details'); panel; panel = panel.parentElement?.closest('details')) panels.push(panel);
      let mounting;
      const mount = () => {
        if (!host.isConnected || panels.some(panel => !panel.open)) return;
        mounting ||= (async () => {
          const object = await db.getFieldObject('text-record', host.dataset.textRecordStructure);
          await object.mount(host, {uiStructure: true, onSaved, getRenderSources: uiJsRenderSources});
        })();
        void mounting.catch(error => showEditorError(root, '文本记录属性', error));
        return mounting;
      };
      for (const panel of panels) panel.addEventListener('toggle', mount);
      return mount();
    });
  const ready = Promise.all(structures);
  void ready.catch(error => showEditorError(root, '文本记录属性', error));
  return {text, tiles, ready};
}

// @editor-module 游戏内整屏 UI 的共用三栏编辑现场
//
// 各业务页只登记语义组件、权威 preview 和少量运行预览控件。元素树、NES 舞台、
// 检查器、缩放以及 text-record / fixed-tile 保存链只在这里实现一次。


const selectedByNamespace = new Map();
const zoomByNamespace = new Map();

const GAME_UI_TREE_TYPES = defineElementTreeTypes({
  screen: {icon: ELEMENT_TREE_ICONS.group, label: ELEMENT_TREE_LABELS.screen},
  group: {icon: ELEMENT_TREE_ICONS.group, label: ELEMENT_TREE_LABELS.component},
  layout: {icon: ELEMENT_TREE_ICONS.layout, label: ELEMENT_TREE_LABELS.layout},
  text: {icon: ELEMENT_TREE_ICONS.text, label: ELEMENT_TREE_LABELS.text},
  dynamic: {icon: ELEMENT_TREE_ICONS.text, label: "动态内容"},
  object: {icon: ELEMENT_TREE_ICONS.actor, label: "场景物体"},
  image: {icon: ELEMENT_TREE_ICONS.layer, label: ELEMENT_TREE_LABELS.image},
  state: {icon: ELEMENT_TREE_ICONS.preview, label: "界面状态"},
  button: {icon: ELEMENT_TREE_ICONS.component, label: "按钮"},
});

/** 界面文本组件引用文本字段对象的分词范围，原节点保留整条记录与操作。 */
function gameUiWorkbenchNodes(nodes, preview = null) {
  return (Array.isArray(nodes) ? nodes.filter(node => node?.id) : []).flatMap(node => {
    const recordId = node.recordId || node.selection?.record_id;
    const document_ = state.project?.text_record_edits;
    const record = document_?.records?.[recordId];
    const encoding = state.project?.text_record_encoding;
    if (!record || !encoding || node.textComponents || node.editors || node.editorType === 'tile') return [node];
    const components = textRecordComponents(record, encoding, document_, node.ranges || node.selection?.ranges);
    if (components.length < 2) return [node];
    return [{...node, kind: 'group', textComponents: true},
      ...components.map((component, index) => {
        const label = uiTextComponentLabel(record, component, preview);
        return {...node,
          id: `${node.id}:component:${index}`, kind: component.kind, textComponents: true,
          label,
          depth: (node.depth || 0) + 1, editorId: `${node.editorId || node.id}:component:${index}`,
          editorLabel: label, ranges: component.ranges,
          selection: {record_id: recordId, ranges: component.ranges},
          ...(node.inspectorMarkup ? {inspectorMarkup: `<div class="screen-workbench-inspector-body"><p>${esc(component.text)}</p>${
            currentTextReferenceLink(recordId)}</div>${node.controlsMarkup || ''}`} : {}),
        };
      })];
  });
}

/** Return the stable selected semantic node, falling back to the screen root. */
function selectedGameUiWorkbenchNode(namespace, nodes) {
  const available = gameUiWorkbenchNodes(nodes);
  const selectedId = selectedByNamespace.get(String(namespace));
  const selected = available.find(node => node.id === selectedId)
    || available[0] || null;
  if (selected) selectedByNamespace.set(String(namespace), selected.id);
  return selected;
}

/** Select a semantic node before rendering (for deep links and flow previews). */
function selectGameUiWorkbenchNode(namespace, nodeId) {
  const key = String(namespace);
  if (nodeId) selectedByNamespace.set(key, String(nodeId));
  else selectedByNamespace.delete(key);
}

/** Selection consumed by the canonical UI painter (record ranges or bounds). */
function gameUiWorkbenchPreviewSelection(namespace, nodes) {
  return selectedGameUiWorkbenchNode(namespace, nodes)?.selection || null;
}

function gameUiStateComponents(namespace, nodes) {
  const current = () => gameUiWorkbenchNodes(nodes());
  return {
    current,
    selected: () => selectedGameUiWorkbenchNode(namespace, nodes())?.id || null,
    select: id => selectGameUiWorkbenchNode(namespace, id),
    fields: id => {
      const node = current().find(row => row.id === id);
      const recordId = node?.recordId || node?.selection?.record_id;
      const editors = node?.editors || (recordId ? [{recordId, ranges: node.ranges || node.selection?.ranges}] : []);
      return editors.map(editor => ({resourceId: 'text-record', handle: editor.recordId,
        field: null, ranges: editor.ranges || null}));
    },
    mount: (detail, id, bindings = {}) => {
      const node = current().find(row => row.id === id);
      if (!node) return null;
      updateInspectorDetail(detail, node);
      return bindUiComponentEditors(detail, bindings);
    },
  };
}

function editorMarkup(editor, node) {
  if (editor?.type === "tile") {
    return fixedTileEditorMarkup({
      recordId: editor.recordId,
      editorId: editor.editorId || `${node.id}:tile`,
      ranges: editor.ranges,
      label: editor.label || node.label,
      description: "",
    });
  }
  return fixedTextEditorMarkup({
    recordId: editor.recordId,
    editorId: editor.editorId || `${node.id}:text`,
    mode: editor.mode ?? node.editorMode,
    ranges: editor.ranges ?? null,
    label: editor.label || node.label,
    description: "",
  });
}

function factsMarkup(facts) {
  if (!Array.isArray(facts) || !facts.length) return "";
  return `<dl class="screen-workbench-facts">${facts.map(fact => `<div>
    <dt>${esc(fact?.label || "")}</dt>
    <dd${fact?.mono ? ` class="mono"` : ""}${fact?.handle ? ` data-resource-handle="${esc(fact.handle)}" title="${esc(fact.handle)}"` : ''}>${String(fact?.value).includes('global-event-flag:')
      ? eventFlagTextMarkup(fact.value, {label: fact.referenceLabel}) : handleTextMarkup(fact?.value ?? "—")}</dd>
  </div>`).join("")}</dl>`;
}

function defaultInspectorMarkup(node) {
  if (!node) return `<div class="screen-workbench-inspector-body">
  </div>`;
  const editors = Array.isArray(node.editors) ? node.editors
    : node.recordId ? [{
        type: node.editorType || "text",
        recordId: node.recordId,
        editorId: node.editorId,
        ranges: node.ranges,
        label: node.editorLabel,
        description: node.description,
      }] : [];
  return `<div class="screen-workbench-inspector-body">
    ${factsMarkup(node.facts)}
    ${node.controlsMarkup || ""}
    ${editors.map(editor => editorMarkup(editor, node)).join("")}
  </div>`;
}

function inspectorDetailMarkup(node, {inspectorMarkup = null, textOnlyTree = true} = {}) {
  const markup = typeof inspectorMarkup === 'function'
    ? inspectorMarkup(node) : node?.inspectorMarkup ?? defaultInspectorMarkup(node);
  const structureRecord = node?.recordId || node?.selection?.record_id || node?.sourceRecord
    || node?.facts?.find(fact => fact.label === '布局记录')?.value;
  return `${markup}${node?.structureRecord === false ? '' : textRecordStructureEditorMarkup(structureRecord)}${textOnlyTree && node?.href
    ? `<p><a class="editor-inline-link" href="${esc(node.href)}">${esc(node.label)} ↗</a></p>` : ''}`;
}

function updateInspectorDetail(detail, node) {
  const template = document.createElement('template');
  template.innerHTML = inspectorDetailMarkup(node);
  const mounted = new Map([...detail.querySelectorAll('[data-text-record-structure]')]
    .map(host => [host.dataset.textRecordStructure, host]));
  const retained = new Map();
  for (const host of template.content.querySelectorAll('[data-text-record-structure]')) {
    const previous = mounted.get(host.dataset.textRecordStructure);
    if (!previous) continue;
    const container = '.text-record-structure-reference';
    retained.set(host.closest(container) || host, previous.closest(container) || previous);
  }
  const children = [...template.content.childNodes].map(node => retained.get(node) || node);
  for (const child of [...detail.childNodes]) if (!children.includes(child)) child.remove();
  let next = detail.firstChild;
  for (const child of children) {
    if (child === next) next = next.nextSibling;
    else detail.insertBefore(child, next);
  }
}

/** Render one canonical NES UI screen in the same workbench used by boot/status UI. */
function renderGameUiWorkbench({
  namespace,
  id = "",
  className = "",
  heightMode = 'page',
  nodes = [],
  canvasMarkup = "",
  domainMarkup = "",
  toolbarMarkup = "",
  pageToolbarMarkup = "",
  toolbarInStage = false,
  stageToolbarMarkup = '',
  footerBadge = "通用 UI 资源",
  footerText = "画布直接引用游戏界面的权威构造资源。",
  treeTitle = "UI 树",
  inspectorMarkup = null,
  bottomMarkup = "",
  bottomSize = 'content',
  bottomFit = false,
  treeExtraMarkup = "",
  inspectorExtraMarkup = "",
  inspectorExtraHidden = false,
  textOnlyTree = true,
} = {}) {
  const available = gameUiWorkbenchNodes(nodes);
  const selected = selectedGameUiWorkbenchNode(namespace, available);
  const selectedInspectorMarkup = inspectorDetailMarkup(selected, {inspectorMarkup, textOnlyTree});
  const tree = elementTree({
    nodes: available.map(node => ({...node, hoverDetail: node.detail, detail: "",
      ...(textOnlyTree ? {labelMarkup: esc(node.label), detailMarkup: ""} : {})})),
    types: GAME_UI_TREE_TYPES,
    showIcons: !textOnlyTree,
    selectedId: selected?.id || null,
    buttonAttributes: node => ({
      "data-game-ui-workbench-node": node.id,
      title: textOnlyTree ? node.label : node.hoverDetail || "",
    }),
    afterNode: node => !textOnlyTree && node.href ? `<a class="editor-inline-link" href="${esc(node.href)}"
      aria-label="${esc(node.label)}入口">↗</a>` : "",
  });
  if (canvasMarkup) stageToolbarMarkup += interfacePreviewSceneMarkup();
  const stage = domainMarkup || (canvasMarkup || toolbarInStage && toolbarMarkup || stageToolbarMarkup ? screenWorkbenchCanvasStage({
    namespace,
    canvasMarkup,
    toolbarMarkup,
    footerMarkup: "",
  }) : "");
  return screenWorkbench({
    namespace,
    toolbarMarkup: pageToolbarMarkup,
    id,
    heightMode,
    className: `game-ui-component-workbench${className ? ` ${esc(className)}` : ""}`,
    treeTitle,
    treeMarkup: `${tree}${textOnlyTree ? "" : treeExtraMarkup}${stage || textOnlyTree ? "" : toolbarMarkup}`,
    stageMarkup: stage,
    stageToolbarMarkup,
    inspectorTitle: selected?.label || "属性",
    inspectorMarkup: `<div data-game-ui-inspector-detail>${selectedInspectorMarkup}</div><div data-game-ui-inspector-extra${inspectorExtraHidden ? ' hidden' : ''}>${inspectorExtraMarkup}${textOnlyTree ? treeExtraMarkup : ""}${!stage && textOnlyTree ? toolbarMarkup : ""}</div>`,
    inspectorClassName: "game-ui-component-inspector",
    bottomMarkup,
    bottomSize,
    bottomFit,
  });
}

/** Bind selection, zoom and shared component persistence for one workbench. */
function bindGameUiWorkbench({
  namespace,
  nodes = [],
  rerender = async () => {},
  repaint = () => {},
  onSelect = () => {},
  fixedTiles = false,
  root = document,
  updateInspectorOnSelection = true,
  bindInspector = () => {},
  selectPreview = repaint,
} = {}) {
  const workbench = root?.querySelector?.(
    `[data-screen-workbench="${CSS.escape(String(namespace || ""))}"]`,
  );
  if (!workbench) return null;
  void bindInterfacePreviewScene(workbench, {rerender});
  bindScreenWorkbenchZoom({
    namespace,
    bindViewport: bindScenePreview,
    canPan: () => true,
    zoom: zoomByNamespace.get(String(namespace)) || "fit",
    onChange: value => zoomByNamespace.set(String(namespace), value),
    root,
  });
  const available = gameUiWorkbenchNodes(nodes);
  const bindEditors = host => host.querySelector("[data-fixed-text-editor], [data-fixed-tile-editor], [data-text-record-structure]")
    ? bindUiComponentEditors(host, {fixedTiles, repaint, rerender}) : null;
  const buttons = [...workbench.querySelectorAll('[data-game-ui-workbench-node]')];
  const tree = workbench.querySelector('.element-tree');
  let inspectorProjection = '';
  let inspectorControlsProjection = '';
  const controlsProjection = node => JSON.stringify([node?.id, node?.editors, node?.selection,
    node?.controlsMarkup, node?.recordId, node?.ranges, node?.inspectorMarkup]);
  const detailProjection = node => JSON.stringify([controlsProjection(node), node?.facts]);
  const select = (button, force = false) => {
    const id = button.dataset.gameUiWorkbenchNode;
    if (!id || !force && selectedByNamespace.get(String(namespace)) === id) return;
    const node = available.find(item => item.id === id) || null;
    const host = interfaceStateWorkbench(workbench) || interfaceStateWorkbench(workbench.closest('[data-state-machine-source]'));
    if (host) host.selectComponent(id);
    else selectedByNamespace.set(String(namespace), id);
    onSelect(node, host);
    if (updateInspectorOnSelection) {
      const inspector = workbench.querySelector('.workspace-inspector');
      if (inspector) {
        const {scrollTop, scrollLeft} = inspector;
        inspector.querySelector('h3').textContent = node?.label || '属性';
        const detail = inspector.querySelector('[data-game-ui-inspector-detail]');
        updateInspectorDetail(detail, node);
        inspectorControlsProjection = controlsProjection(node);
        inspectorProjection = detailProjection(node);
        inspector.querySelector('[data-game-ui-inspector-extra]').hidden = node?.kind !== 'screen';
        bindEditors(detail);
        bindInspector(detail, node);
        inspector.scrollTop = scrollTop;
        inspector.scrollLeft = scrollLeft;
      }
      workbench.querySelectorAll('[data-game-ui-workbench-node]').forEach(item =>
        item.closest('.element-tree-node')?.classList.toggle('is-selected', item === button));
      selectPreview(node, host);
    } else void rerenderElementTreeKeepingSelectionVisible(button, rerender);
  };
  buttons.forEach(button => button.addEventListener('click', () => select(button)));
  const setVisibleNodes = (next, {refreshInspector = false} = {}) => {
    available.splice(0, available.length, ...gameUiWorkbenchNodes(next));
    const known = new Set(buttons.map(button => button.dataset.gameUiWorkbenchNode));
    for (const node of available.filter(node => !known.has(node.id))) {
      const template = document.createElement('template');
      template.innerHTML = elementTree({nodes: [{...node, labelMarkup: esc(node.label), detailMarkup: ''}],
        types: GAME_UI_TREE_TYPES, showIcons: false,
        buttonAttributes: item => ({'data-game-ui-workbench-node': item.id, title: item.label})});
      const button = template.content.querySelector('[data-game-ui-workbench-node]');
      button.addEventListener('click', () => select(button));
      buttons.push(button);
    }
    const ids = new Set(available.map(node => node.id));
    const displayed = [...tree.querySelectorAll('[data-game-ui-workbench-node]')];
    if (displayed.length !== available.length
        || displayed.some((button, index) => button.dataset.gameUiWorkbenchNode !== available[index].id)) {
      const byId = new Map(buttons.map(button => [button.dataset.gameUiWorkbenchNode, button]));
      for (const node of available) tree.append(byId.get(node.id).closest('.element-tree-node'));
      for (const button of buttons) if (!ids.has(button.dataset.gameUiWorkbenchNode))
        button.closest('.element-tree-node').remove();
    }
    if (!ids.has(selectedByNamespace.get(String(namespace)))) {
      const first = buttons.find(button => button.dataset.gameUiWorkbenchNode === available[0]?.id);
      if (first) select(first, true);
    }
    if (refreshInspector) {
      const node = selectedGameUiWorkbenchNode(namespace, available);
      const projection = detailProjection(node);
      if (projection !== inspectorProjection) {
        inspectorProjection = projection;
        const detail = workbench.querySelector('[data-game-ui-inspector-detail]');
        const controls = controlsProjection(node);
        const facts = detail.querySelector('.screen-workbench-inspector-body > .screen-workbench-facts');
        if (controls === inspectorControlsProjection && facts) {
          facts.outerHTML = factsMarkup(node?.facts);
          return;
        }
        inspectorControlsProjection = controls;
        updateInspectorDetail(detail, node);
        bindEditors(detail);
        bindInspector(detail, node);
      }
    }
  };
  const editors = bindEditors(workbench);
  return {workbench, editors, setVisibleNodes};
}

export { bindGameUiWorkbench, bindUiComponentEditors, gameUiStateComponents, gameUiWorkbenchNodes, gameUiWorkbenchPreviewSelection, renderGameUiWorkbench, selectGameUiWorkbenchNode, selectedGameUiWorkbenchNode };
