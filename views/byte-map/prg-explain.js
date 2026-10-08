// @editor-module 字节解释、别名与搜索索引
import {$} from "../../core/dom.js";
import {ROM_MAP_TYPE_OPTIONS, state} from "../../core/state.js";
import {romMapClassificationView, romMapCodeDomainLabel, romMapCodeSubmodeLabel} from "../../core/physical-field-object-document.js";
import {romMapAnnotationModule, romMapFunctionModule, romMapHex} from ".././byte-map/prg-loaders.js";
import {parseRomMapGoto} from "./prg.js";








//
// 来源：拆分前 engine/editor/app.js 第 3597-4078 行。






function romMapDecodedValue(annotation, offset) {
  if (!annotation) return "";
  if (annotation.category === "code") return romMapCodeValueMeaning(annotation, offset);
  if (annotation.classificationKind) return romMapClassifiedValueMeaning(annotation, offset);
  if (annotation.decodedLabel != null) return String(annotation.decodedLabel);
  const raw = Array.from(
    state.romMapBytes.slice(annotation.rangeStart, annotation.rangeStart + annotation.rangeLength)
  );
  const encoding = annotation.field.encoding || "";
  if (annotation.field.encoding?.includes("little-endian")) {
    const result = raw.reduce((total, item, index) => total | (item << (index * 8)), 0);
    return `${raw.map(item => romMapHex(item, 2).slice(1)).join(" ")} → ${romMapHex(result, raw.length * 2)}`;
  }
  if (annotation.status === "partial") return `palette ${state.romMapBytes[offset] & 3}`;
  if (encoding === "u8") return String(raw[0]);
  if (encoding.includes("page ID")) return romMapHex(raw[0], 2);
  if (encoding.includes("even 2 KiB")) return `${romMapHex(raw[0], 2)} / ${romMapHex((raw[0] + 1) & 0xFF, 2)}`;
  if (raw.length > 1) return raw.map(item => romMapHex(item, 2).slice(1)).join(" ");
  return romMapHex(raw[0], 2);
}

function romMapCodeValueMeaning(annotation, offset) {
  const instruction = annotation?.codeInstruction;
  const value = state.romMapBytes[offset];
  if (!instruction) return `机器码 ${romMapHex(value, 2)}`;
  const byteIndex = offset - instruction.start;
  if (byteIndex === 0) return `${instruction.assembly} · opcode ${romMapHex(value, 2)}`;
  const operands = Math.max(1, instruction.size - 1);
  return `${instruction.assembly} · 操作数 ${byteIndex}/${operands} ${romMapHex(value, 2)}`;
}

function romMapClassifiedValueMeaning(annotation, offset) {
  const value = state.romMapBytes[offset];
  const position = offset - annotation.rangeStart;
  return `${annotation.classificationLabel || annotation.field.meaning} 字节 ${romMapHex(value, 2)} · 区块 +${romMapHex(position, Math.max(2, Math.ceil(Math.log2(Math.max(2, annotation.rangeLength)) / 4))).slice(1)}`;
}

