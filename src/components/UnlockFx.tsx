import { useEffect, useRef } from "react"
import type { RefObject } from "react"
import { ERA_ACCENT } from "../data/eraAccent.ts"
import { eraOf } from "../game/phase.ts"
import { useGame } from "../game/store.ts"
import { burstAlive, flashAlpha, fxSlowdown, makeBurst, shardAlpha, sparkAlpha, stepBurst, waveAt } from "../game/unlockFx.ts"
import type { Burst, FxColors, FxKind } from "../game/unlockFx.ts"

type Origin = { x: number; y: number }
type Live = { burst: Burst; origin: Origin; additive: boolean; colors: FxColors }

/** Two triggers can describe one moment (an unlock sets the nonce and the pop together); the second within this window is the same celebration. */
const SAME_MOMENT_MS = 300
/** The sprite crouches this long before the burst leaves it. */
const ANTICIPATION_S = 0.1
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

let motionLoad: Promise<typeof import("motion")> | null = null
/** Motion is its own chunk: nothing downloads it until the first celebration, or the idle moment before it. */
function loadMotion() {
  motionLoad ??= import("motion")
  return motionLoad
}

/** A CSS colour for the canvas, which cannot read `var(--x)`. */
function resolveColor(el: Element, value: string, fallback: string): string {
  const match = /^var\((--[\w-]+)\)$/.exec(value.trim())
  if (!match) return value
  return getComputedStyle(el).getPropertyValue(match[1]!).trim() || fallback
}

/** Rough brightness of a CSS colour, 0 to 1, from the canvas's own parse of it. Unknown reads as light. */
function luminance(color: string): number {
  const probe = document.createElement("canvas").getContext("2d")
  if (!probe) return 1
  probe.fillStyle = "#fff"
  probe.fillStyle = color
  const hex = probe.fillStyle
  const match = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!match) return 1
  const n = parseInt(match[1]!, 16)
  return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255
}

function paletteOf(panel: HTMLElement, era: ReturnType<typeof eraOf>): { colors: FxColors; additive: boolean } {
  const accent = resolveColor(panel, ERA_ACCENT[era].glow, "#a6e3a1")
  const ink = resolveColor(panel, "var(--ink)", "#11111b")
  // Glow adds light, so it only reads on a dark desk. On a light one the same shapes are drawn solid.
  const additive = luminance(resolveColor(panel, "var(--mocha-base)", "#1e1e2e")) < 0.5
  const light = additive ? "#ffffff" : resolveColor(panel, "var(--accent-deep)", accent)
  return { colors: { accent, light, ink }, additive }
}

const rgbCache = new Map<string, readonly [number, number, number]>()
let swatch: CanvasRenderingContext2D | null | undefined

/** A CSS colour as its red, green and blue, so a gradient can fade it out without turning grey on the way. */
function rgbOf(color: string): readonly [number, number, number] {
  const known = rgbCache.get(color)
  if (known) return known
  if (swatch === undefined) {
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = 1
    swatch = canvas.getContext("2d", { willReadFrequently: true })
  }
  let rgb: readonly [number, number, number] = [255, 255, 255]
  if (swatch) {
    swatch.clearRect(0, 0, 1, 1)
    swatch.fillStyle = color
    swatch.fillRect(0, 0, 1, 1)
    const data = swatch.getImageData(0, 0, 1, 1).data
    rgb = [data[0] ?? 255, data[1] ?? 255, data[2] ?? 255]
  }
  rgbCache.set(color, rgb)
  return rgb
}

const rgba = (color: string, alpha: number): string => {
  const [r, g, b] = rgbOf(color)
  return `rgba(${r}, ${g}, ${b}, ${Math.min(1, Math.max(0, alpha))})`
}

