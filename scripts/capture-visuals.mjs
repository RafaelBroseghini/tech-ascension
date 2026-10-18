import { execFileSync, spawn } from "node:child_process"
import { mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const APP = "http://127.0.0.1:43123"
const ROOT = fileURLToPath(new URL("..", import.meta.url))
const SESSION = process.env.AGENT_BROWSER_SESSION ?? "tech-ascension-capture"
const prefix = process.argv[2] ?? "after"
const outDir = process.argv[3] ?? join(tmpdir(), "tech-ascension-visuals")
mkdirSync(outDir, { recursive: true })

const ab = (...args) =>
  execFileSync("npx", ["agent-browser", ...args], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, AGENT_BROWSER_SESSION: SESSION },
  })

async function up() {
  try {
    return (await fetch(APP)).ok
  } catch {
    return false
  }
}

let vite
if (!(await up())) {
  vite = spawn("npm", ["run", "dev"], { cwd: ROOT, stdio: "ignore", detached: true })
  for (let i = 0; i < 60 && !(await up()); i++) await new Promise((r) => setTimeout(r, 250))
}

const shot = (name) => ab("screenshot", `${outDir}/${prefix}-${name}.png`)
const game = (body) => ab("eval", `(() => { const g = window.__GAME__; ${body} })()`)
const settle = (ms = 700) => new Promise((r) => setTimeout(r, ms))
const tab = (name) => ab("find", "role", "tab", "click", "--name", name)

try {
  ab("set", "viewport", "1280", "800")
  ab("open", APP)
  ab("wait", "--fn", "!!window.__GAME__")
  game("g.reset(); g.keepProfile()")
  ab("reload")
  ab("wait", "--fn", "!!window.__GAME__")
  game("g.keepProfile()")
  await settle()
  shot("00-fresh-phase-a")

  // Phase A: clicks are XP, the shop is skills, money does not exist yet.
  game(`
    g.setXp(900)
    for (let i = 0; i < 4; i++) g.click()
    for (const id of [1, 2, 3, 4]) g.buySkill(id)
    g.setXp(1500)
  `)
  await settle()
  shot("01-phase-a-xp")

  // Phase B: Portfolio + React open the board; a real click on "Clear gig" pops the lump.
  game("g.setXp(30000); g.buySkill(15); g.buySkill(16)")
  await settle(1800)
  tab("Gigs")
  await settle(500)
  shot("02-phase-b-gig-board")
  ab("find", "role", "button", "click", "--name", "Clear gig")
  await settle(340)
  shot("03-gig-clear-pop")
  await settle(1800)

  // Phase C: six gigs and 40K XP open the Job Board.
  game(`
    g.setXp(60000)
    for (const id of [1, 2, 3, 4, 5, 6]) g.forceGig(id)
    g.buyJob(1)
    g.buyJob(2)
    g.setMoney(60000)
    g.buyEquipment(1)
    g.setMoney(40000)
  `)
  await settle(1800)
  tab("Jobs")
  await settle(700)
  shot("04-phase-c-jobs")

  // Phase D: $500K held opens capital.
  game("g.setMoney(2500000); g.buy(1); g.buy(3)")
  await settle(1800)
  tab("Capital")
  await settle(700)
  shot("05-phase-d-capital")

  ab("set", "viewport", "390", "800")
  await settle()
  shot("06-mobile")
} finally {
  ab("close")
  if (vite?.pid) process.kill(-vite.pid)
}
console.log(`wrote ${prefix}-*.png to ${outDir}`)
