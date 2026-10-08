// @editor-module 电梯配置提供按游戏选单顺序排列的传送列表。
import {esc} from '../../core/dom.js';
import {db} from '../../core/project-db.js';
import {sceneElevatorDestinations} from '../../core/scene-elevators.js';
import {uiFacilityElevatorSceneBase} from '../../core/ui-facility-block-owner.js';
import {fieldElevatorSceneRanges} from '../../core/field-terrain-behavior.js';
import {prepareModuleComponent} from '../../ui/module-components.js';
import {mountFieldObjectNumber} from '../../ui/field-object-editor.js';
import {scenePositionPickerMarkup, hydrateScenePositionPicker} from '../scene/components.js';
import {buildUnknownDynamicListPreview, elevatorFloorPreviewBounds} from '../../render/elevator-menu-preview.js';
import {paintUiConstructionSemanticPreview} from '../visual/ui-construction-preview.js';
import './components.js';

let activePreview = null;
const sources = new Set(['facility-config', 'ui-facility', 'field-terrain-behavior-service',
  'text-record', 'shared-chr-bank', 'scene-header-map', 'metatile-page', 'metatile-set', 'palette']);

document.addEventListener('field-object-saved', event => {
  const fields = Array.isArray(event.detail?.fields) ? event.detail.fields : [event.detail?.fields];
  if (!activePreview?.host.isConnected || !fields.some(field => sources.has(field?.resourceId))) return;
  const {host, elevator, database} = activePreview;
  void mountElevatorDestinations(host, elevator, database).catch(error => {
    if (host.isConnected) host.innerHTML = `<p role="alert">${esc(error.message)}</p>`;
  });
});

export async function mountElevatorDestinations(host, elevator, database = db) {
  if (!host) return;
  const request = {host, elevator, database};
  activePreview = request;
  const current = () => host.isConnected && activePreview === request;
  const [configuration, facilities, scenes, terrain] = await Promise.all([
    prepareModuleComponent('facility-config', 'reference', {value: elevator.configuration_handle}),
    database.getResourceDocument('ui-facility'),
    database.getDocument('project.scenes'),
    database.getResourceDocument('field-terrain-behavior-service'),
  ]);
  if (!current()) return;
  if (configuration.error) throw new Error(configuration.error);
  if (!configuration.entry) throw new Error(`${elevator.configuration_handle} 缺少电梯配置`);
  if (host.dataset.elevatorParameterInstance !== String(elevator.instance_id)) {
    host.innerHTML = `<h3>目的地参数</h3><div class="scene-elevator-parameters">
      ${[['base', '场景基值'], ['lower', '触发下界 ≥'], ['upper', '触发上界 <']].map(([name, label]) =>
        `<div><label>${label}</label><span data-elevator-parameter="${name}"></span>
          <span data-elevator-parameter-scene="${name}"></span></div>`).join('')}
      </div><p data-elevator-formula></p><div data-elevator-list></div>`;
    for (const [name, resourceId, table] of [
      ['base', 'ui-facility', 'elevator-scene-bases'],
      ['lower', 'field-terrain-behavior-service', 'elevator-scene-lower'],
      ['upper', 'field-terrain-behavior-service', 'elevator-scene-upper'],
    ]) {
      const object = await database.getFieldObject(resourceId, `${resourceId}:${table}`);
      if (!current()) return;
      mountFieldObjectNumber(host.querySelector(`[data-elevator-parameter="${name}"]`), object,
        `value${elevator.instance_id}`, {reset: true, radix: 16, onValue: value => {
          host.querySelector(`[data-elevator-parameter-scene="${name}"]`).textContent =
            scenes.editable_scenes.find(scene => Number(scene.id) === Number(value))?.name || '';
        }});
    }
    host.dataset.elevatorParameterInstance = String(elevator.instance_id);
  }
  const base = uiFacilityElevatorSceneBase(facilities, elevator.instance_id);
  const [lower, upper] = fieldElevatorSceneRanges(terrain)[elevator.instance_id];
  const formula = host.querySelector('[data-elevator-formula]');
  formula.textContent = `目的地 = 基值 − 选单位置，落点 (${elevator.x},${(elevator.y + 1) & 255})`;
  formula.title =
    `触发场景：$${lower.toString(16).toUpperCase().padStart(2, '0')} ≤ 场景编号 < $${upper.toString(16).toUpperCase().padStart(2, '0')}（重叠范围取首个匹配实例）。`
    + `目的地 = (${base} − 选单位置) & 255，选单位置从 0 起算。`
    + `初始选单位置 = (${base} − 当前场景编号) & 255，由代码固定。`
    + `楼层数 = 配置长度前缀 ${configuration.entry.values.length}，受固定容量约束；楼层显示值不决定目的地。`
    + `落点 = (触发 X, (触发 Y + 1) & 255) = (${elevator.x}, ${(elevator.y + 1) & 255})，由代码固定。`;
  const destinations = sceneElevatorDestinations(elevator, configuration.entry.values, facilities, scenes);
  host.querySelector('[data-elevator-list]').innerHTML = `<h3>传送列表</h3><table class="scene-elevator-destinations">
    <thead><tr><th>楼层</th><th>目的地</th></tr></thead><tbody>${destinations.map(row =>
      `<tr data-elevator-destination="${row.selection}" data-elevator-scene="${row.sceneId}" data-elevator-point="${row.x},${row.y}">
        <td><canvas width="40" height="24" data-elevator-floor="${row.value}" data-elevator-row="${row.selection}" aria-label="楼层显示值 ${row.value}"></canvas></td>
        <td>${scenePositionPickerMarkup({entries: scenes.editable_scenes, sceneId: row.sceneId,
          x: row.x, y: row.y, readOnly: true, label: '目的地'})}</td></tr>`).join('')}
    </tbody></table>`;
  host.querySelectorAll('[data-scene-position-picker]').forEach(picker =>
    hydrateScenePositionPicker(picker, {entries: scenes.editable_scenes}));
  for (const canvas of host.querySelectorAll('[data-elevator-floor]')) {
    const surface = document.createElement('canvas');
    surface.width = 256;
    surface.height = 240;
    const row = Number(canvas.dataset.elevatorRow);
    const preview = buildUnknownDynamicListPreview({}, {familyId: 15,
      instanceId: elevator.instance_id, choiceIndex: row});
    const output = await paintUiConstructionSemanticPreview(surface, preview, {isCurrent: current});
    if (!current()) return;
    const bounds = elevatorFloorPreviewBounds(output, row);
    canvas.width = bounds.width;
    canvas.height = bounds.height;
    canvas.getContext('2d').drawImage(surface, bounds.x, bounds.y, bounds.width, bounds.height,
      0, 0, canvas.width, canvas.height);
    canvas.dataset.elevatorFloorBounds = JSON.stringify(bounds);
  }
  if (current()) host.dataset.elevatorDestinationsReady = elevator.configuration_handle;
}
