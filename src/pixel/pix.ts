import type { Ramp } from "./palette.ts"

/** Palette-indexed pixel grid. 0 is transparent. All drawing is integer, no anti-aliasing. */
export class Pix {
  readonly w: number
  readonly h: number
  readonly data: Uint8Array

  constructor(w: number, h: number) {
    this.w = w
    this.h = h
    this.data = new Uint8Array(w * h)
  }

  get(x: number, y: number): number {
    return x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : (this.data[y * this.w + x] ?? 0)
  }

  px(x: number, y: number, c: number): void {
    const ix = Math.round(x)
    const iy = Math.round(y)
    if (ix < 0 || iy < 0 || ix >= this.w || iy >= this.h) return
    this.data[iy * this.w + ix] = c
  }

  rect(x: number, y: number, w: number, h: number, c: number): void {
    const x0 = Math.round(x)
    const y0 = Math.round(y)
    for (let j = 0; j < Math.round(h); j++) for (let i = 0; i < Math.round(w); i++) this.px(x0 + i, y0 + j, c)
  }

  /** Bevelled block: light top and left edge, shade bottom and right edge. */
  box(x: number, y: number, w: number, h: number, r: Ramp): void {
    const [hi, base, lo] = r
    this.rect(x, y, w, h, base)
    if (w < 4 || h < 4) return
    this.rect(x, y, w - 1, 1, hi)
    this.rect(x, y, 1, h - 1, hi)
    this.rect(x + 1, y + h - 1, w - 1, 1, lo)
    this.rect(x + w - 1, y + 1, 1, h - 1, lo)
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: number): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / (rx + 0.35)
        const dy = (y - cy) / (ry + 0.35)
        if (dx * dx + dy * dy <= 1) this.px(x, y, c)
      }
    }
  }

  circle(cx: number, cy: number, r: number, c: number): void {
    this.ellipse(cx, cy, r, r, c)
  }

  /** Shaded sphere: highlight blob top-left, shade crescent bottom-right. */
  ball(cx: number, cy: number, r: number, ramp: Ramp): void {
    const [hi, base, lo] = ramp
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = x - cx
        const dy = y - cy
        if (dx * dx + dy * dy > (r + 0.35) * (r + 0.35)) continue
        const hx = x - (cx - r * 0.38)
        const hy = y - (cy - r * 0.38)
        if (hx * hx + hy * hy < r * r * 0.14 && r >= 3) this.px(x, y, hi)
        else if ((dx + dy) * 0.7071 > r * 0.5) this.px(x, y, lo)
        else this.px(x, y, base)
      }
    }
  }

  ring(cx: number, cy: number, rx: number, ry: number, c: number): void {
    for (let a = 0; a < 360; a += 3) {
      const t = (a * Math.PI) / 180
      this.px(cx + Math.cos(t) * rx, cy + Math.sin(t) * ry, c)
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, c: number): void {
    let x = Math.round(x0)
    let y = Math.round(y0)
    const ex = Math.round(x1)
    const ey = Math.round(y1)
    const dx = Math.abs(ex - x)
    const dy = -Math.abs(ey - y)
    const sx = x < ex ? 1 : -1
    const sy = y < ey ? 1 : -1
    let err = dx + dy
    for (;;) {
      this.px(x, y, c)
      if (x === ex && y === ey) return
      const e2 = 2 * err
      if (e2 >= dy) {
        err += dy
        x += sx
      }
      if (e2 <= dx) {
        err += dx
        y += sy
      }
    }
  }

  /** Thick line: a square brush walked along the line. */
  stroke(x0: number, y0: number, x1: number, y1: number, c: number, t = 2): void {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
    for (let i = 0; i <= steps; i++) {
      const x = x0 + ((x1 - x0) * i) / steps
      const y = y0 + ((y1 - y0) * i) / steps
      this.rect(x - (t - 1) / 2, y - (t - 1) / 2, t, t, c)
    }
  }

  poly(points: ReadonlyArray<readonly [number, number]>, c: number): void {
    let minY = Infinity
    let maxY = -Infinity
    for (const [, y] of points) {
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs: number[] = []
      for (let i = 0; i < points.length; i++) {
        const a = points[i]
        const b = points[(i + 1) % points.length]
        if (!a || !b) continue
        const [x0, y0] = a
        const [x1, y1] = b
        if ((y0 <= y + 0.5 && y1 > y + 0.5) || (y1 <= y + 0.5 && y0 > y + 0.5)) {
          xs.push(x0 + ((y + 0.5 - y0) / (y1 - y0)) * (x1 - x0))
        }
      }
      xs.sort((p, q) => p - q)
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const from = xs[i] ?? 0
        const to = xs[i + 1] ?? 0
        for (let x = Math.round(from); x < Math.round(to); x++) this.px(x, y, c)
      }
    }
  }

  tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: number): void {
    this.poly(
      [
        [x0, y0],
        [x1, y1],
        [x2, y2],
      ],
      c,
    )
  }

  /** Checkerboard dither, only over empty pixels. Used for glows and beams. */
  dither(x: number, y: number, w: number, h: number, c: number, phase = 0): void {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const px = Math.round(x) + i
        const py = Math.round(y) + j
        if ((px + py + phase) % 2 === 0 && this.get(px, py) === 0) this.px(px, py, c)
      }
    }
  }

  halo(cx: number, cy: number, r: number, width: number, c: number): void {
    for (let y = Math.floor(cy - r - width); y <= Math.ceil(cy + r + width); y++) {
      for (let x = Math.floor(cx - r - width); x <= Math.ceil(cx + r + width); x++) {
        const d = Math.hypot(x - cx, y - cy)
        if (d > r + width || d < r - 1 || (x + y) % 2 !== 0 || this.get(x, y) !== 0) continue
        this.px(x, y, c)
      }
    }
  }

  /** True when (x, y) falls inside the same disc `circle` would fill. */
  insideCircle(cx: number, cy: number, r: number, x: number, y: number): boolean {
    return Math.hypot(x - cx, y - cy) <= r + 0.35
  }

  /** 1px ink outline on every empty pixel that touches a filled one (4-neighbourhood). */
  outline(ink: number): void {
    const out = new Uint8Array(this.data)
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y) !== 0) continue
        if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) out[y * this.w + x] = ink
      }
    }
    this.data.set(out)
  }

  /** Nearest-style 2:1 reduction: keeps the most common colour in each 2×2 block, drops specks. */
  halve(): Pix {
    const out = new Pix(this.w >> 1, this.h >> 1)
    for (let y = 0; y < out.h; y++) {
      for (let x = 0; x < out.w; x++) {
        const block = [this.get(x * 2, y * 2), this.get(x * 2 + 1, y * 2), this.get(x * 2, y * 2 + 1), this.get(x * 2 + 1, y * 2 + 1)]
        const filled = block.filter((v) => v !== 0)
        if (filled.length < 2) continue
        let best = 0
        let bestCount = 0
        for (const v of filled) {
          const count = filled.filter((o) => o === v).length
          if (count > bestCount) {
            best = v
            bestCount = count
          }
        }
        out.px(x, y, best)
      }
    }
    return out
  }

  colors(): number[] {
    return [...new Set(this.data)].filter((v) => v !== 0)
  }
}
