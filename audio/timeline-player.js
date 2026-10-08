// @editor-module 时间轴声音的准备、定位与播放生命周期。
import {ensureSequenceExecutions} from "./executions.js";
import {createNesApuSynth} from "./synth.js";
import {renderAudioTimeline} from "./timeline.js";
import {previewSoundEnabled, subscribePreviewSound} from "./preview-preference.js";

const players = new Set();
subscribePreviewSound(enabled => {
  if (!enabled) for (const player of players) player.stop();
});

export function createAudioTimelinePlayer(audio, events, duration, fps = 60) {
  const synth = createNesApuSynth(audio, {dpcmGatePolicy: "assume-open"});
  let token = 0;
  let disposed = false;
  let activated = false;
  let pending = null;
  const prepare = () => {
    pending ||= ensureSequenceExecutions(audio).then(() =>
      renderAudioTimeline(audio, synth, events, duration, fps));
    return pending;
  };
  const player = {
    synth, get ready() { return prepare(); }, get unlocked() { return activated; },
    async play(currentFrame, rate = 1) {
      if (!previewSoundEnabled()) return;
      const serial = ++token;
      const unlocked = await synth.unlock();
      if (serial !== token || disposed) return;
      if (!unlocked.ok) throw new Error(unlocked.error || unlocked.reason);
      activated = true;
      const rendered = await prepare();
      if (serial !== token || disposed) return;
      const frame = typeof currentFrame === "function" ? currentFrame() : currentFrame;
      const result = await synth.playTimeline(rendered, {offsetSeconds: frame / fps, rate});
      if (!result.ok && result.status !== "cancelled") throw new Error(result.reason);
      return result;
    },
    stop() {
      token++;
      synth.stop("timeline-paused");
    },
    dispose() {
      disposed = true;
      token++;
      players.delete(player);
      void synth.dispose();
    },
  };
  players.add(player);
  return player;
}

export function stopAudioTimelines() {
  for (const player of [...players]) player.dispose();
}
