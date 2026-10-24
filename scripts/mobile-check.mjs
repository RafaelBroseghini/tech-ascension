// Mobile layout check. Plays the game through window.__GAME__ at phone, tablet, landscape and desktop sizes and
// asserts on layout, not on game rules: no sideways scroll, a stacked stage and shop on portrait phones, a click
// target nothing covers, tap targets big enough, and modals that fit. Exits non-zero on any failure.
//
//   node scripts/mobile-check.mjs [outDir]          every viewport
//   MOBILE_CHECK_ONLY=390x844 node scripts/mobile-check.mjs   one viewport
//   MOBILE_CHECK_FONT=all node scripts/mobile-check.mjs       every UI font (or one id, e.g. jetbrains-mono); screenshots go in a folder per font
import { execFileSync, spawn } from "node:child_process"
import { mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { DEFAULT_UI_FONT_ID, UI_FONTS } from "../src/data/uiFonts.ts"

// Its own port, so it never talks to a dev server that is serving another checkout.
const PORT = process.env.MOBILE_CHECK_PORT ?? "43125"
const APP = `http://127.0.0.1:${PORT}`
const ROOT = fileURLToPath(new URL("..", import.meta.url))
const SESSION = process.env.AGENT_BROWSER_SESSION ?? "mobile-check"
const baseDir = process.argv[2] ?? join(tmpdir(), "tech-ascension-mobile")

// The face is a preference, so it survives reset() and a reload. One run covers the default face unless asked for more.
const FONT_ASK = process.env.MOBILE_CHECK_FONT
const FONTS = !FONT_ASK ? [DEFAULT_UI_FONT_ID] : FONT_ASK === "all" ? UI_FONTS.map((font) => font.id) : [FONT_ASK]
for (const id of FONTS) if (!UI_FONTS.some((font) => font.id === id)) throw new Error(`unknown font ${id}`)
let outDir = baseDir
let fontId = DEFAULT_UI_FONT_ID
const tag = (vp) => `${FONTS.length > 1 ? `${fontId} ` : ""}${vp.name}`

const VIEWPORTS = [
  { name: "360x640", w: 360, h: 640 },
  { name: "390x844", w: 390, h: 844 },
  { name: "430x932", w: 430, h: 932 },
  { name: "768x1024", w: 768, h: 1024 },
  { name: "844x390", w: 844, h: 390 },
  { name: "1280x800", w: 1280, h: 800 },
].filter((v) => !process.env.MOBILE_CHECK_ONLY || v.name === process.env.MOBILE_CHECK_ONLY)

const ab = (...args) =>
  execFileSync("npx", ["agent-browser", ...args], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, AGENT_BROWSER_SESSION: SESSION },
    stdio: ["ignore", "pipe", "pipe"],
  })

const settle = (ms = 500) => new Promise((r) => setTimeout(r, ms))
const game = (body) => ab("eval", `(() => { const g = window.__GAME__; ${body} })()`)

async function up() {
  try {
    return (await fetch(APP)).ok
  } catch {
    return false
  }
}

let vite
const stopVite = () => {
  if (vite?.pid) process.kill(-vite.pid, "SIGTERM")
}
if (!(await up())) {
  vite = spawn("npx", ["vite", "--host", "127.0.0.1", "--port", PORT, "--strictPort"], { cwd: ROOT, stdio: "ignore", detached: true })
  for (let i = 0; i < 120 && !(await up()); i++) await settle(250)
  if (!(await up())) throw new Error(`no dev server on ${APP}`)
}

