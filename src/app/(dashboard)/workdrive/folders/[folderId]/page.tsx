import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SearchInput } from "@/components/ui/search-input";
import { getCurrentUser } from "@/lib/auth-utils";
import { canUser, PERMISSIONS } from "@/lib/permissions";
import {
  listWorkDriveFolderContents,
  createWorkDriveFolder,
  uploadWorkDriveFile,
  getWorkDriveFolderShareSettings,
  updateWorkDriveFolderShareSettings,
  deleteWorkDriveFile,
  deleteWorkDriveFolder,
  getWorkDriveFolderBreadcrumbs,
} from "../../actions";
import { WorkDriveFolderForm } from "../../workdrive-folder-form";
import { WorkDriveUploadForm } from "../../workdrive-upload-form";
import { FileText, FolderOpen, Download, ArrowLeft } from "lucide-react";
import { ConfirmSubmitDialogButton } from "@/components/workdrive/confirm-submit-dialog-button";

export default async function WorkDriveFolderPage({
  params,
  searchParams,
}: {
  params: { folderId: string };
  searchParams: Promise<{ search?: string }>;
}) {
  const user = await getCurrentUser();
  const canRead = canUser(user, PERMISSIONS.WORKDRIVE_READ);
  if (!canRead) return null;

  const paramsResolved = await searchParams;
  const data = await listWorkDriveFolderContents({ folderId: params.folderId, search: paramsResolved.search ?? "" });

  const canManageFolders = canUser(user, PERMISSIONS.WORKDRIVE_MANAGE_FOLDERS) && data.canWrite;
  const canUpload = canUser(user, PERMISSIONS.WORKDRIVE_UPLOAD) && data.canWrite;
  const canManageFiles = canUser(user, PERMISSIONS.WORKDRIVE_MANAGE_FILES);
  const canDeleteFolder = canUser(user, PERMISSIONS.WORKDRIVE_MANAGE_FOLDERS) && data.canDelete;
  const canShareManage = canUser(user, PERMISSIONS.WORKDRIVE_SHARE_MANAGE);
  const shareSettings = canShareManage
    ? await getWorkDriveFolderShareSettings({ folderId: params.folderId })
    : null;
  const breadcrumbData = await getWorkDriveFolderBreadcrumbs({ folderId: params.folderId });
  const breadcrumbs = breadcrumbData.breadcrumbs;
  const currentName = breadcrumbs[breadcrumbs.length - 1]?.name ?? data.folder.name;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{currentName}</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-2 flex-wrap">
            {breadcrumbs.map((b: any, idx: number) => (
              <span key={b.id} className="inline-flex items-center gap-2">
                {idx > 0 && <span className="text-muted-foreground">/</span>}
                {idx < breadcrumbs.length - 1 && b.canRead ? (
                  <Link href={`/workdrive/folders/${b.id}`} className="text-primary hover:underline">
                    {b.name}
                  </Link>
                ) : (
                  <span>{b.name}</span>
                )}
              </span>
            ))}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-full sm:w-[240px]">
            <SearchInput value={paramsResolved.search ?? ""} placeholder="Search folders/files..." />
          </div>
          <Button variant="outline" asChild>
            <Link href="/workdrive">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Root
            </Link>
          </Button>
          {canDeleteFolder && (
            <form action={deleteWorkDriveFolder} id={`wd-del-folder-${data.folder.id}`}>
              <input type="hidden" name="folderId" value={data.folder.id} />
              <ConfirmSubmitDialogButton
                formId={`wd-del-folder-${data.folder.id}`}
                triggerLabel="Delete Folder"
                triggerVariant="destructive"
              />
            </form>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Contents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-2">Folders</h2>
              {data.subFolders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No subfolders found.</p>
              ) : (
                <div className="space-y-2">
                  {data.subFolders.map((f) => (
                    <div key={f.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <Link href={`/workdrive/folders/${f.id}`} className="text-primary hover:underline truncate">
                        {f.name}
                      </Link>
                      {canUser(user, PERMISSIONS.WORKDRIVE_MANAGE_FOLDERS) && f.canDelete && (
                        <form action={deleteWorkDriveFolder} id={`wd-del-folder-${f.id}`}>
                          <input type="hidden" name="folderId" value={f.id} />
                          <ConfirmSubmitDialogButton
                            formId={`wd-del-folder-${f.id}`}
                            triggerLabel="Delete"
                            triggerVariant="ghost"
                            triggerSize="sm"
                          />
                        </form>
                      )}
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
                      {canManageFiles && file.canDelete && (
                        <form action={deleteWorkDriveFile} id={`wd-del-file-${file.id}`}>
                          <input type="hidden" name="driveFileId" value={file.id} />
                          <ConfirmSubmitDialogButton
                            formId={`wd-del-file-${file.id}`}
                            triggerLabel="Delete"
                            triggerVariant="ghost"
                            triggerSize="sm"
                            triggerClassName="text-destructive hover:text-destructive"
                          />
                        </form>
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
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {canManageFolders && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">New Folder</h3>
                <WorkDriveFolderForm action={createWorkDriveFolder} parentFolderId={data.folder.id} />
              </div>
            )}
            {canUpload && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Upload File</h3>
                <WorkDriveUploadForm action={uploadWorkDriveFile} folderId={data.folder.id} />
              </div>
            )}
            {!canManageFolders && !canUpload && <p className="text-sm text-muted-foreground">You don’t have write access.</p>}
          </CardContent>
        </Card>

        {canShareManage && shareSettings && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Manage Sharing</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={updateWorkDriveFolderShareSettings} className="space-y-4">
                <input type="hidden" name="folderId" value={shareSettings.folderId} />
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">Role</th>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">Read</th>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">Write</th>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">Delete</th>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shareSettings.roles.map((r: any) => (
                        <tr key={r.roleId} className="border-b last:border-b-0">
                          <td className="py-2 px-3 font-medium">{r.roleName}</td>
                          <td className="py-2 px-3">
                            <input type="checkbox" name="canReadRoleIds" value={r.roleId} defaultChecked={r.canRead} />
                          </td>
                          <td className="py-2 px-3">
                            <input type="checkbox" name="canWriteRoleIds" value={r.roleId} defaultChecked={r.canWrite} />
                          </td>
                          <td className="py-2 px-3">
                            <input type="checkbox" name="canDeleteRoleIds" value={r.roleId} defaultChecked={r.canDelete} />
                          </td>
                          <td className="py-2 px-3">
                            <input type="checkbox" name="canShareRoleIds" value={r.roleId} defaultChecked={r.canShare} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center gap-2">
                  <Button type="submit">Save Sharing</Button>
                  <Button asChild variant="outline">
                    <Link href="/workdrive">Cancel</Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

