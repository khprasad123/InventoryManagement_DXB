import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { canUser, PERMISSIONS } from "@/lib/permissions";
import { GlAccountForm } from "../gl-account-form";
import { createGlAccount } from "../actions";

export default async function NewGlAccountPage() {
  const user = await getCurrentUser();
  if (!canUser(user, PERMISSIONS.MANAGE_JOURNALS)) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add GL Account</h1>
          <p className="text-muted-foreground">Create a new chart of accounts entry</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/settings/accounting/gl-accounts">Back</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent>
          <GlAccountForm action={createGlAccount} />
        </CardContent>
      </Card>
    </div>
  );
}

