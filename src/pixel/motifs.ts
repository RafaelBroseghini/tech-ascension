import { C, R } from "./palette.ts"
import type { Ramp } from "./palette.ts"
import { Pix } from "./pix.ts"

/** Reusable 64×64 props. Everything is drawn flat-first; Pix.outline adds the ink edge afterwards. */

export function desk(c: Pix, y = 50): void {
  c.box(4, y, 56, 5, R.rust)
  c.rect(8, y + 5, 4, 8, C.red)
  c.rect(52, y + 5, 4, 8, C.red)
}

export function shelf(c: Pix, y = 52): void {
  c.box(3, y, 58, 4, R.rust)
  c.rect(8, y + 4, 3, 4, C.red)
  c.rect(53, y + 4, 3, 4, C.red)
}

export function ground(c: Pix, ramp: Ramp = R.steel, y = 54): void {
  c.box(4, y, 56, 5, ramp)
}

const CODE_LINES = [0.55, 0.3, 0.7, 0.4, 0.6, 0.25]

export function screenCode(c: Pix, x: number, y: number, w: number, h: number, col: number = C.term): void {
  for (let i = 0; i * 3 + 2 < h; i++) {
    const indent = i % 3 === 1 ? 3 : 0
    c.rect(x + indent, y + i * 3, Math.max(2, (w - indent) * (CODE_LINES[i % CODE_LINES.length] ?? 0.5)), 1, col)
  }
}

export function laptop(c: Pix, x: number, y: number, w: number, code: number = C.term): void {
  const h = Math.round(w * 0.62)
  c.box(x, y, w, h, R.metal)
  c.rect(x + 2, y + 2, w - 4, h - 4, C.deep)
  screenCode(c, x + 4, y + 4, w - 8, h - 8, code)
  c.box(x - 3, y + h, w + 6, 3, R.metal)
  c.rect(x + w / 2 - 3, y + h, 6, 1, C.gray)
}

export function monitor(c: Pix, x: number, y: number, w: number, h: number, code: number = C.term): void {
  c.box(x, y, w, h, R.steel)
  c.rect(x + 2, y + 2, w - 4, h - 4, C.deep)
  screenCode(c, x + 4, y + 4, w - 8, h - 8, code)
  c.rect(x + w / 2 - 2, y + h, 4, 3, C.gray)
  c.rect(x + w / 2 - 6, y + h + 3, 12, 2, C.mid)
}

export function chip(c: Pix, x: number, y: number, s: number, core: number = C.gold): void {
  for (let i = 2; i < s - 1; i += 3) {
    c.rect(x + i, y - 2, 1, 2, C.mid)
    c.rect(x + i, y + s, 1, 2, C.mid)
    c.rect(x - 2, y + i, 2, 1, C.mid)
    c.rect(x + s, y + i, 2, 1, C.mid)
  }
  c.box(x, y, s, s, R.steel)
  c.box(x + 3, y + 3, s - 6, s - 6, [C.paper, core, C.rust])
}

export function gpu(c: Pix, x: number, y: number, w: number, accent: number = C.blue): void {
  c.box(x, y, w, 12, R.dark)
  c.rect(x, y + 12, w, 2, C.green)
  c.rect(x + 3, y + 12, 4, 2, C.gold)
  const fans = Math.max(1, Math.floor((w - 4) / 14))
  for (let i = 0; i < fans; i++) {
    const cx = x + 8 + i * 14
    c.ball(cx, y + 6, 5, R.steel)
    c.circle(cx, y + 6, 2, C.void)
    c.px(cx, y + 6, accent)
  }
  c.rect(x + w - 3, y + 2, 2, 8, accent)
}

export function rack(c: Pix, x: number, y: number, w: number, h: number, led: number = C.glow): void {
  c.box(x, y, w, h, R.steel)
  for (let i = 0; y + 3 + i * 5 + 3 <= y + h - 1; i++) {
    const uy = y + 2 + i * 5
    c.rect(x + 2, uy, w - 4, 3, C.deep)
    c.px(x + 3, uy + 1, led)
    c.px(x + 5, uy + 1, i % 2 ? C.gold : led)
    c.rect(x + w - 6, uy + 1, 3, 1, C.gray)
  }
}

function drop(c: Pix, cx: number, base: number, w: number, h: number, col: number): void {
  c.ellipse(cx, base - w, w, w, col)
  c.tri(cx - w, base - w, cx + w, base - w, cx, base - h, col)
}

export function flame(c: Pix, cx: number, base: number, h: number, cols: readonly [number, number, number] = [C.red, C.rust, C.gold]): void {
  const w = h * 0.34
  drop(c, cx, base, w, h, cols[0])
  drop(c, cx, base, w * 0.72, h * 0.74, cols[1])
  drop(c, cx, base, w * 0.4, h * 0.42, cols[2])
}

