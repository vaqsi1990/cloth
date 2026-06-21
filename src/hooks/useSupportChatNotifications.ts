import { useChatNotifications } from '@/hooks/useChatNotifications'

export function useSupportChatNotifications(enabled: boolean) {
  return useChatNotifications({
    enabled,
    endpoint: '/api/admin/chat/unread-count',
    storageKey: 'support-chat-sound-enabled',
  })
}
