"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { approveSalesInvoice, rejectSalesInvoice } from "./actions";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";

export function ApproveRejectInvoice({ invoiceId }: { invoiceId: string }) {
  const [open, setOpen] = useState<"approve" | "reject" | null>(null);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleApprove() {
    setError(null);
    setLoading(true);
    const result = await approveSalesInvoice(invoiceId, remarks);
    setLoading(false);
    if (result?.error) {
      setError(typeof result.error === "string" ? result.error : "Failed to approve");
      return;
    }
    setOpen(null);
    setRemarks("");
    router.refresh();
  }

  async function handleReject() {
    setError(null);
    if (!remarks.trim()) {
      setError("Rejection reason (remarks) is required");
      return;
    }
    setLoading(true);
    const result = await rejectSalesInvoice(invoiceId, remarks);
    setLoading(false);
    if (result?.error) {
      setError(typeof result.error === "string" ? result.error : "Failed to reject");
      return;
    }
    setOpen(null);
    setRemarks("");
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <Dialog open={open === "approve"} onOpenChange={(o) => { setOpen(o ? "approve" : null); setError(null); setRemarks(""); }}>
        <DialogTrigger asChild>
          <Button variant="default" size="sm">
            <Check className="mr-2 h-4 w-4" />
            Approve
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Invoice</DialogTitle>
            <DialogDescription>Optional: add remarks for this approval.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="approve-remarks-inv">Remarks (optional)</Label>
              <Input
                id="approve-remarks-inv"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Approved for payment"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(null)}>Cancel</Button>
            <Button onClick={handleApprove} disabled={loading}>{loading ? "Approving..." : "Approve"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open === "reject"} onOpenChange={(o) => { setOpen(o ? "reject" : null); setError(null); setRemarks(""); }}>
        <DialogTrigger asChild>
          <Button variant="destructive" size="sm">
            <X className="mr-2 h-4 w-4" />
            Reject
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Invoice</DialogTitle>
            <DialogDescription>Rejection reason (remarks) is required.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reject-remarks-inv">Rejection reason (required)</Label>
              <Input
                id="reject-remarks-inv"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Incorrect amount"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={loading || !remarks.trim()}>
              {loading ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
