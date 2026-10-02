/**
 * Random events. Era-weighted. Mean wait is EVENT_MEAN_WAIT_MS (240s, was 150s).
 *
 * Optional `requires` gates a row on ownership. Omit it and the row stays eligible for its eras.
 * Fields are AND. Arrays are OR inside one field (any listed job, gig, or gear).
 * A missing or empty field is ignored. minJobId is the highest job held. minGigs is cleared-gig
 * count. minGearOwned is the sum of owned gear copies.
 */

export type EraGate = "early" | "mid" | "upper" | "q3" | "end" | "any"
export type EventEffect =
  | { kind: "money"; delta: number }
  | { kind: "moneyPct"; pct: number }
  | { kind: "xp"; delta: number }
  | { kind: "foreverMult"; mult: number }
  | { kind: "tempMult"; mult: number; ms: number; target: "click" | "cps" | "xpPerSec" }

/** Optional progression gate — all listed fields are AND. Arrays are OR within the field. */
export type EventRequires = {
  minJobId?: number
  jobIds?: number[]
  minGigs?: number
  gigIds?: number[]
  minGearOwned?: number
  gearIds?: number[]
}

export type GameEvent = {
  id: number
  name: string
  eras: readonly EraGate[]
  weight: number
  effects: readonly EventEffect[]
  flavor: string
  requires?: EventRequires
}

/** Proposed: 240s mean (was 150s) — events feel rarer with denser catalogs. */
export const EVENT_MEAN_WAIT_MS = 240_000

