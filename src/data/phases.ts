/**
 * Catalogs v4: 104 skills, 65 gigs, 31 jobs (here), 110 gear (src/data/gear.ts), 25 capital (src/data/capital.ts).
 * Gates, payouts and ordering are the Researcher's table. Only brand names are swapped for the
 * repo's parody style (see the banned-brand test in logic.test.ts). Purchase prices (skill XP
 * costs and job base costs) are doubled once, in scalePurchaseCost; the literals below are unscaled.
 * Ids are unique and 1-based; nothing else in the code assumes how many rows a table has.
 * Gear lives in src/data/gear.ts and is re-exported below as EQUIPMENT.
 * Skill unlockAtXp in the raw rows is ignored: earlyGrind, scalePurchaseCost and the unlock chain recompute it.
 */
import { GIG_PATH } from "./tree.ts"
import { OPENING_XP_KNEE, OPENING_XP_SHARE, openingXp, scalePurchaseCost } from "./costs.ts"
import type { LeadId } from "./leadership.ts"
import { SPEC_ID_BASE, SPECIALIZATIONS, TRACK_FIRST_RANK } from "./specializations.ts"
import type { SpecId } from "./specializations.ts"
import type { Tag } from "./tags.ts"

export const COST_GROWTH = 1.15 as const;
export const GIG_BOARD_UNLOCK = { minXp: openingXp(14000), requireOwnedSkills: [15, 16] as const };
export const JOB_BOARD_UNLOCK = { minXp: openingXp(40000), minGigsCompleted: 6 } as const;
export const CAPITAL_UNLOCK = { minJobRank: 14, minMoney: 500000 } as const;
export const GEAR_TAB_UNLOCK = { minXp: openingXp(10000) } as const;

export { GEAR as EQUIPMENT } from "./gear.ts";
export type { GearItem as Equip } from "./gear.ts";

