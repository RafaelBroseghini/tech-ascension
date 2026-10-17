# Pacing: how long the game takes

How many days of real time it takes to own everything, for someone who does not sit at the game all day: they open it, click and shop for a while, leave, and come back.

"Own everything" is the game's own finish line (`ownsEverything` in `src/game/nextUnlock.ts`): every skill, gig, job, gear row and capital row held at least once. It is the same test that unlocks Hover click. Second copies are optional.

## The formula

```
days ≈ K / pace

pace = idleShare + clicksPerWallSecond × s
```

- **idleShare** is the share of the day the game earns idle income. Each visit earns while you are there, and when you come back the time you were away pays too, but only up to the 8 hour offline cap. Over a repeating pattern of visits and gaps:

  ```
  idleShare = Σ (visit + min(gap, 8 h)) / Σ (visit + gap)
  ```

  For visits evenly spaced `n` times a day, each lasting `a` hours, the gap is `24/n − a`.
- **clicksPerWallSecond** is your clicking averaged over the whole day: clicks per second × (time at the game ÷ time in the cycle).
- **s = 0.68** is what a click adds once every job is held: the sum of the jobs' `clickPct`, as a fraction of idle $/s (`FINAL_CLICK_SHARE`). Jobs are the only source of that share, so clicking is worth much more late in the game than early.
- **K** is a constant in days that says how well you reinvest:

  | Player | K | Who they are |
  | --- | --- | --- |
  | Collector | 9 | Buys what the shop lists and a second copy only when it earns itself back within an hour, which is almost never |
  | Reinvestor | 4 | Also re-buys anything that earns itself back within two days |

Worked example, three visits a day of 15 minutes, clicking twice a second. The cycle is 8 hours, so you are away 7.75 hours, under the cap, and `idleShare` is 1. You click 2 × 900 s × 3 visits = 5,400 times a day, which is 0.0625 clicks per wall-clock second. `pace = 1 + 0.0625 × 0.68 = 1.04`, so a reinvestor needs about 4 / 1.04 = 3.8 days and a collector about 9 / 1.04 = 8.7 days.

Once a day for 30 minutes: you are away 23.5 hours but only 8 count, so `idleShare = (0.5 + 8) / 24 = 0.35`. Clicking adds `2 × 0.5 / 24 × 0.68 = 0.03`. `pace = 0.38`, which is 11 days for a reinvestor and 24 for a collector.

## What it gives

Days of real time, from the model (`src/game/pace.ts`) and from the formula. "Hands-on" is the time actually spent at the game, visits × minutes, until it finishes. Regenerate with `npm run pace`.

| Player | Visits | Minutes | Clicks/s | Idle share | Pace | Reinvestor: model / formula | Collector: model / formula | Hands-on (reinvestor / collector) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Left open, clicking in bursts | 24/day | 15 | 2 | 1.00 | 1.34 | 2.7 / 3.0 days | 6.2 / 6.7 days | 16 h / 37 h |
| Hardcore | 6/day | 20 | 3 | 1.00 | 1.17 | 3.2 / 3.4 days | 7.5 / 7.7 days | 6 h / 15 h |
| Regular | 3/day | 15 | 2 | 1.00 | 1.04 | 4.3 / 3.8 days | 9.0 / 8.6 days | 3 h / 7 h |
| Commuter | 2/day | 10 | 2 | 0.68 | 0.70 | 6.5 / 5.7 days | 14.0 / 12.9 days | 2 h / 5 h |
| Daily | 1/day | 30 | 2 | 0.35 | 0.38 | 11.0 / 10.5 days | 25.0 / 23.5 days | 6 h / 13 h |
| Daily, short | 1/day | 10 | 2 | 0.34 | 0.35 | 13.0 / 11.4 days | 28.0 / 25.7 days | 2 h / 5 h |
| Every other day | 0.5/day | 30 | 2 | 0.18 | 0.19 | 22.0 / n/a days | 50.0 / 47.1 days | 6 h / 13 h |
| Weekly | 0.14/day | 30 | 2 | 0.05 | 0.05 | 168 / n/a days | 182 / 165 days | 12 h / 13 h |

To try your own: `npm run pace -- 3 15 2` takes visits per day, minutes per visit and clicks per second. It also prints the day each milestone is reached. The full table run ends with the best-fit `K` for each player, over the schedules that visit at least daily.

> The figures below predate the removal of the whiteboard interviews. Rerun `npm run pace` for the current numbers.

## Reading it

