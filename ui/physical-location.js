// @editor-module 详情页共用的物理位置折叠区。

import {esc} from "../core/dom.js";
import {
  compactResourceAddress, directPhysicalAddress, physicalAddressLink,
  resourcePhysicalAddressSummary,
} from "../core/resource-index.js";

export function physicalLocationMarkup({uid = null, rows = [], content = ""} = {}) {
  const entries = [...(uid
    ? resourcePhysicalAddressSummary(uid).ranges.map((address, index) => ({
      label: address.role || `片段 ${index + 1}`, address,
    })) : []), ...rows].map(row => {
      const source = row.address?.offset == null && row.address?.prg_offset != null
        ? {...row.address, space: row.address.space || "prg",
          offset: Number(row.address.prg_offset)} : row.address;
      return {...row, address: source};
    }).filter(row => row.address?.offset != null
      && Number.isInteger(Number(row.address.offset)));
  if (!entries.length) return "";
  const singleResource = uid && rows.length === 0 && entries.length === 1;
  return `<details class="physical-location" data-physical-location>
    <summary>物理位置</summary>
    <div class="table-wrap"><table><thead><tr><th>字段</th><th>地址</th><th>字节数</th></tr></thead>
      <tbody>${entries.map(row => `<tr><th>${esc(row.label || row.key || "片段")}</th>
        <td>${singleResource ? compactResourceAddress(uid)
          : row.address.prg_offset != null ? physicalAddressLink(row.address)
            : directPhysicalAddress(row.address)}</td>
        <td>${Number.isInteger(Number(row.length ?? row.address?.length))
          ? esc(String(row.length ?? row.address.length)) : "—"}</td></tr>`).join("")}</tbody>
    </table></div>${content}
  </details>`;
}
