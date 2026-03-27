'use client';

import React, { useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';

const meta = {
  title: 'Utilities/ConfirmDialog',
  component: ConfirmDialog,
};

export default meta;

export const Primary = () => {
  const [open, setOpen] = useState(true);

  return (
    <ConfirmDialog
      isOpen={open}
      title="Publish listing?"
      description="This will make your listing visible to tenants."
      onCancel={() => setOpen(false)}
      onConfirm={() => setOpen(false)}
    />
  );
};

export const Danger = () => {
  const [open, setOpen] = useState(true);

  return (
    <ConfirmDialog
      isOpen={open}
      tone="danger"
      title="Delete draft?"
      description="This action cannot be undone."
      confirmLabel="Delete"
      onCancel={() => setOpen(false)}
      onConfirm={() => setOpen(false)}
    />
  );
};
