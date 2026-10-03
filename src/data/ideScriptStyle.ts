import type { IdeFile } from "./idePacks.ts"
import { ensurePythonHarness } from "./idePythonHarness.ts"
import { isLongFormScript, longFormScript } from "./ideLongForm.ts"

/** How the fake author writes Python in each IDE file band (see idePacks.ts ids). */
export type ScriptBand =
  | "hs"
  | "college"
  | "bootcamp"
  | "intern"
  | "junior"
  | "mid"
  | "senior"
  | "staff"
  | "principal"
  | "distinguished"

const PACK_BAND: Record<string, ScriptBand> = {
  fizzbuzz: "hs",
  two_sum: "college",
  reverse_list: "bootcamp",
  debounce: "intern",
  search: "junior",
  workers: "mid",
  finetune: "senior",
  ratelimit: "staff",
  lru: "principal",
  attention: "distinguished",
}

const BAND_LORE: Record<
  ScriptBand,
  { who: string; doc: string; vibes: readonly string[] }
> = {
  hs: {
    who: "AP Computer Science — period 4",
    doc: "https://docs.python.org/3/tutorial/introduction.html",
    vibes: [
      "why: guidance counselor said STEM looks good on applications",
      "why: making fizzbuzz before the bell rings",
      "why: borrowed dad's laptop; trackpad sticky",
      "ref: Think Python ch.3 — still on paper copy",
    ],
  },
  college: {
    who: "CSC 240 — data structures",
    doc: "https://leetcode.com/problemset/",
    vibes: [
      "why: midterm retake slot opens Friday",
      "why: study group at the union; pizza owed",
      "why: prof banned importing numpy on homework",
      "ref: CLRS on reserve — chapter 11 dog-eared",
    ],
  },
  bootcamp: {
    who: "Hack Reactor prep — cohort B",
    doc: "https://www.techinterviewhandbook.org/algorithms/array/",
    vibes: [
      "why: whiteboard mock tomorrow 9am",
      "why: flashcard deck says 'know linked lists cold'",
      "why: career coach wants GitHub green squares",
      "ref: NeetCode roadmap — week 2",
    ],
  },
  intern: {
    who: "ENG-4412 — search debounce spike",
    doc: "https://wiki.internal/frontend/input-debounce",
    vibes: [
      "why: PM says typeahead feels 'mushy'",
      "why: mentor said ship a PR before standup",
      "why: copied pattern from old React repo, rewriting in py for script",
      "ref: ticket ENG-4412 — comment thread 47 messages",
    ],
  },
  junior: {
    who: "oncall notebook — binary search variants",
    doc: "https://wiki.internal/algorithms/binary-search",
    vibes: [
      "why: prod index off-by-one; writing probes to remember",
      "why: interview loop next quarter — rehearsing",
      "why: copied from code review feedback doc",
      "ref: SRE postmortem 2022-11 — 'test boundaries'",
    ],
  },
  mid: {
    who: "platform scratch — concurrency drills",
    doc: "https://docs.python.org/3/library/concurrent.futures.html",
    vibes: [
      "why: load test showed thread pile-up",
      "why: design doc due; need working sketch",
      "why: porting go notes from last job into py prototypes",
      "ref: blog: 'Don't communicate by sharing memory'",
    ],
  },
  senior: {
    who: "ml-research/experiments — finetune branch",
    doc: "https://huggingface.co/docs/transformers/training",
    vibes: [
      "why: loss spiked on step 40k — sanity scripts",
      "why: reproduce ablation before staff review",
      "why: intern asked how schedulers work — wrote this",
      "ref: wandb run finetune-v3.2 — notes in README",
    ],
  },
  staff: {
    who: "edge-gateway — rate limit RFC draft",
    doc: "https://datatracker.ietf.org/doc/html/rfc6585",
    vibes: [
      "why: API review blocked until limits exist",
      "why: paste from design review — python for sim",
      "why: compare token bucket vs sliding window counts",
      "ref: incident INC-884 — retry storm",
    ],
  },
  principal: {
    who: "cache service — LRU prototype",
    doc: "https://en.wikipedia.org/wiki/Cache_replacement_policies#LRU",
    vibes: [
      "why: rust rewrite later; py for lunch-and-learn",
      "why: interview loop calibration problem",
      "why: borrowed from 2014 memcached notes",
      "ref: paper: 'TinyLFU' sticky note on monitor",
    ],
  },
  distinguished: {
    who: "foundation-model — attention scratchpad",
    doc: "https://arxiv.org/abs/1706.03762",
    vibes: [
      "why: explain MHA to board in plain Python",
      "why: check numeric stability before CUDA kernel",
      "why: weekend thought experiment — do not ship",
      "ref: Karpathy 'makemore' lecture timestamp 1:12:04",
    ],
  },
}

