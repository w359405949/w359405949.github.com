// @editor-module 战斗表现子模式的背景闪烁与扫描线揭示。

import {renderCodeFields} from '../core/render-code-sources.js';

export async function battlePresentationParameters(readField) {
  const fields = await renderCodeFields(['blink-frames', 'reveal-frames', 'reveal-first-latch',
    'reveal-latch-step', 'reveal-bottom'], readField);
  return Object.fromEntries(Object.entries(fields).map(([name, field]) => [name, field.value]));
}

export function battlePresentationFrame(submode, frame, parameters) {
  if (![1, 4].includes(submode)) return {count: 0, visible: true};
  const names = submode === 1 ? ['blink-frames']
    : ['reveal-frames', 'reveal-first-latch', 'reveal-latch-step', 'reveal-bottom'];
  if (names.some(name => !Number.isInteger(parameters?.[name])))
    throw new TypeError('缺少战斗表现子模式参数');
  const count = parameters[submode === 1 ? 'blink-frames' : 'reveal-frames'];
  const index = Math.max(0, Math.min(count, Math.floor(frame)));
  if (submode === 1) return {count, visible: index < count && index % 2 === 1};
  // MMC3 扫描线锁存值以零起算，切换后的首行是锁存值加一。
  if (submode === 4) return {count, visible: true, clip: {
    top: parameters['reveal-first-latch'] + 1 - parameters['reveal-latch-step'] * index,
    bottom: parameters['reveal-bottom'],
  }};
  return {count: 0, visible: true};
}
