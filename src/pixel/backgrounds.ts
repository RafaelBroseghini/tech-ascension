import { C, PALETTE } from "./palette.ts"
import { pngDataUrl } from "./png.ts"
import { Pix } from "./pix.ts"

/** Stage backdrops: ten era-shared scenes, 160×160, drawn from the shared sheet plus a few deep shades for the far walls. */

const EXTRA = [
  "#10131f", // night 1
  "#171c2e", // night 2
  "#1f2740", // night 3
  "#2b3556", // night 4
  "#4a2e1e", // wood dark
  "#6b4228", // wood
  "#12262f", // teal 1
  "#1a3a48", // teal 2
  "#245468", // teal 3
  "#3a1a14", // mars 1
  "#5e2b1f", // mars 2
  "#8a3f2a", // mars 3
  "#b5573a", // mars 4
] as const

export const BG_PALETTE: readonly string[] = [...PALETTE, ...EXTRA]

const X = {
  n1: 17,
  n2: 18,
  n3: 19,
  n4: 20,
  wood1: 21,
  wood2: 22,
  t1: 23,
  t2: 24,
  t3: 25,
  m1: 26,
  m2: 27,
  m3: 28,
  m4: 29,
} as const

export const BG_SIZE = 160

export type BgKey =
  | "bg-editor"
  | "bg-desk"
  | "bg-office"
  | "bg-lab"
  | "bg-saas"
  | "bg-board"
  | "bg-fab"
  | "bg-dc"
  | "bg-orbit"
  | "bg-mars"

export const BG_KEYS: readonly BgKey[] = [
  "bg-editor",
  "bg-desk",
  "bg-office",
  "bg-lab",
  "bg-saas",
  "bg-board",
  "bg-fab",
  "bg-dc",
  "bg-orbit",
  "bg-mars",
]

/** `base` is the still scene. `blink` is a transparent overlay of the parts that flash (cursor, LEDs). */
type Layers = { base: Pix; blink: Pix; hot: boolean }

function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return (((t ^ (t >>> 14)) >>> 0) % 100000) / 100000
  }
}

/** Horizontal colour bands with a 2-row checker dither at each seam. */
function bands(p: Pix, y0: number, y1: number, colors: readonly number[]): void {
  const h = (y1 - y0) / colors.length
  colors.forEach((col, i) => {
    const top = Math.round(y0 + i * h)
    p.rect(0, top, p.w, Math.round(y0 + (i + 1) * h) - top, col)
    if (i > 0) {
      const prev = colors[i - 1] ?? col
      for (let x = 0; x < p.w; x++) {
        if (x % 2 === 0) p.px(x, top, prev)
        else p.px(x, top - 1, col)
      }
    }
  })
}

function floorGrid(p: Pix, y0: number, col: number, vx = 80): void {
  for (let i = -8; i <= 8; i++) p.line(vx + i * 4, y0, vx + i * 22, p.h, col)
  for (let k = 0; k < 6; k++) {
    const y = y0 + Math.round((k * k * (p.h - y0)) / 30) + 2
    p.rect(0, y, p.w, 1, col)
  }
}

function starfield(p: Pix, seed: number, count: number, y1: number): void {
  const r = rng(seed)
  for (let i = 0; i < count; i++) {
    const x = Math.floor(r() * p.w)
    const y = Math.floor(r() * y1)
    p.px(x, y, r() < 0.2 ? C.glow : r() < 0.5 ? C.paper : C.gray)
    if (r() < 0.06) {
      p.px(x - 1, y, C.gray)
      p.px(x + 1, y, C.gray)
      p.px(x, y - 1, C.gray)
      p.px(x, y + 1, C.gray)
    }
  }
}

const TOKENS = [C.purple, C.green, C.blue, C.gray, C.gold, C.pink, C.mid]

