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
import { closeStudio, getStudioView, loadStudio, onStudioHire, openStudio } from "./launcher.ts"
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
  useBoard.setState({ interviewId: null, notice: null, nodes: [], edges: [], edits: 0, run: null, sheets: {} })
  useGame.getState().wipe()
  vi.restoreAllMocks()
})

describe("whiteboard", () => {
  // First in the file: the launcher remembers the last interview, and this one needs a page that opened none yet.
  it("a Hire keeps the interview the activity bar opened", async () => {
    expect(getStudioView().interviewId).toBeNull()
    careerAt(60_000, [1])
    showInterview(THREE_TIER.id, THREE_TIER.reference)
    openStudio()
    await render()
    expect($("[data-testid='studio']")?.dataset.interview).toBe(THREE_TIER.id)
    await submitAndSkip()
    expect($("[data-testid='studio']")?.dataset.interview).toBe(THREE_TIER.id)
    expect($("[data-testid='studio-verdict']")?.dataset.verdict).toBe("hire")
  })

  it("lists only the interviews the career has reached", async () => {
    careerAt(40_000, [], [1, 2, 3, 4, 5, 6])
    await open(THREE_TIER.id)
    expect($$("[data-testid='studio-interview']").map((row) => row.dataset.interview)).toEqual(["hello-server"])
    expect($$(".studio-list-select option").map((option) => option.getAttribute("value"))).toEqual(["hello-server"])
    // The request for a locked interview falls back to the one the career can take.
    expect($("[data-testid='studio']")?.dataset.interview).toBe("hello-server")
    const text = document.body.textContent ?? ""
    for (const row of INTERVIEWS.filter((r) => r.id !== "hello-server")) expect(text).not.toContain(row.name)
  })

  it("before the Job Board the whiteboard names no interview", async () => {
    careerAt(0, [], [])
    await open(THREE_TIER.id)
    expect($("[data-testid='studio-empty']")?.textContent).toBe("Your next interview opens with the Job Board.")
    expect($$("[data-testid='studio-interview']")).toEqual([])
    expect($("[data-testid='studio-submit']")).toBeNull()
    expect($("[data-testid='studio']")?.dataset.interview).toBeUndefined()
    const text = document.body.textContent ?? ""
    for (const row of INTERVIEWS) expect(text).not.toContain(row.name)
  })

  it("keeps passed interviews listed for replay", async () => {
    careerAt(60_000, [1])
    useGame.getState().forceInterview(THREE_TIER.id)
    await open(THREE_TIER.id)
    expect($$("[data-testid='studio-interview']").map((row) => row.dataset.status)).toEqual(["hired", "passed"])
  })

  it("every meter moves with an edit, and none says pass or fail before a Submit", async () => {
    careerAt(60_000, [1])
    await open(THREE_TIER.id, NAIVE(THREE_TIER.id, "One API does it all"))
    const read = () => $$("[data-testid='studio-live-meter']").map((meter) => meter.textContent)
    const before = read()
    expect($$("[data-testid='studio-live-meter']").map((meter) => meter.dataset.meter)).toEqual(["Money", "Performance", "Availability", "Fault tolerance", "Correctness"])
    await click($("[data-testid='studio-tile'][data-kind='cache']"))
    const after = read()
    expect(after[0]).not.toBe(before[0])
    expect(document.body.querySelector(".is-fail, .is-over")).toBeNull()
    await click($("[data-testid='studio-tile'][data-kind='lb']"))
    expect(read()[0]).not.toBe(after[0])
    expect($("[data-testid='studio-run']")).toBeNull()
  })

  it("the live readout counts requests and names the busiest node, and the run report holds the node lines until the reveal ends", async () => {
    careerAt(60_000, [1])
    useGame.getState().askInterviewer(THREE_TIER.id, "traffic")
    await open(THREE_TIER.id, NAIVE(THREE_TIER.id, "Two APIs, no spare"))
    const line = (testid: string, key: string) => $(`[data-testid='${testid}'] [data-line='${key}']`)?.textContent
    expect(line("studio-live-readout", "requests")).toBe("72,000 requests over 120 s, peak 600 rps")
    expect(line("studio-live-readout", "hottest")).toBe("Busiest: Hamster Wheel API, 120% busy")
    expect(line("studio-live-readout", "singlePoints")).toBe("Single points of failure: PostgreSloth, Round Robin Hood")
    await click($("[data-testid='studio-submit']"))
    expect($$("[data-testid='studio-run-readout'] li").map((li) => li.dataset.line)).toEqual(["requests", "answered"])
    await act(async () => {
      $("[data-testid='studio']")?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }))
    })
    expect($$("[data-testid='studio-run-readout'] li").map((li) => li.dataset.line)).toEqual(["requests", "answered", "hottest", "singlePoints"])
    expect(line("studio-run-readout", "requests")).toBe("72,000 requests over 120 s, peak 600 rps")
  })

  it("an edit after a Submit labels the report as the last submission", async () => {
    careerAt(60_000, [1])
    await open(THREE_TIER.id, NAIVE(THREE_TIER.id, "One API does it all"))
    await submitAndSkip()
    expect($("[data-testid='studio-run']")?.dataset.stale).toBe("false")
    expect($(".studio-run-label")).toBeNull()
    await click($("[data-testid='studio-tile'][data-kind='cache']"))
    expect($("[data-testid='studio-run']")?.dataset.stale).toBe("true")
    expect($(".studio-run-label")?.textContent).toBe("Last submission")
  })

  describe("practice", () => {
    const practiceCareer = () => {
      careerAt(60_000, [1, 2])
      useGame.getState().forceInterview(THREE_TIER.id)
    }

    it("a passed interview reads as practice and a miss changes nothing in the career", async () => {
      practiceCareer()
      await open(THREE_TIER.id, NAIVE(THREE_TIER.id, "One API does it all"))
      expect($("[data-testid='studio-kicker']")?.dataset.practice).toBe("true")
      expect($("[data-testid='studio-kicker']")?.textContent).toContain("Practice")
      expect($("[data-testid='studio-submit']")?.textContent).toBe("Run it again (practice)")
      expect($("[data-testid='studio-penalty']")).toBeNull()
      const career = () => {
        const s = useGame.getState()
        return [s.xp, s.xpTotal, s.jobs, s.interviews, s.journal.entries.length, s.lastInterview]
      }
      const before = career()
      await submitAndSkip()
      const verdict = $("[data-testid='studio-verdict']")
      expect(verdict?.dataset.verdict).toBe("misses")
      expect(verdict?.textContent).toContain("Misses the bar")
      expect(verdict?.textContent).not.toMatch(/Hire|XP/)
      expect($("[data-testid='studio-xp-lost']")).toBeNull()
      expect($("[data-testid='studio-to-jobs']")).toBeNull()
      expect($$("[data-testid='studio-meter'].is-fail").length).toBeGreaterThan(0)
      expect(career()).toEqual(before)
    })

    it("a cheaper passing run says New best and shows the best beside the meters", async () => {
      practiceCareer()
      await open(THREE_TIER.id, THREE_TIER.reference)
      expect($("[data-testid='studio-best']")).toBeNull()
      await submitAndSkip()
      expect($("[data-testid='studio-verdict']")?.dataset.verdict).toBe("passes")
      expect($("[data-testid='studio-verdict']")?.textContent).toContain("Passes the bar")
      expect($("[data-testid='studio-new-best']")?.textContent).toBe("New best")
      expect($("[data-testid='studio-best']")?.textContent).toMatch(/^Best: \$[\d,]+\/mo at p95 \d+ ms$/)
      expect($$("[data-testid='studio-live-meter'].is-fail")).toEqual([])
      await submitAndSkip()
      expect($("[data-testid='studio-new-best']")).toBeNull()
    })

    it("closing after a practice pass does not land on the Job Board", async () => {
      careerAt(60_000, [1])
      useGame.getState().forceInterview(THREE_TIER.id)
      const hired = vi.fn()
      const off = onStudioHire(hired)
      await open(THREE_TIER.id, THREE_TIER.reference)
      await submitAndSkip()
      await act(async () => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
      })
      off()
      expect(hired).not.toHaveBeenCalled()
    })

    it("an open interview shows no pass or fail signal, and a real pass reads as practice only once the reveal ends", async () => {
      careerAt(60_000, [1])
      await open(THREE_TIER.id, THREE_TIER.reference)
      expect($("[data-testid='studio-kicker']")?.dataset.practice).toBe("false")
      expect($("[data-testid='studio-submit']")?.textContent).toBe("Submit to interviewer")
      expect($("[data-testid='studio-best']")).toBeNull()
      await click($("[data-testid='studio-submit']"))
      expect($("[data-testid='studio-kicker']")?.dataset.practice).toBe("false")
      expect($("[data-testid='studio-penalty']")).not.toBeNull()
      await act(async () => {
        $("[data-testid='studio']")?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }))
      })
      expect($("[data-testid='studio-verdict']")?.dataset.verdict).toBe("hire")
      expect($("[data-testid='studio-kicker']")?.dataset.practice).toBe("true")
      expect($("[data-testid='studio-best']")).not.toBeNull()
    })
  })

  it("the palette lists only unlocked kinds", async () => {
    careerAt(60_000, [1])
    await open(THREE_TIER.id)
    const tiles = $$("[data-testid='studio-tile']").map((tile) => tile.dataset.kind)
    // Skill 1 opens the API and SQL, gigs 1 and 3 the balancer and cache. The replica is unlocked but no design here uses it.
    expect(tiles).toEqual(["lb", "api", "cache", "sql"])
    expect(tiles).not.toContain("replica")
    expect(tiles).not.toContain("users")
    expect(tiles).not.toContain("standby")
  })

  it("every interview opens with a goal line above the vague opener", async () => {
    careerAt(60_000, [1])
    await open(THREE_TIER.id)
    const goal = $("[data-testid='studio-goal']")
    expect(goal?.textContent).toBe(THREE_TIER.goal)
    expect(goal?.nextElementSibling?.getAttribute("data-testid")).toBe("studio-brief")
  })

  it("after a pass the score shows stars, and Show the reference swaps in a read-only board marked studied", async () => {
    careerAt(60_000, [1])
    useGame.getState().forceInterview(THREE_TIER.id)
    await open(THREE_TIER.id, THREE_TIER.naive[0].design)
    expect($("[data-testid='studio-stars']")?.dataset.stars).toBe("0")
    await submitAndSkip()
    expect(useGame.getState().interviews[THREE_TIER.id]?.stars).toBe(0)
    expect($("[data-testid='studio-studied']")).toBeNull()
    await click($("[data-testid='studio-study']"))
    expect(useGame.getState().interviews[THREE_TIER.id]?.studied).toBe(true)
    expect($("[data-testid='studio-studying']")).not.toBeNull()
    expect($$("[data-testid='studio-node']").map((n) => n.dataset.node).sort()).toEqual(THREE_TIER.reference.nodes.map((n) => n.id).sort())
    expect($("[data-testid='studio-submit']")?.hasAttribute("disabled")).toBe(true)
    expect($("[data-node='api'] .studio-node-x")).toBeNull()
    expect($("[data-node='api'] [aria-label='One more replica']")?.hasAttribute("disabled")).toBe(true)
    expect($("[data-testid='studio-tile'][data-kind='api']")?.hasAttribute("disabled")).toBe(true)
    await click($("[data-testid='studio-study-back']"))
    expect($("[data-testid='studio-studying']")).toBeNull()
    expect($$("[data-testid='studio-node']").map((n) => n.dataset.node).sort()).toEqual(THREE_TIER.naive[0].design.nodes.map((n) => n.id).sort())
    expect($("[data-testid='studio-studied']")?.textContent).toBe("Studied")
  })

  it("a practice run earns stars and the list shows them", async () => {
    careerAt(60_000, [1])
    useGame.getState().forceInterview(THREE_TIER.id)
    await open(THREE_TIER.id, THREE_TIER.strongHire)
    await click($("[data-testid='studio-submit']"))
    await act(async () => {
      $("[data-testid='studio']")?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }))
    })
    expect($("[data-testid='studio-run-stars']")?.dataset.stars).toBe("3")
    expect($("[data-testid='studio-stars']")?.dataset.stars).toBe("3")
    expect($("[data-testid='studio-interview'][data-interview='3-tier-app'] [data-testid='studio-list-stars']")?.dataset.stars).toBe("3")
  })

  it("the tray counts what the board still takes and stops at zero", async () => {
    careerAt(60_000, [1])
    await open(THREE_TIER.id)
    const count = (kind: string) => $(`[data-testid='studio-tile'][data-kind='${kind}'] [data-testid='studio-tile-count']`)?.textContent
    expect(count("api")).toBe("1 of 1")
    await click($("[data-testid='studio-tile'][data-kind='api']"))
    expect(count("api")).toBe("0 of 1")
    expect($("[data-testid='studio-tile'][data-kind='api']")?.hasAttribute("disabled")).toBe(true)
    expect($$("[data-testid='studio-node'][data-kind='api']")).toHaveLength(1)
  })

  it("a piece snaps into its lane and slides only up and down it", async () => {
    careerAt(60_000, [1])
    await open(THREE_TIER.id)
    await click($("[data-testid='studio-tile'][data-kind='sql']"))
    await click($("[data-testid='studio-tile'][data-kind='api']"))
    const x = (kind: string) => useBoard.getState().nodes.find((n) => n.data.kind === kind)?.position.x
    expect(x("users")).toBeLessThan(x("api")!)
    expect(x("api")).toBeLessThan(x("sql")!)
    const lanes = $$("[data-testid='studio-lane']").map((lane) => lane.dataset.lane)
    expect(lanes).toEqual(["users", "edge", "routing", "compute", "async", "data"])
    const api = useBoard.getState().nodes.find((n) => n.data.kind === "api")!
    await act(async () => {
      const { onNodesChange } = await import("./boardStore.ts")
      onNodesChange([{ id: api.id, type: "position", position: { x: 9999, y: 320 } }])
    })
    const moved = useBoard.getState().nodes.find((n) => n.id === api.id)!
    expect(moved.position).toEqual({ x: api.position.x, y: 320 })
  })

  it("a wire the table forbids is refused with one line saying why", async () => {
    careerAt(60_000, [1])
    await open(THREE_TIER.id)
    await click($("[data-testid='studio-tile'][data-kind='sql']"))
    const { canConnect, connectRefusal, explainRefusal } = await import("./boardStore.ts")
    const db = useBoard.getState().nodes.find((n) => n.data.kind === "sql")!.id
    expect(canConnect({ source: "users", target: db })).toBe(false)
    expect(connectRefusal({ source: "users", target: db })).toBe("Data sits behind a server. The Users can't reach PostgreSloth directly.")
    await act(async () => {
      explainRefusal({ source: "users", target: db })
    })
    expect($("[data-testid='studio-notice']")?.textContent).toContain("Data sits behind a server")
    expect(useBoard.getState().edges).toEqual([])
  })

  it("a locked piece starts on the board and cannot be removed", async () => {
    const feed = interview("read-heavy-feed")
    careerAt(160_000, [1, 2, 6, 7, 10, 12])
    await open(feed.id)
    expect($$("[data-testid='studio-node']").map((n) => n.dataset.node)).toEqual(["users", "db"])
    const { removeNode } = await import("./boardStore.ts")
    await act(async () => {
      removeNode("db")
    })
    expect($$("[data-testid='studio-node']").map((n) => n.dataset.node)).toEqual(["users", "db"])
    expect($("[data-node='db'] .studio-node-x")).toBeNull()
  })

  it("Run traffic is free, plays dots on the draft, and shows no verdict or career change", async () => {
    careerAt(60_000, [1])
    await open(THREE_TIER.id, NAIVE(THREE_TIER.id, "One API does it all"))
    const before = { xp: useGame.getState().xp, interviews: useGame.getState().interviews }
    await click($("[data-testid='studio-run-traffic']"))
    expect(useBoard.getState().demo?.revealing).toBe(true)
    expect(useBoard.getState().demo?.paths.length).toBeGreaterThan(0)
    expect($("[data-testid='studio-run-traffic']")?.hasAttribute("disabled")).toBe(true)
    expect($("[data-testid='studio-verdict']")).toBeNull()
    expect($("[data-testid='studio-run']")).toBeNull()
    expect(document.body.querySelector(".is-fail, .is-over, .is-hot")).toBeNull()
    expect(useGame.getState().xp).toBe(before.xp)
    expect(useGame.getState().interviews).toBe(before.interviews)
    // A click on the whiteboard skips it, and the button is back.
    await act(async () => {
      $("[data-testid='studio']")?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }))
    })
    expect(useBoard.getState().demo?.revealing).toBe(false)
    expect($("[data-testid='studio-run-traffic']")?.hasAttribute("disabled")).toBe(false)
  })

  it("an edit while traffic runs stops it", async () => {
    careerAt(60_000, [1])
    await open(THREE_TIER.id, THREE_TIER.reference)
    await click($("[data-testid='studio-run-traffic']"))
    const { playing } = await import("./boardStore.ts")
    expect(playing(useBoard.getState())).not.toBeNull()
    await click($("[data-testid='studio-node'][data-kind='api'] [aria-label='One more replica']"))
    expect(playing(useBoard.getState())).toBeNull()
  })

  it("every piece prints a labelled readout, and a single point of failure wears a badge live", async () => {
    careerAt(60_000, [1])
    useGame.getState().askInterviewer(THREE_TIER.id, "traffic")
    await open(THREE_TIER.id, THREE_TIER.reference)
    const note = (id: string) => $(`[data-node='${id}'] [data-testid='studio-node-note']`)?.textContent
    expect(note("api")).toBe("API: 600 of 1,500 rps")
    expect(note("db")).toMatch(/^SQL: 120 writes\/s of 300/)
    expect($$("[data-testid='studio-spof']").map((badge) => badge.closest<HTMLElement>("[data-node]")?.dataset.node).sort()).toEqual(["db", "lb"])
    expect($("[data-node='api'] [data-testid='studio-node-plan']")?.textContent).toContain("reads try Redish and PostgreSloth")
    // Nothing about the budget or the verdict leaks onto a node.
    expect($$("[data-testid='studio-node']").map((n) => n.textContent).join(" ")).not.toMatch(/\$800|budget|pass|fail/i)
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
    // The request mix is an answer the player has to ask for, so the warning names the writes only once it was.
    expect(warning?.textContent).not.toContain("writes")
    await act(async () => {
      useGame.getState().askInterviewer(SHORTENER.id, "mix")
    })
    expect($("[data-testid='studio-unrouted']")?.textContent).toContain("writes")
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

  it("opening takes focus off the desk and closing hands it back", async () => {
    careerAt(60_000, [1])
    const desk = document.createElement("div")
    desk.id = "root"
    const opener = document.createElement("button")
    desk.append(opener)
    document.body.append(desk)
    opener.focus()
    await open(THREE_TIER.id)
    expect($("[data-testid='studio']")?.contains(document.activeElement)).toBe(true)
    expect(desk.hasAttribute("inert")).toBe(true)
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    })
    expect(desk.hasAttribute("inert")).toBe(false)
    expect(document.activeElement).toBe(opener)
  })
})

