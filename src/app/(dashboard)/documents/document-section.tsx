import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getDocumentsFor, uploadDocument, deleteDocument } from "./actions";
import { getCurrentUser } from "@/lib/auth-utils";
import { canManageUsers } from "@/lib/permissions";

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
  const docs = await getDocumentsFor(documentableType, documentableId);
  const user = await getCurrentUser();
  const isAdmin = canManageUsers(user);

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

        {docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No documents uploaded yet.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {docs.map((doc) => {
              const created = new Date(doc.createdAt).toLocaleString();
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

