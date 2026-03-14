"use client";

import { useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Client } from "@prisma/client";

const clientSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  contactName: z.string().max(255).optional(),
  email: z
    .string()
    .optional()
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Invalid email"),
  phone: z.string().max(50).optional(),
  address: z.string().optional(),
  siteLocation: z.string().max(100).optional(),
  building: z.string().max(100).optional(),
  taxNumber: z.string().max(50).optional(),
  defaultPaymentTerms: z.string().max(255).optional().nullable(),
  agreedDueDays: z.coerce.number().int().min(0).optional().nullable(),
  creditLimit: z.coerce.number().min(0).optional().nullable(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientFormProps {
  mode: "add" | "edit";
  client?: Client | null;
  onSubmit: (formData: FormData) => Promise<
    { error?: Record<string, string[]> } | void
  >;
}

export function ClientForm({
  mode,
  client,
  onSubmit,
}: ClientFormProps) {
  const attachmentRef = useRef<HTMLInputElement>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: client
      ? {
          name: client.name,
          contactName: client.contactName ?? "",
          email: client.email ?? "",
          phone: client.phone ?? "",
          address: client.address ?? "",
          siteLocation: client.siteLocation ?? "",
          building: client.building ?? "",
          taxNumber: client.taxNumber ?? "",
          defaultPaymentTerms: client.defaultPaymentTerms ?? "",
          agreedDueDays: client.agreedDueDays ?? undefined,
          creditLimit: client.creditLimit
            ? Number(client.creditLimit)
            : undefined,
        }
      : {
          defaultPaymentTerms: "NET 30",
          agreedDueDays: 30,
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
              setError(field as keyof ClientFormValues, { message: msg });
            }
          });
        }
      })}
      className="space-y-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Client Name *</Label>
          <Input id="name" {...register("name")} placeholder="Company or client name" />
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
          <Label htmlFor="siteLocation">Site Location</Label>
          <Input
            id="siteLocation"
            {...register("siteLocation")}
            placeholder="e.g. Ajman"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="building">Building</Label>
          <Input
            id="building"
            {...register("building")}
            placeholder="e.g. Building name"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="taxNumber">Tax Number</Label>
          <Input id="taxNumber" {...register("taxNumber")} placeholder="VAT/Tax ID" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultPaymentTerms">Payment Terms</Label>
          <Input
            id="defaultPaymentTerms"
            {...register("defaultPaymentTerms")}
            placeholder="NET 30, 50% Advance & 50% After completion"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="agreedDueDays">Agreed Due Days</Label>
          <Input
            id="agreedDueDays"
            type="number"
            min={0}
            {...register("agreedDueDays")}
            placeholder="30"
          />
          <p className="text-xs text-muted-foreground">
            Days for invoice due date
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
        <p className="text-xs text-muted-foreground">
          Optional credit limit for this client
        </p>
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
              ? "Add Client"
              : "Save Changes"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <a href="/clients">Cancel</a>
        </Button>
      </div>
    </form>
  );
}
