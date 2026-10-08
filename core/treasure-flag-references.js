// @editor-module 调查物取得位的已发布读写引用投影。

export function treasureFlagReferences(index, project) {
  const scenes = new Map((project?.scenes?.editable_scenes || [])
    .map(scene => [Number(scene.id), scene]));
  const writes = [], reads = [];
  const effects = new Map([
    ['spawn-or-materialize-uncollected-metatile', '未取得图块生成'],
    ['collected-metatile-selection', '取得后图块选择'],
  ]);
  for (const row of project?.scenes?.logic?.treasures || []) {
    const model = row.interaction_state;
    const scene = scenes.get(Number(row.scene_id));
    if (!scene || model?.class !== 'treasure-collected-flag' || Number(model.flag_id) !== Number(index)) continue;
    const reference = {source: `treasure:${Number(row.scene_id).toString(16).toUpperCase().padStart(2, '0')}:${
      Number(row.id).toString(16).toUpperCase().padStart(2, '0')} · ${scene.name} · ${row.x}, ${row.y}`,
      href: `?view=scenes&scene=${scene.slug}&sceneObject=treasure:${row.id}`,
      scenePosition: {sceneId: Number(scene.id), x: row.x, y: row.y, sceneObject: `treasure:${row.id}`},
      evidence: model.commit};
    if (model.commit === 'immediate-after-successful-acquisition')
      writes.push({...reference, operation: '取得成功置位'});
    if (Number.isInteger(model.test_helper_cpu)) reads.push({...reference, operation: '取得状态检查'});
    for (const effect of model.effects || []) {
      if (effects.has(effect)) reads.push({...reference, operation: effects.get(effect)});
    }
  }
  return {writes, reads};
}
