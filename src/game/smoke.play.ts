import { expect, test, vi } from "vitest"
import { CAPITAL_UNLOCK, GEAR_TAB_UNLOCK, GIGS, JOB_BOARD_UNLOCK, JOB_TIERS, SKILL_TIERS } from "../data/phases.ts"
import { CAPITAL } from "../data/capital.ts"
import { EVENTS } from "../data/events.ts"
import { installGameHarness } from "./harness.ts"
import { hydrate } from "./save.ts"
import { advanceCompany, growthFacts } from "./globe/growth.ts"
import type { CompanyState } from "./globe/growth.ts"
import { useGame } from "./store.ts"

/** The drops the company costs over a span, with viral spikes off. Money tests subtract it so they count the income alone. */
const dropsOver = (state: { company: CompanyState; gigs: readonly number[]; equipment: Record<string, number> }, from: number, to: number) =>
  advanceCompany(state.company, growthFacts(state.gigs, state.equipment), from, to, () => 0.999).lost

const game = installGameHarness()

function tierByName(name: string) {
  const row = CAPITAL.find((item) => item.name === name)
  if (!row) throw new Error(`missing tier ${name}`)
  return row
}

test("phase A: clicks are XP only, skills cost XP, there is no $/s", () => {
  game.reset()
  const start = game.getState()
  expect(start).toMatchObject({ phase: "A", money: 0, xp: 0, xpTotal: 0, cps: 0, spriteTierId: 1, era: "early" })
  expect(start.owned).toEqual({})
  expect(start.skills).toEqual({})

  const first = SKILL_TIERS[0]
  const second = SKILL_TIERS[1]
  if (!first || !second) throw new Error("missing skills")
  let guard = 0
  while (game.getState().xp < (first.firstXpCost ?? first.baseXpCost)) {
    const gain = game.click()
    expect(gain.money).toBe(0)
    expect(gain.xp).toBe(1)
    guard += 1
    if (guard > 5_000) throw new Error("clicks did not pay for the first skill")
  }
  // The used laptop's first copy is cheap on purpose: one XP per click, 90 clicks. Later copies cost the full curve.
  expect(guard).toBe(90)
  expect(game.getState().money).toBe(0)
  expect(game.getState().lastPop).toBeNull()

  const ready = game.getState()
  expect(game.buy(26)).toBe(false)
  expect(game.buySkill(1)).toBe(true)
  const bought = game.getState()
  expect(bought.xp).toBe(ready.xp - 90)
  expect(bought.xpTotal).toBe(ready.xpTotal)
  expect(bought.xpPerClick).toBe(ready.xpPerClick + first.xpPerClick)
  expect(bought.money).toBe(ready.money)
  expect(bought.cps).toBe(0)
  const paid = game.click()
  expect(paid.xp).toBe(bought.xpPerClick)
  expect(paid.money).toBe(0)

  game.setXp(Math.max(second.baseXpCost, second.unlockAtXp))
  expect(game.buySkill(2)).toBe(true)
  expect(game.getState().xpPerSec).toBeCloseTo(second.xpPerSec)
  const idleBefore = game.getState()
  game.tick(10_000)
  const idleAfter = game.getState()
  expect(idleAfter.xp - idleBefore.xp).toBeCloseTo(second.xpPerSec * 10)
  expect(idleAfter.money).toBe(idleBefore.money)
  expect(idleAfter.cps).toBe(0)
})

