// @editor-module 终端组件详情的输入与抽奖选择只改变预览。
import {bindTextInputEvents, esc} from '../core/dom.js';
import {terminalPreviewState} from '../core/terminal-preview-state.js';
import {state} from '../core/state.js';
import {interfacePreviewContext} from '../core/interface-preview-context.js';
import {itemPickerFieldMarkup, hydrateItemPickers} from './item-picker.js';

export function terminalPreviewInputsMarkup(preview) {
  const screen = preview?.facility_screen;
  if (preview?.vehicle_trade) {
    const selection = terminalPreviewState(preview);
    return `<div data-terminal-preview="${esc(JSON.stringify({source_branch: preview.source_branch,
      facility_call_context: preview.facility_call_context}))}">
      <label>预览报价 <input type="number" min="0" max="9999999" data-trade-amount value="${interfacePreviewContext().service_amount ?? preview.vehicle_trade.default_amount ?? 0}"></label>
      ${preview.vehicle_trade.kind === 'decision' ? `<label>成交结果（随机） <select data-trade-result>
        ${[['rejected', '拒绝'], ['accepted', '成交']].map(([value, label]) =>
          `<option value="${value}"${selection.tradeResult === value ? ' selected' : ''}>${label}</option>`).join('')}
      </select></label>` : ''}</div>`;
  }
  if (!screen || !(screen.expected_handler === 9 || preview.terminal_response?.lottery)) return '';
  const selection = terminalPreviewState(preview);
  const binding = {facility_screen: screen, facility_call_context: preview.facility_call_context,
    runtime_context: preview.runtime_context};
  return `<div data-terminal-preview="${esc(JSON.stringify(binding))}">${screen.expected_handler === 9
    ? `<label>预览输入 <input type="text" inputmode="numeric" maxlength="6" pattern="[0-9]*" data-terminal-password-input value="${esc(selection.passwordInput)}"></label>`
    : `<label>抽奖结果（随机） <select data-terminal-lottery-result>${[['lose', '未中奖'], ['win', '中奖']].map(([value, label]) =>
      `<option value="${value}"${selection.lotteryResult === value ? ' selected' : ''}>${label}</option>`).join('')}</select></label>
      <label>预览奖品 ${itemPickerFieldMarkup({records: state.project?.game_data?.items?.records || [],
        value: selection.lotteryPrize ?? '', label: '预览奖品', emptyValue: '', emptyLabel: '当前配置',
        controlMarkup: `<input type="hidden" data-terminal-lottery-prize value="${esc(selection.lotteryPrize ?? '')}">`})}</label>`}</div>`;
}

export function bindTerminalPreviewInputs(root, {repaint = () => {}} = {}) {
  for (const host of root.querySelectorAll('[data-terminal-preview]')) {
    if (host.dataset.terminalPreviewMounted) continue;
    host.dataset.terminalPreviewMounted = '1';
    const selection = terminalPreviewState(JSON.parse(host.dataset.terminalPreview));
    const amount = host.querySelector('[data-trade-amount]');
    if (amount) amount.oninput = () => {
      const value = Number(amount.value);
      if (!Number.isInteger(value) || value < 0 || value > 9999999) return;
      interfacePreviewContext().service_amount = value;
      void repaint();
    };
    const trade = host.querySelector('[data-trade-result]');
    if (trade) trade.onchange = () => {
      selection.tradeResult = trade.value;
      void repaint();
    };
    const password = host.querySelector('[data-terminal-password-input]');
    bindTextInputEvents(password, {onInput: () => {
      password.value = password.value.replace(/[^0-9]/gu, '').slice(0, 6);
      selection.passwordInput = password.value;
      void repaint();
    }});
    const lottery = host.querySelector('[data-terminal-lottery-result]');
    if (lottery) lottery.onchange = () => {
      selection.lotteryResult = lottery.value;
      void repaint();
    };
    const prize = host.querySelector('[data-terminal-lottery-prize]');
    if (prize) prize.onchange = () => {
      selection.lotteryPrize = prize.value === '' ? null : Number(prize.value);
      void repaint();
    };
    hydrateItemPickers(host);
  }
}
