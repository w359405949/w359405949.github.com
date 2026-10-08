// @editor-module 界面页只组织所属模块的状态、文字与预览组件。

import {editorLog} from "../core/editor-log.js";
import {resolveServicePreview} from "../render/service-preview.js";
import {interfaceValueContext, interfaceBattleValuePreview} from "../render/interface-value-preview.js";
import {interfaceValueSelectionMarkup, bindInterfaceValueSelection} from "../ui/interface-value-selection.js";
import {battleResultSelectionMarkup, bindBattleResultSelection} from '../ui/battle-result-selection.js';
import {battleResultStateControls, battleResultStatePreview, bindBattleResultStateController} from '../ui/battle-result-state-controller.js';
import {esc} from "../core/dom.js";
import {currentViewUrl, replaceHistoryUrl, bindInternalPageLinks} from "../core/router.js";
import {state} from "../core/state.js";
import {teleportDestinationsMarkup} from '../modules/facility/teleport-destinations.js';
import {
  BATTLE_ACTOR_CHR_PATTERN_PROFILES,
  battleActorCatalog,
} from "../core/battle-actor-assets.js";
import {battleActionPlacements} from "../render/weapon-effect-vm.js";
import {
  INTERFACE_PAGE_DEFINITIONS,
  interfacePageDefinition,
  itemEffectPagesForItem,
  normalizeInterfacePageId,
  dedicatedUiPageForScreen,
} from "../core/ui-page-registry.js";
import {
  bindGameUiWorkbench,
  gameUiWorkbenchNodes,
  renderGameUiWorkbench,
  selectedGameUiWorkbenchNode,
  selectGameUiWorkbenchNode,
} from "./game-ui-workbench.js";
import {bindUiEditorReferenceLists, uiEditorPackagePreviewUrl, uiEditorPreviewDraft, uiEditorRuntimePreview, uiEditorStateTemplateBinding} from "./ui-editor.js";
import {noahTerminalPreview, startupLoadPreview, uiConstructionModel} from "../modules/visual/ui-construction-preview.js";
import {currentTextReference, currentTextReferenceLink, currentTextChoiceLabel, indexedResource} from "../core/resource-index.js";
import {bindSatelliteMapFields, satelliteMapEditorMarkup} from "../modules/visual/satellite-map.js";
import {showEditorError} from "../ui/editor-error.js";
import {bindReferencePicker, referencePickerMarkup} from "../ui/reference-picker.js";
import {paintVehicleBattlePortraitCanvases, vehicleBattleActionKey,
  vehicleBattlePreviewMarkup} from "../modules/vehicle/components.js";
import "../modules/save/components.js";
import {fieldMenuNavigationEntry, fieldMenuParentEntries, fieldMenuHref, FIELD_MENU_PARENTS,
  fieldMenuFlowScreen, fieldMenuFlowSteps} from "../core/field-menu-tree.js";
import {fieldMenuStepKey, fieldMenuFlowComponentNodes,
  fieldMenuFlowComponentProjection} from '../modules/visual/field-menu-flow.js';
import {menuApplicationDialoguePreview, menuApplicationDialogueSteps} from '../modules/visual/menu-application-dialogues.js';
import {fieldMenuRolePreview, fieldMenuVehiclePreview, fieldMenuLoadoutSelection, paintFieldMenuIcons, startupLoadNodes} from "../modules/visual/field-menu.js";
import {itemNameRecordId, textRecordComponents} from '../core/text-record-project.js';
import {itemPageRoute} from '../core/editor-pages.js';
import {projectFieldDraftOrigin} from '../core/project-field-draft.js';
import {uiRecordComponentLabel, uiChoiceComponentLabel} from '../core/ui-component-labels.js';
import {bindFieldMenuLoadout, bindFieldMenuObject, fieldMenuLoadoutKind, fieldMenuLoadoutNodes,
  fieldMenuObjectMarkup, fieldMenuPreviewObject, prepareFieldMenuPreviewObject,
  fieldMenuPreviewSlotMarkup, fieldMenuPreviewItemOverrides} from "../ui/field-menu-loadout.js";
import {bindFieldMenuWantedHistory, fieldMenuWantedHistoryMarkup} from '../ui/field-menu-wanted-history.js';
import {bindSceneInteractionPreview, sceneInteractionMenuPreview, sceneInteractionPreviewMarkup} from "../ui/scene-actor-interaction-picker.js";
import {serviceFlowNodes, serviceFlowPreview, bindServiceFlowFields} from './service-flow-tree.js';
import {bindTerminalPreviewInputs} from '../ui/terminal-preview-inputs.js';
import {selectionLayoutMarkup, bindSelectionLayoutControls} from '../modules/visual/selection-layout.js';
import {vehiclePartLayoutMarkup, bindVehiclePartLayout} from '../modules/visual/vehicle-part-layout.js';
import {bindListOrderControls} from '../modules/visual/list-order.js';
import {CHARACTER_STATUS_DETAIL_SCREEN_ID, VEHICLE_STATUS_DETAIL_SCREEN_ID,
  resolveEndingCreditsUiPreview, resolveStatusUiPreview} from "./status-ui.js";
import {interfaceButtonNodes, interfaceWindowTree, interfaceCursorReferenceMarkup, interfaceButtonSourceMarkup} from '../modules/visual/interface-buttons.js';
import {renderCommonInterfaceElements, bindCommonInterfaceElements,
  commonInterfaceElementNodes} from '../modules/visual/common-interface-elements.js';
import {interfacePreviewContext, interfacePreviewWantedHistoryOverrides} from '../core/interface-preview-context.js';
import {interfacePreviewEntityTypes} from '../core/interface-preview-scope.js';
import {interfaceComponentNodes, interfaceComponentBounds} from '../modules/visual/interface-components.js';
import {bindInterfaceButtonSelection, interfaceButtonSelectionPreview,
  interfaceButtonSelectionMarkup} from '../modules/visual/interface-button-selection.js';
import {fieldSubmenuComponentRecords} from '../render/field-submenu-preview.js';
import {interfaceDataControlNodes, bindInterfaceDataControls} from '../modules/visual/interface-data-controls.js';
import {vehiclePartControlsMarkup, bindVehiclePartControls} from '../modules/visual/interface-vehicle-parts.js';
import {dialoguePreviewFrames} from '../modules/text/dialogue-preview.js';
import {bindUiCommandDispatchControls} from '../modules/visual/ui-command-dispatch.js';
import {rerenderElementTreeKeepingSelectionVisible} from '../ui/element-tree.js';
import {fieldMenuStateControls, fieldMenuStatePreview, bindFieldMenuStateController} from '../ui/field-menu-state-controller.js';
import {machineStateControls, machineStatePreview, bindMachineStateController} from './machine-state-controller.js';
import {battleCommandStateControls, bindBattleCommandStateController} from '../ui/battle-command-state-controller.js';
import {battleMessageStateControls, battleMessageStateNodes, battleMessageStatePreview,
  bindBattleMessageStateController} from '../ui/battle-message-state-controller.js';
import {systemStateControls, systemStatePreview, systemStateDisplayPage, systemStateModelPreview, systemStateComponentNodes, systemStateServiceNodes, bindSystemStateController} from './system-state-controller.js';
import {renderFieldDialogueState, bindFieldDialogueState} from './field-dialogue-state.js';

const STATUS_LABELS = Object.freeze({
  confirmed: "已确认",
  candidate: "候选",
  inferred: "推定",
  unresolved: "待解析",
  "confirmed-purpose": "用途已确认",
});

const STATE_COMPONENT_LABELS = Object.freeze({
  "experience-information-terminal.title": "经验值标题",
  "save-management.save-prompt": "存档确认",
  "save-management.slot-select": "存档槽选择",
  "save-management.saved": "保存结果",
});

function statusLabel(status) {
  return STATUS_LABELS[String(status || "")] || String(status || "未标注");
}

function interfacePageNamespace(pageId) {
  return `interface-page:${pageId}`;
}

function interfaceCatalog() {
  return state.project?.ui?.construction?.interfaces?.interfaces || [];
}

function definitionInterfaceIds(definition) {
  return definition?.interfaceIds?.length
    ? definition.interfaceIds
    : definition?.id ? [definition.id] : [];
}

function definitionStateIds(definition) {
  return new Set(definition?.stateIds || []);
}

function statesForEntry(interfaceEntry, definition) {
  const stateIds = definitionStateIds(definition);
  const states = (interfaceEntry?.states || []).filter(stateEntry => stateEntry.status !== "unreachable"
    && !definition?.excludedStateIds?.includes(stateEntry.id));
  return stateIds.size
    ? states.filter(stateEntry => stateIds.has(stateEntry.id))
    : states;
}

function interfacePageCatalogEntries(pageId = state.interfacePage, definition = interfacePageDefinition(pageId)) {
  const interfaceIds = new Set(definitionInterfaceIds(definition));
  return interfaceCatalog().filter(item => interfaceIds.has(item.id));
}

function interfacePageScreens(pageId = state.interfacePage, definition = interfacePageDefinition(pageId)) {
  const interfaceIds = new Set(definitionInterfaceIds(definition));
  const stateIds = definitionStateIds(definition);
  return (state.project?.ui?.editor?.screens || []).filter(screen => {
    const interfaceId = String(
      screen.interface_id ?? screen.metadata?.interface_id ?? ""
    );
    const stateId = String(
      screen.interface_state_id ?? screen.metadata?.interface_state_id ?? ""
    );
    return interfaceIds.has(interfaceId)
      && (!stateIds.size || stateIds.has(stateId))
      && !definition?.excludedStateIds?.includes(stateId)
      && screen.state_ui_role === "screen"
      && screen.state_status !== "unreachable";
  });
}

function screenForState(screens, stateEntry) {
  return screens.find(screen => screen.interface_state_id === stateEntry?.id) || null;
}

function previewForInterfaceEntry(screen, fallback = null) {
  const preview = state.project?.ui?.construction?.menu_dispatch_data?.previews?.find(preview =>
    preview.interface_state_id === screen?.interface_state_id
    && preview.interface_entry_id === state.interfacePageEntry) || fallback;
  return menuApplicationDialoguePreview(preview);
}

function selectedScreenFor(pageId, screens) {
  const requested = String(state.interfacePageScreen || "");
  const hasPreview = screen => uiEditorPreviewDraft(screen.id) || uiEditorRuntimePreview(screen);
  const selected = screens.find(screen => screen.id === requested)
    || (pageId === 'party-strength' && interfacePreviewContext().kind === 'vehicle'
      ? screens.find(screen => screen.id === VEHICLE_STATUS_DETAIL_SCREEN_ID) : null)
    || screens.find(screen => screen.coverage?.has_visual_preview === true && hasPreview(screen))
    || screens.find(hasPreview)
    || screens[0]
    || null;
  if (state.interfacePage === pageId) {
    state.interfacePageScreen = selected?.id || null;
  }
  return selected;
}

