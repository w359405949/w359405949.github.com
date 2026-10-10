import { db, MACHINE_SERVICE_COMMANDS, UI_FACILITY_PARAMETER_RESOURCE_IDS } from './prg-loaders-DnCSmXk9.js';
import { state } from './emulator-Bpa8EsFw.js';
import { esc, prepareModuleComponent } from './interface-state-preview-Dlotqlmn.js';
import { panel } from './record-6_wsSDi2.js';
import { dataTable, bindRecordLinks } from './battle-result-script-runtime-BSeJpUGH.js';
import { fixedTextEditorMarkup, referencePickerMarkup, bindReferencePicker, updateReferencePickerItem, bindFixedTextEditors } from './timeline-player-YCH7Y-3h.js';
import { interactionEditorHref } from './interaction-components-DjtMdVmW.js';
import { INTERFACE_PAGE_DEFINITIONS, interfacePageDefinition, serviceFamilyPage } from './editor-renderer-n2nBwXk_.js';
import { applicationDestination } from './battle-result-state-machine-BbK2hSud.js';
import { interfacePreviewContext } from './element-tree-C1bWRgTl.js';
import { uiRecordComponentLabel } from './story-component-labels-CSjCRgXX.js';
import { createShopStateWorkbench } from './service-pages-0AX3Py0f.js';
import { serviceInvocation } from './service-preview-scene-CPwiqon9.js';
import { renderInterfacePage } from './interface-pages-Z6ds5_V3.js';
import './components-DZ4_ZF2v.js';
import { mountConfigurationFieldTable } from './configuration-table-FR1xSC8W.js';
import './baseline-assembly-DW8BWbDB.js';
import './visual-metasprites-IDA0o2Z8.js';
import './scene-encounter-probabilities-C0m_IdC-.js';
import './global-random-DAuRNoyj.js';
import './charset-j6-kYKbE.js';
import './preview-sound-CiEAOXPD.js';
import './overview-BWR5QCHz.js';
import './page-package-inputs-Dzxj7YGf.js';
import './ui-construction-preview-BuoQ5mM6.js';
import './configuration-summary-m9SZR_6_.js';
import './page-runtime-paths-BvtuMnH7.js';
import './physical-field-object-windows-DnQmS3eb.js';
import './document-controls-C8YiQAPz.js';
import './components-DbJXuRMn.js';
import './interface-state-frame-ZrXRl0fR.js';
import './machine-service-model-B-6y5baD.js';
import './field-object-editor-Blro4OF0.js';
import './attack-chr-tile-selector-Bv5xCQyz.js';
import './field-address-table-BnL1Mgdy.js';
import './text-record-structure-editor-BB8pdofu.js';
import './device-service-context-B5xDhK9J.js';
import './components-DsypHVsJ.js';
import './components-BIpJ3l3a.js';
import './battle-simulation-player-CgsqKnB3.js';
import './battle-actors-Ci6buYr0.js';
import './game-ui-workbench-Dsg65sF-.js';
import './entity-detail-r8jOlBq7.js';
import './components-DFg4zDq1.js';
import './scene-actor-interaction-picker-D6QFBEMg.js';
import './system-state-model-zPjxuFk6.js';
import './text-record-controls-Ca9jGqUd.js';
import './components-D8Tpyo4s.js';
import './generic-shop-BGLHBrHc.js';
import './machine-state-controller-BC0tIHJk.js';
import './components-D0Rv67Tu.js';
import './system-state-controller-CY2WlfQd.js';

// @editor-module 服务交互记录入口复用所属领域工作台与字段对象控件。

const hex = value => Number(value).toString(16).toUpperCase().padStart(2, '0');
const commandHandle = id => `application-command:${hex(id)}`;
const serviceRecordHref = (handle, argument = 0) => `?${new URLSearchParams({view: 'interfaceui',
  interface: 'interaction-service', resource: handle, record: String(argument)})}`;
const fieldHost = (resourceId, handle = '') => `<div data-interaction-service-fields="${esc(resourceId)}" data-interaction-service-record="${esc(handle)}"></div>`;
let active = null;

