// @editor-module 提供 DOM 查询、转义、格式化与文字输入事件绑定。


export const $ = (selector) => document.querySelector(selector);
export const esc = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));
export {hex} from "./number-format.js";
export const bytes = (value) => value >= 1024 ? `${(value / 1024).toFixed(value % 1024 ? 1 : 0)} KiB` : `${value} B`;

/** 组字期间保留输入原文，结束后恢复长度限制并处理已提交文字。 */
export function bindTextInputEvents(root, {selector = null, onInput = null, onChange = null} = {}) {
  if (!root) return;
  const composing = new WeakMap();
  const target = event => selector ? event.target.closest?.(selector) : event.target;
  const limit = (input, selection = null) => {
    const maximum = input.maxLength;
    if (!Number.isInteger(maximum) || maximum < 0 || input.value.length <= maximum) return;
    const prefix = selection?.prefix ?? '';
    const suffix = selection?.suffix ?? '';
    const preserve = input.value.startsWith(prefix) && input.value.endsWith(suffix)
      && prefix.length + suffix.length <= maximum;
    const available = preserve ? maximum - prefix.length - suffix.length : maximum;
    const source = preserve ? input.value.slice(prefix.length, input.value.length - suffix.length) : input.value;
    let text = '';
    for (const character of source) {
      if (text.length + character.length > available) break;
      text += character;
    }
    input.value = preserve ? prefix + text + suffix : text;
    const caret = preserve ? prefix.length + text.length : text.length;
    input.setSelectionRange?.(caret, caret);
  };
  root.addEventListener('compositionstart', event => {
    const input = target(event);
    if (!input || composing.has(input)) return;
    const maximum = input.getAttribute('maxlength');
    composing.set(input, {maximum,
      prefix: maximum === null ? '' : input.value.slice(0, input.selectionStart),
      suffix: maximum === null ? '' : input.value.slice(input.selectionEnd)});
    input.removeAttribute('maxlength');
  });
  root.addEventListener('input', event => {
    const input = target(event);
    if (!input || event.isComposing || composing.has(input)) return;
    limit(input);
    onInput?.(event);
  });
  root.addEventListener('compositionend', event => {
    const input = target(event);
    if (!input) return;
    const selection = composing.get(input);
    composing.delete(input);
    const maximum = selection?.maximum;
    if (maximum !== null && maximum !== undefined) input.setAttribute('maxlength', maximum);
    limit(input, selection);
    onInput?.(event);
  });
  if (onChange) root.addEventListener('change', event => {
    const input = target(event);
    if (!input || event.isComposing || composing.has(input)) return;
    limit(input);
    onChange(event);
  });
}
