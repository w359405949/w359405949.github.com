// @editor-module 终端服务显示目录排除机器码、数据表与电梯场景退出。
export function isTerminalDisplayBranch(branch) {
  if (branch.command === 'application-command:1F' && branch.id.endsWith(':segment:01')) return false;
  if (!['application-command:36', 'application-command:38'].includes(branch.command)) return true;
  const scan = branch.entry_chain?.find(row => row.role === 'segment')?.selection_scan
    || branch.segment_selection_scan;
  if (!scan) return true;
  return !(branch.execution_roles || []).some(role => ['machine-code', 'data-table'].includes(role.kind)
    && role.offset < scan.end_exclusive && scan.offset < role.offset + role.length);
}
