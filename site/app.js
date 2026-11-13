// Three Doors: gallery wall. Routes: #/ home, #/<artist> artist page, #/<artist>/<nn> song page.
// Data: tracks.js (audio and preview times), stories.js (story and lyric), memes.js (thumbnails).

const $ = (s, el = document) => el.querySelector(s);
const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

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
const FEATURED = 'halfsaid-06';

ARTISTS.forEach((a) => {
  a.tracks = TRACKS[a.id].map((t) => ({ ...t, id: `${a.id}-${t.n}`, artist: a }));
  a.tracks.forEach((t) => { Object.assign(t, STORIES[t.id]); t.meme = MEMES[t.id] || a.cover; });
});
const ALL = ARTISTS.flatMap((a) => a.tracks);
const byId = (id) => ALL.find((t) => t.id === id);
const songHref = (t) => `#/${t.artist.id}/${t.n}`;

// ---------- Building blocks ----------
const pic = (t, eager) => `<div class="pic"><img src="${esc(t.meme)}" alt="Meme for ${esc(t.title)}: placeholder cat" ${eager ? '' : 'loading="lazy"'} decoding="async"></div>`;
const label = (t) => `<div class="label"><div class="k"><span>No. ${t.n} · ${esc(t.artist.name)}</span><span>${mmss(t.dur)}</span></div>
  <div class="t">${esc(t.title)}</div><div class="f">${esc(t.feeling || '')}</div></div>`;

function card(t) {
  return `<li class="card" data-id="${t.id}" data-artist="${t.artist.id}">
    <a class="open" href="${songHref(t)}"><figure class="frame">${pic(t)}${label(t)}</figure></a>
    <button class="mini" type="button" data-play="${t.id}" aria-label="Play a preview of ${esc(t.title)}"><span class="ic" aria-hidden="true"></span></button>
  </li>`;
}

// ---------- Home ----------
const hero = byId(FEATURED);
$('#heroFrame').innerHTML = `${pic(hero, true)}<figcaption>${label(hero)}</figcaption>`;
$('#heroPlay').dataset.play = hero.id;
$('#seeAll').textContent = `See all ${ALL.length} songs`;

$('#doorList').innerHTML = ARTISTS.map((a) => `
  <a class="door" href="#/${a.id}">
    <div class="arch"><img src="${esc(MASCOTS[a.id] || a.cover)}" alt="${esc(a.name)}'s animal: placeholder cat" loading="lazy"></div>
    <h3>${esc(a.name)}</h3>
    <p class="mascot">${esc(a.mascot)}</p>
    <p class="bio">${esc(a.bio)}</p>
    <div class="meta"><span>${esc(a.album)}</span><span>${a.tracks.length} songs</span></div>
  </a>`).join('');

$('#grid').innerHTML = ALL.map(card).join('');

const chips = [{ id: 'all', name: 'All' }, ...ARTISTS];
$('#chips').innerHTML = chips.map((c, i) => `<button type="button" data-f="${c.id}" aria-pressed="${i === 0}">${esc(c.name)}</button>`).join('');
$('#chips').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  $('#chips').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b));
  const f = b.dataset.f;
  $('#grid').querySelectorAll('.card').forEach((c) => { c.hidden = f !== 'all' && c.dataset.artist !== f; });
});

// Nav links scroll to a home section, even from another page
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-go]'); if (!a) return;
  e.preventDefault();
  const target = a.dataset.go;
  if (route().name !== 'home') { pendingScroll = target; location.hash = '#/'; }
  else document.getElementById(target).scrollIntoView();
});
let pendingScroll = null;

