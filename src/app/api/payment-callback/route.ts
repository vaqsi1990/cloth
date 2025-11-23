import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recordSellerTransactions } from '@/utils/sellerTransactions'
import crypto from 'crypto'

const BOG_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu4RUyAw3+CdkS3ZNILQh
zHI9Hemo+vKB9U2BSabppkKjzjjkf+0Sm76hSMiu/HFtYhqWOESryoCDJoqffY0Q
1VNt25aTxbj068QNUtnxQ7KQVLA+pG0smf+EBWlS1vBEAFbIas9d8c9b9sSEkTrr
TYQ90WIM8bGB6S/KLVoT1a7SnzabjoLc5Qf/SLDG5fu8dH8zckyeYKdRKSBJKvhx
tcBuHV4f7qsynQT+f2UYbESX/TLHwT5qFWZDHZ0YUOUIvb8n7JujVSGZO9/+ll/g
4ZIWhC1MlJgPObDwRkRd8NFOopgxMcMsDIZIoLbWKhHVq67hdbwpAq9K9WMmEhPn
PwIDAQAB
-----END PUBLIC KEY-----`

function verifySignature(signature: string, body: string, publicKey: string) {
  try {
    const verify = crypto.createVerify("SHA256")
    verify.update(body)
    verify.end()
    return verify.verify(publicKey, Buffer.from(signature, "base64"))
  } catch {
    return false
  }
}

async function updateOrderStatus(paymentId: string, status: string) {
  const lower = status.toLowerCase()

  let final: "PENDING" | "PAID" | "CANCELED" | "REFUNDED" = "PENDING"

  if (lower === "completed" || lower === "partial_completed") final = "PAID"
  else if (lower === "rejected" || lower === "blocked") final = "CANCELED"
  else if (lower === "refunded" || lower === "refunded_partially") final = "REFUNDED"

  const order = await prisma.order.findFirst({
    where: { paymentId }
  })

  if (!order) return false

  await prisma.order.update({
    where: { id: order.id },
    data: { status: final }
  })

  if (final === "PAID") {
    await recordSellerTransactions(order.id)
  }

  return true
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text()

    const sig = req.headers.get("Callback-Signature")
    if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 })

    const valid = verifySignature(sig, raw, BOG_PUBLIC_KEY)
    if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 401 })

    const data = JSON.parse(raw)

    const event = data.event
    const body = data.body

    if (!body?.order_id) {
      return NextResponse.json({ error: "Missing order_id" }, { status: 400 })
    }

    const orderId = body.order_id

    if (event === "split_payment") {
      console.log("SPLIT CALLBACK RECEIVED:", body.split)
      return NextResponse.json({ success: true }, { status: 200 })
    }

    if (event === "order_payment") {
      const status = body.order_status?.key || body.status || "UNKNOWN"
      await updateOrderStatus(orderId, status)

      if (body.split) {
        console.log("ORDER PAYMENT SPLIT INFO:", body.split)
      }

      return NextResponse.json({ success: true }, { status: 200 })
    }

    return NextResponse.json({ error: "Unknown event" }, { status: 400 })

  } catch (e) {
    console.error("Callback error", e)
    return NextResponse.json({ success: false }, { status: 200 })
  }
}
