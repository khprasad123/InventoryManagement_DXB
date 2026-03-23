"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateOrgSettings, uploadOrgLogo, uploadOrgSeal } from "./actions";
import { TIMEZONES } from "@/lib/timezones";

const orgSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  address: z.string().min(1, "Address is required").max(500),
  phone: z.string().max(50).optional(),
  fax: z.string().max(50).optional(),
  website: z.string().max(200).optional(),
  taxRegistrationNo: z.string().max(100).optional(),
  bankDetails: z.string().max(500).optional(),
  timezone: z.string().max(50).optional(),
});

type OrgFormValues = z.infer<typeof orgSchema>;

type Org = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  logoUrl: string | null;
  sealUrl: string | null;
  phone: string | null;
  fax: string | null;
  website: string | null;
  taxRegistrationNo: string | null;
  bankDetails: string | null;
  timezone: string | null;
};

export function OrgSettingsForm({ org }: { org: Org }) {
  const [logoPreview, setLogoPreview] = useState<string | null>(org.logoUrl);
  const [sealPreview, setSealPreview] = useState<string | null>(org.sealUrl);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [sealError, setSealError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const sealInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<OrgFormValues>({
    resolver: zodResolver(orgSchema),
    defaultValues: {
      name: org.name,
      address: org.address ?? "",
      phone: org.phone ?? "",
      fax: org.fax ?? "",
      website: org.website ?? "",
      taxRegistrationNo: org.taxRegistrationNo ?? "",
      bankDetails: org.bankDetails ?? "",
      timezone: org.timezone ?? "UTC",
    },
  });

  async function onSubmit(data: OrgFormValues) {
    const formData = new FormData();
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "")
        formData.set(k, String(v));
    });
    const result = await updateOrgSettings(formData);
    if (typeof result === "object" && "error" in result) {
      if (typeof result.error === "string") {
        setError("name", { message: result.error });
      } else if (result.error && typeof result.error === "object") {
        Object.entries(result.error as Record<string, string[] | undefined>).forEach(([field, messages]) => {
          const msg = Array.isArray(messages) ? messages[0] : String(messages ?? "");
          if (msg && field in orgSchema.shape) {
            setError(field as keyof OrgFormValues, { message: msg });
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
    const result = await uploadOrgLogo(fd);
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
    const result = await uploadOrgSeal(fd);
    if ("error" in result) {
      setSealError(result.error);
    } else {
      setSealPreview(result.url);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <Label htmlFor="logo">Company Logo *</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Required for invoices. PNG, JPEG or WebP, max 2MB.
            </p>
            {logoPreview ? (
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-32 border rounded overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoPreview}
                    alt="Logo"
                    className="h-full w-full object-contain"
                  />
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
              <div>
                <Input
                  id="logo"
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp"
                  onChange={handleLogoUpload}
                />
              </div>
            )}
            {logoError && (
              <p className="text-sm text-destructive mt-1">{logoError}</p>
            )}
          </div>
          <div>
            <Label htmlFor="seal">Company Seal / Stamp *</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Required for invoices. PNG, JPEG or WebP, max 2MB.
            </p>
            {sealPreview ? (
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 border rounded overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sealPreview}
                    alt="Seal"
                    className="h-full w-full object-contain"
                  />
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
              <div>
                <Input
                  id="seal"
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp"
                  onChange={handleSealUpload}
                />
              </div>
            )}
            {sealError && (
              <p className="text-sm text-destructive mt-1">{sealError}</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Organization Name *</Label>
            <Input id="name" {...register("name")} placeholder="Company name" />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Textarea
              id="address"
              {...register("address")}
              placeholder="Full address (PO Box, city, country)"
              rows={3}
            />
            {errors.address && (
              <p className="text-sm text-destructive">{errors.address.message}</p>
            )}
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
            <Input
              id="website"
              {...register("website")}
              placeholder="https://example.com"
            />
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
          <div className="space-y-2">
            <Label htmlFor="timezone">Time Zone</Label>
            <select
              id="timezone"
              {...register("timezone")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Used for displaying dates and times (transactions, audit, invoices, reports). Database stores UTC.
            </p>
          </div>
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save Settings"}
      </Button>
    </form>
  );
}
