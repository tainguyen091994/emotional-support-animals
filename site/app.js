// Emotional Support Animals: a walk-in museum. Scroll walks you down a dark corridor; each artist's room opens behind a giant meme that tears in half.
// Routes: #/ entrance, #/<artist> that artist's door, #/<artist>/<nn> one work up close.
// Data: tracks.js (audio and preview times), stories.js (story and lyric), memes.js (thumbnails).
import * as THREE from 'three';

const $ = (s, el = document) => el.querySelector(s);
const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TOUCH = matchMedia('(hover: none)').matches;

// ---------- Data ----------
const ARTISTS = [
  { id: 'ceralie', name: 'Ceralie', album: 'Out Loud', cover: 'assets/Ceralie - Out Loud.jpg',
    bio: 'Fingerpicked songs about what stays behind: a door left open for a cat, a 32-cent stamp, two bikes on the porch.',
    mascot: 'A small ginger tabby. Waits by the door. Does not say why.' },
  { id: 'julius', name: 'Julius Wren', album: 'Tipped Your Way', cover: 'assets/Julius Wren - Tipped Your Way.jpg',
    bio: 'Songs about staying put. A power cut, one pan for two, and ten years he would live again.',
    mascot: 'An old golden retriever. Shown here as a cat, for now.' },
  { id: 'halfsaid', name: 'halfsaid', album: 'Stay Anyway', cover: 'assets/halfsaid - Stay Anyway.jpg',
    bio: 'Two voices, one couple. He raps, she sings. They fight, they grieve, and they stay anyway.',
    mascot: 'A black cat and a white cat. They share one bowl.' }
];
ARTISTS.forEach((a, i) => {
  a.no = String(i + 1).padStart(2, '0');
  a.tracks = TRACKS[a.id].map((t) => ({ ...t, id: `${a.id}-${t.n}`, artist: a }));
  a.tracks.forEach((t) => { Object.assign(t, STORIES[t.id]); t.meme = MEMES[t.id] || a.cover; });
});
const ALL = ARTISTS.flatMap((a) => a.tracks);

const NOTES = [
  ['A person writes the story.', 'Each song starts from one scene: a stamp, a pan, a pencil line on a door.'],
  ['An AI voice sings it.', 'The voices are made with AI. A person listens to the takes and keeps one.'],
  ['The animal holds the object.', 'Each meme shows the artist’s animal with the thing the song is about. It looks calm about it.']
];
const TICKER = 'EMOTIONAL SUPPORT ANIMALS ONLY · PLEASE DO NOT FEED THE ARTISTS · FLASH PHOTOGRAPHY UPSETS THE CAT · ROOM 02 IS SADDER THAN IT LOOKS · THE ANIMALS ARE CALM · THE SONGS ARE NOT · KEEP YOUR VOICE DOWN · ';

// ---------- Floor plan (metres; the camera walks toward -z) ----------
const W = 7, HW = W / 2, H = 4.6, EYE = 1.6, FRAME_Y = 1.75;
const START = 4, BACK = 11, SPACING = 4.2, AFTER_DOOR = 6, AFTER_ROOM = 3, AHEAD = 5;
const plan = { doors: [], frames: [] };
{
  let z = -14, side = -1;
  ARTISTS.forEach((a) => {
    plan.doors.push({ a, z });
    z -= AFTER_DOOR;
    a.tracks.forEach((t, i) => {
      plan.frames.push({ t, z, side, i: plan.frames.length });
      side = -side;
      if (i < a.tracks.length - 1) z -= SPACING;
    });
    z -= AFTER_ROOM;
  });
  plan.notesZ = z;
  plan.notes = NOTES.map((n, i) => ({ n, z: z - 3 - i * 4, side: i % 2 ? 1 : -1 }));
  plan.exitZ = z - 17;
  plan.endZ = plan.exitZ + 5;
}
const frames = plan.frames;
const frameOf = (t) => frames.find((f) => f.t === t);
const viewZ = (f) => f.z + AHEAD;

// ---------- Renderer ----------
const canvas = $('#gl');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) { renderer = null; }

const intro = $('#intro'), body = document.body, guide = $('#guide');
let guideReturn = null;
history.scrollRestoration = 'manual';

if (!renderer) {
  // No WebGL: the gallery guide is the site.
  intro.hidden = true; body.classList.remove('is-intro');
  $('#gClose').hidden = true;
  document.querySelectorAll('.hud-top, .hud-bottom').forEach((el) => { el.hidden = true; });
  buildGuide(); openGuide();
  throw new Error('WebGL not available; showing the gallery guide.');
}

renderer.setPixelRatio(Math.min(devicePixelRatio, TOUCH ? 1.5 : 1.75));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const ANISO = renderer.capabilities.getMaxAnisotropy();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0a09);
scene.fog = new THREE.Fog(0x0b0a09, 7, 40);
const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 80);
camera.position.set(0, EYE, START + 7);
scene.add(camera);

// ---------- Canvas textures ----------
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const tx = new THREE.CanvasTexture(c);
  tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = ANISO;
  if (repeat) { tx.wrapS = tx.wrapT = THREE.RepeatWrapping; }
  return tx;
}
function lines(g, text, maxW) {
  const out = []; let cur = '';
  String(text).split(/\s+/).forEach((w) => {
    const next = cur ? `${cur} ${w}` : w;
    if (g.measureText(next).width > maxW && cur) { out.push(cur); cur = w; } else cur = next;
  });
  if (cur) out.push(cur);
  return out;
}
function spaced(g, px) { if ('letterSpacing' in g) g.letterSpacing = `${px}px`; }
function noise(g, w, h, base, amp, n) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    const v = Math.random();
    g.fillStyle = `rgba(${v > .5 ? '255,245,230' : '0,0,0'},${Math.random() * amp})`;
    g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
}
const MEME = 'Anton, Impact, sans-serif', SANS = 'Geist, system-ui, sans-serif';
// Meme caption: white letters with a thick black outline, like classic image macros.
function meme(g, text, x, y, size, fill = '#ffffff') {
  g.lineJoin = 'round'; g.miterLimit = 2; g.strokeStyle = '#050505'; g.lineWidth = size * .16;
  g.strokeText(text, x, y); g.fillStyle = fill; g.fillText(text, x, y);
}

