# Builds: origins, specializations and the kitchen

Status: draft from a design pass on 2026-10-20. Built so far: tags, the kitchen, the product in the pace model, job ranks, the specializations (step 4b), leadership (step 4c), the build's effects on the product (step 4d), the Manager in the pace model (4e, 4f) the user gates (4g) the hire UI (4h) Frontend's launches and AI's GPUs (4i) events and 1:1s for a build (4j) origins (4k) and the progression tree (4l, below). The calls still open are at the end.

## Why

Every career walks the same line, and the rules make it so, not the content:

- Gigs are a chain. Each needs every earlier gig (`priorGigs: row.id - 1`) and a skill list that only grows (`skillsForGig` in `src/data/phases.ts`).
- Jobs are one ladder, and all 31 are held at once.
- Gear and capital open in table order, by money and job.
- The finish is owning everything (`ownsEverything` in `src/game/nextUnlock.ts`), so every player ends in the same place and the only choice is what to buy first.
- The one real branch, the fork, is hidden (`FORK_OFFERED` off), and the Exit is admin only. No two careers differ.
- **The product is a side game.** The link runs one way: gigs seed users, gear serves them, users pay. Nothing in the career reads users (`nextUnlock`, `phase` and `economy` never look at them), and `src/game/pace.test.ts` pins that "the product adds users, not time". Its revenue is small next to the career (1M users pay about one Senior salary, 8B about a quarter of q3 capital). It has its own shop (regions, points of presence and hires in the Company tab), its own crises (incidents, resistance) and its own finish (the 8B win) beside `ownsEverything`.

The endgame is also a wait. Most of a career is the last capital row (6.6 days of full income for a collector, `docs/PACING.md`), and a click adds little next to idle.

## Decided

- **The product is part of the career, not a side game.** The globe and the company have to be what the build grows, not a second game beside it.
- **Builds come from exclusivity.** A career picks an origin and a specialization, and does not see the rows of the ones it did not pick.
- **The finish is the 8B win**, per career. Owning what the build can see is the way there, not a second finish. There is no collection across careers.
- **Mechanics first.** The product has to be something the career needs. Screen changes come later.
- **The fork is gone.** No quitting, no burn, no runway, no bridges.
- **Three pieces:** specialization branches on the job ladder, gigs that ask for tags, and the kitchen (combos with hand-written jokes).
- **Origins before the career:** College, Bootcamp, Dropout.
- **Specializations inside tech**, AI engineer and Forward deployed engineer among them.
- **The specialization is picked once**, at a set point before a job, and is then locked. A career gets one switch.
- **The Exit stays admin only.**
- **Three save slots, opened by the first finished career.** Each slot is a career with its own build. Unless changed, cosmetics, settings and the kitchen log are shared and everything else is per slot.
- **Click builds stay.** Some specializations earn by clicking, some by idle.
- **A career takes half a day to a day of real time and 30 to 90 minutes at the game**, not four to nine days.
- **Visits are short.** The first session runs 20 to 30 minutes; once idle takes over, a player stays about 5 minutes.
- **Two career gates read users:** the specialization pick needs 10,000 users and Senior needs 1,000,000.
- **The endgame wait is fixed first**, on its own, before the tree.
- **Jokes are clean**: tech humor, 2026 tech humor and programming lore. No obscenity, no swearing.

## 1. Origin

Picked on the start card, after the handle, once per career. Each origin replaces the first few shared skills with about six of its own, and has its own first job.

