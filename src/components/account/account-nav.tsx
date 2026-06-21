'use client'

import {
  ClipboardList,
  MessageCircle,
  Package,
  Settings,
  ShoppingCart,
  Ticket,
  TrendingUp,
  User,
  type LucideIcon,
} from 'lucide-react'
import type { AccountSection } from '@/lib/account-routes'
import { accountSectionPath } from '@/lib/account-routes'

export type AccountNavItem = {
  id: AccountSection
  label: string
  icon: LucideIcon
  href: string
  hideForSupport?: boolean
}

export function getAccountNavItems(role: string | undefined): AccountNavItem[] {
  const items: AccountNavItem[] = [
    { id: 'profile', label: 'პროფილი', icon: User, href: accountSectionPath('profile') },
    { id: 'vouchers', label: 'ვაუჩერები', icon: Ticket, href: accountSectionPath('vouchers') },
    { id: 'orders', label: 'შეკვეთები', icon: ShoppingCart, href: accountSectionPath('orders') },
    { id: 'sales', label: 'გაყიდვები', icon: TrendingUp, href: accountSectionPath('sales') },
    { id: 'chats', label: 'ჩათები', icon: MessageCircle, href: accountSectionPath('chats') },
    { id: 'inquiries', label: 'მოთხოვნები', icon: ClipboardList, href: accountSectionPath('inquiries') },
    { id: 'contact', label: 'კონტაქტი', icon: MessageCircle, href: accountSectionPath('contact') },
    {
      id: 'products',
      label: 'ჩემი პროდუქტები',
      icon: Package,
      href: accountSectionPath('products'),
      hideForSupport: true,
    },
    { id: 'settings', label: 'პარამეტრები', icon: Settings, href: accountSectionPath('settings') },
  ]

  if (role === 'SUPPORT') {
    return items.filter((item) => !item.hideForSupport)
  }

  return items
}
