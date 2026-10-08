// @editor-module 战车状况的进入路径声明引用菜单构造和选择值。

const OVERVIEW = 'command:22/33';
const CATEGORIES = ['equipment', 'attack', 'main-guns', 'chassis', 'weight', 'tools',
  'defense', 'sub-guns', 'engines', 'armor', 'shells', 'damage', 'special-guns', 'cunits', 'box'];

export const FIELD_GLYPH_ENTRY_PATHS = Object.freeze([
  {id: 'direct', label: '直接进入'}, {id: 'sequence', label: '顺序浏览'},
  {id: 'serpentine', label: '折返浏览'},
]);

export function fieldGlyphEntryCalls(binding, path = 'direct') {
  if (!FIELD_GLYPH_ENTRY_PATHS.some(entry => entry.id === path)) throw new TypeError('字形缓存进入路径无效');
  if (binding.name_entry) return [{preview_id: 'constructor:startup-load-file-menu'}];
  const calls = [{preview_id: 'constructor:startup-load-file-menu'}, {preview_id: 'command:4B'}];
  if (binding.dialogue) return [...calls, ...(binding.application_stages || []).map(stage => typeof stage === 'string' ? {preview_id: stage} : stage)];
  calls.push({preview_id: 'command:22'});
  if (binding.selection === null) return calls;
  calls.push({preview_id: OVERVIEW});
  let selected = 0;
  const title = (index, parentReset = false) => calls.push({preview_id: OVERVIEW,
    category_only: true, category_index: index, parent_reset: parentReset});
  const move = target => {
    while (Math.floor(selected / 5) < Math.floor(target / 5)) {selected += 5; title(selected);}
    while (selected % 5 > target % 5) {selected--; title(selected);}
    while (selected % 5 < target % 5) {selected++; title(selected);}
  };
  if (path !== 'direct') {
    const order = path === 'serpentine' ? [0, 1, 2, 3, 4, 9, 8, 7, 6, 5, 10, 11, 12, 13, 14]
      : CATEGORIES.map((_, index) => index);
    for (const index of order.slice(0, order.indexOf(binding.selection))) {
      move(index);
      calls.push({interface_state: `vehicle-status.overview-${CATEGORIES[index]}`});
      // 10:A83E→A641 重建父窗口，A6D9 的选择变化分支重绘部件标题。
      title(index, true);
      if ([2, 3, 5, 6, 7, 8, 10, 12, 13].includes(index)) title(index);
    }
  }
  move(binding.selection);
  if (binding.selector) calls.push({preview_id: 'constructor:field-overview-vehicles'});
  return calls;
}
