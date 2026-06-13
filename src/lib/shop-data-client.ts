import type { ShopDataResponse } from '@/types/shop-data'

export const SHOP_API_PATH = '/api/shop'
export const SHOP_FETCH_DEBOUNCE_MS = 200

/** Single entry point for shop data — one HTTP request per invocation. */
export async function fetchShopData(
  queryKey: string,
  signal?: AbortSignal,
): Promise<ShopDataResponse> {
  const url = `${SHOP_API_PATH}?${queryKey}`
  const t0 = performance.now()
  const response = await fetch(url, { signal })
  const data = (await response.json()) as ShopDataResponse

  if (process.env.NODE_ENV === 'development') {
    console.log('[fetchShopData] /api/shop', {
      ok: response.ok,
      totalMs: Math.round(performance.now() - t0),
      serverTiming: response.headers.get('server-timing'),
      timings: data.timings ?? null,
    })
  }

  if (!response.ok || !data.success) {
    throw new Error(data.message ?? 'Shop data request failed')
  }

  return data
}

/** Strip pagination param to detect filter-only changes (for debounce). */
export function getShopFilterKey(queryKey: string): string {
  const params = new URLSearchParams(queryKey)
  params.delete('page')
  return params.toString()
}
