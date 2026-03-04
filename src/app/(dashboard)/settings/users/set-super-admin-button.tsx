"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { setSuperAdmin } from "./actions";
import { Shield } from "lucide-react";

interface SetSuperAdminButtonProps {
  userOrgId: string;
  userName: string;
  currentlySuperAdmin: boolean;
}

export function SetSuperAdminButton({
  userOrgId,
  userName,
  currentlySuperAdmin,
}: SetSuperAdminButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSet() {
    setError(null);
    setPending(true);
    const result = await setSuperAdmin(userOrgId, !currentlySuperAdmin);
    setPending(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="ml-1 h-7 text-xs text-muted-foreground hover:text-foreground"
        >
          {currentlySuperAdmin ? "Unset" : "Set as super admin"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {currentlySuperAdmin ? "Remove super admin" : "Set as super admin"}
          </DialogTitle>
          <DialogDescription>
            {currentlySuperAdmin
              ? `Remove super admin from ${userName}? They will remain an admin but others will be able to edit/remove them.`
              : `Make ${userName} the organization super admin? They will be the only one who can edit or remove other super admins. You will lose super admin status.`}
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSet} disabled={pending}>
            {pending ? "Saving..." : currentlySuperAdmin ? "Remove" : "Set super admin"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
