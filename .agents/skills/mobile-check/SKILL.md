---
name: mobile-check
description: Verify that Tech Ascension plays well on a phone. Use after any change to layout, CSS, the top bar, the shop, the stage, modals or reveal cards, or when asked to check mobile or narrow screens. Runs a harness that plays the game at six viewports and fails on layout problems, then tells you how to read the screenshots.
---

# Mobile check

`npm run check:mobile` plays the game through `window.__GAME__` at 360x640, 390x844, 430x932, 768x1024, 844x390 (landscape) and 1280x800, and exits non-zero on any failed assert. It starts its own Vite on port 43125 (set `MOBILE_CHECK_PORT` to change it), so it never talks to a dev server that is serving another checkout. It runs in its own agent-browser session (`mobile-check`).

```bash
npm run check:mobile                                  # every viewport, about 5 minutes
MOBILE_CHECK_ONLY=390x844 npm run check:mobile        # one viewport
node scripts/mobile-check.mjs /tmp/mobile-shots       # choose where the screenshots go
MOBILE_CHECK_FONT=all npm run check:mobile            # every UI font (or one id); screenshots go in a folder per font
```

## What it asserts

Per viewport and per state (start card, phases A to C, mid D, the Company tab, a reveal card, an event, a 1:1, and on narrow screens the Owned modal):

- Shop tabs (and their sub tabs) show whole rows at the top, middle and end of the scroll, on narrow screens.
- No sideways scroll, no vertical page scroll, and no control off the screen (controls inside a horizontally scrolling row are fine).
- Portrait phones: the shop is below the stage, each takes at least a third of the screen, and the top bar takes at most 18%.
- Desktop keeps its side-by-side stage and shop.
- The click target is on screen and nothing covers it (skipped while a modal is open).
- At 860px and below: shop tabs, shop buttons and top bar controls are at least 44px.
- Dialogs fit the screen, and their buttons are on screen unless they sit in a list that scrolls inside the card.
- No page errors.

## Read the screenshots too

A pass is not a look. Open the PNGs for 360x640 (the tightest), 390x844, 844x390 and 1280x800 and check by eye: the art is not clipped by the status bar, nothing overlaps the balance, text is not cut off, the toast and reveal cards are not on top of the click target or a buy button. The harness cannot see ugly.

## Rules for narrow layouts

- One breakpoint, 860px, the one `src/game/mobileViewport.ts` reads. Narrow CSS lives in `src/styles/mobile.css`, loaded after `index.css`.
- Portrait: the stage (the click target and the state) is the top of the screen and the shop is the bottom. The page never scrolls; the shop list scrolls inside its half.
- The stage art is 128px (twice the 64px grid) so pixels stay square. Do not scale it with `vh`.
- Visual `:hover` styles go inside `@media (hover: hover)`, so a tapped control does not keep its highlight on a phone. Keep `:active` and `:focus-visible` outside it. The hover-click mechanic on the stage is script (`Stage.tsx`), not CSS, and is not touched by this.
- Layout and presentation only. Do not change what a click, a purchase or a gate does.
- Keep every `data-testid`; the happy-dom tests rely on them.

## Gotchas

- Wait for `window.__GAME__` after `open` before the first eval. The harness does.
- Reload after changing the viewport. Resizing a live page makes the three.js globe lose its WebGL context.
- If a dev server is already on the port, the harness uses it. Make sure it serves this checkout.
