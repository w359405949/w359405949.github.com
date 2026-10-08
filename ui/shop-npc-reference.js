// @editor-module 场景角色的服务参数按设施配置选择器解析。
import {SCENE_SERVICE_INSTANCE_COUNTS} from "../core/scene-service-families.js";

export function shopConfigurationForActor(actor, pointerEntries) {
  const command = Number(actor?.text_region);
  const argument = Number(actor?.interaction_or_record_id);
  if (!Number.isInteger(command) || !Number.isInteger(argument)
      || !SCENE_SERVICE_INSTANCE_COUNTS.has(command)) return null;
  const familyId = command - 0x10;
  const family = pointerEntries.find(entry => Number(entry.family_id) === familyId);
  if (family?.records?.length !== SCENE_SERVICE_INSTANCE_COUNTS.get(command)) return null;
  const record = family?.records?.find(item => Number(item.id) === argument);
  return record ? {familyId, recordId: argument, family, record} : null;
}
