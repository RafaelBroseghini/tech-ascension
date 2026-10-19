import { useEffect, useMemo, useRef, useSyncExternalStore } from "react"
import {
  catGone,
  catOpacity,
  nextSwapDelay,
  oldestStaying,
  PARADE_MIN,
  PARADE_SIZE,
  paradeCap,
  paradeCount,
  paradeGifs,
  pickCat,
  spawnCat,
  stepCat,
  type ParadeCat,
} from "../game/catParade.ts"
import { getDeskPrefs, subscribeDeskPrefs } from "../game/desk.ts"
import { useGame } from "../game/store.ts"
import { useFeatureOpen } from "./useFeature.ts"

/** On the first fill the cats come in one after another rather than all in the same frame. */
const ARRIVE_GAP_MS = 80

const paradePref = () => getDeskPrefs().parade
const viewportCap = () => paradeCap(window.innerWidth, window.innerHeight)
const serverCap = () => PARADE_MIN

function subscribeResize(listener: () => void): () => void {
  window.addEventListener("resize", listener)
  return () => window.removeEventListener("resize", listener)
}

const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false

/** The roster gifs found this run, bouncing round the screen. A desk switch next to the cat turns it off. */
export function CatParade() {
  const on = useSyncExternalStore(subscribeDeskPrefs, paradePref, paradePref)
  const cat = useFeatureOpen("cat")
  const found = useGame((state) => state.stats.catsFound)
  const gifs = useMemo(() => paradeGifs(found), [found])
  if (!on || !cat || gifs.length === 0) return null
  return <ParadeLayer gifs={gifs} />
}

function ParadeLayer({ gifs }: { gifs: readonly string[] }) {
  const cap = useSyncExternalStore(subscribeResize, viewportCap, serverCap)
  const count = paradeCount(cap, gifs.length)
  const slots = useRef<(HTMLImageElement | null)[]>([])
  const poolRef = useRef(gifs)
  const countRef = useRef(count)
  useEffect(() => {
    poolRef.current = gifs
    countRef.current = count
  })

  // One frame loop writes transforms and opacity straight to the images: no React render per frame.
  // Timing runs on frame timestamps, so a hidden tab pauses both the drift and the rotation.
  useEffect(() => {
    if (typeof requestAnimationFrame !== "function") return
    const still = prefersReducedMotion()
    let cats: ParadeCat[] = []
    let last: number | null = null
    let swapAt = 0
    let frame = 0

    const loop = (now: number) => {
      const width = window.innerWidth
      const height = window.innerHeight
      const dt = last === null ? 0 : now - last
      last = now
      if (swapAt === 0) swapAt = now + nextSwapDelay()

      const pool = poolRef.current
      const target = countRef.current
      if (cats.length > target) cats = cats.slice(0, target)
      const filling = cats.length
      while (cats.length < target) {
        const url = pickCat(pool, new Set(cats.map((cat) => cat.url)))
        if (!url) break
        const born = now + (filling === 0 ? cats.length * ARRIVE_GAP_MS : 0)
        cats.push(spawnCat(url, width, height, born))
      }

      if (now >= swapAt) {
        const leaving = oldestStaying(cats, now)
        if (leaving >= 0) cats[leaving] = { ...cats[leaving]!, leavingAt: now }
        swapAt = now + nextSwapDelay()
      }

      for (let i = 0; i < cats.length; i += 1) {
        let cat = cats[i]!
        if (catGone(cat, now)) {
          const showing = new Set(cats.filter((_, other) => other !== i).map((other) => other.url))
          cat = spawnCat(pickCat(pool, showing) ?? cat.url, width, height, now)
        } else if (!still) {
          cat = stepCat(cat, dt, width, height)
        }
        cats[i] = cat
        const img = slots.current[i]
        if (!img) continue
        if (img.dataset.url !== cat.url) {
          img.dataset.url = cat.url
          img.src = cat.url
        }
        img.style.transform = `translate3d(${cat.x.toFixed(1)}px, ${cat.y.toFixed(1)}px, 0)`
        img.style.opacity = catOpacity(cat, now).toFixed(3)
      }
      frame = requestAnimationFrame(loop)
    }

    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="cat-parade" aria-hidden data-testid="cat-parade">
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
