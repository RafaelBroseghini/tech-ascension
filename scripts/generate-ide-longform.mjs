#!/usr/bin/env node
/**
 * Builds src/data/ideLongForm.generated.ts — multi-hundred-LOC IDE “real app” scripts.
 * Run: node scripts/generate-ide-longform.mjs
 */
import { writeFileSync } from "node:fs"

const FUNNY = [
  "# wtf is this for",
  "# no clue why prod needs this branch",
  "# FIXME: it worked on my machine (2019)",
  "# do not ask questions just ship",
  "# inherited from intern who inherited from intern",
  "# pretty sure this is unused but afraid to delete",
  "# linter cried so I wrapped it in try/except",
  "# 3am commit do not revert",
  "# manager said make it enterprise",
  "# copy-pasted from stackoverflow answer #384721",
]

function pick(arr, i) {
  return arr[i % arr.length]
}

/** @param {object} opts */
function buildApp(opts) {
  const { title, era, locTarget, entryFn, entryBody } = opts
  const lines = []
  lines.push(`"""${title} — ${era} codebase snapshot (IDE lore, not production)."""`)
  lines.push("")
  lines.push("from __future__ import annotations")
  lines.push("")
  lines.push("import argparse")
  lines.push("import json")
  lines.push("import logging")
  lines.push("import os")
  lines.push("import random")
  lines.push("import re")
  lines.push("import sys")
  lines.push("import time")
  lines.push("from collections import defaultdict, deque")
  lines.push("from dataclasses import dataclass, field")
  lines.push("from datetime import datetime, timezone")
  lines.push("from pathlib import Path")
  lines.push("from typing import Any, Callable, Iterable, Iterator")
  lines.push("")
  lines.push(`LOG = logging.getLogger("${title.replace(/\s+/g, "_").toLowerCase()}")`)
  lines.push("")
  lines.push("@dataclass")
  lines.push("class Settings:")
  lines.push('    """Runtime knobs copied from five different wiki pages."""')
  lines.push("    debug: bool = False")
  lines.push('    data_dir: Path = Path("./data")')
  lines.push("    batch_size: int = 32")
  lines.push("    max_retries: int = 3")
  lines.push("    feature_flags: dict[str, bool] = field(default_factory=dict)")
  lines.push("")
  lines.push("    @classmethod")
  lines.push("    def from_env(cls) -> Settings:")
  lines.push("        return cls(")
  lines.push('            debug=os.getenv("DEBUG", "") == "1",')
  lines.push('            data_dir=Path(os.getenv("DATA_DIR", "./data")),')
  lines.push("        )")
  lines.push("")

  let i = 0
  while (lines.length < locTarget - 80) {
    const mod = Math.floor(i / 8)
    if (i % 11 === 0) lines.push(pick(FUNNY, i))
    if (i % 13 === 0) lines.push("")

    if (i % 8 === 0) {
      lines.push(`class Module${mod}:`)
      lines.push(`    """Subsystem ${mod} — ${era} refactor #${mod}."""`)
      lines.push("")
      lines.push("    def __init__(self, settings: Settings):")
      lines.push("        self.settings = settings")
      lines.push("        self._cache: dict[str, Any] = {}")
      lines.push("")
      lines.push("    def handle(self, payload: dict[str, Any]) -> dict[str, Any]:")
      lines.push('        key = json.dumps(payload, sort_keys=True, default=str)')
      lines.push("        if key in self._cache:")
      lines.push("            return self._cache[key]")
      lines.push("        out = self._process(payload)")
      lines.push("        self._cache[key] = out")
      lines.push("        return out")
      lines.push("")
      lines.push("    def _process(self, payload: dict[str, Any]) -> dict[str, Any]:")
      lines.push("        time.sleep(0 if self.settings.debug else 0.0001)")
      lines.push('        score = sum(len(str(v)) for v in payload.values())')
      lines.push(`        return {"ok": True, "score": score, "module": ${mod}}`)
      lines.push("")
    }

    if (i % 8 === 3) {
      lines.push(`def pipeline_${mod}(rows: Iterable[dict[str, Any]], settings: Settings) -> list[dict[str, Any]]:`)
      lines.push(`    worker = Module${mod}(settings)`)
      lines.push("    out = []")
      lines.push("    for row in rows:")
      lines.push("        if not row:")
      lines.push("            continue")
      lines.push("        out.append(worker.handle(row))")
      lines.push("    return out")
      lines.push("")
    }

    if (i % 8 === 5) {
      lines.push(`def validate_${mod}(text: str) -> bool:`)
      lines.push('    if not text or len(text) > 10_000:')
      lines.push("        return False")
      lines.push(`    return bool(re.match(r"^[a-zA-Z0-9_\\\\-]+$", text[:200]))`)
      lines.push("")
    }
    i += 1
  }

  lines.push("def build_parser() -> argparse.ArgumentParser:")
  lines.push(`    p = argparse.ArgumentParser(description=${JSON.stringify(title)})`)
  lines.push('    p.add_argument("--dry-run", action="store_true")')
  lines.push('    p.add_argument("--seed", type=int, default=0)')
  lines.push("    return p")
  lines.push("")
  while (lines.length < locTarget - 20) {
    const n = lines.length
    lines.push("")
    lines.push(`def _archive_helper_${n}(settings: Settings) -> dict[str, Any]:`)
    lines.push(`    ${pick(FUNNY, n)}`)
    lines.push(`    return Module0(settings).handle({"archive": ${n}})`)
  }

  lines.push(`def ${entryFn}() -> bool:`)
  for (const line of entryBody.split("\n")) lines.push(`    ${line.trim()}`)
  lines.push("")
  lines.push('if __name__ == "__main__":')
  lines.push("    logging.basicConfig(level=logging.INFO)")
  lines.push("    args = build_parser().parse_args()")
  lines.push("    if args.seed:")
  lines.push("        random.seed(args.seed)")
  lines.push(`    ok = ${entryFn}()`)
  lines.push('    print("done", ok)')
  lines.push("    sys.exit(0 if ok else 1)")
  lines.push("")

  return lines.join("\n")
}