// ---------- Router ----------
function route() {
  const [, a, n] = location.hash.replace(/^#\/?/, '#/').split('/');
  const artist = ARTISTS.find((x) => x.id === a);
  if (artist && n) { const t = artist.tracks.find((x) => x.n === n); if (t) return { name: 'song', t }; }
  if (artist) return { name: 'artist', artist };
  return { name: 'home' };
}

function show() {
  const r = route();
  ['home', 'artist', 'song'].forEach((v) => { $(`#${v}`).hidden = v !== r.name; });
  if (r.name === 'artist') renderArtist(r.artist);
  if (r.name === 'song') renderSong(r.t);
  document.title = r.name === 'song' ? `${r.t.title} · ${r.t.artist.name} · Three Doors`
    : r.name === 'artist' ? `${r.artist.name} · Three Doors` : 'Three Doors';
  if (pendingScroll && r.name === 'home') { const id = pendingScroll; pendingScroll = null; requestAnimationFrame(() => document.getElementById(id).scrollIntoView()); }
  else window.scrollTo(0, 0);
  sync();
}

function renderArtist(a) {
  $('#artistArch').innerHTML = `<img src="${esc(MASCOTS[a.id] || a.cover)}" alt="${esc(a.name)}'s animal: placeholder cat">`;
  $('#artistAlbum').textContent = `Album · ${a.album} · ${a.tracks.length} songs`;
  $('#artistName').textContent = a.name;
  $('#artistBio').textContent = a.bio;
  $('#artistMascot').textContent = a.mascot;
  $('#artistGrid').innerHTML = a.tracks.map(card).join('');
}

function renderSong(t) {
  const list = t.artist.tracks, i = list.indexOf(t);
  const prev = list[(i - 1 + list.length) % list.length], next = list[(i + 1) % list.length];
  $('#songBack').href = `#/${t.artist.id}`;
  $('#songBack').textContent = `All ${t.artist.name} songs`;
  $('#songFrame').innerHTML = pic(t, true);
  $('#songLabel').innerHTML = label(t).replace('class="label"', 'class="label big"');
  $('#songPlay').dataset.play = t.id;
  $('#songStory').innerHTML = (t.story || []).map((l) => `<p>${esc(l)}</p>`).join('');
  $('#songLyric').textContent = t.line || '';
  $('#songLyric').hidden = !t.line;
  $('#songPrev').href = songHref(prev); $('#songPrev').textContent = `← ${prev.title}`;
  $('#songNext').href = songHref(next); $('#songNext').textContent = `${next.title} →`;
}

addEventListener('hashchange', show);

// ---------- Player ----------
// One preview at a time: from the track's start to its end, then it stops.
const player = $('#player'), pBtn = $('#pBtn');
let now = null, on = false, failed = false;

function toggle(t) {
  Sound.unlock();
  if (now && now.id === t.id && on) { Sound.pause(); on = false; }
  else {
    if (!now || now.id !== t.id) { Sound.stop(200); failed = false; }
    now = t; on = true; failed = false;
    Sound.play(t);
    $('#live').textContent = `Playing ${t.title} by ${t.artist.name}`;
  }
  sync();
}

Sound.onerror = (t) => {
  if (!now || now.id !== t.id) return;
  failed = true; on = false; sync();
  $('#live').textContent = 'Audio not online yet.';
};

function sync() {
  document.querySelectorAll('[data-play]').forEach((b) => {
    const playing = on && now && b.dataset.play === now.id;
    b.classList.toggle('playing', !!playing);
    const t = b.querySelector('.t');
    if (t) t.textContent = playing ? 'Pause' : 'Play a preview';
    if (b.classList.contains('mini')) b.setAttribute('aria-label', `${playing ? 'Pause' : 'Play a preview of'} ${byId(b.dataset.play).title}`);
  });
  document.querySelectorAll('.card').forEach((c) => c.classList.toggle('now', !!(now && c.dataset.id === now.id)));
  if (!now) { player.hidden = true; return; }
  player.hidden = false;
  $('#pThumb').src = now.meme;
  $('#pTitle').textContent = now.title;
  $('#pArtist').textContent = failed ? 'Audio not online yet' : `${now.artist.name} · preview`;
  pBtn.classList.toggle('on', on);
  pBtn.setAttribute('aria-label', on ? 'Pause' : 'Play');
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-play]'); if (!b) return;
  e.preventDefault();
  toggle(byId(b.dataset.play));
});
pBtn.addEventListener('click', () => now && toggle(now));
$('#pClose').addEventListener('click', () => { Sound.stop(300); now = null; on = false; sync(); });

setInterval(() => {
  if (!now || !on) return;
  const k = (Sound.time() - now.start) / (now.end - now.start);
  $('#pProg').style.width = `${Math.max(0, Math.min(1, k)) * 100}%`;
  if (k >= 1) { Sound.stop(600); on = false; sync(); }
}, 250);

show();
