import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { getRolesWithPermissions, getAllPermissions } from "./actions";
import { getCurrentUser } from "@/lib/auth-utils";
import { canManageRoles } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { RolesTable } from "./roles-table";

export default async function SettingsRolesPage() {
  const user = await getCurrentUser();
  if (!canManageRoles(user)) redirect("/settings");

  const [roles, allPermissions] = await Promise.all([
    getRolesWithPermissions(),
    getAllPermissions(),
  ]);

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
          <Shield className="h-8 w-8" />
          Role management
        </h1>
        <p className="text-muted-foreground">
          View and edit which permissions each role has. Only users with &quot;Manage roles&quot; can access this page.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization roles</CardTitle>
          <p className="text-sm text-muted-foreground">
            Assign permissions to roles. Users get access based on their role.
          </p>
        </CardHeader>
        <CardContent>
          <RolesTable roles={roles} allPermissions={allPermissions} />
        </CardContent>
      </Card>
    </div>
  );
}
