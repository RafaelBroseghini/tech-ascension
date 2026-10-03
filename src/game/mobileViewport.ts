/** Matches the app’s small-screen layout breakpoint in CSS. */

const QUERY = "(max-width: 860px)"

export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia(QUERY).matches
}

export function subscribeMobileViewport(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {}
  const mq = window.matchMedia(QUERY)
  const onChange = () => listener()
  mq.addEventListener("change", onChange)
  return () => mq.removeEventListener("change", onChange)
}
