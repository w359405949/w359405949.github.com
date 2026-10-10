import { STORY_PAGE_DEFINITIONS } from './baseline-assembly-DW8BWbDB.js';

// @editor-module 登记独立游戏界面页路由与底层 UI screen 接管关系。
//
// 这里登记的是页面路由，不拥有任何界面资产。界面状态、布局、文字和预览仍由
// project.ui.editor / project.ui.construction 各自的基础模块提供；独立页只持引用。

const SERVICE_INTERFACE_PAGE_DEFINITIONS = Object.freeze([
  Object.freeze({id: 'interaction-service', label: '服务交互', servicePage: true,
    description: '编辑服务交互的配置、脚本入口与对话。',
    status: 'confirmed', commandIds: Object.freeze([])}),
  Object.freeze({
    id: "save-service",
    label: "存档服务",
    servicePage: true,
    configResourceId: "save-slot-runtime-service",
    status: "confirmed",
    commandIds: Object.freeze([0x34]),
    interfaceIds: Object.freeze(["save-management"]),
    stateIds: Object.freeze([
      "save-management.save-prompt",
      "save-management.slot-select",
      "save-management.saved",
    ]),
  }),
  Object.freeze({
    id: "vehicle-supply-service",
    label: "战车补给服务",
    servicePage: true,
    status: "confirmed",
    commandIds: Object.freeze([0x20]),
  }),
  Object.freeze({
    id: "storage-service",
    label: "财产保管处",
    servicePage: true,
    status: "confirmed",
    commandIds: Object.freeze([0x26]),
    screenIds: Object.freeze(["ui-screen:constructor:storage-main-menu"]),
  }),
  Object.freeze({
    id: "family-home-service",
    label: "父亲与家中服务",
    status: "confirmed",
    commandIds: Object.freeze([0x21]),
  }),
  Object.freeze({
    id: "minchi-revival-service",
    label: "明奇博士尸体复活",
    status: "confirmed",
    commandIds: Object.freeze([0x22]),
  }),
  Object.freeze({
    id: "chassis-modification-service",
    label: "底盘改造",
    status: "confirmed",
    commandIds: Object.freeze([0x23]),
  }),
  Object.freeze({
    id: "engine-modification-service",
    label: "发动机改造",
    status: "confirmed",
    commandIds: Object.freeze([0x28]),
  }),
  Object.freeze({
    id: "vehicle-repair-service",
    label: "战车修理",
    status: "confirmed",
    commandIds: Object.freeze([0x29]),
  }),
  Object.freeze({
    id: "school-donation-service",
    label: "学校捐款",
    status: "inferred",
    commandIds: Object.freeze([0x2A]),
  }),
  Object.freeze({
    id: "laser-cannon-lens-service",
    label: "激光炮镜片排列",
    status: "confirmed",
    commandIds: Object.freeze([0x2B]),
    saveInventoryRoles: Object.freeze(["hunter", "mechanic", "soldier"]),
    entryActors: Object.freeze([Object.freeze({
      uid: "scene-actor:86:00",
      scene: "134-scene-86",
      sceneObject: "actor:0",
      interactionScriptId: 0x3C,
    })]),
  }),
  Object.freeze({
    id: "vehicle-wash-service",
    label: "战车清洗",
    status: "confirmed",
    commandIds: Object.freeze([0x2E]),
  }),
  Object.freeze({
    id: "paralysis-massage-service",
    label: "麻痹按摩治疗",
    status: "confirmed",
    commandIds: Object.freeze([0x2F]),
  }),
  Object.freeze({id: 'chassis-advice-service', label: '底盘改造建议',
    commandIds: Object.freeze([0x27])}),
  Object.freeze({id: 'vehicle-trade-service', label: '战车交易与防盗警告',
    commandIds: Object.freeze([0x2C]), status: 'confirmed', configResourceId: 'application-command',
    configHandles: Object.freeze(['application-command:2C:00', 'application-command:2C:01']),
    entryActors: Object.freeze([Object.freeze({uid: 'scene-actor:93:00',
      scene: '147-scene-93', sceneObject: 'actor:0', interactionScriptId: 0x30})])}),
  Object.freeze({id: 'rental-return-service', label: '归还出租战车',
    commandIds: Object.freeze([0x30])}),
  Object.freeze({id: 'configured-investigation-service', label: '双配置调查设施',
    commandIds: Object.freeze([0x1D]), interfaceIds: Object.freeze(['configured-investigation-facility'])}),
  Object.freeze({id: 'secondary-computer-controller', label: '计算机控制器 $38',
    commandIds: Object.freeze([0x38]), interfaceIds: Object.freeze(['control-terminals']),
    route: Object.freeze({view: 'interfaceui', interface: 'secondary-computer-controller', previewCommand: 0x38})}),
]);

