import { beforeEach, describe, expect, it } from "vitest"
import { CAPITAL } from "../data/capital.ts"
import { EQUIPMENT } from "../data/phases.ts"
import { idlePerSec } from "./economy.ts"
import { useGame } from "./store.ts"

let setupSeq = 0

/** Milestone lines logged since the desk was set up. */
const multipliers = () =>
  useGame
    .getState()
    .journal.entries.filter((entry) => entry.seq > setupSeq && entry.type === "multiplier")
    .map((entry): Record<string, unknown> => ({ ref: entry.ref, ...entry.data }))

/**
 * A desk with the Gear tab and Capital open and plenty of cash. Getting there pops balance milestones, phases and
 * whatever the starting counts cross, so the screen and the log are settled before the test acts.
 */
function richDesk(over: Partial<ReturnType<typeof useGame.getState>> = {}) {
  useGame.setState({ xpTotal: 20_000, money: 1e12, peakMoney: 1e12, ...over })
  useGame.setState({ toast: null, pop: null })
  setupSeq = useGame.getState().journal.seq - 1
}

describe("output milestones in play", () => {
  beforeEach(() => {
    useGame.getState().wipe()
  })

  it("doubles a gear row at its tenth copy, logs it, and says so in the corner", () => {
    richDesk({ equipment: { "2": 9 } })
    const before = idlePerSec(useGame.getState())
    useGame.getState().buyEquipment(2)
    const cps = EQUIPMENT.find((row) => row.id === 2)!.cps
    expect(idlePerSec(useGame.getState()) - before).toBeCloseTo(11 * cps)
    expect(multipliers()).toEqual([{ ref: "gear:2", owned: 10, mult: 2 }])
    expect(useGame.getState().toast?.text).toBe("Cable management kit hit 10: ×2 output")
    expect(useGame.getState().pop).toBeNull()
  })

  it("gives a capital milestone the big pop: the new multiplier, and the row", () => {
    richDesk({ owned: { "1": 9 } })
    useGame.getState().buy(1)
    expect(useGame.getState().pop).toMatchObject({ kind: "milestone", size: "large", amount: 0, mult: 2, label: CAPITAL[0]!.name })
    expect(multipliers()).toEqual([{ ref: "capital:1", owned: 10, mult: 2 }])
  })

  it("pops once for a buy that jumps two milestones, with the higher multiplier, and logs both", () => {
    richDesk({ owned: { "1": 9 }, gold: [1, 3, 6], buyAmount: "max" })
    useGame.setState({ owned: { "1": 26 } })
    expect(useGame.getState().pop).toMatchObject({ kind: "milestone", mult: 4 })
    expect(multipliers().map((row) => row.owned)).toEqual([10, 25])
  })

  it("says nothing for a copy between milestones", () => {
    richDesk({ equipment: { "2": 10 }, owned: { "1": 10 } })
    useGame.getState().buyEquipment(2)
    useGame.getState().buy(1)
    expect(multipliers()).toEqual([])
    expect(useGame.getState().pop).toBeNull()
    expect(useGame.getState().toast).toBeNull()
  })

  it("leaves the while-you-were-out note alone", () => {
    const note = { id: 7, text: "", note: "Back at the desk." }
    richDesk({ equipment: { "2": 9 } })
    useGame.setState({ toast: note })
    useGame.getState().buyEquipment(2)
    expect(useGame.getState().toast).toMatchObject({ id: 7, note: "Back at the desk." })
    expect(multipliers()).toHaveLength(1)
  })
})
