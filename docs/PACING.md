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
  | Collector | 21 | Buys what the shop lists and a second copy only when it earns itself back within an hour, which is almost never |
  | Reinvestor | 8 | Also re-buys anything that earns itself back within two days |

Worked example, three visits a day of 15 minutes, clicking twice a second. The cycle is 8 hours, so you are away 7.75 hours, under the cap, and `idleShare` is 1. You click 2 × 900 s × 3 visits = 5,400 times a day, which is 0.0625 clicks per wall-clock second. `pace = 1 + 0.0625 × 0.68 = 1.04`, so a reinvestor needs about 8 / 1.04 = 7.7 days and a collector about 21 / 1.04 = 20 days.

Once a day for 30 minutes: you are away 23.5 hours but only 8 count, so `idleShare = (0.5 + 8) / 24 = 0.35`. Clicking adds `2 × 0.5 / 24 × 0.68 = 0.03`. `pace = 0.38`, which is 21 days for a reinvestor and 55 for a collector.

## What it gives

Days of real time, from the model (`src/game/pace.ts`) and from the formula. "Hands-on" is the time actually spent at the game, visits × minutes, until it finishes. Regenerate with `npm run pace`.

| Player | Visits | Minutes | Clicks/s | Idle share | Pace | Reinvestor: model / formula | Collector: model / formula | Hands-on (reinvestor / collector) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Left open, clicking in bursts | 24/day | 15 | 2 | 1.00 | 1.34 | 5.5 / 6.0 days | 14.6 / 15.7 days | 33 h / 88 h |
| Hardcore | 6/day | 20 | 3 | 1.00 | 1.17 | 5.8 / 6.8 days | 17.2 / 17.9 days | 12 h / 34 h |
| Regular | 3/day | 15 | 2 | 1.00 | 1.04 | 7.7 / 7.7 days | 20.3 / 20.1 days | 6 h / 15 h |
| Commuter | 2/day | 10 | 2 | 0.68 | 0.70 | 12.0 / 11.4 days | 31.0 / 30.0 days | 4 h / 10 h |
| Daily | 1/day | 30 | 2 | 0.35 | 0.38 | 22.0 / 20.9 days | 56.0 / 54.9 days | 11 h / 28 h |
| Daily, short | 1/day | 10 | 2 | 0.34 | 0.35 | 28.0 / 22.9 days | 63.0 / 60.0 days | 5 h / 11 h |
| Every other day | 0.5/day | 30 | 2 | 0.18 | 0.19 | 88 / n/a days | 114 / 110 days | 22 h / 29 h |
| Weekly | 0.14/day | 30 | 2 | 0.05 | 0.05 | 392 / n/a days | 406 / 384 days | 28 h / 29 h |

To try your own: `npm run pace -- 3 15 2` takes visits per day, minutes per visit and clicks per second. It also prints the day each milestone is reached.

## Reading it

- **Leaving is free up to 8 hours.** While your visits are no more than 8 hours apart, `idleShare` is 1 and nothing is wasted. Past that, every extra hour away earns nothing. A night's sleep is fine; a long work day on top of it loses the hours past 8.
- **Visits matter more than clicks.** Below three visits a day, one more visit adds up to 8 hours of income. A whole visit of clicking adds a few percent: 15 minutes at 2 clicks a second, three times a day, is +4%.
- **Almost all of the time is the last capital row.** A collector with the Regular schedule has every skill, gear row and job by day 2 and then waits until day 20 for the last capital row, Mars megacampus Holdings ($1e17). With every other row owned and nothing re-bought, its price alone is 15.5 days of full income. `K = 21` for a collector is that 15.5 plus about 5.5 days of getting to that income. The script prints the first number from the tables.
- **Reinvesting is worth about 2.6×.** Re-buying second copies raises income past what first copies give, so a reinvestor finishes in well under the 15.5 days that the last row alone costs a collector. Past about two days of payback it stops helping and starts to waste money: in the model, a player who re-buys everything takes months.
- **Total hands-on time is modest.** A Regular reinvestor spends about 6 hours at the game over a week and a bit; a Daily collector about 28 hours over eight weeks. The wall-clock numbers are long because most of that time the game is waiting for money.

## What the model assumes

`simulatePace` in `src/game/pace.ts` plays the real tables with the real gates and the game's own economy functions, so a table change moves the answer.

- You visit `visitsPerDay` times, evenly spaced, for `minutesPerVisit` each, clicking `clicksPerSec` the whole visit. You buy only while you are there.
- Time away pays idle income and idle XP, up to the offline cap, once, when you return.
- You take every gig and job as soon as it opens, and buy a first copy of anything as soon as you can afford it.
- A second copy of a skill, gear row or capital row is bought only if it earns itself back within the player's payback limit (an hour for the collector, two days for the reinvestor), best payback first.
- Random events and click boosts are left out, so this is an estimate with no luck in it. They would move the real number, by how much is not modeled.

## How far to trust it

- **Collector: within about 8% of the model** at every schedule in the table. **Reinvestor: within about 20%**, and only when you visit at least daily (Hardcore reads 17% long, Daily short 18% short). The reinvestor constant does not hold for visits further apart than a day, because a two day payback is out of reach when you only shop every other day. The table shows `n/a` there. Use the collector's constant.
- **The two players are the honest uncertainty.** A real player sits between them, so the answer is a range with a factor of about 2.6 across it, not a single number.
- **The player is simple.** Clicking is a steady rate for the whole visit, shopping takes no time, and the shopper never plans ahead. A real player clicks in bursts and sometimes saves for a big row. The model only needed to be right about the shape.
- **It is only as good as the tables.** `src/game/pace.test.ts` checks the formula against the model for four schedules and fails if the constants drift past 12% (collector) or 20% (reinvestor). When it does, rerun `npm run pace`, refit `PACE_K` in `src/game/pace.ts`, and update this page.

## Changing the pace

Each is the formula's answer, with the first one checked against the model.

- **Price of the last capital row.** It is most of a collector's time. Halving it takes the Regular collector from 20.3 days to 13.0. A reinvestor barely notices (7.7 to 7.0), because their time is set by how fast income grows, not by the last price.
- **The 8 hour offline cap** (`OFFLINE_CAP_MS` in `src/game/save.ts`). It is the main limit on a once-a-day player. At 12 hours, the Daily player's `idleShare` goes from 0.35 to 0.52, and pace from 0.38 to 0.55, about 45% faster. It changes nothing for anyone who already visits every 8 hours. If you change the cap, change `OFFLINE_CAP_SECONDS` in `src/game/pace.ts` too; a test checks they match.
- **Job click share.** `s` is the sum of the jobs' `clickPct`. It only matters to someone who clicks a lot.