export type SkillTier = {
  id: number
  name: string
  tags: readonly Tag[]
  baseXpCost: number
  /** The first copy's price when it sits below the curve. Later copies follow `baseXpCost` as usual. */
  firstXpCost?: number
  xpPerClick: number
  xpPerSec: number
  unlockAtXp: number
};
const SKILL_ROWS: readonly SkillTier[] = [
  { id: 1, name: "Used laptop", tags: ["hardware"], baseXpCost: 10, xpPerClick: 1, xpPerSec: 0, unlockAtXp: 0 },
  { id: 2, name: "Stack Overblow lurker", tags: ["product"], baseXpCost: 12, xpPerClick: 0, xpPerSec: 0.1, unlockAtXp: 6 },
  { id: 3, name: "FreeCodeChamp streak", tags: ["product"], baseXpCost: 13, xpPerClick: 0, xpPerSec: 0.25, unlockAtXp: 12 },
  { id: 4, name: "YouToob CS nights", tags: ["product"], baseXpCost: 15, xpPerClick: 0, xpPerSec: 0.4, unlockAtXp: 21 },
  { id: 5, name: "Git + GitHug hygiene", tags: ["infra"], baseXpCost: 17, xpPerClick: 1, xpPerSec: 0.3, unlockAtXp: 33 },
  { id: 6, name: "Intro-CS lectures", tags: ["product"], baseXpCost: 20, xpPerClick: 0, xpPerSec: 0.6, unlockAtXp: 48 },
  { id: 7, name: "CS book nights", tags: ["product"], baseXpCost: 23, xpPerClick: 0, xpPerSec: 0.9, unlockAtXp: 72 },
  { id: 8, name: "Linux CLI basics", tags: ["infra"], baseXpCost: 27, xpPerClick: 0, xpPerSec: 0.8, unlockAtXp: 110 },
  { id: 9, name: "Package manager fluency", tags: ["backend", "infra"], baseXpCost: 31, xpPerClick: 0, xpPerSec: 1, unlockAtXp: 150 },
  { id: 10, name: "Web-docs deep reads", tags: ["frontend"], baseXpCost: 35, xpPerClick: 0, xpPerSec: 1, unlockAtXp: 132 },
  { id: 11, name: "Regex fluency", tags: ["backend", "data"], baseXpCost: 40, xpPerClick: 1, xpPerSec: 1.5, unlockAtXp: 280 },
  { id: 12, name: "Bash scripting habit", tags: ["infra"], baseXpCost: 47, xpPerClick: 0, xpPerSec: 1.2, unlockAtXp: 200 },
  { id: 13, name: "HTML/CSS landings", tags: ["frontend"], baseXpCost: 54, xpPerClick: 0, xpPerSec: 1.5, unlockAtXp: 180 },
  { id: 14, name: "JavaScript fundamentals", tags: ["frontend"], baseXpCost: 62, xpPerClick: 3, xpPerSec: 2, unlockAtXp: 240 },
  { id: 15, name: "Portfolio site live", tags: ["frontend", "product"], baseXpCost: 71, xpPerClick: 5, xpPerSec: 2, unlockAtXp: 780 },
  { id: 16, name: "React / one framework", tags: ["frontend"], baseXpCost: 81, xpPerClick: 0, xpPerSec: 4.5, unlockAtXp: 1020 },
  { id: 17, name: "TypeScript intro", tags: ["frontend", "backend"], baseXpCost: 94, xpPerClick: 2, xpPerSec: 1.8, unlockAtXp: 330 },
  { id: 18, name: "LeetCrate Easy reps", tags: ["product"], baseXpCost: 108, xpPerClick: 2, xpPerSec: 0.7, unlockAtXp: 96 },
  { id: 19, name: "First finished todo app", tags: ["frontend", "product"], baseXpCost: 124, xpPerClick: 0, xpPerSec: 3, unlockAtXp: 450 },
  { id: 20, name: "Deploy somewhere real", tags: ["infra"], baseXpCost: 142, xpPerClick: 0, xpPerSec: 2.5, unlockAtXp: 600 },
  { id: 21, name: "Lint + format discipline", tags: ["frontend"], baseXpCost: 164, xpPerClick: 0, xpPerSec: 2, unlockAtXp: 850 },
  { id: 22, name: "Bundler toolchain", tags: ["frontend"], baseXpCost: 188, xpPerClick: 0, xpPerSec: 2.2, unlockAtXp: 700 },
  { id: 23, name: "Utility CSS landings", tags: ["frontend"], baseXpCost: 216, xpPerClick: 0, xpPerSec: 2, unlockAtXp: 520 },
  { id: 24, name: "Design-mock for engineers", tags: ["frontend", "product"], baseXpCost: 249, xpPerClick: 0, xpPerSec: 2.5, unlockAtXp: 900 },
  { id: 25, name: "Node / Express basics", tags: ["backend"], baseXpCost: 286, xpPerClick: 0, xpPerSec: 5, unlockAtXp: 1320 },
  { id: 26, name: "SQL + basic backend", tags: ["backend", "data"], baseXpCost: 329, xpPerClick: 0, xpPerSec: 6, unlockAtXp: 1680 },
  { id: 27, name: "Auth (sessions/JWT)", tags: ["backend", "security"], baseXpCost: 379, xpPerClick: 0, xpPerSec: 5.5, unlockAtXp: 2160 },
  { id: 28, name: "Testing (unit/e2e starter)", tags: ["product"], baseXpCost: 435, xpPerClick: 0, xpPerSec: 5, unlockAtXp: 3360 },
  { id: 29, name: "Dockyard hello-world", tags: ["infra"], baseXpCost: 501, xpPerClick: 0, xpPerSec: 4, unlockAtXp: 4200 },
  { id: 30, name: "Python fundamentals", tags: ["backend", "data"], baseXpCost: 576, xpPerClick: 2, xpPerSec: 2.2, unlockAtXp: 380 },
  { id: 31, name: "Python API kit", tags: ["backend"], baseXpCost: 662, xpPerClick: 0, xpPerSec: 5.5, unlockAtXp: 2000 },
  { id: 32, name: "ORM fluency", tags: ["backend", "data"], baseXpCost: 761, xpPerClick: 0, xpPerSec: 5, unlockAtXp: 2500 },
  { id: 33, name: "API client drills", tags: ["backend", "frontend"], baseXpCost: 876, xpPerClick: 0, xpPerSec: 3.5, unlockAtXp: 3000 },
  { id: 34, name: "Typed API layer taste", tags: ["backend", "frontend"], baseXpCost: 1007, xpPerClick: 0, xpPerSec: 6, unlockAtXp: 22800 },
  { id: 35, name: "HTTP caching habit", tags: ["backend", "infra"], baseXpCost: 1158, xpPerClick: 0, xpPerSec: 3, unlockAtXp: 1100 },
  { id: 36, name: "Client cache layer", tags: ["frontend", "data"], baseXpCost: 1332, xpPerClick: 0, xpPerSec: 5.5, unlockAtXp: 5800 },
  { id: 37, name: "Cache layer intro", tags: ["backend", "data"], baseXpCost: 1532, xpPerClick: 0, xpPerSec: 6.5, unlockAtXp: 19800 },
  { id: 38, name: "Relational DB beyond CRUD", tags: ["data", "backend"], baseXpCost: 1761, xpPerClick: 0, xpPerSec: 7, unlockAtXp: 17400 },
  { id: 39, name: "Document DB model", tags: ["data"], baseXpCost: 2025, xpPerClick: 0, xpPerSec: 5, unlockAtXp: 4800 },
  { id: 40, name: "SQL ops basics", tags: ["data", "infra"], baseXpCost: 2329, xpPerClick: 0, xpPerSec: 5, unlockAtXp: 5000 },
  { id: 41, name: "BaaS backend kit", tags: ["backend", "product"], baseXpCost: 2679, xpPerClick: 0, xpPerSec: 6, unlockAtXp: 6500 },
  { id: 42, name: "Realtime backend taste", tags: ["backend"], baseXpCost: 3080, xpPerClick: 0, xpPerSec: 5.5, unlockAtXp: 6800 },
  { id: 43, name: "App-router framework", tags: ["frontend"], baseXpCost: 3542, xpPerClick: 0, xpPerSec: 4, unlockAtXp: 1180 },
  { id: 44, name: "Alt-framework dabble", tags: ["frontend"], baseXpCost: 4074, xpPerClick: 0, xpPerSec: 4, unlockAtXp: 2400 },
  { id: 45, name: "Static-site kit", tags: ["frontend"], baseXpCost: 4685, xpPerClick: 0, xpPerSec: 4, unlockAtXp: 3800 },
  { id: 46, name: "Alt-runtime experiment", tags: ["backend"], baseXpCost: 5388, xpPerClick: 0, xpPerSec: 4.5, unlockAtXp: 4000 },
  { id: 47, name: "Component docs kit", tags: ["frontend"], baseXpCost: 6196, xpPerClick: 0, xpPerSec: 4.5, unlockAtXp: 3100 },
  { id: 48, name: "Accessibility mindset (soft)", tags: ["frontend", "product"], baseXpCost: 7125, xpPerClick: 0, xpPerSec: 4, unlockAtXp: 7500 },
  { id: 49, name: "LeetCrate Medium patterns", tags: ["product"], baseXpCost: 8194, xpPerClick: 6, xpPerSec: 4, unlockAtXp: 2700 },
  { id: 50, name: "Algorithms notebook habit", tags: ["product", "data"], baseXpCost: 9423, xpPerClick: 5, xpPerSec: 6, unlockAtXp: 13200 },
  { id: 51, name: "LeetCrate Hard attempts", tags: ["product"], baseXpCost: 10837, xpPerClick: 10, xpPerSec: 4, unlockAtXp: 33000 },
  { id: 52, name: "Polished projects \u00d73", tags: ["product"], baseXpCost: 12462, xpPerClick: 0, xpPerSec: 9, unlockAtXp: 5100 },
  { id: 53, name: "Open-source first PR", tags: ["product"], baseXpCost: 14331, xpPerClick: 0, xpPerSec: 7, unlockAtXp: 11400 },
  { id: 54, name: "CI/CD pipeline toy", tags: ["infra"], baseXpCost: 16481, xpPerClick: 0, xpPerSec: 5.5, unlockAtXp: 15000 },
  { id: 55, name: "GitHug Actions taste", tags: ["infra"], baseXpCost: 18953, xpPerClick: 0, xpPerSec: 5.5, unlockAtXp: 14500 },
  { id: 56, name: "Pipeline craft", tags: ["infra", "data"], baseXpCost: 21796, xpPerClick: 0, xpPerSec: 5, unlockAtXp: 15500 },
  { id: 57, name: "Monorepo tooling", tags: ["infra", "frontend"], baseXpCost: 25066, xpPerClick: 0, xpPerSec: 6, unlockAtXp: 18000 },
  { id: 58, name: "Observability basics", tags: ["infra"], baseXpCost: 28826, xpPerClick: 0, xpPerSec: 5, unlockAtXp: 25800 },
  { id: 59, name: "Feature flag mental model", tags: ["infra", "product"], baseXpCost: 33149, xpPerClick: 0, xpPerSec: 5.5, unlockAtXp: 22000 },
  { id: 60, name: "Security hygiene", tags: ["security"], baseXpCost: 38122, xpPerClick: 3, xpPerSec: 5, unlockAtXp: 29400 },
  { id: 61, name: "Threat modeling habit (soft)", tags: ["security"], baseXpCost: 43840, xpPerClick: 0, xpPerSec: 5.5, unlockAtXp: 52000 },
  { id: 62, name: "System design lightweight", tags: ["backend", "infra"], baseXpCost: 50416, xpPerClick: 4, xpPerSec: 6, unlockAtXp: 6000 },
  { id: 63, name: "Design doc practice", tags: ["product"], baseXpCost: 57978, xpPerClick: 0, xpPerSec: 8, unlockAtXp: 37200 },
  { id: 64, name: "Architecture Decision Records", tags: ["product", "backend"], baseXpCost: 66675, xpPerClick: 0, xpPerSec: 8, unlockAtXp: 62000 },
  { id: 65, name: "Discourd / study group", tags: ["product"], baseXpCost: 76676, xpPerClick: 0, xpPerSec: 3.5, unlockAtXp: 7200 },
  { id: 66, name: "Practice problem sets", tags: ["product"], baseXpCost: 88178, xpPerClick: 8, xpPerSec: 5, unlockAtXp: 8400 },
  { id: 67, name: "AWS essentials", tags: ["infra"], baseXpCost: 116615, xpPerClick: 0, xpPerSec: 5, unlockAtXp: 8000 },
  { id: 68, name: "Azure essentials", tags: ["infra"], baseXpCost: 134108, xpPerClick: 0, xpPerSec: 6, unlockAtXp: 10000 },
  { id: 69, name: "GCP essentials", tags: ["infra"], baseXpCost: 154224, xpPerClick: 0, xpPerSec: 6.5, unlockAtXp: 12000 },
  { id: 70, name: "Cloud migration playbook", tags: ["infra"], baseXpCost: 177357, xpPerClick: 0, xpPerSec: 5.5, unlockAtXp: 11000 },
  { id: 71, name: "Learn Temporal", tags: ["backend", "infra"], baseXpCost: 203961, xpPerClick: 0, xpPerSec: 5.5, unlockAtXp: 17500 },
  { id: 72, name: "Infra-as-code intro", tags: ["infra"], baseXpCost: 234555, xpPerClick: 0, xpPerSec: 6, unlockAtXp: 10000 },
  { id: 73, name: "Cluster kubectl 101", tags: ["infra"], baseXpCost: 269738, xpPerClick: 0, xpPerSec: 6.5, unlockAtXp: 12000 },
  { id: 74, name: "Config-mgmt playbooks", tags: ["infra"], baseXpCost: 310199, xpPerClick: 0, xpPerSec: 5.5, unlockAtXp: 11000 },
  { id: 75, name: "Edge Workers edge", tags: ["infra", "frontend"], baseXpCost: 356729, xpPerClick: 0, xpPerSec: 5.5, unlockAtXp: 17500 },
  { id: 76, name: "Event-stream intro", tags: ["data", "backend"], baseXpCost: 410238, xpPerClick: 0, xpPerSec: 6, unlockAtXp: 18500 },
  { id: 77, name: "Go concurrency intro", tags: ["backend"], baseXpCost: 471774, xpPerClick: 0, xpPerSec: 7, unlockAtXp: 14000 },
  { id: 78, name: "Rust ownership toy", tags: ["backend", "hardware"], baseXpCost: 542540, xpPerClick: 0, xpPerSec: 6.5, unlockAtXp: 16000 },
  { id: 79, name: "WebAssembly toy", tags: ["frontend", "backend"], baseXpCost: 623921, xpPerClick: 0, xpPerSec: 6, unlockAtXp: 45000 },
  { id: 80, name: "Mobile app dabble", tags: ["frontend"], baseXpCost: 717509, xpPerClick: 0, xpPerSec: 5.5, unlockAtXp: 21000 },
  { id: 81, name: "Desktop shell toy", tags: ["frontend"], baseXpCost: 825135, xpPerClick: 0, xpPerSec: 5, unlockAtXp: 20000 },
  { id: 82, name: "Multi-region design notes", tags: ["infra"], baseXpCost: 948905, xpPerClick: 5, xpPerSec: 9, unlockAtXp: 80000 },
  { id: 83, name: "Capacity planning notes", tags: ["infra"], baseXpCost: 1091241, xpPerClick: 0, xpPerSec: 7.5, unlockAtXp: 72000 },
  { id: 84, name: "SRE runbook writing (soft)", tags: ["infra"], baseXpCost: 1254927, xpPerClick: 0, xpPerSec: 6.5, unlockAtXp: 48000 },
  { id: 85, name: "Incident commander drills (soft)", tags: ["infra", "product"], baseXpCost: 1443166, xpPerClick: 0, xpPerSec: 7, unlockAtXp: 56000 },
  { id: 86, name: "Production war-story journal", tags: ["infra", "product"], baseXpCost: 1659641, xpPerClick: 0, xpPerSec: 8, unlockAtXp: 138000 },
  { id: 87, name: "Distributed systems notes", tags: ["backend", "infra"], baseXpCost: 1908588, xpPerClick: 5, xpPerSec: 8, unlockAtXp: 66000 },
  { id: 88, name: "RFCs you actually read", tags: ["backend", "product"], baseXpCost: 2194876, xpPerClick: 0, xpPerSec: 6, unlockAtXp: 120000 },
  { id: 89, name: "Public tech blog posts", tags: ["product"], baseXpCost: 2524107, xpPerClick: 0, xpPerSec: 6, unlockAtXp: 42000 },
  { id: 90, name: "Conference talk draft", tags: ["product"], baseXpCost: 2902723, xpPerClick: 0, xpPerSec: 5, unlockAtXp: 46800 },
  { id: 91, name: "Public speaking reps (soft)", tags: ["product"], baseXpCost: 3338132, xpPerClick: 0, xpPerSec: 6, unlockAtXp: 64000 },
  { id: 92, name: "Mentoring juniors (soft)", tags: ["product"], baseXpCost: 3838852, xpPerClick: 0, xpPerSec: 7, unlockAtXp: 52800 },
  { id: 93, name: "Negotiation / scope soft", tags: ["product"], baseXpCost: 4414679, xpPerClick: 0, xpPerSec: 5, unlockAtXp: 54000 },
  { id: 94, name: "Staff-level reading list", tags: ["product"], baseXpCost: 5076881, xpPerClick: 0, xpPerSec: 9, unlockAtXp: 58800 },
  { id: 95, name: "Principal study club", tags: ["product"], baseXpCost: 5838413, xpPerClick: 0, xpPerSec: 12, unlockAtXp: 156000 },
  { id: 96, name: "Teaching a workshop", tags: ["product"], baseXpCost: 6714175, xpPerClick: 15, xpPerSec: 10, unlockAtXp: 180000 },
  { id: 97, name: "Prompt engineering habit", tags: ["ai"], baseXpCost: 7721302, xpPerClick: 4, xpPerSec: 6, unlockAtXp: 24000 },
  { id: 98, name: "AI-IDE workflow", tags: ["ai", "product"], baseXpCost: 8879497, xpPerClick: 0, xpPerSec: 7, unlockAtXp: 25500 },
  { id: 99, name: "LLM pairing habit", tags: ["ai"], baseXpCost: 10211421, xpPerClick: 0, xpPerSec: 6.5, unlockAtXp: 27000 },
  { id: 100, name: "CUDA / GPU programming 101", tags: ["ai", "hardware"], baseXpCost: 11743135, xpPerClick: 0, xpPerSec: 8, unlockAtXp: 96000 },
  { id: 101, name: "Chip architecture reading", tags: ["hardware"], baseXpCost: 13504605, xpPerClick: 0, xpPerSec: 8, unlockAtXp: 100000 },
  { id: 102, name: "Contracts dabble", tags: ["product"], baseXpCost: 15530295, xpPerClick: 0, xpPerSec: 5, unlockAtXp: 50000 },
  { id: 103, name: "Fine-tune toy LLM", tags: ["ai", "data"], baseXpCost: 17859840, xpPerClick: 0, xpPerSec: 10, unlockAtXp: 84000 },
  { id: 104, name: "Mars ops systems study", tags: ["hardware", "infra"], baseXpCost: 20538816, xpPerClick: 10, xpPerSec: 14, unlockAtXp: 200000 },
] as const;

