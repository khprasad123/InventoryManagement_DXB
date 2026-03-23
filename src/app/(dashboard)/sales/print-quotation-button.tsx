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

    // Print using an offscreen iframe to avoid opening a blank new tab.
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";

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

    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) {
      try {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      } catch {
        // ignore cleanup errors
      }
      return window.print();
    }

    doc.open();
    doc.write(pageHtml);
    doc.close();

    iframe.contentWindow?.focus();

    setTimeout(() => {
      iframe.contentWindow?.print();
      try {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      } catch {
        // ignore cleanup errors (e.g. double-click race)
      }
    }, 100);
  }

  return (
    <Button variant="outline" onClick={handlePrint}>
      <Printer className="mr-2 h-4 w-4" />
      Print
    </Button>
  );
}

