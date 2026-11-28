export type SignaturePlacement = { x: number; y: number; width: number }
export type PdfViewportGeometry = { width: number; height: number; transform: number[] }

export function getSignatureHeightRatio(width: number, pageAspectRatio: number, imageAspectRatio: number) {
  if (pageAspectRatio <= 0 || imageAspectRatio <= 0) return 0
  return (width * pageAspectRatio) / imageAspectRatio
}

export function clampPlacement<T extends SignaturePlacement>(placement: T, pageAspectRatio: number, imageAspectRatio: number): T {
  const width = Math.min(0.7, Math.max(0.06, placement.width))
  const height = getSignatureHeightRatio(width, pageAspectRatio, imageAspectRatio)
  return {
    ...placement,
    width,
    x: Math.min(Math.max(0, placement.x), Math.max(0, 1 - width)),
    y: Math.min(Math.max(0, placement.y), Math.max(0, 1 - height)),
  }
}

/** Converts normalized top-left preview coordinates back into PDF user space.
 * Using the PDF.js viewport inverse transform also handles rotated PDF pages.
 */
export function toPdfImageRect(placement: SignaturePlacement, viewport: PdfViewportGeometry, imageAspectRatio: number) {
  const width = placement.width * viewport.width
  const height = width / imageAspectRatio
  const left = placement.x * viewport.width
  const top = placement.y * viewport.height
  const [a, b, c, d, e, f] = viewport.transform
  const determinant = a * d - b * c
  if (!determinant) throw new Error('The PDF page has an invalid coordinate transform.')
  const inverse = [
    d / determinant, -b / determinant, -c / determinant, a / determinant,
    (c * f - d * e) / determinant, (b * e - a * f) / determinant,
  ]
  const mapPoint = (x: number, y: number) => ({
    x: inverse[0] * x + inverse[2] * y + inverse[4],
    y: inverse[1] * x + inverse[3] * y + inverse[5],
  })
  const corners = [
    mapPoint(left, top), mapPoint(left + width, top),
    mapPoint(left, top + height), mapPoint(left + width, top + height),
  ]
  const xs = corners.map((point) => point.x)
  const ys = corners.map((point) => point.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}