export function romMapByteExplanation(annotation, offset) {
  if (!annotation) return {current: "", consequence: "", edit: ""};
  if (annotation.category === "code") {
    const instruction = annotation.codeInstruction;
    const byteIndex = instruction ? offset - instruction.start : 0;
    const role = instruction
      ? (byteIndex === 0 ? "opcode" : `操作数第 ${byteIndex}/${Math.max(1, instruction.size - 1)} 字节`)
      : "尚未归属的机器码字节";
    return {
      current: annotation.algorithmDetail || `${annotation.record}。`,
      consequence: instruction
        ? `本行是 ${instruction.assembly} 的 ${role}，当前值 ${romMapHex(state.romMapBytes[offset], 2)}。`
        : `本行是${role}，当前值 ${romMapHex(state.romMapBytes[offset], 2)}。`,
      edit: "此字节计入“功能代码”覆盖；目前只读，尚未提供汇编级改写和重定位。",
    };
  }
  if (annotation.classificationKind) {
    const position = offset - annotation.rangeStart;
    const provisional = annotation.status === "provisional";
    return {
      current: annotation.algorithmDetail || `${annotation.record}。`,
      consequence: `本行是区块内第 ${position + 1}/${annotation.rangeLength} 个字节，当前值 ${romMapHex(state.romMapBytes[offset], 2)}。`,
      edit: provisional
        ? "该范围只是后续分析候选，不计入已确认覆盖，不应据此直接修改。"
        : "当前已确认区块类型和边界，但未细化到本字节的具体字段；应优先在对应的类型化编辑器中修改。",
    };
  }
  const raw = Array.from(
    state.romMapBytes.slice(annotation.rangeStart, annotation.rangeStart + annotation.rangeLength)
  );
  const value = state.romMapBytes[offset];
  const index = offset - annotation.rangeStart;
  const decoded = raw.reduce((total, item, byteIndex) => total + item * (2 ** (byteIndex * 8)), 0);
  const block = annotation.block || {};
  const byteRole = annotation.rangeLength > 1
    ? (annotation.field.encoding?.includes("little-endian")
      ? `本行是${index === 0 ? "低位" : (index === annotation.rangeLength - 1 ? "高位" : `第 ${index + 1}`)}字节。`
      : `本行是该字段第 ${index + 1}/${annotation.rangeLength} 个字节。`)
    : "";
  let current = `${annotation.record} 的“${annotation.field.meaning}”当前字节为 ${romMapHex(value, 2)}。${byteRole}`;
  if (annotation.algorithmDetail) current = `${annotation.algorithmDetail}${byteRole ? ` ${byteRole}` : ""}`;

  if (block.id === "scene-header-records") {
    switch (annotation.field.meaning) {
      case "逻辑地图宽度":
        current = `${annotation.record} 的地图宽度为 ${romMapHex(value, 2)} = ${value} 个 16×16 地图图块，即 ${value * 16} 像素。`;
        break;
      case "逻辑地图高度":
        current = `${annotation.record} 的地图高度为 ${romMapHex(value, 2)} = ${value} 个 16×16 地图图块，即 ${value * 16} 像素。`;
        break;
      case "地图压缩流指针": {
        const target = decoded < 0xC000
          ? `PRG region ${romMapHex(decoded)}（ROM file ${romMapHex(decoded + 0x10)}）`
          : `CHR region ${romMapHex(0x02F000 + decoded)}`;
        current = `${annotation.record} 的地图流指针为 ${raw.map(item => romMapHex(item, 2).slice(1)).join(" ")} → ${romMapHex(decoded, 4)}，目标是 ${target}；${byteRole}`;
        break;
      }
      case "Metatile $00-$3F 定义/属性页":
      case "Metatile $40-$7F 定义/属性页":
        current = `${annotation.record} 当前使用 page ${romMapHex(value, 2)}：定义位于 PRG region ${romMapHex(0x035000 + value * 0x100)}，属性位于 ${romMapHex(0x038700 + value * 0x40)}。`;
        break;
      case "点传送与边界传送记录指针":
        current = `${annotation.record} 的传送记录指针为 ${raw.map(item => romMapHex(item, 2).slice(1)).join(" ")} → ${romMapHex(decoded, 4)}，目标 PRG region ${romMapHex(0x01E000 + decoded - 0x8000)}（ROM file ${romMapHex(0x01E010 + decoded - 0x8000)}）；${byteRole}`;
        break;
      case "场景背景 palette 源指针":
        current = `${annotation.record} 的 palette 指针为 ${raw.map(item => romMapHex(item, 2).slice(1)).join(" ")} → ${romMapHex(decoded, 4)}，9 字节 palette 源位于 PRG region ${romMapHex(0x014000 + decoded)}（ROM file ${romMapHex(0x014010 + decoded)}）；${byteRole}`;
        break;
      case "地图对象 sprite CHR bank pair":
        current = `${annotation.record} 的地图对象使用 CHR bank ${romMapHex(value, 2)}/${romMapHex((value + 1) & 0xFF, 2)}，对应 CHR region ${romMapHex(value * 0x400)} 和 ${romMapHex(((value + 1) & 0xFF) * 0x400)}。`;
        break;
      case "场景背景 MMC3 register 2-5 bank":
        current = `${annotation.record} 的 MMC3 R${index + 2} 使用 1 KiB CHR bank ${romMapHex(value, 2)}，对应 CHR region ${romMapHex(value * 0x400)}-${romMapHex(value * 0x400 + 0x3FF)}。`;
        break;
      default:
        break;
    }
  } else if (block.id === "world-metatile-definitions") {
    current = `${annotation.record} 的${annotation.field.meaning}当前引用 PPU 图块 ${romMapHex(value, 2)}；修改这一字节会替换该地图图块对应象限的 8×8 图块。`;
  } else if (block.id === "world-metatile-attributes") {
    current = `${annotation.record} 的属性原值为 ${romMapHex(value, 2)}：已确认 bit 0-1 = ${value & 3}（palette ${value & 3}）；bit 2-7 尚未解释，修改时必须原样保留。`;
  }

  const edit = block.web_editable
    ? "网页已有对应的编辑控件，构建 ROM 时会写入该字节。"
    : (annotation.writebackPath
      ? `网页尚未开放此字段；构建 ROM 时由 ${annotation.writebackPath} 在原长度内回写。`
      : (block.roundtrip
        ? "网页尚未开放此字段；该固定范围已纳入无损回包，但当前仍需通过源数据修改。"
        : "目前只用于定位和说明，尚未建立自动回写路径。"));
  return {current, consequence: annotation.field.detail || "", edit};
}

