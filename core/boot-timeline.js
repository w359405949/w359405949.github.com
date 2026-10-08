// 开机时间轴按已发布计数语义与当前值计算逐帧状态。

const FRAMES_PER_SECOND = 60.0988;

/** 立即数参数的有效值：改过的优先，否则用文档里的 ROM 原值。 */
export function parameterValue(screen, values, id) {
  const edited = values?.parameters?.[id];
  if (edited !== undefined && edited !== null) return Number(edited);
  const published = (screen?.parameters || []).find(item => item.id === id);
  return Number(published?.value ?? 0);
}

function parameterDomain(screen, id) {
  return (screen.parameters || []).find(item => item.id === id)?.semantic_edit_domain;
}

// 只消费已发布的计数形状，不执行公式字符串，也不按参数名维护零值表。
// 公式与数值域必须一致；新形状需要显式对齐，不能静默退回 raw 字节。
function domainCycle(domain) {
  const {minimum, maximum} = domain.allowed_integer_values || {};
  if (domain.status !== "confirmed" || minimum !== 0
      || !Number.isInteger(maximum) || maximum < 1) {
    throw new Error("开机时间轴：不支持的计数语义域");
  }
  return maximum + 1;
}

/** 参数的等帧次数按已发布的计数域计算。 */
export function parameterFrames(screen, values, id) {
  const value = parameterValue(screen, values, id);
  const domain = parameterDomain(screen, id);
  if (!domain) return Math.max(0, value);
  if (domain.status === "confirmed" && domain.iteration_count === "value") {
    const {minimum, maximum} = domain.allowed_integer_values || {};
    if (!Number.isInteger(minimum) || minimum < 1 || !Number.isInteger(maximum)
        || maximum < minimum || !Number.isInteger(value) || value < minimum || value > maximum)
      throw new Error(`开机时间轴：参数超出计数语义域 ${id}`);
    return value;
  }
  const cycle = domainCycle(domain);
  if (domain.iteration_count !== `value if value != 0 else ${cycle}`) {
    throw new Error(`开机时间轴：不支持的倒数语义域 ${id}`);
  }
  return value === 0 ? cycle : value;
}

function fadeSteps(screen, values, fadeId) {
  const edited = values?.fades?.[fadeId];
  if (Array.isArray(edited)) return edited;
  return (screen.fades || []).find(item => item.id === fadeId)?.steps || [];
}

function fadeTargets(screen, fadeId) {
  return (screen.fades || []).find(item => item.id === fadeId)?.palette_offsets || [];
}

/** 这一步占多少帧。规则来自已发布计数语义。 */
export function stepFrames(screen, values, step) {
  if (step.kind === "wait") {
    return parameterFrames(screen, values, step.frames_parameter);
  }
  if (step.kind === "fade") {
    return parameterFrames(screen, values, step.frames_parameter)
      * Number(step.steps || 0);
  }
  if (step.kind === "scroll") {
    const {span, pace} = scrollTiming(screen, values, step);
    return span * pace;
  }
  return 0;
}

export function scrollTiming(screen, values, step) {
  const from = parameterValue(screen, values, step.from_parameter);
  const to = parameterValue(screen, values, step.to_parameter);
  const domain = parameterDomain(screen, step.from_parameter);
  const cycle = domainCycle(domain || {});
  const formula = `((${step.to_parameter} - ${step.from_parameter} - 1) & ${cycle - 1}) + 1`;
  const pace = domain.frame_wait_calls_per_iteration;
  for (const id of [step.from_parameter, step.to_parameter]) {
    const endpoint = parameterDomain(screen, id) || {};
    const paired = endpoint.paired_parameters;
    if (domainCycle(endpoint) !== cycle
        || paired?.[0] !== step.from_parameter || paired?.[1] !== step.to_parameter
        || endpoint.iteration_count !== formula
        || endpoint.frame_wait_calls_per_iteration !== pace
        || !Number.isInteger(pace) || pace < 1) {
      throw new Error("开机时间轴：不支持的滚动语义域");
    }
  }
  // 先递增再比较；相等也必须走完整个已发布数值域。
  return {span: ((to - from - 1) & (cycle - 1)) + 1, pace, cycle};
}

