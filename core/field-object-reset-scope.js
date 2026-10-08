// @editor-module 整记录 Original 范围由字段对象切面声明，按字段身份删 Working。
import {clearAutoSaveErrorsOf} from "./auto-save.js";
import {entityFacetFields, loadEntityCatalog} from "./entities.js";

const scopes = Object.freeze({
  character: Object.freeze({
    role: Object.freeze({resourceId: "character-initial-record",
      facets: Object.freeze(["rom_attributes", "rom_loadout"])}),
    names: Object.freeze({resourceId: "fixed-text-slot",
      facets: Object.freeze(["name_candidates"])}),
    gold: Object.freeze({resourceId: "character-initial-record",
      field: Object.freeze(["character-initial-record:initial-gold", "value"])}),
  }),
  vehicle: Object.freeze({
    player: Object.freeze({resourceId: "vehicle-preset",
      facets: Object.freeze(["initial_preset", "initial_loadout", "initial_placement"])}),
    rental: Object.freeze({resourceId: "vehicle-preset",
      facets: Object.freeze(["initial_preset", "initial_loadout"])}),
  }),
});

function declaration(kind, key, viewId, project) {
  if (kind === "character") {
    if (key === "initial-gold") return {...scopes.character.gold, target: null};
    if (key === "name-initialization") return {...scopes.character.names,
      target: "character"};
    const match = /^rom-role:(\d+)$/u.exec(String(key));
    if (match) return {...scopes.character.role, targetIndex: Number(match[1])};
  }
  if (kind === "vehicle") {
    const id = Number(key);
    const presetIds = project?.game_data?.vehicles?.views?.[viewId]?.preset_ids;
    if (Number.isInteger(id) && presetIds?.some(value => Number(value) === id)
        && scopes.vehicle[viewId]) {
      return {...scopes.vehicle[viewId], targetIndex: id};
    }
  }
  throw new TypeError(`未声明的整记录重置范围：${kind}/${key}/${viewId}`);
}

async function recordResetFields(database, kind, key, {
  viewId = null, project = null,
} = {}) {
  const scope = declaration(kind, key, viewId, project);
  if (scope.field) return [await database.getField(scope.resourceId, ...scope.field)];
  const catalog = await loadEntityCatalog();
  const target = scope.target ?? catalog.handleFor(kind, scope.targetIndex);
  const fields = new Set();
  for (const facetId of scope.facets) {
    const facet = await entityFacetFields(database, target, facetId, {catalog});
    if (facet.resourceId !== scope.resourceId)
      throw new TypeError(`重置切面资源不符：${kind}/${facetId}`);
    for (const field of facet.fields) if (!field.readOnly) fields.add(field);
  }
  if (!fields.size) throw new TypeError(`重置范围缺少字段：${kind}/${key}`);
  return [...fields];
}

export async function resetRecordFieldObjects(database, kind, key, {
  viewId = null, project = null, expectedVersion = undefined,
} = {}) {
  const scope = declaration(kind, key, viewId, project);
  const fields = await recordResetFields(database, kind, key, {viewId, project});
  await database.writeFields(fields.map(field => ({field, reset: true})),
    {expectedVersion});
  clearAutoSaveErrorsOf([key, scope.resourceId, ...fields]);
  return database.readResource(scope.resourceId);
}
