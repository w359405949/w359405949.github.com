import { hasFieldObjects, db, fieldOwner, APPLICATION_CONFIG_FAMILY_RESOURCE_IDS, normalizeEditRoute, mountFieldObjectControls } from './scene-actors-Cftr7mCE.js';
import { state } from './emulator-Bl-sLXnd.js';
import { esc } from './monster-figure-C07vG7yu.js';
import { loadModuleCatalog, moduleResourceDescriptors } from './preview-sound-DHDXA99x.js';
import { mountedFieldControls, mountFieldObjectEditor, mountLinkedFieldChoice } from './rectangle-preset-controls-MtKWNScU.js';

// @editor-module 页面只放置字段对象控件。

const selections = new WeakMap();
const FIELD_OBJECT_PAGE_SIZE = 64;
const DIRECT_FIELD_MODULES = new Set(['investigation', 'investigation-command', 'treasure']);
const ITEM_PAGE_RANGES = Object.freeze({
  'equipment-human': [0x01, 0x40],
  'equipment-tank': [0x41, 0x98],
  items: [0x99, 0xDD],
});

function representedPageFields(host) {
  const content = host.closest('#content');
  if (!content) return new Set();
  const keys = new Set();
  for (const node of content.querySelectorAll('[data-field-object-mounted]')) {
    if (node.closest('[data-page-module]')) continue;
    for (const field of mountedFieldControls(node)) {
      if (field.control === 'readonly-value' || field.control === 'unresolved-control') continue;
      keys.add(JSON.stringify([field.resource, field.entity_handle, field.field_name]));
    }
  }
  return keys;
}

// 显式给的资源 ID 必须是已发布资源；没给就按引用图的资源描述符取，取不到
// 才是「这个模块还没有发布语义资源」（由编辑器自己说出来）。
function declaredResources(moduleId, resourceId) {
  const manifest = state.browserPackageManifest || state.browserProjectManifest;
  if (moduleId === 'application-config-family' && true) {
    return APPLICATION_CONFIG_FAMILY_RESOURCE_IDS.map(id =>
      manifest?.browser_original_assets?.find(item => item.resource_id === id)).filter(Boolean);
  }
  return moduleResourceDescriptors(moduleId, manifest,
    DIRECT_FIELD_MODULES.has(moduleId) ? null : state.moduleCatalog).map(descriptor => {
    const route = normalizeEditRoute(descriptor.edit_route);
    if (route.kind !== 'owner' || route.owner_ref === null) return descriptor;
    const owner = manifest?.browser_original_assets?.find(
      item => item.resource_id === route.owner_ref.resource_id);
    if (!owner || normalizeEditRoute(owner.edit_route).kind !== 'self') return null;
    return route.owner_ref.record_id === undefined ? owner
      : {...owner, fieldObjectRecordId: route.owner_ref.record_id,
        fieldObjectRouteResourceId: descriptor.resource_id};
  }).filter(Boolean);
}

// 模块自己没有登记字段对象时，按承载页选中的那份已发布资源挂：多资源模块
// （如 application-config-family:00..0F）每份资源各是一组字段对象，页面给选择器切换。
function selectedFieldObjectResource(moduleId, selection) {
  const owned = declaredResources(moduleId)
    .filter(item => hasFieldObjects(item.resource_id, {controlsOnly: true}));
  if (!owned.length) return null;
  const chosen = owned.find(item => item.resource_id === selection.resource) || owned[0];
  selection.resource = chosen.resource_id;
  const ownsWholeResource = owned.some(item => item.resource_id === chosen.resource_id
    && !item.fieldObjectRouteResourceId);
  const recordIds = ownsWholeResource ? [] : owned.filter(item => item.resource_id === chosen.resource_id
    && (Number.isInteger(item.fieldObjectRecordId)
      || typeof item.fieldObjectRecordId === 'string')).map(item => item.fieldObjectRecordId);
  const routeResourceIds = ownsWholeResource ? [] : owned.filter(item => item.resource_id === chosen.resource_id
    && typeof item.fieldObjectRouteResourceId === 'string')
    .map(item => item.fieldObjectRouteResourceId);
  return {resourceId: chosen.resource_id, resourceIds: [...new Set(owned.map(item => item.resource_id))],
    recordIds, routeResourceIds};
}

