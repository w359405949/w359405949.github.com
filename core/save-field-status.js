// @editor-module 存档状态位与死亡标记引用所属状态字节。

const EVIDENCE = 'project/evidence/field-poison-status/observations.json';

export function saveFieldStatusRecord(record) {
  const id = record?.field_id || '';
  const role = /^save\.slot\.([12])\.role\.(hunter|mechanic|soldier)\.status$/.exec(id);
  const vehicle = /^save\.slot\.([12])\.vehicle\.(\d+)\.condition_raw$/.exec(id);
  if (!role && !vehicle) return null;
  const entity = role || vehicle;
  if (record.address?.space !== 'sram' || record.address.length !== 1
      || record.binding?.encoding !== 'u8' || record.binding.slot !== Number(entity[1])
      || (role && record.binding.role !== ['hunter', 'mechanic', 'soldier'].indexOf(role[2]))
      || (vehicle && (Number(vehicle[2]) > 10 || record.binding.vehicle !== Number(vehicle[2])))) {
    throw new TypeError(`状态字段声明无效：${id}`);
  }
  const bit = role ? 3 : 2;
  const fieldId = id.replace(/\.(status|condition_raw)$/, '.acid');
  const label = `${record.binding.label.replace(/状态位$/, '')}酸蚀`;
  return {...record, field_id: fieldId, search_key: fieldId,
    record: label, meaning: label, value_meaning: label,
    resource_owner: record.resource_owner ? {...record.resource_owner,
      role: `field:${fieldId}`} : undefined,
    semantic_path: [...(record.semantic_path || []).slice(0, -1), label],
    address_meaning: record.address_meaning?.replace(record.binding.label, label),
    aliases: [...(record.aliases || []), label, '酸蚀'],
    algorithm_detail: `读取 bit ${bit}；写入时只改变掩码 $${role ? '08' : '04'}，并重算所属槽校验和。${
      role ? '死亡标记 $FF 不显示酸蚀且禁止开启。' : ''}`,
    confidence: 'static-disassembly-and-mesen-trace-confirmed',
    status: 'exact', category: 'config',
    apply_order: Number(record.apply_order || 100) + 1,
    field: {...record.field, encoding: 'bit', meaning: label,
      detail: `bit ${bit}；步行每格扣 ${role ? 'HP' : 'SP'} 1，其他位保持原值。`},
    binding: {...record.binding, encoding: 'bit', control: 'checkbox', label,
      editable: true, min: 0, max: 1, bit_index: bit, bit_mask: 1 << bit,
      status_parent_field: id, ...(role ? {excluded_raw_value: 255} : {}),
      preserve_other_bits: true, recompute_slot_checksum: true},
    source: {...record.source, evidence: [...(record.source?.evidence || []), EVIDENCE]},
    resource_address_bindings: (record.resource_address_bindings || []).map(binding =>
      ({...binding, primary: false, role: binding.role?.replace(/(status|condition_raw)$/, 'acid'),
        display_priority: Number(binding.display_priority || 0) + 0.5})),
  };
}

export function* withSaveFieldStatusRecords(records) {
  for (const record of records) {
    yield record;
    const status = saveFieldStatusRecord(record);
    if (status) yield status;
    const driving = saveRoleDrivingRecord(record);
    if (driving) yield driving;
    const dead = saveRoleDeathRecord(record);
    if (dead) yield dead;
    const numb = saveRoleNumbRecord(record);
    if (numb) yield numb;
  }
}

export function saveRoleDeathRecord(record) {
  const id = record?.field_id || '';
  const role = /^save\.slot\.([12])\.role\.(hunter|mechanic|soldier)\.status$/.exec(id);
  if (!role) return null;
  if (record.resource_owner?.resource_id !== 'save-role'
      || record.address?.space !== 'sram' || record.address.length !== 1
      || record.address.offset !== (Number(role[1]) === 1 ? 0x800 : 0xc00)
        + 0x7b + ['hunter', 'mechanic', 'soldier'].indexOf(role[2])
      || record.binding?.encoding !== 'u8' || record.binding.slot !== Number(role[1])
      || record.binding.role !== ['hunter', 'mechanic', 'soldier'].indexOf(role[2]))
    throw new TypeError(`死亡字段声明无效：${id}`);
  const fieldId = id.replace(/\.status$/, '.dead');
  const label = `${record.binding.label.replace(/状态位$/, '')}死亡标记`;
  return {...record, field_id: fieldId, search_key: fieldId,
    record: label, meaning: label, value_meaning: label,
    resource_owner: {...record.resource_owner, role: `field:${fieldId}`},
    semantic_path: [...(record.semantic_path || []).slice(0, -1), label],
    aliases: [...(record.aliases || []), label, '死亡'],
    algorithm_detail: '状态字节等于 $FF 表示死亡，开启写 $FF，关闭死亡写 $00，存活时关闭保留状态字节。',
    confidence: 'static-disassembly-and-mesen-trace-confirmed', status: 'exact', category: 'config',
    apply_order: Number(record.apply_order || 100) + 1,
    field: {...record.field, encoding: 'marker', meaning: label,
      detail: '死亡由 HP 归零写 $FF，复活清状态为 $00。'},
    binding: {...record.binding, encoding: 'marker', control: 'checkbox', label,
      editable: true, min: 0, max: 1, marker_value: 255, clear_value: 0,
      status_parent_field: id, recompute_slot_checksum: true},
    source: {...record.source, evidence: [...(record.source?.evidence || []),
      'project/evidence/reverse-engineering/shop-facility-state-sources/death.json']},
    resource_address_bindings: (record.resource_address_bindings || []).map(binding =>
      ({...binding, primary: false, role: binding.role?.replace(/status$/, 'dead'),
        display_priority: Number(binding.display_priority || 0) + 0.5})),
  };
}

