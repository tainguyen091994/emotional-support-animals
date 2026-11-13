# Emotional Support Animals: direction board for the meme rebuild

Date: 2026-11-13. New songs ship with meme thumbnails: one calm animal, no text, cut-out collage look. The first rebuild hung them on a light gallery wall. Tai found it too plain, so version 2 turns the site into a museum you walk through.

Version 4 renames the site. "Three Doors" said nothing about the jokes, so the museum is now Emotional Support Animals (ESA in tight spaces). The repo and the Pages path still say three-doors.

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

- The entrance is a salon wall. All 22 memes drop onto a dark wall in mixed frames (gold, black, white sticker), tilted a few degrees, packed close like a 19th-century salon hang. Then "EMOTIONAL SUPPORT ANIMALS" stamps on in meme type and the wall shakes once. When you enter, the frames fall off the wall.
- Scroll moves the visitor forward down one corridor. About 110 px of scroll is one metre.
- The entrance has giant wall type: "Sad songs," on the left, "calm animals." on the right.
- Each artist has one room. A giant reaction meme hangs across the corridor in front of it: the mascot, "ROOM N: NAME" as top text and a deadpan tagline as bottom text ("SHE IS FINE. PROBABLY."). As you walk into it, the paper tears down the middle and the two halves fall away. Version 3 used arch doors here; Tai found them too polite for the meme style.
- The album wall text sits on the side wall just inside the room, set in the same meme type.
- Each frame is an image macro: the song title as top text and a flat bottom caption ("NOBODY ASKED. HERE IT IS ANYWAY."). Every third frame is a white sticker with tape on two corners.
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

Type: Anton (local) for titles, set like a meme caption: white, upper case, black outline. Geist (local) for body text, UI and small capitals. Version 3 swapped out Newsreader because a quiet serif read too polite next to the memes.

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
