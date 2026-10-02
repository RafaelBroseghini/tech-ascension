import { describe, expect, it } from "vitest"
import { resumeDocument, resumeMarkdown } from "./resumeDoc.ts"

const none = { skills: {}, equipment: {}, jobs: [] as number[], gigs: [] as number[] }

describe("resume document", () => {
  it("stays empty until something is owned", () => {
    expect(resumeDocument(none)).toBeNull()
  })

  it("lists skills and tools before any job", () => {
    const doc = resumeDocument({ ...none, skills: { "1": 1 }, equipment: { "1": 1 } })
    expect(doc?.headline).toBe("Self-taught")
    expect(doc?.skills).toEqual(["Used laptop"])
    expect(doc?.tools).toEqual(["Thocky keyboard"])
    expect(doc?.experience).toEqual([])
    expect(resumeMarkdown(doc!)).toContain("## Skills")
    expect(resumeMarkdown(doc!)).toContain("Thocky keyboard")
  })

  it("writes the held job as experience", () => {
    const doc = resumeDocument({ ...none, jobs: [1, 2] })
    expect(doc?.headline).toBe("Junior SWE at Byte & Mortar")
    expect(doc?.openToWork).toBe(true)
    expect(doc?.experience[0]?.title).toBe("Byte & Mortar")
    expect(doc?.experience[0]?.entries.map((entry) => entry.title)).toEqual(["Junior SWE", "Internship offer"])
    const text = resumeMarkdown(doc!)
    expect(text).toContain("# You")
    expect(text).toContain("## Experience")
    expect(text).toContain("Open to work")
    expect(text).toContain("Joined the team as an intern")
  })
})
