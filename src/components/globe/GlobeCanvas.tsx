import { Minus, Plus, RotateCcw } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { CITIES } from "../../data/geo.ts"
import { CityFlag } from "./CityFlag.tsx"
import { animate } from "./loop.ts"
import type { Wave } from "../../game/globe/wave.ts"
import { GlobeScene } from "./GlobeScene.ts"
import type { Hover, Note } from "./GlobeScene.ts"
import type { Company } from "../../game/globe/company.ts"
import { describe, dropShares, tallyByCity } from "../../game/globe/tip.ts"
import { BURST_MS, burstOf } from "../../game/globe/wave.ts"
import type { CityRow, CityTally, Tip } from "../../game/globe/tip.ts"
import { hoverIds, notesFor, placeNotes } from "./notes.ts"
import type { Label } from "./notes.ts"

const ZOOM_STEP = 1.35

/** The small globe is about a third the size, so its edges are drawn this many times wider. */
const COMPACT_EDGE_WIDTH = 2.2

/**
 * The three.js canvas in the globe pane. It builds its renderer once, draws one still frame while nothing plays, and runs
 * a frame loop only while a wave is on its way. Drag turns the globe, the wheel and the buttons zoom, and the pointer over
 * a dot or an edge says what it is. `compact` is the small globe on the desk: it only turns, with no labels, tooltips, buttons
 * or wheel. Never imported by anything a test loads.
 */
