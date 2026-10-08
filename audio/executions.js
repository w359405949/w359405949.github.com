// @editor-module 从音频文档建立音序 VM，按执行身份缓存并按需计算轨迹。
//
// `executions` 不在发布包里：它是对每条音序流做一次模拟执行留下的轨迹，没有自己
// 的 ROM 地址，由已发布的音序图、playback 与 DPCM JSON 就能重算——是计算缓存，
// 不是内容表。存下来要 22.2 MiB，重算 231 条只要 0.6 秒（Python 与浏览器实测
// 同量级），所以两侧都现算。
//
// 这里负责两件事：从该音频文档建一个 VM、按 execution_id 记忆化。它不读取项目
// baseline，也不观察构建状态；因此导入后的 JSON 在，预览就能工作。

import {createSequenceVm} from "./sequence-vm.js";

// 以完整音频文档身份为键：graph 或 playback 换版本都会随文档一起自然作废。
const caches = new WeakMap();

/**
 * 备好某份音频文档的执行解析器。渲染音乐与音效页之前调用一次。
 *
 * graph 不存在时返回 false；已声明 graph 却缺少运行所需 JSON 时抛出明确错误。
 * 这属于发布包契约损坏，不能偷偷回退到 ROM 或把整页伪装成「暂无执行」。
 */
export async function ensureSequenceExecutions(audio) {
  const graph = audio?.sequence_graph;
  if (!graph || !Array.isArray(graph.streams)) return false;
  const existing = caches.get(audio);
  if (existing?.ready) return true;
  // 失败不缓存：文档 hydrate/修复后，同一个对象可以重新尝试。
  if (existing?.pending) return existing.pending;
  const cache = existing || {ready: false, byId: new Map()};
  caches.set(audio, cache);
  cache.pending = Promise.resolve().then(() => {
    cache.vm = createSequenceVm({
      graph,
      playback: audio.playback,
      dpcm: audio.dpcm,
    });
    cache.instructions = new Map(
      (graph.instructions || []).map(item => [item.id, item]),
    );
    cache.streamsById = new Map(
      (graph.streams || []).map(item => [String(item.execution_id || ""), item]),
    );
    cache.ready = true;
    return true;
  }).finally(() => {
    cache.pending = null;
  });
  return cache.pending;
}

/**
 * 全部执行轨迹，按已发布的 streams 顺序。音乐与音效页的执行/事件总表要它。
 *
 * 231 条一起算是 0.6 秒量级，而且和逐条取共用同一份记忆化结果——先点开总表再
 * 播某一轨，不会算第二遍。
 */
export function allSequenceExecutions(audio) {
  const graph = audio?.sequence_graph;
  const cache = graph && caches.get(audio);
  if (!cache?.ready) return [];
  if (!cache.all) {
    cache.all = (graph.streams || [])
      .map(stream => sequenceExecution(audio, stream.execution_id))
      .filter(Boolean);
  }
  return cache.all;
}

/**
 * 取一条执行轨迹。必须先 `ensureSequenceExecutions`；没备好就返回 null，
 * 调用点按「这条轨没有可用执行」处理。
 */
export function sequenceExecution(audio, executionId) {
  const graph = audio?.sequence_graph;
  const cache = graph && caches.get(audio);
  if (!cache?.ready || !executionId) return null;
  const id = String(executionId);
  const memoised = cache.byId.get(id);
  if (memoised !== undefined) return memoised;
  const stream = cache.streamsById.get(id);
  const resolved = stream
    ? cache.vm.resolveExecution(stream, cache.instructions)
    : null;
  cache.byId.set(id, resolved);
  return resolved;
}