function recordLabel(record, index) {
  const text = String(record?.formatted_text || "")
    .replaceAll("\n", " / ")
    .replace(/\s+/gu, " ")
    .trim();
  if (!text) return `文字 ${index + 1}`;
  return text.length > 24 ? `${text.slice(0, 24)}…` : text;
}

function recordSelection(recordId) {
  return {record_id: recordId};
}

function evidenceCount(stateEntry) {
  const evidence = stateEntry?.evidence || {};
  return [
    ...(evidence.records || []),
    ...(evidence.layouts || []),
    ...(evidence.runtime_scenes || []),
    ...(evidence.reconstruction_previews || []),
  ].length;
}

function statePreviewNote(screen) {
  if (!screen) return "该条是流程动作，不对应独立的 UI screen。";
  if (uiEditorRuntimePreview(screen)) {
    return "当前状态链接到独立 PPU 重建的整屏运行样本；样本只用于核对，基础资产仍由各专有模块拥有。";
  }
  if (screen.coverage?.has_visual_preview === true) {
    return "当前状态链接到已登记的资产重建画面。";
  }
  const binding = uiEditorStateTemplateBinding(screen);
  return binding?.binding?.reason
    || "当前状态没有逐像素采样；舞台按已登记文字、布局和共用窗口模板生成结构预览。";
}

function optionNodesForScreen(screen) {
  const document = state.project?.ui?.editor;
  if (!screen || !document) return [];
  const dispatch = state.project?.ui?.construction?.menu_dispatch_data;
  const entryId = previewForInterfaceEntry(screen, uiEditorPreviewDraft(screen.id))?.interface_entry_id;
  const nodes = document.nodes || {};
  const pending = [screen.root_node];
  const seen = new Set();
  const options = [];
  while (pending.length) {
    const id = pending.pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const node = nodes[id];
    if (!node) continue;
    if (node.type === "options") {
      const group = dispatch?.choice_groups?.find(group => group.id === node.properties?.group_id);
      if (!group?.interface_entry_id || group.interface_entry_id === entryId) options.push(node);
    }
    pending.push(...(node.children || []));
  }
  return options.flatMap(node => [{
    id: node.id,
    kind: "group",
    label: "选项列表",
    detail: `选项列表 · ${node.children?.length || 0} 项 · UI 基础资产`,
    depth: 1,
    screenId: screen.id,
    optionGroupId: node.properties?.group_id,
  }, ...(node.children || []).flatMap(id => {
    const option = nodes[id];
    if (!option) return [];
    const action = nodes[option.children?.[0]];
    const targetId = option.properties?.target_screen_id || action?.properties?.target_screen_id;
    const target = document.screens.find(candidate => candidate.id === targetId);
    const destination = dedicatedUiPageForScreen(target);
    const group = dispatch?.choice_groups?.find(group => group.id === node.properties?.group_id);
    const choice = group?.choices?.find(choice => choice.index === option.properties?.index);
    const href = destination?.view === 'interfaceui' ? fieldMenuHref({pageId: destination.interfacePage,
      screenId: targetId, entryId: choice?.target_entry_id})
      : destination ? `?${new URLSearchParams({view: destination.view,
        ...(destination.shopFamily === undefined ? {} : {shopFamily: destination.shopFamily}),
        ...(destination.shopTab ? {shopTab: destination.shopTab} : {})})}` : null;
    const recordId = option.source?.record;
    const textDocument = state.project?.text_record_edits;
    const origin = projectFieldDraftOrigin(textDocument) || textDocument;
    const record = origin?.records?.[recordId];
    const component = record && state.project?.text_record_encoding
      ? textRecordComponents(record, state.project.text_record_encoding, origin)
        .find(component => component.kind === 'text' && component.text.trim() === option.label.trim()) : null;
    return [{id: option.id, kind: 'button', label: uiChoiceComponentLabel(group, choice, option.label), depth: 2, screenId: screen.id,
      optionGroupId: group?.id, optionIndex: option.properties?.index, choiceSourceKind: group?.choice_source?.kind,
      button: true, textComponents: true, cursorIndex: null, sourceRecord: recordId,
      ...(component ? {recordId, ranges: component.ranges, editorId: option.id, editorMode: 'capacity',
        selection: {record_id: recordId, ranges: component.ranges}} : {}),
      controlsMarkup: `<dl class="screen-workbench-facts">
        <div><dt>文字来源</dt><dd>${interfaceButtonSourceMarkup(recordId)}</dd></div>
        ${href ? `<div><dt>跳转目标</dt><dd><a class="editor-inline-link" href="${esc(href)}">${esc(target.label)} ↗</a></dd></div>` : ''}
      </dl>${interfaceCursorReferenceMarkup()}`}];
  })]);
}

function entryActorLinks(definition) {
  return (definition?.entryActors || []).map(actor =>
    `<a class="editor-inline-link" href="?view=scenes&amp;scene=${encodeURIComponent(actor.scene)}&amp;sceneMode=logic&amp;sceneObject=${encodeURIComponent(actor.sceneObject)}"
      title="${esc(actor.uid)}">${esc(actor.uid)} ↗</a>`).join(' · ');
}

function interfacePageUiNodes(interfaceEntries, screens, definition, selectedScreen) {
  if (!interfaceEntries.length || !definition) return [];
  const pageStates = interfaceEntries.flatMap(
    entry => statesForEntry(entry, definition),
  );
  const descriptions = [...new Set(
    interfaceEntries.map(entry => String(entry.description || "").trim()).filter(Boolean)
  )];
  const inferred = definition.status === "inferred"
    || interfaceEntries.some(entry => entry.status === "inferred");
  const fieldPage = !definition.id.startsWith('battle-');
  const nodes = [{
    id: `${definition.id}:interface`,
    kind: "screen",
    label: definition.label.replace(/（推定）/gu, ""),
    detail: `独立界面页 · ${interfaceEntries.length} 个界面族 · ${pageStates.length} 个状态`,
    depth: 0,
    facts: [],
    note: inferred
      ? `${descriptions.join(" ")} 名称或 NPC 直接关联仍标为推定，后续证据补入目录即可自动反映到本页。`
      : descriptions.join(" "),
  }];

  const multipleEntries = interfaceEntries.length > 1;
  for (const interfaceEntry of interfaceEntries) {
    for (const [stateIndex, stateEntry] of statesForEntry(
      interfaceEntry, definition,
    ).entries()) {
      const screen = screenForState(screens, stateEntry);
      if (!screen || screen.id !== selectedScreen?.id) continue;
      const evidence = stateEntry.evidence || {};
      const stateNodeId = `${definition.id}:${interfaceEntry.id}:state:${stateEntry.id}`;
      const stateLabel = STATE_COMPONENT_LABELS[stateEntry.id]
        || stateEntry.label || `状态 ${stateIndex + 1}`;
      if (!fieldPage) nodes.push({
        id: stateNodeId,
        kind: screen ? "state" : "dynamic",
        label: multipleEntries
          ? `${interfaceEntry.label} / ${stateLabel}` : stateLabel,
        detail: `${stateEntry.ui_role === "screen" ? "界面状态" : "流程动作"} · ${statusLabel(stateEntry.status)}`,
        depth: 1,
        screenId: screen?.id || null,
        stateId: stateEntry.id,
        facts: [
          {label: "界面 ID", value: interfaceEntry.id, mono: true},
          {label: "状态 ID", value: stateEntry.id, mono: true},
          {label: "角色", value: stateEntry.ui_role || "—"},
          ...(screen?.id ? [{label: "UI screen", value: screen.id, mono: true}] : []),
        ],
        note: statePreviewNote(screen),
      });

      for (const [recordIndex, record] of (evidence.records || []).entries()) {
        if (!record?.id) continue;
        const battleText = definition.id.startsWith("battle-");
        const readonlyText = battleText || !state.project?.text_record_edits?.records?.[record.id]?.editable_byte_capacity;
        nodes.push({
          id: `${stateNodeId}:record:${record.id}:${recordIndex}`,
          kind: "text",
          label: uiRecordComponentLabel(record.id, {fallback: `${stateLabel}正文`}),
          detail: `文字 · ${record.id}${battleText ? "" : " · 可编辑"}`,
          depth: fieldPage ? 1 : 2,
          screenId: screen?.id || null,
          stateId: stateEntry.id,
          ...(readonlyText ? {inspectorMarkup: `<p>${record.id.startsWith("record:")
            ? currentTextReferenceLink(record.id, recordLabel(record, recordIndex))
            : esc(recordLabel(record, recordIndex))}</p>`} : {
            recordId: record.id,
            editorId: `${definition.id}:${stateEntry.id}:${record.id}`,
            editorLabel: uiRecordComponentLabel(record.id, {fallback: `${stateLabel}正文`}),
            editorMode: "capacity",
            description: "编辑 text-record 中的实际文字；窗口、动态值和控制命令保持不变，容量规则由共用文本组件处理。",
          }),
          selection: recordSelection(record.id),
          facts: [
            {label: "文字记录", value: record.id, mono: true},
            {label: "资产所有者", value: "text-record"},
          ],
        });
      }

      const layouts = (evidence.layouts || [])
        .filter((layout, index, all) => layout?.id
          && all.findIndex(candidate => candidate?.id === layout.id) === index);
      for (const [layoutIndex, layout] of layouts.entries()) {
        if (!layout?.id) continue;
        nodes.push({
          id: `${stateNodeId}:layout:${layout.id}:${layoutIndex}`,
          kind: "layout",
          label: uiRecordComponentLabel(layout.id, {layout: true, fallback: stateLabel}),
          detail: "布局记录 · 基础 UI 资产",
          depth: 2,
          screenId: screen?.id || null,
          stateId: stateEntry.id,
          facts: [
            {label: "布局记录", value: layout.id, mono: true},
          ],
          controlsMarkup: currentTextReferenceLink(layout.id),
          note: "布局仍由 UI 基础资产模块拥有；本页只引用，不保存副本。",
        });
      }

      for (const [previewIndex, preview] of (fieldPage ? [] : (
        evidence.reconstruction_previews || []
      )).entries()) {
        nodes.push({
          id: `${stateNodeId}:preview:${preview.id || previewIndex}`,
          kind: "image",
          label: `图像 ${previewIndex + 1}`,
          detail: "资产重建证据",
          depth: 2,
          screenId: screen?.id || null,
          stateId: stateEntry.id,
          facts: [
            {label: "预览资源", value: preview.id || "—", mono: true},
          ],
          note: "这是 canonical state 所链接的重建证据，不是第二套界面资产。",
        });
      }

      for (const [sampleIndex, sample] of (fieldPage ? [] : evidence.runtime_scenes || []).entries()) {
        nodes.push({
          id: `${stateNodeId}:runtime:${sample.id || sampleIndex}`,
          kind: "dynamic",
          label: `运行预览 ${sampleIndex + 1}`,
          detail: `运行上下文 · ${sample.available ? "可用" : "未采集"}`,
          depth: 2,
          screenId: screen?.id || null,
          stateId: stateEntry.id,
          facts: [
            {label: "运行状态", value: sample.id || "—", mono: true},
            {label: "阶段", value: sample.phase || "—"},
          ],
        });
      }
    }
  }
  return nodes;
}

