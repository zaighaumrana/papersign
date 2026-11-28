export type SignaturePlacement = { x: number; y: number; width: number }

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

export function toPdfImageRect(placement: SignaturePlacement, pageWidth: number, pageHeight: number, imageAspectRatio: number) {
  const width = placement.width * pageWidth
  const height = width / imageAspectRatio
  return { x: placement.x * pageWidth, y: pageHeight - (placement.y * pageHeight) - height, width, height }
}
