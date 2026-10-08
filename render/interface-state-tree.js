// @editor-module 组件树按区域及领域提供的组件声明保留身份与字段引用。
import {interfaceRegionComponents, interfaceComponentBounds} from './interface-state-regions.js';

export async function interfaceStateTree({label, regions, includeEmpty = true}, describeRegion) {
  const widgets = [{id: 'screen', label, kind: 'screen', depth: 0}];
  for (const region of regions || []) {
    if (!region.visible || !includeEmpty && !region.components?.length && !region.slots?.length && !region.children?.length) continue;
    const components = interfaceRegionComponents(region);
    const declaration = describeRegion ? await describeRegion(region, components, widgets) : region;
    widgets.push({id: region.id, label: `${region.label}窗口`, kind: 'layout', depth: 1,
      parentId: 'screen', layer: region.layer, clip: region.clip,
      region: region.id, bounds: interfaceComponentBounds(declaration.layoutComponents || []) || region.bounds, components});
    const parents = new Map([[1, region.id]]);
    for (const child of declaration.children || []) {
      const depth = child.depth ?? 2;
      widgets.push({...child, depth, region: child.region ?? region.id,
        parentId: child.parentId ?? parents.get(depth - 1) ?? region.id, layer: region.layer, clip: region.clip});
      parents.set(depth, child.id);
    }
  }
  return widgets;
}