// ---------- Loading ----------
const TOTAL = ALL.length + ARTISTS.length;
let loaded = 0;
$('#loadT').textContent = TOTAL;
const loader = new THREE.TextureLoader(); loader.setCrossOrigin('anonymous');
function tick() { loaded++; const n = $('#loadN'); if (n) n.textContent = Math.min(loaded, TOTAL); if (loaded === TOTAL) ready(); }
function coverFit(tx, aspect) {
  const img = tx.image; if (!img || !img.width) return;
  const a = img.width / img.height;
  tx.repeat.set(1, 1); tx.offset.set(0, 0);
  if (a > aspect) { tx.repeat.x = aspect / a; tx.offset.x = (1 - tx.repeat.x) / 2; }
  else { tx.repeat.y = a / aspect; tx.offset.y = (1 - tx.repeat.y) / 2; }
}
function loadPic(url, fallback, aspect, mat) {
  let done = false;
  const ok = (tx) => {
    tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = ANISO; coverFit(tx, aspect);
    mat.map = tx; mat.emissiveMap = tx; mat.color.set(0xffffff); mat.needsUpdate = true;
    if (!done) { done = true; tick(); }
  };
  loader.load(url, ok, undefined, () => {
    if (fallback && fallback !== url) loader.load(fallback, ok, undefined, () => { if (!done) { done = true; tick(); } });
    else if (!done) { done = true; tick(); }
  });
}

// ---------- Room shell ----------
const LEN = BACK - plan.exitZ, MID = (BACK + plan.exitZ) / 2;
const wallTex = canvasTex(512, 512, (g, w, h) => {
  noise(g, w, h, '#1b1916', .07, 9000);
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.18)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
}, true);
const floorTex = canvasTex(512, 512, (g, w, h) => {
  noise(g, w, h, '#151311', .1, 14000);
  g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 0, w, 2);
  g.fillStyle = 'rgba(255,240,220,.04)'; g.fillRect(0, 2, w, 1);
}, true);

function wallMat(rx, ry) {
  const t = wallTex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry);
  return new THREE.MeshStandardMaterial({ map: t, roughness: .92, metalness: 0 });
}
const solids = [];
function add(mesh, solid) { scene.add(mesh); if (solid) solids.push(mesh); return mesh; }

{
  const fT = floorTex.clone(); fT.needsUpdate = true; fT.repeat.set(W / 4, LEN / 4);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, LEN), new THREE.MeshStandardMaterial({ map: fT, roughness: .38, metalness: .1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, MID); add(floor, true);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, LEN), new THREE.MeshStandardMaterial({ color: 0x0d0c0b, roughness: 1 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, MID); add(ceil, true);
  [-1, 1].forEach((s) => {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(LEN, H), wallMat(LEN / 4, H / 4));
    wall.rotation.y = s < 0 ? Math.PI / 2 : -Math.PI / 2; wall.position.set(s * HW, H / 2, MID); add(wall, true);
    // Track lights along the ceiling
    const strip = new THREE.Mesh(new THREE.BoxGeometry(.05, .03, LEN), new THREE.MeshBasicMaterial({ color: 0x4a4339 }));
    strip.position.set(s * 2.3, H - .02, MID); scene.add(strip);
    // Skirting
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(.02, .1, LEN), new THREE.MeshStandardMaterial({ color: 0x080706, roughness: .6 }));
    skirt.position.set(s * (HW - .01), .05, MID); scene.add(skirt);
  });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), wallMat(W / 4, H / 4));
  back.rotation.y = Math.PI; back.position.set(0, H / 2, BACK); add(back, true);
}

// ---------- Lights ----------
scene.add(new THREE.HemisphereLight(0xfff1e0, 0x15110d, .55));
const flash = new THREE.SpotLight(0xffeedd, 90, 22, .36, .75, 1.6);
const flashTarget = new THREE.Object3D(); scene.add(flashTarget); flash.target = flashTarget; scene.add(flash);
const frameLight = new THREE.PointLight(0xffe2b8, 0, 7, 1.6); scene.add(frameLight);
const doorLight = new THREE.PointLight(0xffc98a, 10, 14, 1.4); scene.add(doorLight);

