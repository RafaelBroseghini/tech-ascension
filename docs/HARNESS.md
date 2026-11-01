# Harness API and mechanics

Reference for `window.__GAME__` (`src/game/harness.ts`) and the rules behind it. The short version and the conventions are in [AGENTS.md](../AGENTS.md); how to play and check the UI is in [AGENT_PLAY.md](AGENT_PLAY.md).

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
 hoverRate: number                  // hover clicks per second: 0 until a hover gold skill (or every catalog row) is owned
 offlineCapHours: number            // 8, or more with the Time away gold skills, plus 4 with the Long weekend Legacy perk
 unlocks: { gigBoard: boolean; jobBoard: boolean; gear: boolean; capital: boolean }   // gear opens at 10,000 lifetime XP (or once any gear is owned), independent of the boards
 nextUnlock: { key: string; name: string; tab: "A" | "B" | "C" | "G" | "D"; needs: string[]; either: boolean } | null   // the next thing to chase across the whole game; the shop has no banner; a locked board's lock panel names what it needs
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
  open: string[]      // career timeline rows unlocked so far, in order ("careerLog", "theme:dracula", ...)
  fresh: string[]     // rows still marked NEW (unlocked, not used yet)
  reveals: string[]   // reveals waiting to play
  next: { id: string; name: string; via: string; fill: number; left: string } | null // the one dim outline on screen
  upNext: { id: string; name: string; via: string; fill: number; left: string }[]   // the career log's Up next
 }
 careerLog: { size: number; last: Record<string, number | string | boolean> | null } // journal entries kept, and the newest as JSON
 profile: { handle: string; chosen: boolean } // the career's handle on GitHug and LinkedOut ("quiet-otter"), drawn from word lists; chosen once kept
 legacy: {
  runs: number          // careers started, counting the one under way
  prestige: number      // spendable Prestige (Legacy perks cost it)
  prestigeTotal: number // every Prestige ever earned; never falls
  mult: number          // 1 + 0.03 * prestigeTotal, already folded into cps, clickPower, xpPerClick, xpPerSec and the offline credit
  exitOpen: boolean     // the Exit would pay at least 1 Prestige (first career), or this is a later career
  prestigeOnExit: number // Prestige an Exit taken now pays; 0 means exit() refuses
  perks: string[]       // Legacy perk ids owned
 }
 combos: {
  found: { id: string; name: string; joke: string; effect: string }[] // kitchen combos found this career, in the order they turned up; effect reads "+3% per click"
  total: number                                                        // combos in the table (src/data/combos.ts)
 }
 build: {
  specialization: string | null  // "frontend" | "backend" | "infra" | "ai" | "fde" | "security"; null before the pick
  switched: boolean              // the career's one switch is spent
  options: string[]              // the ids that could be picked now (all six), or switched to now (the other five); [] otherwise
  leadership: string | null      // "ic" | "manager"; null before the pick after Senior
  leadershipOptions: string[]    // ["ic", "manager"] while the leadership pick is open, [] otherwise
 }
}

