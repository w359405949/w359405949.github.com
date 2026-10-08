// @editor-module 文本字段对象将当前正文的确认位置与选择后继投影给对话适配器。
import {decodeFixedTextRecord, textRecord, textRecordNodeId} from './text-record-project.js';

export function textDialogueProgram(document, encoding, reference) {
  const pauses = [];
  const visit = (recordId, ancestors = []) => {
    if (ancestors.includes(recordId)) {
      pauses.push({kind: 'unknown', record: recordId, reason: '正文引用循环'}); return;
    }
    const record = textRecord(document, recordId);
    if (!record) {pauses.push({kind: 'unknown', record: recordId, reason: '正文记录缺失'}); return;}
    for (const command of decodeFixedTextRecord(record, encoding).commands) {
      const token = command.token, offset = command.offset;
      if (token === 0xE3 || token === 0xEB) {
        pauses.push({kind: 'choice', record: recordId, offset, branch: token === 0xEB}); return;
      }
      if (token === 0xE4 || [0xFE, 0xF0].includes(token) && command.repeat_role !== 'delimiter')
        pauses.push({kind: 'wait', record: recordId, offset});
      if ([0xF5, 0xE6, 0xF4].includes(token)) {
        pauses.push({kind: 'unknown', record: recordId, offset,
          reason: '正文动作或重复调用须交接所属执行器'}); return;
      }
      const region = ({[0xF2]: 0x09, [0xF3]: 0x11, [0xEA]: 0x13, [0xEC]: 0x14})[token];
      if (region !== undefined || token === 0xF7) {
        visit(textRecordNodeId(region ?? command.operands[1], command.operands[0]), [...ancestors, recordId]);
        if (['choice', 'unknown'].includes(pauses.at(-1)?.kind)) return;
      }
    }
  };
  visit(reference);
  if (!['choice', 'unknown'].includes(pauses.at(-1)?.kind)) pauses.push({kind: 'wait', record: reference, terminal: true});
  return pauses.map((pause, ordinal) => ({...pause, ordinal,
    confirmedWaits: pauses.slice(0, ordinal).filter(row => row.kind === 'wait').length,
    evidence: `${pause.record}${pause.offset === undefined ? '/return-confirmation' : `/bytes:${pause.offset}`}`}));
}

export function textDialogueSuccessor(document, encoding, pause, value) {
  const record = textRecord(document, pause.record);
  if (![0, 1].includes(value)) throw new TypeError('对话选择超出当前输入域');
  const id = record.bytes[pause.offset + 1 + value];
  if (!Number.isInteger(id)) throw new TypeError('对话选择后继未确认');
  return id === 0xFF ? null : textRecordNodeId(record.region_id, id);
}
