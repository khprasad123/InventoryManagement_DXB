import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";
import { requireAuth } from "@/lib/auth-utils";
import { ChangePasswordForm } from "./change-password-form";

export default async function ProfilePage() {
  await requireAuth();

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
          Change password
        </h1>
        <p className="text-muted-foreground">
          Update your account password. You will need to enter your current password.
        </p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Update password</CardTitle>
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
