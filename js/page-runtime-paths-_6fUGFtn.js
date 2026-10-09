import { STORY_PAGE_VIEW_IDS, storyPlaybackView } from './baseline-assembly-C0KRII8X.js';
import { siteUrl } from './project-store-values-klefznSR.js';

// @editor-module 声明页面正文与取数索引依赖。

const ALL_RESOURCE_INDEX_DOMAINS = Object.freeze([
  "audio", "battle", "code", "data", "package", "rom", "runtime",
  "scene", "story", "text", "ui", "visual",
]);

const STORY_PAGE_SECTIONS = Object.freeze([
  "project.story", "project.audio", "project.ui", "project.game-data", "project.facilities", "project.scenes",
  "field-scene-lifecycle-service",
]);
const STORY_PAGE_DATA_ASSETS = Object.freeze([
  "character-initial-record", "fixed-text-slot", "actor-visual",
  "vehicle-visual-selector", "vehicle-preset", "item",
]);
const ENDING_PAGE_SECTIONS = Object.freeze([
  ...STORY_PAGE_SECTIONS,
  // 结局的通缉回顾复用「通缉令」组件。海报结构与击破图层不是剧情正文，
  // 冷启动时必须在第一帧之前把各自的权威投影挂进来，不能依赖访问过通缉令页。
  // 战车回顾则按 canonical screen ID 查 UI editor，不在剧情包复制布局。
  "project.visuals", "project.ui.editor", "project.ui.dispatch",
]);
const ENDING_PAGE_DATA_ASSETS = Object.freeze([
  ...STORY_PAGE_DATA_ASSETS,
  // formation_id 仍是固定编队 ID；通缉令组件据此解析怪物，而不是由剧情页
  // 自己解释或复制一份编队/怪物数据。
  // 战车状态 UI 同样读取当前有效的战车、装备覆盖，不能退回聚合包快照。
  "battle-test-point", "monster", "vehicle-preset", "item",
]);
const STORY_PAGE_RESOURCE_DOMAINS = Object.freeze([
  "story", "scene", "audio",
]);
const storyPageEntries = value => Object.fromEntries(
  STORY_PAGE_VIEW_IDS.map(view => [view, value]),
);
const RESOURCE_RANGE_DOMAINS_BY_VIEW = Object.freeze({
  ...storyPageEntries(Object.freeze(['story'])),
  monsters: Object.freeze(['data', 'scene']),
});

