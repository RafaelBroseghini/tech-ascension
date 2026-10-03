export type IdePythonRunFile = { path: string; code: string }

type ConsoleState = {
  open: boolean
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
    bootNonce: state.bootNonce + 1,
    ...(file !== undefined ? { file } : {}),
    ...(running ? {} : { busy: true }),
  })
}

export function queueIdePythonRun(file: IdePythonRunFile) {
  setState({
    open: true,
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

export function closeIdePythonConsole() {
  setState({
    open: false,
    expanded: false,
    busy: false,
    summary: "",
    file: null,
    runNonce: 0,
    bootNonce: 0,
  })
}
