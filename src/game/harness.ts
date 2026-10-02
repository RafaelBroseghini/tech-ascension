import type { ActiveBoost } from "../data/boosts.ts"
import type { Era } from "../data/tiers.ts"
import { TIERS } from "../data/tiers.ts"
import { clickPower, highestOwnedTier, idlePerSec, ownedCount, tierByKey } from "./economy.ts"
import { hydrate, OFFLINE_CAP_MS } from "./save.ts"
import { persistNow, useGame, writeStateAt } from "./store.ts"
import { readSaveText } from "./storage.ts"

export type GameSnapshot = {
  money: number
  xp: number
  /** Idle $/s. Click boosts do not change this. */
  cps: number
  /** Base money per click, before activeBoost. */
  clickPower: number
  owned: Record<string, number>
  era: Era
  /** Key of the highest owned stage, or the first stage's key before the first purchase. */
  spriteTierKey: string
  activeBoost: ActiveBoost | null
  savedAt: number
}

export type OfflineCatchup = {
  credited: number
  toast: string | null
}

export type StageInfo = {
  key: string
  name: string
  era: Era
  baseCost: number
}

export type GameHarness = {
  getState: () => GameSnapshot
  /** All stages in price order. Use `key` with `buy` and to read `owned`. */
  stages: () => StageInfo[]
  click: () => { money: number; xp: number }
  buy: (tierKey: string) => boolean
  tick: (ms: number) => void
  setMoney: (n: number) => void
  forceBoost: (mult: number, ms: number) => void
  advanceOffline: (ms: number) => OfflineCatchup
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

export function installGameHarness(): GameHarness {
  const api: GameHarness = {
    getState: () => {
      const state = useGame.getState()
      const now = Date.now()
      const best = highestOwnedTier(state.owned)
      const spriteTierKey = best?.key ?? TIERS[0]?.key ?? ""
      const era = tierByKey(spriteTierKey)?.era ?? "early"
      return {
        money: state.money,
        xp: state.xp,
        cps: idlePerSec(state.owned),
        clickPower: clickPower(state.owned),
        owned: { ...state.owned },
        era,
        spriteTierKey,
        activeBoost: liveBoost(state.activeBoost, now),
        savedAt: readSavedAt(),
      }
    },

    stages: () => TIERS.map((tier) => ({ key: tier.key, name: tier.name, era: tier.era, baseCost: tier.baseCost })),

    click: () => useGame.getState().click(),

    buy: (tierKey) => {
      const before = ownedCount(useGame.getState().owned, tierKey)
      useGame.getState().buy(tierKey, "one")
      return ownedCount(useGame.getState().owned, tierKey) > before
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
      if (!(ms > 0) || !Number.isFinite(ms)) return { credited: 0, toast: null }
      const now = Date.now()
      const before = useGame.getState().money
      writeStateAt(now - ms)
      const hydrated = hydrate(readSaveText(), now)
      const toastSeq = useGame.getState().toastSeq + 1
      useGame.setState({
        money: hydrated.save.money,
        xp: hydrated.save.xp,
        owned: hydrated.save.owned,
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
        toast: hydrated.toast,
      }
    },

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
