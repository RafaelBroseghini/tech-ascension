import { describe, expect, it } from "vitest"
import { jobArtId } from "./art.ts"
import { emojiIdleUrl } from "./emojiAssets.ts"
import { firstJobAtRank, highestJobRank, JOB_TIERS, jobRank, visibleJobs } from "./phases.ts"
import { isSpecId, SPEC_ID_BASE, SPECIALIZATIONS, specById, TRACK_FIRST_RANK, TRACK_LAST_RANK, TRUNK_TOP_RANK } from "./specializations.ts"
import type { SpecId } from "./specializations.ts"
import { isTag } from "./tags.ts"

const SHARED_TOP_RANK = 31
const trackOf = (spec: SpecId) => JOB_TIERS.filter((job) => job.spec === spec)

describe("job ranks", () => {
  it("gives every job an integer rank of at least 1", () => {
    for (const job of JOB_TIERS) {
      expect(Number.isInteger(job.rank)).toBe(true)
      expect(job.rank).toBeGreaterThanOrEqual(1)
    }
  })

  it("keeps rank equal to id for ids 1 to 31, and to id mod 100 for a track row", () => {
    for (const job of JOB_TIERS) expect(job.rank).toBe(job.id <= SHARED_TOP_RANK ? job.id : job.id % 100)
  })

  it("never lowers a rank down the trunk, the shared rows or any one track", () => {
    for (const spec of SPECIALIZATIONS) {
      const rows = visibleJobs(spec.id)
      for (let i = 1; i < rows.length; i++) expect(rows[i]!.rank).toBeGreaterThanOrEqual(rows[i - 1]!.rank)
    }
  })

  it("reads a rank from an id, and 0 for an id that is no job", () => {
    expect(jobRank(14)).toBe(14)
    expect(jobRank(114)).toBe(14)
    expect(jobRank(509)).toBe(9)
    expect(jobRank(0)).toBe(0)
    expect(jobRank(999)).toBe(0)
  })

  it("finds the highest rank held", () => {
    expect(highestJobRank([])).toBe(0)
    expect(highestJobRank([1])).toBe(1)
    expect(highestJobRank([14, 2, 7])).toBe(14)
    expect(highestJobRank([3, 999])).toBe(3)
    expect(highestJobRank([3, 312, 9])).toBe(12)
  })

  it("finds the first job at a rank", () => {
    expect(firstJobAtRank(14)?.name).toBe("Senior SWE")
    expect(firstJobAtRank(14)?.id).toBe(14)
    expect(firstJobAtRank(0)).toBeUndefined()
  })
})

