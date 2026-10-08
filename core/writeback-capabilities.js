// @editor-module 加载 target 定义并只读检查各资源的写回能力。
// Read-only capability inspection follows the same target hydration as a build.
import {BOOTSTRAP_DIGEST_KEY, createStaticPackageBootstrapProvider} from "./project-bootstrap.js";
import {db} from "./project-db.js";
import {normalizeEditRoute, normalizeBuildRoute} from "./edit-policy.js";
import {hasFieldOwner, fieldOwner} from "./field-owners.js";

// Only package documents are cached, never Working values or inspection results.
// A new repository facade or package manifest starts a new session. Include the
// build identity and target declarations to also detect updates within a session.
const sessionTargets = new WeakMap();

async function loadSessionTargets(repository, packageManifest, manifest) {
  const session = repository || packageManifest;
  const identity = JSON.stringify([
    manifest[BOOTSTRAP_DIGEST_KEY], manifest.default_target, manifest.targets,
  ]);
  let cached = sessionTargets.get(session);
  if (!cached || cached.packageManifest !== packageManifest || cached.identity !== identity) {
    cached = {packageManifest, identity,
      pending: createStaticPackageBootstrapProvider({
        readJson: path => db.getPackageDocument(path),
      }).loadTargets(manifest)};
    sessionTargets.set(session, cached);
  }
  try {
    return await cached.pending;
  } catch (error) {
    // A failed fetch must remain retryable; don't evict a newer concurrent load.
    if (sessionTargets.get(session) === cached) sessionTargets.delete(session);
    throw error;
  }
}

export async function loadWritebackCapabilities(repository, packageManifest) {
  try {
    const project = await repository?.getManifest?.();
    // Persisted build targets may predate the package opened by this session.
    // Reuse them only for that same build, or for a standalone imported project.
    const manifest = project?.default_target && (!packageManifest?.default_target ||
      (project[BOOTSTRAP_DIGEST_KEY] &&
        project[BOOTSTRAP_DIGEST_KEY] === packageManifest[BOOTSTRAP_DIGEST_KEY]))
      ? project : packageManifest;
    const targetId = manifest?.default_target;
    if (!targetId) throw new Error("当前项目没有构建目标");
    const targets = await loadSessionTargets(repository, packageManifest, manifest);
    const definition = targets[targetId];
    if (!definition) throw new Error(`缺少目标 ${targetId}`);
    const {inspectAssetWriteback} = await import("./asset-compiler.js");
    const byResource = inspectAssetWriteback({targetProfileId: targetId,
      target: definition.profile, buildMap: definition.build_map, bindings: definition.bindings});
    return {targetId, byResource, error: ""};
  } catch (error) {
    // Keep drafts usable, but show the actual target error and never claim bound.
    return {targetId: null, byResource: new Map(), error: String(error?.message || error)};
  }
}

export function resourceWriteback(descriptor, manifest, capabilities) {
  const seen = new Set();
  let current = descriptor;
  while (current) {
    if (seen.has(current.resource_id)) throw new Error("edit_route contains a cycle");
    seen.add(current.resource_id);
    const route = normalizeEditRoute(current.edit_route);
    if (route.kind === "unknown") {
      return {target: "rom", state: "unknown", missing: ["owner-route"]};
    }
    if (route.kind === "self") {
      if (hasFieldOwner(current.resource_id) && fieldOwner(current.resource_id).writeback?.state === "unpermitted")
        return fieldOwner(current.resource_id).writeback;
      if (capabilities.error) return {target: "rom", state: "unknown",
        missing: ["constraints"], error: capabilities.error};
      if (current.build_route !== undefined) {
        const build = normalizeBuildRoute(current.build_route);
        const input = manifest?.browser_original_assets?.find(item => item.resource_id === build.resource_id);
        const capability = capabilities.byResource.get(build.resource_id);
        if (build.resource_id === current.resource_id || !input || input.build_route !== undefined
            || capabilities.byResource.has(current.resource_id)) {
          return {target: "rom", state: "missing", missing: ["build-route"]};
        }
        if (!capability) return {target: "rom", state: "missing", missing: ["binding"]};
        if (capability.compiler_id !== build.compiler_id) {
          return {target: "rom", state: "missing", missing: ["compiler"]};
        }
        return {...capability, via: build.resource_id};
      }
      return capabilities.byResource.get(current.resource_id)
        || {target: "rom", state: "missing", missing: ["binding"]};
    }
    if (route.owner_ref === null) {
      return {target: "rom", state: "unknown", missing: ["owner-ref"]};
    }
    current = manifest?.browser_original_assets?.find(
      item => item.resource_id === route.owner_ref.resource_id);
  }
  return {target: "rom", state: "unknown", missing: ["owner-route"]};
}
