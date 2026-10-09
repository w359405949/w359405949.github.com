import { esc, paintMetaspriteCanvases, metaspriteCanvas, resourceLabel, recordUid } from './element-tree-DsgOBeTK.js';
import { battleActorAction, BATTLE_ACTOR_CHR_BANKS } from './configuration-summary-NWu3_nCt.js';
import { battleScenePreviewCatalog, normalizeBattleScenePreview, battleScenePreviewDefaults, BATTLE_SCENE_PARTY_SLOTS, resolveBattleSceneAttack, BATTLE_SCENE_ENEMY_SLOTS, BATTLE_SCENE_ENEMY_GROUP_SLOTS, battleSceneActiveEnemySlots, battleSceneEntityAttackSources } from './battle-actors-B548R92n.js';
import { state, nesVideoStandard } from './emulator-DynsZsth.js';
import { replaceHistoryUrl, currentViewUrl } from './ui-editor-nodes-CtPdwTyu.js';
import { playBattleSceneComposerAttack } from './battle-simulation-player-ZYN9IgYB.js';
import { hydrateReferenceFieldPickers, configureAnimatedResourcePicker } from './scene-elevators-N46oPTJC.js';
import { hydrateItemPickers, itemPickerFieldMarkup } from './attack-chr-tile-selector-DxIfuyLU.js';
import { vehiclePresetPickerMarkup, vehiclePresetOptionMarkup } from './in-page-tabs-BYzTkeOF.js';
import { hex } from './battle-result-script-runtime-B_EClFew.js';

// @editor-module 战斗编排的共享控件与画布。

function previewReady(catalog) {
  return catalog.roles.length === BATTLE_SCENE_PARTY_SLOTS
    && catalog.normalAppearances.length > 0
    && catalog.monsters.length > 0;
}

function ensureBattleScenePreview(project = state.project) {
  const catalog = battleScenePreviewCatalog(project);
  if (!state.battleScenePreview) {
    const value = battleScenePreviewDefaults(project);
    // 合同页可以只装 UI 目录。基础资产未到齐时不缓存安全占位，避免真正的
    // character-initial-record / monster-visual-layout 到达后仍沿用空阵容。
    if (previewReady(catalog)) state.battleScenePreview = value;
    return value;
  }
  state.battleScenePreview = normalizeBattleScenePreview(
    state.battleScenePreview,
    project,
  );
  return state.battleScenePreview;
}

function option(value, label, selected) {
  return `<option value="${esc(value)}"${
    String(value) === String(selected) ? " selected" : ""
  }>${esc(label)}</option>`;
}

function normalAppearancePreview(catalog, key, label) {
  const appearance = catalog.appearanceByKey.get(String(key));
  const action = battleActorAction(
    catalog.actorCatalog,
    appearance?.key,
    appearance?.defaultAction,
  );
  if (!action) {
    return '<span class="battle-scene-normal-appearance-preview resource-empty">无预览</span>';
  }
  return `<span class="battle-scene-normal-appearance-preview"
    data-battle-scene-normal-appearance-preview="${esc(appearance.key)}">${metaspriteCanvas({
      banks: BATTLE_ACTOR_CHR_BANKS,
      kind: "object",
      id: action.id,
      size: 48,
      className: "battle-scene-normal-appearance-canvas",
      label: esc(`${label}普通战斗形象`),
    })}</span>`;
}

function currentMonsterName(item) {
  if (!item) return "怪物";
  return resourceLabel(
    recordUid("monster", item?.id),
    item?.label || `怪物 ${hex(item?.id, 2)}`,
  );
}

function monsterOptions(catalog, selected) {
  return catalog.monsters.map(item => option(
    item.id,
    `怪物 ${hex(item.id, 2)} · ${currentMonsterName(item)}`,
    selected,
  )).join("");
}

function sourceScopeLabel(source) {
  return source?.source?.target_scope_label || ({
    single: "单体", group: "一组", all: "全体",
  })[source?.targetScope] || (source?.group === "怪物行动" ? "行动" : "范围待解");
}

