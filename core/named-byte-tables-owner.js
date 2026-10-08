// @editor-module 具名字节表字段对象：一段表 = 一个字段对象，每个元素一个 0–255 字段。
// 写入许可未发布时构建保留 Original（字段带 ROM_WRITE_PENDING）。
import {canonicalJsonEqual} from "./project-store-values.js";
import {fieldByteLength, fieldFragmentId, fieldOffsetInFragment, ROM_WRITE_PENDING,
  validateFieldOverrides} from "./field-codec.js";

const COLUMN_PREFIX = "value";
const require = (condition, message) => {if (!condition) throw new TypeError(message);};

function tableHandle(owner, name) {
  return `${owner}:${name}`;
}

function tableOf(tables, owner, name) {
  const table = tables.find(candidate => candidate.name === name);
  require(table, `${owner} 表名无效`);
  return table;
}

function readPath(source, path) {
  return path.reduce((node, step) => node?.[step], source);
}

// 一个字段可驱动多处文档位置（多源引用共用同一个字段对象）。
function fieldPaths(table, index) {
  if (table.pathsAt) {
    const paths = table.pathsAt(index);
    require(Array.isArray(paths) && paths.length && paths.every(path => Array.isArray(path) && path.length),
      `${table.name} 的多源路径声明无效`);
    return paths;
  }
  return [table.pathAt ? table.pathAt(index) : [...table.path, index]];
}

// 表值可以是一段数组，也可以按逐元素路径取自记录字段（pathAt）；
// `array` 表每个元素本身是一段等长字节（如组合图块页、字形位图）；
// `matrix` 表每个元素本身是一段「若干行 × 每行等长字节」的嵌套值（原样存文档）。
function elementValues(document, table) {
  const values = (table.pathAt || table.pathsAt)
    ? Array.from({length: table.length}, (_, index) => readPath(document, fieldPaths(table, index)[0]))
    : readPath(document, table.path);
  if (table.text) {
    // 已发布引用清单（如「哪些场景用到该调色板」）或单条引用（如页对句柄）：只展示，
    // 不占 ROM 字节、不参与构建。没有该键的记录按空清单/空串处理（发布物里没有就是
    // 没有，不补造引用）。
    if (!table.array) {
      const scalars = values.map(value => value ?? "");
      require(scalars.every(value => typeof value === "string" && value),
        `${table.name} 引用必须是字符串（清单要声明 array: true）`);
      return scalars;
    }
    const lists = values.map(value => value ?? []);
    require(Array.isArray(values) && values.length === table.length,
      `${table.name} 必须含 ${table.length} 段引用清单`);
    require(lists.every(list => Array.isArray(list)
      && list.every(item => typeof item === "string" && item)), `${table.name} 引用清单必须是非空字符串`);
    return lists;
  }
  if (table.matrix) {
    const {rows, width} = table.matrix;
    const isByte = byte => Number.isInteger(byte) && byte >= 0 && byte <= 0xff;
    require(Array.isArray(values) && values.length === table.length,
      `${table.name} 必须含 ${table.length} 段值`);
    // 行分组是控件的读法，文档形状不因此改变：嵌套（每行一段）与按行序摊平都接受。
    require(values.every(value => Array.isArray(value) && (
      (value.length === rows && value.every(line => Array.isArray(line)
        && line.length === width && line.every(isByte)))
      || (value.length === rows * width && value.every(isByte)))),
    `${table.name} 每段必须是 ${rows} 行 × 每行 ${width} 个 0–255 整数`);
    return values;
  }
  if (table.array) {
    require(Array.isArray(values) && values.length === table.length,
      `${table.name} 必须含 ${table.length} 段字节`);
    require(values.every(value => Array.isArray(value) && value.length === table.arrayWidth
      && value.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 0xff)),
    `${table.name} 每段必须是 ${table.arrayWidth} 个 0–255 整数`);
    return values;
  }
  require(Array.isArray(values) && values.length === table.length,
    `${table.name} 必须含 ${table.length} 个 0–255 整数`);
  require(values.every(value => Number.isInteger(value) && value >= 0 && value <= 0xff),
    `${table.name} 必须含 ${table.length} 个 0–255 整数`);
  return values;
}

