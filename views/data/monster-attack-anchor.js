// @editor-module 怪物的攻击源锚点（发射点）编辑
//
// **发射点只有放回战斗场景里才说得清。** 它是「相对怪物占格左上角的像素偏移」，
// 而炮口一类的发射点本来就落在图形之外（141 个发射点里有 14 个超出占格）——单看
// 一张怪物立绘判断不了那个点在哪。所以这里内嵌整场：这只怪物 ＋ 三名角色，改完
// 就地播。
//
// ROM 的取值规则（`AttackCmd13_AlternateSpawnObject`，字节地图里 static-disassembly
// -and-runtime-confirmed）：先以**怪物图形 ID** 索引两字节记录；X bit7=1 时，低 7 位
// 加**本次六槽行动序号**后再次索引同表——这就是「不同攻击方式发射点不同」的来源。
// 121 条记录里 13 条是这种重定向，22 只怪物落在它们上面。
//
// 解析、场景落点、播放都已经有人做了，这里不重复：
//   `monster-visual-recipes.js` 解重定向并产出每个图形的 6 个锚点；
//   `battleSceneAttackLaunchAnchor()` 把锚点加到怪物在场景里的像素坐标；
//   `paintBattleSceneComposerCanvas` / `playBattleSceneComposerAttack` 负责画与播。
// 本模块只做两件事：把锚点标出来，把那两个字节改掉。

import {editorLog} from "../../core/editor-log.js";
import {esc} from "../../core/dom.js";
import {screenWorkbench, screenWorkbenchCanvasStage} from '../../ui/screen-workbench.js';
import {paintAnchorMarkers, bindAnchorMarkerDrag} from '../../ui/attack-anchor-fields.js';
import {db} from "../../core/project-db.js";
import {entityFacetFields, loadEntityCatalog} from "../../core/entities.js";
import {
  battlePartyVisualPosition,
  battleSceneActiveEnemySlots,
  battleSceneAttackLaunchAnchor,
  battleSceneEntityAttackSources,
  battleScenePreviewCatalog,
  battleScenePreviewDefaults,
  normalizeBattleScenePreview,
} from "../../core/battle-scene-preview.js";
import {state} from "../../core/state.js";
import {bindFixedTextEditors, fixedTextRecordText} from "../../ui/fixed-text-editor.js";
import {bindFieldResetToOriginalButtons} from "../../ui/table.js";
import {ensureBattleSceneData} from "../../core/view-data.js";
import {
  paintBattleSceneComposerCanvas,
  playBattleSceneComposerAttack,
} from "../../render/battle-scene-composer.js";
import {battleSceneComposerCanvas} from "../battle-scene-composer.js";
import {
  bindMonsterAttackEffectPreviews,
  ENEMY_ACTION_RESOURCE_ID,
  ENEMY_ACTION_PATTERN_RESOURCE_ID,
  monsterAttackEffectModel,
  monsterAttackRoutePanes,
} from "./monster-attack-effects.js";

const ELEMENT_NAME = "monster-attack-anchor";
const VISUAL_MONSTERS_RESOURCE_ID = "monster-visual-layout";
const ANCHOR_REGION = "attack_source_anchor_region";
const SELECTION_SLOTS = 6;
const controllers = new WeakMap();

function repository() {
  const value = state.projectRepository;
  if (!value?.resolve) throw new TypeError("当前浏览器项目 repository 不可用");
  return value;
}

function anchorBytes(documentValue) {
  const region = documentValue?.[ANCHOR_REGION];
  if (!Array.isArray(region)) throw new TypeError("monster-visual-layout 缺少攻击源锚点区");
  return region;
}

function anchorField(fields, recordId, axis) {
  const offset = recordId * 2 + (axis === "y" ? 1 : 0);
  const field = fields.find(candidate =>
    candidate.documentPath?.[0] === ANCHOR_REGION
      && candidate.documentPath?.[1] === offset);
  if (!field) throw new TypeError(`锚点字段不存在：${offset}`);
  return field;
}

