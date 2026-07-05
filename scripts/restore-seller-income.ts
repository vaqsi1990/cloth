import {
  restoreAllMissingSellerSaleTransactions,
  restorePaidStatusForItemCanceledOrders,
} from '../src/lib/restore-seller-sale-transactions'

async function main() {
  const restoredOrders = await restorePaidStatusForItemCanceledOrders()
  console.log(`Restored PAID status on ${restoredOrders.length} orders:`, restoredOrders)

  const results = await restoreAllMissingSellerSaleTransactions()
  const created = results.reduce((sum, row) => sum + row.created, 0)
  const skipped = results.reduce((sum, row) => sum + row.skipped, 0)

  console.log(`Restored seller SALE transactions: created=${created}, skipped=${skipped}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
