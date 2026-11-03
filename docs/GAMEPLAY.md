# Gameplay

The player's view of the economy. The rows, prices and gates are data: `src/data/phases.ts` (skills, gigs, jobs), `src/data/gear.ts`, `src/data/capital.ts`, `src/data/gold.ts`, `src/data/features.ts`. Pacing, meaning how long a career takes, is in [PACING.md](PACING.md).

## Phases

| Phase | Pays in | You buy | Opens when |
| --- | --- | --- | --- |
| **A Skill grind** | XP per click, no $/s | Skills, paid in XP. The first one is cheap so the first unlock comes within a minute | start |
| **B Gigs** | First $ | Gigs: a lump of $ on clear, some add a retainer $/s | Lifetime XP, and two skills (`GIG_BOARD_UNLOCK`) |
| **C Jobs** | Salary $/s, and XP/s on some | Jobs, each held once | Lifetime XP, and six gigs cleared (`JOB_BOARD_UNLOCK`) |
| **Gear** (a shop tab, not a phase) | Click bonus, $/s | Repeatable infra items: desk, homelab, GPUs, racks, cloud, Mars | Lifetime XP (`GEAR_TAB_UNLOCK`), ahead of the Gig Board. A row then shows once you hold its money and, on later rows, its job |
| **D Capital** | Heavy $/s | Capital rows, from an angel syndicate seat to Mars Holdings | A senior job, or $500,000 held at some point (`CAPITAL_UNLOCK`) |

The opening is brought forward, not squeezed. Every gig asks for less XP than its table row says (`GIG_HEAD_START` in `src/data/costs.ts`), so the Gig Board opens a few minutes in and the next gigs come quickly after it. The first job ranks follow a hand-set staircase (`JOB_STEPS`). Scaling every gate down instead packs the early gigs into seconds, and everything unlocks at once. See [PACING.md](PACING.md) for the numbers.

## The rules

- **Clicks.** Every click pays XP. Dollars wait until the first job. After that a click also pays dollars, from the equipment, capital and job click bonuses and a share of your $/s from the jobs you hold. Nothing else changes with the cursor. There is no $/s until a retainer gig.
- **XP.** Skills cost XP, so spending lowers the balance. Gates and job requirements read lifetime XP, which never goes down. Skills keep studying (XP/s) in every phase, offline too.
- **Jobs teach.** Some jobs add XP/s on top of their salary (`xpPerSec`), and some pay a one-time lump of XP when you take them (`xpLump`). The lump adds to both spendable and lifetime XP. Some jobs have both, some one, and the rest only pay.
- **Gigs clear once.** Each gig asks for owned skills of the tags it is about. No gig waits on another. Your specialization makes the ask lighter on its own tag. The first retainer gig is the first idle money.
- **Click boosts.** A boost multiplies click payout only. Idle income is unchanged. One boost at a time. Waits are long on purpose: they grow with the era (`BOOST_BY_ERA`), so a boost is something you notice, not the rhythm of the game. At high multipliers the balance card turns gold (`GOLD_MULT_THRESHOLD`).
- **10x dev skills** (called `gold` in the code). One-off perks bought with spendable XP, in their own sub-tab of Skills. They bend the rules instead of adding income. Two families: hover clicking, which makes the emoji click for you at rising rates, and time away, which raises the offline cap. Each row opens at a lifetime-XP milestone and waits on the earlier row of its family.
- **One copy at a time.** Every purchase is one copy. There is no buy-amount control.
- **Offline.** Coming back credits idle $ and XP up to the offline cap, which the time-away 10x dev skills and a Legacy perk extend. The credit shows as a sticky note on the desk. Time away past the cap pays nothing.
- **Random events.** A Yes/No offer on average every `EVENT_MEAN_WAIT_MS`. Nothing applies until Yes. No, Escape and the backdrop decline. The stake is minutes of what you earn now, and at least a small share of the balance you hold, so a big pile is never nicked for a flat handful of XP. See `src/data/events.ts`.
- **1:1s.** Once a job is held, a review comes up now and then with three replies. "Exceeds" is a money gift, "meets" changes nothing, and "pip" trades money for XP.

## Shop

Five tabs: Skills, Gigs, Jobs, Gear and Capital. Capital has era sub-tabs. A tab opens when its board opens. A closed board stays out of the tab bar until it is the next one to open; that one waits there dimmed, and when you pick it, its lock panel says what it needs.

Each list shows what you own plus the next thing you do not, even while that row is still locked. A repeatable row counts as bought once you hold one copy. New rows carry a `New` tag.

**No progress bars.** A locked row says what it is waiting on in words (more lifetime XP, more skills, a bigger balance, a senior job). It never says how much is left. Knowing the exact gap turns the game into watching a number. A locked row's button reads "Locked" instead of a price, so an XP price is never mistaken for the lifetime XP that opens the row.

