import { IDE_LONG_FORM } from "./ideLongForm.generated.ts"

export function longFormScript(packId: string, path: string): string | null {
  const key = `${packId}:${path}`
  return IDE_LONG_FORM[key] ?? null
}

export function isLongFormScript(packId: string, path: string): boolean {
  return longFormScript(packId, path) != null
}
