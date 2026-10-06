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
- **10x dev skills** (called gold in the code). Ten one-off perks (`src/data/gold.ts`, rules in `src/game/gold.ts`) that bend the rules instead of adding income. They have their own "10x dev" sub-tab inside the Skills tab (next to "Skills", it appears once the first one is in reach), each row with a trophy and a one-line description, and cost spendable XP (a quarter of the lifetime XP that opens them, then the 2x scale). A row opens at its lifetime-XP milestone and waits on the earlier row of its family. Three families: **Buying** (Bulk Buy ×5 at 8,000 XP, ×10 at 60,000, Max at 600,000), **Hover clicking** (2, 5, 10 and 15 clicks a second from 20,000 XP up; owning every catalog row still grants 20/s), and **Time away** (the offline cap grows from 8 to 12, 16 and 24 hours).
- **Buy amount.** Without a Buying gold skill every purchase is one copy and the rows show a single button. Each Buying skill adds an amount to the Buy control above the Skills, Gear and Capital lists (×1, ×5, ×10, Max). A row then buys up to that many copies, fewer when the budget runs out first. The store enforces this: a request above what is unlocked buys the largest unlocked amount.
- **Offline.** Coming back credits idle $ and idle XP for up to 8 hours (more with the Time away gold skills) and toasts `welcome back, credited $X`. Time away past the cap pays nothing, which is what sets how long the game takes for someone who visits once a day: see [PACING.md](PACING.md).

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

## Hackathon (weekend card run)

A Balatro-style roguelike run played with your own career. Every skill you hold is a card. Table: `src/data/hackathon.ts`. Rules: `src/game/hackathon.ts`, with the unlock and prizes in `src/game/hackathonEconomy.ts`. Overlay: `src/components/Hackathon.tsx`.

- **Opening.** Hackathons open with the Gig Board, once you hold 12 skills, and stay open after the first run. The medal in the editor's activity bar opens the overlay; its dot is green while registration is open, peach while a run waits and mauve when results wait. Until the first run, a toast says registration is open once a session, and clicking it opens the overlay.
- **Cards.** A card's suit is its stack: Frontend, Backend, Ops, Data & AI or Craft, each with its theme color and icon (`SKILL_STACK` puts all 104 skills in one). Its chips are `3 + 2 × tier + 3 × (level − 1)`: the tier is the skill's band of 13 rows (1 to 8), and the level is `1 + floor(log2(copies))`, up to 5. Later skills and more copies make a stronger deck. The deck is frozen at registration.
- **A weekend.** Three rounds: Friday kickoff, Saturday crunch and Sunday demo. Each deals 7 cards with 4 ships and 3 refactors. A ship is 1 to 5 cards. A refactor tosses 1 to 5 and draws as many. When the draw pile runs dry, the shipped and tossed cards shuffle back in. The round ends the moment its target falls. Running out of ships below it ends the run.
- **Hands.** A ship is read by stack, and only the cards that form the hand score. Selected cards outside it are kickers: they leave your hand and score nothing, and the table dims them before you ship.

  | Hand | Stacks | Chips × mult |
  | --- | --- | --- |
  | Specialist | five from one stack | 60 × 5 |
  | Platform team | four from one stack | 50 × 4 |
  | Full stack | one from each of the five stacks | 40 × 4 |
  | Tiger team | three from one stack, two from another | 35 × 3 |
  | Squad | three from one stack | 30 × 3 |
  | Code review | two pairs | 20 × 2 |
  | Pair programming | two from one stack | 10 × 2 |
  | Hotfix | your best single card | 5 × 1 |

  Score = (hand chips + each scoring card's chips) × hand mult, after swag.
- **Swag.** Before each round you take one of three sponsor perks (20 in the table, rare ones a third as likely), three per run: flat chips or mult, mult per card of a stack, chips per card, extra ships, refactors or hand size, and multipliers for a hand type, the first or last ship, small ships, distinct stacks or cards held. Swag that fires on a card applies with that card. Flat swag applies next, then multiplying swag, each in slot order.
- **Sunday's judge.** Drawn at registration and shown from the first draft, so you can plan around it. One of nine: five mute a stack (its cards still form hands but score nothing), the VC raises Sunday's target 1.5×, the CTO deals one card fewer, the Staff Engineer takes the refactors, and the PM scores each hand type once.
- **Targets and leagues.** Campus targets are 500, 800 and 1,300. Each league multiplies them by 1.5, rounded to two figures. Winning Sunday moves you up a league (Campus, City, National, Global, Orbital, then Orbital +1 and up); a loss keeps your league.
- **Prizes.** Each round won pays at once, priced like an event from what you earn now: Friday 3 minutes of XP, Saturday 5 and Sunday 8 minutes of money, at least 1% of the balance held. Money prizes pay XP until money exists. Prizes grow a quarter per league, up to ×2 at Orbital.
- **Cooldown.** Registration reopens 20 minutes after a run ends, won or lost. A run in progress waits as long as you like: close the overlay and it is there when you come back, saved card by card.
- **Feel.** Each ship replays as a scoring cascade: the hand's base, each card's chips and the swag it fires, then flat and multiplying swag, the total landing, and the round score counting up, with a rising tick per beat (the click or desk sounds switch). A click or Space skips it. `prefers-reduced-motion` skips it too.
- **Keys.** `1`-`9` pick cards, `Enter` ships, `R` refactors, `S` sorts by stack or chips, `H` shows the hands, `1`-`3` take swag, `Esc` closes.
- **Quiet while you play.** Random events and 1:1s wait while the overlay is open, and hover clicking pauses.

Through `__GAME__`: `getState().hackathon`, `openHackathon()`, `startHackathon(seed?)`, `forceHackathon(seed?)`, `hackPick(slot)`, `hackShip(indices)`, `hackRefactor(indices)`, `hackPreview(indices)`, `hackSort(sort)`, `finishHackathon()`.
