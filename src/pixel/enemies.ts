import { ENEMIES } from "../data/enemies.ts"
import { chip, coins, flame, globe, rack, sparkle, wafer } from "./motifs.ts"
import { C, PALETTE, R } from "./palette.ts"
import type { Ramp } from "./palette.ts"
import { pngDataUrl } from "./png.ts"
import { Pix } from "./pix.ts"

export const ENEMY_SIZE = 96

type Kind =
  | "hydra"
  | "beetle"
  | "ghost"
  | "brute"
  | "golem"
  | "centipede"
  | "kraken"
  | "dragon"
  | "ooze"
  | "pods"
  | "cubes"
  | "shards"
  | "sphinx"
  | "serpent"
  | "shark"
  | "lobster"
  | "orb"
  | "lich"
  | "minotaur"
  | "vampire"
  | "demon"
  | "gremlin"
  | "djinn"
  | "robot"
  | "tornado"
  | "rack"
  | "clone"

type Prop = "fork" | "wafer" | "chip" | "coin" | "bolt" | "pager" | "doc" | "cube" | "globe" | "clock" | "flame" | "sparkle" | "crown"

type Look = { kind: Kind; ramp: Ramp; prop?: Prop; eye?: number }

type Draw = (c: Pix, r: Ramp, eye: number) => void

function eye(c: Pix, x: number, y: number, iris: number, s = 5): void {
  c.rect(x, y, s, s, C.white)
  c.rect(x + Math.floor(s / 2) - 1, y + 1, 2, s - 2, iris)
  c.px(x + Math.floor(s / 2), y + 2, C.ink)
}

function slit(c: Pix, x: number, y: number, col: number, w = 6): void {
  c.rect(x, y, w, 2, col)
  c.rect(x + 1, y + 2, w - 2, 1, C.ink)
}

function fangs(c: Pix, x: number, y: number, w: number, n: number): void {
  const step = w / n
  for (let i = 0; i < n; i++) c.tri(x + i * step, y, x + (i + 1) * step, y, x + (i + 0.5) * step, y + 5, C.white)
}

function shade(c: Pix, cx: number, cy: number, rx: number, ry: number, r: Ramp): void {
  c.ellipse(cx + 1, cy + 1, rx, ry, r[2])
  c.ellipse(cx, cy, rx - 1, ry - 1, r[1])
  c.ellipse(cx - rx * 0.32, cy - ry * 0.38, Math.max(2, rx * 0.34), Math.max(2, ry * 0.24), r[0])
}

function hydra(c: Pix, r: Ramp, e: number): void {
  shade(c, 48, 76, 32, 14, r)
  const heads: ReadonlyArray<readonly [number, number, number]> = [
    [30, 16, 32],
    [48, 48, 16],
    [66, 80, 32],
  ]
  for (const [x0, x1, top] of heads) {
    c.stroke(x0, 70, x1, top + 12, r[2], 10)
    c.stroke(x0 - 1, 70, x1 - 1, top + 12, r[1], 7)
  }
  for (const [, x1, top] of heads) {
    const dir = x1 < 40 ? -1 : x1 > 56 ? 1 : 0
    c.ellipse(x1 + dir * 3, top + 4, 11, 8, r[2])
    c.ellipse(x1 + dir * 3 - 1, top + 3, 10, 7, r[1])
    c.ellipse(x1 + dir * 3 - 3, top, 4, 2, r[0])
    c.rect(x1 + dir * 3 - 8, top + 8, 17, 3, C.ink)
    fangs(c, x1 + dir * 3 - 7, top + 10, 14, 3)
    eye(c, x1 + dir * 3 - 6, top - 1, e)
    eye(c, x1 + dir * 3 + 2, top - 1, e)
  }
}

function beetle(c: Pix, r: Ramp, e: number): void {
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const y = 52 + i * 10
      c.stroke(48 + side * 20, y, 48 + side * (34 + i * 2), y + 8 - i * 3, C.ink, 3)
      c.stroke(48 + side * (34 + i * 2), y + 8 - i * 3, 48 + side * (36 + i * 2), y + 22 - i * 2, C.ink, 3)
    }
    c.stroke(48 + side * 5, 26, 48 + side * 14, 10, r[2], 2)
    c.stroke(48 + side * 14, 10, 48 + side * 22, 12, r[2], 2)
    c.tri(48 + side * 4, 36, 48 + side * 12, 30, 48 + side * 9, 42, C.paper)
  }
  shade(c, 48, 62, 28, 24, r)
  c.rect(47, 40, 2, 44, C.ink)
  for (let i = 0; i < 4; i++) {
    c.circle(36, 52 + i * 8, 2, r[0])
    c.circle(60, 52 + i * 8, 2, r[0])
  }
  c.ellipse(48, 32, 12, 9, r[2])
  c.ellipse(47, 31, 11, 8, r[1])
  eye(c, 38, 26, e)
  eye(c, 53, 26, e)
}

