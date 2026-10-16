# Playing Tech Ascension

Drive the game through `window.__GAME__`. Do not scrape buttons or guess DOM selectors.

`__GAME__` is installed for the dev server and for `vite preview` (it ships in the client bundle). `npm run smoke:play` loads the same harness in Vitest.

## Rules

- Prefer `__GAME__` over DOM selectors for game state and mechanics. Use snapshot refs only to check the UI itself (see Browser checks).
- Browser work goes through `npx agent-browser`, not Playwright. Set your own session first: `export AGENT_BROWSER_SESSION=<task-name>`. The unnamed session is shared with every other agent.
- Run `npm run smoke:play` first to prove mechanics. It must exit non-zero on any failed assert.
- Free play: `npm run play:agent`, then drive the open page with `npx agent-browser eval` and `__GAME__`.
- Do not grind past the mid era in automated runs unless the user asks. Mid is capital ids 1-5 (era flips to `upper` at id 6, "Acquire rival SaaS"). Phases A to C and a single mid check (id 3, "WhyCombinator batch investment") are enough.
- `npm test` runs the unit tests (Vitest, node, `src/**/*.test.ts`). `npm run smoke:play` runs only `src/game/smoke.play.ts` (happy-dom). `npm run lint` is oxlint, `npm run build` is `tsc -b && vite build`.

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
 xpPerSec: number       // idle XP/s: skills plus the jobs held that teach
 owned: Record<string, number>      // phase D capital rows, keyed by id ("1")
 skills: Record<string, number>     // phase A, keyed by skill id
 equipment: Record<string, number>  // Gear tab, keyed by gear id
 jobs: number[]                     // owned job ids
 gigs: number[]                     // cleared gig ids
 gold: number[]                     // owned gold skill ids (src/data/gold.ts)
 buyAmounts: (1 | 5 | 10 | "max")[] // amounts the Buying gold skills unlock; 1 is always there
 buyAmount: 1 | 5 | 10 | "max"      // what the shop's Buy control is set to
 hoverRate: number                  // hover clicks per second: 0 until a hover gold skill (or every catalog row) is owned
 offlineCapHours: number            // 8, or more with the Time away gold skills
 unlocks: { gigBoard: boolean; jobBoard: boolean; gear: boolean; capital: boolean }   // gear opens at 10,000 lifetime XP (or once any gear is owned), independent of the boards
 nextUnlock: { key: string; name: string; tab: "A" | "B" | "C" | "G" | "D"; needs: string[]; either: boolean } | null   // the next thing to chase across the whole game; each shop tab banner is the same idea scoped to its own panel
 era: "early" | "mid" | "upper" | "q3" | "end"
 spriteTierId: number
 activeBoost: { mult: number; endsAt: number } | null
 savedAt: number
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
 lastPop: { kind: "click" | "gigClear" | "unlock"; size: "medium" | "large"; amount: number; label: string } | null
 features: {
  open: string[]      // career timeline rows unlocked so far, in order ("studio", "careerLog", "theme:dracula", ...)
  fresh: string[]     // rows still marked NEW (unlocked, not used yet)
  reveals: string[]   // reveals waiting to play
  next: { id: string; name: string; via: string; fill: number; left: string } | null // the one dim outline on screen
  upNext: { id: string; name: string; via: string; fill: number; left: string }[]   // the career log's Up next
 }
 careerLog: { size: number; last: Record<string, number | string | boolean> | null } // journal entries kept, and the newest as JSON
 profile: { handle: string; chosen: boolean } // the career's handle on GitHug and LinkedOut ("quiet-otter"), drawn from word lists; chosen once kept
 world: {
  users: number                                  // all users; the goal is `target`
  target: number                                 // 7,000,000,000
  regionUsers: Record<string, number>            // by region id; a region with nobody is left out
  resistance: number                             // 0 to 100
  incidents: { id: number; kind: "ddos" | "block" | "law" | "rival"; region: string; endsAt: number; strength: number; cost: number }[]   // cost is what ending it takes now
  demand: number; capacity: number               // requests a second asked and served
  won: boolean                                   // latched at the target
 }
}

