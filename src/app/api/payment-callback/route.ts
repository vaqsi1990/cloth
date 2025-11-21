import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recordSellerTransactions } from '@/utils/sellerTransactions'
import crypto from 'crypto'

// BOG Public Key for signature verification
const BOG_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu4RUyAw3+CdkS3ZNILQh
zHI9Hemo+vKB9U2BSabppkKjzjjkf+0Sm76hSMiu/HFtYhqWOESryoCDJoqffY0Q
1VNt25aTxbj068QNUtnxQ7KQVLA+pG0smf+EBWlS1vBEAFbIas9d8c9b9sSEkTrr
TYQ90WIM8bGB6S/KLVoT1a7SnzabjoLc5Qf/SLDG5fu8dH8zckyeYKdRKSBJKvhx
tcBuHV4f7qsynQT+f2UYbESX/TLHwT5qFWZDHZ0YUOUIvb8n7JujVSGZO9/+ll/g
4ZIWhC1MlJgPObDwRkRd8NFOopgxMcMsDIZIoLbWKhHVq67hdbwpAq9K9WMmEhPn
PwIDAQAB
-----END PUBLIC KEY-----`

interface SplitPayment {
  amount?: number | null
  percent?: number
  description?: string
  iban: string
  status: 'processing' | 'completed' | 'rejected'
  reject_reason?: string
}

interface SplitObject {
  split_status: 'processing' | 'completed' | 'rejected'
  currency: string
  request_channel?: string
  split_reject_reason?: string
  split_payments: SplitPayment[]
}

interface CallbackBody {
  event: string
  zoned_request_time: string
  body: {
    order_id: string
    industry: string
    order_status?: {
      key: string
      value: string
    }
    status?: string
    payment_status?: string
    split?: SplitObject
    [key: string]: unknown
  }
}

/**
 * Verify the callback signature using RSA SHA256
 */
function verifySignature(
  signature: string,
  body: string,
  publicKey: string
): boolean {
  try {
    const verify = crypto.createVerify('SHA256')
    verify.update(body, 'utf8')
    verify.end()
    
    // Decode base64 signature
    const signatureBuffer = Buffer.from(signature, 'base64')
    
    return verify.verify(publicKey, signatureBuffer)
  } catch (error) {
    console.error('Error verifying signature:', error)
    return false
  }
}

/**
 * Update order status based on payment status
 * Maps BOG order_status.key values to our OrderStatus enum
 */
async function updateOrderStatus(orderId: string, paymentStatus: string) {
  try {
    // Map BOG order_status.key to our OrderStatus enum
    // BOG statuses: created, processing, completed, rejected, refund_requested, 
    // refunded, refunded_partially, auth_requested, blocked, partial_completed
    let orderStatus: 'PENDING' | 'PAID' | 'CANCELED' | 'REFUNDED' = 'PENDING'
    
    const statusLower = paymentStatus.toLowerCase()
    
    if (statusLower === 'completed' || statusLower === 'partial_completed') {
      orderStatus = 'PAID'
    } else if (statusLower === 'rejected' || statusLower === 'blocked') {
      orderStatus = 'CANCELED'
    } else if (statusLower === 'refunded' || statusLower === 'refunded_partially') {
      orderStatus = 'REFUNDED'
    } else if (statusLower === 'created' || statusLower === 'processing' || statusLower === 'auth_requested' || statusLower === 'refund_requested') {
      // Keep as PENDING for these statuses
      orderStatus = 'PENDING'
    }

    // Find order by paymentId (BOG order_id)
    const order = await prisma.order.findFirst({
      where: {
        paymentId: orderId
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                userId: true
              }
            }
          }
        }
      }
    })

    if (!order) {
      console.error(`Order not found with paymentId: ${orderId}`)
      return false
    }

    // Update order status
    await prisma.order.update({
      where: { id: order.id },
      data: { status: orderStatus }
    })

    // If order is PAID, create seller transactions
    if (orderStatus === 'PAID') {
      await recordSellerTransactions(order.id)
    }

    console.log(`Order ${order.id} status updated to ${orderStatus} based on payment ${orderId}`)
    return true
  } catch (error) {
    console.error('Error updating order status:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the raw body text BEFORE parsing JSON
    // This is critical for signature verification
    const rawBody = await request.text()
    
    // Get signature from header
    const signature = request.headers.get('Callback-Signature')
    
    if (!signature) {
      console.error('Missing Callback-Signature header')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      )
    }

    // Verify signature BEFORE parsing JSON
    const isValid = verifySignature(signature, rawBody, BOG_PUBLIC_KEY)
    
    if (!isValid) {
      console.error('Invalid signature verification')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Now parse the JSON body
    const callbackData: CallbackBody = JSON.parse(rawBody)

    // Validate callback structure - support both order_payment and split_payment events
    if (callbackData.event !== 'order_payment' && callbackData.event !== 'split_payment') {
      console.error(`Unexpected event type: ${callbackData.event}`)
      return NextResponse.json(
        { error: 'Invalid event type' },
        { status: 400 }
      )
    }

    if (!callbackData.body || !callbackData.body.order_id) {
      console.error('Missing order_id in callback body')
      return NextResponse.json(
        { error: 'Missing order_id' },
        { status: 400 }
      )
    }

    const { order_id, order_status, split } = callbackData.body
    
    // Handle split_payment event
    if (callbackData.event === 'split_payment') {
      console.log('💰 Split Payment Callback received:')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(`Order ID: ${order_id}`)
      
      if (split) {
        console.log(`Split Status: ${split.split_status}`)
        console.log(`Currency: ${split.currency}`)
        console.log(`Request Channel: ${split.request_channel || 'N/A'}`)
        
        if (split.split_status === 'rejected') {
          console.error(`❌ Split payment rejected: ${split.split_reject_reason || 'Unknown reason'}`)
        }
        
        console.log('Split Payments:')
        split.split_payments.forEach((payment, index) => {
          console.log(`  ${index + 1}. ${payment.description || 'Payment'}:`)
          console.log(`     IBAN: ${payment.iban.substring(0, 8)}...`)
          console.log(`     Amount: ${payment.amount || 'N/A'}, Percent: ${payment.percent || 'N/A'}%`)
          console.log(`     Status: ${payment.status}`)
          if (payment.status === 'rejected' && payment.reject_reason) {
            console.error(`     ❌ Rejected: ${payment.reject_reason}`)
          }
        })
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      }
      
      // Always return 200 to acknowledge receipt
      return NextResponse.json(
        { 
          success: true,
          message: 'Split payment callback received and processed',
          order_id,
          split_status: split?.split_status
        },
        { status: 200 }
      )
    }
    
    // Handle order_payment event (existing logic)
    // Extract order_status.key from callback body
    // The callback body contains the same structure as the payment details API response
    const finalPaymentStatus = order_status?.key || callbackData.body.status || 'UNKNOWN'
    
    console.log(`💳 Payment callback received for order ${order_id} with status: ${finalPaymentStatus}`)
    console.log(`Callback time: ${callbackData.zoned_request_time}`)
    
    // Log split info if present in order_payment callback
    if (split) {
      console.log(`Split Status: ${split.split_status}`)
      if (split.split_status === 'processing') {
        console.log('⏳ Split payment is still processing...')
      } else if (split.split_status === 'completed') {
        console.log('✅ Split payment completed successfully!')
      } else if (split.split_status === 'rejected') {
        console.error(`❌ Split payment rejected: ${split.split_reject_reason || 'Unknown reason'}`)
      }
    }

    // Update order status in database
    const updateSuccess = await updateOrderStatus(order_id, finalPaymentStatus)
    
    if (!updateSuccess) {
      // Still return 200 to acknowledge receipt, but log the error
      console.error(`Failed to update order status for payment ${order_id}`)
    }

    // Always return 200 to confirm successful receipt of callback
    // This is critical - BOG will retry if we don't return 200
    return NextResponse.json(
      { 
        success: true,
        message: 'Callback received and processed',
        order_id,
        status: finalPaymentStatus,
        split_status: split?.split_status
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error processing payment callback:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    // Even on error, we should return 200 if signature was valid
    // to prevent BOG from retrying. Log the error for investigation.
    return NextResponse.json(
      { 
        success: false,
        error: 'Error processing callback',
        message: errorMessage 
      },
      { status: 200 } // Still return 200 to acknowledge receipt
    )
  }
}

