// @editor-module 调查交互目录
//
// 来源：拆分前 engine/editor/app.js 第 8929-9049 行。

import {$, esc, hex} from "../core/dom.js";
import {
  currentTextReferenceLink,
} from "../core/resource-index.js";
import {state} from "../core/state.js";
import {handleMarkup} from "../ui/handle.js";
import {empty} from "../main.js";

export function investigationStatusLabel(status) {
  return ({
    "confirmed-purpose": "用途已确认",
    "purpose-inferred": "用途推定",
    "investigation-associated": "已确认属于调查 · 用途待定",
    "investigation-associated-unused": "调查入口保留 · 当前未布点",
  })[status] || status || "用途待定";
}

export function renderInvestigation(sceneObjects = []) {
  const directory = state.project.facilities?.investigation;
  if (!directory) return ``;
  const audit = state.project.scenes?.logic || {};
  const treasures = sceneObjects.filter(
    record => record.scene_object_kind === "treasure",
  );
  const specialPoints = sceneObjects.filter(
    record => record.scene_object_kind === "investigation-special",
  );
  const behaviors = audit.investigation_tile_behavior_catalog || [];
  const metatilePoints = sceneObjects.filter(
    record => record.scene_object_kind === "investigation-tile",
  );
  const sceneNames = new Map((state.project.scenes?.editable_scenes || []).map(scene => [Number(scene.id), scene.name]));
  const itemNames = new Map((state.project.game_data?.items?.records || []).map(item => [Number(item.id), item.name]));
  const query = state.query.trim().toLowerCase();
  const matching = items => items.filter(item => !query || JSON.stringify(item).toLowerCase().includes(query));
  const commands = directory.commands || [];
  const commandRows = commands.map(command => {
    const configuration = command.configuration_family || {};
    const resourceUid = `investigation-command:${Number(command.command_id).toString(16).toUpperCase().padStart(2, "0")}`;
    const params = (command.parameter_values_hex || []).join(" / ") || "—";
    const contextTexts = (command.context_text_records || []).map(record =>
      currentTextReferenceLink(record)
    ).join("");
    const configDetail = configuration.family_id_hex
      ? `<span title="${esc(configuration.label || "")}"
        >组 ${esc(configuration.family_id_hex)}</span>`
      : command.facility_id === "frog-race"
        ? `<span title="已在青蛙赛跑页面恢复">专用下注价格表</span>`
        : "—";
    return `<tr>
      <td>${handleMarkup(resourceUid)}</td>
      <td class="mono">${esc(command.selector_hex)}</td>
      <td class="mono">${esc(command.command_id_hex)}</td>
      <td class="mono right" title="命令号 − $10">${hex(Number(command.command_id) - 0x10, 2)}</td>
      <td><button class="resource-inline-link" type="button" data-resource-target="${resourceUid}">${esc(command.label)}</button></td>
      <td>${contextTexts || "—"}</td>
      <td class="right">${Number(command.point_count)}</td>
      <td class="right">${Number(command.scene_count)}</td>
      <td class="mono">${esc(params)}</td>
      <td class="mono">${(command.shared_script_command_ids_hex || []).length > 1 ? (command.shared_script_command_ids_hex || []).map(esc).join(" / ") : "—"}</td>
      <td>${configDetail}</td>
    </tr>`;
  }).join("");
  const inferredConfiguration = commands.find(command => Number(command.command_id) === 0x1D)?.configuration_family;
  const configurationRows = (inferredConfiguration?.records || []).map(record => `<tr id="investigation-command-1D-config-${Number(record.id).toString(16).toUpperCase().padStart(2, "0")}">
    <td>${handleMarkup(`investigation-command:1D:config:${Number(record.id).toString(16).toUpperCase().padStart(2, "0")}`)}</td>
    <td class="mono">${esc(record.bytes_hex)}</td>
  </tr>`).join("");
  const specialRows = matching(specialPoints).map(point => `<tr>
    <td class="mono">${handleMarkup(point.scene_object_uid)}</td>
    <td>${esc(point.label)}</td>
    <td><button class="resource-inline-link" type="button" data-resource-target="scene:${Number(point.scene_id).toString(16).toUpperCase().padStart(2, "0")}">${esc(sceneNames.get(Number(point.scene_id)) || `场景 ${point.scene_id_hex}`)}</button></td>
    <td class="mono right">(${point.x}, ${point.y})</td>
    <td class="wrap">${esc(point.description)}</td>
    <td>${esc(point.interaction_state?.label)}</td>
    <td class="wrap">${esc((point.interaction_state?.effects || []).join(" / "))}</td>
    <td>${(point.text_records || []).map(currentTextReferenceLink).join("") || "—"}</td>
  </tr>`).join("");
  const behaviorRows = behaviors.map(behavior => `<tr>
    <td class="mono">${esc(behavior.behavior_code_hex)}</td>
    <td class="mono right">${esc(behavior.dispatch_index_hex)}</td>
    <td>${esc(behavior.label)}</td>
    <td>${esc(behavior.kind)}</td>
    <td class="wrap">${esc(String(behavior.description || "")
      .replace("调用 $D350/$BFF9", "调用已定位例程"))}</td>
    <td class="right">${behavior.physical_point_count}</td>
    <td>${(behavior.text_records || []).map(currentTextReferenceLink).join("") || "—"}</td>
  </tr>`).join("");
  const treasureRows = matching(treasures).map(treasure => {
    const content = treasure.content_kind === "item"
      ? `${treasure.content_id_hex} · ${itemNames.get(Number(treasure.item_id)) || "道具"}`
      : treasure.content_kind === "buried-vehicle"
        ? `${treasure.content_id_hex} · ${treasure.content_label}`
        : `${treasure.content_id_hex} · ${treasure.money_base_value || 0} G`;
    return `<tr>
      <td class="mono">${handleMarkup(treasure.scene_object_uid)}</td>
      <td><button class="resource-inline-link" type="button" data-resource-target="scene:${Number(treasure.scene_id).toString(16).toUpperCase().padStart(2, "0")}">${esc(sceneNames.get(Number(treasure.scene_id)) || `场景 ${treasure.scene_id_hex}`)}</button></td>
      <td class="mono right">(${treasure.x}, ${treasure.y})</td>
      <td>${esc(content)}</td>
      <td>${esc(treasure.interaction_state?.label)}</td>
      <td class="mono">${esc(treasure.interaction_state?.flag_id_hex)}</td>
      <td class="mono">${esc(treasure.interaction_state?.runtime_byte_hex)} bit ${esc(treasure.interaction_state?.bit_index)}</td>
      <td>${esc(treasure.interaction_state?.commit)}</td>
    </tr>`;
  }).join("");
  const metatileRows = matching(metatilePoints).map(point => `<tr>
    <td class="mono">${handleMarkup(point.scene_object_uid)}</td>
    <td><button class="resource-inline-link" type="button" data-resource-target="scene:${Number(point.scene_id).toString(16).toUpperCase().padStart(2, "0")}">${esc(sceneNames.get(Number(point.scene_id)) || `场景 ${point.scene_id_hex}`)}</button></td>
    <td class="mono right">(${point.x}, ${point.y})</td>
    <td class="mono">${esc(point.metatile_id_hex)}</td>
    <td class="mono">${esc(point.behavior_code_hex)}</td>
    <td>${esc(point.label)}</td>
    <td>${esc(point.kind)}</td>
    <td class="wrap">${esc(point.description)}</td>
    <td>${esc(point.interaction_state?.label)}</td>
    <td class="wrap">${esc((point.interaction_state?.effects || []).join(" / "))}</td>
  </tr>`).join("");
  return `
    <div class="section-line"><h2>六个特殊调查点</h2><span>${specialPoints.length} / 6</span></div>
    <div class="table-wrap"><table><thead><tr><th>句柄</th><th>名称</th><th>场景</th><th>坐标</th><th>作用</th><th>全局状态</th><th>状态效果</th><th>文本</th></tr></thead><tbody>${specialRows}</tbody></table></div>
    <div class="section-line"><h2>地图图块调查行为</h2><span>${behaviors.length} 种类型 · ${metatilePoints.length} 个地图格</span></div>
    <div class="table-wrap"><table><thead><tr><th>行为码</th><th>分派索引</th><th>类型</th><th>分类</th><th>处理语义</th><th>物理格</th><th>文本</th></tr></thead><tbody>${behaviorRows}</tbody></table></div>
    <div class="section-line"><h2>调查处理目录</h2><span>选择码 → 调查处理 → 应用脚本</span></div>
    <div class="table-wrap"><table>
      <thead><tr><th>句柄</th><th>选择码</th><th>命令</th><th>索引</th><th>名称</th><th>语义文本</th><th>点数</th><th>场景数</th><th>参数</th><th>共用命令</th><th>相关配置</th></tr></thead>
      <tbody>${commandRows}</tbody>
    </table></div>
    <div class="section-line"><h2>调查命令配置</h2></div>
    <div class="table-wrap"><table>
      <thead><tr><th>句柄</th><th>当前 ROM 字节</th></tr></thead>
      <tbody>${configurationRows}</tbody>
    </table></div>
    <details class="ui-extraction-details"><summary>全部调查物 / 宝箱 · ${matching(treasures).length} / ${treasures.length}</summary><div class="table-wrap"><table><thead><tr><th>句柄</th><th>场景</th><th>坐标</th><th>内容</th><th>状态</th><th>标志位</th><th>运行字节</th><th>提交时机</th></tr></thead><tbody>${treasureRows}</tbody></table></div></details>
    <details class="ui-extraction-details"><summary>全部地图图块调查格 · ${matching(metatilePoints).length} / ${metatilePoints.length}</summary><div class="table-wrap"><table><thead><tr><th>句柄</th><th>场景</th><th>坐标</th><th>metatile</th><th>行为码</th><th>类型</th><th>分类</th><th>处理语义</th><th>状态</th><th>状态效果</th></tr></thead><tbody>${metatileRows}</tbody></table></div></details>`;
}
