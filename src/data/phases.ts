/**
 * Catalogs v4: 105 skills, 65 gigs, 31 jobs (here), 110 gear (src/data/gear.ts), 25 capital (src/data/capital.ts).
 * Gates, payouts and ordering are the Researcher's table. Only brand names are swapped for the
 * repo's parody style (see the banned-brand test in logic.test.ts). Purchase prices (skill XP
 * costs and job base costs) are doubled once, in scalePurchaseCost; the literals below are unscaled.
 * Ids are unique and 1-based; nothing else in the code assumes how many rows a table has.
 * Gear lives in src/data/gear.ts and is re-exported below as EQUIPMENT.
 * Skill unlockAtXp in the raw rows is ignored: earlyGrind, scalePurchaseCost and the unlock chain recompute it.
 */
import { scalePurchaseCost } from "./costs.ts"

export const COST_GROWTH = 1.15 as const;
export const GIG_BOARD_UNLOCK = { minXp: 14000, requireOwnedSkills: [15, 16] as const };
export const JOB_BOARD_UNLOCK = { minXp: 40000, minGigsCompleted: 6 } as const;
export const CAPITAL_UNLOCK = { minJobId: 14, minMoney: 500000 } as const;
export const GEAR_TAB_UNLOCK = { minXp: 10000 } as const;

export { GEAR as EQUIPMENT } from "./gear.ts";
export type { GearItem as Equip } from "./gear.ts";

