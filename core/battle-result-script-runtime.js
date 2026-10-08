// @editor-module 结果脚本字段对象提供已确认指令的只读执行投影。

/** PRG $02F1C0–$02F1E1：E2 以上完成记录；操作数由指令消费。 */
export function battleResultProgram(record) {
  const bytes = record?.raw_bytes;
  if (!Array.isArray(bytes)) return {missing: ["占位：结果脚本正文缺失"]};
  const operations = [];
  for (let cursor = 0; cursor < bytes.length; cursor++) {
    const opcode = bytes[cursor];
    if (opcode === 255) return {operations};
    if (opcode === 0xCA) operations.push({kind: 'heal-self'});
    else if (opcode === 0xCC) {
      const value = bytes[++cursor];
      if (!Number.isInteger(value)) return {operations, missing: ['未确认：工具条件操作数缺失']};
      operations.push({kind: 'item-condition', value});
    } else if (opcode === 0xD2) {
      const value = bytes[++cursor];
      if (!Number.isInteger(value)) return {operations, missing: ['未确认：工具消息操作数缺失']};
      operations.push({kind: 'message', record: `record:0A:${String(value).padStart(3, '0')}`});
    } else if (opcode === 0xDA) operations.push({kind: 'consume-item'});
    else if (opcode === 0xE5) {operations.push({kind: 'heal-message'}); return {operations};}
    else if (opcode === 0xCB) operations.push({kind: "party-physical"});
    else if (opcode === 0xD3) operations.push({kind: "enemy-physical"});
    else if (opcode === 0xD7 || opcode === 0xD8)
      operations.push({kind: 'result-target-kind', riding: opcode === 0xD8});
    else if (opcode === 0xD6) operations.push({kind: "enemy-ignore-defense", messageRecordId: "record:0A:067"});
    else if (opcode === 0xED) {
      operations.push({kind: 'defense-collision'});
      return {operations};
    }
    else if (opcode === 0xE1) {
      const id = bytes[++cursor];
      if (!Number.isInteger(id)) return {missing: ['占位：结果消息引用缺失']};
      operations.push({kind: 'result-message', messageRecordId: `record:0A:${String(id).padStart(3, '0')}`});
    }
    else if (opcode === 0xD4 || opcode === 0xD5) {
      const selector = bytes[++cursor];
      if (!Number.isInteger(selector) || selector % 2) return {missing: ["占位：随机量参数索引未确认"]};
      operations.push({kind: opcode === 0xD4 ? 'random-amount' : "enemy-sixteenth-repeat", profile: selector / 2});
    } else if (opcode === 0xC9) {
      const selector = bytes[++cursor];
      if (![0, 1, 2, 3, 4].includes(selector)) return {missing: ['占位：伤害抗性状态源未确认']};
      operations.push({kind: 'damage-resistance', selector});
    } else if (opcode === 0xC0 || opcode === 0xE2) {
      operations.push({kind: 'apply-party-damage'});
      if (opcode === 0xE2) return {operations};
    } else if (opcode === 0xF9) {
      const selector = bytes[++cursor];
      if (![5, 6].includes(selector)) return {missing: ['占位：人物异常状态效果未解码']};
      operations.push({kind: 'party-condition', selector});
      return {operations};
    } else if (opcode === 0xF3) {
      operations.push({kind: 'clear-party-condition'});
      return {operations};
    } else if (opcode === 0xFA) {
      const selector = bytes[++cursor];
      if (![6, 7].includes(selector)) return {missing: ['占位：战车异常状态效果未解码']};
      operations.push({kind: 'vehicle-condition', selector});
      return {operations};
    } else if (opcode === 0xF4) {
      operations.push({kind: 'clear-vehicle-condition'});
      return {operations};
    } else if (opcode === 0xFD) {
      const [threshold, pass, fail] = bytes.slice(cursor + 1, cursor + 4);
      if (![threshold, pass, fail].every(Number.isInteger)) return {missing: ["占位：结果分支操作数缺失"]};
      operations.push({kind: "random-branch", threshold,
        pass: `battle-result-script:${pass.toString(16).toUpperCase().padStart(2, "0")}`,
        fail: `battle-result-script:${fail.toString(16).toUpperCase().padStart(2, "0")}`});
      return {operations};
    } else if (opcode === 0xFE) {
      const selector = bytes[++cursor];
      if (![0, 2, 4].includes(selector)) return {missing: ["占位：结果条件状态源未确认"]};
      operations.push({kind: "state-branch", selector, operands: bytes.slice(cursor + 1)});
      return {operations};
    } else if (opcode === 0xF5) {
      const id = bytes[++cursor];
      if (!Number.isInteger(id)) return {missing: ["占位：结果跳转操作数缺失"]};
      operations.push({kind: "jump", handle: resultHandle(id)});
      return {operations};
    } else if (opcode === 0xFC) {
      const [role, vehicle] = bytes.slice(cursor + 1, cursor + 3);
      if (![role, vehicle].every(Number.isInteger)) return {missing: ["占位：人物与战车分支操作数缺失"]};
      operations.push({kind: "actor-branch", role: resultHandle(role), vehicle: resultHandle(vehicle)});
      return {operations};
    } else if (opcode === 0xF6) {
      const monsterId = bytes[++cursor];
      if (!Number.isInteger(monsterId)) return {missing: ["占位：替换参战者缺少怪物引用"]};
      operations.push({kind: "replace-enemy", monsterId});
      return {operations};
    } else if (opcode === 0xEE) {
      operations.push({kind: 'enemy-exit'});
      return {operations};
    } else return {operations, missing: [`占位：结果指令 $${opcode.toString(16).toUpperCase()} 未解码`]};
  }
  return {missing: ["占位：结果脚本缺少完成指令"]};
}

