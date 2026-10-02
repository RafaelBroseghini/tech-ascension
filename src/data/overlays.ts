import type { Era } from "./capital.ts"

export type Lang = "python" | "go" | "ts" | "java" | "rust" | "cuda"

export type Overlay = {
  id: number
  file: string
  lang: Lang
  /** Era the band sits in; the band starts at `fromTier` and runs to the next overlay's `fromTier - 1`. */
  era: Era
  fromTier: number
  code: string
}

export const LANG_LABEL: Record<Lang, string> = {
  python: "Python",
  go: "Go",
  ts: "TypeScript",
  java: "Java",
  rust: "Rust",
  cuda: "CUDA C++",
}

/**
 * Editor-buffer snippets from the IDE overlays brief (v1), 15 bands by the stage art id (src/data/art.ts).
 * Bands never cross an era boundary: the brief's "early→mid", "mid→upper" and "upper→q3"
 * snippets close out the era they ride on (reverse_list, finetune_loop, attention). Within an
 * era the buffer advances by tier band, never at random, so it only changes when progress does.
 * Art 0 (nothing bought yet) shows the first band.
 */
export const OVERLAYS: readonly Overlay[] = [
  {
    id: 1,
    file: "fizzbuzz.py",
    lang: "python",
    era: "early",
    fromTier: 0,
    code: `for i in range(1, 101):
    if i % 15 == 0: print("FizzBuzz")
    elif i % 3 == 0: print("Fizz")
    elif i % 5 == 0: print("Buzz")
    else: print(i)`,
  },
  {
    id: 2,
    file: "two_sum.py",
    lang: "python",
    era: "early",
    fromTier: 7,
    code: `def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target - n], i]
        seen[n] = i`,
  },
  {
    id: 3,
    file: "reverse_list.go",
    lang: "go",
    era: "early",
    fromTier: 13,
    code: `func reverse(h *Node) *Node {
    var prev *Node
    for h != nil {
        next := h.Next
        h.Next = prev
        prev, h = h, next
    }
    return prev
}`,
  },
  {
    id: 4,
    file: "debounce.ts",
    lang: "ts",
    era: "mid",
    fromTier: 19,
    code: `export function debounce<T extends (...a: any[]) => void>(fn: T, ms: number) {
  let t: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}`,
  },
  {
    id: 5,
    file: "BinarySearch.java",
    lang: "java",
    era: "mid",
    fromTier: 23,
    code: `static int search(int[] a, int x) {
  int lo = 0, hi = a.length - 1;
  while (lo <= hi) {
    int mid = (lo + hi) >>> 1;
    if (a[mid] < x) lo = mid + 1;
    else if (a[mid] > x) hi = mid - 1;
    else return mid;
  }
  return -1;
}`,
  },
  {
    id: 6,
    file: "worker_pool.go",
    lang: "go",
    era: "mid",
    fromTier: 27,
    code: `func pool(n int, jobs <-chan Job) {
    for i := 0; i < n; i++ {
        go func() {
            for j := range jobs { j.Run() }
        }()
    }
}`,
  },
  {
    id: 7,
    file: "finetune_loop.py",
    lang: "python",
    era: "mid",
    fromTier: 31,
    code: `for step, batch in enumerate(loader):
    loss = model(batch).loss
    loss.backward()
    opt.step(); opt.zero_grad()
    if step % 100 == 0:
        log(eval_loss(model))`,
  },
  {
    id: 8,
    file: "rate_limit.ts",
    lang: "ts",
    era: "upper",
    fromTier: 34,
    code: `export class TokenBucket {
  constructor(private r: number, private burst: number, private tokens = burst) {}
  take() {
    this.tokens = Math.min(this.burst, this.tokens + this.r);
    if (this.tokens < 1) return false;
    this.tokens -= 1; return true;
  }
}`,
  },
  {
    id: 9,
    file: "lru.rs",
    lang: "rust",
    era: "upper",
    fromTier: 37,
    code: `fn get(&mut self, k: K) -> Option<&V> {
    if let Some(node) = self.map.get(&k) {
        self.touch(node); return Some(&node.val);
    }
    None
}`,
  },
  {
    id: 10,
    file: "attention.py",
    lang: "python",
    era: "upper",
    fromTier: 41,
    code: `def attention(q, k, v):
    score = q @ k.T / sqrt(q.shape[-1])
    w = softmax(score, axis=-1)
    return w @ v`,
  },
  {
    id: 11,
    file: "gemm.cu",
    lang: "cuda",
    era: "q3",
    fromTier: 45,
    code: `__global__ void gemm(const float* A, const float* B, float* C, int N) {
  int row = blockIdx.y * blockDim.y + threadIdx.y;
  int col = blockIdx.x * blockDim.x + threadIdx.x;
  float sum = 0.f;
  for (int k = 0; k < N; ++k) sum += A[row*N+k] * B[k*N+col];
  C[row*N+col] = sum;
}`,
  },
  {
    id: 12,
    file: "consensus.go",
    lang: "go",
    era: "q3",
    fromTier: 50,
    code: `func (n *Node) tally(votes []Vote) bool {
    yes := 0
    for _, v := range votes { if v.Grant { yes++ } }
    return yes > len(votes)/2
}`,
  },
  {
    id: 13,
    file: "edge_route.ts",
    lang: "ts",
    era: "end",
    fromTier: 54,
    code: `export function route(req: Request, edges: Edge[]): Edge {
  return edges
    .map(e => ({ e, s: e.score(req) }))
    .sort((a, b) => b.s - a.s)[0].e;
}`,
  },
  {
    id: 14,
    file: "orbital_sync.py",
    lang: "python",
    era: "end",
    fromTier: 59,
    code: `def sync(weights, delay_s):
    send(chunk(weights), qos="bulk")
    ack = wait(delay_s * 2)
    return ack.ok`,
  },
  {
    id: 15,
    file: "habitat_ctl.rs",
    lang: "rust",
    era: "end",
    fromTier: 63,
    code: `fn tick(power: f32, load: f32) -> Cmd {
    if power < load * 0.9 { Cmd::ShedNonEssential }
    else if power > load * 1.2 { Cmd::SpinUpGpu }
    else { Cmd::Hold }
}`,
  },
]

