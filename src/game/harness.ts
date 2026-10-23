import type { ActiveBoost } from "../data/boosts.ts"
import type { Era } from "../data/capital.ts"
import { clickFlat, clickPower, clickShare, idlePerSec, jobById, ownedCount, production, xpPerClick, xpPerSec } from "./economy.ts"
import { eventById, previewOffer } from "./events.ts"
import { noteToast } from "./offlineNote.ts"
import { previewReviewChoice, reviewById } from "./reviews.ts"
import type { ReviewChoiceId } from "./reviews.ts"
import { COMBOS } from "../data/combos.ts"
import { LAUNCH_CLICKS, LAUNCH_SHARE, shipsLaunches } from "./launch.ts"
import { leadOptions, specOf, specOptions } from "./build.ts"
import { comboById, effectLabel } from "./combos.ts"
import { modFactors, modsOf, pruneTemp, prestigeMult } from "./mods.ts"
import type { TempMults } from "./mods.ts"
import { nextUnlock } from "./nextUnlock.ts"
import type { NextUnlock } from "./nextUnlock.ts"
import { capitalUnlocked, equipmentOpen, eraOf, gigBoardUnlocked, jobBoardUnlocked, stageOf } from "./phase.ts"
import type { Phase } from "./phase.ts"
import { goldById, hoverRate, offlineCapMs } from "./gold.ts"
import { ownsEverything } from "./nextUnlock.ts"
import { hydrate, OFFLINE_CAP_MS } from "./save.ts"
import { forceIncident, setRegionUsers } from "./globe/actions.ts"
import type { CompanyPatch } from "./globe/actions.ts"
import { FRESH_COMPANY } from "./globe/growth.ts"
import { servingOf } from "./globe/load.ts"
import { creditOf, headcountOf } from "./globe/hires.ts"
import type { Ending } from "./globe/hires.ts"
import { productRevenueOf } from "./globe/product.ts"
import { incidentCost, totalUsers, WORLD_TARGET } from "./globe/world.ts"
import type { IncidentKind } from "./globe/world.ts"
import { normalizeStats } from "./stats.ts"
import { isGif } from "./gifParade.ts"
import { CAT_ROSTER } from "./catRoster.ts"
import { readCareerText } from "./ledger.ts"
import { isUiFontId } from "../data/uiFonts.ts"
import { setUiFont } from "./uiFont.ts"
import { setMoneyDirect, setPrestigeDirect, setXpDirect } from "./admin.ts"
import { exitOpen, prestigeOnExit } from "./legacy.ts"
import type { HallEnding } from "../data/legacy.ts"
import { earnedPerSec, persistNow, useGame, writeStateAt } from "./store.ts"
import type { ActiveReview } from "./store.ts"
import { careerJson, journalFromSave } from "./careerLog.ts"
import { progressOf } from "./careerSync.ts"
import { isFeatureId, nextGhost, upNext } from "./features.ts"
import type { FeatureTease } from "./features.ts"

export type PopSnapshot = { kind: "click" | "gigClear" | "unlock"; size: "medium" | "large"; amount: number; label: string }

export type EventSnapshot = { eventId: number; name: string; lines: string[] }

export type ReviewReplySnapshot = {
  choice: ReviewChoiceId
  label: string
  rating: string
  lines: string[]
  canAccept: boolean
}

export type ReviewSnapshot = {
  promptId: number
  jobId: number
  jobName: string
  question: string
  replies: ReviewReplySnapshot[]
}

export type LastReviewSnapshot = {
  promptId: number
  jobId: number
  choice: ReviewChoiceId | null
  lines: string[]
}

