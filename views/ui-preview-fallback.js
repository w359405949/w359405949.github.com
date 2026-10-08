// @editor-module 按已发布界面模板与当前状态记录构造结构预览草稿。
// Evidence-driven UI preview fallbacks. This module is deliberately independent
// of application state and rendering so its placement rules can be browser-tested.
//
// 界面模板（窗口骨架 + 内容槽位）由构建期的结构分析导出，见
// engine/tools/rom_assets/ui/templates.py。浏览器只做两件事：把骨架层原样铺出来，再把
// 该状态**自己**的记录填进已登记的槽位。这里不再有按标签猜界面族的规则，
// 也不会把别的商店/旅馆的采样文字画到这个状态头上。

import {textSlotProviderBindings, textSlotRuntimeParameters} from "../core/text-record-project.js";
import {uiScreenTemplateBinding} from "../core/ui-template-bindings.js";

const nodeMap = document => {
  const nodes = document?.nodes;
  if (!nodes || typeof nodes !== "object" || Array.isArray(nodes)) return new Map();
  return new Map(Object.entries(nodes));
};

export function uiTemplateLibrary(model) {
  return model?.templates_data || null;
}

function uiTemplateById(model, templateId) {
  return (uiTemplateLibrary(model)?.templates || [])
    .find(item => item.id === templateId) || null;
}

// 模板自身的预览：只有骨架，天然不含任何一次采样的文字内容。
export function uiTemplateFrameDraft(model, templateId) {
  const template = uiTemplateById(model, templateId);
  if (!template?.frame_layers?.length) return null;
  return {
    id: template.id,
    kind: "ui-template",
    viewport: template.viewport || {x: 0, y: 0, width: 256, height: 240},
    layers: template.frame_layers.map(layer => ({...layer})),
    structural: true,
    preview_basis: "ui-template-frame",
    template_id: template.id,
    fillable_slots: (template.content_slots || [])
      .filter(slot => slot.fillable).length,
  };
}

function templateBinding(screen, model) {
  return uiScreenTemplateBinding(uiTemplateLibrary(model), screen);
}

// 结构预览只使用已发布且精确绑定到记录、命令及来源的占位声明。
function structuralPreviewParameters(template, slot, fill) {
  const placeholders = slot.structural_preview_placeholders;
  if (!Array.isArray(placeholders) || !placeholders.length
      || fill.invocation != null || fill.resolveRuntimeParameter) return {};
  return {
    invocation: {kind: "ui-template-structure", template: template.id},
    resolveRuntimeParameter({text_record_ref, command_index, source}) {
      const entry = placeholders.find(item =>
        item.text_record_ref?.resource_id === text_record_ref.resource_id
        && item.text_record_ref?.node_id === text_record_ref.node_id
        && item.command_index === command_index && item.source === source);
      return entry
        ? {status: "placeholder", text: entry.text, label: entry.label}
        : {status: "unavailable", reason: "本条消息的当前参数尚未发布结构预览占位"};
    },
  };
}

