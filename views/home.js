// @editor-module 项目概览展示 ROM 基线、物理布局与覆盖。
import {editorLog} from "../core/editor-log.js";
import {bytes, esc, hex} from "../core/dom.js";
import {state} from "../core/state.js";
import {loadPhysicalFieldObjectCoverage} from "../core/physical-field-object-index.js";
import {romMapPercent} from "./byte-map/prg-loaders.js";


export function renderHome() {
  const project = state.project || {};
  const manifest = project.manifest || {};
  const rom = manifest.rom || {};
  const coverage = manifest.coverage || {};
  const summary = project.summary || {};
  const resources = project.resource_index?.summary || {};
  const chrReference = project.resource_index?.chr_reference || {};
  // 反向引用图不再进首屏，被引用的 bank 由 chr_reference 直接给。
  const chrReferencedBanks = Array.isArray(chrReference.bank_ids)
    ? new Set(chrReference.bank_ids).size
    : Object.values(chrReference.sources_by_bank || {})
      .filter(sources => sources.length).length;
  const prgBanks = Math.ceil(Number(rom.prg_rom_bytes || 0) / 0x2000);
  const chrBanks = Math.ceil(Number(rom.chr_rom_bytes || 0) / 0x400);
  const physicalCoverage = Number(coverage.covered_bytes || 0) === Number(rom.file_bytes || -1)
    ? "100%" : `${Number(coverage.covered_bytes || 0).toLocaleString()} B`;
  return `<div class="visual-stats home-stats">
      <div><b>${esc(rom.format || "—")}</b><span>卡带格式</span></div>
      <div><b>${rom.mapper ?? "—"}</b><span>Mapper / MMC3 系</span></div>
      <div><b>${bytes(Number(rom.prg_rom_bytes || 0))}</b><span>PRG-ROM · ${prgBanks}×8 KiB</span></div>
      <div><b>${bytes(Number(rom.chr_rom_bytes || 0))}</b><span>CHR-ROM · ${chrBanks}×1 KiB</span></div>
      <div><b>${physicalCoverage}</b><span>物理布局覆盖</span></div>
    </div>
    <div class="section-line"><h2>ROM 基线</h2><span>INES HEADER VERIFIED</span></div>
    <div class="table-wrap home-rom-table"><table>
      <thead><tr><th>属性</th><th>当前值</th></tr></thead>
      <tbody>
        <tr><td title="ROM 导入履历">导入来源</td><td><b>${esc(rom.source_name || "—")}</b></td></tr>
        <tr><td title="导入基线哈希">SHA-256</td><td class="mono home-rom-hash">${esc(rom.sha256 || "—")}</td></tr>
        <tr><td>格式 / Mapper</td><td class="mono">${esc(rom.format || "—")} / ${rom.mapper ?? "—"}${rom.submapper != null ? `.${rom.submapper}` : ""}</td></tr>
        <tr><td>镜像 / 存档</td><td>${esc(rom.mirroring || "—")} / ${rom.battery ? "电池 SRAM" : "无电池"}</td></tr>
        <tr><td title="总大小 ${bytes(Number(rom.file_bytes || 0))}">文件结构</td><td class="mono">HEADER ${bytes(Number(rom.header_bytes || 0))} · TRAINER ${bytes(Number(rom.trainer_bytes || 0))} · TRAILING ${bytes(Number(rom.trailing_bytes || 0))}</td></tr>
        <tr><td>原始头</td><td class="mono">${esc(rom.header_hex || "—")}</td></tr>
      </tbody>
    </table></div>
    <div class="section-line"><h2>物理布局</h2><span>FILE OFFSETS</span></div>
    <div class="table-wrap home-layout-table"><table>
      <thead><tr><th>区域</th><th>文件起点</th><th>容量</th><th>Bank 粒度</th><th>状态</th></tr></thead>
      <tbody>
        <tr><td><b>iNES HEADER</b></td><td class="mono">0x000000</td><td>${bytes(Number(rom.header_bytes || 0))}</td><td>固定 16 B</td><td>完整保留</td></tr>
        <tr><td><b>PRG-ROM</b></td><td class="mono">${hex(Number(rom.prg_file_offset || 0), 6)}</td><td>${bytes(Number(rom.prg_rom_bytes || 0))}</td><td>${prgBanks} × 8 KiB</td><td>代码、配置、文本与内容资源</td></tr>
        <tr><td><b>CHR-ROM</b></td><td class="mono">${hex(Number(rom.chr_file_offset || 0), 6)}</td><td>${bytes(Number(rom.chr_rom_bytes || 0))}</td><td>${chrBanks} × 1 KiB</td><td>NES 2bpp 图块连续平铺</td></tr>
      </tbody>
    </table></div>
    <div class="section-line"><h2>字段对象覆盖</h2><button class="button ghost" type="button"
      data-home-field-coverage-load>统计字段对象覆盖</button></div>
    <div class="table-wrap"><table data-home-field-coverage>
      <thead><tr><th>空间</th><th>字段对象</th><th>覆盖字节</th><th>未覆盖</th></tr></thead>
      <tbody>${[["prg", "PRG", "bytemap-prg"], ["chr", "CHR", "bytemap-chr"],
        ["sram", "SRAM", "bytemap-sram"]].map(([space, label, view]) => `<tr data-home-field-space="${space}" data-home-view="${view}" role="link" tabindex="0" title="${label} 字节地图">
        <td>${label} ↗</td><td data-home-field-objects>按需统计</td>
        <td data-home-field-total>按需统计</td><td data-home-field-uncovered>按需统计</td>
      </tr>`).join("")}</tbody>
    </table></div>
    <div class="section-line"><h2>解析覆盖</h2><span>PHYSICAL ≠ SEMANTIC</span></div>
    <div class="table-wrap home-coverage-table"><table>
      <thead><tr><th>指标</th><th>数量 / 状态</th></tr></thead>
      <tbody>
        <tr><td title="${Number(coverage.covered_bytes || 0).toLocaleString()} / ${Number(rom.file_bytes || 0).toLocaleString()} 字节">规范物理布局</td><td><b>${esc(coverage.canonical_layout || "—")}</b> · ${physicalCoverage}</td></tr>
        <tr><td title="${summary.canonical_sections || 0} 个规范分段">语义资产</td><td><b>${summary.semantic_assets || 0}</b> 项</td></tr>
        <tr><td title="${resources.kinds || 0} 类 · ${resources.addressed_records || 0} 行拥有直接物理地址">可寻址资源</td><td><b>${resources.records || 0}</b> 行</td></tr>
        <tr><td title="${resources.unresolved_references || 0} 条未解析引用">资源关联</td><td><b>${resources.resolved_references || 0} / ${resources.references || 0}</b></td></tr>
        <tr><td title="已知功能与配置显式指向的 1 KiB bank">CHR 已知引用</td><td><b>${chrReferencedBanks.toLocaleString()} / ${Number(chrReference.total_banks || chrBanks).toLocaleString()}</b> banks · ${romMapPercent(chrReferencedBanks, chrReference.total_banks || chrBanks)}</td></tr>
        <tr><td>编辑版本</td><td><b>原始版本 / 编辑版本</b></td></tr>
        <tr><td>派生预览</td><td><b>${summary.derived_previews || 0}</b> 项</td></tr>
      </tbody>
    </table></div>`;
}

export function bindHomeFieldCoverage() {
  const table = document.querySelector("[data-home-field-coverage]");
  const button = document.querySelector("[data-home-field-coverage-load]");
  if (!table || !button) return;
  button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = "统计中…";
    try {
      const coverage = await loadPhysicalFieldObjectCoverage();
      if (!table.isConnected) return;
      for (const [space, count] of Object.entries(coverage)) {
        const row = table.querySelector(`[data-home-field-space="${space}"]`);
        if (!row) continue;
        row.dataset.homeFieldUncovered = String(count.uncovered);
        row.querySelector("[data-home-field-objects]").textContent = count.objects.toLocaleString();
        row.querySelector("[data-home-field-total]").textContent = count.total.toLocaleString();
        row.querySelector("[data-home-field-uncovered]").textContent = count.uncovered.toLocaleString();
      }
      button.textContent = "已统计";
    } catch (error) {
      editorLog.error("项目统计", `操作失败：${error?.message || error}`, error);
      if (!table.isConnected) return;
      table.querySelectorAll("[data-home-field-objects]").forEach(node => {
        node.textContent = `统计失败：${error.message}`;
      });
      button.disabled = false;
      button.textContent = "重试统计";
    }
  });
}
