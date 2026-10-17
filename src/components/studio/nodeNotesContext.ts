import { createContext, useContext } from "react"
import type { NodeNote } from "../../game/studio/nodeNotes.ts"

/** A readout plus the sentence for a single point of failure, which names stories only once the player asked what users do. */
export interface ShownNote extends NodeNote {
  readonly spofText: string | null
}

export const NodeNotesContext = createContext<ReadonlyMap<string, ShownNote>>(new Map())

export const useNodeNote = (id: string): ShownNote | undefined => useContext(NodeNotesContext).get(id)
