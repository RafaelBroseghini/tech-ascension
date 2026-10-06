import { ArrowDownUp, Bug, ListOrdered, Medal, RefreshCw, Rocket, Ticket, Trophy, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties } from "react"
import { createPortal } from "react-dom"
import { HACK_MAX_PERKS, HACK_MAX_PLAY, HACK_ROUNDS, STACKS } from "../data/hackathon.ts"
import { playScoreBeat, playScoreChime } from "../game/deskAudio.ts"
import { production, skillById } from "../game/economy.ts"
import { formatNumber } from "../game/format.ts"
import {
  deckOf,
  drawCounts,
  evaluate,
  handById,
  hackReady,
  judgeById,
  leagueName,
  perkById,
  refactorsOf,
  roundTarget,
  runCard,
  shipsOf,
  stackCounts,
  targetOf,
} from "../game/hackathon.ts"
import type { HackPrize, HackRun, HackShot } from "../game/hackathon.ts"
import { hackUnlocked, roundPrize } from "../game/hackathonEconomy.ts"
import { replayFrames } from "../game/hackReplay.ts"
import type { ReplayFrame } from "../game/hackReplay.ts"
import { modsOf } from "../game/mods.ts"
import { moneyMode } from "../game/phase.ts"
import { useGame } from "../game/store.ts"
import { HackCardView, HandGuide, JudgeIcon, PerkTile, Pips, StackCounts } from "./HackathonParts.tsx"
import { UI_ICON } from "./icons/ui.tsx"

type Game = ReturnType<typeof useGame.getState>

type Replay = { shot: HackShot; frames: ReplayFrame[]; index: number }

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

const skillName = (id: number) => skillById(id)?.name ?? `Skill ${id}`

function clock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

function prizeText(prize: HackPrize): string {
  const parts: string[] = []
  if (prize.money > 0) parts.push(`+$${formatNumber(prize.money)}`)
  if (prize.xp > 0) parts.push(`+${formatNumber(prize.xp)} XP`)
  return parts.join(" · ") || "—"
}

/** Keys that belong to a focused control (a button's Enter or Space) are left to it. */
function ownedByControl(event: KeyboardEvent): boolean {
  const target = event.target
  return (event.key === "Enter" || event.key === " ") && target instanceof HTMLElement && Boolean(target.closest("button, a, input, textarea, select"))
}

// ---------- launcher ----------

/** Coarse on purpose: the activity bar only re-renders when the status or the minute changes. */
function launcherState(state: Game): string {
  const meta = state.hack
  if (!hackUnlocked(state, meta)) return "locked"
  if (meta.run) return meta.run.stage === "won" || meta.run.stage === "lost" ? "done" : "running"
  if (state.now >= meta.nextAt) return "open"
  return `wait:${Math.ceil((meta.nextAt - state.now) / 60_000)}`
}

/** The hackathon's spot in the editor's activity bar. A dot says registration is open or a run is waiting. */
export function HackathonLauncher() {
  const status = useGame(launcherState)
  const open = useGame((state) => state.openHackathon)
  if (status === "locked") return null
  const waiting = status.startsWith("wait:")
  const label =
    status === "open"
      ? "Hackathon: registration open"
      : status === "running"
        ? "Hackathon: your run is waiting"
        : status === "done"
          ? "Hackathon: results are in"
          : `Hackathon: next one in ${status.slice(5)} min`
  return (
    <button
      type="button"
      className={["ide-activity-btn", "hk-launch", waiting ? "" : `is-${status}`].filter(Boolean).join(" ")}
      data-testid="hackathon-launch"
      data-status={waiting ? "wait" : status}
      aria-label={label}
      title={label}
      onClick={() => open()}
    >
      <Medal className="ide-activity-icon hk-launch-icon" {...UI_ICON} size={18} aria-hidden />
      {waiting ? null : <i className="hk-launch-dot" aria-hidden />}
    </button>
  )
}

// ---------- overlay ----------

export function HackathonModal() {
  const open = useGame((state) => state.hackOpen)
  if (!open) return null
  return <HackathonDialog />
}

