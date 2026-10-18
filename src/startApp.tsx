import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App.tsx"
import { installGameHarness } from "./game/harness.ts"
import { applyIdeThemeScheme } from "./game/ideTheme.ts"
import { applyUiFont } from "./game/uiFont.ts"

export function startApp(): void {
  installGameHarness()
  applyIdeThemeScheme()
  applyUiFont()

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
