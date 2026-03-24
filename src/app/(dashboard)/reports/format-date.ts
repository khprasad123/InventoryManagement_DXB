/**
 * Formats a date for display. Uses UTC to ensure identical output on server
 * and client, avoiding hydration mismatches from locale differences.
 */
export function formatReportDateTime(d: Date | string): string {
  const x = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = pad(x.getUTCDate());
  const month = pad(x.getUTCMonth() + 1);
  const year = x.getUTCFullYear();
  const h = x.getUTCHours();
  const min = pad(x.getUTCMinutes());
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${day}/${month}/${year}, ${h12}:${min} ${ampm}`;
}