// ---------- Shared pieces ----------
const haloTex = canvasTex(256, 256, (g, w, h) => {
  const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  gr.addColorStop(0, 'rgba(255,226,180,.9)'); gr.addColorStop(.45, 'rgba(255,214,160,.28)'); gr.addColorStop(1, 'rgba(255,214,160,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
const haloMat = () => new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, opacity: .15, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
const frameBoxMat = new THREE.MeshStandardMaterial({ color: 0x0a0909, roughness: .45, metalness: .2 });
const barMat = new THREE.MeshBasicMaterial({ color: 0xffe9c8 });
const picMat = () => new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: .55, emissive: 0xffffff, emissiveIntensity: .16 });
const textMat = (map, color = 0xe6dfd3) => new THREE.MeshBasicMaterial({ map, color, transparent: true, depthWrite: false });

function onWall(obj, side, z, y) {
  obj.position.set(side * (HW - .05), y, z);
  obj.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
  return obj;
}

// ---------- Meme captions ----------
// BOTTOM TEXT for each work. The song title is the TOP TEXT.
const CAPS = {
  'ceralie-05': 'BILL CAME TOO FAST', 'ceralie-01': 'LEFT THE DOOR UNLOCKED. FOR NO REASON.',
  'ceralie-06': 'DOOR STAYS OPEN. DON’T ASK.', 'ceralie-07': 'THE VIEW WAS MID ANYWAY',
  'ceralie-04': 'SHE SAID ONE WORD. CLASS IS SHOOK.',
  'julius-06': 'NOSTALGIC FOR TODAY. ALREADY.', 'julius-08': 'STILL HERE. STILL NOT GOOD ENOUGH.',
  'julius-11': 'NOT MY FAULT. STILL CARRYING IT.', 'julius-05': 'CAN’T AFFORD A GIFT. CAN DRIVE YOU HOME.',
  'julius-07': 'TOOK THE SMALL PIECE. AGAIN.', 'julius-10': 'TEN YEARS. ONE PAN. WOULD REPEAT.',
  'halfsaid-05': 'EVERYONE KNOWS EXCEPT THEM', 'halfsaid-07': 'LOVE, BUT MAKE IT SHIPPING BOXES',
  'halfsaid-03': 'THIS IS A LOVE LETTER, TECHNICALLY', 'halfsaid-06': 'I DID NOT EAT',
  'halfsaid-11': 'SAME FIGHT. SEASON 4.', 'halfsaid-08': 'HE NEVER ASKED. SHE WAITED ANYWAY.',
  'halfsaid-04': 'TIRED. COMING BACK TOMORROW.', 'halfsaid-01': 'TWO BRAIN CELLS. ONE DECISION.'
};
const TAGLINES = { ceralie: 'SHE IS FINE. PROBABLY.', julius: 'THIS IS A DOG. TRUST US.', halfsaid: 'TWO CATS. ONE BOWL. NO NOTES.' };

// Text textures drawn before the fonts arrive are drawn again once they do.
const redraws = [];
function liveTex(w, h, draw) {
  const tx = canvasTex(w, h, draw);
  const c = tx.image;
  redraws.push(() => { const g = c.getContext('2d'); g.clearRect(0, 0, w, h); draw(g, w, h); tx.needsUpdate = true; });
  return tx;
}
// Largest meme size that fits the text in maxLines lines.
function fitMeme(g, text, maxW, size, maxLines) {
  let ls;
  for (; size > 18; size -= 4) {
    g.font = `400 ${size}px ${MEME}`;
    ls = lines(g, text, maxW);
    if (ls.length <= maxLines && ls.every((l) => g.measureText(l).width <= maxW)) break;
  }
  return { size, ls };
}
// Classic image macro: TOP TEXT at the top, BOTTOM TEXT at the bottom.
function macro(g, w, h, top, bottom, topSize, botSize) {
  g.textAlign = 'center'; g.textBaseline = 'alphabetic'; spaced(g, 1);
  const pad = w * .05, maxW = w - pad * 2;
  if (top) {
    const { size, ls } = fitMeme(g, top, maxW, topSize, 2);
    ls.forEach((l, i) => meme(g, l, w / 2, h * .035 + size * (.9 + i * 1.02), size));
  }
  if (bottom) {
    const { size, ls } = fitMeme(g, bottom, maxW, botSize, 2);
    ls.forEach((l, i) => meme(g, l, w / 2, h - h * .05 - size * 1.02 * (ls.length - 1 - i), size));
  }
}
const overlayMat = (map) => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, toneMapped: false });

// Small sticker beside each meme: number, length, feeling
function labelTex(t) {
  return liveTex(640, 300, (g, w, h) => {
    g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#5f5b53'; g.font = `500 24px ${SANS}`; spaced(g, 3);
    g.fillText(`NO. ${t.n}  ·  ${mmss(t.dur)}`, 36, 56);
    spaced(g, 0); g.fillStyle = '#121212'; g.font = `400 30px ${SANS}`;
    let y = 112;
    lines(g, t.feeling || '', w - 72).slice(0, 4).forEach((l) => { g.fillText(l, 36, y); y += 40; });
  });
}

// ---------- Song memes on the walls ----------
const KINDS = [
  { color: 0xf4f1ea, rough: .9, metal: 0, glow: 0xffffff },   // white sticker
  { color: 0xb8913c, rough: .35, metal: .7, glow: 0x6b5220 }, // gold
  { color: 0x0a0909, rough: .5, metal: .1, glow: 0x2a2724 }    // black
];
const tapeMat = new THREE.MeshStandardMaterial({ color: 0xe9dfc6, roughness: .9, transparent: true, opacity: .82 });
const PW = 3.0, PH = PW * 9 / 16;
const pickables = [];
function buildFrame(f) {
  const g = onWall(new THREE.Group(), f.side, f.z, FRAME_Y);
  g.position.x = f.side * (HW - .05);
  const kind = KINDS[f.i % 3];
  g.rotation.z = Math.sin(f.i * 12.9898) * .04; // a small, fixed tilt, like a sticker slapped on
  const matM = new THREE.MeshStandardMaterial({ color: kind.color, roughness: kind.rough, metalness: kind.metal, emissive: kind.glow, emissiveIntensity: .03 });
  const border = new THREE.Mesh(new THREE.BoxGeometry(PW + .2, PH + .2, .05), matM); border.position.z = .025; g.add(border);
  const pm = picMat();
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), pm); pic.position.z = .052; g.add(pic);
  loadPic(f.t.meme, f.t.artist.cover, 16 / 9, pm);
  const ot = liveTex(1280, 720, (c, w, h) => macro(c, w, h, f.t.title.toUpperCase(), CAPS[f.t.id] || '', 118, 92));
  const over = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), overlayMat(ot)); over.position.z = .054; g.add(over);
  if (f.i % 3 === 0) { // sticker kind gets tape on two corners
    [[-1, 1], [1, 1]].forEach(([sx, sy]) => {
      const tp = new THREE.Mesh(new THREE.PlaneGeometry(.55, .16), tapeMat);
      tp.position.set(sx * (PW / 2 + .02), sy * (PH / 2 + .04), .058); tp.rotation.z = -sx * .7; g.add(tp);
    });
  }
  const hm = haloMat();
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 3.6), hm); halo.position.set(0, .15, .005); g.add(halo);
  const lt = labelTex(f.t);
  const lm = new THREE.MeshStandardMaterial({ map: lt, roughness: .8, emissive: 0xffffff, emissiveMap: lt, emissiveIntensity: .2 });
  const label = new THREE.Mesh(new THREE.PlaneGeometry(.6, .28), lm); label.position.set(2.1, -.62, .012); label.rotation.z = .03; g.add(label);
  scene.add(g);
  const fm = haloMat();
  const fg = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.8), fm);
  fg.rotation.x = -Math.PI / 2; fg.position.set(f.side * 2.7, .012, f.z); scene.add(fg);
  [pic, over, border].forEach((m) => { m.userData.frame = f; pickables.push(m); });
  Object.assign(f, { group: g, pm, matM, hm, lm, fm, glow: 0 });
}
frames.forEach(buildFrame);