/** Prestige: the career count, Prestige, the multiplier it gives, and what the Exit would pay now. */
export type LegacySnapshot = {
  /** Careers started, counting the one under way. */
  runs: number
  /** Spendable Prestige. */
  prestige: number
  /** Every Prestige ever earned. */
  prestigeTotal: number
  /** `1 + 0.03 * prestigeTotal`, already folded into cps, clickPower, xpPerClick, xpPerSec, the offline credit and product growth. */
  mult: number
  /** The Exit is open: it would pay at least 1 Prestige (the first career), or this is a later career. */
  exitOpen: boolean
  /** Prestige an Exit taken now would pay, earnings and a new ending's bonus together. 0 means `exit()` refuses. */
  prestigeOnExit: number
  /** Legacy perk ids owned. */
  perks: string[]
  /** The Hall of Fame: endings a career has won the world with. */
  endings: HallEnding[]
}

export type GameSnapshot = {
  money: number
  /** Spendable XP. Skills cost XP. */
  xp: number
  /** Lifetime XP earned. Phase gates and job requirements read this. */
  xpTotal: number
  /** A skill grind, B gigs, C jobs + gear, D capital. */
  phase: Phase
  /** Idle $/s. Click boosts do not change this; random-event multipliers do. */
  cps: number
  /** Money per click, before activeBoost. Paid once the first job is taken. */
  clickPower: number
  /** The flat part of clickPower before the boost, without the jobs' share of $/s. */
  clickFlat: number
  /** Share of idle $/s each click adds, from jobs held (0.04 = 4%). Already inside clickPower. */
  clickShare: number
  /** XP per click (1 + skills). In Phase A this is what a click pays. */
  xpPerClick: number
  /** Idle XP/s from skills. */
  xpPerSec: number
  /** Permanent random-event multiplier already folded into cps, clickPower, xpPerClick and xpPerSec. */
  foreverMult: number
  /** Running timed event multipliers, keyed by target. */
  tempMults: TempMults
  /** The event modal on screen, or null. */
  event: EventSnapshot | null
  /** The most recent event, kept after it is dismissed. */
  lastEvent: EventSnapshot | null
  /** The 1:1 on screen, or null. Meets has empty lines and canAccept true. */
  review: ReviewSnapshot | null
  /** The most recent 1:1. choice is null when it was left without a reply. */
  lastReview: LastReviewSnapshot | null
  /** Phase D capital tiers, keyed by tier id ("26"). */  owned: Record<string, number>
  skills: Record<string, number>
  equipment: Record<string, number>
  jobs: number[]
  /** Completed gig ids. */
  gigs: number[]
  /** Owned gold skill ids. */
  gold: number[]
  /** Hover clicks per second: 0 until a hover gold skill (or every catalog row) is owned. */
  hoverRate: number
  /** How long time away is paid, in hours. 8 until a gold skill extends it. */
  offlineCapHours: number
  /** `gear` opens with the Job Board. */
  unlocks: { gigBoard: boolean; jobBoard: boolean; gear: boolean; capital: boolean }
  /**
   * The one thing to chase across the whole game, or null when nothing is left to unlock. Each shop tab banner
   * shows the same idea scoped to its own panel (`nextUnlock(progress, tab)`).
   */
  nextUnlock: NextUnlock | null
  era: Era
  /** Art id of the stage sprite: art id of the highest owned capital row, or the art of the furthest skill, gig or job. 1 before the first purchase. */
  spriteTierId: number
  activeBoost: ActiveBoost | null
  savedAt: number
  /** The most recent money pop (medium on a paying click, large on gig clear and phase unlock), or null. */
  lastPop: PopSnapshot | null
  /** The career timeline: what is unlocked, marked NEW, waiting to reveal, and next. */
  features: FeaturesSnapshot
  /** Journal entries kept (the newest 2,000) and the latest one. */
  careerLog: { size: number; last: CareerLogLine | null }
  /** The career's handle, shown on GitHug and LinkedOut, drawn from word lists. `chosen` once the player kept it. */
  profile: { handle: string; product: string; chosen: boolean }
  /** Heads hired of each kind, by id (`HIRES` in `src/game/globe/hires.ts`). A kind with nobody is left out. */
  hires: Record<string, number>
  /** Everyone hired, all kinds together. */
  headcount: number
  /** The share of the users that came from growth the hires added, 0 to 1. */
  hiredShare: number
  /** How the win read, once it latched: `sponsor` (over half the users from hires) or `nightOwl`. Null before. */
  ending: Ending | null
  /** The company's reach: all users, the target, users by region, resistance, live incidents, and whether the world is won. */
  world: WorldSnapshot
  /** Prestige: Prestige, the permanent multiplier, the Exit and the Legacy perks. */
  legacy: LegacySnapshot
  /**
   * The specialization: the one picked (null before), whether the one switch is spent, and the ids that could be picked or switched to now.
   * Then the leadership line (`ic` or `manager`, null before the pick) and, while the pick is open, both ids (else empty).
   */
  build: { origin: string | null; specialization: string | null; switched: boolean; options: string[]; leadership: string | null; leadershipOptions: string[] }
  /** The kitchen: combos found this career, in the order they turned up, and how many the table holds. */
  /** Frontend's launches: whether the build ships them, the manual clicks banked, the clicks one launch takes and the share of the crowd it adds. */
  launch: { ships: boolean; charge: number; every: number; share: number }
  combos: { found: { id: string; name: string; joke: string; effect: string }[]; total: number }
}


