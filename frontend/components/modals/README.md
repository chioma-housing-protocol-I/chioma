# Modal Components System

A comprehensive, centralized modal management system for the Chioma rental platform with context-based state management.

## Features

✅ **Centralized State Management** - Single context provider for all modals
✅ **Type-Safe** - Full TypeScript support with type inference
✅ **Accessible** - ARIA labels, keyboard navigation, focus management
✅ **Animated** - Smooth transitions using Framer Motion
✅ **Responsive** - Works on all screen sizes
✅ **Dark Mode** - Full dark mode support
✅ **Keyboard Support** - ESC to close, tab navigation
✅ **Overlay Click** - Click outside to close (configurable)

## Architecture

### Modal Context Provider

Centralized state management for all modals using React Context API.

```tsx
<ModalProvider>
  <App />
  <ModalManager />
</ModalProvider>
```

### Modal Manager

Renders the appropriate modal based on the current modal state.

### Base Modal

Reusable base component with common modal functionality. Supports optional `loading` / `loadingMessage` for an in-modal overlay (uses shared `Spinner` from `@/components/loading`).

---

## Available Modals

### 1. PropertyDetailModal

View property details with an image gallery and inquiry workflow.

**Features:**

- Image gallery with thumbnail navigation
- Property specs (beds, baths, area)
- View/favorite counts, verification badge, energy rating, pet policy, parking spaces
- Virtual tour, video, and floor plan links or preview when `PropertyDetailData` includes URLs
- Records a listing view via `POST /properties/:id/view` when the modal opens, and a **Favorite** action calls `POST /properties/:id/favorite` (TanStack Query mutations)
- Amenities and host details
- Direct workflow action to inquiry modal

### 2. PropertyInquiryModal

Collect lead inquiries from prospective tenants.

**Features:**

- Form validation for name, email, and message
- Optional phone capture
- Success/error feedback

### 3. AgreementViewModal

View agreement summary and PDF before signing.

**Features:**

- Agreement financial and date details
- Renewal option, renewal notice date, move-in / move-out, utilities, maintenance terms, early termination fee, late fee %, and grace period when present on `AgreementViewData`
- Embedded PDF preview
- Download + sign actions

### 4. AgreementSigningModal

Capture electronic signatures with compliance confirmation.

**Features:**

- Signer identity field
- Typed e-signature field
- Required terms acceptance checkbox
- Validation and submit flow

### 5. PropertyAgreementModal

Create, view, or edit rental agreements.

**Features:**

- Property information display
- Landlord and tenant details
- Financial terms (rent, deposit)
- Lease period selection
- Terms and conditions
- Status badges

**Usage:**

```tsx
const { openModal } = useModal();

openModal('propertyAgreement', {
  mode: 'create', // 'view' | 'create' | 'edit'
  agreement: {
    propertyTitle: 'Modern 2BR Apartment',
    monthlyRent: 2500,
    // ... other fields
  },
  onSubmit: async (data) => {
    // Handle submission
  },
});
```

### 6. DisputeModal

File disputes with evidence upload.

**Features:**

- Dispute title and description
- Category selection
- Priority levels
- Evidence file upload
- Warning banners

**Usage:**

```tsx
openModal('dispute', {
  agreementId: '123',
  onSubmit: async (data) => {
    // Handle dispute filing
  },
});
```

### 7. DisputeResolutionModal

Resolve disputes (admin/landlord view).

**Features:**

- Dispute details display
- Resolution notes
- Approve/reject actions
- Status tracking

**Usage:**

```tsx
openModal('disputeResolution', {
  dispute: {
    id: '456',
    title: 'Late Rent Payment',
    // ... other fields
  },
  userRole: 'admin',
  onResolve: async (id, resolution, action) => {
    // Handle resolution
  },
});
```

### 8. PaymentModal

Process rent payments.

**Features:**

- Amount input
- Payment method selection (card, bank, crypto)
- Due date display
- Payment notes
- Security notice

**Usage:**

```tsx
openModal('payment', {
  amount: 2500,
  agreementId: '123',
  dueDate: '2024-04-01',
  onSubmit: async (data) => {
    // Process payment
  },
});
```

### 9. RefundModal

Process refunds.

**Features:**

- Refund amount (partial or full)
- Reason input
- Refund method selection
- Warning banners
- Refund policy display

**Usage:**

```tsx
openModal('refund', {
  paymentId: '789',
  maxAmount: 2500,
  onSubmit: async (data) => {
    // Process refund
  },
});
```

### 10. UserManagementModal

Manage user accounts.

**Features:**

- User information (name, email, phone)
- Role selection
- Status management
- Email verification
- Suspend/delete actions

**Usage:**

