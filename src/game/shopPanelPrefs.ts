import { readPref, writePref } from "./ledger.ts"

/** Whether the shop column is visible; persists outside the career save. */

const listeners = new Set<() => void>()

export function subscribeShopPanelOpen(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function readShopPanelOpen(): boolean {
  const raw = readPref("shopPanel")
  if (raw === false) return false
  return true
}

export function writeShopPanelOpen(open: boolean): void {
  writePref("shopPanel", open)
  for (const listener of listeners) listener()
}
