import { createContext, memo, useContext, useMemo } from "react"
import type { ReactNode } from "react"
import type { Interview } from "../../data/studio/challenges.ts"
import { useGame } from "../../game/store.ts"
import { NO_RECORD } from "../../game/studio/interviews.ts"
import { nodeNotes } from "../../game/studio/nodeNotes.ts"
import type { NodeNote } from "../../game/studio/nodeNotes.ts"
import { draftOf, useBoard } from "./boardStore.ts"
import type { ReachableStatus } from "./status.ts"

/** A readout plus the sentence for a single point of failure, which names stories only once the player asked what users do. */
export interface ShownNote extends NodeNote {
  readonly spofText: string | null
}

const NONE: ReadonlyMap<string, ShownNote> = new Map()
const Notes = createContext<ReadonlyMap<string, ShownNote>>(NONE)

/** The live readout of every piece on the board, from the draft design and what the player has asked about. */
export const NodeNotesProvider = memo(function NodeNotesProvider({
  interview,
  status,
  children,
}: {
  interview: Interview
  status: ReachableStatus
  children: ReactNode
}) {
  const draft = useBoard(draftOf)
  const submitting = useBoard((s) => Boolean(s.run?.revealing && !s.run.practice))
  const { asked } = useGame((s) => s.interviews[interview.id]) ?? NO_RECORD
  const practicing = status !== "open" && !submitting
  const traffic = practicing || asked.includes("traffic")
  const cache = practicing || asked.includes("cache")
  const stories = practicing || asked.includes("features")
  const notes = useMemo(() => {
    const base = nodeNotes(draft, interview.scenario, interview.targets.successRate, { traffic, cache })
    const storyOf = new Map(interview.scenario.features.map((feature) => [feature.id, feature.story]))
    return new Map(
      [...base].map(([id, note]) => {
        const lost = note.spof.length
        const names = note.spof.map((feature) => storyOf.get(feature) ?? feature)
        const spofText =
          lost === 0 ? null : stories ? `Losing this stops: ${names.join("; ")}.` : `Losing this stops ${lost} ${lost === 1 ? "feature" : "features"}.`
        return [id, { ...note, spofText }] as const
      }),
    )
  }, [draft, interview, traffic, cache, stories])
  return <Notes.Provider value={notes}>{children}</Notes.Provider>
})

export const useNodeNote = (id: string): ShownNote | undefined => useContext(Notes).get(id)
