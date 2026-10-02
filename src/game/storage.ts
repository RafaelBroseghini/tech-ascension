import type { SaveData } from "./save.ts"

export const SAVE_KEY = "tech-ascension.save"

export function readSaveText(): string | null {
  try {
    return localStorage.getItem(SAVE_KEY)
  } catch {
    return null
  }
}

export function writeSave(save: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save))
  } catch {
    // Private mode or a full disk: keep playing in memory.
  }
}

/** Drops the stored save. Used when it is corrupt or from another schema version. */
export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    // Nothing to clear.
  }
}
