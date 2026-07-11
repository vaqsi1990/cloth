import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { buildSplitPaymentConfigForOrder, describeSplitPayments, getOrderSplitReadinessMessage } from '../src/lib/bog-split-config'
import { isPaymentHoldSplitOnApproveEnabled } from '../src/lib/payment-hold-config'
import { describeBogReceiptSplit, fetchBogPaymentReceipt } from '../src/lib/bog-preauth'

const orderId = parseInt(process.argv[2] || '59', 10)
const prisma = new PrismaClient()

async function main() {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        select: {
          productId: true,
          sellerUserId: true,
          price: true,
          quantity: true,
          isRental: true,
        },
      },
    },
  })

  if (!order) {
    console.log(JSON.stringify({ error: 'Order not found', orderId }))
    process.exit(1)
  }

  const splitConfig = await buildSplitPaymentConfigForOrder(order)
  const readinessError = getOrderSplitReadinessMessage(order, splitConfig)

  let bogReceiptSplit = null
  if (order.paymentId) {
    try {
      const receipt = await fetchBogPaymentReceipt(order.paymentId)
      bogReceiptSplit = describeBogReceiptSplit(receipt)
    } catch (error) {
      bogReceiptSplit = {
        applied: false,
        reason: error instanceof Error ? error.message : String(error),
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        orderId: order.id,
        total: order.total,
        status: order.status,
        paymentHoldStatus: order.paymentHoldStatus,
        paymentCaptureMode: order.paymentCaptureMode,
        paymentId: order.paymentId,
        paymentMethod: order.paymentMethod,
        deliveryPrice: order.deliveryPrice,
        itemCount: order.items.length,
        sellerUserIds: order.items.map((item) => item.sellerUserId).filter(Boolean),
        splitOnApproveEnabled: isPaymentHoldSplitOnApproveEnabled(),
        merchantIbanConfigured: !!process.env.BOG_MERCHANT_IBAN,
        readinessError,
        splitReadyForApprove: !readinessError,
        splitPreview: describeSplitPayments(splitConfig),
        bogReceiptSplit,
        nextStep:
          order.paymentHoldStatus === 'BLOCKED'
            ? 'Click გადახდის დადასტურება in admin — split will be sent on approve if splitReadyForApprove is true'
            : order.paymentHoldStatus === 'CAPTURED'
              ? 'Already approved — check bogReceiptSplit.applied'
              : 'Order is not in BLOCKED hold state',
      },
      null,
      2,
    ),
  )

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
