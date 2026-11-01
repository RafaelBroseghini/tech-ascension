// Prints the pacing estimate (docs/PACING.md): how long a player who is not at the game all day takes to own
// everything, from the formula and from the model behind it (src/game/pace.ts).
//
//   npm run pace                          the table in the docs
//   npm run pace -- 3 15 2                one profile: visits per day, minutes per visit, clicks per second
//   npm run pace -- builds [4 5 2]       every specialization on each leadership line: the day it owns everything and wins
//   npm run pace -- exit [3 15 2] [falling]   the same player over several careers, leaving through the Exit
//                                         (docs/PRESTIGE.md); "falling" leaves when Prestige per hour starts to fall
//
// Needs Node 22.18 or newer, which runs the TypeScript the game is written in without a build step.
import { CAPITAL } from "../src/data/capital.ts"
import { ENDING_BONUS, PRESTIGE_EARN_SCALE, PRESTIGE_MULT_PER } from "../src/data/legacy.ts"
import { GEAR } from "../src/data/gear.ts"
import { LEADERSHIP } from "../src/data/leadership.ts"
import { SPECIALIZATIONS } from "../src/data/specializations.ts"
import { visibleJobs } from "../src/data/phases.ts"
import {
  cadenceOf,
  HIRE_CASH_SHARE,
  DEFAULT_PACE_LEAD,
  DEFAULT_PACE_SPEC,
  PACE_MILESTONES,
  ONE_OF_EACH_PAYBACK_SECONDS,
  estimateDays,
  FINAL_CLICK_SHARE,
  OFFLINE_CAP_SECONDS,
  PACE_K,
  paceOf,
  STACKER_PAYBACK_SECONDS,
  simulateExits,
  simulatePace,
} from "../src/game/pace.ts"

const MAX_DAYS = 5000
const PLAYERS = [
  { name: "oneOfEach", k: PACE_K.oneOfEach, paybackSeconds: ONE_OF_EACH_PAYBACK_SECONDS },
  { name: "stacker", k: PACE_K.stacker, paybackSeconds: STACKER_PAYBACK_SECONDS },
]

const TABLE = [
  ["Left open, clicking in bursts", 24, 15, 2],
  ["Hardcore", 6, 20, 3],
  ["Regular", 3, 15, 2],
  ["Commuter", 2, 10, 2],
  ["Daily", 1, 30, 2],
  ["Daily, short", 1, 10, 2],
  ["Every other day", 0.5, 30, 2],
  ["Weekly", 1 / 7, 30, 2],
]

const duration = (seconds) => (seconds >= 86400 ? `${(seconds / 86400).toFixed(1)} days` : seconds >= 3600 ? `${(seconds / 3600).toFixed(1)} hours` : `${Math.round(seconds / 60)} minutes`)
// Time at the game reads in minutes under two hours, so the 30 to 90 minute target can be checked.
const minutes = (n) => (n < 120 ? `${Math.round(n)} min` : `${(n / 60).toFixed(1)} h`)
const days = (n) => (n >= 100 ? Math.round(n) : n.toFixed(1)).toString()

function row(name, visitsPerDay, minutesPerVisit, clicksPerSec) {
  const profile = { visitsPerDay, minutesPerVisit, clicksPerSec }
  const cad = cadenceOf(profile)
  const cells = PLAYERS.map((player) => {
    const run = simulatePace(profile, { maxDays: MAX_DAYS, paybackSeconds: player.paybackSeconds })
    // The stacker's constant needs a visit at least daily: further apart, a two-day payback is out of reach.
    const valid = player.name === "oneOfEach" || profile.visitsPerDay >= 1
    return {
      model: run.complete ? days(run.days) : `>${MAX_DAYS}`,
      owned: run.ownedDays === null ? "-" : days(run.ownedDays),
      formula: valid ? days(estimateDays(profile, player.k)) : "n/a",
      // Time actually spent at the game: every visit, until the day it finishes.
      handsOn: run.complete ? minutes(run.days * visitsPerDay * minutesPerVisit) : "-",
      // Most visits in a row that bought nothing new, before everything was owned.
      longestWait: run.complete ? `${run.longestWaitVisits}` : "-",
      run,
    }
  })
  return { name, profile, cad, pace: paceOf(profile), cells }
}

const REGULAR = { visitsPerDay: 3, minutesPerVisit: 15, clicksPerSec: 2 }

