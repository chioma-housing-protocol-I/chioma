# Form Components

Comprehensive form validation and feedback components for the Chioma frontend.

## Components

### FormValidationFeedback

Display validation feedback messages at the form level.

**Features:**
- Multiple status types: success, error, warning, info, validating
- Support for single messages or multiple field errors
- Optional icons with animations
- Auto-dismiss functionality
- Dismissible with callback
- Inline or alert variants
- Full accessibility support

**Usage:**

```tsx
import { FormValidationFeedback } from '@/components/forms';

// Single error message
<FormValidationFeedback error="Invalid email or password" />

// Multiple field errors
<FormValidationFeedback
  errors={[
    { field: 'Email', message: 'Email is required' },
    { field: 'Password', message: 'Password must be at least 8 characters' }
  ]}
/>

// Success message with auto-dismiss
<FormValidationFeedback
  success="Account created successfully!"
  autoDismiss={5000}
/>

// Warning with dismiss button
<FormValidationFeedback
  warning="Your session will expire soon"
  dismissible
  onDismiss={() => console.log('Dismissed')}
/>

// Validating state
<FormValidationFeedback
  isValidating
  validatingMessage="Creating your account..."
/>

// Inline variant (no background/border)
<FormValidationFeedback
  inline
  error="Please correct the errors below"
/>
```

---

### FieldValidationFeedback

Display validation feedback for individual form fields.

**Features:**
- Compact size optimized for field-level use
- Same status types as FormValidationFeedback
- Animated loading state
- Proper ARIA attributes for accessibility

**Usage:**

```tsx
import { FieldValidationFeedback } from '@/components/forms';

<div className="space-y-2">
  <label>Email</label>
  <Input type="email" />
  <FieldValidationFeedback error="This email is already registered" />
</div>

<div className="space-y-2">
  <label>Username</label>
  <Input />
  <FieldValidationFeedback success="Username is available" />
</div>

<div className="space-y-2">
  <label>Password</label>
  <Input type="password" />
  <FieldValidationFeedback
    warning="This password is commonly used"
  />
</div>

<div className="space-y-2">
  <label>Address</label>
  <Input />
  <FieldValidationFeedback isValidating />
</div>
```

---

### ValidatedInputWrapper

All-in-one component that combines label, input, and validation feedback.

**Features:**
- Automatic label association with input
- Required field indicator
- Visual validation state (icons)
- Integrated feedback display
- Supports all Input props via children

**Usage:**

```tsx
import { ValidatedInputWrapper } from '@/components/forms';
import { Input } from '@/components/ui/input';

<ValidatedInputWrapper
  label="Email Address"
  id="email"
  required
  error="Invalid email format"
>
  <Input
    id="email"
    type="email"
    placeholder="email@example.com"
  />
</ValidatedInputWrapper>

<ValidatedInputWrapper
  label="Username"
  id="username"
  required
  success="Username is available"
>
  <Input id="username" />
</ValidatedInputWrapper>

<ValidatedInputWrapper
  label="Phone"
  id="phone"
  hint="Format: +1 (555) 000-0000"
>
  <Input id="phone" type="tel" />
</ValidatedInputWrapper>
```

---

## Real-World Example

Here's a complete registration form with validation:

```tsx
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  FormValidationFeedback,
  ValidatedInputWrapper,
  type FieldError,
} from '@/components/forms';

export default function RegistrationForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isValidatingEmail, setIsValidatingEmail] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [formErrors, setFormErrors] = useState<FieldError[]>([]);
  const [formSuccess, setFormSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors([]);
    setFormSuccess('');

    // Validate
    const errors: FieldError[] = [];

    if (!email) {
      errors.push({ field: 'Email', message: 'Email is required' });
    }
    if (!password || password.length < 8) {
      errors.push({
        field: 'Password',
        message: 'Password must be at least 8 characters',
      });
    }

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    // Submit form
    try {
      await registerUser({ email, password });
      setFormSuccess('Account created successfully!');
      setEmail('');
      setPassword('');
    } catch (error) {
      setFormErrors([
        { field: 'Form', message: 'Registration failed. Please try again.' },
      ]);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormValidationFeedback
        errors={formErrors}
        success={formSuccess}
        autoDismiss={formSuccess ? 5000 : undefined}
      />

      <ValidatedInputWrapper
        label="Email Address"
        id="email"
        required
        error={emailError}
        success={email && !emailError ? 'Email is valid' : undefined}
        isValidating={isValidatingEmail}
      >
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={emailError ? 'border-destructive' : ''}
        />
      </ValidatedInputWrapper>

      <ValidatedInputWrapper
        label="Password"
        id="password"
        required
        hint="Must be at least 8 characters"
      >
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </ValidatedInputWrapper>

      <button
        type="submit"
        className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground"
      >
        Create Account
      </button>
    </form>
  );
}
```

---

## Integration with React Hook Form

