# Pacing: how long the game takes

How many days of real time it takes to own everything, for someone who does not sit at the game all day: they open it, click and shop for a while, leave, and come back.

"Own everything" is the game's own finish line (`ownsEverything` in `src/game/nextUnlock.ts`): every skill, gig, job, gear row and capital row held at least once. It is the same test that unlocks Auto-click. Second copies are optional.

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
  | Collector | 0.8 | Buys what the shop lists and a second copy only when it earns itself back within an hour, which is almost never |
  | Reinvestor | 0.9 | Also re-buys anything that earns itself back within two days |

  Both are under a day because a career is about a day long now (the capital tail was cut, see "Changing the pace"), and the two are close because there is no longer time for a second copy to repay itself: the lifetime XP that the last skill waits on, a day in, sets the floor for both. The old constants were 9 and 4, when the last capital row took days.

Worked example, three visits a day of 15 minutes, clicking twice a second. The cycle is 8 hours, so you are away 7.75 hours, under the cap, and `idleShare` is 1. You click 2 × 900 s × 3 visits = 5,400 times a day, which is 0.0625 clicks per wall-clock second. `pace = 1 + 0.0625 × 0.68 = 1.04`, so a reinvestor needs about 0.9 / 1.04 = 0.9 days and a collector about 0.8 / 1.04 = 0.8 days.

Once a day for 30 minutes: you are away 23.5 hours but only 8 count, so `idleShare = (0.5 + 8) / 24 = 0.35`. Clicking adds `2 × 0.5 / 24 × 0.68 = 0.03`. `pace = 0.38`, which is 2.4 days for a reinvestor and 2.1 for a collector.

## What it gives

Days of real time, from the model (`src/game/pace.ts`) and from the formula. "Hands-on" is the time actually spent at the game, visits × minutes, until it finishes. Regenerate with `npm run pace`.

| Player | Visits | Minutes | Clicks/s | Idle share | Pace | Reinvestor: model / formula | Collector: model / formula | Hands-on (reinvestor / collector) | Longest wait, visits (reinvestor / collector) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Left open, clicking in bursts | 24/day | 15 | 2 | 1.00 | 1.34 | 0.6 / 0.7 days | 0.5 / 0.6 days | 4 h / 3 h | 1 / 1 |
| Hardcore | 6/day | 20 | 3 | 1.00 | 1.17 | 0.8 / 0.8 days | 0.7 / 0.7 days | 2 h / 1 h | 0 / 0 |
| Regular | 3/day | 15 | 2 | 1.00 | 1.04 | 1.0 / 0.9 days | 0.7 / 0.8 days | 1 h / 1 h | 0 / 0 |
| Commuter | 2/day | 10 | 2 | 0.68 | 0.70 | 1.5 / 1.3 days | 1.5 / 1.1 days | 1 h / 1 h | 0 / 0 |
| Daily | 1/day | 30 | 2 | 0.35 | 0.38 | 2.0 / 2.4 days | 3.0 / 2.1 days | 1 h / 2 h | 0 / 0 |
| Daily, short | 1/day | 10 | 2 | 0.34 | 0.35 | 3.0 / 2.6 days | 3.0 / 2.3 days | 1 h / 1 h | 0 / 0 |
| Every other day | 0.5/day | 30 | 2 | 0.18 | 0.19 | 6.0 / n/a days | 6.0 / 4.2 days | 2 h / 2 h | 0 / 0 |
| Weekly | 0.14/day | 30 | 2 | 0.05 | 0.05 | 21.0 / n/a days | 35.0 / 14.6 days | 2 h / 3 h | 0 / 0 |

The finish is a whole number of visits, so a schedule with a long gap between visits reads in steps and the formula is only close, within about a third (the test allows 35%).

**Longest wait** is the most visits in a row that bought no first copy of anything (a skill, gig, job, gear or capital row) before the career owned everything. The model only buys at visits, so a wait is counted in visits. A career that ends in a day should never come back to nothing new: for the target player (4 visits a day of 5 minutes, 2 clicks a second) both players wait 0 visits and own everything on day 1.00, and `pace.test.ts` pins at most 1.

