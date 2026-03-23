/**
 * Calculate due date from invoice date using payment terms (days).
 * @param invoiceDate - Invoice date
 * @param paymentTermsDays - Number of days (e.g. 30 for NET 30). Defaults to 30 if null/undefined.
 */
export function calculateDueDate(
  invoiceDate: Date,
  paymentTermsDays: number | null | undefined
): Date {
  const days = paymentTermsDays ?? 30;
  const due = new Date(invoiceDate);
  due.setDate(due.getDate() + days);
  return due;
}

/** Format a date in the org's timezone. DB stores UTC; use this for display. */
export function formatInTimezone(
  date: Date | string,
  timezone: string = "UTC",
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  }
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: timezone }).format(d);
}

/** Format date and time in org timezone (for audit, timestamps). */
export function formatDateTimeInTimezone(
  date: Date | string,
  timezone: string = "UTC",
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: timezone }).format(d);
}

/** Format date only (YYYY-MM-DD style for forms). */
export function formatDateOnlyInTimezone(
  date: Date | string,
  timezone: string = "UTC"
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: timezone,
  }).format(d);
}