function romMapPlainDescription(annotation, offset) {
  if (!annotation) return "";
  const addressMeaning = romMapAddressMeaning(annotation);
  const valueMeaning = romMapValueMeaning(annotation, offset);
  return `${addressMeaning}${valueMeaning ? ` = ${valueMeaning}` : ""}`;
}

export function romMapAddressMeaning(annotation) {
  if (!annotation) return "";
  return annotation.addressMeaning || `${annotation.record} · ${annotation.field.meaning}`;
}

export function romMapValueMeaning(annotation, offset) {
  if (!annotation) return "";
  if (annotation.category === "code") return romMapCodeValueMeaning(annotation, offset);
  if (annotation.classificationKind) return romMapClassifiedValueMeaning(annotation, offset);
  const raw = Array.from(
    state.romMapBytes.slice(annotation.rangeStart, annotation.rangeStart + annotation.rangeLength)
  );
  const numeric = raw.reduce((total, item, index) => total + item * (2 ** (index * 8)), 0);
  if (typeof annotation.valueFormatter === "function") {
    return String(annotation.valueFormatter(numeric, raw, offset));
  }
  if (annotation.valueDescription != null) return String(annotation.valueDescription);
  return romMapDecodedValue(annotation, offset);
}

function romMapAnnotationAliases(annotation) {
  const meaning = annotation?.field?.meaning || "";
  const aliases = [];
  if (meaning.includes("宽度") || meaning.includes("高度")) aliases.push("地图尺寸", "场景尺寸");
  if (meaning.includes("地图压缩流")) aliases.push("地图数据", "压缩地图", "地图图块");
  if (meaning.includes("Metatile")) aliases.push("地图图块", "metatile", "图块页");
  if (meaning.includes("传送")) aliases.push("门", "传送点", "边界传送", "场景出口");
  if (meaning.includes("palette")) aliases.push("调色板", "背景颜色", "palette");
  if (meaning.includes("sprite")) aliases.push("角色图像", "NPC", "战车", "sprite");
  if (meaning.includes("CHR bank")) aliases.push("背景图块", "CHR", "图形bank");
  if (annotation?.block?.id?.startsWith("world-metatile")) aliases.push("世界地图", "地形", "世界图块");
  const optional = [
    annotation?.entity_name,
    annotation?.name,
    annotation?.field?.entity_name,
    annotation?.field?.name,
    annotation?.aliases,
    annotation?.keywords,
    annotation?.field?.aliases,
    annotation?.field?.keywords,
    annotation?.block?.aliases,
    annotation?.block?.keywords,
  ];
  for (const value of optional) {
    if (Array.isArray(value)) aliases.push(...value);
    else if (value) aliases.push(value);
  }
  return [...new Set(aliases.map(value => String(value).trim()).filter(Boolean))];
}

