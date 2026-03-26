'use client';

import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';

const meta = {
  title: 'Utilities/ErrorBoundary',
  component: ErrorBoundary,
};

export default meta;

function BrokenComponent() {
  throw new Error('Storybook test error');
  return null;
}

export const Recoverable = () => (
  <ErrorBoundary
    title="Render failed"
    description="Try again to recover this view."
  >
    <BrokenComponent />
  </ErrorBoundary>
);
