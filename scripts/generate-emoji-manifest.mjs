/**
 * Build src/data/emojiManifest.json from emoji.gg CDN URLs.
 * Each image is used once. Image files are not downloaded.
 *
 * Run: node scripts/generate-emoji-manifest.mjs
 *      node scripts/generate-emoji-manifest.mjs --refresh
 */
import { readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { isDisallowedTitle, loadCatalog } from "./emojigg.mjs"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const MANIFEST = join(ROOT, "src/data/emojiManifest.json")
const DESK_CAT_POOL = join(ROOT, "src/data/deskCatClickPool.json")

const DESK_CAT_CLICK_RE = /cat|kitty|meow|kitten|neko|nyan/i
const DESK_CAT_POOL_MIN = 100
const DESK_CAT_POOL_MAX = 300
const PHASES = join(ROOT, "src/data/phases.ts")
const GEAR = join(ROOT, "src/data/gear.ts")
const CAPITAL = join(ROOT, "src/data/capital.ts")

const PINS = join(ROOT, "scripts/emoji-pins.json")

/**
 * Hand-vetted picks (kind:id), checked by eye against the row name. They beat
 * keyword search; rows without a pin fall back to the keyword pick below.
 * @type {Record<string, { label: string, idle: string, click: string }>}
 */
const PINNED = JSON.parse(await readFile(PINS, "utf8"))

const STOP = new Set(
  `the and for with you from into your soft habit notes toy intro basics taste kit model one
  real first beyond layer mental practice finished nights deep reps fluency starter hello world
  unit basic live site app dabble experiment mindset attempts patterns public draft level study
  club pairing workflow brush fine tune reading capacity planning multi region commander
  production story journal distributed systems actually posts speaking mentoring juniors
  negotiation scope staff principal teaching workshop prompt engineering array wrangling
  compilers interpreters contracts ops somewhere polished open source pipeline actions craft
  tooling feature flag hygiene threat modeling decision records practice problems essentials
  migration playbook learn config mgmt playbooks event stream concurrency ownership desktop
  incident runbook blog conference talk list weekend handoff docs plugin tweak slice panel
  endpoint template coding client testimonial internal tool smb payments ish second third
  local biz upwerk`
    .split(/\s+/)
    .filter(Boolean),
)

/** Name patterns that should search for these emoji titles. */
const ALIASES = [
  [/laptop|keyboard|monitor|webcam|mouse|headset|dock|lamp|chair|riser|stand/, ["laptop", "keyboard", "computer", "monitor"]],
  [/python/, ["python"]],
  [/typescript/, ["typescript"]],
  [/javascript/, ["javascript"]],
  [/react/, ["react"]],
  [/html|css|landing/, ["html", "css", "code"]],
  [/git/, ["git", "github"]],
  [/linux|bash|cli|shell|terminal/, ["linux", "terminal", "bash"]],
  [/sql|database|postgres|relational|document/, ["database", "sql", "server", "postgresql"]],
  [/auth|security|jwt|threat|lock/, ["lock", "shield", "security"]],
  [/test|bug|jest/, ["bug", "test"]],
  [/docker|dockyard|container/, ["docker", "container"]],
  [/cloud|aws|azure|gcp|serverless/, ["cloud", "server"]],
  [/kubernetes|kubectl|cluster/, ["kubernetes", "server"]],
  [/mars/, ["mars", "rocket", "astronaut"]],
  [/moon|lunar/, ["moon"]],
  [/orbit|satellite|constellation|\bleo\b/, ["satellite", "rocket", "space"]],
  [/money|fund|equity|invest|syndicate|seed|series|stonk|ticker|acquire|check\b|saas/, ["money", "coin", "chart", "stock"]],
  [/rocket|deploy|ship/, ["rocket"]],
  [/book|read|rfc|doc|study|lecture|blog/, ["book", "study"]],
  [/brain|algorithm|leetcrate|leetcode|\bml\b|\bllm\b|\bai\b|neural|cuda|gpu/, ["brain", "robot", "chip", "ai"]],
  [/chip|accelerator|foundry|fab\b|factory/, ["chip", "factory", "cpu"]],
  [/server|rack|nas|storage|homelab|kvm|nic|ethernet/, ["server", "computer", "network"]],
  [/cat/, ["cat", "kitty"]],
  [/intern|junior|mentor/, ["student", "book"]],
  [/cto|chief|fellow|board|director/, ["star", "crown"]],
  [/fire|incident|on-call|alert|observability/, ["fire", "alert", "warning"]],
  [/coffee/, ["coffee"]],
  [/mobile|phone|extension/, ["phone"]],
  [/email|inbox/, ["mail", "email"]],
  [/robot/, ["robot"]],
  [/browser|chrome|firefox/, ["browser", "chrome"]],
  [/stack overblow/, ["stackoverflow"]],
  [/freecodechamp|codechamp/, ["code"]],
  [/youtoob/, ["video"]],
  [/githug/, ["git", "github"]],
  [/discourd/, ["chat"]],
  [/whycombinator|combinator/, ["rocket", "money"]],
  [/temporal/, ["clock", "time"]],
  [/edge workers/, ["cloud"]],
  [/coffee/, ["coffee"]],
]

const SOURCE_RANK = { starter: 0, search: 1, api: 2 }

function decodeName(raw) {
  return raw.replace(/\\u00d7/g, "×").replace(/\\u2192/g, "→")
}

async function loadNamedRows(file, blockRe, nameRe) {
  const src = await readFile(file, "utf8")
  const block = src.match(blockRe)?.[1] ?? ""
  /** @type {{ id: number, name: string }[]} */
  const rows = []
  for (const match of block.matchAll(nameRe)) {
    rows.push({ id: +match[1], name: decodeName(match[2]) })
  }
  rows.sort((a, b) => a.id - b.id)
  return rows
}

function tokens(name) {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !STOP.has(token))
}