export default function GlobeCanvas({ company, rows, home, compact = false }: { company: Company; rows: readonly CityRow[]; home: string; compact?: boolean }) {
  const host = useRef<HTMLDivElement>(null)
  const tipBox = useRef<HTMLDivElement>(null)
  const scene = useRef<GlobeScene | null>(null)
  const latest = useRef({ company, rows, home })
  const lastWave = useRef<Wave | null>(null)
  const [tip, setTip] = useState<Tip | null>(null)
  const [tally, setTally] = useState<ReadonlyMap<string, CityTally> | null>(null)
  const servers = useMemo(() => company.pops.flatMap((id) => (CITIES[id] ? [{ id, name: CITIES[id].name, country: CITIES[id].country }] : [])), [company.pops])
  const labels = useMemo(() => (compact ? [] : notesFor(rows, home, tally, servers)), [compact, rows, home, tally, servers])
  const labelsRef = useRef<readonly Label[]>(labels)
  const noteEls = useRef(new Map<string, HTMLElement>())
  const earned = useRef<ReadonlySet<string>>(new Set())
  useEffect(() => {
    latest.current = { company, rows, home }
    labelsRef.current = labels
  })

  useEffect(() => {
    const el = host.current
    if (!el) return
    let made: GlobeScene | null = null
    try {
      made = GlobeScene.create(el)
    } catch (error) {
      console.warn("The globe could not start its renderer.", error)
      return
    }
    scene.current = made
    if (compact) made.setEdgeWidth(COMPACT_EDGE_WIDTH)
    made.setPops(latest.current.company.pops, latest.current.company.idlePops)
    made.setAudience(latest.current.company.audience)
    const scenery = made
    const redraw = () => {
      scenery.frame(performance.now(), true)
    }
    scenery.onLoad = redraw
    scenery.onNotes = (notes: readonly Note[]) => {
      const pane = el.parentElement
      if (pane) placeNotes(labelsRef.current, notes, noteEls.current, pane.clientWidth, pane.clientHeight, earned.current)
    }

    // The company's traffic is one stream: a burst every BURST_MS, sent from the latest clients, on a clock that never restarts.
    const send = () => {
      const { company: now } = latest.current
      if (now.audience.length === 0) return
      const wave = burstOf(now.audience, now.demand, now.dropShare)
      lastWave.current = wave
      const tallied = tallyByCity(wave)
      setTally(tallied)
      scenery.setDrops(dropShares(tallied))
      scenery.feed(wave, performance.now())
    }
    send()
    const timer = window.setInterval(send, BURST_MS)
    const stopLoop = animate((t) => scenery.frame(t, false))
    const resize = new ResizeObserver(() => {
      scenery.resize(el)
      redraw()
    })
    resize.observe(el)

    // Drag turns the globe; the wheel zooms; a double click faces the users again.
    let last: { x: number; y: number } | null = null
    let shown: Hover | null = null
    const point = (e: PointerEvent | WheelEvent) => {
      const box = el.getBoundingClientRect()
      return { x: e.clientX - box.left, y: e.clientY - box.top }
    }
    const hover = (next: Hover | null) => {
      const changed = next?.kind !== shown?.kind || next?.city !== shown?.city
      shown = next
      const box = tipBox.current
      if (box && next) box.style.transform = `translate(${Math.max(4, Math.min(next.x + 14, el.clientWidth - 250))}px, ${Math.max(4, Math.min(next.y + 14, el.clientHeight - 120))}px)`
      if (!changed) return
      scenery.setHover(next)
      earned.current = hoverIds(next, labelsRef.current)
      const { rows: now, home: name } = latest.current
      const last = lastWave.current
      setTip(next ? describe(next, now, last ? tallyByCity(last) : null, name) : null)
      redraw()
    }
    const down = (e: PointerEvent) => {
      if (e.button !== 0 && e.button !== 2) return
      last = { x: e.clientX, y: e.clientY }
      el.setPointerCapture(e.pointerId)
      el.classList.add("is-turning")
      hover(null)
    }
    const move = (e: PointerEvent) => {
      if (last) {
        scenery.turn(e.clientX - last.x, e.clientY - last.y)
        last = { x: e.clientX, y: e.clientY }
        redraw()
        return
      }
      if (compact) return
      const at = point(e)
      hover(scenery.hitTest(at.x, at.y))
    }
    const up = (e: PointerEvent) => {
      if (!last) return
      last = null
      el.releasePointerCapture(e.pointerId)
      el.classList.remove("is-turning")
    }
    const leave = () => hover(null)
    const wheel = (e: WheelEvent) => {
      if (compact) return
      e.preventDefault()
      scenery.zoomBy(Math.exp(-e.deltaY * 0.0015))
      redraw()
    }
    const menu = (e: Event) => e.preventDefault()
    const reset = () => {
      scenery.resetView()
      redraw()
    }
    el.addEventListener("pointerdown", down)
    el.addEventListener("pointermove", move)
    el.addEventListener("pointerup", up)
    el.addEventListener("pointercancel", up)
    el.addEventListener("pointerleave", leave)
    el.addEventListener("wheel", wheel, { passive: false })
    el.addEventListener("contextmenu", menu)
    el.addEventListener("dblclick", reset)
    return () => {
      el.removeEventListener("pointerdown", down)
      el.removeEventListener("pointermove", move)
      el.removeEventListener("pointerup", up)
      el.removeEventListener("pointercancel", up)
      el.removeEventListener("pointerleave", leave)
      el.removeEventListener("wheel", wheel)
      el.removeEventListener("contextmenu", menu)
      el.removeEventListener("dblclick", reset)
      window.clearInterval(timer)
      stopLoop()
      resize.disconnect()
      scene.current = null
      scenery.destroy()
    }
  }, [compact])

  // Keyed by what they hold, not by identity: the company is rebuilt every time its users move.
  const popsKey = company.pops.join()
  const idleKey = company.idlePops.join()
  const clients = company.audience.length
  useEffect(() => {
    scene.current?.setPops(latest.current.company.pops, latest.current.company.idlePops)
  }, [popsKey, idleKey])
  useEffect(() => {
    scene.current?.resetView(latest.current.company.audience)
  }, [clients])

  const zoom = (factor: number) => scene.current?.zoomBy(factor)
  const reset = () => scene.current?.resetView()

  return (
    <>
      <div ref={host} className="globe-host" data-testid="globe-host" aria-hidden />
      {compact ? null : (
        <>
          <div className="globe-notes" aria-hidden>
            {labels.map((label) => (
              <span
                key={label.id}
                ref={(el) => {
                  if (el) noteEls.current.set(label.id, el)
                  else noteEls.current.delete(label.id)
                }}
                className={`globe-note is-${label.kind === "pop" ? "home" : label.kind}${label.lost ? " is-lost" : ""}`}
                data-note={label.id}
              >
                {label.lines.map((line, i) =>
                  i === 0 && label.kind !== "edge" ? (
                    <b key={line}>
                      {label.country ? <CityFlag country={label.country} /> : null}
                      {line}
                    </b>
                  ) : (
                    <small key={line}>{line}</small>
                  ),
                )}
              </span>
            ))}
          </div>
          <div ref={tipBox} className="globe-tip" data-testid="globe-tip" role="status" hidden={!tip}>
            {tip ? (
              <>
                <strong>
                  {tip.country ? <CityFlag country={tip.country} /> : null}
                  {tip.title}
                </strong>
                {tip.lines.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </>
            ) : null}
          </div>
          <div className="globe-zoom" role="group" aria-label="Globe view">
            <button type="button" aria-label="Zoom in" title="Zoom in. The wheel zooms too." onClick={() => zoom(ZOOM_STEP)}>
              <Plus size={14} aria-hidden />
            </button>
            <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => zoom(1 / ZOOM_STEP)}>
              <Minus size={14} aria-hidden />
            </button>
            <button type="button" aria-label="Face the users again" title="Face the users again. Double-click does too." onClick={reset}>
              <RotateCcw size={13} aria-hidden />
            </button>
          </div>
        </>
      )}
    </>
  )
}
