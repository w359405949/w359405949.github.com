// @editor-module 怪物 → 行动 → 攻击视觉配置面
//
// 路径只消费各 owner 已发布的语义：怪物攻击档案给出策略与直接行动／模式 ID，
// enemy-action-pattern 给出六槽引用，enemy-action 给出视觉资源引用。页面不解释任何
// packed byte；选择结果只改 enemy-action owner 的语义字段，packed byte 与另一半位域
// 由 owner codec 编码和保持。

import {esc, hex} from "../../core/dom.js";
import {db} from "../../core/project-db.js";
import {entityFacetFields, loadEntityCatalog} from "../../core/entities.js";
import {currentTextReferenceLink, recordUid} from "../../core/resource-index.js";
import {state} from "../../core/state.js";
import {
  attackVisualCanvas,
  paintAttackVisualCanvases,
  setWeaponEffectPreviewPlayback,
} from "../../render/weapon-effect-vm.js";
import {messageState} from "../../core/battle-scene-preview.js";
import {configureAnimatedResourcePicker} from "../../ui/animated-resource-picker.js";
import {anchorFieldsMarkup} from "../../ui/attack-anchor-fields.js";
import {resetToOriginalButton} from "../../ui/table.js";
import {battleResultStatusEffects} from "../../core/battle-result-script-runtime.js";
import {renderModuleComponent} from "../../ui/module-components.js";

export const ENEMY_ACTION_RESOURCE_ID = "enemy-action";
export const ENEMY_ACTION_PATTERN_RESOURCE_ID = "enemy-action-pattern";
const ATTACK_VISUAL_RESOURCE_ID = "attack-visual";

function effectAssets() {
  return state.project?.visuals?.weapon_effect_catalog?.asset_catalog_data || {};
}

function ownerRecords(resourceId, documents = null) {
  const document_ = documents?.get(resourceId) ?? db.peekDocument(resourceId, null);
  const records = document_?.records;
  if (!Array.isArray(records)) {
    throw new TypeError(`${resourceId} 的当前 owner 正文尚未加载`);
  }
  const declared = Number(document_.record_count);
  if (!Number.isInteger(declared) || declared !== records.length) {
    throw new TypeError(`${resourceId} 的 record_count 与 records 不一致`);
  }
  return records;
}

function monsterAttackProfiles() {
  const profiles = effectAssets().monster_attack_profiles;
  if (!Array.isArray(profiles)) {
    throw new TypeError("怪物攻击路径档案尚未加载");
  }
  return profiles;
}

/**
 * 一只怪物的攻击档案。
 *
 * 这份数据本来在「怪物攻击与战斗测试」页里另开了一张 131 行的表——**逐怪物、
 * 一行一只，和怪物表是同一批对象**；两张表列同一批东西，改哪一张都得记得另一张。
 * 档案归怪物，所以由怪物表和怪物记录页取用，这里只提供查表。
 */
export function monsterAttackProfile(monsterId) {
  // **档案没加载时给 null，不抛。** 怪物表是一张属性表，攻击档案来自另一份资产；
  // 那份没在场时整张表不该跟着塌掉——这一格如实留白就够了。需要档案才成立的
  // 视图（攻击特效面板）仍走 monsterAttackProfiles()，缺了照旧报错。
  const profiles = effectAssets().monster_attack_profiles;
  if (!Array.isArray(profiles)) return null;
  return profiles.find(profile =>
    Number(profile.monster_id) === Number(monsterId)) || null;
}

function indexedBy(records, select, label) {
  const result = new Map();
  for (const record of records) {
    const key = select(record);
    if (key === null || key === undefined || key === "" || result.has(String(key))) {
      throw new TypeError(`${label} 的记录身份为空或重复`);
    }
    result.set(String(key), record);
  }
  return result;
}

