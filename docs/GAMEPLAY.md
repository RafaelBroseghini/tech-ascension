# Gameplay

The economy is phase-gated. Numbers live in `src/data/phases.ts` (skills, gigs, jobs, gates), `src/data/gear.ts` and `src/data/capital.ts`. Every repeatable item costs `floor(base × 1.15 ^ owned)`. **The opening is brought forward, not squeezed**: every gig asks for 9,900 XP less than the table writes (`openingGigXp` in `src/data/costs.ts`), so the Gig Board opens about three minutes in and a new gig follows every dozen seconds or so as before; the first seven job ranks follow a hand-set staircase (`openingJobXp`, one rank every 15 to 30 seconds), and the XP lumps on those rows shrink with it. Scaling every gate down instead packs the early gigs into seconds and reads as everything unlocking at once. A player who follows the Next banner opens the Gig Board about 3 minutes in and the Job Board about 4 and a half (`docs/PACING.md`).

| Phase | Pays in | You buy | Opens when |
| --- | --- | --- | --- |
| **A Skill grind** | XP per click, no $/s | 104 skills (XP/click, XP/s). The used laptop is 90 XP; the ones after it take a lot of clicks | start |
| **B Gigs** | first $ | 65 gigs: lump $ on clear, some add a retainer $/s | `openingGigXp(14,000)` lifetime XP and Portfolio (#15) + React (#16) owned |
| **C Jobs** | salary $/s, and XP/s on some | 31 jobs (held once) | `openingJobXp(40,000)` lifetime XP and 6 gigs cleared |
| **Gear** (shop tab, not a phase) | click bonus, $/s | 110 repeatable infra items (desk, Pi lab, GPUs, racks, cloud, Mars) | `GEAR_TAB_UNLOCK` lifetime XP (opens ahead of the Gig Board). A row then shows once you have held its `unlockMoney` and, on later rows, its job |
| **D Capital** | heavy $/s | 25 rows, angel syndicate to Mars Holdings | the Senior job (id >= 14) OR $500,000 held at some point |

## The rules

- **Clicks.** Every click pays XP (`1 + skills`). Dollars wait until the first job; after that a click also pays `$1 + equipment, capital and job click bonuses`, plus a share of your $/s from the jobs you hold. Both numbers fall from the cursor. There is no $/s until a retainer gig. Boosts multiply both click payouts and leave idle income alone.
- **XP.** Skills cost XP, so spending lowers the balance, but gates and job requirements read lifetime XP (`xpTotal`) and never go down. Skills keep studying (XP/s) in every phase, including offline.
- **XP from jobs.** XP gates sit behind every job, so a job can teach as well as pay. Twelve of the 31 grant idle XP/s on top of their salary (`xpPerSec` in `src/data/phases.ts`): the internship, Junior SWE, the mentor buddy, code review skills, the on-call rotation and system design study early on, then Staff, Principal, Distinguished, Fellow, Chief Scientist and Lab director. The rest only pay. It counts offline too, and event multipliers on idle XP apply to it. Eleven jobs also pay a lump of XP once, the moment you take them (`xpLump`): the internship, the mentor buddy, code review skills, the QA rotation, on-call, system design study, the acting tech lead, Staff, Principal, Fellow and Lab director. The lump adds to both spendable and lifetime XP, so it can carry you past the next job's XP gate. Some jobs have both, some only one, and the rest neither.
- **Gigs** clear once. Each one asks for enough owned skills of each tag it is about (gig 1: a backend and a frontend skill), and no gig waits on another. The specialization and the origin lower the asks. Gig 8 (site maintenance retainer) is the first idle money.
- **Click boosts** (`×3` / `×5` / `×10`) multiply **click payout only**. Idle income is unchanged. One boost at a time; the next roll replaces the slot after the current one ends. Waits are long on purpose: mean 4 minutes early, 6 at the mid, 8 upper, 10 Q3 and 12 at the end (`BOOST_BY_ERA`), at least half the mean and at most 2.5 times it, so a boost is something you notice, not the rhythm of the game. A toast, a chip over the sprite, a rim light circling the art and the metrics strip show the multiplier while it runs. At ×10 (any multiplier of 8 or more) that chrome turns gold.
- **10x dev skills** (called gold in the code). Seven one-off perks (`src/data/gold.ts`, rules in `src/game/gold.ts`) that bend the rules instead of adding income. They have their own "10x dev" sub-tab inside the Skills tab (next to "Skills", it appears once the first one is in reach), each row with a trophy and a one-line description, and cost spendable XP (a quarter of the lifetime XP that opens them, then the purchase scale). A row opens at its lifetime-XP milestone and waits on the earlier row of its family. Two families: **Hover clicking** (2, 5, 10 and 15 clicks a second, the first once a Senior SWE job is held and 20,000 XP are earned; owning every catalog row still grants 20/s), and **Time away** (the offline cap grows from 8 to 12, 16 and 24 hours).
- **One copy at a time.** Every purchase (skills, gear, capital rows, hires) is one copy. There is no Buy amount control.
- **Offline.** Coming back credits idle $ and idle XP for up to 8 hours (more with the Time away gold skills) and toasts `welcome back, credited $X`. Time away past the cap pays nothing, which is what sets how long the game takes for someone who visits once a day: see [PACING.md](PACING.md).


## Shop

Six tabs: Skills, Gigs, Jobs (roles only), Gear (repeatable infra, grouped by kind), Capital (with era sub-tabs), and Company (your product's globe, world and hires; see Your company below). Gear opens at `openingXp(10,000)` lifetime XP, ahead of the Gig Board, because its first rows cost a few hundred dollars. Closed boards stay out of the tab bar until they are the next one to open; that one waits there dimmed and, when picked, shows what it needs, with the requirements ticking off. A newly opened phase takes over the tab (Gear never does, it is not a phase). Each list shows what you own plus the next thing you do not, even while that next row is still locked. New rows carry a `New` tag.

**No bars.** A locked row says what it is waiting on in words (`More lifetime XP`, `More skills`, `A bigger balance`, `the Senior SWE job`), never how much is left, and there is no progress bar anywhere: knowing the exact gap turns the game into watching a number, and the loop is to click, shop and leave. A locked row's button reads "Locked" instead of a price, so an XP price is never mistaken for the lifetime XP that opens the row; the price appears once the row is open, and a row you can afford lights up. Switching to a tab scrolls its list to the bottom, where the newest rows are.

**Next banner.** Every panel has its own slim bar under the tabs, and it speaks only for that panel. A closed panel names its board and what is missing (`Job Board - need more XP · more gigs`). An open panel names its first row you have not bought yet and what that takes (`to buy it`, or `more money` / `more XP` when short). A panel with nothing left says so (`Every skill learned`). The first copy is enough for repeatable gear, skills and capital, and an earlier unlocked row is never skipped for a later one. Clicking the bar takes you to the thing it names, which can be on another tab: the Gig Board asks for a skill, so its bar jumps to that skill.

The logic is `nextUnlock(progress, tab)` in `src/game/nextUnlock.ts`. Without a `tab` it gives the single next thing across the whole game (skills first, then closed boards, then each catalog in order), and that is what `__GAME__.getState().nextUnlock` returns.

## Where you came from

The start card is three beats (the handle, the product, the bet) and no longer asks for an origin. A minute in, at `ORIGIN_ASK_XP` lifetime XP (`src/data/origins.ts`) and with the handle kept, a card opens with the three origins and cannot be waved away: Escape and the backdrop do nothing, and the button waits on a pick (`src/components/OriginPick.tsx`, `originDue` in `src/game/build.ts`). The pick is the career's first real choice and is kept for the career. It stays open (through `pickOrigin`) until the first gig is cleared or the first job held. A career that never kept its handle (an agent's bare `keepProfile`) is asked as soon as it has the XP; call `pickOrigin` or leave the card up.

## Career years

The game has a calendar of its own: the career's **year**, read off lifetime XP by `careerYear` in `src/game/careerYear.ts` (no save field, it never falls). The stretch before the first job is school and freelancing (the Gig Board is the start of Year 3, the internship of Year 5), then each rung of the ladder is a year or more, to Year 34 at the top. The status bar shows `Year N`, and the career log opens with the year and the next three **marks** the career's path has coming.

A mark is a moment on the calendar (`src/data/careerYears.ts`, a drop-in table): shared ones (a client who pays, a real badge, Senior), an origin's own (College: orientation, the thesis, graduation; Bootcamp: demo day, two hundred applications; Dropout: the withdrawal form, the founder's DM, the pivot) and a leadership line's (IC: the design doc everyone cites; Manager: a first direct report). When the year reaches one it is journaled as a `year` line (`Year 5: A real badge`) and toasted once. Picking the origin after the year passed some of its marks catches them up, and a reload never repeats one.

