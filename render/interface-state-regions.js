// @editor-module 区域投影统一屏幕坐标、层次、裁剪与领域内容来源。
export const interfaceBoundsOverlap = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x
  && a.y < b.y + b.height && a.y + a.height > b.y;

export function intersectInterfaceBounds(a, b) {
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
  const width = Math.min(a.x + a.width, b.x + b.width) - x;
  const height = Math.min(a.y + a.height, b.y + b.height) - y;
  return width > 0 && height > 0 ? {x, y, width, height} : null;
}

export const interfaceComponentBounds = components => components.reduce((bounds, row) => {
  if (!bounds) return {...row.bounds};
  const x = Math.min(bounds.x, row.bounds.x), y = Math.min(bounds.y, row.bounds.y);
  return {x, y, width: Math.max(bounds.x + bounds.width, row.bounds.x + row.bounds.width) - x,
    height: Math.max(bounds.y + bounds.height, row.bounds.y + row.bounds.height) - y};
}, null);

export function interfaceStateRegions(regions) {
  const ids = new Set();
  return regions.map((region, order) => {
    if (!region.id || ids.has(region.id)) throw new TypeError('区域须有唯一组件身份');
    ids.add(region.id);
    const bounds = {...region.bounds};
    if (!['x', 'y', 'width', 'height'].every(key => Number.isFinite(bounds[key]))
        || bounds.width <= 0 || bounds.height <= 0) throw new TypeError(`区域尺寸无效：${region.id}`);
    return {...region, bounds, layer: region.layer ?? order,
      clip: region.clip === false ? null : {...(region.clip || bounds)},
      content: region.content ?? region.reference ?? region.source ?? null};
  }).sort((a, b) => a.layer - b.layer);
}

export async function projectInterfaceRegions(regions, {resolve, paint, read, decorate = region => region,
  isCurrent = () => true}) {
  const surfaces = new Map(), projected = [];
  for (const region of interfaceStateRegions(regions)) {
    const source = await resolve(region);
    let surface = surfaces.get(source);
    if (region.visible && !surface) {
      surface = await paint(source);
      surfaces.set(source, surface);
    }
    if (!isCurrent()) return null;
    const area = region.visible ? read(surface, region.bounds) : {components: [], slots: []};
    projected.push(await decorate({...region, components: area.components, slots: area.slots,
      preview: area.preview}, {area, source, surface}));
  }
  return projected;
}

export function interfaceRegionComponents(region) {
  return (region.components || []).map(component => ({...component, bounds: {...component.bounds,
    x: component.bounds.x + region.bounds.x, y: component.bounds.y + region.bounds.y}}));
}
