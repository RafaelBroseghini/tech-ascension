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
 clickPower: number      // base $ per click (paid once the first job is taken)
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
 foreverMult: number
 tempMults: Partial<Record<"click" | "cps" | "xpPerSec", { mult: number; endsAt: number }>>
 event: { eventId: number; name: string; lines: string[] } | null
 lastEvent: { eventId: number; name: string; lines: string[] } | null
 review: {
  promptId: number
  jobId: number
  jobName: string
  question: string
  replies: { choice: "exceeds" | "meets" | "pip"; label: string; rating: string; lines: string[]; canAccept: boolean }[]
 } | null
 lastReview: { promptId: number; jobId: number; choice: "exceeds" | "meets" | "pip" | null; lines: string[] } | null
 ide: {
  era: "early" | "mid" | "upper" | "q3" | "end"
  packId: string
  kind: "files" | "inbox" | "deck"
  items: string[]
  index: number
  previewing: boolean
  restPackId: string
  folders: string[] // unlocked band ids in explorer order; each persists once entered
 }
 lastPop: { kind: "click" | "gigClear" | "fightWin" | "unlock"; size: "medium" | "large"; amount: number; label: string } | null
}

click(): { money: number; xp: number }
buy(tierId: number): boolean          // phase D capital row (ids 1-25)
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
forceEvent(eventId: number): boolean
acceptEvent(): boolean
dismissEvent(): void
forceReview(promptId?: number): boolean // 1:1 for the highest job. False with no job, during a fight, or for a prompt outside that band
answerReview(choice: "exceeds" | "meets" | "pip"): boolean // meets changes nothing; pip is refused when the cost cannot be paid
dismissReview(): void
ideSelect(index: number, packId?: string): boolean
previewEra(era: "early" | "mid" | "upper" | "q3" | "end" | null): void
reset(): void
```

The economy is four phases (tables in `src/data/phases.ts`, gear in `src/data/gear.ts`, capital in `src/data/capital.ts`):

- **A Skill grind.** 104 skills, bought with XP only. The first skills cost a lot of clicks, and the next one stays locked until lifetime XP climbs past the last purchase. There is no $/s.
- **B Gigs.** Gig Board opens at 14,000 lifetime XP with skills 15 (Portfolio) and 16 (React) owned. 65 gigs, each cleared once for a lump $ and an optional `retainerCps`. Each gig requires every earlier gig plus a skill set that grows by one skill each time (gig 1 needs skills 1–6), capped at the skill table.
- **C Jobs.** Job Board opens at 40,000 lifetime XP and 6 cleared gigs. 31 jobs (each held once, salary $/s).
- **Gear** (its own shop tab, between Jobs and Capital; table in `src/data/gear.ts`). Opens at 10,000 lifetime XP. 110 repeatable items bought with `buyEquipment`. Later rows also wait on a job id.
- **D Capital.** 25 rows, from an angel syndicate seat to Mars Holdings. Opens on the Senior job (id >= 14) OR $500,000 held at some point.

- `cps` is idle $/s (retainers + salaries + equipment + capital). Click boosts do not change it.
- `clickPower` is the base $ payout. Every click always pays `xpPerClick × activeBoost.mult` XP; dollars wait until the first job. After that, clicks also pay `clickPower × activeBoost.mult`. Idle $/s still starts at the first retainer.
- Money mode starts at the first cleared gig (or whenever money already exists, as with a forced balance).
- Skills cost XP and spending never lowers `xpTotal`. Jobs, equipment and capital cost money. Repeatable items cost `floor(base × 1.15 ^ owned)`.
- `nextUnlock` is what the shop banner under the tabs shows. Closed gates come first: Gear (10K XP), Gig Board, Job Board, then Capital. With every gate open it walks Skills, Gigs, Jobs, Gear, then Capital and stops at the first row that has not been bought yet. An earlier unlocked row that was never bought wins over a later row. The first copy is enough for repeatable gear, skills and capital. `needs` is never empty.
- `spriteTierId` is the art id of the stage sprite: the highest owned capital tier, else the art of the furthest job, gig or skill. It is `1` before the first purchase. `era` is `early` until a capital tier is owned.
- The shop lists owned rows plus the next unowned row, even while that row is still locked. Skills cannot be bought until `xpTotal` reaches `unlockAtXp`. Gear and capital first copies wait until their reveal gate (held money, and a job for some gear). `buy(tierId)` still enforces the capital gate.
- `tick(ms)` advances idle time immediately, capped at 8 hours. It can also roll the normal boost clock. Skills keep studying (XP/s) in every phase.
- `forceBoost(mult, ms)` replaces the current click boost. Use this instead of waiting for a random roll.
- `advanceOffline(ms)` writes `savedAt` that far in the past and rehydrates. Credit is idle × seconds, capped at 8 hours, for both $ and XP. The toast is a sticky note on the desk: one diary sentence, a newline, then the credit (`credited $X`, `studied +X XP`, or both). The sentence follows the career (studying, a retainer, a job, senior, empire) and rotates once per hour away. The credit math is unchanged.
- `forceEnemy(id)` starts a rare-enemy fight now (ids 1–44, `src/data/enemies.ts`), bypassing the random spawn and the era gate. Returns false for an unknown id. Random spawns need money mode and roll only among enemies whose `eraGate` equals the current era.
- During a fight `click()` damages the enemy by `clickPower × activeBoost.mult` and pays no money. A kill pays `reward`. `flee()` and the 30s timeout (`tick`) end the fight with no reward and no penalty. `lastFight` reports how the last one ended.
- `forceEvent(id)` opens a random event now (ids 1–110, `src/data/events.ts`) without applying it. Returns false for an unknown id or during a fight. An open event is replaced, never stacked. `acceptEvent()` takes the deal and returns false when a trade's cost cannot be paid. `dismissEvent()` declines and changes nothing. `event` is the modal on screen, `lastEvent` is kept after either choice. Stakes are minutes of what you currently earn (idle, or half a click per second when that is higher), and at least 1% of the balance you hold. A gift only adds money or XP. A trade swaps one for the other. Nothing only deducts. Random events roll roughly every 240s from rows whose `eras` include `any` or the current era. Optional `requires` (job, gig, gear) is AND across fields and OR inside a list; a row with no `requires` stays era-only. Cash events (money gifts and every trade) wait until money exists. A loss never pushes money or spendable XP below 0, and lifetime XP never falls.
- `forceReview(promptId?)` opens a 1:1 for the highest job you hold (`src/data/reviews.ts`). It returns false with no job, during a fight, or when `promptId` is outside that job's band. Omit `promptId` to roll one. It replaces an open event or review without applying it. `answerReview("exceeds")` is a money gift (12 minutes). `answerReview("meets")` closes the meeting and changes nothing. `answerReview("pip")` trades money for XP (10 minutes) and returns false when that cost cannot be paid, leaving the meeting up. `dismissReview()` leaves without a reply. `review.replies[].lines` are the same `+$` / `-XP` strings as events; meets has none and shows no change. A 1:1 rolls about every 12 minutes, only once a job is held, and waits out a fight, an event, or a meeting already on screen. If both clocks are due, the event wins and the 1:1 slips 5 seconds.
- `foreverMult` (permanent) and `tempMults` (timed, one per target) from events are already folded into `cps`, `clickPower`, `xpPerClick` and `xpPerSec`, so the formulas above still hold.
- `ide` describes the editor pane: each programming band is an explorer folder (id in `folders`) that stays unlocked; older bands freeze their file tabs at full depth. q3 and end add inbox and deck folders. `ideSelect(i, packId?)` opens item `i` in that folder, or the on-screen pack when `packId` is omitted (false when out of range). `previewEra(era)` shows that era's first pack the way the shop's Capital era tab does (`previewing: true`, `restPackId` is the owned pack); `previewEra(null)` or 20s without interaction (`tick`) snaps back, as does buying into a new era. Picking an owned folder while previewing snaps back.
- A save from any other `version` is wiped on load. There is no migration.
- `lastPop` is the last Balatro money pop: `medium` on a paying click, `large` on a gig clear, a fight win and a phase unlock.
- `reset()` wipes the save back to high school.

## Smoke (`npm run smoke:play`)

Vitest + happy-dom, all through `__GAME__`:

1. **Phase A.** Click until the first skill is affordable. Clicks pay XP only, money and $/s stay 0, `buySkill` spends XP and keeps `xpTotal`, skills study while idle.
2. **A to B.** `setXp` and buy Portfolio and React: the Gig Board opens (not before both), `completeGig` is gated, the first clear pays the lump (clicks stay XP-only until a job), `lastPop` is large.
3. **B.** The first retainer gig is the first `$/s`.
4. **B to C to D.** Five gigs and 35K XP open the Job Board, an intern salary adds $/s, the Senior job (id 14) opens capital with no cash.
   **Gear.** Gear and `buyEquipment` stay shut until 10,000 lifetime XP, then a keyboard adds its click bonus. `nextUnlock` walks Gear, Gig Board, Job Board, Capital.
5. **D gate.** `buy(1)` fails at $499,999 and works at $500,000.
6. **Mid jump.** `setMoney` to the base cost of "WhyCombinator batch investment", buy it, and assert the cps / clickPower deltas match that row. `forceBoost(5, 10_000)`, then assert the click delta is `clickPower × 5` and `cps` is unchanged.
7. **Offline.** `advanceOffline` 1 hour credits `cps × 3600`, 10 hours caps at 8; phase A offline credits XP only. The toast is a diary sentence plus that credit.
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
while (game.getState().xp < 240) game.click() // each click pays $ and XP; the first skill is a long grind
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
