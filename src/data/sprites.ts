import type { Era } from "./tiers.ts"

export type SpriteSubject = {
  id: number
  name: string
  subject: string
}

/** One illustrated subject per tier. Art files live at public/sprites/{id}.svg. */
export const SPRITE_SUBJECTS: readonly SpriteSubject[] = [
  { id: 1, name: "Used laptop", subject: "scratched beige laptop open on a messy desk" },
  { id: 2, name: "Stack Overflow account", subject: "browser tab with orange SO logo + upvoted answer" },
  { id: 3, name: "FreeCodeCamp streak", subject: "green flame streak badge on a laptop" },
  { id: 4, name: "YouTube CS / ML intro", subject: "play-button thumbnail of neural-net doodles" },
  { id: 5, name: "Personal GitHub", subject: "octocat + green contribution graph" },
  { id: 6, name: "Portfolio + Kaggle notebook", subject: "personal site mock + notebook medal" },
  { id: 7, name: "Hackathon weekend", subject: "pizza boxes + sticky notes + glowing laptop" },
  { id: 8, name: "Open-source ML PR", subject: "merged PR check + tiny tensor diagram" },
  { id: 9, name: "Bootcamp / CS + ML electives", subject: "campus badge + textbook + GPU sticker" },
  { id: 10, name: "Internship (SWE / ML)", subject: "lanyard badge + cubicle dual monitors" },
  { id: 11, name: "Junior SWE", subject: "hoodie coder, dual monitors, deploy confetti" },
  { id: 12, name: "PyTorch / TF fluency", subject: "stylized torch + tensor cubes" },
  { id: 13, name: "Production ML pipeline", subject: "DAG boxes: data → train → serve" },
  { id: 14, name: "Mid-level ML engineer", subject: "engineer at ROC-curve dashboard" },
  { id: 15, name: "Fine-tune your first LLM", subject: "small glowing model orb with tuning dials" },
  { id: 16, name: "Ship an AI feature", subject: "product UI with sparkle AI toggle" },
  { id: 17, name: "Senior ML / SWE", subject: "whiteboard full of architecture boxes" },
  { id: 18, name: "Own the model roadmap", subject: "roadmap timeline with you-pin on models" },
  { id: 19, name: "Staff ML engineer", subject: "glowing staff node above team org chart" },
  { id: 20, name: "Principal AI architect", subject: "blueprint of giant model-serving diagram" },
  { id: 21, name: "Join a frontier LLM lab", subject: "glass lab, wall of glowing GPU racks" },
  { id: 22, name: "Train a small foundation model", subject: "tiny glowing brain in a training pod" },
  { id: 23, name: "Launch your AI SaaS", subject: "SaaS dashboard + $ MRR ticker + rocket" },
  { id: 24, name: "Angel stake in AI startups", subject: "angel wings over startup logo chips" },
  { id: 25, name: "Found your AI company", subject: "founder desk + branded company sign" },
  { id: 26, name: "YC — LLM product batch", subject: "orange YC mark + demo-day spotlight" },
  { id: 27, name: "Series A (you own majority)", subject: "term sheets + majority pie (you)" },
  { id: 28, name: "Acquire a rival AI startup", subject: "handshake crushing a smaller rival mark" },
  { id: 29, name: "Hold a public AI / chip company", subject: "stock ticker + chip die in glass case" },
  { id: 30, name: "Hire a foundation-model team", subject: "researchers around a giant model core" },
  { id: 31, name: "Private GPU supercluster", subject: "warehouse aisle of packed GPUs" },
  { id: 32, name: "Train a frontier LLM", subject: "planet-scale glowing LLM sphere" },
  { id: 33, name: "Own the inference API market", subject: "API gateway globe with traffic spikes" },
  { id: 34, name: "Acquire a chip design house", subject: "giant check buying a chip-blueprint building" },
  { id: 35, name: "Fab partnership (your silicon)", subject: "cleanroom fab with your wafer logo" },
  { id: 36, name: "Custom AI accelerator tape-out", subject: "wafer covered in custom accelerator dies" },
  { id: 37, name: "Own foundry capacity", subject: "sprawling foundry campus under your flag" },
  { id: 38, name: "Regional AI data center", subject: "data-hall rows of blue LED racks" },
  { id: 39, name: "Hyperscale training campus", subject: "aerial view of many linked data halls" },
  { id: 40, name: "Global inference edge network", subject: "world map with edge nodes lighting up" },
  { id: 41, name: "Undersea cable for model sync", subject: "ocean cutaway with glowing fiber cable" },
  { id: 42, name: "Orbital compute node", subject: "satellite with radiators + compute core" },
  { id: 43, name: "LEO inference constellation", subject: "ring of satellites beaming inference" },
  { id: 44, name: "Lunar model relay", subject: "Moon-base dish relaying model weights" },
  { id: 45, name: "Mars precursor AI habitat", subject: "Mars dome with server racks inside" },
  { id: 46, name: "Mars power grid for GPUs", subject: "Martian grid feeding GPU halls" },
  { id: 47, name: "Mars data center (pilot)", subject: "first red-dust data center under construction" },
  { id: 48, name: "Mars megacampus", subject: "vast Mars city of data centers, rust sky" },
]

/** Tier id → public sprite URL. Missing ids fall back to tier 1. */
export const SPRITE_BY_TIER: Record<number, string> = Object.fromEntries(
  SPRITE_SUBJECTS.map((row) => [row.id, `${import.meta.env.BASE_URL}sprites/${row.id}.svg`]),
)

const SUBJECT_BY_ID = new Map(SPRITE_SUBJECTS.map((row) => [row.id, row]))

export function spriteForTier(id: number): string {
  return SPRITE_BY_TIER[id] ?? SPRITE_BY_TIER[1] ?? `${import.meta.env.BASE_URL}sprites/1.svg`
}

export function subjectForTier(id: number): SpriteSubject | undefined {
  return SUBJECT_BY_ID.get(id)
}

export const ERA_ACCENT: Record<Era, { glow: string; tint: string; kicker: string }> = {
  early: { glow: "#3ddc84", tint: "#163024", kicker: "Early career" },
  mid: { glow: "#5aa7ff", tint: "#10243a", kicker: "The climb" },
  upper: { glow: "#f0c14a", tint: "#3a2c10", kicker: "Ownership" },
  q3: { glow: "#c084fc", tint: "#261433", kicker: "Scale" },
  end: { glow: "#ff7a59", tint: "#3a1612", kicker: "Off-world" },
}
