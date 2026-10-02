import type { Lang } from "./overlays.ts"
import type { Era } from "./capital.ts"

/**
 * IDE content v2. What the editor pane shows depends on the era:
 * early is one buffer per band, mid and upper are multi-file packs (tabs and a file list),
 * q3 is an email inbox, end is a slide deck. Each era's packs are bands of capital tier ids,
 * so the pane only changes when progress does.
 */

export type IdeFile = { path: string; lang: Lang; code: string }
export type IdeEmail = { from: string; subject: string; body: string }
export type IdeSlide = { title: string; bullets: readonly string[] }

type PackBase = {
  id: string
  /** Short name for the status bar and the explorer header. */
  label: string
  era: Era
  /** The band starts at this tier id and runs to the next pack's `fromTier - 1`. */
  fromTier: number
}

export type FilePack = PackBase & { kind: "files"; files: readonly IdeFile[] }
export type InboxPack = PackBase & { kind: "inbox"; emails: readonly IdeEmail[] }
export type DeckPack = PackBase & { kind: "deck"; slides: readonly IdeSlide[] }
export type IdePack = FilePack | InboxPack | DeckPack

export const IDE_PACKS: readonly IdePack[] = [
  {
    id: "fizzbuzz",
    kind: "files",
    label: "fizzbuzz",
    era: "early",
    fromTier: 0,
    files: [
      {
        path: "fizzbuzz.py",
        lang: "python",
        code: `for i in range(1, 101):
    if i % 15 == 0: print("FizzBuzz")
    elif i % 3 == 0: print("Fizz")
    elif i % 5 == 0: print("Buzz")
    else: print(i)`,
      },
    ],
  },
  {
    id: "two_sum",
    kind: "files",
    label: "two_sum",
    era: "early",
    fromTier: 7,
    files: [
      {
        path: "two_sum.py",
        lang: "python",
        code: `def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target - n], i]
        seen[n] = i`,
      },
    ],
  },
  {
    id: "reverse_list",
    kind: "files",
    label: "reverse_list",
    era: "early",
    fromTier: 13,
    files: [
      {
        path: "reverse_list.go",
        lang: "go",
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
    ],
  },
  {
    id: "debounce",
    kind: "files",
    label: "debounce",
    era: "mid",
    fromTier: 19,
    files: [
      {
        path: "src/debounce.ts",
        lang: "ts",
        code: `export function debounce<T extends (...a: any[]) => void>(fn: T, ms: number) {
  let t: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}`,
      },
      {
        path: "src/debounce.test.ts",
        lang: "ts",
        code: `import { debounce } from "./debounce";
import { expect, test, vi } from "vitest";

test("fires once, after the quiet period", () => {
  vi.useFakeTimers();
  const fn = vi.fn();
  const run = debounce(fn, 100);
  run(1); run(2); run(3);
  vi.advanceTimersByTime(99);
  expect(fn).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(fn).toHaveBeenCalledTimes(1);
  expect(fn).toHaveBeenCalledWith(3);
});`,
      },
      {
        path: "README.md",
        lang: "md",
        code: `# debounce

Wait until the calls stop, then run once.

    const save = debounce(write, 300)
    input.oninput = () => save(input.value)`,
      },
    ],
  },
  {
    id: "search",
    kind: "files",
    label: "search",
    era: "mid",
    fromTier: 23,
    files: [
      {
        path: "BinarySearch.java",
        lang: "java",
        code: `public class BinarySearch {
  static int search(int[] a, int x) {
    int lo = 0, hi = a.length - 1;
    while (lo <= hi) {
      int mid = (lo + hi) >>> 1;
      if (a[mid] < x) lo = mid + 1;
      else if (a[mid] > x) hi = mid - 1;
      else return mid;
    }
    return -1;
  }
}`,
      },
      {
        path: "BinarySearchTest.java",
        lang: "java",
        code: `class BinarySearchTest {
  int[] a = {1, 3, 5, 7, 9};

  @Test void finds() {
    assert BinarySearch.search(a, 7) == 3;
  }

  @Test void misses() {
    assert BinarySearch.search(a, 4) == -1;
  }
}`,
      },
    ],
  },
  {
    id: "workers",
    kind: "files",
    label: "workers",
    era: "mid",
    fromTier: 27,
    files: [
      {
        path: "main.go",
        lang: "go",
        code: `package main

func main() {
    jobs := make(chan Job, 64)
    go feed(jobs)
    pool(4, jobs)
}`,
      },
      {
        path: "worker.go",
        lang: "go",
        code: `package main

func pool(n int, jobs <-chan Job) {
    for i := 0; i < n; i++ {
        go func() {
            for j := range jobs { j.Run() }
        }()
    }
}`,
      },
      {
        path: "go.mod",
        lang: "mod",
        code: `module example.com/workers

go 1.22`,
      },
    ],
  },
  {
    id: "finetune",
    kind: "files",
    label: "finetune",
    era: "mid",
    fromTier: 31,
    files: [
      {
        path: "train.py",
        lang: "python",
        code: `from data import loader
from config import cfg

for step, batch in enumerate(loader(cfg.batch)):
    loss = model(batch).loss
    loss.backward()
    opt.step(); opt.zero_grad()
    if step % 100 == 0:
        log(eval_loss(model))`,
      },
      {
        path: "data.py",
        lang: "python",
        code: `import random

def loader(batch, n=1000):
    for _ in range(n):
        yield [random.random() for _ in range(batch)]`,
      },
      {
        path: "config.yaml",
        lang: "yaml",
        code: `lr: 0.00002
batch: 16
epochs: 3
warmup_steps: 100`,
      },
    ],
  },
  {
    id: "ratelimit",
    kind: "files",
    label: "ratelimit",
    era: "upper",
    fromTier: 34,
    files: [
      {
        path: "tokenBucket.ts",
        lang: "ts",
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
        path: "middleware.ts",
        lang: "ts",
        code: `import { TokenBucket } from "./tokenBucket";
import type { Req } from "./types";

const buckets = new Map<string, TokenBucket>();

export function limit(req: Req): 200 | 429 {
  let b = buckets.get(req.ip);
  if (!b) buckets.set(req.ip, (b = new TokenBucket(1, 10)));
  return b.take() ? 200 : 429;
}`,
      },
      {
        path: "types.ts",
        lang: "ts",
        code: `export type Limit = { rate: number; burst: number };
export type Req = { ip: string; path: string };`,
      },
    ],
  },
  {
    id: "lru",
    kind: "files",
    label: "lru",
    era: "upper",
    fromTier: 37,
    files: [
      {
        path: "lib.rs",
        lang: "rust",
        code: `mod list;
use std::collections::HashMap;

pub struct Lru<K, V> { map: HashMap<K, usize>, list: list::List<V> }

impl<K: Eq + std::hash::Hash, V> Lru<K, V> {
    pub fn get(&mut self, k: K) -> Option<&V> {
        let i = *self.map.get(&k)?;
        self.list.touch(i);
        self.list.get(i)
    }
}`,
      },
      {
        path: "list.rs",
        lang: "rust",
        code: `pub struct List<V> { nodes: Vec<Node<V>>, head: usize }
struct Node<V> { val: V, prev: usize, next: usize }

impl<V> List<V> {
    pub fn touch(&mut self, i: usize) {
        self.unlink(i);
        self.push_front(i);
    }
    pub fn get(&self, i: usize) -> Option<&V> {
        self.nodes.get(i).map(|n| &n.val)
    }
}`,
      },
      {
        path: "Cargo.toml",
        lang: "toml",
        code: `[package]
name = "lru"
version = "0.1.0"
edition = "2021"`,
      },
    ],
  },
  {
    id: "attention",
    kind: "files",
    label: "attention",
    era: "upper",
    fromTier: 41,
    files: [
      {
        path: "attention.py",
        lang: "python",
        code: `from math import sqrt
from softmax import softmax

def attention(q, k, v):
    score = q @ k.T / sqrt(q.shape[-1])
    w = softmax(score, axis=-1)
    return w @ v`,
      },
      {
        path: "softmax.py",
        lang: "python",
        code: `import numpy as np

def softmax(x, axis=-1):
    z = x - x.max(axis=axis, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=axis, keepdims=True)`,
      },
      {
        path: "test_attention.py",
        lang: "python",
        code: `import numpy as np
from attention import attention

def test_shape():
    q = k = v = np.ones((4, 8))
    assert attention(q, k, v).shape == (4, 8)

def test_uniform_scores_average_v():
    q = k = np.zeros((3, 8))
    v = np.arange(24.0).reshape(3, 8)
    assert np.allclose(attention(q, k, v)[0], v.mean(axis=0))`,
      },
    ],
  },
  {
    id: "fab",
    kind: "inbox",
    label: "Fab / GPU",
    era: "q3",
    fromTier: 45,
    emails: [
      {
        from: "foundry-ops@",
        subject: "Yield excursion lot #4421",
        body: "Lot #4421 dropped 4.2% vs baseline. Holding tape-out. Need your sign-off on reticle check.",
      },
      {
        from: "legal@",
        subject: "Export control checklist",
        body: "Reminder: any model weight transfer >X params needs license review before Friday cut.",
      },
      {
        from: "cluster-bot@",
        subject: "CUDA OOM on node gpu-17",
        body: "Auto-killed training job `fm-sft-92`. Free 2 nodes or reduce batch.",
      },
    ],
  },
  {
    id: "frontier",
    kind: "inbox",
    label: "Frontier lab",
    era: "q3",
    fromTier: 50,
    emails: [
      {
        from: "evals@",
        subject: "SWE-bench delta \u22120.4",
        body: "Nightly run is 0.4 points under yesterday. Within noise, but it is the third night in a row. Want a bisect on the data mix?",
      },
      {
        from: "safety@",
        subject: "Red-team notes",
        body: "Two jailbreaks reproduced on the new checkpoint. Writeups attached. Release stays gated until both are closed.",
      },
      {
        from: "board-assistant@",
        subject: "Deck due Friday",
        body: "The board wants the compute roadmap and a safety summary on one page each. Draft by Thursday noon, please.",
      },
    ],
  },
  {
    id: "edge",
    kind: "deck",
    label: "Edge / orbital",
    era: "end",
    fromTier: 54,
    slides: [
      { title: "Edge inference SLA", bullets: ["p99 < 80ms", "regional failover", "cache embeddings at PoP"] },
      { title: "Sync delay budget", bullets: ["orbit round trip: 40 to 600 ms by shell", "budget 2x delay per weight chunk", "bulk QoS, never ahead of serving"] },
      { title: "Failover map", bullets: ["three regions per continent", "drain, then re-route to the nearest PoP", "serve stale embeddings before serving nothing"] },
    ],
  },
  {
    id: "mars",
    kind: "deck",
    label: "Mars",
    era: "end",
    fromTier: 59,
    slides: [
      { title: "Habitat power", bullets: ["solar + micro-reactor", "shed nonessential at <90%", "spin GPUs at >120%"] },
      { title: "GPU shed policy", bullets: ["life support is never shed", "training pauses first", "inference degrades before it drops"] },
      { title: "Dust storm runbook", bullets: ["solar can fall 60% in hours", "checkpoint, then throttle loads", "reactor carries the base, GPUs idle"] },
    ],
  },
]

export const PACK_NOUN: Record<IdePack["kind"], string> = { files: "files", inbox: "inbox", deck: "deck" }

/** The pack for the highest owned art id (0 = nothing bought yet). */
export function packForTier(tierId: number): IdePack {
  let pick = IDE_PACKS[0] as IdePack
  for (const pack of IDE_PACKS) {
    if (pack.fromTier <= tierId) pick = pack
  }
  return pick
}

export function packsInEra(era: Era): IdePack[] {
  return IDE_PACKS.filter((pack) => pack.era === era)
}

/** The pack an era shows while it is only being browsed in the shop: its first band. */
export function previewPackForEra(era: Era): IdePack {
  return packsInEra(era)[0] ?? (IDE_PACKS[0] as IdePack)
}

export type IdeItem = { key: string; label: string; detail: string }

/** What the tab bar and explorer list for a pack, in order. */
export function itemsOf(pack: IdePack): IdeItem[] {
  if (pack.kind === "files") {
    return pack.files.map((file) => ({ key: file.path, label: file.path.split("/").pop() ?? file.path, detail: file.path }))
  }
  if (pack.kind === "inbox") {
    return pack.emails.map((mail) => ({ key: mail.subject, label: mail.subject, detail: mail.from }))
  }
  return pack.slides.map((slide, index) => ({ key: slide.title, label: slide.title, detail: `${index + 1}` }))
}
