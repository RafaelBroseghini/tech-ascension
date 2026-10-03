/** @vitest-environment happy-dom */
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ResumeButton } from "./CornerActions.tsx"
import { useGame } from "../game/store.ts"

describe("ResumeButton", () => {
  it("shows the resume control when LinkedOut has content, not only after a job", () => {
    useGame.getState().wipe()
    const { container, rerender } = render(<ResumeButton />)
    expect(container.querySelector('[data-testid="view-resume"]')).toBeNull()

    useGame.setState({ gigs: [1] })
    rerender(<ResumeButton />)
    expect(screen.getByTestId("view-resume")).toBeTruthy()
  })
})
