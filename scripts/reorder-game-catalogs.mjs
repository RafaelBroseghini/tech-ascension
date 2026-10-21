#!/usr/bin/env node
/**
 * Reorder gigs (by xpReq), jobs (by xpReq), and gear (by kind + unlock tier).
 * Renumbers ids 1..n and remaps GEAR_ICONS + events.ts gearIds.
 */
import { readFileSync, writeFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const PHASES = join(ROOT, "src/data/phases.ts")
const GEAR = join(ROOT, "src/data/gear.ts")
const EVENTS = join(ROOT, "src/data/events.ts")
const CLICK_ICONS = join(ROOT, "src/data/clickIcons.ts")

const GEAR_KIND_ORDER = ["desk", "lab", "storage", "cloud", "gpu", "rack", "orbit", "mars"]

function parseGigRows(src) {
  const block = src.match(/const GIG_ROWS[^[]*\[([\s\S]*?)\]\s*\n\n\/\*\* Each gig/)?.[1] ?? ""
  const re =
    /\{\s*id:\s*(\d+),\s*name:\s*"((?:\\.|[^"\\])*)",\s*xpReq:\s*(\d+),\s*lump:\s*(\d+),\s*retainerCps:\s*([\d.]+)\s*\}/g
  const rows = []
  let m
  while ((m = re.exec(block))) {
    rows.push({
      id: +m[1],
      name: m[2],
      xpReq: +m[3],
      lump: +m[4],
      retainerCps: +parseFloat(m[5]),
    })
  }
  return rows
}

function parseJobRows(src) {
  const block = src.match(/const JOB_ROWS[^[]*\[([\s\S]*?)\] as const/)?.[1] ?? ""
  const re = /\{\s*id:\s*(\d+),\s*name:\s*"((?:\\.|[^"\\])*)",\s*xpReq:\s*(\d+),\s*baseCost:\s*(\d+),\s*cps:\s*(\d+)\s*\}/g
  const rows = []
  let m
  while ((m = re.exec(block))) {
    rows.push({ id: +m[1], name: m[2], xpReq: +m[3], baseCost: +m[4], cps: +m[5] })
  }
  return rows
}

function parseGearRows(src) {
  const block = src.match(/const GEAR_ROWS[^[]*\[([\s\S]*?)\] as const/)?.[1] ?? ""
  const re =
    /\{\s*id:\s*(\d+),\s*kind:\s*"([^"]+)",\s*name:\s*"((?:\\.|[^"\\])*)",\s*baseCost:\s*(\d+),\s*clickBonus:\s*(\d+),\s*cps:\s*([\d.]+),\s*unlockMoney:\s*(\d+),\s*unlockJobRank:\s*(\d+)\s*\}/g
  const rows = []
  let m
  while ((m = re.exec(block))) {
    rows.push({
      id: +m[1],
      kind: m[2],
      name: m[3],
      baseCost: +m[4],
      clickBonus: +m[5],
      cps: +parseFloat(m[6]),
      unlockMoney: +m[7],
      unlockJobRank: +m[8],
    })
  }
  return rows
}

function formatGigRow(row) {
  return `  { id: ${row.id}, name: "${row.name}", xpReq: ${row.xpReq}, lump: ${row.lump}, retainerCps: ${row.retainerCps} },`
}

function formatJobRow(row) {
  return `  { id: ${row.id}, name: "${row.name}", xpReq: ${row.xpReq}, baseCost: ${row.baseCost}, cps: ${row.cps} },`
}

function formatGearRow(row) {
  return `  { id: ${row.id}, kind: "${row.kind}", name: "${row.name}", baseCost: ${row.baseCost}, clickBonus: ${row.clickBonus}, cps: ${row.cps}, unlockMoney: ${row.unlockMoney}, unlockJobRank: ${row.unlockJobRank} },`
}

function reorderGigs(rows) {
  const sorted = [...rows].sort((a, b) => a.xpReq - b.xpReq || a.id - b.id)
  return sorted.map((row, i) => ({ ...row, id: i + 1 }))
}

function reorderJobs(rows) {
  const sorted = [...rows].sort((a, b) => a.xpReq - b.xpReq || a.id - b.id)
  return sorted.map((row, i) => ({ ...row, id: i + 1 }))
}

function reorderGear(rows) {
  const sorted = [...rows].sort((a, b) => {
    const ka = GEAR_KIND_ORDER.indexOf(a.kind)
    const kb = GEAR_KIND_ORDER.indexOf(b.kind)
    if (ka !== kb) return ka - kb
    if (a.unlockMoney !== b.unlockMoney) return a.unlockMoney - b.unlockMoney
    if (a.unlockJobRank !== b.unlockJobRank) return a.unlockJobRank - b.unlockJobRank
    return a.baseCost - b.baseCost || a.id - b.id
  })
  return sorted.map((row, i) => ({ ...row, id: i + 1 }))
}

function remapGearIcons(oldToNew) {
  let src = readFileSync(CLICK_ICONS, "utf8")
  const body = src.match(/export const GEAR_ICONS[^=]*=\s*\{([\s\S]*?)\n\}/m)?.[1] ?? ""
  const entryRe = /\s*(\d+):\s*(\[[^\]]+\]),?\n/g
  const lines = []
  let m
  while ((m = entryRe.exec(body))) {
    const oldId = +m[1]
    const newId = oldToNew.get(oldId)
    if (newId) lines.push(`  ${newId}: ${m[2]},`)
  }
  lines.sort((a, b) => +a.match(/^\s*(\d+)/)[1] - +b.match(/^\s*(\d+)/)[1])
  const block = `export const GEAR_ICONS: Readonly<Record<number, readonly IconName[]>> = {\n${lines.join("\n")}\n}`
  src = src.replace(/export const GEAR_ICONS: Readonly<Record<number, readonly IconName\[\]>> = \{[\s\S]*?\n\}/, block)
  writeFileSync(CLICK_ICONS, src)
}

function remapGigIcons(oldToNew) {
  let src = readFileSync(CLICK_ICONS, "utf8")
  const body = src.match(/export const GIG_ICONS[^=]*=\s*\{([\s\S]*?)\n\}/m)?.[1] ?? ""
  const entryRe = /\s*(\d+):\s*(\[[^\]]+\]),?\n/g
  const lines = []
  let m
  while ((m = entryRe.exec(body))) {
    const newId = oldToNew.get(+m[1])
    if (newId) lines.push(`  ${newId}: ${m[2]},`)
  }
  lines.sort((a, b) => +a.match(/^\s*(\d+)/)[1] - +b.match(/^\s*(\d+)/)[1])
  const block = `export const GIG_ICONS: Readonly<Record<number, readonly IconName[]>> = {\n${lines.join("\n")}\n}`
  src = src.replace(/export const GIG_ICONS: Readonly<Record<number, readonly IconName\[\]>> = \{[\s\S]*?\n\}/, block)
  writeFileSync(CLICK_ICONS, src)
}

