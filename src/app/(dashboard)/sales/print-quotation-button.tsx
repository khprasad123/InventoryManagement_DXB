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
    const el = document.querySelector(".invoice-container");
    if (!el) return window.print();

    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) return window.print();

    // Clone existing styles so the printed markup renders correctly.
    const linkStyles = Array.from(
      document.querySelectorAll("link[rel='stylesheet']")
    ).map((l) => (l as HTMLLinkElement).outerHTML);
    const styleTags = Array.from(document.querySelectorAll("style")).map(
      (s) => s.outerHTML
    );

    const pageHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    ${linkStyles.join("\n")}
    ${styleTags.join("\n")}
    <style>@page { size: A4; margin: 0; }</style>
  </head>
  <body>
    ${el.outerHTML}
  </body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(pageHtml);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 0);
  }

  return (
    <Button variant="outline" onClick={handlePrint}>
      <Printer className="mr-2 h-4 w-4" />
      Print
    </Button>
  );
}