const shopServicePages = [
  [0x10, '战车装备商店', 'vehicle-equipment-shop', 0],
  [0x11, '战车道具商店', 'vehicle-item-shop', 1],
  [0x12, '人类装备商店', 'human-equipment-shop', 2],
  [0x13, '人类道具商店', 'human-item-shop', 3],
  [0x14, '战车出租店', 'vehicle-rental-service', 4],
  [0x15, '特殊炮弹商店', 'special-shell-shop', 5],
  [0x16, '旅馆', 'inn-service', 6],
  [0x17, '酒吧服务 A', 'bar-service', 7],
  [0x18, '酒吧服务 B', 'bar-service', 8],
  [0x19, '室内装饰商店', 'interior-decoration-shop', 9],
  [0x1E, '草药商人', 'herbal-medicine-vendor', 14],
  [0x1F, '电梯', 'unresolved-dynamic-list-application', 15],
].map(([commandId, label, interfaceId, shopFamily]) => ({commandId, label,
  id: `shop-ui:${shopFamily}`, interfaceIds: [interfaceId],
  route: {view: 'shops', shopFamily, shopTab: 'ui'}}));

const facilityServicePages = [
  [0x1A, '自动点唱机', 'jukebox', 'jukebox'],
  [0x1B, '道具自动售货机', 'vending-machines', 'vending', {vendingFamily: 11}],
  [0x1C, '炮弹自动售货机', 'vending-machines', 'vending', {vendingFamily: 12}],
  [0x1D, '双配置售货机', 'vending-machines', 'vending', {vendingFamily: 13}],
  [0x2D, '时空隧道', 'teleport-terminal', 'teleport'],
  [0x32, '青蛙赛跑', 'frog-race', 'frograce'],
  [0x36, '计算机控制器 $36', 'control-terminals', 'computercontroller', {previewCommand: 0x36}],
  [0x38, '计算机控制器 $38', 'control-terminals', 'computercontroller', {previewCommand: 0x38}],
].map(([commandId, label, interfaceId, view, query = {}]) => ({commandId, label,
  id: `facility-service:${commandId}`, interfaceIds: [interfaceId],
  route: {view, facility: 'ui', ...query}}));

const SERVICE_FAMILY_PAGES = Object.freeze([
  ...shopServicePages, ...facilityServicePages,
  {commandId: 0x24, id: 'special-item-buyer', label: '人类物品收购',
    interfaceIds: ['special-item-buyer'], route: {view: 'shops', shopFamily: 3, shopTab: 'buyer'}},
  {commandId: 0x25, id: 'wanted-office-service', label: '通缉情报与奖金事务所',
    interfaceIds: ['wanted-information'], route: {view: 'interfaceui', interface: 'wanted-office-service'}},
  ...SERVICE_INTERFACE_PAGE_DEFINITIONS.filter(page => page.commandIds.length).map(page => ({
    ...page, commandId: page.commandIds[0], interfaceIds: page.interfaceIds || [page.id],
    route: page.route || {view: 'interfaceui', interface: page.id},
  })),
  {commandId: 0x35, id: 'experience-information-terminal', label: '下一等级经验值终端',
    interfaceIds: ['experience-information-terminal'], route: {view: 'interfaceui', interface: 'experience-information-terminal'}},
  {commandId: 0x37, id: 'noah-control-terminal', label: '密码控制终端',
    interfaceIds: ['noah-control-terminal', 'control-terminals'], route: {view: 'interfaceui', interface: 'noah-control-terminal'}},
].map(page => Object.freeze({...page, commandIds: Object.freeze([page.commandId]),
  interfaceIds: Object.freeze([...page.interfaceIds]), route: Object.freeze(page.route), serviceFlow: true})));

function serviceFamilyPage(commandId) {
  return SERVICE_FAMILY_PAGES.find(page => page.commandId === Number(commandId)) || null;
}

const ITEM_EFFECT_PAGE_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: "satellite-map",
    label: "卫星地图",
    status: "confirmed",
    itemEffect: "world-map",
    interfaceIds: Object.freeze(["human-items"]),
    stateIds: Object.freeze(["human-items.world-map"]),
    screenIds: Object.freeze(["ui-screen:constructor:field-item-world-map"]),
  }),
  Object.freeze({
    id: "field-item-fax",
    label: "传真传送",
    status: "confirmed",
    itemEffect: "fax",
    loadoutPage: "human-items",
    interfaceIds: Object.freeze(["human-items"]),
    stateIds: Object.freeze(["human-items.fax-destination-select", "human-items.fax-return-confirm"]),
  }),
]);

function itemEffectPagesForItem(item) {
  if (!["human-item", "tank-item"].includes(item?.category?.id)) return [];
  return ITEM_EFFECT_PAGE_DEFINITIONS.filter(page => item.use_effect?.effect_family?.id === page.itemEffect);
}

