'use client'

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { MessageCircle, Send, X, Minimize2, Maximize2, Bell, BellOff, ChevronLeft } from 'lucide-react'
import { formatDateTime } from '@/utils/dateUtils'
import { useSession } from 'next-auth/react'
import { showToast } from '@/utils/toast'
import ChatTypingIndicator from '@/components/ChatTypingIndicator'
import { useChatTyping } from '@/hooks/useChatTyping'
import { useChatAutoScroll } from '@/hooks/useChatAutoScroll'
import ChatMessageContent from '@/components/ChatMessageContent'
import ChatImageUploadButton from '@/components/ChatImageUploadButton'
import ChatPendingImagePreview from '@/components/ChatPendingImagePreview'
import { canSendChatMessage } from '@/lib/chat-message'
import { guestChatEmailHeaders } from '@/lib/chat-guest-header'
import { useUserChatNotification } from '@/components/UserChatNotificationProvider'

interface ChatQuestion {
  q: string
  // Predefined answer shown in the widget. If omitted, the question starts a live chat.
  a?: string
  // Optional call-to-action link rendered as a button below the answer.
  link?: { url: string; label: string }
  // Optional tutorial video (path relative to /public) shown below the answer.
  video?: string
  // When set, shows a button (with this label) that starts a normal live chat.
  chat?: string
}

interface ChatTopic {
  label: string
  // Optional second-level questions shown after the topic is chosen.
  questions?: ChatQuestion[]
}

const CONTACT_LINES = 'dressla.online@gmail.com\n+995 599 556 395'
const CONTACT_INFO = `დაგვიკავშირდით:\n${CONTACT_LINES}`

