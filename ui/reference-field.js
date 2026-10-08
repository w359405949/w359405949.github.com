// @editor-module 表字段与 owner 引用选择器之间的通用装配层
//
// 字段声明提供候选表与键；字段对象可登记当前显示名、预览与必要的准备步骤。

import {esc} from "../core/dom.js";
import {
  bindReferencePicker,
  referencePickerMarkup,
} from "./reference-picker.js";

const MODULE_ID = /^[a-z0-9][a-z0-9._-]*$/u;
const presentations = new Map();

function valueAtPath(value, path = []) {
  let current = value;
  for (const segment of path) {
    if (current === null || typeof current !== "object"
        || !Object.hasOwn(current, segment)) return undefined;
    current = current[segment];
  }
  return current;
}

function genericPreview(reference, row, label, meta) {
  const configured = reference?.preview?.path
    ? valueAtPath(row, reference.preview.path) : "";
  const text = String(configured ?? "");
  const glyph = (text || label || "?").trim().slice(0, 2) || "?";
  return `<span class="module-reference-data-preview" aria-hidden="true">
    <b>${esc(glyph)}</b>${meta ? `<small>${esc(meta)}</small>` : ""}
  </span>`;
}

function genericItem(row, reference, index) {
  if (!row || typeof row !== "object") {
    throw new TypeError(`引用候选表第 ${index + 1} 行不是对象`);
  }
  const rawValue = valueAtPath(row, reference.key);
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    throw new TypeError(`引用候选表第 ${index + 1} 行缺少声明的键`);
  }
  const value = String(rawValue);
  const rawLabel = valueAtPath(row, reference.name);
  const label = String(rawLabel ?? value);
  const description = reference.description
    ? String(valueAtPath(row, reference.description) ?? "") : "";
  const meta = reference.meta
    ? String(valueAtPath(row, reference.meta) ?? "") : value;
  return {
    value,
    rawValue,
    label,
    description,
    meta,
    preview: genericPreview(reference, row, label, meta),
    filter: [value, label, description, meta].filter(Boolean).join(" ").toLowerCase(),
  };
}

function requireModuleId(moduleId) {
  const value = String(moduleId || "");
  if (!MODULE_ID.test(value)) {
    throw new TypeError(`引用呈现模块 ID 无效：${value || "（空）"}`);
  }
  return value;
}

/** owner 登记候选行怎样成为 picker item；字段机制仍只看静态声明。 */
export function registerReferenceFieldPresentation(moduleId, definition) {
  const id = requireModuleId(moduleId);
  if (!definition || typeof definition !== "object"
      || typeof definition.item !== "function") {
    throw new TypeError(`${id}: 引用呈现必须提供 item`);
  }
  if (definition.paint !== undefined && typeof definition.paint !== "function") {
    throw new TypeError(`${id}: 引用呈现 paint 必须是函数`);
  }
  for (const key of ["prepare", "currentLabel"]) {
    if (definition[key] !== undefined && typeof definition[key] !== "function") {
      throw new TypeError(`${id}: 引用呈现 ${key} 必须是函数`);
    }
  }
  if (presentations.has(id)) throw new TypeError(`引用呈现重复登记：${id}`);
  presentations.set(id, Object.freeze({...definition}));
}

function presentationFor(moduleId) {
  return presentations.get(requireModuleId(moduleId)) || null;
}

export async function prepareReferenceFieldPresentation(moduleId) {
  await presentationFor(moduleId)?.prepare?.();
}

export function referenceFieldCurrentLabel(moduleId, row, fallback) {
  return presentationFor(moduleId)?.currentLabel?.(row) ?? fallback;
}

function presentedItem(row, reference, index, moduleId) {
  const presentation = presentationFor(moduleId);
  const itemFactory = presentation?.item || genericItem;
  const declared = genericItem(row, reference, index);
  const item = itemFactory(row, reference, index);
  if (!item) return item;
  const resolved = !presentation || !Array.isArray(reference?.name) ? item : {
    ...item,
    label: referenceFieldCurrentLabel(moduleId, row, declared.label),
    filter: [item.filter, declared.filter].filter(Boolean).join(" ").toLowerCase(),
  };
  return {...resolved, rawValue: declared.rawValue};
}

