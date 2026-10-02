# Playing Tech Ascension

Drive the game through `window.__GAME__`. Do not scrape buttons or guess DOM selectors.

`__GAME__` is installed for the dev server and for `vite preview` (it ships in the client bundle). `npm run smoke:play` loads the same harness in Vitest.

## Rules

- Prefer `__GAME__` over DOM selectors.
- Run `npm run smoke:play` first to prove mechanics. It must exit non-zero on any failed assert.
- Free play: `npm run play:agent`, then drive the open page with `__GAME__`.
- Do not grind past mid (`principal-ai-architect`) in automated runs unless the user asks. Early tiers and a single mid check are enough.

## API

```ts
getState(): {
  money: number
  xp: number
  cps: number
  clickPower: number
  owned: Record<string, number>
  era: "early" | "mid" | "upper" | "q3" | "end"
  spriteTierKey: string
  activeBoost: { mult: number; endsAt: number } | null
  savedAt: number
}

click(): { money: number; xp: number }
stages(): { key: string; name: string; era: string; baseCost: number }[]
buy(tierKey: string): boolean
tick(ms: number): void
setMoney(n: number): void
forceBoost(mult: number, ms: number): void
advanceOffline(ms: number): { credited: number; toast: string | null }
reset(): void
```

- `cps` is idle $/s. Click boosts do not change it.
- `clickPower` is the base payout. A click pays `clickPower × activeBoost.mult` (mult is 1 when no boost is active).
- Stages are identified by a permanent string `key` (`"used-laptop"`, `"first-llm-finetune"`, …), never by position. `stages()` lists them all in price order.
- `owned` is keyed by stage key.
- `spriteTierKey` is the key of the highest owned stage. It is `"used-laptop"` before the first purchase, and `era` follows that stage. (The UI shows a separate opening scene at that point.)
- The shop UI hides tiers until your balance has reached their price once (`peakMoney`). `buy(tierKey)` ignores this, so agents can still buy any tier directly.
- `buy` purchases one copy and returns false when the key is unknown or the cost is too high.
- `tick(ms)` advances idle time immediately, capped at 8 hours. It can also roll the normal boost clock.
- `forceBoost(mult, ms)` replaces the current click boost. Use this instead of waiting for a random roll.
- `advanceOffline(ms)` writes `savedAt` that far in the past and rehydrates. Credit is idle × seconds, capped at 8 hours. The toast is the same `welcome back, credited $X` path as a reload.
- `reset()` wipes the save back to high school.

## Smoke (`npm run smoke:play`)

Vitest + happy-dom, three scenarios, all through `__GAME__`:

1. **Early loop.** Click until `used-laptop`, `stack-overblow` and `freecodechamp` are affordable, buy them, and assert money falls on each buy, `$/s` and XP rise, and `spriteTierKey` advances to `freecodechamp`.
2. **Mid jump.** `setMoney` to the base cost of "Fine-tune your first LLM" (`first-llm-finetune`), buy it, and assert the cps / clickPower deltas match `TIERS`. `forceBoost(5, 10_000)`, then assert the click delta is `clickPower × 5` and `cps` is unchanged.
3. **Offline.** Buy tier 1, `advanceOffline` 1 hour, and assert credit ≈ `cps × 3600`. `advanceOffline` 10 hours and assert credit is capped at `cps × 8 × 3600`. Both calls must return a welcome-back toast.

## Free play (`npm run play:agent`)

Starts Vite on http://127.0.0.1:43123 if it is not already up, opens Chrome with remote debugging on port 9222, and leaves that browser up until the process is stopped. Set `PLAY_HEADED=1` to show the window. Set `CHROME_PATH` if Chrome is not on the default path.

From another process:

```js
import { chromium } from "playwright-core"

const browser = await chromium.connectOverCDP("http://127.0.0.1:9222")
const page = browser.contexts()[0].pages()[0]

await page.evaluate(() => window.__GAME__.getState())
await page.evaluate(() => {
  const game = window.__GAME__
  while (game.getState().money < 185) game.click()
  game.buy("used-laptop")
  game.buy("stack-overblow")
  game.buy("freecodechamp")
})

await browser.close()
```

`browser.disconnect` is not a function in this Playwright. `close()` on a `connectOverCDP` browser drops this client and leaves Chrome running. The `play:agent` process owns Chrome until SIGINT or SIGTERM; that shutdown is the one that actually closes the window.

## Example sequences

Early ladder:

```js
const game = window.__GAME__
game.reset()
while (game.getState().money < 185) game.click()
game.buy("used-laptop")
game.buy("stack-overblow")
game.buy("freecodechamp")
game.getState()
```

Click boost (`first-llm-finetune`, still mid):

```js
const game = window.__GAME__
game.reset()
game.setMoney(7e6)
game.buy("first-llm-finetune")
game.forceBoost(5, 10_000)
const before = game.getState()
game.click()
// money increased by before.clickPower * 5; cps unchanged
```

Offline sim:

```js
const game = window.__GAME__
game.reset()
game.setMoney(15)
game.buy("used-laptop")
game.advanceOffline(60 * 60 * 1000)
game.advanceOffline(10 * 60 * 60 * 1000)
```
