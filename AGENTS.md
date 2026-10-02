# Playing Tech Ascension

Drive the game through `window.__GAME__`. Do not scrape buttons or guess DOM selectors.

`__GAME__` is installed for the dev server and for `vite preview` (it ships in the client bundle). `npm run smoke:play` loads the same harness in Vitest.

## Rules

- Prefer `__GAME__` over DOM selectors.
- Run `npm run smoke:play` first to prove mechanics. It must exit non-zero on any failed assert.
- Free play: `npm run play:agent`, then drive the open page with `__GAME__`.
- Do not grind past mid (tier 33, Principal AI architect) in automated runs unless the user asks. Phases A to C and a single mid check are enough.

## API

```ts
getState(): {
 money: number
 xp: number              // spendable XP (skills cost XP)
 xpTotal: number         // lifetime XP; gates and job requirements read this
 phase: "A" | "B" | "C" | "D"
 cps: number
 clickPower: number      // base $ per click (paid once the first gig is cleared)
 xpPerClick: number      // base XP per click, 1 + skills (what a click pays in phase A)
 xpPerSec: number
 owned: Record<string, number>      // phase D capital rows, keyed by id ("1")
 skills: Record<string, number>     // phase A, keyed by skill id
 equipment: Record<string, number>  // Gear tab, keyed by gear id
 jobs: number[]                     // owned job ids
 gigs: number[]                     // cleared gig ids
 unlocks: { gigBoard: boolean; jobBoard: boolean; gear: boolean; capital: boolean }   // gear opens with the Job Board
 nextUnlock: { key: string; name: string; tab: "A" | "B" | "C" | "G" | "D"; needs: string[]; either: boolean } | null   // the shop banner target
 era: "early" | "mid" | "upper" | "q3" | "end"
 spriteTierId: number
 activeBoost: { mult: number; endsAt: number } | null
 savedAt: number
 fight: { enemyId: number; hp: number; maxHp: number; remainingMs: number } | null
 lastFight: { kind: "win" | "flee" | "timeout"; enemyId: number; reward: number } | null
 lastPop: { kind: "click" | "gigClear" | "fightWin" | "unlock"; size: "medium" | "large"; amount: number; label: string } | null
}

click(): { money: number; xp: number }
buy(tierId: number): boolean          // phase D capital tier (ids 19-66)
buySkill(skillId: number): boolean
buyJob(jobId: number): boolean
buyEquipment(equipId: number): boolean   // a Gear tab row
completeGig(gigId: number): boolean   // normal gates
forceGig(gigId: number): boolean      // bypasses XP / prior-gig / board gates
setXp(n: number): void
tick(ms: number): void
setMoney(n: number): void
forceBoost(mult: number, ms: number): void
advanceOffline(ms: number): { credited: number; creditedXp: number; toast: string | null }
forceEnemy(enemyId: number): boolean
flee(): void
reset(): void
```

The economy is four phases (tables in `src/data/phases.ts`, gear in `src/data/gear.ts`, capital in `src/data/capital.ts`):

- **A Skill grind.** 50 skills, bought with XP only. Clicks pay XP only (`xpPerClick`), money stays 0, there is no $/s.
- **B Gigs.** Gig Board opens at 12,000 lifetime XP with skills 15 (Portfolio) and 16 (React) owned. 50 gigs, each cleared once for a lump $ and an optional `retainerCps`. The first cleared gig turns clicks into money.
- **C Jobs.** Job Board opens at 35,000 lifetime XP and 5 cleared gigs. 31 jobs (each held once, salary $/s).
- **Gear** (its own shop tab, between Jobs and Capital; table in `src/data/gear.ts`). Opens at 8,000 lifetime XP. 30 repeatable items bought with `buyEquipment`.
- **D Capital.** 25 rows, from an angel syndicate seat to Mars Holdings. Opens on the Senior job (id >= 14) OR $500,000 held at some point.

