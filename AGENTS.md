# Playing Tech Ascension

Drive the game through `window.__GAME__`. Do not scrape buttons or guess DOM selectors.

`__GAME__` is installed for the dev server and for `vite preview` (it ships in the client bundle). `npm run smoke:play` loads the same harness in Vitest.

## Rules

- Prefer `__GAME__` over DOM selectors.
- Run `npm run smoke:play` first to prove mechanics. It must exit non-zero on any failed assert.
- Free play: `npm run play:agent`, then drive the open page with `__GAME__`.
- Do not grind past mid (tier 33, Principal AI architect) in automated runs unless the user asks. Early tiers and a single mid check are enough.

## API

```ts
getState(): {
  money: number
  xp: number
  cps: number
  clickPower: number
  owned: Record<string, number>
  era: "early" | "mid" | "upper" | "q3" | "end"
  spriteTierId: number
  activeBoost: { mult: number; endsAt: number } | null
  savedAt: number
 fight: { enemyId: number; hp: number; maxHp: number; remainingMs: number } | null
 lastFight: { kind: "win" | "flee" | "timeout"; enemyId: number; reward: number } | null
}

click(): { money: number; xp: number }
buy(tierId: number): boolean
tick(ms: number): void
setMoney(n: number): void
forceBoost(mult: number, ms: number): void
advanceOffline(ms: number): { credited: number; toast: string | null }
forceEnemy(enemyId: number): boolean
flee(): void
reset(): void
```

- `cps` is idle $/s. Click boosts do not change it.
- `clickPower` is the base payout. A click pays `clickPower × activeBoost.mult` (mult is 1 when no boost is active).
- `owned` is keyed by tier id (`"1"`, `"26"`, …).
- `spriteTierId` is the highest owned tier. It is `1` before the first purchase, and `era` follows that tier. (The UI shows a separate opening scene at that point.)
- The shop UI hides tiers until your balance has reached their price once (`peakMoney`). `buy(tierId)` ignores this, so agents can still buy any tier directly.
- `buy` purchases one copy and returns false when the id is unknown or the cost is too high.
- `tick(ms)` advances idle time immediately, capped at 8 hours. It can also roll the normal boost clock.
- `forceBoost(mult, ms)` replaces the current click boost. Use this instead of waiting for a random roll.
- `advanceOffline(ms)` writes `savedAt` that far in the past and rehydrates. Credit is idle × seconds, capped at 8 hours. The toast is the same `welcome back, credited $X` path as a reload.
- `forceEnemy(id)` starts a rare-enemy fight now (ids 1–44, `src/data/enemies.ts`), bypassing the random spawn and the era gate. Returns false for an unknown id. Random spawns roll only among enemies whose `eraGate` equals the current era.
- During a fight `click()` damages the enemy by `clickPower × activeBoost.mult` and pays no money. A kill pays `reward`. `flee()` and the 30s timeout (`tick`) end the fight with no reward and no penalty. `lastFight` reports how the last one ended.
- `reset()` wipes the save back to high school.

## Smoke (`npm run smoke:play`)

Vitest + happy-dom, three scenarios, all through `__GAME__`:

1. **Early loop.** Click until tiers 1–3 are affordable, buy them, and assert money falls on each buy, `$/s` and XP rise, and `spriteTierId` advances to 3.
2. **Mid jump.** `setMoney` to the base cost of "Fine-tune your first LLM" (tier 26), buy it, and assert the cps / clickPower deltas match `TIERS`. `forceBoost(5, 10_000)`, then assert the click delta is `clickPower × 5` and `cps` is unchanged.
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
  game.buy(1)
  game.buy(2)
  game.buy(3)
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
game.buy(1)
game.buy(2)
game.buy(3)
game.getState()
```

Click boost (tier 26, still mid):

```js
const game = window.__GAME__
game.reset()
game.setMoney(7e6)
game.buy(26)
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
game.buy(1)
game.advanceOffline(60 * 60 * 1000)
game.advanceOffline(10 * 60 * 60 * 1000)
```
