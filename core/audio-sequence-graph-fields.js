// @editor-module 音序流的指令句柄清单由已发布解码图确定。

const RESOURCE_ID = "audio-sequence";
const require = (valid, message) => { if (!valid) throw new TypeError(message); };

function audioSequenceGraphFieldDescriptions(document) {
  require(document?.schema === "metalmaxcn.audio-sequence"
    && Array.isArray(document.streams)
    && document.streams.length === document.summary?.canonical_streams,
  "音序图发布记录不完整");
  const seen = new Set();
  return document.streams.map((stream, index) => {
    require(typeof stream?.id === "string" && stream.id.startsWith("audio-seq-s:")
      && !seen.has(stream.id) && Array.isArray(stream.instruction_ids),
    "音序图流身份或指令句柄无效");
    seen.add(stream.id);
    return {resourceId: RESOURCE_ID, entityHandle: stream.id,
      fieldName: "instruction_ids", defaultValue: stream.instruction_ids,
      documentPath: ["streams", index, "instruction_ids"], readOnly: true,
      edit_policy: "immutable", immutable_reason: "指令句柄清单由解码指令及流边决定"};
  });
}

function audioSequenceGraphObjects(document) {
  return audioSequenceGraphFieldDescriptions(document).map(field => ({
    id: field.entityHandle, label: field.entityHandle, fragmentIds: [],
    fields: [[field.entityHandle, field.fieldName]],
  }));
}

export const audioSequenceGraphFieldOwner = Object.freeze({
  compilerId: null, physicalWriteback: false,
  describe: audioSequenceGraphFieldDescriptions,
  objects: audioSequenceGraphObjects,
  validate: (original, overrides) => {
    require(Array.isArray(overrides) && overrides.length === 0,
      "音序图字段没有写入许可");
  },
  encode: () => [],
});
