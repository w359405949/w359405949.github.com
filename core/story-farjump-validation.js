// @editor-module 在统一链接边界校验剧情远跳的绑定与定值许可。
import {sha256Hex} from "./rom-linker.js";
import {farjumpEntryIds, farjumpOriginalEntryIds, farjumpFragmentIds, validateFarjumpPage} from "./story-farjump-format.js";

const CODE = Object.freeze([
  ["story-script-reader.code", "story-script-reader", 2048, 0],
  ["scene-actor-runtime.autonomous-gate", "scene-actor-runtime", 8, 0x7C3],
  ["scene-actor-runtime.interaction-gate", "scene-actor-runtime", 12, 0x7CB],
  ["scene-actor-runtime.glyph-guard", "scene-actor-runtime", 14, 0x7D7],
  ["scene-actor-runtime.interaction-call", "scene-actor-runtime", 3, 0x87C],
  ["scene-actor-runtime.interaction-pointer", "scene-actor-runtime", 14, 0x860],
]);
const requireValue = (condition, message) => {if (!condition) throw new TypeError(`剧情远跳许可：${message}`);};
function exact(value, keys) {
  requireValue(value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).sort().join() === [...keys].sort().join(), "声明形状无效");
}
const equalBytes = (left, right) => left.length === right.length && left.every((byte, index) => byte === right[index]);

