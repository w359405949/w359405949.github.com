// @editor-module 商店适配器提供状态图的领域标签。
const presentation = {namespace: 'generic-shop', dataPrefix: 'generic', exitLabel: '应用返回'};
export const genericShopGraphPresentation = graph => ({...presentation,
  count: `${graph.nodes.length} 个状态`});
