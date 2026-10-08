// @editor-module 场景显示名只解引用已发布的城镇名称文本。
import {currentTextChoiceLabel, currentTextReference} from './resource-index.js';

export function applyTeleportDestinationNames(project) {
  const destinations = project?.facilities?.facilities?.find(row => row.id === 'teleport-terminal')?.configuration?.destinations || [];
  for (const row of destinations) Object.defineProperty(row, 'name', {enumerable: true, configurable: true,
    get: () => currentTextReference(row.text_record).label.trim()});
}

export function applySceneTownNames(project) {
  for (const scene of project?.scenes?.editable_scenes || []) {
    if (!scene.name_reference || Object.getOwnPropertyDescriptor(scene, 'name')?.get) continue;
    const detail = scene.name;
    Object.defineProperty(scene, 'name', {enumerable: true, configurable: true,
      get: () => {
        const town = currentTextChoiceLabel({record: scene.name_reference});
        return town ? `${town} · ${detail}` : detail;
      }});
  }
}