function drawBurst(ctx: CanvasRenderingContext2D, live: Live) {
  const { burst, origin, additive, colors } = live
  ctx.save()
  ctx.translate(origin.x, origin.y)
  ctx.globalCompositeOperation = additive ? "lighter" : "source-over"
  const strength = additive ? 1 : 0.8

  // The flash: a glow with a white-hot core, and thin rays that flare out of it and are gone within the first beat.
  const flash = flashAlpha(burst.flash)
  if (flash > 0) {
    const { radius, color } = burst.flash
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius)
    glow.addColorStop(0, rgba(additive ? "#ffffff" : color, 0.95 * flash * strength))
    glow.addColorStop(0.25, rgba(color, 0.55 * flash * strength))
    glow.addColorStop(1, rgba(color, 0))
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.fill()
    const progress = 1 - flash ** 0.5
    ctx.strokeStyle = rgba(additive ? "#ffffff" : color, 0.5 * flash * strength)
    ctx.lineWidth = Math.max(1.25, burst.unit * 0.008)
    ctx.lineCap = "round"
    for (let ray = 0; ray < burst.flash.rays; ray++) {
      const angle = burst.flash.twist + (ray / burst.flash.rays) * Math.PI * 2 + progress * 0.35
      const inner = burst.unit * (0.22 + progress * 0.35)
      const outer = burst.unit * (0.5 + progress * (ray % 2 === 0 ? 1 : 0.62))
      ctx.beginPath()
      ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner)
      ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer)
      ctx.stroke()
    }
  }

  // A shockwave is a bright thin edge with its glow trailing behind it, toward the centre.
  for (const wave of burst.waves) {
    const at = waveAt(wave)
    if (!at) continue
    const inner = Math.max(0, at.radius - at.width)
    const trail = ctx.createRadialGradient(0, 0, inner, 0, 0, at.radius)
    trail.addColorStop(0, rgba(wave.color, 0))
    trail.addColorStop(1, rgba(wave.color, 0.5 * at.alpha * strength))
    ctx.fillStyle = trail
    ctx.beginPath()
    ctx.arc(0, 0, at.radius, 0, Math.PI * 2)
    ctx.arc(0, 0, inner, 0, Math.PI * 2, true)
    ctx.fill()
    ctx.strokeStyle = rgba(wave.color === colors.accent && additive ? "#ffffff" : wave.color, 0.95 * at.alpha * strength)
    ctx.lineWidth = Math.max(1.5, burst.unit * 0.014 * (0.4 + at.alpha * 0.6))
    ctx.beginPath()
    ctx.arc(0, 0, at.radius, 0, Math.PI * 2)
    ctx.stroke()
  }

  ctx.lineCap = "round"
  for (const spark of burst.sparks) {
    const alpha = sparkAlpha(spark)
    if (alpha <= 0) continue
    ctx.globalAlpha = alpha
    ctx.strokeStyle = spark.color
    ctx.lineWidth = spark.width * (0.5 + alpha * 0.5)
    ctx.beginPath()
    // The tail is the path it just took, stretched, so a fast spark is a streak and a slow one a dot.
    ctx.moveTo(spark.x - (spark.x - spark.px) * 2.4, spark.y - (spark.y - spark.py) * 2.4)
    ctx.lineTo(spark.x, spark.y)
    ctx.stroke()
  }

  // Shards are solid with an ink outline, the way every chunk of this game is drawn, so they sit over the glow.
  ctx.globalCompositeOperation = "source-over"
  for (const shard of burst.shards) {
    const alpha = shardAlpha(shard)
    if (alpha <= 0) continue
    ctx.save()
    ctx.translate(shard.x, shard.y)
    ctx.rotate(shard.rot)
    ctx.globalAlpha = alpha
    ctx.fillStyle = shard.color
    ctx.fillRect(-shard.size / 2, -shard.size / 2, shard.size, shard.size)
    ctx.lineWidth = 1.5
    ctx.strokeStyle = colors.ink
    ctx.strokeRect(-shard.size / 2, -shard.size / 2, shard.size, shard.size)
    ctx.restore()
  }
  ctx.restore()
}

/**
 * The unlock celebration over the stage: the sprite crouches, then a flash, two shockwaves, shards and sparks leave it
 * while it springs back and a little shake runs through the desk. The burst is a canvas (`src/game/unlockFx.ts` runs
 * it); the sprite's squash, spring and shake are Motion. A phone also gets a short buzz. Nothing here runs under
 * prefers-reduced-motion, and the canvas only runs a frame loop while a burst is alive.
 */
