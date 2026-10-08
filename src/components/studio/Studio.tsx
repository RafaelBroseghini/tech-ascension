import "@xyflow/react/dist/base.css"
import "../../styles/studio.css"
import { ReactFlowProvider } from "@xyflow/react"
import { X } from "lucide-react"
import { domAnimation, LazyMotion, m, MotionConfig } from "motion/react"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react"
import { INTERVIEWS } from "../../data/studio/challenges.ts"
import type { Interview } from "../../data/studio/challenges.ts"
import { useGame } from "../../game/store.ts"
import { Board } from "./Board.tsx"
import { endReveal, practiceBoard, showInterview, submitBoard, useBoard } from "./boardStore.ts"
import { Brief } from "./Brief.tsx"
import { ChallengeList } from "./ChallengeList.tsx"
import { reachable, useStatuses } from "./status.ts"
import type { InterviewStatus, ReachableStatus } from "./status.ts"
import { closeStudio, openStudio } from "./launcher.ts"
import { Notes } from "./Notes.tsx"
import { Palette } from "./Palette.tsx"
import { RunMeters } from "./RunMeters.tsx"

const PANEL = { type: "spring", stiffness: 420, damping: 36 } as const

type Picked = { readonly interview: Interview; readonly status: ReachableStatus }

/**
 * The interview the whiteboard opens on: the one asked for if the career has reached it, else the first waiting for a
 * submission, else the furthest one passed. Null before the first interview opens, so a locked one is never named.
 */
function pickInterview(requested: string | null, statuses: readonly InterviewStatus[]): Picked | null {
  const asked = INTERVIEWS.findIndex((row) => row.id === requested)
  const open = statuses.indexOf("open")
  const index = asked >= 0 && reachable(statuses[asked]) ? asked : open >= 0 ? open : statuses.findLastIndex(reachable)
  const status = statuses[index]
  return status !== undefined && reachable(status) ? { interview: INTERVIEWS[index], status } : null
}

/** The list, the board with its palette, and the brief with the run for one interview the career has reached. */
function Room({ interview, status }: { interview: Interview; status: ReachableStatus }) {
  const shown = useBoard((s) => s.interviewId === interview.id)
  const skills = useGame((s) => s.skills)
  const gigs = useGame((s) => s.gigs)
  const jobs = useGame((s) => s.jobs)
  const career = useMemo(() => ({ skills, gigs, jobs }), [skills, gigs, jobs])

  useLayoutEffect(() => {
    showInterview(interview.id, useGame.getState().interviews[interview.id]?.design ?? null)
  }, [interview.id])

  const toJobs = useCallback(() => closeStudio(interview.jobId), [interview.jobId])
  const submit = useCallback(() => (status === "open" ? submitBoard(interview) : practiceBoard(interview)), [interview, status])

  return (
    <>
      <ChallengeList activeId={interview.id} onPick={openStudio} />
      <main className="studio-main">
        <div className="studio-stage">
          <Notes interview={interview} />
          {shown ? <Board key={interview.id} /> : <div className="studio-board" />}
        </div>
        <Palette interview={interview} career={career} />
      </main>
      <aside className="studio-side">
        <Brief interview={interview} status={status} onSubmit={submit} />
        <RunMeters interview={interview} onHired={toJobs} />
      </aside>
    </>
  )
}

/** The full-screen whiteboard: interviews on the left, the board in the middle, the brief and meters on the right. */
export default function Studio({ interviewId }: { interviewId: string | null }) {
  const statuses = useStatuses()
  const picked = pickInterview(interviewId, statuses)
  const interview = picked?.interview ?? null

  // Opened without an interview, the pick follows the statuses; pin it so a Hire does not swap the board for the next one.
  useLayoutEffect(() => {
    if (interviewId === null && interview) openStudio(interview.id)
  }, [interviewId, interview])

  const close = useCallback(() => {
    const run = useBoard.getState().run
    const hired = interview !== null && run !== null && !run.practice && run.verdict.kind !== "noHire" && !useGame.getState().jobs.includes(interview.jobId)
    closeStudio(hired ? interview.jobId : undefined)
  }, [interview])

  // The desk keeps earning behind the dialog but leaves the tab order, and closing hands focus back to the opener.
  const dialog = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const desk = document.getElementById("root")
    desk?.setAttribute("inert", "")
    dialog.current?.focus()
    return () => {
      desk?.removeAttribute("inert")
      if (opener?.isConnected) opener.focus()
    }
  }, [])

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
            ref={dialog}
            tabIndex={-1}
            className="studio"
            role="dialog"
            aria-modal="true"
            aria-labelledby="studio-title"
            data-testid="studio"
            data-interview={interview?.id}
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
            {picked ? (
              <Room interview={picked.interview} status={picked.status} />
            ) : (
              <p className="studio-empty" data-testid="studio-empty">
                Your next interview opens with the Job Board.
              </p>
            )}
          </m.div>
        </ReactFlowProvider>
      </MotionConfig>
    </LazyMotion>
  )
}
