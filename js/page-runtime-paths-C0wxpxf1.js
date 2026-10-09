import { storyPlaybackView } from './package-schema-paths-gCIepLXx.js';
import { siteUrl } from './visual-metasprites-DJP54-bV.js';

// @editor-module 按状态、记录与自有场景选择已发布的界面模板绑定。
function uiTemplateBindings(library) {
  return (library?.bindings || []).flatMap(binding => [binding,
    ...(binding.record_variants || []).map(variant => ({...variant,
      state: binding.state, interface: binding.interface})),
  ]);
}

function uiTemplateBinding(library, stateId, {
  templateId = "", recordIds = [], sceneId = "",
} = {}) {
  const primary = library?.bindings?.find(binding => binding.state === stateId);
  if (!primary) return null;
  let candidates = uiTemplateBindings(library).filter(binding => binding.state === stateId);
  if (templateId) candidates = candidates.filter(binding => binding.template === templateId);
  if (sceneId) {
    const witnessed = candidates.filter(binding => library.templates?.find(
      template => template.id === binding.template)?.source?.scene === sceneId);
    if (witnessed.length) candidates = witnessed;
    else if (primary.record_variants?.length || templateId) return null;
    else if (!templateId && !recordIds.length) return primary;
  }
  if (recordIds.length) {
    const located = candidates.filter(binding => recordIds.every(record => [
      ...(binding.fills || []).map(fill => fill.text_record_ref?.node_id || fill.record),
      ...(binding.deferred_records || []),
    ].includes(record)));
    if (located.length) candidates = located;
    else if (!templateId) return primary;
    else return null;
  }
  if (!templateId && !recordIds.length && !sceneId) return primary;
  return candidates.length === 1 ? candidates[0] : null;
}

function uiScreenTemplateBinding(library, screen) {
  const sceneId = screen?.runtime_preview?.scene_id || String(screen?.runtime_preview?.path || "")
    .match(/(?:^|\/)scenes\/([^/]+)\/[^/]+$/)?.[1] || "";
  return uiTemplateBinding(library, screen?.interface_state_id, {sceneId});
}

// @editor-module 声明页面入口模块及按页装载依赖。
const PAGE_RUNTIME_PATHS = Object.freeze(Object.fromEntries(Object.entries({
  "field-editor": "/ui/field-object-editor.js",
  "audio": "/views/audio.js",
  "actors": "/views/actors.js",
  "battle": "/views/battle.js",
  'monster-formations': '/views/monster-formations.js',
  "battle-actors": "/views/battle-actors.js",
  "emulator": "/views/emulator.js",
  "byte-map/sram": "/views/byte-map/sram.js",
  "save-page": "/views/save-page.js",
  "build-log": "/views/build-log.js",
  "data/characters": "/views/data/characters.js",
  "data/monsters": "/views/data/monsters.js",
  "shops": "/views/shops.js",
  "interface-pages": "/views/interface-pages.js",
  'service-pages': '/views/service-pages.js',
  "scenes/encounter": "/views/scenes/encounter.js",
  "data/pages": "/views/data/pages.js",
  "data/vehicles": "/views/data/vehicles.js",
  "facilities": "/views/facilities.js",
  "wanted": "/views/wanted.js",
  "byte-map/prg": "/views/byte-map/prg.js",
  "byte-map/chr": "/views/byte-map/chr.js",
  "scenes/interact": "/views/scenes/interact.js",
  "scenes/overview": "/views/scenes/overview.js",
  "scenes/workbench": "/views/scenes/workbench.js",
  "metatiles": "/views/metatiles.js",
  "story/playback": "/views/story/playback.js",
  "story/catalog": "/views/story/catalog.js",
  "boot-presentation": "/views/boot-presentation.js",
  "text/charset": "/views/text/charset.js",
  'text/catalog': '/views/text/catalog.js',
  "actors-bind": "/views/actors-bind.js",
  "battle-bind": "/views/battle-bind.js",
  "data/items": "/views/data/items.js"
}).map(([name, path]) => [name, siteUrl(path)])));