// One eval, one JSON object. Everything the asserts need is measured in the page.
const MEASURE = `(async () => {
  // Entrance animations move cards for a moment; measure once the finite ones are done.
  await Promise.race([Promise.all(document.getAnimations().filter((a) => Number.isFinite(a.effect?.getTiming().iterations)).map((a) => a.finished.catch(() => {}))), new Promise((r) => setTimeout(r, 1500))])
  const vw = innerWidth, vh = innerHeight
  const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height } }
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" }
  const inScroller = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll)/.test(s.overflowX) && p.scrollWidth > p.clientWidth) return true } return false }
  const name = (el) => ((el.getAttribute("aria-label") || el.textContent || el.className || el.tagName) + "").trim().replace(/\\s+/g, " ").slice(0, 28)
  const interactive = [...document.querySelectorAll("button, [role=tab], a[href], input, select")].filter(visible)
  const offscreen = interactive.filter((el) => { const r = el.getBoundingClientRect(); return (r.right > vw + 1 || r.left < -1) && !inScroller(el) }).map(name)
  const tabs = [...document.querySelectorAll("[role=tab]")].filter(visible)
  const buys = [...document.querySelectorAll(".shop-list button")].filter(visible)
  const bar = [...document.querySelectorAll(".ide-activity button, .ide-activity a, .stage-corner button")].filter(visible)
  const small = (list) => list.filter((el) => { const r = el.getBoundingClientRect(); return r.width < 44 || r.height < 44 }).map((el) => name(el) + " " + Math.round(el.getBoundingClientRect().width) + "x" + Math.round(el.getBoundingClientRect().height))
  const hit = document.querySelector(".hitbox")
  let hitOk = null, hitCover = null
  if (hit && visible(hit)) {
    const r = hit.getBoundingClientRect()
    const x = Math.min(Math.max(r.left + r.width / 2, 0), vw - 1), y = Math.min(Math.max(r.top + r.height / 2, 0), vh - 1)
    const top = document.elementFromPoint(x, y)
    hitOk = !!top && (top === hit || hit.contains(top))
    if (!hitOk && top) hitCover = name(top)
  }
  const dialogs = [...document.querySelectorAll("[role=dialog]")].filter(visible).map((d) => {
    const r = d.getBoundingClientRect()
    // A list inside a scrolling card is allowed to run past the screen; its buttons are reached by scrolling.
    const scrolls = (b) => { for (let p = b.parentElement; p && p !== d.parentElement; p = p.parentElement) { const o = getComputedStyle(p).overflowY; if (/(auto|scroll)/.test(o) && p.scrollHeight > p.clientHeight && p !== d) return true } return false }
    const btn = [...d.querySelectorAll("button")].filter(visible).filter((b) => !scrolls(b)).map((b) => b.getBoundingClientRect())
    return { label: name(d), fits: r.left >= -1 && r.right <= vw + 1 && r.top >= -1 && r.bottom <= vh + 1, buttonsInside: btn.length > 0 && btn.every((b) => b.bottom <= vh + 1 && b.right <= vw + 1 && b.top >= -1) }
  })
  return {
    vw, vh,
    scrollW: document.documentElement.scrollWidth,
    scrollH: document.documentElement.scrollHeight,
    stage: rect(document.querySelector(".stage-panel")),
    shop: rect(document.querySelector(".shop")),
    docked: !!document.querySelector(".shop.is-docked"),
    expanded: !!document.querySelector(".shop.is-expanded"),
    grip: rect(document.querySelector("[data-testid=shop-grip]")),
    hit: rect(hit), hitOk, hitCover,
    offscreen,
    smallTabs: small(tabs), smallBuys: small(buys), smallBar: small(bar),
    dialogs,
    tabCount: tabs.length,
  }
})()`

const ROWS = `(async () => {
  // Every shop tab, and each of its sub tabs, shows whole rows at the top, the middle and the end of its scroll.
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const bad = []
  const probe = async (label) => {
    const list = document.querySelector(".shop-list")
    if (!list) return
    for (const at of [0, 0.5, 1]) {
      list.scrollTop = at * (list.scrollHeight - list.clientHeight)
      await sleep(450)
      const box = list.getBoundingClientRect()
      const cut = [...list.querySelectorAll(".offer")].filter((row) => {
        const r = row.getBoundingClientRect()
        return r.bottom > box.top + 1 && r.top < box.bottom - 1 && (r.top < box.top - 1.5 || r.bottom > box.bottom + 1.5)
      })
      if (cut.length) { bad.push(label + " cuts " + cut.length + " row(s) at " + at); return }
    }
  }
  const sub = () => [...document.querySelectorAll(".era-tabs.era-sub .era-tab")]
  for (const tab of [...document.querySelectorAll(".era-tabs:not(.era-sub) .era-tab")]) {
    if (/Company/.test(tab.textContent)) continue
    tab.click()
    await sleep(300)
    await probe(tab.textContent.trim())
    for (const s of sub()) { s.click(); await sleep(300); await probe(tab.textContent.trim() + " / " + s.textContent.trim()) }
  }
  return JSON.stringify(bad)
})()`

