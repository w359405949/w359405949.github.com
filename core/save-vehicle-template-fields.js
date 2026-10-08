// @editor-module 新游戏战车模板的字段对象；模板字节由 save-vehicle 持有。
import {ROM_WRITE_PENDING, validateFieldOverrides} from "./field-codec.js";
import {canonicalJsonEqual} from "./project-store-values.js";
import {mountFieldObjectControls} from "./field-object.js";

const RESOURCE_ID = "save-vehicle";
const require = (valid, message) => {if (!valid) throw new TypeError(message);};
const groups = [
  {block: 0, kind: "name", count: 3, width: 7, base: 0, label: "默认姓名编码"},
  {block: 1, kind: "chassis-weight", count: 11, width: 2, base: 0,
    label: "默认底盘重量"},
  {block: 1, kind: "current-sp", count: 11, width: 2, base: 22,
    label: "默认当前 SP"},
];

function templateBlocks(document) {
  const blocks = document?.new_game_default_template?.blocks;
  require(Array.isArray(blocks) && blocks.length === 2
    && blocks[0]?.id === "save-vehicle.initial-template-prefix"
    && blocks[1]?.id === "save-vehicle.initial-template-suffix"
    && blocks[0]?.values?.length === 21 && blocks[1]?.values?.length === 44,
  "战车新游戏模板块不完整");
  return blocks;
}

function saveVehicleTemplateFieldDescriptions(document) {
  const blocks = templateBlocks(document);
  return groups.flatMap(group => Array.from({length: group.count}, (_, slot) => {
    const handle = `save-vehicle.initial-template-${group.block ? "suffix" : "prefix"}:${group.kind}:${slot}`;
    return Array.from({length: group.width}, (_, byte) => {
      const offset = group.base + slot * group.width + byte;
      const value = blocks[group.block].values[offset];
      require(Number.isInteger(value) && value >= 0 && value <= 255,
        "战车新游戏模板字节无效");
      return {resourceId: RESOURCE_ID, entityHandle: handle,
        fieldName: `byte_${byte}`, defaultValue: value,
        writeback: ROM_WRITE_PENDING,
        documentPath: ["new_game_default_template", "blocks", group.block,
          "values", offset]};
    });
  }).flat());
}

function saveVehicleTemplateObjects(document) {
  const descriptions = saveVehicleTemplateFieldDescriptions(document);
  const grouped = new Map();
  for (const field of descriptions) {
    const fields = grouped.get(field.entityHandle) ?? [];
    fields.push(field);
    grouped.set(field.entityHandle, fields);
  }
  return [...grouped].map(([id, fields]) => {
    const group = groups.find(item => id.includes(`:${item.kind}:`));
    const slot = Number(id.split(":").at(-1));
    const slotLabel = slot < 8 ? `自有战车槽 ${slot + 1}`
      : `空出租实例槽 ${slot + 1}`;
    const label = `${slotLabel} · ${group.label}`;
    return {id, label, fragmentIds: [],
      fields: fields.map(field => [field.entityHandle, field.fieldName]),
      editor: {kind: "numeric-table", rows: [id], rowLabels: [label],
        columns: fields.map((field, byte) => ({name: field.fieldName,
          label: group.kind === "name" ? `姓名编码字节 ${byte + 1}`
            : byte === 0 ? "低字节" : "高字节", min: 0, max: 255}))}};
  });
}

function validateTemplateAsset(candidate, original) {
  require(candidate?.resource_id === RESOURCE_ID && original?.resource_id === RESOURCE_ID
    && candidate.schema === original.schema && candidate.edit_policy === "mutable",
  "战车新游戏模板资源身份或编辑策略改变");
  const expected = structuredClone(original);
  const blocks = templateBlocks(candidate.document);
  templateBlocks(expected.document).forEach((block, index) => {
    block.values = blocks[index].values.map(value => {
      require(Number.isInteger(value) && value >= 0 && value <= 255,
        "战车新游戏模板字节无效");
      return value;
    });
  });
  require(canonicalJsonEqual(candidate, expected), "战车新游戏模板只允许修改 65 个字节");
}

export const saveVehicleTemplateFieldOwner = Object.freeze({
  compilerId: null, physicalWriteback: false, writeback: ROM_WRITE_PENDING,
  describe: saveVehicleTemplateFieldDescriptions,
  objects: saveVehicleTemplateObjects,
  validate: (original, overrides) => validateFieldOverrides(original, overrides,
    saveVehicleTemplateFieldDescriptions, validateTemplateAsset),
  encode: () => [], controls: mountFieldObjectControls,
  documentView: true, legacyClosed: true,
});