| Origin | Its own rows (sample) | First job | Upside | Cost | Leans toward |
| --- | --- | --- | --- | --- | --- |
| **College** | Data structures midterm, Office hours regular, Compilers all-nighter, Research assistant, Senior thesis | Campus internship | Idle XP from lectures; theory skills cheaper; campus recruiting opens the first job with fewer gigs | **Student loans:** a burn in $/s from the first job until a total is paid. Gigs open later | AI engineer, Backend, Security |
| **Bootcamp** | Pre-work module, Week-3 JavaScript wall, Pair rotations, Capstone demo day, Mock interview gauntlet | Apprentice developer | Web skills cheaper; the Gig Board opens early; career services skip the gig count for the first job | **Income share agreement:** a cut of salary for the first few jobs. Theory skills cost more | Frontend, Forward deployed |
| **Dropout** | Hackathon all-nighters, Discourd server admin, Side-project graveyard, Drive-by PRs, Cold DMs to founders | Contractor for a former client | Gigs pay more; the product starts ahead | **"Degree or equivalent experience":** the big-company jobs ask more lifetime XP | Forward deployed, Frontend |

"Leans toward" is an affinity (cheaper, earlier), never a lock. Every origin can take every specialization.

## 2. Specializations

The job ladder becomes a tree.

1. **Trunk.** The origin's first job, then Junior, the mentor buddy, code review, QA and on-call, up to Mid-level SWE. Shared by everyone.
2. **Specialization.** At Mid-level the Job Board offers the specializations. Taking one hides the others for the career. Each has its own run of about six job rows, in place of today's rows 8 to 15. A career may switch once; what the switch keeps and costs is open.
3. **Leadership.** At Senior, two ways up, one per ending: **IC** (Staff, Principal, Distinguished, Fellow), where the product grows by your own work (night owl); **Manager** (EM, Director, VP, CTO), where hires move from the Company tab into the manager's jobs and the team grows it (executive sponsor). The founder ending goes with the fork.

| Specialization | Tag | Click or idle | Gear it favors | The product becomes (proposed) | Its rows (sample) |
| --- | --- | --- | --- | --- | --- |
| **Frontend** | frontend | click | Desk | A consumer app: clicks ship launches that spread users | Component librarian, Design-system owner, Core Web Vitals whisperer |
| **Backend / Platform** | backend | balanced | Cloud, Storage | An API: fewer users, each pays more | API owner, Platform engineer, Internal tools czar |
| **Infra / SRE** | infra | idle | Racks, Home lab | Uptime: drops and incidents cost less | On-call primary, SRE lead, Chaos engineer |
| **AI engineer** | ai | idle | GPUs | An AI product: growth needs GPUs | Prompt engineer, RAG plumber, Evals wrangler, Agent wrangler, Head of AI |
| **Forward deployed engineer** | product | click | none; gigs pay more | Enterprise: users land in lumps, one client at a time | Embedded at a client, Solutions architect, Deployment strategist |
| **Security** | security | balanced | Home lab | Trust: owns resistance and the incidents | AppSec reviewer, Red-team lead, CISO |

**Click or idle** is the build's answer to the endgame. Raising `clickPct` alone does not do it. The jobs' click share already sums to 0.68 of idle, so 2 clicks a second pay 1.36 times idle while you click, and over a Regular day that adds about 4% (`docs/PACING.md`). That is the "clicking is pointless" feeling. A click build has to be priced against time at the game, not the instant rate: one visit of clicking buys what idle buys in hours (a click share of tens of times idle), or clicks feed something idle cannot (a launch, a client demo, a training run that pays in a burst). The multiple is an open number for the pace model. With 5 minute visits, the clicking that counts is the first minute or two after a return, so the lever may be a return burst (clicks right after a return pay a share of the offline credit) rather than a sustained click rate. An idle build gets short gaps between purchases instead, so the next visit always buys something.

## 3. The product is the build

The career and the product become one loop, so the globe shows the build and the build needs the globe.