const failures = []
const warnings = []
const rows = []

function check(vp, state, m) {
  const where = `${tag(vp)} ${state}`
  const fail = (msg) => failures.push(`${where}: ${msg}`)
  const warn = (msg) => warnings.push(`${where}: ${msg}`)
  const portraitPhone = vp.w <= 860 && vp.h > vp.w
  const landscapePhone = vp.w <= 860 && vp.h <= vp.w
  const desktop = vp.w > 860

  if (m.scrollW > vp.w + 1) fail(`sideways scroll, page is ${m.scrollW}px wide`)
  if (m.scrollH > vp.h + 1) fail(`the page scrolls vertically (${m.scrollH}px tall)`)
  if (m.offscreen.length) fail(`controls off the screen: ${m.offscreen.slice(0, 6).join(", ")}`)

  if (m.stage && m.shop) {
    if (portraitPhone) {
      // Expanded, the sheet is meant to take the stage's room, up to the top of the screen.
      if (state !== "expanded" && m.shop.top < m.stage.top + m.stage.height * 0.5) fail(`shop is not below the stage (shop top ${Math.round(m.shop.top)}, stage ${Math.round(m.stage.top)}-${Math.round(m.stage.bottom)})`)
      if (state === "docked") {
        if (!m.docked) fail("dragging the grip down did not dock the shop")
        if (m.shop.height > 64) fail(`the docked shop is ${Math.round(m.shop.height)}px tall`)
        if (!m.grip || m.grip.height < 44) fail(`the docked bar is under 44px (${m.grip ? Math.round(m.grip.height) : "-"}px)`)
      } else if (state === "expanded") {
        if (!m.expanded) fail("dragging the grip up did not expand the shop")
        if (m.shop.top < -1) fail(`the expanded shop runs off the top of the screen (shop top ${Math.round(m.shop.top)})`)
      } else if (m.docked) fail("the shop is docked")
      else if (m.expanded) fail("the shop is still expanded")
      else if (state !== "start-card" && state !== "origin-pick" && m.shop.height < vp.h * 0.15) fail(`shop is only ${Math.round((m.shop.height / vp.h) * 100)}% of the screen`)
      if (state !== "expanded" && m.stage.height < vp.h * 0.3) fail(`stage is only ${Math.round((m.stage.height / vp.h) * 100)}% of the screen`)
    }
    if (desktop && m.shop.left < m.stage.left + vp.w * 0.4) fail("desktop lost its side-by-side stage and shop")
  } else if (state !== "start-card") {
    fail("stage or shop is missing")
  }

  const modalOpen = m.dialogs.length > 0
  if (m.hitOk === false && !modalOpen && state !== "expanded") fail(`the click target is covered by ${m.hitCover}`)
  if (m.hitOk === null && state !== "start-card" && !modalOpen) fail("no click target on screen")

  for (const d of m.dialogs) {
    if (!d.fits) fail(`dialog ${d.label} does not fit the screen`)
    if (!d.buttonsInside) fail(`dialog ${d.label} has a button off the screen`)
  }

  if (vp.w <= 860) {
    if (m.smallTabs.length) fail(`shop tabs under 44px: ${m.smallTabs.slice(0, 4).join(", ")}`)
    if (m.smallBuys.length) fail(`shop buttons under 44px: ${m.smallBuys.slice(0, 4).join(", ")}`)
    if (m.smallBar.length) fail(`activity bar controls under 44px: ${m.smallBar.slice(0, 4).join(", ")}`)
  }
  rows.push(`${where.padEnd(34)} stage ${m.stage ? Math.round((m.stage.height / vp.h) * 100) : "-"}%  shop ${m.shop ? Math.round((m.shop.height / vp.h) * 100) : "-"}%  tabs ${m.tabCount}  click ${m.hitOk === null ? "-" : m.hitOk ? "ok" : "covered"}`)
  void landscapePhone
  void warn
}

