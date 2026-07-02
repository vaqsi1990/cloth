import axios, { AxiosError } from 'axios'
import { randomUUID } from 'crypto'
import { bogTokenManager } from '@/lib/bog-token'
import type { BogSplitConfig } from '@/lib/bog-split-config'

export interface BogPreAuthActionResponse {
  key: string
  message: string
  action_id: string
}

export async function bogApprovePreAuthorization(
  bogOrderId: string,
  options?: {
    amount?: number
    description?: string
    split?: BogSplitConfig
  },
): Promise<BogPreAuthActionResponse> {
  return bogTokenManager.makeAuthenticatedRequest(async (token) => {
    const body: Record<string, unknown> = {}
    if (options?.amount != null) {
      body.amount = Number(options.amount.toFixed(2))
    }
    if (options?.description) {
      body.description = options.description
    }
    if (options?.split?.split_payments?.length) {
      body.split = options.split
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

type BogApiErrorBody = {
  message?: string
  key?: string
}

export function isBogPreAuthAlreadyRequestedError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  const axiosError = error as AxiosError<BogApiErrorBody>
  const message = axiosError.response?.data?.message?.toLowerCase() ?? ''
  return (
    axiosError.response?.status === 400 &&
    message.includes('already requested')
  )
}

export function isBogAuthorizeRejectedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  const normalized = message.toLowerCase()
  return normalized.includes('179') || normalized.includes('unknown response')
}

export function getBogPreAuthErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<BogApiErrorBody>
    const bogMessage = axiosError.response?.data?.message
    if (bogMessage) {
      if (isBogPreAuthAlreadyRequestedError(error)) {
        return 'BOG უკვე ამუშავებს მოთხოვნას. დაელოდეთ რამდენიმე წამს და სცადეთ თავიდან.'
      }
      return `BOG: ${bogMessage}`
    }
    return axiosError.message || 'BOG API error'
  }
  if (error instanceof Error) {
    if (isBogAuthorizeRejectedError(error)) {
      return `${error.message}. BOG-მა უარყო ოპერაცია (კოდი 179) — დაუკავშირდით ბანკს.`
    }
    return error.message
  }
  return 'Unknown error'
}

export type BogReceiptAction = {
  action_id?: string
  action?: string
  status?: string
  code?: string
  code_description?: string
  amount?: string
}

