import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Building2, FileText, CreditCard } from "lucide-react";
import { getCurrentOrgInfo } from "./actions";
import { getCurrentUser } from "@/lib/auth-utils";
import { isSuperAdmin } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { DeleteOrgButton } from "./delete-org-button";
import { OrgSettingsForm } from "./org-settings-form";

export default async function SettingsOrgPage() {
  const user = await getCurrentUser();
  if (!isSuperAdmin(user)) redirect("/settings");

  const org = await getCurrentOrgInfo();
  if (!org) redirect("/settings");

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Settings
          </Link>
        </Button>
        <h1 className="mt-2 text-3xl font-bold tracking-tight flex items-center gap-2">
          <Building2 className="h-8 w-8" />
          Organization Details
        </h1>
        <p className="text-muted-foreground">
          Organization name, logo, and contact information. For invoice-specific details (company info, bank, address, stamp), use Invoice Settings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <p className="text-sm text-muted-foreground">
            Core organization info used across the app. Logo appears in sidebar and headers.
          </p>
        </CardHeader>
        <CardContent>
          <OrgSettingsForm org={org} />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice Settings
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Company info, address, bank details, invoice logo, and stamp for sales invoices.
            </p>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/settings/invoice">
                <FileText className="mr-2 h-4 w-4" />
                Configure invoice details
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Plan & Billing
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Monthly amount, max users, and contract dates for billing.
            </p>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/settings/plan">
                <CreditCard className="mr-2 h-4 w-4" />
                Manage plan
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <p className="text-sm text-muted-foreground">
            Deleting the organization will permanently remove all data: users, inventory, invoices, documents, and files. You will be logged out. This cannot be undone.
          </p>
        </CardHeader>
        <CardContent>
          <DeleteOrgButton orgName={org.name} />
        </CardContent>
      </Card>
    </div>
  );
}