const STATES = {
  "origin-pick": `g.reset(); g.keepProfile(); g.setXp(200); g.clearReveals(); g.tick(1000); return 1`,
  "phase-a": `g.reset(); g.keepProfile(); g.pickOrigin("college"); g.setXp(2000); for (const id of [1,2,3,4]) g.buySkill(id); g.clearReveals(); g.tick(1000); return 1`,
  "phase-b": `g.reset(); g.keepProfile(); g.setXp(200000); for (let id = 1; id <= 16; id++) g.buySkill(id); for (let id = 1; id <= 3; id++) g.forceGig(id); g.clearReveals(); g.tick(1000); return 1`,
  "phase-c": `g.reset(); g.keepProfile(); g.setXp(200000); for (let id = 1; id <= 16; id++) g.buySkill(id); for (let id = 1; id <= 6; id++) g.forceGig(id); g.buyJob(1); g.setMoney(60000); g.clearReveals(); g.tick(1000); return 1`,
  "jobs-pick": `g.reset(); g.keepProfile(); g.setXp(2e6); for (let id = 1; id <= 16; id++) g.buySkill(id); for (let id = 1; id <= 6; id++) g.forceGig(id); for (let id = 1; id <= 7; id++) g.buyJob(id); g.setUsers("americas-east", 2e6); g.clearReveals(); g.tick(1000); return 1`,
  "jobs-users": `g.reset(); g.keepProfile(); g.setXp(2e6); for (let id = 1; id <= 16; id++) g.buySkill(id); for (let id = 1; id <= 6; id++) g.forceGig(id); for (let id = 1; id <= 7; id++) g.buyJob(id); g.setUsers("americas-east", 1234); g.clearReveals(); g.tick(1000); return 1`,
  "jobs-track": `g.reset(); g.keepProfile(); g.setXp(2e6); for (let id = 1; id <= 16; id++) g.buySkill(id); for (let id = 1; id <= 6; id++) g.forceGig(id); for (let id = 1; id <= 7; id++) g.buyJob(id); g.setUsers("americas-east", 2e6); g.pickSpecialization("frontend"); for (let id = 108; id <= 110; id++) g.buyJob(id); g.clearReveals(); g.tick(1000); return 1`,
  "lead-pick": `g.reset(); g.keepProfile(); g.setXp(2e6); for (let id = 1; id <= 16; id++) g.buySkill(id); for (let id = 1; id <= 6; id++) g.forceGig(id); for (let id = 1; id <= 7; id++) g.buyJob(id); g.setUsers("americas-east", 2e6); g.pickSpecialization("backend"); for (let id = 8; id <= 15; id++) g.buyJob(id); g.clearReveals(); g.tick(1000); return 1`,
  "lead-track": `g.reset(); g.keepProfile(); g.setXp(2e6); for (let id = 1; id <= 16; id++) g.buySkill(id); for (let id = 1; id <= 6; id++) g.forceGig(id); for (let id = 1; id <= 7; id++) g.buyJob(id); g.setUsers("americas-east", 2e6); g.pickSpecialization("backend"); for (let id = 8; id <= 15; id++) g.buyJob(id); g.pickLeadership("manager"); g.buyJob(18); g.clearReveals(); g.tick(1000); return 1`,
  "mid-d": `g.reset(); g.keepProfile(); g.setXp(400000); for (let id = 1; id <= 16; id++) g.buySkill(id); for (let id = 1; id <= 6; id++) g.forceGig(id); g.buyJob(1); for (let id = 2; id <= 7; id++) g.buyJob(id); g.setUsers("americas-east", 2e6); g.pickSpecialization("backend"); g.setUsers("americas-east", 2e6); g.buyJob(14); g.setMoney(9e6); g.buy(1); g.buy(3); g.clearReveals(); g.tick(1000); return 1`,
}

function dismissGate() {
  try {
    ab("find", "role", "button", "click", "--name", "Got it")
  } catch {
    // No gate on this build, or already dismissed.
  }
}

