import type { Era } from "../data/capital.ts"
import { DRAW } from "./art.ts"
import { C, ERA_RAMP, PALETTE, R } from "./palette.ts"
import { pngDataUrl } from "./png.ts"
import { Pix } from "./pix.ts"

export const MAIN_SIZE = 64
export const THUMB_SIZE = 32

/** Colour ramp bands of the drawing sheet: art 1-18 early, 19-33 mid, 34-44 upper, 45-53 q3, 54+ end. */
function artEra(id: number): Era {
  return id >= 54 ? "end" : id >= 45 ? "q3" : id >= 34 ? "upper" : id >= 19 ? "mid" : "early"
}

const gridCache = new Map<string, Pix>()
const urlCache = new Map<string, string>()

/** Pixel grid for one tier (0 = opening scene). 64×64 main art, or the same drawing reduced 2:1 to a 32×32 thumb, each with its own 1px ink outline. */
export function spriteGrid(id: number, size: typeof MAIN_SIZE | typeof THUMB_SIZE = MAIN_SIZE): Pix {
  const key = `${id}:${size}`
  const hit = gridCache.get(key)
  if (hit) return hit
  const draw = DRAW[id] ?? DRAW[1]
  let grid = new Pix(MAIN_SIZE, MAIN_SIZE)
  const era = artEra(id)
  draw?.(grid, ERA_RAMP[era] ?? R.blue)
  if (size === THUMB_SIZE) grid = grid.halve()
  grid.outline(C.ink)
  gridCache.set(key, grid)
  return grid
}

/** PNG data URL, built once per tier and size. Pure JS, no canvas. */
export function spriteDataUrl(id: number, size: typeof MAIN_SIZE | typeof THUMB_SIZE = MAIN_SIZE): string {
  const key = `${id}:${size}`
  const hit = urlCache.get(key)
  if (hit) return hit
  const grid = spriteGrid(id, size)
  const url = pngDataUrl(grid.data, grid.w, grid.h, PALETTE)
  urlCache.set(key, url)
  return url
}