// The multi-run model: when each Exit happens, what it pays, the bonus, and the career that finally owns everything.
const users = (n) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}k` : `${Math.round(n)}`)

function printExits(profile, exitRule) {
  const rule = exitRule === "falling" ? "Prestige per hour starts to fall" : "an Exit raises the bonus by 15% or more"
  console.log(`Exits: ${profile.visitsPerDay} visits a day, ${profile.minutesPerVisit} min, ${profile.clicksPerSec} clicks/s; leaves when ${rule}; Prestige ladder scale ${PRESTIGE_EARN_SCALE.toExponential(0)}, ${PRESTIGE_MULT_PER} per Prestige, ending bonus ${ENDING_BONUS}`)
  for (const player of PLAYERS) {
    const run = simulateExits(profile, { maxDays: MAX_DAYS, paybackSeconds: player.paybackSeconds, exitRule })
    console.log("")
    console.log(`${player.name}: ${run.complete ? `owns everything and wins the world in career ${run.finishRun}, day ${days(run.days)}` : `not finished by day ${MAX_DAYS}`}; Hall of Fame: ${run.endings.length > 0 ? run.endings.join(", ") : "none"}`)
    console.log("| Career | Day in | Day out | Exit open after (days) | Row 6 after (days) | Matched the last career's earnings after (days) | World won after (days) | Users | Perks held | Earned | Prestige paid (ending bonus) | Prestige total | Bonus |")
    console.log("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |")
    for (const r of run.runs) {
      const at = (n) => (n === null ? "-" : n.toFixed(2))
      const out = r.finished ? `${r.endDay.toFixed(2)} (done)` : r.endDay.toFixed(2)
      const paid = r.finished ? "-" : r.endingBonus > 0 ? `${r.prestigeEarned} (${r.endingBonus})` : `${r.prestigeEarned}`
      console.log(`| ${r.run} | ${r.startDay.toFixed(2)} | ${out} | ${at(r.exitOpenDays)} | ${at(r.row6Days)} | ${at(r.catchUpDays)} | ${at(r.winDays)} | ${users(r.users)} | ${r.perks} | ${r.earned.toExponential(1)} | ${paid} | ${r.prestigeTotal} | x${r.mult.toFixed(2)} |`)
    }
  }
}

if (process.argv[2] === "builds") {
  const nums = process.argv.slice(3, 6).map(Number)
  const given = nums.length === 3 && nums.every((n) => Number.isFinite(n) && n > 0)
  const profile = given ? { visitsPerDay: nums[0], minutesPerVisit: nums[1], clicksPerSec: nums[2] } : { visitsPerDay: 4, minutesPerVisit: 5, clicksPerSec: 2 }
  console.log(`Builds: ${profile.visitsPerDay} visits a day, ${profile.minutesPerVisit} min, ${profile.clicksPerSec} clicks/s. Each cell: owns everything / wins the world, in days (the finish is the later). A Manager hires when a kind costs at most ${HIRE_CASH_SHARE * 100}% of its cash.`)
  console.log("")
  console.log("| Specialization | Style | " + LEADERSHIP.flatMap((l) => PLAYERS.map((p) => `${l.id} ${p.name}`)).join(" | ") + " |")
  console.log("| --- | --- | " + LEADERSHIP.flatMap((l) => PLAYERS.map(() => "---")).join(" | ") + " |")
  for (const spec of SPECIALIZATIONS) {
    const cells = LEADERSHIP.flatMap((lead) =>
      PLAYERS.map((player) => {
        const run = simulatePace(profile, { maxDays: 60, paybackSeconds: player.paybackSeconds, specialization: spec.id, leadership: lead.id })
        const owned = run.ownedDays === null ? "never" : run.ownedDays.toFixed(2)
        const won = run.milestones.won === undefined ? "never" : run.milestones.won.toFixed(2)
        return `${owned} / ${won}`
      }),
    )
    console.log(`| ${spec.name} | ${spec.style} | ${cells.join(" | ")} |`)
  }
  process.exit(0)
}

if (process.argv[2] === "exit") {
  const nums = process.argv.slice(3, 6).map(Number)
  const given = nums.length === 3 && nums.every((n) => Number.isFinite(n) && n > 0)
  printExits(given ? { visitsPerDay: nums[0], minutesPerVisit: nums[1], clicksPerSec: nums[2] } : REGULAR, process.argv.includes("falling") ? "falling" : "worth")
  process.exit(0)
}

const args = process.argv.slice(2).map(Number)
const custom = args.length === 3 && args.every((n) => Number.isFinite(n) && n > 0)
const rows = custom ? [row("Your profile", ...args)] : TABLE.map((entry) => row(...entry))

// The last capital row is most of the bill: with every other row owned and nothing re-bought, how long
// does its price take at full income?
const last = CAPITAL.reduce((a, b) => (b.baseCost > a.baseCost ? b : a))
const firstCopyIncome =
  CAPITAL.reduce((sum, r) => sum + (r === last ? 0 : r.cps), 0) +
  GEAR.reduce((sum, r) => sum + r.cps, 0) +
  visibleJobs(DEFAULT_PACE_SPEC, DEFAULT_PACE_LEAD).reduce((sum, r) => sum + r.cps, 0)

console.log(`offline cap ${OFFLINE_CAP_SECONDS / 3600}h · final click share ${FINAL_CLICK_SHARE.toFixed(2)} · K ${PACE_K.oneOfEach} (one-of-each) / ${PACE_K.stacker} (stacker)`)
console.log(`last row: ${last.name}, $${last.baseCost.toExponential(1)}; first-copy income without it $${firstCopyIncome.toExponential(2)}/s, so its price alone is ${duration(last.baseCost / firstCopyIncome)} of full income`)
console.log("")
console.log("| Player | Visits | Minutes | Clicks/s | Idle share | Pace | Stacker: finish / owns everything / formula | One-of-each: finish / owns everything / formula | Hands-on to finish (stacker / one-of-each) | Longest wait, visits (stacker / one-of-each) |")
console.log("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |")
for (const { name, profile, cad, pace, cells } of rows) {
  const [oneOfEach, stacker] = cells
  console.log(
    `| ${name} | ${Number(profile.visitsPerDay.toFixed(2))}/day | ${profile.minutesPerVisit} | ${profile.clicksPerSec} | ${cad.idleShare.toFixed(2)} | ${pace.toFixed(2)} | ${stacker.model} / ${stacker.owned} / ${stacker.formula} days | ${oneOfEach.model} / ${oneOfEach.owned} / ${oneOfEach.formula} days | ${stacker.handsOn} / ${oneOfEach.handsOn} | ${stacker.longestWait} / ${oneOfEach.longestWait} |`,
  )
}

if (!custom) {
  // Least squares on the relative error of `k / pace` against the model, over the schedules that visit at least
  // daily (the stacker's constant only holds there). This is the number to put in `PACE_K`.
  const daily = rows.filter((r) => r.profile.visitsPerDay >= 1)
  const fit = PLAYERS.map((player, index) => {
    // The formula is about owning everything, not the win.
    const a = daily.map((r) => 1 / (r.pace * r.cells[index].run.ownedDays))
    const k = a.reduce((sum, x) => sum + x, 0) / a.reduce((sum, x) => sum + x * x, 0)
    return `${player.name} ${k.toFixed(1)}`
  })
  console.log("")
  console.log(`Best-fit K over the schedules that visit at least daily: ${fit.join(", ")}`)
}

if (custom) {
  console.log("")
  console.log("Day each milestone is reached:")
  for (const [index, player] of PLAYERS.entries()) {
    const { milestones } = rows[0].cells[index].run
    console.log(`- ${player.name}: ${PACE_MILESTONES.filter((id) => milestones[id] !== undefined).map((id) => `${id} ${milestones[id].toFixed(2)}`).join(", ")}`)
  }
  // The career gates to come read users (docs/BUILDS.md): each should land within about a visit of the job it sits on.
  const visit = 1 / rows[0].profile.visitsPerDay
  console.log("")
  console.log(`Career gates (one visit is ${visit.toFixed(2)} days): users against the job each gate sits on, then the finish`)
  for (const [index, player] of PLAYERS.entries()) {
    const { milestones: m, days: finish, ownedDays } = rows[0].cells[index].run
    const at = (n) => (n === undefined || n === null ? "never" : n.toFixed(2))
    console.log(`- ${player.name}: Mid-level SWE day ${at(m.midJob)}, 10k users day ${at(m.users10k)}; Senior SWE day ${at(m.seniorJob)}, 1M users day ${at(m.users1m)}; win day ${at(m.won)}, owns everything day ${at(ownedDays)}, finish day ${at(rows[0].cells[index].run.complete ? finish : null)}`)
  }
}

if (!custom) {
  console.log("")
  printExits(REGULAR, "worth")
}
