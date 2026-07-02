import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'გადახდის დადასტურება მხოლოდ ადმინისტრატორს შეუძლია',
    },
    { status: 403 },
  )
}
