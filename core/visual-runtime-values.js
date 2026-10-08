// @editor-module 视觉字段对象按当前语义提供类型基帧、属性与战车地图形象引用。
const requireByte = (value, name) => {
  if (!Number.isInteger(value) || value < 0 || value > 255) throw new TypeError(name);
  return value;
};

export function actorTypeRuntimeValues(document, type) {
  const record = document?.actor_types?.find(row => row.id === type);
  const motion = document?.motions?.find(row => row.id === record?.motion_id);
  if (!record || !motion) throw new TypeError(`actor-type:${type}`);
  return {frameBase: requireByte(motion.frame_ids?.[0], "actor-motion-first-frame"),
    attributes: requireByte(record.oam_attributes, "actor-type-attributes")};
}

export function vehicleFieldActorType(document, preset) {
  return requireByte(document?.map_actor_types?.find(row => row.id === preset)?.actor_type,
    `vehicle-field-actor-type:${preset}`);
}