To try your own: `npm run pace -- 3 15 2` takes visits per day, minutes per visit and clicks per second. It also prints the day each milestone is reached. The full table run ends with the best-fit `K` for each player, over the schedules that visit at least daily.

## Over several careers (the Exit)

**Stale after the capital tail cut.** The Exit constants and the targets below were tuned for careers that took days; careers now take about a day, so the first Exit pays over a hundred Prestige and the targets and sweep below no longer hold (the Exit is admin-only and was left alone). The first career table and the `falling` and Long weekend figures are regenerated; the sweep table and the one-of-each narrative are the old numbers.

`simulateExits` in `src/game/pace.ts` plays the same player through the Exit (`docs/PRESTIGE.md`): the first career leaves once the Exit would raise the Prestige bonus enough, every career after that can leave at any visit. After each Exit it spends the Prestige on the cheapest perk it can pay for across the Network, Founder and Capital tracks (Network first on ties), applies the Prestige multiplier to every income and XP rate, and stops when a career owns everything **and** has won the world. `npm run pace` prints it for the Regular player after the table; `npm run pace -- exit [visits minutes clicks] [falling]` prints it for any profile.

**The single-run table does not model the product.** `simulatePace` leaves it out; only `simulateExits` models it:

- **Modeled.** Users by region, grown with the game's own `advanceCompany`: gigs seed regions, the gear the sim already buys serves them (`capacityOf`), served users pay (`arpuOf`), dropped requests cost, and the footprint is the free home region. The Prestige bonus and Viral loop multiply growth, Platform multiplies revenue, the win at 8B users pays its x1.25 on everything earned after and records the night owl ending and its 5 Prestige. Early adopters seeds 1,000 users; Long weekend lengthens the offline cap; Volume discount, Bulk hardware, Raise season and Compounding change prices and income through the game's own functions.
- **Left out.** Incidents (the random draw never throws one), hires (so only the **night owl** ending can be won: the Hall of Fame's other one is not modeled, and neither is "both in about a month"), regions and points of presence beyond the free home region, and any gear bought to serve users beyond what the one-of-each and stacker rules already buy. A one-of-each player never buys enough serving gear to win the world in the first career; a later career wins on the Prestige growth bonus.

Product revenue is not in the single-run table, so that table reads the same whether or not a career has a product. In `simulateExits`, the product changes when the world is won: the one-of-each player does not win within 60 days of a career with no Prestige.

The player leaves at the first visit where the Exit would raise the Prestige bonus by 15% or more (`EXIT_MIN_GROWTH`; the `×A → ×B` on the button). The textbook rule, "leave when Prestige per hour starts to fall", is `falling`: with the product it leaves a visit or two after the Regular player does (day 1.33 for the one-of-each player and 1.67 for the stacker, against day 1.00) and both finish in career 2 on day 2.3, so it does not test the replay either.

Tuned constants (`src/data/legacy.ts`), kept at their original values because they still land: `PRESTIGE_EARN_SCALE = 5e11` (the first Prestige needs $5e11 earned across careers: the Exit opens around day 1.0 and is taken a visit or two later), `PRESTIGE_MULT_PER = 0.03` and `ENDING_BONUS = 5`. Swept around them for the Regular player (3 visits a day of 15 minutes, 2 clicks a second). The first row is measured at the 8B target; the other rows were swept at the old 7B target and are kept for their direction:

| Scale | Per Prestige | Ending bonus | First Exit (stacker / one-of-each) | Done (stacker / one-of-each) |
| --- | --- | --- | --- | --- |
| 5e11 | 0.03 | 5 | day 1.67 +5 / day 2.00 +6 | career 6, day 12.3 / career 7, day 19.0 |
| 5e11 | 0.03 | 10 | day 1.67 +5 / day 2.00 +6 | career 7, day 14.0 / career 6, day 16.0 |
| 5e11 | 0.06 | 5 | day 1.33 +3 / day 1.67 +3 | career 9, day 14.3 / career 8, day 15.3 |
| 3e11 | 0.03 | 5 | day 1.67 +6 / day 2.00 +7 | career 7, day 13.7 / career 7, day 17.7 |
| 1e12 | 0.03 | 5 | day 2.00 +7 / day 2.00 +5 | career 6, day 13.7 / career 6, day 18.0 |
| 2e11 | 0.10 | 5 | day 1.00 +2 / day 1.33 +3 | career 7, day 9.3 / career 9, day 12.0 |

A larger bonus per Prestige finishes in more careers, not fewer (each Exit pays fewer rungs), and a smaller scale pays the first Exit earlier for more Prestige but also adds careers.

The stacker, career by career (users at the Exit, Prestige paid, the bonus after):

| Career | Day in | Day out | Row 6 after (days) | Matched last career's earnings after (days) | Users | Perks held | Prestige paid | Prestige total | Bonus |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 0.00 | 1.67 | 0.67 | - | 343M | 0 | 5 | 5 | ×1.15 |
| 2 | 1.67 | 3.67 | 0.34 | 1.67 | 620M | 3 | 7 | 12 | ×1.36 |
| 3 | 3.67 | 6.00 | 0.34 | 2.00 | 2.0B | 5 | 14 | 26 | ×1.78 |
| 4 | 6.00 | 8.33 | 0.34 | 2.01 | 4.9B | 7 | 18 | 44 | ×2.32 |
| 5 | 8.33 | 10.33 | 0.33 | 2.00 | 8.2B | 9 | 16 (+5 ending) | 60 | ×2.80 |
| 6 | 10.33 | 12.33 (done) | 0.33 | 2.00 | 8.2B | 10 | - | 60 | ×2.80 |

Long weekend only matters where the 8 hour cap binds: for a once-a-day player (`npm run pace -- exit 1 30 2`) it lifts the cap to 12 hours from the second career, and the stacker is done in the 2nd career on day 5.0 and the one-of-each player in the 3rd, also on day 5.0.

The one-of-each player's run is the same shape, one career longer: Exits on days 2.0, 4.3, 7.0, 10.0, 13.3, 16.0, done on day 19.0 in career 7, the world first won in career 6 (+5 Prestige for the night owl ending). At the old 7B target it was done on day 16.3 in career 6; the extra billion users is the seventh career.

Against the targets for the Regular player (all stale after the tail cut; the old results are kept for the record, and `pace.test.ts` now pins the model's own output):

- **First Exit around day 1.5 to 2:** met (1.67 and 2.00).
- **Career 2 reaches the point where career 1 exited in under half the time:** met for the **capital row**: row 6 comes 0.34 days in against 0.67 (one visit; the model cannot see faster than the 8 hours between visits). **Not met for earnings:** career 2 earns what career 1 earned in all after 1.67 days, for both players, against career 1's 1.67 days (stacker) and 2.00 (one-of-each). Income grows exponentially through the second day, so a head start of a few hours saves a few hours, and no value of the three knobs fixes it in the sweep above (the best case, 0.06 per Prestige, takes 0.80 of the first career's time and finishes in 8 to 9 careers). The perks are for the player who plays the early game by hand.
- **The career that owns everything (or wins the world, whichever is later) is the 4th to 7th, two to three weeks:** met (6th on day 12.3 for the stacker, 7th on day 19.0 for the one-of-each player). `pace.test.ts` checks it.
- **Both endings in about a month:** not checked. The model has no hires, so it can only reach the night owl ending (career 6 for the one-of-each player). The first Exit after a win pays the 5 Prestige once.

## Reading it

- **Leaving is free up to 8 hours.** While your visits are no more than 8 hours apart, `idleShare` is 1 and nothing is wasted. Past that, every extra hour away earns nothing. A night's sleep is fine; a long work day on top of it loses the hours past 8.
- **Visits matter more than clicks.** Below three visits a day, one more visit adds up to 8 hours of income. A whole visit of clicking adds a few percent: 15 minutes at 2 clicks a second, three times a day, is +4%.
- **The capital tail no longer sets the time.** It used to: the last capital row, Mars megacampus Holdings, was $4.3e16 after the purchase scale, 6.6 days of full income on its own, and a Regular career took four to nine days. Rows 12 to 25 are now priced at the square root of their old price over the price of row 11 (see "Changing the pace"), so the last row is $6.0e12 and its price alone is about a minute of full income (the script prints the number). What is left is the lifetime XP the last skill waits on, a day in, and the visits it takes to spend the money.
- **Reinvesting no longer helps.** Re-buying second copies used to raise income past what first copies give. With a career of about a day, a two-day payback buys copies that nothing repays: a Regular reinvestor now finishes about a visit after the collector. The collector's constant is the one to use for planning.
- **Total hands-on time is small.** The target player (4 visits of 5 minutes) is at the game for about 20 minutes to own everything, over one day. The Regular player is there 1 hour. The wall-clock numbers are long only for schedules with long gaps.

## What the model assumes

`simulatePace` in `src/game/pace.ts` (no product; see above for `simulateExits`, which has one) plays the real tables with the real gates and the game's own economy functions, so a table change moves the answer.

- You visit `visitsPerDay` times, evenly spaced, for `minutesPerVisit` each, clicking `clicksPerSec` the whole visit. You buy only while you are there.
- Time away pays idle income and idle XP, up to the offline cap, once, when you return.
- You take every gig and job as soon as it opens, and buy a first copy of anything as soon as you can afford it.
- A second copy of a skill, gear row or capital row is bought only if it earns itself back within the player's payback limit (an hour for the collector, two days for the reinvestor), best payback first.
- Random events and click boosts are left out, so this is an estimate with no luck in it. They would move the real number, by how much is not modeled.

## How far to trust it

- **Both players: within about a third of the model**, for schedules that visit at least daily. A career is about a day now, so the finish is a whole number of visits and the lifetime XP gate on the last skill sets a floor; a formula in days cannot follow steps that coarse more closely than that. The reinvestor constant does not hold for visits further apart than a day, because a two day payback is out of reach when you only shop every other day. The table shows `n/a` there. Use the collector's constant.
- **The two players are close.** With the tail cut they finish within about one visit of each other, so the answer is a single number, not a range.
- **The player is simple.** Clicking is a steady rate for the whole visit, shopping takes no time, and the shopper never plans ahead. A real player clicks in bursts and sometimes saves for a big row. The model only needed to be right about the shape.
- **It is only as good as the tables.** `src/game/pace.test.ts` checks the formula against the model for four schedules and fails if the constants drift past 35%. When it does, rerun `npm run pace`, refit `PACE_K` in `src/game/pace.ts`, and update this page.

## Changing the pace

Each is the formula's answer, with the first one checked against the model.

- **Price of the late capital rows.** The tail was most of a collector's time. Rows 12 to 25 (era q3 and end) are repriced as `P × (old / P)^0.5` with `P` the price of row 11 ($1e9 before the purchase scale), so each row still costs more than the one before it and the ramp keeps its shape on a log scale, just flatter. Gear is unchanged: once the capital tail was cut, the stacker's gear finished the same day. An exponent of 0.55 or lower reaches day 1.00 for the 4 visits of 5 minutes target (the lifetime XP gate is a day in, so a deeper cut buys nothing); 0.6 leaves the stacker's gear a visit late. The rule uses 0.5. Do not change `PURCHASE_COST_SCALE` for this: it moves the early game too.
- **The 8 hour offline cap** (`OFFLINE_CAP_MS` in `src/game/save.ts`). It is the main limit on a once-a-day player. At 12 hours, the Daily player's `idleShare` goes from 0.35 to 0.52, and pace from 0.38 to 0.55, about 45% faster. It changes nothing for anyone who already visits every 8 hours. If you change the cap, change `OFFLINE_CAP_SECONDS` in `src/game/pace.ts` too; a test checks they match.
- **Job click share.** `s` is the sum of the jobs' `clickPct`. It only matters to someone who clicks a lot.

## Product revenue

Served users pay a few cents a second, so the product earns next to the day job. Dropped users pay nothing. `arpuOf(users)` in `src/game/globe/load.ts` is the dollars a second one served user pays, and `revenuePerSec` is served users times that. The numbers come from a one-off simulation of the real tables (not kept in the repo).

Three targets set it: 1,000 served users pay about the internship ($8/s), about 1M pay about the Senior SWE ($200/s), and at 1B the product is a real share of upper-era capital (rows 6-11 pay $695,000/s together; rows 1-5 pay $16,050/s). A flat ARPU cannot do all three. $0.008 matches the internship but pays $8,000/s at 1M, forty Senior salaries. $0.0002 matches the Senior at 1M and gives 29% of upper capital at 1B, but a thousand users then pay $0.20/s, 3% of an internship. So ARPU falls with scale: a small crowd is worth a salary, a big one pays pennies each. The pick is one function, `ARPU_BASE * (1 + ARPU_EARLY / (1 + users / ARPU_KNEE))` with a base of $0.0002, an early bonus of 80 and a knee at 1,000 users. It pays $0.0082 a user at 1k, $0.00022 at 1M and $0.0002 from 100M on. Revenue still rises with every user, only slower per head. The "gear" column is the cheapest serving gear (greedy on price per request) that keeps up with that many users, at 0.1 requests a second each; it is what the crowd costs to serve, and the gear pays its own $/s too.

| Users | Gear to serve them | Flat $0.0002 | Flat $0.002 | Flat $0.008 | Chosen curve |
| --- | --- | --- | --- | --- | --- |
| 1k | $1.4k | $0.20/s | $2.00/s | $8.00/s | $8.00/s |
| 100k | $1.8M | $20/s | $200/s | $800/s | $35/s |
| 1M | $1.8M | $200/s | $2.0k/s | $8.0k/s | $216/s |
| 100M | $321M | $20k/s | $200k/s | $800k/s | $20k/s |
| 1B | $13.5B | $200k/s | $2.0M/s | $8.0M/s | $200k/s |
| 8B | about $595B | $1.6M/s | $16M/s | $64M/s | $1.6M/s |

Reference incomes: internship $8/s, Senior SWE $200/s, capital rows 1-5 $16,050/s, rows 6-11 $695,000/s. The chosen curve gives 1.0 internships at 1k, 1.08 Seniors at 1M, and 29% of upper capital (12.5 times mid capital) at 1B. At 8B it pays $1.6M/s, about a quarter of q3 capital (rows 12-14 pay $6.5M/s). Product revenue is not scaled by the event multipliers, so it stays the same size under a boost.

## Hires

A career can hire (`src/game/globe/hires.ts`): eight tiers of person, from an outsourced body shop to a code god, each hired again and again. Copy `n` of a tier costs `floor(price × 1.003^n)`, pays a salary a second per head, and adds `growth × (1 − e^(−heads / 400))` to the growth multiplier, so each tier has diminishing returns and a cap. Base prices run $5k to $50B (×10 a tier), salaries $1 to $400/s per head (1, 5, 12, 25, 50, 100, 200, 400), caps 2.5, 3, 3.5, 4, 4.5, 5, 5.7, 6.4. A tier lists once the one before it has a hire.


`src/game/globe/hires.pace.test.ts` runs the real `stepCompany` from 1,000 users to 8B, on the same footprint and serving gear, with no incidents, and a day job that pays $200/s (a Senior SWE). It pins two careers and the test fails if they drift:

| Career | Time to 8B | Ending |
| --- | --- | --- |
| No hires | 11.3 h (0.470 days), 6.3× the hiring career | night owl |
| Spends all its cash on hires (best growth per dollar first, about 2,300 heads in the first three tiers) | 1.80 h (0.075 days) | sponsor (95% of users from hires) |

The bounds are: no hires at least 4× slower than hiring, and the team above half the users. The greedy buyer can open every tier but never gets past copy-paster: the cheap tiers give more growth per dollar until the world is won. Gear, capital and incidents are left out of both, so these are shapes, not forecasts.
