'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameMonth,
  isToday,
} from 'date-fns';
import { useDateFnsLocale } from '@/lib/utils/date-fns-locale';

export default function HostCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const dateFnsLocale = useDateFnsLocale();

  const { data: properties = [], isLoading: loadingProps } = useQuery({
    queryKey: ['host-listings'],
    queryFn: async () => {
      const res = await fetch('/api/properties?role=host');
      const data = await res.json();
      return data.data ?? data ?? [];
    },
  });

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });
  const startPadding = getDay(startOfMonth(currentMonth));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Availability Calendar</h1>
        <p className="text-blue-300/60 mt-1">Manage availability and pricing</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Property selector */}
        <div className="lg:col-span-1 space-y-2">
          <p className="text-sm font-medium text-blue-300/60 mb-3">
            Select property
          </p>
          {loadingProps ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-11 rounded-xl bg-white/5 border border-white/10 animate-pulse"
              />
            ))
          ) : properties.length === 0 ? (
            <p className="text-sm text-blue-300/40">No listings found</p>
          ) : (
            properties.map(
              (p: { id: string; title?: string; [key: string]: unknown }) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProperty(p.id)}
                  className={`w-full text-left p-3 rounded-xl border text-sm transition-all ${
                    selectedProperty === p.id
                      ? 'border-blue-500 bg-blue-500/10 text-white'
                      : 'border-white/10 bg-white/5 text-blue-200/70 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="shrink-0" />
                    <span className="line-clamp-1">{p.title}</span>
                  </div>
                </button>
              ),
            )
          )}
        </div>

        {/* Calendar */}
        <div className="lg:col-span-3">
          <div className="backdrop-blur-xl bg-slate-800/50 border border-white/10 rounded-2xl p-6">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() =>
                  setCurrentMonth(
                    new Date(
                      currentMonth.getFullYear(),
                      currentMonth.getMonth() - 1,
                    ),
                  )
                }
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-lg font-semibold">
                {format(currentMonth, 'MMMM yyyy', { locale: dateFnsLocale })}
              </h2>
              <button
                onClick={() =>
                  setCurrentMonth(
                    new Date(
                      currentMonth.getFullYear(),
                      currentMonth.getMonth() + 1,
                    ),
                  )
                }
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div
                  key={d}
                  className="text-center text-xs text-blue-300/40 py-2 font-medium"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startPadding }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {days.map((day) => (
                <button
                  key={day.toISOString()}
                  className={`aspect-square flex items-center justify-center rounded-lg text-sm transition-all hover:bg-blue-500/20 ${
                    isToday(day)
                      ? 'bg-blue-500/30 text-blue-300 font-bold ring-1 ring-blue-500/50'
                      : 'text-blue-200/70'
                  } ${!isSameMonth(day, currentMonth) ? 'opacity-30' : ''}`}
                >
                  {format(day, 'd', { locale: dateFnsLocale })}
                </button>
              ))}
            </div>

            {!selectedProperty && (
              <p className="text-center text-blue-300/40 text-sm mt-6">
                Select a property to manage availability
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
