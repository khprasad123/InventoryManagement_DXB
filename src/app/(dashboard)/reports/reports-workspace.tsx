"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteReportFile, generateAndStoreReportFile } from "./actions";
import { formatReportDateTime } from "./format-date";
import type { ReportType } from "@/lib/permissions";

type GeneratedFile = {
  id: string;
  reportType: string;
  format: string;
  metadata: unknown;
  createdAt: string;
  expiresAt: string;
  document: { id: string; fileName: string };
};

const ALL_REPORT_TYPES = [
  { value: "overview", label: "Overview" },
  { value: "sales", label: "Sales" },
  { value: "purchases", label: "Purchases" },
  { value: "profit_loss", label: "Profit & Loss" },
  { value: "suppliers", label: "Supplier" },
  { value: "inventory", label: "Inventory" },
  { value: "trial_balance", label: "Trial Balance" },
  { value: "balance_sheet", label: "Balance Sheet" },
  { value: "receivables_aging", label: "Receivables Aging (AR)" },
  { value: "payables_aging", label: "Payables Aging (AP)" },
] as const;

export function ReportsWorkspace({
  initialFiles,
  canDelete,
  defaultFrom,
  defaultTo,
  allowedReportTypes,
}: {
  initialFiles: GeneratedFile[];
  canDelete: boolean;
  defaultFrom: string;
  defaultTo: string;
  allowedReportTypes: string[];
}) {
  const reportTypes = ALL_REPORT_TYPES.filter((rt) => allowedReportTypes.includes(rt.value));
  const defaultType: ReportType = (reportTypes[0]?.value as ReportType) ?? "overview";

  const [files, setFiles] = useState(initialFiles);
  const [reportType, setReportType] = useState<ReportType>(defaultType);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [generatedFrom, setGeneratedFrom] = useState("");
  const [generatedTo, setGeneratedTo] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);
  const [isPending, startTransition] = useTransition();

  const filteredFiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromDate = generatedFrom ? new Date(`${generatedFrom}T00:00:00.000Z`) : null;
    const toDate = generatedTo ? new Date(`${generatedTo}T23:59:59.999Z`) : null;
    return files.filter((f) => {
      if (typeFilter !== "all" && f.reportType !== typeFilter) return false;
      if (q) {
        const hay = `${f.document.fileName} ${f.reportType}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      const created = new Date(f.createdAt);
      if (fromDate && created < fromDate) return false;
      if (toDate && created > toDate) return false;
      return true;
    });
  }, [files, search, typeFilter, generatedFrom, generatedTo]);

  function handleGenerate() {
    if (!from || !to) {
      setError("Please select both From and To dates.");
      return;
    }
    setError(null);
    setOpen(true);
    setProgress(0);
    cancelledRef.current = false;
    progressIntervalRef.current = setInterval(() => {
      setProgress((p) => (p >= 85 ? 85 : p + 4));
    }, 200);

    startTransition(async () => {
      try {
        const result = await generateAndStoreReportFile(reportType, { from, to, asOf: to });
        if (cancelledRef.current) return;
        clearInterval(progressIntervalRef.current ?? undefined);
        setProgress(100);
        const gf = result.generatedFile;
        if (gf) {
          setFiles((prev) => [gf, ...prev]);
        }
      } catch (e) {
        if (cancelledRef.current) return;
        clearInterval(progressIntervalRef.current ?? undefined);
        setError(e instanceof Error ? e.message : "Failed to generate report.");
      }
    });
  }

  function handleCancelProgress() {
    cancelledRef.current = true;
    clearInterval(progressIntervalRef.current ?? undefined);
    setOpen(false);
  }

  function handleDelete(documentId: string) {
    if (!window.confirm("Delete this report file now?")) return;
    setPendingId(documentId);
    startTransition(async () => {
      try {
        await deleteReportFile(documentId);
        setFiles((prev) => prev.filter((f) => f.document.id !== documentId));
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate Report</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm text-muted-foreground">Report Type</label>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              disabled={isPending}
            >
              {reportTypes.map((rt) => (
                <option key={rt.value} value={rt.value}>
                  {rt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">From</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} disabled={isPending} />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">To</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} disabled={isPending} />
          </div>
          <div className="flex items-end">
            <Button type="button" className="w-full" onClick={handleGenerate} disabled={isPending}>
              {isPending ? "Generating..." : "Generate"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generated Reports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Input
              placeholder="Search file or report type"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All report types</option>
              {reportTypes.map((rt) => (
                <option key={rt.value} value={rt.value}>
                  {rt.label}
                </option>
              ))}
            </select>
            <Input type="date" value={generatedFrom} onChange={(e) => setGeneratedFrom(e.target.value)} />
            <Input type="date" value={generatedTo} onChange={(e) => setGeneratedTo(e.target.value)} />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Generated At</TableHead>
                  <TableHead>Expires At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No generated files found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFiles.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell>{f.document.fileName}</TableCell>
                      <TableCell>{f.reportType.toUpperCase()} ({f.format})</TableCell>
                      <TableCell>{formatReportDateTime(f.createdAt)}</TableCell>
                      <TableCell>{formatReportDateTime(f.expiresAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/api/documents/${f.document.id}/download`}>Download</Link>
                          </Button>
                          {canDelete ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={isPending && pendingId === f.document.id}
                              onClick={() => handleDelete(f.document.id)}
                            >
                              {isPending && pendingId === f.document.id ? "Deleting..." : "Delete"}
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(next) => !next && handleCancelProgress()}>
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => isPending && e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Generating report</DialogTitle>
            <DialogDescription>
              Please wait for completion. You can cancel to close this dialog.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {isPending ? `Generating... ${progress}%` : progress >= 100 ? "Complete" : "Ready"}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancelProgress}>
              {isPending ? "Cancel" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
