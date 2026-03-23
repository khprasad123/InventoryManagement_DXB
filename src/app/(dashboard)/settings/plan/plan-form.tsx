"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateOrgPlan } from "./actions";

const planSchema = z.object({
  monthlyAmount: z.coerce.number().min(0, "Must be ≥ 0"),
  maxUsers: z.coerce.number().int().min(1, "Must be ≥ 1"),
  contractStartDate: z.string().min(1, "Start date is required"),
  contractEndDate: z.string().optional(),
});

type PlanFormValues = z.infer<typeof planSchema>;

type OrgPlan = {
  id: string;
  monthlyAmount: { toString: () => string } | number;
  maxUsers: number;
  contractStartDate: Date;
  contractEndDate: Date | null;
};

function toInputDate(d: Date | null): string {
  if (!d) return "";
  const date = new Date(d);
  return date.toISOString().slice(0, 10);
}

export function PlanForm({ plan }: { plan: OrgPlan | null }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: plan
      ? {
          monthlyAmount: Number(plan.monthlyAmount),
          maxUsers: plan.maxUsers,
          contractStartDate: toInputDate(plan.contractStartDate),
          contractEndDate: toInputDate(plan.contractEndDate),
        }
      : {
          monthlyAmount: 0,
          maxUsers: 1,
          contractStartDate: new Date().toISOString().slice(0, 10),
          contractEndDate: "",
        },
  });

  async function onSubmit(data: PlanFormValues) {
    const formData = new FormData();
    formData.set("monthlyAmount", String(data.monthlyAmount));
    formData.set("maxUsers", String(data.maxUsers));
    formData.set("contractStartDate", data.contractStartDate);
    if (data.contractEndDate) formData.set("contractEndDate", data.contractEndDate);
    const result = await updateOrgPlan(formData);
    if (typeof result === "object" && "error" in result) {
      if (typeof result.error === "string") {
        setError("root", { message: result.error });
      } else if (result.error && typeof result.error === "object") {
        Object.entries(result.error as Record<string, string[] | undefined>).forEach(([field, messages]) => {
          const msg = Array.isArray(messages) ? messages[0] : String(messages ?? "");
          if (msg && field in planSchema.shape) {
            setError(field as keyof PlanFormValues, { message: msg });
          }
        });
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-md">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="monthlyAmount">Monthly Amount (USD)</Label>
          <Input
            id="monthlyAmount"
            type="number"
            step="0.01"
            min="0"
            {...register("monthlyAmount")}
            placeholder="0.00"
          />
          {errors.monthlyAmount && (
            <p className="text-sm text-destructive">{errors.monthlyAmount.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Billing amount per month in USD (always USD).
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxUsers">Max Users (excluding super admin)</Label>
          <Input
            id="maxUsers"
            type="number"
            min="1"
            {...register("maxUsers")}
            placeholder="5"
          />
          {errors.maxUsers && (
            <p className="text-sm text-destructive">{errors.maxUsers.message}</p>
          )}
          <p className="text-xs text-muted-foreground">Maximum number of users allowed. Super admin is not counted.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="contractStartDate">Contract Start Date *</Label>
          <Input
            id="contractStartDate"
            type="date"
            {...register("contractStartDate")}
          />
          {errors.contractStartDate && (
            <p className="text-sm text-destructive">{errors.contractStartDate.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="contractEndDate">Contract End Date (optional)</Label>
          <Input
            id="contractEndDate"
            type="date"
            {...register("contractEndDate")}
          />
          <p className="text-xs text-muted-foreground">Leave empty for ongoing contracts.</p>
        </div>
      </div>

      {errors.root && (
        <p className="text-sm text-destructive">{errors.root.message}</p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save Plan"}
      </Button>
    </form>
  );
}
