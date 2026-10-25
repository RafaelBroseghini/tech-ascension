import { useEffect, useMemo, useRef, useSyncExternalStore } from "react"
import type { FeatureId } from "../data/features.ts"
import { getAdminMode, subscribeAdminMode } from "../game/adminMode.ts"
import { progressOf } from "../game/careerSync.ts"
import { ALL_FEATURE_IDS, nextGhost } from "../game/features.ts"
import type { FeatureTease } from "../game/features.ts"
import { useGame } from "../game/store.ts"
import { onSettingsAt, onSurface } from "../game/surfaces.ts"
import type { Surface } from "../game/surfaces.ts"

/** Admin mode shows the whole desk. */
export function useAdmin(): boolean {
  return useSyncExternalStore(subscribeAdminMode, getAdminMode, getAdminMode)
}

/** True once the career has unlocked this part of the desk (or in admin mode). */
export function useFeatureOpen(id: FeatureId): boolean {
  const admin = useAdmin()
  const open = useGame((state) => state.unlocked.includes(id))
  return admin || open
}

/** The career's unlocked rows as a set, for pickers that filter by them. */
export function useUnlockedSet(): ReadonlySet<string> {
  const unlocked = useGame((state) => state.unlocked)
  const admin = useAdmin()
  return useMemo(() => (admin ? new Set<string>(ALL_FEATURE_IDS) : new Set<string>(unlocked)), [admin, unlocked])
}

/** True while the row still carries its NEW marker. A prefix ("theme:") asks about any row under it. */
export function useFresh(id: FeatureId | `${string}:`): boolean {
  return useGame((state) => (id.endsWith(":") ? state.fresh.some((key) => key.startsWith(id)) : state.fresh.includes(id as FeatureId)))
}

/** Packs the ghost's numbers into one string, so a tick that moves nothing visible does not re-render it. */
function ghostKey(state: ReturnType<typeof useGame.getState>, id: FeatureId): string {
  const ghost = nextGhost(progressOf(state), new Set(state.unlocked))
  if (!ghost || ghost.id !== id) return ""
  return JSON.stringify([ghost.name, ghost.via, Math.floor(ghost.fill * 50) / 50, ghost.left, ghost.blurb])
}

/** The tease when this row is the one dim outline on screen, else null. Admin mode shows no outlines. */
export function useGhost(id: FeatureId): FeatureTease | null {
  const admin = useAdmin()
  const key = useGame((state) => (admin ? "" : ghostKey(state, id)))
  if (!key) return null
  const [name, via, fill, left, blurb] = JSON.parse(key) as [string, string, number, string, string]
  return { id, name, via, fill, left, blurb, mystery: false }
}

/** Runs `handler` when something asks this surface to open. */
export function useSurface(id: Surface, handler: () => void): void {
  const ref = useRef(handler)
  useEffect(() => {
    ref.current = handler
  })
  useEffect(() => onSurface(id, () => ref.current()), [id])
}

/** Runs `handler` when something asks the settings menu to open on a row; it returns false to decline. */
export function useSettingsAt(handler: (targets: readonly string[]) => boolean): void {
  const ref = useRef(handler)
  useEffect(() => {
    ref.current = handler
  })
  useEffect(() => onSettingsAt((targets) => ref.current(targets)), [])
}
