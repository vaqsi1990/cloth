declare namespace google.payments.api {
  interface PaymentOptions {
    environment?: 'PRODUCTION' | 'TEST'
  }

  interface PaymentDataRequest {
    apiVersion: number
    apiVersionMinor: number
    merchantInfo: {
      merchantId: string
      merchantName: string
    }
    allowedPaymentMethods: PaymentMethod[]
    transactionInfo: {
      totalPriceStatus: string
      totalPrice: string
      currencyCode: string
    }
    callbackIntents?: string[]
  }

  interface PaymentMethod {
    type: string
    parameters: {
      allowedAuthMethods: string[]
      allowedCardNetworks: string[]
    }
    tokenizationSpecification: {
      type: string
      parameters: {
        gateway: string
        gatewayMerchantId: string
      }
    }
  }

  interface PaymentData {
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
    shippingAddress?: any
  }

  interface IsReadyToPayRequest {
    apiVersion: number
    apiVersionMinor: number
    allowedPaymentMethods: PaymentMethod[]
  }

  interface IsReadyToPayResponse {
    result: boolean
  }

  interface ButtonOptions {
    onClick: () => void
    buttonColor?: 'default' | 'black' | 'white'
    buttonType?: 'long' | 'short' | 'pay'
    buttonSizeMode?: 'fill' | 'static'
  }

  class PaymentsClient {
    constructor(options: PaymentOptions)
    isReadyToPay(request: IsReadyToPayRequest): Promise<IsReadyToPayResponse>
    loadPaymentData(request: PaymentDataRequest): Promise<PaymentData>
    createButton(options: ButtonOptions): HTMLElement
  }
}

