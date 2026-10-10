import { pageRuntimeModulePaths, PAGE_RUNTIME_PATHS } from './page-runtime-paths-BvtuMnH7.js';
import { validatedJsonEqual, discardPackagePrefetch, packagePrefetchVersion } from './visual-metasprites-IDA0o2Z8.js';
import { RESOURCE_DOMAINS_BY_VIEW, visitPagePackageInputs } from './page-package-inputs-Dzxj7YGf.js';
import './baseline-assembly-DW8BWbDB.js';

function __releaseImportPage(path) { switch (path) {
case PAGE_RUNTIME_PATHS["field-editor"]: return import('./field-object-editor-Blro4OF0.js').then(function (n) { return n.fieldObjectEditor; });
case PAGE_RUNTIME_PATHS["audio"]: return import('./audio-DDFK7wcW.js');
case PAGE_RUNTIME_PATHS["actors"]: return import('./actors-bind-Dz7Oe1bO.js').then(function (n) { return n.actors; });
case PAGE_RUNTIME_PATHS["battle"]: return import('./battle-BjJmxVSY.js');
case PAGE_RUNTIME_PATHS["monster-formations"]: return import('./monster-formations-5lr06780.js').then(function (n) { return n.monsterFormations; });
case PAGE_RUNTIME_PATHS["battle-actors"]: return import('./battle-actors-Ci6buYr0.js').then(function (n) { return n.battleActors; });
case PAGE_RUNTIME_PATHS["emulator"]: return import('./emulator-Bpa8EsFw.js').then(function (n) { return n.emulator; });
case PAGE_RUNTIME_PATHS["byte-map/sram"]: return import('./sram-WFVGNGUM.js');
case PAGE_RUNTIME_PATHS["save-page"]: return import('./save-page-HgtvdIDi.js');
case PAGE_RUNTIME_PATHS["build-log"]: return import('./build-log-BV4fPuTE.js');
case PAGE_RUNTIME_PATHS["data/characters"]: return import('./characters-9PuC5Hfq.js').then(function (n) { return n.characters; });
case PAGE_RUNTIME_PATHS["data/monsters"]: return import('./monsters-Ws_LrYb6.js').then(function (n) { return n.monsters; });
case PAGE_RUNTIME_PATHS["shops"]: return import('./shops-CokyNsz7.js');
case PAGE_RUNTIME_PATHS["interface-pages"]: return import('./interface-pages-Z6ds5_V3.js');
case PAGE_RUNTIME_PATHS["service-pages"]: return import('./service-pages-0AX3Py0f.js').then(function (n) { return n.servicePages; });
case PAGE_RUNTIME_PATHS["scenes/encounter"]: return import('./encounter-ybfuhcXm.js').then(function (n) { return n.encounter; });
case PAGE_RUNTIME_PATHS["data/pages"]: return import('./pages-CRKO8gFJ.js');
case PAGE_RUNTIME_PATHS["data/vehicles"]: return import('./vehicles-WSVbAWyX.js');
case PAGE_RUNTIME_PATHS["facilities"]: return import('./facilities-BQrPRJSh.js');
case PAGE_RUNTIME_PATHS["wanted"]: return import('./wanted-D4VfzJqD.js');
case PAGE_RUNTIME_PATHS["byte-map/prg"]: return import('./chr-Davc17Y-.js').then(function (n) { return n.prg; });
case PAGE_RUNTIME_PATHS["byte-map/chr"]: return import('./chr-Davc17Y-.js').then(function (n) { return n.chr; });
case PAGE_RUNTIME_PATHS["scenes/interact"]: return import('./interact-DW2fVNfy.js');
case PAGE_RUNTIME_PATHS["scenes/overview"]: return import('./overview-BWR5QCHz.js').then(function (n) { return n.overview; });
case PAGE_RUNTIME_PATHS["scenes/workbench"]: return import('./workbench-Csop3iHv.js').then(function (n) { return n.workbench; });
case PAGE_RUNTIME_PATHS["metatiles"]: return import('./metatiles-DLyAWu6R.js');
case PAGE_RUNTIME_PATHS["story/playback"]: return import('./playback-zqi4En9Q.js');
case PAGE_RUNTIME_PATHS["story/catalog"]: return import('./actors-bind-Dz7Oe1bO.js').then(function (n) { return n.catalog; });
case PAGE_RUNTIME_PATHS["boot-presentation"]: return import('./boot-presentation-CJMBXKPV.js');
case PAGE_RUNTIME_PATHS["text/charset"]: return import('./charset-j6-kYKbE.js').then(function (n) { return n.charset; });
case PAGE_RUNTIME_PATHS["text/catalog"]: return import('./charset-j6-kYKbE.js').then(function (n) { return n.catalog; });
case PAGE_RUNTIME_PATHS["actors-bind"]: return import('./actors-bind-Dz7Oe1bO.js').then(function (n) { return n.actorsBind; });
case PAGE_RUNTIME_PATHS["battle-bind"]: return import('./monster-formations-5lr06780.js').then(function (n) { return n.battleBind; });
case PAGE_RUNTIME_PATHS["data/items"]: return import('./items-BwRIA2t-.js').then(function (n) { return n.items; });
default: return Promise.reject(new TypeError("未登记的页面模块：" + path));
} }

const preloadedModules = new Set();
function preloadModule(path) {
  if (!path || preloadedModules.has(path)) return;
  preloadedModules.add(path);
  void __releaseImportPage(path).catch(() => {});
}

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
  await visitPagePackageInputs(manifest, view, parameters, read);
  await Promise.all(jobs.values());
}

async function prefetched(path, options) {
  const {db} = await import('./prg-loaders-DnCSmXk9.js').then(function (n) { return n.projectDb; });
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