export function UnlockFx({ panelRef, hitboxRef }: { panelRef: RefObject<HTMLElement | null>; hitboxRef: RefObject<HTMLButtonElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const live: Live[] = []
    let frame = 0
    let last = 0
    let lastMoment = -Infinity
    let alive = true
    const timers = new Set<number>()

    const tick = (now: number) => {
      frame = 0
      const canvas = canvasRef.current
      const ctx = canvas?.getContext("2d")
      if (!canvas || !ctx) return
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)) / fxSlowdown()
      last = now
      const dpr = canvas.width / Math.max(1, canvas.clientWidth)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight)
      for (const item of live) {
        stepBurst(item.burst, dt)
        drawBurst(ctx, item)
      }
      for (let index = live.length - 1; index >= 0; index--) if (!burstAlive(live[index]!.burst)) live.splice(index, 1)
      if (live.length > 0) frame = requestAnimationFrame(tick)
    }

    const startBurst = (kind: FxKind) => {
      const panel = panelRef.current
      const box = hitboxRef.current
      const canvas = canvasRef.current
      if (!alive || !panel || !box || !canvas || !canvas.getContext("2d")) return
      const panelRect = panel.getBoundingClientRect()
      const boxRect = box.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      // Resized only when the stage's size changed, which also clears it; a live burst redraws on the next frame.
      const width = Math.round(panelRect.width * dpr)
      const height = Math.round(panelRect.height * dpr)
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      const { colors, additive } = paletteOf(panel, eraOf(useGame.getState()))
      const unit = boxRect.width
      live.push({
        burst: makeBurst(kind, unit, colors),
        origin: { x: boxRect.left + boxRect.width / 2 - panelRect.left, y: boxRect.top + boxRect.height * 0.46 - panelRect.top },
        additive,
        colors,
      })
      if (frame === 0) {
        last = performance.now()
        frame = requestAnimationFrame(tick)
      }
    }

    /** The sprite's half of it: crouch, spring up past its size with a flash of light, and a shake through the desk. */
    const choreograph = async (kind: FxKind) => {
      const box = hitboxRef.current
      const art = box?.querySelector<HTMLElement>(".sprite-frame")
      if (!box || !art) return
      try {
        const { animate } = await loadMotion()
        const slow = fxSlowdown()
        await animate(art, { scale: 0.9, y: 3 }, { duration: ANTICIPATION_S * slow, ease: "easeIn" })
        if (!alive) return
        const plays = [
          animate(art, { scale: 1, y: 0 }, { type: "spring", stiffness: 420, damping: 7.5, mass: 0.7 }),
          animate(art, { filter: ["brightness(2.1) saturate(1.3)", "brightness(1) saturate(1)"] }, { duration: 0.5 * slow, ease: "easeOut" }),
        ]
        if (kind === "unlock") {
          const reach = Math.max(2, box.clientWidth * 0.016)
          plays.push(animate(box, { x: [0, -reach, reach, -reach * 0.6, reach * 0.3, 0] }, { duration: 0.34 * slow, ease: "easeOut" }))
        }
        await Promise.all(plays.map((play) => play.finished))
        art.style.removeProperty("transform")
        art.style.removeProperty("filter")
        box.style.removeProperty("transform")
      } catch {
        // No Motion (an offline chunk): the burst still plays, the sprite just stays put.
      }
    }

    const celebrate = (kind: FxKind) => {
      if (prefersReducedMotion() || document.hidden) return
      const at = performance.now()
      if (at - lastMoment < SAME_MOMENT_MS) return
      lastMoment = at
      void choreograph(kind)
      if (kind === "unlock") navigator.vibrate?.([10, 40, 16])
      const timer = window.setTimeout(() => {
        timers.delete(timer)
        startBurst(kind)
      }, ANTICIPATION_S * 1000 * fxSlowdown())
      timers.add(timer)
    }

    // Both ways a celebration is announced: the nonce (an unlock, a pick) and a large pop (a cleared gig, a board).
    const unsubscribe = useGame.subscribe((state, previous) => {
      if (state.celebrationNonce !== previous.celebrationNonce && state.celebrationNonce !== 0) celebrate("unlock")
      else if (state.pop && state.pop !== previous.pop && state.pop.size === "large") celebrate(state.pop.kind === "unlock" ? "unlock" : "clear")
    })
    const warm = window.setTimeout(() => void loadMotion().catch(() => {}), 3000)

    return () => {
      alive = false
      unsubscribe()
      window.clearTimeout(warm)
      for (const timer of timers) window.clearTimeout(timer)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [panelRef, hitboxRef])

  return <canvas ref={canvasRef} className="unlock-fx" aria-hidden="true" />
}