function keywords(name) {
  const primary = new Set(tokens(name))
  const aliases = new Set()
  const lower = name.toLowerCase()
  for (const [test, extra] of ALIASES) {
    if (!test.test(lower)) continue
    for (const word of extra) {
      if (!primary.has(word)) aliases.add(word)
    }
  }
  return { primary: [...primary], aliases: [...aliases] }
}

const TECH_TITLE =
  /\b(laptop|computer|keyboard|server|linux|python|javascript|typescript|react|html|css|git|github|docker|database|sql|postgres|cloud|rocket|mars|moon|robot|chip|cpu|gpu|terminal|bug|browser|code|software|program|developer|monitor|mouse|network|book|coffee|lock|money|coin|chart|factory|satellite|space|astronaut|cat|kitty|chrome|firefox|java|php|rust|golang|ruby|swift|kotlin|vue|angular|node|bash|shell|api|json|pixel|neural|office|student|study|email|mail|folder|security|shield|warning|alert|fire|check|binary|wifi|compiler|debug|error|stack|frontend|backend|android|windows|macos|npm|algorithm|cyber|router|science|math|calculator|briefcase|calendar|clock|download|upload|backup|password|firewall|archive|internet|blender|photoshop|csharp|cpp|redis|mysql|nginx|openai|chatgpt|nvidia|intel|hosting|website|html5|typescript|nodejs|webpack|vite|function|data)\b/i

function isTechTitle(title) {
  return TECH_TITLE.test(title)
}

function titleTokens(title) {
  return title.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length >= 2)
}

/**
 * Primary name tokens outrank alias hints. An exact title ("mars", "laptop")
 * outranks a longer title that merely contains the word.
 * @param {{ primary: string[], aliases: string[] }} words
 * @param {{ title: string }} emoji
 */
function keywordScore(words, emoji) {
  const title = emoji.title.toLowerCase()
  const tokensOfTitle = titleTokens(emoji.title)
  const hit = (word, weight) => {
    if (title === word) return weight + 20
    if (tokensOfTitle.includes(word)) return weight
    if (word.length >= 5 && title.includes(word)) return Math.floor(weight / 2)
    return 0
  }
  let score = 0
  for (const word of words.primary) score += hit(word, 12)
  if (score === 0) {
    for (const word of words.aliases) score += hit(word, 5)
  }
  if (score > 0) score += Math.max(0, 6 - tokensOfTitle.length)
  return score
}

/**
 * @param {any[]} pool
 * @param {Set<string>} used
 * @param {string[]} words
 * @param {boolean} wantGif
 */
function takeBest(pool, used, words, wantGif) {
  /** @type {{ emoji: any, score: number } | null} */
  let best = null
  for (const emoji of pool) {
    if (used.has(emoji.image)) continue
    const matched = keywordScore(words, emoji)
    if (matched < 12) continue
    const score = matched * 10 + (emoji.gif === wantGif ? 2 : 0) + (emoji.source === "api" ? 0 : 1)
    if (!best || score > best.score || (score === best.score && emoji.faves > best.emoji.faves)) {
      best = { emoji, score }
    }
  }
  return best?.emoji ?? null
}

/**
 * @param {any[]} pool
 * @param {Set<string>} used
 * @param {boolean} wantGif
 */
/**
 * Rows without a topical hit reuse the tech pool. Least-used first, so a
 * laptop or python emoji is not stamped on every leftover row.
 * @param {Map<string, number>} useCount
 */