/** Overlay for the highest owned tier id (0 = nothing bought yet). */
export function overlayForTier(tierId: number): Overlay {
  let pick = OVERLAYS[0] as Overlay
  for (const overlay of OVERLAYS) {
    if (overlay.fromTier <= tierId) pick = overlay
  }
  return pick
}

const KEYWORDS: Record<Lang, ReadonlySet<string>> = {
  python: new Set(["def", "for", "in", "if", "elif", "else", "return", "while", "import", "from", "None", "True", "False"]),
  go: new Set(["func", "var", "for", "range", "if", "else", "return", "go", "nil", "true", "false", "chan", "type", "struct"]),
  ts: new Set(["export", "function", "class", "extends", "constructor", "private", "return", "let", "const", "new", "if", "else", "this", "typeof", "false", "true"]),
  java: new Set(["static", "while", "if", "else", "return", "new", "final", "class", "public", "for"]),
  rust: new Set(["fn", "let", "if", "else", "return", "mut", "self", "match", "impl", "pub", "use", "None", "Some"]),
  cuda: new Set(["__global__", "const", "for", "if", "else", "return", "void", "while"]),
}

const TYPES: Record<Lang, ReadonlySet<string>> = {
  python: new Set(),
  go: new Set(["int", "bool", "string", "float64"]),
  ts: new Set(["number", "string", "boolean", "void", "any"]),
  java: new Set(["int", "long", "boolean", "void"]),
  rust: new Set(["f32", "f64", "u32", "u64", "bool"]),
  cuda: new Set(["int", "float", "double", "dim3"]),
}

export type TokenKind = "kw" | "str" | "num" | "fn" | "type" | "op" | "text"
export type Token = { kind: TokenKind; text: string }

const TOKEN_RE = /("(?:\\.|[^"\\])*")|(\b\d+(?:\.\d+)?f?\b|\b\d+\.f\b)|([A-Za-z_]\w*)|(=>|->|<-|::|[<>=!+\-*/%&|^@~]+)|(\s+)|(.)/g

/** Tiny lexer: strings, numbers, keywords, types, calls and operators. Joining the texts gives back the source. */
export function tokenize(code: string, lang: Lang): Token[] {
  const out: Token[] = []
  const keywords = KEYWORDS[lang]
  const types = TYPES[lang]
  for (const match of code.matchAll(TOKEN_RE)) {
    const [text, str, num, word, op] = match
    if (str) out.push({ kind: "str", text })
    else if (num) out.push({ kind: "num", text })
    else if (word) {
      const next = code[(match.index ?? 0) + text.length]
      const kind: TokenKind = keywords.has(word)
        ? "kw"
        : types.has(word) || /^[A-Z]/.test(word)
          ? "type"
          : next === "(" || next === "<"
            ? "fn"
            : "text"
      out.push({ kind, text })
    } else if (op) out.push({ kind: "op", text })
    else out.push({ kind: "text", text })
  }
  return out
}
