// @editor-module 服务页组织场景角色、界面与对话，文字编辑由字段对象控件承担。
import {db} from "../core/project-db.js";
import {esc} from "../core/dom.js";
import {state} from "../core/state.js";
import {interfacePreviewContext} from '../core/interface-preview-context.js';
import {interfacePageDefinition} from "../core/ui-page-registry.js";
import {dataTable, bindRecordLinks} from "../ui/table.js";
import {panel} from "../ui/record.js";
import {createShopStateWorkbench} from '../ui/shop-state-workbench.js';
import {isSpecialServicePage, renderSpecialServicePage, bindSpecialServicePage} from './special-service-page.js';

const quantityServicePages = new Set(['vehicle-supply-service', 'storage-service']);
const quantityWorkbenches = new Map();

export function isQuantityServicePage(pageId = state.interfacePage) {
  return quantityServicePages.has(pageId);
}

export async function renderQuantityServicePage() {
  const definition = interfacePageDefinition(state.interfacePage);
  const key = definition.id;
  if (state.quantityServiceStateMachines?.repository !== state.projectRepository)
    state.quantityServiceStateMachines = {repository: state.projectRepository, selections: new Map()};
  const selections = state.quantityServiceStateMachines.selections;
  if (!selections.has(key)) selections.set(key, {family: 0x100 + definition.commandId,
    instance: 0, node: null, widget: 'screen', edge: null, path: '', step: 0,
    objectSelected: false, zoom: 'fit'});
  const details = await renderServicePage();
  const workbench = createShopStateWorkbench({namespace: `service-state-${key}`,
    fixedFamily: 0x100 + definition.commandId, selection: () => selections.get(key),
    evidenceVisible: false, previewScene: true, pathsInPreview: true, quantityPreview: true,
    getEntry: () => state.interfacePageEntry || state.interfacePageScreen?.replace(/^ui-screen:/u, '') || '',
    inspectorMarkup: `<p><a class="editor-inline-link" href="?view=interfaceui&amp;interface=field-dialogue">对话窗口 ↗</a></p>
      ${details.treeExtraMarkup}${details.inspectorExtraMarkup}`,
    bindInspector: host => bindServicePage(host),
  });
  quantityWorkbenches.set(key, workbench);
  return workbench.render();
}

export async function bindQuantityServicePage(root, {rerender}) {
  await quantityWorkbenches.get(state.interfacePage)?.bind(root, {rerender});
}

const SIMPLE_SERVICE_PAGES = new Set(['vehicle-wash-service', 'paralysis-massage-service', 'vehicle-trade-service']);
const simpleServiceWorkbenches = new Map();

export function isSimpleServicePage(pageId = state.interfacePage) {
  return SIMPLE_SERVICE_PAGES.has(pageId);
}

export async function renderSimpleServicePage() {
  const {createShopStateWorkbench} = await import('../ui/shop-state-workbench.js');
  const definition = interfacePageDefinition(state.interfacePage);
  const command = `application-command:${definition.commandId.toString(16).toUpperCase().padStart(2, '0')}`;
  const description = await renderServicePage();
  const objects = await db.getFieldObjects(command);
  const fields = [...objects.map(object => ({resource: command, handle: object.id})),
    ...(definition.configHandles || []).map(handle => ({resource: definition.configResourceId, handle}))]
    .map(binding => ({...binding, separate: true, options: {stacked: true}}));
  if (state.simpleServiceStateMachines?.repository !== state.projectRepository)
    state.simpleServiceStateMachines = {repository: state.projectRepository, selections: new Map()};
  const selections = state.simpleServiceStateMachines.selections;
  if (!selections.has(definition.id)) selections.set(definition.id, {
    family: 0x100 + definition.commandId, instance: 0, node: null, widget: 'screen',
    edge: null, path: '', step: 0, objectSelected: false, zoom: 'fit',
  });
  const workbench = createShopStateWorkbench({namespace: `service-state-${definition.id}`,
    fixedFamily: 0x100 + definition.commandId, selection: () => selections.get(definition.id),
    startAtEntry: true, evidenceVisible: false, previewScene: true, pathsInPreview: true,
    getEntry: () => state.interfacePageEntry || state.interfacePageScreen || '',
    inspectorMarkup: `<p><a class="editor-inline-link" href="?view=interfaceui&amp;interface=field-dialogue">对话窗口 ↗</a></p>${description.treeExtraMarkup}`,
    bindInspector: host => bindRecordLinks(host, route => {location.href = route;}),
    widgetFields: widget => widget?.id === 'screen' ? fields : [],
  });
  simpleServiceWorkbenches.set(definition.id, workbench);
  return workbench.render();
}

