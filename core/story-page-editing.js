// @editor-module 剧情页指令编辑的游标重排与分支目标保护。

export function changeStoryPageInstructions(program, scripts, {action, cursor, bytes, targets = {}}) {
  const rows = program.instructions.map(instruction => ({instruction: structuredClone(instruction), origin: instruction.cursor}));
  const index = rows.findIndex(row => row.origin === cursor);
  if (index < 0 && action !== 'append') throw new TypeError('指令已删除');
  const fromBytes = position => scripts.instructionFromCommand({cursor: position, opcode: bytes[0], currentOperands: bytes.slice(1)});
  let inserted = null;
  if (action === 'insert' || action === 'insert-after' || action === 'append') {
    inserted = {instruction: fromBytes(0), origin: null};
    rows.splice(action === 'append' ? rows.length : index + (action === 'insert-after' ? 1 : 0), 0, inserted);
  } else if (action === 'copy') {
    rows.splice(index + 1, 0, {instruction: structuredClone(rows[index].instruction), origin: null});
  } else if (action === 'replace') {
    inserted = rows[index];
    inserted.instruction = {...fromBytes(cursor), ...(inserted.instruction.effect ? {effect: inserted.instruction.effect} : {})};
  } else if (action === 'delete') {
    if (rows.length === 1) throw new TypeError('指令序列须保留结束指令');
    if (rows.some(row => row.origin !== cursor && row.instruction.arguments.some(argument => argument.value?.target === cursor)))
      throw new TypeError('指令仍是分支目标');
    rows.splice(index, 1);
  } else if (action === 'up' || action === 'down') {
    const next = index + (action === 'up' ? -1 : 1);
    if (next < 0 || next >= rows.length) return program.instructions;
    [rows[index], rows[next]] = [rows[next], rows[index]];
  } else throw new TypeError('未知指令操作');
  const positions = new Map();
  let position = 0;
  for (const row of rows) {
    if (row.origin !== null) positions.set(row.origin, position);
    row.position = position;
    position += scripts.bytesFor(row.instruction).length;
  }
  if (position > 256) throw new TypeError('指令超过 256 字节容量');
  for (const row of rows) {
    row.instruction.cursor = row.position;
    row.instruction.arguments.forEach((argument, index) => {
      if (!argument.value || typeof argument.value !== 'object' || !Object.hasOwn(argument.value, 'target')) return;
      const target = row === inserted && Object.hasOwn(targets, index + 1) ? Number(targets[index + 1]) : argument.value.target;
      if (!positions.has(target)) throw new TypeError('分支目标须为现有指令');
      argument.value = {target: positions.get(target)};
    });
  }
  const instructions = rows.map(row => row.instruction);
  scripts.serializeProgram({...program, instructions});
  return instructions;
}
