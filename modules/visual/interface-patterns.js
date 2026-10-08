// @editor-module 界面图块与核心字形详情嵌入所属字段对象的像素控件。
import {db} from '../../core/project-db.js';
import {esc} from '../../core/dom.js';
import {paintPatternPixelPreview} from '../../ui/pattern-pixel-editor.js';
import {showEditorError} from '../../ui/editor-error.js';
import {state} from '../../core/state.js';

const groups = new Set(['menu', 'vehicle', 'satellite']);
const selected = new Map();
const hex = value => value.toString(16).toUpperCase().padStart(2, '0');

export function interfacePatternMarkup(group) {
  if (group !== 'font' && !groups.has(group)) throw new TypeError('界面图块组无效');
  return `<section data-interface-patterns="${esc(group)}">
    ${group === 'font' ? '' : '<label>图块组<select data-interface-pattern-bank></select></label>'}
    <div class="interface-pattern-gallery" data-interface-pattern-gallery></div>
    <div data-interface-pattern-field></div>${group === 'satellite'
      ? '<nav aria-label="界面"><a href="?view=interfaceui&amp;interface=satellite-map">卫星地图 ↗</a></nav>' : ''}</section>`;
}

function interfacePatternBanks(group, model, vehicleSelectors = null) {
  let banks;
  if (group === 'vehicle') {
    const selectors = vehicleSelectors?.status_sprite_chr_banks;
    if (!selectors?.length) throw new TypeError('战车图案页缺少选择表');
    banks = selectors.flatMap(row => [row.chr_bank & 0xFE, (row.chr_bank & 0xFE) + 1]);
  } else {
    const previews = model?.menu_dispatch_data?.previews || [];
    const sources = group === 'menu' ? previews.filter(row => row.interface_state_id === 'field-command-menu.main')
      : previews.filter(row => row.satellite_save);
    const profiles = model?.static_assets?.chr?.profile_pattern_tables;
    if (!sources.length || !profiles) throw new TypeError('界面图案页缺少构造声明');
    const ids = sources.flatMap(row => [...(row.pattern_profiles || []),
      ...row.layers.flatMap(layer => layer.pattern_profiles || [])]);
    if (group === 'menu') {
      const dialogue = previews.find(row => row.interface_state_id === 'walking-dialogue.start');
      const sprites = dialogue?.layers?.filter(layer => layer.kind === 'generic_metasprite');
      if (!sprites?.length) throw new TypeError('菜单光标缺少图案页构造');
      const font = model.menu_dispatch_data.pattern_groups?.menu?.font_profile;
      if (!font) throw new TypeError('菜单字形缺少图案页声明');
      ids.push(...sprites.flatMap(layer => layer.pattern_profiles || []), font);
    }
    banks = [...(group === 'menu' ? model.static_assets.chr.pattern_table_web?.banks || [] : []),
      ...ids.map(id => {
        const reference = profiles.find(row => row.id === id)?.web_source;
        if (reference?.resource_id !== 'shared-chr-bank' || !Number.isInteger(reference.bank))
          throw new TypeError(`界面图案页缺少引用：${id}`);
        return reference.bank;
      })];
  }
  if (!banks.length || banks.some(bank => !Number.isInteger(bank))) throw new TypeError('界面图案页分组缺失');
  return [...new Set(banks)];
}

export async function bindInterfacePatterns(root, {repaint = () => {}, previewCanvas = null} = {}) {
  for (const host of root.querySelectorAll('[data-interface-patterns]')) {
    const group = host.dataset.interfacePatterns;
    const picker = host.querySelector('[data-interface-pattern-bank]');
    const banks = group === 'font' ? [] : interfacePatternBanks(group,
      state.project?.ui?.construction, group === 'vehicle' ? await db.getResourceDocument('vehicle-visual-selector') : null);
    if (picker) picker.innerHTML = banks.map(bank => `<option value="${bank}">${hex(bank)}</option>`).join('');
    const selection = selected.get(group) || {bank: banks[0], index: 0};
    if (group !== 'font' && !banks.includes(selection.bank)) {selection.bank = banks[0]; selection.index = 0;}
    selected.set(group, selection);
    if (picker) picker.value = selection.bank;
    let generation = 0;
    const load = async () => {
      const current = ++generation;
      let objects;
      if (group === 'font') objects = (await db.getFieldObjects('char')).filter(object =>
        object.fields[0].fieldName === 'core_glyph_bitmap');
      else {
        const asset = await db.getResourceDocument('shared-chr-bank');
        const index = asset.banks.findIndex(bank => bank.id === selection.bank);
        if (index < 0) throw new TypeError('界面图块组不存在');
        objects = await db.getFieldObjects('shared-chr-bank', {offset: index * 64, limit: 64});
      }
      if (current !== generation || !host.isConnected) return;
      const gallery = host.querySelector('[data-interface-pattern-gallery]');
      gallery.innerHTML = objects.map((object, index) => `<button type="button" data-interface-pattern-index="${index}"
        title="${esc(object.definition.label)}"><canvas width="8" height="8" aria-label="${esc(object.id)}"></canvas></button>`).join('');
      for (const [index, object] of objects.entries()) {
        const canvas = gallery.querySelector(`[data-interface-pattern-index="${index}"] canvas`);
        const paint = () => paintPatternPixelPreview(canvas, object.fields);
        for (const field of object.fields) field.bind(canvas, paint);
      }
      const mount = async index => {
        selection.index = index;
        for (const button of gallery.querySelectorAll('button'))
          button.setAttribute('aria-pressed', String(Number(button.dataset.interfacePatternIndex) === index));
        const previous = host.querySelector('[data-interface-pattern-field]');
        const fieldHost = document.createElement('div');
        fieldHost.dataset.interfacePatternField = '';
        previous.replaceWith(fieldHost);
        await objects[index].mount(fieldHost, {pixels: true, onValue: repaint});
        if (previewCanvas) for (const field of objects[index].fields) field.bind(fieldHost, () => {
          paintPatternPixelPreview(previewCanvas, objects[index].fields);
        });
      };
      gallery.onclick = event => {
        const button = event.target.closest('[data-interface-pattern-index]');
        if (button) void mount(Number(button.dataset.interfacePatternIndex))
          .catch(error => showEditorError(host, '图块编辑', error));
      };
      await mount(Math.min(selection.index, objects.length - 1));
    };
    picker?.addEventListener('change', () => {
      selection.bank = Number(picker.value);
      selection.index = 0;
      void load().catch(error => showEditorError(host, '图块编辑', error));
    });
    await load();
  }
}
