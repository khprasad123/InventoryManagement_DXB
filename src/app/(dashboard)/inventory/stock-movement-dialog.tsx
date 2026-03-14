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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpFromLine } from "lucide-react";
import { createStockMovement } from "./actions";
import { useRouter } from "next/navigation";
import type { Item } from "@prisma/client";

interface StockMovementDialogProps {
  item: Item;
  allowAdjustment?: boolean;
}

export function StockMovementDialog({
  item,
  allowAdjustment = false,
}: StockMovementDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<"IN" | "OUT" | "ADJUSTMENT">("IN");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const formData = new FormData();
    formData.set("itemId", item.id);
    formData.set("type", type);
    formData.set("quantity", quantity);
    if (notes) formData.set("notes", notes);

    setLoading(true);
    const result = await createStockMovement(formData);
    setLoading(false);

    if (result?.error) {
      if (typeof result.error === "object") {
        const err = result.error as Record<string, string[] | undefined>;
        setError(
          err.quantity?.[0] ?? err._form?.[0] ?? "Something went wrong"
        );
      }
      return;
    }
    setOpen(false);
    setQuantity("");
    setNotes("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" title="Manual Stock In / Stock Out">
          <ArrowUpFromLine className="mr-2 h-4 w-4" />
          Stock In/Out
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Stock Movement</DialogTitle>
          <DialogDescription>
            {item.name} ({item.sku}) — Current stock: {item.stockQty}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v: "IN" | "OUT" | "ADJUSTMENT") => setType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">Stock In</SelectItem>
                  <SelectItem value="OUT">Stock Out</SelectItem>
                  {allowAdjustment && (
                    <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter quantity"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !quantity}>
              {loading ? "Processing..." : "Apply"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
