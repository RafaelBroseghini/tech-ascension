/**
 * Logos that fall from a click. A row may list several real marks; soft skills
 * with no logo are absent on purpose. The icons are the real marks those rows stand in for.
 */
import type { ComponentType } from "react"
import {
  AWS,
  Ansible,
  Anthropic,
  Astro,
  Auth0,
  Azure,
  Bash,
  BunJs,
  CSS3,
  ChatGPT,
  Chrome,
  CircleCI,
  ClaudeAI,
  Cloudflare,
  Copilot,
  CursorDark,
  Datadog,
  Deno,
  Discord,
  Docker,
  EC2,
  ESLint,
  Electron,
  ExpressJsLight,
  FastAPI,
  Figma,
  Firebase,
  Firefox,
  Flutter,
  Git,
  GitHubLight,
  Go,
  GoogleCloud,
  Grafana,
  GraphQL,
  HTML5,
  Hashnode,
  HuggingFace,
  JavaScript,
  Jenkins,
  Jest,
  K6,
  Kafka,
  Kubernetes,
  Linux,
  MongoDB,
  MySQL,
  NVIDIA,
  Netlify,
  NextJs,
  NodeJs,
  NumPy,
  OpenAI,
  Playwright,
  PostgreSQL,
  Postman,
  Prettier,
  Prisma,
  PyTorch,
  Python,
  React,
  ReactQuery,
  Redis,
  RustDark,
  Solidity,
  Storybook,
  Supabase,
  SvelteJS,
  Swagger,
  TailwindCSS,
  TanStack,
  Tensorflow,
  Terraform,
  TypeScript,
  Upwork,
  VercelLight,
  ViteJS,
  Vitest,
  VueJs,
  WebAssembly,
  WordPress,
  YouTube,
  Zod,
} from "developer-icons"

export type ClickIconProps = { size?: number; className?: string }

export const CLICK_ICONS = {
  AWS,
  Ansible,
  Anthropic,
  Astro,
  Auth0,
  Azure,
  Bash,
  BunJs,
  CSS3,
  ChatGPT,
  Chrome,
  CircleCI,
  ClaudeAI,
  Cloudflare,
  Copilot,
  CursorDark,
  Datadog,
  Deno,
  Discord,
  Docker,
  EC2,
  ESLint,
  Electron,
  ExpressJsLight,
  FastAPI,
  Figma,
  Firebase,
  Firefox,
  Flutter,
  Git,
  GitHubLight,
  Go,
  GoogleCloud,
  Grafana,
  GraphQL,
  HTML5,
  Hashnode,
  HuggingFace,
  JavaScript,
  Jenkins,
  Jest,
  K6,
  Kafka,
  Kubernetes,
  Linux,
  MongoDB,
  MySQL,
  NVIDIA,
  Netlify,
  NextJs,
  NodeJs,
  NumPy,
  OpenAI,
  Playwright,
  PostgreSQL,
  Postman,
  Prettier,
  Prisma,
  PyTorch,
  Python,
  React,
  ReactQuery,
  Redis,
  RustDark,
  Solidity,
  Storybook,
  Supabase,
  SvelteJS,
  Swagger,
  TailwindCSS,
  TanStack,
  Tensorflow,
  Terraform,
  TypeScript,
  Upwork,
  VercelLight,
  ViteJS,
  Vitest,
  VueJs,
  WebAssembly,
  WordPress,
  YouTube,
  Zod,
} satisfies Record<string, ComponentType<ClickIconProps>>

export type IconName = keyof typeof CLICK_ICONS

/** Skill id → logos. Soft/habit skills omitted on purpose. */
export const SKILL_ICONS: Readonly<Record<number, readonly IconName[]>> = {
  4: ["YouTube"],
  8: ["Linux"],
  10: ["Git", "GitHubLight"],
  12: ["Bash"],
  13: ["HTML5", "CSS3"],
  14: ["JavaScript"],
  16: ["React"],
  17: ["TypeScript"],
  20: ["VercelLight", "Netlify"],
  21: ["ESLint", "Prettier"],
  22: ["ViteJS"],
  23: ["TailwindCSS"],
  24: ["Figma"],
  25: ["NodeJs", "ExpressJsLight"],
  26: ["PostgreSQL"],
  27: ["Auth0"],
  28: ["Jest", "Vitest", "Playwright"],
  29: ["Docker"],
  30: ["Python"],
  31: ["FastAPI", "Python"],
  32: ["Prisma"],
  33: ["Postman"],
  34: ["TypeScript", "GraphQL", "Zod"],
  36: ["TanStack", "ReactQuery"],
  37: ["Redis"],
  38: ["PostgreSQL", "MySQL"],
  39: ["MongoDB"],
  40: ["MySQL"],
  41: ["Supabase"],
  42: ["Firebase"],
  43: ["NextJs", "React", "TypeScript"],
  44: ["VueJs", "SvelteJS"],
  45: ["Astro"],
  46: ["BunJs", "Deno"],
  47: ["Storybook"],
  53: ["Git", "GitHubLight"],
  54: ["Jenkins", "CircleCI", "GitHubLight"],
  56: ["Jenkins"],
  58: ["Grafana", "Datadog"],
  65: ["Discord"],
  67: ["AWS"],
  68: ["Azure"],
  69: ["GoogleCloud"],
  72: ["Terraform"],
  73: ["Kubernetes", "Docker"],
  74: ["Ansible"],
  75: ["Cloudflare"],
  76: ["Kafka"],
  77: ["Go"],
  80: ["Flutter"],
  94: ["CursorDark", "Copilot"],
  96: ["NumPy", "Python"],
  97: ["Anthropic", "ClaudeAI"],
  98: ["CursorDark", "Copilot"],
  99: ["OpenAI", "Anthropic"],
  100: ["NVIDIA"],
  101: ["NVIDIA"],
  102: ["Solidity"],
  103: ["OpenAI", "HuggingFace"],
}