export function book(c: Pix, x: number, y: number, w: number, h: number, ramp: Ramp): void {
  c.box(x, y, w, h, ramp)
  c.rect(x + w - 3, y + 1, 2, h - 2, C.paper)
  c.rect(x + 2, y + 2, 2, h - 4, ramp[0])
}

export function coins(c: Pix, cx: number, y: number, n: number, rx = 7): void {
  for (let i = 0; i < n; i++) {
    const yy = y - i * 3
    c.ellipse(cx, yy, rx, 3, C.rust)
    c.ellipse(cx - 1, yy - 1, rx - 1, 2.4, C.gold)
    c.rect(cx - rx + 2, yy - 2, 3, 1, C.paper)
  }
}

export function rocket(c: Pix, cx: number, y: number, h: number, accent: number = C.red): void {
  c.box(cx - 5, y + 7, 10, h - 11, R.paper)
  c.tri(cx - 5, y + 8, cx + 5, y + 8, cx, y, accent)
  c.tri(cx - 5, y + h - 8, cx - 10, y + h - 2, cx - 5, y + h - 2, accent)
  c.tri(cx + 5, y + h - 8, cx + 10, y + h - 2, cx + 5, y + h - 2, accent)
  c.ball(cx, y + 14, 3, R.blue)
  c.rect(cx - 3, y + h - 4, 6, 3, C.gray)
}

export function satellite(c: Pix, cx: number, cy: number, big = true): void {
  const pw = big ? 14 : 9
  c.box(cx - pw - 4, cy - 4, pw, 8, R.blue)
  c.box(cx + 4, cy - 4, pw, 8, R.blue)
  for (let i = 3; i < pw; i += 4) {
    c.rect(cx - pw - 4 + i, cy - 3, 1, 6, C.gray)
    c.rect(cx + 4 + i, cy - 3, 1, 6, C.gray)
  }
  c.rect(cx - 4, cy - 1, 8, 2, C.mid)
  c.box(cx - 4, cy - 5, 8, 10, R.gold)
  c.px(cx - 1, cy - 1, C.deep)
  c.line(cx, cy - 5, cx, cy - 9, C.mid)
  c.px(cx, cy - 10, C.pink)
}

/** Earth-style globe with a few land blobs, clipped to the disc. */
export function globe(c: Pix, cx: number, cy: number, r: number, ocean: Ramp = R.blue, land: Ramp = R.green): void {
  c.ball(cx, cy, r, ocean)
  const blobs: ReadonlyArray<readonly [number, number, number, number]> = [
    [-0.35, -0.3, 0.38, 0.28],
    [0.3, 0.1, 0.3, 0.42],
    [-0.15, 0.5, 0.28, 0.18],
  ]
  for (const [bx, by, rx, ry] of blobs) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        if (!c.insideCircle(cx, cy, r - 0.5, x, y)) continue
        const dx = (x - (cx + bx * r)) / (rx * r)
        const dy = (y - (cy + by * r)) / (ry * r)
        if (dx * dx + dy * dy > 1) continue
        c.px(x, y, (x - cx + (y - cy)) * 0.7071 > r * 0.5 ? land[2] : land[1])
      }
    }
  }
}

export function building(c: Pix, x: number, y: number, w: number, h: number, ramp: Ramp = R.steel, win: number = C.glow): void {
  c.box(x, y, w, h, ramp)
  for (let j = y + 3; j + 2 <= y + h - 2; j += 4) {
    for (let i = x + 3; i + 2 <= x + w - 2; i += 4) c.rect(i, j, 2, 2, (i * 7 + j * 3) % 5 === 0 ? C.gray : win)
  }
}

export function person(c: Pix, cx: number, y: number, robe: Ramp = R.purple, hat?: "wizard" | "hood"): void {
  c.box(cx - 5, y + 9, 10, 12, robe)
  c.rect(cx - 7, y + 11, 2, 7, robe[1])
  c.rect(cx + 5, y + 11, 2, 7, robe[2])
  c.rect(cx - 4, y + 21, 3, 3, C.ink)
  c.rect(cx + 1, y + 21, 3, 3, C.ink)
  c.ball(cx, y + 5, 5, R.paper)
  c.rect(cx - 3, y + 4, 2, 1, C.ink)
  c.rect(cx + 1, y + 4, 2, 1, C.ink)
  if (hat === "wizard") {
    c.rect(cx - 7, y + 1, 14, 2, robe[1])
    c.tri(cx - 5, y + 1, cx + 5, y + 1, cx + 1, y - 9, robe[1])
    c.px(cx, y - 2, C.gold)
  } else {
    c.rect(cx - 5, y, 10, 3, robe[1])
    c.rect(cx - 5, y + 3, 2, 5, robe[1])
    c.rect(cx + 3, y + 3, 2, 5, robe[2])
  }
}

