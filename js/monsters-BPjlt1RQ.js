import { resetToOriginalButton, bindFieldResetToOriginalButtons, bindFixedTextEditors, fixedTextRecordText, dataTable, fixedTextEditorMarkup } from './pattern-pixel-editor-B8puYQ8A.js';
import { esc, canvasViewportPoint, recordUid, paintAttackVisualCanvases, setWeaponEffectPreviewPlayback, attackVisualCanvas, currentTextReferenceLink, renderModuleComponent, screenWorkbench, screenWorkbenchCanvasStage, requireBrowserProjectRepository, setProjectFields, paintMonsterFigureCanvases, monsterFigureCanvas, $, resourceForwardReferenceCell, audioCommandLabel } from './element-tree-DsgOBeTK.js';
import { db, hex, battleResultStatusEffects, createAutoSave, monsterOwnerRecord, monsterPaletteIdentity, projectMonsterFigureFields, monsterPaletteSelector, monsterPalettePairs, ITEM_CATEGORIES } from './battle-result-script-runtime-B_EClFew.js';
import { loadEntityCatalog, entityFacetFields, entityPreviewInput, entityPeekPreviewInput, entityPreviewInputs } from './vehicle-field-session-CBRi3Az7.js';
import { state } from './emulator-DynsZsth.js';
import { zonesByMonster } from './encounter-DuEBgoNG.js';
import { configureAttackVisualPicker, fieldAddressTable, mountFieldObjectNumber, mountFieldObjectSelect, mountFieldObjectReset, mountFieldObjectEditor, attackVisualAssets } from './rectangle-preset-controls-vTa_haKM.js';
import { configureAnimatedResourcePicker } from './scene-elevators-N46oPTJC.js';
import { paletteSwatches, recordPage, panel, fields } from './record-BUqGpJTU.js';
import { handleMarkup } from './preview-DMSrQMyk.js';
import { bindMonsterAttributeDetails } from './text-record-structure-editor-nkc-6gHL.js';
import { editorLog } from './visual-metasprites-DJP54-bV.js';
import { messageState, battleScenePreviewCatalog, battleScenePreviewDefaults, normalizeBattleScenePreview, battlePartyVisualPosition, battleSceneActiveEnemySlots, battleSceneEntityAttackSources, battleSceneAttackLaunchAnchor } from './battle-actors-B548R92n.js';
import { ensureBattleSceneData } from './overview-CxFLx7O1.js';
import { playBattleSceneComposerAttack, paintBattleSceneComposerCanvas } from './battle-simulation-player-ZYN9IgYB.js';
import { battleSceneComposerCanvas } from './battle-scene-composer-2IiON3Cb.js';
import './visual-components-jpzfYr1D.js';

// @editor-module 从怪物行动属性栏搬出的发射点控件。坐标语义与写入由各 owner 提供。

function anchorFieldsMarkup(anchor, anchorSlot, record, {
  prefix = "monster-attack-anchor",
  xLabel = "X（相对占格左边）",
  yLabel = "Y（相对占格顶边）",
  xMin = 0, xMax = 127, yMin = 0, yMax = 127,
  title = "发射点", marker = "",
  readout = `+${anchor.x}, +${anchor.y}`,
} = {}) {
  if (anchor.reason) {
    return '';
  }
  return `<div class="monster-attack-anchor-fields">
    <div class="section-line"><h3>${esc(title)}${marker}</h3>
      <span class="mono" data-${prefix}-readout>${esc(readout)}</span></div>
    <label><small>${esc(xLabel)}</small>
      <input type="number" min="${xMin}" max="${xMax}" value="${anchor.x}"
        data-${prefix}-x></label>
    <label><small>${esc(yLabel)}</small>
      <input type="number" min="${yMin}" max="${yMax}" value="${anchor.y}"
        data-${prefix}-y></label>
    ${record && prefix === "monster-attack-anchor"
      ? resetToOriginalButton(record.recordId, {title: "恢复这条发射点记录的原值"}) : ""}
    ${record ? `<small class="mono">记录 ${record.recordId}${
      record.redirected ? " · 按行动槽重定向" : ""}${
      record.sharing > 1 ? ` · 被 ${record.sharing} 处用到` : ""}</small>` : ""}
  </div>`;
}

function paintAnchorMarkers(host, {canvas, slots, selectedSlot,
  prefix = 'monster-attack-anchor'} = {}) {
  if (!host || !canvas) return;
  host.innerHTML = slots.map(({slot, x, y, scene}) => `<i data-${prefix}-marker="${slot}"
    class="${slot === selectedSlot ? 'is-current' : ''}"
    style="left:${(scene.x / canvas.width * 100).toFixed(2)}%;top:${(scene.y / canvas.height * 100).toFixed(2)}%"
    title="槽 ${slot}　+${x}, +${y}"></i>`).join('');
}

function bindAnchorMarkerDrag(root, {canvas, origin, selectedSlot, anchor,
  canEdit = () => true, onSelect, onCommit, onError,
  prefix = 'monster-attack-anchor'} = {}) {
  const markerSelector = `[data-${prefix}-marker]`;
  const markerKey = `data-${prefix}-marker`;
  const preview = point => {
    const marker = root.querySelector(`${markerSelector}[${markerKey}="${selectedSlot()}"]`);
    const surface = canvas(), offset = origin();
    if (marker && surface && offset) {
      marker.style.left = `${((offset.x + point.x) / surface.width * 100).toFixed(2)}%`;
      marker.style.top = `${((offset.y + point.y) / surface.height * 100).toFixed(2)}%`;
    }
    const readout = root.querySelector(`[data-${prefix}-readout]`);
    if (readout) readout.textContent = `+${point.x}, +${point.y}`;
    for (const axis of ['x', 'y']) {
      const input = root.querySelector(`[data-${prefix}-${axis}]`);
      if (input) input.value = String(point[axis]);
    }
  };
  const pointAt = event => {
    const surface = canvas(), offset = origin();
    if (!surface || !offset) return null;
    const point = canvasViewportPoint(surface, event);
    for (const axis of ['x', 'y']) {
      const input = root.querySelector(`[data-${prefix}-${axis}]`);
      if (!input || !Number.isFinite(point[axis])) return null;
      point[axis] = Math.max(Number(input.min), Math.min(Number(input.max), Math.round(point[axis] - offset[axis])));
    }
    return point;
  };
  root.addEventListener('pointerdown', event => {
    const marker = event.target.closest?.(markerSelector);
    if (!marker || event.button !== 0) return;
    event.preventDefault();
    const slot = Number(marker.getAttribute(markerKey));
    if (slot !== selectedSlot()) {
      Promise.resolve(onSelect?.(slot)).catch(onError);
      return;
    }
    if (!canEdit() || anchor()?.reason) return;
    let point = pointAt(event);
    if (!point) return;
    const initial = {x: anchor().x, y: anchor().y};
    const pointerId = event.pointerId;
    marker.setPointerCapture(pointerId);
    marker.classList.add('is-dragging');
    preview(point);
    const move = next => {
      if (next.pointerId !== pointerId) return;
      point = pointAt(next) || point;
      preview(point);
    };
    const finish = next => {
      if (next.pointerId !== pointerId) return;
      marker.removeEventListener('pointermove', move);
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) marker.removeEventListener(type, finish);
      marker.classList.remove('is-dragging');
      if (marker.hasPointerCapture(pointerId)) marker.releasePointerCapture(pointerId);
      if (next.type !== 'pointerup') {preview(initial); return;}
      point = pointAt(next) || point;
      preview(point);
      if (point.x !== initial.x || point.y !== initial.y) Promise.resolve(onCommit?.(point)).catch(onError);
    };
    marker.addEventListener('pointermove', move);
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) marker.addEventListener(type, finish);
  });
}

