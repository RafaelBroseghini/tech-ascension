import type { Era } from "./capital.ts"

/**
 * Per-era accents for the stage and shop. Kept apart from sprites.ts so importing a color does not
 * pull the pixel-art generator into the boot bundle.
 */
export const ERA_ACCENT: Record<Era, { glow: string; tint: string; kicker: string }> = {
  early: { glow: "var(--ide-green)", tint: "var(--accent-deep)", kicker: "Early career" },
  mid: { glow: "var(--ide-blue)", tint: "var(--accent-deep)", kicker: "The climb" },
  upper: { glow: "var(--ide-peach)", tint: "var(--accent-deep)", kicker: "Ownership" },
  q3: { glow: "var(--ide-sky)", tint: "var(--accent-deep)", kicker: "Scale" },
  end: { glow: "var(--ide-rosewater)", tint: "var(--accent-deep)", kicker: "Off-world" },
}
