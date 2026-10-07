/** Whether the desk sidebar is closed or shows the career log (the Git icon). */
export type SidebarView = "closed" | "log"

const listeners = new Set<() => void>()
let view: SidebarView = "closed"

export function getSidebarView(): SidebarView {
  return view
}

export function setSidebarView(next: SidebarView): void {
  if (view === next) return
  view = next
  for (const listener of listeners) listener()
}

export function subscribeSidebarView(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
