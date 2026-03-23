"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type ImportLogRow = {
  rowNumber: number;
  identifier: string;
  status: "SUCCESS" | "FAILED";
  message: string;
};

function downloadTextFile({ content, fileName }: { content: string; fileName: string }) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function CsvBulkImportCard({
  title,
  subtitle,
  endpoint,
  templateFileName,
  templateCsv,
  entityLabel,
  onAfterImport,
}: {
  title: string;
  subtitle?: string;
  endpoint: string;
  templateFileName: string;
  templateCsv: string;
  entityLabel: string;
  onAfterImport?: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [results, setResults] = useState<ImportLogRow[]>([]);
  const [logCsv, setLogCsv] = useState<string | null>(null);

  const summary = useMemo(() => {
    const success = results.filter((r) => r.status === "SUCCESS").length;
    const failed = results.filter((r) => r.status === "FAILED").length;
    return { success, failed, total: results.length };
  }, [results]);

  async function handleUpload(file: File | null) {
    setUploadError(null);
    setResults([]);
    setLogCsv(null);
    if (!file) return;

    setPending(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch(endpoint, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUploadError(data?.error ?? "Bulk upload failed.");
        return;
      }

      setResults((data?.results ?? []) as ImportLogRow[]);
      setLogCsv(data?.logCsv ?? null);

      onAfterImport?.();
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setUploadError(msg || "Bulk upload failed.");
    } finally {
      setPending(false);
    }
  }

  function handleDownloadTemplate() {
    downloadTextFile({ content: templateCsv, fileName: templateFileName });
  }

  function handleDownloadLog() {
    if (!logCsv) return;
    const date = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    downloadTextFile({ content: logCsv, fileName: `${entityLabel}-bulk-log-${date}.csv` });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-4">
          <span>{title}</span>
          {results.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {summary.success} success, {summary.failed} failed
            </span>
          )}
        </CardTitle>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <Button variant="outline" type="button" onClick={handleDownloadTemplate} disabled={pending}>
              Download {entityLabel} CSV Template
            </Button>
            <Input
              type="file"
              accept=".csv"
              disabled={pending}
              onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
            />
          </div>
          {logCsv && (
            <Button variant="outline" type="button" onClick={handleDownloadLog} disabled={pending}>
              Download Import Log
            </Button>
          )}
        </div>

        {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}

        {results.length > 0 && (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[90px]">Row</TableHead>
                  <TableHead>Identifier</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => (
                  <TableRow key={`${r.rowNumber}-${r.identifier}`}>
                    <TableCell className="text-sm">{r.rowNumber}</TableCell>
                    <TableCell className="text-sm">{r.identifier}</TableCell>
                    <TableCell>
                      {r.status === "SUCCESS" ? (
                        <Badge variant="success">Success</Badge>
                      ) : (
                        <Badge variant="danger">Failed</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{r.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