- **Leaving is free up to 8 hours.** While your visits are no more than 8 hours apart, `idleShare` is 1 and nothing is wasted. Past that, every extra hour away earns nothing. A night's sleep is fine; a long work day on top of it loses the hours past 8.
- **Visits matter more than clicks.** Below three visits a day, one more visit adds up to 8 hours of income. A whole visit of clicking adds a few percent: 15 minutes at 2 clicks a second, three times a day, is +4%.
- **Almost all of the time is the last capital row.** A collector with the Regular schedule has every skill, gear row and job within about 2 days and then waits for the last capital row, Mars megacampus Holdings ($1e17). With every other row owned and nothing re-bought, its price alone is 6.6 days of full income. `K = 9` for a collector is that 6.6 plus about 2.4 days of getting to that income. The script prints the first number from the tables.
- **Reinvesting is worth about 2.2×.** Re-buying second copies raises income past what first copies give, so a reinvestor finishes in well under the days that the last row alone costs a collector. Past about two days of payback it stops helping and starts to waste money: in the model, a player who re-buys everything takes months.
- **Total hands-on time is modest.** A Regular reinvestor spends about 6 hours at the game over a week and a bit; a Daily collector about 28 hours over eight weeks. The wall-clock numbers are long because most of that time the game is waiting for money.

## What the model assumes

`simulatePace` in `src/game/pace.ts` plays the real tables with the real gates and the game's own economy functions, so a table change moves the answer.

- You visit `visitsPerDay` times, evenly spaced, for `minutesPerVisit` each, clicking `clicksPerSec` the whole visit. You buy only while you are there.
- Time away pays idle income and idle XP, up to the offline cap, once, when you return.
- You take every gig and job as soon as it opens, and buy a first copy of anything as soon as you can afford it.
- A second copy of a skill, gear row or capital row is bought only if it earns itself back within the player's payback limit (an hour for the collector, two days for the reinvestor), best payback first.
- Random events and click boosts are left out, so this is an estimate with no luck in it. They would move the real number, by how much is not modeled.

## How far to trust it

- **Collector: within about 10% of the model** at every schedule in the table. **Reinvestor: within about 20%**, and only when you visit at least daily (Left open reads 11% long; Regular, Commuter and Daily short read about 12% short). The reinvestor constant does not hold for visits further apart than a day, because a two day payback is out of reach when you only shop every other day. The table shows `n/a` there. Use the collector's constant.
- **The two players are the honest uncertainty.** A real player sits between them, so the answer is a range with a factor of about 2.2 across it, not a single number.
- **The player is simple.** Clicking is a steady rate for the whole visit, shopping takes no time, and the shopper never plans ahead. A real player clicks in bursts and sometimes saves for a big row. The model only needed to be right about the shape.
- **It is only as good as the tables.** `src/game/pace.test.ts` checks the formula against the model for four schedules and fails if the constants drift past 12% (collector) or 20% (reinvestor). When it does, rerun `npm run pace`, refit `PACE_K` in `src/game/pace.ts`, and update this page.

## Changing the pace

Each is the formula's answer, with the first one checked against the model.

- **Price of the last capital row.** It is most of a collector's time. A reinvestor barely notices a cut, because their time is set by how fast income grows, because their time is set by how fast income grows, not by the last price.
- **The 8 hour offline cap** (`OFFLINE_CAP_MS` in `src/game/save.ts`). It is the main limit on a once-a-day player. At 12 hours, the Daily player's `idleShare` goes from 0.35 to 0.52, and pace from 0.38 to 0.55, about 45% faster. It changes nothing for anyone who already visits every 8 hours. If you change the cap, change `OFFLINE_CAP_SECONDS` in `src/game/pace.ts` too; a test checks they match.
- **Job click share.** `s` is the sum of the jobs' `clickPct`. It only matters to someone who clicks a lot.

## Product revenue

Served users pay a few cents a second, so the product earns next to the day job. Dropped users pay nothing. `arpuOf(users)` in `src/game/globe/load.ts` is the dollars a second one served user pays, and `revenuePerSec` is served users times that. The numbers come from `/tmp/arpu-sim/sim.ts`, which runs the real tables.

Three targets set it: 1,000 served users pay about the internship ($8/s), about 1M pay about the Senior SWE ($200/s), and at 1B the product is a real share of upper-era capital (rows 6-11 pay $695,000/s together; rows 1-5 pay $16,050/s). A flat ARPU cannot do all three. $0.008 matches the internship but pays $8,000/s at 1M, forty Senior salaries. $0.0002 matches the Senior at 1M and gives 29% of upper capital at 1B, but a thousand users then pay $0.20/s, 3% of an internship. So ARPU falls with scale: a small crowd is worth a salary, a big one pays pennies each. The pick is one function, `ARPU_BASE * (1 + ARPU_EARLY / (1 + users / ARPU_KNEE))` with a base of $0.0002, an early bonus of 80 and a knee at 1,000 users. It pays $0.0082 a user at 1k, $0.00022 at 1M and $0.0002 from 100M on. Revenue still rises with every user, only slower per head. The "gear" column is the cheapest serving gear (greedy on price per request) that keeps up with that many users, at 0.1 requests a second each; it is what the crowd costs to serve, and the gear pays its own $/s too.

| Users | Gear to serve them | Flat $0.0002 | Flat $0.002 | Flat $0.008 | Chosen curve |
| --- | --- | --- | --- | --- | --- |
| 1k | $1.4k | $0.20/s | $2.00/s | $8.00/s | $8.00/s |
| 100k | $1.8M | $20/s | $200/s | $800/s | $35/s |
| 1M | $1.8M | $200/s | $2.0k/s | $8.0k/s | $216/s |
| 100M | $321M | $20k/s | $200k/s | $800k/s | $20k/s |
| 1B | $13.5B | $200k/s | $2.0M/s | $8.0M/s | $200k/s |
| 7B | $520B | $1.4M/s | $14M/s | $56M/s | $1.4M/s |

