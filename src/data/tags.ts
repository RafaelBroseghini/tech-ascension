/**
 * What a catalog row is about. Every skill, gig, job, gear and capital row carries one to three of these. They change
 * no numbers; the kitchen reads them (src/data/combos.ts) and the gig board will. A drop-in table: order is display order.
 * Generalist rows (the first years of study, most jobs) carry `product`.
 */
export type Tag = "frontend" | "backend" | "infra" | "data" | "ai" | "security" | "product" | "hardware"

export const TAGS: readonly { id: Tag; label: string }[] = [
  { id: "frontend", label: "Frontend" },
  { id: "backend", label: "Backend" },
  { id: "infra", label: "Infra" },
  { id: "data", label: "Data" },
  { id: "ai", label: "AI" },
  { id: "security", label: "Security" },
  { id: "product", label: "Product" },
  { id: "hardware", label: "Hardware" },
]

export function isTag(value: unknown): value is Tag {
  return TAGS.some((row) => row.id === value)
}

export function tagLabel(tag: Tag): string {
  return TAGS.find((row) => row.id === tag)?.label ?? tag
}