function editor({ base, blink }: Layers): void {
  base.rect(0, 0, 160, 160, X.n1)
  base.rect(0, 0, 160, 9, X.n2)
  base.rect(4, 2, 34, 7, X.n1)
  base.rect(4, 2, 34, 1, C.blue)
  base.rect(8, 5, 18, 1, C.mid)
  base.rect(42, 5, 22, 1, C.gray)
  base.rect(0, 9, 18, 143, X.n2)
  base.rect(18, 9, 1, 143, X.n3)
  const r = rng(7)
  const cursorLine = 10
  for (let i = 0; i < 23; i++) {
    const y = 14 + i * 6
    if (i === cursorLine) base.rect(19, y - 2, 130, 6, X.n2)
    base.rect(10, y, i + 1 > 9 ? 5 : 3, 1, C.gray)
    if (i + 1 > 9) base.rect(5, y, 3, 1, C.gray)
    if (r() < 0.15) continue
    let x = 24 + Math.floor(r() * 3) * 6
    const tokens = 2 + Math.floor(r() * 4)
    for (let t = 0; t < tokens && x < 130; t++) {
      const w = 4 + Math.floor(r() * 16)
      base.rect(x, y, w, 2, TOKENS[Math.floor(r() * TOKENS.length)] ?? C.gray)
      x += w + 3
      if (i === cursorLine && t === tokens - 1) blink.rect(x, y - 2, 2, 6, C.paper)
    }
  }
  base.rect(150, 9, 10, 143, X.n2)
  for (let i = 0; i < 40; i++) base.rect(152, 12 + i * 3, 2 + Math.floor(r() * 5), 1, TOKENS[i % TOKENS.length] ?? C.gray)
  base.rect(0, 152, 160, 8, C.blue)
  base.rect(4, 155, 14, 2, C.paper)
  base.rect(22, 155, 10, 2, C.glow)
  base.rect(140, 155, 16, 2, C.paper)
}

function desk({ base }: Layers): void {
  bands(base, 0, 96, [X.n2, X.n2, X.n3, X.n3])
  const r = rng(11)
  for (let i = 0; i < 9; i++) {
    const x = 6 + i * 17 + Math.floor(r() * 5)
    const y = 8 + Math.floor(r() * 24)
    base.box(x, y, 9, 9, [C.paper, [C.pink, C.gold, C.glow, C.term][i % 4] ?? C.gold, C.gray])
    base.rect(x + 2, y + 3, 5, 1, C.ink)
  }
  base.box(0, 94, 160, 6, [C.gold, C.rust, C.red])
  base.rect(0, 100, 160, 60, X.wood2)
  for (let y = 108; y < 160; y += 8) base.rect(0, y, 160, 1, X.wood1)
  for (const x of [14, 90]) {
    base.box(x, 40, 56, 40, [C.mid, C.gray, C.ink])
    base.rect(x + 3, 43, 50, 34, C.deep)
    for (let i = 0; i < 7; i++) base.rect(x + 7 + (i % 3) * 3, 48 + i * 4, 10 + ((i * 7) % 24), 2, [C.term, C.glow, C.paper, C.gold][i % 4] ?? C.term)
    base.rect(x + 24, 80, 8, 12, C.gray)
    base.rect(x + 14, 92, 28, 3, C.mid)
  }
  base.box(46, 118, 68, 10, [C.mid, C.gray, C.ink])
  for (let i = 0; i < 16; i++) base.rect(49 + i * 4, 120, 3, 2, C.paper)
  base.box(8, 112, 14, 16, [C.paper, C.red, C.ink])
  base.rect(22, 116, 4, 8, C.red)
  base.box(130, 110, 22, 14, [C.white, C.paper, C.mid])
  base.box(126, 126, 26, 14, [C.white, C.paper, C.mid])
  base.rect(132, 114, 12, 1, C.gray)
  base.box(120, 98, 8, 12, [C.paper, C.green, C.gray])
  base.line(20, 128, 44, 150, C.deep)
  base.line(120, 134, 100, 152, C.deep)
}

