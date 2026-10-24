import { Check, Crown, DoorOpen, Lock } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { HALL_OF_FAME, LEGACY_PERKS, TRACKS } from "../data/legacy.ts"
import { formatNumber } from "../game/format.ts"
import { canBuyPerk, legacyPerkById } from "../game/legacy.ts"
import { prestigeMult } from "../game/mods.ts"
import { useGame } from "../game/store.ts"
import { UI_ICON_SM } from "./icons/ui.tsx"
import { useAdmin, useExitState, useExitVisible } from "./useExit.ts"
import { useFocusTrap } from "./useFocusTrap.ts"
import { ModalBackdrop } from "./ModalBackdrop.tsx"

const times = (mult: number) => `×${Number(mult.toFixed(2))}`

/** What an Exit resets and what it keeps, as the confirmation card lists them. */
const RESETS = [
  "Money, XP, skills, gigs, jobs",
  "Gear and capital",
  "The product: users, regions, hires, the win",
  "Click boost and event bonuses",
]
const KEEPS = [
  "Prestige, the bonus and Legacy perks",
  "The Hall of Fame",
  "10x dev skills",
  "Your handle, career log, desk and unlocks",
  "GitHug and LinkedOut",
]

/**
 * The Sell button: what selling the product would pay now, and a confirmation card that lists what starts over and what
 * stays. The very first Exit asks twice, and its second card names the losses in words. It lives in the Company tab and in
 * the Prestige panel.
 */
export function SellButton() {
  const visible = useExitVisible()
  const { legacy, gain, can } = useExitState()
  const product = useGame((state) => state.profile.product)
  const exit = useGame((state) => state.exit)
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const cancel = useCallback(() => setStep(0), [])
  if (!visible) return null
  const first = legacy.runs === 1
  const label = can ? `Sell ${product}: +${gain} Prestige (${times(prestigeMult(legacy.prestigeTotal))} → ${times(prestigeMult(legacy.prestigeTotal + gain))})` : `Sell ${product}: no new Prestige yet`

  return (
    <div className="exit-bar">
      <button type="button" className="exit-button" data-testid="exit-button" disabled={!can} onClick={() => setStep(1)}>
        <DoorOpen {...UI_ICON_SM} aria-hidden />
        {label}
      </button>
      {step !== 0 ? (
        <ExitConfirm
          step={step}
          first={first}
          gain={gain}
          product={product}
          onNext={() => (first && step === 1 ? setStep(2) : (exit(), setStep(0)))}
          onCancel={cancel}
        />
      ) : null}
    </div>
  )
}

