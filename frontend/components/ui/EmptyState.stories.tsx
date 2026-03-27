import React from 'react';
import { Search } from 'lucide-react';
import { EmptyState } from './EmptyState';

const meta = {
  title: 'Utilities/EmptyState',
  component: EmptyState,
};

export default meta;

export const Default = () => (
  <EmptyState
    icon={Search}
    title="No listings yet"
    description="Try adjusting your filters or create a new listing."
  />
);

export const WithAction = () => (
  <EmptyState
    icon={Search}
    title="No payments found"
    description="No payments match your selected period."
    actionLabel="Clear filters"
    onAction={() => {}}
  />
);