// 顺序同时也是组合顺序：先装基础节点，再把权威子文档接回去。
const SECTIONS_BY_VIEW = Object.freeze({
  home: [],
  scenes: [
    "project.scenes", "project.scenes.logic", "project.game-data",
    "project.wanted",
    "project.story", "project.facilities", "project.ui", "project.ui.dispatch",
  ],
  metatiles: ["project.scenes"],
  actors: ["project.visuals", "project.story"],
  // 剧情播放器的对话都走 UI 构建数据渲染组件，改动前先核清谁会读取它，
  // 否则预览会报 shared-chr-bank 引用无效。
  ...storyPageEntries(STORY_PAGE_SECTIONS),
  ending: ENDING_PAGE_SECTIONS,
  'story-page': ENDING_PAGE_SECTIONS,
  "attack-effects": [
    "project.visuals", "weapon-attack-parameter",
    "project.game-data", "project.scenes",
  ],
  "battle-test": [
    "project.visuals", "weapon-attack-parameter",
    "monster-visual-layout", "project.game-data", "project.scenes",
    "project.ui", "project.ui.editor", "project.ui.interfaces", "project.ui.dispatch", "project.story",
  ],
  'monster-formations': [
    'project.visuals', 'weapon-attack-parameter', 'monster-visual-layout',
    'project.game-data', 'project.scenes', 'project.ui', 'project.ui.editor', 'project.ui.interfaces',
  ],
  battleactors: [
    "project.visuals", "weapon-attack-parameter", "project.game-data",
    "monster-visual-layout",
  ],
  text: ["project.ui", "project.ui.dispatch", "project.game-data"],
  characters: ["project.game-data", "project.visuals"],
  save: ["project.scenes", "project.scenes.logic", "project.story", "project.facilities"],
  vehicles: [
    "project.game-data", "project.scenes", "project.ui",
    "project.ui.editor", "project.ui.dispatch",
  ],
  monsters: [
    "project.game-data", "project.visuals", "weapon-attack-parameter",
  ],
  equipment: [
    "project.game-data", "project.visuals", "weapon-attack-parameter",
  ],
  items: ["project.game-data"],
  // 炮弹页的「攻击特效」列用 `ui/attack-visual-picker.js`，候选与动画都来自
  // 视效资产。**不列在这里，控件会水合出 0 个候选**——看起来像控件坏了，
  // 其实是这个视图没要那份数据。
  shells: ["project.game-data", "project.visuals", "weapon-attack-parameter"],
  audio: ["project.audio", "audio-sequence", "project.facilities"],
  wanted: [
    "project.wanted", "project.game-data", "project.scenes", "project.visuals",
    "project.ui", "project.ui.editor", "project.ui.dispatch",
  ],
  "wanted-ui": [
    "project.wanted", "project.game-data", "project.scenes", "project.visuals",
    "project.ui", "project.ui.editor", "project.ui.dispatch",
  ],
  shops: [
    "project.facilities", "project.game-data", "project.scenes", "project.ui",
    "project.ui.editor", "project.ui.interfaces", "project.ui.dispatch",
  ],
  interfaceui: [
    "project.ui", "project.ui.editor", "project.ui.interfaces",
    "project.ui.dispatch", "project.ui.templates", "project.game-data",
  ],
  jukebox: [
    "project.facilities", "project.ui",
    "project.ui.editor", "project.ui.interfaces", "project.ui.dispatch",
  ],
  vending: [
    "project.facilities", "project.game-data", "project.ui",
    "project.ui.editor", "project.ui.interfaces", "project.ui.dispatch",
  ],
  frograce: [
    "project.facilities", "project.ui",
    "project.ui.editor", "project.ui.interfaces", "project.ui.dispatch",
  ],
  teleport: [
    "project.facilities", "project.scenes", "project.ui",
    "project.ui.editor", "project.ui.interfaces", "project.ui.dispatch",
  ],
  computercontroller: [
    "project.facilities", "project.scenes", "project.ui",
    "project.ui.editor", "project.ui.interfaces", "project.ui.dispatch",
  ],
  // v4 bank shard 是字节地图页面的完整运行时输入；根清单和目标 bank 均由页面
  // loader 按需读取，不能在 prepareViewData 中顺带预取其他领域正文。
  // 字库是基础资产，开机两屏只持引用；文字要显示成什么字得去字库登记表查，
  // 不能按偏移自己解一份。
  "cutscene-boot-logo": ["project.boot-presentation", "project.text-fonts", "project.audio", "audio-sequence"],
  "cutscene-title": ["project.boot-presentation", "project.text-fonts", "project.audio", "audio-sequence"],
  "bytemap-prg": [],
  "bytemap-chr": [],
  "bytemap-sram": [],
  // 模块图与目标绑定由本页自己按需取；它不读任何分页正文。
  handlers: [],
  build: [],
  emulator: [],
});

const DATA_ASSETS_BY_VIEW = Object.freeze({
  // 场景 $98 的调查战斗格只持触发器引用；当前编队和登场怪物必须从
  // battle-test-point 的有效值现查，不能继续显示 logic.json 的提取期快照。
  scenes: [
    "item", "monster", "battle-test-point", "vehicle-preset", "shell-record",
    "actor-visual", "fixed-text-slot",
  ],
  // 角色页、场景检查器和 NPC 目录读取同一份当前有效形象映射，不能退回
  // story / visuals 派生索引。
  actors: ["actor-visual"],
  "attack-effects": ["battle-test-point", "monster", "item"],
  "battle-test": ["character-initial-record", "vehicle-preset", "battle-test-point", "monster", "item", "shell-record"],
  'monster-formations': ['character-initial-record', 'vehicle-preset', 'battle-test-point', 'monster', 'item', 'shell-record'],
  battleactors: ["character-initial-record", "vehicle-preset", "monster", "item"],
  // 剧情左栏的主角名单来自 character-initial-record，槽位到存活形象类型来自
  // actor-visual。两份 working 正文都要在首次编译 VM 之前进入 DB 缓存，不能先用
  // 发布快照画一帧、等选择器水合后再悄悄换值。
  ...storyPageEntries(STORY_PAGE_DATA_ASSETS),
  'story-page': ENDING_PAGE_DATA_ASSETS,
  ending: ENDING_PAGE_DATA_ASSETS,
  text: ["item", "monster", "shell-record"],
  save: ["item", "vehicle-preset", "actor-visual", "monster", "battle-test-point"],
  // 初始装备下拉框会同步读道具名称；这份依赖属于当前屏幕，不能依赖用户曾经
  // 打开过道具页留下的偶然缓存。
  characters: [
    "character-initial-record", "fixed-text-slot", "item", "actor-visual", "metasprite-record",
  ],
  vehicles: ["vehicle-preset", "item", "shell-record"],
  // 掉落选择器在列表首屏就读取 item 候选，必须和怪物正文一起准备。
  // 攻击行动三段 owner 仍只在打开单只怪物的记录页时参与运行时面板。
  monsters: ["monster", "item"],
  equipment: ["item"],
  items: ["item", "battle-result-script"],
  shells: ["shell-record", "item"],
  wanted: ["wanted-record", "item", "battle-test-point", "monster"],
  "wanted-ui": ["wanted-record", "item", "battle-test-point", "monster"],
  shops: ["item", "shell-record", "vehicle-preset"],
  interfaceui: [
    "character-initial-record", "fixed-text-slot", "monster", "battle-test-point", "item",
    "vehicle-preset", "shell-record",
  ],
  jukebox: [],
  vending: ["item", "shell-record"],
  frograce: [],
  teleport: [],
  computercontroller: [],
  "bytemap-prg": [],
});