export type SkillTier = { id: number; name: string; baseXpCost: number; xpPerClick: number; xpPerSec: number; unlockAtXp: number };
const SKILL_ROWS: readonly SkillTier[] = [
  { id: 1, name: "Used laptop", baseXpCost: 10, xpPerClick: 1, xpPerSec: 0, unlockAtXp: 0 },
  { id: 2, name: "Stack Overblow lurker", baseXpCost: 20, xpPerClick: 0, xpPerSec: 0.1, unlockAtXp: 6 },
  { id: 3, name: "FreeCodeChamp streak", baseXpCost: 35, xpPerClick: 0, xpPerSec: 0.25, unlockAtXp: 12 },
  { id: 4, name: "YouToob CS nights", baseXpCost: 55, xpPerClick: 0, xpPerSec: 0.4, unlockAtXp: 21 },
  { id: 5, name: "Web-docs deep reads", baseXpCost: 80, xpPerClick: 1, xpPerSec: 0.3, unlockAtXp: 33 },
  { id: 6, name: "Intro-CS lectures", baseXpCost: 120, xpPerClick: 0, xpPerSec: 0.6, unlockAtXp: 48 },
  { id: 7, name: "CS book nights", baseXpCost: 160, xpPerClick: 0, xpPerSec: 0.9, unlockAtXp: 72 },
  { id: 8, name: "LeetCrate Easy reps", baseXpCost: 220, xpPerClick: 2, xpPerSec: 0.7, unlockAtXp: 96 },
  { id: 9, name: "Git + GitHug hygiene", baseXpCost: 300, xpPerClick: 0, xpPerSec: 1.0, unlockAtXp: 132 },
  { id: 10, name: "HTML/CSS landings", baseXpCost: 400, xpPerClick: 0, xpPerSec: 1.5, unlockAtXp: 180 },
  { id: 11, name: "JavaScript fundamentals", baseXpCost: 550, xpPerClick: 3, xpPerSec: 2.0, unlockAtXp: 240 },
  { id: 12, name: "TypeScript intro", baseXpCost: 750, xpPerClick: 2, xpPerSec: 1.8, unlockAtXp: 330 },
  { id: 13, name: "First finished todo app", baseXpCost: 1000, xpPerClick: 0, xpPerSec: 3.0, unlockAtXp: 450 },
  { id: 14, name: "Deploy somewhere real", baseXpCost: 1300, xpPerClick: 0, xpPerSec: 2.5, unlockAtXp: 600 },
  { id: 15, name: "Portfolio site live", baseXpCost: 1700, xpPerClick: 5, xpPerSec: 2.0, unlockAtXp: 780 },
  { id: 16, name: "React / one framework", baseXpCost: 2200, xpPerClick: 0, xpPerSec: 4.5, unlockAtXp: 1020 },
  { id: 17, name: "Node / Express basics", baseXpCost: 2800, xpPerClick: 0, xpPerSec: 5.0, unlockAtXp: 1320 },
  { id: 18, name: "SQL + basic backend", baseXpCost: 3600, xpPerClick: 0, xpPerSec: 6.0, unlockAtXp: 1680 },
  { id: 19, name: "Auth (sessions/JWT)", baseXpCost: 4500, xpPerClick: 0, xpPerSec: 5.5, unlockAtXp: 2160 },
  { id: 20, name: "LeetCrate Medium patterns", baseXpCost: 5600, xpPerClick: 6, xpPerSec: 4.0, unlockAtXp: 2700 },
  { id: 21, name: "Testing (unit/e2e starter)", baseXpCost: 7000, xpPerClick: 0, xpPerSec: 5.0, unlockAtXp: 3360 },
  { id: 22, name: "Dockyard hello-world", baseXpCost: 8500, xpPerClick: 0, xpPerSec: 4.0, unlockAtXp: 4200 },
  { id: 23, name: "Polished projects \u00d73", baseXpCost: 10000, xpPerClick: 0, xpPerSec: 9.0, unlockAtXp: 5100 },
  { id: 24, name: "System design lightweight", baseXpCost: 12000, xpPerClick: 4, xpPerSec: 6.0, unlockAtXp: 6000 },
  { id: 25, name: "Discourd / study group", baseXpCost: 14000, xpPerClick: 0, xpPerSec: 3.5, unlockAtXp: 7200 },
  { id: 26, name: "Mock interviews", baseXpCost: 16500, xpPerClick: 8, xpPerSec: 5.0, unlockAtXp: 8400 },
  { id: 27, name: "Resume + LinkedOut pass", baseXpCost: 19000, xpPerClick: 0, xpPerSec: 4.0, unlockAtXp: 9900 },
  { id: 28, name: "Open-source first PR", baseXpCost: 22000, xpPerClick: 0, xpPerSec: 7.0, unlockAtXp: 11400 },
  { id: 29, name: "Algorithms notebook habit", baseXpCost: 25000, xpPerClick: 5, xpPerSec: 6.0, unlockAtXp: 13200 },
  { id: 30, name: "CI/CD pipeline toy", baseXpCost: 29000, xpPerClick: 0, xpPerSec: 5.5, unlockAtXp: 15000 },
  { id: 31, name: "Relational DB beyond CRUD", baseXpCost: 33000, xpPerClick: 0, xpPerSec: 7.0, unlockAtXp: 17400 },
  { id: 32, name: "Cache layer intro", baseXpCost: 38000, xpPerClick: 0, xpPerSec: 6.5, unlockAtXp: 19800 },
  { id: 33, name: "Typed API layer taste", baseXpCost: 43000, xpPerClick: 0, xpPerSec: 6.0, unlockAtXp: 22800 },
  { id: 34, name: "Observability basics", baseXpCost: 49000, xpPerClick: 0, xpPerSec: 5.0, unlockAtXp: 25800 },
  { id: 35, name: "Security hygiene", baseXpCost: 55000, xpPerClick: 3, xpPerSec: 5.0, unlockAtXp: 29400 },
  { id: 36, name: "LeetCrate Hard attempts", baseXpCost: 62000, xpPerClick: 10, xpPerSec: 4.0, unlockAtXp: 33000 },
  { id: 37, name: "Design doc practice", baseXpCost: 70000, xpPerClick: 0, xpPerSec: 8.0, unlockAtXp: 37200 },
  { id: 38, name: "Public tech blog posts", baseXpCost: 78000, xpPerClick: 0, xpPerSec: 6.0, unlockAtXp: 42000 },
  { id: 39, name: "Conference talk draft", baseXpCost: 88000, xpPerClick: 0, xpPerSec: 5.0, unlockAtXp: 46800 },
  { id: 40, name: "Mentoring juniors (soft)", baseXpCost: 98000, xpPerClick: 0, xpPerSec: 7.0, unlockAtXp: 52800 },
  { id: 41, name: "Staff-level reading list", baseXpCost: 110000, xpPerClick: 0, xpPerSec: 9.0, unlockAtXp: 58800 },
  { id: 42, name: "Distributed systems notes", baseXpCost: 125000, xpPerClick: 5, xpPerSec: 8.0, unlockAtXp: 66000 },
  { id: 43, name: "ML math brush-up", baseXpCost: 140000, xpPerClick: 0, xpPerSec: 7.0, unlockAtXp: 75000 },
  { id: 44, name: "Fine-tune toy LLM", baseXpCost: 160000, xpPerClick: 0, xpPerSec: 10.0, unlockAtXp: 84000 },
  { id: 45, name: "CUDA / GPU programming 101", baseXpCost: 180000, xpPerClick: 0, xpPerSec: 8.0, unlockAtXp: 96000 },
  { id: 46, name: "Compilers / interpreters toy", baseXpCost: 200000, xpPerClick: 0, xpPerSec: 9.0, unlockAtXp: 108000 },
  { id: 47, name: "RFCs you actually read", baseXpCost: 230000, xpPerClick: 0, xpPerSec: 6.0, unlockAtXp: 120000 },
  { id: 48, name: "Production war-story journal", baseXpCost: 260000, xpPerClick: 0, xpPerSec: 8.0, unlockAtXp: 138000 },
  { id: 49, name: "Principal study club", baseXpCost: 300000, xpPerClick: 0, xpPerSec: 12.0, unlockAtXp: 156000 },
  { id: 50, name: "Teaching a workshop", baseXpCost: 350000, xpPerClick: 15, xpPerSec: 10.0, unlockAtXp: 180000 },
  { id: 51, name: "Linux CLI basics", baseXpCost: 280, xpPerClick: 0, xpPerSec: 0.8, unlockAtXp: 110 },
  { id: 52, name: "Bash scripting habit", baseXpCost: 480, xpPerClick: 0, xpPerSec: 1.2, unlockAtXp: 200 },
  { id: 53, name: "Python fundamentals", baseXpCost: 900, xpPerClick: 2, xpPerSec: 2.2, unlockAtXp: 380 },
  { id: 54, name: "Utility CSS landings", baseXpCost: 1100, xpPerClick: 0, xpPerSec: 2.0, unlockAtXp: 520 },
  { id: 55, name: "Bundler toolchain", baseXpCost: 1400, xpPerClick: 0, xpPerSec: 2.2, unlockAtXp: 700 },
  { id: 56, name: "App-router framework", baseXpCost: 2600, xpPerClick: 0, xpPerSec: 4.0, unlockAtXp: 1180 },
  { id: 57, name: "Design-mock for engineers", baseXpCost: 2000, xpPerClick: 0, xpPerSec: 2.5, unlockAtXp: 900 },
  { id: 58, name: "Lint + format discipline", baseXpCost: 1800, xpPerClick: 0, xpPerSec: 2.0, unlockAtXp: 850 },
  { id: 59, name: "Python API kit", baseXpCost: 4200, xpPerClick: 0, xpPerSec: 5.5, unlockAtXp: 2000 },
  { id: 60, name: "ORM fluency", baseXpCost: 5000, xpPerClick: 0, xpPerSec: 5.0, unlockAtXp: 2500 },
  { id: 61, name: "Component docs kit", baseXpCost: 6500, xpPerClick: 0, xpPerSec: 4.5, unlockAtXp: 3100 },
  { id: 62, name: "Alt-framework dabble", baseXpCost: 4800, xpPerClick: 0, xpPerSec: 4.0, unlockAtXp: 2400 },
  { id: 63, name: "Alt-runtime experiment", baseXpCost: 7800, xpPerClick: 0, xpPerSec: 4.5, unlockAtXp: 4000 },
  { id: 64, name: "Static-site kit", baseXpCost: 7200, xpPerClick: 0, xpPerSec: 4.0, unlockAtXp: 3800 },
  { id: 65, name: "API client drills", baseXpCost: 6000, xpPerClick: 0, xpPerSec: 3.5, unlockAtXp: 3000 },
  { id: 66, name: "Document DB model", baseXpCost: 9000, xpPerClick: 0, xpPerSec: 5.0, unlockAtXp: 4800 },
  { id: 67, name: "SQL ops basics", baseXpCost: 9500, xpPerClick: 0, xpPerSec: 5.0, unlockAtXp: 5000 },
  { id: 68, name: "Client cache layer", baseXpCost: 11000, xpPerClick: 0, xpPerSec: 5.5, unlockAtXp: 5800 },
  { id: 69, name: "BaaS backend kit", baseXpCost: 12500, xpPerClick: 0, xpPerSec: 6.0, unlockAtXp: 6500 },
  { id: 70, name: "Realtime backend taste", baseXpCost: 13000, xpPerClick: 0, xpPerSec: 5.5, unlockAtXp: 6800 },
  { id: 71, name: "Cloud console tour", baseXpCost: 16000, xpPerClick: 0, xpPerSec: 5.0, unlockAtXp: 8000 },
  { id: 72, name: "Infra-as-code intro", baseXpCost: 20000, xpPerClick: 0, xpPerSec: 6.0, unlockAtXp: 10000 },
  { id: 73, name: "Cluster kubectl 101", baseXpCost: 24000, xpPerClick: 0, xpPerSec: 6.5, unlockAtXp: 12000 },
  { id: 74, name: "Config-mgmt playbooks", baseXpCost: 22000, xpPerClick: 0, xpPerSec: 5.5, unlockAtXp: 11000 },
  { id: 75, name: "Go concurrency intro", baseXpCost: 28000, xpPerClick: 0, xpPerSec: 7.0, unlockAtXp: 14000 },
  { id: 76, name: "Rust ownership toy", baseXpCost: 32000, xpPerClick: 0, xpPerSec: 6.5, unlockAtXp: 16000 },
  { id: 77, name: "Event-stream intro", baseXpCost: 36000, xpPerClick: 0, xpPerSec: 6.0, unlockAtXp: 18500 },
  { id: 78, name: "Edge Workers edge", baseXpCost: 34000, xpPerClick: 0, xpPerSec: 5.5, unlockAtXp: 17500 },
  { id: 79, name: "Pipeline craft", baseXpCost: 30000, xpPerClick: 0, xpPerSec: 5.0, unlockAtXp: 15500 },
  { id: 80, name: "Mobile app dabble", baseXpCost: 40000, xpPerClick: 0, xpPerSec: 5.5, unlockAtXp: 21000 },
  { id: 81, name: "Desktop shell toy", baseXpCost: 38000, xpPerClick: 0, xpPerSec: 5.0, unlockAtXp: 20000 },
  { id: 82, name: "Prompt engineering habit", baseXpCost: 45000, xpPerClick: 4, xpPerSec: 6.0, unlockAtXp: 24000 },
  { id: 83, name: "AI-IDE workflow", baseXpCost: 48000, xpPerClick: 0, xpPerSec: 7.0, unlockAtXp: 25500 },
  { id: 84, name: "LLM pairing habit", baseXpCost: 52000, xpPerClick: 0, xpPerSec: 6.5, unlockAtXp: 27000 },
  { id: 85, name: "Array math wrangling", baseXpCost: 58000, xpPerClick: 0, xpPerSec: 6.0, unlockAtXp: 31000 },
  { id: 86, name: "ML framework lab", baseXpCost: 75000, xpPerClick: 0, xpPerSec: 7.5, unlockAtXp: 40000 },
  { id: 87, name: "WebAssembly toy", baseXpCost: 85000, xpPerClick: 0, xpPerSec: 6.0, unlockAtXp: 45000 },
  { id: 88, name: "Contracts dabble", baseXpCost: 95000, xpPerClick: 0, xpPerSec: 5.0, unlockAtXp: 50000 },
  { id: 89, name: "Incident commander drills (soft)", baseXpCost: 105000, xpPerClick: 0, xpPerSec: 7.0, unlockAtXp: 56000 },
  { id: 90, name: "Architecture Decision Records", baseXpCost: 115000, xpPerClick: 0, xpPerSec: 8.0, unlockAtXp: 62000 },
  { id: 91, name: "Negotiation / scope soft", baseXpCost: 100000, xpPerClick: 0, xpPerSec: 5.0, unlockAtXp: 54000 },
  { id: 92, name: "Public speaking reps (soft)", baseXpCost: 120000, xpPerClick: 0, xpPerSec: 6.0, unlockAtXp: 64000 },
  { id: 93, name: "Multi-region design notes", baseXpCost: 150000, xpPerClick: 5, xpPerSec: 9.0, unlockAtXp: 80000 },
  { id: 94, name: "Chip architecture reading", baseXpCost: 190000, xpPerClick: 0, xpPerSec: 8.0, unlockAtXp: 100000 },
  { id: 95, name: "Package manager fluency", baseXpCost: 350, xpPerClick: 0, xpPerSec: 1.0, unlockAtXp: 150 },
  { id: 96, name: "HTTP caching habit", baseXpCost: 2400, xpPerClick: 0, xpPerSec: 3.0, unlockAtXp: 1100 },
  { id: 97, name: "Regex fluency", baseXpCost: 700, xpPerClick: 1, xpPerSec: 1.5, unlockAtXp: 280 },
  { id: 98, name: "Accessibility mindset (soft)", baseXpCost: 15000, xpPerClick: 0, xpPerSec: 4.0, unlockAtXp: 7500 },
  { id: 99, name: "GitHug Actions taste", baseXpCost: 27000, xpPerClick: 0, xpPerSec: 5.5, unlockAtXp: 14500 },
  { id: 100, name: "Monorepo tooling", baseXpCost: 35000, xpPerClick: 0, xpPerSec: 6.0, unlockAtXp: 18000 },
  { id: 101, name: "Feature flag mental model", baseXpCost: 42000, xpPerClick: 0, xpPerSec: 5.5, unlockAtXp: 22000 },
  { id: 102, name: "SRE runbook writing (soft)", baseXpCost: 90000, xpPerClick: 0, xpPerSec: 6.5, unlockAtXp: 48000 },
  { id: 103, name: "Threat modeling habit (soft)", baseXpCost: 100000, xpPerClick: 0, xpPerSec: 5.5, unlockAtXp: 52000 },
  { id: 104, name: "Capacity planning notes", baseXpCost: 135000, xpPerClick: 0, xpPerSec: 7.5, unlockAtXp: 72000 },
  { id: 105, name: "Mars ops systems study", baseXpCost: 400000, xpPerClick: 10, xpPerSec: 14.0, unlockAtXp: 200000 },
] as const;

