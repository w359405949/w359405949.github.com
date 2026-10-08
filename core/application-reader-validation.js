// @editor-module 应用代码许可只接受审定布局与完整程序激活。
import {APPLICATION_READER_ID, APPLICATION_READER_PRODUCTS} from './application-script-reader-owner.js';
import {sha256Hex} from './rom-linker.js';
import {validateApplicationProgramWrites} from './application-program-validation.js';

export const APPLICATION_READER_LAYOUT = Object.freeze([
  [0x5E, 0x8000, 0], [0x18, 0xA05A, 0x5A], [0x18, 0xA06C, 0x6C], [0x18, 0xA0D4, 0xD4],
]);
const requireValue = (condition, message) => {if (!condition) throw new TypeError(`应用读取器许可：${message}`);};
const exact = (value, keys) => requireValue(value && typeof value === 'object'
  && Object.keys(value).sort().join() === [...keys].sort().join(), '声明形状无效');
export async function validateApplicationReaderWrites(linker, resolved) {
  const policy = linker.buildMap.application_farjump;
  if (policy === undefined) return;
  exact(policy, ['schema', 'reader_bank', 'code', 'active_entries', 'byte_map',
    ...(policy.programs ? ['programs', 'program_contract', 'extended_entries'] : [])]);
  exact(policy.byte_map, ['schema', 'baseline_sha256', 'ranges']);
  requireValue(policy.schema === 'metalmaxcn.application-farjump'
    && policy.reader_bank === 0x5E && linker.target.mapper === 74
    && linker.target.regions.find(region => region.kind === 'prg')?.size === 1048576
    && Array.isArray(policy.code) && policy.code.length === 4
    && Array.isArray(policy.active_entries) && policy.active_entries.length === (policy.programs ? 4 : 0),
  '目标布局或入口集合不同');
  requireValue(policy.byte_map?.schema === 'metalmaxcn.target-byte-map'
    && policy.byte_map.baseline_sha256 === linker.target.baseline_sha256
    && policy.byte_map.ranges?.length === (policy.programs ? 271 : 4), '目标符号表无效');
  const slots = new Set();
  for (const [[id, length], index] of APPLICATION_READER_PRODUCTS.map((row, index) => [row, index])) {
    const permission = policy.code.find(row => row.fragment_id === `${APPLICATION_READER_ID}.${id}`);
    exact(permission, ['fragment_id', 'slot_id', 'approved_sha256']);
    const slot = linker.slots.get(permission?.slot_id);
    const [bank, address, offset] = APPLICATION_READER_LAYOUT[index];
    const range = policy.byte_map.ranges.find(row => row.slot_id === slot?.slot_id);
    exact(range, ['slot_id', 'prg_offset', 'file_offset', 'length', 'bank', 'kind', 'purpose', 'field_objects', 'confidence', 'evidence']);
    requireValue(slot && slot.owner === APPLICATION_READER_ID && slot.region === 'prg'
      && slot.capacity === length && slot.bank_index === bank && slot.bank_offset === offset
      && slot.runtime_address === address && slot.alignment === 1
      && slot.alias_of === null && slot.mirror_of === null && slot.atomic_group === 'application-reader-code'
      && !slots.has(slot.slot_id) && /^[a-f0-9]{64}$/.test(permission.approved_sha256), '代码绑定不同');
    slots.add(slot.slot_id);
    requireValue(range && range.prg_offset === bank * 8192 + offset && range.file_offset === slot.file_offset
      && range.length === length && range.bank === bank && range.kind === 'code'
      && range.purpose === permission.fragment_id
      && range.confidence === (bank >= 0x40 ? 'expanded-baseline-reservation' : 'approved-code-product')
      && JSON.stringify(range.evidence) === JSON.stringify(['project/config/application-farjump-reader.asm',
        'project/evidence/app-script-wb-p5-new-commands/observations.json'])
      && JSON.stringify(range.field_objects) === JSON.stringify([`${APPLICATION_READER_ID}:0${index}`]),
    '代码归属不同');
    requireValue(await sha256Hex(linker.baseline.subarray(slot.file_offset, slot.file_offset + length))
      === slot.preimage_sha256, '代码原像不同');
  }
  const code = resolved.filter(row => slots.has(row.slot.slot_id));
  const {active, originalActive} = policy.programs ? validateApplicationProgramWrites(linker, resolved)
    : {active: 0, originalActive: 0};
  requireValue(active ? originalActive ? code.length === 4 : [0, 4].includes(code.length) : code.length === 0,
    '应用程序迁移未开放或缺完整入口，代码不得单独激活');
  for (const item of code) {
    const permission = policy.code.find(row => row.slot_id === item.slot.slot_id);
    requireValue(item.fragment.fragment_id === permission.fragment_id && !item.fragment.offset_in_slot
      && !item.fragment.relocations.length && item.payload.length === item.slot.capacity
      && await sha256Hex(item.payload) === permission.approved_sha256, '代码偏离审定产物');
  }
}
