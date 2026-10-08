// @editor-module 从静态包打开项目、更新默认值，并在显式构建时准备二进制。
import {normalizeEditRoute, normalizeBuildRoute} from "./edit-policy.js";
import {hasFieldOwner, fieldOwner} from "./field-owners.js";
import {MONSTER_GRAPHIC_OWNER, projectMonsterGraphic, validateMonsterGraphic} from "./monster-graphic-owner.js";
import {monsterVisualRecipes} from "./monster-visual-recipes.js";
import {visualAssetComponents} from "./visual-compiler.js";
// Lightweight static-package sessions, JSON-only revision updates, and the
// explicit build hydration boundary. Ordinary navigation never enters the
// binary hydration path; all later writes/builds use IndexedDB and never post
// project data back to the server.

import {packageBuildBinary} from "./build-package-io.js";
import {packageJson} from "./package-io.js";
import {openActiveProjectStore} from "./project-session.js";
import {
    MONSTER_VISUAL_RESOURCE_ID, MONSTER_VISUAL_OWNER_IDS,
    projectMonsterVisual, monsterAggregateWrite,
} from "./monster-visual-owners.js";
import {sha256Hex} from "./rom-linker.js";
import {
    applyOverrides,
    canonicalJsonEqual,
    cloneJson,
    isPlainJsonObject,
} from "./project-store-values.js";
import {ProjectWorkingVersionError} from "./project-store.js";

const PACKAGE_MANIFEST_SCHEMA = "metalmaxcn.asset-package";
// 打包器（mm_preview.browser_bootstrap_digest）对显式构建准备的全部输入算出的摘要。
// 它只是构建物化的完成标记，轻量 session 不读取也不记录它。
export const BOOTSTRAP_DIGEST_KEY = "browser_bootstrap_digest";
// Immutable original JSON has its own revision identity. Build-only changes
// to baseline sections, target definitions or package locators must not force
// 一次合并，也不会锁住普通导航。
const ORIGINAL_REVISION_DIGEST_KEY = "browser_original_revision_digest";
const SHA256 = /^[0-9a-f]{64}$/;
const BOOTSTRAP_DIGEST = /^bootstrap-([0-9a-f]{64})$/;
const ORIGINAL_REVISION_DIGEST = /^original-([0-9a-f]{64})$/;
const verifiedBuildInputs = new WeakMap();

const nonempty = (value, name) => {
    if (typeof value !== "string" || !value.trim()) {
        throw new TypeError(`${name} must be a non-empty string`);
    }
    return value;
};

const strictObject = (value, fields, name, optionalFields = []) => {
    if (!isPlainJsonObject(value)) throw new TypeError(`${name} must be an object`);
    const actual = Object.keys(value);
    const missing = fields.filter(field => !Object.hasOwn(value, field));
    const unknown = actual.filter(field =>
        !fields.includes(field) && !optionalFields.includes(field));
    if (missing.length || unknown.length) {
        throw new TypeError(
            `${name}: missing=${missing.join(",")}; unknown=${unknown.join(",")}`,
        );
    }
    return value;
};

const packageBootstrapDigest = manifest => {
    const digest = nonempty(
        manifest?.[BOOTSTRAP_DIGEST_KEY],
        `manifest.${BOOTSTRAP_DIGEST_KEY}`,
    );
    if (!BOOTSTRAP_DIGEST.test(digest)) {
        throw new TypeError(
            `manifest.${BOOTSTRAP_DIGEST_KEY} must be bootstrap-<sha256>`,
        );
    }
    return digest;
};

const packageOriginalRevisionDigest = manifest => {
    const digest = nonempty(
        manifest?.[ORIGINAL_REVISION_DIGEST_KEY],
        `manifest.${ORIGINAL_REVISION_DIGEST_KEY}`,
    );
    if (!ORIGINAL_REVISION_DIGEST.test(digest)) {
        throw new TypeError(
            `manifest.${ORIGINAL_REVISION_DIGEST_KEY} must be original-<sha256>`,
        );
    }
    return digest;
};

const revisionIdForOriginalDigest = digest =>
    `browser-original-${ORIGINAL_REVISION_DIGEST.exec(digest)[1]}`;

const normalizeAssetDescriptor = (rawDescriptor, name) => {
    const descriptor = strictObject(rawDescriptor, [
        "resource_id", "logical_path", "asset_schema", "codec", "path",
    ], name, ["compiler_id", "sha256", "edit_route", "build_route"]);
    const resourceId = nonempty(descriptor.resource_id, `${name}.resource_id`);
    const logicalPath = nonempty(descriptor.logical_path, `${name}.logical_path`);
    if (logicalPath !== `assets/${resourceId}`) {
        throw new TypeError(
            `${name}.logical_path must be the stable assets/{resource_id} path`,
        );
    }
    const normalized = {
        resource_id: resourceId,
        logical_path: logicalPath,
        asset_schema: nonempty(descriptor.asset_schema, `${name}.asset_schema`),
        codec: nonempty(descriptor.codec, `${name}.codec`),
        path: nonempty(descriptor.path, `${name}.path`),
    };
    normalized.edit_route = normalizeEditRoute(descriptor.edit_route);
    if (descriptor.build_route !== undefined) {
        normalized.build_route = normalizeBuildRoute(descriptor.build_route);
    }
    if (descriptor.compiler_id !== undefined) {
        normalized.compiler_id = nonempty(
            descriptor.compiler_id,
            `${name}.compiler_id`,
        );
    }
    if (descriptor.sha256 !== undefined) {
        if (!SHA256.test(descriptor.sha256)) {
            throw new TypeError(`${name}.sha256 must be a lowercase SHA-256`);
        }
        normalized.sha256 = descriptor.sha256;
    }
    return normalized;
};

