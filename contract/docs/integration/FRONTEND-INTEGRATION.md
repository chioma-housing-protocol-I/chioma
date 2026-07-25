# Frontend Integration Guide

**Status:** Completed  
**Category:** Documentation  
**Type:** Integration Guide  

## Overview

This guide explains how the Chioma frontend integrates with the backend API and interacts with Stellar wallets for blockchain operations.

## 1. Frontend Architecture

The frontend follows a modern React/Next.js architecture:

```
UI Components
    ↓
React Hooks & State Management (Zustand)
    ↓
API Client (Axios)
    ↓
Backend API
```

### Key Technologies

- **Next.js 16**: React framework with SSR support
- **React 19**: UI library with latest hooks
- **Zustand**: State management
- **TanStack Query**: Server state management
- **Stellar Wallet Kit**: Wallet integration
- **Freighter**: Stellar wallet provider

## 2. API Integration

### 2.1 API Client Setup

```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  withCredentials: true
});

// Add request interceptor for authentication
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### 2.2 API Service Layer

```typescript
// services/paymentService.ts
export const paymentService = {
  async createPayment(agreementId: string, amount: string) {
    const response = await apiClient.post('/payments', {
      agreement_id: agreementId,
      amount
    });
    return response.data;
  },

  async getPaymentHistory(agreementId: string) {
    const response = await apiClient.get(
      `/agreements/${agreementId}/payments`
    );
    return response.data;
  },

  async confirmPayment(transactionHash: string) {
    const response = await apiClient.post('/payments/confirm', {
      transaction_hash: transactionHash
    });
    return response.data;
  }
};
```

### 2.3 Using TanStack Query

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

export function usePayments(agreementId: string) {
  return useQuery({
    queryKey: ['payments', agreementId],
    queryFn: () => paymentService.getPaymentHistory(agreementId),
    staleTime: 1000 * 60 * 5 // 5 minutes
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PaymentInput) =>
      paymentService.createPayment(data.agreementId, data.amount),
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    }
  });
}
```

## 3. Stellar Wallet Integration

### 3.1 Freighter Wallet Setup

```typescript
import * as StellarSdk from '@stellar/stellar-sdk';
import { FreighterModule } from '@stellar/freighter-api';

export const initializeWallet = async () => {
  // Check if Freighter is installed
  const isConnected = await FreighterModule.isConnected();
  if (!isConnected) {
    throw new Error('Freighter wallet not installed');
  }

  // Request public key
  const publicKey = await FreighterModule.getPublicKey();
  return publicKey;
};
```

### 3.2 Wallet Connection Store

```typescript
// store/walletStore.ts
import { create } from 'zustand';

interface WalletState {
  publicKey: string | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  getBalance: () => Promise<string>;
}

export const useWalletStore = create<WalletState>((set) => ({
  publicKey: null,
  isConnected: false,

  connect: async () => {
    try {
      const publicKey = await initializeWallet();
      set({ publicKey, isConnected: true });
      localStorage.setItem('wallet_public_key', publicKey);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  },

  disconnect: () => {
    set({ publicKey: null, isConnected: false });
    localStorage.removeItem('wallet_public_key');
  },

  getBalance: async () => {
    const publicKey = localStorage.getItem('wallet_public_key');
    if (!publicKey) throw new Error('Wallet not connected');

    const response = await fetch(
      `https://horizon-testnet.stellar.org/accounts/${publicKey}`
    );
    const account = await response.json();

    const nativeBalance = account.balances.find(
      (b: any) => b.asset_type === 'native'
    );
    return nativeBalance?.balance || '0';
  }
}));
```

## 4. Payment Flow Integration

### 4.1 Payment Component

```typescript
// components/PaymentForm.tsx
import { useState } from 'react';
import { usePayments, useCreatePayment } from '@/services/paymentService';
import { useWalletStore } from '@/store/walletStore';