- `cps` is idle $/s (retainers + salaries + equipment + capital). Click boosts do not change it.
- `clickPower` is the base $ payout. In money mode a click pays `clickPower × activeBoost.mult` and drips 25% of `xpPerClick` as XP. In phase A a click pays `xpPerClick × activeBoost.mult` XP and no money.
- Money mode starts at the first cleared gig (or whenever money already exists, as with a forced balance).
- Skills cost XP and spending never lowers `xpTotal`. Jobs, equipment and capital cost money. Repeatable items cost `floor(base × 1.15 ^ owned)`.
- `nextUnlock` is what the shop banner under the tabs shows. Closed gates come first: Gear (8K XP), Gig Board, Job Board, then Capital. With every gate open it is the locked gig, job or skill with the smallest XP gap, then hidden gear, then the cheapest hidden capital row. `needs` lists only what is still missing.
- `spriteTierId` is the art id of the stage sprite: the highest owned capital tier, else the art of the furthest job, gig or skill. It is `1` before the first purchase. `era` is `early` until a capital tier is owned.
- The shop UI hides skills until `xpTotal` reaches their `unlockAtXp`, and capital until `peakMoney` has reached the price. `buy(tierId)` ignores that reveal but still enforces the capital gate. The other `buy*` calls enforce their gates too.
- `tick(ms)` advances idle time immediately, capped at 8 hours. It can also roll the normal boost clock. Skills keep studying (XP/s) in every phase.
- `forceBoost(mult, ms)` replaces the current click boost. Use this instead of waiting for a random roll.
- `advanceOffline(ms)` writes `savedAt` that far in the past and rehydrates. Credit is idle × seconds, capped at 8 hours, for both $ and XP. The toast is the same `welcome back, credited $X` path as a reload (`welcome back, studied +X XP` when only XP was earned).
- `forceEnemy(id)` starts a rare-enemy fight now (ids 1–44, `src/data/enemies.ts`), bypassing the random spawn and the era gate. Returns false for an unknown id. Random spawns need money mode and roll only among enemies whose `eraGate` equals the current era.
- During a fight `click()` damages the enemy by `clickPower × activeBoost.mult` and pays no money. A kill pays `reward`. `flee()` and the 30s timeout (`tick`) end the fight with no reward and no penalty. `lastFight` reports how the last one ended.
- `lastPop` is the last Balatro money pop: `medium` on a paying click, `large` on a gig clear, a fight win and a phase unlock.
- `reset()` wipes the save back to high school.

## Smoke (`npm run smoke:play`)

Vitest + happy-dom, all through `__GAME__`:

1. **Phase A.** Click until the first skill is affordable. Clicks pay XP only, money and $/s stay 0, `buySkill` spends XP and keeps `xpTotal`, skills study while idle.
2. **A to B.** `setXp` and buy Portfolio and React: the Gig Board opens (not before both), `completeGig` is gated, the first clear pays the lump and starts money clicks, `lastPop` is large then medium.
3. **B.** The first retainer gig is the first `$/s`.
4. **B to C to D.** Five gigs and 35K XP open the Job Board, an intern salary adds $/s, the Senior job (id 14) opens capital with no cash.
   **Gear.** Gear and `buyEquipment` stay shut until 8,000 lifetime XP, then a keyboard adds its click bonus. `nextUnlock` walks Gear, Gig Board, Job Board, Capital.
5. **D gate.** `buy(1)` fails at $499,999 and works at $500,000.
6. **Mid jump.** `setMoney` to the base cost of "WhyCombinator batch investment", buy it, and assert the cps / clickPower deltas match that row. `forceBoost(5, 10_000)`, then assert the click delta is `clickPower × 5` and `cps` is unchanged.
7. **Offline.** `advanceOffline` 1 hour credits `cps × 3600`, 10 hours caps at 8; phase A offline credits XP only.
8. **Fights.** Spawn, damage, win, flee, timeout, money-gated spawn.

## Free play (`npm run play:agent`)

Starts Vite on http://127.0.0.1:43123 if it is not already up, opens Chrome with remote debugging on port 9222, and leaves that browser up until the process is stopped. Set `PLAY_HEADED=1` to show the window. Set `CHROME_PATH` if Chrome is not on the default path.

From another process:

```js
import { chromium } from "playwright-core"

const browser = await chromium.connectOverCDP("http://127.0.0.1:9222")
const page = browser.contexts()[0].pages()[0]

await page.evaluate(() => window.__GAME__.getState())
await page.evaluate(() => {
  const game = window.__GAME__
  while (game.getState().money < 185) game.click()
  game.buy(1)
  game.buy(2)
  game.buy(3)
})

await browser.close()
```

`browser.disconnect` is not a function in this Playwright. `close()` on a `connectOverCDP` browser drops this client and leaves Chrome running. The `play:agent` process owns Chrome until SIGINT or SIGTERM; that shutdown is the one that actually closes the window.

## Example sequences

Phase A, then the Gig Board:

```js
const game = window.__GAME__
game.reset()
while (game.getState().xp < 10) game.click() // XP only, money stays 0
game.buySkill(1)
game.setXp(30_000)
game.buySkill(11) // Portfolio
game.buySkill(12) // React: Gig Board opens (phase B)
game.completeGig(1) // first $, clicks now pay money
game.getState()
```

Jobs and capital:

```js
const game = window.__GAME__
game.reset()
game.setXp(60_000)
for (const id of [1, 2, 3, 4, 5]) game.forceGig(id)
game.buyJob(1) // free internship, salary $/s
game.setMoney(500_000) // or buy a senior job: capital opens either way
game.buy(19)
```

Click boost (tier 26, still mid):

```js
const game = window.__GAME__
game.reset()
game.setMoney(7e6)
game.buy(26)
game.forceBoost(5, 10_000)
const before = game.getState()
game.click()
// money increased by before.clickPower * 5; cps unchanged
```

Offline sim:

```js
const game = window.__GAME__
game.reset()
game.forceGig(5) // retainer: first $/s
game.advanceOffline(60 * 60 * 1000)
game.advanceOffline(10 * 60 * 60 * 1000)
```
