const SMS_OFFICE_SEND_URL = 'https://smsoffice.ge/api/v2/send/'

export type SmsOfficeResponse = {
  Success: boolean
  Message: string
  Output: unknown
  ErrorCode: number
}

export function isSmsConfigured(): boolean {
  return Boolean(process.env.SMS_API_KEY?.trim() && process.env.SMS_SENDER?.trim())
}

/** SMS Office expects international format without + or 00 (e.g. 995599556395). */
export function toSmsOfficeDestination(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null

  if (digits.startsWith('995') && digits.length === 12) {
    return digits
  }

  if (digits.length === 9 && digits.startsWith('5')) {
    return `995${digits}`
  }

  return digits.length >= 10 ? digits : null
}

export async function sendSms(params: {
  destination: string
  content: string
  reference?: string
  urgent?: boolean
}): Promise<{ success: boolean; error?: string; response?: SmsOfficeResponse }> {
  const apiKey = process.env.SMS_API_KEY?.trim()
  const sender = process.env.SMS_SENDER?.trim()

  if (!apiKey || !sender) {
    return { success: false, error: 'SMS is not configured' }
  }

  const destination = toSmsOfficeDestination(params.destination)
  if (!destination) {
    return { success: false, error: 'Invalid destination phone number' }
  }

  const body = new URLSearchParams({
    key: apiKey,
    destination,
    sender,
    content: params.content,
    contentType: '1',
    urgent: params.urgent === false ? 'false' : 'true',
  })

  if (params.reference) {
    body.set('reference', params.reference.slice(0, 20))
  }

  try {
    const response = await fetch(SMS_OFFICE_SEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    const data = (await response.json()) as SmsOfficeResponse

    if (!response.ok || !data.Success || data.ErrorCode !== 0) {
      console.error('[sendSms] SMS Office error:', data)
      return {
        success: false,
        error: data.Message || `SMS Office error code ${data.ErrorCode}`,
        response: data,
      }
    }

    return { success: true, response: data }
  } catch (error) {
    console.error('[sendSms] Request failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'SMS request failed',
    }
  }
}