export function PaymentForm({ agreementId }: { agreementId: string }) {
  const [amount, setAmount] = useState('');
  const { data: payments } = usePayments(agreementId);
  const { mutate: createPayment, isPending } = useCreatePayment();
  const { publicKey, isConnected } = useWalletStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected) {
      alert('Please connect your wallet');
      return;
    }

    try {
      createPayment(
        { agreementId, amount },
        {
          onSuccess: (result) => {
            // Show confirmation
            alert(`Payment submitted: ${result.transaction_hash}`);
            // Sign and submit transaction
            signAndSubmitTransaction(result.transaction_xdr);
          },
          onError: (error) => {
            alert(`Payment failed: ${error.message}`);
          }
        }
      );
    } catch (error) {
      console.error('Payment error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="number"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount in XLM"
        required
      />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Processing...' : 'Send Payment'}
      </button>
    </form>
  );
}
```

### 4.2 Transaction Signing

```typescript
// utils/transactionSigning.ts
import { FreighterModule } from '@stellar/freighter-api';

export async function signAndSubmitTransaction(transactionXdr: string) {
  try {
    // Sign with Freighter
    const signedXdr = await FreighterModule.signTransaction(
      transactionXdr,
      {
        network: 'TESTNET'
      }
    );

    // Submit to backend
    const response = await apiClient.post('/transactions/submit', {
      transaction_xdr: signedXdr
    });

    return response.data;
  } catch (error) {
    console.error('Transaction signing failed:', error);
    throw error;
  }
}
```

## 5. State Management Patterns

### 5.1 Agreement Store

```typescript
// store/agreementStore.ts
interface Agreement {
  id: string;
  tenantId: string;
  landlordId: string;
  propertyId: string;
  monthlyRent: string;
  status: 'active' | 'paused' | 'terminated';
  createdAt: string;
}

export const useAgreementStore = create<{
  agreements: Agreement[];
  loading: boolean;
  fetchAgreements: () => Promise<void>;
  selectAgreement: (id: string) => Agreement | undefined;
}>((set, get) => ({
  agreements: [],
  loading: false,

  fetchAgreements: async () => {
    set({ loading: true });
    try {
      const data = await apiClient.get('/agreements');
      set({ agreements: data.data });
    } finally {
      set({ loading: false });
    }
  },

  selectAgreement: (id: string) => {
    return get().agreements.find((a) => a.id === id);
  }
}));
```

### 5.2 Notification Store

```typescript
// store/notificationStore.ts
interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

export const useNotificationStore = create<{
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
}>((set) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = Date.now().toString();
    set((state) => ({
      notifications: [...state.notifications, { ...notification, id }]
    }));

    if (notification.duration) {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id)
        }));
      }, notification.duration);
    }
  },

  removeNotification: (id: string) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id)
    }));
  }
}));
```

## 6. Error Handling

### 6.1 Error Boundary

```typescript
// components/ErrorBoundary.tsx
import React from 'react';

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 6.2 API Error Handling

```typescript
// utils/errorHandling.ts
export function handleApiError(error: any): string {
  if (!error.response) {
    return 'Network error. Please check your connection.';
  }

  const status = error.response.status;
  const data = error.response.data;

  switch (status) {
    case 400:
      return data.message || 'Invalid request';
    case 401:
      return 'Authentication required';
    case 403:
      return 'Access denied';
    case 404:
      return 'Resource not found';
    case 429:
      return 'Too many requests. Please try again later.';
    case 500:
      return 'Server error. Please try again later.';
    default:
      return 'An error occurred. Please try again.';
  }
}
```

## 7. Real-time Updates

### 7.1 WebSocket Connection

```typescript
// services/socketService.ts
import io from 'socket.io-client';

const socket = io(process.env.NEXT_PUBLIC_API_URL, {
  auth: {
    token: localStorage.getItem('auth_token')
  }
});

export const socketService = {
  on: (event: string, callback: (data: any) => void) => {
    socket.on(event, callback);
  },

  emit: (event: string, data: any) => {
    socket.emit(event, data);
  },

  disconnect: () => {
    socket.disconnect();
  }
};

// Listen for payment updates
socketService.on('payment:confirmed', (data) => {
  useNotificationStore.getState().addNotification({
    type: 'success',
    message: `Payment confirmed: ${data.amount} XLM`,
    duration: 3000
  });
});
```

