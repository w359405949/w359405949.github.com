// @editor-module 场景移动结算字段对象提供固定效果与存档状态关联。
// 固定规则以 project/evidence/chassis-step-regen/observations.json 为依据。
import {fields} from '../../ui/record.js';
import {registerModuleComponent, renderModuleComponent} from '../../ui/module-components.js';

registerModuleComponent('field-step-resolution-service', 'movement-effects', {
  render: ({chassisDetail = false}) => fields([
    ['逐格回复', '人物 HP +1／格 · 最大 HP 封顶'],
    ['生效对象', '<span title="更换底盘保持效果；不检查乘车、在队或死亡标志。">绑定战车 02 的人物</span> · <a href="?view=save&amp;saveSection=party&amp;saveEntity=vehicle-2" title="持久战车槽 02">↗</a>'],
    ...(!chassisDetail ? [['关联底盘', '<a href="?view=equipment&amp;equipmentDomain=tank&amp;record=147#field-step-effects" title="战车槽 02 的原始底盘详情">↗</a>']] : []),
  ]),
});

registerModuleComponent('field-status-damage-service', 'movement-effects', {
  render: () => fields([
    ['人物酸蚀', '<span title="人物未乘车且未死亡时每格扣 1 HP；归零写死亡标记。">HP −1／格</span> · <a href="?view=save&amp;saveSection=party&amp;saveEntity=role-hunter" title="人物酸蚀状态">↗</a>'],
    ['战车酸蚀', '<span title="当前移动队伍绑定的酸蚀战车每格扣 1 SP，最低为零。">SP −1／格</span> · <a href="?view=save&amp;saveSection=party&amp;saveEntity=vehicle-0" title="战车酸蚀状态">↗</a>'],
  ]),
});

registerModuleComponent('field-exploration-runtime', 'movement-effects', {
  render: ({componentAttributes = '', chassisDetail = false}) => `<div data-field-step-effects ${componentAttributes}>
    ${renderModuleComponent('field-step-resolution-service', 'movement-effects', {chassisDetail})}
    ${renderModuleComponent('field-status-damage-service', 'movement-effects')}
    ${fields([['结算顺序', '<span title="先回复 HP，再生成并结算酸蚀扣减；HP 已满且人物酸蚀时，本格仍会扣 1 HP。">回复 → 酸蚀扣减</span>']])}
  </div>`,
});
