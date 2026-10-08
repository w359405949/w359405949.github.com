// @editor-module 队伍场景角色的存活/死亡形象类型映射：6 个已发布 actor-type 句柄引用。
// 物理位置与写入许可都未发布，字段保留编辑、构建保留 Original（约束第 10 条）。
import {canonicalJsonEqual} from "./project-store-values.js";
import {ROM_WRITE_PENDING, validateFieldOverrides} from "./field-codec.js";

export const PARTY_ACTOR_TYPE_MAP_OWNER = "party-field-actor-type-map";
const PARTY_ACTOR_TYPE_MAP_COMPILER_ID = "party-field-actor-type-map/v1";
const PARTY_ACTOR_TYPE_MAP_ASSET_SCHEMA =
  "metalmaxcn.field-ui-module.asset.party-field-actor-type-map";
const PARTY_ACTOR_TYPE_MAP_MEMBERS = 3;
/** 两份已发布数组就是两条记录：存活与死亡各按队员序号。 */
const PARTY_ACTOR_TYPE_MAP_RECORDS = Object.freeze([
  Object.freeze({kind: "living", key: "living_actor_types", label: "存活形象"}),
  Object.freeze({kind: "dead", key: "dead_actor_types", label: "死亡形象"}),
]);
/** 候选取已发布的角色类型记录，不按序号造值。 */
const CANDIDATE_SOURCE = Object.freeze({
  resourceId: "actor-visual",
  documentPath: Object.freeze(["actor_types"]),
  value: Object.freeze(["resource_id"]),
  label: Object.freeze(["resource_id", "motion_id"]),
});
const ACTOR_TYPE_HANDLE = /^actor-type:([0-9A-F]{2})$/u;
const ACTOR_TYPE_MAX = 0x3f;

const require = (condition, message) => {if (!condition) throw new TypeError(message);};

function actorTypeHandle(value, label) {
  const match = ACTOR_TYPE_HANDLE.exec(String(value ?? ""));
  require(match && Number.parseInt(match[1], 16) <= ACTOR_TYPE_MAX,
    `${label} 必须是已发布的 actor-type 句柄`);
  return value;
}

function readValues(document, record) {
  const values = document?.[record.key];
  require(Array.isArray(values) && values.length === PARTY_ACTOR_TYPE_MAP_MEMBERS,
    `${PARTY_ACTOR_TYPE_MAP_OWNER} 缺少 ${PARTY_ACTOR_TYPE_MAP_MEMBERS} 条${record.label}形象类型`);
  return values;
}

function partyActorTypeMapFieldDescriptions(document) {
  return PARTY_ACTOR_TYPE_MAP_RECORDS.flatMap(record =>
    readValues(document, record).map((value, index) => ({
      resourceId: PARTY_ACTOR_TYPE_MAP_OWNER,
      entityHandle: `${PARTY_ACTOR_TYPE_MAP_OWNER}:${record.key}:${index}`,
      fieldName: "actor_type",
      documentPath: [record.key, index],
      defaultValue: actorTypeHandle(value, `${record.label} ${index + 1}`),
      writeback: ROM_WRITE_PENDING,
    })));
}

function partyActorTypeMapObjects(document) {
  const descriptions = partyActorTypeMapFieldDescriptions(document);
  return [{
    id: PARTY_ACTOR_TYPE_MAP_OWNER,
    label: "队伍形象类型映射",
    fragmentIds: [],
    fields: descriptions.map(field => [field.entityHandle, field.fieldName]),
    editor: {
      kind: "reference-table",
      rows: descriptions.map(field => field.entityHandle),
      rowLabels: descriptions.map((_, index) => {
        const record = PARTY_ACTOR_TYPE_MAP_RECORDS[Math.floor(index / PARTY_ACTOR_TYPE_MAP_MEMBERS)];
        return `${record.label} ${index % PARTY_ACTOR_TYPE_MAP_MEMBERS + 1}`;
      }),
      columns: [{name: "actor_type", label: "角色类型", candidates: CANDIDATE_SOURCE}],
    },
  }];
}

function validatePartyActorTypeMapAsset(asset, original) {
  require(asset?.resource_id === PARTY_ACTOR_TYPE_MAP_OWNER
    && original?.resource_id === PARTY_ACTOR_TYPE_MAP_OWNER
    && asset.schema === PARTY_ACTOR_TYPE_MAP_ASSET_SCHEMA
    && asset.schema === original.schema,
  `${PARTY_ACTOR_TYPE_MAP_OWNER} 资源身份或 schema 已改变`);
  const expected = structuredClone(original);
  for (const record of PARTY_ACTOR_TYPE_MAP_RECORDS) {
    readValues(expected.document, record).forEach((value, index) => {
      expected.document[record.key][index] =
        actorTypeHandle(asset.document?.[record.key]?.[index], `${record.label} ${index + 1}`);
    });
  }
  require(canonicalJsonEqual(asset, expected),
    `${PARTY_ACTOR_TYPE_MAP_OWNER} 只允许修改这 6 个形象类型引用，身份与证据不可修改`);
}

function validatePartyActorTypeMapFieldOverrides(original, overrides) {
  validateFieldOverrides(original, overrides, partyActorTypeMapFieldDescriptions,
    validatePartyActorTypeMapAsset);
}

export function partyActorTypeMapFieldOwner() {
  return Object.freeze({
    compilerId: PARTY_ACTOR_TYPE_MAP_COMPILER_ID,
    describe: partyActorTypeMapFieldDescriptions,
    validate: validatePartyActorTypeMapFieldOverrides,
    // 控件候选与写入校验共用同一份已发布来源：非法引用在落 Working 之前被拒。
    referenceCandidates: field => (field?.fieldName === "actor_type" ? CANDIDATE_SOURCE : null),
    // 物理位置未发布：没有片段可编码，构建只保留 Original。
    encode: () => [],
    objects: partyActorTypeMapObjects,
    documentView: true,
    legacyClosed: true,
  });
}