click(): { money: number; xp: number }
buy(tierId: number, amount?: 1 | 5 | 10 | "max"): boolean   // phase D capital row (ids 1-25)
buySkill(skillId: number, amount?: 1 | 5 | 10 | "max"): boolean
buyJob(jobId: number): boolean      // a job's lifetime XP and price gate it; every job above rank 7 also needs a pick, and a track row needs its own; every job above rank 15 needs a leadership line, and the line's own rows
explain(ref: string): ExplainRow | null // why a row is open or shut for the career under way: `{ ref, name, track, strict, after, owned, open, needs: [{ text, met }], missing, opens }`; refs are `gig:3`, `job:14`, `skill:15`, `gear:42`, `capital:3`, `board:jobs`, `pick:spec`, `gold:2` (docs/TREE.md). Null for an unknown ref
pickSpecialization(id: string): boolean   // opens once a job of rank 7 (Mid-level SWE) is held; once per career. False before that, once picked, or for an unknown id
pickLeadership(id: string): boolean       // "ic" or "manager": opens once a job of rank 14 (Senior SWE) is held; once per career, locked. False before that, once picked, or for an unknown id
switchSpecialization(id: string): boolean // the one switch: keeps money, gear and the trunk jobs, drops the old track's jobs. False without a pick, after the switch, or to the same one
buyEquipment(equipId: number, amount?: 1 | 5 | 10 | "max"): boolean   // a Gear tab row
buyGold(goldId: number): boolean      // gold skill, paid in spendable XP; normal gates
forceGold(goldId: number): boolean    // grants a gold skill, bypassing XP, order and price
completeGig(gigId: number): boolean   // normal gates
forceGig(gigId: number): boolean      // bypasses XP / prior-gig / board gates
setXp(n: number): void
setFont(id: string): boolean         // set the UI font like a click on its settings row (chakra-petch, jetbrains-mono, space-grotesk, pixelify-sans, atkinson); false for an unknown id. A preference, so reset() keeps it. Read it back from document.documentElement.dataset.uiFont
tick(ms: number): void
setMoney(n: number): void
forceBoost(mult: number, ms: number): void
forceCats(count: number): number     // finds the first `count` roster gifs (cats for the gif parade); returns cats found
advanceOffline(ms: number): { credited: number; creditedXp: number; toast: string | null }
forceEvent(eventId: number): boolean
acceptEvent(): boolean
dismissEvent(): void
forceReview(promptId?: number): boolean // 1:1 for the highest job. False with no job or for a prompt outside that band
answerReview(choice: "exceeds" | "meets" | "pip"): boolean // meets changes nothing; pip is refused when the cost cannot be paid
dismissReview(): void
previewEra(era: "early" | "mid" | "upper" | "q3" | "end" | null): void
forceCelebration(): void  // play the unlock celebration over the stage now
careerLog(): Record<string, number | string | boolean>[]  // every journal entry, oldest first, one flat JSON object each
seeFeature(id: string): boolean   // clear a NEW marker, as using the feature does; false for an unknown id
clearReveals(): void              // drop the reveals waiting to play (NEW markers stay)
rerollProfile(): boolean          // draw another handle, as the start card's Reroll does; false once kept
keepProfile(): void               // keep the current one for good, as the start card's Start (agents: call it to clear the card)
exit(): number | false            // leave the career: Prestige paid, or false when the Exit is not open or would pay 0
buyLegacy(perkId: string): boolean // a Legacy perk (src/data/legacy.ts, `network.*`, `capital.*`), each after the one before it in its track, for Prestige
setPrestige(n: number): void      // sets spendable Prestige; prestigeTotal rises to match (tests only)
reset(): void
```

The economy is four phases (tables in `src/data/phases.ts`, gear in `src/data/gear.ts`, capital in `src/data/capital.ts`). Every purchase price (skill XP, job XP, gear, capital) is multiplied by `PURCHASE_COST_SCALE = 0.85` in `src/data/costs.ts`; the exported rows are already scaled, so read costs from the data modules, never from memory. Payouts and gates are not scaled. Gates latch: owning what a gate leads to (a gig, a job, a capital row, any gear) keeps it open.

- **A Skill grind.** 104 skills, bought with XP only. The used laptop's first copy (skill 1, `firstXpCost`) costs 90 XP so the first unlock comes within a minute; later copies and the skills after it cost a lot of clicks, and the next one stays locked until lifetime XP climbs past the last purchase. There is no $/s.
- **B Gigs.** Gig Board opens at 14,000 lifetime XP with skills 15 (Portfolio) and 16 (React) owned (`GIG_BOARD_UNLOCK`). 65 gigs, each cleared once for a lump $ and an optional `retainerCps`. Each gig needs lifetime XP and enough owned skills of each tag it carries (`Gig.needs`, written in `GIG_PATH`; the specialization lowers the count on its own tag, `gigTagMin`); no gig needs another cleared, and the shop lists the cleared gigs, the open ones and the next two locked ones. Gig 1 needs a backend and a frontend skill and 12,000 lifetime XP. Gig 8 ("Site maintenance retainer", 2 $/s) is the first retainer; gigs 1-7 pay a lump only.
- **C Jobs.** Job Board opens at 40,000 lifetime XP and 6 cleared gigs (`JOB_BOARD_UNLOCK`). 71 job rows in a tree (each held once, salary $/s; twelve of them, the learning, teaching and research roles, also add idle XP/s through `xpPerSec` in `src/data/phases.ts`, and eleven pay a one-time lump of XP on hire through `xpLump`, added to both `xp` and `xpTotal`). Taking a job costs spendable XP (`xpCost`: a quarter of its `xpReq`, then the purchase scale; the Internship is free), never money. Job 1 (Internship offer) needs 35,000 lifetime XP; job 14 (Senior SWE) needs 160,000 XP.
  **Specializations** (`src/data/specializations.ts`, rules in `src/game/build.ts`). The ladder is a tree: ranks 1-7 are a shared trunk (ids 1-7), ranks 8-15 are one track per specialization, ranks 16-31 are shared again (ids 16-31). Six specializations: `frontend` (click), `backend` (balanced), `infra` (idle), `ai` (idle), `fde` (click, tag product), `security` (balanced). A track has eight rows with the same `xpReq`, price, pay, XP and click numbers as the backend row at its rank, so every track paces alike. Backend keeps ids 8-15; the others are `100 * k + rank` (frontend 108-115, infra 208-215, ai 308-315, fde 408-415, security 508-515). A track row wears the art of the backend row at its rank.
  The **pick** opens once a job of rank 7 is held (nothing else is asked) and is made once; Senior SWE asks for nothing past its XP and the pick. **Every job above rank 7, the rows 16-31 included, needs a picked specialization**, and a track row also needs that track; other tracks' rows are never shown and `buyJob` refuses them, so capital cannot be reached through the ladder without a pick (holding $500,000 still opens it). The **switch** is once a career: it keeps money, gear and the trunk jobs (and shared rows already held), drops the old track's job ids, and the player starts at the new track's first row. Gates latch: `build.peakRank`, the rank held before the switch, keeps capital open and gear revealed (`heldRank` in `build.ts`). `nextUnlock` names `{ key: "spec:pick", name: "Pick a specialization", tab: "C", needs: the six names, either: true }` when the pick is the next step.
  **Leadership** (`src/data/leadership.ts`, rules in `src/game/build.ts`). After Senior SWE the ladder forks once more: `ic` (Individual contributor) or `manager` (Manager). The **pick** opens once a job of rank 14 is held, is made once and is locked (no switch). **Every job above rank 15 needs a picked line**, and rows 16-24 also need their own line: IC is ids 16, 17, 19, 23, 24 (Staff engineer, Staff platform, Principal, Distinguished, Fellow); Manager is ids 18, 20, 21, 22 (Engineering manager, Director of Eng, VP Engineering, CTO); rows 25-31 are shared, and rank 15 stays in the specialization tracks. The other line's rows are never shown and `buyJob` refuses them (`jobState` reads `hidden`, or `lead` before the pick). An IC career sees 27 rows, a Manager 26. Ids and ranks did not change. Picking never closes anything (gates latch) and a specialization switch keeps the line. The pick is a journal `pick` line with `ref: "lead:manager"`. `nextUnlock` names `{ key: "lead:pick", name: "Pick a leadership line", tab: "C", needs: the two names, either: true }` once the track is held to rank 15.
  **Click and idle builds** (numbers in `src/game/build.ts`). A click build's *manual* click multiplies the jobs' click share by `CLICK_BUILD_CLICK_MULT` (2.5 over the plain ladder's 0.68), so with every job its build can see held, 2 clicks a second pay 5 times the idle $/s. Hover clicks and auto-click never get that multiple (`click("auto")` in the store); an idle build's penalty still applies to them. An idle build earns `IDLE_BUILD_IDLE_MULT` (1.25) times its idle $/s on every source, offline credit included, and half the click share. Balanced builds are the plain ladder. `getState().clickShare` and `clickPower` report the manual click.
- **Gear** (its own shop tab, between Jobs and Capital; table in `src/data/gear.ts`). Opens at 10,000 lifetime XP. 110 repeatable items bought with `buyEquipment`, each paying its `cps` and `clickBonus`. Later rows also wait on a job id. The Desk, Home lab and Storage rows share one reveal track (the next unbought row is always listed); the Cloud, GPUs, Racks, Orbit and Mars rows (`INFRA_KINDS`) are a second track that joins the list from the first job (`isInfraKind`).
- **10x dev skills** (`gold` in the code and the harness: `src/data/gold.ts`, rules in `src/game/gold.ts`). Seven one-off perks bought once with spendable XP, shown in their own "10x dev" sub-tab of the Skills tab with a trophy and a description. A row opens at its lifetime-XP milestone and waits on the earlier row of its family. `buy`, `buySkill` and `buyEquipment` always act on one copy. **Hover clicking** (2, 5, 10, 15 clicks/s from 20,000 XP, and the first tier, Hover Tap, also waits for a Senior SWE job: a row can carry `unlockJobRank`; the endgame 20/s still comes from owning every catalog row) makes `hoverRate` positive. **Time away** raises the offline cap from 8 to 12, 16 and 24 hours. Prices are a quarter of the opening XP, then the purchase scale. Saves keep them in an optional `gold` list.
- **D Capital.** 25 rows, from an angel syndicate seat to Mars Holdings. Opens on a Senior job (rank >= 14, held now or before the switch) OR $500,000 held at some point (`peakMoney`, so spending it later does not close the gate). Eras by id: mid 1-5, upper 6-11, q3 12-14, end 15-25. Only `buy(1..25)` is valid. Row 1 costs $85,000 and row 3 costs $1,700,000 after the scale.

- **The kitchen** (table in `src/data/combos.ts`, rules in `src/game/combos.ts`, wired in the store's career subscriber; every catalog row carries tags, `src/data/tags.ts`). Owning two ingredients that go together (a catalog row, or a tag held enough times) reveals a combo: a name, one clean joke and a small effect. Each effect is 1 to 5 percent on idle $/s, on click ($ and XP) or on idle XP/s, added together (not compounded) and capped at 25% per kind (`COMBO_CAP_PCT`). A combo is found the moment both ingredients are held, from any purchase or force helper, journaled once as a `combo` entry in the career log and saved as the optional `combos` id list. The bonus is read from what is held (`comboFactors`, folded in by `modsOf`), so `cps`, `clickPower`, `xpPerClick`, `xpPerSec` and the offline credit already include it. An Exit and `reset()` clear it. There is no kitchen panel yet; read `getState().combos`.
- **Prestige: the Exit** (`docs/PRESTIGE.md`; data in `src/data/legacy.ts`, rules in `src/game/legacy.ts` and `src/game/perks.ts`; the buttons are in admin mode only). `exit()` closes the career. It pays `floor(cbrt(earnings across all careers / PRESTIGE_EARN_SCALE))` Prestige in total, so an Exit pays the rungs this career climbed (earnings are dollars credited, `stats.lifetimeEarned`, spending ignored; `setMoney` raising a balance counts). The Exit is open on a later career from the start and on the first once it would pay at least 1, and it needs a total of at least 1. It starts over money, XP, skills, gigs, jobs, gear and capital, the click boost and event multipliers. The handle stays and stays kept (a later career has nothing to draw, so the start card does not reopen), and a headline card names it. Prestige, `prestigeTotal`, Legacy perks, 10x dev skills, the career log and the timeline stay. `prestigeTotal` gives `1 + 0.03 × prestigeTotal` on every income and XP stream (through `modFactors`, so the offline credit gets it). Legacy perks (two tracks, each after the one before, 66 Prestige in all) apply now and at the start of every career: Network (1, 2, 4, 7, 12) is a head start, and Capital (2, 4, 7, 11, 16) is offline cap +4 h, capital rows −10%, gear rows −10%, salaries and retainers ×2, capital income ×1.5. The Exit button is in the Prestige panel (the crown on the activity bar), with a confirmation card (the first Exit asks twice) and a headline card.
- `cps` is idle $/s from owned items (retainers + salaries + equipment + capital). Click boosts do not change it; the status bar's $/s is the same figure.
- `clickPower` is the base $ payout. Every click always pays `xpPerClick × activeBoost.mult` XP; dollars wait until the first job. After that, clicks also pay `clickPower × activeBoost.mult`. Idle $/s still starts at the first retainer.
- Money mode starts at the first cleared gig (or whenever money already exists, as with a forced balance).
- Skills cost XP and spending never lowers `xpTotal`. Skills and jobs cost XP; equipment and capital cost money. Repeatable items cost `floor(base × 1.15 ^ owned)`.
- `nextUnlock` is the one thing to chase across the whole game. It names the first skill that has not been bought yet, not a closed tab. Once every skill is owned, closed gates come first: Gear (10K XP), Gig Board, Job Board, then Capital. With every gate open it walks Gigs, Jobs, Gear, then Capital and stops at the first row that has not been bought yet. An earlier unlocked row that was never bought wins over a later row. The first copy is enough for repeatable gear, skills and capital. `needs` is never empty. With Senior's track held to rank 15 and no line picked, the Jobs panel's step is `lead:pick` ("Pick a leadership line"; `needs` lists the two names, `either` is true). With Mid-level SWE held and nothing picked, the Jobs panel's step is `spec:pick` ("Pick a specialization"; `needs` lists the six names, `either` is true), after the gigs and before gear and capital in the whole-game walk.
- The shop has no per-tab banner. A closed board shows its lock panel (what it still needs); the rest is the row's own lock. `getState().nextUnlock` is still the whole-game suggestion (`nextUnlock(progress)` in `src/game/nextUnlock.ts`).
- `spriteTierId` is the art id of the stage sprite: the highest owned capital tier, else the art of the furthest job, gig or skill. It is `1` before the first purchase. `era` is `early` until a capital tier is owned.
- The shop lists owned rows plus the next unowned row, even while that row is still locked. Skills cannot be bought until `xpTotal` reaches `unlockAtXp`. Gear and capital first copies wait until their reveal gate (held money, and a job for some gear). `buy(tierId)` still enforces the capital gate.
- `tick(ms)` advances idle time immediately, capped at 8 hours. It can also roll the normal boost clock. Skills keep studying (XP/s) in every phase, and held jobs that teach add to it.
- `forceBoost(mult, ms)` replaces the current click boost. Use this instead of waiting for a random roll. On screen a boost only turns the balance card (`HeroMoney`) the theme accent, gold at ×10 and up, with the multiplier and a time bar at its foot (`data-testid="hero-boost"`); there is no boost chip on the stage. Event multipliers (`foreverMult`, and each live `tempMults` entry with its seconds left) are lines under the balance on the same card (`HeroMods`, `data-testid="forever-mult"` and `temp-<target>`).
- `advanceOffline(ms)` writes `savedAt` that far in the past and rehydrates. Credit is idle × seconds, capped at 8 hours (`offlineCapHours`, longer with Time away gold skills), for both $ and XP. The toast is a sticky note on the desk: one diary sentence, a newline, then the credit (`credited $X`, `studied +X XP`, or both). The sentence follows the career (studying, a retainer, a job, senior, empire) and rotates once per hour away. The credit math is unchanged.
- `forceEvent(id)` opens a random event now (ids 1–128, `src/data/events.ts`) without applying it. Returns false for an unknown id. An open event is replaced, never stacked. `acceptEvent()` takes the deal and returns false when a trade's cost cannot be paid. `dismissEvent()` declines and changes nothing. `event` is the modal on screen, `lastEvent` is kept after either choice. Stakes are minutes of what you currently earn (idle, or half a click per second when that is higher), and at least 1% of the balance you hold. A gift only adds money or XP. A trade swaps one for the other. Nothing only deducts. Random events roll roughly every 240s from rows whose `eras` include `any` or the current era. Optional `requires` (job, gig, gear, specialization, leadership line) is AND across fields and OR inside a list; a row with no `requires` stays era-only. Ids 111–128 are a build's own (each specialization and both lines have some), and they only roll for a career that has picked it. Cash events (money gifts and every trade) wait until money exists. A loss never pushes money or spendable XP below 0, and lifetime XP never falls.
- `forceReview(promptId?)` opens a 1:1 for the highest job you hold (`src/data/reviews.ts`). It returns false with no job or when `promptId` is outside that job's band. Omit `promptId` to roll one. It replaces an open event or review without applying it. `answerReview("exceeds")` is a money gift (12 minutes). `answerReview("meets")` closes the meeting and changes nothing. `answerReview("pip")` trades money for XP (10 minutes) and returns false when that cost cannot be paid, leaving the meeting up. `dismissReview()` leaves without a reply. `review.replies[].lines` are the same `+$` / `-XP` strings as events; meets has none and shows no change. A 1:1 rolls about every 12 minutes, only once a job is held, and waits out an event or a meeting already on screen. If both clocks are due, the event wins and the 1:1 slips 5 seconds. A 1:1 that names a specialization or line (ids 14–21) is only in the pool of a career on it.
- `foreverMult` (permanent) and `tempMults` (timed, one per target) from events are already folded into `cps`, `clickPower`, `xpPerClick` and `xpPerSec`, so the formulas above still hold.
- Completing a gig pays its lump with a confetti burst on the stage and nothing else: no card, no centered pop, nothing to dismiss.
- The window bar across the top (`TitleBar`, `data-testid="titlebar"`) is for show: red, yellow and green lights that do nothing, and the game's name. The balance card shows the balance, the XP and the click rates; the status bar shows the idle rates (`StatusRates`: `per-sec`, `xp-per-sec`); every rate is at the top of the metrics modal (`useLiveRates`).
- Below 860 px the desk's status bar is not shown, so the idle rates are only in the metrics modal there. The emoji.gg credit is the last line of the settings menu at every width. Its controls (Sound, Click, Rosters, Theme) are in the settings menu (`EditorSettings.tsx`), and the settings gear carries a green mark while a new setting is unpicked. Picking a setting clears its mark.
- Theme changes cross-fade (`ideTheme.ts`, View Transitions, 220 ms; instant without the API or with reduced motion), and a hover preview only paints once the pointer rests on a row for `PREVIEW_REST_MS` (120 ms).
- The UI font is a preference like the theme (`src/game/uiFont.ts`, rows in `src/data/uiFonts.ts`; `setFont(id)` here). It paints `--font-display` and `--font-scale` on the root; the `--fs-*` type tokens carry the scale, so each face is sized to about the footprint of Chakra Petch. Chakra Petch is in the main CSS; the other four load their latin 500, 600 and 700 files on the first hover, focus or pick (or when the settings menu opens, so each row can show its own face). Metrics stay on the system mono stack in every face. `MOBILE_CHECK_FONT=all npm run check:mobile` plays every face.
- The desk behind the stage is an activity bar (the career log, GitHug, LinkedOut, Stats, the repo's star (not on a phone) and the settings gear at its foot; on the bare desk, before the bar shows, the gear is in the stage's top-right corner), the career log sidebar and a status bar. The status bar names the band the career is in (High school to Mars, by stage art id, `src/data/idePacks.ts`). `previewEra(era)` shows that era's first band there with a PREVIEW chip, the way the shop's Capital era tab does; `previewEra(null)` or 20s without interaction (`tick`) snaps back, as does buying into a new era. The snapshot has no field for it; read `data-preview` on `[data-testid='ide']`.
- One tab plays at a time (`src/game/openGame.ts`): the first holds the `tech-ascension-writer` Web Lock. A second tab shows "open in another tab" with Play here, which asks the playing tab over a BroadcastChannel to save once more and stop writing (`handOffCareer`), then boots with that save; the old tab reloads into the same screen. A tab that does not answer in 4 s has its lock stolen. A waiting tab also starts by itself when the playing tab closes. `__GAME__` exists only in the tab that plays.
- On the first career, before the first click, a "Click me" chip (`Tap me` on a touch screen) beside the stage art points at it (`data-testid="first-click"`); it is gone once lifetime XP is above 0.
- A save from any other `version` is wiped on load. There is no migration.
- `lastPop` is the last Balatro money pop: `medium` on a paying click, `large` on a gig clear and a phase unlock.
- `reset()` wipes the save back to high school.
- **Career timeline** (table in `src/data/features.ts`, gates in `src/game/features.ts`, journal in `src/game/careerLog.ts`, wiring in `src/game/careerSync.ts`). The desk is earned: a new career has XP and the Skills tab. the first job (the internship) brings the metrics and the desk cat, Git + GitHug hygiene (5) the career log and the GitHug profile (a contribution graph from the journal, pinned repos, and the real repo's Star pill, which stays off screen until then), Portfolio site live (15) LinkedOut, the first 10x dev row in reach the 10x dev tab, 10K XP the Gear tab, the first dollar the $ counters (`$/click` shows once a job pays it), the first gig the rosters, the first job the metrics, the Thocky keyboard click sounds, the Drawing tablet editor themes, a hover skill hover click, the headset music, the first capital row of the mid era the gif parade (with all of its paths and categories). Editor themes, click sounds and music styles keep unlocking with stage art tiers (from the Internship band on), desk gear and capital eras. Each unlock is logged, marked NEW until used (`seeFeature`), and queued to reveal (`clearReveals` drops the queue); four or more at once, or any during a return, play only the loudest. Closed shop boards are hidden except the next one. Gates read progress, so forced progress (`forceGig`, `setXp`) unlocks what it reaches. `advanceOffline` past 10 minutes is a return: it logs one and brings the cat. Every step of the career (skills, gigs, jobs, first copies, boards, eras, perks, unlocks, returns, events, 1:1s, milestones) is a journal entry, printed as JSON lines by `careerLog()`. Admin mode shows the whole desk.
- **Identity** (`src/game/identity.ts`, start card in `src/components/IdentityPicker.tsx`). Every new career (a fresh save or `reset()`) draws a Tailscale-style handle (`quiet-otter`) and opens a start card: the handle, a Reroll, and Start, which keeps it for good (`keepProfile()` clears the card). There is no real name; GitHug and LinkedOut (`linkedout.com/in/<handle>`) both go by the handle. Nothing is ever typed. It is saved in an optional `profile` block with `chosen`; a save is only accepted with a handle the lists can draw. An Exit keeps the handle and the choice of it. A test scans all 1,024 handles, as shown and run together, for slurs and slang.

