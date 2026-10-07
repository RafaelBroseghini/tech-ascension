/**
 * The whiteboard's handle in the desk's entry bundle: whether it is open, which interview it shows, and the lazy
 * import of its chunk. Everything heavier lives behind `loadStudio`.
 */

export type StudioView = { readonly open: boolean; readonly interviewId: string | null }

let view: StudioView = { open: false, interviewId: null }
const viewListeners = new Set<() => void>()
const hireListeners = new Set<(jobId: number) => void>()

function setView(next: StudioView): void {
  view = next
  for (const listener of [...viewListeners]) listener()
}

export const getStudioView = (): StudioView => view

export function subscribeStudioView(listener: () => void): () => void {
  viewListeners.add(listener)
  return () => {
    viewListeners.delete(listener)
  }
}

/** Opens the whiteboard on `interviewId`, or on the interview it showed last. */
export function openStudio(interviewId?: string): void {
  void loadStudio()
  setView({ open: true, interviewId: interviewId ?? view.interviewId })
}

/** Closes the whiteboard. The board stays as it was; `hiredJobId` lands the shop on that job's row. */
export function closeStudio(hiredJobId?: number): void {
  setView({ ...view, open: false })
  if (hiredJobId !== undefined) for (const listener of [...hireListeners]) listener(hiredJobId)
}

export function onStudioHire(listener: (jobId: number) => void): () => void {
  hireListeners.add(listener)
  return () => {
    hireListeners.delete(listener)
  }
}

let chunk: Promise<typeof import("./Studio.tsx")> | null = null

/** The whiteboard chunk, fetched once. Hovering an entry point calls it so the click opens from cache. */
export function loadStudio(): Promise<typeof import("./Studio.tsx")> {
  chunk ??= import("./Studio.tsx")
  return chunk
}
