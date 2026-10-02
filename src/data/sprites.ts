import type { Era } from "./tiers.ts"

export type SpriteSubject = {
  id: number
  name: string
  subject: string
}

/** One illustrated subject per tier. Art files live at public/sprites/{id}.webp (512px). Art 0 is the opening scene shown before the first purchase. */
export const SPRITE_SUBJECTS: readonly SpriteSubject[] = [
  { id: 1, name: "Used laptop", subject: "a battered laptop glowing with faint green runes on a cluttered desk" },
  { id: 2, name: "Stack Overblow account", subject: "a floating stained-glass browser window, an upvote spirit rising above a scroll of answers" },
  { id: 3, name: "FreeCodeChamp streak", subject: "a sacred green flame over a laptop, a streak of day-crystals burning in a row" },
  { id: 4, name: "Raspberry Pie", subject: "a credit-card computer on a workbench beside a steaming raspberry pie" },
  { id: 5, name: "YouToob CS / ML intro", subject: "a crystal ball playing a lesson of neural-net constellations" },
  { id: 6, name: "Terminal rice (dotfiles)", subject: "a spell-mirror terminal where rice sprouts from the keyboard" },
  { id: 7, name: "Personal GitHug", subject: "a cat-octopus familiar guarding a mosaic of green contribution tiles" },
  { id: 8, name: "Thocky mechanical keyboard", subject: "an artisan keyboard with jewel keycaps and golden thock ripples" },
  { id: 9, name: "Portfolio + Gaggle notebook", subject: "a spellbook of notebooks, a golden medal, and a stained-glass portfolio" },
  { id: 10, name: "Free cloud-notebook GPU", subject: "a floating notebook with a chip-sun above it and an hourglass of free tier running out" },
  { id: 11, name: "Hackathon weekend", subject: "a midnight hackathon camp of pizza, sticky notes and glowing laptops" },
  { id: 12, name: "Mac Minnie home server", subject: "a small silver cube server on a shelf beside a bowl of mac and cheese" },
  { id: 13, name: "Open-source ML PR", subject: "two rivers of light merging under a wax-sealed check rune" },
  { id: 14, name: "Basement mining-rig GPUs", subject: "a basement rack of mismatched fan-cooled graphics cards under one bare bulb" },
  { id: 15, name: "Bootcamp / CS + ML electives", subject: "a grand academy hall with a giant textbook and a GPU crystal" },
  { id: 16, name: "Quantized model on a laptop", subject: "a sleeping crystal-wool llama curled inside an open laptop" },
  { id: 17, name: "Internship (SWE / ML)", subject: "an apprentice's alcove with a glowing badge and twin scrying mirrors" },
  { id: 18, name: "Hacker Newz front page", subject: "a tower bulletin board with one scroll blazing at the top and visitors swarming in" },
  { id: 19, name: "Junior SWE", subject: "a hooded coder between two scrying mirrors as deploy sparks burst" },
  { id: 20, name: "Dockyard containers", subject: "a blue whale carrying stacked sealed cargo containers into harbor" },
  { id: 21, name: "PyTorchy / TensorFlux fluency", subject: "a blazing torch of light circled by crystal tensors" },
  { id: 22, name: "Cubernetes cluster", subject: "a ship's helm wheel steering a fleet of linked container pods" },
  { id: 23, name: "Production ML pipeline", subject: "an aqueduct of light carrying data from a well, through a forge, to a serving tower" },
  { id: 24, name: "Mid-level ML engineer", subject: "an engineer mage conducting a holographic ROC curve" },
  { id: 25, name: "OpenKlaw personal agent", subject: "a brass claw-crane machine with a small automaton picking up your tasks" },
  { id: 26, name: "Fine-tune your first LLM", subject: "a small radiant model orb on an altar of tuning dials" },
  { id: 27, name: "Vibe-coded weekend app", subject: "a dreamy coder in a hammock as an app materializes from swirling light" },
  { id: 28, name: "Ship an AI feature", subject: "a magic mirror with a sparkle toggle and a rocket launching out" },
  { id: 29, name: "Senior ML / SWE", subject: "an archmage before a slate wall of glowing architecture diagrams" },
  { id: 30, name: "Tool-plug server for agents", subject: "a tool belt of glowing gadgets plugged into one central server crystal" },
  { id: 31, name: "Own the model roadmap", subject: "a realm map with a glowing roadmap path and a pin on a model orb" },
  { id: 32, name: "Staff ML engineer", subject: "a crowned staff above a tree of small mages" },
  { id: 33, name: "Principal AI architect", subject: "a colossal blueprint of a model-serving tower over a drafting table" },
  { id: 34, name: "Join a frontier LLM lab", subject: "a glass observatory lab lined with glowing GPU rune-racks" },
  { id: 35, name: "Open-weights drop on the model hub", subject: "a treasure chest spilling golden weights into a village square" },
  { id: 36, name: "Train a small foundation model", subject: "a tiny golden brain training in an alchemical glass pod" },
  { id: 37, name: "Launch your AI SaaS", subject: "a golden scrying pool of revenue coins with a rocket blasting off" },
  { id: 38, name: "Coding-agent swarm", subject: "a hall of clockwork coders typing in parallel under a human conductor" },
  { id: 39, name: "Angel stake in AI startups", subject: "angel wings over seedling startups sprouting from gold" },
  { id: 40, name: "Found your AI company", subject: "a founder's carved desk beneath a guild sign and banners" },
  { id: 41, name: "WhyCombinator — LLM product batch", subject: "a demo-day stage with a single spotlight on a golden emblem" },
  { id: 42, name: "Series A (you own majority)", subject: "term-sheet scrolls with wax seals beside a mostly-gold pie" },
  { id: 43, name: "Acquire a rival AI startup", subject: "a golden gauntlet crushing a rival's banner and tower" },
  { id: 44, name: "Hold a public AI / chip company", subject: "a ticker obelisk and a chip die in a glass reliquary" },
  { id: 45, name: "Hire a foundation-model team", subject: "researchers circling a giant violet model core" },
  { id: 46, name: "Private GPU supercluster", subject: "a cathedral aisle of towering GPU monoliths" },
  { id: 47, name: "Blackwall GPU preorder", subject: "an obsidian monolith GPU with a long queue of petitioners" },
  { id: 48, name: "Train a frontier LLM", subject: "a planet-sized sphere of violet neural lightning" },
  { id: 49, name: "Own the inference API market", subject: "a crystal globe ringed by gateway arches and streaking traffic" },
  { id: 50, name: "Acquire a chip design house", subject: "a giant golden check buying a tower of chip blueprints" },
  { id: 51, name: "Fab partnership (your silicon)", subject: "a cleanroom fab temple raising a glowing wafer" },
  { id: 52, name: "Custom AI accelerator tape-out", subject: "a wafer mandala of glowing accelerator dies" },
  { id: 53, name: "Own foundry capacity", subject: "a foundry citadel with violet furnaces and a proud banner" },
  { id: 54, name: "Regional AI data center", subject: "a vaulted hall of blue LED racks like crystal pillars" },
  { id: 55, name: "Campus micro-reactor", subject: "a compact reactor dome with a glowing core wired to a data hall" },
  { id: 56, name: "Hyperscale training campus", subject: "an aerial fortress-city of linked data halls" },
  { id: 57, name: "Global inference edge network", subject: "a night globe lit by edge-node beacons" },
  { id: 58, name: "Undersea cable for model sync", subject: "a luminous fiber cable winding along the ocean floor" },
  { id: 59, name: "Reusable rocket booster catch", subject: "launch-tower arms catching a descending rocket booster at sunrise" },
  { id: 60, name: "Orbital compute node", subject: "a gilded satellite with radiator wings over the Earth" },
  { id: 61, name: "LEO inference constellation", subject: "a ring of satellites beaming light to the surface" },
  { id: 62, name: "Lunar model relay", subject: "a lunar dish relaying data to the blue Earth" },
  { id: 63, name: "Mars precursor AI habitat", subject: "a glass dome of server racks on red Martian soil" },
  { id: 64, name: "Mars power grid for GPUs", subject: "solar fields and pylons feeding GPU halls on Mars" },
  { id: 65, name: "Mars data center (pilot)", subject: "cranes and robots raising the first data center on Mars" },
  { id: 66, name: "Mars megacampus", subject: "a vast Martian megacity of glowing data-center towers" },
]

