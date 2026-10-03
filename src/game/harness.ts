import type { ActiveBoost } from "../data/boosts.ts"
import type { Era } from "../data/capital.ts"
import { clickPower, idlePerSec, jobById, ownedCount, production, xpPerClick, xpPerSec } from "./economy.ts"
import { eventById, previewOffer } from "./events.ts"
import { noteToast } from "./offlineNote.ts"
import { previewReviewChoice, reviewById } from "./reviews.ts"
import type { ReviewChoiceId } from "./reviews.ts"
import { remainingMs } from "./fight.ts"
import type { FightOutcome } from "./fight.ts"
import { itemsOf } from "../data/idePacks.ts"
import { ideView } from "./ide.ts"
import { modFactors, modsOf, pruneTemp } from "./mods.ts"
import type { TempMults } from "./mods.ts"
import { nextUnlock } from "./nextUnlock.ts"
import type { NextUnlock } from "./nextUnlock.ts"
import { capitalUnlocked, equipmentOpen, eraOf, gigBoardUnlocked, jobBoardUnlocked, stageOf } from "./phase.ts"
import type { Phase } from "./phase.ts"
import { hydrate, OFFLINE_CAP_MS } from "./save.ts"
import { normalizeStats } from "./stats.ts"
import { readCareerText } from "./ledger.ts"
import { persistNow, useGame, writeStateAt } from "./store.ts"
import type { ActiveReview } from "./store.ts"

export type FightSnapshot = {
  enemyId: number
  hp: number
  maxHp: number
  remainingMs: number
}

export type PopSnapshot = { kind: "click" | "gigClear" | "fightWin" | "unlock"; size: "medium" | "large"; amount: number; label: string }

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

export type IdeSnapshot = {
  /** Era of the pack on screen. */
  era: Era
  packId: string
  kind: "files" | "inbox" | "deck"
  /** File names, email subjects or slide titles, in tab order. */
  items: string[]
  index: number
  /** True while a shop era tab is previewing a pack other than the owned one. */
  previewing: boolean
  /** The pack progress alone would show. */
  restPackId: string
  /** Unlocked folder ids in explorer order (each band persists once entered). */
  folders: string[]
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
  ide: IdeSnapshot
  /** Phase D capital tiers, keyed by tier id ("26"). */  owned: Record<string, number>
  skills: Record<string, number>
  equipment: Record<string, number>
  jobs: number[]
  /** Completed gig ids. */
  gigs: number[]
  /** `gear` opens with the Job Board. */
  unlocks: { gigBoard: boolean; jobBoard: boolean; gear: boolean; capital: boolean }
  /** The target in the shop banner under the tabs, or null when nothing is left to unlock. */
  nextUnlock: NextUnlock | null
  era: Era
  /** Art id of the stage sprite: art id of the highest owned capital row, or the art of the furthest skill, gig or job. 1 before the first purchase. */
  spriteTierId: number
  activeBoost: ActiveBoost | null
  savedAt: number
  /** Running rare-enemy fight, or null when idle. */
  fight: FightSnapshot | null
  /** How the most recent fight ended (reward is 0 unless it was a win), or null. */
  lastFight: { kind: FightOutcome["kind"]; enemyId: number; reward: number } | null
  /** The most recent money pop (medium on a paying click, large on gig clear, fight win, phase unlock), or null. */
  lastPop: PopSnapshot | null
}

export type OfflineCatchup = {
  credited: number
  creditedXp: number
  toast: string | null
}

