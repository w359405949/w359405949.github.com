// @editor-module 用现有合成器按剧情帧合成音乐、音效与淡出。
export async function renderAudioTimeline(audio, synth, events, durationFrames, fps = 60) {
  const durationSeconds = Math.max(1 / fps, durationFrames / fps);
  const sampleRate = synth.sampleRate;
  const count = Math.ceil(durationSeconds * sampleRate);
  const channels = ["pulse-1", "pulse-2", "triangle", "noise", "dpcm"];
  const channelPcm = Object.fromEntries(channels.map(key => [key, new Float32Array(count)]));
  const commands = new Map((audio.commands || []).map(command => [Number(command.id), command]));
  const controls = new Map((audio.controls || []).map(control => [Number(control.id), control]));
  const renderedCommands = new Map();
  let music = null;
  const effects = new Map();
  let fade = null;
  let cursor = 0;
  const sorted = events.map((event, index) => ({...event, index}))
    .sort((a, b) => a.frame - b.frame || a.index - b.index);
  const renderSeconds = durationSeconds + Math.max(0, -(Number(sorted[0]?.frame) || 0) / fps);
  const reports = [];
  const mixUntil = end => {
    for (; cursor < end; cursor++) {
      const frame = cursor / sampleRate * fps;
      const fadeSteps = fade ? Math.floor((frame - fade.frame) / fade.interval) : 0;
      if (fade && fadeSteps >= 16) {
        music = null;
        effects.clear();
        fade = null;
      }
      const level = fade ? Math.max(0, 1 - fadeSteps / 16) : 1;
      for (const key of channels) {
        const effect = effects.get(key);
        const effectIndex = effect ? cursor - effect.start : -1;
        const source = effect && effectIndex < effect.pcm.length ? effect : music;
        const pcm = source?.rendered?.channelPcm?.[key] || source?.pcm;
        const index = source ? cursor - source.start : -1;
        if (pcm && index >= 0 && index < pcm.length) channelPcm[key][cursor] = pcm[index] * level;
      }
    }
  };
  for (const event of sorted) {
    const start = Math.min(count, Math.round(Number(event.frame) / fps * sampleRate));
    mixUntil(Math.max(0, start));
    const id = Number(event.command_id);
    const control = controls.get(id);
    if (control) {
      if (!(Number(control.interval) > 0)) throw new Error(`声音控制 ${id} 的步进时长未确认`);
      fade = {frame: Number(event.frame), interval: Number(control.interval)};
      reports.push({frame: event.frame, commandId: id, kind: "fade-control"});
      continue;
    }
    const command = commands.get(id);
    if (!command) throw new Error(`未知剧情声音命令 ${id}`);
    if (command.status === "audio-reset") {
      music = null;
      effects.clear();
      fade = null;
      reports.push({frame: event.frame, commandId: id, kind: "audio-reset"});
      continue;
    }
    let rendered = renderedCommands.get(id);
    if (!rendered) {
      rendered = await synth.renderCommand(id, {maxSeconds: renderSeconds,
        timelineSeconds: renderSeconds, dpcmGatePolicy: "assume-open"});
      if (!rendered.ok) throw new Error(rendered.reason || "剧情声音合成失败");
      if (rendered.trackReports.length && rendered.trackReports.every(track => track.status === "unplayable")) {
        throw new Error(`剧情声音命令 ${id} 缺少可播放音序`);
      }
      renderedCommands.set(id, rendered);
    }
    reports.push({frame: event.frame, commandId: id, kind: command.kind, warnings: rendered.warnings});
    if (command.kind === "music") {
      if (music?.rendered.commandId === id
          && ["scene-entry-music", "queue-sound-command-if-changed"].includes(event.dispatch)) continue;
      music = {rendered, start};
      fade = null;
    } else {
      for (const track of command.tracks || []) {
        const pcm = rendered.channelPcm?.[track.channel_key];
        const report = rendered.trackReports.find(item => item.channelKey === track.channel_key);
        if (pcm) effects.set(track.channel_key, {
          pcm: pcm.subarray(0, Math.ceil(Number(report?.durationSeconds ?? rendered.durationSeconds) * sampleRate)), start});
      }
    }
  }
  mixUntil(count);
  return {ok: true, status: "rendered", sampleRate, durationSeconds, channelPcm,
    reports, fidelity: "existing-command-synth-with-channel-overrides"};
}
