# Form Validation Feedback - Quick Reference

## Import

```tsx
import {
  FormValidationFeedback,
  FieldValidationFeedback,
  ValidatedInputWrapper,
  type FieldError,
} from '@/components/forms';
```

---

## FormValidationFeedback - Quick Examples

### Error Message
```tsx
<FormValidationFeedback error="Invalid credentials" />
```

### Multiple Errors
```tsx
<FormValidationFeedback
  errors={[
    { field: 'Email', message: 'Required' },
    { field: 'Password', message: 'Too short' }
  ]}
/>
```

### Success Message
```tsx
<FormValidationFeedback success="Account created!" />
```

### Auto-Dismiss Success
```tsx
<FormValidationFeedback 
  success="Saved!" 
  autoDismiss={5000}
/>
```

### Warning
```tsx
<FormValidationFeedback warning="Session expiring soon" />
```

### Info
```tsx
<FormValidationFeedback info="Remember to save your work" />
```

### Loading State
```tsx
<FormValidationFeedback 
  isValidating 
  validatingMessage="Submitting..."
/>
```

### Dismissible
```tsx
<FormValidationFeedback
  warning="Warning message"
  dismissible
  onDismiss={() => console.log('Dismissed')}
/>
```

### Inline (No Border/Background)
```tsx
<FormValidationFeedback 
  inline 
  error="Please fix errors below" 
/>
```

---

## FieldValidationFeedback - Quick Examples

### Error
```tsx
<FieldValidationFeedback error="Email is required" />
```

### Success
```tsx
<FieldValidationFeedback success="Username available" />
```

### Warning
```tsx
<FieldValidationFeedback warning="Weak password" />
```

### Info/Hint
```tsx
<FieldValidationFeedback info="Must be 8+ characters" />
```

### Loading
```tsx
<FieldValidationFeedback isValidating />
```

---

## ValidatedInputWrapper - Quick Examples

### With Error
```tsx
<ValidatedInputWrapper
  label="Email"
  id="email"
  required
  error="Invalid email"
>
  <Input id="email" type="email" />
</ValidatedInputWrapper>
```

### With Success
```tsx
<ValidatedInputWrapper
  label="Username"
  id="username"
  success="Available"
>
  <Input id="username" />
</ValidatedInputWrapper>
```

### With Hint
```tsx
<ValidatedInputWrapper
  label="Password"
  id="password"
  hint="8+ characters required"
>
  <Input id="password" type="password" />
</ValidatedInputWrapper>
```

### Validating State
```tsx
<ValidatedInputWrapper
  label="Email"
  id="email"
  isValidating
>
  <Input id="email" />
</ValidatedInputWrapper>
```

---

## Complete Form Example

```tsx
const [errors, setErrors] = useState<FieldError[]>([]);
const [success, setSuccess] = useState('');

<form onSubmit={handleSubmit}>
  <FormValidationFeedback 
    errors={errors} 
    success={success} 
  />

  <ValidatedInputWrapper
    label="Email"
    id="email"
    required
    error={emailError}
  >
    <Input 
      id="email" 
      type="email" 
      value={email}
      onChange={e => setEmail(e.target.value)}
    />
  </ValidatedInputWrapper>

  <button type="submit">Submit</button>
</form>
```

---

## Props Cheatsheet

### FormValidationFeedback
| Prop | Type | Description |
|------|------|-------------|
| `error` | string | Single error message |
| `errors` | FieldError[] | Multiple field errors |
| `success` | string | Success message |
| `warning` | string | Warning message |
| `info` | string | Info message |
| `isValidating` | boolean | Show loading state |
| `validatingMessage` | string | Custom loading message |
| `inline` | boolean | Remove border/background |
| `showIcon` | boolean | Display status icon |
| `autoDismiss` | number | Auto-hide after ms |
| `dismissible` | boolean | Show close button |
| `onDismiss` | () => void | Dismiss callback |

