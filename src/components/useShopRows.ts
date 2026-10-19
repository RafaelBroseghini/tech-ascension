import { useEffect } from "react"
import type { RefObject } from "react"

/** How many whole rows a phone's shop list shows at rest. */
export const SHOP_ROWS = 3

/**
 * Sizes a shop list to the three whole rows at its top on a phone: `--rows-h` on the list's wrapper. With the snap in
 * mobile.css a scroll always settles on a row, so nothing is cut in half; the height follows the rows as they settle,
 * because rows wrap to different heights. It re-reads when rows change (a buy, a reveal) and when the list scrolls.
 */
export function useShopRows(listRef: RefObject<HTMLElement | null>, enabled: boolean, scope: string) {
  useEffect(() => {
    const list = listRef.current
    const wrap = list?.parentElement
    if (!enabled || !list || !wrap) return
    const measure = () => {
      const rows = [...list.querySelectorAll<HTMLElement>(".offer")]
      const listTop = list.getBoundingClientRect().top
      // The first row that starts at the top edge, give or take the rounding of the snap.
      const first = rows.findIndex((row) => row.getBoundingClientRect().top >= listTop - 2)
      const shown = first < 0 ? [] : rows.slice(first, first + SHOP_ROWS)
      if (shown.length < SHOP_ROWS) {
        wrap.style.removeProperty("--rows-h")
        return
      }
      const height = shown.reduce((sum, row) => sum + row.getBoundingClientRect().height, 0)
      wrap.style.setProperty("--rows-h", `${Math.round(height)}px`)
    }
    measure()
    let settle = 0
    const later = () => {
      window.clearTimeout(settle)
      settle = window.setTimeout(measure, 120)
    }
    const resize = new ResizeObserver(later)
    const watch = () => {
      resize.disconnect()
      list.querySelectorAll(".offer").forEach((row) => resize.observe(row))
    }
    watch()
    const mutations = new MutationObserver(() => {
      watch()
      later()
    })
    mutations.observe(list, { childList: true, subtree: true })
    list.addEventListener("scroll", later, { passive: true })
    return () => {
      window.clearTimeout(settle)
      resize.disconnect()
      mutations.disconnect()
      list.removeEventListener("scroll", later)
    }
  }, [listRef, enabled, scope])
}