async function configurationChoices(familyId, records) {
  const prepared = await prepareModuleComponent('facility-config', 'reference');
  if (prepared.error) throw new Error(prepared.error);
  return records.map(row => {
    const handle = `application-config-instance:${hex(familyId)}:${hex(row.id)}`;
    return {value: row.id, label: prepared.entries.find(entry => entry.handle === handle).label};
  });
}

async function mountRecordControls(root, {onSaved = () => {}, bindText = true} = {}) {
  for (const host of root.querySelectorAll('[data-interaction-service-prices]')) {
    if (host.dataset.interactionServiceMounted) continue;
    host.dataset.interactionServiceMounted = '1';
    const objects = (await Promise.all(UI_FACILITY_PARAMETER_RESOURCE_IDS
      .filter(id => id.startsWith('ui-facility:frog-race:'))
      .map(id => db.getFieldObjects(id)))).flat();
    if (host.isConnected) await mountConfigurationFieldTable(host, objects);
  }
  for (const host of root.querySelectorAll('[data-interaction-service-fields]')) {
    if (host.dataset.interactionServiceMounted) continue;
    host.dataset.interactionServiceMounted = '1';
    const objects = await db.getFieldObjects(host.dataset.interactionServiceFields);
    if (!host.isConnected) return;
    const handle = host.dataset.interactionServiceRecord;
    for (const object of objects.filter(object => !handle
      || object.fields.some(field => field.entityHandle === handle))) {
      const container = host.ownerDocument.createElement('div');
      host.append(container);
      await object.mount(container, {rowHandles: handle ? [handle] : undefined});
    }
  }
  for (const host of bindText ? root.querySelectorAll('[data-interaction-service-text]') : []) {
    if (host.dataset.interactionServiceMounted) continue;
    host.dataset.interactionServiceMounted = '1';
    await bindFixedTextEditors(host, {onSaved})?.ready;
  }
}

function interactionServiceWorkbenchOptions() {
  return active?.definition ? {definition: active.definition, bindInspector: root => {
    void mountRecordControls(root, {bindText: false}).catch(error => {
      if (root.isConnected) root.insertAdjacentHTML('beforeend', `<p role="alert">${esc(error.message)}</p>`);
    });
  }} : null;
}

