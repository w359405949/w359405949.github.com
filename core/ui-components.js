// @editor-module 从当前 UI 布局单元的交集推导公共窗口组件。
// Public windows derived from the current UI layout model. No published cache.
// The set algorithm treats each layout cell as an opaque identity; only the
// layout adapter reads/writes the existing logical-cell representation.

const MIN_SHARED_CELLS = 8;
const MIN_MEMBER_RECORDS = 2;
const compare = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const intersection = (left, right) => new Set([...left].filter(value => right.has(value)));
const groupKey = members => JSON.stringify([...members].sort(compare));

function closedRecordGroups(records) {
  const owners = new Map();
  for (const [id, cells] of records) {
    for (const cell of cells) {
      if (!owners.has(cell)) owners.set(cell, new Set());
      owners.get(cell).add(id);
    }
  }
  const seeds = new Map();
  for (const members of owners.values()) {
    if (members.size >= MIN_MEMBER_RECORDS) seeds.set(groupKey(members), members);
  }
  const closed = new Map(seeds);
  let frontier = [...seeds.values()];
  while (frontier.length) {
    const fresh = [];
    for (const left of frontier) {
      for (const right of seeds.values()) {
        const meet = intersection(left, right);
        if (meet.size < MIN_MEMBER_RECORDS) continue;
        const key = groupKey(meet);
        if (closed.has(key)) continue;
        closed.set(key, meet);
        fresh.push(meet);
      }
    }
    frontier = fresh;
  }
  // Equal scores use the ordered member identities, independent of insertion
  // order or the host's set iteration. Component IDs follow this stable order.
  return [...closed].sort(([left], [right]) => compare(left, right)).map(([, group]) => group);
}

function factorComponents(records) {
  const remaining = new Map([...records].map(([id, cells]) => [id, new Set(cells)]));
  const components = [];
  while (true) {
    let best = null;
    for (const group of closedRecordGroups(remaining)) {
      const members = [...group].sort(compare);
      let shared = new Set(remaining.get(members[0]));
      for (const member of members.slice(1)) shared = intersection(shared, remaining.get(member));
      if (shared.size < MIN_SHARED_CELLS) continue;
      const saved = shared.size * (members.length - 1);
      if (!best || saved > best.saved_cells) best = {members, cells: shared, saved_cells: saved};
    }
    if (!best) return components;
    components.push(best);
    for (const member of best.members) {
      for (const cell of best.cells) remaining.get(member).delete(cell);
    }
  }
}

function layoutCells(layout, values) {
  const cells = new Set();
  for (const pair of layout.render?.logical_tile_writes || []) {
    if (!Array.isArray(pair) || pair.length !== 2 ||
        !pair.every(value => Number.isSafeInteger(value) && value >= 0)) {
      throw new Error(`UI layout ${layout.id}: invalid logical cell`);
    }
    const key = JSON.stringify(pair);
    values.set(key, pair.slice());
    cells.add(key);
  }
  return cells;
}

/** Build the complete component document from the published layout semantics. */
export function buildUiComponents(construction) {
  const layouts = new Map((construction?.static_assets?.layouts || []).map(layout => [String(layout.id), layout]));
  if (!layouts.size) throw new Error("UI components: no layout records");
  const widths = new Set([...layouts.values()].map(layout => layout.render?.logical_width_tiles || 0).filter(Boolean));
  if (widths.size !== 1) throw new Error("UI components: inconsistent logical layout widths");
  const [width] = widths;
  if (!Number.isSafeInteger(width) || width <= 0) throw new Error("UI components: invalid logical layout width");
  const values = new Map();
  const records = new Map();
  for (const [id, layout] of layouts) {
    const cells = layoutCells(layout, values);
    if (cells.size) records.set(id, cells);
  }
  const assigned = new Map([...records.keys()].map(id => [id, new Set()]));
  const components = factorComponents(records).map((item, index) => {
    for (const member of item.members) {
      for (const cell of item.cells) assigned.get(member).add(cell);
    }
    const writes = [...item.cells].map(cell => values.get(cell)).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const rows = writes.map(([position]) => Math.floor(position / width));
    const columns = writes.map(([position]) => position % width);
    return {
      id: `ui-component:${String(index + 1).padStart(2, "0")}`,
      kind: "shared-window",
      members: item.members,
      member_count: item.members.length,
      shared_cells: item.cells.size,
      saved_cells: item.saved_cells,
      bounds: {first_row: Math.min(...rows), last_row: Math.max(...rows),
        first_column: Math.min(...columns), last_column: Math.max(...columns)},
      logical_tile_writes: writes,
    };
  });
  const membership = [...records].sort(([a], [b]) => compare(a, b)).map(([id, cells]) => ({
    record: id,
    total_cells: cells.size,
    shared_cells: assigned.get(id).size,
    private_cells: cells.size - assigned.get(id).size,
    components: components.filter(component => component.members.includes(id)).map(component => component.id),
  }));
  const sum = (items, key) => items.reduce((total, item) => total + item[key], 0);
  return {
    schema: "metalmaxcn.ui-components",
    source_rom: construction.source_rom ?? null,
    source_sha256: construction.source_sha256 ?? null,
    method: {
      input: "static_assets.layouts[].render.logical_tile_writes",
      unit: "(logical_position, tile)",
      grouping: "closed concepts over record membership",
      selection: "greedy by shared_cells * (member_count - 1), deducted after each pick",
      min_shared_cells: MIN_SHARED_CELLS,
      min_member_records: MIN_MEMBER_RECORDS,
      note: "游戏无组件概念，公共窗口由提取结果的结构分析导出，而非 ROM 里的显式引用",
    },
    summary: {
      layout_records: records.size,
      components: components.length,
      total_cells: sum(membership, "total_cells"),
      shared_cells: sum(membership, "shared_cells"),
      private_cells: sum(membership, "private_cells"),
      saved_cells: sum(components, "saved_cells"),
      records_with_components: membership.filter(record => record.components.length).length,
    },
    components,
    records: membership,
  };
}
