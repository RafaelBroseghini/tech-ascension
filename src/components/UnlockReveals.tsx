import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import type { FeatureId, FeatureRow } from "../data/features.ts"
import { setDeskPref } from "../game/desk.ts"
import { playUnlockChime } from "../game/deskAudio.ts"
import { featureById, isCosmetic, triggerLabel } from "../game/features.ts"
import { useGame } from "../game/store.ts"
import { openSurface } from "../game/surfaces.ts"
import type { Surface } from "../game/surfaces.ts"

/** How long a card stays up when nobody touches it. */
const CARD_MS = 8_000
/** A big reveal lets the UNLOCKED slam land before its card. */
const BIG_CARD_DELAY_MS = 950
/** A small reveal is a toast and a glow. */
const SMALL_MS = 2_400
/**
 * Quiet time before the next reveal: short after a toast or a card the player closed, longer after a card that timed
 * out (they were busy), shorter again when several are waiting.
 */
const GAP_MS = { small: 1_800, closed: 2_500, timedOut: 6_000, busy: 2_000 }
/** A large money pop (gig clear, phase unlock) owns the stage for this long. */
const POP_HOLD_MS = 1_600

/** The button on a card, for rows that have one. */
const ACTION: Partial<Record<FeatureId, Surface | "music" | "hoverClick">> = {
  careerLog: "careerLog",
  githug: "githug",
  linkedout: "linkedout",
  tenx: "tenx",
  boardGear: "boardGear",
  rosters: "rosters",
  metrics: "metrics",
  music: "music",
  hoverClick: "hoverClick",
}

const COSMETIC_NOUN: Record<string, string> = { theme: "editor theme", kit: "click sound", music: "music style" }

function toastText(row: FeatureRow): string {
  if (!isCosmetic(row)) return `${row.name} unlocked`
  const noun = COSMETIC_NOUN[row.id.slice(0, row.id.indexOf(":"))] ?? "unlock"
  return `New ${noun}: ${row.name}`
}

/** The element a reveal points at: the row's own place, or its picker's for a cosmetic. */
function anchorFor(id: string): HTMLElement | null {
  if (typeof document === "undefined") return null
  return document.querySelector<HTMLElement>(`[data-feature-anchor~="${CSS.escape(id)}"]`)
}

function anchorOf(row: FeatureRow): HTMLElement | null {
  return anchorFor(row.parent ?? row.id)
}

function lightUp(element: HTMLElement | null, className: string, ms: number): () => void {
  if (!element) return () => {}
  element.classList.add(className)
  const id = window.setTimeout(() => element.classList.remove(className), ms)
  return () => {
    window.clearTimeout(id)
    element.classList.remove(className)
  }
}

function runAction(id: FeatureId): void {
  const action = ACTION[id]
  if (!action) return
  if (action === "music") setDeskPref("music", true)
  else if (action === "hoverClick") setDeskPref("hoverClick", true)
  else openSurface(action)
  useGame.getState().seeFeature(id)
}

type Placement = { left: number; top: number; side: "left" | "right" | "above" | "below" }

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
  const [leaving, setLeaving] = useState<false | "closed" | "timedOut">(false)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

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

  useEffect(() => {
    if (held || leaving) return
    const id = window.setTimeout(() => setLeaving("timedOut"), CARD_MS)
    return () => window.clearTimeout(id)
  }, [held, leaving])

  useEffect(() => {
    if (!leaving) return
    const id = window.setTimeout(() => closeRef.current(leaving === "timedOut"), 320)
    return () => window.clearTimeout(id)
  }, [leaving])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || document.querySelector("[aria-modal='true']")) return
      setLeaving("closed")
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return createPortal(
    <div
      ref={ref}
      className={["ul-card", leaving ? "is-leaving" : "", spot ? `from-${spot.side}` : "is-measuring"].filter(Boolean).join(" ")}
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
              setLeaving("closed")
            }}
          >
            {copy.action}
          </button>
        ) : null}
        <button type="button" className="ul-btn" data-testid="unlock-card-close" onClick={() => setLeaving("closed")}>
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

