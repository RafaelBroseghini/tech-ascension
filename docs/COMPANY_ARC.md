# Company arc: one product, built on nights and weekends

Status: the fork (quit the job and go founder) is removed; see `docs/BUILDS.md`. There is one kind of career, the old ladder. Steps 1 (names and the intro), 2 (users pay), 4 (hires and the endings) and 7 (the Exit) are built. Step 3 (the fork) was built and then removed. Steps 5 (capital as company moves) and 6 (story events) are plan.

## The story

You have a used laptop and an idea. The idea becomes a product. The product is yours for the whole game: it is the globe. Gigs pay rent and bring its first customers. Jobs pay for its servers at night and on weekends. Its finish line is eight billion users.

## 1. First-run intro

The start card (`IdentityPicker`) is the first modal. It is a short intro of four beats (the handle, an origin, the product, the bet), with one card and a Next button, and no typing.

1. **Who you are.** Your handle (`quiet-otter`), with Reroll. "High school. A used laptop. Big plans."
2. **What you're building.** A product name drawn to match the handle (`Otterly`), with its own Reroll, and a small globe with one dot on it. "Every career here builds one product. Gigs and jobs pay for it. Its users are the score. The goal is eight billion."
3. **The bet.** Build the product on nights and weekends while the day job pays the bills. Then Start keeps both names for good.

Both names are saved in the `profile` block. Esc and the backdrop keep what is on screen. The card stays under 640 px tall so a phone shows it whole.

## 2. Growth, hires and the endings

Jobs pay salary and teach XP. The product grows at the player's own pace (`GROWTH_PER_SEC` in `src/game/globe/world.ts`, a growth multiplier of 1 before the hires and the perks), and the gear is the throttle, so 8B takes the shop's whole day. Gear and regions are bought out of salary. Capital rows stay as they are today: you invest in other companies.

**Hires.** You can't give the product your days, so you pay people who can. A Hires row in the Company tab sells smart people, cheapest first: an outsourced body shop, a bootcamp grad, a Stack Overflow copy-paster, a senior engineer, a staff engineer, a 10x developer, a greybeard, a code god. Each is hired again and again, costs a salary a second per head and adds growth. Hiring is how a career reaches 8B in reasonable time, but the people you hired do the growing, and the game keeps count. The product tracks how many of its users came from growth your hires added (`hiredUsers`, against the total). The numbers are in `docs/PACING.md`.

**The win.** At 8B users everything you earn from then on is × 1.25 for good. Nothing is ever wiped, and there is no game over, because an idle game should not punish leaving the tab open.

**How the win reads.** Two endings, picked when the win latches.
- **Night owl, mostly your own growth.** "Eight billion users, on nights and weekends. Go to bed."
- **Executive sponsor, over half of the users came from hires.** The game mocks you, kindly. "Eight billion users. Your team was incredible. You were in a lot of their standups." The journal entry and the LinkedOut line say the same ("Executive sponsor, Otterly"). The × 1.25 still pays.

**The fork, removed.** A second mode let the player quit the job and run the product full-time (growth × 2, revenue × 3, a burn, a runway, bridges that cost equity, a way back to a job, and a founder ending). It was hidden from play and then taken out: nothing in a career now depends on a track. `docs/BUILDS.md` plans the branches that replace it (the IC and Manager paths).

## 3. Users pay

Each served user pays a small amount a second (`ARPU`), shown as "Product revenue" in $/s and on the status page. Dropped users pay nothing. That makes the loop:

gear → served users → revenue → more gear and regions → more users.

Product revenue overtakes salary somewhere around the upper era. `docs/PACING.md` has the table.

## 4. Story beats

These use the existing event system, with a new `requires` on users:

- **Nights and weekends.** "Your manager asks about the side project." A gift or a trade: keep it quiet, or show them and get a bonus.
- **1B users.** "An acquisition offer." Take it for a huge lump, and the product keeps running under your name, with growth × 0.75. Or decline and keep the upside.

## 5. Names in the UI

The product name replaces "Your company" wherever it shows:

- the activity-bar tooltip;
- the Company tab header;
- the status page ("Current Status: Otterly");
- the journal ("Otterly reached one million users").

LinkedOut lists each sold product under Experience: "Founder, Otterly" once it wins (the player founded the product), "Side project, Otterly" otherwise. GitHug pins the repo.

## Build order

Each step ships and verifies on its own.

1. **Names.** Product name in `profile`, the intro card's three beats, and the name across the UI. Copy and identity only, no economy change.
2. **Users pay.** ARPU, product revenue in $/s, and a pacing simulation with a PACING.md table.
3. **The fork.** Built, then removed (see section 2).
4. **Hires and the endings.** The Hires row, `hiredUsers`, and the two win texts. Smoke steps: a win with hires reads the mocking line.
5. **Capital as company moves.** Reword the 25 rows as the company's own moves ("Raise a seed round", "Acquire a rival", "Build a training campus"), and make each one feed capacity or reach.
6. **Story events.**
7. **The Exit.** Selling the product for Prestige, and a new product for the next career. Built in `docs/PRESTIGE.md`.

## Decided

- The product grows slowly on its own; exec salaries are not raised to balance it.
- Hires are how a career speeds up, and a win carried by hires is mocked at the end.
- There is no quitting the job for the product.

## Calls still open

- **The mocking threshold.** Over half the users from hires. It could also be graded (a quarter gets a gentler jab).
