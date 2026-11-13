# Three Doors: direction board for the meme rebuild

Date: 2026-11-13. New songs ship with meme thumbnails: one calm animal, no text, cut-out collage look. The old site was a dark story theatre. It does not fit those images, so the site starts over.

The point in one line: hang the memes like art in a small gallery and let a straight-faced museum label do the talking.

## References (Awwwards, through the Awwwards MCP)

| Site | What we take | What we leave |
|---|---|---|
| Spotify Pet Playlists (pets.byspotify.com, Site of the Day 2020) | Animals and music on one page, played straight. A pet carries each playlist. | The cursor eyes and the bright Spotify palette. |
| Paul Kalkbrenner (paulkalkbrenner.net, Site of the Day, Sept 2026) | Section order for a music site: media, recordings, more media, then a flat colour band for the sign-up. Flat bands, no gradients. | The black-and-grey palette and the tour section. |
| Lola Wilde (lolawilde.com, nominee) | Song cards with the title on the card and a small "Play" pill. No motion library. | The carousel. A grid shows all 19 songs at once. |
| Album Atlas (Awwwards collection) | Pick an artist, then a record, then a preview. | The 3D shelf. |

No logo, photo, copy or code comes from these sites. We take patterns only.

## Look

A gallery wall. Each meme sits in a white mat with a thin border. Under it, a museum label in small capitals gives the number, title, artist and one flat line about the feeling. The cats carry the joke. The labels never try to be funny.

Tone: deadpan clean. Short sentences. No exclamation marks.

## Tokens

| Token | Value | Use |
|---|---|---|
| `--page` | `#f1efe9` | Wall colour |
| `--tile` | `#e7e4dc` | Alternate bands |
| `--mat` | `#ffffff` | Frame around each meme |
| `--ink` | `#121212` | Text, 16.9:1 on the wall |
| `--muted` | `#5f5b53` | Labels, about 5.8:1 on the wall |
| `--line` | `#d5d1c7` | Borders |
| `--accent` | `#ffd400` | One yellow, with ink text (13.9:1). Only on the main play button and the song that plays now. |

Type: Newsreader (local) for titles, Geist (local) for UI and the small-caps labels.

## Sections

1. Sticky bar: wordmark, then Songs, Artists, How it works.
2. Hero: "Now on the wall". The featured song is halfsaid, "I Already Ate". A play pill and a link to all 19 songs.
3. Three doors: one card per artist with an arch-top image, the mascot line, the bio and the song count.
4. The wall: every song as a framed meme with a label and a play button. Filter chips for each artist.
5. Song page (`#/<artist>/<nn>`): the big meme, the label, the four story lines as wall text, the lyric line, play, previous and next.
6. How it works: three steps. A person writes the story. An AI voice sings it and a person picks the take. The mascot holds the song's object.
7. Listen: platform links. [link needed] for each one.
8. Footer: the AI disclosure and a credit for the placeholder cats.

A mini player stays at the bottom while a preview plays. It shows the meme, the title, play or pause and the preview progress. If the audio fails, it says so.

## Rules

- No fake fans, quotes or play counts.
- Respect `prefers-reduced-motion`.
- Placeholder cats come from cataas.com until Tai sends the real images. Julius Wren's mascot is an old golden retriever, so his placeholders are wrong on purpose.
