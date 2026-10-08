// @editor-module 场景角色字段对象的形象控件。
import {esc} from '../../core/dom.js';
import {db} from '../../core/project-db.js';
import {actorAppearanceCatalog, ACTOR_ENTRY_SCENE_OBJECT} from '../../render/actor-atlas.js';
import {actorAppearanceContextForScene, sceneActorVisualDescriptor,
  sceneActorVisualMarkup, hydrateStoryActorVisuals} from '../../ui/actor-appearance.js';
import {mountFieldObjectChoice} from '../../ui/field-object-editor.js';
import {referencePickerMarkup} from '../../ui/reference-picker.js';

export async function mountSceneActorAppearance(host, object, {entityHandle, record, scene}) {
  const descriptor = sceneActorVisualDescriptor(record);
  const moduleId = descriptor.kind === 'actor-motion' ? 'actor-type'
    : descriptor.kind === 'direct-frame' ? 'direct-frame' : 'metasprite';
  const pair = actorAppearanceContextForScene(scene).pair;
  const rows = moduleId === 'actor-type'
    ? [...await actorAppearanceCatalog({entryPoint: ACTOR_ENTRY_SCENE_OBJECT}), {id: 0x3f, motionLabel: '无形象'}]
    : [{id: 0}, ...(await db.getResourceDocument(moduleId)).records];
  if (!host.isConnected) return;
  const items = rows.filter(row => row.id >= 0 && row.id <= 0x3f).map(row => {
    const value = row.id;
    const id = value.toString(16).toUpperCase().padStart(2, '0');
    const handle = (moduleId !== 'actor-type' && value === 0) || (moduleId === 'actor-type' && value === 0x3f)
      ? `0x${id}` : `${moduleId}:${id}`;
    const label = moduleId === 'actor-type' ? row.motionLabel
      : value === 0 ? '不绘制' : moduleId === 'direct-frame' ? '直接帧' : '组合精灵';
    return {value, label, meta: handle,
      preview: sceneActorVisualMarkup({record: {...record, actor_type: value}, pair,
        label, compact: true}),
      filter: `${value} ${handle} ${label}`.toLowerCase()};
  });
  mountFieldObjectChoice(host, object, {entityHandle, fieldName: 'actor_type', label: '形象',
    optionsMarkup: value => `${items.some(item => item.value === value) ? ''
      : `<option value="${esc(value)}" selected>${esc(value)}</option>`}${items.map(item =>
      `<option value="${item.value}"${item.value === value ? ' selected' : ''}>${esc(item.meta)}</option>`).join('')}`,
    pickerMarkup: (value, controlMarkup) => referencePickerMarkup({moduleId, value, items,
      label: '形象', controlMarkup, filterLabel: '搜索形象', filterPlaceholder: '名称／ID',
      className: 'scene-actor-appearance-picker'}),
    paintPreview: hydrateStoryActorVisuals,
  });
}