/**
 * Opening skills cost many more clicks than the raw table, and the next one stays
 * locked until lifetime XP has climbed past this purchase. The tax eases to 1 by skill 12.
 */
function earlyGrind(id: number): number {
  if (id >= 12) return 1
  const t = (id - 1) / 11
  return 12 * (1 / 12) ** t
}

let nextSkillUnlockAt = 0
export const SKILL_TIERS: readonly SkillTier[] = SKILL_ROWS.map((row) => {
  const baseXpCost = Math.ceil(scalePurchaseCost(row.baseXpCost) * earlyGrind(row.id))
  const unlockAtXp = row.id === 1 ? 0 : Math.ceil(nextSkillUnlockAt)
  nextSkillUnlockAt = unlockAtXp + baseXpCost * 1.65
  return {
    ...row,
    baseXpCost,
    unlockAtXp,
    xpPerSec: row.id <= 8 ? row.xpPerSec * 0.25 : row.xpPerSec,
  }
})

export type Gig = {
  id: number
  name: string
  xpReq: number
  priorGigs: number
  /** Every skill this gig demands. Each gig's list contains the previous gig's list plus one more. */
  skillIds: readonly number[]
  lump: number
  retainerCps: number
}

/** Gig 1 needs the first six skills. Each later gig adds the next skill, capped at the skill table. */
function skillsForGig(id: number): readonly number[] {
  const count = Math.min(SKILL_ROWS.length, 5 + id)
  return Array.from({ length: count }, (_, index) => index + 1)
}

