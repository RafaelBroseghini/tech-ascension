import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { chromium } from "playwright-core"

const root = path.resolve(import.meta.dirname, "..")
const out = process.argv[2] ?? "/tmp/sprite-sheet.png"
const first = Number(process.argv[3] ?? 1)
const last = Number(process.argv[4] ?? 48)
const chrome = [process.env.CHROME_PATH, "/usr/local/bin/google-chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"]
  .filter(Boolean)
  .find((p) => existsSync(p))
if (!chrome) throw new Error("No Chrome found. Set CHROME_PATH.")

const ids = Array.from({ length: last - first + 1 }, (_, i) => first + i)
const cols = 6
const html = `<body style="margin:0;background:#14110d;display:grid;grid-template-columns:repeat(${cols},256px);gap:8px;padding:8px">${ids
  .map((id) => `<img src="file://${root}/public/sprites/${id}.webp" width="256" height="256">`)
  .join("")}</body>`

mkdirSync(path.dirname(out), { recursive: true })
const browser = await chromium.launch({ executablePath: chrome, args: ["--no-sandbox", "--allow-file-access-from-files"] })
const page = await browser.newPage({ viewport: { width: cols * 264 + 8, height: 400 } })
const htmlPath = path.join(path.dirname(out), ".sprite-sheet.html")
writeFileSync(htmlPath, html)
await page.goto(`file://${htmlPath}`)
await page.waitForFunction(() => [...document.images].every((i) => i.complete))
await page.waitForTimeout(300)
await page.screenshot({ path: out, fullPage: true })
await browser.close()
console.log(out)
