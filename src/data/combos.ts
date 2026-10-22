import type { Tag } from "./tags.ts"

/**
 * The kitchen: two things that go together make a combo, like mixing two emoji. A drop-in table of hand-written
 * jokes, one per combo; nothing generates them. The rules are in src/game/combos.ts.
 *
 * An ingredient is a catalog row you hold, a job of a given rank (whichever specialization's row it is), or a tag you
 * hold enough rows of. Origins will join this union when they exist; nothing else here needs to change for them.
 *
 * Effects are small on purpose. `idle` is $/s, `click` is $ and XP per click, `xp` is idle XP/s. A combo is 1 to 5
 * percent and the sum of each kind is capped at COMBO_CAP_PCT (a test pins both), added together, not compounded.
 */
export type ComboRowKind = "skill" | "gig" | "job" | "gear" | "capital"

export type ComboRef =
  | { kind: ComboRowKind; id: number }
  /** Holds a job of this rank, whichever specialization's row it is: the acting lead or the senior seat of any track. */
  | { kind: "jobRank"; rank: number }
  /** Holds at least `count` rows that carry this tag, across every catalog. */
  | { kind: "tag"; tag: Tag; count: number }

export type ComboEffect = { kind: "idle" | "click" | "xp"; pct: number }

export type Combo = {
  id: string
  a: ComboRef
  b: ComboRef
  name: string
  joke: string
  effect: ComboEffect
}

/** Most percent the combos of one effect kind can add up to. */
export const COMBO_CAP_PCT = 25

const skill = (id: number): ComboRef => ({ kind: "skill", id })
const gig = (id: number): ComboRef => ({ kind: "gig", id })
const job = (id: number): ComboRef => ({ kind: "job", id })
const jobAt = (rank: number): ComboRef => ({ kind: "jobRank", rank })
const gear = (id: number): ComboRef => ({ kind: "gear", id })
const capital = (id: number): ComboRef => ({ kind: "capital", id })
const tag = (name: Tag, count: number): ComboRef => ({ kind: "tag", tag: name, count })

