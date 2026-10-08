// @editor-module 应用正文引用沿当前流程的分支关系解析。
export function applicationFlowTextHandle(document, segmentId, selectBranch = () => 0) {
  const flow = document?.dialogue_flow;
  const visited = new Set();
  let id = segmentId;
  while (id && !visited.has(id)) {
    visited.add(id);
    const segment = flow?.segments?.find(row => row.id === id);
    if (!segment) throw new TypeError(`应用流程缺少段 ${id}`);
    const action = segment.actions?.find(row => row.kind === 'text-record'
      && row.source === 'application-vm-literal');
    if (action) return `application-command:${Number(document.command_id).toString(16)
      .toUpperCase().padStart(2, '0')}:text-record:${action.prg_offset}`;
    const successors = segment.terminator?.successor_segment_ids;
    const branch = successors?.length === 1 ? 0 : selectBranch(segment.terminator);
    if (!Number.isInteger(branch) || !successors?.[branch])
      throw new TypeError(`应用流程缺少正文分支 ${id}`);
    id = successors[branch];
  }
  throw new TypeError('应用流程缺少可达的正文引用');
}