const NON_BATTLE_INTERFACE_PAGE_DEFINITIONS = Object.freeze([
  Object.freeze({id: 'common-elements', label: '公共界面元素', status: 'confirmed',
    interfaceIds: Object.freeze([]), screenIds: Object.freeze([])}),
  Object.freeze({
    id: "startup-load",
    label: "读档画面",
    status: "confirmed",
    interfaceIds: Object.freeze(["save-management"]),
    stateIds: Object.freeze(["save-management.file-menu"]),
    screenIds: Object.freeze(["ui-screen:constructor:startup-load-file-menu"]),
  }),
  Object.freeze({
    id: "non-battle-main-menu",
    label: "非战斗主菜单",
    status: "confirmed",
    interfaceIds: Object.freeze(["field-command-menu"]),
    stateIds: Object.freeze([
      "field-command-menu.main",
      "field-command-menu.cancel",
    ]),
    menuCommandIds: Object.freeze([0x4B]),
    screenIds: Object.freeze(["ui-screen:command:4B"]),
  }),
  Object.freeze({
    id: "field-dialogue",
    label: "对话",
    status: "confirmed",
    interfaceIds: Object.freeze([
      "walking-dialogue",
      "dialogue-choice",
      "dialogue-scripted-encounter",
    ]),
    menuCommandIds: Object.freeze([0x20]),
    screenIds: Object.freeze([]),
  }),
  Object.freeze({
    id: "field-board-exit",
    label: "乘降",
    status: "confirmed",
    interfaceIds: Object.freeze(["field-command-menu"]),
    stateIds: Object.freeze(["field-command-menu.branch"]),
    menuCommandIds: Object.freeze([0x21]),
    screenIds: Object.freeze(["ui-screen:command:21"]),
  }),
  Object.freeze({
    id: "field-investigation",
    label: "调查",
    status: "unresolved",
    interfaceIds: Object.freeze(["field-investigation"]),
    menuCommandIds: Object.freeze([0x26]),
    screenIds: Object.freeze([]),
  }),
  Object.freeze({
    id: "party-strength",
    label: "强度",
    status: "confirmed",
    interfaceIds: Object.freeze(["character-status", "vehicle-status"]),
    menuCommandIds: Object.freeze([0x22]),
    screenIds: Object.freeze([
      "ui-screen:command:22",
      "ui-screen:command:22/31/49",
      "ui-screen:command:22/31/49:tank",
      "ui-screen:command:22/33",
    ]),
  }),
  Object.freeze({
    id: "human-items",
    label: "工具",
    status: "confirmed",
    menuCommandIds: Object.freeze([0x23, 0x1B]),
    excludedStateIds: Object.freeze(ITEM_EFFECT_PAGE_DEFINITIONS.flatMap(page => page.stateIds)),
    screenIds: Object.freeze([
      "ui-screen:command:23/1B",
    ]),
  }),
  Object.freeze({
    id: "human-equipment",
    label: "装备",
    status: "confirmed",
    menuCommandIds: Object.freeze([0x24]),
    screenIds: Object.freeze(["ui-screen:command:24"]),
  }),
  Object.freeze({
    id: "vehicle-equipment-shells",
    label: "炮弹",
    status: "confirmed",
    menuCommandIds: Object.freeze([0x25]),
    screenIds: Object.freeze(["ui-screen:command:25"]),
  }),
  Object.freeze({
    id: "field-mode",
    label: "模式",
    status: "confirmed",
    interfaceIds: Object.freeze(["field-command-menu"]),
    stateIds: Object.freeze([
      "field-command-menu.mode-settings",
      "field-command-menu.adventure-data",
      "field-command-menu.battle-data",
      "field-command-menu.experience-data",
      "field-command-menu.gold-amount",
      "field-command-menu.information-setting",
      "field-command-menu.animation-setting",
      "field-command-menu.audio-setting",
    ]),
    menuCommandIds: Object.freeze([0x27, 0x41, 0x42, 0x43, 0x44]),
    screenIds: Object.freeze([
      "ui-screen:command:27",
      "ui-screen:command:41",
    ]),
  }),
]);

const BATTLE_INTERFACE_PAGE_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: "battle-scene",
    label: "战斗场景",
    status: "confirmed",
    screenIds: Object.freeze([]),
  }),
  Object.freeze({
    id: "battle-command-target",
    label: "战斗命令与目标选择",
    status: "confirmed",
    screenIds: Object.freeze([]),
  }),
  Object.freeze({
    id: "battle-party-status",
    label: "战斗队伍状态",
    status: "confirmed",
    screenIds: Object.freeze([]),
  }),
  Object.freeze({
    id: "battle-items-equipment",
    label: "战斗道具、装备与炮弹",
    status: "confirmed",
    screenIds: Object.freeze([]),
  }),
  Object.freeze({
    id: "battle-messages",
    label: "战斗文本与效果提示",
    status: "confirmed",
    screenIds: Object.freeze([]),
  }),
  Object.freeze({
    id: "battle-results",
    label: "战斗结果",
    status: "confirmed",
    screenIds: Object.freeze([]),
  }),
]);

