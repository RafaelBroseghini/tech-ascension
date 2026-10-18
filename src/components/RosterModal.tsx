import { X } from "lucide-react"
import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react"
import { createPortal } from "react-dom"
import { formatNumber } from "../game/format.ts"
import { UI_ICON } from "./icons/ui.tsx"
import { useFocusTrap } from "./useFocusTrap.ts"

/** Theme palette keys a roster can take its color from. */
export type RosterAccent = "mauve" | "green" | "blue" | "peach" | "sky" | "rosewater" | "red"

export type RosterItem = {
  key: string
  /** Slot number shown as #012. */
  no: number
  name: string
  art: string | null
  /** A black silhouette with its name hidden. Only the cat roster has these. */
  locked?: boolean
  count?: number
  lines?: readonly string[]
  /** Gear section or capital era. */
  group?: string | null
  /** Developer logos for what the row stands for, shown in the left panel. */
  logos?: readonly { name: string; Icon: ComponentType<{ size?: number; className?: string }> }[]
}

type RosterModalProps = {
  /** `data-roster` on the dialog, for tests and styling. */
  id: string
  kicker: string
  title: string
  items: readonly RosterItem[]
  /** Slots in the whole set. When given, the counter reads N / total; otherwise just N. */
  total?: number
  /** The N in the counter, when it is not every unlocked item. */
  unlockedCount?: number
  /** An editor theme accent, used through its CSS variable. */
  accent: RosterAccent
  /** Where the cursor starts. Defaults to the last item. */
  startKey?: string
  /** The item marked as picked, with its tag. */
  chosenKey?: string
  chosenTag?: string
  /** Called when an unlocked item is clicked. */
  onChoose?: (item: RosterItem) => void
  hint?: (item: RosterItem) => string | null
  empty: string
  onClose: () => void
}

/** Cells mounted in the first frame: a screenful at the widest layout. The rest follow in the background. */
const FIRST_CELLS = 96

function slot(no: number): string {
  return `#${String(no).padStart(3, "0")}`
}

/** Columns the grid is laid out in right now, for up and down arrows. */
function columnsOf(list: HTMLElement | null): number {
  if (!list || typeof getComputedStyle !== "function") return 1
  const template = getComputedStyle(list).gridTemplateColumns
  if (!template || template === "none") return 1
  return Math.max(1, template.split(" ").filter(Boolean).length)
}

type CellProps = {
  item: RosterItem
  index: number
  active: boolean
  chosen: boolean
  chosenTag: string
  /** A pickable roster marks the chosen cell as selected; a browse-only one marks the cursor. */
  picks: boolean
  onCursor: (index: number) => void
  onPick: (index: number) => void
}

/**
 * One slot. Memoized with stable handlers, so moving the cursor re-renders the two cells that
 * changed instead of the whole grid (the cat roster is about 300 cells of animated art).
 */
const RosterCell = memo(function RosterCell({ item, index, active, chosen, chosenTag, picks, onCursor, onPick }: CellProps) {
  return (
    <li role="presentation">
      <button
        type="button"
        role="option"
        aria-selected={picks ? chosen : active}
        aria-label={item.locked ? `${slot(item.no)} locked` : `${slot(item.no)} ${item.name}`}
        tabIndex={active ? 0 : -1}
        className={["roster-cell", item.locked ? "is-locked" : "", active ? "is-active" : "", chosen ? "is-chosen" : ""].filter(Boolean).join(" ")}
        data-cell=""
        data-testid="roster-cell"
        data-key={item.key}
        data-locked={Boolean(item.locked)}
        onPointerEnter={() => onCursor(index)}
        onFocus={() => onCursor(index)}
        onClick={() => onPick(index)}
      >
        {item.art ? <img src={item.art} alt="" width={48} height={48} loading="lazy" draggable={false} decoding="async" /> : null}
        {!item.locked && item.count && item.count > 1 ? <span className="roster-cell-count">×{formatNumber(item.count)}</span> : null}
        {chosen ? (
          <span className="roster-cell-tag" aria-hidden>
            {chosenTag}
          </span>
        ) : null}
      </button>
    </li>
  )
})