const RESOURCE_DOMAINS_BY_VIEW = Object.freeze({
  scenes: ["scene", "story", "data", "ui", "package"],
  actors: ["visual", "story"],
  ...storyPageEntries(STORY_PAGE_RESOURCE_DOMAINS),
  "attack-effects": ["battle", "visual", "data", "scene"],
  "battle-test": ["battle", "visual", "data", "scene"],
  'monster-formations': ['battle', 'visual', 'data', 'scene'],
  battleactors: ["battle", "visual", "data"],
  text: ["text", "ui"],
  characters: ["data", "text", "visual", "package"],
  vehicles: ["data", "scene", "ui", "text"],
  monsters: ["data", "scene", "battle", "visual"],
  equipment: ["data", "battle"],
  items: ["data", "code"],
  shells: ["data", "battle"],
  audio: ["audio"],
  wanted: ["ui", "data", "scene", "visual", "battle", "rom"],
  "wanted-ui": ["ui", "data", "scene", "visual", "battle", "rom"],
  shops: ["ui", "data", "text"],
  interfaceui: ["ui", "text", "data"],
  jukebox: ["ui", "audio", "text", "rom"],
  vending: ["ui", "text", "rom"],
  frograce: ["ui", "audio", "text", "rom"],
  teleport: ["ui", "scene", "text", "rom"],
  computercontroller: ["ui", "scene", "text", "rom"],
  "bytemap-prg": [],
  "bytemap-chr": [],
});

// @editor-module 声明页面入口模块及按页装载依赖。
const PAGE_RUNTIME_PATHS = Object.freeze(Object.fromEntries(Object.entries({
  "field-editor": "/ui/field-object-editor.js",
  "audio": "/views/audio.js",
  "actors": "/views/actors.js",
  "battle": "/views/battle.js",
  'monster-formations': '/views/monster-formations.js',
  "battle-actors": "/views/battle-actors.js",
  "emulator": "/views/emulator.js",
  "byte-map/sram": "/views/byte-map/sram.js",
  "save-page": "/views/save-page.js",
  "build-log": "/views/build-log.js",
  "data/characters": "/views/data/characters.js",
  "data/monsters": "/views/data/monsters.js",
  "shops": "/views/shops.js",
  "interface-pages": "/views/interface-pages.js",
  'service-pages': '/views/service-pages.js',
  "scenes/encounter": "/views/scenes/encounter.js",
  "data/pages": "/views/data/pages.js",
  "data/vehicles": "/views/data/vehicles.js",
  "facilities": "/views/facilities.js",
  "investigation": "/views/investigation.js",
  "npcs": "/views/npcs.js",
  "wanted": "/views/wanted.js",
  "byte-map/prg": "/views/byte-map/prg.js",
  "byte-map/chr": "/views/byte-map/chr.js",
  "scenes/interact": "/views/scenes/interact.js",
  "scenes/overview": "/views/scenes/overview.js",
  "scenes/workbench": "/views/scenes/workbench.js",
  "metatiles": "/views/metatiles.js",
  "story/playback": "/views/story/playback.js",
  "story/catalog": "/views/story/catalog.js",
  "boot-presentation": "/views/boot-presentation.js",
  "text/charset": "/views/text/charset.js",
  'text/catalog': '/views/text/catalog.js',
  "actors-bind": "/views/actors-bind.js",
  "battle-bind": "/views/battle-bind.js",
  "data/items": "/views/data/items.js"
}).map(([name, path]) => [name, siteUrl(path)])));