The components work seamlessly with React Hook Form:

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ValidatedInputWrapper } from '@/components/forms';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormData = z.infer<typeof schema>;

export default function RHFExample() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    await registerUser(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <ValidatedInputWrapper
        label="Email"
        id="email"
        required
        error={errors.email?.message}
      >
        <Input id="email" type="email" {...register('email')} />
      </ValidatedInputWrapper>

      <ValidatedInputWrapper
        label="Password"
        id="password"
        required
        error={errors.password?.message}
      >
        <Input id="password" type="password" {...register('password')} />
      </ValidatedInputWrapper>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
```

---

## TypeScript Types

```typescript
export type ValidationStatus = 
  | 'success' 
  | 'error' 
  | 'warning' 
  | 'info' 
  | 'validating';

export interface FieldError {
  field: string;
  message: string;
  type?: string;
}

export interface FormValidationFeedbackProps {
  error?: string;
  errors?: FieldError[];
  success?: string;
  warning?: string;
  info?: string;
  isValidating?: boolean;
  validatingMessage?: string;
  className?: string;
  inline?: boolean;
  showIcon?: boolean;
  autoDismiss?: number;
  onDismiss?: () => void;
  dismissible?: boolean;
}

export interface FieldValidationFeedbackProps {
  error?: string;
  success?: string;
  warning?: string;
  info?: string;
  isValidating?: boolean;
  className?: string;
  showIcon?: boolean;
}

export interface ValidatedInputWrapperProps {
  label: string;
  id: string;
  required?: boolean;
  error?: string;
  success?: string;
  warning?: string;
  hint?: string;
  isValidating?: boolean;
  className?: string;
  children: React.ReactNode;
}
```

---

## Accessibility

All components follow WCAG 2.1 AA guidelines:

- **ARIA attributes**: Proper use of `role="alert"`, `aria-live`, and `aria-atomic`
- **Screen reader support**: Error and success messages are announced
- **Keyboard navigation**: All interactive elements are keyboard accessible
- **Focus management**: Error fields can receive focus programmatically
- **Color contrast**: Text colors meet WCAG contrast requirements
- **Visual indicators**: Icons and colors provide redundant cues

---

## Styling

Components use Tailwind CSS and respect your theme configuration:

- Dark mode support out of the box
- Consistent with shadcn/ui design system
- Customizable via `className` prop
- Color variants use theme colors (destructive, primary, etc.)

---

## Testing

Example test with React Testing Library:

```tsx
import { render, screen } from '@testing-library/react';
import { FormValidationFeedback } from '@/components/forms';

describe('FormValidationFeedback', () => {
  it('displays error message', () => {
    render(<FormValidationFeedback error="Invalid input" />);
    expect(screen.getByText('Invalid input')).toBeInTheDocument();
  });

  it('displays multiple field errors', () => {
    const errors = [
      { field: 'Email', message: 'Required' },
      { field: 'Password', message: 'Too short' },
    ];
    render(<FormValidationFeedback errors={errors} />);
    expect(screen.getByText(/Email:/)).toBeInTheDocument();
    expect(screen.getByText(/Password:/)).toBeInTheDocument();
  });

  it('auto-dismisses success message', async () => {
    const onDismiss = jest.fn();
    render(
      <FormValidationFeedback
        success="Success!"
        autoDismiss={1000}
        onDismiss={onDismiss}
      />
    );
    
    await waitFor(() => {
      expect(onDismiss).toHaveBeenCalled();
    }, { timeout: 1500 });
  });
});
```

---

## Best Practices

### When to show validation

- **On blur**: Show errors when user leaves a field
- **On submit**: Show form-level errors after validation
- **Real-time**: Show success/availability checks as user types (debounced)
- **Never**: Don't show errors while user is actively typing

### Message guidelines

- **Be specific**: "Email is required" not "This field is required"
- **Be actionable**: Tell users how to fix the problem
- **Be concise**: Keep messages under 80 characters when possible
- **Be positive**: "Username is available" not "No errors"

### Performance tips

- Debounce async validation (500ms recommended)
- Memoize validation functions with `useCallback`
- Avoid re-rendering the entire form on single field changes
- Use `React.memo` for field components in large forms

---

## Migration from Old Components

If you're currently using `FormErrorAlert` or `FormErrorSummary`:

**Before:**
```tsx
<FormErrorAlert message="Invalid credentials" />
```

**After:**
```tsx
<FormValidationFeedback error="Invalid credentials" />
```

The new components are backward compatible and provide more features.

---

## Examples

See `FormValidationFeedbackExample.tsx` for a comprehensive demo of all features.

Run the example:
```bash
# In your Next.js app
import FormValidationFeedbackExample from '@/components/forms/FormValidationFeedbackExample';

<FormValidationFeedbackExample />
```

---

## Support

For issues or questions:
- See the example file: `FormValidationFeedbackExample.tsx`
- Check the main documentation: `/frontend/docs`
- Open an issue on GitHub
