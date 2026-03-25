import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SearchInput } from "@/components/ui/search-input";
import { getCurrentUser, getOrgTimezone } from "@/lib/auth-utils";
import { canUser, PERMISSIONS } from "@/lib/permissions";
import { searchWorkDriveItems } from "../actions";
import { FileText, FolderOpen, ArrowLeft } from "lucide-react";

export default async function WorkDriveSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getCurrentUser();
  const tz = await getOrgTimezone();
  const canRead = canUser(user, PERMISSIONS.WORKDRIVE_READ);
  if (!canRead) return null;

  const params = await searchParams;
  const query = params.q ?? "";

  const results = query.trim()
    ? await searchWorkDriveItems({ query })
    : { folders: [], files: [] };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">WorkDrive Search</h1>
          <p className="text-muted-foreground">Search across accessible folders/files (MVP).</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" asChild>
            <Link href="/workdrive">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>
      </div>

      <div className="w-full sm:w-[360px]">
        <SearchInput value={query} placeholder="Search query..." queryParam="q" resetPageParam="page" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Matching Folders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {results.folders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No matching folders.</p>
            ) : (
              results.folders.map((f: any) => (
                <div key={f.id} className="rounded-md border px-3 py-2 flex items-center justify-between gap-3">
                  <Link href={`/workdrive/folders/${f.id}`} className="text-primary hover:underline truncate">
                    {f.name}
                  </Link>
                  <span className="text-xs text-muted-foreground">depth {f.depth}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Matching Files
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {results.files.length === 0 ? (
              <p className="text-sm text-muted-foreground">No matching files.</p>
            ) : (
              results.files.map((f: any) => (
                <div key={f.id} className="rounded-md border px-3 py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/workdrive/files/${f.id}`} className="text-primary hover:underline truncate block">
                      {f.fileName}
                    </Link>
                    <div className="text-xs text-muted-foreground truncate">in {f.folderName}</div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

