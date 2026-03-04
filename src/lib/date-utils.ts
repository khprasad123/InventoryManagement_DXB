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
