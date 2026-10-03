import { readPref, writePref } from "./ledger.ts"
import { SHOP_TABS } from "./phase.ts"
import type { ShopTab } from "./phase.ts"

/** Last shop tab the player opened; separate from the career save so a wipe keeps the layout. */

const VALID = new Set<string>(SHOP_TABS)

export function parseSavedShopTab(raw: string | null): ShopTab | null {
  if (!raw || !VALID.has(raw)) return null
  return raw as ShopTab
}

export function readSavedShopTab(): ShopTab | null {
  const raw = readPref("shopTab")
  return parseSavedShopTab(typeof raw === "string" ? raw : null)
}

export function writeSavedShopTab(tab: ShopTab | null): void {
  writePref("shopTab", tab)
}