// ---------- Rooms: one giant reaction meme across the corridor ----------
// It hangs where a door would be. Walk close and it tears in half to let you in.
const BW = 6.4, BH = 3.9, BY = 2.45;
function halfPlane(w, h, half) {
  const geo = new THREE.PlaneGeometry(w, h);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * .5 + (half > 0 ? .5 : 0));
  return geo;
}
// Paper with a ragged edge where it tears
function paperHalf(half) {
  const s = new THREE.Shape(), m = .14, x0 = -half * (BW / 4 + m), x1 = half * (BW / 4 + .06);
  const top = BH / 2 + m, bot = -BH / 2 - m;
  s.moveTo(x0, bot); s.lineTo(x0, top); s.lineTo(x1, top);
  for (let i = 1, n = 22; i < n; i++) s.lineTo(x1 + half * (i % 2 ? -.07 : .03) * (1 + Math.sin(i * 7.1) * .5), top - (top - bot) * i / n);
  s.lineTo(x1, bot); s.lineTo(x0, bot);
  return new THREE.ShapeGeometry(s);
}
const paperMat = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: .95, emissive: 0xffffff, emissiveIntensity: .08, side: THREE.DoubleSide });
const banners = [];
function buildDoor(d) {
  const a = d.a;
  const pm = picMat(); pm.emissiveIntensity = .5;
  loadPic(MASCOTS[a.id] || a.cover, a.cover, BW / BH, pm);
  const ot = liveTex(1600, 975, (c, w, h) => macro(c, w, h, `ROOM ${+a.no}: ${a.name.toUpperCase()}`, TAGLINES[a.id], 150, 120));
  const om = overlayMat(ot);
  const halves = [-1, 1].map((half) => {
    const hg = new THREE.Group(); hg.position.set(half * BW / 4, BY, d.z);
    const paper = new THREE.Mesh(paperHalf(half), paperMat); hg.add(paper);
    const pic = new THREE.Mesh(halfPlane(BW / 2, BH, half), pm); pic.position.z = .01; hg.add(pic);
    const over = new THREE.Mesh(halfPlane(BW / 2, BH, half), om); over.position.z = .012; hg.add(over);
    // Two wires up to the ceiling
    const wire = new THREE.Mesh(new THREE.BoxGeometry(.012, H - BY - BH / 2 - .14, .012), frameBoxMat);
    wire.position.set(-half * BW / 8 * 1.6, BH / 2 + .14 + (H - BY - BH / 2 - .14) / 2, 0); hg.add(wire);
    scene.add(hg);
    return { hg, half, wire };
  });
  banners.push({ d, halves, p: -1 });

  // Album wall text on the side wall, just inside the room
  const side = -(plan.frames.find((f) => f.t.artist === a).side);
  const wt = liveTex(1400, 1000, (g, w) => {
    g.textAlign = 'left'; g.fillStyle = '#a39c90'; g.font = `500 34px ${SANS}`; spaced(g, 8);
    g.fillText(`ROOM ${a.no}  ·  ALBUM  ·  ${a.tracks.length} WORKS`, 10, 56);
    spaced(g, 1); const { size } = fitMeme(g, a.album.toUpperCase(), w - 40, 190, 1);
    meme(g, a.album.toUpperCase(), 10, 70 + size, size, '#efe9df');
    spaced(g, 0); g.fillStyle = '#efe9df'; g.font = `400 46px ${SANS}`; let y = 110 + size + 50;
    lines(g, a.bio, w - 60).forEach((l) => { g.fillText(l, 10, y); y += 66; });
    y += 24; g.fillStyle = '#ffd400'; g.fillRect(10, y, 90, 6); y += 70;
    g.fillStyle = '#a39c90'; g.font = `400 40px ${SANS}`;
    lines(g, `The animal: ${a.mascot}`, w - 60).forEach((l) => { g.fillText(l, 10, y); y += 58; });
  });
  scene.add(onWall(new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.0), textMat(wt)), side, d.z - 2.4, 1.95));
}
plan.doors.forEach(buildDoor);
// Tear: 0 while the camera is more than 3.4 m away, 1 at 0.6 m. Driven by position, so it mends when you walk back.
function tearBanners(cz) {
  banners.forEach((b) => {
    const raw = clamp((b.d.z + 3.4 - cz) / 2.8, 0, 1);
    const p = raw * raw * (3 - 2 * raw);
    if (Math.abs(p - b.p) < 1e-4) return;
    b.p = p;
    b.halves.forEach(({ hg, half, wire }) => {
      hg.visible = p < .999;
      hg.position.x = half * (BW / 4 + p * 2.6);
      hg.position.y = BY - p * p * 1.8;
      hg.position.z = b.d.z + p * .25;
      hg.rotation.z = -half * p * .55;
      hg.rotation.y = half * p * .35;
      wire.visible = p < .05;
    });
  });
}

// Giant type in the entrance hall
function bigType(text, italic) {
  return canvasTex(4096, 1024, (g, w, h) => {
    text = text.toUpperCase(); let size = 760; g.font = `400 ${size}px ${MEME}`;
    const m = g.measureText(text).width; if (m > w - 200) { size *= (w - 200) / m; g.font = `400 ${size}px ${MEME}`; }
    meme(g, text, 80, h * .8, size, '#efe9df');
  });
}
{
  const l = onWall(new THREE.Mesh(new THREE.PlaneGeometry(9.6, 2.4), textMat(bigType('Sad songs,'), 0xd9d1c4)), -1, -2.6, 2.1); scene.add(l);
  const r = onWall(new THREE.Mesh(new THREE.PlaneGeometry(9.6, 2.4), textMat(bigType('calm animals.', true), 0xd9d1c4)), 1, -5.6, 2.1); scene.add(r);
  // A small welcome plaque on the floor line of the first door
  l.position.x += .01; r.position.x -= .01;
}

