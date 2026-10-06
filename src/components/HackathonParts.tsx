import {
  AppWindow,
  Archive,
  BellRing,
  Bird,
  BookOpen,
  Bot,
  BrainCircuit,
  Cloud,
  CloudCog,
  Coffee,
  Cpu,
  Crown,
  CupSoda,
  Database,
  FolderTree,
  GitPullRequestArrow,
  Glasses,
  GraduationCap,
  Headphones,
  IdCardLanyard,
  Landmark,
  LayoutTemplate,
  Megaphone,
  Monitor,
  Palette,
  Pizza,
  Presentation,
  Rocket,
  Server,
  Shirt,
  Sticker,
  Target,
  WandSparkles,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { memo, useState } from "react"
import type { CSSProperties, ReactNode } from "react"
import { HANDS, stackById, STACKS } from "../data/hackathon.ts"
import type { Perk, PerkEffect, StackId } from "../data/hackathon.ts"
import { emojiIdleUrl } from "../data/emojiAssets.ts"
import { formatNumber } from "../game/format.ts"
import type { HackCard } from "../game/hackathon.ts"

const STACK_ICON: Record<StackId, LucideIcon> = {
  front: LayoutTemplate,
  back: Server,
  ops: CloudCog,
  data: BrainCircuit,
  craft: BookOpen,
}

const PERK_ICON: Record<number, LucideIcon> = {
  1: CupSoda,
  2: Bird,
  3: Palette,
  4: Database,
  5: BellRing,
  6: Cpu,
  7: Headphones,
  8: Pizza,
  9: AppWindow,
  10: Monitor,
  11: Shirt,
  12: IdCardLanyard,
  13: Coffee,
  14: WandSparkles,
  15: FolderTree,
  16: Sticker,
  17: Archive,
  18: GraduationCap,
  19: Target,
  20: GitPullRequestArrow,
}

const JUDGE_ICON: Record<number, LucideIcon> = {
  1: Server,
  2: Cloud,
  3: Rocket,
  4: Bot,
  5: Megaphone,
  6: Landmark,
  7: Crown,
  8: Glasses,
  9: Presentation,
}

/** The color a swag tile wears says what it does: chips blue, mult red, multipliers peach, rules green. */
function perkTone(effect: PerkEffect): string {
  if (effect.kind === "stackMult") return stackById(effect.stack).color
  if (effect.kind === "chips" || effect.kind === "cardChips" || effect.kind === "levelChips") return "var(--hk-chips)"
  if (effect.kind === "handX" || effect.kind === "firstX" || effect.kind === "lastX" || effect.kind === "smallX") return "var(--hk-x)"
  if (effect.kind === "ships" || effect.kind === "refactors" || effect.kind === "handSize") return "var(--hk-rule)"
  return "var(--hk-mult)"
}

export function StackIcon({ stack, size = 14 }: { stack: StackId; size?: number }) {
  const Icon = STACK_ICON[stack]
  return <Icon size={size} strokeWidth={2.25} aria-hidden />
}

export function JudgeIcon({ id, size = 18 }: { id: number; size?: number }) {
  const Icon = JUDGE_ICON[id] ?? Presentation
  return <Icon size={size} strokeWidth={2} aria-hidden />
}

type CardProps = {
  card: HackCard
  name: string
  /** Hand position, shown as the keyboard hint. Omitted on played cards. */
  slot?: number
  selected?: boolean
  /** Selected but outside the hand the selection makes: it ships and scores nothing. */
  kicker?: boolean
  /** Muted by Sunday's judge: still part of the hand, scores nothing. */
  muted?: boolean
  /** Lit on this beat of the scoring replay. */
  lit?: boolean
  /** A played card that is not part of the hand. */
  dim?: boolean
  /** Stagger for the deal-in, in cards. */
  deal?: number
  /** Floating text on this beat. */
  label?: { text: string; tone: string } | null
  onToggle?: () => void
}

/** A skill as a playing card: stack band and chips on top, the shop's art, the name, and level pips. */
export const HackCardView = memo(function HackCardView({ card, name, slot, selected, kicker, muted, lit, dim, deal, label, onToggle }: CardProps) {
  const stack = stackById(card.stack)
  const [broken, setBroken] = useState(false)
  const art = emojiIdleUrl("skill", card.skillId)
  const className = [
    "hk-card",
    selected ? "is-selected" : "",
    kicker ? "is-kicker" : "",
    muted ? "is-muted" : "",
    lit ? "is-lit" : "",
    dim ? "is-dim" : "",
    deal !== undefined ? "is-dealt" : "",
  ]
    .filter(Boolean)
    .join(" ")
  const style = { ["--stk" as string]: stack.color, ["--deal" as string]: String(deal ?? 0) } as CSSProperties
  const body: ReactNode = (
    <>
      <span className="hk-card-top">
        <span className="hk-card-stack" title={stack.name}>
          <StackIcon stack={card.stack} />
        </span>
        <b className="hk-card-chips">{formatNumber(card.chips)}</b>
      </span>
      <span className="hk-card-art" aria-hidden>
        {art && !broken ? <img src={art} alt="" width={48} height={48} draggable={false} decoding="async" onError={() => setBroken(true)} /> : <StackIcon stack={card.stack} size={30} />}
      </span>
      <span className="hk-card-name">{name}</span>
      <span className="hk-card-level" aria-hidden>
        {Array.from({ length: 5 }, (_, index) => (
          <i key={index} className={index < card.level ? "is-on" : ""} />
        ))}
      </span>
      {slot !== undefined ? (
        <kbd className="hk-card-key" aria-hidden>
          {slot + 1}
        </kbd>
      ) : null}
      {muted ? <span className="hk-card-mute">Muted</span> : null}
      {label ? (
        <span key={label.text} className="hk-float" data-tone={label.tone}>
          {label.text}
        </span>
      ) : null}
    </>
  )
  const aria = `${name}, ${stack.name}, ${card.chips} chips, level ${card.level}${muted ? ", muted" : ""}`
  if (!onToggle) {
    return (
      <div className={className} style={style} role="img" aria-label={aria} data-testid="hack-played-card" data-stack={card.stack}>
        {body}
      </div>
    )
  }
  return (
    <button
      type="button"
      className={className}
      style={style}
      aria-pressed={Boolean(selected)}
      aria-label={aria}
      data-testid="hack-card"
      data-skill={card.skillId}
      data-stack={card.stack}
      onClick={onToggle}
    >
      {body}
    </button>
  )
})

type PerkProps = {
  perk: Perk
  /** Fires on this beat of the replay. */
  lit?: boolean
  label?: { text: string; tone: string } | null
  /** A draft card: bigger, clickable, with its key hint. */
  pick?: { slot: number; onPick: () => void }
}

export function PerkTile({ perk, lit, label, pick }: PerkProps) {
  const Icon = PERK_ICON[perk.id] ?? Sticker
  const style = { ["--tone" as string]: perkTone(perk.effect) } as CSSProperties
  const body = (
    <>
      <span className="hk-perk-icon" aria-hidden>
        <Icon size={pick ? 26 : 18} strokeWidth={2} />
      </span>
      <span className="hk-perk-text">
        <span className="hk-perk-name">
          {perk.name}
          {perk.rare ? <em className="hk-perk-rare">Rare</em> : null}
        </span>
        <span className="hk-perk-blurb">{perk.blurb}</span>
      </span>
      {pick ? (
        <kbd className="hk-perk-key" aria-hidden>
          {pick.slot + 1}
        </kbd>
      ) : null}
      {label ? (
        <span key={label.text} className="hk-float" data-tone={label.tone}>
          {label.text}
        </span>
      ) : null}
    </>
  )
  if (pick) {
    return (
      <button type="button" className="hk-perk is-pick" style={style} data-testid="hack-offer" data-perk={perk.id} onClick={pick.onPick}>
        {body}
      </button>
    )
  }
  return (
    <div className={lit ? "hk-perk is-lit" : "hk-perk"} style={style} data-testid="hack-perk" data-perk={perk.id}>
      {body}
    </div>
  )
}

/** Colored dots for a hand's stack groups. Full stack is one dot of every color. */
function HandDots({ pattern }: { pattern: readonly number[] }) {
  const colors = pattern.length === 5 ? STACKS.map((stack) => stack.color) : [STACKS[0]?.color, STACKS[2]?.color]
  return (
    <span className="hk-dots" aria-hidden>
      {pattern.map((size, group) => (
        <span key={group} className="hk-dots-group">
          {Array.from({ length: size }, (_, index) => (
            <i key={index} style={{ background: pattern.length === 5 ? colors[group] : colors[group % 2] }} />
          ))}
        </span>
      ))}
    </span>
  )
}

/** Every hand, strongest first, with its base chips × mult. */
export function HandGuide({ compact = false }: { compact?: boolean }) {
  return (
    <ol className={compact ? "hk-guide is-compact" : "hk-guide"} aria-label="Hands" data-testid="hack-guide">
      {HANDS.map((hand) => (
        <li key={hand.id}>
          <HandDots pattern={hand.pattern} />
          <span className="hk-guide-name">
            <b>{hand.name}</b>
            {compact ? null : <span>{hand.rule}</span>}
          </span>
          <span className="hk-guide-score">
            <span className="is-chips">{hand.chips}</span>×<span className="is-mult">{hand.mult}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}

/** Five stack chips with a count each: the deck at registration, or what is left in the draw pile. */
export function StackCounts({ counts, label }: { counts: Record<StackId, number>; label: string }) {
  return (
    <ul className="hk-stacks" aria-label={label}>
      {STACKS.map((stack) => (
        <li key={stack.id} style={{ ["--stk" as string]: stack.color } as CSSProperties} title={stack.name}>
          <StackIcon stack={stack.id} size={13} />
          <b>{counts[stack.id]}</b>
          <span className="sr-only">{stack.name}</span>
        </li>
      ))}
    </ul>
  )
}

export function Pips({ total, left, label, tone }: { total: number; left: number; label: string; tone: string }) {
  return (
    <span className="hk-pips" role="img" aria-label={`${left} of ${total} ${label}`} style={{ ["--pip" as string]: tone } as CSSProperties}>
      {Array.from({ length: total }, (_, index) => (
        <i key={index} className={index < left ? "is-on" : ""} />
      ))}
    </span>
  )
}