function interfacePageStepModel(pageId = state.interfacePage, definition = null, {prepareObject = true} = {}) {
  const id = definition?.id || normalizeInterfacePageId(pageId);
  definition ||= interfacePageDefinition(id);
  const interfaceEntries = interfacePageCatalogEntries(id, definition);
  const screens = interfacePageScreens(id, definition);
  if (id === 'common-elements') return {id, definition, interfaceEntries, screens,
    selectedScreen: null, preview: null, previewEntityTypes: [], nodes: commonInterfaceElementNodes()};
  if (id === "ending-credits" && !state.interfacePageRecord
      && definition?.screenIds?.includes(state.interfacePageScreen)) {
    state.interfacePageRecord = uiEditorPreviewDraft(state.interfacePageScreen)
      ?.layers?.find(layer => layer.kind === "script")?.record || null;
  }
  if (id === "ending-credits" && state.interfacePageRecord) {
    const recordState = interfaceEntries.flatMap(entry => entry.states || [])
      .find(entry => entry.evidence?.records?.some(record => record.id === state.interfacePageRecord));
    const recordScreen = screens.find(screen => screen.interface_state_id === recordState?.id);
    if (recordScreen) state.interfacePageScreen = recordScreen.id;
  }
  const selectedScreen = selectedScreenFor(id, screens);
  const nodes = [
    ...interfacePageUiNodes(interfaceEntries, screens, definition, selectedScreen),
    ...optionNodesForScreen(selectedScreen),
  ];
  if (id === "startup-load") nodes.splice(1, nodes.length - 1,
    ...nodes.filter(node => node.kind === 'layout'),
    ...startupLoadNodes(selectedScreen?.id).map(node => node.id.startsWith('startup:entry:')
      ? {...node, kind: 'button', button: true, textComponents: true, cursorIndex: null,
        sourceRecord: node.recordId, controlsMarkup: `<dl class="screen-workbench-facts">
          <div><dt>文字来源</dt><dd>${interfaceButtonSourceMarkup(node.recordId)}</dd></div>
        </dl>${interfaceCursorReferenceMarkup()}`}
      : node));
  const interactionPreview = ['field-dialogue', 'field-investigation'].includes(id)
    ? sceneInteractionMenuPreview(id) : null;
  let preview = interactionPreview || selectedScreen && previewForInterfaceEntry(selectedScreen,
    uiEditorPreviewDraft(selectedScreen.id));
  const previewEntityTypes = preview?.menu_application?.kind === 'armor' ? ['vehicle', 'rental', 'save-slot']
    : interfacePreviewEntityTypes(interfaceValueContext(resolveServicePreview(
      interfaceBattleValuePreview(preview, id, selectedScreen), selectedScreen, definition), id));
  if (preview) preview = {...preview, preview_entity_types: previewEntityTypes};
  if (prepareObject) prepareFieldMenuPreviewObject(previewEntityTypes);
  if (interactionPreview) {
    const seen = new Set();
    const components = (interactionPreview.layers || []).filter(layer => ['layout', 'script'].includes(layer.kind)
      && layer.record && !seen.has(layer.record) && seen.add(layer.record));
    nodes.splice(1, nodes.length - 1, ...components.map((layer, index) => ({
      id: `${id}:interaction:${layer.record}`, kind: layer.kind === 'layout' ? 'layout' : 'text',
      label: uiRecordComponentLabel(layer.record, {layout: layer.kind === 'layout',
        fallback: `${definition.label}正文`}), depth: 1,
      screenId: selectedScreen?.id,
      textComponents: layer.kind === 'script',
      selection: recordSelection(layer.record),
      controlsMarkup: layer.kind === 'script' ? dialogueBodyMarkup(layer.record) : '',
      ...(layer.kind === 'script' && state.project?.text_record_edits?.records?.[layer.record]?.editable_byte_capacity
        ? {recordId: layer.record, editorId: `${id}:interaction:${layer.record}`, editorMode: 'capacity',
          selection: recordSelection(layer.record)}
        : {inspectorMarkup: `<p>${currentTextReferenceLink(layer.record)}</p>`}),
    })));
  }
  const buttons = [...interfaceButtonNodes(id, selectedScreen, screens, preview),
    ...(id === 'non-battle-main-menu' ? [] : interfaceButtonNodes('non-battle-main-menu', selectedScreen, screens, preview))];
  const buttonGroups = new Set(buttons.map(button => button.entry.groupId).filter(Boolean));
  for (let index = nodes.length - 1; index >= 0; index--) {
    if ([...buttonGroups].some(group => nodes[index].id.includes(`:options:${group}`))) nodes.splice(index, 1);
  }
  for (const [index, slot] of fieldMenuLoadoutNodes(id, selectedScreen?.id, preview).entries()) {
    const source = fieldMenuLoadoutSelection(preview, index)?.record_id;
    const buttonIndex = buttons.findIndex(button => source && button.selection?.record_id === source);
    const button = buttonIndex >= 0 ? buttons.splice(buttonIndex, 1)[0] : null;
    const kinds = slot.id.startsWith('vehicle-carry:') ? ['carried-vehicle-equipment']
      : slot.id.startsWith('field-loadout:equipment:') ? ['carried-equipment', 'carried-vehicle-equipment']
      : slot.id.startsWith('field-loadout:inventory:') ? ['carried-items'] : [];
    const options = nodes.filter(node => node.optionIndex === slot.slotIndex
      && node.sourceRecord === slot.sourceRecord && kinds.includes(node.choiceSourceKind));
    const choice = button || options[0];
    nodes.push({...choice, ...slot, structureRecord: false, ...(choice ? {kind: 'button',
      controlsMarkup: `${slot.controlsMarkup}${choice.controlsMarkup || ''}${
        button ? interfaceButtonSelectionMarkup(preview, button.cursorIndex) : ''}`} : {})});
    for (const option of options) nodes.splice(nodes.indexOf(option), 1);
    for (const groupId of new Set(options.map(option => option.optionGroupId))) {
      if (nodes.some(node => node.optionGroupId === groupId && node.optionIndex != null && !node.fixedSlot)) continue;
      const groupIndex = nodes.findIndex(node => node.kind === 'group' && node.optionGroupId === groupId);
      if (groupIndex >= 0) nodes.splice(groupIndex, 1);
    }
  }
  if (vehiclePartLayoutMarkup(preview)) nodes.push({id: `${id}:vehicle-part-layout`, kind: 'image',
    label: '战车部件布局', depth: 1, screenId: selectedScreen?.id, interfaceProperties: true,
    selection: {record_id: 'ui-vehicle-status:portrait-parts'},
    controlsMarkup: vehiclePartLayoutMarkup(preview)});
  nodes.push(...interfaceDataControlNodes(preview, selectedScreen?.id));
  if (preview?.layers?.some(layer => layer.kind === 'vehicle_status_parts'))
    nodes.push({id: `${id}:vehicle-part-art`, kind: 'image', depth: 1,
      label: '部件图像', screenId: selectedScreen?.id, controlsMarkup: vehiclePartControlsMarkup()});
  if (preview?.selection_cursor || buttons.length) nodes.push({id: `${id}:cursor-reference`, kind: 'image',
    label: '光标', depth: 1, screenId: selectedScreen?.id,
    controlsMarkup: interfaceCursorReferenceMarkup() + selectionLayoutMarkup(preview)});
  const available = interfaceComponentNodes(
    interfaceWindowTree(gameUiWorkbenchNodes(nodes, preview), buttons, preview), preview);
  if (id === "ending-credits" && state.interfacePageRecord) {
    const recordNode = available.find(node => node.recordId === state.interfacePageRecord);
    if (recordNode && selectedGameUiWorkbenchNode(interfacePageNamespace(id), available)?.recordId !== state.interfacePageRecord)
      selectGameUiWorkbenchNode(interfacePageNamespace(id), recordNode.id);
  }
  const model = {id, definition, interfaceEntries, screens,
    selectedScreen: selectedScreen && {...selectedScreen, preview_entity_types: previewEntityTypes},
    preview, previewEntityTypes, nodes: available};
  return model;
}

export function interfacePageModel(pageId = state.interfacePage, definition = null, projection = null) {
  definition ||= interfacePageDefinition(pageId);
  const displayPage = systemStateDisplayPage(definition.id);
  if (displayPage) {
    const nameDefinition = interfacePageDefinition(displayPage);
    return {...interfacePageModel(displayPage, {...nameDefinition, systemVariant: 'player-name'}, projection), id: definition.id, definition};
  }
  if (definition?.serviceFlow) {
    const screens = interfacePageScreens(definition.id, definition);
    const nodes = systemStateServiceNodes(serviceFlowNodes(definition), definition.id);
    if (state.interfacePageEntry) {
      const requested = nodes.find(node => node.serviceFragment === state.interfacePageEntry)
        || nodes.find(node => node.serviceStage === state.interfacePageEntry);
      const current = selectedGameUiWorkbenchNode(interfacePageNamespace(definition.id), nodes);
      if (requested && (current?.serviceFragment || current?.serviceStage) !== state.interfacePageEntry)
        selectGameUiWorkbenchNode(interfacePageNamespace(definition.id), requested.id);
    }
    const selected = selectedGameUiWorkbenchNode(interfacePageNamespace(definition.id), nodes);
    const preview = serviceFlowPreview(selected) || (!selected?.serviceFragment && !selected?.serviceStage
      ? nodes.map(serviceFlowPreview).find(Boolean) : null);
    const selectedScreen = screens.find(screen => screen.interface_state_id === preview?.interface_state_id)
      || selectedScreenFor(definition.id, screens);
    return {id: definition.id, definition, nodes, screens, selectedScreen, preview,
      interfaceEntries: interfacePageCatalogEntries(definition.id, definition),
      previewEntityTypes: interfacePreviewEntityTypes(interfaceValueContext(preview, definition.id))};
  }
  const model = interfacePageStepModel(pageId, definition);
  model.nodes = battleMessageStateNodes(model.nodes, model.id, model.selectedScreen?.interface_state_id);
  model.preview = systemStateModelPreview(model.id, model.preview, definition.systemVariant);
  if (['field-dialogue', 'field-investigation'].includes(model.id)) {
    model.componentNodes = model.nodes;
    model.nodes = commonDialogueWindowNodes(model, projection);
    return model;
  }
  const flow = model.id === 'field-board-exit' ? null
    : fieldMenuFlowScreen(model.id, model.selectedScreen?.interface_state_id, state.interfacePageEntry);
  if (!flow) {
    if (projection) model.nodes = interfacePageDrawnNodes(model, projection.preview, projection.components, projection.slots);
    model.nodes = interfacePreviewEntryNodes(model);
    return model;
  }
  const steps = menuApplicationDialogueSteps(fieldMenuFlowSteps(flow, model.screens));
  const activeStep = steps.find(step => step.stateId === model.selectedScreen.interface_state_id
    && step.entryId === (state.interfacePageEntry || null))
    || steps.find(step => step.stateId === model.selectedScreen.interface_state_id);
  const selectedScreen = state.interfacePageScreen, selectedEntry = state.interfacePageEntry;
  const models = [];
  try {
    for (const step of steps) {
      state.interfacePageScreen = step.screenId;
      state.interfacePageEntry = step.entryId;
      const variant = interfacePageStepModel(model.id, definition, {prepareObject: false});
      variant.nodes = interfacePageDrawnNodes(variant, variant.preview, [], []);
      models.push(variant);
    }
  } finally {
    state.interfacePageScreen = selectedScreen;
    state.interfacePageEntry = selectedEntry;
  }
  model.flow = flow;
  model.steps = steps;
  model.activeStep = activeStep;
  model.stepNodes = models[steps.indexOf(activeStep)].nodes;
  model.nodes = fieldMenuFlowComponentNodes(flow, steps, models, activeStep);
  if (projection) model.nodes = fieldMenuFlowComponentProjection(model.nodes,
    projection.preview, projection.components, projection.slots);
  model.nodes = interfacePreviewEntryNodes(model);
  return model;
}