export type BogPaymentReceipt = {
  order_id?: string
  external_order_id?: string
  order_status?: { key?: string; value?: string }
  capture?: string
  split?: unknown
  actions?: BogReceiptAction[]
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function getLastAuthorizeAction(
  receipt: BogPaymentReceipt,
): BogReceiptAction | undefined {
  return receipt.actions?.filter((a) => a.action === 'authorize').at(-1)
}

export function getLastCancelAuthorizeAction(
  receipt: BogPaymentReceipt,
  cancelActionId?: string,
): BogReceiptAction | undefined {
  const actions = receipt.actions ?? []
  if (cancelActionId) {
    const matched = actions.find((a) => a.action_id === cancelActionId)
    if (matched) return matched
  }
  return actions.filter((a) => a.action === 'cancel_authorize').at(-1)
}

function isBogCancelSettled(receipt: BogPaymentReceipt): boolean {
  const orderStatus = receipt.order_status?.key?.toLowerCase()
  return (
    orderStatus === 'refunded' ||
    orderStatus === 'refunded_partially' ||
    orderStatus === 'rejected'
  )
}

/** Wait until BOG finishes processing the latest authorize action (rejected/success). */
export async function waitForPendingAuthorizeToSettle(
  paymentId: string,
  options?: { maxWaitMs?: number; intervalMs?: number },
): Promise<BogPaymentReceipt> {
  const maxWaitMs = options?.maxWaitMs ?? 30000
  const intervalMs = options?.intervalMs ?? 1500
  const deadline = Date.now() + maxWaitMs
  let lastReceipt: BogPaymentReceipt | null = null

  while (Date.now() < deadline) {
    lastReceipt = await fetchBogPaymentReceipt(paymentId)
    console.log(JSON.stringify(lastReceipt, null, 2))
    const action = getLastAuthorizeAction(lastReceipt)
    const status = action?.status?.toLowerCase()
    const orderStatus = lastReceipt.order_status?.key?.toLowerCase()

    if (orderStatus === 'completed' || orderStatus === 'partial_completed') {
      return lastReceipt
    }

    if (
      !action ||
      status === 'rejected' ||
      status === 'failed' ||
      status === 'success' ||
      status === 'completed'
    ) {
      return lastReceipt
    }

    await sleep(intervalMs)
  }

  return lastReceipt ?? (await fetchBogPaymentReceipt(paymentId))
}

export async function fetchBogPaymentReceipt(paymentId: string) {
  return bogTokenManager.makeAuthenticatedRequest(async (token) => {
    try {
      const response = await axios.get(
        `https://api.bog.ge/payments/v1/receipt/${paymentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
          validateStatus: () => true, // IMPORTANT
        },
      )

      const data = response.data

      if (!data || typeof data !== 'object') {
        throw new Error(`BOG invalid response (non-object)`)
      }

      // 🔥 detect BOG error payload
      if (data.error || data.code || data.message && !data.order_status) {
        throw new Error(
          `BOG API error: ${JSON.stringify(data)}`
        )
      }

      if (!data.order_status) {
        throw new Error(`BOG: Unknown Response (179)`)
      }

      return data as BogPaymentReceipt
    } catch (err: any) {
      throw new Error(
        `BOG receipt fetch failed: ${err?.message ?? 'unknown error'}`
      )
    }
  })
}

function findAuthorizeAction(
  receipt: BogPaymentReceipt,
  approveActionId?: string,
): BogReceiptAction | undefined {
  const actions = receipt.actions ?? []
  if (approveActionId) {
    const matched = actions.find((a) => a.action_id === approveActionId)
    if (matched) return matched
  }
  const authorizeActions = actions.filter((a) => a.action === 'authorize')
  return authorizeActions.at(-1)
}

export function getBogAuthorizeFailureMessage(receipt: BogPaymentReceipt): string | null {
  const orderStatus = receipt.order_status?.key?.toLowerCase()
  if (orderStatus === 'completed' || orderStatus === 'partial_completed') {
    return null
  }

  const action = findAuthorizeAction(receipt)
  if (!action) {
    if (orderStatus === 'blocked') {
      return 'BOG-მა გადახდის დადასტურება ჯერ არ დაასრულა'
    }
    return null
  }

  const status = action.status?.toLowerCase()
  if (status === 'success' || status === 'completed') {
    return null
  }

  if (status === 'rejected' || status === 'failed') {
    const code = action.code ? ` (${action.code})` : ''
    const description = action.code_description || 'გადახდის დადასტურება უარყოფილია'
    return `BOG: ${description}${code}`
  }

  return null
}

export async function waitForBogAuthorizeOutcome(
  paymentId: string,
  approveActionId?: string,
  options?: { maxWaitMs?: number; intervalMs?: number },
): Promise<BogPaymentReceipt> {
  const maxWaitMs = options?.maxWaitMs ?? 20000
  const intervalMs = options?.intervalMs ?? 1500
  const deadline = Date.now() + maxWaitMs
  let lastReceipt: BogPaymentReceipt | null = null

  while (Date.now() < deadline) {
    lastReceipt = await fetchBogPaymentReceipt(paymentId)
    console.log('lastReceipt', JSON.stringify(lastReceipt, null, 2))
    const orderStatus = lastReceipt.order_status?.key?.toLowerCase()

    if (orderStatus === 'completed' || orderStatus === 'partial_completed') {
      return lastReceipt
    }

    const failure = getBogAuthorizeFailureMessage(lastReceipt)
    const action = findAuthorizeAction(lastReceipt, approveActionId)
    const actionStatus = action?.status?.toLowerCase()

    if (failure && (actionStatus === 'rejected' || actionStatus === 'failed')) {
      throw new Error(failure)
    }

    if (!failure && (actionStatus === 'success' || actionStatus === 'completed')) {
      return lastReceipt
    }

    await sleep(intervalMs)
  }

  const failure = lastReceipt ? getBogAuthorizeFailureMessage(lastReceipt) : null
  if (failure) {
    throw new Error(failure)
  }

  throw new Error('BOG-მა გადახდის დადასტურება დროულად ვერ დაასრულა. სცადეთ მოგვიანებით.')
}

export function getBogCancelFailureMessage(receipt: BogPaymentReceipt): string | null {
  if (isBogCancelSettled(receipt)) {
    return null
  }

  const action = getLastCancelAuthorizeAction(receipt)
  if (!action) {
    return null
  }

  const status = action.status?.toLowerCase()
  if (status === 'success' || status === 'completed') {
    return null
  }

  if (status === 'rejected' || status === 'failed') {
    const code = action.code ? ` (${action.code})` : ''
    const description = action.code_description || 'გადახდის გაუქმება უარყოფილია'
    return `BOG: ${description}${code}`
  }

  return null
}

export async function waitForBogCancelOutcome(
  paymentId: string,
  cancelActionId?: string,
  options?: { maxWaitMs?: number; intervalMs?: number },
): Promise<BogPaymentReceipt> {
  const maxWaitMs = options?.maxWaitMs ?? 20000
  const intervalMs = options?.intervalMs ?? 1500
  const deadline = Date.now() + maxWaitMs
  let lastReceipt: BogPaymentReceipt | null = null

  while (Date.now() < deadline) {
    lastReceipt = await fetchBogPaymentReceipt(paymentId)
    if (isBogCancelSettled(lastReceipt)) {
      return lastReceipt
    }

    const failure = getBogCancelFailureMessage(lastReceipt)
    const action = getLastCancelAuthorizeAction(lastReceipt, cancelActionId)
    const actionStatus = action?.status?.toLowerCase()

    if (failure && (actionStatus === 'rejected' || actionStatus === 'failed')) {
      throw new Error(failure)
    }

    if (!failure && (actionStatus === 'success' || actionStatus === 'completed')) {
      return lastReceipt
    }

    await sleep(intervalMs)
  }

  const failure = lastReceipt ? getBogCancelFailureMessage(lastReceipt) : null
  if (failure) {
    throw new Error(failure)
  }

  if (lastReceipt && isBogCancelSettled(lastReceipt)) {
    return lastReceipt
  }

  throw new Error('BOG-მა გადახდის გაუქმება დროულად ვერ დაასრულა. სცადეთ მოგვიანებით.')
}
