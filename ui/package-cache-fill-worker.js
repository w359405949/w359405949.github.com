import { EDITOR_PAGES } from '../js/story-event-links-CRjG_25M.js';
import { createModuleCatalog, PAGE_MODULES, moduleResourceDescriptors } from '../js/page-modules-C3rwAFeP.js';
import { visitPagePackageInputs } from '../js/page-package-inputs-DcoC8ZQj.js';
import { PACKAGE_SCHEMA_PATHS, fieldSourceFileName, BYTE_MAP_INDEX_PATH } from '../js/package-schema-paths-gCIepLXx.js';
import { packageCacheFileDigests, cachePackageFile, readPackageCacheFillJson } from '../js/visual-metasprites-DJP54-bV.js';

// @editor-module 从导航页面输入填充持久缓存，正文处理在工作线程中执行。

async function yieldBackground(signal) {
  signal?.throwIfAborted();
  if (globalThis.scheduler?.postTask) {
    await globalThis.scheduler.postTask(() => {}, {priority: "background", signal});
  } else await new Promise(resolve => setTimeout(resolve, 0));
  signal?.throwIfAborted();
}

async function navigationPackageInputs(manifest, {signal, readJson = readPackageCacheFillJson} = {}) {
  const paths = new Set([manifest.web_project_path]);
  const metadata = new Map();
  const inspect = async path => {
    paths.add(path);
    if (!metadata.has(path)) {
      await yieldBackground(signal);
      metadata.set(path, await readJson(path, {signal, manifest}));
    }
    return metadata.get(path);
  };
  const read = path => {
    paths.add(path);
    const pending = path === manifest.web_project_path || path === BYTE_MAP_INDEX_PATH
      || path === "analysis/byte-map/resource-byte-ranges.json" || path.startsWith("web-project/index/")
      || path.startsWith("analysis/byte-map/banks/") ? inspect(path) : Promise.resolve(null);
    pending.catch(() => {});
    return pending;
  };
  for (const page of EDITOR_PAGES) {
    const parameters = new URLSearchParams(Object.entries(page.route).map(([key, value]) => [
      key === "interfacePage" ? "interface" : key, String(value),
    ]));
    await visitPagePackageInputs(manifest, page.route.view, parameters, read);
    await yieldBackground(signal);
  }
  const byPath = new Map((manifest.browser_original_assets || []).map(row => [row.path, row]));
  const graph = await inspect("metadata/module-graph.json");
  const catalog = createModuleCatalog(graph);
  const pageIds = new Set(EDITOR_PAGES.map(page => page.id));
  const modules = new Set(EDITOR_PAGES.flatMap(page => PAGE_MODULES[page.id] || []));
  const entities = await inspect("metadata/entities.json");
  for (const entity of Object.values(entities.entity_classes || {})) {
    for (const facet of Object.values(entity.facets || {})) {
      if (!pageIds.has(facet.page || entity.primary_page) || facet.runtime?.provider) continue;
      modules.add(facet.runtime?.resource_id || facet.field_object);
      for (const source of facet.runtime?.also || []) modules.add(source.resource_id);
    }
  }
  for (const id of modules) {
    await yieldBackground(signal);
    for (const target of Object.keys(graph.modules?.[id]?.references || {})) modules.add(target);
    for (const descriptor of moduleResourceDescriptors(id, manifest, catalog)) paths.add(descriptor.path);
  }
  for (const [path, document] of metadata) {
    if (!path.startsWith("web-project/index/")) continue;
    for (const row of document || []) {
      if (byPath.has(row.source_path)) paths.add(row.source_path);
    }
  }
  const addReferences = (path, value) => {
    if (typeof value === "string" && value.endsWith(".json")) {
      const relative = decodeURIComponent(new URL(value, new URL(path, "https://package.invalid/")).pathname.slice(1));
      for (const candidate of [value, relative]) if (manifest.package_file_sha256?.[candidate]) paths.add(candidate);
    } else if (value && typeof value === "object") {
      for (const child of Object.values(value)) addReferences(path, child);
    }
  };
  for (const path of [...paths].filter(path => path.endsWith("/index.json") || path.startsWith("web-project/index/"))) {
    addReferences(path, await inspect(path));
  }
  for (const definition of Object.values(manifest.targets || {})) {
    for (const key of ["profile_path", "build_map_path", "bindings_path"]) if (definition[key]) paths.add(definition[key]);
  }
  const physicalViews = new Set(EDITOR_PAGES.map(page => page.route.view));
  if (["bytemap-prg", "bytemap-chr", "save"].some(view => physicalViews.has(view))) {
    const index = await inspect(BYTE_MAP_INDEX_PATH);
    for (const [space, views] of [["prg", ["bytemap-prg"]], ["chr", ["bytemap-chr"]], ["sram", ["save"]]]) {
      if (!views.some(view => physicalViews.has(view))) continue;
      for (const descriptor of index.bank_shards?.[space] || []) {
        const bank = await inspect(descriptor.path);
        for (const page of bank.record_pages || []) paths.add(page.path);
      }
    }
  }
  const prepared = manifest.browser_prepared_inputs || {};
  for (const path of Object.keys(manifest.package_file_sha256 || {})) {
    if (prepared.field_sources?.path && path.startsWith(`${prepared.field_sources.path}/`)
        || modules.has("code-module") && path.startsWith("web-project/code-fields/")) paths.add(path);
  }
  if (physicalViews.has("characters")) paths.add("analysis/byte-map/resource-byte-ranges/native-save.json");
  if (physicalViews.has("characters")) paths.add("game/data/characters.json");
  if (physicalViews.has("vehicles")) paths.add("game/data/vehicles.json");
  if (physicalViews.has("audio")) paths.add("web-project/index/audio-instructions.json");
  if (modules.has("boot-presentation")) paths.add("game/boot/presentation/index.json");
  if (physicalViews.has("text")) for (const schema of ["project.text-catalog", "project.text-providers"]) {
    for (const path of PACKAGE_SCHEMA_PATHS[schema]) paths.add(path);
  }
  for (const path of Object.values(prepared).filter(value => typeof value === "string")) paths.add(path);
  for (const path of Object.values(prepared.interface_pages || {})) paths.add(path);
  for (const [path, descriptor] of byPath) {
    if (!paths.has(path)) continue;
    const id = descriptor.resource_id;
    const source = prepared.field_sources?.path && `${prepared.field_sources.path}/${fieldSourceFileName(id)}`;
    if (source && manifest.package_file_sha256?.[source]) paths.add(source);
    if (prepared.field_descriptions?.[id]) paths.add(prepared.field_descriptions[id]);
  }
  return [...paths].filter(path => path !== "manifest.json").sort();
}

