import { numberToWords } from "@/lib/number-to-words";

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
} | null;

type InvoiceForPrint = {
  invoiceNo: string;
  invoiceDate: Date;
  dueDate: Date | null;
  jobId: string | null;
  client: {
    name: string;
    contactName: string | null;
    email: string | null;
    address: string | null;
    taxNumber: string | null;
    siteLocation?: string | null;
    building?: string | null;
  };
  items: Array<{
    item: { name: string; sku: string; unit?: string | null };
    quantity: number;
    unitPrice: { toString: () => string } | number;
    taxPercent?: { toString: () => string } | number;
    total: { toString: () => string } | number;
  }>;
  subtotal: { toString: () => string } | number;
  taxAmount: { toString: () => string } | number;
  totalAmount: { toString: () => string } | number;
  notes: string | null;
  currencyCode: string;
  defaultTaxPercent?: { toString: () => string } | number;
  createdBy?: { name: string | null } | null;
  approvedBy?: { name: string | null; signatureUrl?: string | null } | null;
  approvedAt?: Date | null;
};

export function InvoicePrintLayout({
  invoice,
  org,
}: {
  invoice: InvoiceForPrint;
  org: OrgForInvoice;
}) {
  if (!invoice) return null;

  const total = Number(invoice.totalAmount);
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

      {/* Header: Logo + Org name | Org address, TRN, Tel, Fax, website (no stamp here) */}
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
              {org?.phone && <span>Tel: {org.phone}</span>}
              {org?.fax && <span className="ml-4">Fax: {org.fax}</span>}
              {org?.website && (
                <p>
                  <a href={org.website} className="text-blue-600">
                    {org.website}
                  </a>
                </p>
              )}
              {org?.taxRegistrationNo && (
                <p className="font-medium">Tax Registration No: {org.taxRegistrationNo}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Title bar */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Tax Invoice</h2>
        <p className="font-mono font-medium">{invoice.invoiceNo}</p>
      </div>

      {/* Metadata: 2 columns */}
      <table className="mb-4 no-border">
        <tbody>
          <tr>
            <td className="align-top w-1/2 pr-8">
              <table className="no-border text-xs">
                <tbody>
                  <tr><td className="font-medium text-gray-600 py-0.5">Customer Name</td></tr>
                  <tr><td className="pb-1">{invoice.client.name}</td></tr>
                  <tr><td className="font-medium text-gray-600 py-0.5">Address</td></tr>
                  <tr><td className="pb-1">{invoice.client.address ?? "-"}</td></tr>
                  <tr><td className="font-medium text-gray-600 py-0.5">TRN</td></tr>
                  <tr><td className="pb-1">{invoice.client.taxNumber ?? "-"}</td></tr>
                  <tr><td className="font-medium text-gray-600 py-0.5">Site Location</td></tr>
                  <tr><td>{invoice.client.siteLocation ?? "-"}</td></tr>
                  <tr><td className="font-medium text-gray-600 py-0.5">Building</td></tr>
                  <tr><td>{invoice.client.building ?? "-"}</td></tr>
                </tbody>
              </table>
            </td>
            <td className="align-top w-1/2">
              <table className="no-border text-xs">
                <tbody>
                  <tr>
                    <td className="font-medium text-gray-600 w-32 py-0.5">Invoice Date</td>
                    <td>{new Date(invoice.invoiceDate).toLocaleDateString()}</td>
                  </tr>
                  <tr>
                    <td className="font-medium text-gray-600 py-0.5">Ref No</td>
                    <td>{invoice.invoiceNo}</td>
                  </tr>
                  <tr>
                    <td className="font-medium text-gray-600 py-0.5">Job ID</td>
                    <td>{invoice.jobId ?? "-"}</td>
                  </tr>
                  <tr>
                    <td className="font-medium text-gray-600 py-0.5">Payment Terms</td>
                    <td>-</td>
                  </tr>
                  <tr>
                    <td className="font-medium text-gray-600 py-0.5">Due Date</td>
                    <td>
                      {invoice.dueDate
                        ? new Date(invoice.dueDate).toLocaleDateString()
                        : "-"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Items table */}
      <table>
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left py-2">S No</th>
            <th className="text-left">Code</th>
            <th className="text-left">Item</th>
            <th className="text-left">Unit</th>
            <th className="text-right">Qty</th>
            <th className="text-right">Rate</th>
            <th className="text-right">Net Amount</th>
            <th className="text-right">Tax %</th>
            <th className="text-right">Tax Amount</th>
            <th className="text-right">Gross Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((it, idx) => {
            const qty = it.quantity;
            const rate = Number(it.unitPrice);
            const netAmount = qty * rate;
            const taxPct = Number(it.taxPercent ?? invoice.defaultTaxPercent ?? 5);
            const taxAmt = (netAmount * taxPct) / 100;
            const gross = netAmount + taxAmt;
            return (
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td>{it.item.sku}</td>
                <td>{it.item.name}</td>
                <td>{it.item.unit ?? "-"}</td>
                <td className="text-right">{qty}</td>
                <td className="text-right">{rate.toFixed(2)}</td>
                <td className="text-right">{netAmount.toFixed(2)}</td>
                <td className="text-right">{taxPct}%</td>
                <td className="text-right">{taxAmt.toFixed(2)}</td>
                <td className="text-right">{gross.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-4 flex justify-end">
        <table className="w-64 no-border text-xs">
          <tbody>
            <tr>
              <td className="font-medium py-1">Invoice Amount</td>
              <td className="text-right">{Number(invoice.subtotal).toFixed(2)} {invoice.currencyCode}</td>
            </tr>
            <tr>
              <td className="font-medium py-1">Deductions</td>
              <td className="text-right">0.00</td>
            </tr>
            <tr>
              <td className="font-medium py-1">Taxable Value</td>
              <td className="text-right">{Number(invoice.subtotal).toFixed(2)}</td>
            </tr>
            <tr>
              <td className="font-medium py-1">VAT Amount</td>
              <td className="text-right">{Number(invoice.taxAmount).toFixed(2)}</td>
            </tr>
            <tr className="border-t-2 border-gray-800">
              <td className="font-bold py-2">Net Amount</td>
              <td className="text-right font-bold">
                {Number(invoice.totalAmount).toFixed(2)} {invoice.currencyCode}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Amount in words */}
      <p className="mt-4 text-xs italic">
        Amount in words: {amountWords} {invoice.currencyCode} only
      </p>

      {/* Notes & Bank details */}
      <div className="mt-6 pt-4 border-t space-y-2 text-xs">
        {invoice.notes && <p><span className="font-medium">Remarks:</span> {invoice.notes}</p>}
        {org?.bankDetails && (
          <p><span className="font-medium">Bank Details:</span> {org.bankDetails}</p>
        )}
      </div>

      {/* Signature section: Prepared by, Approved by + stamp */}
      <div className="mt-12 grid grid-cols-3 gap-8 text-xs">
        <div className="border-t border-gray-400 pt-2">
          <p className="font-medium">Prepared By</p>
          <p className="mt-2 font-medium">{invoice.createdBy?.name ?? "—"}</p>
        </div>
        <div className="border-t border-gray-400 pt-2 flex flex-col items-start">
          <p className="font-medium">Approved By</p>
          <p className="mt-2 font-medium">{invoice.approvedBy?.name ?? "—"}</p>
          {invoice.approvedAt && (
            <p className="text-gray-500 mt-0.5">
              {new Date(invoice.approvedAt).toLocaleDateString()}
            </p>
          )}
          {invoice.approvedBy?.signatureUrl && (
            <div className="mt-2 h-12 w-24">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={invoice.approvedBy.signatureUrl}
                alt="Approver signature"
                className="h-full w-full object-contain"
              />
            </div>
          )}
          {org?.sealUrl && (
            <div className="mt-2 flex items-center gap-2">
              <div className="h-10 w-10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={org.sealUrl}
                  alt="Stamp"
                  className="h-full w-full object-contain"
                />
              </div>
              <span className="text-gray-500">Stamp</span>
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
        <p>Generated on {new Date().toLocaleString()}</p>
        {invoice.jobId && <p>Job ID: {invoice.jobId}</p>}
      </div>
    </div>
  );
}
