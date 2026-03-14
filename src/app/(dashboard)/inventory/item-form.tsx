"use client";

import { useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Item } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
type ItemWithCost = {
  defaultPurchaseCost: { toNumber?: () => number } | number;
  defaultMargin: { toNumber?: () => number } | number;
} & Record<string, unknown>;

const itemSchema = z.object({
  sku: z.string().min(1, "SKU is required").max(50),
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required").max(100),
  unit: z.string().min(1, "Unit is required").max(20),
  defaultPurchaseCost: z.coerce.number().min(0, "Cost must be ≥ 0"),
  defaultMargin: z.coerce.number().min(0, "Margin must be ≥ 0"),
  minStock: z.coerce.number().int().min(0, "Min stock must be ≥ 0"),
});

type ItemFormValues = z.infer<typeof itemSchema>;

interface ItemFormProps {
  mode: "add" | "edit";
  item?: Item | null;
  categories: string[];
  onSubmit: (formData: FormData) => Promise<{ error?: Record<string, string[]> } | void>;
}

export function ItemForm({ mode, item, categories, onSubmit }: ItemFormProps) {
  const attachmentRef = useRef<HTMLInputElement>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: item
      ? {
          sku: (item as Record<string, unknown>).sku as string,
          name: (item as Record<string, unknown>).name as string,
          description: ((item as Record<string, unknown>).description as string) ?? "",
          category: ((item as Record<string, unknown>).category as string) ?? "General",
          unit: (item as Record<string, unknown>).unit as string,
          defaultPurchaseCost: Number(
            typeof item.defaultPurchaseCost === "object" && item.defaultPurchaseCost?.toNumber
              ? item.defaultPurchaseCost.toNumber()
              : item.defaultPurchaseCost
          ),
          defaultMargin: Number(
            typeof item.defaultMargin === "object" && item.defaultMargin?.toNumber
              ? item.defaultMargin.toNumber()
              : item.defaultMargin
          ),
          minStock: (item as Record<string, unknown>).minStock as number,
        }
      : {
          category: "General",
          unit: "pcs",
          defaultPurchaseCost: 0,
          defaultMargin: 0,
          minStock: 0,
        },
  });

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        const formData = new FormData();
        Object.entries(data).forEach(([k, v]) =>
          formData.set(k, String(v ?? ""))
        );
        const result = await onSubmit(formData);
        if (result?.error) {
          Object.entries(result.error).forEach(([field, messages]) => {
            const msg = Array.isArray(messages) ? messages[0] : messages;
            if (msg && field !== "_form") {
              setError(field as keyof ItemFormValues, { message: msg });
            }
          });
        }
      })}
      className="space-y-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sku">SKU</Label>
          <Input
            id="sku"
            {...register("sku")}
            placeholder="e.g. ITM-001"
            disabled={mode === "edit"}
          />
          {errors.sku && (
            <p className="text-sm text-destructive">{errors.sku.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...register("name")} placeholder="Item name" />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Input
          id="description"
          {...register("description")}
          placeholder="Brief description"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            {...register("category")}
            list="categories-list"
            placeholder="e.g. Electronics"
          />
          <datalist id="categories-list">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          {errors.category && (
            <p className="text-sm text-destructive">{errors.category.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit">Unit</Label>
          <Input id="unit" {...register("unit")} placeholder="pcs, kg, etc." />
          {errors.unit && (
            <p className="text-sm text-destructive">{errors.unit.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="defaultPurchaseCost">Default Purchase Cost</Label>
          <Input
            id="defaultPurchaseCost"
            type="number"
            step="0.01"
            min={0}
            {...register("defaultPurchaseCost")}
          />
          {errors.defaultPurchaseCost && (
            <p className="text-sm text-destructive">{errors.defaultPurchaseCost.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultMargin">Default Margin (%)</Label>
          <Input
            id="defaultMargin"
            type="number"
            step="0.01"
            min={0}
            {...register("defaultMargin")}
          />
          {errors.defaultMargin && (
            <p className="text-sm text-destructive">{errors.defaultMargin.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="minStock">Min Stock (low stock alert)</Label>
          <Input
            id="minStock"
            type="number"
            min={0}
            {...register("minStock")}
          />
          {errors.minStock && (
            <p className="text-sm text-destructive">{errors.minStock.message}</p>
          )}
        </div>
      </div>

      {mode === "add" && (
        <div className="space-y-2">
          <Label htmlFor="attachment">Attachment (optional)</Label>
          <Input
            id="attachment"
            ref={attachmentRef}
            type="file"
            name="attachment"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.csv,.doc,.docx,.xls,.xlsx"
            className="cursor-pointer"
          />
          <p className="text-xs text-muted-foreground">
            PDF, images, or documents up to 10MB
          </p>
        </div>
      )}

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : mode === "add" ? "Add Item" : "Save Changes"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <a href="/inventory">Cancel</a>
        </Button>
      </div>
    </form>
  );
}