function remapJobIcons(oldToNew) {
  let src = readFileSync(CLICK_ICONS, "utf8")
  const body = src.match(/export const JOB_ICONS[^=]*=\s*\{([\s\S]*?)\n\}/m)?.[1] ?? ""
  const entryRe = /\s*(\d+):\s*(\[[^\]]+\]),?\n/g
  const lines = []
  let m
  while ((m = entryRe.exec(body))) {
    const newId = oldToNew.get(+m[1])
    if (newId) lines.push(`  ${newId}: ${m[2]},`)
  }
  lines.sort((a, b) => +a.match(/^\s*(\d+)/)[1] - +b.match(/^\s*(\d+)/)[1])
  const block = `export const JOB_ICONS: Readonly<Record<number, readonly IconName[]>> = {\n${lines.join("\n")}\n}`
  src = src.replace(/export const JOB_ICONS: Readonly<Record<number, readonly IconName\[\]>> = \{[\s\S]*?\n\}/, block)
  writeFileSync(CLICK_ICONS, src)
}

function remapEventGearIds(oldToNew) {
  let src = readFileSync(EVENTS, "utf8")
  src = src.replace(/gearIds:\s*\[([^\]]+)\]/g, (_, inner) => {
    const ids = inner.split(",").map((s) => {
      const n = +s.trim()
      return oldToNew.get(n) ?? n
    })
    return `gearIds: [${ids.join(", ")}]`
  })
  writeFileSync(EVENTS, src)
}

function main() {
  let phases = readFileSync(PHASES, "utf8")
  const gigs = reorderGigs(parseGigRows(phases))
  const gigOldToNew = new Map(parseGigRows(phases).map((row) => [row.id, gigs.find((g) => g.name === row.name)?.id]))
  const gigBlock = `const GIG_ROWS: readonly Omit<Gig, "priorGigs" | "skillIds">[] = [\n${gigs.map(formatGigRow).join("\n")}\n]`
  phases = phases.replace(/const GIG_ROWS: readonly Omit<Gig, "priorGigs" \| "skillIds">\[\] = \[[\s\S]*?\]\n/, `${gigBlock}\n`)
  writeFileSync(PHASES, phases)

  phases = readFileSync(PHASES, "utf8")
  const jobs = reorderJobs(parseJobRows(phases))
  const jobOldToNew = new Map(parseJobRows(phases).map((row) => [row.id, jobs.find((j) => j.name === row.name)?.id]))
  const jobBlock = `const JOB_ROWS: readonly JobTier[] = [\n${jobs.map(formatJobRow).join("\n")}\n] as const;`
  phases = phases.replace(/const JOB_ROWS: readonly JobTier\[\] = \[[\s\S]*?\] as const;/, jobBlock)
  writeFileSync(PHASES, phases)

  let gearSrc = readFileSync(GEAR, "utf8")
  const gearOld = parseGearRows(gearSrc)
  const gearNew = reorderGear(gearOld)
  const gearOldToNew = new Map(gearOld.map((row) => [row.id, gearNew.find((g) => g.name === row.name)?.id]))
  const gearBlock = `const GEAR_ROWS: readonly GearItem[] = [\n${gearNew.map(formatGearRow).join("\n")}\n] as const`
  gearSrc = gearSrc.replace(/const GEAR_ROWS: readonly GearItem\[\] = \[[\s\S]*?\] as const/, gearBlock)
  writeFileSync(GEAR, gearSrc)

  remapGearIcons(gearOldToNew)
  remapGigIcons(gigOldToNew)
  remapJobIcons(jobOldToNew)
  remapEventGearIds(gearOldToNew)

  console.log("Reordered gigs, jobs, gear; remapped icons and event gearIds.")
}

main()
