"use client"
import React, { useEffect, useRef, useState } from 'react'

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
  const [paymentsClient, setPaymentsClient] = useState<GooglePayClient | null>(null)

  useEffect(() => {
    // Load Google Pay SDK
    const script = document.createElement('script')
    script.src = 'https://pay.google.com/gp/p/js/pay.js'
    script.async = true
    script.onload = () => {
      initializeGooglePay()
    }
    script.onerror = () => {
      if (onError) {
        onError(new Error('Failed to load Google Pay SDK'))
      }
    }
    document.body.appendChild(script)

    return () => {
      // Cleanup
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  const initializeGooglePay = () => {
    if (!window.google?.payments?.api) {
      if (onError) {
        onError(new Error('Google Pay API not available'))
      }
      return
    }

    try {
      const client = new window.google.payments.api.PaymentsClient({
        environment: 'PRODUCTION' // Use 'TEST' for testing
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
        if (response.result) {
          setIsReady(true)
          setPaymentsClient(client)
          createButton(client)
        } else {
          console.log('Google Pay is not available')
        }
      }).catch((error: unknown) => {
        console.error('Error checking Google Pay availability:', error)
        if (onError) {
          onError(error instanceof Error ? error : new Error(String(error)))
        }
      })
    } catch (error) {
      console.error('Error initializing Google Pay:', error)
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)))
      }
    }
  }

  const createButton = (client: GooglePayClient) => {
    if (!buttonRef.current) return

    const button = client.createButton({
      onClick: onGooglePaymentButtonClicked,
      buttonColor: 'black',
      buttonType: 'pay',
      buttonSizeMode: 'fill'
    })

    buttonRef.current.innerHTML = ''
    buttonRef.current.appendChild(button)
  }

  const onGooglePaymentButtonClicked = () => {
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
      },
      callbackIntents: ['PAYMENT_AUTHORIZATION']
    }

    paymentsClient.loadPaymentData(paymentDataRequest)
      .then((paymentData) => {
        onPaymentSuccess(paymentData)
      })
      .catch((error: unknown) => {
        console.error('Error loading payment data:', error)
        if (onError) {
          onError(error instanceof Error ? error : new Error(String(error)))
        }
      })
  }

  if (!isReady) {
    return null
  }

  return (
    <div 
      ref={buttonRef} 
      className={disabled ? 'opacity-50 pointer-events-none' : ''}
    />
  )
}

export default GooglePayButton

