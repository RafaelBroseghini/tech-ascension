import { beforeEach, describe, expect, it } from "vitest"
import { IDE_PACKS, itemsOf, packForTier, packsInEra, previewPackForEra } from "../data/idePacks.ts"
import type { DeckPack, FilePack, InboxPack } from "../data/idePacks.ts"
import { MAX_IDE_TABS, visibleTabCount } from "../data/ideProblems.ts"
import { maxLinesForFile } from "../data/ideScriptStyle.ts"
import { PROBLEM_POOLS } from "../data/ideProblemPools.ts"
import { CAPITAL } from "../data/capital.ts"
import { ideView, PREVIEW_HOLD_MS } from "./ide.ts"
import type { IdeSelection } from "./ide.ts"
import { useGame } from "./store.ts"

describe("IDE content v2", () => {
  it("keeps early bands on LeetCode-style pools that grow toward 20 tabs", () => {
    const early = packsInEra("early")
    expect(early.map((pack) => pack.id)).toEqual(["fizzbuzz", "two_sum", "reverse_list"])
    expect(packForTier(0).files.map((f) => f.path)).toEqual(["hello.py"])
    expect(packForTier(6).files.length).toBeGreaterThan(1)
    expect(packForTier(12).files[0]?.path).toBe("two_sum.py")
    expect(packForTier(18).files.some((f) => f.path === "reverse_list.py")).toBe(true)
  })

  it("resolves mid and upper packs from problem pools with short snippets", () => {
    expect(packForTier(33).files[0]?.path).toBe("train.py")
    expect(packForTier(19).files.some((f) => f.path === "debounce.py")).toBe(true)
    expect(packForTier(23).files[0]?.path).toBe("binary_search.py")
    for (const meta of IDE_PACKS) {
      if (meta.kind !== "files") continue
      const next = IDE_PACKS.find((p) => p.fromTier > meta.fromTier)
      const endArt = (next?.fromTier ?? 67) - 1
      const pack = packForTier(endArt) as FilePack
      if (pack.id !== meta.id) continue
      expect(pack.files.length).toBeLessThanOrEqual(MAX_IDE_TABS)
      expect(pack.files.length).toBe(Math.min(PROBLEM_POOLS[meta.id]?.length ?? 0, MAX_IDE_TABS))
      for (const file of pack.files) {
        expect(file.lang).toBe("python")
        expect(file.code.split("\n").length).toBeLessThanOrEqual(maxLinesForFile(meta.id, file.path))
        expect(file.code.trim()).not.toBe("")
        expect(file.code).toMatch(/^# .+\n# .+\n# .+\n# docs: https:\/\//m)
      }
    }
  })

  it("makes q3 two email inboxes with the briefed senders and subjects", () => {
    const q3 = packsInEra("q3") as InboxPack[]
    expect(q3.map((pack) => pack.kind)).toEqual(["inbox", "inbox"])
    expect(q3[0]?.emails.map((mail) => [mail.from, mail.subject])).toEqual([
      ["foundry-ops@", "Yield excursion lot #4421"],
      ["legal@", "Export control checklist"],
      ["cluster-bot@", "CUDA OOM on node gpu-17"],
      ["mgr@", "RE: RE: PTO 12/23–12/27 (approved)"],
      ["gov-affairs@", "BIS questions on lot #4421 tooling"],
      ["facilities@", "Badge expriation tomorow"],
      ["enablement@", "Mandatory: export control refresher (45 min)"],
    ])
    expect(q3[1]?.emails.map((mail) => [mail.from, mail.subject])).toEqual([
      ["evals@", "SWE-bench delta \u22120.4"],
      ["safety@", "Red-team notes"],
      ["board-assistant@", "Deck due Friday"],
      ["leave-system@", "PTO request #88102 — approved"],
      ["policy@", "Senate staff briefing — talking points"],
      ["culture@", "You're invted: resilience circle + snacks"],
      ["procurement@", "Vendor onboarding: DocuSign loop"],
    ])
    for (const pack of q3) for (const mail of pack.emails) expect(mail.body.length).toBeGreaterThan(20)
  })

  it("makes the end era two slide decks with the briefed slides", () => {
    const end = packsInEra("end") as DeckPack[]
    expect(end.map((pack) => pack.kind)).toEqual(["deck", "deck"])
    expect(end[0]?.slides.map((slide) => slide.title)).toEqual(["Edge inference SLA", "Sync delay budget", "Failover map"])
    for (const pack of end) for (const slide of pack.slides) expect(slide.bullets.length).toBeGreaterThanOrEqual(3)
  })

  it("keys every tier to a pack inside the tier's era, never going backwards", () => {
    let last = 0
    const order = IDE_PACKS.map((pack) => pack.id)
    for (const row of CAPITAL) {
      const pack = packForTier(row.artId)
      expect(pack.era).toBe(row.era)
      expect(order.indexOf(pack.id)).toBeGreaterThanOrEqual(last)
      last = order.indexOf(pack.id)
    }
    expect(new Set(Array.from({ length: 67 }, (_, id) => packForTier(id).id)).size).toBe(IDE_PACKS.length)
    expect(packForTier(0).id).toBe("fizzbuzz")
    expect(packForTier(33).id).toBe("finetune")
    expect(packForTier(44).id).toBe("attention")
    expect(packForTier(50).id).toBe("frontier")
    expect(packForTier(66).id).toBe("mars")
  })

  it("lists the items a player can navigate, in tab order", () => {
    const debounce = packForTier(22)
    expect(itemsOf(debounce).map((item) => item.label)).toContain("debounce.py")
    expect(itemsOf(packsInEra("q3")[0] as InboxPack)).toHaveLength(7)
    expect(itemsOf(packsInEra("end")[1] as DeckPack).map((item) => item.detail)).toEqual(["1", "2", "3"])
  })

  it("scales visible tabs from 1 up to 20 within a band", () => {
    expect(visibleTabCount(0, 6, 0, 20)).toBe(1)
    expect(visibleTabCount(0, 6, 6, 20)).toBe(20)
    expect(visibleTabCount(19, 22, 19, 20)).toBe(1)
    expect(visibleTabCount(19, 22, 22, 20)).toBe(20)
  })
})

describe("IDE era preview", () => {
  const base = { skills: {}, owned: {}, jobs: [2], gigs: [] }
  const sel = (packId: string, index: number): IdeSelection => ({ packId, index })

  it("rests on the owned pack and previews another era's first pack", () => {
    const rest = ideView({ ...base, ideSel: sel("", 0), previewEra: null })
    expect(rest).toMatchObject({ previewing: false, index: 0 })
    expect(rest.pack.id).toBe("debounce")
    expect(rest.restPack.id).toBe(rest.pack.id)
    expect(rest.pack.files.length).toBeGreaterThan(2)

    const preview = ideView({ ...base, ideSel: sel("", 0), previewEra: "q3" })
    expect(preview.previewing).toBe(true)
    expect(preview.pack.id).toBe(previewPackForEra("q3").id)
    expect(preview.pack.kind).toBe("inbox")
    expect(preview.restPack.id).toBe("debounce")
  })

  it("treats previewing the owned era as no preview", () => {
    expect(ideView({ ...base, ideSel: sel("", 0), previewEra: "mid" }).previewing).toBe(false)
  })

  it("clamps a stale selection and opens another unlocked folder when selected", () => {
    const pack = ideView({ ...base, ideSel: sel("", 0), previewEra: null }).pack as FilePack
    const last = pack.files.length - 1
    expect(ideView({ ...base, ideSel: sel(pack.id, last), previewEra: null }).index).toBe(last)
    expect(ideView({ ...base, ideSel: sel(pack.id, 99), previewEra: null }).index).toBe(last)
    const withSearch = { ...base, owned: { "1": 1 } }
    expect(ideView({ ...withSearch, ideSel: sel("search", 1), previewEra: null }).pack.id).toBe("search")
    expect(ideView({ ...withSearch, ideSel: sel("search", 1), previewEra: null }).index).toBe(1)
  })
})

describe("IDE explorer folders", () => {
  it("keeps every entered band as a folder and freezes file tabs on older bands", () => {
    const mid = { skills: {}, owned: { "1": 1 }, jobs: [2], gigs: [] }
    const view = ideView({ ...mid, ideSel: { packId: "", index: 0 }, previewEra: null })
    expect(view.folders.map((f) => f.id)).toEqual(["fizzbuzz", "two_sum", "reverse_list", "debounce", "search"])
    const fizz = view.folders.find((f) => f.id === "fizzbuzz")?.pack as FilePack
    const debounce = view.folders.find((f) => f.id === "debounce")?.pack as FilePack
    expect(fizz.files.length).toBeGreaterThan(10)
    expect(debounce.files.some((f) => f.path.includes("debounce"))).toBe(true)
    expect(view.folders.find((f) => f.id === "search")?.pack.files[0]?.path).toBe("binary_search.py")
  })

  it("adds a preview-only folder while browsing an unowned era", () => {
    const mid = { skills: {}, owned: {}, jobs: [2], gigs: [] }
    const preview = ideView({ ...mid, ideSel: { packId: "", index: 0 }, previewEra: "q3" })
    expect(preview.folders.some((f) => f.id === "fab" && f.previewOnly)).toBe(true)
    expect(preview.pack.id).toBe("fab")
  })
})

describe("IDE navigation and snap-back in the store", () => {
  beforeEach(() => useGame.getState().wipe())
  const game = () => useGame.getState()

  it("selects files and keeps the choice per pack across band changes", () => {
    useGame.setState({ jobs: [2], owned: {} })
    game().selectIde("debounce", 1)
    expect(ideView(game()).index).toBe(1)
    useGame.setState({ owned: { "1": 1 } })
    expect(ideView(game()).restPack.id).toBe("search")
    expect(ideView(game()).pack.id).toBe("debounce")
    expect(ideView(game()).index).toBe(1)
    game().selectIde("search", 0)
    expect(ideView(game()).pack.id).toBe("search")
  })

  it("shows the browsed era until the hold lapses, then snaps back to the owned pack", () => {
    useGame.setState({ jobs: [2], owned: {} })
    game().setPreviewEra("end")
    expect(ideView(game()).previewing).toBe(true)
    expect(ideView(game()).pack.kind).toBe("deck")

    game().tick(game().now + PREVIEW_HOLD_MS - 5_000)
    expect(game().previewEra).toBe("end")
    game().tick(game().now + PREVIEW_HOLD_MS)
    expect(game().previewEra).toBeNull()
    expect(ideView(game()).pack.id).toBe("debounce")
  })

  it("interacting with the IDE or the shop extends the hold", () => {
    useGame.setState({ jobs: [2], owned: {} })
    game().setPreviewEra("q3")
    const first = game().previewUntil
    useGame.setState({ previewUntil: first - 10_000 })
    game().holdPreview()
    expect(game().previewUntil).toBeGreaterThan(first - 10_000)
    game().setPreviewEra(null)
  })

  it("buying into a new era ends the preview, buying inside the owned era keeps it", () => {
    useGame.setState({ money: 1e15, peakMoney: 1e15, gigs: [1], owned: { "1": 1 } })
    game().setPreviewEra("upper")
    game().buy(2, "one")
    expect(game().previewEra).toBe("upper")
    game().buy(6, "one")
    expect(game().previewEra).toBeNull()
  })

  it("wipe clears the preview and selection", () => {
    game().setPreviewEra("end")
    game().selectIde("mars", 2)
    game().wipe()
    expect(game().previewEra).toBeNull()
    expect(game().ideSel).toEqual({ packId: "", index: 0 })
  })
})
