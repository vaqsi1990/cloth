export function getProductThumbnailUrl(product: {
  images?: Array<{ url?: string | null }> | null
  variants?: Array<{ imageUrl?: string | null }> | null
}): string {
  const productImage = product.images
    ?.map((image) => image.url?.trim())
    .find(Boolean)

  if (productImage) {
    return productImage
  }

  const variantImage = product.variants
    ?.map((variant) => variant.imageUrl?.trim())
    .find(Boolean)

  if (variantImage) {
    return variantImage
  }

  return '/placeholder.jpg'
}