// 模板 + 本状态自有内容。槽位位置来自已登记预览（或代码确认的对话窗口常量），
// 填进去的记录全部是该状态自己在目录里关联的 ROM 记录。
function templateDraft(screen, binding, model) {
  const template = uiTemplateById(model, binding.template);
  if (!template?.frame_layers?.length) return null;
  const laserService = screen.interface_state_id?.startsWith("laser-cannon-lens-service.");
  const registered = model?.menu_dispatch_data?.previews?.find(preview =>
    preview.id === template.source?.preview);
  const slots = new Map(
    (template.content_slots || []).map(slot => [slot.id, slot])
  );
  const layers = template.frame_layers.map(layer => ({...layer}));
  for (const record of binding.extra_layout_records || []) {
    if (laserService && layers.some(layer => layer.record === record)) continue;
    layers.push({kind: "layout", record});
  }
  if (laserService) for (const slot of template.content_slots || []) {
    if (slot.fillable || slot.role !== 'runtime-content') continue;
    const layer = registered?.layers?.[slot.source_layer_index];
    if (!layer) throw new TypeError('激光服务模板缺少运行内容来源');
    layers.push({...layer});
  }
  const contentLayers = [];
  for (const fill of binding.fills || []) {
    const slot = slots.get(fill.slot);
    if (!slot) continue;
    if (slot.role === "list-row") {
      const layer = layers[slot.frame_layer_index];
      if (!layer) continue;
      layer.provider_records = {
        ...layer.provider_records,
        [slot.provider]: fill.record,
      };
      continue;
    }
    if (slot.geometry) {
      contentLayers.push({kind: "text_slot", record: fill.text_record_ref?.node_id,
        text_record_ref: fill.text_record_ref, geometry: slot.geometry, fonts: slot.fonts,
        ...textSlotProviderBindings(fill),
        ...textSlotRuntimeParameters(uiTemplateLibrary(model), slot),
        ...structuralPreviewParameters(template, slot, fill)});
      continue;
    }
    const sourceLayer = registered?.layers?.[slot.source_layer_index];
    if (laserService && !Number.isInteger(Number(slot.cursor)))
      throw new TypeError('激光服务模板缺少当前文字游标');
    contentLayers.push({
      ...(laserService ? sourceLayer : {}),
      kind: "script",
      record: fill.record,
      cursor: laserService ? Number(slot.cursor) : Number(slot.cursor || 0),
      ...(slot.line_origin === undefined || slot.line_origin === null
        ? {} : {line_origin: Number(slot.line_origin)}),
    });
  }
  return {
    id: screen.id,
    kind: "family-template",
    viewport: template.viewport
      || screen.viewport || {x: 0, y: 0, width: 256, height: 240},
    layers: [...layers, ...contentLayers],
    ...(laserService ? Object.fromEntries(['shop_menu', 'selection_cursor',
      'sprite_palette_source', 'ui_palette_source', 'field_sources', 'runtime_context',
      'glyph_cache_source', 'glyph_cache_entry'].filter(key => registered?.[key] !== undefined)
      .map(key => [key, registered[key]])) : {}),
    structural: true,
    preview_basis: "ui-template",
    template_preview_id: template.id,
    template_label: template.label,
    inference_basis: binding.basis,
    inference_confidence: binding.confidence,
    inference_reason: binding.reason,
    filled_slots: (binding.fills || []).length,
    empty_slots: (binding.empty_slots || []).length,
    deferred_records: binding.deferred_records || [],
  };
}

export function uiEditorNoPreviewReason(screen, model = null) {
  const unbound = (uiTemplateLibrary(model)?.unbound_states || [])
    .find(item => item.state === screen?.interface_state_id);
  if (unbound) return unbound.reason;
  const references = Array.isArray(screen?.references) ? screen.references : [];
  const relations = new Set(references.map(reference => reference.relation));
  if (relations.has("state-validated-by")) {
    return "该状态已有运行场景证据，但当前项目包没有可显示的采集帧，也没有关联可独立绘制的布局或静态文字。";
  }
  if (relations.has("state-uses-record")) {
    return "已关联的脚本记录不含可独立绘制的静态字形，且没有可用窗口布局。";
  }
  if (
    relations.has("state-uses-code-symbol")
    || relations.has("uses-code-symbol")
    || relations.has("uses-application-command")
    || relations.has("uses-dispatch-command")
  ) {
    return "当前只有程序入口或命令证据，尚未关联可绘制的布局、静态文字或运行帧。";
  }
  return "尚未登记可绘制的布局、静态文字或运行帧；结构与来源关系仍可在下方检查。";
}

