'use client';

import React, { useState } from 'react';
import { PropertyData } from '@/store/wizard-store';
import { useTranslation } from '@/lib/i18n';
import {
  Calendar as CalendarIcon,
  Clock,
  X,
  Plus,
  AlertCircle,
} from 'lucide-react';

interface StepProps {
  data: PropertyData;
  onChange: (data: Partial<PropertyData>) => void;
  errors: Record<string, string>;
}

export const Step7Availability: React.FC<StepProps> = ({
  data,
  onChange,
  errors,
}) => {
  const { formatDate } = useTranslation();
  const [newBlockedDate, setNewBlockedDate] = useState('');

  const handleChange = (field: keyof PropertyData, value: unknown) => {
    onChange({ [field]: value });
  };

  const addBlockedDate = () => {
    if (!newBlockedDate) return;
    const current = data.blockedDates || [];
    if (!current.includes(newBlockedDate)) {
      handleChange('blockedDates', [...current, newBlockedDate].sort());
    }
    setNewBlockedDate('');
  };

  const removeBlockedDate = (date: string) => {
    const current = data.blockedDates || [];
    handleChange(
      'blockedDates',
      current.filter((d) => d !== date),
    );
  };

  return (
    <div className="space-y-10 animate-slide-in">
      <div className="flex flex-col space-y-4">
        <label className="text-xl font-bold flex items-center text-neutral-900 dark:text-neutral-100 mb-6">
          <Clock className="mr-3 text-brand-blue" />
          Availability & Schedule
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Available From */}
          <div className="space-y-4">
            <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 flex items-center">
              <CalendarIcon className="mr-2 text-brand-blue" size={16} />{' '}
              Available For Viewings From (Required)
            </span>
            <div className="relative group">
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={data.availableFrom || ''}
                onChange={(e) => handleChange('availableFrom', e.target.value)}
                className={`w-full p-4 bg-neutral-50 dark:bg-neutral-800 border-2 rounded-2xl focus:outline-none focus:ring-4 transition-all
                  ${errors.availableFrom ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-transparent focus:border-brand-blue focus:ring-brand-blue/10'}`}
              />
            </div>
            {errors.availableFrom && (
              <span className="text-xs text-red-500 font-medium">
                {errors.availableFrom}
              </span>
            )}

            <p className="text-xs text-neutral-500 mt-2 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800">
              <AlertCircle size={14} className="inline mr-1 text-brand-blue" />
              Specify the date when you can start showing the property to
              interested tenants.
            </p>
          </div>

          {/* Blocked Dates */}
          <div className="space-y-4 pt-4 md:pt-0">
            <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 flex items-center">
              <X className="mr-2 text-red-500" size={16} /> Blocked Dates
              (Optional)
            </span>

            <div className="flex space-x-2">
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={newBlockedDate}
                onChange={(e) => setNewBlockedDate(e.target.value)}
                className="flex-1 p-3.5 bg-neutral-50 dark:bg-neutral-800 border-2 border-transparent focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 rounded-2xl transition-all"
              />
              <button
                onClick={addBlockedDate}
                className="bg-brand-blue hover:bg-brand-blue-dark text-white p-3.5 rounded-2xl shadow-lg transition-all active:scale-95"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
              {(data.blockedDates || []).length === 0 ? (
                <div className="text-center py-8 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border-2 border-dashed border-neutral-100 dark:border-neutral-800">
                  <span className="text-xs text-neutral-400">
                    No dates blocked yet
                  </span>
                </div>
              ) : (
                data.blockedDates?.map((date) => (
                  <div
                    key={date}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 shadow-sm group animate-slide-in"
                  >
                    <span className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
                      {formatDate(date, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                    <button
                      onClick={() => removeBlockedDate(date)}
                      className="text-neutral-400 hover:text-red-500 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
