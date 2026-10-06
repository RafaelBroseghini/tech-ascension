export type IdePythonRunFile = { path: string; code: string }

/** The console's tabs: the Python terminal, and the career log as JSON lines. */
export type ConsoleTab = "terminal" | "output"

type ConsoleState = {
  open: boolean
  tab: ConsoleTab
  expanded: boolean
  busy: boolean
  summary: string
  file: IdePythonRunFile | null
  runNonce: number
  /** Bumps when the console is opened so the panel can boot Pyodide on its own. */
  bootNonce: number
}

const listeners = new Set<() => void>()

let state: ConsoleState = {
  open: false,
  tab: "terminal",
  expanded: false,
  busy: false,
  summary: "",
  file: null,
  runNonce: 0,
  bootNonce: 0,
}

function emit() {
  for (const listener of listeners) listener()
}

function setState(patch: Partial<ConsoleState>) {
  state = { ...state, ...patch }
  emit()
}

export function subscribeIdePythonConsole(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getIdePythonConsole(): ConsoleState {
  return state
}

export function openIdePythonConsole(file?: IdePythonRunFile | null) {
  const running = state.runNonce > 0 && state.busy
  setState({
    open: true,
    tab: "terminal",
    bootNonce: state.bootNonce + 1,
    ...(file !== undefined ? { file } : {}),
    ...(running ? {} : { busy: true }),
  })
}

export function queueIdePythonRun(file: IdePythonRunFile) {
  setState({
    open: true,
    tab: "terminal",
    busy: true,
    summary: "",
    file,
    runNonce: state.runNonce + 1,
    bootNonce: state.bootNonce === 0 ? state.bootNonce + 1 : state.bootNonce,
  })
}

export function setIdePythonRunSummary(summary: string, busy = false) {
  setState({ summary, busy })
}

export function setIdePythonRunBusy(busy: boolean) {
  setState({ busy })
}

export function toggleIdePythonConsoleExpanded() {
  setState({ expanded: !state.expanded })
}

/** Opens the console on its Output tab. Python is not started for it. */
export function openIdeOutput() {
  setState({ open: true, tab: "output" })
}

/** Switches tab. The terminal boots Python the first time it is shown. */
export function setIdeConsoleTab(tab: ConsoleTab) {
  if (tab === state.tab) return
  if (tab === "terminal" && state.bootNonce === 0) {
    setState({ tab, bootNonce: 1, busy: true })
    return
  }
  setState({ tab })
}

export function closeIdePythonConsole() {
  setState({
    open: false,
    tab: "terminal",
    expanded: false,
    busy: false,
    summary: "",
    file: null,
    runNonce: 0,
    bootNonce: 0,
  })
}
