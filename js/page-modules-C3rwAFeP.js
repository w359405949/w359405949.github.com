import { siteUrl } from './visual-metasprites-DJP54-bV.js';
import { SHOP_PAGES } from './story-event-links-CRjG_25M.js';

// @editor-module 引用图目录经 DB 读取发布声明。

const GRAPH_SCHEMA = "metalmaxcn.module-graph";
const MODULE_ID = /^[a-z0-9][a-z0-9._-]*$/u;

const MODULE_GRAPH_SOURCES = Object.freeze([
  siteUrl("package/metadata/module-graph.json"),
]);

const FAMILY_LABELS = Object.freeze({
  actor: "角色图形",
  application: "应用脚本",
  asset: "资产",
  attack: "攻击视觉",
  audio: "音频",
  battle: "战斗",
  boot: "启动",
  char: "字符",
  character: "人物数据",
  code: "代码服务",
  core: "基础字符",
  data: "游戏数据",
  direct: "直接图形",
  dpcm: "DPCM",
  effect: "效果流",
  encounter: "遇敌",
  enemy: "敌方行为",
  facility: "设施",
  field: "场景功能",
  global: "全局服务",
  indirect: "调用服务",
  inventory: "物品栏",
  investigation: "调查",
  metasprite: "组合精灵",
  metatile: "地图图块",
  monster: "怪物图形",
  new: "新游戏",
  palette: "调色板",
  party: "队伍服务",
  project: "项目聚合",
  property: "财产",
  rental: "出租战车",
  role: "角色服务",
  runtime: "运行时",
  save: "存档",
  scene: "场景",
  shared: "共享表",
  sprite: "精灵调色板",
  story: "剧情",
  terminal: "终端",
  text: "文本",
  ui: "界面",
  vehicle: "战车服务",
  visual: "视觉资产",
  world: "世界地图",
});

function plainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function moduleFamily(moduleId) {
  return moduleId.split(/[.-]/u, 1)[0];
}

const MODULE_TITLES = Object.freeze({
  'battle-item-service': '战斗道具攻击参数',
  'battle-target-hp-update-service': '战斗目标生命值更新服务',
  'vehicle-sp-damage-service': '战车装甲值扣减服务',
  'cpu-interrupt-vector-table': '处理器固定中断向量表',
  'frame-nmi-runtime-service': '帧中断运行服务',
  'dpcm-sample': '差分脉码音频采样',
  'dpcm-storage': '差分脉码音频存储',
  'encounter-event-flag-map': '遭遇选择值与全局事件标志映射',
  'field-item-use': '场景道具使用行为',
  'party-healing-service': '人物生命值回复服务',
  'sprite-palette': '共享精灵调色板',
  'runtime-workspace': '模式叠加的运行工作区',
  'party-vehicle-selection-provider': '队伍战车名称选择服务',
  'role-equipment-service': '人物装备位与物品删除同步服务',
  'vehicle-equipment-service': '战车装备、载重与装甲回复服务',
  'shared-indexed-byte-overlays': '固定页重叠索引表',
  'ui-adventure-data-mode': '冒险资料界面模式',
  'ui-item-session-service': '道具界面会话服务',
  'ui-text-provider-workspace': '界面文字提供者运行工作区',
  'ui-text-provider-zero-page-overlays': '界面文字提供者零页叠加视图',
  'ui-tool-inventory-control': '人物与战车工具物品界面',
  'ui-vehicle-armor-tile-removal': '战车装甲瓦片拆卸界面',
  'ui-vehicle-status': '战车详细状态界面',
  'ui-party-status': '人物标题行共享提供者',
  'shared-chr-bank': '共享图形图块库',
  'field-exploration-runtime': '场景探索帧运行服务',
  'field-movement-resolution-service': '场景移动方向与半步判定服务',
  'chr-bank-mapping-service': '图形页组映射服务',
  'raster-interrupt-runtime-service': '光栅中断显示服务',
  'prg-bank-mapping-service': '程序页组映射服务',
  'prg-bank-window-restore-service': '程序页窗口恢复服务',
  'field-terrain-behavior-service': '场景地形图块行为分发服务',
  'oam-object-rendering-service': '精灵对象渲染服务',
  'ppu-transfer-runtime-service': '图像处理器传输服务',
  'nametable-attribute-coordinate-service': '名称表属性坐标换算服务',
  'packed-attribute-quadrant-mask-set': '属性象限保留与清除掩码',
  'index-stride-table': '索引步长字节偏移表族',
});

function displayTitle(moduleId, summary) {
  if (MODULE_TITLES[moduleId]) return MODULE_TITLES[moduleId];
  const text = String(summary || "").trim();
  const separator = text.search(/[：:]/u);
  if (separator > 0 && separator <= 32) return text.slice(0, separator).trim();
  return text.split(/[；。]/u, 1)[0].trim() || moduleId;
}

