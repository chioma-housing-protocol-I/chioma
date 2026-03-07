'use client';

import { Check, FileEdit, UserCheck, Building, Lock } from 'lucide-react';
import {
  CONTRACT_STAGES,
  STAGE_LABELS,
  type ContractStage,
} from '@/types/contracts';

interface ContractTimelineProps {
  currentStage: ContractStage;
  compact?: boolean;
}

const STAGE_ICONS = {
  DRAFTED: FileEdit,
  TENANT_SIGNED: UserCheck,
  LANDLORD_SIGNED: Building,
  DEPOSIT_LOCKED: Lock,
} as const;

export function ContractTimeline({
  currentStage,
  compact = false,
}: ContractTimelineProps) {
  const currentIndex = CONTRACT_STAGES.indexOf(currentStage);

  return (
    <div className={`flex items-center ${compact ? 'gap-1' : 'gap-0'} w-full`}>
      {CONTRACT_STAGES.map((stage, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isPending = index > currentIndex;
        const Icon = STAGE_ICONS[stage];
        const isLast = index === CONTRACT_STAGES.length - 1;

        return (
          <div
            key={stage}
            className={`flex items-center ${isLast ? '' : 'flex-1'}`}
          >
            {/* Stage Node */}
            <div className="flex flex-col items-center">
              <div
                className={`
                  relative flex items-center justify-center rounded-full transition-all duration-300
                  ${compact ? 'w-7 h-7' : 'w-10 h-10'}
                  ${
                    isCompleted
                      ? 'bg-green-500 text-white shadow-md shadow-green-200'
                      : isCurrent
                        ? 'bg-brand-blue text-white shadow-lg shadow-blue-200 ring-4 ring-blue-100'
                        : 'bg-neutral-100 text-neutral-400 border-2 border-neutral-200'
                  }
                `}
              >
                {isCompleted ? (
                  <Check size={compact ? 14 : 18} strokeWidth={3} />
                ) : (
                  <Icon size={compact ? 12 : 16} />
                )}
              </div>

              {!compact && (
                <span
                  className={`mt-2 text-xs font-semibold text-center max-w-[90px] leading-tight ${
                    isCompleted
                      ? 'text-green-600'
                      : isCurrent
                        ? 'text-brand-blue'
                        : 'text-neutral-400'
                  }`}
                >
                  {STAGE_LABELS[stage]}
                </span>
              )}
            </div>

            {/* Connector Line */}
            {!isLast && (
              <div
                className={`flex-1 ${compact ? 'mx-0.5' : 'mx-2'} ${compact ? 'h-0.5' : 'h-1'} rounded-full ${compact ? '-mt-0' : '-mt-5'} ${
                  isCompleted
                    ? 'bg-green-400'
                    : isCurrent && !isPending
                      ? 'bg-gradient-to-r from-brand-blue to-neutral-200'
                      : 'bg-neutral-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
