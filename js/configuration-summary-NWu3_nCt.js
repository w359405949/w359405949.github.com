import { db, projectBattleObjectOwners, fixedRuntimeTextScriptHex, itemNameRecordId, currentActorNameSource, facilityRuntimeCodeValues, textRecordNodeId } from './battle-result-script-runtime-B_EClFew.js';
import { VISUAL_METASPRITES_RESOURCE_ID, battleRoleSelector } from './visual-metasprites-DJP54-bV.js';
import { metaspriteContextSources, createRaster, paintBattleAction, metaspriteObjectImage, battleActionPlacements, decodeChrTile, loadChrBankBytes, paintChrTile, resourceLabel, recordUid, currentTextReference } from './element-tree-DsgOBeTK.js';
import { uiTemplateBindings } from './page-runtime-paths-C0wxpxf1.js';
import { state } from './emulator-DynsZsth.js';

// @editor-module 统一战斗人物、NPC 与载具的外观和动作目录。
//
// 人物 / 狼直接引用 metasprite-record 的战斗上下文；八辆载具直接引用
// weapon-effects 的 battle-object action $01-$08。战斗场景与独立编辑页都只消费
// 这里的逻辑对象，不再各自解释图形编号。


const BATTLE_ACTOR_CHR_BANKS = Object.freeze([0x24, 0x25, 0x26, 0x27]);

// 战斗对象的 8-bit tile 编号依次落在四个 64-tile CHR 窗口；UI 画布按
// profile 选择图块来源，因此这里把战斗绘制器使用的同一组 bank 暴露为
// 可复用的窗口说明，避免界面页另猜一套分页。
const BATTLE_ACTOR_CHR_PATTERN_PROFILES = Object.freeze(
  BATTLE_ACTOR_CHR_BANKS.map((bank, index) => Object.freeze({
    id: `battle-actor-chr:${bank.toString(16).toUpperCase().padStart(2, "0")}`,
    bank,
    first_tile: index * 0x40,
    last_tile: index * 0x40 + 0x3F,
  })),
);

function weaponAssets(project) {
  return project?.visuals?.weapon_effect_catalog?.asset_catalog_data || {};
}

function battleContext(project) {
  return (project?.visuals?.metasprites?.contexts || [])
    .find(context => Number(context.pair) === 0x94) || null;
}

/**
 * 步行战斗选择表允许引用的 55 个 generic metasprite。分析投影只负责名称与
 * 可用性；真正的当前选择仍从 metasprite-record working 正文读取。
 */
function battleActorMetaspriteChoices(project) {
  const contextById = new Map(
    (battleContext(project)?.battle_objects || [])
      .filter(item => item.kind === "metasprite")
      .map(item => [Number(item.id), item]),
  );
  return (project?.visuals?.metasprites?.objects || [])
    .map(item => {
      const id = Number(item.id);
      const contextual = contextById.get(id) || item;
      const resourceUid = `metasprite:${id.toString(16).toUpperCase().padStart(2, "0")}`;
      return {
        id,
        resourceUid,
        label: appearanceLabel({...contextual, kind: "metasprite"}),
        available: !item.runtime_generated && Number(contextual.sprite_count) > 0,
        resource: contextual,
      };
    })
    .sort((left, right) => left.id - right.id);
}

function appearanceLabel(item) {
  const fallback = `${item.kind === "direct-frame" ? "直接帧" : "Metasprite"} ${
    item.id_hex || `0x${Number(item.id).toString(16).toUpperCase().padStart(2, "0")}`
  }`;
  return item.name || item.role_label || fallback;
}

