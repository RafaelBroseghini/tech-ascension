import { beforeEach, describe, expect, it } from "vitest"
import { freshSave } from "./save.ts"
import {
  createMemoryPort,
  bodyNeedsRewrite,
  judgeCas,
  judgeClaim,
  loadCareerForBoot,
  readCareerText,
  readPref,
  resetLedgerForTests,
  sealImage,
  storedJson,
  stageCareer,
  writeCareer,
  writePref,
} from "./ledger.ts"

async function settled(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

describe("career ledger", () => {
  beforeEach(() => {
    resetLedgerForTests()
  })

  it("lands a missing or lower revision and refuses an equal or higher one", () => {
    expect(judgeCas(null, 1)).toBe("landed")
    expect(judgeCas(39, 40)).toBe("landed")
    expect(judgeCas(40, 40)).toBe("stale")
    expect(judgeCas(41, 40)).toBe("stale")
  })

  it("keeps a desk object and a list, and unwraps a stringified document", async () => {
    const port = createMemoryPort()
    writePref("desk", "{\"music\":true,\"sounds\":false}")
    writePref("shopPanel", "[\"fizzbuzz\",\"search\"]")
    await settled()
    const loaded = await port.load()
    expect(loaded.desk?.body).toEqual({ music: true, sounds: false })
    expect(loaded.shopPanel?.body).toEqual(["fizzbuzz", "search"])
    expect(bodyNeedsRewrite("{\"music\":true}")).toBe(true)
    expect(bodyNeedsRewrite("[\"fizzbuzz\"]")).toBe(true)
    expect(bodyNeedsRewrite("dracula")).toBe(false)
  })

  it("claims only the expected revision, treating a missing row as 0", () => {
    expect(judgeClaim(null, 0)).toBe("claimed")
    expect(judgeClaim(null, 1)).toBe("lost")
    expect(judgeClaim(4, 4)).toBe("claimed")
    expect(judgeClaim(4, 5)).toBe("lost")
  })

  it("failNextCas leaves the previous row and the next put of that revision replaces it", async () => {
    const port = createMemoryPort()
    expect(await port.casPut({ id: "career", rev: 1, body: "one" })).toBe("landed")
    port.failNextCas(1)
    expect(await port.casPut({ id: "career", rev: 2, body: "two" })).toBe("aborted")
    expect((await port.load()).career).toEqual({ id: "career", rev: 1, body: "one" })
    expect(await port.casPut({ id: "career", rev: 2, body: "two" })).toBe("landed")
    expect((await port.load()).career).toEqual({ id: "career", rev: 2, body: "two" })
  })

  it("a stale put leaves the stored row", async () => {
    const port = createMemoryPort()
    await port.casPut({ id: "career", rev: 3, body: "new" })
    expect(await port.casPut({ id: "career", rev: 3, body: "same" })).toBe("stale")
    expect(await port.casPut({ id: "career", rev: 2, body: "old" })).toBe("stale")
    expect((await port.load()).career).toEqual({ id: "career", rev: 3, body: "new" })
  })

  it("a lost claim leaves the stored career", async () => {
    const port = createMemoryPort()
    expect(await port.claimCareer(0, { id: "career", rev: 1, body: "winner" })).toBe("claimed")
    expect(await port.claimCareer(0, { id: "career", rev: 2, body: "loser" })).toBe("lost")
    expect((await port.load()).career).toEqual({ id: "career", rev: 1, body: "winner" })
    expect(await port.claimCareer(1, { id: "career", rev: 2, body: "next" })).toBe("claimed")
    expect((await port.load()).career).toEqual({ id: "career", rev: 2, body: "next" })
  })

  it("hydrates an unsealed image once, and a missing career is a fresh one", () => {
    const firstEmpty = loadCareerForBoot(1_000)
    expect(firstEmpty.save.money).toBe(0)
    expect(firstEmpty.save.savedAt).toBe(1_000)
    expect(firstEmpty.toast).toBeNull()
    expect(JSON.parse(readCareerText() ?? "{}").savedAt).toBe(1_000)

    resetLedgerForTests()
    const past = { ...freshSave(0), money: 50 }
    stageCareer(past)
    const first = loadCareerForBoot(10_000)
    expect(first.save.money).toBe(50)
    expect(first.save.savedAt).toBe(10_000)
    const second = loadCareerForBoot(20_000)
    expect(second.save).toBe(first.save)
    expect(second.save.savedAt).toBe(10_000)
    expect(second.save.money).toBe(50)
  })

  it("writeCareer with no port replaces the image and keeps prefs", () => {
    writePref("desk", "{\"music\":true}")
    const save = { ...freshSave(5), money: 12 }
    writeCareer(save)
    expect(JSON.parse(readCareerText() ?? "{}").money).toBe(12)
    writeCareer({ ...save, money: 40 })
    expect(JSON.parse(readCareerText() ?? "{}").money).toBe(40)
    expect(readPref("desk")).toEqual({ music: true })
  })

  it("stageCareer updates the image and leaves the stored row", async () => {
    const port = createMemoryPort()
    const first = { ...freshSave(1_000), money: 10 }
    writeCareer(first)
    await settled()
    const stored = await port.load()
    expect(stored.career?.rev).toBe(1)
    expect(stored.career?.body).toMatchObject({ money: 10 })

    const staged = { ...freshSave(500), money: 10 }
    stageCareer(staged)
    await settled()
    expect(JSON.parse(readCareerText() ?? "{}")).toMatchObject({ savedAt: 500, money: 10 })
    expect(await port.load()).toEqual(stored)

    writeCareer({ ...freshSave(1_500), money: 11 })
    await settled()
    const next = await port.load()
    expect(next.career?.rev).toBe(2)
    expect(next.career?.body).toMatchObject({ money: 11 })
  })

  it("seeds the career clock from the stored revision instead of starting at 1", async () => {
    const port = createMemoryPort()
    const disk = { ...freshSave(10), money: 7 }
    await port.casPut({ id: "career", rev: 40, body: storedJson(disk) })
    sealImage(disk, null, 40, [{ id: "theme", rev: 3, body: "dracula" }], port)
    expect(readPref("theme")).toBe("dracula")
    writeCareer({ ...freshSave(11), money: 8 })
    await settled()
    const row = (await port.load()).career
    expect(row?.rev).toBe(41)
    expect(row?.body).toMatchObject({ money: 8 })
  })

  it("writes a shop-tab tombstone without clearing the other prefs", async () => {
    const port = createMemoryPort()
    await port.casPut({ id: "career", rev: 4, body: storedJson(freshSave(1)) })
    sealImage(freshSave(1), null, 4, [], port)
    writePref("desk", "room")
    writePref("shopTab", "G")
    await settled()
    writePref("shopTab", null)
    await settled()
    const loaded = await port.load()
    expect(loaded.shopTab).toEqual({ id: "shopTab", rev: 2, body: null })
    expect(loaded.desk).toEqual({ id: "desk", rev: 1, body: "room" })
    expect(readPref("shopTab")).toBeNull()
    expect(readPref("desk")).toBe("room")
    expect(loaded.career?.rev).toBe(4)
  })
})