async function monsterLayoutFacet(monsterId) {
  const catalog = await loadEntityCatalog();
  return entityFacetFields(db, catalog.handleFor("monster", monsterId), "visual_layout",
    {catalog});
}

/**
 * 某个行动槽最终落在哪一条记录上。
 *
 * 与 `monster-visual-recipes.js` 的解析同一套规则，但这里还要**回答「是哪一条」**
 * ——编辑要写的就是那一条。返回 `null` 的两种情形照实标，不编值：
 * 索引越出表尾，或 Y 的 bit7 为 1（原处理器那时落进 `$12` 目标锚点分支，
 * 这一槽根本没有固定源点）。
 */
function resolveAnchorRecord(bytes, graphicId, selectionSlot) {
  let recordId = Number(graphicId);
  const visited = new Set();
  while (!visited.has(recordId)) {
    visited.add(recordId);
    const offset = recordId * 2;
    if (offset < 0 || offset + 1 >= bytes.length) {
      return {recordId, reason: "索引越出锚点表", redirected: visited.size > 1};
    }
    const rawX = Number(bytes[offset]?.value ?? bytes[offset]);
    const rawY = Number(bytes[offset + 1]?.value ?? bytes[offset + 1]);
    if (rawX & 0x80) {
      recordId = ((rawX & 0x7f) + Number(selectionSlot)) & 0xff;
      continue;
    }
    if (rawY & 0x80) {
      return {recordId, reason: "这一槽没有固定源点", redirected: visited.size > 1};
    }
    return {recordId, x: rawX, y: rawY, redirected: visited.size > 1, reason: ""};
  }
  return {recordId, reason: "锚点重定向成环", redirected: true};
}

/** 一条记录被多少个「图形 × 行动槽」用到。共用是常态，只在真被共用时报数字。 */
function sharingCount(bytes, graphics, recordId) {
  let count = 0;
  for (const graphicId of graphics) {
    for (let slot = 0; slot < SELECTION_SLOTS; slot += 1) {
      if (resolveAnchorRecord(bytes, graphicId, slot).recordId === recordId) {
        count += 1;
      }
    }
  }
  return count;
}

/**
 * 哪个攻击方式用这一槽。
 *
 * **`selectionSlots` 是复数。** 目录按视觉去重后，一个方式常常同时占好几个槽；
 * 只比 `selectionSlot`（那只是第一个）会让其余的槽看起来没有攻击方式。
 */
function modeForSlot(modes, slot) {
  return modes.find(mode => (mode.selectionSlots || []).includes(Number(slot)))
    || modes.find(mode => Number(mode.selectionSlot) === Number(slot))
    || null;
}

/** 行动清单、战斗场景与选中行动的属性填入共用三栏骨架。 */
function markup(controller) {
  controller.panes = monsterAttackRoutePanes({id: controller.monsterId}, {
    documents: controller.ownerDocuments,
    anchors: controller.slots.map(slot => ({
      x: slot.x,
      y: slot.y,
      reason: slot.reason,
      playable: Boolean(slot.mode?.visualAvailable),
    })),
    selectedSlot: controller.selectionSlot,
    anchorRecord: controller.anchor?.reason ? null : {
      recordId: controller.anchor.recordId,
      redirected: controller.anchor.redirected,
      sharing: controller.sharing,
    },
  });
  const panes = controller.panes;
  return screenWorkbench({namespace: 'monster-attack-anchor', className: 'monster-attack-anchor',
    heightMode: 'embedded', attributes: {'data-battle-scene-preview-host': ''},
    treeTitle: null, treeClassName: 'monster-attack-anchor-list', treeMarkup: panes.list,
    inspectorTitle: null, inspectorClassName: 'monster-attack-anchor-inspector', inspectorMarkup: panes.inspector,
    stageMarkup: screenWorkbenchCanvasStage({namespace: 'monster-attack-anchor', zoomMarkup: '',
      className: 'monster-attack-anchor-stage', canvasMarkup: `<div class="screen-workbench-canvas-stack">
        ${battleSceneComposerCanvas({label: "攻击源锚点预览"})}
        <div class="monster-attack-anchor-markers"
          data-monster-attack-anchor-markers></div>
      </div>`, footerMarkup: `<div class="monster-attack-anchor-stage-bar">
        <button class="button" type="button"
          data-monster-attack-play="${controller.selectionSlot}">播放这条行动</button>
        <small class="monster-attack-anchor-status"
          data-battle-scene-simulation-status aria-live="polite"></small>
        <p class="module-editor-message" data-monster-attack-anchor-message hidden
          aria-live="polite"></p>
      </div>`,
    }),
  });
}

