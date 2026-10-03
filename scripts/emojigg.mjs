/**
 * emoji.gg catalog.
 *
 * Their license allows use where nobody is charged for the emoji, and forbids
 * redistributing the files. This module records CDN URLs only. It never writes
 * image bytes.
 *
 * `https://emoji.gg/api` and `https://emoji.gg/api/packs` ignore `page` today
 * and return one fixed window (about 5,450 emojis, and the newest 100 packs).
 * The site itself paginates HTML with `&page=`. Starter collections are read
 * from those pages: software packs, and the future / development / technology
 * searches.
 */
import { readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
export const CACHE_PATH = join(ROOT, "scripts/.emojigg-cache.json")

const API = "https://emoji.gg/api"
const PACKS_API = "https://emoji.gg/api/packs"
const SITE = "https://emoji.gg"

/** Collections the game should prefer. */
const EMOJI_SEARCHES = ["future", "development", "technology", "software"]
const PACK_SEARCHES = ["software", "code", "computer", "development", "technology", "linux", "program"]

/** Extra searches so every catalog row can still find a topical emoji. */
const FILL_SEARCHES = [
  "laptop",
  "computer",
  "keyboard",
  "server",
  "linux",
  "python",
  "javascript",
  "typescript",
  "react",
  "html",
  "css",
  "git",
  "docker",
  "database",
  "cloud",
  "rocket",
  "mars",
  "moon",
  "robot",
  "chip",
  "terminal",
  "bug",
  "browser",
  "money",
  "cat",
  "coffee",
  "book",
  "lock",
  "factory",
  "satellite",
  "ai",
]

const SEARCH_PAGE_CAP = 4
const PACK_LIST_PAGE_CAP = 2
const PACK_CAP = 48
const CONCURRENCY = 6

const NSFW_CATEGORY = 9
const LETTERS_CATEGORY = 11

const DISALLOWED_TITLE =
  /\b(nsfw|porn|hentai|rule34|nude|naked|boob|titty|penis|vagina|xxx|fuck|asshole|decap|naughty|gasm)\b|highway|interstate/i

export function isDisallowedTitle(title) {
  return DISALLOWED_TITLE.test(String(title ?? ""))
}

function titleFromFile(file) {
  const base = file.replace(/\.[a-z0-9]+$/i, "")
  const slug = base.replace(/^\d+[-_]/, "")
  return slug.replace(/[_-]+/g, " ").trim()
}

function fileOf(url) {
  try {
    return new URL(url).pathname.split("/").pop() ?? url
  } catch {
    return url
  }
}

function isGif(file) {
  return file.toLowerCase().endsWith(".gif")
}

/**
 * @param {string} file
 * @param {string} title
 * @param {{ category?: number | null, faves?: number, source: "starter" | "search" | "api" }} meta
 */
function entry(file, title, meta) {
  const clean = title.replace(/\s+/g, " ").trim()
  if (!file || !clean || isDisallowedTitle(clean) || isDisallowedTitle(file)) return null
  if (meta.category === NSFW_CATEGORY || meta.category === LETTERS_CATEGORY) return null
  return {
    file,
    title: clean,
    image: `https://cdn3.emoji.gg/emojis/${file}`,
    category: meta.category ?? null,
    faves: meta.faves ?? 0,
    source: meta.source,
    gif: isGif(file),
  }
}

async function getText(url) {
  const res = await fetch(url, {
    headers: { "user-agent": "tech-ascension emoji catalog", accept: "*/*" },
    redirect: "follow",
  })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.text()
}

async function getJson(url) {
  const text = await getText(url)
  return JSON.parse(text)
}

/**
 * Walk `?page=` until a page repeats the previous one. The live API currently
 * repeats on page 2; the loop is what picks up real pages if that changes.
 * @template T
 * @param {(page: number) => string} urlFor
 * @param {(body: unknown) => string} fingerprint
 */
async function paginate(urlFor, fingerprint) {
  /** @type {unknown[]} */
  const pages = []
  let previous = ""
  for (let page = 1; page <= 20; page++) {
    const body = await getJson(urlFor(page))
    const mark = fingerprint(body)
    if (!mark || mark === previous) break
    previous = mark
    pages.push(body)
    if (page === 1 && !Array.isArray(body)) break
  }
  return pages
}

function emojiFingerprint(body) {
  if (!Array.isArray(body) || body.length === 0) return ""
  const first = body[0]
  const last = body[body.length - 1]
  return `${body.length}:${first?.id}:${last?.id}`
}

function cardsFromHtml(html) {
  /** @type {{ file: string, title: string }[]} */
  const found = []
  const parts = html.split(/class="col-\d[^"]*\bitem"/)
  for (const part of parts.slice(1)) {
    const img = part.match(/data-src="https:\/\/cdn3\.emoji\.gg\/emojis\/([^"]+)"/)
    const title = part.match(/class="fw-semibold fs-12 h4">\s*([^<]+)/)
    if (!img) continue
    found.push({
      file: img[1],
      title: title ? title[1].replace(/\s+/g, " ").trim() : titleFromFile(img[1]),
    })
  }
  if (found.length > 0) return found
  // Pack pages inline every emoji as a plain <img>, including preview tiles.
  for (const file of html.matchAll(/https:\/\/cdn3\.emoji\.gg\/emojis\/([^"'\s]+)/g)) {
    found.push({ file: file[1], title: titleFromFile(file[1]) })
  }
  return found
}

function nextPage(html, current) {
  const match = html.match(/href="([^"]+)"[^>]*class="[^"]*\bnext-page\b/)
  if (!match) return null
  const next = new URL(match[1], current).href
  if (next === current) return null
  return next
}

async function crawlPages(start, cap) {
  /** @type {{ file: string, title: string }[]} */
  const rows = []
  const seen = new Set()
  let url = start
  for (let page = 0; page < cap && url && !seen.has(url); page++) {
    seen.add(url)
    const html = await getText(url)
    const batch = cardsFromHtml(html)
    if (batch.length === 0 && page > 0) break
    rows.push(...batch)
    url = nextPage(html, url)
  }
  return rows
}

/** @param {Map<string, ReturnType<typeof entry>>} index */
function addRows(index, rows, source) {
  let added = 0
  for (const row of rows) {
    if (index.has(row.file)) {
      const existing = index.get(row.file)
      if (existing && source === "starter" && existing.source !== "starter") {
        existing.source = "starter"
      }
      continue
    }
    const made = entry(row.file, row.title, { source, faves: 0, category: null })
    if (!made) continue
    index.set(row.file, made)
    added++
  }
  return added
}

async function pool(jobs, worker) {
  let next = 0
  async function run() {
    while (next < jobs.length) {
      const index = next++
      await worker(jobs[index], index)
    }
  }
  const width = Math.min(CONCURRENCY, jobs.length)
  if (width === 0) return
  await Promise.all(Array.from({ length: width }, () => run()))
}

async function harvestSite(index) {
  const searches = [
    ...EMOJI_SEARCHES.map((term) => ({ term, source: /** @type {const} */ ("starter") })),
    ...FILL_SEARCHES.filter((term) => !EMOJI_SEARCHES.includes(term)).map((term) => ({
      term,
      source: /** @type {const} */ ("search"),
    })),
  ]
  await pool(searches, async ({ term, source }) => {
    try {
      const rows = await crawlPages(`${SITE}/emojis/${encodeURIComponent(term)}`, SEARCH_PAGE_CAP)
      const added = addRows(index, rows, source)
      console.log(`  search ${term}: ${rows.length} cards, ${added} new`)
    } catch (error) {
      console.warn(`  search ${term} failed: ${error instanceof Error ? error.message : error}`)
    }
  })

  /** @type {Set<string>} */
  const packUrls = new Set()
  await pool(PACK_SEARCHES, async (term) => {
    try {
      const htmls = []
      let url = `${SITE}/packs/${encodeURIComponent(term)}`
      const seen = new Set()
      for (let page = 0; page < PACK_LIST_PAGE_CAP && url && !seen.has(url); page++) {
        seen.add(url)
        const html = await getText(url)
        htmls.push(html)
        url = nextPage(html, url)
      }
      for (const html of htmls) {
        for (const href of html.matchAll(/https:\/\/emoji\.gg\/pack\/\d+-[^"'\s]+/g)) {
          packUrls.add(href[0])
        }
      }
    } catch (error) {
      console.warn(`  pack search ${term} failed: ${error instanceof Error ? error.message : error}`)
    }
  })

  const packs = [...packUrls].slice(0, PACK_CAP)
  console.log(`  packs: ${packUrls.size} found, fetching ${packs.length}`)
  await pool(packs, async (url) => {
    try {
      const html = await getText(url)
      const added = addRows(index, cardsFromHtml(html), "starter")
      console.log(`  pack ${url.split("/").pop()}: ${added} new`)
    } catch (error) {
      console.warn(`  pack ${url} failed: ${error instanceof Error ? error.message : error}`)
    }
  })
}

async function harvestApi(index) {
  const pages = await paginate((page) => (page === 1 ? API : `${API}?page=${page}`), emojiFingerprint)
  let added = 0
  for (const body of pages) {
    if (!Array.isArray(body)) continue
    for (const row of body) {
      const file = fileOf(String(row.image ?? ""))
      if (!file || index.has(file)) continue
      const made = entry(file, String(row.title ?? titleFromFile(file)), {
        source: "api",
        category: Number(row.category),
        faves: Number(row.faves) || 0,
      })
      if (!made) continue
      index.set(file, made)
      added++
    }
  }
  const packPages = await paginate(
    (page) => (page === 1 ? PACKS_API : `${PACKS_API}?page=${page}`),
    emojiFingerprint,
  )
  console.log(`  api: ${pages.length} emoji page(s), ${packPages.length} pack page(s), ${added} new emojis`)
}

export async function loadCatalog(refresh = false) {
  if (!refresh) {
    try {
      const cached = JSON.parse(await readFile(CACHE_PATH, "utf8"))
      if (Array.isArray(cached.emojis) && cached.emojis.length > 100) {
        console.log(`emoji.gg cache: ${cached.emojis.length} emojis`)
        return cached.emojis
      }
    } catch {
      // fetch below
    }
  }

  /** @type {Map<string, NonNullable<ReturnType<typeof entry>>>} */
  const index = new Map()
  console.log("emoji.gg harvest")
  await harvestSite(index)
  await harvestApi(index)
  const emojis = [...index.values()]
  await writeFile(CACHE_PATH, `${JSON.stringify({ fetchedAt: new Date().toISOString(), emojis })}\n`)
  const starter = emojis.filter((emoji) => emoji.source === "starter").length
  const search = emojis.filter((emoji) => emoji.source === "search").length
  console.log(`cached ${emojis.length} emojis (${starter} starter, ${search} search, ${emojis.length - starter - search} api)`)
  return emojis
}