function declaredKeyPickerItem(item, reference) {
  if (!item || !Array.isArray(reference?.key)) return item;
  const value = String(item.rawValue);
  // owner 自己直接生成 picker 时可以自定 value；字段声明一旦给出 key，候选身份与
  // 原生控件写回值都必须服从这个键。只读 owner 预览仍可展示 owner 的句柄身份。
  return {...item, value, controlValue: value};
}

function multiTargetItem(row, reference, index, moduleId) {
  const {targets: _targets, ...sharedReference} = reference;
  const targetReference = {...sharedReference, module: moduleId};
  const item = presentedItem(row, targetReference, index, moduleId);
  if (!item) {
    throw new TypeError(`引用候选表第 ${index + 1} 行不属于发布归属模块 ${moduleId}`);
  }
  return {
    ...item,
    description: [moduleId, item.description].filter(Boolean).join(" · "),
    filter: [item.filter, moduleId].filter(Boolean).join(" ").toLowerCase(),
  };
}

function candidateUnionItem(row, reference, index) {
  const moduleId = requireModuleId(reference?.module);
  const item = presentedItem(row, reference, index, moduleId);
  if (!item) {
    throw new TypeError(`引用候选表第 ${index + 1} 行不能呈现为 ${moduleId}`);
  }
  return {
    ...item,
    description: [moduleId, item.description].filter(Boolean).join(" · "),
    filter: [item.filter, moduleId].filter(Boolean).join(" ").toLowerCase(),
  };
}

/**
 * 让只读句柄预览与 picker 复用同一份 owner 呈现登记。返回值仍是 picker item
 * 形状，但调用方不得据此生成候选列表或写控件。
 */
function referenceFieldPresentationItem(reference, row, index = 0) {
  const moduleId = requireModuleId(reference?.module);
  const item = presentedItem(row, reference, index, moduleId);
  if (!item || typeof item !== "object") {
    throw new TypeError(`引用候选表第 ${index + 1} 行不能呈现为 ${moduleId}`);
  }
  const value = String(item.value ?? "");
  if (!value) throw new TypeError(`引用候选表第 ${index + 1} 行缺少呈现值`);
  return {
    value,
    label: String(item.label ?? value),
    description: String(item.description ?? ""),
    meta: String(item.meta ?? ""),
    preview: String(item.preview ?? ""),
  };
}

/** 派生句柄只展示 owner 预览；这里刻意没有 details、候选按钮或原生输入框。 */
function referenceFieldReadOnlyMarkup({
  reference = null,
  moduleId = reference?.module,
  row = null,
  rowIndex = 0,
  value = "",
  label = "派生引用",
  error = "",
  pending = false,
} = {}) {
  const targetModule = requireModuleId(moduleId);
  const presentation = presentationFor(targetModule);
  let item = {
    value: String(value || "—"),
    label: String(value || "未提供句柄"),
    description: "",
    meta: targetModule,
    preview: "",
  };
  if (row !== null && reference) {
    item = referenceFieldPresentationItem(reference, row, rowIndex);
  }
  const sourceValue = String(value || item.value || "—");
  const reason = String(error || "");
  const status = pending ? "正在读取目标预览" : reason ? "派生引用不可用" : "只读派生引用";
  return `<article class="module-reference-readonly${
    presentation?.className ? ` ${esc(presentation.className)}` : ""}"
    data-module-reference-readonly data-module-reference-module="${esc(targetModule)}"
    aria-readonly="true"${pending ? " aria-busy=\"true\"" : ""}>
    <span class="module-reference-picker-preview" data-reference-readonly-preview>${
      item.preview}</span>
    <span class="module-reference-picker-current-copy">
      <small>${esc(label)} · ${esc(status)}</small>
      <b>${esc(item.label)}</b>
      ${reason
        ? `<small class="module-reference-readonly-error" role="alert">${esc(reason)}</small>`
        : item.description ? `<small>${esc(item.description)}</small>` : ""}
    </span>
    <code${item.meta ? ` title="${esc(item.meta)}"` : ""}>${esc(sourceValue)}</code>
  </article>`;
}

