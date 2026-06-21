import Link from 'next/link'
import { CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { expireStaleInquiries } from '@/lib/rental-inquiry'
import { decodeRentalInquiryActionToken } from '@/lib/rental-inquiry-action-token'
import { applyRentalInquirySellerResponse } from '@/lib/rental-inquiry-status'

type PageProps = {
  searchParams: Promise<{ token?: string }>
}

type ActionResult =
  | { type: 'success'; action: 'approve' | 'reject'; productName: string }
  | { type: 'expired' }
  | { type: 'invalid' }
  | { type: 'not_found' }
  | { type: 'already_processed'; currentStatus: string }
  | { type: 'missing_token' }

async function processEmailAction(token: string | undefined): Promise<ActionResult> {
  if (!token?.trim()) {
    return { type: 'missing_token' }
  }

  const decoded = decodeRentalInquiryActionToken(token.trim())
  if (!decoded) {
    return { type: 'invalid' }
  }

  if (decoded.expired) {
    return { type: 'expired' }
  }

  const payload = decoded.payload

  await expireStaleInquiries(prisma)

  const inquiry = await prisma.rentalInquiry.findUnique({
    where: { id: payload.inquiryId },
    select: {
      id: true,
      status: true,
      product: { select: { name: true } },
    },
  })

  if (!inquiry) {
    return { type: 'not_found' }
  }

  if (inquiry.status !== 'PENDING') {
    return { type: 'already_processed', currentStatus: inquiry.status }
  }

  const status = payload.action === 'approve' ? 'APPROVED' : 'REJECTED'
  const result = await applyRentalInquirySellerResponse(
    prisma,
    payload.inquiryId,
    payload.sellerId,
    status,
  )

  if (!result.ok) {
    if (result.code === 'NOT_FOUND') return { type: 'not_found' }
    if (result.code === 'ALREADY_PROCESSED') {
      return { type: 'already_processed', currentStatus: inquiry.status }
    }
    return { type: 'invalid' }
  }

  return {
    type: 'success',
    action: payload.action,
    productName: inquiry.product.name,
  }
}

export default async function RentalInquiryEmailActionPage({ searchParams }: PageProps) {
  const { token } = await searchParams
  const result = await processEmailAction(token)

  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm p-8 text-center">
          {result.type === 'success' && result.action === 'approve' && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-black mb-2">მოთხოვნა დადასტურდა</h1>
              <p className="text-gray-700 mb-2">
                <strong>{result.productName}</strong> — ქირაობის მოთხოვნა წარმატებით დადასტურდა.
              </p>
              <p className="text-gray-600 text-sm mb-6">
                მომხმარებელს გადახდისთვის 30 წუთი აქვს. შეტყობინება ჩატშიც გაიგზავნა.
              </p>
            </>
          )}

          {result.type === 'success' && result.action === 'reject' && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-black mb-2">მოთხოვნა უარყოფილია</h1>
              <p className="text-gray-700 mb-6">
                <strong>{result.productName}</strong> — ქირაობის მოთხოვნა უარყოფილია.
                მომხმარებელს შეტყობინება ჩატში მიეწოდა.
              </p>
            </>
          )}

          {result.type === 'expired' && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
                <Clock className="w-10 h-10 text-amber-600" />
              </div>
              <h1 className="text-2xl font-bold text-black mb-2">ბმული ვადაგასულია</h1>
              <p className="text-gray-700 mb-6">
                ეს ბმული 30 წუთის შემდეგ აღარ მოქმედებს. გთხოვთ შეხვიდეთ საიტზე და მოთხოვნა
                იქ დაადასტუროთ ან უარყოთ.
              </p>
            </>
          )}

          {result.type === 'already_processed' && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <AlertCircle className="w-10 h-10 text-gray-600" />
              </div>
              <h1 className="text-2xl font-bold text-black mb-2">მოთხოვნა უკვე დამუშავებულია</h1>
              <p className="text-gray-700 mb-6">
                ეს მოთხოვნა უკვე განხილულია (სტატუსი: {result.currentStatus}).
              </p>
            </>
          )}

          {(result.type === 'invalid' ||
            result.type === 'not_found' ||
            result.type === 'missing_token') && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-black mb-2">ბმული არასწორია</h1>
              <p className="text-gray-700 mb-6">
                ვერ მოხერხდა მოთხოვნის დამუშავება. გამოიყენეთ ბმული მეილიდან ან შედით საიტზე.
              </p>
            </>
          )}

          <Link
            href="/account/inquiries"
            className="inline-block bg-[#1B3729] text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            მოთხოვნების ნახვა
          </Link>
        </div>
      </div>
    </div>
  )
}
