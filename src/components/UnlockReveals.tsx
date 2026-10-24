import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { featureById } from "../game/features.ts"
import { useGame } from "../game/store.ts"
import { openSurface } from "../game/surfaces.ts"
import { presenceRef } from "./useMotion.ts"

/** How long a card stays up when nobody touches it. */
const CARD_MS = 8_000

/** The card rises a little and settles with a touch of overshoot; closing is a shorter fade down. */
const cardPresence = presenceRef({
  fade: { in: 0.2, out: 0.16 },
  move: { from: { scale: 0.92, y: 10 }, to: { scale: 0.94, y: 6 }, spring: { stiffness: 420, damping: 24, mass: 0.8 } },
})

type Placement = { left: number; top: number; side: "left" | "right" | "above" | "below" }

/** The element a reveal points at: the row's own place, or its picker's for a cosmetic. */
function anchorFor(id: string): HTMLElement | null {
  if (typeof document === "undefined") return null
  return document.querySelector<HTMLElement>(`[data-feature-anchor~="${CSS.escape(id)}"]`)
}

const GAP = 14
const EDGE = 10

/** Beside the anchor where it fits: right, left, below, above. Without an anchor, low on the left of the stage. */
function place(anchor: DOMRect | null, card: { width: number; height: number }): Placement {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const clampX = (x: number) => Math.min(Math.max(EDGE, x), vw - card.width - EDGE)
  const clampY = (y: number) => Math.min(Math.max(EDGE, y), vh - card.height - EDGE)
  if (!anchor) return { left: clampX(72), top: clampY(vh - card.height - 56), side: "right" }
  const midY = anchor.top + anchor.height / 2 - card.height / 2
  if (anchor.right + GAP + card.width <= vw - EDGE) return { left: anchor.right + GAP, top: clampY(midY), side: "right" }
  if (anchor.left - GAP - card.width >= EDGE) return { left: anchor.left - GAP - card.width, top: clampY(midY), side: "left" }
  const midX = clampX(anchor.left + anchor.width / 2 - card.width / 2)
  if (anchor.bottom + GAP + card.height <= vh - EDGE) return { left: midX, top: anchor.bottom + GAP, side: "below" }
  return { left: midX, top: clampY(anchor.top - GAP - card.height), side: "above" }
}

type CardCopy = { kicker: string; title: string; body: string; from?: string; action?: string }

/**
 * The card beside an unlock: what it is, one line on what it is for, and a button that opens it. It never takes
 * focus or covers the stage, and it tucks itself away after a few seconds unless the pointer is on it.
 */
export function RevealCard({
  copy,
  anchorId,
  onAction,
  onClose,
}: {
  copy: CardCopy
  /** `data-feature-anchor` of what the card points at. Looked up after render, so it finds what just appeared. */
  anchorId: string | null
  onAction?: () => void
  /** `timedOut` when nobody touched it. */
  onClose: (timedOut: boolean) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [spot, setSpot] = useState<Placement | null>(null)
  const [held, setHeld] = useState(false)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })
  // One stable callback: the card is measured through `ref`, and the presence (its entrance, and its exit once it is gone) rides along.
  const attach = useCallback((el: HTMLDivElement | null) => {
    ref.current = el
    return cardPresence(el)
  }, [])

  useLayoutEffect(() => {
    const anchor = anchorId ? anchorFor(anchorId) : null
    const measure = () => {
      const card = ref.current
      if (!card) return
      setSpot(place(anchor?.isConnected ? anchor.getBoundingClientRect() : null, { width: card.offsetWidth, height: card.offsetHeight }))
    }
    measure()
    // The thing it points at glows while the card is up.
    anchor?.classList.add("ul-lit")
    window.addEventListener("resize", measure)
    return () => {
      window.removeEventListener("resize", measure)
      anchor?.classList.remove("ul-lit")
    }
  }, [anchorId])

  // Closing unmounts at once; the exit is a copy that fades where the card was (useMotion.ts).
  useEffect(() => {
    if (held) return
    const id = window.setTimeout(() => closeRef.current(true), CARD_MS)
    return () => window.clearTimeout(id)
  }, [held])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || document.querySelector("[aria-modal='true']")) return
      closeRef.current(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return createPortal(
    <div
      ref={attach}
      className={["ul-card", spot ? `from-${spot.side}` : "is-measuring"].join(" ")}
      style={spot ? { left: spot.left, top: spot.top } : undefined}
      role="status"
      aria-live="polite"
      data-testid="unlock-card"
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <p className="ul-kicker">{copy.kicker}</p>
      <p className="ul-title" data-testid="unlock-card-title">
        {copy.title}
      </p>
      <p className="ul-body">{copy.body}</p>
      {copy.from ? <p className="ul-from">{copy.from}</p> : null}
      <div className="ul-actions">
        {onAction && copy.action ? (
          <button
            type="button"
            className="ul-btn is-primary"
            data-testid="unlock-card-action"
            onClick={() => {
              onAction()
              closeRef.current(false)
            }}
          >
            {copy.action}
          </button>
        ) : null}
        <button type="button" className="ul-btn" data-testid="unlock-card-close" onClick={() => closeRef.current(false)}>
          {onAction && copy.action ? "Later" : "Got it"}
        </button>
        <span className="ul-key" aria-hidden="true">
          Esc
        </span>
      </div>
    </div>,
    document.body,
  )
}

/**
 * Unlocks do not pop up. Each one lights its NEW marker on its row and tab (see FeatureMarks), and the reveal queue
 * drains here so nothing waits. A big unlock is still announced to screen readers. The card left is the What's new
 * note an older save gets once.
 */
export function UnlockReveals() {
  const head = useGame((state) => state.reveals[0] ?? null)
  const blocked = useGame((state) => state.event !== null || state.review !== null)
  const whatsNew = useGame((state) => state.whatsNew)

  useEffect(() => {
    if (!head) return
    const row = featureById(head)
    if (row?.size === "big") useGame.getState().announceUnlock(row.name)
    useGame.getState().takeReveal()
  }, [head])

  if (!whatsNew || blocked || head) return null

  return (
    <RevealCard
      anchorId="careerLog"
      copy={{
        kicker: "What's new",
        title: "Career log",
        body: "Your career, commit by commit, with what unlocks next.",
        action: "Open it",
      }}
      onAction={() => openSurface("careerLog")}
      onClose={() => useGame.getState().dismissWhatsNew()}
    />
  )
}