function ghost(c: Pix, r: Ramp, e: number): void {
  c.ellipse(48, 38, 28, 26, r[2])
  c.rect(20, 38, 56, 40, r[2])
  c.ellipse(46, 36, 26, 24, r[1])
  c.rect(21, 38, 52, 40, r[1])
  for (let i = 0; i < 5; i++) {
    const x = 21 + i * 11
    c.tri(x, 76, x + 11, 76, x + 5.5, i % 2 ? 90 : 86, r[1])
  }
  c.ellipse(34, 26, 8, 5, r[0])
  c.rect(23, 40, 3, 34, r[0])
  c.ellipse(37, 40, 7, 9, C.void)
  c.ellipse(60, 40, 7, 9, C.void)
  c.rect(35, 38, 3, 4, e)
  c.rect(58, 38, 3, 4, e)
  c.ellipse(48, 60, 6, 8, C.void)
  c.stroke(20, 52, 8, 66, r[1], 6)
  c.stroke(76, 52, 88, 66, r[1], 6)
  c.rect(5, 64, 6, 6, r[0])
  c.rect(85, 64, 6, 6, r[0])
}

function brute(c: Pix, r: Ramp, e: number): void {
  c.box(28, 70, 14, 18, R.dark)
  c.box(54, 70, 14, 18, R.dark)
  c.stroke(22, 44, 8, 70, r[2], 12)
  c.stroke(74, 44, 88, 60, r[2], 12)
  c.rect(82, 22, 7, 44, C.rust)
  c.ellipse(86, 20, 9, 11, C.gray)
  shade(c, 48, 56, 28, 24, r)
  c.rect(22, 64, 52, 5, C.rust)
  c.rect(44, 62, 8, 9, C.gold)
  c.ellipse(48, 28, 15, 14, r[2])
  c.ellipse(47, 27, 14, 13, r[1])
  c.ellipse(41, 21, 5, 3, r[0])
  c.rect(37, 24, 9, 3, C.ink)
  c.rect(52, 24, 9, 3, C.ink)
  eye(c, 38, 26, e, 4)
  eye(c, 54, 26, e, 4)
  c.rect(38, 36, 22, 4, C.ink)
  c.tri(40, 36, 45, 36, 42, 30, C.white)
  c.tri(53, 36, 58, 36, 56, 30, C.white)
}

function golem(c: Pix, r: Ramp, e: number): void {
  c.box(24, 62, 20, 26, r)
  c.box(52, 62, 20, 26, r)
  c.box(4, 34, 18, 26, r)
  c.box(74, 34, 18, 26, r)
  c.box(10, 58, 18, 14, r)
  c.box(68, 58, 18, 14, r)
  c.box(18, 28, 60, 40, r)
  c.box(32, 6, 32, 26, r)
  c.rect(37, 15, 8, 5, e)
  c.rect(51, 15, 8, 5, e)
  c.rect(38, 24, 20, 3, C.ink)
  c.line(26, 36, 34, 48, C.ink)
  c.line(34, 48, 30, 58, C.ink)
  c.line(60, 42, 68, 36, C.ink)
  c.line(60, 42, 64, 56, C.ink)
  c.rect(42, 40, 12, 12, C.deep)
  c.rect(45, 43, 6, 6, e)
  c.rect(20, 30, 12, 3, C.term)
  c.rect(66, 66, 8, 3, C.term)
}

function centipede(c: Pix, r: Ramp, e: number): void {
  const pts: Array<readonly [number, number]> = []
  for (let i = 0; i < 9; i++) pts.push([10 + i * 9, 66 - Math.sin(i * 0.7) * 16])
  for (const [x, y] of pts) {
    c.stroke(x, y, x - 3, y + 16, C.ink, 3)
    c.stroke(x, y, x + 4, y + 16, C.ink, 3)
  }
  pts.forEach(([x, y], i) => {
    c.ball(x, y, i === pts.length - 1 ? 11 : 8, i % 2 ? r : R.gold)
  })
  const [hx, hy] = pts[pts.length - 1] ?? [82, 66]
  eye(c, hx - 5, hy - 6, e, 4)
  eye(c, hx + 2, hy - 6, e, 4)
  c.stroke(hx - 4, hy - 11, hx - 10, hy - 22, r[2], 2)
  c.stroke(hx + 5, hy - 11, hx + 11, hy - 22, r[2], 2)
  c.rect(hx - 4, hy + 3, 9, 3, C.ink)
}

function kraken(c: Pix, r: Ramp, e: number): void {
  for (let t = 0; t < 6; t++) {
    const x0 = 22 + t * 10.4
    let px = x0
    let py = 56
    for (let s = 1; s <= 8; s++) {
      const nx = x0 + (t - 2.5) * s * 2.6 + Math.sin(s * 0.9 + t) * 5
      const ny = 56 + s * 4.6
      c.stroke(px, py, nx, ny, r[2], Math.max(3, 9 - s))
      c.stroke(px, py, nx, ny, r[1], Math.max(2, 7 - s))
      if (s % 2 === 0) c.px(nx, ny, C.paper)
      px = nx
      py = ny
    }
  }
  c.ball(48, 34, 28, r)
  c.ellipse(36, 20, 8, 4, r[0])
  eye(c, 31, 30, e, 7)
  eye(c, 56, 30, e, 7)
  c.rect(38, 48, 20, 3, C.ink)
  fangs(c, 40, 50, 16, 4)
}