function office({ base }: Layers): void {
  base.rect(0, 0, 160, 160, X.n3)
  for (let i = 0; i < 5; i++) base.rect(10 + i * 32, 3, 20, 3, C.paper)
  base.dither(0, 6, 160, 4, C.gold)
  base.box(26, 22, 108, 60, [C.mid, C.gray, C.ink])
  base.rect(29, 25, 102, 54, X.n2)
  for (let i = 0; i < 3; i++) {
    const x = 32 + i * 34
    base.rect(x, 28, 28, 4, [C.blue, C.gold, C.green][i] ?? C.blue)
    for (let k = 0; k < 4; k++) {
      base.box(x + (k % 2) * 13, 36 + Math.floor(k / 2) * 14, 11, 11, [C.white, [C.pink, C.gold, C.glow, C.term][(k + i) % 4] ?? C.gold, C.gray])
    }
  }
  base.rect(60, 25, 1, 54, C.gray)
  base.rect(94, 25, 1, 54, C.gray)
  base.rect(0, 96, 160, 64, X.t2)
  base.dither(0, 96, 160, 6, X.t1)
  for (let row = 0; row < 3; row++) {
    const y = 98 + row * 20
    const s = 1 + row * 0.35
    for (let i = 0; i < 4 - row; i++) {
      const x = Math.round(14 + i * (160 / (4 - row)) * 0.98 - (row === 0 ? 0 : 6))
      const w = Math.round(28 * s)
      base.box(x, y + Math.round(10 * s), w, Math.round(6 * s), [C.gold, C.rust, C.red])
      base.box(x + Math.round(w * 0.25), y, Math.round(w * 0.5), Math.round(10 * s), [C.mid, C.gray, C.ink])
      base.rect(x + Math.round(w * 0.3), y + 2, Math.round(w * 0.4), Math.round(6 * s), C.deep)
      base.ball(x + Math.round(w / 2), y - 3, 3, [C.paper, C.mid, C.gray])
    }
  }
}

function labRack(p: Pix, x: number, y: number, w: number, h: number, led: number, alt: number, blink: Pix, phase: number): void {
  p.box(x, y, w, h, [C.mid, C.gray, C.ink])
  for (let j = y + 3; j + 3 < y + h; j += 5) {
    p.rect(x + 2, j, w - 4, 3, C.deep)
    p.px(x + 4, j + 1, led)
    blink.px(x + 6, j + 1, (j + phase) % 2 === 0 ? alt : led)
    p.rect(x + w - 8, j + 1, 4, 1, C.gray)
  }
}

function lab({ base, blink, hot }: Layers): void {
  const led = hot ? C.gold : C.glow
  const alt = hot ? C.pink : C.white
  base.rect(0, 0, 160, 160, X.t1)
  bands(base, 0, 56, [X.t1, X.t1, X.t2])
  for (let i = 0; i < 4; i++) base.rect(0, 10 + i * 8, 160, 1, X.t3)
  base.rect(0, 104, 160, 56, X.t2)
  floorGrid(base, 104, X.t3)
  for (let i = 0; i < 4; i++) {
    const h = 96 - i * 14
    const w = 22 - i * 3
    const x = 4 + i * 20
    labRack(base, x, 100 - h + 6 + i * 2, w, h, led, alt, blink, i)
    labRack(base, 160 - x - w, 100 - h + 6 + i * 2, w, h, led, alt, blink, i + 1)
  }
  base.rect(70, 30, 20, 76, X.t1)
  base.dither(60, 80, 40, 80, led, 1)
  for (let i = 0; i < 24; i++) base.px(66 + ((i * 17) % 28), 104 + ((i * 13) % 50), led)
  if (hot) {
    base.halo(80, 80, 40, 14, C.gold)
    base.halo(80, 80, 62, 6, C.pink)
  }
}

