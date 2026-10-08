// @editor-module 按场景引用取得元图块属性记录。
export function sceneMetatileAttributeRecords(scene, {pages, sets}) {
  const set = sets?.records?.find(record => (record.scene_references || [])
    .includes(`scene:${Number(scene.id).toString(16).toUpperCase().padStart(2, "0")}`));
  if (!set) throw new TypeError(`scene:${scene.id} 缺少元图块集引用`);
  const records = Number(scene.id) === 0 ? [set]
    : [set.lower_metatile_page, set.upper_metatile_page].map(handle =>
      pages?.records?.find(record => record.handle === handle));
  if (records.some(record => !record)) throw new TypeError("元图块页引用无效");
  return records;
}

export function projectSceneMetatileSources(scene, documents) {
  const records = sceneMetatileAttributeRecords(scene, documents);
  const definitions = records.flatMap(record => documents.edits?.find(edit => edit.handle === record.handle)?.definitions
    || record.metatile_definitions || record.metatile_definition_page || []);
  const attributes = records.flatMap(record => documents.edits?.find(edit => edit.handle === record.handle)?.attributes
    || record.metatile_attributes || record.metatile_attribute_page || []);
  if (!definitions.length || definitions.length !== attributes.length)
    throw new TypeError("元图块定义与属性不完整");
  return {...scene, metatile_definitions: definitions,
    metatile_palette_ids: attributes.map(value => value & 3)};
}