export async function validateStoryFarjumpWrites(linker, resolved) {
  const policy = linker.buildMap.story_farjump;
  if (policy === undefined) return;
  exact(policy, ["schema", "reader_bank", "autonomous_first_bank", "interaction_first_bank", "code", "classes", "declarations", "byte_map"]);
  requireValue(policy.schema === "metalmaxcn.story-farjump" && linker.target.mapper === 74
    && linker.target.regions.find(region => region.kind === "prg")?.size === 1048576
    && policy.reader_bank === 0x40 && policy.autonomous_first_bank === 0x41
    && policy.interaction_first_bank === 0x4F, "目标映射与批准的扩展布局不同");
  requireValue(Array.isArray(policy.code) && policy.code.length === CODE.length, "代码许可数量无效");
  const codeSlots = new Set();
  const registered = new Map();
  exact(policy.byte_map, ["schema", "baseline_sha256", "ranges"]);
  requireValue(policy.byte_map.schema === "metalmaxcn.target-byte-map"
    && policy.byte_map.baseline_sha256 === linker.target.baseline_sha256
    && Array.isArray(policy.byte_map.ranges) && policy.byte_map.ranges.length === CODE.length
      + 2 * ['story-autonomous-script', 'story-interaction-script'].reduce((sum, id) => sum + farjumpEntryIds(id).length, 0),
  "目标符号表身份无效");
  for (const range of policy.byte_map.ranges) {
    exact(range, ["slot_id", "prg_offset", "file_offset", "length", "bank", "kind", "purpose", "field_objects", "confidence", "evidence"]);
    const slot = linker.slots.get(range.slot_id);
    requireValue(slot && !registered.has(range.slot_id) && range.file_offset === slot.file_offset
      && range.prg_offset === slot.bank_index * 0x2000 + slot.bank_offset
      && range.file_offset === range.prg_offset + 16 && range.length === slot.capacity && range.bank === slot.bank_index
      && range.kind === (slot.atomic_group === "story-farjump-code" ? "code" : "data")
      && range.confidence === (slot.bank_index >= 0x40 ? "expanded-baseline-reservation" : "approved-code-product")
      && JSON.stringify(range.evidence) === JSON.stringify(["project/config/story-farjump-reader.asm",
        "docs/metalmaxcn_story_farjump_design.md", `${slot.baseline_bin}#sha256=${linker.target.baseline_sha256}`]),
    "符号表范围、确认程度或原像来源不同");
    registered.set(range.slot_id, range);
  }
  const checkRegistration = (slot, fragmentId, handle) => requireValue(registered.get(slot.slot_id)?.purpose === fragmentId
    && JSON.stringify(registered.get(slot.slot_id).field_objects) === JSON.stringify([handle]), "符号表字段对象不同");
  for (const [fragmentId, owner, length, offset] of CODE) {
    const permission = policy.code.find(row => row.fragment_id === fragmentId);
    exact(permission, ["fragment_id", "slot_id", "approved_sha256"]);
    const slot = linker.slots.get(permission.slot_id);
    requireValue(slot && slot.owner === owner && slot.region === "prg" && slot.capacity === length
      && slot.bank_offset === offset
      && slot.atomic_group === "story-farjump-code" && !slot.alias_of && !slot.mirror_of
      && /^[0-9a-f]{64}$/.test(permission.approved_sha256), "代码绑定或定值许可无效");
    if (owner === "story-script-reader") requireValue(slot.bank_index === policy.reader_bank
      && slot.bank_offset === 0 && slot.runtime_address === 0x8000, "读取器绑定无效");
    else requireValue(slot.bank_index === 0x1A && slot.runtime_address === 0xA000 + slot.bank_offset,
      "门桩绑定无效");
    requireValue(!codeSlots.has(slot.slot_id), "代码许可重复");
    codeSlots.add(slot.slot_id);
    checkRegistration(slot, fragmentId, owner === "story-script-reader" ? "story-script-reader:00"
      : `scene-actor-runtime:farjump:${fragmentId.slice("scene-actor-runtime.".length)}`);
  }
  requireValue(Array.isArray(policy.declarations) && policy.declarations.length === 0x74,
    "缺少完整剧情指令声明");
  policy.declarations.forEach((declaration, opcode) => {
    exact(declaration, ["opcode", "name", "width", "fixed_advance", "dynamic_advance_operands", "terminal_side_effect"]);
    requireValue(declaration.opcode === opcode && Number.isInteger(declaration.width)
      && declaration.width >= 1 && declaration.width <= 6
      && (declaration.fixed_advance === null || (Number.isInteger(declaration.fixed_advance)
        && declaration.fixed_advance >= 0 && declaration.fixed_advance <= 255))
      && typeof declaration.terminal_side_effect === "boolean"
      && Array.isArray(declaration.dynamic_advance_operands)
      && new Set(declaration.dynamic_advance_operands).size === declaration.dynamic_advance_operands.length
      && declaration.dynamic_advance_operands.every(index => Number.isInteger(index)
        && index > 0 && index < declaration.width), "剧情指令声明无效");
  });
  const bySlot = new Map();
  for (const item of resolved) {
    if (!bySlot.has(item.slot.slot_id)) bySlot.set(item.slot.slot_id, []);
    bySlot.get(item.slot.slot_id).push(item);
  }
  requireValue(Array.isArray(policy.classes) && policy.classes.length === 2, "剧情分类许可无效");
  let active = 0;
  for (const [classIndex, resourceId] of ["story-autonomous-script", "story-interaction-script"].entries()) {
    const row = policy.classes.find(row => row.resource_id === resourceId);
    exact(row, ["resource_id", "pointer_slot_id", "pool_slot_id", "entries"]);
    const identifiers = farjumpEntryIds(resourceId);
    const originalIdentifiers = farjumpOriginalEntryIds(resourceId);
    requireValue(Array.isArray(row.entries) && row.entries.length === identifiers.length, "目录 ID 域无效");
    const pointer = linker.slots.get(row.pointer_slot_id), pool = linker.slots.get(row.pool_slot_id);
    requireValue(pointer?.owner === resourceId && pointer.capacity === originalIdentifiers.length * 2
      && pool?.owner === resourceId && pool.region === "prg"
      && pointer.atomic_group === null && pool.atomic_group === null, "原指针与原池归属无效");
    requireValue(!bySlot.has(pool.slot_id), "原脚本池不得写入");
    const allowed = new Set([pointer.slot_id, pool.slot_id]);
    const pointerWrites = bySlot.get(pointer.slot_id) || [];
    const expectedOffsets = new Set();
    for (const [index, scriptId] of identifiers.entries()) {
      const entry = row.entries[index];
      exact(entry, ["script_id", "directory_slot_id", "page_slot_id"]);
      requireValue(entry.script_id === scriptId, "目录入口顺序无效");
      const [directoryId, pageId] = farjumpFragmentIds(resourceId, scriptId);
      const directory = linker.slots.get(entry.directory_slot_id), page = linker.slots.get(entry.page_slot_id);
      const pageIndex = index, firstBank = classIndex === 0 ? policy.autonomous_first_bank : policy.interaction_first_bank;
      const directoryAddress = (classIndex === 0 ? 0x8800 : 0x8AA4) + scriptId * 4;
      requireValue(directory?.owner === resourceId && directory.region === "prg" && directory.capacity === 4
        && directory.bank_index === policy.reader_bank && directory.bank_offset === directoryAddress - 0x8000
        && directory.runtime_address === directoryAddress && directory.alignment === 4
        && page?.owner === resourceId && page.region === "prg" && page.capacity === 256
        && page.bank_index === firstBank + (pageIndex >> 5) && page.bank_offset === (pageIndex & 31) * 256
        && page.bank_index <= (classIndex === 0 ? 0x4E : 0x5B)
        && page.runtime_address === 0x8000 + page.bank_offset && page.alignment === 256,
      "目录或页绑定超出所属分类");
      allowed.add(directory.slot_id); allowed.add(page.slot_id);
      const handle = `${resourceId}:script:${scriptId.toString(16).toUpperCase().padStart(2, "0")}`;
      checkRegistration(directory, directoryId, handle); checkRegistration(page, pageId, handle);
      const directories = bySlot.get(directory.slot_id) || [], pages = bySlot.get(page.slot_id) || [];
      const original = originalIdentifiers.includes(scriptId);
      const offset = index * 2, pointers = pointerWrites.filter(item => item.fragment.offset_in_slot === offset);
      if (!directories.length && !pages.length && !pointers.length) continue;
      requireValue(directories.length === 1 && pages.length === 1 && pointers.length === (original ? 1 : 0),
        original ? "原入口须同时写入两字节指针、目录与整页" : "扩展入口须只写入目录与整页");
      const dir = directories[0], content = pages[0], ptr = pointers[0];
      if (original) requireValue(ptr.payload.length === 2 && equalBytes(ptr.payload,
        [directoryAddress & 255, directoryAddress >> 8]) && ptr.fragment.relocations.length === 1
        && ptr.fragment.relocations[0].type === "le16-pointer"
        && ptr.fragment.relocations[0].target_slot_id === directory.slot_id
        && ptr.fragment.relocations[0].target_offset === 0 && ptr.fragment.relocations[0].addend === 0,
      "指针不在对应目录域");
      requireValue(dir.fragment.fragment_id === directoryId && content.fragment.fragment_id === pageId
        && !dir.fragment.offset_in_slot && !content.fragment.offset_in_slot
        && !dir.fragment.relocations.length && !content.fragment.relocations.length
        && equalBytes(dir.payload, [0xFF, page.bank_index, 0, page.runtime_address >> 8]), "目录格式或目标页错误");
      validateFarjumpPage(content.payload, content.fragment.instruction_boundaries, policy.declarations);
      if (original) expectedOffsets.add(offset);
      active++;
    }
    requireValue(pointerWrites.every(item => expectedOffsets.has(item.fragment.offset_in_slot)), "写入未改入口的指针");
    requireValue(resolved.filter(item => item.fragment.asset_id === resourceId)
      .every(item => allowed.has(item.slot.slot_id)), "剧情片段未登记");
  }
  const presentCode = resolved.filter(item => codeSlots.has(item.slot.slot_id));
  requireValue(active ? presentCode.length === CODE.length : presentCode.length === 0,
    "有效远跳入口与代码激活集合不同");
  for (const item of presentCode) {
    const permission = policy.code.find(row => row.slot_id === item.slot.slot_id);
    const handle = item.slot.owner === "story-script-reader" ? "story-script-reader:00"
      : `scene-actor-runtime:farjump:${permission.fragment_id.slice("scene-actor-runtime.".length)}`;
    requireValue(item.fragment.fragment_id === JSON.stringify([handle, handle, "enabled"])
      && item.fragment.codec === "metalmaxcn.story-code" && item.fragment.codec_version === "1" && !item.fragment.offset_in_slot
      && !item.fragment.relocations.length && item.payload.length === item.slot.capacity
      && await sha256Hex(item.payload) === permission.approved_sha256, "代码片段偏离审定产物");
  }
}
