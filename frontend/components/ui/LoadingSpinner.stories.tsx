import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';

const meta = {
  title: 'Utilities/LoadingSpinner',
  component: LoadingSpinner,
};

export default meta;

export const Primary = () => <LoadingSpinner label="Loading data" />;
export const WhiteVariant = () => (
  <div className="bg-slate-900 p-6">
    <LoadingSpinner variant="white" label="Connecting wallet" />
  </div>
);
export const FullScreen = () => (
  <LoadingSpinner fullScreen label="Please wait" />
);