const GIG_ROWS: readonly Omit<Gig, "priorGigs" | "skillIds">[] = [
  { id: 1, name: "Fix broken login / blog-engine bug", xpReq: 12000, lump: 40, retainerCps: 0 },
  { id: 2, name: "Local biz landing page", xpReq: 13500, lump: 120, retainerCps: 0 },
  { id: 3, name: "Design-mock-to-HTML slice", xpReq: 14500, lump: 90, retainerCps: 0 },
  { id: 4, name: "Upwerk CRUD admin panel", xpReq: 16000, lump: 350, retainerCps: 0 },
  { id: 5, name: "Bugfix API endpoint", xpReq: 17500, lump: 200, retainerCps: 0 },
  { id: 6, name: "Blog-engine plugin tweak", xpReq: 18500, lump: 150, retainerCps: 0 },
  { id: 7, name: "Email template coding", xpReq: 19500, lump: 110, retainerCps: 0 },
  { id: 8, name: "Site maintenance retainer", xpReq: 21000, lump: 100, retainerCps: 2.0 },
  { id: 9, name: "Storefront theme tweak", xpReq: 22000, lump: 280, retainerCps: 0 },
  { id: 10, name: "Tech blog / content gig", xpReq: 23500, lump: 180, retainerCps: 0.5 },
  { id: 11, name: "Browser extension fix", xpReq: 25000, lump: 320, retainerCps: 0 },
  { id: 12, name: "Second client (testimonial)", xpReq: 26500, lump: 500, retainerCps: 1.0 },
  { id: 13, name: "Internal tool for SMB", xpReq: 28000, lump: 700, retainerCps: 0 },
  { id: 14, name: "API integration (payments-ish)", xpReq: 30000, lump: 900, retainerCps: 0 },
  { id: 15, name: "Performance audit", xpReq: 32000, lump: 600, retainerCps: 0 },
  { id: 16, name: "Accessibility pass", xpReq: 34000, lump: 450, retainerCps: 0 },
  { id: 17, name: "Small SaaS feature contract", xpReq: 36000, lump: 1200, retainerCps: 3.0 },
  { id: 18, name: "Data cleanup script", xpReq: 38000, lump: 400, retainerCps: 0 },
  { id: 19, name: "CI setup for client", xpReq: 40000, lump: 550, retainerCps: 0 },
  { id: 20, name: "Mobile-responsive rescue", xpReq: 42000, lump: 380, retainerCps: 0 },
  { id: 21, name: "Hosted-auth integration", xpReq: 45000, lump: 1100, retainerCps: 0 },
  { id: 22, name: "Retainer: 2nd site", xpReq: 48000, lump: 200, retainerCps: 3.5 },
  { id: 23, name: "Dashboard MVP", xpReq: 52000, lump: 2000, retainerCps: 0 },
  { id: 24, name: "Webhook reliability fix", xpReq: 55000, lump: 800, retainerCps: 0 },
  { id: 25, name: "Migration script (CSV\u2192DB)", xpReq: 58000, lump: 950, retainerCps: 0 },
  { id: 26, name: "Chatbot FAQ wrapper", xpReq: 62000, lump: 1500, retainerCps: 0 },
  { id: 27, name: "SEO landing pack", xpReq: 65000, lump: 700, retainerCps: 1.0 },
  { id: 28, name: "API-spec docs cleanup", xpReq: 68000, lump: 500, retainerCps: 0 },
  { id: 29, name: "Load test + report", xpReq: 72000, lump: 1200, retainerCps: 0 },
  { id: 30, name: "Multi-tenant bug hunt", xpReq: 76000, lump: 1800, retainerCps: 0 },
  { id: 31, name: "Retainer: product squad", xpReq: 80000, lump: 400, retainerCps: 8.0 },
  { id: 32, name: "Mobile-app hotfix", xpReq: 85000, lump: 1400, retainerCps: 0 },
  { id: 33, name: "Typed-API schema rescue", xpReq: 90000, lump: 1600, retainerCps: 0 },
  { id: 34, name: "Billing edge-case fix", xpReq: 95000, lump: 2200, retainerCps: 0 },
  { id: 35, name: "Compliance evidence scripts", xpReq: 100000, lump: 3000, retainerCps: 0 },
  { id: 36, name: "Customer onboarding wizard", xpReq: 110000, lump: 2500, retainerCps: 2.0 },
  { id: 37, name: "Feature flag rollout", xpReq: 120000, lump: 2100, retainerCps: 0 },
  { id: 38, name: "Observability dashboards", xpReq: 130000, lump: 2800, retainerCps: 0 },
  { id: 39, name: "ML inference wrapper API", xpReq: 140000, lump: 4000, retainerCps: 0 },
  { id: 40, name: "Contract: 3-month build", xpReq: 150000, lump: 8000, retainerCps: 15.0 },
  { id: 41, name: "Agency white-label sprint", xpReq: 165000, lump: 6000, retainerCps: 5.0 },
  { id: 42, name: "Enterprise RFP prototype", xpReq: 180000, lump: 10000, retainerCps: 0 },
  { id: 43, name: "Data pipeline gig", xpReq: 200000, lump: 7000, retainerCps: 0 },
  { id: 44, name: "Security pentest remediation", xpReq: 220000, lump: 9000, retainerCps: 0 },
  { id: 45, name: "Design system extract", xpReq: 240000, lump: 5500, retainerCps: 0 },
  { id: 46, name: "LLM eval harness contract", xpReq: 260000, lump: 12000, retainerCps: 0 },
  { id: 47, name: "Platform migration lead", xpReq: 300000, lump: 20000, retainerCps: 25.0 },
  { id: 48, name: "Staff-aug 6-week embed", xpReq: 350000, lump: 35000, retainerCps: 40.0 },
  { id: 49, name: "Fractional CTO weekend", xpReq: 400000, lump: 15000, retainerCps: 10.0 },
  { id: 50, name: "Exit gig: handoff docs", xpReq: 450000, lump: 5000, retainerCps: 0 },
  { id: 51, name: "Status page + runbook pack", xpReq: 47000, lump: 650, retainerCps: 0 },
  { id: 52, name: "CSV\u2192warehouse loader", xpReq: 70000, lump: 1400, retainerCps: 0 },
  { id: 53, name: "Email deliverability fix", xpReq: 88000, lump: 1700, retainerCps: 0 },
  { id: 54, name: "Design-token extract", xpReq: 105000, lump: 2400, retainerCps: 0 },
  { id: 55, name: "Cluster deploy for SMB", xpReq: 145000, lump: 4200, retainerCps: 0 },
  { id: 56, name: "Edge Workers rewrite", xpReq: 175000, lump: 5000, retainerCps: 0 },
  { id: 57, name: "Infra-as-code land-and-expand", xpReq: 190000, lump: 6500, retainerCps: 0 },
  { id: 58, name: "GPU inference cost cut", xpReq: 230000, lump: 11000, retainerCps: 0 },
  { id: 59, name: "Multi-cloud DR drill", xpReq: 280000, lump: 14000, retainerCps: 0 },
  { id: 60, name: "SaaS acquisition diligence", xpReq: 320000, lump: 22000, retainerCps: 0 },
  { id: 61, name: "Chip IP integration spike", xpReq: 380000, lump: 28000, retainerCps: 0 },
  { id: 62, name: "Orbital uplink software", xpReq: 500000, lump: 40000, retainerCps: 20.0 },
  { id: 63, name: "Mars habitat firmware", xpReq: 650000, lump: 60000, retainerCps: 0 },
  { id: 64, name: "Colony mesh networking", xpReq: 800000, lump: 90000, retainerCps: 30.0 },
  { id: 65, name: "Legacy empire handoff", xpReq: 1000000, lump: 50000, retainerCps: 0 },
]

