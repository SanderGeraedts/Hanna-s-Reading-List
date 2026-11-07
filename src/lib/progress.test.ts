import { describe, expect, it } from 'vitest'
import {
  pageText,
  percentText,
  progressFromPage,
  progressFromPercent,
  progressFromTime,
  timeText,
} from './progress'

describe('typing the progress', () => {
  it('as a percentage', () => {
    expect(progressFromPercent('42')).toBe(0.42)
    expect(progressFromPercent(' 42 % ')).toBe(0.42)
    expect(progressFromPercent('42,5')).toBe(0.425)
    expect(progressFromPercent('150')).toBe(1)
    expect(progressFromPercent('')).toBeNull()
    expect(progressFromPercent('abc')).toBeNull()
    expect(progressFromPercent('-5')).toBeNull()
  })

  it('as a page number', () => {
    expect(progressFromPage('120', 400)).toBe(0.3)
    expect(progressFromPage('500', 400)).toBe(1)
    expect(progressFromPage('12.5', 400)).toBeNull()
    expect(progressFromPage('120', 0)).toBeNull()
  })

  it('as a listening time', () => {
    expect(progressFromTime('5:00', 600)).toBe(0.5)
    expect(progressFromTime('2 h 30 min', 600)).toBe(0.25)
    expect(progressFromTime('soon', 600)).toBeNull()
  })

  it('shows the progress back the same way', () => {
    expect(percentText(0.42)).toBe('42')
    expect(percentText(0.425)).toBe('42.5')
    // a typed page shows as that page again, not rounded through the percentage
    expect(pageText(progressFromPage('123', 400)!, 400)).toBe('123')
    expect(timeText(0.5, 600)).toBe('5 h')
  })
})
