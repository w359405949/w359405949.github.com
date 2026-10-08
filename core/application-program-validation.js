// @editor-module 应用程序入口、目录与整槽在统一边界原子校验。
import {applicationProgramId, applicationProgramFragment, applicationEntryFragments,
  readApplicationWord, validateApplicationProgramSlot} from './application-program-format.js';
const requireValue = (condition, message) => {if (!condition) throw new TypeError(`应用程序许可：${message}`);};
const exact = (value, keys) => requireValue(value && Object.keys(value).sort().join() === [...keys].sort().join(), '声明形状不同');
export function validateApplicationProgramWrites(linker, resolved) {
  const policy = linker.buildMap.application_farjump;
  requireValue(policy.programs.length === 60, '程序分配不是 60 槽');
  exact(policy.program_contract, ['prefix', 'native_handlers']);
  requireValue(policy.program_contract.prefix === 12
    && JSON.stringify(policy.program_contract.native_handlers) === JSON.stringify([0xA797, 0xA915, 0xEEBC, 0xEEC5, 0xA9F2]), '程序消费许可不同');
  const allowed = new Set(policy.code.map(row => row.slot_id)), bySlot = new Map();
  const applicationIds = new Set(['application-program', 'application-script-reader',
    ...policy.active_entries.map(entry => entry.resource_id), ...policy.extended_entries.map(entry => entry.resource_id)]);
  for (const item of resolved) {
    requireValue(!bySlot.has(item.slot.slot_id) || !applicationIds.has(item.fragment.asset_id), '片段重复');
    bySlot.set(item.slot.slot_id, item);
  }
  const slotFor = (id, owner, bank, offset, capacity, alignment, fragmentId) => {
    const slot = linker.slots.get(id), range = policy.byte_map.ranges.find(row => row.slot_id === id);
    requireValue(slot && slot.owner === owner && slot.region === 'prg' && slot.bank_index === bank
      && slot.bank_offset === offset && slot.capacity === capacity && slot.alignment === alignment
      && slot.file_offset === 16 + bank * 8192 + offset
      && slot.runtime_address === (bank === 0x18 ? 0xA000 : 0x8000) + offset
      && slot.fill === null && slot.alias_of === null && slot.mirror_of === null && slot.atomic_group === null,
      'bank、地址、容量或绑定不同');
    requireValue(range && range.file_offset === slot.file_offset && range.prg_offset === slot.file_offset - 16
      && range.length === capacity && range.bank === bank && range.kind === 'data' && range.purpose === fragmentId
      && JSON.stringify(range.field_objects) === JSON.stringify([owner === 'application-program' ? fragmentId.slice(0, -5) : owner])
      && range.confidence === (bank >= 0x40 ? 'expanded-baseline-reservation' : 'confirmed-program-entry')
      && JSON.stringify(range.evidence) === JSON.stringify(['project/config/byte-map/owners/application-program.json',
        'docs/metalmaxcn_application_script_farjump_design.md']), '符号表归属不同');
    allowed.add(id); return slot;
  };
  const slots = policy.programs.map((program, index) => {
    exact(program, ['program_id', 'allocation', 'slot_id']);
    const allocation = index === 0 ? 59 : index - 1;
    requireValue(program.program_id === applicationProgramId(index) && program.allocation === allocation, '稳定分配不同');
    return slotFor(program.slot_id, 'application-program', 0x60 + (allocation >> 1), (allocation & 1) * 4096,
      4096, 4096, applicationProgramFragment(program.program_id));
  });
  const used = new Set(); let active = 0, originalActive = 0;
  requireValue(policy.extended_entries.length === 199, '扩展命令目录容量不同');
  [...policy.active_entries, ...policy.extended_entries].forEach((entry, index) => {
    const extended = index >= 4;
    exact(entry, extended ? ['command', 'resource_id', 'directory_slot_id']
      : ['command', 'resource_id', 'origin_program', 'pointer_slot_id', 'directory_slot_id']);
    const command = extended ? index - 4 + 0x39 : index + 0x10, [id, pointerId, directoryId] = applicationEntryFragments(command);
    requireValue(entry.command === command && entry.resource_id === id
      && (extended || entry.origin_program === 'application-program:00'), '未许可入口');
    if (!extended) slotFor(entry.pointer_slot_id, id, 0x18, 0x1331 + index * 2, 2, 1, pointerId);
    const directory = slotFor(entry.directory_slot_id, id, 0x5E, 0x1000 + command * 16, 16, 16, directoryId);
    const ptr = bySlot.get(entry.pointer_slot_id), dir = bySlot.get(entry.directory_slot_id);
    if (!ptr && !dir) return;
    requireValue((extended || ptr) && dir, '缺入口指针或目录');
    if (!extended) requireValue(ptr.payload.length === 2 && readApplicationWord(ptr.payload, 0) === directory.runtime_address,
      '原入口未远跳到对应目录');
    if (!extended) requireValue(ptr.fragment.relocations.length === 1 && ptr.fragment.relocations[0].type === 'le16-pointer'
      && ptr.fragment.relocations[0].target_slot_id === directory.slot_id
      && ptr.fragment.relocations[0].offset === 0 && ptr.fragment.relocations[0].target_offset === 0
      && ptr.fragment.relocations[0].addend === 0, '入口重定位许可不同');
    const bytes = dir.payload;
    requireValue(bytes.length === 16 && bytes[0] === 255 && readApplicationWord(bytes, 10) === 4096
      && bytes.subarray(12).every(byte => byte === 0), '目录格式或容量不同');
    const programIndex = slots.findIndex(slot => slot.bank_index === bytes[1] && slot.runtime_address === readApplicationWord(bytes, 4));
    const slot = slots[programIndex], content = bySlot.get(slot?.slot_id);
    requireValue(content && readApplicationWord(bytes, 2) === slot.runtime_address + 512, '改错 bank 或缺整程序');
    requireValue(dir.fragment.relocations.length === 3
      && dir.fragment.relocations[0].type === 'fixed-write' && dir.fragment.relocations[0].offset === 1
      && dir.fragment.relocations[0].data.length === 1 && dir.fragment.relocations[0].data[0] === slot.bank_index
      && [2, 4].every((offset, index) => {
        const relocation = dir.fragment.relocations[index + 1];
        return relocation.type === 'le16-pointer' && relocation.offset === offset
          && relocation.target_slot_id === slot.slot_id && relocation.target_offset === (index ? 0 : 512)
          && relocation.addend === 0;
      }), '目录重定位许可不同');
    validateApplicationProgramSlot(content.payload, {count: readApplicationWord(bytes, 6), length: readApplicationWord(bytes, 8),
      ...policy.program_contract});
    if (!extended) originalActive++;
    used.add(slot.slot_id); active++;
  });
  requireValue(slots.every(slot => !bySlot.has(slot.slot_id) || used.has(slot.slot_id)), '无入口引用的程序片段');
  for (const item of resolved.filter(row => applicationIds.has(row.fragment.asset_id))) {
    requireValue(allowed.has(item.slot.slot_id), '原池或未登记位置不得写入');
    if (policy.code.some(row => row.slot_id === item.slot.slot_id)) continue;
    const expected = item.slot.owner === 'application-program'
      ? applicationProgramFragment(policy.programs.find(row => row.slot_id === item.slot.slot_id).program_id)
      : applicationEntryFragments(Number.parseInt(item.slot.owner.slice(-2), 16))[item.slot.capacity === 2 ? 1 : 2];
    requireValue(item.fragment.fragment_id === expected && !item.fragment.offset_in_slot
      && (item.slot.owner !== 'application-program' || !item.fragment.relocations.length)
      && item.payload.length === item.slot.capacity, '片段身份或整段覆盖不同');
  }
  return {active, originalActive};
}
