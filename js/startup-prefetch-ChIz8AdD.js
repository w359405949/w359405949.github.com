import { pageRuntimeModulePaths, PAGE_RUNTIME_PATHS } from './page-runtime-paths-C0wxpxf1.js';
import { validatedJsonEqual, discardPackagePrefetch, packagePrefetchVersion } from './visual-metasprites-DJP54-bV.js';
import { RESOURCE_DOMAINS_BY_VIEW, visitPagePackageInputs } from './page-package-inputs-DcoC8ZQj.js';
import './package-schema-paths-gCIepLXx.js';

function __releaseImportPage(path) { switch (path) {
case PAGE_RUNTIME_PATHS["field-editor"]: return import('./rectangle-preset-controls-vTa_haKM.js').then(function (n) { return n.fieldObjectEditor; });
case PAGE_RUNTIME_PATHS["audio"]: return import('./audio-B6bfDIB5.js');
case PAGE_RUNTIME_PATHS["actors"]: return import('./actors-bind-CmT481e8.js').then(function (n) { return n.actors; });
case PAGE_RUNTIME_PATHS["battle"]: return import('./battle-7-3MjX6d.js');
case PAGE_RUNTIME_PATHS["monster-formations"]: return import('./monster-formations-B0YFAUG8.js').then(function (n) { return n.monsterFormations; });
case PAGE_RUNTIME_PATHS["battle-actors"]: return import('./battle-actors-B548R92n.js').then(function (n) { return n.battleActors; });
case PAGE_RUNTIME_PATHS["emulator"]: return import('./emulator-DynsZsth.js').then(function (n) { return n.emulator; });
case PAGE_RUNTIME_PATHS["byte-map/sram"]: return import('./sram-CuBZYYNn.js');
case PAGE_RUNTIME_PATHS["save-page"]: return import('./save-page-BfLjTliy.js');
case PAGE_RUNTIME_PATHS["build-log"]: return import('./build-log-R3qUY7Fk.js');
case PAGE_RUNTIME_PATHS["data/characters"]: return import('./characters-BFq1hik2.js').then(function (n) { return n.characters; });
case PAGE_RUNTIME_PATHS["data/monsters"]: return import('./monsters-BPjlt1RQ.js').then(function (n) { return n.monsters; });
case PAGE_RUNTIME_PATHS["shops"]: return import('./shops-DzcKMGb8.js');
case PAGE_RUNTIME_PATHS["interface-pages"]: return import('./interface-pages-Cnmx21yc.js').then(function (n) { return n.interfacePages; });
case PAGE_RUNTIME_PATHS["service-pages"]: return import('./service-pages-CZwQ_DjO.js').then(function (n) { return n.servicePages; });
case PAGE_RUNTIME_PATHS["scenes/encounter"]: return import('./encounter-DuEBgoNG.js').then(function (n) { return n.encounter; });
case PAGE_RUNTIME_PATHS["data/pages"]: return import('./pages-19fig6Hr.js');
case PAGE_RUNTIME_PATHS["data/vehicles"]: return import('./vehicles-C1pv7I-R.js');
case PAGE_RUNTIME_PATHS["facilities"]: return import('./facilities-CegcvGqa.js');
case PAGE_RUNTIME_PATHS["wanted"]: return import('./wanted-CAQMAd-N.js');
case PAGE_RUNTIME_PATHS["byte-map/prg"]: return import('./chr-CWVtqLX5.js').then(function (n) { return n.prg; });
case PAGE_RUNTIME_PATHS["byte-map/chr"]: return import('./chr-CWVtqLX5.js').then(function (n) { return n.chr; });
case PAGE_RUNTIME_PATHS["scenes/interact"]: return import('./interact-DlE0rspZ.js');
case PAGE_RUNTIME_PATHS["scenes/overview"]: return import('./overview-CxFLx7O1.js').then(function (n) { return n.overview; });
case PAGE_RUNTIME_PATHS["scenes/workbench"]: return import('./workbench-qxwbKQTO.js').then(function (n) { return n.workbench; });
case PAGE_RUNTIME_PATHS["metatiles"]: return import('./metatiles-11kbwanN.js');
case PAGE_RUNTIME_PATHS["story/playback"]: return import('./playback-BV1fhruN.js');
case PAGE_RUNTIME_PATHS["story/catalog"]: return import('./actors-bind-CmT481e8.js').then(function (n) { return n.catalog; });
case PAGE_RUNTIME_PATHS["boot-presentation"]: return import('./boot-presentation-Dn-UB_83.js');
case PAGE_RUNTIME_PATHS["text/charset"]: return import('./charset-C-1TZfXo.js').then(function (n) { return n.charset; });
case PAGE_RUNTIME_PATHS["text/catalog"]: return import('./charset-C-1TZfXo.js').then(function (n) { return n.catalog; });
case PAGE_RUNTIME_PATHS["actors-bind"]: return import('./actors-bind-CmT481e8.js').then(function (n) { return n.actorsBind; });
case PAGE_RUNTIME_PATHS["battle-bind"]: return import('./monster-formations-B0YFAUG8.js').then(function (n) { return n.battleBind; });
case PAGE_RUNTIME_PATHS["data/items"]: return import('./items-BQN6hnvv.js');
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
  const {db} = await import('./battle-result-script-runtime-B_EClFew.js').then(function (n) { return n.projectDb; });
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