function dragon(c: Pix, r: Ramp, e: number): void {
  c.poly(
    [
      [34, 50],
      [8, 14],
      [24, 28],
      [26, 8],
      [38, 30],
      [48, 10],
      [52, 48],
    ],
    R.purple[2],
  )
  c.poly(
    [
      [36, 48],
      [14, 20],
      [26, 32],
      [28, 14],
      [38, 34],
      [46, 18],
      [48, 46],
    ],
    r[2],
  )
  c.stroke(22, 70, 6, 82, r[2], 8)
  c.tri(0, 78, 10, 74, 2, 90, C.gold)
  c.box(30, 80, 10, 10, R.dark)
  c.box(52, 80, 10, 10, R.dark)
  shade(c, 44, 66, 26, 18, r)
  c.ellipse(46, 74, 14, 9, C.gold)
  c.stroke(54, 54, 66, 32, r[2], 12)
  c.stroke(53, 54, 65, 32, r[1], 9)
  c.ellipse(72, 26, 13, 9, r[2])
  c.ellipse(71, 25, 12, 8, r[1])
  c.rect(70, 31, 14, 3, C.ink)
  c.tri(64, 18, 60, 4, 70, 16, C.paper)
  c.tri(72, 17, 72, 4, 78, 16, C.paper)
  eye(c, 66, 21, e, 4)
  flame(c, 88, 38, 18, [C.red, C.rust, C.gold])
}

function ooze(c: Pix, r: Ramp, e: number): void {
  c.ellipse(48, 68, 38, 20, r[2])
  c.ellipse(46, 50, 24, 20, r[2])
  c.ellipse(48, 66, 36, 18, r[1])
  c.ellipse(46, 48, 22, 18, r[1])
  c.tri(18, 78, 26, 78, 22, 92, r[1])
  c.tri(66, 78, 76, 78, 71, 90, r[1])
  c.ellipse(36, 40, 8, 5, r[0])
  c.circle(70, 58, 4, r[0])
  c.circle(24, 66, 3, r[0])
  c.circle(60, 74, 3, r[0])
  eye(c, 36, 44, e, 6)
  eye(c, 52, 44, e, 6)
  c.rect(38, 60, 20, 3, C.ink)
  c.rect(42, 63, 4, 3, C.white)
  c.rect(52, 63, 4, 3, C.white)
}

function pods(c: Pix, r: Ramp, e: number): void {
  const spots: ReadonlyArray<readonly [number, number, number]> = [
    [48, 46, 11],
    [24, 30, 7],
    [72, 28, 7],
    [18, 58, 8],
    [78, 58, 8],
    [36, 74, 7],
    [60, 76, 7],
    [48, 18, 6],
    [30, 50, 5],
  ]
  for (const [x, y, s] of spots) {
    c.ellipse(x - s - 2, y - s * 0.6, s * 0.9, s * 0.45, C.paper)
    c.ellipse(x + s + 2, y - s * 0.6, s * 0.9, s * 0.45, C.paper)
    c.ball(x, y, s, r)
    c.px(x - s * 0.3, y - 1, e)
    c.px(x + s * 0.3, y - 1, e)
  }
  eye(c, 40, 42, e, 6)
  eye(c, 50, 42, e, 6)
}

function cubes(c: Pix, r: Ramp, e: number): void {
  const spots: ReadonlyArray<readonly [number, number, number]> = [
    [34, 36, 22],
    [58, 30, 18],
    [20, 62, 16],
    [48, 62, 22],
    [72, 58, 16],
    [8, 38, 12],
  ]
  spots.forEach(([x, y, s], i) => {
    c.box(x, y, s, s, i % 2 ? R.steel : r)
    c.rect(x + 3, y + 3, s - 6, s - 6, C.deep)
    c.rect(x + 5, y + 5, 2, 2, e)
    c.rect(x + s - 8, y + 5, 2, 2, e)
    c.rect(x + 5, y + s - 7, s - 10, 1, C.gray)
  })
}

