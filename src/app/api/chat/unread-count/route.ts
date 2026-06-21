import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAccountChatUnreadSummary } from '@/lib/account-chat-list'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'ავტორიზაცია საჭიროა' }, { status: 401 })
    }

    const {
      unreadCount,
      liveSupportUnreadCount,
      productChatUnreadCount,
      liveSupportChatRoomId,
    } = await getAccountChatUnreadSummary(session.user.id)

    return NextResponse.json({
      success: true,
      unreadCount,
      liveSupportUnreadCount,
      productChatUnreadCount,
      liveSupportChatRoomId,
    })
  } catch (error) {
    console.error('GET chat unread-count:', error)
    return NextResponse.json({ success: false, message: 'შეცდომა' }, { status: 500 })
  }
}
