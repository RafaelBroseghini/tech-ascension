/** @vitest-environment happy-dom */
import { MotionGlobalConfig } from "motion/react"
import { act, createElement } from "react"
import { createRoot } from "react-dom/client"
import type { Root } from "react-dom/client"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { INTERVIEWS } from "../../data/studio/challenges.ts"
import { SHORTENER_CDN_READS_ONLY } from "../../data/studio/fixtures.ts"
import { useGame } from "../../game/store.ts"
import type { Design } from "../../game/studio/types.ts"
import { showInterview, useBoard } from "./boardStore.ts"
import { closeStudio, getStudioView, loadStudio, openStudio } from "./launcher.ts"
import { StudioHost } from "./StudioHost.tsx"

const interview = (id: string) => INTERVIEWS.find((row) => row.id === id) ?? INTERVIEWS[0]
const THREE_TIER = interview("3-tier-app")
const SHORTENER = interview("url-shortener")
const NAIVE = (id: string, name: string): Design => interview(id).naive.find((n) => n.name === name)?.design ?? { nodes: [], edges: [] }

const SKILLS = Object.fromEntries(Array.from({ length: 16 }, (_, i) => [String(i + 1), 1]))

/** A career whose next interview is `jobId`'s: the job board open, every earlier gated job held. */
function careerAt(xp: number, jobs: number[], gigs: number[] = [1, 2, 3, 4, 5, 6]) {
  useGame.setState({ xp, xpTotal: xp, skills: SKILLS, gigs, jobs, interviews: {} })
}

let root: Root | null = null
let host: HTMLDivElement

async function render() {
  await loadStudio()
  host = document.createElement("div")
  document.body.append(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(createElement(StudioHost))
  })
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

async function open(id: string, seed?: Design) {
  if (seed) showInterview(id, seed)
  openStudio(id)
  await render()
}

const $ = (selector: string) => document.body.querySelector<HTMLElement>(selector)
const $$ = (selector: string) => [...document.body.querySelectorAll<HTMLElement>(selector)]

async function click(el: HTMLElement | null) {
  expect(el).not.toBeNull()
  await act(async () => {
    el?.click()
  })
}

/** Submit, then a click on the whiteboard skips the traffic reveal. */
async function submitAndSkip() {
  await click($("[data-testid='studio-submit']"))
  await act(async () => {
    $("[data-testid='studio']")?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }))
  })
}

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  // happy-dom rejects a cancelled Web Animation; the tests read end states, not motion.
  MotionGlobalConfig.skipAnimations = true
})

afterEach(async () => {
  await act(async () => {
    root?.unmount()
  })
  root = null
  closeStudio()
  document.body.replaceChildren()
  useBoard.setState({ interviewId: null, nodes: [], edges: [], edits: 0, run: null, sheets: {} })
  useGame.getState().wipe()
  vi.restoreAllMocks()
})

describe("whiteboard", () => {
  it("the palette lists only unlocked kinds", async () => {
    careerAt(60_000, [1])
    await open(THREE_TIER.id)
    const tiles = $$("[data-testid='studio-tile']").map((tile) => tile.dataset.kind)
    // Skill 1 opens the API and SQL, gigs 1 and 3 the balancer and cache, the internship the replica.
    expect(tiles).toEqual(["lb", "api", "cache", "sql", "replica"])
    expect(tiles).not.toContain("users")
    expect(tiles).not.toContain("standby")
  })

  it("Run shows the hot node", async () => {
    careerAt(100_000, [1, 2, 6])
    await open(SHORTENER.id, NAIVE(SHORTENER.id, "No cache"))
    expect($("[data-node='db']")?.dataset.heat).toBeUndefined()
    await submitAndSkip()
    const db = $("[data-node='db']")
    expect(db?.classList.contains("is-hot")).toBe(true)
    expect(Number.parseInt(db?.dataset.heat ?? "0", 10)).toBeGreaterThan(100)
    expect($("[data-node='lb']")?.classList.contains("is-hot")).toBe(false)
    expect($("[data-testid='studio-verdict']")?.dataset.verdict).toBe("noHire")
  })

  it("an unrouted write shows the warning before Run", async () => {
    careerAt(100_000, [1, 2, 6])
    const submit = vi.spyOn(useGame.getState(), "submitWhiteboard")
    await open(SHORTENER.id, SHORTENER_CDN_READS_ONLY)
    const warning = $("[data-testid='studio-unrouted']")
    expect(warning?.dataset.unrouted).toBe("write")
    expect(warning?.textContent).toContain("writes")
    expect(submit).not.toHaveBeenCalled()
    expect($("[data-testid='studio-run']")).toBeNull()
  })

  it("Submit calls submitWhiteboard once", async () => {
    careerAt(60_000, [1])
    const real = useGame.getState().submitWhiteboard
    const submit = vi.fn(real)
    useGame.setState({ submitWhiteboard: submit })
    await open(THREE_TIER.id, THREE_TIER.reference)
    await submitAndSkip()
    expect(submit).toHaveBeenCalledTimes(1)
    expect(submit.mock.calls[0][0]).toBe(THREE_TIER.id)
    expect(submit.mock.calls[0][1]).toEqual({
      nodes: THREE_TIER.reference.nodes.map(({ id, kind, replicas }) => ({ id, kind, replicas })),
      edges: THREE_TIER.reference.edges,
    })
    expect($("[data-testid='studio-verdict']")?.dataset.verdict).toBe("hire")
  })

  it("a No hire shows the XP lost", async () => {
    careerAt(60_000, [1])
    await open(THREE_TIER.id, NAIVE(THREE_TIER.id, "One API does it all"))
    expect($("[data-testid='studio-penalty']")?.textContent).toBe("No hire costs 2,250 XP")
    await submitAndSkip()
    expect($("[data-testid='studio-verdict']")?.dataset.verdict).toBe("noHire")
    expect($("[data-testid='studio-xp-lost']")?.textContent).toBe("-2,250 XP")
    expect(useGame.getState().xp).toBe(60_000 - 2_250)
    expect($$("[data-testid='studio-node']").map((n) => n.dataset.node)).toEqual(["users", "api", "db"])
  })

  it("Escape closes the whiteboard and keeps the board", async () => {
    careerAt(60_000, [1])
    await open(THREE_TIER.id)
    await click($("[data-testid='studio-tile'][data-kind='api']"))
    expect($$("[data-testid='studio-node']").map((n) => n.dataset.kind)).toEqual(["users", "api"])
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    })
    expect(getStudioView().open).toBe(false)
    expect($("[data-testid='studio']")).toBeNull()
    await act(async () => {
      openStudio()
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect($("[data-testid='studio']")?.dataset.interview).toBe(THREE_TIER.id)
    expect($$("[data-testid='studio-node']").map((n) => n.dataset.kind)).toEqual(["users", "api"])
  })
})
