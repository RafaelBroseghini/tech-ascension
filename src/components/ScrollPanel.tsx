import { ArrowDown } from "lucide-react"
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from "react"
import { UI_ICON } from "./icons/ui.tsx"

type ScrollEl = HTMLDivElement | HTMLUListElement

export type ScrollPanelProps = {
  as?: "div" | "ul"
  wrapClassName?: string
  className?: string
  scrollRef?: Ref<ScrollEl>
  showArrow?: boolean
  /** Tells the parent when the list overflows, so it can draw its own jump button elsewhere. */
  onOverflowChange?: (overflow: boolean) => void
  onScrollBottom?: () => void
  arrowLabel?: string
  arrowTitle?: string
  testId?: string
  children: ReactNode
} & Omit<HTMLAttributes<ScrollEl>, "className" | "children">

function mergeRef<T>(target: Ref<T> | undefined, value: T | null) {
  if (!target) return
  if (typeof target === "function") target(value)
  else target.current = value
}

export function ScrollPanel({
  as = "div",
  wrapClassName,
  className,
  scrollRef,
  showArrow = true,
  onOverflowChange,
  onScrollBottom,
  arrowLabel = "Scroll to bottom",
  arrowTitle = "Scroll to bottom",
  testId = "panel-scroll-end",
  children,
  ...scrollProps
}: ScrollPanelProps) {
  const Tag = as
  const localRef = useRef<ScrollEl | null>(null)
  const [overflow, setOverflow] = useState(false)

  const setRef = useCallback(
    (node: ScrollEl | null) => {
      localRef.current = node
      mergeRef(scrollRef, node)
    },
    [scrollRef],
  )

  useEffect(() => {
    const el = localRef.current
    if (!el) return
    const check = () => {
      const next = el.scrollHeight - el.clientHeight > 6
      setOverflow(next)
      onOverflowChange?.(next)
    }
    check()
    el.addEventListener("scroll", check, { passive: true })
    const ro = new ResizeObserver(check)
    ro.observe(el)
    const mo = new MutationObserver(check)
    mo.observe(el, { childList: true, subtree: true })
    return () => {
      el.removeEventListener("scroll", check)
      ro.disconnect()
      mo.disconnect()
    }
  }, [onOverflowChange])

  function scrollBottom() {
    if (onScrollBottom) onScrollBottom()
    else localRef.current?.scrollTo({ top: localRef.current.scrollHeight, behavior: "smooth" })
  }

  const scrollClass = ["panel-scroll", className].filter(Boolean).join(" ")

  return (
    <div className={["panel-scroll-wrap", wrapClassName].filter(Boolean).join(" ")}>
      <Tag ref={setRef} className={scrollClass} {...scrollProps}>
        {children}
      </Tag>
      {showArrow && overflow ? (
        <button
          type="button"
          className="panel-scroll-end"
          data-testid={testId}
          aria-label={arrowLabel}
          title={arrowTitle}
          onClick={scrollBottom}
        >
          <ArrowDown {...UI_ICON} strokeWidth={2.5} aria-hidden />
        </button>
      ) : null}
    </div>
  )
}
