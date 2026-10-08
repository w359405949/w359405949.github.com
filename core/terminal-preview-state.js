// @editor-module 终端输入与随机抽奖结果只保留在共享预览上下文。
import {interfacePreviewContext} from './interface-preview-context.js';

export function terminalPreviewState(preview) {
  const context = interfacePreviewContext();
  const source = preview.facility_screen;
  const command = source?.resource_id || preview.source_branch?.split(':').slice(0, 2).join(':');
  const argument = preview.facility_call_context?.argument ?? preview.runtime_context?.facility_instance
    ?? context.service?.argument ?? 0;
  const entry = source?.entry_handle || preview.facility_call_context?.entryHandle || '';
  const key = source?.kind === 'controller' ? `${command}:${entry}` : `${command}:${argument}:${entry}`;
  const selections = context.terminalSelections ||= new Map();
  if (!selections.has(key)) selections.set(key, {passwordInput: '', lotteryResult: 'lose', tradeResult: 'rejected'});
  return selections.get(key);
}
