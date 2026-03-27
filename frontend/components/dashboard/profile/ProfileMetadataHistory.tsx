'use client';

import { History } from 'lucide-react';

interface ProfileMetadataHistoryProps {
  fieldId: string;
}

export function ProfileMetadataHistory({
  fieldId,
}: ProfileMetadataHistoryProps) {
  // Mock history data
  const history = [
    {
      id: '1',
      value: 'Updated value',
      changedAt: '2026-03-26T00:00:00.000Z',
      changedBy: 'You',
    },
    {
      id: '2',
      value: 'Previous value',
      changedAt: '2026-03-25T00:00:00.000Z',
      changedBy: 'You',
    },
    {
      id: '3',
      value: 'Initial value',
      changedAt: '2026-03-24T00:00:00.000Z',
      changedBy: 'You',
    },
  ];

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 space-y-4">
      <div className="flex items-center gap-2">
        <History size={20} className="text-teal-400" />
        <h3 className="text-lg font-bold text-white">Change History</h3>
      </div>
      <p className="text-xs text-blue-200/60">Field ID: {fieldId}</p>

      <div className="space-y-3">
        {history.length === 0 ? (
          <p className="text-sm text-blue-200/60">No history yet</p>
        ) : (
          history.map((entry, index) => {
            const changedDate = new Date(entry.changedAt);
            return (
              <div
                key={entry.id}
                className="flex items-start gap-4 pb-3 border-b border-white/10 last:border-0"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-xs font-bold text-teal-300">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white break-all">{entry.value}</p>
                  <p className="text-xs text-blue-200/60 mt-1">
                    {changedDate.toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="pt-2 border-t border-white/10">
        <button className="text-sm text-teal-400 hover:text-teal-300 font-medium">
          Restore Previous Version
        </button>
      </div>
    </div>
  );
}
