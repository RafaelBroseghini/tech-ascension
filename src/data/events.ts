/**
 * Random events. Era-weighted. Mean wait is EVENT_MEAN_WAIT_MS (600s).
 *
 * Every row is a choice. A gift only adds money or XP. A trade swaps one for the other
 * (the minutes apply to both sides). Nothing only deducts. The runner prices `minutes`
 * from current earning rates, with a floor of 1% of the balance you hold.
 *
 * Optional `requires` gates a row on ownership. Omit it and the row stays eligible for its eras.
 * Fields are AND. Arrays are OR inside one field (any listed job, gig, or gear).
 * A missing or empty field is ignored. minJobRank is the highest rank among the jobs held. minGigs is cleared-gig
 * count. minGearOwned is the sum of owned gear copies.
 */

export type EraGate = "early" | "mid" | "upper" | "q3" | "end" | "any"
export type EventResource = "money" | "xp"

/** Yes adds this resource. No changes nothing. */
export type EventGift = { kind: "gift"; resource: EventResource; minutes: number }

/** Yes gains `gain` and pays the other resource. No changes nothing. */
export type EventTrade = { kind: "trade"; gain: EventResource; minutes: number }

export type EventOffer = EventGift | EventTrade

/** Optional progression gate — all listed fields are AND. Arrays are OR within the field. */
export type EventRequires = {
  minJobRank?: number
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
  offer: EventOffer
  flavor: string
  requires?: EventRequires
}

/** 10 minutes on average (was 240s, and 150s before that), so an event is a surprise, not a chore. */
export const EVENT_MEAN_WAIT_MS = 600_000

const gift = (resource: EventResource, minutes: number): EventGift => ({ kind: "gift", resource, minutes })
const trade = (gain: EventResource, minutes: number): EventTrade => ({ kind: "trade", gain, minutes })

