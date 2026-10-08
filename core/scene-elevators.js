// @editor-module 从场景与元图块当前值投影电梯触发格。
import {fieldElevatorInstance, sceneHasElevatorDispatch} from "./field-terrain-behavior.js";
import {metatileBehaviorCode} from "./metatile-behavior.js";
import {sceneMetatileAttributeRecords} from "./metatile-projection.js";
import {sceneRuntimeMap, sceneMapCell} from "./scene-runtime-map.js";
import {uiFacilityElevatorDestinationScene} from "./ui-facility-block-owner.js";

export async function loadElevatorMetatiles(database) {
  const [pages, sets, terrain] = await Promise.all([
    database.getResourceDocument("metatile-page", null),
    database.getResourceDocument("metatile-set", null),
    database.getResourceDocument("field-terrain-behavior-service", null),
  ]);
  return {pages, sets, terrain};
}

export function sceneElevatorPoints(scene, metatiles) {
  if (!scene || !metatiles || !sceneHasElevatorDispatch(Number(scene.id), metatiles.terrain)) return [];
  if (!elevatorBehaviorEnabled(metatiles.terrain)) return [];
  const attributes = sceneMetatileAttributeRecords(scene, metatiles).flatMap(record =>
    record.metatile_attributes || record.metatile_attribute_page || []);
  return (sceneRuntimeMap(scene) || []).flatMap((row, y) => row.flatMap((tile, x) => {
    const attribute = attributes[tile];
    if (!Number.isInteger(attribute)) return [];
    const instanceId = fieldElevatorInstance(Number(scene.id), metatileBehaviorCode(attribute), metatiles.terrain);
    if (instanceId === null) return [];
    const id = y * scene.width + x;
    return [{id, x, y, instance_id: instanceId,
      configuration_handle: `application-config-instance:0F:${String(instanceId).padStart(2, "0")}`,
      map_handle: `scene:${Number(scene.id).toString(16).toUpperCase().padStart(2, "0")}:map:${sceneMapCell(scene, x, y).sourceY.toString(16).toUpperCase().padStart(2, "0")}`}];
  }));
}

export async function loadSceneElevators(database, scenes) {
  const metatiles = await loadElevatorMetatiles(database);
  const groups = await Promise.all(scenes.filter(scene => sceneHasElevatorDispatch(Number(scene.id), metatiles.terrain))
    .map(async scene => {
      const handle = `scene:${Number(scene.id).toString(16).toUpperCase().padStart(2, "0")}`;
      const document = await database.getResourceDocument(handle, null);
      if (!document?.scene) throw new TypeError(`${handle} 缺少场景正文`);
      return sceneElevatorPoints(document?.scene, metatiles)
        .map(elevator => ({scene, elevator, selection: `elevator:${elevator.id}`}));
    }));
  return groups.flat();
}

export function sceneElevatorDestinations(elevator, values, facilities, scenes) {
  return [...values].reverse().map((value, selection) => {
    const sceneId = uiFacilityElevatorDestinationScene(facilities, elevator.instance_id, selection);
    const scene = scenes.editable_scenes.find(row => Number(row.id) === sceneId);
    const x = elevator.x, y = (elevator.y + 1) & 255;
    return {value, selection, sceneId, scene, x, y,
      href: scene ? `?${new URLSearchParams({view: 'scenes', scene: scene.slug,
        sceneMode: 'logic', scenePoint: `${x},${y}`})}` : null};
  });
}

function elevatorBehaviorEnabled(terrain) {
  const values = terrain?.blocks?.find(block =>
    block.id === "field-terrain-behavior-service.whitelist-b075")?.values;
  if (!values) throw new TypeError("地形行为白名单正文不完整");
  const terminator = values.indexOf(0);
  return values.slice(0, terminator < 0 ? values.length : terminator).includes(0x11);
}
