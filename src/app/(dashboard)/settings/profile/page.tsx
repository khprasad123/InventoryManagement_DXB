import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";
import { requireAuth } from "@/lib/auth-utils";
import { ChangePasswordForm } from "./change-password-form";
import { SignatureUploadForm } from "./signature-upload-form";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage() {
  const user = await requireAuth();
  const userId = (user as { id?: string } | null)?.id;
  const dbUser = userId
    ? await prisma.user.findFirst({
        where: { id: userId, deletedAt: null },
        select: { signatureUrl: true },
      })
    : null;
  const signatureUrl = dbUser?.signatureUrl ?? null;

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Settings
          </Link>
        </Button>
        <h1 className="mt-2 text-3xl font-bold tracking-tight flex items-center gap-2">
          <KeyRound className="h-8 w-8" />
          Profile
        </h1>
        <p className="text-muted-foreground">
          Change PassWord and upload your signature for printed quotations and invoices.
        </p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Signature</CardTitle>
          <CardDescription>
            Upload your signature. It will be shown on printed quotations and invoices for documents you created or approved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignatureUploadForm signatureUrl={signatureUrl} />
        </CardContent>
      </Card>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Change PassWord</CardTitle>
          <CardDescription>
            Enter your current password and choose a new one. Passwords must be at least 6 characters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
