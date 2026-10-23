import { beforeEach, describe, expect, it } from "vitest"
import { CAPITAL } from "../../data/capital.ts"
import { EQUIPMENT, GIGS, JOB_TIERS, SKILL_TIERS } from "../../data/phases.ts"
import { GOLD_SKILLS } from "../../data/gold.ts"
import { GIG_PATH, JOB_PATHS } from "../../data/tree.ts"
import { installGameHarness } from "../harness.ts"
import { check, childrenOf, closure, dependents, describe as words, firstFail, holds, isOwned, mentions, NODE_MAP, NODES, nodeOf, prereqs, TRACK_LIST, trackOf } from "./index.ts"
import type { Ref, TreeView } from "./index.ts"

const game = installGameHarness()
const view = (over: Partial<TreeView> = {}): TreeView => ({ xpTotal: 0, peakMoney: 0, skills: {}, owned: {}, jobs: [], gigs: [], ...over })

describe("the tree's shape", () => {
  it("has a node for every skill, gig, job, gear row, capital row and 10x dev perk, plus the boards and the picks", () => {
    expect(NODES.filter((node) => node.kind === "skill")).toHaveLength(SKILL_TIERS.length)
    expect(NODES.filter((node) => node.kind === "gig")).toHaveLength(GIGS.length)
    expect(NODES.filter((node) => node.kind === "job")).toHaveLength(JOB_TIERS.length)
    expect(NODES.filter((node) => node.kind === "gear")).toHaveLength(EQUIPMENT.length)
    expect(NODES.filter((node) => node.kind === "capital")).toHaveLength(CAPITAL.length)
    expect(NODES.filter((node) => node.kind === "gold")).toHaveLength(GOLD_SKILLS.length)
    expect(NODES.filter((node) => node.kind === "board")).toHaveLength(4)
    expect(NODES.filter((node) => node.kind === "pick")).toHaveLength(2)
    expect(NODE_MAP.size).toBe(NODES.length)
  })

  it("puts every node in exactly one track, in order, with a position that matches", () => {
    const seen = new Set<Ref>()
    for (const track of TRACK_LIST) {
      track.nodes.forEach((ref, index) => {
        expect(seen.has(ref), ref).toBe(false)
        seen.add(ref)
        expect(nodeOf(ref)!.track).toBe(track.id)
        expect(nodeOf(ref)!.index).toBe(index)
        expect(trackOf(ref)).toBe(track)
      })
    }
    expect(seen.size).toBe(NODES.length)
  })

  it("only points at rows that exist, and has no cycle through what a row sits under or names", () => {
    for (const node of NODES) {
      if (node.after) expect(NODE_MAP.has(node.after), `${node.ref} under ${node.after}`).toBe(true)
      for (const ref of mentions(node.requires)) expect(NODE_MAP.has(ref), `${node.ref} names ${ref}`).toBe(true)
      // A walk back from any row never reaches itself.
      expect(closure(node.ref)).not.toContain(node.ref)
    }
  })

  it("answers prerequisites and dependents the same way round", () => {
    for (const node of NODES) for (const before of prereqs(node.ref)) expect(dependents(before), `${before} opens ${node.ref}`).toContain(node.ref)
    for (const node of NODES) for (const child of childrenOf(node.ref)) expect(nodeOf(child)!.after).toBe(node.ref)
  })
})

describe("the structure written by hand (src/data/tree.ts)", () => {
  it("lists every gig once, and each gig's priorGigs and skills are read off the path", () => {
    expect(GIG_PATH.map((step) => step.id).sort((a, b) => a - b)).toEqual(GIGS.map((gig) => gig.id).sort((a, b) => a - b))
    expect(new Set(GIG_PATH.map((step) => step.id)).size).toBe(GIG_PATH.length)
    GIG_PATH.forEach((step, index) => {
      const gig = GIGS.find((row) => row.id === step.id)!
      expect(gig.priorGigs, `gig ${gig.id}`).toBe(index)
      expect(gig.skillIds).toBe(step.skills)
      for (const id of step.skills) expect(SKILL_TIERS.some((skill) => skill.id === id), `gig ${gig.id} skill ${id}`).toBe(true)
    })
  })

  it("lists every job once, lowest rank first, on a track that matches its own spec and line", () => {
    const seen = new Set<number>()
    for (const path of JOB_PATHS) {
      let rank = 0
      for (const id of path.jobs) {
        const job = JOB_TIERS.find((row) => row.id === id)
        expect(job, `job ${id} on ${path.id}`).toBeDefined()
        expect(seen.has(id), `job ${id} twice`).toBe(false)
        seen.add(id)
        expect(job!.rank, `job ${id} rank`).toBeGreaterThan(rank)
        rank = job!.rank
        expect(job!.spec, `job ${id} spec`).toBe(path.spec)
        expect(job!.lead, `job ${id} line`).toBe(path.lead)
      }
    }
    expect(seen.size).toBe(JOB_TIERS.length)
  })

  it("hangs the trunk off nothing, a specialization off the trunk's top, and the lines and the shared rows off the pick", () => {
    expect(JOB_PATHS[0]).toMatchObject({ id: "trunk" })
    expect(JOB_PATHS[0]!.under).toBeUndefined()
    for (const path of JOB_PATHS.slice(1)) expect(path.under, path.id).toBe(path.spec ? "trunk" : "pick:lead")
    const trunkTop = Math.max(...JOB_PATHS[0]!.jobs.map((id) => JOB_TIERS.find((job) => job.id === id)!.rank))
    for (const path of JOB_PATHS.filter((row) => row.under === "trunk")) expect(JOB_TIERS.find((job) => job.id === path.jobs[0])!.rank).toBe(trunkTop + 1)
  })
})

