import "@xyflow/react/dist/base.css"
import "../../styles/studio.css"
import { ReactFlowProvider } from "@xyflow/react"
import { X } from "lucide-react"
import { domAnimation, LazyMotion, m, MotionConfig } from "motion/react"
import { useCallback, useEffect, useLayoutEffect, useMemo } from "react"
import { INTERVIEWS } from "../../data/studio/challenges.ts"
import type { Interview } from "../../data/studio/challenges.ts"
import { useGame } from "../../game/store.ts"
import { Board } from "./Board.tsx"
import { endReveal, showInterview, submitBoard, useBoard } from "./boardStore.ts"
import { Brief } from "./Brief.tsx"
import { ChallengeList } from "./ChallengeList.tsx"
import { useStatuses } from "./status.ts"
import type { InterviewStatus } from "./status.ts"
import { closeStudio, openStudio } from "./launcher.ts"
import { Palette } from "./Palette.tsx"
import { RunMeters } from "./RunMeters.tsx"

const PANEL = { type: "spring", stiffness: 420, damping: 36 } as const

/** The interview the whiteboard opens on when none was asked for: the first one waiting, else the first. */
function pickInterview(requested: string | null, statuses: readonly InterviewStatus[]): Interview {
  const asked = INTERVIEWS.find((row) => row.id === requested)
  if (asked) return asked
  return INTERVIEWS[statuses.indexOf("open")] ?? INTERVIEWS[0]
}

/** The full-screen whiteboard: interviews on the left, the board in the middle, the brief and meters on the right. */
export default function Studio({ interviewId }: { interviewId: string | null }) {
  const statuses = useStatuses()
  const interview = pickInterview(interviewId, statuses)
  const status = statuses[INTERVIEWS.indexOf(interview)]
  const shown = useBoard((s) => s.interviewId === interview.id)
  const skills = useGame((s) => s.skills)
  const gigs = useGame((s) => s.gigs)
  const jobs = useGame((s) => s.jobs)
  const career = useMemo(() => ({ skills, gigs, jobs }), [skills, gigs, jobs])

  useLayoutEffect(() => {
    showInterview(interview.id, useGame.getState().interviews[interview.id]?.design ?? null)
  }, [interview.id])

  const close = useCallback(() => {
    const run = useBoard.getState().run
    const hired = run !== null && run.verdict.kind !== "noHire" && !useGame.getState().jobs.includes(interview.jobId)
    closeStudio(hired ? interview.jobId : undefined)
  }, [interview.jobId])
  const toJobs = useCallback(() => closeStudio(interview.jobId), [interview.jobId])
  const submit = useCallback(() => submitBoard(interview), [interview])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) close()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [close])

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <ReactFlowProvider>
          <m.div
            className="studio"
            role="dialog"
            aria-modal="true"
            aria-labelledby="studio-title"
            data-testid="studio"
            data-interview={interview.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={PANEL}
            onPointerDownCapture={() => {
              if (useBoard.getState().run?.revealing) endReveal()
            }}
          >
            <header className="studio-head">
              <h1 id="studio-title">Whiteboard</h1>
              <span className="studio-head-hint">Esc closes. Your board stays.</span>
              <button type="button" className="studio-close" data-testid="studio-close" aria-label="Close the whiteboard" onClick={close}>
                <X size={16} strokeWidth={2} aria-hidden />
              </button>
            </header>
            <ChallengeList activeId={interview.id} onPick={openStudio} />
            <main className="studio-main">
              {shown ? <Board key={interview.id} /> : <div className="studio-board" />}
              <Palette career={career} />
            </main>
            <aside className="studio-side">
              <Brief interview={interview} status={status} onSubmit={submit} />
              <RunMeters interview={interview} onHired={toJobs} />
            </aside>
          </m.div>
        </ReactFlowProvider>
      </MotionConfig>
    </LazyMotion>
  )
}