function metaspriteAppearances(project) {
  const sprites = (battleContext(project)?.battle_objects || [])
    .filter(item => item.kind === "metasprite"
      && Number(item.sprite_count) > 0
      && Number.isInteger(Number(item.party_role_id)))
    .map(item => ({
      key: String(item.resource_id),
      id: Number(item.id),
      kind: "metasprite",
      label: appearanceLabel(item),
      partyRoleId: Number(item.party_role_id),
      partyRoleSlug: String(item.party_role_slug || ""),
      actorKind: String(item.battle_actor_kind
        || (Number(item.party_role_id) > 2 ? "npc" : "human")),
      pose: String(item.battle_pose || ""),
      poseLabel: String(item.battle_pose_label || ""),
      poseOrder: Number(item.battle_pose_order) || 0,
      defaultForPartyRole: Boolean(item.default_for_party_role),
      resource: item,
      resourceUid: String(item.resource_id),
    }))
    .sort((left, right) => left.partyRoleId - right.partyRoleId
      || left.poseOrder - right.poseOrder || left.id - right.id);
  const byRole = new Map();
  for (const action of sprites) {
    let appearance = byRole.get(action.partyRoleId);
    if (!appearance) {
      appearance = {
        key: `battle-appearance:${action.partyRoleSlug || action.partyRoleId}`,
        label: String(action.resource?.role_label
          || `${action.partyRoleSlug} 战斗形象`),
        kind: action.actorKind,
        weaponKind: "human",
        partyRoleId: action.partyRoleId,
        partyRoleSlug: action.partyRoleSlug,
        actions: [],
        defaultAction: "",
      };
      byRole.set(action.partyRoleId, appearance);
    }
    appearance.actions.push(action);
    if (action.defaultForPartyRole) appearance.defaultAction = action.pose;
  }
  const appearances = [...byRole.values()].map(appearance => ({
    ...appearance,
    defaultAction: appearance.defaultAction || appearance.actions[0]?.pose || "",
  }));
  // 正文由调用方的异步资源准备阶段载入；未改选时保留发布投影的默认姿势。
  const document_ = db.peekDocument(VISUAL_METASPRITES_RESOURCE_ID, null);
  if (document_ && db.metadata(VISUAL_METASPRITES_RESOURCE_ID)?.dirty) {
    const stateActions = battleActorMetaspriteChoices(project)
      .filter(choice => choice.available)
      .map(choice => ({
        key: choice.resourceUid,
        id: choice.id,
        kind: "metasprite",
        label: choice.label,
        pose: choice.resourceUid,
        poseLabel: choice.label,
        resource: choice.resource,
        resourceUid: choice.resourceUid,
      }));
    for (const appearance of appearances) {
      const selectedId = Number(battleRoleSelector(document_, appearance.partyRoleId + 1).metasprite_id);
      const original = appearance.actions.find(action => action.pose === appearance.defaultAction);
      if (selectedId === original?.id) continue;
      const selected = appearance.actions.find(action => action.id === selectedId)
        || stateActions.find(action => action.id === selectedId);
      if (!selected) throw new Error(`待机 metasprite ${selectedId} 没有可预览资源`);
      if (!appearance.actions.includes(selected)) appearance.actions.push(selected);
      if (!sprites.some(action => action.key === selected.key)) sprites.push(selected);
      appearance.defaultAction = selected.pose;
      // 改选后不再受原角色的识别分组限制；状态轨只能引用现有 generic 资源。
      appearance.stateActions = stateActions;
    }
  }
  return {appearances, actions: sprites};
}

function vehicleAppearances(project) {
  const assets = weaponAssets(project);
  const actionById = new Map(
    (assets.battle_objects?.actions || []).map(item => [Number(item.id), item]),
  );
  const firstPresetByChassis = new Map();
  for (const preset of project?.game_data?.vehicles?.presets || []) {
    const chassisId = Number(preset.chassis_id);
    if (chassisId < 0x91 || chassisId > 0x98
        || firstPresetByChassis.has(chassisId)) continue;
    firstPresetByChassis.set(chassisId, preset);
  }
  const appearances = [];
  const actions = [];
  for (let chassisId = 0x91; chassisId <= 0x98; chassisId += 1) {
    const actionId = chassisId - 0x90;
    const resource = actionById.get(actionId);
    if (!resource?.available) continue;
    const preset = firstPresetByChassis.get(chassisId) || null;
    const number = actionId;
    const hint = String(preset?.chassis_name_hint || `底盘 ${chassisId.toString(16)}`);
    const action = {
      key: `battle-action:${actionId.toString(16).toUpperCase().padStart(2, "0")}`,
      id: actionId,
      kind: "battle-action",
      label: `${number} 号战车 · ${hint}`,
      partyRoleId: null,
      partyRoleSlug: `vehicle-${number}`,
      actorKind: "vehicle",
      pose: "battle",
      poseLabel: "战斗车体",
      poseOrder: 0,
      defaultForPartyRole: true,
      chassisId,
      chassisIdHex: `0x${chassisId.toString(16).toUpperCase()}`,
      preset,
      resource,
      resourceUid: `battle-action:${actionId.toString(16).toUpperCase().padStart(2, "0")}`,
    };
    actions.push(action);
    appearances.push({
      key: `battle-appearance:vehicle-${number}`,
      label: `${number} 号战车 · ${hint}`,
      kind: "vehicle",
      weaponKind: "tank",
      partyRoleId: null,
      partyRoleSlug: `vehicle-${number}`,
      chassisId,
      preset,
      actions: [action],
      defaultAction: "battle",
    });
  }
  return {appearances, actions};
}

/** 12 类战斗形象的共同目录：三名主角、NPC 狼和八辆载具。 */
function battleActorCatalog(project) {
  const metasprites = metaspriteAppearances(project);
  const vehicles = vehicleAppearances(project);
  const appearances = [...metasprites.appearances, ...vehicles.appearances]
    .sort((left, right) => {
      const leftGroup = left.kind === "vehicle" ? 1 : 0;
      const rightGroup = right.kind === "vehicle" ? 1 : 0;
      return leftGroup - rightGroup
        || Number(left.partyRoleId ?? left.chassisId)
          - Number(right.partyRoleId ?? right.chassisId);
    });
  const actions = [...metasprites.actions, ...vehicles.actions];
  return {
    appearances,
    appearanceByKey: new Map(appearances.map(item => [item.key, item])),
    actions,
    actionByKey: new Map(actions.map(item => [item.key, item])),
  };
}

function battleActorAppearance(catalog, key) {
  return catalog?.appearanceByKey?.get(String(key)) || null;
}


function battleActorAction(catalog, appearanceKey, actionKey) {
  const appearance = battleActorAppearance(catalog, appearanceKey);
  if (!appearance) return null;
  return appearance.actions.find(item => item.pose === String(actionKey))
    || appearance.actions.find(item => item.pose === appearance.defaultAction)
    || appearance.actions[0] || null;
}

