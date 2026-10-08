// @editor-module 状态图按领域提供的暂停、控制与分支声明折叠并保留原始转移。
export function foldInterfaceStateGraph(adapter) {
  const nodes = new Map(), transitions = [], queue = [], initializations = [], boundaries = [];
  const walk = (from, location, controls, declarations, input, visited, steps = []) => {
    const current = adapter.enter(location);
    if (!current) return;
    const key = adapter.positionKey(current);
    if (visited.has(key)) {
      boundaries.push({from: from?.id ?? null, location: current, reason: 'no-progress-cycle'});
      return;
    }
    const seen = new Set([...visited, key]);
    const node = adapter.pause(current);
    if (node) {
      if (!nodes.has(node.id)) {nodes.set(node.id, node); queue.push(node);}
      const setup = adapter.setup(current);
      if (from) transitions.push({from: from.id, to: node.id, controls,
        arrival: current.control, declarations: [...declarations, ...setup], input: input || '继续', steps});
      else initializations.push({to: node.id, controls, declarations: [...declarations, ...setup], steps});
      return;
    }
    const nextControls = controls.at(-1) === current.control ? controls : [...controls, current.control];
    for (const branch of adapter.branches(current)) {
      const effects = [...declarations, ...branch.declarations];
      const nextSteps = [...steps, {location: current, input: branch.input,
        condition: branch.condition ?? null, effects: branch.effects || [],
        call: branch.call ?? null, returnTo: branch.returnTo ?? null, evidence: branch.evidence ?? adapter.evidence}];
      if (branch.exit) transitions.push({from: from?.id ?? null, to: null,
        controls: nextControls, declarations: effects, input: input || branch.input || '继续 / 返回', steps: nextSteps});
      else walk(from, branch.location, nextControls, effects, branch.input || input, seen, nextSteps);
    }
  };
  walk(null, adapter.entry, [], [], null, new Set());
  const entry = nodes.values().next().value?.id;
  for (let index = 0; index < queue.length; index++) {
    const node = queue[index], continuation = adapter.resume(node);
    walk(node, continuation.location, continuation.controls, [], continuation.input, new Set());
  }
  const raw = transitions.filter(edge => edge.from).map((edge, index) => ({...edge, id: `transition:${index}`,
    evidence: adapter.evidence,
    executable: false}));
  const merged = new Map();
  for (const route of raw) {
    const id = `${route.from}>${route.to || 'exit'}:${route.input}`;
    if (!merged.has(id)) merged.set(id, {id, from: route.from, to: route.to, input: route.input, routes: []});
    merged.get(id).routes.push(route);
  }
  const edges = [...merged.values()].map(edge => ({...edge,
    unknown: edge.routes.some(route => route.declarations.some(row => !row.confirmed)),
    condition: [...new Set(edge.routes.flatMap(route => route.declarations.map(row => row.label)))].join('；'),
    evidence: adapter.evidence}));
  return {nodes: [...nodes.values()], edges, transitions: raw, entry, initializations, boundaries};
}

export function publishedInterfaceStateGraph({previews, accepts, node, fallback}) {
  const nodes = previews.filter(accepts).map(node);
  if (!nodes.length) nodes.push(fallback);
  return {nodes, edges: [], transitions: [], entry: nodes[0]?.id, initializations: [], boundaries: []};
}

export function interfaceGraphConnections(graph, selected, pathEdges) {
  const merged = new Map();
  for (const edge of graph.edges) {
    if (!selected.fullGraph && edge.from !== selected.node && edge.to !== selected.node && !pathEdges.has(edge.id)) continue;
    const key = JSON.stringify([edge.from, edge.to]);
    if (!merged.has(key)) merged.set(key, {from: edge.from, to: edge.to, members: []});
    merged.get(key).members.push(edge);
  }
  return [...merged.values()].map(connection => ({...connection, id: connection.members[0].id,
    input: [...new Set(connection.members.map(edge => edge.input))].join(' / '),
    condition: [...new Set(connection.members.map(edge => edge.condition).filter(Boolean))].join('；'),
    unknown: connection.members.some(edge => edge.unknown),
    annotation: [...new Set(connection.members.map(edge => edge.annotation).filter(Boolean))].join('；'),
    selected: connection.members.some(edge => edge.id === selected.edge),
    onPath: connection.members.some(edge => pathEdges.has(edge.id))}));
}

export function fullInterfaceGraphPositions(graph) {
  const depths = new Map([[graph.entry, 0]]), queue = [graph.entry];
  while (queue.length) {
    const from = queue.shift();
    for (const edge of graph.edges.filter(edge => edge.from === from && edge.to)) {
      if (depths.has(edge.to)) continue;
      depths.set(edge.to, depths.get(from) + 1); queue.push(edge.to);
    }
  }
  const rows = new Map(), positions = new Map();
  for (const node of graph.nodes) {
    const column = depths.get(node.id) ?? Math.max(0, ...depths.values()) + 1;
    const row = rows.get(column) || 0; rows.set(column, row + 1);
    positions.set(node.id, {x: 24 + column * 360, y: 32 + row * 96});
  }
  if (graph.edges.some(edge => edge.to === null)) positions.set(null,
    {x: Math.max(24, ...[...positions.values()].map(position => position.x)) + 360, y: 32});
  return positions;
}

export function nearbyInterfaceGraphPositions(graph, selected, links, active) {
  const positions = new Map(), activeNodes = new Set([selected.node]);
  const path = [...new Set(active?.nodes || [])], focusIndex = path.indexOf(selected.node);
  const focusColumn = Math.max(1, focusIndex);
  positions.set(selected.node, {x: 24 + focusColumn * 416, y: 32});
  const columnOf = id => path.includes(id) ? path.indexOf(id) + (focusIndex === 0 ? 1 : 0)
    : links.some(link => link.to === id && link.from === selected.node) ? focusColumn + 1 : focusColumn - 1;
  for (const [index, link] of links.entries()) for (const id of [link.from, link.to]) {
    activeNodes.add(id);
    if (!positions.has(id)) positions.set(id, {x: 24 + columnOf(id) * 416, y: 32 + index * 72});
  }
  for (const [index, node] of graph.nodes.filter(node => node.navigationOnly).entries()) {
    activeNodes.add(node.id);
    positions.set(node.id, {x: 24, y: 32 + index * 72});
  }
  const restY = 128 + links.length * 72;
  let rest = 0;
  for (const node of graph.nodes) if (!positions.has(node.id)) {
    positions.set(node.id, {x: 24 + rest % 4 * 240, y: restY + Math.floor(rest / 4) * 72}); rest++;
  }
  return {positions, activeNodes};
}
