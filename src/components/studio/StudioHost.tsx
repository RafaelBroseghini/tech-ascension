import { lazy, Suspense, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import { getStudioView, loadStudio, subscribeStudioView } from "./launcher.ts"

const Studio = lazy(loadStudio)

/** Mounts the full-screen whiteboard over the desk while it is open. The desk underneath keeps earning. */
export function StudioHost() {
  const view = useSyncExternalStore(subscribeStudioView, getStudioView, getStudioView)
  if (!view.open) return null
  return createPortal(
    <Suspense fallback={<div className="studio-loading" role="status" aria-label="Opening the whiteboard" />}>
      <Studio interviewId={view.interviewId} />
    </Suspense>,
    document.body,
  )
}
