import { STAR_LABELS } from "../../game/studio/score.ts"
import type { Stars as StarCount } from "../../game/studio/score.ts"

/** Three stars: works, meets the targets, under half the budget. Filled up to `value`; each star's tooltip names what it is for. */
export function Stars({ value, testid = "studio-stars" }: { value: StarCount; testid?: string }) {
  return (
    <span className="studio-stars" data-testid={testid} data-stars={value} role="img" aria-label={`${value} of 3 stars`}>
      {[1, 2, 3].map((n) => (
        <span key={n} className={n <= value ? "studio-star is-earned" : "studio-star"} title={STAR_LABELS[n - 1]} aria-hidden>
          {n <= value ? "★" : "☆"}
        </span>
      ))}
    </span>
  )
}