function HackathonDialog() {
  const hack = useGame((state) => state.hack)
  const close = useGame((state) => state.closeHackathon)
  const run = hack.run
  const [replay, setReplay] = useState<Replay | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Child effects run first and focus their screen's main button; keep that, or hold focus on the dialog.
    const dialog = dialogRef.current
    if (dialog && !dialog.contains(document.activeElement)) dialog.focus({ preventScroll: true })
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [close])

  // One beat at a time. The sound plays as its beat lands; the next beat is a timer away.
  const frame = replay ? replay.frames[replay.index] : undefined
  useEffect(() => {
    if (!replay || !frame) return
    if (frame.tone === "chips" || frame.tone === "mult" || frame.tone === "x") playScoreBeat(frame.beat, frame.tone)
    if (frame.phase === "banner") playScoreChime(replay.shot.outcome !== "lost")
    const id = window.setTimeout(() => {
      setReplay((current) => (current && current.index + 1 < current.frames.length ? { ...current, index: current.index + 1 } : null))
    }, frame.ms)
    return () => window.clearTimeout(id)
  }, [replay, frame])

  function shipped(shot: HackShot) {
    if (reducedMotion()) {
      if (shot.outcome !== "continue") playScoreChime(shot.outcome !== "lost")
      return
    }
    setReplay({ shot, frames: replayFrames(shot), index: 0 })
  }

  const screen = replay ? "table" : !run ? "lobby" : run.stage === "draft" ? "draft" : run.stage === "play" ? "table" : "summary"
  const league = leagueName(run?.league ?? hack.league)
  const roundIndex = run ? (replay?.shot.outcome === "cleared" ? run.round - 1 : run.round) : 0
  const title =
    screen === "lobby"
      ? `${league} Hackathon`
      : screen === "draft"
        ? "Pick your swag"
        : screen === "table"
          ? (HACK_ROUNDS[roundIndex]?.name ?? "")
          : run?.stage === "won"
            ? "Weekend won"
            : run?.round === HACK_ROUNDS.length - 1
              ? "Demo crashed"
              : "Build broke"
  const kicker = screen === "lobby" ? `${league} league · weekend hackathon` : `${league} league${screen === "summary" ? "" : ` · round ${Math.min(roundIndex + 1, 3)} of 3`}`

  return createPortal(
    <div className="hk-backdrop" data-testid="hackathon-backdrop" onPointerDown={(event) => event.stopPropagation()}>
      <div
        ref={dialogRef}
        className="hk"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hk-title"
        tabIndex={-1}
        data-testid="hackathon"
        data-screen={screen}
      >
        <header className="hk-head">
          <div>
            <p className="hk-kicker">{kicker}</p>
            <h2 id="hk-title" key={title} className="hk-title">
              {title}
            </h2>
          </div>
          {run && screen !== "lobby" ? <RoundTrack run={run} round={roundIndex} result={screen === "summary" ? run.stage : null} /> : null}
          <button type="button" className="hk-x" aria-label="Close hackathon" data-testid="hackathon-close" onClick={close}>
            <X {...UI_ICON} aria-hidden />
          </button>
        </header>
        {screen === "lobby" ? <Lobby /> : null}
        {screen === "draft" && run ? <Draft run={run} /> : null}
        {screen === "table" && run ? <Table run={run} replay={replay} onShipped={shipped} onSkip={() => setReplay(null)} /> : null}
        {screen === "summary" && run ? <Summary run={run} /> : null}
      </div>
    </div>,
    document.body,
  )
}

/** Fri, Sat, Sun pips: done, on now, or still to come. A finished run marks its last round won or lost. */
function RoundTrack({ run, round, result }: { run: HackRun; round: number; result: HackRun["stage"] | null }) {
  return (
    <ol className="hk-track" aria-label="Rounds">
      {HACK_ROUNDS.map((def, index) => {
        const state =
          index < round || (result === "won" && index === round) ? "done" : index === round ? (result === "lost" ? "lost" : "now") : "next"
        return (
          <li key={def.name} data-state={state} title={`${def.name} · ${formatNumber(roundTarget(run.league, index, run.judge))}`}>
            <span>{def.name.split(" ")[0]?.slice(0, 3)}</span>
          </li>
        )
      })}
    </ol>
  )
}

// ---------- lobby ----------

