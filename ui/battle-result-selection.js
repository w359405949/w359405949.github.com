// @editor-module 战斗结果输入使用共用预览上下文与遭遇编队引用组件。
import {interfacePreviewContext, selectInterfacePreviewContext} from '../core/interface-preview-context.js';
import {prepareModuleComponent, renderModuleComponent, hydrateModuleComponents} from './module-components.js';
import {bindReferencePicker} from './reference-picker.js';
import '../modules/encounter/components.js';

export function battleResultSelectionMarkup(preview) {
  if (!preview?.battle_results) return '';
  const context = interfacePreviewContext();
  return `<div class="interface-preview-values" data-battle-result-selection>
    <span data-battle-result-formation></span>
    <span>队伍</span>${['猎人', '机械师', '士兵'].map((label, slot) =>
      `<label><input type="checkbox" data-battle-result-party="${slot}"${context.partyRoles.includes(slot) ? ' checked' : ''}>${label}</label>`).join('')}
    <label>掉落随机字节 <input type="number" min="0" max="255" value="${context.dropRoll}" data-battle-result-roll style="width:4em"></label>
  </div>`;
}

export async function bindBattleResultSelection(root, {rerender = () => {}} = {}) {
  const host = root.querySelector('[data-battle-result-selection]');
  if (!host) return;
  const context = interfacePreviewContext();
  const prepared = await prepareModuleComponent('encounter-formation', 'reference', {value: context.formation});
  if (!host.isConnected) return;
  if (context.formation == null) {
    context.formation = prepared.entries?.find(entry => {
      const count = entry.slots.reduce((sum, slot) => sum + slot.count, 0);
      return count > 0 && count <= 9;
    })?.id;
    prepared.value = context.formation;
    void rerender();
    return;
  }
  const target = host.querySelector('[data-battle-result-formation]');
  target.innerHTML = renderModuleComponent('encounter-formation', 'reference', {...prepared, label: '怪物组'});
  bindReferencePicker(target.querySelector('[data-module-reference-picker]'), {onSelect: value => {
    selectInterfacePreviewContext('formation', Number(value));
    void rerender();
  }});
  await hydrateModuleComponents(target);
  host.querySelectorAll('[data-battle-result-party]').forEach(control => {
    control.onchange = () => {
      selectInterfacePreviewContext('partyRoles', [...host.querySelectorAll('[data-battle-result-party]:checked')]
        .map(input => Number(input.dataset.battleResultParty)));
      void rerender();
    };
  });
  host.querySelector('[data-battle-result-roll]').onchange = event => {
    if (!event.target.checkValidity()) return;
    selectInterfacePreviewContext('dropRoll', Number(event.target.value));
    void rerender();
  };
}
