import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { hasPermission } from "@/lib/permissions";
import { AuditLogTable } from "./audit-log-table";
import { getAuditLogs, getAuditActions, getAuditEntityTypes } from "./actions";
import { AuditLogFiltersForm } from "./audit-log-filters-form";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; action?: string; entityType?: string; page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!hasPermission(user, "view_audit")) redirect("/settings");

  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;

  const [result, actions, entityTypes] = await Promise.all([
    getAuditLogs({
      from: params.from,
      to: params.to,
      action: params.action,
      entityType: params.entityType,
      page: Number.isNaN(page) ? 1 : page,
    }),
    getAuditActions(),
    getAuditEntityTypes(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground">
            View all system activity: logins, logouts, and changes to suppliers, clients, inventory, invoices, and more.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/settings">Back to Settings</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <AuditLogFiltersForm
            actions={actions}
            entityTypes={entityTypes}
            defaultFrom={params.from}
            defaultTo={params.to}
            defaultAction={params.action}
            defaultEntityType={params.entityType}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <p className="text-sm text-muted-foreground">
            {result.total} record(s). Page {result.currentPage} of {result.totalPages}.
          </p>
        </CardHeader>
        <CardContent>
          <AuditLogTable
            logs={result.logs}
            currentPage={result.currentPage}
            totalPages={result.totalPages}
            searchParams={params}
          />
        </CardContent>
      </Card>
    </div>
  );
}
