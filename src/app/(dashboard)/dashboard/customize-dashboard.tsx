"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { resetDashboardWidgets, saveDashboardWidgets } from "./actions";
import type { DashboardWidgetDef, DashboardWidgetId } from "./widgets";

export function CustomizeDashboard({
  allowedDefs,
  selectedWidgets,
}: {
  allowedDefs: DashboardWidgetDef[];
  selectedWidgets: DashboardWidgetId[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedWidgets));
  const [isSaving, startTransition] = useTransition();
  const router = useRouter();

  const allVisible = useMemo(() => selected.size === allowedDefs.length, [selected.size, allowedDefs.length]);

  useEffect(() => {
    setSelected(new Set(selectedWidgets));
  }, [selectedWidgets]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function applySelection(next: Set<string>) {
    const payload = Array.from(next) as DashboardWidgetId[];
    startTransition(async () => {
      await saveDashboardWidgets(payload);
      setOpen(false);
      router.refresh();
    });
  }

  function resetSelection() {
    const next = new Set(allowedDefs.map((d) => d.id));
    setSelected(next);
    applySelection(next);
  }

  function resetToDefaultLayout() {
    startTransition(async () => {
      await resetDashboardWidgets();
      setSelected(new Set(allowedDefs.map((d) => d.id)));
      setOpen(false);
      router.refresh();
    });
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
            onClick={resetToDefaultLayout}
            disabled={isSaving}
            title="Clear saved dashboard layout and use role defaults"
          >
            Reset to Role Default
          </Button>
          <Button
            variant="outline"
            onClick={() => setSelected(new Set())}
            disabled={selected.size === 0 || isSaving}
          >
            Hide All
          </Button>
          <Button onClick={() => applySelection(selected)} disabled={allVisible || isSaving}>
            {isSaving ? "Saving..." : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
