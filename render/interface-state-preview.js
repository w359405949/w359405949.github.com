// @editor-module 预览会话隔离上下文、临时字段、窗口与完整快照。
export function interfacePreviewState({context = {}, entry = null, node = entry, control = null,
  pause = null, fields = {}, windows = [], selections = {}, returnStack = [],
  domainResults = {}, randomInputs = [], view = {}, execution = null} = {}) {
  return structuredClone({context, entry, node, control, pause, fields, windows, selections,
    returnStack, domainResults, randomInputs, view, execution});
}

export class InterfacePreviewSession {
  constructor(initial = {}) {this.reset(initial);}
  reset(initial) {
    this.state = interfacePreviewState(initial);
    this.snapshots = []; this.position = -1;
    return this.capture(this.state);
  }
  capture(state) {
    this.state = interfacePreviewState(state);
    this.snapshots.splice(this.position + 1);
    this.snapshots.push(structuredClone(this.state));
    this.position = this.snapshots.length - 1;
    return structuredClone(this.state);
  }
  restore(position) {
    if (!Number.isInteger(position) || position < 0 || position >= this.snapshots.length) return null;
    this.position = position;
    this.state = structuredClone(this.snapshots[position]);
    return structuredClone(this.state);
  }
  previous() {return this.restore(this.position - 1);}
  next() {return this.restore(this.position + 1);}
  advance(input, adapter) {
    const next = adapter.advance(structuredClone(this.state), input);
    return this.capture(next);
  }
  project(projection) {
    Object.assign(this.state, structuredClone(projection));
    this.snapshots[this.position] = structuredClone(this.state);
  }
}
