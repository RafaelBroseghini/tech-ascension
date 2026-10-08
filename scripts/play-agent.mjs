import { spawn, spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const APP = "http://127.0.0.1:43123"
const SESSION = process.env.AGENT_BROWSER_SESSION ?? "tech-ascension"
const ROOT = fileURLToPath(new URL("..", import.meta.url))

function browser(...args) {
  return spawnSync("npx", ["agent-browser", ...args], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, AGENT_BROWSER_SESSION: SESSION },
  })
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
const stopVite = () => {
  if (vite?.pid) process.kill(-vite.pid, "SIGTERM")
}
if (startedVite) {
  vite = spawn("npm", ["run", "dev"], { stdio: "inherit", cwd: ROOT, detached: true })
  await waitForApp()
}

const opened = browser("open", APP)
if (opened.status !== 0) {
  console.error(opened.stderr || opened.stdout)
  console.error("agent-browser could not open the app. Run `npx agent-browser install` once, or set AGENT_BROWSER_EXECUTABLE_PATH.")
  stopVite()
  process.exit(1)
}
const probe = browser("wait", "--fn", "typeof window.__GAME__?.getState === 'function'")
if (probe.status !== 0) {
  console.error("window.__GAME__.getState is missing")
  browser("close")
  stopVite()
  process.exit(1)
}

console.log("")
console.log("play:agent ready")
console.log(`app ${APP}`)
console.log(`session ${SESSION}`)
console.log("")
console.log("Drive it from another process. Set the session first, so you reach this browser:")
console.log(`
export AGENT_BROWSER_SESSION=${SESSION}
npx agent-browser eval "window.__GAME__.getState()"
npx agent-browser eval "window.__GAME__.click()"
npx agent-browser snapshot -i
npx agent-browser screenshot desk.png
`)
console.log("Set AGENT_BROWSER_HEADED=1 before starting to show the window.")

let shuttingDown = false
function shutdown() {
  if (shuttingDown) return
  shuttingDown = true
  browser("close")
  stopVite()
  process.exit(0)
}
process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
await new Promise(() => {})