function hashPath(path: string): number {
  let h = 0
  for (let i = 0; i < path.length; i++) h = (h * 31 + path.charCodeAt(i)) | 0
  return Math.abs(h)
}

function fakeDate(band: ScriptBand, path: string): string {
  const base: Record<ScriptBand, number> = {
    hs: 2018,
    college: 2020,
    bootcamp: 2021,
    intern: 2022,
    junior: 2023,
    mid: 2023,
    senior: 2024,
    staff: 2025,
    principal: 2025,
    distinguished: 2026,
  }
  const y = base[band]
  const m = 1 + (hashPath(path) % 11)
  const d = 1 + (hashPath(path + "d") % 27)
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

const WHIMSICAL_COMMENTS = [
  "# wtf is this for",
  "# honestly not sure this branch runs in prod",
  "# TODO: delete after hackathon (never deleted)",
  "# why did past-me think this was clever",
  "# lint disabled here for vibes",
  "# copied from discord dm",
  "# if this breaks it's your problem now",
  "# 2am fix — no tests",
] as const

function sprinkleWhimsy(code: string, path: string): string {
  if (code.includes("wtf is this for")) return code
  const h = hashPath(path)
  if (h % 4 !== 0) return code
  const quip = WHIMSICAL_COMMENTS[h % WHIMSICAL_COMMENTS.length]
  const hit = code.indexOf("\ndef ")
  if (hit === -1) return `${quip}\n${code}`
  return `${code.slice(0, hit + 1)}\n${quip}${code.slice(hit + 1)}`
}

function headerBlock(packId: string, path: string): string {
  const band = PACK_BAND[packId] ?? "junior"
  const lore = BAND_LORE[band]
  const vibe = lore.vibes[hashPath(path) % lore.vibes.length]
  const file = path.split("/").pop() ?? path
  return `# ${lore.who}
# ${file} — ${fakeDate(band, path)}
# ${vibe}
# docs: ${lore.doc}
`
}

function stripReturnAnnotations(code: string): string {
  return code.replace(/\)\s*->[^\n:]+:/g, "):")
}

function stripTypeHintsInDef(code: string): string {
  return code.replace(/def ([a-zA-Z_][\w]*)\(([^)]*)\)/g, (_, name, args) => {
    const plain = args
      .split(",")
      .map((p: string) => p.trim())
      .filter(Boolean)
      .map((p: string) => p.split(":")[0]!.trim())
      .join(", ")
    return `def ${name}(${plain})`
  })
}

function addNoviceNoise(code: string, path: string): string {
  let body = stripReturnAnnotations(stripTypeHintsInDef(code))
  if (path === "fizzbuzz.py") {
    return body
      .replace(/for i in range\(1, 101\)/, "for i in range(1, 101):  # lol")
      .replace(/print\("FizzBuzz"\)/, 'print("FizzBuzz")  # both!!')
  }
  if (path === "hello.py") return body
  const short = body.split("\n").length <= 10
  if (short && !body.includes("print(") && body.includes("def ")) {
    const lines = body.split("\n")
    const defIdx = lines.findIndex((l) => l.startsWith("def "))
    if (defIdx >= 0) {
      lines.splice(defIdx + 1, 0, "    print('debug', 'TODO fix later')  # ms smith said add prints")
      body = lines.join("\n")
    }
  }
  return body
}

function addCollegeComments(code: string): string {
  if (code.includes("# O(")) return code
  const firstDef = code.indexOf("def ")
  if (firstDef < 0) return code
  return `${code.slice(0, firstDef)}# TODO: write up complexity for TA\n${code.slice(firstDef)}`
}

function addBootcampBanner(code: string, path: string): string {
  if (path.includes("test")) return code
  return `${code.replace(/^(\s*)def /, "$1# interview: explain out loud before coding\n$1def ")}`
}

function addInternTicket(code: string): string {
  if (code.includes("ENG-")) return code
  return code.replace(/\n(def |class )/, "\n# ENG-4412 — ship behind feature flag\n$1")
}

