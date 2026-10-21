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
import type { Tag } from "./tags.ts"

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

/** Shop sections in kind order. Rows stay in catalog order so the next unlock sits under the row that opened it. */
export function gearSections<T extends { kind: GearKind }>(rows: readonly T[]): { id: GearKind; label: string; rows: T[] }[] {
  return GEAR_KINDS.flatMap((group) => {
    const inKind = rows.filter((row) => row.kind === group.id)
    return inKind.length > 0 ? [{ id: group.id, label: group.label, rows: inKind }] : []
  })
}

export type GearItem = {
  id: number
  kind: GearKind
  name: string
  tags: readonly Tag[]
  baseCost: number
  clickBonus: number
  cps: number
  unlockMoney: number
  unlockJobId: number
}

const GEAR_ROWS: readonly GearItem[] = [
  { id: 1, kind: "desk", name: "Thocky keyboard", tags: ["hardware"], baseCost: 200, clickBonus: 2, cps: 0, unlockMoney: 0, unlockJobId: 0 },
  { id: 2, kind: "desk", name: "Cable management kit", tags: ["hardware"], baseCost: 40, clickBonus: 0, cps: 0.05, unlockMoney: 10, unlockJobId: 0 },
  { id: 3, kind: "desk", name: "Desk lamp (bias)", tags: ["hardware"], baseCost: 60, clickBonus: 0, cps: 0.1, unlockMoney: 15, unlockJobId: 0 },
  { id: 4, kind: "desk", name: "Vertical mouse", tags: ["hardware"], baseCost: 80, clickBonus: 1, cps: 0, unlockMoney: 20, unlockJobId: 0 },
  { id: 5, kind: "desk", name: "Laptop stand + riser", tags: ["hardware"], baseCost: 70, clickBonus: 0, cps: 0.1, unlockMoney: 30, unlockJobId: 0 },
  { id: 6, kind: "desk", name: "Second monitor", tags: ["hardware", "frontend"], baseCost: 400, clickBonus: 3, cps: 0, unlockMoney: 50, unlockJobId: 0 },
  { id: 7, kind: "desk", name: "1080p webcam", tags: ["hardware", "product"], baseCost: 150, clickBonus: 0, cps: 0.2, unlockMoney: 60, unlockJobId: 0 },
  { id: 8, kind: "desk", name: "USB-C dock", tags: ["hardware"], baseCost: 250, clickBonus: 1, cps: 0, unlockMoney: 80, unlockJobId: 0 },
  { id: 9, kind: "desk", name: "Ergo chair", tags: ["hardware"], baseCost: 600, clickBonus: 0, cps: 0.5, unlockMoney: 100, unlockJobId: 0 },
  { id: 10, kind: "desk", name: "Noise-cancelling headset", tags: ["hardware"], baseCost: 350, clickBonus: 0, cps: 0.3, unlockMoney: 120, unlockJobId: 0 },
  { id: 11, kind: "desk", name: "Drawing tablet (UI)", tags: ["hardware", "frontend"], baseCost: 200, clickBonus: 1, cps: 0, unlockMoney: 150, unlockJobId: 0 },
  { id: 12, kind: "desk", name: "Standing desk converter", tags: ["hardware"], baseCost: 450, clickBonus: 0, cps: 0.4, unlockMoney: 200, unlockJobId: 0 },
  { id: 13, kind: "desk", name: "Split ergo keyboard", tags: ["hardware"], baseCost: 350, clickBonus: 2, cps: 0, unlockMoney: 250, unlockJobId: 0 },
  { id: 14, kind: "desk", name: "Third monitor (stack)", tags: ["hardware", "frontend"], baseCost: 500, clickBonus: 2, cps: 0, unlockMoney: 350, unlockJobId: 2 },
  { id: 15, kind: "desk", name: "Ultrawide monitor", tags: ["hardware", "frontend"], baseCost: 900, clickBonus: 4, cps: 0, unlockMoney: 400, unlockJobId: 2 },
  { id: 16, kind: "lab", name: "MCU / boards kit", tags: ["hardware"], baseCost: 100, clickBonus: 0, cps: 0.4, unlockMoney: 50, unlockJobId: 0 },
  { id: 17, kind: "lab", name: "Raspberry Pie lab", tags: ["hardware", "infra"], baseCost: 350, clickBonus: 0, cps: 2, unlockMoney: 80, unlockJobId: 0 },
  { id: 18, kind: "lab", name: "Pi PoE HAT pack", tags: ["hardware", "infra"], baseCost: 120, clickBonus: 0, cps: 0.5, unlockMoney: 100, unlockJobId: 0 },
  { id: 19, kind: "lab", name: "Label printer + patch panel", tags: ["hardware", "infra"], baseCost: 180, clickBonus: 0, cps: 0.3, unlockMoney: 120, unlockJobId: 0 },
  { id: 20, kind: "lab", name: "Homelab switch", tags: ["infra", "hardware"], baseCost: 500, clickBonus: 0, cps: 1.5, unlockMoney: 150, unlockJobId: 0 },
  { id: 21, kind: "lab", name: "Homelab KVM", tags: ["hardware", "infra"], baseCost: 250, clickBonus: 0, cps: 0.4, unlockMoney: 160, unlockJobId: 0 },
  { id: 22, kind: "lab", name: "Spare SSDs crate", tags: ["hardware", "data"], baseCost: 300, clickBonus: 0, cps: 1, unlockMoney: 180, unlockJobId: 0 },
  { id: 23, kind: "lab", name: "Homelab UPS (small)", tags: ["hardware", "infra"], baseCost: 400, clickBonus: 0, cps: 0.8, unlockMoney: 200, unlockJobId: 0 },
  { id: 24, kind: "lab", name: "Wi-Fi mesh kit", tags: ["infra", "hardware"], baseCost: 350, clickBonus: 0, cps: 0.6, unlockMoney: 220, unlockJobId: 0 },
  { id: 25, kind: "lab", name: "Homelab camera NVR", tags: ["hardware", "security"], baseCost: 450, clickBonus: 0, cps: 0.8, unlockMoney: 350, unlockJobId: 0 },
  { id: 26, kind: "lab", name: "Homelab firewall box", tags: ["security", "infra"], baseCost: 600, clickBonus: 0, cps: 2, unlockMoney: 400, unlockJobId: 2 },
  { id: 27, kind: "lab", name: "10GbE NIC upgrade", tags: ["infra", "hardware"], baseCost: 200, clickBonus: 0, cps: 1.2, unlockMoney: 500, unlockJobId: 2 },
  { id: 28, kind: "lab", name: "Mini rack (12U home)", tags: ["infra", "hardware"], baseCost: 800, clickBonus: 0, cps: 3, unlockMoney: 600, unlockJobId: 2 },
  { id: 29, kind: "lab", name: "Mini PC cluster (3)", tags: ["infra", "hardware"], baseCost: 3000, clickBonus: 0, cps: 20, unlockMoney: 2500, unlockJobId: 0 },
  { id: 30, kind: "storage", name: "External SSD vault", tags: ["data", "hardware"], baseCost: 250, clickBonus: 0, cps: 0.5, unlockMoney: 100, unlockJobId: 0 },
  { id: 31, kind: "storage", name: "NAS for backups", tags: ["data", "infra"], baseCost: 800, clickBonus: 0, cps: 3, unlockMoney: 200, unlockJobId: 0 },
  { id: 32, kind: "storage", name: "ZFS mirror pair", tags: ["data", "infra"], baseCost: 1200, clickBonus: 0, cps: 4, unlockMoney: 500, unlockJobId: 0 },
  { id: 33, kind: "storage", name: "NVMe cache tier", tags: ["data", "hardware"], baseCost: 2000, clickBonus: 0, cps: 6, unlockMoney: 1500, unlockJobId: 2 },
  { id: 34, kind: "storage", name: "Tape archive (LTO)", tags: ["data", "hardware"], baseCost: 5000, clickBonus: 0, cps: 8, unlockMoney: 3000, unlockJobId: 7 },
  { id: 35, kind: "storage", name: "Cold object vault", tags: ["data", "infra"], baseCost: 80000, clickBonus: 0, cps: 40, unlockMoney: 50000, unlockJobId: 14 },
  { id: 36, kind: "storage", name: "Geo-replicated NAS", tags: ["data", "infra"], baseCost: 120000, clickBonus: 0, cps: 60, unlockMoney: 80000, unlockJobId: 14 },
  { id: 37, kind: "storage", name: "Storage array", tags: ["data", "hardware"], baseCost: 400000, clickBonus: 0, cps: 200, unlockMoney: 200000, unlockJobId: 14 },
  { id: 38, kind: "storage", name: "Object storage fleet", tags: ["data", "infra"], baseCost: 2500000, clickBonus: 0, cps: 1500, unlockMoney: 1500000, unlockJobId: 18 },
  { id: 39, kind: "storage", name: "Petabyte tape library", tags: ["data", "hardware"], baseCost: 5000000, clickBonus: 0, cps: 2000, unlockMoney: 3000000, unlockJobId: 20 },
  { id: 40, kind: "storage", name: "Spare parts vault", tags: ["hardware"], baseCost: 10000000, clickBonus: 0, cps: 500, unlockMoney: 5000000, unlockJobId: 20 },
  { id: 41, kind: "storage", name: "Immutable backup bunker", tags: ["data", "security"], baseCost: 15000000, clickBonus: 0, cps: 3000, unlockMoney: 8000000, unlockJobId: 22 },
  { id: 42, kind: "cloud", name: "DNS + domain portfolio", tags: ["infra"], baseCost: 200, clickBonus: 0, cps: 0.5, unlockMoney: 80, unlockJobId: 0 },
  { id: 43, kind: "cloud", name: "CDN starter pack", tags: ["infra", "frontend"], baseCost: 400, clickBonus: 0, cps: 2, unlockMoney: 150, unlockJobId: 0 },
  { id: 44, kind: "cloud", name: "Cloud credits pack", tags: ["infra"], baseCost: 1000, clickBonus: 0, cps: 8, unlockMoney: 300, unlockJobId: 0 },
  { id: 45, kind: "cloud", name: "Serverless invoke pack", tags: ["infra", "backend"], baseCost: 800, clickBonus: 0, cps: 5, unlockMoney: 400, unlockJobId: 0 },
  { id: 46, kind: "cloud", name: "Reserved instances", tags: ["infra"], baseCost: 5000, clickBonus: 0, cps: 25, unlockMoney: 2000, unlockJobId: 0 },
  { id: 47, kind: "cloud", name: "Private link endpoints", tags: ["infra", "security"], baseCost: 8000, clickBonus: 0, cps: 15, unlockMoney: 5000, unlockJobId: 7 },
  { id: 48, kind: "cloud", name: "Savings plan (1yr)", tags: ["infra", "product"], baseCost: 15000, clickBonus: 0, cps: 50, unlockMoney: 8000, unlockJobId: 7 },
  { id: 49, kind: "cloud", name: "Multi-region credits", tags: ["infra"], baseCost: 25000, clickBonus: 0, cps: 80, unlockMoney: 15000, unlockJobId: 10 },
  { id: 50, kind: "cloud", name: "Managed cluster", tags: ["infra"], baseCost: 40000, clickBonus: 0, cps: 120, unlockMoney: 25000, unlockJobId: 14 },
  { id: 51, kind: "cloud", name: "Commit discount (3yr)", tags: ["infra", "product"], baseCost: 80000, clickBonus: 0, cps: 200, unlockMoney: 50000, unlockJobId: 14 },
  { id: 52, kind: "cloud", name: "Enterprise support tier", tags: ["infra", "product"], baseCost: 100000, clickBonus: 0, cps: 50, unlockMoney: 60000, unlockJobId: 14 },
  { id: 53, kind: "cloud", name: "Global anycast edge", tags: ["infra", "frontend"], baseCost: 200000, clickBonus: 0, cps: 400, unlockMoney: 100000, unlockJobId: 16 },
  { id: 54, kind: "cloud", name: "Dedicated tenancy", tags: ["infra", "security"], baseCost: 500000, clickBonus: 0, cps: 800, unlockMoney: 300000, unlockJobId: 18 },
  { id: 55, kind: "gpu", name: "eGPU enclosure", tags: ["ai", "hardware"], baseCost: 600, clickBonus: 2, cps: 5, unlockMoney: 400, unlockJobId: 0 },
  { id: 56, kind: "gpu", name: "VRAM upgrade kit", tags: ["ai", "hardware"], baseCost: 1200, clickBonus: 1, cps: 8, unlockMoney: 800, unlockJobId: 0 },
  { id: 57, kind: "gpu", name: "Home GPU (consumer)", tags: ["ai", "hardware"], baseCost: 2000, clickBonus: 5, cps: 15, unlockMoney: 1000, unlockJobId: 0 },
  { id: 58, kind: "gpu", name: "Used mining GPU lot", tags: ["ai", "hardware"], baseCost: 3500, clickBonus: 3, cps: 20, unlockMoney: 2000, unlockJobId: 2 },
  { id: 59, kind: "gpu", name: "NVLink bridge pair", tags: ["ai", "hardware"], baseCost: 5000, clickBonus: 0, cps: 25, unlockMoney: 4000, unlockJobId: 7 },
  { id: 60, kind: "gpu", name: "Workstation GPU", tags: ["ai", "hardware"], baseCost: 8000, clickBonus: 8, cps: 40, unlockMoney: 5000, unlockJobId: 0 },
  { id: 61, kind: "gpu", name: "Quantization edge stick", tags: ["ai", "hardware"], baseCost: 15000, clickBonus: 0, cps: 60, unlockMoney: 12000, unlockJobId: 10 },
  { id: 62, kind: "gpu", name: "Inference edge box", tags: ["ai", "hardware"], baseCost: 25000, clickBonus: 0, cps: 100, unlockMoney: 40000, unlockJobId: 10 },
  { id: 63, kind: "gpu", name: "Inference mini-pod (2)", tags: ["ai", "hardware"], baseCost: 80000, clickBonus: 0, cps: 300, unlockMoney: 60000, unlockJobId: 14 },
  { id: 64, kind: "gpu", name: "GPU node (A-class)", tags: ["ai", "hardware"], baseCost: 150000, clickBonus: 0, cps: 500, unlockMoney: 100000, unlockJobId: 14 },
  { id: 65, kind: "gpu", name: "HBM-class node", tags: ["ai", "hardware"], baseCost: 400000, clickBonus: 0, cps: 1200, unlockMoney: 250000, unlockJobId: 16 },
  { id: 66, kind: "gpu", name: "GPU node \u00d78 pod", tags: ["ai", "hardware"], baseCost: 900000, clickBonus: 0, cps: 3500, unlockMoney: 500000, unlockJobId: 16 },
  { id: 67, kind: "gpu", name: "Training pod (small)", tags: ["ai", "hardware"], baseCost: 2000000, clickBonus: 0, cps: 8000, unlockMoney: 1000000, unlockJobId: 18 },
  { id: 68, kind: "gpu", name: "GPU pod \u00d716", tags: ["ai", "hardware"], baseCost: 4000000, clickBonus: 0, cps: 15000, unlockMoney: 2500000, unlockJobId: 20 },
  { id: 69, kind: "gpu", name: "Training pod (large)", tags: ["ai", "hardware"], baseCost: 15000000, clickBonus: 0, cps: 50000, unlockMoney: 8000000, unlockJobId: 22 },
  { id: 70, kind: "gpu", name: "Custom accelerator board", tags: ["ai", "hardware"], baseCost: 25000000, clickBonus: 0, cps: 80000, unlockMoney: 15000000, unlockJobId: 22 },
  { id: 71, kind: "gpu", name: "Training hall (64)", tags: ["ai", "hardware"], baseCost: 80000000, clickBonus: 0, cps: 200000, unlockMoney: 40000000, unlockJobId: 24 },
  { id: 72, kind: "rack", name: "Blanking panels + airflow", tags: ["infra", "hardware"], baseCost: 200, clickBonus: 0, cps: 0.5, unlockMoney: 1000, unlockJobId: 2 },
  { id: 73, kind: "rack", name: "Rack shelf starter", tags: ["infra", "hardware"], baseCost: 1500, clickBonus: 0, cps: 10, unlockMoney: 1500, unlockJobId: 0 },
  { id: 74, kind: "rack", name: "Cable tray + fiber kit", tags: ["infra", "hardware"], baseCost: 800, clickBonus: 0, cps: 2, unlockMoney: 2000, unlockJobId: 2 },
  { id: 75, kind: "rack", name: "Out-of-band management", tags: ["infra", "hardware"], baseCost: 3000, clickBonus: 0, cps: 8, unlockMoney: 5000, unlockJobId: 7 },
  { id: 76, kind: "rack", name: "Half-rack colo", tags: ["infra", "hardware"], baseCost: 20000, clickBonus: 0, cps: 80, unlockMoney: 15000, unlockJobId: 2 },
  { id: 77, kind: "rack", name: "PDU + UPS", tags: ["infra", "hardware"], baseCost: 6000, clickBonus: 0, cps: 5, unlockMoney: 20000, unlockJobId: 2 },
  { id: 78, kind: "rack", name: "Cage + badge readers", tags: ["infra", "security"], baseCost: 25000, clickBonus: 0, cps: 15, unlockMoney: 20000, unlockJobId: 10 },
  { id: 79, kind: "rack", name: "Top-of-rack switch", tags: ["infra", "hardware"], baseCost: 12000, clickBonus: 0, cps: 30, unlockMoney: 30000, unlockJobId: 7 },
  { id: 80, kind: "rack", name: "Dual-feed power", tags: ["infra", "hardware"], baseCost: 40000, clickBonus: 0, cps: 40, unlockMoney: 35000, unlockJobId: 14 },
  { id: 81, kind: "rack", name: "Full rack", tags: ["infra", "hardware"], baseCost: 80000, clickBonus: 0, cps: 250, unlockMoney: 50000, unlockJobId: 7 },
  { id: 82, kind: "rack", name: "Row-level CDU", tags: ["infra", "hardware"], baseCost: 200000, clickBonus: 0, cps: 150, unlockMoney: 150000, unlockJobId: 16 },
  { id: 83, kind: "rack", name: "Hot-aisle containment", tags: ["infra", "hardware"], baseCost: 350000, clickBonus: 0, cps: 400, unlockMoney: 200000, unlockJobId: 16 },
  { id: 84, kind: "rack", name: "Multi-rack hall", tags: ["infra", "hardware"], baseCost: 500000, clickBonus: 0, cps: 1200, unlockMoney: 300000, unlockJobId: 18 },
  { id: 85, kind: "rack", name: "Liquid cooling loop", tags: ["infra", "hardware"], baseCost: 2000000, clickBonus: 0, cps: 3000, unlockMoney: 1500000, unlockJobId: 18 },
  { id: 86, kind: "rack", name: "Prefabricated modular DC", tags: ["infra", "hardware"], baseCost: 5000000, clickBonus: 0, cps: 8000, unlockMoney: 3000000, unlockJobId: 20 },
  { id: 87, kind: "rack", name: "Cooling plant share", tags: ["infra", "hardware"], baseCost: 80000000, clickBonus: 0, cps: 10000, unlockMoney: 40000000, unlockJobId: 22 },
  { id: 88, kind: "orbit", name: "Private 5G kit", tags: ["hardware", "infra"], baseCost: 100000, clickBonus: 0, cps: 50, unlockMoney: 80000, unlockJobId: 14 },
  { id: 89, kind: "orbit", name: "Satellite uplink modem", tags: ["hardware", "infra"], baseCost: 500000, clickBonus: 0, cps: 100, unlockMoney: 300000, unlockJobId: 16 },
  { id: 90, kind: "orbit", name: "S-band backup radio", tags: ["hardware", "infra"], baseCost: 750000, clickBonus: 0, cps: 200, unlockMoney: 400000, unlockJobId: 16 },
  { id: 91, kind: "orbit", name: "Ground station dish", tags: ["hardware", "infra"], baseCost: 2000000, clickBonus: 0, cps: 800, unlockMoney: 1000000, unlockJobId: 18 },
  { id: 92, kind: "orbit", name: "Space-hardened SSD pack", tags: ["hardware", "infra"], baseCost: 3000000, clickBonus: 0, cps: 1000, unlockMoney: 2000000, unlockJobId: 20 },
  { id: 93, kind: "orbit", name: "LEO relay contract", tags: ["hardware", "infra"], baseCost: 10000000, clickBonus: 0, cps: 5000, unlockMoney: 5000000, unlockJobId: 20 },
  { id: 94, kind: "orbit", name: "Laser crosslink kit", tags: ["hardware", "infra"], baseCost: 15000000, clickBonus: 0, cps: 8000, unlockMoney: 8000000, unlockJobId: 22 },
  { id: 95, kind: "orbit", name: "Orbital compute lease", tags: ["infra"], baseCost: 50000000, clickBonus: 0, cps: 20000, unlockMoney: 20000000, unlockJobId: 22 },
  { id: 96, kind: "orbit", name: "Orbital edge inference", tags: ["ai", "infra"], baseCost: 80000000, clickBonus: 0, cps: 30000, unlockMoney: 40000000, unlockJobId: 24 },
  { id: 97, kind: "orbit", name: "Constellation slot deposit", tags: ["product", "infra"], baseCost: 200000000, clickBonus: 0, cps: 50000, unlockMoney: 100000000, unlockJobId: 26 },
  { id: 98, kind: "mars", name: "Mars habitat rack", tags: ["hardware", "infra"], baseCost: 200000000, clickBonus: 0, cps: 80000, unlockMoney: 100000000, unlockJobId: 28 },
  { id: 99, kind: "mars", name: "Pressurized spares vault", tags: ["hardware"], baseCost: 250000000, clickBonus: 0, cps: 40000, unlockMoney: 150000000, unlockJobId: 28 },
  { id: 100, kind: "mars", name: "Dust-sealed GPU sled", tags: ["ai", "hardware"], baseCost: 300000000, clickBonus: 0, cps: 100000, unlockMoney: 200000000, unlockJobId: 28 },
  { id: 101, kind: "mars", name: "Habitat mesh backhaul", tags: ["hardware", "infra"], baseCost: 400000000, clickBonus: 0, cps: 90000, unlockMoney: 220000000, unlockJobId: 28 },
  { id: 102, kind: "mars", name: "Mars power coupling", tags: ["hardware", "infra"], baseCost: 500000000, clickBonus: 0, cps: 150000, unlockMoney: 250000000, unlockJobId: 29 },
  { id: 103, kind: "mars", name: "Ice-mine coolant loop", tags: ["hardware", "infra"], baseCost: 600000000, clickBonus: 0, cps: 120000, unlockMoney: 350000000, unlockJobId: 29 },
  { id: 104, kind: "mars", name: "Regolith compute bay", tags: ["hardware", "infra"], baseCost: 800000000, clickBonus: 0, cps: 200000, unlockMoney: 400000000, unlockJobId: 29 },
  { id: 105, kind: "mars", name: "Solar farm share (Mars)", tags: ["hardware", "infra"], baseCost: 1000000000, clickBonus: 0, cps: 250000, unlockMoney: 600000000, unlockJobId: 30 },
  { id: 106, kind: "mars", name: "Nuclear micro-reactor lease", tags: ["hardware"], baseCost: 5000000000, clickBonus: 0, cps: 800000, unlockMoney: 2000000000, unlockJobId: 30 },
  { id: 107, kind: "mars", name: "Megacampus hall A", tags: ["hardware", "infra"], baseCost: 20000000000, clickBonus: 0, cps: 2000000, unlockMoney: 10000000000, unlockJobId: 31 },
  { id: 108, kind: "mars", name: "Megacampus hall B", tags: ["hardware", "infra"], baseCost: 50000000000, clickBonus: 0, cps: 4000000, unlockMoney: 25000000000, unlockJobId: 31 },
  { id: 109, kind: "mars", name: "Interplanetary NOC", tags: ["hardware", "infra"], baseCost: 100000000000, clickBonus: 0, cps: 8000000, unlockMoney: 50000000000, unlockJobId: 31 },
  { id: 110, kind: "mars", name: "Sovereign Mars campus", tags: ["hardware", "infra"], baseCost: 500000000000, clickBonus: 0, cps: 30000000, unlockMoney: 200000000000, unlockJobId: 31 },
] as const

export const GEAR: readonly GearItem[] = GEAR_ROWS.map((row) => ({
  ...row,
  baseCost: scalePurchaseCost(row.baseCost),
}))
