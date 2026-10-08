// @editor-module 场景地图的扩展槽分配与统一链接许可校验。
import {sha256Hex} from './rom-linker.js';

export const SCENE_MAP_LAYOUT = Object.freeze([
  ['map-reader', 'scene-data-stream-service', 0x5C, 0, 1024, 0x8000],
  ['map-gate', 'scene-data-stream-service', 0x14, 0xD4C, 18, 0xAD4C],
  ['directory', 'scene.config', 0x5C, 0x400, 2048, 0x8400],
  ['pool-0', 'scene.config', 0x5C, 0xC00, 5120, 0x8C00],
  ['pool-1', 'scene.config', 0x5D, 0, 8192, 0x8000],
]);
export const sceneMapSlotId = id => `scene-map-expansion.${id}`;
const requireValue = (value, message) => {if (!value) throw new TypeError(`场景地图扩展：${message}`);};
const word = (bytes, offset) => bytes[offset] | bytes[offset + 1] << 8;

export function sceneMapExpansionBudget(policy, slots) {
  return {
    capacity: SCENE_MAP_LAYOUT.slice(3).reduce((sum, [id]) => sum + (slots.get(sceneMapSlotId(id))?.capacity || 0), 0),
    mapCount: policy.entries.length,
    estimatedBytes: policy.entries.reduce((sum, entry) => sum + Math.ceil(entry.length / 7) * 7, 0),
  };
}

export async function planExpandedSceneMaps(components, policy, slots) {
  const fragments = [], directory = new Uint8Array(2048);
  const pools = SCENE_MAP_LAYOUT.slice(3).map(([id]) => slots.get(sceneMapSlotId(id)));
  const budget = sceneMapExpansionBudget(policy, slots);
  const required = components.reduce((sum, item) => sum + item.payload.length, 0);
  requireValue(required <= budget.capacity,
    `预算不足（bank $5C..$5D，地图容量 ${budget.capacity} 字节）；本次 ${components.length} 张地图需要 ${required} 字节，缺少 ${required - budget.capacity} 字节；全部 ${budget.mapCount} 张可修改地图按原分配估算 ${budget.estimatedBytes} 字节`);
  const used = [0, 0];
  for (const item of [...components].sort((a, b) => a.component_id.localeCompare(b.component_id))) {
    const entry = policy.entries.find(row => row.component_id === item.component_id);
    requireValue(entry && item.payload.length > 0 && item.payload.length % 7 === 0, '迁移片段须属于已绑定地图并包含完整 packed7 读取组');
    const index = pools.findIndex((pool, i) => pool && pool.capacity - used[i] >= item.payload.length);
    requireValue(index >= 0, `预算用尽（bank $5C..$5D，地图容量 ${budget.capacity} 字节）；${entry.resource_id} 需要 ${item.payload.length} 字节，剩余 ${pools.map((pool, i) => (pool?.capacity || 0) - used[i]).join('/')} 字节，地图须在同一 bank 内；全部 ${budget.mapCount} 张可修改地图按原分配估算 ${budget.estimatedBytes} 字节`);
    const pool = pools[index], offset = used[index], address = pool.runtime_address + offset;
    const length = item.payload.length;
    directory.set([pool.bank_index, address & 255, address >> 8, length & 255, length >> 8,
      entry.original_pointer & 255, entry.original_pointer >> 8, 255], entry.scene_id * 8);
    fragments.push({asset_id: 'scene.config', fragment_id: item.component_id,
      slot_id: pool.slot_id, offset_in_slot: offset, payload: item.payload,
      payload_sha256: await sha256Hex(item.payload), codec: 'scene-config/v1',
      codec_version: '1', alignment: 1, relocations: []});
    used[index] += length;
  }
  if (fragments.length) fragments.push({asset_id: 'scene.config', fragment_id: 'scene.map.directory',
    slot_id: sceneMapSlotId('directory'), payload: directory, payload_sha256: await sha256Hex(directory),
    codec: 'scene-config/v1', codec_version: '1', alignment: 1, relocations: []});
  return fragments;
}