/**
 * 把时间轴摊成段。`start` 含、`end` 不含；帧数为 0 的步是瞬时事件，两者相等。
 */
export function timelineTrack(screen, values) {
  const timeline = screen?.timeline;
  if (!timeline) return null;
  let cursor = 0;
  const segments = (timeline.steps || []).map(step => {
    const frames = stepFrames(screen, values, step);
    const segment = {...step, frames, start: cursor, end: cursor + frames};
    cursor += frames;
    return segment;
  });
  return {segments, totalFrames: cursor, framesPerSecond: FRAMES_PER_SECOND};
}

export function segmentAt(track, frame) {
  return track.segments.find(item => frame >= item.start && frame < item.end)
    || track.segments.filter(item => item.start <= frame).at(-1)
    || track.segments[0]
    || null;
}

function framesToSeconds(frames) {
  return frames / FRAMES_PER_SECOND;
}

function secondsToFrames(seconds) {
  return seconds * FRAMES_PER_SECOND;
}

/**
 * 第 `frame` 帧的屏幕状态。
 *
 * 起点由文档的 `timeline.initial` 给出：整版调色板被压成一个颜色、精灵关着，
 * 所以标题的每一组颜色都是渐显上来的，而不是「先有画面再变色」。
 */
export function timelineStateAt(screen, values, frame) {
  const timeline = screen?.timeline;
  const track = timelineTrack(screen, values);
  if (!timeline || !track) return null;
  const initial = timeline.initial || {};
  const palette = new Array(32).fill(Number(initial.palette_fill ?? 0x0F));
  const state = {
    palette,
    // 滚动取哪两个参数由文档给出：两屏的名字不同（scroll_y / scroll_y_start），
    // 按屏 id 猜名字就是把那份差异抄进前端。
    scrollX: parameterValue(screen, values, initial.scroll_x_parameter),
    scrollY: parameterValue(screen, values, initial.scroll_y_parameter),
    spritesVisible: Boolean(initial.sprites_visible),
    segment: segmentAt(track, frame),
    track,
  };
  for (const segment of track.segments) {
    if (frame < segment.start) break;
    applySegment(screen, values, state, segment, Math.min(frame - segment.start, segment.frames));
  }
  return state;
}

function applySegment(screen, values, state, segment, elapsed) {
  if (segment.kind === "fade") {
    const steps = fadeSteps(screen, values, segment.fade);
    const perStep = parameterFrames(screen, values, segment.frames_parameter);
    // 每一步是「先等 N 帧，再把 4 字节写下去」，所以第 k 步在第 k×N 帧生效。
    const written = perStep > 0
      ? Math.min(steps.length, Math.floor(elapsed / perStep)) : steps.length;
    for (let index = 0; index < written; index += 1) {
      for (const offset of fadeTargets(screen, segment.fade)) {
        for (let slot = 0; slot < steps[index].length; slot += 1) {
          state.palette[offset + slot] = Number(steps[index][slot]);
        }
      }
    }
    return;
  }
  if (segment.kind === "scroll") {
    const from = parameterValue(screen, values, segment.from_parameter);
    const {span, pace, cycle} = scrollTiming(screen, values, segment);
    const moved = Math.min(span, Math.floor(elapsed / pace));
    state.scrollY = elapsed >= segment.frames
      ? Number(segment.reset_value ?? 0) : (from + moved) & (cycle - 1);
    return;
  }
  if (segment.kind === "sprites") {
    state.spritesVisible = Boolean(segment.sprites_visible);
    return;
  }
  // 整版装载：一次写完 32 字节，没有过程。Logo 屏的「出现」和「压黑」都是它。
  if (segment.kind === "palette") {
    const fill = segment.palette_fill;
    const source = fill === undefined || fill === null
      ? paletteEntries(values.palette)
      : new Array(32).fill(Number(fill));
    for (let index = 0; index < state.palette.length; index += 1) {
      state.palette[index] = Number(source[index] ?? 0x0F);
    }
  }
}

/** 标题那 16 字节两组装同一份，补齐成 32 再用。 */
function paletteEntries(palette) {
  const source = palette || [];
  return source.length === 16 ? [...source, ...source] : [...source];
}