export function mini(c: Pix, cx: number, y: number, body: Ramp): void {
  c.ball(cx, y + 2, 2.5, R.paper)
  c.box(cx - 3, y + 5, 6, 6, body)
}

export function robot(c: Pix, cx: number, y: number, eye: number = C.glow, body: Ramp = R.metal): void {
  c.px(cx, y - 1, C.gold)
  c.rect(cx, y, 1, 2, C.mid)
  c.box(cx - 5, y + 2, 10, 8, body)
  c.rect(cx - 3, y + 4, 2, 2, eye)
  c.rect(cx + 1, y + 4, 2, 2, eye)
  c.box(cx - 4, y + 10, 8, 6, body)
  c.rect(cx - 6, y + 11, 2, 4, C.gray)
  c.rect(cx + 4, y + 11, 2, 4, C.gray)
}

export function crystal(c: Pix, cx: number, base: number, h: number, ramp: Ramp = R.blue): void {
  const w = h * 0.3
  const top = base - h
  c.poly(
    [
      [cx, top],
      [cx + w, top + h * 0.28],
      [cx + w, top + h * 0.78],
      [cx, base],
      [cx - w, top + h * 0.78],
      [cx - w, top + h * 0.28],
    ],
    ramp[1],
  )
  c.poly(
    [
      [cx, top],
      [cx - w, top + h * 0.28],
      [cx - w, top + h * 0.78],
      [cx, base],
      [cx - w * 0.3, top + h * 0.5],
    ],
    ramp[0],
  )
  c.poly(
    [
      [cx + w * 0.35, top + h * 0.3],
      [cx + w, top + h * 0.28],
      [cx + w, top + h * 0.78],
      [cx, base],
    ],
    ramp[2],
  )
}

export function orb(c: Pix, cx: number, cy: number, r: number, ramp: Ramp, glow: number = C.glow): void {
  c.halo(cx, cy, r, 4, glow)
  c.ball(cx, cy, r, ramp)
}

export function sparkle(c: Pix, x: number, y: number, col: number = C.white, s = 2): void {
  c.rect(x - s, y, s * 2 + 1, 1, col)
  c.rect(x, y - s, 1, s * 2 + 1, col)
}

export function gear(c: Pix, cx: number, cy: number, r: number, ramp: Ramp = R.metal): void {
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4
    c.rect(cx + Math.cos(a) * (r + 1) - 1, cy + Math.sin(a) * (r + 1) - 1, 3, 3, ramp[1])
  }
  c.ball(cx, cy, r, ramp)
  c.circle(cx, cy, Math.max(1, r / 2.5), C.deep)
}

export function wafer(c: Pix, cx: number, cy: number, r: number, hot: number = C.glow): void {
  c.ball(cx, cy, r, R.steel)
  for (let y = cy - r; y <= cy + r; y += 4) {
    for (let x = cx - r; x <= cx + r; x += 4) {
      if (!c.insideCircle(cx, cy, r - 2, x + 1, y + 1) || !c.insideCircle(cx, cy, r - 2, x, y)) continue
      c.rect(x, y, 3, 3, (Math.round((x + y) / 4) % 3 === 0 ? hot : (Math.round((x - y) / 4) % 2 ? C.mid : C.gold)))
    }
  }
}

export function dome(c: Pix, cx: number, base: number, r: number, glass: Ramp = R.blue): void {
  c.ball(cx, base, r, glass)
  c.rect(cx - r - 1, base + 1, r * 2 + 3, r + 2, 0)
  c.ring(cx, base, r, r, C.paper)
  c.rect(cx - r - 1, base + 1, r * 2 + 3, r + 2, 0)
  c.rect(cx - r, base - 1, r * 2 + 1, 3, C.gray)
}

export function tower(c: Pix, cx: number, base: number, w: number, h: number, col: number = C.mid): void {
  c.line(cx - w, base, cx, base - h, col)
  c.line(cx + w, base, cx, base - h, col)
  for (let y = base - 3; y > base - h + 2; y -= 4) {
    const half = (w * (y - (base - h))) / h
    c.line(cx - half, y, cx + half, y, col)
    c.line(cx - half, y, cx + half + 3, y - 4, col)
  }
}

export function arch(c: Pix, x: number, y: number, w: number, h: number, col: number): void {
  c.rect(x, y + w / 2, w, h - w / 2, col)
  c.ellipse(x + w / 2 - 0.5, y + w / 2, w / 2, w / 2, col)
}