const UNCATEGORIZED_INTERFACE_PAGE_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: "ending-credits",
    label: "职员表与结局消息",
    status: "confirmed",
    stateIds: Object.freeze(["ending-credits.credits-page", "ending-credits.message"]),
    screenIds: Object.freeze(Array.from({length: 15}, (_, index) =>
      `ui-screen:constructor:ending-credit-${index.toString(16).toUpperCase().padStart(2, "0")}`).concat(
      ["ui-screen:constructor:ending-retirement-message", "ui-screen:constructor:ending-message-10", "ui-screen:constructor:ending-message-11",
        "ui-screen:constructor:ending-message-12"])),
  }),
  Object.freeze({
    id: "name-entry",
    label: "姓名输入与战车命名",
    status: "confirmed",
    screenIds: Object.freeze(["ui-screen:constructor:vehicle-name",
      "ui-screen:constructor:vehicle-name-typed", "ui-screen:constructor:vehicle-name-end",
      "ui-screen:constructor:player-name", "ui-screen:constructor:player-name-typed",
      "ui-screen:constructor:player-name-end"]),
  }),
  Object.freeze({
    id: "save-management",
    label: "存档管理与记忆中心",
    status: "confirmed",
    stateIds: Object.freeze([
      "save-management.save-prompt",
      "save-management.slot-select",
      "save-management.saved",
    ]),
    screenIds: Object.freeze(["ui-screen:constructor:save-prompt",
      "ui-screen:constructor:slot-select", "ui-screen:constructor:saved"]),
  }),
  Object.freeze({
    id: "experience-information-terminal",
    label: "下一等级经验值终端",
    status: "confirmed",
    screenIds: Object.freeze([
      "ui-screen:constructor:next-level-experience-screen",
    ]),
  }),
  Object.freeze({
    id: "noah-control-terminal",
    label: "诺亚密码终端",
    status: "confirmed",
    stateIds: Object.freeze(["noah-control-terminal.frame", "noah-control-terminal.input", "noah-control-terminal.result"]),
    screenIds: Object.freeze(["ui-screen:constructor:noah-password-terminal",
      "ui-screen:constructor:noah-password-terminal-result"]),
  }),
]);

const INTERFACE_PAGE_DEFINITIONS = Object.freeze([
  ...NON_BATTLE_INTERFACE_PAGE_DEFINITIONS,
  ...ITEM_EFFECT_PAGE_DEFINITIONS,
  ...BATTLE_INTERFACE_PAGE_DEFINITIONS,
  ...UNCATEGORIZED_INTERFACE_PAGE_DEFINITIONS,
  ...SERVICE_INTERFACE_PAGE_DEFINITIONS,
  Object.freeze({id: 'wanted-office-service', label: '通缉情报与奖金事务所',
    commandIds: Object.freeze([0x25]), interfaceIds: Object.freeze(['wanted-information'])}),
]);

const INTERFACE_PAGE_BY_ID = new Map(
  INTERFACE_PAGE_DEFINITIONS.map(definition => [definition.id, definition]),
);

const DEFAULT_INTERFACE_PAGE = INTERFACE_PAGE_DEFINITIONS.find(page => page.id === 'startup-load');

function interfacePageDefinition(id) {
  const definition = INTERFACE_PAGE_BY_ID.get(String(id || ""));
  const service = SERVICE_FAMILY_PAGES.find(page => page.id === definition?.id);
  return definition ? {...definition, ...service} : null;
}

function normalizeInterfacePageId(id) {
  return interfacePageDefinition(id)?.id || DEFAULT_INTERFACE_PAGE.id;
}

const STATIC_DEDICATED_UI_PAGE_GROUPS = [
  {
    view: "shops",
    shopFamily: 3,
    shopTab: "buyer",
    label: "人类物品收购",
    interfaceIds: ["special-item-buyer"],
    screenIds: [],
  },
  {
    view: "cutscene-title",
    label: "启动 Logo / 标题画面",
    interfaceIds: ["opening-title"],
    screenIds: [],
  },
  {
    view: "wanted-ui",
    label: "通缉令界面",
    interfaceIds: ["wanted-information"],
    screenIds: ["ui-screen:constructor:wanted-poster-screen"],
  },
  {
    view: "jukebox",
    label: "自动点唱机",
    interfaceIds: ["jukebox"],
    screenIds: ["ui-screen:constructor:jukebox-screen"],
  },
  {
    view: "vending",
    label: "自动售货机",
    interfaceIds: ["vending-machines"],
    screenIds: ["ui-screen:constructor:vending-machine-screen"],
  },
  {
    view: "frograce",
    label: "青蛙赛跑",
    interfaceIds: ["frog-race"],
    screenIds: ["ui-screen:constructor:frog-race-screen"],
  },
  {
    view: "teleport",
    label: "时空隧道",
    interfaceIds: ["teleport-terminal"],
    screenIds: ["ui-screen:constructor:teleport-terminal-screen"],
  },
  {
    view: "computercontroller",
    label: "计算机控制器",
    interfaceIds: ["control-terminals"],
    screenIds: ["ui-screen:constructor:computer-controller-screen"],
  },
  {
    view: "shops",
    label: "商店与服务",
    interfaceIds: [
      "vehicle-equipment-shop",
      "vehicle-item-shop",
      "human-equipment-shop",
      "human-item-shop",
      "special-shell-shop",
      "interior-decoration-shop",
      "herbal-medicine-vendor",
      "vehicle-rental-service",
      "inn-service",
      "bar-service",
      "unresolved-dynamic-list-application",
    ],
    screenIds: ["ui-screen:constructor:shop-buy"],
  },
];