/**
 * 把攻击脚本 opcode $10/$11 对当前 actor state 的增减投影回同一角色的
 * 真实 metasprite。人类战斗姿势在 ROM 中就是相邻编号；载具或没有相邻姿势的
 * 形象保持原动作，不伪造补间帧。
 */
function battleActorActionFromStateDelta(
  catalog,
  appearanceKey,
  actionKey,
  stateDelta = 0,
) {
  const appearance = battleActorAppearance(catalog, appearanceKey);
  const selected = battleActorAction(catalog, appearanceKey, actionKey);
  const delta = Number(stateDelta);
  if (!appearance || !selected || !Number.isInteger(delta) || delta === 0) {
    return selected;
  }
  const selectedId = Number(selected.id);
  if (!Number.isInteger(selectedId)) return selected;
  const targetId = (selectedId + delta) & 0xff;
  if (appearance.stateActions) {
    const action = appearance.stateActions.find(item => item.id === targetId);
    if (!action) throw new Error(`脚本姿势 metasprite ${targetId} 没有可预览资源`);
    return action;
  }
  return appearance.actions.find(item => Number(item.id) === targetId)
    || selected;
}

/**
 * 编辑器的攻击动作轨。底层每一项仍是原始 metasprite / battle action；这里仅按
 * 当前攻击的总帧数在现有姿势间切换，不制造一份新的图形资产。
 */
function battleActorActionAtFrame(
  catalog,
  appearanceKey,
  actionKey,
  frameIndex = null,
  frameCount = 0,
) {
  const appearance = battleActorAppearance(catalog, appearanceKey);
  const selected = battleActorAction(catalog, appearanceKey, actionKey);
  if (!appearance || !selected || frameIndex === null
      || appearance.actions.length < 2 || frameCount < 2) return selected;
  const idle = battleActorAction(
    catalog,
    appearanceKey,
    appearance.defaultAction,
  ) || selected;
  const sequence = selected.key === idle.key
    ? [idle, ...appearance.actions.filter(item => item.key !== idle.key), idle]
    : [idle, selected, selected, idle];
  const progress = Math.max(0, Math.min(1, Number(frameIndex) / (frameCount - 1)));
  return sequence[Math.min(
    sequence.length - 1,
    Math.floor(progress * sequence.length),
  )];
}

// @editor-module 战斗人物 / 狼 / 载具共用绘制器

async function battleActorSources() {
  return metaspriteContextSources(BATTLE_ACTOR_CHR_BANKS);
}

function gameAnchorOffsetFromSprites(sprites) {
  if (!sprites?.length) return {x: 0, y: 0};
  const left = Math.min(...sprites.map(item => Number(item.x)));
  const top = Math.min(...sprites.map(item => Number(item.y)));
  const right = Math.max(...sprites.map(item => Number(item.x) + 8));
  const bottom = Math.max(...sprites.map(item => Number(item.y) + 8));
  return {
    x: -(left + right) / 2,
    y: -(top + bottom) / 2 - 1,
  };
}

/** 返回将“组合器视觉中心”转为该图形游戏坐标锚点的偏移。 */
function battleActorGameAnchorOffset(sources, action) {
  if (!action) return {x: 0, y: 0};
  if (action.kind === "battle-action") {
    const sprites = battleActionPlacements(action.resource).map(
      ([, x, y]) => ({x, y}),
    );
    return gameAnchorOffsetFromSprites(sprites);
  }
  const objects = action.resource?.kind === "direct-frame"
    ? sources?.recipe?.directFrames : sources?.recipe?.genericObjects;
  const item = objects?.find(entry => entry.id === Number(action.id));
  return gameAnchorOffsetFromSprites(
    (item?.sprites || []).filter(sprite => !sprite.transparentTile),
  );
}

function battleActorImage(
  sources,
  action,
  {size = 96, scale = 1, background = null} = {},
) {
  if (!action) return null;
  if (action.kind === "battle-action") {
    const raster = createRaster(size, size, background);
    paintBattleAction(
      raster,
      action.resource,
      sources.tiles,
      sources.palettes,
      Math.floor(size / 2),
      Math.floor(size / 2),
      {scale},
    );
    return raster;
  }
  const objects = action.resource?.kind === "direct-frame"
    ? sources.recipe.directFrames : sources.recipe.genericObjects;
  const item = objects.find(entry => entry.id === Number(action.id));
  return item ? metaspriteObjectImage(sources, item, {
    size,
    scale,
    background,
  }) : null;
}

// @editor-module 战车立绘与状态部件共用字段对象来源和光栅绘制。

function vehiclePortraitImage({kind = 'battle', sources, action,
  raster = null, parts = [], statusDocument = null, partArt = null, x = 0, y = 0},
{size = 64, scale = 1, background = null} = {}) {
  if (kind === 'battle') return battleActorImage(sources, action, {size, scale, background});
  if (kind !== 'status') throw new TypeError(`战车立绘类型无效：${kind}`);
  const image = raster || createRaster(size, size, background);
  paintVehicleStatusPartPixels(image, parts, statusDocument, {x, y, art: partArt});
  return image;
}

