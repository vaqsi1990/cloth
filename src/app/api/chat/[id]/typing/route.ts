import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { getChatRoomIfAllowed, isAdminSide } from '@/lib/chat-access'
import { setChatTyping } from '@/lib/chat-typing'

const typingSchema = z.object({
  typing: z.boolean(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const chatRoomId = parseInt(id, 10)

    if (isNaN(chatRoomId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid chat room ID' },
        { status: 400 }
      )
    }

    const session = await getServerSession(authOptions)
    const body = await request.json().catch(() => ({}))
    const guestEmail =
      typeof body?.guestEmail === 'string' ? body.guestEmail : null
    const chatRoom = await getChatRoomIfAllowed(chatRoomId, session, guestEmail)

    if (!chatRoom) {
      return NextResponse.json(
        { success: false, error: 'Chat room not found or access denied' },
        { status: 404 }
      )
    }

    const { typing } = typingSchema.parse(body)
    const viewerIsAdminSide = isAdminSide(session, chatRoom)
    const side = viewerIsAdminSide ? 'admin' : 'user'

    await setChatTyping(chatRoomId, side, typing)

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request' },
        { status: 400 }
      )
    }
    console.error('Error updating typing status:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