function saas({ base }: Layers): void {
  base.rect(0, 0, 160, 160, X.n3)
  for (let y = 0; y < 160; y += 8) base.rect(0, y, 160, 1, X.n2)
  for (let x = 0; x < 160; x += 20) base.rect(x, 0, 1, 160, X.n2)
  base.box(8, 10, 144, 84, [C.mid, C.gray, C.ink])
  base.rect(11, 13, 138, 78, X.n1)
  base.rect(11, 13, 138, 8, X.n2)
  for (let i = 0; i < 3; i++) base.rect(15 + i * 10, 16, 6, 2, [C.red, C.gold, C.green][i] ?? C.red)
  for (let i = 0; i < 4; i++) base.box(15 + i * 33, 26, 29, 14, [C.gray, X.n2, C.ink])
  for (let i = 0; i < 4; i++) base.rect(18 + i * 33, 30, 14 + i * 3, 2, [C.term, C.gold, C.glow, C.pink][i] ?? C.term)
  base.rect(15, 46, 80, 40, X.n2)
  let py = 80
  for (let x = 17; x < 93; x += 4) {
    const ny = Math.max(54, py - 2 - ((x * 7) % 5))
    base.stroke(x, py, x + 4, ny, C.term, 2)
    base.rect(x, ny + 3, 3, 84 - ny - 3, X.n3)
    py = ny
  }
  base.ball(125, 66, 18, [C.gold, C.red, C.ink])
  base.poly([[125, 66], [125, 48], [143, 66]], C.gold)
  base.rect(0, 104, 160, 56, X.n2)
  for (let i = 0; i < 5; i++) {
    base.box(8 + i * 32, 118, 24, 14, [C.mid, C.gray, C.ink])
    base.rect(11 + i * 32, 121, 18, 8, C.deep)
    base.rect(13 + i * 32, 123, 8 + (i % 3) * 3, 1, [C.term, C.gold, C.glow][i % 3] ?? C.term)
    base.rect(18 + i * 32, 132, 8, 4, C.gray)
  }
  base.tri(70, 152, 90, 152, 80, 134, C.red)
  base.rect(0, 150, 160, 10, X.n1)
  base.rect(0, 150, 160, 1, C.red)
}

function board({ base, blink }: Layers): void {
  base.rect(0, 0, 160, 160, X.n1)
  bands(base, 0, 84, [X.n1, X.n2, X.n3, X.n4])
  for (let i = 0; i < 12; i++) {
    const h = 20 + ((i * 37) % 44)
    base.rect(i * 14 + 2, 84 - h, 11, h, X.n1)
    for (let j = 84 - h + 3; j < 82; j += 5) base.px(i * 14 + 4 + ((j * 3) % 6), j, (i + j) % 3 === 0 ? C.gold : X.n4)
  }
  for (const x of [0, 52, 106, 158]) base.rect(x, 0, 2, 92, C.mid)
  base.line(10, 4, 50, 80, X.n4)
  base.line(60, 4, 100, 80, X.n4)
  base.dither(112, 4, 40, 70, X.n4)
  base.box(0, 92, 160, 10, [C.glow, X.n1, C.void])
  base.rect(0, 94, 160, 6, C.void)
  for (let i = 0; i < 26; i++) {
    const up = i % 3 !== 0
    base.rect(2 + i * 6, 96, 3, 2, up ? C.green : C.red)
    base.px(3 + i * 6, 95, up ? C.term : C.pink)
    blink.px(3 + i * 6, 99, up ? C.term : C.pink)
  }
  base.rect(0, 102, 160, 58, X.wood1)
  base.rect(0, 102, 160, 3, X.wood2)
  base.ellipse(80, 142, 86, 22, X.wood2)
  base.ellipse(80, 140, 82, 18, C.red)
  base.ellipse(80, 138, 78, 15, X.wood1)
  for (let i = 0; i < 8; i++) {
    const x = 12 + i * 19
    base.ball(x, 122, 5, [C.mid, C.gray, C.ink])
    base.rect(x - 5, 126, 10, 8, C.gray)
  }
}

