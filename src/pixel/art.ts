import {
  arch,
  book,
  building,
  chip,
  coins,
  crystal,
  desk,
  dome,
  flame,
  gear,
  globe,
  gpu,
  ground,
  laptop,
  mini,
  monitor,
  orb,
  person,
  rack,
  robot,
  rocket,
  satellite,
  screenCode,
  shelf,
  sparkle,
  tower,
  wafer,
} from "./motifs.ts"
import { C, R } from "./palette.ts"
import type { Ramp } from "./palette.ts"
import type { Pix } from "./pix.ts"

type Draw = (c: Pix, a: Ramp) => void

/**
 * One 64×64 drawing per tier (id 0 is the opening attic). Light is top-left, fills use the
 * shared palette only, and the 1px ink outline is added afterwards by sprites.ts.
 * `a` is the era accent ramp.
 */
export const DRAW: Record<number, Draw> = {
  0: (c) => {
    c.box(8, 6, 28, 30, R.steel)
    c.rect(11, 9, 22, 24, C.deep)
    c.halo(22, 21, 8, 3, C.gray)
    c.ball(22, 21, 8, R.paper)
    c.px(14, 12, C.white)
    c.px(29, 14, C.white)
    c.px(15, 29, C.white)
    c.rect(21, 9, 2, 24, C.ink)
    c.rect(11, 20, 22, 2, C.ink)
    desk(c, 46)
    c.rect(40, 38, 2, 8, C.mid)
    c.tri(36, 38, 46, 38, 41, 30, C.gold)
    c.rect(40, 30, 2, 2, C.paper)
    book(c, 12, 40, 14, 6, R.red)
    book(c, 14, 36, 12, 4, R.blue)
    c.box(46, 40, 10, 6, R.paper)
    sparkle(c, 52, 22, C.gold)
  },
  1: (c, a) => {
    desk(c)
    laptop(c, 14, 24, 34, a[0])
    c.rect(50, 42, 7, 8, C.paper)
    c.rect(57, 44, 2, 4, C.paper)
    c.rect(51, 40, 1, 2, C.mid)
    c.rect(54, 39, 1, 3, C.mid)
    sparkle(c, 52, 14, C.term, 2)
    sparkle(c, 10, 18, C.term, 1)
  },
  2: (c, a) => {
    c.box(6, 8, 52, 44, R.paper)
    c.rect(7, 9, 50, 7, C.mid)
    for (let i = 0; i < 3; i++) c.rect(10 + i * 5, 11, 3, 3, [C.red, C.gold, C.green][i] ?? C.red)
    c.tri(13, 36, 27, 36, 20, 22, C.rust)
    c.rect(16, 36, 8, 8, C.rust)
    c.rect(34, 22, 18, 3, C.gray)
    c.rect(34, 29, 14, 2, C.mid)
    c.rect(34, 34, 18, 2, C.mid)
    c.rect(34, 39, 10, 2, C.mid)
    c.box(34, 44, 10, 5, R.green)
    c.rect(14, 46, 12, 2, a[1])
    c.rect(10, 18, 2, 30, C.mid)
  },
  3: (c) => {
    for (let i = 0; i < 7; i++) c.box(5 + i * 8, 46, 6, 8, i < 6 ? R.green : R.gold)
    flame(c, 32, 44, 34, [C.green, C.term, C.paper])
    c.rect(24, 54, 16, 3, C.gray)
    sparkle(c, 12, 22, C.term, 2)
    sparkle(c, 52, 18, C.term, 1)
  },
  4: (c) => {
    c.box(6, 32, 46, 26, R.green)
    chip(c, 14, 38, 12)
    c.box(32, 38, 8, 8, R.dark)
    for (let i = 0; i < 12; i++) c.rect(10 + i * 3, 34, 2, 2, C.gold)
    c.box(50, 36, 10, 8, R.metal)
    c.box(50, 46, 10, 8, R.metal)
    c.circle(10, 54, 1, C.void)
    c.circle(48, 54, 1, C.void)
    c.ellipse(32, 20, 17, 9, C.rust)
    c.ellipse(31, 18, 15, 7, C.gold)
    c.ellipse(31, 17, 10, 4, C.red)
    c.rect(26, 15, 3, 2, C.pink)
    c.rect(34, 18, 3, 2, C.pink)
    c.rect(28, 4, 2, 6, C.mid)
    c.rect(35, 2, 2, 7, C.mid)
  },
  5: (c, a) => {
    c.box(18, 48, 28, 8, R.purple)
    c.box(24, 44, 16, 5, R.purple)
    c.ball(32, 26, 18, R.blue)
    const nodes: ReadonlyArray<readonly [number, number]> = [[24, 20], [34, 16], [40, 28], [28, 32], [20, 30]]
    nodes.forEach((n, i) => {
      const next = nodes[(i + 1) % nodes.length]
      if (next) c.line(n[0], n[1], next[0], next[1], C.paper)
    })
    c.line(24, 20, 40, 28, C.glow)
    for (const [x, y] of nodes) c.rect(x - 1, y - 1, 3, 3, a[0])
    c.tri(30, 24, 30, 31, 36, 27, C.white)
  },
  6: (c) => {
    c.box(6, 10, 52, 36, R.dark)
    c.rect(7, 11, 50, 5, C.gray)
    c.rect(10, 13, 3, 1, C.red)
    c.rect(15, 13, 3, 1, C.gold)
    c.rect(10, 20, 8, 2, C.term)
    c.rect(20, 20, 18, 2, C.paper)
    c.rect(10, 26, 6, 2, C.blue)
    c.rect(18, 26, 14, 2, C.mid)
    c.rect(10, 32, 8, 2, C.term)
    c.rect(20, 32, 2, 3, C.term)
    for (const x of [14, 30, 46]) {
      c.stroke(x, 62, x, 44, C.green, 2)
      c.rect(x - 4, 44, 3, 2, C.paper)
      c.rect(x + 2, 42, 3, 2, C.paper)
      c.rect(x - 2, 38, 3, 2, C.paper)
      c.rect(x + 1, 36, 3, 2, C.gold)
    }
  },
  7: (c) => {
    const greens = [C.gray, C.green, C.term, C.green, C.gray, C.term, C.green]
    for (let j = 0; j < 5; j++) {
      for (let i = 0; i < 7; i++) c.box(5 + i * 8, 4 + j * 7, 6, 6, [C.term, greens[(i * 3 + j * 5) % 7] ?? C.gray, C.gray])
    }
    c.ball(32, 54, 8, R.purple)
    c.tri(24, 50, 26, 40, 30, 47, C.purple)
    c.tri(40, 50, 38, 40, 34, 47, C.purple)
    c.rect(28, 52, 2, 2, C.gold)
    c.rect(34, 52, 2, 2, C.gold)
    for (const x of [22, 28, 36, 42]) c.stroke(x, 58, x - 1, 61, C.purple, 2)
  },
  8: (c, a) => {
    c.box(4, 30, 56, 26, R.steel)
    const caps = [C.gold, a[1], C.pink, C.paper, C.green]
    for (let j = 0; j < 3; j++) {
      for (let i = 0; i < 8; i++) c.box(7 + i * 6, 33 + j * 7, 5, 6, [C.white, caps[(i + j * 2) % caps.length] ?? C.paper, C.gray])
    }
    c.box(14, 53, 36, 2, R.metal)
    c.ring(32, 20, 8, 5, C.gold)
    c.ring(32, 20, 15, 9, C.gold)
    c.ring(32, 20, 22, 13, C.paper)
  },
  9: (c) => {
    c.box(4, 24, 26, 30, R.paper)
    c.box(32, 24, 26, 30, R.paper)
    c.rect(30, 24, 2, 30, C.gray)
    screenCode(c, 8, 29, 18, 20, C.blue)
    screenCode(c, 36, 29, 18, 20, C.green)
    c.ball(48, 12, 8, R.gold)
    c.rect(46, 10, 4, 4, C.rust)
    c.tri(42, 18, 46, 18, 42, 30, C.red)
    c.tri(50, 18, 54, 18, 54, 30, C.red)
    c.box(8, 6, 22, 14, R.blue)
    c.rect(10, 9, 18, 2, C.paper)
  },
  10: (c) => {
    c.halo(32, 16, 10, 4, C.gold)
    c.ball(32, 16, 10, R.gold)
    chip(c, 27, 11, 10, C.rust)
    c.box(10, 32, 36, 22, R.paper)
    for (let i = 0; i < 5; i++) c.rect(14 + i * 6, 31, 2, 3, C.gray)
    screenCode(c, 14, 38, 28, 14, C.blue)
    c.tri(52, 36, 62, 36, 57, 44, C.gold)
    c.tri(52, 54, 62, 54, 57, 46, C.gold)
    c.rect(51, 34, 12, 2, C.rust)
    c.rect(51, 54, 12, 2, C.rust)
  },
  11: (c) => {
    desk(c)
    laptop(c, 6, 28, 26, C.glow)
    for (let i = 0; i < 3; i++) c.box(38 + i * 8, 10 + (i % 2) * 6, 7, 7, [C.paper, [C.pink, C.gold, C.glow][i] ?? C.gold, C.gray])
    c.tri(40, 34, 60, 34, 50, 49, C.gold)
    c.rect(40, 33, 20, 3, C.rust)
    c.circle(48, 39, 2, C.red)
    c.circle(53, 40, 2, C.red)
  },
  12: (c) => {
    shelf(c)
    c.box(8, 18, 34, 34, R.metal)
    c.rect(12, 44, 14, 2, C.gray)
    c.px(36, 45, C.glow)
    c.px(38, 45, C.glow)
    c.rect(12, 22, 26, 1, C.paper)
    c.ellipse(52, 47, 8, 5, C.gray)
    c.rect(44, 40, 17, 6, C.gray)
    c.ellipse(52, 41, 8, 3, C.gold)
    c.rect(48, 38, 3, 2, C.rust)
    c.rect(53, 39, 3, 2, C.rust)
  },
  13: (c, a) => {
    c.stroke(14, 14, 14, 50, a[1], 3)
    c.stroke(14, 30, 32, 30, a[1], 3)
    c.stroke(32, 30, 38, 22, C.green, 3)
    c.stroke(38, 22, 50, 22, C.green, 3)
    for (const [x, y] of [[14, 12], [14, 52], [52, 22]] as const) c.ball(x, y, 6, R.paper)
    c.ball(52, 22, 4, R.green)
    c.ball(44, 46, 9, R.red)
    c.stroke(40, 46, 43, 49, C.paper, 2)
    c.stroke(43, 49, 49, 42, C.paper, 2)
  },
  14: (c) => {
    c.rect(6, 12, 3, 46, C.gray)
    c.rect(55, 12, 3, 46, C.gray)
    c.rect(6, 36, 52, 3, C.gray)
    c.rect(6, 56, 52, 3, C.gray)
    gpu(c, 11, 22, 42)
    gpu(c, 11, 41, 42, C.pink)
    c.rect(31, 2, 2, 6, C.mid)
    c.halo(32, 12, 4, 4, C.gold)
    c.ball(32, 12, 4, R.gold)
  },
  15: (c) => {
    c.tri(6, 20, 58, 20, 32, 4, C.paper)
    c.tri(14, 19, 50, 19, 32, 8, C.mid)
    c.rect(6, 20, 52, 3, C.paper)
    for (let i = 0; i < 5; i++) c.box(9 + i * 11, 24, 6, 26, R.paper)
    c.box(4, 50, 56, 4, R.steel)
    c.box(2, 54, 60, 4, R.steel)
    crystal(c, 32, 19, 12, R.blue)
  },
  16: (c) => {
    laptop(c, 10, 34, 40, C.blue)
    c.ellipse(32, 30, 16, 8, C.paper)
    c.ellipse(30, 28, 12, 5, C.white)
    c.ball(46, 26, 5, R.paper)
    c.tri(44, 22, 46, 15, 48, 22, C.paper)
    c.rect(47, 25, 2, 1, C.ink)
    c.rect(18, 24, 12, 1, C.mid)
    sparkle(c, 12, 20, C.glow, 1)
    sparkle(c, 54, 14, C.glow, 2)
  },
  17: (c, a) => {
    c.stroke(22, 2, 28, 18, C.rust, 2)
    c.stroke(42, 2, 36, 18, C.rust, 2)
    c.rect(28, 16, 8, 4, C.mid)
    c.box(18, 20, 28, 36, R.paper)
    c.ball(32, 31, 6, R.metal)
    c.rect(26, 38, 12, 4, C.mid)
    c.rect(22, 46, 20, 2, a[1])
    c.rect(22, 50, 12, 2, C.gray)
    c.rect(22, 21, 20, 3, a[1])
  },
  18: (c) => {
    c.box(5, 8, 54, 42, R.rust)
    c.rect(9, 12, 46, 34, C.paper)
    c.halo(32, 17, 8, 3, C.rust)
    for (let i = 0; i < 5; i++) {
      const y = 14 + i * 6
      c.tri(12, y + 4, 18, y + 4, 15, y, i === 0 ? C.rust : C.mid)
      c.rect(22, y + 1, 26 - (i % 3) * 4, 3, i === 0 ? C.ink : C.gray)
    }
    for (let i = 0; i < 10; i++) c.ball(8 + i * 5.5, 55 + (i % 2), 2.5, i % 3 === 0 ? R.rust : R.metal)
  },
  19: (c, a) => {
    desk(c)
    monitor(c, 4, 22, 20, 14, a[0])
    monitor(c, 40, 22, 20, 14, C.glow)
    person(c, 32, 18, R.purple, "hood")
    sparkle(c, 28, 10, C.gold, 1)
    sparkle(c, 38, 8, C.gold, 2)
    c.rect(26, 40, 12, 3, C.mid)
  },
  20: (c) => {
    c.ellipse(32, 44, 26, 10, C.blue)
    c.ellipse(32, 47, 22, 6, C.paper)
    c.tri(54, 40, 62, 26, 58, 44, C.blue)
    c.circle(16, 41, 1, C.ink)
    c.rect(22, 54, 20, 3, C.glow)
    c.rect(6, 56, 52, 2, C.glow)
    const cols = [C.red, C.gold, C.green, C.blue]
    for (let i = 0; i < 3; i++) c.box(12 + i * 13, 24, 12, 8, [C.paper, cols[i] ?? C.red, C.gray])
    for (let i = 0; i < 2; i++) c.box(18 + i * 13, 16, 12, 8, [C.paper, cols[i + 2] ?? C.red, C.gray])
  },
  21: (c, a) => {
    c.box(28, 36, 8, 22, R.rust)
    c.box(24, 32, 16, 6, R.steel)
    flame(c, 32, 34, 30, [C.rust, C.gold, C.paper])
    crystal(c, 10, 28, 10, R.blue)
    crystal(c, 54, 24, 10, a)
    crystal(c, 48, 52, 8, R.blue)
    crystal(c, 14, 54, 8, a)
  },
  22: (c) => {
    c.ball(32, 28, 20, R.rust)
    c.circle(32, 28, 14, C.deep)
    for (let i = 0; i < 8; i++) {
      const t = (i * Math.PI) / 4
      c.stroke(32 + Math.cos(t) * 5, 28 + Math.sin(t) * 5, 32 + Math.cos(t) * 25, 28 + Math.sin(t) * 25, C.gold, 3)
    }
    c.ball(32, 28, 7, R.gold)
    c.circle(32, 28, 2, C.rust)
    for (let i = 0; i < 4; i++) c.box(8 + i * 14, 54, 11, 7, R.blue)
  },
  23: (c, a) => {
    c.box(2, 18, 60, 7, R.blue)
    c.rect(4, 20, 56, 2, C.glow)
    for (let i = 0; i < 4; i++) c.rect(10 + i * 13, 19, 3, 2, C.white)
    for (let i = 0; i < 4; i++) {
      c.rect(6 + i * 15, 25, 11, 30, C.mid)
      c.rect(10 + i * 15, 36, 3, 19, C.deep)
      c.ellipse(11.5 + i * 15, 36, 3, 3, C.deep)
    }
    c.box(0, 54, 64, 6, R.steel)
    c.box(4, 6, 12, 12, R.rust)
    c.rect(8, 6, 4, 4, C.deep)
    gear(c, 32, 10, 5, a)
    rack(c, 46, 2, 14, 16, a[0])
  },
  24: (c) => {
    c.box(24, 6, 36, 34, R.dark)
    c.line(30, 12, 30, 34, C.gray)
    c.line(30, 34, 55, 34, C.gray)
    c.stroke(30, 34, 36, 22, C.term, 2)
    c.stroke(36, 22, 44, 16, C.term, 2)
    c.stroke(44, 16, 54, 14, C.term, 2)
    c.line(30, 34, 54, 12, C.gray)
    person(c, 12, 28, R.green, "hood")
    ground(c)
  },
  25: (c) => {
    c.box(8, 6, 48, 50, R.gold)
    c.box(12, 10, 40, 30, R.dark)
    c.rect(32, 10, 1, 8, C.mid)
    c.stroke(26, 18, 32, 23, C.mid, 2)
    c.stroke(38, 18, 32, 23, C.mid, 2)
    robot(c, 32, 24, C.glow)
    ;[[18, 36, C.red], [24, 36, C.glow], [40, 36, C.pink], [46, 36, C.green]].forEach(([x, y, col]) => c.ball(x ?? 0, y ?? 0, 3, [C.paper, col ?? C.red, C.gray]))
    c.rect(14, 44, 14, 6, C.deep)
    c.ball(44, 47, 4, R.red)
    c.rect(43, 52, 2, 4, C.mid)
    c.rect(8, 56, 48, 4, C.rust)
  },
  26: (c, a) => {
    c.box(14, 44, 36, 8, R.steel)
    c.box(8, 52, 48, 8, R.steel)
    orb(c, 32, 24, 11, R.blue)
    c.px(28, 20, C.white)
    for (let i = 0; i < 3; i++) {
      const cx = 20 + i * 12
      c.ball(cx, 48, 4, R.metal)
      c.line(cx, 48, cx + (i - 1) * 2, 45, a[1])
    }
  },
  27: (c) => {
    c.rect(4, 22, 3, 36, C.rust)
    c.rect(57, 22, 3, 36, C.rust)
    for (let x = 6; x <= 58; x++) {
      const t = (x - 6) / 52
      c.rect(x, 36 + Math.sin(t * Math.PI) * 10, 1, 4, C.pink)
    }
    c.ball(24, 40, 5, R.paper)
    c.box(28, 42, 14, 6, R.green)
    c.box(40, 12, 14, 22, R.steel)
    c.rect(42, 14, 10, 18, C.deep)
    for (let i = 0; i < 4; i++) c.rect(44 + (i % 2) * 3, 16 + i * 4, 4, 2, [C.glow, C.pink, C.gold, C.term][i] ?? C.glow)
    sparkle(c, 18, 16, C.gold, 2)
    sparkle(c, 30, 8, C.glow, 1)
  },
  28: (c, a) => {
    c.ellipse(26, 36, 20, 24, C.rust)
    c.ellipse(26, 36, 16, 20, C.deep)
    c.box(14, 32, 20, 9, R.paper)
    c.rect(26, 34, 6, 5, a[1])
    sparkle(c, 20, 20, C.glow, 3)
    rocket(c, 50, 4, 28)
    c.rect(22, 58, 8, 3, C.rust)
  },
  29: (c) => {
    c.box(6, 6, 52, 32, R.dark)
    c.box(10, 10, 12, 8, R.blue)
    c.box(26, 10, 12, 8, R.green)
    c.box(42, 10, 12, 8, R.gold)
    c.line(22, 14, 26, 14, C.paper)
    c.line(38, 14, 42, 14, C.paper)
    c.line(16, 18, 16, 26, C.paper)
    c.box(10, 26, 44, 6, R.steel)
    person(c, 32, 30, R.purple, "wizard")
    ground(c)
  },
  30: (c, a) => {
    for (const [x, y] of [[8, 10], [48, 10], [6, 40], [50, 42]] as const) c.line(32, 30, x + 5, y + 5, C.mid)
    c.box(24, 20, 16, 20, R.steel)
    c.rect(26, 24, 12, 3, C.deep)
    c.rect(26, 30, 12, 3, C.deep)
    c.px(28, 25, a[0])
    c.px(28, 31, C.gold)
    gear(c, 12, 14, 6, R.gold)
    chip(c, 48, 8, 10)
    c.stroke(8, 48, 18, 38, C.mid, 3)
    c.ball(7, 49, 4, R.metal)
    c.ball(55, 48, 6, R.blue)
    c.stroke(60, 54, 55, 49, C.mid, 2)
  },
  31: (c) => {
    c.box(3, 8, 58, 46, R.paper)
    c.rect(3, 8, 58, 3, C.mid)
    for (let i = 0; i < 13; i++) c.rect(8 + i * 4, 30 + Math.sin(i * 0.9) * 8, 2, 2, C.gold)
    c.ball(12, 40, 3, R.green)
    c.rect(48, 14, 2, 14, C.mid)
    c.tri(50, 14, 58, 17, 50, 21, C.red)
    orb(c, 44, 42, 6, R.blue, C.glow)
    c.rect(8, 16, 20, 2, C.gray)
    c.rect(8, 20, 14, 2, C.mid)
  },
  32: (c) => {
    c.rect(31, 18, 3, 20, C.rust)
    for (let i = 0; i < 5; i++) c.tri(18 + i * 7, 12, 24 + i * 7, 12, 21 + i * 7, 3, C.gold)
    c.box(18, 11, 35, 8, R.gold)
    c.px(35, 14, C.red)
    c.line(32, 38, 12, 46, C.mid)
    c.line(32, 38, 32, 46, C.mid)
    c.line(32, 38, 52, 46, C.mid)
    mini(c, 12, 44, R.purple)
    mini(c, 32, 44, R.blue)
    mini(c, 52, 44, R.green)
    mini(c, 22, 20, R.purple)
    ground(c)
  },
  33: (c) => {
    c.box(4, 6, 56, 36, R.blue)
    for (let x = 8; x < 58; x += 6) c.rect(x, 8, 1, 32, C.glow)
    for (let y = 12; y < 40; y += 6) c.rect(6, y, 52, 1, C.glow)
    c.rect(26, 28, 12, 12, C.paper)
    c.tri(26, 28, 38, 28, 32, 14, C.paper)
    c.rect(30, 6, 4, 10, C.paper)
    c.line(44, 38, 52, 14, C.paper)
    c.ring(44, 38, 4, 4, C.paper)
    desk(c, 46)
    c.rect(10, 42, 14, 4, C.mid)
  },
  34: (c) => {
    dome(c, 32, 38, 28, R.paper)
    c.ball(32, 38, 22, [C.glow, C.deep, C.void])
    c.rect(9, 17, 46, 22, C.deep)
    c.ring(32, 38, 22, 22, C.paper)
    rack(c, 14, 20, 11, 20, C.glow)
    rack(c, 27, 14, 11, 26, C.term)
    rack(c, 40, 20, 11, 20, C.glow)
    ground(c, R.steel, 42)
    c.box(2, 46, 60, 14, R.steel)
    c.rect(10, 52, 44, 2, C.glow)
  },
  35: (c) => {
    c.box(8, 38, 48, 20, R.rust)
    c.rect(8, 44, 48, 2, C.gold)
    c.rect(29, 42, 6, 6, C.gold)
    c.poly([[6, 38], [56, 38], [60, 22], [10, 18]], C.red)
    c.ellipse(32, 36, 22, 6, C.gold)
    coins(c, 20, 36, 3)
    coins(c, 44, 36, 4)
    coins(c, 32, 31, 3, 8)
    sparkle(c, 12, 10, C.gold, 3)
    sparkle(c, 52, 8, C.paper, 2)
    sparkle(c, 32, 12, C.glow, 2)
  },
  36: (c, a) => {
    c.box(16, 8, 32, 44, R.metal)
    c.rect(19, 11, 26, 38, C.deep)
    c.rect(19, 11, 26, 3, C.gray)
    c.ellipse(32, 30, 11, 8, C.gold)
    c.ellipse(30, 28, 8, 5, C.paper)
    c.line(32, 22, 32, 38, C.rust)
    c.line(26, 30, 38, 30, C.rust)
    for (const [x, y] of [[22, 44], [40, 18], [42, 42], [24, 16]] as const) c.circle(x, y, 1, a[0])
    c.box(10, 52, 44, 8, R.steel)
    c.rect(14, 55, 4, 2, a[1])
  },
  37: (c) => {
    c.ellipse(32, 52, 26, 8, C.gray)
    c.ellipse(32, 51, 23, 6, C.deep)
    c.ellipse(32, 51, 20, 4, C.blue)
    coins(c, 20, 52, 1, 5)
    coins(c, 42, 53, 1, 5)
    coins(c, 32, 50, 1, 4)
    rocket(c, 32, 4, 34)
    flame(c, 32, 46, 14, [C.rust, C.gold, C.paper])
    sparkle(c, 12, 20, C.gold, 2)
    sparkle(c, 54, 26, C.gold, 2)
  },
  38: (c) => {
    for (let i = 0; i < 5; i++) robot(c, 10 + i * 11, i % 2 ? 36 : 22, i % 2 ? C.term : C.glow)
    c.box(4, 54, 56, 4, R.steel)
    for (let i = 0; i < 5; i++) c.rect(5 + i * 11, 52, 10, 2, C.deep)
    person(c, 32, 0, R.paper, "hood")
    c.line(38, 12, 48, 6, C.gold)
  },
  39: (c) => {
    coins(c, 32, 56, 3, 10)
    for (const [x, y] of [[20, 44], [32, 40], [44, 44]] as const) {
      c.stroke(x, 48, x, y, C.green, 2)
      c.ball(x - 3, y, 3, R.green)
      c.ball(x + 3, y - 1, 3, R.green)
    }
    c.poly([[32, 32], [20, 12], [6, 4], [6, 20], [16, 30]], C.paper)
    c.poly([[32, 32], [44, 12], [58, 4], [58, 20], [48, 30]], C.paper)
    c.poly([[32, 32], [24, 18], [14, 12], [12, 22], [20, 30]], C.white)
    c.ball(32, 22, 5, R.gold)
    c.halo(32, 22, 5, 3, C.gold)
  },
  40: (c, a) => {
    c.box(4, 44, 56, 8, R.rust)
    c.rect(8, 52, 4, 8, C.red)
    c.rect(52, 52, 4, 8, C.red)
    c.rect(16, 4, 32, 2, C.rust)
    c.rect(20, 6, 2, 6, C.mid)
    c.rect(42, 6, 2, 6, C.mid)
    c.box(14, 12, 36, 24, R.gold)
    chip(c, 26, 18, 12, a[1])
    for (const x of [2, 54]) {
      c.rect(x, 4, 8, 3, C.mid)
      c.rect(x, 6, 8, 28, a[1])
      c.tri(x, 34, x + 8, 34, x + 4, 40, a[1])
      c.rect(x + 1, 8, 2, 24, a[0])
    }
  },
  41: (c) => {
    c.poly([[6, 2], [16, 2], [42, 42], [22, 42]], C.paper)
    c.poly([[58, 2], [48, 2], [22, 42], [42, 42]], C.paper)
    c.dither(0, 0, 64, 44, C.deep, 1)
    c.box(2, 42, 60, 10, R.rust)
    c.rect(4, 52, 56, 6, C.deep)
    c.box(22, 20, 20, 20, R.gold)
    c.tri(24, 36, 40, 36, 32, 24, C.rust)
    c.rect(30, 30, 4, 6, C.paper)
    sparkle(c, 10, 30, C.gold, 2)
    sparkle(c, 54, 26, C.gold, 2)
  },
  42: (c) => {
    c.ball(40, 34, 18, R.gold)
    c.poly([[40, 34], [40, 16], [56, 24], [58, 34]], C.blue)
    c.line(40, 34, 40, 16, C.ink)
    c.line(40, 34, 58, 34, C.ink)
    c.box(6, 6, 24, 40, R.paper)
    c.rect(10, 12, 16, 2, C.mid)
    c.rect(10, 18, 16, 2, C.mid)
    c.rect(10, 24, 10, 2, C.mid)
    c.ball(18, 38, 5, R.red)
    c.box(6, 50, 52, 8, R.paper)
    c.rect(10, 53, 30, 2, C.mid)
    c.ball(50, 54, 4, R.red)
  },
  43: (c) => {
    c.box(4, 36, 22, 24, R.red)
    c.box(10, 22, 10, 16, R.red)
    c.poly([[2, 38], [14, 38], [8, 50], [2, 46]], C.void)
    c.rect(30, 44, 26, 3, C.red)
    c.rect(32, 40, 10, 4, C.pink)
    c.box(26, 8, 28, 22, R.gold)
    for (let i = 0; i < 4; i++) c.box(26 + i * 7, 26, 6, 14, R.gold)
    c.box(52, 14, 8, 8, R.gold)
    c.box(20, 6, 12, 8, R.gold)
    c.rect(28, 12, 24, 2, C.rust)
    sparkle(c, 50, 48, C.gold, 3)
    sparkle(c, 36, 54, C.paper, 2)
  },
  44: (c) => {
    c.box(8, 4, 16, 52, R.steel)
    c.rect(11, 8, 10, 40, C.deep)
    c.tri(11, 40, 21, 40, 16, 32, C.term)
    for (let i = 0; i < 4; i++) c.rect(12 + i * 2, 36 - i * 6, 2, 12 + i * 6 - 10, C.green)
    c.tri(12, 14, 20, 14, 16, 8, C.term)
    c.box(32, 28, 28, 28, R.paper)
    c.rect(35, 31, 22, 22, C.deep)
    chip(c, 40, 36, 10)
    c.rect(4, 56, 56, 4, C.mid)
  },
  45: (c) => {
    orb(c, 32, 28, 12, R.purple, C.pink)
    for (let i = 0; i < 6; i++) {
      const t = (i * Math.PI * 2) / 6 - Math.PI / 2
      mini(c, 32 + Math.cos(t) * 26, 27 + Math.sin(t) * 20, i % 2 ? R.blue : R.gold)
    }
  },
  46: (c) => {
    c.poly([[8, 56], [56, 56], [38, 20], [26, 20]], C.gray)
    c.poly([[26, 20], [38, 20], [36, 20], [28, 20]], C.glow)
    c.rect(28, 20, 8, 38, C.deep)
    c.dither(26, 34, 12, 24, C.glow)
    for (const [x, y, w, h] of [[2, 2, 14, 54], [48, 2, 14, 54], [18, 14, 8, 40], [38, 14, 8, 40]] as const) rack(c, x, y, w, h, C.glow)
    rack(c, 26, 8, 12, 12, C.gold)
  },
  47: (c) => {
    c.box(16, 4, 32, 48, [C.gray, C.void, C.ink])
    c.rect(18, 6, 28, 1, C.glow)
    c.rect(18, 6, 1, 44, C.glow)
    c.rect(30, 12, 4, 26, C.deep)
    c.px(31, 14, C.gold)
    c.px(32, 20, C.glow)
    c.px(31, 26, C.glow)
    c.halo(32, 28, 22, 3, C.glow)
    for (let i = 0; i < 9; i++) mini(c, 6 + i * 6, 48, i % 3 === 0 ? R.red : R.metal)
    ground(c, R.steel, 58)
  },
  48: (c) => {
    c.halo(32, 32, 24, 4, C.pink)
    c.ball(32, 32, 24, R.purple)
    c.stroke(36, 12, 28, 26, C.glow, 2)
    c.stroke(28, 26, 38, 32, C.glow, 2)
    c.stroke(38, 32, 28, 52, C.glow, 2)
    c.stroke(18, 28, 24, 36, C.white, 1)
    c.stroke(46, 38, 40, 46, C.white, 1)
    c.stroke(20, 20, 26, 22, C.pink, 1)
  },
  49: (c, a) => {
    c.ring(32, 32, 28, 10, C.glow)
    globe(c, 32, 30, 14)
    c.ring(32, 30, 24, 8, C.paper)
    for (const x of [6, 52]) {
      arch(c, x, 22, 6, 24, C.gold)
      c.rect(x + 2, 32, 2, 14, C.deep)
    }
    c.stroke(8, 54, 24, 46, C.glow, 1)
    c.stroke(56, 54, 40, 46, a[0], 1)
    c.stroke(12, 58, 28, 50, C.paper, 1)
    c.stroke(52, 58, 36, 50, C.glow, 1)
  },
  50: (c) => {
    c.box(2, 6, 60, 26, R.paper)
    c.rect(6, 10, 30, 3, C.gold)
    c.rect(6, 16, 20, 2, C.mid)
    c.rect(6, 22, 24, 2, C.mid)
    c.ball(50, 20, 8, R.gold)
    c.rect(48, 18, 4, 4, C.rust)
    for (let i = 0; i < 3; i++) {
      c.box(8 + i * 18, 36, 12, 22, R.blue)
      c.rect(10 + i * 18, 40, 8, 1, C.paper)
      c.rect(10 + i * 18, 45, 8, 1, C.paper)
      c.rect(10 + i * 18, 50, 5, 1, C.paper)
    }
  },
  51: (c) => {
    c.tri(6, 36, 58, 36, 32, 24, C.mid)
    c.rect(6, 36, 52, 3, C.paper)
    for (let i = 0; i < 4; i++) c.box(10 + i * 12, 39, 7, 15, R.metal)
    c.box(4, 54, 56, 5, R.steel)
    wafer(c, 32, 14, 11, C.gold)
    c.halo(32, 14, 11, 3, C.gold)
  },
  52: (c, a) => {
    wafer(c, 32, 32, 28, a[1])
    c.rect(26, 26, 12, 12, C.white)
    c.box(27, 27, 10, 10, R.gold)
    c.rect(30, 30, 4, 4, C.rust)
    c.halo(32, 32, 28, 3, C.gold)
  },
  53: (c) => {
    c.box(2, 28, 60, 30, R.steel)
    for (let i = 0; i < 4; i++) c.box(2 + i * 16, 18, 12, 14, R.steel)
    for (let i = 0; i < 4; i++) for (let k = 0; k < 2; k++) c.rect(2 + i * 16 + k * 6, 14, 4, 4, C.mid)
    for (let i = 0; i < 3; i++) c.rect(9 + i * 20, 36, 8, 12, C.deep)
    for (let i = 0; i < 3; i++) c.rect(11 + i * 20, 40, 4, 8, i % 2 ? C.purple : C.gold)
    c.rect(30, 4, 2, 14, C.mid)
    c.tri(32, 4, 44, 8, 32, 12, C.red)
    c.rect(22, 50, 20, 8, C.deep)
  },
  54: (c) => {
    c.rect(4, 8, 56, 52, C.gray)
    c.ellipse(32, 24, 28, 22, C.deep)
    c.rect(4, 24, 56, 36, C.deep)
    c.ring(32, 24, 28, 22, C.mid)
    for (let i = 0; i < 3; i++) {
      rack(c, 8 + i * 12, 18 + i * 3, 9, 38 - i * 3, C.glow)
      rack(c, 47 - i * 12, 18 + i * 3, 9, 38 - i * 3, C.glow)
    }
    c.dither(24, 40, 16, 18, C.glow)
    c.box(2, 58, 60, 4, R.steel)
  },
  55: (c) => {
    dome(c, 20, 44, 18, R.metal)
    c.halo(20, 36, 7, 3, C.glow)
    c.ball(20, 36, 7, R.blue)
    c.px(18, 34, C.white)
    c.box(2, 44, 36, 10, R.steel)
    c.rect(38, 48, 12, 3, C.gold)
    c.box(40, 24, 22, 32, R.steel)
    rack(c, 43, 28, 7, 24, C.glow)
    rack(c, 52, 28, 7, 24, C.term)
    c.box(2, 54, 60, 6, R.steel)
  },
  56: (c) => {
    c.box(2, 8, 28, 14, R.steel)
    c.box(32, 4, 28, 14, R.steel)
    c.box(2, 28, 22, 14, R.steel)
    c.box(28, 24, 34, 18, R.steel)
    for (const [x, y, w, h] of [[2, 8, 28, 14], [32, 4, 28, 14], [2, 28, 22, 14], [28, 24, 34, 18]] as const) {
      for (let i = x + 3; i + 5 < x + w - 1; i += 7) c.rect(i, y + 4, 5, h - 8, C.deep)
      for (let i = x + 3; i + 5 < x + w - 1; i += 7) c.px(i + 1, y + 6, C.glow)
    }
    c.rect(14, 22, 2, 6, C.gold)
    c.rect(44, 18, 2, 6, C.gold)
    c.rect(24, 34, 4, 2, C.gold)
    c.box(6, 46, 52, 8, R.steel)
    for (let i = 0; i < 4; i++) c.ball(14 + i * 12, 50, 3, R.metal)
    c.rect(2, 56, 60, 4, C.term)
  },
  57: (c) => {
    c.ball(32, 32, 26, [C.gray, C.deep, C.void])
    for (let i = 0; i < 14; i++) {
      const t = i * 2.4
      const x = 32 + Math.cos(t) * (4 + (i % 5) * 4)
      const y = 32 + Math.sin(t * 1.3) * (4 + (i % 4) * 5)
      c.rect(x, y, 2, 2, i % 3 === 0 ? C.gold : C.glow)
      c.dither(x - 3, y - 3, 8, 8, C.gray)
    }
    c.ring(32, 32, 26, 26, C.mid)
    c.rect(28, 2, 8, 3, C.mid)
  },
  58: (c) => {
    c.rect(0, 0, 64, 12, C.blue)
    c.dither(0, 12, 64, 6, C.blue)
    c.rect(0, 14, 64, 28, C.deep)
    c.rect(0, 42, 64, 20, C.gold)
    c.dither(0, 38, 64, 8, C.gold, 1)
    let px = 2
    let py = 48
    for (let i = 0; i < 9; i++) {
      const nx = 2 + (i + 1) * 7
      const ny = 48 + Math.sin((i + 1) * 1.1) * 7
      c.stroke(px, py, nx, ny, C.glow, 2)
      px = nx
      py = ny
    }
    c.box(26, 38, 12, 8, R.steel)
    c.px(31, 41, C.glow)
    c.ellipse(14, 26, 4, 2, C.rust)
    c.tri(18, 26, 22, 23, 22, 29, C.rust)
    c.ellipse(48, 22, 3, 2, C.pink)
  },
  59: (c) => {
    c.rect(0, 52, 64, 10, C.rust)
    c.ball(52, 56, 10, R.gold)
    c.rect(0, 56, 64, 6, C.red)
    tower(c, 10, 58, 8, 54, C.mid)
    c.box(14, 30, 14, 4, R.steel)
    c.box(14, 42, 14, 4, R.steel)
    c.box(26, 8, 14, 38, R.paper)
    c.rect(26, 14, 14, 3, C.void)
    c.tri(26, 8, 40, 8, 33, 0, C.gray)
    c.rect(24, 46, 3, 8, C.mid)
    c.rect(39, 46, 3, 8, C.mid)
    flame(c, 33, 60, 18, [C.rust, C.gold, C.paper])
  },
  60: (c) => {
    c.ball(32, 78, 44, R.blue)
    c.ring(32, 78, 44, 44, C.glow)
    c.ball(24, 70, 4, R.green)
    satellite(c, 32, 26)
    c.rect(14, 24, 36, 1, C.gold)
    sparkle(c, 8, 10, C.white, 1)
    sparkle(c, 56, 8, C.white, 1)
  },
  61: (c) => {
    globe(c, 32, 34, 14)
    c.ring(32, 34, 26, 26, C.gray)
    for (let i = 0; i < 6; i++) {
      const t = (i * Math.PI * 2) / 6
      const x = 32 + Math.cos(t) * 26
      const y = 34 + Math.sin(t) * 26
      c.line(x, y, 32 + Math.cos(t) * 14, 34 + Math.sin(t) * 14, C.glow)
      satellite(c, x, y, false)
    }
  },
  62: (c) => {
    c.ball(48, 14, 8, R.blue)
    c.ball(46, 12, 3, R.green)
    c.ellipse(32, 62, 36, 14, C.mid)
    c.ellipse(32, 63, 34, 11, C.paper)
    c.circle(14, 54, 3, C.gray)
    c.circle(50, 52, 2, C.gray)
    c.stroke(30, 54, 30, 44, C.mid, 3)
    c.ellipse(30, 40, 14, 8, C.paper)
    c.rect(16, 40, 28, 4, 0)
    c.ellipse(30, 38, 12, 6, C.mid)
    c.tri(18, 38, 42, 38, 30, 40, C.paper)
    c.line(30, 38, 44, 22, C.glow)
    c.dither(34, 20, 14, 18, C.glow)
    c.rect(29, 34, 2, 6, C.rust)
  },
  63: (c) => {
    c.rect(0, 46, 64, 16, C.rust)
    c.ellipse(32, 58, 40, 10, C.red)
    dome(c, 32, 46, 24, R.blue)
    rack(c, 14, 30, 9, 16, C.glow)
    rack(c, 28, 24, 9, 22, C.term)
    rack(c, 42, 30, 9, 16, C.glow)
    c.dither(0, 8, 64, 10, C.gold)
    c.circle(8, 52, 2, C.red)
    c.circle(56, 56, 3, C.red)
  },
  64: (c) => {
    c.rect(0, 46, 64, 16, C.rust)
    for (let i = 0; i < 3; i++) {
      c.poly([[2 + i * 14, 40], [14 + i * 14, 40], [18 + i * 14, 48], [i * 14 - 2, 48]], C.blue)
      c.poly([[4 + i * 14, 41], [8 + i * 14, 41], [6 + i * 14, 46], [i * 14, 46]], C.glow)
      c.rect(7 + i * 14, 48, 2, 4, C.mid)
    }
    for (const x of [46, 56]) {
      c.rect(x, 12, 2, 40, C.mid)
      c.rect(x - 5, 16, 12, 2, C.mid)
      c.rect(x - 4, 24, 10, 2, C.mid)
    }
    c.line(46, 18, 20, 36, C.gold)
    c.box(40, 36, 22, 16, R.steel)
    for (let i = 0; i < 3; i++) c.rect(43 + i * 6, 40, 4, 8, i % 2 ? C.glow : C.term)
    c.ball(10, 12, 6, R.gold)
    c.halo(10, 12, 6, 3, C.gold)
  },
  65: (c) => {
    c.rect(0, 50, 64, 12, C.rust)
    c.box(8, 36, 30, 16, R.steel)
    for (let i = 0; i < 3; i++) c.rect(12 + i * 9, 40, 6, 8, C.deep)
    c.rect(8, 26, 4, 10, C.mid)
    c.rect(34, 26, 4, 10, C.mid)
    c.rect(8, 24, 30, 2, C.gold)
    c.rect(48, 8, 4, 44, C.gold)
    c.rect(36, 10, 22, 4, C.gold)
    c.line(36, 14, 52, 50, C.rust)
    c.line(52, 14, 40, 6, C.gold)
    c.line(40, 14, 40, 22, C.mid)
    c.box(36, 22, 10, 6, R.metal)
    robot(c, 20, 30, C.glow, R.rust)
    c.ball(18, 56, 3, R.steel)
    c.ball(26, 56, 3, R.steel)
  },
  66: (c) => {
    c.dither(0, 0, 64, 24, C.gold)
    c.rect(0, 52, 64, 10, C.rust)
    const heights = [18, 28, 38, 22, 46, 30, 20, 34]
    heights.forEach((h, i) => building(c, 2 + i * 8, 54 - h, 8, h, i % 2 ? R.steel : R.metal, i % 3 === 0 ? C.glow : C.gold))
    dome(c, 32, 56, 10, R.blue)
    c.rect(36, 6, 2, 6, C.mid)
    c.px(36, 5, C.pink)
  },
}

export const ART_IDS: readonly number[] = Object.keys(DRAW).map(Number)