// @editor-module 怪物 → 行动 → 攻击视觉配置面
//
// 路径只消费各 owner 已发布的语义：怪物攻击档案给出策略与直接行动／模式 ID，
// enemy-action-pattern 给出六槽引用，enemy-action 给出视觉资源引用。页面不解释任何
// packed byte；选择结果只改 enemy-action owner 的语义字段，packed byte 与另一半位域
// 由 owner codec 编码和保持。


const ENEMY_ACTION_RESOURCE_ID = "enemy-action";
const ENEMY_ACTION_PATTERN_RESOURCE_ID = "enemy-action-pattern";
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
function monsterAttackProfile(monsterId) {
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
function monsterAttackEffectModel(monster, documents = null) {
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
  return anchor.reason ? '' : `+${anchor.x}, +${anchor.y}`;
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

function actionRowMarkup(row, selectedSlot) {
  const action = row.action;
  const anchorSlot = row.anchorSlot;
  return `<li class="monster-attack-action-row${
      anchorSlot === Number(selectedSlot) ? " is-selected" : ""}"
      data-monster-attack-action="${esc(action.handle)}"
      data-monster-attack-slot="${esc(row.key)}"
      data-monster-attack-anchor-slot="${anchorSlot}">
    <b class="mono">${esc(row.label)}</b>
    <span class="monster-attack-row-name">${esc(action.name_hint || '行动')}</span>
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
      ${row.allTargets ? '<div><dt>目标</dt><dd data-monster-attack-row-all-targets>全体目标</dd></div>' : ''}
      <div><dt>视觉</dt><dd data-monster-attack-row-visual>${visualReference
        ? esc(visualReference) : '<span data-monster-attack-row-no-visual>非攻击行为</span>'}</dd></div>
      ${anchor ? `<div><dt>源点</dt><dd data-monster-attack-row-anchor>${esc(anchorText(anchor))}</dd></div>` : ''}
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

/** 左栏只列行动名；所选行动的属性与错误显示在右栏。 */
function monsterAttackRoutePanes(monster, {
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
        <div class="section-line"><h3>行动</h3></div>
        <ul class="monster-attack-action-list">${rows.map(
          row => actionRowMarkup(row, selectedSlot),
        ).join("")}</ul>
      </section>`,
      inspector: `<p>${esc(routeLabel)}</p>${inspectorMarkup(selected, anchors, anchorRecord)}`,
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
      list: '<h3>行动</h3>', inspector: failure,
      action: null,
      anchorSlots: [], allTargets: false, playableSlot: null, nonAttack: false,
    };
  }
}

const visualFieldBindings = new WeakMap();