function takeFiller(pool, avoid, wantGif, useCount) {
  const tech = pool.filter((emoji) => isTechTitle(emoji.title) && !avoid.has(emoji.image))
  if (tech.length === 0) throw new Error("No tech emoji left in the emoji.gg catalog")
  tech.sort((a, b) => {
    const uses = (useCount.get(a.image) ?? 0) - (useCount.get(b.image) ?? 0)
    if (uses !== 0) return uses
    const gif = Number(b.gif === wantGif) - Number(a.gif === wantGif)
    if (gif !== 0) return gif
    return a.title.length - b.title.length || b.faves - a.faves
  })
  return tech[0]
}

function pickDeskCat(pool) {
  const cats = pool.filter((emoji) => !emoji.gif && /cat|kitty|meow/.test(emoji.title.toLowerCase()))
  cats.sort((a, b) => {
    const cozy = (emoji) => (/blush|sleep|cozy|cute|good|peek|loaf|sit/.test(emoji.title.toLowerCase()) ? 2 : 0)
    return cozy(b) - cozy(a) || (SOURCE_RANK[a.source] ?? 2) - (SOURCE_RANK[b.source] ?? 2) || b.faves - a.faves
  })
  if (cats.length === 0) throw new Error("No still cat emoji in the emoji.gg catalog")
  return cats[0]
}

/** Still and GIF cats for the desk-cat tap roulette (main idle cat stays separate). */
function collectDeskCatClickPool(pool, deskCatImage) {
  const seen = new Set()
  const rows = []
  for (const emoji of pool) {
    if (!DESK_CAT_CLICK_RE.test(emoji.title)) continue
    if (isDisallowedTitle(emoji.title)) continue
    if (!emoji.image?.includes("emoji.gg")) continue
    if (emoji.image === deskCatImage || seen.has(emoji.image)) continue
    seen.add(emoji.image)
    rows.push(emoji)
  }
  rows.sort((a, b) => b.faves - a.faves || a.title.localeCompare(b.title))
  if (rows.length < DESK_CAT_POOL_MIN) {
    throw new Error(`Only ${rows.length} desk cat click emojis in the emoji.gg catalog (need ${DESK_CAT_POOL_MIN}+)`)
  }
  return rows.slice(0, DESK_CAT_POOL_MAX).map((emoji) => emoji.image)
}

