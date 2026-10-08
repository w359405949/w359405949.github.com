// @editor-module 状态画面按区域层次合成领域绘制结果。
import {projectInterfaceRegions, intersectInterfaceBounds} from '../../render/interface-state-regions.js';

export async function paintInterfaceStateFrame(canvas, regions, {resolve, paint, read, decorate, isCurrent}) {
  const frame = canvas.ownerDocument.createElement('canvas');
  frame.width = canvas.width; frame.height = canvas.height;
  const context = frame.getContext('2d');
  context.fillStyle = '#000'; context.fillRect(0, 0, frame.width, frame.height);
  const projected = await projectInterfaceRegions(regions, {resolve,
    paint: async source => {
      const surface = canvas.ownerDocument.createElement('canvas');
      await paint(surface, source);
      return surface;
    }, read, isCurrent,
    decorate: (region, details) => {
      const bounds = intersectInterfaceBounds(region.bounds, region.clip || region.bounds);
      if (region.visible && bounds) {
        const {x, y, width, height} = bounds;
        context.drawImage(details.surface, x, y, width, height, x, y, width, height);
      }
      return decorate ? decorate(region, details) : region;
    }});
  if (!projected || !isCurrent()) return null;
  canvas.getContext('2d').drawImage(frame, 0, 0);
  return projected;
}
