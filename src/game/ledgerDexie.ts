import Dexie, { type Table } from "dexie"
import { bodyNeedsRewrite, judgeCas, judgeClaim, storedJson, type CareerRow, type DurablePort, type Json, type LoadedShelf, type PrefId, type PrefRow } from "./ledger.ts"

type CasResult = "landed" | "stale" | "aborted"

type StoredRecord = {
  id: string
  rev: number
  body: Json
}

class TechDatabase extends Dexie {
  records!: Table<StoredRecord, string>

  constructor() {
    super("tech-ascension")
    // Version 1 created `device` for the localStorage import markers. Version 2 drops it.
    this.version(1).stores({
      records: "id",
      device: "id",
    })
    this.version(2).stores({
      records: "id",
      device: null,
    })
  }
}

export function openTechDatabase(): Promise<TechDatabase> {
  const db = new TechDatabase()
  return db.open().then(() => db)
}

function readRev(value: unknown): number | null {
  if (!value || typeof value !== "object" || !("rev" in value)) return null
  const rev = value.rev
  return typeof rev === "number" && Number.isFinite(rev) ? rev : null
}

function careerRow(row: StoredRecord | undefined): CareerRow | null {
  if (!row || row.id !== "career" || !Number.isFinite(row.rev)) return null
  return { id: "career", rev: row.rev, body: storedJson(row.body) }
}

function prefRow(id: PrefId, row: StoredRecord | undefined): PrefRow | null {
  if (!row || row.id !== id || !Number.isFinite(row.rev)) return null
  return { id, rev: row.rev, body: storedJson(row.body) }
}

function shelfFrom(records: readonly StoredRecord[]): LoadedShelf {
  const byId = new Map(records.map((row) => [row.id, row]))
  return {
    career: careerRow(byId.get("career")),
    desk: prefRow("desk", byId.get("desk")),
    theme: prefRow("theme", byId.get("theme")),
    shopTab: prefRow("shopTab", byId.get("shopTab")),
    treeFolds: prefRow("treeFolds", byId.get("treeFolds")),
  }
}

function finishCas(tx: IDBTransaction, current: () => CasResult): Promise<CasResult> {
  return new Promise((resolve) => {
    let settled = false
    const finish = (result: CasResult) => {
      if (settled) return
      settled = true
      resolve(result)
    }
    tx.oncomplete = () => finish(current())
    tx.onabort = () => finish("aborted")
    tx.onerror = () => finish("aborted")
  })
}

export function createDexiePort(db: TechDatabase): DurablePort {
  return {
    async load() {
      const records = await db.records.toArray()
      const pending: StoredRecord[] = []
      const normalized = records.map((row) => {
        if (!bodyNeedsRewrite(row.body)) return row
        const next = { id: row.id, rev: row.rev, body: storedJson(row.body) }
        pending.push(next)
        return next
      })
      if (pending.length > 0) {
        await db.transaction("rw", db.records, () => Promise.all(pending.map((row) => db.records.put(row))))
      }
      return shelfFrom(normalized)
    },

    // The native transaction is opened before this returns. pagehide drops one that starts in a microtask.
    casPut(row) {
      const tx = db.backendDB().transaction("records", "readwrite")
      const store = tx.objectStore("records")
      const request = store.get(row.id)
      const body = storedJson(row.body)
      let result: CasResult = "landed"
      request.onsuccess = () => {
        if (judgeCas(readRev(request.result), row.rev) === "stale") {
          result = "stale"
          return
        }
        store.put({ id: row.id, rev: row.rev, body })
      }
      return finishCas(tx, () => result)
    },

    claimCareer(expectedRev, next) {
      const tx = db.backendDB().transaction("records", "readwrite")
      const store = tx.objectStore("records")
      const request = store.get("career")
      let result: "claimed" | "lost" = "lost"
      request.onsuccess = () => {
        if (judgeClaim(readRev(request.result), expectedRev) === "lost") return
        result = "claimed"
        store.put({ id: next.id, rev: next.rev, body: storedJson(next.body) })
      }
      return new Promise((resolve) => {
        let settled = false
        const finish = (value: "claimed" | "lost") => {
          if (settled) return
          settled = true
          resolve(value)
        }
        tx.oncomplete = () => finish(result)
        tx.onabort = () => finish("lost")
        tx.onerror = () => finish("lost")
      })
    },
  }
}
