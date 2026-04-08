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

function playCurrentMode(intervalSequence) {
  const ctx = ensureAudioContext();
  stopPlayback();

  console.log('PLAY:', intervalSequence);
  const intervals = intervalSequence.split('-').map(Number);
  // 임시 테스트용 단일음
  // const osc = ctx.createOscillator();
  // const gain = ctx.createGain();

  // osc.type = 'sine';
  // osc.frequency.value = 440;

  // gain.gain.value = 0.02;

  // osc.connect(gain);
  // gain.connect(ctx.destination);

  // osc.start(ctx.currentTime);
  // osc.stop(ctx.currentTime + 0.85);

  // activeOscillators.push({ osc, gain });
}

window.playCurrentMode = playCurrentMode;
window.stopPlayback = stopPlayback;