function measure() {
  const out = ab("eval", MEASURE)
  return JSON.parse(out.slice(out.indexOf("{")))
}

function gripCenter() {
  const out = ab("eval", `(() => { const r = document.querySelector("[data-testid=shop-grip]").getBoundingClientRect(); return JSON.stringify([r.left + r.width / 2, r.top + r.height / 2]) })()`)
  const [x, y] = JSON.parse(JSON.parse(out.slice(out.indexOf('"'))))
  // agent-browser rejects fractional coordinates.
  return [Math.round(x), Math.round(y)]
}

// A slow drag on the grip, with the mouse, so it goes through the same pointer handlers as a finger.
function dragGrip(dy) {
  const [x, y] = gripCenter()
  ab("mouse", "move", String(x), String(y))
  ab("mouse", "down")
  // `mouse move` takes no step flags, so walk the drag in small moves.
  for (let i = 1; i <= 12; i++) ab("mouse", "move", String(x), String(y + Math.round((dy * i) / 12)))
  ab("mouse", "up")
}

const UNDOCK = `(() => { document.querySelector(".shop.is-docked [data-testid=shop-grip]")?.click(); return 1 })()`

function shot(vp, state) {
  ab("screenshot", `${outDir}/${vp.name}-${state}.png`)
}

// Sets the UI font and waits for its files, so the measure sees the face and not the fallback.
async function pickFont(id) {
  game(`g.setFont(${JSON.stringify(id)}); return 1`)
  ab("eval", `(async () => { await new Promise((r) => setTimeout(r, 300)); const face = getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim().split(",")[0]; await Promise.all([500, 600, 700].map((w) => document.fonts.load(w + " 16px " + face))); await document.fonts.ready; return 1 })()`)
  await settle()
}

try {
  for (const id of FONTS) {
    fontId = id
    outDir = FONTS.length > 1 ? join(baseDir, id) : baseDir
    mkdirSync(outDir, { recursive: true })
    await runViewports()
  }
  const errors = ab("errors").trim()
  if (errors && !/no errors/i.test(errors)) failures.push(`page errors:\n${errors}`)
} catch (error) {
  failures.push(`the run stopped: ${error.message}`)
} finally {
  try {
    ab("close")
  } catch {
    // Already closed.
  }
  stopVite()
}

