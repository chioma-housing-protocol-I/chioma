/**
 * Accessibility structure verification tests — #1265 [A11Y]
 *
 * These tests verify the correctness of the accessibility implementation:
 *  - Skip-to-content link presence and target
 *  - Landmark region structure (header / nav / main / footer)
 *  - ARIA attributes on interactive elements
 *  - Heading hierarchy on the landing page
 *
 * Tests are intentionally written as unit-level structural checks that do not
 * require a full browser environment, so they run quickly in CI.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROOT = resolve(__dirname, '../../..');

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8');
}

// ─── Skip-to-content link ────────────────────────────────────────────────────

describe('Skip-to-content link', () => {
  it('layout.tsx contains a skip link with href="#main-content"', () => {
    const source = readSource('app/layout.tsx');
    expect(source).toContain('href="#main-content"');
  });

  it('skip link has visible CSS class "skip-link"', () => {
    const source = readSource('app/layout.tsx');
    expect(source).toContain('className="skip-link"');
  });

  it('globals.css defines .skip-link with focus-visible behaviour', () => {
    const css = readSource('app/globals.css');
    // The class must position the link off-screen by default …
    expect(css).toMatch(/\.skip-link\s*\{[^}]*top:\s*-/);
    // … and bring it into view on focus.
    expect(css).toMatch(/\.skip-link:focus-visible\s*\{[^}]*top:/);
  });

  it('skip link target id exists in landing page main element', () => {
    const source = readSource('app/page.tsx');
    expect(source).toContain('id="main-content"');
  });
});

// ─── Landmark regions — Navbar ───────────────────────────────────────────────

describe('Navbar landmark regions', () => {
  it('Navbar uses a <header> element as the outer landmark', () => {
    const source = readSource('components/Navbar.tsx');
    // Opening header tag (not a closing tag, not inside a string comment)
    expect(source).toMatch(/<header[\s>]/);
  });

  it('Navbar contains a <nav> element with aria-label for main navigation', () => {
    const source = readSource('components/Navbar.tsx');
    expect(source).toContain('aria-label="Main navigation"');
  });

  it('Mobile nav drawer has aria-label for mobile navigation', () => {
    const source = readSource('components/Navbar.tsx');
    expect(source).toContain('aria-label="Mobile navigation"');
  });

  it('Mobile menu toggle button has aria-expanded attribute', () => {
    const source = readSource('components/Navbar.tsx');
    expect(source).toContain('aria-expanded');
  });

  it('Mobile menu toggle button has aria-controls referencing mobile menu', () => {
    const source = readSource('components/Navbar.tsx');
    expect(source).toContain('aria-controls="mobile-menu"');
  });

  it('Mobile nav element has id matching aria-controls', () => {
    const source = readSource('components/Navbar.tsx');
    expect(source).toContain('id="mobile-menu"');
  });
});

// ─── Landmark regions — Footer ───────────────────────────────────────────────

describe('Footer landmark regions', () => {
  it('components/Footer.tsx uses a semantic <footer> element', () => {
    const source = readSource('components/Footer.tsx');
    // Should contain a footer element (not just the word "footer" in a class)
    expect(source).toMatch(/<footer[\s>]/);
  });

  it('components/Footer.tsx has aria-label on the footer element', () => {
    const source = readSource('components/Footer.tsx');
    expect(source).toContain('aria-label="Site footer"');
  });

  it('Footer social icons have aria-label for screen readers', () => {
    const source = readSource('components/Footer.tsx');
    expect(source).toContain('aria-label="Twitter"');
    expect(source).toContain('aria-label="Instagram"');
    expect(source).toContain('aria-label="Facebook"');
  });

  it('Footer social icon SVGs are hidden from AT with aria-hidden', () => {
    const source = readSource('components/Footer.tsx');
    // The icon components should have aria-hidden="true"
    expect(source).toContain('aria-hidden="true"');
  });

  it('Mainfooter.tsx uses a semantic <footer> element', () => {
    const source = readSource('components/Mainfooter.tsx');
    expect(source).toMatch(/<footer[\s>]/);
  });

  it('landing/Footer.tsx uses a semantic <footer> element', () => {
    const source = readSource('components/landing/Footer.tsx');
    expect(source).toMatch(/<footer[\s>]/);
  });
});

// ─── Main content landmark ───────────────────────────────────────────────────

describe('Main content landmark', () => {
  it('landing page.tsx wraps page content in a <main> element', () => {
    const source = readSource('app/page.tsx');
    expect(source).toMatch(/<main[\s>]/);
  });

  it('landing page main element has id="main-content"', () => {
    const source = readSource('app/page.tsx');
    expect(source).toContain('id="main-content"');
  });

  it('user layout main element has id="main-content"', () => {
    const source = readSource('app/user/layout.tsx');
    expect(source).toContain('id="main-content"');
  });

  it('admin layout main element has id="main-content"', () => {
    const source = readSource('app/admin/layout.tsx');
    expect(source).toContain('id="main-content"');
  });

  it('developer layout main element has id="main-content"', () => {
    const source = readSource('app/developer/layout.tsx');
    expect(source).toContain('id="main-content"');
  });

  it('host layout main element has id="main-content"', () => {
    const source = readSource('app/host/layout.tsx');
    expect(source).toContain('id="main-content"');
  });

  it('landing page Navbar is outside <main> (proper sibling landmark)', () => {
    const source = readSource('app/page.tsx');
    // Navbar should appear before the opening <main tag
    const navbarPos = source.indexOf('<Navbar');
    const mainPos = source.indexOf('<main');
    expect(navbarPos).toBeGreaterThan(-1);
    expect(mainPos).toBeGreaterThan(-1);
    expect(navbarPos).toBeLessThan(mainPos);
  });

  it('landing page Footer is outside <main> (proper sibling landmark)', () => {
    const source = readSource('app/page.tsx');
    // Footer should appear after the closing </main> tag
    const mainClosePos = source.indexOf('</main>');
    const footerPos = source.indexOf('<Footer');
    expect(mainClosePos).toBeGreaterThan(-1);
    expect(footerPos).toBeGreaterThan(-1);
    expect(footerPos).toBeGreaterThan(mainClosePos);
  });

  it('RootLayoutClient does not wrap children in a duplicate id="main-content"', () => {
    const source = readSource('app/RootLayoutClient.tsx');
    // The wrapper should no longer have id="main-content"
    expect(source).not.toContain('id="main-content"');
  });
});

// ─── Heading hierarchy ───────────────────────────────────────────────────────

describe('Heading hierarchy — landing page components', () => {
  it('Hero component contains an <h1> heading', () => {
    const source = readSource('components/landing/Hero.tsx');
    expect(source).toMatch(/<(motion\.)?h1[\s>]/);
  });

  it('Features component uses <h2> for section title', () => {
    const source = readSource('components/landing/Features.tsx');
    expect(source).toMatch(/<(motion\.)?h2[\s>]/);
  });

  it('Features component uses <h3> for individual feature headings', () => {
    const source = readSource('components/landing/Features.tsx');
    expect(source).toMatch(/<h3[\s>]/);
  });

  it('HowItWorks component uses <h2> for section title', () => {
    const source = readSource('components/landing/HowItWorks.tsx');
    expect(source).toMatch(/<(motion\.)?h2[\s>]/);
  });

  it('HowItWorks component uses <h3> for step headings', () => {
    const source = readSource('components/landing/HowItWorks.tsx');
    expect(source).toMatch(/<h3[\s>]/);
  });

  it('ForWho component uses <h2> for section title', () => {
    const source = readSource('components/landing/ForWho.tsx');
    expect(source).toMatch(/<(motion\.)?h2[\s>]/);
  });

  it('ForWho component uses <h3> for audience card headings', () => {
    const source = readSource('components/landing/ForWho.tsx');
    expect(source).toMatch(/<h3[\s>]/);
  });

  it('Testimonials component uses <h2> for section title', () => {
    const source = readSource('components/landing/Testimonials.tsx');
    expect(source).toMatch(/<(motion\.)?h2[\s>]/);
  });

  it('CTA component uses <h2> for call-to-action heading', () => {
    const source = readSource('components/landing/CTA.tsx');
    expect(source).toMatch(/<(motion\.)?h2[\s>]/);
  });

  it('No component uses <h1> except Hero (prevents duplicate h1)', () => {
    const sectionsWithoutH1 = [
      'components/landing/Features.tsx',
      'components/landing/HowItWorks.tsx',
      'components/landing/ForWho.tsx',
      'components/landing/Testimonials.tsx',
      'components/landing/CTA.tsx',
      'components/landing/Stats.tsx',
      'components/landing/Footer.tsx',
      'components/Footer.tsx',
      'components/Navbar.tsx',
    ];

    for (const file of sectionsWithoutH1) {
      const source = readSource(file);
      // h1 should not appear as an HTML tag (motion.h1 or <h1)
      expect(source, `${file} should not contain h1`).not.toMatch(
        /<(motion\.)?h1[\s>]/,
      );
    }
  });
});

// ─── Route announcer ─────────────────────────────────────────────────────────

describe('RouteAnnouncer for SPA navigation', () => {
  it('RouteAnnouncer is included in RootLayoutClient', () => {
    const source = readSource('app/RootLayoutClient.tsx');
    expect(source).toContain('RouteAnnouncer');
  });

  it('RouteAnnouncer uses aria-live="polite" for announcements', () => {
    const source = readSource('components/accessibility/RouteAnnouncer.tsx');
    expect(source).toContain('aria-live="polite"');
  });

  it('RouteAnnouncer uses aria-atomic="true"', () => {
    const source = readSource('components/accessibility/RouteAnnouncer.tsx');
    expect(source).toContain('aria-atomic="true"');
  });

  it('RouteAnnouncer is visually hidden with sr-only class', () => {
    const source = readSource('components/accessibility/RouteAnnouncer.tsx');
    expect(source).toContain('sr-only');
  });
});

// ─── Focus management ────────────────────────────────────────────────────────

describe('Focus management', () => {
  it('globals.css defines :focus-visible outline for keyboard navigation', () => {
    const css = readSource('app/globals.css');
    expect(css).toMatch(/:focus-visible\s*\{/);
    expect(css).toContain('outline');
  });

  it('main landmark elements have tabIndex={-1} for programmatic focus', () => {
    const layouts = [
      'app/page.tsx',
      'app/user/layout.tsx',
      'app/admin/layout.tsx',
      'app/developer/layout.tsx',
      'app/host/layout.tsx',
    ];

    for (const layout of layouts) {
      const source = readSource(layout);
      expect(source, `${layout} should have tabIndex={-1} on main`).toContain(
        'tabIndex={-1}',
      );
    }
  });
});