export type GameHarness = {
  getState: () => GameSnapshot
  click: () => { money: number; xp: number }
  /** Buy one Phase D capital row. False before capital unlocks or when it costs too much. */
  buy: (tierId: number) => boolean
  buySkill: (skillId: number) => boolean
  buyJob: (jobId: number) => boolean
  buyEquipment: (equipId: number) => boolean
  /** Clear a gig through the normal gates (board open, XP, prior gigs). */
  completeGig: (gigId: number) => boolean
  /** Clear a gig now, bypassing every requirement. False for an unknown or already cleared id. */
  forceGig: (gigId: number) => boolean
  setXp: (n: number) => void
  tick: (ms: number) => void
  setMoney: (n: number) => void
  forceBoost: (mult: number, ms: number) => void
  advanceOffline: (ms: number) => OfflineCatchup
  /** Start a fight with this enemy id now, bypassing the rare spawn. False for an unknown id. */
  forceEnemy: (enemyId: number) => boolean
  /** End the current fight with no reward. */
  flee: () => void
  /** Open this event now, without applying it. False for an unknown id or during a fight. Replaces an open event. */
  forceEvent: (eventId: number) => boolean
  /** Take the open deal. False when nothing is open or the cost cannot be paid. */
  acceptEvent: () => boolean
  /** Decline the open event. Balances stay put. */
  dismissEvent: () => void
  /**
   * Open a 1:1 for the highest job held. Optional prompt id must sit in that job's band.
   * False with no job, during a fight, or for an unknown prompt. Replaces an open event or review.
   */
  forceReview: (promptId?: number) => boolean
  /** Take a reply. False when nothing is open, the choice is unknown, or the plan cannot be paid. */
  answerReview: (choice: ReviewChoiceId) => boolean
  /** Leave the 1:1. Balances stay put. */
  dismissReview: () => void
  /** Open file, email or slide `index` in `packId`, or the pack on screen when omitted. */
  ideSelect: (index: number, packId?: string) => boolean
  /** Preview an era's pack as the shop era tab does, or null to snap back to the owned one. */
  previewEra: (era: Era | null) => void
  reset: () => void
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

export function installGameHarness(): GameHarness {
  const api: GameHarness = {
    getState: () => {
      const state = useGame.getState()
      const now = Date.now()
      const stage = stageOf(state)
      const fx = modFactors(modsOf(state), now, now)
      const view = ideView(state)
      return {
        money: state.money,
        xp: state.xp,
        xpTotal: state.xpTotal,
        phase: state.phase,
        cps: idlePerSec(state) * fx.cps,
        clickPower: clickPower(state) * fx.click,
        xpPerClick: xpPerClick(state.skills) * fx.click,
        xpPerSec: xpPerSec(state.skills) * fx.xpIdle,
        foreverMult: state.foreverMult,
        tempMults: pruneTemp(state.tempMults, now),
        event: eventSnapshot(state.event, liveEventLines(state)),
        lastEvent: eventSnapshot(state.lastEvent, null),
        review: reviewSnapshot(state),
        lastReview: lastReviewSnapshot(state.lastReview),
        ide: {
          era: view.pack.era,
          packId: view.pack.id,
          kind: view.pack.kind,
          items: itemsOf(view.pack).map((item) => item.label),
          index: view.index,
          previewing: view.previewing,
          restPackId: view.restPack.id,
          folders: view.folders.map((folder) => folder.id),
        },
        owned: { ...state.owned },
        skills: { ...state.skills },
        equipment: { ...state.equipment },
        jobs: [...state.jobs],
        gigs: [...state.gigs],
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
        fight: state.fight
          ? {
              enemyId: state.fight.enemyId,
              hp: state.fight.hp,
              maxHp: state.fight.maxHp,
              remainingMs: remainingMs(state.fight, state.now),
            }
          : null,
        lastFight: state.fightResult
          ? { kind: state.fightResult.kind, enemyId: state.fightResult.enemyId, reward: state.fightResult.reward }
          : null,
        lastPop: state.pop
          ? { kind: state.pop.kind, size: state.pop.size, amount: state.pop.amount, label: state.pop.label }
          : null,
      }
    },

    click: () => useGame.getState().click(),

    buy: (tierId) => {
      const before = ownedCount(useGame.getState().owned, tierId)
      useGame.getState().buy(tierId, "one")
      return ownedCount(useGame.getState().owned, tierId) > before
    },

    buySkill: (skillId) => {
      const before = ownedCount(useGame.getState().skills, skillId)
      useGame.getState().buySkill(skillId, "one")
      return ownedCount(useGame.getState().skills, skillId) > before
    },

    buyJob: (jobId) => useGame.getState().buyJob(jobId),

    buyEquipment: (equipId) => {
      const before = ownedCount(useGame.getState().equipment, equipId)
      useGame.getState().buyEquipment(equipId, "one")
      return ownedCount(useGame.getState().equipment, equipId) > before
    },

    completeGig: (gigId) => useGame.getState().clearGig(gigId),

    forceGig: (gigId) => useGame.getState().clearGig(gigId, true),

    setXp: (n) => {
      if (!Number.isFinite(n)) return
      const xp = Math.max(0, n)
      useGame.setState((state) => ({ xp, xpTotal: Math.max(state.xpTotal, xp) }))
      persistNow()
    },

    tick: (ms) => {
      const state = useGame.getState()
      const step = Math.max(0, Math.min(ms, OFFLINE_CAP_MS))
      state.tick(state.now + step)
    },

    setMoney: (n) => {
      if (!Number.isFinite(n)) return
      useGame.setState({ money: Math.max(0, n) })
      persistNow()
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
        tempMults: hydrated.save.tempMults ?? {},
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

    forceEnemy: (enemyId) => useGame.getState().forceEnemy(enemyId),

    flee: () => useGame.getState().flee(),

    forceEvent: (eventId) => useGame.getState().fireEvent(eventId),

    acceptEvent: () => useGame.getState().acceptEvent(),

    dismissEvent: () => useGame.getState().dismissEvent(),

    forceReview: (promptId) => useGame.getState().fireReview(promptId),

    answerReview: (choice) => useGame.getState().answerReview(choice),

    dismissReview: () => useGame.getState().dismissReview(),

    ideSelect: (index, packId) => {
      const state = useGame.getState()
      const view = ideView(state)
      const target = packId ?? view.pack.id
      const folder = view.folders.find((row) => row.id === target)
      if (!folder) return false
      const count = itemsOf(folder.pack).length
      if (!Number.isInteger(index) || index < 0 || index >= count) return false
      useGame.getState().selectIde(target, index)
      return true
    },

    previewEra: (era) => useGame.getState().setPreviewEra(era),

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
