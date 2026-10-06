import { Lock } from "lucide-react"
import { useRef, useState } from "react"
import type { ReactNode } from "react"
import { createPortal } from "react-dom"
import type { FeatureId } from "../data/features.ts"
import { useFresh, useGhost } from "./useFeature.ts"

/** The NEW marker: a dot on an icon, or a pill on a wider control. It stays until the thing is used once. */
export function NewMark({ id, pill = false }: { id: FeatureId | `${string}:`; pill?: boolean }) {
  const fresh = useFresh(id)
  if (!fresh) return null
  return pill ? (
    <i className="ul-pill" data-testid="new-mark" data-new={id}>
      New
    </i>
  ) : (
    <i className="ul-dot" data-testid="new-mark" data-new={id}>
      <span className="sr-only">New</span>
    </i>
  )
}

const RING_R = 20
const RING_C = 2 * Math.PI * RING_R

/** A ring that fills as the unlock gets close. */
function Ring({ fill }: { fill: number }) {
  return (
    <svg className="ul-ring" viewBox="0 0 46 46" aria-hidden="true">
      <circle className="ul-ring-bg" cx="23" cy="23" r={RING_R} />
      <circle className="ul-ring-fg" cx="23" cy="23" r={RING_R} strokeDasharray={RING_C} strokeDashoffset={RING_C * (1 - Math.max(0, Math.min(1, fill)))} />
    </svg>
  )
}

type TipPlace = "right" | "below" | "above"

function tipStyle(rect: DOMRect, place: TipPlace): React.CSSProperties {
  if (place === "right") return { left: rect.right + 12, top: rect.top + rect.height / 2, transform: "translateY(-50%)" }
  if (place === "below") return { left: Math.max(8, rect.right), top: rect.bottom + 10, transform: "translateX(-100%)" }
  return { left: rect.left + rect.width / 2, top: rect.top - 10, transform: "translate(-50%, -100%)" }
}

/**
 * The next unlock, standing dim in the place it will take, with a ring that fills as it gets close. Hover or focus
 * says what opens it. Only the one row the timeline teases renders anything; every other slot stays empty.
 */
export function FeatureGhost({ id, place = "right", className, children }: { id: FeatureId; place?: TipPlace; className?: string; children: ReactNode }) {
  const tease = useGhost(id)
  const ref = useRef<HTMLSpanElement>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)
  if (!tease) return null
  const show = () => setRect(ref.current?.getBoundingClientRect() ?? null)
  const hide = () => setRect(null)
  return (
    <span
      ref={ref}
      className={["ul-ghost", className].filter(Boolean).join(" ")}
      tabIndex={0}
      role="img"
      aria-label={`${tease.name}: unlocks with ${tease.via}. ${tease.left}`}
      data-testid="feature-ghost"
      data-feature={id}
      onPointerEnter={show}
      onPointerLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      <Ring fill={tease.fill} />
      <span className="ul-lock" aria-hidden="true">
        <Lock size={9} strokeWidth={2.6} />
      </span>
      {rect && typeof document !== "undefined"
        ? createPortal(
            <span className="ul-tip" role="tooltip" style={tipStyle(rect, place)}>
              <b>{tease.name}</b> · unlocks with <i>{tease.via}</i>
              {tease.left ? <small>{tease.left}</small> : null}
            </span>,
            document.body,
          )
        : null}
    </span>
  )
}