export async function validateSceneMapExpansionWrites(linker, resolved) {
  const policy = linker.buildMap.scene_map_expansion;
  if (!policy) return;
  requireValue(policy.schema === 'metalmaxcn.scene-map-expansion' && linker.target.mapper === 74
    && linker.target.regions.find(row => row.kind === 'prg')?.size === 1048576, '目标布局不同');
  requireValue(policy.code?.length === 2 && policy.byte_map?.ranges?.length === 5
    && policy.byte_map.baseline_sha256 === linker.target.baseline_sha256, '代码许可或符号表缺失');
  for (const [id, owner, bank, offset, length, address] of SCENE_MAP_LAYOUT) {
    const slot = linker.slots.get(sceneMapSlotId(id));
    const range = policy.byte_map.ranges.find(row => row.slot_id === slot?.slot_id);
    requireValue(slot && slot.owner === owner && slot.region === 'prg' && slot.bank_index === bank
      && slot.bank_offset === offset && slot.capacity === length && slot.runtime_address === address
      && slot.file_offset === 16 + bank * 8192 + offset && slot.alignment === 1
      && !slot.alias_of && !slot.mirror_of && slot.atomic_group === null
      && range?.prg_offset === bank * 8192 + offset && range.file_offset === slot.file_offset
      && range.length === length && range.bank === bank && range.kind === (owner === 'scene.config' ? 'data' : 'code')
      && range.purpose === id && range.owner === owner
      && range.confidence === (bank >= 0x40 ? 'expanded-baseline-reservation' : 'approved-code-product')
      && JSON.stringify(range.evidence) === JSON.stringify(['project/config/scene-map-reader.asm',
        'project/evidence/scene-map-expansion-reader/observations.json']), '绑定或归属不同');
  }
  requireValue(Array.isArray(policy.entries) && new Set(policy.entries.map(row => row.scene_id)).size === policy.entries.length,
    '场景目录身份重复');
  for (const entry of policy.entries) {
    const suffix = entry.scene_id.toString(16).padStart(2, '0');
    requireValue(Number.isInteger(entry.scene_id) && entry.scene_id >= 1 && entry.scene_id <= 0xEF
      && entry.component_id === `scene.map.${suffix}` && entry.resource_id === `scene:${suffix.toUpperCase()}`
      && Number.isInteger(entry.length) && entry.length > 0
      && Number.isInteger(entry.output_bytes) && entry.output_bytes > 0
      && entry.original_locations?.length > 0 && entry.original_locations.reduce((sum, row) => sum + row.length, 0) === entry.length
      && Number.isInteger(entry.original_pointer) && entry.original_pointer >= 0 && entry.original_pointer <= 65535,
    '场景原分配声明无效');
  }
  const expanded = resolved.filter(row => SCENE_MAP_LAYOUT.slice(3).some(([id]) => row.slot.slot_id === sceneMapSlotId(id)));
  const directories = resolved.filter(row => row.slot.slot_id === sceneMapSlotId('directory'));
  const code = resolved.filter(row => row.slot.owner === 'scene-data-stream-service');
  requireValue(expanded.length ? directories.length === 1 && code.length === 2 : !directories.length && !code.length,
    '地图、目录与读取器须完整激活');
  const expected = await planExpandedSceneMaps(expanded.map(row => ({component_id: row.fragment.fragment_id,
    payload: row.payload})), policy, linker.slots);
  for (const item of expanded) {
    const entry = policy.entries.find(row => row.component_id === item.fragment.fragment_id);
    requireValue(item.payload.length % 7 === 0, '扩展地图须包含完整 packed7 读取组');
    const tokens = [];
    let buffer = 0, width = 0;
    for (const byte of item.payload) {
      buffer = (buffer << 8) | byte; width += 8;
      while (width >= 7) {width -= 7;tokens.push((buffer >> width) & 127);}
      buffer &= (1 << width) - 1;
    }
    let cursor = 0, output = 0;
    while (output < entry.output_bytes) {
      requireValue(cursor < tokens.length, '地图流提前结束');
      if (tokens[cursor++]) output++;
      else {
        requireValue(cursor + 1 < tokens.length && tokens[cursor + 1] > 0, '地图 RLE 操作数无效');
        output += tokens[cursor + 1]; cursor += 2;
      }
    }
    requireValue(output === entry.output_bytes && tokens.slice(cursor).every(token => token === 127), '地图尺寸或尾部填充不同');
  }
  for (const entry of policy.entries) {
    for (const location of entry.original_locations) {
      const slot = linker.slots.get(location.slot_id);
      requireValue(slot?.owner === 'scene.config' && location.offset_in_slot >= 0
        && location.offset_in_slot + location.length <= slot.capacity, '原地图绑定不同');
      for (const write of resolved.filter(row => row.slot.slot_id === slot.slot_id)) {
        const start = Math.max(location.offset_in_slot, write.fragment.offset_in_slot ?? 0);
        const end = Math.min(location.offset_in_slot + location.length, (write.fragment.offset_in_slot ?? 0) + write.payload.length);
        for (let offset = start; offset < end; offset++) requireValue(
          write.payload[offset - (write.fragment.offset_in_slot ?? 0)] === linker.baseline[slot.file_offset + offset], '地图的旧位置不得写入');
      }
    }
  }
  for (const product of expected) {
    const row = resolved.find(row => row.fragment.fragment_id === product.fragment_id
      && row.fragment.asset_id === 'scene.config');
    requireValue(row && row.slot.slot_id === product.slot_id
      && (row.fragment.offset_in_slot ?? 0) === (product.offset_in_slot ?? 0)
      && !row.fragment.relocations.length && row.payload.length === product.payload.length
      && row.payload.every((value, index) => value === product.payload[index]), '目录或迁移位置不同');
  }
  for (const row of code) {
    const permission = policy.code.find(item => item.slot_id === row.slot.slot_id);
    requireValue(permission && row.fragment.fragment_id === permission.fragment_id
      && !row.fragment.offset_in_slot && !row.fragment.relocations.length
      && row.payload.length === row.slot.capacity && await sha256Hex(row.payload) === permission.approved_sha256,
    '代码偏离审定产物');
  }
}
