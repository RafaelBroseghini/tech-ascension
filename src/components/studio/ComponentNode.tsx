import { Handle, Position } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"
import { Minus, Plus, X } from "lucide-react"
import { m } from "motion/react"
import { memo } from "react"
import { COMPONENTS } from "../../data/studio/components.ts"
import { currentRun, MAX_REPLICAS, removeNode, setReplicas, useBoard } from "./boardStore.ts"
import type { BoardNode } from "./boardStore.ts"
import { KIND_ICON, specLine } from "./kinds.ts"
import { useNodeNote } from "./nodeNotesContext.ts"

const SPRING = { type: "spring", stiffness: 520, damping: 32 } as const

/** Busy share of capacity once the run has played, else null. */
const useHeat = (id: string): number | null =>
  useBoard((s) => {
    const run = currentRun(s)
    if (!run || run.revealing) return null
    return run.result.hot.find((h) => h.id === id)?.utilization ?? null
  })

const heatLabel = (util: number): string => (Number.isFinite(util) ? `${Math.round(util * 100)}%` : "down")

/** One placed component. Memoized on its `data`, which a drag leaves alone, so only the dragged node re-renders. */
export const ComponentNode = memo(function ComponentNode({ id, data, selected }: NodeProps<BoardNode>) {
  const { kind, replicas, locked } = data
  const spec = COMPONENTS[kind]
  const Icon = KIND_ICON[kind]
  const heat = useHeat(id)
  const note = useNodeNote(id)
  const studying = useBoard((s) => s.studying)
  const spof = (note?.spof.length ?? 0) > 0
  const hot = heat !== null && heat >= 1
  const source = kind === "users"
  const className = ["studio-node", selected ? "is-selected" : "", hot ? "is-hot" : "", source ? "is-source" : ""]
    .filter(Boolean)
    .join(" ")

  return (
    <m.div
      className={className}
      data-testid="studio-node"
      data-kind={kind}
      data-node={id}
      data-heat={heat === null ? undefined : heatLabel(heat)}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={SPRING}
    >
      {source ? null : <Handle type="target" position={Position.Left} className="studio-handle" />}
      {source || locked || studying ? null : (
        <button type="button" className="studio-node-x nodrag" aria-label={`Remove ${spec.name}`} title="Remove (Delete)" onClick={() => removeNode(id)}>
          <X size={12} strokeWidth={2.5} aria-hidden />
        </button>
      )}
      {spof ? (
        <span className="studio-spof" data-testid="studio-spof" title={note?.spofText ?? undefined}>
          No backup
        </span>
      ) : null}
      <Icon size={32} strokeWidth={1.75} aria-hidden />
      <span className="studio-node-name">{spec.name}</span>
      {source ? null : (
        <div className="studio-stepper nodrag" role="group" aria-label={`${spec.name} replicas`}>
          <button type="button" aria-label="One fewer replica" disabled={replicas <= 1 || studying} onClick={() => setReplicas(id, replicas - 1)}>
            <Minus size={10} strokeWidth={2.5} aria-hidden />
          </button>
          <output data-testid="studio-replicas" aria-live="polite">
            x{replicas}
          </output>
          <button type="button" aria-label="One more replica" disabled={replicas >= MAX_REPLICAS || studying} onClick={() => setReplicas(id, replicas + 1)}>
            <Plus size={10} strokeWidth={2.5} aria-hidden />
          </button>
        </div>
      )}
      <div className="studio-node-card" role="tooltip">
        <strong>{spec.name}</strong>
        {note ? <span className="studio-node-note" data-testid="studio-node-note">{note.line}</span> : null}
        {note?.plan ? <span className="studio-node-plan" data-testid="studio-node-plan">{note.plan}</span> : null}
        <span className="studio-node-spec">{specLine(kind)}</span>
        {spof ? <span className="studio-node-warn">{note?.spofText}</span> : null}
      </div>
      <Handle type="source" position={Position.Right} className="studio-handle" />
    </m.div>
  )
})
