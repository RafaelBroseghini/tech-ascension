#!/usr/bin/env node
/**
 * Generates src/data/idePythonFixtures.ts from PROBLEM_POOLS + curated test cases.
 * Run: node scripts/generate-ide-python-fixtures.mjs
 */
import { writeFileSync } from "node:fs"
import { PROBLEM_POOLS } from "../src/data/ideProblemPools.ts"

/** @type {Record<string, { function?: string, append?: string, tests: {args: unknown[], expect: unknown}[], mainLines?: string[] }>} */
const CURATED = {
  "hello.py": { tests: [{ args: [], expect: "Hello, world!" }], mainLines: ["print(hello())"] },
  "fizzbuzz.py": {
    append: `def fizz_line(n):
    if n % 15 == 0:
        return "FizzBuzz"
    if n % 3 == 0:
        return "Fizz"
    if n % 5 == 0:
        return "Buzz"
    return str(n)`,
    function: "fizz_line",
    tests: [
      { args: [3], expect: "Fizz" },
      { args: [5], expect: "Buzz" },
      { args: [15], expect: "FizzBuzz" },
    ],
    mainLines: ["print(fizz_line(15))"],
  },
  "sum_1_to_n.py": { tests: [{ args: [5], expect: 15 }], mainLines: ["print(sum_to(5))"] },
  "count_vowels.py": { tests: [{ args: ["hello"], expect: 2 }] },
  "reverse_string.py": { tests: [{ args: ["abc"], expect: "cba" }] },
  "is_palindrome.py": { tests: [{ args: ["A man, a plan, a canal: Panama"], expect: true }] },
  "factorial.py": { tests: [{ args: [5], expect: 120 }] },
  "fibonacci.py": { tests: [{ args: [6], expect: 8 }] },
  "find_max.py": { tests: [{ args: [[3, 1, 4, 1, 5]], expect: 5 }] },
  "linear_search.py": { tests: [{ args: [[1, 2, 3], 2], expect: 1 }] },
  "bubble_sort.py": { tests: [{ args: [[3, 1, 2]], expect: [1, 2, 3] }] },
  "gcd.py": { tests: [{ args: [48, 18], expect: 6 }] },
  "is_prime.py": { tests: [{ args: [17], expect: true }, { args: [18], expect: false }] },
  "two_sum_brute.py": { tests: [{ args: [[2, 7, 11, 15], 9], expect: [0, 1] }] },
  "merge_sorted_arrays.py": { tests: [{ args: [[1, 3], [2, 4]], expect: [1, 2, 3, 4] }] },
  "rotate_left.py": { tests: [{ args: [[1, 2, 3, 4], 1], expect: [2, 3, 4, 1] }] },
  "missing_number.py": { tests: [{ args: [[3, 0, 1]], expect: 2 }] },
  "single_digit_sum.py": { tests: [{ args: [38], expect: 2 }] },
  "caesar_cipher.py": { tests: [{ args: ["abc", 1], expect: "bcd" }] },
  "matrix_trace.py": { tests: [{ args: [[[1, 2], [3, 4]]], expect: 5 }] },
  "two_sum.py": { tests: [{ args: [[2, 7, 11, 15], 9], expect: [0, 1] }] },
  "valid_anagram.py": { tests: [{ args: ["anagram", "nagaram"], expect: true }] },
  "contains_duplicate.py": { tests: [{ args: [[1, 2, 3, 1]], expect: true }] },
  "valid_palindrome.py": { tests: [{ args: ["race a car"], expect: false }] },
  "best_time_stock.py": { tests: [{ args: [[7, 1, 5, 3, 6, 4]], expect: 5 }] },
  "merge_sorted_array.py": {
    tests: [{ args: [[1, 2, 3, 0, 0, 0], 3, [2, 5, 6], 3], expect: null }],
    mainLines: ['print("merge in-place")'],
  },
  "move_zeroes.py": { tests: [{ args: [[0, 1, 0, 3, 12]], expect: null }], mainLines: ['print("move_zeroes demo")'] },
  "plus_one.py": { tests: [{ args: [[1, 2, 3]], expect: [1, 2, 4] }] },
  "single_number.py": { tests: [{ args: [[4, 1, 2, 1, 2]], expect: 4 }] },
  "intersection_arrays.py": { tests: [{ args: [[1, 2, 2, 1], [2, 2]], expect: [2] }] },
  "climb_stairs.py": { tests: [{ args: [4], expect: 5 }] },
  "remove_duplicates.py": { tests: [{ args: [[1, 1, 2]], expect: 2 }] },
  "rotate_array.py": { tests: [{ args: [[1, 2, 3, 4, 5, 6, 7], 3], expect: null }] },
  "longest_common_prefix.py": { tests: [{ args: [["flower", "flow", "flight"]], expect: "fl" }] },
  "remove_element.py": { tests: [{ args: [[3, 2, 2, 3], 3], expect: 2 }] },
  "majority_element.py": { tests: [{ args: [[3, 2, 3]], expect: 3 }] },
  "happy_number.py": { tests: [{ args: [19], expect: true }] },
  "isomorphic_strings.py": { tests: [{ args: ["egg", "add"], expect: true }] },
  "ransom_note.py": { tests: [{ args: ["aa", "aab"], expect: true }] },
  "summary_ranges.py": { tests: [{ args: [[0, 1, 2, 4, 5, 7]], expect: ["0->2", "4->5", "7"] }] },
  "binary_search.py": { tests: [{ args: [[1, 2, 3, 4, 5], 4], expect: 3 }] },
  "search_insert.py": { tests: [{ args: [[1, 3, 5, 6], 2], expect: 1 }] },
  "debounce.py": {
    function: "_ide_smoke_debounce",
    append: `def _ide_smoke_debounce():
    seen = {"n": 0}
    def bump():
        seen["n"] += 1
    run = debounce(bump, 10)
    run()
    return True`,
    tests: [{ args: [], expect: true }],
  },
  "test_debounce.py": {
    function: "_ide_smoke",
    append: `def _ide_smoke():
    return True`,
    tests: [{ args: [], expect: true }],
    mainLines: ['print("see debounce.py")'],
  },
  "config.yaml": {
    append: `CONFIG = {"lr": 2e-5, "batch": 16, "epochs": 3, "warmup_steps": 100}
def _ide_smoke():
    return CONFIG["batch"]`,
    function: "_ide_smoke",
    tests: [{ args: [], expect: 16 }],
  },
  "rate_limit_types.py": {
    append: `def _ide_smoke():
    return Req["ip"]`,
    function: "_ide_smoke",
    tests: [{ args: [], expect: "str" }],
    mainLines: ['print("types shim")'],
  },
  "project_notes.py": {
    append: `def _ide_smoke():
    return True`,
    function: "_ide_smoke",
    tests: [{ args: [], expect: true }],
  },
  "async_fetch.py": {
    append: `def _ide_smoke():
    return True`,
    function: "_ide_smoke",
    tests: [{ args: [], expect: true }],
  },
  "train.py": {
    append: `def _ide_smoke():
    return True`,
    function: "_ide_smoke",
    tests: [{ args: [], expect: true }],
  },
}

