# Agent and smoke play

How to play the game and check the UI as an agent. The method list and mechanics are in [HARNESS.md](HARNESS.md); the conventions are in [AGENTS.md](../AGENTS.md). Prefer the harness over DOM selectors.

## Smoke (`npm run smoke:play`)

Vitest + happy-dom, all through `__GAME__`:

1. **Phase A.** Click until the first skill is affordable. Clicks pay XP only, money and $/s stay 0, `buySkill` spends XP and keeps `xpTotal`, skills study while idle.
2. **A to B.** `setXp` and buy Portfolio and React: the Gig Board opens (not before both), `completeGig` is gated, the first clear pays the lump (clicks stay XP-only until a job), `lastPop` is large.
3. **B.** The first retainer gig is the first `$/s`.
4. **B to C to D.** Six gigs and 40K XP open the Job Board (five gigs do not), an intern salary adds $/s and idle XP/s, taking the internship pays its XP lump once, the Senior job (id 14) opens capital with no cash, after Mid-level SWE (id 7) and a `pickSpecialization`.
   **Gear.** Gear and `buyEquipment` stay shut until 10,000 lifetime XP, then a keyboard adds its click bonus. `nextUnlock` walks Gear, Gig Board, Job Board, Capital.
5. **D gate.** `buy(1)` fails at $499,999 and works at $500,000.
6. **Mid jump.** `setMoney` to the base cost of "WhyCombinator batch investment", buy it, and assert the cps / clickPower deltas match that row. `forceBoost(5, 10_000)`, then assert the click delta is `clickPower × 5` and `cps` is unchanged.
7. **Offline.** `advanceOffline` 1 hour credits `cps × 3600`, 10 hours caps at 8; phase A offline credits XP only. The toast is a diary sentence plus that credit.
8. **10x dev skills.** A 10x dev skill is gated by lifetime XP and price, hover rate and offline cap follow the gold owned.
9. **Events and 1:1s.** A gift event applies once and a decline changes nothing, a trade scales to the pile and is refused when it cannot be paid, and a 1:1 waits for a job and its three replies pay, sit or bill you.
10. **The world.** Users seed from gigs and grow per region while the gear serves them (a laptop alone settles near what it serves), a DDoS surge multiplies a region's demand, paying `cost` ends an incident and is refused when short, and eight billion users latch `won` once, pay the ×1.25 forever multiplier once, and write `world:won` to the journal; the game keeps ticking.
11. **Career timeline.** Nothing is unlocked at minute zero; the first skill opens Your company (logged and queued), the skills before Git + GitHug hygiene open nothing, Git + GitHug hygiene the career log, with a NEW marker that `seeFeature` clears, and the GitHug profile, the first gig and job the board, the dollars, the rosters and the metrics; every journal line is one flat JSON object; `advanceOffline` past 10 minutes logs a return; the desk cat comes with the first job, not with time at the desk or a break.
12. **Specializations.** The pick is refused before Mid-level SWE and every job above rank 7 is refused without it; after it the other tracks are hidden and unbuyable, the switch works once, capital stays open after a switch past Senior, and a click build's manual click out-pays a hover or auto click.
13. **Prestige.** The Exit is shut at the start; `setMoney` past the first Prestige opens it; `exit()` pays Prestige, and money, skills, gigs, jobs, capital, users, regions and hires are back to fresh, with a new product name and the handle kept; 10x dev skills survive; the multiplier is in `cps` and `xpPerClick`; `buyLegacy` enforces order and price, and `capital.offline` raises `offlineCapHours` by 4.

## Free play (`npm run play:agent`)

Starts Vite on http://127.0.0.1:43123 if it is not already up, opens the app in agent-browser under the session `tech-ascension`, and stays up until the process is stopped (SIGINT closes the browser and Vite). Set `AGENT_BROWSER_HEADED=1` to show the window. Set `AGENT_BROWSER_EXECUTABLE_PATH` to use a specific Chrome. The first run on a machine needs `npx agent-browser install` (`--with-deps` on Linux).

From another process, use the same session:

```bash
export AGENT_BROWSER_SESSION=tech-ascension
npx agent-browser eval "window.__GAME__.getState()"
npx agent-browser eval "(() => { const g = window.__GAME__; for (let i = 0; i < 90; i++) g.click(); return g.getState().xp })()"
npx agent-browser close
```

