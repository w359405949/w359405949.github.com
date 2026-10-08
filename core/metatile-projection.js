import {db} from "./project-db.js";
import {projectSceneMetatileSources} from "./metatile-source.js";
export {sceneMetatileAttributeRecords} from "./metatile-source.js";

const cache = new WeakMap();

export async function projectSceneMetatiles(scene, {edits = []} = {}) {
  const [pages, sets] = await Promise.all([
    db.getResourceDocument("metatile-page", null),
    db.getResourceDocument("metatile-set", null),
  ]);
  if (edits.length) return projectSceneMetatileSources(scene, {pages, sets, edits});
  const previous = cache.get(scene);
  if (previous?.pages === pages && previous.sets === sets) return previous.value;
  const value = projectSceneMetatileSources(scene, {pages, sets});
  cache.set(scene, {pages, sets, value});
  return value;
}
