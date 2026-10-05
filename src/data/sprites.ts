import { spriteDataUrl, THUMB_SIZE, MAIN_SIZE } from "../pixel/sprites.ts"

/** Main stage art: 64×64 pixel PNG for a tier. Art 0 is the opening attic shown before the first purchase. */
export function spriteForTier(id: number): string {
  return spriteDataUrl(id, MAIN_SIZE)
}

/** Owned-strip, shop and waterfall art: the same drawing at 32×32. */
export function thumbForTier(id: number): string {
  return spriteDataUrl(id, THUMB_SIZE)
}

export { ERA_ACCENT } from "./eraAccent.ts"