**Scroll.** Switching tabs lands on the first open row you have not bought, or on the bottom when there is none. A row appearing in the list you are looking at does the same.

**Next, for agents.** `getState().nextUnlock` names the single next thing across the whole game. No screen shows it; it exists for the harness and for tests.

## Career timeline

The desk is earned, not handed over. A new career starts with the XP counter and the Skills tab. Everything else arrives at a career moment that explains it. The table is `src/data/features.ts`; the gates are `src/game/features.ts`.

| What appears | Trigger |
| --- | --- |
| Career log (the Git icon) | Git + GitHug hygiene (skill 5) |
| GitHug profile, and the star for the real repo | Git + GitHug hygiene (skill 5) |
| LinkedOut profile | Portfolio site live (skill 15) |
| Gear tab | Lifetime XP (`GEAR_TAB_UNLOCK`) |
| Gig Board | Its gate |
| Dollars: the $ counters | The first dollar |
| Rosters | The first gig |
| Job Board | Its gate |
| Metrics | The first job |
| Desk cat | The first job |
| Click sounds (Thocky keyboard), editor themes (Drawing tablet) | Gear, first copies |
| Music (Noise-cancelling headset) | Gear |
| 10x dev skills | The first 10x dev row in reach |
| Auto-click | A hover 10x dev skill |
| Gif parade | The first capital row of the mid era |
| Capital | Its gate |

Cosmetics keep coming after that. Editor themes arrive with each new stage band. Click kits and music styles arrive with gear and with the era. A cosmetic that opens before its picker arrives with the picker. Pickers list what the career has earned, plus whatever is in use, so a choice from an earlier run stays usable. Music only plays once the headset is bought.

**How an unlock is shown.**

1. **Before.** The shop row that opens something carries a small green badge with that feature's icon. The next closed row with room on screen stands there as a dim dashed outline, with a ring that fills as it gets close.
2. **The moment.** No card covers the screen and no modal opens. A new unlock lights its NEW marker. A big unlock or a phase opening also raises the large money pop and the stage celebration.
3. **After.** A green NEW dot or pill stays on the thing until it is used once. Inside a menu, the menu's button carries it too.
4. **Remember.** Every unlock is a line in the career log.

The one card left is the "What's new" note an older save gets once.

**Career log.** The Git icon opens and closes the career log sidebar. It shows Up next (the next few closed rows, each with a short phrase for what it needs and no bar), then the history, newest first. The journal keeps the newest entries in the save. `__GAME__.careerLog()` prints the same journal as JSON lines.

**GitHug profile.** The GitHug button on the activity bar opens a parody profile built from the career itself (`src/game/githug.ts`). It goes by the career's handle, a Tailscale-style name such as `quiet-otter`, drawn from word lists (`src/game/identity.ts`). There is no real name anywhere. Handles are never typed; the start card offers Reroll and Start. The contribution graph is made of the career's own steps, so the empty squares at the end are what is left to do. LinkedOut goes by the same handle. Its footer and the Star pill link to the real repo. Neither is on screen before the unlock.

## Prestige: the Exit

The **Exit** closes the career and pays **Prestige**: a permanent bonus on every income and XP stream, plus Legacy perks you can buy with it. The rules, the perk tracks and the Exit's gating are in [PRESTIGE.md](PRESTIGE.md). The Exit is in admin mode only for now.

## The unlock celebration

A large pop, a phase opening, and a new top item or era play one celebration over the stage (`src/components/UnlockFx.tsx`). All of the motion comes from two libraries: Motion for the sprite, the flash and the rings, and canvas-confetti for the particles. The repo only chooses colours, counts, timing and where it starts. The theme reaches the libraries only as colours (`paletteOf`).

Reduced motion plays none of it. The game holds still when the device asks for reduced motion, unless the player picks **Full motion** in the settings menu's Motion section. A device can ask for less without its owner knowing, which shows up as logos that fall straight down with no bounce and no celebration. `__GAME__.forceCelebration()` plays it on demand.

**Rule for motion in this repo:** new animation uses Motion (`motion`) and, for particles, canvas-confetti. Do not hand-roll a particle system or a spring.

## Money pops

- **Raw digits first.** Whole numbers show as raw digits with separators up to a cutoff, then abbreviate. The balance card keeps its digits longer than the rest of the UI.
- **Medium** on a paying click: the balance squashes and rebounds.
- **Large** on a gig clear, a phase opening or a big unlock: a centred slam-in pop with a count-up of the running total, plus the celebration.
- **Never per idle tick.** Idle income just moves the number. Reduced motion turns the pops into a plain fade.

The pop kinds are `MONEY_POP` in `src/data/phases.ts`. The last one is exposed as `__GAME__.getState().lastPop`.

## How to play

The first thing in the settings menu is a How to play button. It opens a short rundown: click for XP, skills open gigs, gigs open jobs, gear and capital, time away, trophies. It says how you know you are done: the last trophy is the final 10x dev skill, and until you own it you keep clicking.
