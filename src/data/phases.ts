/**
 * Catalogs v3: 50 skills, 50 gigs, 31 jobs (here), 30 gear (src/data/gear.ts), 25 capital (src/data/capital.ts).
 * Gates, payouts and ordering are the Researcher's table. Only brand names are swapped for the
 * repo's parody style (see the banned-brand test in logic.test.ts). Purchase prices (skill XP
 * costs and job base costs) are doubled once, in scalePurchaseCost; the literals below are unscaled.
 * Ids are unique and 1-based; nothing else in the code assumes how many rows a table has.
 * Gear lives in src/data/gear.ts and is re-exported below as EQUIPMENT.
 */
import { scalePurchaseCost } from "./costs.ts"

export const COST_GROWTH = 1.15 as const;
export const GIG_BOARD_UNLOCK = { minXp: 12000, requireOwnedSkills: [15, 16] as const };
export const JOB_BOARD_UNLOCK = { minXp: 35000, minGigsCompleted: 5 } as const;
export const CAPITAL_UNLOCK = { minJobId: 14, minMoney: 500000 } as const;
export const GEAR_TAB_UNLOCK = { minXp: 8000 } as const;

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
  { id: 23, name: "Polished projects ×3", baseXpCost: 10000, xpPerClick: 0, xpPerSec: 9.0, unlockAtXp: 5100 },
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
] as const;

export const SKILL_TIERS: readonly SkillTier[] = SKILL_ROWS.map((row) => ({
  ...row,
  baseXpCost: scalePurchaseCost(row.baseXpCost),
}))

