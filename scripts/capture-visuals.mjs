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

// Real pointer-downs from inside the page, every 22ms, so the waterfall is mid-fall when the shot lands.
const spam = (ms) =>
  page.evaluate((span) => {
    const hit = document.querySelector('[data-testid="stage"]')
    const box = hit.getBoundingClientRect()
    let i = 0
    const id = setInterval(() => {
      i++
      hit.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          pointerType: "mouse",
          button: 0,
          clientX: box.left + 30 + ((i * 37) % 130),
          clientY: box.top + 40 + ((i * 53) % 100),
        }),
      )
    }, 22)
    setTimeout(() => clearInterval(id), span)
  }, ms)
const liveDrops = () => page.evaluate(() => document.querySelectorAll(".drop").length)

await spam(600)
await page.waitForTimeout(420)
console.log("waterfall thumbs alive mid-spam:", await liveDrops())
await shot("02-spam-click-waterfall")
await settle(500)

await game(() => {
  const g = window.__GAME__
  g.setMoney(7e6)
  g.buy(15)
  g.forceBoost(5, 60_000)
})
await tab("Mid")
await spam(600)
await page.waitForTimeout(420)
console.log("waterfall thumbs alive mid-boost:", await liveDrops())
await shot("03-mid-boost-waterfall")

const lateEra = async (name, topTier) => {
  await game((top) => {
    const g = window.__GAME__
    g.reset()
    g.setMoney(1e28)
    for (let id = 1; id <= top; id++) g.buy(id)
    for (let id = 1; id <= top; id += 3) g.buy(id)
  }, topTier)
  await settle(900)
  await shot(name)
}
await lateEra("04-bg-lab", 34)
await lateEra("05-bg-dc", 55)
await lateEra("06-bg-mars", 66)
await page.getByTestId("owned-strip").evaluate((el) => (el.scrollTop = el.scrollHeight))
await settle(200)
await shot("07-owned-strip-scrolled")

await page.setViewportSize({ width: 390, height: 800 })
await settle()
await shot("08-mobile")

await browser.close()
if (vite?.pid) process.kill(-vite.pid)
console.log(`wrote ${prefix}-*.png to ${outDir}`)