export type WorldSnapshot = {
  users: number
  target: number
  regionUsers: Record<string, number>
  /** How hard the world pushes back, 0 to 100. */
  resistance: number
  incidents: { id: number; kind: IncidentKind; region: string; endsAt: number; strength: number; cost: number }[]
  /** Requests a second the users send, against what the gear serves. */
  demand: number
  capacity: number
  /** Dollars a second the served users pay, with Platform's multiplier in. Dropped users pay nothing. Not in `cps`, which stays the idle $/s from owned items. */
  revenuePerSec: number
  won: boolean
}

/** A closed timeline row: what opens it and how close it is. */
export type TeaseSnapshot = { id: string; name: string; via: string; fill: number; left: string }

/** One career journal entry as one flat JSON object. */
export type CareerLogLine = Record<string, number | string | boolean>

export type FeaturesSnapshot = {
  /** Rows unlocked so far, in the order they opened. */
  open: string[]
  /** Rows still marked NEW. */
  fresh: string[]
  /** Reveals waiting to play. */
  reveals: string[]
  /** The row standing in its future place as a dim outline. */
  next: TeaseSnapshot | null
  /** The career log's Up next. */
  upNext: TeaseSnapshot[]
}

export type OfflineCatchup = {
  credited: number
  creditedXp: number
  toast: string | null
}

