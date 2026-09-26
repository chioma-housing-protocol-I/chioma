import { notFound } from 'next/navigation';
import VisualGalleryClient from './VisualGalleryClient';

/**
 * Internal-only page rendering the design system's UI primitives with fixed
 * props, used purely as a fixture for visual regression screenshots (see
 * `__tests__/visual`). Not linked from anywhere in the app; 404s outside of
 * development so it never ships as a reachable route in production.
 */
export default function VisualGalleryPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <VisualGalleryClient />;
}
