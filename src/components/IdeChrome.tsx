import { useEffect, useMemo, useState } from "react"
import { LANG_LABEL, overlayForTier, tokenize } from "../data/overlays.ts"
import type { Overlay } from "../data/overlays.ts"

const TREE: ReadonlyArray<readonly [depth: number, name: string, dir: boolean]> = [
  [0, "tech-ascension", true],
  [1, "src", true],
  [2, "main", false],
  [2, "utils", false],
  [2, "config", false],
  [1, "tests", true],
  [2, "smoke", false],
  [1, "docs", true],
  [1, "notes", false],
]

const GHOST_TABS = ["notes", "config"]
const FADE_MS = 260

type Layer = { overlay: Overlay; uid: number }

let layerSeq = 1

function CodeLayer({ overlay, leaving }: { overlay: Overlay; leaving: boolean }) {
  const lines = useMemo(() => {
    const out: { kind: string; text: string }[][] = [[]]
    for (const token of tokenize(overlay.code, overlay.lang)) {
      const parts = token.text.split("\n")
      parts.forEach((part, index) => {
        if (index > 0) out.push([])
        if (part) out[out.length - 1]?.push({ kind: token.kind, text: part })
      })
    }
    return out
  }, [overlay])

  return (
    <div className={leaving ? "code-layer code-leave" : "code-layer code-enter"} data-overlay={overlay.id}>
      <pre className="code" data-lang={overlay.lang}>
        {lines.map((line, row) => (
          <span key={row} className="code-line">
            <span className="code-num">{row + 1}</span>
            {line.map((token, col) => (
              <span key={col} className={`tok-${token.kind}`}>
                {token.text}
              </span>
            ))}
          </span>
        ))}
      </pre>
    </div>
  )
}

/**
 * One fixed Catppuccin Mocha IDE shell behind the stage. Only the buffer changes with
 * progress: the code layer and the active tab swap together, with a short crossfade.
 */
export function IdeChrome({ tierId }: { tierId: number }) {
  const next = overlayForTier(tierId)
  const [layers, setLayers] = useState<Layer[]>(() => [{ overlay: next, uid: layerSeq++ }])
  const top = layers[layers.length - 1] as Layer

  if (top.overlay.id !== next.id) {
    setLayers([top, { overlay: next, uid: layerSeq++ }])
  }

  useEffect(() => {
    if (layers.length < 2) return
    const id = window.setTimeout(() => setLayers((current) => current.slice(-1)), FADE_MS)
    return () => window.clearTimeout(id)
  }, [layers])

  const active = top.overlay

  return (
    <div className="ide" aria-hidden="true" data-testid="ide" data-file={active.file} data-overlay={active.id}>
      <nav className="ide-activity">
        {["files", "search", "git", "run"].map((icon) => (
          <i key={icon} className={`ide-icon ide-icon-${icon}`} />
        ))}
      </nav>
      <aside className="ide-tree">
        <p className="ide-tree-title">Explorer</p>
        {TREE.map(([depth, name, dir]) => (
          <p key={name} className="ide-tree-row" style={{ ["--depth" as string]: depth }}>
            <i className={dir ? "ide-caret" : "ide-file"} />
            <span className="ghost-bar" style={{ width: `${name.length * 0.62}em` }} />
          </p>
        ))}
      </aside>
      <header className="ide-tabs">
        <div className="ide-tab is-active" data-testid="ide-tab" key={active.id}>
          <i className="ide-tab-dot" data-lang={active.lang} />
          <span>{active.file}</span>
        </div>
        {GHOST_TABS.map((name) => (
          <div key={name} className="ide-tab">
            <span className="ghost-bar" style={{ width: `${name.length * 0.62}em` }} />
          </div>
        ))}
      </header>
      <div className="ide-editor">
        {layers.map((layer, index) => (
          <CodeLayer key={layer.uid} overlay={layer.overlay} leaving={layers.length > 1 && index === 0} />
        ))}
      </div>
      <footer className="ide-status">
        <span className="ide-mode">NORMAL</span>
        <span>main</span>
        <span className="ide-status-gap" />
        <span data-testid="ide-lang">{LANG_LABEL[active.lang]}</span>
        <span>UTF-8</span>
      </footer>
    </div>
  )
}
