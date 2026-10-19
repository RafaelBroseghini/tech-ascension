import { describe, expect, it } from "vitest"
import { CLICK_ICONS, GEAR_ICONS, GIG_ICONS, iconPool, JOB_ICONS, pickClickIcon, SKILL_ICONS } from "./clickIcons.ts"
import type { IconName } from "./clickIcons.ts"

const none = { skills: {}, equipment: {}, jobs: [] as number[], gigs: [] as number[] }

describe("click icon pool", () => {
  it("maps skills onto icon components and never ships a LinkedIn mark", () => {
    expect(Object.keys(SKILL_ICONS)).toHaveLength(59)
    expect(SKILL_ICONS[67]).toEqual(["AWS"])
    expect("LinkedIn" in CLICK_ICONS).toBe(false)
    const names = new Set<IconName>()
    for (const table of [SKILL_ICONS, GEAR_ICONS, GIG_ICONS, JOB_ICONS]) {
      for (const icons of Object.values(table)) for (const name of icons) names.add(name)
    }
    for (const name of names) expect(CLICK_ICONS[name]).toEqual(expect.any(Function))
  })

  it("skips soft skills and unowned rows", () => {
    expect(iconPool(none)).toEqual([])
    expect(iconPool({ ...none, skills: { "1": 1, "7": 1, "48": 1, "61": 1, "82": 1 } })).toEqual([])
    expect(SKILL_ICONS[9]).toBeUndefined()
    expect(SKILL_ICONS[48]).toBeUndefined()
    for (const id of [48, 61, 64, 79, 81, 86, 88, 104]) expect(SKILL_ICONS[id]).toBeUndefined()
    expect(iconPool({ ...none, skills: { "9": 0, "16": 1 } })).toEqual(["React"])
    expect(iconPool({ ...none, skills: { "67": 1 } })).toEqual(["AWS"])
    expect(iconPool({ ...none, equipment: { "1": 1 } })).toEqual([])
  })

  it("builds one pool from every owned mapped row and picks inside it", () => {
    const early = iconPool({ ...none, skills: { "5": 1 } })
    expect(early).toEqual(["Git", "GitHubLight"])
    const later = iconPool({
      skills: { "5": 1, "16": 1 },
      equipment: { "17": 1 }, // Raspberry Pie lab
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
