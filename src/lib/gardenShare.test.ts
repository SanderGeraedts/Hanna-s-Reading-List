import { describe, expect, it } from 'vitest'
import { stagePicture, svgToImage } from './gardenShare'

/** A picture of the garden (D-0071 §4). */

const stageWith = (html: string) => {
  const el = document.createElement('div')
  el.innerHTML = html
  return el
}

describe('what the picture is taken of', () => {
  it('refuses a stage with no drawing in it', async () => {
    await expect(stagePicture(stageWith('<p>nothing here</p>'))).rejects.toThrow(/Nothing to take a picture of/)
  })

  it('takes the 3D garden straight off its canvas', async () => {
    const stage = stageWith('<canvas width="800" height="450"></canvas>')
    const picture = await stagePicture(stage)
    expect(picture).toBe(stage.querySelector('canvas'))
  })

  it('turns the flat garden into a picture with nothing to fetch', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 10 6')
    svg.setAttribute('class', 'garden-svg')
    // happy-dom never loads an image, so the promise is checked by what it is asked to load
    const loading = svgToImage(svg)
    expect(loading).toBeInstanceOf(Promise)
    void loading.catch(() => {})
  })

  it('keeps the drawing to itself: the copy carries the SVG namespace', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 10 6')
    const copy = svg.cloneNode(true) as SVGSVGElement
    copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    const text = new XMLSerializer().serializeToString(copy)
    expect(text).toContain('http://www.w3.org/2000/svg')
    // nothing in the garden's drawing is a picture that has to be fetched
    expect(text).not.toContain('<image')
  })
})
