import { setAdminMode } from "./adminMode.ts"
import { sealImage, storedJson, PREF_IDS, type DurablePort, type Json, type LoadedShelf, type PrefRow } from "./ledger.ts"
import { freshSave, hydrate, parseSave, type SaveData } from "./save.ts"
import type { TechDatabase } from "./ledgerDexie.ts"

const DATABASE_ERROR = "Couldn't open the save database."

function showDatabaseError(): void {
  if (typeof document === "undefined") return
  const root = document.getElementById("root")
  if (root) root.textContent = DATABASE_ERROR
}

function setupAdminToggle(db: TechDatabase): void {
  if (typeof window === "undefined") return

  const sequence = ["a"]
  let index = 0
  let ctrlAlt = false

  window.addEventListener("keydown", (event) => {
    // Track Ctrl+Alt state
    if ((event.ctrlKey || event.metaKey) && event.altKey) {
      ctrlAlt = true
      index = 0
    } else {
      ctrlAlt = false
    }
  })

  window.addEventListener("keyup", (event) => {
    if (!ctrlAlt || event.key.toLowerCase() !== sequence[index]) {
      index = 0
      ctrlAlt = false
      return
    }

    index++
    if (index === sequence.length) {
      index = 0
      ctrlAlt = false
      void (async () => {
        const { toggleAdminMode } = await import("./ledgerDexie.ts")
        const next = await toggleAdminMode(db)
        setAdminMode(next)
        if (typeof document !== "undefined") {
          const label = next ? "Admin mode ON" : "Admin mode OFF"
          console.log(`[Tech Ascension] ${label}`)
        }
      })()
    }
  })
}

function prefRows(loaded: LoadedShelf): PrefRow[] {
  const rows: PrefRow[] = []
  for (const id of PREF_IDS) {
    const row = loaded[id]
    if (row) rows.push(row)
  }
  return rows
}

function adoptWinner(body: Json): SaveData | null {
  return parseSave(body)
}

function careerText(body: Json | undefined): string | null {
  if (body == null) return null
  return JSON.stringify(body)
}

async function bootGame(): Promise<void> {
  let port: DurablePort
  let db: TechDatabase
  try {
    const dexie = await import("./ledgerDexie.ts")
    db = await dexie.openTechDatabase()
    port = dexie.createDexiePort(db)
    setAdminMode(await dexie.readAdminMode(db))
    setupAdminToggle(db)
  } catch {
    showDatabaseError()
    return
  }

  const loaded = await port.load()
  const now = Date.now()
  const hydrated = hydrate(careerText(loaded.career?.body), now)
  const expected = loaded.career?.rev ?? 0
  const next = { id: "career" as const, rev: expected + 1, body: storedJson(hydrated.save) }
  const claim = await port.claimCareer(expected, next)
  let save = hydrated.save
  let rev = next.rev
  if (claim === "lost") {
    const winner = (await port.load()).career
    save = winner ? adoptWinner(winner.body) ?? freshSave(now) : freshSave(now)
    rev = winner?.rev ?? 0
  }
  sealImage(save, hydrated.toast, rev, prefRows(loaded), port)
  const app = await import("../startApp.tsx")
  app.startApp()
}

export function openGame(): Promise<void> {
  const locks = typeof navigator === "undefined" ? undefined : navigator.locks
  if (!locks) return bootGame()

  let releaseHold = (): void => {}
  const hold = new Promise<void>((resolve) => {
    releaseHold = resolve
  })
  window.addEventListener("pagehide", () => releaseHold(), { once: true })

  // Hold the writer lock until the page is discarded so a second tab cannot put the career.
  return new Promise((resolve, reject) => {
    void locks.request("tech-ascension-writer", async () => {
      try {
        await bootGame()
        resolve()
      } catch (error) {
        reject(error)
      }
      await hold
    }).catch((error: unknown) => {
      reject(error)
    })
  })
}
