/**
 * Offline fallback page.
 */

'use client';

import { FiWifiOff } from 'react-icons/fi';

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <FiWifiOff className="mx-auto mb-4 h-16 w-16 text-gray-400" />
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          You&apos;re Offline
        </h1>
        <p className="mb-6 text-gray-600">
          It looks like you&apos;ve lost your internet connection. Some features
          may be unavailable until you&apos;re back online.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
