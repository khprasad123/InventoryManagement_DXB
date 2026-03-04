"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

export default function SelectOrgPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !session) return;
    const orgs = session.user?.organizations ?? [];
    if (orgs.length === 0 || orgs.length === 1) {
      router.replace("/dashboard");
      return;
    }
  }, [session, status, router]);

  async function handleSelectOrg(organizationId: string) {
    setSelecting(organizationId);
    try {
      await update({ organizationId });
      router.replace("/dashboard");
    } finally {
      setSelecting(null);
    }
  }

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">
          {status === "loading" ? "Loading..." : "Redirecting..."}
        </div>
      </div>
    );
  }

  const orgs = session?.user?.organizations ?? [];
  if (orgs.length <= 1) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 rounded-lg border border-border bg-card p-8 shadow-lg">
        <div className="flex flex-col items-center space-y-2">
          <div className="flex h-16 w-16 items-center justify-center">
            <Logo variant="icon" width={64} height={64} className="object-contain" />
          </div>
          <h1 className="text-2xl font-semibold">Select Organization</h1>
          <p className="text-sm text-muted-foreground text-center">
            You belong to multiple organizations. Choose one to continue.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {orgs.map((org) => (
            <Button
              key={org.id}
              variant="outline"
              className="h-auto justify-start gap-3 py-4"
              onClick={() => handleSelectOrg(org.id)}
              disabled={selecting !== null}
            >
              <Building2 className="h-5 w-5 shrink-0" />
              <div className="text-left">
                <div className="font-medium">{org.name}</div>
                <div className="text-xs text-muted-foreground">{org.slug}</div>
              </div>
              {selecting === org.id && (
                <span className="ml-auto text-sm text-muted-foreground">...</span>
              )}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