function fab({ base, blink }: Layers): void {
  base.rect(0, 0, 160, 160, X.t1)
  base.rect(0, 0, 160, 18, X.t2)
  for (let i = 0; i < 6; i++) {
    base.rect(6 + i * 27, 6, 20, 4, C.gold)
    base.dither(2 + i * 27, 10, 28, 40, C.gold)
  }
  base.rect(0, 26, 160, 2, C.mid)
  base.rect(0, 28, 160, 50, X.t2)
  for (let x = 0; x < 160; x += 10) base.rect(x, 28, 1, 50, X.t1)
  base.rect(0, 62, 160, 3, C.gray)
  base.rect(0, 62, 160, 1, C.paper)
  for (let i = 0; i < 6; i++) {
    base.box(6 + i * 26, 40, 18, 20, [C.paper, C.mid, C.gray])
    base.rect(9 + i * 26, 44, 12, 8, X.t1)
    base.rect(13 + i * 26, 47, 4, 4, i % 2 ? C.gold : C.glow)
  }
  base.stroke(30, 30, 80, 52, C.mid, 3)
  base.stroke(80, 52, 130, 30, C.mid, 3)
  base.ball(80, 56, 6, [C.paper, C.gold, C.rust])
  blink.px(80, 55, C.white)
  base.rect(0, 94, 160, 66, X.t2)
  floorGrid(base, 94, X.t3)
  for (let y = 100; y < 160; y += 5) for (let x = (y % 10 === 0 ? 0 : 3); x < 160; x += 6) base.px(x, y, X.t1)
  base.dither(40, 94, 80, 66, C.gold, 1)
  base.ellipse(80, 124, 44, 10, C.gold)
  base.ellipse(80, 124, 36, 7, C.paper)
  base.ball(80, 114, 10, [C.white, C.gold, C.rust])
}

function dcRack(p: Pix, x: number, y: number, w: number, h: number, blink: Pix, phase: number): void {
  p.box(x, y, w, h, [C.mid, C.gray, C.ink])
  for (let j = y + 3; j + 2 < y + h; j += 4) {
    p.rect(x + 2, j, w - 4, 2, C.deep)
    p.px(x + 3, j, C.glow)
    blink.px(x + 5, j, (j + phase) % 8 < 4 ? C.glow : C.white)
  }
}

function dc({ base, blink }: Layers): void {
  base.rect(0, 0, 160, 160, X.n1)
  bands(base, 0, 70, [X.n1, X.n2, X.n2])
  for (let i = 0; i < 5; i++) base.rect(0, 6 + i * 4, 160, 1, X.n3)
  for (let i = 0; i < 6; i++) base.rect(24 + i * 22, 2, 10, 3, C.paper)
  base.rect(0, 100, 160, 60, X.n3)
  floorGrid(base, 100, X.n4)
  for (let i = 0; i < 4; i++) {
    const h = 110 - i * 18
    const w = 24 - i * 4
    const x = 2 + i * 22
    const y = 98 - h + 8 + i * 3
    dcRack(base, x, y, w, h, blink, i * 3)
    dcRack(base, 158 - x - w, y, w, h, blink, i * 3 + 2)
  }
  base.rect(66, 40, 28, 62, X.n1)
  base.dither(60, 100, 40, 60, C.blue)
  base.rect(78, 102, 4, 58, X.n2)
}

function orbit({ base, blink }: Layers): void {
  base.rect(0, 0, 160, 160, C.void)
  bands(base, 0, 100, [C.void, C.void, X.n1, X.n2])
  starfield(base, 5, 90, 110)
  blink.px(40, 20, C.white)
  blink.px(120, 44, C.white)
  base.rect(0, 0, 14, 4, C.gray)
  base.rect(0, 0, 4, 40, C.gray)
  base.rect(0, 40, 10, 2, C.mid)
  base.rect(146, 0, 14, 4, C.gray)
  base.rect(156, 0, 4, 40, C.gray)
  for (let i = 0; i < 4; i++) base.box(118 + i * 10, 64, 9, 28, [C.glow, C.blue, C.gray])
  base.rect(112, 76, 6, 2, C.mid)
  base.halo(80, 250, 120, 6, C.glow)
  base.ball(80, 250, 112, [C.glow, C.blue, X.n2])
  const r = rng(3)
  for (let i = 0; i < 60; i++) {
    const x = 20 + Math.floor(r() * 120)
    const y = 148 + Math.floor(r() * 12)
    if (Math.hypot(x - 80, y - 250) < 108) base.rect(x, y, 3 + Math.floor(r() * 6), 2, C.green)
  }
  base.dither(0, 134, 160, 6, C.glow)
}