function paintMarkers(controller) {
  const listed = new Set(controller.panes?.anchorSlots || []);
  paintAnchorMarkers(controller.root.querySelector('[data-monster-attack-anchor-markers]'), {
    canvas: controller.root.querySelector('canvas[data-battle-scene-composer]'),
    slots: controller.slots.flatMap((slot, index) => slot.reason || !slot.scene || !listed.has(index)
      ? [] : [{...slot, slot: index}]), selectedSlot: controller.selectionSlot,
  });
}

async function repaint(controller) {
  const canvas = controller.root.querySelector("canvas[data-battle-scene-composer]");
  if (!canvas) return;
  await paintBattleSceneComposerCanvas(canvas, {
    preview: controller.preview, messageAction: controller.panes.action,
  });
  paintMarkers(controller);
}

function showMessage(controller, message) {
  const node = controller.root.querySelector("[data-monster-attack-anchor-message]");
  if (!node) return;
  node.hidden = !message;
  node.textContent = message;
}

/**
 * 写发射点字节。
 *
 * 一次可以写一个轴（改输入框）也可以写两个（在画面上拖）——拖拽写两次会各自
 * 触发一轮重载，中间那一轮拿的是只改了一半的坐标。
 */
async function setAnchorFields(controller, values) {
  const anchor = controller.anchor;
  if (!anchor || anchor.reason || controller.busy) return;
  const entries = Object.entries(values).filter(([, value]) => value !== undefined);
  if (!entries.length) return;
  for (const [, value] of entries) {
    const next = Number(value);
    if (!Number.isInteger(next) || next < 0 || next > 0x7f) {
      showMessage(controller, "发射点偏移必须是 0..127 的整数（bit7 另有含义）");
      return;
    }
  }
  controller.busy = true;
  try {
    const fields = (await monsterLayoutFacet(controller.monsterId)).fields;
    const changes = entries.map(([axis, value]) => {
      return {field: anchorField(fields, anchor.recordId, axis), value: Number(value)};
    });
    if (changes.length) await db.writeFields(changes, {
      expectedVersion: fields[0].version,
    });
    const saved = await db.readResource(VISUAL_MONSTERS_RESOURCE_ID);
    controller.version = saved.version;
    await load(controller);
  } catch (error) {
    editorLog.error("编辑页面", `操作失败：${error?.message || error}`, error);
    controller.busy = false;
    showMessage(controller, `保存发射点失败：${error?.message || error}`);
  }
}

async function applyAttackVisualField(controller, field, option) {
  controller.busy = true;
  controller.root.dataset.monsterAttackVisualSaving = "true";
  try {
    await field.set(option.visualCode, {expectedVersion: field.version});
    if (controller.root.isConnected) {
      await load(controller);
      await playBattleSceneComposerAttack(
        controller.root.querySelector("canvas[data-battle-scene-composer]"),
        {preview: controller.preview, messageAction: controller.panes.action});
    } else controller.busy = false;
  } finally {
    controller.busy = false;
    delete controller.root.dataset.monsterAttackVisualSaving;
  }
}

function markLoading(controller) {
  controller.root.dataset.monsterAttackAnchorState = "loading";
  const outcome = controller.root.querySelector("[data-battle-outcome]");
  if (outcome) outcome.disabled = true;
}