const packageAssetCatalog = (manifest, field = "browser_original_assets") => {
    const raw = manifest?.[field] || [];
    if (!Array.isArray(raw)) throw new TypeError(`manifest.${field} must be an array`);
    const catalog = raw.map((descriptor, index) => normalizeAssetDescriptor(
        descriptor,
        `${field}[${index}]`,
    ));
    const ids = new Set();
    for (const descriptor of catalog) {
        if (ids.has(descriptor.resource_id)) {
            throw new TypeError(`${field} contains duplicate ${descriptor.resource_id}`);
        }
        ids.add(descriptor.resource_id);
    }
    return catalog;
};

// An immutable revision records only semantic identity. `path`, descriptor
// hashes and compiler hints belong to one published package and may change
// without changing O/N. Keeping locators out makes one revision ID map to one
// revision record across mirrors and repackaging.
const revisionAssetCatalog = catalog => catalog.map(descriptor => ({
    resource_id: descriptor.resource_id,
    logical_path: descriptor.logical_path,
    asset_schema: descriptor.asset_schema,
    codec: descriptor.codec,
}));

const validateLoadedOriginal = (descriptor, value) => {
    if (!isPlainJsonObject(value) ||
        value.resource_id !== descriptor.resource_id) {
        throw new Error(
            `${descriptor.resource_id}: original JSON identity mismatch`,
        );
    }
    return {
        resource_id: descriptor.resource_id,
        asset_schema: descriptor.asset_schema,
        codec: descriptor.codec,
        value,
    };
};

async function mapConcurrent(items, concurrency, callback) {
    const result = new Array(items.length);
    let cursor = 0;
    const worker = async () => {
        while (cursor < items.length) {
            const index = cursor;
            cursor += 1;
            result[index] = await callback(items[index], index);
        }
    };
    await Promise.all(Array.from(
        {length: Math.min(concurrency, items.length)},
        worker,
    ));
    return result;
}

const bindingAssetDescriptors = async targets => {
    const {SCENE_COMPILER_ID, bindingAssetBlobId} = await import("./asset-compiler.js");
    const descriptors = [];
    for (const [targetProfileId, definition] of Object.entries(targets)) {
        for (const binding of definition.bindings?.bindings || []) {
            if (binding.compiler_id !== SCENE_COMPILER_ID) continue;
            if (!Array.isArray(binding.input?.external_assets)) {
                throw new Error(
                    `${binding.asset_id}: Scene external_assets 无效`,
                );
            }
            for (const external of binding.input.external_assets) {
                descriptors.push({
                    targetProfileId,
                    asset_id: external.asset_id,
                    path: external.path,
                    length: external.length,
                    original_sha256: external.original_sha256,
                    authorized: true,
                });
            }
        }
        for (const excluded of definition.bindings?.excluded_assets || []) {
            descriptors.push({
                targetProfileId,
                asset_id: excluded.asset_id,
                path: excluded.path,
                length: excluded.length,
                original_sha256: excluded.original_sha256,
                // 证据取自基线的这一段，不取 path 指向的文件——见 loadBindingAssets。
                file_offset: excluded.file_offset,
                authorized: false,
            });
        }
    }
    const unique = new Map();
    for (const descriptor of descriptors) {
        const {targetProfileId} = descriptor;
        const assetId = nonempty(descriptor.asset_id, "binding.asset_id");
        const path = nonempty(descriptor.path, "binding.input.path");
        const originalSha256 = nonempty(
            descriptor.original_sha256,
            "binding.input.original_sha256",
        );
        const length = Number(descriptor.length);
        if (!Number.isSafeInteger(length) || length <= 0) {
            throw new Error(`${assetId}: binding input length 无效`);
        }
        const blobId = bindingAssetBlobId(targetProfileId, assetId);
        const fileOffset = descriptor.authorized
            ? null : Number(descriptor.file_offset);
        const existing = unique.get(blobId);
        if (existing && (existing.path !== path ||
            existing.length !== length ||
            existing.file_offset !== fileOffset ||
            existing.authorized !== descriptor.authorized)) {
            throw new Error(`${assetId}: bindings 对同一资产给出了不同源文件`);
        }
        unique.set(blobId, {
            blob_id: blobId,
            target_profile_id: targetProfileId,
            asset_id: assetId,
            path,
            length,
            file_offset: fileOffset,
            original_sha256: originalSha256,
            authorized: descriptor.authorized,
        });
    }
    return [...unique.values()];
};

/** 从基线里裁出 excluded 资产声明的那一段。越界当场报错，不静默截短。 */
function baselineEvidence(baseline, descriptor) {
    if (!(baseline instanceof Uint8Array)) {
        throw new Error(`${descriptor.asset_id}: 校验 excluded 资产需要 ROM 基线`);
    }
    const start = Number(descriptor.file_offset);
    const end = start + Number(descriptor.length);
    if (!Number.isSafeInteger(start) || start < 0 || end > baseline.length) {
        throw new Error(`${descriptor.asset_id}: excluded asset 越出基线`);
    }
    return baseline.slice(start, end);
}