## Career timeline

The desk is earned, not handed over. A new career starts with the XP counter and the Skills tab; everything else arrives at a career moment that explains it. The table is `src/data/features.ts` (a drop-in file), the gates are `src/game/features.ts`. Times are for a player clicking twice a second.

| When | What appears | Trigger | Reveal |
| --- | --- | --- | --- |
| 5 min | Your company: the activity-bar globe button. The globe sits bottom left of the desk and each cleared gig seeded users in its client's region, and they spread from there as locations and gear allow. Its card's Try it opens the shop's Company tab | The first job (the internship). The Gear tab lists the next serving row (Cloud and below) beside the next desk row from this moment | big |
| 2 min | Career log (the Git icon) | Git + GitHug hygiene (skill 5) | big |
| 2 min | GitHug profile, and the star for the real repo | Git + GitHug hygiene (skill 5) | standard |
| 3 min | LinkedOut profile | Portfolio site live (skill 15) | standard |
| 2 min | Gear tab | `GEAR_TAB_UNLOCK` lifetime XP | standard |
| 3 min | Gig Board | its gate | the phase pop |
| 3 min | Dollars: the $ counters | the first dollar | small |
| 3 min | Rosters | the first gig | standard |
| 5 min | Job Board | its gate | the phase pop |
| 5 min | Metrics | the first job | standard |
| 10 min | Click sounds, editor themes | Thocky keyboard, Drawing tablet (UI) | small |
| 20 min | 10x dev skills | the first 10x dev row in reach (Overnight Cron, 100,000 lifetime XP; Hover Tap, 20,000, also waits for a Senior SWE job) | standard |
| on a 10x dev skill | Auto-click | a hover skill (or every catalog row) | standard |
| 5 min | Desk cat | the first job | big |
| ~28 min | Music | Noise-cancelling headset | standard |
| second visit | Capital | its gate | the phase pop |