## 8. Security Best Practices

### 8.1 CSRF Protection

```typescript
// utils/csrf.ts
let csrfToken: string | null = null;

export async function initializeCsrfToken() {
  const response = await apiClient.get('/csrf-token');
  csrfToken = response.data.token;
}

apiClient.interceptors.request.use((config) => {
  if (csrfToken && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method?.toUpperCase())) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});
```

### 8.2 XSS Prevention

```typescript
// Avoid dangerouslySetInnerHTML
// WRONG:
// <div dangerouslySetInnerHTML={{ __html: userInput }} />

// RIGHT:
// <div>{userInput}</div>

// Use DOMPurify for sanitization if needed
import DOMPurify from 'dompurify';

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html);
}
```

## 9. Testing

### 9.1 Component Testing

```typescript
// __tests__/PaymentForm.test.ts
import { render, screen, fireEvent } from '@testing-library/react';
import { PaymentForm } from '@/components/PaymentForm';
import { useWalletStore } from '@/store/walletStore';

vi.mock('@/store/walletStore');

describe('PaymentForm', () => {
  it('requires wallet connection', () => {
    vi.mocked(useWalletStore).mockReturnValue({
      isConnected: false,
      publicKey: null
    } as any);

    render(<PaymentForm agreementId="test" />);
    fireEvent.click(screen.getByText('Send Payment'));

    expect(screen.getByText(/connect your wallet/i)).toBeInTheDocument();
  });

  it('submits payment with amount', async () => {
    vi.mocked(useWalletStore).mockReturnValue({
      isConnected: true,
      publicKey: 'G...'
    } as any);

    render(<PaymentForm agreementId="test" />);

    fireEvent.change(screen.getByPlaceholderText(/amount/i), {
      target: { value: '100' }
    });
    fireEvent.click(screen.getByText('Send Payment'));

    // Verify submission
    expect(screen.getByText(/processing/i)).toBeInTheDocument();
  });
});
```

### 9.2 Hook Testing

```typescript
// __tests__/hooks/usePayments.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { usePayments } from '@/services/paymentService';

describe('usePayments', () => {
  it('fetches payment history', async () => {
    const { result } = renderHook(() => usePayments('agreement-123'));

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data).toHaveLength(3);
  });
});
```

## 10. Performance Optimization

### 10.1 Code Splitting

```typescript
// pages/agreements/[id].tsx
import dynamic from 'next/dynamic';

const PaymentForm = dynamic(() =>
  import('@/components/PaymentForm').then((mod) => mod.PaymentForm)
);

export default function AgreementDetail() {
  return (
    <div>
      <h1>Agreement Details</h1>
      <Suspense fallback={<div>Loading payment form...</div>}>
        <PaymentForm agreementId="123" />
      </Suspense>
    </div>
  );
}
```

### 10.2 Query Optimization

```typescript
// Use query key factories
const paymentKeys = {
  all: ['payments'] as const,
  lists: () => [...paymentKeys.all, 'list'] as const,
  list: (agreementId: string) =>
    [...paymentKeys.lists(), agreementId] as const,
  details: () => [...paymentKeys.all, 'detail'] as const,
  detail: (id: string) =>
    [...paymentKeys.details(), id] as const
};

// Use in queries
useQuery({
  queryKey: paymentKeys.list(agreementId),
  queryFn: () => fetchPayments(agreementId)
});
```

## Related Documentation

- [Backend Integration](./BACKEND-INTEGRATION.md)
- [Stellar Integration](./STELLAR-INTEGRATION.md)
- [External Contracts](./EXTERNAL-CONTRACTS.md)
