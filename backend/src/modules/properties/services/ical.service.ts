import { Injectable } from '@nestjs/common';

export interface ICalDay {
  date: string;
  available: boolean;
  customPrice?: number | string | null;
  notes?: string | null;
}

@Injectable()
export class ICalService {
  /** Builds an RFC 5545 feed with one all-day VEVENT per blocked date span. */
  buildFeed(
    propertyId: string,
    propertyName: string,
    days: ICalDay[],
    now: Date = new Date(),
  ): string {
    const stamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Chioma//Property Availability//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${this.escape(propertyName)}`,
    ];

    for (const span of this.blockedSpans(days)) {
      lines.push(
        'BEGIN:VEVENT',
        `UID:${propertyId}-${span.start}@chioma`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${span.start.replace(/-/g, '')}`,
        `DTEND;VALUE=DATE:${this.nextDay(span.end).replace(/-/g, '')}`,
        'SUMMARY:Not available',
        'TRANSP:OPAQUE',
        'END:VEVENT',
      );
    }

    lines.push('END:VCALENDAR');
    return lines.map((line) => this.fold(line)).join('\r\n') + '\r\n';
  }

  private blockedSpans(days: ICalDay[]): { start: string; end: string }[] {
    const spans: { start: string; end: string }[] = [];
    const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
    for (const day of sorted) {
      if (day.available) continue;
      const last = spans[spans.length - 1];
      if (last && this.nextDay(last.end) === day.date) {
        last.end = day.date;
      } else {
        spans.push({ start: day.date, end: day.date });
      }
    }
    return spans;
  }

  private nextDay(date: string): string {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().split('T')[0];
  }

  private escape(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }

  /** Folds lines longer than 75 octets per RFC 5545 §3.1. */
  private fold(line: string): string {
    if (line.length <= 75) return line;
    const parts = [line.slice(0, 75)];
    for (let i = 75; i < line.length; i += 74) {
      parts.push(' ' + line.slice(i, i + 74));
    }
    return parts.join('\r\n');
  }
}
