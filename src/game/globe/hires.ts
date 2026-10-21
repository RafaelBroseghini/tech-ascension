import { totalUsers } from "./world.ts"

/** One kind of person the ladder can pay to grow the product while the day job takes the days. Each is hired again and again. */
export interface Hire {
  readonly id: string
  readonly name: string
  readonly line: string
  /** Paid on hiring the first one. Each copy after costs `rate` times the one before (`floor(price × rate ^ held)`). */
  readonly price: number
  readonly rate: number
  /** Dollars a second for each one held, for as long as they stay. */
  readonly salary: number
  /** The most growth this kind can add to the multiplier, however many are hired. The multiplier is 1 for the player's own pace. */
  readonly growth: number
  /** Heads at which this kind has added 63% of its `growth`: the bonus is `growth × (1 − e^(−held / scale))`, so a crowd of them has diminishing returns. */
  readonly scale: number
}

/** Cheapest first. A row opens once the one above it has a hire. */
export const HIRES: readonly Hire[] = [
  { id: "outsourced", name: "Outsourced body shop", line: "Ticket in, ticket out. Timezone not included.", price: 5_000, rate: 1.003, salary: 1, growth: 10, scale: 400 },
  { id: "bootcamp", name: "Bootcamp grad", line: "Learned React in twelve weeks. Will tell you.", price: 50_000, rate: 1.003, salary: 5, growth: 12, scale: 400 },
  { id: "copypaste", name: "Stack Overflow copy-paster", line: "Accepted answer, 2011. Ships it.", price: 500_000, rate: 1.003, salary: 12, growth: 14, scale: 400 },
  { id: "senior", name: "Senior engineer", line: "'It depends.' Then fixes your architecture.", price: 5_000_000, rate: 1.003, salary: 25, growth: 16, scale: 400 },
  { id: "staff", name: "Staff engineer", line: "Has not written code since the reorg. Prevents more than they ship.", price: 50_000_000, rate: 1.003, salary: 50, growth: 18, scale: 400 },
  { id: "tenx", name: "10x developer", line: "Rumoured to exist. The standups confirm it.", price: 500_000_000, rate: 1.003, salary: 100, growth: 20, scale: 400 },
  { id: "greybeard", name: "Greybeard", line: "Wrote the parser in 1987. Edits in vi. Will not explain.", price: 5_000_000_000, rate: 1.003, salary: 200, growth: 22.8, scale: 400 },
  { id: "codegod", name: "Code god", line: "Commits straight to main. CI waits for them.", price: 50_000_000_000, rate: 1.003, salary: 400, growth: 25.6, scale: 400 },
]

/** Heads of each kind, by id. A kind with nobody is left out. */
export type Hires = Readonly<Record<string, number>>

/** The most of any one kind. */
export const MAX_HIRES = 10_000

export const hireById = (id: string): Hire | undefined => HIRES.find((h) => h.id === id)

const heldOf = (hires: Hires, row: Hire): number => hires[row.id] ?? 0

/** Everyone on the payroll. */
export const headcountOf = (hires: Hires): number => HIRES.reduce((sum, h) => sum + heldOf(hires, h), 0)

/** Growth the team adds to the multiplier. */
export const hireBonusOf = (hires: Hires): number => HIRES.reduce((sum, h) => sum + h.growth * (1 - Math.exp(-heldOf(hires, h) / h.scale)), 0)

/** Growth the next hire of a kind adds, with `held` already on the payroll. */
export const hireGrowthStep = (row: Hire, held: number): number => row.growth * (Math.exp(-held / row.scale) - Math.exp(-(held + 1) / row.scale))

/** Dollars a second the team costs. */
export const hirePayrollOf = (hires: Hires): number => HIRES.reduce((sum, h) => sum + heldOf(hires, h) * h.salary, 0)

/** The price of the next copy of a kind with `held` already hired. */
export const hirePrice = (row: Hire, held: number): number => Math.floor(row.price * row.rate ** held)

/** The price of `count` more of a kind with `held` already hired. */
export function hireCost(row: Hire, held: number, count: number): number {
  let sum = 0
  for (let i = 0; i < count; i++) sum += hirePrice(row, held + i)
  return sum
}