/** 当前值、列表说明与候选共同读取 owner 字段；持有的行动文档是字段视图。 */
async function bindMonsterAttackEffectPreviews(root = document, documents = null) {
  root.querySelectorAll(".current-text-reference").forEach(link => {
    link.addEventListener("click", event => {
      event.stopImmediatePropagation();
      void import('./preview-sound-DsPhxRYS.js').then(function (n) { return n.resourceNav; }).then(({navigateToResourceTarget}) =>
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


const ELEMENT_NAME$1 = "monster-attack-anchor";
const VISUAL_MONSTERS_RESOURCE_ID = "monster-visual-layout";
const ANCHOR_REGION = "attack_source_anchor_region";
const SELECTION_SLOTS = 6;
const controllers = new WeakMap();

function repository$1() {
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
  const source = repository$1();
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

async function hydrate$1(element) {
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

const HTMLElementBase$1 = globalThis.HTMLElement || class {};

if (globalThis.customElements && globalThis.HTMLElement
    && !globalThis.customElements.get(ELEMENT_NAME$1)) {
  globalThis.customElements.define(ELEMENT_NAME$1, class extends HTMLElementBase$1 {
    connectedCallback() {
      if (this.dataset.monsterAttackAnchorBound === "1") return;
      this.dataset.monsterAttackAnchorBound = "1";
      void hydrate$1(this).catch(error => {
        editorLog.error("编辑页面", `操作失败：${error?.message || error}`, error);
        this.dataset.monsterAttackAnchorState = "error";
        this.dataset.monsterAttackAnchorError = String(error?.message || error);
        this.innerHTML = `<p class="resource-empty">攻击源锚点不可用：${
          esc(error?.message || error)}</p>`;
      });
    }
  });
}

function monsterAttackAnchorMarkup(monsterId) {
  return `<${ELEMENT_NAME$1} data-monster-id="${Number(monsterId)}"></${ELEMENT_NAME$1}>`;
}

// @editor-module 为怪物视觉作者面板共享一条串行自动保存队列。
// monster-visual-layout 的四块作者面板同屏出现，并且共同写一份资源。它们必须共用一条
// createAutoSave 队列；各建一条会让两个面板在同一防抖窗口后并发读到同一个版本。


createAutoSave(
  payload => payload.write(payload),
  {onError: (error, key) => key.onError?.(error)},
);

// @editor-module monster-figure 的怪物形象组合作者工具
//
// 怪物名称、图形、单调色板与双调色板仍由各自 owner component 提供候选和预览；
// 本页写 monster-figure 的两条引用；monster-visual-layout 仅供组合预览。


const MONSTER_FIGURE_AUTHORING_MODULE_ID = "monster-visual-layout";
const FIGURE_MODULE_ID = "monster-figure";
const GRAPHIC_MODULE_ID$1 = "monster-graphic";

function integerId(value, label) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < 0 || result > 0xff) {
    throw new TypeError(`${label} 必须是 0..255 的整数 ID`);
  }
  return result;
}

function uniqueRecord(records, id, label) {
  if (!Array.isArray(records)) throw new TypeError(`${label} 不是记录列表`);
  const matches = records.filter(record => Number(record?.id) === id);
  if (matches.length !== 1) throw new TypeError(`${label} 不是唯一记录`);
  return matches[0];
}

function paletteIdentity(documentValue, rawCode) {
  return monsterPaletteIdentity(documentValue, integerId(rawCode, "怪物调色板选择"));
}

function encodedPaletteIdentity(documentValue, moduleId, rawId) {
  return monsterPaletteSelector(documentValue, moduleId, integerId(rawId, "怪物调色板引用"));
}

/**
 * Read one enemy's semantic figure references. The selector byte never leaves
 * this owner boundary; callers receive a palette owner plus its stable ID.
 */
function monsterFigureSelection(documentValue, enemyValue) {
  const enemyId = integerId(enemyValue, "怪物");
  const enemy = uniqueRecord(
    documentValue?.enemies,
    enemyId,
    `monster-visual-layout 怪物 ${enemyId}`,
  );
  const graphicId = integerId(enemy.graphic_id, "怪物图形引用");
  uniqueRecord(documentValue?.graphics, graphicId, `怪物图形 ${graphicId}`);
  return Object.freeze({
    enemyId,
    graphicId,
    ...paletteIdentity(documentValue, enemy.palette_code),
  });
}

function normalizedSelection(documentValue, enemyId, selection) {
  if (!selection || typeof selection !== "object" || Array.isArray(selection)) {
    throw new TypeError("怪物形象选择必须是语义引用对象");
  }
  const graphicId = integerId(selection.graphicId, "怪物图形引用");
  uniqueRecord(documentValue?.graphics, graphicId, `怪物图形 ${graphicId}`);
  const paletteModuleId = String(selection.paletteModuleId || "");
  const paletteId = integerId(selection.paletteId, "怪物调色板引用");
  encodedPaletteIdentity(documentValue, paletteModuleId, paletteId);
  return Object.freeze({enemyId, graphicId, paletteModuleId, paletteId});
}

/** Persist exactly one monster's graphic and palette-owner references. */
async function saveMonsterFigureSelection(
  repository,
  enemyValue,
  selection,
  {expectedVersion} = {},
) {
  if (requireBrowserProjectRepository(state) !== repository) throw new Error("怪物形象字段不属于当前项目会话");
  const enemyId = integerId(enemyValue, "怪物");
  const visual = await db.readResource(MONSTER_FIGURE_AUTHORING_MODULE_ID);
  const normalized = normalizedSelection(visual.value.document, enemyId, selection);
  const [graphics, palettes] = await Promise.all([
    db.readResource(GRAPHIC_MODULE_ID$1),
    db.readResource(normalized.paletteModuleId),
  ]);
  const graphic = monsterOwnerRecord(graphics.value.document, normalized.graphicId, GRAPHIC_MODULE_ID$1);
  const palette = monsterOwnerRecord(palettes.value.document, normalized.paletteId, normalized.paletteModuleId);
  const fields = await monsterFigureFields(enemyId), values = [graphic.id, palette.id];
  const changed = fields.some((field, index) => field.value !== values[index]);
  await setProjectFields(db, fields.map((field, index) => ({field, value: values[index]})), {expectedVersion});
  return savedFigureProjection(fields, changed);
}

async function monsterFigureFields(rawId) {
  const id = integerId(rawId, "怪物");
  const owner = await db.readResource(FIGURE_MODULE_ID);
  const row = monsterOwnerRecord(owner.value.document, id, FIGURE_MODULE_ID);
  return Promise.all(["graphic_selector", "palette_selector"].map(name => db.getField(FIGURE_MODULE_ID, row.handle, name)));
}

async function savedFigureProjection(fields, changed) {
  const [resolved, owner] = await Promise.all([
    db.readResource(MONSTER_FIGURE_AUTHORING_MODULE_ID),
    db.readResource(FIGURE_MODULE_ID),
  ]);
  return {...resolved, changed, value: projectMonsterFigureFields(resolved.value, owner.value),
    ownerVersions: {[FIGURE_MODULE_ID]: fields[0].version}};
}

// @editor-module 怪物表里的「形象 ＋ 调色板」一格
//
// **两条引用一起挑。** 图形只有 2 bit 像素索引，颜色全由 palette 决定——单看哪一边
// 都判断不了配出来是什么样。所以用同一个选择器的两栏：左栏形象、右栏调色板，
// 每一栏的候选都按**另一栏当前的值**画出来，挑哪边都能立刻看到合起来的结果。
//
// 调色板是独立池，不隶属某个形象：74 条单色板与 27 条双色组合是独立记录，
// 131 只怪物引用 79 个图形，各自配自己的调色板——「换色不换图」就是这么来的。
// 所以右栏始终列出完整的调色板清单，不随左栏变。
//
// 候选与写回都走 owner：`monsterFigureSelection` 解出当前两条引用，
// `saveMonsterFigureSelection` 写回，本模块不解 `palette_code` 的编码。


const ELEMENT_NAME = "monster-figure-field";
const GRAPHIC_MODULE_ID = "monster-graphic";
const PALETTE_MODULE_ID = "monster-palette";
const PALETTE_PAIR_MODULE_ID = "monster-palette-pair";
const PREVIEW_BOX = 72;

function repository() {
  const value = state.projectRepository;
  if (!value?.resolve) throw new TypeError("当前浏览器项目 repository 不可用");
  return value;
}

/** 从字段对象投影当前形象引用；保存/重置会统一使 db 正文失效。 */
async function monsterVisualDocument(enemyId) {
  const catalog = await loadEntityCatalog();
  const target = catalog.handleFor("monster", enemyId);
  const [, figureFields] = await Promise.all([
    entityPreviewInput(db, target, "monster.figure", MONSTER_FIGURE_AUTHORING_MODULE_ID, {catalog}),
    db.readResource("monster-figure"),
  ]);
  const documentValue = entityPeekPreviewInput(db, target, "monster.figure",
    MONSTER_FIGURE_AUTHORING_MODULE_ID);
  if (!documentValue) throw new TypeError("monster-visual-layout owner 资产不可用");
  return {document: projectMonsterFigureFields({document: documentValue}, figureFields.value).document,
    version: figureFields.version, target, catalog};
}

async function monsterVisualSource(enemyId) {
  const source = repository();
  const current = await monsterVisualDocument(enemyId);
  const inputs = await entityPreviewInputs(db, current.target, "monster.figure", {catalog: current.catalog});
  const graphicDocument = inputs[GRAPHIC_MODULE_ID];
  return {
    repository: source,
    version: current.version,
    document: current.document,
    graphics: graphicDocument?.records || [],
  };
}

function idText(value) {
  return Number(value).toString(16).toUpperCase().padStart(2, "0");
}

/** 一条引用实际用到的单色板号：双色组合摊成两条，单色板就是它自己。 */
function paletteIdsOf(documentValue, moduleId, paletteId) {
  if (moduleId !== PALETTE_PAIR_MODULE_ID) return [Number(paletteId)];
  const pair = monsterPalettePairs(documentValue).find(item =>
    Number(item.id) === Number(paletteId));
  return [pair?.first_palette_id, pair?.second_palette_id]
    .filter(value => value !== undefined && value !== null).map(Number);
}

function paletteValue(moduleId, paletteId) {
  return `${moduleId}:${Number(paletteId)}`;
}

function graphicOptions(graphics) {
  return graphics.map(item => {
    const id = Number(item.id);
    const handle = item.handle || `${GRAPHIC_MODULE_ID}:${idText(id)}`;
    return {
      value: String(id),
      handle,
      label: idText(id),
      searchText: `${id} ${idText(id)} ${handle}`,
      kind: "graphic",
      id,
    };
  });
}

function paletteOptions(documentValue) {
  return [
    ...(documentValue.palettes || []).map(item => {
      const id = Number(item.id);
      return {
        value: paletteValue(PALETTE_MODULE_ID, id),
        handle: `${PALETTE_MODULE_ID}:${idText(id)}`,
        label: idText(id),
        searchText: `${id} ${idText(id)} ${PALETTE_MODULE_ID} 单色板`,
        kind: "palette",
        paletteIds: [id],
      };
    }),
    ...monsterPalettePairs(documentValue).map(item => {
      const id = Number(item.id);
      return {
        value: paletteValue(PALETTE_PAIR_MODULE_ID, id),
        handle: `${PALETTE_PAIR_MODULE_ID}:${idText(id)}`,
        label: `双 ${idText(id)}`,
        searchText: `${id} ${idText(id)} ${PALETTE_PAIR_MODULE_ID} 双色组合`,
        kind: "palette",
        paletteIds: paletteIdsOf(documentValue, PALETTE_PAIR_MODULE_ID, id),
      };
    }),
  ];
}

/** 一条单色板的三个色号。 */
function paletteColors(documentValue, paletteId) {
  return (documentValue.palettes || []).find(item =>
    Number(item.id) === Number(paletteId))?.colors || [];
}

/**
 * 调色板画它自己，不画「用它渲染出来的怪物」。
 *
 * 用怪物去表示调色板，一栏 101 个候选就是 101 只同样的怪物，只有颜色差别，还占
 * 满整格；色带本身既紧凑又直白。双色组合画两条——它就是两条单色板拼起来的。
 * 换成新调色板之后左栏那 79 个形象会整体按新色重画，搭配效果在那边看。
 */
function paletteSwatchMarkup(documentValue, paletteIds) {
  return `<span class="monster-palette-candidate">${paletteIds.map(id =>
    paletteSwatches(paletteColors(documentValue, id),
      {className: "palette-swatches is-wide"})).join("")}</span>`;
}

/**
 * 候选的预览：形象栏画「配上当前调色板是什么样」，调色板栏画调色板本身。
 *
 * 形象那边两边都换就成了另一只怪物，回答不了「这一格改成它会变成什么样」。
 */
function candidatePreview(documentValue, values, option) {
  if (option.kind === "palette") {
    return paletteSwatchMarkup(documentValue, option.paletteIds);
  }
  const [currentModuleId, currentPaletteId] =
    String(values.palette || "").split(":");
  return monsterFigureCanvas({
    graphicId: option.id,
    paletteIds: paletteIdsOf(documentValue, currentModuleId, currentPaletteId),
    box: PREVIEW_BOX,
    label: option.handle,
  });
}

/**
 * 表格里那一行的当前值：形象写编号，调色板**直接画出来**。
 *
 * 「双 00」既占一行又看不出是什么色；色带自己就说清楚了，双色组合两条也一眼分得开。
 */
function currentLabelMarkup(documentValue, {values}) {
  const [moduleId, paletteId] = String(values.palette || "").split(":");
  return `<span class="monster-figure-field-label">
    <span class="mono">${idText(values.graphic)} <span title="暂时不写进 ROM">※</span></span>
    ${paletteSwatchMarkup(documentValue, paletteIdsOf(documentValue, moduleId, paletteId))}
  </span>`;
}

async function save(element, picker) {
  const enemyId = Number(element.dataset.enemyId);
  const values = picker.values || {};
  const [paletteModuleId, paletteId] = String(values.palette || "").split(":");
  const source = await monsterVisualSource(enemyId);
  const current = monsterFigureSelection(source.document, enemyId);
  const next = {
    ...current,
    graphicId: Number(values.graphic),
    paletteModuleId,
    paletteId: Number(paletteId),
  };
  if (Number(next.graphicId) === Number(current.graphicId)
      && next.paletteModuleId === current.paletteModuleId
      && Number(next.paletteId) === Number(current.paletteId)) return;
  await saveMonsterFigureSelection(
    source.repository, enemyId, next, {expectedVersion: source.version});
  db.invalidateResource(MONSTER_FIGURE_AUTHORING_MODULE_ID);
  await monsterVisualSource(enemyId);
  element.dataset.monsterFigureFieldGraphic = String(next.graphicId);
  element.dataset.monsterFigureFieldPalette =
    paletteValue(next.paletteModuleId, next.paletteId);
}

async function hydrate(element) {
  const enemyId = Number(element.dataset.enemyId);
  if (!Number.isInteger(enemyId)) {
    throw new TypeError("monster-figure-field 缺少 data-enemy-id");
  }
  const source = await monsterVisualSource(enemyId);
  const selection = monsterFigureSelection(source.document, enemyId);
  element.innerHTML = "<animated-resource-picker></animated-resource-picker>";
  const picker = element.querySelector("animated-resource-picker");
  configureAnimatedResourcePicker(picker, {
    panes: [
      {
        id: "graphic",
        label: "形象",
        options: graphicOptions(source.graphics),
        value: String(selection.graphicId),
      },
      {
        id: "palette",
        label: "调色板",
        options: paletteOptions(source.document),
        value: paletteValue(selection.paletteModuleId, selection.paletteId),
      },
    ],
    renderPreview: (option, {values}) => candidatePreview(source.document, values, option),
    renderLabel: context => currentLabelMarkup(source.document, context),
    paintPreview: root => paintMonsterFigureCanvases(root),
  });
  element.dataset.monsterFigureFieldGraphic = String(selection.graphicId);
  element.dataset.monsterFigureFieldPalette =
    paletteValue(selection.paletteModuleId, selection.paletteId);
  element.dataset.monsterFigureFieldState = "ready";
}

function idleMarkup(element, documentValue) {
  const enemyId = Number(element.dataset.enemyId);
  if (!Number.isInteger(enemyId)) {
    throw new TypeError("monster-figure-field 缺少 data-enemy-id");
  }
  // 当前形象引用来自 monster-figure 字段投影；候选等打开选择器时再读取。
  const selection = monsterFigureSelection(documentValue, enemyId);
  element.dataset.monsterFigureFieldGraphic = String(selection.graphicId);
  element.dataset.monsterFigureFieldPalette =
    paletteValue(selection.paletteModuleId, selection.paletteId);
  element.dataset.monsterFigureFieldState = "idle";
  return `<button class="animated-resource-trigger" type="button"
      data-monster-figure-field-open aria-haspopup="dialog"
      aria-label="编辑怪物 ${idText(enemyId)} 的形象与调色板">
    <span class="animated-resource-current">
      <span class="animated-resource-current-preview" aria-hidden="true">${
        monsterFigureCanvas({graphicId: selection.graphicId,
          paletteIds: paletteIdsOf(documentValue, selection.paletteModuleId, selection.paletteId),
          box: PREVIEW_BOX, label: `怪物 ${idText(enemyId)}`})
      }</span>
      ${currentLabelMarkup(documentValue, {values: {
        graphic: String(selection.graphicId),
        palette: paletteValue(selection.paletteModuleId, selection.paletteId),
      }})}
    </span>
    <span class="animated-resource-chevron" aria-hidden="true">▾</span>
  </button>`;
}

function showHydrationError(element, error) {
  element.dataset.monsterFigureFieldState = "error";
  element.dataset.monsterFigureFieldError = String(error?.message || error);
  element.innerHTML = `<span class="resource-empty">${esc(
    error?.message || error)}</span>`;
}

const HTMLElementBase = globalThis.HTMLElement || class {};

if (globalThis.customElements && globalThis.HTMLElement
    && !globalThis.customElements.get(ELEMENT_NAME)) {
  globalThis.customElements.define(ELEMENT_NAME, class extends HTMLElementBase {
    connectedCallback() {
      if (this.dataset.monsterFigureFieldBound === "1") return;
      this.dataset.monsterFigureFieldBound = "1";
      // **别让选择器的点击落到行上。** 这一格坐在 `tr[data-record-link]` 里，
      // 行点击会跳去记录页；触发器是 `<button>`，行绑定会跳过它，但对话框里的
      // 候选卡是挂在 `<dialog>` 上的，冒泡路径仍然经过这一行。
      this.addEventListener("click", event => {
        event.stopPropagation();
        const trigger = event.target.closest?.("[data-monster-figure-field-open]");
        if (!trigger || this.dataset.monsterFigureFieldState === "loading") return;
        event.preventDefault();
        trigger.disabled = true;
        this.dataset.monsterFigureFieldState = "loading";
        void hydrate(this).then(() => {
          this.querySelector("animated-resource-picker")?.open();
        }).catch(error => showHydrationError(this, error));
      });
      this.addEventListener("change", event => {
        const picker = event.target.closest?.("animated-resource-picker");
        if (!picker) return;
        void save(this, picker).catch(error => {
          this.dataset.monsterFigureFieldError = String(error?.message || error);
        });
      });
      // 列表冷启动也必须声明这份来源；不能依赖此前打开详情留下的缓存。
      const enemyId = Number(this.dataset.enemyId);
      void monsterVisualDocument(enemyId).then(async source => {
        if (!this.isConnected) return;
        const preview = document.createElement('template');
        preview.innerHTML = idleMarkup(this, source.document);
        await paintMonsterFigureCanvases(preview.content);
        if (this.isConnected) this.replaceChildren(preview.content);
      }).catch(error => showHydrationError(this, error));
    }
  });
}

function monsterFigureFieldMarkup(enemyId) {
  return `<${ELEMENT_NAME} data-enemy-id="${Number(enemyId)}"></${ELEMENT_NAME}>`;
}

// @editor-module 怪物属性字段对象与编辑



//
// 来源：拆分前 engine/editor/app.js 第 9368-9488;10987-11086 行。


const monsterRecordFields = [
  ["flags", "总标志"], ["packed_a", "压缩属性 A"], ["packed_b", "压缩属性 B"],
  ["hp", "HP"], ["attack", "攻击"], ["defense", "防御"], ["speed", "速度"],
  ["attack_code", "攻击码"], ["defense_code", "防御码"],
  ["experience_code", "经验值"], ["gold_code", "掉落金钱"],
];

function copyEditorDraft(value) {
  return JSON.parse(JSON.stringify(value));
}

let monsterNameEditors = null;
let monsterNameHandles = null;

async function prepareMonsterNameFacets(monsters) {
  const catalog = await loadEntityCatalog();
  const facets = await Promise.all(monsters.map(monster =>
    entityFacetFields(db, catalog.handleFor("monster", Number(monster.id)),
      "name", {catalog})));
  return new Map(monsters.map((monster, index) => {
    const records = facets[index].records;
    if (records.length !== 1) throw new TypeError(`怪物名称切面记录数无效：${monster.id}`);
    return [Number(monster.id), records[0].entityHandle];
  }));
}

function useMonsterNameFacets(handles) {
  monsterNameHandles = handles;
}

function monsterNameRecordId(monster) {
  const handle = monsterNameHandles?.get(Number(monster.id));
  if (!handle) throw new TypeError(`怪物名称切面未准备：${monster.id}`);
  return handle;
}

function monsterNameDecodedText(monster) {
  return fixedTextRecordText(monsterNameRecordId(monster));
}

function monsterNameControl(monster) {
  return fixedTextEditorMarkup({
    recordId: monsterNameRecordId(monster),
    label: "名称", mode: "exact", compact: true,
  });
}

function monsterNameDraftError() {
  return monsterNameEditors?.error || "";
}

function monsterEditorStatus() {
  if (state.monsterBuilding) return "正在生成新的 ROM…";
  if (state.monsterMessage) return state.monsterMessage;
  return monsterNameDraftError();
}

function monsterEditorToolbar() {
  const error = monsterNameDraftError();
  const status = monsterEditorStatus();
  return `<div class="data-editor-toolbar">
    <p id="monster-save-state"
      class="${error ? "invalid" : ""}" ${status ? "" : "hidden"}>${esc(status)}</p>
  </div>`;
}

/**
 * 一只怪物的攻击视效条目。**条数不定**——现算下来 1 条 41 只、2 条 36 只、
 * 3 条 26 只、4 条 25 只、5 条 3 只，所以按实际条数渲染，不设固定格数。
 * 有条目但 `visual_code` 为空的（该槽没有可解码视效）如实留白，不补一个假编号。
 */
function monsterAttackVisualEntries(monsterId) {
  const selectors = attackVisualAssets().enemy_attack_selectors || [];
  return selectors.filter(selector =>
    (selector.enemy_ids || []).some(id => Number(id) === Number(monsterId)));
}

function monsterAttackVisualCell(monster) {
  const entries = monsterAttackVisualEntries(monster.id);
  if (!entries.length) return `<span class="resource-empty">—</span>`;
  return `<div class="monster-attack-visual-cell">${entries.map(entry =>
    entry.visual_code === null || entry.visual_code === undefined
      ? `<span class="resource-empty" data-monster-attack-visual-empty
          >${esc(entry.id_hex || "")} 无视效</span>`
      : `<animated-resource-picker data-monster-list-attack-visual
          data-monster-id="${Number(monster.id)}"
          data-selector-id="${Number(entry.id)}"
          data-visual-code="${Number(entry.visual_code)}"
          disabled></animated-resource-picker>`
  ).join("")}</div>`;
}

function monsterDropCell(monster) {
  const drop = monster?.drop;
  if (!drop?.item || !drop?.probability) return `<span class="resource-empty">掉落数据缺失</span>`;
  if (!drop.participates || drop.item.kind === "not-participating")
    return `<span title="怪物 ID &lt; 0x18，不在掉落表内">不参与掉落</span>`;
  const probability = drop.probability;
  return `<div class="monster-drop-editor">
    <span data-monster-drop-object="${esc(monsterUid(monster))}"></span>
    <small>概率档 ${esc(probability.tier)} · ${esc(probability.numerator)}/${esc(probability.denominator)}</small>
  </div>`;
}

function monsterDerivedValue(monster, key) {
  return `<span data-monster-derived="${key}" data-monster-id="${monster.id}">${esc(monster[key])}</span>`;
}

function renderMonsterData(data, monsters) {
  const q = state.monsterFilter.trim().toLowerCase();
  const visible = monsters.filter(monster =>
    !q || `${monster.id} ${monster.id_hex} ${monsterNameDecodedText(monster)} ${monster.graphic_id} ${monster.graphic_id_hex}`.toLowerCase().includes(q)
  );
  const numberColumn = (field, label) => ({
    key: field,
    label,
    align: "right",
    width: 78,
    cell: monster => monsterNumberInput(monster, field),
  });
  const columns = [
    {key: "resource_id", label: "资源 ID", mono: true, sticky: true, width: 138,
      cell: monster => handleMarkup(monsterUid(monster))},
    {key: "name", label: "名称", sticky: true, width: 132,
      cell: monster => monsterNameControl(monster)},
    // **形象与调色板是一个字段，不是两列。** NES 上图形只有 2 bit 像素索引，颜色
    // 全由 palette 决定——两者必须成对才画得出一个画面。所以一格里两个下拉、
    // 一张预览；拆成两列就会各画一张同一个东西的图。候选与色块来自已注册的
    // monster-graphic / monster-palette 组件，这里不另造。
    {key: "graphic", label: "形象与调色板", width: 300, mono: true,
      cell: monster => monsterFigureFieldMarkup(monster.id)},
    numberColumn("hp", "HP"),
    {key: "attack", label: "攻击", width: 174,
      cell: monster => `<div class="monster-attribute-group">${monsterNumberInput(monster, "attack")}
        <small>码 ${monsterDerivedValue(monster, "attack_code_hex")} · 附加 ${monsterDerivedValue(monster, "attack_aux")}</small></div>`},
    {key: "defense", label: "防御", width: 174,
      cell: monster => `<div class="monster-attribute-group">${monsterNumberInput(monster, "defense")}
        <small>码 ${monsterDerivedValue(monster, "defense_code_hex")} · 附加 ${monsterDerivedValue(monster, "defense_aux")}</small></div>`},
    numberColumn("speed", "速度"),
    numberColumn("experience", "经验"),
    numberColumn("gold", "金钱"),
    {key: "drop", label: "掉落", width: 210,
      cell: monster => monsterDropCell(monster)},
    {key: "attack_visual", label: "攻击特效", width: 250,
      cell: monster => monsterAttackVisualCell(monster)},
    {key: "flags", label: "标志", mono: true, width: 64,
      cell: monster => monsterDerivedValue(monster, "flags_hex")},
    {key: "zones", label: "遇敌区", align: "right", width: 64,
      cell: monster => encounterZoneCell(Number(monster.id))},
    // 「出现编队」原来只在另一张 131 行的怪物表里。遇敌区和编队是两件事：
    // 前者是「在哪片地上遇到」，后者是「遇到时和谁一起出现」。
    {key: "formations", label: "出现编队", width: 96,
      cell: monster => monsterFormationCell(monster)},
    {key: "name_record", label: "名称记录", mono: true, align: "right", width: 82,
      cell: monster => esc(monster.name_text_record_id)},
    {key: "reset-original", label: "", title: "恢复原值", width: 36, reset: true,
      cell: monster => `<span data-monster-reset-object="${esc(monsterUid(monster))}"></span>`},
  ];
  return `<form id="monster-editor">
      <style>#monster-editor .monster-attribute-group {display:grid;gap:3px}
        #monster-editor .monster-attribute-group small {white-space:nowrap;opacity:.75}</style>
      ${monsterEditorToolbar()}
      <div class="data-filter">
        <span>⌕</span>
        <input id="monster-filter" value="${esc(state.monsterFilter)}" placeholder="按怪物 ID、已知名称或图形 ID 过滤…">
      </div>
      ${dataTable({
        columns,
        rows: visible,
        rowId: monster => monster.id,
        recordRoute: monster => `monsters/${monster.id}`,
        total: monsters.length,
        virtualKey: 'monsters',
      })}
    </form>`;
}

function monsterUid(monster) {
  return `monster:${Number(monster.id).toString(16).toUpperCase().padStart(2, "0")}`;
}

function monsterNumberInput(monster, field, reset = false) {
  const metadata = field === "speed" ? {multiplier: 1} : monster[field];
  const multiplier = Number(metadata?.multiplier || 1);
  return `<span data-monster-number-object="${esc(monsterUid(monster))}"
    data-monster-field="${esc(field)}" data-monster-step="${multiplier}"
    data-monster-max="${255 * multiplier}" data-monster-field-reset="${reset}"></span>`;
}

/** 记录页主表显示字段值，物理位置由共用折叠区承载。 */
function renderMonsterRecord(monsters, monsterId) {
  const index = monsters.findIndex(monster => Number(monster.id) === Number(monsterId));
  if (index < 0) return null;
  const monster = monsters[index];
  const displayName = monsterNameDecodedText(monster)
    || `怪物 ${monster.id_hex}`;
  const uid = monsterUid(monster);
  const zones = zonesByMonster().get(Number(monster.id)) || [];
  const valueFor = row => {
    const fieldKey = row.fieldKey || row.key;
    if (!monsterRecordFields.some(([key]) => key === fieldKey)) return null;
    const field = {experience_code: "experience", gold_code: "gold"}[fieldKey] || fieldKey;
    return `${monsterNumberInput(monster, field, true)}${
      ["attack_code", "defense_code", "experience", "gold"].includes(field)
        ? `<small data-monster-attribute-detail="${esc(field)}"></small>` : ""}`;
  };
  const addressTable = fieldAddressTable({
    uid,
    fields: monsterRecordFields,
    valueFor,
    showStatus: false,
    pageStatus: {
      selection: uid,
      dirty: "",
    },
  });
  const page = recordPage({
    title: displayName,
    uid,
    backLabel: "怪物属性",
    prevId: index > 0 ? monsters[index - 1].id : null,
    nextId: index < monsters.length - 1 ? monsters[index + 1].id : null,
    panels: [
      panel("字段", `${addressTable}${monster.drop?.participates
        ? `<div data-monster-object-editor="${esc(uid)}"></div>` : ""}`, {wide: true, flat: true}),
      panel("基本信息", fields([
        ["游戏索引 ID", `<span class="mono">${esc(monster.id_hex)}</span>`],
        ["图形 ID", esc(monster.graphic_id_hex)],
        ["名称文本记录", `#${esc(monster.name_text_record_id)}`],
        ["名称", monsterNameControl(monster)],
      ])),
      panel("战斗图形", `<div class="record-preview">${monsterFigureCanvas({
        enemyId: monster.id,
        scale: 4,
        label: monster.name || "",
      })}</div>`),
      monsterRuntimePanel(monster),
      panel("随机遇敌区", zones.length
        ? fields(zones.map(zone => [
          hex(zone.zoneId, 2), "出现",
        ]))
        : `<div class="record-preview"><span class="resource-empty">未出现在任何遇敌区</span></div>`),
      panel("引用关系", fields([
        ["被引用数", resourceForwardReferenceCell(uid)],
      ])),
      // 行动清单与发射点是一件事的两面，放在同一场战斗里编：发射点是相对怪物占格
      // 的像素偏移，炮口一类本来就落在图形之外，单看立绘判断不了那个点在哪；而
      // 「这一槽做什么、说什么话、用哪条特效」正是选哪个发射点的依据。
      panel("攻击行动与发射点", monsterAttackAnchorMarkup(monster.id), {wide: true}),
    ],
  });
  return `<form id="monster-editor">
    ${monsterEditorToolbar()}
    ${page}
  </form>`;
}

/**
 * 攻击与特效的运行时事实。
 *
 * 这些原来只在「怪物攻击与战斗测试」那张 131 行的表里，一行铺开十几列——可它们
 * 逐怪物、又只在看单只时才有用，放回怪物记录页。选择槽/打包值/重复类是行动选择
 * 的三个码，对象动作/音效/CHR 页是那条特效跑起来会用到的东西。
 */
function monsterRuntimePanel(monster) {
  const profile = monsterAttackProfile(monster.id);
  if (!profile) {
    return panel("攻击运行时", `<div class="record-preview"><span
      class="resource-empty">这只怪物没有攻击档案</span></div>`);
  }
  const list = values => (values || []).map(value => hex(Number(value), 2)).join(" / ") || "—";
  return panel("攻击运行时", fields([
    ["共享攻击特效", profile.visual_resource
      ? `<button class="resource-inline-link" type="button"
        data-resource-target="${esc(profile.visual_resource)}">${
          esc(profile.visual_code_hex)}</button>`
      : "—"],
    ["选择槽", profile.selector_resource
      ? `<button class="resource-inline-link" type="button"
        data-resource-target="${esc(profile.selector_resource)}">${
          esc(profile.selector_id_hex)}</button>`
      : "—"],
    ["打包值", `<span class="mono">${esc(profile.selector_packed_hex || "—")}</span>`],
    ["重复类", `<span class="mono">${esc(profile.repeat_counter_class_hex || "—")}</span>`],
    ["战斗对象动作", `<span class="mono">${list(profile.object_actions)}</span>`],
    ["音效", esc((profile.sound_ids || []).map(audioCommandLabel).join(" / ") || "—")],
  ]));
}

/** 「遇到它时是哪一组编队」。档案里已经算好，这里只把引用按钮铺出来。 */
function monsterFormationCell(monster) {
  const profile = monsterAttackProfile(monster.id);
  const uids = profile?.encounter_formation_resources || [];
  if (!uids.length) return "—";
  return uids.map((uid, index) => `<button class="resource-inline-link" type="button"
    data-resource-target="${esc(uid)}">${esc(
      Number(profile.encounter_formation_ids[index])
        .toString(16).toUpperCase().padStart(2, "0"))}</button>`).join("");
}

// 「这只怪物会在哪些随机遇敌区出现」。和引用列同一个规矩：总表里只给条数。
// 最多的怪物出没于 15 个区，全铺出来这一列会比怪物名还宽；悬停可看具体是哪些区。
function encounterZoneCell(monsterId) {
  const zones = zonesByMonster().get(monsterId) || [];
  if (!zones.length) return `<span class="resource-empty">—</span>`;
  const list = zones.map(z => hex(z.zoneId, 2)).join("\n");
  return `<span class="resource-reference-count" title="${esc(list)}">${zones.length}</span>`;
}


function updateMonsterEditorState(message = "") {
  state.monsterMessage = message;
  const status = $("#monster-save-state");
  const error = monsterNameDraftError();
  if (status) {
    const label = monsterEditorStatus();
    status.textContent = label;
    status.hidden = !label;
    status.classList.toggle("invalid", Boolean(error));
  }
}

function bindMonsterEditor() {
  const form = $("#monster-editor");
  if (!form || form.dataset.monsterFieldObjects) return;
  form.dataset.monsterFieldObjects = "loading";
  form.addEventListener("submit", event => event.preventDefault());
  monsterNameEditors = bindFixedTextEditors(form, {
    reuse: monsterNameEditors,
    onState: () => updateMonsterEditorState(),
  });
  const catalogPromise = loadEntityCatalog();
  const objects = new Map();
  const objectFor = async handle => {
    if (!objects.has(handle)) objects.set(handle, (async () => {
      const catalog = await catalogPromise;
      const [attributes, rewards] = await Promise.all(["attributes", "rewards"].map(
        facetId => entityFacetFields(db, handle, facetId, {catalog})));
      const object = attributes.objects.find(candidate =>
        attributes.fields.some(field => candidate.fields.includes(field)));
      if (!object) throw new TypeError(`怪物切面缺少字段对象：${handle}`);
      const declared = new Set([...attributes.fields, ...rewards.fields]);
      if (object.fields.some(field => !declared.has(field)))
        throw new TypeError(`怪物字段未归入切面：${handle}`);
      return object;
    })());
    return objects.get(handle);
  };
  let mountedOnce = false;
  const mount = async () => {
    if (mountedOnce) monsterNameEditors = bindFixedTextEditors(form, {reuse: monsterNameEditors,
      onState: () => updateMonsterEditorState()});
    mountedOnce = true;
    if (!form.isConnected) return;
    const targets = [...form.querySelectorAll(
      "[data-monster-number-object], [data-monster-drop-object], [data-monster-reset-object], [data-monster-object-editor]",
    )].map(host => host.dataset.monsterNumberObject || host.dataset.monsterDropObject
      || host.dataset.monsterResetObject || host.dataset.monsterObjectEditor);
    await Promise.all([...new Set(targets)].map(objectFor));
    if (!form.isConnected) return;
    for (const host of form.querySelectorAll("[data-monster-number-object]")) {
      if (host.dataset.fieldMounted) continue;
      host.dataset.fieldMounted = "true";
      const object = await objectFor(host.dataset.monsterNumberObject);
      if (!object) throw new TypeError(`怪物字段对象不存在：${host.dataset.monsterNumberObject}`);
      mountFieldObjectNumber(host, object, host.dataset.monsterField, {
        min: 0, max: Number(host.dataset.monsterMax), step: Number(host.dataset.monsterStep),
        reset: host.dataset.monsterFieldReset === "true",
      });
    }
    if (form.querySelector('[data-monster-attribute-detail]'))
      await bindMonsterAttributeDetails(form, await objectFor(form.querySelector('[data-monster-number-object]').dataset.monsterNumberObject));
    await Promise.all([...form.querySelectorAll("[data-monster-drop-object]")].map(async host => {
      if (host.dataset.fieldMounted) return null;
      host.dataset.fieldMounted = "true";
      const object = await objectFor(host.dataset.monsterDropObject);
      if (!object) throw new TypeError(`怪物字段对象不存在：${host.dataset.monsterDropObject}`);
      return mountFieldObjectSelect(host, object, "drop.item_id", {
        reset: false, itemCategories: ITEM_CATEGORIES,
      });
    }));
    for (const host of form.querySelectorAll("[data-monster-reset-object]")) {
      if (host.dataset.fieldMounted) continue;
      host.dataset.fieldMounted = "true";
      const object = await objectFor(host.dataset.monsterResetObject);
      if (!object) throw new TypeError(`怪物字段对象不存在：${host.dataset.monsterResetObject}`);
      mountFieldObjectReset(host, object);
    }
    for (const host of form.querySelectorAll("[data-monster-object-editor]")) {
      if (host.dataset.fieldMounted) continue;
      host.dataset.fieldMounted = "true";
      const object = await objectFor(host.dataset.monsterObjectEditor);
      if (!object) throw new TypeError(`怪物字段对象不存在：${host.dataset.monsterObjectEditor}`);
      const represented = [...form.querySelectorAll('[data-monster-number-object]')]
        .filter(control => control.dataset.monsterNumberObject === object.id)
        .map(control => control.dataset.monsterField);
      const suppressedFieldKeys = new Set(represented.map(name =>
        JSON.stringify([object.resourceId, object.id, name])));
      await mountFieldObjectEditor(host, object, {suppressedFieldKeys, compactIdentity: true, stacked: true});
    }
    await monsterNameEditors.ready;
    if (!form.isConnected) return;
    form.dataset.monsterFieldObjects = "ready";
    updateMonsterEditorState();
  };
  form.addEventListener("virtual-table-rows", () => {
    void mount().catch(error => updateMonsterEditorState(`字段绑定失败：${error?.message || error}`));
    form.querySelectorAll("animated-resource-picker[data-monster-list-attack-visual]")
      .forEach(picker => configureAttackVisualPicker(picker, {
        value: picker.dataset.visualCode, preview: false,
      }));
  });
  void mount().catch(error => updateMonsterEditorState(`字段绑定失败：${error?.message || error}`));
  form.querySelectorAll("animated-resource-picker[data-monster-list-attack-visual]")
    .forEach(picker => configureAttackVisualPicker(picker, {
      value: picker.dataset.visualCode, preview: false,
    }));
}

/** 怪物记录页的攻击特效组件走记录页统一收尾入口。 */
function bindMonsterRecord() {
  void bindMonsterAttackEffectPreviews(document).catch(error => updateMonsterEditorState(`攻击特效读取失败：${error.message}`));
}

var monsters = /*#__PURE__*/Object.freeze({
  __proto__: null,
  bindMonsterEditor: bindMonsterEditor,
  bindMonsterRecord: bindMonsterRecord,
  copyEditorDraft: copyEditorDraft,
  prepareMonsterNameFacets: prepareMonsterNameFacets,
  renderMonsterData: renderMonsterData,
  renderMonsterRecord: renderMonsterRecord,
  useMonsterNameFacets: useMonsterNameFacets
});

export { anchorFieldsMarkup, copyEditorDraft, monsters, renderMonsterData };
