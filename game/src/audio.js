// Every sound is synthesized locally, after a user gesture.
export function createAudio() {
  let context, master, engine, engineGain, siren, sirenGain, muted = false;
  function unlock() {
    if (!context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      try { context = new AudioContext(); } catch { return; }
      master = context.createGain(); master.gain.value = 0.18; master.connect(context.destination);
      engine = context.createOscillator(); engine.type = 'sawtooth'; engine.frequency.value = 38;
      engineGain = context.createGain(); engineGain.gain.value = 0;
      const filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 210;
      engine.connect(filter); filter.connect(engineGain); engineGain.connect(master); engine.start();
      siren = context.createOscillator(); siren.type = 'sine';
      sirenGain = context.createGain(); sirenGain.gain.value = 0;
      siren.connect(sirenGain); sirenGain.connect(master); siren.start();
    }
    if (context.state === 'suspended') context.resume().catch(() => {});
  }
  function tone(frequency, end, duration = 0.12, volume = 0.4, type = 'sine', delay = 0) {
    if (!context || muted) return;
    const t = context.currentTime + delay;
    const oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, t);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + duration);
    gain.gain.setValueAtTime(volume, t); gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    oscillator.connect(gain); gain.connect(master); oscillator.start(t); oscillator.stop(t + duration + 0.02);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  function play(name) {
    if (name === 'shot') tone(140, 32, 0.11, 0.65, 'sawtooth');
    else if (name === 'hit' || name === 'crash') tone(85, 22, 0.17, 0.65, 'triangle');
    else if (name === 'pickup' || name === 'complete') { tone(523, 659, 0.13); tone(659, 880, 0.2, 0.45, 'sine', 0.12); }
    else if (name === 'wanted') { tone(330, 220, 0.17, 0.3, 'square'); tone(330, 220, 0.17, 0.3, 'square', 0.2); }
    else if (name === 'horn') tone(196, 196, 0.3, 0.35, 'sawtooth');
    else tone(440, 660, 0.07, 0.25, 'triangle');
  }
  function update(world, active) {
    if (!context) { world.sounds.length = 0; return; }
    const t = context.currentTime, driving = active && world.player.car;
    engine.frequency.setTargetAtTime(driving ? 32 + Math.abs(driving.speed) * 0.25 : 32, t, 0.12);
    engineGain.gain.setTargetAtTime(driving && !muted ? 0.18 : 0, t, 0.1);
    const policeNear = world.police.some(c => Math.hypot(c.x - world.player.x, c.y - world.player.y) < 650);
    siren.frequency.setTargetAtTime(680 + Math.sin(world.time * 6) * 280, t, 0.03);
    sirenGain.gain.setTargetAtTime(active && world.wanted.stars && policeNear && !muted ? 0.075 : 0, t, 0.1);
    for (const event of world.sounds.splice(0)) if (active) play(event);
  }
  return { unlock, play, update, toggle: () => { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.18; return muted; }, get muted() { return muted; } };
}
