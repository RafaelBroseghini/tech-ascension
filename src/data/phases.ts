/**
 * Phase economy v1 — XP → gigs → job → capital. COST_GROWTH still 1.15 on owned copies.
 * Numbers, gates and ordering are the costs table verbatim. Only brand names are swapped for the
 * repo's parody style (see the banned-brand test in logic.test.ts).
 */
export const COST_GROWTH = 1.15 as const;
export const GIG_BOARD_UNLOCK = { minXp: 12000, requireOwnedTier: [11, 12] as const };
export const JOB_BOARD_UNLOCK = { minXp: 35000, minGigsCompleted: 5 } as const;
export const CAPITAL_UNLOCK = { minJobId: 7, minMoney: 500_000 } as const; // senior-ish

export type SkillTier = { id: number; name: string; baseXpCost: number; xpPerClick: number; xpPerSec: number; unlockAtXp: number };
export const SKILL_TIERS: readonly SkillTier[] = [
  { id: 1, name: "Used laptop", baseXpCost: 10, xpPerClick: 1, xpPerSec: 0, unlockAtXp: 0 },
  { id: 2, name: "FreeCodeChamp streak", baseXpCost: 25, xpPerClick: 0, xpPerSec: 0.2, unlockAtXp: 0 },
  { id: 3, name: "YouToob CS nights", baseXpCost: 60, xpPerClick: 0, xpPerSec: 0.5, unlockAtXp: 40 },
  { id: 4, name: "Stack Overblow account", baseXpCost: 100, xpPerClick: 1, xpPerSec: 0.3, unlockAtXp: 80 },
  { id: 5, name: "CS book nights", baseXpCost: 180, xpPerClick: 0, xpPerSec: 1.0, unlockAtXp: 150 },
  { id: 6, name: "LeetCrate Easy reps", baseXpCost: 300, xpPerClick: 2, xpPerSec: 0.8, unlockAtXp: 250 },
  { id: 7, name: "Git + GitHug hygiene", baseXpCost: 450, xpPerClick: 0, xpPerSec: 1.2, unlockAtXp: 400 },
  { id: 8, name: "HTML/CSS landings", baseXpCost: 700, xpPerClick: 0, xpPerSec: 2.0, unlockAtXp: 600 },
  { id: 9, name: "JavaScript fundamentals", baseXpCost: 1100, xpPerClick: 3, xpPerSec: 2.5, unlockAtXp: 900 },
  { id: 10, name: "First finished todo app", baseXpCost: 1800, xpPerClick: 0, xpPerSec: 4.0, unlockAtXp: 1400 },
  { id: 11, name: "Portfolio site deployed", baseXpCost: 2800, xpPerClick: 5, xpPerSec: 3.0, unlockAtXp: 2200 },
  { id: 12, name: "React / one framework", baseXpCost: 4500, xpPerClick: 0, xpPerSec: 6.0, unlockAtXp: 3500 },
  { id: 13, name: "SQL + basic backend", baseXpCost: 7000, xpPerClick: 0, xpPerSec: 8.0, unlockAtXp: 5500 },
  { id: 14, name: "LeetCrate Medium patterns", baseXpCost: 11000, xpPerClick: 8, xpPerSec: 5.0, unlockAtXp: 8500 },
  { id: 15, name: "Polished projects x3", baseXpCost: 18000, xpPerClick: 0, xpPerSec: 12.0, unlockAtXp: 13000 },
  { id: 16, name: "Study group / Discourd", baseXpCost: 22000, xpPerClick: 0, xpPerSec: 4.0, unlockAtXp: 16000 },
  { id: 17, name: "Mock interviews", baseXpCost: 28000, xpPerClick: 10, xpPerSec: 6.0, unlockAtXp: 20000 },
  { id: 18, name: "Resume + LinkedOut pass", baseXpCost: 35000, xpPerClick: 0, xpPerSec: 5.0, unlockAtXp: 25000 },
] as const;

export type Gig = { id: number; name: string; xpReq: number; priorGigs: number; lump: number; retainerCps: number };
export const GIGS: readonly Gig[] = [
  { id: 1, name: "Fix broken login / blog-engine bug", xpReq: 12000, priorGigs: 0, lump: 40, retainerCps: 0 },
  { id: 2, name: "Local biz landing page", xpReq: 14000, priorGigs: 1, lump: 120, retainerCps: 0 },
  { id: 3, name: "Upwerk CRUD admin panel", xpReq: 18000, priorGigs: 2, lump: 350, retainerCps: 0 },
  { id: 4, name: "Bugfix API endpoint", xpReq: 20000, priorGigs: 2, lump: 200, retainerCps: 0 },
  { id: 5, name: "Site maintenance retainer", xpReq: 25000, priorGigs: 3, lump: 100, retainerCps: 2.0 },
  { id: 6, name: "Tech blog / content gig", xpReq: 28000, priorGigs: 3, lump: 180, retainerCps: 0.5 },
  { id: 7, name: "Second client (testimonial)", xpReq: 32000, priorGigs: 5, lump: 500, retainerCps: 1.0 },
  { id: 8, name: "Small SaaS feature contract", xpReq: 40000, priorGigs: 6, lump: 1200, retainerCps: 3.0 },
] as const;

export type JobTier = { id: number; name: string; xpReq: number; baseCost: number; cps: number };
export const JOB_TIERS: readonly JobTier[] = [
  { id: 1, name: "Internship offer", xpReq: 35000, baseCost: 0, cps: 8 },
  { id: 2, name: "Junior SWE", xpReq: 45000, baseCost: 500, cps: 25 },
  { id: 3, name: "Code review skills", xpReq: 55000, baseCost: 2000, cps: 15 },
  { id: 4, name: "On-call rotation", xpReq: 70000, baseCost: 8000, cps: 40 },
  { id: 5, name: "Mid-level SWE", xpReq: 90000, baseCost: 25000, cps: 80 },
  { id: 6, name: "System design study", xpReq: 110000, baseCost: 50000, cps: 30 },
  { id: 7, name: "Senior SWE", xpReq: 140000, baseCost: 120000, cps: 200 },
  { id: 8, name: "Staff engineer", xpReq: 200000, baseCost: 400000, cps: 500 },
] as const;

export type Equip = { id: number; name: string; baseCost: number; clickBonus: number; cps: number };
export const EQUIPMENT: readonly Equip[] = [
  { id: 1, name: "Thocky keyboard", baseCost: 20000, clickBonus: 5, cps: 0 },
  { id: 2, name: "Raspberry Pie lab", baseCost: 35000, clickBonus: 0, cps: 3 },
  { id: 3, name: "Cloud credits pack", baseCost: 50000, clickBonus: 0, cps: 8 },
  { id: 4, name: "Second monitor", baseCost: 28000, clickBonus: 3, cps: 0 },
  { id: 5, name: "Home GPU", baseCost: 150000, clickBonus: 0, cps: 25 },
] as const;

/** Phase A: click adds XP only. Phase B+: click adds money (XP drip optional). */
export const PHASE_A_CLICK_IS_XP = true;
/** Balatro pops: big on gig/fight/unlock; medium on click. */
export const MONEY_POP = { click: "medium", gigClear: "large", fightWin: "large", unlock: "large" } as const;

export const BASE_XP_PER_CLICK = 1;
/** Share of the XP-per-click stat a click still drips once clicks pay money (Phase B+). */
export const XP_DRIP_FRACTION = 0.25;
/** Old (save v2) early-tier spend is refunded as XP at this rate. See src/game/save.ts. */
export const LEGACY_EARLY_XP_PER_DOLLAR = 0.25;