/**
 * Opening skills cost many more clicks than the raw table, and the next one stays
 * locked until lifetime XP has climbed past this purchase. The tax eases to 1 by skill 12.
 */
function earlyGrind(id: number): number {
  if (id >= 12) return 1
  const t = (id - 1) / 11
  return 4 * (1 / 4) ** t
}

/**
 * The used laptop's first copy is cheap: about 45 seconds of clicking. It opens the editor, which shows the loop
 * (click, learn, unlock) before the grind starts. Its later copies and every skill gate after it keep the grind
 * price, so only the first minute gets faster.
 */
export const FIRST_SKILL_XP = 90

let nextSkillUnlockAt = 0
export const SKILL_TIERS: readonly SkillTier[] = SKILL_ROWS.map((row, index) => {
  const ordinal = index + 1
  const baseXpCost = Math.ceil(scalePurchaseCost(row.baseXpCost) * earlyGrind(ordinal))
  const unlockAtXp = ordinal === 1 ? 0 : Math.ceil(nextSkillUnlockAt)
  nextSkillUnlockAt = unlockAtXp + baseXpCost * 1.65
  return {
    ...row,
    ...(ordinal === 1 ? { firstXpCost: FIRST_SKILL_XP } : {}),
    baseXpCost,
    unlockAtXp,
    xpPerSec: ordinal <= 8 ? row.xpPerSec * 1 : row.xpPerSec,
  }
})