function freezeDestination(destination) {
  return Object.freeze({
    ...destination,
    interfaceIds: Object.freeze([...destination.interfaceIds]),
    stateIds: Object.freeze([...(destination.stateIds || [])]),
    screenIds: Object.freeze([...destination.screenIds]),
  });
}

const interfacePageDestinations = INTERFACE_PAGE_DEFINITIONS.map(definition => ({
  view: definition.id === "battle-scene" ? "battle-test" : "interfaceui",
  label: definition.label,
  interfacePage: definition.id,
  interfaceIds: definition.interfaceIds || [definition.id],
  stateIds: definition.stateIds || [],
  screenIds: definition.screenIds || [],
}));

const DEDICATED_UI_PAGE_GROUPS = Object.freeze([
  ...STATIC_DEDICATED_UI_PAGE_GROUPS.map(freezeDestination),
  ...interfacePageDestinations.map(freezeDestination),
]);

const DESTINATION_BY_INTERFACE = new Map();
const DESTINATION_BY_STATE = new Map();
const DESTINATION_BY_SCREEN = new Map();
for (const destination of DEDICATED_UI_PAGE_GROUPS) {
  if (!destination.stateIds.length) {
    for (const interfaceId of destination.interfaceIds) {
      DESTINATION_BY_INTERFACE.set(interfaceId, destination);
    }
  }
  for (const stateId of destination.stateIds) {
    DESTINATION_BY_STATE.set(stateId, destination);
  }
  for (const screenId of destination.screenIds) {
    DESTINATION_BY_SCREEN.set(screenId, destination);
  }
}

function dedicatedUiPageForScreen(screen) {
  if (!screen) return null;
  const byScreen = DESTINATION_BY_SCREEN.get(String(screen.id || ""));
  if (byScreen) return byScreen;
  const stateId = screen.interface_state_id ?? screen.metadata?.interface_state_id;
  const byState = DESTINATION_BY_STATE.get(String(stateId || ""));
  if (byState) return byState;
  const interfaceId = screen.interface_id ?? screen.metadata?.interface_id;
  return DESTINATION_BY_INTERFACE.get(String(interfaceId || "")) || null;
}

// @editor-module 编辑页面分组与页面内的同级对象。

const SHOP_ITEM_BUYER_ROUTE = Object.freeze({view: "shops", shopFamily: 3, shopTab: "buyer"});

function itemPageRoute(item) {
  const category = item?.category?.id;
  const view = category ? ['human-item', 'tank-item'].includes(category) ? 'items' : 'equipment'
    : Number(item?.id) >= 0x01 && Number(item?.id) <= 0x98 ? 'equipment' : 'items';
  return {view, record: String(item.id), ...(view === 'equipment'
    ? {equipmentDomain: category?.startsWith('tank-') ? 'tank' : 'human'} : {})};
}

// 配置族保留领域身份与原有路由。
const SHOP_PAGES = Object.freeze([
  {"id":"shops","label":"战车装备商店","route":{"view":"shops","shopFamily":0}},
  {"id":"shop-1","label":"战车道具商店","route":{"view":"shops","shopFamily":1}},
  {"id":"shop-2","label":"人类装备商店","route":{"view":"shops","shopFamily":2}},
  {"id":"shop-3","label":"人类道具商店","route":{"view":"shops","shopFamily":3}},
  {"id":"shop-5","label":"特殊炮弹商店","route":{"view":"shops","shopFamily":5}},
  {"id":"shop-9","label":"室内装饰商店","route":{"view":"shops","shopFamily":9}},
  {"id":"shop-14","label":"草药商人","route":{"view":"shops","shopFamily":14}},
  {"id":"shop-4","label":"战车出租店","route":{"view":"shops","shopFamily":4}},
  {"id":"shop-6","label":"旅馆","route":{"view":"shops","shopFamily":6}},
  {"id":"shop-7","label":"酒吧服务 A","route":{"view":"shops","shopFamily":7}},
  {"id":"shop-8","label":"酒吧服务 B","route":{"view":"shops","shopFamily":8}},
  {"id":"shop-15","label":"电梯","route":{"view":"shops","shopFamily":15}},
]);

function normalizeShopPageRoute(params) {
  if (params.get("view") === "interfaceui" && params.get("interface") === "special-item-buyer") {
    for (const [key, value] of Object.entries(SHOP_ITEM_BUYER_ROUTE)) params.set(key, value);
    for (const key of ["interface", "record", "resource", "shopConfig", "shopPage", "shopDialogue"]) params.delete(key);
    return true;
  }
  if (params.get("view") !== "shops" || Number(params.get("shopFamily")) !== 13) return false;
  params.set("shopFamily", "0");
  params.set("shopTab", "config");
  for (const key of ["record", "shopConfig", "shopPage", "shopDialogue"]) params.delete(key);
  return true;
}

function normalizeBattlePageRoute(params) {
  const formation = params.get('resource') || params.get('record') || '';
  if (params.get('view') === 'battle-test' && /^encounter-formation:[0-9A-F]{2}$/iu.test(formation)) {
    params.set('view', 'monster-formations');
    params.set('resource', formation);
    params.delete('record');
    return true;
  }
  if (params.get("view") !== "interfaceui" || params.get("interface") !== "battle-scene") return false;
  params.set("view", "battle-test");
  for (const key of ["interface", "interfaceScreen"]) params.delete(key);
  return true;
}

