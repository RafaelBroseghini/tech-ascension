import { Info } from "lucide-react"
import { buyAmounts, goldById } from "../game/gold.ts"
import type { BuyAmount } from "../game/gold.ts"
import { useGame } from "../game/store.ts"
import { UI_ICON } from "./icons/ui.tsx"

const label = (amount: BuyAmount) => (amount === "max" ? "Max" : `${amount}×`)

/** The Buy multiplier on the activity bar. Until Bulk Buy ×5 is owned it is a message; after that it cycles the unlocked amounts. */
export function BuyMultiplier() {
  const gold = useGame((state) => state.gold)
  const buyAmount = useGame((state) => state.buyAmount)
  const setBuyAmount = useGame((state) => state.setBuyAmount)
  const amounts = buyAmounts(gold)

  if (amounts.length < 2) {
    const next = goldById(1)?.name ?? "Bulk Buy ×5"
    const message = `You buy one copy of each item at a time. Unlock ${next} in 10x dev to buy five at once.`
    return (
      <span className="ide-buy-hint" role="note" aria-label={message} title={message} data-testid="buy-hint">
        <Info {...UI_ICON} aria-hidden />
      </span>
    )
  }

  const index = amounts.indexOf(buyAmount)
  const next = amounts[(index + 1) % amounts.length]
  const title = `Buying ${label(buyAmount)} of each item. Click for ${label(next)}.`
  return (
    <button
      type="button"
      className="ide-buy-amount"
      data-testid="buy-multiplier"
      data-amount={buyAmount}
      aria-label={title}
      title={title}
      onClick={() => setBuyAmount(next)}
    >
      {label(buyAmount)}
    </button>
  )
}
