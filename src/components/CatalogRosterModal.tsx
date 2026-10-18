import { useMemo } from "react"
import { CLICK_ICONS, SKILL_ICONS } from "../data/clickIcons.ts"
import { emojiIdleUrl } from "../data/emojiAssets.ts"
import { ROSTER_LABEL, rosterEntries, type RosterKind } from "../game/rosters.ts"
import { useGame } from "../game/store.ts"
import { RosterModal, type RosterAccent, type RosterItem } from "./RosterModal.tsx"

/** The shop tab colors, so each roster reads as its panel. */
const ROSTER_ACCENT: Record<RosterKind, RosterAccent> = {
  skills: "green",
  gigs: "blue",
  jobs: "peach",
  gear: "sky",
  capital: "mauve",
}

const TITLE: Record<RosterKind, string> = {
  skills: "Skills learned",
  gigs: "Gigs cleared",
  jobs: "Jobs held",
  gear: "Gear owned",
  capital: "Holdings",
}

const EMPTY: Record<RosterKind, string> = {
  skills: "No skills learned yet.",
  gigs: "No gigs cleared yet.",
  jobs: "No jobs held yet.",
  gear: "No gear bought yet.",
  capital: "No capital deployed yet.",
}

/** Everything the player holds in one shop panel. Nothing unbought ever shows. */
export function CatalogRosterModal({ kind, onClose }: { kind: RosterKind; onClose: () => void }) {
  const skills = useGame((state) => state.skills)
  const equipment = useGame((state) => state.equipment)
  const owned = useGame((state) => state.owned)
  const jobs = useGame((state) => state.jobs)
  const gigs = useGame((state) => state.gigs)
  // Rows only follow what is held. Lifetime XP and the peak balance move every tick and do not
  // change a row, so they are read once here instead of re-rendering the grid ten times a second.
  const items = useMemo<RosterItem[]>(
    () =>
      rosterEntries(kind, { skills, equipment, owned, jobs, gigs, xpTotal: useGame.getState().xpTotal, peakMoney: useGame.getState().peakMoney }).map((entry) => ({
        key: entry.key,
        no: entry.no,
        name: entry.name,
        art: emojiIdleUrl(entry.art.kind, entry.art.id),
        count: entry.count,
        lines: entry.lines,
        group: entry.group,
        logos: kind === "skills" ? (SKILL_ICONS[entry.art.id] ?? []).map((name) => ({ name, Icon: CLICK_ICONS[name] })) : [],
      })),
    [kind, skills, equipment, owned, jobs, gigs],
  )

  return (
    <RosterModal
      id={kind}
      kicker={ROSTER_LABEL[kind]}
      title={TITLE[kind]}
      items={items}
      accent={ROSTER_ACCENT[kind]}
      empty={EMPTY[kind]}
      onClose={onClose}
    />
  )
}