function usePrizes(league: number): HackPrize[] {
  const money = useGame((state) => state.money)
  const xp = useGame((state) => state.xp)
  const peakMoney = useGame((state) => state.peakMoney)
  const skills = useGame((state) => state.skills)
  const equipment = useGame((state) => state.equipment)
  const owned = useGame((state) => state.owned)
  const jobs = useGame((state) => state.jobs)
  const gigs = useGame((state) => state.gigs)
  const foreverMult = useGame((state) => state.foreverMult)
  const tempMults = useGame((state) => state.tempMults)
  const now = useGame((state) => state.now)
  return useMemo(() => {
    // The click boost is left out: the preview should not swing with a ten second boost.
    const rates = production({ skills, equipment, owned, jobs, gigs }, null, now, modsOf({ foreverMult, tempMults }))
    const earning = { cps: rates.idle, click: rates.click, xpPerSec: rates.xpIdle, xpPerClick: rates.xpClick }
    const paying = moneyMode({ peakMoney, gigs, jobs })
    return HACK_ROUNDS.map((_, round) => roundPrize(round, league, earning, { money, xp }, paying))
  }, [league, money, xp, peakMoney, skills, equipment, owned, jobs, gigs, foreverMult, tempMults, now])
}

function Lobby() {
  const meta = useGame((state) => state.hack)
  const wait = useGame((state) => Math.max(0, Math.ceil((state.hack.nextAt - state.now) / 1000)))
  const ready = useGame((state) => hackReady(state.hack, state.now))
  const skills = useGame((state) => state.skills)
  const start = useGame((state) => state.startHackathon)
  const prizes = usePrizes(meta.league)
  const deck = useMemo(() => deckOf(skills), [skills])
  const ids = useMemo(() => Object.keys(deck).map(Number), [deck])
  const registerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    registerRef.current?.focus({ preventScroll: true })
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter" && !ownedByControl(event)) start()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [start])

  return (
    <div className="hk-body hk-lobby" data-testid="hackathon-lobby">
      <section className="hk-poster">
        <p className={ready ? "hk-status is-open" : "hk-status"} data-testid="hackathon-status">
          <i aria-hidden />
          {ready ? "Registration open" : `Next weekend in ${clock(wait)}`}
        </p>
        <ol className="hk-rounds">
          {HACK_ROUNDS.map((round, index) => (
            <li key={round.name}>
              <span className="hk-rounds-name">{round.name}</span>
              <span className="hk-rounds-target">
                <small>Target</small>
                {formatNumber(roundTarget(meta.league, index, 0))}
                {index === HACK_ROUNDS.length - 1 ? <em>+ judge</em> : null}
              </span>
              <span className="hk-rounds-prize">≈ {prizeText(prizes[index] ?? { money: 0, xp: 0 })}</span>
            </li>
          ))}
        </ol>
        <button
          ref={registerRef}
          type="button"
          className="hk-cta"
          data-testid="hackathon-register"
          disabled={!ready}
          onClick={() => start()}
        >
          <Ticket {...UI_ICON} size={18} aria-hidden />
          {ready ? "Register" : `Opens in ${clock(wait)}`}
        </button>
        <dl className="hk-record">
          <div>
            <dt>Wins</dt>
            <dd>
              {formatNumber(meta.wins)}
              <small> / {formatNumber(meta.runs)}</small>
            </dd>
          </div>
          <div>
            <dt>Best ship</dt>
            <dd>{formatNumber(meta.best)}</dd>
          </div>
          <div>
            <dt>Top league</dt>
            <dd>{meta.topLeague >= 0 ? leagueName(meta.topLeague) : "—"}</dd>
          </div>
        </dl>
      </section>
      <section className="hk-brief">
        <h3>
          Your deck <b>{formatNumber(ids.length)} cards</b>
        </h3>
        <StackBar ids={ids} />
        <p className="hk-note">Every skill you hold is a card. Later skills and more copies are worth more chips.</p>
        <h3>How it plays</h3>
        <ol className="hk-how">
          <li>Ship up to five cards. Cards from one stack, or one from every stack, make a hand.</li>
          <li>A ship scores chips × mult. Reach the target before your ships run out.</li>
          <li>Pick sponsor swag before each round. Sunday's judge bends one rule.</li>
        </ol>
        <HandGuide />
      </section>
    </div>
  )
}

function StackBar({ ids }: { ids: number[] }) {
  const counts = stackCounts(ids)
  const total = Math.max(1, ids.length)
  return (
    <div className="hk-stackbar">
      <div className="hk-stackbar-track" aria-hidden>
        {STACKS.map((stack) =>
          counts[stack.id] > 0 ? <i key={stack.id} style={{ flexGrow: counts[stack.id] / total, background: stack.color }} /> : null,
        )}
      </div>
      <StackCounts counts={counts} label="Cards by stack" />
    </div>
  )
}

