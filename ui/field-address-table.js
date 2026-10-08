// @editor-module 详情页字段值表与已登记物理片段的对账
//
// 字段定义与字节地图取并集；物理片段由记录页的折叠区显示。

import {esc} from "../core/dom.js";
import {expandResourceByteRangeSlots} from "../core/resource-index.js";
import {setStatus} from "./shell.js";
import {dataTable} from "./table.js";

function normalizedFieldDefinitions(fields) {
  if (!Array.isArray(fields)) {
    throw new TypeError("fields 必须是 [key, label] 或 {key, label} 的数组");
  }
  const keys = new Set();
  return fields.map(definition => {
    const key = String(Array.isArray(definition)
      ? definition[0] : definition?.key ?? "");
    if (!key) throw new TypeError("字段定义缺少 key");
    if (keys.has(key)) throw new TypeError(`字段定义重复：${key}`);
    keys.add(key);
    const rawLabel = Array.isArray(definition) ? definition[1] : definition?.label;
    return {key, label: String(rawLabel ?? key)};
  });
}

function normalizedFieldRoles(fieldRoles) {
  if (!Array.isArray(fieldRoles)) {
    throw new TypeError("fieldRoles 必须是 role 字符串数组");
  }
  const roles = new Set();
  for (const rawRole of fieldRoles) {
    const role = String(rawRole || "");
    if (!role) throw new TypeError("fieldRoles 不能包含空 role");
    if (roles.has(role)) throw new TypeError(`fieldRoles 重复：${role}`);
    roles.add(role);
  }
  return roles;
}

function declarationForRole(declarations, role) {
  if (declarations instanceof Map) return declarations.get(role) || null;
  if (!declarations || typeof declarations !== "object"
      || !Object.prototype.hasOwnProperty.call(declarations, role)) return null;
  return declarations[role] || null;
}

function slotLabel(range, declarations) {
  const declaration = declarationForRole(declarations, range.role);
  const declared = declaration?.label;
  if (typeof declared === "function") {
    return String(declared(range.slotIndex, range));
  }
  const base = String(declared || range.role || range.key);
  return range.slotIndex === null ? base : `${base} ${range.slotIndex + 1}`;
}

function rowFromRange(range, {key, label, origin, kind}) {
  return {
    key,
    label,
    origin,
    kind,
    role: range?.role || `field:${key}`,
    fieldKey: range?.fieldKey ?? (kind === "field" ? key : null),
    slotIndex: range?.slotIndex ?? null,
    hasRange: Boolean(range),
    address: range || null,
    space: range?.space || null,
    offset: range?.offset ?? null,
    length: range?.length ?? null,
    status: range?.status || null,
  };
}

/**
 * 对账字段定义与物理片段，并返回表格行。
 *
 * `fields` 保持调用方顺序；同 key 有多段地址时每段各占一行。范围侧独有的
 * `field:` 以及声明展开后的槽行接在其后。`valueFor(row)` 返回值单元格 HTML。
 * `fieldRoles` 可把调用方指定的非 `field:` role 按同名字段参与对账；默认不启用，
 * 原语本身不认识任何业务 role。
 */
export function reconcileFieldAddressRows({
  uid,
  fields = [],
  fieldRoles = [],
  slotDeclarations = {},
  valueFor = () => null,
} = {}) {
  if (typeof valueFor !== "function") throw new TypeError("valueFor 必须是函数");
  const definitions = normalizedFieldDefinitions(fields);
  const declaredFieldRoles = normalizedFieldRoles(fieldRoles);
  const ranges = expandResourceByteRangeSlots(uid, slotDeclarations).map(range =>
    range.fieldKey === null && declaredFieldRoles.has(range.role)
      ? {...range, key: range.role, fieldKey: range.role}
      : range
  );
  const fieldRanges = ranges.filter(
    range => range.fieldKey !== null && range.slotIndex === null,
  );
  const otherRanges = ranges.filter(
    range => range.fieldKey === null || range.slotIndex !== null,
  );
  const rangesByField = new Map();
  for (const range of fieldRanges) {
    if (!rangesByField.has(range.fieldKey)) rangesByField.set(range.fieldKey, []);
    rangesByField.get(range.fieldKey).push(range);
  }

  const declaredKeys = new Set(definitions.map(definition => definition.key));
  const rows = [];
  for (const definition of definitions) {
    const matches = rangesByField.get(definition.key) || [];
    if (!matches.length) {
      rows.push(rowFromRange(null, {
        ...definition,
        origin: "definition",
        kind: "field",
      }));
      continue;
    }
    for (const range of matches) {
      rows.push(rowFromRange(range, {
        ...definition,
        origin: "definition+range",
        kind: "field",
      }));
    }
  }
  for (const range of fieldRanges) {
    if (declaredKeys.has(range.fieldKey)) continue;
    rows.push(rowFromRange(range, {
      key: range.fieldKey,
      label: range.fieldKey,
      origin: "range",
      kind: "field",
    }));
  }
  for (const range of otherRanges) {
    const label = slotLabel(range, slotDeclarations);
    const key = range.key || range.role;
    if (!key || !label) continue;
    rows.push(rowFromRange(range, {
      key,
      label,
      origin: "range",
      kind: range.slotIndex === null ? "range" : "slot",
    }));
  }

  return rows.map((row, index) => {
    const identified = {...row, id: `${row.kind}:${row.key}:${index}`};
    return {...identified, value: valueFor(identified)};
  });
}

function fieldCell(row) {
  const key = `<small class="mono">${esc(row.key)}</small>`;
  return `<div class="table-cell-stack" data-field-address-key="${esc(row.key)}">
    <b>${esc(row.label)}</b>${row.label === row.key ? "" : key}
  </div>`;
}

function valueCell(row) {
  return row.value === null || row.value === undefined || row.value === ""
    ? '<span class="resource-empty">—</span>' : String(row.value);
}

function statusCell(row) {
  return row.hasRange
    ? `<span data-field-address-status="${esc(row.status || "未分级")}">${
      esc(row.status || "未分级")
    }</span>`
    : '<span class="resource-unregistered" data-field-address-status="未登记">未登记</span>';
}

const FIELD_ADDRESS_COLUMNS = [
  {key: "label", label: "字段", width: 190, sticky: true, cell: fieldCell},
  {key: "value", label: "值", width: 180, wrap: true, cell: valueCell},
  {key: "status", label: "状态", width: 110, cell: statusCell},
];

/**
 * 构造详情页字段地址表。
 *
 * `dataTable` 会把字段行数写成“记录数”；这对详情页是错误语义。因此表生成后用
 * 调用方给的 `pageStatus` 覆盖四个状态槽，默认全部清空，上一页状态也不会残留。
 * 已按用途分块的页面可传入 reconcileFieldAddressRows 的 rows 子集，其余行由各块展示。
 */
export function fieldAddressTable({pageStatus = {}, rows = null, showStatus = true, ...options} = {}) {
  rows ??= reconcileFieldAddressRows(options);
  const markup = dataTable({
    columns: showStatus ? FIELD_ADDRESS_COLUMNS : FIELD_ADDRESS_COLUMNS.filter(column => column.key !== "status"),
    rows,
    rowId: row => row.id,
    empty: "没有字段或物理片段",
  });
  setStatus({...pageStatus, address: ""});
  return `<div class="field-address-table" data-field-address-table
    data-field-address-row-count="${rows.length}">${markup}</div>`;
}
