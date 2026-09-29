// Web Audio synthesizer for Bangalore Auto-Rickshaw dual-tone horn ("Peep-peep!")
let audioCtx: AudioContext | null = null;
let lastHornTime = 0;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Plays an authentic Bangalore auto-rickshaw dual-tone "Peep-peep!" horn.
 * @param volume Volume multiplier (0.0 to 1.0)
 * @param pitchScale Slight frequency jitter for variety across autos
 */
export function playAutoHorn(volume = 0.35, pitchScale = 1.0): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Enforce a debounce so multiple autos don't create unbearable screeching
  if (now - lastHornTime < 1.2) return;
  lastHornTime = now;

  const master = ctx.createGain();
  master.gain.setValueAtTime(Math.min(1.0, Math.max(0.05, volume * 0.4)), now);
  master.connect(ctx.destination);

  // Play two quick beeps: "peep... peep!"
  const beepDur = 0.09;
  const gap = 0.05;
  const beeps = [now, now + beepDur + gap];

  beeps.forEach(startTime => {
    // Twin frequencies characteristic of Bajaj RE electric horns (~780Hz & ~890Hz)
    const freqs = [775 * pitchScale, 895 * pitchScale];

    freqs.forEach(freq => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth'; // Slightly buzzy raw auto horn timbre
      osc.frequency.setValueAtTime(freq, startTime);

      // Lowpass filter to smooth the harsh edge slightly
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2600, startTime);

      // Sharp attack, sustained peep, sharp release
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.4, startTime + 0.015);
      gain.gain.setValueAtTime(0.4, startTime + beepDur - 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + beepDur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(master);

      osc.start(startTime);
      osc.stop(startTime + beepDur + 0.02);
    });
  });
}
