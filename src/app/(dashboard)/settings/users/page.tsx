import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Users, Shield, UserPlus } from "lucide-react";
import { getOrgUsersPaginated, getRolesForOrg } from "./actions";
import { getCurrentUser } from "@/lib/auth-utils";
import { canManageUsers, isSuperAdmin } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { UsersTable } from "./users-table";
import { AddUserDialog } from "./add-user-dialog";
import { PaginationLinks } from "@/components/ui/pagination-links";
import { SearchInput } from "@/components/ui/search-input";

export default async function SettingsUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const user = await getCurrentUser();
  if (!canManageUsers(user)) redirect("/settings");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const search = params.search ?? "";

  const [orgUsersResult, roles] = await Promise.all([
    getOrgUsersPaginated(page, search),
    getRolesForOrg(),
  ]);
  const orgUsers = orgUsersResult.orgUsers;
  const { total, pageSize, totalPages, currentPage } = orgUsersResult;

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
        <AddUserDialog roles={roles} currentUserIsSuperAdmin={currentUserIsSuperAdmin} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization users</CardTitle>
          <p className="text-sm text-muted-foreground">
            {total} user(s). Users with <Shield className="inline h-4 w-4" /> are org super admins.
          </p>
          <div className="mt-3 w-full sm:w-[320px]">
            <SearchInput value={search} placeholder="Search users by name/email..." />
          </div>
        </CardHeader>
        <CardContent>
          <UsersTable
            orgUsers={orgUsers}
            roles={roles}
            currentUserIsSuperAdmin={currentUserIsSuperAdmin}
            currentUserId={(user as { id?: string })?.id}
          />

          <PaginationLinks
            page={currentPage}
            totalPages={totalPages}
            total={total}
            showingFrom={(currentPage - 1) * pageSize + 1}
            showingTo={Math.min(currentPage * pageSize, total)}
            prevHref={
              currentPage <= 1
                ? undefined
                : `/settings/users?page=${currentPage - 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`
            }
            nextHref={currentPage >= totalPages ? undefined : `/settings/users?page=${currentPage + 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