Cosmetics keep coming after that: a new editor theme with each new stage band from the Internship band on (stage art tiers 19, 23, 27, 31, 34, 37 and 50) (Catppuccin Mocha and Latte are there from the start), a click sound with the Vertical mouse, Ergo chair and Split ergo keyboard, and a music style with the mid, upper and end eras. A cosmetic that opens before its picker arrives with the picker. Pickers list what the career has earned plus whatever is in use; a choice from an earlier run stays usable. Music only plays once the headset is bought.

**How an unlock is shown.** Every row goes through the same four steps.

1. **Before.** The shop row that opens something carries a small green badge wearing that feature's icon (hover or focus it for `Unlocks Career log` and what it does), and the Next banner, which has room, prints the name beside the icon. The next closed row with a place on screen stands there as a dim dashed outline with a lock and a ring that fills as it gets close; hover or focus says what opens it. One outline at a time. Closed boards are hidden from the tab bar, except the next one, which waits there dimmed.
2. **The moment.** Nothing pops up. The NEW marker and the tab or row mark are the whole signal, so a new unlock never covers the click target, a buy button or a modal. (The one card left is the "What's new" note an older save gets once.)
3. **After.** A green NEW dot or pill stays on the thing until it is used once. Inside a menu, the menu's button carries it too.
4. **Remember.** Every unlock is a line in the career log.

Reveals play one at a time, wait for events, 1:1s and money pops, and leave a short gap between them (longer after a card that timed out). A batch of four or more (an admin grant, a test jump) and anything that opens during a return play only the loudest; the rest keep their NEW markers. Unlocks earned while away are listed on the sticky note. Admin mode shows the whole desk.

**GitHug profile.** The GitHug button on the activity bar opens a parody GitHub profile built from the career itself (`src/game/githug.ts`). It goes by the career's handle: a new career draws a Tailscale-style one (`quiet-otter`) from an adjective list and an animal list (`src/game/identity.ts`), and there is no real name anywhere. A start card shows it: Reroll draws another, and Start keeps it for the rest of the career. Handles are never typed, and a test scans every handle the lists can draw for slurs and slang. LinkedOut goes by the same handle, at `linkedout.com/in/<handle>`. Below that, a contribution graph of 26 columns of five squares, spanning the modal's full width. A square is a run of eight contributing career steps, not a calendar day, so the graph fills with progress and the empty squares at the end are what is left to do. Each logged skill, gig, job, first copy and perk counts as a step; each square is shaded against your busiest one (the numbers on its repo lines are made up, between 1 and 50, and steady for a given square), and hovering one reads like GitHub: `3 contributions in til`, one line per public repo, and a lock icon with `private repositories` for the rest (jobs and capital are private; skills, gigs, gear and perks go to public repos). Then the count of filled squares, followers, repos and stars that all keep growing with the career (jobs and capital rows each add a private repo and followers, and stars scale with lifetime XP), and four pinned repos (`hello-world`, `dotfiles`, `til` and `portfolio` from skills, then one per cleared gig, newest first). Its footer, and the Star pill beside the button, link to the real repo; neither is on screen before the unlock.

