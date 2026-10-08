// @editor-module 校验编辑路由、可变性与可信度，并提供旧编辑策略迁移。
// Editing destination, mutability and semantic confidence are independent.
import {canonicalJsonEqual, cloneJson} from "./project-store-values.js";

export function normalizeEditRoute(value = {kind: "self"}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("edit_route must be an object");
  }
  const expected = value.kind === "owner" ? ["kind", "owner_ref"] : ["kind"];
  if (!["self", "owner", "unknown"].includes(value.kind) ||
      Object.keys(value).sort().join() !== expected.sort().join()) {
    throw new TypeError("edit_route must use a declared resource/record identity");
  }
  if (value.kind !== "owner") return {kind: value.kind};
  const ref = value.owner_ref;
  // Known projection, but the publisher has not identified its editing owner.
  if (ref === null) return {kind: "owner", owner_ref: null};
  if (!ref || typeof ref !== "object" || Array.isArray(ref) ||
      typeof ref.resource_id !== "string" || !ref.resource_id ||
      Object.keys(ref).some(key => !["resource_id", "record_id"].includes(key)) ||
      (ref.record_id !== undefined && typeof ref.record_id !== "string" &&
        !Number.isSafeInteger(ref.record_id))) {
    throw new TypeError("edit_route.owner_ref must identify one resource and optional record");
  }
  return {kind: "owner", owner_ref: {...ref}};
}

// A build projection does not change the owner that receives Working edits.
// It names a directly bound compiler input; it cannot declare physical writes.
export function normalizeBuildRoute(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)
      || Object.keys(value).sort().join() !== "compiler_id,kind,resource_id"
      || value.kind !== "projection"
      || typeof value.resource_id !== "string" || !value.resource_id
      || typeof value.compiler_id !== "string" || !value.compiler_id) {
    throw new TypeError("build_route must name a published projection resource and compiler");
  }
  return {kind: "projection", resource_id: value.resource_id, compiler_id: value.compiler_id};
}

export function editPolicy(value) {
  const policy = value?.edit_policy ?? "mutable";
  if (!["mutable", "immutable"].includes(policy)) {
    throw new TypeError("edit_policy must be mutable or immutable");
  }
  return policy;
}

export function editAccess({route = {kind: "self"}, policy = "mutable",
  writeback = {target: "rom", state: "unknown", missing: ["binding"]},
  semanticStatus = "confirmed", editable = true} = {}) {
  const normalizedRoute = normalizeEditRoute(route);
  editPolicy({edit_policy: policy});
  const unresolvedOwner = normalizedRoute.kind === "unknown"
    || (normalizedRoute.kind === "owner" && normalizedRoute.owner_ref === null);
  const readOnly = policy === "immutable" || unresolvedOwner;
  const reason = policy === "immutable" ? "按定义不可变"
    : unresolvedOwner ? "编辑所属资源尚未登记"
    : normalizedRoute.kind === "owner" ? "在所属资源中编辑" : "";
  return Object.freeze({readOnly, reason, route: normalizedRoute, policy,
    semanticStatus, writeback,
    writebackMissing: !readOnly && writeback.target === "rom" && writeback.state !== "bound"});
}

// A source-document editor must not remove the policy or alter an immutable record.
export function assertEditPoliciesPreserved(before, after, path = "document") {
  if (!before || typeof before !== "object") return;
  if (before.edit_policy !== after?.edit_policy ||
      (editPolicy(before) === "immutable" && !canonicalJsonEqual(before, after))) {
    throw new TypeError(`${path}: edit_policy or immutable content changed`);
  }
  for (const [key, child] of Object.entries(before)) {
    assertEditPoliciesPreserved(child, after?.[key], `${path}.${key}`);
  }
}

// One-way upgrade of the former whole-record-array Working shape. Policy is
// copied from current Original only after the old immutable record proves
// byte-for-byte (and metadata-for-metadata) identical after removing its flag.
export function migrateLegacyOpaqueEditPolicies(original, value) {
  const originals = original?.document?.records;
  if (!Array.isArray(originals) || !originals.some(
    row => row?.edit_policy === "immutable" && row.opaque_blob)) return null;
  const records = value?.document?.records;
  if (!Array.isArray(records) || records.length !== originals.length) {
    throw new TypeError("edit_policy migration: fixed record identities changed");
  }
  if (records.every(row => row.edit_policy !== undefined)) {
    assertEditPoliciesPreserved(original, value);
    return null;
  }
  if (records.some(row => row.edit_policy !== undefined)) {
    throw new TypeError("edit_policy migration: mixed old and new policies");
  }
  const next = cloneJson(value);
  for (const [index, source] of originals.entries()) {
    const record = next.document.records[index];
    if (record?.id !== source.id || record?.handle !== source.handle) {
      throw new TypeError("edit_policy migration: fixed record identities changed");
    }
    record.edit_policy = editPolicy(source);
    if (record.edit_policy === "immutable") {
      if (record.opaque_blob?.immutable !== true) {
        throw new TypeError("edit_policy migration: legacy immutable flag is missing");
      }
      delete record.opaque_blob.immutable;
    }
  }
  assertEditPoliciesPreserved(original, next);
  return next;
}