function attackButtons(catalog, preview, side, index) {
  const sources = battleSceneEntityAttackSources(
    catalog,
    preview,
    side,
    index,
  );
  const actorVisible = preview.enemies[index]?.visible;
  const targetAvailable = preview.party.some(item => item.visible);
  if (!sources.length) {
    return ``;
  }
  return sources.map(source => `<button class="button battle-scene-attack-action"
    type="button" data-battle-scene-quick-attack
    data-battle-scene-attack-side="${side}"
    data-battle-scene-attack-attacker="${index}"
    data-battle-scene-attack-source="${esc(source.key)}"
    title="${esc(source.label)}"${
      actorVisible && targetAvailable && source.visualAvailable !== false
        ? "" : " disabled"
    }>
    <b>${esc(source.actionLabel || source.label)}</b>
    <small>${esc(source.visualAvailable === false
      ? ""
      : `${sourceScopeLabel(source)} · ${hex(source.visualCode, 2)}`
    )}</small>
  </button>`).join("");
}

function partyAttackChannelControl(catalog, preview, member, index, channel) {
  const selectedKey = String(member.attacks?.[channel.key] || "");
  const selected = catalog.attackSourceByKey.get(selectedKey) || null;
  const canPlay = Boolean(member.visible
    && battleSceneActiveEnemySlots(preview).length > 0
    && selected && (selected.visualAvailable || channel.key === "item"
      || (channel.key === "shell" && selected.source?.special === false
        && member.riding && catalog.attackSourceByKey.get(member.attacks?.main)?.visualAvailable)));
  const anchor = channel.launchAnchorProfile;
  const anchorLabel = anchor
    ? `锚点 前${Number(anchor.forward_offset_pixels) || 0} / 上${
      Number(anchor.upward_offset_pixels) || 0
    }`
    : "";
  return `<div class="battle-scene-party-attack-channel"
    data-battle-scene-party-attack-channel-cell="${channel.key}">
    <span class="battle-scene-party-attack-heading"><b>${esc(channel.label)}</b>
      <small>${esc(anchorLabel)}</small></span>
    ${(() => {
      if (channel.key === "shell") return `<select aria-label="P${index + 1} 炮弹"
        data-battle-scene-party-attack-source data-battle-scene-party-slot="${index}"
        data-battle-scene-party-attack-channel="shell">
        ${option("", "空栏（未装备）", selectedKey)}${channel.sources.map(source =>
          option(source.key, source.label, selectedKey)).join("")}</select>`;
      const sources = new Map(channel.sources.map(source => [Number(source.source.id), source]));
      const records = (state.project?.game_data?.items?.records || [])
        .filter(item => sources.has(Number(item.id)));
      const choices = records.map(item => `<option value="${esc(sources.get(Number(item.id)).key)}"${
        sources.get(Number(item.id)).key === selectedKey ? " selected" : ""}>${
        esc(item.id_hex)} · ${esc(item.name)}</option>`).join("");
      return `<div class="battle-scene-equipment-picker">${itemPickerFieldMarkup({
        records, value: selectedKey, label: `P${index + 1} ${channel.label}攻击选择`,
        allowedCategories: channel.key === "item" ? ["human-item", "tank-item"] : [channel.categoryId], emptyValue: null,
        valueForRecord: item => sources.get(Number(item.id)).key,
        extraChoices: channel.key === "melee" ? [] : [{value: "", empty: true,
          label: "空栏（未装备）",
          group: "empty", groupLabel: "空", filter: "空栏 未装备"}],
        controlMarkup: `<select data-battle-scene-party-attack-source
          data-battle-scene-party-slot="${index}"
          data-battle-scene-party-attack-channel="${esc(channel.key)}">${
          channel.key === "melee" ? "" : '<option value="">空栏（未装备）</option>'}${choices}</select>`,
      })}</div>`;
    })()}
    <button class="button battle-scene-attack-action battle-scene-play-attack"
      type="button" data-battle-scene-play-party-attack="${index}"
      data-battle-scene-party-attack-channel="${channel.key}"${
        canPlay ? "" : " disabled"
      } title="播放 P${index + 1} 的${esc(channel.label)}攻击动画">
      <b>播放</b><small>${esc(selected
        ? `${sourceScopeLabel(selected)} · ${hex(selected.visualCode, 2)}`
        : ""
      )}</small>
    </button>
  </div>`;
}

