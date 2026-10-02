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

await game(() => window.__GAME__.reset())
await page.reload()
await page.waitForFunction(() => window.__GAME__)
await settle()
await shot("00-fresh-phase-a")

// Phase A: clicks are XP, the shop is skills, money does not exist yet.
await game(() => {
  const g = window.__GAME__
  g.setXp(900)
  for (let i = 0; i < 4; i++) g.click()
  g.buySkill(1)
  g.buySkill(2)
  g.buySkill(3)
  g.buySkill(4)
  g.setXp(1500)
})
await settle()
await shot("01-phase-a-xp")

await page.getByRole("tab", { name: "Gigs" }).click()
await settle(500)
await shot("02-gig-board-locked")

// Phase B: Portfolio + React open the board; a real click on "Clear gig" pops the lump.
await game(() => {
  const g = window.__GAME__
  g.setXp(30_000)
  g.buySkill(11)
  g.buySkill(12)
})
await settle(1800)
await page.getByRole("tab", { name: "Gigs" }).click()
await settle(500)
await shot("03-phase-b-gig-board")
await page.getByRole("button", { name: "Clear gig" }).first().click()
await page.waitForTimeout(340)
await shot("04-gig-clear-pop")
await settle(1800)

// A medium squash on a paying click: grab the hero total mid-squash.
await page.evaluate(() => {
  const hit = document.querySelector('[data-testid="stage"]')
  const box = hit.getBoundingClientRect()
  hit.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse", button: 0, clientX: box.left + 90, clientY: box.top + 90 }))
})
await page.waitForTimeout(55)
await shot("05-click-medium-squash")
await settle(900)

// Phase C: five gigs and 35K XP open the Job Board.
await game(() => {
  const g = window.__GAME__
  g.setXp(60_000)
  for (const id of [2, 3, 4, 5]) g.forceGig(id)
  g.buyJob(1)
  g.setMoney(30_000)
  g.buyJob(2)
  g.setMoney(60_000)
  g.buyEquipment(1)
  g.setMoney(40_000)
})
await settle(1800)
await page.getByRole("tab", { name: "Jobs" }).click()
await settle(700)
await shot("06-phase-c-jobs")

// Phase D: $500K held opens capital.
await game(() => {
  const g = window.__GAME__
  g.setMoney(2_500_000)
  g.buy(19)
  g.buy(20)
})
await settle(1800)
await page.getByRole("tab", { name: "Capital" }).click()
await settle(700)
await shot("07-phase-d-capital")

await game(() => {
  const g = window.__GAME__
  g.flee()
  g.forceEnemy(11)
  g.setMoney(1_000)
})
await settle()
await shot("08-fight")
await game(() => {
  const g = window.__GAME__
  g.flee()
  g.forceEnemy(2)
  for (let i = 0; i < 400 && g.getState().fight; i++) g.click()
})
await page.waitForTimeout(380)
await shot("09-fight-win-pop")
await settle(2200)

await page.setViewportSize({ width: 390, height: 800 })
await settle()
await shot("10-mobile")

await browser.close()
if (vite?.pid) process.kill(-vite.pid)
console.log(`wrote ${prefix}-*.png to ${outDir}`)