/** 为只读预览调用 owner 已登记的像素绘制器；不绑定 picker 交互。 */
async function hydrateReferenceFieldReadOnlyPreviews(
  root = document,
  {paint = undefined} = {},
) {
  const selector = "[data-module-reference-readonly]";
  const previews = [
    ...(root?.matches?.(selector) ? [root] : []),
    ...(root?.querySelectorAll?.(selector) || []),
  ];
  await Promise.all(previews.map(async preview => {
    if (preview.dataset.moduleReferenceReadonlyPainted === "1") return;
    preview.dataset.moduleReferenceReadonlyPainted = "1";
    const ownerPaint = presentationFor(preview.dataset.moduleReferenceModule)?.paint;
    const painter = paint === undefined ? ownerPaint : paint;
    const target = preview.querySelector("[data-reference-readonly-preview]");
    if (typeof painter === "function" && target) await painter(target);
  }));
}

function declaredSentinelItems(reference, items) {
  const nullable = reference?.nullable;
  const sentinels = reference?.sentinels || [];
  if (nullable === undefined && !sentinels.length) return items;
  const candidateValues = new Set();
  const candidates = items.map((item, index) => {
    if (!new Set(["number", "string"]).has(typeof item.rawValue)
        || (typeof item.rawValue === "number" && !Number.isFinite(item.rawValue))) {
      throw new TypeError(`带哨兵引用候选 ${index + 1} 的原始键不是数字或字符串`);
    }
    const pickerValue = String(item.rawValue);
    candidateValues.add(pickerValue);
    return {
      ...item,
      controlValue: nullable === undefined
        ? pickerValue : JSON.stringify(item.rawValue),
    };
  });
  const exactSentinels = sentinels.map(sentinel => {
    const pickerValue = String(sentinel.value);
    if (candidateValues.has(pickerValue)) {
      throw new TypeError(`声明哨兵 ${pickerValue} 与目标候选键冲突`);
    }
    return {
      value: pickerValue,
      controlValue: nullable === undefined
        ? pickerValue : JSON.stringify(sentinel.value),
      label: sentinel.label,
      description: sentinel.description || "明确的非引用保留值",
      meta: sentinel.meta ?? pickerValue,
      preview: '<span class="module-reference-data-preview" aria-hidden="true"><b>—</b></span>',
      filter: [pickerValue, sentinel.label, sentinel.description, sentinel.meta]
        .filter(Boolean).join(" ").toLowerCase(),
    };
  });
  const nullSentinel = nullable === undefined ? [] : [{
    value: "",
    controlValue: "null",
    empty: true,
    label: nullable.label,
    description: nullable.description || "明确的空引用哨兵",
    meta: nullable.meta || "null",
    preview: '<span class="module-reference-data-preview" aria-hidden="true"><b>∅</b></span>',
    filter: ["null", nullable.label, nullable.description]
      .filter(Boolean).join(" ").toLowerCase(),
  }];
  return [...nullSentinel, ...exactSentinels, ...candidates];
}

/**
 * 把一张已经按静态声明取出的目标表装进统一 picker。场景等 owner 可以登记像素
 * 呈现；没有专有呈现的表仍使用声明的 name/description/meta/preview.path。
 */