// Rows in the order a career meets them, so a combo turns up every few minutes of play from the first skills to the last capital.
export const COMBOS: readonly Combo[] = [
  // Regex fluency + Bash scripting habit
  { id: "line-noise", a: skill(11), b: skill(12), name: "Line noise", joke: "Two skills that look like a cat walked across the keyboard.", effect: { kind: "click", pct: 1 } },
  // JavaScript fundamentals + TypeScript intro
  { id: "gradual-typing", a: skill(14), b: skill(17), name: "Gradual typing", joke: "You added types. Then you added any.", effect: { kind: "xp", pct: 1 } },
  // HTML/CSS landings + Utility CSS landings
  { id: "centering-a-div", a: skill(13), b: skill(23), name: "Centering a div", joke: "Solved in 2011, 2014, 2017 and again last week.", effect: { kind: "xp", pct: 1 } },
  // Git + GitHug hygiene + Deploy somewhere real
  { id: "friday-deploy", a: skill(5), b: skill(20), name: "Friday deploy", joke: "git push origin main, 4:55 p.m. What could go wrong.", effect: { kind: "idle", pct: 1 } },
  // Package manager fluency + Open-source first PR
  { id: "left-pad", a: skill(9), b: skill(53), name: "left-pad", joke: "Eleven lines that once held up the internet. You maintain them now.", effect: { kind: "xp", pct: 2 } },
  // Package manager fluency + Security hygiene
  { id: "node-modules-audit", a: skill(9), b: skill(60), name: "node_modules audit", joke: "You read every dependency. You have seen things.", effect: { kind: "click", pct: 1 } },
  // SQL + basic backend + Security hygiene
  { id: "little-bobby-tables", a: skill(26), b: skill(60), name: "Little Bobby Tables", joke: "You sanitize your inputs. His mom taught you that.", effect: { kind: "click", pct: 3 } },
  // Dockyard hello-world + Junior SWE
  { id: "works-on-my-machine", a: skill(29), b: job(2), name: "Works on my machine", joke: "So we shipped your machine.", effect: { kind: "idle", pct: 1 } },
  // Bash scripting habit + On-call rotation
  { id: "load-bearing-one-liner", a: skill(12), b: job(6), name: "Load-bearing one-liner", joke: "Written at 3 a.m. Still in prod. Nobody knows what it does.", effect: { kind: "idle", pct: 1 } },
  // DNS + domain portfolio + On-call rotation
  { id: "always-dns", a: gear(42), b: job(6), name: "It's always DNS", joke: "It was DNS. It is always DNS.", effect: { kind: "idle", pct: 2 } },
  // Desk lamp (bias) + Mentoring juniors
  { id: "rubber-duck", a: gear(3), b: skill(92), name: "Rubber duck", joke: "You explained the bug to the junior. They said nothing. It fixed itself.", effect: { kind: "click", pct: 1 } },
  // Raspberry Pie lab + Cluster kubectl 101
  { id: "k8s-on-a-pie", a: gear(17), b: skill(73), name: "k8s on a Pie", joke: "A four-node cluster that serves your blog to both of its readers.", effect: { kind: "idle", pct: 1 } },
  // Noise-cancelling headset + Incident commander drills
  { id: "pager-cancelling", a: gear(10), b: skill(85), name: "Pager-cancelling", joke: "Blocks every sound except the pager.", effect: { kind: "idle", pct: 1 } },
  // Lint + format discipline + Design doc practice
  { id: "naming-things", a: skill(21), b: skill(63), name: "Naming things", joke: "Thirty minutes on the variable name. Zero on the logic.", effect: { kind: "xp", pct: 1 } },
  // TypeScript intro + Testing (unit/e2e starter)
  { id: "it-compiles", a: skill(17), b: skill(28), name: "It compiles", joke: "The compiler is happy. The users have notes.", effect: { kind: "click", pct: 1 } },
  // LeetCrate Medium patterns + Algorithms notebook habit
  { id: "off-by-one", a: skill(49), b: skill(50), name: "Off by one", joke: "The loop runs one time too many. Or too few. Check again.", effect: { kind: "xp", pct: 1 } },
  // HTTP caching habit + Cache layer intro
  { id: "cache-invalidation", a: skill(35), b: skill(37), name: "Cache invalidation", joke: "One of the two hard problems. The other is naming this combo.", effect: { kind: "idle", pct: 1 } },
  // Ultrawide monitor + ten frontend rows
  { id: "responsive", a: gear(15), b: tag("frontend", 10), name: "Responsive", joke: "Looks perfect at 3440 pixels wide. Nobody else has that.", effect: { kind: "click", pct: 2 } },
  // Infra-as-code intro + Config-mgmt playbooks
  { id: "yaml-indentation", a: skill(72), b: skill(74), name: "YAML indentation", joke: "The deploy failed because of a space you cannot see.", effect: { kind: "idle", pct: 1 } },
  // CI/CD pipeline toy + Feature flag mental model
  { id: "flag-debt", a: skill(54), b: skill(59), name: "Flag debt", joke: "Four hundred flags. Nobody knows which one is the real one.", effect: { kind: "xp", pct: 1 } },
  // Any acting lead (rank 13, every track) + 1080p webcam
  { id: "on-mute", a: jobAt(13), b: gear(7), name: "You're on mute", joke: "Eleven people watched you explain it in silence.", effect: { kind: "click", pct: 1 } },
  // Three security rows + ten infra rows
  { id: "zero-trust", a: tag("security", 3), b: tag("infra", 10), name: "Zero trust", joke: "Trust no one. Especially the load balancer you configured yourself.", effect: { kind: "idle", pct: 1 } },
  // Twelve backend rows + twelve frontend rows
  { id: "full-stack-trace", a: tag("backend", 12), b: tag("frontend", 12), name: "Full-stack trace", joke: "The bug is in the frontend. And the backend. And the part between.", effect: { kind: "click", pct: 3 } },
  // Any Senior (rank 14, every track) + System design lightweight
  { id: "it-depends", a: jobAt(14), b: skill(62), name: "It depends", joke: "The senior answer to every question, and the correct one.", effect: { kind: "xp", pct: 2 } },
  // Distributed systems notes + Learn Temporal
  { id: "halting-problem", a: skill(87), b: skill(71), name: "Halting problem", joke: "Will the workflow finish? Temporal says yes. Turing says no.", effect: { kind: "idle", pct: 1 } },
  // AI-IDE workflow + LeetCrate Easy reps
  { id: "vibe-coding", a: skill(98), b: skill(18), name: "Vibe coding", joke: "Two Sum, solved in one prompt and four retries.", effect: { kind: "click", pct: 3 } },
  // Regex fluency + Prompt engineering habit
  { id: "regex-by-vibes", a: skill(11), b: skill(97), name: "Regex by vibes", joke: "You asked the model for the regex. Now you have three problems.", effect: { kind: "click", pct: 1 } },
  // LLM pairing habit + Production war-story journal
  { id: "context-window", a: skill(99), b: skill(86), name: "Context window", joke: "The agent forgot the incident. You never will.", effect: { kind: "xp", pct: 2 } },
  // Used mining GPU lot + Fine-tune toy LLM
  { id: "proof-of-work", a: gear(58), b: skill(103), name: "Proof of work", joke: "It mined coins, now it mines tokens. Same fan noise.", effect: { kind: "idle", pct: 2 } },
  // Workstation GPU + CUDA / GPU programming 101
  { id: "gpu-queue", a: gear(60), b: skill(100), name: "GPU queue", joke: "Your training run starts Thursday. Which Thursday is unclear.", effect: { kind: "idle", pct: 2 } },
  // Chatbot FAQ wrapper + Prompt engineering habit
  { id: "prompt-injection", a: gig(27), b: skill(97), name: "Prompt injection", joke: "The FAQ bot now offers refunds. All of them.", effect: { kind: "idle", pct: 1 } },
  // Security pentest remediation + Threat modeling habit
  { id: "pentest-report", a: gig(51), b: skill(61), name: "Pentest report", joke: "Forty findings. Thirty-nine are the same finding.", effect: { kind: "xp", pct: 1 } },
  // LLM eval harness contract + Testing (unit/e2e starter)
  { id: "evals", a: gig(54), b: skill(28), name: "Evals", joke: "Tests, but they vibe.", effect: { kind: "xp", pct: 2 } },
  // Five data rows + three AI rows
  { id: "garbage-in", a: tag("data", 5), b: tag("ai", 3), name: "Garbage in", joke: "Garbage in, garbage out, now with confidence scores.", effect: { kind: "xp", pct: 2 } },
  // Cold object vault + Immutable backup bunker
  { id: "schrodingers-backup", a: gear(35), b: gear(41), name: "Schrodinger's backup", joke: "It exists until somebody tries to restore it.", effect: { kind: "xp", pct: 1 } },
  // WhyCombinator batch investment + Prompt engineering habit
  { id: "wrapper-startup", a: capital(3), b: skill(97), name: "Wrapper startup", joke: "A thin layer over somebody else's API, valued at forty million.", effect: { kind: "idle", pct: 1 } },
  // Hold public AI ticker + ten AI rows
  { id: "bubble-wrap", a: capital(7), b: tag("ai", 10), name: "Bubble wrap", joke: "Priced for perfection. Delivered on a Tuesday.", effect: { kind: "idle", pct: 1 } },
  // Fab capacity offtake + Training hall (64)
  { id: "waiting-list", a: capital(12), b: gear(71), name: "Waiting list", joke: "The chips arrive next quarter. Every quarter.", effect: { kind: "idle", pct: 1 } },
  // Global edge network + Edge Workers edge
  { id: "edge-case", a: capital(17), b: skill(75), name: "Edge case", joke: "Runs everywhere. Debugs nowhere.", effect: { kind: "idle", pct: 1 } },
  // Mars precursor ops Co + Mars ops systems study
  { id: "round-trip", a: capital(22), b: skill(104), name: "Round trip", joke: "Twenty minutes to Mars and back. Your standup stays at fifteen.", effect: { kind: "idle", pct: 2 } },
  // Mars data center REIT + Mars habitat rack
  { id: "cold-storage", a: capital(24), b: gear(98), name: "Cold storage", joke: "The data is on Mars. So are the backups.", effect: { kind: "idle", pct: 2 } },
]