### FieldValidationFeedback
| Prop | Type | Description |
|------|------|-------------|
| `error` | string | Error message |
| `success` | string | Success message |
| `warning` | string | Warning message |
| `info` | string | Info/hint message |
| `isValidating` | boolean | Show loading state |
| `showIcon` | boolean | Display status icon |

### ValidatedInputWrapper
| Prop | Type | Description |
|------|------|-------------|
| `label` | string | Input label |
| `id` | string | Input ID |
| `required` | boolean | Show required indicator |
| `error` | string | Error message |
| `success` | string | Success message |
| `warning` | string | Warning message |
| `hint` | string | Helper text |
| `isValidating` | boolean | Show loading state |
| `children` | ReactNode | Input component |

---

## Status Colors

| Status | Color | Icon | Use Case |
|--------|-------|------|----------|
| `error` | Red | XCircle | Validation errors |
| `success` | Green | CheckCircle2 | Successful validation |
| `warning` | Yellow | AlertCircle | Non-critical issues |
| `info` | Blue | Info | Helpful information |
| `validating` | Gray | Loader2 (spinning) | Async validation |

---

## Common Patterns

### Async Email Validation
```tsx
const [email, setEmail] = useState('');
const [isValidating, setIsValidating] = useState(false);
const [error, setError] = useState('');

useEffect(() => {
  if (!email) return;
  
  const timer = setTimeout(async () => {
    setIsValidating(true);
    const available = await checkEmail(email);
    setError(available ? '' : 'Email taken');
    setIsValidating(false);
  }, 500);
  
  return () => clearTimeout(timer);
}, [email]);

<ValidatedInputWrapper
  label="Email"
  id="email"
  error={error}
  isValidating={isValidating}
>
  <Input id="email" value={email} onChange={e => setEmail(e.target.value)} />
</ValidatedInputWrapper>
```

### Form Submission Errors
```tsx
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  
  try {
    await submitForm(data);
    setSuccess('Saved successfully!');
    setErrors([]);
  } catch (err) {
    if (err.fieldErrors) {
      setErrors(err.fieldErrors);
    } else {
      setErrors([{ field: 'Form', message: err.message }]);
    }
  }
};
```

### Password Strength
```tsx
const [password, setPassword] = useState('');
const strength = getPasswordStrength(password);

<ValidatedInputWrapper
  label="Password"
  id="password"
  warning={strength === 'weak' ? 'Weak password' : undefined}
  success={strength === 'strong' ? 'Strong password' : undefined}
  hint="Use 8+ characters with mixed case, numbers, and symbols"
>
  <Input 
    id="password" 
    type="password"
    value={password}
    onChange={e => setPassword(e.target.value)}
  />
</ValidatedInputWrapper>
```

---

## Accessibility Quick Wins

✅ Use `ValidatedInputWrapper` for automatic label association  
✅ Provide `hint` prop for helper text  
✅ Mark required fields with `required` prop  
✅ Error messages are announced to screen readers  
✅ Icons provide redundant visual cues  
✅ Proper ARIA roles and live regions  

---

## Testing Snippets

```tsx
// Test error display
render(<FormValidationFeedback error="Test error" />);
expect(screen.getByText('Test error')).toBeInTheDocument();

// Test field error
render(<FieldValidationFeedback error="Required" />);
expect(screen.getByRole('alert')).toHaveTextContent('Required');

// Test auto-dismiss
const onDismiss = jest.fn();
render(
  <FormValidationFeedback 
    success="Done" 
    autoDismiss={1000}
    onDismiss={onDismiss}
  />
);
await waitFor(() => expect(onDismiss).toHaveBeenCalled(), { timeout: 1500 });
```

---

## Tips

💡 Debounce async validation (500ms recommended)  
💡 Show errors on blur, not while typing  
💡 Auto-dismiss success messages after 3-5s  
💡 Keep error messages concise and actionable  
💡 Use form-level feedback for submission results  
💡 Use field-level feedback for real-time validation  

---

For full documentation, see [README.md](./README.md)
