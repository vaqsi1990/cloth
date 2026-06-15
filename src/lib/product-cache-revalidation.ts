import { revalidatePath } from 'next/cache'
import { revalidateProductListCache } from '@/lib/product-list-query'

/** Invalidate list + page caches after product status (or other) changes. */
export function revalidateProductCaches(
  productId: number,
  options?: { authorId?: string | null },
): void {
  revalidateProductListCache()

  revalidatePath(`/product/${productId}`, 'page')
  revalidatePath('/shop', 'page')
  revalidatePath('/', 'page')
  revalidatePath('/admin/products', 'page')
  revalidatePath('/support/products', 'page')
  revalidatePath('/account', 'page')

  if (options?.authorId) {
    revalidatePath(`/author/${options.authorId}`, 'page')
  }
}
