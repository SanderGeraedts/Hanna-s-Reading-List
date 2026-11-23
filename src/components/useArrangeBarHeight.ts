import { useEffect, useState } from 'react'

/**
 * The sticky Arrange bar's height in CSS px, set as --arrange-h on the page's .dashboard and kept
 * up to date as it changes (the "Hidden:" chips wrap onto more rows). styles.css adds it to the
 * dashboard's scroll-padding-top while arranging, so a focused block never hides under the bar
 * (T-0035, WCAG 2.4.11). Pass the returned function as the bar's ref.
 */
export function useArrangeBarHeight() {
  const [el, setEl] = useState<HTMLElement | null>(null)
  useEffect(() => {
    const host = el?.closest<HTMLElement>('.dashboard')
    if (!el || !host) return
    const measure = () => host.style.setProperty('--arrange-h', `${Math.round(el.getBoundingClientRect().height)}px`)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => {
      ro.disconnect()
      host.style.removeProperty('--arrange-h')
    }
  }, [el])
  return setEl
}
