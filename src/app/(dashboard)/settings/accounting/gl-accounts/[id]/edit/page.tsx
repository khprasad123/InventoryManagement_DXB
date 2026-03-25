import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { canUser, PERMISSIONS } from "@/lib/permissions";
import { getGlAccountById, updateGlAccountAction } from "../../actions";
import { GlAccountForm } from "../../gl-account-form";

export default async function EditGlAccountPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!canUser(user, PERMISSIONS.MANAGE_JOURNALS)) redirect("/dashboard");

  const account = await getGlAccountById(params.id);
  if (!account) redirect("/settings/accounting/gl-accounts");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit GL Account</h1>
          <p className="text-muted-foreground">Update account details for journal posting</p>
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
          <GlAccountForm
            action={updateGlAccountAction}
            accountId={account.id}
            defaultValues={{
              code: account.code,
              name: account.name,
              type: account.type,
              normalSide: account.normalSide,
              isTaxAccount: account.isTaxAccount,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

