// @editor-module 声明正文 schema 对应的包内只读输入。
export const PACKAGE_SCHEMA_PATHS = Object.freeze({
  "project.ui.interfaces": ["game/ui/construction/interfaces/index.json"],
  "project.ui.dispatch": ["game/ui/construction/dispatch/index.json"],
  "project.ui.templates": ["game/ui/construction/templates/index.json"],
  "project.text-catalog": ["game/ui/construction/script/text_catalog.json"],
  "project.text-providers": ["game/ui/construction/script/data_providers.json"],
  "project.text-fonts": ["game/text/fonts/index.json"],
  "audio-sequence": ["game/audio/sequence-graph.json"],
  "weapon-attack-parameter": ["game/visuals/weapon-effects/assets/index.json"],
  "project.runtime": [
    "runtime/index.json"
  ],
  "project.scenes": [
    "game/scenes/index.json"
  ],
  "project.scenes.logic": [
    "game/scenes/logic-index.json"
  ],
  "project.story": [
    "game/story/index.json"
  ],
  "project.facilities": [
    "game/ui/facilities/index.json"
  ],
  "project.wanted": [
    "game/ui/wanted/index.json"
  ],
  "project.ui": [
    "game/ui/index.json",
    "game/ui/construction/index.json"
  ],
  "project.ui.editor": [
    "game/ui/construction/dispatch/index.json",
    "game/ui/construction/script/text_catalog.json",
    "game/ui/construction/static/index.json",
    "game/ui/construction/compositions/index.json",
    "game/ui/construction/interfaces/index.json",
    "game/ui/facilities/index.json",
    "game/ui/index.json"
  ],
  "project.visuals": [
    "game/visuals/index.json"
  ],
  "project.audio": [
    "game/audio/index.json"
  ]
});

export const repositoryResourceId = schema => ({item: "item-entry", monster: "monster-profile"})[schema] || schema;

export function packageSchemaPaths(schema, manifest) {
  const path = schema === 'project.ui.editor'
    ? manifest?.browser_prepared_inputs?.ui_editor_shared || manifest?.browser_prepared_inputs?.ui_editor
    : schema === 'project.story' ? manifest?.browser_prepared_inputs?.story_shared : null;
  return path ? [path] : PACKAGE_SCHEMA_PATHS[schema] || [];
}