async function mountPageFields(host, moduleId, resourceId = null) {
  const repository = state.projectRepository;
  if (!selections.has(repository)) selections.set(repository, new Map());
  const contexts = selections.get(repository);
  const key = `${state.view}\0${moduleId}\0${resourceId}`;
  if (!contexts.has(key)) contexts.set(key, {resource: null});
  const selection = contexts.get(key);
  let generation = 0;
  let renderObjectPage = null;
  let refreshDisplayedPage = null;
  let refreshTimer = null;
  let refreshPending = false;
  const claimSignature = keys => [...keys].sort().join('\n');
  let lastClaimSignature = claimSignature(representedPageFields(host));
  const showError = error => {
    if (!host.isConnected || state.projectRepository !== repository) return;
    host.dataset.pageFieldsReady = 'error';
    host.innerHTML = `<p class="module-editor-error" role="alert">${esc(error.message || error)}</p>`;
  };
  const paint = async () => {
    const version = ++generation;
    refreshDisplayedPage = null;
    delete host.dataset.pageFieldsReady;
    const current = () => host.isConnected && generation === version && state.projectRepository === repository;
    try {
      await import('./actors-bind-DV2HGSY5.js').then(function (n) { return n.components; });
      if (!current()) return;
      if (!resourceId && !DIRECT_FIELD_MODULES.has(moduleId) && moduleId !== 'application-config-family'
        && !state.moduleCatalog)
        state.moduleCatalog = await loadModuleCatalog();
      if (!current()) return;
      const moduleObjects = hasFieldObjects(resourceId || moduleId, {controlsOnly: true});
      const alternatives = resourceId ? null : selectedFieldObjectResource(moduleId, selection);
      const fallback = alternatives?.resourceIds.length > 1 || !moduleObjects ? alternatives : null;
      const fieldObjectResource = fallback?.resourceId || (moduleObjects ? (resourceId || moduleId) : null);
      if (fieldObjectResource) {
        const itemRange = moduleId === 'item-entry'
          ? ITEM_PAGE_RANGES[host.closest('[data-page-modules]')?.dataset.pageModules] : null;
        const itemObjects = itemRange ? (await db.getFieldObjects(fieldObjectResource)).filter(object => {
          const match = /^item-entry:item:([0-9A-F]{2})$/u.exec(object.id);
          if (!match) return false;
          const id = Number.parseInt(match[1], 16);
          return id >= itemRange[0] && id <= itemRange[1];
        }) : null;
        const battleEntryObjects = moduleId === 'battle-test-point' && state.view === 'battle-test'
          ? (await db.getFieldObjects(fieldObjectResource)).filter(object =>
            object.fields.every(field => field.recordId === 'entry')) : null;
        const allObjects = !itemObjects && !battleEntryObjects && fallback?.recordIds.length
          ? await db.getFieldObjects(fieldObjectResource) : null;
        const recordObjects = battleEntryObjects || itemObjects || allObjects?.filter(object => {
          const match = /^item-entry:item:([0-9A-F]{2})$/u.exec(object.id);
          return fallback.recordIds.includes(object.id)
            || (match && fallback.recordIds.includes(Number.parseInt(match[1], 16)))
            || object.fields.some(field => field.entityAliases?.some(alias =>
              fallback.routeResourceIds.includes(alias)));
        }) || null;
        const objectCount = recordObjects ? recordObjects.length
          : await db.getFieldObjectCount(fieldObjectResource);
        if (!current()) return;
        const pageSize = fieldOwner(fieldObjectResource).objectPageSize ?? FIELD_OBJECT_PAGE_SIZE;
        const pageCount = Math.max(1, Math.ceil(objectCount / pageSize));
        let page = 0;
        let renderVersion = 0;
        renderObjectPage = async nextPage => {
          const request = ++renderVersion;
          const stillCurrent = () => current() && renderVersion === request;
          page = Math.max(0, Math.min(pageCount - 1, nextPage));
          if (!stillCurrent()) return false;
          host.replaceChildren();
          // 一个模块挂多份资源时页面要能选：选择器只换挂载对象，不改全局导航分组。
          if (fallback && fallback.resourceIds.length > 1) {
            const chooser = host.ownerDocument.createElement('label');
            chooser.className = 'module-resource-select';
            chooser.innerHTML = `<span>语义资源</span>
              <select data-module-resource-select>${fallback.resourceIds.map(resourceId =>
                `<option value="${esc(resourceId)}"${
                  resourceId === fieldObjectResource ? ' selected' : ''}>${esc(resourceId)}</option>`).join('')}</select>`;
            host.append(chooser);
          }
          if (pageCount > 1) {
            const pager = host.ownerDocument.createElement('nav');
            pager.dataset.fieldObjectPager = '1';
            pager.innerHTML = `<button type="button" data-field-object-page="prev"${page === 0 ? ' disabled' : ''}>上一页</button>
              <span>${page + 1} / ${pageCount}</span>
              <button type="button" data-field-object-page="next"${page === pageCount - 1 ? ' disabled' : ''}>下一页</button>`;
            host.append(pager);
          }
          const objects = recordObjects ? recordObjects.slice(page * pageSize,
            (page + 1) * pageSize) : await db.getFieldObjects(fieldObjectResource, {
              offset: page * pageSize, limit: pageSize,
            });
          if (!stillCurrent()) return false;
          const suppressedFieldKeys = representedPageFields(host);
          lastClaimSignature = claimSignature(suppressedFieldKeys);
          for (let offset = 0; offset < objects.length; offset += 16) {
            const batch = objects.slice(offset, offset + 16);
            const fragment = host.ownerDocument.createDocumentFragment();
            await Promise.all(batch.map(async object => {
              const container = host.ownerDocument.createElement('div');
              fragment.append(container);
              await object.mount(container, {suppressedFieldKeys});
            }));
            if (!stillCurrent()) return false;
            host.append(fragment);
            await new Promise(resolve => setTimeout(resolve, 0));
          }
          return true;
        };
        refreshDisplayedPage = () => renderObjectPage(page);
        await renderObjectPage(0);
      } else {
        renderObjectPage = null;
        throw new Error(`${moduleId}: 未登记字段对象控件`);
      }
      if (current() && !refreshPending)
        host.dataset.pageFieldsReady = selection.resource || resourceId || moduleId;
    } catch (error) {
      if (current()) showError(error);
    }
  };
  host.addEventListener('click', event => {
    const objectPage = event.target.closest('[data-field-object-page]');
    if (objectPage && renderObjectPage) {
      event.stopPropagation();
      const currentPage = Number(objectPage.parentElement.querySelector('span')?.textContent?.split('/')[0]) - 1;
      void renderObjectPage(currentPage + (objectPage.dataset.fieldObjectPage === 'next' ? 1 : -1));
      return;
    }
  }, {capture: true});
  host.addEventListener('change', event => {
    const chooser = event.target.closest('[data-module-resource-select]');
    if (!chooser) return;
    selection.resource = chooser.value;
    void paint();
  });
  const content = host.closest('#content');
  if (content) {
    const observer = new MutationObserver(() => {
      if (!host.isConnected) {
        observer.disconnect();
        clearTimeout(refreshTimer);
        return;
      }
      const signature = claimSignature(representedPageFields(host));
      if (signature === lastClaimSignature || !refreshDisplayedPage) return;
      refreshPending = true;
      delete host.dataset.pageFieldsReady;
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(async () => {
        try {
          refreshPending = false;
          if (await refreshDisplayedPage() && !refreshPending)
            host.dataset.pageFieldsReady = selection.resource || resourceId || moduleId;
        } catch (error) {showError(error);}
      }, 200);
    });
    observer.observe(content, {subtree: true, childList: true,
      attributes: true, attributeFilter: ['data-field-object-mounted']});
  }
  await paint();
}