function pageRuntimeModulePaths(view) {
  return [
    ["interfaceui", "scenes", "text", "audio", "save", "shops", "jukebox", "vending", "frograce", "teleport", "computercontroller"]
      .includes(view) ? PAGE_RUNTIME_PATHS["field-editor"] : null,
    view === 'audio' ? PAGE_RUNTIME_PATHS["audio"] : null,
    view === 'actors' ? PAGE_RUNTIME_PATHS["actors"] : null,
    view === 'battle-test' || view === 'attack-effects' ? PAGE_RUNTIME_PATHS["battle"] : null,
    view === 'monster-formations' ? PAGE_RUNTIME_PATHS['monster-formations'] : null,
    view === 'battleactors' ? PAGE_RUNTIME_PATHS["battle-actors"] : null,
    view === 'emulator' ? PAGE_RUNTIME_PATHS["emulator"] : null,
    view === 'save' || view === 'bytemap-sram' ? PAGE_RUNTIME_PATHS["byte-map/sram"] : null,
    view === 'save' ? PAGE_RUNTIME_PATHS["save-page"] : null,
    view === 'build' ? PAGE_RUNTIME_PATHS["build-log"] : null,
    view === 'characters' ? PAGE_RUNTIME_PATHS["data/characters"] : null,
    view === 'monsters' ? PAGE_RUNTIME_PATHS["data/monsters"] : null,
    view === 'shops' || view === 'jukebox' || view === 'vending' ? PAGE_RUNTIME_PATHS["shops"] : null,
    view === 'interfaceui' ? PAGE_RUNTIME_PATHS["interface-pages"] : null,
    view === 'interfaceui' ? PAGE_RUNTIME_PATHS['service-pages'] : null,
    view === 'monsters' ? PAGE_RUNTIME_PATHS["scenes/encounter"] : null,
    view === 'characters' || view === 'monsters' || view === 'vehicles' || view === 'equipment' || view === 'items' || view === 'shells' ? PAGE_RUNTIME_PATHS["data/pages"] : null,
    view === 'vehicles' ? PAGE_RUNTIME_PATHS["data/vehicles"] : null,
    view === 'jukebox' || view === 'vending' || view === 'frograce' || view === 'teleport' || view === 'computercontroller' ? PAGE_RUNTIME_PATHS["facilities"] : null,
    view === 'wanted' || view === 'wanted-ui' ? PAGE_RUNTIME_PATHS["wanted"] : null,
    view === 'bytemap-prg' ? PAGE_RUNTIME_PATHS["byte-map/prg"] : null,
    view === 'bytemap-chr' ? PAGE_RUNTIME_PATHS["byte-map/chr"] : null,
    view === 'scenes' ? PAGE_RUNTIME_PATHS["scenes/interact"] : null,
    view === 'scenes' ? PAGE_RUNTIME_PATHS["scenes/overview"] : null,
    view === 'scenes' ? PAGE_RUNTIME_PATHS["scenes/workbench"] : null,
    view === 'metatiles' ? PAGE_RUNTIME_PATHS["metatiles"] : null,
    storyPlaybackView(view) ? PAGE_RUNTIME_PATHS["story/playback"] : null,
    view === 'actors' ? PAGE_RUNTIME_PATHS["story/catalog"] : null,
    view === 'cutscene-boot-logo' || view === 'cutscene-title' ? PAGE_RUNTIME_PATHS["boot-presentation"] : null,
    view === 'text' ? PAGE_RUNTIME_PATHS["text/charset"] : null,
    view === 'text' ? PAGE_RUNTIME_PATHS['text/catalog'] : null,
    view === 'actors' ? PAGE_RUNTIME_PATHS["actors-bind"] : null,
    view === 'battle-test' || view === 'attack-effects' ? PAGE_RUNTIME_PATHS["battle-bind"] : null,
    view === 'equipment' || view === 'items' ? PAGE_RUNTIME_PATHS["data/items"] : null,
  ].filter(Boolean);
}

export { PAGE_RUNTIME_PATHS, pageRuntimeModulePaths, uiScreenTemplateBinding, uiTemplateBinding, uiTemplateBindings };