function interfaceScreenEntries(model) {
  if (model.definition.previewEntries) return model.definition.previewEntries;
  const states = model.interfaceEntries.flatMap(entry => entry.states || []);
  return model.screens.flatMap(screen => {
    const routes = states.find(entry => entry.id === screen.interface_state_id)?.entry_routes;
    const entries = routes?.length ? routes.filter(entry => !model.definition?.entryIds
      || model.definition.entryIds.includes(entry.id)) : [{label: screen.interface_state || screen.label}];
    return entries.map(entry => ({screenId: screen.id, stateId: screen.interface_state_id,
      entryId: entry.id || null, label: entry.label}));
  });
}

function interfacePreviewEntryNodes(model) {
  if (model.flow || model.definition.serviceFlow || ['field-dialogue', 'field-investigation'].includes(model.id)) return model.nodes;
  const nodes = model.nodes.filter(node => !node.previewEntry);
  const steps = model.steps || interfaceScreenEntries(model);
  const entries = steps.length > 1 ? steps.map(step => ({
    id: `${model.id}:preview-step:${fieldMenuStepKey(step)}`, kind: 'group', depth: 1,
    label: step.label, previewEntry: 'screen', screenId: step.screenId, entryId: step.entryId,
    structureRecord: false, textComponents: true,
    facts: [{label: model.flow ? '步骤' : '界面状态', value: step.label}],
  })) : [];
  nodes.splice(nodes[0]?.kind === 'screen' ? 1 : 0, 0, ...entries);
  return nodes;
}

function commonDialogueWindowNodes(model, projection = null) {
  const states = model.id === 'field-investigation' ? [] : [['walking-dialogue.start', '普通对话'], ['walking-dialogue.paginate', '分页'],
    ['dialogue-choice.list', '选择'], ['dialogue-choice.selected', '选择反馈']];
  const preview = projection?.preview || sceneInteractionMenuPreview(model.id,
    dialogueBodyRecord(model.preview)) || model.preview;
  const layouts = new Set((preview?.layers || []).filter(layer => layer.kind === 'layout').map(layer => layer.record));
  const available = interfacePageDrawnNodes({...model, nodes: model.componentNodes}, preview,
    projection?.components || [], projection?.slots || []);
  const components = interfaceWindowTree(available.filter(node => layouts.has(node.recordId || node.selection?.record_id
    || node.sourceRecord || node.facts?.find(fact => fact.label === '布局记录')?.value)), [], preview);
  const record = dialogueBodyRecord(preview);
  const frames = dialoguePreviewFrames(record);
  return [{id: `${model.id}:interface`, kind: 'screen', label: model.definition.label, depth: 0},
    ...states.flatMap(([stateId, label]) => {
      const screen = interfacePageScreens('field-dialogue').find(screen => screen.interface_state_id === stateId);
      return screen ? [{id: `${model.id}:common-state:${stateId}`, kind: 'group', label, depth: 1,
        previewEntry: 'screen', screenId: screen.id, textComponents: true, structureRecord: false}] : [];
    }),
    ...components,
    {id: `${model.id}:common-text-layout`, kind: 'group', label: '文字排版', depth: 1,
      controlsMarkup: `<a class="editor-inline-link" href="?view=text&amp;textMode=fonts">字形 ↗</a>`},
    {id: `${model.id}:common-wait`, kind: 'image', label: '等待标记', depth: 1,
      controlsMarkup: '<a class="editor-inline-link" href="?view=interfaceui&amp;interface=common-elements">公共界面元素 ↗</a>'},
    {id: `${model.id}:common-choice`, kind: 'layout', label: '选择框', depth: 1,
      controlsMarkup: interfaceCursorReferenceMarkup() + selectionLayoutMarkup(preview)},
    ...(record ? [{id: `${model.id}:preview-body:${record}`, kind: 'text', label: '正文', depth: 1,
      textComponents: true, structureRecord: false,
      controlsMarkup: dialogueBodyMarkup(record) + currentTextReferenceLink(record, '文字来源')}] : []),
    ...(frames.length > 1 ? frames.map((frame, index) => ({
      id: `${model.id}:preview-page:${record}:${index}`, kind: 'text', depth: 2,
      label: `第 ${index + 1} 页`, previewEntry: 'dialogue', dialogueRecord: record, dialoguePage: index,
      structureRecord: false, textComponents: true,
      facts: [{label: '页', value: `${index + 1} / ${frames.length}`}],
      controlsMarkup: `<pre class="interface-dialogue-body">${esc(frame.text)}</pre>${currentTextReferenceLink(record, '文字来源')}`,
    })) : []),
  ];
}

function interfacePageDrawnNodes(model, preview, components, slots = []) {
  const nodes = [...model.nodes];
  const declaredSlots = nodes.filter(node => node.fixedSlot).flatMap(node => (node.slotSources || [])
    .map(source => ({id: node.selection.slot_id, label: node.label, sourceRecord: node.sourceRecord, source})));
  const componentSlots = [...declaredSlots, ...slots];
  const records = new Set(nodes.map(node => node.recordId || node.selection?.record_id
    || (node.kind === 'layout' ? node.facts?.find(fact => fact.label === '布局记录')?.value : null)));
  const layouts = new Set((uiConstructionModel().static_assets?.layouts || []).map(layout => layout.id));
  const sources = new Set((preview.layers || []).map(layer => layer.record || layer.text_record_ref?.node_id).filter(Boolean));
  for (const record of fieldSubmenuComponentRecords(preview)) sources.add(record);
  for (const field of Array.isArray(preview.field_sources) ? preview.field_sources : [])
    if (typeof field.reference === 'string' && field.reference.startsWith('record:')) sources.add(field.reference);
  for (const slot of slots) if (slot.sourceRecord) sources.add(slot.sourceRecord);
  for (const recordId of sources) {
    if (layouts.has(recordId)) continue;
    for (const reference of indexedResource(currentTextReference(recordId).uid)?.references || [])
      if (reference.relation === 'includes-record') {
        const record = indexedResource(reference.target)?.game_id;
        if (record) sources.add(record);
      }
  }
  for (const recordId of [...sources].sort()) {
    const record = state.project?.text_record_edits?.records?.[recordId];
    if (records.has(recordId) || !record && !layouts.has(recordId)) continue;
    records.add(recordId);
    if (layouts.has(recordId)) {
      nodes.push({id: `${model.id}:draw-source:${recordId}`, kind: 'layout', label: uiRecordComponentLabel(recordId,
        {layout: true, fallback: model.definition.label}),
        depth: 1, screenId: model.selectedScreen?.id, selection: recordSelection(recordId),
        facts: [{label: '布局记录', value: recordId, mono: true}], controlsMarkup: currentTextReferenceLink(recordId)});
      continue;
    }
    nodes.push({id: `${model.id}:draw-source:${recordId}`, kind: 'text', label: uiRecordComponentLabel(recordId,
      {fallback: `${model.selectedScreen?.interface_state || model.definition.label}文字`}),
      depth: 1, screenId: model.selectedScreen?.id, selection: recordSelection(recordId),
      ...(record.editable_byte_capacity ? {recordId, editorId: `${model.id}:draw-source:${recordId}`, editorMode: 'capacity'}
        : {inspectorMarkup: `<p>${currentTextReferenceLink(recordId)}</p>`})});
  }
  const expanded = gameUiWorkbenchNodes(nodes, preview);
  const belongsToSlot = (node, slot) => slot.source && node.kind === 'dynamic'
    && node.selection?.record_id === slot.source.recordId
    && node.selection.ranges?.some(range => range.offset <= slot.source.offset
      && range.offset + range.length >= slot.source.offset + slot.source.length);
  for (const slot of componentSlots) {
    let target = expanded.find(node => node.id === slot.id || node.selection?.slot_id === slot.id);
    if (!target) target = slot.source && expanded.find(node => node.button && node.recordId === slot.source.recordId
      && (node.ranges || node.selection?.ranges || []).some(range => range.offset <= slot.source.offset
        && range.offset + range.length >= slot.source.offset + slot.source.length));
    if (!target) {
      target = {id: slot.id, kind: 'dynamic', textComponents: true, label: slot.label, depth: 1,
        screenId: model.selectedScreen?.id, sourceRecord: slot.sourceRecord};
      expanded.push(target);
    }
    target.fixedSlot = true;
    target.selection = {...target.selection, slot_id: slot.id};
    const itemControls = fieldMenuPreviewSlotMarkup(slot.id);
    if (itemControls) {
      target.structureRecord = false;
      if (!target.controlsMarkup?.includes(itemControls)) target.controlsMarkup = `${itemControls}${target.controlsMarkup || ''}`;
    }
    const wantedControls = fieldMenuWantedHistoryMarkup(slot.id);
    if (wantedControls && !target.controlsMarkup?.includes(wantedControls))
      target.controlsMarkup = `${wantedControls}${target.controlsMarkup || ''}`;
    for (const child of expanded.filter(node => belongsToSlot(node, slot))) {
      if (child.recordId) {
        target.editors ||= target.recordId ? [{recordId: target.recordId, ranges: target.ranges,
          editorId: target.editorId, label: target.editorLabel, mode: target.editorMode}] : [];
        if (!target.editors.some(editor => editor.editorId === child.editorId)) target.editors.push({
          recordId: child.recordId, ranges: child.ranges, editorId: child.editorId,
          label: child.editorLabel || child.label, mode: child.editorMode});
      }
      if (child.controlsMarkup && !target.controlsMarkup?.includes(child.controlsMarkup))
        target.controlsMarkup = `${target.controlsMarkup || ''}${child.controlsMarkup}`;
    }
  }
  const projected = interfaceComponentNodes(expanded, preview, components, slots)
    .map(node => ({...node, editors: node.editors?.map(editor => ({...editor}))}));
  for (const source of components || []) {
    if (sources.has(source.recordId) || !state.project?.text_record_edits?.records?.[source.recordId]?.editable) continue;
    const target = projected.find(node => node.fixedSlot && node.drawnBounds
      && source.bounds.x < node.drawnBounds.x + node.drawnBounds.width
      && source.bounds.x + source.bounds.width > node.drawnBounds.x
      && source.bounds.y < node.drawnBounds.y + node.drawnBounds.height
      && source.bounds.y + source.bounds.height > node.drawnBounds.y);
    if (!target || fieldMenuPreviewSlotMarkup(target.selection?.slot_id || '')) continue;
    target.editors ||= [];
    const editorId = `${target.id}:content:${source.recordId}`;
    if (!target.editors.some(editor => editor.editorId === editorId)) target.editors.push({
      recordId: source.recordId, editorId, label: uiRecordComponentLabel(source.recordId), mode: 'capacity'});
  }
  return projected.filter(node => {
    const record = node.sourceRecord || node.recordId || node.selection?.record_id
      || (node.kind === 'layout' ? node.facts?.find(fact => fact.label === '布局记录')?.value : null);
    if (record && !sources.has(record) && !node.button && !node.fixedSlot && !node.interfaceProperties) return false;
    return node.fixedSlot || !componentSlots.some(slot => belongsToSlot(node, slot));
  });
}

