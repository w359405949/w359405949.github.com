// @editor-module 集中定义视图分页顺序、默认页及 URL 参数解析。
//
// 「商店的默认分页是界面页」这一个事实，之前写在四个地方共十一处：初始状态、
// 路由恢复、地址栏写入、视图内兜底。改一次默认值要同步改十一处，漏掉任何一处
// 都会表现成「顺序换了但默认没换」。
//
// 这里只登记两件事：分页有哪些、默认是哪个。其余四层全部从这里读。

/** 每个分页组：id 顺序即显示顺序，第一个是默认页。 */
const TAB_GROUPS = {
  // 角色与战车都区分 ROM 新游戏模板和本地电池存档。
  character: {
    stateKey: "characterTab",
    param: "characterTab",
    ids: ["initial", "save"],
  },
  vehicle: {
    stateKey: "vehicleTab",
    param: "vehicleTab",
    ids: ["initial", "rental", "save"],
  },
  // 商店与服务。`catalog` 只在拥有私有商品目录的族出现，由视图按需追加。
  shop: {
    stateKey: "shopTab",
    param: "shopTab",
    ids: ["ui", "flow", "config", "catalog", "buyer"],
  },
  // 设施机器（点唱机 / 售货机 / 青蛙机 / 传送终端 / 计算机控制器）。
  facility: {
    stateKey: "facilityTab",
    param: "facilityTab",
    ids: ["ui", "config"],
  },
  wanted: {
    stateKey: "wantedTab",
    param: "wantedTab",
    ids: ["ui", "data"],
  },
  battleTestEnemy: {
    stateKey: "battleTestEnemyTab",
    param: "battleTestEnemyTab",
    ids: ["entry", "instances"],
  },
  battleTestParty: {
    stateKey: "battleTestPartyTab",
    param: "battleTestPartyTab",
    ids: ["party", "actions"],
  },
};

/** 默认分页 = 列表里的第一个。顺序和默认由同一处决定，不会再各说各的。 */
export function defaultTab(group) {
  return TAB_GROUPS[group].ids[0];
}

/** 从 URL 参数解析分页；不认识的值一律回落到默认页。 */
export function tabFromParams(group, params) {
  const {param, ids} = TAB_GROUPS[group];
  const value = params.get(param) ?? (group === 'facility' ? params.get('facility') : null);
  return ids.includes(value) ? value : defaultTab(group);
}

/**
 * 写地址栏：等于默认值就不写。否则每个链接都会挂一串与默认值相同的查询参数，
 * 分享出去的链接也看不出到底哪一项是被特意选中的。
 */
export function writeTabParam(group, url, value) {
  const {param} = TAB_GROUPS[group];
  if (value && value !== defaultTab(group)) url.searchParams.set(param, value);
  else url.searchParams.delete(param);
}

/** 视图内兜底：当前分页不在本页实际提供的分页列表里时回落。 */
export function resolveTab(group, available, current) {
  return available.includes(current) ? current : defaultTab(group);
}
