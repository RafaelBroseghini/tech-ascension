import { describe, expect, it } from "vitest"
import { HOVER_CLICK_STEP_MS, MAX_CLICKS_PER_SEC } from "./autoClick.ts"

describe("hover click rate", () => {
  it("is twenty clicks in one second", () => {
    expect(MAX_CLICKS_PER_SEC).toBe(20)
    expect(HOVER_CLICK_STEP_MS).toBe(50)
  })
})