// 「仅有源资产」的界面状态没有 source_preview_id。这里按证据强度分四级回退：
// 已导出界面模板的走模板加自有内容；只登记了布局的直接画布局；非地图域的静态
// 文字画成不带窗口的源记录预览；地图域的静态文字才使用已确认的共用对话框。
// 四条路都不成立时不造图。
export function uiEditorBuildStructuralDraft(screen, document, model) {
  const dialogue = model?.dialogue_runtime || null;
  const nodes = nodeMap(document);
  const collected = [];
  const collectedLayouts = [];
  const walk = id => {
    const node = nodes.get(id);
    if (!node) return;
    if (node.type === "layout" && node.properties?.record) {
      collectedLayouts.push({
        record: node.properties.record,
        shift: Number(node.properties.shift || 0),
      });
    }
    if (node.type === "text") {
      const record = node.properties?.record;
      const label = String(
        node.properties?.formatted_text || node.properties?.display_text || ""
      );
      if (record) collected.push({
        record,
        label,
        rawHex: String(node.source?.raw_hex || ""),
        order: Number(node.properties?.order ?? 1e9),
      });
    }
    for (const child of node.children || []) walk(child);
  };
  walk(screen.root_node);
  collected.sort((left, right) => left.order - right.order);

  // 界面模板优先：它同时给出窗口骨架和该状态自有文字的落点，比单独一层
  // 布局或一条无定位文字都完整。绑定与槽位都来自构建期证据，不在这里推断。
  const binding = templateBinding(screen, model);
  if (binding) {
    const draft = templateDraft(screen, binding, model);
    if (draft) return draft;
  }

  // control / template 类记录靠运行期 provider 拼装；没有 provider 时不绘制。
  const printable = collected.filter(entry => entry.label.trim());
  const knownLayouts = new Set([
    ...(model?.static_assets?.layouts || []).map(layout => layout.id),
    ...(model?.components_data?.components || []).map(component => component.id),
  ]);
  const seenLayouts = new Set();
  const layouts = collectedLayouts.filter(layout => {
    if (!knownLayouts.has(layout.record) || seenLayouts.has(layout.record)) return false;
    seenLayouts.add(layout.record);
    return true;
  });

  // 已明确登记布局时直接绘制。文字只有以 $ED 自定位时才叠加；否则目录没有
  // cursor，擅自塞进窗口会制造错误位置。
  if (layouts.length) {
    const positionedText = printable.find(entry => /^ED(?:\s|$)/i.test(entry.rawHex));
    const layers = layouts.map(layout => ({
      kind: "layout",
      record: layout.record,
      ...(layout.shift ? {shift: layout.shift} : {}),
    }));
    if (positionedText) {
      const leadingAdvance = positionedText.rawHex.match(
        /^ED\s+([0-9A-F]{2})(?:\s|$)/i
      );
      layers.push({
        kind: "script",
        record: positionedText.record,
        cursor: 0,
        ...(leadingAdvance
          ? {line_origin: Number.parseInt(leadingAdvance[1], 16) & 0x1F}
          : {}),
      });
    }
    return {
      id: screen.id,
      kind: "structural-assets",
      viewport: screen.viewport || {x: 0, y: 0, width: 256, height: 240},
      layers,
      structural: true,
      preview_basis: "state-layout-evidence",
      primary_record: positionedText?.record || null,
      layout_records: layouts.map(layout => layout.record),
      deferred_records: printable
        .filter(entry => entry !== positionedText)
        .map(entry => entry.record),
      skipped_records: collected.length - printable.length,
    };
  }

  if (!printable.length) return null;

  // 一条记录自身可以是多行；多条记录各自的结束位置要靠 VM 才知道，因而
  // 预览只绘制第一条，其余记录留在检视器中。
  const primary = printable[0];
  if (screen.domain !== "field") {
    return {
      id: screen.id,
      kind: "source-record",
      viewport: screen.viewport || {x: 0, y: 0, width: 256, height: 240},
      layers: [{kind: "script", record: primary.record, cursor: 0}],
      structural: true,
      preview_basis: "unplaced-source-record",
      primary_record: primary.record,
      deferred_records: printable.slice(1).map(entry => entry.record),
      skipped_records: collected.length - printable.length,
    };
  }

  // 地图文字使用已确认的共用地图对话框。战斗与系统状态不会套用此窗口。
  if (!dialogue?.common_layout_record) return null;
  const layers = [
    {
      kind: "layout",
      record: dialogue.common_layout_record,
      shift: Number(dialogue.logical_layout_origin || 0),
    },
    {
      kind: "script",
      record: primary.record,
      cursor: Number(dialogue.logical_text_cursor || 0),
    },
  ];
  return {
    id: screen.id,
    kind: "structural-layout",
    viewport: screen.viewport || {x: 0, y: 0, width: 256, height: 240},
    layers,
    structural: true,
    preview_basis: "common-field-dialogue",
    primary_record: primary.record,
    deferred_records: printable.slice(1).map(entry => entry.record),
    skipped_records: collected.length - printable.length,
  };
}