export function interfacePageViewHeading(pageId = state.interfacePage) {
  const id = normalizeInterfacePageId(pageId);
  const definition = interfacePageDefinition(id);
  const interfaceEntries = interfacePageCatalogEntries(id);
  if (!definition) return null;
  const descriptions = [...new Set(
    interfaceEntries.map(entry => String(entry.description || "").trim()).filter(Boolean)
  )];
  const description = definition.description || descriptions.join(" ")
    || "使用游戏界面的权威状态、布局与文字资源。";
  return {
    title: fieldMenuNavigationEntry(id, state.interfacePageScreen, state.interfacePageEntry)?.label
      || definition.label.replace(/（推定）/gu, ""),
    description: definition.label.includes("（推定）")
      ? `${description} · 推定` : description,
  };
}

function screenToolbar(model) {
  if (model.definition.serviceFlow) return '';
  if (!model.screens.length) return "";
  if (model.flow) {
    if (model.screens.length === 1) return '';
    const flows = [...new Map(model.screens.map(screen => {
      const flow = fieldMenuFlowScreen(model.id, screen.interface_state_id);
      return flow ? [flow.id, flow] : [screen.id, {id: screen.id,
        label: screen.interface_state || screen.label,
        steps: [{screenId: screen.id, stateId: screen.interface_state_id}]}];
    })).values()];
    return `<label class="screen-workbench-selection"><span>画面</span>
      <select data-interface-page-screen>${flows.map(flow => {
        const step = fieldMenuFlowSteps(flow, model.screens)[0];
        return `<option value="${esc(step.screenId)}" data-interface-entry="${esc(step.entryId || '')}"
          ${flow.id === model.flow.id ? 'selected' : ''}>${esc(flow.label)}</option>`;
      }).join('')}</select></label>`;
  }
  if (model.id === "satellite-map") {
    const position = state.satelliteMapPosition || {x: '', y: '', visible: true};
    return `<label class="screen-workbench-selection"><span>当前位置 X</span>
      <input type="number" min="0" max="255" step="1" value="${position.x}" data-satellite-position="x"></label>
      <label class="screen-workbench-selection"><span>Y</span>
      <input type="number" min="0" max="255" step="1" value="${position.y}" data-satellite-position="y"></label>
      <label class="screen-workbench-selection"><span>标记</span>
      <select data-satellite-marker><option value="1" ${position.visible ? "selected" : ""}>显示</option>
        <option value="0" ${position.visible ? "" : "selected"}>隐藏</option></select></label>`;
  }
  if (model.preview?.variant !== "vehicle-name") return '';
  const actions = battleActorCatalog(state.project).actions.filter(
    action => action.kind === "battle-action"
      && Number.isInteger(Number(action.chassisId)),
  );
  if (!actions.length) return '';
  if (!actions.some(action =>
    Number(action.chassisId) === Number(state.nameEntryVehicleChassis))) {
    state.nameEntryVehicleChassis = Number(actions[0].chassisId);
  }
  return referencePickerMarkup({
    moduleId: "battle-action",
    label: "命名车型",
    value: actions.find(action =>
      Number(action.chassisId) === Number(state.nameEntryVehicleChassis)).key,
    grouped: true,
    compact: true,
    previewPanel: true,
    filterLabel: "搜索车型",
    filterPlaceholder: "战车编号或底盘名称",
    componentAttributes: "data-name-entry-vehicle-picker",
    items: actions.map(action => ({
      value: action.key,
      controlValue: action.chassisId,
      group: "vehicle",
      groupLabel: "战车",
      label: `${action.id} 号战车`,
      description: action.preset?.chassis_name_hint || action.label,
      meta: action.resourceUid,
      preview: vehicleBattlePreviewMarkup(action.chassisId),
    })),
    controlMarkup: `<select data-name-entry-vehicle-chassis aria-label="战车命名预览车型">${actions.map(
      action => `<option value="${Number(action.chassisId)}" ${
        Number(action.chassisId) === Number(state.nameEntryVehicleChassis)
          ? "selected" : ""
      }>${esc(action.label)}</option>`,
    ).join("")}</select>`,
  });
}

function nameEntryVehiclePreview(canvas, preview) {
  if (preview?.variant !== "vehicle-name") return preview;
  const chassisId = Number(state.nameEntryVehicleChassis);
  const action = battleActorCatalog(state.project).actionByKey.get(
    vehicleBattleActionKey(chassisId),
  );
  if (!action?.resource) return preview;
  const sprites = battleActionPlacements(action.resource).map(
    ([tile, x, y, horizontalFlip]) => ({
      x,
      y,
      tile,
      attribute: (Number(action.resource.palette_id) & 0x03)
        | (horizontalFlip ? 0x40 : 0),
      palette: Number(action.resource.palette_id) & 0x03,
      horizontal_flip: horizontalFlip,
      vertical_flip: false,
      transparent_tile: Number(tile) === 0,
    }),
  );
  if (canvas) {
    canvas.dataset.nameEntryVehicleChassis = String(chassisId);
    canvas.dataset.nameEntryVehicleAction = action.key;
    canvas.dataset.nameEntryVehicleChrBanks = BATTLE_ACTOR_CHR_PATTERN_PROFILES
      .map(profile => profile.bank.toString(16).toUpperCase().padStart(2, "0"))
      .join(",");
  }
  return {
    ...preview,
    layers: (preview.layers || []).map(layer => layer.kind === "battle_object"
      ? {
          ...layer,
          action: Number(action.id),
          action_hex: `0x${Number(action.id).toString(16).toUpperCase().padStart(2, "0")}`,
          pattern_profiles: BATTLE_ACTOR_CHR_PATTERN_PROFILES.map(
            profile => profile.id,
          ),
          sprites,
        }
      : layer),
  };
}

function previewStatus(screen) {
  if (!screen) {
    return {
      badge: "无独立画面",
      text: "当前界面族没有可用的 screen 状态。",
    };
  }
  if (uiEditorRuntimePreview(screen)) {
    return {
      badge: "运行画面",
      text: "整屏由捕获的 PPU、调色板、OAM 与寄存器状态独立重建；它是只读核对证据，不是第二份界面资产。",
    };
  }
  if (screen.coverage?.has_visual_preview === true) {
    return {
      badge: "资产重建",
      text: "画布直接引用 UI editor 关联的完整重建资源；文字修改走同一份 text-record。",
    };
  }
  const binding = uiEditorStateTemplateBinding(screen);
  return {
    badge: "结构预览",
    text: binding?.binding?.reason
      || "按已登记文字、布局和共用窗口模板合成；未把它标作逐像素运行采样。",
  };
}

const workbenchModels = new WeakMap();

function currentInterfacePageWorkbench(canvas) {
  const workbench = workbenchModels.get(canvas);
  if (!workbench || workbench.project !== state.project) return null;
  const items = JSON.stringify(fieldMenuPreviewItemOverrides());
  if (items !== workbench.items) {
    workbench.refresh();
    workbench.items = JSON.stringify(fieldMenuPreviewItemOverrides());
  }
  return workbench;
}

function interfacePageSelectionLayoutPreview(model, screen = model.selectedScreen) {
  const draft = screen && uiEditorPreviewDraft(screen.id);
  return draft?.selection_cursor ? resolveInterfacePageEditorPreview(null, draft, model.definition, model) : draft;
}