click(): { money: number; xp: number }
buy(tierId: number, amount?: 1 | 5 | 10 | "max"): boolean   // phase D capital row (ids 1-25)
buySkill(skillId: number, amount?: 1 | 5 | 10 | "max"): boolean
buyJob(jobId: number): boolean      // a job's lifetime XP and price gate it
buyEquipment(equipId: number, amount?: 1 | 5 | 10 | "max"): boolean   // a Gear tab row
buyGold(goldId: number): boolean      // gold skill, paid in spendable XP; normal gates
forceGold(goldId: number): boolean    // grants a gold skill, bypassing XP, order and price
setBuyAmount(amount): 1 | 5 | 10 | "max"   // returns the amount now set (clamped to what is unlocked)
completeGig(gigId: number): boolean   // normal gates
forceGig(gigId: number): boolean      // bypasses XP / prior-gig / board gates
setXp(n: number): void
tick(ms: number): void
setMoney(n: number): void
forceBoost(mult: number, ms: number): void
advanceOffline(ms: number): { credited: number; creditedXp: number; toast: string | null }
forceEvent(eventId: number): boolean
acceptEvent(): boolean
dismissEvent(): void
forceReview(promptId?: number): boolean // 1:1 for the highest job. False with no job or for a prompt outside that band
answerReview(choice: "exceeds" | "meets" | "pip"): boolean // meets changes nothing; pip is refused when the cost cannot be paid
dismissReview(): void
previewEra(era: "early" | "mid" | "upper" | "q3" | "end" | null): void
careerLog(): Record<string, number | string | boolean>[]  // every journal entry, oldest first, one flat JSON object each
seeFeature(id: string): boolean   // clear a NEW marker, as using the feature does; false for an unknown id
clearReveals(): void              // drop the reveals waiting to play (NEW markers stay)
setPopActive(cityId: string, on: boolean): boolean   // switch a deployed point of presence on or off; its clients go to the nearest one still on. False for the last one on
setRegionActive(regionId: string, on: boolean): boolean   // switch a bought region on or off whole. False for the last region serving
forceIncident(kind: "ddos" | "block" | "law" | "rival", regionId?: string): boolean   // open an incident now, on the biggest region by default. False at three live or for an unknown region
respondIncident(incidentId: number): boolean   // pay `world.incidents[].cost` to end it. False when it is gone or the money is short
setUsers(regionId: string, users: number): boolean   // set a region's users, up to what it can hold
rerollProfile(): boolean          // draw another handle, as the start card's Reroll does; false once kept
keepProfile(): void               // keep the current one for good, as the start card's Start (agents: call it to clear the card)
reset(): void
```

The economy is four phases (tables in `src/data/phases.ts`, gear in `src/data/gear.ts`, capital in `src/data/capital.ts`). Every purchase price (skill XP, job XP, gear, capital) is multiplied by `PURCHASE_COST_SCALE = 0.85` in `src/data/costs.ts`; the exported rows are already scaled, so read costs from the data modules, never from memory. Payouts and gates are not scaled. Gates latch: owning what a gate leads to (a gig, a job, a capital row, any gear) keeps it open.

- **A Skill grind.** 104 skills, bought with XP only. The used laptop's first copy (skill 1, `firstXpCost`) costs 90 XP so the first unlock comes within a minute; later copies and the skills after it cost a lot of clicks, and the next one stays locked until lifetime XP climbs past the last purchase. There is no $/s.
- **B Gigs.** Gig Board opens at 14,000 lifetime XP with skills 15 (Portfolio) and 16 (React) owned (`GIG_BOARD_UNLOCK`). 65 gigs, each cleared once for a lump $ and an optional `retainerCps`. Each gig requires every earlier gig plus a skill set that grows by one skill each time (gig 1 needs skills 1–6), capped at the skill table. Gig 1 also needs 12,000 lifetime XP. Gig 8 ("Site maintenance retainer", 2 $/s) is the first retainer; gigs 1-7 pay a lump only.
- **C Jobs.** Job Board opens at 40,000 lifetime XP and 6 cleared gigs (`JOB_BOARD_UNLOCK`). 31 jobs (each held once, salary $/s; twelve of them, the learning, teaching and research roles, also add idle XP/s through `xpPerSec` in `src/data/phases.ts`, and eleven pay a one-time lump of XP on hire through `xpLump`, added to both `xp` and `xpTotal`). Taking a job costs spendable XP (`xpCost`: a quarter of its `xpReq`, then the purchase scale; the Internship is free), never money. Job 1 (Internship offer) needs 35,000 lifetime XP; job 14 (Senior SWE) needs 160,000 XP.
- **Your company** (the globe, the fleet, the world and a status page, `src/components/globe`). The globe is a small one on the desk, bottom left under the career log (`MiniGlobe`, shown once Your company is unlocked, hidden below 860 px, captioned with the users and any live incidents); drag turns it. Its expand button and the activity-bar globe button open the details: the metrics, the world, points of presence, cities, fleet and status page. The goal is `WORLD_TARGET` = 7,000,000,000 users (`src/game/globe/world.ts`). Users are tracked per region (`company.users`, regions in `src/data/regions.ts`, people per region in `world.ts`; the app can reach `REACH_CEILING` = 93% of them, about 7.5 billion in all). Each cleared gig seeds its client's region with `SEED_PER_GIG` users (gig ids walk `CLIENT_CITIES`). A region grows by `GROWTH_PER_SEC × reach × max(users, seed) × (1 − users/ceiling) × served × (1 − resistance/200)`; `reach` is 1 for a bought region and 0.15 for one not bought, times how many points of presence it has live (three are full coverage) and how near the nearest one is, so locations drive users. A small share of all users spills into every region. Users send `RPS_PER_USER` = 0.1 requests a second each, so demand is `demandOf(users)` (a DDoS surge multiplies one region's share); capacity is `capacityOf(equipment)` (a base laptop plus the serving gear kinds). The share over capacity is dropped: the dropped users churn away and the drops cost `REVENUE_PER_DROPPED_RPS` dollars a second, so gear is the throttle and every new region forces a gear purchase. **The world fights back.** A global resistance meter (0 to 100, `resistanceTarget` of the users, with a lag) drags growth by up to half and makes incidents more frequent, harder and longer. Incidents are regional and capped at three live (`rollIncident`, `world.ts`): a DDoS surge multiplies a region's traffic, a censorship block stalls it and bleeds its users (a server there halves the bleed), a data-residency law does the same to a region without a live server (and never rolls where one is live), and a rival app halves its growth. They start once there are `INCIDENT_MIN_USERS` users, end on their own, or end at once when the player pays minutes of what the company earns (`incidentCost`; Respond in the world pane), which also takes 3 points off the resistance. **The win.** Reaching 7 billion latches `company.won`, writes the `world:won` journal line, shows a card in the world pane and multiplies everything the company earns by `WIN_MULT` (×1.25) for good; the game keeps going. Milestones at one million, one hundred million and one billion are journaled too, as are incidents. Growth, incidents and the win are stepped by `stepCompany`/`advanceCompany` (`src/game/globe/growth.ts`, in steps of `STEP_MS`, so offline time plays out too); the world rules are in `world.ts`. The status page keeps one bar per status day (`STATUS_DAY_MS`, 90 kept) in `company.uptime`, and the page is derived from those numbers (`src/game/globe/status.ts`).
- **Gear** (its own shop tab, between Jobs and Capital; table in `src/data/gear.ts`). Opens at 10,000 lifetime XP. 110 repeatable items bought with `buyEquipment`. Later rows also wait on a job id.
- **10x dev skills** (`gold` in the code and the harness: `src/data/gold.ts`, rules in `src/game/gold.ts`). Ten one-off perks bought once with spendable XP, shown in their own "10x dev" sub-tab of the Skills tab with a trophy and a description. A row opens at its lifetime-XP milestone and waits on the earlier row of its family. **Buying** (Bulk Buy ×5, ×10, Max at 8,000 / 60,000 / 600,000 XP) adds amounts to the shop's Buy control; without one, `buy`, `buySkill` and `buyEquipment` always buy one copy whatever `amount` asks for, and with one they buy up to that many. **Hover clicking** (2, 5, 10, 15 clicks/s from 20,000 XP; the endgame 20/s still comes from owning every catalog row) makes `hoverRate` positive. **Time away** raises the offline cap from 8 to 12, 16 and 24 hours. Prices are a quarter of the opening XP, then the purchase scale. Saves keep them in an optional `gold` list.
- **D Capital.** 25 rows, from an angel syndicate seat to Mars Holdings. Opens on the Senior job (id >= 14) OR $500,000 held at some point (`peakMoney`, so spending it later does not close the gate). Eras by id: mid 1-5, upper 6-11, q3 12-14, end 15-25. Only `buy(1..25)` is valid. Row 1 costs $85,000 and row 3 costs $1,700,000 after the scale.

- **Demand scale.** `demandOf(users)` is `users × 0.1`: a thousand users send 100 requests a second, a million 100,000, and seven billion 700 million. `src/game/globe/world.test.ts` pins the calibration: one copy of every serving row up to $1M serves over a hundred thousand users but not a billion, and five copies of every serving row serve all seven billion. Points of presence can be switched off one by one or by region (`footprint.off`, `footprint.dark`, both optional in the save); traffic goes to the nearest one still on.
- `cps` is idle $/s (retainers + salaries + equipment + capital). Click boosts do not change it.
- `clickPower` is the base $ payout. Every click always pays `xpPerClick × activeBoost.mult` XP; dollars wait until the first job. After that, clicks also pay `clickPower × activeBoost.mult`. Idle $/s still starts at the first retainer.
- Money mode starts at the first cleared gig (or whenever money already exists, as with a forced balance).
- Skills cost XP and spending never lowers `xpTotal`. Skills and jobs cost XP; equipment and capital cost money. Repeatable items cost `floor(base × 1.15 ^ owned)`.
- `nextUnlock` is the one thing to chase across the whole game. It names the first skill that has not been bought yet, not a closed tab. Once every skill is owned, closed gates come first: Gear (10K XP), Gig Board, Job Board, then Capital. With every gate open it walks Gigs, Jobs, Gear, then Capital and stops at the first row that has not been bought yet. An earlier unlocked row that was never bought wins over a later row. The first copy is enough for repeatable gear, skills and capital. `needs` is never empty.
- The banner under the shop tabs is per panel: each tab shows `nextUnlock(progress, tab)` from `src/game/nextUnlock.ts`, which is that tab's closed board (what it still needs) or else its first row not bought yet. A finished panel reads "Every skill learned" and so on. `getState().nextUnlock` is the whole-game version, not the open tab's.
- `spriteTierId` is the art id of the stage sprite: the highest owned capital tier, else the art of the furthest job, gig or skill. It is `1` before the first purchase. `era` is `early` until a capital tier is owned.
- The shop lists owned rows plus the next unowned row, even while that row is still locked. Skills cannot be bought until `xpTotal` reaches `unlockAtXp`. Gear and capital first copies wait until their reveal gate (held money, and a job for some gear). `buy(tierId)` still enforces the capital gate.
- `tick(ms)` advances idle time immediately, capped at 8 hours. It can also roll the normal boost clock. Skills keep studying (XP/s) in every phase, and held jobs that teach add to it.
- `forceBoost(mult, ms)` replaces the current click boost. Use this instead of waiting for a random roll.
- `advanceOffline(ms)` writes `savedAt` that far in the past and rehydrates. Credit is idle × seconds, capped at 8 hours (`offlineCapHours`, longer with Time away gold skills), for both $ and XP. The toast is a sticky note on the desk: one diary sentence, a newline, then the credit (`credited $X`, `studied +X XP`, or both). The sentence follows the career (studying, a retainer, a job, senior, empire) and rotates once per hour away. The credit math is unchanged.
- `forceEvent(id)` opens a random event now (ids 1–110, `src/data/events.ts`) without applying it. Returns false for an unknown id. An open event is replaced, never stacked. `acceptEvent()` takes the deal and returns false when a trade's cost cannot be paid. `dismissEvent()` declines and changes nothing. `event` is the modal on screen, `lastEvent` is kept after either choice. Stakes are minutes of what you currently earn (idle, or half a click per second when that is higher), and at least 1% of the balance you hold. A gift only adds money or XP. A trade swaps one for the other. Nothing only deducts. Random events roll roughly every 240s from rows whose `eras` include `any` or the current era. Optional `requires` (job, gig, gear) is AND across fields and OR inside a list; a row with no `requires` stays era-only. Cash events (money gifts and every trade) wait until money exists. A loss never pushes money or spendable XP below 0, and lifetime XP never falls.
- `forceReview(promptId?)` opens a 1:1 for the highest job you hold (`src/data/reviews.ts`). It returns false with no job or when `promptId` is outside that job's band. Omit `promptId` to roll one. It replaces an open event or review without applying it. `answerReview("exceeds")` is a money gift (12 minutes). `answerReview("meets")` closes the meeting and changes nothing. `answerReview("pip")` trades money for XP (10 minutes) and returns false when that cost cannot be paid, leaving the meeting up. `dismissReview()` leaves without a reply. `review.replies[].lines` are the same `+$` / `-XP` strings as events; meets has none and shows no change. A 1:1 rolls about every 12 minutes, only once a job is held, and waits out an event or a meeting already on screen. If both clocks are due, the event wins and the 1:1 slips 5 seconds.
- `foreverMult` (permanent) and `tempMults` (timed, one per target) from events are already folded into `cps`, `clickPower`, `xpPerClick` and `xpPerSec`, so the formulas above still hold.
- The desk behind the stage is an activity bar (the Your company globe, the career log), the career log sidebar and a status bar. The status bar names the band the career is in (High school to Mars, by stage art id, `src/data/idePacks.ts`). `previewEra(era)` shows that era's first band there with a PREVIEW chip, the way the shop's Capital era tab does; `previewEra(null)` or 20s without interaction (`tick`) snaps back, as does buying into a new era. The snapshot has no field for it; read `data-preview` on `[data-testid='ide']`.
- A save from any other `version` is wiped on load. There is no migration.
- `lastPop` is the last Balatro money pop: `medium` on a paying click, `large` on a gig clear and a phase unlock.
- `reset()` wipes the save back to high school.
- **Career timeline** (table in `src/data/features.ts`, gates in `src/game/features.ts`, journal in `src/game/careerLog.ts`, wiring in `src/game/careerSync.ts`). The desk is earned: a new career has XP and the Skills tab. Used laptop (skill 1) opens Your company (the activity-bar globe button; its reveal card's Try it opens it), Git + GitHug hygiene (10) the career log and the GitHug profile (a contribution graph from the journal, pinned repos, and the real repo's Star pill, which stays off screen until then), Portfolio site live (15) LinkedOut, the first 10x dev row in reach the 10x dev tab, 10K XP the Gear tab, the first dollar the $ counters (`$/click` shows once a job pays it), the first gig the rosters, the first job the metrics, the Thocky keyboard click sounds, the Drawing tablet editor themes, a hover skill hover click, the headset music, and 15 minutes at the desk (clicking, idling, or with the tab left open) or an earlier return after 10 minutes away the desk cat. Editor themes, click sounds and music styles keep unlocking with stage art tiers (from the Internship band on), desk gear and capital eras. Each unlock is logged, marked NEW until used (`seeFeature`), and queued to reveal (`clearReveals` drops the queue); four or more at once, or any during a return, play only the loudest. Closed shop boards are hidden except the next one. Gates read progress, so forced progress (`forceGig`, `setXp`) unlocks what it reaches. `advanceOffline` past 10 minutes is a return: it logs one and brings the cat. Every step of the career (skills, gigs, jobs, first copies, boards, eras, perks, unlocks, returns, events, 1:1s, milestones) is a journal entry, printed as JSON lines by `careerLog()`. Admin mode shows the whole desk.
- **Identity** (`src/game/identity.ts`, start card in `src/components/IdentityPicker.tsx`). Every new career (a fresh save or `reset()`) draws a Tailscale-style handle (`quiet-otter`) and opens a start card: Reroll draws another, and Start keeps it for good. There is no real name; GitHug and LinkedOut (`linkedout.com/in/<handle>`) both go by the handle. Nothing is ever typed. It is saved in an optional `profile` block with `chosen`; a save is only accepted with a handle the lists can draw. A save from before handles gets one, already kept, with no card. A test scans all 1,024 handles, as shown and run together, for slurs and slang.

## Smoke (`npm run smoke:play`)

Vitest + happy-dom, all through `__GAME__`:

1. **Phase A.** Click until the first skill is affordable. Clicks pay XP only, money and $/s stay 0, `buySkill` spends XP and keeps `xpTotal`, skills study while idle.
2. **A to B.** `setXp` and buy Portfolio and React: the Gig Board opens (not before both), `completeGig` is gated, the first clear pays the lump (clicks stay XP-only until a job), `lastPop` is large.
3. **B.** The first retainer gig is the first `$/s`.
4. **B to C to D.** Six gigs and 40K XP open the Job Board (five gigs do not), an intern salary adds $/s and idle XP/s, taking the internship pays its XP lump once, the Senior job (id 14) opens capital with no cash.
   **Gear.** Gear and `buyEquipment` stay shut until 10,000 lifetime XP, then a keyboard adds its click bonus. `nextUnlock` walks Gear, Gig Board, Job Board, Capital.
5. **D gate.** `buy(1)` fails at $499,999 and works at $500,000.
6. **Mid jump.** `setMoney` to the base cost of "WhyCombinator batch investment", buy it, and assert the cps / clickPower deltas match that row. `forceBoost(5, 10_000)`, then assert the click delta is `clickPower × 5` and `cps` is unchanged.
7. **Offline.** `advanceOffline` 1 hour credits `cps × 3600`, 10 hours caps at 8; phase A offline credits XP only. The toast is a diary sentence plus that credit.
8. **10x dev skills.** A bulk skill is gated by lifetime XP and price, `amount` only works once unlocked, hover rate and offline cap follow the gold owned.
9. **Events and 1:1s.** A gift event applies once and a decline changes nothing, a trade scales to the pile and is refused when it cannot be paid, and a 1:1 waits for a job and its three replies pay, sit or bill you.
10. **The world.** Users seed from gigs and grow per region while the gear serves them (a laptop alone settles near what it serves), a DDoS surge multiplies a region's demand, paying `cost` ends an incident and is refused when short, and seven billion users latch `won` once, pay the ×1.25 forever multiplier once, and write `world:won` to the journal; the game keeps ticking.
11. **Career timeline.** Nothing is unlocked at minute zero; the first skill opens Your company (logged and queued), Linux CLI basics opens nothing, Git + GitHug hygiene the career log, with a NEW marker that `seeFeature` clears, and the GitHug profile, the first gig and job the board, the dollars, the rosters and the metrics; every journal line is one flat JSON object; `advanceOffline` past 10 minutes logs a return and brings the cat; after a wipe, 15 minutes of `tick` brings it too.

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
- Check narrow layouts with `set viewport 390 844`. Below 640 px the desk prompt drops its card, and a "Desktop recommended" card covers the page until "Got it" is clicked, so dismiss it before judging the layout.
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
game.buyJob(14) // 34,000 spendable XP: capital opens with no cash (holding $500,000 opens it too)
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
for (let id = 2; id <= 10; id++) game.buySkill(id) // Git + GitHug hygiene: the career log, marked NEW
game.seeFeature("careerLog")
game.advanceOffline(30 * 60 * 1000) // a return: logged, and the desk cat moves in
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
