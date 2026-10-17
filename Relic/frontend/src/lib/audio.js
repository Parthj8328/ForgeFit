// Procedural ambient soundscape engine + audio ducking (Web Audio API)

function makeNoiseBuffer(ctx, seconds, type = "white") {
  const length = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let lastOut = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    if (type === "brown") {
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 3.5;
    } else if (type === "pink") {
      lastOut = 0.98 * lastOut + 0.02 * white;
      data[i] = (white * 0.5 + lastOut * 1.5) * 0.4;
    } else {
      data[i] = white;
    }
  }
  return buffer;
}

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.ambientGain = null;
    this.nodes = [];
    this.currentId = null;
    this.baseVolume = 0.45;
    this.ducked = false;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.baseVolume;
      this.masterGain.connect(this.ctx.destination);
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = 1.0;
      this.ambientGain.connect(this.masterGain);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  _noiseSource(type) {
    const src = this.ctx.createBufferSource();
    src.buffer = makeNoiseBuffer(this.ctx, 4, type);
    src.loop = true;
    return src;
  }

  _build(id) {
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(this.ambientGain);
    const local = [out];

    if (id === "rain") {
      const noise = this._noiseSource("white");
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 2600;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass"; hp.frequency.value = 400;
      noise.connect(hp); hp.connect(lp); lp.connect(out);
      // shimmer LFO
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.3; lfoGain.gain.value = 500;
      lfo.connect(lfoGain); lfoGain.connect(lp.frequency);
      noise.start(); lfo.start();
      local.push(noise, lfo, lp, hp, lfoGain);
    } else if (id === "fireplace") {
      const noise = this._noiseSource("brown");
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 700;
      noise.connect(lp); lp.connect(out);
      // crackle: random amplitude flicker
      const crackle = ctx.createGain();
      crackle.gain.value = 1;
      lp.disconnect(); lp.connect(crackle); crackle.connect(out);
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = "sawtooth"; lfo.frequency.value = 6; lfoGain.gain.value = 0.35;
      lfo.connect(lfoGain); lfoGain.connect(crackle.gain);
      noise.start(); lfo.start();
      local.push(noise, lp, crackle, lfo, lfoGain);
    } else if (id === "tape") {
      const noise = this._noiseSource("pink");
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass"; bp.frequency.value = 2200; bp.Q.value = 0.7;
      const g = ctx.createGain(); g.gain.value = 0.7;
      noise.connect(bp); bp.connect(g); g.connect(out);
      // wow & flutter
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.8; lfoGain.gain.value = 300;
      lfo.connect(lfoGain); lfoGain.connect(bp.frequency);
      noise.start(); lfo.start();
      local.push(noise, bp, g, lfo, lfoGain);
    } else if (id === "cosmic") {
      const freqs = [110, 164.81, 220, 277.18];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = "sine"; osc.frequency.value = f;
        osc.detune.value = (i - 1.5) * 6;
        const g = ctx.createGain(); g.gain.value = 0.12;
        osc.connect(g); g.connect(out);
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 0.05 + i * 0.02; lfoGain.gain.value = 0.08;
        lfo.connect(lfoGain); lfoGain.connect(g.gain);
        osc.start(); lfo.start();
        local.push(osc, g, lfo, lfoGain);
      });
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 900;
    }

    // fade in
    out.gain.linearRampToValueAtTime(id === "cosmic" ? 0.9 : 0.7, ctx.currentTime + 1.5);
    return { out, local };
  }

  play(id) {
    this.ensure();
    if (this.currentId === id) return;
    this.stop();
    const built = this._build(id);
    this.nodes = built.local;
    this._out = built.out;
    this.currentId = id;
  }

  stop() {
    if (this._out) {
      try {
        this._out.gain.cancelScheduledValues(this.ctx.currentTime);
        this._out.gain.setValueAtTime(this._out.gain.value, this.ctx.currentTime);
        this._out.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.4);
      } catch (e) {}
    }
    const toStop = this.nodes.slice();
    setTimeout(() => {
      toStop.forEach((n) => { try { n.stop && n.stop(); n.disconnect && n.disconnect(); } catch (e) {} });
    }, 500);
    this.nodes = [];
    this._out = null;
    this.currentId = null;
  }

  duck(on) {
    if (!this.ctx) return;
    this.ducked = on;
    const target = on ? 0.3 : 1.0;
    this.ambientGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.ambientGain.gain.setValueAtTime(this.ambientGain.gain.value, this.ctx.currentTime);
    this.ambientGain.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 0.6);
  }

  setVolume(v) {
    this.baseVolume = v;
    if (this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(v, this.ctx.currentTime + 0.2);
    }
  }

  // Attach an <audio> element to the engine graph and return its analyser
  attachElement(el) {
    this.ensure();
    if (el._relicSource) return el._relicAnalyser;
    const source = this.ctx.createMediaElementSource(el);
    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    analyser.connect(this.masterGain);
    el._relicSource = source;
    el._relicAnalyser = analyser;
    return analyser;
  }
}

const engine = new AudioEngine();
export default engine;
