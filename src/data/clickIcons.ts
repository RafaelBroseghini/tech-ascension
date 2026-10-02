/**
 * Logos that fall from a click. A row may list several real marks; soft skills
 * with no logo are absent on purpose. Parody names in the catalogs stay as written.
 * The icons are the real marks those rows stand in for, except skill 27: LinkedOut
 * is a custom "out" badge in the LinkedIn wordmark face, never the LinkedIn mark.
 */
import type { ComponentType } from "react"
import { LinkedOutIcon as LinkedOut } from "../components/icons/LinkedOut.tsx"
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
  LinkedOut, // custom "out" badge — not the LinkedIn mark from developer-icons
} satisfies Record<string, ComponentType<ClickIconProps>>

export type IconName = keyof typeof CLICK_ICONS

/** Skill id → logos. Soft/habit skills omitted on purpose. */
export const SKILL_ICONS: Readonly<Record<number, readonly IconName[]>> = {
  4: ["YouTube"],
  9: ["Git", "GitHubLight"],
  10: ["HTML5", "CSS3"],
  11: ["JavaScript"],
  12: ["TypeScript"],
  14: ["VercelLight", "Netlify"],
  16: ["React"],
  17: ["NodeJs", "ExpressJsLight"],
  18: ["PostgreSQL"],
  19: ["Auth0"],
  21: ["Jest", "Vitest", "Playwright"],
  22: ["Docker"],
  25: ["Discord"],
  27: ["LinkedOut"], // custom "out" badge
  28: ["Git", "GitHubLight"],
  30: ["Jenkins", "CircleCI"],
  31: ["PostgreSQL", "MySQL"],
  32: ["Redis"],
  33: ["TypeScript", "GraphQL", "Zod"],
  34: ["Grafana", "Datadog"],
  44: ["HuggingFace", "PyTorch", "OpenAI"],
  45: ["NVIDIA"],
  51: ["Linux"],
  52: ["Bash"],
  53: ["Python"],
  54: ["TailwindCSS"],
  55: ["ViteJS"],
  56: ["NextJs", "React", "TypeScript"],
  57: ["Figma"],
  58: ["ESLint", "Prettier"],
  59: ["FastAPI", "Python"],
  60: ["Prisma"],
  61: ["Storybook"],
  62: ["VueJs", "SvelteJS"],
  63: ["BunJs", "Deno"],
  64: ["Astro"],
  65: ["Postman"],
  66: ["MongoDB"],
  67: ["MySQL"],
  68: ["TanStack", "ReactQuery"],
  69: ["Supabase"],
  70: ["Firebase"],
  71: ["AWS", "Azure", "GoogleCloud"],
  72: ["Terraform"],
  73: ["Kubernetes", "Docker"],
  74: ["Ansible"],
  75: ["Go"],
  76: ["RustDark"],
  77: ["Kafka"],
  78: ["Cloudflare"],
  79: ["Jenkins"],
  80: ["Flutter"],
  81: ["Electron"],
  82: ["OpenAI", "ChatGPT"],
  83: ["CursorDark", "Copilot"],
  84: ["ClaudeAI", "Anthropic"],
  85: ["NumPy", "Python"],
  86: ["Tensorflow", "PyTorch", "HuggingFace"],
  87: ["WebAssembly"],
  88: ["Solidity"],
  99: ["GitHubLight"],
}

export const GEAR_ICONS: Readonly<Record<number, readonly IconName[]>> = {
  4: ["Linux"],
  7: ["AWS", "GoogleCloud", "Azure"],
  8: ["AWS", "EC2"],
  9: ["NVIDIA"],
  10: ["NVIDIA"],
  11: ["Linux"],
  17: ["NVIDIA"],
  18: ["NVIDIA"],
  19: ["NVIDIA"],
  20: ["NVIDIA", "PyTorch"],
  21: ["NVIDIA", "PyTorch"],
  23: ["AWS"],
  62: ["Cloudflare"],
  64: ["AWS"],
  68: ["Kubernetes"],
  69: ["Cloudflare"],
  71: ["AWS"],
  73: ["NVIDIA"],
  74: ["NVIDIA"],
  75: ["NVIDIA"],
  76: ["NVIDIA"],
  77: ["NVIDIA"],
  78: ["NVIDIA"],
  79: ["NVIDIA"],
  80: ["NVIDIA"],
  81: ["NVIDIA"],
  82: ["NVIDIA"],
  97: ["NVIDIA"],
  101: ["NVIDIA"],
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
  62: ["Python"],
}

export const JOB_ICONS: Readonly<Record<number, readonly IconName[]>> = {
  4: ["GitHubLight"],
  5: ["Jest", "Playwright"],
  6: ["Grafana", "Datadog"],
  10: ["NodeJs", "PostgreSQL", "Docker"],
  11: ["React", "TypeScript", "CSS3"],
  12: ["React", "NodeJs", "TypeScript"],
  17: ["Kubernetes", "Docker", "Terraform"],
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