export function createStaticPackageBootstrapProvider({
    readJson = packageJson,
    readBinary = packageBuildBinary,
    onProgress = () => {},
} = {}) {
    return {
        async loadManifest() {
            const manifest = await readJson("manifest.json");
            return manifest;
        },

        async loadBaseline(manifest) {
            if (manifest.build_baseline) {
                const definition = manifest.build_baseline;
                const bytes = definition.assembly
                    ? await (await import("./baseline-assembly.js")).assembleBaseline(definition, readBinary, onProgress)
                    : await readBinary(nonempty(definition.path, "build_baseline.path"));
                if (bytes.length !== definition.file_bytes || await sha256Hex(bytes) !== definition.sha256) {
                    throw new Error("扩展构建基线长度或 SHA-256 不符");
                }
                return bytes;
            }
            const sections = [...(manifest.layout?.sections || [])].sort(
                (left, right) => Number(left.rom_file_range?.file_offset) -
                    Number(right.rom_file_range?.file_offset),
            );
            if (!sections.length || manifest.coverage?.canonical_layout !== "complete") {
                throw new Error("静态 package 不含完整、连续的 ROM 基线");
            }
            let expectedOffset = 0;
            for (const section of sections) {
                const offset = Number(section.rom_file_range?.file_offset);
                const length = Number(section.length);
                if (offset !== expectedOffset || !Number.isSafeInteger(length) || length <= 0) {
                    throw new Error(`基线 section ${section.id || section.path} 不连续`);
                }
                expectedOffset += length;
            }
            if (expectedOffset !== Number(manifest.rom?.file_bytes)) {
                throw new Error("基线 section 总长度与 manifest.rom.file_bytes 不一致");
            }
            let completed = 0;
            const chunks = await mapConcurrent(sections, 12, async section => {
                const bytes = await readBinary(nonempty(section.path, "section.path"));
                if (bytes.length !== Number(section.length)) {
                    throw new Error(`${section.path}: 基线长度不符`);
                }
                onProgress({message: `读取基线 ${section.id}`, progress_current: ++completed, progress_total: sections.length});
                return bytes;
            });
            const baseline = new Uint8Array(expectedOffset);
            for (let index = 0; index < chunks.length; index += 1) {
                baseline.set(chunks[index], Number(
                    sections[index].rom_file_range.file_offset,
                ));
            }
            return baseline;
        },

        async loadOriginalAsset(rawDescriptor) {
            const descriptor = normalizeAssetDescriptor(
                rawDescriptor,
                "browser_original_assets[]",
            );
            const value = await readJson(descriptor.path);
            return validateLoadedOriginal(descriptor, value);
        },

        async loadOriginalAssets(manifest) {
            const descriptors = packageAssetCatalog(manifest);
            let completed = 0;
            return mapConcurrent(
                descriptors,
                8,
                async descriptor => {
                    const asset = await this.loadOriginalAsset(descriptor);
                    onProgress({message: `读取默认值 ${descriptor.resource_id}`, progress_current: ++completed, progress_total: descriptors.length});
                    return asset;
                },
            );
        },

        async loadTargets(manifest) {
            const definitions = manifest.targets || {};
            const targets = {};
            for (const [targetId, definition] of Object.entries(definitions)) {
                onProgress({message: `读取目标 ${targetId} 的配置`});
                onProgress({message: `读取目标 ${targetId} 的映射`});
                onProgress({message: `读取目标 ${targetId} 的绑定`});
                const [profile, buildMap, bindings] = await Promise.all([
                    definition.profile || (definition.profile_path ? readJson(definition.profile_path) : null),
                    definition.build_map || (definition.build_map_path ? readJson(definition.build_map_path) : null),
                    definition.bindings || (definition.bindings_path ? readJson(definition.bindings_path) : null),
                ]);
                targets[targetId] = {
                    ...definition,
                    profile,
                    build_map: buildMap,
                    bindings,
                };
                delete targets[targetId].profile_path;
                delete targets[targetId].build_map_path;
                delete targets[targetId].bindings_path;
            }
            return targets;
        },

        /**
         * 取每份 binding 资产的字节。两类来源不能混：
         *
         * - authorized（Scene external_assets）：`path` 指向包内那份字节文件，
         *   length 说的就是它的长度，直接读。
         * - excluded：`length`/`original_sha256` 说的是**基线 ROM 在 file_offset
         *   处的那一段**，`path` 只是这段字节在包里的展示视图。编译类资产的视图
         *   是 JSON，跟字节段根本不是同一种东西——照 path 读进来再比长度，必然
         *   报「长度不符」。Python 侧 `_verify_excluded_assets` 早就改成读基线了
         *   （见它的 docstring），这里跟上。
         */
        async loadBindingAssets(targets, baseline = null) {
            const descriptors = await bindingAssetDescriptors(targets);
            let completed = 0;
            return mapConcurrent(descriptors, 8, async descriptor => {
                const data = descriptor.authorized
                    ? await readBinary(descriptor.path)
                    : baselineEvidence(baseline, descriptor);
                if (data.length !== descriptor.length) {
                    throw new Error(`${descriptor.path}: binding asset 长度不符`);
                }
                const currentSha256 = await sha256Hex(data);
                // excluded 资产的意义就是「这段字节没被动过」，所以在这里就要
                // 兑现，别把一份没验过的证据存进 blob 等编译期再说。
                if (!descriptor.authorized &&
                    currentSha256 !== descriptor.original_sha256) {
                    throw new Error(
                        `${descriptor.asset_id}: excluded asset 与基线不符`,
                    );
                }
                onProgress({message: `校验绑定 ${descriptor.asset_id}`, progress_current: ++completed, progress_total: descriptors.length});
                return {...descriptor, current_sha256: currentSha256, data};
            });
        },
    };
}

