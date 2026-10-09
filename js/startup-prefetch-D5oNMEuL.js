import { RESOURCE_DOMAINS_BY_VIEW, pageRuntimeModulePaths, SECTIONS_BY_VIEW, DATA_ASSETS_BY_VIEW, RESOURCE_RANGE_DOMAINS_BY_VIEW, PAGE_RUNTIME_PATHS } from './page-runtime-paths-_6fUGFtn.js';
import { packagePrefetchVersion, validatedJsonEqual, discardPackagePrefetch } from './project-store-values-klefznSR.js';
import { STORY_PAGE_VIEW_IDS, PACKAGE_SCHEMA_PATHS, packageSchemaPaths, BYTE_MAP_INDEX_PATH, repositoryResourceId } from './baseline-assembly-C0KRII8X.js';

function __releaseImportPage(path) { switch (path) {
case PAGE_RUNTIME_PATHS["field-editor"]: return import('./rectangle-preset-controls-MtKWNScU.js').then(function (n) { return n.fieldObjectEditor; });
case PAGE_RUNTIME_PATHS["audio"]: return import('./audio-BLS2u4Yn.js');
case PAGE_RUNTIME_PATHS["actors"]: return import('./actors-bind-DV2HGSY5.js').then(function (n) { return n.actors; });
case PAGE_RUNTIME_PATHS["battle"]: return import('./battle-BewawxnM.js');
case PAGE_RUNTIME_PATHS["monster-formations"]: return import('./monster-formations-CNxDXbnT.js').then(function (n) { return n.monsterFormations; });
case PAGE_RUNTIME_PATHS["battle-actors"]: return import('./battle-actors-XIvkcBal.js').then(function (n) { return n.battleActors; });
case PAGE_RUNTIME_PATHS["emulator"]: return import('./emulator-Bl-sLXnd.js').then(function (n) { return n.emulator; });
case PAGE_RUNTIME_PATHS["byte-map/sram"]: return import('./build-log-5Ih3_o65.js').then(function (n) { return n.sram; });
case PAGE_RUNTIME_PATHS["save-page"]: return import('./save-page-DLUdJuCs.js');
case PAGE_RUNTIME_PATHS["build-log"]: return import('./build-log-5Ih3_o65.js').then(function (n) { return n.buildLog; });
case PAGE_RUNTIME_PATHS["data/characters"]: return import('./characters-B0f3SPfL.js').then(function (n) { return n.characters; });
case PAGE_RUNTIME_PATHS["data/monsters"]: return import('./monsters-DSVVpGWY.js').then(function (n) { return n.monsters; });
case PAGE_RUNTIME_PATHS["shops"]: return import('./shops-BkPXrHg7.js');
case PAGE_RUNTIME_PATHS["interface-pages"]: return import('./interface-pages-3qYQMYuX.js').then(function (n) { return n.interfacePages; });
case PAGE_RUNTIME_PATHS["service-pages"]: return import('./service-pages-Cn-rFxTV.js').then(function (n) { return n.servicePages; });
case PAGE_RUNTIME_PATHS["scenes/encounter"]: return import('./preview-sound-DHDXA99x.js').then(function (n) { return n.encounter; });
case PAGE_RUNTIME_PATHS["data/pages"]: return import('./pages-aQKVa7xt.js');
case PAGE_RUNTIME_PATHS["data/vehicles"]: return import('./vehicles-BrhQ6qbn.js');
case PAGE_RUNTIME_PATHS["facilities"]: return import('./facilities-C5eTNxT8.js');
case PAGE_RUNTIME_PATHS["investigation"]: return import('./preview-sound-DHDXA99x.js').then(function (n) { return n.investigation; });
case PAGE_RUNTIME_PATHS["npcs"]: return import('./npcs-Dhp3qBbI.js').then(function (n) { return n.npcs; });
case PAGE_RUNTIME_PATHS["wanted"]: return import('./wanted-C5dzzQfy.js');
case PAGE_RUNTIME_PATHS["byte-map/prg"]: return import('./preview-sound-DHDXA99x.js').then(function (n) { return n.prg; });
case PAGE_RUNTIME_PATHS["byte-map/chr"]: return import('./preview-sound-DHDXA99x.js').then(function (n) { return n.chr; });
case PAGE_RUNTIME_PATHS["scenes/interact"]: return import('./interact-B2QFN6Fd.js');
case PAGE_RUNTIME_PATHS["scenes/overview"]: return import('./preview-sound-DHDXA99x.js').then(function (n) { return n.overview; });
case PAGE_RUNTIME_PATHS["scenes/workbench"]: return import('./workbench-KKLw2uwg.js').then(function (n) { return n.workbench; });
case PAGE_RUNTIME_PATHS["metatiles"]: return import('./metatiles-qXzb88a8.js');
case PAGE_RUNTIME_PATHS["story/playback"]: return import('./playback-C_LAHnEc.js');
case PAGE_RUNTIME_PATHS["story/catalog"]: return import('./actors-bind-DV2HGSY5.js').then(function (n) { return n.catalog; });
case PAGE_RUNTIME_PATHS["boot-presentation"]: return import('./boot-presentation-CWp_Q7-i.js');
case PAGE_RUNTIME_PATHS["text/charset"]: return import('./charset-BJ0aS3Xk.js').then(function (n) { return n.charset; });
case PAGE_RUNTIME_PATHS["text/catalog"]: return import('./charset-BJ0aS3Xk.js').then(function (n) { return n.catalog; });
case PAGE_RUNTIME_PATHS["actors-bind"]: return import('./actors-bind-DV2HGSY5.js').then(function (n) { return n.actorsBind; });
case PAGE_RUNTIME_PATHS["battle-bind"]: return import('./monster-formations-CNxDXbnT.js').then(function (n) { return n.battleBind; });
case PAGE_RUNTIME_PATHS["data/items"]: return import('./items-DjQtJutT.js');
default: return Promise.reject(new TypeError("未登记的页面模块：" + path));
} }

const preloadedModules = new Set();
function preloadModule(path) {
  if (!path || preloadedModules.has(path)) return;
  preloadedModules.add(path);
  void __releaseImportPage(path).catch(() => {});
}

const COMMON_ORIGINAL_INPUTS = ["text.character-map", "text-record", "shared-chr-bank", "char"];

async function prefetchViewInputs(view, parameters = new URLSearchParams()) {
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

async function prefetched(path, options) {
  const {db} = await import('./scene-actors-Cftr7mCE.js').then(function (n) { return n.projectDb; });
  return db.prefetchPackageDocument(path, options);
}
const parameters = new URLSearchParams(location.search);
const view = parameters.get("view") || "home";
let manifestValue;
const initialManifest = prefetched("manifest.json");
let prefetchedManifest = initialManifest;
initialManifest.then(value => {
  if (prefetchedManifest === initialManifest) manifestValue = value;
}, () => {});

function activatePackagePrefetchManifest(manifest) {
  if (!manifestValue || !validatedJsonEqual(manifestValue, manifest)) {
    if (manifestValue) discardPackagePrefetch();
    prefetchedManifest = Promise.resolve(manifest);
  }
  manifestValue = manifest;
}
void prefetchViewInputs(view, parameters).catch(() => {});

export { activatePackagePrefetchManifest, prefetchViewInputs };
