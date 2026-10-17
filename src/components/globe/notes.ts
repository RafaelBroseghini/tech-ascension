import { CITIES } from "../../data/geo.ts"
import { HOME_CITY } from "../../data/regions.ts"
import type { Note } from "./GlobeScene.ts"
import type { CityRow, CityTally } from "../../game/globe/tip.ts"

/** One annotation on the globe: what it says, and how big it is so labels can keep out of each other's way. */
export interface Label {
  readonly id: string
  readonly kind: "home" | "pop" | "city" | "edge"
  /** Country code, so a city's label can carry its flag. */
  readonly country?: string
  /** For a city or an edge: the label id of the server that serves it. */
  readonly server?: string
  readonly lines: readonly string[]
  /** The wave dropped some of what this label is about. */
  readonly lost: boolean
  readonly width: number
  readonly height: number
}

const CHAR_PX = 6.4
const LINE_PX = 13
const PAD_PX = 14
const FLAG_PX = 20

const sized = (id: string, kind: Label["kind"], lines: readonly string[], lost: boolean, extra: Pick<Label, "country" | "server"> = {}): Label => ({
  id,
  kind,
  lines,
  lost,
  ...extra,
  width: Math.ceil(Math.max(...lines.map((line) => line.length)) * CHAR_PX + PAD_PX + (extra.country ? FLAG_PX : 0)),
  height: lines.length * LINE_PX + 6,
})

/**
 * The annotations, most important first: the app server, then every city with its share of the traffic, then the trip time on each edge.
 * After a wave a city's edge also says how many of its requests were dropped.
 */
export function notesFor(rows: readonly CityRow[], home: string, tally: ReadonlyMap<string, CityTally> | null, pops: readonly { readonly id: string; readonly name: string; readonly country: string }[] = []): Label[] {
  const dropped = (city: string) => tally?.get(city)?.dropped ?? 0
  const server = (r: CityRow) => (pops.some((p) => p.id === r.pop && p.id !== HOME_CITY) ? `pop:${r.pop}` : "home")
  return [
    sized("home", "home", [home, "app server"], false, { country: CITIES[HOME_CITY]?.country }),
    ...pops.filter((p) => p.id !== HOME_CITY).map((p) => sized(`pop:${p.id}`, "pop", [p.name, "app server"], false, { country: p.country })),
    ...rows.map((r) => sized(`city:${r.city}`, "city", [`${r.name} ${Math.round(r.share * 100)}%`], false, { country: r.country, server: server(r) })),
    ...rows.map((r) => sized(`edge:${r.city}`, "edge", [dropped(r.city) > 0 ? `${r.ms} ms, ${dropped(r.city)} dropped` : `${r.ms} ms`], dropped(r.city) > 0, { server: server(r) })),
  ]
}

/** The annotations the pointer earns: a city or its edge shows both with the app server that serves it, a server shows itself and the cities it serves, nothing shows none. */
export function hoverIds(hover: { readonly kind: "city" | "edge" | "home" | "pop"; readonly city: string } | null, labels: readonly Label[]): Set<string> {
  if (!hover) return new Set()
  if (hover.kind === "home" || hover.kind === "pop") {
    const id = hover.kind === "home" ? "home" : `pop:${hover.city}`
    return new Set(labels.filter((l) => l.id === id || (l.kind === "city" && l.server === id)).map((l) => l.id))
  }
  const server = labels.find((l) => l.id === `city:${hover.city}`)?.server ?? "home"
  return new Set([server, `city:${hover.city}`, `edge:${hover.city}`])
}

interface Rect {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w + 3 && b.x < a.x + a.w + 3 && a.y < b.y + b.h + 3 && b.y < a.y + a.h + 3

/**
 * Puts each city's label on the far side of its dot from the server, so it never lies on the edge, and the others beside
 * their point. It hides any that would sit on a label placed before it, or fall off the
 * pane, or whose point is on the far side of the ball. Zooming in spreads the points, so more labels fit.
 * Only the labels in `only` are drawn; the rest stay hidden.
 */
export function placeNotes(labels: readonly Label[], points: readonly Note[], els: ReadonlyMap<string, HTMLElement>, width: number, height: number, only: ReadonlySet<string>): void {
  const at = new Map(points.map((p) => [p.id, p]))
  const taken: Rect[] = []
  for (const label of labels) {
    const el = els.get(label.id)
    if (!el) continue
    const point = at.get(label.id)
    const server = at.get(label.server ?? "home")
    const rect: Rect | null = point?.seen && only.has(label.id)
      ? label.kind === "edge"
        ? { x: point.x - label.width / 2, y: point.y - label.height / 2, w: label.width, h: label.height }
        : { x: server && label.kind === "city" && point.x < server.x ? point.x - 12 - label.width : point.x + 12, y: point.y - label.height / 2, w: label.width, h: label.height }
      : null
    const fits = rect && rect.x >= 0 && rect.y >= 0 && rect.x + rect.w <= width && rect.y + rect.h <= height && !taken.some((t) => overlaps(rect, t))
    if (!rect || !fits) {
      el.style.visibility = "hidden"
      continue
    }
    taken.push(rect)
    el.style.visibility = "visible"
    el.style.transform = `translate(${Math.round(rect.x)}px, ${Math.round(rect.y)}px)`
  }
}