test("A → B: Portfolio + React and 14K XP open the Gig Board, and the first gig still needs its skills", () => {
  game.reset()
  game.setXp(1_000_000)
  expect(game.getState().unlocks.gigBoard).toBe(false)
  expect(game.getState().phase).toBe("A")
  for (let id = 1; id <= 14; id++) expect(game.buySkill(id)).toBe(true)
  expect(game.getState().phase).toBe("A")
  expect(game.buySkill(15)).toBe(true)
  expect(game.getState().phase).toBe("A")
  expect(game.buySkill(16)).toBe(true)

  const open = game.getState()
  expect(open.phase).toBe("B")
  expect(open.unlocks).toEqual({ gigBoard: true, jobBoard: false, gear: true, capital: false })
  expect(open.lastPop).toMatchObject({ kind: "unlock", size: "large" })

  const gig1 = GIGS[0]
  const gig2 = GIGS[1]
  if (!gig1 || !gig2) throw new Error("missing gigs")
  const primed = game.click()
  expect(primed.money).toBe(0)
  expect(primed.xp).toBeGreaterThan(0)
  expect(game.completeGig(gig2.id)).toBe(false)
  expect(game.completeGig(gig1.id)).toBe(true)
  expect(game.completeGig(gig1.id)).toBe(false)
  const cleared = game.getState()
  expect(cleared.money).toBe(open.money + gig1.lump)
  expect(cleared.gigs).toEqual([gig1.id])
  expect(cleared.cps).toBe(0)
  expect(cleared.lastPop).toEqual({ kind: "gigClear", size: "large", amount: gig1.lump, label: gig1.name })

  expect(game.click().money).toBe(0)
  expect(game.getState().money).toBe(cleared.money)

  game.setXp(JOB_BOARD_UNLOCK.minXp)
  for (let id = 2; id <= JOB_BOARD_UNLOCK.minGigsCompleted; id++) expect(game.forceGig(id)).toBe(true)
  expect(game.buyJob(1)).toBe(true)
  const paid = game.click()
  expect(paid.money).toBe(game.getState().clickPower)
  expect(paid.xp).toBeGreaterThan(0)
  expect(game.getState().lastPop).toMatchObject({ kind: "click", size: "medium" })
})

test("B: a retainer gig is the first $/s", () => {
  const spy = vi.spyOn(Math, "random").mockReturnValue(0.999)
  game.reset()
  const retainer = GIGS.find((gig) => gig.retainerCps > 0)
  if (!retainer) throw new Error("missing retainer gig")
  game.setXp(1_000_000)
  const furthest = Math.max(16, ...retainer.skillIds)
  for (let id = 1; id <= furthest; id++) expect(game.buySkill(id)).toBe(true)
  for (let id = 1; id < retainer.id; id++) expect(game.completeGig(id)).toBe(true)
  expect(game.getState().cps).toBe(0)
  expect(game.completeGig(retainer.id)).toBe(true)
  expect(game.getState().cps).toBe(retainer.retainerCps)
  const before = game.getState()
  const storeBefore = useGame.getState()
  game.tick(10_000)
  // The retainer's clients have no gear to serve them, so their drops come out of the income.
  expect(game.getState().money - before.money).toBeCloseTo(retainer.retainerCps * 10 - dropsOver(storeBefore, storeBefore.now, storeBefore.now + 10_000), 3)
  spy.mockRestore()
  expect(game.getState().lastPop?.kind).toBe("gigClear")
})

test("B → C → D: job board, a salary, then capital through a senior job", () => {
  game.reset()
  game.setXp(JOB_BOARD_UNLOCK.minXp)
  for (let id = 1; id < JOB_BOARD_UNLOCK.minGigsCompleted; id++) expect(game.forceGig(id)).toBe(true)
  expect(game.getState().unlocks.jobBoard).toBe(false)
  expect(game.forceGig(JOB_BOARD_UNLOCK.minGigsCompleted)).toBe(true)
  const board = game.getState()
  expect(board.unlocks.jobBoard).toBe(true)
  expect(board.phase).toBe("C")
  expect(board.lastPop).toMatchObject({ kind: "unlock", size: "large" })

  const intern = JOB_TIERS[0]
  const junior = JOB_TIERS[1]
  const senior = JOB_TIERS.find((job) => job.id === 14)
  if (!intern || !junior || !senior) throw new Error("missing jobs")
  expect(intern.xpPerSec).toBeGreaterThan(0)
  expect(intern.xpLump).toBeGreaterThan(0)
  const unhired = game.getState()
  expect(game.buyJob(intern.id)).toBe(true)
  // Taking the internship pays its lump of XP once, spendable and lifetime.
  expect(game.getState().xp - unhired.xp).toBe(intern.xpLump)
  expect(game.getState().xpTotal - unhired.xpTotal).toBe(intern.xpLump)
  expect(game.getState().cps).toBeCloseTo(board.cps + intern.cps)
  // The internship teaches too: it adds idle XP/s, and idle time pays it.
  expect(game.getState().xpPerSec).toBeCloseTo(board.xpPerSec + intern.xpPerSec)
  const studied = game.getState().xp
  game.tick(10_000)
  expect(game.getState().xp - studied).toBeCloseTo(game.getState().xpPerSec * 10)
  expect(game.buyJob(junior.id)).toBe(false)
  game.setXp(junior.xpCost - 1)
  expect(game.buyJob(junior.id)).toBe(false)
  game.setXp(45_000)
  expect(game.buyJob(junior.id)).toBe(true)
  expect(game.getState().xp).toBe(45_000 - junior.xpCost)
  expect(game.getState().jobs).toEqual([intern.id, junior.id])
  expect(game.getState().phase).toBe("C")

  game.setXp(senior.xpReq)
  game.setMoney(0)
  expect(game.getState().unlocks.capital).toBe(false)
  expect(game.buyJob(senior.id)).toBe(true)
  const d = game.getState()
  expect(d.unlocks.capital).toBe(true)
  expect(d.phase).toBe("D")
  expect(d.money).toBe(0)
  expect(d.lastPop).toMatchObject({ kind: "unlock", size: "large" })
})

