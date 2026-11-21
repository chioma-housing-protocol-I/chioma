import Navbar from '@/components/Navbar';
import Footer from '@/components/landing/Footer';

/**
 * Loading skeleton for the property detail page.
 * Mirrors the exact layout of page.tsx so there is no layout shift when
 * data resolves: same column grid, same section order, same spacing.
 */
export default function PropertyDetailLoading() {
  return (
    <>
      <Navbar theme="dark" />
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 animate-pulse">
          {/* Breadcrumbs */}
          <div className="mb-8 h-5 w-56 rounded-full bg-white/10" />

          {/* Header: title + location + gallery */}
          <div className="mb-8">
            {/* Title */}
            <div className="h-10 sm:h-14 w-3/4 rounded-xl bg-white/15 mb-4" />
            {/* Location */}
            <div className="flex items-center gap-2 mb-6 sm:mb-8">
              <div className="w-5 h-5 rounded-full bg-blue-400/40 shrink-0" />
              <div className="h-5 w-72 rounded-full bg-white/10" />
            </div>

            {/* Image gallery placeholder */}
            <div className="w-full aspect-[16/7] rounded-2xl bg-white/10" />
          </div>

          {/* Two-column details layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 relative items-start">
            {/* Left column */}
            <div className="lg:col-span-8 flex flex-col gap-10">
              {/* Rental units card */}
              <div className="backdrop-blur-xl bg-blue-500/10 border border-blue-400/30 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <div className="h-6 w-32 rounded-lg bg-white/15" />
                  <div className="h-4 w-64 rounded-full bg-white/10" />
                </div>
                <div className="flex gap-4">
                  <div className="backdrop-blur-xl bg-slate-800/50 border border-white/10 px-4 py-2 rounded-xl w-20 h-16" />
                  <div className="backdrop-blur-xl bg-slate-800/50 border border-white/10 px-4 py-2 rounded-xl w-20 h-16" />
                </div>
              </div>

              {/* About section */}
              <div className="flex flex-col gap-3">
                <div className="h-7 w-48 rounded-lg bg-white/15" />
                <div className="h-4 w-full rounded-full bg-white/10" />
                <div className="h-4 w-11/12 rounded-full bg-white/10" />
                <div className="h-4 w-4/5 rounded-full bg-white/10" />
                <div className="h-4 w-full rounded-full bg-white/10" />
                <div className="h-4 w-3/4 rounded-full bg-white/10" />
              </div>

              {/* Divider */}
              <hr className="border-white/10" />

              {/* Amenities */}
              <div className="flex flex-col gap-4">
                <div className="h-7 w-36 rounded-lg bg-white/15" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-10 rounded-xl bg-white/10"
                    />
                  ))}
                </div>
              </div>

              {/* Divider */}
              <hr className="border-white/10" />

              {/* Landlord info */}
              <div className="flex items-center gap-6 p-6 rounded-2xl backdrop-blur-xl bg-slate-800/50 border border-white/10">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-full bg-white/10 shrink-0" />
                <div className="flex flex-col gap-2">
                  <div className="h-5 w-48 rounded-lg bg-white/15" />
                  <div className="h-6 w-32 rounded-full bg-white/10" />
                </div>
              </div>
            </div>

            {/* Right column — sticky CTA card */}
            <div className="lg:col-span-4 sticky top-24 lg:top-32 w-full">
              <div className="backdrop-blur-xl bg-slate-800/50 border border-white/10 shadow-2xl rounded-3xl p-5 sm:p-8 flex flex-col gap-6">
                {/* Price block */}
                <div className="pb-6 border-b border-white/10 flex flex-col gap-2">
                  <div className="h-4 w-24 rounded-full bg-white/10" />
                  <div className="h-10 w-48 rounded-xl bg-white/15" />
                </div>

                {/* Status badge */}
                <div className="h-12 w-full rounded-xl bg-white/10" />

                {/* CTA button */}
                <div className="h-14 w-full rounded-full bg-white/10" />

                {/* Fine print */}
                <div className="h-4 w-40 rounded-full bg-white/10 mx-auto" />
              </div>
            </div>
          </div>

          {/* Reviews section */}
          <div className="mt-20 pt-10 border-t border-white/10">
            {/* Section heading */}
            <div className="flex flex-col gap-2 mb-8">
              <div className="h-8 w-48 rounded-xl bg-white/15" />
              <div className="h-4 w-72 rounded-full bg-white/10" />
            </div>

            {/* Rating summary bar */}
            <div className="flex flex-col sm:flex-row gap-6 mb-10">
              <div className="w-28 h-28 rounded-2xl bg-white/10 shrink-0" />
              <div className="flex-1 flex flex-col gap-3 justify-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-3 w-6 rounded-full bg-white/10" />
                    <div className="flex-1 h-3 rounded-full bg-white/10" />
                    <div className="h-3 w-6 rounded-full bg-white/10" />
                  </div>
                ))}
              </div>
            </div>

            {/* Review cards */}
            <div className="flex flex-col gap-6">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="backdrop-blur-xl bg-slate-800/50 border border-white/10 rounded-2xl p-6 flex flex-col gap-4"
                >
                  {/* Author row */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 shrink-0" />
                    <div className="flex flex-col gap-1">
                      <div className="h-4 w-28 rounded-full bg-white/15" />
                      <div className="h-3 w-20 rounded-full bg-white/10" />
                    </div>
                  </div>
                  {/* Star row */}
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <div key={s} className="w-4 h-4 rounded bg-white/10" />
                    ))}
                  </div>
                  {/* Comment lines */}
                  <div className="flex flex-col gap-2">
                    <div className="h-3 w-full rounded-full bg-white/10" />
                    <div className="h-3 w-5/6 rounded-full bg-white/10" />
                    <div className="h-3 w-4/6 rounded-full bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
