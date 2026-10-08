// @editor-module 时间轴轨道层级与区段边界投影。
export function timelineTreeRows(lanes) {
  const byId = new Map(lanes.map(lane => [lane.id, lane]));
  if (byId.size !== lanes.length) throw new Error("时间轴行 ID 重复");
  const children = new Map();
  for (const lane of lanes) {
    if (lane.parentId && !byId.has(lane.parentId)) throw new Error(`时间轴父轨不存在：${lane.parentId}`);
    const parent = byId.has(lane.parentId) ? lane.parentId : null;
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(lane);
  }
  const rows = [];
  const visit = (lane, depth, hidden) => {
    const descendants = children.get(lane.id) || [];
    rows.push({...lane, depth, hidden, hasChildren: descendants.length > 0});
    for (const child of descendants) visit(child, depth + 1, hidden || lane.expanded === false);
  };
  for (const lane of children.get(null) || []) visit(lane, 0, false);
  if (rows.length !== lanes.length) throw new Error("时间轴父子关系成环");
  return rows;
}

function timelineDescendants(lanes, id) {
  const descendants = [];
  const visit = parent => {
    for (const lane of lanes.filter(item => item.parentId === parent)) {
      descendants.push(lane);
      visit(lane.id);
    }
  };
  visit(id);
  return descendants;
}

export function timelineSummaryBlocks(lanes, id) {
  const frames = new Set();
  for (const lane of timelineDescendants(lanes, id)) {
    for (const block of lane.blocks || []) {
      frames.add(block.start);
      if (block.frames) frames.add(block.start + block.frames);
    }
    for (const [frame] of lane.curve?.points || []) frames.add(frame);
  }
  return [...frames].sort((a, b) => a - b).map(start => ({start, tone: "summary"}));
}

export function timelineSelectedBlocks(lanes, id, frame, blockIndex = null) {
  const lane = lanes.find(item => item.id === id);
  if (!lane) return [];
  const descendants = timelineDescendants(lanes, id);
  if (!descendants.length) return blockIndex === null ? [] : [{laneId: id, blockIndex}];
  return [...(blockIndex === null ? [] : [{laneId: id, blockIndex}]),
    ...descendants.flatMap(child => (child.blocks || []).flatMap((block, index) =>
      block.start === frame || block.frames && block.start + block.frames === frame
        ? [{laneId: child.id, blockIndex: index}] : []))];
}
