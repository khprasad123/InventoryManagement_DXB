import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
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
          Organization & invoice details
        </h1>
        <p className="text-muted-foreground">
          Company name, address, logo, seal (stamp), tax registration, bank details. All fields appear on sales invoices. Only super admin can delete the organization.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <p className="text-sm text-muted-foreground">
            Address, logo, and seal are used on invoices. Configure these before creating sales invoices.
          </p>
        </CardHeader>
        <CardContent>
          <OrgSettingsForm org={org} />
        </CardContent>
      </Card>

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
