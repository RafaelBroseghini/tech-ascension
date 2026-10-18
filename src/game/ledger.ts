import { hydrate, type SaveData } from "./save.ts"

export const PREF_IDS = ["desk", "theme", "shopTab", "shopPanel"] as const
export type PrefId = (typeof PREF_IDS)[number]

type RecordRev = number
type Slot = "career" | PrefId
type CasResult = "landed" | "stale" | "aborted"
type ClaimResult = "claimed" | "lost"

/** A JSON value. Dexie stores this directly. A string here is a scalar, not a stringified document. */
export type Json = null | boolean | number | string | Json[] | { readonly [key: string]: Json }

export type CareerRow = {
  readonly id: "career"
  readonly rev: RecordRev
  readonly body: Json
}

export type PrefRow = {
  readonly id: PrefId
  readonly rev: RecordRev
  readonly body: Json
}

export type RecordRow = CareerRow | PrefRow

export type LoadedShelf = {
  readonly career: CareerRow | null
  readonly desk: PrefRow | null
  readonly theme: PrefRow | null
  readonly shopTab: PrefRow | null
  readonly shopPanel: PrefRow | null
}

/** Durability boundary. Store, harness, and React do not see this. */
export type DurablePort = {
  load(): Promise<LoadedShelf>
  casPut(row: RecordRow): Promise<CasResult>
  claimCareer(expectedRev: RecordRev, next: CareerRow): Promise<ClaimResult>
}

type Clock = Record<Slot, number>
type PrefBodies = Record<PrefId, Json>

type Image = {
  sealed: boolean
  career: SaveData | null
  toast: string | null
  prefs: PrefBodies
}

function blankClock(): Clock {
  return { career: 0, desk: 0, theme: 0, shopTab: 0, shopPanel: 0 }
}

function blankPrefs(): PrefBodies {
  return { desk: null, theme: null, shopTab: null, shopPanel: null }
}

function blankImage(): Image {
  return { sealed: false, career: null, toast: null, prefs: blankPrefs() }
}

let epoch = 0
let image: Image = blankImage()
let clock: Clock = blankClock()
let durable: Clock = blankClock()
let writer: Pick<DurablePort, "casPut"> | null = null
let timers: ReturnType<typeof setTimeout>[] = []

function clearTimers(): void {
  for (const timer of timers) clearTimeout(timer)
  timers = []
}

/**
 * The value IndexedDB should hold. Objects and arrays are cloned through JSON so the row is a
 * plain document, not a string and not a live reference. A string that is itself a JSON document
 * is unwrapped. A scalar string stays a string.
 */
export function storedJson(value: unknown): Json {
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value)
      if (parsed !== null && typeof parsed === "object") return storedJson(parsed)
    } catch {
      return value
    }
    return value
  }
  if (value == null) return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "boolean") return value
  if (typeof value === "object") {
    try {
      return JSON.parse(JSON.stringify(value)) as Json
    } catch {
      return null
    }
  }
  return null
}

/** True when `body` is a stringified object or array that should be rewritten as JSON. */
export function bodyNeedsRewrite(body: Json): boolean {
  if (typeof body !== "string") return false
  const next = storedJson(body)
  return next !== null && typeof next === "object"
}

export function judgeCas(storedRev: RecordRev | null, putRev: RecordRev): "landed" | "stale" {
  if (storedRev == null || storedRev < putRev) return "landed"
  return "stale"
}

export function judgeClaim(storedRev: RecordRev | null, expectedRev: RecordRev): ClaimResult {
  return (storedRev ?? 0) === expectedRev ? "claimed" : "lost"
}

export function readCareerText(): string | null {
  if (!image.career) return null
  return JSON.stringify(image.career)
}

export function readPref(id: PrefId): Json {
  return image.prefs[id]
}

function snapshot(id: Slot): RecordRow | null {
  const rev = clock[id]
  if (id === "career") {
    if (!image.career) return null
    return { id: "career", rev, body: storedJson(image.career) }
  }
  return { id, rev, body: image.prefs[id] }
}

function noteResult(id: Slot, rev: RecordRev, result: CasResult, mayRetry: boolean): void {
  if (result === "landed" || result === "stale") {
    if (rev >= durable[id]) durable[id] = rev
    return
  }
  // An aborted put leaves the previous whole row. Retry the current image once soon and once later.
  // A stale revision is not retried. The next write is the convergence guarantee.
  if (mayRetry) scheduleRetry(id)
}

function retryLatest(id: Slot, seen: number): void {
  if (seen !== epoch) return
  const current = writer
  if (!current || clock[id] <= durable[id]) return
  const row = snapshot(id)
  if (!row) return
  void current.casPut(row).then((result) => {
    if (seen !== epoch) return
    noteResult(id, row.rev, result, false)
  })
}

function scheduleRetry(id: Slot): void {
  const seen = epoch
  queueMicrotask(() => retryLatest(id, seen))
  const handle = setTimeout(() => retryLatest(id, seen), 1000)
  if (typeof handle === "object" && handle && "unref" in handle) handle.unref()
  timers.push(handle)
}