function vehicleStatusParts(document, chassisId, mask, stateValue) {
  const selection = document?.portrait_part_selection;
  const columns = selection?.equipped_columns_by_mask?.[mask];
  const stateCase = selection?.state_case_by_value?.[stateValue];
  if (!Array.isArray(columns) || !stateCase) {
    throw new Error("部件选择表不可用，或预览输入无效");
  }
  return columns.flatMap(column => {
    const rows = document.portrait_parts.filter(row =>
      row.chassis_id === chassisId && row.physical_column === column);
    if (rows.length !== 1) throw new Error(`缺少底盘 ${chassisId} 的物理列 ${column}`);
    const row = rows[0];
    const type = row.part_type_by_state_case[stateCase];
    if (type === undefined) throw new Error(`物理列 ${column} 缺少 ${stateCase}`);
    return type === null ? [] : [{...row, part_type: type,
      art_id: row.art_id_by_state_case?.[stateCase]}];
  });
}

function paintVehicleStatusPartPixels(image, parts, document, {x = 0, y = 0, art = null} = {}) {
  const byId = new Map((art || document.portrait_part_art).map(row => [row.id, row]));
  const order = document.portrait_part_selection.oam_column_order_by_frame_parity[0];
  for (const column of [...order].reverse()) {
    for (const part of parts.filter(row => row.physical_column === column)) {
      const source = byId.get(part.art_id);
      if (!source || source.pixel_indices.length !== source.width * source.height)
        throw new TypeError('战车部件图像字段缺失');
      const palette = [0, ...source.nontransparent_colors];
      for (let tileY = 0; tileY < source.height; tileY += 8) {
        for (let tileX = 0; tileX < source.width; tileX += 8) {
          const px = part.x + source.x_offset + tileX - x;
          const py = part.y + source.y_offset + tileY - y;
          if (px >= image.width || py >= image.height || px + 8 <= 0 || py + 8 <= 0) continue;
          const tile = new Uint8Array(64);
          for (let dy = 0; dy < 8; dy++) for (let dx = 0; dx < 8; dx++) {
            if (tileX + dx < source.width && tileY + dy < source.height
                && px + dx >= 0 && py + dy >= 0
                && px + dx < image.width && py + dy < image.height)
              tile[dy * 8 + dx] = source.pixel_indices[(tileY + dy) * source.width + tileX + dx];
          }
          paintChrTile(image.data, image.width, px, py, tile, palette, {background: null});
        }
      }
    }
  }
}

async function vehicleStatusPartArtForSelector(statusDocument, chassisId, spriteBank) {
  const rows = statusDocument?.portrait_part_art || [];
  const mine = rows.filter(row => Number(row.chassis_id) === Number(chassisId));
  const selector = Number(spriteBank);
  if (!Number.isInteger(selector) || !mine.length) return rows;
  const base = selector & 0xFE;
  const [palettes, actions, layouts, metasprites] = await Promise.all([
    db.getResourceDocument('sprite-palette'), db.getResourceDocument('battle-action'),
    db.getResourceDocument('battle-object-layout'), db.getResourceDocument('metasprite-record'),
  ]);
  const projected = projectBattleObjectOwners({battle_objects: {actions: actions.records.map(row => ({id: row.id}))}},
    actions, layouts, metasprites);
  const byAction = new Map(projected.battle_objects.actions.map(action => [action.id, action]));
  const banks = new Map();
  const patternOf = bank => {
    if (!banks.has(bank)) banks.set(bank, loadChrBankBytes(bank));
    return banks.get(bank);
  };
  const decoded = await Promise.all(mine.map(async row => {
    const action = actions.records.find(action => action.handle === row.action_reference.resource_id);
    const visual = byAction.get(action?.id);
    const values = visual?.tiles;
    if (!action || !visual?.available || values?.length !== visual.columns * visual.rows)
      throw new TypeError('战车部件动作与定长图块布局不符');
    const width = visual.width, height = visual.height;
    const pixels = Array(width * height).fill(0), tiles = [];
    for (const [index, value] of values.entries()) {
      if (value === 0) continue;
      if (value >= 128) throw new TypeError('战车部件图块超出已确认 CHR 上下文');
      const reference = {resource_id: 'shared-chr-bank', bank_id: base + Math.floor(value / 64),
        tile_id: value % 64};
      const tile = {x: index % action.columns * 8, y: Math.floor(index / action.columns) * 8,
        chr_reference: reference};
      tiles.push(tile);
      const pattern = await patternOf(reference.bank_id);
      const tilePixels = decodeChrTile(pattern, reference.tile_id);
      for (let y = 0; y < 8; y += 1) {
        for (let x = 0; x < 8; x += 1) {
          pixels[(tile.y + y) * width + tile.x + x] = tilePixels[y * 8 + x];
        }
      }
    }
    const palette = palettes.records.find(palette => palette.id === 0x12 + action.palette_id - 1);
    if (!palette || ![1, 2].includes(action.palette_id))
      throw new TypeError('战车部件调色板超出已确认状态上下文');
    return {...row, width, height, tiles,
      x_offset: -1 - visual.origin_x_quarter_tiles * 4,
      y_offset: -visual.origin_y_quarter_tiles * 4,
      layout_reference: {resource_id: visual.layout_reference},
      pixel_indices: pixels, nontransparent_colors: palette.fields.nontransparent_colors};
  }));
  const byId = new Map(decoded.map(row => [row.id, row]));
  return rows.map(row => byId.get(row.id) || row);
}