async function hasCompleteBuildMaterialization({
    repository,
    provider,
    packageManifest,
    existing,
    bootstrapDigest,
    originalDigest,
    revisionId,
    baselineBlobId,
    onProgress,
}) {
    if (existing?.[BOOTSTRAP_DIGEST_KEY] !== bootstrapDigest ||
        existing?.active_original_revision_id !== revisionId ||
        existing?.baseline_blob_id !== baselineBlobId ||
        typeof repository.getBlob !== "function") {
        return false;
    }
    const expectedDefaultTarget = packageManifest.default_target || null;
    if ((existing.default_target || null) !== expectedDefaultTarget) return false;

    const expectedTargets = provider.loadTargets
        ? await provider.loadTargets(packageManifest) : {};
    onProgress({message: "核对已存构建目标"});
    if (!canonicalJsonEqual(existing.targets || {}, expectedTargets)) return false;

    const baselineRecord = await repository.getBlob(baselineBlobId);
    if (!baselineRecord?.data ||
        baselineRecord.data.size !== Number((packageManifest.build_baseline || packageManifest.rom)?.file_bytes) ||
        baselineRecord.source_sha256 !== (packageManifest.build_baseline || packageManifest.rom)?.sha256) {
        return false;
    }

    const catalog = packageAssetCatalog(packageManifest);
    let completed = 0;
    const originals = await mapConcurrent(catalog, 16, async descriptor => {
        const original = await repository.getOriginal(descriptor.resource_id, {revisionId});
        onProgress({message: `读取已存默认值 ${descriptor.resource_id}`, progress_current: ++completed, progress_total: catalog.length});
        return original;
    });
    if (originals.some((record, index) => !record ||
        record.asset_schema !== catalog[index].asset_schema ||
        (record.codec ?? null) !== (catalog[index].codec ?? null))) {
        return false;
    }
    completed = 0;
    const published = await mapConcurrent(catalog, 16, async descriptor => {
        const asset = await provider.loadOriginalAsset(descriptor);
        onProgress({message: `读取发布默认值 ${descriptor.resource_id}`, progress_current: ++completed, progress_total: catalog.length});
        return asset;
    });
    for (let index = 0; index < published.length; index += 1) {
        onProgress({message: `核对默认值 ${catalog[index].resource_id}`, progress_current: index + 1, progress_total: catalog.length});
        if (!canonicalJsonEqual(originals[index].value, published[index].value)) return false;
    }

    const bindings = await bindingAssetDescriptors(expectedTargets);
    const bindingRecords = await mapConcurrent(bindings, 8, descriptor =>
        repository.getBlob(descriptor.blob_id));
    for (let index = 0; index < bindings.length; index += 1) {
        onProgress({message: `核对已存绑定 ${bindings[index].asset_id}`, progress_current: index + 1, progress_total: bindings.length});
        const descriptor = bindings[index];
        const record = bindingRecords[index];
        if (!record?.data || record.data.size !== descriptor.length ||
            record.target_profile_id !== descriptor.target_profile_id ||
            record.asset_id !== descriptor.asset_id ||
            record.original_sha256 !== descriptor.original_sha256 ||
            record.authorized !== descriptor.authorized ||
            !SHA256.test(record.current_sha256 || "")) {
            return false;
        }
    }
    return true;
}

const assertPackageManifest = manifest => {
    return manifest;
};

const packageRevision = async (provider, manifest, originalDigest, catalog) => ({
    revision_id: revisionIdForOriginalDigest(originalDigest),
    source_sha256: nonempty(
        manifest.rom?.sha256,
        "package manifest ROM SHA-256",
    ),
    source_schema: PACKAGE_MANIFEST_SCHEMA,
    package_original_revision_digest: originalDigest,
    asset_catalog: revisionAssetCatalog(catalog),
});

async function prunePackageOriginals(repository, manifest) {
    if (typeof repository.pruneOriginalRevisions !== "function") return manifest;
    const revisionId = manifest.active_original_revision_id;
    await repository.pruneOriginalRevisions({expectedRevisionId: revisionId});
    return {...manifest, original_revision_ids: [revisionId]};
}