var pageFields = /*#__PURE__*/Object.freeze({
  __proto__: null,
  mountPageFields: mountPageFields
});

// 字段对象的专用编辑控件由浏览器入口注入。

const controls = new Map([
  ['interface-state-document', async (host, object, options) =>
    (await import('./document-controls-Aq8h5H8g.js')).mountInterfaceStateDocumentControls(host, object, options)],
  ['core-latin', async (host, object, options) => options?.pixels && object.id === 'core-latin:slot-0x63'
      ? (await import('./preview-sound-DHDXA99x.js').then(function (n) { return n.patternPixelEditor; })).mountPatternPixelEditor(host, object,
        {...options, fields: ['value0']}) : mountFieldObjectEditor(host, object, options)],
  ['scene-encounter-zone', async (host, object, options) => options?.encounterZoneDetail
      ? (await import('./zone-components-BHgfASiZ.js')).mountEncounterZoneControls(host, object, options)
      : mountFieldObjectEditor(host, object, options)],
  ['text-record', async (host, object, options) => options?.listOrder
      ? (await import('./facility-configuration-controls-J3sIu6pM.js').then(function (n) { return n.textRecordControls; })).mountTextRecordOrderControls(host, object, options.listOrder)
      : options?.uiStructure
        ? (await import('./text-record-structure-editor-COmgY10x.js').then(function (n) { return n.textRecordStructureEditor; })).mountTextRecordStructureEditor(host, object, options)
        : options?.sceneInteractionConfiguration
          ? (await import('./facility-configuration-controls-J3sIu6pM.js').then(function (n) { return n.textRecordControls; })).mountTextRecordControls(host, object, options)
          : mountFieldObjectEditor(host, object, options)],
  ['battle-action', async (host, object, options) => options?.fixedShape
      ? (await Promise.resolve().then(function () { return battleActionDimensionControls; })).mountBattleActionDimensionControls(host, object, options)
      : mountFieldObjectEditor(host, object, options)],
  ['shared-chr-bank', async (host, object, options) => options?.pixels
      ? (await import('./preview-sound-DHDXA99x.js').then(function (n) { return n.patternPixelEditor; })).mountPatternPixelEditor(host, object,
        {...options, fields: ['plane_0', 'plane_1']}) : mountFieldObjectEditor(host, object, options)],
  ['facility-config', async (host, object, options) => options?.sceneInteractionConfiguration
      ? (await import('./facility-configuration-controls-J3sIu6pM.js').then(function (n) { return n.facilityConfigurationControls; })).mountFacilityConfigurationControls(host, object, options)
      : mountFieldObjectEditor(host, object, options)],
  ['encounter-trigger-runtime', async (host, object, options) => options?.encounterWeightSlots
      ? (await import('./zone-components-BHgfASiZ.js')).mountEncounterWeightControls(host, object)
      : mountFieldObjectEditor(host, object, options)],
  ['char', async (host, object, options) => options?.pixels && object.fields[0].fieldName === 'core_glyph_bitmap'
      ? (await import('./preview-sound-DHDXA99x.js').then(function (n) { return n.patternPixelEditor; })).mountPatternPixelEditor(host, object,
        {...options, fields: ['core_glyph_bitmap']}) : mountFieldObjectEditor(host, object, options)],
  ['ui-tile-rectangle-service', async (host, object, options) => options?.rectanglePreset
      ? (await import('./rectangle-preset-controls-MtKWNScU.js').then(function (n) { return n.rectanglePresetControls; })).mountRectanglePresetControls(host, object, options)
      : mountFieldObjectEditor(host, object, options)],
  ['text-render-runtime', async (host, object, options) => object.id === 'text-render-runtime:window-clear-selector'
      ? (await import('./rectangle-preset-controls-MtKWNScU.js').then(function (n) { return n.rectanglePresetControls; })).mountWindowClearSelectorControls(host, object, options)
      : options?.transferPreset
      ? (await import('./rectangle-preset-controls-MtKWNScU.js').then(function (n) { return n.rectanglePresetControls; })).mountRectanglePresetControls(host, object, options)
      : mountFieldObjectEditor(host, object, options)],
]);

