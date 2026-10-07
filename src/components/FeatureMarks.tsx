import { Lock } from "lucide-react"
import { useRef, useState } from "react"
import type { ReactNode } from "react"
import { createPortal } from "react-dom"
import type { FeatureId } from "../data/features.ts"
import { featureById } from "../game/features.ts"
import { FALLBACK_ICON, FEATURE_ICON } from "./featureIcons.ts"
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

type TipPlace = "right" | "below" | "above"

function tipStyle(rect: DOMRect, place: TipPlace): React.CSSProperties {
  if (place === "right") return { left: rect.right + 12, top: rect.top + rect.height / 2, transform: "translateY(-50%)" }
  if (place === "below") return { left: Math.max(8, rect.right), top: rect.bottom + 10, transform: "translateX(-100%)" }
  return { left: rect.left + rect.width / 2, top: rect.top - 10, transform: "translate(-50%, -100%)" }
}

/** A tooltip portalled to the body, so a scrolling list or a clipped row never cuts it off. Shown on hover and focus. */
function useTip<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const show = () => setRect(ref.current?.getBoundingClientRect() ?? null)
  const hide = () => setRect(null)
  const tip = (place: TipPlace, body: ReactNode) =>
    rect && typeof document !== "undefined"
      ? createPortal(
          <span className="ul-tip" role="tooltip" style={tipStyle(rect, place)}>
            {body}
          </span>,
          document.body,
        )
      : null
  return { ref, handlers: { onPointerEnter: show, onPointerLeave: hide, onFocus: show, onBlur: hide }, tip }
}

/**
 * What buying a row opens, as a small green badge wearing that feature's own icon. The name is in the tooltip (and
 * read out); `named` also prints it beside the icon, where there is room, as on the Next banner.
 */
export function UnlockBadge({ id, named = false }: { id: string; named?: boolean }) {
  const { ref, handlers, tip } = useTip<HTMLSpanElement>()
  const row = featureById(id)
  if (!row) return null
  const Icon = FEATURE_ICON[id] ?? (row.parent ? FEATURE_ICON[row.parent] : undefined) ?? FALLBACK_ICON
  return (
    <span
      ref={ref}
      className={named ? "ul-chip is-named" : "ul-chip"}
      tabIndex={named ? undefined : 0}
      data-testid="unlock-chip"
      data-feature={id}
      {...handlers}
    >
      <Icon size={11} strokeWidth={2.4} aria-hidden />
      <span className={named ? "ul-chip-name" : "sr-only"}>
        <span className="sr-only">Unlocks </span>
        {row.name}
      </span>
      {tip(
        "above",
        <>
          Unlocks <i>{row.name}</i>
          <small>{row.blurb}</small>
        </>,
      )}
    </span>
  )
}

/**
 * The next unlock, standing dim in the place it will take, with a ring that fills as it gets close. Hover or focus
 * says what opens it. Only the one row the timeline teases renders anything; every other slot stays empty.
 */
export function FeatureGhost({ id, place = "right", className, children }: { id: FeatureId; place?: TipPlace; className?: string; children: ReactNode }) {
  const tease = useGhost(id)
  const { ref, handlers, tip } = useTip<HTMLSpanElement>()
  if (!tease) return null
  return (
    <span
      ref={ref}
      className={["ul-ghost", className].filter(Boolean).join(" ")}
      tabIndex={0}
      role="img"
      aria-label={`${tease.name}: unlocks with ${tease.via}. ${tease.left}`}
      data-testid="feature-ghost"
      data-feature={id}
      {...handlers}
    >
      {children}
      <span className="ul-lock" aria-hidden="true">
        <Lock size={9} strokeWidth={2.6} />
      </span>
      {tip(
        place,
        <>
          <b>{tease.name}</b> · unlocks with <i>{tease.via}</i>
          {tease.left ? <small>{tease.left}</small> : null}
        </>,
      )}
    </span>
  )
}