export type Gig = {
  id: number
  name: string
  tags: readonly Tag[]
  xpReq: number
  /** The owned skills of each of the gig's tags it demands, read off `GIG_PATH` (src/data/tree.ts) before the build's bonuses. */
  needs: readonly { tag: Tag; min: number }[]
  lump: number
  retainerCps: number
}

const GIG_ROWS: readonly Omit<Gig, "needs">[] = [
  { id: 1, name: "Fix broken login / blog-engine bug", tags: ["backend", "frontend"], xpReq: 12000, lump: 40, retainerCps: 0 },
  { id: 2, name: "Local biz landing page", tags: ["frontend", "product"], xpReq: 13500, lump: 120, retainerCps: 0 },
  { id: 3, name: "Design-mock-to-HTML slice", tags: ["frontend"], xpReq: 14500, lump: 90, retainerCps: 0 },
  { id: 4, name: "Upwerk CRUD admin panel", tags: ["backend", "frontend"], xpReq: 16000, lump: 350, retainerCps: 0 },
  { id: 5, name: "Bugfix API endpoint", tags: ["backend"], xpReq: 17500, lump: 200, retainerCps: 0 },
  { id: 6, name: "Blog-engine plugin tweak", tags: ["backend", "frontend"], xpReq: 18500, lump: 150, retainerCps: 0 },
  { id: 7, name: "Email template coding", tags: ["frontend", "product"], xpReq: 19500, lump: 110, retainerCps: 0 },
  { id: 8, name: "Site maintenance retainer", tags: ["frontend", "product"], xpReq: 21000, lump: 100, retainerCps: 2 },
  { id: 9, name: "Storefront theme tweak", tags: ["frontend", "product"], xpReq: 22000, lump: 280, retainerCps: 0 },
  { id: 10, name: "Tech blog / content gig", tags: ["product"], xpReq: 23500, lump: 180, retainerCps: 0.5 },
  { id: 11, name: "Browser extension fix", tags: ["frontend"], xpReq: 25000, lump: 320, retainerCps: 0 },
  { id: 12, name: "Second client (testimonial)", tags: ["product"], xpReq: 26500, lump: 500, retainerCps: 1 },
  { id: 13, name: "Internal tool for SMB", tags: ["backend", "frontend"], xpReq: 28000, lump: 700, retainerCps: 0 },
  { id: 14, name: "API integration (payments-ish)", tags: ["backend", "product"], xpReq: 30000, lump: 900, retainerCps: 0 },
  { id: 15, name: "Performance audit", tags: ["frontend", "infra"], xpReq: 32000, lump: 600, retainerCps: 0 },
  { id: 16, name: "Accessibility pass", tags: ["frontend"], xpReq: 34000, lump: 450, retainerCps: 0 },
  { id: 17, name: "Small SaaS feature contract", tags: ["product", "backend"], xpReq: 36000, lump: 1200, retainerCps: 3 },
  { id: 18, name: "Data cleanup script", tags: ["data"], xpReq: 38000, lump: 400, retainerCps: 0 },
  { id: 19, name: "CI setup for client", tags: ["infra"], xpReq: 40000, lump: 550, retainerCps: 0 },
  { id: 20, name: "Mobile-responsive rescue", tags: ["frontend"], xpReq: 42000, lump: 380, retainerCps: 0 },
  { id: 21, name: "Hosted-auth integration", tags: ["security", "backend"], xpReq: 45000, lump: 1100, retainerCps: 0 },
  { id: 22, name: "Status page + runbook pack", tags: ["infra"], xpReq: 47000, lump: 650, retainerCps: 0 },
  { id: 23, name: "Retainer: 2nd site", tags: ["frontend", "product"], xpReq: 48000, lump: 200, retainerCps: 3.5 },
  { id: 24, name: "Dashboard MVP", tags: ["frontend", "data"], xpReq: 52000, lump: 2000, retainerCps: 0 },
  { id: 25, name: "Webhook reliability fix", tags: ["backend"], xpReq: 55000, lump: 800, retainerCps: 0 },
  { id: 26, name: "Migration script (CSV\u2192DB)", tags: ["data", "backend"], xpReq: 58000, lump: 950, retainerCps: 0 },
  { id: 27, name: "Chatbot FAQ wrapper", tags: ["ai", "product"], xpReq: 62000, lump: 1500, retainerCps: 0 },
  { id: 28, name: "SEO landing pack", tags: ["frontend", "product"], xpReq: 65000, lump: 700, retainerCps: 1 },
  { id: 29, name: "API-spec docs cleanup", tags: ["backend", "product"], xpReq: 68000, lump: 500, retainerCps: 0 },
  { id: 30, name: "CSV\u2192warehouse loader", tags: ["data"], xpReq: 70000, lump: 1400, retainerCps: 0 },
  { id: 31, name: "Load test + report", tags: ["infra", "backend"], xpReq: 72000, lump: 1200, retainerCps: 0 },
  { id: 32, name: "Multi-tenant bug hunt", tags: ["backend", "security"], xpReq: 76000, lump: 1800, retainerCps: 0 },
  { id: 33, name: "Retainer: product squad", tags: ["product"], xpReq: 80000, lump: 400, retainerCps: 8 },
  { id: 34, name: "Mobile-app hotfix", tags: ["frontend"], xpReq: 85000, lump: 1400, retainerCps: 0 },
  { id: 35, name: "Email deliverability fix", tags: ["infra", "backend"], xpReq: 88000, lump: 1700, retainerCps: 0 },
  { id: 36, name: "Typed-API schema rescue", tags: ["backend", "frontend"], xpReq: 90000, lump: 1600, retainerCps: 0 },
  { id: 37, name: "Billing edge-case fix", tags: ["backend", "product"], xpReq: 95000, lump: 2200, retainerCps: 0 },
  { id: 38, name: "Compliance evidence scripts", tags: ["security"], xpReq: 100000, lump: 3000, retainerCps: 0 },
  { id: 39, name: "Design-token extract", tags: ["frontend"], xpReq: 105000, lump: 2400, retainerCps: 0 },
  { id: 40, name: "Customer onboarding wizard", tags: ["frontend", "product"], xpReq: 110000, lump: 2500, retainerCps: 2 },
  { id: 41, name: "Feature flag rollout", tags: ["infra", "product"], xpReq: 120000, lump: 2100, retainerCps: 0 },
  { id: 42, name: "Observability dashboards", tags: ["infra", "data"], xpReq: 130000, lump: 2800, retainerCps: 0 },
  { id: 43, name: "ML inference wrapper API", tags: ["ai", "backend"], xpReq: 140000, lump: 4000, retainerCps: 0 },
  { id: 44, name: "Cluster deploy for SMB", tags: ["infra"], xpReq: 145000, lump: 4200, retainerCps: 0 },
  { id: 45, name: "Contract: 3-month build", tags: ["product", "backend"], xpReq: 150000, lump: 8000, retainerCps: 15 },
  { id: 46, name: "Agency white-label sprint", tags: ["frontend", "product"], xpReq: 165000, lump: 6000, retainerCps: 5 },
  { id: 47, name: "Edge Workers rewrite", tags: ["infra", "frontend"], xpReq: 175000, lump: 5000, retainerCps: 0 },
  { id: 48, name: "Enterprise RFP prototype", tags: ["product"], xpReq: 180000, lump: 10000, retainerCps: 0 },
  { id: 49, name: "Infra-as-code land-and-expand", tags: ["infra"], xpReq: 190000, lump: 6500, retainerCps: 0 },
  { id: 50, name: "Data pipeline gig", tags: ["data"], xpReq: 200000, lump: 7000, retainerCps: 0 },
  { id: 51, name: "Security pentest remediation", tags: ["security"], xpReq: 220000, lump: 9000, retainerCps: 0 },
  { id: 52, name: "GPU inference cost cut", tags: ["ai", "hardware"], xpReq: 230000, lump: 11000, retainerCps: 0 },
  { id: 53, name: "Design system extract", tags: ["frontend"], xpReq: 240000, lump: 5500, retainerCps: 0 },
  { id: 54, name: "LLM eval harness contract", tags: ["ai"], xpReq: 260000, lump: 12000, retainerCps: 0 },
  { id: 55, name: "Multi-cloud DR drill", tags: ["infra"], xpReq: 280000, lump: 14000, retainerCps: 0 },
  { id: 56, name: "Platform migration lead", tags: ["infra", "backend"], xpReq: 300000, lump: 20000, retainerCps: 25 },
  { id: 57, name: "SaaS acquisition diligence", tags: ["product", "security"], xpReq: 320000, lump: 22000, retainerCps: 0 },
  { id: 58, name: "Staff-aug 6-week embed", tags: ["product"], xpReq: 350000, lump: 35000, retainerCps: 40 },
  { id: 59, name: "Chip IP integration spike", tags: ["hardware"], xpReq: 380000, lump: 28000, retainerCps: 0 },
  { id: 60, name: "Fractional CTO weekend", tags: ["product"], xpReq: 400000, lump: 15000, retainerCps: 10 },
  { id: 61, name: "Exit gig: handoff docs", tags: ["product"], xpReq: 450000, lump: 5000, retainerCps: 0 },
  { id: 62, name: "Orbital uplink software", tags: ["hardware", "infra"], xpReq: 500000, lump: 40000, retainerCps: 20 },
  { id: 63, name: "Mars habitat firmware", tags: ["hardware"], xpReq: 650000, lump: 60000, retainerCps: 0 },
  { id: 64, name: "Colony mesh networking", tags: ["infra", "hardware"], xpReq: 800000, lump: 90000, retainerCps: 30 },
  { id: 65, name: "Legacy empire handoff", tags: ["product"], xpReq: 1000000, lump: 50000, retainerCps: 0 },
]

