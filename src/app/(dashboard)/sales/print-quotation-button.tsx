"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface PrintQuotationButtonProps {
  quotation: {
    quotationNo: string;
  };
}

export function PrintQuotationButton({ quotation }: PrintQuotationButtonProps) {
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

