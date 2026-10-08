// @editor-module 统一角色类型与队伍槽位的共享语义引用。
//
// 角色类型到帧/OAM 的解释归 render/actor-atlas.js；这里保存不涉及像素的稳定
// 引用关系，避免剧情工作台与 VM 各自理解一遍主角团队槽位表。

export const VISUAL_ACTORS_RESOURCE_ID = "actor-visual";
export const PARTY_ALIVE_ACTOR_TYPES_COMPONENT_ID =
  "actor-visual.party-alive-types";
export const PARTY_MEMBER_COUNT = 3;
export const ACTOR_TYPE_COUNT = 0x3f;


/** 读取一名队员当前有效的存活形象类型；未装载或文档无效时返回 null。 */
export function partyAliveActorType(document_, partySlot) {
  const slot = Number(partySlot);
  if (!Number.isInteger(slot) || slot < 0 || slot >= PARTY_MEMBER_COUNT
      || !Array.isArray(document_?.party_alive_actor_types)) return null;
  const record = document_.party_alive_actor_types.find(
    item => Number(item?.id) === slot,
  );
  const actorType = Number(record?.actor_type);
  return Number.isInteger(actorType) && actorType >= 0 && actorType < ACTOR_TYPE_COUNT
    ? actorType : null;
}

/** 在 actor-visual 正文里改写一个槽位；调用方仍须走项目仓库的版本化保存。 */
