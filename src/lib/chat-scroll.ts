export function scrollChatContainerToBottom(
  container: HTMLElement | null,
  behavior: ScrollBehavior = 'auto',
) {
  if (!container) return

  if (behavior === 'smooth' && 'scrollTo' in container) {
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
    return
  }

  container.scrollTop = container.scrollHeight
}

export function getLastChatMessageId(
  messages: Array<{ id: number }>,
): number | null {
  if (messages.length === 0) return null
  return messages[messages.length - 1]?.id ?? null
}
