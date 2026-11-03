# Art and motion

## Art

Everything is pixel art, drawn in code from one shared 16-colour sheet (`src/pixel/palette.ts`). The ink outline and the era accents come from there, so a new era or a new drawing picks its colours from the sheet and not from a file. No image files ship; the desk is CSS and SVG.

- **Sprites.** `src/pixel/art.ts` has one drawing per tier plus art 0, the opening attic, built from shared props in `motifs.ts` and lit from the top-left. The thumb is the same drawing reduced by half. Both are encoded as small PNG data URLs once and cached. CSS uses `image-rendering: crisp-edges`, and the stage sprite is a whole multiple of its grid so the pixels stay square.
- **Desk chrome.** One shell behind the stage, coloured by the saved editor theme (Catppuccin Mocha by default), never by the era accent. It is the activity bar, the career log sidebar while it is open, and a status bar that names the career's band. The Capital tab's era sub-tab previews that era's first band there.
- **Captions.** There is no flavour line under the stage art. The stage name and era tag remain.

To change a sprite, edit its entry in `DRAW` in `src/pixel/art.ts`. `npm test` checks the size, colour count and outline of every sprite.

## Motion

A click registers on press. The sprite bumps up, tips slightly away from the click point and settles with a small jitter, restarted on every click. It flashes brighter and sends out a flat ring, square sparks, and a payout (`$` or XP) that pops up and drops, so rapid clicks stack. Each click also throws up developer icons (the waterfall).

- **Waterfall.** Each click tosses developer icons from the owned pool (only rows with a real logo), up and to the side, under gravity. A toss lands, bounces a few times on the way down, comes to rest and sinks through the floor while it fades. The payout text is a separate, lower arc with a wider reach, so the money and XP clouds stay apart from the logos. A click throws two icons; a boost throws more. The count alive at once is capped (`WATERFALL_CAP`), and the oldest is dropped. Every number here is in `src/game/waterfall.ts`. The logos fan out sideways so a burst does not stack on one spot.
- **Heat.** Fast clicking builds heat, which makes the bump bigger and strengthens the glow around the sprite.
- **Idle.** The sprite floats and an aura breathes.
- **Boost.** An active click boost adds a rotating rim light around the sprite, bigger payouts, and the balance card's accent. There is no toast and no chip on the sprite.
- **Buying** sweeps the row and ticks the money and owned figures. A new highest tier remounts the art with a reveal burst. New shop rows carry a `New` tag.
- **Unlocks** (`src/styles/unlocks.css`). Green means new, the way added lines are green in a diff. An unlock lights a NEW marker: a green dot on icons and a green `New` pill on tabs and list items. A shop row that opens something wears a small green badge with that feature's icon. The GitHug contribution graph uses the editor green at several strengths, so it follows the theme. Unlocks do not pop a card; the celebration rules are in [GAMEPLAY.md](GAMEPLAY.md).
- **Reduced motion.** `prefers-reduced-motion` turns off CSS animation globally (`src/styles/motion.css`), hides the particles, drops the waterfall to a straight fall with no bounce, and skips the bump, keeping a short click flash. The desk chrome appears without its slide, and a lit unlock gets a still outline instead of the pulse. Players can override this in the Motion settings.

### Motion in the interface (developer rules)

Everything that moves in the UI, apart from the idle loops (sway, rim spin) and hover and focus states, is Motion. Motion loads as one lazy chunk through `src/components/useMotion.ts`: `preloadMotion()` starts it when the page settles, and `motionReady()` is what the click path asks. The click path never waits on it. Ask `reducedMotion()` (`src/game/desk.ts`) before animating, not `matchMedia`.

- **No Motion yet, no layout (a test DOM, a hidden tab), or reduced motion:** nothing moves beyond a fade at most, and the state change happens all the same. Nothing holds up a state change or an unmount.
- **Dialogs.** Every modal sits in `ModalBackdrop`. Closing does not wait: the dialog unmounts at once, and a scrubbed, inert, `aria-hidden` copy is put back where it was and fades out (`presenceRef` in `useMotion.ts`). The toast, the reveal card and the tooltips use the same ref callback.
- **The click and the balance.** The sprite's bump is a spring that `Stage.tsx` turns into a pose; a new click takes the sprite over. The balance squashes on a pop, rolls its digits on a purchase, and counts up on a cleared gig (`HeroMoney.tsx`).
- **The shop** (`src/components/shopMotion.ts`). A purchase bumps the owned count and sweeps the row. A row that opens in a list already on screen eases in. The underline of each tab strip is one bar that springs to the active tab. On a portrait phone the sheet's release springs from where the finger left it (`springSheet`, with the pure rules in `src/game/shopDock.ts`); without Motion the CSS transition settles it.
- **Small badges.** A NEW dot pops in and sends a ring out while it stands. The bell's count jumps when it changes. The desk sidebar's width stays a CSS transition, since Motion would animate the same property for nothing.

## Stage

The stage shows the highest capital tier you own, else the furthest job, gig or skill, in front of the desk. Before the first purchase it shows the opening attic (art 0) and the stage name stays High school. Buying a new top item plays a reveal burst.
