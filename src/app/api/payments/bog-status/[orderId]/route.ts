import { NextRequest, NextResponse } from 'next/server'
import { bogTokenManager } from '@/lib/bog-token'
import axios, { AxiosError } from 'axios'

/**
 * GET - Fetch BOG payment details by order_id
 * 
 * This endpoint retrieves detailed payment information from BOG payment system
 * using the order_id (BOG payment identifier).
 * 
 * @param request - Next.js request object
 * @param params - Route parameters containing orderId
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params

    if (!orderId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Order ID is required' 
        },
        { status: 400 }
      )
    }

    console.log(`🔍 Fetching BOG payment status for order: ${orderId}`)

    // Use the token manager to make authenticated request
    const paymentDetails = await bogTokenManager.makeAuthenticatedRequest(
      async (token: string) => {
        const response = await axios.get(
          `https://api.bog.ge/payments/v1/receipt/${orderId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          }
        )

        return response.data
      }
    )

    console.log(`✅ Successfully retrieved payment details for order: ${orderId}`)
    console.log(`Payment status: ${paymentDetails.order_status?.key || 'unknown'}`)

    return NextResponse.json({
      success: true,
      data: paymentDetails,
    })

  } catch (error) {
    console.error('❌ Error fetching BOG payment status:', error)

    const axiosError = error as AxiosError<{ message?: string; error?: string }>

    // Handle specific error cases
    if (axiosError.response?.status === 404) {
      const url = axiosError.config?.url || ''
      return NextResponse.json(
        {
          success: false,
          error: 'Payment not found',
          message: `No payment found with order_id: ${url.split('/').pop()}`,
        },
        { status: 404 }
      )
    }

    if (axiosError.response?.status === 401) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication failed',
          message: 'Invalid or expired BOG token',
        },
        { status: 401 }
      )
    }

    if (axiosError.response?.data) {
      const errorData = axiosError.response.data
      return NextResponse.json(
        {
          success: false,
          error: 'BOG API error',
          message: errorData.message || errorData.error || 'Unknown error',
          details: errorData,
        },
        { status: axiosError.response.status || 500 }
      )
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch payment status',
        message: errorMessage,
      },
      { status: 500 }
    )
  }
}

