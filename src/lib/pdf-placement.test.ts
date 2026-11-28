import { describe, expect, it } from 'vitest'
import { clampPlacement, getSignatureHeightRatio, toPdfImageRect } from './pdf-placement'

describe('PDF signature placement geometry', () => {
  it('maps an unrotated page preview back into PDF coordinates', () => {
    const viewport = { width: 600, height: 800, transform: [1, 0, 0, -1, 0, 800] }
    expect(toPdfImageRect({ x: 0.5, y: 0.25, width: 0.2 }, viewport, 2)).toEqual({
      x: 300, y: 540, width: 120, height: 60,
    })
  })
  it('maps a rotated page preview back into PDF coordinates', () => {
    const viewport = { width: 800, height: 600, transform: [0, 1, 1, 0, 0, 0] }
    expect(toPdfImageRect({ x: 0.5, y: 0.25, width: 0.2 }, viewport, 2)).toEqual({
      x: 150, y: 400, width: 80, height: 160,
    })
  })
  it('keeps a dragged signature inside the page bounds', () => {
    const result = clampPlacement({ x: 0.95, y: 0.95, width: 0.3 }, 0.75, 2)
    expect(result.x).toBeCloseTo(0.7)
    expect(result.y).toBeCloseTo(0.8875)
    expect(result.width).toBe(0.3)
  })
  it('calculates normalized signature height from both aspect ratios', () => {
    expect(getSignatureHeightRatio(0.25, 0.75, 2)).toBeCloseTo(0.09375)
  })
})
