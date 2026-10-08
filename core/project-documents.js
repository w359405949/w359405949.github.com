// @editor-module 从唯一权威索引现场组装 UI、视觉与音频项目文档，不发布 Web 副本。

import {PACKAGE_SCHEMA_PATHS} from "./package-schema-paths.js";
import {cloneValidatedJson as cloneJson} from "./project-store-values.js";

export async function loadUiProjectDocument(loadJson) {
  const [runtimeUi, construction] = await Promise.all([
    ...PACKAGE_SCHEMA_PATHS["project.ui"].map(loadJson),
  ]);
  const document = cloneJson(runtimeUi);
  delete document.editor;
  document.construction = cloneJson(construction);
  delete document.construction.editor;
  delete document.construction.interfaces;
  delete document.construction.menu_dispatch_data;
  delete document.construction.templates_data;
  return document;
}

export async function loadVisualsProjectDocument(loadJson) {
  const document = cloneJson(await loadJson(PACKAGE_SCHEMA_PATHS["project.visuals"][0]));
  // 目录只做占位：唯一被消费的 asset_catalog_data 由 view-data 从
  // weapon-attack-parameter 填入（`game/visuals/weapon-effects/assets/index.json`），
  // 不请求不存在的 `game/visuals/weapon-effects/index.json`。
  document.weapon_effect_catalog = {
    schema: "metalmaxcn.weapon-effects",
    summary: {},
    weapons: [],
    behavior_groups: [],
    visual_code_groups: [],
  };
  return document;
}

export async function loadAudioProjectDocument(loadJson) {
  const document = cloneJson(await loadJson(PACKAGE_SCHEMA_PATHS["project.audio"][0]));
  delete document.sequence_graph_path;
  delete document.sequence_graph;
  return document;
}