// Ticker band near the ceiling, on both walls
const tickers = [];
{
  const c = document.createElement('canvas').getContext('2d'); c.font = `500 40px ${SANS}`; spaced(c, 10);
  const tw = Math.ceil(c.measureText(TICKER).width);
  const tt = canvasTex(tw, 72, (g, w, h) => { g.font = `500 40px ${SANS}`; spaced(g, 10); g.fillStyle = '#8f887c'; g.fillText(TICKER, 0, 50); }, true);
  tt.wrapT = THREE.ClampToEdgeWrapping;
  const tileLen = .26 * tw / 72;
  [-1, 1].forEach((s) => {
    const t = tt.clone(); t.needsUpdate = true; t.repeat.set(LEN / tileLen, 1);
    const m = onWall(new THREE.Mesh(new THREE.PlaneGeometry(LEN, .26), textMat(t, 0xffffff)), s, MID, 4.22);
    m.position.x = s * (HW - .02); scene.add(m); tickers.push({ t, s, tileLen });
  });
}

// Notes on the collection: wall text
plan.notes.forEach((p, i) => {
  const tx = canvasTex(2048, 1100, (g, w) => {
    g.fillStyle = '#a39c90'; g.font = `500 44px ${SANS}`; spaced(g, 12);
    g.fillText(i === 0 ? 'NOTES ON THE COLLECTION · 01' : `0${i + 1}`, 0, 70);
    spaced(g, 1); g.fillStyle = '#efe9df'; g.font = `400 160px ${MEME}`;
    let y = 250; lines(g, p.n[0].toUpperCase(), w - 80).forEach((l) => { g.fillText(l, 0, y); y += 170; });
    g.fillStyle = '#c9c1b4'; g.font = `400 62px ${SANS}`; spaced(g, 0); y += 30;
    lines(g, p.n[1], w - 200).forEach((l) => { g.fillText(l, 0, y); y += 92; });
  });
  scene.add(onWall(new THREE.Mesh(new THREE.PlaneGeometry(4.0, 2.15), textMat(tx)), p.side, p.z, 2.0));
});

// Exit wall
{
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(W, H), wallMat(W / 4, H / 4));
  wall.position.set(0, H / 2, plan.exitZ); add(wall, true);
  const tx = canvasTex(2048, 1024, (g, w) => {
    g.textAlign = 'center'; g.fillStyle = '#a39c90'; g.font = `500 40px ${SANS}`; spaced(g, 14);
    g.fillText('END OF THE COLLECTION', w / 2, 120);
    spaced(g, 2); g.font = `400 200px ${MEME}`;
    meme(g, 'THANK YOU FOR', w / 2, 370, 200); meme(g, 'WALKING SLOWLY.', w / 2, 590, 200);
  });
  const t = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.6), textMat(tx)); t.position.set(0, 2.55, plan.exitZ + .01); scene.add(t);
  const sign = canvasTex(512, 160, (g, w, h) => {
    g.fillStyle = '#16140f'; g.fillRect(0, 0, w, h); g.textAlign = 'center'; g.fillStyle = '#efe9df'; g.font = `600 84px ${SANS}`; spaced(g, 24); g.fillText('EXIT', w / 2 + 12, 112);
  });
  const s = new THREE.Mesh(new THREE.BoxGeometry(.9, .28, .05), [frameBoxMat, frameBoxMat, frameBoxMat, frameBoxMat, new THREE.MeshBasicMaterial({ map: sign }), frameBoxMat]);
  s.position.set(0, 4.1, plan.exitZ + .05); scene.add(s);
  const el = new THREE.PointLight(0xfff0dc, 10, 9, 1.4); el.position.set(0, 3.4, plan.exitZ + 2.5); scene.add(el);
}

// ---------- Walking ----------
const PX = 110; // scroll pixels per metre
const DIST = START - plan.endZ;
const track = $('#track');
const mouse = { x: 0, y: 0, nx: 0, ny: 0, cx: innerWidth / 2, cy: innerHeight / 2, moved: false };
const st = {
  entered: false, focus: null, hover: null, active: null, activeW: 0,
  vz: 0, phase: 0, shift: { x: 0, y: 0 }, fov: 55
};
const look = new THREE.Vector3(0, EYE, -10);
const lookDummy = new THREE.PerspectiveCamera(); // a camera, so lookAt faces -z like the real one
const ray = new THREE.Raycaster();
const tmpV = new THREE.Vector3();
const portrait = () => innerWidth / innerHeight < .8;

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  st.fov = portrait() ? 72 : 55;
  camera.updateProjectionMatrix();
  track.style.height = `${Math.round(DIST * PX + h)}px`;
}
addEventListener('resize', resize); resize();

const targetZ = () => START - clamp(scrollY / PX, 0, DIST);
const scrollToZ = (z, smooth) => scrollTo({ top: (START - z) * PX, behavior: smooth && !RM ? 'smooth' : 'auto' });

addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch') return;
  mouse.cx = e.clientX; mouse.cy = e.clientY; mouse.moved = true;
  mouse.nx = (e.clientX / innerWidth) * 2 - 1; mouse.ny = (e.clientY / innerHeight) * 2 - 1;
});

// ---------- HUD ----------
const roomN = $('#roomN'), roomT = $('#roomT'), hint = $('#hint'), exitEl = $('#exit');
const peek = $('#peek'), cursor = $('#cursor');
let roomKey = '';
function setRoom(z) {
  let key = 'entrance', n = 'Entrance', t = 'Sad songs, calm animals.';
  plan.doors.forEach((d) => { if (z <= d.z + 8) { key = d.a.id; n = `Room ${d.a.no}`; t = `${d.a.name} · ${d.a.album}`; } });
  if (z <= plan.notesZ) { key = 'notes'; n = 'Hallway'; t = 'Notes on the collection.'; }
  if (z <= plan.endZ + 6) { key = 'exit'; n = 'Exit'; t = 'Thank you for walking slowly.'; }
  if (key === roomKey) return;
  roomKey = key; roomN.textContent = n; roomT.textContent = t;
}

// Floor plan: one tick per work
$('#map').innerHTML = ARTISTS.map((a) => `<div class="seg" data-n="${a.no}">${a.tracks.map((t) =>
  `<button type="button" data-jump="${t.id}" aria-label="Walk to ${esc(t.title)}, ${esc(a.name)}"></button>`).join('')}</div>`).join('');
