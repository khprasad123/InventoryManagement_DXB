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
import { deletePurchaseRequest } from "../actions";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeletePrButton({
  prId,
  prNo,
  disabled,
  size,
}: {
  prId: string;
  prNo: string;
  disabled?: boolean;
  size?: "default" | "sm" | "icon";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const result = await deletePurchaseRequest(prId);
    setLoading(false);
    if (result?.error) {
      alert(typeof result.error === "string" ? result.error : "Failed to delete");
      return;
    }
    setOpen(false);
    router.push("/purchases/purchase-requests");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size={size ?? "icon"} title="Delete" disabled={disabled}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete purchase request</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {prNo}? This cannot be undone.
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
