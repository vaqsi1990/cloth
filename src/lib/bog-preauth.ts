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
      return error.message
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
    return actions.find((a) => a.action_id === approveActionId)
  }
  return actions.filter((a) => a.action === 'authorize').at(-1)
}

export function isBogPaymentCaptured(receipt: BogPaymentReceipt): boolean {
  const status = receipt.order_status?.key?.toLowerCase()
  return status === 'completed' || status === 'partial_completed'
}

export function getBogApproveReadinessMessage(
  receipt: BogPaymentReceipt,
): string | null {
  const status = receipt.order_status?.key?.toLowerCase()

  if (status === 'completed' || status === 'partial_completed') {
    return null
  }

  if (status === 'blocked') {
    return null
  }

  if (status === 'auth_requested') {
    const lastAuth = getLastAuthorizeAction(receipt)
    const lastStatus = lastAuth?.status?.toLowerCase()

    if (
      lastStatus === 'pending' ||
      lastStatus === 'processing' ||
      lastStatus === 'in_progress'
    ) {
      return 'BOG უკვე ამუშავებს დადასტურების მოთხოვნას. დაელოდეთ რამდენიმე წამს და სცადეთ თავიდან.'
    }

    if (lastStatus === 'rejected' || lastStatus === 'failed') {
      if (lastAuth?.code === '179') {
        return 'BOG-მა გადახდის დადასტურება უარყო (კოდი 179). დაუკავშირდით BOG-ს — pre-authorization შესაძლოა არ არის ჩართული მერჩანტ ანგარიშზე, ან შეკვეთა უკვე დაზიანებულია. სცადეთ ახალი გადახდა.'
      }
      return 'BOG-მა გადახდის დადასტურება უარყო. გააუქმეთ ბლოკი ან დაუკავშირდით BOG-ს.'
    }

    return 'გადახდა ჯერ არ არის მზად დადასტურებისთვის BOG-ში.'
  }

  if (status === 'rejected' || status === 'refunded' || status === 'refunded_partially') {
    return 'გადახდა BOG-ში უკვე გაუქმებულია ან უარყოფილია.'
  }

  if (status) {
    return `BOG სტატუსი "${status}" — დადასტურება შესაძლებელია მხოლოდ "blocked" შეკვეთებზე.`
  }

  return 'BOG-ის სტატუსი ვერ განისაზღვრა.'
}

export function getBogAuthorizeFailureMessage(
  receipt: BogPaymentReceipt,
  approveActionId?: string,
): string | null {
  const orderStatus = receipt.order_status?.key?.toLowerCase()
  if (orderStatus === 'completed' || orderStatus === 'partial_completed') {
    return null
  }

  const action = findAuthorizeAction(receipt, approveActionId)
  if (!action) {
    if (approveActionId) {
      return null
    }
    if (orderStatus === 'blocked') {
      return 'BOG-მა გადახდის დადასტურება ჯერ არ დაასრულა'
    }
    return null
  }

  const status = action.status?.toLowerCase()
  if (status === 'success' || status === 'completed') {
    return null
  }

  if (status === 'pending' || status === 'processing' || status === 'in_progress') {
    return null
  }

  if (status === 'rejected' || status === 'failed') {
    const code = action.code ? ` (${action.code})` : ''
    const description = action.code_description || 'გადახდის დადასტურება უარყოფილია'
    if (action.code === '179') {
      return `BOG: ${description}${code}. დაუკავშირდით BOG-ს — შესაძლოა pre-authorization ჯერ არ არის ჩართული მერჩანტ ანგარიშზე.`
    }
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
    const orderStatus = lastReceipt.order_status?.key?.toLowerCase()

    if (orderStatus === 'completed' || orderStatus === 'partial_completed') {
      return lastReceipt
    }

    const action = findAuthorizeAction(lastReceipt, approveActionId)
    const actionStatus = action?.status?.toLowerCase()
    const failure = getBogAuthorizeFailureMessage(lastReceipt, approveActionId)

    if (failure && (actionStatus === 'rejected' || actionStatus === 'failed')) {
      throw new Error(failure)
    }

    await sleep(intervalMs)
  }

  if (lastReceipt && isBogPaymentCaptured(lastReceipt)) {
    return lastReceipt
  }

  const failure = lastReceipt
    ? getBogAuthorizeFailureMessage(lastReceipt, approveActionId)
    : null
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
