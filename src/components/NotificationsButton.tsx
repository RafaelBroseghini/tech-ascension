import { Bell, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { agoLabel } from "../game/careerLog.ts"
import { notificationsOf, unreadCount } from "../game/notifications.ts"
import { useGame } from "../game/store.ts"
import { openSurface } from "../game/surfaces.ts"
import { UI_ICON } from "./icons/ui.tsx"
import { useAdmin } from "./useFeature.ts"
import { useFocusTrap } from "./useFocusTrap.ts"

/** The unlock history, an activity-bar bell. It appears with the first unlock and counts the ones not used yet. */
export function NotificationsButton() {
  const [open, setOpen] = useState(false)
  const entries = useGame((state) => state.journal.entries)
  const fresh = useGame((state) => state.fresh)
  const admin = useAdmin()
  const list = useMemo(() => notificationsOf(entries, admin), [entries, admin])
  if (list.length === 0) return null
  const unread = unreadCount(list, fresh)
  return (
    <>
      <button
        type="button"
        className="ide-activity-btn"
        data-testid="notifications-open"
        aria-label={unread > 0 ? `Notifications, ${unread} new` : "Notifications"}
        title="Notifications"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Bell className="ide-activity-icon" {...UI_ICON} aria-hidden />
        {unread > 0 ? (
          <i className="ide-activity-count" data-testid="notifications-count" aria-hidden>
            {unread > 9 ? "9+" : unread}
          </i>
        ) : null}
      </button>
      {open ? <NotificationsModal list={list} onClose={() => setOpen(false)} /> : null}
    </>
  )
}

function NotificationsModal({ list, onClose }: { list: ReturnType<typeof notificationsOf>; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const fresh = useGame((state) => state.fresh)
  const seeFeature = useGame((state) => state.seeFeature)
  const [now] = useState(() => Date.now())
  useFocusTrap(dialogRef)

  useEffect(() => {
    dialogRef.current?.focus({ preventScroll: true })
    const onKey = (key: KeyboardEvent) => {
      if (key.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return createPortal(
    <div className="stats-backdrop" data-testid="notifications-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="stats-modal notifications-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notifications-title"
        tabIndex={-1}
        data-testid="notifications-modal"
        onClick={(click) => click.stopPropagation()}
      >
        <header className="stats-head">
          <div>
            <p className="event-kicker">Newest first</p>
            <h2 id="notifications-title" className="stats-title">
              Notifications
            </h2>
          </div>
          <button type="button" className="stats-x" aria-label="Close notifications" onClick={onClose}>
            <X {...UI_ICON} aria-hidden />
          </button>
        </header>
        <ol className="career-log-list notifications-list" data-testid="notifications-list">
          {list.map((item) => {
            const surface = item.surface
            return (
              <li key={item.seq} data-tone="unlock" className={fresh.includes(item.id) ? "is-new" : undefined}>
                <b>
                  {item.name}
                  {fresh.includes(item.id) ? <span className="career-log-tag">NEW</span> : null}
                </b>
                <small>
                  {item.blurb} · {agoLabel(item.at, now)}
                </small>
                {surface ? (
                  <button
                    type="button"
                    className="notifications-open"
                    onClick={() => {
                      seeFeature(item.id)
                      onClose()
                      openSurface(surface)
                    }}
                  >
                    Open
                  </button>
                ) : null}
              </li>
            )
          })}
        </ol>
      </div>
    </div>,
    document.body,
  )
}
