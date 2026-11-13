// Sound for the site. No audio until the visitor clicks. Two audio elements cross-fade between songs.
// level() returns the voice level 0..1. Served over http it reads the real song (Web Audio analyser).
// On file:// Chrome blocks the analyser, so level() uses a soft breathing curve there.

const ROOT = '../../';
window.src = (p) => encodeURI(p).replace(/'/g, '%27');

window.Sound = (() => {
  const live = location.protocol !== 'file:';
  let on = false, primed = false, ctx = null, data = null, cur = null;
  const pool = [0, 1].map(() => {
    const e = new Audio();
    if (live) e.crossOrigin = 'anonymous';
    e.preload = 'auto';
    e.volume = 0;
    const r = { e, an: null, fadeId: 0, url: '' };
    // A failed song load (the audio is not online yet) tells the page
    e.addEventListener('error', () => { if (r.url && cur && cur.rec === r && api.onerror) api.onerror(cur.t); });
    return r;
  });

  function wire() {
    pool.forEach((r) => {
      if (r.an || !ctx) return;
      const s = ctx.createMediaElementSource(r.e);
      r.an = ctx.createAnalyser();
      r.an.fftSize = 1024;
      s.connect(r.an); r.an.connect(ctx.destination);
    });
  }

  // A tenth of a second of silence, used to unlock both elements inside the first tap (iOS Safari)
  function silence() {
    const n = 800, b = new ArrayBuffer(44 + n * 2), v = new DataView(b);
    const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 8000, true); v.setUint32(28, 16000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    w(36, 'data'); v.setUint32(40, n * 2, true);
    return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
  }

  // Timer, not rAF: a fade must finish even when the tab is in the background
  function fade(rec, to, ms, done) {
    const id = ++rec.fadeId, from = rec.e.volume, t0 = performance.now();
    const step = () => {
      if (id !== rec.fadeId) return;
      const k = Math.min(1, (performance.now() - t0) / ms);
      rec.e.volume = from + (to - from) * k;
      if (k < 1) setTimeout(step, 20); else if (done) done();
    };
    step();
  }

  function seek(rec, t) {
    if (rec.e.readyState >= 1) rec.e.currentTime = t;
    else rec.e.addEventListener('loadedmetadata', () => { rec.e.currentTime = t; }, { once: true });
  }

  const api = {
    onerror: null,
    get enabled() { return on; },
    unlock() {
      on = true;
      if (live && !ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        data = new Uint8Array(1024);
        wire();
      }
      if (ctx && ctx.state === 'suspended') ctx.resume();
      if (primed) return;
      primed = true;
      const s = silence();
      pool.forEach((r) => {
        if (r.url) return;
        r.e.src = s;
        r.e.play().then(() => { if (!r.url) r.e.pause(); }).catch(() => {});
      });
    },
    mute() { on = false; this.stop(); },
    // t: a track with audio, start. Same track keeps its place; a new track starts at its preview point.
    play(t, vol = 0.9) {
      if (!on) return;
      if (cur && cur.t.id === t.id) { cur.rec.e.play().catch(() => {}); fade(cur.rec, vol, 1400); return; }
      const prev = cur;
      const rec = prev ? pool.find((r) => r !== prev.rec) : (pool.find((r) => r.e.paused) || pool[0]);
      // Fade out the other element too, even when it is still fading after stop()
      pool.forEach((r) => { if (r !== rec && !r.e.paused) fade(r, 0, 700, () => r.e.pause()); });
      rec.fadeId++;
      rec.e.volume = 0;
      const url = src(ROOT + t.audio);
      if (rec.url !== url) { rec.url = url; rec.e.src = url; }
      seek(rec, t.start);
      rec.e.play().catch(() => {});
      fade(rec, vol, 1400);
      cur = { t, rec };
    },
    stop(ms = 900) {
      if (!cur) return;
      const rec = cur.rec;
      fade(rec, 0, ms, () => rec.e.pause());
      cur = null;
    },
    // Pause keeps the place; play(t) with the same track resumes
    pause(ms = 400) { if (!cur) return; const rec = cur.rec; fade(rec, 0, ms, () => rec.e.pause()); },
    paused() { return !cur || cur.rec.e.paused; },
    time() { return cur ? cur.rec.e.currentTime : 0; },
    current() { return cur ? cur.t : null; },
    debug() { const e = cur && cur.rec.e; return { ctx: ctx && ctx.state, id: cur && cur.t.id, paused: e && e.paused, t: e && e.currentTime, vol: e && e.volume, an: !!(cur && cur.rec.an) }; },
    level() {
      if (!cur || cur.rec.e.paused) return 0;
      if (cur.rec.an) {
        cur.rec.an.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
        return Math.min(1, Math.sqrt(sum / data.length) * 5);
      }
      const x = cur.rec.e.currentTime;
      return (0.45 + 0.25 * Math.sin(x * 2.2) + 0.15 * Math.sin(x * 5.1 + 1)) * cur.rec.e.volume;
    }
  };
  return api;
})();
