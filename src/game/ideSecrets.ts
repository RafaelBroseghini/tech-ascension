import { readPref, writePref } from "./ledger.ts"

/** Explorer unlock for ARCHITECTURE.md; survives career wipes. */

const TAB_SEQ = [0, 1, 2] as const
const TAB_SEQ_MS = 12_000
const TRIPLE_CLICK_MS = 700

type LorePref = { lore?: boolean }

let tabStep = 0
let tabDeadline = 0
let statusClicks = 0
let statusDeadline = 0
const listeners = new Set<() => void>()

function notify(): void {
  for (const fn of listeners) fn()
}

function readPrefBody(): LorePref {
  const raw = readPref("ideLore")
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as LorePref
  return {}
}

export function subscribeIdeLore(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange)
  return () => listeners.delete(onStoreChange)
}

export function readIdeLoreUnlocked(): boolean {
  return readPrefBody().lore === true
}

export function unlockIdeLore(): boolean {
  if (readIdeLoreUnlocked()) return false
  writePref("ideLore", { lore: true })
  notify()
  return true
}

/** Shift-click a late-band folder or file in the explorer. */
export function tryUnlockIdeLoreFromFolder(packFromTier: number, shiftKey: boolean): void {
  if (!shiftKey || packFromTier < 41) return
  unlockIdeLore()
}

/** Triple-click the IDE status bar. */
export function tryUnlockIdeLoreFromStatusBar(now = Date.now()): void {
  if (now - statusDeadline > TRIPLE_CLICK_MS) {
    statusClicks = 0
    statusDeadline = now
  }
  statusClicks += 1
  statusDeadline = now
  if (statusClicks >= 3) {
    statusClicks = 0
    unlockIdeLore()
  }
}

/**
 * Open the first three tabs in order (attention.py → softmax.py → test_attention.py).
 * Only counts while the Distinguished pack is active.
 */
export function tryUnlockIdeLoreFromTab(packId: string, index: number, now = Date.now()): void {
  if (packId !== "attention") return
  if (now > tabDeadline) tabStep = 0
  tabDeadline = now + TAB_SEQ_MS
  const want = TAB_SEQ[tabStep]
  if (index === want) {
    tabStep += 1
    if (tabStep >= TAB_SEQ.length) {
      tabStep = 0
      unlockIdeLore()
    }
    return
  }
  tabStep = index === TAB_SEQ[0] ? 1 : 0
}