/** A character select screen in the editor theme's colors. */
export function RosterModal({
  id,
  kicker,
  title,
  items,
  total,
  unlockedCount,
  accent,
  startKey,
  chosenKey,
  chosenTag = "Picked",
  onChoose,
  hint,
  empty,
  onClose,
}: RosterModalProps) {
  const [cursor, setCursor] = useState(() => {
    const start = startKey ? items.findIndex((item) => item.key === startKey) : -1
    return start >= 0 ? start : Math.max(0, items.length - 1)
  })
  // Open on a screenful (always reaching the cursor), then fill in the rest as a deferred render
  // that input can interrupt. The cat roster is about 300 cells of animated art.
  const [firstCells] = useState(() => items.slice(0, Math.max(FIRST_CELLS, cursor + 1)))
  const shown = useDeferredValue(items, firstCells)
  const listRef = useRef<HTMLUListElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef)
  const pick = items[Math.min(cursor, items.length - 1)]
  const unlocked = unlockedCount ?? items.filter((item) => !item.locked).length
  // The cells get stable handlers; these refs carry the current list and callback.
  const itemsRef = useRef(items)
  const onChooseRef = useRef(onChoose)
  useEffect(() => {
    itemsRef.current = items
    onChooseRef.current = onChoose
  })
  const onCursor = useCallback((index: number) => setCursor(index), [])
  const onPick = useCallback((index: number) => {
    setCursor(index)
    const item = itemsRef.current[index]
    if (item && !item.locked) onChooseRef.current?.(item)
  }, [])

  useEffect(() => {
    const cell = listRef.current?.querySelector<HTMLButtonElement>("[data-cell].is-active")
    cell?.focus({ preventScroll: true })
    cell?.scrollIntoView?.({ block: "nearest" })
  }, [])

  useEffect(() => {
    const onKey = (key: KeyboardEvent) => {
      if (key.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  function move(to: number) {
    const next = Math.max(0, Math.min(items.length - 1, to))
    setCursor(next)
    listRef.current?.querySelectorAll<HTMLButtonElement>("[data-cell]")[next]?.focus()
  }

  function onListKey(event: ReactKeyboardEvent<HTMLUListElement>) {
    const cols = columnsOf(listRef.current)
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }
    if (event.key in step) {
      event.preventDefault()
      move(cursor + step[event.key]!)
    } else if (event.key === "Home") {
      event.preventDefault()
      move(0)
    } else if (event.key === "End") {
      event.preventDefault()
      move(items.length - 1)
    }
  }

  const pickHint = pick ? hint?.(pick) : null

  return createPortal(
    // React bubbles portal events to the opener. Stop them here so a pick never counts as a desk click.
    <div
      className="roster-backdrop"
      data-testid="roster-backdrop"
      style={{ ["--rs-accent" as string]: `var(--ide-${accent})` } as CSSProperties}
      onClick={onClose}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div
        ref={dialogRef}
        className="roster"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`roster-title-${id}`}
        data-testid="roster"
        data-roster={id}
        onClick={(click) => click.stopPropagation()}
      >
        <header className="roster-head">
          <div>
            <p className="roster-kicker">{kicker}</p>
            <h2 id={`roster-title-${id}`} className="roster-title">
              {title}
            </h2>
          </div>
          <p className="roster-count" data-testid="roster-count">
            <strong>{formatNumber(unlocked)}</strong>
            {total !== undefined ? ` / ${formatNumber(total)}` : null}
            <span>unlocked</span>
          </p>
          <button type="button" className="roster-x" aria-label={`Close ${kicker} roster`} onClick={onClose}>
            <X {...UI_ICON} aria-hidden />
          </button>
        </header>
        {pick ? (
          <div className="roster-body">
            <figure className="roster-feature" data-locked={Boolean(pick.locked)} data-testid="roster-feature">
              <span className="roster-p1" aria-hidden>
                P1
              </span>
              {pick.art ? <img key={pick.key} src={pick.art} alt="" width={160} height={160} draggable={false} decoding="async" /> : null}
              <figcaption>
                <span className="roster-no">
                  {slot(pick.no)}
                  {pick.group ? ` · ${pick.group}` : ""}
                </span>
                <strong className="roster-name">{pick.locked ? "???" : pick.name}</strong>
                {!pick.locked && pick.logos?.length ? (
                  <ul className="roster-logos" data-testid="roster-logos" aria-label="Tools">
                    {pick.logos.map((logo) => (
                      <li key={logo.name} title={logo.name}>
                        <logo.Icon size={22} />
                        <span className="sr-only">{logo.name}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {!pick.locked && pick.count && pick.count > 1 ? <span className="roster-owned">×{formatNumber(pick.count)} owned</span> : null}
                {!pick.locked && pick.lines?.length ? (
                  <ul className="roster-lines">
                    {pick.lines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                ) : null}
                {pickHint ? <em className="roster-hint">{pickHint}</em> : null}
              </figcaption>
            </figure>
            <ul ref={listRef} className="roster-grid" role="listbox" aria-label={kicker} onKeyDown={onListKey}>
              {shown.map((item, index) => (
                <RosterCell
                  key={item.key}
                  item={item}
                  index={index}
                  active={index === cursor}
                  chosen={item.key === chosenKey}
                  chosenTag={chosenTag}
                  picks={Boolean(onChoose)}
                  onCursor={onCursor}
                  onPick={onPick}
                />
              ))}
            </ul>
          </div>
        ) : (
          <p className="roster-empty" data-testid="roster-empty">
            {empty}
          </p>
        )}
      </div>
    </div>,
    document.body,
  )
}