export function saveRoleNumbRecord(record) {
  if (!saveRoleDeathRecord(record)) return null;
  const id = record.field_id;
  const fieldId = id.replace(/\.status$/, '.numb');
  const label = `${record.binding.label.replace(/状态位$/, '')}麻木标志`;
  return {...record, field_id: fieldId, search_key: fieldId,
    record: label, meaning: label, value_meaning: label,
    resource_owner: {...record.resource_owner, role: `field:${fieldId}`},
    semantic_path: [...(record.semantic_path || []).slice(0, -1), label],
    aliases: [...(record.aliases || []), label, '麻木'],
    algorithm_detail: '麻木读取状态字节 bit 7，死亡标记 $FF 除外；写入保留其余位并重算所属槽校验和。',
    confidence: 'static-disassembly-and-mesen-trace-confirmed', status: 'exact', category: 'config',
    apply_order: Number(record.apply_order || 100) + 1,
    field: {...record.field, encoding: 'bit', meaning: label, detail: 'bit 7 表示麻木。'},
    binding: {...record.binding, encoding: 'bit', control: 'checkbox', label,
      editable: true, min: 0, max: 1, bit_index: 7, bit_mask: 0x80,
      excluded_raw_value: 255, status_parent_field: id,
      preserve_other_bits: true, recompute_slot_checksum: true},
    source: {...record.source, evidence: [...(record.source?.evidence || []),
      'project/evidence/reverse-engineering/shop-facility-state-sources/numb.json']},
    resource_address_bindings: (record.resource_address_bindings || []).map(binding =>
      ({...binding, primary: false, role: binding.role?.replace(/status$/, 'numb'),
        display_priority: Number(binding.display_priority || 0) + 0.5})),
  };
}

export function saveRoleDrivingRecord(record) {
  const id = record?.field_id || '';
  const role = /^save\.slot\.([12])\.role\.(hunter|mechanic|soldier)\.present$/.exec(id);
  if (!role) return null;
  if (record.address?.space !== 'sram' || record.address.length !== 1
      || record.binding?.encoding !== 'u8' || record.binding.slot !== Number(role[1])
      || record.binding.role !== ['hunter', 'mechanic', 'soldier'].indexOf(role[2]))
    throw new TypeError(`乘车字段声明无效：${id}`);
  const fieldId = id.replace(/\.present$/, '.driving');
  const label = `${record.binding.label.replace(/在队(?:标志)?$/, '')}乘车标志`;
  return {...record, field_id: fieldId, search_key: fieldId,
    record: label, meaning: label, value_meaning: label,
    resource_owner: record.resource_owner ? {...record.resource_owner,
      role: `field:${fieldId}`} : undefined,
    semantic_path: [...(record.semantic_path || []).slice(0, -1), label],
    aliases: [...(record.aliases || []), label, '乘车'],
    algorithm_detail: '乘车读取在队字节的 bit 7，写入保留其他位并重算所属槽校验和。',
    confidence: 'static-disassembly-and-mesen-trace-confirmed', status: 'exact', category: 'config',
    apply_order: Number(record.apply_order || 100) + 1,
    field: {...record.field, encoding: 'bit', meaning: label,
      detail: 'bit 7 表示人物乘车，当前战车引用及取得状态须有效。'},
    binding: {...record.binding, encoding: 'bit', control: 'checkbox', label,
      editable: true, min: 0, max: 1, bit_index: 7, bit_mask: 0x80,
      status_parent_field: id, driving_vehicle_field: id.replace(/\.present$/, '.current_vehicle'),
      driving_status_field: id.replace(/\.present$/, '.status'),
      preserve_other_bits: true, recompute_slot_checksum: true},
    source: {...record.source, evidence: [...(record.source?.evidence || []),
      'project/evidence/reverse-engineering/shop-facility-state-sources/driving.json']},
    resource_address_bindings: (record.resource_address_bindings || []).map(binding =>
      ({...binding, primary: false, role: binding.role?.replace(/present$/, 'driving'),
        display_priority: Number(binding.display_priority || 0) + 0.5})),
  };
}
