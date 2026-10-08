// @editor-module 界面状态的预览实体类型由当前构建来源声明。

const ENTITY_TYPES = ['role', 'vehicle', 'rental', 'save-slot', 'wanted-record'];
const SOURCE_KEYS = ['field_sources', 'satellite_save', 'provider_values', 'provider_scripts',
  'provider_record_sequence', 'provider_record_sequences', 'provider_save_names',
  'provider_save_values', 'provider_save_items', 'save_equipment', 'runtime_save_item',
  'human_equipment_stats', 'human_equipment_comparison', 'provider_source'];

export function interfacePreviewEntityTypes(preview) {
  const types = new Set(preview?.preview_entity_types || []);
  const addVehicles = () => {types.add('vehicle'); types.add('rental');};
  const source = value => {
    if (Array.isArray(value)) {value.forEach(source); return;}
    if (value && typeof value === 'object') {Object.values(value).forEach(source); return;}
    if (typeof value !== 'string') return;
    if (/^save\.slot\.\d+(?:\.|$)/u.test(value)) {
      types.add('save-slot');
      if (/\.role\./u.test(value)) types.add('role');
      if (/\.vehicle\./u.test(value)) addVehicles();
    }
    if (/^characters\.rom_initial\.roles\./u.test(value)
        || value.includes('character-init:name-presets:')) types.add('role');
    if (/^vehicles\.presets\./u.test(value)) addVehicles();
    if (value === 'runtime_context.defeat_level') {
      types.add('wanted-record'); types.add('save-slot');
    }
  };
  if (!preview) return [];
  if (preview.field_submenu_vehicle || preview.field_overview) {
    addVehicles(); types.add('save-slot');
  }
  if (preview.party_summary) {
    types.add('role'); addVehicles(); types.add('save-slot');
  }
  SOURCE_KEYS.forEach(key => source(preview[key]));
  for (const layer of preview.layers || []) {
    (layer.preview_entity_types || []).forEach(type => types.add(type));
    if (layer.runtime_save_item) {
      types.add('role'); addVehicles(); types.add('save-slot');
    }
    SOURCE_KEYS.forEach(key => source(layer[key]));
    if (layer.repair_components || layer.vehicle_mount_candidates || layer.party_vehicle_sp) {
      addVehicles(); types.add('save-slot');
    }
    if (layer.save_party_names) {
      types.add('save-slot');
      if (layer.save_party_names !== 'vehicles') types.add('role');
      if (layer.save_party_names !== 'characters') addVehicles();
    }
    if (['record:02:048', 'record:02:088'].includes(layer.record)) types.add('save-slot');
    if (layer.record === 'record:02:079') {types.add('role'); types.add('save-slot');}
  }
  return ENTITY_TYPES.filter(type => types.has(type));
}

export function interfacePreviewActorType(actor, vehicles) {
  const [kind, token] = String(actor).split(':');
  if (kind.endsWith('role')) return 'role';
  if (kind === 'save-vehicle') return Number(token) < 8 ? 'vehicle' : 'rental';
  if (kind === 'rom-vehicle') return vehicles?.views?.rental?.preset_ids?.map(Number)
    .includes(Number(token)) ? 'rental' : 'vehicle';
  return null;
}