export type GameHarness = {
  getState: () => GameSnapshot
  click: () => { money: number; xp: number }
  /** Buy one copy of a Phase D capital row. False before capital unlocks or when it costs too much. */
  buy: (tierId: number) => boolean
  buySkill: (skillId: number) => boolean
  buyJob: (jobId: number) => boolean
  /**
   * Pick the career's specialization (`frontend`, `backend`, `infra`, `ai`, `fde`, `security`). It opens once a job of rank 7
   * (Mid-level SWE) is held and is made once. False before that, once picked, or for an unknown id. Every job above rank 7 needs it.
   */
  pickOrigin: (id: string) => boolean
  pickSpecialization: (id: string) => boolean
  /**
   * Pick the career's leadership line (`ic` or `manager`). It opens once a Senior job (rank 14) is held and is made once. False
   * before that, once picked, or for an unknown id. Every job above rank 15 needs it (and only its own line's rows open),
   * and hiring is refused unless the line is `manager`, each kind from its manager rank.
   */
  pickLeadership: (id: string) => boolean
  /**
   * The career's one switch: keeps money, gear and the trunk jobs, drops the old track's jobs, and anything already open
   * (capital, gear) stays open. False without a pick, after the switch, or to the same specialization.
   */
  switchSpecialization: (id: string) => boolean
  buyEquipment: (equipId: number) => boolean
  /**
   * Sell the product (the Exit): pay the Prestige this career's earnings climbed to, plus a new ending's bonus, and start
   * the next career. Money, XP, skills, gigs, jobs, gear, capital, boosts, event multipliers and the whole product (users,
   * regions, hires, resistance, incidents, the win) start over, and a new product name
   * is drawn. Prestige, Legacy perks, the Hall of Fame, 10x dev skills, the career timeline, journal and handle stay.
   * Returns the Prestige paid, or false when the Exit is not open or would pay 0.
   */
  exit: () => number | false
  /** Spend Prestige on a Legacy perk (`src/data/legacy.ts`: `network.*`, `founder.*`, `capital.*`), each after the one before it in its track. It lands in the career under way (nothing is taken away) and starts every later career. */
  buyLegacy: (perkId: string) => boolean
  /** Set spendable Prestige (lifetime Prestige rises to match). Tests only, like setXp. */
  setPrestige: (n: number) => void
  /** Buy a gold skill with spendable XP through its normal gates (lifetime XP, earlier row of its family, price). */
  buyGold: (goldId: number) => boolean
  /** Buy a region with money (see src/data/regions.ts). False when unknown, owned or unaffordable. */
  buyRegion: (regionId: string) => boolean
  /** Deploy a point of presence in a city of an owned region, for a quarter of its region's price. */
  deployPop: (cityId: string) => boolean
  /** Switch a deployed point of presence on or off; its traffic goes to the nearest one still on. False for the last one on. */
  setPopActive: (cityId: string, on: boolean) => boolean
  /** Switch a bought region on or off as a whole. False for the last region serving. */
  setRegionActive: (regionId: string, on: boolean) => boolean
  /** Hire one person of a kind. False unless the career leads as a Manager at the kind's rank (outsourced and bootcamp 18, copypaste and senior 20, staff and tenx 21, greybeard and codegod 22), in a closed row, or short of the price. */
  hire: (id: string) => boolean
  /** Let go of one person of a kind. No refund. False with nobody of that kind. */
  fire: (id: string) => boolean
  /** Opens an incident (ddos, block, law, rival) on a region, the biggest by default. False at the cap of three or for an unknown region. */
  forceIncident: (kind: IncidentKind, regionId?: string) => boolean
  /** Pays to end an incident now. False when it is gone or the money is short. */
  respondIncident: (id: number) => boolean
  /** Sets a region's users, up to what the region can hold. */
  setUsers: (regionId: string, users: number) => boolean
  /** Grant a gold skill now, bypassing XP, order and price. False for an unknown or owned id. */
  forceGold: (goldId: number) => boolean
  /** Clear a gig through the normal gates (board open, XP, prior gigs). */
  completeGig: (gigId: number) => boolean
  /** Clear a gig now, bypassing every requirement. False for an unknown or already cleared id. */
  forceGig: (gigId: number) => boolean
  setXp: (n: number) => void
  /** Set the UI font (`src/data/uiFonts.ts`: chakra-petch, jetbrains-mono, space-grotesk, pixelify-sans, atkinson), as a click on its settings row does. It is a preference, not part of the career. False for an unknown id. */
  setFont: (id: string) => boolean
  tick: (ms: number) => void
  setMoney: (n: number) => void
  forceBoost: (mult: number, ms: number) => void
  /** Find the first `count` roster gifs, as if the desk cat had turned into each. Returns how many cats are found now. */
  forceCats: (count: number) => number
  advanceOffline: (ms: number) => OfflineCatchup
  /** Open this event now, without applying it. False for an unknown id. Replaces an open event. */
  forceEvent: (eventId: number) => boolean
  /** Take the open deal. False when nothing is open or the cost cannot be paid. */
  acceptEvent: () => boolean
  /** Decline the open event. Balances stay put. */
  dismissEvent: () => void
  /**
   * Open a 1:1 for the highest job held. Optional prompt id must sit in that job's band.
   * False with no job or for an unknown prompt. Replaces an open event or review.
   */
  forceReview: (promptId?: number) => boolean
  /** Take a reply. False when nothing is open, the choice is unknown, or the plan cannot be paid. */
  answerReview: (choice: ReviewChoiceId) => boolean
  /** Leave the 1:1. Balances stay put. */
  dismissReview: () => void
  /** Preview an era as the shop's era tab does, or null to snap back to the owned one. */
  previewEra: (era: Era | null) => void
  /** Every career journal entry, oldest first, one flat JSON object each. */
  careerLog: () => CareerLogLine[]
  /** Clear a NEW marker, as using the feature does. False for an unknown id. */
  seeFeature: (id: string) => boolean
  /** Drop the reveals waiting to play. */
  clearReveals: () => void
  /** Draw another handle (and a product to match), as the start card's first Reroll does. False once it is kept. */
  rerollProfile: () => boolean
  /** Draw another product suffix, as the second step's Reroll does. False once it is kept. */
  rerollProduct: () => boolean
  /** Keep the current handle, as the start card's Start does. */
  keepProfile: () => void
  reset: () => void
}

