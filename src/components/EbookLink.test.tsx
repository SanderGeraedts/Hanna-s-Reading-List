import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { EBOOK_REFUSED, EbookButton, EbookLinkField } from './EbookLink'

afterEach(cleanup)

const LINK = 'https://example.com/book.epub'

/** the field and the button together, the way the book panel uses them */
function Panel({ initial, saves }: { initial?: string; saves: Array<string | undefined> }) {
  const [link, setLink] = useState(initial)
  return (
    <>
      <EbookButton link={link} />
      <EbookLinkField
        link={link}
        onChange={(l) => {
          saves.push(l)
          setLink(l)
        }}
      />
    </>
  )
}

const openButton = () => screen.queryByRole('link', { name: /Open e-book/ })
const field = () => screen.getByLabelText('E-book link') as HTMLInputElement

describe('the open button', () => {
  it('shows nothing without a link', () => {
    const { container } = render(<EbookButton link={undefined} />)
    expect(container.innerHTML).toBe('')
  })

  it('opens an http(s) link in a new tab, safely, with the host in its name', () => {
    render(<EbookButton link="https://drive.google.com/file/d/abc/view" />)
    const a = openButton()!
    expect(a.textContent).toBe('📖 Open e-book')
    expect(a.getAttribute('href')).toBe('https://drive.google.com/file/d/abc/view')
    expect(a.getAttribute('target')).toBe('_blank')
    expect(a.getAttribute('rel')).toBe('noopener noreferrer')
    expect(a.getAttribute('title')).toBe('Open e-book (drive.google.com, opens in a new tab)')
    expect(a.getAttribute('aria-label')).toBe('Open e-book (drive.google.com, opens in a new tab)')
  })

  it('never renders a javascript:, data: or file: link, even when one was stored', () => {
    for (const link of ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'file:///C:/x.epub']) {
      const { container, unmount } = render(<EbookButton link={link} />)
      expect(container.querySelector('a')).toBeNull()
      unmount()
    }
  })
})

describe('the e-book link field', () => {
  it('shows only "+ Add e-book link" for a book without a link', () => {
    render(<Panel saves={[]} />)
    expect(screen.getByRole('button', { name: '+ Add e-book link' })).toBeTruthy()
    expect(screen.queryByLabelText('E-book link')).toBeNull()
    expect(openButton()).toBeNull()
  })

  it('adds a link on Enter, shows the open button, and removes it with the ×', () => {
    const saves: Array<string | undefined> = []
    render(<Panel saves={saves} />)
    fireEvent.click(screen.getByRole('button', { name: '+ Add e-book link' }))
    expect(document.activeElement).toBe(field())
    expect(field().type).toBe('url')
    expect(screen.getByText('Where the file is, e.g. on Google Drive or your server.')).toBeTruthy()
    fireEvent.change(field(), { target: { value: `  ${LINK}  ` } })
    fireEvent.keyDown(field(), { key: 'Enter' })
    fireEvent.blur(field())
    expect(saves).toEqual([LINK])
    expect(field().value).toBe(LINK)
    expect(openButton()!.getAttribute('href')).toBe(LINK)

    fireEvent.click(screen.getByRole('button', { name: 'Remove e-book link' }))
    expect(saves).toEqual([LINK, undefined])
    expect(openButton()).toBeNull()
    const add = screen.getByRole('button', { name: '+ Add e-book link' })
    expect(document.activeElement).toBe(add)
  })

  it('refuses a javascript: link: it stays in the field, isn\'t saved, and the button keeps the last good link', () => {
    const saves: Array<string | undefined> = []
    render(<Panel initial={LINK} saves={saves} />)
    fireEvent.change(field(), { target: { value: 'javascript:alert(1)' } })
    fireEvent.blur(field())
    expect(saves).toEqual([])
    expect(field().value).toBe('javascript:alert(1)')
    expect(field().getAttribute('aria-invalid')).toBe('true')
    const hint = document.getElementById(field().getAttribute('aria-describedby')!)!
    expect(hint.textContent).toBe(EBOOK_REFUSED)
    expect(EBOOK_REFUSED).toBe('Only links that start with https:// or http:// can be opened here.')
    expect(openButton()!.getAttribute('href')).toBe(LINK)
    // typing again puts the hint back
    fireEvent.change(field(), { target: { value: 'https://' } })
    expect(hint.textContent).toBe('Where the file is, e.g. on Google Drive or your server.')
    expect(field().getAttribute('aria-invalid')).toBe('false')
  })

  it('shows no button for a refused link on a book without one', () => {
    const saves: Array<string | undefined> = []
    render(<Panel saves={saves} />)
    fireEvent.click(screen.getByRole('button', { name: '+ Add e-book link' }))
    fireEvent.change(field(), { target: { value: 'data:text/html,x' } })
    fireEvent.blur(field())
    expect(saves).toEqual([])
    expect(openButton()).toBeNull()
  })

  it('removes the link when the field is left empty, and changes nothing when opened and left empty', () => {
    const saves: Array<string | undefined> = []
    const { unmount } = render(<Panel initial={LINK} saves={saves} />)
    fireEvent.change(field(), { target: { value: '   ' } })
    fireEvent.blur(field())
    expect(saves).toEqual([undefined])
    expect(screen.getByRole('button', { name: '+ Add e-book link' })).toBeTruthy()
    unmount()

    const none: Array<string | undefined> = []
    render(<Panel saves={none} />)
    fireEvent.click(screen.getByRole('button', { name: '+ Add e-book link' }))
    fireEvent.blur(field())
    expect(none).toEqual([])
    expect(screen.getByRole('button', { name: '+ Add e-book link' })).toBeTruthy()
  })

  it('puts back what was there on Escape', () => {
    const saves: Array<string | undefined> = []
    render(<Panel initial={LINK} saves={saves} />)
    act(() => field().focus())
    fireEvent.change(field(), { target: { value: 'https://other.example/x' } })
    fireEvent.keyDown(field(), { key: 'Escape' })
    expect(saves).toEqual([])
    expect(field().value).toBe(LINK)
  })
})
