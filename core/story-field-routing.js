// @editor-module 剧情候选字段通过已发布 owner 引用读取与修改自主脚本。
import {projectFieldDraftOrigin} from "./project-field-draft.js";

export const STORY_AUTONOMOUS_RESOURCE_ID = "story-autonomous-script";

export function storyOperandPath(asset, field) {
  const ref = field?.owner_ref;
  if (ref?.resource_id !== STORY_AUTONOMOUS_RESOURCE_ID) {
    throw new Error(`${field?.id}: 缺少自主脚本 owner 引用`);
  }
  const index = asset?.scripts?.findIndex(script =>
    script.resource_id === ref.script_resource_id);
  const offset = ref.byte_index;
  if (!Number.isInteger(index) || index < 0 || !Number.isInteger(offset)
      || offset < 0 || offset >= (projectFieldDraftOrigin(asset) || asset).scripts[index].bytecode.length) {
    throw new Error(`${field.id}: 自主脚本字段引用不存在`);
  }
  return ["scripts", index, "bytecode", offset];
}

export function setStoryOperand(asset, field, value) {
  if (!Number.isInteger(value) || value < field.min || value > field.max) {
    throw new Error(`${field.id}: 操作数超出发布域`);
  }
  const [, index, , offset] = storyOperandPath(asset, field);
  asset.scripts[index].bytecode[offset] = value;
}

// The legacy segments are a disposable rendering projection, never saved.
// Owner identity comes from publication, not address arithmetic in the view.
export function projectStoryOperands(document, asset) {
  const segments = new Map(document.segments.map(segment => [segment.id, segment]));
  const scripts = new Map(asset.scripts.map(script => [script.resource_id, script]));
  for (const field of document.editable_fields) {
    if (field.kind !== "script-operand") continue;
    const script = scripts.get(field.owner_ref?.script_resource_id);
    if (!script) throw new Error(`${field.id}: 自主脚本字段引用不存在`);
    Object.defineProperty(segments.get(field.segment).bytes, field.offset, {
      enumerable: true, configurable: true,
      get: () => script.bytecode[field.owner_ref.byte_index],
      set: value => {script.bytecode[field.owner_ref.byte_index] = value;},
    });
  }
  return document;
}