const LONG_APP = {
  function: "run_app",
  tests: [{ args: [], expect: true }],
  mainLines: ["print(run_app())"],
}
for (const name of [
  "gradebook_cli.py",
  "course_registry.py",
  "gig_board_backend.py",
  "typeahead_service.py",
  "log_inspector.py",
  "batch_runner.py",
  "experiment_lab.py",
  "edge_gateway.py",
  "cache_service.py",
  "model_lab.py",
]) {
  CURATED[name] = LONG_APP
}

CURATED["reverse_list.py"] = {
  append: `class Node:
    def __init__(self, val=0, next=None):
        self.val, self.next = val, next

def demo():
    a = Node(1, Node(2, Node(3)))
    r = reverse(a)
    return r.val`,
  function: "demo",
  tests: [{ args: [], expect: 3 }],
  mainLines: ["print(demo())"],
}

const FALLBACK = {
  append: `def demo():
    return True`,
  function: "demo",
  tests: [{ args: [], expect: true }],
  mainLines: ['print("ok")'],
}

/** @type {Record<string, object>} */
const out = {}

for (const files of Object.values(PROBLEM_POOLS)) {
  for (const f of files) {
    const base = f.path.split("/").pop()
    if (out[base]) continue
    if (CURATED[base]) {
      out[base] = { ...CURATED[base] }
      continue
    }
    const fn = f.code.match(/^def (\w+)\s*\(/m)?.[1]
    const cls = f.code.match(/^class (\w+)\s*/m)?.[1]
    if (fn) {
      out[base] = {
        tests: [{ args: [], expect: true }],
        function: "demo",
        append: `def demo():
    return callable(${fn})`,
        mainLines: [`print(${fn})`],
      }
      continue
    }
    if (cls) {
      out[base] = {
        tests: [{ args: [], expect: true }],
        function: "demo",
        append: `def demo():
    ${cls}()
    return True`,
        mainLines: [`print("${cls}")`],
      }
      continue
    }
    out[base] = { ...FALLBACK }
  }
}

const header = `/** Auto-generated by scripts/generate-ide-python-fixtures.mjs — do not edit by hand. */

export type IdePythonFixture = {
  function?: string
  append?: string
  tests: ReadonlyArray<{ args: readonly unknown[]; expect: unknown }>
  mainLines?: readonly string[]
}

export const IDE_PYTHON_FIXTURES: Readonly<Record<string, IdePythonFixture>> = `

writeFileSync(
  new URL("../src/data/idePythonFixtures.ts", import.meta.url),
  header + JSON.stringify(out, null, 2) + "\n",
)

console.log(`Wrote ${Object.keys(out).length} IDE Python fixtures`)
