/* =========================================================
   Villancico sintetizado (Web Audio API) · sin archivos
   Medley suave estilo "caja de música" con acompañamiento:
   - Jingle Bells (J. Pierpont, 1857 · dominio público)
   - Noche de Paz (F. Gruber, 1818 · dominio público)
   Expone: window.CarolSynth { play(), pause(), playing }
   ========================================================= */
(() => {
  'use strict';

  // Frecuencias (Hz)
  const N = {
    B2: 123.47, G2: 98.0,
    C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99
  };

  // Acordes de acompañamiento (arpegio suave)
  const CH = {
    C: ['C3', 'G3', 'E4', 'G3'],
    F: ['F3', 'C4', 'A3', 'C4'],
    G: ['G2', 'D3', 'B3', 'D3']
  };

  // Melodías: [nota, duración en tiempos]
  const jingleA = [
    ['E5', 1], ['E5', 1], ['E5', 2],
    ['E5', 1], ['E5', 1], ['E5', 2],
    ['E5', 1], ['G5', 1], ['C5', 1.5], ['D5', .5],
    ['E5', 4]
  ];
  const jingleB = [
    ['F5', 1], ['F5', 1], ['F5', 1.5], ['F5', .5],
    ['F5', 1], ['E5', 1], ['E5', 1], ['E5', .5], ['E5', .5],
    ['E5', 1], ['D5', 1], ['D5', 1], ['E5', 1],
    ['D5', 2], ['G5', 2]
  ];
  const jingleEnd = [
    ['G5', 1], ['G5', 1], ['F5', 1], ['D5', 1],
    ['C5', 4]
  ];
  const silentNight = [
    ['G4', 1.5], ['A4', .5], ['G4', 1], ['E4', 3],
    ['G4', 1.5], ['A4', .5], ['G4', 1], ['E4', 3],
    ['D5', 2], ['D5', 1], ['B4', 3],
    ['C5', 2], ['C5', 1], ['G4', 3],
    ['A4', 2], ['A4', 1], ['C5', 1.5], ['B4', .5], ['A4', 1],
    ['G4', 1.5], ['A4', .5], ['G4', 1], ['E4', 3],
    ['A4', 2], ['A4', 1], ['C5', 1.5], ['B4', .5], ['A4', 1],
    ['G4', 1.5], ['A4', .5], ['G4', 1], ['E4', 3],
    ['D5', 2], ['D5', 1], ['F5', 1.5], ['D5', .5], ['B4', 1],
    ['C5', 3], ['E5', 3],
    ['C5', 1.5], ['G4', .5], ['E4', 1], ['G4', 1.5], ['F4', .5], ['D4', 1],
    ['C4', 5]
  ];

  // Armonía: [acorde, tiempos]
  const jingleChords = [
    ...Array(4).fill(['C', 4]),
    ['F', 4], ['F', 4], ['C', 4], ['G', 4],
    ...Array(4).fill(['C', 4]),
    ['G', 4], ['C', 4]
  ];
  const silentChords = [
    ...Array(4).fill(['C', 3]), ['G', 3], ['G', 3], ['C', 3], ['C', 3],
    ['F', 3], ['F', 3], ['C', 3], ['C', 3], ['F', 3], ['F', 3], ['C', 3], ['C', 3],
    ['G', 3], ['G', 3], ['C', 3], ['C', 3], ['C', 3], ['G', 3], ['C', 5]
  ];

  const SONG = [
    { melody: [...jingleA, ...jingleB, ...jingleA, ...jingleEnd], chords: jingleChords, beat: 0.3, rest: 1.6 },
    { melody: silentNight, chords: silentChords, beat: 0.62, rest: 2.8 }
  ];

  let ctx = null;
  let bus = null;       // entrada de todas las voces
  let timer = null;
  let nextStart = 0;
  let isPlaying = false;

  // Reverb sintético: ruido con caída exponencial
  function makeReverb(seconds, decay) {
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const data = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    const conv = ctx.createConvolver();
    conv.buffer = buf;
    return conv;
  }

  function buildGraph() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    bus = ctx.createGain();
    const tone = ctx.createBiquadFilter();      // suaviza agudos
    tone.type = 'lowpass';
    tone.frequency.value = 2200;
    tone.Q.value = 0.4;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.ratio.value = 3;

    const master = ctx.createGain();
    master.gain.value = 0.3;   // volumen general (más suave)

    const reverb = makeReverb(2.6, 2.4);
    const wet = ctx.createGain();
    wet.gain.value = 0.45;

    bus.connect(tone);
    tone.connect(comp);              // señal seca
    tone.connect(reverb);            // señal a la reverb
    reverb.connect(wet);
    wet.connect(comp);
    comp.connect(master);
    master.connect(ctx.destination);
  }

  // Voz de melodía: campanilla suave
  function bell(freq, start, dur, vel) {
    const tail = Math.min(dur * 1.5 + 0.5, 2.8);
    [[1, 1], [2, 0.14], [3, 0.04]].forEach(([mult, vol]) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * mult;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(vol * vel, start + 0.025);          // ataque suave
      g.gain.exponentialRampToValueAtTime(vol * vel * 0.35, start + dur * 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, start + tail);
      osc.connect(g);
      g.connect(bus);
      osc.start(start);
      osc.stop(start + tail + 0.05);
    });
  }

  // Voz de acompañamiento: pulso cálido y bajo
  function pluck(freq, start, dur, vel) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(vel, start + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur * 1.1);
    osc.connect(g);
    g.connect(bus);
    osc.start(start);
    osc.stop(start + dur * 1.1 + 0.05);
  }

  function scheduleLoop(t0) {
    let end = t0;
    SONG.forEach((piece) => {
      // Melodía con leve "humanización" y énfasis natural
      let t = end;
      piece.melody.forEach(([name, beats], i) => {
        const dur = beats * piece.beat;
        const jitter = (Math.random() - 0.5) * 0.012;
        const vel = 0.30 + Math.random() * 0.06 + (beats >= 2 ? 0.04 : 0);
        bell(N[name], t + Math.max(0, jitter), dur, vel);
        t += dur;
      });
      const melodyEnd = t;

      // Armonía: un arpegio suave por tiempo
      let ct = end;
      piece.chords.forEach(([chord, beats]) => {
        const pattern = CH[chord];
        for (let b = 0; b < beats; b++) {
          const name = pattern[b % pattern.length];
          pluck(N[name], ct + b * piece.beat, piece.beat * 1.6, b === 0 ? 0.16 : 0.09);
        }
        ct += beats * piece.beat;
      });

      end = Math.max(melodyEnd, ct) + piece.rest;
    });
    return end;
  }

  function pump() {
    if (ctx.currentTime > nextStart - 2) nextStart = scheduleLoop(nextStart);
  }

  window.CarolSynth = {
    get playing() { return isPlaying; },

    play() {
      if (!ctx) {
        buildGraph();
        nextStart = ctx.currentTime + 0.4;
        nextStart = scheduleLoop(nextStart);
      }
      ctx.resume();
      if (!timer) timer = setInterval(pump, 400);
      isPlaying = true;
    },

    pause() {
      if (ctx) ctx.suspend();
      isPlaying = false;
    }
  };
})();
