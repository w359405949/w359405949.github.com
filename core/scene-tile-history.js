// @editor-module 场景图块编辑按笔撤销与重做。

const copyMap = map => map.map(row => [...row]);

export function createSceneTileHistory(limit = 50) {
  const undo = [];
  const redo = [];
  let stroke = null;
  return {
    begin(map) {
      stroke = {map: copyMap(map), changed: false};
    },
    changed() {
      if (!stroke || stroke.changed) return;
      undo.push(stroke.map);
      if (undo.length > limit) undo.shift();
      redo.length = 0;
      stroke.changed = true;
    },
    end() {
      stroke = null;
    },
    undo(map) {
      if (stroke || !undo.length) return null;
      redo.push(copyMap(map));
      return undo.pop();
    },
    redo(map) {
      if (stroke || !redo.length) return null;
      undo.push(copyMap(map));
      return redo.pop();
    },
    clear() {
      undo.length = 0;
      redo.length = 0;
      stroke = null;
    },
    get canUndo() { return !stroke && undo.length > 0; },
    get canRedo() { return !stroke && redo.length > 0; },
  };
}
