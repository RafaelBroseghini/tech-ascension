import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { CLICK_ICONS, GEAR_ICONS, GIG_ICONS, iconPool, JOB_ICONS, pickClickIcon, SKILL_ICONS } from "./clickIcons.ts"
import type { IconName } from "./clickIcons.ts"

const none = { skills: {}, equipment: {}, jobs: [] as number[], gigs: [] as number[] }

describe("click icon pool", () => {
  it("maps 61 skills onto icon components, with LinkedOut on skill 27", () => {
    expect(Object.keys(SKILL_ICONS)).toHaveLength(61)
    expect(SKILL_ICONS[27]).toEqual(["LinkedOut"])
    expect("LinkedIn" in CLICK_ICONS).toBe(false)
    const mark = renderToStaticMarkup(createElement(CLICK_ICONS.LinkedOut, { size: 24 }))
    expect(mark).toContain("LinkedOut")
    expect(mark.toLowerCase()).not.toContain("linkedin")
    expect(mark).toContain("#0B5CAB")
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
    for (const id of [89, 90, 91, 92, 93, 94, 98, 102, 103, 104, 105]) expect(SKILL_ICONS[id]).toBeUndefined()
    expect(iconPool({ ...none, skills: { "9": 0, "16": 1 } })).toEqual(["React"])
    expect(iconPool({ ...none, skills: { "27": 1 } })).toEqual(["LinkedOut"])
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
