export type Row = Record<string, unknown>;

export function collectHeaders(rows: Row[]): string[] {
  const headers = new Set<string>();
  rows.forEach((row) => Object.keys(row).forEach((key) => headers.add(key)));
  return [...headers];
}

export function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str =
    value instanceof Date
      ? value.toISOString()
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function toCsv(rows: Row[]): string {
  const headers = collectHeaders(rows);
  const lines = [headers.map(escapeCsvValue).join(',')];
  rows.forEach((row) =>
    lines.push(headers.map((h) => escapeCsvValue(row[h])).join(',')),
  );
  return lines.join('\r\n');
}