export async function bindSimpleServicePage(root, {rerender}) {
  await simpleServiceWorkbenches.get(state.interfacePage).bind(root, {rerender});
}

export function isServicePage(pageId = state.interfacePage) {
  return Boolean(interfacePageDefinition(pageId)?.servicePage || interfacePageDefinition(pageId)?.serviceFlow);
}

export async function renderServicePage() {
  const definition = interfacePageDefinition(state.interfacePage);
  const [actors, scenes, command] = await Promise.all([
    db.getAll("scene-actor", []),
    db.getDocument("project.scenes", {}),
    db.getResourceDocument(`application-command:${definition.commandIds[0]
      .toString(16).toUpperCase().padStart(2, "0")}`, {}),
  ]);
  const sceneById = new Map((scenes.editable_scenes || []).map(scene => [Number(scene.id), scene]));
  const entryActors = new Set((definition.entryActors || []).map(actor => actor.uid));
  const serviceActors = actors.filter(actor => definition.commandIds.includes(Number(actor.text_region))
    || entryActors.has(actor.uid));
  const actorTable = dataTable({
    columns: [
      {key: "uid", label: "角色", mono: true, width: 110, cell: actor => {
        const scene = sceneById.get(Number(actor.entry_id));
        return scene ? `<a href="?view=scenes&amp;scene=${encodeURIComponent(scene.slug)}&amp;sceneMode=logic&amp;sceneObject=actor:${actor.id}">${esc(actor.uid)}</a>` : esc(actor.uid);
      }},
      {key: "scene", label: "场景", width: 56, wrap: true, cell: actor => esc(sceneById.get(Number(actor.entry_id))?.name || "")},
      {key: "x", label: "X", width: 24},
      {key: "y", label: "Y", width: 24},
    ],
    rows: serviceActors,
    rowId: actor => actor.uid,
    recordRoute: actor => {
      const scene = sceneById.get(Number(actor.entry_id));
      return scene ? `?view=scenes&scene=${encodeURIComponent(scene.slug)}&sceneMode=logic&sceneObject=actor:${actor.id}` : null;
    },
  });
  if (isSpecialServicePage(definition)) return renderSpecialServicePage(definition, {
    inspectorExtraMarkup: panel(`场景角色（${serviceActors.length}）`, `<div data-service-actors>${actorTable}</div>`, {flat: true}),
  });
  const storageLink = definition.id === "storage-service"
    ? `<a class="editor-inline-link" href="?view=save&amp;saveSection=storage">财产保管 ↗</a>` : "";
  const family = command.configuration_family?.family_id
    ?? (command.configuration_family_resource_id
      ? Number.parseInt(command.configuration_family_resource_id.split(':').at(-1), 16) : null);
  const argument = interfacePreviewContext().service?.command === definition.commandId
    ? interfacePreviewContext().service.argument : 0;
  const hex = value => Number(value).toString(16).toUpperCase().padStart(2, '0');
  const configuration = `<div data-service-config="application-command:${hex(definition.commandId)}"></div>
    ${family == null ? '' : `<div data-service-config="application-config-family:${hex(family)}"></div>
      <div data-service-config="facility-config" data-service-row="application-config-instance:${hex(family)}:${hex(argument)}"></div>`}
    ${definition.configResourceId ? (definition.configHandles || [null]).map(handle =>
      `<div data-service-config="${esc(definition.configResourceId)}"${handle ? ` data-service-row="${esc(handle)}"` : ''}></div>`).join('') : ''}`;
  return {
    className: "facility-ui-workbench service-ui-workbench",
    treeExtraMarkup: panel(`场景角色（${serviceActors.length}）`,
      `<div data-service-actors>${actorTable}</div>${storageLink}`, {flat: true}),
    inspectorExtraMarkup: configuration,
  };
}

export async function bindServicePage(root = document, {repaint = () => {}, rerender = async () => {}} = {}) {
  const actors = root.querySelector("[data-service-actors]");
  if (actors) bindRecordLinks(actors, route => {location.href = route;});
  if (isSpecialServicePage(interfacePageDefinition(state.interfacePage))) return bindSpecialServicePage(root, {rerender});
  for (const host of root.querySelectorAll('[data-service-config]')) {
    const objects = await db.getFieldObjects(host.dataset.serviceConfig);
    if (!host.isConnected) return;
    const handle = host.dataset.serviceRow;
    await Promise.all(objects.filter(object => !handle || object.fields.some(field => field.entityHandle === handle)).map(object => {
      const container = host.ownerDocument.createElement('div');
      host.append(container);
      return object.mount(container, {rowHandles: handle ? [handle] : undefined});
    }));
  }
}
