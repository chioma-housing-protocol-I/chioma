'use client';

import React from 'react';
import { notify, ToastProvider } from './toast';

const meta = {
  title: 'Utilities/Toast',
};

export default meta;

export const Showcase = () => (
  <div className="flex gap-2 p-8">
    <ToastProvider />
    <button
      type="button"
      onClick={() => notify.success('Saved successfully')}
      className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white"
    >
      Success
    </button>
    <button
      type="button"
      onClick={() => notify.error('Something went wrong')}
      className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white"
    >
      Error
    </button>
  </div>
);
