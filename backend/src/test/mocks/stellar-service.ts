/**
 * Mock implementation of StellarService for testing
 * Provides realistic responses for Stellar blockchain operations
 */

export const mockStellarService = {
    createEscrow: jest.fn(async (params: any) => ({
        escrowId: `escrow-${Date.now()}`,
        transactionHash: `hash-${Date.now()}`,
        status: 'completed',
        amount: params.amount,
        currency: params.currency,
        createdAt: new Date(),
    })),

    releaseEscrow: jest.fn(async (escrowId: string) => ({
        escrowId,
        transactionHash: `hash-${Date.now()}`,
        status: 'completed',
        releasedAt: new Date(),
    })),

    refundEscrow: jest.fn(async (escrowId: string) => ({
        escrowId,
        transactionHash: `hash-${Date.now()}`,
        status: 'completed',
        refundedAt: new Date(),
    })),

    getEscrowById: jest.fn(async (escrowId: string) => ({
        id: escrowId,
        status: 'active',
        amount: 1000,
        currency: 'USDC',
        createdAt: new Date(),
    })),

    getTransactionByHash: jest.fn(async (hash: string) => ({
        hash,
        status: 'success',
        amount: 1000,
        timestamp: new Date(),
    })),

    validateAddress: jest.fn(async (address: string) => ({
        isValid: address.length === 56,
        address,
    })),

    getBalance: jest.fn(async (address: string) => ({
        address,
        balance: 10000,
        currency: 'USDC',
    })),

    submitTransaction: jest.fn(async (transaction: any) => ({
        hash: `hash-${Date.now()}`,
        status: 'pending',
        transaction,
    })),
};
