# Three Doors: direction board for the meme rebuild

Date: 2026-11-13. New songs ship with meme thumbnails: one calm animal, no text, cut-out collage look. The first rebuild hung them on a light gallery wall. Tai found it too plain, so version 2 turns the site into a museum you walk through.

The point in one line: the memes hang like art in a dark museum, and a straight-faced label does the talking.

## References (Awwwards, through the Awwwards MCP)

| Site | What we take | What we leave |
|---|---|---|
| Spotify Pet Playlists (pets.byspotify.com, Site of the Day 2020) | Animals and music played straight. Each artist has an animal. | The cursor eyes and the bright palette. |
| Paul Kalkbrenner (paulkalkbrenner.net, Site of the Day, Sept 2026) | A music site that leads with media and keeps the UI quiet. | The grey palette and the tour section. |
| Lola Wilde (lolawilde.com, nominee) | A small "Play" pill on each work. | The carousel. |
| Album Atlas (Awwwards collection) | Pick an artist, then a record, then a preview. Space as navigation. | The shelf metaphor. |

No logo, photo, copy or code comes from these sites. We take patterns only.

## Concept: walk-in museum

- Scroll moves the visitor forward down one corridor. About 110 px of scroll is one metre.
- The entrance has giant wall type: "Sad songs," on the left, "calm animals." on the right.
- Each artist has one room. An arch wall opens it, with "ROOM 0N" and the name above, the animal's portrait on the left and the wall text on the right.
- Frames alternate left and right. The work in front of you lights up. With sound on, its preview starts after 0.7 s.
- The cursor is a flashlight. Over a frame it turns into a yellow "Look" ring.
- Click a frame, and the camera turns to face it. A panel shows the story, the lyric line and a play button.
- A ticker runs near the ceiling: "PLEASE DO NOT FEED THE ARTISTS · FLASH PHOTOGRAPHY UPSETS THE CAT".
- After the rooms come three wall texts on how the songs are made. The exit wall says "Thank you for walking slowly." The platform links sit below it.

Tone: deadpan clean. Short sentences. No exclamation marks.

## Tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0b0a09` | Museum dark |
| `--text` | `#efe9df` | Text, about 16:1 on the dark |
| `--muted` | `#a39c90` | Labels, about 7:1 on the dark |
| `--paper` | `#f1efe9` | Museum labels beside the frames |
| `--ink` | `#121212` | Text on paper and on yellow |
| `--accent` | `#ffd400` | One yellow: the play button, the cursor ring and the current tick on the floor plan |

Type: Newsreader (local) for titles and wall text, Geist (local) for UI and small capitals.

## Interface

- Top: the wordmark, a sound toggle and "Gallery guide".
- Bottom: the current room, a "Scroll to walk" hint and a floor plan with one tick per work.
- Keys: arrows or j and k step between works, Enter looks closer, Esc goes back.
- The gallery guide is the whole museum as a plain list. It opens by itself when WebGL fails.
- On phones the camera stands back with a wider lens, and the panel becomes a bottom sheet.

## Rules

- No fake fans, quotes or play counts.
- Respect `prefers-reduced-motion`: no head bob, no ticker drift, no smooth scroll.
- Placeholder cats come from cataas.com until Tai sends the real images. Julius Wren's animal is an old golden retriever, so his placeholders are wrong on purpose.
