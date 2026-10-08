// @editor-module 姓名输入资源的物理块字段对象。
import {createPhysicalByteBlocksOwner} from "./physical-byte-blocks-owner.js";

const OWNER = "ui-name-entry";
const SCHEMA = "metalmaxcn.field-ui-module.asset.ui-name-entry";

// 发布正文逐块给出稳定 id、地址与字节；不把块内的数组位置当身份。
export const uiNameEntryOwner = createPhysicalByteBlocksOwner({
  owner: OWNER, schema: SCHEMA, blocksPath: ["blocks"]});

// 输入协议只解读姓名字段对象内已确认的表与立即数。
export function nameEntryProtocol(document) {
  const values = document?.blocks?.find(row => row.id === 'ui-name-entry.name-entry-main')?.values;
  if (!Array.isArray(values) || values.length !== 843) throw new TypeError('姓名输入字段缺少完整声明');
  const at = cpu => cpu - 0xB46C;
  const value = cpu => values[at(cpu)];
  const table = (cpu, count) => values.slice(at(cpu), at(cpu) + count);
  return {characters: table(0xB46C, 200), playerLimit: value(0xB53E) + 1,
    vehicleLimit: value(0xB535) + 1, deleteIndex: value(0xB61C), advanceIndex: value(0xB620),
    endIndex: value(0xB624), transformIndices: [value(0xB614), value(0xB618)],
    transforms: [{minimum: value(0xB638), delta: value(0xB63A)},
      {minimum: value(0xB63E), delta: value(0xB640)}], transformEnd: value(0xB690),
    targets: Array.from({length: 9}, (_, index) => value(0xB6C6 + index * 2) | value(0xB6C7 + index * 2) << 8),
    inputAnchors: {'player-name': table(0xB6D9, 4), 'vehicle-name': table(0xB6D8, 6)},
    collapsed: table(0xB78A, 6), commands: table(0xB790, 3)};
}

export function initialNameEntry(protocol, variant) {
  const limit = variant === 'player-name' ? protocol.playerLimit : protocol.vehicleLimit;
  return {variant, limit, buffer: [...Array(limit).fill(255), 159], position: 0,
    index: 0, groupColumn: 0, x: 24, y: 72, confirmed: false};
}

export function advanceNameEntry(name, input, protocol) {
  const next = structuredClone(name);
  if (next.confirmed) return next;
  const deltas = {up: [-20, 0, 0, -16], down: [20, 0, 0, 16], left: [-1, -1, -8, 0], right: [1, 1, 8, 0]};
  const direction = deltas[input];
  if (direction) {
    const [index, column, x, y] = direction;
    next.index += index; next.groupColumn += column; next.x += x; next.y += y;
    if (next.y < 72) {next.y = 72; next.index += 20;}
    else if (next.y >= 217) {next.y = 216; next.index -= 20;}
    else {
      if (next.groupColumn < 0) {next.groupColumn = 4; next.x -= 16;}
      if (next.x < 24) {next.x = 24; next.index++; next.groupColumn = 0;}
      if (next.groupColumn === 5) {next.groupColumn = 0; next.x += 16;}
      if (next.x >= 232) {next.groupColumn = 4; next.x = 224; next.index--;}
    }
    if (protocol.collapsed.includes(next.index)) {
      next.x = 192; next.index = protocol.commands[(next.y - 184) >> 4]; next.groupColumn = 0;
    }
    return next;
  }
  const remove = () => {
    if (next.position === 0) return;
    next.buffer[next.position] = 255; next.position--;
  };
  if (input === 'b') {remove(); return next;}
  if (input === 'select') {next.position = Math.min(next.limit - 1, next.position + 1); return next;}
  if (input !== 'a') return next;
  if (next.index === protocol.deleteIndex) {remove(); return next;}
  if (next.index === protocol.advanceIndex) {next.position = Math.min(next.limit - 1, next.position + 1); return next;}
  if (next.index === protocol.endIndex) {
    for (let i = next.limit - 1; i >= 0 && next.buffer[i] === 255; i--) next.buffer[i] = 159;
    if (next.variant === 'player-name' || next.buffer[0] !== 159) next.confirmed = true;
    return next;
  }
  const transform = protocol.transformIndices.indexOf(next.index);
  if (transform >= 0) {
    const position = next.buffer[next.position] === 255 ? next.position - 1 : next.position;
    const value = next.buffer[position], rule = protocol.transforms[transform];
    if (value >= rule.minimum && value < protocol.transformEnd) next.buffer[position] = value + rule.delta;
    return next;
  }
  next.buffer[next.position] = protocol.characters[next.index];
  next.position = Math.min(next.limit - 1, next.position + 1);
  return next;
}