function routeForProfile(profile, patternsByHandle, actionsByHandle) {
  const monsterId = Number(profile?.monster_id);
  const strategyId = Number(profile?.action_strategy_id);
  if (!Number.isInteger(monsterId) || !Number.isInteger(strategyId)) {
    throw new TypeError("怪物攻击档案缺少策略或行动选择语义");
  }
  const direct = strategyId === 0;
  const expectedKind = direct ? "direct-action" : "six-slot-pattern";
  if (profile.action_selection_kind !== expectedKind) {
    throw new TypeError(
      `monster:${monsterId.toString(16).toUpperCase().padStart(2, "0")} 的策略与行动路径不一致`,
    );
  }
  if (direct) {
    const directModes = Array.isArray(profile.attack_modes) ? profile.attack_modes : [];
    const references = [...new Set(directModes.map(mode => String(
      mode?.action_resource || "",
    )))];
    if (references.length !== 1 || !references[0]) {
      throw new TypeError(`monster:${monsterId.toString(16).toUpperCase().padStart(2, "0")} 没有唯一的直接行动引用`);
    }
    const action = actionsByHandle.get(references[0]);
    if (!action) throw new TypeError(`直接行动引用 ${references[0]} 不存在`);
    return {
      strategyId,
      kind: expectedKind,
      selectionReference: references[0],
      pattern: null,
      slots: [{slot: null, allTargets: false, action}],
    };
  }
  const patternReference = String(profile.action_pattern_resource || "");
  const pattern = patternsByHandle.get(patternReference);
  if (!pattern || !Array.isArray(pattern.slots) || pattern.slots.length !== 6) {
    throw new TypeError(`六槽行动模式引用 ${patternReference || "（空）"} 不存在或不是六槽`);
  }
  const slots = pattern.slots.map(slot => {
    const reference = String(slot?.action_reference || "");
    const action = actionsByHandle.get(reference);
    if (!action) throw new TypeError(`${pattern.handle} 的行动引用 ${reference || "（空）"} 无效`);
    return {
      slot: Number(slot.slot),
      allTargets: slot.all_targets === true,
      action,
    };
  });
  return {strategyId, kind: expectedKind, selectionReference: patternReference, pattern, slots};
}

function attackDataModel(documents = null) {
  const actions = ownerRecords(ENEMY_ACTION_RESOURCE_ID, documents);
  const patterns = ownerRecords(ENEMY_ACTION_PATTERN_RESOURCE_ID, documents);
  const profiles = monsterAttackProfiles();
  const actionsByHandle = indexedBy(
    actions,
    action => String(action.handle || ""),
    ENEMY_ACTION_RESOURCE_ID,
  );
  const patternsByHandle = indexedBy(
    patterns,
    pattern => String(pattern.handle || ""),
    ENEMY_ACTION_PATTERN_RESOURCE_ID,
  );
  const profilesByMonster = indexedBy(
    profiles,
    profile => Number(profile.monster_id),
    "怪物攻击档案",
  );
  return {
    actions,
    patterns,
    profiles,
    actionsByHandle,
    patternsByHandle,
    profilesByMonster,
  };
}

/** 当前怪物记录页所需的直接行动或六个模式槽。 */
export function monsterAttackEffectModel(monster, documents = null) {
  const model = attackDataModel(documents);
  const monsterId = Number(monster?.id);
  const profile = model.profilesByMonster.get(String(monsterId));
  if (!profile) throw new TypeError(`monster:${hex(monsterId, 2).slice(2)} 缺少攻击路径档案`);
  return {
    profile,
    route: routeForProfile(
      profile,
      model.patternsByHandle,
      model.actionsByHandle,
    ),
  };
}

function attackVisualLabel(record) {
  return recordUid(ATTACK_VISUAL_RESOURCE_ID, record.id);
}

/** owner 中可解码且非 immutable 的视觉目录；这里只供只读动画组件水合。 */
function monsterAttackVisualOptions() {
  return ownerRecords(ATTACK_VISUAL_RESOURCE_ID)
    .filter(record => record?.decode_status === "decoded"
      && record?.edit_policy !== "immutable")
    .map(record => {
      const id = Number(record.id);
      const handle = String(record.handle || `${ATTACK_VISUAL_RESOURCE_ID}:${
        id.toString(16).toUpperCase().padStart(2, "0")}`);
      return {
        value: handle,
        handle,
        label: attackVisualLabel(record),
        searchText: `${id} ${hex(id, 2)}`,
        visualCode: id,
      };
    });
}

