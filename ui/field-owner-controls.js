// 字段对象的专用编辑控件由浏览器入口注入。
import {mountFieldObjectEditor as mountFieldObjectControls} from './field-object-editor.js';

const controls = new Map([
  ['interface-state-document', async (host, object, options) =>
    (await import('../modules/interface-state/document-controls.js')).mountInterfaceStateDocumentControls(host, object, options)],
  ['core-latin', async (host, object, options) => options?.pixels && object.id === 'core-latin:slot-0x63'
      ? (await import('./pattern-pixel-editor.js')).mountPatternPixelEditor(host, object,
        {...options, fields: ['value0']}) : mountFieldObjectControls(host, object, options)],
  ['scene-encounter-zone', async (host, object, options) => options?.encounterZoneDetail
      ? (await import("../modules/encounter/zone-components.js")).mountEncounterZoneControls(host, object, options)
      : mountFieldObjectControls(host, object, options)],
  ['text-record', async (host, object, options) => options?.listOrder
      ? (await import('./text-record-controls.js')).mountTextRecordOrderControls(host, object, options.listOrder)
      : options?.uiStructure
        ? (await import('./text-record-structure-editor.js')).mountTextRecordStructureEditor(host, object, options)
        : options?.sceneInteractionConfiguration
          ? (await import('./text-record-controls.js')).mountTextRecordControls(host, object)
          : mountFieldObjectControls(host, object, options)],
  ['battle-action', async (host, object, options) => options?.fixedShape
      ? (await import('./battle-action-dimension-controls.js')).mountBattleActionDimensionControls(host, object, options)
      : mountFieldObjectControls(host, object, options)],
  ['shared-chr-bank', async (host, object, options) => options?.pixels
      ? (await import('./pattern-pixel-editor.js')).mountPatternPixelEditor(host, object,
        {...options, fields: ['plane_0', 'plane_1']}) : mountFieldObjectControls(host, object, options)],
  ['facility-config', async (host, object, options) => options?.sceneInteractionConfiguration
      ? (await import('./facility-configuration-controls.js')).mountFacilityConfigurationControls(host, object, options)
      : mountFieldObjectControls(host, object, options)],
  ['encounter-trigger-runtime', async (host, object, options) => options?.encounterWeightSlots
      ? (await import("../modules/encounter/zone-components.js")).mountEncounterWeightControls(host, object)
      : mountFieldObjectControls(host, object, options)],
  ['char', async (host, object, options) => options?.pixels && object.fields[0].fieldName === 'core_glyph_bitmap'
      ? (await import('./pattern-pixel-editor.js')).mountPatternPixelEditor(host, object,
        {...options, fields: ['core_glyph_bitmap']}) : mountFieldObjectControls(host, object, options)],
  ['ui-tile-rectangle-service', async (host, object, options) => options?.rectanglePreset
      ? (await import('./rectangle-preset-controls.js')).mountRectanglePresetControls(host, object, options)
      : mountFieldObjectControls(host, object, options)],
  ['text-render-runtime', async (host, object, options) => object.id === 'text-render-runtime:window-clear-selector'
      ? (await import('./rectangle-preset-controls.js')).mountWindowClearSelectorControls(host, object, options)
      : options?.transferPreset
      ? (await import('./rectangle-preset-controls.js')).mountRectanglePresetControls(host, object, options)
      : mountFieldObjectControls(host, object, options)],
]);

export function mountFieldOwnerControls(resourceId, host, object, options) {
  return (controls.get(resourceId) || mountFieldObjectControls)(host, object, options);
}