```tsx
openModal('userManagement', {
  mode: 'create', // 'view' | 'create' | 'edit'
  user: {
    name: 'John Doe',
    email: 'john@example.com',
    role: 'tenant',
    // ... other fields
  },
  onSubmit: async (data) => {
    // Handle user creation/update
  },
  onSuspend: async (userId) => {
    // Handle suspension
  },
  onDelete: async (userId) => {
    // Handle deletion
  },
});
```

### 11. Document Modals

See [Document Components README](../documents/README.md) for details.

---

## Setup

### 1. Install Dependencies

```bash
pnpm add framer-motion react-hot-toast
```

### 2. Add ModalProvider to Layout

```tsx
// app/layout.tsx
import { ModalProvider } from '@/contexts/ModalContext';
import { ModalManager } from '@/components/modals';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ModalProvider>
          {children}
          <ModalManager />
        </ModalProvider>
      </body>
    </html>
  );
}
```

### 3. Use in Components

```tsx
import { useModal } from '@/contexts/ModalContext';

function MyComponent() {
  const { openModal, closeModal } = useModal();

  return (
    <button onClick={() => openModal('payment', { amount: 1000 })}>
      Pay Rent
    </button>
  );
}
```

---

## API Reference

### useModal Hook

```tsx
const { modalState, openModal, closeModal, updateModalData } = useModal();
```

**Methods:**

#### openModal(type, data?)

Opens a modal with the specified type and optional data.

```tsx
openModal('payment', {
  amount: 2500,
  agreementId: '123',
  onSubmit: async (data) => {
    // Handle submission
  },
});
```

#### closeModal()

Closes the currently open modal.

```tsx
closeModal();
```

#### updateModalData(data)

Updates the data of the currently open modal.

```tsx
updateModalData({ amount: 3000 });
```

#### modalState

Current modal state object.

```tsx
{
  type: 'payment' | 'dispute' | ... | null,
  data: Record<string, unknown>,
  isOpen: boolean
}
```

---

## BaseModal Props

```tsx
interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  loading?: boolean;
  loadingMessage?: string;
}
```

---

## Creating Custom Modals

### 1. Create Modal Component

```tsx
// components/modals/MyCustomModal.tsx
import { BaseModal } from './BaseModal';

interface MyCustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: MyData;
  onSubmit?: (data: MyData) => Promise<void>;
}

export const MyCustomModal: React.FC<MyCustomModalProps> = ({
  isOpen,
  onClose,
  data,
  onSubmit,
}) => {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="My Custom Modal"
      subtitle="Description"
      footer={<button onClick={onClose}>Close</button>}
    >
      {/* Your content */}
    </BaseModal>
  );
};
```

### 2. Add to ModalContext

```tsx
// contexts/ModalContext.tsx
export type ModalType =
  | 'propertyAgreement'
  | 'myCustomModal' // Add your modal type
  | null;
```

### 3. Add to ModalManager

```tsx
// components/modals/ModalManager.tsx
case 'myCustomModal':
  return (
    <MyCustomModal
      isOpen={modalState.isOpen}
      onClose={closeModal}
      data={modalState.data?.myData}
      onSubmit={modalState.data?.onSubmit}
    />
  );
```

### 4. Use It

```tsx
openModal('myCustomModal', {
  myData: {
    /* ... */
  },
  onSubmit: async (data) => {
    // Handle submission
  },
});
```

---

## Styling

All modals use Tailwind CSS and follow the Chioma design system:

- **Colors**: Brand blue (#2563eb), neutral grays
- **Typography**: Inter font, consistent sizing
- **Spacing**: Tailwind spacing scale
- **Borders**: Rounded corners (rounded-2xl, rounded-3xl)
- **Shadows**: Consistent shadow system
- **Animations**: Framer Motion transitions

---

## Accessibility

All modals include:

- `role="dialog"` and `aria-modal="true"`
- `aria-labelledby` for title
- Keyboard navigation (Tab, Shift+Tab)
- ESC key to close
- Focus trap within modal
- Focus restoration on close
- Screen reader announcements

---

## Best Practices

1. **Always provide onSubmit handlers** for forms
2. **Use loading states** during async operations
3. **Show success/error toasts** after actions
4. **Validate data** before submission
5. **Handle errors gracefully** with try-catch
6. **Close modal** after successful submission
7. **Reset form state** when closing
8. **Use appropriate modal sizes** for content
9. **Provide clear action buttons** in footer
10. **Add confirmation** for destructive actions

---

## Demo

Visit `/modals-demo` to see all modals in action with interactive examples.

---

## Testing

```bash
# Run tests
pnpm test

# Run linter
pnpm lint

# Build
pnpm build
```

---

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## Performance

- Lazy loading with dynamic imports
- Optimized animations
- Minimal re-renders
- Efficient state management

---

## Contributing

When adding new modals:

1. Follow existing modal patterns
2. Use BaseModal component
3. Add TypeScript types
4. Include accessibility features
5. Test on mobile devices
6. Update this README

---

## License

Part of the Chioma project - Open Source
