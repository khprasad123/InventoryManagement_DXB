"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import type { DashboardWidgetDef, DashboardWidgetId } from "./widgets";

const STORAGE_KEY = "dashboard.widgets";

export function CustomizeDashboard({
  allowedDefs,
  selectedWidgets,
}: {
  allowedDefs: DashboardWidgetDef[];
  selectedWidgets: DashboardWidgetId[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedWidgets));
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();

  const allVisible = useMemo(() => selected.size === allowedDefs.length, [selected.size, allowedDefs.length]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function applySelection(next: Set<string>) {
    const qp = new URLSearchParams(params.toString());
    qp.set("widgets", Array.from(next).join(","));
    localStorage.setItem(STORAGE_KEY, Array.from(next).join(","));
    router.replace(`${pathname}?${qp.toString()}`);
    setOpen(false);
  }

  function resetSelection() {
    const next = new Set(allowedDefs.map((d) => d.id));
    setSelected(next);
    applySelection(next);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Customize Dashboard</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Customize Dashboard</DialogTitle>
          <DialogDescription>
            Choose which widgets to show. Only widgets you are allowed to access are listed.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-2 overflow-auto py-2">
          {allowedDefs.map((w) => (
            <label
              key={w.id}
              className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={selected.has(w.id)}
                onChange={() => toggle(w.id)}
              />
              <span>{w.title}</span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={resetSelection}>
            Show All
          </Button>
          <Button
            variant="outline"
            onClick={() => setSelected(new Set())}
            disabled={selected.size === 0}
          >
            Hide All
          </Button>
          <Button onClick={() => applySelection(selected)} disabled={allVisible}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
