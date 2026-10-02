import type { ActiveBoost } from "../data/boosts.ts"
import type { Era } from "../data/tiers.ts"
import { clickPower, idlePerSec, ownedCount, xpPerClick, xpPerSec } from "./economy.ts"
import { eventById } from "./events.ts"
import { remainingMs } from "./fight.ts"
import type { FightOutcome } from "./fight.ts"
import { itemsOf } from "../data/idePacks.ts"
import { ideView } from "./ide.ts"
import { modFactors, modsOf, pruneTemp } from "./mods.ts"
import type { TempMults } from "./mods.ts"
import { capitalUnlocked, eraOf, gigBoardUnlocked, jobBoardUnlocked, stageOf } from "./phase.ts"
import type { Phase } from "./phase.ts"
import { hydrate, OFFLINE_CAP_MS } from "./save.ts"
import { persistNow, useGame, writeStateAt } from "./store.ts"
import { readSaveText } from "./storage.ts"

export type FightSnapshot = {
  enemyId: number
  hp: number
  maxHp: number
  remainingMs: number
}

export type PopSnapshot = { kind: "click" | "gigClear" | "fightWin" | "unlock"; size: "medium" | "large"; amount: number; label: string }

export type EventSnapshot = { eventId: number; name: string; lines: string[] }

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
  /** Money per click, before activeBoost. Paid once the first gig is cleared. */
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
  ide: IdeSnapshot
  /** Phase D capital tiers, keyed by tier id ("26"). */
  owned: Record<string, number>
  skills: Record<string, number>
  equipment: Record<string, number>
  jobs: number[]
  /** Completed gig ids. */
  gigs: number[]
  unlocks: { gigBoard: boolean; jobBoard: boolean; capital: boolean }
  era: Era
  /** Art id of the stage sprite: capital tier id, or the art of the furthest skill/gig/job. 1 before the first purchase. */
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
  /** Buy one Phase D capital tier. False before capital unlocks or when it costs too much. */
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
  /** Fire this event now. False for an unknown id or during a fight. Replaces an open event. */
  forceEvent: (eventId: number) => boolean
  dismissEvent: () => void
  /** Open file, email or slide `index` of the pack on screen. */
  ideSelect: (index: number) => boolean
  /** Preview an era's pack as the shop era tab does, or null to snap back to the owned one. */
  previewEra: (era: Era | null) => void
  reset: () => void
}

function readSavedAt(): number {
  const text = readSaveText()
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

function eventSnapshot(event: { eventId: number; lines: { text: string }[] } | null): EventSnapshot | null {
  if (!event) return null
  return { eventId: event.eventId, name: eventById(event.eventId)?.name ?? "", lines: event.lines.map((line) => line.text) }
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
        event: eventSnapshot(state.event),
        lastEvent: eventSnapshot(state.lastEvent),
        ide: {
          era: view.pack.era,
          packId: view.pack.id,
          kind: view.pack.kind,
          items: itemsOf(view.pack).map((item) => item.label),
          index: view.index,
          previewing: view.previewing,
          restPackId: view.restPack.id,
        },
        owned: { ...state.owned },
        skills: { ...state.skills },
        equipment: { ...state.equipment },
        jobs: [...state.jobs],
        gigs: [...state.gigs],
        unlocks: {
          gigBoard: gigBoardUnlocked(state),
          jobBoard: jobBoardUnlocked(state),
          capital: capitalUnlocked(state),
        },
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
      const hydrated = hydrate(readSaveText(), now)
      const toastSeq = useGame.getState().toastSeq + 1
      useGame.setState({
        money: hydrated.save.money,
        xp: hydrated.save.xp,
        xpTotal: hydrated.save.xpTotal,
        owned: hydrated.save.owned,
        tempMults: hydrated.save.tempMults ?? {},
        activeBoost: hydrated.save.activeBoost ?? null,
        now,
        idleSince: now,
        nextBoostAt: null,
        toast: hydrated.toast ? { id: toastSeq, text: hydrated.toast } : useGame.getState().toast,
        toastSeq: hydrated.toast ? toastSeq : useGame.getState().toastSeq,
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

    dismissEvent: () => useGame.getState().dismissEvent(),

    ideSelect: (index) => {
      const view = ideView(useGame.getState())
      if (!Number.isInteger(index) || index < 0 || index >= view.count) return false
      useGame.getState().selectIde(view.pack.id, index)
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
