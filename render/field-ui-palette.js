// @editor-module 主菜单窗口调色板只读取所属代码字段对象的已确认参数。
import {fieldSubmenuCodeValues, fieldSubmenuCodeValue} from '../core/field-submenu-code-sources.js';

export async function resolveFieldUiPalette(preview, {readCodeField} = {}) {
  if (['single-pool', 'field-pools'].includes(preview.glyph_cache_source)) {
    const names = ['glyph-cache-font-low-bank', 'glyph-cache-font-high-bank'];
    const values = await fieldSubmenuCodeValues(names, readCodeField);
    const parameters = Object.fromEntries(names.map(name =>
      [name.slice('glyph-cache-'.length).replaceAll('-', '_'), fieldSubmenuCodeValue(values, name)]));
    preview = {...preview, glyph_cache_parameters: parameters,
      layers: preview.layers.map(layer => layer.kind === 'script'
      ? {...layer, glyph_cache: {cache_key: preview.glyph_cache_source, parameters,
        palette: layer.background_palette,
        mode: preview.glyph_cache_source}} : layer)};
  }
  const binding = preview?.ui_palette_source;
  if (!binding) return preview;
  if (binding.palette_index !== 3 || binding.color_parameters?.length !== 4)
    throw new TypeError('主菜单窗口调色板绑定无效');
  const values = await fieldSubmenuCodeValues(binding.color_parameters, readCodeField);
  const palette = binding.color_parameters.map(name => fieldSubmenuCodeValue(values, name));
  if (palette.some(color => color >= 64)) throw new TypeError('主菜单窗口色号超出 NES 调色板');
  const background = [...(preview.background_palettes || [])];
  background[binding.palette_index] = palette;
  return {...preview, background_palettes: background,
    default_attribute: preview.default_attribute ?? binding.palette_index * 0x55,
    layers: (preview.layers || []).map(layer => layer.kind === 'script'
      ? {...layer, background_palette: palette,
        glyph_colour: layer.glyph_colour ?? palette[1],
        ...(layer.glyph_cache ? {glyph_cache: {...layer.glyph_cache, palette}} : {})}
      : layer)};
}