**Career log.** The Git icon opens and closes the career log sidebar: Up next (the next three closed rows, each with a short phrase for what it needs and no bar; the cat shows as `???`), then the history, newest on top, one line per step: skills learned, gigs cleared, jobs taken, gear and capital first bought, boards and eras opened, 10x dev skills claimed, unlocks, returns, events, 1:1s and the joke milestones. The journal keeps the newest 2,000 entries in the save.

**JSON journal.** `__GAME__.careerLog()` prints the same journal as JSON lines, one flat object per step (`seq`, `time`, `type`, `ref`, `name`, extras like `awayMs` or `accepted`, then `money` and `xpTotal`). Through `__GAME__`: `getState().features`, `getState().careerLog`, `careerLog()`, `seeFeature(id)`, `clearReveals()`.

## Prestige: the Exit

Every career builds one product. Selling it is the **Exit**: it pays **Prestige**, starts a new career with a new product, and the Prestige gives a permanent bonus and buys Legacy perks. The Exit and everything below are in admin mode only for now.

**What it pays.** `floor(cbrt(earnings across all careers / 5e11))` Prestige in total, so an Exit pays the rungs this career climbed (dollars credited count, spending does not). The first time a career wins the world with an ending it has not won with before, **5 more** Prestige are paid on top. Every Prestige ever earned adds 3% to every income and XP stream and to product growth, for good, whether spent or not (`1 + 0.03 × prestigeTotal`).

**When it opens.** The Exit is offered whenever it would pay at least 1 Prestige: on the first career that is about $5e11 earned, or a win. On a later career it waits until earnings cross the next rung; until then the button reads "no new Prestige yet".

**The button.** `Sell <Product>: +N Prestige (×A → ×B)`, or `Sell <Product>: no new Prestige yet` when it would pay nothing. It is in the Company tab and in the **Prestige** panel, opened by the crown on the activity bar (shown once the Exit is open or you have Prestige). A confirmation card lists what starts over and what stays, and the first Exit asks a second time, naming the losses in words. A headline card closes it, by how far the product got: under 1M users "acqui-hired; sunset 'to focus on the core'", 1M to under 1B "acquired; stays on as 'advisor'", 1B to under 8B "sold in a blockbuster deal", and a win reads by its ending (night owl, executive sponsor), with "New in the Hall of Fame" when it is a new one. Then the start card opens on the product beat: a new product name (Reroll as usual), the same handle.

**What starts over:** money, XP, skills, gigs, jobs, gear, capital, the click boost and event bonuses, and the product (users by region, regions bought, hires, resistance, incidents, the win and its multiplier). **What stays:** Prestige and the bonus, Legacy perks, the Hall of Fame, 10x dev skills, the handle, the career log, the desk and the timeline's unlocks.

**Legacy perks.** Three tracks, each after the one before it, bought once, and each applies now and at the start of every career (95 Prestige for all):

| Track | Perks (price) |
| --- | --- |
| Network | Study group: skills 1 to 10 learned (1) · Open portfolio: Portfolio site live and React learned, Gig Board open (2) · Repeat clients: gigs 1 to 6 cleared, lumps not paid (4) · Return offer: the internship held (7) · Seed money: $1,000,000 held (12) |
| Founder | Early adopters: 1,000 users at the home region (2) · Viral loop: product growth ×1.5 (11) · Platform: product revenue ×1.5 (16) |
| Capital | Long weekend: offline cap +4 hours, on top of Time away (2) · Volume discount: capital rows −10% (4) · Bulk hardware: gear rows −10% (7) · Raise season: salaries and retainers ×2 (11) · Compounding: capital rows earn ×1.5 (16) |

**Hall of Fame.** The two endings (Night owl, Executive sponsor), each recorded the first time a career wins the world with it and shown in the Prestige panel (`???` until then). Owning both is the long goal. The pace model (`npm run pace`, `docs/PACING.md`) puts a Regular player's first Exit around day 1 for about 110 Prestige and a career that owns everything and wins the world in the fourth to sixth, 2 to 3 days in; it can only reach the night owl ending. The Exit constants were tuned for longer careers and are stale (`docs/PACING.md`).

## Stage

The stage shows the highest capital tier you own, else the furthest job, gig or skill, in pixel art, in front of the desk: an activity bar, the career log sidebar, a status bar that names the career's band (see [ART.md](ART.md)). Before the first purchase it shows the opening attic scene (art 0) and the stage name stays High school. Buying a new top item plays a reveal burst.