// ---------- draft ----------

function Draft({ run }: { run: HackRun }) {
  const pick = useGame((state) => state.hackPick)
  const offer = run.offer.map((id) => perkById(id)).filter((perk) => perk !== undefined)
  const judge = judgeById(run.judge)
  const firstRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    firstRef.current?.querySelector("button")?.focus({ preventScroll: true })
    const onKey = (event: KeyboardEvent) => {
      const slot = Number(event.key) - 1
      if (slot >= 0 && slot < run.offer.length) pick(slot)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [pick, run.offer.length])

  const cleared = run.cleared
  return (
    <div className="hk-body hk-draft" data-testid="hackathon-draft">
      <p className={cleared ? "hk-banner is-win" : "hk-banner"}>
        {cleared ? (
          <>
            <b>{HACK_ROUNDS[cleared.round]?.name} cleared</b>
            <span className="hk-banner-prize" data-testid="hackathon-prize">
              {prizeText(cleared)}
            </span>
          </>
        ) : (
          <>
            <b>Registration desk</b>
            <span>Sponsors are handing out swag. Take one; it lasts the whole weekend.</span>
          </>
        )}
      </p>
      <div ref={firstRef} className="hk-offer">
        {offer.map((perk, slot) => (
          <PerkTile key={perk.id} perk={perk} pick={{ slot, onPick: () => pick(slot) }} />
        ))}
      </div>
      <div className="hk-draft-foot">
        <SwagRow run={run} />
        {judge ? <JudgeCard judgeId={judge.id} active={false} /> : null}
        <p className="hk-next">
          Next: <b>{HACK_ROUNDS[run.round]?.name}</b> · target {formatNumber(targetOf(run))}
        </p>
      </div>
    </div>
  )
}

function SwagRow({ run, frame }: { run: HackRun; frame?: ReplayFrame }) {
  return (
    <div className="hk-swag" aria-label="Your swag">
      {Array.from({ length: HACK_MAX_PERKS }, (_, slot) => {
        const perk = perkById(run.perks[slot] ?? 0)
        if (!perk) {
          return (
            <div key={`empty-${slot}`} className="hk-perk is-empty">
              <span>Swag slot</span>
            </div>
          )
        }
        const lit = frame?.perk === perk.id
        const label = lit && frame?.phase === "perk" && frame.label ? { text: frame.label, tone: frame.tone ?? "mult" } : null
        return <PerkTile key={`${perk.id}-${lit && frame ? frame.beat : 0}`} perk={perk} lit={lit} label={label} />
      })}
    </div>
  )
}

function JudgeCard({ judgeId, active }: { judgeId: number; active: boolean }) {
  const judge = judgeById(judgeId)
  if (!judge) return null
  return (
    <div className={active ? "hk-judge is-active" : "hk-judge"} data-testid="hackathon-judge">
      <span className="hk-judge-icon">
        <JudgeIcon id={judge.id} />
      </span>
      <span className="hk-judge-text">
        <small>{active ? "Judging now" : "Sunday's judge"}</small>
        <b>{judge.name}</b>
        <span>{judge.blurb}</span>
        <q>{judge.quote}</q>
      </span>
    </div>
  )
}

// ---------- table ----------

/** Eases the round score toward its new value, so a ship lands as a count-up. */
function useCountUp(value: number, ms: number): number {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const start = performance.now()
    const a = from.current
    let raf = window.requestAnimationFrame(function step(time) {
      const k = reducedMotion() ? 1 : Math.min(1, (time - start) / ms)
      const next = a + (value - a) * (1 - (1 - k) ** 3)
      from.current = next
      setShown(next)
      if (k < 1) raf = window.requestAnimationFrame(step)
    })
    return () => window.cancelAnimationFrame(raf)
  }, [value, ms])
  return shown
}

type TableProps = {
  run: HackRun
  replay: Replay | null
  onShipped: (shot: HackShot) => void
  onSkip: () => void
}

