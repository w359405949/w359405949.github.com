import { clearAutoSaveErrorsOf, hex, CHARACTER_ROLE_FIELDS, partyAliveActorType, characterRoleDraftError, db, VISUAL_ACTORS_RESOURCE_ID, equipmentColumnState, fixedRuntimeTextBytes, decodeFixedRuntimeText, PARTY_ALIVE_ACTOR_TYPES_COMPONENT_ID, setEquipmentColumnState, HUMAN_CATEGORIES, HUMAN_EQUIPMENT_CATEGORIES, trackAutoSavePreparation, equipmentNamedStates } from './battle-result-script-runtime-B_EClFew.js';
import { editorLog, partyBattleMetaspriteId, VISUAL_METASPRITES_RESOURCE_ID, BATTLE_ACTOR_SELECTOR_COMPONENT_ID, canonicalJsonEqual, applyJsonChanges } from './visual-metasprites-DJP54-bV.js';
import { fixedTextEditorMarkup, bindFixedTextEditors, dataTable, fixedTextRecordText, resetToOriginalButton, bindFieldResetToOriginalButtons, bindResetToOriginalButtons } from './pattern-pixel-editor-B8puYQ8A.js';
import { configureAnimatedResourcePicker, equipmentItemChoices } from './scene-elevators-N46oPTJC.js';
import { itemPickerFieldMarkup } from './attack-chr-tile-selector-DxIfuyLU.js';
import { blitRaster, attackAnimationState, recordUid, esc, resourceLabel, resourceByteRanges, resourceForwardReferenceCell, requireBrowserProjectRepository, $, paintMetaspriteCanvases, metaspriteCanvas } from './element-tree-DsgOBeTK.js';
import { reconcileFieldAddressRows, entityDetailPageMarkup, entityDetailSection, entityDetailPanel, entityDetailEquipmentMarkup, entityDetailFieldTableMarkup, entityAddressFields, mountFieldObjectField, mountFieldObjectChoice, mountFieldObjectBit, mountFieldObjectText, bindFieldObjectPicker } from './rectangle-preset-controls-vTa_haKM.js';
import { characterSlotShape, draftEquipmentMask, ensureBattleSceneData } from './overview-CxFLx7O1.js';
import { render } from './ui-editor-nodes-CtPdwTyu.js';
import { loadEntityCatalog, entityFacetFields } from './vehicle-field-session-CBRi3Az7.js';
import { recordPage, fields } from './record-BUqGpJTU.js';
import { ACTOR_MOTION_DIRECTIONAL, actorSetSources, actorPreviewPoses, actorAtlasImage, actorAppearanceCatalogFromDocument, ACTOR_ENTRY_TYPE_SELECTOR, handleMarkup } from './preview-DMSrQMyk.js';
import { startNesFrameClock, state } from './emulator-DynsZsth.js';
import { battleActorSources, battleActorImage, battleActorMetaspriteChoices, battleActorActionFromStateDelta, BATTLE_ACTOR_CHR_BANKS } from './configuration-summary-NWu3_nCt.js';
import { battleScenePreviewCatalog, battleScenePreviewForFormation, battleSceneActiveEnemySlots, normalizeBattleScenePreview, resolveBattleSceneAttack } from './battle-actors-B548R92n.js';
import { actorAppearanceCandidateLabel, hydrateStoryActorVisuals, actorPickerPreview } from './actor-appearance-C7XjeDLZ.js';
import { battleSceneComposerCanvas } from './battle-scene-composer-2IiON3Cb.js';
import { prepareSaveBuildFieldObjects } from './prg-loaders-BmwiQmdC.js';
import { refreshMessageText, playBattleSceneComposerAttack, paintBattleSceneComposerCanvas } from './battle-simulation-player-ZYN9IgYB.js';
import { currentFieldObject } from './sram-CuBZYYNn.js';

// @editor-module 整记录 Original 范围由字段对象切面声明，按字段身份删 Working。

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

async function resetRecordFieldObjects(database, kind, key, {
  viewId = null, project = null, expectedVersion = undefined,
} = {}) {
  const scope = declaration(kind, key, viewId, project);
  const fields = await recordResetFields(database, kind, key, {viewId, project});
  await database.writeFields(fields.map(field => ({field, reset: true})),
    {expectedVersion});
  clearAutoSaveErrorsOf([key, scope.resourceId, ...fields]);
  return database.readResource(scope.resourceId);
}

// @editor-module 人物详情的独立动图。取帧与像素均交给已有资源渲染器。

function framePainter(canvas, rasters) {
  blitRaster(canvas, rasters[0]);
  const context = canvas.getContext("2d");
  const images = new Map(rasters.map(raster => [raster,
    new ImageData(raster.data, raster.width, raster.height),
  ]));
  // 固定画布大小，只更新像素；每帧重设 width/height 会反复清空画布并触发 DOM 变更。
  return index => context.putImageData(images.get(rasters[index]), 0, 0);
}

/** 四向各一个画布；非四向资源如实显示其已发布的运动类别。 */
async function paintCharacterWalkStrip(root, {pair, appearance}) {
  if (!root) return;
  if (!appearance || pair === null) {
    root.replaceChildren();
    return;
  }
  const directional = appearance.motionKind === ACTOR_MOTION_DIRECTIONAL;
  const directions = directional
    ? [["up", "上"], ["down", "下"], ["left", "左"], ["right", "右"]]
    : [[null, "当前形象"]];
  const sources = await actorSetSources(pair);
  if (!root.isConnected) return;
  root.dataset.characterWalkMotion = appearance.motionResourceId;
  root.replaceChildren();
  if (!directional) {
    const message = document.createElement("p");
    message.textContent = `${appearance.resourceId} · ${appearance.motionLabel}`;
    root.append(message);
  }
  const strip = document.createElement("div");
  strip.className = "character-walk-strip";
  root.append(strip);
  const entries = directions.map(([direction, label]) => {
    const card = document.createElement("figure");
    const canvas = document.createElement("canvas");
    canvas.dataset.characterWalkDirection = direction || "none";
    canvas.setAttribute("aria-label", `${label} · ${appearance.resourceId}`);
    const caption = document.createElement("figcaption");
    caption.textContent = label;
    card.append(canvas, caption);
    strip.append(card);
    const poses = directional
      ? actorPreviewPoses(appearance).filter(pose => pose.direction === direction)
      : actorPreviewPoses(appearance);
    const images = poses.map(pose => actorAtlasImage(sources, [pose], 3, pose.palette));
    canvas.dataset.characterWalkFrames = poses.map(pose => pose.frame).join(",");
    const draw = framePainter(canvas, images);
    draw(0);
    return {draw, count: images.length};
  });
  // 这是编辑器的匀速循环试听节拍，不声称是地图移动速度。
  const started = performance.now();
  let previous = 0;
  const tick = now => {
    if (!root.isConnected) return;
    const step = Math.max(0, Math.floor((now - started) / 240));
    if (step !== previous && !document.hidden) {
      for (const entry of entries) entry.draw(step % entry.count);
      previous = step;
    }
    requestAnimationFrame(tick);
  };
  if (entries.some(entry => entry.count > 1)) requestAnimationFrame(tick);
}

function poseSourceHandle(source) {
  return source.source.resource || recordUid("item", source.source.id);
}

/** 同一种只比较连续姿势/位置的变化顺序；停留帧数留在来源上，不参与分类。 */
function characterPoseCatalog(project, roleId, selectedId) {
  const catalog = battleScenePreviewCatalog(project);
  const appearance = catalog.normalAppearances.find(item => item.partyRoleId === roleId);
  const choices = battleActorMetaspriteChoices(project);
  const selected = choices.find(item => item.id === selectedId);
  const groupRole = selected?.resource.battle_pose ? selected.resource.party_role_id : null;
  const choicesByHandle = new Map(choices.filter(item => groupRole != null
    && item.resource.party_role_id === groupRole && item.resource.battle_pose)
    .map(item => [item.resourceUid, item]));
  const assets = project.visuals.weapon_effect_catalog.asset_catalog_data;
  const sections = [
    {kind: "attack", label: "攻击走法", sources: catalog.humanWeaponSources},
    {kind: "hit", label: "受击走法", sources: (assets.enemy_actions || []).map(action => ({
      source: action, visualCode: action.visual_code, visualAvailable: action.visual_code != null,
    }))},
  ];
  const animations = new Map();
  for (const section of sections) {
    const groups = new Map(), missing = new Map();
    for (const source of section.sources) {
      let animation;
      try {
        if (!source.visualAvailable) throw new Error("没有可解码视觉");
        if (!animations.has(source.visualCode)) {
          animations.set(source.visualCode, attackAnimationState(assets, source.visualCode));
        }
        animation = animations.get(source.visualCode);
        if (!animation?.frames.length) throw new Error("VM 没有返回姿势帧");
      } catch (error) {
        missing.set(poseSourceHandle(source), {source, reason: String(error.message || error)});
        continue;
      }
      const states = [];
      for (const frame of animation.frames) {
        // 与原战斗预览相同：我方攻击取 normal，敌方攻击的我方受击者取 alternate。
        const x = section.kind === "hit" ? frame.actorXDeltaAlternate : frame.actorXDeltaNormal;
        const last = states.at(-1);
        if (last?.state === frame.actorStateDelta && last.x === x) last.frames += 1;
        else states.push({state: frame.actorStateDelta, x, frames: 1});
      }
      if (!states.every(run => Number.isFinite(run.x))) {
        missing.set(poseSourceHandle(source), {source, reason: "共享 VM 未提供完整的位置帧"});
        continue;
      }
      const key = JSON.stringify(states.map(run => [run.state, run.x]));
      if (!groups.has(key)) {
        const entry = {key, sources: new Map(), runs: [], stateCount: states.length,
          frames: animation.frames.length, error: ""};
        try {
          if (!choicesByHandle.size) throw new Error("缺少这个人物的姿势分组");
          if (!appearance) throw new Error("没有此人物的战斗形象");
          entry.runs = states.map(run => {
            const action = battleActorActionFromStateDelta(
              catalog.actorCatalog, appearance.key, undefined, run.state,
            );
            const choice = choicesByHandle.get(action?.resourceUid);
            if (!choice?.available) throw new Error(`${action?.resourceUid || "脚本姿势"} 不在当前立绘的可绘制 battle_pose 分组内`);
            return {action: {...choice, key: choice.resourceUid, kind: "metasprite"},
              x: run.x, frames: run.frames};
          });
        } catch (error) {
          entry.error = String(error.message || error);
        }
        groups.set(key, entry);
      }
      groups.get(key).sources.set(poseSourceHandle(source), {source, states, frames: animation.frames.length});
    }
    section.groups = [...groups.values()].sort((a, b) => b.stateCount - a.stateCount);
    section.missing = [...missing.values()];
  }
  return {sections, selected, groupRole};
}

