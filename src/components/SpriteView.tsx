import { memo, useEffect, useRef, useState } from "react"
import type { EmojiKind } from "../data/emojiAssets.ts"
import { emojiClickMs, emojiClickUrl, emojiIdleUrl } from "../data/emojiAssets.ts"
import { playCozyClick } from "../game/deskAudio.ts"

type FrameProps = {
  kind: EmojiKind
  id: number
  pulseNonce: number
  imgClass: string
  size: number
  /** Long shop lists defer art far below the fold. The stage sprite always loads at once. */
  lazy?: boolean
}

function EmojiFrame({ kind, id, pulseNonce, imgClass, size, lazy = false }: FrameProps) {
  const clickSrc = emojiClickUrl(kind, id)
  const idleSrc = emojiIdleUrl(kind, id)
  const clickMs = emojiClickMs(kind, id)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (pulseNonce === 0 || !clickSrc) return
    setPlaying(true)
    const timer = window.setTimeout(() => setPlaying(false), clickMs)
    return () => window.clearTimeout(timer)
  }, [pulseNonce, clickSrc, clickMs])

  if (!idleSrc) return null

  const src = playing && clickSrc ? clickSrc : idleSrc
  return (
    <img
      key={playing && clickSrc ? pulseNonce : idleSrc}
      className={imgClass}
      src={src}
      alt=""
      width={size}
      height={size}
      loading={lazy ? "lazy" : undefined}
      draggable={false}
      decoding="async"
    />
  )
}

type StageProps = {
  kind: EmojiKind
  id: number
  /** Bumps on each stage click to replay the click GIF. */
  pulseNonce: number
  className?: string
}

/** Idle still until a click, then one play of the click GIF. */
export function SpriteStage({ kind, id, pulseNonce, className }: StageProps) {
  return (
    <div className={className}>
      <EmojiFrame kind={kind} id={id} pulseNonce={pulseNonce} imgClass="emoji-stage" size={128} />
    </div>
  )
}

type TapProps = {
  kind: EmojiKind
  id: number
  className?: string
  size?: number
  label?: string
}

/**
 * Shop / owned emoji: click GIF plus the cozy desk tap when sounds are on. Memoized: the shop
 * re-renders with the balance ten times a second and every row has one of these.
 */
export const SpriteTap = memo(function SpriteTap({ kind, id, className, size = 64, label }: TapProps) {
  const [pulse, setPulse] = useState(0)
  if (!emojiIdleUrl(kind, id)) return null
  return (
    <button
      type="button"
      className="emoji-tap"
      aria-label={label ?? "Emoji"}
      onClick={(event) => {
        event.stopPropagation()
        setPulse((value) => value + 1)
        playCozyClick()
      }}
    >
      <EmojiFrame kind={kind} id={id} pulseNonce={pulse} imgClass={className ?? "emoji-thumb"} size={size} lazy />
    </button>
  )
})

type StillProps = {
  kind: EmojiKind
  id: number
  className?: string
}

export function SpriteStill({ kind, id, className }: StillProps) {
  const src = emojiIdleUrl(kind, id)
  if (!src) return null
  return (
    <img className={className} src={src} alt="" width={64} height={64} draggable={false} decoding="async" />
  )
}

export function usePreloadEmoji(kind: EmojiKind, id: number): void {
  const done = useRef(false)
  useEffect(() => {
    if (id < 0 || !hasRow(kind, id)) return
    if (done.current) return
    done.current = true
    for (const url of [emojiIdleUrl(kind, id), emojiClickUrl(kind, id)]) {
      if (!url) continue
      const img = new Image()
      img.src = url
    }
  }, [kind, id])
}

function hasRow(kind: EmojiKind, id: number): boolean {
  return emojiIdleUrl(kind, id) !== null
}
