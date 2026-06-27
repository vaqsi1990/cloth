import axios, { AxiosError } from 'axios'
import { randomUUID } from 'crypto'
import { bogTokenManager } from '@/lib/bog-token'

export interface BogPreAuthActionResponse {
  key: string
  message: string
  action_id: string
}

export async function bogApprovePreAuthorization(
  bogOrderId: string,
  options?: { amount?: number; description?: string },
): Promise<BogPreAuthActionResponse> {
  return bogTokenManager.makeAuthenticatedRequest(async (token) => {
    const body: Record<string, string | number> = {}
    if (options?.amount != null) {
      body.amount = options.amount
    }
    if (options?.description) {
      body.description = options.description
    }

    const response = await axios.post<BogPreAuthActionResponse>(
      `https://api.bog.ge/payments/v1/payment/authorization/approve/${bogOrderId}`,
      body,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': randomUUID(),
        },
        timeout: 15000,
      },
    )

    return response.data
  })
}

export async function bogCancelPreAuthorization(
  bogOrderId: string,
  options?: { description?: string },
): Promise<BogPreAuthActionResponse> {
  return bogTokenManager.makeAuthenticatedRequest(async (token) => {
    const body: Record<string, string> = {}
    if (options?.description) {
      body.description = options.description
    }

    const response = await axios.post<BogPreAuthActionResponse>(
      `https://api.bog.ge/payments/v1/payment/authorization/cancel/${bogOrderId}`,
      body,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': randomUUID(),
        },
        timeout: 15000,
      },
    )

    return response.data
  })
}

export function getBogPreAuthErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string }>
    return axiosError.response?.data?.message || axiosError.message || 'BOG API error'
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Unknown error'
}