// @editor-module 战斗消息按本次参数写入阶段读取实体当前值。

const unavailable = reason => ({status: 'unavailable', reason});
const reference = node_id => ({resource_id: 'text-record', node_id});
const sameIdentity = (left, right, keys) => keys.every(key =>
  (typeof left?.[key] === 'string' && left[key].length > 0 || Number.isInteger(left?.[key]))
    && left[key] === right?.[key]);
const sameSubject = (bound, selected) => bound?.kind === selected?.kind
  && (selected?.kind === 'enemy' ? bound?.slot === selected.slot : bound?.id === selected?.id);

function recordClosure(catalog, roots) {
  const found = new Set();
  const pending = [...roots];
  while (pending.length) {
    const node = pending.pop();
    if (found.has(node)) continue;
    found.add(node);
    pending.push(...(catalog?.records?.[node]?.fixed_includes || [])
      .map(row => row.text_record_ref.node_id));
  }
  return [...found].sort();
}

function battleMessageStateSources(templates, interfaces) {
  const catalog = templates?.battle_message_runtime_parameters;
  const states = interfaces?.interfaces?.find(row => row.id === 'battle-messages')?.states || [];
  return states.map(state => {
    const bindings = uiTemplateBindings(templates).filter(row => row.state === state.id
      || row.state.startsWith(`${state.id}:`));
    const roots = [...new Set([
      ...(state.evidence?.records || []).map(row => typeof row === 'string' ? row : row.id),
      ...bindings.flatMap(binding => [
        ...(binding.fills || []).map(fill => fill.text_record_ref?.node_id),
        ...(binding.deferred_records || []),
      ])].filter(Boolean))].sort();
    const records = recordClosure(catalog, roots);
    return {state: state.id, roots, records,
      insertions: records.flatMap(node_id => (catalog?.records?.[node_id]?.insertions || [])
        .map(binding => ({text_record_ref: reference(node_id), ...binding,
          value_type: catalog.sources[binding.source]?.value_type,
          writers: Object.entries(catalog.current_value_contract?.writers || {})
            .filter(([, writer]) => writer.sources.includes(binding.source))
            .map(([id]) => id)})))};
  });
}

