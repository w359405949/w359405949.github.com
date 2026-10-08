// @editor-module 剧情远跳片段身份与单页游标约束。
const CLASSES = Object.freeze({
  "story-autonomous-script": {count: 169, first: 0},
  "story-interaction-script": {count: 256, first: 1},
});

export function farjumpOriginalEntryIds(resourceId) {
  return farjumpEntryIds(resourceId).filter(id => resourceId !== 'story-interaction-script' || id < 0x6D);
}

export function storyPageExpandedEntryIds(kind) {
  return kind === 'interaction' ? farjumpEntryIds('story-interaction-script').filter(id => id >= 0x6D) : [];
}

export function farjumpEntryIds(resourceId) {
  const spec = CLASSES[resourceId];
  if (!spec) throw new TypeError("未知剧情远跳字段对象");
  return Array.from({length: spec.count - spec.first}, (_, index) => index + spec.first);
}

export function farjumpFragmentIds(resourceId, scriptId) {
  if (!farjumpEntryIds(resourceId).includes(scriptId)) throw new TypeError("剧情远跳 ID 超出入口域");
  const suffix = scriptId.toString(16).padStart(2, "0");
  return [`${resourceId}.directory.${suffix}`, `${resourceId}.page.${suffix}`];
}

export function farjumpComponentIds(resourceId) {
  return farjumpEntryIds(resourceId).flatMap(id => farjumpFragmentIds(resourceId, id));
}

export function validateFarjumpPage(payload, boundaries, declarations) {
  const fail = message => {throw new TypeError(`剧情远跳页：${message}`);};
  if (!(payload instanceof Uint8Array) || payload.length !== 256) fail("容量须为 256 字节");
  if (!Array.isArray(boundaries) || !boundaries.length || boundaries[0] !== 0
      || boundaries.some((cursor, index) => !Number.isInteger(cursor) || cursor < 0 || cursor > 255
        || (index > 0 && cursor <= boundaries[index - 1]))) fail("指令边界无效");
  const commands = new Set(boundaries), byOpcode = new Map(declarations.map(row => [row.opcode, row]));
  const seen = new Set(), queue = [0];
  for (let index = 0; index < queue.length; index++) {
    const cursor = queue[index];
    if (seen.has(cursor)) continue;
    if (!commands.has(cursor)) fail("分支没有落在当前指令边界");
    seen.add(cursor);
    const declaration = byOpcode.get(payload[cursor]);
    if (!declaration || cursor + declaration.width > 256) fail("指令越界或 opcode 无效");
    if (declaration.terminal_side_effect) continue;
    const advances = [declaration.fixed_advance,
      ...declaration.dynamic_advance_operands.map(operand => payload[(cursor + operand) & 255])];
    for (const advance of advances) if (advance > 0) queue.push((cursor + advance) & 255);
  }
  if (seen.size !== commands.size) fail("指令边界包含不可达指令");
}
