/**
 * Admin mode turns on a settings section that sets money and XP directly. It is on when the
 * `records` store of the `tech-ascension` IndexedDB holds `{ id: "admin", body: "tech-ascension-admin" }`.
 * Read once at boot; reload after adding or removing the row.
 */
export const ADMIN_ROW_ID = "admin"
export const ADMIN_CODE = "tech-ascension-admin"

const listeners = new Set<() => void>()
let on = false

export function isAdminCode(body: unknown): boolean {
  return body === ADMIN_CODE
}

export function getAdminMode(): boolean {
  return on
}

export function setAdminMode(next: boolean): void {
  if (on === next) return
  on = next
  for (const listener of listeners) listener()
}

export function subscribeAdminMode(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