function putRow(row: RecordRow): void {
  const current = writer
  if (!current) return
  const seen = epoch
  void current.casPut(row).then((result) => {
    if (seen !== epoch) return
    noteResult(row.id, row.rev, result, true)
  })
}

export function writeCareer(save: SaveData): void {
  const rev = clock.career + 1
  clock.career = rev
  image.career = save
  putRow({ id: "career", rev, body: storedJson(save) })
}

/**
 * Hand the career to another tab: put this tab's latest save and wait for it to land, then stop writing for good.
 * Every write after this is dropped, so the tab taking over loads exactly what was left and nothing here overwrites it.
 */
export async function retireWriter(save: SaveData): Promise<void> {
  const current = writer
  writer = null
  epoch += 1
  clearTimers()
  if (!current) return
  const rev = clock.career + 1
  clock.career = rev
  image.career = save
  await current.casPut({ id: "career", rev, body: storedJson(save) }).catch(() => "aborted")
}

// A past savedAt is the offline input. Putting it would race the post-credit write.
export function stageCareer(save: SaveData): void {
  image.career = save
}

export function writePref(id: PrefId, body: unknown): void {
  const rev = clock[id] + 1
  clock[id] = rev
  const stored = storedJson(body)
  image.prefs[id] = stored
  putRow({ id, rev, body: stored })
}

export function loadCareerForBoot(now: number): { save: SaveData; toast: string | null } {
  if (image.sealed && image.career) return { save: image.career, toast: image.toast }
  const hydrated = hydrate(readCareerText(), now)
  image.toast = hydrated.toast
  writeCareer(hydrated.save)
  image.sealed = true
  return { save: hydrated.save, toast: hydrated.toast }
}

export function resetLedgerForTests(): void {
  epoch += 1
  clearTimers()
  image = blankImage()
  clock = blankClock()
  durable = blankClock()
  writer = null
}

/**
 * Install the career, prefs, and revision clocks a boot already committed.
 * The next write uses clock + 1, including when the stored career revision is already 40.
 */
export function sealImage(
  save: SaveData,
  toast: string | null,
  careerRev: RecordRev,
  prefs: readonly PrefRow[],
  port: Pick<DurablePort, "casPut">,
): void {
  epoch += 1
  clearTimers()
  image = { sealed: true, career: save, toast, prefs: blankPrefs() }
  clock = blankClock()
  clock.career = careerRev
  durable = { ...clock }
  for (const pref of prefs) {
    const body = storedJson(pref.body)
    image.prefs[pref.id] = body
    clock[pref.id] = pref.rev
    durable[pref.id] = pref.rev
  }
  writer = port
}

function copyRow(row: RecordRow): RecordRow {
  const body = storedJson(row.body)
  if (row.id === "career") return { id: "career", rev: row.rev, body }
  return { id: row.id, rev: row.rev, body }
}

export function createMemoryPort(): DurablePort & { failNextCas(times: number): void } {
  epoch += 1
  clearTimers()
  const rows = new Map<Slot, RecordRow>()
  let failCas = 0

  const port: DurablePort & { failNextCas(times: number): void } = {
    failNextCas(times: number) {
      if (times > 0) failCas += times
    },
    load() {
      const career = rows.get("career")
      const desk = rows.get("desk")
      const theme = rows.get("theme")
      const shopTab = rows.get("shopTab")
      const shopPanel = rows.get("shopPanel")
      return Promise.resolve({
        career: career && career.id === "career" ? { id: "career" as const, rev: career.rev, body: career.body } : null,
        desk: desk && desk.id === "desk" ? { id: "desk" as const, rev: desk.rev, body: desk.body } : null,
        theme: theme && theme.id === "theme" ? { id: "theme" as const, rev: theme.rev, body: theme.body } : null,
        shopTab: shopTab && shopTab.id === "shopTab" ? { id: "shopTab" as const, rev: shopTab.rev, body: shopTab.body } : null,
        shopPanel: shopPanel && shopPanel.id === "shopPanel" ? { id: "shopPanel" as const, rev: shopPanel.rev, body: shopPanel.body } : null,
      })
    },
    casPut(row) {
      if (failCas > 0) {
        failCas -= 1
        return Promise.resolve("aborted" as const)
      }
      const stored = rows.get(row.id) ?? null
      const verdict = judgeCas(stored ? stored.rev : null, row.rev)
      if (verdict === "stale") return Promise.resolve("stale" as const)
      rows.set(row.id, copyRow(row))
      return Promise.resolve("landed" as const)
    },
    claimCareer(expectedRev, next) {
      const stored = rows.get("career")
      const verdict = judgeClaim(stored ? stored.rev : null, expectedRev)
      if (verdict === "lost") return Promise.resolve("lost" as const)
      rows.set("career", { id: "career", rev: next.rev, body: next.body })
      return Promise.resolve("claimed" as const)
    },
  }
  writer = port
  return port
}
