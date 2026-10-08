# Agent and smoke play

`window.__GAME__` is on the page in dev and in `vite preview`. The full method list, the smoke scenarios and the agent-browser usage are in [AGENTS.md](../AGENTS.md). Prefer the harness over DOM selectors.

```bash
npm run smoke:play
```

That Vitest run resets and plays phase A (XP-only clicks), the A-to-B gate, a gig clear and retainer, the job board and a senior job, the capital gate, a mid-era click boost, 1h and 10h offline catch-up, random events and 1:1s, and the career timeline (each piece of the desk unlocking, the JSON journal, and the cat on a return). It exits non-zero if any assert fails.

```bash
npm run play:agent
```

That starts the dev server if needed and opens the app in an agent-browser session (`tech-ascension`), so another process can run `AGENT_BROWSER_SESSION=tech-ascension npx agent-browser eval "window.__GAME__.click()"`. Browser usability checks (snapshots, screenshots, viewports) are in AGENTS.md under Browser checks. Automated play should stay in phases A to C (and a single mid check) unless you mean to push further.
