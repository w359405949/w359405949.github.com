// @editor-module 字段对象复用字段身份、Working 与编辑控件。
export function createFieldObject(definition, fields, database, owner) {
  const keys = new Set(definition.fields.map(key => JSON.stringify(key)));
  // Paged owners can contain tens of thousands of fields.  Their caller has
  // already indexed these by identity, so selecting a two-field object must
  // not scan that complete set once per object.
  const selected = fields instanceof Map
    ? definition.fields.map(key => fields.get(JSON.stringify(key))).filter(Boolean)
    : fields.filter(field => keys.has(JSON.stringify([field.entityHandle, field.fieldName])));
  if (!selected.length || selected.length !== keys.size || new Set(selected.map(field => JSON.stringify(field.key))).size !== selected.length)
    throw new TypeError("字段对象缺少字段或身份重复");
  const key = Object.freeze([selected[0].key[0], selected[0].resourceId, definition.id]);
  const object = {
    key, id: definition.id, resourceId: selected[0].resourceId,
    definition: Object.freeze(definition), fields: Object.freeze(selected), database,
    get origin() {return selected.map(field => ({entityHandle: field.entityHandle, fieldName: field.fieldName, value: field.defaultValue}));},
    get working() {return selected.filter(field => field.hasOverride).map(field => ({entityHandle: field.entityHandle, fieldName: field.fieldName, value: field.workingValue}));},
    get buildFields() {
      const seen = new Set();
      return selected.filter(field => {
        if (!field.hasOverride || !field.physical || field.writeback?.state === "unpermitted") return false;
        if (!field.bitMask || field.physical.byteLength !== 1) return true;
        const location = JSON.stringify([field.physical.component.fragment_id, field.physical.offsetInFragment]);
        if (seen.has(location)) return false;
        seen.add(location);
        return true;
      });
    },
    get edited() {return selected.some(field => field.hasOverride);},
    get physical() {return selected.map(field => field.physical ?? field.sourceAddress ?? null);},
    async mount(host, options = {}) {
      if (typeof owner.controls !== "function") throw new TypeError("字段对象尚未提供编辑控件");
      return owner.controls(host, object, options);
    },
    validatePreimage(fragmentId, baseline) {
      if (definition.fragmentIds.includes(fragmentId)) owner.validatePreimage(selected, fragmentId, baseline);
    },
    serializeWorking() {
      if (typeof owner.serializeField !== "function") throw new TypeError("字段对象未提供 Working 序列化");
      const serialized = [], packed = new Map();
      for (const field of selected.filter(field => field.hasOverride && field.physical
        && field.writeback?.state !== "unpermitted")) {
        const payload = owner.serializeField(field, selected);
        if (field.bitMask && field.physical.byteLength === 1) {
          const location = JSON.stringify([field.physical.component.fragment_id, field.physical.offsetInFragment]);
          const previous = packed.get(location);
          if (previous) {
            if ((previous.mask & field.bitMask) || !(payload instanceof Uint8Array)
                || !(previous.payload instanceof Uint8Array) || payload.length !== 1
                || previous.payload.length !== 1 || payload[0] !== previous.payload[0])
              throw new TypeError("共用字节的位字段序列化不一致");
            previous.mask |= field.bitMask;
            continue;
          }
          packed.set(location, {mask: field.bitMask, payload});
        }
        serialized.push({field, payload});
      }
      return serialized;
    },
  };
  return Object.freeze(object);
}

let controlRenderer = null;

export function configureFieldObjectControls(renderer) {
  if (typeof renderer !== "function") throw new TypeError("字段对象编辑控件缺少注入入口");
  controlRenderer = renderer;
}

export function fieldObjectControls(resourceId) {
  return async (host, object, options = {}) => {
    if (!controlRenderer) throw new TypeError("字段对象编辑控件未注入");
    return controlRenderer(resourceId, host, object, options);
  };
}

export const mountFieldObjectControls = fieldObjectControls(null);

// 字节表的字段顺序由所属域声明，原像校验与 Working 序列化保持独立。
export function byteTableFieldObjectCodec({resourceId, fragmentId, fields}) {
  if (typeof resourceId !== "string" || !resourceId || typeof fragmentId !== "string" || !fragmentId
      || !Array.isArray(fields) || !fields.length || fields.some(key => !Array.isArray(key) || key.length !== 2
        || key.some(value => typeof value !== "string" || !value))) throw new TypeError("字节表字段声明无效");
  const keys = Object.freeze(fields.map(key => Object.freeze([...key])));
  const positions = new Map(keys.map((key, index) => [JSON.stringify(key), index]));
  if (positions.size !== keys.length) throw new TypeError("字节表字段身份重复");
  const definition = Object.freeze({id: fragmentId, fragmentIds: Object.freeze([fragmentId]), fields: keys});
  const position = field => {
    const offset = positions.get(JSON.stringify([field.entityHandle, field.fieldName]));
    if (field.resourceId !== resourceId || offset === undefined) throw new TypeError("字节表字段身份不符");
    return offset;
  };
  return Object.freeze({
    objects: () => [definition],
    serializeField(field) {
      position(field);
      const value = field.value;
      if (!Number.isInteger(value) || value < 0 || value > 255) throw new TypeError("字节表字段必须为 0..255 的整数");
      return new Uint8Array([value]);
    },
    validatePreimage(selected, id, baseline) {
      if (id !== fragmentId || baseline.length !== keys.length || selected.length !== keys.length)
        throw new TypeError("字节表 Origin 身份或长度不符");
      const seen = new Set();
      for (const field of selected) {
        const offset = position(field);
        if (seen.has(offset) || baseline[offset] !== field.defaultValue)
          throw new TypeError("byte table Origin differs from bound baseline");
        seen.add(offset);
      }
    },
  });
}