function lazyPackageRepository(repository, provider, {
    packageManifest,
    revisionId,
    originalCatalog,
}) {
    const originals = new Map(originalCatalog.map(descriptor => [
        descriptor.resource_id,
        descriptor,
    ]));
    const inFlight = new Map();
    const checked = new Set();
    let revisionRead = null;
    const readActiveRevision = () => {
        if (!revisionRead) {
            const pending = repository.activeOriginalRevisionId();
            revisionRead = pending;
            const clear = () => {if (revisionRead === pending) revisionRead = null;};
            pending.then(clear, clear);
        }
        return revisionRead;
    };
    let refreshQueue = [];
    let refreshScheduled = false;
    const refreshOriginal = asset => {
        if (typeof repository.refreshPackageOriginals !== "function")
            return repository.refreshPackageOriginal(revisionId, asset);
        return new Promise((resolve, reject) => {
            refreshQueue.push({asset, resolve, reject});
            if (refreshScheduled) return;
            refreshScheduled = true;
            setTimeout(() => {
                const batch = refreshQueue;
                refreshQueue = [];
                refreshScheduled = false;
                Promise.resolve().then(() => repository.refreshPackageOriginals(
                    revisionId, batch.map(entry => entry.asset)))
                    .then(result => batch.forEach(entry => entry.resolve(result)),
                        error => batch.forEach(entry => entry.reject(error)));
            }, 0);
        });
    };

    const ensureOriginal = resourceId => {
        if (checked.has(resourceId)) return readActiveRevision().then(active => {
            if (active !== revisionId) throw new ProjectWorkingVersionError("默认来源已改变；请重新打开页面");
            return true;
        });
        if (inFlight.has(resourceId)) return inFlight.get(resourceId);
        const pending = (async () => {
            const descriptor = originals.get(resourceId);
            if (!descriptor) return null;
            if (typeof provider.loadOriginalAsset !== "function" ||
                typeof repository.refreshPackageOriginal !== "function") {
                throw new TypeError("lazy package repository requires published Original refresh");
            }
            const loaded = await provider.loadOriginalAsset(descriptor);
            const normalized = validateLoadedOriginal(descriptor, loaded?.value);
            if (loaded.resource_id !== normalized.resource_id ||
                loaded.asset_schema !== normalized.asset_schema ||
                loaded.codec !== normalized.codec) {
                throw new Error(`${resourceId}: package provider changed original metadata`);
            }
            await refreshOriginal(normalized);
            checked.add(resourceId);
            return true;
        })();
        const tracked = pending.finally(() => {
            if (inFlight.get(resourceId) === tracked) inFlight.delete(resourceId);
        });
        inFlight.set(resourceId, tracked);
        return tracked;
    };

    const resolveMonsterVisual = async (options, original = false) => {
        await ensureOriginal(MONSTER_VISUAL_RESOURCE_ID);
        const aggregate = original
            ? await repository.getOriginal(MONSTER_VISUAL_RESOURCE_ID, options)
            : await repository.resolve(MONSTER_VISUAL_RESOURCE_ID,
                {...options, materialize: false});
        // A fresh project has no owner override, so the published aggregate is
        // already the exact projection of the published owners. Keep a
        // cold monster list to its declared Original; once any owner has a
        // Working layer, load the owners and recompute the aggregate.
        const working = original || typeof repository.listWorking !== "function"
            ? [] : await repository.listWorking();
        const ownerWorking = new Set(working.map(record => record.resource_id));
        if (!original && typeof repository.listFieldWorkingResourceIds === "function") {
            for (const id of await repository.listFieldWorkingResourceIds()) ownerWorking.add(id);
        }
        if (!MONSTER_VISUAL_OWNER_IDS.some(id => ownerWorking.has(id))) {
            return {
                ...aggregate,
                ownerVersions: Object.fromEntries(
                    MONSTER_VISUAL_OWNER_IDS.map(id => [id, null])),
            };
        }
        const owners = await Promise.all(MONSTER_VISUAL_OWNER_IDS.map(async id => {
            await ensureOriginal(id);
            if (hasFieldOwner(id)) {
                const database = options?.fieldDb || (await import("./project-db.js")).db;
                return database.readResource(id);
            }
            return repository.resolve(id, {materialize: false});
        }));
        return projectMonsterVisual(aggregate, Object.fromEntries(
            MONSTER_VISUAL_OWNER_IDS.map((id, index) => [id, owners[index]])));
    };

    const ensureFieldOriginals = resourceId => Promise.all([
        ensureOriginal(resourceId),
        ...(hasFieldOwner(resourceId) ? fieldOwner(resourceId).dependencies || [] : []).map(ensureOriginal),
    ]);

    const overrides = {
        activeOriginalRevisionId: readActiveRevision,
        async resolve(resourceId, options) {
            if (resourceId === MONSTER_VISUAL_RESOURCE_ID) return resolveMonsterVisual(options);
            await ensureOriginal(resourceId);
            return repository.resolve(resourceId, options);
        },
        async getFieldState(resourceId, options) {
            await ensureFieldOriginals(resourceId);
            return repository.getFieldState(resourceId, options);
        },
        async writeFieldValue(resourceId, entityHandle, fieldName, value, options) {
            await ensureFieldOriginals(resourceId);
            return repository.writeFieldValue(resourceId, entityHandle, fieldName, value, options);
        },
        async writeFieldValues(resourceId, changes, options) {
            await ensureFieldOriginals(resourceId);
            return repository.writeFieldValues(resourceId, changes, options);
        },
        async discardFieldWorking(resourceId, options) {
            await ensureFieldOriginals(resourceId);
            return repository.discardFieldWorking(resourceId, options);
        },
        async getOriginal(resourceId, options) {
            if (resourceId === MONSTER_VISUAL_RESOURCE_ID) return resolveMonsterVisual(options, true);
            await ensureOriginal(resourceId);
            return repository.getOriginal(resourceId, {snapshot: true, ...options});
        },
        async materialize(resourceId) {
            await ensureOriginal(resourceId);
            return repository.materialize(resourceId);
        },
        async saveValue(resourceId, value, options) {
            if (resourceId === MONSTER_GRAPHIC_OWNER) {
                return (await overrides.saveValues([{resourceId, value,
                    previousValue: options?.previousValue}]))[0];
            }
            await ensureOriginal(resourceId);
            if (resourceId === MONSTER_VISUAL_RESOURCE_ID) {
                const raw = await repository.resolve(resourceId, {materialize: false});
                const current = await resolveMonsterVisual();
                value = monsterAggregateWrite(value, current, raw);
                const saved = await repository.saveValue(resourceId, value, options);
                return {...saved, ...await resolveMonsterVisual()};
            }
            return repository.saveValue(resourceId, value, options);
        },
        async saveValues(entries) {
            await Promise.all(entries.map(entry => ensureOriginal(entry.resourceId)));
            const prepared = entries.map(entry => ({...entry}));
            const graphic = prepared.find(entry => entry.resourceId === MONSTER_GRAPHIC_OWNER);
            const visual = prepared.find(entry => entry.resourceId === MONSTER_VISUAL_RESOURCE_ID);
            if (graphic || visual) {
                const current = await resolveMonsterVisual();
                if (graphic) {
                    const original = await repository.getOriginal(MONSTER_GRAPHIC_OWNER);
                    validateMonsterGraphic(graphic.value, original.value);
                    const projection = cloneJson(visual?.value || current.value);
                    projectMonsterGraphic(projection.document, graphic.value.document);
                    visualAssetComponents(projection, MONSTER_VISUAL_RESOURCE_ID);
                    monsterVisualRecipes(projection.document);
                }
                if (visual) {
                    const raw = await repository.resolve(MONSTER_VISUAL_RESOURCE_ID, {materialize: false});
                    visual.value = monsterAggregateWrite(visual.value, current, raw);
                }
            }
            const saved = await repository.saveValues(prepared);
            return Promise.all(saved.map((result, index) =>
                entries[index].resourceId === MONSTER_VISUAL_RESOURCE_ID
                    ? resolveMonsterVisual().then(projected => ({...result, ...projected})) : result));
        },
        async resetSelections(resourceId, selectors, options) {
            await ensureOriginal(resourceId);
            return repository.resetSelections(resourceId, selectors, options);
        },
        async resetItem(resourceId, selector, options) {
            await ensureOriginal(resourceId);
            return repository.resetItem(resourceId, selector, options);
        },
        async resetPaths(resourceId, paths, options) {
            await ensureOriginal(resourceId);
            return repository.resetPaths(resourceId, paths, options);
        },
        async selectionStates(resourceId, groups) {
            await ensureOriginal(resourceId);
            return repository.selectionStates(resourceId, groups);
        },
        async selectionsDirty(resourceId, selectors) {
            await ensureOriginal(resourceId);
            return repository.selectionsDirty(resourceId, selectors);
        },
    };
    const bound = new Map();
    return new Proxy(repository, {
        get(target, property) {
            if (Object.hasOwn(overrides, property)) return overrides[property];
            const value = Reflect.get(target, property, target);
            if (typeof value !== "function") return value;
            if (!bound.has(property)) bound.set(property, value.bind(target));
            return bound.get(property);
        },
    });
}

