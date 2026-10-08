// @editor-module 承载页面上常驻的模块编辑器：列出定稿清单里属于本页的模块，展开时把控件挂进页面。
//
// **展开才挂。** 一个页面最多几十个模块，实测全量挂载最重的一页要 57 秒（176 个
// 合计 143 秒），页面打开会卡死；折叠时只有标题，展开的那一项才取数、渲染、绑定。
import {esc} from '../core/dom.js';
import {state} from '../core/state.js';
import {PAGE_MODULES} from '../core/page-modules.js';
import {resourceLabel} from '../core/resource-index.js';
import {loadModuleCatalog} from '../modules/catalog.js';
import {db} from '../core/project-db.js';

// 这些 owner 的字段对象按资源实例登记，不能作为一个抽象模块交给 core 的
// PAGE_MODULES。承载页在这里展开它们；折叠项不会取数或挂载控件。
const FIELD_OBJECT_PAGE_MODULES = Object.freeze({
  scenes: Object.freeze(['scene-encounter-zone']),
  text: Object.freeze(['text.character-map']),
});

// 场景详情页只承载当前场景自己的字段对象；全局表与遇敌区留在场景列表页。
function currentSceneModule() {
  const entry = (state.project?.scenes?.editable_scenes || [])
    .find(item => item.slug === state.sceneSlug);
  return entry ? `scene:${Number(entry.id).toString(16).toUpperCase().padStart(2, '0')}` : null;
}

const FIELD_OBJECT_MODULE_TITLES = Object.freeze({
  'application-config-family': '应用配置族',
  'scene-encounter-zone': '场景遇敌区',
  'text.character-map': '字符映射注解',
});

export function pageModuleIds(pageId) {
  const id = String(pageId || '');
  if (id === 'scenes' && state.sceneSlug) {
    const scene = currentSceneModule();
    return scene ? [scene] : [];
  }
  if (id === 'scenes' && state.sceneListTab === 'actors') {
    return ['application-command', 'scene-actor'];
  }
  if (id === 'scenes' && state.sceneListTab === 'investigation') {
    return ['field-reward-resolution-service', 'facility-config', 'scene', 'investigation-command'];
  }
  return [...new Set([...(PAGE_MODULES[id] || []), ...(FIELD_OBJECT_PAGE_MODULES[id] || [])])];
}

export function pageModuleEditorsMarkup(pageId) {
  const modules = pageModuleIds(pageId);
  if (!modules.length) return '';
  return `<section class="page-module-editors" data-page-modules="${esc(pageId)}">${
    modules.map(moduleId => `<details class="wide-card" data-page-module="${esc(moduleId)}"${
      moduleId === 'field-reward-resolution-service' ? ' id="scene-reward-parameters"'
        : moduleId === 'application-command' ? ' id="scene-application-parameters"'
          : pageId === 'scenes' && state.sceneListTab === 'investigation' && moduleId === 'facility-config'
            ? ' id="scene-investigation-parameters"' : ''}>
      <summary>${esc(moduleId)}</summary>
      <div data-page-module-host="${esc(moduleId)}"></div>
    </details>`).join('')}</section>`;
}

async function mountSection(details) {
  const host = details.querySelector('[data-page-module-host]');
  if (!host || host.dataset.pageModuleMounted === '1') return;
  host.dataset.pageModuleMounted = '1';
  if (details.id === 'scene-investigation-parameters') {
    const objects = await db.getFieldObjects('facility-config');
    for (const object of objects.filter(object => object.fields.some(field =>
      field.entityHandle.startsWith('family-0d-')))) {
      const controls = document.createElement('div');
      host.append(controls);
      await object.mount(controls);
    }
    return;
  }
  const {mountPageFields} = await import('./page-fields.js');
  await mountPageFields(host, details.dataset.pageModule);
}

export async function mountPageModuleEditors(root, pageId) {
  const section = root.querySelector(`[data-page-modules="${CSS.escape(String(pageId || ''))}"]`);
  if (!section) return [];
  if (!state.moduleCatalog) state.moduleCatalog = await loadModuleCatalog();
  const sections = [...section.querySelectorAll('[data-page-module]')];
  for (const details of sections) {
    const module = details.dataset.pageModule === 'application-config-family'
      ? null : state.moduleCatalog.module(details.dataset.pageModule);
    const title = details.dataset.pageModule === 'application-config-family'
      ? FIELD_OBJECT_MODULE_TITLES[details.dataset.pageModule]
      : module?.title || resourceLabel(details.dataset.pageModule)
        || FIELD_OBJECT_MODULE_TITLES[details.dataset.pageModule];
    if (title) details.querySelector('summary').textContent = title;
    if (details.id === 'scene-investigation-parameters') details.querySelector('summary').textContent = '调查物配置';
    details.addEventListener('toggle', () => {void mountSection(details);});
    if (details.id && location.hash.slice(1).startsWith(details.id)) {
      details.open = true;
      await mountSection(details);
      const suffix = location.hash.slice(details.id.length + 2);
      const select = details.querySelector('[data-module-resource-select]');
      if (details.id === 'scene-application-parameters' && suffix && select) {
        select.value = `application-command:${suffix}`;
        select.dispatchEvent(new Event('change', {bubbles: true}));
      }
    }
  }
  return sections.map(details => details.dataset.pageModule);
}
