import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth-utils";
import { canManageUsers, canManageRoles, hasPermission } from "@/lib/permissions";
import { Users, Coins, ClipboardList, Shield } from "lucide-react";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const showUsersLink = canManageUsers(user);
  const showRolesLink = canManageRoles(user);
  const showAuditLink = hasPermission(user, "view_audit");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Application settings and preferences will be available here.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/currencies">
                <Coins className="mr-2 h-4 w-4" />
                Currencies
              </Link>
            </Button>
            {showUsersLink && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/settings/users">
                  <Users className="mr-2 h-4 w-4" />
                  User management
                </Link>
              </Button>
            )}
            {showRolesLink && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/settings/roles">
                  <Shield className="mr-2 h-4 w-4" />
                  Role management
                </Link>
              </Button>
            )}
            {showAuditLink && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/settings/audit">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Audit log
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
