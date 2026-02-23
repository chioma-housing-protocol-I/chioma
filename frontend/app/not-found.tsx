import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-brand-gradient flex items-center justify-center px-6 py-16">
      <section className="w-full max-w-2xl rounded-2xl glass p-8 md:p-12 text-center text-white shadow-card">
        <p className="text-sm uppercase tracking-[0.25em] text-white/80">Error 404</p>
        <h1 className="mt-3 text-4xl md:text-5xl font-bold tracking-tight">Page Not Found</h1>
        <p className="mt-4 text-base md:text-lg text-white/85">
          The page you are looking for does not exist or may have been moved.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto rounded-lg bg-white text-blue-700 px-6 py-3 font-semibold hover:bg-white/90 transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/properties"
            className="w-full sm:w-auto rounded-lg border border-white/50 text-white px-6 py-3 font-semibold hover:bg-white/10 transition-colors"
          >
            Browse Properties
          </Link>
        </div>
      </section>
    </main>
  );
}
