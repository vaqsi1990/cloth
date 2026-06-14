'use client'

import { useEffect, useRef } from 'react'
import {
  PRODUCT_STATUS_UPDATED_EVENT,
  type ProductStatusUpdateDetail,
} from '@/lib/product-status-sync'

export function useProductStatusSync(
  productId: string | number | undefined,
  onUpdate: (detail: ProductStatusUpdateDetail) => void,
) {
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  useEffect(() => {
    if (productId == null || productId === '') return

    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<ProductStatusUpdateDetail>
      if (String(customEvent.detail.productId) !== String(productId)) return
      onUpdateRef.current(customEvent.detail)
    }

    window.addEventListener(PRODUCT_STATUS_UPDATED_EVENT, handler)
    return () => window.removeEventListener(PRODUCT_STATUS_UPDATED_EVENT, handler)
  }, [productId])
}
