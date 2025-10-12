'use client'
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react'

interface CartItem {
    id: number
    name: string
    image: string
    price: number
    size: string
    quantity: number
    maxStock: number
}

interface CartContextType {
    cartItems: CartItem[]
    addToCart: (item: CartItem) => void
    removeFromCart: (id: number, size: string) => void
    updateQuantity: (id: number, size: string, quantity: number) => void
    getTotalItems: () => number
    getTotalPrice: () => number
    clearCart: () => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [cartItems, setCartItems] = useState<CartItem[]>([])
    const lastAddTimeRef = useRef<number>(0)
    const processingRef = useRef<string | false>(false)

    // Load cart from localStorage on mount
    useEffect(() => {
        const savedCart = localStorage.getItem('cart')
        if (savedCart) {
            setCartItems(JSON.parse(savedCart))
        }
    }, [])

    // Save cart to localStorage whenever cart changes
    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(cartItems))
    }, [cartItems])

    useEffect(() => {
        console.log("CartProvider mounted");
    }, []);

    const addToCart = (newItem: CartItem) => {
        console.log('addToCart called:', newItem.name, newItem.size, 'at', Date.now())
        
        const now = Date.now()
        const timeSinceLastAdd = now - lastAddTimeRef.current
        
        // Prevent rapid double clicks (within 500ms)
        if (timeSinceLastAdd < 500) {
            console.log('Too soon since last add, skipping duplicate call. Time since:', timeSinceLastAdd + 'ms')
            return
        }
        
        lastAddTimeRef.current = now
        console.log('Processing addToCart for:', newItem.name)
        
        // Use functional update with a more robust approach
        setCartItems(prevItems => {
            // Create a unique key for this operation to prevent StrictMode double execution
            const operationKey = `${newItem.id}-${newItem.size}-${now}`
            
            // Check if we've already processed this exact operation
            if (processingRef.current === operationKey) {
                console.log('Already processed this operation, skipping')
                return prevItems
            }
            
            processingRef.current = operationKey
            
            const existingItemIndex = prevItems.findIndex(
                item => item.id === newItem.id && item.size === newItem.size
            )

            if (existingItemIndex > -1) {
                const updatedItems = [...prevItems]
                updatedItems[existingItemIndex].quantity =
                    Math.min(
                        updatedItems[existingItemIndex].quantity + newItem.quantity,
                        newItem.maxStock
                    )
                console.log('Updated existing item quantity to:', updatedItems[existingItemIndex].quantity)
                return updatedItems
            } else {
                console.log('Adding new item to cart')
                return [...prevItems, newItem]
            }
        })
        
        // Reset processing flag after a short delay
        setTimeout(() => {
            processingRef.current = false
        }, 100)
    }



    const removeFromCart = (id: number, size: string) => {
        setCartItems(prevItems =>
            prevItems.filter(item => !(item.id === id && item.size === size))
        )
    }

    const updateQuantity = (id: number, size: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(id, size)
            return
        }

        setCartItems(prevItems =>
            prevItems.map(item =>
                item.id === id && item.size === size
                    ? { ...item, quantity }
                    : item
            )
        )
    }

    const getTotalItems = () => {
        return cartItems.reduce((total, item) => total + item.quantity, 0)
    }

    const getTotalPrice = () => {
        return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0)
    }

    const clearCart = () => {
        setCartItems([])
    }

    return (
        <CartContext.Provider value={{
            cartItems,
            addToCart,
            removeFromCart,
            updateQuantity,
            getTotalItems,
            getTotalPrice,
            clearCart
        }}>
            {children}
        </CartContext.Provider>
    )
}

export const useCart = () => {
    const context = useContext(CartContext)
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider')
    }
    return context
}
