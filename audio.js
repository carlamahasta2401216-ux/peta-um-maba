/**
 * GAME AUDIO ENGINE (Web Audio API & Speech Synthesis)
 * Menghasilkan sound effects procedural ala Mobile Legends tanpa butuh file MP3 eksternal.
 * Ringan, instan, 100% offline & zero dependency!
 */

class SoundEngine {
  constructor() {
    this.audioCtx = null;
    this.soundEnabled = true;
    this.voiceEnabled = true;
  }

  init() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    return this.soundEnabled;
  }

  // SFX 1: UI Beep / Button Click (Futuristic Click)
  playClick() {
    if (!this.soundEnabled) return;
    this.init();

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.audioCtx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.25, this.audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.08);
  }

  // SFX 2: Map Ping (Radar Sonar Ping MLBB)
  playPing() {
    if (!this.soundEnabled) return;
    this.init();

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(1200, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.audioCtx.currentTime + 0.35);

    gain.gain.setValueAtTime(0.4, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.35);
  }

  // SFX 3: Waypoint Locked / Navigation Path Drawn
  playTargetLock() {
    if (!this.soundEnabled) return;
    this.init();

    const now = this.audioCtx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now + i * 0.06);

      gain.gain.setValueAtTime(0.15, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.18);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.18);
    });
  }

  // SFX 4: Recall Warp (Mobile Legends Recall Sound)
  playRecall() {
    if (!this.soundEnabled) return;
    this.init();

    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(880, now + 1.2);
    osc.frequency.exponentialRampToValueAtTime(1760, now + 1.6);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 1.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(now);
    osc.stop(now + 1.8);
  }

  // SFX 5: Quest Complete / Victory Jingle
  playVictory() {
    if (!this.soundEnabled) return;
    this.init();

    const notes = [
      { f: 587.33, d: 0.12 }, // D5
      { f: 587.33, d: 0.12 }, // D5
      { f: 587.33, d: 0.12 }, // D5
      { f: 783.99, d: 0.40 }, // G5
      { f: 880.00, d: 0.20 }, // A5
      { f: 1046.5, d: 0.60 }  // C6
    ];

    let t = this.audioCtx.currentTime;
    notes.forEach(n => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(n.f, t);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + n.d);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(t);
      osc.stop(t + n.d);
      t += n.d * 0.9;
    });
  }

  // Game Announcer Speech
  announce(text) {
    if (!this.voiceEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); // Stop ongoing speech
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.lang = 'id-ID'; // Bahasa Indonesia

    // Fallback suara
    window.speechSynthesis.speak(utterance);
  }
}

// Global Sound Instance
const soundFX = new SoundEngine();
