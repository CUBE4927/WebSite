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
