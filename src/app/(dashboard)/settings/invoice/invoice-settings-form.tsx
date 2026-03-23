"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateInvoiceSettings, uploadInvoiceLogo, uploadInvoiceSeal } from "./actions";

const invoiceSchema = z.object({
  companyName: z.string().min(1, "Company name is required").max(200),
  address: z.string().max(500).optional(),
  phone: z.string().max(50).optional(),
  fax: z.string().max(50).optional(),
  website: z.string().max(200).optional(),
  taxRegistrationNo: z.string().max(100).optional(),
  bankDetails: z.string().max(500).optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

type InvoiceSettings = {
  id: string;
  companyName: string;
  address: string | null;
  phone: string | null;
  fax: string | null;
  website: string | null;
  taxRegistrationNo: string | null;
  bankDetails: string | null;
  invoiceLogoUrl: string | null;
  sealUrl: string | null;
};

export function InvoiceSettingsForm({ settings }: { settings: InvoiceSettings | null }) {
  const [logoPreview, setLogoPreview] = useState<string | null>(settings?.invoiceLogoUrl ?? null);
  const [sealPreview, setSealPreview] = useState<string | null>(settings?.sealUrl ?? null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [sealError, setSealError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const sealInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      companyName: settings?.companyName ?? "",
      address: settings?.address ?? "",
      phone: settings?.phone ?? "",
      fax: settings?.fax ?? "",
      website: settings?.website ?? "",
      taxRegistrationNo: settings?.taxRegistrationNo ?? "",
      bankDetails: settings?.bankDetails ?? "",
    },
  });

  async function onSubmit(data: InvoiceFormValues) {
    const formData = new FormData();
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "")
        formData.set(k, String(v));
    });
    const result = await updateInvoiceSettings(formData);
    if (typeof result === "object" && "error" in result) {
      if (typeof result.error === "string") {
        setError("companyName", { message: result.error });
      } else if (result.error && typeof result.error === "object") {
        Object.entries(result.error as Record<string, string[] | undefined>).forEach(([field, messages]) => {
          const msg = Array.isArray(messages) ? messages[0] : String(messages ?? "");
          if (msg && field in invoiceSchema.shape) {
            setError(field as keyof InvoiceFormValues, { message: msg });
          }
        });
      }
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    setLogoError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    const result = await uploadInvoiceLogo(fd);
    if ("error" in result) {
      setLogoError(result.error);
    } else {
      setLogoPreview(result.url);
    }
  }

  async function handleSealUpload(e: React.ChangeEvent<HTMLInputElement>) {
    setSealError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    const result = await uploadInvoiceSeal(fd);
    if ("error" in result) {
      setSealError(result.error);
    } else {
      setSealPreview(result.url);
    }
  }

  if (!settings) {
    return (
      <p className="text-sm text-muted-foreground">
        No invoice settings found. Create an organization first, then configure invoice details here.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <Label htmlFor="invoiceLogo">Invoice Logo</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Logo shown on invoices. PNG, JPEG or WebP, max 2MB.
            </p>
            {logoPreview ? (
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-32 border rounded overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoPreview} alt="Invoice Logo" className="h-full w-full object-contain" />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="text-sm text-primary hover:underline"
                  >
                    Replace
                  </button>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp"
                    className="sr-only"
                    onChange={handleLogoUpload}
                  />
                </div>
              </div>
            ) : (
              <Input
                type="file"
                accept=".png,.jpg,.jpeg,.webp"
                onChange={handleLogoUpload}
              />
            )}
            {logoError && <p className="text-sm text-destructive mt-1">{logoError}</p>}
          </div>
          <div>
            <Label htmlFor="seal">Stamp / Seal (optional)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Company stamp for invoices. PNG, JPEG or WebP, max 2MB.
            </p>
            {sealPreview ? (
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 border rounded overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sealPreview} alt="Seal" className="h-full w-full object-contain" />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => sealInputRef.current?.click()}
                    className="text-sm text-primary hover:underline"
                  >
                    Replace
                  </button>
                  <input
                    ref={sealInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp"
                    className="sr-only"
                    onChange={handleSealUpload}
                  />
                </div>
              </div>
            ) : (
              <Input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={handleSealUpload} />
            )}
            {sealError && <p className="text-sm text-destructive mt-1">{sealError}</p>}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name (on invoice) *</Label>
            <Input id="companyName" {...register("companyName")} placeholder="Company name" />
            {errors.companyName && (
              <p className="text-sm text-destructive">{errors.companyName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              {...register("address")}
              placeholder="Full address (PO Box, city, country)"
              rows={3}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} placeholder="+971 ..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fax">Fax</Label>
              <Input id="fax" {...register("fax")} placeholder="Fax number" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" {...register("website")} placeholder="https://example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="taxRegistrationNo">Tax Registration No (TRN)</Label>
            <Input
              id="taxRegistrationNo"
              {...register("taxRegistrationNo")}
              placeholder="VAT/TRN number"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bankDetails">Bank Details</Label>
            <Textarea
              id="bankDetails"
              {...register("bankDetails")}
              placeholder="Account Name, Bank, Account#, IBAN"
              rows={3}
            />
          </div>
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save Invoice Settings"}
      </Button>
    </form>
  );
}
