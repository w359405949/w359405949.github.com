// @editor-module 镜片按已确认的逆序匹配表计算组合并保留借用标志。
const combinations = [
  [[255, 255, 255, 0xBA], 0x26], [[0, 255, 255, 255], 0x25],
  [[0, 0xBC, 0xBA, 0xB9], 0x24], [[0, 0xBB, 0xBA, 0xB9], 0x24],
  [[0, 0xBC, 0xBB, 0xBA], 0x24], [[0, 0xBC, 0xBB, 0xB9], 0x24],
  [[0, 0xB9, 0xBB, 0xBC], 0x23], [[0, 0xBA, 0xBB, 0xBC], 0x23],
  [[0, 0xB9, 0xBA, 0xBB], 0x23], [[0, 0xB9, 0xBA, 0xBC], 0x23],
  [[0xB9, 0xBC, 0xBA, 0xBB], 0x28],
];

function specialLensCombination(arrangement) {
  if (!Array.isArray(arrangement) || arrangement.length !== 4
      || arrangement.some(id => ![0, 0xB9, 0xBA, 0xBB, 0xBC].includes(id)))
    throw new TypeError('镜片排列超出已确认的四槽域');
  const packed = [...arrangement].reverse().filter(Boolean);
  if (packed.length < 3) throw new TypeError('少于三枚镜片的组合依赖未确认的临时缓冲');
  while (packed.length < 4) packed.push(0);
  return [...combinations].reverse().find(([pattern]) => pattern.every((id, index) =>
    id === 255 || id === [...packed].reverse()[index]))?.[1] ?? 0x27;
}

export function specialLensServiceDomain(fields, {block, branch, changeSegment}) {
  const {get, put, roles, rolePath} = fields;
  const flag = id => `global_event_flag.${id.toString(16).toUpperCase().padStart(2, '0')}`;
  const laser = state => roles(state).flatMap(role => {
    const path = `role.${['hunter', 'mechanic', 'soldier'][role]}.equipment`;
    return [...get(state, path)].map((id, index) => ({path, index, id})).filter(row => row.id >= 0x23 && row.id < 0x29);
  })[0];
  return (state, operation, segment) => {
    const e = state.execution, op = operation.opcode;
    if (op === 0x9F) {
      e.availableLenses = [];
      for (const id of [0xB9, 0xBA, 0xBB, 0xBC]) {
        const found = roles(state).find(role => get(state, `role.${['hunter', 'mechanic', 'soldier'][role]}.inventory`).includes(id));
        if (get(state, flag(id))) {e.availableLenses.push(id); continue;}
        if (found === undefined) continue;
        const path = `role.${['hunter', 'mechanic', 'soldier'][found]}.inventory`;
        const values = [...get(state, path)], index = values.indexOf(id);
        values.splice(index, 1); values.push(0); put(state, path, values); put(state, flag(id), 1);
        e.availableLenses.push(id);
      }
      e.choice = e.availableLenses.length;
      return;
    }
    if (op === 0xD2) {
      const callback = operation.operands[0] | operation.operands[1] << 8;
      if (callback === 0xA7BB) return;
      if (callback === 0xB169) {e.arrangement = [0, 0, 0, 0]; e.lensIndex = 0; return;}
      if (callback === 0xB221) {
        e.lens = e.availableLenses[e.lensIndex++];
        return changeSegment(state, e.lens ? 9 : 10);
      }
      if (callback === 0xB1A1) {
        if (e.arrangement[e.lensPosition] === 0) {
          e.arrangement[e.lensPosition] = e.lens;
          return changeSegment(state, 8);
        }
        return changeSegment(state, 9);
      }
      if (callback === 0xEF02) {
        e.item = specialLensCombination(e.arrangement);
        state.domainResults.laser = {arrangement: [...e.arrangement], item: e.item}; return;
      }
      if (callback === 0xB1B9) {e.laserTarget = laser(state); e.branch = e.laserTarget ? 0 : 1; return;}
      if (callback === 0xB1D5) {
        const target = laser(state);
        if (!target) return block(state, '镜片结果缺少当前携带激光炮');
        const values = [...get(state, target.path)]; values[target.index] = e.item; put(state, target.path, values);
        e.transactions.push({type: 'laser', item: e.item, arrangement: [...e.arrangement]}); return;
      }
    }
    if (op === 0xBA) {e.branch = get(state, `${rolePath(state)}.inventory`).at(-1) ? 1 : 0; return;}
    if (op === 0x9D) {
      const values = [...get(state, `${rolePath(state)}.inventory`)];
      const index = values.indexOf(0);
      if (index < 0) return block(state, '激光炮交付缺少空栏');
      values[index] = e.item; put(state, `${rolePath(state)}.inventory`, values);
      e.transactions.push({type: 'laser', item: e.item, arrangement: [...e.arrangement]}); return;
    }
    return false;
  };
}
