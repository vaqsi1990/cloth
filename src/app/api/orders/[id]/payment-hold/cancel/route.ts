import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'შეკვეთის გაუქმება მხოლოდ ადმინისტრატორს შეუძლია',
    },
    { status: 403 },
  )
}