async function renderInteractionService() {
  active = null;
  const facilities = await db.getDocument('project.facilities');
  const commands = facilities.applications.commands;
  const rows = Array.from({length: 48}, (_, index) => {
    const id = index + 0x10;
    const command = commands.find(row => Number(row.command_id) === id);
    const label = command?.label || `服务 ${hex(id)}`;
    return {id, handle: commandHandle(id), label,
      listLabel: command ? label : `${label}（无已发布字段）`};
  });
  const id = /^application-command:[0-9A-F]{2}$/u.test(state.resourceId || '')
    ? Number.parseInt(state.resourceId.split(':')[1], 16) : null;
  if (id >= 0x39 && id <= 0xFF) {
    const command = await db.getResourceDocument(commandHandle(id));
    const document = await db.getResourceDocument('application-program');
    const program = document.independent_programs.find(row => row.id === command.program_reference);
    const records = [...new Set((program?.segments || []).flatMap(row => row.instructions)
      .filter(row => row.kind === 'text').map(row => `record:06:${String(Number.parseInt(row.record.slice(-3), 16)).padStart(3, '0')}`))];
    return `<div class="page-body" data-interaction-service="${esc(commandHandle(id))}">
      ${panel(command.label, `<p>${esc(commandHandle(id))} · ${esc(command.program_reference || '')}</p>`)}
      ${records.length ? panel('正文', `<div data-interaction-service-text>${records.map(record =>
        fixedTextEditorMarkup({recordId: record, editorId: `interaction-service:${record}`, label: '正文', compact: true})).join('')}</div>`, {flat: true}) : ''}
    </div>`;
  }
  const selected = rows.find(row => row.id === id);
  if (!selected) return `<div class="page-body">${dataTable({
    columns: [{key: 'id', label: '编号', mono: true, width: 64, cell: row => hex(row.id)},
      {key: 'listLabel', label: '服务', fit: true, grow: true, wrap: true,
        cell: row => `<a class="record-link" href="${esc(serviceRecordHref(row.handle))}">${esc(row.listLabel)}</a>`}],
    rows, rowId: row => row.handle, recordRoute: row => serviceRecordHref(row.handle),
  })}</div>`;
  const argument = Number(state.recordId || 0);
  const command = commands.find(row => Number(row.command_id) === id);
  const listLink = '<a class="editor-inline-link" href="?view=interfaceui&amp;interface=interaction-service">服务交互列表</a>';
  if (!command) return `<div class="page-body">${panel(selected.label,
    `${listLink}<p>${esc(selected.handle)} · 配置 ${hex(argument)}</p><p>无已发布的服务正文与可编辑字段。</p>`)}</div>`;
  const configuration = await db.getResourceDocument('facility-config');
  const familyId = command.configuration_family?.family_id;
  const family = configuration.families.find(row => Number(row.id) === Number(familyId));
  const alias = family?.records.find(row => Number(row.id) === argument);
  const options = family ? await configurationChoices(familyId, family.records) : [];
  const configurationChoice = options.length ? referencePickerMarkup({moduleId: 'facility-config',
    items: options, value: argument, label: '配置', compact: true,
    controlMarkup: `<select data-interaction-service-config>${options.map(row =>
      `<option value="${row.value}"${Number(row.value) === argument ? ' selected' : ''}>${esc(row.label)}</option>`).join('')}</select>`}) : '';
  const resources = [];
  if (alias) resources.push(fieldHost('facility-config', alias.record_id));
  else if (family) resources.push(`<p role="alert">配置 ${hex(argument)} 不在已发布配置族中。</p>`);
  if (family) resources.push(fieldHost(`application-config-family:${hex(familyId)}`));
  if ([0x32, 0x33].includes(id)) resources.push('<div data-interaction-service-prices></div>');
  if (id === 0x2d) for (let index = 0; index < 13; index++)
    resources.push(fieldHost(`ui-facility:teleport-terminal:config:${hex(index)}`));
  const definition = INTERFACE_PAGE_DEFINITIONS.find(row => row.id !== 'interaction-service'
    && row.commandIds?.includes(id));
  if (definition?.configResourceId) resources.push(fieldHost(definition.configResourceId));
  if (id === 0x31) resources.push(fieldHost('save-slot-runtime-service'));
  const records = [...new Set((command.dialogue_flow?.segments || [])
    .flatMap(segment => segment.actions || []).map(action => action.record).filter(Boolean))];
  const textControl = record => `<div data-interaction-service-text><a href="${esc(interactionEditorHref(record))}">${esc(record)} ↗</a>
    ${fixedTextEditorMarkup({recordId: record, editorId: `interaction-service:${record}`, label: '对话', compact: true})}</div>`;
  const controls = [...(resources.length ? [{id: 'service-configuration', label: '服务配置', depth: 0, markup: resources.join('')}] : []),
    {id: 'service-entry', label: '脚本入口', depth: 0, markup: fieldHost(selected.handle)},
    ...records.map(record => ({id: `service-body:${record}`, label: uiRecordComponentLabel(record, {fallback: '服务正文'}),
      depth: 1, record, markup: textControl(record)}))];
  const target = applicationDestination(id, argument, {facilities}).target;
  const toolbar = `${listLink} · <span>${esc(selected.handle)} · ${esc(selected.label)}</span>${configurationChoice || `<span>配置 ${hex(argument)}</span>`}
    ${target ? `<a class="editor-inline-link" href="${esc(target.href)}">${esc(target.label)} ↗</a>` : ''}`;
  const context = interfacePreviewContext();
  const invocation = serviceInvocation({command: id, instance: argument}, context.scene?.sceneId,
    context.service?.command === id ? context.service.entryHandle : null, facilities);
  context.service = {...context.service, command: id, argument,
    entryHandle: invocation.entryHandle || null};
  let markup;
  if (MACHINE_SERVICE_COMMANDS.includes(id) || [0x31, 0x34].includes(id)) {
    await db.getResourceDocument(selected.handle);
    const page = [0x31, 0x34].includes(id) ? interfacePageDefinition(id === 0x31 ? 'name-entry' : 'save-management')
      : serviceFamilyPage(id);
    const branches = state.project.ui.construction.interfaces.application_branch_sources.filter(row => row.command === selected.handle);
    const covered = new Set(branches.flatMap(row => row.bodies || []).map(row => row.record));
    const extra = controls.filter(row => !row.record || !covered.has(row.record));
    const nameVariant = id === 0x31 && document.querySelector('[data-interaction-service="application-command:31"] [data-system-state-name-variant]')?.value;
    active = {definition: {...page, ...(nameVariant ? {systemVariant: nameVariant} : {}),
      ...([0x31, 0x34].includes(id) ? {} : {commandId: id, commandIds: [id]}), supportingNodes: extra.map(row => ({
      ...row, kind: 'group', controlsMarkup: row.markup,
    }))}};
    markup = renderInterfacePage({
      definition: active.definition,
      toolbarMarkup: toolbar,
      preparePreviewControls: true,
      inspectorExtraMarkup: page.serviceFlow ? '' : controls.map(row => panel(row.label, row.markup, {flat: true})).join(''),
    });
  } else {
    const selectionKey = `${selected.handle}:${argument}`;
    if (state.interactionServiceSelection?.repository !== state.projectRepository
        || state.interactionServiceSelection.key !== selectionKey)
      state.interactionServiceSelection = {repository: state.projectRepository, key: selectionKey,
        instance: argument, node: null, widget: 'screen', edge: null, path: '', step: 0, objectSelected: false, zoom: 'fit'};
    const workbench = createShopStateWorkbench({namespace: 'interaction-service', fixedCommand: id,
      selection: () => state.interactionServiceSelection, toolbarMarkup: toolbar,
      evidenceVisible: false, previewScene: true, pathsInPreview: true, getEntry: () => state.interfacePageEntry || '',
      componentNodes: model => controls.map(row => ({...row, nodeId: row.record
        ? model.graph.nodes.find(node => node.action?.record === row.record || node.response?.action?.record === row.record)?.id : null})),
      mountComponent: async (host, widget, {rerender}) => {
        if (!widget?.markup) return false;
        host.innerHTML = widget.markup;
        await mountRecordControls(host, {onSaved: rerender});
        return true;
      }});
    active = {workbench};
    markup = await workbench.render();
  }
  return `<div data-interaction-service="${esc(selected.handle)}" data-interaction-service-instance="${argument}">${markup}</div>`;
}