export const EVENTS: readonly GameEvent[] = [
  { id: 1, name: "Viral GitHug star", eras: ["early", "mid"] as const, weight: 4, effects: [{ kind: "xp", delta: 500 }, { kind: "foreverMult", mult: 1.02 }], flavor: "A forgotten repo hits the front page." },
  { id: 2, name: "Friendly senior review", eras: ["early", "mid"] as const, weight: 9, effects: [{ kind: "xp", delta: 200 }], flavor: "Kind, thorough comments on your PR." },
  { id: 3, name: "Broke laptop charger", eras: ["early"] as const, weight: 8, effects: [{ kind: "money", delta: -30 }], flavor: "Airport markup stings even with no salary." },
  { id: 4, name: "Hackathon win", eras: ["early", "mid"] as const, weight: 3, effects: [{ kind: "money", delta: 200 }, { kind: "xp", delta: 300 }], flavor: "Pizza, stickers, gift card." },
  { id: 5, name: "Burnout weekend", eras: ["early", "mid"] as const, weight: 7, effects: [{ kind: "xp", delta: -150 }], flavor: "You ship nothing and feel weird." },
  { id: 6, name: "LeetCrate streak freeze", eras: ["early"] as const, weight: 7, effects: [{ kind: "xp", delta: -80 }], flavor: "You miss a day and the app shames you." },
  { id: 7, name: "Tutorial deep dive", eras: ["early"] as const, weight: 8, effects: [{ kind: "xp", delta: 180 }], flavor: "Four hours of YouToob that actually stick." },
  { id: 8, name: "CS book all-nighter", eras: ["early"] as const, weight: 6, effects: [{ kind: "xp", delta: 250 }, { kind: "tempMult", mult: 0.9, ms: 120000, target: "click" }], flavor: "Brain full; fingers slow." },
  { id: 9, name: "Discourd rubber duck", eras: ["early", "mid"] as const, weight: 9, effects: [{ kind: "xp", delta: 120 }], flavor: "Someone says 'yeah that error is normal.'" },
  { id: 10, name: "FreeCodeChamp cert", eras: ["early"] as const, weight: 5, effects: [{ kind: "xp", delta: 400 }], flavor: "Another badge, another dopamine hit." },
  { id: 11, name: "Imposter spiral", eras: ["early", "mid"] as const, weight: 7, effects: [{ kind: "xp", delta: -100 }], flavor: "Timeline makes everyone else look senior." },
  { id: 12, name: "Notebook before IDE", eras: ["early"] as const, weight: 5, effects: [{ kind: "xp", delta: 150 }], flavor: "You finally understand the algorithm on paper." },
  { id: 13, name: "Broken tutorial", eras: ["early"] as const, weight: 7, effects: [{ kind: "xp", delta: -60 }], flavor: "The video is three major versions out of date." },
  { id: 14, name: "First green CI", eras: ["early", "mid"] as const, weight: 6, effects: [{ kind: "xp", delta: 220 }], flavor: "Checks pass; you screenshot it.", requires: { minGigs: 0, minGearOwned: 0 } },
  { id: 15, name: "Merge conflict morning", eras: ["early", "mid"] as const, weight: 8, effects: [{ kind: "xp", delta: -40 }], flavor: "You lose an hour to rebase theater." },
  { id: 16, name: "Stack Overblow upvote", eras: ["early"] as const, weight: 7, effects: [{ kind: "xp", delta: 90 }], flavor: "Your answer helps a stranger." },
  { id: 17, name: "Family asks when you'll get a job", eras: ["early"] as const, weight: 5, effects: [{ kind: "xp", delta: -50 }], flavor: "Thanksgiving pressure applied." },
  { id: 18, name: "Library wifi grind", eras: ["early"] as const, weight: 7, effects: [{ kind: "xp", delta: 130 }], flavor: "Quiet hours, loud keyboard." },
  { id: 19, name: "Bought another sale course", eras: ["early"] as const, weight: 6, effects: [{ kind: "money", delta: -15 }, { kind: "xp", delta: 80 }], flavor: "Sale price; completion rate TBD." },
  { id: 20, name: "Pomodoro perfect day", eras: ["early", "mid"] as const, weight: 5, effects: [{ kind: "tempMult", mult: 1.15, ms: 600000, target: "xpPerSec" }], flavor: "Eight clean tomatoes." },
  { id: 21, name: "Open-source bounty", eras: ["mid", "upper"] as const, weight: 5, effects: [{ kind: "money", delta: 800 }], flavor: "Maintainer merges and pays out.", requires: { minGigs: 3 } },
  { id: 22, name: "Client ghosted invoice", eras: ["mid"] as const, weight: 8, effects: [{ kind: "money", delta: -200 }], flavor: "Net-30 becomes Net-never.", requires: { minGigs: 2 } },
  { id: 23, name: "Conference scholarship", eras: ["mid", "upper"] as const, weight: 3, effects: [{ kind: "xp", delta: 800 }, { kind: "foreverMult", mult: 1.01 }], flavor: "Badge, tote, wrinkles.", requires: { minGigs: 5 } },
  { id: 24, name: "LeetCrate contest medal", eras: ["mid"] as const, weight: 4, effects: [{ kind: "xp", delta: 600 }, { kind: "tempMult", mult: 1.05, ms: 300000, target: "click" }], flavor: "You peak for five minutes." },
  { id: 25, name: "Cloud free credits", eras: ["mid", "upper"] as const, weight: 7, effects: [{ kind: "money", delta: 150 }], flavor: "$150 that feels like $1500.", requires: { minGearOwned: 1, gearIds: [7] } },
  { id: 26, name: "Prod footgun", eras: ["mid", "upper"] as const, weight: 5, effects: [{ kind: "money", delta: -500 }, { kind: "xp", delta: -100 }], flavor: "Rollback, postmortem, pizza.", requires: { minJobId: 2 } },
  { id: 27, name: "Recruiter spam tax", eras: ["mid", "upper"] as const, weight: 10, effects: [{ kind: "xp", delta: -40 }], flavor: "InMails eat your lunch.", requires: { minJobId: 1 } },
  { id: 28, name: "Orange-site front page", eras: ["mid", "upper"] as const, weight: 3, effects: [{ kind: "money", delta: 2000 }, { kind: "xp", delta: 400 }], flavor: "Show HN goes well.", requires: { minGigs: 8 } },
  { id: 29, name: "Quiet-hours focus", eras: ["mid"] as const, weight: 6, effects: [{ kind: "tempMult", mult: 1.1, ms: 600000, target: "xpPerSec" }], flavor: "Nobody pings you." },
  { id: 30, name: "Five-star Upwerk review", eras: ["mid"] as const, weight: 5, effects: [{ kind: "money", delta: 300 }, { kind: "foreverMult", mult: 1.01 }], flavor: "JSS ticks up.", requires: { gigIds: [4] } },
  { id: 31, name: "Scope creep hydra", eras: ["mid"] as const, weight: 7, effects: [{ kind: "xp", delta: -120 }, { kind: "money", delta: 50 }], flavor: "They 'just want one more thing.'", requires: { minGigs: 3 } },
  { id: 32, name: "Retainer renewed", eras: ["mid"] as const, weight: 5, effects: [{ kind: "money", delta: 400 }], flavor: "Monthly maintenance sticks.", requires: { gigIds: [8, 22] } },
  { id: 33, name: "Tax software coupon", eras: ["mid"] as const, weight: 4, effects: [{ kind: "money", delta: -80 }], flavor: "You buy TurboWhatever.", requires: { minGigs: 5 } },
  { id: 34, name: "Pairing with a mentor", eras: ["mid"] as const, weight: 7, effects: [{ kind: "xp", delta: 350 }], flavor: "You learn three shortcuts.", requires: { minJobId: 2 } },
  { id: 35, name: "On-call false alarm", eras: ["mid", "upper"] as const, weight: 8, effects: [{ kind: "xp", delta: -70 }], flavor: "Pager at 3am for a flappy probe.", requires: { jobIds: [6] } },
  { id: 36, name: "Office pizza friday", eras: ["mid"] as const, weight: 7, effects: [{ kind: "xp", delta: 60 }], flavor: "Morale: slightly up.", requires: { minJobId: 2 } },
  { id: 37, name: "Performance review soft", eras: ["mid"] as const, weight: 4, effects: [{ kind: "xp", delta: 200 }, { kind: "money", delta: 500 }], flavor: "Meets expectations + tiny raise.", requires: { minJobId: 7 } },
  { id: 38, name: "Denied expense monitor", eras: ["mid"] as const, weight: 5, effects: [{ kind: "money", delta: -200 }], flavor: "You buy the ultrawide yourself.", requires: { minJobId: 2 } },
  { id: 39, name: "Internal tool demo win", eras: ["mid", "upper"] as const, weight: 3, effects: [{ kind: "xp", delta: 400 }], flavor: "Team adopts your script.", requires: { minJobId: 7 } },
  { id: 40, name: "Broken staging again", eras: ["mid"] as const, weight: 9, effects: [{ kind: "xp", delta: -90 }], flavor: "Compose file says no.", requires: { minGigs: 4 } },
  { id: 41, name: "Angel intro coffee", eras: ["upper"] as const, weight: 3, effects: [{ kind: "foreverMult", mult: 1.03 }], flavor: "They forward your deck.", requires: { minJobId: 14 } },
  { id: 42, name: "GPU lottery", eras: ["upper", "q3"] as const, weight: 2, effects: [{ kind: "money", delta: 50000 }, { kind: "foreverMult", mult: 1.05 }], flavor: "Scalper cancels; you win.", requires: { minGearOwned: 1, gearIds: [9, 10, 17] } },
  { id: 43, name: "Term sheet nibble", eras: ["upper"] as const, weight: 3, effects: [{ kind: "money", delta: 100000 }, { kind: "foreverMult", mult: 1.02 }], flavor: "Soft circle, hard lawyers.", requires: { minJobId: 14 } },
  { id: 44, name: "Churn spike Monday", eras: ["upper"] as const, weight: 6, effects: [{ kind: "money", delta: -25000 }], flavor: "Dashboard goes red.", requires: { minJobId: 14 } },
  { id: 45, name: "Competitor launches clone", eras: ["upper"] as const, weight: 5, effects: [{ kind: "tempMult", mult: 0.85, ms: 300000, target: "cps" }], flavor: "You scramble a response post.", requires: { minJobId: 14 } },
  { id: 46, name: "Key hire accepts", eras: ["upper", "q3"] as const, weight: 3, effects: [{ kind: "foreverMult", mult: 1.04 }, { kind: "xp", delta: 1000 }], flavor: "Staff ML starts Monday.", requires: { minJobId: 16 } },
  { id: 47, name: "Key hire ghosts", eras: ["upper"] as const, weight: 5, effects: [{ kind: "xp", delta: -300 }, { kind: "money", delta: -5000 }], flavor: "Offer letter into the void.", requires: { minJobId: 15 } },
  { id: 48, name: "Board meeting grill", eras: ["upper"] as const, weight: 4, effects: [{ kind: "xp", delta: -200 }, { kind: "foreverMult", mult: 1.01 }], flavor: "Painful but clarifying.", requires: { minJobId: 16 } },
  { id: 49, name: "Viral product hunt", eras: ["upper"] as const, weight: 3, effects: [{ kind: "money", delta: 75000 }, { kind: "xp", delta: 800 }], flavor: "#3 of the day.", requires: { minJobId: 14 } },
  { id: 50, name: "Compliance auditor arrives", eras: ["upper"] as const, weight: 5, effects: [{ kind: "money", delta: -40000 }, { kind: "xp", delta: 500 }], flavor: "Evidence folders forever.", requires: { gigIds: [35] } },
  { id: 51, name: "Customer design partner", eras: ["upper"] as const, weight: 5, effects: [{ kind: "money", delta: 30000 }, { kind: "foreverMult", mult: 1.015 }], flavor: "They pay to shape the roadmap.", requires: { minJobId: 14 } },
  { id: 52, name: "PR disaster post", eras: ["upper"] as const, weight: 4, effects: [{ kind: "money", delta: -60000 }], flavor: "Comms goes into bunker mode.", requires: { minJobId: 14 } },
  { id: 53, name: "Acqui-hire sniff", eras: ["upper"] as const, weight: 2, effects: [{ kind: "money", delta: 200000 }], flavor: "BigCo asks for a quiet chat.", requires: { minJobId: 18 } },
  { id: 54, name: "Runway anxiety night", eras: ["upper"] as const, weight: 7, effects: [{ kind: "xp", delta: -250 }], flavor: "Spreadsheet of doom.", requires: { minJobId: 14 } },
  { id: 55, name: "Seed angel wires", eras: ["upper"] as const, weight: 3, effects: [{ kind: "money", delta: 250000 }], flavor: "First close hits the bank.", requires: { minJobId: 14 } },
  { id: 56, name: "Lawyer invoice", eras: ["upper"] as const, weight: 7, effects: [{ kind: "money", delta: -15000 }], flavor: "Billable hours have feelings.", requires: { minJobId: 14 } },
  { id: 57, name: "Office lease signed", eras: ["upper"] as const, weight: 3, effects: [{ kind: "money", delta: -20000 }, { kind: "foreverMult", mult: 1.01 }], flavor: "Foosball optional.", requires: { minJobId: 16 } },
  { id: 58, name: "Demo day high", eras: ["upper"] as const, weight: 3, effects: [{ kind: "xp", delta: 1200 }, { kind: "tempMult", mult: 1.2, ms: 180000, target: "click" }], flavor: "Adrenaline coding.", requires: { minJobId: 14 } },
  { id: 59, name: "Pipeline slipped a quarter", eras: ["upper", "q3"] as const, weight: 5, effects: [{ kind: "money", delta: -80000 }], flavor: "Enterprise sales being enterprise.", requires: { minJobId: 16 } },
  { id: 60, name: "Open weights release buzz", eras: ["upper", "q3"] as const, weight: 4, effects: [{ kind: "xp", delta: 2000 }, { kind: "foreverMult", mult: 1.02 }], flavor: "The timeline loses its mind.", requires: { minJobId: 16 } },
  { id: 61, name: "Export license delay", eras: ["q3"] as const, weight: 6, effects: [{ kind: "money", delta: -10000 }], flavor: "Paperwork eats a deal.", requires: { minJobId: 18 } },
  { id: 62, name: "Fab yield excursion", eras: ["q3"] as const, weight: 5, effects: [{ kind: "money", delta: -500000 }, { kind: "tempMult", mult: 0.9, ms: 240000, target: "cps" }], flavor: "Lot #4421 misbehaves.", requires: { minJobId: 20 } },
  { id: 63, name: "GPU OOM storm", eras: ["q3"] as const, weight: 7, effects: [{ kind: "xp", delta: -400 }], flavor: "gpu-17 becomes a space heater.", requires: { minGearOwned: 1, gearIds: [17, 18, 20, 21] } },
  { id: 64, name: "Eval score uptick", eras: ["q3"] as const, weight: 4, effects: [{ kind: "foreverMult", mult: 1.04 }, { kind: "xp", delta: 3000 }], flavor: "Bench likes you today.", requires: { minJobId: 18 } },
  { id: 65, name: "Eval score regression", eras: ["q3"] as const, weight: 5, effects: [{ kind: "foreverMult", mult: 0.98 }, { kind: "xp", delta: -500 }], flavor: "You ship a polite apology.", requires: { minJobId: 18 } },
  { id: 66, name: "HBM allocation win", eras: ["q3"] as const, weight: 3, effects: [{ kind: "money", delta: -200000 }, { kind: "foreverMult", mult: 1.06 }], flavor: "Expensive, worth it.", requires: { gearIds: [18, 20, 21, 78] } },
  { id: 67, name: "Safety red-team finds spicy", eras: ["q3"] as const, weight: 5, effects: [{ kind: "money", delta: -100000 }, { kind: "xp", delta: 800 }], flavor: "Patch before press.", requires: { minJobId: 18 } },
  { id: 68, name: "Tape-out champagne", eras: ["q3"] as const, weight: 2, effects: [{ kind: "money", delta: 1000000 }, { kind: "foreverMult", mult: 1.05 }], flavor: "Masks are in.", requires: { minJobId: 22 } },
  { id: 69, name: "Mask defect scare", eras: ["q3"] as const, weight: 4, effects: [{ kind: "money", delta: -750000 }], flavor: "Rework invoice inbound.", requires: { minJobId: 22 } },
  { id: 70, name: "Paper accepted at big venue", eras: ["q3", "end"] as const, weight: 3, effects: [{ kind: "xp", delta: 5000 }, { kind: "foreverMult", mult: 1.02 }], flavor: "Camera-ready Tuesday.", requires: { minJobId: 18 } },
  { id: 71, name: "Power bill shock", eras: ["q3", "end"] as const, weight: 6, effects: [{ kind: "money", delta: -300000 }], flavor: "Training cluster thirst.", requires: { minGearOwned: 3 } },
  { id: 72, name: "Cluster reservation sniped", eras: ["q3"] as const, weight: 5, effects: [{ kind: "tempMult", mult: 0.85, ms: 300000, target: "cps" }], flavor: "Cloud region sold out.", requires: { gearIds: [68, 71] } },
  { id: 73, name: "Strategic foundry partner", eras: ["q3"] as const, weight: 2, effects: [{ kind: "foreverMult", mult: 1.07 }], flavor: "Capacity locked for two years.", requires: { minJobId: 22 } },
  { id: 74, name: "Customs holds a shipment", eras: ["q3"] as const, weight: 5, effects: [{ kind: "money", delta: -120000 }], flavor: "GPUs sit in a warehouse.", requires: { minGearOwned: 2, gearIds: [17, 18] } },
  { id: 75, name: "Benchmark leaderboard #1", eras: ["q3"] as const, weight: 3, effects: [{ kind: "foreverMult", mult: 1.05 }, { kind: "money", delta: 500000 }], flavor: "For a weekend.", requires: { minJobId: 20 } },
  { id: 76, name: "Talent poaching war", eras: ["q3"] as const, weight: 5, effects: [{ kind: "money", delta: -400000 }, { kind: "xp", delta: -600 }], flavor: "Counteroffers everywhere.", requires: { minJobId: 19 } },
  { id: 77, name: "Quiet research breakthrough", eras: ["q3"] as const, weight: 3, effects: [{ kind: "xp", delta: 4000 }, { kind: "foreverMult", mult: 1.03 }], flavor: "Nobody posts it yet.", requires: { minJobId: 18 } },
  { id: 78, name: "Board demands profitability", eras: ["q3"] as const, weight: 4, effects: [{ kind: "tempMult", mult: 0.9, ms: 600000, target: "cps" }], flavor: "Cut the fun projects.", requires: { minJobId: 20 } },
  { id: 79, name: "Government grant", eras: ["q3", "end"] as const, weight: 2, effects: [{ kind: "money", delta: 2000000 }], flavor: "Strings attached, money real.", requires: { minJobId: 22 } },
  { id: 80, name: "Supply-chain ransomware near-miss", eras: ["q3"] as const, weight: 3, effects: [{ kind: "money", delta: -50000 }, { kind: "xp", delta: 300 }], flavor: "You rotate every secret.", requires: { minJobId: 17 } },
  { id: 81, name: "Mars dust storm", eras: ["end"] as const, weight: 4, effects: [{ kind: "money", delta: -100000 }, { kind: "tempMult", mult: 0.9, ms: 120000, target: "cps" }], flavor: "Hab sensors scream.", requires: { minGearOwned: 1, gearIds: [27, 28, 100] } },
  { id: 82, name: "Tax bill surprise", eras: ["mid", "upper", "q3", "end"] as const, weight: 7, effects: [{ kind: "moneyPct", pct: -0.05 }], flavor: "Estimated quarterly goes brrr.", requires: { minJobId: 7 } },
  { id: 83, name: "Orbital window opens", eras: ["end"] as const, weight: 3, effects: [{ kind: "foreverMult", mult: 1.04 }, { kind: "money", delta: 5000000 }], flavor: "Launch slot secured.", requires: { gearIds: [26, 94] } },
  { id: 84, name: "Debris near-miss", eras: ["end"] as const, weight: 5, effects: [{ kind: "money", delta: -2000000 }], flavor: "Avoidance burn costs fuel.", requires: { gearIds: [26] } },
  { id: 85, name: "Undersea cable cut", eras: ["end"] as const, weight: 4, effects: [{ kind: "tempMult", mult: 0.8, ms: 300000, target: "cps" }], flavor: "Traffic hairpins the long way.", requires: { minJobId: 24 } },
  { id: 86, name: "Micro-reactor online", eras: ["end"] as const, weight: 2, effects: [{ kind: "foreverMult", mult: 1.08 }], flavor: "Baseload for the GPU halls.", requires: { gearIds: [106] } },
  { id: 87, name: "Habitat morale crisis", eras: ["end"] as const, weight: 5, effects: [{ kind: "xp", delta: -2000 }], flavor: "People miss Earth trees.", requires: { gearIds: [27] } },
  { id: 88, name: "Dust-proofing breakthrough", eras: ["end"] as const, weight: 3, effects: [{ kind: "foreverMult", mult: 1.05 }, { kind: "xp", delta: 3000 }], flavor: "Filters last a season.", requires: { gearIds: [101] } },
  { id: 89, name: "Earth press tour", eras: ["end"] as const, weight: 3, effects: [{ kind: "money", delta: 10000000 }, { kind: "xp", delta: 2000 }], flavor: "You're on every thumbnail.", requires: { minJobId: 28 } },
  { id: 90, name: "Insurance skyrockets", eras: ["end"] as const, weight: 6, effects: [{ kind: "money", delta: -5000000 }], flavor: "Actuaries discovered Mars.", requires: { gearIds: [27, 28] } },
  { id: 91, name: "Solar flare yellow alert", eras: ["end"] as const, weight: 5, effects: [{ kind: "tempMult", mult: 0.85, ms: 180000, target: "cps" }], flavor: "Radios hush; jobs pause.", requires: { minJobId: 26 } },
  { id: 92, name: "Ice mine surplus", eras: ["end"] as const, weight: 3, effects: [{ kind: "money", delta: 3000000 }], flavor: "Water = compute coolant.", requires: { gearIds: [102] } },
  { id: 93, name: "Rival megacampus delays", eras: ["end"] as const, weight: 3, effects: [{ kind: "foreverMult", mult: 1.03 }], flavor: "You take their customers.", requires: { minJobId: 30 } },
  { id: 94, name: "UN hearing", eras: ["end"] as const, weight: 4, effects: [{ kind: "money", delta: -1000000 }, { kind: "xp", delta: 1500 }], flavor: "Regulation is coming.", requires: { minJobId: 28 } },
  { id: 95, name: "Successful booster catch", eras: ["end"] as const, weight: 2, effects: [{ kind: "foreverMult", mult: 1.06 }, { kind: "money", delta: 8000000 }], flavor: "Reuse math finally works.", requires: { gearIds: [26, 94] } },
  { id: 96, name: "Crew rotation delayed", eras: ["end"] as const, weight: 5, effects: [{ kind: "xp", delta: -1000 }], flavor: "Tired humans, tired code.", requires: { gearIds: [27] } },
  { id: 97, name: "Latency to Earth drops", eras: ["end"] as const, weight: 3, effects: [{ kind: "tempMult", mult: 1.15, ms: 300000, target: "cps" }], flavor: "New relay online.", requires: { gearIds: [25, 93] } },
  { id: 98, name: "Black budget contract", eras: ["end"] as const, weight: 1, effects: [{ kind: "money", delta: 50000000 }, { kind: "foreverMult", mult: 1.04 }], flavor: "You don't ask questions.", requires: { minJobId: 30 } },
  { id: 99, name: "Farm dome blight", eras: ["end"] as const, weight: 5, effects: [{ kind: "money", delta: -1500000 }], flavor: "Import calories; sad salads.", requires: { gearIds: [27] } },
  { id: 100, name: "Megacampus ribbon cutting", eras: ["end"] as const, weight: 2, effects: [{ kind: "foreverMult", mult: 1.1 }, { kind: "xp", delta: 10000 }], flavor: "Rust sky, bright future.", requires: { gearIds: [107, 108, 110] } },
  { id: 101, name: "Coffee spill on keyboard", eras: ["any"] as const, weight: 9, effects: [{ kind: "money", delta: -40 }], flavor: "Mechanical switches cry." },
  { id: 102, name: "Lucky rubber duck", eras: ["any"] as const, weight: 7, effects: [{ kind: "xp", delta: 100 }], flavor: "The duck knew all along." },
  { id: 103, name: "Timezone meeting at 6am", eras: ["any"] as const, weight: 8, effects: [{ kind: "xp", delta: -80 }], flavor: "You smile on camera anyway." },
  { id: 104, name: "Documentation day", eras: ["any"] as const, weight: 6, effects: [{ kind: "xp", delta: 160 }], flavor: "Future-you sends thanks." },
  { id: 105, name: "Renamed a variable well", eras: ["any"] as const, weight: 7, effects: [{ kind: "xp", delta: 50 }], flavor: "Clarity is a drug." },
  { id: 106, name: "Accidental rm", eras: ["any"] as const, weight: 4, effects: [{ kind: "xp", delta: -200 }], flavor: "Backups exist. You check." },
  { id: 107, name: "New mechanical switch", eras: ["any"] as const, weight: 5, effects: [{ kind: "money", delta: -120 }, { kind: "tempMult", mult: 1.05, ms: 300000, target: "click" }], flavor: "Thock intensifies." },
  { id: 108, name: "Eye strain tax", eras: ["any"] as const, weight: 7, effects: [{ kind: "xp", delta: -60 }], flavor: "You buy drops." },
  { id: 109, name: "Sidequest encyclopedia", eras: ["any"] as const, weight: 9, effects: [{ kind: "xp", delta: -30 }], flavor: "Three hours on Byzantine generals." },
  { id: 110, name: "Playlist discovery", eras: ["any"] as const, weight: 7, effects: [{ kind: "tempMult", mult: 1.08, ms: 480000, target: "xpPerSec" }], flavor: "Lo-fi to deep house pipeline." },
] as const

export function eventsForEra(era: Exclude<EraGate, "any">): GameEvent[] {
  return EVENTS.filter((e) => e.eras.includes("any") || e.eras.includes(era)) as unknown as GameEvent[]
}