Reference incomes: internship $8/s, Senior SWE $200/s, capital rows 1-5 $16,050/s, rows 6-11 $695,000/s. The chosen curve gives 1.0 internships at 1k, 1.08 Seniors at 1M, and 29% of upper capital (12.5 times mid capital) at 1B. At 7B it pays $1.4M/s, about the whole of q3 capital (rows 12-14 pay $6.5M/s). Product revenue is not scaled by the event multipliers, so it stays the same size under a boost.

## The fork

The fork (`src/game/globe/track.ts`) opens at 1,000 users with a job held. A founder loses the salary, grows twice as fast, earns three times as much from served users, and carries a burn: `burnOf(users) = 60 + 1.2 × √users` dollars a second. The numbers come from `/tmp/fork-sim/` (`gear.ts` and `table.ts` for the static table, `dyn.ts` for the walk), which run the real tables: `stepCompany` with the track's multipliers, `isGearRevealed` with the jobs held, the 1.15 price growth, and a founder who buys the cheapest serving gear (price per `cps`) whenever demand passes 70% of capacity.

The shape of the pick. Revenue grows about linearly with users once the crowd is big, and gear income grows faster than that, so a burn that grows with the square root of the crowd loses at the fork, where the gear is a laptop's worth, and wins later, where it is a rack. The floor of 60 sets the loss at 1,000 users (about what a mid-C player holds covers 10 to 40 minutes of it). The root term keeps the burn near a quarter of revenue-plus-gear at a million users, so a founder who has bought the gear that serves his users is far in profit, and one who has not is dropping requests and bleeding.

Static, with the cheapest gear that serves the crowd (no salary, no equity given up):

| Users | Burn | Gear to serve them | Gear $/s | Revenue ×3 | Net |
| --- | --- | --- | --- | --- | --- |
| 1.00k | $97.9/s | $1.36k | $13.0/s | $24.6/s | -$60.3/s |
| 3.00k | $126/s | $3.06k | $28.0/s | $37.8/s | -$59.9/s |
| 10.0k | $180/s | $10.2k | $84.0/s | $49.6/s | -$46.4/s |
| 100k | $439/s | $1.81M | $8.64k/s | $108/s | +$8.31k/s |
| 1.00M | $1.26k/s | $1.81M | $8.64k/s | $648/s | +$8.03k/s |
| 10.0M | $3.85k/s | $21.9M | $90.0k/s | $6.05k/s | +$92.2k/s |
| 100M | $12.1k/s | $321M | $970k/s | $60.0k/s | +$1.02M/s |
| 1.00B | $38.0k/s | $13.5B | $8.36M/s | $600k/s | +$8.92M/s |
| 7.00B | $100k/s | $520B | $59.7M/s | $4.20M/s | +$63.8M/s |

The gear cliff is in the existing tables: $10k of gear serves 10k users and 100k users need $1.8M. A founder that outgrows the cheap gear before he can afford the next tier drops requests, and the burn keeps running. That is the risk the fork prices.

Walked with `stepCompany` (a founder buying gear greedily, six hours, no incidents), from three starting points a player might quit at:

| Start | Jobs | Money | Users | Net at the fork | Runway at the fork | Founder, six hours | Ladder, six hours |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A, thin gear | 1-3 | $20k | 1k | +$19/s | none | runs out at 10 min, 48k users | 1.3M users |
| B | 1-5 | $50k | 3k | -$58/s | 14 min | never, 1.9M users | 1.3M users |
| C | 1-8 | $100k | 10k | -$44/s | 38 min | never, 5.0M users | 3.4M users |

A is the gamble: little cash, thin gear, and growth that outruns it. B and C show a loss at the fork with a runway of tens of minutes, and a founder who keeps buying serving gear is net positive within an hour (B: +$887/s at 60 minutes; C: +$4,988/s at 30). Burns tried and left: `20 + 2.5√u` (all three starts run out within 6 minutes), `30 + 1.5√u` (A and B run out at 9 to 10 minutes), `40 + 1.2√u` (nobody runs out, but A is already profitable at the fork, and B has 22 minutes of runway with no pressure to buy gear).

What the ladder multiplier does to the road to the fork. With two serving cloud packs and gigs 1-8, a ladder career reaches 1,000 users in about 64 minutes, against 16 before the track (×1) and 8 as a founder (×2). That is the cost of nights and weekends, and it is the point: the fork is something you reach, not something the game starts with.

Decisions behind the numbers: a founder cannot take a job (`buyJob` is refused), so gear gated on a higher job than he holds stays out of reach until he returns to the ladder; going back for the run-out choice gives up the highest job, and a lone first job stays; the equity given up applies to the product revenue on either track; ×0.25 on the ladder is the figure from the build brief, not the ×0.5 that `docs/COMPANY_ARC.md` mentions for the return.