// 页面只组织实体切面；实例在所属工作台中切换。
const interfacePage = (id, label = null) => ({id, label: label || id, route: {view: 'interfaceui', interfacePage: id}});
const shopPage = id => SHOP_PAGES.find(page => page.id === id);
const servicePage = id => {
  const page = SERVICE_FAMILY_PAGES.find(page => page.id === id);
  return {...page, route: {...page.route,
    ...(page.route.interface ? {interfacePage: page.route.interface} : {})}};
};
const storyPage = view => {
  const definition = STORY_PAGE_DEFINITIONS.find(page => page.view === view);
  return {id: view, label: definition.navigationLabel, route: {view}};
};
const sceneFlowPage = (id, label, filter) => ({id, label, filter,
  route: {view: 'scenes', interactionFlow: id}});

const SCENE_INTERACTION_FLOW_PAGES = Object.freeze([
  sceneFlowPage('machine-state-investigation', '机器状态调查', {kind: 'investigation-tile', behaviorCode: 0x6C}),
  sceneFlowPage('facility-investigation', '计算机与设施调查', {kind: 'investigation-tile', behaviorCode: 0x70}),
  sceneFlowPage('hidden-entrance-investigation', '隐藏入口调查', {kind: 'investigation-special', sceneId: 0, objectId: 0}),
  sceneFlowPage('wardrobe-investigation', '衣柜调查', {kind: 'investigation-special', sceneId: 3, objectId: 4}),
  sceneFlowPage('mother-photo-investigation', '母亲照片', {kind: 'investigation-special', sceneId: 3, objectId: 5}),
  sceneFlowPage('healing-well-investigation', '恢复井', {kind: 'investigation-special', sceneId: 0x5F, objectId: 3}),
  sceneFlowPage('gravestone-investigation', '墓碑调查', {kind: 'investigation-special', sceneId: 0x73, objectId: 1}),
  sceneFlowPage('hidden-revival-investigation', '隐藏再生丸', {kind: 'investigation-special', sceneId: 0x76, objectId: 2}),
  sceneFlowPage('locked-door-investigation', '上锁的门', {kind: 'investigation-tile', behaviorCode: 0x68}),
  sceneFlowPage('scene-investigation', '场景调查', {kind: 'investigation-tile', behaviorCode: 0x7C}),
  sceneFlowPage('map-tile-action', '地图格动作', {kind: 'investigation-tile', behaviorCode: 0x54}),
  sceneFlowPage('treasure-acquisition', '宝箱取得', {kind: 'treasure', buriedVehicle: false}),
  sceneFlowPage('vehicle-excavation', '战车挖掘', {kind: 'treasure', buriedVehicle: true}),
]);

function sceneInteractionFlowPage(id) {
  return SCENE_INTERACTION_FLOW_PAGES.find(page => page.id === id) || null;
}

function sceneInteractionFlowMatches(page, object) {
  const filter = page?.filter;
  const record = object.record;
  return Boolean(filter && object.kind === filter.kind
    && (filter.behaviorCode === undefined || Number(record.behavior_code) === filter.behaviorCode)
    && (filter.sceneId === undefined || Number(object.sceneId) === filter.sceneId)
    && (filter.objectId === undefined || Number(record.id) === filter.objectId)
    && (filter.buriedVehicle === undefined || (record.content_kind === 'buried-vehicle') === filter.buriedVehicle));
}

