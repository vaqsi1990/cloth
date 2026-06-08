import { Resend } from 'resend'

let resendClient: Resend | null = null

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey)
  }

  return resendClient
}

function getFromAddress(): string {
  const from = process.env.RESEND_FROM_EMAIL
  if (!from) {
    throw new Error('RESEND_FROM_EMAIL is not configured')
  }

  return from
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL)
}

export async function sendVerificationEmail(email: string, token: string) {
  try {
    const { error } = await getResendClient().emails.send({
      from: getFromAddress(),
      to: email,
      subject: 'ელ-ფოსტის ვერიფიკაცია ',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">ელ-ფოსტის ვერიფიკაცია</h2>
          <p>გმადლობთ ჩვენ საიტზე რეგისტრაციისთვის!</p>
          <p>თქვენი ვერიფიკაციის კოდია:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${token}</h1>
          </div>
          <p>გთხოვთ შეიყვანოთ ეს კოდი რეგისტრაციის დასასრულებლად.</p>
          <p>ეს კოდი ვადა გასდება 10 წუთში.</p>
          <p>თუ თქვენ არ მოითხოვეთ ეს ვერიფიკაცია, გთხოვთ უგულებელყოთ ეს ელ-ფოსტა.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px; text-align: center;">
            ეს არის ავტომატური შეტყობინება . გთხოვთ არ უპასუხოთ ამ ელ-ფოსტას.
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('Error sending verification email:', error)
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error('Error sending verification email:', error)
    return { success: false, error }
  }
}

export async function sendPasswordResetEmail(email: string, token: string) {
  try {
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/forgot-password/confirm?token=${token}&email=${encodeURIComponent(email)}`

    const { error } = await getResendClient().emails.send({
      from: getFromAddress(),
      to: email,
      subject: 'პაროლის აღდგენა',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">პაროლის აღდგენა</h2>
          <p>გმარჯობა!</p>
          <p>თქვენ მოითხოვეთ პაროლის აღდგენა. ახალი პაროლის დასაყენებლად დააჭირეთ ქვემოთ მოყვანილ ღილაკს:</p>
          <a href="${resetUrl}" style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">პაროლის შეცვლა</a>
          <p>ან გადადით ამ ლინკზე: <a href="${resetUrl}">${resetUrl}</a></p>
          <p>ეს ლინკი ვალიდურია 24 საათის განმავლობაში.</p>
          <p>თუ თქვენ არ მოითხოვეთ პაროლის აღდგენა, გთხოვთ უგულებელყოთ ეს ელ-ფოსტა.</p>
          <p>თქვენი პაროლი არ შეიცვლება, სანამ არ დააჭირებთ ზემოთ მოყვანილ ლინკს.</p>
        </div>
      `,
    })

    if (error) {
      console.error('Error sending password reset email:', error)
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error('Error sending password reset email:', error)
    return { success: false, error }
  }
}
