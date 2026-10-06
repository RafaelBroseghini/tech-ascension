import {
  ChevronDown,
  ChevronsDownUp,
  ChevronLeft,
  ChevronRight,
  File,
  Files,
  GitBranch,
  Mail,
  Play,
  Presentation,
  Terminal,
} from "lucide-react"
import { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import {
  closeIdePythonConsole,
  getIdePythonConsole,
  openIdeOutput,
  openIdePythonConsole,
  queueIdePythonRun,
  subscribeIdePythonConsole,
} from "../game/idePythonConsole.ts"
import { getSidebarView, setSidebarView, subscribeSidebarView } from "../game/ideSidebar.ts"
import { CareerLog } from "./CareerLog.tsx"
import { FeatureGhost, NewMark } from "./FeatureMarks.tsx"
import { useFeatureOpen, useSurface } from "./useFeature.ts"
import { UI_ICON, UI_ICON_SM } from "./icons/ui.tsx"
import { itemsOf } from "../data/idePacks.ts"
import type { IdePack } from "../data/idePacks.ts"
import { LANG_LABEL, tokenize } from "../data/overlays.ts"
import type { Lang } from "../data/overlays.ts"
import { ideView, packWithHiddenLore } from "../game/ide.ts"
import {
  readIdeLoreUnlocked,
  subscribeIdeLore,
  tryUnlockIdeLoreFromFolder,
  tryUnlockIdeLoreFromStatusBar,
  tryUnlockIdeLoreFromTab,
} from "../game/ideSecrets.ts"
import { revealIn } from "../game/ideScroll.ts"
import { readCollapsedFolders, writeCollapsedFolders } from "../game/ideTreePrefs.ts"
import { useGame } from "../game/store.ts"
import { IdeStatusDock } from "./IdeStatusDock.tsx"

const FADE_MS = 260
const KIND_TITLE = { files: "Explorer", inbox: "Inbox", deck: "Slides" } as const
const KIND_MODE = { files: "NORMAL", inbox: "MAIL", deck: "SLIDES" } as const

function runPythonFile(file: { path: string; code: string; lang: Lang }) {
  if (file.lang !== "python") return
  queueIdePythonRun({ path: file.path, code: file.code })
}

function listIcon(kind: IdePack["kind"]) {
  if (kind === "inbox") return Mail
  if (kind === "deck") return Presentation
  return File
}

type Layer = { pack: IdePack; index: number; uid: number }

let layerSeq = 1

// A file is hundreds of token spans. Its props are strings, so a parent render never needs to touch it.
const CodeLayer = memo(function CodeLayer({ code, lang, leaving, id }: { code: string; lang: Lang; leaving: boolean; id: string }) {
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
})

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
 * IDE shell behind the stage. The palette is the saved editor theme. Unlocked problem bands stay
 * in the explorer as folders; the tab bar follows whichever folder is open.
 */
export const IdeChrome = memo(function IdeChrome() {
  const skills = useGame((state) => state.skills)
  const owned = useGame((state) => state.owned)
  const jobs = useGame((state) => state.jobs)
  const gigs = useGame((state) => state.gigs)
  const ideSel = useGame((state) => state.ideSel)
  const previewEra = useGame((state) => state.previewEra)
  const selectIde = useGame((state) => state.selectIde)
  const setPreviewEra = useGame((state) => state.setPreviewEra)
  const holdPreview = useGame((state) => state.holdPreview)

  const loreUnlocked = useSyncExternalStore(subscribeIdeLore, readIdeLoreUnlocked, readIdeLoreUnlocked)
  const terminalOpen = useFeatureOpen("terminal")
  const logOpen = useFeatureOpen("careerLog")
  const seeFeature = useGame((state) => state.seeFeature)
  const sidebar = useSyncExternalStore(subscribeSidebarView, getSidebarView, getSidebarView)
  const showLog = logOpen && sidebar === "log"
  const view = useMemo(
    () => ideView({ skills, owned, jobs, gigs, ideSel, previewEra, loreUnlocked }),
    [skills, owned, jobs, gigs, ideSel, previewEra, loreUnlocked],
  )
  const { pack, index, count, folders: rawFolders } = view
  const folders = useMemo(
    () => rawFolders.map((folder) => ({ ...folder, pack: packWithHiddenLore(folder.pack, loreUnlocked) })),
    [rawFolders, loreUnlocked],
  )
  const items = useMemo(() => itemsOf(pack), [pack])

  const [collapsed, setCollapsed] = useState<Set<string>>(() => readCollapsedFolders())
  const consoleSnap = useSyncExternalStore(subscribeIdePythonConsole, getIdePythonConsole, getIdePythonConsole)
  const consoleOpen = consoleSnap.open
  const consoleBusy = consoleSnap.busy

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

  const pick = (packId: string, next: number, shiftKey = false, keepConsole = false) => {
    const folder = folders.find((row) => row.id === packId)
    if (shiftKey && folder) tryUnlockIdeLoreFromFolder(folder.pack.fromTier, true)
    const max = (folder ? itemsOf(folder.pack).length : count) - 1
    const clamped = Math.min(Math.max(0, next), max)
    tryUnlockIdeLoreFromTab(packId, clamped)
    if (!keepConsole) closeIdePythonConsole()
    selectIde(packId, clamped)
    if (previewEra && packId !== pack.id) setPreviewEra(null)
  }

  const toggleFolder = (packId: string) => {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(packId)) next.delete(packId)
      else next.add(packId)
      return next
    })
  }

  const collapseAll = () => setCollapsed(new Set(folders.map((folder) => folder.id)))
  const allCollapsed = folders.every((folder) => collapsed.has(folder.id))

  // The open file always has a visible row: when the selection lands in a folded folder, it opens.
  const selection = `${pack.id}:${index}`
  const [seenSelection, setSeenSelection] = useState("")
  if (selection !== seenSelection) {
    setSeenSelection(selection)
    if (collapsed.has(pack.id)) {
      const next = new Set(collapsed)
      next.delete(pack.id)
      setCollapsed(next)
    }
  }
  useEffect(() => {
    writeCollapsedFolders(collapsed)
  }, [collapsed])

  // ...and the tab strip and explorer scroll to it, so the tab and the row always match the file on screen.
  const tabsRef = useRef<HTMLElement>(null)
  const treeRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const tab = tabsRef.current?.querySelector<HTMLElement>(".ide-tab.is-active")
    if (tabsRef.current && tab) revealIn(tabsRef.current, tab, "x")
    const row = treeRef.current?.querySelector<HTMLElement>(".ide-item-wrap.is-active")
    if (treeRef.current && row) revealIn(treeRef.current, row, "y")
  }, [pack.id, index])

  const active = items[index]
  const lang = pack.kind === "files" ? (pack.files[index]?.lang ?? pack.files[0]?.lang) : undefined
  const activeFile = pack.kind === "files" ? (pack.files[index] ?? pack.files[0]) : undefined
  const canRunActive = activeFile?.lang === "python" && !consoleBusy

  const runActiveFile = useCallback(() => {
    if (!activeFile || activeFile.lang !== "python" || consoleBusy) return
    runPythonFile(activeFile)
  }, [activeFile, consoleBusy])

  const showPythonConsole = useCallback(() => {
    if (getIdePythonConsole().open) {
      closeIdePythonConsole()
      return
    }
    openIdePythonConsole(activeFile?.lang === "python" ? { path: activeFile.path, code: activeFile.code } : null)
  }, [activeFile])

  const openLog = () => {
    setSidebarView("log")
    seeFeature("careerLog")
  }

  // A reveal card's "Try it": run the open file when it is Python, else just open the terminal.
  useSurface("terminal", () => {
    if (activeFile?.lang === "python" && !consoleBusy) runPythonFile(activeFile)
    else openIdePythonConsole(null)
  })
  useSurface("output", openIdeOutput)
  useSurface("careerLog", openLog)

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
      <nav className="ide-activity" aria-label="Activity bar">
        <button
          type="button"
          className={showLog ? "ide-activity-btn" : "ide-activity-btn is-active"}
          data-testid="ide-view-explorer"
          aria-label="Explorer"
          title="Explorer"
          aria-pressed={!showLog}
          onClick={() => setSidebarView("explorer")}
        >
          <Files className="ide-activity-icon ide-activity-icon-files" {...UI_ICON} aria-hidden />
        </button>
        {logOpen ? (
          <button
            type="button"
            className={showLog ? "ide-activity-btn is-active" : "ide-activity-btn"}
            data-testid="ide-view-log"
            data-feature-anchor="careerLog"
            aria-label="Career log"
            title="Career log"
            aria-pressed={showLog}
            onClick={() => (showLog ? setSidebarView("explorer") : openLog())}
          >
            <GitBranch className="ide-activity-icon ide-activity-icon-git" {...UI_ICON} aria-hidden />
            <NewMark id="careerLog" />
          </button>
        ) : (
          <FeatureGhost id="careerLog" className="ide-activity-btn">
            <GitBranch className="ide-activity-icon ide-activity-icon-git" {...UI_ICON} aria-hidden />
          </FeatureGhost>
        )}
        <div className="ide-activity-pair ide-activity-bottom">
          {terminalOpen ? (
            <>
              <button
                type="button"
                className={consoleBusy ? "ide-activity-btn is-busy" : "ide-activity-btn"}
                data-testid="ide-run-active"
                aria-label="Run Python file"
                title="Run Python file"
                disabled={!canRunActive}
                onClick={runActiveFile}
              >
                <Play className="ide-activity-icon ide-activity-icon-run" {...UI_ICON} aria-hidden />
              </button>
              <button
                type="button"
                className={consoleOpen ? "ide-activity-btn ide-activity-console is-active" : "ide-activity-btn ide-activity-console"}
                data-testid="ide-console-open"
                data-feature-anchor="terminal"
                aria-label="Show console"
                title="Console"
                aria-pressed={consoleOpen}
                onClick={showPythonConsole}
              >
                <Terminal className="ide-activity-icon ide-activity-icon-console" {...UI_ICON} aria-hidden />
                <NewMark id="terminal" />
              </button>
            </>
          ) : (
            <FeatureGhost id="terminal" className="ide-activity-btn">
              <Terminal className="ide-activity-icon ide-activity-icon-console" {...UI_ICON} aria-hidden />
            </FeatureGhost>
          )}
        </div>
      </nav>
      <aside className="ide-tree" aria-label={showLog ? "Career log" : "Explorer"} data-feature-anchor="editor">
        {showLog ? <CareerLog /> : null}
        {showLog ? null : (
        <>
        <div className="ide-tree-head">
          <p className="ide-tree-title">Explorer</p>
          <button
            type="button"
            className="ide-tree-action"
            data-testid="ide-collapse-all"
            aria-label="Collapse all folders"
            title="Collapse all folders"
            disabled={allCollapsed}
            onClick={collapseAll}
          >
            <ChevronsDownUp {...UI_ICON_SM} aria-hidden />
          </button>
        </div>
        <div ref={treeRef} className="ide-folder-tree" role="tree" aria-label="Project folders">
          {folders.map((folder) => {
            const folderItems = itemsOf(folder.pack)
            const isOpen = !collapsed.has(folder.id)
            const isActiveFolder = pack.id === folder.id
            const FolderIcon = listIcon(folder.kind)
            return (
              <div
                key={folder.id}
                className={folder.previewOnly ? "ide-folder is-preview-folder" : "ide-folder"}
                role="treeitem"
                aria-expanded={isOpen}
                data-testid="ide-folder"
                data-pack={folder.id}
              >
                <button
                  type="button"
                  className={isActiveFolder ? "ide-folder-head is-active" : "ide-folder-head"}
                  aria-label={`${isOpen ? "Collapse" : "Expand"} ${folder.label}`}
                  onClick={(event) => {
                    if (event.shiftKey) tryUnlockIdeLoreFromFolder(folder.pack.fromTier, true)
                    toggleFolder(folder.id)
                  }}
                >
                  {isOpen ? (
                    <ChevronDown className="ide-tree-chevron" {...UI_ICON_SM} aria-hidden />
                  ) : (
                    <ChevronRight className="ide-tree-chevron" {...UI_ICON_SM} aria-hidden />
                  )}
                  <FolderIcon className="ide-list-icon" {...UI_ICON_SM} aria-hidden />
                  <span className="ide-folder-name">{folder.label}</span>
                </button>
                {isOpen ? (
                  <div className="ide-list" role="group">
                    {folderItems.map((item, row) => {
                      const ListIcon = listIcon(folder.kind)
                      const selected = isActiveFolder && row === index
                      const file =
                        folder.kind === "files" && folder.pack.kind === "files" ? folder.pack.files[row] : undefined
                      const isPython = terminalOpen && file?.lang === "python"
                      const wrapClass = [
                        "ide-item-wrap",
                        `is-${folder.kind}`,
                        isPython ? "is-runnable" : "",
                        selected ? "is-active" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")
                      return (
                        <div key={item.key} className={wrapClass} role="treeitem" aria-selected={selected}>
                          <button
                            type="button"
                            className="ide-item"
                            data-testid="ide-item"
                            title={item.detail}
                            onClick={(event) => pick(folder.id, row, event.shiftKey)}
                            onDoubleClick={(event) => {
                              event.preventDefault()
                              if (folder.kind !== "files" || !terminalOpen) return
                              if (!file) return
                              pick(folder.id, row, event.shiftKey, true)
                              runPythonFile(file)
                            }}
                          >
                            <ListIcon className="ide-list-icon" {...UI_ICON_SM} aria-hidden />
                            <span className="ide-item-text">
                              <span className="ide-item-main">{item.label}</span>
                              {folder.kind === "inbox" ? <span className="ide-item-sub">{item.detail}</span> : null}
                              {folder.kind === "files" && item.detail !== item.label ? (
                                <span className="ide-item-sub">{item.detail}</span>
                              ) : null}
                            </span>
                          </button>
                          {isPython && file ? (
                            <button
                              type="button"
                              className="ide-item-run"
                              data-testid="ide-item-run"
                              aria-label={`Run ${item.label}`}
                              title="Run Python file"
                              disabled={consoleBusy}
                              onClick={(event) => {
                                event.stopPropagation()
                                pick(folder.id, row, event.shiftKey, true)
                                runPythonFile(file)
                              }}
                            >
                              <Play className="ide-item-run-icon" {...UI_ICON_SM} aria-hidden />
                            </button>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
        </>
        )}
      </aside>
      <header ref={tabsRef} className="ide-tabs" role="tablist" aria-label={`${pack.label} ${pack.kind === "files" ? "files" : pack.kind === "inbox" ? "emails" : "slides"}`}>
        {items.map((item, row) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={row === index}
            className={row === index ? "ide-tab is-active" : "ide-tab"}
            data-testid="ide-tab"
            title={item.detail}
            onClick={() => pick(pack.id, row)}
            onDoubleClick={() => {
              if (pack.kind !== "files" || !terminalOpen) return
              const file = pack.files[row]
              if (!file) return
              runPythonFile(file)
            }}
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
            pack={layer === top ? pack : layer.pack}
            index={layer === top ? index : layer.index}
            leaving={layers.length > 1 && position === 0}
          />
        ))}
      </div>
      <footer className="ide-status" onClick={() => tryUnlockIdeLoreFromStatusBar()}>
        <a
          className="ide-status-powered"
          href="https://emoji.gg/"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
        >
          powered by emoji.gg
        </a>
        <span className={view.previewing ? "ide-mode is-preview" : "ide-mode"}>{view.previewing ? "PREVIEW" : KIND_MODE[pack.kind]}</span>
        <span>{pack.label}</span>
        <span className="ide-status-gap" />
        <IdeStatusDock />
        {pack.kind === "deck" ? (
          <span className="ide-deck-nav">
            <button type="button" data-testid="ide-slide-prev" aria-label="Previous slide" disabled={index <= 0} onClick={() => pick(pack.id, index - 1)}>
              <ChevronLeft {...UI_ICON} aria-hidden />
            </button>
            <span data-testid="ide-slide-pos">
              {index + 1} / {count}
            </span>
            <button type="button" data-testid="ide-slide-next" aria-label="Next slide" disabled={index >= count - 1} onClick={() => pick(pack.id, index + 1)}>
              <ChevronRight {...UI_ICON} aria-hidden />
            </button>
          </span>
        ) : null}
        <span data-testid="ide-lang">{lang ? LANG_LABEL[lang] : pack.kind === "inbox" ? `Inbox ${index + 1}/${count}` : "Slides"}</span>
        <span>UTF-8</span>
      </footer>
    </div>
  )
})