/** 各类平铺并原速循环播放其首个真实来源。 */
async function paintCharacterBattlePoses(root, {project, roleId, selectedId}) {
  if (!root) return;
  const {sections, selected, groupRole} = characterPoseCatalog(project, roleId, selectedId);
  const sources = await battleActorSources();
  if (!root.isConnected) return;
  root.replaceChildren();
  root.dataset.characterPoseCount = String(sections.reduce((sum, section) => sum + section.groups.length, 0));
  root.dataset.characterPoseMissing = String(sections.reduce((sum, section) => sum + section.missing.length, 0));
  root.dataset.characterPoseGroup = String(groupRole ?? "");

  if (groupRole == null) {
    const card = document.createElement("figure");
    card.className = "character-offgroup-pose";
    const caption = document.createElement("figcaption");
    caption.textContent = `当前战斗立绘 · ${selected?.resourceUid || "未选择"}`;
    card.append(caption);
    try {
      const action = selected && {...selected, key: selected.resourceUid, kind: "metasprite"};
      const raster = battleActorImage(sources, action, {size: 64, scale: 2, background: null});
      if (!raster) return;
      const canvas = document.createElement("canvas");
      canvas.dataset.characterOffgroupPose = selected.resourceUid;
      canvas.setAttribute("aria-label", caption.textContent);
      blitRaster(canvas, raster);
      card.append(canvas);
    } catch (error) {
      editorLog.error("预览", `操作失败：${error?.message || error}`, error);
      const message = document.createElement("p");
      message.className = "module-editor-error";
      message.textContent = `立绘预览失败：${error.message || error}`;
      card.append(message);
    }
    if (card.querySelector("canvas, .module-editor-error")) root.append(card);
  }

  for (const section of sections) {
    const {groups, kind} = section;
    const panel = document.createElement("section");
    panel.dataset.characterPoseKind = kind;
    panel.dataset.characterPoseCount = String(groups.length);
    const heading = document.createElement("h4");
    heading.textContent = section.label;
    panel.append(heading);
    root.append(panel);
    const strip = document.createElement("div");
    strip.className = `character-battle-pose-strip character-${kind}-gallery`;
    panel.append(strip);
    function drawEntry(entry) {
      if (entry.error) return;
      const card = document.createElement("figure");
      card.dataset.characterPoseSequence = entry.key;
      const caption = document.createElement("figcaption");
      caption.textContent = `走法 ${groups.indexOf(entry) + 1}`;
      card.append(caption);
      strip.append(card);
      const canvas = document.createElement("canvas");
      canvas.dataset.characterBattleLoop = "";
      canvas.setAttribute("aria-label", caption.textContent);
      card.append(canvas);
      try {
        const sprites = new Map();
        for (const run of entry.runs) {
          const raster = battleActorImage(sources, run.action, {size: 64, scale: 2, background: null});
          if (!raster) {card.remove(); return;}
          const sprite = document.createElement("canvas");
          blitRaster(sprite, raster);
          sprites.set(run.action.key, sprite);
        }
        const minX = Math.min(0, ...entry.runs.map(run => run.x));
        const maxX = Math.max(0, ...entry.runs.map(run => run.x));
        canvas.width = 64 + (maxX - minX) * 2;
        canvas.height = 64;
        const context = canvas.getContext("2d");
        const frames = entry.runs.flatMap(run => Array(run.frames).fill(run));
        let paintedFrames = 0;
        const draw = index => {
            const run = frames[index];
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(sprites.get(run.action.key), (run.x - minX) * 2, 0);
            canvas.dataset.characterBattleFrame = String(index);
            canvas.dataset.characterBattleTick = String(++paintedFrames);
        };
        canvas.dataset.characterBattleFrames = String(frames.length);
        draw(0);
        startNesFrameClock({frameCount: frames.length, loop: true,
          shouldContinue: () => canvas.isConnected, onFrame: draw});
      } catch (error) {
        editorLog.error("预览", `操作失败：${error?.message || error}`, error);
        canvas.remove();
        const message = document.createElement("p");
        message.className = "module-editor-error";
        message.textContent = `动作预览失败：${error.message || error}`;
        card.append(message);
      }
    }
    if (groupRole != null) groups.forEach(drawEntry);
  }
}

function imagePickerCell({
  label, value, attribute, reason = "", unavailableLabel = "", disabled = false,
  showUnavailable = true,
}) {
  if (reason) return "";
  return `<animated-resource-picker class="image-column-picker"
    data-animated-resource-value="${esc(value ?? "")}" ${attribute}
    aria-label="${esc(label)}"${disabled ? " disabled" : ""}></animated-resource-picker>`;
}

function mountBattlePreviewStage(root, {
  kind, label, selection, preview, enemySlots, formationMarkup,
  scopeLabels, automaticScopeLabel,
}) {
  const enemyLabel = index => {
    const enemy = preview.enemies[index];
    return `E${index + 1} · G${enemy.groupIndex + 1} · ${resourceLabel(
      recordUid("monster", enemy.monsterId), `怪物 ${hex(enemy.monsterId, 2)}`,
    )}`;
  };
  const option = (value, name, selected) => `<option value="${esc(value)}"${
    String(value) === String(selected) ? " selected" : ""
  }>${esc(name)}</option>`;
  root.innerHTML = `<div class="${kind}-battle-scene" data-battle-scene-preview-host>
    <div class="${kind}-battle-scene-stage">
      ${battleSceneComposerCanvas({label})}
      ${formationMarkup(selection)}
      <small data-battle-scene-simulation-status data-battle-scene-status-errors-only aria-live="polite"></small>
      <div class="battle-preview-target-controls">
        <label>锚定目标<select data-battle-preview-target aria-label="锚定目标"${enemySlots.length ? "" : " disabled"}>
          ${enemySlots.length ? "" : option("", "—", "")}
          ${enemySlots.map(index => option(index, enemyLabel(index), preview.attack.enemyTarget)).join("")}
        </select></label>
        <label>预览范围<select data-battle-preview-scope aria-label="预览范围">
          ${option("auto", automaticScopeLabel, "auto")}
          ${Object.entries(scopeLabels).map(([key, name]) => option(key, name, "auto")).join("")}
        </select></label>
        <output data-battle-preview-targets></output>
      </div>
    </div>
  </div>`;
  root.dataset[`${kind}PreviewFormation`] = String(selection.formation.id);
  return root.querySelector("canvas[data-battle-scene-composer]");
}

function bindBattlePreviewControls(root, preview, paint) {
  const showError = error => {
    root.querySelector("[data-battle-scene-simulation-status]").textContent =
      String(error?.message || error);
  };
  root.addEventListener("change", event => {
    const control = event.target;
    if (control.matches("[data-battle-preview-target]")) {
      preview().attack.enemyTarget = Number(control.value);
    } else if (control.matches("[data-battle-preview-scope]")) {
      preview().attack.scope = control.value;
    } else return;
    void paint().catch(showError);
  });
  return showError;
}

function battlePreviewTargets(root, text) {
  root.querySelector("[data-battle-preview-targets]").textContent = text;
}

// @editor-module ROM 新游戏人物初值编辑

const characterFields = CHARACTER_ROLE_FIELDS;

const CHARACTER_FIELD_RESOURCE = "character-initial-record";
const CHARACTER_TEXT_RESOURCE = "fixed-text-slot";
const characterAttackScopeLabels = {single: "单体", group: "一组", all: "全体"};
const battleItemTextEditors = new WeakMap();
const characterInitialGoldHandle = `${CHARACTER_FIELD_RESOURCE}:initial-gold`;

// 人物项 → 实体句柄 + 切面：句柄格式与字段对象取自实体声明，本页不再自己拼。
// 一条人物初始记录同时承载属性与装备两个切面：整项读写取两个切面的并集，
// 单槽重置只走装备切面。
function characterSelectionTarget(itemId) {
  if (itemId === "initial-gold") return null;
  if (itemId === "name-initialization") return {target: "character", facets: ["name_candidates"]};
  if (itemId.startsWith("rom-role:")) {
    return {roleId: Number(itemId.slice("rom-role:".length)),
      facets: ["rom_attributes", "rom_loadout"]};
  }
  throw new Error(`未知人物字段项：${itemId}`);
}

// 同一字段实例被多个切面声明时只回一次。
async function characterFacetFields(target, facetIds) {
  const catalog = await loadEntityCatalog();
  const handle = typeof target === "number" ? catalog.handleFor("character", target) : target;
  const fields = new Set();
  for (const facetId of facetIds)
    for (const field of (await entityFacetFields(db, handle, facetId, {catalog})).fields) fields.add(field);
  return {handle, fields: [...fields]};
}

// 初始金币不在实体的定稿切面清单内，仍按字段对象自己的记录取。
async function characterSelectionFields(itemId, facetIds = null) {
  const target = characterSelectionTarget(itemId);
  if (!target) {
    const fields = await db.getFields(CHARACTER_FIELD_RESOURCE);
    return {fields: fields.filter(field => field.entityHandle === characterInitialGoldHandle)};
  }
  return characterFacetFields(target.roleId ?? target.target, facetIds ?? target.facets);
}

function characterRecordField(fields, fieldName) {
  const field = fields.find(candidate => candidate.fieldName === fieldName);
  if (!field) throw new Error(`character-initial-record 缺少人物字段 ${fieldName}`);
  return field;
}

function copyCharacterDraft(value) {
  return JSON.parse(JSON.stringify(value));
}

let characterImportBaseRepository = null;
let characterImportBaseRevision = null;
let characterImportBaseDraft = null;
let characterImportBasePromise = null;

function characterProjectRevision() {
  return state.browserProjectManifest?.active_original_revision_id ?? null;
}

function characterProjectSessionMatches(repository, revision) {
  return state.projectRepository === repository &&
    characterProjectRevision() === revision;
}

function assertCharacterProjectSession(repository, revision) {
  if (!characterProjectSessionMatches(repository, revision)) {
    throw new Error("项目会话已切换，请在当前人物页重试");
  }
}

function characterTextEncoding() {
  const encoding = state.project?.text_record_encoding;
  if (!encoding) {
    throw new Error("人物姓名需要文字基础资产；当前字符映射未载入");
  }
  return encoding;
}

function characterNameProjection(nameSource) {
  return decodeFixedRuntimeText(nameSource, characterTextEncoding());
}

function characterNameCellDraft(cell) {
  const draft = copyCharacterDraft(cell || {});
  draft.text = characterNameProjection(draft.source).text;
  return draft;
}

function characterNameInitializationDraft(value, textSlots = state.project?.game_data?.text_slots) {
  const source = copyCharacterDraft(value || {});
  const resolve = cell => {
    const reference = cell?.source;
    if (reference?.resource_id !== CHARACTER_TEXT_RESOURCE || !reference.slot_id) {
      throw new Error("人物姓名缺少文字槽引用");
    }
    const slot = textSlots?.slots?.[reference.slot_id];
    if (!slot) throw new Error(`文字槽缺少 ${reference.slot_id}`);
    return characterNameCellDraft({...cell, source: {...slot, ...reference}});
  };
  source.preset_sets = (source.preset_sets || []).map(preset => ({
    ...preset,
    trigger: resolve(preset.trigger),
    role_names: (preset.role_names || []).map(resolve),
  }));
  source.fallback_candidates = (source.fallback_candidates || []).map(pool => ({
    ...pool,
    records: (pool.records || []).map(resolve),
  }));
  return source;
}

function characterNameCells(initialization) {
  return [
    ...(initialization?.preset_sets || []).flatMap(preset => [
      preset.trigger,
      ...(preset.role_names || []),
    ]),
    ...(initialization?.fallback_candidates || []).flatMap(
      pool => pool.records || [],
    ),
  ];
}

function characterDraftNameResult(cell) {
  const text = String(cell.text ?? "");
  const current = characterNameProjection(cell.source);
  // 原 ROM 可能含尚未命名的字形。只要用户没动文字，就保留全部原始字节；
  // 编辑后才要求当前文字基础资产能完整编码，不能用方框覆盖未知内容。
  if (text === current.text) {
    return {
      ok: true,
      text,
      raw_hex: current.raw_hex,
      bytes: current.bytes,
      preserved: true,
    };
  }
  return fixedRuntimeTextBytes(
    text,
    cell.source,
    characterTextEncoding(),
  );
}

function normalizeCharacterDraftNames(draft) {
  for (const cell of characterNameCells(draft.name_initialization)) {
    // Some original four-byte cells intentionally start with a blank (for
    // example, the mechanic candidate " DOG").  Leading blanks are payload,
    // while blanks typed after the visible name are safe to normalize away.
    cell.text = String(cell.text ?? "").trimEnd();
    const result = characterDraftNameResult(cell);
    if (!result.ok) {
      const unsupported = result.unsupported?.length
        ? `：${result.unsupported.join(" ")}` : "";
      throw new Error(`${result.reason}${unsupported}`);
    }
    cell.source.raw_hex = result.raw_hex;
  }
  return draft;
}