function shards(c: Pix, r: Ramp, e: number): void {
  const spots: ReadonlyArray<readonly [number, number, number, number]> = [
    [48, 44, 18, 0.3],
    [20, 24, 11, 1.2],
    [74, 22, 12, 2.1],
    [14, 64, 12, 2.6],
    [78, 64, 14, 0.8],
    [36, 78, 10, 1.9],
    [62, 80, 9, 0.4],
  ]
  for (const [x, y, s, a] of spots) {
    const p = (k: number): [number, number] => [x + Math.cos(a + k * 2.1) * s * (k === 1 ? 0.7 : 1.1), y + Math.sin(a + k * 2.1) * s * (k === 1 ? 0.7 : 1.1)]
    const [a0, a1] = p(0)
    const [b0, b1] = p(1)
    const [d0, d1] = p(2)
    c.tri(a0, a1, b0, b1, d0, d1, r[1])
    c.line(a0, a1, b0, b1, r[0])
    c.line(b0, b1, d0, d1, r[2])
  }
  c.rect(40, 42, 6, 6, e)
  c.rect(51, 42, 6, 6, e)
  c.px(43, 45, C.ink)
  c.px(54, 45, C.ink)
  c.box(30, 56, 36, 6, R.gold)
  c.rect(34, 58, 6, 2, C.ink)
}

function sphinx(c: Pix, r: Ramp, e: number): void {
  c.poly(
    [
      [52, 56],
      [80, 22],
      [92, 40],
      [86, 62],
    ],
    R.purple[2],
  )
  shade(c, 56, 72, 34, 16, r)
  c.box(10, 70, 32, 16, r)
  c.box(22, 56, 12, 20, r)
  c.rect(12, 78, 28, 2, C.ink)
  c.poly(
    [
      [18, 36],
      [30, 14],
      [44, 36],
      [40, 62],
      [22, 62],
    ],
    C.gold,
  )
  for (let i = 0; i < 4; i++) c.rect(20 + i * 6, 20 + i * 2, 3, 38 - i * 2, C.blue)
  c.ellipse(30, 40, 12, 14, r[1])
  c.ellipse(27, 34, 4, 3, r[0])
  eye(c, 21, 34, e, 4)
  eye(c, 31, 34, e, 4)
  c.rect(24, 48, 10, 2, C.ink)
  c.tri(26, 14, 34, 14, 30, 4, C.red)
}

function serpent(c: Pix, r: Ramp, e: number): void {
  let px = 70
  let py = 86
  for (let s = 1; s <= 24; s++) {
    const t = s / 24
    const nx = 48 + Math.sin(t * Math.PI * 2.4 + 0.6) * (26 - t * 6)
    const ny = 86 - t * 56
    c.stroke(px, py, nx, ny, r[2], 13 - Math.round(t * 3))
    c.stroke(px - 1, py - 1, nx - 1, ny - 1, r[1], 10 - Math.round(t * 3))
    if (s % 4 === 0) c.rect(nx - 3, ny - 2, 5, 2, r[0])
    px = nx
    py = ny
  }
  c.ellipse(px, py - 8, 13, 10, r[2])
  c.ellipse(px - 1, py - 9, 12, 9, r[1])
  c.ellipse(px - 4, py - 13, 5, 2, r[0])
  eye(c, px - 8, py - 14, e, 4)
  eye(c, px + 2, py - 14, e, 4)
  c.rect(px - 7, py - 3, 14, 2, C.ink)
  fangs(c, px - 6, py - 2, 12, 2)
  c.rect(px - 1, py + 3, 2, 8, C.pink)
  c.tri(px - 1, py + 11, px - 4, py + 15, px + 1, py + 13, C.pink)
}

function shark(c: Pix, r: Ramp, e: number): void {
  c.tri(8, 40, 30, 56, 14, 74, r[2])
  c.tri(40, 40, 62, 40, 56, 14, r[2])
  c.tri(40, 70, 62, 72, 46, 90, r[2])
  shade(c, 54, 58, 40, 20, r)
  c.ellipse(60, 68, 30, 9, C.paper)
  c.rect(62, 62, 28, 3, C.ink)
  for (let i = 0; i < 6; i++) c.tri(62 + i * 5, 62, 67 + i * 5, 62, 64.5 + i * 5, 70, C.white)
  eye(c, 72, 48, e, 5)
  c.tri(48, 70, 54, 70, 51, 82, C.red)
  c.rect(49, 66, 6, 5, C.red)
  for (let i = 0; i < 3; i++) c.rect(52 + i * 3, 52, 1, 6, r[2])
}

function lobster(c: Pix, r: Ramp, e: number): void {
  for (const side of [-1, 1]) {
    c.stroke(48 + side * 12, 60, 48 + side * 28, 40, r[2], 8)
    c.ellipse(48 + side * 32, 28, 12, 14, r[2])
    c.ellipse(48 + side * 31, 27, 11, 13, r[1])
    c.tri(48 + side * 28, 18, 48 + side * 40, 12, 48 + side * 36, 26, C.ink)
    c.ellipse(48 + side * 30, 22, 3, 3, r[0])
    for (let i = 0; i < 3; i++) c.stroke(48 + side * 14, 66 + i * 6, 48 + side * 34, 72 + i * 8, r[2], 3)
    c.stroke(48 + side * 5, 38, 48 + side * 12, 14, C.paper, 2)
  }
  for (let i = 0; i < 4; i++) c.ellipse(48, 78 + i * 3, 12 - i * 2, 5, i % 2 ? r[1] : r[2])
  shade(c, 48, 58, 16, 20, r)
  c.stroke(42, 40, 40, 30, r[2], 3)
  c.stroke(54, 40, 56, 30, r[2], 3)
  eye(c, 37, 24, e, 5)
  eye(c, 54, 24, e, 5)
}