const resultHandle = id => `battle-result-script:${id.toString(16).toUpperCase().padStart(2, "0")}`;

/** ED 以队员防御减敌方防御，非负量伤敌，负量取绝对值伤队员。 */
export function battleDefenseCollision(actor, target) {
  if (actor?.side !== 'enemy' || target?.side !== 'party'
      || ![actor.defense, target.defense].every(value => Number.isInteger(value) && value >= 0 && value <= 65535))
    return {missing: ['占位：碰撞缺少双方的完整防御值']};
  const reflected = target.defense >= actor.defense;
  return {amount: Math.abs(target.defense - actor.defense), reflected,
    visualHandle: 'attack-visual:00', resultControlBeforeDamage: reflected ? 0 : 1,
    missing: []};
}

/** FE 按状态查带符号阈值，负值才消费显式阈值，再以随机高字节低四位选择记录。 */
export function battleResultStateBranch(operation, {readState, readThreshold, random} = {}) {
  if (operation?.kind !== 'state-branch' || ![0, 2, 4].includes(operation.selector))
    return {missing: ['占位：结果条件状态源未确认']};
  const state = readState?.(operation.selector);
  if (!Number.isInteger(state) || state < 0 || state > 255)
    return {missing: ['占位：本次人物的结果条件状态缺失']};
  // B212 的三个已确认表项为 06/03/00，其余索引须由字段对象提供原像。
  const tableValue = readThreshold ? readThreshold(state) : [6, 3, 0][state];
  if (!Number.isInteger(tableValue) || tableValue < 0 || tableValue > 255)
    return {missing: ['占位：结果条件阈值表索引未确认']};
  const explicit = Boolean(tableValue & 128);
  const operands = operation.operands;
  const threshold = explicit ? operands?.[0] : tableValue;
  const pass = operands?.[explicit ? 1 : 0], fail = operands?.[explicit ? 2 : 1];
  if (![threshold, pass, fail].every(value => Number.isInteger(value) && value >= 0 && value <= 255))
    return {missing: ['占位：结果条件分支缺少本次消费的操作数']};
  if (typeof random?.next !== 'function') return {missing: ['占位：结果条件分支缺少本次随机状态']};
  const roll = random.next();
  if (!Number.isInteger(roll) || roll < 0 || roll > 255)
    return {missing: ['占位：结果条件分支的随机字节无效']};
  return {handle: resultHandle((roll & 15) >= threshold ? pass : fail),
    threshold, consumed: explicit ? 3 : 2, missing: []};
}

// 状态关联只遍历已确认的引用指令；未解码的正文不推断效果。
export function battleResultStatusEffects(record, resolveRecord, seen = new Set()) {
  if (!record || seen.has(record.handle)) return [];
  seen.add(record.handle);
  const raw = record.raw_bytes || [];
  const bytes = raw[0] === 0xDA ? raw.slice(1) : raw;
  if (bytes.length === 2 && ((bytes[0] === 0xF9 && bytes[1] === 4)
      || (bytes[0] === 0xFA && bytes[1] === 5))) {
    return [{status: 'acid', operation: 'apply', target: bytes[0] === 0xF9 ? 'role' : 'vehicle'}];
  }
  if (bytes.length === 5 && bytes[0] === 0xD2 && bytes[1] === 0x15
      && bytes[2] === 0xD9 && [5, 12].includes(bytes[3]) && bytes[4] === 255) {
    return [{status: 'acid', operation: 'clear', target: bytes[3] === 12 ? 'role' : 'vehicle'}];
  }
  const references = bytes.length === 4 && bytes[0] === 0xFD ? bytes.slice(2)
    : bytes.length === 3 && bytes[0] === 0xFC ? bytes.slice(1)
      : bytes.length === 2 && bytes[0] === 0xF5 ? bytes.slice(1) : [];
  return references.flatMap(id => battleResultStatusEffects(resolveRecord?.(
    `battle-result-script:${id.toString(16).toUpperCase().padStart(2, '0')}`), resolveRecord, seen));
}