function teaseSnapshot(tease: FeatureTease): TeaseSnapshot {
  return { id: tease.id, name: tease.name, via: tease.via, fill: tease.fill, left: tease.left }
}

function readSavedAt(): number {
  const text = readCareerText()
  if (!text) return 0
  try {
    const parsed = JSON.parse(text) as { savedAt?: unknown }
    return typeof parsed.savedAt === "number" && Number.isFinite(parsed.savedAt) ? parsed.savedAt : 0
  } catch {
    return 0
  }
}

function liveBoost(boost: ActiveBoost | null, now: number): ActiveBoost | null {
  if (!boost || !(boost.endsAt > now) || !(boost.mult > 0)) return null
  return { mult: boost.mult, endsAt: boost.endsAt }
}

function liveEventLines(state: ReturnType<typeof useGame.getState>): string[] | null {
  const event = state.event
  if (!event) return null
  const def = eventById(event.eventId)
  if (!def) return null
  const now = Math.max(Date.now(), state.now)
  const rates = production(state, state.activeBoost, now, modsOf(state))
  return previewOffer(def.offer, {
    cps: rates.idle,
    click: rates.click,
    xpPerSec: rates.xpIdle,
    xpPerClick: rates.xpClick * rates.mult,
  }, state.money, state.xp).lines.map((line) => line.text)
}

function reviewSnapshot(state: ReturnType<typeof useGame.getState>): ReviewSnapshot | null {
  const review = state.review
  if (!review) return null
  const prompt = reviewById(review.promptId)
  if (!prompt) return null
  const now = Math.max(Date.now(), state.now)
  const rates = production(state, state.activeBoost, now, modsOf(state))
  const earning = {
    cps: rates.idle,
    click: rates.click,
    xpPerSec: rates.xpIdle,
    xpPerClick: rates.xpClick * rates.mult,
  }
  return {
    promptId: prompt.id,
    jobId: review.jobId,
    jobName: jobById(review.jobId)?.name ?? "",
    question: prompt.question,
    replies: prompt.replies.map((reply) => {
      const preview = previewReviewChoice(reply.choice, earning, state.money, state.xp)
      return {
        choice: reply.choice,
        label: reply.label,
        rating: reply.rating,
        lines: preview.lines.map((line) => line.text),
        canAccept: preview.canAccept,
      }
    }),
  }
}

function lastReviewSnapshot(review: ActiveReview | null): LastReviewSnapshot | null {
  if (!review) return null
  return {
    promptId: review.promptId,
    jobId: review.jobId,
    choice: review.choice,
    lines: review.lines.map((line) => line.text),
  }
}

function eventSnapshot(
  event: { eventId: number; lines: { text: string }[] } | null,
  live: string[] | null,
): EventSnapshot | null {
  if (!event) return null
  const lines = event.lines.length > 0 ? event.lines.map((line) => line.text) : live ?? []
  return { eventId: event.eventId, name: eventById(event.eventId)?.name ?? "", lines }
}

