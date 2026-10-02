import { describe, expect, it } from "vitest"
import { JOB_TIERS } from "../data/phases.ts"
import { resumeMarks } from "./resume.ts"
import { COMPANIES, linkedOutProfile } from "./linkedout.ts"

describe("resume marks", () => {
  const none = { skills: {}, equipment: {}, jobs: [] as number[], gigs: [] as number[] }

  it("lists a sprite for a skill with no logo, and keeps a repeated logo once", () => {
    expect(resumeMarks(none)).toEqual([])
    const marks = resumeMarks({ ...none, skills: { "1": 1, "16": 1 }, jobs: [11] })
    expect(marks.find((mark) => mark.key === "skill:1")?.icon).toBeNull()
    expect(marks.filter((mark) => mark.icon === "React")).toHaveLength(1)
    expect(marks.some((mark) => mark.icon === "TypeScript")).toBe(true)
  })
})

describe("LinkedOut profile", () => {
  it("stays hidden until a gig or a job exists", () => {
    expect(linkedOutProfile({ jobs: [], gigs: [] })).toBeNull()
  })

  it("puts the internship at Byte & Mortar and leaves the door open", () => {
    const profile = linkedOutProfile({ jobs: [1], gigs: [] })
    expect(profile?.headline).toBe("Internship offer at Byte & Mortar")
    expect(profile?.location).toBe("Columbus, OH")
    expect(profile?.openToWork).toBe(true)
    expect(profile?.experience).toHaveLength(1)
    expect(profile?.experience[0]?.roles[0]).toMatchObject({
      title: "Internship offer",
      employment: "Internship",
      present: true,
      endLabel: "Present",
      duration: "4 mos",
      summary: expect.stringContaining("intern"),
    })
  })

  it("groups a stay at one company, newest role first, and closes the door at senior", () => {
    const profile = linkedOutProfile({ jobs: [1, 2, 14], gigs: [] })
    expect(profile?.openToWork).toBe(false)
    expect(profile?.headline).toBe("Senior SWE at Northwind")
    expect(profile?.experience.map((stint) => stint.org)).toEqual(["Northwind", "Byte & Mortar"])
    const shop = profile?.experience[1]
    expect(shop?.roles.map((role) => role.title)).toEqual(["Junior SWE", "Internship offer"])
    expect(shop?.roles[0]?.present).toBe(false)
    expect(shop?.roles[0]?.endLabel).not.toBe("Present")
    expect(profile?.experience[0]?.roles[0]?.present).toBe(true)
  })

  it("lists gigs as side projects, and parks them before the first job", () => {
    const freelance = linkedOutProfile({ jobs: [], gigs: [1, 2] })
    expect(freelance?.headline).toBe("Freelance developer")
    expect(freelance?.projects.map((project) => project.title)).toEqual([
      "Local biz landing page",
      "Fix broken login / blog-engine bug",
    ])
    expect(freelance?.projects[0]?.present).toBe(true)
    expect(freelance?.projects[0]?.org).toBe("Independent")

    const hired = linkedOutProfile({ jobs: [1], gigs: [1] })
    expect(hired?.projects[0]?.present).toBe(false)
    expect(hired?.projects[0]?.endLabel).toBe(hired?.experience[0]?.roles[0]?.startLabel)
  })

  it("sends every job to a fake company", () => {
    for (const job of JOB_TIERS) {
      const profile = linkedOutProfile({ jobs: [job.id], gigs: [] })
      const org = profile?.experience[0]?.org
      expect(org).toBeTruthy()
      expect(Object.values(COMPANIES).some((company) => company.name === org)).toBe(true)
    }
  })
})