function normalizeGraph(document, source) {
  if (!plainObject(document) || document.schema !== GRAPH_SCHEMA
      || !plainObject(document.modules)) {
    throw new TypeError(`${source}: 不是 ${GRAPH_SCHEMA} 模块图`);
  }
  const ids = Object.keys(document.modules).sort((left, right) =>
    left.localeCompare(right, "zh-CN"));
  if (!ids.length) throw new TypeError(`${source}: 模块图没有节点`);
  const idSet = new Set(ids);
  const reverse = new Map(ids.map(id => [id, []]));
  const modules = ids.map(id => {
    if (!MODULE_ID.test(id)) throw new TypeError(`${source}: 模块 ID 无效：${id}`);
    const raw = document.modules[id];
    if (!plainObject(raw)) throw new TypeError(`${source}: ${id} 不是模块定义`);
    const references = plainObject(raw.references)
      ? Object.entries(raw.references).map(([target, field]) => ({
          target,
          field: String(field || ""),
        }))
      : [];
    references.forEach(reference => {
      if (idSet.has(reference.target)) reverse.get(reference.target).push({
        source: id,
        field: reference.field,
      });
    });
    const family = moduleFamily(id);
    return {
      id,
      title: displayTitle(id, raw.summary),
      summary: String(raw.summary || ""),
      family,
      familyLabel: FAMILY_LABELS[family] || family,
      ownsSpaces: Array.isArray(raw.owns_spaces)
        ? raw.owns_spaces.map(String).sort() : [],
      references,
      referencedBy: [],
      byteDefinition: plainObject(raw.byte_definition)
        ? {...raw.byte_definition} : null,
      rootAudit: plainObject(raw.root_audit) ? {...raw.root_audit} : null,
      distinctKinds: plainObject(raw.distinct_kinds) ? {...raw.distinct_kinds} : null,
    };
  });
  const byId = new Map(modules.map(module => [module.id, module]));
  modules.forEach(module => {
    module.referencedBy = reverse.get(module.id)
      .sort((left, right) => left.source.localeCompare(right.source));
    Object.freeze(module.references);
    Object.freeze(module.referencedBy);
    Object.freeze(module.ownsSpaces);
    Object.freeze(module);
  });
  const normalization = plainObject(document.handle_normalization)
    ? Object.entries(document.handle_normalization)
      .filter(([prefix, value]) => prefix && plainObject(value) && idSet.has(value.to))
      .map(([prefix, value]) => ({
        prefix,
        target: value.to,
        why: String(value.why || ""),
      }))
      .sort((left, right) => right.prefix.length - left.prefix.length
        || left.prefix.localeCompare(right.prefix))
    : [];
  const families = [...new Map(modules.map(module => [module.family, {
    id: module.family,
    label: module.familyLabel,
  }])).values()].sort((left, right) =>
    left.label.localeCompare(right.label, "zh-CN") || left.id.localeCompare(right.id));
  return Object.freeze({
    schema: GRAPH_SCHEMA,
    source,
    note: String(document.note || ""),
    modules: Object.freeze(modules),
    families: Object.freeze(families),
    module(moduleId) {
      return byId.get(String(moduleId || "")) || null;
    },
    resolveHandle(handle) {
      const value = String(handle || "").trim();
      if (!value) return null;
      if (byId.has(value)) return {module: byId.get(value), handle: value, normalizedBy: null};
      const normalized = normalization.find(item =>
        value === item.prefix || value.startsWith(`${item.prefix}:`));
      if (normalized) return {
        module: byId.get(normalized.target),
        handle: value,
        normalizedBy: normalized,
      };
      const prefix = value.split(":", 1)[0];
      return byId.has(prefix)
        ? {module: byId.get(prefix), handle: value, normalizedBy: null}
        : null;
    },
  });
}

function createModuleCatalog(document, {source = "memory"} = {}) {
  return normalizeGraph(document, source);
}

let catalogPromise = null;

// 引用图按来源顺序读取，第一个有效来源即为权威。
async function loadModuleCatalog({
  fetcher = null,
  sources = MODULE_GRAPH_SOURCES,
  refresh = false,
} = {}) {
  if (!refresh && catalogPromise) return catalogPromise;
  catalogPromise = (async () => {
    const failures = [];
    for (const source of sources) {
      try {
        if (!fetcher && source === MODULE_GRAPH_SOURCES[0]) {
          const {db} = await import('./battle-result-script-runtime-B_EClFew.js').then(function (n) { return n.projectDb; });
          return createModuleCatalog(await db.getPackageDocument("metadata/module-graph.json", null, {readonly: true}), {source});
        }
        if (!fetcher) throw new TypeError('自定义声明来源须注入读取器');
        const response = await fetcher(source, {cache: "no-store"});
        if (!response?.ok) throw new Error(`HTTP ${response?.status || "?"}`);
        return createModuleCatalog(await response.json(), {source});
      } catch (error) {
        failures.push(`${source}: ${error?.message || error}`);
      }
    }
    catalogPromise = null;
    throw new Error(`模块图均不可用：${failures.join("；")}`);
  })();
  return catalogPromise;
}

