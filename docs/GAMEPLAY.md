# Gameplay

The economy is phase-gated. Numbers live in `src/data/phases.ts` (skills, gigs, jobs, gates), `src/data/gear.ts` and `src/data/capital.ts`. Every repeatable item costs `floor(base × 1.15 ^ owned)`.

| Phase | Pays in | You buy | Opens when |
| --- | --- | --- | --- |
| **A Skill grind** | XP per click, no $/s | 104 skills (XP/click, XP/s). The used laptop is 90 XP; the ones after it take a lot of clicks | start |
| **B Gigs** | first $ | 65 gigs: lump $ on clear, some add a retainer $/s | 14,000 lifetime XP and Portfolio (#15) + React (#16) owned |
| **C Jobs** | salary $/s, and XP/s on some | 31 jobs (held once) | 40,000 lifetime XP and 6 gigs cleared; twelve jobs also need a passed whiteboard interview |
| **Gear** (shop tab, not a phase) | click bonus, $/s | 110 repeatable infra items (desk, Pi lab, GPUs, racks, cloud, Mars) | 10,000 lifetime XP. A row then shows once you have held its `unlockMoney` and, on later rows, its job |
| **D Capital** | heavy $/s | 25 rows, angel syndicate to Mars Holdings | the Senior job (id >= 14) OR $500,000 held at some point |

## The rules

- **Clicks.** Every click pays XP (`1 + skills`). Dollars wait until the first job; after that a click also pays `$1 + equipment, capital and job click bonuses`, plus a share of your $/s from the jobs you hold. Both numbers fall from the cursor. There is no $/s until a retainer gig. Boosts multiply both click payouts and leave idle income alone.
- **XP.** Skills cost XP, so spending lowers the balance, but gates and job requirements read lifetime XP (`xpTotal`) and never go down. Skills keep studying (XP/s) in every phase, including offline.
- **XP from jobs.** XP gates sit behind every job, so a job can teach as well as pay. Twelve of the 31 grant idle XP/s on top of their salary (`xpPerSec` in `src/data/phases.ts`): the internship, Junior SWE, the mentor buddy, code review skills, the on-call rotation and system design study early on, then Staff, Principal, Distinguished, Fellow, Chief Scientist and Lab director. The rest only pay. It counts offline too, and event multipliers on idle XP apply to it. Eleven jobs also pay a lump of XP once, the moment you take them (`xpLump`): the internship, the mentor buddy, code review skills, the QA rotation, on-call, system design study, the acting tech lead, Staff, Principal, Fellow and Lab director. The lump adds to both spendable and lifetime XP, so it can carry you past the next job's XP gate. Some jobs have both, some only one, and the rest neither.
- **Gigs** clear once. Each one needs every earlier gig and a skill combination that grows by one skill (gig 1 needs the first six), capped at the skill table. Gig 8 (site maintenance retainer) is the first idle money.
- **Click boosts** (`×3` / `×5` / `×10`) multiply **click payout only**. Idle income is unchanged. One boost at a time; the next roll replaces the slot after the current one ends. Waits are longer than the old 45s–360s table (early mean 75s, end mean 480s). A toast, a chip over the sprite, a rim light circling the art and the metrics strip show the multiplier while it runs. At ×10 (any multiplier of 8 or more) that chrome turns gold.
- **10x dev skills** (called gold in the code). Ten one-off perks (`src/data/gold.ts`, rules in `src/game/gold.ts`) that bend the rules instead of adding income. They have their own "10x dev" sub-tab inside the Skills tab (next to "Skills", it appears once the first one is in reach), each row with a trophy and a one-line description, and cost spendable XP (a quarter of the lifetime XP that opens them, then the purchase scale). A row opens at its lifetime-XP milestone and waits on the earlier row of its family. Three families: **Buying** (Bulk Buy ×5 at 8,000 XP, ×10 at 60,000, Max at 600,000), **Hover clicking** (2, 5, 10 and 15 clicks a second from 20,000 XP up; owning every catalog row still grants 20/s), and **Time away** (the offline cap grows from 8 to 12, 16 and 24 hours).
- **Buy amount.** Without a Buying gold skill every purchase is one copy and the rows show a single button. Each Buying skill adds an amount to the Buy control above the Skills, Gear and Capital lists (×1, ×5, ×10, Max). A row then buys up to that many copies, fewer when the budget runs out first. The store enforces this: a request above what is unlocked buys the largest unlocked amount.
- **Offline.** Coming back credits idle $ and idle XP for up to 8 hours (more with the Time away gold skills) and toasts `welcome back, credited $X`. Time away past the cap pays nothing, which is what sets how long the game takes for someone who visits once a day: see [PACING.md](PACING.md).

- **Whiteboard interviews.** Twelve jobs, from the internship to Fellow, need a passed system design interview on top of their lifetime XP (`src/data/studio/challenges.ts`, rules in `src/game/studio/interviews.ts`). Once lifetime XP reaches the job's requirement the row reads "Interview" instead of its price. Each submission is judged once: a Hire or Strong hire opens the job for good, and a No hire costs 5% of the job's lifetime XP requirement in spendable XP (never below 0, and lifetime XP never falls), and keeps the design for the next try. Holding a gated job counts its interview, and every interview below it, as passed. The other nineteen jobs keep their old gates.

## Shop

Five tabs: Skills, Gigs, Jobs (roles only), Gear (repeatable infra, grouped by kind), Capital (with era sub-tabs). Gear opens at 10,000 lifetime XP, ahead of the Gig Board, because its first rows cost a few hundred dollars. Closed boards stay out of the tab bar until they are the next one to open; that one waits there dimmed and, when picked, shows what it needs, with the requirements ticking off. A newly opened phase takes over the tab (Gear never does, it is not a phase). Each list shows what you own plus the next thing you do not, even while that next row is still locked. New rows carry a `New` tag.

**No bars.** A locked row says what it is waiting on in words (`More lifetime XP`, `More skills`, `A bigger balance`, `the Senior SWE job`), never how much is left, and there is no progress bar anywhere: knowing the exact gap turns the game into watching a number, and the loop is to click, shop and leave. A locked row's button reads "Locked" instead of a price, so an XP price is never mistaken for the lifetime XP that opens the row; the price appears once the row is open, and a row you can afford lights up. Switching to a tab scrolls its list to the bottom, where the newest rows are.

**Next banner.** Every panel has its own slim bar under the tabs, and it speaks only for that panel. A closed panel names its board and what is missing (`Job Board - need more XP · more gigs`). An open panel names its first row you have not bought yet and what that takes (`to buy it`, or `more money` / `more XP` when short). A panel with nothing left says so (`Every skill learned`). The first copy is enough for repeatable gear, skills and capital, and an earlier unlocked row is never skipped for a later one. Clicking the bar takes you to the thing it names, which can be on another tab: the Gig Board asks for a skill, so its bar jumps to that skill.

The logic is `nextUnlock(progress, tab)` in `src/game/nextUnlock.ts`. Without a `tab` it gives the single next thing across the whole game (skills first, then closed boards, then each catalog in order), and that is what `__GAME__.getState().nextUnlock` returns.

## Career timeline

The desk is earned, not handed over. A new career starts with the XP counter and the Skills tab; everything else arrives at a career moment that explains it. The table is `src/data/features.ts` (a drop-in file), the gates are `src/game/features.ts`. Times are for a player clicking twice a second.

| When | What appears | Trigger | Reveal |
| --- | --- | --- | --- |
| 45 s | The studio: the activity bar and the status bar (the interview whiteboard lands here later) | Used laptop (skill 1): its first copy is 90 XP | big |
| 7 min | Career log (the Git icon) | Git + GitHug hygiene (skill 10) | big |
| 7 min | GitHug profile, and the star for the real repo | Git + GitHug hygiene (skill 10) | standard |
| 8 min | LinkedOut profile | Portfolio site live (skill 15) | standard |
| 8 min | 10x dev skills | the first 10x dev row in reach (8,000 lifetime XP) | standard |
| 8 min | Gear tab | 10,000 lifetime XP | standard |
| 9 min | Gig Board | its gate | the phase pop |
| 9 min | Dollars: the $ counters | the first dollar | small |
| 9 min | Rosters | the first gig | standard |
| 10 min | Job Board | its gate | the phase pop |
| 10 min | Metrics | the first job | standard |
| 10 min | Click sounds, editor themes | Thocky keyboard, Drawing tablet (UI) | small |
| on a 10x dev skill | Hover click | a hover skill (or every catalog row) | standard |
| 15 min | Desk cat | 15 minutes at the desk (clicking, idling or with the tab in the background), or sooner on a return after a break (10 minutes away) | big |
| ~28 min | Music | Noise-cancelling headset | standard |
| second visit | Capital | its gate | the phase pop |

Cosmetics keep coming after that: a new editor theme with each new stage band from the Internship band on (stage art tiers 19, 23, 27, 31, 34, 37 and 50) (Catppuccin Mocha and Latte are there from the start), a click sound with the Vertical mouse, Ergo chair and Split ergo keyboard, and a music style with the mid, upper and end eras. A cosmetic that opens before its picker arrives with the picker. Pickers list what the career has earned plus whatever is in use; a choice from an earlier run stays usable. Music only plays once the headset is bought.

**How an unlock is shown.** Every row goes through the same four steps.

1. **Before.** The shop row that opens something carries a small green badge wearing that feature's icon (hover or focus it for `Unlocks Career log` and what it does), and the Next banner, which has room, prints the name beside the icon. The next closed row with a place on screen stands there as a dim dashed outline with a lock and a ring that fills as it gets close; hover or focus says what opens it. One outline at a time. Closed boards are hidden from the tab bar, except the next one, which waits there dimmed.
2. **The moment.** `big`: the UNLOCKED slam, confetti and a chime, then a card. `standard`: the thing lights up where it lives and a card beside it says what it does, with a button that opens it ("Try it", "Open it"). `small`: a toast and a glow. Cards never take focus or cover the stage, and tuck away after 8 seconds (Esc closes them).
3. **After.** A green NEW dot or pill stays on the thing until it is used once. Inside a menu, the menu's button carries it too.
4. **Remember.** Every unlock is a line in the career log.

Reveals play one at a time, wait for events, 1:1s and money pops, and leave a short gap between them (longer after a card that timed out). A batch of four or more (an admin grant, a test jump) and anything that opens during a return play only the loudest; the rest keep their NEW markers. Unlocks earned while away are listed on the sticky note. Admin mode shows the whole desk.

**GitHug profile.** The GitHug button in the corner opens a parody GitHub profile built from the career itself (`src/game/githug.ts`). It goes by the career's handle: a new career draws a Tailscale-style one (`quiet-otter`) from an adjective list and an animal list (`src/game/identity.ts`), and there is no real name anywhere. A start card shows it: Reroll draws another, and Start keeps it for the rest of the career. Handles are never typed, and a test scans every handle the lists can draw for slurs and slang. LinkedOut goes by the same handle, at `linkedout.com/in/<handle>`. Below that, a contribution graph of 26 columns of five squares, spanning the modal's full width. A square is a run of eight contributing career steps, not a calendar day, so the graph fills with progress and the empty squares at the end are what is left to do. Each logged skill, gig, job, first copy and perk counts as a step; each square is shaded against your busiest one (the numbers on its repo lines are made up, between 1 and 50, and steady for a given square), and hovering one reads like GitHub: `3 contributions in til`, one line per public repo, and a lock icon with `private repositories` for the rest (jobs and capital are private; skills, gigs, gear and perks go to public repos). Then the count of filled squares, followers, repos and stars that all keep growing with the career (jobs and capital rows each add a private repo and followers, and stars scale with lifetime XP), and four pinned repos (`hello-world`, `dotfiles`, `til` and `portfolio` from skills, then one per cleared gig, newest first). Its footer, and the Star pill beside the button, link to the real repo; neither is on screen before the unlock.

**Career log.** The Git icon opens and closes the career log sidebar: Up next (the next three closed rows, each with a short phrase for what it needs and no bar; the cat shows as `???`), then the history, newest on top, one line per step: skills learned, gigs cleared, jobs taken, gear and capital first bought, boards and eras opened, 10x dev skills claimed, unlocks, returns, events, 1:1s and whiteboard interviews, and the joke milestones. The journal keeps the newest 2,000 entries in the save.

**JSON journal.** `__GAME__.careerLog()` prints the same journal as JSON lines, one flat object per step (`seq`, `time`, `type`, `ref`, `name`, extras like `awayMs` or `accepted`, then `money` and `xpTotal`). Through `__GAME__`: `getState().features`, `getState().careerLog`, `careerLog()`, `seeFeature(id)`, `clearReveals()`.

## Stage

The stage shows the highest capital tier you own, else the furthest job, gig or skill, in pixel art, in front of the desk: an activity bar, the career log sidebar and a status bar that names the career's band (see [ART.md](ART.md)). Before the first purchase it shows the opening attic scene (art 0) and the stage name stays High school. Buying a new top item plays a reveal burst.

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

**How to play.** The first thing in the settings menu is a How to play button. It opens a short, friendly rundown (click for XP, skills open gigs, gigs open jobs, gear and capital, time away, trophies) and tells the player how they will know they are done: the last trophy is Sabbatical, the final 10x dev skill, and until they own it they keep clicking.
