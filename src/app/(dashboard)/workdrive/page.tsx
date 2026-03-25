import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SearchInput } from "@/components/ui/search-input";
import { getCurrentUser, getOrgTimezone } from "@/lib/auth-utils";
import { canUser, PERMISSIONS } from "@/lib/permissions";
import { listWorkDriveRootContents, getWorkDriveActivity } from "./actions";
import { WorkDriveFolderForm } from "./workdrive-folder-form";
import { WorkDriveUploadForm } from "./workdrive-upload-form";
import { createWorkDriveFolder, uploadWorkDriveFile } from "./actions";
import { FileText, FolderOpen, Download } from "lucide-react";
import { formatDateTimeInTimezone } from "@/lib/date-utils";

export default async function WorkDriveRootPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const user = await getCurrentUser();
  const tz = await getOrgTimezone();
  const canRead = canUser(user, PERMISSIONS.WORKDRIVE_READ);
  if (!canRead) return null;

  const params = await searchParams;
  const data = await listWorkDriveRootContents({ search: params.search ?? "" });

  const canManageFolders = canUser(user, PERMISSIONS.WORKDRIVE_MANAGE_FOLDERS) && data.canWrite;
  const canUpload = canUser(user, PERMISSIONS.WORKDRIVE_UPLOAD) && data.canWrite;
  const activity = await getWorkDriveActivity({ limit: 10 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">WorkDrive</h1>
          <p className="text-muted-foreground">Global folders + files with role-based sharing (MVP).</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-full sm:w-[240px]">
            <SearchInput value={params.search ?? ""} placeholder="Search folders/files..." />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Root
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-2">Folders</h2>
              {data.subFolders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No folders found.</p>
              ) : (
                <div className="space-y-2">
                  {data.subFolders.map((f) => (
                    <div key={f.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <Link href={`/workdrive/folders/${f.id}`} className="text-primary hover:underline truncate">
                        {f.name}
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-2">Files</h2>
              {data.files.length === 0 ? (
                <p className="text-sm text-muted-foreground">No files found.</p>
              ) : (
                <div className="space-y-2">
                  {data.files.map((file) => (
                    <div key={file.id} className="flex items-center justify-between rounded-md border px-3 py-2 gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <Link
                            href={`/workdrive/files/${file.id}`}
                            className="truncate text-primary hover:underline"
                          >
                            {file.fileName}
                          </Link>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          v{file.latestVersionNo} • {Math.round((file.sizeBytes ?? 0) / 1024)} KB
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link
                          href={file.latestDocumentId ? `/api/documents/${file.latestDocumentId}/download` : "#"}
                          aria-disabled={!file.latestDocumentId}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {canManageFolders && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">New Folder</h3>
                <WorkDriveFolderForm action={createWorkDriveFolder} parentFolderId={data.rootFolder.id} />
              </div>
            )}
            {canUpload && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Upload File</h3>
                <WorkDriveUploadForm action={uploadWorkDriveFile} folderId={data.rootFolder.id} />
              </div>
            )}
            {!canManageFolders && !canUpload && (
              <p className="text-sm text-muted-foreground">You don’t have write access.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity (WorkDrive)</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No WorkDrive activity yet.</p>
          ) : (
            <div className="space-y-3">
              {activity.map((a: any) => (
                <div key={a.id} className="flex items-start justify-between gap-4 rounded-md border px-3 py-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{a.action}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {a.entityType ?? "-"} • {a.entityId ?? "-"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {a.user?.name ?? a.user?.email ?? "—"}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTimeInTimezone(a.createdAt, tz ?? "UTC")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

