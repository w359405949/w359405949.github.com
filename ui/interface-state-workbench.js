// @editor-module 公共宿主调用领域来源，图、画布和字段控件沿用现有组件。
import {interfaceStateGraphMarkup, bindInterfaceStateGraph, refreshInterfaceStateGraph} from './interface-state-graph.js';
import {createInterfaceStateSource, interfaceStateSources} from '../render/interface-state-source.js';
import {navigateInternalUrl} from '../core/router.js';
import {showEditorError} from './editor-error.js';
import {db} from '../core/project-db.js';
import {state} from '../core/state.js';

const hosts = new WeakMap();
const referenceRoots = new WeakSet();
const sources = new Map();
let repository = null;

export function interfaceStateWorkbench(root) {return hosts.get(root) || null;}

function createInterfaceStateWorkbench({source, presentation, available = () => true, followReference = null}) {
  if (repository !== state.projectRepository) {sources.clear(); repository = state.projectRepository;}
  sources.set(source.identity.id, source);
  const options = () => ({graph: source.graph(), selected: source.selection(), paths: source.paths(),
    available, presentation: typeof presentation === 'function' ? presentation(source.graph()) : presentation});
  const attach = root => {
    hosts.set(root, host);
    root.dataset.stateMachineSource = source.identity.id;
    root.dataset.stateMachineDomain = source.identity.domain;
    root.dataset.stateMachineEntry = source.entry.identity.id;
    root.dataset.stateMachinePath = source.paths().find(path => path.id === source.selection().path)?.identity.id || '';
  };
  const host = {
    source,
    followReference: followReference || (async reference => {
      const route = {...reference.entry.route};
      const results = source.selection().path ? source.execution.calls()?.results : null;
      const destination = results?.scene || results?.sceneReturn?.context;
      const sceneId = destination?.sceneId ?? reference.entry.sceneId;
      if (route.view === 'scenes' && sceneId != null) {
        const scenes = await db.getDocument('project.scenes');
        const scene = scenes.editable_scenes.find(row => Number(row.id) === Number(sceneId));
        if (!scene) throw new TypeError('引用的场景入口不存在');
        route.scene = scene.slug;
        if (Number.isInteger(destination?.x) && Number.isInteger(destination?.y)) route.scenePoint = `${destination.x},${destination.y}`;
      }
      const target = sources.get(reference.sourceId);
      if (target) {
        const selected = target.selection();
        selected.path = ''; selected.node = reference.nodeId || target.graph().entry;
        delete selected.session; delete selected.previewSession;
        delete selected.adapter; delete selected.executionAdapter;
      }
      return navigateInternalUrl(`?${new URLSearchParams(route)}`);
    }),
    sources: interfaceStateSources,
    graphMarkup: () => interfaceStateGraphMarkup(options()),
    refreshGraph: root => {attach(root); return refreshInterfaceStateGraph(root, options());},
    bind(root, {cacheKey = source.identity.id} = {}) {
      attach(root);
      if (!referenceRoots.has(root)) {
        referenceRoots.add(root);
        const follow = event => {
          if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
          const element = event.target.closest('[data-state-reference]');
          const current = hosts.get(root);
          const node = element && current.source.graph().nodes.find(row => row.id === element.dataset.stateReference);
          if (!node?.reference) return;
          event.preventDefault(); event.stopImmediatePropagation();
          void Promise.resolve().then(() => current.followReference(node.reference))
            .catch(error => showEditorError(root, '状态机引用', error));
        };
        root.addEventListener('click', follow, {capture: true});
        root.addEventListener('keydown', follow, {capture: true});
      }
      return bindInterfaceStateGraph(root, {cacheKey, selected: source.selection(), presentation: options().presentation});
    },
    initialize: (...args) => source.execution.initialize?.(...args),
    inputs: (...args) => source.execution.inputs(...args),
    options: (...args) => source.execution.options(...args),
    advance: (...args) => source.execution.advance?.(...args),
    preview: (...args) => source.execution.preview?.(...args),
    calls: (...args) => source.execution.calls(...args),
    complete: (...args) => source.execution.complete(...args),
    components: () => source.components.current(),
    selectComponent: (...args) => source.components.select?.(...args),
    fields: (...args) => source.components.fields(...args),
    mountFields: (...args) => source.components.mount?.(...args),
  };
  return host;
}

export function createInterfaceStateControllerWorkbench({source: providedSource = null, selection, initialize = null, advance = null,
  inputs = () => [], preview = null, components = {}, presentation, available, followReference, ...description}) {
  const session = () => selection().session || selection().previewSession;
  const adapter = () => selection().adapter || selection().executionAdapter;
  const source = providedSource || createInterfaceStateSource({...description, selection, components, execution: {
    initialize, inputs,
    options: snapshot => adapter()?.options?.(snapshot || session()?.state) || [],
    advance: advance || (initialize ? input => session().advance(input, adapter()) : null),
    preview,
    calls: () => {
      const snapshot = session()?.state;
      return snapshot ? {returnStack: snapshot.returnStack, results: snapshot.domainResults,
        status: snapshot.execution?.status} : null;
    },
    complete: () => {
      const snapshot = session()?.state;
      return ['returned', 'called', 'terminal'].includes(snapshot?.execution?.status) ? snapshot.domainResults : null;
    },
  }});
  return createInterfaceStateWorkbench({source, presentation, available, followReference});
}
