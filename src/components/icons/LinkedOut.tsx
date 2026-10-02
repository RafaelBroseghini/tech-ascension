import type { ClickIconProps } from "../../data/clickIcons.ts"

/**
 * LinkedOut wordmark. Spelled-out text in a blue pill.
 * Not the LinkedIn mark: no "in" square, no trademarked geometry.
 * Professional networking, but every DM is a recruiter who ghosts.
 */
export function LinkedOutIcon({ size = 24, className }: ClickIconProps) {
  const height = size
  const width = Math.round((size * 120) / 28)
  const label = [className, "linkedout-mark"].filter(Boolean).join(" ")
  return (
    <svg className={label} width={width} height={height} viewBox="0 0 120 28" role="img" aria-label="LinkedOut">
      <title>LinkedOut. Professional networking, but every DM is a recruiter who ghosts.</title>
      <rect width="120" height="28" rx="14" fill="#0B5CAB" />
      <text
        x="60"
        y="19"
        textAnchor="middle"
        fill="#ffffff"
        fontFamily="Chakra Petch, ui-sans-serif, system-ui, sans-serif"
        fontSize="14"
        fontWeight="700"
      >
        LinkedOut
      </text>
    </svg>
  )
}
