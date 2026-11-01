/**
 * Where a shop list scrolls to. One rule serves a tab switch, a row appearing and the jump arrow: the first row that is
 * open and not yet bought (the next thing to act on), or the very bottom when there is none. The rows say what they are
 * in their markup: `is-done` (a gig cleared, a job held, a 10x perk owned), `is-locked`, and `data-bought` for the rows
 * that can be bought again (skills, gear, capital), where "bought" means at least one copy held.
 */

/** A row the career can act on and has not: open, and none held. The specialization switch is a row of the list but not a buy. */
const OPEN_UNBOUGHT = ".offer:not(.is-done):not(.is-locked):not(.spec-switch):not([data-bought='true'])"

/** The topmost open, unbought row of a shop list, or null when every open row is bought. */
export function scrollTarget(list: ParentNode): HTMLElement | null {
  return list.querySelector<HTMLElement>(OPEN_UNBOUGHT)
}

/** Whether the list's rows are snap points: the phone's three-row list (`scroll-snap-type: y mandatory` in mobile.css). */
const snaps = (list: HTMLElement): boolean => /mandatory|proximity/.test(getComputedStyle(list).scrollSnapType ?? "")

/**
 * Where the phone's list rests for a target row. The list shows three whole rows (its height is set to them after this
 * runs, in `useShopRows`), and its rows are snap points, so the target goes in as the third row: the offset is the start
 * of the row two above it. A list too short for three rows takes the first row start that still shows the target whole.
 */
function windowTop(list: HTMLElement, row: HTMLElement): number {
  const origin = list.getBoundingClientRect().top - list.scrollTop
  const edge = (el: Element, side: "top" | "bottom") => el.getBoundingClientRect()[side] - origin
  const rows = [...list.querySelectorAll(".offer")]
  const first = rows[Math.max(0, rows.indexOf(row) - 2)] ?? row
  const view = Math.min(list.clientHeight || Number.POSITIVE_INFINITY, edge(row, "bottom") - edge(first, "top"))
  const need = edge(row, "bottom") - view
  for (const el of rows) if (edge(el, "top") >= need - 1) return Math.min(edge(el, "top"), edge(row, "top"))
  return edge(row, "top")
}

/** The offset that shows `row` whole with the least movement (a row below the view lands at its bottom edge), or null when it already shows. */
function offsetFor(list: HTMLElement, row: HTMLElement): number | null {
  if (snaps(list)) return windowTop(list, row)
  const listBox = list.getBoundingClientRect()
  const rowBox = row.getBoundingClientRect()
  const above = listBox.top - rowBox.top
  const below = rowBox.bottom - listBox.bottom
  if (above > 0) return list.scrollTop - above
  if (below > 0) return list.scrollTop + below
  return null
}

/** Scrolls a shop list to its target row, or to the bottom when no row is open and unbought. */
export function scrollShopList(list: HTMLElement, behavior: ScrollBehavior = "auto"): void {
  const row = scrollTarget(list)
  const top = row ? offsetFor(list, row) : list.scrollHeight
  if (top === null) return
  if (behavior === "smooth" && typeof list.scrollTo === "function") list.scrollTo({ top, behavior })
  else list.scrollTop = top
}
