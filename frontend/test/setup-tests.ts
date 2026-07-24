import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement scrollIntoView; components that auto-scroll
// (e.g. chat message lists) would otherwise throw in tests.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