## The unlock celebration

A large pop (a cleared gig, a board) and every unlock or pick (`celebrationNonce`) play one celebration over the stage (`src/components/UnlockFx.tsx`). **All of the motion comes from two libraries; the repo only chooses colours, counts, timing and where it starts.** Four beats: the sprite crouches for a tenth of a second (Motion), then a flash and two shockwave rings (elements Motion scales and fades, styled in `index.css` from the theme's colours) and the confetti (canvas-confetti: a square burst, a ring of stars and, an instant later, an upward fan) leave it, while the sprite springs back past its size with a pulse of light and a small shake runs through the desk (Motion). A cleared gig gets the smaller version (fewer pieces, one ring, no shake). Both libraries are their own chunks, fetched at the first celebration or the idle moment before it. The theme only reaches the libraries as colours (`paletteOf`): the era's glow, white or the deep accent, and whether the desk is dark, which switches the rings to additive light. A phone gets a short buzz on an unlock. `prefers-reduced-motion` plays none of it. Two announcements of one moment (an unlock sets the nonce and a pop together) play once. `__GAME__.forceCelebration()` plays it on demand (`docs/HARNESS.md`).

**Rule for motion in this repo:** new animation uses Motion (`motion`) and, for particles, canvas-confetti. Do not hand-roll a particle system or a spring.

## Motion in the interface

Everything that moves in the UI, apart from the idle loops (sway, rim spin), hover and focus states and the globe, is Motion, loaded as one lazy chunk by `src/components/useMotion.ts` (`preloadMotion()` starts it when the page settles; `motionReady()` is what the click path asks, and it never waits). The rules every piece follows: with no Motion yet, no layout (a test DOM, a hidden tab) or `prefers-reduced-motion`, nothing moves (a fade at most) and the state change happens all the same; nothing ever holds up a state change or an unmount.

- **The click and the balance.** The sprite's bump is a spring from 0 to 1 that `Stage.tsx` turns into a pose (aimed away from the click, bigger with heat and a boost); a new click takes the sprite over. The balance squashes on a pop (a large one adds the red and cyan split), rolls its digits up on a purchase, and counts up from the pre-payout balance on a cleared gig (`backOut`, so it overshoots by about a tenth; `HeroMoney.tsx`).
- **Dialogs.** Every modal sits in `ModalBackdrop`, whose ref callback fades the backdrop and springs the card in. Closing is not delayed: the dialog unmounts at once, and a scrubbed, inert, `aria-hidden` copy is put back where it was and fades out (`presenceRef` in `useMotion.ts`). The toast, the reveal card and the tooltips use the same ref callback; the toast's live region stays mounted.
- **The shop** (`shopMotion.ts`). A purchase bumps the owned count, rolls a repeat buy's price up, and sweeps the row (an element that exists for the length of the flash); a row that opens in a list already on screen eases in from the side. The underline of each tab strip is one bar that springs to the active tab, and a new list slides in from the side its tab lies on. On a portrait phone the grip's release springs the sheet from where the finger left it to where its class rests, carrying the finger's speed (`springSheet`, with the pure rules in `src/game/shopDock.ts`); without Motion the CSS transition settles it, and still settles a tap, a keyboard step or a tab switch.
- **Small badges.** A NEW dot or pill pops in, and the dot sends a ring out for as long as it stands; the bell's count jumps when it changes and the bell rings when it goes up; a commit that lands at the head of the career log drops in. The desk's sidebar (the `--ide-tree` and `--ide-activity` custom properties) stays a CSS transition: it already runs a smooth 0.7s ease-out and Motion would animate the same property for nothing.

## Money pops (Balatro feel)

- **Raw digits first.** `formatNumber` keeps whole numbers as raw digits with separators (`1,234,567`) up to 9,999,999, then abbreviates (`10M`, `1.5B`, ... `Qa`). The hero balance has more room and keeps its digits up to $999,999,999,999 (`HERO_RAW_DIGITS_BELOW`), shrinking the font a notch once it is long. `formatNumber(v, 1000)` / `formatCompact` give the old tight K/M form.
- **Medium on a click** once money exists: the hero total squashes and rebounds (about 190ms).
- **Large** on a gig clear: a centered slam-in pop (a phase unlock no longer pops; its NEW marks say so) (`+$1,200`, `Gig cleared`) with a chromatic red/cyan split that converges, a bigger squash on the hero total, a count-up of the running total that overshoots then settles, plus the celebration over the sprite (see below).
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
