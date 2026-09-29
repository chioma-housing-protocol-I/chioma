import { notFound } from 'next/navigation';

/**
 * Development-only modal playground. Production builds return 404 and omit
 * the demo bundle via compile-time dead-code elimination on the import below.
 */
export default async function ModalsDemoPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  const { default: ModalsDemoContent } = await import('./ModalsDemoContent');
  return <ModalsDemoContent />;
}