export const START_SUBJECT = "a quiet attic desk under a huge moon, and a lot of ambition"

export function spriteUrl(id: number): string {
  return `${import.meta.env.BASE_URL}sprites/${id}.webp`
}

/** Tier id → public sprite URL. Missing ids fall back to tier 1. */
export const SPRITE_BY_TIER: Record<number, string> = Object.fromEntries(
  SPRITE_SUBJECTS.map((row) => [row.id, spriteUrl(row.id)]),
)

const SUBJECT_BY_ID = new Map(SPRITE_SUBJECTS.map((row) => [row.id, row]))

export function spriteForTier(id: number): string {
  if (id === 0) return spriteUrl(0)
  return SPRITE_BY_TIER[id] ?? SPRITE_BY_TIER[1] ?? spriteUrl(1)
}

export function subjectForTier(id: number): SpriteSubject | undefined {
  return SUBJECT_BY_ID.get(id)
}

export const ERA_ACCENT: Record<Era, { glow: string; tint: string; kicker: string }> = {
  early: { glow: "#6fe08c", tint: "#11261a", kicker: "Early career" },
  mid: { glow: "#5aa9ff", tint: "#0e1f36", kicker: "The climb" },
  upper: { glow: "#f3b94a", tint: "#31230b", kicker: "Ownership" },
  q3: { glow: "#3fdacb", tint: "#0a2a2b", kicker: "Scale" },
  end: { glow: "#ff7b4f", tint: "#381508", kicker: "Off-world" },
}
