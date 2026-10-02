/**
 * Gear: repeatable infra buys, shown on the Gear tab (state and saves still call them `equipment`).
 * The tab opens at GEAR_TAB_UNLOCK.minXp lifetime XP. A row then shows once the player has held
 * `unlockMoney` (peakMoney) and holds job `unlockJobId` (0 = no job needed), or already owns it.
 * A table drop needs unique ids. `kind` groups rows under a section header, in GEAR_KINDS order,
 * so a new kind is one line here and no UI edit.
 * `baseCost` below is unscaled; the export doubles it.
 * Mid and late rows stagger unlockJobId so a fat early balance does not reveal the whole rack.
 */
import { scalePurchaseCost } from "./costs.ts"

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

const GEAR_ROWS: readonly GearItem[] = [
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
  { id: 13, kind: "rack", name: "Half-rack colo", baseCost: 20000, clickBonus: 0, cps: 80, unlockMoney: 15000, unlockJobId: 2 },
  { id: 14, kind: "rack", name: "Full rack", baseCost: 80000, clickBonus: 0, cps: 250, unlockMoney: 50000, unlockJobId: 7 },
  { id: 15, kind: "rack", name: "Top-of-rack switch", baseCost: 12000, clickBonus: 0, cps: 30, unlockMoney: 30000, unlockJobId: 7 },
  { id: 16, kind: "rack", name: "PDU + UPS", baseCost: 6000, clickBonus: 0, cps: 5, unlockMoney: 20000, unlockJobId: 2 },
  { id: 17, kind: "gpu", name: "GPU node (A-class)", baseCost: 150000, clickBonus: 0, cps: 500, unlockMoney: 100000, unlockJobId: 14 },
  { id: 18, kind: "gpu", name: "GPU node \u00d78 pod", baseCost: 900000, clickBonus: 0, cps: 3500, unlockMoney: 500000, unlockJobId: 16 },
  { id: 19, kind: "gpu", name: "Inference edge box", baseCost: 25000, clickBonus: 0, cps: 100, unlockMoney: 40000, unlockJobId: 10 },
  { id: 20, kind: "gpu", name: "Training pod (small)", baseCost: 2000000, clickBonus: 0, cps: 8000, unlockMoney: 1000000, unlockJobId: 18 },
  { id: 21, kind: "gpu", name: "Training pod (large)", baseCost: 15000000, clickBonus: 0, cps: 50000, unlockMoney: 8000000, unlockJobId: 22 },
  { id: 22, kind: "storage", name: "Storage array", baseCost: 400000, clickBonus: 0, cps: 200, unlockMoney: 200000, unlockJobId: 14 },
  { id: 23, kind: "storage", name: "Object storage fleet", baseCost: 2500000, clickBonus: 0, cps: 1500, unlockMoney: 1500000, unlockJobId: 18 },
  { id: 24, kind: "orbit", name: "Private 5G kit", baseCost: 100000, clickBonus: 0, cps: 50, unlockMoney: 80000, unlockJobId: 14 },
  { id: 25, kind: "orbit", name: "Satellite uplink modem", baseCost: 500000, clickBonus: 0, cps: 100, unlockMoney: 300000, unlockJobId: 16 },
  { id: 26, kind: "orbit", name: "Orbital compute lease", baseCost: 50000000, clickBonus: 0, cps: 20000, unlockMoney: 20000000, unlockJobId: 22 },
  { id: 27, kind: "mars", name: "Mars habitat rack", baseCost: 200000000, clickBonus: 0, cps: 80000, unlockMoney: 100000000, unlockJobId: 28 },
  { id: 28, kind: "mars", name: "Mars power coupling", baseCost: 500000000, clickBonus: 0, cps: 150000, unlockMoney: 250000000, unlockJobId: 29 },
  { id: 29, kind: "rack", name: "Cooling plant share", baseCost: 80000000, clickBonus: 0, cps: 10000, unlockMoney: 40000000, unlockJobId: 22 },
  { id: 30, kind: "storage", name: "Spare parts vault", baseCost: 10000000, clickBonus: 0, cps: 500, unlockMoney: 5000000, unlockJobId: 20 },
  { id: 31, kind: "desk", name: "Vertical mouse", baseCost: 80, clickBonus: 1, cps: 0, unlockMoney: 20, unlockJobId: 0 },
  { id: 32, kind: "desk", name: "Desk lamp (bias)", baseCost: 60, clickBonus: 0, cps: 0.1, unlockMoney: 15, unlockJobId: 0 },
  { id: 33, kind: "desk", name: "USB-C dock", baseCost: 250, clickBonus: 1, cps: 0, unlockMoney: 80, unlockJobId: 0 },
  { id: 34, kind: "desk", name: "Noise-cancelling headset", baseCost: 350, clickBonus: 0, cps: 0.3, unlockMoney: 120, unlockJobId: 0 },
  { id: 35, kind: "desk", name: "1080p webcam", baseCost: 150, clickBonus: 0, cps: 0.2, unlockMoney: 60, unlockJobId: 0 },
  { id: 36, kind: "desk", name: "Standing desk converter", baseCost: 450, clickBonus: 0, cps: 0.4, unlockMoney: 200, unlockJobId: 0 },
  { id: 37, kind: "desk", name: "Ultrawide monitor", baseCost: 900, clickBonus: 4, cps: 0, unlockMoney: 400, unlockJobId: 2 },
  { id: 38, kind: "desk", name: "Split ergo keyboard", baseCost: 350, clickBonus: 2, cps: 0, unlockMoney: 250, unlockJobId: 0 },
  { id: 39, kind: "desk", name: "Cable management kit", baseCost: 40, clickBonus: 0, cps: 0.05, unlockMoney: 10, unlockJobId: 0 },
  { id: 40, kind: "desk", name: "Laptop stand + riser", baseCost: 70, clickBonus: 0, cps: 0.1, unlockMoney: 30, unlockJobId: 0 },
  { id: 41, kind: "desk", name: "Drawing tablet (UI)", baseCost: 200, clickBonus: 1, cps: 0, unlockMoney: 150, unlockJobId: 0 },
  { id: 42, kind: "desk", name: "Third monitor (stack)", baseCost: 500, clickBonus: 2, cps: 0, unlockMoney: 350, unlockJobId: 2 },
  { id: 43, kind: "lab", name: "Pi PoE HAT pack", baseCost: 120, clickBonus: 0, cps: 0.5, unlockMoney: 100, unlockJobId: 0 },
  { id: 44, kind: "lab", name: "Homelab UPS (small)", baseCost: 400, clickBonus: 0, cps: 0.8, unlockMoney: 200, unlockJobId: 0 },
  { id: 45, kind: "lab", name: "Label printer + patch panel", baseCost: 180, clickBonus: 0, cps: 0.3, unlockMoney: 120, unlockJobId: 0 },
  { id: 46, kind: "lab", name: "Spare SSDs crate", baseCost: 300, clickBonus: 0, cps: 1.0, unlockMoney: 180, unlockJobId: 0 },
  { id: 47, kind: "lab", name: "Homelab KVM", baseCost: 250, clickBonus: 0, cps: 0.4, unlockMoney: 160, unlockJobId: 0 },
  { id: 48, kind: "lab", name: "Wi-Fi mesh kit", baseCost: 350, clickBonus: 0, cps: 0.6, unlockMoney: 220, unlockJobId: 0 },
  { id: 49, kind: "lab", name: "MCU / boards kit", baseCost: 100, clickBonus: 0, cps: 0.4, unlockMoney: 50, unlockJobId: 0 },
  { id: 50, kind: "lab", name: "Homelab firewall box", baseCost: 600, clickBonus: 0, cps: 2.0, unlockMoney: 400, unlockJobId: 2 },
  { id: 51, kind: "lab", name: "10GbE NIC upgrade", baseCost: 200, clickBonus: 0, cps: 1.2, unlockMoney: 500, unlockJobId: 2 },
  { id: 52, kind: "lab", name: "Mini rack (12U home)", baseCost: 800, clickBonus: 0, cps: 3.0, unlockMoney: 600, unlockJobId: 2 },
  { id: 53, kind: "lab", name: "Homelab camera NVR", baseCost: 450, clickBonus: 0, cps: 0.8, unlockMoney: 350, unlockJobId: 0 },
  { id: 54, kind: "storage", name: "External SSD vault", baseCost: 250, clickBonus: 0, cps: 0.5, unlockMoney: 100, unlockJobId: 0 },
  { id: 55, kind: "storage", name: "ZFS mirror pair", baseCost: 1200, clickBonus: 0, cps: 4, unlockMoney: 500, unlockJobId: 0 },
  { id: 56, kind: "storage", name: "Tape archive (LTO)", baseCost: 5000, clickBonus: 0, cps: 8, unlockMoney: 3000, unlockJobId: 7 },
  { id: 57, kind: "storage", name: "NVMe cache tier", baseCost: 2000, clickBonus: 0, cps: 6, unlockMoney: 1500, unlockJobId: 2 },
  { id: 58, kind: "storage", name: "Cold object vault", baseCost: 80000, clickBonus: 0, cps: 40, unlockMoney: 50000, unlockJobId: 14 },
  { id: 59, kind: "storage", name: "Geo-replicated NAS", baseCost: 120000, clickBonus: 0, cps: 60, unlockMoney: 80000, unlockJobId: 14 },
  { id: 60, kind: "storage", name: "Petabyte tape library", baseCost: 5000000, clickBonus: 0, cps: 2000, unlockMoney: 3000000, unlockJobId: 20 },
  { id: 61, kind: "storage", name: "Immutable backup bunker", baseCost: 15000000, clickBonus: 0, cps: 3000, unlockMoney: 8000000, unlockJobId: 22 },
  { id: 62, kind: "cloud", name: "CDN starter pack", baseCost: 400, clickBonus: 0, cps: 2, unlockMoney: 150, unlockJobId: 0 },
  { id: 63, kind: "cloud", name: "DNS + domain portfolio", baseCost: 200, clickBonus: 0, cps: 0.5, unlockMoney: 80, unlockJobId: 0 },
  { id: 64, kind: "cloud", name: "Serverless invoke pack", baseCost: 800, clickBonus: 0, cps: 5, unlockMoney: 400, unlockJobId: 0 },
  { id: 65, kind: "cloud", name: "Savings plan (1yr)", baseCost: 15000, clickBonus: 0, cps: 50, unlockMoney: 8000, unlockJobId: 7 },
  { id: 66, kind: "cloud", name: "Multi-region credits", baseCost: 25000, clickBonus: 0, cps: 80, unlockMoney: 15000, unlockJobId: 10 },
  { id: 67, kind: "cloud", name: "Private link endpoints", baseCost: 8000, clickBonus: 0, cps: 15, unlockMoney: 5000, unlockJobId: 7 },
  { id: 68, kind: "cloud", name: "Managed cluster", baseCost: 40000, clickBonus: 0, cps: 120, unlockMoney: 25000, unlockJobId: 14 },
  { id: 69, kind: "cloud", name: "Global anycast edge", baseCost: 200000, clickBonus: 0, cps: 400, unlockMoney: 100000, unlockJobId: 16 },
  { id: 70, kind: "cloud", name: "Enterprise support tier", baseCost: 100000, clickBonus: 0, cps: 50, unlockMoney: 60000, unlockJobId: 14 },
  { id: 71, kind: "cloud", name: "Dedicated tenancy", baseCost: 500000, clickBonus: 0, cps: 800, unlockMoney: 300000, unlockJobId: 18 },
  { id: 72, kind: "cloud", name: "Commit discount (3yr)", baseCost: 80000, clickBonus: 0, cps: 200, unlockMoney: 50000, unlockJobId: 14 },
  { id: 73, kind: "gpu", name: "eGPU enclosure", baseCost: 600, clickBonus: 2, cps: 5, unlockMoney: 400, unlockJobId: 0 },
  { id: 74, kind: "gpu", name: "Used mining GPU lot", baseCost: 3500, clickBonus: 3, cps: 20, unlockMoney: 2000, unlockJobId: 2 },
  { id: 75, kind: "gpu", name: "VRAM upgrade kit", baseCost: 1200, clickBonus: 1, cps: 8, unlockMoney: 800, unlockJobId: 0 },
  { id: 76, kind: "gpu", name: "NVLink bridge pair", baseCost: 5000, clickBonus: 0, cps: 25, unlockMoney: 4000, unlockJobId: 7 },
  { id: 77, kind: "gpu", name: "Inference mini-pod (2)", baseCost: 80000, clickBonus: 0, cps: 300, unlockMoney: 60000, unlockJobId: 14 },
  { id: 78, kind: "gpu", name: "HBM-class node", baseCost: 400000, clickBonus: 0, cps: 1200, unlockMoney: 250000, unlockJobId: 16 },
  { id: 79, kind: "gpu", name: "GPU pod \u00d716", baseCost: 4000000, clickBonus: 0, cps: 15000, unlockMoney: 2500000, unlockJobId: 20 },
  { id: 80, kind: "gpu", name: "Training hall (64)", baseCost: 80000000, clickBonus: 0, cps: 200000, unlockMoney: 40000000, unlockJobId: 24 },
  { id: 81, kind: "gpu", name: "Custom accelerator board", baseCost: 25000000, clickBonus: 0, cps: 80000, unlockMoney: 15000000, unlockJobId: 22 },
  { id: 82, kind: "gpu", name: "Quantization edge stick", baseCost: 15000, clickBonus: 0, cps: 60, unlockMoney: 12000, unlockJobId: 10 },
  { id: 83, kind: "rack", name: "Blanking panels + airflow", baseCost: 200, clickBonus: 0, cps: 0.5, unlockMoney: 1000, unlockJobId: 2 },
  { id: 84, kind: "rack", name: "Cable tray + fiber kit", baseCost: 800, clickBonus: 0, cps: 2, unlockMoney: 2000, unlockJobId: 2 },
  { id: 85, kind: "rack", name: "Out-of-band management", baseCost: 3000, clickBonus: 0, cps: 8, unlockMoney: 5000, unlockJobId: 7 },
  { id: 86, kind: "rack", name: "Cage + badge readers", baseCost: 25000, clickBonus: 0, cps: 15, unlockMoney: 20000, unlockJobId: 10 },
  { id: 87, kind: "rack", name: "Dual-feed power", baseCost: 40000, clickBonus: 0, cps: 40, unlockMoney: 35000, unlockJobId: 14 },
  { id: 88, kind: "rack", name: "Row-level CDU", baseCost: 200000, clickBonus: 0, cps: 150, unlockMoney: 150000, unlockJobId: 16 },
  { id: 89, kind: "rack", name: "Multi-rack hall", baseCost: 500000, clickBonus: 0, cps: 1200, unlockMoney: 300000, unlockJobId: 18 },
  { id: 90, kind: "rack", name: "Prefabricated modular DC", baseCost: 5000000, clickBonus: 0, cps: 8000, unlockMoney: 3000000, unlockJobId: 20 },
  { id: 91, kind: "rack", name: "Liquid cooling loop", baseCost: 2000000, clickBonus: 0, cps: 3000, unlockMoney: 1500000, unlockJobId: 18 },
  { id: 92, kind: "rack", name: "Hot-aisle containment", baseCost: 350000, clickBonus: 0, cps: 400, unlockMoney: 200000, unlockJobId: 16 },
  { id: 93, kind: "orbit", name: "Ground station dish", baseCost: 2000000, clickBonus: 0, cps: 800, unlockMoney: 1000000, unlockJobId: 18 },
  { id: 94, kind: "orbit", name: "LEO relay contract", baseCost: 10000000, clickBonus: 0, cps: 5000, unlockMoney: 5000000, unlockJobId: 20 },
  { id: 95, kind: "orbit", name: "S-band backup radio", baseCost: 750000, clickBonus: 0, cps: 200, unlockMoney: 400000, unlockJobId: 16 },
  { id: 96, kind: "orbit", name: "Space-hardened SSD pack", baseCost: 3000000, clickBonus: 0, cps: 1000, unlockMoney: 2000000, unlockJobId: 20 },
  { id: 97, kind: "orbit", name: "Orbital edge inference", baseCost: 80000000, clickBonus: 0, cps: 30000, unlockMoney: 40000000, unlockJobId: 24 },
  { id: 98, kind: "orbit", name: "Constellation slot deposit", baseCost: 200000000, clickBonus: 0, cps: 50000, unlockMoney: 100000000, unlockJobId: 26 },
  { id: 99, kind: "orbit", name: "Laser crosslink kit", baseCost: 15000000, clickBonus: 0, cps: 8000, unlockMoney: 8000000, unlockJobId: 22 },
  { id: 100, kind: "mars", name: "Regolith compute bay", baseCost: 800000000, clickBonus: 0, cps: 200000, unlockMoney: 400000000, unlockJobId: 29 },
  { id: 101, kind: "mars", name: "Dust-sealed GPU sled", baseCost: 300000000, clickBonus: 0, cps: 100000, unlockMoney: 200000000, unlockJobId: 28 },
  { id: 102, kind: "mars", name: "Ice-mine coolant loop", baseCost: 600000000, clickBonus: 0, cps: 120000, unlockMoney: 350000000, unlockJobId: 29 },
  { id: 103, kind: "mars", name: "Habitat mesh backhaul", baseCost: 400000000, clickBonus: 0, cps: 90000, unlockMoney: 220000000, unlockJobId: 28 },
  { id: 104, kind: "mars", name: "Pressurized spares vault", baseCost: 250000000, clickBonus: 0, cps: 40000, unlockMoney: 150000000, unlockJobId: 28 },
  { id: 105, kind: "mars", name: "Solar farm share (Mars)", baseCost: 1000000000, clickBonus: 0, cps: 250000, unlockMoney: 600000000, unlockJobId: 30 },
  { id: 106, kind: "mars", name: "Nuclear micro-reactor lease", baseCost: 5000000000, clickBonus: 0, cps: 800000, unlockMoney: 2000000000, unlockJobId: 30 },
  { id: 107, kind: "mars", name: "Megacampus hall A", baseCost: 20000000000, clickBonus: 0, cps: 2000000, unlockMoney: 10000000000, unlockJobId: 31 },
  { id: 108, kind: "mars", name: "Megacampus hall B", baseCost: 50000000000, clickBonus: 0, cps: 4000000, unlockMoney: 25000000000, unlockJobId: 31 },
  { id: 109, kind: "mars", name: "Interplanetary NOC", baseCost: 100000000000, clickBonus: 0, cps: 8000000, unlockMoney: 50000000000, unlockJobId: 31 },
  { id: 110, kind: "mars", name: "Sovereign Mars campus", baseCost: 500000000000, clickBonus: 0, cps: 30000000, unlockMoney: 200000000000, unlockJobId: 31 },
] as const

export const GEAR: readonly GearItem[] = GEAR_ROWS.map((row) => ({
  ...row,
  baseCost: scalePurchaseCost(row.baseCost),
}))
