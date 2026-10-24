# Tech Ascension

An incremental game: React 19, TypeScript, Vite, Zustand, three.js (globe), Tone (audio), Dexie (ledger). Game rules and tables live in code (`src/data`, `src/game`); read them there, not from memory or docs.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite on http://127.0.0.1:43123 |
| `npm test` | Unit tests: Vitest, node, `src/**/*.test.ts` |
| `npm run smoke:play` | Harness playthrough (`src/game/smoke.play.ts`, happy-dom). Exits non-zero on any failed assert |
| `npm run lint` | oxlint |
| `npm run build` | `tsc -b && vite build` |
| `npm run check:mobile` | Plays six viewports, fails on layout problems (skill: `.agents/skills/mobile-check`) |
| `npm run play:agent` | Starts Vite if needed and opens the app in agent-browser (session `tech-ascension`) |
| `npm run pace` | Pacing simulations (`docs/PACING.md`) |

CI (`.github/workflows/ci.yml`) runs lint, test, smoke and build on every PR and push to main. Run the same four before you push.

## Before you change anything

- Explore the code base first. Read the code you are about to change and what calls it (start at `docs/CODEMAP.md`) before you edit.

## Before you finish

- Never assume the code works just because you wrote it. Run it, test it, and verify the fix before calling it done.
- Run `npm run lint`, `npm test` and `npm run build`. Add `npm run smoke:play` when you touched anything the harness reads (store, economy, phases, gates).
- UI, CSS or layout change: `npm run check:mobile`, then read the screenshots. Do not call a visual change fine without looking.
- Run the smoke test first when you start, so you know the baseline is green.
- Commit messages are conventional: `feat(scope):`, `fix(scope):`, `test:`, `perf(scope):`, `ci:`, `docs:`, `chore(deps):`.

## Driving the game: `window.__GAME__`

Drive state and mechanics through `window.__GAME__`. Never scrape buttons or guess DOM selectors for game logic. It is installed in dev and in `vite preview`, and `smoke:play` loads the same harness. Source of truth: `src/game/harness.ts`; full reference: `docs/HARNESS.md`.

- Read: `getState()` (money, xp, xpTotal, phase, cps, owned, skills, jobs, gigs, gear, world, founder, legacy, features, ...).
- Play: `click`, `tick(ms)`, `buy`, `buySkill`, `buyJob`, `buyEquipment`, `buyGold`, `completeGig`, `advanceOffline(ms)`, `pickSpecialization`, `switchSpecialization`, `pickLeadership`.
- To see why a row is open or shut, ask `explain("job:14")` (or `npm run tree -- job:14`): every row's gate is a node in the progression tree (`docs/TREE.md`), and the answer lists each leaf with what the career has.
- A career can pick an origin first (`pickOrigin("college" | "bootcamp" | "dropout")`, open until the career has earned anything; `keepProfile()` alone plays with none).
- Every job above rank 7 (Mid-level SWE, id 7) needs a picked specialization, and the pick opens at 10,000 users: buy job 7, `setUsers("americas-east", 10_000)`, `pickSpecialization("backend")`, then jobs 8 and up. Senior SWE (rank 14) also needs 1,000,000 users. Backend keeps ids 8-15 (`buyJob(14)` is Senior SWE); the other tracks are 108-115, 208-215, 308-315, 408-415, 508-515 (`docs/HARNESS.md`).
- Every job above rank 15 needs a picked leadership line: hold Senior SWE (rank 14), `pickLeadership("ic" | "manager")` once, then rows 16 and up of that line (IC 16, 17, 19, 23, 24; Manager 18, 20, 21, 22; 25-31 shared). Hiring is the Manager's, each kind from rank 18, 20, 21 or 22.
- Force state (tests and checks only): `setXp`, `setMoney`, `forceGig`, `forceGold`, `forceBoost`, `forceEvent`, `forceReview`, `forceIncident`, `setUsers`, `setPrestige`, `previewEra`.
- Answer prompts: `acceptEvent`, `dismissEvent`, `answerReview`, `dismissReview`, `keepProfile`.
- Company and prestige: `respondIncident`, `hire`, `fire`, `setPopActive`, `setRegionActive`, `exit`, `buyLegacy`.
- `reset()` wipes the save back to high school. `careerLog()` returns the journal.
- Purchase prices are scaled by `PURCHASE_COST_SCALE` in `src/data/costs.ts`; exported rows are already scaled. Never copy a price into a test or a doc; import it from the data module.
- `forceX` helpers bypass gates; the plain version enforces them. Test gates with the plain version.
- A save from another `version` is wiped on load (no migration). Change `version` only with the save format (`docs/SAVE.md`).

