# Three Doors

A showcase site for three artists: Ceralie, Julius Wren and halfsaid. The look is a gallery wall: each song hangs as a meme thumbnail with a museum label. Direction board: `docs/three-doors_board_meme-rebuild_20261113.md`.

## Run it

1. Serve the folder that holds `site/` and the `Songs/` folder. `site/sound.js` loads audio from `../../Songs/...`.
2. Open `site/` in the browser, for example `http://localhost:8765/<path>/site/`.
3. After any edit, bump `?v=N` on every asset in `site/index.html`. The browser caches old scripts.

Routes: `#/` home (hero, three doors, the wall, how it works), `#/<artist>` artist page, `#/<artist>/<nn>` song page. Artist ids: `ceralie`, `julius`, `halfsaid`.

Files: `index.html`, `style.css`, `app.js` (pages and player), `sound.js` (audio), `tracks.js`, `stories.js`, `memes.js`.

## Swap the placeholder cats

The thumbnails are placeholder cats from cataas.com. To use the real memes:

1. Put each image in `site/assets/memes/`, named by track id, for example `halfsaid-06.jpg`. Use 16:9.
2. In `site/memes.js`, change each URL to the local path, for example `'halfsaid-06': 'assets/memes/halfsaid-06.jpg'`.
3. Put the mascot portraits (4:5) in the same folder and update `window.MASCOTS`.
4. Bump `?v=` on `memes.js` in `index.html`.

The platform links in the "Listen somewhere else" band still say [link needed]. Edit them in `index.html`.

## Deploy

A push to `main` deploys `site/` to GitHub Pages. Pull requests only build. In the repo settings, set Pages source to **GitHub Actions**.

Vercel also deploys the site. `vercel.json` sets the output folder to `site/`. Each pull request gets its own preview URL.

The audio files are not in this repo. Until they have a host, songs do not play online.
