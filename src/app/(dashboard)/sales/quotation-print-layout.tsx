import { numberToWords } from "@/lib/number-to-words";
import { formatInTimezone, formatDateTimeInTimezone } from "@/lib/date-utils";

type OrgForInvoice = {
  name: string;
  address: string | null;
  logoUrl: string | null;
  sealUrl: string | null;
  phone: string | null;
  fax: string | null;
  website: string | null;
  taxRegistrationNo: string | null;
  bankDetails: string | null;
  timezone: string | null;
} | null;

type QuotationForPrint = {
  quotationNo: string;
  quotationDate: Date;
  validUntil: Date | null;
  jobId: string | null;
  client: {
    name: string;
    contactName: string | null;
    email: string | null;
    address: string | null;
    taxNumber: string | null;
  };
  items: Array<{
    item: { name: string; sku: string };
    quantity: number;
    purchaseCost: { toString: () => string } | number;
    margin: { toString: () => string } | number;
    unitPrice: { toString: () => string } | number;
    total: { toString: () => string } | number;
  }>;
  notes: string | null;
  status: string;
  approvedByName?: string | null;
  approvedAt?: Date | null;
};

export function QuotationPrintLayout({
  quotation,
  org,
}: {
  quotation: QuotationForPrint;
  org: OrgForInvoice;
}) {
  if (!quotation) return null;

  const tz = org?.timezone ?? "UTC";
  const total = quotation.items.reduce((s, i) => s + Number(i.total), 0);
  const amountWords = numberToWords(total);

  return (
    <div className="invoice-container w-[210mm] min-h-[297mm] p-[10mm] mx-auto bg-white font-sans text-sm">
      <style>{`
        @media print {
          body { background: none; padding: 0; }
          .invoice-container { border: none; margin: 0; width: 100%; }
          .no-print { display: none !important; }
        }
        .invoice-container table { border-collapse: collapse; width: 100%; }
        .invoice-container th, .invoice-container td { border: 1px solid #333; padding: 4px 8px; font-size: 11px; }
        .invoice-container .no-border td { border: none !important; }
      `}</style>

      {/* Header */}
      <div className="flex justify-between items-start border-b border-gray-300 pb-4 mb-4">
        <div className="flex gap-4">
          {org?.logoUrl && (
            <div className="h-16 w-32 flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={org.logoUrl}
                alt="Logo"
                className="h-full w-full object-contain"
              />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold">{org?.name ?? "Company"}</h1>
            {org?.address && (
              <p className="text-xs text-gray-600 whitespace-pre-wrap mt-1">
                {org.address}
              </p>
            )}
            <div className="text-xs text-gray-600 mt-1 space-y-0.5">
              {org?.taxRegistrationNo && <span>TRN: {org.taxRegistrationNo}</span>}
              {org?.phone && <span>Tel: {org.phone}</span>}
              {org?.fax && <span className="ml-4">Fax: {org.fax}</span>}
              {org?.website && (
                <p>
                  <a href={org.website} className="text-blue-600">
                    {org.website}
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-lg font-bold">QUOTATION</div>
          <div className="text-xs text-gray-600 mt-1 space-y-0.5">
            <div>
              <span className="font-medium">Quotation No:</span>{" "}
              <span>{quotation.quotationNo}</span>
            </div>
            <div>
              <span className="font-medium">Quotation Date:</span>{" "}
              <span>{formatInTimezone(quotation.quotationDate, tz)}</span>
            </div>
            {quotation.validUntil && (
              <div>
                <span className="font-medium">Valid Until:</span>{" "}
                <span>{formatInTimezone(quotation.validUntil, tz)}</span>
              </div>
            )}
            {quotation.jobId && (
              <div>
                <span className="font-medium">Job ID:</span>{" "}
                <span>{quotation.jobId}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Client + Bank */}
      <div className="flex justify-between gap-6 mb-4">
        <div className="w-1/2">
          <div className="text-xs text-gray-600 font-medium mb-1">Client</div>
          <div className="text-sm font-medium">{quotation.client.name}</div>
          {quotation.client.contactName && (
            <div className="text-xs text-gray-600 mt-1">
              Attention: {quotation.client.contactName}
            </div>
          )}
          {quotation.client.email && (
            <div className="text-xs text-gray-600 mt-1">
              Email: {quotation.client.email}
            </div>
          )}
          {quotation.client.address && (
            <div className="text-xs text-gray-600 whitespace-pre-wrap mt-1">
              {quotation.client.address}
            </div>
          )}
          {quotation.client.taxNumber && (
            <div className="text-xs text-gray-600 mt-1">
              Tax: {quotation.client.taxNumber}
            </div>
          )}
        </div>
        <div className="w-1/2">
          <div className="text-xs text-gray-600 font-medium mb-1">Bank Details</div>
          <div className="text-xs text-gray-600 whitespace-pre-wrap">
            {org?.bankDetails ?? "—"}
          </div>
        </div>
      </div>

      {/* Items table */}
      <table>
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left py-2">S No</th>
            <th className="text-left">Item</th>
            <th className="text-right">Qty</th>
            <th className="text-right">Purchase (cost)</th>
            <th className="text-right">Margin %</th>
            <th className="text-right">Price</th>
            <th className="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {quotation.items.map((it, idx) => (
            <tr key={it.item.sku + idx}>
              <td>{idx + 1}</td>
              <td>
                {it.item.sku} - {it.item.name}
              </td>
              <td className="text-right">{it.quantity}</td>
              <td className="text-right">{Number(it.purchaseCost).toFixed(2)}</td>
              <td className="text-right">{Number(it.margin).toFixed(2)}%</td>
              <td className="text-right">{Number(it.unitPrice).toFixed(2)}</td>
              <td className="text-right">{Number(it.total).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-4 flex justify-end">
        <table className="w-72 no-border text-xs">
          <tbody>
            <tr>
              <td className="font-medium py-1">Quotation Total</td>
              <td className="text-right">
                {total.toFixed(2)}
              </td>
            </tr>
            <tr>
              <td className="font-medium py-1">Amount in words</td>
              <td className="text-right text-muted-foreground">
                {amountWords}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Notes */}
      {quotation.notes && (
        <div className="mt-3 text-xs text-gray-600 whitespace-pre-wrap">
          <span className="font-medium">Notes: </span>
          {quotation.notes}
        </div>
      )}

      {/* Signature / stamp */}
      <div className="mt-12 grid grid-cols-3 gap-8 text-xs">
        <div className="border-t border-gray-400 pt-2">
          <p className="font-medium">Prepared By</p>
          <p className="mt-2 font-medium">—</p>
        </div>
        <div className="border-t border-gray-400 pt-2">
          <p className="font-medium">Approved By</p>
          <p className="mt-2 font-medium">
            {quotation.approvedByName ?? "—"}
          </p>
          {quotation.approvedAt && (
            <p className="text-gray-500 mt-0.5">
              {formatInTimezone(quotation.approvedAt, tz)}
            </p>
          )}
          {org?.sealUrl && quotation.approvedAt && (
            <div className="mt-2 h-12 w-24">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={org.sealUrl}
                alt="Stamp"
                className="h-full w-full object-contain"
              />
            </div>
          )}
        </div>
        <div className="border-t border-gray-400 pt-2">
          <p className="font-medium">Customer Acknowledgement</p>
          <p className="text-gray-500 mt-4">________________</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-4 border-t text-xs text-gray-500 text-center">
        <p>Generated on {formatDateTimeInTimezone(new Date(), tz)}</p>
      </div>
    </div>
  );
}

