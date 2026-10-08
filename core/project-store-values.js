// @editor-module 实现 JSON 默认值与稀疏覆盖、选择性重置和仓库纯值操作。
// Pure value semantics for the browser project repository.
//
// This module deliberately has no DOM, IndexedDB, or Node dependency.  It is
// shared by the IndexedDB adapter and by the contract tests.  Persistent asset
// values are JSON only; MISSING exists solely while comparing object members.

export const MISSING = Symbol.for("metalmaxcn.project-store.missing");

const RESOURCE_TOMBSTONE_SCHEMA =
    "metalmaxcn.resource-tombstone";

const hasOwn = (value, key) =>
    Object.prototype.hasOwnProperty.call(value, key);
const frozenValidatedNodes = new WeakSet();
const frozenJsonTrees = new WeakSet();
export const isFrozenValidatedJson = value => value !== null && typeof value === "object"
    && frozenValidatedNodes.has(value);

export function isPlainJsonObject(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function jsonPath(parts) {
    return "$" + parts.map(part => "/" + escapeJsonPointerToken(part)).join("");
}

function assertJsonNode(value, path, ancestors, label) {
    const at = () => label + jsonPath(path).slice(1);
    if (value === null || typeof value === "string" || typeof value === "boolean") return true;
    if (typeof value === "number") {
        if (!Number.isFinite(value)) throw new TypeError(`${at()}: JSON numbers must be finite`);
        return !Object.is(value, -0);
    }
    if (value === MISSING) throw new TypeError(`${at()}: MISSING is comparison state, not JSON`);
    if (typeof value !== "object") throw new TypeError(`${at()}: value is not JSON-compatible`);
    if (frozenValidatedNodes.has(value)) return true;
    if (ancestors.has(value)) throw new TypeError(`${at()}: cyclic JSON value`);
    ancestors.add(value);
    let immutable = Object.isFrozen(value);
    if (Array.isArray(value)) {
        immutable = immutable && Object.getPrototypeOf(value) === Array.prototype
            && Reflect.ownKeys(value).length === value.length + 1;
        for (let index = 0; index < value.length; index += 1) {
            if (!hasOwn(value, index)) throw new TypeError(`${at()}/${index}: sparse arrays cannot represent MISSING`);
            path.push(String(index));
            immutable = assertJsonNode(value[index], path, ancestors, label) && immutable;
            path.pop();
        }
    } else {
        if (!isPlainJsonObject(value)) throw new TypeError(`${at()}: only plain JSON objects are allowed`);
        const keys = Reflect.ownKeys(value);
        immutable = immutable && Object.getPrototypeOf(value) === Object.prototype
            && !keys.includes("__proto__");
        if (keys.some(key => typeof key === "symbol")) throw new TypeError(`${at()}: symbol keys are not JSON-compatible`);
        for (const key of keys) {
            const descriptor = Object.getOwnPropertyDescriptor(value, key);
            if (!descriptor.enumerable || !("value" in descriptor)) throw new TypeError(
                `${at()}/${escapeJsonPointerToken(key)}: JSON properties must be enumerable data properties`,
            );
            path.push(key);
            immutable = assertJsonNode(descriptor.value, path, ancestors, label) && immutable;
            path.pop();
        }
    }
    ancestors.delete(value);
    if (immutable) frozenValidatedNodes.add(value);
    return immutable;
}

export function assertJsonValue(value, label = "$") {
    assertJsonNode(value, [], new Set(), label);
    return value;
}

function cloneJsonNode(value) {
    if (value === null || typeof value !== "object") {
        return Object.is(value, -0) ? 0 : value;
    }
    if (Array.isArray(value)) return value.map(cloneJsonNode);
    const result = {};
    for (const key of Object.keys(value)) {
        result[key] = cloneJsonNode(value[key]);
    }
    return result;
}

export function cloneJson(value) {
    assertJsonValue(value);
    return cloneJsonNode(value);
}

/**
 * 写入端已经逐节点校验过的值：只深拷贝，不再复查。
 *
 * 仓储里每一份 Original / Working / 覆盖都由写入路径（`normalizeOriginalAsset`、
 * `saveValues`、`importProject`）先过一遍 `assertJsonValue`，读取时再走一遍
 * 是整个文档级的重复劳动（`text-record` 的 Original 是 2.9 MB）。
 */
export function cloneValidatedJson(value) {
    return cloneJsonNode(value);
}

function freezeJsonNode(value) {
    if (value && typeof value === "object" && !frozenJsonTrees.has(value)) {
        if (Array.isArray(value)) {
            for (const child of value) freezeJsonNode(child);
        } else {
            for (const key of Object.keys(value)) freezeJsonNode(value[key]);
        }
        if (!Object.isFrozen(value)) Object.freeze(value);
        frozenJsonTrees.add(value);
    }
    return value;
}

export function freezeValidatedJson(value) {
    freezeJsonNode(value);
    if (value && typeof value === "object") frozenValidatedNodes.add(value);
    return value;
}

function canonicalizeNode(value) {
    if (value === null || typeof value !== "object") {
        return Object.is(value, -0) ? 0 : value;
    }
    if (Array.isArray(value)) return value.map(canonicalizeNode);
    const result = {};
    for (const key of Object.keys(value).sort()) {
        result[key] = canonicalizeNode(value[key]);
    }
    return result;
}

export function canonicalJsonStringify(value) {
    assertJsonValue(value);
    return JSON.stringify(canonicalizeNode(value));
}

function equalJsonNodes(left, right) {
    if (left === right) return true;
    if (left === null || right === null || typeof left !== "object" || typeof right !== "object") return false;
    if (Array.isArray(left) !== Array.isArray(right)) return false;
    if (Array.isArray(left)) return left.length === right.length && left.every((item, index) => equalJsonNodes(item, right[index]));
    // canonicalizeNode writes to ordinary objects, whose __proto__ setter does not create a JSON member.
    const keys = Object.keys(left).filter(key => key !== "__proto__");
    return keys.length === Object.keys(right).filter(key => key !== "__proto__").length
        && keys.every(key => hasOwn(right, key) && equalJsonNodes(left[key], right[key]));
}

export function canonicalJsonEqual(left, right) {
    if (left === MISSING || right === MISSING) return left === right;
    assertJsonValue(left);
    assertJsonValue(right);
    return equalJsonNodes(left, right);
}

/** 两侧都须经写入校验；对象成员顺序不参与相等判定。 */
export function validatedJsonEqual(left, right) {
    return equalJsonNodes(left, right);
}

// 默认值 + 稀疏覆盖：项目里只有「提取器发布的默认值」和「用户改过的那些值」。
// 取值时逐字段现算 `覆盖 ?? 默认`，所以重解析换掉默认值那一层不需要任何迁移，
// 也不存在「整个项目属于哪个版本」。设计见 docs/metalmaxcn_project.md#数据只有两层没有版本。
const OVERRIDE_DELETED = Object.freeze({
    __override__: "deleted",
});

function isOverrideDeleted(value) {
    return isPlainJsonObject(value) && value.__override__ === "deleted";
}

/**
 * 求「相对默认值的稀疏差异」。
 *
 * 对象逐键递归；数组一旦有差异就整体覆盖——本项目的数组是有稳定 ID 的记录表，
 * 逐元素合并只会制造歧义。默认值里有、编辑值里没有的键写成删除标记。
 */
export function diffJson(defaults, value) {
    if (!isPlainJsonObject(defaults) || !isPlainJsonObject(value)) {
        return canonicalJsonEqual(defaults, value) ? MISSING : cloneJson(value);
    }
    const overrides = {};
    for (const key of Object.keys(value)) {
        if (!hasOwn(defaults, key)) {
            overrides[key] = cloneJson(value[key]);
            continue;
        }
        const nested = diffJson(defaults[key], value[key]);
        if (nested !== MISSING) overrides[key] = nested;
    }
    for (const key of Object.keys(defaults)) {
        if (!hasOwn(value, key)) overrides[key] = cloneJson(OVERRIDE_DELETED);
    }
    return Object.keys(overrides).length ? overrides : MISSING;
}

/** 把稀疏覆盖铺到当前默认值上，得到页面看到的完整文档。 */
export function applyOverrides(defaults, overrides) {
    if (overrides === undefined || overrides === MISSING) return cloneJson(defaults);
    if (!isPlainJsonObject(overrides) || !isPlainJsonObject(defaults)) {
        return cloneJson(overrides);
    }
    const result = cloneJson(defaults);
    for (const [key, override] of Object.entries(overrides)) {
        if (!hasOwn(result, key)) continue;
        if (isOverrideDeleted(override)) {
            delete result[key];
            continue;
        }
        result[key] = applyOverrides(result[key], override);
    }
    return result;
}

/** 覆盖非空即为已修改；空覆盖与从未编辑过等价。 */
function hasOverrides(overrides) {
    return overrides !== undefined && overrides !== MISSING &&
        (!isPlainJsonObject(overrides) || Object.keys(overrides).length > 0);
}

export function isWorkingDirty(working) {
    if (!isPlainJsonObject(working) || !hasOwn(working, "overrides")) {
        throw new TypeError("working must carry an overrides tree");
    }
    return hasOverrides(working.overrides);
}

function collectionAtPath(root, path, label) {
    let node = root;
    for (const [index, segment] of path.entries()) {
        const valid = typeof segment === "string" && segment.length > 0 ||
            Number.isInteger(segment) && segment >= 0;
        if (!valid || node === null || typeof node !== "object" ||
            !Object.hasOwn(node, segment)) {
            throw new TypeError(
                `${label}/${index}: collection path does not exist`,
            );
        }
        node = node[segment];
    }
    if (!Array.isArray(node)) {
        throw new TypeError(`${label}: collection path must select an array`);
    }
    return node;
}

function collectionIdentityIndex(collection, identityKey, identityValue, label) {
    let match = -1;
    for (const [index, item] of collection.entries()) {
        if (!isPlainJsonObject(item) || !Object.hasOwn(item, identityKey)) {
            throw new TypeError(
                `${label}/${index}: item must contain identity key ${identityKey}`,
            );
        }
        if (!canonicalJsonEqual(item[identityKey], identityValue)) continue;
        if (match >= 0) {
            throw new TypeError(
                `${label}: duplicate identity ${canonicalJsonStringify(identityValue)}`,
            );
        }
        match = index;
    }
    return match;
}

/**
 * Restore one keyed array item from immutable working.base while preserving
 * every unrelated edit in working.value.
 *
 * A base-only item is reinserted, a value-only item is removed, and an item
 * present in both collections is replaced in place.  Identity lookup is used
 * instead of an array offset so a preceding insertion cannot reset the wrong
 * record.
 */

// Only called with validated JSON and an owned clone. Batch reset reuses that
// clone rather than validating, copying and comparing the entire asset per item.
function resetCollectionItemInPlace(base, next, {
    collectionPath, identityKey, identityValue,
}) {
    if (!Array.isArray(collectionPath) || !collectionPath.length) {
        throw new TypeError("collectionPath must be a non-empty array");
    }
    nonEmptyIdentityKey(identityKey);
    assertJsonValue(identityValue, "$.identityValue");

    const baseCollection = collectionAtPath(base, collectionPath, "$.base");
    const valueCollection = collectionAtPath(next, collectionPath, "$.value");
    const baseIndex = collectionIdentityIndex(
        baseCollection, identityKey, identityValue, "$.base.collection",
    );
    const valueIndex = collectionIdentityIndex(
        valueCollection, identityKey, identityValue, "$.value.collection",
    );
    if (baseIndex < 0 && valueIndex < 0) {
        throw new RangeError(
            `collection item ${canonicalJsonStringify(identityValue)} not found`,
        );
    }
    if (baseIndex < 0) {
        valueCollection.splice(valueIndex, 1);
    } else if (valueIndex < 0) {
        valueCollection.splice(
            Math.min(baseIndex, valueCollection.length),
            0,
            cloneJson(baseCollection[baseIndex]),
        );
    } else {
        valueCollection[valueIndex] = cloneJson(baseCollection[baseIndex]);
    }
    return baseIndex >= 0;
}

function nonEmptyIdentityKey(value) {
    if (typeof value !== "string" || !value.trim()) {
        throw new TypeError("identityKey must be a non-empty string");
    }
    return value;
}

function normalizedJsonPath(path, label = "path") {
    if (!Array.isArray(path) || !path.length) {
        throw new TypeError(`${label} must be a non-empty array`);
    }
    for (const [index, segment] of path.entries()) {
        if (!(typeof segment === "string" && segment.length > 0) &&
            !(Number.isInteger(segment) && segment >= 0)) {
            throw new TypeError(`${label}/${index}: invalid path segment`);
        }
    }
    return path;
}

function jsonPathState(root, path) {
    let node = root;
    for (const segment of path) {
        if (node === null || typeof node !== "object" ||
            !Object.hasOwn(node, segment)) {
            return {exists: false, value: MISSING};
        }
        node = node[segment];
    }
    return {exists: true, value: node};
}

function emptyPathContainer(template, nextSegment, label) {
    if (Array.isArray(template)) return [];
    if (isPlainJsonObject(template)) return {};
    if (template === MISSING) {
        return Number.isInteger(nextSegment) ? [] : {};
    }
    throw new TypeError(`${label}: path crosses a non-container value`);
}

function mutablePathParent(next, base, path, {create}) {
    let node = next;
    for (let index = 0; index < path.length - 1; index += 1) {
        const segment = path[index];
        const prefix = path.slice(0, index + 1);
        if (node === null || typeof node !== "object") {
            throw new TypeError(`$.value/${index}: path crosses a non-container value`);
        }
        if (Array.isArray(node) && !Number.isInteger(segment)) {
            throw new TypeError(`$.value/${index}: array path segment must be an index`);
        }
        if (!Object.hasOwn(node, segment) || node[segment] === null ||
            typeof node[segment] !== "object") {
            if (!create) return null;
            const template = jsonPathState(base, prefix).value;
            const container = emptyPathContainer(
                template,
                path[index + 1],
                `$.base/${index}`,
            );
            if (Array.isArray(node)) {
                if (segment > node.length) {
                    throw new TypeError("path would create a sparse JSON array");
                }
                if (segment === node.length) node.push(container);
                else node[segment] = container;
            } else {
                node[segment] = container;
            }
        }
        node = node[segment];
    }
    return node;
}

/** Restore one JSON property/array element from base; a base-missing key deletes. */

function resetPathInPlace(base, next, path) {
    normalizedJsonPath(path);
    const baseState = jsonPathState(base, path);
    const valueState = jsonPathState(next, path);
    if (!baseState.exists && !valueState.exists) {
        return false;
    }
    const parent = mutablePathParent(next, base, path, {
        create: baseState.exists,
    });
    if (!parent) return false;
    const key = path.at(-1);
    if (Array.isArray(parent) && !Number.isInteger(key)) {
        throw new TypeError("array path segment must be an index");
    }
    if (baseState.exists) {
        if (Array.isArray(parent) && Number.isInteger(key) && key > parent.length) {
            throw new TypeError("path would create a sparse JSON array");
        }
        if (Array.isArray(parent) && Number.isInteger(key) && key === parent.length) {
            parent.push(cloneJson(baseState.value));
        } else {
            parent[key] = cloneJson(baseState.value);
        }
    } else if (Array.isArray(parent) && Number.isInteger(key)) {
        if (key < parent.length) parent.splice(key, 1);
    } else {
        delete parent[key];
    }
    return baseState.exists;
}

// Both reference trees have already passed assertJsonValue. Visit every node
// of the result, including unrelated fields, once to validate, compare against
// both references, and encode its sparse override. Never short-circuit validation
// after finding a difference. Arrays remain whole-value overrides.
function inspectResetResult(value, base, previous, path = "$", ancestors = new Set()) {
    if (value === null || typeof value !== "object") {
        assertJsonNode(value, path, ancestors);
        return {copy: Object.is(value, -0) ? 0 : value,
            sameBase: value === base, samePrevious: value === previous,
            overrides: value === base ? MISSING : Object.is(value, -0) ? 0 : value};
    }
    if (ancestors.has(value)) throw new TypeError(`${path}: cyclic JSON value`);
    ancestors.add(value);
    const array = Array.isArray(value);
    if (!array && !isPlainJsonObject(value)) {
        throw new TypeError(`${path}: only plain JSON objects are allowed`);
    }
    if (!array && Object.getOwnPropertySymbols(value).length) {
        throw new TypeError(`${path}: symbol keys are not JSON-compatible`);
    }
    const baseMatches = array ? Array.isArray(base) : isPlainJsonObject(base);
    const previousMatches = array ? Array.isArray(previous) : isPlainJsonObject(previous);
    const copy = array ? [] : {};
    const overrides = {};
    const descriptors = array ? null : Object.getOwnPropertyDescriptors(value);
    const keys = array ? Array.from({length: value.length}, (_, i) => i) : Object.keys(descriptors);
    let sameBase = baseMatches && keys.length === (array ? base.length : Object.keys(base).length);
    let samePrevious = previousMatches && keys.length === (array ? previous.length : Object.keys(previous).length);
    for (const key of keys) {
        const nodePath = `${path}/${escapeJsonPointerToken(String(key))}`;
        if (!hasOwn(value, key)) throw new TypeError(`${nodePath}: sparse arrays cannot represent MISSING`);
        const descriptor = array ? null : descriptors[key];
        if (!array && (!descriptor.enumerable || !("value" in descriptor))) {
            throw new TypeError(`${nodePath}: JSON properties must be enumerable data properties`);
        }
        const child = inspectResetResult(value[key],
            baseMatches && hasOwn(base, key) ? base[key] : MISSING,
            previousMatches && hasOwn(previous, key) ? previous[key] : MISSING,
            nodePath, ancestors);
        if (key === "__proto__") Object.defineProperty(copy, key, {
            value: child.copy, enumerable: true, writable: true, configurable: true,
        });
        else copy[key] = child.copy;
        sameBase = sameBase && child.sameBase;
        samePrevious = samePrevious && child.samePrevious;
        if (!array && child.overrides !== MISSING) {
            if (key === "__proto__") Object.defineProperty(overrides, key, {
                value: child.overrides, enumerable: true, writable: true, configurable: true,
            });
            else overrides[key] = child.overrides;
        }
    }
    if (!array && baseMatches) {
        for (const key of Object.keys(base)) {
            if (!hasOwn(value, key)) Object.defineProperty(overrides, key, {
                value: { ...OVERRIDE_DELETED }, enumerable: true, writable: true, configurable: true,
            });
        }
    }
    ancestors.delete(value);
    return {copy, sameBase, samePrevious,
        overrides: sameBase ? MISSING : !array && baseMatches ? overrides : copy};
}

/** Apply path/item resets in order and publish one complete working.value. */
export function resetJsonSelections(base, value, selectors) {
    assertJsonValue(base, "$.base");
    assertJsonValue(value, "$.value");
    if (!Array.isArray(selectors) || !selectors.length) {
        throw new TypeError("selectors must be a non-empty array");
    }
    // The input was validated above; cloning need not validate it again.
    // Still validate the mutated result before comparing/publishing it.
    const next = cloneJsonNode(value);
    for (const [index, selector] of selectors.entries()) {
        if (!isPlainJsonObject(selector)) {
            throw new TypeError(`selectors/${index}: selector must be an object`);
        }
        if (selector.kind === "path") {
            resetPathInPlace(base, next, selector.path);
        } else if (selector.kind === "item") {
            resetCollectionItemInPlace(base, next, selector);
        } else {
            throw new TypeError(`selectors/${index}: unknown selector kind`);
        }
    }
    const result = inspectResetResult(next, base, value);
    return {value: next, changed: !result.samePrevious, overrides: result.overrides};
}

function jsonSelectionsDirtyUnchecked(base, value, selectors) {
    if (!Array.isArray(selectors) || !selectors.length) {
        throw new TypeError("selectors must be a non-empty array");
    }
    let dirty = false;
    for (const [index, selector] of selectors.entries()) {
        if (!isPlainJsonObject(selector)) {
            throw new TypeError(`selectors/${index}: selector must be an object`);
        }
        if (selector.kind === "path") {
            normalizedJsonPath(selector.path, `selectors/${index}.path`);
            const baseState = jsonPathState(base, selector.path);
            const valueState = jsonPathState(value, selector.path);
            dirty ||= baseState.exists !== valueState.exists ||
                baseState.exists &&
                !canonicalJsonEqual(baseState.value, valueState.value);
            continue;
        }
        if (selector.kind === "item") {
            if (!Array.isArray(selector.collectionPath) ||
                !selector.collectionPath.length) {
                throw new TypeError(
                    `selectors/${index}.collectionPath must be a non-empty array`,
                );
            }
            nonEmptyIdentityKey(selector.identityKey);
            assertJsonValue(
                selector.identityValue,
                `selectors/${index}.identityValue`,
            );
            const baseCollection = collectionAtPath(
                base, selector.collectionPath, "$.base",
            );
            const valueCollection = collectionAtPath(
                value, selector.collectionPath, "$.value",
            );
            const baseIndex = collectionIdentityIndex(
                baseCollection,
                selector.identityKey,
                selector.identityValue,
                "$.base.collection",
            );
            const valueIndex = collectionIdentityIndex(
                valueCollection,
                selector.identityKey,
                selector.identityValue,
                "$.value.collection",
            );
            if (baseIndex < 0 && valueIndex < 0) {
                throw new RangeError(
                    `collection item ${canonicalJsonStringify(
                        selector.identityValue,
                    )} not found`,
                );
            }
            dirty ||= baseIndex < 0 || valueIndex < 0 ||
                !canonicalJsonEqual(
                    baseCollection[baseIndex],
                    valueCollection[valueIndex],
                );
            continue;
        }
        throw new TypeError(`selectors/${index}: unknown selector kind`);
    }
    return dirty;
}


/** Evaluate many selector groups while validating the complete trees once. */
export function jsonSelectionStates(base, value, selectorGroups) {
    assertJsonValue(base, "$.base");
    assertJsonValue(value, "$.value");
    if (!Array.isArray(selectorGroups) || !selectorGroups.length) {
        throw new TypeError("selectorGroups must be a non-empty array");
    }
    return selectorGroups.map((selectors, index) => {
        try {
            return jsonSelectionsDirtyUnchecked(base, value, selectors);
        } catch (error) {
            error.message = `selectorGroups/${index}: ${error.message}`;
            throw error;
        }
    });
}


function isResourceTombstone(value) {
    return isPlainJsonObject(value) &&
        value.schema === RESOURCE_TOMBSTONE_SCHEMA;
}

function escapeJsonPointerToken(value) {
    return String(value).replaceAll("~", "~0").replaceAll("/", "~1");
}

function jsonPointer(path) {
    if (!Array.isArray(path)) throw new TypeError("path must be an array");
    if (!path.length) return "";
    return `/${path.map(escapeJsonPointerToken).join("/")}`;
}



/** 只把本次改动的 JSON 位置写入最新值；数组长度改变时整段替换。 */
export function applyJsonChanges(current, previous, next) {
    if (canonicalJsonEqual(previous, next)) return cloneJson(current);
    if (Array.isArray(previous) && Array.isArray(next) && Array.isArray(current)
        && previous.length === next.length && current.length === next.length) {
        return next.map((value, index) => applyJsonChanges(current[index], previous[index], value));
    }
    if (isPlainJsonObject(previous) && isPlainJsonObject(next) && isPlainJsonObject(current)) {
        const result = cloneJson(current);
        for (const key of new Set([...Object.keys(previous), ...Object.keys(next)])) {
            if (!Object.hasOwn(next, key)) delete result[key];
            else if (!Object.hasOwn(previous, key) || !Object.hasOwn(current, key)) {
                if (!Object.hasOwn(previous, key) || !canonicalJsonEqual(previous[key], next[key]))
                    Object.defineProperty(result, key, {value: cloneJson(next[key]), enumerable: true, writable: true, configurable: true});
            } else Object.defineProperty(result, key, {value: applyJsonChanges(current[key], previous[key], next[key]),
                enumerable: true, writable: true, configurable: true});
        }
        return result;
    }
    return cloneJson(next);
}

function cloneMergeValue(value) {
    return value === MISSING ? MISSING : cloneJson(value);
}

function allMergeObjects(base, value, incoming) {
    return base !== MISSING && value !== MISSING && incoming !== MISSING &&
        isPlainJsonObject(base) && isPlainJsonObject(value) &&
        isPlainJsonObject(incoming) &&
        !isResourceTombstone(base) && !isResourceTombstone(value) &&
        !isResourceTombstone(incoming);
}

function appendArrayHookConflicts(target, conflicts, path) {
    if (conflicts === undefined) return;
    if (!Array.isArray(conflicts)) {
        throw new TypeError("mergeArrays conflicts must be an array");
    }
    for (const conflict of conflicts) {
        assertJsonValue(conflict, "$.mergeArrays.conflicts[]");
        target.push({
            ...cloneJson(conflict),
            path: jsonPointer(path),
            reason: "array-merge",
        });
    }
}

export function assetModelIdentity(assetSchema, codec = null) {
    if (typeof assetSchema !== "string" || !assetSchema) {
        throw new TypeError("assetSchema must be a non-empty string");
    }
    if (codec !== null && (typeof codec !== "string" || !codec)) {
        throw new TypeError("codec must be null or a non-empty string");
    }
    return canonicalJsonStringify({asset_schema: assetSchema, codec});
}

/** A small directed migration graph for semantic asset schemas/codecs. */
export class AssetSchemaMigrationRegistry {
    constructor() {
        this.edges = new Map();
    }

    register({
        fromAssetSchema,
        fromCodec = null,
        toAssetSchema,
        toCodec = null,
        migrate,
    }) {
        if (typeof migrate !== "function") {
            throw new TypeError("migrate must be a function");
        }
        const from = assetModelIdentity(fromAssetSchema, fromCodec);
        const to = assetModelIdentity(toAssetSchema, toCodec);
        const edges = this.edges.get(from) || [];
        if (edges.some(edge => edge.to === to)) {
            throw new Error(`migration already registered: ${from} -> ${to}`);
        }
        edges.push({to, migrate});
        this.edges.set(from, edges);
        return this;
    }

    findPath(from, to) {
        if (from === to) return [];
        const queue = [{id: from, path: []}];
        const visited = new Set([from]);
        while (queue.length) {
            const current = queue.shift();
            for (const edge of this.edges.get(current.id) || []) {
                const path = [...current.path, edge];
                if (edge.to === to) return path;
                if (!visited.has(edge.to)) {
                    visited.add(edge.to);
                    queue.push({id: edge.to, path});
                }
            }
        }
        return null;
    }

    async migrate(value, {
        fromAssetSchema,
        fromCodec = null,
        toAssetSchema,
        toCodec = null,
        context = {},
    }) {
        const from = assetModelIdentity(fromAssetSchema, fromCodec);
        const to = assetModelIdentity(toAssetSchema, toCodec);
        const path = this.findPath(from, to);
        if (path === null) {
            throw new ProjectAssetMigrationMissingError(from, to);
        }
        let result = cloneJson(value);
        for (const edge of path) {
            result = await edge.migrate(cloneJson(result), {
                ...context,
                from_model: from,
                step_model: edge.to,
                to_model: to,
            });
            assertJsonValue(result, "$.migrated");
        }
        return cloneJson(result);
    }
}

export class ProjectAssetMigrationMissingError extends Error {
    constructor(from, to) {
        super(`no asset schema migration registered: ${from} -> ${to}`);
        this.name = "ProjectAssetMigrationMissingError";
        this.from = from;
        this.to = to;
    }
}

const BASE64_ALPHABET =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function bytesToBase64(input) {
    const bytes = input instanceof Uint8Array
        ? input
        : new Uint8Array(input.buffer || input, input.byteOffset || 0,
            input.byteLength === undefined ? undefined : input.byteLength);
    let result = "";
    for (let offset = 0; offset < bytes.length; offset += 3) {
        const a = bytes[offset];
        const hasB = offset + 1 < bytes.length;
        const hasC = offset + 2 < bytes.length;
        const b = hasB ? bytes[offset + 1] : 0;
        const c = hasC ? bytes[offset + 2] : 0;
        result += BASE64_ALPHABET[a >> 2];
        result += BASE64_ALPHABET[((a & 3) << 4) | (b >> 4)];
        result += hasB
            ? BASE64_ALPHABET[((b & 15) << 2) | (c >> 6)]
            : "=";
        result += hasC ? BASE64_ALPHABET[c & 63] : "=";
    }
    return result;
}

export function base64ToBytes(value) {
    if (typeof value !== "string" || value.length % 4 !== 0 ||
        !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
        throw new TypeError("invalid base64 data");
    }
    const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
    const bytes = new Uint8Array((value.length / 4) * 3 - padding);
    let output = 0;
    for (let offset = 0; offset < value.length; offset += 4) {
        const values = value.slice(offset, offset + 4).split("").map(character =>
            character === "=" ? 0 : BASE64_ALPHABET.indexOf(character));
        const word = (values[0] << 18) | (values[1] << 12) |
            (values[2] << 6) | values[3];
        if (output < bytes.length) bytes[output++] = (word >> 16) & 255;
        if (output < bytes.length) bytes[output++] = (word >> 8) & 255;
        if (output < bytes.length) bytes[output++] = word & 255;
    }
    return bytes;
}
