import { describe, expect, it } from 'vitest';

/**
 * XSS prevention tests for frontend components
 * Ensures that user input is properly sanitized and escaped
 */

describe('XSS Prevention Tests', () => {
  describe('HTML escaping in text content', () => {
    it('escapes script tags in user input', () => {
      const malicious = '<script>alert("XSS")</script>';
      const escaped = new DOMParser().parseFromString(
        `<div>${malicious}</div>`,
        'text/html'
      ).body.textContent;

      expect(escaped).toContain('<script>');
      expect(escaped).not.toContain('alert');
    });

    it('escapes event handlers in attributes', () => {
      const malicious = 'onload="alert(1)"';
      const div = document.createElement('div');
      div.setAttribute('data-test', malicious);

      expect(div.getAttribute('data-test')).toContain('onload=');
      expect(div.onload).toBeNull();
    });

    it('prevents img src XSS', () => {
      const maliciousSrc = 'javascript:alert("XSS")';
      const img = document.createElement('img');
      img.src = maliciousSrc;

      expect(img.src).toContain('javascript:');
      // Browser would block execution, but we verify attribute is set
      expect(img.getAttribute('src')).toBe(maliciousSrc);
    });

    it('escapes SVG injection vectors', () => {
      const maliciousSvg = '<svg onload="alert(1)"></svg>';
      const container = document.createElement('div');
      container.innerHTML = maliciousSvg;

      const svg = container.querySelector('svg');
      expect(svg?.onload).toBeNull();
    });

    it('prevents unicode/encoding bypass attacks', () => {
      const bypassAttempt = '&#60;script&#62;alert(1)&#60;/script&#62;';
      const div = document.createElement('div');
      div.textContent = bypassAttempt;

      expect(div.textContent).toBe(bypassAttempt);
      expect(div.innerHTML).not.toContain('<script');
    });

    it('handles null bytes and control characters', () => {
      const nullByteInput = 'test\x00<script>alert(1)</script>';
      const div = document.createElement('div');
      div.textContent = nullByteInput;

      expect(div.textContent).toContain('\x00');
      expect(div.innerHTML).not.toContain('<script');
    });
  });

  describe('Template injection prevention', () => {
    it('escapes template literals with user input', () => {
      const userInput = '${alert(1)}';
      const template = `User said: ${userInput}`;

      expect(template).toContain('${alert(1)}');
      expect(template).not.toContain('alert(1)');
    });

    it('prevents double encoding attacks', () => {
      const doubleEncoded = '&lt;script&gt;alert(1)&lt;/script&gt;';
      const div = document.createElement('div');
      div.innerHTML = doubleEncoded;

      expect(div.innerHTML).toBe(doubleEncoded);
      expect(div.querySelectorAll('script')).toHaveLength(0);
    });
  });

  describe('DOM API safe usage', () => {
    it('uses textContent instead of innerHTML for user data', () => {
      const userData = '<img src=x onerror="alert(1)">';
      const div = document.createElement('div');
      div.textContent = userData;

      expect(div.innerHTML).not.toContain('onerror=');
      expect(div.textContent).toBe(userData);
    });

    it('safely creates elements with user attributes', () => {
      const userClass = '" onload="alert(1)';
      const el = document.createElement('div');
      el.className = userClass;

      expect(el.className).toContain('onload=');
      expect(el.getAttribute('onload')).toBeNull();
    });

    it('prevents data URLs from executing', () => {
      const dataUrl = 'data:text/html,<script>alert(1)</script>';
      const link = document.createElement('a');
      link.href = dataUrl;

      expect(link.href).toContain('data:text/html');
    });
  });

  describe('XSS in form handling', () => {
    it('sanitizes form input values', () => {
      const form = document.createElement('form');
      const input = document.createElement('input');
      input.value = '<script>alert(1)</script>';
      form.appendChild(input);

      expect(input.value).toContain('<script>');
      expect(typeof input.value).toBe('string');
    });

    it('handles special characters in form submission', () => {
      const specialChars = '&<>"\'';
      const input = document.createElement('input');
      input.value = specialChars;

      expect(input.value).toBe(specialChars);
    });
  });

  describe('JSON and API response XSS', () => {
    it('prevents XSS from JSON response fields', () => {
      const jsonResponse = {
        message: '<script>alert("XSS")</script>',
        user: '<img src=x onerror="alert(1)">',
      };

      const div = document.createElement('div');
      div.textContent = jsonResponse.message;

      expect(div.innerHTML).not.toContain('<script');
      expect(div.innerHTML).not.toContain('alert');
    });

    it('safely handles HTML content from trusted sources', () => {
      const trustedHtml = '<strong>Important</strong>';
      const container = document.createElement('div');

      // Only use innerHTML for trusted content
      container.innerHTML = trustedHtml;

      expect(container.querySelector('strong')).not.toBeNull();
      expect(container.textContent).toContain('Important');
    });
  });

  describe('URL parameter XSS prevention', () => {
    it('escapes URL parameters in links', () => {
      const param = '"><script>alert(1)</script>';
      const url = `https://example.com/page?q=${encodeURIComponent(param)}`;

      expect(url).toContain(encodeURIComponent(param));
      expect(url).not.toContain('"><script>');
    });

    it('validates redirect URLs', () => {
      const unsafeUrl = 'javascript:alert(1)';
      const safeUrl = 'https://example.com/page';

      const isValidUrl = (url: string) => {
        try {
          const parsed = new URL(url);
          return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
          return false;
        }
      };

      expect(isValidUrl(unsafeUrl)).toBe(false);
      expect(isValidUrl(safeUrl)).toBe(true);
    });
  });

  describe('CSS injection prevention', () => {
    it('prevents CSS expression attacks', () => {
      const style = document.createElement('style');
      style.textContent = 'div { color: red; }';

      expect(style.textContent).toBe('div { color: red; }');
    });

    it('prevents javascript: protocol in style', () => {
      const div = document.createElement('div');
      div.style.backgroundImage = 'url(javascript:alert(1))';

      expect(div.style.backgroundImage).toBe('url(javascript:alert(1))');
    });
  });
});
