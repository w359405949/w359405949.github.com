// @editor-module 已确认的音频空闲、淡出与持续音分支按当前工作区计算 CPU 耗时。
import {requireFrameByte as byte, requireFrameVector as vector, cloneFrameValue} from '../core/frame-state-values.js';

const unavailable = missing => ({status: 'unavailable', missing});

export function measureAudioFrameClock(input) {
  const state = cloneFrameValue(input), paths = [];
  let cycles = 0;
  const add = (kind, cost) => {cycles += cost; paths.push({kind, cycles: cost});};
  try {
    const requests = vector(state.requests, 8, 'audio.requests');
    const fade = byte(state, 'fade_interval');
    if (!fade) {
      state.fade_index = state.fade_amount = 0;
      add('fade-idle', 15);
    } else {
      state.fade_countdown = (byte(state, 'fade_countdown') - 1) & 255;
      if (state.fade_countdown) add('fade-countdown', 15);
      else {
        const fadeCurve = vector(state.fade_curve, 16, 'audio.fade_curve');
        const index = byte(state, 'fade_index');
        if (index >= fadeCurve.length) return unavailable(['audio-fade-index-domain']);
        state.fade_countdown = fade;
        state.fade_amount = (byte(state, 'fade_amount') + fadeCurve[index]) & 255;
        state.fade_index = (index + 1) & 255;
        if (state.fade_index === 16) {
          state.requests.fill(0);
          for (const key of ['duration', 'note_countdown', 'note_reload', 'channel_flags']) state[key].fill(0);
          for (const key of ['active_mask', 'effect_mask', 'tempo_low', 'tempo_high', 'tempo_pause',
            'fade_interval', 'fade_countdown', 'fade_index', 'fade_amount', 'dpcm_stop']) state[key] = 0;
          state.tempo_increment_low = state.tempo_increment_high = 255;
          add('fade-reset', 56 + 6 + 4014 + 2 + 4 + 4 + 4);
        } else add('fade-step', 57);
      }
    }
    let admission = 6;
    for (const [first, second] of [[0, 4], [1, 5]]) {
      admission += 8;
      if (!(requests[first] | requests[second])) {admission += 3; continue;}
      admission += 2 + 8;
      if (requests[first] !== requests[first + 2]) return unavailable(['audio-command-admission-clock']);
      admission += 2 + 8;
      if (requests[second] !== requests[second + 2]) return unavailable(['audio-command-admission-clock']);
      admission += 3;
    }
    add('command-check', 6 + admission);
    let sum = byte(state, 'tempo_low') + byte(state, 'tempo_increment_low') + 1;
    state.tempo_low = sum & 255;
    sum = byte(state, 'tempo_high') + byte(state, 'tempo_increment_high') + (sum >>> 8);
    state.tempo_high = sum & 255;
    state.tick = sum > 255 && !byte(state, 'tempo_pause') ? 255 : 0;
    add('tempo', 6 + 28 + (sum <= 255 ? 3 : 2 + 4 + (state.tempo_pause ? 3 : 2 + 2 + 4)) + 6);
    const active = byte(state, 'active_mask'), effects = byte(state, 'effect_mask');
    const duration = vector(state.duration, 4, 'audio.duration');
    const noteCountdown = vector(state.note_countdown, 4, 'audio.note_countdown');
    const noteReload = vector(state.note_reload, 4, 'audio.note_reload');
    const flags = vector(state.channel_flags, 4, 'audio.channel_flags');
    add('channel-start', 2);
    for (let channel = 3; channel >= 0; channel--) {
      const mask = 1 << channel;
      let cost = 3 + 4;
      if (!active) {
        cost += 2 + 16 + 3;
        for (const index of [0, 2, 4, 6]) requests[index] = 0;
      } else {
        cost += 3 + 4;
        if (!(active & mask)) cost += 3;
        else {
          cost += 2 + 4;
          if (!state.tick) cost += 3;
          else {
            cost += 2 + 7;
            noteCountdown[channel] = (noteCountdown[channel] - 1) & 255;
            if (!noteCountdown[channel]) return unavailable(['audio-note-decode-clock']);
            cost += 3;
          }
        }
      }
      cost += 4;
      if (!effects) {
        cost += 2 + 16 + 4;
        for (const index of [1, 3, 5, 7]) requests[index] = 0;
      } else {
        cost += 3 + 4;
        if (!(effects & mask)) cost += 4;
        else {
          cost += 2 + 4 + 2 + 5 + 7;
          flags[channel] |= 32;
          duration[channel] = (duration[channel] - 1) & 255;
          if (!duration[channel]) return unavailable(['audio-effect-restore-clock']);
          cost += 3;
          add(`channel-${channel}`, cost + 8 + (channel ? 2 + 3 : 3));
          continue;
        }
      }
      cost += 4 + 4;
      if (!(active & mask)) cost += 3;
      else {
        cost += 2 + 4;
        if (!state.tick) cost += 3;
        else {
          cost += 2 + 4 + 4;
          if (noteCountdown[channel] === noteReload[channel]) return unavailable(['audio-note-output-clock']);
          cost += 3 + 6;
          if (!(flags[channel] & 32)) return unavailable(['audio-envelope-clock']);
          cost += 4 + 2 + 2 + 6;
        }
      }
      add(`channel-${channel}`, cost + 8 + (channel ? 2 + 3 : 3));
    }
    add('dpcm-tail', 4 + (byte(state, 'dpcm_stop') ? 2 + 2 + 4 : 3) + 6);
    // D155 的 JSR、D362 的 bank 信封与 A006 trampoline 包住音频帧服务。
    add('nmi-audio-envelope', 65);
  } catch (error) {return unavailable([error.message]);}
  return {status: 'available', state, cycles, paths};
}
