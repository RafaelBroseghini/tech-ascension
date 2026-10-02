import type { Era } from "./tiers.ts"

export type SpriteSubject = {
  key: string
  name: string
  subject: string
}

/** One illustrated subject per tier. Art lives at public/sprites/{key}.webp (512px), where key is the stage key from tiers.ts. `start.webp` is the opening scene shown before the first purchase. */
export const SPRITE_SUBJECTS: readonly SpriteSubject[] = [
  { key: "used-laptop", name: "Used laptop", subject: "a battered laptop glowing with faint green runes on a cluttered desk" },
  { key: "stack-overblow", name: "Stack Overblow account", subject: "a floating stained-glass browser window, an upvote spirit rising above a scroll of answers" },
  { key: "freecodechamp", name: "FreeCodeChamp streak", subject: "a sacred green flame over a laptop, a streak of day-crystals burning in a row" },
  { key: "raspberry-pie", name: "Raspberry Pie", subject: "a credit-card computer on a workbench beside a steaming raspberry pie" },
  { key: "youtoob-intro", name: "YouToob CS / ML intro", subject: "a crystal ball playing a lesson of neural-net constellations" },
  { key: "terminal-rice", name: "Terminal rice (dotfiles)", subject: "a spell-mirror terminal where rice sprouts from the keyboard" },
  { key: "personal-githug", name: "Personal GitHug", subject: "a cat-octopus familiar guarding a mosaic of green contribution tiles" },
  { key: "mech-keyboard", name: "Thocky mechanical keyboard", subject: "an artisan keyboard with jewel keycaps and golden thock ripples" },
  { key: "portfolio-gaggle", name: "Portfolio + Gaggle notebook", subject: "a spellbook of notebooks, a golden medal, and a stained-glass portfolio" },
  { key: "free-notebook-gpu", name: "Free cloud-notebook GPU", subject: "a floating notebook with a chip-sun above it and an hourglass of free tier running out" },
  { key: "hackathon-weekend", name: "Hackathon weekend", subject: "a midnight hackathon camp of pizza, sticky notes and glowing laptops" },
  { key: "mac-minnie", name: "Mac Minnie home server", subject: "a small silver cube server on a shelf beside a bowl of mac and cheese" },
  { key: "oss-ml-pr", name: "Open-source ML PR", subject: "two rivers of light merging under a wax-sealed check rune" },
  { key: "mining-rig-gpus", name: "Basement mining-rig GPUs", subject: "a basement rack of mismatched fan-cooled graphics cards under one bare bulb" },
  { key: "bootcamp", name: "Bootcamp / CS + ML electives", subject: "a grand academy hall with a giant textbook and a GPU crystal" },
  { key: "local-quantized-model", name: "Quantized model on a laptop", subject: "a sleeping crystal-wool llama curled inside an open laptop" },
  { key: "internship", name: "Internship (SWE / ML)", subject: "an apprentice's alcove with a glowing badge and twin scrying mirrors" },
  { key: "hacker-newz", name: "Hacker Newz front page", subject: "a tower bulletin board with one scroll blazing at the top and visitors swarming in" },
  { key: "junior-swe", name: "Junior SWE", subject: "a hooded coder between two scrying mirrors as deploy sparks burst" },
  { key: "dockyard", name: "Dockyard containers", subject: "a blue whale carrying stacked sealed cargo containers into harbor" },
  { key: "pytorchy-tensorflux", name: "PyTorchy / TensorFlux fluency", subject: "a blazing torch of light circled by crystal tensors" },
  { key: "cubernetes", name: "Cubernetes cluster", subject: "a ship's helm wheel steering a fleet of linked container pods" },
  { key: "prod-ml-pipeline", name: "Production ML pipeline", subject: "an aqueduct of light carrying data from a well, through a forge, to a serving tower" },
  { key: "mid-ml-engineer", name: "Mid-level ML engineer", subject: "an engineer mage conducting a holographic ROC curve" },
  { key: "openklaw", name: "OpenKlaw personal agent", subject: "a brass claw-crane machine with a small automaton picking up your tasks" },
  { key: "first-llm-finetune", name: "Fine-tune your first LLM", subject: "a small radiant model orb on an altar of tuning dials" },
  { key: "vibe-coded-app", name: "Vibe-coded weekend app", subject: "a dreamy coder in a hammock as an app materializes from swirling light" },
  { key: "ship-ai-feature", name: "Ship an AI feature", subject: "a magic mirror with a sparkle toggle and a rocket launching out" },
  { key: "senior-ml-swe", name: "Senior ML / SWE", subject: "an archmage before a slate wall of glowing architecture diagrams" },
  { key: "tool-plug-server", name: "Tool-plug server for agents", subject: "a tool belt of glowing gadgets plugged into one central server crystal" },
  { key: "model-roadmap", name: "Own the model roadmap", subject: "a realm map with a glowing roadmap path and a pin on a model orb" },
  { key: "staff-ml-engineer", name: "Staff ML engineer", subject: "a crowned staff above a tree of small mages" },
  { key: "principal-ai-architect", name: "Principal AI architect", subject: "a colossal blueprint of a model-serving tower over a drafting table" },
  { key: "frontier-llm-lab", name: "Join a frontier LLM lab", subject: "a glass observatory lab lined with glowing GPU rune-racks" },
  { key: "open-weights-drop", name: "Open-weights drop on the model hub", subject: "a treasure chest spilling golden weights into a village square" },
  { key: "small-foundation-model", name: "Train a small foundation model", subject: "a tiny golden brain training in an alchemical glass pod" },
  { key: "ai-saas", name: "Launch your AI SaaS", subject: "a golden scrying pool of revenue coins with a rocket blasting off" },
  { key: "coding-agent-swarm", name: "Coding-agent swarm", subject: "a hall of clockwork coders typing in parallel under a human conductor" },
  { key: "angel-stake", name: "Angel stake in AI startups", subject: "angel wings over seedling startups sprouting from gold" },
  { key: "found-ai-company", name: "Found your AI company", subject: "a founder's carved desk beneath a guild sign and banners" },
  { key: "whycombinator-batch", name: "WhyCombinator — LLM product batch", subject: "a demo-day stage with a single spotlight on a golden emblem" },
  { key: "series-a", name: "Series A (you own majority)", subject: "term-sheet scrolls with wax seals beside a mostly-gold pie" },
  { key: "acquire-rival", name: "Acquire a rival AI startup", subject: "a golden gauntlet crushing a rival's banner and tower" },
  { key: "public-ai-company", name: "Hold a public AI / chip company", subject: "a ticker obelisk and a chip die in a glass reliquary" },
  { key: "foundation-model-team", name: "Hire a foundation-model team", subject: "researchers circling a giant violet model core" },
  { key: "gpu-supercluster", name: "Private GPU supercluster", subject: "a cathedral aisle of towering GPU monoliths" },
  { key: "blackwall-preorder", name: "Blackwall GPU preorder", subject: "an obsidian monolith GPU with a long queue of petitioners" },
  { key: "frontier-llm", name: "Train a frontier LLM", subject: "a planet-sized sphere of violet neural lightning" },
  { key: "inference-api-market", name: "Own the inference API market", subject: "a crystal globe ringed by gateway arches and streaking traffic" },
  { key: "chip-design-house", name: "Acquire a chip design house", subject: "a giant golden check buying a tower of chip blueprints" },
  { key: "fab-partnership", name: "Fab partnership (your silicon)", subject: "a cleanroom fab temple raising a glowing wafer" },
  { key: "accelerator-tape-out", name: "Custom AI accelerator tape-out", subject: "a wafer mandala of glowing accelerator dies" },
  { key: "own-foundry", name: "Own foundry capacity", subject: "a foundry citadel with violet furnaces and a proud banner" },
  { key: "regional-data-center", name: "Regional AI data center", subject: "a vaulted hall of blue LED racks like crystal pillars" },
  { key: "campus-micro-reactor", name: "Campus micro-reactor", subject: "a compact reactor dome with a glowing core wired to a data hall" },
  { key: "hyperscale-campus", name: "Hyperscale training campus", subject: "an aerial fortress-city of linked data halls" },
  { key: "inference-edge-network", name: "Global inference edge network", subject: "a night globe lit by edge-node beacons" },
  { key: "undersea-cable", name: "Undersea cable for model sync", subject: "a luminous fiber cable winding along the ocean floor" },
  { key: "booster-catch", name: "Reusable rocket booster catch", subject: "launch-tower arms catching a descending rocket booster at sunrise" },
  { key: "orbital-compute", name: "Orbital compute node", subject: "a gilded satellite with radiator wings over the Earth" },
  { key: "leo-constellation", name: "LEO inference constellation", subject: "a ring of satellites beaming light to the surface" },
  { key: "lunar-relay", name: "Lunar model relay", subject: "a lunar dish relaying data to the blue Earth" },
  { key: "mars-habitat", name: "Mars precursor AI habitat", subject: "a glass dome of server racks on red Martian soil" },
  { key: "mars-power-grid", name: "Mars power grid for GPUs", subject: "solar fields and pylons feeding GPU halls on Mars" },
  { key: "mars-data-center", name: "Mars data center (pilot)", subject: "cranes and robots raising the first data center on Mars" },
  { key: "mars-megacampus", name: "Mars megacampus", subject: "a vast Martian megacity of glowing data-center towers" },
]

