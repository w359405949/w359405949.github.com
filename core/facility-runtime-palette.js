// @editor-module 设施继承调色板读取当前场景背景源与角色四色字段。

const byteColors = (colors, length) => Array.isArray(colors) && colors.length === length
  && colors.every(color => Number.isInteger(color) && color >= 0 && color < 64);

export function resolveFacilityWindowAttributes({logical_attribute_gate: gate, logical_attributes: attributes} = {}) {
  if (!Number.isInteger(gate) || gate < 0 || gate > 255)
    return {status: 'unavailable', reason: '窗口选色缺少属性开关的调用状态'};
  if (gate === 0) return {status: 'available', attributes: Array(64).fill(255)};
  if (!(Array.isArray(attributes) || ArrayBuffer.isView(attributes)) || attributes.length !== 64
      || !Array.from(attributes).every(value => Number.isInteger(value) && value >= 0 && value <= 255))
    return {status: 'unavailable', reason: '窗口选色缺少当前逻辑画面的属性字段'};
  return {status: 'available', attributes: Array.from(attributes)};
}

function facilityHighlightPalette(pointer, attributeShadow) {
  const local = pointer - 0x2000, page = local >> 10, tile = local & 1023;
  if (!Number.isInteger(pointer) || local < 0 || page > 1 || tile >= 960
      || !(Array.isArray(attributeShadow) || ArrayBuffer.isView(attributeShadow)) || attributeShadow.length !== 128
      || !Array.from(attributeShadow).every(value => Number.isInteger(value) && value >= 0 && value <= 255))
    return {status: 'unavailable', reason: '高亮选色缺少当前属性影子与已确认的图块地址'};
  const x = tile & 31, y = tile >> 5;
  const index = page * 64 + (y >> 2) * 8 + (x >> 2);
  return {status: 'available', palette_index: (attributeShadow[index] >> (((y & 2) << 1) | (x & 2))) & 3,
    attribute_index: index};
}

export function resolveFacilityInheritedPalette(binding, {palettes, actors, codeValues = {}, invocation = {}} = {}) {
  if (binding?.confirmation_status !== "confirmed") return {status: "unavailable",
    background_palettes: null, sprite_palettes: null, ui_background: null,
    sources: [], missing: ["palette-source-binding"]};
  const missing = [...(binding?.unresolved || [])];
  const sources = [];
  let backgroundPalettes = null, spritePalettes = null;
  const sceneId = invocation.sceneId;
  const sceneHandle = Number.isInteger(sceneId) && sceneId >= 0 && sceneId <= 255
    ? `scene:${sceneId.toString(16).toUpperCase().padStart(2, "0")}` : null;
  const matches = sceneHandle ? palettes?.records?.filter(row =>
    row.scene_references?.includes(sceneHandle)) || [] : [];
  const background = matches.length === 1 ? matches[0] : null;
  const backgroundSource = background?.[binding?.background?.field];
  const uiColors = binding?.ui_background?.code_parameters
    ? binding.ui_background.code_parameters.map(name => codeValues[name]) : binding?.ui_background?.colors;
  if (byteColors(backgroundSource, 9) && byteColors(uiColors, 4)) {
    backgroundPalettes = [0, 3, 6].map(start => [uiColors[0], ...backgroundSource.slice(start, start + 3)]);
    backgroundPalettes.push([...uiColors]);
    sources.push({resource_id: binding.background.field_object, handle: background.handle,
      field: binding.background.field, scene: sceneHandle,
      writer_chain: binding.background.writer_chain});
  } else missing.push(sceneHandle ? "current-scene-background-palette" : "scene-selection");
  if (byteColors(uiColors, 4)) sources.push({palette_index: binding.ui_background.palette_index,
    colors: [...uiColors], fields: binding.ui_background.field_sources,
    writer_chain: binding.ui_background.writer_chain});
  else missing.push("ui-background-palette");
  if (binding.menu_highlight?.window_routine) sources.push({kind: "menu-highlight",
    ...binding.menu_highlight, selection: facilityHighlightPalette(invocation.highlight_pointer,
      invocation.attribute_shadow)});
  const rows = actors?.[binding?.sprites?.field];
  const ordered = [0, 1, 2, 3].map(id => rows?.filter(row => row.id === id));
  if (ordered.every(matches => matches?.length === 1 && byteColors(matches[0].colors, 4))) {
    spritePalettes = ordered.map(matches => [...matches[0].colors]);
    sources.push({resource_id: binding.sprites.field_object, field: binding.sprites.field,
      writer_chain: binding.sprites.writer_chain});
  } else missing.push("current-field-sprite-palettes");
  return {status: backgroundPalettes && spritePalettes ? "inherited" : "unavailable",
    background_palettes: backgroundPalettes, sprite_palettes: spritePalettes,
    ui_background: byteColors(uiColors, 4) ? [...uiColors] : null,
    sources, missing: [...new Set(missing)]};
}