/** The gigs, each with the skills it demands read from `GIG_PATH` (src/data/tree.ts), where the counts are written. */
export const GIGS: readonly Gig[] = GIG_ROWS.map((row) => {
  const step = GIG_PATH.find((entry) => entry.id === row.id)
  if (!step) throw new Error(`gig ${row.id} is not on the gig path (src/data/tree.ts)`)
  return { ...row, xpReq: openingXp(row.xpReq), needs: step.needs }
})

/**
 * `clickBonus` adds flat dollars to every click. `clickPct` adds that percent of your idle $/s to every click, so
 * clicking keeps pace with salaries and capital all the way up. `xpPerSec` is idle XP from learning on the job and
 * `xpLump` is XP paid once, the moment you take it (onboarding, a course, a rotation). Only the roles that are about
 * learning, teaching or research grant either, so the XP gates behind the jobs do not rest on the skill grind alone.
 */
export type JobTier = {
  id: number
  /** Place on the job ladder. Gates compare ranks, never ids; trunk and specialization rows at the same height share a rank. */
  rank: number
  /** The specialization whose track this row belongs to. Left out on the shared trunk (ranks 1 to 7) and leadership rows (16 to 31). */
  spec?: SpecId
  /** The leadership line this row belongs to (ranks 16 to 24). Left out on the rows every line shares. */
  lead?: LeadId
  name: string
  tags: readonly Tag[]
  xpReq: number
  /** Spendable XP to take the job; 0 for the free internship. Derived from `xpReq` in JOB_TIERS. */
  xpCost: number
  cps: number
  clickBonus: number
  clickPct: number
  xpPerSec: number
  xpLump: number
};
const JOB_ROWS: readonly (Omit<JobTier, "xpPerSec" | "xpLump" | "xpCost"> & { baseCost: number; xpPerSec?: number; xpLump?: number })[] = [
  { id: 1, rank: 1, name: "Internship offer", tags: ["product"], xpReq: 35000, baseCost: 0, cps: 8, clickBonus: 2, clickPct: 1, xpPerSec: 6, xpLump: 1500 },
  { id: 2, rank: 2, name: "Junior SWE", tags: ["product"], xpReq: 45000, baseCost: 500, cps: 25, clickBonus: 4, clickPct: 1, xpPerSec: 8 },
  { id: 3, rank: 3, name: "Junior + mentor buddy", tags: ["product"], xpReq: 50000, baseCost: 800, cps: 30, clickBonus: 4, clickPct: 1, xpPerSec: 12, xpLump: 2500 },
  { id: 4, rank: 4, name: "Code review skills", tags: ["product"], xpReq: 55000, baseCost: 2000, cps: 15, clickBonus: 6, clickPct: 1.5, xpPerSec: 14, xpLump: 3500 },
  { id: 5, rank: 5, name: "QA rotation", tags: ["product"], xpReq: 60000, baseCost: 1500, cps: 20, clickBonus: 4, clickPct: 1, xpLump: 3000 },
  { id: 6, rank: 6, name: "On-call rotation", tags: ["infra"], xpReq: 70000, baseCost: 8000, cps: 40, clickBonus: 6, clickPct: 1, xpPerSec: 10, xpLump: 5000 },
  { id: 7, rank: 7, name: "Mid-level SWE", tags: ["product"], xpReq: 90000, baseCost: 25000, cps: 80, clickBonus: 10, clickPct: 1.5 },
  { id: 8, rank: 8, spec: "backend", name: "Feature owner", tags: ["product"], xpReq: 100000, baseCost: 40000, cps: 100, clickBonus: 12, clickPct: 1.5 },
  { id: 9, rank: 9, spec: "backend", name: "System design study", tags: ["backend", "infra"], xpReq: 110000, baseCost: 50000, cps: 30, clickBonus: 15, clickPct: 2, xpPerSec: 18, xpLump: 8000 },
  { id: 10, rank: 10, spec: "backend", name: "Backend specialist", tags: ["backend"], xpReq: 120000, baseCost: 60000, cps: 120, clickBonus: 15, clickPct: 1.5 },
  { id: 11, rank: 11, spec: "backend", name: "API owner", tags: ["backend"], xpReq: 120000, baseCost: 55000, cps: 110, clickBonus: 15, clickPct: 1.5 },
  { id: 12, rank: 12, spec: "backend", name: "Platform engineer", tags: ["backend", "infra"], xpReq: 130000, baseCost: 70000, cps: 130, clickBonus: 18, clickPct: 1.5 },
  { id: 13, rank: 13, spec: "backend", name: "Tech lead (acting)", tags: ["product"], xpReq: 150000, baseCost: 100000, cps: 160, clickBonus: 20, clickPct: 2, xpLump: 8000 },
  { id: 14, rank: 14, spec: "backend", name: "Senior SWE", tags: ["product"], xpReq: 160000, baseCost: 120000, cps: 200, clickBonus: 25, clickPct: 2 },
  { id: 15, rank: 15, spec: "backend", name: "Senior + hiring loop", tags: ["product"], xpReq: 180000, baseCost: 150000, cps: 220, clickBonus: 25, clickPct: 2 },
  { id: 16, rank: 16, lead: "ic", name: "Staff engineer", tags: ["product"], xpReq: 220000, baseCost: 400000, cps: 500, clickBonus: 50, clickPct: 2, xpPerSec: 20, xpLump: 12000 },
  { id: 17, rank: 17, lead: "ic", name: "Staff platform", tags: ["infra", "backend"], xpReq: 250000, baseCost: 500000, cps: 550, clickBonus: 50, clickPct: 2 },
  { id: 18, rank: 18, lead: "manager", name: "Engineering manager", tags: ["product"], xpReq: 280000, baseCost: 700000, cps: 450, clickBonus: 60, clickPct: 2.5 },
  { id: 19, rank: 19, lead: "ic", name: "Principal engineer", tags: ["product"], xpReq: 300000, baseCost: 900000, cps: 800, clickBonus: 80, clickPct: 2.5, xpPerSec: 30, xpLump: 20000 },
  { id: 20, rank: 20, lead: "manager", name: "Director of Eng", tags: ["product"], xpReq: 350000, baseCost: 1500000, cps: 900, clickBonus: 100, clickPct: 2.5 },
  { id: 21, rank: 21, lead: "manager", name: "VP Engineering", tags: ["product"], xpReq: 450000, baseCost: 4000000, cps: 1500, clickBonus: 150, clickPct: 2.5 },
  { id: 22, rank: 22, lead: "manager", name: "CTO (startup)", tags: ["product"], xpReq: 500000, baseCost: 8000000, cps: 2000, clickBonus: 200, clickPct: 3 },
  { id: 23, rank: 23, lead: "ic", name: "Distinguished engineer", tags: ["product"], xpReq: 600000, baseCost: 12000000, cps: 2500, clickBonus: 250, clickPct: 3, xpPerSec: 40 },
  { id: 24, rank: 24, lead: "ic", name: "Fellow / industry voice", tags: ["product"], xpReq: 750000, baseCost: 25000000, cps: 4000, clickBonus: 400, clickPct: 3, xpPerSec: 50, xpLump: 50000 },
  { id: 25, rank: 25, name: "Board advisor (tech)", tags: ["product"], xpReq: 900000, baseCost: 50000000, cps: 5000, clickBonus: 500, clickPct: 3 },
  { id: 26, rank: 26, name: "Fractional executive", tags: ["product"], xpReq: 1000000, baseCost: 80000000, cps: 6000, clickBonus: 600, clickPct: 3 },
  { id: 27, rank: 27, name: "Partner at BigCo", tags: ["product"], xpReq: 1200000, baseCost: 150000000, cps: 10000, clickBonus: 1000, clickPct: 3 },
  { id: 28, rank: 28, name: "Chief Scientist", tags: ["ai", "data"], xpReq: 1400000, baseCost: 300000000, cps: 15000, clickBonus: 1500, clickPct: 3, xpPerSec: 60 },
  { id: 29, rank: 29, name: "Lab director", tags: ["ai", "hardware"], xpReq: 1600000, baseCost: 500000000, cps: 20000, clickBonus: 2000, clickPct: 3, xpPerSec: 70, xpLump: 100000 },
  { id: 30, rank: 30, name: "Empire operator", tags: ["product", "infra"], xpReq: 2000000, baseCost: 1000000000, cps: 35000, clickBonus: 3500, clickPct: 4 },
  { id: 31, rank: 31, name: "Sovereign tech chair", tags: ["product"], xpReq: 2500000, baseCost: 5000000000, cps: 80000, clickBonus: 8000, clickPct: 4 },
] as const;