async function load(controller) {
  markLoading(controller);
  const source = repository();
  const resolved = await db.readResource(VISUAL_MONSTERS_RESOURCE_ID);
  const asset = resolved?.value;
  if (!asset?.document) throw new TypeError("monster-visual-layout owner 资产不可用");
  controller.repository = source;
  controller.version = resolved.version;
  const bytes = anchorBytes(asset.document);
  const enemy = (asset.document.enemies || []).find(item =>
    Number(item?.id) === controller.monsterId);
  if (!enemy) throw new TypeError(`monster-visual-layout 没有怪物 ${controller.monsterId}`);
  controller.graphicId = Number(enemy.graphic_id);

  // 战斗场景那套正文原本只在它自己那一页加载；内嵌进来要先按需备齐。
  await ensureBattleSceneData();
  // Retain live field views across asynchronous painting and other owner writes.
  // A cache miss while loading another field is not a missing published action.
  controller.ownerDocuments = new Map(await Promise.all([
    ENEMY_ACTION_RESOURCE_ID, ENEMY_ACTION_PATTERN_RESOURCE_ID,
  ].map(async resourceId => [resourceId, await db.getDocument(resourceId, null)])));
  const catalog = battleScenePreviewCatalog(state.project);
  if (!catalog.monsters?.length) {
    throw new TypeError("战斗场景目录里没有怪物；project.visuals 尚未就绪");
  }
  // 这只怪物当敌方、三名角色全显示——没有目标时动画会失去落点，看着莫名其妙。
  const base = battleScenePreviewDefaults(state.project);
  const preview = normalizeBattleScenePreview({
    ...base,
    party: base.party.map((member, index) => ({
      ...member, ...battlePartyVisualPosition(index, 3), visible: true,
    })),
    enemyGroups: base.enemyGroups.map((group, index) => index === 0
      ? {monsterId: controller.monsterId, count: 1} : {...group, count: 0}),
    reinforcement: {...base.reinforcement, monsterId: controller.monsterId},
    attack: {...base.attack, side: "enemy", playNonce: 0},
  }, state.project);
  // **敌方槽位不是从 0 连续排的**：编队按占格铺位，count=1 时那一只未必落在 0 号槽。
  // 取第一个真正有实体、且就是这只怪物的槽。
  const enemyIndex = battleSceneActiveEnemySlots(preview).find(index =>
    Number(preview.enemies[index]?.monsterId) === controller.monsterId) ?? 0;
  controller.enemyIndex = enemyIndex;
  const {route} = monsterAttackEffectModel({id: controller.monsterId}, controller.ownerDocuments);
  const entityCatalog = await loadEntityCatalog();
  const actionVisualFacet = await entityFacetFields(db,
    entityCatalog.handleFor("monster", controller.monsterId), "action_visual_selector",
    {catalog: entityCatalog});
  const fields = [...new Set(route.slots.map(slot => slot.action.handle))].map(handle => {
    const field = actionVisualFacet.fields.find(candidate => candidate.entityHandle === handle
      && candidate.fieldName === "visual_selector");
    if (!field) throw new TypeError(`行动视觉切面缺少 ${handle}`);
    return field;
  });
  controller.visualFieldUnbinds?.forEach(unbind => unbind());
  controller.visualFields = new Map(fields.map(field => [field.entityHandle, field]));
  controller.visualFieldUnbinds = fields.map(field => field.bind(controller.root, (target, value, changed, reason) => {
    const current = controllers.get(target);
    if (!current) return;
    if (reason === "initial" || current.panes?.action?.handle !== changed.entityHandle) return;
    current.preview = normalizeBattleScenePreview({...current.preview,
      attack: {...current.preview.attack, source: `visual:${value}`}}, state.project);
    void repaint(current).catch(error => {editorLog.error("编辑页面", `操作失败：${error?.message || error}`, error); return showMessage(current, `刷新攻击特效失败：${error?.message || error}`);});
  }));
  controller.modes = battleSceneEntityAttackSources(
    catalog, preview, "enemy", enemyIndex).map(mode => {
    const action = route.slots.find(slot =>
      slot.slot === null || slot.slot === mode.selectionSlot)?.action;
    const visual = action.fields?.visual_and_counter_initializer;
    if (!visual?.value) return mode;
    return {
      ...mode,
      key: `visual:${visual.visual_selector}`,
      visualAvailable: catalog.clipByCode.has(Number(visual.visual_selector)),
    };
  });
  controller.modeIndex = Math.min(
    Math.max(0, controller.modeIndex || 0), Math.max(0, controller.modes.length - 1));
  const mode = controller.modes[controller.modeIndex] || null;
  // 一个方式可能覆盖多个槽；已经选中的那一槽属于这个方式时就别把它拽回第一槽。
  const modeSlots = (mode?.selectionSlots || []).map(Number);
  controller.selectionSlot = modeSlots.includes(Number(controller.selectionSlot))
    ? Number(controller.selectionSlot)
    : Number(mode?.selectionSlot ?? 0);
  // **全体攻击要打三个人。** 目标范围不在怪物攻击档案里（那里 target_scope 一律
  // 为空，场景只好一律当单体），只在六槽模式那一字节的 bit7 上——字节地图对这一位
  // 的运行语义仍标「尚未完全确认」，抽取器把它读成「全体目标」，这里照它来。
  const routed = monsterAttackRoutePanes({id: controller.monsterId}, {
    documents: controller.ownerDocuments,
    selectedSlot: controller.selectionSlot,
  });
  controller.preview = normalizeBattleScenePreview({
    ...preview,
    attack: {
      ...preview.attack,
      attacker: enemyIndex,
      source: mode?.key || "auto",
      // 发射点逐槽取；不显式带上选中那一槽，场景会用这个攻击方式的第一个槽。
      selectionSlot: controller.selectionSlot,
      scope: routed.allTargets ? "all" : "auto",
    },
  }, state.project);

  const attacker = controller.preview.enemies?.[controller.enemyIndex] || null;
  // 发射点是**相对怪物占格左上角**的偏移；在画面上拖出来的是场景坐标，减掉这个
  // 原点才是要写进字节的值。
  controller.attackerPixel = attacker
    ? {x: Number(attacker.pixelX), y: Number(attacker.pixelY)}
    : null;
  const layoutFacet = await monsterLayoutFacet(controller.monsterId);
  if (!Array.isArray(layoutFacet.slotRecords)
      || layoutFacet.slotRecords.length !== SELECTION_SLOTS)
    throw new TypeError("怪物布局切面缺少逐槽最终锚点");
  controller.slots = layoutFacet.slotRecords.map((record, slot) => {
    const mode = modeForSlot(controller.modes, slot);
    if (record.reason) return {...record, mode};
    const scene = attacker
      ? battleSceneAttackLaunchAnchor(
        {...controller.preview.attack, side: "enemy", selectionSlot: slot, attacker},
        controller.preview.party?.[0] || null)
      : null;
    return {...record, mode, scene};
  });
  controller.anchor = controller.slots[controller.selectionSlot] || null;
  controller.sharing = controller.anchor?.reason
    ? 0
    : sharingCount(
      bytes,
      [...new Set((asset.document.enemies || []).map(item => Number(item.graphic_id)))],
      controller.anchor.recordId);
  controller.busy = false;
  controller.root.innerHTML = markup(controller);
  const anchorHost = controller.root.querySelector(".monster-attack-anchor-fields");
  if (anchorHost && controller.anchor && !controller.anchor.reason) {
    const selected = ["x", "y"].map(axis =>
      anchorField(layoutFacet.fields, controller.anchor.recordId, axis));
    const button = anchorHost.querySelector("[data-reset-to-original]");
    button.dataset.originalDirty = String(selected.some(field => field.hasOverride));
    button.classList.toggle("dirty", selected.some(field => field.hasOverride));
    bindFieldResetToOriginalButtons(anchorHost,
      new Map([[String(controller.anchor.recordId), selected]]), {
        database: db,
        beforeReset: () => ({expectedVersion: selected[0].version}),
        afterReset: async () => {if (controller.root.isConnected) await load(controller);},
        onError: error => showMessage(controller, `恢复发射点失败：${error?.message || error}`),
      });
  }
  controller.textEditors = bindFixedTextEditors(
    controller.root, {
      onState: () => {
        const editor = controller.textEditors;
        if (!editor || editor.pending || editor.error) return;
        for (const input of controller.root.querySelectorAll("[data-fixed-text-input]")) {
          input.value = fixedTextRecordText(input.dataset.fixedTextRecord);
        }
      },
      onSaved: async () => {
        if (controller.root.isConnected) await repaint(controller);
      },
    },
  );
  await controller.textEditors.ready;
  controller.root.dataset.monsterAttackAnchorGraphic = String(controller.graphicId);
  controller.root.dataset.monsterAttackAnchorSlot = String(controller.selectionSlot);
  controller.root.dataset.monsterAttackAnchorRecord =
    String(controller.anchor?.recordId ?? "");
  controller.root.dataset.monsterAttackAnchorModes = String(controller.modes.length);
  await bindMonsterAttackEffectPreviews(controller.root, controller.ownerDocuments);
  const visualHost = controller.root.querySelector(".monster-attack-visual-field");
  const visualField = controller.visualFields.get(controller.panes.action?.handle);
  const visualReset = visualHost?.querySelector("[data-reset-to-original]");
  if (visualReset && visualField) {
    visualReset.dataset.originalDirty = String(visualField.hasOverride);
    visualReset.classList.toggle("dirty", visualField.hasOverride);
    bindFieldResetToOriginalButtons(visualHost,
      new Map([[visualField.entityHandle, visualField]]), {
        beforeReset: () => ({expectedVersion: visualField.version}),
        afterReset: async () => {if (controller.root.isConnected) await load(controller);},
        onError: error => showMessage(controller, `恢复攻击特效失败：${error?.message || error}`),
      });
  }
  await repaint(controller);
  controller.root.dataset.monsterAttackAnchorState = "ready";
}

