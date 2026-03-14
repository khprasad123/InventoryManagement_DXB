import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getPurchaseRequests } from "../actions";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, ArrowLeft, Eye } from "lucide-react";

export default async function PurchaseRequestsPage() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const prs = await getPurchaseRequests();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/purchases">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Purchases
            </Link>
          </Button>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Purchase Requests
          </h1>
          <p className="text-muted-foreground">
            Create and approve purchase requests. Approved PRs can be converted to Purchase Orders.
          </p>
        </div>
        <Button asChild>
          <Link href="/purchases/purchase-requests/add">
            <Plus className="mr-2 h-4 w-4" />
            New PR
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Purchase Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {prs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No purchase requests yet.
              </p>
              <Button asChild className="mt-4">
                <Link href="/purchases/purchase-requests/add">Create PR</Link>
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PR No</TableHead>
                    <TableHead>Job ID</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prs.map((pr) => (
                    <TableRow key={pr.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/purchases/purchase-requests/${pr.id}`}
                          className="text-primary hover:underline"
                        >
                          {pr.prNo}
                        </Link>
                      </TableCell>
                      <TableCell>{pr.jobId ?? "-"}</TableCell>
                      <TableCell>
                        {pr.items.length} line(s)
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            pr.status === "APPROVED"
                              ? "default"
                              : pr.status === "PENDING_APPROVAL"
                              ? "secondary"
                              : "secondary"
                          }
                        >
                          {pr.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/purchases/purchase-requests/${pr.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