/**
 * Open only the package catalogue.  Asset JSON is pulled into the immutable
 * revision by the returned repository when that exact resource is resolved.
 */
export async function openProjectSessionFromPackage(
    repository,
    provider,
    packageManifest,
) {
    if (!repository || typeof repository.getManifest !== "function" ||
        typeof repository.addOriginalRevision !== "function" ||
        typeof repository.saveManifest !== "function") {
        throw new TypeError("repository must implement the project-store API");
    }
    assertPackageManifest(packageManifest);
    const digest = packageOriginalRevisionDigest(packageManifest);
    const catalog = packageAssetCatalog(packageManifest);
    const existing = await repository.getManifest();
    const revision = await packageRevision(provider, packageManifest, digest, catalog);
    // 包里的 original 就是当前默认值。它和上次打开时不同没有任何后果：已保存的
    // 覆盖照旧铺在新默认值上，因此这里既不比较摘要，也不封页。
    let manifest = existing;
    if (!manifest) {
        const installed = await repository.addOriginalRevision(
            revision,
            [],
            {activate: true},
        );
        manifest = await repository.saveManifest({
            ...installed.manifest,
            source_package_schema: PACKAGE_MANIFEST_SCHEMA,
            source_package_sha256: revision.source_sha256,
        }, {
            expectedActiveRevisionId: revision.revision_id,
        });
    } else if (manifest.active_original_revision_id !== revision.revision_id) {
        await repository.addOriginalRevision(revision, [], {activate: false});
        manifest = await repository.activateOriginalRevisionWithState(
            revision.revision_id,
            {
                expectedRevisionId: manifest.active_original_revision_id,
                manifestPatch: {
                    source_package_schema: PACKAGE_MANIFEST_SCHEMA,
                    source_package_sha256: revision.source_sha256,
                        },
            },
        ).then(result => result.manifest);
    }

    const activeRevisionId = manifest.active_original_revision_id;
    manifest = await prunePackageOriginals(repository, manifest);
    const facade = lazyPackageRepository(repository, provider, {
        packageManifest,
        revisionId: activeRevisionId,
        originalCatalog: catalog,
    });
    return {
        status: "ready",
        repository: facade,
        manifest,
        revision_id: activeRevisionId,
        package_digest: digest,
    };
}

/**
 * Rebase O -> N using JSON assets only.
 *
 * This is intentionally separate from bootstrapProjectFromPackage(): project
 * update/conflict resolution must not pull the ROM baseline, target documents,
 * binding binaries, or any other build-only input.  The incoming revision can
 * remain sparse; a later lightweight session fills untouched resources on
 * demand through their stable resource_id/path catalogue entries.
 */
