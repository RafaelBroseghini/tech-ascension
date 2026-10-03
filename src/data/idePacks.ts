import type { Lang } from "./overlays.ts"
import type { Era } from "./capital.ts"
import { resolvePack } from "./ideProblems.ts"

/**
 * IDE bands follow capital art ids. File-era bands resolve to 1–20 LeetCode-style tabs
 * (see ideProblemPools.ts); q3 is inbox; end is slides.
 */

export type IdeFile = { path: string; lang: Lang; code: string }
export type IdeEmail = { from: string; subject: string; body: string }
export type IdeSlide = { title: string; bullets: readonly string[] }

type PackBase = {
  id: string
  /** Short name for the status bar and the explorer header. */
  label: string
  era: Era
  /** The band starts at this tier id and runs to the next pack's `fromTier - 1`. */
  fromTier: number
}

export type FilePack = PackBase & { kind: "files"; files: readonly IdeFile[] }
export type InboxPack = PackBase & { kind: "inbox"; emails: readonly IdeEmail[] }
export type DeckPack = PackBase & { kind: "deck"; slides: readonly IdeSlide[] }
export type IdePack = FilePack | InboxPack | DeckPack

const EMPTY_FILES: readonly IdeFile[] = []

export const IDE_PACKS: readonly IdePack[] = [
  { id: "fizzbuzz", kind: "files", label: "High school", era: "early", fromTier: 0, files: EMPTY_FILES },
  { id: "two_sum", kind: "files", label: "College", era: "early", fromTier: 7, files: EMPTY_FILES },
  { id: "reverse_list", kind: "files", label: "Bootcamp", era: "early", fromTier: 13, files: EMPTY_FILES },
  { id: "debounce", kind: "files", label: "Internship", era: "mid", fromTier: 19, files: EMPTY_FILES },
  { id: "search", kind: "files", label: "Junior SWE", era: "mid", fromTier: 23, files: EMPTY_FILES },
  { id: "workers", kind: "files", label: "Mid-level", era: "mid", fromTier: 27, files: EMPTY_FILES },
  { id: "finetune", kind: "files", label: "Senior SWE", era: "mid", fromTier: 31, files: EMPTY_FILES },
  { id: "ratelimit", kind: "files", label: "Staff", era: "upper", fromTier: 34, files: EMPTY_FILES },
  { id: "lru", kind: "files", label: "Principal", era: "upper", fromTier: 37, files: EMPTY_FILES },
  { id: "attention", kind: "files", label: "Distinguished", era: "upper", fromTier: 41, files: EMPTY_FILES },
  {
    id: "fab",
    kind: "inbox",
    label: "Foundry",
    era: "q3",
    fromTier: 45,
    emails: [
      {
        from: "foundry-ops@",
        subject: "Yield excursion lot #4421",
        body: "Lot #4421 dropped 4.2% vs baseline. Holding tape-out. Need your sign-off on reticle check.",
      },
      {
        from: "legal@",
        subject: "Export control checklist",
        body: "Reminder: any model weight transfer >X params needs license review before Friday cut.",
      },
      {
        from: "cluster-bot@",
        subject: "CUDA OOM on node gpu-17",
        body: "Auto-killed training job `fm-sft-92`. Free 2 nodes or reduce batch.",
      },
      {
        from: "mgr@",
        subject: "RE: RE: PTO 12/23–12/27 (approved)",
        body: "Approved in Workday. Calendar still shows you on-call — ignore, ticket IT-8841 is open. Enjoy the holidays.",
      },
      {
        from: "gov-affairs@",
        subject: "BIS questions on lot #4421 tooling",
        body: "Commerce wants a written timeline for when the reticle left the US clean room. Legal is looped. Do not reply-all to the agency address.",
      },
      {
        from: "facilities@",
        subject: "Badge expriation tomorow",
        body: "Hi, your badge expiers tommorow at midnigt. Pleae stop by receiption with two forms of ID or you will be escorted off site per policy 4.2.",
      },
      {
        from: "enablement@",
        subject: "Mandatory: export control refresher (45 min)",
        body: "Completion due EOD Friday. Your manager gets a weekly non-compliance report. The module is the same as last year; click through at 1.5x if needed.",
      },
    ],
  },
  {
    id: "frontier",
    kind: "inbox",
    label: "Frontier lab",
    era: "q3",
    fromTier: 50,
    emails: [
      {
        from: "evals@",
        subject: "SWE-bench delta \u22120.4",
        body: "Nightly run is 0.4 points under yesterday. Within noise, but it is the third night in a row. Want a bisect on the data mix?",
      },
      {
        from: "safety@",
        subject: "Red-team notes",
        body: "Two jailbreaks reproduced on the new checkpoint. Writeups attached. Release stays gated until both are closed.",
      },
      {
        from: "board-assistant@",
        subject: "Deck due Friday",
        body: "The board wants the compute roadmap and a safety summary on one page each. Draft by Thursday noon, please.",
      },
      {
        from: "leave-system@",
        subject: "PTO request #88102 — approved",
        body: "Your request for Mar 4–8 was auto-approved. Coverage note: you are still listed as DRI on the eval harness migration. Please update the runbook before you leave.",
      },
      {
        from: "policy@",
        subject: "Senate staff briefing — talking points",
        body: "Staff for the AI oversight subcommittee asked for a 30-minute readout on pre-release evals. Use the approved deck only; no live demos. RSVP by noon.",
      },
      {
        from: "culture@",
        subject: "You're invted: resilience circle + snacks",
        body: "Join us Thursday 4pm to process recent org changes over kombucha and KIND bars. Attendance is strongly encouaged. Calendar hold sent seperately.",
      },
      {
        from: "procurement@",
        subject: "Vendor onboarding: DocuSign loop",
        body: "Your GPU maintenance SOW is stuck in step 7 of 11. Finance needs a cost center and a business justification that mentions 'strategic alignment' at least twice.",
      },
    ],
  },
  {
    id: "edge",
    kind: "deck",
    label: "Orbital",
    era: "end",
    fromTier: 54,
    slides: [
      { title: "Edge inference SLA", bullets: ["p99 < 80ms", "regional failover", "cache embeddings at PoP"] },
      { title: "Sync delay budget", bullets: ["orbit round trip: 40 to 600 ms by shell", "budget 2x delay per weight chunk", "bulk QoS, never ahead of serving"] },
      { title: "Failover map", bullets: ["three regions per continent", "drain, then re-route to the nearest PoP", "serve stale embeddings before serving nothing"] },
    ],
  },
  {
    id: "mars",
    kind: "deck",
    label: "Mars",
    era: "end",
    fromTier: 59,
    slides: [
      { title: "Habitat power", bullets: ["solar + micro-reactor", "shed nonessential at <90%", "spin GPUs at >120%"] },
      { title: "GPU shed policy", bullets: ["life support is never shed", "training pauses first", "inference degrades before it drops"] },
      { title: "Dust storm runbook", bullets: ["solar can fall 60% in hours", "checkpoint, then throttle loads", "reactor carries the base, GPUs idle"] },
    ],
  },
]