test("Gear opens at 10K XP, and the next-unlock target follows the gates", () => {
  game.reset()
  const first = SKILL_TIERS[0]
  if (!first) throw new Error("missing skill")
  expect(game.getState().nextUnlock).toMatchObject({ key: `skill:${first.id}`, name: first.name, tab: "A" })
  expect(game.getState().nextUnlock?.key).not.toBe("board:gear")
  expect(game.getState().unlocks.gear).toBe(false)
  game.setMoney(1e6)
  expect(game.buyEquipment(1)).toBe(false)

  game.setXp(GEAR_TAB_UNLOCK.minXp)
  expect(game.getState().unlocks.gear).toBe(true)
  expect(game.buyEquipment(1)).toBe(true)
  expect(game.getState().equipment).toEqual({ "1": 1 })
  expect(game.getState().clickPower).toBe(1 + 2)

  game.reset()
  game.setXp(1e12)
  for (const skill of SKILL_TIERS) expect(game.buySkill(skill.id)).toBe(true)
  for (let id = 1; id <= 4; id++) expect(game.forceGig(id)).toBe(true)
  expect(game.getState().nextUnlock).toMatchObject({ key: "board:job", tab: "C", needs: ["more gigs"] })
  expect(game.forceGig(5)).toBe(true)
  expect(game.getState().nextUnlock).toMatchObject({ key: "board:job", tab: "C", needs: ["more gigs"] })
  expect(game.forceGig(6)).toBe(true)
  expect(game.getState().nextUnlock).toMatchObject({ key: "board:capital", tab: "D", either: true })
})

test("D: capital waits for $500K held (or a senior job)", () => {
  game.reset()
  game.setMoney(CAPITAL_UNLOCK.minMoney - 1)
  expect(game.getState().phase).toBe("A")
  expect(game.buy(1)).toBe(false)
  game.setMoney(CAPITAL_UNLOCK.minMoney)
  expect(game.getState().phase).toBe("D")
  expect(game.buy(1)).toBe(true)
  expect(game.getState().owned).toEqual({ "1": 1 })
  expect(game.getState().era).toBe("mid")
  expect(game.getState().spriteTierId).toBe(25)
})

test("mid jump matches the first-LLM tier and boosts clicks only", () => {
  game.reset()
  game.setXp(JOB_BOARD_UNLOCK.minXp)
  for (let id = 1; id <= JOB_BOARD_UNLOCK.minGigsCompleted; id++) expect(game.forceGig(id)).toBe(true)
  expect(game.buyJob(1)).toBe(true)
  const row = tierByName("WhyCombinator batch investment")
  game.setMoney(row.baseCost)
  const before = game.getState()
  expect(game.buy(row.id)).toBe(true)
  const after = game.getState()
  expect(after.cps - before.cps).toBe(row.cps)
  // A click gains the row's flat bonus plus the intern's share of the new $/s.
  expect(after.clickShare).toBeGreaterThan(0)
  expect(after.clickPower - before.clickPower).toBeCloseTo(row.clickBonus + after.clickShare * row.cps, 6)
  expect(after.clickFlat - before.clickFlat).toBe(row.clickBonus)
  expect(after.spriteTierId).toBe(row.artId)
  expect(after.era).toBe("mid")

  const cps = after.cps
  game.forceBoost(5, 10_000)
  const boosted = game.getState()
  expect(boosted.activeBoost?.mult).toBe(5)
  expect(boosted.cps).toBe(cps)
  const moneyBefore = boosted.money
  game.click()
  expect(game.getState().money - moneyBefore).toBeCloseTo(boosted.clickPower * 5, 6)
  expect(game.getState().cps).toBe(cps)
})