/** A job costs a quarter of the lifetime XP it asks for, before the purchase scale; the dollar column above only orders the rows. */
const JOB_XP_COST_SHARE = 0.25

type JobRow = (typeof JOB_ROWS)[number]

/**
 * The other five tracks, one entry per rank from 8 to 15. A track row has the same pay, price, XP and click numbers as
 * the backend row at its rank (so every track paces like the plain ladder); only the name and tags are its own.
 * Rank 14 reads as Senior in every track.
 */
const TRACK_ROWS: Readonly<Record<Exclude<SpecId, "backend">, readonly { name: string; tags: readonly Tag[] }[]>> = {
  frontend: [
    { name: "Component librarian", tags: ["frontend"] },
    { name: "Browser internals study", tags: ["frontend"] },
    { name: "Design-system owner", tags: ["frontend"] },
    { name: "Frontend specialist", tags: ["frontend"] },
    { name: "Core Web Vitals whisperer", tags: ["frontend", "product"] },
    { name: "UI lead (acting)", tags: ["frontend", "product"] },
    { name: "Senior frontend engineer", tags: ["frontend", "product"] },
    { name: "Senior frontend + hiring loop", tags: ["frontend", "product"] },
  ],
  infra: [
    { name: "On-call primary", tags: ["infra"] },
    { name: "Postmortem study group", tags: ["infra"] },
    { name: "Runbook librarian", tags: ["infra"] },
    { name: "Capacity planner", tags: ["infra"] },
    { name: "Chaos engineer", tags: ["infra"] },
    { name: "SRE lead (acting)", tags: ["infra", "product"] },
    { name: "Senior SRE", tags: ["infra", "product"] },
    { name: "Senior SRE + hiring loop", tags: ["infra", "product"] },
  ],
  ai: [
    { name: "Prompt engineer", tags: ["ai"] },
    { name: "Model internals study", tags: ["ai", "data"] },
    { name: "RAG plumber", tags: ["ai", "data"] },
    { name: "Evals wrangler", tags: ["ai"] },
    { name: "Agent wrangler", tags: ["ai"] },
    { name: "Head of AI (acting)", tags: ["ai", "product"] },
    { name: "Senior AI engineer", tags: ["ai", "product"] },
    { name: "Senior AI + hiring loop", tags: ["ai", "product"] },
  ],
  fde: [
    { name: "Embedded at a client", tags: ["product"] },
    { name: "Customer discovery study", tags: ["product"] },
    { name: "Solutions engineer", tags: ["product"] },
    { name: "Solutions architect", tags: ["product"] },
    { name: "Deployment strategist", tags: ["product"] },
    { name: "Engagement lead (acting)", tags: ["product"] },
    { name: "Senior forward deployed engineer", tags: ["product"] },
    { name: "Senior FDE + hiring loop", tags: ["product"] },
  ],
  security: [
    { name: "AppSec reviewer", tags: ["security"] },
    { name: "Threat modeling study", tags: ["security"] },
    { name: "Security specialist", tags: ["security"] },
    { name: "Compliance wrangler", tags: ["security"] },
    { name: "Red-team lead", tags: ["security"] },
    { name: "CISO (acting)", tags: ["security", "product"] },
    { name: "Senior security engineer", tags: ["security", "product"] },
    { name: "Senior security + hiring loop", tags: ["security", "product"] },
  ],
}

