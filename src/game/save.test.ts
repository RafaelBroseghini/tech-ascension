import { describe, expect, it } from "vitest"
import { freshSave, hydrate, parseSave } from "./save.ts"

describe("save: a block from the retired whiteboard", () => {
  it("still loads, and its interview block is dropped", () => {
    const raw = { ...freshSave(1_000), interviews: { "hello-server": { verdict: "hire", attempts: 1, design: { nodes: [], edges: [] } } } }
    const text = JSON.stringify(raw)
    expect(parseSave(JSON.parse(text))).not.toHaveProperty("interviews")
    expect(hydrate(text, 1_000).save).not.toHaveProperty("interviews")
  })
})
