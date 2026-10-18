/** Whether this browser can draw the wave: it needs WebGL, which a test DOM and a few locked-down browsers lack. */
export function canDrawWave(): boolean {
  try {
    return typeof document !== "undefined" && document.createElement("canvas").getContext("webgl2") !== null
  } catch {
    return false
  }
}