function featuresSnapshot(state: ReturnType<typeof useGame.getState>): FeaturesSnapshot {
  const progress = progressOf(state)
  const open = new Set<string>(state.unlocked)
  const ghost = nextGhost(progress, open)
  return {
    open: [...state.unlocked],
    fresh: [...state.fresh],
    reveals: [...state.reveals],
    next: ghost ? teaseSnapshot(ghost) : null,
    upNext: upNext(progress, open).map(teaseSnapshot),
  }
}

/** Applies a company patch the way a test hook does: no save, false when it was refused. */
function adoptCompany(patch: CompanyPatch): boolean {
  if (!patch) return false
  useGame.setState(patch)
  return true
}

function worldSnapshot(state: ReturnType<typeof useGame.getState>, perSec: number): WorldSnapshot {
  const { company } = state
  const serving = servingOf(company.users, company.incidents, state.equipment)
  return {
    users: totalUsers(company.users),
    target: WORLD_TARGET,
    regionUsers: { ...company.users },
    resistance: company.resistance,
    incidents: company.incidents.map((i) => ({ id: i.id, kind: i.kind, region: i.region, endsAt: i.until, strength: i.strength, cost: incidentCost(i, perSec, state.money) })),
    demand: serving.demand,
    capacity: serving.capacity,
    revenuePerSec: productRevenueOf(serving.revenuePerSec, state.legacy.perks, specOf(state)),
    won: company.won,
  }
}

const exitWin = (state: ReturnType<typeof useGame.getState>) => ({ won: state.company.won, ending: state.company.ending })