function partyControlRow(catalog, preview, index, includeInventory = false) {
  const member = preview.party[index];
  const role = catalog.roles[index];
  const name = role?.label || `角色 ${index + 1}`;
  return `<div class="battle-scene-roster-row battle-scene-party-row"
    data-battle-scene-party-row="${index}">
    <b class="battle-scene-slot-id">P${index + 1}</b>
    <label class="battle-scene-object-toggle"><input type="checkbox"
      data-battle-scene-party-slot="${index}"
      data-battle-scene-party-field="visible"${member.visible ? " checked" : ""}>
      <span>${esc(name)}</span></label>
    <div class="battle-scene-inline-field battle-scene-normal-appearance-field"><span>普通</span>
      ${catalog.normalAppearances.length ? `<animated-resource-picker class="image-column-picker"
      aria-label="${esc(name)}普通战斗形象"
      data-animated-resource-value="${esc(member.normalAppearance)}"
      data-battle-scene-party-slot="${index}"
      data-battle-scene-party-field="normalAppearance"></animated-resource-picker>`
        : ''}
    </div>
    <div class="battle-scene-inline-field"><span>载具</span>${
      vehiclePresetPickerMarkup({
        value: member.vehiclePresetId,
        label: `${name}载具预设`,
        allowedGroups: ["player", "rental"],
        disabled: !catalog.vehiclePresets.length,
        controlMarkup: `<select data-battle-scene-party-slot="${index}"
          data-battle-scene-party-field="vehiclePresetId">${
          vehiclePresetOptionMarkup(member.vehiclePresetId)
        }</select>`,
      })
    }</div>
    <label class="battle-scene-riding-toggle"><input type="checkbox"
      data-battle-scene-party-slot="${index}"
      data-battle-scene-party-field="riding"${member.riding ? " checked" : ""}${
        catalog.vehiclePresets.length ? "" : " disabled"
      }>
      <span>乘坐</span></label>
    <label class="battle-scene-coordinate"><span>X</span><input type="number"
      min="8" max="248" value="${member.x}"
      data-battle-scene-party-slot="${index}"
      data-battle-scene-party-field="x"></label>
    <label class="battle-scene-coordinate"><span>Y</span><input type="number"
      min="8" max="136" value="${member.y}"
      data-battle-scene-party-slot="${index}"
      data-battle-scene-party-field="y"></label>
    <label class="battle-scene-target-choice" title="敌方攻击将以该角色为锚定目标">
      <input type="radio" name="battle-scene-party-target" value="${index}"
        data-battle-scene-target-side="party"${
          preview.attack.partyTarget === index ? " checked" : ""
        }${member.visible ? "" : " disabled"}>
      <span>被攻击目标</span>
    </label>
    <div class="battle-scene-party-attacks">
      ${[...catalog.partyAttackChannels, ...(includeInventory ? [catalog.shellAttackChannel, catalog.itemAttackChannel] : [])].map(channel => partyAttackChannelControl(
        catalog, preview, member, index, channel,
      )).join("")}
    </div>
  </div>`;
}

function enemySlotOptions(catalog, preview, index) {
  const overrides = preview.manualEnemySlots || {};
  const manual = Object.prototype.hasOwnProperty.call(overrides, index);
  const selected = overrides[index];
  const enemy = preview.enemies[index];
  const automatic = enemy
    ? currentMonsterName(
        catalog.monsters.find(item => item.id === enemy.monsterId),
      )
    : "空槽";
  return `${option("auto", `自动 · ${automatic}`, !manual)}
    ${option("empty", "手动 · 空槽", manual && selected === null)}
    ${catalog.monsters.map(item => option(
      item.id,
      `${hex(item.id, 2)} · ${currentMonsterName(item)}`,
      manual && Number(selected) === item.id,
    )).join("")}`;
}

