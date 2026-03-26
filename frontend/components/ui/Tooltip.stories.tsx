import React from 'react';
import { Tooltip } from './Tooltip';

const meta = {
  title: 'Utilities/Tooltip',
  component: Tooltip,
};

export default meta;

export const Top = () => (
  <div className="p-10">
    <Tooltip content="Helpful context for this action">
      <button className="rounded-lg border border-neutral-200 px-3 py-2 text-sm">
        Hover me
      </button>
    </Tooltip>
  </div>
);

export const Bottom = () => (
  <div className="p-10">
    <Tooltip content="Displayed below" side="bottom">
      <button className="rounded-lg border border-neutral-200 px-3 py-2 text-sm">
        Hover me
      </button>
    </Tooltip>
  </div>
);