export function installGameHarness(): GameHarness {
  const api: GameHarness = {
    getState: () => {
      const state = useGame.getState()
      const now = Date.now()
      const stage = stageOf(state)
      const fx = modFactors(modsOf(state), now, now)
      return {
        money: state.money,
        xp: state.xp,
        xpTotal: state.xpTotal,
        phase: state.phase,
        cps: idlePerSec(state) * fx.cps,
        clickPower: clickPower(state) * fx.click,
        clickFlat: clickFlat(state) * fx.click,
        clickShare: clickShare(state),
        xpPerClick: xpPerClick(state.skills) * fx.click,
        xpPerSec: xpPerSec(state) * fx.xpIdle,
        foreverMult: state.foreverMult,
        tempMults: pruneTemp(state.tempMults, now),
        event: eventSnapshot(state.event, liveEventLines(state)),
        lastEvent: eventSnapshot(state.lastEvent, null),
        review: reviewSnapshot(state),
        lastReview: lastReviewSnapshot(state.lastReview),
        owned: { ...state.owned },
        skills: { ...state.skills },
        equipment: { ...state.equipment },
        jobs: [...state.jobs],
        gigs: [...state.gigs],
        gold: [...state.gold],
        hoverRate: hoverRate(state.gold, ownsEverything(state)),
        offlineCapHours: offlineCapMs(state.gold, OFFLINE_CAP_MS, state.legacy.perks) / 3_600_000,
        unlocks: {
          gigBoard: gigBoardUnlocked(state),
          jobBoard: jobBoardUnlocked(state),
          gear: equipmentOpen(state),
          capital: capitalUnlocked(state),
        },
        nextUnlock: nextUnlock(state),
        era: eraOf(state),
        spriteTierId: stage?.artId ?? 1,
        activeBoost: liveBoost(state.activeBoost, now),
        savedAt: readSavedAt(),
        lastPop: state.pop
          ? { kind: state.pop.kind, size: state.pop.size, amount: state.pop.amount, label: state.pop.label }
          : null,
        features: featuresSnapshot(state),
        careerLog: {
          size: state.journal.entries.length,
          last: state.journal.entries.length > 0 ? careerJson(state.journal.entries[state.journal.entries.length - 1]!) : null,
        },
        profile: { ...state.profile },
        hires: { ...state.hires },
        headcount: headcountOf(state.hires),
        hiredShare: creditOf(state.company).hiredShare,
        ending: state.company.ending ?? null,
        world: worldSnapshot(state, earnedPerSec(state, now)),
        legacy: {
          runs: state.legacy.runs,
          prestige: state.legacy.prestige,
          prestigeTotal: state.legacy.prestigeTotal,
          mult: prestigeMult(state.legacy.prestigeTotal),
          exitOpen: exitOpen(state.legacy, state.stats.lifetimeEarned, exitWin(state)),
          prestigeOnExit: exitOpen(state.legacy, state.stats.lifetimeEarned, exitWin(state)) ? prestigeOnExit(state.legacy, state.stats.lifetimeEarned, exitWin(state)) : 0,
          perks: [...state.legacy.perks],
          endings: [...state.legacy.endings],
        },
        build: {
          origin: state.build.origin ?? null,
          specialization: state.build.spec,
          switched: state.build.switched,
          options: specOptions(state),
          leadership: state.build.leadership ?? null,
          leadershipOptions: leadOptions(state),
        },
        launch: { ships: shipsLaunches(specOf(state)), charge: state.build.charge ?? 0, every: LAUNCH_CLICKS, share: LAUNCH_SHARE },
        combos: {
          found: state.combos.flatMap((id) => {
            const row = comboById(id)
            return row ? [{ id: row.id, name: row.name, joke: row.joke, effect: effectLabel(row.effect) }] : []
          }),
          total: COMBOS.length,
        },
      }
    },

    click: () => useGame.getState().click(),

    buy: (tierId) => {
      const before = ownedCount(useGame.getState().owned, tierId)
      useGame.getState().buy(tierId)
      return ownedCount(useGame.getState().owned, tierId) > before
    },

    buySkill: (skillId) => {
      const before = ownedCount(useGame.getState().skills, skillId)
      useGame.getState().buySkill(skillId)
      return ownedCount(useGame.getState().skills, skillId) > before
    },

    buyJob: (jobId) => useGame.getState().buyJob(jobId),

    pickOrigin: (id) => useGame.getState().pickOrigin(id),
    pickSpecialization: (id) => useGame.getState().pickSpecialization(id),

    pickLeadership: (id) => useGame.getState().pickLeadership(id),

    switchSpecialization: (id) => useGame.getState().switchSpecialization(id),

    buyEquipment: (equipId) => {
      const before = ownedCount(useGame.getState().equipment, equipId)
      useGame.getState().buyEquipment(equipId)
      return ownedCount(useGame.getState().equipment, equipId) > before
    },

    exit: () => useGame.getState().exit(),

    buyLegacy: (perkId) => useGame.getState().buyLegacy(perkId),

    setPrestige: setPrestigeDirect,

    buyGold: (goldId) => useGame.getState().buyGold(goldId),
    buyRegion: (regionId) => useGame.getState().buyRegion(regionId),
    hire: (id) => useGame.getState().hire(id),
    fire: (id) => useGame.getState().fire(id),
    forceIncident: (kind, regionId) => adoptCompany(forceIncident(useGame.getState(), kind, regionId, Date.now())),
    respondIncident: (id) => useGame.getState().respondIncident(id),
    setUsers: (regionId, users) => adoptCompany(setRegionUsers(useGame.getState(), regionId, users)),
    deployPop: (cityId) => useGame.getState().deployPop(cityId),
    setPopActive: (cityId, on) => useGame.getState().setPopActive(cityId, on),
    setRegionActive: (regionId, on) => useGame.getState().setRegionActive(regionId, on),

    forceGold: (goldId) => {
      const state = useGame.getState()
      if (!goldById(goldId) || state.gold.includes(goldId)) return false
      useGame.setState({ gold: [...state.gold, goldId].sort((a, b) => a - b), now: Date.now() })
      persistNow()
      return true
    },

    completeGig: (gigId) => useGame.getState().clearGig(gigId),

    forceGig: (gigId) => useGame.getState().clearGig(gigId, true),

    setXp: setXpDirect,

    setFont: (id) => {
      if (!isUiFontId(id)) return false
      setUiFont(id)
      return true
    },

    tick: (ms) => {
      const state = useGame.getState()
      const step = Math.max(0, Math.min(ms, offlineCapMs(state.gold, OFFLINE_CAP_MS, state.legacy.perks)))
      state.tick(state.now + step)
    },

    setMoney: setMoneyDirect,

    forceCats: (count) => {
      const gifs = CAT_ROSTER.filter((cat) => isGif(cat.url)).slice(0, Math.max(0, Math.floor(count)))
      for (const cat of gifs) useGame.getState().discoverCat(cat.url)
      return useGame.getState().stats.catsFound.length
    },

    forceBoost: (mult, ms) => {
      if (!(mult > 0) || !(ms > 0) || !Number.isFinite(mult) || !Number.isFinite(ms)) return
      const now = Date.now()
      useGame.setState({
        activeBoost: { mult, endsAt: now + ms },
        now,
      })
      persistNow()
    },

    advanceOffline: (ms) => {
      if (!(ms > 0) || !Number.isFinite(ms)) return { credited: 0, creditedXp: 0, toast: null }
      const now = Date.now()
      const before = useGame.getState().money
      const beforeXp = useGame.getState().xp
      writeStateAt(now - ms)
      const hydrated = hydrate(readCareerText(), now)
      const toastSeq = useGame.getState().toastSeq + 1
      const message = noteToast(hydrated.toast, toastSeq)
      useGame.setState({
        money: hydrated.save.money,
        xp: hydrated.save.xp,
        xpTotal: hydrated.save.xpTotal,
        stats: normalizeStats(hydrated.save.stats),
        owned: hydrated.save.owned,
        ...(hydrated.save.career ? { journal: journalFromSave(hydrated.save.career), returns: hydrated.save.career.returns } : {}),
        tempMults: hydrated.save.tempMults ?? {},
        foreverMult: hydrated.save.foreverMult ?? 1,
        company: hydrated.save.company ?? FRESH_COMPANY,
        hires: hydrated.save.hires ?? {},
        activeBoost: hydrated.save.activeBoost ?? null,
        now,
        idleSince: now,
        nextBoostAt: null,
        toast: message ?? useGame.getState().toast,
        toastSeq: message ? toastSeq : useGame.getState().toastSeq,
      })
      persistNow()
      return {
        credited: hydrated.save.money - before,
        creditedXp: hydrated.save.xp - beforeXp,
        toast: hydrated.toast,
      }
    },

    forceEvent: (eventId) => useGame.getState().fireEvent(eventId),

    acceptEvent: () => useGame.getState().acceptEvent(),

    dismissEvent: () => useGame.getState().dismissEvent(),

    forceReview: (promptId) => useGame.getState().fireReview(promptId),

    answerReview: (choice) => useGame.getState().answerReview(choice),

    dismissReview: () => useGame.getState().dismissReview(),

    previewEra: (era) => useGame.getState().setPreviewEra(era),

    careerLog: () => useGame.getState().journal.entries.map(careerJson),
    rerollProfile: () => useGame.getState().rerollProfile(),
    rerollProduct: () => useGame.getState().rerollProduct(),
    keepProfile: () => useGame.getState().keepProfile(),

    seeFeature: (id) => {
      if (!isFeatureId(id)) return false
      useGame.getState().seeFeature(id)
      return true
    },

    clearReveals: () => useGame.getState().clearReveals(),

    reset: () => {
      useGame.getState().wipe()
    },
  }

  if (typeof window !== "undefined") {
    window.__GAME__ = api
  }
  return api
}

declare global {
  interface Window {
    __GAME__: GameHarness
  }
}
