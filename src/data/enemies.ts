/**
 * Enemies v1.2: payday rewards, same-era spawn only. Rewards and mid-to-end HP are the v1.2 table verbatim.
 * Early HP stays a tenth of the table (88-140, not 880-1400): since the phase economy, Phase B/C players click
 * for $1+, so a 1000 HP early fight could not be won inside the 30s clock. Rare spawns start once money exists.
 */
import type { Era } from "./capital.ts"

export type EraGate = Era;
export type Enemy = { id:number; name:string; eraGate:EraGate; hp:number; reward:number; weight:number };
/** Roll only among enemies where eraGate === playerCurrentEra */
export const ENEMY_SPAWN_SAME_ERA_ONLY = true;
export const ENEMIES: readonly Enemy[] = [
  { id: 1, name: "Merge Conflict Hydra", eraGate: "early", hp: 88, reward: 500, weight: 10 },
  { id: 2, name: "Off-by-One Beetle", eraGate: "early", hp: 66, reward: 250, weight: 12 },
  { id: 3, name: "Null Pointer Specter", eraGate: "early", hp: 100, reward: 600, weight: 10 },
  { id: 4, name: "Stack Overflow Troll", eraGate: "early", hp: 112, reward: 750, weight: 8 },
  { id: 5, name: "Imposter Syndrome Shade", eraGate: "early", hp: 120, reward: 900, weight: 7 },
  { id: 6, name: "Broken Build Golem", eraGate: "early", hp: 90, reward: 550, weight: 9 },
  { id: 7, name: "CSS Centipede", eraGate: "early", hp: 70, reward: 280, weight: 11 },
  { id: 8, name: "Internship Gatekeeper", eraGate: "early", hp: 130, reward: 1100, weight: 6 },
  { id: 9, name: "Whiteboard Wraith", eraGate: "early", hp: 140, reward: 1300, weight: 5 },
  { id: 10, name: "Flaky Test Phantom", eraGate: "early", hp: 80, reward: 400, weight: 10 },
  { id: 11, name: "On-Call Pager Demon", eraGate: "mid", hp: 9000, reward: 50000, weight: 10 },
  { id: 12, name: "Prod Outage Kraken", eraGate: "mid", hp: 12000, reward: 90000, weight: 7 },
  { id: 13, name: "Tech Debt Titan", eraGate: "mid", hp: 14000, reward: 120000, weight: 6 },
  { id: 14, name: "Code Review Nitpickler", eraGate: "mid", hp: 7000, reward: 32000, weight: 12 },
  { id: 15, name: "Meeting Vampire", eraGate: "mid", hp: 8000, reward: 40000, weight: 10 },
  { id: 16, name: "Legacy COBOL Lich", eraGate: "mid", hp: 15000, reward: 150000, weight: 5 },
  { id: 17, name: "Memory Leak Ooze", eraGate: "mid", hp: 10000, reward: 60000, weight: 9 },
  { id: 18, name: "Kubernetes Pod Swarm", eraGate: "mid", hp: 11000, reward: 75000, weight: 8 },
  { id: 19, name: "Promotion Packet Sphinx", eraGate: "mid", hp: 16000, reward: 200000, weight: 4 },
  { id: 20, name: "Vibe-Coding Gremlin", eraGate: "mid", hp: 7500, reward: 36000, weight: 11 },
  { id: 21, name: "Investor Pitch Drake", eraGate: "upper", hp: 70000, reward: 2500000, weight: 8 },
  { id: 22, name: "Churn Hydra", eraGate: "upper", hp: 55000, reward: 1800000, weight: 9 },
  { id: 23, name: "Competitor Clone", eraGate: "upper", hp: 80000, reward: 3500000, weight: 7 },
  { id: 24, name: "Hallucinating LLM", eraGate: "upper", hp: 65000, reward: 2200000, weight: 8 },
  { id: 25, name: "GPU Shortage Golem", eraGate: "upper", hp: 100000, reward: 5000000, weight: 5 },
  { id: 26, name: "Term Sheet Serpent", eraGate: "upper", hp: 90000, reward: 4000000, weight: 6 },
  { id: 27, name: "Acquisition Shark", eraGate: "upper", hp: 110000, reward: 7000000, weight: 4 },
  { id: 28, name: "Open-Source Fork Fiend", eraGate: "upper", hp: 50000, reward: 1200000, weight: 10 },
  { id: 29, name: "Boardroom Basilisk", eraGate: "upper", hp: 120000, reward: 9000000, weight: 3 },
  { id: 30, name: "Fab Yield Specter", eraGate: "q3", hp: 180000, reward: 40000000, weight: 8 },
  { id: 31, name: "CUDA Dragon", eraGate: "q3", hp: 220000, reward: 65000000, weight: 7 },
  { id: 32, name: "Export-Control Colossus", eraGate: "q3", hp: 280000, reward: 120000000, weight: 4 },
  { id: 33, name: "Thermal Throttle Djinn", eraGate: "q3", hp: 160000, reward: 30000000, weight: 9 },
  { id: 34, name: "Mask-Align Wraith", eraGate: "q3", hp: 200000, reward: 50000000, weight: 7 },
  { id: 35, name: "Frontier Eval Minotaur", eraGate: "q3", hp: 250000, reward: 90000000, weight: 5 },
  { id: 36, name: "Supply-Chain Kraken", eraGate: "q3", hp: 280000, reward: 140000000, weight: 3 },
  { id: 37, name: "Datacenter Brownout", eraGate: "end", hp: 280000, reward: 350000000, weight: 8 },
  { id: 38, name: "BGP Hijack Phantom", eraGate: "end", hp: 250000, reward: 300000000, weight: 7 },
  { id: 39, name: "Orbital Debris Swarm", eraGate: "end", hp: 350000, reward: 500000000, weight: 5 },
  { id: 40, name: "Solar Flare Wyrm", eraGate: "end", hp: 400000, reward: 750000000, weight: 4 },
  { id: 41, name: "Martian Dust Devil", eraGate: "end", hp: 420000, reward: 1000000000, weight: 4 },
  { id: 42, name: "Alien Latency Lobster", eraGate: "end", hp: 320000, reward: 550000000, weight: 5 },
  { id: 43, name: "Terraform Titan", eraGate: "end", hp: 450000, reward: 1400000000, weight: 3 },
  { id: 44, name: "Black Hole Budget", eraGate: "end", hp: 480000, reward: 2500000000, weight: 2 },
] as const;
export const FIGHT_DURATION_MS = 30_000;
export const ENEMY_MEAN_WAIT_MS = { early: 90_000, mid: 120_000, upper: 150_000, q3: 180_000, end: 210_000 } as const;
