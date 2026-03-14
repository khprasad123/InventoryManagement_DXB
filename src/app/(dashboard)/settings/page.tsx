import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth-utils";
import { canManageUsers, canManageRoles, hasPermission, isSuperAdmin } from "@/lib/permissions";
import { Users, Coins, ClipboardList, Shield, Building2 } from "lucide-react";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const showUsersLink = canManageUsers(user);
  const showRolesLink = canManageRoles(user);
  const showAuditLink = hasPermission(user, "view_audit");
  const showOrgLink = isSuperAdmin(user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application settings
        </p>
      </div>

      {showOrgLink && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company details for invoicing
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Configure your organization name, address, logo, seal (stamp), tax registration, and bank details. These appear on all sales invoices.
            </p>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/settings/org">
                <Building2 className="mr-2 h-4 w-4" />
                Open Org management
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Application settings and preferences.
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
            {showOrgLink && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/settings/org">
                  <Building2 className="mr-2 h-4 w-4" />
                  Org management
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