function ExitConfirm({ step, first, gain, product, onNext, onCancel }: { step: 1 | 2; first: boolean; gain: number; product: string; onNext: () => void; onCancel: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef)
  useEffect(() => {
    dialogRef.current?.focus({ preventScroll: true })
    // Capture phase, and the Prestige panel behind never sees it: Escape closes this card only.
    const onKey = (key: KeyboardEvent) => {
      if (key.key !== "Escape") return
      key.stopImmediatePropagation()
      onCancel()
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [step, onCancel])

  return createPortal(
    <ModalBackdrop className="event-backdrop" data-testid="exit-backdrop" onClick={onCancel}>
      <div
        ref={dialogRef}
        key={step}
        className="event-modal exit-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-title"
        tabIndex={-1}
        data-testid="exit-confirm"
        onClick={(click) => click.stopPropagation()}
      >
        <p className="event-kicker">{step === 2 ? "Are you sure?" : "The Exit"}</p>
        <h2 id="exit-title" className="event-title">
          {step === 2 ? "This is your first Exit" : `Sell ${product} for +${gain} Prestige?`}
        </h2>
        {step === 2 ? (
          <p className="event-flavor" data-testid="exit-first-warning">
            Your money, XP, skills, gigs, jobs, gear and capital start over, and so does {product}: its users, regions, team and the win. You get a new
            product to build. The Prestige, the bonus it gives, your Legacy perks and the Hall of Fame are yours for good. Nothing else is lost.
          </p>
        ) : (
          <div className="exit-lists">
            <div>
              <h3>Starts over</h3>
              <ul>
                {RESETS.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Stays</h3>
              <ul>
                {KEEPS.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        <div className="event-actions">
          <button type="button" className="event-choice event-yes" data-testid="exit-yes" onClick={onNext}>
            {first && step === 1 ? "Continue" : "Sell"}
          </button>
          <button type="button" className="event-choice event-no" data-testid="exit-no" onClick={onCancel}>
            Stay
          </button>
        </div>
      </div>
    </ModalBackdrop>,
    document.body,
  )
}

/** The full-screen headline after an Exit: how the product ended, the Prestige it paid, a new Hall of Fame entry, the new bonus. */
export function ExitHeadline() {
  const card = useGame((state) => state.exitCard)
  const dismiss = useGame((state) => state.dismissExitCard)
  const admin = useAdmin()
  const doneRef = useRef<HTMLButtonElement>(null)
  const headlineRef = useRef<HTMLDivElement>(null)
  useFocusTrap(headlineRef, Boolean(card && admin))
  useEffect(() => {
    if (!card || !admin) return
    doneRef.current?.focus({ preventScroll: true })
    const onKey = (key: KeyboardEvent) => {
      if (key.key === "Escape") dismiss()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [card, admin, dismiss])
  if (!card || !admin) return null
  const entry = card.newEnding ? HALL_OF_FAME.find((row) => row.id === card.newEnding) : undefined
  return createPortal(
    <ModalBackdrop className="event-backdrop exit-headline-backdrop" data-testid="exit-headline" onClick={dismiss}>
      <div ref={headlineRef} className="event-modal exit-headline" role="dialog" aria-modal="true" aria-labelledby="exit-headline-text" onClick={(click) => click.stopPropagation()}>
        <p className="event-kicker">Career {card.run} closed</p>
        <h2 id="exit-headline-text" className="event-title">
          {card.headline}
        </h2>
        <p className="event-line is-good">+{card.prestigeEarned} Prestige</p>
        {entry ? (
          <p className="event-line is-good" data-testid="exit-hall-of-fame">
            New in the Hall of Fame: {entry.name} (+{card.endingBonus} Prestige)
          </p>
        ) : null}
        <p className="event-flavor">Every income and XP stream, and your product's growth, is now {times(card.mult)}.</p>
        <div className="event-actions">
          <button ref={doneRef} type="button" className="event-choice event-yes" data-testid="exit-headline-done" onClick={dismiss}>
            Start the next career
          </button>
        </div>
      </div>
    </ModalBackdrop>,
    document.body,
  )
}

/** The Legacy perks, grouped by track: what Prestige buys. Each waits on the one before it in its track. */
function PerkList() {
  const legacy = useGame((state) => state.legacy)
  const buyLegacy = useGame((state) => state.buyLegacy)
  return (
    <>
      {TRACKS.map((track) => (
        <section key={track.id} className="legacy-track" data-testid={`legacy-track-${track.id}`}>
          <h3 className="legacy-track-head">
            {track.name}
            <span>{track.line}</span>
          </h3>
          {LEGACY_PERKS.filter((perk) => perk.track === track.id).map((perk, index, row) => {
            const owned = legacy.perks.includes(perk.id)
            const before = index > 0 ? row[index - 1] : undefined
            const waiting = !owned && before !== undefined && !legacy.perks.includes(before.id)
            const afford = canBuyPerk(legacy, perk.id)
            return (
              <div key={perk.id} className={["legacy-perk", owned ? "is-owned" : "", afford ? "afford" : ""].filter(Boolean).join(" ")} data-testid={`legacy-${perk.id}`}>
                <div className="legacy-perk-text">
                  <h4>{perk.name}</h4>
                  <p>{perk.blurb}</p>
                  {waiting ? <p className="legacy-wait">After {legacyPerkById(before.id)?.name}</p> : null}
                </div>
                {owned ? (
                  <span className="legacy-owned">
                    <Check {...UI_ICON_SM} aria-hidden /> Owned
                  </span>
                ) : (
                  <button type="button" disabled={!afford} onClick={() => buyLegacy(perk.id)}>
                    {waiting ? <Lock {...UI_ICON_SM} aria-hidden /> : null}
                    {perk.cost} Prestige
                  </button>
                )}
              </div>
            )
          })}
        </section>
      ))}
    </>
  )
}

/** The two endings, each shown once a career has won the world with it, `???` until then. */
function HallOfFame() {
  const endings = useGame((state) => state.legacy.endings)
  return (
    <section className="legacy-track" data-testid="hall-of-fame">
      <h3 className="legacy-track-head">
        Hall of Fame<span>{endings.length} of {HALL_OF_FAME.length}: win the world all three ways</span>
      </h3>
      <ul className="hall-list">
        {HALL_OF_FAME.map((entry) => {
          const owned = endings.includes(entry.id)
          return (
            <li key={entry.id} className={owned ? "hall-entry is-owned" : "hall-entry"} data-testid={`hall-${entry.id}`}>
              <Crown {...UI_ICON_SM} aria-hidden />
              <strong>{owned ? entry.name : "???"}</strong>
              <span>{owned ? entry.blurb : "Not won yet"}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** The Prestige panel: sell the product, spend Prestige on Legacy perks, and the Hall of Fame. Opened from the activity bar; Escape closes it. */
export function PrestigePanel({ onClose }: { onClose: () => void }) {
  const legacy = useGame((state) => state.legacy)
  const dialogRef = useRef<HTMLDivElement>(null)
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
    <ModalBackdrop className="event-backdrop" data-testid="prestige-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="event-modal prestige-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prestige-title"
        tabIndex={-1}
        data-testid="prestige-panel"
        onClick={(click) => click.stopPropagation()}
      >
        <h2 id="prestige-title" className="event-title">
          Prestige
        </h2>
        <SellButton />
        <p className="legacy-summary" data-testid="prestige-summary">
          <strong>{formatNumber(legacy.prestige)} Prestige</strong> to spend · bonus {times(prestigeMult(legacy.prestigeTotal))} from {formatNumber(legacy.prestigeTotal)} earned
        </p>
        <div className="prestige-scroll">
          <PerkList />
          <HallOfFame />
        </div>
        <div className="event-actions">
          <button type="button" className="event-choice event-no" data-testid="prestige-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </ModalBackdrop>,
    document.body,
  )
}