function visualPreview(option) {
  return attackVisualCanvas({
    visualCode: Number(option?.visualCode),
    play: true,
    segment: "full",
    className: "monster-attack-visual-canvas",
    label: option?.label || "怪物攻击视觉",
  });
}

function actionVisualReference(action) {
  return String(action?.fields?.visual_and_counter_initializer?.value || "");
}

function anchorText(anchor) {
  if (!anchor) return "";
  return anchor.reason ? String(anchor.reason) : `+${anchor.x}, +${anchor.y}`;
}

/**
 * 左栏要列几行。
 *
 * 六槽模式一槽一行，这是模式自己规定的。**直接行动只有一条行动，但发射点是按
 * 六槽行动序号取的**——41 只直接行动的怪物里有 2 只的锚点记录带 bit7 重定向，
 * 六个序号落在六条不同的记录上。那两只得有六行才改得到；其余 39 只六行会是六份
 * 一模一样的东西，只留一行。
 */
function routeRows(route, anchors, selectedSlot) {
  if (route.kind !== "direct-action") {
    return route.slots.map(slot => ({
      slot,
      action: slot.action,
      anchorSlot: Number(slot.slot),
      key: String(Number(slot.slot)),
      label: `槽 ${Number(slot.slot) + 1}`,
      allTargets: slot.allTargets === true,
      where: `模式槽 ${Number(slot.slot) + 1}${slot.allTargets ? " · 全体目标" : ""}`,
    }));
  }
  const only = route.slots[0];
  const distinct = new Set((anchors || []).map(anchorText));
  if (!anchors || distinct.size <= 1) {
    return [{
      slot: only,
      action: only.action,
      anchorSlot: Number(selectedSlot ?? 0),
      key: "direct",
      label: "直接",
      allTargets: only.allTargets === true,
      where: "直接行动",
    }];
  }
  return anchors.map((_anchor, ordinal) => ({
    slot: only,
    action: only.action,
    anchorSlot: ordinal,
    key: "direct",
    label: `序号 ${ordinal + 1}`,
    allTargets: only.allTargets === true,
    where: `直接行动 · 行动序号 ${ordinal + 1}`,
  }));
}

function actionStatusEffects(action) {
  const records = db.peekDocument('battle-result-script', null)?.records || [];
  const resolve = handle => records.find(record => record.handle === handle);
  return battleResultStatusEffects(resolve(action?.fields?.result_script?.value), resolve);
}

function actionRowMarkup(row, anchors, selectedSlot) {
  const action = row.action;
  const visualReference = actionVisualReference(action);
  const anchorSlot = row.anchorSlot;
  const anchor = anchors ? anchors[anchorSlot] || null : null;
  const message = messageState(action);
  const statusEffects = actionStatusEffects(action);
  return `<li class="monster-attack-action-row${
      anchorSlot === Number(selectedSlot) ? " is-selected" : ""}"
      data-monster-attack-action="${esc(action.handle)}"
      data-monster-attack-slot="${esc(row.key)}"
      data-monster-attack-anchor-slot="${anchorSlot}">
    <b class="mono">${esc(row.label)}</b>
    <span class="monster-attack-row-name">${esc(action.name_hint || action.handle)}</span>
    ${statusEffects.length ? `<small>${statusEffects.map(effect => `${
      effect.target === 'role' ? '人物' : '战车'} ${renderModuleComponent(
        effect.target === 'role' ? 'save-role' : 'save-vehicle', 'status-reference', effect)}`).join(' · ')}</small>` : ''}
    ${message.nodeId
      ? `<small class="monster-attack-message-hint"
          data-monster-attack-message-hint>${currentTextReferenceLink(message.nodeId)}</small>`
      : `<small class="monster-attack-message-hint"></small>`}
    ${row.allTargets
      ? `<small class="monster-attack-row-all-targets"
          data-monster-attack-row-all-targets>全体目标</small>`
      : ""}
    <small class="mono monster-attack-row-visual" data-monster-attack-row-visual>${
      visualReference
        ? esc(visualReference)
        : `<span data-monster-attack-row-no-visual>非攻击行为</span>`}</small>
    ${anchor ? `<small class="mono monster-attack-row-anchor"
      data-monster-attack-row-anchor>${esc(anchorText(anchor))}</small>` : ""}
  </li>`;
}

