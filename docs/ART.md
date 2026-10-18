# Art and motion

## Art

Everything is pixel art, drawn in code from one shared 16-colour sheet (`src/pixel/palette.ts`: ink `#1a1c2c` outlines, era accents early `#41a6f6`, mid `#38b764`, upper `#b13e53`, q3 `#ffcd75`, end `#ef7d57`, boost glow `#73eff7`). No image files ship; the desk is CSS and SVG.

- **Sprites.** `src/pixel/art.ts` has one 64×64 drawing per tier plus art 0 (the opening attic), built from shared props in `motifs.ts`, lit from the top-left. The 32×32 thumb is the same drawing reduced 2:1. Both get a 1px ink outline, no anti-aliasing and at most 16 colours, and are encoded as small PNG data URLs once and cached. CSS uses `image-rendering: crisp-edges` then `pixelated`, and the stage sprite is always a whole multiple (3×) of its 64px grid.
- **Desk chrome.** One shell behind the stage, colored by the saved editor theme (Catppuccin Mocha, `#1e1e2e` base, by default), never by the era accent. It is an activity bar (your company's globe and the career log), the career log sidebar while it is open, and a status bar that names the career's band (High school to Mars, by stage art id, in `src/data/idePacks.ts`). The Capital tab's era sub-tab previews that era's first band there with a PREVIEW chip, and it snaps back as described in AGENTS.md.
- **Captions.** There is no flavor line under the stage art. The stage name and era tag remain.

To change a sprite, edit its entry in `DRAW` in `src/pixel/art.ts`; `npm test` checks the size, colour count and outline of every sprite.

## Motion

Clicks register on pointer-down. The sprite bumps up, tips slightly away from the click point and settles with a tiny jitter (~260ms, restarted instantly on every click), flashes brighter, and sends out a flat ring, square sparks, a `$` / XP payout that pops up and then drops so rapid clicks stack, and the click waterfall.

- **Waterfall.** One developer-icon from the owned pool (skills, gigs, jobs, gear that have a real logo) spawns at the cursor at about half opacity and falls for 1.4 seconds (`FALL_MS`) under gravity (x drifts, y follows t²) while fading out. Soft skills with no logo stay out of the pool, so the early game is thin. One icon per click, one or two more during a boost, never more than 14 alive at once (the oldest is dropped).
- **Heat.** Fast clicking builds "heat", which makes the bump a little bigger and strengthens the glow around the sprite.
- **Idle.** The sprite floats, an aura breathes and motes rise.
- **Boost.** An active click boost adds a chip over the sprite, a rotating rim light, bigger payouts, and a lit metrics cell.
- **Buying** sweeps the row and ticks the money and owned figures. A new highest tier remounts the art with a reveal burst. New shop rows slide in with a `New` tag.
- **Eras.** Moving to a new era cross-fades the accent and wipes it across the stage while the desk chrome stays put.
- **Unlocks** (`src/styles/unlocks.css`). Green means new, the way added lines are green in a diff. Before the first laptop the desk has no activity bar; on the unlock the bar and the sidebar column animate in (registered `--ide-activity` and `--ide-tree`, 520 to 680ms). The next unlock with a place on screen stands there as a dashed, dimmed outline with a lock and a ring that fills as it gets close. A big unlock gets the UNLOCKED slam, confetti and a five-note chime, then its card; a standard one a three-note chime, a pulsing glow on the thing itself and a card beside it (it slides in from the anchor's side, never covers the click target, and tucks away after 8s); a small one a two-note chime, a toast and a short glow. NEW markers are a green dot on icons and a green `New` pill on tabs and list items. A shop row that opens something wears an 18px green badge with that feature's own icon; its name is in the tooltip, and only the Next banner prints it. The GitHug profile's contribution graph uses the editor green at four strengths, so it follows the theme.
- **Reduced motion.** `prefers-reduced-motion` kills CSS animation globally, hides the particles and the waterfall and skips the bump, keeping a short click flash. The desk chrome appears without the slide and a lit unlock gets a still outline instead of the pulse.

- **Your company** (`src/components/globe/`, `src/styles/globe.css`). The globe is a three.js scene in a lazy chunk. Every color is an editor theme token, so the Company tab follows the saved theme; the ball, dots and edges keep their fixed palette.
