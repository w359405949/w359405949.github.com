// @editor-module 修理保留战车标题行与设备行并在接受报价后清除损坏位。
export function specialRepairServiceDomain(fields, {block, branch}) {
  const {get, put, vehicles, damaged, formula, equipmentState} = fields;
  const scan = state => {
    const rows = damaged(state), entries = [];
    for (const vehicle of vehicles(state)) {
      const parts = rows.filter(row => row.vehicle === vehicle);
      if (parts.length) entries.push({vehicle, header: true}, ...parts);
    }
    state.execution.repairEntries = entries;
    return entries;
  };
  const bind = (state, row) => {
    if (!row || row.header) throw new TypeError('当前修理行不是设备');
    state.context.vehicle = row.vehicle;
    state.execution.weapon = row.index;
    state.execution.repairTarget = row;
    state.execution.quote = formula(state, 'current-repair-cost');
  };
  const repair = (state, rows) => {
    for (const row of rows.filter(row => !row.header)) {
      const path = `vehicle.${row.vehicle}.equipment_state.${row.part}`;
      equipmentState(state, row.vehicle, row.part, get(state, path) & 63);
    }
    state.execution.transactions.push({type: 'repair', targets: structuredClone(rows.filter(row => !row.header)),
      quote: state.execution.quote});
    scan(state);
  };
  return {
    scan,
    operate(state, operation, segment) {
      const e = state.execution, op = operation.opcode;
      if (op === 0xF6) {
        const entries = scan(state);
        e.repairRowCount = entries.length;
        return branch(state, segment, entries.length === 0 ? 0 : entries.length === 2 ? 2 : 1);
      }
      if (op === 0xA0) {bind(state, scan(state)[1]); e.branch = 0; return;}
      if (op === 0xA1 || op === 0xA3) {scan(state); e.repairChoice = 0; e.scope = 0; return;}
      if (op === 0xA2) {
        const entries = e.repairEntries;
        if (!entries?.length) return block(state, '空修理列表的原生计数回绕未确认');
        e.quote = entries.filter(row => !row.header).reduce((total, row) => {
          bind(state, row); return (total + e.quote) % 0x1000000;
        }, 0);
        return;
      }
      if (op === 0xED) {
        const row = e.repairEntries[e.repairChoice];
        if (!row || row.header) return branch(state, segment, 0);
        bind(state, row); return branch(state, segment, 1);
      }
      if (op === 0xBE) {
        if (!e.repairTarget) return block(state, '单项修理缺少设备行');
        repair(state, [e.repairTarget]); return;
      }
      if (op === 0xA4) {repair(state, e.repairEntries || []); return;}
      return false;
    },
  };
}