test("offline catch-up pays 1h and caps at 8h", () => {
  const spy = vi.spyOn(Math, "random").mockReturnValue(0.999)
  game.reset()
  game.setXp(1_000_000)
  game.buySkill(15)
  game.buySkill(16)
  const retainer = GIGS.find((gig) => gig.retainerCps > 0)
  if (!retainer) throw new Error("missing retainer gig")
  for (const id of [1, 2, 3, retainer.id]) game.forceGig(id)
  const cps = game.getState().cps
  expect(cps).toBeCloseTo(retainer.retainerCps)

  const hour = 60 * 60 * 1000
  const beforeHour = useGame.getState()
  const t0 = Date.now()
  const oneHour = game.advanceOffline(hour)
  expect(oneHour.toast?.split("\n")[0]?.endsWith(".")).toBe(true)
  expect(oneHour.toast?.split("\n")[1]).toMatch(/^credited \$/)
  expect(Math.abs(oneHour.credited - (cps * 3600 - dropsOver(beforeHour, t0 - hour, t0)))).toBeLessThan(1)

  const beforeTen = useGame.getState()
  const t1 = Date.now()
  const tenHours = game.advanceOffline(10 * hour)
  expect(tenHours.toast?.split("\n")[1]).toMatch(/^credited \$/)
  expect(Math.abs(tenHours.credited - (cps * 8 * 3600 - dropsOver(beforeTen, t1 - 8 * hour, t1)))).toBeLessThan(1)
  expect(tenHours.credited).toBeLessThan(cps * 10 * 3600)
  spy.mockRestore()
})

test("offline study credits XP in phase A and adds no idle money", () => {
  game.reset()
  const second = SKILL_TIERS[1]
  if (!second) throw new Error("missing skill 2")
  game.setXp(Math.max(second.baseXpCost, second.unlockAtXp))
  expect(game.buySkill(2)).toBe(true)
  const xpPerSec = game.getState().xpPerSec
  const away = game.advanceOffline(60 * 60 * 1000)
  expect(away.credited).toBe(0)
  expect(Math.abs(away.creditedXp - xpPerSec * 3600)).toBeLessThan(1)
  expect(away.toast?.split("\n")[0]?.endsWith(".")).toBe(true)
  expect(away.toast?.split("\n")[1]).toMatch(/^studied \+/)
  expect(game.getState().money).toBe(0)
})

test("events: Yes applies a gift once, No leaves the balance alone", () => {
  game.reset()
  expect(game.forceEvent(99_999)).toBe(false)
  expect(game.getState().event).toBeNull()

  game.forceGig(1)
  game.setMoney(1_000)
  game.setXp(1_000)
  const row = EVENTS.find((item) => item.id === 21)
  expect(row?.offer).toEqual({ kind: "gift", resource: "money", minutes: 10 })
  expect(game.forceEvent(21)).toBe(true)
  const opened = game.getState()
  expect(opened.money).toBe(1_000)
  expect(opened.event?.eventId).toBe(21)
  expect(opened.event?.name).toBe("Open-source bounty")
  expect(opened.event?.lines[0]).toMatch(/^\+\$/)
  expect(game.acceptEvent()).toBe(true)
  const paid = game.getState()
  expect(paid.money).toBeGreaterThan(1_000)
  expect(paid.event).toBeNull()
  expect(game.acceptEvent()).toBe(false)
  expect(game.getState().money).toBe(paid.money)

  expect(game.forceEvent(3)).toBe(true)
  const offered = game.getState()
  expect(offered.event?.lines).toHaveLength(2)
  game.dismissEvent()
  expect(game.getState().event).toBeNull()
  expect(game.getState().lastEvent?.eventId).toBe(3)
  expect(game.getState().money).toBe(offered.money)
  expect(game.getState().xp).toBe(offered.xp)
})

