"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AuditLogFiltersFormProps {
  actions: string[];
  entityTypes: string[];
  defaultFrom?: string;
  defaultTo?: string;
  defaultAction?: string;
  defaultEntityType?: string;
}

export function AuditLogFiltersForm({
  actions,
  entityTypes,
  defaultFrom,
  defaultTo,
  defaultAction,
  defaultEntityType,
}: AuditLogFiltersFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const from = (form.elements.namedItem("from") as HTMLInputElement)?.value;
    const to = (form.elements.namedItem("to") as HTMLInputElement)?.value;
    const action = (form.elements.namedItem("action") as HTMLSelectElement)?.value;
    const entityType = (form.elements.namedItem("entityType") as HTMLSelectElement)?.value;

    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (action) params.set("action", action);
    if (entityType) params.set("entityType", entityType);

    startTransition(() => {
      router.push(`/settings/audit?${params.toString()}`);
    });
  }

  function handleClear() {
    startTransition(() => {
      router.push("/settings/audit");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
      <div className="space-y-2">
        <Label htmlFor="from">From date</Label>
        <Input
          id="from"
          name="from"
          type="date"
          defaultValue={defaultFrom}
          className="w-[160px]"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="to">To date</Label>
        <Input
          id="to"
          name="to"
          type="date"
          defaultValue={defaultTo}
          className="w-[160px]"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="action">Action</Label>
        <select
          id="action"
          name="action"
          defaultValue={defaultAction ?? ""}
          className="flex h-10 w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="entityType">Entity type</Label>
        <select
          id="entityType"
          name="entityType"
          defaultValue={defaultEntityType ?? ""}
          className="flex h-10 w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All types</option>
          {entityTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Applying..." : "Apply"}
      </Button>
      <Button type="button" variant="outline" onClick={handleClear} disabled={isPending}>
        Clear
      </Button>
    </form>
  );
}
