// @editor-module 对话分页、滚屏与等待标记共用所属文字参数。
export function dialogueNextLine(cursor, lineOrigin, lines, runtime) {
  const nextLines = (lines + 1) & 255;
  const scroll = nextLines > runtime.visible_lines;
  return {lines: nextLines, scroll,
    cursor: ((cursor & ~31) + runtime.line_step + lineOrigin
      - (scroll ? runtime.cursor_retreat : 0)) & 1023};
}

export function dialogueScrollPasses(lineOrigin, {scroll}) {
  return Array.from({length: scroll.passes}, () => ({source: scroll.source_origin + lineOrigin,
    target: scroll.source_origin + lineOrigin - scroll.row_retreat,
    width: scroll.width, rows: scroll.rows, source_step: scroll.source_step, target_step: scroll.target_step}));
}

export function dialogueWaitPosition(cursor, lineOrigin, {wait}) {
  const row = ((((0x6000 + cursor - wait.cursor_retreat) & 65535) >> wait.row_shift) + 1) & 255;
  return row * 32 + lineOrigin + wait.column_bias;
}

export function dialogueWaitTile(counter, {wait}, clear = false) {
  return clear ? wait.clear_tile : counter & wait.frame_mask ? wait.hidden_tile : wait.tile;
}
