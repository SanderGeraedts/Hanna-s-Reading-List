import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { PanelPriceField } from './PriceField'

afterEach(cleanup)

/** the panel's Price field with a saved price, the way BookPanel uses it (tester, T-0016) */
function setup(initial: number | undefined) {
  const state = { price: initial, saves: 0 }
  function Harness() {
    const [price, setPrice] = useState(initial)
    return (
      <PanelPriceField
        price={price}
        onChange={(p) => {
          state.price = p
          state.saves++
          setPrice(p)
        }}
      />
    )
  }
  render(<Harness />)
  const input = screen.getByLabelText('Price') as HTMLInputElement
  return { state, input }
}

describe('Price in the book panel (T-0016)', () => {
  it('shows a saved price with two decimals and the decimal pad', () => {
    const { input } = setup(12.5)
    expect(input.value).toBe('12.50')
    expect(input.inputMode).toBe('decimal')
  })

  it('an old book without a price shows an empty field', () => {
    expect(setup(undefined).input.value).toBe('')
  })

  it('saves on leaving the field, with a comma', () => {
    const { state, input } = setup(12.5)
    fireEvent.change(input, { target: { value: '9,95' } })
    fireEvent.blur(input)
    expect(state.price).toBe(9.95)
    expect(input.value).toBe('9.95')
  })

  it('emptying the field clears the price', () => {
    const { state, input } = setup(12.5)
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)
    expect(state.price).toBeUndefined()
    expect(state.saves).toBe(1)
  })

  it('Escape puts the saved price back', () => {
    const { state, input } = setup(12.5)
    input.focus()
    fireEvent.change(input, { target: { value: '99' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    fireEvent.blur(input)
    expect(state.saves).toBe(0)
    expect(input.value).toBe('12.50')
  })

  it('a wrong price shows its error and is not saved', () => {
    const { state, input } = setup(12.5)
    for (const [bad, error] of [
      ['-5', 'Try 12.50 or 12,50.'],
      ['7.999', 'Try 12.50 or 12,50.'],
      ['10000', 'That’s more than €9,999.99.'],
    ]) {
      fireEvent.change(input, { target: { value: bad } })
      fireEvent.blur(input)
      expect(screen.getByText(error)).toBeTruthy()
      expect(input.getAttribute('aria-invalid')).toBe('true')
    }
    expect(state.saves).toBe(0)
    expect(state.price).toBe(12.5)
  })

  it('leaving an unchanged field saves nothing', () => {
    const { state, input } = setup(12.5)
    fireEvent.blur(input)
    expect(state.saves).toBe(0)
  })
})
