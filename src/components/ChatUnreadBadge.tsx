'use client'

type ChatUnreadBadgeProps = {
  count: number
  className?: string
  pulse?: boolean
}

export default function ChatUnreadBadge({
  count,
  className = 'absolute -top-2 -right-2',
  pulse = true,
}: ChatUnreadBadgeProps) {
  if (count <= 0) return null

  return (
    <span
      className={`${className} z-10 bg-red-500 text-white text-xs font-bold rounded-full min-w-[22px] h-[22px] px-1 flex items-center justify-center leading-none ${
        pulse ? 'animate-pulse' : ''
      }`}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
