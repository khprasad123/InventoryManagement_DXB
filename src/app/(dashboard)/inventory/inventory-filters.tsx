"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";
import { useCallback, useState } from "react";

interface InventoryFiltersProps {
  categoryFilter: string;
  categories: string[];
  search?: string;
}

export function InventoryFilters({
  categoryFilter,
  categories,
  search: initialSearch = "",
}: InventoryFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);

  const updateParams = useCallback(
    (updates: { page?: number; category?: string; search?: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (updates.page !== undefined) params.set("page", String(updates.page));
      if (updates.category !== undefined)
        params.set("category", updates.category);
      if (updates.search !== undefined) {
        if (updates.search) params.set("search", updates.search);
        else params.delete("search");
      }
      router.push(`/inventory?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <CardTitle>Items</CardTitle>
      <div className="flex flex-1 gap-4 sm:max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") updateParams({ search, page: 1 });
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={categoryFilter}
          onValueChange={(v) => updateParams({ category: v, page: 1 })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
