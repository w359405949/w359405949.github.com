// @editor-module 语义帧等待复用显示提交与手柄服务，不计算随机调用日程。
export function createSemanticFrameWait({state, displayServices, controllerServices}) {
  const read = id => {
    const field = state.field(id);
    if (field.knowledge !== "confirmed" || !Number.isInteger(field.value)) throw new TypeError(id);
    return field.value;
  };
  let pending = null;
  return Object.freeze({
    begin(kind) {
      if (!["character-delay", "glyph-upload", "controller"].includes(kind)) throw new TypeError("text-frame-wait-kind");
      if (pending) throw new TypeError("text-frame-wait-pending");
      const counter = read("display.frameCounter");
      if (kind === "character-delay" && read("display.nmiMode") !== 1)
        return {status: "available", state: state.capture(), effects: []};
      pending = {kind, counter, nmi: null, ready: null};
      return {status: "pending", state: state.capture(), effects: [], continuation: {kind}};
    },
    advance({display, buttons, readButtons, advanceAudio, audio} = {}) {
      if (!pending) throw new TypeError("text-frame-wait-continuation");
      const frame = pending.ready || (pending.nmi ? displayServices.resumeNmi(pending.nmi, audio)
        : displayServices.commitNmi(display, {advanceAudio}));
      if (frame.status === "pending") {pending.nmi = frame; return frame;}
      if (frame.status !== "available") return frame;
      pending.nmi = null;
      if (read("display.frameCounter") === pending.counter) return {...frame, status: "pending",
        continuation: {kind: pending.kind}};
      if (pending.kind === "controller") {
        pending.ready = frame;
        const polled = controllerServices.poll({buttons, readButtons});
        if (polled.status !== "available") return {...polled, display: frame.display, effects: frame.effects};
        pending = null;
        return {...frame, state: polled.state, effects: [...frame.effects, ...polled.effects]};
      }
      pending = null;
      return frame;
    },
    cancel() {pending = null;},
  });
}