function Table({ run, replay, onShipped, onSkip }: TableProps) {
  const ship = useGame((state) => state.hackShip)
  const refactor = useGame((state) => state.hackRefactor)
  const sortHand = useGame((state) => state.hackSort)
  const [picked, setPicked] = useState<number[]>([])
  const [guide, setGuide] = useState(false)
  const frame = replay ? replay.frames[replay.index] : undefined
  const shot = replay?.shot ?? null

  // Cards dealt by this ship wait for the replay to finish, then deal in.
  const hand = shot ? run.hand.filter((id) => !shot.drawn.includes(id)) : run.hand
  const live = picked.filter((id) => run.hand.includes(id))
  const indices = live.map((id) => run.hand.indexOf(id))
  // The selection in hand order, scored (five cards at most, so no memo). Selected cards outside the hand are
  // kickers: they ship but score nothing.
  const ordered = [...indices].sort((a, b) => a - b)
  const result = live.length > 0 && !shot ? evaluate(run, ordered) : null
  const preview = result ? { ...result, scoringIds: new Set(result.scoring.map((position) => run.hand[ordered[position] ?? -1])) } : null

  const roundIndex = shot?.outcome === "cleared" ? run.round - 1 : run.round
  const target = shot ? shot.target : targetOf(run)
  const counted = !frame || frame.phase === "count" || frame.phase === "banner"
  const shownScore = useCountUp(shot ? (counted ? shot.after : shot.before) : run.score, 520)
  const sunday = roundIndex === HACK_ROUNDS.length - 1
  const judge = judgeById(run.judge)
  const muteStack = sunday && judge?.rule.kind === "mute" ? judge.rule.stack : null

  const canShip = !shot && preview !== null && run.ships > 0
  const canRefactor = !shot && live.length > 0 && run.refactors > 0

  function toggle(id: number) {
    if (shot) return
    setPicked((current) => {
      const kept = current.filter((value) => run.hand.includes(value))
      if (kept.includes(id)) return kept.filter((value) => value !== id)
      return kept.length >= HACK_MAX_PLAY ? kept : [...kept, id]
    })
  }

  function doShip() {
    if (!canShip) return
    if (!ship(indices)) return
    setPicked([])
    const next = useGame.getState().hack.run?.shot
    if (next) onShipped(next)
  }

  function doRefactor() {
    if (!canRefactor) return
    if (refactor(indices)) setPicked([])
  }

  // The key handler is bound once; these refs hand it the current table.
  const actions = useRef({ doShip, doRefactor, toggle, onSkip, sort: () => sortHand(run.sort === "stack" ? "chips" : "stack") })
  const replayingRef = useRef(false)
  const handRef = useRef(hand)
  useEffect(() => {
    actions.current = { doShip, doRefactor, toggle, onSkip, sort: () => sortHand(run.sort === "stack" ? "chips" : "stack") }
    replayingRef.current = shot !== null
    handRef.current = hand
  })

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const act = actions.current
      if (replayingRef.current) {
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault()
          act.onSkip()
        }
        return
      }
      if (ownedByControl(event)) return
      const slot = Number(event.key)
      if (Number.isInteger(slot) && slot >= 1 && slot <= 9) {
        const id = handRef.current[slot - 1]
        if (id !== undefined) act.toggle(id)
      } else if (event.key === "Enter") act.doShip()
      else if (event.key === "r" || event.key === "R") act.doRefactor()
      else if (event.key === "s" || event.key === "S") act.sort()
      else if (event.key === "h" || event.key === "H") setGuide((open) => !open)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const outcomeText = shot?.outcome === "won" ? "Weekend won!" : shot?.outcome === "cleared" ? "Target reached!" : "Out of ships"
  const handName = shot ? handById(shot.hand).name : preview ? handById(preview.hand).name : null
  const chips = frame ? frame.chips : (preview?.chips ?? 0)
  const mult = frame ? frame.mult : (preview?.mult ?? 0)
  const landed = frame && (frame.phase === "total" || frame.phase === "count" || frame.phase === "banner")
  const total = shot ? (landed ? shot.score : null) : (preview?.score ?? null)
  const drawLeft = drawCounts(run)
  const announce = shot
    ? landed
      ? `${handName} scored ${formatNumber(shot.score)}. Round score ${formatNumber(shot.after)} of ${formatNumber(target)}.`
      : ""
    : preview
      ? `${handName}: ${formatNumber(preview.chips)} chips times ${formatNumber(preview.mult)} mult, ${formatNumber(preview.score)}.`
      : ""

  return (
    <div className="hk-body hk-table" data-testid="hackathon-table" data-replay={shot ? frame?.phase : undefined}>
      <aside className="hk-side">
        <div className="hk-goal">
          <span className="hk-label">Target</span>
          <b className="hk-goal-target" data-testid="hackathon-target">
            {formatNumber(target)}
          </b>
          <span className="hk-label">Score</span>
          <b className="hk-goal-score" data-testid="hackathon-score">
            {formatNumber(Math.floor(shownScore))}
          </b>
          <span className="hk-meter" aria-hidden>
            <i style={{ width: `${Math.min(100, (shownScore / Math.max(1, target)) * 100)}%` }} />
          </span>
        </div>
        <div className="hk-tally">
          <span className="hk-label">Ships</span>
          <Pips total={shipsOf(run)} left={run.ships} label="ships left" tone="var(--hk-rule)" />
          <span className="hk-label">Refactors</span>
          <Pips total={refactorsOf({ ...run, round: roundIndex })} left={run.refactors} label="refactors left" tone="var(--hk-chips)" />
        </div>
        <div className="hk-deck">
          <span className="hk-label">
            Deck <b>{run.draw.length}</b> left
          </span>
          <StackCounts counts={drawLeft} label="Cards left in the deck by stack" />
        </div>
        <JudgeCard judgeId={run.judge} active={sunday} />
      </aside>
      <section className="hk-main">
        <SwagRow run={run} frame={frame} />
        <div className="hk-board" onClick={shot ? onSkip : undefined} data-testid="hackathon-board">
          <div className={handName ? "hk-hand-name" : "hk-hand-name is-empty"}>
            {handName ?? `Pick up to ${HACK_MAX_PLAY} cards`}
            {!shot && preview?.repeat ? <em>Repeat · scores 0</em> : null}
          </div>
          <div className={["hk-sum", landed ? "is-landed" : "", !shot && !preview ? "is-empty" : ""].filter(Boolean).join(" ")}>
            <span className="hk-sum-chips" key={`c${frame ? replay?.index : chips}`}>
              {formatNumber(chips)}
            </span>
            <span className="hk-sum-times">×</span>
            <span className="hk-sum-mult" key={`m${frame ? replay?.index : mult}`}>
              {formatNumber(mult)}
            </span>
            {total !== null ? (
              <span className="hk-sum-total" data-testid="hackathon-preview" key={shot ? `t${shot.seq}` : "t"}>
                = {formatNumber(total)}
              </span>
            ) : null}
          </div>
          {shot ? (
            <div className="hk-played">
              {shot.cards.map((played, index) => {
                const lit = frame?.card === index
                const label = lit && frame?.phase === "card" && frame.label ? { text: frame.label, tone: frame.tone ?? "chips" } : null
                return (
                  <HackCardView
                    key={played.skillId}
                    card={runCard(run, played.skillId)}
                    name={skillName(played.skillId)}
                    lit={lit}
                    dim={!played.scoring}
                    muted={played.muted}
                    label={label}
                  />
                )
              })}
            </div>
          ) : null}
          {frame?.phase === "banner" ? (
            <p className={shot?.outcome === "lost" ? "hk-outcome is-lost" : "hk-outcome"} data-testid="hackathon-outcome">
              {outcomeText}
            </p>
          ) : null}
          {shot ? <p className="hk-skip">Click or press Space to skip</p> : null}
          {!shot && !preview ? (
            <p className="hk-hint">
              Pick cards with a click or <kbd>1</kbd>–<kbd>{Math.min(9, hand.length)}</kbd>, then ship with <kbd>Enter</kbd>.
            </p>
          ) : null}
        </div>
        <div className="hk-hand" data-testid="hackathon-hand">
          {hand.map((id, index) => (
            <HackCardView
              key={id}
              card={runCard(run, id)}
              name={skillName(id)}
              slot={index}
              deal={index}
              selected={live.includes(id)}
              kicker={preview !== null && live.includes(id) && !preview.scoringIds.has(id)}
              muted={runCard(run, id).stack === muteStack}
              onToggle={() => toggle(id)}
            />
          ))}
        </div>
        <div className="hk-actions">
          <button type="button" className="hk-btn" data-testid="hackathon-refactor" disabled={!canRefactor} onClick={doRefactor}>
            <RefreshCw {...UI_ICON} aria-hidden />
            Refactor
            <kbd>R</kbd>
          </button>
          <button
            type="button"
            className="hk-btn is-quiet"
            data-testid="hackathon-sort"
            disabled={Boolean(shot)}
            onClick={() => sortHand(run.sort === "stack" ? "chips" : "stack")}
          >
            <ArrowDownUp {...UI_ICON} aria-hidden />
            By {run.sort === "stack" ? "stack" : "chips"}
            <kbd>S</kbd>
          </button>
          <button type="button" className="hk-btn is-quiet" aria-expanded={guide} onClick={() => setGuide((open) => !open)}>
            <ListOrdered {...UI_ICON} aria-hidden />
            Hands
            <kbd>H</kbd>
          </button>
          <span className="hk-actions-gap" />
          <button type="button" className="hk-btn is-ship" data-testid="hackathon-ship" disabled={!canShip} onClick={doShip}>
            <Rocket {...UI_ICON} aria-hidden />
            Ship it
            <kbd>Enter</kbd>
          </button>
        </div>
        {guide ? (
          <div className="hk-guide-pop" role="dialog" aria-label="Hands">
            <HandGuide compact />
          </div>
        ) : null}
        <p className="sr-only" aria-live="polite">
          {announce}
        </p>
      </section>
    </div>
  )
}