export function renderInterfacePage({className = "", treeExtraMarkup = "", inspectorExtraMarkup = "", toolbarMarkup = "", preparePreviewControls = false, definition = null, stateWorkbenchMarkup = null} = {}) {
  if (stateWorkbenchMarkup != null) return stateWorkbenchMarkup;
  if ((definition?.id || state.interfacePage) === 'field-dialogue') return renderFieldDialogueState();
  if ((definition?.id || state.interfacePage) === 'common-elements') return renderCommonInterfaceElements();
  const model = interfacePageModel(state.interfacePage, definition);
  const preparedToolbar = preparePreviewControls ? screenToolbar(model) : null;
  model.nodes = systemStateComponentNodes(model.nodes, model.id);
  const menuState = fieldMenuStateControls(model.id, () =>
    ['field-board-exit', 'field-investigation'].includes(model.id)
      ? document.querySelector(`[data-interface-page-workbench="${model.id}"]`)?.uiVisibleComponents || model.nodes
      : model.nodes);
  const machineState = machineStateControls(model);
  const battleState = battleCommandStateControls(model) || battleMessageStateControls(model);
  const resultState = battleResultStateControls(model);
  const systemState = systemStateControls(model);
  const stateControls = menuState || machineState || battleState || resultState || systemState;
  const triggeringItems = model.definition.itemEffect
    ? (state.project?.game_data?.items?.records || [])
      .filter(item => itemEffectPagesForItem(item).some(page => page.id === model.id)) : [];
  const itemLinks = model.definition.itemEffect
    ? `<nav aria-label="触发道具"><span>触发道具：</span>${triggeringItems.map(item =>
      `<a class="editor-inline-link" href="?${esc(new URLSearchParams(itemPageRoute(item)).toString())}">${
        esc(currentTextReference(itemNameRecordId(item)).label || item.id_hex)} ↗</a>`).join(' · ')}</nav>` : '';
  const destinations = model.id === 'field-item-fax' ? teleportDestinationsMarkup(state.project) : '';
  const supportingMarkup = `${treeExtraMarkup}${inspectorExtraMarkup}${entryActorLinks(model.definition)}${itemLinks}${destinations}`;
  treeExtraMarkup = '';
  inspectorExtraMarkup = supportingMarkup ? `<div class="page-global-info">${supportingMarkup}</div>` : '';
  if (!model.interfaceEntries.length && !model.nodes.length) {
    return ``;
  }
  const screen = model.selectedScreen || (model.id === "field-investigation"
    ? interfacePageScreens("field-dialogue")[0] : null);
  const selected = selectedGameUiWorkbenchNode(interfacePageNamespace(model.id), model.nodes);
  let previewInputs = '';
  if (["field-dialogue", "field-investigation"].includes(model.id)) {
    previewInputs += sceneInteractionPreviewMarkup(model.id);
  }
  previewInputs += fieldMenuObjectMarkup(model.id, model.previewEntityTypes);
  if (model.preview?.menu_application?.kind === 'armor') previewInputs += `<label class="screen-workbench-selection"><span>保留 SP</span>
    <input type="number" min="0" max="${menuState?.quantity?.maximum ?? 65535}" data-menu-armor-value${menuState?.quantity ? ' data-field-state-quantity' : menuState?.inputActive ? ' disabled' : ''}
      value="${esc(menuState?.quantity?.value ?? interfacePreviewContext().armor_value ?? '')}"></label>`;
  if (model.preview?.shop_menu?.service_amount) previewInputs += `<label class="screen-workbench-selection"><span>${model.preview.shop_menu.service_amount === 'money' ? '金额' : '补给数量'}</span>
    <input type="number" min="0" max="${model.preview.shop_menu.service_amount === 'money' ? 9999999 : 65535}" data-service-input-amount value="${esc(interfacePreviewContext().service_amount ?? '')}"></label>`;
  if (['field-item-fax', 'battle-messages'].includes(model.id) || model.selectedScreen?.interface_state_id === 'human-items.action-select')
    previewInputs += `<label class="screen-workbench-selection"><span>道具槽</span>
      <select data-menu-inventory-index>${Array.from({length: 8}, (_, index) => `<option value="${index}"${index === (interfacePreviewContext().inventory_index ?? 0) ? ' selected' : ''}>${index + 1}</option>`).join('')}</select></label>`;
  previewInputs += interfaceValueSelectionMarkup(model.id, {entityTypes: model.previewEntityTypes,
    glyphEntryPaths: Boolean(model.preview?.glyph_cache_entry)});
  previewInputs += battleResultSelectionMarkup(model.preview);
  const parent = FIELD_MENU_PARENTS[model.id];
  const parents = fieldMenuParentEntries(state.project?.ui?.construction, model.selectedScreen,
    state.project?.ui?.editor?.screens || []).filter(entry => !model.flow
      || fieldMenuNavigationEntry(entry.pageId, entry.screenId, entry.entryId)?.flowId !== model.flow.id);
  if (parent || parents.length) inspectorExtraMarkup += `<nav class="interface-parent-links" aria-label="上级界面">
    ${parent ? `<a class="editor-inline-link" href="${esc(fieldMenuHref({pageId: parent}))}">返回上级菜单 ↗</a>` : ''}
    ${parents.map(entry => `<a class="editor-inline-link" href="${esc(fieldMenuHref(entry))}">${esc(entry.label)} ↑</a>`).join('')}
    </nav>`;
  const draft = model.definition.serviceFlow ? model.preview : screen ? interfaceBattleValuePreview(
    resolveServicePreview(uiEditorPreviewDraft(screen.id), screen, model.definition), model.id, screen) : null;
  const runtimePreview = screen ? uiEditorRuntimePreview(screen) : null;
  const runtimeUrl = uiEditorPackagePreviewUrl(runtimePreview);
  const battleActorPreview = draft?.layers?.some(layer => layer.kind === 'interface_battle_actor');
  if (model.id === "satellite-map") {
    inspectorExtraMarkup += satelliteMapEditorMarkup();
  }
  const sharedScreen = model.id.startsWith("battle-") && runtimePreview
    ? INTERFACE_PAGE_DEFINITIONS.filter(definition => definition.id.startsWith("battle-")
        && definition.id !== "battle-scene")
      .flatMap(({id}) => interfacePageScreens(id).map(candidate => ({id, screen: candidate})))
      .find(candidate => uiEditorRuntimePreview(candidate.screen) === runtimePreview)
    : null;
  const screenReference = sharedScreen && sharedScreen.id !== model.id;
  if (screenReference) inspectorExtraMarkup += `<p><a class="editor-inline-link" data-interface-screen-reference
    href="?view=interfaceui&amp;interface=${esc(sharedScreen.id)}&amp;interfaceScreen=${esc(sharedScreen.screen.id)}">${esc(screen?.label || model.definition.label)} ↗</a></p>`;
  const canvasMarkup = screenReference && !battleActorPreview
    ? ""
    : draft && (screen || model.definition.serviceFlow)
    ? `<canvas width="256" height="240"
        data-ui-editor-preview="${esc(screen?.id || model.id)}"
        data-interface-page-workbench="${esc(model.id)}"
        aria-label="${esc(screen?.label || model.definition.label)}预览"></canvas>`
    : !model.definition.serviceFlow && screen && runtimeUrl
      ? `<canvas width="256" height="240"
          data-interface-page-runtime-preview="${esc(runtimeUrl)}"
          data-interface-page-workbench="${esc(model.id)}"
          aria-label="${esc(screen.label || model.definition.label)}运行画面"></canvas>`
    : "";
  const status = previewStatus(screen);
  return renderGameUiWorkbench({
    namespace: interfacePageNamespace(model.id),
    pageToolbarMarkup: toolbarMarkup,
    heightMode: stateControls ? 'fill' : model.id === 'shop-ui:15' ? 'embedded' : 'page',
    id: "interface-page-workbench",
    className: `interface-page-workbench interface-page-workbench-${model.id} ${className}`,
    treeExtraMarkup: "",
    inspectorExtraMarkup: `${treeExtraMarkup}${inspectorExtraMarkup}`,
    inspectorExtraHidden: selected?.kind !== 'screen',
    nodes: model.nodes,
    stageToolbarMarkup: `<div class="interface-preview-toolbar" data-interface-preview-toolbar>
      ${preparedToolbar ?? screenToolbar(model)}${previewInputs}${stateControls?.toolbar || ''}${stateControls?.inputs || ''}<span data-service-preview-conditions hidden></span></div>`,
    bottomMarkup: stateControls?.bottom || '',
    bottomSize: stateControls ? 'resizable' : 'content',
    bottomFit: Boolean(stateControls),
    canvasMarkup: stateControls?.domainMarkup ? '' : canvasMarkup,
    domainMarkup: stateControls?.domainMarkup,
    footerBadge: status.badge,
    footerText: status.text,
    treeTitle: "组件树",
    textOnlyTree: true,
  });
}

function loadRuntimePreviewImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image), {once: true});
    image.addEventListener("error", () => reject(
      new Error(`运行画面加载失败：${url}`)
    ), {once: true});
    image.src = url;
  });
}

/** 把只读运行合成画到共用 NES canvas，使三栏工作台仍复用整数缩放。 */
export async function paintInterfacePageRuntimeCanvases(root = document) {
  const canvases = [...root.querySelectorAll(
    "canvas[data-interface-page-runtime-preview]"
  )];
  await Promise.all(canvases.map(async canvas => {
    if (canvas.dataset.interfacePageRuntimePainted === "1") return;
    const url = String(canvas.dataset.interfacePageRuntimePreview || "");
    if (!url) return;
    try {
      const image = await loadRuntimePreviewImage(url);
      const context = canvas.getContext("2d");
      context.imageSmoothingEnabled = false;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.dataset.interfacePageRuntimePainted = "1";
      delete canvas.dataset.interfacePageRuntimeError;
    } catch (error) {
      canvas.dataset.interfacePageRuntimeError = String(error?.message || error);
      editorLog.error("预览", "独立界面运行画面绘制失败", error);
    }
  }));
}