/** 右栏：选中那条行动的全部属性，改发射点也在这里。 */
function inspectorMarkup(row, anchors, record) {
  const action = row.action;
  const visual = action?.fields?.visual_and_counter_initializer || {};
  const visualReference = actionVisualReference(action);
  const anchorSlot = row.anchorSlot;
  const anchor = anchors ? anchors[anchorSlot] || null : null;
  const message = messageState(action);
  return `<div class="monster-attack-inspector"
      data-monster-attack-inspector
      data-monster-attack-action="${esc(action.handle)}"
      data-monster-attack-slot="${esc(row.key)}">
    <div class="section-line">
      <h3>${esc(action.name_hint || "行动")}</h3>
      <span class="mono">${esc(action.handle)}</span>
    </div>
    <dl class="monster-attack-facts">
      <div><dt>位置</dt><dd>${esc(row.where)}</dd></div>
      <div><dt>消息记录</dt><dd class="mono">${
        esc(String(action?.fields?.message?.value || "无消息记录"))}</dd></div>
      ${visualReference
        ? `<div><dt>战斗文本</dt><dd>${currentTextReferenceLink(message.nodeId)}</dd></div>`
        : ""}
      <div><dt>结果脚本</dt><dd class="mono">${
        esc(String(action?.fields?.result_script?.value || "—"))}</dd></div>
      ${actionStatusEffects(action).map(effect => `<div><dt>${effect.target === 'role' ? '人物' : '战车'}状态</dt><dd>${
          renderModuleComponent(effect.target === 'role' ? 'save-role' : 'save-vehicle',
            'status-reference', effect)}</dd></div>`).join('')}
    </dl>
    ${anchor ? anchorFieldsMarkup(anchor, anchorSlot, record) : ""}
    <div class="monster-attack-visual-field">
      <span class="monster-attack-visual-label">${visualReference ? "攻击特效" : "战斗文本"}</span>
      ${visualReference
        ? `<animated-resource-picker data-monster-attack-visual
            data-monster-attack-action-handle="${esc(action.handle)}"
            data-monster-attack-current-visual="${esc(visualReference)}"></animated-resource-picker>
          ${resetToOriginalButton(action.handle, {title: "恢复这条行动的原始攻击特效"})}
          <small>重复计数类别 ${esc(visual.repeat_counter_class ?? "—")}</small>`
        : message.nodeId ? currentTextReferenceLink(message.nodeId)
          : `<small>${esc(message.reason || "无战斗文本")}</small>`}
    </div>
  </div>`;
}

function unavailableMarkup(error) {
  return `<div class="record-preview monster-attack-effects-error"
    data-monster-attack-effects-error>${esc(error?.message || error)}</div>`;
}

/**
 * 一只怪物的行动路径，拆成左栏清单与右栏属性两块。
 *
 * 返回两段而不是一整块：它们在内嵌战斗场景的外壳里分处两列，中间隔着场景画布。
 * 一次算好模型两边共用，出错时两边都换成同一条错误。
 */
