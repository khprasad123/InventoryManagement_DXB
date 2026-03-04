import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Users, Shield, UserPlus } from "lucide-react";
import { getOrgUsers, getRolesForOrg } from "./actions";
import { getCurrentUser } from "@/lib/auth-utils";
import { canManageUsers, isSuperAdmin } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { UsersTable } from "./users-table";
import { AddUserDialog } from "./add-user-dialog";

export default async function SettingsUsersPage() {
  const user = await getCurrentUser();
  if (!canManageUsers(user)) redirect("/settings");

  const [orgUsers, roles] = await Promise.all([
    getOrgUsers(),
    getRolesForOrg(),
  ]);

  const currentUserIsSuperAdmin = isSuperAdmin(user);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/settings">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Settings
            </Link>
          </Button>
          <h1 className="mt-2 text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8" />
            User management
          </h1>
          <p className="text-muted-foreground">
            Add org users, assign roles, and manage access. Only the org super admin can edit or remove other super admins.
          </p>
        </div>
        <AddUserDialog roles={roles} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization users</CardTitle>
          <p className="text-sm text-muted-foreground">
            {orgUsers.length} user(s). Users with <Shield className="inline h-4 w-4" /> are org super admins.
          </p>
        </CardHeader>
        <CardContent>
          <UsersTable
            orgUsers={orgUsers}
            roles={roles}
            currentUserIsSuperAdmin={currentUserIsSuperAdmin}
          />
        </CardContent>
      </Card>
    </div>
  );
}