async function catalogRows() {
  const skills = await loadNamedRows(
    PHASES,
    /const SKILL_ROWS[^[]*\[([\s\S]*?)\] as const/,
    /\{\s*id:\s*(\d+),\s*name:\s*"((?:\\.|[^"\\])*)"/g,
  )
  const gigs = await loadNamedRows(
    PHASES,
    /const GIG_ROWS[^[]*\[([\s\S]*?)\]\s*\n\n\/\*\* Each gig/,
    /\{\s*id:\s*(\d+),\s*name:\s*"((?:\\.|[^"\\])*)"/g,
  )
  const jobs = await loadNamedRows(
    PHASES,
    /const JOB_ROWS[^[]*\[([\s\S]*?)\] as const/,
    /\{\s*id:\s*(\d+),\s*name:\s*"((?:\\.|[^"\\])*)"/g,
  )
  const gear = await loadNamedRows(
    GEAR,
    /const GEAR_ROWS[^[]*\[([\s\S]*?)\] as const/,
    /\{\s*id:\s*(\d+),\s*kind:\s*"[^"]+",\s*name:\s*"((?:\\.|[^"\\])*)"/g,
  )
  const capital = await loadNamedRows(
    CAPITAL,
    /const CAPITAL_ROWS[^[]*\[([\s\S]*?)\] as const/,
    /\{\s*id:\s*(\d+),\s*era:\s*"[^"]+",\s*artId:\s*\d+,\s*name:\s*"((?:\\.|[^"\\])*)"/g,
  )
  return { skills, gigs, jobs, gear, capital }
}

async function main() {
  const refresh = process.argv.includes("--refresh")
  const emojis = await loadCatalog(refresh)
  const deskCat = pickDeskCat(emojis)
  const deskCatClickPool = collectDeskCatClickPool(emojis, deskCat.image)
  const unique = new Set([deskCat.image, ...deskCatClickPool])
  const useCount = new Map([[deskCat.image, 1]])
  for (const url of deskCatClickPool) useCount.set(url, (useCount.get(url) ?? 0) + 1)

  // Reserve every pinned URL first, so keyword and filler picks never take one.
  const pinnedUrls = new Set()
  for (const [pinKey, pinned] of Object.entries(PINNED)) {
    for (const url of [pinned.idle, pinned.click]) {
      if (unique.has(url)) throw new Error(`Pinned ${pinKey} reuses an emoji URL already assigned (${url})`)
      unique.add(url)
      pinnedUrls.add(url)
      useCount.set(url, 1)
    }
  }

  /**
   * @param {{ primary: string[], aliases: string[] }} words
   * @param {boolean} wantGif
   * @param {string | null} sibling
   */
  function assignSlot(words, wantGif, sibling) {
    const blocked = new Set(unique)
    if (sibling) blocked.add(sibling)
    const best = takeBest(emojis, blocked, words, wantGif)
    if (best) {
      unique.add(best.image)
      useCount.set(best.image, (useCount.get(best.image) ?? 0) + 1)
      return { emoji: best, matched: true }
    }
    const avoid = new Set([deskCat.image, ...pinnedUrls])
    if (sibling) avoid.add(sibling)
    const filler = takeFiller(emojis, avoid, wantGif, useCount)
    useCount.set(filler.image, (useCount.get(filler.image) ?? 0) + 1)
    return { emoji: filler, matched: false }
  }

  /** @type {Record<string, Record<string, unknown>>} */
  const manifest = {
    ui: {
      deskCat: deskCat.image,
      deskCatTitle: deskCat.title,
      deskCatClickPoolCount: deskCatClickPool.length,
    },
    skill: {},
    gig: {},
    job: {},
    gear: {},
    capital: {},
  }

  const loaded = await catalogRows()
  /** @type {{ kind: string, id: number, name: string, words: string[] }[]} */
  const rows = [
    {
      kind: "skill",
      id: 0,
      name: "High school",
      words: { primary: ["laptop", "book"], aliases: ["computer", "study"] },
    },
  ]
  for (const [kind, list] of Object.entries(loaded)) {
    const singular = kind === "skills" ? "skill" : kind === "gigs" ? "gig" : kind === "jobs" ? "job" : kind
    for (const row of list) rows.push({ kind: singular, id: row.id, name: row.name, words: keywords(row.name) })
  }

  const stage = rows.find((row) => row.kind === "skill" && row.id === 0)
  const rest = rows.filter((row) => row !== stage)
  const bestMatch = new Map(rest.map((row) => [row, 0]))
  for (const emoji of emojis) {
    for (const row of rest) {
      const value = keywordScore(row.words, emoji)
      if (value > bestMatch.get(row)) bestMatch.set(row, value)
    }
  }
  const kindLate = { skill: 0, gig: 1, job: 2, gear: 3, capital: 4 }
  rest.sort(
    (a, b) =>
      (bestMatch.get(b) ?? 0) - (bestMatch.get(a) ?? 0) ||
      (kindLate[b.kind] ?? 0) - (kindLate[a.kind] ?? 0) ||
      b.id - a.id,
  )
  const ordered = stage ? [stage, ...rest] : rest

  let pinnedRows = 0
  let matched = 0
  let filled = 0
  for (const row of ordered) {
    const pinKey = `${row.kind}:${row.id}`
    const pinned = PINNED[pinKey]
    if (pinned) {
      manifest[row.kind][String(row.id)] = pinned
      pinnedRows++
      continue
    }
    const idleSlot = assignSlot(row.words, false, null)
    const clickSlot = assignSlot(row.words, true, idleSlot.emoji.image)
    const idle = idleSlot.emoji
    const click = clickSlot.emoji
    if (idle.image === click.image) throw new Error(`Idle and click share an emoji (${row.kind} ${row.name})`)
    const keywordHit = idleSlot.matched || clickSlot.matched
    if (keywordHit) matched++
    else filled++
    manifest[row.kind][String(row.id)] = {
      label: `${idle.title} + ${click.title}`,
      idle: idle.image,
      click: click.image,
    }
  }

  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`)
  await writeFile(DESK_CAT_POOL, `${JSON.stringify(deskCatClickPool, null, 2)}\n`)
  const counts = ["skill", "gig", "job", "gear", "capital"].map((kind) => `${kind}:${Object.keys(manifest[kind]).length}`).join(", ")
  const heaviest = [...useCount.entries()].sort((a, b) => b[1] - a[1])[0]
  console.log(`Wrote ${MANIFEST} (${counts}; ${unique.size} unique topical URLs, max reuse ${heaviest?.[1] ?? 0})`)
  console.log(`desk cat: ${deskCat.title} ${deskCat.image}`)
  console.log(`desk cat click pool: ${deskCatClickPool.length} URLs → ${DESK_CAT_POOL}`)
  console.log(`pinned: ${pinnedRows}, keyword matches: ${matched}, filler: ${filled}`)
  const preview = ["0", "1", "2"].map((id) => `skill ${id}: ${manifest.skill[id].label}`)
  const mars = manifest.capital["25"]
  console.log(preview.join("\n"))
  console.log(`capital 25: ${mars.label}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
