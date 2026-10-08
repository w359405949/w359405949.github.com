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

export const SERVICE_FAMILY_PAGES = Object.freeze([
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

export function serviceFamilyPage(commandId) {
  return SERVICE_FAMILY_PAGES.find(page => page.commandId === Number(commandId)) || null;
}

export const ITEM_EFFECT_PAGE_DEFINITIONS = Object.freeze([
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

export function itemEffectPagesForItem(item) {
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

export const INTERFACE_PAGE_DEFINITIONS = Object.freeze([
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

export function interfacePageDefinition(id) {
  const definition = INTERFACE_PAGE_BY_ID.get(String(id || ""));
  const service = SERVICE_FAMILY_PAGES.find(page => page.id === definition?.id);
  return definition ? {...definition, ...service} : null;
}

export function normalizeInterfacePageId(id) {
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

export function dedicatedUiPageForScreen(screen) {
  if (!screen) return null;
  const byScreen = DESTINATION_BY_SCREEN.get(String(screen.id || ""));
  if (byScreen) return byScreen;
  const stateId = screen.interface_state_id ?? screen.metadata?.interface_state_id;
  const byState = DESTINATION_BY_STATE.get(String(stateId || ""));
  if (byState) return byState;
  const interfaceId = screen.interface_id ?? screen.metadata?.interface_id;
  return DESTINATION_BY_INTERFACE.get(String(interfaceId || "")) || null;
}