test("events: a trade scales to the pile, and Yes is refused when you cannot pay", () => {
  game.reset()
  game.forceGig(1)
  game.setMoney(1_000_000)
  game.setXp(1_000_000)
  expect(game.forceEvent(3)).toBe(true)
  const before = game.getState()
  expect(game.acceptEvent()).toBe(true)
  const after = game.getState()
  expect(after.xp - before.xp).toBeGreaterThanOrEqual(10_000)
  expect(before.money - after.money).toBeGreaterThanOrEqual(10_000)
  expect(after.xpTotal).toBeGreaterThan(before.xpTotal)

  game.setMoney(0)
  expect(game.forceEvent(3)).toBe(true)
  expect(game.acceptEvent()).toBe(false)
  expect(game.getState().money).toBe(0)
  game.dismissEvent()
  game.forceGig(1)
  game.setXp(JOB_BOARD_UNLOCK.minXp)
  for (let id = 2; id <= JOB_BOARD_UNLOCK.minGigsCompleted; id++) expect(game.forceGig(id)).toBe(true)
  expect(game.buyJob(1)).toBe(true)
  expect(game.click().money).toBeGreaterThan(0)
})

test("a 1:1 waits for a job, then the three replies pay, sit, or bill you", () => {
  game.reset()
  expect(game.forceReview()).toBe(false)

  game.setXp(JOB_BOARD_UNLOCK.minXp)
  for (let id = 1; id <= JOB_BOARD_UNLOCK.minGigsCompleted; id++) expect(game.forceGig(id)).toBe(true)
  expect(game.buyJob(1)).toBe(true)

  expect(game.forceReview(1)).toBe(true)
  const open = game.getState()
  expect(open.review?.jobId).toBe(1)
  expect(open.review?.jobName).toBe("Internship offer")
  expect(open.review?.question).toMatch(/golden retriever/)
  expect(open.review?.replies.map((reply) => reply.choice)).toEqual(["exceeds", "meets", "pip"])
  expect(open.event).toBeNull()

  const before = game.getState()
  expect(game.answerReview("meets")).toBe(true)
  expect(game.getState().money).toBe(before.money)
  expect(game.getState().xp).toBe(before.xp)
  expect(game.getState().review).toBeNull()
  expect(game.getState().lastReview?.choice).toBe("meets")

  expect(game.forceReview(1)).toBe(true)
  const raisedFrom = game.getState().money
  expect(game.answerReview("exceeds")).toBe(true)
  expect(game.getState().money).toBeGreaterThan(raisedFrom)
  expect(game.getState().lastReview?.lines[0]).toMatch(/^\+\$/)

  game.setMoney(0)
  expect(game.forceReview(1)).toBe(true)
  expect(game.getState().review?.replies.find((reply) => reply.choice === "pip")?.canAccept).toBe(false)
  expect(game.answerReview("pip")).toBe(false)
  expect(game.getState().review).not.toBeNull()
  expect(game.getState().money).toBe(0)
  game.dismissReview()
  expect(game.getState().review).toBeNull()
  expect(game.getState().money).toBe(0)
})

test("save: a save from another schema version is wiped, not migrated", () => {
  game.reset()
  game.forceGig(1)
  const raw = JSON.stringify({ version: 2, money: 5e9, xp: 99, owned: { "26": 3 }, savedAt: 1 })
  const hydrated = hydrate(raw, Date.now())
  expect(hydrated.reset).toBe(true)
  expect(hydrated.save.money).toBe(0)
  expect(hydrated.save.owned).toEqual({})
  game.reset()
})

