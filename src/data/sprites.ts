import type { Era } from "./capital.ts"
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
  early: { glow: "var(--ide-green)", tint: "var(--accent-deep)", kicker: "Early career" },
  mid: { glow: "var(--ide-blue)", tint: "var(--accent-deep)", kicker: "The climb" },
  upper: { glow: "var(--ide-peach)", tint: "var(--accent-deep)", kicker: "Ownership" },
  q3: { glow: "var(--ide-sky)", tint: "var(--accent-deep)", kicker: "Scale" },
  end: { glow: "var(--ide-rosewater)", tint: "var(--accent-deep)", kicker: "Off-world" },
}
