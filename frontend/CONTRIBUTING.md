# Frontend Contributing Guide

> **New here?** Follow the [root Quickstart](../QUICKSTART.md) to go from a clean clone to a running full stack.

This document provides comprehensive guidelines for contributing to the Chioma frontend. It covers project architecture, design system, component development, testing requirements, and CI/CD pipeline expectations.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Theme & Design System](#theme--design-system)
3. [Project Structure](#project-structure)
4. [Component Architecture](#component-architecture)
5. [Creating Components](#creating-components)
6. [Editing & Maintaining Code](#editing--maintaining-code)
7. [PR Requirements & CI/CD Pipeline](#pr-requirements--cicd-pipeline)
8. [Development Workflow](#development-workflow)
9. [Best Practices](#best-practices)

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

### PR Checklist

Before submitting a PR:

- [ ] Code follows project style guidelines
- [ ] All tests pass (`make check`)
- [ ] No console errors or warnings
- [ ] TypeScript types are correct
- [ ] Components are responsive (mobile/tablet/desktop)
- [ ] Accessibility is considered (ARIA labels, semantic HTML)
- [ ] Documentation is updated if needed
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
