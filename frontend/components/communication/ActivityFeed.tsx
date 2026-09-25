'use client';

import { formatDistanceToNow } from 'date-fns';
import { useDateFnsLocale } from '@/lib/utils/date-fns-locale';
import {
  BellRing,
  CheckCircle2,
  MessageSquare,
  ShieldAlert,
  Star,
} from 'lucide-react';

export interface ActivityFeedItem {
  id: string;
  type: 'message' | 'notification' | 'review' | 'system';
  title: string;
  description: string;
  createdAt: string;
  status?: 'new' | 'read' | 'resolved';
}

interface ActivityFeedProps {
  items: ActivityFeedItem[];
  title?: string;
}

const TYPE_STYLES = {
  message: {
    icon: MessageSquare,
    tone: 'border-blue-400/20 bg-blue-400/10 text-blue-200',
  },
  notification: {
    icon: BellRing,
    tone: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200',
  },
  review: {
    icon: Star,
    tone: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
  },
  system: {
    icon: ShieldAlert,
    tone: 'border-violet-400/20 bg-violet-400/10 text-violet-200',
  },
} as const;

export function ActivityFeed({
  items,
  title = 'Activity Feed',
}: ActivityFeedProps) {
  const dateFnsLocale = useDateFnsLocale();
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm text-blue-100/55">
            A unified stream for communication events and user interaction
            signals.
          </p>
        </div>
        <CheckCircle2 className="h-5 w-5 text-emerald-300" />
      </div>

      <div className="mt-6 space-y-4">
        {items.map((item) => {
          const Icon = TYPE_STYLES[item.type].icon;
          return (
            <article
              key={item.id}
              className="flex items-start gap-4 rounded-[1.5rem] border border-white/10 bg-slate-950/35 p-4"
            >
              <div
                className={`rounded-2xl border p-3 ${TYPE_STYLES[item.type].tone}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="truncate font-semibold text-white">
                    {item.title}
                  </h3>
                  <span className="text-xs text-blue-100/40">
                    {formatDistanceToNow(new Date(item.createdAt), {
                      addSuffix: true,
                      locale: dateFnsLocale,
                    })}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-blue-100/65">
                  {item.description}
                </p>
                {item.status ? (
                  <span className="mt-3 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-100/55">
                    {item.status}
                  </span>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