export function resolveInterfacePageEditorPreview(canvas, preview, definition = null, model = null) {
  const interfaceId = definition?.id || normalizeInterfacePageId(
    canvas?.dataset?.interfacePageWorkbench || state.interfacePage,
  );
  if (interfaceId === 'common-elements') return preview;
  const workbench = currentInterfacePageWorkbench(canvas);
  if (!model && workbench?.project === state.project && workbench.model.id === interfaceId) {
    definition ||= workbench.model.definition;
    if (workbench.model.selectedScreen?.id === state.interfacePageScreen) model = workbench.model;
  }
  model ||= interfacePageModel(interfaceId, definition);
  if (interfaceId === 'battle-messages') {
    const message = battleMessageStatePreview(preview, interfaceId);
    if (message !== preview) return message;
  }
  if (model.definition.serviceFlow) {
    const node = selectedGameUiWorkbenchNode(interfacePageNamespace(model.id), model.nodes);
    const resolved = serviceFlowPreview(node) || (!node?.serviceFragment && !node?.serviceStage ? model.preview : null);
    return systemStatePreview(machineStatePreview(interfaceValueContext(resolved, model.id), model.definition), model.id);
  }
  preview = previewForInterfaceEntry(model.selectedScreen, preview);
  let resolved = interfaceId === "name-entry"
    ? nameEntryVehiclePreview(canvas, preview) : preview;
  if (resolved?.glyph_cache_entry) resolved = {...resolved,
    runtime_context: {...resolved.runtime_context, glyph_entry_path: interfacePreviewContext().glyph_entry_path ?? 'direct'}};
  resolved = interfaceBattleValuePreview(resolved, interfaceId,
    model.screens.find(screen => screen.id === canvas?.dataset?.uiEditorPreview) || model.selectedScreen);
  if (interfaceId === 'battle-results') resolved = battleResultStatePreview(resolved);
  const selectedButton = selectedGameUiWorkbenchNode(interfacePageNamespace(interfaceId), model.nodes);
  const inventoryIndex = selectedButton?.selection?.slot_id?.match(/^field-loadout:inventory:(\d+)$/u)?.[1];
  if (inventoryIndex !== undefined) interfacePreviewContext().inventory_index = Number(inventoryIndex);
  if (resolved?.selection_cursor && selectedButton?.button && Number.isInteger(selectedButton.cursorIndex))
    resolved = {...resolved, runtime_context: {...resolved.runtime_context, choice_index: selectedButton.cursorIndex}};
  if (resolved?.field_overview?.kind === 'attributes')
    resolved = {...resolved, runtime_context: {...resolved.runtime_context,
      attribute_index: interfacePreviewContext().attribute ?? resolved.runtime_context?.attribute_index ?? 0}};
  if (interfaceId === "noah-control-terminal" && !resolved) resolved = noahTerminalPreview();
  if (interfaceId === "startup-load") resolved = startupLoadPreview(resolved);
  if (["field-dialogue", "field-investigation"].includes(interfaceId)) {
    const fallbackRecord = dialogueBodyRecord(resolved);
    resolved = sceneInteractionMenuPreview(interfaceId, fallbackRecord) || resolved;
    const record = dialogueBodyRecord(resolved);
    const frames = dialoguePreviewFrames(record);
    const frame = frames[dialoguePageIndex(interfaceId, record, frames.length)];
    const bodyLayer = resolved?.layers?.find(layer => layer.record === record && layer.dialogue_runtime);
    const prefix = resolved?.service_response
      ? bodyLayer?.continuation_prefix_record || bodyLayer?.prefix_record
        || resolved.layers.find(layer => layer.dialogue_prefix)?.record
      : resolved?.layers?.findLast(layer => layer.kind === 'script' && layer.record !== record)?.record;
    if (frame && (!resolved.confirmed_state_binding || resolved.service_response)) resolved = {...resolved, runtime_context: {...resolved.runtime_context,
      confirmed_waits: frame.confirmedWaits}, layers: resolved.layers.map(layer => layer.record === record
        ? {...layer, page_index: frame.pageIndex,
          ...(prefix ? {continuation_prefix_record: prefix} : {})} : layer)};
  }
  if (fieldMenuLoadoutKind(interfaceId) && resolved) {
    const object = fieldMenuPreviewObject(interfaceId);
    resolved = object.kind === 'role' ? fieldMenuRolePreview(resolved, object.id)
      : fieldMenuVehiclePreview(resolved, object.id, model.definition.loadoutPage || interfaceId);
  }
  if (['non-battle-main-menu', 'field-mode', 'field-board-exit'].includes(interfaceId) && resolved)
    resolved = fieldMenuRolePreview(resolved, interfacePreviewContext().role);
  if (interfaceId === "party-strength" && resolved) {
    const selected = fieldMenuPreviewObject(interfaceId);
    const screen = model.screens.find(row => row.id === canvas?.dataset?.uiEditorPreview) || model.selectedScreen;
    const character = screen?.interface_id === "character-status";
    const executionContext = character ? fieldMenuStatePreview(resolved)?.service_preview_state?.selection : null;
    if (character) resolved = resolveStatusUiPreview(resolved,
      {kind: "character-status", role_slot: executionContext?.role ?? (selected.kind === "role" ? selected.id : null)}, state.project);
    else if (resolved.field_submenu_vehicle) resolved = fieldMenuVehiclePreview(resolved,
      selected.kind === 'vehicle' ? selected.id : interfacePreviewContext().vehicle, interfaceId);
    if (resolved.field_overview) resolved = {...resolved,
      runtime_context: {...resolved.runtime_context, save_slot: interfacePreviewContext().slot}};
    if (resolved.menu_application?.kind === 'armor') resolved = {...resolved,
      runtime_context: {...resolved.runtime_context, armor_value: interfacePreviewContext().armor_value}};
  }
  if (interfaceId === "ending-credits" && resolved) {
    const record = selectedGameUiWorkbenchNode(interfacePageNamespace(interfaceId), model.nodes)?.recordId
      || resolved.primary_record || resolved.layers?.find(layer => layer.kind === "script")?.record;
    resolved = resolveEndingCreditsUiPreview(resolved, {record}, state.project);
  }
  if (interfaceId === "satellite-map" && resolved && state.satelliteMapPosition) resolved = {...resolved,
    satellite_position: state.satelliteMapPosition};
  resolved = resolveServicePreview(resolved, model.selectedScreen, model.definition);
  resolved = interfaceButtonSelectionPreview(interfaceValueContext(resolved && {...resolved, selection: null}, interfaceId));
  const carryIndex = selectedButton?.selection?.slot_id?.match(/^field-loadout:equipment:(\d+)$/u)?.[1];
  if (resolved?.layers?.some(layer => layer.human_equipment_comparison)) {
    const index = carryIndex == null ? resolved.runtime_context?.choice_index ?? 0 : Number(carryIndex);
    resolved = {...resolved, runtime_context: {...resolved.runtime_context, equipment_index: index,
      ...(carryIndex == null ? {} : {choice_index: index})}};
  }
  return systemStatePreview(fieldMenuStatePreview(resolved && {...resolved, runtime_context: {...resolved.runtime_context,
    inventory_index: interfacePreviewContext().inventory_index ?? resolved.runtime_context?.inventory_index,
    item_overrides: fieldMenuPreviewItemOverrides(),
    ...(resolved.wanted_defeat_history ? {wanted_history_overrides: interfacePreviewWantedHistoryOverrides()} : {})}}), model.id);
}