test("10x dev (gold) skills: bulk buying, hover clicking and the offline cap open at XP milestones", () => {
  game.reset()
  // The first bulk skill opens at 8,000 lifetime XP and costs spendable XP.
  game.setXp(7_999)
  expect(game.buyGold(1)).toBe(false)
  game.setXp(8_000 + 4_000)
  expect(game.buyGold(1)).toBe(true)
  expect(game.getState().gold).toEqual([1])
  expect(game.getState().xpTotal).toBeGreaterThanOrEqual(12_000)

  // Without a bulk skill every purchase is one copy; with x5 it is up to five.
  expect(game.getState().buyAmounts).toEqual([1, 5])
  game.setXp(1e9)
  expect(game.buySkill(2, 5)).toBe(true)
  expect(game.getState().skills["2"]).toBe(5)
  expect(game.setBuyAmount("max")).toBe(5)

  // Hover clicking waits for a hover skill (or the whole catalog) and speeds up per tier.
  expect(game.getState().hoverRate).toBe(0)
  expect(game.forceGold(2)).toBe(true)
  expect(game.getState().hoverRate).toBe(2)
  expect(game.forceGold(5)).toBe(true)
  expect(game.getState().hoverRate).toBe(5)

  // Time away is paid for 8 hours until an away skill stretches it.
  expect(game.getState().offlineCapHours).toBe(8)
  expect(game.forceGold(4)).toBe(true)
  expect(game.getState().offlineCapHours).toBe(12)
  game.reset()
  expect(game.getState().gold).toEqual([])
})

test("career timeline: the desk is earned piece by piece, logged as JSON, and the cat arrives on a return", () => {
  game.reset()
  // Minute zero: XP and the Skills tab. Nothing unlocked, the journal holds the start line.
  const start = game.getState()
  expect(start.features.open).toEqual([])
  expect(start.careerLog.size).toBe(1)
  expect(start.careerLog.last).toMatchObject({ seq: 1, type: "start" })
  expect(start.features.upNext.map((row) => row.id)).toEqual(["studio", "careerLog", "githug"])

  // The first skill opens Your company: logged twice (the skill, the unlock) and queued to reveal.
  game.setXp(90)
  expect(game.buySkill(1)).toBe(true)
  let state = game.getState()
  expect(state.features.open).toEqual(["studio"])
  expect(state.features.reveals).toEqual(["studio"])
  expect(state.features.next?.id).toBe("careerLog")
  expect(game.careerLog().slice(-2).map((line) => `${line.type}:${line.ref}`)).toEqual(["learn:skill:1", "unlock:studio"])

  // Linux CLI basics opens nothing now. Git + GitHug hygiene opens the career log, marked NEW until used.
  game.setXp(2_300)
  for (let id = 2; id <= 8; id++) game.buySkill(id)
  expect(game.getState().features.open).toEqual(["studio"])
  for (let id = 9; id <= 10; id++) game.buySkill(id)
  state = game.getState()
  expect(state.features.open).toContain("careerLog")
  expect(state.features.fresh).toContain("careerLog")
  expect(game.seeFeature("careerLog")).toBe(true)
  expect(game.getState().features.fresh).not.toContain("careerLog")
  expect(game.seeFeature("terminal")).toBe(false)

  // The first gig opens the board, the dollars and the rosters; the first job, the metrics.
  game.setXp(60_000)
  for (let id = 11; id <= 16; id++) game.buySkill(id)
  for (let id = 1; id <= 6; id++) game.forceGig(id)
  expect(game.buyJob(1)).toBe(true)
  state = game.getState()
  expect(state.features.open).toEqual(expect.arrayContaining(["careerLog", "githug", "linkedout", "boardGigs", "money", "rosters", "boardJobs", "metrics"]))
  expect(state.features.open).not.toContain("cat")

  // Every journal line is one flat JSON object with a time, a type and the balances it left.
  const lines = game.careerLog()
  for (const line of lines) {
    expect(JSON.parse(JSON.stringify(line))).toEqual(line)
    expect(typeof line.seq).toBe("number")
    expect(new Date(String(line.time)).toISOString()).toBe(line.time)
    expect(typeof line.money).toBe("number")
  }
  expect(lines.some((line) => line.type === "phase" && line.ref === "phase:B")).toBe(true)
  expect(lines.some((line) => line.type === "hire" && line.name === "Internship offer")).toBe(true)

  // Coming back after a break logs the return and brings the cat, named on the sticky note.
  game.clearReveals()
  const back = game.advanceOffline(30 * 60 * 1000)
  expect(back.toast).not.toBeNull()
  state = game.getState()
  expect(state.features.open).toContain("cat")
  expect(state.features.reveals).toEqual(["cat"])
  expect(state.careerLog.last).toMatchObject({ type: "unlock", ref: "cat" })
  expect(game.careerLog().some((line) => line.type === "return" && line.awayMs === 30 * 60 * 1000)).toBe(true)

  // The career has a drawn handle, rerolled from the word lists until kept.
  const drawn = game.getState().profile
  expect(drawn).toEqual({ chosen: false, handle: expect.stringMatching(/^[a-z]+-[a-z]+$/) })
  expect(game.rerollProfile()).toBe(true)
  expect(game.getState().profile.chosen).toBe(false)
  expect(game.getState().profile.handle).not.toBe(drawn.handle)
  game.keepProfile()
  expect(game.getState().profile.chosen).toBe(true)
  expect(game.rerollProfile()).toBe(false)

  // A wipe starts the timeline over.
  game.reset()
  expect(game.getState().features.open).toEqual([])
  expect(game.getState().careerLog.size).toBe(1)

  // Without ever leaving, a quarter of an hour at the desk brings the cat too.
  game.tick(14 * 60 * 1000)
  expect(game.getState().features.open).not.toContain("cat")
  game.tick(60 * 1000)
  expect(game.getState().features.open).toContain("cat")
})

