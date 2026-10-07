import { describe, expect, it } from "vitest"
import { INTERVIEWS } from "../data/studio/challenges.ts"
import { freshSave, hydrate, parseSave } from "./save.ts"

const hello = INTERVIEWS[0]!

describe("save: interviews", () => {
  it("interviews round-trip", () => {
    const interviews = {
      [hello.id]: { verdict: "hire" as const, attempts: 2, design: hello.reference },
      "3-tier-app": { verdict: "noHire" as const, attempts: 1, design: INTERVIEWS[1]!.naive[0].design },
    }
    const text = JSON.stringify({ ...freshSave(1_000), interviews })
    expect(parseSave(JSON.parse(text))?.interviews).toEqual(interviews)
    expect(hydrate(text, 1_000).save.interviews).toEqual(interviews)
  })

  it("an unknown interview id is dropped", () => {
    const raw = {
      ...freshSave(1_000),
      interviews: {
        "leetcode-hard": { verdict: "hire", attempts: 1, design: hello.reference },
        [hello.id]: { verdict: "hire", attempts: 1, design: hello.reference },
      },
    }
    expect(Object.keys(parseSave(raw)?.interviews ?? {})).toEqual([hello.id])
  })

  it("drops a record with an unknown verdict and empties a broken design", () => {
    const raw = {
      ...freshSave(1_000),
      interviews: {
        [hello.id]: { verdict: "maybe", attempts: 1, design: hello.reference },
        "3-tier-app": { verdict: "hire", attempts: -4, design: { nodes: [{ id: "x", kind: "mainframe", replicas: 1 }], edges: "nope" } },
      },
    }
    expect(parseSave(raw)?.interviews).toEqual({ "3-tier-app": { verdict: "hire", attempts: 0, design: { nodes: [], edges: [] } } })
  })

  it("leaves the block out when there is nothing in it", () => {
    expect(parseSave(freshSave(1_000))).not.toHaveProperty("interviews")
    expect(parseSave({ ...freshSave(1_000), interviews: { nope: {} } })).not.toHaveProperty("interviews")
  })
})
