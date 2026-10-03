import { describe, expect, it } from "vitest"
import { freshSave, hydrate } from "./save.ts"
import { offlineCreditLine, offlineDiary, offlineToastText } from "./offlineNote.ts"

const hour = 3_600_000

describe("offline diary", () => {
  it("picks a sentence from what the desk was doing", () => {
    expect(offlineDiary({ credit: 0, xpCredit: 1, jobs: [], elapsed: 0 })).toBe("The cat slept on the warm laptop.")
    expect(offlineDiary({ credit: 40, xpCredit: 0, jobs: [], elapsed: 0 })).toBe("The build stayed green.")
    expect(offlineDiary({ credit: 40, xpCredit: 0, jobs: [2], elapsed: 0 })).toBe("A recruiter emailed. You didn't answer.")
    expect(offlineDiary({ credit: 40, xpCredit: 0, jobs: [14], elapsed: 0 })).toBe("The cluster kept training.")
    expect(offlineDiary({ credit: 40, xpCredit: 0, jobs: [31], elapsed: 0 })).toBe("The habitat lights stayed on.")
  })

  it("rotates once per hour away", () => {
    const first = offlineDiary({ credit: 0, xpCredit: 1, jobs: [], elapsed: 0 })
    const later = offlineDiary({ credit: 0, xpCredit: 1, jobs: [], elapsed: hour })
    expect(later).not.toBe(first)
    expect(offlineDiary({ credit: 0, xpCredit: 1, jobs: [], elapsed: hour * 3 })).toBe(first)
  })

  it("keeps the credit under the sentence and stays quiet when nothing was earned", () => {
    expect(offlineCreditLine(0, 0)).toBeNull()
    expect(offlineToastText({ credit: 0, xpCredit: 0, jobs: [], elapsed: hour })).toBeNull()
    expect(offlineToastText({ credit: 12, xpCredit: 4, jobs: [1], elapsed: hour })).toBe(
      "Standup happened without you.\ncredited $12 and studied +4 XP",
    )
  })

  it("hydrates a note without changing the credit", () => {
    const save = freshSave(0)
    save.jobs = [1]
    save.skills = { "2": 1 }
    const hydrated = hydrate(JSON.stringify(save), hour)
    const [sentence, credit] = (hydrated.toast ?? "").split("\n")
    expect(sentence?.endsWith(".")).toBe(true)
    expect(credit).toMatch(/^credited \$/)
    expect(credit).toMatch(/studied \+/)
    expect(hydrated.save.money).toBeGreaterThan(0)
    expect(hydrated.save.xp).toBeGreaterThan(0)
  })
})
