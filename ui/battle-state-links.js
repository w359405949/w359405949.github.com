// @editor-module 战斗入口引用与编队名称的只读投影。
import {state} from "../core/state.js";

export function battleFormationLabel(formationId) {
  const formation = state.project?.game_data?.battle_test?.formations
    ?.find(row => Number(row.id) === Number(formationId));
  const monsters = state.project?.game_data?.monsters?.records || [];
  return (formation?.slots || []).filter(row => Number(row.count) > 0).map(row => {
    const name = monsters.find(monster => Number(monster.id) === Number(row.monster_id))?.name
      || `monster:${Number(row.monster_id).toString(16).toUpperCase().padStart(2, "0")}`;
    return `${name}×${row.count}`;
  }).join(" + ") || "—";
}

export function battleEntranceReferences(entries) {
  const scenes = state.project?.scenes?.editable_scenes || [];
  const seen = new Set();
  return entries.flatMap(row => {
    const scene = scenes.find(item => Number(item.id) === row.scene_id);
    if (!scene) return [];
    const key = `${row.scene_id}:${row.object_key}:${row.zone_id ?? ""}:${row.x},${row.y}`;
    if (seen.has(key)) return [];
    seen.add(key);
    const point = row.x != null && row.x < scene.width && row.y < scene.height;
    const location = row.kind === "random" ? `随机遭遇${row.scene_id === 0 ? ` · 区块 ${row.x}, ${row.y}` : ""}`
      : row.entrance_coordinates || (point ? `${row.x}, ${row.y}` : row.actor_uid ? "剧情角色" : "");
    const objectKey = row.entrance_object_key || row.object_key;
    return [{row, scene, point, location, objectKey}];
  });
}
