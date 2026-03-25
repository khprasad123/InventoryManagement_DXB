import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SearchInput } from "@/components/ui/search-input";
import { getCurrentUser, getOrgTimezone } from "@/lib/auth-utils";
import { canUser, PERMISSIONS } from "@/lib/permissions";
import { listWorkDriveRootContents, listWorkDriveFolderContents } from "../actions";
import { attachWorkDriveFileToDocumentable } from "../../documents/actions";
import { formatDateTimeInTimezone } from "@/lib/date-utils";
import { FileText, FolderOpen, ArrowLeft } from "lucide-react";

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

function getDocumentableAttachPermission(documentableType: DocumentableType) {
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
}

function getDocumentableRoute(documentableType: DocumentableType, id: string) {
  switch (documentableType) {
    case "Supplier":
      return `/suppliers/${id}`;
    case "Client":
      return `/clients/${id}`;
    case "Item":
      return `/inventory/${id}`;
    case "PurchaseInvoice":
      return `/purchases/${id}`;
    case "Grn":
      return `/purchases/grn/${id}`;
    case "SalesInvoice":
      return `/sales/${id}`;
    case "SalesOrder":
      return `/sales/sales-orders/${id}`;
    case "Quotation":
      return `/sales/quotations/${id}`;
    case "Expense":
      return `/expenses/${id}`;
    default:
      return "/dashboard";
  }
}

export default async function WorkDriveAttachPage({
  searchParams,
}: {
  searchParams: Promise<{
    documentableType?: string;
    documentableId?: string;
    folderId?: string;
    search?: string;
  }>;
}) {
  const user = await getCurrentUser();
  const tz = await getOrgTimezone();

  const params = await searchParams;
  const documentableType = params.documentableType as DocumentableType | undefined;
  const documentableId = params.documentableId;
  const folderId = params.folderId;
  const search = params.search ?? "";

  if (!documentableType || !documentableId) return null;

  const canAttach = canUser(user, getDocumentableAttachPermission(documentableType));
  const canWorkdriveRead = canUser(user, PERMISSIONS.WORKDRIVE_READ);
  if (!canWorkdriveRead) return null;

  const targetRoute = getDocumentableRoute(documentableType, documentableId);

  const data = folderId
    ? await listWorkDriveFolderContents({ folderId, search })
    : await listWorkDriveRootContents({ search });

  const folders = folderId ? data.subFolders : data.subFolders;
  const files = data.files;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attach from WorkDrive</h1>
          <p className="text-muted-foreground">Attach an accessible file as a Document.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-full sm:w-[240px]">
            <SearchInput value={search} placeholder="Search folders/files..." />
          </div>
          <Button variant="outline" asChild>
            <Link href={targetRoute}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              {folderId ? (data as any).folder?.name : (data as any).rootFolder?.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-2">Folders</h2>
              {folders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No subfolders found.</p>
              ) : (
                <div className="space-y-2">
                  {folders.map((f: any) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <Link
                        href={`/workdrive/attach?documentableType=${encodeURIComponent(
                          documentableType
                        )}&documentableId=${encodeURIComponent(
                          documentableId
                        )}&folderId=${encodeURIComponent(f.id)}&search=${encodeURIComponent(
                          search
                        )}`}
                        className="text-primary hover:underline truncate"
                      >
                        {f.name}
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-2">Files</h2>
              {files.length === 0 ? (
                <p className="text-sm text-muted-foreground">No files found.</p>
              ) : (
                <div className="space-y-2">
                  {files.map((file: any) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2 gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate">{file.fileName}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          v{file.latestVersionNo} • {Math.round((file.sizeBytes ?? 0) / 1024)} KB
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Updated:{" "}
                          {formatDateTimeInTimezone(file.updatedAt ?? new Date(), tz ?? "UTC")}
                        </div>
                      </div>

                      {canAttach ? (
                        <form action={attachWorkDriveFileToDocumentable}>
                          <input
                            type="hidden"
                            name="documentableType"
                            value={documentableType}
                          />
                          <input type="hidden" name="documentableId" value={documentableId} />
                          <input type="hidden" name="driveFileId" value={file.id} />
                          <Button type="submit" variant="outline" size="sm">
                            Attach
                          </Button>
                        </form>
                      ) : (
                        <Button variant="outline" size="sm" disabled>
                          No permission
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Attachments create a new Document linked to this invoice/quotation/expense/etc.
              The file is copied (same blob URL) for storage parity.
            </p>
            <p>WorkDrive permissions still control what files you can select.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