function mountFieldOwnerControls(resourceId, host, object, options) {
  return (controls.get(resourceId) || mountFieldObjectEditor)(host, object, options);
}

var fieldOwnerControls = /*#__PURE__*/Object.freeze({
  __proto__: null,
  mountFieldOwnerControls: mountFieldOwnerControls
});

// @editor-module 动作尺寸选择同笔修改行列并保持布局图块容量。

async function mountBattleActionDimensionControls(host, object, options) {
  const columns = object.fields.find(field => field.fieldName === 'columns');
  const rows = object.fields.find(field => field.fieldName === 'rows');
  const count = columns.value * rows.value;
  const choices = Array.from({length: 8}, (_, index) => index + 1)
    .filter(columns => count % columns === 0 && count / columns <= 8)
    .map(columns => ({values: [columns, count / columns], label: `${columns} × ${count / columns}`}));
  const suppressedFieldKeys = new Set(options.suppressedFieldKeys);
  for (const field of [columns, rows]) suppressedFieldKeys.add(JSON.stringify(
    [field.resourceId, field.entityHandle, field.fieldName]));
  await mountFieldObjectControls(host, object, {...options, suppressedFieldKeys});
  const shape = document.createElement('div'); host.prepend(shape);
  mountLinkedFieldChoice(shape, object, ['columns', 'rows'], choices, {label: '图块列 × 行'});
}

var battleActionDimensionControls = /*#__PURE__*/Object.freeze({
  __proto__: null,
  mountBattleActionDimensionControls: mountBattleActionDimensionControls
});

export { fieldOwnerControls, pageFields };
