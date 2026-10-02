import { useEffect, useMemo, useState } from "react"
import { itemsOf } from "../data/idePacks.ts"
import type { IdePack } from "../data/idePacks.ts"
import { LANG_LABEL, tokenize } from "../data/overlays.ts"
import type { Lang } from "../data/overlays.ts"
import { ideView } from "../game/ide.ts"
import { useGame } from "../game/store.ts"

const GHOST_TREE: ReadonlyArray<readonly [depth: number, name: string, dir: boolean]> = [
  [0, "tech-ascension", true],
  [1, "src", true],
  [2, "main", false],
  [1, "tests", true],
  [1, "docs", true],
  [1, "notes", false],
]

const FADE_MS = 260
const KIND_TITLE = { files: "Explorer", inbox: "Inbox", deck: "Slides" } as const
const KIND_MODE = { files: "NORMAL", inbox: "MAIL", deck: "SLIDES" } as const

type Layer = { pack: IdePack; index: number; uid: number }

let layerSeq = 1

function CodeLayer({ code, lang, leaving, id }: { code: string; lang: Lang; leaving: boolean; id: string }) {
  const lines = useMemo(() => {
    const out: { kind: string; text: string }[][] = [[]]
    for (const token of tokenize(code, lang)) {
      const parts = token.text.split("\n")
      parts.forEach((part, index) => {
        if (index > 0) out.push([])
        if (part) out[out.length - 1]?.push({ kind: token.kind, text: part })
      })
    }
    return out
  }, [code, lang])

  return (
    <div className={leaving ? "code-layer code-leave" : "code-layer code-enter"} data-file={id}>
      <pre className="code" data-lang={lang}>
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

function Content({ pack, index, leaving }: { pack: IdePack; index: number; leaving: boolean }) {
  const cls = leaving ? "code-layer code-leave" : "code-layer code-enter"
  if (pack.kind === "files") {
    const file = pack.files[index] ?? pack.files[0]
    if (!file) return null
    return <CodeLayer key={file.path} id={file.path} code={file.code} lang={file.lang} leaving={leaving} />
  }
  if (pack.kind === "inbox") {
    const mail = pack.emails[index] ?? pack.emails[0]
    if (!mail) return null
    return (
      <div className={cls} data-file={mail.subject}>
        <article className="mail" data-testid="ide-mail">
          <p className="mail-subject">{mail.subject}</p>
          <p className="mail-from">
            <span>From</span> {mail.from}
          </p>
          <p className="mail-body">{mail.body}</p>
        </article>
      </div>
    )
  }
  const slide = pack.slides[index] ?? pack.slides[0]
  if (!slide) return null
  return (
    <div className={cls} data-file={slide.title}>
      <article className="slide" data-testid="ide-slide">
        <p className="slide-count">
          {pack.label} · {index + 1} / {pack.slides.length}
        </p>
        <h3 className="slide-title">{slide.title}</h3>
        <ul>
          {slide.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      </article>
    </div>
  )
}

/**
 * One fixed Catppuccin Mocha IDE shell behind the stage. The pane follows progress: single buffers
 * early, multi-file packs mid and upper, an inbox in q3, a slide deck at the end. The tab bar, the
 * explorer list and the deck controls are clickable; the editor itself stays a backdrop.
 */
export function IdeChrome() {
  const skills = useGame((state) => state.skills)
  const owned = useGame((state) => state.owned)
  const jobs = useGame((state) => state.jobs)
  const gigs = useGame((state) => state.gigs)
  const ideSel = useGame((state) => state.ideSel)
  const previewEra = useGame((state) => state.previewEra)
  const selectIde = useGame((state) => state.selectIde)
  const holdPreview = useGame((state) => state.holdPreview)

  const view = ideView({ skills, owned, jobs, gigs, ideSel, previewEra })
  const { pack, index, count } = view
  const items = useMemo(() => itemsOf(pack), [pack])

  const [layers, setLayers] = useState<Layer[]>(() => [{ pack, index, uid: layerSeq++ }])
  const top = layers[layers.length - 1] as Layer
  if (top.pack.id !== pack.id) {
    setLayers([top, { pack, index, uid: layerSeq++ }])
  }

  useEffect(() => {
    if (layers.length < 2) return
    const id = window.setTimeout(() => setLayers((current) => current.slice(-1)), FADE_MS)
    return () => window.clearTimeout(id)
  }, [layers])

  const pick = (next: number) => selectIde(pack.id, Math.min(Math.max(0, next), count - 1))
  const active = items[index]
  const lang = pack.kind === "files" ? (pack.files[index]?.lang ?? pack.files[0]?.lang) : undefined

  return (
    <div
      className="ide"
      role="region"
      aria-label="Code editor"
      data-testid="ide"
      data-pack={pack.id}
      data-kind={pack.kind}
      data-era={pack.era}
      data-preview={view.previewing ? "true" : "false"}
      data-file={active?.label}
      onPointerEnter={holdPreview}
      onPointerMove={holdPreview}
    >
      <nav className="ide-activity" aria-hidden="true">
        {["files", "search", "git", "run"].map((icon) => (
          <i key={icon} className={`ide-icon ide-icon-${icon}`} />
        ))}
      </nav>
      <aside className="ide-tree" aria-label={KIND_TITLE[pack.kind]}>
        <p className="ide-tree-title">
          {KIND_TITLE[pack.kind]} · {pack.label}
        </p>
        <div className="ide-list" role="listbox" aria-label={`${pack.label} ${KIND_TITLE[pack.kind].toLowerCase()}`}>
          {items.map((item, row) => (
            <button
              key={item.key}
              type="button"
              role="option"
              aria-selected={row === index}
              className={row === index ? `ide-item is-active is-${pack.kind}` : `ide-item is-${pack.kind}`}
              data-testid="ide-item"
              title={item.detail}
              onClick={() => pick(row)}
            >
              <i className={pack.kind === "files" ? "ide-file" : pack.kind === "inbox" ? "ide-mail-dot" : "ide-slide-dot"} />
              <span className="ide-item-text">
                <span className="ide-item-main">{item.label}</span>
                {pack.kind === "inbox" ? <span className="ide-item-sub">{item.detail}</span> : null}
                {pack.kind === "files" && item.detail !== item.label ? <span className="ide-item-sub">{item.detail}</span> : null}
              </span>
            </button>
          ))}
        </div>
        {GHOST_TREE.map(([depth, name, dir]) => (
          <p key={name} className="ide-tree-row" aria-hidden="true" style={{ ["--depth" as string]: depth }}>
            <i className={dir ? "ide-caret" : "ide-file"} />
            <span className="ghost-bar" style={{ width: `${name.length * 0.62}em` }} />
          </p>
        ))}
      </aside>
      <header className="ide-tabs" role="tablist" aria-label={`${pack.label} ${pack.kind === "files" ? "files" : pack.kind === "inbox" ? "emails" : "slides"}`}>
        {items.map((item, row) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={row === index}
            className={row === index ? "ide-tab is-active" : "ide-tab"}
            data-testid="ide-tab"
            title={item.detail}
            onClick={() => pick(row)}
          >
            <i className="ide-tab-dot" data-lang={pack.kind === "files" ? pack.files[row]?.lang : pack.kind} />
            <span>{pack.kind === "deck" ? `${row + 1} ${item.label}` : item.label}</span>
          </button>
        ))}
      </header>
      <div className="ide-editor">
        {layers.map((layer, position) => (
          <Content
            key={layer.uid}
            pack={layer.pack}
            index={layer === top ? index : layer.index}
            leaving={layers.length > 1 && position === 0}
          />
        ))}
      </div>
      <footer className="ide-status">
        <span className={view.previewing ? "ide-mode is-preview" : "ide-mode"}>{view.previewing ? "PREVIEW" : KIND_MODE[pack.kind]}</span>
        <span>main</span>
        <span className="ide-status-gap" />
        {pack.kind === "deck" ? (
          <span className="ide-deck-nav">
            <button type="button" data-testid="ide-slide-prev" aria-label="Previous slide" disabled={index <= 0} onClick={() => pick(index - 1)}>
              ‹
            </button>
            <span data-testid="ide-slide-pos">
              {index + 1} / {count}
            </span>
            <button type="button" data-testid="ide-slide-next" aria-label="Next slide" disabled={index >= count - 1} onClick={() => pick(index + 1)}>
              ›
            </button>
          </span>
        ) : null}
        <span data-testid="ide-lang">{lang ? LANG_LABEL[lang] : pack.kind === "inbox" ? `Inbox ${index + 1}/${count}` : "Slides"}</span>
        <span>UTF-8</span>
      </footer>
    </div>
  )
}
