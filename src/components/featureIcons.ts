import {
  Banknote,
  Briefcase,
  Cat,
  ChartLine,
  Code,
  GitBranch,
  Github,
  Landmark,
  LayoutGrid,
  MousePointer2,
  Music,
  Palette,
  ScrollText,
  Sparkles,
  Terminal,
  Trophy,
  Volume2,
  Wrench,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

/** The icon each timeline row wears on screen, so the badge that teases it looks like the thing it opens. */
export const FEATURE_ICON: Readonly<Record<string, LucideIcon>> = {
  editor: Code,
  terminal: Terminal,
  careerLog: GitBranch,
  githug: Github,
  linkedout: ScrollText,
  tenx: Trophy,
  boardGear: Wrench,
  boardGigs: Briefcase,
  money: Banknote,
  rosters: LayoutGrid,
  boardJobs: Briefcase,
  metrics: ChartLine,
  clickKits: Volume2,
  themes: Palette,
  hoverClick: MousePointer2,
  music: Music,
  boardCapital: Landmark,
  cat: Cat,
}

/** What a row without its own icon wears. A cosmetic wears its picker's (`FEATURE_ICON[row.parent]`). */
export const FALLBACK_ICON: LucideIcon = Sparkles