export const START_KEY = "start"

export const START_SUBJECT = "a quiet attic desk under a huge moon, and a lot of ambition"

export function spriteUrl(key: string): string {
  return `${import.meta.env.BASE_URL}sprites/${key}.webp`
}

/** Stage key → public sprite URL. Unknown keys fall back to the opening scene. */
export const SPRITE_BY_TIER: Record<string, string> = Object.fromEntries(
  SPRITE_SUBJECTS.map((row) => [row.key, spriteUrl(row.key)]),
)

const SUBJECT_BY_KEY = new Map(SPRITE_SUBJECTS.map((row) => [row.key, row]))

export function spriteForTier(key: string): string {
  return SPRITE_BY_TIER[key] ?? spriteUrl(START_KEY)
}

export function subjectForTier(key: string): SpriteSubject | undefined {
  return SUBJECT_BY_KEY.get(key)
}

export const ERA_ACCENT: Record<Era, { glow: string; tint: string; kicker: string }> = {
  early: { glow: "#6fe08c", tint: "#11261a", kicker: "Early career" },
  mid: { glow: "#5aa9ff", tint: "#0e1f36", kicker: "The climb" },
  upper: { glow: "#f3b94a", tint: "#31230b", kicker: "Ownership" },
  q3: { glow: "#3fdacb", tint: "#0a2a2b", kicker: "Scale" },
  end: { glow: "#ff7b4f", tint: "#381508", kicker: "Off-world" },
}