// 参数写入者由本次战斗调用方显式绑定，消息记录与界面状态不推断写入者。
function createBattleContextValues({catalog, readBattle, readSaveFields,
  readMonster, readItem} = {}) {
  const contract = catalog?.current_value_contract;
  if (!contract || typeof readBattle !== 'function') {
    throw new TypeError('缺少已发布的战斗当前值契约或本次战斗读取入口');
  }
  const tokens = new WeakMap();

  function actorName(battle, actor) {
    const fields = readSaveFields?.();
    if (!fields?.slotStatus(battle.save_slot)?.valid) return unavailable('本次战斗的存档槽不存在');
    if (!['role', 'vehicle'].includes(actor?.kind) || !Number.isInteger(actor.id)) {
      return unavailable('本次姓名写入缺少人物或战车绑定');
    }
    const objects = fields.all(`save.slot.${battle.save_slot}.${actor.kind}.`);
    const result = currentActorNameSource({saveSlot: battle.save_slot, actor, fieldObjects: objects});
    if (result.status !== 'available') return result;
    const name = objects.find(row => row.fieldId === result.field_id);
    const present = actor.kind === 'role'
      ? fields.find(`${name.fieldId.slice(0, -'.name_codes'.length)}.present`)?.value
      : fields.vehicleAcquired(battle.save_slot, actor.id);
    return present ? result : unavailable('本次姓名写入所选实体已删除');
  }

  function enemy(battle, selected) {
    if (selected?.kind !== 'enemy' || !Number.isInteger(selected.slot)
        || selected.slot < 0 || selected.slot >= contract.enemy_groups.instance_slots) return null;
    const instance = battle.enemy_instances?.[selected.slot];
    const group = battle.enemy_groups?.[instance?.group];
    if (!instance || instance.present !== true || !Number.isInteger(instance.group)
        || instance.group < 0 || instance.group >= contract.enemy_groups.group_slots || !group) return null;
    const monster = readMonster?.(instance.monster_id);
    return monster && monster.id === instance.monster_id ? {instance, group, monster} : null;
  }

  function monsterName(monster) {
    const name = monster?.name_reference;
    return name?.mapping_status === 'confirmed' && typeof name.node_id === 'string'
      ? {status: 'available', value: reference(name.node_id)}
      : unavailable('本次怪物缺少已确认的名称文本引用');
  }

  function currentBattle(identity) {
    const battle = readBattle();
    return battle?.origin === contract.battle_origin
      && sameIdentity(identity, battle.identity, contract.identity_fields) ? battle : null;
  }

  function forMessage({state, text_record_ref, identity, parameters} = {}) {
    const node = text_record_ref?.resource_id === 'text-record' ? text_record_ref.node_id : null;
    const token = Object.freeze({state, text_record_ref, identity: Object.freeze({...identity})});
    tokens.set(token, {state, node, identity: token.identity,
      declared: contract.message_state_roots?.[state]?.includes(node) === true,
      records: new Set(recordClosure(catalog, node ? [node] : [])),
      parameters: structuredClone(parameters || {})});
    return token;
  }

  function resolveRuntimeParameter(request) {
    const message = tokens.get(request?.invocation);
    const battle = message && currentBattle(message.identity);
    if (!battle || !message.declared) return unavailable('消息不属于本次战斗、行动、目标迭代或已发布状态');
    if (battle.state !== message.state || battle.text_record_ref?.node_id !== message.node
        || !message.records.has(request.text_record_ref?.node_id)) {
      return unavailable('参数不属于本次消息状态或文本引用闭包');
    }
    const insertion = catalog.records[request.text_record_ref.node_id]?.insertions?.find(row =>
      row.command_index === request.command_index && row.source === request.source);
    const parameter = message.parameters[request.source];
    const writer = contract.writers[parameter?.writer];
    if (request.text_record_ref.resource_id !== 'text-record' || !insertion || !writer
        || !writer.sources.includes(request.source)
        || parameter.phase !== contract.parameter_phase
        || !sameIdentity(parameter.identity, message.identity, contract.identity_fields)) {
      return unavailable('本次插入缺少匹配的参数写入阶段');
    }
    const selected = parameter.subject === 'actor' ? battle.actor
      : parameter.subject === 'target' ? battle.target : null;
    if (!writer.subjects.includes(parameter.subject)) return unavailable('参数写入者与所选实体类别不符');
    if (selected && !sameSubject(parameter.subject_binding, selected)) {
      return unavailable('参数写入阶段绑定的是另一实体');
    }
    if (parameter.writer === 'save-name') return actorName(battle, selected);
    if (parameter.writer === 'enemy-context') {
      const selectedEnemy = enemy(battle, selected);
      if (!selectedEnemy) return unavailable('本次敌方实体已删除或缺少敌群与怪物当前值');
      if (parameter.subject_binding?.group !== selectedEnemy.instance.group
          || parameter.subject_binding.monster_id !== selectedEnemy.instance.monster_id) {
        return unavailable('本次敌方实体的敌群或怪物绑定已改变');
      }
      if (catalog.sources[request.source].value_type === 'text-record-ref') {
        return monsterName(selectedEnemy.monster);
      }
      const snapshot = parameter.population_snapshot;
      if (!Number.isInteger(snapshot) || snapshot < 0 || snapshot > 255) {
        return unavailable('本次目标绑定缺少命名数量快照');
      }
      if (snapshot < contract.enemy_groups.suffix_minimum_population) return {status: 'empty'};
      const value = parameter.suffix_source;
      try {
        if (!value?.raw_hex || value.terminator !== contract.enemy_groups.suffix_terminator) {
          return unavailable('本次目标绑定缺少不透明的实例后缀文字源');
        }
        fixedRuntimeTextScriptHex(value);
        return {status: 'available', value};
      } catch {
        return unavailable('本次目标绑定的实例后缀文字源无效');
      }
    }
    if (parameter.writer === 'item-reference') {
      if (parameter.subject_binding !== battle.item) return unavailable('本次参数绑定的是另一物品');
      const item = readItem?.(battle.item);
      const node = item?.id === battle.item ? itemNameRecordId(item) : null;
      return node ? {status: 'available', value: reference(node)}
        : unavailable('本次物品已删除或缺少名称文本引用');
    }
    if (parameter.writer === 'group-reference') {
      if (parameter.subject_binding !== battle.changed_group) return unavailable('本次参数绑定的是另一变更敌群');
      const group = battle.enemy_groups?.[battle.changed_group];
      const monster = group && readMonster?.(group.monster_id);
      return group && Number.isInteger(group.population) && group.population > 0
        && monster?.id === group.monster_id ? monsterName(monster) : unavailable('本次变更敌群不存在');
    }
    if (parameter.writer === 'quantity-result') {
      const target = battle.target;
      const exists = target?.kind === 'enemy' ? enemy(battle, target)
        : actorName(battle, target).status === 'available';
      if (!exists || !sameSubject(parameter.subject_binding, target)
          || (target.kind === 'enemy' && (parameter.subject_binding.group !== exists.instance.group
            || parameter.subject_binding.monster_id !== exists.instance.monster_id))) {
        return unavailable('本次数值写入的目标已删除或绑定已改变');
      }
      const result = battle.quantity;
      return result?.origin === contract.quantity_origin
        && sameIdentity(result.identity, message.identity, contract.identity_fields)
        && result.text_record_ref?.resource_id === 'text-record'
        && result.text_record_ref.node_id === request.text_record_ref.node_id
        && result.command_index === request.command_index
        && result.phase === contract.quantity_phase
        && Number.isInteger(result.value) && result.value >= 0 && result.value <= 65535
        ? {status: 'available', value: result.value}
        : unavailable('本次插入缺少同阶段逆向公式的结算当前值');
    }
    return unavailable('本次参数写入者尚未实现');
  }

  function targetChoices(identity) {
    const battle = currentBattle(identity);
    if (!battle) return unavailable('缺少本次战斗的目标选择现场');
    const groups = Array.from({length: contract.enemy_groups.group_slots}, (_, index) => {
      const group = battle.enemy_groups?.[index];
      if (!group || !Number.isInteger(group.population) || group.population <= 0) return null;
      const monster = readMonster?.(group.monster_id);
      const name = monster?.id === group.monster_id && monsterName(monster);
      return name?.status === 'available' ? {group: index, monster_id: group.monster_id,
        population: group.population, text_record_ref: name.value} : null;
    }).filter(Boolean);
    const instances = Array.from({length: contract.enemy_groups.instance_slots}, (_, slot) => {
      const selected = enemy(battle, {kind: 'enemy', slot});
      const group = groups.find(row => row.group === selected?.instance.group);
      const name = selected && monsterName(selected.monster);
      return selected?.instance.targetable === true && group && name.status === 'available'
        ? {slot, group: group.group, text_record_ref: name.value} : null;
    }).filter(Boolean);
    return {status: 'available', groups, instances};
  }

  return {forMessage, resolveRuntimeParameter, targetChoices};
}

