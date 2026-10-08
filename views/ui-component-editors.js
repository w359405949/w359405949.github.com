// @editor-module 游戏 UI 工作台共用的组件保存控制器
import {applyCurrentTextReferencesToProject} from "../core/character-map-project.js";
import {
  requireBrowserProjectRepository,
} from "../core/project-data.js";
import {db} from "../core/project-db.js";
import {state} from "../core/state.js";
import {projectFieldDraftOrigin, trackProjectFieldProjection} from '../core/project-field-draft.js';
import {bindFixedTextEditors} from "../ui/fixed-text-editor.js";
import {bindFixedTileEditors} from "../ui/fixed-tile-editor.js";
import {
  invalidateTextCatalogDocument,
  textCatalogDocument,
} from "./text/catalog.js";
import {uiJsRenderSources} from "../modules/visual/ui-construction-preview.js";
import {showEditorError} from '../ui/editor-error.js';

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
export function bindUiComponentEditors(root, {
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
