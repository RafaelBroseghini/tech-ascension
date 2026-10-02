/** Tech Ascension Clicker — shop tiers. Fantasy: ML/LLMs → own products/companies → chips → Mars.
 * nextCost = floor(baseCost * COST_GROWTH ** owned)
 */
export const COST_GROWTH = 1.15 as const;

export type Era = "early" | "mid" | "upper" | "q3" | "end";

/**
 * `key` is the permanent identity of a stage: saves, sprite files
 * (public/sprites/{key}.webp) and captions are all keyed by it. Never rename a
 * key. Display `name`, price and position can change freely, and a new stage is
 * added by inserting a row at the right price with a fresh key. No migration needed.
 */
export type TierDef = {
  key: string;
  era: Era;
  name: string;
  baseCost: number;
  cps: number;
  clickBonus: number;
};

/** `rank` is the 1-based position in price order. It is derived, never saved. */
export type Tier = TierDef & { rank: number };

const TIER_DEFS: readonly TierDef[] = [
  // early — learn to ship
  { key: "used-laptop", era: "early", name: "Used laptop", baseCost: 15, cps: 0.1, clickBonus: 0 },
  { key: "stack-overblow", era: "early", name: "Stack Overblow account", baseCost: 50, cps: 0.3, clickBonus: 0 },
  { key: "freecodechamp", era: "early", name: "FreeCodeChamp streak", baseCost: 120, cps: 0.8, clickBonus: 0 },
  { key: "raspberry-pie", era: "early", name: "Raspberry Pie", baseCost: 190, cps: 1.3, clickBonus: 0 },
  { key: "youtoob-intro", era: "early", name: "YouToob CS / ML intro", baseCost: 300, cps: 2, clickBonus: 0 },
  { key: "terminal-rice", era: "early", name: "Terminal rice (dotfiles)", baseCost: 480, cps: 3.2, clickBonus: 0 },
  { key: "personal-githug", era: "early", name: "Personal GitHug", baseCost: 750, cps: 5, clickBonus: 1 },
  { key: "mech-keyboard", era: "early", name: "Thocky mechanical keyboard", baseCost: 1150, cps: 7.7, clickBonus: 1 },
  { key: "portfolio-gaggle", era: "early", name: "Portfolio + Gaggle notebook", baseCost: 1800, cps: 12, clickBonus: 0 },
  { key: "free-notebook-gpu", era: "early", name: "Free cloud-notebook GPU", baseCost: 2900, cps: 19, clickBonus: 0 },
  { key: "hackathon-weekend", era: "early", name: "Hackathon weekend", baseCost: 4500, cps: 28, clickBonus: 0 },
  { key: "mac-minnie", era: "early", name: "Mac Minnie home server", baseCost: 7000, cps: 42, clickBonus: 0 },
  { key: "oss-ml-pr", era: "early", name: "Open-source ML PR", baseCost: 11000, cps: 65, clickBonus: 2 },
  { key: "mining-rig-gpus", era: "early", name: "Basement mining-rig GPUs", baseCost: 17500, cps: 98, clickBonus: 0 },
  { key: "bootcamp", era: "early", name: "Bootcamp / CS + ML electives", baseCost: 28000, cps: 150, clickBonus: 0 },
  { key: "local-quantized-model", era: "early", name: "Quantized model on a laptop", baseCost: 44000, cps: 230, clickBonus: 0 },
  { key: "internship", era: "early", name: "Internship (SWE / ML)", baseCost: 70000, cps: 350, clickBonus: 0 },
  { key: "hacker-newz", era: "early", name: "Hacker Newz front page", baseCost: 110000, cps: 520, clickBonus: 0 },

  // mid — engineer + ML craft
  { key: "junior-swe", era: "mid", name: "Junior SWE", baseCost: 180000, cps: 800, clickBonus: 3 },
  { key: "dockyard", era: "mid", name: "Dockyard containers", baseCost: 280000, cps: 1200, clickBonus: 0 },
  { key: "pytorchy-tensorflux", era: "mid", name: "PyTorchy / TensorFlux fluency", baseCost: 450000, cps: 1800, clickBonus: 0 },
  { key: "cubernetes", era: "mid", name: "Cubernetes cluster", baseCost: 700000, cps: 2700, clickBonus: 0 },
  { key: "prod-ml-pipeline", era: "mid", name: "Production ML pipeline", baseCost: 1.1e6, cps: 4000, clickBonus: 0 },
  { key: "mid-ml-engineer", era: "mid", name: "Mid-level ML engineer", baseCost: 2.8e6, cps: 9000, clickBonus: 5 },
  { key: "openklaw", era: "mid", name: "OpenKlaw personal agent", baseCost: 4.4e6, cps: 13000, clickBonus: 0 },
  { key: "first-llm-finetune", era: "mid", name: "Fine-tune your first LLM", baseCost: 7e6, cps: 20000, clickBonus: 0 },
  { key: "vibe-coded-app", era: "mid", name: "Vibe-coded weekend app", baseCost: 1.1e7, cps: 29000, clickBonus: 6 },
  { key: "ship-ai-feature", era: "mid", name: "Ship an AI feature", baseCost: 18e6, cps: 45000, clickBonus: 0 },
  { key: "senior-ml-swe", era: "mid", name: "Senior ML / SWE", baseCost: 45e6, cps: 100000, clickBonus: 8 },
  { key: "tool-plug-server", era: "mid", name: "Tool-plug server for agents", baseCost: 7.2e7, cps: 150000, clickBonus: 0 },
  { key: "model-roadmap", era: "mid", name: "Own the model roadmap", baseCost: 120e6, cps: 230000, clickBonus: 0 },
  { key: "staff-ml-engineer", era: "mid", name: "Staff ML engineer", baseCost: 320e6, cps: 520000, clickBonus: 0 },
  { key: "principal-ai-architect", era: "mid", name: "Principal AI architect", baseCost: 850e6, cps: 1.2e6, clickBonus: 12 },

  // upper — LLMs, products, companies you own
  { key: "frontier-llm-lab", era: "upper", name: "Join a frontier LLM lab", baseCost: 2.2e9, cps: 2.8e6, clickBonus: 0 },
  { key: "open-weights-drop", era: "upper", name: "Open-weights drop on the model hub", baseCost: 3.4e9, cps: 4.2e6, clickBonus: 0 },
  { key: "small-foundation-model", era: "upper", name: "Train a small foundation model", baseCost: 5.5e9, cps: 6.5e6, clickBonus: 0 },
  { key: "ai-saas", era: "upper", name: "Launch your AI SaaS", baseCost: 14e9, cps: 15e6, clickBonus: 15 },
  { key: "coding-agent-swarm", era: "upper", name: "Coding-agent swarm", baseCost: 2.2e10, cps: 2.3e7, clickBonus: 22 },
  { key: "angel-stake", era: "upper", name: "Angel stake in AI startups", baseCost: 35e9, cps: 35e6, clickBonus: 0 },
  { key: "found-ai-company", era: "upper", name: "Found your AI company", baseCost: 90e9, cps: 80e6, clickBonus: 0 },
  { key: "whycombinator-batch", era: "upper", name: "WhyCombinator — LLM product batch", baseCost: 230e9, cps: 180e6, clickBonus: 20 },
  { key: "series-a", era: "upper", name: "Series A (you own majority)", baseCost: 600e9, cps: 420e6, clickBonus: 0 },
  { key: "acquire-rival", era: "upper", name: "Acquire a rival AI startup", baseCost: 1.6e12, cps: 1e9, clickBonus: 0 },
  { key: "public-ai-company", era: "upper", name: "Hold a public AI / chip company", baseCost: 4.2e12, cps: 2.3e9, clickBonus: 25 },

  // q3 — scale models, silicon, foundries
  { key: "foundation-model-team", era: "q3", name: "Hire a foundation-model team", baseCost: 11e12, cps: 5.2e9, clickBonus: 0 },
  { key: "gpu-supercluster", era: "q3", name: "Private GPU supercluster", baseCost: 30e12, cps: 12e9, clickBonus: 0 },
  { key: "blackwall-preorder", era: "q3", name: "Blackwall GPU preorder", baseCost: 4.8e13, cps: 1.8e10, clickBonus: 0 },
  { key: "frontier-llm", era: "q3", name: "Train a frontier LLM", baseCost: 80e12, cps: 28e9, clickBonus: 40 },
  { key: "inference-api-market", era: "q3", name: "Own the inference API market", baseCost: 220e12, cps: 65e9, clickBonus: 0 },
  { key: "chip-design-house", era: "q3", name: "Acquire a chip design house", baseCost: 600e12, cps: 150e9, clickBonus: 0 },
  { key: "fab-partnership", era: "q3", name: "Fab partnership (your silicon)", baseCost: 1.6e15, cps: 350e9, clickBonus: 50 },
  { key: "accelerator-tape-out", era: "q3", name: "Custom AI accelerator tape-out", baseCost: 4.5e15, cps: 800e9, clickBonus: 0 },
  { key: "own-foundry", era: "q3", name: "Own foundry capacity", baseCost: 12e15, cps: 1.9e12, clickBonus: 0 },

  // end — planet-scale infra (unchanged beat)
  { key: "regional-data-center", era: "end", name: "Regional AI data center", baseCost: 35e15, cps: 4.5e12, clickBonus: 75 },
  { key: "campus-micro-reactor", era: "end", name: "Campus micro-reactor", baseCost: 6e16, cps: 7.1e12, clickBonus: 0 },
  { key: "hyperscale-campus", era: "end", name: "Hyperscale training campus", baseCost: 100e15, cps: 11e12, clickBonus: 0 },
  { key: "inference-edge-network", era: "end", name: "Global inference edge network", baseCost: 280e15, cps: 26e12, clickBonus: 0 },
  { key: "undersea-cable", era: "end", name: "Undersea cable for model sync", baseCost: 800e15, cps: 60e12, clickBonus: 100 },
  { key: "booster-catch", era: "end", name: "Reusable rocket booster catch", baseCost: 1.4e18, cps: 9.1e13, clickBonus: 0 },
  { key: "orbital-compute", era: "end", name: "Orbital compute node", baseCost: 2.5e18, cps: 140e12, clickBonus: 0 },
  { key: "leo-constellation", era: "end", name: "LEO inference constellation", baseCost: 8e18, cps: 330e12, clickBonus: 0 },
  { key: "lunar-relay", era: "end", name: "Lunar model relay", baseCost: 25e18, cps: 780e12, clickBonus: 150 },
  { key: "mars-habitat", era: "end", name: "Mars precursor AI habitat", baseCost: 80e18, cps: 1.9e15, clickBonus: 0 },
  { key: "mars-power-grid", era: "end", name: "Mars power grid for GPUs", baseCost: 280e18, cps: 4.5e15, clickBonus: 0 },
  { key: "mars-data-center", era: "end", name: "Mars data center (pilot)", baseCost: 1e21, cps: 11e15, clickBonus: 200 },
  { key: "mars-megacampus", era: "end", name: "Mars megacampus", baseCost: 50e21, cps: 50e15, clickBonus: 0 },
];

export const TIERS: readonly Tier[] = TIER_DEFS.map((def, index) => ({ ...def, rank: index + 1 }));