function battleContextTextSlot(slot, context, message) {
  return {...slot, invocation: context.forMessage(message),
    resolveRuntimeParameter: context.resolveRuntimeParameter};
}

// @editor-module 载具 preset 的用途视图：分组、候选、显示名与出租列表行绑定。

/**
 * 一个用途视图的 preset id 清单。`vehicles` 不给时取当前项目：视图的 id 权威在
 * 发布文档的 `views`，读它的地方只有这一处。
 */
function presetIdsOfView(viewId, vehicles = state.project?.game_data?.vehicles) {
  return (vehicles?.views?.[viewId]?.preset_ids || []).map(Number);
}

/**
 * 十八条 preset 是载具的唯一出处；玩家载具（`$00-$07`）与出租车型（`$08-$11`）
 * 都只是它的用途视图，各自持有一串 preset_ids。视图不装 preset 本体，
 * 所以这里按 id 引用现取，不做副本。
 */
function presetsOfView(viewId, vehicles = state.project?.game_data?.vehicles) {
  const presets = vehicles?.presets || [];
  const wanted = new Set(presetIdsOfView(viewId, vehicles));
  return presets.filter(preset => wanted.has(Number(preset.preset_id)));
}

/** 出租车型视图的 preset。 */
function rentalPresets() {
  return presetsOfView("rental");
}

const VEHICLE_PRESET_GROUPS = Object.freeze(["player", "rental"]);

function vehiclePresetChoices(
  allowedGroups = VEHICLE_PRESET_GROUPS,
  vehicles = state.project?.game_data?.vehicles,
) {
  const allowed = new Set(allowedGroups);
  return VEHICLE_PRESET_GROUPS.filter(group => allowed.has(group)).flatMap(group => {
    const label = String(vehicles?.views?.[group]?.label
      || (group === "rental" ? "出租车" : "玩家战车"));
    return presetsOfView(group, vehicles).map(preset => ({preset, group, groupLabel: label}));
  });
}

/**
 * 底盘名按 chassis_id 运行时解析。preset 里的 `chassis_name` 是提取期快照：
 * 改了字符映射后服务端只把当前文字投影到 items 的 records 上，这份副本不会跟着变。
 */
function chassisName(preset) {
  if (typeof preset?.chassisName === "string") return preset.chassisName;
  return resourceLabel(
    recordUid("item", preset?.chassis_id),
    preset?.chassis_name_hint || "未命名底盘",
  );
}

/**
 * 出租名是发布数据里的只读派生字段：出租例程按 preset ID 推出名称码，ROM 里没有
 * 逐条名字表，所以前端不另存一份，也不按数值现猜。读不到就退回底盘名。
 */
function rentalName(preset) {
  if (preset?.rentalName !== undefined) return preset.rentalName;
  const name = preset?.rental_name?.list_label || preset?.rental_name?.value;
  return typeof name === "string" && name ? name : null;
}

/** 出租战车显示出租名，玩家战车仍显示底盘名。 */
function vehicleName(preset) {
  return rentalName(preset) || chassisName(preset);
}

function presetNumber(field) {
  if (field === null || field === undefined) return "—";
  if (typeof field === "number") return String(field);
  if (typeof field.value === "number") return String(field.value);
  if (typeof field.tons === "number") return `${field.tons} t`;
  return "—";
}

/**
 * 出租车型的候选项与通用载具候选项使用同一个显示名入口。
 */
function rentalPresetEntries() {
  return vehiclePresetChoices(["rental"]).map(({preset}) => vehiclePresetEntry(preset));
}

/** 单个 preset 的候选项；出租车显示出租名，玩家战车显示底盘名。 */
function vehiclePresetEntry(preset, group = presetIdsOfView("rental")
  .includes(Number(preset?.preset_id)) ? "rental" : "player") {
  const name = group === "rental" ? rentalName(preset) : null;
  const defense = `防御 ${presetNumber(preset.defense)}`;
  return {
    value: Number(preset.preset_id),
    label: name || chassisName(preset),
    description: name ? `底盘 ${chassisName(preset)} · ${defense}` : defense,
    meta: `预设 ${Number(preset.preset_id)}`,
  };
}


/**
 * 出租列表逐行记录 `record:02:075` 需要的运行时绑定：名称码字形脚本、底盘名文本
 * 记录、初始 SP。三项里任一项读不到发布数据就返回 null——调用方不得改用别的记录凑合。
 */
