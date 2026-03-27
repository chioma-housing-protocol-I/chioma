import React from 'react';
import { SkeletonLoader } from './SkeletonLoader';

const meta = {
  title: 'Utilities/SkeletonLoader',
  component: SkeletonLoader,
};

export default meta;

export const Text = () => <SkeletonLoader variant="text" lines={4} />;
export const Card = () => <SkeletonLoader variant="card" />;
export const Avatar = () => <SkeletonLoader variant="avatar" />;
export const TableRow = () => <SkeletonLoader variant="table-row" />;