`eval` takes one JavaScript expression and prints its value as JSON, awaiting a returned promise. Wrap statements in an IIFE, as above. Add `--json` for the full response envelope (the value sits under `data.result`).

## Browser checks (usability and visuals)

Without `play:agent`, start with `npm run dev`, then `npx agent-browser open http://127.0.0.1:43123`. Run `npx agent-browser skills get core --full` once for the full command reference (it matches the installed version).

- Set state with `eval` and `__GAME__` (`reset()`, `keepProfile()` to clear the start card, `setXp`, `forceGig`, `setMoney`). Do not click through the grind.
- Read the page with `snapshot -i` (interactive elements as `@e1` refs). Act with `click @e8`. Re-snapshot after the page changes; refs go stale. `find role tab click --name "Gigs"` works without a snapshot. A tab only exists once its board is unlocked, so unlock first.
- Look with `screenshot <path>`; add `--annotate` to overlay the ref numbers. Set the size first with `set viewport 1280 800`. Read the PNG yourself before calling a visual change fine.
- Check narrow layouts with `npm run check:mobile` (see `.agents/skills/mobile-check/SKILL.md`): it plays six viewports through `__GAME__` and fails on layout problems. Read its screenshots too. For one look by hand, `set viewport 390 844` and `screenshot`.
- Read `console` and `errors` after a run; a clean game logs only the Vite connect lines and the React DevTools notice.
- Stay in phases A to C plus the single mid check (see Rules). Always end with `close`.
- `node scripts/capture-visuals.mjs <prefix> [outDir]` writes the standard phase A to D and mobile screenshots (default outDir is the OS temp dir).

## Example sequences

Phase A, then the Gig Board:

```js
const game = window.__GAME__
game.reset()
while (game.getState().xp < 90) game.click() // phase A clicks pay XP only (money stays 0); the first skill is 90 clicks
game.buySkill(1)
game.setXp(30_000)
game.buySkill(15) // Portfolio
game.buySkill(16) // React: Gig Board opens (phase B)
for (let id = 2; id <= 6; id++) game.buySkill(id) // gig 1 needs skills 1-6
game.completeGig(1) // first $; clicks still pay XP only until the first job
game.getState()
```

Jobs and capital:

```js
const game = window.__GAME__
game.reset()
game.setXp(200_000)
for (const id of [1, 2, 3, 4, 5, 6]) game.forceGig(id) // six gigs open the Job Board
game.buyJob(1) // free internship (needs 35K XP), salary $/s
game.setXp(1e7) // enough spendable XP for the rest of the ladder
for (let id = 2; id <= 7; id++) game.buyJob(id) // the trunk; Mid-level SWE (id 7) opens the pick
game.pickSpecialization("backend") // every job above rank 7 needs a pick; Backend keeps ids 8-15
for (let id = 8; id <= 14; id++) game.buyJob(id) // job 14 is Senior SWE: capital opens with no cash (holding $500,000 opens it too)
game.setMoney(85_000)
game.buy(1) // $85,000 after the scale; buy(19) and up cost trillions
```

Click boost (capital id 3, still mid):

```js
const game = window.__GAME__
game.reset()
game.setXp(40_000)
for (let id = 1; id <= 6; id++) game.forceGig(id)
game.buyJob(1) // dollars per click wait for the first job; without one a click pays XP only
game.setMoney(7e6)
game.buy(3) // $4,000,000: the capital gate opens at $500K held
game.forceBoost(5, 10_000)
const before = game.getState()
game.click()
// money increased by before.clickPower * 5; cps unchanged
```

Career timeline:

```js
const game = window.__GAME__
game.reset()
game.getState().features // { open: [], fresh: [], reveals: [], next: { id: "careerLog", ... }, upNext: [...] }
game.setXp(90)
game.buySkill(1) // Your company unlocks: logged, queued to reveal
game.setXp(2_300)
for (let id = 2; id <= 5; id++) game.buySkill(id) // Git + GitHug hygiene: the career log, marked NEW
game.seeFeature("careerLog")
game.advanceOffline(30 * 60 * 1000) // a return: logged (the desk cat waits for the first job)
game.careerLog() // every step as JSON, oldest first
```

Offline sim:

```js
const game = window.__GAME__
game.reset()
for (let id = 1; id <= 8; id++) game.forceGig(id) // gig 8 is the first retainer: first $/s
game.advanceOffline(60 * 60 * 1000)
game.advanceOffline(10 * 60 * 60 * 1000)
```