function characterRoleDraft(role) {
  return {
    id: Number(role.id),
    role_label: String(role.name || role.slug || `人物 ${role.id}`),
    ...Object.fromEntries(characterFields.map(
      ([field]) => [field, Number(role[field])],
    )),
    equipment: (role.equipment || []).map(slot => Number(slot.item_id)),
    slot_flags: draftEquipmentMask(role.slot_flags),
    inventory: (role.inventory || []).map(slot => Number(slot.item_id)),
  };
}

function characterDraftFromDocument(document_, textSlots = state.project?.game_data?.text_slots) {
  return {
    template_sha256: "",
    initial_gold: Number(document_?.rom_initial?.gold?.value || 0),
    name_initialization: characterNameInitializationDraft(
      document_?.name_initialization, textSlots,
    ),
    roles: (document_?.rom_initial?.roles || [])
      .map(characterRoleDraft)
      .sort((left, right) => Number(left.id) - Number(right.id)),
  };
}

async function ensureCharacterImportBase() {
  const repository = requireBrowserProjectRepository(state);
  const revision = characterProjectRevision();
  if (characterImportBaseRepository !== repository ||
      characterImportBaseRevision !== revision) {
    characterImportBaseRepository = repository;
    characterImportBaseRevision = revision;
    characterImportBaseDraft = null;
    characterImportBasePromise = null;
  }
  if (characterImportBaseDraft) return characterImportBaseDraft;
  if (!characterImportBasePromise) {
    const request = (async () => {
      const [working, textWorking] = await Promise.all([
        repository.getWorking("character-initial-record"),
        repository.getWorking(CHARACTER_TEXT_RESOURCE),
      ]);
      const [original, textOriginal] = await Promise.all([
        working ? null : repository.getOriginal("character-initial-record"),
        textWorking ? null : repository.getOriginal(CHARACTER_TEXT_RESOURCE),
      ]);
      const value = working?.base || original?.value;
      const textValue = textWorking?.base || textOriginal?.value;
      if (!value?.document || !textValue?.document) {
        throw new Error("character-initial-record 缺少导入 original");
      }
      const draft = characterDraftFromDocument(value.document, textValue.document);
      assertCharacterProjectSession(repository, revision);
      if (characterImportBaseRepository !== repository ||
          characterImportBaseRevision !== revision) {
        throw new Error("人物 Original 请求已失效，请重试");
      }
      characterImportBaseDraft = draft;
      return draft;
    })();
    characterImportBasePromise = request;
    void request.finally(() => {
      if (characterImportBasePromise === request) {
        characterImportBasePromise = null;
      }
    }).catch(() => {});
  }
  return characterImportBasePromise;
}

function characterResetControl(itemId, label = "Reset") {
  return `<span class="original-reset-control" data-character-original-control="${esc(itemId)}">
    ${resetToOriginalButton(itemId, {
      title: "恢复这一项的导入 original；其他人物编辑会保留",
      disabled: characterEditorBusy(),
    })}
  </span>`;
}

function characterSelectionValue(draft, itemId) {
  if (!draft) return null;
  if (itemId === "initial-gold") return draft.initial_gold;
  if (itemId === "name-initialization") return draft.name_initialization;
  if (itemId.startsWith("rom-role:")) {
    const id = Number(itemId.slice("rom-role:".length));
    return draft.roles.find(role => Number(role.id) === id) || null;
  }
  return null;
}

function characterOriginalState(itemId) {
  if (!characterImportBaseDraft) return null;
  const base = characterSelectionValue(characterImportBaseDraft, itemId);
  const draft = characterSelectionValue(state.characterDraft, itemId);
  const persisted = characterSelectionValue(state.characterOriginal, itemId);
  return {
    draftDirty: !canonicalJsonEqual(draft, base),
    persistedDirty: !canonicalJsonEqual(persisted, base),
  };
}

function updateCharacterOriginalControls(root = document) {
  if (!characterImportBaseDraft || !root?.querySelectorAll) return;
  const busy = characterEditorBusy();
  for (const control of root.querySelectorAll("[data-character-original-control]")) {
    const itemId = control.dataset.characterOriginalControl;
    const status = characterOriginalState(itemId);
    if (!status) continue;
    control.classList.toggle("is-original-dirty", status.draftDirty);
    control.classList.toggle("is-persisted-dirty", status.persistedDirty);
    const button = control.querySelector("[data-reset-to-original]");
    if (button) {
      const dirty = status.draftDirty || status.persistedDirty;
      button.dataset.originalDirty = String(dirty);
      button.classList.toggle("dirty", dirty);
      button.disabled = busy || !dirty || button.dataset.resetPending === "true";
      button.title = dirty
        ? "恢复原值：只恢复这一项"
        : "恢复原值：当前值与原值一致";
    }
  }
  for (const row of root.querySelectorAll("tbody tr")) {
    const controls = [...row.querySelectorAll("[data-character-original-control]")];
    if (!controls.length) continue;
    row.classList.toggle("original-dirty", controls.some(control =>
      control.classList.contains("is-original-dirty") ||
      control.classList.contains("is-persisted-dirty")
    ));
  }
}

function characterDraftRole(roleId) {
  const draft = state.characterDraft?.roles?.find(
    role => Number(role.id) === Number(roleId),
  );
  if (!draft) throw new Error(`人物草稿缺少人物 ${roleId}`);
  return draft;
}

function characterDefaultNameCell(roleId, draft = state.characterDraft) {
  const preset = draft?.name_initialization?.preset_sets?.find(
    item => Number(item.id) === 0,
  );
  const cell = preset?.role_names?.find(
    item => Number(item.role_id) === Number(roleId),
  );
  if (!cell) throw new Error(`空输入姓名预设缺少人物 ${roleId}`);
  return cell;
}

function characterNameInitializationDocument(value) {
  const result = copyCharacterDraft(value || {});
  for (const cell of characterNameCells(result)) {
    cell.source = {resource_id: CHARACTER_TEXT_RESOURCE,
      slot_id: cell.source.slot_id};
    delete cell.text;
  }
  return result;
}

function applyCharacterRoleDraft(document_, edited) {
  if (!document_?.rom_initial?.gold ||
      !Array.isArray(document_.rom_initial.roles) ||
      !document_.name_initialization) {
    throw new Error("character-initial-record 文档结构不完整");
  }
  const roles = new Map(
    document_.rom_initial.roles.map(role => [Number(role.id), role]),
  );
  const role = roles.get(Number(edited.id));
  if (!role) throw new Error(`character-initial-record 缺少人物 ${edited.id}`);
  for (const [field] of characterFields) role[field] = edited[field];
  if (edited.slot_flags !== null) {
    role.slot_flags = edited.slot_flags;
    role.equipment_slot_flags = equipmentNamedStates(
      role.slot_flags, characterSlotShape(state.project), "equipment_slot",
    );
  }
  for (const kind of ["equipment", "inventory"]) {
    if (!Array.isArray(role[kind]) || role[kind].length !== edited[kind].length) {
      throw new Error(`人物 ${edited.id} 的 ${kind} 槽结构不完整`);
    }
    edited[kind].forEach((itemId, index) => {
      const slot = role[kind][index];
      slot.item_id = itemId;
      slot.item_id_hex = `0x${itemId.toString(16).toUpperCase().padStart(2, "0")}`;
      slot.empty = itemId === 0;
      slot.name_text_record_id = itemId;
    });
  }
}

function applyCharacterSelection(document_, itemId, value) {
  if (itemId === "initial-gold") {
    if (!document_?.rom_initial?.gold) {
      throw new Error("character-initial-record 缺少初始金钱");
    }
    document_.rom_initial.gold.value = value;
    return;
  }
  if (itemId.startsWith("rom-role:")) {
    applyCharacterRoleDraft(document_, value);
    return;
  }
  throw new Error(`未知人物写入项：${itemId}`);
}

function ensureCharacterDraft(data, roles) {
  if (state.characterDraft) return;
  state.characterDraft = characterDraftFromDocument(data.characters || {}, data.text_slots);
  state.characterDraft.template_sha256 =
    data.characters?.writeback_state?.current_sha256 || "";
  state.characterOriginal = copyCharacterDraft(state.characterDraft);
}

