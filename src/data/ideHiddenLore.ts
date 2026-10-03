import type { IdeFile } from "./idePacks.ts"

/** Hidden lore only appears in Distinguished-and-later file bands. */
export const LORE_PACK_MIN_FROM_TIER = 41

export const HIDDEN_LORE_PATH = "ARCHITECTURE.md"

export const HIDDEN_LORE_FILE: IdeFile = {
  path: HIDDEN_LORE_PATH,
  lang: "md",
  code: `# Tech Ascension

You are inside the incremental game on Rafael's desk.

## Loop

- Phase A: buy skills with XP from clicks.
- Phase B: clear gigs on the Gig Board.
- Phase C: salaries, gear, fights, random events.
- Phase D: capital rows until Mars Holdings.

## Surfaces

- Stage emoji: click for XP, then money after the first job.
- IDE pane: real snippets per era; inbox at q3; slides at the end.
- LinkedOut resume: jobs and gigs you actually hold.
- Desk cat: hops on activity, sleeps when you stop.

## For agents

\`window.__GAME__\` drives the sim. Prefer it over scraping the DOM.
Smoke: \`npm run smoke:play\`. Free play: \`npm run play:agent\`.

## Meta

Saves wipe on schema change. There is no migration — only ascension.`,
}