function mars({ base, blink }: Layers): void {
  bands(base, 0, 100, [X.m1, X.m1, X.m2, X.m2, X.m3, X.m4])
  starfield(base, 9, 14, 40)
  base.ball(132, 28, 7, [C.paper, C.mid, C.gray])
  base.ball(30, 48, 3, [C.paper, C.mid, C.gray])
  base.poly(
    [[0, 100], [0, 88], [14, 80], [30, 92], [48, 76], [70, 94], [96, 82], [120, 94], [146, 80], [160, 90], [160, 100]],
    X.m2,
  )
  const heights = [14, 26, 38, 20, 48, 30, 40, 22, 34, 16]
  heights.forEach((h, i) => {
    const x = 36 + i * 9
    base.rect(x, 100 - h, 8, h, X.m1)
    for (let j = 100 - h + 3; j < 98; j += 5) base.px(x + 2 + ((j + i) % 4), j, (i + j) % 3 === 0 ? C.glow : C.gold)
  })
  base.ellipse(124, 100, 14, 12, X.m1)
  base.rect(100, 100, 50, 4, X.m1)
  base.rect(0, 100, 160, 60, X.m3)
  base.dither(0, 100, 160, 14, X.m4)
  base.dither(0, 130, 160, 30, X.m2, 1)
  const r = rng(21)
  for (let i = 0; i < 18; i++) base.ellipse(Math.floor(r() * 160), 112 + Math.floor(r() * 46), 3 + Math.floor(r() * 7), 1 + Math.floor(r() * 2), X.m2)
  for (let i = 0; i < 10; i++) base.px(Math.floor(r() * 160), 104 + Math.floor(r() * 50), C.gold)
  blink.px(54, 60, C.glow)
}

const DRAW: Record<BgKey, (layers: Layers) => void> = {
  "bg-editor": editor,
  "bg-desk": desk,
  "bg-office": office,
  "bg-lab": lab,
  "bg-saas": saas,
  "bg-board": board,
  "bg-fab": fab,
  "bg-dc": dc,
  "bg-orbit": orbit,
  "bg-mars": mars,
}

const cache = new Map<string, Layers>()

export function bgLayers(key: BgKey, hot = false): Layers {
  const id = `${key}:${hot ? "hot" : "base"}`
  const hit = cache.get(id)
  if (hit) return hit
  const layers: Layers = { base: new Pix(BG_SIZE, BG_SIZE), blink: new Pix(BG_SIZE, BG_SIZE), hot }
  DRAW[key](layers)
  cache.set(id, layers)
  return layers
}

const urlCache = new Map<string, string>()

export function bgUrls(key: BgKey, hot = false): { base: string; blink: string | null } {
  const id = `${key}:${hot ? "hot" : "base"}`
  const hit = urlCache.get(id)
  const layers = bgLayers(key, hot)
  const base = hit ?? pngDataUrl(layers.base.data, BG_SIZE, BG_SIZE, BG_PALETTE)
  if (!hit) urlCache.set(id, base)
  const blinkKey = `${id}:blink`
  const hasBlink = layers.blink.colors().length > 0
  if (!hasBlink) return { base, blink: null }
  const cached = urlCache.get(blinkKey)
  const blink = cached ?? pngDataUrl(layers.blink.data, BG_SIZE, BG_SIZE, BG_PALETTE)
  if (!cached) urlCache.set(blinkKey, blink)
  return { base, blink }
}