- **Leadership is the ending** (section 2): IC grows it yourself, Manager hires. Hires leave the Company tab.
- **The specialization sets how the product grows** (the table above), so two builds look different on the globe.
- **Capital rows become company moves that open regions** ("Raise a seed round" opens a region, "Acquire a rival" brings its users). The Company tab's region shop folds into the catalog. This was step 5 of `docs/COMPANY_ARC.md`, never built.
- **Two career gates read users:** the specialization pick (10,000 users) and Senior (1,000,000). Then the product cannot be ignored.
- **One finish: the 8B win.** Today a career has two (`ownsEverything` and the win). The catalogs become the way to the win.
- **Later, on screen:** the globe answers every purchase. A gig, job or gear buy pulses the region it touched.

Gating the career on users makes the product's growth a blocker, and it was only ever simulated with maxed gear, never tuned by hand. The single-run pace model now models the product (`simulatePace`), so its growth is tuned before any gate reads users.

## 4. Tags and the gig board

Every skill, gig, job and gear row carries one or more tags: `frontend`, `backend`, `infra`, `data`, `ai`, `security`, `product`, `hardware`. This is a data edit; most skill names already say their tag ("CUDA / GPU programming 101", "Threat modeling habit").

Gigs drop the chain. Each one asks for tag counts ("2 frontend, 1 backend") instead of every earlier gig and a skill prefix. The board shows the few gigs your tags fit best and refills when you clear one, so two players who learned different skills meet different clients. The origin and the specialization add to the tag counts.

## 5. The kitchen

Owning two things that go together reveals a **combo**: a name, a one-line joke and a small effect. It works like Emoji Kitchen: mix two things you have, and something you did not expect shows up.

