import { beforeEach, describe, expect, it, vi } from "vitest"
import { IDE_PACKS, itemsOf, packForTier, packsInEra, previewPackForEra } from "../data/idePacks.ts"
import type { DeckPack, FilePack, InboxPack } from "../data/idePacks.ts"
import { TIERS } from "../data/tiers.ts"
import { ideView, PREVIEW_HOLD_MS } from "./ide.ts"
import type { IdeSelection } from "./ide.ts"
import { useGame } from "./store.ts"

vi.hoisted(() => {
  const store = new Map<string, string>()
  Object.assign(globalThis, {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
  })
})

const filePack = (id: string) => IDE_PACKS.find((pack) => pack.id === id && pack.kind === "files") as FilePack
const names = (pack: FilePack) => pack.files.map((file) => file.path)

describe("IDE content v2", () => {
  it("keeps early as single-file buffers", () => {
    const early = packsInEra("early")
    expect(early.map((pack) => pack.id)).toEqual(["fizzbuzz", "two_sum", "reverse_list"])
    for (const pack of early) {
      expect(pack.kind).toBe("files")
      expect((pack as FilePack).files).toHaveLength(1)
    }
  })

  it("ships the mid and upper multi-file packs from the brief", () => {
    expect(names(filePack("debounce"))).toEqual(["src/debounce.ts", "src/debounce.test.ts", "README.md"])
    expect(names(filePack("workers"))).toEqual(["main.go", "worker.go", "go.mod"])
    expect(names(filePack("search"))).toEqual(["BinarySearch.java", "BinarySearchTest.java"])
    expect(names(filePack("finetune"))).toEqual(["train.py", "data.py", "config.yaml"])
    expect(names(filePack("ratelimit"))).toEqual(["tokenBucket.ts", "middleware.ts", "types.ts"])
    expect(names(filePack("lru"))).toEqual(["lib.rs", "list.rs", "Cargo.toml"])
    expect(names(filePack("attention"))).toEqual(["attention.py", "softmax.py", "test_attention.py"])
    expect(packsInEra("mid").map((pack) => pack.id)).toEqual(["debounce", "search", "workers", "finetune"])
    expect(packsInEra("upper").map((pack) => pack.id)).toEqual(["ratelimit", "lru", "attention"])
    for (const pack of [...packsInEra("mid"), ...packsInEra("upper")]) {
      expect((pack as FilePack).files.length).toBeGreaterThanOrEqual(2)
      for (const file of (pack as FilePack).files) {
        expect(file.code.split("\n").length).toBeLessThanOrEqual(18)
        expect(file.code.trim()).not.toBe("")
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
    ])
    expect(q3[1]?.emails.map((mail) => [mail.from, mail.subject])).toEqual([
      ["evals@", "SWE-bench delta \u22120.4"],
      ["safety@", "Red-team notes"],
      ["board-assistant@", "Deck due Friday"],
    ])
    expect(q3[0]?.emails[0]?.body).toBe("Lot #4421 dropped 4.2% vs baseline. Holding tape-out. Need your sign-off on reticle check.")
    expect(q3[0]?.emails[1]?.body).toBe("Reminder: any model weight transfer >X params needs license review before Friday cut.")
    expect(q3[0]?.emails[2]?.body).toBe("Auto-killed training job `fm-sft-92`. Free 2 nodes or reduce batch.")
    for (const pack of q3) for (const mail of pack.emails) expect(mail.body.length).toBeGreaterThan(20)
  })

  it("makes the end era two slide decks with the briefed slides", () => {
    const end = packsInEra("end") as DeckPack[]
    expect(end.map((pack) => pack.kind)).toEqual(["deck", "deck"])
    expect(end[0]?.slides.map((slide) => slide.title)).toEqual(["Edge inference SLA", "Sync delay budget", "Failover map"])
    expect(end[1]?.slides.map((slide) => slide.title)).toEqual(["Habitat power", "GPU shed policy", "Dust storm runbook"])
    expect(end[0]?.slides[0]?.bullets).toEqual(["p99 < 80ms", "regional failover", "cache embeddings at PoP"])
    expect(end[1]?.slides[0]?.bullets).toEqual(["solar + micro-reactor", "shed nonessential at <90%", "spin GPUs at >120%"])
    for (const pack of end) for (const slide of pack.slides) expect(slide.bullets.length).toBeGreaterThanOrEqual(3)
  })

  it("keys every tier to a pack inside the tier's era, never going backwards", () => {
    let last = 0
    const order = IDE_PACKS.map((pack) => pack.id)
    for (const tier of TIERS) {
      const pack = packForTier(tier.id)
      expect(pack.era).toBe(tier.era)
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
    expect(itemsOf(filePack("debounce")).map((item) => item.label)).toEqual(["debounce.ts", "debounce.test.ts", "README.md"])
    expect(itemsOf(packsInEra("q3")[0] as InboxPack)).toHaveLength(3)
    expect(itemsOf(packsInEra("end")[1] as DeckPack).map((item) => item.detail)).toEqual(["1", "2", "3"])
  })
})

describe("IDE era preview", () => {
  const base = { skills: {}, owned: { "20": 1 }, jobs: [], gigs: [] }
  const sel = (packId: string, index: number): IdeSelection => ({ packId, index })

  it("rests on the owned pack and previews another era's first pack", () => {
    const rest = ideView({ ...base, ideSel: sel("", 0), previewEra: null })
    expect(rest).toMatchObject({ previewing: false, index: 0 })
    expect(rest.pack.id).toBe("debounce")
    expect(rest.restPack.id).toBe(rest.pack.id)

    const preview = ideView({ ...base, ideSel: sel("", 0), previewEra: "q3" })
    expect(preview.previewing).toBe(true)
    expect(preview.pack.id).toBe(previewPackForEra("q3").id)
    expect(preview.pack.kind).toBe("inbox")
    expect(preview.restPack.id).toBe("debounce")
  })

  it("treats previewing the owned era as no preview", () => {
    expect(ideView({ ...base, ideSel: sel("", 0), previewEra: "mid" }).previewing).toBe(false)
  })

  it("clamps a stale selection and resets it when the pack changes", () => {
    expect(ideView({ ...base, ideSel: sel("debounce", 2), previewEra: null }).index).toBe(2)
    expect(ideView({ ...base, ideSel: sel("debounce", 99), previewEra: null }).index).toBe(2)
    expect(ideView({ ...base, ideSel: sel("debounce", -4), previewEra: null }).index).toBe(0)
    expect(ideView({ ...base, ideSel: sel("search", 1), previewEra: null }).index).toBe(0)
  })
})

describe("IDE navigation and snap-back in the store", () => {
  beforeEach(() => useGame.getState().wipe())
  const game = () => useGame.getState()

  it("selects files and keeps the choice per pack", () => {
    useGame.setState({ owned: { "20": 1 } })
    game().selectIde("debounce", 1)
    expect(ideView(game()).index).toBe(1)
    useGame.setState({ owned: { "24": 1 } })
    expect(ideView(game()).pack.id).toBe("search")
    expect(ideView(game()).index).toBe(0)
  })

  it("shows the browsed era until the hold lapses, then snaps back to the owned pack", () => {
    useGame.setState({ owned: { "20": 1 } })
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
    useGame.setState({ owned: { "20": 1 } })
    game().setPreviewEra("q3")
    const first = game().previewUntil
    useGame.setState({ previewUntil: first - 10_000 })
    game().holdPreview()
    expect(game().previewUntil).toBeGreaterThan(first - 10_000)
    useGame.setState({ previewUntil: first - 10_000 })
    game().selectIde(ideView(game()).pack.id, 1)
    expect(game().previewUntil).toBeGreaterThan(first - 10_000)
    game().setPreviewEra(null)
    expect(game().previewUntil).toBe(0)
    game().holdPreview()
    expect(game().previewUntil).toBe(0)
  })

  it("buying into a new era ends the preview, buying inside the owned era keeps it", () => {
    useGame.setState({ money: 1e15, peakMoney: 1e15, gigs: [1], owned: { "26": 1 } })
    game().setPreviewEra("upper")
    game().buy(27, "one")
    expect(game().previewEra).toBe("upper")
    game().buy(34, "one")
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