// ---------- summary ----------

/** A burst of stack-colored shards from the trophy, laid out once per mount. */
function Confetti() {
  const [bits] = useState(() =>
    Array.from({ length: 26 }, (_, index) => {
      const angle = (index / 26) * Math.PI * 2 + Math.random() * 0.4
      const dist = 90 + Math.random() * 120
      return {
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist - 30,
        rot: Math.random() * 540 - 270,
        color: STACKS[index % STACKS.length]?.color ?? "var(--hk-accent)",
        delay: Math.random() * 120,
      }
    }),
  )
  return (
    <span className="hk-confetti">
      {bits.map((bit, index) => (
        <i
          key={index}
          style={
            {
              background: bit.color,
              ["--dx" as string]: `${bit.dx}px`,
              ["--dy" as string]: `${bit.dy}px`,
              ["--rot" as string]: `${bit.rot}deg`,
              animationDelay: `${bit.delay}ms`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  )
}

function Summary({ run }: { run: HackRun }) {
  const finish = useGame((state) => state.finishHackathon)
  const meta = useGame((state) => state.hack)
  const wait = useGame((state) => Math.max(0, Math.ceil((state.hack.nextAt - state.now) / 1000)))
  const won = run.stage === "won"
  const backRef = useRef<HTMLButtonElement>(null)
  const roundsWon = won ? HACK_ROUNDS.length : run.round

  useEffect(() => {
    backRef.current?.focus({ preventScroll: true })
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter" && !ownedByControl(event)) finish()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [finish])

  const lastTarget = targetOf(run)
  return (
    <div className={won ? "hk-body hk-summary is-won" : "hk-body hk-summary"} data-testid="hackathon-summary">
      <div className="hk-summary-icon" aria-hidden>
        {won ? <Trophy size={52} strokeWidth={1.75} /> : <Bug size={52} strokeWidth={1.75} />}
        {won ? <Confetti /> : null}
      </div>
      <p className="hk-summary-line">
        {won
          ? `You won the ${leagueName(run.league)} hackathon.`
          : `${HACK_ROUNDS[run.round]?.name} fell short: ${formatNumber(run.score)} of ${formatNumber(lastTarget)}.`}
      </p>
      <dl className="hk-summary-stats">
        <div>
          <dt>Rounds won</dt>
          <dd>
            {roundsWon} / {HACK_ROUNDS.length}
          </dd>
        </div>
        <div>
          <dt>Prizes</dt>
          <dd data-testid="hackathon-earned">
            {run.earned.money > 0 ? <span>+${formatNumber(run.earned.money)}</span> : null}
            {run.earned.xp > 0 ? <span>+{formatNumber(run.earned.xp)} XP</span> : null}
            {run.earned.money <= 0 && run.earned.xp <= 0 ? "—" : null}
          </dd>
        </div>
        <div>
          <dt>Best ship</dt>
          <dd>{formatNumber(run.best)}</dd>
        </div>
        <div>
          <dt>League</dt>
          <dd>{won ? `Up to ${leagueName(meta.league)}` : `Still ${leagueName(meta.league)}`}</dd>
        </div>
      </dl>
      <p className="hk-summary-next">Next weekend in {clock(wait)}</p>
      <button ref={backRef} type="button" className="hk-cta" data-testid="hackathon-finish" onClick={() => finish()}>
        Back to the desk
      </button>
    </div>
  )
}
