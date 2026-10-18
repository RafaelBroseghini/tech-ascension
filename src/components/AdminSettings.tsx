import { useId, useState, useSyncExternalStore, type FormEvent } from "react"
import { buyEverything, parseAmount, setMoneyDirect, setXpDirect } from "../game/admin.ts"
import { getAdminMode, subscribeAdminMode } from "../game/adminMode.ts"
import { formatNumber } from "../game/format.ts"
import { useGame } from "../game/store.ts"

type FieldProps = {
  id: "money" | "xp"
  label: string
  current: number
  prefix?: string
  onSet: (n: number) => void
}

function AdminField({ id, label, current, prefix = "", onSet }: FieldProps) {
  const [text, setText] = useState("")
  const inputId = useId()
  const amount = parseAmount(text)
  const invalid = text.trim() !== "" && amount === null

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (amount === null) return
    onSet(amount)
    setText("")
  }

  return (
    <form className="admin-field" onSubmit={submit} data-testid={`admin-${id}`}>
      <label htmlFor={inputId}>
        {label}
        <span>
          {prefix}
          {formatNumber(current)}
        </span>
      </label>
      <div className="admin-field-row">
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          placeholder="40k, 2.5m, 1e9"
          value={text}
          aria-invalid={invalid}
          onChange={(event) => setText(event.target.value)}
        />
        <button type="submit" disabled={amount === null}>
          Set
        </button>
      </div>
    </form>
  )
}

/** Shown in the settings menu only while admin mode is on. */
export function AdminSettings({ headingId }: { headingId: string }) {
  const admin = useSyncExternalStore(subscribeAdminMode, getAdminMode, getAdminMode)
  const money = useGame((state) => state.money)
  const xp = useGame((state) => state.xp)
  if (!admin) return null

  return (
    <section className="ide-settings-section" aria-labelledby={headingId} data-testid="admin-settings">
      <p className="ide-theme-heading" id={headingId}>
        Admin
      </p>
      <div className="ide-settings-section-panel admin-panel">
        <AdminField id="money" label="Money" prefix="$" current={money} onSet={setMoneyDirect} />
        <AdminField id="xp" label="XP" current={xp} onSet={setXpDirect} />
        <button type="button" className="admin-action" data-testid="admin-buy-everything" onClick={buyEverything}>
          Buy everything
        </button>
      </div>
    </section>
  )
}