export type Gig = { id: number; name: string; xpReq: number; priorGigs: number; lump: number; retainerCps: number };
export const GIGS: readonly Gig[] = [
  { id: 1, name: "Fix broken login / blog-engine bug", xpReq: 12000, priorGigs: 0, lump: 40, retainerCps: 0 },
  { id: 2, name: "Local biz landing page", xpReq: 13500, priorGigs: 1, lump: 120, retainerCps: 0 },
  { id: 3, name: "Design-mock-to-HTML slice", xpReq: 14500, priorGigs: 1, lump: 90, retainerCps: 0 },
  { id: 4, name: "Upwerk CRUD admin panel", xpReq: 16000, priorGigs: 2, lump: 350, retainerCps: 0 },
  { id: 5, name: "Bugfix API endpoint", xpReq: 17500, priorGigs: 2, lump: 200, retainerCps: 0 },
  { id: 6, name: "Blog-engine plugin tweak", xpReq: 18500, priorGigs: 2, lump: 150, retainerCps: 0 },
  { id: 7, name: "Email template coding", xpReq: 19500, priorGigs: 3, lump: 110, retainerCps: 0 },
  { id: 8, name: "Site maintenance retainer", xpReq: 21000, priorGigs: 3, lump: 100, retainerCps: 2.0 },
  { id: 9, name: "Storefront theme tweak", xpReq: 22000, priorGigs: 3, lump: 280, retainerCps: 0 },
  { id: 10, name: "Tech blog / content gig", xpReq: 23500, priorGigs: 4, lump: 180, retainerCps: 0.5 },
  { id: 11, name: "Browser extension fix", xpReq: 25000, priorGigs: 4, lump: 320, retainerCps: 0 },
  { id: 12, name: "Second client (testimonial)", xpReq: 26500, priorGigs: 5, lump: 500, retainerCps: 1.0 },
  { id: 13, name: "Internal tool for SMB", xpReq: 28000, priorGigs: 5, lump: 700, retainerCps: 0 },
  { id: 14, name: "API integration (payments-ish)", xpReq: 30000, priorGigs: 6, lump: 900, retainerCps: 0 },
  { id: 15, name: "Performance audit", xpReq: 32000, priorGigs: 6, lump: 600, retainerCps: 0 },
  { id: 16, name: "Accessibility pass", xpReq: 34000, priorGigs: 7, lump: 450, retainerCps: 0 },
  { id: 17, name: "Small SaaS feature contract", xpReq: 36000, priorGigs: 7, lump: 1200, retainerCps: 3.0 },
  { id: 18, name: "Data cleanup script", xpReq: 38000, priorGigs: 8, lump: 400, retainerCps: 0 },
  { id: 19, name: "CI setup for client", xpReq: 40000, priorGigs: 8, lump: 550, retainerCps: 0 },
  { id: 20, name: "Mobile-responsive rescue", xpReq: 42000, priorGigs: 9, lump: 380, retainerCps: 0 },
  { id: 21, name: "Hosted-auth integration", xpReq: 45000, priorGigs: 9, lump: 1100, retainerCps: 0 },
  { id: 22, name: "Retainer: 2nd site", xpReq: 48000, priorGigs: 10, lump: 200, retainerCps: 3.5 },
  { id: 23, name: "Dashboard MVP", xpReq: 52000, priorGigs: 10, lump: 2000, retainerCps: 0 },
  { id: 24, name: "Webhook reliability fix", xpReq: 55000, priorGigs: 11, lump: 800, retainerCps: 0 },
  { id: 25, name: "Migration script (CSV→DB)", xpReq: 58000, priorGigs: 11, lump: 950, retainerCps: 0 },
  { id: 26, name: "Chatbot FAQ wrapper", xpReq: 62000, priorGigs: 12, lump: 1500, retainerCps: 0 },
  { id: 27, name: "SEO landing pack", xpReq: 65000, priorGigs: 12, lump: 700, retainerCps: 1.0 },
  { id: 28, name: "API-spec docs cleanup", xpReq: 68000, priorGigs: 13, lump: 500, retainerCps: 0 },
  { id: 29, name: "Load test + report", xpReq: 72000, priorGigs: 13, lump: 1200, retainerCps: 0 },
  { id: 30, name: "Multi-tenant bug hunt", xpReq: 76000, priorGigs: 14, lump: 1800, retainerCps: 0 },
  { id: 31, name: "Retainer: product squad", xpReq: 80000, priorGigs: 15, lump: 400, retainerCps: 8.0 },
  { id: 32, name: "Mobile-app hotfix", xpReq: 85000, priorGigs: 15, lump: 1400, retainerCps: 0 },
  { id: 33, name: "Typed-API schema rescue", xpReq: 90000, priorGigs: 16, lump: 1600, retainerCps: 0 },
  { id: 34, name: "Billing edge-case fix", xpReq: 95000, priorGigs: 16, lump: 2200, retainerCps: 0 },
  { id: 35, name: "Compliance evidence scripts", xpReq: 100000, priorGigs: 17, lump: 3000, retainerCps: 0 },
  { id: 36, name: "Customer onboarding wizard", xpReq: 110000, priorGigs: 18, lump: 2500, retainerCps: 2.0 },
  { id: 37, name: "Feature flag rollout", xpReq: 120000, priorGigs: 18, lump: 2100, retainerCps: 0 },
  { id: 38, name: "Observability dashboards", xpReq: 130000, priorGigs: 19, lump: 2800, retainerCps: 0 },
  { id: 39, name: "ML inference wrapper API", xpReq: 140000, priorGigs: 20, lump: 4000, retainerCps: 0 },
  { id: 40, name: "Contract: 3-month build", xpReq: 150000, priorGigs: 20, lump: 8000, retainerCps: 15.0 },
  { id: 41, name: "Agency white-label sprint", xpReq: 165000, priorGigs: 22, lump: 6000, retainerCps: 5.0 },
  { id: 42, name: "Enterprise RFP prototype", xpReq: 180000, priorGigs: 24, lump: 10000, retainerCps: 0 },
  { id: 43, name: "Data pipeline gig", xpReq: 200000, priorGigs: 25, lump: 7000, retainerCps: 0 },
  { id: 44, name: "Security pentest remediation", xpReq: 220000, priorGigs: 26, lump: 9000, retainerCps: 0 },
  { id: 45, name: "Design system extract", xpReq: 240000, priorGigs: 28, lump: 5500, retainerCps: 0 },
  { id: 46, name: "LLM eval harness contract", xpReq: 260000, priorGigs: 30, lump: 12000, retainerCps: 0 },
  { id: 47, name: "Platform migration lead", xpReq: 300000, priorGigs: 32, lump: 20000, retainerCps: 25.0 },
  { id: 48, name: "Staff-aug 6-week embed", xpReq: 350000, priorGigs: 35, lump: 35000, retainerCps: 40.0 },
  { id: 49, name: "Fractional CTO weekend", xpReq: 400000, priorGigs: 38, lump: 15000, retainerCps: 10.0 },
  { id: 50, name: "Exit gig: handoff docs", xpReq: 450000, priorGigs: 40, lump: 5000, retainerCps: 0 },
] as const;

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

/** Phase A: click adds XP only. Phase B+: click adds money (XP drip optional). */
export const PHASE_A_CLICK_IS_XP = true;
/** Balatro pops: big on gig/fight/unlock; medium on click. */
export const MONEY_POP = { click: "medium", gigClear: "large", fightWin: "large", unlock: "large" } as const;

export const BASE_XP_PER_CLICK = 1;
/** Share of the XP-per-click stat a click still drips once clicks pay money (Phase B+). */
export const XP_DRIP_FRACTION = 0.25;
