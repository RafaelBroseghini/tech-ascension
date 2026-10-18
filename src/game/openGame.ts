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

const WRITER_LOCK = "tech-ascension-writer"
const TABS_CHANNEL = "tech-ascension-tabs"
const TAKEOVER = "takeover"
/** A tab that does not hand over this fast (frozen, or from an older build) has its lock taken anyway. */
const STEAL_AFTER_MS = 4000
/** Set just before a tab that handed over reloads, so its waiting screen says where the game went. */
const HANDED_OFF = "tech-ascension-handed-off"

function channel(): BroadcastChannel | null {
  return typeof BroadcastChannel === "function" ? new BroadcastChannel(TABS_CHANNEL) : null
}

/**
 * Boot and play as the one tab that writes the save, holding the lock until the page goes away. Another tab asking to
 * play (or stealing the lock) gets one last save, and this tab reloads into the waiting screen.
 */
async function playHere(released: Promise<void>, leave: () => void): Promise<void> {
  const tabs = channel()
  let leaving = false
  const handOver = async () => {
    if (leaving) return
    leaving = true
    tabs?.close()
    const store = await import("./store.ts")
    await store.handOffCareer()
    sessionStorage.setItem(HANDED_OFF, "1")
    leave()
    window.location.reload()
  }
  if (tabs) tabs.onmessage = (event: MessageEvent) => void (event.data === TAKEOVER && handOver())
  stolen = handOver
  await bootGame()
  await released
}

/** What to run when this tab's lock is stolen. Set once the tab plays. */
let stolen: (() => Promise<void>) | null = null

/** The second tab: says the game is open elsewhere, takes over on Play here, and starts by itself once the other tab closes. */
function waitForTurn(locks: LockManager, run: () => Promise<void>): void {
  const handedOff = sessionStorage.getItem(HANDED_OFF) === "1"
  sessionStorage.removeItem(HANDED_OFF)
  const root = document.getElementById("root")
  const card = document.createElement("div")
  card.className = "tab-elsewhere"
  card.setAttribute("role", "dialog")
  card.setAttribute("aria-labelledby", "tab-elsewhere-title")
  const title = document.createElement("h1")
  title.id = "tab-elsewhere-title"
  title.textContent = handedOff ? "You're playing in another tab now" : "Tech Ascension is open in another tab"
  const body = document.createElement("p")
  body.textContent = "One tab plays at a time, so the save never splits in two. Play here to move the game to this tab; it starts here by itself when the other tab closes."
  const button = document.createElement("button")
  button.type = "button"
  button.textContent = "Play here"
  card.append(title, body, button)
  root?.replaceChildren(card)

  let started = false
  const start = () => {
    if (started) return Promise.resolve()
    started = true
    root?.replaceChildren()
    return run()
  }
  const queued = new AbortController()
  // Waits in line behind the tab that plays: granted when it closes or hands over.
  void locks.request(WRITER_LOCK, { signal: queued.signal }, start).catch(() => {})

  button.addEventListener("click", () => {
    button.disabled = true
    button.textContent = "Moving the game here…"
    const tabs = channel()
    tabs?.postMessage(TAKEOVER)
    tabs?.close()
    window.setTimeout(() => {
      if (started) return
      queued.abort()
      void locks.request(WRITER_LOCK, { steal: true }, start).catch(() => {})
    }, STEAL_AFTER_MS)
  })
}

export function openGame(): Promise<void> {
  const locks = typeof navigator === "undefined" ? undefined : navigator.locks
  if (!locks) return bootGame()

  let releaseHold = (): void => {}
  const hold = new Promise<void>((resolve) => {
    releaseHold = resolve
  })
  window.addEventListener("pagehide", () => releaseHold(), { once: true })
  const run = () => playHere(hold, releaseHold)

  // Hold the writer lock until the page is discarded so a second tab cannot put the career. A second tab waits, and can take over.
  return new Promise((resolve, reject) => {
    void locks
      .request(WRITER_LOCK, { ifAvailable: true }, async (lock) => {
        if (!lock) {
          waitForTurn(locks, run)
          resolve()
          return
        }
        try {
          const playing = run()
          resolve()
          await playing
        } catch (error) {
          reject(error)
        }
      })
      .catch((error: unknown) => {
        // Another tab stole the lock: save once more, stop writing, and wait.
        if (error instanceof DOMException && error.name === "AbortError" && stolen) {
          void stolen()
          return
        }
        reject(error)
      })
  })
}
