"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { AuditLog, User } from "@prisma/client";

type AuditLogWithUser = AuditLog & {
  user: Pick<User, "id" | "email" | "name"> | null;
};

interface AuditLogTableProps {
  logs: AuditLogWithUser[];
  currentPage: number;
  totalPages: number;
  searchParams: { from?: string; to?: string; action?: string; entityType?: string; page?: string };
}

function formatDate(d: Date) {
  return new Date(d).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "medium",
  });
}

export function AuditLogTable({
  logs,
  currentPage,
  totalPages,
  searchParams,
}: AuditLogTableProps) {
  const params = new URLSearchParams();
  if (searchParams.from) params.set("from", searchParams.from);
  if (searchParams.to) params.set("to", searchParams.to);
  if (searchParams.action) params.set("action", searchParams.action);
  if (searchParams.entityType) params.set("entityType", searchParams.entityType);

  const base = params.toString();

  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>User</TableHead>
              <TableHead className="max-w-[200px]">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No audit records match the filters.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(log.createdAt)}
                  </TableCell>
                  <TableCell className="font-medium">{log.action}</TableCell>
                  <TableCell>
                    {log.entityType && log.entityId ? (
                      <span>
                        {log.entityType} ({log.entityId.slice(0, 8)}…)
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {log.user ? (
                      <span title={log.user.email}>
                        {log.user.name || log.user.email}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {log.metadata && typeof log.metadata === "object" ? (
                      <span title={JSON.stringify(log.metadata)}>
                        {Object.entries(log.metadata as Record<string, unknown>)
                          .map(([k, v]) => `${k}: ${String(v)}`)
                          .join(", ")}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" asChild disabled={currentPage <= 1}>
            <Link href={currentPage <= 1 ? "#" : `/settings/audit?${base}&page=${currentPage - 1}`}>
              Previous
            </Link>
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button variant="outline" size="sm" asChild disabled={currentPage >= totalPages}>
            <Link href={currentPage >= totalPages ? "#" : `/settings/audit?${base}&page=${currentPage + 1}`}>
              Next
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