export function referenceFieldPickerMarkup({
  reference,
  rows = [],
  rowModules = [],
  rowReferences = [],
  candidatePresentation = "owner",
  candidateControlValue = null,
  value = null,
  label = "引用",
  controlMarkup = "",
  componentAttributes = "",
  error = "",
  unavailableKind = "",
  pending = false,
  picker = {},
} = {}) {
  if (!Array.isArray(rows)) throw new TypeError("引用候选不是数组");
  if (!["owner", "declared"].includes(candidatePresentation)) {
    throw new TypeError(`引用候选呈现方式无效：${String(candidatePresentation)}`);
  }
  if (candidateControlValue !== null && typeof candidateControlValue !== "function") {
    throw new TypeError("引用候选 control value 转换器必须是函数");
  }
  const multiTarget = reference?.targets !== undefined;
  const candidateUnion = reference?.container?.kind === "candidate-union";
  const crossTarget = multiTarget || candidateUnion;
  if (crossTarget && candidatePresentation !== "owner") {
    throw new TypeError("跨目标引用不能绕过逐 owner 候选呈现");
  }
  const targetModules = candidateUnion
    ? reference.container.domains.map(domain => requireModuleId(domain.reference?.module))
    : multiTarget
    ? reference.targets.domains.map(domain => requireModuleId(domain.module))
    : [requireModuleId(reference?.module)];
  if (multiTarget && (!Array.isArray(rowModules) || rowModules.length !== rows.length)) {
    throw new TypeError("多目标引用候选必须逐行携带发布归属模块");
  }
  if (candidateUnion && (!Array.isArray(rowReferences)
      || rowReferences.length !== rows.length)) {
    throw new TypeError("跨表引用候选必须逐行携带静态 owner 表声明");
  }
  const moduleId = crossTarget ? "multi-target" : targetModules[0];
  const presentation = crossTarget || candidatePresentation === "declared"
    ? null : presentationFor(moduleId);
  const targetItems = rows.map((row, index) => {
    let item;
    if (candidateUnion) {
      const rowReference = rowReferences[index];
      item = declaredKeyPickerItem(
        candidateUnionItem(row, rowReference, index),
        rowReference,
      );
    } else {
      item = declaredKeyPickerItem(multiTarget
        ? multiTargetItem(row, reference, index, requireModuleId(rowModules[index]))
        : candidatePresentation === "declared"
          ? genericItem(row, reference, index)
          : presentedItem(row, reference, index, moduleId), reference);
    }
    if (!item || candidateControlValue === null) return item;
    return {
      ...item,
      controlValue: String(candidateControlValue(item.rawValue, row, index)),
    };
  }).filter(Boolean);
  const items = declaredSentinelItems(reference, targetItems).map(item => ({...item,
    ...(picker.compact && picker.previewPanel ? {label: item.compactLabel || item.label} : {}),
    ...(picker.identityOnly ? {currentLabel: item.value} : {}),
  }));
  const selectedValue = String(value ?? "");
  const current = items.find(item => String(item.value) === selectedValue) || {
    value: selectedValue || "—",
    label: selectedValue || "未选择",
    description: selectedValue ? "目标表中没有这个键" : "尚未选择引用",
    meta: "",
    preview: "",
  };
  let unavailableReason = String(error || "");
  let unavailableState = String(unavailableKind || "");
  if (!pending && !unavailableReason && !targetItems.length) {
    unavailableReason = "候选表已读取且路径匹配，但 owner 呈现后的引用值域为空";
    unavailableState = "empty-domain";
  }
  return referencePickerMarkup({
    ...picker,
    moduleId,
    value: selectedValue,
    label,
    items,
    current,
    controlMarkup,
    componentAttributes: [
      componentAttributes,
      crossTarget ? `data-module-reference-targets="${esc(targetModules.join(","))}"` : "",
      candidatePresentation === "declared"
        ? 'data-module-reference-candidate-presentation="declared"' : "",
    ].filter(Boolean).join(" "),
    className: [
      "module-table-reference-field",
      picker.previewPanel ? 'reference-detail-field' : '',
      presentation?.className,
      ...(crossTarget ? [...new Set(targetModules.map(target =>
        presentationFor(target)?.className).filter(Boolean))] : []),
    ]
      .filter(Boolean).join(" "),
    filterLabel: presentation?.filterLabel || "过滤候选",
    filterPlaceholder: presentation?.filterPlaceholder || "按键、名称或说明过滤",
    unavailableReason: pending ? "正在读取声明的候选表" : unavailableReason,
    unavailableKind: pending ? "loading" : unavailableState,
    busy: pending,
  });
}

/** 给字段表或 owner 自己生成的 picker 装上同一套交互与惰性预览。 */
export function hydrateReferenceFieldPickers(root = document, {paint = undefined} = {}) {
  const selector = "[data-module-reference-picker]";
  const pickers = [
    ...(root?.matches?.(selector) ? [root] : []),
    ...(root?.querySelectorAll?.(selector) || []),
  ];
  pickers.forEach(picker => {
    const declaredCandidates = picker.dataset.moduleReferenceCandidatePresentation === "declared";
    const presentation = declaredCandidates
      ? null : presentationFor(picker.dataset.moduleReferenceModule);
    let pickerPaint = paint;
    if (pickerPaint === undefined) {
      const targetModules = String(picker.dataset.moduleReferenceTargets || "")
        .split(",").filter(Boolean);
      const painters = [...new Set(targetModules.map(moduleId =>
        presentationFor(moduleId)?.paint).filter(candidate => typeof candidate === "function"))];
      pickerPaint = painters.length
        ? async target => {
          for (const painter of painters) await painter(target);
        }
        : presentation?.paint || null;
    }
    bindReferencePicker(picker, {
      paint: pickerPaint,
    });
  });
}
