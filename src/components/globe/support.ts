/** Set by the first check: a throwaway WebGL context is costly, and the answer never changes while the page is open. */
let drawsWave: boolean | undefined

/** Whether this browser can draw the wave: it needs WebGL, which a test DOM and a few locked-down browsers lack. */
export function canDrawWave(): boolean {
  if (typeof document === "undefined") return false
  if (drawsWave === undefined) {
    try {
      drawsWave = document.createElement("canvas").getContext("webgl2") !== null
    } catch {
      drawsWave = false
    }
  }
  return drawsWave
}
