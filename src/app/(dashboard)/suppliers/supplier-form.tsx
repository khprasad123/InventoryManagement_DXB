"use client";

import { useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Supplier } from "@prisma/client";

const supplierSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  contactName: z.string().max(255).optional(),
  email: z
    .string()
    .optional()
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Invalid email"),
  phone: z.string().max(50).optional(),
  address: z.string().optional(),
  taxNumber: z.string().max(50).optional(),
  defaultPaymentTerms: z.coerce.number().int().min(0).optional().nullable(),
  creditLimit: z.coerce.number().min(0).optional().nullable(),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

interface SupplierFormProps {
  mode: "add" | "edit";
  supplier?: Supplier | null;
  onSubmit: (formData: FormData) => Promise<
    { error?: Record<string, string[]> } | void
  >;
}

export function SupplierForm({
  mode,
  supplier,
  onSubmit,
}: SupplierFormProps) {
  const attachmentRef = useRef<HTMLInputElement>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: supplier
      ? {
          name: supplier.name,
          contactName: supplier.contactName ?? "",
          email: supplier.email ?? "",
          phone: supplier.phone ?? "",
          address: supplier.address ?? "",
          taxNumber: supplier.taxNumber ?? "",
          defaultPaymentTerms: supplier.defaultPaymentTerms ?? undefined,
          creditLimit: supplier.creditLimit
            ? Number(supplier.creditLimit)
            : undefined,
        }
      : {
          defaultPaymentTerms: 30,
        },
  });

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        const formData = new FormData();
        Object.entries(data).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== "")
            formData.set(k, String(v));
        });
        if (mode === "add" && attachmentRef.current?.files?.[0]) {
          formData.set("attachment", attachmentRef.current.files[0]);
        }
        const result = await onSubmit(formData);
        if (result?.error) {
          Object.entries(result.error).forEach(([field, messages]) => {
            const msg = Array.isArray(messages) ? messages[0] : messages;
            if (msg && field !== "_form") {
              setError(field as keyof SupplierFormValues, { message: msg });
            }
          });
        }
      })}
      className="space-y-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Supplier Name *</Label>
          <Input id="name" {...register("name")} placeholder="Company name" />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactName">Contact Name</Label>
          <Input
            id="contactName"
            {...register("contactName")}
            placeholder="Primary contact"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            {...register("email")}
            placeholder="contact@example.com"
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" {...register("phone")} placeholder="+1 234 567 8900" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          {...register("address")}
          placeholder="Full address"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="taxNumber">Tax Number</Label>
          <Input id="taxNumber" {...register("taxNumber")} placeholder="VAT/Tax ID" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultPaymentTerms">Default Payment Terms (days)</Label>
          <Input
            id="defaultPaymentTerms"
            type="number"
            min={0}
            {...register("defaultPaymentTerms")}
            placeholder="30"
          />
          <p className="text-xs text-muted-foreground">
            e.g. 30 = NET 30 days (used for due date calculation)
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="creditLimit">Credit Limit</Label>
        <Input
          id="creditLimit"
          type="number"
          step="0.01"
          min={0}
          {...register("creditLimit")}
          placeholder="0"
        />
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
          {isSubmitting
            ? "Saving..."
            : mode === "add"
              ? "Add Supplier"
              : "Save Changes"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <a href="/suppliers">Cancel</a>
        </Button>
      </div>
    </form>
  );
}
