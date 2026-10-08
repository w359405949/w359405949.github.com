// @editor-module 场景绘制接续所属槽投影与 OAM 合成，外部动作未完成时保留续行。
export function createSceneRenderServices({state, slotServices, oamServices, resolveAction = null}) {
  return Object.freeze({createExecution({display, bankGuard = true, ...options} = {}) {
    const execution = slotServices.createExecution(options);
    let current = null, cancelled = false, started = false, banksRestored = false;
    let savedBank, savedSubroutineBank;
    const effects = [];
    const field = id => state.field(id);
    const snapshot = result => ({...result, state: state.capture(),
      effects: effects.splice(0), ...(display ? {display} : {})});
    const restoreBanks = () => {
      if (bankGuard && started && !banksRestored) {
        field('text.recordBank').value = savedBank;
        field('display.subroutineBank').value = savedSubroutineBank;
        banksRestored = true;
      }
    };
    return Object.freeze({advance(response) {
      if (cancelled) throw new TypeError('scene-render-cancelled');
      if (current && current.status !== 'pending') return current;
      if (current?.status === 'pending' && response?.status !== 'available') return current;
      if (!started) {
        if (bankGuard) {
          savedBank = field('text.recordBank').value;
          savedSubroutineBank = field('display.subroutineBank').value;
          field('display.subroutineBank').value = 0x1A;
        }
        started = true;
      }
      if (response?.display) display = response.display;
      let projected = execution.advance(response);
      effects.push(...(projected.effects || []));
      while (projected.status === 'pending' && typeof resolveAction === 'function') {
        const resolved = resolveAction(projected);
        if (resolved?.status !== 'available') break;
        if (resolved.display) display = resolved.display;
        projected = execution.advance(resolved);
        effects.push(...(projected.effects || []));
      }
      if (projected.status !== 'available') {
        if (projected.status !== 'pending') restoreBanks();
        current = snapshot(projected);
        return current;
      }
      field('text.recordBank').value = 0x13;
      const composed = oamServices.compose();
      effects.push(...(composed.effects || []));
      if (composed.status === 'available') {
        field('random.sceneHigh').value = composed.randomSnapshot[0];
        field('random.sceneLow').value = composed.randomSnapshot[1];
      }
      restoreBanks();
      current = snapshot({...composed, camera: projected.camera, projections: projected.slots});
      return current;
    }, cancel() {cancelled = true; execution.cancel(); restoreBanks();}});
  }});
}
