import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import {
  catGone,
  catOpacity,
  MAX_STEP_MS,
  nextSwapDelay,
  oldestStaying,
  PARADE_MIN,
  PARADE_SIZE,
  paradeAt,
  paradeCap,
  paradeCount,
  REDUCED_MOTION_SCALE,
  pickCat,
  spawnCat,
  type ParadeBox,
  type ParadeGif,
} from "../game/gifParade.ts"
import { getDeskPrefs, reducedMotion, subscribeDeskPrefs } from "../game/desk.ts"
import { paradePool } from "../game/paradePool.ts"
import { useParadeProgress } from "./useParadeProgress.ts"
import { useFeatureOpen } from "./useFeature.ts"

/** On the first fill the gifs come in one after another rather than all in the same frame. */
const ARRIVE_GAP_MS = 80

const paradePref = () => getDeskPrefs().parade
const sourcePref = () => getDeskPrefs().paradeSource
const prefersReducedMotion = reducedMotion

/** Every gif unlocked this run (or one category of them), moving round the stage once the parade itself is unlocked (the mid game, `parade` in src/data/features.ts). The settings menu turns it off and picks the gifs and the path. */
export function GifParade() {
  const on = useSyncExternalStore(subscribeDeskPrefs, paradePref, paradePref)
  const source = useSyncExternalStore(subscribeDeskPrefs, sourcePref, sourcePref)
  const unlocked = useFeatureOpen("parade")
  const progress = useParadeProgress()
  const gifs = useMemo(() => paradePool(source, progress), [source, progress])
  if (!unlocked || !on || gifs.length === 0) return null
  return <ParadeLayer gifs={gifs} />
}

function ParadeLayer({ gifs }: { gifs: readonly string[] }) {
  const layerRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<ParadeBox>({ width: 0, height: 0 })
  const [cap, setCap] = useState(PARADE_MIN)
  const count = paradeCount(cap, gifs.length)
  const slots = useRef<(HTMLImageElement | null)[]>([])
  const poolRef = useRef(gifs)
  const countRef = useRef(count)
  useEffect(() => {
    poolRef.current = gifs
    countRef.current = count
  })

  // The layer is the stage's editor area (CSS insets it inside the chrome), so the cats never reach the shop.
  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    const measure = () => {
      boxRef.current = { width: layer.clientWidth, height: layer.clientHeight }
      setCap(paradeCap(layer.clientWidth, layer.clientHeight))
    }
    measure()
    if (typeof ResizeObserver !== "function") return
    const observer = new ResizeObserver(measure)
    observer.observe(layer)
    return () => observer.disconnect()
  }, [])

  // One frame loop writes transforms and opacity straight to the images: no React render per frame.
  // The parade keeps its own clock, so a hidden tab pauses the paths and the rotation alike.
  useEffect(() => {
    if (typeof requestAnimationFrame !== "function") return
    const pace = prefersReducedMotion() ? REDUCED_MOTION_SCALE : 1
    let cats: ParadeGif[] = []
    let last: number | null = null
    let clock = 0
    let swapAt = nextSwapDelay()
    let frame = 0

    const loop = (stamp: number) => {
      clock += last === null ? 0 : Math.min(MAX_STEP_MS, Math.max(0, stamp - last))
      last = stamp
      const box = boxRef.current
      const style = getDeskPrefs().paradeStyle
      const pool = poolRef.current
      const target = countRef.current
      if (cats.length > target) cats = cats.slice(0, target)
      const filling = cats.length
      while (cats.length < target) {
        const url = pickCat(pool, new Set(cats.map((cat) => cat.url)))
        if (!url) break
        cats.push(spawnCat(url, clock + (filling === 0 ? cats.length * ARRIVE_GAP_MS : 0)))
      }

      if (clock >= swapAt) {
        const leaving = oldestStaying(cats, clock)
        if (leaving >= 0) cats[leaving] = { ...cats[leaving]!, leavingAt: clock }
        swapAt = clock + nextSwapDelay()
      }

      const t = (clock / 1000) * pace
      for (let i = 0; i < cats.length; i += 1) {
        let cat = cats[i]!
        if (catGone(cat, clock)) {
          const showing = new Set(cats.filter((_, other) => other !== i).map((other) => other.url))
          cat = spawnCat(pickCat(pool, showing) ?? cat.url, clock)
          cats[i] = cat
        }
        const img = slots.current[i]
        if (!img) continue
        if (img.dataset.url !== cat.url) {
          img.dataset.url = cat.url
          img.src = cat.url
        }
        const { x, y } = paradeAt(style, cat.seed, { slot: i, count: cats.length }, t, box)
        img.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
        img.style.opacity = catOpacity(cat, clock).toFixed(3)
      }
      frame = requestAnimationFrame(loop)
    }

    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div ref={layerRef} className="gif-parade" aria-hidden data-testid="gif-parade">
      {Array.from({ length: count }, (_, i) => (
        <img
          key={i}
          ref={(img) => {
            slots.current[i] = img
          }}
          alt=""
          width={PARADE_SIZE}
          height={PARADE_SIZE}
          decoding="async"
          draggable={false}
        />
      ))}
    </div>
  )
}
