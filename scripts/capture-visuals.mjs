import { spawn } from "node:child_process"
import { existsSync, mkdirSync } from "node:fs"
import { chromium } from "playwright-core"

const APP = "http://127.0.0.1:43123"
const prefix = process.argv[2] ?? "after"
const outDir = process.argv[3] ?? "/opt/cursor/artifacts"
mkdirSync(outDir, { recursive: true })

const chromePath = [process.env.CHROME_PATH, "/usr/local/bin/google-chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"]
  .filter(Boolean)
  .find((p) => existsSync(p))
if (!chromePath) throw new Error("No Chrome found. Set CHROME_PATH.")

async function up() {
  try {
    return (await fetch(APP)).ok
  } catch {
    return false
  }
}

let vite
if (!(await up())) {
  vite = spawn("npm", ["run", "dev"], { stdio: "ignore", detached: true })
  for (let i = 0; i < 60 && !(await up()); i++) await new Promise((r) => setTimeout(r, 250))
}

const browser = await chromium.launch({ executablePath: chromePath, args: ["--no-sandbox"] })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 })
await page.goto(APP)
await page.waitForFunction(() => window.__GAME__)

const shot = (name) => page.screenshot({ path: `${outDir}/${prefix}-${name}.png` })
const game = (fn, arg) => page.evaluate(fn, arg)
const settle = (ms = 700) => page.waitForTimeout(ms)
const tab = async (label) => {
  await settle(500)
  await page.getByRole("tab", { name: label }).click()
  await settle(900)
}

await game(() => window.__GAME__.reset())
await page.reload()
await page.waitForFunction(() => window.__GAME__)
await settle()
await shot("00-fresh-desk")

await game(() => {
  const g = window.__GAME__
  g.setMoney(1000)
  g.buy(1)
  g.buy(2)
  g.buy(3)
  g.buy(3)
  g.setMoney(120)
})
await settle()
await shot("01-early-owned-strip")

const stage = page.getByTestId("stage")
for (let i = 0; i < 9; i++) {
  await stage.click({ position: { x: 60 + ((i * 37) % 150), y: 70 + ((i * 53) % 130) }, delay: 0 })
  await page.waitForTimeout(40)
}
await page.waitForTimeout(120)
await shot("02-spam-click-pops")

await game(() => {
  const g = window.__GAME__
  g.setMoney(7e6)
  g.buy(15)
  g.forceBoost(5, 60_000)
})
await tab("Mid")
for (let i = 0; i < 5; i++) {
  await stage.click({ position: { x: 80 + i * 30, y: 90 + ((i * 41) % 100) } })
  await page.waitForTimeout(40)
}
await page.waitForTimeout(120)
await shot("03-mid-boost-pops")

await game(() => {
  const g = window.__GAME__
  g.reset()
  g.setMoney(1e28)
  for (let id = 1; id <= 66; id++) g.buy(id)
  for (let id = 1; id <= 66; id += 3) g.buy(id)
})
await settle()
await shot("04-end-many-owned-scroll")
await page.getByTestId("owned-strip").evaluate((el) => (el.scrollTop = el.scrollHeight))
await settle(200)
await shot("05-owned-scrolled")

await page.setViewportSize({ width: 390, height: 800 })
await settle()
await shot("06-mobile")

await browser.close()
if (vite?.pid) process.kill(-vite.pid)
console.log(`wrote ${prefix}-*.png to ${outDir}`)