function rentalListRowSources(project, presetId) {
  const preset = (project?.game_data?.vehicles?.presets || [])
    .find(item => Number(item.preset_id) === Number(presetId));
  if (!preset) return null;
  const nameCode = String(preset.rental_name?.name_code_hex || "")
    .replace(/^0x/iu, "");
  const chassis = (project?.game_data?.items?.records || [])
    .find(item => Number(item.id) === Number(preset.chassis_id));
  const chassisNameRecord = itemNameRecordId(chassis);
  const initialSp = Number(preset.initial_sp?.value);
  if (!nameCode || !chassisNameRecord || !Number.isFinite(initialSp)) return null;
  return {
    nameCodeScriptHex: nameCode,
    chassisNameRecord,
    initialSp,
  };
}

// @editor-module 设施配置摘要只使用当前字段值与已发布的槽位语义。

const hex = value => Number(value).toString(16).toUpperCase().padStart(2, '0');

async function facilityConfigurationSummaryContext() {
  const [items, shells, vehicles, codeValues] = await Promise.all([
    db.getResourceDocument('item-entry'),
    db.getResourceDocument('shell-record'),
    db.getResourceDocument('vehicle-preset'),
    facilityRuntimeCodeValues(['inn-price-37', 'inn-price-38', 'inn-price-39']),
  ]);
  return {items, shells, vehicles, innPrices: Object.fromEntries([37, 38, 39].map(value => {
    const price = items.equipment_editor.numeric_codes.find(row =>
      row.raw_code === codeValues[`inn-price-${value}`]);
    return [value, price?.available && Number.isSafeInteger(price.value) ? price.value & 0xffff : null];
  }))};
}

function valueName(entry, value, namespace, context) {
  if (namespace === 'item') {
    const item = (context.items || db.peekResourceDocument('item-entry'))?.records.find(row => Number(row.id) === value);
    return currentTextReference(itemNameRecordId(item)).label || recordUid('item-entry', value);
  }
  if (namespace === 'shell') {
    const shell = (context.shells || db.peekResourceDocument('shell-record'))?.records.find(row => Number(row.id) === value);
    const record = shell?.name_text_record_id != null && shell?.name_text_region
      ? textRecordNodeId(Number.parseInt(shell.name_text_region, 16), shell.name_text_record_id) : null;
    return currentTextReference(record).label || recordUid('shell-record', value);
  }
  if (namespace === 'vehicle-preset') {
    const preset = (context.vehicles || db.peekResourceDocument('vehicle-preset'))?.presets.find(row => Number(row.preset_id) === value);
    return preset ? vehicleName(preset) : recordUid('vehicle-preset', value);
  }
  const good = entry.value_namespace?.goods?.find(row => Number(row.value) === value);
  const name = good ? currentTextReference(good.text_record || good.resource_uid).label : hex(value);
  const price = context.innPrices?.[value];
  return Number(entry.family_id) === 6 && Number.isInteger(price) ? `${name} ${price}G/人` : name;
}

function facilityConfigurationSummary(entry, values = entry.values || [], context = entry.summaryContext || {}) {
  const family = Number(entry.family_id);
  if (family === 15) return `楼层 ${values.slice().reverse().slice(0, 3).join('、')}${values.length > 3 ? `…（${values.length} 层）` : ''}`;
  if (entry.value_namespace?.namespace === 'unknown')
    return `数值 ${values.slice(-4).map(value => hex(value)).join('、')}`;
  const slots = entry.value_namespace?.slot_schema?.slots;
  const names = values.flatMap((value, index) => {
    const slot = slots?.find(row => Number(row.slot) === index);
    if (slots && slot?.role !== 'product') return [];
    return [valueName(entry, Number(value), slot?.namespace || entry.value_namespace?.namespace, context)];
  });
  return `${names.slice(0, 3).join('、')}${names.length > 3 ? `…（${names.length} 项）` : ''}`;
}

function facilityConfigurationLabel(entry, values = entry.values, recordId = entry.id, {showHandle = true} = {}) {
  const summary = facilityConfigurationSummary(entry, values);
  const handle = `application-config-instance:${hex(Number(entry.family_id))}:${hex(Number(recordId))}`;
  return showHandle ? summary ? `${summary} · ${handle}` : handle : `${summary || '配置'} · ${Number(recordId) + 1}`;
}

export { BATTLE_ACTOR_CHR_BANKS, BATTLE_ACTOR_CHR_PATTERN_PROFILES, VEHICLE_PRESET_GROUPS, battleActorAction, battleActorActionAtFrame, battleActorActionFromStateDelta, battleActorCatalog, battleActorGameAnchorOffset, battleActorImage, battleActorMetaspriteChoices, battleActorSources, battleContextTextSlot, battleMessageStateSources, chassisName, createBattleContextValues, facilityConfigurationLabel, facilityConfigurationSummary, facilityConfigurationSummaryContext, presetsOfView, rentalListRowSources, rentalName, rentalPresetEntries, rentalPresets, vehicleName, vehiclePortraitImage, vehiclePresetChoices, vehiclePresetEntry, vehicleStatusPartArtForSelector, vehicleStatusParts };
