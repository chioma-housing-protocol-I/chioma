# A11Y: Skip-to-content link and landmark regions — #1265

## Summary

Implements all page-level navigation aids required by the issue:

1. **Skip-to-content link** — already in `layout.tsx`, now properly targets a semantic `<main id="main-content">` element on every route.
2. **Landmark regions** — `header`, `nav`, `main`, and `footer` are now proper semantic siblings on every page.
3. **Heading hierarchy** — audited all landing-page components; hierarchy is correct (single `h1` in Hero, `h2` section titles, `h3` card titles).

---

## Changes

### `components/Navbar.tsx`

- Replaced outer `<nav>` with `<header>` (the correct landmark for a site header).
- Added an inner `<nav aria-label="Main navigation">` for the link list.
- Mobile drawer is now `<nav id="mobile-menu" aria-label="Mobile navigation">`.
- Mobile toggle button has `aria-expanded` and `aria-controls="mobile-menu"`.

### `components/Footer.tsx`

- Removed redundant outer `<div>` wrapper; `<footer>` is returned directly.
- Added `aria-label="Site footer"` to the `<footer>` element.
- Social icon links have `aria-label` (Twitter / Instagram / Facebook) and icon SVGs have `aria-hidden="true"`.

### `app/page.tsx` (landing page)

- Restructured so `<Navbar>` and `<Footer>` are siblings of `<main>`, not children of it.
- `<main id="main-content" tabIndex={-1}>` is the skip-link target.

### `app/RootLayoutClient.tsx`

- Removed the `<div id="main-content">` wrapper; each page's own `<main>` now serves as the skip target, eliminating a duplicate-id risk.

### `app/user/layout.tsx`, `app/admin/layout.tsx`, `app/developer/layout.tsx`, `app/host/layout.tsx`

- Added `id="main-content" tabIndex={-1}` to each layout's `<main>` element so the skip link works across all authenticated routes.

### `__tests__/components/accessibility/a11y-structure.test.ts` _(new)_

- 41 tests covering skip link, landmark regions, heading hierarchy, route announcer, and focus management.

---

## Landmark structure (after changes)

```
<body>
  <a href="#main-content" class="skip-link">Skip to main content</a>  ← skip link
  <header>                ← site header landmark
    <nav aria-label="Main navigation">…</nav>
    <nav id="mobile-menu" aria-label="Mobile navigation">…</nav>  ← mobile only
  </header>
  <main id="main-content" tabIndex={-1}>   ← skip-link target + main landmark
    <section>…</section>  ← Hero, Features, HowItWorks, …
  </main>
  <footer aria-label="Site footer">…</footer>   ← footer landmark
</body>
```

---

## Heading hierarchy (landing page)

| Level | Component    | Text                                    |
| ----- | ------------ | --------------------------------------- |
| `h1`  | Hero         | "Automated Commissions. Zero Disputes." |
| `h2`  | Features     | "Built for Modern Rentals"              |
| `h3`  | Features     | Feature card titles (×6)                |
| `h2`  | HowItWorks   | "How It Works"                          |
| `h3`  | HowItWorks   | Step titles (×3)                        |
| `h2`  | ForWho       | "Built for Everyone"                    |
| `h3`  | ForWho       | Audience card titles (×3)               |
| `h2`  | Testimonials | "Trusted by Thousands"                  |
| `h2`  | CTA          | "Ready to Get Started?"                 |

No duplicate `h1` tags exist across any landing-page component.

---

## Test results

```
make format-check  →  All matched files use Prettier code style ✅
make test          →  33 test files, 329 tests — all passed ✅
```

The new a11y test file (`a11y-structure.test.ts`) contributes **41 tests** to that total.

---

## Screen reader verification

The following behaviours are now correct for assistive technology:

| Behaviour                                                     | How verified                                   |
| ------------------------------------------------------------- | ---------------------------------------------- |
| Skip link appears on Tab keypress and moves focus to `<main>` | CSS `.skip-link` + `tabIndex={-1}` on `<main>` |
| Screen reader announces "Main navigation" landmark            | `aria-label` on `<nav>`                        |
| Screen reader announces "Site footer" landmark                | `aria-label` on `<footer>`                     |
| Mobile menu toggle state announced                            | `aria-expanded` on button                      |
| Route changes announced in SPA navigation                     | `RouteAnnouncer` with `aria-live="polite"`     |
| Keyboard focus ring visible                                   | `:focus-visible` in `globals.css`              |
