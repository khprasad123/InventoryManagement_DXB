import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { getRolesWithPermissionsPaginated, getAllPermissions } from "./actions";
import { getCurrentUser } from "@/lib/auth-utils";
import { canManageRoles } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { RolesTable } from "./roles-table";
import { CreateRoleDialog } from "./create-role-dialog";
import { PaginationLinks } from "@/components/ui/pagination-links";
import { SearchInput } from "@/components/ui/search-input";

export default async function SettingsRolesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const user = await getCurrentUser();
  if (!canManageRoles(user)) redirect("/settings");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const search = params.search ?? "";

  const [rolesResult, allPermissions] = await Promise.all([
    getRolesWithPermissionsPaginated(page, search),
    getAllPermissions(),
  ]);
  const roles = rolesResult.roles;
  const { total, pageSize, totalPages, currentPage } = rolesResult;

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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Organization roles</CardTitle>
              <p className="text-sm text-muted-foreground">
                Create roles and assign menu permissions (Create, Read, Edit, Delete per module). Super administrator has access to all.
              </p>
            </div>
            <CreateRoleDialog />
          </div>
          <div className="mt-3 w-full sm:w-[320px]">
            <SearchInput value={search} placeholder="Search roles..." />
          </div>
        </CardHeader>
        <CardContent>
          <RolesTable roles={roles} allPermissions={allPermissions} />

          <PaginationLinks
            page={currentPage}
            totalPages={totalPages}
            total={total}
            showingFrom={(currentPage - 1) * pageSize + 1}
            showingTo={Math.min(currentPage * pageSize, total)}
            prevHref={
              currentPage <= 1
                ? undefined
                : `/settings/roles?page=${currentPage - 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`
            }
            nextHref={
              currentPage >= totalPages
                ? undefined
                : `/settings/roles?page=${currentPage + 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