async function updateProjectOriginalsFromPackage(
    repository,
    provider,
    packageManifest,
) {
    if (!repository || typeof repository.getManifest !== "function" ||
        typeof repository.addOriginalRevision !== "function" ||
        typeof repository.materializeOriginalAssets !== "function" ||
        typeof repository.listWorking !== "function" ||
        typeof repository.activateOriginalRevisionWithState !== "function") {
        throw new TypeError("repository must implement JSON-only package import");
    }
    if (!provider || typeof provider.loadOriginalAsset !== "function") {
        throw new TypeError("package provider cannot load individual originals");
    }
    assertPackageManifest(packageManifest);
    const digest = packageOriginalRevisionDigest(packageManifest);
    const catalog = packageAssetCatalog(packageManifest);
    const revision = await packageRevision(provider, packageManifest, digest, catalog);
    const existing = await repository.getManifest();
    if (!existing?.active_original_revision_id) {
        throw new Error("JSON-only package update requires an active project revision");
    }
    if (existing.active_original_revision_id === revision.revision_id) {
        return {
            status: "already-current",
            repository,
            manifest: await prunePackageOriginals(repository, existing),
            revision_id: revision.revision_id,
            original_assets: 0,
            working_assets: 0,
        };
    }

    // addOriginalRevision accepts an already materialized sparse shell only
    // when its immutable revision metadata/catalogue is byte-for-byte equal.
    await repository.addOriginalRevision(revision, [], {activate: false});
    const descriptorsById = new Map(catalog.map(descriptor => [
        descriptor.resource_id,
        descriptor,
    ]));
    const currentWorking = (await repository.listWorking()).filter(
        record => record.original_source !== "runtime");
    const requiredIds = new Set(
        currentWorking.map(record => record.resource_id),
    );
    for (const resourceId of requiredIds) {
        if (!descriptorsById.has(resourceId)) {
            throw new Error(
                `${resourceId}: incoming package broke the stable resource_id contract`,
            );
        }
    }

    let fetchedOriginals = 0;
    const originals = await mapConcurrent(
        [...requiredIds].map(resourceId => descriptorsById.get(resourceId)),
        8,
        async descriptor => {
            const installed = await repository.getOriginal(
                descriptor.resource_id,
                {revisionId: revision.revision_id},
            );
            if (installed) return installed;
            const loaded = await provider.loadOriginalAsset(descriptor);
            fetchedOriginals += 1;
            const normalized = validateLoadedOriginal(descriptor, loaded?.value);
            if (loaded.resource_id !== normalized.resource_id ||
                loaded.asset_schema !== normalized.asset_schema ||
                loaded.codec !== normalized.codec) {
                throw new Error(
                    `${descriptor.resource_id}: package provider changed original metadata`,
                );
            }
            return normalized;
        },
    );
    await repository.materializeOriginalAssets(revision.revision_id, originals);
    const originalById = new Map(originals.map(original => [
        original.resource_id,
        original,
    ]));

    const transitionOptions = {
        expectedRevisionId: existing.active_original_revision_id,
        manifestPatch: {
            source_package_schema: PACKAGE_MANIFEST_SCHEMA,
            source_package_sha256: revision.source_sha256,
            [ORIGINAL_REVISION_DIGEST_KEY]: digest,
            // JSON-only update invalidates build inputs from O.  Only an
            // explicit build may repopulate these fields for N.
            [BOOTSTRAP_DIGEST_KEY]: null,
            baseline_blob_id: null,
            default_target: null,
            targets: {},
        },
        blobs: [],
    };
    // 新的 original 只是替换默认值：已保存的覆盖照旧铺在它上面，没有需要合并、
    // 确认或迁移的东西，因此这里不再有 rebase / conflicted 两条分支。
    const activated = await repository.activateOriginalRevision(
        revision.revision_id,
    );
    const manifest = await prunePackageOriginals(repository, activated);
    return {
        status: "updated",
        repository,
        manifest,
        revision_id: revision.revision_id,
        original_assets: fetchedOriginals,
    };
}

/** JSON-only active-project update; safe for conflict resolution UI. */