describe("questions, nudges, hints and the offer letter", () => {
  const HELLO = interview("hello-server")
  const atHello = () => careerAt(40_000, [])
  const text = (selector: string) => $(selector)?.textContent ?? ""
  const targetLines = () => $$("[data-testid='studio-live-meter'] .studio-meter-target").map((el) => el.textContent)
  const bars = () => $$("[data-testid='studio-live-meter'] .studio-meter-bar").length

  it("a new interview shows only the opener, blank notes, no target line and no budget", async () => {
    atHello()
    await open(HELLO.id)
    expect(text("[data-testid='studio-brief']")).toBe("Any questions before you start?")
    const notes = $$("[data-testid='studio-note']")
    expect(notes.map((note) => note.dataset.asked)).toEqual(Array(notes.length).fill("false"))
    expect(notes.every((note) => note.classList.contains("is-blank"))).toBe(true)
    expect(targetLines()).toEqual([])
    expect(bars()).toBe(0)
    expect($("[data-testid='studio-live-readout'] [data-line='requests']")).toBeNull()
    // Every number a question would give is absent from the page.
    const page = document.body.textContent ?? ""
    for (const secret of ["$500", "100 ms", "200 requests", "80% reads"]) expect(page).not.toContain(secret)
    expect(text("[data-testid='studio-live-meter'][data-meter='Money']")).toMatch(/^Money\$\d+\/mo$/)
  })

  it("asking fills the note and draws the matching target line, and only that one", async () => {
    atHello()
    await open(HELLO.id)
    await click($("[data-testid='studio-question'][data-question='speed']"))
    const note = $("[data-testid='studio-note'][data-question='speed']")
    expect(note?.dataset.asked).toBe("true")
    expect(note?.textContent).toContain("within 100 ms")
    expect(targetLines()).toEqual(["99% within 100 ms"])
    expect($("[data-testid='studio-question'][data-question='speed']")?.hasAttribute("disabled")).toBe(true)
    await click($("[data-testid='studio-question'][data-question='budget']"))
    expect(targetLines()).toEqual(["budget $500", "99% within 100 ms"])
    expect(useGame.getState().interviews[HELLO.id]?.asked).toEqual(["speed", "budget"])
  })

  it("a nudge lands as a note and costs nothing", async () => {
    atHello()
    await open(HELLO.id)
    const xp = useGame.getState().xp
    await click($("[data-testid='studio-nudge'][data-target='budget']"))
    expect($("[data-testid='studio-nudge-note']")?.textContent).toContain(HELLO.nudges.budget)
    expect(useGame.getState().xp).toBe(xp)
    expect(useGame.getState().interviews[HELLO.id]?.offer).toBeUndefined()
  })

  it("the hint button reads its cost first, and a hint lands as a note and drops the pass to the bottom of the band", async () => {
    atHello()
    await open(HELLO.id)
    const button = $("[data-testid='studio-hint']")
    expect(button?.textContent).toBe("Drops the offer to the bottom of the bandTake a hint")
    await click(button)
    expect($("[data-testid='studio-hint-note']")?.textContent).toContain("Add an API server")
    expect($("[data-testid='studio-hint-cost']")?.textContent).toBe("Already down-leveled, no further drop")
    // The same board gets the same hint, which is already taken.
    expect($("[data-testid='studio-hint']")?.hasAttribute("disabled")).toBe(true)
  })

  it("a Strong hire with no hints shows the offer letter with its bonus, and the money lands", async () => {
    atHello()
    const money = useGame.getState().money
    await open(HELLO.id, HELLO.strongHire)
    await submitAndSkip()
    expect($("[data-testid='studio-offer']")?.dataset.band).toBe("top")
    expect(text("[data-testid='studio-offer-band']")).toBe("Top of the band")
    expect(text("[data-testid='studio-offer-bonus']")).toBe("Signing bonus $14,400")
    expect(useGame.getState().money).toBe(money + 14_400)
    expect(text("[data-testid='studio-run-passbar']")).toBe(HELLO.passBar)
  })

  it("a pass after a hint reads bottom, down-leveled, with no bonus", async () => {
    atHello()
    useGame.getState().takeHint(HELLO.id, { nodes: [{ id: "users", kind: "users", replicas: 1 }], edges: [] })
    await open(HELLO.id, HELLO.strongHire)
    await submitAndSkip()
    expect($("[data-testid='studio-offer']")?.dataset.band).toBe("bottom")
    expect(text("[data-testid='studio-offer-band']")).toContain("down-leveled")
    expect($("[data-testid='studio-offer-bonus']")).toBeNull()
  })

  it("a No hire reveals the missed requirement, keeps earlier answers and names no target it was not told", async () => {
    atHello()
    useGame.getState().askInterviewer(HELLO.id, "traffic")
    await open(HELLO.id, NAIVE(HELLO.id, "Just the API, no database"))
    await submitAndSkip()
    expect($("[data-testid='studio-verdict']")?.dataset.verdict).toBe("noHire")
    expect($("[data-testid='studio-offer']")).toBeNull()
    expect($("[data-testid='studio-run-passbar']")).toBeNull()
    const asked = $$("[data-testid='studio-note'][data-asked='true']").map((note) => note.dataset.question)
    expect(asked).toEqual(["traffic", "features", "speed", "uptime"])
    // The budget was never asked and never missed: no target line for it, in the live panel or the report.
    expect(document.body.textContent).not.toContain("budget $500")
  })

  it("practice after the pass shows every target and leaves the offer alone", async () => {
    atHello()
    await open(HELLO.id, HELLO.strongHire)
    await submitAndSkip()
    const offer = useGame.getState().interviews[HELLO.id]?.offer
    expect(text("[data-testid='studio-passbar']")).toBe(HELLO.passBar)
    expect(targetLines().every((line) => line.length > 0)).toBe(true)
    await click($("[data-testid='studio-submit']"))
    expect(useGame.getState().interviews[HELLO.id]?.offer).toBe(offer)
    expect($("[data-testid='studio-offer']")).toBeNull()
    expect($("[data-testid='studio-hint']")).toBeNull()
  })
})
