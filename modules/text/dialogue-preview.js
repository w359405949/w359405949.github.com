// @editor-module 对话正文与翻页位置由文本字段对象提供。
import {state} from '../../core/state.js';
import {decodeFixedTextRecord} from '../../core/text-record-project.js';

export function dialoguePreviewFrames(recordId) {
  const record = state.project?.text_record_edits?.records?.[recordId];
  const encoding = state.project?.text_record_encoding;
  if (!record || !encoding) return [];
  const decoded = decodeFixedTextRecord(record, encoding, {fillPlaceholders: true});
  const boundaries = decoded.commands.filter(command => command.token === 0xE4
    || [0xFE, 0xF0].includes(command.token) && command.repeat_role !== 'delimiter');
  const frames = [];
  let pageIndex = 0, confirmedWaits = 0, offset = 0;
  for (const command of [...boundaries, {offset: record.capacity, length: 0}]) {
    const length = command.offset - offset;
    const text = length > 0 ? decodeFixedTextRecord({...record, capacity: length,
      bytes: record.bytes.slice(offset, command.offset),
      protected_ranges: record.protected_ranges.filter(range => range.offset >= offset
        && range.offset + range.length <= command.offset).map(range => ({...range, offset: range.offset - offset})),
    }, encoding, {fillPlaceholders: true}).formatted_text : '';
    frames.push({pageIndex, confirmedWaits, offset, text});
    offset = command.offset + command.length;
    if ([0xE4, 0xFE, 0xF0].includes(command.token)) confirmedWaits += 1;
    if (command.token !== 0xE4) pageIndex += 1;
  }
  return frames;
}
