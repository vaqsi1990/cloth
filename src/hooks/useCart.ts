'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface CartItem {
  id: number
  productId: number
  productName: string
  image?: string
  size: string
  price: number
  quantity: number
  isRental?: boolean
  rentalStartDate?: string
  rentalEndDate?: string
  rentalDays?: number
  deposit?: number
}

interface Cart {
  id: number
  items: CartItem[]
  totalItems: number
  totalPrice: number
}

export const useCart = () => {
  const { data: session } = useSession()
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch cart from API
  const fetchCart = async () => {
    if (!session?.user?.id) return

    try {
      setLoading(true)
      const response = await fetch('/api/cart')
      const data = await response.json()
      
      if (data.success) {
        setCart(data.cart)
      }
    } catch (error) {
      console.error('Error fetching cart:', error)
    } finally {
      setLoading(false)
    }
  }

  // Add item to cart
  const addToCart = async (item: Omit<CartItem, 'id'>) => {
    console.log('addToCart called with:', item)
    console.log('Session:', session)
    
    if (!session?.user?.id) {
      console.log('No session found, returning false')
      return false
    }

    try {
      console.log('Making POST request to /api/cart')
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(item),
      })

      const data = await response.json()
      console.log('Cart API response:', data)
      
      if (data.success) {
        await fetchCart() // Refresh cart
        return true
      }
      return false
    } catch (error) {
      console.error('Error adding to cart:', error)
      return false
    }
  }

  // Update item quantity
  const updateQuantity = async (itemId: number, quantity: number) => {
    if (!session?.user?.id) return

    try {
      const response = await fetch(`/api/cart/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantity }),
      })

      const data = await response.json()
      
      if (data.success) {
        await fetchCart() // Refresh cart
        return true
      }
      return false
    } catch (error) {
      console.error('Error updating quantity:', error)
      return false
    }
  }

  // Remove item from cart
  const removeFromCart = async (itemId: number) => {
    if (!session?.user?.id) return

    try {
      const response = await fetch(`/api/cart/${itemId}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      
      if (data.success) {
        await fetchCart() // Refresh cart
        return true
      }
      return false
    } catch (error) {
      console.error('Error removing from cart:', error)
      return false
    }
  }

  // Clear entire cart
  const clearCart = async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch('/api/cart', {
        method: 'DELETE',
      })

      const data = await response.json()
      
      if (data.success) {
        await fetchCart() // Refresh cart
        return true
      }
      return false
    } catch (error) {
      console.error('Error clearing cart:', error)
      return false
    }
  }

  // Get total items count
  const getTotalItems = () => {
    return cart?.totalItems || 0
  }

  // Get total price
  const getTotalPrice = () => {
    return cart?.totalPrice || 0
  }

  // Get cart items
  const getCartItems = () => {
    return cart?.items || []
  }

  // Fetch cart on mount and when session changes
  useEffect(() => {
    if (session?.user?.id) {
      fetchCart()
    } else {
      setCart(null)
    }
  }, [session?.user?.id])

  return {
    cart,
    cartItems: getCartItems(),
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getTotalItems,
    getTotalPrice,
    loading,
    fetchCart
  }
}
