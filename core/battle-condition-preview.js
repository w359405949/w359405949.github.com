// @editor-module 异常状态正文按 17:A108/A12A 的跨记录调用顺序构造。

export function battleConditionWaitCount(statuses) {
  return statuses.reduce((count, status) => {
    if (!Number.isInteger(status) || status < 0 || status > 255)
      throw new TypeError('异常状态需要八位字段值');
    return count + Math.max(1, Array.from({length: 8}, (_, bit) => Number(Boolean(status & (1 << bit))))
      .reduce((sum, value) => sum + value, 0));
  }, 0);
}

/** 人物以 $66、所乘战车以 $67 为起点，逐位扫描并共用 $DD 游标序列。 */
export function battleConditionRecordCalls(actors, cursors) {
  if (!Array.isArray(cursors) || !cursors.length
      || cursors.some(value => !Number.isInteger(value) || value < 0 || value > 255))
    throw new TypeError('异常状态缺少已发布的游标表');
  const calls = [];
  for (const actor of actors) {
    const status = actor.status;
    if (!Number.isInteger(status) || status < 0 || status > 255)
      throw new TypeError('异常状态需要八位字段值');
    const records = [100];
    for (let bit = 0; bit < 8; bit++)
      if (status & (1 << bit)) records.push((actor.kind === 'role' ? 102 : 103) + bit);
    if (!status) records.push(101);
    for (const record of records) {
      const index = calls.length;
      if (index >= cursors.length) throw new TypeError('异常状态调用超出已确认的游标表');
      calls.push({record: `record:0A:${String(record).padStart(3, '0')}`,
        cursor: 0x240 + cursors[index], line_count: index - 1,
        provider_script_hex: {7: actor.name}});
    }
  }
  return calls;
}