/** 点左栏一行：切到用这一槽的攻击方式，没有对应方式的只挪高亮和发射点。 */
async function selectSlot(controller, index) {
  markLoading(controller);
  await controller.textEditors?.flush();
  await controller.visualSave;
  const modeIndex = controller.modes.indexOf(modeForSlot(controller.modes, index));
  if (modeIndex >= 0) controller.modeIndex = modeIndex;
  controller.selectionSlot = index;
  await load(controller);
}

async function hydrate(element) {
  const monsterId = Number(element.dataset.monsterId);
  if (!Number.isInteger(monsterId)) {
    throw new TypeError("monster-attack-anchor 缺少 data-monster-id");
  }
  const controller = {
    root: element, monsterId, modeIndex: 0, busy: false,
  };
  controller.visualSave = Promise.resolve();
  controllers.set(element, controller);
  bindAnchorMarkerDrag(element, {
    canvas: () => element.querySelector('canvas[data-battle-scene-composer]'),
    origin: () => controller.attackerPixel, selectedSlot: () => controller.selectionSlot,
    anchor: () => controller.anchor, canEdit: () => !controller.busy,
    onSelect: slot => selectSlot(controller, slot),
    onCommit: point => setAnchorFields(controller, point),
    onError: error => showMessage(controller, String(error?.message || error)),
  });
  element.addEventListener("input", event => {
    const control = event.target.closest?.(
      "[data-monster-attack-anchor-x], [data-monster-attack-anchor-y]",
    );
    if (!control) return;
    const value = Number(control.value);
    const valid = control.value !== "" && Number.isInteger(value)
      && value >= 0 && value <= 0x7f;
    control.setAttribute("aria-invalid", String(!valid));
    showMessage(controller, valid ? "" : "发射点偏移必须是 0..127 的整数（bit7 另有含义）");
  });
  element.addEventListener("change", event => {
    const x = event.target.closest?.("[data-monster-attack-anchor-x]");
    if (x) {
      if (x.getAttribute("aria-invalid") === "true") {
        x.value = String(controller.anchor.x);
        return;
      }
      void setAnchorFields(controller, {x: x.value});
      return;
    }
    const y = event.target.closest?.("[data-monster-attack-anchor-y]");
    if (y) {
      if (y.getAttribute("aria-invalid") === "true") {
        y.value = String(controller.anchor.y);
        return;
      }
      void setAnchorFields(controller, {y: y.value});
      return;
    }
    const picker = event.target.closest?.(
      "animated-resource-picker[data-monster-attack-visual]",
    );
    if (picker) {
      const option = picker.options.find(item => item.value === picker.value);
      if (!option) {
        showMessage(controller, "所选攻击特效不在当前 owner 候选目录中");
        return;
      }
      const actionHandle = String(picker.dataset.monsterAttackActionHandle || "");
      const summary = controller.root.querySelector(
        `[data-monster-attack-action="${CSS.escape(actionHandle)}"] `
          + "[data-monster-attack-row-visual]",
      );
      if (summary) summary.textContent = option.handle;
      const field = controller.visualFields.get(actionHandle);
      controller.visualSave = controller.visualSave.then(() =>
        applyAttackVisualField(controller, field, option))
        .catch(async error => {
          editorLog.error("编辑页面", `操作失败：${error?.message || error}`, error);
          controller.busy = false;
          try {
            if (controller.root.isConnected) await load(controller);
            showMessage(controller, `保存攻击特效失败：${error?.message || error}`);
          } catch (reloadError) {
            editorLog.error("编辑页面", `操作失败：${reloadError?.message || reloadError}`, reloadError);
            showMessage(controller, `保存攻击特效失败：${error?.message || error}；重载失败：${
              reloadError?.message || reloadError}`);
          }
        });
    }
  });
  element.addEventListener("click", event => {
    const play = event.target.closest?.("[data-monster-attack-play]");
    if (play) {
      // **先切槽再播。** 场景按 `attack.source` 取特效、按选中槽取发射点；不切就会
      // 拿另一条行动的发射点播这一条。
      const index = Number(play.dataset.monsterAttackPlay);
      const messageOutcome = {actionReference: controller.panes.action?.handle,
        id: element.querySelector("[data-battle-outcome]")?.value || ""};
      void selectSlot(controller, index)
        .then(() => playBattleSceneComposerAttack(
          element.querySelector("canvas[data-battle-scene-composer]"),
          {preview: controller.preview, messageAction: controller.panes.action, messageOutcome}))
        .catch(error => {editorLog.error("编辑页面", `操作失败：${error?.message || error}`, error); return showMessage(controller,
          `播放失败：${error?.message || error}`);});
      return;
    }
    // 只认左栏的行：右栏也带着选中那一槽的号，点属性不该被当成换选择。
    if (event.target.closest?.(".fixed-text-editor")) return;
    const slot = event.target.closest?.(".monster-attack-action-row");
    if (!slot) return;
    void selectSlot(controller, Number(slot.dataset.monsterAttackAnchorSlot))
      .catch(error => {editorLog.error("编辑页面", `操作失败：${error?.message || error}`, error); return showMessage(controller,
        `切换行动槽失败：${error?.message || error}`);});
  });
  await load(controller);
}

const HTMLElementBase = globalThis.HTMLElement || class {};

if (globalThis.customElements && globalThis.HTMLElement
    && !globalThis.customElements.get(ELEMENT_NAME)) {
  globalThis.customElements.define(ELEMENT_NAME, class extends HTMLElementBase {
    connectedCallback() {
      if (this.dataset.monsterAttackAnchorBound === "1") return;
      this.dataset.monsterAttackAnchorBound = "1";
      void hydrate(this).catch(error => {
        editorLog.error("编辑页面", `操作失败：${error?.message || error}`, error);
        this.dataset.monsterAttackAnchorState = "error";
        this.dataset.monsterAttackAnchorError = String(error?.message || error);
        this.innerHTML = `<p class="resource-empty">攻击源锚点不可用：${
          esc(error?.message || error)}</p>`;
      });
    }
  });
}

export function monsterAttackAnchorMarkup(monsterId) {
  return `<${ELEMENT_NAME} data-monster-id="${Number(monsterId)}"></${ELEMENT_NAME}>`;
}
