import { describe, expect, it } from "vitest"
import { CAPITAL } from "./capital.ts"
import { GEAR } from "./gear.ts"
import { GIGS, JOB_TIERS, SKILL_TIERS } from "./phases.ts"
import { isTag, TAGS } from "./tags.ts"

const CATALOGS = [
  ["skills", SKILL_TIERS],
  ["gigs", GIGS],
  ["jobs", JOB_TIERS],
  ["gear", GEAR],
  ["capital", CAPITAL],
] as const

describe("tags", () => {
  it("lists each tag once", () => {
    expect(new Set(TAGS.map((row) => row.id)).size).toBe(TAGS.length)
  })

  for (const [name, rows] of CATALOGS) {
    it(`${name}: every row has one to three known tags, none twice`, () => {
      for (const row of rows) {
        expect(row.tags.length, `${name} ${row.id} ${row.name}`).toBeGreaterThanOrEqual(1)
        expect(row.tags.length, `${name} ${row.id} ${row.name}`).toBeLessThanOrEqual(3)
        expect(new Set(row.tags).size, `${name} ${row.id}`).toBe(row.tags.length)
        for (const tag of row.tags) expect(isTag(tag), `${name} ${row.id}: ${tag}`).toBe(true)
      }
    })
  }

  it("every tag is carried by something in every catalog that can be climbed", () => {
    const all = [...SKILL_TIERS, ...GEAR, ...GIGS]
    for (const { id } of TAGS) expect(all.some((row) => row.tags.includes(id)), id).toBe(true)
  })
})
