import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getCurrentUser, getOrgTimezone } from "@/lib/auth-utils";
import { canUser, PERMISSIONS } from "@/lib/permissions";
import {
  getWorkDriveFileDetails,
  getWorkDriveFileShareSettings,
  updateWorkDriveFileShareSettings,
  uploadWorkDriveFile,
} from "../../actions";
import { WorkDriveUploadForm } from "../../workdrive-upload-form";
import { FileText, Download, ArrowLeft, Shield } from "lucide-react";
import { formatDateTimeInTimezone } from "@/lib/date-utils";

export default async function WorkDriveFilePage({
  params,
}: {
  params: { fileId: string };
}) {
  const fileDetails = await getWorkDriveFileDetails({ fileId: params.fileId });
  const user = await getCurrentUser();
  const tz = await getOrgTimezone();
  const canShareManage = canUser(user, PERMISSIONS.WORKDRIVE_SHARE_MANAGE);
  const canUpload = canUser(user, PERMISSIONS.WORKDRIVE_UPLOAD) && fileDetails.canWrite;

  const shareSettings = canShareManage
    ? await getWorkDriveFileShareSettings({ fileId: params.fileId })
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            {fileDetails.file.fileName}
          </h1>
          <p className="text-muted-foreground">
            Folder:{" "}
            <Link
              href={`/workdrive/folders/${fileDetails.file.folderId}`}
              className="text-primary hover:underline"
            >
              {fileDetails.file.folderName}
            </Link>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" asChild>
            <Link href={`/workdrive/folders/${fileDetails.file.folderId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Version History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fileDetails.versions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No versions found.</p>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-3 font-medium text-muted-foreground">
                        Version
                      </th>
                      <th className="text-left py-3 px-3 font-medium text-muted-foreground">
                        Memo
                      </th>
                      <th className="text-left py-3 px-3 font-medium text-muted-foreground">
                        Uploaded
                      </th>
                      <th className="text-right py-3 px-3 font-medium text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {fileDetails.versions.map((v: any) => (
                      <tr key={v.id} className="border-b last:border-b-0">
                        <td className="py-3 px-3 font-medium">{v.versionNo}</td>
                        <td className="py-3 px-3">{v.memo ?? "-"}</td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {formatDateTimeInTimezone(v.createdAt, tz ?? "UTC")}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={`/api/documents/${v.documentId}/download`}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </a>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload New Version</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {canUpload ? (
                <WorkDriveUploadForm
                  action={uploadWorkDriveFile}
                  folderId={fileDetails.file.folderId}
                  submitLabel="Upload (creates new version)"
                />
              ) : (
                <p className="text-sm text-muted-foreground">You don’t have write access.</p>
              )}
            </CardContent>
          </Card>

          {canShareManage && shareSettings && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Manage Sharing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form action={updateWorkDriveFileShareSettings} className="space-y-4">
                  <input type="hidden" name="fileId" value={shareSettings.fileId} />
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
                              <input
                                type="checkbox"
                                name="canReadRoleIds"
                                value={r.roleId}
                                defaultChecked={r.canRead}
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="checkbox"
                                name="canWriteRoleIds"
                                value={r.roleId}
                                defaultChecked={r.canWrite}
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="checkbox"
                                name="canDeleteRoleIds"
                                value={r.roleId}
                                defaultChecked={r.canDelete}
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="checkbox"
                                name="canShareRoleIds"
                                value={r.roleId}
                                defaultChecked={r.canShare}
                              />
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
    </div>
  );
}