describe("specializations", () => {
  it("lists six, each with a known tag, a style, a blurb and its own id range", () => {
    expect(SPECIALIZATIONS.map((row) => row.id)).toEqual(["frontend", "backend", "infra", "ai", "fde", "security"])
    expect(SPECIALIZATIONS.map((row) => row.style)).toEqual(["click", "balanced", "idle", "idle", "click", "balanced"])
    expect(SPECIALIZATIONS.map((row) => row.tag)).toEqual(["frontend", "backend", "infra", "ai", "product", "security"])
    for (const row of SPECIALIZATIONS) {
      expect(isTag(row.tag)).toBe(true)
      expect(row.blurb.length).toBeGreaterThan(10)
      expect(isSpecId(row.id)).toBe(true)
      expect(specById(row.id)).toBe(row)
    }
    expect(isSpecId("wizard")).toBe(false)
    expect(isSpecId(null)).toBe(false)
  })

  it("gives each a track of eight rows, one per rank 8 to 15, at 100 * k + rank (backend keeps 8 to 15)", () => {
    for (const spec of SPECIALIZATIONS) {
      const track = trackOf(spec.id)
      expect(track.map((job) => job.rank)).toEqual([8, 9, 10, 11, 12, 13, 14, 15])
      expect(track.map((job) => job.id)).toEqual([8, 9, 10, 11, 12, 13, 14, 15].map((rank) => SPEC_ID_BASE[spec.id] + rank))
    }
    expect(TRACK_FIRST_RANK).toBe(8)
    expect(TRACK_LAST_RANK).toBe(15)
    expect(trackOf("frontend").map((job) => job.id)).toEqual([108, 109, 110, 111, 112, 113, 114, 115])
    expect(trackOf("security").map((job) => job.id)).toEqual([508, 509, 510, 511, 512, 513, 514, 515])
  })

  it("keeps the trunk (ranks 1 to 7) and the shared rows (16 to 31) out of every track", () => {
    for (const job of JOB_TIERS) {
      const inTrack = job.rank >= TRACK_FIRST_RANK && job.rank <= TRACK_LAST_RANK
      expect(job.spec !== undefined).toBe(inTrack)
    }
    expect(JOB_TIERS).toHaveLength(31 + 5 * 8)
  })

  it("paces every track exactly like the backend row at its rank", () => {
    for (const spec of SPECIALIZATIONS) {
      for (const job of trackOf(spec.id)) {
        const base = JOB_TIERS.find((row) => row.id === job.rank)!
        expect(job.xpReq).toBe(base.xpReq)
        expect(job.xpCost).toBe(base.xpCost)
        expect(job.cps).toBe(base.cps)
        expect(job.clickBonus).toBe(base.clickBonus)
        expect(job.clickPct).toBe(base.clickPct)
        expect(job.xpPerSec).toBe(base.xpPerSec)
        expect(job.xpLump).toBe(base.xpLump)
      }
    }
  })

  it("tags every row, and every row of the other tracks carries the specialization's tag", () => {
    for (const spec of SPECIALIZATIONS) {
      for (const job of trackOf(spec.id)) {
        expect(job.tags.length).toBeGreaterThan(0)
        for (const tag of job.tags) expect(isTag(tag)).toBe(true)
        if (spec.id !== "backend") expect(job.tags).toContain(spec.tag)
      }
    }
    // Backend keeps its old generalist rows (Feature owner, the tech lead, the senior seats), so its tag sits on the four in between.
    for (const id of [9, 10, 11, 12]) expect(JOB_TIERS.find((job) => job.id === id)?.tags).toContain("backend")
  })

  it("reads as Senior at rank 14 in every track, and names every row differently", () => {
    for (const spec of SPECIALIZATIONS) {
      const senior = trackOf(spec.id).find((job) => job.rank === 14)!
      expect(senior.name).toMatch(/^Senior\b/)
    }
    const names = JOB_TIERS.map((job) => job.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it("gives a track row the art of the backend row at its rank", () => {
    for (const job of JOB_TIERS) {
      expect(jobArtId(job.id)).toBe(jobArtId(job.rank))
      expect(emojiIdleUrl("job", job.id)).toBe(emojiIdleUrl("job", job.rank))
      expect(emojiIdleUrl("job", job.id)).toBeTruthy()
    }
  })
})

describe("visible jobs", () => {
  it("shows the trunk, the career's track and the shared rows, in rank order", () => {
    for (const spec of SPECIALIZATIONS) {
      const rows = visibleJobs(spec.id)
      expect(rows).toHaveLength(31)
      expect(rows.map((job) => job.rank)).toEqual(Array.from({ length: 31 }, (_, index) => index + 1))
      for (const job of rows) expect(job.spec === undefined || job.spec === spec.id).toBe(true)
    }
    expect(visibleJobs("backend").map((job) => job.id)).toEqual(Array.from({ length: 31 }, (_, index) => index + 1))
    expect(visibleJobs("frontend").filter((job) => job.spec).map((job) => job.id)).toEqual([108, 109, 110, 111, 112, 113, 114, 115])
  })

  it("shows only the trunk and the shared rows before a pick", () => {
    const rows = visibleJobs(null)
    expect(rows.map((job) => job.rank)).toEqual([...Array.from({ length: TRUNK_TOP_RANK }, (_, index) => index + 1), ...Array.from({ length: 16 }, (_, index) => index + 16)])
    expect(rows.every((job) => job.spec === undefined)).toBe(true)
  })
})
