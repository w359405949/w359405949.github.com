// @editor-module 电梯配置页复用服务流程的楼层构造。
import {elevatorServicePreview} from '../core/terminal-service-previews.js';

export function buildUnknownDynamicListPreview(preview, {familyId, instanceId, choiceIndex = 0} = {}) {
  if (Number(familyId) !== 15) return preview;
  const result = elevatorServicePreview('application-dialogue-flow:1F:segment:00');
  return {...result, selection: preview?.selection,
    runtime_context: {facility_instance: instanceId, choice_index: choiceIndex}};
}

export function elevatorFloorPreviewBounds(output, row) {
  const components = output?.components?.filter(component => component.componentId === `elevator-floor:${row}`);
  if (!components?.length) throw new TypeError(`楼层 ${row} 缺少文字组件范围`);
  const left = Math.min(...components.map(component => component.bounds.x));
  const top = Math.min(...components.map(component => component.bounds.y));
  const right = Math.max(...components.map(component => component.bounds.x + component.bounds.width));
  const bottom = Math.max(...components.map(component => component.bounds.y + component.bounds.height));
  return {x: left, y: top, width: right - left, height: bottom - top};
}
