let audioContext = null;
let activeOscillators = [];

function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

function stopPlayback() {
  if (!audioContext) return;

  activeOscillators.forEach(({ osc, gain }) => {
    try {
      const now = audioContext.currentTime;
      if (gain) {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.03);
        osc.stop(now + 0.04);
      } else {
        osc.stop(now);
      }
    } catch (e) {}
  });

  activeOscillators = [];
}

function noteValueToFrequency(noteValue, relativePitches) {
  const octave = Math.floor(noteValue / 7);
  const ind = ((noteValue % 7) + 7) % 7; // 혹시 음수가 들어와도 안전하게
  const relative = relativePitches[ind] + 12 * octave - 19;
  return 440 * Math.pow(2, relative / 12);
}

function playNoteEvents(events, relativePitches, secondsPerBeat = 0.125) {
  const ctx = ensureAudioContext();
  stopPlayback();

  const baseTime = ctx.currentTime;

  events.forEach(({ note, start, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = noteValueToFrequency(note, relativePitches);

    const t0 = baseTime + start * secondsPerBeat;
    const t1 = t0 + dur * secondsPerBeat;

    // 클릭노이즈 방지용 짧은 envelope
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.05, t0 + 0.01);
    gain.gain.setValueAtTime(0.05, Math.max(t0 + 0.01, t1 - 0.03));
    gain.gain.linearRampToValueAtTime(0, t1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t0);
    osc.stop(t1 + 0.01);

    activeOscillators.push({ osc, gain });
  });
}

function playCurrentMode(relativePitches) {
  const events = [
    { note: 0, start: 0, dur: 16 },
    { note: 2, start: 2, dur: 14 },
    { note: 4, start: 4, dur: 12 },
    { note: 6, start: 6, dur: 2 },
    { note: 8, start: 8, dur: 2 },
    { note: 10, start: 10, dur: 2 },
    { note: 12, start: 12, dur: 2 },
    { note: 14, start: 14, dur: 2 },

    { note: 14, start: 0, dur: 2 },
    { note: 16, start: 2, dur: 1 },
    { note: 14, start: 3, dur: 1 },

    { note: 18, start: 4, dur: 1 },
    { note: 16, start: 5, dur: 1 },
    { note: 20, start: 6, dur: 1 },
    { note: 16, start: 7, dur: 1 },

    { note: 18, start: 8, dur: 1 },
    { note: 20, start: 9, dur: 1 },
    { note: 24, start: 10, dur: 1 },
    { note: 22, start: 11, dur: 1 },

    { note: 19, start: 12, dur: 1 },
    { note: 22, start: 13, dur: 1 },
    { note: 21, start: 14, dur: 1 },
    { note: 17, start: 15, dur: 1 }
  ];

  playNoteEvents(events, relativePitches, 0.4);
}

window.playCurrentMode = playCurrentMode;
window.stopPlayback = stopPlayback;