const ticks = new Map([...document.querySelectorAll('[data-jump]')].map((b) => [b.dataset.jump, b]));
$('#map').addEventListener('click', (e) => {
  const b = e.target.closest('[data-jump]'); if (!b) return;
  const f = frames.find((x) => x.t.id === b.dataset.jump);
  if (st.focus) openFocus(f); else scrollToZ(viewZ(f), true);
});

// ---------- Audio ----------
const audio = { t: null, playing: false, done: false, failed: new Set() };
const soundBtn = $('#soundBtn'), now = $('#now'), nowT = $('#nowT'), nowP = $('#nowP');
let nowTimer = 0;
function playTrack(t) {
  if (!Sound.enabled) return;
  audio.t = t; audio.playing = true; audio.done = false;
  Sound.play(t);
  $('#live').textContent = `Playing ${t.title} by ${t.artist.name}`;
  syncAudio();
}
function pauseTrack() { Sound.pause(); audio.playing = false; syncAudio(); }
function stopTrack(ms = 900) { Sound.stop(ms); audio.playing = false; audio.t = null; syncAudio(); }
function toggleTrack(t) {
  if (!Sound.enabled) { Sound.unlock(); }
  if (audio.t === t && audio.playing) pauseTrack();
  else { audio.failed.delete(t.id); playTrack(t); }
}
Sound.onerror = (t) => {
  audio.failed.add(t.id);
  if (audio.t && audio.t.id === t.id) audio.playing = false;
  $('#live').textContent = 'Audio not online yet.';
  syncAudio();
};
function syncAudio() {
  const on = Sound.enabled;
  soundBtn.setAttribute('aria-pressed', on);
  soundBtn.querySelector('.lbl').textContent = on ? 'Sound on' : 'Sound off';
  const t = audio.t, failed = t && audio.failed.has(t.id);
  clearTimeout(nowTimer);
  if (t && (audio.playing || failed)) {
    now.hidden = false; now.classList.toggle('err', !!failed);
    nowT.textContent = failed ? `Audio not online yet · ${t.title}` : `${t.title} · ${t.artist.name}`;
    if (failed) nowTimer = setTimeout(() => { now.hidden = true; }, 3200);
  } else now.hidden = true;
  const f = st.focus;
  const fPlaying = !!(f && audio.t === f.t && audio.playing);
  $('#fPlay').classList.toggle('playing', fPlaying);
  $('#fPlay .t').textContent = fPlaying ? 'Pause' : 'Play a preview';
  $('#fErr').hidden = !(f && audio.failed.has(f.t.id));
  document.querySelectorAll('[data-gplay]').forEach((b) => {
    const p = audio.playing && audio.t && audio.t.id === b.dataset.gplay;
    b.classList.toggle('playing', p); b.querySelector('.t').textContent = p ? 'Pause' : 'Play';
  });
}
soundBtn.addEventListener('click', () => {
  if (Sound.enabled) { Sound.mute(); audio.playing = false; audio.t = null; }
  else { Sound.unlock(); const f = st.focus || st.active; if (f) playTrack(f.t); }
  syncAudio();
});

// Auto-play the work in front of you, like an audio guide
let autoTimer = 0;
function onActive(f) {
  clearTimeout(autoTimer);
  if (f) {
    ticks.forEach((b, id) => b.classList.toggle('on', id === f.t.id));
    if (Sound.enabled) autoTimer = setTimeout(() => { if (st.active === f && !st.focus && audio.t !== f.t) playTrack(f.t); }, 700);
  } else {
    ticks.forEach((b) => b.classList.remove('on'));
    autoTimer = setTimeout(() => { if (!st.active && !st.focus && audio.t) stopTrack(); }, 1200);
  }
}

// ---------- Focus: one work up close ----------
const focusEl = $('#focus');
function openFocus(f) {
  if (!f) return;
  const t = f.t, a = t.artist;
  st.focus = f;
  body.classList.add('is-focus');
  focusEl.hidden = false; focusEl.classList.remove('on'); void focusEl.offsetWidth; focusEl.classList.add('on');
  $('#fKick').textContent = `Room ${a.no} · ${a.name} · No. ${t.n} · ${mmss(t.dur)}`;
  $('#fTitle').textContent = t.title;
  $('#fFeel').textContent = t.feeling || '';
  $('#fStory').innerHTML = (t.story || []).map((l, i) => `<p style="animation-delay:${(.4 + i * .16).toFixed(2)}s">${esc(l)}</p>`).join('');
  $('#fLyric').textContent = t.line || ''; $('#fLyric').hidden = !t.line;
  const i = frames.indexOf(f);
  $('#fPrev').textContent = `← ${frames[(i - 1 + frames.length) % frames.length].t.title}`;
  $('#fNext').textContent = `${frames[(i + 1) % frames.length].t.title} →`;
  history.replaceState(null, '', `#/${a.id}/${t.n}`);
  document.title = `${t.title} · ${a.name} · Emotional Support Animals`;
  ticks.forEach((b, id) => b.classList.toggle('on', id === t.id));
  if (Sound.enabled && audio.t !== t) { clearTimeout(autoTimer); autoTimer = setTimeout(() => { if (st.focus === f) playTrack(t); }, 600); }
  syncAudio();
  setTimeout(() => $('#fClose').focus({ preventScroll: true }), 50);
}
function closeFocus() {
  const f = st.focus; if (!f) return;
  st.focus = null;
  body.classList.remove('is-focus');
  focusEl.classList.remove('on'); focusEl.hidden = true;
  history.replaceState(null, '', '#/');
  document.title = 'Emotional Support Animals';
  scrollToZ(viewZ(f));
  syncAudio();
}
const step = (d) => { const f = st.focus || st.active; const i = f ? frames.indexOf(f) : -1; return frames[clamp(i + d, 0, frames.length - 1)]; };
$('#fPrev').addEventListener('click', () => openFocus(frames[(frames.indexOf(st.focus) - 1 + frames.length) % frames.length]));
$('#fNext').addEventListener('click', () => openFocus(frames[(frames.indexOf(st.focus) + 1) % frames.length]));
$('#fClose').addEventListener('click', closeFocus);
$('#fPlay').addEventListener('click', () => st.focus && toggleTrack(st.focus.t));

