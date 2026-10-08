// @editor-module 把被引用的资源解析成登记它的界面状态。

import {state} from "../core/state.js";
import {uiEditorNodeMap} from "../views/ui-editor.js";

export function uiEditorScreenForResource(uid) {
  const document = state.project?.ui?.editor;
  if (!document?.screens?.length) return null;
  const nodes = uiEditorNodeMap(document);
  const matches = value => value === uid || String(value || "").endsWith(`:${uid}`);
  for (const screen of document.screens) {
    if ((screen.references || []).some(reference => matches(reference.target))) return screen;
    const pending = [screen.root_node];
    const visited = new Set();
    while (pending.length) {
      const nodeId = pending.pop();
      if (!nodeId || visited.has(nodeId)) continue;
      visited.add(nodeId);
      const node = nodes.get(nodeId);
      if (!node) continue;
      if (matches(node.source?.resource_uid)) return screen;
      if ((node.references || []).some(reference => matches(reference.target))) return screen;
      pending.push(...(node.children || []));
    }
  }
  return null;
}
