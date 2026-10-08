// @editor-module 队伍相位减量引用移动执行字段对象的当前代码参数。
export const SCENE_DRAW_CODE_PARAMETERS = Object.freeze(Array.from({length: 3}, (_, index) => {
  const resourceId = "field-movement-execution-service";
  const name = `party-motion-speed-${index}`;
  return Object.freeze({name, resource_id: resourceId,
    entity_handle: `${resourceId}:code-parameter:${name}`, field: "value", readOnly: true,
    physical: Object.freeze({space: "prg", offset: 0x7DB39 + index, length: 1,
      end_exclusive: 0x7DB3A + index})});
}));

export async function sceneDrawMotionSpeeds(readField) {
  if (typeof readField !== "function") throw new TypeError("场景投影缺少所属代码字段读取器");
  return Promise.all(SCENE_DRAW_CODE_PARAMETERS.map(async source => {
    const value = (await readField(source)).value;
    if (!Number.isInteger(value) || value < 0 || value > 255) throw new TypeError(source.name);
    return value;
  }));
}