function addSeniorDocstring(code: string): string {
  if (code.includes('"""')) return code
  return code.replace(/^(\s*)def ([a-zA-Z_]\w*)\([^)]*\):\s*$/m, (line) => `${line}\n${line.match(/^(\s*)/)?.[1] ?? ""}    """Small util — not production."""`)
}

function addDistinguishedNote(code: string): string {
  if (code.includes("# numerics:")) return code
  return `# numerics: prefer float64; watch softmax underflow\n${code}`
}

function applyBandVoice(band: ScriptBand, path: string, code: string): string {
  switch (band) {
    case "hs":
      return addNoviceNoise(code, path)
    case "college":
      return addCollegeComments(stripReturnAnnotations(code))
    case "bootcamp":
      return addBootcampBanner(stripReturnAnnotations(code), path)
    case "intern":
      return addInternTicket(code)
    case "junior":
      return code
    case "mid":
      return code
    case "senior":
      return addSeniorDocstring(code)
    case "staff":
      return code
    case "principal":
      return code
    case "distinguished":
      return addDistinguishedNote(code)
    default:
      return code
  }
}

/** Lore headers + career-band voice; forces python in the editor. */
export function styleIdeFile(packId: string, file: IdeFile): IdeFile {
  const band = PACK_BAND[packId] ?? "junior"
  const PATH_ALIASES: Record<string, string> = {
    "BinarySearch.java": "binary_search.py",
    "SearchInsert.java": "search_insert.py",
    "reverse_list.go": "reverse_list.py",
    "tokenBucket.ts": "token_bucket.py",
    "middleware.ts": "rate_limit_middleware.py",
    "types.ts": "rate_limit_types.py",
    "circuit_breaker.ts": "circuit_breaker.py",
    "bulkhead.ts": "bulkhead_pool.py",
    "retry_backoff.ts": "retry_backoff.py",
    "idempotency.ts": "idempotency.py",
    "lib.rs": "lru_core.py",
    "list.rs": "lru_list.py",
    "main.go": "worker_main.py",
    "worker.go": "worker_pool.py",
    "src/debounce.ts": "debounce.py",
    "src/debounce.test.ts": "test_debounce.py",
    "go.mod": "project_notes.py",
    "Cargo.toml": "project_notes.py",
  }
  const normalizedPath =
    PATH_ALIASES[file.path] ??
    file.path.replace(/\.(go|ts|java|rs|toml|mod)$/, ".py")

  const displayPath = normalizedPath.replace(/\.yaml$/, ".py")
  const longBody = longFormScript(packId, displayPath)
  let code = longBody ?? file.code
  if (!longBody && file.lang !== "python") {
    code = convertLegacySnippet(file.path, file.code, file.lang)
  }

  const baseName = displayPath.split("/").pop() ?? displayPath
  let body = longBody
    ? code.trim()
    : sprinkleWhimsy(
        applyBandVoice(band, baseName, code.trim()),
        displayPath,
      )
  body = ensurePythonHarness(body, displayPath      )
  body = ensurePythonHarness(body, displayPath)
  return {
    path: displayPath,
    lang: "python",
    code: `${headerBlock(packId, displayPath)}${body}`.trimEnd(),
  }
}

