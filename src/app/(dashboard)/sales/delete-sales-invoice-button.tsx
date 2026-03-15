"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteSalesInvoice } from "./actions";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteSalesInvoiceButton({
  invoiceId,
  invoiceNo,
  canDelete = true,
}: {
  invoiceId: string;
  invoiceNo: string;
  /** Hide when invoice is fully paid (job finished) */
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const result = await deleteSalesInvoice(invoiceId);
    setLoading(false);
    if (result?.error) {
      alert(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!canDelete) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Delete">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete sales invoice</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {invoiceNo}? This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
