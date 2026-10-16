/** @vitest-environment happy-dom */
import { describe, expect, it } from "vitest"
import { LOCAL_AUDIENCE } from "../../data/geo.ts"
import type { Note } from "./GlobeScene.ts"
import { hoverIds, notesFor, placeNotes } from "./notes.ts"
import { cityRows } from "../../game/globe/tip.ts"

const rows = cityRows(LOCAL_AUDIENCE, 600, ["ashburn"])

describe("globe annotations", () => {
  it("lists the server first, then each city with its share, then each edge with its trip time", () => {
    const labels = notesFor(rows, "Virginia", null)
    expect(labels[0]).toMatchObject({ id: "home", lines: ["Virginia", "app server"] })
    expect(labels[1]).toMatchObject({ id: "city:nyc", lines: ["New York 30%"] })
    expect(labels.filter((l) => l.kind === "edge")).toHaveLength(rows.length)
    expect(labels.find((l) => l.id === "edge:nyc")?.lines[0]).toBe(`${rows[0].ms} ms`)
  })

  it("an edge says how many of its requests the last wave dropped", () => {
    const labels = notesFor(rows, "Virginia", new Map([["nyc", { sent: 40, dropped: 12 }]]))
    const edge = labels.find((l) => l.id === "edge:nyc")
    expect(edge?.lines[0]).toContain("12 dropped")
    expect(edge?.lost).toBe(true)
    expect(labels.find((l) => l.id === "edge:boston")?.lost).toBe(false)
  })

  it("a label on top of an earlier one, off the pane or on the far side is hidden; a city west of the server sits on its far side and the rest beside their point", () => {
    const labels = notesFor(rows.slice(0, 3), "Virginia", null)
    const els = new Map(labels.map((l) => [l.id, document.createElement("span")]))
    const points: Note[] = [
      { id: "home", kind: "home", city: "ashburn", x: 300, y: 200, seen: true },
      { id: "city:nyc", kind: "city", city: "nyc", x: 302, y: 204, seen: true },
      { id: "city:chicago", kind: "city", city: "chicago", x: 200, y: 100, seen: true },
      { id: "city:toronto", kind: "city", city: "toronto", x: 150, y: 150, seen: false },
      { id: "edge:nyc", kind: "edge", city: "nyc", x: 700, y: 50, seen: true },
    ]
    placeNotes(labels, points, els, 420, 300, new Set(labels.map((l) => l.id)))
    expect(els.get("home")?.style.visibility).toBe("visible")
    expect(els.get("city:nyc")?.style.visibility).toBe("hidden")
    expect(els.get("city:chicago")?.style.visibility).toBe("visible")
    expect(els.get("city:chicago")?.style.transform).toBe("translate(83px, 91px)")
    expect(els.get("city:toronto")?.style.visibility).toBe("hidden")
    expect(els.get("edge:nyc")?.style.visibility).toBe("hidden")
  })

  it("a server other than home gets its own label, and a city west of it sits on its far side", () => {
    const far = cityRows([{ city: "berlin", share: 0.5 }, { city: "paris", share: 0.5 }], 100, ["ashburn", "frankfurt"])
    const labels = notesFor(far, "Virginia", null, [{ id: "ashburn", name: "Virginia", country: "US" }, { id: "frankfurt", name: "Frankfurt", country: "DE" }])
    expect(labels.find((l) => l.id === "pop:frankfurt")).toMatchObject({ kind: "pop", lines: ["Frankfurt", "app server"], country: "DE" })
    expect(labels.find((l) => l.id === "city:paris")?.server).toBe("pop:frankfurt")
    expect([...hoverIds({ kind: "city", city: "paris" }, labels)].sort()).toEqual(["city:paris", "edge:paris", "pop:frankfurt"])
    expect([...hoverIds({ kind: "pop", city: "frankfurt" }, labels)].sort()).toEqual(["city:berlin", "city:paris", "pop:frankfurt"])
  })

  it("shows nothing at rest, a city's label and edge with the server on hover, and every city on the server", () => {
    const labels = notesFor(rows.slice(0, 3), "Virginia", null)
    expect(hoverIds(null, labels).size).toBe(0)
    expect([...hoverIds({ kind: "edge", city: "nyc" }, labels)].sort()).toEqual(["city:nyc", "edge:nyc", "home"])
    expect([...hoverIds({ kind: "home", city: "ashburn" }, labels)].sort()).toEqual(["home", ...rows.slice(0, 3).map((r) => `city:${r.city}`)].sort())
    const els = new Map(labels.map((l) => [l.id, document.createElement("span")]))
    const points: Note[] = [{ id: "home", kind: "home", city: "ashburn", x: 300, y: 200, seen: true }, { id: "city:chicago", kind: "city", city: "chicago", x: 200, y: 100, seen: true }]
    placeNotes(labels, points, els, 400, 300, new Set())
    expect(els.get("home")?.style.visibility).toBe("hidden")
    expect(els.get("city:chicago")?.style.visibility).toBe("hidden")
  })
})
