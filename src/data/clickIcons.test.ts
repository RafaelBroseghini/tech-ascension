import { describe, expect, it } from "vitest"
import { CLICK_ICONS, GEAR_ICONS, GIG_ICONS, iconPool, JOB_ICONS, pickClickIcon, SKILL_ICONS } from "./clickIcons.ts"
import type { IconName } from "./clickIcons.ts"

const none = { skills: {}, equipment: {}, jobs: [] as number[], gigs: [] as number[] }

describe("click icon pool", () => {
  it("maps about 22 skills and only real developer-icons", () => {
    expect(Object.keys(SKILL_ICONS).length).toBeGreaterThanOrEqual(20)
    expect(Object.keys(SKILL_ICONS).length).toBeLessThanOrEqual(26)
    const names = new Set<IconName>()
    for (const table of [SKILL_ICONS, GEAR_ICONS, GIG_ICONS, JOB_ICONS]) {
      for (const icons of Object.values(table)) for (const name of icons) names.add(name)
    }
    for (const name of names) expect(CLICK_ICONS[name]).toEqual(expect.any(Function))
  })

  it("skips soft skills and unowned rows", () => {
    expect(iconPool(none)).toEqual([])
    expect(iconPool({ ...none, skills: { "1": 1, "7": 1, "8": 1, "20": 1, "36": 1, "40": 1, "41": 1 } })).toEqual([])
    expect(SKILL_ICONS[8]).toBeUndefined()
    expect(SKILL_ICONS[40]).toBeUndefined()
    expect(iconPool({ ...none, skills: { "9": 0, "16": 1 } })).toEqual(["React"])
    expect(iconPool({ ...none, equipment: { "1": 1 } })).toEqual([])
  })

  it("builds one pool from every owned mapped row and picks inside it", () => {
    const early = iconPool({ ...none, skills: { "9": 1 } })
    expect(early).toEqual(["Git", "GitHubLight"])
    const later = iconPool({
      skills: { "9": 1, "16": 1 },
      equipment: { "4": 1 },
      gigs: [4],
      jobs: [11],
    })
    expect(later).toEqual(["Git", "GitHubLight", "React", "Linux", "Upwork", "React", "TypeScript", "CSS3"])
    expect(later.length).toBeGreaterThan(early.length)
    expect(pickClickIcon(later, () => 0)).toBe("Git")
    expect(pickClickIcon(later, () => 0.99)).toBe("CSS3")
    expect(pickClickIcon([], () => 0.5)).toBeNull()
  })
})
