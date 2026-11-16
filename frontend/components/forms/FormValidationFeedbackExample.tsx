'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import {
  FormValidationFeedback,
  FieldValidationFeedback,
  ValidatedInputWrapper,
  type FieldError,
} from './FormValidationFeedback';

/**
 * Example component demonstrating all validation feedback variants
 */
export default function FormValidationFeedbackExample() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isValidatingEmail, setIsValidatingEmail] = React.useState(false);
  const [emailError, setEmailError] = React.useState('');
  const [formErrors, setFormErrors] = React.useState<FieldError[]>([]);
  const [formSuccess, setFormSuccess] = React.useState('');

  // Simulate async email validation
  const validateEmail = React.useCallback(async (value: string) => {
    setIsValidatingEmail(true);
    setEmailError('');

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (!value.includes('@')) {
      setEmailError('Please enter a valid email address');
    } else if (value === 'taken@example.com') {
      setEmailError('This email is already registered');
    }

    setIsValidatingEmail(false);
  }, []);

  // Debounced email validation
  React.useEffect(() => {
    if (email) {
      const timer = setTimeout(() => {
        validateEmail(email);
      }, 500);

      return () => clearTimeout(timer);
    } else {
      setEmailError('');
    }
  }, [email, validateEmail]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous feedback
    setFormErrors([]);
    setFormSuccess('');

    // Validate form
    const errors: FieldError[] = [];

    if (!email) {
      errors.push({ field: 'Email', message: 'Email is required' });
    } else if (!email.includes('@')) {
      errors.push({ field: 'Email', message: 'Invalid email format' });
    }

    if (!password) {
      errors.push({ field: 'Password', message: 'Password is required' });
    } else if (password.length < 8) {
      errors.push({
        field: 'Password',
        message: 'Password must be at least 8 characters',
      });
    }

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    // Success
    setFormSuccess('Account created successfully! Redirecting...');
    setEmail('');
    setPassword('');
  };

  return (
    <div className="mx-auto max-w-4xl space-y-12 p-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold">Form Validation Feedback Examples</h1>
        <p className="text-muted-foreground">
          Comprehensive examples of validation feedback components
        </p>
      </div>

      {/* ====================================================================== */}
      {/* Example 1: Form-Level Feedback */}
      {/* ====================================================================== */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">1. Form-Level Feedback</h2>
        <p className="text-sm text-muted-foreground">
          Display validation messages for the entire form
        </p>

        <div className="space-y-4">
          <FormValidationFeedback
            error="Invalid email or password. Please try again."
          />

          <FormValidationFeedback
            errors={[
              { field: 'Email', message: 'Email is required' },
              { field: 'Password', message: 'Password must be at least 8 characters' },
              { field: 'Terms', message: 'You must accept the terms and conditions' },
            ]}
          />

          <FormValidationFeedback
            success="Your account has been created successfully!"
            autoDismiss={5000}
          />

          <FormValidationFeedback
            warning="Your session will expire in 5 minutes. Please save your work."
            dismissible
            onDismiss={() => console.log('Warning dismissed')}
          />

          <FormValidationFeedback
            info="Make sure to use a strong password with at least 8 characters."
          />

          <FormValidationFeedback
            isValidating
            validatingMessage="Creating your account..."
          />
        </div>
      </section>

      {/* ====================================================================== */}
      {/* Example 2: Field-Level Feedback */}
      {/* ====================================================================== */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">2. Field-Level Feedback</h2>
        <p className="text-sm text-muted-foreground">
          Display validation messages for individual fields
        </p>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email (with error)</label>
            <Input type="email" placeholder="email@example.com" />
            <FieldValidationFeedback error="This email is already registered" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Username (with success)</label>
            <Input placeholder="johndoe" defaultValue="johndoe" />
            <FieldValidationFeedback success="Username is available" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Password (with warning)</label>
            <Input type="password" placeholder="••••••••" defaultValue="password" />
            <FieldValidationFeedback warning="This password is commonly used. Consider a stronger password." />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Phone (with info)</label>
            <Input type="tel" placeholder="+1 (555) 000-0000" />
            <FieldValidationFeedback info="We'll send you a verification code" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Address (validating)</label>
            <Input placeholder="123 Main St" />
            <FieldValidationFeedback isValidating />
          </div>
        </div>
      </section>

      {/* ====================================================================== */}
      {/* Example 3: Validated Input Wrapper */}
      {/* ====================================================================== */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">3. Validated Input Wrapper</h2>
        <p className="text-sm text-muted-foreground">
          All-in-one component with label, input, and validation feedback
        </p>

        <div className="space-y-6">
          <ValidatedInputWrapper
            label="Email Address"
            id="email-success"
            required
            success="Email is available"
          >
            <Input
              id="email-success"
              type="email"
              placeholder="email@example.com"
              defaultValue="john@example.com"
            />
          </ValidatedInputWrapper>

          <ValidatedInputWrapper
            label="Password"
            id="password-error"
            required
            error="Password must be at least 8 characters"
          >
            <Input
              id="password-error"
              type="password"
              placeholder="••••••••"
              defaultValue="pass"
            />
          </ValidatedInputWrapper>

          <ValidatedInputWrapper
            label="Username"
            id="username-validating"
            required
            isValidating
          >
            <Input
              id="username-validating"
              placeholder="johndoe"
              defaultValue="checking"
            />
          </ValidatedInputWrapper>

          <ValidatedInputWrapper
            label="Phone Number"
            id="phone-hint"
            hint="Format: +1 (555) 000-0000"
          >
            <Input id="phone-hint" type="tel" placeholder="+1 (555) 000-0000" />
          </ValidatedInputWrapper>
        </div>
      </section>

      {/* ====================================================================== */}
      {/* Example 4: Inline Feedback */}
      {/* ====================================================================== */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">4. Inline Feedback</h2>
        <p className="text-sm text-muted-foreground">
          Minimal feedback without borders or backgrounds
        </p>

        <div className="space-y-4">
          <FormValidationFeedback
            inline
            error="Please correct the errors below"
          />

          <FormValidationFeedback
            inline
            errors={[
              { field: 'Email', message: 'Invalid format' },
              { field: 'Password', message: 'Too short' },
            ]}
          />

          <FormValidationFeedback
            inline
            success="All fields are valid"
            showIcon={false}
          />
        </div>
      </section>

      {/* ====================================================================== */}
      {/* Example 5: Working Form */}
      {/* ====================================================================== */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">5. Working Form Example</h2>
        <p className="text-sm text-muted-foreground">
          Complete registration form with real-time validation
        </p>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border p-6">
          <FormValidationFeedback
            errors={formErrors}
            success={formSuccess}
            autoDismiss={formSuccess ? 3000 : undefined}
          />

          <ValidatedInputWrapper
            label="Email Address"
            id="email-working"
            required
            error={emailError}
            success={email && !emailError && !isValidatingEmail ? 'Email is valid' : undefined}
            isValidating={isValidatingEmail}
            hint="Try: taken@example.com to see error"
          >
            <Input
              id="email-working"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={emailError ? 'border-destructive' : ''}
            />
          </ValidatedInputWrapper>

          <ValidatedInputWrapper
            label="Password"
            id="password-working"
            required
            hint="Must be at least 8 characters"
          >
            <Input
              id="password-working"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </ValidatedInputWrapper>

          <button
            type="submit"
            className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          >
            Create Account
          </button>
        </form>
      </section>

      {/* ====================================================================== */}
      {/* Example 6: Custom Styling */}
      {/* ====================================================================== */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">6. Custom Styling</h2>
        <p className="text-sm text-muted-foreground">
          Customize appearance with className prop
        </p>

        <div className="space-y-4">
          <FormValidationFeedback
            error="Custom styled error message"
            className="rounded-xl shadow-lg"
          />

          <FormValidationFeedback
            success="Success with custom styling"
            className="border-2 font-semibold"
          />

          <FieldValidationFeedback
            warning="Custom field warning"
            className="rounded bg-yellow-100 px-2 py-1"
          />
        </div>
      </section>

      {/* ====================================================================== */}
      {/* Example 7: Accessibility Features */}
      {/* ====================================================================== */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">7. Accessibility Features</h2>
        <p className="text-sm text-muted-foreground">
          All components include proper ARIA attributes
        </p>

        <div className="space-y-4 rounded-lg border p-6">
          <ul className="list-inside list-disc space-y-2 text-sm">
            <li>Error messages use <code>role="alert"</code> and <code>aria-live="assertive"</code></li>
            <li>Success/info messages use <code>aria-live="polite"</code></li>
            <li>Validation icons provide visual feedback for screen readers</li>
            <li>Form fields are properly labeled with <code>htmlFor</code> attributes</li>
            <li>Required fields are marked with asterisk and ARIA attributes</li>
            <li>Error messages are associated with their fields via ARIA</li>
          </ul>
        </div>
      </section>

      {/* ====================================================================== */}
      {/* Usage Tips */}
      {/* ====================================================================== */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage Tips</h2>

        <div className="space-y-4 rounded-lg border p-6">
          <div>
            <h3 className="mb-2 font-semibold">When to use form-level feedback:</h3>
            <ul className="ml-6 list-disc space-y-1 text-sm">
              <li>Multiple validation errors across different fields</li>
              <li>Form submission success/failure messages</li>
              <li>General form-wide warnings or information</li>
            </ul>
          </div>

          <div>
            <h3 className="mb-2 font-semibold">When to use field-level feedback:</h3>
            <ul className="ml-6 list-disc space-y-1 text-sm">
              <li>Real-time validation as user types</li>
              <li>Field-specific hints or instructions</li>
              <li>Async validation states (checking availability)</li>
            </ul>
          </div>

          <div>
            <h3 className="mb-2 font-semibold">Best practices:</h3>
            <ul className="ml-6 list-disc space-y-1 text-sm">
              <li>Show errors only after field blur or form submission</li>
              <li>Provide immediate positive feedback for correct input</li>
              <li>Use loading states for async validation</li>
              <li>Keep error messages clear, specific, and actionable</li>
              <li>Auto-dismiss success messages after 3-5 seconds</li>
              <li>Place form-level feedback at the top of the form</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
