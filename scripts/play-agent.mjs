import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright-core"

const APP = "http://127.0.0.1:43123"
const CDP_PORT = 9222
const CDP = `http://127.0.0.1:${CDP_PORT}`

function chromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    "/usr/local/bin/google-chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean)
  return candidates.find((path) => existsSync(path))
}

async function appIsUp() {
  try {
    const response = await fetch(APP)
    return response.ok
  } catch {
    return false
  }
}

async function waitForApp() {
  for (let i = 0; i < 50; i++) {
    if (await appIsUp()) return
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(`dev server did not answer at ${APP}`)
}

const startedVite = !(await appIsUp())
let vite
if (startedVite) {
  vite = spawn("npm", ["run", "dev"], {
    stdio: "inherit",
    cwd: fileURLToPath(new URL("..", import.meta.url)),
  })
  await waitForApp()
}

const executablePath = chromePath()
if (!executablePath) {
  console.error("No Chrome found. Set CHROME_PATH to a Chrome or Chromium binary.")
  process.exit(1)
}

const headed = process.env.PLAY_HEADED === "1"
const browser = await chromium.launch({
  executablePath,
  headless: !headed,
  args: [
    `--remote-debugging-port=${CDP_PORT}`,
    "--no-sandbox",
    "--disable-dev-shm-usage",
  ],
})
const page = await browser.newPage()
await page.goto(APP, { waitUntil: "networkidle" })
const probe = await page.evaluate(() => typeof window.__GAME__?.getState)
if (probe !== "function") {
  console.error("window.__GAME__.getState is missing")
  process.exit(1)
}

console.log("")
console.log("play:agent ready")
console.log(`app ${APP}`)
console.log(`cdp ${CDP}`)
console.log("")
console.log("Connect from another process. close() on the CDP client leaves Chrome up:")
console.log(`
import { chromium } from "playwright-core"
const browser = await chromium.connectOverCDP("${CDP}")
const page = browser.contexts()[0].pages()[0]
await page.evaluate(() => window.__GAME__.getState())
await page.evaluate(() => window.__GAME__.click())
await browser.close()
`)

let shuttingDown = false
async function shutdown() {
  if (shuttingDown) return
  shuttingDown = true
  await browser.close().catch(() => {})
  if (vite) vite.kill("SIGTERM")
  process.exit(0)
}
process.on("SIGINT", () => void shutdown())
process.on("SIGTERM", () => void shutdown())
await new Promise(() => {})