async function fillNavigationPackageCache(manifest, {signal, onProgress = () => {}} = {}) {
  const cached = await packageCacheFileDigests();
  onProgress({phase: "planning", total: 0, completed: 0, filled: 0, skipped: 0});
  const paths = await navigationPackageInputs(manifest, {signal});
  const planned = await packageCacheFileDigests();
  const progress = {phase: "filling", total: paths.length, completed: 0, filled: 0, skipped: 0};
  onProgress({...progress});
  for (const path of paths) {
    await yieldBackground(signal);
    const digest = manifest.package_file_sha256?.[path];
    if (!digest) throw new Error(`${path}: 运行包缺少文件摘要；请重新生成发布数据`);
    if (planned.get(path) === digest) {
      if (cached.get(path) === digest) progress.skipped += 1;
      else progress.filled += 1;
    }
    else {
      await cachePackageFile(path, {signal, manifest});
      progress.filled += 1;
    }
    progress.completed += 1;
    onProgress({...progress});
  }
  return {...progress, phase: "complete"};
}

// @editor-module 在工作线程中填充缓存并传回进度。

let controller;
self.onmessage = async event => {
  if (event.data.type === "cancel") {controller?.abort(); return;}
  if (event.data.type !== "fill" || controller) return;
  controller = new globalThis.AbortController();
  try {
    const result = await fillNavigationPackageCache(event.data.manifest, {
      signal: controller.signal,
      onProgress: progress => self.postMessage({type: "progress", progress}),
    });
    self.postMessage({type: "complete", progress: result});
  } catch (error) {
    self.postMessage({type: controller.signal.aborted ? "cancelled" : "error", message: error.message});
  } finally {
    controller = null;
  }
};