const CHAT_TOPICS: ChatTopic[] = [
  {
    label: 'ანგარიში',
    questions: [
      {
        q: 'როგორ დავრეგისტრირდე?',
        a: 'რეგისტრაციისთვის დააჭირეთ „რეგისტრაცია“, შეავსეთ საჭირო ინფორმაცია და დაადასტურეთ ანგარიში.',
      },
      {
        q: 'როგორ აღვადგინო პაროლი თუ დამავიწყდა?',
        a: 'პაროლის აღსადგენად დააჭირეთ ქვემოთ მოცემულ ღილაკს, შეიყვანეთ მოთხოვნილი ინფორმაცია და შექმენით ახალი პაროლი.',
        link: {
          url: 'https://www.dressla.ge/auth/forgot-password',
          label: 'პაროლის აღდგენა',
        },
      },
      {
        q: 'როგორ შევცვალო ტელეფონის ნომერი?',
        a: 'გადადით პროფილი → პარამეტრები და შეცვალეთ თქვენი ტელეფონის ნომერი.',
      },
      {
        q: 'როგორ შევცვალო მისამართი?',
        a: `გადადით პროფილი → პარამეტრები და შეცვალეთ მიწოდების მისამართი. თუ შეკვეთა უკვე გაფორმებულია, ${CONTACT_INFO}`,
      },
      {
        q: 'როგორ წავშალო ანგარიში?',
        a: 'გადადით პროფილი → პარამეტრები, ჩამოსქროლეთ ბოლომდე და აირჩიეთ „პროფილის გაუქმება“.',
      },
      {
        q: 'ოპერატორთან დაკავშირება',
        a: CONTACT_INFO,
      },
    ],
  },
  {
    label: 'შეკვეთა',
    questions: [
      {
        q: 'როგორ შევიძინო პროდუქტი?',
        a: 'აირჩიეთ სასურველი პროდუქტი, დააჭირეთ „გადახდა“, აირჩიეთ საკურიერო მომსახურება და შეიყვანეთ თქვენი ბარათის მონაცემები.',
      },
      {
        q: 'როგორ გადავიხადო?',
        a: 'გადახდის გვერდზე შეიყვანეთ თქვენი საბანკო ბარათის მონაცემები და დაადასტურეთ გადახდა.',
      },
      {
        q: 'რა ბარათით შემიძლია გადახდა?',
        a: 'გადახდა შესაძლებელია საბანკო ბარათით.',
      },
      {
        q: 'როგორ გამოვიყენო პრომოკოდი?',
        a: 'გადახდის გვერდზე გამოიყენეთ „პრომოკოდი“ ველი, შეიყვანეთ კოდი და შემდეგ გააგრძელეთ გადახდა.',
      },
      {
        q: 'როგორ დავუკავშირდე გამყიდველს?',
        a: 'გახსენით სასურველი პროდუქტი. აღწერის ქვემოთ ნახავთ გამყიდველის ინფორმაციას და დააჭირეთ „დაკონტაქტება“.',
      },
      {
        q: 'როგორ დავწერო შეფასება?',
        a: 'შეფასების ან კომენტარის დატოვება შესაძლებელია მხოლოდ იმ შემთხვევაში, თუ აღნიშნული პროდუქტი შეძენილი გაქვთ.',
      },
    ],
  },
  {
    label: 'საკურიერო მომსახურება',
    questions: [
      {
        q: 'გაქვთ საკურიერო მომსახურება?',
        a: 'დიახ.\n• სტანდარტული – 5 სამუშაო დღეში, 5 ₾.\n• ექსპრესი – 1 სამუშაო დღეში, 15 ₾.\nმიწოდების საფასურს იხდის მყიდველი.',
      },
      {
        q: 'რამდენ ხანში მივიღებ შეკვეთას?',
        a: 'სტანდარტული მიწოდების შემთხვევაში შეკვეთას მიიღებთ 5 სამუშაო დღეში, ხოლო ექსპრეს მიწოდების შემთხვევაში 1 სამუშაო დღეში.',
      },
      {
        q: 'რა ღირს მიწოდება?',
        a: 'სტანდარტული მიწოდება – 5 ₾, ექსპრეს მიწოდება – 15 ₾.',
      },
      {
        q: 'როგორ შევცვალო მიწოდების მისამართი?',
        a: `გადადით პროფილი → პარამეტრები და შეცვალეთ მისამართი. თუ შეკვეთა უკვე გაფორმებულია, ${CONTACT_INFO}`,
      },
    ],
  },
  {
    label: 'შეკვეთა და დაბრუნება',
    questions: [
      {
        q: 'როგორ გავაუქმო შეკვეთა?',
        a: 'შეკვეთის გაუქმება შესაძლებელია მხოლოდ იმ შემთხვევაში, თუ პროდუქტს აქვს წუნი. ასეთ შემთხვევაში დაუყოვნებლივ დაგვიკავშირდით:\ndressla.online@gmail.com',
      },
      {
        q: 'შესაძლებელია დაბრუნება?',
        a: 'დიახ, დაბრუნება შესაძლებელია მხოლოდ იმ შემთხვევაში, თუ პროდუქტს აქვს წუნი.',
      },
      {
        q: 'როდის დამიბრუნდება თანხა?',
        a: 'თანხა დაგიბრუნდებათ 10 სამუშაო დღის განმავლობაში. Dressla ცდილობს თანხის დაბრუნება მაქსიმალურად სწრაფად უზრუნველყოს.',
      },
      {
        q: 'ნივთს აქვს წუნი',
        a: 'თუ მიღებულ ნივთს აქვს წუნი, დაუყოვნებლივ დაგვიკავშირდით:\ndressla.online@gmail.com',
      },
    ],
  },
  {
    label: 'გაყიდვა',
    questions: [
      {
        q: 'როგორ გავყიდო პროდუქტი?',
        a: 'პროდუქტის გასაყიდად საჭიროა რეგისტრაციისას მიუთითოთ თქვენი საბანკო ანგარიში. შემდეგ გაეცანით პროდუქტის დამატების ტუტორიალს და განათავსეთ პროდუქტი.',
        video: '/video/item.mp4',
      },
      {
        q: 'როგორ განვათავსო პროდუქტი?',
        a: 'პროდუქტის განთავსება შეგიძლიათ სტანდარტული რეგისტრაციის შემდეგ. გაეცანით პროდუქტის დამატების ტუტორიალს.',
        video: '/video/item.mp4',
      },
      {
        q: 'როგორ დავამატო გასაყიდი ნივთი?',
        a: 'გაეცანით პროდუქტის დამატების ტუტორიალს და მიჰყევით ინსტრუქციას.',
        video: '/video/item.mp4',
      },
      {
        q: 'პროდუქციის განთავსება ფასიანია?',
        a: 'არა. პროდუქტის განთავსება სრულიად უფასოა.',
      },
      {
        q: 'იღებს Dressla საკომისიოს?',
        a: 'არა. Dressla არ იღებს საკომისიოს გამყიდველისგან. თქვენ მიერ მითითებული თანხა სრულად დაგერიცხებათ.',
      },
      {
        q: 'რატომ არ ჩანს ჩემი პროდუქტი?',
        a: 'შეამოწმეთ „ჩემი პროდუქცია“. შესაძლოა პროდუქტი ჯერ მოდერაციას გადის, ადმინისტრაციამ დაგიტოვათ შენიშვნა ან წაიშალა, თუ არ შეესაბამება Dressla-ს წესებს.',
      },
      {
        q: 'როგორ მივიღო გაყიდული თანხა?',
        a: 'გაყიდული თანხა ჩაირიცხება იმ საბანკო ანგარიშზე, რომელიც რეგისტრაციისას მიუთითეთ.',
      },
    ],
  },
  {
    label: 'გაქირავება',
    questions: [
      {
        q: 'როგორ გავაქირავო პროდუქტი?',
        a: 'გაეცანით გასაქირავებელი პროდუქტის დამატების ტუტორიალს და მიჰყევით ინსტრუქციას.',
        video: '/video/new.mp4',
      },
      {
        q: 'როგორ დავამატო გასაქირავებელი ნივთი?',
        a: 'გაეცანით გასაქირავებელი პროდუქტის დამატების ტუტორიალს.',
        video: '/video/new.mp4',
      },
    ],
  },
  {
    label: 'ტექნიკური დახმარება',
    questions: [
      {
        q: 'ჩემი პროდუქტი არ ჩანს.',
        a: 'შეამოწმეთ „ჩემი პროდუქცია“. შესაძლოა პროდუქტი ჯერ მოდერაციას გადის, აქვს ადმინისტრაციის შენიშვნა ან წაიშალა წესების დარღვევის გამო.',
      },
      {
        q: 'ანგარიში ვერ შევქმენი.',
        a: `თუ რეგისტრაცია ვერ სრულდება, დაუკავშირდით მხარდაჭერის გუნდს:\n${CONTACT_LINES}`,
      },
      {
        q: 'გადახდასთან პრობლემა მაქვს.',
        a: `თუ გადახდა ვერ სრულდება, სცადეთ თავიდან ან დაგვიკავშირდით:\n${CONTACT_LINES}`,
      },
      {
        q: 'სხვა პრობლემა მაქვს.',
        a: `თუ თქვენს კითხვაზე პასუხი ვერ იპოვეთ, დაუკავშირდით საფორთს:\n${CONTACT_LINES}`,
        chat: 'საფორთთან დაკავშირება',
      },
    ],
  },
]

