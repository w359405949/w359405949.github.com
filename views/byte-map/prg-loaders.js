// @editor-module PRG 页面模块归属与展示计算。
import {authorizedRomMapSlotBytes} from "../../core/rom-map-coverage.js";
import {ROM_MAP_FUNCTION_MODULE_BY_ID, ROM_MAP_FUNCTION_MODULE_PRIORITY, ROM_MAP_FUNCTION_MODULES, state} from "../../core/state.js";
export {loadRomMapPrg, loadRomMapChr} from "../../core/physical-field-object-windows.js";







//
// 来源：拆分前 engine/editor/app.js 第 743-1137 行。






export function romMapFunctionModule(moduleId) {
  return ROM_MAP_FUNCTION_MODULE_BY_ID.get(moduleId)
    || ROM_MAP_FUNCTION_MODULE_BY_ID.get("unassigned");
}



function romMapAnnotationModuleId(annotation) {
  if (!annotation) return "unassigned";
  if (ROM_MAP_FUNCTION_MODULE_BY_ID.has(annotation.moduleId)) return annotation.moduleId;
  const moduleIds = new Set(annotation.moduleIds || []);
  for (const moduleId of ROM_MAP_FUNCTION_MODULE_PRIORITY) {
    if (moduleIds.has(moduleId)) return moduleId;
  }

  const signal = [
    annotation.block?.id,
    annotation.block?.label,
    annotation.record,
    annotation.classificationName,
    annotation.classificationLabel,
    annotation.writebackPath,
    ...(annotation.aliases || []),
  ].filter(Boolean).join(" ").toLocaleLowerCase();
  if (/jukebox|点唱机/.test(signal)) return "jukebox";
  if (/vending|售货机/.test(signal)) return "vending";
  if (/frog-race|青蛙赌博|青蛙赛跑/.test(signal)) return "frograce";
  if (/investigation|调查命令|调查激活|调查功能/.test(signal)) return "investigation";
  if (/field-item|非战斗工具|非战斗道具/.test(signal)) return "fielditems";
  if (/battle-item|战斗工具|战斗道具/.test(signal)) return "battleitems";
  if (/special-shell|normal-shell|炮弹配置|炮弹类型/.test(signal)) return "shells";
  if (/game-data-characters|角色初始|玩家角色初始配置|角色成长/.test(signal)) return "characters";
  if (/game-data-vehicles|载具初始|战车初始化|战车初始配置|玩家战车初始配置/.test(signal)) return "vehicles";
  if (/game-data-monsters|怪物战斗属性|怪物属性/.test(signal)) return "monsters";
  if (/game-data-items|装备与道具|装备配置/.test(signal)) return "equipment";
  if (/scene-npc|npc|场景角色|场景对象/.test(signal)) return "npcs";
  if (/audio|音频|声音命令|dpcm|音序/.test(signal)) return "audio";
  if (/font|glyph|字库|文本|名称/.test(signal)) return "text";
  if (/ending|credits|story|剧情|结局|职员表/.test(signal)) return "story";
  if (/enemy|weapon|monster.*(?:palette|graphic)|攻击视觉|攻击特效|战斗视觉|战斗图形/.test(signal)) return "battle";
  if (/actor|sprite|metasprite|非战斗视觉|非战斗图形|角色形象/.test(signal)) return "actors";
  if (/world-|scene-|地图|场景|metatile/.test(signal)) return "scenes";
  if (/\bui\b|菜单|界面|窗口/.test(signal)) return "ui";

  const domain = annotation.codeFunction?.domain;
  const submodes = annotation.codeFunction?.submodeLabels || annotation.classificationSubmodeLabels || [];
  if (domain === "battle") return "battle";
  if (domain === "audio") return "audio";
  if (domain === "non-battle-ui") return "ui";
  if (domain === "shared-core") return "shared";
  if (domain === "non-battle" && submodes.includes("地图行走")) return "scenes";
  if (annotation.classificationDomainLabel === "战斗流程") return "battle";
  if (annotation.classificationDomainLabel === "音频流程") return "audio";
  if (annotation.classificationDomainLabel === "共享基础代码") return "shared";
  if (annotation.category === "scene" || annotation.category === "world") return "scenes";
  if (annotation.category === "textdata" || annotation.category === "fontdata") return "text";
  if (annotation.category === "script") return "story";
  return "unassigned";
}

export function romMapAnnotationModule(annotation) {
  return romMapFunctionModule(romMapAnnotationModuleId(annotation));
}

export function romMapDataModuleSummary(annotations) {
  const counts = new Map(ROM_MAP_FUNCTION_MODULES.map(module => [module.id, {
    ...module, total: 0, fields: 0, structures: 0,
  }]));
  for (const annotation of annotations) {
    if (!annotation || annotation.category === "code"
        || !["exact", "partial", "classified"].includes(annotation.status)) continue;
    const entry = counts.get(romMapAnnotationModuleId(annotation)) || counts.get("unassigned");
    entry.total += 1;
    if (["exact", "partial"].includes(annotation.status)) entry.fields += 1;
    else entry.structures += 1;
  }
  return ROM_MAP_FUNCTION_MODULES
    .map(module => counts.get(module.id))
    .filter(entry => entry.total > 0);
}

export function romMapHex(value, width = 6) {
  return `$${Number(value).toString(16).toUpperCase().padStart(width, "0")}`;
}

export function romMapPercent(value, total) {
  return total ? `${(Number(value) * 100 / Number(total)).toFixed(2)}%` : "0.00%";
}

export function romMapWritebackBytes(total) {
  const manifest = state.browserProjectManifest;
  const targetId = manifest?.default_target;
  const targetDefinition = typeof targetId === "string" && targetId
    ? manifest?.targets?.[targetId]
    : null;
  return authorizedRomMapSlotBytes(targetDefinition, "prg", total);
}