function orb(c: Pix, _r: Ramp, e: number): void {
  c.ring(48, 50, 42, 11, C.rust)
  c.ring(48, 50, 41, 10, C.gold)
  c.ring(48, 50, 36, 8, C.rust)
  c.ball(48, 48, 22, R.dark)
  c.circle(48, 48, 17, C.void)
  c.halo(48, 48, 22, 6, e)
  c.ring(48, 50, 42, 11, C.gold)
  c.ring(48, 50, 38, 9, C.pink)
  c.rect(40, 42, 5, 6, e)
  c.rect(52, 42, 5, 6, e)
  c.rect(44, 56, 9, 2, e)
  sparkle(c, 12, 16, C.white)
  sparkle(c, 84, 82, C.white)
  sparkle(c, 82, 14, C.glow)
}

function lich(c: Pix, r: Ramp, e: number): void {
  c.poly(
    [
      [30, 38],
      [66, 38],
      [82, 90],
      [14, 90],
    ],
    r[2],
  )
  c.poly(
    [
      [32, 40],
      [62, 40],
      [76, 88],
      [20, 88],
    ],
    r[1],
  )
  c.rect(26, 74, 50, 3, r[2])
  c.rect(78, 14, 3, 76, C.rust)
  c.ball(80, 12, 8, R.purple)
  c.halo(80, 12, 8, 4, e)
  c.stroke(60, 52, 78, 44, r[2], 7)
  c.rect(75, 40, 8, 8, C.paper)
  c.stroke(36, 52, 24, 66, r[2], 7)
  c.rect(20, 64, 8, 8, C.paper)
  c.poly(
    [
      [28, 38],
      [34, 10],
      [62, 10],
      [68, 38],
    ],
    r[2],
  )
  c.ball(48, 26, 14, R.paper)
  c.ellipse(48, 38, 9, 5, C.paper)
  c.ellipse(41, 25, 5, 6, C.void)
  c.ellipse(55, 25, 5, 6, C.void)
  c.rect(40, 24, 3, 3, e)
  c.rect(54, 24, 3, 3, e)
  c.tri(46, 32, 51, 32, 48.5, 28, C.void)
  for (let i = 0; i < 5; i++) c.rect(42 + i * 3, 38, 2, 3, C.ink)
}

function minotaur(c: Pix, r: Ramp, e: number): void {
  c.box(28, 72, 16, 18, R.dark)
  c.box(52, 72, 16, 18, R.dark)
  c.stroke(20, 46, 8, 72, r[2], 13)
  c.stroke(76, 46, 88, 72, r[2], 13)
  c.box(78, 60, 14, 16, R.steel)
  shade(c, 48, 58, 32, 26, r)
  c.rect(24, 68, 48, 5, C.rust)
  c.stroke(34, 22, 18, 22, C.paper, 5)
  c.stroke(18, 22, 12, 6, C.paper, 5)
  c.stroke(62, 22, 78, 22, C.paper, 5)
  c.stroke(78, 22, 84, 6, C.paper, 5)
  c.ellipse(48, 28, 15, 17, r[2])
  c.ellipse(47, 27, 14, 16, r[1])
  c.ellipse(41, 18, 5, 3, r[0])
  c.ellipse(48, 40, 10, 7, C.pink)
  c.rect(42, 40, 3, 4, C.ink)
  c.rect(51, 40, 3, 4, C.ink)
  c.ring(48, 46, 4, 3, C.gold)
  eye(c, 37, 26, e, 4)
  eye(c, 54, 26, e, 4)
  c.rect(36, 22, 10, 2, C.ink)
  c.rect(52, 22, 10, 2, C.ink)
}

function vampire(c: Pix, r: Ramp, e: number): void {
  c.poly(
    [
      [34, 28],
      [62, 28],
      [92, 90],
      [4, 90],
    ],
    r[2],
  )
  c.poly(
    [
      [36, 32],
      [60, 32],
      [84, 88],
      [12, 88],
    ],
    r[1],
  )
  c.box(34, 46, 28, 42, R.dark)
  c.tri(48, 46, 40, 36, 56, 36, C.paper)
  c.rect(46, 52, 4, 16, C.red)
  c.tri(34, 40, 48, 44, 30, 54, R.red[1])
  c.tri(62, 40, 48, 44, 66, 54, R.red[1])
  c.ellipse(48, 26, 12, 14, C.paper)
  c.ellipse(48, 14, 13, 7, C.void)
  c.tri(40, 14, 48, 22, 56, 14, C.void)
  eye(c, 40, 24, e, 4)
  eye(c, 50, 24, e, 4)
  c.rect(42, 34, 12, 2, C.ink)
  c.tri(43, 35, 46, 35, 44.5, 42, C.white)
  c.tri(51, 35, 54, 35, 52.5, 42, C.white)
  c.stroke(32, 56, 24, 76, C.paper, 5)
  c.stroke(64, 56, 72, 76, C.paper, 5)
}