function convertLegacySnippet(path: string, code: string, lang: string): string {
  if (path === "reverse_list.go") {
    return `class Node:
    def __init__(self, val=0, next=None):
        self.val, self.next = val, next

def reverse(head):
    prev = None
    while head:
        nxt = head.next
        head.next = prev
        prev, head = head, nxt
    return prev`
  }
  if (path === "src/debounce.ts") {
    return `import threading

def debounce(fn, ms):
    timer = {"t": None}

    def wrapped(*args, **kwargs):
        t = timer["t"]
        if t:
            t.cancel()
        timer["t"] = threading.Timer(ms / 1000.0, lambda: fn(*args, **kwargs))
        timer["t"].start()

    return wrapped`
  }
  if (path === "src/debounce.test.ts") {
    return `import time
from debounce import debounce

def test_debounce_fires_once():
    hits = {"n": 0}

    def bump():
        hits["n"] += 1

    run = debounce(bump, 50)
    run()
    run()
    time.sleep(0.06)
    assert hits["n"] == 1`
  }
  if (path === "BinarySearch.java") {
    return `def search(a, x):
    lo, hi = 0, len(a) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if a[mid] < x:
            lo = mid + 1
        elif a[mid] > x:
            hi = mid - 1
        else:
            return mid
    return -1`
  }
  if (path === "SearchInsert.java") {
    return `def search_insert(a, x):
    lo, hi = 0, len(a)
    while lo < hi:
        mid = (lo + hi) // 2
        if a[mid] < x:
            lo = mid + 1
        else:
            hi = mid
    return lo`
  }
  if (path === "main.go") {
    return `from concurrent.futures import ThreadPoolExecutor
from queue import Queue

def feed(jobs):
    for j in range(64):
        jobs.put(j)

def pool(n, jobs):
    with ThreadPoolExecutor(max_workers=n) as ex:
        while not jobs.empty():
            ex.submit(lambda job=jobs.get(): job.run())

if __name__ == "__main__":
    q = Queue(maxsize=64)
    feed(q)
    pool(4, q)`
  }
  if (path === "worker.go") {
    return `def pool(n, jobs):
    import threading

    def worker():
        for job in iter(jobs.get, None):
            job.run()

    threads = [threading.Thread(target=worker) for _ in range(n)]
    for t in threads:
        t.start()`
  }
  if (path === "tokenBucket.ts") {
    return `class TokenBucket:
    def __init__(self, rate, burst, tokens=None):
        self.rate, self.burst = rate, burst
        self.tokens = burst if tokens is None else tokens

    def take(self):
        self.tokens = min(self.burst, self.tokens + self.rate)
        if self.tokens < 1:
            return False
        self.tokens -= 1
        return True`
  }
  if (path === "middleware.ts") {
    return `from token_bucket import TokenBucket

buckets = {}

def limit(req):
    b = buckets.get(req["ip"])
    if not b:
        b = TokenBucket(1, 10)
        buckets[req["ip"]] = b
    return 200 if b.take() else 429`
  }
  if (path === "types.ts") {
    return `# typed-ish dicts for the gateway sim
Limit = {"rate": float, "burst": int}
Req = {"ip": str, "path": str}`
  }
  if (path === "circuit_breaker.ts") {
    return `class Breaker:
    def __init__(self):
        self.state = "closed"
        self.failures = 0

    def call(self, fn):
        if self.state == "open":
            raise RuntimeError("open")
        try:
            return fn()
        except Exception:
            self.failures += 1
            if self.failures >= 5:
                self.state = "open"`
  }
  if (path === "bulkhead.ts") {
    return `class Pool:
    def __init__(self, max_active):
        self.max_active = max_active
        self.active = 0

    def run(self, fn):
        if self.active >= self.max_active:
            raise RuntimeError("saturated")
        self.active += 1
        try:
            return fn()
        finally:
            self.active -= 1`
  }
  if (path === "retry_backoff.ts") {
    return `import time

def retry(fn, tries=5):
    wait = 0.1
    for _ in range(tries):
        try:
            return fn()
        except Exception:
            time.sleep(wait)
            wait *= 2`
  }
  if (path === "idempotency.ts") {
    return `import time

seen = {}

def once(key, ttl_ms, fn):
    now = time.time() * 1000
    hit = seen.get(key)
    if hit and now - hit < ttl_ms:
        return
    seen[key] = now
    fn()`
  }
  if (path === "lib.rs") {
    return `class Lru:
    def __init__(self):
        self.map = {}
        self.order = []

    def get(self, key):
        if key not in self.map:
            return None
        self.order.remove(key)
        self.order.append(key)
        return self.map[key]`
  }
  if (path === "list.rs") {
    return `class List:
    def __init__(self):
        self.nodes = []
        self.head = 0

    def touch(self, i):
        val = self.nodes[i]
        self.nodes.pop(i)
        self.nodes.insert(0, val)

    def get(self, i):
        return self.nodes[i] if i < len(self.nodes) else None`
  }
  if (path === "Cargo.toml" || path === "go.mod") {
    return `# metadata only — real build lives in monorepo
# kept as a bookmark from an old rewrite`
  }
  return `# ported from ${lang} — ${path}\n${code}`
}

export function maxLinesForPack(packId: string): number {
  const band = PACK_BAND[packId] ?? "junior"
  if (band === "hs" || band === "college") return 52
  if (band === "bootcamp" || band === "intern" || band === "junior") return 58
  if (band === "mid" || band === "senior") return 64
  return 72
}

export function maxLinesForFile(packId: string, path: string): number {
  if (isLongFormScript(packId, path)) return 920
  return maxLinesForPack(packId)
}