export async function bindInterfacePageWorkbench({
  rerender = async () => {},
  repaint = () => {},
  definition = null,
  bindInspector: bindExtraInspector = () => {},
  isCurrent: currentPage = () => true,
} = {}) {
  if (document.querySelector('[data-screen-workbench^="special-service:"]')) return null;
  const root = document.querySelector('#content');
  const workbench = root.querySelector('#interface-page-workbench, [data-screen-workbench]');
  const navigation = state.navigationGeneration, repository = state.projectRepository;
  const isCurrent = () => currentPage() && workbench?.isConnected
    && navigation === state.navigationGeneration && repository === state.projectRepository;
  const reportError = (host, block, error) => {
    if (isCurrent()) showEditorError(host, block, error);
  };
  const pending = [];
  let preparing = true;
  const prepare = (task, block, host = workbench) => {
    const result = Promise.resolve(task).catch(error => reportError(host, block, error));
    if (preparing) pending.push(result);
    return result;
  };
  if ((definition?.id || state.interfacePage) === 'field-dialogue') {
    await prepare(bindFieldDialogueState({rerender, isCurrent}), '对话状态');
    return null;
  }
  if ((definition?.id || state.interfacePage) === 'common-elements') {
    await prepare(bindCommonInterfaceElements(root, {rerender, isCurrent}), '公共界面元素');
    return null;
  }
  bindUiEditorReferenceLists();
  bindFieldMenuStateController({rerender});
  bindMachineStateController(document.querySelector('#interface-page-workbench'), {rerender});
  bindBattleResultStateController(document.querySelector('#interface-page-workbench'), {rerender});
  prepare(bindBattleCommandStateController({rerender, isCurrent}), '战斗界面');
  prepare(bindBattleMessageStateController({rerender, isCurrent, resolvePreview: resolveInterfacePageEditorPreview}), '战斗消息');
  bindSystemStateController(document.querySelector('#interface-page-workbench'), {rerender});
  let model = interfacePageModel(state.interfacePage, definition);
  let candidates = model.nodes;
  const canvas = document.querySelector('[data-interface-page-workbench]');
  if (canvas) {
    const workbench = {project: state.project, model, items: JSON.stringify(fieldMenuPreviewItemOverrides()),
      refresh: () => {
        model = interfacePageModel(model.id, definition);
        candidates = model.nodes;
        workbench.model = model;
      }};
    workbenchModels.set(canvas, workbench);
  }
  bindInterfaceButtonSelection(document, model.preview, {repaint: () => repaint()});
  const paint = repaint;
  repaint = async () => {
    if (!isCurrent()) return;
    currentInterfacePageWorkbench(canvas);
    await paint();
    if (isCurrent() && state.interfacePage === model.id) await updateInterfaceSelection(
      selectedGameUiWorkbenchNode(interfacePageNamespace(model.id), model.nodes), model, definition);
  };
  document.querySelector('[data-menu-armor-value]')?.addEventListener('change', event => {
    if (event.currentTarget.matches('[data-field-state-quantity]')) return;
    if (!event.currentTarget.checkValidity()) return;
    interfacePreviewContext().armor_value = event.currentTarget.value === '' ? undefined : Number(event.currentTarget.value);
    void repaint();
  });
  document.querySelector('[data-service-input-amount]')?.addEventListener('change', event => {
    if (!event.currentTarget.checkValidity()) return;
    interfacePreviewContext().service_amount = event.currentTarget.value === '' ? undefined : Number(event.currentTarget.value);
    void repaint();
  });
  document.querySelector('[data-menu-inventory-index]')?.addEventListener('change', event => {
    interfacePreviewContext().inventory_index = Number(event.currentTarget.value);
    void rerender();
  });
  prepare(bindInterfaceValueSelection(root, {rerender}), '界面动态值');
  bindTerminalPreviewInputs(document, {repaint});
  prepare(bindBattleResultSelection(root, {rerender}), '战斗结果输入');
  bindFieldMenuObject(document, {rerender, onSelect: (pageId, selected) => {
    if (pageId.startsWith('battle-')) {
      const vehicle = selected.kind === 'vehicle';
      if (/battle-party-status\.(human|vehicle)$/u.test(state.interfacePageScreen || ''))
        state.interfacePageScreen = `ui-screen:interface:battle-party-status:state:battle-party-status.${vehicle ? 'vehicle' : 'human'}`;
      if (/battle-items-equipment\.(human-items|vehicle-items)$/u.test(state.interfacePageScreen || ''))
        state.interfacePageScreen = `ui-screen:interface:battle-items-equipment:state:battle-items-equipment.${vehicle ? 'vehicle-items' : 'human-items'}`;
      replaceHistoryUrl(currentViewUrl());
      return;
    }
    if (model.preview?.menu_application?.kind === 'armor') {
      delete interfacePreviewContext().armor_value;
      return;
    }
    if (pageId !== "party-strength") return;
    const character = model.selectedScreen?.interface_id === 'character-status';
    if (character !== (selected.kind === 'role')) state.interfacePageScreen = selected.kind === "role"
      ? CHARACTER_STATUS_DETAIL_SCREEN_ID : VEHICLE_STATUS_DETAIL_SCREEN_ID;
    replaceHistoryUrl(currentViewUrl());
  }});
  prepare(bindSelectionLayoutControls(root, interfacePageSelectionLayoutPreview(model), {repaint, rerender}), '光标坐标');
  prepare(bindVehiclePartLayout(root, resolveInterfacePageEditorPreview(null, model.preview, model.definition, model),
    {repaint, rerender}), '战车部件布局');
  prepare(bindListOrderControls(root, {onSaved: rerender}), '文字顺序');
  prepare(bindInterfaceDataControls(root, {repaint}), '组件数据');
  prepare(bindVehiclePartControls(root, {repaint}), '战车部件');
  prepare(bindUiCommandDispatchControls(root, {rerender}), '命令处理器');
  prepare(bindSceneInteractionPreview(root.querySelector('[data-field-interaction-target]'), {repaint, rerender, previewInStage: true}), '交互预览');
  prepare(bindFieldMenuLoadout(root, {repaint}), '携带位');
  prepare(paintFieldMenuIcons(root), '菜单图标');
  if (model.id === "satellite-map") {
    document.querySelectorAll("[data-satellite-position], [data-satellite-marker]").forEach(input =>
      input.addEventListener("change", () => {
        if (!input.checkValidity() || input.value === "") return;
        const position = state.satelliteMapPosition ||= {
          x: Number(document.querySelector('[data-satellite-position="x"]').value),
          y: Number(document.querySelector('[data-satellite-position="y"]').value),
          visible: document.querySelector('[data-satellite-marker]').value === '1',
        };
        if (input.dataset.satellitePosition) position[input.dataset.satellitePosition] = Number(input.value);
        else position.visible = input.value === "1";
        void repaint();
      }));
    prepare(bindSatelliteMapFields(root, {repaint,
      preview: resolveInterfacePageEditorPreview(document.querySelector('[data-ui-editor-preview]'), model.preview, definition),
    }), '卫星地图');
  }
  document.querySelector("[data-interface-page-screen]")?.addEventListener(
    "change", event => {
      const screenId = String(event.currentTarget.value || "");
      if (!model.screens.some(screen => screen.id === screenId)) return;
      state.interfacePageScreen = screenId;
      state.interfacePageEntry = event.currentTarget.selectedOptions[0]?.dataset.interfaceEntry || null;
      state.interfacePageRecord = null;
      const screen = model.screens.find(item => item.id === screenId);
      const stateNode = model.nodes.find(node => node.stateId === screen?.interface_state_id);
      selectGameUiWorkbenchNode(
        interfacePageNamespace(model.id), stateNode?.id || null,
      );
      replaceHistoryUrl(currentViewUrl());
      void rerender();
    }
  );
  document.querySelector("select[data-name-entry-vehicle-chassis]")?.addEventListener(
    "change", event => {
      const chassisId = Number(event.currentTarget.value);
      if (!Number.isInteger(chassisId) || chassisId < 0x91 || chassisId > 0x98) {
        return;
      }
      state.nameEntryVehicleChassis = chassisId;
      replaceHistoryUrl(currentViewUrl());
      void repaint();
    },
  );
  bindReferencePicker(document.querySelector("[data-name-entry-vehicle-picker]"), {
    paint: paintVehicleBattlePortraitCanvases,
  });
  const binding = bindGameUiWorkbench({
    namespace: interfacePageNamespace(model.id),
    nodes: model.nodes,
    rerender,
    repaint,
    updateInspectorOnSelection: true,
    bindInspector: root => {
      bindExtraInspector(root);
      prepare(bindServiceFlowFields(root), '服务阶段', root);
      bindTerminalPreviewInputs(root, {repaint});
      bindInternalPageLinks(root);
      bindUiEditorReferenceLists(root);
      bindInterfaceButtonSelection(root, model.preview, {repaint});
      bindFieldMenuWantedHistory(root, {repaint});
      let ready = false;
      const repaintValue = () => { if (ready) void repaint(); };
      prepare((async () => {
        await bindSelectionLayoutControls(root, interfacePageSelectionLayoutPreview(model), {repaint: repaintValue, rerender});
        await bindListOrderControls(root, {onSaved: rerender});
        await bindVehiclePartLayout(root, resolveInterfacePageEditorPreview(null, model.preview, model.definition, model),
          {repaint: repaintValue, rerender});
        await bindInterfaceDataControls(root, {repaint: repaintValue});
        await bindVehiclePartControls(root, {repaint: repaintValue});
        await bindUiCommandDispatchControls(root, {rerender});
        await bindFieldMenuLoadout(root, {repaint: repaintValue});
        ready = true;
      })(), '组件属性', root);
      prepare(paintFieldMenuIcons(root), '菜单图标', root);
    },
    selectPreview: node => {void (model.definition.serviceFlow
      && (serviceFlowPreview(node) || (!node?.serviceFragment && !node?.serviceStage
        ? model.nodes.map(serviceFlowPreview).find(Boolean) : null)) !== model.preview
      || node?.previewEntry || node?.flowStepKey && !node.flowActive
      ? rerenderElementTreeKeepingSelectionVisible(document.querySelector(
        `[data-game-ui-workbench-node="${CSS.escape(node.id)}"]`), rerender)
      : node?.selection?.slot_id?.startsWith('field-loadout:equipment:')
      || node?.button && Number.isInteger(node.cursorIndex)
      ? repaint() : updateInterfaceSelection(node, model, definition));},
    onSelect: node => {
      if (node?.previewEntry === 'dialogue') {
        (state.interfaceDialoguePages ||= new Map()).set(`${model.id}:${node.dialogueRecord}`, node.dialoguePage);
        return;
      }
      if (model.definition.serviceFlow) {
        state.interfacePageEntry = node?.serviceFragment || node?.serviceStage || null;
        replaceHistoryUrl(currentViewUrl());
        return;
      }
      if (node?.previewEntry === 'screen' || node?.flowStepKey) {
        state.interfacePageScreen = node.screenId;
        state.interfacePageEntry = node.entryId;
        state.interfacePageRecord = null;
        replaceHistoryUrl(currentViewUrl());
        return;
      }
      if (model.id === "ending-credits") {
        state.interfacePageRecord = node?.recordId || null;
        replaceHistoryUrl(currentViewUrl());
      }
      if (!node?.screenId || node.screenId === state.interfacePageScreen) return;
      state.interfacePageScreen = node.screenId;
      replaceHistoryUrl(currentViewUrl());
    },
  });
  const refreshComponents = () => {
    if (!isCurrent()) return;
    currentInterfacePageWorkbench(canvas);
    const conditionNote = document.querySelector('[data-service-preview-conditions]');
    if (conditionNote) {
      const conditions = canvas.uiResolvedPreview?.service_preview_state?.conditions || [];
      conditionNote.textContent = conditions.length ? `已临时满足：${conditions.map(condition => condition.label).join('；')}` : '';
      conditionNote.hidden = !conditions.length;
    }
    if (model.definition.serviceFlow) {
      canvas.uiVisibleComponents = model.nodes;
      void updateInterfaceSelection(selectedGameUiWorkbenchNode(interfacePageNamespace(model.id), model.nodes), model, definition);
      return;
    }
    if (['field-dialogue', 'field-investigation'].includes(model.id)) {
      model.nodes = commonDialogueWindowNodes(model, {preview: canvas.uiResolvedPreview || model.preview,
        components: canvas.uiDrawnComponents || [], slots: canvas.uiComponentSlots || []});
      canvas.uiVisibleComponents = model.nodes;
      binding?.setVisibleNodes(model.nodes, {refreshInspector: true});
      void updateInterfaceSelection(selectedGameUiWorkbenchNode(interfacePageNamespace(model.id), model.nodes), model, definition);
      return;
    }
    if (!canvas?.uiDrawnComponents) return;
    const preview = canvas.uiResolvedPreview || resolveInterfacePageEditorPreview(canvas, model.preview, definition, model);
    const armorInput = document.querySelector('[data-menu-armor-value]');
    const serviceInput = document.querySelector('[data-service-input-amount]');
    const quantityLayer = preview.layers?.find(layer => layer.service_quantity_input);
    if (serviceInput && Number.isInteger(quantityLayer?.provider_constants?.[9]))
      serviceInput.max = String(quantityLayer.provider_constants[9]);
    if (armorInput && preview.menu_application?.kind === 'armor') {
      armorInput.max = String(preview.menu_application.sp);
      armorInput.value = String(preview.menu_application.remaining_sp);
    }
    const components = model.flow ? candidates : candidates.filter(node => !node.previewEntry);
    model.nodes = model.flow ? fieldMenuFlowComponentProjection(components, canvas.uiResolvedPreview || preview,
      canvas.uiDrawnComponents, canvas.uiComponentSlots, interfacePageDrawnNodes({...model, nodes: model.stepNodes},
        preview, canvas.uiDrawnComponents, canvas.uiComponentSlots))
      : interfacePageDrawnNodes({...model, nodes: components}, preview, canvas.uiDrawnComponents, canvas.uiComponentSlots);
    model.nodes = interfacePreviewEntryNodes(model);
    canvas.uiVisibleComponents = model.nodes;
    binding?.setVisibleNodes(model.nodes, {refreshInspector: Boolean(model.flow)});
    prepare(bindFieldMenuLoadout(root, {repaint}), '预览物品');
    bindFieldMenuWantedHistory(document, {repaint});
    void updateInterfaceSelection(selectedGameUiWorkbenchNode(interfacePageNamespace(model.id), model.nodes), model, definition);
  };
  canvas?.addEventListener('ui-preview-painted', refreshComponents);
  if (canvas?.uiDrawnComponents) refreshComponents();
  else if (!canvas?.matches('[data-ui-editor-preview]'))
    void updateInterfaceSelection(selectedGameUiWorkbenchNode(interfacePageNamespace(model.id), model.nodes), model, definition);
  while (pending.length) await Promise.all(pending.splice(0));
  preparing = false;
  return binding;
}

async function updateInterfaceSelection(node, model, definition) {
  const canvas = document.querySelector('[data-interface-page-workbench]');
  if (!canvas) return;
  const workbench = currentInterfacePageWorkbench(canvas);
  if (workbench?.model !== model) return;
  const selectedId = node?.id;
  const current = () => canvas.isConnected && workbenchModels.get(canvas)?.model === model
    && selectedGameUiWorkbenchNode(interfacePageNamespace(model.id), model.nodes)?.id === selectedId;
  try {
    const preview = model.definition.serviceFlow || ['field-dialogue', 'field-investigation'].includes(model.id)
      ? resolveInterfacePageEditorPreview(canvas, model.preview, definition, model)
      : canvas.uiResolvedPreview || resolveInterfacePageEditorPreview(canvas, model.preview, definition, model);
    const projected = canvas.uiDrawnComponents
      ? interfaceComponentNodes([node].filter(Boolean), preview, canvas.uiDrawnComponents, canvas.uiComponentSlots)[0]
      : node;
    const bounds = await interfaceComponentBounds(projected, preview);
    if (!current()) return;
    let outline = canvas.parentElement.querySelector('[data-interface-selection]');
    if (!outline) {
      outline = document.createElement('div');
      outline.dataset.interfaceSelection = '';
      canvas.parentElement.append(outline);
    }
    outline.hidden = !bounds;
    if (bounds) {
      outline.dataset.bounds = JSON.stringify(bounds);
      canvas.dataset.uiSelectionBounds = JSON.stringify(bounds);
      const width = canvas.width, height = canvas.height;
      Object.assign(outline.style, {left: `${bounds.x / width * 100}%`, top: `${bounds.y / height * 100}%`,
        width: `${bounds.width / width * 100}%`, height: `${bounds.height / height * 100}%`});
    } else {
      delete outline.dataset.bounds;
      delete canvas.dataset.uiSelectionBounds;
    }
  } catch (error) { if (current()) showEditorError(canvas.closest('.workspace-stage'), '组件选区', error); }
}

function dialogueBodyRecord(preview) {
  if (preview?.service_response) return preview.layers.find(layer => layer.shop_welcome)?.record || null;
  return preview?.layers?.findLast(layer => layer.kind === 'script')?.record || null;
}

function dialoguePageIndex(pageId, record, count) {
  return Math.min(Math.max(0, state.interfaceDialoguePages?.get(`${pageId}:${record}`) || 0), Math.max(0, count - 1));
}

function dialogueBodyMarkup(record) {
  const frames = dialoguePreviewFrames(record);
  return frames.length ? `<ol class="interface-dialogue-body">${frames.map(frame => `<li><pre>${esc(frame.text)}</pre></li>`).join('')}</ol>` : '';
}
