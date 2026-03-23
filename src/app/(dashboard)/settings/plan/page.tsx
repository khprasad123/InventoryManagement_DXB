import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, CreditCard } from "lucide-react";
import { getOrgPlan } from "./actions";
import { getCurrentUser } from "@/lib/auth-utils";
import { isSuperAdmin } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { PlanForm } from "./plan-form";

export default async function PlanSettingsPage() {
  const user = await getCurrentUser();
  if (!isSuperAdmin(user)) redirect("/settings");

  const plan = await getOrgPlan();

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings/org">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Organization
          </Link>
        </Button>
        <h1 className="mt-2 text-3xl font-bold tracking-tight flex items-center gap-2">
          <CreditCard className="h-8 w-8" />
          Plan & Billing
        </h1>
        <p className="text-muted-foreground">
          Monthly amount, max users, and contract dates. Used for billing clients. Only the super admin can edit.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Plan</CardTitle>
          <p className="text-sm text-muted-foreground">
            Set the monthly billing amount, maximum number of users (excluding super admin), and contract period.
          </p>
        </CardHeader>
        <CardContent>
          <PlanForm plan={plan} />
        </CardContent>
      </Card>
    </div>
  );
}