function enemyControlRow(catalog, preview, index) {
  const enemy = preview.enemies[index];
  const monster = catalog.monsters.find(item => item.id === enemy?.monsterId);
  const manual = Object.prototype.hasOwnProperty.call(
    preview.manualEnemySlots || {},
    index,
  );
  const phase = !enemy ? "空槽" : manual ? "手动"
    : enemy.phase === "reinforcement" ? "中途加入" : "自动";
  return `<div class="battle-scene-roster-row battle-scene-enemy-row${
    enemy ? "" : " is-empty"
  }" data-battle-scene-enemy-row="${index}">
    <b class="battle-scene-slot-id">E${index + 1}</b>
    <span class="battle-scene-slot-state"><b>${esc(
      monster ? `怪物 ${hex(monster.id, 2)} · ${currentMonsterName(monster)}` : "空槽"
    )}</b>
      <small>${esc(phase)}</small></span>
    <label class="battle-scene-inline-field"><span>槽位怪物</span><select
      data-battle-scene-enemy-slot="${index}">${enemySlotOptions(
        catalog, preview, index,
      )}</select></label>
    <span class="battle-scene-enemy-position">${enemy
      ? `G${enemy.groupIndex + 1} · 格 ${enemy.cellX},${enemy.cellY} · ${
          enemy.widthCells
        }×${enemy.heightCells}`
      : "未占用网格"}</span>
    <label class="battle-scene-target-choice" title="我方攻击将以该怪物为锚定目标">
      <input type="radio" name="battle-scene-enemy-target" value="${index}"
        data-battle-scene-target-side="enemy"${
          preview.attack.enemyTarget === index ? " checked" : ""
        }${enemy ? "" : " disabled"}>
      <span>我方目标</span>
    </label>
    <div class="battle-scene-row-actions">
      ${enemy ? attackButtons(catalog, preview, "enemy", index)
        : `<span class="battle-scene-no-actions">空槽无动作</span>`}
      <button class="button ghost" type="button"
        data-battle-scene-clear-enemy-slot="${index}"${
          enemy ? "" : " disabled"
        }>清空</button>
    </div>
  </div>`;
}

function enemyGroupInlineControl(catalog, preview, index) {
  const group = preview.enemyGroups[index];
  const runtime = preview.formation.groups[index];
  const monster = catalog.monsters.find(item => item.id === runtime.monsterId);
  return `<span class="battle-scene-auto-group">
    <b>G${index + 1}</b>
    <small class="battle-scene-active-group" data-battle-scene-active-group="${index}">
      ${runtime.count ? `${esc(`怪物 ${hex(runtime.monsterId, 2)} · ${currentMonsterName(monster)}`)} ×${runtime.count}` : '空'}
    </small>
    <label class="battle-scene-initial-group"><span>初始</span>
    <select aria-label="敌群 ${index + 1} 怪物"
      data-battle-scene-enemy-group="${index}"
      data-battle-scene-enemy-group-field="monsterId">
      ${option('empty', '空', group.count ? group.monsterId : 'empty')}
      ${monsterOptions(catalog, group.count ? group.monsterId : 'empty')}
    </select></label>
    <input type="number" min="0" max="9" value="${group.count}" title="初始数量"
      aria-label="敌群 ${index + 1} 数量"
      data-battle-scene-enemy-group="${index}"
      data-battle-scene-enemy-group-field="count">
  </span>`;
}

