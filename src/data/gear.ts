/**
 * Gear: repeatable infra buys, shown on the Gear tab (state and saves still call them `equipment`).
 * The tab opens at GEAR_TAB_UNLOCK.minXp lifetime XP. A row then shows once the player has held
 * `unlockMoney` (peakMoney) and holds job `unlockJobId` (0 = no job needed), or already owns it.
 * A table drop needs unique ids. `kind` groups rows under a section header, in GEAR_KINDS order,
 * so a new kind is one line here and no UI edit.
 */
export type GearKind = "desk" | "lab" | "storage" | "cloud" | "gpu" | "rack" | "orbit" | "mars"

export const GEAR_KINDS: readonly { id: GearKind; label: string }[] = [
  { id: "desk", label: "Desk" },
  { id: "lab", label: "Home lab" },
  { id: "storage", label: "Storage" },
  { id: "cloud", label: "Cloud" },
  { id: "gpu", label: "GPUs" },
  { id: "rack", label: "Racks" },
  { id: "orbit", label: "Orbit" },
  { id: "mars", label: "Mars" },
]

export type GearItem = {
  id: number
  kind: GearKind
  name: string
  baseCost: number
  clickBonus: number
  cps: number
  unlockMoney: number
  unlockJobId: number
}

export const GEAR: readonly GearItem[] = [
  { id: 1, kind: "desk", name: "Thocky keyboard", baseCost: 200, clickBonus: 2, cps: 0, unlockMoney: 0, unlockJobId: 0 },
  { id: 2, kind: "desk", name: "Second monitor", baseCost: 400, clickBonus: 3, cps: 0, unlockMoney: 50, unlockJobId: 0 },
  { id: 3, kind: "desk", name: "Ergo chair", baseCost: 600, clickBonus: 0, cps: 0.5, unlockMoney: 100, unlockJobId: 0 },
  { id: 4, kind: "lab", name: "Raspberry Pie lab", baseCost: 350, clickBonus: 0, cps: 2, unlockMoney: 80, unlockJobId: 0 },
  { id: 5, kind: "storage", name: "NAS for backups", baseCost: 800, clickBonus: 0, cps: 3, unlockMoney: 200, unlockJobId: 0 },
  { id: 6, kind: "lab", name: "Homelab switch", baseCost: 500, clickBonus: 0, cps: 1.5, unlockMoney: 150, unlockJobId: 0 },
  { id: 7, kind: "cloud", name: "Cloud credits pack", baseCost: 1000, clickBonus: 0, cps: 8, unlockMoney: 300, unlockJobId: 0 },
  { id: 8, kind: "cloud", name: "Reserved instances", baseCost: 5000, clickBonus: 0, cps: 25, unlockMoney: 2000, unlockJobId: 0 },
  { id: 9, kind: "gpu", name: "Home GPU (consumer)", baseCost: 2000, clickBonus: 5, cps: 15, unlockMoney: 1000, unlockJobId: 0 },
  { id: 10, kind: "gpu", name: "Workstation GPU", baseCost: 8000, clickBonus: 8, cps: 40, unlockMoney: 5000, unlockJobId: 0 },
  { id: 11, kind: "lab", name: "Mini PC cluster (3)", baseCost: 3000, clickBonus: 0, cps: 20, unlockMoney: 2500, unlockJobId: 0 },
  { id: 12, kind: "rack", name: "Rack shelf starter", baseCost: 1500, clickBonus: 0, cps: 10, unlockMoney: 1500, unlockJobId: 0 },
  { id: 13, kind: "rack", name: "Half-rack colo", baseCost: 20000, clickBonus: 0, cps: 80, unlockMoney: 15000, unlockJobId: 0 },
  { id: 14, kind: "rack", name: "Full rack", baseCost: 80000, clickBonus: 0, cps: 250, unlockMoney: 50000, unlockJobId: 0 },
  { id: 15, kind: "rack", name: "Top-of-rack switch", baseCost: 12000, clickBonus: 0, cps: 30, unlockMoney: 30000, unlockJobId: 0 },
  { id: 16, kind: "rack", name: "PDU + UPS", baseCost: 6000, clickBonus: 0, cps: 5, unlockMoney: 20000, unlockJobId: 0 },
  { id: 17, kind: "gpu", name: "GPU node (A-class)", baseCost: 150000, clickBonus: 0, cps: 500, unlockMoney: 100000, unlockJobId: 0 },
  { id: 18, kind: "gpu", name: "GPU node ×8 pod", baseCost: 900000, clickBonus: 0, cps: 3500, unlockMoney: 500000, unlockJobId: 0 },
  { id: 19, kind: "gpu", name: "Inference edge box", baseCost: 25000, clickBonus: 0, cps: 100, unlockMoney: 40000, unlockJobId: 0 },
  { id: 20, kind: "gpu", name: "Training pod (small)", baseCost: 2000000, clickBonus: 0, cps: 8000, unlockMoney: 1000000, unlockJobId: 0 },
  { id: 21, kind: "gpu", name: "Training pod (large)", baseCost: 15000000, clickBonus: 0, cps: 50000, unlockMoney: 8000000, unlockJobId: 0 },
  { id: 22, kind: "storage", name: "Storage array", baseCost: 400000, clickBonus: 0, cps: 200, unlockMoney: 200000, unlockJobId: 0 },
  { id: 23, kind: "storage", name: "Object storage fleet", baseCost: 2500000, clickBonus: 0, cps: 1500, unlockMoney: 1500000, unlockJobId: 0 },
  { id: 24, kind: "orbit", name: "Private 5G kit", baseCost: 100000, clickBonus: 0, cps: 50, unlockMoney: 80000, unlockJobId: 0 },
  { id: 25, kind: "orbit", name: "Satellite uplink modem", baseCost: 500000, clickBonus: 0, cps: 100, unlockMoney: 300000, unlockJobId: 0 },
  { id: 26, kind: "orbit", name: "Orbital compute lease", baseCost: 50000000, clickBonus: 0, cps: 20000, unlockMoney: 20000000, unlockJobId: 0 },
  { id: 27, kind: "mars", name: "Mars habitat rack", baseCost: 200000000, clickBonus: 0, cps: 80000, unlockMoney: 100000000, unlockJobId: 0 },
  { id: 28, kind: "mars", name: "Mars power coupling", baseCost: 500000000, clickBonus: 0, cps: 150000, unlockMoney: 250000000, unlockJobId: 0 },
  { id: 29, kind: "rack", name: "Cooling plant share", baseCost: 80000000, clickBonus: 0, cps: 10000, unlockMoney: 40000000, unlockJobId: 0 },
  { id: 30, kind: "storage", name: "Spare parts vault", baseCost: 10000000, clickBonus: 0, cps: 500, unlockMoney: 5000000, unlockJobId: 0 },
] as const