export const GEAR_ICONS: Readonly<Record<number, readonly IconName[]>> = {
  17: ["Linux"],
  29: ["Linux"],
  38: ["AWS"],
  43: ["Cloudflare"],
  44: ["AWS","GoogleCloud","Azure"],
  45: ["AWS"],
  46: ["AWS","EC2"],
  50: ["Kubernetes"],
  53: ["Cloudflare"],
  54: ["AWS"],
  55: ["NVIDIA"],
  56: ["NVIDIA"],
  57: ["NVIDIA"],
  58: ["NVIDIA"],
  59: ["NVIDIA"],
  60: ["NVIDIA"],
  61: ["NVIDIA"],
  62: ["NVIDIA"],
  63: ["NVIDIA"],
  64: ["NVIDIA"],
  65: ["NVIDIA"],
  66: ["NVIDIA"],
  67: ["NVIDIA","PyTorch"],
  68: ["NVIDIA"],
  69: ["NVIDIA","PyTorch"],
  70: ["NVIDIA"],
  71: ["NVIDIA"],
  96: ["NVIDIA"],
  100: ["NVIDIA"],
}

export const GIG_ICONS: Readonly<Record<number, readonly IconName[]>> = {
  1: ["WordPress"],
  2: ["HTML5", "CSS3"],
  3: ["Figma", "HTML5"],
  4: ["Upwork"],
  6: ["WordPress"],
  10: ["Hashnode"],
  11: ["Chrome", "Firefox"],
  15: ["K6"],
  18: ["Python"],
  19: ["Jenkins", "CircleCI", "GitHubLight"],
  20: ["CSS3"],
  21: ["Auth0"],
  25: ["PostgreSQL", "Python"],
  26: ["OpenAI"],
  28: ["Swagger"],
  29: ["K6"],
  33: ["TypeScript", "GraphQL", "Zod"],
  38: ["Grafana", "Datadog"],
  39: ["HuggingFace", "FastAPI", "Python"],
  43: ["Kafka", "Python"],
  45: ["Figma", "Storybook"],
  46: ["HuggingFace", "Python"],
  47: ["Docker", "Kubernetes"],
  55: ["Kubernetes", "Docker"],
  56: ["Cloudflare"],
  57: ["Terraform"],
  58: ["NVIDIA"],
}

export const JOB_ICONS: Readonly<Record<number, readonly IconName[]>> = {
  4: ["GitHubLight"],
  5: ["Jest", "Playwright"],
  6: ["Grafana", "Datadog"],
  10: ["NodeJs", "PostgreSQL", "Docker"],
  11: ["React", "TypeScript", "CSS3"],
  12: ["React", "NodeJs", "TypeScript"],
}

export type IconOwners = {
  skills: Readonly<Record<string, number>>
  equipment: Readonly<Record<string, number>>
  jobs: readonly number[]
  gigs: readonly number[]
}

const EMPTY: IconOwners = { skills: {}, equipment: {}, jobs: [], gigs: [] }

function pushOwned(pool: IconName[], counts: Readonly<Record<string, number>>, table: Readonly<Record<number, readonly IconName[]>>) {
  for (const [key, count] of Object.entries(counts)) {
    if (!(count > 0)) continue
    const icons = table[Number(key)]
    if (icons) pool.push(...icons)
  }
}

function pushIds(pool: IconName[], ids: readonly number[], table: Readonly<Record<number, readonly IconName[]>>) {
  for (const id of ids) {
    const icons = table[id]
    if (icons) pool.push(...icons)
  }
}

/**
 * Every logo on an owned, mapped row. Unowned and unmapped rows add nothing,
 * so the early game stays thin and the pool grows as the career does.
 * One entry per icon on the row, so a row with three marks is three picks.
 */
export function iconPool(owned: IconOwners = EMPTY): IconName[] {
  const pool: IconName[] = []
  pushOwned(pool, owned.skills, SKILL_ICONS)
  pushOwned(pool, owned.equipment, GEAR_ICONS)
  pushIds(pool, owned.gigs, GIG_ICONS)
  pushIds(pool, owned.jobs, JOB_ICONS)
  return pool
}

/** One logo from the owned pool. Null when the player owns nothing mapped. */
export function pickClickIcon(pool: readonly IconName[], random: () => number = Math.random): IconName | null {
  if (pool.length === 0) return null
  const index = Math.min(pool.length - 1, Math.floor(random() * pool.length))
  return pool[index] ?? null
}