export function monsterAttackRoutePanes(monster, {
  documents = null,
  anchors = null,
  selectedSlot = null,
  anchorRecord = null,
} = {}) {
  try {
    const {route} = monsterAttackEffectModel(monster, documents);
    const routeLabel = route.kind === "direct-action"
      ? `策略 ${route.strategyId} → 直接行动`
      : `策略 ${route.strategyId} → 六槽模式 ${route.pattern.handle}`;
    const rows = routeRows(route, anchors, selectedSlot);
    const selected = rows.find(row => row.anchorSlot === Number(selectedSlot))
      || rows[0];
    return {
      list: `<section class="monster-attack-effects"
          data-monster-attack-effects
          data-monster-attack-route-kind="${esc(route.kind)}"
          data-monster-attack-strategy="${route.strategyId}"
          data-monster-attack-action-count="${route.slots.length}"
          ${anchors ? `data-monster-attack-embedded="1"` : ""}
          data-monster-attack-writeback="available">
        <div class="section-line"><h3>行动</h3><span>${esc(routeLabel)}</span></div>
        <ul class="monster-attack-action-list">${rows.map(
          row => actionRowMarkup(row, anchors, selectedSlot),
        ).join("")}</ul>
      </section>`,
      inspector: inspectorMarkup(selected, anchors, anchorRecord),
      action: selected.action,
      // 场景上只标列出来的那几个落点：列表里没有的序号，这里也改不到。
      anchorSlots: rows.map(row => row.anchorSlot),
      allTargets: selected.allTargets === true,
      playableSlot: actionVisualReference(selected.action)
        && anchors?.[selected.anchorSlot]?.playable
        ? selected.anchorSlot
        : null,
      nonAttack: !actionVisualReference(selected.action),
    };
  } catch (error) {
    const failure = unavailableMarkup(error);
    return {
      list: failure, inspector: failure,
      action: null,
      anchorSlots: [], allTargets: false, playableSlot: null, nonAttack: false,
    };
  }
}

const visualFieldBindings = new WeakMap();

/** 当前值、列表说明与候选共同读取 owner 字段；持有的行动文档是字段视图。 */
export async function bindMonsterAttackEffectPreviews(root = document, documents = null) {
  root.querySelectorAll(".current-text-reference").forEach(link => {
    link.addEventListener("click", event => {
      event.stopImmediatePropagation();
      void import("../../core/resource-nav.js").then(({navigateToResourceTarget}) =>
        navigateToResourceTarget(link.dataset.resourceTarget));
    });
  });
  const pickers = [...root.querySelectorAll("animated-resource-picker[data-monster-attack-visual]")];
  if (!pickers.length) return;
  const options = monsterAttackVisualOptions(), rootRef = new WeakRef(root);
  const catalog = await loadEntityCatalog();
  const facets = new Map();
  await Promise.all(pickers.map(async picker => {
    const monsterId = Number(picker.closest("monster-attack-anchor")?.dataset.monsterId);
    if (!Number.isInteger(monsterId)) throw new TypeError("攻击特效选择器缺少怪物身份");
    if (!facets.has(monsterId)) facets.set(monsterId, entityFacetFields(db,
      catalog.handleFor("monster", monsterId), "action_visual_selector", {catalog}));
    const facet = await facets.get(monsterId);
    const action = ownerRecords(ENEMY_ACTION_RESOURCE_ID, documents).find(record => record.handle === picker.dataset.monsterAttackActionHandle);
    if (!action) throw new TypeError("攻击特效选择器没有已发布行动");
    configureAnimatedResourcePicker(picker, {options, value: actionVisualReference(action),
      renderPreview: visualPreview,
      paintPreview: previewRoot => paintAttackVisualCanvases(previewRoot, effectAssets()),
      setPreviewActive: setWeaponEffectPreviewPlayback});
    const field = facet.fields.find(candidate => candidate.entityHandle === action.handle
      && candidate.fieldName === "visual_selector");
    if (!field) throw new TypeError(`行动视觉切面缺少 ${action.handle}`);
    if (!picker.isConnected) return;
    visualFieldBindings.get(picker)?.();
    visualFieldBindings.set(picker, field.bind(picker, target => {
      const reference = actionVisualReference(action);
      target.dataset.monsterAttackCurrentVisual = reference;
      target.value = reference;
      rootRef.deref()?.querySelectorAll(`[data-monster-attack-action="${action.handle}"] [data-monster-attack-row-visual]`)
        .forEach(node => {node.textContent = reference;});
      target.dataset.monsterAttackFieldReady = "1";
    }));
  }));
}