function enemyOperationControls(catalog, preview) {
  return `<div class="battle-scene-enemy-operations">
    <div class="battle-scene-auto-groups">
      ${Array.from(
        {length: BATTLE_SCENE_ENEMY_GROUP_SLOTS},
        (_, index) => enemyGroupInlineControl(catalog, preview, index),
      ).join("")}
    </div>
    <div class="battle-scene-operation-buttons">
      <button class="button primary" type="button" data-battle-scene-auto-formation>
        按四敌群自动排布
      </button>
      <label class="battle-scene-inline-field"><span>批量怪物</span><select
        data-battle-scene-operation-monster>
        ${monsterOptions(catalog, preview.reinforcement.monsterId)}
      </select></label>
      <button class="button" type="button" data-battle-scene-fill-empty>
        填满可用空槽
      </button>
      ${Array.from({length: BATTLE_SCENE_ENEMY_GROUP_SLOTS}, (_, index) =>
        `<button class="button ghost" type="button"
          data-battle-scene-summon-group="${index}"${
            preview.formation.groups[index].count ? "" : " disabled"
          }>G${index + 1} 召唤</button>`
      ).join("")}
      <button class="button ghost" type="button" data-battle-scene-support>
        新敌群支援
      </button>
      <button class="button ghost" type="button" data-battle-scene-clear-events${
        preview.enemyEvents.length ? "" : " disabled"
      }>清除中途事件</button>
    </div>
  </div>`;
}

/** 画布下方的编排区：只放非对象配置、算法事件和播放模拟。 */
function battleSceneComposerControls(project = state.project, {includeInventory = false} = {}) {
  const catalog = battleScenePreviewCatalog(project);
  const preview = ensureBattleScenePreview(project);
  resolveBattleSceneAttack(preview, project);
  const rejection = preview.formation.rejections.at(-1) || null;
  const video = nesVideoStandard(state.battleVideoStandard);
  const activeTab = state.battleSceneControlTab === "enemy" ? "enemy" : "party";
  state.battleSceneControlTab = activeTab;
  return `<div class="battle-scene-control-dock" data-battle-scene-control-dock>
    <header class="battle-scene-control-dock-head">
      <div class="battle-scene-control-title"><p class="eyebrow">BATTLE OBJECTS</p><h3>对象与动作</h3></div>
      <div class="battle-scene-control-tabs" role="tablist" aria-label="战斗对象分类">
        <button class="battle-scene-control-tab${
          activeTab === "party" ? " is-active" : ""
        }" type="button" role="tab" id="battle-scene-party-tab"
          data-battle-scene-control-tab="party"
          aria-controls="battle-scene-party-panel"
          aria-selected="${activeTab === "party"}"
          tabindex="${activeTab === "party" ? "0" : "-1"}">
          <span>友方角色</span><small>${BATTLE_SCENE_PARTY_SLOTS} 个对象</small>
        </button>
        <button class="battle-scene-control-tab${
          activeTab === "enemy" ? " is-active" : ""
        }" type="button" role="tab" id="battle-scene-enemy-tab"
          data-battle-scene-control-tab="enemy"
          aria-controls="battle-scene-enemy-panel"
          aria-selected="${activeTab === "enemy"}"
          tabindex="${activeTab === "enemy" ? "0" : "-1"}">
          <span>敌方实例槽</span><small>${
            preview.enemies.filter(Boolean).length
          } / ${BATTLE_SCENE_ENEMY_SLOTS} 在场</small>
        </button>
      </div>
      <div class="battle-scene-preview-actions">
        <span class="battle-scene-video-standard" role="group" aria-label="攻击动画视频制式">
          ${[nesVideoStandard("ntsc"), nesVideoStandard("pal")].map(item =>
            `<button class="button ${video.key === item.key ? "primary" : "ghost"}"
              type="button" data-battle-video-standard="${item.key}"
              aria-pressed="${video.key === item.key}">${esc(item.label)}</button>`
          ).join("")}
        </span>
        <label class="battle-scene-toggle"><input type="checkbox"
          data-battle-scene-guides${preview.guides ? " checked" : ""}>
          <span>显示 6×8 网格、占格与目标框</span></label>
        <button class="button" type="button" data-battle-scene-reset>恢复敌方原值</button>
      </div>
    </header>
    <div class="battle-scene-control-panes">
      <section class="battle-scene-flat-section battle-scene-party-section"
        id="battle-scene-party-panel" role="tabpanel"
        aria-labelledby="battle-scene-party-tab"
        data-battle-scene-scroll-pane="party"${
          activeTab === "party" ? "" : " hidden"
        }>
      <header><h4>友方角色</h4><span>${includeInventory ? "武器、炮弹与道具" : "四类攻击入口"}分别选择、分别播放</span></header>
      <div class="battle-scene-roster-row battle-scene-party-row is-header">
          <span>槽</span><span>角色 / 显隐</span><span>普通形象</span>
          <span>载具配置</span><span>乘坐</span><span>X</span><span>Y</span><span>目标</span>
        <span>白刃战　　主炮　　副炮　　S-E${includeInventory ? "　　炮弹　　道具" : ""}</span>
        </div>
        ${Array.from(
          {length: BATTLE_SCENE_PARTY_SLOTS},
          (_, index) => partyControlRow(catalog, preview, index, includeInventory),
        ).join("")}
      </section>
      <section class="battle-scene-flat-section battle-scene-enemy-section"
        id="battle-scene-enemy-panel" role="tabpanel"
        aria-labelledby="battle-scene-enemy-tab"
        data-battle-scene-scroll-pane="enemy"${
          activeTab === "enemy" ? "" : " hidden"
        }>
        <header><h4>敌方实例槽</h4><span>${
          preview.enemies.filter(Boolean).length
        } / ${BATTLE_SCENE_ENEMY_SLOTS} 在场 · 九槽全部展开</span></header>
        ${enemyOperationControls(catalog, preview)}
        <div class="battle-scene-roster-row battle-scene-enemy-row is-header">
          <span>槽</span><span>当前对象</span><span>自动 / 手动换怪</span>
          <span>占格位置</span><span>目标</span><span>可用动作</span>
        </div>
        ${Array.from(
          {length: BATTLE_SCENE_ENEMY_SLOTS},
          (_, index) => enemyControlRow(catalog, preview, index),
        ).join("")}
      </section>
    </div>
    <footer class="battle-scene-control-status">
      <span data-battle-scene-simulation-status data-battle-scene-status-errors-only aria-live="polite"></span>
      <span class="${rejection ? "invalid" : ""}">${esc(rejection
        ? `最近一次排布未生效：${rejection.reason}`
        : ""
      )}</span>
    </footer>
  </div>`;
}

