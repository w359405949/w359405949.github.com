// @editor-module 设施配置与设备帧交给所属整屏构造呈现。
import '../core/facility-device-state.js';

function configurablePreview(preview, kind, configuration) {
  if (!preview) return null;
  if (preview.facility_screen?.kind !== kind)
    throw new TypeError(`设施预览缺少 ${kind} 构造来源`);
  return {...structuredClone(preview), live_configuration: configuration};
}

export function buildJukeboxLivePreview(preview, values) {
  return configurablePreview(preview, 'jukebox', {family_id: 0x0A, values: [...values]});
}

export function buildTeleportTerminalPreview(preview, destinations, options = {}) {
  const dialogue = options.dialogue;
  if (!dialogue?.text_record) throw new TypeError('传送终端缺少当前流程文字');
  const result = configurablePreview(preview, 'teleport', {
    destinations: structuredClone(destinations),
    active_destination_ids: options.activeDestinationIds,
    dialogue_state_id: dialogue.id, dialogue_record: dialogue.text_record,
    dialogue_page_index: dialogue.page_index,
  });
  return {...result, layers: result.layers.map(layer => layer.teleport_body
    ? {...layer, record: dialogue.text_record, page_index: dialogue.page_index} : layer)};
}

export function buildVendingLivePreview(preview, familyId, values) {
  const result = configurablePreview(preview, 'vending', {family_id: Number(familyId), values: [...values]});
  if (Number(familyId) !== (result.facility_screen.configuration_family
    ?? Number.parseInt(result.facility_screen.resource_id?.split(':')[1], 16) - 0x10))
    throw new TypeError('售货机配置族与所属构造不一致');
  return result;
}
