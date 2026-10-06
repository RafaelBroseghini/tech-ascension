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
  | Collector | 8.4 | Buys what the shop lists and a second copy only when it earns itself back within an hour, which is almost never |
  | Reinvestor | 5.3 | Also re-buys anything that earns itself back within two days |

Worked example, three visits a day of 15 minutes, clicking twice a second. The cycle is 8 hours, so you are away 7.75 hours, under the cap, and `idleShare` is 1. You click 2 × 900 s × 3 visits = 5,400 times a day, which is 0.0625 clicks per wall-clock second. `pace = 1 + 0.0625 × 0.68 = 1.04`, so a reinvestor needs about 5.3 / 1.04 = 5.1 days and a collector about 8.4 / 1.04 = 8.1 days.

Once a day for 30 minutes: you are away 23.5 hours but only 8 count, so `idleShare = (0.5 + 8) / 24 = 0.35`. Clicking adds `2 × 0.5 / 24 × 0.68 = 0.03`. `pace = 0.38`, which is 14 days for a reinvestor and 22 for a collector.

## What it gives

Days of real time, from the model (`src/game/pace.ts`) and from the formula. "Hands-on" is the time actually spent at the game, visits × minutes, until it finishes. Regenerate with `npm run pace`.

| Player | Visits | Minutes | Clicks/s | Idle share | Pace | Reinvestor: model / formula | Collector: model / formula | Hands-on (reinvestor / collector) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Left open, clicking in bursts | 24/day | 15 | 2 | 1.00 | 1.34 | 3.5 / 4.0 days | 5.6 / 6.3 days | 21 h / 34 h |
| Hardcore | 6/day | 20 | 3 | 1.00 | 1.17 | 3.7 / 4.5 days | 6.8 / 7.2 days | 7 h / 14 h |
| Regular | 3/day | 15 | 2 | 1.00 | 1.04 | 5.3 / 5.1 days | 8.7 / 8.1 days | 4 h / 7 h |
| Commuter | 2/day | 10 | 2 | 0.68 | 0.70 | 7.5 / 7.6 days | 13.5 / 12.0 days | 3 h / 5 h |
| Daily | 1/day | 30 | 2 | 0.35 | 0.38 | 13.0 / 13.9 days | 24.0 / 22.0 days | 7 h / 12 h |
| Daily, short | 1/day | 10 | 2 | 0.34 | 0.35 | 17.0 / 15.2 days | 27.0 / 24.0 days | 3 h / 5 h |
| Every other day | 0.5/day | 30 | 2 | 0.18 | 0.19 | 26.0 / n/a days | 50.0 / 43.9 days | 7 h / 13 h |
| Weekly | 0.14/day | 30 | 2 | 0.05 | 0.05 | 168 / n/a days | 182 / 154 days | 12 h / 13 h |

To try your own: `npm run pace -- 3 15 2` takes visits per day, minutes per visit and clicks per second. It also prints the day each milestone is reached.

## Reading it

- **Leaving is free up to 8 hours.** While your visits are no more than 8 hours apart, `idleShare` is 1 and nothing is wasted. Past that, every extra hour away earns nothing. A night's sleep is fine; a long work day on top of it loses the hours past 8.
- **Visits matter more than clicks.** Below three visits a day, one more visit adds up to 8 hours of income. A whole visit of clicking adds a few percent: 15 minutes at 2 clicks a second, three times a day, is +4%.
- **The last capital rows are most of a collector's time.** A collector with the Regular schedule has every skill, gear row and job by day 2 and owns everything on day 8.7. The last row, Mars megacampus Holdings ($2.5e16), costs 3.9 days of first-copy income on its own. The script prints that number from the tables.
- **Reinvesting is worth about 1.6×.** Re-buying copies raises income past what first copies give, and output milestones (a row doubles at 10, 25, 50 and 100 copies) make each run of copies to the next one pay double. Past about a week of payback it stops helping and starts to waste money: in the model, a Regular player who re-buys anything that pays back within a month takes 7.3 days, and within a year 15.
- **Total hands-on time is modest.** A Regular reinvestor spends about 4 hours at the game over five days; a Daily collector about 12 hours over three and a half weeks. The wall-clock numbers are long because most of that time the game is waiting for money.

## What the model assumes

`simulatePace` in `src/game/pace.ts` plays the real tables with the real gates and the game's own economy functions, so a table change moves the answer.

- You visit `visitsPerDay` times, evenly spaced, for `minutesPerVisit` each, clicking `clicksPerSec` the whole visit. You buy only while you are there.
- Time away pays idle income and idle XP, up to the offline cap, once, when you return.
- You take every gig and job as soon as it opens, and buy a first copy of anything as soon as you can afford it.
- A second copy of a skill, gear row or capital row is bought only if it earns itself back within the player's payback limit (an hour for the collector, two days for the reinvestor), best payback first.
- Gear and capital rows double their output at 10, 25, 50 and 100 copies. Next to one more copy, the shopper also weighs every copy up to the row's next milestone as a single buy, the way the shop's milestone bar invites, so a run that only pays once it lands is still taken.
- Random events and click boosts are left out, so this is an estimate with no luck in it. They would move the real number, by how much is not modeled.

## How far to trust it

- **Collector: within about 13% of the model** for anyone who visits at least daily (Left open reads 12% long), and 15% short for a weekly player. **Reinvestor: within about 22%**, and only when you visit at least daily (Hardcore reads 22% long, Daily short 11% short). The reinvestor constant does not hold for visits further apart than a day, because a two day payback is out of reach when you only shop every other day. The table shows `n/a` there. Use the collector's constant.
- **The two players are the honest uncertainty.** A real player sits between them, so the answer is a range with a factor of about 1.6 across it, not a single number.
- **The player is simple.** Clicking is a steady rate for the whole visit, shopping takes no time, and the shopper never plans ahead. A real player clicks in bursts and sometimes saves for a big row. The model only needed to be right about the shape.
- **It is only as good as the tables.** `src/game/pace.test.ts` checks the formula against the model for four schedules and fails if the constants drift past 13% (collector) or 20% (reinvestor). When it does, rerun `npm run pace`, refit `PACE_K` in `src/game/pace.ts`, and update this page.

## Changing the pace

Each is the formula's answer, with the first one checked against the model.

- **Price of the last capital row.** It sets most of a collector's time. At $1e17 it alone was 15.5 days of income, and the Regular collector took 20.3 days; at a quarter of that it takes 8.7. Halving it again would take the Regular collector to 7.0 days and the reinvestor from 5.3 to 4.3.
- **Output milestones** (`OUTPUT_MILESTONES` and `MILESTONE_FACTOR` in `src/data/outputMilestones.ts`). They set most of a reinvestor's time. On the Regular schedule, the milestones alone took the reinvestor from 7.7 days to 6.3 and left the collector where it was (20.3 to 20.0); the cheaper last row alone took the collector to 9.0 and the reinvestor to 6.7. Together they make 5.3 and 8.7.
- **The 8 hour offline cap** (`OFFLINE_CAP_MS` in `src/game/save.ts`). It is the main limit on a once-a-day player. At 12 hours, the Daily player's `idleShare` goes from 0.35 to 0.52, and pace from 0.38 to 0.55, about 45% faster. It changes nothing for anyone who already visits every 8 hours. If you change the cap, change `OFFLINE_CAP_SECONDS` in `src/game/pace.ts` too; a test checks they match.
- **Job click share.** `s` is the sum of the jobs' `clickPct`. It only matters to someone who clicks a lot.
