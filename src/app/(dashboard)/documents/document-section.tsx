import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getDocumentsFor, uploadDocument, deleteDocument } from "./actions";
import { getCurrentUser, getOrgTimezone } from "@/lib/auth-utils";
import { canManageUsers, canUser, PERMISSIONS } from "@/lib/permissions";
import { formatDateTimeInTimezone } from "@/lib/date-utils";
import { Upload } from "lucide-react";

type DocumentableType =
  | "Supplier"
  | "Client"
  | "Item"
  | "PurchaseInvoice"
  | "SalesInvoice"
  | "SalesOrder"
  | "Expense"
  | "Grn"
  | "Quotation";

interface DocumentSectionProps {
  documentableType: DocumentableType;
  documentableId: string;
}

export async function DocumentSection({
  documentableType,
  documentableId,
}: DocumentSectionProps) {
  const [docs, user, timezone] = await Promise.all([
    getDocumentsFor(documentableType, documentableId),
    getCurrentUser(),
    getOrgTimezone(),
  ]);
  const isAdmin = canManageUsers(user);
  const tz = timezone ?? "UTC";

  const attachPermission = (() => {
    switch (documentableType) {
      case "Supplier":
        return PERMISSIONS.SUPPLIERS_UPDATE;
      case "Client":
        return PERMISSIONS.CLIENTS_UPDATE;
      case "Item":
        return PERMISSIONS.INVENTORY_UPDATE;
      case "PurchaseInvoice":
      case "Grn":
        return PERMISSIONS.PURCHASES_UPDATE;
      case "SalesInvoice":
      case "SalesOrder":
      case "Quotation":
        return PERMISSIONS.SALES_UPDATE;
      case "Expense":
        return PERMISSIONS.EXPENSES_UPDATE;
      default:
        return PERMISSIONS.VIEW_REPORTS;
    }
  })();

  const canAttachFromWorkDrive = canUser(user, attachPermission);

  async function uploadAction(formData: FormData) {
    "use server";
    formData.set("documentableType", documentableType);
    formData.set("documentableId", documentableId);
    await uploadDocument(formData);
  }

  async function deleteAction(formData: FormData) {
    "use server";
    const id = formData.get("id") as string | null;
    if (!id) return;
    await deleteDocument(id);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <details className="rounded-md border bg-muted/30 p-3">
          <summary className="cursor-pointer list-none select-none text-sm font-medium text-primary flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload document
          </summary>
          <div className="mt-3">
            <form
              action={uploadAction}
              encType="multipart/form-data"
              className="flex flex-col gap-2 sm:flex-row sm:items-center"
            >
              <input
                type="file"
                name="file"
                className="flex-1 text-sm"
                required
              />
              <Button type="submit" size="sm">
                Upload
              </Button>
            </form>

            {canAttachFromWorkDrive && (
              <div className="mt-3">
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={`/workdrive/attach?documentableType=${encodeURIComponent(
                      documentableType
                    )}&documentableId=${encodeURIComponent(documentableId)}`}
                  >
                    Attach from WorkDrive (Cloud)
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </details>

        {docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No documents uploaded yet.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {docs.map((doc) => {
              const created = formatDateTimeInTimezone(doc.createdAt, tz);
              const sizeKb = Math.round(doc.sizeBytes / 1024);
              return (
                <li
                  key={doc.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/api/documents/${doc.id}/download`}
                      className="truncate text-primary hover:underline"
                    >
                      {doc.fileName}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {doc.mimeType} • {sizeKb} KB • {created}
                    </p>
                  </div>
                  {isAdmin && (
                    <form action={deleteAction}>
                      <input type="hidden" name="id" value={doc.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="text-xs text-destructive hover:text-destructive"
                      >
                        Delete
                      </Button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

