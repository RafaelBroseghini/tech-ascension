import { useEffect, useRef } from "react"
import type { RefObject } from "react"
import type confettiFn from "canvas-confetti"
import { ERA_ACCENT } from "../data/eraAccent.ts"
import { eraOf } from "../game/phase.ts"
import { useGame } from "../game/store.ts"

type FxKind = "unlock" | "clear"
type Palette = { accent: string; light: string; dark: boolean }
type Confetti = import("canvas-confetti").CreateTypes

/** Two triggers can describe one moment (an unlock sets the nonce and the pop together); the second within this window is the same celebration. */
const SAME_MOMENT_MS = 300
/** The sprite crouches this long before the burst leaves it. */
const ANTICIPATION_S = 0.1
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

// Both libraries are their own chunks: nothing downloads them until the first celebration, or the idle moment before it.
let motionLoad: Promise<typeof import("motion")> | null = null
let confettiLoad: Promise<typeof confettiFn> | null = null
const loadMotion = () => (motionLoad ??= import("motion"))
const loadConfetti = () => (confettiLoad ??= import("canvas-confetti").then((module) => module.default))

let swatch: CanvasRenderingContext2D | null | undefined

/** A CSS colour as `#rrggbb`, which is the only form canvas-confetti reads. The one place a theme's colours are turned into something a library takes. */
function hexOf(color: string): string {
  if (swatch === undefined) {
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = 1
    swatch = canvas.getContext("2d", { willReadFrequently: true })
  }
  if (!swatch) return "#ffffff"
  swatch.clearRect(0, 0, 1, 1)
  swatch.fillStyle = color
  swatch.fillRect(0, 0, 1, 1)
  const [r = 255, g = 255, b = 255] = swatch.getImageData(0, 0, 1, 1).data
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`
}

/** A CSS colour for the library, which cannot read `var(--x)`. */
function resolve(el: Element, value: string, fallback: string): string {
  const match = /^var\((--[\w-]+)\)$/.exec(value.trim())
  if (!match) return value
  return getComputedStyle(el).getPropertyValue(match[1]!).trim() || fallback
}

function brightness(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255
}

function paletteOf(panel: HTMLElement, era: ReturnType<typeof eraOf>): Palette {
  const accent = hexOf(resolve(panel, ERA_ACCENT[era].glow, "#a6e3a1"))
  const dark = brightness(hexOf(resolve(panel, "var(--mocha-base)", "#1e1e2e"))) < 0.5
  // The second colour is what the first fades toward: white on a dark desk, the deep accent on a light one.
  const light = dark ? "#ffffff" : hexOf(resolve(panel, "var(--accent-deep)", accent))
  return { accent, light, dark }
}

/**
 * The unlock celebration over the stage, all of it from two libraries. Motion crouches the sprite and springs it back
 * with a pulse of light and a small shake, and plays the flash and the two shockwaves (elements this component lays
 * out and styles). canvas-confetti throws the shards, stars and the fan. What this file decides is the choreography:
 * when each goes, how many, how far, and the colours, which come from the desk's theme. A phone also gets a short
 * buzz. Nothing runs under prefers-reduced-motion.
 */
export function UnlockFx({ panelRef, hitboxRef }: { panelRef: RefObject<HTMLElement | null>; hitboxRef: RefObject<HTMLButtonElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const flashRef = useRef<HTMLSpanElement>(null)
  const nearRef = useRef<HTMLSpanElement>(null)
  const farRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let alive = true
    let lastMoment = -Infinity
    let fire: Confetti | null = null
    const timers = new Set<number>()
    const later = (ms: number, run: () => void) => {
      const timer = window.setTimeout(() => {
        timers.delete(timer)
        if (alive) run()
      }, ms)
      timers.add(timer)
    }

    /** The shards, stars and the fan. Distances are in canvas pixels per tick, so they scale with the sprite. */
    const throwConfetti = async (kind: FxKind, origin: { x: number; y: number }, unit: number, palette: Palette) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const confetti = await loadConfetti()
      if (!alive) return
      const shoot = (fire ??= confetti.create(canvas, { resize: true, useWorker: true, disableForReducedMotion: true }))
      const k = unit / 192
      const colors = [palette.accent, palette.accent, palette.light]
      const big = kind === "unlock"
      const base = { origin, colors, zIndex: 1, disableForReducedMotion: true }
      void shoot({ ...base, particleCount: big ? 46 : 22, spread: 360, startVelocity: 24 * k, gravity: 0.9, decay: 0.9, ticks: 110, scalar: 0.9 * k + 0.2, shapes: ["square"] })
      void shoot({ ...base, particleCount: big ? 12 : 6, spread: 360, startVelocity: 20 * k, gravity: 0.7, decay: 0.9, ticks: 120, scalar: 1.05 * k + 0.2, shapes: ["star"], colors: [palette.light, palette.accent] })
      if (big) {
        later(170, () => {
          void shoot({ ...base, particleCount: 30, angle: 90, spread: 80, startVelocity: 34 * k, gravity: 1.1, decay: 0.9, ticks: 120, scalar: 0.8 * k + 0.2, shapes: ["circle", "square"] })
        })
      }
    }

    /** The light at the centre and the two rings that leave it. Elements laid out here, moved by Motion. */
    const playLight = async (kind: FxKind, origin: { x: number; y: number }, unit: number, palette: Palette) => {
      const { animate } = await loadMotion()
      const place = (el: HTMLSpanElement | null, size: number) => {
        if (!el) return null
        el.style.setProperty("--fx-accent", palette.accent)
        el.style.setProperty("--fx-light", palette.light)
        el.style.setProperty("--fx-blend", palette.dark ? "plus-lighter" : "normal")
        el.style.width = el.style.height = `${size}px`
        el.style.left = `${origin.x}px`
        el.style.top = `${origin.y}px`
        return el
      }
      const big = kind === "unlock"
      const flash = place(flashRef.current, unit * (big ? 2 : 1.4))
      const near = place(nearRef.current, unit * (big ? 2.4 : 1.8))
      const far = big ? place(farRef.current, unit * 3.2) : null
      const centred = { x: "-50%", y: "-50%" }
      if (flash) animate(flash, { opacity: [0, 1, 0], scale: [0.4, 1, 1.15], ...centred }, { duration: big ? 0.5 : 0.36, times: [0, 0.18, 1], ease: "easeOut" })
      if (near) animate(near, { opacity: [0.95, 0], scale: [0.15, 1], ...centred }, { duration: big ? 0.8 : 0.55, ease: [0.16, 0.84, 0.3, 1] })
      if (far) animate(far, { opacity: [0.7, 0], scale: [0.15, 1], ...centred }, { duration: 1, delay: 0.1, ease: [0.16, 0.84, 0.3, 1] })
    }

    /** The sprite's half of it: crouch, spring up past its size with a flash of light, and a shake through the desk. */
    const choreograph = async (kind: FxKind) => {
      const box = hitboxRef.current
      const art = box?.querySelector<HTMLElement>(".sprite-frame")
      if (!box || !art) return
      try {
        const { animate } = await loadMotion()
        await animate(art, { scale: 0.9, y: 3 }, { duration: ANTICIPATION_S, ease: "easeIn" })
        if (!alive) return
        const plays = [
          animate(art, { scale: 1, y: 0 }, { type: "spring", stiffness: 420, damping: 7.5, mass: 0.7 }),
          animate(art, { filter: ["brightness(2.1) saturate(1.3)", "brightness(1) saturate(1)"] }, { duration: 0.5, ease: "easeOut" }),
        ]
        if (kind === "unlock") {
          const reach = Math.max(2, box.clientWidth * 0.016)
          plays.push(animate(box, { x: [0, -reach, reach, -reach * 0.6, reach * 0.3, 0] }, { duration: 0.34, ease: "easeOut" }))
        }
        await Promise.all(plays.map((play) => play.finished))
        art.style.removeProperty("transform")
        art.style.removeProperty("filter")
        box.style.removeProperty("transform")
      } catch {
        // No Motion (an offline chunk): the burst still plays, the sprite just stays put.
      }
    }

    const burst = (kind: FxKind) => {
      const panel = panelRef.current
      const box = hitboxRef.current
      if (!alive || !panel || !box) return
      const panelRect = panel.getBoundingClientRect()
      const boxRect = box.getBoundingClientRect()
      if (panelRect.width === 0 || panelRect.height === 0) return
      const palette = paletteOf(panel, eraOf(useGame.getState()))
      const centre = { x: boxRect.left + boxRect.width / 2 - panelRect.left, y: boxRect.top + boxRect.height * 0.46 - panelRect.top }
      const unit = boxRect.width
      void playLight(kind, centre, unit, palette).catch(() => {})
      void throwConfetti(kind, { x: centre.x / panelRect.width, y: centre.y / panelRect.height }, unit, palette).catch(() => {})
    }

    const celebrate = (kind: FxKind) => {
      if (prefersReducedMotion() || document.hidden) return
      const at = performance.now()
      if (at - lastMoment < SAME_MOMENT_MS) return
      lastMoment = at
      void choreograph(kind)
      if (kind === "unlock") navigator.vibrate?.([10, 40, 16])
      later(ANTICIPATION_S * 1000, () => burst(kind))
    }

    // Both ways a celebration is announced: the nonce (an unlock, a pick) and a large pop (a cleared gig, a board).
    const unsubscribe = useGame.subscribe((state, previous) => {
      if (state.celebrationNonce !== previous.celebrationNonce && state.celebrationNonce !== 0) celebrate("unlock")
      else if (state.pop && state.pop !== previous.pop && state.pop.size === "large") celebrate(state.pop.kind === "unlock" ? "unlock" : "clear")
    })
    later(3000, () => {
      void loadMotion().catch(() => {})
      void loadConfetti().catch(() => {})
    })

    return () => {
      alive = false
      unsubscribe()
      for (const timer of timers) window.clearTimeout(timer)
      fire?.reset()
    }
  }, [panelRef, hitboxRef])

  return (
    <div className="unlock-fx" aria-hidden="true">
      <span ref={flashRef} className="unlock-flash" />
      <span ref={nearRef} className="unlock-wave" />
      <span ref={farRef} className="unlock-wave unlock-wave-far" />
      <canvas ref={canvasRef} className="unlock-confetti" />
    </div>
  )
}
