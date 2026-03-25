import Link from 'next/link';

export default function NotFound() {
  return (
    <>
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center px-6 py-16">
        <section className="w-full max-w-2xl rounded-2xl backdrop-blur-xl bg-slate-800/50 border border-white/10 p-8 md:p-12 text-center text-white shadow-2xl">
          <p className="text-sm uppercase tracking-[0.25em] text-blue-300/80">
            Error 404
          </p>
          <h1 className="mt-3 text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
            Page Not Found
          </h1>
          <p className="mt-4 text-base md:text-lg text-blue-200/70">
            The page you are looking for does not exist or may have been moved.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-3 font-semibold transition-all shadow-lg hover:shadow-xl"
            >
              Go Home
            </Link>
            <Link
              href="/properties"
              className="w-full sm:w-auto rounded-xl border-2 border-white/20 text-white px-6 py-3 font-semibold hover:bg-white/10 transition-all backdrop-blur-sm"
            >
              Browse Properties
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto rounded-xl border-2 border-white/20 text-white px-6 py-3 font-semibold hover:bg-white/10 transition-all backdrop-blur-sm"
            >
              Tenant Dashboard
            </Link>
            <Link
              href="/landlords"
              className="w-full sm:w-auto rounded-xl border-2 border-white/20 text-white px-6 py-3 font-semibold hover:bg-white/10 transition-all backdrop-blur-sm"
            >
              Landlord Portal
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