function battleSceneComposerCanvas({runtimeUrl = "", label = "战斗场景"} = {}) {
  return `<canvas width="256" height="240"
    data-battle-scene-composer=""
    data-battle-scene-runtime-preview="${esc(runtimeUrl)}"
    data-interface-page-runtime-preview="${esc(runtimeUrl)}"
    data-interface-page-workbench="battle-scene"
    aria-label="${esc(label)}可编辑编排预览"></canvas>`;
}

function updatePreview(mutator) {
  const preview = ensureBattleScenePreview(state.project);
  mutator(preview);
  state.battleScenePreview = normalizeBattleScenePreview(preview, state.project);
}

/** 绑定编排控件。敌方配置会重放排布；我方坐标和辅助线可以原地重画。 */
function bindBattleSceneComposer({
  rerender = async () => {},
  repaint = async () => {},
  playAttack = () => playBattleSceneComposerAttack(),
} = {}) {
  const controlDock = document.querySelector("[data-battle-scene-control-dock]");
  const catalog = battleScenePreviewCatalog(state.project);
  hydrateItemPickers(document);
  document.querySelectorAll(".battle-scene-party-row [data-module-reference-picker]")
    .forEach(picker => hydrateReferenceFieldPickers(picker));
  const activateControlTab = value => {
    const active = value === "enemy" ? "enemy" : "party";
    state.battleSceneControlTab = active;
    controlDock?.querySelectorAll("[data-battle-scene-control-tab]").forEach(button => {
      const selected = button.dataset.battleSceneControlTab === active;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    controlDock?.querySelectorAll("[data-battle-scene-scroll-pane]").forEach(panel => {
      panel.hidden = panel.dataset.battleSceneScrollPane !== active;
    });
  };
  const controlTabs = [...(controlDock?.querySelectorAll(
    "[data-battle-scene-control-tab]"
  ) || [])];
  controlTabs.forEach((button, index) => {
    button.addEventListener("click", () => {
      activateControlTab(button.dataset.battleSceneControlTab);
    });
    button.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const nextIndex = event.key === "Home" ? 0
        : event.key === "End" ? controlTabs.length - 1
        : (index + (event.key === "ArrowRight" ? 1 : -1) + controlTabs.length)
          % controlTabs.length;
      controlTabs[nextIndex].click();
      controlTabs[nextIndex].focus();
    });
  });
  document.querySelectorAll("[data-battle-scene-party-field]").forEach(control => {
    if (control.dataset.battleScenePartyField === "normalAppearance") {
      configureAnimatedResourcePicker(control, {
        value: control.value,
        options: catalog.normalAppearances.map(item => ({
          value: item.key, label: item.label,
        })),
        renderPreview: option => normalAppearancePreview(catalog, option.value, option.label),
        paintPreview: root => paintMetaspriteCanvases(root),
      });
    }
    const eventName = control.type === "number" ? "input" : "change";
    control.addEventListener(eventName, event => {
      if (event.target !== event.currentTarget) return;
      if (control.type === "number" && control.value === "") return;
      const index = Number(control.dataset.battleScenePartySlot);
      const field = control.dataset.battleScenePartyField;
      updatePreview(preview => {
        const member = preview.party[index];
        if (field === "vehiclePresetId") {
          const vehicle = catalog.vehiclePresetById.get(Number(control.value));
          member.vehiclePresetId = vehicle?.id ?? null;
          member.attacks = {...member.attacks, ...(vehicle?.attacks || {})};
          if (preview.attack.side === "party"
              && Number(preview.attack.attacker) === index
              && preview.attack.channel !== "melee") {
            preview.attack.source = member.attacks[preview.attack.channel] || "";
          }
          return;
        }
        member[field] = control.type === "checkbox"
          ? control.checked
          : control.type === "number" ? Number(control.value) : control.value;
      });
      if (control.type === "number") void repaint();
      else void rerender();
    });
  });
  document.querySelectorAll("[data-battle-scene-party-attack-source]").forEach(
    control => {
      control.addEventListener("change", () => {
        const index = Number(control.dataset.battleScenePartySlot);
        const channel = control.dataset.battleScenePartyAttackChannel;
        updatePreview(preview => {
          preview.party[index].attacks[channel] = control.value;
          if (preview.attack.side === "party"
              && Number(preview.attack.attacker) === index
              && preview.attack.channel === channel) {
            preview.attack.source = control.value;
          }
        });
        void rerender();
      });
    },
  );
  document.querySelectorAll("[data-battle-video-standard]").forEach(button => {
    button.addEventListener("click", () => {
      state.battleVideoStandard = button.dataset.battleVideoStandard;
      replaceHistoryUrl(currentViewUrl());
      void rerender();
    });
  });
  document.querySelectorAll("[data-battle-scene-enemy-group-field]").forEach(control => {
    control.addEventListener("change", () => {
      const index = Number(control.dataset.battleSceneEnemyGroup);
      const field = control.dataset.battleSceneEnemyGroupField;
      updatePreview(preview => {
        const group = preview.enemyGroups[index];
        if (field === 'monsterId') {
          if (control.value === 'empty') group.count = 0;
          else {group.monsterId = Number(control.value); group.count = Math.max(1, group.count);}
        } else group[field] = Number(control.value);
      });
      void rerender();
    });
  });
  document.querySelectorAll("[data-battle-scene-enemy-slot]").forEach(control => {
    control.addEventListener("change", () => {
      const slot = Number(control.dataset.battleSceneEnemySlot);
      updatePreview(preview => {
        preview.manualEnemySlots ||= {};
        if (control.value === "auto") delete preview.manualEnemySlots[slot];
        else preview.manualEnemySlots[slot] = control.value === "empty"
          ? null : Number(control.value);
      });
      void rerender();
    });
  });
  document.querySelectorAll("[data-battle-scene-clear-enemy-slot]").forEach(button => {
    button.addEventListener("click", () => {
      const slot = Number(button.dataset.battleSceneClearEnemySlot);
      updatePreview(preview => {
        preview.manualEnemySlots ||= {};
        preview.manualEnemySlots[slot] = null;
      });
      void rerender();
    });
  });
  document.querySelector("[data-battle-scene-operation-monster]")?.addEventListener(
    "change",
    event => {
      updatePreview(preview => {
        preview.reinforcement.monsterId = Number(event.currentTarget.value);
      });
    },
  );
  document.querySelector("[data-battle-scene-auto-formation]")?.addEventListener(
    "click",
    () => {
      updatePreview(preview => {
        preview.manualEnemySlots = {};
        preview.enemyEvents = [];
      });
      void rerender();
    },
  );
  document.querySelector("[data-battle-scene-fill-empty]")?.addEventListener(
    "click",
    () => {
      updatePreview(preview => {
        preview.manualEnemySlots ||= {};
        preview.enemies.forEach((enemy, slot) => {
          if (!enemy) preview.manualEnemySlots[slot] = preview.reinforcement.monsterId;
        });
      });
      void rerender();
    },
  );
  document.querySelectorAll("[data-battle-scene-summon-group]").forEach(button => {
    button.addEventListener("click", () => {
      updatePreview(preview => {
        preview.enemyEvents.push({
          type: "join-same",
          groupIndex: Number(button.dataset.battleSceneSummonGroup),
        });
      });
      void rerender();
    });
  });
  document.querySelector("[data-battle-scene-support]")?.addEventListener(
    "click",
    () => {
      updatePreview(preview => {
        preview.enemyEvents.push({
          type: "join-new",
          monsterId: preview.reinforcement.monsterId,
        });
      });
      void rerender();
    },
  );
  document.querySelector("[data-battle-scene-clear-events]")?.addEventListener(
    "click",
    () => {
      updatePreview(preview => {
        preview.enemyEvents = [];
      });
      void rerender();
    },
  );
  document.querySelectorAll("[data-battle-scene-target-side]").forEach(control => {
    control.addEventListener("change", () => {
      const side = control.dataset.battleSceneTargetSide;
      updatePreview(preview => {
        preview.attack[side === "party" ? "partyTarget" : "enemyTarget"]
          = Number(control.value);
      });
      void repaint();
    });
  });
  document.querySelectorAll("[data-battle-scene-quick-attack]").forEach(button => {
    button.addEventListener("click", async () => {
      const side = button.dataset.battleSceneAttackSide;
      updatePreview(preview => {
        preview.attack.side = side;
        preview.attack.attacker = Number(button.dataset.battleSceneAttackAttacker);
        preview.attack.source = button.dataset.battleSceneAttackSource;
        preview.attack.scope = "auto";
        preview.attack.target = side === "party"
          ? preview.attack.enemyTarget : preview.attack.partyTarget;
      });
      await repaint();
      void playAttack();
    });
  });
  document.querySelectorAll("[data-battle-scene-play-party-attack]").forEach(button => {
    button.addEventListener("click", async () => {
      const index = Number(button.dataset.battleScenePlayPartyAttack);
      const channel = button.dataset.battleScenePartyAttackChannel;
      updatePreview(preview => {
        preview.attack.side = "party";
        preview.attack.attacker = index;
        preview.attack.channel = channel;
        preview.attack.source = preview.party[index].attacks[channel];
        preview.attack.scope = "auto";
        preview.attack.target = preview.attack.enemyTarget;
      });
      await repaint();
      void playAttack();
    });
  });
  document.querySelector("[data-battle-scene-guides]")?.addEventListener(
    "change",
    event => {
      updatePreview(preview => {
        preview.guides = event.currentTarget.checked;
      });
      void repaint();
    },
  );
}

export { battleSceneComposerCanvas, battleSceneComposerControls, bindBattleSceneComposer };
