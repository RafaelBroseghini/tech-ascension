import { describe, expect, it } from "vitest"
import { firstJobAtRank, highestJobRank, JOB_TIERS, jobRank } from "./phases.ts"

describe("job ranks", () => {
  it("gives every job an integer rank of at least 1", () => {
    for (const job of JOB_TIERS) {
      expect(Number.isInteger(job.rank)).toBe(true)
      expect(job.rank).toBeGreaterThanOrEqual(1)
    }
  })

  it("keeps rank equal to id while the ladder has no specialization rows", () => {
    for (const job of JOB_TIERS) expect(job.rank).toBe(job.id)
  })

  it("never lowers a rank down the table", () => {
    for (let i = 1; i < JOB_TIERS.length; i++) expect(JOB_TIERS[i]!.rank).toBeGreaterThanOrEqual(JOB_TIERS[i - 1]!.rank)
  })

  it("reads a rank from an id, and 0 for an id that is no job", () => {
    expect(jobRank(14)).toBe(14)
    expect(jobRank(0)).toBe(0)
    expect(jobRank(999)).toBe(0)
  })

  it("finds the highest rank held", () => {
    expect(highestJobRank([])).toBe(0)
    expect(highestJobRank([1])).toBe(1)
    expect(highestJobRank([14, 2, 7])).toBe(14)
    expect(highestJobRank([3, 999])).toBe(3)
  })

  it("finds the first job at a rank", () => {
    expect(firstJobAtRank(14)?.name).toBe("Senior SWE")
    expect(firstJobAtRank(0)).toBeUndefined()
  })
})
