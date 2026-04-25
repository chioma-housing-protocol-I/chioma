/**
 * Mock implementation of PaymentGatewayService for testing
 * Simulates external payment gateway responses
 */

export const mockPaymentGateway = {
    chargePayment: jest.fn(async (params: any) => ({
        transactionId: `txn-${Date.now()}`,
        status: 'completed',
        amount: params.amount,
        currency: params.currency,
        timestamp: new Date(),
        receipt: {
            id: `receipt-${Date.now()}`,
            url: 'https://gateway.example.com/receipt',
        },
    })),

    processRefund: jest.fn(async (params: any) => ({
        refundId: `ref-${Date.now()}`,
        status: 'completed',
        amount: params.amount,
        originalTransactionId: params.transactionId,
        timestamp: new Date(),
    })),

    savePaymentMethod: jest.fn(async (params: any) => ({
        methodId: `pm-${Date.now()}`,
        type: params.type,
        last4: params.last4 || '1234',
        expiryMonth: params.expiryMonth,
        expiryYear: params.expiryYear,
        isDefault: params.isDefault || false,
    })),

    getPaymentMethod: jest.fn(async (methodId: string) => ({
        id: methodId,
        type: 'card',
        last4: '1234',
        expiryMonth: 12,
        expiryYear: 2025,
        isDefault: false,
    })),

    deletePaymentMethod: jest.fn(async (methodId: string) => ({
        methodId,
        status: 'deleted',
    })),

    validatePaymentMethod: jest.fn(async (methodId: string) => ({
        methodId,
        isValid: true,
        status: 'active',
    })),

    getTransactionStatus: jest.fn(async (transactionId: string) => ({
        transactionId,
        status: 'completed',
        amount: 1000,
        timestamp: new Date(),
    })),

    createPaymentIntent: jest.fn(async (params: any) => ({
        intentId: `intent-${Date.now()}`,
        clientSecret: `secret-${Date.now()}`,
        amount: params.amount,
        currency: params.currency,
        status: 'requires_payment_method',
    })),

    confirmPaymentIntent: jest.fn(async (intentId: string) => ({
        intentId,
        status: 'succeeded',
        chargeId: `charge-${Date.now()}`,
    })),
};