- **Data.** A drop-in table, `src/data/combos.ts`: `{ id, a, b, name, joke, effect }`, where `a` and `b` are a row, a tag, an origin or a specialization. Hand-written and sparse. No rule generates combos, so every one is a joke someone wrote.
- **Effects** are small and real: a few percent on a tag's income, a combo gig on the board, a cosmetic, a LinkedOut line.
- **The kitchen log** lists every combo found and a `???` slot for each one this build can still make. Whether it also shows the ones that need another origin, as a reason to start another slot, is open.
- **Voice.** Clean tech humor: the industry in 2026 (agents, vibe coding, context windows, GPU queues) and programming lore (it's always DNS, off-by-one, left-pad, Bobby Tables, works on my machine). No obscenity, no swearing, no punching at people. A test scans every name and joke for a word list, the way handles are scanned.
- **Art.** `emojiManifest.json` is generator-only, so combo art comes from the generator (for a start, the two parents' emoji side by side).

Samples, to set the tone:

| Mix | Combo | Joke |
| --- | --- | --- |
| Regex fluency + Prompt engineering habit | Regex by vibes | You asked the model for the regex. Now you have three problems. |
| Bash scripting habit + On-call rotation | Load-bearing one-liner | Written at 3 a.m. Still in prod. Nobody knows what it does. |
| Raspberry Pie lab + Cluster kubectl 101 | k8s on a Pie | A four-node cluster that serves your blog to both of its readers. |
| Desk cat + On-call rotation | Paw-ged | The cat walked across the keyboard and acknowledged the page. |
| Bootcamp + LeetCrate Hard attempts | Week 13 | The bootcamp never mentioned red-black trees. Neither will your job. |
| Dropout + Board advisor (tech) | Honorary degree | You now advise the board of the school you left. |
| College + Forward deployed engineer | Field research | Your thesis advisor calls it applied work. The client calls it Tuesday. |
| AI engineer + Testing (unit/e2e starter) | Evals | Tests, but they vibe. |
| Security + Package manager fluency | node_modules audit | You read every dependency. You have seen things. |
| Frontend + Workstation GPU | Box-shadow render farm | The hover animation needs CUDA now. |
| Forward deployed engineer + Email template coding | Embedded | You were sent to ship the platform. You are now the client's email team. |
| Used mining GPU lot + Fine-tune toy LLM | Proof of work | It mined coins, now it mines tokens. Same fan noise. |
| Dropout + WhyCombinator batch investment | Full circle | You dropped out to apply. Now you fund the dropouts. |
| Infra / SRE + Noise-cancelling headset | Pager-cancelling | Blocks every sound except the pager. |
| DNS + domain portfolio + On-call rotation | It's always DNS | It was DNS. It is always DNS. |
| AI-IDE workflow + LeetCrate Easy reps | Vibe coding | Two Sum, solved in one prompt and four retries. |
| LLM pairing habit + Production war-story journal | Context window | The agent forgot the incident. You never will. |
| Package manager fluency + Open-source first PR | left-pad | Eleven lines that once held up the internet. You maintain them now. |
| SQL + basic backend + Security hygiene | Little Bobby Tables | You sanitize your inputs. His mom taught you that. |
| Dockyard hello-world + Bootcamp | Works on my machine | So we shipped your machine. |
| Workstation GPU + AI engineer | GPU queue | Your training run starts Thursday. Which Thursday is unclear. |

## 6. Pacing: half a day to a day

For the target player (4 visits a day of 5 minutes, 2 clicks a second; `npm run pace -- 4 5 2`), today a stacker owns everything on day 4.3 and a one-of-each player on day 9.3, with 1 to 3 hours at the game. Skills, gigs, jobs and gear are all done by day 1 to 1.5. The rest is the capital tail: the last row alone (Mars megacampus Holdings, $4.3e16) is 6.6 days of full income. The time at the game is already about right; the real time is not. Targets:

- A career takes 12 to 24 hours of real time and 30 to 90 minutes at the game, for that player.
- No purchase waits longer than a set share of a visit's income. The pace model gains a check: the longest wait between two purchases.
- A visit of clicking on a click build is worth hours of idle, late game included (the multiple is open, see section 2).

The levers: a career sees fewer rows (one specialization's), the capital tail is cut or turned into company moves, the purchase scale and the Exit scale are retuned to the shorter career, and the pace model runs one sim per specialization.

## What it breaks

- **Job ids are ranks.** Code compares job ids as places on one ladder: `CAPITAL_UNLOCK.minJobRank` (14), gear `unlockJobRank`, the 1:1s' `minJobRank`/`maxJobRank`, events' `minJobRank` (the highest job held), and the readers in `economy.ts`, `phase.ts`, `nextUnlock.ts`, `features.ts`, `events.ts` and `Shop.tsx`. With per-specialization rows, every `>=` on an id is wrong. Jobs need a `rank` apart from `id`, and those gates read the rank. Jobs now carry `rank` and the gates read it (done in step 4a).
- **Skill ids are triggers.** The career timeline opens the globe, the career log, GitHug and LinkedOut on skills 1, 5 and 15 (`src/data/features.ts`), and the Gig Board needs skills 15 and 16 (`GIG_BOARD_UNLOCK`). If origins replace the first shared skills, those triggers point at rows a career may not have. Keep them on shared rows or move them to tags.
- **The Network Legacy track** grants skills 1 to 10, gigs 1 to 6 and the internship (`src/data/legacy.ts`). With origin rows and tagged gigs those grants mean different things per build. The track needs rewording as "a head start in your origin".
- **`ownsEverything`.** It opens Auto-click, ends the How to play copy (Sabbatical) and is the pace model's finish line. The finish moves to the 8B win; Auto-click and the copy need a new trigger.
- **The fork goes.** `track`, the burn, runway and bridges (`src/game/globe/track.ts`), `FullTime.tsx`, `ForkCard.tsx`, the skipped fork smoke scenario, the founder ending and its headline. The ladder's growth × 0.25 only existed to contrast with the founder, so the product's growth is retuned without it. The Founder Legacy track (Early adopters, Lean team, Friendly investors, Viral loop, Platform) loses two perks and needs rewriting, though the Exit is admin only.
- **`nextUnlock`** and the Next banner assume one path. A branch point needs a "pick one" state.
- **The pace model** runs one strategy and only reaches the night owl ending. It has the product in the single run now (the check that the product adds no time turned around: the finish is the later of owning everything and the win). It still needs a sim per specialization, hires modeled and the kitchen's combos.
- **The Company tab** loses its region shop to capital and its hires to the Manager branch, the fork card goes, and the tab keeps the globe and the status page.
- **The save** gains the origin, the specialization, the leadership track and the combos found. That is either a version bump (a wipe) or optional blocks (`docs/SAVE.md`).
- **The harness** gains `pickOrigin`, `pickSpecialization`, `getState().build` and `getState().combos` (`docs/HARNESS.md`).
- **Events and 1:1s.** `requires` gains origin and specialization, so each build has its own prompts.
- **Save slots.** The game keeps one save today (`docs/SAVE.md`), and the ledger and career log assume one career. Slots need a save per slot, a picker, and a rule for what is shared across slots.

## Build order

Each step ships and checks on its own.

0. **The endgame wait**, before anything else: cut the capital tail so a career owns everything within a day for the target player, and add the pace check for the longest wait between purchases. It does not depend on the tree. If capital rows become company moves (section 3), the tail is redesigned again, so keep this a price change only.
1. **Tags** on every row. Data only, no behavior; a test pins that every row has one.
2. **The kitchen** with the first combos. Additive, no balance risk, and the jokes ship early.
3. **The product in the pace model**, so its growth can be tuned before anything depends on it. Done: `simulatePace` walks the product (IC player, no hires, home region, no incidents; no kitchen combos yet), the finish is the later of owning everything and the win, and 10k and 1M users land within a visit of Mid-level SWE and Senior SWE. The win was on day 1.4 for the target player (1.04 and 1.26 since step 4d): the player buys serving gear for the crowd it has, and buying ahead of the crowd does not help while late capital rows win the money by day 0.75, so it is the same money as the capital tail (`docs/PACING.md`, "The product in the single run"), for step 8.
4. **Specializations and leadership**: the job tree, the click or idle split, how each grows the product, hires moved into the Manager branch, the fork removed.
   - **4a, done:** jobs carry a `rank` apart from their `id`, and every ladder gate reads the rank.
   - **4b, done:** six specializations (`src/data/specializations.ts`, `src/game/build.ts`). The trunk is ranks 1-7, each specialization has its own eight rows for ranks 8-15 (Backend keeps ids 8-15, the others sit at 108-115, 208-215, 308-315, 408-415, 508-515, with the numbers of the backend row at their rank), and ranks 16-31 are shared. The pick opens at Mid-level SWE and every job above rank 7 needs it; the one switch keeps money, gear and the trunk and keeps what was open (`build.peakRank`); the save has an optional `build` block and an old save that holds a job above Mid-level loads as Backend. A click build's manual click pays 2.5 times the idle $/s per click (5 times at 2 clicks a second with every visible job held), hover and auto clicks do not get that; an idle build earns 1.25 times idle and half the click share. The Jobs tab has the pick rows and the switch row, `nextUnlock` has a "pick one" step, the harness has `pickSpecialization`, `switchSpecialization` and `getState().build`, and the pace model takes a `specialization` (default Backend). Walks over all jobs (`ownsEverything`, the next-unlock walk, pace, the job shop, admin) read `visibleJobs`.
   - **4c, done:** leadership (`src/data/leadership.ts`, `src/game/build.ts`). The pick opens once Senior SWE (rank 14) is held, is made once and is locked; every job above rank 15 needs it. Rows 16-24 carry a `lead`: IC is 16, 17, 19, 23, 24 and Manager is 18, 20, 21, 22 (ids and ranks unchanged; 25-31 are shared, rank 15 stays in the tracks). The other line's rows are hidden and unbuyable (`jobState`: `hidden`, or `lead` before the pick); an IC sees 27 rows and a Manager 26. `visibleJobs(spec, lead)` takes the line, and `ownsEverything`, the next-unlock walk, pace, the Jobs tab and admin `buyEverything` (IC by default) read it; the lists of held jobs (LinkedOut, résumé, rosters) were left alone. **Hiring is the Manager's:** `hire` is refused unless the line is `manager`, each kind from a manager rank (18, 20, 21, 22, two kinds each); (step 4h moved the hire rows to the Jobs tab.) Hires held in an old save keep growing the product and drawing pay under IC. The win's ending follows the line (IC night owl, Manager sponsor), and falls back to the hires' share with none. The save's `build` block gains `leadership`; an old save with a job above rank 15 and no line takes one (hires or a manager-only row and no IC-only row: Manager, else IC) and drops the other line's rows. The harness has `pickLeadership`, `build.leadership` and `build.leadershipOptions`; `nextUnlock` has a `lead:pick` step; the pace model takes a `leadership` (default IC, no hires), so the IC sim skips four rows (it owns everything on the same day and wins on day 1.37 instead of 1.40 for the stacker at 4 visits of 5 minutes, `docs/PACING.md`).
   - **4d, done (the multiplier slice):** the build now changes the product (`ProductEffects` in `src/data/specializations.ts`, `productFactsOf(hires, legacy, build)` in `src/game/globe/product.ts`). Backend grows x0.85 and earns x1.3, Infra halves what drops cost, FDE grows x0.9 and each cleared gig seeds x3 (a higher floor the region grows from, not users handed over on the clear), Security throws incidents x0.6 as often and bleeds x0.6 as hard, and an IC adds +3 growth for each IC row held (five rows, +15, scaled like the team but not counted as it). Frontend and AI have no effect yet. The displayed revenue (`productRevenueOf`, the harness `world.revenuePerSec`, the top bar) takes the specialization too. The default career (Backend, IC) now wins on day 1.04 (stacker) and 1.26 (one-of-each) at 4 visits of 5 minutes, and `docs/PACING.md` has the table. All of these numbers are proposals to tune.
   - **4e, done (the pace sim per build):** the pace model has a Manager with hires (`HIRE_CASH_SHARE`, `HIRE_PAYROLL_SHARE`, `headcount` in the result) and `npm run pace -- builds` prints every specialization on both lines (`docs/PACING.md`, "Pace by build"). A Manager who hires lightly (payroll within 5% of revenue) finishes level with an IC for every specialization; one who spends 25% of revenue on payroll finishes up to 40% later, because the salaries starve the gear the win waits on. An IC's finish is the shop's, so specializations only differ in when the world is won; click builds win soonest. No game constant was changed.
   - **4g, done (the user gates):** the pick opens at 10,000 users and Senior SWE (rank 14) needs 1,000,000 (`src/data/specializations.ts`, `src/game/build.ts`, `jobState`'s new `users` state). Both latch. `Gates` carries the company, so the store, the Jobs tab (a lock panel and a locked Senior row), `nextUnlock` (a `spec:users` step and a users need on job 14) and the pace model all read it; callers that carry no company keep the gates open. The harness's `buyJob` and `pickSpecialization` refuse until `setUsers` has raised the users. A player who visits hourly loses nothing; the 4-visits-of-5-minutes target player loses one visit (owns everything on day 1.25, not 1.00; `docs/PACING.md`, "The user gates").
   - **4h, done (the hire UI):** the Team's rows (`src/components/Team.tsx`) moved from the Company tab to the bottom of the Jobs tab, shown on the Manager line, or for an IC who still holds hires from an old save (so they can be let go). A shut kind still says why (not a Manager, or the rank it needs). The Company tab keeps one line: the head count, the payroll, how much of the crowd the team brought, and where hiring is. No rule changed.
   - **4i, done (Frontend's launches, AI's GPUs):** Frontend's manual clicks charge a launch (`src/game/launch.ts`, the charge is `build.charge`): every 25 clicks ship one, adding 3% of the crowd in users (at least 40), spread over the regions it is in, never past what the serving gear can take and never across a milestone (the growth step latches those). Hover and auto clicks do not charge it. An AI build's growth runs at x0.6 with no GPU gear and climbs towards x1.5 (`gpuGrowth` on the specialization, `gpuGrowthOf`; 63% of the way at 12 copies). The harness has `getState().launch`. The pace model clicks at the profile's rate and counts the GPU copies it buys; every build finishes level with the others (`docs/PACING.md`, "Pace by build"). The numbers are proposals.
   - **4j, done (events and 1:1s that speak to a build):** `requires` on an event gains `specs` and `leads` (any one of the list), and a 1:1 prompt gains `specs` and `leads` the same way. Events 111-128 are a build's own (two for each specialization, three for each line; ids 1-110 are unchanged), and 1:1s 14-21 are asked only of a career on that specialization (ranks 8-31) or line (ranks 16-31). Before the pick, only the original pool rolls. The store passes the career's `spec` and `lead` to the event and review clocks.
   - **4k, done (origins, a first slice):** College, Bootcamp and Dropout (`src/data/origins.ts`, `src/game/origin.ts`), picked on the start card in a new step after the handle (a later career opens on it) and kept in the `build` block as `origin`. The pick is open until the career has earned anything, so the card can change its mind. College: theory skills (data, AI, security) a fifth cheaper, 0.5 XP a second, gigs ask 30% more XP. Bootcamp: web skills (frontend, backend) a fifth cheaper and theory a quarter dearer, the Gig Board at 70% of its XP, four gigs open the Job Board. Dropout: gigs pay 30% more, each seeds half again as many users, jobs from Mid-level SWE up ask 25% more XP. Not built from section 1: the origins' own skill rows, their own first jobs, College's student loans and Bootcamp's income share (the costs are the price and gate changes above instead, since a loan or a share needs a balance kept across ticks). `npm run pace -- origins` shows them level with no origin.
   - **4l, done (the progression tree, a faithful model):** `docs/TREE.md`, `src/game/tree/`. One node per row of the game (skills, gigs, jobs, gear, capital, boards, picks, 10x dev perks) with `requires` (a small expression over XP, rows owned, counts, tags, rank, users, money and picks), `after` (layout) and a strict or loose track. The gig, job and board states read it; the old rules are kept as a test oracle and agree on whole careers for every build and origin. `npm run tree` prints it and `explain(ref)` asks it. The structure is authored in `src/data/tree.ts` (the gig path with its skills, the job paths and what each hangs off); the tables keep content and read `priorGigs` and `skillIds` off the path. The shop's `needs` text and `nextUnlock` on `explain`, and the tagged gig board as a data edit, are next; whether the job ladder becomes strict is open.
   - **Still open:** an IC growth effect that is more than a flat step per row, a leadership switch, tuning each build against a target (the pace sim per build exists, `docs/PACING.md`; a click build's fully held multiple lands near 4.2 times, not 5, because a line holds 27 rows or fewer of the 31 it was calibrated on). The fork was removed earlier.
5. **Capital as company moves** that open regions, and the gates that read users.
6. **The tagged gig board.**
7. **Origins** and the start card.
8. **Pacing** to half a day or a day, with a pace sim per build.
9. **Save slots**, opened by the first finished career.

## Calls decided on 2026-10-21

- **The one switch** keeps money, gear and the trunk jobs, loses the old specialization's jobs and starts at the new track's first row. Anything already open stays open (gates latch), so a switch after Senior does not close capital or hide gear.
- **The click build's multiple:** 5 minutes of clicking is worth about 30 minutes of idle. Read as: on a click build, manual clicks at 2 a second pay 5 times the idle $/s while clicking (the other 5 of the 30 minutes is the idle that keeps running), measured with every job the build can see held. Hover and auto clicks do not get the build's multiplier. No return burst for now.

## Calls still open

- What replaces the Founder Legacy perks (admin only, so not urgent).
