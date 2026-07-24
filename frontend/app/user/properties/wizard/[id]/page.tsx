'use client';

import React, { use } from 'react';
import dynamic from 'next/dynamic';

const PropertyListingWizard = dynamic(
  () => import('@/components/wizard/PropertyListingWizard').then((m) => m.PropertyListingWizard),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    ),
    ssr: false,
  }
);

export default function ResumeWizardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="bg-neutral-50 dark:bg-neutral-950 min-h-screen">
      <PropertyListingWizard draftId={id} />
    </div>
  );
}
