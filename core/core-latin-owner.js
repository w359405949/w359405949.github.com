// @editor-module 核心字库未确认模板槽的字段 owner；已确认字形仍由 char 持有。
import {createNamedByteTablesOwner} from "./named-byte-tables-owner.js";

export const coreLatinFieldOwner = createNamedByteTablesOwner({
  owner: "core-latin",
  schema: "metalmaxcn.semantic-owner.core-latin",
  tables: document => {
    const slots = document?.font_template?.slots;
    if (!Array.isArray(slots) || !slots.length) throw new TypeError("core-latin 模板槽缺失");
    return slots.flatMap((slot, index) => {
      if (typeof slot?.glyph_reference === "string") return [];
      if (!Number.isInteger(slot?.glyph_index) || typeof slot?.glyph_index_hex !== "string"
          || !Array.isArray(slot.opaque_bitmap) || slot.opaque_bitmap.length !== 16)
        throw new TypeError("core-latin 未确认模板槽无效");
      return [{name: `slot-${slot.glyph_index_hex}`, label: `模板槽 ${slot.glyph_index_hex}`,
        length: 1, array: true, arrayWidth: 16,
        pathAt: () => ["font_template", "slots", index, "opaque_bitmap"], fragmentId: null}];
    });
  },
});