describe("the chains the tree models", () => {
  it("makes the gigs one strict chain, each under the one before and asking for every gig before it", () => {
    const track = TRACK_LIST.find((row) => row.id === "gigs")!
    expect(track.strict).toBe(true)
    track.nodes.forEach((ref, index) => {
      const node = nodeOf(ref)!
      expect(node.after).toBe(index === 0 ? undefined : track.nodes[index - 1])
      const needsCount = JSON.stringify(node.requires).includes(`"count","of":"gigs","min":${index}`)
      expect(needsCount, ref).toBe(true)
    })
  })

  it("hangs each specialization's jobs off the trunk's top and the leadership lines off the pick", () => {
    const top = TRACK_LIST.find((row) => row.id === "jobs:trunk")!.nodes.at(-1)!
    for (const id of ["frontend", "backend", "infra", "ai", "fde", "security"]) expect(nodeOf(TRACK_LIST.find((row) => row.id === `jobs:${id}`)!.nodes[0]!)!.after).toBe(top)
    for (const id of ["ic", "manager", "shared"]) expect(nodeOf(TRACK_LIST.find((row) => row.id === `jobs:${id}`)!.nodes[0]!)!.after).toBe("pick:lead")
  })

  it("keeps the jobs and the skills loose: nothing demands the row before", () => {
    for (const track of TRACK_LIST.filter((row) => row.id.startsWith("jobs:") || row.id === "skills")) {
      expect(track.strict, track.id).toBe(false)
      for (const ref of track.nodes) expect(mentions(nodeOf(ref)!.requires).filter((named) => named.startsWith("job:")), ref).toEqual([])
    }
  })

  it("chains each 10x dev family: a perk asks for the ones before it", () => {
    const hover = TRACK_LIST.find((row) => row.id === "gold:hover")!
    expect(hover.strict).toBe(true)
    const [first, second] = hover.nodes
    expect(mentions(nodeOf(first!)!.requires)).toEqual([])
    expect(mentions(nodeOf(second!)!.requires)).toContain(first)
  })
})

describe("reading a node", () => {
  it("says which leaf is first unmet, in the order the gate lists them", () => {
    const senior = nodeOf("job:14")!
    expect(firstFail(senior.requires, view())?.t).toBe("met")
    const open = view({ xpTotal: 1e9, jobs: [1, 2, 3, 4, 5, 6, 7], gigs: [1, 2, 3, 4, 5, 6], build: { spec: "backend", switched: false } })
    expect(firstFail(senior.requires, open)).toBeNull()
    expect(firstFail(senior.requires, { ...open, company: { users: { "americas-east": 10 } } })?.t).toBe("any")
  })

  it("lists every missing leaf with words and what the career has", () => {
    const result = check("gig:3", view({ xpTotal: 5_000 }))
    expect(result.met).toBe(false)
    expect(result.missing.map((row) => row.req.t)).toEqual(["met", "xp", "count", "owns"])
    expect(result.missing[1]!.text).toContain("5,000")
    expect(words({ t: "users", min: 10_000 })).toBe("10,000 users")
    expect(check("board:capital", view({ peakMoney: 500_000 })).met).toBe(true)
  })

  it("turns an unknown row into a clear miss instead of throwing", () => {
    expect(check("gig:9999" as Ref, view())).toMatchObject({ met: false })
    expect(isOwned("gig:9999" as Ref, view())).toBe(false)
  })

  it("scales XP and gig counts by the origin, from the same helpers the game uses", () => {
    const xp = (origin: "college" | "bootcamp" | "dropout") => view({ xpTotal: 15_000, skills: Object.fromEntries(Array.from({ length: 6 }, (_, i) => [String(i + 1), 1])), build: { spec: null, switched: false, origin } })
    expect(holds(nodeOf("board:gigs")!.requires, xp("bootcamp"))).toBe(false)
    expect(holds(nodeOf("board:jobs")!.requires, view({ xpTotal: 40_000, gigs: [1, 2, 3, 4], build: { spec: null, switched: false, origin: "bootcamp" } }))).toBe(true)
    expect(holds(nodeOf("board:jobs")!.requires, view({ xpTotal: 40_000, gigs: [1, 2, 3, 4] }))).toBe(false)
  })

  it("counts tag requirements on the skills owned (for a gig board that asks for tags)", () => {
    const frontend = SKILL_TIERS.filter((row) => row.tags.includes("frontend")).slice(0, 2)
    const have = view({ skills: Object.fromEntries(frontend.map((row) => [String(row.id), 1])) })
    expect(holds({ t: "tag", tag: "frontend", min: 2 }, have)).toBe(true)
    expect(holds({ t: "tag", tag: "frontend", min: 3 }, have)).toBe(false)
    expect(holds({ t: "tag", tag: "security", min: 1 }, have)).toBe(false)
  })
})

describe("asking the harness", () => {
  beforeEach(() => game.reset())

  it("explains a row for the career under way", () => {
    game.keepProfile()
    const shut = game.explain("gig:1")!
    expect(shut).toMatchObject({ ref: "gig:1", track: "gigs", strict: true, after: null, owned: false, open: false })
    expect(shut.missing.length).toBeGreaterThan(0)
    expect(shut.opens).toContain("gig:2")
    game.setXp(60_000)
    for (let id = 1; id <= 16; id++) game.buySkill(id)
    game.forceGig(1)
    const done = game.explain("gig:1")!
    expect(done.owned).toBe(true)
    expect(game.explain("gig:2")!.after).toBe("gig:1")
    expect(game.explain("nonsense")).toBeNull()
  })
})