test("the world: users per region, gear as the throttle, incidents, and the win", () => {
  game.reset()
  game.keepProfile()
  expect(game.getState().world).toMatchObject({ users: 0, target: 7_000_000_000, resistance: 0, incidents: [], won: false })

  // A cleared gig seeds its client's region, and the users grow from there while the gear serves them.
  game.forceGig(1)
  game.setMoney(1e9)
  game.setUsers("americas-east", 200)
  expect(game.getState().world.users).toBe(200)
  expect(game.setUsers("americas-east", -1)).toBe(false)
  game.setUsers("americas-east", 1e15)
  expect(game.getState().world.regionUsers["americas-east"]).toBeLessThan(330_000_000)
  game.setUsers("americas-east", 5_000)

  // Demand is users × requests per user; a laptop cannot serve it, so the shortfall costs money.
  const before = game.getState()
  expect(before.world.demand).toBeCloseTo(500)
  expect(before.world.capacity).toBeLessThan(before.world.demand)
  game.tick(Date.now() + 60_000)
  expect(game.getState().money).toBeLessThan(before.money)

  // The world fights back: an incident opens, shows its price, and ends when paid.
  const calm = game.getState().world.demand
  expect(game.forceIncident("ddos", "americas-east")).toBe(true)
  const hit = game.getState().world
  expect(hit.incidents).toHaveLength(1)
  expect(hit.incidents[0]).toMatchObject({ kind: "ddos", region: "americas-east" })
  expect(hit.demand).toBeCloseTo(calm * hit.incidents[0]!.strength)
  game.setMoney(0)
  expect(game.respondIncident(hit.incidents[0]!.id)).toBe(false)
  game.setMoney(1e9)
  expect(game.respondIncident(hit.incidents[0]!.id)).toBe(true)
  expect(game.getState().world.incidents).toEqual([])
  expect(game.forceIncident("meteor" as never)).toBe(false)

  // Seven billion users win it once: a card, the journal, a forever multiplier, and the game keeps going.
  for (const [region, share] of Object.entries({ "americas-east": 0.04, "americas-west": 0.043, "south-america": 0.055, europe: 0.093, africa: 0.174, asia: 0.589, oceania: 0.006 })) {
    game.setUsers(region, 6.999e9 * share)
  }
  game.setXp(1e9)
  for (let id = 1; id <= 6; id++) game.forceGig(id)
  for (let id = 1; id <= 31; id++) game.buyJob(id)
  game.setXp(1e9)
  game.setMoney(1e15)
  for (const id of [105, 106, 107, 108, 109, 110]) {
    for (let i = 0; i < 30; i++) expect(game.buyEquipment(id), `gear ${id} copy ${i}`).toBe(true)
  }
  const mult = game.getState().foreverMult
  for (let i = 0; i < 60 && !game.getState().world.won; i++) game.tick(Date.now() + (i + 2) * 3_600_000)
  expect(game.getState().world.won).toBe(true)
  expect(game.getState().foreverMult).toBeCloseTo(mult * 1.25)
  expect(game.careerLog().some((line) => line.type === "world" && line.ref === "world:won")).toBe(true)
  game.tick(Date.now() + 99 * 3_600_000)
  expect(game.getState().foreverMult).toBeCloseTo(mult * 1.25)
})
