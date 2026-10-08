// @editor-module 定义 NES 制式帧率并驱动预览帧时钟。
const NES_VIDEO_STANDARDS = Object.freeze({
  ntsc: Object.freeze({key: "ntsc", label: "NTSC · 60.10 Hz", hz: 60.0988}),
  pal: Object.freeze({key: "pal", label: "PAL · 50.01 Hz", hz: 50.00698}),
});

export function normalizeNesVideoStandard(value) {
  return String(value).toLowerCase() === "pal" ? "pal" : "ntsc";
}

export function nesVideoStandard(value) {
  return NES_VIDEO_STANDARDS[normalizeNesVideoStandard(value)];
}

export function nesFrameDurationMs(value) {
  return 1000 / nesVideoStandard(value).hz;
}

const now = () => globalThis.performance?.now?.() ?? Date.now();

/**
 * 用目标时间而不是固定间隔累加，避免浏览器定时器误差把长动画越播越慢。
 * 调用方负责先绘制第 0 帧；时钟从第 1 帧开始推进。
 */
export function startNesFrameClock({
  standard = "ntsc",
  frameCount,
  loop = false,
  onFrame,
  onComplete = () => {},
  shouldContinue = () => true,
} = {}) {
  const count = Math.max(0, Number(frameCount) || 0);
  const duration = nesFrameDurationMs(standard);
  let index = 0;
  let timer = null;
  let cancelled = false;
  let epoch = now();

  const cancel = () => {
    cancelled = true;
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  if (count === 0) {
    onComplete();
    return {cancel, duration, standard: normalizeNesVideoStandard(standard)};
  }
  // A one-frame clip deliberately falls through: the caller has already
  // painted frame 0, and the normal clock keeps it visible for one real NES
  // frame before completing (or continues checking it when loop=true).
  const schedule = () => {
    if (cancelled) return;
    const due = epoch + (index + 1) * duration;
    timer = setTimeout(tick, Math.max(0, due - now()));
  };
  const tick = () => {
    timer = null;
    if (cancelled || !shouldContinue()) {
      cancel();
      return;
    }
    index += 1;
    if (index >= count) {
      if (!loop) {
        cancel();
        onComplete();
        return;
      }
      index = 0;
      epoch = now();
    }
    onFrame(index);
    schedule();
  };
  schedule();
  return {cancel, duration, standard: normalizeNesVideoStandard(standard)};
}