function pageRuntimeModulePaths(view) {
  return [
    ["interfaceui", "scenes", "text", "audio", "save", "shops", "jukebox", "vending", "frograce", "teleport", "computercontroller"]
      .includes(view) ? PAGE_RUNTIME_PATHS["field-editor"] : null,
    view === 'audio' ? PAGE_RUNTIME_PATHS["audio"] : null,
    view === 'actors' ? PAGE_RUNTIME_PATHS["actors"] : null,
    view === 'battle-test' || view === 'attack-effects' ? PAGE_RUNTIME_PATHS["battle"] : null,
    view === 'monster-formations' ? PAGE_RUNTIME_PATHS['monster-formations'] : null,
    view === 'battleactors' ? PAGE_RUNTIME_PATHS["battle-actors"] : null,
    view === 'emulator' ? PAGE_RUNTIME_PATHS["emulator"] : null,
    view === 'save' || view === 'bytemap-sram' ? PAGE_RUNTIME_PATHS["byte-map/sram"] : null,
    view === 'save' ? PAGE_RUNTIME_PATHS["save-page"] : null,
    view === 'build' ? PAGE_RUNTIME_PATHS["build-log"] : null,
    view === 'characters' ? PAGE_RUNTIME_PATHS["data/characters"] : null,
    view === 'monsters' ? PAGE_RUNTIME_PATHS["data/monsters"] : null,
    view === 'shops' || view === 'jukebox' || view === 'vending' ? PAGE_RUNTIME_PATHS["shops"] : null,
    view === 'interfaceui' ? PAGE_RUNTIME_PATHS["interface-pages"] : null,
    view === 'interfaceui' ? PAGE_RUNTIME_PATHS['service-pages'] : null,
    view === 'monsters' ? PAGE_RUNTIME_PATHS["scenes/encounter"] : null,
    view === 'characters' || view === 'monsters' || view === 'vehicles' || view === 'equipment' || view === 'items' || view === 'shells' ? PAGE_RUNTIME_PATHS["data/pages"] : null,
    view === 'vehicles' ? PAGE_RUNTIME_PATHS["data/vehicles"] : null,
    view === 'jukebox' || view === 'vending' || view === 'frograce' || view === 'teleport' || view === 'computercontroller' ? PAGE_RUNTIME_PATHS["facilities"] : null,
    view === 'scenes' ? PAGE_RUNTIME_PATHS["investigation"] : null,
    view === 'scenes' || view === 'npcs' ? PAGE_RUNTIME_PATHS["npcs"] : null,
    view === 'wanted' || view === 'wanted-ui' ? PAGE_RUNTIME_PATHS["wanted"] : null,
    view === 'bytemap-prg' ? PAGE_RUNTIME_PATHS["byte-map/prg"] : null,
    view === 'bytemap-chr' ? PAGE_RUNTIME_PATHS["byte-map/chr"] : null,
    view === 'scenes' ? PAGE_RUNTIME_PATHS["scenes/interact"] : null,
    view === 'scenes' ? PAGE_RUNTIME_PATHS["scenes/overview"] : null,
    view === 'scenes' ? PAGE_RUNTIME_PATHS["scenes/workbench"] : null,
    view === 'metatiles' ? PAGE_RUNTIME_PATHS["metatiles"] : null,
    storyPlaybackView(view) ? PAGE_RUNTIME_PATHS["story/playback"] : null,
    view === 'actors' ? PAGE_RUNTIME_PATHS["story/catalog"] : null,
    view === 'cutscene-boot-logo' || view === 'cutscene-title' ? PAGE_RUNTIME_PATHS["boot-presentation"] : null,
    view === 'text' ? PAGE_RUNTIME_PATHS["text/charset"] : null,
    view === 'text' ? PAGE_RUNTIME_PATHS['text/catalog'] : null,
    view === 'actors' ? PAGE_RUNTIME_PATHS["actors-bind"] : null,
    view === 'battle-test' || view === 'attack-effects' ? PAGE_RUNTIME_PATHS["battle-bind"] : null,
    view === 'equipment' || view === 'items' ? PAGE_RUNTIME_PATHS["data/items"] : null,
  ].filter(Boolean);
}

export { ALL_RESOURCE_INDEX_DOMAINS, DATA_ASSETS_BY_VIEW, PAGE_RUNTIME_PATHS, RESOURCE_DOMAINS_BY_VIEW, RESOURCE_RANGE_DOMAINS_BY_VIEW, SECTIONS_BY_VIEW, pageRuntimeModulePaths };
