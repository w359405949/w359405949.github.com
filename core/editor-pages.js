// @editor-module 编辑页面分组与页面内的同级对象。
import {STORY_PAGE_DEFINITIONS} from "./story-view-config.js";
import {ITEM_EFFECT_PAGE_DEFINITIONS, SERVICE_FAMILY_PAGES} from "./ui-page-registry.js";
import {FIELD_MENU_NAVIGATION} from "./field-menu-tree.js";

export const STORY_PAGE_GROUP_IDS = Object.freeze({animation: "animation", events: "event-story"});
export const SHOP_ITEM_BUYER_ROUTE = Object.freeze({view: "shops", shopFamily: 3, shopTab: "buyer"});

export function itemPageRoute(item) {
  const category = item?.category?.id;
  const view = category ? ['human-item', 'tank-item'].includes(category) ? 'items' : 'equipment'
    : Number(item?.id) >= 0x01 && Number(item?.id) <= 0x98 ? 'equipment' : 'items';
  return {view, record: String(item.id), ...(view === 'equipment'
    ? {equipmentDomain: category?.startsWith('tank-') ? 'tank' : 'human'} : {})};
}

// 商店与服务按配置族各占一页；页面模块清单按这张表逐页展开（page-modules.js）。
export const SHOP_PAGES = Object.freeze([
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

export function normalizeShopPageRoute(params) {
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

export function normalizeBattlePageRoute(params) {
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

// 界面页按触发来源分组。
const MAIN_MENU_PAGES = Object.freeze([
  {id: 'common-elements', label: '公共界面元素', route: {view: 'interfaceui', interfacePage: 'common-elements'}},
  {"id":"non-battle-main-menu","label":"非战斗主菜单","route":{"view":"interfaceui","interfacePage":"non-battle-main-menu"}},
  {"id":"field-dialogue","label":"对话","route":{"view":"interfaceui","interfacePage":"field-dialogue"}},
  {"id":"field-board-exit","label":"乘降","route":{"view":"interfaceui","interfacePage":"field-board-exit"}},
  {"id":"party-strength","label":"强度","route":{"view":"interfaceui","interfacePage":"party-strength"}},
  {"id":"human-items","label":"工具","route":{"view":"interfaceui","interfacePage":"human-items"}},
  {"id":"human-equipment","label":"装备","route":{"view":"interfaceui","interfacePage":"human-equipment"}},
  {"id":"vehicle-equipment-shells","label":"炮弹","route":{"view":"interfaceui","interfacePage":"vehicle-equipment-shells"}},
  {"id":"field-investigation","label":"调查","route":{"view":"interfaceui","interfacePage":"field-investigation"}},
  {"id":"field-mode","label":"模式","route":{"view":"interfaceui","interfacePage":"field-mode"}},
]);

const SAVE_INTERFACE_PAGES = Object.freeze([
  {"id":"startup-load","label":"读档画面","route":{"view":"interfaceui","interfacePage":"startup-load"}},
  {"id":"save-management","label":"存档管理与记忆中心","route":{"view":"interfaceui","interfacePage":"save-management"}},
  {"id":"name-entry","label":"姓名输入与战车命名","route":{"view":"interfaceui","interfacePage":"name-entry"}},
]);

const BATTLE_INTERFACE_PAGES = Object.freeze([
  {"id":"battle-test","label":"战斗场景与测试","route":{"view":"battle-test"}},
  {"id":"attack-effects","label":"攻击特效","route":{"view":"attack-effects"}},
  {"id":"gomez-red-wolf-battle","label":"戈麦斯红狼战斗","route":{"view":"gomez-red-wolf-battle"}},
  {"id":"battle-command-target","label":"战斗命令与目标选择","route":{"view":"interfaceui","interfacePage":"battle-command-target"}},
  {"id":"battle-party-status","label":"战斗队伍状态","route":{"view":"interfaceui","interfacePage":"battle-party-status"}},
  {"id":"battle-items-equipment","label":"战斗道具、装备与炮弹","route":{"view":"interfaceui","interfacePage":"battle-items-equipment"}},
  {"id":"battle-messages","label":"战斗文本与效果提示","route":{"view":"interfaceui","interfacePage":"battle-messages"}},
  {"id":"battle-results","label":"战斗结果","route":{"view":"interfaceui","interfacePage":"battle-results"}},
]);

function storyPages() {
  return STORY_PAGE_DEFINITIONS.filter(definition => definition.navigation !== false).map(definition => ({
    id: definition.view,
    label: definition.navigationLabel,
    route: {view: definition.view},
  }));
}

const EDITOR_PAGE_GROUPS = Object.freeze([
  {label: "项目", children: [
    {"id":"home","label":"项目概览","route":{"view":"home"}},
  ]},
  {label: "存档", children: [
    {"id":"save","label":"存档","route":{"view":"save"}},
    ...SAVE_INTERFACE_PAGES,
  ]},
  {label: "人物", children: [
    {"id":"characters","label":"人物","route":{"view":"characters"}},
  ]},
  {label: "战车", children: [
    {"id":"vehicles","label":"战车","route":{"view":"vehicles"}},
  ]},
  {label: "物品与装备", children: [
    {"id":"equipment-human","label":"人类装备","route":{"view":"equipment","equipmentDomain":"human"}},
    {"id":"equipment-tank","label":"战车装备","route":{"view":"equipment","equipmentDomain":"tank"}},
    {"id":"items","label":"道具","route":{"view":"items"}},
    {"id":"shells","label":"炮弹","route":{"view":"shells"}},
    ...ITEM_EFFECT_PAGE_DEFINITIONS.map(({id, label}) => ({id, label,
      route: {view: "interfaceui", interfacePage: id}})),
  ]},
  {label: "场景与交互", children: [
    {"id":"scenes","label":"地图与场景","route":{"view":"scenes"}},
    {"id":"interaction-services","label":"服务交互","route":{"view":"interfaceui","interfacePage":"interaction-service"}},
    {"id":"metatiles","label":"元图块","route":{"view":"metatiles"}},
  ]},
  {label: "怪物数据", children: [
    {"id":"monsters","label":"怪物","route":{"view":"monsters"}},
    {id: 'monster-formations', label: '怪物编队', route: {view: 'monster-formations'}},
    {"id":"wanted","label":"通缉令目标配置","route":{"view":"wanted"}},
  ]},
  {label: "商店与设施", children: [
    {id: 'generic-shop', label: '状态机', route: {view: 'generic-shop'}},
    ...SHOP_PAGES,
    ...SERVICE_FAMILY_PAGES.filter(page => page.route.view !== 'shops').map(page => ({
      id: page.id, label: page.label, route: {...page.route,
        ...(page.route.interface ? {interfacePage: page.route.interface} : {})},
    })),
    {id: 'item-buyer', label: '人类物品收购', route: SHOP_ITEM_BUYER_ROUTE},
    {"id":"wanted-ui","label":"通缉令界面","route":{"view":"wanted-ui"}},
  ]},
  {label: "主菜单", children: [...MAIN_MENU_PAGES]},
  {label: "战斗画面", children: [...BATTLE_INTERFACE_PAGES]},
  {id: STORY_PAGE_GROUP_IDS.animation, label: "动画", children: [
    {"id":"boot-logo","label":"启动 Logo","route":{"view":"cutscene-boot-logo"}},
    {"id":"title","label":"标题画面","route":{"view":"cutscene-title"}},
    ...storyPages(),
  ]},
  {id: STORY_PAGE_GROUP_IDS.events, label: "事件剧情", children: []},
  {label: "图像、文字与声音", children: [
    {"id":"actors","label":"角色图像","route":{"view":"actors"}},
    {"id":"battleactors","label":"战斗角色","route":{"view":"battleactors"}},
    {"id":"text","label":"文本与字库","route":{"view":"text"}},
    {"id":"audio","label":"音乐与音效","route":{"view":"audio"}},
  ]},
  {label: "项目工具", children: [
    {id: "log", label: "日志", route: {view: "log"}},
    {"id":"build","label":"项目与构建","route":{"view":"build"}},
    {"id":"emulator","label":"游戏模拟器","route":{"view":"emulator"}},
    {"id":"prg","label":"PRG 字节地图","route":{"view":"bytemap-prg"}},
    {"id":"chr","label":"CHR 字节地图","route":{"view":"bytemap-chr"}},
    {"id":"sram","label":"SRAM 字节地图","route":{"view":"bytemap-sram"}},
  ]},
]);

export const EDITOR_PAGES = EDITOR_PAGE_GROUPS.flatMap(group => group.children);

export function storyNavigationInfo(view, published = []) {
  return published.find(page => page.view === view) || null;
}

export function editorPageGroups(published = []) {
  const stories = EDITOR_PAGE_GROUPS.find(group => group.id === STORY_PAGE_GROUP_IDS.animation).children;
  const withInfo = page => {
    const info = storyNavigationInfo(page.route.view, published);
    return {...page, title: info ? [info.trigger,
      ...(info.eventFlagWrites.length ? [`写入 ${info.eventFlagWrites.join("、")}`] : []),
      ...[...new Set((info.eventFlagReadEvidence || []).map(read => read.method))].map(method =>
        `${method} ${[...new Set(info.eventFlagReadEvidence.filter(read => read.method === method)
          .map(read => read.flag))].join("、")}`)].join(" · ") : ""};
  };
  return EDITOR_PAGE_GROUPS.map(group => {
    if (group.label === "主菜单") return {...group, children: [
      ...group.children,
      ...FIELD_MENU_NAVIGATION.map(entry => ({id: `field-menu:${entry.flowId}`, label: entry.label,
        route: {view: "interfaceui", interfacePage: entry.pageId, interfaceScreen: entry.screenId,
          ...(entry.entryId ? {interfaceEntry: entry.entryId} : {})}})),
    ]};
    if (!Object.values(STORY_PAGE_GROUP_IDS).includes(group.id)) return group;
    const event = group.id === STORY_PAGE_GROUP_IDS.events;
    return {...group, children: stories.filter(page =>
      Boolean(storyNavigationInfo(page.route.view, published)?.eventFlagWrites.length
        || storyNavigationInfo(page.route.view, published)?.eventFlagReads?.length) === event).map(withInfo)};
  });
}
