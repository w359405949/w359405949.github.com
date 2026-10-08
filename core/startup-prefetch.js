// @editor-module 将页面的只读输入请求与入口模块装载并行。
import {prefetchPackageJson, packagePrefetchVersion, discardPackagePrefetch} from "./package-io.js";
import {validatedJsonEqual} from "./project-store-values.js";
import {PACKAGE_SCHEMA_PATHS, packageSchemaPaths, repositoryResourceId} from "./package-schema-paths.js";
import {SECTIONS_BY_VIEW, DATA_ASSETS_BY_VIEW, RESOURCE_DOMAINS_BY_VIEW, RESOURCE_RANGE_DOMAINS_BY_VIEW}
  from "./view-data-dependencies.js";
import {BYTE_MAP_INDEX_PATH} from "./physical-field-object-sources.js";
import {pageRuntimeModulePaths} from "./page-runtime-paths.js";
import {STORY_PAGE_VIEW_IDS} from './story-view-config.js';

const preloadedModules = new Set();
function preloadModule(path) {
  if (!path || preloadedModules.has(path)) return;
  preloadedModules.add(path);
  void import(path).catch(() => {});
}

const COMMON_ORIGINAL_INPUTS = ["text.character-map", "text-record", "shared-chr-bank", "char"];

export async function prefetchViewInputs(view, parameters = new URLSearchParams()) {
  if (view === 'save' && (parameters.get('saveSection') || 'location') === 'location') return;
  const declaredDomains = RESOURCE_DOMAINS_BY_VIEW[view];
  if (!declaredDomains) return;
  for (const path of pageRuntimeModulePaths(view)) preloadModule(path);
  if (!declaredDomains.length) return;
  const manifestPromise = prefetchedManifest;
  const version = packagePrefetchVersion();
  const manifest = await manifestPromise;
  const jobs = new Map();
  const read = (path, options) => {
    if (manifestPromise !== prefetchedManifest || version !== packagePrefetchVersion()) {
      throw new Error("预取会话已改变");
    }
    if (!jobs.has(path)) jobs.set(path, prefetched(path, options));
    return jobs.get(path);
  };
  const original = id => {
    const row = manifest.browser_original_assets?.find(row => row.resource_id === id);
    if (row) read(row.path);
    const prepared = manifest.browser_prepared_inputs?.field_descriptions?.[id];
    if (prepared && !['char', 'text-record'].includes(id)) read(prepared);
  };
  const interfaceInputPath = view === 'interfaceui'
    && manifest.browser_prepared_inputs?.interface_pages?.[parameters.get('interface')];
  const storyInputPath = STORY_PAGE_VIEW_IDS.includes(view) && !['ending', 'story-page', 'story-sequence'].includes(view)
    && manifest.browser_prepared_inputs?.story_ui;
  if (interfaceInputPath) read(interfaceInputPath);
  if (storyInputPath) {
    read(storyInputPath);
    read(manifest.browser_prepared_inputs.audio_labels);
  }
  for (const schema of [...SECTIONS_BY_VIEW[view], "project.text-references", "project.text-fonts"]) {
    if (interfaceInputPath && schema.startsWith('project.ui')) continue;
    if (storyInputPath && ['project.ui', 'project.facilities'].includes(schema)) continue;
    for (const path of schema === 'project.text-references'
      ? [manifest.browser_prepared_inputs?.text_references || PACKAGE_SCHEMA_PATHS['project.text-catalog'][0]]
      : packageSchemaPaths(schema, manifest)) read(path);
  }
  for (const schema of DATA_ASSETS_BY_VIEW[view] || []) original(repositoryResourceId(schema));
  for (const id of COMMON_ORIGINAL_INPUTS) original(id);
  for (const definition of Object.values(manifest.browser_prepared_inputs?.field_sources ? {} : manifest.targets || {})) {
    for (const key of ["profile_path", "build_map_path", "bindings_path"]) {
      if (definition[key]) read(definition[key]);
    }
  }
  if (["scenes", "shops", "jukebox", "vending"].includes(view)) original("facility-config");
  if (["scenes", "save", "shops"].includes(view)) original("scene-actor");
  if (["scenes", "save"].includes(view)) {
    for (const schema of ["project.story", "project.facilities", "project.scenes.logic"]) {
      for (const path of PACKAGE_SCHEMA_PATHS[schema]) read(path);
    }
    for (const id of ["encounter-event-flag-map", "field-scene-lifecycle-service", "scene-encounter-zone", "field-exploration-runtime"]) original(id);
  }
  const extra = [];
  if (view === "scenes" && parameters.get("sceneTab") === "investigation") {
    extra.push((async () => {
      const scenes = await read(PACKAGE_SCHEMA_PATHS["project.scenes"][0]);
      for (const scene of scenes.editable_scenes || []) read(`game/scenes/${scene.logic}`, {background: true});
    })());
  }
  if (view === "save") {
    for (const id of ["vehicle-preset", "item-entry", "shared-indexed-byte-overlays", "character-initial-record", "fixed-text-slot"]) original(id);
    extra.push((async () => {
      const map = await read(BYTE_MAP_INDEX_PATH);
      await Promise.all((map.bank_shards?.sram || []).map(async descriptor => {
        const bank = await read(descriptor.path);
        for (const page of bank.record_pages || []) read(page.path, {background: true});
      }));
    })());
  }
  for (const pending of extra) pending.catch(() => {});
  const domains = [...new Set([...declaredDomains, "text"])];
  const ranges = read("analysis/byte-map/resource-byte-ranges.json").then(manifest =>
    Promise.all((RESOURCE_RANGE_DOMAINS_BY_VIEW[view] || domains).flatMap(domain => manifest.shards?.[domain]
      ? [read(manifest.shards[domain].path)] : [])));
  ranges.catch(() => {});
  const core = await read(manifest.web_project_path);
  const indexes = await Promise.all(domains.map(domain => read(`web-project/index/${domain}.json`)));
  const direct = new Set(indexes.flatMap(index => (index || []).flatMap(row =>
    (row.references || []).map(edge => core.resource_index?.uid_domains?.[String(edge.target).split(":", 1)[0]])
      .filter(Boolean))));
  if (!interfaceInputPath) for (const domain of direct) if (!domains.includes(domain)) read(`web-project/index/${domain}.json`);
  await ranges;
  await Promise.all(extra);
  await Promise.all(jobs.values());
}

function prefetched(path, options) {return prefetchPackageJson(path, options);}
const parameters = new URLSearchParams(location.search);
const view = parameters.get("view") || "home";
let manifestValue;
const initialManifest = prefetched("manifest.json");
let prefetchedManifest = initialManifest;
initialManifest.then(value => {
  if (prefetchedManifest === initialManifest) manifestValue = value;
}, () => {});

export function activatePackagePrefetchManifest(manifest) {
  if (!manifestValue || !validatedJsonEqual(manifestValue, manifest)) {
    if (manifestValue) discardPackagePrefetch();
    prefetchedManifest = Promise.resolve(manifest);
  }
  manifestValue = manifest;
}
void prefetchViewInputs(view, parameters).catch(() => {});