function demon(c: Pix, r: Ramp, e: number): void {
  c.poly(
    [
      [30, 44],
      [6, 10],
      [20, 26],
      [22, 6],
      [34, 30],
    ],
    R.purple[2],
  )
  c.poly(
    [
      [66, 44],
      [90, 10],
      [76, 26],
      [74, 6],
      [62, 30],
    ],
    R.purple[2],
  )
  c.stroke(60, 80, 82, 86, r[2], 4)
  c.tri(80, 78, 94, 84, 80, 92, r[0])
  c.box(32, 70, 12, 18, R.dark)
  c.box(52, 70, 12, 18, R.dark)
  shade(c, 48, 58, 22, 22, r)
  c.stroke(28, 48, 14, 68, r[2], 8)
  c.stroke(68, 48, 82, 68, r[2], 8)
  c.tri(38, 22, 30, 4, 46, 18, C.paper)
  c.tri(58, 22, 66, 4, 50, 18, C.paper)
  c.ellipse(48, 30, 14, 13, r[2])
  c.ellipse(47, 29, 13, 12, r[1])
  c.ellipse(41, 23, 5, 3, r[0])
  slit(c, 37, 27, e, 7)
  slit(c, 52, 27, e, 7)
  c.rect(40, 38, 16, 3, C.ink)
  fangs(c, 41, 40, 14, 4)
}

function gremlin(c: Pix, r: Ramp, e: number): void {
  c.tri(30, 40, 4, 24, 28, 56, r[2])
  c.tri(66, 40, 92, 24, 68, 56, r[2])
  c.tri(30, 42, 10, 30, 28, 52, C.pink)
  c.tri(66, 42, 86, 30, 68, 52, C.pink)
  c.box(30, 72, 12, 16, r)
  c.box(54, 72, 12, 16, r)
  shade(c, 48, 66, 18, 16, r)
  c.stroke(32, 62, 20, 82, r[2], 6)
  c.stroke(64, 62, 78, 80, r[2], 6)
  c.ellipse(48, 38, 22, 20, r[2])
  c.ellipse(47, 37, 21, 19, r[1])
  c.ellipse(39, 26, 7, 4, r[0])
  eye(c, 33, 32, e, 8)
  eye(c, 51, 32, e, 8)
  c.rect(34, 50, 28, 3, C.ink)
  for (let i = 0; i < 5; i++) c.tri(35 + i * 5.4, 50, 39 + i * 5.4, 50, 37 + i * 5.4, 56, C.white)
}

function djinn(c: Pix, r: Ramp, e: number): void {
  for (let i = 0; i < 6; i++) {
    const w = 28 - i * 4
    const x = 48 + Math.sin(i * 1.1) * 8
    c.ellipse(x, 62 + i * 5, w, 6, i % 2 ? r[1] : r[2])
  }
  c.ellipse(46, 62, 20, 7, r[0])
  shade(c, 48, 46, 22, 20, r)
  c.stroke(28, 44, 40, 58, r[1], 8)
  c.stroke(68, 44, 56, 58, r[1], 8)
  c.stroke(40, 58, 58, 52, r[1], 8)
  c.rect(26, 40, 8, 5, C.gold)
  c.rect(62, 40, 8, 5, C.gold)
  c.ellipse(48, 22, 12, 12, r[1])
  c.ellipse(43, 17, 4, 3, r[0])
  c.ellipse(48, 8, 6, 5, r[2])
  c.rect(46, 4, 4, 4, C.gold)
  eye(c, 40, 20, e, 4)
  eye(c, 50, 20, e, 4)
  c.rect(42, 28, 12, 2, C.ink)
  c.rect(30, 36, 36, 3, C.gold)
}

function robot(c: Pix, r: Ramp, e: number): void {
  c.line(48, 8, 48, 16, C.mid)
  c.ball(48, 8, 4, R.red)
  c.box(30, 70, 14, 18, R.steel)
  c.box(52, 70, 14, 18, R.steel)
  c.box(26, 42, 44, 32, r)
  c.rect(30, 48, 36, 18, C.deep)
  for (let i = 0; i < 4; i++) c.rect(32 + i * 8, 50 + (i % 2) * 6, 5, 6, i % 2 ? e : C.term)
  c.stroke(22, 48, 8, 66, r[2], 7)
  c.stroke(74, 48, 88, 66, r[2], 7)
  c.box(4, 64, 10, 10, R.steel)
  c.box(82, 64, 10, 10, R.steel)
  c.box(24, 16, 48, 30, r)
  c.rect(28, 20, 40, 18, C.deep)
  c.rect(31, 24, 7, 7, e)
  c.rect(44, 22, 7, 7, C.red)
  c.rect(57, 26, 7, 7, e)
  c.rect(32, 34, 32, 2, C.mid)
  c.rect(20, 26, 4, 10, C.mid)
  c.rect(72, 26, 4, 10, C.mid)
}