export const EVENTS: readonly GameEvent[] = [
  { id: 1, name: "Viral GitHug star", eras: ["early", "mid"], weight: 4, offer: gift("xp", 15), flavor: "A forgotten repo hits the front page." },
  { id: 2, name: "Friendly senior review", eras: ["early", "mid"], weight: 9, offer: gift("xp", 4), flavor: "Kind, thorough comments on your PR." },
  { id: 3, name: "Broke laptop charger", eras: ["early"], weight: 8, offer: trade("xp", 6), flavor: "The brick died. A new one gets you back to the books." },
  { id: 4, name: "Hackathon win", eras: ["early", "mid"], weight: 3, offer: gift("money", 15), flavor: "Pizza, stickers, and a gift card with your name on it." },
  { id: 5, name: "Burnout weekend", eras: ["early", "mid"], weight: 7, offer: trade("money", 6), flavor: "Take the weekend off and invoice a tiny gig." },
  { id: 6, name: "LeetCrate streak freeze", eras: ["early"], weight: 7, offer: trade("xp", 6), flavor: "Buy the freeze token and keep the streak's lessons." },
  { id: 7, name: "Tutorial deep dive", eras: ["early"], weight: 8, offer: gift("xp", 6), flavor: "Four hours of YouToob that actually stick." },
  { id: 8, name: "CS book all-nighter", eras: ["early"], weight: 6, offer: trade("xp", 10), flavor: "Buy the book and read until the algorithm clicks." },
  { id: 9, name: "Discourd rubber duck", eras: ["early", "mid"], weight: 9, offer: gift("xp", 4), flavor: "Someone says 'yeah that error is normal.'" },
  { id: 10, name: "FreeCodeChamp cert", eras: ["early"], weight: 5, offer: gift("xp", 10), flavor: "Another badge, another dopamine hit." },
  { id: 11, name: "Imposter spiral", eras: ["early", "mid"], weight: 7, offer: trade("xp", 6), flavor: "Pay a coach to pull you out of the timeline." },
  { id: 12, name: "Notebook before IDE", eras: ["early"], weight: 5, offer: gift("xp", 10), flavor: "You finally understand the algorithm on paper." },
  { id: 13, name: "Broken tutorial", eras: ["early"], weight: 7, offer: trade("xp", 6), flavor: "The video is three versions behind. Buy the current course." },
  { id: 14, name: "First green CI", eras: ["early", "mid"], weight: 6, offer: gift("xp", 10), flavor: "Checks pass; you screenshot it.", requires: { minGigs: 0, minGearOwned: 0 } },
  { id: 15, name: "Merge conflict morning", eras: ["early", "mid"], weight: 8, offer: trade("money", 6), flavor: "Bill the rebase hour instead of learning from it." },
  { id: 16, name: "Stack Overblow upvote", eras: ["early"], weight: 7, offer: gift("xp", 6), flavor: "Your answer helps a stranger." },
  { id: 17, name: "Family asks when you'll get a job", eras: ["early"], weight: 5, offer: trade("money", 10), flavor: "Take the first offer on the table." },
  { id: 18, name: "Library wifi grind", eras: ["early"], weight: 7, offer: gift("xp", 6), flavor: "Quiet hours, loud keyboard." },
  { id: 19, name: "Bought another sale course", eras: ["early"], weight: 6, offer: trade("xp", 10), flavor: "Sale price. You might even finish this one." },
  { id: 20, name: "Pomodoro perfect day", eras: ["early", "mid"], weight: 5, offer: gift("xp", 10), flavor: "Eight clean tomatoes." },
  { id: 21, name: "Open-source bounty", eras: ["mid", "upper"], weight: 5, offer: gift("money", 10), flavor: "Maintainer merges and pays out.", requires: { minGigs: 3 } },
  { id: 22, name: "Client ghosted invoice", eras: ["mid"], weight: 8, offer: trade("money", 6), flavor: "Spend the afternoon chasing the invoice.", requires: { minGigs: 2 } },
  { id: 23, name: "Conference scholarship", eras: ["mid", "upper"], weight: 3, offer: gift("xp", 15), flavor: "Badge, tote, wrinkles.", requires: { minGigs: 5 } },
  { id: 24, name: "LeetCrate contest medal", eras: ["mid"], weight: 4, offer: gift("xp", 15), flavor: "You peak for five minutes." },
  { id: 25, name: "Cloud free credits", eras: ["mid", "upper"], weight: 7, offer: gift("money", 6), flavor: "Credits that feel larger than they are.", requires: { minGearOwned: 1, gearIds: [7] } },
  { id: 26, name: "Prod footgun", eras: ["mid", "upper"], weight: 5, offer: trade("xp", 10), flavor: "Pay for the rollback. The postmortem sticks.", requires: { minJobRank: 2 } },
  { id: 27, name: "Recruiter spam tax", eras: ["mid", "upper"], weight: 10, offer: trade("money", 4), flavor: "Take the screen and lose the afternoon.", requires: { minJobRank: 1 } },
  { id: 28, name: "Orange-site front page", eras: ["mid", "upper"], weight: 3, offer: gift("money", 15), flavor: "Show HN goes well.", requires: { minGigs: 8 } },
  { id: 29, name: "Quiet-hours focus", eras: ["mid"], weight: 6, offer: gift("xp", 10), flavor: "Nobody pings you." },
  { id: 30, name: "Five-star Upwerk review", eras: ["mid"], weight: 5, offer: gift("money", 10), flavor: "JSS ticks up.", requires: { gigIds: [4] } },
  { id: 31, name: "Scope creep hydra", eras: ["mid"], weight: 7, offer: trade("money", 6), flavor: "They pay for 'one more thing.' You lose the evening.", requires: { minGigs: 3 } },
  { id: 32, name: "Retainer renewed", eras: ["mid"], weight: 5, offer: gift("money", 10), flavor: "Monthly maintenance sticks.", requires: { gigIds: [8, 22] } },
  { id: 33, name: "Tax software coupon", eras: ["mid"], weight: 4, offer: trade("xp", 15), flavor: "Buy TurboWhatever and finally learn the forms.", requires: { minGigs: 5 } },
  { id: 34, name: "Pairing with a mentor", eras: ["mid"], weight: 7, offer: gift("xp", 6), flavor: "You learn three shortcuts.", requires: { minJobRank: 2 } },
  { id: 35, name: "On-call false alarm", eras: ["mid", "upper"], weight: 8, offer: trade("money", 6), flavor: "Bill the 3am page. Sleep is the other cost.", requires: { jobIds: [6] } },
  { id: 36, name: "Office pizza friday", eras: ["mid"], weight: 7, offer: gift("xp", 6), flavor: "Morale: slightly up.", requires: { minJobRank: 2 } },
  { id: 37, name: "Performance review soft", eras: ["mid"], weight: 4, offer: gift("money", 15), flavor: "Meets expectations, plus a real raise.", requires: { minJobRank: 7 } },
  { id: 38, name: "Denied expense monitor", eras: ["mid"], weight: 5, offer: trade("xp", 10), flavor: "Buy the ultrawide yourself. The extra screen pays you back in focus.", requires: { minJobRank: 2 } },
  { id: 39, name: "Internal tool demo win", eras: ["mid", "upper"], weight: 3, offer: gift("xp", 15), flavor: "Team adopts your script.", requires: { minJobRank: 7 } },
  { id: 40, name: "Broken staging again", eras: ["mid"], weight: 9, offer: trade("xp", 4), flavor: "Pay for the afternoon and fix the compose file properly.", requires: { minGigs: 4 } },
  { id: 41, name: "Angel intro coffee", eras: ["upper"], weight: 3, offer: gift("money", 15), flavor: "They forward your deck.", requires: { minJobRank: 14 } },
  { id: 42, name: "GPU lottery", eras: ["upper", "q3"], weight: 2, offer: gift("money", 30), flavor: "Scalper cancels. The card is yours.", requires: { minGearOwned: 1, gearIds: [9, 10, 17] } },
  { id: 43, name: "Term sheet nibble", eras: ["upper"], weight: 3, offer: gift("money", 15), flavor: "Soft circle, hard lawyers.", requires: { minJobRank: 14 } },
  { id: 44, name: "Churn spike Monday", eras: ["upper"], weight: 6, offer: trade("xp", 10), flavor: "Discount the logo and learn why they left.", requires: { minJobRank: 14 } },
  { id: 45, name: "Competitor launches clone", eras: ["upper"], weight: 5, offer: trade("money", 10), flavor: "Ship the rush response and invoice it.", requires: { minJobRank: 14 } },
  { id: 46, name: "Key hire accepts", eras: ["upper", "q3"], weight: 3, offer: gift("xp", 15), flavor: "Staff ML starts Monday.", requires: { minJobRank: 16 } },
  { id: 47, name: "Key hire ghosts", eras: ["upper"], weight: 5, offer: trade("xp", 10), flavor: "Pay a search firm and rebuild the pipeline.", requires: { minJobRank: 15 } },
  { id: 48, name: "Board meeting grill", eras: ["upper"], weight: 4, offer: trade("money", 15), flavor: "Give up the night of study and keep the round.", requires: { minJobRank: 16 } },
  { id: 49, name: "Viral product hunt", eras: ["upper"], weight: 3, offer: gift("money", 15), flavor: "#3 of the day.", requires: { minJobRank: 14 } },
  { id: 50, name: "Compliance auditor arrives", eras: ["upper"], weight: 5, offer: trade("xp", 10), flavor: "Pay the auditor. The evidence folders teach you the system.", requires: { gigIds: [35] } },
  { id: 51, name: "Customer design partner", eras: ["upper"], weight: 5, offer: gift("money", 10), flavor: "They pay to shape the roadmap.", requires: { minJobRank: 14 } },
  { id: 52, name: "PR disaster post", eras: ["upper"], weight: 4, offer: trade("xp", 15), flavor: "Hire comms and learn how the story actually lands.", requires: { minJobRank: 14 } },
  { id: 53, name: "Acqui-hire sniff", eras: ["upper"], weight: 2, offer: gift("money", 30), flavor: "BigCo asks for a quiet chat.", requires: { minJobRank: 18 } },
  { id: 54, name: "Runway anxiety night", eras: ["upper"], weight: 7, offer: trade("money", 6), flavor: "Take a bridge note. The spreadsheet can wait.", requires: { minJobRank: 14 } },
  { id: 55, name: "Seed angel wires", eras: ["upper"], weight: 3, offer: gift("money", 15), flavor: "First close hits the bank.", requires: { minJobRank: 14 } },
  { id: 56, name: "Lawyer invoice", eras: ["upper"], weight: 7, offer: trade("xp", 6), flavor: "Pay the billable hours and read every clause.", requires: { minJobRank: 14 } },
  { id: 57, name: "Office lease signed", eras: ["upper"], weight: 3, offer: trade("xp", 15), flavor: "Sign the lease. The room is where the next design happens.", requires: { minJobRank: 16 } },
  { id: 58, name: "Demo day high", eras: ["upper"], weight: 3, offer: gift("xp", 15), flavor: "Adrenaline coding.", requires: { minJobRank: 14 } },
  { id: 59, name: "Pipeline slipped a quarter", eras: ["upper", "q3"], weight: 5, offer: trade("money", 10), flavor: "Push the team onto the deal and drop the research week.", requires: { minJobRank: 16 } },
  { id: 60, name: "Open weights release buzz", eras: ["upper", "q3"], weight: 4, offer: gift("xp", 15), flavor: "The timeline loses its mind.", requires: { minJobRank: 16 } },
  { id: 61, name: "Export license delay", eras: ["q3"], weight: 6, offer: trade("xp", 10), flavor: "Hire the export specialist and learn the paperwork.", requires: { minJobRank: 18 } },
  { id: 62, name: "Fab yield excursion", eras: ["q3"], weight: 5, offer: trade("xp", 10), flavor: "Pay the rework. Lot #4421 becomes a lesson.", requires: { minJobRank: 20 } },
  { id: 63, name: "GPU OOM storm", eras: ["q3"], weight: 7, offer: trade("xp", 6), flavor: "Buy the extra memory and learn why gpu-17 melted.", requires: { minGearOwned: 1, gearIds: [17, 18, 20, 21] } },
  { id: 64, name: "Eval score uptick", eras: ["q3"], weight: 4, offer: gift("xp", 15), flavor: "Bench likes you today.", requires: { minJobRank: 18 } },
  { id: 65, name: "Eval score regression", eras: ["q3"], weight: 5, offer: trade("xp", 10), flavor: "Fund the redo and keep the apology off the blog.", requires: { minJobRank: 18 } },
  { id: 66, name: "HBM allocation win", eras: ["q3"], weight: 3, offer: trade("xp", 15), flavor: "Pay for the allocation. The bring-up teaches the stack.", requires: { gearIds: [18, 20, 21, 78] } },
  { id: 67, name: "Safety red-team finds spicy", eras: ["q3"], weight: 5, offer: trade("xp", 10), flavor: "Pay for the patch window and read every finding.", requires: { minJobRank: 18 } },
  { id: 68, name: "Tape-out champagne", eras: ["q3"], weight: 2, offer: gift("money", 30), flavor: "Masks are in.", requires: { minJobRank: 22 } },
  { id: 69, name: "Mask defect scare", eras: ["q3"], weight: 4, offer: trade("xp", 15), flavor: "Pay the rework invoice and learn the defect.", requires: { minJobRank: 22 } },
  { id: 70, name: "Paper accepted at big venue", eras: ["q3", "end"], weight: 3, offer: gift("xp", 15), flavor: "Camera-ready Tuesday.", requires: { minJobRank: 18 } },
  { id: 71, name: "Power bill shock", eras: ["q3", "end"], weight: 6, offer: trade("xp", 10), flavor: "Pay the utility and retune the training schedule.", requires: { minGearOwned: 3 } },
  { id: 72, name: "Cluster reservation sniped", eras: ["q3"], weight: 5, offer: trade("xp", 10), flavor: "Buy the spot market and learn the queue.", requires: { gearIds: [68, 71] } },
  { id: 73, name: "Strategic foundry partner", eras: ["q3"], weight: 2, offer: gift("money", 30), flavor: "Capacity locked for two years.", requires: { minJobRank: 22 } },
  { id: 74, name: "Customs holds a shipment", eras: ["q3"], weight: 5, offer: trade("xp", 10), flavor: "Pay the broker. The GPUs, and the lesson, get moving.", requires: { minGearOwned: 2, gearIds: [17, 18] } },
  { id: 75, name: "Benchmark leaderboard #1", eras: ["q3"], weight: 3, offer: gift("money", 15), flavor: "For a weekend.", requires: { minJobRank: 20 } },
  { id: 76, name: "Talent poaching war", eras: ["q3"], weight: 5, offer: trade("xp", 10), flavor: "Match the offers and learn what the market actually pays.", requires: { minJobRank: 19 } },
  { id: 77, name: "Quiet research breakthrough", eras: ["q3"], weight: 3, offer: gift("xp", 15), flavor: "Nobody posts it yet.", requires: { minJobRank: 18 } },
  { id: 78, name: "Board demands profitability", eras: ["q3"], weight: 4, offer: trade("money", 15), flavor: "Cut the lab week and book the revenue.", requires: { minJobRank: 20 } },
  { id: 79, name: "Government grant", eras: ["q3", "end"], weight: 2, offer: gift("money", 30), flavor: "Strings attached, money real.", requires: { minJobRank: 22 } },
  { id: 80, name: "Supply-chain ransomware near-miss", eras: ["q3"], weight: 3, offer: trade("xp", 15), flavor: "Pay the rotation and learn every secret you touched.", requires: { minJobRank: 17 } },
  { id: 81, name: "Mars dust storm", eras: ["end"], weight: 4, offer: trade("xp", 15), flavor: "Buy the filters. Hab sensors stop screaming and you learn the storm.", requires: { minGearOwned: 1, gearIds: [27, 28, 100] } },
  { id: 82, name: "Tax bill surprise", eras: ["mid", "upper", "q3", "end"], weight: 7, offer: trade("xp", 6), flavor: "Pay the quarter and learn the structure.", requires: { minJobRank: 7 } },
  { id: 83, name: "Orbital window opens", eras: ["end"], weight: 3, offer: gift("money", 15), flavor: "Launch slot secured.", requires: { gearIds: [26, 94] } },
  { id: 84, name: "Debris near-miss", eras: ["end"], weight: 5, offer: trade("xp", 10), flavor: "Pay for the avoidance burn and log how close it was.", requires: { gearIds: [26] } },
  { id: 85, name: "Undersea cable cut", eras: ["end"], weight: 4, offer: trade("xp", 15), flavor: "Buy the long-haul transit and map the failover.", requires: { minJobRank: 24 } },
  { id: 86, name: "Micro-reactor online", eras: ["end"], weight: 2, offer: gift("money", 30), flavor: "Baseload for the GPU halls.", requires: { gearIds: [106] } },
  { id: 87, name: "Habitat morale crisis", eras: ["end"], weight: 5, offer: trade("xp", 10), flavor: "Fly in something green. People remember Earth and get back to work.", requires: { gearIds: [27] } },
  { id: 88, name: "Dust-proofing breakthrough", eras: ["end"], weight: 3, offer: gift("xp", 15), flavor: "Filters last a season.", requires: { gearIds: [101] } },
  { id: 89, name: "Earth press tour", eras: ["end"], weight: 3, offer: gift("money", 15), flavor: "You're on every thumbnail.", requires: { minJobRank: 28 } },
  { id: 90, name: "Insurance skyrockets", eras: ["end"], weight: 6, offer: trade("xp", 10), flavor: "Pay the premium and learn what the actuaries priced.", requires: { gearIds: [27, 28] } },
  { id: 91, name: "Solar flare yellow alert", eras: ["end"], weight: 5, offer: trade("money", 10), flavor: "Take the hazard pay and give up the shift of study.", requires: { minJobRank: 26 } },
  { id: 92, name: "Ice mine surplus", eras: ["end"], weight: 3, offer: gift("money", 15), flavor: "Water means compute coolant.", requires: { gearIds: [102] } },
  { id: 93, name: "Rival megacampus delays", eras: ["end"], weight: 3, offer: gift("money", 15), flavor: "You take their customers.", requires: { minJobRank: 30 } },
  { id: 94, name: "UN hearing", eras: ["end"], weight: 4, offer: trade("xp", 15), flavor: "Fund the counsel and learn the regulation before it lands.", requires: { minJobRank: 28 } },
  { id: 95, name: "Successful booster catch", eras: ["end"], weight: 2, offer: gift("money", 30), flavor: "Reuse math finally works.", requires: { gearIds: [26, 94] } },
  { id: 96, name: "Crew rotation delayed", eras: ["end"], weight: 5, offer: trade("xp", 10), flavor: "Pay the overtime and write down what the tired shift missed.", requires: { gearIds: [27] } },
  { id: 97, name: "Latency to Earth drops", eras: ["end"], weight: 3, offer: gift("money", 15), flavor: "New relay online.", requires: { gearIds: [25, 93] } },
  { id: 98, name: "Black budget contract", eras: ["end"], weight: 1, offer: gift("money", 45), flavor: "You don't ask questions.", requires: { minJobRank: 30 } },
  { id: 99, name: "Farm dome blight", eras: ["end"], weight: 5, offer: trade("xp", 10), flavor: "Import the calories and learn the dome's failure.", requires: { gearIds: [27] } },
  { id: 100, name: "Megacampus ribbon cutting", eras: ["end"], weight: 2, offer: gift("xp", 30), flavor: "Rust sky, bright future.", requires: { gearIds: [107, 108, 110] } },
  { id: 101, name: "Coffee spill on keyboard", eras: ["any"], weight: 9, offer: trade("xp", 4), flavor: "Replace the board. You learn how the switches actually sit." },
  { id: 102, name: "Lucky rubber duck", eras: ["any"], weight: 7, offer: gift("xp", 6), flavor: "The duck knew all along." },
  { id: 103, name: "Timezone meeting at 6am", eras: ["any"], weight: 8, offer: trade("money", 6), flavor: "Bill the early call and skip the morning study." },
  { id: 104, name: "Documentation day", eras: ["any"], weight: 6, offer: gift("xp", 10), flavor: "Future-you sends thanks." },
  { id: 105, name: "Renamed a variable well", eras: ["any"], weight: 7, offer: gift("xp", 6), flavor: "Clarity is a drug." },
  { id: 106, name: "Accidental rm", eras: ["any"], weight: 4, offer: trade("xp", 15), flavor: "Pay for the backup restore and learn the flags you typed." },
  { id: 107, name: "New mechanical switch", eras: ["any"], weight: 5, offer: trade("xp", 10), flavor: "Buy the switches. The thock comes with a teardown." },
  { id: 108, name: "Eye strain tax", eras: ["any"], weight: 7, offer: trade("xp", 6), flavor: "Buy the drops and the lamp. The next chapter is readable." },
  { id: 109, name: "Sidequest encyclopedia", eras: ["any"], weight: 9, offer: trade("xp", 4), flavor: "Buy the papers on Byzantine generals and actually finish them." },
  { id: 110, name: "Playlist discovery", eras: ["any"], weight: 7, offer: gift("xp", 6), flavor: "Lo-fi to deep house pipeline." },
]

export function eventsForEra(era: Exclude<EraGate, "any">): GameEvent[] {
  return EVENTS.filter((e) => e.eras.includes("any") || e.eras.includes(era))
}
