// @editor-module 动作续行接续所属服务，未确认的外部返回由动作分派拒绝。
export function createSceneActionServiceExecution({execution, resolveService}) {
  return Object.freeze({advance(response) {
    const effects = [];
    let result = execution.advance(response);
    effects.push(...(result.effects || []));
    while (result.status === 'pending') {
      const resolved = resolveService(result);
      if (resolved?.status !== 'available') break;
      const previous = result;
      result = execution.advance(resolved);
      if (result === previous) break;
      effects.push(...(result.effects || []));
    }
    return {...result, effects};
  }, cancel() {execution.cancel();}});
}