const EDITOR_PAGE_GROUPS = Object.freeze([
  {label: '项目', children: [{id: 'home', label: '项目概览', route: {view: 'home'}}]},
  {label: '存档', children: [
    {id: 'save', label: '存档', route: {view: 'save'}},
    interfacePage('startup-load', '读档画面'),
    {...interfacePage('save-management', '存档管理与记忆中心'), variants: [interfacePage('save-management', '存档管理'), interfacePage('save-service', '记忆中心服务')], aliases: [{view: 'interfaceui', interfacePage: 'save-service'}]},
    interfacePage('name-entry', '姓名输入与战车命名'),
  ]},
  {label: '人物', children: [{id: 'characters', label: '人物', route: {view: 'characters'}}]},
  {label: '战车', children: [{id: 'vehicles', label: '战车', route: {view: 'vehicles'}}]},
  {label: '物品与装备', children: [
    {id: 'equipment-human', label: '人类装备', route: {view: 'equipment', equipmentDomain: 'human'}},
    {id: 'equipment-tank', label: '战车装备', route: {view: 'equipment', equipmentDomain: 'tank'}},
    {id: 'items', label: '道具', route: {view: 'items'}},
    {id: 'shells', label: '炮弹', route: {view: 'shells'}},
    ...ITEM_EFFECT_PAGE_DEFINITIONS.map(({id, label}) => interfacePage(id, label)),
  ]},
  {label: '地图与场景', children: [
    {id: 'scenes', label: '地图与场景', route: {view: 'scenes'}},
    {id: 'metatiles', label: '元图块', route: {view: 'metatiles'}},
  ]},
  {label: '怪物数据', children: [
    {id: 'monsters', label: '怪物', route: {view: 'monsters'}},
    {id: 'monster-formations', label: '怪物编队', route: {view: 'monster-formations'}},
    {id: 'wanted', label: '通缉令目标配置', route: {view: 'wanted'}},
  ]},
  {label: '对话', children: [
    interfacePage('field-dialogue', '普通对话'),
    {...storyPage('interaction-dialogue'), aliases: STORY_PAGE_DEFINITIONS
      .find(page => page.view === 'interaction-dialogue').sourceViews.map(view => ({view}))},
  ]},
  {label: '商店交易', children: [
    {...shopPage('shops'), label: '装备与道具商店', variants: ['shops', 'shop-1', 'shop-2', 'shop-3'].map(shopPage), aliases: [1, 2, 3].map(shopFamily => ({view: 'shops', shopFamily}))},
    ...['shop-5', 'shop-9', 'shop-14'].map(shopPage),
    {id: 'item-buyer', label: '人类物品收购', route: SHOP_ITEM_BUYER_ROUTE,
      aliases: [{view: 'shops', shopFamily: 2, shopTab: 'buyer'}]},
    servicePage('vehicle-trade-service'),
  ]},
  {label: '战车服务', children: [
    shopPage('shop-4'),
    ...['rental-return-service', 'vehicle-supply-service', 'chassis-modification-service',
      'chassis-advice-service', 'engine-modification-service', 'vehicle-repair-service',
      'laser-cannon-lens-service', 'vehicle-wash-service'].map(servicePage),
  ]},
  {label: '人物与生活服务', children: [
    ...['shop-6', 'shop-7', 'shop-8'].map(shopPage),
    ...['family-home-service', 'minchi-revival-service', 'school-donation-service',
      'storage-service', 'paralysis-massage-service', 'wanted-office-service'].map(servicePage),
  ]},
  {label: '设施调查', children: [
    ...['facility-service:26', 'facility-service:27', 'facility-service:28'].map(servicePage),
    {...servicePage('facility-service:29'), label: '双配置售货设施', variants: [servicePage('facility-service:29'), servicePage('configured-investigation-service')], aliases: [{view: 'interfaceui', interfacePage: 'configured-investigation-service'}]},
    shopPage('shop-15'), servicePage('facility-service:45'), servicePage('facility-service:50'),
    {id: 'frog-race-alternate', label: '青蛙赛跑备用流程', route: {view: 'interfaceui', interfacePage: 'interaction-service', resource: 'application-command:33', record: '0'}},
    servicePage('experience-information-terminal'),
    {id: 'computercontroller', label: '计算机控制器', route: {view: 'computercontroller', facility: 'ui', previewCommand: 0x36},
      variants: [servicePage('facility-service:54'), servicePage('facility-service:56'), servicePage('secondary-computer-controller')],
      aliases: [{view: 'computercontroller'}, {view: 'interfaceui', interfacePage: 'secondary-computer-controller'}]},
    servicePage('noah-control-terminal'),
  ]},
  {label: '调查', children: [
    interfacePage('field-investigation', '调查判定'),
    ...SCENE_INTERACTION_FLOW_PAGES.filter(page => !['scene-investigation', 'map-tile-action', 'treasure-acquisition', 'vehicle-excavation'].includes(page.id)),
    {id: 'wanted-ui', label: '通缉海报', route: {view: 'wanted-ui'}},
    ...['scene-investigation', 'map-tile-action'].map(sceneInteractionFlowPage),
  ]},
  {label: '宝箱', children: ['treasure-acquisition', 'vehicle-excavation'].map(sceneInteractionFlowPage)},
  {label: '主菜单', children: [
    interfacePage('non-battle-main-menu', '非战斗主菜单'), interfacePage('field-board-exit', '乘降'),
    interfacePage('party-strength', '强度'), interfacePage('human-items', '工具'),
    interfacePage('human-equipment', '装备'), interfacePage('vehicle-equipment-shells', '战车装备与炮弹'),
    interfacePage('field-mode', '模式'),
  ]},
  {label: '战斗', children: [
    {id: 'battle-test', label: '战斗模拟器', route: {view: 'battle-test'}},
    {id: 'attack-effects', label: '攻击特效', route: {view: 'attack-effects'}},
    interfacePage('battle-command-target', '战斗命令与目标选择'), interfacePage('battle-party-status', '战斗队伍状态'),
    interfacePage('battle-items-equipment', '战斗道具、装备与炮弹'), interfacePage('battle-messages', '战斗文本与效果提示'),
    interfacePage('battle-results', '战斗结果'),
  ]},
  {label: '启动与结局', children: [
    {id: 'boot-logo', label: '启动 Logo', route: {view: 'cutscene-boot-logo'}},
    {id: 'title', label: '标题画面', route: {view: 'cutscene-title'}}, storyPage('ending'),
  ]},
  {label: '场景剧情', children: STORY_PAGE_DEFINITIONS
    .filter(page => page.navigation !== false && !['interaction-dialogue', 'ending'].includes(page.view))
    .map(page => ({...storyPage(page.view), ...(page.sourceViews ? {aliases: page.sourceViews.map(view => ({view}))} : {})}))},
  {label: '扩展流程', children: [
    {id: 'generic-shop', label: '状态机与扩展流程', route: {view: 'generic-shop'},
      variants: [{id: 'state-document', label: '状态机文档', route: {view: 'generic-shop'}},
        interfacePage('interaction-service', '服务与扩展入口')],
      aliases: [{view: 'interfaceui', interfacePage: 'interaction-service'}]},
  ]},
  {label: '图像、文字与声音', children: [
    interfacePage('common-elements', '公共界面元素'),
    {id: 'actors', label: '角色图像', route: {view: 'actors'}},
    {id: 'battleactors', label: '战斗角色', route: {view: 'battleactors'}},
    {id: 'text', label: '文本与字库', route: {view: 'text'}}, {id: 'audio', label: '音乐与音效', route: {view: 'audio'}},
  ]},
  {label: '项目工具', children: [
    {id: 'log', label: '日志', route: {view: 'log'}}, {id: 'build', label: '项目与构建', route: {view: 'build'}},
    {id: 'emulator', label: '游戏模拟器', route: {view: 'emulator'}},
    {id: 'prg', label: 'PRG 字节地图', route: {view: 'bytemap-prg'}},
    {id: 'chr', label: 'CHR 字节地图', route: {view: 'bytemap-chr'}},
    {id: 'sram', label: 'SRAM 字节地图', route: {view: 'bytemap-sram'}},
  ]},
]);

