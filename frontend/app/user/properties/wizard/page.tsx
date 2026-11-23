'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Breadcrumb } from '@/components/common/Breadcrumb';

const PropertyListingWizard = dynamic(
  () =>
    import('@/components/wizard/PropertyListingWizard').then(
      (m) => m.PropertyListingWizard,
    ),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    ),
    ssr: false,
  },
);

export default function WizardPage() {
  const params = useParams();
  const id = params?.id as string | undefined;

  return (
    <div className="bg-neutral-50 dark:bg-neutral-950 min-h-screen px-4 sm:px-6 pt-4">
      <div className="max-w-4xl mx-auto">
        <Breadcrumb
          backHref="/user/properties"
          backLabel="Back to properties"
          homeHref="/user"
          homeLabel="Dashboard"
          customLabels={{
            wizard: 'Listing Wizard',
            ...(id ? { [id]: 'Edit Draft' } : {}),
          }}
        />
      </div>
      <PropertyListingWizard draftId={id} />
    </div>
  );
}