export function createNamedByteTablesOwner({owner, schema, tables, defaultSourceKind,
  writeback = ROM_WRITE_PENDING}) {
  const build = typeof tables === "function" ? tables : () => tables;
  require(typeof owner === "string" && owner && typeof schema === "string" && schema
    && (typeof tables === "function" || (Array.isArray(tables) && tables.length)), "具名字节表 owner 声明无效");

  // 表声明可由文档推出（逐块字节段）；文档无关的声明在创建时校验一次。
  const staticSpecs = typeof tables === "function" ? null : Object.freeze(checkSpecs(tables));

  function checkSpecs(declared) {
    const specs = Object.freeze(declared.map(table => {
      // `keys` 表：一条记录的若干具名字节（缺的键不列进来），字段名与标签按 key 走；
      // 不声明 keys 时仍是 value0… 的等长字节表。
      const keys = Array.isArray(table.keys)
        ? Object.freeze(table.keys.map(key => Object.freeze({name: key.name, label: key.label})))
        : null;
      const pathBase = Array.isArray(table.pathBase) ? Object.freeze([...table.pathBase]) : null;
      if (keys && (!pathBase || !keys.length)) throw new TypeError("具名字节表 keys 表必须给非空 keys 与 pathBase");
      return Object.freeze({
        name: table.name, label: table.label, length: keys ? keys.length : table.length,
        fragmentId: table.fragmentId === null ? null : table.fragmentId,
        path: Object.freeze(table.path || [table.name]),
        readOnly: table.readOnly === true,
        immutableReason: table.immutableReason,
        array: table.array === true,
        arrayWidth: Number.isSafeInteger(table.arrayWidth) ? table.arrayWidth : null,
        matrix: table.matrix === undefined ? null : Object.freeze({
          rows: table.matrix.rows, width: table.matrix.width, columns: table.matrix.columns}),
        keys, pathBase,
        text: table.text === true,
        labelAt: keys ? index => keys[index].label
          : (typeof table.labelAt === "function" ? table.labelAt : null),
        pathAt: keys ? index => [...pathBase, keys[index].name]
          : (typeof table.pathAt === "function" ? table.pathAt : null),
        pathsAt: keys ? null : (typeof table.pathsAt === "function" ? table.pathsAt : null)});
    }));
    require(specs.every(table => typeof table.name === "string" && table.name
      && typeof table.label === "string" && table.label
      && Number.isSafeInteger(table.length) && table.length > 0
      && (table.keys === null || table.keys.every(key =>
        typeof key.name === "string" && key.name && typeof key.label === "string" && key.label))
      && (table.matrix === null || [table.matrix.rows, table.matrix.width, table.matrix.columns]
        .every(count => Number.isSafeInteger(count) && count > 0))
      && (table.fragmentId === null || (typeof table.fragmentId === "string" && table.fragmentId))),
    "具名字节表表声明无效");
    return specs;
  }

  function specsFor(document) {
    if (staticSpecs) return staticSpecs;
    require(document && typeof document === "object", `${owner} 文档缺失`);
    return checkSpecs(build(document));
  }

  function fieldDescriptions(document) {
    require(document && typeof document === "object", `${owner} 文档缺失`);
    return specsFor(document).flatMap(table => elementValues(document, table).map((value, index) => {
      const paths = fieldPaths(table, index);
      const width = table.matrix ? table.matrix.rows * table.matrix.width
        : table.array ? table.arrayWidth : 1;
      return {resourceId: owner, entityHandle: tableHandle(owner, table.name),
        fieldName: table.keys ? table.keys[index].name : `${COLUMN_PREFIX}${index}`,
        defaultValue: value, writeback,
        ...(table.readOnly || table.text ? {readOnly: true,
          ...(table.immutableReason ? {edit_policy: "immutable",
            immutable_reason: table.immutableReason} : {})} : {}),
        documentPath: paths[0], documentPaths: paths,
        // 物理位置未发布的表不声明片段：字段照常登记身份与值，但不参与构建。
        ...(table.fragmentId === null ? {}
          : {fragmentId: table.fragmentId, offsetInFragment: index * width, byteLength: width})};
    }));
  }

  function objects(document, {offset = 0, limit = undefined} = {}) {
    const grouped = new Map();
    for (const field of fieldDescriptions(document)) {
      const rows = grouped.get(field.entityHandle) || [];
      rows.push(field);
      grouped.set(field.entityHandle, rows);
    }
    const specs = specsFor(document);
    // 承载页按对象分页取数（`core/project-db.js` 的 offset/limit）：声明只描述形状，
    // 切片在这里做，页面才不会一次挂满全部表。
    const listed = limit === undefined ? [...grouped.entries()]
      : [...grouped.entries()].slice(offset, offset + limit);
    return listed.map(([entityHandle, fields]) => {
      const table = tableOf(specs, owner, entityHandle.slice(owner.length + 1));
      return {id: entityHandle, label: table.label,
        fragmentIds: table.fragmentId === null ? [] : [table.fragmentId],
        fields: fields.map(field => [field.entityHandle, field.fieldName]),
        editor: {kind: "numeric-table", rows: [entityHandle],
          rowLabels: [table.length === 1 ? table.label
            : `${table.label} · 元素 0–${table.length - 1}`],
          columns: fields.map((field, index) => table.text
            ? {name: field.fieldName, label: table.labelAt ? table.labelAt(index) : `元素 ${index}`,
              text: true, ...(table.array ? {array: true} : {})}
            : table.matrix
            ? {name: field.fieldName, label: table.labelAt ? table.labelAt(index) : table.label,
              matrix: {rows: table.matrix.rows, width: table.matrix.width,
                columns: table.matrix.columns}}
            : table.array
            ? {name: field.fieldName, label: table.labelAt ? table.labelAt(index) : `元素 ${index}`,
              array: true, length: table.arrayWidth}
            : {name: field.fieldName, label: table.labelAt ? table.labelAt(index) : `元素 ${index}（0–255）`,
              min: 0, max: 0xff})}};
    });
  }

  function serializeField(field) {
    require(field?.resourceId === owner, `${owner} 字段值无效`);
    // 嵌套行（matrix 表）按行序摊平；层级只影响文档形状，不改变字节顺序。
    const bytes = Array.isArray(field.value) ? field.value.flat(Infinity) : [field.value];
    require(bytes.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 0xff),
      `${owner} 字段值无效`);
    return new Uint8Array(bytes);
  }

  function validateAsset(asset, original) {
    for (const candidate of [asset, original]) {
      // field-ui-module 资源声明 edit_policy: "mutable"；semantic-owner 资源不声明该字段，
      // 因此这里只要求：声明了就必须是 mutable。
      require(candidate?.resource_id === owner && candidate.schema === schema
        && (candidate.edit_policy === undefined || candidate.edit_policy === "mutable"),
      `${owner} 资源身份或策略漂移`);
      for (const table of specsFor(candidate.document)) elementValues(candidate.document, table);
    }
    const expected = structuredClone(original);
    for (const table of specsFor(asset.document)) {
      const values = elementValues(asset.document, table);
      if (table.immutableReason) require(canonicalJsonEqual(values,
        elementValues(original.document, table)), `${owner} 按定义不可变：${table.immutableReason}`);
      for (let index = 0; index < values.length; index += 1) {
        for (const path of fieldPaths(table, index)) {
          const parent = path.slice(0, -1).reduce((node, step) => node[step], expected.document);
          parent[path.at(-1)] = values[index];
        }
      }
    }
    require(canonicalJsonEqual(asset, expected), `${owner} 仅可修改已登记的表`);
  }

  function validate(original, overrides) {
    validateFieldOverrides(original, overrides, fieldDescriptions, validateAsset);
  }

  // 构建按字段声明的片段与偏移落位（读数走 core/field-codec.js 的共享读法）。
  // 物理位置未发布（只读，或写入许可未发布）的字段不进构建；可写字段缺物理绑定照旧抛错。
  function encodeFields(fields, {defaults = false} = {}) {
    const byFragment = new Map();
    for (const field of fields) {
      require(field.resourceId === owner, `${owner} 构建身份漂移`);
      const fragmentId = fieldFragmentId(field);
      if (!fragmentId) {
        if (field.readOnly === true || field.writeback?.state === "unpermitted") continue;
        throw new TypeError(`${owner} 可写字段缺少物理绑定`);
      }
      const value = defaults ? field.defaultValue : field.value;
      const bytes = Array.isArray(value) ? value.flat(Infinity) : [value];
      require(bytes.length > 0 && bytes.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 0xff),
        `${owner} 构建值漂移`);
      const declared = fieldByteLength(field);
      require(declared === undefined || declared === bytes.length, `${owner} 构建字节数与声明不符`);
      const offset = fieldOffsetInFragment(field);
      require(Number.isInteger(offset) && offset >= 0, `${owner} 构建偏移漂移`);
      const entry = byFragment.get(fragmentId) || {bytes: new Map()};
      for (let index = 0; index < bytes.length; index += 1) {
        const at = offset + index;
        require(!entry.bytes.has(at), `${owner} 构建字段重复或重叠`);
        entry.bytes.set(at, bytes[index]);
      }
      byFragment.set(fragmentId, entry);
    }
    return [...byFragment.entries()].map(([fragmentId, entry]) => {
      const length = entry.bytes.size ? Math.max(...entry.bytes.keys()) + 1 : 0;
      require(entry.bytes.size === length, `${owner} 构建字段不连续`);
      const payload = new Uint8Array(length);
      for (const [at, byte] of entry.bytes) payload[at] = byte;
      return {fragment_id: fragmentId, payload, relocations: []};
    });
  }

  const fieldOwner = Object.freeze({compilerId: null, describe: fieldDescriptions,
    validate, encode: encodeFields, documentView: true, legacyClosed: true, writeback,
    ...(defaultSourceKind ? {defaultSourceKind} : {})});
  return Object.freeze({owner, fieldDescriptions, objects, serializeField, validateAsset,
    validate, encodeFields, fieldOwner});
}