canvas.addEventListener('click', (e) => {
  if (!st.entered || st.focus) return;
  const f = pick(e.clientX, e.clientY);
  if (f) openFocus(f);
});
function pick(x, y) {
  ray.setFromCamera({ x: (x / innerWidth) * 2 - 1, y: -(y / innerHeight) * 2 + 1 }, camera);
  const hit = ray.intersectObjects(pickables, false)[0];
  return hit && hit.distance < 16 ? hit.object.userData.frame : null;
}

// ---------- Gallery guide ----------
function buildGuide() {
  $('#gRooms').innerHTML = ARTISTS.map((a) => `
    <section class="g-room" aria-labelledby="g-${a.id}">
      <h3 id="g-${a.id}">${esc(a.name)}</h3>
      <p class="g-k">Room ${a.no} · ${esc(a.album)} · ${a.tracks.length} works</p>
      <p>${esc(a.bio)} ${esc(a.mascot)}</p>
      <ul class="g-list">${a.tracks.map((t) => `
        <li><img src="${esc(t.meme)}" alt="Meme for ${esc(t.title)}: placeholder cat" loading="lazy">
          <div><b>${esc(t.title)}</b><span>No. ${t.n} · ${mmss(t.dur)} · ${esc(t.feeling || '')}</span></div>
          <div class="g-acts"><button type="button" data-gplay="${t.id}"><span class="ic" aria-hidden="true"></span><span class="t">Play</span></button>${renderer ? `<button type="button" data-show="${t.id}">Show in gallery</button>` : ''}</div></li>`).join('')}
      </ul>
    </section>`).join('');
}
function openGuide() {
  guideReturn = document.activeElement;
  guide.hidden = false; body.classList.add('is-guide');
  $('#gClose').focus({ preventScroll: true });
}
function closeGuide() {
  guide.hidden = true; body.classList.remove('is-guide');
  if (guideReturn && guideReturn.focus) guideReturn.focus({ preventScroll: true });
}
buildGuide();
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-open-list]')) { openGuide(); return; }
  const gp = e.target.closest('[data-gplay]');
  if (gp) { toggleTrack(ALL.find((t) => t.id === gp.dataset.gplay)); return; }
  const sh = e.target.closest('[data-show]');
  if (sh) {
    const f = frames.find((x) => x.t.id === sh.dataset.show);
    closeGuide();
    if (!st.entered) enter(false);
    openFocus(f);
  }
});
$('#gClose').addEventListener('click', closeGuide);
guide.addEventListener('click', (e) => { if (e.target === guide) closeGuide(); });

// ---------- Keyboard ----------
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (!guide.hidden) closeGuide(); else closeFocus(); return; }
  if (!st.entered || !guide.hidden || e.target.closest('input, textarea')) return;
  const next = ['ArrowDown', 'ArrowRight', 'j', 'PageDown'].includes(e.key);
  const prev = ['ArrowUp', 'ArrowLeft', 'k', 'PageUp'].includes(e.key);
  if (next || prev) {
    e.preventDefault();
    const f = step(next ? 1 : -1);
    if (st.focus) openFocus(f); else scrollToZ(viewZ(f), true);
  } else if (e.key === 'Enter' && !st.focus && st.active && e.target === body) openFocus(st.active);
});

