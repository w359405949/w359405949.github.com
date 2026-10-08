// @editor-module 按已确认的读写路径关联战斗入口与存档事件位。

const hexId = value => Number(value).toString(16).toUpperCase().padStart(2, "0");

export function resolveBattleStateCatalog({review = {}, story = {}, actors = {}, zones = {}} = {}) {
  const wantedByFormation = new Map((review.formation_targets || [])
    .map(row => [row.formation_id, row.wanted_id]));
  const actorByUid = new Map((actors.records || []).map(row => [row.uid, row]));
  const entries = (story.world_event_triggers?.entries || []).map(row => ({
    id: `event:${hexId(row.scene_id)}:${hexId(row.id)}`,
    scene_id: row.scene_id, object_key: `event:${row.id}`, kind: "coordinate",
    x: row.trigger_x, y: row.trigger_y, formation_id: row.encounter_formation_id,
    victory_flag: row.event_flag, suppression_flag: row.event_flag, one_time: true,
    shadowed_by: (review.coordinate_exceptions || []).find(item => item.event_id === row.id)
      ?.shadowed_by_event_id ?? null,
  }));
  for (const battle of review.script_battles || []) {
    const users = (story.npc_catalog?.records || []).filter(actor =>
      actor[`${battle.kind}_script`]?.id === battle.script_id);
    for (const user of users) {
      const actor = actorByUid.get(user.uid);
      const contexts = user.scenes?.length ? user.scenes
        : (story.story_mode_contexts?.entries || [])
          .filter(row => row.scene_actor_entry === user.entry_id);
      for (const context of contexts) entries.push({
        ...battle, id: `${battle.kind}:${hexId(battle.script_id)}:${battle.cursor}:${user.uid}:${hexId(context.scene_id ?? context.id)}`,
        scene_id: context.scene_id ?? context.id, object_key: `actor:${user.record_id}`,
        actor_uid: user.uid, x: actor?.x ?? null, y: actor?.y ?? null,
      });
    }
  }
  for (const row of review.investigation_battles || []) entries.push({
    ...row, id: `${hexId(row.scene_id)}:${row.object_key}`, kind: "investigation",
  });
  const flagMap = review.wanted_targets || [];
  for (const zone of zones.zones || []) {
    if (!Number(zone.zone_id)) continue;
    for (const row of zone.entries || []) {
      if (row.empty || row.slot < 10) continue;
      const wanted = flagMap.find(target => target.defeat_flag === row.event_flag
        && target.wanted_id === Number(row.monster_id));
      if (!wanted) continue;
      const locations = [
        ...(zones.scene_zones?.assignments || []).filter(item => item.zone_id === zone.zone_id)
          .map(item => ({scene_id: item.scene_id, x: null, y: null})),
        ...(zones.world_grid?.blocks || []).filter(item => item.zone_id === zone.zone_id)
          .map(item => ({scene_id: 0, x: item.block_x, y: item.block_y})),
      ];
      for (const location of locations) entries.push({
        ...location, id: `zone:${hexId(zone.zone_id)}:${row.slot}:${hexId(location.scene_id)}:${location.x ?? ""},${location.y ?? ""}`,
        kind: "random", object_key: "", zone_id: zone.zone_id, slot: row.slot,
        ...(location.scene_id === 0 ? {block_cell_size: Number(zones.world_grid?.block_cell_size)} : {}),
        formation_id: Number(row.monster_id), wanted_id: wanted.wanted_id,
        victory_flag: wanted.defeat_flag, suppression_flag: wanted.defeat_flag, one_time: true,
      });
    }
  }
  return {
    wanted: flagMap,
    entries: [...new Map(entries.map(row => [row.id, row])).values()].map(row => ({...row,
      wanted_id: row.wanted_id ?? wantedByFormation.get(row.formation_id) ?? null})),
    formation_targets: review.formation_targets || [],
  };
}

export function battleFlagSections(catalog) {
  const sections = new Map();
  for (const row of catalog.entries) {
    if (row.one_time && row.shadowed_by == null && row.suppression_flag != null)
      sections.set(row.suppression_flag, row.wanted_id == null ? "battles" : "wanted");
  }
  for (const row of catalog.wanted) {
    sections.set(row.defeat_flag, "wanted");
    sections.set(row.claim_flag, "wanted");
  }
  return sections;
}

export function targetBattleState(catalog, targetId) {
  const canonical = catalog.formation_targets.find(row => row.formation_id === Number(targetId));
  const wanted = canonical ? catalog.wanted.find(row => row.wanted_id === canonical.wanted_id) : null;
  return {wanted, entries: catalog.entries.filter(row => wanted
    ? row.wanted_id === wanted.wanted_id : row.formation_id === Number(targetId))};
}
