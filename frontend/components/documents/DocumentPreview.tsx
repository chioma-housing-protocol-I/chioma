'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { FeatureBoundary } from '@/components/error/FeatureBoundary';

const PdfDocumentViewer = dynamic(() => import('./PdfDocumentViewer'), {
  loading: () => (
    <div className="flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 rounded-xl min-h-[400px]">
      <div className="text-center py-12">
        <div className="inline-block w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Loading PDF viewer...
        </p>
      </div>
    </div>
  ),
  ssr: false,
});

interface DocumentPreviewProps {
  url: string;
  type: 'pdf' | 'image';
  name: string;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  url,
  type,
  name,
}) => {
  if (type === 'image') {
    return (
      <div className="flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 rounded-xl overflow-hidden min-h-[400px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={name}
          className="max-w-full max-h-[600px] object-contain"
        />
      </div>
    );
  }

  return (
    <FeatureBoundary name="documents:pdf-viewer" label="PDF viewer">
      <PdfDocumentViewer url={url} name={name} />
    </FeatureBoundary>
  );
};
