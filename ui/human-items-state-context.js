// @editor-module 工具执行入口从字段对象取得当前登记、名称与落点。
import {db} from '../core/project-db.js';
import {currentTextChoiceLabel, currentTextReference} from '../core/resource-index.js';
import {itemNameRecordId} from '../core/text-record-project.js';
import {fieldSubmenuCodeValues, fieldSubmenuCodeValue} from '../core/field-submenu-code-sources.js';
import {humanItemSceneType} from '../render/human-items-state-model.js';
import {SERVICE_ROLES} from '../core/service-preview-state.js';

export async function humanItemsStateContext(dispatch, values, context, fields) {
  const codeNames = ['field-item-repair-skill-threshold', 'field-item-repair-failure-record',
    'field-item-coin-record-base', 'runtime-action-record-region'];
  const [uses, healing, items, codeFields, document, story] = await Promise.all([
    db.getResourceDocument('field-item-use'), db.getResourceDocument('party-healing-service'),
    db.getResourceDocument('item-entry'),
    fieldSubmenuCodeValues(codeNames),
    db.getResourceDocument(`scene:${(context.scene?.sceneId ?? values[`save.slot.${context.slot}.scene_id`])
      .toString(16).toUpperCase().padStart(2, '0')}`),
    db.getDocument('project.story'),
  ]);
  const scene = document.scene || document;
  context.fieldSceneType = humanItemSceneType(scene);
  const destinations = await Promise.all(Array.from({length: 12}, async (_, index) => {
    const id = `ui-facility:teleport-terminal:config:${index.toString(16).toUpperCase().padStart(2, '0')}`;
    const [x, y] = await Promise.all(['coordinate_x', 'coordinate_y'].map(field => db.getField(id, id, field)));
    return {id: index, coordinate_x: x.value, coordinate_y: y.value,
      label: currentTextReference(`record:0D:${String(48 + index).padStart(3, '0')}`).label};
  }));
  return {uses, healing, items: items.records, destinations, cameraModel: story.browser_vm.camera_model,
    roleLabels: SERVICE_ROLES.map(role => fields.object(`save.slot.${context.slot}.role.${role}.name_codes`).nameText),
    vehicleLabels: Array.from({length: 11}, (_, id) => fields.object(`save.slot.${context.slot}.vehicle.${id}.name_codes`).nameText),
    codes: Object.fromEntries(codeNames.map(name => [name, fieldSubmenuCodeValue(codeFields, name)])),
    itemLabels: Object.fromEntries(items.records.map(row => [row.id, currentTextReference(itemNameRecordId(row)).label])),
    choiceLabels: Object.fromEntries(dispatch.choice_groups.filter(row => row.interface_state_ids?.some(id => id.startsWith('human-items.')))
      .map(row => [row.id, row.choices.map(choice => currentTextChoiceLabel(choice.label_reference))]))};
}
