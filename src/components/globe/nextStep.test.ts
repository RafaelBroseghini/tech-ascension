import { describe, expect, it } from "vitest"
import { companyOf } from "../../game/globe/company.ts"
import type { CompanyFacts } from "../../game/globe/company.ts"
import { makeIncident } from "../../game/globe/world.ts"
import { nextStep } from "./nextStep.ts"

const roomy = { "54": 5 }
const company = (over: Partial<CompanyFacts> = {}) =>
  companyOf({ users: { "americas-east": 500 }, resistance: 0, incidents: [], won: false, footprint: { regions: ["americas-east"], pops: ["ashburn"], off: [], dark: [] }, equipment: roomy, ...over })

describe("nextStep", () => {
  it("points a company with no users at the gigs", () => {
    expect(nextStep(company({ users: {} })).text).toContain("Clear a gig")
  })

  it("names a law only a local server answers before anything else", () => {
    const step = nextStep(company({ users: { "americas-east": 1e9 }, equipment: {}, incidents: [makeIncident("law", "europe", 0, 1, 0)] }))
    expect(step).toMatchObject({ tone: "bad" })
    expect(step.text).toContain("Europe wants a local server. Buy Europe and deploy")
    const owned = nextStep(company({ users: { europe: 1e3 }, footprint: { regions: ["americas-east", "europe"], pops: ["ashburn"], off: [], dark: [] }, incidents: [makeIncident("law", "europe", 0, 1, 0)] }))
    expect(owned.text).toContain("Europe wants a local server. Deploy a point")
  })

  it("sends a company that drops requests to the Gear tab, with the share", () => {
    const step = nextStep(company({ users: { "americas-east": 1000 }, equipment: {} }))
    expect(step.tone).toBe("bad")
    expect(step.text).toMatch(/^Dropping \d+% of requests\..*Gear tab/)
  })

  it("counts incidents once serving keeps up", () => {
    expect(nextStep(company({ incidents: [makeIncident("rival", "americas-east", 0, 1, 0)] })).text).toMatch(/^1 incident slowing/)
  })

  it("suggests the cheapest region left while all is well, and says the world is won", () => {
    expect(nextStep(company()).text).toMatch(/^Growing\. Buying .+ lets the app reach/)
    expect(nextStep(company({ won: true })).tone).toBe("won")
  })
})