function moduleResourceDescriptors(moduleId, manifest, catalog = null) {
  const prefix = `${moduleId}:`;
  return (manifest?.browser_original_assets || [])
    .filter(descriptor => descriptor?.resource_id === moduleId
      || String(descriptor?.resource_id || "").startsWith(prefix)
      || catalog?.resolveHandle(descriptor?.resource_id)?.module.id === moduleId)
    .slice()
    .sort((left, right) => left.resource_id.localeCompare(right.resource_id));
}

// @editor-module 承载页面上的模块编辑器；按定稿清单（proposal.json）的 primary_page 归组。
// 模块进入编辑页面的途径只有这一份清单，不从页面或资源形状反推。
const SHOP_PAGE_MODULES = Object.freeze([
  "application-config-family",
  "facility-config",
  "ui-facility",
]);

const PAGE_MODULES = Object.freeze({
  "actors": Object.freeze([
    "direct-frame",
    "metasprite",
    "sprite-palette",
    "actor-visual",
    "shared-chr-bank",
    "metasprite-record",
  ]),
  "audio": Object.freeze([
    "audio-command",
    "audio-driver-section",
    "audio-opcode",
    "audio-voice",
    "dpcm-sample",
    "dpcm-storage",
  ]),
  "attack-effects": Object.freeze([
    "attack-visual",
    "attack-visual-aux-script",
    "battle-action",
    "battle-object-layout",
    "weapon-attack-parameter",
    "shared-indexed-byte-overlays",
  ]),
  "battle-test": Object.freeze([
    "battle-engine",
    "battle-amount-scaling-service",
    "battle-probability-thresholds",
    "battle-random-amount-service",
    "battle-status-scheduler",
    "battle-test-point",
    "index-stride-table",
  ]),
  "battleactors": Object.freeze([
    "battle-party-vertical-layout",
  ]),
  "boot-logo": Object.freeze([
    "boot-presentation",
  ]),
  "characters": Object.freeze([
    "character-growth",
    "character-initial-record",
    "fixed-text-slot",
    "party-field-actor-type-map",
    "party-healing-service",
    "ui-role-status",
    "ui-party-paired-selector",
  ]),
  "equipment-human": Object.freeze([
    "item-entry",
    "role-equipment-derived",
    "ui-equipment-control",
  ]),
  "equipment-tank": Object.freeze([
    "item-entry",
  ]),
  "items": Object.freeze([
    "item-entry",
    "field-item-dispatch",
    "field-item-use",
    "item-acquisition-service",
    "battle-item-service",
  ]),
  "field-investigation": Object.freeze([
    "field-reward-resolution-service",
    "investigation-command",
  ]),
  "monsters": Object.freeze([
    "monster-profile",
    "enemy-action",
    "enemy-action-pattern",
    "enemy-action-selection-service",
    "monster-figure",
    "monster-graphic",
    "monster-palette",
    "monster-palette-pair",
    "monster-visual-layout",
  ]),
  "scenes": Object.freeze([
    "encounter-event-flag-map",
    "encounter-trigger-runtime",
    "field-scene-lifecycle-service",
    "field-scroll-coordinate-delta-set",
    "metatile-page",
    "metatile-set",
    "palette",
    "scene",
    "scene-encounter-zone",
    "scene-direction-transform",
    "world-event",
  ]),
  "save": Object.freeze([
    "save-slot-runtime-service",
  ]),
  "shells": Object.freeze([
    "shell-record",
  ]),
  ...Object.fromEntries(SHOP_PAGES.filter(page => !['shop-1', 'shop-2', 'shop-3'].includes(page.id))
    .map(page => [page.id, SHOP_PAGE_MODULES])),
  "party-strength": Object.freeze([
    "ui-vehicle-status",
  ]),
  "battle-results": Object.freeze([
    "battle-result-script",
  ]),
  "name-entry": Object.freeze([
    "ui-name-entry",
  ]),
  "text": Object.freeze([
    "char",
    "core-latin",
    "text-render-runtime",
    "text-record",
    "ui-tile-rectangle-service",
  ]),
  "title": Object.freeze([
    "boot-presentation",
  ]),
  "vehicles": Object.freeze([
    "vehicle-preset",
    "save-vehicle",
    "vehicle-visual-selector",
  ]),
  "wanted": Object.freeze([
    "wanted-record",
  ]),
  "wanted-ui": Object.freeze([
    "ui-wanted",
  ]),
});

// 同一页面里一个模块只能出现一条：重复会让承载页面长出两个同名模块段。
for (const [page, modules] of Object.entries(PAGE_MODULES)) {
  if (new Set(modules).size !== modules.length) throw new TypeError(`承载页面模块清单有重复：${page}`);
}

export { PAGE_MODULES, createModuleCatalog, loadModuleCatalog, moduleResourceDescriptors };
