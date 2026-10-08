// @editor-module 按调用方声明的 owner role 和已发布字节范围解析代码入口。
//
// 调用方必须静态列出允许的 role。本层只从这些 role 所属资源的已发布字节范围中
// 取回精确 owner 记录，再用结构化反汇编符号把 PRG 入口投影成 CPU 入口；不从标签、
// 注释或模块遍历中猜 role，也不解释消费端的指针编码。

import {db} from "./project-db.js";
import {loadCodeModuleFieldObjects} from "./code-module-field-object.js";

const DISASSEMBLY_SYMBOLS_PATH = "analysis/disassembly/symbols.json";

function roleEntryValue(symbols, moduleId, role, ownerRange) {
  const candidates = new Map();
  const add = (record, offset) => {
    const cpuAddress = Number(record?.cpu_address);
    if (!Number.isInteger(cpuAddress)) return;
    const value = cpuAddress + offset;
    if (!Number.isInteger(value) || value < 0 || value > 0xffff) return;
    if (!candidates.has(value)) candidates.set(value, []);
    candidates.get(value).push(String(record.name || "（未命名符号）"));
  };
  for (const symbol of symbols.symbols || []) {
    if (Number(symbol?.prg_offset) === ownerRange.offset) add(symbol, 0);
  }
  for (const namedRange of symbols.ranges || []) {
    const start = Number(namedRange?.prg_offset);
    const length = Number(namedRange?.length);
    if (!Number.isInteger(start) || !Number.isInteger(length) || length < 1
        || ownerRange.offset < start
        || ownerRange.endExclusive > start + length) continue;
    add(namedRange, ownerRange.offset - start);
  }
  if (candidates.size !== 1) {
    throw new Error(
      `${moduleId}/${role} 的已发布代码入口不能唯一投影（实际 ${candidates.size}）`,
    );
  }
  return [...candidates.keys()][0];
}

/**
 * 返回静态声明 role 的不透明入口值。消费端只拿这些值做精确相等匹配；
 * 返回地址减一、bank 选择等编码语义不属于这里，也不会从注释文本中解析。
 */
async function loadDeclaredCodeProviderRoles(moduleId, roles) {
  if (!Array.isArray(roles) || roles.length < 2
      || new Set(roles).size !== roles.length
      || roles.some(role => typeof role !== "string" || !role)) {
    throw new TypeError("动态代码 provider 必须静态声明至少两个不同 role");
  }
  const [ownerRoles, symbols] = await Promise.all([
    loadCodeModuleFieldObjects(moduleId, roles),
    db.getPackageDocument(DISASSEMBLY_SYMBOLS_PATH, null),
  ]);
  if (symbols?.schema !== "metalmaxcn.symbols"
      || symbols.address_model !== "physical-8k-bank:offset"
      || !Array.isArray(symbols.symbols) || !Array.isArray(symbols.ranges)) {
    throw new Error("反汇编没有发布结构化 PRG / CPU 符号映射");
  }
  const bindings = ownerRoles.map(({role, physical}) => Object.freeze({
    role,
    value: roleEntryValue(symbols, moduleId, role, physical),
  }));
  const byValue = new Map();
  bindings.forEach(binding => {
    if (!byValue.has(binding.value)) byValue.set(binding.value, []);
    byValue.get(binding.value).push(binding.role);
  });
  const duplicate = [...byValue].find(([, boundRoles]) => boundRoles.length > 1);
  if (duplicate) {
    throw new Error(
      `${moduleId} 的 ${duplicate[1].join(" / ")} 共用同一个已发布入口`,
    );
  }
  return Object.freeze(bindings);
}