const APPS = [
  {
    key: "fizzbuzz:gradebook_cli.py",
    title: "Gradebook CLI",
    era: "high school",
    locTarget: 480,
    entryFn: "run_app",
    entryBody: `settings = Settings.from_env()
    rows = [{"student": f"s{n}", "score": random.randint(50, 100)} for n in range(5)]
    merged = pipeline_0(rows, settings)
    return len(merged) == 5`,
  },
  {
    key: "two_sum:course_registry.py",
    title: "Course Registry",
    era: "college",
    locTarget: 480,
    entryFn: "run_app",
    entryBody: `settings = Settings.from_env()
    catalog = [{"code": "CSC240", "seats": 30}, {"code": "CSC341", "seats": 12}]
    ok = all(validate_0(c["code"]) for c in catalog)
    return ok and len(pipeline_1(catalog, settings)) == 2`,
  },
  {
    key: "reverse_list:gig_board_backend.py",
    title: "Gig Board Backend",
    era: "bootcamp",
    locTarget: 560,
    entryFn: "run_app",
    entryBody: `settings = Settings.from_env()
    gigs = [{"id": i, "title": f"gig-{i}"} for i in range(8)]
    return len(pipeline_2(gigs, settings)) >= 1`,
  },
  {
    key: "debounce:typeahead_service.py",
    title: "Typeahead Service",
    era: "internship",
    locTarget: 580,
    entryFn: "run_app",
    entryBody: `settings = Settings.from_env()
    settings.feature_flags["debounce_ms"] = True
    queries = [{"q": "react"}, {"q": "reactive"}]
    return pipeline_3(queries, settings)[0]["ok"]`,
  },
  {
    key: "search:log_inspector.py",
    title: "Log Inspector",
    era: "junior oncall",
    locTarget: 620,
    entryFn: "run_app",
    entryBody: `settings = Settings.from_env()
    lines = [{"line": "ERROR timeout"}, {"line": "INFO ok"}]
    return any("ERROR" in r.get("line", "") for r in lines if isinstance(r, dict)) or True`,
  },
  {
    key: "workers:batch_runner.py",
    title: "Batch Runner",
    era: "mid-level platform",
    locTarget: 680,
    entryFn: "run_app",
    entryBody: `settings = Settings.from_env()
    jobs = [{"id": i, "payload": i * 2} for i in range(16)]
    return len(pipeline_4(jobs, settings)) == 16`,
  },
  {
    key: "finetune:experiment_lab.py",
    title: "Experiment Lab",
    era: "senior ML",
    locTarget: 750,
    entryFn: "run_app",
    entryBody: `settings = Settings.from_env()
    settings.batch_size = 16
    batches = [{"loss": random.random()} for _ in range(4)]
    out = pipeline_5(batches, settings)
    return out and out[0].get("ok")`,
  },
  {
    key: "ratelimit:edge_gateway.py",
    title: "Edge Gateway",
    era: "staff",
    locTarget: 800,
    entryFn: "run_app",
    entryBody: `settings = Settings.from_env()
    reqs = [{"ip": "10.0.0.1", "path": "/v1/search"} for _ in range(10)]
    return len(pipeline_6(reqs, settings)) == 10`,
  },
  {
    key: "lru:cache_service.py",
    title: "Cache Service",
    era: "principal",
    locTarget: 800,
    entryFn: "run_app",
    entryBody: `settings = Settings.from_env()
    keys = [{"key": f"k{i}", "val": i} for i in range(20)]
    return len(pipeline_7(keys, settings)) == 20`,
  },
  {
    key: "attention:model_lab.py",
    title: "Model Lab",
    era: "distinguished",
    locTarget: 800,
    entryFn: "run_app",
    entryBody: `settings = Settings.from_env()
    tensors = [{"shape": [8, 128]} for _ in range(3)]
    return pipeline_8(tensors, settings)[0]["ok"]`,
  },
]

const body = {}
for (const app of APPS) {
  body[app.key] = buildApp(app)
}

const header = `/** Auto-generated by scripts/generate-ide-longform.mjs — do not edit by hand. */

export const IDE_LONG_FORM: Readonly<Record<string, string>> = `

writeFileSync(
  new URL("../src/data/ideLongForm.generated.ts", import.meta.url),
  header + JSON.stringify(body, null, 2) + "\n",
)

for (const app of APPS) {
  const loc = body[app.key].split("\n").length
  console.log(app.key, loc, "lines")
}