const trackRowsOf = (spec: Exclude<SpecId, "backend">): JobRow[] =>
  TRACK_ROWS[spec].map((entry, index) => {
    const base = JOB_ROWS.find((row) => row.rank === TRACK_FIRST_RANK + index)
    if (!base) throw new Error(`no backend row at rank ${TRACK_FIRST_RANK + index}`)
    return { ...base, id: SPEC_ID_BASE[spec] + base.rank, spec, name: entry.name, tags: entry.tags }
  })

/** Every row in the game: the trunk, the shared leadership rows and all six tracks. Ids ascend, so the table is ordered by id. */
const ALL_JOB_ROWS: readonly JobRow[] = [
  ...JOB_ROWS,
  ...SPECIALIZATIONS.filter((row) => row.id !== "backend").flatMap((row) => trackRowsOf(row.id as Exclude<SpecId, "backend">)),
].sort((a, b) => a.id - b.id)

export const JOB_TIERS: readonly JobTier[] = ALL_JOB_ROWS.map(({ baseCost, ...row }) => ({
  ...row,
  xpReq: openingXp(row.xpReq),
  xpCost: baseCost > 0 ? Math.round(scalePurchaseCost(openingXp(row.xpReq) * JOB_XP_COST_SHARE)) : 0,
  xpPerSec: row.xpPerSec ?? 0,
  // A lump closes the gap to the next gate, so it shrinks with the gates it sits under.
  xpLump: row.xpReq <= OPENING_XP_KNEE ? Math.round((row.xpLump ?? 0) * OPENING_XP_SHARE) : (row.xpLump ?? 0),
}))