export const PACK_NOUN: Record<IdePack["kind"], string> = { files: "files", inbox: "inbox", deck: "deck" }

function bandEndTier(fromTier: number): number {
  const next = IDE_PACKS.find((pack) => pack.fromTier > fromTier)
  return (next?.fromTier ?? 67) - 1
}

/** The pack for the highest owned art id (0 = nothing bought yet). */
export function packForTier(tierId: number, tabArtId: number = tierId): IdePack {
  let pick = IDE_PACKS[0] as IdePack
  for (const pack of IDE_PACKS) {
    if (pack.fromTier <= tierId) pick = pack
  }
  return resolvePack(pick, tabArtId, bandEndTier(pick.fromTier))
}

export function packsInEra(era: Era): IdePack[] {
  return IDE_PACKS.filter((pack) => pack.era === era)
}

/** The pack an era shows while it is only being browsed in the shop: its first band. */
export function previewPackForEra(era: Era): IdePack {
  const pack = packsInEra(era)[0] ?? (IDE_PACKS[0] as IdePack)
  return resolvePack(pack, pack.fromTier, bandEndTier(pack.fromTier))
}

export type IdeItem = { key: string; label: string; detail: string }

/** What the tab bar and explorer list for a pack, in order. */
export function itemsOf(pack: IdePack): IdeItem[] {
  if (pack.kind === "files") {
    return pack.files.map((file) => ({ key: file.path, label: file.path.split("/").pop() ?? file.path, detail: file.path }))
  }
  if (pack.kind === "inbox") {
    return pack.emails.map((mail) => ({ key: mail.subject, label: mail.subject, detail: mail.from }))
  }
  return pack.slides.map((slide, index) => ({ key: slide.title, label: slide.title, detail: `${index + 1}` }))
}
