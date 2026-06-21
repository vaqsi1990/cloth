import { NextResponse } from 'next/server'

/** BOG tokens must only be used server-side (create-order uses bogTokenManager). */
export async function GET() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
