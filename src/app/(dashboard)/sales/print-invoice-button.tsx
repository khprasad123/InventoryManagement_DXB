"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface PrintInvoiceButtonProps {
  invoice: {
    invoiceNo: string;
    invoiceDate: Date;
    dueDate: Date | null;
    client: { name: string; contactName: string | null; email: string | null; address: string | null };
    items: Array<{
      item: { name: string; sku: string };
      quantity: number;
      unitPrice: { toString: () => string } | number;
      total: { toString: () => string } | number;
    }>;
    subtotal: { toString: () => string } | number;
    taxAmount: { toString: () => string } | number;
    totalAmount: { toString: () => string } | number;
    notes: string | null;
  };
}

export function PrintInvoiceButton({ invoice }: PrintInvoiceButtonProps) {
  function handlePrint() {
    window.print();
  }

  return (
    <Button variant="outline" onClick={handlePrint}>
      <Printer className="mr-2 h-4 w-4" />
      Print
    </Button>
  );
}
