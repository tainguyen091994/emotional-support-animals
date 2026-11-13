// Salon wall: hangs every meme on the intro wall before Three.js loads.
// Frames drop in with a random delay and tilt. The title stamps on last (CSS).
(function () {
  const wall = document.getElementById('wall');
  if (!wall || !window.MEMES) return;
  const NAMES = { ceralie: 'Ceralie', julius: 'Julius Wren', halfsaid: 'halfsaid' };
  const T = window.TRACKS || {};
  const works = Object.keys(window.MEMES).map((id) => {
    const [a, n] = id.split('-');
    const t = (T[a] || []).find((x) => x.n === n);
    return { src: window.MEMES[id], tag: t ? t.title : NAMES[a] + ', No. ' + n };
  });
  Object.keys(window.MASCOTS || {}).forEach((a) => works.push({ src: window.MASCOTS[a], tag: NAMES[a] + ', the artist' }));

  // Same hang on every visit, so the wall feels curated, not random.
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = works.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [works[i], works[j]] = [works[j], works[i]]; }

  const phone = matchMedia('(max-width: 700px)').matches;
  const spans = phone ? ['2x2', '1x1', '1x2', '1x1', '2x1', '1x1', '1x1', '2x2'] : ['2x2', '1x1', '1x2', '1x1', '2x1', '1x1', '2x2', '1x1', '1x2', '1x1', '1x1', '2x1'];
  const kinds = ['k-gold', 'k-black', 'k-sticker', 'k-black', 'k-gold', 'k-sticker'];
  const frag = document.createDocumentFragment();
  works.forEach((w, i) => {
    const f = document.createElement('figure');
    const [c, r] = spans[i % spans.length].split('x');
    f.className = 'fr ' + kinds[Math.floor(rnd() * kinds.length)];
    f.style.cssText = `grid-column:span ${c};grid-row:span ${r};--r:${(rnd() * 10 - 5).toFixed(1)}deg;--dx:${(rnd() * 14 - 7).toFixed(0)}px;--dy:${(rnd() * 14 - 7).toFixed(0)}px;--d:${(.05 + rnd() * 1.15).toFixed(2)}s;--o:${(rnd() * .35).toFixed(2)}s`;
    const img = new Image();
    img.alt = ''; img.decoding = 'async'; img.src = w.src;
    if (i > 14) img.loading = 'lazy';
    const tag = document.createElement('figcaption');
    tag.className = 'tag'; tag.textContent = w.tag;
    f.append(img, tag);
    frag.append(f);
  });
  wall.append(frag);

  // The wall drifts a little against the mouse.
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    addEventListener('pointermove', (e) => {
      wall.style.setProperty('--mx', (e.clientX / innerWidth - .5).toFixed(3));
      wall.style.setProperty('--my', (e.clientY / innerHeight - .5).toFixed(3));
    }, { passive: true });
  }
})();
