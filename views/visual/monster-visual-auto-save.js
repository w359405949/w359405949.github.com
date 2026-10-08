// @editor-module 为怪物视觉作者面板共享一条串行自动保存队列。
// monster-visual-layout 的四块作者面板同屏出现，并且共同写一份资源。它们必须共用一条
// createAutoSave 队列；各建一条会让两个面板在同一防抖窗口后并发读到同一个版本。

import {createAutoSave} from "../../core/auto-save.js";

const monsterVisualAutoSave = createAutoSave(
  payload => payload.write(payload),
  {onError: (error, key) => key.onError?.(error)},
);