/** 把静态包导入浏览器 DB：只替换默认值那一层。 */
async function bootstrapProjectFromPackage(repository, provider, onProgress = () => {}, verify = true) {
    if (!repository || typeof repository.getManifest !== "function") {
        throw new TypeError("repository must implement the project-store API");
    }
    if (!provider || typeof provider.loadManifest !== "function" ||
        typeof provider.loadBaseline !== "function") {
        throw new TypeError("package bootstrap provider is incomplete");
    }

    onProgress({message: "读取项目清单"});
    const packageManifest = assertPackageManifest(await provider.loadManifest());
    const sourceSha256 = nonempty(
        packageManifest.rom?.sha256,
        "package manifest ROM SHA-256",
    );
    onProgress({message: "读取已存项目清单"});
    const stored = await repository.getManifest();
    const existing = stored ? await prunePackageOriginals(repository, stored) : null;
    const before = await repository.getBuildInputStamp?.();
    const inputs = manifest => {
        const copy = {...manifest};
        delete copy.latest_package_build_id;
        return copy;
    };
    const receipt = verifiedBuildInputs.get(repository);
    // 字段与存档 Working 由构建读取与校验，不使已核对的 Origin、基线和绑定失效。
    const materializationStamp = before?.materializationStamp || before?.stamp;
    if (!verify && materializationStamp && receipt?.stamp === materializationStamp &&
        canonicalJsonEqual(receipt.packageManifest, packageManifest) &&
        canonicalJsonEqual(receipt.manifest, inputs(existing))) {
        onProgress({message: "复用已完成核对"});
        return {status: "already-imported", repository, manifest: existing,
            original_assets: 0, binding_assets: 0, verification: "reused"};
    }
    verifiedBuildInputs.delete(repository);
    onProgress({message: verify ? "完整核对构建输入" : "构建输入变化或尚未核对，重新核对"});
    const remember = async manifest => {
        const after = await repository.getBuildInputStamp?.();
        // 核对期间有其它连接写入时，不保留本次核对结果。
        if (before && after && after.count - before.count ===
            after.localWrites - before.localWrites) {
            verifiedBuildInputs.set(repository, {stamp: after.materializationStamp || after.stamp,
                packageManifest: cloneJson(packageManifest), manifest: inputs(manifest)});
        }
    };
    const baselineSha256 = (packageManifest.build_baseline || packageManifest.rom).sha256;
    const baselineBlobId = `rom-baseline:${baselineSha256}`;
    // 只有显式构建才走到这里。摘要覆盖了下面要读的每一个字节（基线分片、
    // original/working 资产、target 定义）；摘要与完整构建标记同时匹配时，重复
    // 构建准备会得到逐字节相同的结果，因此可以跳过再次校验和物化。
    const bootstrapDigest = packageBootstrapDigest(packageManifest);
    const originalDigest = packageOriginalRevisionDigest(packageManifest);
    const digestRevisionId = revisionIdForOriginalDigest(originalDigest);
    if (await hasCompleteBuildMaterialization({
        repository,
        provider,
        packageManifest,
        existing,
        bootstrapDigest,
        originalDigest,
        revisionId: digestRevisionId,
        baselineBlobId,
        onProgress,
    })) {
        await remember(existing);
        return {
            status: "already-imported",
            repository,
            manifest: existing,
            baseline_blob_id: existing.baseline_blob_id || baselineBlobId,
            original_assets: 0,
            binding_assets: 0,
            working_assets: 0,
            verification: "checked",
        };
    }
    const [baseline, originalAssets, targets] =
      await Promise.all([
        provider.loadBaseline(packageManifest),
        provider.loadOriginalAssets?.(packageManifest) || [],
        provider.loadTargets?.(packageManifest) || {},
      ]);
    const bindingAssets = await (
        provider.loadBindingAssets?.(targets, baseline) || []);
    const assets = [...originalAssets];
    const revisionId = digestRevisionId;
    const originalById = new Map(assets.map(asset => [asset.resource_id, asset]));
    const revision = {
        revision_id: revisionId,
        source_sha256: sourceSha256,
        source_schema: PACKAGE_MANIFEST_SCHEMA,
        package_original_revision_digest: originalDigest,
        asset_catalog: revisionAssetCatalog(packageAssetCatalog(packageManifest)),
    };
    if (existing?.original_revision_ids?.includes(revisionId)) {
        if (typeof repository.refreshPackageOriginal !== "function") {
            throw new TypeError("repository must refresh published originals");
        }
        if (typeof repository.refreshPackageOriginals === "function") {
            await repository.refreshPackageOriginals(revisionId, assets, {requireActive: false, onProgress});
        } else {
            for (const [index, asset] of assets.entries()) {
                onProgress({message: `写入默认值 ${asset.resource_id}`, progress_current: index + 1, progress_total: assets.length});
                await repository.refreshPackageOriginal(revisionId, asset, {requireActive: false});
            }
        }
    } else {
        await repository.addOriginalRevision(revision, assets, {activate: false});
    }
    if (typeof repository.activateOriginalRevisionWithState !== "function") {
        throw new TypeError("repository must implement atomic revision activation");
    }
    const defaultTarget = packageManifest.default_target || null;
    const transitionOptions = {
          expectedRevisionId: existing?.active_original_revision_id ?? null,
          manifestPatch: {
            source_package_schema: packageManifest.schema || null,
            source_package_sha256: sourceSha256,
                [ORIGINAL_REVISION_DIGEST_KEY]: originalDigest,
            // 下次刷新靠它判断「这个包已经导过了」。
            [BOOTSTRAP_DIGEST_KEY]: bootstrapDigest,
            baseline_blob_id: baselineBlobId,
            default_target: defaultTarget,
            targets,
          },
          blobs: [{
            blob_id: baselineBlobId,
            data: new Blob([baseline], {type: "application/x-nes-rom"}),
            metadata: {
              kind: "rom-baseline",
              source_sha256: baselineSha256,
            },
          }, ...bindingAssets.map(bindingAsset => ({
            blob_id: bindingAsset.blob_id,
            data: bindingAsset.data,
            metadata: {
              kind: "binding-asset",
              target_profile_id: bindingAsset.target_profile_id,
              asset_id: bindingAsset.asset_id,
              path: bindingAsset.path,
              original_sha256: bindingAsset.original_sha256,
              current_sha256: bindingAsset.current_sha256,
              authorized: bindingAsset.authorized,
              media_type: "application/octet-stream",
            },
          }))],
    };
    onProgress({message: "写入基线与构建绑定"});
    let transition;
    try {
        transition = await repository.activateOriginalRevisionWithState(
            revisionId,
            transitionOptions,
        );
    } catch (error) {
        // Two tabs can read the same active revision before either acquires
        // the writer lock. The queued build must still commit *its own* build
        // digest, targets and blobs: the original revision ID alone no longer
        // identifies those inputs. Retry against the now-active revision
        // instead of misreporting an incomplete/different build as converged.
        if (!(error instanceof ProjectWorkingVersionError)) throw error;
        const converged = await repository.getManifest();
        if (converged?.active_original_revision_id !== revisionId) throw error;
        transition = await repository.activateOriginalRevisionWithState(
            revisionId,
            {...transitionOptions, expectedRevisionId: revisionId},
        );
    }
    const nextManifest = await prunePackageOriginals(repository, transition.manifest);
    if (!nextManifest || nextManifest.active_original_revision_id !== revisionId) {
        throw new Error("package import did not atomically activate its revision");
    }
    await remember(nextManifest);
    return {
        status: existing ? "reimported" : "bootstrapped",
        repository,
        manifest: nextManifest,
        baseline_blob_id: baselineBlobId,
        original_assets: assets.length,
        binding_assets: bindingAssets.length,
        verification: "checked",
    };
}

export async function bootstrapActiveProjectFromPackage({
    onProgress = () => {},
    provider = createStaticPackageBootstrapProvider({onProgress}),
    verify = true,
} = {}) {
    const repository = await openActiveProjectStore();
    return bootstrapProjectFromPackage(
        repository,
        provider,
        onProgress,
        verify,
    );
}
