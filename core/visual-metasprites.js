// @editor-module 读取和修改队伍角色的战斗 metasprite 选择。
//
// 战斗属性页只按队伍角色选择“战斗立绘”。角色值到 generic metasprite 的
// 5 字节 ROM 表、记录顺序与值域由这个基础资产模块拥有；消费页不接触表偏移。

export const VISUAL_METASPRITES_RESOURCE_ID = "metasprite-record";
export const BATTLE_ACTOR_SELECTOR_COMPONENT_ID =
  "metasprite-record.battle-actor-selectors";
const BATTLE_ACTOR_SELECTOR_COUNT = 5;
const PARTY_BATTLE_ACTOR_COUNT = 3;
const GENERIC_METASPRITE_COUNT = 55;

function integer(value, label, minimum, maximum) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < minimum || result > maximum) {
    throw new TypeError(`${label} 超出 ${minimum}..${maximum}：${value}`);
  }
  return result;
}

function battleActorSelectors(document_) {
  const values = document_?.battle_actor_metasprite_selectors;
  if (!Array.isArray(values) || values.length !== BATTLE_ACTOR_SELECTOR_COUNT) {
    throw new TypeError(
      `metasprite-record 缺少 ${BATTLE_ACTOR_SELECTOR_COUNT} 条战斗角色形象映射`,
    );
  }
  const byId = new Map();
  for (const record of values) {
    const id = integer(
      record?.id,
      "战斗角色形象映射 ID",
      0,
      BATTLE_ACTOR_SELECTOR_COUNT - 1,
    );
    if (byId.has(id)) throw new TypeError(`战斗角色形象映射 ID ${id} 重复`);
    integer(
      record.metasprite_id,
      `战斗角色形象映射 ${id}`,
      0,
      GENERIC_METASPRITE_COUNT - 1,
    );
    byId.set(id, record);
  }
  return Array.from(
    {length: BATTLE_ACTOR_SELECTOR_COUNT},
    (_, id) => byId.get(id),
  );
}

/** 三名主角的队伍槽与这张表的前三项一一对应。 */
export function partyBattleMetaspriteId(document_, partyRoleId) {
  const role = integer(
    partyRoleId,
    "队伍角色",
    0,
    PARTY_BATTLE_ACTOR_COUNT - 1,
  );
  return Number(battleActorSelectors(document_)[role].metasprite_id);
}

/** 存活角色值从一开始索引选择表；死亡分支使用表末项。 */
export function battleRoleSelector(document_, roleValue) {
  const role = integer(roleValue, '战斗角色值', 1, BATTLE_ACTOR_SELECTOR_COUNT);
  return battleActorSelectors(document_)[role - 1];
}

/** 在 metasprite-record 正文里改写一个角色；调用方仍须走项目仓库保存。 */
