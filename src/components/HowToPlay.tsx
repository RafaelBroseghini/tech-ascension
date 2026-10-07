import { CircleHelp } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { GOLD_SKILLS } from "../data/gold.ts"
import { UI_ICON_SM } from "./icons/ui.tsx"

const LAST_TROPHY = GOLD_SKILLS[GOLD_SKILLS.length - 1]?.name ?? "the last 10x dev skill"

const STEPS: readonly { title: string; text: string }[] = [
  { title: "Click the emoji", text: "Every click is XP. Spend it on skills: study, level up, repeat." },
  { title: "Skills open gigs", text: "Learn enough and the Gig Board opens. Gigs pay your first real dollars." },
  { title: "Gigs open jobs", text: "Jobs cost XP and pay a salary every second, even while you are away." },
  {
    title: "Pass the whiteboard",
    text: "Twelve jobs also want a system design interview. Open the whiteboard from the bar on the left, drag in servers, databases and caches, wire them up and submit. A No hire costs some XP. Your last passed design hangs on the desk behind the emoji.",
  },
  { title: "Gear and capital", text: "Spend dollars on desk upgrades, then on companies, rockets and Mars. Bigger clicks, bigger income." },
  { title: "Leave and come back", text: "The game keeps earning while you are gone, up to 8 hours. Check in, shop, leave again." },
  { title: "Collect trophies", text: "The 10x dev tab holds one-off perks: buy in bulk, hover to click, stay away longer." },
]

/** A short, friendly rundown of the game, opened from the top of the settings menu. */
export function HowToPlay() {
  const [open, setOpen] = useState(false)
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    dialogRef.current?.focus({ preventScroll: true })
    const onKey = (key: KeyboardEvent) => {
      if (key.key !== "Escape") return
      key.stopPropagation()
      setOpen(false)
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [open])

  return (
    <section className="ide-settings-section">
      <button type="button" className="ide-howto" data-testid="how-to-play" onClick={() => setOpen(true)}>
        <CircleHelp {...UI_ICON_SM} aria-hidden />
        How to play
      </button>
      {open
        ? createPortal(
            <div className="event-backdrop" data-wipe-modal data-testid="howto-backdrop" onClick={() => setOpen(false)}>
              <div
                ref={dialogRef}
                className="event-modal howto-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                data-testid="howto-panel"
                onClick={(click) => click.stopPropagation()}
              >
                <h2 id={titleId} className="event-title">
                  How to play
                </h2>
                <ol className="howto-steps">
                  {STEPS.map((step) => (
                    <li key={step.title}>
                      <b>{step.title}.</b> {step.text}
                    </li>
                  ))}
                </ol>
                <p className="howto-end" data-testid="howto-end">
                  <b>How do you know you are done?</b> You will know. The last trophy is <b>{LAST_TROPHY}</b>. If you do not have it yet,
                  keep clicking.
                </p>
                <div className="event-actions">
                  <button type="button" className="event-choice" data-testid="howto-close" onClick={() => setOpen(false)}>
                    Got it
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  )
}
