import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { getInvoiceSettings } from "./actions";
import { getCurrentUser } from "@/lib/auth-utils";
import { isSuperAdmin } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { InvoiceSettingsForm } from "./invoice-settings-form";

export default async function InvoiceSettingsPage() {
  const user = await getCurrentUser();
  if (!isSuperAdmin(user)) redirect("/settings");

  const settings = await getInvoiceSettings();

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
          <FileText className="h-8 w-8" />
          Invoice Settings
        </h1>
        <p className="text-muted-foreground">
          Company info, address, bank details, logo, and stamp for sales invoices. Invoices follow the approval process (Draft → Pending → Approved).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
          <p className="text-sm text-muted-foreground">
            These fields appear on sales invoices. Configure before creating invoices.
          </p>
        </CardHeader>
        <CardContent>
          <InvoiceSettingsForm settings={settings} />
        </CardContent>
      </Card>
    </div>
  );
}
