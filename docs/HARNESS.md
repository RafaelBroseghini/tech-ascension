# Harness API and mechanics

`window.__GAME__` (`src/game/harness.ts`) is how agents and tests drive the game. The state shape is the `GameSnapshot` type in that file; read it there. This page says what the methods are for and the rules an agent gets wrong without knowing them. Numbers live in the data modules, not here. How to play and check the UI is in [AGENT_PLAY.md](AGENT_PLAY.md).

## Methods

**Read and play.** They enforce the gates.

- `getState()`: the snapshot.
- `click()`: one click. Returns `{ money, xp }`.
- `buy(id)`, `buySkill(id)`, `buyEquipment(id)`, `buyJob(id)`, `buyGold(id)`, `completeGig(id)`: take or buy one copy. False when refused. There is no amount argument; every purchase is one copy.
- `pickSpecialization(id)`, `switchSpecialization(id)`, `pickLeadership(id)`: the build picks (see below).
- `explain(ref)`: why a row is open or shut. Refs are `gig:3`, `job:14`, `skill:15`, `gear:42`, `capital:3`, `board:jobs`, `pick:spec`, `gold:2`. `npm run tree -- job:14` prints the same from the shell.
- `tick(ms)`, `advanceOffline(ms)`: idle time, and time away (which writes `savedAt` that far back and rehydrates).
- `acceptEvent()`, `dismissEvent()`, `answerReview(choice)`, `dismissReview()`: answer the open modal.
- `exit()`, `buyLegacy(perkId)`: the Exit and Legacy perks.
- `careerLog()`, `seeFeature(id)`, `clearReveals()`, `rerollProfile()`, `keepProfile()`, `reset()`, `setFont(id)`.

**Force.** These skip the gates. Tests and checks only.

- `setXp`, `setMoney`, `setPrestige`, `forceGig`, `forceGold`, `forceBoost`, `forceEvent`, `forceReview`, `forceCats`, `forceCelebration`.

**Preview.** `previewEra(era)` shows an era's first stage band with a PREVIEW chip; `previewEra(null)` snaps back.

## Reading the state

- `xp` is spendable. `xpTotal` is lifetime, and every gate reads it. Spending never lowers `xpTotal`.
- `cps` is idle $/s. `clickPower` is the base click payout. `clickShare` is the manual click's share of idle. `hoverRate` is 0 until a hover 10x dev skill (or every catalog row) is owned.
- `nextUnlock` is the whole-game suggestion, for agents. No screen shows it. The shop shows a closed board's lock panel, and the career log has Up next.
- `unlocks.gear` is on at lifetime XP or once any gear is owned. Gear does not wait for a board.
- `era` stays `early` until a capital row is owned.
- `event` and `review` are the modal on screen. `lastEvent` and `lastReview` are kept after the choice.
- `lastPop` is the last money pop. It is `medium` on a paying click and `large` on a gig clear and on an unlock.

## Rules an agent gets wrong

- **Phases.** A: skills, paid in XP. B: gigs. C: jobs. D: capital. Gear is a shop tab, not a phase. The gates and prices are in `src/data/phases.ts`, `src/data/gear.ts` and `src/data/capital.ts`; the opening's head start is in `src/data/costs.ts`. Read a price from the data module (`PURCHASE_COST_SCALE` applies to every purchase). Never type one into a test or a doc.
- **Latching.** Owning what a gate leads to keeps it open. The capital gate also latches on peak money, so spending the money later does not close it.
- **Builds.** The specialization is picked once, at Mid-level SWE. Every job above rank 7 needs it, and a track row needs its own track. Senior SWE asks for the leadership pick, made once; every job above rank 15 needs a line. The other tracks and lines are hidden and refused. The one switch keeps money and gear and drops the old track's jobs. Track ids and rules: `src/data/specializations.ts`, `src/data/leadership.ts`, `src/game/build.ts`.
- **Click builds.** A click build's manual click is worth more than a plain click, and hover and auto clicks are not. An idle build earns more idle and less from clicks. The multipliers are in `src/game/build.ts` with their reasons.
- **Clicks.** Every click pays XP. Dollars wait for the first job. After that a click also pays dollars, and a boost multiplies those payouts.
- **Boosts.** A boost multiplies click payout only; idle income is never touched. One at a time. The balance card takes the boost's accent (gold at high multipliers, `GOLD_MULT_THRESHOLD`) with a time bar. There is no toast and no chip on the sprite.
- **Events.** They roll on average every `EVENT_MEAN_WAIT_MS`, never stacking, and a due one waits behind an open modal or a 1:1. The stake is minutes of what you earn now, and at least `EVENT_PILE_SHARE` of the balance. Gifts only add. Trades swap one for the other. Nothing deducts only, and a loss never takes money or spendable XP below zero.
- **1:1s.** They roll on average every `REVIEW_MEAN_WAIT_MS`, once a job is held. If an event and a 1:1 are both due, the event goes first.
- **Kitchen (combos).** A combo is found when both of its ingredients are held, and journaled once. Each effect is a few percent on idle $/s, click, or idle XP/s, added together and capped per kind (`COMBO_CAP_PCT`). There is no kitchen panel yet; read `getState().combos`.
- **Offline.** Credit is idle income times the time away, up to the offline cap. Click boosts do not count offline. Events do, for the part of the gap they covered. A return after `RETURN_BREAK_MS` is journaled.
- **Career timeline.** Each unlock is journaled and marked NEW until it is used (`seeFeature`). Unlocks do not pop a card. Reveals drain from the queue without a card; a big unlock or a phase opening raises the large money pop and the stage celebration. Rows and their triggers are in `src/data/features.ts`.
- **Exit.** The Exit and its UI are admin mode only (`getAdminMode`). The harness works regardless. The rules are in [PRESTIGE.md](PRESTIGE.md).
- **Save.** A save of any version other than `SAVE_VERSION` is wiped on load. See [SAVE.md](SAVE.md).
- **One tab.** One tab plays at a time (a Web Lock). `__GAME__` exists only in the tab that plays.
- **Identity.** A new career draws a handle and shows the start card until `keepProfile()`. Handles are never typed.
- **Theme.** A theme changes with a cross-fade only on touch screens, and not under reduced motion. On hover-capable pointers it snaps: the fade's hit testing ends a hover.