type Playing = { id: FeatureId; card: boolean }

/**
 * Plays the timeline's reveals one at a time: a big one slams in the centre first, a standard one lights up where
 * it lives with a card beside it, a small one is a toast and a glow. Reveals wait for events, 1:1s and money pops,
 * and leave room between them so none is missed.
 */
export function UnlockReveals() {
  const head = useGame((state) => state.reveals[0] ?? null)
  const queued = useGame((state) => state.reveals.length)
  const blocked = useGame((state) => state.event !== null || state.review !== null)
  const whatsNew = useGame((state) => state.whatsNew)
  // A small reveal is a toast: it waits for the one on screen instead of replacing it.
  const toastUp = useGame((state) => state.toast !== null)
  const [playing, setPlaying] = useState<Playing | null>(null)
  const endedAt = useRef(0)
  const lastGap = useRef(0)
  const popUntil = useRef(0)
  const timers = useRef<number[]>([])

  useEffect(
    () =>
      useGame.subscribe((state, prev) => {
        if (state.pop && state.pop !== prev.pop && state.pop.size === "large") popUntil.current = performance.now() + POP_HOLD_MS
      }),
    [],
  )

  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), [])

  function later(fn: () => void, ms: number) {
    timers.current.push(window.setTimeout(fn, ms))
  }

  function finish(how: keyof typeof GAP_MS) {
    endedAt.current = performance.now()
    lastGap.current = GAP_MS[how]
    setPlaying(null)
  }

  function start(id: FeatureId) {
    const row = featureById(id)
    if (!row) return
    const element = anchorOf(row)
    playUnlockChime(row.size === "big" ? "big" : row.size === "small" ? "small" : "standard")
    if (row.size === "small") {
      useGame.getState().notify(toastText(row))
      const off = lightUp(element, "ul-glow", SMALL_MS)
      setPlaying({ id, card: false })
      later(() => {
        off()
        finish("small")
      }, SMALL_MS)
      return
    }
    if (row.size === "big") {
      useGame.getState().announceUnlock(row.name)
      setPlaying({ id, card: false })
      later(() => setPlaying((current) => (current?.id === id ? { id, card: true } : current)), BIG_CARD_DELAY_MS)
      return
    }
    setPlaying({ id, card: true })
  }

  const startRef = useRef(start)
  useEffect(() => {
    startRef.current = start
  })

  useEffect(() => {
    if (playing || blocked || !head) return
    if (toastUp && featureById(head)?.size === "small") return
    const gap = endedAt.current === 0 ? 0 : queued > 2 ? Math.min(GAP_MS.busy, lastGap.current) : lastGap.current
    const wait = Math.max(0, Math.max(endedAt.current + gap, popUntil.current) - performance.now())
    const id = window.setTimeout(() => {
      if (useGame.getState().event || useGame.getState().review) return
      const next = useGame.getState().takeReveal()
      if (next) startRef.current(next)
    }, wait)
    return () => window.clearTimeout(id)
  }, [playing, blocked, head, queued, toastUp])

  if (playing?.card) {
    const row = featureById(playing.id)
    if (!row) return null
    const action = ACTION[row.id] && row.action ? row.action : undefined
    return (
      <RevealCard
        key={playing.id}
        anchorId={row.parent ?? row.id}
        copy={{ kicker: "Unlocked", title: row.name, body: row.blurb, from: `from ${triggerLabel(row.trigger)}`, action }}
        onAction={action ? () => runAction(row.id) : undefined}
        onClose={(timedOut) => finish(timedOut ? "timedOut" : "closed")}
      />
    )
  }

  if (!playing && whatsNew && !blocked && !head) {
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

  return null
}
