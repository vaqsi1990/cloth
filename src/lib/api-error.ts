import { NextResponse } from 'next/server'

export function internalServerErrorResponse(
  logLabel: string,
  error: unknown,
): NextResponse {
  console.error(logLabel, error)
  return NextResponse.json(
    {
      success: false,
      error: 'Internal server error',
      message: 'Internal server error',
    },
    { status: 500 },
  )
}