const EDITOR_PAGES = EDITOR_PAGE_GROUPS.flatMap(group => group.children);
for (const page of EDITOR_PAGES) {
  const definition = STORY_PAGE_DEFINITIONS.find(row => row.view === page.route.view);
  if (definition) Object.defineProperty(page, 'label', {enumerable: true,
    get: () => definition.navigationLabel});
}

function storyNavigationInfo(view, published = []) {
  return published.find(page => page.view === view) || null;
}

function editorPageRoute(current) {
  if (current.view === 'computercontroller' && Number(current.previewCommand) === 0x37)
    return {...current, view: 'interfaceui', interface: 'noah-control-terminal', interfacePage: 'noah-control-terminal'};
  if (current.view === 'interfaceui' && current.interfacePage === 'interaction-service') {
    const command = /^application-command:([0-9A-F]{2})$/u.exec(current.resource || '');
    const id = command && Number.parseInt(command[1], 16);
    const route = id === 0x31 ? {view: 'interfaceui', interface: 'name-entry'} : serviceFamilyPage(id)?.route;
    if (route) return {...current, ...route, interfacePage: route.interface || null};
  }
  return current;
}

function editorPageForRoute(current) {
  current = editorPageRoute(current);
  return EDITOR_PAGES.flatMap(page => [page.route, ...(page.aliases || [])]
    .filter(route => Object.entries(route).every(([key, value]) => ['facility', 'record'].includes(key)
      || String(current[key]) === String(value)))
    .map(route => ({page, specificity: Object.keys(route).length})))
    .sort((a, b) => b.specificity - a.specificity)[0]?.page || null;
}

function editorPageGroups(published = []) {
  return EDITOR_PAGE_GROUPS.map(group => ({...group, children: group.children.map(page => {
    const info = storyNavigationInfo(page.route.view, published);
    return {...page, title: info ? [info.trigger,
      ...(info.eventFlagWrites.length ? [`写入 ${info.eventFlagWrites.join('、')}`] : []),
      ...[...new Set((info.eventFlagReadEvidence || []).map(read => read.method))].map(method =>
        `${method} ${[...new Set(info.eventFlagReadEvidence.filter(read => read.method === method)
          .map(read => read.flag))].join('、')}`)].join(' · ') : page.label};
  })}));
}

// @editor-module 字段来源派生物的文件名不含 URL 转义与路径特殊字符。
function fieldSourceFileName(resourceId) {
  return `${encodeURIComponent(resourceId)
    .replace(/[!'()*~]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)
    .replaceAll('%', '~')}.json`;
}

// @editor-module 页面刷新由入口注入渲染器，调用方不依赖入口模块。
let renderer;

function configureEditorRenderer(callback) {
  renderer = callback;
}

function render() {
  if (!renderer) throw new TypeError('编辑器渲染器尚未注册');
  return renderer();
}

export { EDITOR_PAGES, INTERFACE_PAGE_DEFINITIONS, SERVICE_FAMILY_PAGES, SHOP_ITEM_BUYER_ROUTE, SHOP_PAGES, configureEditorRenderer, dedicatedUiPageForScreen, editorPageForRoute, editorPageGroups, editorPageRoute, fieldSourceFileName, interfacePageDefinition, itemEffectPagesForItem, itemPageRoute, normalizeBattlePageRoute, normalizeInterfacePageId, normalizeShopPageRoute, render, sceneInteractionFlowMatches, sceneInteractionFlowPage, serviceFamilyPage, storyNavigationInfo };