function tornado(c: Pix, r: Ramp, e: number): void {
  for (let i = 0; i < 9; i++) {
    const y = 84 - i * 8
    const rx = 8 + i * 4
    const x = 48 + Math.sin(i * 0.9) * 6
    c.ellipse(x, y, rx, 5, i % 2 ? r[1] : r[2])
    c.rect(x - rx + 4, y - 3, rx, 1, r[0])
  }
  for (const [x, y] of [
    [10, 18],
    [84, 26],
    [18, 40],
    [80, 50],
    [8, 66],
  ] as const) {
    c.rect(x, y, 4, 4, C.rust)
    c.px(x, y, C.gold)
  }
  eye(c, 36, 40, e, 6)
  eye(c, 54, 40, e, 6)
  c.rect(42, 52, 14, 3, C.ink)
}

function rackBeast(c: Pix, _r: Ramp, e: number): void {
  c.box(30, 76, 14, 12, R.dark)
  c.box(54, 76, 14, 12, R.dark)
  rack(c, 22, 8, 52, 70, C.glow)
  c.rect(26, 22, 14, 8, C.void)
  c.rect(56, 22, 14, 8, C.void)
  c.rect(30, 24, 6, 4, e)
  c.rect(60, 24, 6, 4, e)
  c.rect(34, 44, 28, 4, C.ink)
  fangs(c, 35, 48, 26, 5)
  c.stroke(22, 40, 8, 64, C.gray, 4)
  c.stroke(74, 40, 88, 64, C.gray, 4)
  c.ellipse(8, 66, 5, 4, C.mid)
  c.ellipse(88, 66, 5, 4, C.mid)
}

function clone(c: Pix, r: Ramp, e: number): void {
  for (const [x, back] of [
    [60, true],
    [36, false],
  ] as const) {
    const body: Ramp = back ? R.dark : r
    c.box(x - 12, 70, 10, 18, back ? R.dark : R.steel)
    c.box(x + 2, 70, 10, 18, back ? R.dark : R.steel)
    c.box(x - 16, 38, 32, 34, body)
    c.stroke(x - 16, 44, x - 24, 64, body[2], 7)
    c.stroke(x + 16, 44, x + 24, 64, body[2], 7)
    c.ellipse(x, 24, 13, 14, back ? C.gray : C.paper)
    c.ellipse(x, 14, 13, 6, C.void)
    c.rect(x - 8, 24, 5, 4, back ? C.red : e)
    c.rect(x + 3, 24, 5, 4, back ? C.red : e)
    c.rect(x - 5, 33, 10, 2, C.ink)
  }
  c.rect(34, 46, 4, 20, C.gold)
}

const DRAWERS: Record<Kind, Draw> = {
  hydra,
  beetle,
  ghost,
  brute,
  golem,
  centipede,
  kraken,
  dragon,
  ooze,
  pods,
  cubes,
  shards,
  sphinx,
  serpent,
  shark,
  lobster,
  orb,
  lich,
  minotaur,
  vampire,
  demon,
  gremlin,
  djinn,
  robot,
  tornado,
  rack: rackBeast,
  clone,
}

function drawProp(c: Pix, prop: Prop, accent: Ramp): void {
  const x = 80
  const y = 14
  switch (prop) {
    case "fork":
      c.stroke(x, y + 14, x, y - 2, C.mid, 3)
      c.stroke(x - 7, y - 2, x + 7, y - 2, C.mid, 3)
      c.stroke(x - 7, y - 2, x - 7, y - 12, C.mid, 3)
      c.stroke(x + 7, y - 2, x + 7, y - 12, C.mid, 3)
      break
    case "wafer":
      wafer(c, x, y, 9, accent[0])
      break
    case "chip":
      chip(c, x - 6, y - 6, 12, C.gold)
      break
    case "coin":
      coins(c, x, y + 4, 2, 7)
      break
    case "bolt":
      c.poly(
        [
          [x + 3, y - 12],
          [x - 8, y + 2],
          [x - 1, y + 2],
          [x - 4, y + 13],
          [x + 8, y - 2],
          [x + 1, y - 2],
        ],
        C.gold,
      )
      break
    case "pager":
      c.box(x - 8, y - 6, 16, 12, R.steel)
      c.rect(x - 5, y - 3, 10, 4, C.term)
      c.rect(x - 4, y + 3, 3, 2, C.red)
      break
    case "doc":
      c.box(x - 7, y - 9, 14, 18, R.paper)
      for (let i = 0; i < 3; i++) c.rect(x - 4, y - 5 + i * 4, 8, 1, C.gray)
      break
    case "cube":
      c.box(x - 7, y - 7, 14, 14, accent)
      c.rect(x - 4, y - 4, 8, 8, C.deep)
      break
    case "globe":
      globe(c, x, y, 9)
      break
    case "clock":
      c.circle(x, y, 9, C.paper)
      c.ring(x, y, 9, 9, C.gray)
      c.rect(x, y - 6, 1, 6, C.ink)
      c.rect(x, y, 5, 1, C.ink)
      break
    case "flame":
      flame(c, x, y + 10, 20)
      break
    case "sparkle":
      sparkle(c, x, y, C.white, 6)
      sparkle(c, x + 8, y + 8, C.glow, 3)
      break
    case "crown":
      c.rect(x - 8, y + 2, 16, 5, C.gold)
      c.tri(x - 8, y + 2, x - 4, y + 2, x - 8, y - 8, C.gold)
      c.tri(x - 4, y + 2, x + 4, y + 2, x, y - 10, C.gold)
      c.tri(x + 4, y + 2, x + 8, y + 2, x + 8, y - 8, C.gold)
      c.px(x, y + 4, C.red)
      break
  }
}