function characterNameInitializationError(initialization) {
  try {
    const cells = characterNameCells(initialization);
    if (cells.length !== 42) return "新游戏姓名初始化表结构不完整";
    for (const cell of cells) {
      const result = characterDraftNameResult(cell);
      if (!result.ok) {
        const unsupported = result.unsupported?.length
          ? `：${result.unsupported.join(" ")}` : "";
        return `${result.reason}${unsupported}`;
      }
    }
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  return null;
}


function characterSelectionDraftError(itemId) {
  const draft = state.characterDraft;
  if (!draft) return "人物记录不完整，请刷新页面";
  if (itemId === "initial-gold") {
    return Number.isInteger(draft.initial_gold) && draft.initial_gold >= 0
        && draft.initial_gold <= 16777215
      ? null : "初始金钱必须是 0–16777215 的整数";
  }
  if (itemId === "name-initialization") {
    return characterNameInitializationError(draft.name_initialization);
  }
  if (itemId.startsWith("rom-role:")) {
    return characterRoleDraftError(characterDraftRole(
      Number(itemId.slice("rom-role:".length)),
    ));
  }
  return `未知人物写入项：${itemId}`;
}

function characterDraftError() {
  const draft = state.characterDraft;
  if (!draft || !Number.isInteger(draft.initial_gold) || draft.initial_gold < 0 || draft.initial_gold > 16777215) {
    return "初始金钱必须是 0–16777215 的整数";
  }
  const nameError = characterNameInitializationError(draft.name_initialization);
  if (nameError) return nameError;
  for (const role of draft.roles) {
    const error = characterRoleDraftError(role);
    if (error) return error;
  }
  return null;
}

function characterItemOptions(items, role, selected, inventory = false) {
  return equipmentItemChoices(items, {inventory}).map(item =>
    `<option data-reference-group="${esc(item.group)}" data-reference-group-label="${esc(item.groupLabel)}" value="${esc(item.value)}"${item.value === String(selected) ? " selected" : ""}>${esc(item.label)}</option>`
  ).join("");
}

function characterEquipmentCategory(itemId) {
  const item = state.project.game_data.items.records.find(item => Number(item.id) === Number(itemId));
  const category = item?.category;
  return Number(itemId) && category?.owner === "human" && category.id !== "human-item"
    ? category : null;
}

function setCharacterEquipped(role, index, equipped) {
  if (role.slot_flags === null) throw new Error("草稿未记录装备掩码；请重置整个人物恢复 Original");
  const category = characterEquipmentCategory(role.equipment[index]);
  role.slot_flags = setEquipmentColumnState(role.slot_flags, index, equipped && !!category);
  if (!equipped || !category) return;
  // 游戏按类别排他（19:0E9B–0EBF）；状态仍写入原有八栏的装备掩码。
  role.equipment.forEach((itemId, other) => {
    if (other !== index && characterEquipmentCategory(itemId)?.id === category.id) {
      role.slot_flags = setEquipmentColumnState(role.slot_flags, other, false);
    }
  });
}

function characterResourceButton(uid) {
  return handleMarkup(uid);
}

function characterRecordId(uid) {
  return handleMarkup(uid);
}

function characterActorSetPair() {
  const sets = state.project?.visuals?.actors?.sets || [];
  const pair = Number(
    sets.find(item => item.kind === "world-map-runtime")?.id
      ?? sets[0]?.id,
  );
  return Number.isInteger(pair) ? pair : null;
}

function characterVisualContext() {
  const actorDocument = db.peekDocument(VISUAL_ACTORS_RESOURCE_ID, null);
  const metaspriteDocument = db.peekDocument(
    VISUAL_METASPRITES_RESOURCE_ID,
    null,
  );
  let actorAppearances = [];
  let actorError = "";
  try {
    actorAppearances = actorDocument
      ? actorAppearanceCatalogFromDocument(actorDocument, {
          entryPoint: ACTOR_ENTRY_TYPE_SELECTOR,
        })
      : [];
  } catch (error) {
    actorError = String(error?.message || error);
  }
  return {
    actorDocument,
    actorPair: characterActorSetPair(),
    actorAppearances,
    actorError,
    actorById: new Map(actorAppearances.map(item => [Number(item.id), item])),
    metaspriteDocument,
    battleChoices: battleActorMetaspriteChoices(state.project),
  };
}

function actorAppearancePreview(context, appearance, label) {
  return actorPickerPreview({appearance, label,
    className: "character-actor-preview", canvasClassName: "character-actor-preview-canvas",
    placeholderClassName: "character-visual-placeholder"});
}

function battleAppearancePreview(metaspriteId, label) {
  if (!Number.isInteger(Number(metaspriteId))) {
    return `<span class="character-visual-placeholder">无预览</span>`;
  }
  return `<span class="character-battle-preview">${metaspriteCanvas({
    banks: BATTLE_ACTOR_CHR_BANKS,
    kind: "object",
    id: Number(metaspriteId),
    size: 48,
    className: "character-battle-preview-canvas",
    label,
  })}</span>`;
}

function characterActorAppearanceCell(role, context, {showUnavailable = true} = {}) {
  const actorType = partyAliveActorType(context.actorDocument, role.id);
  const name = characterDefaultNameCell(role.id).text || role.name;
  const reason = context.actorError || (!context.actorDocument
    ? "缺少 actor-visual 当前正文" : !context.actorAppearances.length
      ? "actor-visual 没有可用角色类型" : context.actorPair === null
        ? "缺少地图角色预览上下文" : "");
  return imagePickerCell({label: `${name}的非战斗形象`, value: actorType,
    attribute: `data-character-actor-appearance="${role.id}"`, reason,
    unavailableLabel: "角色形象不可用：", disabled: state.characterVisualSaving,
    showUnavailable: showUnavailable || Boolean(context.actorError)});
}

function characterBattleAppearanceCell(role, context, {showUnavailable = true} = {}) {
  const name = characterDefaultNameCell(role.id).text || role.name;
  let selected = null;
  try {
    selected = partyBattleMetaspriteId(context.metaspriteDocument, role.id);
  } catch {
    selected = null;
  }
  const reason = !context.metaspriteDocument ? "缺少 metasprite-record 当前正文"
    : !context.battleChoices.some(item => item.available)
      ? "metasprite-record 没有可预览的战斗立绘候选" : "";
  return imagePickerCell({label: `${name}的战斗立绘`, value: selected,
    attribute: `data-character-battle-appearance="${role.id}"`, reason,
    unavailableLabel: "战斗立绘不可用：", disabled: state.characterVisualSaving,
    showUnavailable});
}

function characterVisualComponentAddress(componentId) {
  const component = (state.project?.visuals?.writeback?.components || [])
    .find(item => item?.id === componentId);
  return component?.address || null;
}

function characterEditorStatus() {
  if (state.characterVisualSaving) return "正在保存人物视觉绑定…";
  if (state.characterBuilding) return "正在构建 ROM…";
  if (state.characterMessage) return state.characterMessage;
  const error = characterDraftError();
  if (error) return `无法保存：${error}`;
  return "";
}

function characterEditorBusy() {
  return Boolean(
    state.characterVisualSaving
      || state.characterBuilding,
  );
}

function characterTabs() {
  state.characterTab = "initial";
  return "";
}

function bindBattleItemRowText(host, canvas) {
  const editor = bindFixedTextEditors(host, {
    onSaved: () => refreshMessageText(canvas),
    onState: () => {
      // 同一道具可同时出现在初始栏和存档栏；只同步没有待存草稿的行。
      for (const row of document.querySelectorAll("[data-vehicle-loadout-preview]")) {
        const bound = battleItemTextEditors.get(row);
        if (!bound || bound.pending || bound.error) continue;
        for (const input of row.querySelectorAll("[data-fixed-text-input]")) {
          input.value = fixedTextRecordText(input.dataset.fixedTextRecord);
        }
      }
    },
  });
  battleItemTextEditors.set(host, editor);
}

function battleItemRowPreview(itemId, catalog, {showStatus = false, part = "all"} = {}) {
  const source = catalog.itemAttackChannel.sources.find(source => source.source.id === itemId);
  const reason = !itemId ? "未配置道具" : !source ? "未发布该道具的资料"
    : source.reason || `攻击视觉已发布${source.targetScopeNote ? `；${source.targetScopeNote}` : ""}`;
  const records = [...new Set((source?.source.item?.battle_use_effect?.text_outputs || [])
    .map(output => output.text_record?.node_id).filter(Boolean))];
  const textMarkup = records.map(recordId => fixedTextEditorMarkup({
    recordId, mode: "exact", compact: true, label: "道具战斗文本",
  })).join("");
  const actionMarkup = `<button class="button" type="button" data-battle-item-use${source ? "" : " disabled"}>使用</button>
    <small data-item-presentation-status="${esc(source?.presentationStatus || (itemId ? "unpublished" : "empty"))}"${showStatus ? "" : " hidden"}>${showStatus ? esc(reason) : ""}</small>`;
  if (part === "text") return textMarkup || "—";
  if (part === "action") return actionMarkup;
  return `${textMarkup}${actionMarkup}`;
}

function characterNameCellKey(cell, kind, ownerId) {
  if (kind === "trigger") return `preset:${ownerId}:trigger`;
  if (kind === "role") return `preset:${ownerId}:role:${cell.role_id}`;
  return `pool:${ownerId}:candidate:${cell.id}`;
}

function characterNameCellByKey(key, draft = state.characterDraft) {
  const parts = String(key || "").split(":");
  if (parts[0] === "preset") {
    const preset = draft?.name_initialization?.preset_sets?.find(
      item => Number(item.id) === Number(parts[1]),
    );
    if (parts[2] === "trigger") return preset?.trigger || null;
    if (parts[2] === "role") {
      return preset?.role_names?.find(
        item => Number(item.role_id) === Number(parts[3]),
      ) || null;
    }
  }
  if (parts[0] === "pool" && parts[2] === "candidate") {
    const pool = draft?.name_initialization?.fallback_candidates?.find(
      item => Number(item.role_id) === Number(parts[1]),
    );
    return pool?.records?.find(
      item => Number(item.id) === Number(parts[3]),
    ) || null;
  }
  return null;
}

function characterNameCellInput(cell, key, label) {
  if (!cell?.source) return "—";
  return `<span class="character-name-cell-input" data-character-text-object="${esc(key)}"
    data-character-text-label="${esc(label)}"
    title="${esc(cell.source.raw_hex)}"></span>`;
}

function renderCharacterNameInitialization(roles) {
  const initialization = state.characterDraft?.name_initialization;
  if (!initialization) return "";
  const roleById = new Map(roles.map(role => [Number(role.id), role]));
  const presetColumns = [
    {key: "id", label: "方案", mono: true, width: 72,
      cell: preset => `SET ${esc(preset.id)}`},
    {key: "trigger", label: "主角输入触发名", width: 180,
      cell: preset => characterNameCellInput(
        preset.trigger,
        characterNameCellKey(preset.trigger, "trigger", preset.id),
        `联动预设 ${preset.id} 的触发名`,
      )},
    ...[0, 1, 2].map(roleId => ({
      key: `role-${roleId}`,
      label: roleById.get(roleId)?.name || `人物 ${roleId}`,
      width: 180,
      cell: preset => {
        const cell = preset.role_names?.find(
          item => Number(item.role_id) === roleId,
        );
        return characterNameCellInput(
          cell,
          characterNameCellKey(cell, "role", preset.id),
          `联动预设 ${preset.id} 的${roleById.get(roleId)?.name || `人物 ${roleId}`}姓名`,
        );
      },
    })),
  ];
  const pools = new Map(
    (initialization.fallback_candidates || []).map(
      pool => [Number(pool.role_id), pool],
    ),
  );
  const candidateRows = Array.from(
    {length: Number(initialization.candidate_count_per_role || 0)},
    (_, id) => ({id}),
  );
  const candidateColumns = [
    {key: "id", label: "候选", mono: true, width: 72,
      cell: row => String(row.id).padStart(2, "0")},
    ...[1, 2].map(roleId => ({
      key: `pool-${roleId}`,
      label: `${roleById.get(roleId)?.name || `人物 ${roleId}`}后备池`,
      width: 220,
      cell: row => {
        const cell = pools.get(roleId)?.records?.find(
          item => Number(item.id) === row.id,
        );
        return characterNameCellInput(
          cell,
          characterNameCellKey(cell, "candidate", roleId),
          `${roleById.get(roleId)?.name || `人物 ${roleId}`}后备姓名 ${row.id}`,
        );
      },
    })),
  ];
  return `<section class="panel character-name-initialization">
    <header><div><p class="eyebrow">NEW GAME NAME INITIALIZATION</p>
      <h2>新游戏姓名初始化</h2></div>
      ${characterResetControl("name-initialization", "Original")}</header>
    <details open><summary>5 套联动预设</summary>${dataTable({
      columns: presetColumns,
      rows: initialization.preset_sets || [],
      rowId: preset => `name-preset:${preset.id}`,
    })}</details>
    <details><summary>机械师 / 女战士后备姓名（各 11 项）</summary>${dataTable({
      columns: candidateColumns,
      rows: candidateRows,
      rowId: row => `name-candidate:${row.id}`,
    })}</details>
  </section>`;
}

function renderCharacterData(data, roles) {
  ensureCharacterDraft(data);
  const error = characterDraftError();
  const status = characterEditorStatus();
  const tabs = characterTabs();
  const visualContext = characterVisualContext();
  const numberColumn = ([field, label]) => ({
    key: field,
    label,
    align: "right",
    width: field === "experience" ? 96 : 74,
    cell: role => `<span data-character-field-object="${esc(field)}"
      data-character-role="${role.id}"></span>`,
  });
  const slotColumn = (kind, index) => ({
    key: `${kind}-${index}`,
    label: `${kind === "equipment" ? "装备" : "道具"} ${index + 1}`,
    width: 150,
    cell: role => `<span data-character-choice-object="${kind}.${index}"
      data-character-role="${role.id}"></span>`,
  });
  const columns = [
    {key: "resource_id", label: "资源 ID", mono: true, sticky: true, width: 138,
      cell: role => characterRecordId(characterUid(role))},
    {key: "name", label: "默认姓名（空输入）", sticky: true, width: 172,
      cell: role => characterNameCellInput(characterDefaultNameCell(role.id),
        `preset:0:role:${role.id}`, "人物初始姓名")},
    {key: "field-appearance", label: "角色形象", width: 246,
      cell: role => characterActorAppearanceCell(role, visualContext),
      title: "非战斗状态下的角色形象"},
    {key: "battle-appearance", label: "战斗立绘", width: 246,
      cell: role => characterBattleAppearanceCell(role, visualContext)},
    {key: "present", label: "初始在队", width: 84,
      cell: role => role.present ? "是" : "后续入队"},
    ...characterFields.map(numberColumn),
    ...Array.from({length: 8}, (_, index) => slotColumn("equipment", index)),
    ...Array.from({length: 8}, (_, index) => slotColumn("inventory", index)),
    {key: "growth", label: "成长曲线", mono: true, width: 130,
      cell: role => esc([
        role.growth_profiles.strength, role.growth_profiles.intelligence,
        role.growth_profiles.speed, role.growth_profiles.vitality,
      ].join(" / ")),
      title: "力量 / 智力 / 速度 / 体力"},
    {key: "reset-original", label: "", title: "恢复原值", width: 36, reset: true,
      cell: role => characterResetControl(`rom-role:${Number(role.id)}`)},
  ];
  return `${tabs}<form id="character-editor">
      <section class="panel character-rom-scope">
      <header><div><p class="eyebrow">ROM INITIAL TEMPLATE</p><h2>新游戏初始属性</h2></div></header>
      <div class="data-editor-toolbar">
        <label class="toolbar-field"><span>初始金钱</span>
          <span class="inline-original-editor"><span data-character-field-object="initial_gold"></span>
            ${characterResetControl("initial-gold")}</span></label>
        <p id="character-save-state" class="${error ? "invalid" : ""}"
          ${status ? "" : "hidden"}>${esc(status)}</p>
      </div>
      ${dataTable({
        columns,
        rows: roles,
        rowId: role => role.id,
        recordRoute: role => `characters/${role.id}`,
      })}
      </section>
      ${renderCharacterNameInitialization(roles)}
    </form>`;
}

function characterUid(role) {
  return `character:${Number(role.id).toString(16).toUpperCase().padStart(2, "0")}`;
}

/** 详情主表显示字段值；物理范围由共用折叠区承载。 */
function renderCharacterRecord(data, roles, roleId) {
  const index = roles.findIndex(role => Number(role.id) === Number(roleId));
  if (index < 0) return null;
  ensureCharacterDraft(data);
  const role = roles[index];
  const uid = characterUid(role);
  resourceByteRanges(uid);
  const draft = characterDraftRole(role.id);
  const defaultNameCell = characterDefaultNameCell(role.id);
  const displayName = defaultNameCell.text || role.name;
  const roleNameSources = (
    state.characterDraft?.name_initialization?.preset_sets || []
  ).map(preset => ({
    label: `联动预设 ${preset.id}`,
    cell: preset.role_names?.find(
      item => Number(item.role_id) === Number(role.id),
    ),
  }));
  const fallbackPool = state.characterDraft?.name_initialization
    ?.fallback_candidates?.find(
      pool => Number(pool.role_id) === Number(role.id),
    );
  const visualContext = characterVisualContext();
  new Map((data.items?.records || []).map(item => [Number(item.id), item]));
  const fieldDefinitions = characterFields;
  const valueFor = row => {
    const fieldKey = row.fieldKey || row.key;
    if (characterFields.some(([key]) => key === fieldKey)) {
      return `<span data-character-field-object="${esc(fieldKey)}"
        data-character-role="${role.id}"></span>`;
    }
    const value = draft && Object.prototype.hasOwnProperty.call(draft, fieldKey)
      ? draft[fieldKey] : role[fieldKey];
    const label = typeof value === "boolean"
      ? (value ? "是" : "后续入队模板")
      : value ?? "—";
    return `<span class="character-detail-value"
      data-character-field-value="${esc(fieldKey)}"
      data-character-current-value="${esc(value ?? "")}">${esc(label)}</span>`;
  };
  const addressRows = reconcileFieldAddressRows({
    uid,
    fields: fieldDefinitions,
    valueFor,
  });
  const isLoadoutRow = row => ["initial-equipment", "initial-inventory"].includes(row.role);
  const addressTable = rows => entityDetailFieldTableMarkup({
    fields: entityAddressFields(rows),
    pageStatus: {
      selection: uid,
      dirty: "",
    },
  });
  const loadoutPanel = (kind, title) => {
    const slots = kind === "equipment" ? characterSlotShape(state.project) : null;
    const slotCount = slots ? slots.length : role[`${kind}_range`]?.length;
    if (!Number.isInteger(slotCount) || slotCount < 0) {
      throw new Error(`人物 ${role.id} 的${title}槽数未发布`);
    }
    const rows = Array.from({length: slotCount}, (_, index) => {
      const slotIndex = slots ? slots[index].equipment_slot : index;
      const category = kind === "equipment" ? characterEquipmentCategory(draft.equipment[slotIndex]) : null;
      return {
        id: `${kind}:${slotIndex}`, label: `携带 ${slotIndex + 1}`,
        attributes: `data-vehicle-loadout-row="${kind}:${slotIndex}"`,
        itemMarkup: `<span data-character-choice-object="${kind}.${slotIndex}"
          data-character-role="${role.id}" data-character-choice-detail="true"></span>`,
        stateMarkup: kind === "equipment" ? `<label class="character-slot-assignment">${esc(category?.name || "不装备")}
          <span data-character-bit-object="slot_flags" data-character-role="${role.id}"
            data-character-bit-index="${slotIndex}"></span></label>` : "",
        statusMarkup: kind === "equipment" ? `<output data-character-slot-status data-character-role="${role.id}"
          data-character-slot-index="${slotIndex}">${draft.slot_flags === null ? "未记录"
            : equipmentColumnState(draft.slot_flags, slotIndex) ? "已装备" : "未装备"}</output>`
          : `<span data-character-loadout-preview="inventory" data-character-preview-part="text"
            data-item-slot="${slotIndex}"></span>`,
        resetMarkup: `<span data-character-loadout-reset="${slotIndex}"
          data-character-role="${role.id}" data-character-loadout-kind="${kind}">${
            resetToOriginalButton(`${kind}.${slotIndex}`, {disabled: true})}</span>`,
        previewMarkup: `<span data-vehicle-loadout-preview data-character-loadout-preview="${kind}"
          data-character-preview-part="${kind === "inventory" ? "action" : "all"}"
          data-item-slot="${slotIndex}"></span>`,
      };
    });
    return `<div data-character-loadout="${kind}">${entityDetailEquipmentMarkup({rows,
      inventory: kind === "inventory"})}</div>`;
  };
  const profiles = data.characters?.growth_profiles || {};
  const actorType = partyAliveActorType(visualContext.actorDocument, role.id);
  const actorAppearance = visualContext.actorById.get(Number(actorType)) || null;
  let battleMetaspriteId = null;
  try {
    battleMetaspriteId = partyBattleMetaspriteId(
      visualContext.metaspriteDocument,
      role.id,
    );
  } catch {
    battleMetaspriteId = null;
  }
  const battleChoice = visualContext.battleChoices.find(
    item => item.id === battleMetaspriteId,
  ) || null;
  return recordPage({
    title: displayName,
    uid,
    physicalRows: [
      {label: "姓名来源", address: defaultNameCell.source},
      ...["equipment", "inventory"].flatMap(kind => (role[kind] || []).map((slot, index) => ({
        label: `${kind === "equipment" ? "装备" : "携带物"}槽 ${index + 1}`,
        address: slot.address,
      }))),
      ...roleNameSources.map(({label, cell}) => ({label, address: cell?.source})),
      ...(fallbackPool?.records || []).map(cell => ({
        label: `后备候选 ${cell.id}`, address: cell.source,
      })),
      {label: "形象选择表", address: characterVisualComponentAddress(PARTY_ALIVE_ACTOR_TYPES_COMPONENT_ID)},
      {label: "立绘选择表", address: characterVisualComponentAddress(BATTLE_ACTOR_SELECTOR_COMPONENT_ID)},
    ].filter(row => row.address),
    backLabel: "人物属性",
    prevId: index > 0 ? roles[index - 1].id : null,
    nextId: index < roles.length - 1 ? roles[index + 1].id : null,
    panels: [entityDetailPageMarkup({title: displayName, heading: false, sections: [
      entityDetailSection("equipment", "装备", `<div class="character-inventory-panels">
        ${loadoutPanel("equipment", "装备")}
        <a class="editor-inline-link" href="?view=save&amp;saveSection=party&amp;saveEntity=role-${esc(role.slug)}"
          aria-label="当前存档人物属性" title="当前存档人物属性">↗</a>
      </div>`),
      entityDetailSection("inventory", "携带物", loadoutPanel("inventory", "道具")),
      entityDetailSection("fields", "字段",
        addressTable(addressRows.filter(row => !isLoadoutRow(row)))),
      entityDetailPanel("基本信息", fields([
        ["资源 ID", characterResourceButton(uid)],
        ["空输入默认姓名", esc(displayName)],
        ["人物职责", `${esc(role.name)} · <span class="mono">${esc(role.slug)}</span>`],
        ["姓名来源", `<span class="record-bytes" title="4 字节姓名格，运行时追加 $9F">${esc(defaultNameCell.source?.raw_hex || "—")}</span>`],
      ])),
      entityDetailPanel("成长曲线", fields(
        [["力量", "strength"], ["智力", "intelligence"],
         ["速度", "speed"], ["体力", "vitality"]].map(([label, key]) => {
          const id = role.growth_profiles[key];
          profiles[id] || profiles[String(id)] || {};
          return [label, `PROFILE ${esc(id)}`];
        }))),
      entityDetailPanel("姓名初始化来源", `<div class="character-name-init-grid">${fields([
        ...roleNameSources.map(({label, cell}) => [
          label,
          `<span class="character-detail-value">${esc(cell?.text || "（空）")}</span>
            <small>${esc(cell?.source?.raw_hex || "—")}</small>`,
        ]),
        ...(fallbackPool?.records || []).map(cell => [
          `后备候选 ${cell.id}`,
          `<span class="character-detail-value">${esc(cell.text || "（空）")}</span>
            <small>${esc(cell.source?.raw_hex || "—")}</small>`,
        ]),
      ])}</div>`, {wide: true, flat: true}),
      entityDetailSection("appearance", "形象与预览", `<div class="character-motion-visuals">
        <div data-character-battle-scene="${Number(role.id)}"></div>
        <div class="character-walk-row">
          <div class="character-motion-binding"><h4>角色形象</h4>
            ${characterActorAppearanceCell(role, visualContext, {showUnavailable: false})}
            <small>${actorAppearance ? characterResourceButton(actorAppearance.resourceId) : ""}</small>
          </div>
          <div data-character-walk-strip></div>
        </div>
        <div class="character-battle-row">
          <div class="character-motion-binding"><h4>战斗立绘</h4>
            ${characterBattleAppearanceCell(role, visualContext, {showUnavailable: false})}
            <small>${battleChoice ? characterResourceButton(battleChoice.resourceUid) : ""}</small>
          </div>
          <div data-character-battle-poses="${Number(role.id)}"></div>
        </div>
      </div>` + fields([
        ["形象选择表", `<span class="mono">${esc(
          PARTY_ALIVE_ACTOR_TYPES_COMPONENT_ID,
        )}</span>`],
        ["立绘选择表", `<span class="mono">${esc(
          BATTLE_ACTOR_SELECTOR_COMPONENT_ID,
        )}</span>`],
      ]), {wide: true, flat: true}),
      entityDetailPanel("引用关系", `<div class="record-field">
        <span class="record-field-value">${resourceForwardReferenceCell(uid)}</span>
      </div>`, {wide: true, flat: true}),
    ]})],
  });
}

function updateCharacterEditorState(message = "") {
  if (!state.characterDraft || !state.characterOriginal) return;
  state.characterMessage = message;
  const error = characterDraftError();
  const status = $("#character-save-state");
  if (status) {
    const text = status.hasAttribute("data-character-errors-only")
      ? error || (/失败|错误/.test(message) ? message : "") : characterEditorStatus();
    status.textContent = text;
    status.hidden = !text;
    status.classList.toggle("invalid", Boolean(error));
  }
  updateCharacterOriginalControls($("#character-editor") || document);
}

function replaceCharacterRole(target, role) {
  const index = target?.roles?.findIndex(
    item => Number(item.id) === Number(role.id),
  );
  if (!Number.isInteger(index) || index < 0) {
    throw new Error(`人物草稿缺少人物 ${role.id}`);
  }
  target.roles[index] = copyCharacterDraft(role);
}

function installCharacterSelection(target, itemId, value) {
  if (itemId === "initial-gold") {
    target.initial_gold = Number(value);
    return;
  }
  if (itemId === "name-initialization") {
    target.name_initialization = copyCharacterDraft(value);
    return;
  }
  if (itemId.startsWith("rom-role:")) {
    replaceCharacterRole(target, value);
    return;
  }
  throw new Error(`未知人物写入项：${itemId}`);
}

function collectCharacterSelection(itemId) {
  const snapshot = copyCharacterDraft(state.characterDraft);
  if (itemId === "name-initialization") {
    normalizeCharacterDraftNames(snapshot);
    // raw_hex 与裁掉的尾随空格也是当前有效值的一部分；同步推进，避免写完后把
    // 同一个姓名表误判成又有一笔新改动。
    state.characterDraft.name_initialization = copyCharacterDraft(
      snapshot.name_initialization,
    );
  }
  const value = characterSelectionValue(snapshot, itemId);
  if (value === null || value === undefined) {
    throw new Error(`人物写入项不存在：${itemId}`);
  }
  return copyCharacterDraft(value);
}

async function writeCharacterSelection({repository, revision, itemId, value, before}) {
  assertCharacterProjectSession(repository, revision);
  const resourceId = itemId === "name-initialization"
    ? CHARACTER_TEXT_RESOURCE : CHARACTER_FIELD_RESOURCE;
  const current = await db.readResource(resourceId);
  const next = structuredClone(current.value);
  const previous = structuredClone(current.value);
  if (itemId === "name-initialization") {
    for (const cell of characterNameCells(value)) {
      const slot = next.document.slots?.[cell.source.slot_id];
      if (!slot) throw new Error(`文字槽缺少 ${cell.source.slot_id}`);
      slot.raw_hex = cell.source.raw_hex;
    }
    for (const cell of characterNameCells(before)) previous.document.slots[cell.source.slot_id].raw_hex = cell.source.raw_hex;
  } else {
    applyCharacterSelection(next.document, itemId, value);
    applyCharacterSelection(previous.document, itemId, before);
  }
  const {fields} = await characterSelectionFields(itemId);
  const atPath = (asset, field) => (field.assetPath ?? ["document", ...field.documentPath])
    .reduce((node, key) => node?.[key], asset);
  // 本次选择只提交相对草稿基线改变的字段。
  const edits = fields.filter(field => !field.readOnly
    && !canonicalJsonEqual(atPath(next, field), atPath(previous, field))).map(field => {
    const value_ = atPath(next, field);
    return canonicalJsonEqual(value_, field.defaultValue) ? {field, reset: true} : {field, value: value_};
  });
  if (edits.length) {
    await db.writeFields(edits, {expectedVersion: fields[0]?.version ?? null});
  }
  const saved = await db.readResource(resourceId);
  if (!characterProjectSessionMatches(repository, revision) || !state.project) {
    return saved;
  }
  const persisted = itemId === "name-initialization"
    ? characterNameInitializationDraft(characterNameInitializationDocument(value),
      saved.value.document)
    : characterSelectionValue(characterDraftFromDocument(saved.value.document), itemId);
  if (persisted === null || persisted === undefined) {
    throw new Error(`character-initial-record 写入后缺少 ${itemId}`);
  }
  installCharacterSelection(state.characterOriginal, itemId, persisted);
  installCharacterSelection(state.characterDraft, itemId,
    applyJsonChanges(persisted, value, characterSelectionValue(state.characterDraft, itemId)));
  updateCharacterEditorState();
  queueCharacterSelection(itemId);
  return saved;
}

const characterSelectionWrites = new Map();

async function settleCharacterSelection(itemId = null) {
  const writes = itemId === null
    ? [...characterSelectionWrites.values()]
    : [characterSelectionWrites.get(itemId)].filter(Boolean);
  await Promise.all(writes.map(write => write.catch(() => {})));
}

function queueCharacterSelection(itemId) {
  const error = characterSelectionDraftError(itemId);
  if (error) {
    return Promise.resolve();
  }
  let value;
  try {
    value = collectCharacterSelection(itemId);
  } catch (_error) {
    return Promise.resolve();
  }
  if (canonicalJsonEqual(value, characterSelectionValue(state.characterOriginal, itemId)))
    return Promise.resolve();
  const write = writeCharacterSelection({
    repository: requireBrowserProjectRepository(state),
    revision: characterProjectRevision(),
    itemId,
    value,
    before: copyCharacterDraft(characterSelectionValue(state.characterOriginal, itemId)),
  }).catch(error => {
    updateCharacterEditorState(`保存失败：${error?.message || error}`);
    throw error;
  }).finally(() => {
    if (characterSelectionWrites.get(itemId) === write) characterSelectionWrites.delete(itemId);
  });
  // 大部分输入事件不等待返回值；错误仍由状态栏和页面消息显示，不能变成未处理拒绝。
  write.catch(() => {});
  characterSelectionWrites.set(itemId, trackAutoSavePreparation(write));
  return write;
}

async function characterItemResetPreparation(itemId) {
  await settleCharacterSelection(itemId);
  const repository = requireBrowserProjectRepository(state);
  const revision = characterProjectRevision();
  await ensureCharacterImportBase();
  assertCharacterProjectSession(repository, revision);
  return {repository, revision};
}

function syncCharacterItemReset(itemId, saved, {repository, revision}) {
  assertCharacterProjectSession(repository, revision);
  if (itemId.startsWith("rom-role:")) {
    const roleId = Number(itemId.slice("rom-role:".length));
    const role = saved.value.document.rom_initial.roles.find(
      item => Number(item.id) === roleId,
    );
    if (!role) throw new Error(`character-initial-record 缺少人物 ${roleId}`);
    const restored = characterRoleDraft(role);
    replaceCharacterRole(state.characterDraft, restored);
    replaceCharacterRole(state.characterOriginal, restored);
  } else if (itemId === "initial-gold") {
    const value = Number(saved.value.document.rom_initial.gold.value);
    state.characterDraft.initial_gold = value;
    state.characterOriginal.initial_gold = value;
  } else if (itemId === "name-initialization") {
    const restored = characterNameInitializationDraft(
      characterNameInitializationDocument(state.characterDraft.name_initialization),
      saved.value.document,
    );
    state.characterDraft.name_initialization = copyCharacterDraft(restored);
    state.characterOriginal.name_initialization = copyCharacterDraft(restored);
  } else {
    throw new Error(`未知人物重置项：${itemId}`);
  }
  assertCharacterProjectSession(repository, revision);
}

async function resetCharacterItemToOriginal(itemId) {
  const context = await characterItemResetPreparation(itemId);
  const saved = await resetRecordFieldObjects(db, "character", itemId,
    {project: state.project});
  syncCharacterItemReset(itemId, saved, context);
  return saved;
}

async function bindCharacterOriginalFieldResets(form) {
  const controls = [...form.querySelectorAll('[data-character-original-control]')];
  for (const control of controls) {
    bindResetToOriginalButtons(control, async key => {
      try {
        if (!form.isConnected) throw new Error('人物页面已切换');
        await resetCharacterItemToOriginal(key);
        state.characterMessage = '';
        await render();
      } catch (error) {
        updateCharacterEditorState(`恢复失败：${error.message || error}`);
      }
    }, {
      confirmMessage: () => '恢复这一项的导入 original？同一资产中的其他编辑会保留。',
    });
  }
}

function bindCharacterVisualControls() {
  const context = characterVisualContext();
  document.querySelectorAll("[data-character-actor-appearance]").forEach(picker =>
    configureAnimatedResourcePicker(picker, {
      value: picker.value,
      options: [...context.actorAppearances.map(item => ({
        value: item.id, handle: item.resourceId,
        label: actorAppearanceCandidateLabel(item, `TYPE ${hex(item.id, 2)} · ${item.motionLabel}`), appearance: item,
      })), {value: 0x3f, handle: '0x3F', label: '无形象', disabled: true}],
      renderPreview: option => option.appearance
        ? actorAppearancePreview(context, option.appearance, option.label) : '',
      paintPreview: hydrateStoryActorVisuals,
    })
  );
  document.querySelectorAll("[data-character-battle-appearance]").forEach(picker =>
    configureAnimatedResourcePicker(picker, {
      value: picker.value,
      options: context.battleChoices.map(item => ({
        value: item.id, handle: item.resourceUid,
        label: `${item.resourceUid} · ${item.label}`,
        disabled: !item.available, available: item.available,
      })),
      renderPreview: option => option.available
        ? battleAppearancePreview(Number(option.value), option.label)
        : "",
      paintPreview: paintMetaspriteCanvases,
    })
  );
  const actors = [...document.querySelectorAll("[data-character-actor-appearance]")];
  const battles = [...document.querySelectorAll("[data-character-battle-appearance]")];
  if (!actors.length && !battles.length) return;
  const repository = requireBrowserProjectRepository(state);
  const revision = characterProjectRevision();
  void Promise.all([
    actors.length ? db.getFieldObjects(VISUAL_ACTORS_RESOURCE_ID) : [],
    battles.length ? db.getFieldObjects(VISUAL_METASPRITES_RESOURCE_ID) : [],
  ]).then(([actorObjects, battleObjects]) => {
    assertCharacterProjectSession(repository, revision);
    const bind = (picker, objects, entityHandle, fieldName, label, allowedValues) => {
      if (!picker.isConnected) return;
      const object = objects.find(item => item.fields.some(field =>
        field.entityHandle === entityHandle && field.fieldName === fieldName));
      if (!object) throw new Error(`${label}字段对象未发布：${entityHandle}/${fieldName}`);
      bindFieldObjectPicker(picker, object, {
        entityHandle, fieldName, label, allowedValues,
        onStart: () => {
          state.characterVisualSaving = true;
          updateCharacterEditorState(`正在保存${label}…`);
        },
        onSettled: async (error, changed, resetting) => {
          if (!characterProjectSessionMatches(repository, revision)) return;
          state.characterVisualSaving = false;
          state.characterMessage = error ? `${label}保存失败：${error.message || error}`
            : `${label}${resetting ? '已恢复 Original' : changed ? '已保存到项目' : '未发生变化'}`;
          await render();
        },
      });
    };
    for (const picker of actors) {
      const id = Number(picker.dataset.characterActorAppearance);
      bind(picker, actorObjects, `actor-visual:party:${id}`, 'actor_type', '角色形象',
        context.actorAppearances.map(item => Number(item.id)));
    }
    for (const picker of battles) {
      const id = Number(picker.dataset.characterBattleAppearance);
      bind(picker, battleObjects, `metasprite-record:battle-actor-selectors:${id}`,
        'metasprite_id', '战斗立绘', context.battleChoices.filter(item => item.available)
          .map(item => Number(item.id)));
    }
  }).catch(error => updateCharacterEditorState(`读取视觉字段对象失败：${error.message || error}`));
}

function selectBattlePreviewFormation(project) {
  const catalog = battleScenePreviewCatalog(project);
  const drawableIds = new Set(catalog.monsters.map(monster => monster.id));
  const candidates = project.game_data.battle_test.formations.filter(item => {
    const groups = item.slots.filter(slot => Number(slot.count) > 0);
    return groups.length === 2 && groups.every(slot => Number(slot.count) === 2);
  });
  if (!candidates.length) throw new Error("当前编队中没有两组各两只的阵容");
  let best = null;
  for (const [index, formation] of candidates.entries()) {
    const unavailable = formation.slots.map(slot =>
      Number(slot.count) > 0 && !drawableIds.has(Number(slot.monster_id)));
    // 不可绘制引用只在本次预览中留空，并逐群说明；不修改编队正文，也不替换怪物。
    const renderFormation = unavailable.some(Boolean) ? {
      ...formation,
      slots: formation.slots.map((slot, groupIndex) => unavailable[groupIndex]
        ? {...slot, count: 0} : slot),
    } : formation;
    const previewProject = renderFormation === formation ? project : {
      ...project,
      game_data: {...project.game_data, battle_test: {
        ...project.game_data.battle_test, formations: [renderFormation],
      }},
    };
    const base = battleScenePreviewForFormation(previewProject, formation.id, {guides: true});
    const count = battleSceneActiveEnemySlots(base).length;
    const rejections = [...base.formation.rejections];
    const issues = formation.slots.flatMap((slot, groupIndex) => {
      const requested = Number(slot.count);
      const placed = base.formation.groups[groupIndex].count;
      if (placed === requested) return [];
      // 开战排布每个未排满的敌群返回一条拒绝；未知失败不能变成容量提示。
      const code = unavailable[groupIndex] ? "missing-monster"
        : rejections.shift()?.code;
      if (!["missing-monster", "missing-footprint", "initial-grid-full"].includes(code)) {
        throw new Error(`编队 ${formation.id} 敌群 ${groupIndex + 1} 排布失败：${code}`);
      }
      return [{groupIndex, monsterId: Number(slot.monster_id), requested, placed, code}];
    });
    if (rejections.length) throw new Error(rejections.map(item => item.reason).join("；"));
    const selection = {formation, base, count, issues, skipped: index, candidates: candidates.length};
    if (count === 4) return selection;
    if (!best || count > best.count) best = selection;
  }
  return best;
}

function battlePreviewFormationMarkup(selection) {
  const {formation, count, issues, skipped, candidates} = selection;
  const monsterLabel = id => `${resourceLabel(
    recordUid("monster", id), `怪物 ${hex(id, 2)}`,
  )}（${recordUid("monster", id)}）`;
  const occupied = formation.slots.flatMap((slot, index) => {
    const placed = selection.base.formation.groups[index].count;
    return placed ? [`G${index + 1} ${monsterLabel(Number(slot.monster_id))}×${placed}`] : [];
  }).join("、");
  return `<div class="battle-preview-formation" data-battle-preview-formation>
    <p>编队 ${esc(hex(formation.id, 2))} · 两组各两只 · 已显示 ${count}/4 个敌人</p>
    ${count === 4 && skipped ? `<small>前 ${skipped} 条候选未能完整显示，已换用此编队。</small>` : ""}
    ${count < 4 ? `<p>已尝试 ${candidates} 条候选，均不足四只；当前显示可绘制敌人最多的编队，缺 ${4 - count} 只。范围预览仅包含已显示的敌人。</p>
      <ul>${issues.map(issue => {
        const reason = issue.code === "initial-grid-full"
          ? `体型所需空间放不下；当前空间已由 ${occupied || "其他敌人"} 占用。请检查这些怪物的图形体型，或调整编队的怪物引用。`
          : issue.code === "missing-footprint"
            ? "图形没有有效的排布占格，无法绘制。请检查该怪物的图形尺寸与引用。"
            : "编队引用的怪物缺少可绘制资源。请检查编队中的怪物引用及该怪物的图形。";
        return `<li>G${issue.groupIndex + 1} ${esc(monsterLabel(issue.monsterId))}：应有 ${issue.requested} 只，显示 ${issue.placed} 只。${esc(reason)}</li>`;
      }).join("")}</ul>` : ""}
  </div>`;
}

async function bindCharacterBattleScene(root) {
  if (!root || root.dataset.bound) return;
  root.dataset.bound = "1";
  const repository = requireBrowserProjectRepository(state);
  const revision = characterProjectRevision();
  const failures = await ensureBattleSceneData();
  if (failures.length) throw new Error(`战斗资源不可用：${failures.join("、")}`);
  const [characters, monsters, battleTest, items, itemService] = await Promise.all([
    db.getDocument("character-initial-record", null),
    db.getDocument("monster", null),
    db.getDocument("battle-test-point", null),
    db.getDocument("item", null),
    db.getResourceDocument("battle-item-service", null),
  ]);
  assertCharacterProjectSession(repository, revision);
  if (!root.isConnected) return;
  if (!characters || !monsters || !battleTest || !items) {
    throw new Error("战斗预览缺少当前人物、物品、怪物或编队正文");
  }
  if (!Array.isArray(itemService?.human_item_presentations)) {
    throw new Error("人类道具战斗表现声明尚未加载");
  }
  if (!Array.isArray(itemService?.vehicle_item_presentations)) {
    throw new Error("战车道具战斗表现声明尚未加载");
  }
  const project = {
    ...state.project,
    game_data: {
      ...state.project.game_data,
      characters, monsters, items, battle_test: battleTest, battle_item_service: itemService,
    },
  };
  const catalog = battleScenePreviewCatalog(project);
  const channel = catalog.partyAttackChannelByKey.get("melee");
  if (!channel?.sources.length) throw new Error("当前没有已发布的人类武器");
  const selection = selectBattlePreviewFormation(project);
  const {base} = selection;
  // 共用模型按角色槽选初始装备与立绘；只显示当前角色，不把他搬成另一角色槽。
  const attacker = base.party.findIndex(member =>
    member.roleId === Number(root.dataset.characterBattleScene));
  if (attacker < 0) throw new Error("当前人物没有已发布的战斗形象");
  let preview = normalizeBattleScenePreview({
    ...base,
    party: base.party.map((member, index) => ({
      ...member, visible: index === attacker, riding: false,
    })),
    attack: {...base.attack, side: "party", attacker, channel: channel.key},
  }, project);
  const enemySlots = battleSceneActiveEnemySlots(preview);
  const canvas = mountBattlePreviewStage(root, {kind: "character", label: "人物攻击",
    selection, preview, enemySlots, formationMarkup: battlePreviewFormationMarkup,
    scopeLabels: characterAttackScopeLabels, automaticScopeLabel: "按武器或道具"});
  if (!root.isConnected) return;
  async function paint(play = false) {
    assertCharacterProjectSession(repository, revision);
    if (!root.isConnected) return;
    preview = normalizeBattleScenePreview(preview, project);
    const attack = resolveBattleSceneAttack(preview, project);
    battlePreviewTargets(root,
      `${attack.source?.label || "未选择武器"} · ${attack.scopeLabel} · ${attack.targets.length} 个目标：${
        attack.targetIndices.map(index => `E${index + 1}`).join("、")}`);
    const messageSaveSlot = Number(state.characterSaveSlot);
    if (play) {
      await playBattleSceneComposerAttack(canvas, {preview, project, messageSaveSlot});
    } else await paintBattleSceneComposerCanvas(canvas, {preview, project, messageSaveSlot});
  }

  const showError = bindBattlePreviewControls(root, () => preview, paint);
  document.querySelectorAll("[data-character-loadout-preview], [data-character-save-preview]").forEach(host => {
    const slot = Number(host.dataset.itemSlot);
    const kind = host.dataset.characterLoadoutPreview || host.dataset.characterPreviewKind;
    const itemId = host.dataset.characterSavePreview
      ? currentFieldObject(host.dataset.characterSavePreview).value[slot]
      : characterDraftRole(Number(root.dataset.characterBattleScene))[kind][slot];
    if (kind === "inventory") {
      const part = host.dataset.characterPreviewPart || "all";
      host.innerHTML = battleItemRowPreview(itemId, catalog, {showStatus: false, part});
      if (part !== "action") bindBattleItemRowText(host, canvas);
      const source = catalog.itemAttackChannel.sources.find(source => source.source.id === itemId);
      if (part !== "text") {
        host.addEventListener("click", event => {
          const button = event.target.closest("[data-battle-item-use]");
          if (!button || button.disabled) return;
          preview.attack.channel = "item";
          preview.party[attacker].attacks.item = source.key;
          void paint(true).catch(showError);
        });
      }
      return;
    }
    const source = channel.sources.find(source => Number(source.source.id) === itemId);
    host.innerHTML = `<button class="button" type="button" data-character-row-fire${
      source?.visualAvailable && enemySlots.length ? "" : " disabled"}>发射</button>`;
    host.addEventListener("click", event => {
      const button = event.target.closest("[data-character-row-fire]");
      if (!button || button.disabled) return;
      preview.attack.channel = channel.key;
      preview.party[attacker].attacks[channel.key] = source.key;
      void paint(true).catch(showError);
    });
  });
  if (!state.saveCurrentBytes || !state.saveByteMapDocument) {
    const saveFields = await prepareSaveBuildFieldObjects(repository);
    assertCharacterProjectSession(repository, revision);
    await saveFields.openCurrent(state);
  }
  await paint();
}

async function bindCharacterFieldObjects(form) {
  const hosts = [...form.querySelectorAll('[data-character-field-object]')];
  const choices = [...form.querySelectorAll('[data-character-choice-object]')];
  const texts = [...form.querySelectorAll('[data-character-text-object]')];
  const bits = [...form.querySelectorAll('[data-character-bit-object]')];
  if (!hosts.length && !choices.length && !texts.length && !bits.length) return;
  const repository = requireBrowserProjectRepository(state);
  const revision = characterProjectRevision();
  const [characterObjects, textObjects] = await Promise.all([
    db.getFieldObjects(CHARACTER_FIELD_RESOURCE),
    db.getFieldObjects(CHARACTER_TEXT_RESOURCE),
  ]);
  const objects = [...characterObjects, ...textObjects];
  if (!characterProjectSessionMatches(repository, revision) || !form.isConnected) return;
  const byField = new Map(objects.flatMap(object => object.fields.map(field =>
    [`${field.recordId}:${field.fieldName}`, {object, field}])));
  const byIdentity = new Map(objects.flatMap(object => object.fields.map(field =>
    [`${field.entityHandle}:${field.fieldName}`, {object, field}])));
  const goldObject = objects.find(object => object.fields.some(field =>
    field.entityHandle === characterInitialGoldHandle && field.fieldName === 'value'));
  for (const host of hosts) {
    const gold = host.dataset.characterFieldObject === 'initial_gold';
    const id = Number(host.dataset.characterRole);
    const name = gold ? 'value' : host.dataset.characterFieldObject;
    const selected = gold ? {object: goldObject,
      field: goldObject?.fields.find(field => field.entityHandle === characterInitialGoldHandle
        && field.fieldName === name)} : byField.get(`${id}:${name}`);
    if (!selected?.object || !selected.field)
      throw new Error(`character-initial-record 缺少字段对象 ${gold ? 'initial-gold' : id}:${name}`);
    mountFieldObjectField(host, selected.object, {
      entityHandle: selected.field.entityHandle, fieldName: name,
      label: gold ? '初始金钱' : null,
      beforeCommit: () => settleCharacterSelection(gold ? 'initial-gold' : `rom-role:${id}`),
      onValue: value => {
        if (!characterProjectSessionMatches(repository, revision) || !host.isConnected) return;
        if (gold) {
          const changed = state.characterDraft.initial_gold !== value;
          state.characterDraft.initial_gold = value;
          if (state.characterOriginal) state.characterOriginal.initial_gold = value;
          if (changed) updateCharacterEditorState();
          return;
        }
        const draft = characterDraftRole(id);
        const changed = draft[name] !== value;
        draft[name] = value;
        const persisted = state.characterOriginal?.roles?.find(role => Number(role.id) === id);
        if (persisted) persisted[name] = value;
        if (changed) updateCharacterEditorState();
      },
    });
  }
  const items = state.project.game_data.items?.records || [];
  for (const host of choices) {
    const id = Number(host.dataset.characterRole);
    const name = host.dataset.characterChoiceObject;
    const [kind, indexText] = name.split('.');
    const index = Number(indexText);
    const selected = byField.get(`${id}:${name}`);
    if (!selected) throw new Error(`character-initial-record 缺少字段对象 ${id}:${name}`);
    mountFieldObjectChoice(host, selected.object, {
      entityHandle: selected.field.entityHandle, fieldName: name,
      label: `${kind === 'equipment' ? '初始装备' : '初始道具'} ${index + 1}`,
      optionsMarkup: value => characterItemOptions(items, characterDraftRole(id),
        value, kind === 'inventory'),
      pickerMarkup: (value, controlMarkup) => itemPickerFieldMarkup({
        records: items, value, controlMarkup,
        label: `${kind === 'equipment' ? '初始装备' : '初始道具'} ${index + 1}`,
        allowedCategories: kind === 'inventory'
          ? HUMAN_CATEGORIES : HUMAN_EQUIPMENT_CATEGORIES,
      }),
      beforeCommit: () => settleCharacterSelection(`rom-role:${id}`),
      afterCommit: host.dataset.characterChoiceDetail === 'true' ? async () => {
        if (!host.isConnected) return;
        await render();
      } : null,
      onValue: value => {
        if (!characterProjectSessionMatches(repository, revision) || !host.isConnected) return;
        const draft = characterDraftRole(id);
        const changed = draft[kind][index] !== value;
        draft[kind][index] = value;
        const persisted = state.characterOriginal?.roles?.find(role => Number(role.id) === id);
        if (persisted) persisted[kind][index] = value;
        if (changed) updateCharacterEditorState();
      },
    });
  }
  for (const host of bits) {
    const id = Number(host.dataset.characterRole);
    const index = Number(host.dataset.characterBitIndex);
    const role = characterDraftRole(id);
    if (role.slot_flags === null) {
      host.textContent = '未记录';
      continue;
    }
    const selected = byField.get(`${id}:slot_flags`);
    if (!selected) throw new Error(`character-initial-record 缺少装备掩码字段对象 ${id}`);
    const category = characterEquipmentCategory(role.equipment[index]);
    mountFieldObjectBit(host, selected.object, {
      entityHandle: selected.field.entityHandle, fieldName: 'slot_flags',
      bit: 0x80 >>> index, label: `装备 ${index + 1} ${category?.name || '所在槽'}`,
      disabled: !category,
      beforeCommit: () => settleCharacterSelection(`rom-role:${id}`),
      makeValue: (checked, value) => {
        const current = characterDraftRole(id);
        const next = {...current, slot_flags: value};
        setCharacterEquipped(next, index, checked);
        return next.slot_flags;
      },
      onValue: value => {
        if (!characterProjectSessionMatches(repository, revision) || !host.isConnected) return;
        const current = characterDraftRole(id);
        const changed = current.slot_flags !== value;
        current.slot_flags = value;
        const persisted = state.characterOriginal?.roles?.find(item => Number(item.id) === id);
        if (persisted) persisted.slot_flags = value;
        document.querySelectorAll(`[data-character-slot-status][data-character-role="${id}"]`).forEach(output => {
          output.textContent = equipmentColumnState(value, Number(output.dataset.characterSlotIndex))
            ? "已装备" : "未装备";
        });
        if (changed) updateCharacterEditorState();
      },
    });
  }
  for (const host of texts) {
    const key = host.dataset.characterTextObject;
    const slotId = characterNameCellByKey(key)?.source?.slot_id;
    const nameHandle = `${CHARACTER_TEXT_RESOURCE}:${slotId}`;
    const selected = byIdentity.get(`${nameHandle}:raw_hex`);
    if (!selected) throw new Error(`文字槽缺少姓名字段对象 ${slotId}`);
    const format = rawHex => {
      const cell = characterNameCellByKey(key);
      if (!cell) throw new Error(`人物姓名草稿缺少 ${key}`);
      return characterNameProjection({...cell.source, raw_hex: rawHex}).text;
    };
    mountFieldObjectText(host, selected.object, {
      entityHandle: nameHandle, fieldName: "raw_hex",
      label: host.dataset.characterTextLabel, maxLength: 4,
      format,
      parse: (text, current) => {
        const cell = characterNameCellByKey(key);
        const source = {...cell.source, raw_hex: current};
        const normalized = String(text).trimEnd();
        if (normalized === characterNameProjection(source).text) return current;
        const encoded = fixedRuntimeTextBytes(normalized, source, characterTextEncoding());
        if (!encoded.ok) {
          const unsupported = encoded.unsupported?.length
            ? `：${encoded.unsupported.join(' ')}` : '';
          throw new Error(`${encoded.reason}${unsupported}`);
        }
        return encoded.raw_hex;
      },
      beforeCommit: () => settleCharacterSelection('name-initialization'),
      onValue: value => {
        if (!characterProjectSessionMatches(repository, revision) || !host.isConnected) return;
        const cell = characterNameCellByKey(key);
        const changed = cell.source.raw_hex !== value;
        cell.source.raw_hex = value;
        cell.text = format(value);
        const persisted = characterNameCellByKey(key, state.characterOriginal);
        if (persisted) {
          persisted.source.raw_hex = value;
          persisted.text = cell.text;
        }
        if (changed) updateCharacterEditorState();
      },
    });
  }
}

function bindCharacterEditor() {
  if (!state.characterDraft) return;
  document.querySelectorAll("[data-character-loadout-reset]").forEach(control => {
    const kind = control.dataset.characterLoadoutKind;
    const index = Number(control.dataset.characterLoadoutReset);
    const roleId = Number(control.dataset.characterRole);
    void (async () => {
      if (!["equipment", "inventory"].includes(kind) || !Number.isInteger(index)
          || index < 0 || index >= 8) throw new Error("人物携带槽身份无效");
      const repository = requireBrowserProjectRepository(state);
      const revision = characterProjectRevision();
      const itemId = `rom-role:${roleId}`;
      const {fields} = await characterSelectionFields(itemId, ["rom_loadout"]);
      assertCharacterProjectSession(repository, revision);
      if (!control.isConnected) return;
      const field = characterRecordField(fields, `${kind}.${index}`);
      const flags = kind === "equipment" ? characterRecordField(fields, "slot_flags") : null;
      bindFieldResetToOriginalButtons(control,
        new Map([[`${kind}.${index}`, flags ? [field, flags] : [field]]]), {
          database: db, resourceId: CHARACTER_FIELD_RESOURCE,
          dirtyFor: () => field.hasOverride || Boolean(flags
            && equipmentColumnState(flags.value, index) !== equipmentColumnState(flags.defaultValue, index)),
          beforeReset: async () => {
            await settleCharacterSelection(itemId);
            assertCharacterProjectSession(repository, revision);
            const draft = characterDraftRole(roleId);
            if (flags && draft.slot_flags === null)
              throw new Error("草稿未记录装备掩码；请重置整个人物恢复 Original");
            const changes = [{field, reset: true}];
            if (flags) {
              const value = setEquipmentColumnState(flags.value, index,
                equipmentColumnState(flags.defaultValue, index));
              changes.push(value === flags.defaultValue
                ? {field: flags, reset: true} : {field: flags, value});
            }
            return {expectedVersion: field.version, changes};
          },
          changesFor: (_selected, context) => context.changes,
          afterReset: async (_selected, context, saved) => {
            assertCharacterProjectSession(repository, revision);
            const draft = characterDraftRole(roleId);
            draft[kind][index] = field.value;
            if (flags) draft.slot_flags = setEquipmentColumnState(draft.slot_flags,
              index, equipmentColumnState(flags.value, index));
            const persisted = characterDraftFromDocument(saved.value.document);
            installCharacterSelection(state.characterOriginal, itemId,
              characterSelectionValue(persisted, itemId));
            updateCharacterEditorState();
            await render();
          },
          onError: error => updateCharacterEditorState(`重置失败：${error.message || error}`),
        });
    })().catch(error => {
      if (control.isConnected) updateCharacterEditorState(`重置失败：${error.message || error}`);
    });
  });
  const battleRoot = document.querySelector("[data-character-battle-scene]");
  void bindCharacterBattleScene(battleRoot).catch(error => {
    editorLog.error("人物", `操作失败：${error?.message || error}`, error);
    if (battleRoot?.isConnected) {
      battleRoot.innerHTML = `<p class="module-editor-message">${esc(
        error?.message || error,
      )}</p>`;
    }
  });
  // 角色详情页沿用列表页的视觉选择器。
  bindCharacterVisualControls();
  const poseRoot = document.querySelector("[data-character-battle-poses]");
  if (poseRoot) void (async () => {
    const repository = requireBrowserProjectRepository(state);
    const revision = characterProjectRevision();
    const failures = await ensureBattleSceneData();
    assertCharacterProjectSession(repository, revision);
    if (!poseRoot.isConnected) return;
    if (failures.length) throw new Error(failures.join("、"));
    const roleId = Number(poseRoot.dataset.characterBattlePoses);
    await paintCharacterBattlePoses(poseRoot, {
      project: state.project, roleId,
      selectedId: partyBattleMetaspriteId(characterVisualContext().metaspriteDocument, roleId),
    });
  })().catch(error => {
    editorLog.error("人物", `操作失败：${error?.message || error}`, error);
    if (poseRoot.isConnected) poseRoot.textContent = `战斗姿势不可用：${error.message || error}`;
  });
  const walkRoot = document.querySelector("[data-character-walk-strip]");
  if (walkRoot) {
    const context = characterVisualContext();
    const picker = document.querySelector("[data-character-actor-appearance]");
    void paintCharacterWalkStrip(walkRoot, {
      pair: context.actorPair, appearance: context.actorById.get(Number(picker?.value)),
    }).catch(error => {
      editorLog.error("人物", `操作失败：${error?.message || error}`, error);
      if (walkRoot.isConnected) walkRoot.textContent = `行走图不可用：${error.message || error}`;
    });
  }
  if (document.querySelector("[data-character-loadout]")) {
    const detail = document.querySelector('.record-grid');
    if (detail) void bindCharacterFieldObjects(detail).catch(error => {
      if (detail.isConnected) updateCharacterEditorState(`读取人物字段对象失败：${error.message || error}`);
    });
    return;
  }
  const form = $("#character-editor");
  if (!form) return;
  form.addEventListener("submit", event => event.preventDefault());
  void bindCharacterFieldObjects(form).catch(error => {
    if (form.isConnected) updateCharacterEditorState(`读取人物字段对象失败：${error.message || error}`);
  });
  document.querySelectorAll("[data-character-field]").forEach(input =>
    input.addEventListener("input", event => {
      const role = characterDraftRole(event.target.dataset.characterRole);
      role[event.target.dataset.characterField] =
        event.target.value === "" ? null : Number(event.target.value);
      queueCharacterSelection(`rom-role:${Number(role.id)}`);
      updateCharacterEditorState();
    })
  );
  void bindCharacterOriginalFieldResets(form).catch(error => {
    if (form.isConnected) updateCharacterEditorState(`绑定人物重置失败：${error.message}`);
  });
  void ensureCharacterImportBase().then(() => {
    if (form.isConnected) updateCharacterOriginalControls(form);
  }).catch(error => {
    if (form.isConnected) {
      updateCharacterEditorState(`读取导入 original 失败：${error.message}`);
    }
  });
}

var characters = /*#__PURE__*/Object.freeze({
  __proto__: null,
  battleItemRowPreview: battleItemRowPreview,
  battlePreviewFormationMarkup: battlePreviewFormationMarkup,
  bindBattleItemRowText: bindBattleItemRowText,
  bindCharacterEditor: bindCharacterEditor,
  renderCharacterData: renderCharacterData,
  renderCharacterRecord: renderCharacterRecord,
  resetCharacterItemToOriginal: resetCharacterItemToOriginal,
  selectBattlePreviewFormation: selectBattlePreviewFormation
});

export { battleItemRowPreview, battlePreviewFormationMarkup, battlePreviewTargets, bindBattleItemRowText, bindBattlePreviewControls, characters, imagePickerCell, mountBattlePreviewStage, paintCharacterWalkStrip, renderCharacterData, resetRecordFieldObjects, selectBattlePreviewFormation };