async function bindInteractionService(root, {rerender = () => {}} = {}) {
  bindRecordLinks(root, route => {location.href = route;});
  root = root.querySelector('[data-interaction-service]');
  if (!root) return;
  if (active?.workbench) await active.workbench.bind(root, {rerender});
  else root.addEventListener('field-object-saved', () => {
    void Promise.resolve(rerender()).catch(error => {
      if (root.isConnected) root.insertAdjacentHTML('beforeend', `<p role="alert">${esc(error.message)}</p>`);
    });
  });
  const picker = root.querySelector('[data-interaction-service-config]')?.closest('[data-module-reference-picker]');
  if (picker) bindReferencePicker(picker, {onSelect: value => {
    location.href = serviceRecordHref(state.resourceId, Number(value));
  }});
  let generation = 0;
  root.addEventListener('field-object-saved', async () => {
    if (!picker) return;
    const current = ++generation;
    try {
      const document = await db.getResourceDocument('facility-config');
      const facilities = await db.getDocument('project.facilities');
      const command = facilities.applications.commands.find(row => commandHandle(row.command_id) === state.resourceId);
      const familyId = command?.configuration_family?.family_id;
      const family = document.families.find(row => Number(row.id) === Number(familyId));
      if (!family) return;
      const options = await configurationChoices(familyId, family.records);
      if (!root.isConnected || current !== generation) return;
      for (const option of options) {
        updateReferencePickerItem(picker, option);
        picker.querySelector(`option[value="${option.value}"]`).textContent = option.label;
      }
    } catch (error) {
      if (root.isConnected && current === generation)
        root.insertAdjacentHTML('beforeend', `<p role="alert">${esc(error.message)}</p>`);
    }
  });
  await mountRecordControls(root, {bindText: !active?.definition, onSaved: rerender});
}

export { bindInteractionService, interactionServiceWorkbenchOptions, renderInteractionService };
