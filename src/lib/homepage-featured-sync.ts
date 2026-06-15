export const HOMEPAGE_FEATURED_UPDATED_EVENT = 'dressla:homepage-featured-updated'

export type HomepageFeaturedUpdateDetail = {
  productId: number
}

export function broadcastHomepageFeaturedUpdate(
  detail: HomepageFeaturedUpdateDetail,
): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(HOMEPAGE_FEATURED_UPDATED_EVENT, { detail }),
  )
}