const L = (kind: Kind, ramp: Ramp, prop?: Prop, eye?: number): Look => ({ kind, ramp, prop, eye })

/** One look per enemy id. Names drive the kind; the era-ish ramp keeps each tier family readable. */
export const ENEMY_LOOKS: Record<number, Look> = {
  1: L("hydra", R.blue, "fork", C.red),
  2: L("beetle", R.rust, undefined, C.ink),
  3: L("ghost", R.metal, undefined, C.glow),
  4: L("brute", R.green, "doc", C.red),
  5: L("ghost", R.purple, undefined, C.pink),
  6: L("golem", R.steel, "cube", C.red),
  7: L("centipede", R.green, undefined, C.red),
  8: L("brute", R.rust, "doc", C.glow),
  9: L("ghost", R.paper, undefined, C.blue),
  10: L("ghost", R.green, "sparkle", C.gold),
  11: L("demon", R.red, "pager", C.gold),
  12: L("kraken", R.purple, "bolt", C.gold),
  13: L("golem", R.rust, "coin", C.red),
  14: L("gremlin", R.green, "doc", C.red),
  15: L("vampire", R.red, "clock", C.red),
  16: L("lich", R.green, "doc", C.term),
  17: L("ooze", R.green, "chip", C.ink),
  18: L("cubes", R.blue, undefined, C.glow),
  19: L("sphinx", R.gold, "doc", C.blue),
  20: L("gremlin", R.purple, "sparkle", C.pink),
  21: L("dragon", R.gold, "coin", C.red),
  22: L("hydra", R.purple, undefined, C.gold),
  23: L("clone", R.red, undefined, C.glow),
  24: L("robot", R.purple, "sparkle", C.pink),
  25: L("golem", R.green, "chip", C.gold),
  26: L("serpent", R.gold, "doc", C.red),
  27: L("shark", R.metal, "coin", C.red),
  28: L("demon", R.green, "fork", C.gold),
  29: L("serpent", R.red, "crown", C.gold),
  30: L("ghost", R.gold, "wafer", C.red),
  31: L("dragon", R.green, "chip", C.gold),
  32: L("golem", R.metal, "bolt", C.red),
  33: L("djinn", R.rust, "flame", C.gold),
  34: L("ghost", R.blue, "wafer", C.glow),
  35: L("minotaur", R.purple, "sparkle", C.red),
  36: L("kraken", R.gold, "cube", C.red),
  37: L("rack", R.steel, "bolt", C.red),
  38: L("ghost", R.dark, "globe", C.red),
  39: L("shards", R.metal, undefined, C.red),
  40: L("dragon", R.rust, "flame", C.glow),
  41: L("tornado", R.rust, undefined, C.ink),
  42: L("lobster", R.purple, "clock", C.glow),
  43: L("golem", R.green, "globe", C.glow),
  44: L("orb", R.dark, "coin", C.glow),
}

const gridCache = new Map<number, Pix>()
const urlCache = new Map<number, string>()

/** 96×96 palette-indexed art with a 1px ink outline. Unknown ids fall back to the first enemy. */
export function enemyGrid(id: number): Pix {
  const hit = gridCache.get(id)
  if (hit) return hit
  const look = ENEMY_LOOKS[id] ?? ENEMY_LOOKS[1]
  const grid = new Pix(ENEMY_SIZE, ENEMY_SIZE)
  if (look) {
    DRAWERS[look.kind](grid, look.ramp, look.eye ?? C.red)
    if (look.prop) drawProp(grid, look.prop, look.ramp)
  }
  grid.outline(C.ink)
  gridCache.set(id, grid)
  return grid
}

/** PNG data URL, built once per enemy. Pure JS, no canvas. */
export function enemySprite(id: number): string {
  const hit = urlCache.get(id)
  if (hit) return hit
  const grid = enemyGrid(id)
  const url = pngDataUrl(grid.data, grid.w, grid.h, PALETTE)
  urlCache.set(id, url)
  return url
}

export const ENEMY_IDS: readonly number[] = ENEMIES.map((enemy) => enemy.id)