function buildRomMapSearchIndex() {
  const seen = new Set();
  const indexedNamedRanges = new Set();
  const index = [];
  for (let offset = 0; offset < state.romMapAnnotations.length; offset += 1) {
    const annotation = state.romMapAnnotations[offset];
    if (!annotation) continue;
    const key = annotation.searchKey || `${annotation.rangeStart}:${annotation.field.meaning}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const address = annotation.rangeStart;
    const bank = Math.floor(address / 0x2000);
    const bankOffset = address & 0x1FFF;
    const aliases = romMapAnnotationAliases(annotation);
    const valueAliases = (annotation.valueAliases || []).map(value => String(value));
    const addressMeaning = romMapAddressMeaning(annotation);
    const valueMeaning = romMapValueMeaning(annotation, address);
    const label = romMapPlainDescription(annotation, address);
    const blockLabel = annotation.block?.label || annotation.record || annotation.classificationName || "";
    const module = romMapAnnotationModule(annotation);
    const writeback = annotation.writebackPath || "";
    if (annotation.classificationName) {
      indexedNamedRanges.add(`${Number(annotation.rangeStart)}:${annotation.classificationName}`);
    }
    const addressSearchable = [
      addressMeaning,
      annotation.record,
      annotation.field.meaning,
      blockLabel,
      module.id,
      module.label,
      writeback,
      annotation.searchText,
      ...aliases,
      romMapHex(address),
      romMapHex(Number(state.project.manifest.rom.prg_file_offset) + address),
      `${romMapHex(bank, 2)}:${romMapHex(bankOffset, 4)}`,
    ].filter(Boolean).join(" \n ").toLocaleLowerCase();
    const valueSearchable = [
      valueMeaning,
      annotation.valueDescription,
      annotation.decodedLabel,
      ...valueAliases,
    ].filter(Boolean).join(" \n ").toLocaleLowerCase();
    index.push({
      offset: address,
      rangeLength: Number(annotation.rangeLength || 1),
      bank,
      bankOffset,
      label,
      block: blockLabel,
      module: module.label,
      aliases,
      valueAliases,
      explanation: `${annotation.record} · ${annotation.field.meaning}`,
      addressSearchable,
      valueSearchable,
      searchable: `${addressSearchable} \n ${valueSearchable}`,
    });
  }
  for (const range of state.romMapFieldObjects?.namedRangeViews || []) {
    const offset = Number(range.prg_offset);
    const rangeLength = Number(range.length || 0);
    const name = String(range.name || "").trim();
    if (!name || !Number.isFinite(offset) || offset < 0 || rangeLength < 1) continue;
    const namedRangeKey = `${offset}:${name}`;
    if (indexedNamedRanges.has(namedRangeKey)) continue;
    const bank = Math.floor(offset / 0x2000);
    const bankOffset = offset & 0x1FFF;
    const view = romMapClassificationView(range.kind);
    const domainLabel = romMapCodeDomainLabel(range.domain || "unclassified");
    const module = romMapFunctionModule(range.module || range.module_id || "unassigned");
    const aliases = [
      name,
      range.kind,
      range.semantic_kind,
      range.domain,
      domainLabel,
      module.id,
      module.label,
      ...(range.submodes || []).map(romMapCodeSubmodeLabel),
    ].filter(Boolean).map(value => String(value));
    const addressSearchable = [
      name,
      range.comment,
      range.address_meaning,
      range.structure,
      range.source_module,
      ...aliases,
      romMapHex(offset),
      romMapHex(Number(state.project.manifest.rom.prg_file_offset) + offset),
      `${romMapHex(bank, 2)}:${romMapHex(bankOffset, 4)}`,
    ].filter(Boolean).join(" \n ").toLocaleLowerCase();
    const valueSearchable = [
      range.value_meaning,
      range.endianness,
      range.writeback_constraint,
    ].filter(Boolean).join(" \n ").toLocaleLowerCase();
    index.push({
      offset,
      rangeLength,
      bank,
      bankOffset,
      label: `${name} · ${range.comment || view?.label || range.kind || "命名范围"}`,
      block: view?.label || range.kind || "命名范围",
      module: module.label,
      aliases,
      valueAliases: [],
      explanation: [range.address_meaning, range.value_meaning, range.structure].filter(Boolean).join(" · "),
      addressSearchable,
      valueSearchable,
      searchable: `${addressSearchable} \n ${valueSearchable}`,
    });
  }
  index.sort((left, right) => left.offset - right.offset || left.label.localeCompare(right.label, "zh-CN"));
  state.romMapSearchIndex = index;
}

function parseRomMapFilterValue(input, width) {
  const text = String(input || "").trim();
  if (!text) return {active: false, valid: true, value: null};
  let digits = text.toUpperCase();
  let radix = 10;
  if (digits.startsWith("$")) {
    radix = 16;
    digits = digits.slice(1);
  } else if (digits.startsWith("0X")) {
    radix = 16;
    digits = digits.slice(2);
  } else if (digits.endsWith("H")) {
    radix = 16;
    digits = digits.slice(0, -1);
  } else if (digits.startsWith("%")) {
    radix = 2;
    digits = digits.slice(1);
  } else if (digits.startsWith("0B")) {
    radix = 2;
    digits = digits.slice(2);
  } else if (/[A-F]/.test(digits)) {
    radix = 16;
  }
  const pattern = radix === 16 ? /^[0-9A-F]+$/ : (radix === 2 ? /^[01]+$/ : /^\d+$/);
  const value = pattern.test(digits) ? Number.parseInt(digits, radix) : Number.NaN;
  const maximum = (2 ** (Number(width) * 8)) - 1;
  return {
    active: true,
    valid: Number.isFinite(value) && value >= 0 && value <= maximum,
    value,
    maximum,
  };
}

function romMapReadUnsigned(offset, width) {
  if (offset < 0 || offset + width > state.romMapBytes.length) return null;
  let value = 0;
  for (let index = 0; index < width; index += 1) {
    value += state.romMapBytes[offset + index] * (2 ** (index * 8));
  }
  return value;
}

function romMapValueMatches(value, expected, comparison) {
  if (comparison === "ne") return value !== expected;
  if (comparison === "gt") return value > expected;
  if (comparison === "gte") return value >= expected;
  if (comparison === "lt") return value < expected;
  if (comparison === "lte") return value <= expected;
  return value === expected;
}

function romMapAnnotationType(annotation) {
  if (!annotation) return "unknown";
  if (annotation.status === "exact" || annotation.status === "partial") return "semantic";
  if (annotation.status === "code" || annotation.category === "code") return "code";
  if (annotation.status === "provisional" || annotation.category === "provisional") return "provisional";
  return ({
    config: "config",
    script: "script",
    textdata: "text",
    contentdata: "content",
    fontdata: "font",
    mixed: "mixed",
    mirror: "mirror",
  })[annotation.category] || "semantic";
}

function romMapTypeFilterActive() {
  return state.romMapTypeFilters.length !== ROM_MAP_TYPE_OPTIONS.length;
}

function romMapSearchActive() {
  return Boolean(state.romMapSearch.trim() || state.romMapValueSearch.trim() || romMapTypeFilterActive());
}

function searchRomMap(query) {
  const trimmed = String(query || "").trim();
  const valueFilter = parseRomMapFilterValue(state.romMapValueSearch, state.romMapValueWidth);
  if (!trimmed && !valueFilter.active && !romMapTypeFilterActive()) {
    return {total: state.romMapBytes.length, offsets: null, filterLabel: "未过滤 · 全部 PRG"};
  }
  if (!valueFilter.valid) {
    return {
      total: 0,
      offsets: [],
      error: `${state.romMapValueWidth * 8}-bit 无符号值应在 0-${valueFilter.maximum} 之间；支持 42、$2A、0x2A、2Ah 和 %00101010。`,
    };
  }
  if (!state.romMapSearchIndex) buildRomMapSearchIndex();
  const normalized = trimmed.toLocaleLowerCase();
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const exactAddress = trimmed && state.romMapSemanticScope !== "value" ? parseRomMapGoto(trimmed) : null;
  const searchableField = state.romMapSemanticScope === "address"
    ? "addressSearchable" : (state.romMapSemanticScope === "value" ? "valueSearchable" : "searchable");
  const semanticMatches = trimmed
    ? state.romMapSearchIndex.filter(item => tokens.every(token => item[searchableField].includes(token)))
    : null;
  if (exactAddress != null && !semanticMatches.some(item => item.offset === exactAddress)) {
    const annotation = state.romMapAnnotations[exactAddress];
    semanticMatches.unshift({
      offset: exactAddress,
      rangeLength: 1,
      label: annotation ? romMapPlainDescription(annotation, exactAddress) : "按地址定位",
      block: annotation?.block?.label || "未标注字节",
      aliases: [],
      explanation: annotation ? romMapByteExplanation(annotation, exactAddress).current : "该地址目前没有已确认语义。",
      searchable: "",
    });
  }

  const offsets = [];
  const seen = new Set();
  const selectedTypes = new Set(state.romMapTypeFilters);
  const testOffset = offset => {
    if ((semanticMatches && seen.has(offset)) || offset + state.romMapValueWidth > state.romMapBytes.length) return;
    if (semanticMatches) seen.add(offset);
    if (!selectedTypes.has(romMapAnnotationType(state.romMapAnnotations[offset]))) return;
    if (state.romMapValueScope === "known" && !state.romMapAnnotations[offset]) return;
    if (valueFilter.active) {
      const value = romMapReadUnsigned(offset, state.romMapValueWidth);
      if (!romMapValueMatches(value, valueFilter.value, state.romMapValueCompare)) return;
    }
    offsets.push(offset);
  };
  if (semanticMatches) {
    for (const match of semanticMatches) {
      const length = valueFilter.active && state.romMapValueWidth > 1 ? 1 : Number(match.rangeLength || 1);
      for (let index = 0; index < length; index += 1) testOffset(match.offset + index);
    }
  } else {
    for (let offset = 0; offset <= state.romMapBytes.length - state.romMapValueWidth; offset += 1) {
      testOffset(offset);
    }
  }
  offsets.sort((left, right) => left - right);
  const symbols = {eq: "=", ne: "≠", gt: ">", gte: "≥", lt: "<", lte: "≤"};
  const semanticScopeLabels = {all: "全部语义", address: "地址含义", value: "值含义"};
  const semanticLabel = trimmed ? `${semanticScopeLabels[state.romMapSemanticScope]}“${trimmed}”` : "";
  const valueLabel = valueFilter.active
    ? `${state.romMapValueWidth * 8}-bit LE ${symbols[state.romMapValueCompare]} ${romMapHex(valueFilter.value, state.romMapValueWidth * 2)}`
    : "";
  const typeLabel = romMapTypeFilterActive()
    ? `类型：${ROM_MAP_TYPE_OPTIONS.filter(option => selectedTypes.has(option.key)).map(option => option.label).join(" + ") || "无"}`
    : "";
  return {
    total: offsets.length,
    offsets,
    filterLabel: [semanticLabel, valueLabel, typeLabel, state.romMapValueScope === "known" ? "仅已标注" : "全部 PRG"].filter(Boolean).join(" · "),
  };
}


function romMapFilterStatus(result = state.romMapFilterResult) {
  if (result?.error) return {className: "invalid", text: `过滤条件错误 · ${result.error}`};
  if (!romMapSearchActive()) return {className: "", text: `未过滤 · ${state.romMapBytes.length.toLocaleString()} B`};
  return {
    className: result?.total ? "active" : "empty",
    text: `${Number(result?.total || 0).toLocaleString()} HITS / ${state.romMapBytes.length.toLocaleString()} B · ${result?.filterLabel || ""}`,
  };
}