async function runViewports() {
  for (const vp of VIEWPORTS) {
    ab("set", "viewport", String(vp.w), String(vp.h))
    ab("open", APP)
    ab("wait", "--fn", "!!window.__GAME__")
    dismissGate()
    // reset() wipes the career, not the prefs: a dock left over from another run would shrink every shop below.
    ab("eval", UNDOCK)
    await pickFont(fontId)

    // The start card, as a new player sees it.
    game("g.reset(); return 1")
    await settle()
    dismissGate()
    check(vp, "start-card", measure())
    shot(vp, "start-card")
    game("g.keepProfile(); return 1")

    for (const [state, body] of Object.entries(STATES)) {
      game(body)
      await settle()
      // Holding Senior opens capital and the shop moves to it: the leadership states look at the Jobs tab.
      if (state.startsWith("lead-")) {
        try {
          ab("find", "role", "tab", "click", "--name", "Jobs")
        } catch {
          failures.push(`${tag(vp)} ${state}: no Jobs tab to open`)
        }
        // The pick and the new rows sit at the foot of the list.
        ab("eval", "(() => { const list = document.querySelector('.shop-list'); if (list) list.scrollTop = list.scrollHeight; return 1 })()")
        await settle()
      }
      check(vp, state, measure())
      shot(vp, state)
    }

    // A portrait phone's shop sheet: drag the grip up to expand it (never off the top of the screen), tap to return to two rows,
    // drag it down to a bar, then tap the bar to open it again.
    if (vp.w <= 860 && vp.h > vp.w) {
      game(STATES["mid-d"])
      await settle()
      const rowsH = measure().shop.height
      dragGrip(-Math.round(vp.h * 0.5))
      await settle()
      const grown = measure()
      check(vp, "expanded", grown)
      shot(vp, "expanded")
      if (grown.shop.height < rowsH + 40) failures.push(`${vp.name} expanded: the sheet did not grow (${Math.round(rowsH)}px -> ${Math.round(grown.shop.height)}px)`)
      // A little down again keeps it expanded, shorter.
      dragGrip(Math.round((grown.shop.height - rowsH) * 0.3))
      await settle()
      const less = measure()
      if (!less.expanded || less.shop.height >= grown.shop.height) failures.push(`${vp.name} expanded: dragging down did not shorten the sheet (${Math.round(grown.shop.height)}px -> ${Math.round(less.shop.height)}px, expanded ${less.expanded})`)
      // A tap on the expanded grip returns to two rows.
      const [ex, ey] = gripCenter()
      ab("mouse", "move", String(ex), String(ey))
      ab("mouse", "down")
      ab("mouse", "up")
      await settle()
      const back = measure()
      check(vp, "rows-again", back)
      if (Math.abs(back.shop.height - rowsH) > 2) failures.push(`${vp.name} rows-again: tapping the grip left the sheet at ${Math.round(back.shop.height)}px, not two rows (${Math.round(rowsH)}px)`)
      // From the two rows, down docks and a tap opens it, as before.
      dragGrip(Math.round(vp.h * 0.3))
      await settle()
      check(vp, "docked", measure())
      shot(vp, "docked")
      const [x, y] = gripCenter()
      ab("mouse", "move", String(x), String(y))
      ab("mouse", "down")
      ab("mouse", "up")
      await settle()
      check(vp, "undocked", measure())
      ab("eval", UNDOCK)
    }

    // The Company tab, with an incident live.
    game("g.forceIncident('ddos'); return 1")
    try {
      ab("find", "role", "tab", "click", "--name", "Company")
    } catch {
      failures.push(`${tag(vp)} company: no Company tab to open`)
    }
    await settle()
    check(vp, "company", measure())
    shot(vp, "company")

    // Narrow screens keep the owned list behind a button, in a modal that must fit.
    if (vp.w <= 860) {
      game(STATES["mid-d"])
      await settle()
      game("g.setMoney(9e12); for (let id = 1; id <= 25; id++) g.buy(id); for (let id = 1; id <= 40; id++) g.buyEquipment(id); g.clearReveals(); g.tick(1000); return 1")
      await settle()
      const rowOut = ab("eval", ROWS)
      for (const msg of JSON.parse(JSON.parse(rowOut.slice(rowOut.indexOf('"')))) ) failures.push(`${tag(vp)} shop: ${msg}`)
      game(STATES["mid-d"])
      await settle()
      try {
        ab("find", "role", "button", "click", "--name", "Owned")
        await settle()
        check(vp, "owned-modal", measure())
        shot(vp, "owned-modal")
        ab("press", "Escape")
      } catch {
        failures.push(`${tag(vp)} owned-modal: no Owned button to open`)
      }
    }

    // A reveal card queued: it must not bury the click target.
    game("g.reset(); g.keepProfile(); g.setXp(90); g.buySkill(1); return 1")
    await settle(900)
    check(vp, "reveal", measure())
    shot(vp, "reveal")
    game("g.clearReveals(); return 1")

    // Modals: an event and a 1:1 over a held job.
    game(`g.reset(); g.keepProfile(); g.setXp(200000); for (let id = 1; id <= 16; id++) g.buySkill(id); for (let id = 1; id <= 6; id++) g.forceGig(id); g.buyJob(1); g.clearReveals(); g.forceEvent(1); return 1`)
    await settle()
    check(vp, "event", measure())
    shot(vp, "event")
    game("g.dismissEvent(); g.forceReview(); return 1")
    await settle()
    check(vp, "review", measure())
    shot(vp, "review")
    game("g.dismissReview(); return 1")
  }
}

console.log(rows.join("\n"))
console.log(`\nscreenshots: ${baseDir}`)
if (warnings.length) console.log(`\nwarnings (${warnings.length})\n${warnings.join("\n")}`)
if (failures.length) {
  console.error(`\nFAILED (${failures.length})\n${failures.join("\n")}`)
  process.exit(1)
}
console.log("\nmobile check passed")
