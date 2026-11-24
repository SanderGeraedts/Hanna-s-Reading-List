import { useEffect, useId, useRef, useState } from 'react'
import type { InputHTMLAttributes, ReactNode, Ref } from 'react'
import { PRICE_ERRORS, parsePrice, priceField } from '#/lib/price'
import type { PriceProblem } from '#/lib/price'

/**
 * A price field (T-0016): a fixed "€" inside its left edge, the number pad
 * with a decimal mark on a phone, about 9rem wide, and the error under it
 * only when what she typed isn't a price. No placeholder and no hint (D-0014).
 */
export function PriceInput({
  label,
  problem,
  inputRef,
  ...input
}: {
  label: ReactNode
  problem: PriceProblem | null
  inputRef?: Ref<HTMLInputElement>
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'inputMode' | 'id'>) {
  const id = useId()
  return (
    <div className="field price-field">
      <label htmlFor={`${id}-price`}>{label}</label>
      <div className="price-box">
        <span className="price-euro" aria-hidden>
          €
        </span>
        <input
          ref={inputRef}
          id={`${id}-price`}
          className="input price-input"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={!!problem}
          aria-describedby={problem ? `${id}-error` : undefined}
          {...input}
        />
      </div>
      {problem && (
        <small id={`${id}-error`} className="error">
          {PRICE_ERRORS[problem]}
        </small>
      )}
    </div>
  )
}

/**
 * "Price" in the book panel: saved on leaving the field or Enter, Escape puts
 * back what was saved, emptying it clears the price. A wrong price stays in
 * the field with its error and isn't saved.
 */
export function PanelPriceField({ price, onChange }: { price: number | undefined; onChange: (price: number | undefined) => void }) {
  const [draft, setDraft] = useState(priceField(price))
  const [problem, setProblem] = useState<PriceProblem | null>(null)
  const cancel = useRef(false)

  // the price changed elsewhere (the add dialog, another device): show that one
  useEffect(() => {
    setDraft(priceField(price))
    setProblem(null)
  }, [price])

  const save = () => {
    if (cancel.current) {
      cancel.current = false
      setDraft(priceField(price))
      setProblem(null)
      return
    }
    const parsed = parsePrice(draft)
    if (!parsed.ok) return setProblem(parsed.problem)
    setProblem(null)
    setDraft(priceField(parsed.price))
    if (parsed.price !== price) onChange(parsed.price)
  }

  return (
    <PriceInput
      label="Price"
      problem={problem}
      value={draft}
      enterKeyHint="done"
      onChange={(e) => {
        setDraft(e.target.value)
        setProblem(null)
      }}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          e.stopPropagation()
          cancel.current = true
          e.currentTarget.blur()
        }
      }}
    />
  )
}
