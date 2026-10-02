/** Tech Ascension Clicker — shop tiers v4 (66). Fantasy: ML/LLMs → own products/companies → chips → Mars.
 * nextCost = floor(baseCost * COST_GROWTH ** owned)
 */
export const COST_GROWTH = 1.15 as const;

export type Era = "early" | "mid" | "upper" | "q3" | "end";

export type Tier = {
  id: number;
  era: Era;
  name: string;
  baseCost: number;
  cps: number;
  clickBonus: number;
};

export const TIERS: readonly Tier[] = [
  // early — learn to ship
  { id: 1, era: "early", name: "Used laptop", baseCost: 15, cps: 0.1, clickBonus: 0 },
  { id: 2, era: "early", name: "Stack Overblow account", baseCost: 50, cps: 0.3, clickBonus: 0 },
  { id: 3, era: "early", name: "FreeCodeChamp streak", baseCost: 120, cps: 0.8, clickBonus: 0 },
  { id: 4, era: "early", name: "Raspberry Pie", baseCost: 190, cps: 1.3, clickBonus: 0 },
  { id: 5, era: "early", name: "YouToob CS / ML intro", baseCost: 300, cps: 2, clickBonus: 0 },
  { id: 6, era: "early", name: "Terminal rice (dotfiles)", baseCost: 480, cps: 3.2, clickBonus: 0 },
  { id: 7, era: "early", name: "Personal GitHug", baseCost: 750, cps: 5, clickBonus: 1 },
  { id: 8, era: "early", name: "Thocky mechanical keyboard", baseCost: 1150, cps: 7.7, clickBonus: 1 },
  { id: 9, era: "early", name: "Portfolio + Gaggle notebook", baseCost: 1800, cps: 12, clickBonus: 0 },
  { id: 10, era: "early", name: "Free cloud-notebook GPU", baseCost: 2900, cps: 19, clickBonus: 0 },
  { id: 11, era: "early", name: "Hackathon weekend", baseCost: 4500, cps: 28, clickBonus: 0 },
  { id: 12, era: "early", name: "Mac Minnie home server", baseCost: 7000, cps: 42, clickBonus: 0 },
  { id: 13, era: "early", name: "Open-source ML PR", baseCost: 11000, cps: 65, clickBonus: 2 },
  { id: 14, era: "early", name: "Basement mining-rig GPUs", baseCost: 17500, cps: 98, clickBonus: 0 },
  { id: 15, era: "early", name: "Bootcamp / CS + ML electives", baseCost: 28000, cps: 150, clickBonus: 0 },
  { id: 16, era: "early", name: "Quantized model on a laptop", baseCost: 44000, cps: 230, clickBonus: 0 },
  { id: 17, era: "early", name: "Internship (SWE / ML)", baseCost: 70000, cps: 350, clickBonus: 0 },
  { id: 18, era: "early", name: "Hacker Newz front page", baseCost: 110000, cps: 520, clickBonus: 0 },

  // mid — engineer + ML craft
  { id: 19, era: "mid", name: "Junior SWE", baseCost: 180000, cps: 800, clickBonus: 3 },
  { id: 20, era: "mid", name: "Dockyard containers", baseCost: 280000, cps: 1200, clickBonus: 0 },
  { id: 21, era: "mid", name: "PyTorchy / TensorFlux fluency", baseCost: 450000, cps: 1800, clickBonus: 0 },
  { id: 22, era: "mid", name: "Cubernetes cluster", baseCost: 700000, cps: 2700, clickBonus: 0 },
  { id: 23, era: "mid", name: "Production ML pipeline", baseCost: 1.1e6, cps: 4000, clickBonus: 0 },
  { id: 24, era: "mid", name: "Mid-level ML engineer", baseCost: 2.8e6, cps: 9000, clickBonus: 5 },
  { id: 25, era: "mid", name: "OpenKlaw personal agent", baseCost: 4.4e6, cps: 13000, clickBonus: 0 },
  { id: 26, era: "mid", name: "Fine-tune your first LLM", baseCost: 7e6, cps: 20000, clickBonus: 0 },
  { id: 27, era: "mid", name: "Vibe-coded weekend app", baseCost: 1.1e7, cps: 29000, clickBonus: 6 },
  { id: 28, era: "mid", name: "Ship an AI feature", baseCost: 18e6, cps: 45000, clickBonus: 0 },
  { id: 29, era: "mid", name: "Senior ML / SWE", baseCost: 45e6, cps: 100000, clickBonus: 8 },
  { id: 30, era: "mid", name: "Tool-plug server for agents", baseCost: 7.2e7, cps: 150000, clickBonus: 0 },
  { id: 31, era: "mid", name: "Own the model roadmap", baseCost: 120e6, cps: 230000, clickBonus: 0 },
  { id: 32, era: "mid", name: "Staff ML engineer", baseCost: 320e6, cps: 520000, clickBonus: 0 },
  { id: 33, era: "mid", name: "Principal AI architect", baseCost: 850e6, cps: 1.2e6, clickBonus: 12 },

  // upper — LLMs, products, companies you own
  { id: 34, era: "upper", name: "Join a frontier LLM lab", baseCost: 2.2e9, cps: 2.8e6, clickBonus: 0 },
  { id: 35, era: "upper", name: "Open-weights drop on the model hub", baseCost: 3.4e9, cps: 4.2e6, clickBonus: 0 },
  { id: 36, era: "upper", name: "Train a small foundation model", baseCost: 5.5e9, cps: 6.5e6, clickBonus: 0 },
  { id: 37, era: "upper", name: "Launch your AI SaaS", baseCost: 14e9, cps: 15e6, clickBonus: 15 },
  { id: 38, era: "upper", name: "Coding-agent swarm", baseCost: 2.2e10, cps: 2.3e7, clickBonus: 22 },
  { id: 39, era: "upper", name: "Angel stake in AI startups", baseCost: 35e9, cps: 35e6, clickBonus: 0 },
  { id: 40, era: "upper", name: "Found your AI company", baseCost: 90e9, cps: 80e6, clickBonus: 0 },
  { id: 41, era: "upper", name: "WhyCombinator — LLM product batch", baseCost: 230e9, cps: 180e6, clickBonus: 20 },
  { id: 42, era: "upper", name: "Series A (you own majority)", baseCost: 600e9, cps: 420e6, clickBonus: 0 },
  { id: 43, era: "upper", name: "Acquire a rival AI startup", baseCost: 1.6e12, cps: 1e9, clickBonus: 0 },
  { id: 44, era: "upper", name: "Hold a public AI / chip company", baseCost: 4.2e12, cps: 2.3e9, clickBonus: 25 },

  // q3 — scale models, silicon, foundries
  { id: 45, era: "q3", name: "Hire a foundation-model team", baseCost: 11e12, cps: 5.2e9, clickBonus: 0 },
  { id: 46, era: "q3", name: "Private GPU supercluster", baseCost: 30e12, cps: 12e9, clickBonus: 0 },
  { id: 47, era: "q3", name: "Blackwall GPU preorder", baseCost: 4.8e13, cps: 1.8e10, clickBonus: 0 },
  { id: 48, era: "q3", name: "Train a frontier LLM", baseCost: 80e12, cps: 28e9, clickBonus: 40 },
  { id: 49, era: "q3", name: "Own the inference API market", baseCost: 220e12, cps: 65e9, clickBonus: 0 },
  { id: 50, era: "q3", name: "Acquire a chip design house", baseCost: 600e12, cps: 150e9, clickBonus: 0 },
  { id: 51, era: "q3", name: "Fab partnership (your silicon)", baseCost: 1.6e15, cps: 350e9, clickBonus: 50 },
  { id: 52, era: "q3", name: "Custom AI accelerator tape-out", baseCost: 4.5e15, cps: 800e9, clickBonus: 0 },
  { id: 53, era: "q3", name: "Own foundry capacity", baseCost: 12e15, cps: 1.9e12, clickBonus: 0 },

  // end — planet-scale infra (unchanged beat)
  { id: 54, era: "end", name: "Regional AI data center", baseCost: 35e15, cps: 4.5e12, clickBonus: 75 },
  { id: 55, era: "end", name: "Campus micro-reactor", baseCost: 6e16, cps: 7.1e12, clickBonus: 0 },
  { id: 56, era: "end", name: "Hyperscale training campus", baseCost: 100e15, cps: 11e12, clickBonus: 0 },
  { id: 57, era: "end", name: "Global inference edge network", baseCost: 280e15, cps: 26e12, clickBonus: 0 },
  { id: 58, era: "end", name: "Undersea cable for model sync", baseCost: 800e15, cps: 60e12, clickBonus: 100 },
  { id: 59, era: "end", name: "Reusable rocket booster catch", baseCost: 1.4e18, cps: 9.1e13, clickBonus: 0 },
  { id: 60, era: "end", name: "Orbital compute node", baseCost: 2.5e18, cps: 140e12, clickBonus: 0 },
  { id: 61, era: "end", name: "LEO inference constellation", baseCost: 8e18, cps: 330e12, clickBonus: 0 },
  { id: 62, era: "end", name: "Lunar model relay", baseCost: 25e18, cps: 780e12, clickBonus: 150 },
  { id: 63, era: "end", name: "Mars precursor AI habitat", baseCost: 80e18, cps: 1.9e15, clickBonus: 0 },
  { id: 64, era: "end", name: "Mars power grid for GPUs", baseCost: 280e18, cps: 4.5e15, clickBonus: 0 },
  { id: 65, era: "end", name: "Mars data center (pilot)", baseCost: 1e21, cps: 11e15, clickBonus: 200 },
  { id: 66, era: "end", name: "Mars megacampus", baseCost: 50e21, cps: 50e15, clickBonus: 0 },
] as const;
