# Art and motion

## Art

Everything is pixel art, drawn in code from one shared 16-colour sheet (`src/pixel/palette.ts`: ink `#1a1c2c` outlines, era accents early `#41a6f6`, mid `#38b764`, upper `#b13e53`, q3 `#ffcd75`, end `#ef7d57`, boost glow `#73eff7`). No image files ship; the IDE is CSS.

- **Sprites.** `src/pixel/art.ts` has one 64×64 drawing per tier plus art 0 (the opening attic), built from shared props in `motifs.ts`, lit from the top-left. The 32×32 thumb is the same drawing reduced 2:1. Both get a 1px ink outline, no anti-aliasing and at most 16 colours, and are encoded as small PNG data URLs once and cached. CSS uses `image-rendering: crisp-edges` then `pixelated`, and the stage sprite is always a whole multiple (3×) of its 64px grid.
- **IDE chrome and packs (content v2).** One fixed Catppuccin Mocha shell (`#1e1e2e` base) sits behind the stage and never reads the era accent. What the editor pane shows depends on the era, in 14 packs from `src/data/idePacks.ts`, chosen by the highest owned art id in bands that never cross an era.
  - Early is a single buffer per band: `fizzbuzz.py` (nothing bought to tier 6), `two_sum.py` (7 to 12), `reverse_list.go` (13 to 18).
  - Mid and upper are multi-file packs with a clickable tab bar and an explorer file list: `debounce` (19 to 22, with its test and README), `search` (23 to 26, Java and its test), `workers` (27 to 30, Go with `go.mod`), `finetune` (31 to 33, train, data, config), `ratelimit` (34 to 36), `lru` (37 to 40, Rust with `Cargo.toml`), `attention` (41 to 44).
  - Scale (q3) is an email inbox: the explorer lists sender and subject, a click opens the body (`fab` 45 to 49, `frontier` 50 to 53).
  - Endgame is a slide deck with prev/next in the status bar and slide tabs (`edge` 54 to 58, `mars` 59 to 66).
  - The tab bar, explorer list and status bar take clicks; the editor stays a dimmed backdrop under the sprite.
  - The Capital tab's era sub-tab previews that era's first pack (status bar shows PREVIEW); owned progress is the rest state, and the preview snaps back when you leave the Capital tab, buy into a new era, or leave the shop and IDE alone for 20 seconds.
  - Through `__GAME__`: `ide` in `getState()`, `ideSelect(i)`, `previewEra(era | null)`.
- **Captions.** There is no flavor line under the stage art. The stage name and era tag remain.

To change a sprite, edit its entry in `DRAW` in `src/pixel/art.ts`; `npm test` checks the size, colour count and outline of every sprite.

## Motion

Clicks register on pointer-down. The sprite bumps up, tips slightly away from the click point and settles with a tiny jitter (~260ms, restarted instantly on every click), flashes brighter, and sends out a flat ring, square sparks, a `$` / XP payout that pops up and then drops so rapid clicks stack, and the click waterfall.

- **Waterfall.** One developer-icon from the owned pool (skills, gigs, jobs, gear that have a real logo) spawns at the cursor at about half opacity and falls for 300ms under gravity (x drifts, y follows t²) while fading out. Soft skills with no logo stay out of the pool, so the early game is thin. One icon per click, one or two more during a boost, never more than 14 alive at once (the oldest is dropped).
- **Heat.** Fast clicking builds "heat", which makes the bump a little bigger and strengthens the glow around the sprite.
- **Idle.** The sprite floats, an aura breathes and motes rise.
- **Boost.** An active click boost adds a chip over the sprite, a rotating rim light, bigger payouts, and a lit metrics cell.
- **Buying** sweeps the row and ticks the money and owned figures. A new highest tier remounts the art with a reveal burst. New shop rows slide in with a `New` tag.
- **Eras.** Moving to a new era cross-fades the accent and wipes it across the stage, and the editor buffer cross-fades to the next snippet (260ms) while the IDE chrome stays put.
- **Unlocks** (`src/styles/unlocks.css`). Green means new, the way added lines are green in a diff. Before the first laptop the editor has no activity bar and no explorer; on the unlock both widths animate in (registered `--ide-activity` and `--ide-tree`, 520 to 680ms). The next unlock with a place on screen stands there as a dashed, dimmed outline with a lock and a ring that fills as it gets close. A big unlock gets the UNLOCKED slam, confetti and a five-note chime, then its card; a standard one a three-note chime, a pulsing glow on the thing itself and a card beside it (it slides in from the anchor's side, never covers the click target, and tucks away after 8s); a small one a two-note chime, a toast and a short glow. NEW markers are a green dot on icons and a green `New` pill on tabs and list items.
- **Reduced motion.** `prefers-reduced-motion` kills CSS animation globally, hides the particles and the waterfall and skips the bump, keeping a short click flash. The editor appears without the slide and a lit unlock gets a still outline instead of the pulse.