/** Each gig requires every earlier gig, and a skill set that only grows. */
export const GIGS: readonly Gig[] = GIG_ROWS.map((row) => ({
  ...row,
  priorGigs: row.id - 1,
  skillIds: skillsForGig(row.id),
}))

export type JobTier = { id: number; name: string; xpReq: number; baseCost: number; cps: number };
const JOB_ROWS: readonly JobTier[] = [
  { id: 1, name: "Internship offer", xpReq: 35000, baseCost: 0, cps: 8 },
  { id: 2, name: "Junior SWE", xpReq: 45000, baseCost: 500, cps: 25 },
  { id: 3, name: "Junior + mentor buddy", xpReq: 50000, baseCost: 800, cps: 30 },
  { id: 4, name: "Code review skills", xpReq: 55000, baseCost: 2000, cps: 15 },
  { id: 5, name: "QA rotation", xpReq: 60000, baseCost: 1500, cps: 20 },
  { id: 6, name: "On-call rotation", xpReq: 70000, baseCost: 8000, cps: 40 },
  { id: 7, name: "Mid-level SWE", xpReq: 90000, baseCost: 25000, cps: 80 },
  { id: 8, name: "Feature owner", xpReq: 100000, baseCost: 40000, cps: 100 },
  { id: 9, name: "System design study", xpReq: 110000, baseCost: 50000, cps: 30 },
  { id: 10, name: "Backend specialist", xpReq: 120000, baseCost: 60000, cps: 120 },
  { id: 11, name: "Frontend specialist", xpReq: 120000, baseCost: 55000, cps: 110 },
  { id: 12, name: "Full-stack generalist", xpReq: 130000, baseCost: 70000, cps: 130 },
  { id: 13, name: "Tech lead (acting)", xpReq: 150000, baseCost: 100000, cps: 160 },
  { id: 14, name: "Senior SWE", xpReq: 160000, baseCost: 120000, cps: 200 },
  { id: 15, name: "Senior + hiring loop", xpReq: 180000, baseCost: 150000, cps: 220 },
  { id: 16, name: "Staff engineer", xpReq: 220000, baseCost: 400000, cps: 500 },
  { id: 17, name: "Staff platform", xpReq: 250000, baseCost: 500000, cps: 550 },
  { id: 18, name: "Principal engineer", xpReq: 300000, baseCost: 900000, cps: 800 },
  { id: 19, name: "Engineering manager", xpReq: 280000, baseCost: 700000, cps: 450 },
  { id: 20, name: "Director of Eng", xpReq: 350000, baseCost: 1500000, cps: 900 },
  { id: 21, name: "VP Engineering", xpReq: 450000, baseCost: 4000000, cps: 1500 },
  { id: 22, name: "CTO (startup)", xpReq: 500000, baseCost: 8000000, cps: 2000 },
  { id: 23, name: "Distinguished engineer", xpReq: 600000, baseCost: 12000000, cps: 2500 },
  { id: 24, name: "Fellow / industry voice", xpReq: 750000, baseCost: 25000000, cps: 4000 },
  { id: 25, name: "Board advisor (tech)", xpReq: 900000, baseCost: 50000000, cps: 5000 },
  { id: 26, name: "Fractional executive", xpReq: 1000000, baseCost: 80000000, cps: 6000 },
  { id: 27, name: "Partner at BigCo", xpReq: 1200000, baseCost: 150000000, cps: 10000 },
  { id: 28, name: "Chief Scientist", xpReq: 1400000, baseCost: 300000000, cps: 15000 },
  { id: 29, name: "Lab director", xpReq: 1600000, baseCost: 500000000, cps: 20000 },
  { id: 30, name: "Empire operator", xpReq: 2000000, baseCost: 1000000000, cps: 35000 },
  { id: 31, name: "Sovereign tech chair", xpReq: 2500000, baseCost: 5000000000, cps: 80000 },
] as const;

export const JOB_TIERS: readonly JobTier[] = JOB_ROWS.map((row) => ({
  ...row,
  baseCost: scalePurchaseCost(row.baseCost),
}))

/** Balatro pops: big on gig/fight/unlock; medium on click. */
export const MONEY_POP = { click: "medium", gigClear: "large", fightWin: "large", unlock: "large" } as const;

export const BASE_XP_PER_CLICK = 1;
