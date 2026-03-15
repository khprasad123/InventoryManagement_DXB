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
import { getPurchaseRequestById } from "@/app/(dashboard)/purchases/actions";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SubmitPrButton } from "../submit-pr-button";
import { ApproveRejectPr } from "../approve-reject-pr";

export default async function PurchaseRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const { id } = await Promise.resolve(params);
  const pr = await getPurchaseRequestById(id);
  if (!pr) notFound();

  const items = pr.items.filter((it) => it.item != null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/purchases/purchase-requests">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to PRs
            </Link>
          </Button>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{pr.prNo}</h1>
          <p className="text-muted-foreground">
            <Badge
              variant={
                pr.status === "APPROVED"
                  ? "default"
                  : pr.status === "REJECTED"
                    ? "danger"
                    : "secondary"
              }
            >
              {pr.status}
            </Badge>
            {pr.jobId && ` • Job: ${pr.jobId}`}
          </p>
        </div>
        {pr.status === "DRAFT" && (
          <p className="text-sm text-muted-foreground">Submit for approval from PR list.</p>
        )}
        {pr.status === "APPROVED" && (
          <Button asChild>
            <Link href={`/purchases/purchase-orders/add?prId=${pr.id}`}>
              Create PO from PR
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>{it.item?.name ?? "-"}</TableCell>
                    <TableCell>{it.item?.sku ?? "-"}</TableCell>
                    <TableCell className="text-right">{it.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {pr.status === "REJECTED" && pr.approvalRemarks && (
        <Card>
          <CardHeader>
            <CardTitle>Rejection reason</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{pr.approvalRemarks}</p>
            <p className="mt-2 text-xs text-muted-foreground">Rejected PRs cannot be amended.</p>
          </CardContent>
        </Card>
      )}

      {pr.status === "APPROVED" && pr.approvalRemarks && (
        <Card>
          <CardHeader>
            <CardTitle>Approval remarks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{pr.approvalRemarks}</p>
          </CardContent>
        </Card>
      )}

      {pr.purchaseOrders && pr.purchaseOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Purchase Orders from this PR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO No</TableHead>
                    <TableHead>Supplier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pr.purchaseOrders.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell>
                        <Link
                          href={`/purchases/purchase-orders/${po.id}`}
                          className="text-primary hover:underline"
                        >
                          {po.poNo}
                        </Link>
                      </TableCell>
                      <TableCell>{po.supplier?.name ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