const CHAT_TOPIC_STORAGE_KEY = 'chatSelectedTopic'

interface ChatMessage {
  id: number
  content: string
  imageUrl?: string | null
  createdAt: string
  isFromAdmin: boolean
  user?: { name: string; email: string }
  admin?: { name: string; email: string; role?: string }
}

interface ChatWidgetProps {
  isOpen: boolean
  onToggle: () => void
  chatRoomId?: number
  onChatRoomCreated: (chatRoomId: number) => void
}

const ChatWidget: React.FC<ChatWidgetProps> = ({
  isOpen,
  onToggle,
  onChatRoomCreated
}) => {
  // The chat room lives only for the current open session. It always starts at 0
  // so every time the widget opens the user sees the topic menu with an empty chat,
  // instead of resuming a previous conversation.
  const [chatRoomId, setChatRoomId] = useState(0)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingMessages, setIsFetchingMessages] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const messagesContainerRef = useChatAutoScroll(messages, {
    enabled: isOpen && !isMinimized,
    roomKey: chatRoomId ?? null,
  })
  const fetchingRef = useRef(false)
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [showGuestForm, setShowGuestForm] = useState(true)
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [menuTopic, setMenuTopic] = useState<string | null>(null)
  const [selectedQuestion, setSelectedQuestion] = useState<ChatQuestion | null>(null)
  const [isEndingChat, setIsEndingChat] = useState(false)
  const [otherPartyTyping, setOtherPartyTyping] = useState(false)
  const { data: session, status: sessionStatus } = useSession()
  const {
    soundEnabled: chatSoundEnabled,
    toggleSound: toggleChatSound,
    setActiveChatRoomId,
    acknowledgeActiveChat,
  } = useUserChatNotification()
  const { notifyTyping, stopTyping } = useChatTyping({
    chatRoomId,
    enabled: isOpen && !!chatRoomId,
    guestEmail: session?.user?.id ? undefined : guestEmail,
  })

  // Keep the current room id in sync with the parent (badge/notifications) while
  // still driving all UI from local state so each open starts fresh.
  const registerChatRoom = useCallback((id: number) => {
    setChatRoomId(id)
    onChatRoomCreated(id)
  }, [onChatRoomCreated])

  // Restore only the guest's name/email for convenience (never the previous room).
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    if (session?.user?.id) return

    try {
      const savedName = localStorage.getItem('chatGuestName')
      const savedEmail = localStorage.getItem('chatGuestEmail')

      if (savedName && savedEmail) {
        setGuestName(savedName)
        setGuestEmail(savedEmail)
      }
    } catch (error) {
      console.error('Error loading chat data from localStorage:', error)
    }
  }, [session?.user?.id])







  const fetchMessages = useCallback(async () => {
    if (!chatRoomId || chatRoomId === 0) {
      setMessages([])
      return
    }

    if (sessionStatus === 'loading') return
    if (!session?.user?.id && !guestEmail.trim()) return

    // Prevent multiple simultaneous fetches
    if (fetchingRef.current) return
    fetchingRef.current = true
    setIsFetchingMessages(true)
    
    try {
      const response = await fetch(`/api/chat/${chatRoomId}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          ...(!session?.user?.id ? guestChatEmailHeaders(guestEmail) : {}),
        },
      })

      if (!response.ok) {
        let errorData = {}
        try {
          errorData = await response.json()
        } catch (e) {
          console.debug('Could not parse error response as JSON')
        }

        // If chat room not found, reset chat room ID to allow creating new one
        if (response.status === 404) {
          console.log(`Chat room ${chatRoomId} not found, resetting...`)
          registerChatRoom(0)
          setMessages([])
          if (typeof window !== 'undefined') {
            localStorage.removeItem('chatRoomId')
            localStorage.removeItem('liveSupportChatRoomId')
          }
          return
        }

        // Log other errors for debugging
        console.error('Fetch messages error:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          url: response.url,
          chatRoomId
        })
        return
      }

      const data = await response.json()

      if (data.success && Array.isArray(data.messages)) {
        // Transform the raw query results to match the expected format
        const transformedMessages = data.messages.map((msg: {
          id: number
          content: string
          imageUrl?: string | null
          createdAt: string | Date
          isFromAdmin: boolean
          user_name?: string
          user_email?: string
          admin_name?: string
          admin_email?: string
          admin_role?: string
        }) => ({
          id: msg.id,
          content: msg.content,
          imageUrl: msg.imageUrl ?? null,
          createdAt: typeof msg.createdAt === 'string' ? msg.createdAt : (msg.createdAt instanceof Date ? msg.createdAt.toISOString() : String(msg.createdAt)),
          isFromAdmin: msg.isFromAdmin,
          user: msg.user_name ? { name: msg.user_name, email: msg.user_email } : undefined,
          admin: msg.admin_name ? { name: msg.admin_name, email: msg.admin_email, role: msg.admin_role } : undefined
        }))

        // Remove duplicates based on message ID and sort by creation time
        const uniqueMessages = transformedMessages
          .filter((msg: ChatMessage, index: number, self: ChatMessage[]) =>
            index === self.findIndex(m => m.id === msg.id)
          )
          .sort((a: ChatMessage, b: ChatMessage) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

        setMessages(uniqueMessages)
        setOtherPartyTyping(Boolean(data.otherPartyTyping))
        if (session?.user?.id) {
          acknowledgeActiveChat()
        }
      } else if (data.success && !data.messages) {
        // Chat room exists but has no messages yet
        setMessages([])
        setOtherPartyTyping(Boolean(data.otherPartyTyping))
        if (session?.user?.id) {
          acknowledgeActiveChat()
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      // Don't show error to user for fetch failures, just log them
    } finally {
      fetchingRef.current = false
      setIsFetchingMessages(false)
    }
  }, [chatRoomId, registerChatRoom, session?.user?.id, sessionStatus, guestEmail, acknowledgeActiveChat])

  useEffect(() => {
    if (!session?.user?.id) return
    if (isOpen && chatRoomId && chatRoomId > 0) {
      setActiveChatRoomId(chatRoomId)
      return () => setActiveChatRoomId(null)
    }
    setActiveChatRoomId(null)
  }, [session?.user?.id, isOpen, chatRoomId, setActiveChatRoomId])

  // Fetch messages and poll when chat is open
  useEffect(() => {
    if (!chatRoomId || chatRoomId <= 0 || !isOpen) {
      if (!chatRoomId || chatRoomId === 0) {
        setMessages([])
      }
      return
    }

    if (sessionStatus === 'loading') return
    if (!session?.user?.id && !guestEmail.trim()) return

    fetchMessages()
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [chatRoomId, isOpen, fetchMessages, session?.user?.id, sessionStatus, guestEmail])

  const sendMessage = async (contentOverride?: string) => {
    const isOverride = typeof contentOverride === 'string'

    if (!isOverride && !canSendChatMessage(newMessage, pendingImageUrl)) return

    // Client-side validation
    if (!isOverride && newMessage.trim().length > 1000) {
      showToast('მესიჯი ძალიან გრძელია. მაქსიმუმ 1000 სიმბოლო.', 'warning')
      return
    }

    // Validate guest form if creating new chat room
    if (!chatRoomId && !session && (!guestName.trim() || !guestEmail.trim())) {
      showToast('გთხოვთ შეიყვანოთ სახელი და ელ-ფოსტა', 'warning')
      setShowGuestForm(true)
      return
    }

    // Validate email format if provided
    if (guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
      showToast('გთხოვთ შეიყვანოთ სწორი ელ-ფოსტა', 'warning')
      return
    }

    setIsLoading(true)
    const typedMessage = isOverride ? (contentOverride as string).trim() : newMessage.trim()
    const imageToSend = isOverride ? null : pendingImageUrl
    // When creating a new chat room, prepend the chosen topic so the team sees the context.
    const messageToSend =
      !chatRoomId && selectedTopic && !typedMessage.startsWith('თემა:')
        ? `თემა: ${selectedTopic}${typedMessage ? `\n${typedMessage}` : ''}`
        : typedMessage
    if (!isOverride) {
      setNewMessage('')
      setPendingImageUrl(null)
    }
    stopTyping()

    try {
      if (!chatRoomId) {
        // Create new chat room
        const requestBody = {
          message: messageToSend,
          imageUrl: imageToSend || undefined,
          guestName: guestName || undefined,
          guestEmail: guestEmail || undefined
        }

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('Create chat room error:', errorData)
          throw new Error(`HTTP error! status: ${response.status} - ${errorData.message || errorData.error || 'Unknown error'}`)
        }

        const data = await response.json()

        if (data.success && data.chatRoomId) {
          registerChatRoom(data.chatRoomId)
          setShowGuestForm(false)
          // Save guest info and chat room ID to localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('chatGuestName', guestName)
            localStorage.setItem('chatGuestEmail', guestEmail)
            localStorage.setItem('chatRoomId', data.chatRoomId.toString())
            if (session?.user?.id) {
              localStorage.setItem('liveSupportChatRoomId', data.chatRoomId.toString())
            }
          }
          // Clear messages and let the useEffect handle fetching
          setMessages([])
        } else {
          throw new Error(data.message || 'Failed to create chat room')
        }
      } else {
        // Send message to existing chat room
        const requestBody = {
          content: messageToSend,
          ...(imageToSend ? { imageUrl: imageToSend } : {}),
          ...(!session?.user?.id && guestEmail.trim()
            ? { guestEmail: guestEmail.trim() }
            : {}),
        }

        const response = await fetch(`/api/chat/${chatRoomId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('Send message error:', errorData)
          throw new Error(`HTTP error! status: ${response.status} - ${errorData.message || errorData.error || 'Unknown error'}`)
        }

        const data = await response.json()

        if (data.success && data.message) {
          // Transform the message to match expected format
          const transformedMessage = {
            id: data.message.id,
            content: data.message.content,
            imageUrl: data.message.imageUrl ?? null,
            createdAt: data.message.createdAt,
            isFromAdmin: data.message.isFromAdmin,
            user: data.message.user_name ? { name: data.message.user_name, email: data.message.user_email } : undefined,
            admin: data.message.admin_name ? { name: data.message.admin_name, email: data.message.admin_email, role: data.message.admin_role } : undefined
          }

          // Add message only if it doesn't already exist
          setMessages(prev => {
            const exists = prev.some(msg => msg.id === transformedMessage.id)
            if (exists) {
              return prev
            }
            return [...prev, transformedMessage]
          })
        } else {
          throw new Error(data.message || 'Failed to send message')
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // Restore message if sending failed
      setNewMessage(messageToSend)
      setPendingImageUrl(imageToSend)

      // Show more specific error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      showToast(`შეცდომა მესიჯის გაგზავნისას: ${errorMessage}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const persistTopic = (topic: string) => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(CHAT_TOPIC_STORAGE_KEY, topic)
    } catch (error) {
      console.error('Error saving chat topic to localStorage:', error)
    }
  }

  const confirmTopic = (topic: string) => {
    setSelectedTopic(topic)
    persistTopic(topic)

    // Logged-in users have no form to fill, so start the conversation right away.
    if (session?.user?.id) {
      sendMessage(`თემა: ${topic}`)
    } else {
      setShowGuestForm(true)
    }
  }

  const handleSelectTopic = (topic: ChatTopic) => {
    // Topics with sub-questions open a second-level menu instead of starting a chat.
    if (topic.questions && topic.questions.length > 0) {
      setMenuTopic(topic.label)
      return
    }
    confirmTopic(topic.label)
  }

  const handleSelectQuestion = (topic: string, question: ChatQuestion) => {
    // If the question has a predefined answer, show it inside the widget.
    if (question.a) {
      setSelectedQuestion(question)
      return
    }

    // Otherwise fall back to starting a live chat with this question.
    setSelectedTopic(topic)
    persistTopic(topic)

    if (session?.user?.id) {
      sendMessage(`თემა: ${topic}\n${question.q}`)
    } else {
      // Prefill the question so the guest can just add their details and send.
      setNewMessage(question.q)
      setShowGuestForm(true)
    }
  }

  const clearSelectedTopic = () => {
    setSelectedTopic(null)
    setMenuTopic(null)
    setSelectedQuestion(null)
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(CHAT_TOPIC_STORAGE_KEY)
      } catch (error) {
        console.error('Error clearing chat topic from localStorage:', error)
      }
    }
  }

  const startNewChat = () => {
    if (!session) {
      setShowGuestForm(true)
    }
    setMessages([])
    clearSelectedTopic()
    registerChatRoom(0) // Reset chat room ID
  }

  const endChat = async () => {
    if (!chatRoomId) return

    setIsEndingChat(true)
    try {
      const response = await fetch(`/api/chat/${chatRoomId}`, {
        method: 'DELETE',
        headers: !session?.user?.id ? guestChatEmailHeaders(guestEmail) : undefined,
      })

      if (response.ok) {
        // Clear localStorage
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('chatGuestName')
            localStorage.removeItem('chatGuestEmail')
            localStorage.removeItem('chatRoomId')
            localStorage.removeItem('liveSupportChatRoomId')
            localStorage.removeItem(CHAT_TOPIC_STORAGE_KEY)
          } catch (error) {
            console.error('Error clearing localStorage:', error)
          }
        }

        // Reset state
        setMessages([])
        registerChatRoom(0)
        setShowGuestForm(true)
        setGuestName('')
        setGuestEmail('')
        setSelectedTopic(null)
        setMenuTopic(null)
        setSelectedQuestion(null)

        showToast('ლაპარაკი წარმატებით დასრულდა', 'success')
      } else {
        const errorData = await response.json().catch(() => ({}))
        showToast(errorData.message || 'შეცდომა ლაპარაკის დასრულებისას', 'error')
      }
    } catch (error) {
      console.error('Error ending chat:', error)
      showToast('შეცდომა ლაპარაკის დასრულებისას', 'error')
    } finally {
      setIsEndingChat(false)
    }
  }

  if (!isOpen) return null

  // Answer view: a predefined FAQ answer is being shown.
  const showAnswer = !chatRoomId && !selectedTopic && !!selectedQuestion
  // Level 1: the topic picker (first screen, before a topic is chosen).
  const showTopicMenu = !chatRoomId && !selectedTopic && !menuTopic && !selectedQuestion
  // Level 2: sub-questions for a topic that has them.
  const showQuestionMenu = !chatRoomId && !selectedTopic && !!menuTopic && !selectedQuestion
  const activeMenuTopic = CHAT_TOPICS.find((t) => t.label === menuTopic)
  const showMenu = showTopicMenu || showQuestionMenu || showAnswer

  return (
    <div className={`bg-white shadow-2xl border border-gray-200 ${isMinimized ? 'w-80 h-16 rounded-xl' : 'w-[min(24rem,calc(100vw-2rem))] h-[min(85vh,calc(100dvh-6rem))] rounded-xl overflow-hidden'
      } transition-all duration-300 flex flex-col`}>
      {/* Header */}
      <div className={`bg-[#1B3729] text-white flex-shrink-0 ${isMinimized ? 'rounded-xl' : 'rounded-t-xl'}`}>
        <div className={`p-4 flex items-center justify-between`}>
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5" />
            <span className="font-semibold">Live Chat</span>
          </div>
          <div className="flex items-center space-x-2">
            {session?.user?.id ? (
              <button
                type="button"
                onClick={toggleChatSound}
                className="text-white hover:text-gray-300 transition-colors p-1 rounded hover:bg-white/10"
                title={chatSoundEnabled ? 'შემომავალი მესიჯის ხმა ჩართულია' : 'შემომავალი მესიჯის ხმა გამორთულია'}
                aria-label={chatSoundEnabled ? 'შემომავალი მესიჯის ხმა ჩართულია' : 'შემომავალი მესიჯის ხმა გამორთულია'}
              >
                {chatSoundEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </button>
            ) : null}
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-white hover:text-gray-300 transition-colors p-1 rounded hover:bg-white/10"
              aria-label={isMinimized ? 'გაფართოება' : 'შემცირება'}
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onToggle}
              className="text-white hover:text-gray-300 transition-colors p-1 rounded hover:bg-white/10"
              aria-label="დახურვა"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {!isMinimized && (
          <div className="px-4 pb-2">
            <p className="text-xs text-white/80">სამუშაო საათები: 09:00 - 22:00</p>
          </div>
        )}
      </div>

      {!isMinimized && (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Messages */}
          <div
            ref={messagesContainerRef}
            className="flex-1 p-4 overflow-y-auto bg-gray-50 min-h-0"
          >
            {showTopicMenu ? (
              <div className="py-2">
                <p className="text-center font-medium text-black md:text-[18px] text-[16px]">
                  როგორ დაგეხმაროთ?
                </p>
                <p className="text-center text-[14px] text-gray-500 mt-1 mb-4">
                  აირჩიეთ თემა
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {CHAT_TOPICS.map((topic) => (
                    <button
                      key={topic.label}
                      type="button"
                      onClick={() => handleSelectTopic(topic)}
                      className="w-full text-left px-4 py-3 rounded-lg border border-[#1B3729]/30 bg-white text-[#1B3729] font-medium text-[15px] hover:bg-[#1B3729] hover:text-white hover:border-[#1B3729] transition-colors"
                    >
                      {topic.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => confirmTopic('საფორთთან დაკავშირება')}
                  className="mt-4 w-full px-4 py-3 rounded-lg bg-[#1B3729] text-white text-center font-medium text-[15px] hover:bg-[#2a4d3a] transition-colors"
                >
                  საფორთთან დაკავშირება
                </button>
              </div>
            ) : showQuestionMenu ? (
              <div className="py-2">
                <button
                  type="button"
                  onClick={() => setMenuTopic(null)}
                  className="inline-flex items-center gap-1 text-[14px] text-[#1B3729] font-medium mb-3 hover:underline"
                >
                  <ChevronLeft className="w-4 h-4" />
                  უკან
                </button>
                <p className="text-center font-medium text-black md:text-[18px] text-[16px] mb-4">
                  {menuTopic}
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {activeMenuTopic?.questions?.map((question) => (
                    <button
                      key={question.q}
                      type="button"
                      onClick={() => handleSelectQuestion(menuTopic as string, question)}
                      className="w-full text-left px-4 py-3 rounded-lg border border-[#1B3729]/30 bg-white text-[#1B3729] font-medium text-[15px] hover:bg-[#1B3729] hover:text-white hover:border-[#1B3729] transition-colors"
                    >
                      {question.q}
                    </button>
                  ))}
                </div>
              </div>
            ) : showAnswer ? (
              <div className="py-2">
                <button
                  type="button"
                  onClick={() => setSelectedQuestion(null)}
                  className="inline-flex items-center gap-1 text-[14px] text-[#1B3729] font-medium mb-3 hover:underline"
                >
                  <ChevronLeft className="w-4 h-4" />
                  უკან
                </button>
                <p className="font-semibold text-black text-[16px] mb-2">
                  {selectedQuestion?.q}
                </p>
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-[15px] text-gray-800 whitespace-pre-line break-words">
                    {selectedQuestion?.a}
                  </p>
                </div>
                {selectedQuestion?.video ? (
                  <video
                    src={selectedQuestion.video}
                    controls
                    playsInline
                    className="mt-3 w-full h-[300px] rounded-lg border border-gray-200 bg-black"
                  />
                ) : null}
                {selectedQuestion?.link ? (
                  <a
                    href={selectedQuestion.link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 block w-full px-4 py-3 rounded-lg bg-[#1B3729] text-white text-center font-medium text-[15px] hover:bg-[#2a4d3a] transition-colors"
                  >
                    {selectedQuestion.link.label}
                  </a>
                ) : null}
                {selectedQuestion?.chat ? (
                  <button
                    type="button"
                    onClick={() => confirmTopic(menuTopic ?? 'ტექნიკური დახმარება')}
                    className="mt-4 w-full px-4 py-3 rounded-lg bg-[#1B3729] text-white font-medium text-[15px] hover:bg-[#2a4d3a] transition-colors"
                  >
                    {selectedQuestion.chat}
                  </button>
                ) : null}
              </div>
            ) : isFetchingMessages && messages.length === 0 ? (
              <div className="text-center md:text-[18px] text-[16px] py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B3729] mx-auto mb-4"></div>
                <p className="text-gray-500">იტვირთება...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center md:text-[18px] text-[16px]  py-8">
                {selectedTopic ? (
                  <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1B3729]/10 text-[#1B3729] text-[14px] font-medium">
                    <span>თემა: {selectedTopic}</span>
                    <button
                      type="button"
                      onClick={clearSelectedTopic}
                      className="inline-flex items-center gap-1 text-[#1B3729]/70 hover:text-[#1B3729]"
                      aria-label="თემის შეცვლა"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                ) : null}
                <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="font-medium text-black">დაიწყეთ საუბარი!</p>
                <p className="text-[16px] text-gray-500 mt-2">ჩვენი გუნდი მზადაა დაგეხმაროთ</p>
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 font-medium">სამუშაო საათები</p>
                  <p className="text-xs text-blue-600 mt-1">09:00 - 22:00</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isFromAdmin ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg shadow-sm ${message.isFromAdmin
                          ? 'bg-blue-100 text-gray-800'
                          : 'bg-[#1B3729] text-white'
                        }`}
                    >
                      {/* Show sender name */}
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-[14px] font-semibold ${message.isFromAdmin ? 'text-blue-700' : 'text-gray-200'
                          }`}>
                          {message.isFromAdmin
                            ? (message.admin?.role === 'SUPPORT' ? 'საფორთი' : (message.admin?.name || 'ადმინისტრატორი'))
                            : (message.user?.name || guestName || 'მომხმარებელი')
                          }
                        </p>
                      </div>
                      <ChatMessageContent
                        content={message.content}
                        imageUrl={message.imageUrl}
                        textClassName="text-[16px] break-words"
                      />
                      <p className={`text-[12px] mt-2 ${message.isFromAdmin ? 'text-gray-500' : 'text-gray-300'
                        }`}>
                        {formatDateTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
                <ChatTypingIndicator show={otherPartyTyping} align="start" />
              </div>
            )}
          </div>

          {/* Guest Form */}
          {showGuestForm && !chatRoomId && !session && !showMenu && (
            <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white">
              <div className="space-y-3">
                <div>
                  <label className="block text-[16px] text-black font-medium  mb-1">
                    სახელი
                  </label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full p-2 border text-black placeholder:text-gray-500  border-black rounded-md focus:ring-2 focus:ring-[#1B3729] focus:border-transparent text-[16px]"
                    placeholder="შეიყვანეთ თქვენი სახელი"
                  />
                </div>
                <div>
                  <label className="block text-[16px] text-black font-medium  mb-1">
                    ელ-ფოსტა
                  </label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full p-2 border text-black placeholder:text-gray-500 border-black rounded-md focus:ring-2 focus:ring-[#1B3729] focus:border-transparent text-[16px]"
                    placeholder="შეიყვანეთ თქვენი ელ-ფოსტა"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Input */}
          {!showMenu && (
          <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white rounded-b-xl">
            {pendingImageUrl ? (
              <ChatPendingImagePreview
                imageUrl={pendingImageUrl}
                onRemove={() => setPendingImageUrl(null)}
              />
            ) : null}
            <div className="flex items-end gap-2">
              <ChatImageUploadButton
                onImageReady={setPendingImageUrl}
                disabled={isLoading || Boolean(pendingImageUrl)}
              />
              <textarea
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value)
                  notifyTyping(e.target.value)
                }}
                onBlur={stopTyping}
                onKeyPress={handleKeyPress}
                placeholder="შეიყვანეთ თქვენი შეტყობინება..."
                className="flex-1 text-black p-2 border placeholder:text-gray-500 border-black rounded-md resize-none focus:ring-2 focus:ring-[#1B3729] focus:border-transparent text-[14px]"
                rows={2}
                disabled={isLoading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={isLoading || !canSendChatMessage(newMessage, pendingImageUrl)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#1B3729] text-white hover:bg-[#2a4d3a] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                aria-label="გაგზავნა"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

         
          </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ChatWidget
