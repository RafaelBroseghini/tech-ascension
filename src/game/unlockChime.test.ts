import { describe, expect, it } from "vitest"
import { chimeFor } from "./unlockChime.ts"
import type { MoneyPop } from "./store.ts"

const pop = (id: number, kind: MoneyPop["kind"]): MoneyPop => ({ id, kind, size: kind === "click" ? "medium" : "large", amount: 0, label: "" })

describe("unlock chime", () => {
  it("rings big for a board, standard for a desk feature, and not for a wipe, a click or a gig", () => {
    expect(chimeFor({ unlocked: [], pop: pop(2, "unlock") }, { unlocked: [], pop: pop(1, "click") })).toBe("big")
    expect(chimeFor({ unlocked: ["studio"], pop: null }, { unlocked: [], pop: null })).toBe("standard")
    expect(chimeFor({ unlocked: [], pop: null }, { unlocked: ["studio"], pop: null })).toBeNull()
    expect(chimeFor({ unlocked: [], pop: pop(2, "click") }, { unlocked: [], pop: pop(1, "click") })).toBeNull()
    expect(chimeFor({ unlocked: [], pop: pop(2, "gigClear") }, { unlocked: [], pop: null })).toBeNull()
    const same = pop(3, "unlock")
    expect(chimeFor({ unlocked: [], pop: same }, { unlocked: [], pop: same })).toBeNull()
  })
})
