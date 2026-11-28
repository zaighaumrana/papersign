import { describe, expect, it } from 'vitest'
import { clampPlacement, getSignatureHeightRatio, toPdfImageRect } from './pdf-placement'

describe('PDF signature placement geometry', () => {
  it('converts normalized top-left coordinates to PDF bottom-left coordinates', () => {
    expect(toPdfImageRect({ x: 0.5, y: 0.25, width: 0.2 }, 600, 800, 2)).toEqual({
      x: 300, y: 620, width: 120, height: 60,
    })
  })
  it('keeps a dragged signature inside the page bounds', () => {
    const result = clampPlacement({ x: 0.95, y: 0.95, width: 0.3 }, 0.75, 2)
    expect(result.x).toBeCloseTo(0.7)
    expect(result.y).toBeCloseTo(0.8875)
    expect(result.width).toBe(0.3)
  })
  it('calculates the normalized signature height from both aspect ratios', () => {
    expect(getSignatureHeightRatio(0.25, 0.75, 2)).toBeCloseTo(0.09375)
  })
})
