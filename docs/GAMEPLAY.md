# Gameplay

The economy is phase-gated. Numbers live in `src/data/phases.ts` (skills, gigs, jobs, gates), `src/data/gear.ts` and `src/data/capital.ts`. Every repeatable item costs `floor(base × 1.15 ^ owned)`.

| Phase | Pays in | You buy | Opens when |
| --- | --- | --- | --- |
| **A Skill grind** | XP per click, no $/s | 104 skills (XP/click, XP/s). Early ones take a lot of clicks | start |
| **B Gigs** | first $ | 65 gigs: lump $ on clear, some add a retainer $/s | 14,000 lifetime XP and Portfolio (#15) + React (#16) owned |
| **C Jobs** | salary $/s, and XP/s on some | 31 jobs (held once) | 40,000 lifetime XP and 6 gigs cleared |
| **Gear** (shop tab, not a phase) | click bonus, $/s | 110 repeatable infra items (desk, Pi lab, GPUs, racks, cloud, Mars) | 10,000 lifetime XP. A row then shows once you have held its `unlockMoney` and, on later rows, its job |
| **D Capital** | heavy $/s | 25 rows, angel syndicate to Mars Holdings | the Senior job (id >= 14) OR $500,000 held at some point |

## The rules

- **Clicks.** Every click pays XP (`1 + skills`). Dollars wait until the first job; after that a click also pays `$1 + equipment, capital and job click bonuses`, plus a share of your $/s from the jobs you hold. Both numbers fall from the cursor. There is no $/s until a retainer gig. Boosts multiply both click payouts and leave idle income alone.
- **XP.** Skills cost XP, so spending lowers the balance, but gates and job requirements read lifetime XP (`xpTotal`) and never go down. Skills keep studying (XP/s) in every phase, including offline.
- **XP from jobs.** XP gates sit behind every job, so a job can teach as well as pay. Twelve of the 31 grant idle XP/s on top of their salary (`xpPerSec` in `src/data/phases.ts`): the internship, Junior SWE, the mentor buddy, code review skills, the on-call rotation and system design study early on, then Staff, Principal, Distinguished, Fellow, Chief Scientist and Lab director. The rest only pay. It counts offline too, and event multipliers on idle XP apply to it. Eleven jobs also pay a lump of XP once, the moment you take them (`xpLump`): the internship, the mentor buddy, code review skills, the QA rotation, on-call, system design study, the acting tech lead, Staff, Principal, Fellow and Lab director. The lump adds to both spendable and lifetime XP, so it can carry you past the next job's XP gate. Some jobs have both, some only one, and the rest neither.
- **Gigs** clear once. Each one needs every earlier gig and a skill combination that grows by one skill (gig 1 needs the first six), capped at the skill table. Gig 8 (site maintenance retainer) is the first idle money.
- **Click boosts** (`×3` / `×5` / `×10`) multiply **click payout only**. Idle income is unchanged. One boost at a time; the next roll replaces the slot after the current one ends. Waits are longer than the old 45s–360s table (early mean 75s, end mean 480s). A toast, a chip over the sprite, a rim light circling the art and the metrics strip show the multiplier while it runs. At ×10 (any multiplier of 8 or more) that chrome turns gold.
- **Offline.** Coming back credits idle $ and idle XP for up to 8 hours and toasts `welcome back, credited $X`. Time away past the cap pays nothing, which is what sets how long the game takes for someone who visits once a day: see [PACING.md](PACING.md).

## Shop

Five tabs: Skills, Gigs, Jobs (roles only), Gear (repeatable infra, grouped by kind), Capital (with era sub-tabs). Gear opens at 10,000 lifetime XP, ahead of the Gig Board, because its first rows cost a few hundred dollars. A locked tab shows what it needs, with the requirements ticking off. A newly opened phase takes over the tab (Gear never does, it is not a phase). Each list shows what you own plus the next thing you do not, even while that next row is still locked. New rows carry a `New` tag.

**Bars.** A locked row has a bar along its bottom edge that says where the lock stands, for example `1,200 / 6,000 lifetime XP`, with the percentage on the right. When a row has several requirements (lifetime XP, earlier gigs, skills, a balance, a job) the bar tracks the one furthest from done. Once the row is open but you cannot pay for it yet, the bar turns into the money bar (`$10 / $1,000`, `$990 to go`). Switching to a tab scrolls its list to the bottom, where the newest rows are.

**Next banner.** Every panel has its own slim bar under the tabs, and it speaks only for that panel. A closed panel names its board and what is missing (`Job Board - need 15,000 more XP · 2 more gigs`). An open panel names its first row you have not bought yet and what that takes (`to buy it`, or the cash or XP still short). A panel with nothing left says so (`Every skill learned`). The first copy is enough for repeatable gear, skills and capital, and an earlier unlocked row is never skipped for a later one. Clicking the bar takes you to the thing it names, which can be on another tab: the Gig Board asks for a skill, so its bar jumps to that skill.

The logic is `nextUnlock(progress, tab)` in `src/game/nextUnlock.ts`. Without a `tab` it gives the single next thing across the whole game (skills first, then closed boards, then each catalog in order), and that is what `__GAME__.getState().nextUnlock` returns.

## Stage

The stage shows the highest capital tier you own, else the furthest job, gig or skill, in pixel art, in front of a fixed Catppuccin Mocha IDE whose editor buffer changes with progress (see [ART.md](ART.md)). Before the first purchase it shows the opening attic scene (art 0) and the stage name stays High school. Buying a new top item plays a reveal burst.

## Money pops (Balatro feel)

- **Raw digits first.** `formatNumber` keeps whole numbers as raw digits with separators (`1,234,567`) up to 9,999,999, then abbreviates (`10M`, `1.5B`, ... `Qa`). The hero balance has more room and keeps its digits up to $999,999,999,999 (`HERO_RAW_DIGITS_BELOW`), shrinking the font a notch once it is long. `formatNumber(v, 1000)` / `formatCompact` give the old tight K/M form.
- **Medium on a click** once money exists: the hero total squashes and rebounds (about 190ms).
- **Large** on a gig clear and a phase unlock: a centered slam-in pop (`+$1,200`, `Gig cleared`) with a chromatic red/cyan split that converges, a bigger squash on the hero total, a count-up of the running total that overshoots then settles, plus the confetti burst and ring.
- **Never per idle tick.** Idle income just moves the number. `prefers-reduced-motion` turns the pops into a plain fade.
- The pop kinds are `MONEY_POP` in `src/data/phases.ts`; the last one is exposed as `__GAME__.getState().lastPop`.

## Random events

`src/data/events.ts` is a drop-in table (id, name, eras, weight, offer, flavor, optional `requires`); `src/game/events.ts` prices the offer and runs the clock. Roughly every 240 seconds (clamped exponential) one event rolls from the rows whose `eras` include `any` or the player's era, weighted, and opens a Yes / No modal. Nothing applies until Yes. No, Escape, and the backdrop decline.

- A gift only adds money or XP. A trade swaps one for the other. No row only deducts.
- The amount is minutes of what you earn right now (idle income, or half a click per second when that is higher) and at least 1% of the balance you hold, so a large pile is never nicked for a flat handful of XP.
- `requires` is optional: fields AND together, and a list matches if the player holds any one id (job, cleared gig, or owned gear). A row with no `requires` is era-only.
- Cash events (money gifts and every trade) wait until money exists. A loss never pushes money or spendable XP below 0, and lifetime XP never falls.
- Events never overlap. A due one waits behind an open modal or 1:1 and fires 5 seconds after.

Through `__GAME__`: `forceEvent(id)`, `acceptEvent()`, `dismissEvent()`.
