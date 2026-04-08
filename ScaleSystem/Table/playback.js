let audioContext = null;
let activeOscillators = [];

function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

function stopPlayback() {
  activeOscillators.forEach(({ osc, gain }) => {
    try {
      gain.gain.cancelScheduledValues(audioContext.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, audioContext.currentTime);
      gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.03);
      osc.stop(audioContext.currentTime + 0.04);
    } catch (e) {}
  });
  activeOscillators = [];
}

function playCurrentMode(accidentalText) {
  const ctx = ensureAudioContext();
  stopPlayback();

  console.log('PLAY:', accidentalText);

  // 임시 테스트용 단일음
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.value = 440;

  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.02);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.85);

  activeOscillators.push({ osc, gain });
}

window.playCurrentMode = playCurrentMode;
window.stopPlayback = stopPlayback;
