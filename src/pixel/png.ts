/** Indexed-colour PNG encoder with stored (uncompressed) deflate blocks. Works in node and browsers, no canvas. */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (const b of bytes) c = (CRC_TABLE[(c ^ b) & 0xff] ?? 0) ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function adler32(bytes: Uint8Array): number {
  let a = 1
  let b = 0
  for (const v of bytes) {
    a = (a + v) % 65521
    b = (b + a) % 65521
  }
  return ((b << 16) | a) >>> 0
}

function u32(value: number): number[] {
  return [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255]
}

function chunk(type: string, body: Uint8Array): number[] {
  const typed = new Uint8Array(4 + body.length)
  for (let i = 0; i < 4; i++) typed[i] = type.charCodeAt(i)
  typed.set(body, 4)
  return [...u32(body.length), ...typed, ...u32(crc32(typed))]
}

function zlibStored(raw: Uint8Array): Uint8Array {
  const blocks = Math.max(1, Math.ceil(raw.length / 65535))
  const out = new Uint8Array(2 + raw.length + blocks * 5 + 4)
  out[0] = 0x78
  out[1] = 0x01
  let at = 2
  for (let i = 0; i < blocks; i++) {
    const part = raw.subarray(i * 65535, (i + 1) * 65535)
    out[at++] = i === blocks - 1 ? 1 : 0
    out[at++] = part.length & 255
    out[at++] = part.length >>> 8
    out[at++] = ~part.length & 255
    out[at++] = (~part.length >>> 8) & 255
    out.set(part, at)
    at += part.length
  }
  out.set(u32(adler32(raw)), at)
  return out
}

function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** `palette[n - 1]` is the colour for index n; index 0 is fully transparent. */
export function encodePng(data: Uint8Array, w: number, h: number, palette: readonly string[]): Uint8Array {
  const plte = new Uint8Array((palette.length + 1) * 3)
  palette.forEach((hex, i) => plte.set(hexToRgb(hex), (i + 1) * 3))
  const raw = new Uint8Array((w + 1) * h)
  for (let y = 0; y < h; y++) raw.set(data.subarray(y * w, (y + 1) * w), y * (w + 1) + 1)
  const bytes = [
    137, 80, 78, 71, 13, 10, 26, 10,
    ...chunk("IHDR", Uint8Array.from([...u32(w), ...u32(h), 8, 3, 0, 0, 0])),
    ...chunk("PLTE", plte),
    ...chunk("tRNS", Uint8Array.from([0])),
    ...chunk("IDAT", zlibStored(raw)),
    ...chunk("IEND", new Uint8Array(0)),
  ]
  return Uint8Array.from(bytes)
}

export function pngDataUrl(data: Uint8Array, w: number, h: number, palette: readonly string[]): string {
  const bytes = encodePng(data, w, h, palette)
  let binary = ""
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return `data:image/png;base64,${btoa(binary)}`
}