const JOB_RANK_BY_ID = new Map<number, number>(JOB_TIERS.map((row) => [row.id, row.rank]))

/** A job's place on the ladder; 0 for an id that is not a job. Gates compare ranks, never ids. */
export const jobRank = (id: number): number => JOB_RANK_BY_ID.get(id) ?? 0

/** The first job row at a rank (the trunk or backend row, before any other track's), for copy that names a gate. */
export const firstJobAtRank = (rank: number): JobTier | undefined => JOB_TIERS.find((row) => row.rank === rank)

/** Highest rank among the jobs held; 0 with none. */
export function highestJobRank(jobs: readonly number[]): number {
  let highest = 0
  for (const id of jobs) highest = Math.max(highest, jobRank(id))
  return highest
}

const VISIBLE_CACHE = new Map<string, readonly JobTier[]>()

/**
 * The jobs a career can see, in rank order: the trunk, its own specialization's track, its own leadership line's rows
 * and the rows every line shares. With no specialization picked yet, no track; with no leadership picked yet, none of
 * the line rows (ranks 16 to 24), so a career that has not picked sees the rows it could hold now. Other tracks' and
 * the other line's rows are never part of a career.
 */
export function visibleJobs(spec: SpecId | null, lead: LeadId | null = null): readonly JobTier[] {
  const key = `${spec ?? "none"}|${lead ?? "none"}`
  let rows = VISIBLE_CACHE.get(key)
  if (!rows) {
    rows = JOB_TIERS.filter((row) => (row.spec === undefined || row.spec === spec) && (row.lead === undefined || row.lead === lead)).sort((a, b) => a.rank - b.rank)
    VISIBLE_CACHE.set(key, rows)
  }
  return rows
}

/** Balatro pops: big on gig/unlock; medium on click. */
export const MONEY_POP = { click: "medium", gigClear: "large", unlock: "large" } as const;

export const BASE_XP_PER_CLICK = 1;
