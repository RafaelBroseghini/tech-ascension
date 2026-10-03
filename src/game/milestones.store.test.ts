import { beforeEach, describe, expect, it } from "vitest"
import { useGame } from "./store.ts"

describe("balance milestone pops", () => {
  beforeEach(() => {
    useGame.getState().wipe()
  })

  it("shows a one-time unlock pop when money crosses a meme threshold", () => {
    useGame.setState({ money: 1300, xpTotal: 0, seenMilestones: [] })
    useGame.setState({ money: 1400 })
    const pop = useGame.getState().pop
    expect(pop).toMatchObject({ kind: "unlock", size: "large", amount: 0, label: expect.stringContaining("1,337") })
    expect(useGame.getState().seenMilestones).toContain("money-1337")
    useGame.setState({ money: 5000 })
    expect(useGame.getState().pop?.label).toContain("1,337")
  })
})