/** How many more of a kind `money` pays for, to the cap. */
export function maxHires(row: Hire, held: number, money: number): number {
  const room = Math.max(0, MAX_HIRES - held)
  const first = hirePrice(row, held)
  if (room === 0 || !(money >= first)) return 0
  let n = Math.min(room, Math.floor(Math.log(1 + (money * (row.rate - 1)) / (first || 1)) / Math.log(row.rate)))
  while (n > 0 && hireCost(row, held, n) > money) n--
  while (n < room && hireCost(row, held, n + 1) <= money) n++
  return n
}

/** The rows the shop lists: every row through the last kind with a hire, and the one after it. Firing a whole kind keeps the rows below it open. */
export function openHires(hires: Hires): Hire[] {
  let last = -1
  HIRES.forEach((row, index) => {
    if (heldOf(hires, row) > 0) last = index
  })
  return HIRES.slice(0, Math.min(HIRES.length, last + 2))
}

/** Hires go in an open row, with the money for at least one. */
export function canHire(hires: Hires, money: number, id: string): boolean {
  const row = openHires(hires).find((h) => h.id === id)
  return row !== undefined && maxHires(row, heldOf(hires, row), money) > 0
}

/** What hiring changes, or null when it is refused and nothing changes. */
export function hire(s: { readonly money: number; readonly hires: Hires }, id: string): { money: number; hires: Hires } | null {
  if (!canHire(s.hires, s.money, id)) return null
  const row = hireById(id)!
  const held = heldOf(s.hires, row)
  return { money: s.money - hireCost(row, held, 1), hires: { ...s.hires, [id]: held + 1 } }
}

/** What letting people go changes, or null when there is nobody of that kind. The salaries stop at once and the growth they added goes with them. Nothing is refunded. */
export function fire(s: { readonly hires: Hires }, id: string): { hires: Hires } | null {
  const row = hireById(id)
  const held = row ? heldOf(s.hires, row) : 0
  if (!row || held === 0) return null
  const left = held - 1
  const { [id]: _gone, ...rest } = s.hires
  return { hires: left > 0 ? { ...rest, [id]: left } : rest }
}

/** Saved hires, checked: unknown ids, non-integers and zeros are dropped and counts are capped. The old list format reads as nobody. */
export function parseHires(input: unknown): Hires {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return {}
  const raw = input as Record<string, unknown>
  const out: Record<string, number> = {}
  for (const row of HIRES) {
    const n = raw[row.id]
    if (typeof n === "number" && Number.isInteger(n) && n > 0) out[row.id] = Math.min(MAX_HIRES, n)
  }
  return out
}

/** The share of a step's growth the team added: the bonus within the whole multiplier. */
export const hireShareOfGrowth = (bonus: number, growthMult: number): number => (growthMult > 0 ? Math.min(1, Math.max(0, bonus) / growthMult) : 0)

/** Who grew the product. `hiredUsers` is the part of the crowd that came from growth the hires added. */
export function creditOf(company: { readonly users: Readonly<Record<string, number>>; readonly hiredUsers: number }): { hiredShare: number } {
  const total = totalUsers(company.users)
  return { hiredShare: total > 0 ? Math.min(1, Math.max(0, company.hiredUsers) / total) : 0 }
}

/** How the career won: the team's growth, or your own on nights and weekends. */
export type Ending = "sponsor" | "nightOwl"

/** Past this share of the users from hires, the credit goes to the team. At exactly this share it stays with you. */
export const SPONSOR_SHARE = 0.5

export function endingOf(hiredShare: number): Ending {
  return hiredShare > SPONSOR_SHARE ? "sponsor" : "nightOwl"
}

export function endingLine(ending: Ending | null | undefined): string {
  switch (ending) {
    case "sponsor":
      return "Eight billion users. Your team was incredible. You were in a lot of their standups."
    case "nightOwl":
      return "Eight billion users, on nights and weekends. Go to bed."
    default:
      return "Eight billion users. The world is yours."
  }
}

/** The win as a toast, a card or a note on return: the ending's line, then what the win pays. */
export const winNote = (ending: Ending | null | undefined, mult: number): string => `${endingLine(ending)} Everything you earn is ×${mult} for good.`

/** The role LinkedOut lists for the product. */
export function productRole(ending: Ending | null | undefined, product: string): string {
  return ending === "sponsor" ? `Executive sponsor, ${product}` : `Founder, ${product}`
}

export const isEnding = (value: unknown): value is Ending => value === "sponsor" || value === "nightOwl"