// ---------- Routes ----------
function parse() {
  const [, a, n] = location.hash.replace(/^#\/?/, '#/').split('/');
  const artist = ARTISTS.find((x) => x.id === a);
  const t = artist && n && artist.tracks.find((x) => x.n === n);
  return { artist, t };
}
function route() {
  const { artist, t } = parse();
  if (t) { openFocus(frameOf(t)); return; }
  closeFocus();
  if (artist) scrollToZ(plan.doors.find((d) => d.a === artist).z + 7, true);
  else if (st.entered) scrollToZ(START, true);
}
addEventListener('hashchange', route);

// ---------- Intro ----------
let isReady = false;
function ready() {
  if (isReady) return; isReady = true;
  intro.classList.add('ready');
  $('#loader').textContent = 'The museum is open.';
}
setTimeout(ready, 8000);
function enter(withSound) {
  if (st.entered) return;
  st.entered = true;
  if (withSound) Sound.unlock();
  intro.classList.add('out');
  body.classList.remove('is-intro');
  scrollTo(0, 0);
  syncAudio();
  setTimeout(() => { intro.hidden = true; }, 1800);
  const { t, artist } = parse();
  if (t) setTimeout(() => openFocus(frameOf(t)), 900);
  else if (artist) setTimeout(() => scrollToZ(plan.doors.find((d) => d.a === artist).z + 7, true), 900);
}
$('#enterSound').addEventListener('click', () => enter(true));
$('#enterQuiet').addEventListener('click', () => enter(false));
$('.mark').addEventListener('click', (e) => { e.preventDefault(); closeFocus(); scrollToZ(START, true); });

// ---------- Frame loop ----------
const clock = new THREE.Clock();
let t0 = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), .05); t0 += dt;
  const k = (s) => 1 - Math.exp(-dt * s);
  const f = st.focus;

  // Where the body goes
  let tx = 0, ty = EYE, tz;
  if (f) {
    const far = portrait();
    tx = -f.side * (far ? 1.6 : .35); tz = f.z; ty = far ? 1.7 : EYE;
    look.set(f.side * HW, FRAME_Y, f.z);
  } else {
    tz = st.entered ? targetZ() : START + 7;
  }
  const pz = camera.position.z;
  camera.position.z = lerp(pz, tz, k(f ? 2.6 : RM ? 9 : 3.4));
  st.vz = lerp(st.vz, Math.abs(camera.position.z - pz) / Math.max(dt, 1e-3), k(6));
  st.phase += Math.abs(camera.position.z - pz) * 2.2;
  const bob = RM || f ? 0 : Math.sin(st.phase) * .035 * clamp(st.vz / 3, 0, 1);
  const sway = RM || f ? 0 : Math.sin(t0 * .4) * .08;
  camera.position.x = lerp(camera.position.x, tx + sway, k(2.4));
  camera.position.y = lerp(camera.position.y, ty + bob, k(5));

  // Which work is in front of you
  if (!f && st.entered) {
    const zAhead = camera.position.z - AHEAD;
    let best = null, bd = 2.1;
    frames.forEach((fr) => { const d = Math.abs(fr.z - zAhead); if (d < bd) { bd = d; best = fr; } });
    if (best !== st.active) { st.active = best; onActive(best); }
  }
  const act = f || st.active;
  st.activeW = lerp(st.activeW, act && !f ? 1 : 0, k(2));

  // Where the eyes go
  if (!f) {
    if (TOUCH || !mouse.moved) { mouse.x = Math.sin(t0 * .23) * .18; mouse.y = Math.sin(t0 * .17) * .1; }
    else { mouse.x = lerp(mouse.x, mouse.nx, k(4)); mouse.y = lerp(mouse.y, mouse.ny, k(4)); }
    const bias = st.active ? st.active.side * (portrait() ? .72 : .3) * st.activeW : 0;
    const yaw = mouse.x * .42 + bias, pitch = -mouse.y * .16 - .02;
    look.set(camera.position.x + Math.sin(yaw) * 6, camera.position.y + Math.sin(pitch) * 6, camera.position.z - Math.cos(yaw) * 6);
  }
  lookDummy.position.copy(camera.position); lookDummy.lookAt(look);
  camera.quaternion.slerp(lookDummy.quaternion, k(f ? 3 : 5));

  // Lens: wider on phones, shifted so the panel does not cover the work
  const sx = f && !portrait() ? .21 : 0, sy = f && portrait() ? .27 : 0;
  st.shift.x = lerp(st.shift.x, sx, k(3)); st.shift.y = lerp(st.shift.y, sy, k(3));
  camera.fov = lerp(camera.fov, st.fov, k(4));
  if (Math.abs(st.shift.x) + Math.abs(st.shift.y) > .001) {
    const w = innerWidth, h = innerHeight;
    camera.setViewOffset(w, h, st.shift.x * w, st.shift.y * h, w, h);
  } else camera.clearViewOffset();
  camera.updateProjectionMatrix();

  // Hover
  let hov = null;
  if (st.entered && !f && !TOUCH && mouse.moved && guide.hidden) hov = pick(mouse.cx, mouse.cy);
  if (hov !== st.hover) {
    st.hover = hov;
    cursor.classList.toggle('look', !!hov); peek.classList.toggle('on', !!hov);
    if (hov) { $('#peekK').textContent = `No. ${hov.t.n} · ${hov.t.artist.name}`; $('#peekT').textContent = hov.t.title; }
  }
  if (!TOUCH) {
    cursor.style.transform = `translate3d(${mouse.cx}px,${mouse.cy}px,0)`;
    const px = clamp(mouse.cx + 46, 8, innerWidth - 290), py = clamp(mouse.cy + 30, 8, innerHeight - 110);
    peek.style.transform = `translate3d(${px}px,${py}px,0)`;
  }

  // Glow: the work in front of you, the one under the cursor, the one up close
  const lvl = Sound.level ? Sound.level() : 0;
  frames.forEach((fr) => {
    const on = fr === act || fr === hov ? 1 : 0;
    fr.glow = lerp(fr.glow, on, k(on ? 3 : 1.6));
    const pulse = fr === audio.t && audio.playing ? lvl * .25 : 0;
    fr.pm.emissiveIntensity = .14 + fr.glow * .78 + pulse;
    fr.matM.emissiveIntensity = .025 + fr.glow * .22;
    fr.lm.emissiveIntensity = .18 + fr.glow * .7;
    fr.hm.opacity = .1 + fr.glow * .55 + pulse;
    fr.fm.opacity = .05 + fr.glow * .32;
  });
  if (act) {
    frameLight.position.set(act.side * 1.6, 2.6, act.z);
    frameLight.intensity = lerp(frameLight.intensity, 9 + lvl * 6, k(3));
  } else frameLight.intensity = lerp(frameLight.intensity, 0, k(3));

  // Door light: the nearest arch ahead
  let dz = null;
  plan.doors.forEach((d) => { if (d.z < camera.position.z + 2 && (dz === null || d.z > dz)) dz = d.z; });
  if (dz !== null) doorLight.position.set(0, 2.6, dz + 2.6);
  tearBanners(camera.position.z);

  // Flashlight follows the cursor
  flash.position.copy(camera.position); flash.position.y -= .15;
  ray.setFromCamera({ x: f ? 0 : mouse.x * .9, y: f ? 0 : -mouse.y * .9 }, camera);
  const hit = ray.intersectObjects(solids, false)[0];
  if (hit) flashTarget.position.lerp(hit.point, k(8));
  flash.intensity = (f ? 35 : 80) + lvl * 60;

  // Ticker drifts
  if (!RM) tickers.forEach((tk) => { tk.t.offset.x = (t0 * .045) % 1; });

  // HUD
  if (st.entered) {
    setRoom(camera.position.z);
    if (scrollY > 40) hint.classList.add('gone');
    exitEl.classList.toggle('on', !f && camera.position.z < plan.endZ + 5);
  }
  if (audio.playing && audio.t) {
    const p = (Sound.time() - audio.t.start) / (audio.t.end - audio.t.start);
    nowP.style.width = `${clamp(p, 0, 1) * 100}%`;
    if (p >= 1) { Sound.stop(900); audio.playing = false; audio.done = true; syncAudio(); }
  }

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// Wait for the fonts before drawing canvas text, then build the label textures.
// (Textures above were drawn with fallback fonts if the fonts were slow; redraw them once they arrive.)
Promise.all([
  document.fonts.load(`400 100px Anton`), document.fonts.load(`500 40px Geist`)
]).catch(() => {}).finally(() => { redraws.forEach((r) => r()); scrollTo(0, 0); requestAnimationFrame(frame); });

window.__museum = { plan, frames, st, camera, openFocus, closeFocus, enter, scrollToZ, viewZ };