## Browser work

- Use `npx agent-browser`, not Playwright. Set your own session first: `export AGENT_BROWSER_SESSION=<task-name>`. The unnamed session is shared with every other agent. Always end with `npx agent-browser close`.
- Set state with `eval` and `__GAME__` (`reset()`, `keepProfile()` to clear the start card, `setXp`, `forceGig`, `setMoney`). Do not click through the grind.
- Read the page with `snapshot -i` (refs like `@e1`), act with `click @e8`, re-snapshot after the page changes. Look with `screenshot <path>` and read the PNG. Set the size first: `set viewport 1280 800`.
- Check `console` and `errors` after a run; a clean game logs only the Vite connect lines and the React DevTools notice.
- Full command reference: `npx agent-browser skills get core --full` (once per session). Recipes and example `__GAME__` sequences: `docs/AGENT_PLAY.md`.

## Automated runs

- Stay in phases A to C plus one mid-era check (capital id 3). Mid is capital ids 1-5; the era flips to `upper` at id 6. Go further only when the user asks.
- A phase unlocks by lifetime XP (`xpTotal`), not spendable XP. Spending never lowers `xpTotal`.
- Free play: `npm run play:agent`, then `npx agent-browser eval "window.__GAME__.getState()"`. `eval` takes one expression; wrap statements in an IIFE.

## Code conventions

- ESM TypeScript with explicit `.ts` / `.tsx` extensions in relative imports (`import { x } from "./economy.ts"`). Use `import type` for types.
- Game data is plain typed arrays with unique ids in `src/data`. Nothing assumes a row count; a table change is a data edit, not a code change. Rules and pure logic are in `src/game`; keep them free of React so they run under the node tests.
- Rules go in pure functions and the store commits their patches (see `src/game/globe/actions.ts`). Add the harness method when a new action needs driving from tests.
- Money is a JS double. Do not add exact-integer logic past 1e15 without switching `economy.ts` to a big-number library.
- Asset URLs go through `import.meta.env.BASE_URL` or Vite-processed HTML so they work under the GitHub Pages sub-path. Check with `npm run preview:pages`.
- Styles: tokens in `src/styles/tokens.css`; honor `prefers-reduced-motion` (`src/styles/motion.css`). Small screens are 860 px and below (`src/styles/mobile.css`).
- Tests sit next to the code as `*.test.ts`. Pin rules with numbers imported from the data modules. Store-level tests are `*.store.test.ts`.
- Match the surrounding code: comment density, naming, idiom. Comments say why, not what.
- No new dependencies without a reason; the repo already dropped unused ones.
- Animation comes from libraries: Motion (`motion`) for movement, springs and sequences, canvas-confetti for particles. Ask `reducedMotion()` (`src/game/desk.ts`) before animating, never `matchMedia` directly, and prefix a new CSS reduce-motion rule with `:root:not([data-motion="full"])`. Do not hand-roll a particle system or a spring; our code picks colours (from the theme), counts, timing and origin. Load Motion only through `src/components/useMotion.ts` (one lazy chunk; never `motion/react`), and never wait on it: no Motion yet, no layout or reduced motion means the UI just changes. Details in `docs/GAMEPLAY.md` (the unlock celebration, Motion in the interface).
- Do not hand-edit `emojiManifest.json`; the generator overwrites it (`npm run generate:emojis`, see the emoji-gg skill).

## Where things are

- `docs/CODEMAP.md`: what to edit for a given change. Start here when you do not know where code lives.
- `docs/HARNESS.md`: full `__GAME__` API and the mechanics behind it (phases, gear, gold skills, the company and world, prestige, events and 1:1s, offline credit, the career timeline, identity).
- `docs/AGENT_PLAY.md`: smoke scenarios, free play, browser checks, example sequences.
- `docs/GAMEPLAY.md`: the player's view of the economy. `docs/PACING.md`: pacing numbers and the simulations. `docs/PRESTIGE.md`: the Exit and Legacy perks. `docs/COMPANY_ARC.md`: the company and world design. `docs/SAVE.md`: save format. `docs/ART.md`: pixel art and desk chrome.
- Skills: `.agents/skills/mobile-check` (layout), `.agents/skills/emoji-gg` (emoji manifest).

## Keep this file small

This file is loaded into every agent's context. Add a rule here only if an agent would get it wrong without it and it is not obvious from the code. Put explanations, tables and numbers in `docs/` and link them. When the harness API changes, update `docs/HARNESS.md`, not this file.
