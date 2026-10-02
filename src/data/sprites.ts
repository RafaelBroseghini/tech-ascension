import type { Era } from "./tiers.ts"
import { spriteDataUrl, THUMB_SIZE, MAIN_SIZE } from "../pixel/sprites.ts"

/** Main stage art: 64×64 pixel PNG for a tier. Art 0 is the opening attic shown before the first purchase. */
export function spriteForTier(id: number): string {
  return spriteDataUrl(id, MAIN_SIZE)
}

/** Owned-strip, shop and waterfall art: the same drawing at 32×32. */
export function thumbForTier(id: number): string {
  return spriteDataUrl(id, THUMB_SIZE)
}

export const ERA_ACCENT: Record<Era, { glow: string; tint: string; kicker: string }> = {
  early: { glow: "#6fe08c", tint: "#11261a", kicker: "Early career" },
  mid: { glow: "#5aa9ff", tint: "#0e1f36", kicker: "The climb" },
  upper: { glow: "#f3b94a", tint: "#31230b", kicker: "Ownership" },
  q3: { glow: "#3fdacb", tint: "#0a2a2b", kicker: "Scale" },
  end: { glow: "#ff7b4f", tint: "#381508", kicker: "Off-world" },
}
