/** @vitest-environment happy-dom */
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it } from "vitest"
import { useGame } from "../game/store.ts"
import { Toast } from "./Toast.tsx"

describe("toast", () => {
  afterEach(() => {
    document.body.replaceChildren()
    useGame.getState().wipe()
  })

  it("keeps a polite live region mounted, empty until a toast arrives", () => {
    const host = document.createElement("div")
    document.body.append(host)
    flushSync(() => {
      createRoot(host).render(createElement(Toast))
    })
    const region = host.querySelector("[role='status']")
    expect(region?.getAttribute("aria-live")).toBe("polite")
    expect(region?.getAttribute("aria-atomic")).toBe("true")
    expect(region?.textContent).toBe("")

    flushSync(() => {
      useGame.setState({ toast: { id: 1, text: "Job Board unlocked" } })
    })
    expect(host.querySelector("[role='status']")).toBe(region)
    expect(region?.textContent).toBe("Job Board unlocked")

    flushSync(() => {
      host.querySelector<HTMLButtonElement>("[data-testid='toast']")?.click()
    })
    expect(useGame.getState().toast).toBeNull()
    expect(region?.textContent).toBe("")
  })
})
