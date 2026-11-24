# Frontend Contributing Guide

> **Setting up locally?** Follow the root [Quickstart](../QUICKSTART.md) — it is the single documented path from clone to a running stack.

This document provides comprehensive guidelines for contributing to the Chioma frontend. It covers project architecture, design system, component development, testing requirements, and CI/CD pipeline expectations.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Theme & Design System](#theme--design-system)
3. [Project Structure](#project-structure)
4. [Component Architecture](#component-architecture)
5. [Creating Components](#creating-components)
6. [Editing & Maintaining Code](#editing--maintaining-code)
7. [Internationalization (i18n)](#internationalization-i18n)
5. [Component API Conventions](#component-api-conventions)
6. [Creating Components](#creating-components)
7. [Editing & Maintaining Code](#editing--maintaining-code)
8. [PR Requirements & CI/CD Pipeline](#pr-requirements--cicd-pipeline)
9. [Development Workflow](#development-workflow)
10. [Best Practices](#best-practices)

---

## Project Overview

**Chioma** is a modern Next.js 16 application built with:

- **Framework**: Next.js 16.1.5 with App Router
- **Styling**: Tailwind CSS 4 with PostCSS
- **UI Components**: Custom components + Lucide React icons
- **State Management**: Zustand + React Context
- **Forms**: React Hook Form + Zod validation
- **Testing**: Vitest + Storybook
- **Code Quality**: ESLint + Prettier
- **Package Manager**: pnpm

### Tech Stack

```
Frontend: Next.js 16 + React 19
Styling: Tailwind CSS 4
Icons: Lucide React
Forms: React Hook Form + Zod
State: Zustand + Context API
Testing: Vitest + Storybook
```

---

## Theme & Design System

### Color Palette

The frontend uses a **dark-themed, modern design** with a blue/indigo accent color scheme:

```
Primary Colors:
- Blue: #3B82F6 (blue-500)
- Indigo: #4F46E5 (indigo-600)
- Emerald: #10B981 (emerald-600) - for success states

Neutral Colors:
- Slate-800: #1E293B - dark backgrounds
- Slate-700: #334155 - secondary backgrounds
- White/Blue-200: text on dark backgrounds

Semantic Colors:
- Red: errors and destructive actions
- Yellow: warnings
- Green: success states
- Blue: info and primary actions
```

### Tailwind Configuration

The project uses Tailwind CSS 4 with custom configuration in `tailwind.config.ts`. Key features:

- Dark mode by default
- Custom spacing and sizing
- Optimized for mobile-first responsive design
- Backdrop blur effects for modern UI

### Using the Theme

When creating components, follow these patterns:

```tsx
// Dark background with border
<div className="bg-slate-800/50 border border-white/10 rounded-2xl">

// Text on dark background
<p className="text-blue-200/70">Secondary text</p>
<p className="text-white">Primary text</p>

// Gradient accents
<p className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
  Gradient text
</p>

// Hover states
<button className="hover:bg-slate-700 hover:text-red-400 transition-all">
  Interactive element
</button>

// Responsive design
<div className="text-sm sm:text-base md:text-lg">
  Responsive text
</div>
```

### Component Styling Patterns

1. **Backdrop Effects**: Use `backdrop-blur-xl` for modern glass-morphism effects
2. **Shadows**: Use `shadow-lg` and `shadow-2xl` for depth
3. **Transitions**: Always include `transition-all duration-300` for smooth interactions
4. **Borders**: Use `border border-white/10` for subtle dividers
5. **Opacity**: Use opacity modifiers (`/50`, `/70`, `/90`) for layering

---

## Project Structure

```
frontend/
├── app/                          # Next.js App Router pages
│   ├── admin/                    # Admin dashboard routes
│   ├── user/                     # User dashboard routes
│   ├── properties/               # Property listing routes
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   └── error.tsx                 # Global error boundary
│
├── components/                   # Reusable React components
│   ├── ui/                       # Base UI components (buttons, modals, etc.)
│   ├── properties/               # Property-related components
│   ├── dashboard/                # Dashboard components
│   ├── admin/                    # Admin-specific components
│   ├── forms/                    # Form components
│   ├── error/                    # Error handling components
│   ├── blockchain/               # Blockchain/Stellar integration
│   ├── wizard/                   # Multi-step wizard components
│   └── [feature]/                # Feature-specific component groups
│
├── lib/                          # Utility functions and helpers
│   ├── errors/                   # Error handling utilities
│   ├── api.ts                    # API client configuration
│   └── [utilities]/              # Other helper functions
│
├── contexts/                     # React Context providers
├── store/                        # Zustand state management
├── types/                        # TypeScript type definitions
├── constants/                    # Application constants
├── public/                       # Static assets
├── stories/                      # Storybook stories
├── __tests__/                    # Test files
│
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── next.config.ts                # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── eslint.config.mjs             # ESLint configuration
├── .prettierrc                   # Prettier configuration
├── vitest.config.ts              # Vitest configuration
└── Makefile                      # Development commands
```

### Key Directories Explained

**`app/`** - Next.js App Router pages

- Organized by feature/role (admin, user, etc.)
- Each route can have `layout.tsx`, `page.tsx`, `error.tsx`, `loading.tsx`
- Use `'use client'` directive for client components

**`components/`** - Reusable components

- Organized by feature or UI layer
- `ui/` contains base components (buttons, modals, spinners)
- Feature folders contain domain-specific components
- Each component should be self-contained with its own types

**`lib/`** - Utilities and helpers

- `errors/` - centralized error handling
- API client configuration
- Helper functions for common tasks

**`store/`** - Global state with Zustand

- Organized by feature
- Each store file exports hooks for component usage

**`types/`** - TypeScript definitions

- Shared types used across the app
- API response types
- Component prop interfaces

---

## Component Architecture

### Component Organization

Each component should follow this structure:

```tsx
// components/features/MyComponent.tsx

'use client'; // Add if component uses hooks/interactivity

import { ReactNode } from 'react';
import { SomeIcon } from 'lucide-react';

// 1. Type definitions
interface MyComponentProps {
  title: string;
  children?: ReactNode;
  variant?: 'primary' | 'secondary';
  isLoading?: boolean;
}

// 2. Component implementation
export default function MyComponent({
  title,
  children,
  variant = 'primary',
  isLoading = false,
}: MyComponentProps) {
  return (
    <div
      className={`bg-slate-800/50 border border-white/10 rounded-2xl p-5 ${
        variant === 'primary' ? 'border-blue-400/30' : 'border-white/10'
      }`}
    >
      <h2 className="text-white font-bold text-lg">{title}</h2>
      {isLoading ? <div className="animate-pulse">Loading...</div> : children}
    </div>
  );
}
```

### Component Types

1. **UI Components** (`components/ui/`)
   - Base, reusable components
   - No business logic
   - Highly configurable via props
   - Examples: Button, Modal, Spinner, Toast

2. **Feature Components** (`components/[feature]/`)
   - Domain-specific components
   - May contain business logic
   - Use hooks and state management
   - Examples: PropertyCard, DashboardLayout, WizardStep

3. **Page Components** (`app/[route]/page.tsx`)
   - Route-level components
   - Compose feature components
   - Handle data fetching
   - Use `'use client'` when needed

### Component Patterns

**Controlled vs Uncontrolled Components**

```tsx
// Controlled - parent manages state
<input
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>

// Uncontrolled - component manages state
<input defaultValue={initialValue} />
```

**Composition Pattern**

```tsx
// ✅ Good - flexible and composable
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
  <Card.Footer>Actions</Card.Footer>
</Card>

// ❌ Avoid - rigid and hard to customize
<Card title="Title" content="Content" footer="Actions" />
```

**Render Props Pattern**

```tsx
<DataTable
  data={items}
  renderRow={(item) => (
    <tr>
      <td>{item.name}</td>
    </tr>
  )}
/>
```

---

## Component API Conventions

These conventions keep component APIs predictable across `components/ui/` and feature folders. When you add or change a component, follow them unless there is a documented reason not to. Existing examples: [`ui/badge.tsx`](./components/ui/badge.tsx), [`ui/tag.tsx`](./components/ui/tag.tsx), [`ui/Skeleton.tsx`](./components/ui/Skeleton.tsx), [`notifications/Toast.tsx`](./components/notifications/Toast.tsx).

### Prop Naming

| Kind of prop         | Convention                                        | Examples                                    |
| -------------------- | ------------------------------------------------- | ------------------------------------------- |
| Visual style         | `variant` (one string union per component)        | `variant="success"`, `variant="outline"`    |
| Dimensions           | `size` with `sm` / `md` / `lg`                    | `size="sm"`                                 |
| Boolean state        | Plain adjective, or `is*` / `has*` when ambiguous | `disabled`, `open`, `isLoading`, `hasError` |
| Boolean feature flag | Name the feature; default it to the common case   | `animate`, `pauseOnHover`, `media`          |
| Content              | `children` for main content; nouns for slots      | `title`, `message`, `icon`, `action`        |
| Callbacks            | `on` + past/present-tense event                   | `onRemove`, `onDismiss`, `onChange`         |
| Styling escape hatch | `className`, merged last with `cn()`              | `className="w-1/2"`                         |
| Accessible text      | `*Label` for text read only by assistive tech     | `removeLabel`, `label` (`SkeletonGroup`)    |
| Controlled value     | `value` + `onChange`; uncontrolled `default*`     | `value`, `defaultValue`, `defaultOpen`      |

**Rules**

- Prefer the native attribute name when one exists (`disabled`, not `isDisabled`; `placeholder`, not `hint`).
- Booleans should default to `false` _or_ to the behaviour most callers want — never require `prop={true}` for normal use.
- Use units in names when a number is not obvious: `duration` is always milliseconds and documented as such.
- Don't abbreviate (`message`, not `msg`; `columns`, not `cols`).

```tsx
// ✅ Good
<Tag
  variant="info"
  onRemove={() => removeFilter(id)}
  removeLabel="Remove Lagos filter"
>
  Lagos
</Tag>
<SkeletonText lines={3} animate={false} />

// ❌ Avoid
<Tag color="blue" deletable onDelete={handleDelete} txt="Lagos" />
<SkeletonText numLines={3} noAnimation />
```

### Variants and Defaults

Define variants with `class-variance-authority` and export the variants function so other components can share the same color schemes (as `Tag` reuses `badgeVariants`):

```tsx
const badgeVariants = cva('inline-flex items-center rounded-full border ...', {
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground',
      success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
      warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    },
  },
  defaultVariants: { variant: 'default' },
});

export { Badge, badgeVariants };
```

Set defaults in the parameter list, not inside the body:

```tsx
export function SkeletonText({
  lines = 3,
  animate = true,
  className,
}: SkeletonTextProps) {
  // ...
}
```

### Event Handling

- **Props** that accept callbacks are named `on<Event>`; the **internal functions** that implement them are named `handle<Event>`.
- Callbacks are optional (`onRemove?: () => void`) unless the component is useless without them. Hide the related UI when the callback is missing (e.g. `Tag` hides its remove button without `onRemove`).
- Pass the most useful value first, not the raw DOM event, for component-level events: `onChange(value)`, `onDismiss(id)`, `onPageChange(page)`.
- When you wrap a native event prop, **call the consumer's handler first** and respect `event.defaultPrevented`, so callers can opt out of the default behaviour.
- Always set `type="button"` on buttons that are not form submits.

```tsx
interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  onRemove?: () => void; // component-level event: no DOM event payload
}

function Tag({ onRemove, onKeyDown, ...props }: TagProps) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
    onKeyDown?.(event); // 1. consumer handler first
    if (event.defaultPrevented || !onRemove) return; // 2. allow opt-out
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      onRemove(); // 3. component behaviour
    }
  };

  return (
    <span onKeyDown={handleKeyDown} {...props}>
      ...
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label="Remove tag">
          <X aria-hidden="true" />
        </button>
      )}
    </span>
  );
}
```

For imperative APIs (toasts, dialogs), expose a small object of verbs and keep the signature consistent across methods:

```tsx
toast.success('Payment received', '200 USDC credited');
toast.warning('Rent due soon', 'Due in 3 days', { duration: 8000 });
toast.error('Upload failed', undefined, {
  duration: Infinity, // stays until dismissed
  action: { label: 'Retry', onClick: retryUpload },
});
```

### TypeScript Patterns

**1. Name props `<Component>Props` and export them.**

```tsx
export interface SkeletonAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  shape?: 'circle' | 'square';
}
```

**2. Extend native element attributes** for components that render a single DOM element, then spread `...props` onto it so `id`, `data-*`, `aria-*` and handlers work. Use `Omit` to replace attributes whose type you change.

```tsx
export interface TagProps
  extends
    Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'>,
    VariantProps<typeof badgeVariants> {
  children: React.ReactNode;
  onRemove?: () => void;
}
```

**3. Derive variant types from `cva`** with `VariantProps<typeof xVariants>` instead of repeating string unions.

**4. Use string unions or `as const` objects, not enums.**

```tsx
const AVATAR_SIZES = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
} as const;

interface SkeletonAvatarProps {
  size?: keyof typeof AVATAR_SIZES;
}
```

**5. Use discriminated unions when props depend on each other.**

```tsx
type StatusMessageProps =
  | { kind: 'empty'; title: string }
  | { kind: 'error'; title: string; onRetry: () => void };
```

**6. Use generics for data-driven components** so callers keep their item types.

```tsx
interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  getKey: (item: T) => string;
}
```

**7. Forward refs for primitives** that wrap focusable elements (inputs, buttons) using `React.forwardRef`, as in `ui/button.tsx`, and set `displayName`.

**8. No `any`.** Use `unknown` and narrow, or a precise type. Type event handlers with React's types (`React.ChangeEvent<HTMLInputElement>`).

### Composition and Accessibility

- Prefer small composable primitives over large configurable components. `SkeletonLoader` offers ready-made layouts, but custom loading states compose `Skeleton`, `SkeletonText` and `SkeletonAvatar`:

  ```tsx
  <SkeletonGroup label="Loading tenants">
    <div className="flex items-center gap-3">
      <SkeletonAvatar />
      <Skeleton className="h-4 w-1/2" />
    </div>
  </SkeletonGroup>
  ```

- Decorative elements (icons, skeleton blocks) get `aria-hidden="true"`.
- Icon-only buttons need an `aria-label`; let callers override it via a `*Label` prop.
- Live updates use `role="status"` / `aria-live="polite"`; errors use `role="alert"` / `aria-live="assertive"` (see `ToastItem`).
- Respect reduced motion for animations (`motion-reduce:animate-none`).

### Checklist for a New Component API

- [ ] Props interface named `<Component>Props` and exported
- [ ] Native attributes extended and spread when rendering a single element
- [ ] `className` accepted and merged last with `cn()`
- [ ] Callbacks named `on*`, internal handlers named `handle*`
- [ ] Sensible defaults set in the parameter list
- [ ] Accessible names for icon-only controls; decorative elements hidden
- [ ] Storybook story covering each variant

---

## Creating Components

### Step 1: Plan Your Component

Before coding, ask yourself:

- Is this a reusable UI component or feature-specific?
- What props does it need?
- What state does it manage?
- Does it need error handling?
- Should it have a Storybook story?

### Step 2: Create the Component File

```bash
# For UI components
touch frontend/components/ui/MyButton.tsx

# For feature components
touch frontend/components/properties/PropertyFilter.tsx
```

### Step 3: Implement with TypeScript

```tsx
// components/ui/MyButton.tsx

'use client';

import { ReactNode } from 'react';

interface MyButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  isLoading?: boolean;
}

export default function MyButton({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  isLoading = false,
}: MyButtonProps) {
  const baseStyles = 'px-4 py-2 rounded-lg font-medium transition-all';

  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-slate-700 text-white hover:bg-slate-600',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variantStyles[variant]} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  );
}
```

### Step 4: Add TypeScript Types

Create a `types.ts` file for complex components:

```tsx
// components/properties/types.ts

export interface Property {
  id: number;
  title: string;
  price: number;
  location: string;
  beds: number;
  baths: number;
  sqft: number;
  image: string;
  verified: boolean;
}

export interface PropertyCardProps {
  property: Property;
  variant?: 'grid' | 'list';
  onSelect?: (id: number) => void;
}
```

### Step 5: Create a Storybook Story

```tsx
// components/ui/MyButton.stories.tsx

import type { Meta, StoryObj } from '@storybook/react';
import MyButton from './MyButton';

const meta = {
  title: 'UI/MyButton',
  component: MyButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof MyButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    children: 'Click me',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Secondary Button',
    variant: 'secondary',
  },
};

export const Loading: Story = {
  args: {
    children: 'Submit',
    isLoading: true,
  },
};
```

### Step 6: Add Tests (Optional but Recommended)

```tsx
// __tests__/MyButton.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyButton from '@/components/ui/MyButton';

describe('MyButton', () => {
  it('renders with children', () => {
    render(<MyButton>Click me</MyButton>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', async () => {
    const handleClick = vi.fn();
    render(<MyButton onClick={handleClick}>Click me</MyButton>);

    await userEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalled();
  });

  it('disables button when loading', () => {
    render(<MyButton isLoading>Submit</MyButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Step 7: Export from Index File

```tsx
// components/ui/index.ts

export { default as MyButton } from './MyButton';
export type { MyButtonProps } from './MyButton';
```

---

## Editing & Maintaining Code

### Code Style Guidelines

**TypeScript**

```tsx
// ✅ Always use explicit types
interface UserProps {
  name: string;
  age: number;
  email?: string; // optional
}

// ❌ Avoid 'any'
const user: any = {};

// ✅ Use const for immutability
const items = [1, 2, 3];

// ❌ Avoid let unless necessary
let items = [1, 2, 3];
```

**React Components**

```tsx
// ✅ Use functional components
export default function MyComponent() {
  return <div>Hello</div>;
}

// ❌ Avoid class components
class MyComponent extends React.Component {}

// ✅ Use hooks for state
const [count, setCount] = useState(0);

// ✅ Use 'use client' for client-side features
('use client');
```

**Tailwind CSS**

```tsx
// ✅ Use Tailwind classes
<div className="bg-slate-800 text-white p-4 rounded-lg">

// ❌ Avoid inline styles
<div style={{ backgroundColor: '#1e293b', color: 'white' }}>

// ✅ Use responsive prefixes
<div className="text-sm sm:text-base md:text-lg">

// ✅ Extract repeated classes to components
const Card = ({ children }) => (
  <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-5">
    {children}
  </div>
);
```

### File Naming Conventions

```
Components:        PascalCase (MyComponent.tsx)
Hooks:             camelCase (useMyHook.ts)
Utilities:         camelCase (formatDate.ts)
Types:             PascalCase (User.ts)
Constants:         UPPER_SNAKE_CASE (API_BASE_URL.ts)
Tests:             [name].test.tsx
Stories:           [name].stories.tsx
```

### Organizing Imports

```tsx
// 1. External libraries
import { useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';

// 2. Internal components
import { Button } from '@/components/ui';
import { PropertyCard } from '@/components/properties';

// 3. Internal utilities
import { formatPrice } from '@/lib/format';
import { usePropertyStore } from '@/store/properties';

// 4. Types
import type { Property } from '@/types/property';
```

### Refactoring Checklist

When modifying existing code:

- [ ] Update TypeScript types if props change
- [ ] Update component tests
- [ ] Update Storybook stories
- [ ] Check for breaking changes in dependent components
- [ ] Update documentation/comments
- [ ] Run `make check` to verify all checks pass
- [ ] Test responsive design on mobile/tablet/desktop

### Common Patterns

**Error Handling**

```tsx
import { ClientErrorBoundary } from '@/components/error';

export default function MyPage() {
  return (
    <ClientErrorBoundary>
      <MyComponent />
    </ClientErrorBoundary>
  );
}
```

**Loading States**

```tsx
import { LoadingSpinner } from '@/components/ui';

export default function MyComponent() {
  const [isLoading, setIsLoading] = useState(false);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return <div>Content</div>;
}
```

**Form Handling**

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export default function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}
    </form>
  );
}
```

---

## Internationalization (i18n)

English (`en`) is the source of truth. Every other locale must have exactly the same keys as English. CI enforces this (see [What the Pipeline Checks](#what-the-pipeline-checks)).

### Translation File Structure

```text
frontend/
├── public/locales/               # JSON bundles, loaded at runtime
│   ├── en.json                   # Source of truth: add new keys here first
│   ├── es.json                   # Spanish
│   └── fr.json                   # French
├── lib/i18n/
│   ├── index.ts                  # Zustand locale store + useTranslation() hook (typed keys, formatters)
│   ├── translations/             # Typed TS dictionaries used by index.ts
│   │   ├── en.ts                 # Exports the `TranslationKeys` interface + English strings
│   │   ├── es.ts, fr.ts, ar.ts   # Typed as `TranslationKeys`; a missing key is a type error
│   │   └── index.ts
│   ├── locales.ts                # SUPPORTED_LOCALES / FALLBACK_LOCALE for the JSON bundles
│   ├── translation-loader.ts     # Fetches /locales/<locale>.json (reads from disk in Node)
│   ├── translate.ts              # Key resolution, English fallback, {{var}} interpolation
│   └── useTranslation.ts         # Hook for the JSON bundles
├── lib/utils/format.ts           # Locale-aware number, currency, crypto and date formatting
└── scripts/i18n-audit.mjs        # Validates the JSON bundles (used in CI)
```

There are two sets of dictionaries:

- **Typed dictionaries** (`lib/i18n/translations/*.ts`) are used through `useTranslation()` from `@/lib/i18n`. TypeScript checks keys and values, so a key missing from a locale fails `pnpm run build`.
- **JSON bundles** (`public/locales/*.json`) are fetched at runtime through `useTranslation()` from `@/lib/i18n/useTranslation`. They are checked by `pnpm run i18n:audit` and by `__tests__/i18n/translation-coverage.test.ts`.

### Example: `en.json` and a Translation

Group keys by feature, and nest them at most two levels deep.

`public/locales/en.json`:

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel"
  },
  "booking": {
    "nights": "{{count}} nights",
    "confirmBooking": "Confirm Booking"
  }
}
```

`public/locales/es.json` has the same keys with translated values:

```json
{
  "common": {
    "save": "Guardar",
    "cancel": "Cancelar"
  },
  "booking": {
    "nights": "{{count}} noches",
    "confirmBooking": "Confirmar reserva"
  }
}
```

```tsx
const { t } = useTranslation();

t('common.save'); // "Guardar"
t('booking.nights', { count: 3 }); // "3 noches"
```

The full files are in [`public/locales/`](./public/locales/).

### Key Naming Conventions

- **Namespace by feature.** The first segment is the feature or area (`common`, `nav`, `auth`, `properties`, `booking`, `stellar`, ...). Only put strings shared across features in `common`.
- **camelCase segments**, separated by dots: `properties.searchPlaceholder`, not `properties.search_placeholder` or `Properties.SearchPlaceholder`.
- **Name the meaning, not the text.** Use `auth.invalidCredentials`, not `auth.wrongEmailOrPasswordPleaseTryAgain`, so the key stays valid when the copy changes.
- **Common suffixes:** `title`, `subtitle`, `label`, `placeholder`, `description`, `error`, `success`, `empty`.
- **Interpolation** uses `{{camelCaseName}}` placeholders. Keep the placeholder names identical in every locale and never translate them.
- **Values are always non-empty strings.** Do not use numbers, arrays, `null` or `""`. Do not join translated fragments in code; put the whole sentence in one key with placeholders.
- **Do not put formatted numbers, prices or dates in a string.** Pass the raw value through a formatter (see below) and interpolate the result.

### Translation Process

1. **Add the key to English first.** Add it to `public/locales/en.json`, or, for the typed dictionaries, to the `TranslationKeys` interface and the `en` object in `lib/i18n/translations/en.ts`.
2. **Add the key to every other locale.** If you can't translate it yet, run `pnpm run i18n:audit:fix`. It adds `[TODO: <English text>]` placeholders for missing JSON keys so the files stay complete. List the TODOs in your PR description.
3. **Remove keys from every locale at once.** The audit reports keys that exist in a locale but not in English as orphan keys.
4. **Run the audit** before you open a PR:

   ```bash
   cd frontend
   pnpm run i18n:audit                  # all locales
   pnpm run i18n:audit -- --locale es   # one locale
   ```

5. **Review translations.** A native or fluent speaker should review new or changed strings before release. Replace `[TODO: ...]` placeholders as soon as a translation is available.

#### Adding a New Locale

1. Copy `public/locales/en.json` to `public/locales/<code>.json` and translate every value.
2. Add the code to `SUPPORTED_LOCALES` and `LOCALE_NAMES` in `lib/i18n/locales.ts`.
3. For the typed dictionaries, create `lib/i18n/translations/<code>.ts` typed as `TranslationKeys` and export it from `translations/index.ts`. Then register it in `SupportedLocale`, `LOCALE_OPTIONS` and `TRANSLATIONS` in `lib/i18n/index.ts`. Set `dir: 'rtl'` for right-to-left languages.
4. Add the matching `date-fns` locale to `lib/utils/date-fns-locale.ts`.

### Number, Currency and Date Formatting

Never hardcode a locale (`toLocaleString('en-US')`, `new Intl.NumberFormat('en-US')`) or build values by hand like `` `$${amount}` ``. Use the formatters returned by `useTranslation()` from `@/lib/i18n`. They wrap `Intl` and follow the active locale:

```tsx
const { formatNumber, formatCurrency, formatCrypto, formatDate } =
  useTranslation();

formatNumber(1000); // en: "1,000"   fr: "1 000"   es: "1000"
formatCurrency(1250, 'USD'); // en: "$1,250.00"   fr: "1 250,00 $US"
formatCrypto(12.5, 'XLM'); // up to 7 decimals: "12.5 XLM"
formatDate(date, { month: 'short', day: 'numeric', year: 'numeric' });
formatDate(date, { hour: '2-digit', minute: '2-digit' }); // time only
```

Outside React components, import the same functions from `@/lib/utils/format`. They read the active locale from the store, or take an explicit locale argument. For `date-fns` helpers such as `formatDistanceToNow`, pass `{ locale: useDateFnsLocale() }` from `@/lib/utils/date-fns-locale`.

---

## PR Requirements & CI/CD Pipeline

### Before Creating a PR

Run the complete pipeline check locally:

```bash
cd frontend
make check
```

This runs:

1. **ESLint** - Code quality and style
2. **Prettier** - Code formatting
3. **Tests** - Unit and E2E tests
4. **Build** - Production build verification

### What the Pipeline Checks

#### 1. ESLint (Code Quality)

Checks for:

- Unused variables
- Missing dependencies
- Accessibility issues
- React best practices
- TypeScript errors

**Fix ESLint errors:**

```bash
cd frontend
pnpm run lint:fix
```

#### 2. Prettier (Code Formatting)

Ensures consistent formatting across the codebase.

**Format your code:**

```bash
cd frontend
pnpm run format
```

#### 3. Tests (Vitest)

Runs unit tests with coverage.

**Run tests locally:**

```bash
cd frontend
pnpm test
```

#### 4. Build (Next.js)

Verifies the production build succeeds.

**Build locally:**

```bash
cd frontend
pnpm run build
```

#### 5. Translations (i18n)

The `Check translation files` step runs `pnpm run i18n:audit`. It fails the pipeline if any `public/locales/*.json` file:

- is not valid JSON, or its root is not an object
- has a value that is not a non-empty string
- is missing a key that exists in `en.json`

Orphan keys (present in a locale but not in `en.json`) are reported as warnings. See [Internationalization (i18n)](#internationalization-i18n).

**Check translations locally:**

```bash
cd frontend
pnpm run i18n:audit
```

### PR Checklist

Before submitting a PR:

- [ ] Code follows project style guidelines
- [ ] All tests pass (`make check`)
- [ ] No console errors or warnings
- [ ] TypeScript types are correct
- [ ] Components are responsive (mobile/tablet/desktop)
- [ ] Accessibility is considered (ARIA labels, semantic HTML)
- [ ] Documentation is updated if needed
- [ ] New user-facing strings are added to every locale (`pnpm run i18n:audit`)
- [ ] Storybook stories are added for new UI components
- [ ] No breaking changes to existing components
- [ ] Commit messages are clear and descriptive

### PR Description Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues

Closes #123

## Testing

How to test these changes

## Screenshots (if applicable)

Add screenshots for UI changes

## Checklist

- [ ] Code follows style guidelines
- [ ] Tests pass locally (`make check`)
- [ ] No new warnings generated
- [ ] Documentation updated
```

### Common CI/CD Failures & Fixes

**ESLint Errors**

```bash
# View errors
pnpm run lint

# Auto-fix most errors
pnpm run lint:fix

# Manually fix remaining errors
```

**Prettier Formatting**

```bash
# Check formatting
pnpm run format:check

# Auto-format
pnpm run format
```

**Build Failures**

```bash
# Check for TypeScript errors
pnpm tsc --noEmit

# Build and see detailed errors
pnpm run build
```

**Test Failures**

```bash
# Run tests with verbose output
pnpm test -- --reporter=verbose

# Run specific test file
pnpm test MyComponent.test.tsx

# Watch mode for development
pnpm test:watch
```

---

## Development Workflow

### Setting Up Your Environment

```bash
# 1. Clone the repository
git clone <repo-url>
cd chioma

# 2. Install dependencies
cd frontend
pnpm install

# 3. Start development server
pnpm run dev

# 4. Open browser
# http://localhost:3000
```

### Daily Development Commands

```bash
# Start development server
pnpm run dev

# Run tests in watch mode
pnpm test:watch

# View Storybook
pnpm run storybook

# Check code quality
pnpm run lint

# Format code
pnpm run format

# Full pipeline check (before PR)
make check
```

### Git Workflow

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes and commit
git add .
git commit -m "feat: add new component"

# 3. Run pipeline checks
make check

# 4. Push and create PR
git push origin feature/my-feature
```

### Debugging Tips

**React DevTools**

- Install React DevTools browser extension
- Inspect component props and state
- Profile component renders

**Next.js DevTools**

- Built-in error overlay shows detailed errors
- Fast refresh for instant feedback

**Console Logging**

```tsx
// Use console for debugging
console.log('Component mounted', { props });
console.error('Error occurred:', error);
```

**Storybook for Component Development**

```bash
pnpm run storybook
# Develop components in isolation
# Test different prop combinations
# Document component usage
```

---

## Best Practices

### Performance

1. **Code Splitting**

   ```tsx
   // Use dynamic imports for large components
   const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
     loading: () => <LoadingSpinner />,
   });
   ```

2. **Image Optimization**

   ```tsx
   // Always use Next.js Image component
   import Image from 'next/image';

   <Image
     src="/image.jpg"
     alt="Description"
     width={400}
     height={300}
     priority // for above-the-fold images
   />;
   ```

3. **Memoization**
   ```tsx
   // Memoize expensive components
   export default memo(MyComponent);
   ```

### Accessibility

1. **Semantic HTML**

   ```tsx
   // ✅ Good
   <button onClick={handleClick}>Click me</button>

   // ❌ Avoid
   <div onClick={handleClick}>Click me</div>
   ```

2. **ARIA Labels**

   ```tsx
   <button aria-label="Close menu" onClick={closeMenu}>
     <X />
   </button>
   ```

3. **Keyboard Navigation**
   ```tsx
   // Ensure all interactive elements are keyboard accessible
   <input
     onKeyDown={(e) => {
       if (e.key === 'Enter') handleSubmit();
     }}
   />
   ```

### Security

1. **Sanitize User Input**

   ```tsx
   // Use libraries like DOMPurify for user-generated content
   import DOMPurify from 'dompurify';

   <div
     dangerouslySetInnerHTML={{
       __html: DOMPurify.sanitize(userContent),
     }}
   />;
   ```

2. **Environment Variables**

   ```tsx
   // Use .env.local for sensitive data
   const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
   ```

3. **CSRF Protection**
   - Always use POST/PUT/DELETE for state changes
   - Include CSRF tokens in forms

### Testing

See [Component Testing Best Practices](#component-testing-best-practices) for the full guide with examples.

1. **Unit Tests**
   - Test component rendering
   - Test user interactions
   - Test edge cases

2. **Integration Tests**
   - Test component interactions
   - Test data flow

3. **E2E Tests**
   - Test complete user workflows
   - Test across browsers

### Documentation

1. **Component Documentation**

   ```tsx
   /**
    * PropertyCard displays a single property listing
    *
    * @param property - The property data to display
    * @param variant - Display variant: 'grid' or 'list'
    * @param onSelect - Callback when property is selected
    *
    * @example
    * <PropertyCard
    *   property={propertyData}
    *   variant="grid"
    *   onSelect={(id) => console.log(id)}
    * />
    */
   export default function PropertyCard({ ... }) { ... }
   ```

2. **README Files**
   - Add README.md to complex feature folders
   - Document setup and usage
   - Include examples

3. **Inline Comments**

   ```tsx
   // Explain WHY, not WHAT
   // ✅ Good
   // Debounce search to reduce API calls
   const debouncedSearch = useCallback(
     debounce((query) => search(query), 300),
     []
   );

   // ❌ Avoid
   // Call debounce function
   const debouncedSearch = useCallback(...);
   ```

### Code Review Checklist

When reviewing PRs, check:

- [ ] Code follows style guidelines
- [ ] No console errors or warnings
- [ ] TypeScript types are correct
- [ ] Tests are included and passing
- [ ] No performance regressions
- [ ] Accessibility is considered
- [ ] Documentation is updated
- [ ] No breaking changes
- [ ] Commit messages are clear

---

## Component Testing Best Practices

Component tests use **Vitest** + **React Testing Library** (jsdom) and **axe-core** for automated accessibility checks. Interactive components also get **Storybook** stories whose `play` functions exercise the same behaviour in a real browser.

### Where tests live

| What | Location | Picked up by |
| ---- | -------- | ------------ |
| Component unit / a11y tests | `components/<area>/__tests__/<Component>.test.tsx` | `pnpm test` (`**/__tests__/**/*.test.{ts,tsx}`) |
| Cross-component / page flows | `__tests__/integration/`, `__tests__/e2e/` | `pnpm test` |
| Visual regression | `__tests__/visual/` | `pnpm test:visual` (Playwright) |
| Stories + interaction tests | `components/<area>/<Component>.stories.tsx` | `pnpm storybook` |

Reference example: [`components/ui/__tests__/Dialog.test.tsx`](components/ui/__tests__/Dialog.test.tsx) and [`components/ui/Dialog.stories.tsx`](components/ui/Dialog.stories.tsx) cover every pattern below.

### Guiding principles

1. **Test behaviour, not implementation.** Assert what a user sees and can do (text, roles, focus, callbacks), not internal state, class names or hook calls.
2. **Query by role and accessible name first.** Prefer `getByRole('button', { name: 'Save' })` → `getByLabelText` → `getByText`. Reach for `data-testid` only when nothing semantic exists. Role queries double as accessibility checks.
3. **One behaviour per test.** Name tests after the behaviour (`'disables actions while loading'`), not the method.
4. **Keep tests isolated.** Reset mocks in `beforeEach(() => vi.clearAllMocks())`; never rely on test order. `test/test-isolation.setup.ts` already clears storage between tests.
5. **Mock at the boundary.** Mock the network layer (`vi.mock` the API client, reuse fixtures from `mocks/`), Next.js modules (`next/navigation`, `next/link`, `next/dynamic`) and stores you don't own — not the component under test.

### Unit tests

Render the component with minimal props and assert one behaviour:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from '@/components/ui/Dialog';

it('calls onConfirm when the confirm button is pressed', () => {
  const onConfirm = vi.fn();
  render(
    <ConfirmDialog isOpen title="Archive" onCancel={vi.fn()} onConfirm={onConfirm} />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
});
```

Cover the states that matter: default, empty, loading, error, disabled, and edge-case props.

### Accessibility tests

Every interactive component should have at least one axe check, plus explicit assertions for focus management and keyboard support:

```tsx
import axe from 'axe-core';

async function expectNoAxeViolations(node: Element = document.body) {
  const results = await axe.run(node, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    rules: { 'color-contrast': { enabled: false } }, // jsdom has no layout
  });
  expect(results.violations, results.violations.map((v) => v.id).join(', ')).toHaveLength(0);
}

it('moves focus to the action button', async () => {
  render(<AlertDialog isOpen onClose={vi.fn()} title="Saved" />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'OK' })).toHaveFocus());
});
```

Use `document.body` (not `container`) for components that render into a portal (dialogs, toasts, tooltips).

### Integration tests

Exercise several components together through a real stateful parent instead of mocking the glue between them:

```tsx
function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Harness" />
    </>
  );
}

it('restores focus to the trigger after closing', async () => {
  render(<Harness />);
  const trigger = screen.getByRole('button', { name: 'Open' });
  trigger.focus();
  fireEvent.click(trigger);
  fireEvent.click(await screen.findByRole('button', { name: 'Close dialog' }));
  await waitFor(() => expect(trigger).toHaveFocus());
});
```

For components that fetch data, wrap them in a fresh `QueryClientProvider` per test and mock the API client with fixtures from `mocks/` rather than stubbing the query hooks themselves.

### Snapshot tests

Use snapshots sparingly — they catch unintended markup changes but say nothing about behaviour and are easy to rubber-stamp.

- ✅ Small, stable, presentational output (an icon set, a formatted badge).
- ✅ Prefer `toMatchInlineSnapshot()` so the expected output is reviewed in the diff.
- ❌ Large trees, anything with dates, random ids or Radix-generated ids.
- ❌ As a replacement for behavioural assertions.

```tsx
it('renders the formatted status badge', () => {
  const { container } = render(<Badge variant="success">Paid</Badge>);
  expect(container.firstChild).toMatchInlineSnapshot();
});
```

Commit generated snapshots and review them like code. Update intentionally with `pnpm vitest run -u`. For pixel-level regressions use the Playwright visual suite instead (`pnpm test:visual`).

### Storybook interaction tests

Add a story per meaningful state and a `play` function for interactive behaviour. Query through `within(canvasElement.ownerDocument.body)` for portal content:

```tsx
export const Confirm: StoryObj<typeof ConfirmDialog> = {
  args: { isOpen: true, title: 'Delete property', onCancel: fn(), onConfirm: fn() },
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement.ownerDocument.body);
    const dialog = await screen.findByRole('dialog', { name: 'Delete property' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }));
    await expect(args.onConfirm).toHaveBeenCalled();
  },
};
```

### Translated components

Components using `useTranslation()` render English in tests (the default locale), so assert against the English strings in `lib/i18n/translations/en.ts`. To test another locale, set it explicitly: `useI18nStore.getState().setLocale('es')` inside `act()`.

### Checklist

- [ ] Renders in default, loading, empty and error states
- [ ] User interactions call the right callbacks
- [ ] Queries use roles / labels
- [ ] axe check passes; focus and keyboard behaviour asserted
- [ ] Story added (with `play` for interactive components)
- [ ] `pnpm test` passes locally

---

## Internationalization (i18n)

The app uses a lightweight, type-safe i18n layer in `lib/i18n` (zustand store + typed translation dictionaries). `I18nProvider` wraps the whole app in `app/RootLayoutClient.tsx`.

- **Locales:** English (`en`, source of truth), Spanish (`es`), French (`fr`) and Arabic (`ar`, RTL).
- **Translation files:** `lib/i18n/translations/<locale>.ts`. Every locale is typed as `TranslationKeys`, so a missing key is a TypeScript error.
- **Switching:** `<LanguageSwitcher />` (rendered in the Navbar) calls `setLocale()`. The choice is persisted to `localStorage` under `chioma-locale`, synced across tabs, and sets `<html lang dir>`.

### Using translations

```tsx
'use client';
import { useTranslation } from '@/lib/i18n';

export function SaveButton() {
  const { t } = useTranslation();
  return <button>{t('common.save')}</button>;
}

// Interpolation: '© {{year}} Chioma. All rights reserved.'
t('footer.copyright', { year: new Date().getFullYear() });
```

For constants rendered in the UI, store a `labelKey: TranslationPath` instead of the English text and call `t(link.labelKey)` when rendering (see `constants/navigation.ts`).

### Adding strings

1. Add the key to the `TranslationKeys` interface and the `en` object in `translations/en.ts`.
2. Add the translated value to `es.ts`, `fr.ts` and `ar.ts` (the compiler will flag any you miss).
3. Replace the hardcoded string with `t('namespace.key')`.

Don't translate brand names (Chioma, Stellar, Twitter) or user-generated content.

---

## Troubleshooting

### Common Issues

**Port 3000 already in use**

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
pnpm run dev -- -p 3001
```

**Module not found errors**

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
pnpm install

# Restart dev server
pnpm run dev
```

**TypeScript errors**

```bash
# Check for type errors
pnpm tsc --noEmit

# Generate types
pnpm tsc --emitDeclarationOnly
```

**Build failures**

```bash
# Clean and rebuild
rm -rf .next node_modules
pnpm install
pnpm run build
```

---

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Storybook Documentation](https://storybook.js.org/docs)
- [Vitest Documentation](https://vitest.dev)

---

## Support and Communication

For questions or assistance:

- Review existing issues and pull requests for similar cases
- Examine established components for architectural patterns
- Participate in team discussions and code reviews
- Submit detailed issue reports for bugs or feature requests

We appreciate your contributions to the Chioma platform.
