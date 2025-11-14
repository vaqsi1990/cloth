"use client"
import React, { useEffect, useRef, useState, useCallback } from 'react'

interface GooglePayPaymentData {
  paymentMethodData: {
    type: string
    description: string
    tokenizationData: {
      type: string
      token: string
    }
    info: {
      cardNetwork: string
      cardDetails: string
    }
  }
  email?: string
  shippingAddress?: unknown
}

interface GooglePayButtonProps {
  totalAmount: number
  currency: string
  onPaymentSuccess: (paymentData: GooglePayPaymentData) => void
  onError?: (error: Error) => void
  disabled?: boolean
}

interface GooglePayClient {
  isReadyToPay(request: unknown): Promise<{ result: boolean }>
  loadPaymentData(request: unknown): Promise<GooglePayPaymentData>
  createButton(options: {
    onClick: () => void
    buttonColor?: string
    buttonType?: string
    buttonSizeMode?: string
  }): HTMLElement
}

interface GooglePayClientConstructor {
  new (options: { environment: string }): GooglePayClient
}

declare global {
  interface Window {
    google?: {
      payments: {
        api: {
          PaymentsClient: GooglePayClientConstructor
        }
      }
    }
  }
}

const GooglePayButton: React.FC<GooglePayButtonProps> = ({
  totalAmount,
  currency,
  onPaymentSuccess,
  onError,
  disabled = false
}) => {
  const buttonRef = useRef<HTMLDivElement>(null)
  const [isReady, setIsReady] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentsClient, setPaymentsClient] = useState<GooglePayClient | null>(null)
  const initializedRef = useRef(false)
  const onErrorRef = useRef(onError)
  const onPaymentSuccessRef = useRef(onPaymentSuccess)

  // Keep refs updated
  useEffect(() => {
    onErrorRef.current = onError
    onPaymentSuccessRef.current = onPaymentSuccess
  }, [onError, onPaymentSuccess])

  const onGooglePaymentButtonClicked = useCallback(() => {
    if (!paymentsClient) return

    const paymentDataRequest = {
      apiVersion: 2,
      apiVersionMinor: 0,
      merchantInfo: {
        merchantId: 'BCR2DN4TXKPITITV',
        merchantName: 'Dressla'
      },
      allowedPaymentMethods: [
        {
          type: 'CARD',
          parameters: {
            allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
            allowedCardNetworks: ['MASTERCARD', 'VISA']
          },
          tokenizationSpecification: {
            type: 'PAYMENT_GATEWAY',
            parameters: {
              gateway: 'georgiancard',
              gatewayMerchantId: 'BCR2DN4TXKPITITV'
            }
          }
        }
      ],
      transactionInfo: {
        totalPriceStatus: 'FINAL',
        totalPrice: totalAmount.toFixed(2),
        currencyCode: currency
      }
    }

    paymentsClient.loadPaymentData(paymentDataRequest)
      .then((paymentData) => {
        onPaymentSuccessRef.current(paymentData)
      })
      .catch((error: unknown) => {
        console.error('Error loading payment data:', error)
        if (onErrorRef.current) {
          onErrorRef.current(error instanceof Error ? error : new Error(String(error)))
        }
      })
  }, [paymentsClient, totalAmount, currency])

  const createButton = useCallback((client: GooglePayClient) => {
    if (!buttonRef.current) return

    const button = client.createButton({
      onClick: onGooglePaymentButtonClicked,
      buttonColor: 'black',
      buttonType: 'pay',
      buttonSizeMode: 'fill'
    })

    buttonRef.current.innerHTML = ''
    buttonRef.current.appendChild(button)
  }, [onGooglePaymentButtonClicked])

  // Create button when paymentsClient is ready
  useEffect(() => {
    if (paymentsClient && isReady && buttonRef.current) {
      createButton(paymentsClient)
    }
  }, [paymentsClient, isReady, createButton])

  const initializeGooglePay = useCallback(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    setIsLoading(true)
    setError(null)

    if (!window.google?.payments?.api) {
      setIsLoading(false)
      initializedRef.current = false
      const errorMsg = 'Google Pay API არ არის ხელმისაწვდომი'
      setError(errorMsg)
      if (onErrorRef.current) {
        onErrorRef.current(new Error('Google Pay API not available'))
      }
      return
    }

    try {
      // Use TEST environment for development, PRODUCTION for production
      const environment = process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'TEST'
      const client = new window.google.payments.api.PaymentsClient({
        environment: environment
      })

      // Check if Google Pay is available
      const readyToPayRequest = {
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: [
          {
            type: 'CARD',
            parameters: {
              allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
              allowedCardNetworks: ['MASTERCARD', 'VISA']
            },
            tokenizationSpecification: {
              type: 'PAYMENT_GATEWAY',
              parameters: {
                gateway: 'georgiancard',
                gatewayMerchantId: 'BCR2DN4TXKPITITV'
              }
            }
          }
        ]
      }
      
      client.isReadyToPay(readyToPayRequest).then((response) => {
        setIsLoading(false)
        if (response.result) {
          setIsReady(true)
          setPaymentsClient(client)
        } else {
          initializedRef.current = false
          const errorMsg = 'Google Pay არ არის ხელმისაწვდომი თქვენს მოწყობილობაზე'
          setError(errorMsg)
          console.log('Google Pay is not available on this device')
        }
      }).catch((error: unknown) => {
        setIsLoading(false)
        initializedRef.current = false
        const errorMsg = 'Google Pay-ის შემოწმებისას დაფიქსირდა შეცდომა'
        setError(errorMsg)
        console.error('Error checking Google Pay availability:', error)
        if (onErrorRef.current) {
          onErrorRef.current(error instanceof Error ? error : new Error(String(error)))
        }
      })
    } catch (error) {
      setIsLoading(false)
      initializedRef.current = false
      const errorMsg = 'Google Pay-ის ინიციალიზაციისას დაფიქსირდა შეცდომა'
      setError(errorMsg)
      console.error('Error initializing Google Pay:', error)
      if (onErrorRef.current) {
        onErrorRef.current(error instanceof Error ? error : new Error(String(error)))
      }
    }
  }, [])

  useEffect(() => {
    let script: HTMLScriptElement | null = null
    let mounted = true
    let checkInterval: NodeJS.Timeout | null = null

    const loadGooglePay = () => {
      // Check if script is already loaded
      if (window.google?.payments?.api) {
        initializeGooglePay()
        return
      }

      // Check if script is already in the document
      const existingScript = document.querySelector('script[src="https://pay.google.com/gp/p/js/pay.js"]')
      if (existingScript) {
        // Script is loading, wait for it
        checkInterval = setInterval(() => {
          if (window.google?.payments?.api) {
            if (checkInterval) clearInterval(checkInterval)
            if (mounted) {
              initializeGooglePay()
            }
          }
        }, 100)
        
        // Timeout after 5 seconds
        setTimeout(() => {
          if (checkInterval) clearInterval(checkInterval)
          if (mounted && !window.google?.payments?.api) {
            setIsLoading(false)
            initializedRef.current = false
            const errorMsg = 'Google Pay SDK ვერ ჩაიტვირთა'
            setError(errorMsg)
          }
        }, 5000)
        return
      }

      // Load Google Pay SDK
      script = document.createElement('script')
      script.src = 'https://pay.google.com/gp/p/js/pay.js'
      script.async = true
      script.onload = () => {
        if (mounted) {
          initializeGooglePay()
        }
      }
      script.onerror = () => {
        if (mounted) {
          setIsLoading(false)
          initializedRef.current = false
          const errorMsg = 'Google Pay SDK ვერ ჩაიტვირთა'
          setError(errorMsg)
          if (onErrorRef.current) {
            onErrorRef.current(new Error('Failed to load Google Pay SDK'))
          }
        }
      }
      document.body.appendChild(script)
    }

    loadGooglePay()

    return () => {
      mounted = false
      if (checkInterval) {
        clearInterval(checkInterval)
      }
      initializedRef.current = false
      // Don't remove script as it might be used by other components
    }
  }, [initializeGooglePay])

  // Always render something so user knows the component is working
  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center py-4 min-h-[60px]">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
        <span className="ml-3 text-sm text-black">Google Pay იტვირთება...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full p-4 bg-yellow-50 border border-yellow-200 rounded-lg min-h-[60px]">
        <p className="text-sm text-yellow-800">{error}</p>
        <button
          type="button"
          onClick={() => {
            initializedRef.current = false
            setIsLoading(true)
            setError(null)
            initializeGooglePay()
          }}
          className="mt-2 text-sm text-yellow-900 underline hover:no-underline"
        >
          სცადეთ თავიდან
        </button>
      </div>
    )
  }

  if (!isReady) {
    return (
      <div className="w-full p-4 bg-gray-50 border border-gray-200 rounded-lg min-h-[60px]">
        <p className="text-sm text-black">Google Pay არ არის ხელმისაწვდომი</p>
        <button
          type="button"
          onClick={() => {
            initializedRef.current = false
            setIsLoading(true)
            setError(null)
            initializeGooglePay()
          }}
          className="mt-2 text-sm text-gray-700 underline hover:no-underline"
        >
          სცადეთ თავიდან
        </button>
      </div>
    )
  }

  return (
    <div 
      ref={buttonRef} 
      className={`w-full min-h-[60px] flex items-center justify-center ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    />
  )
}

export default GooglePayButton

