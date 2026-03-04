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
import { removeUserFromOrg } from "./actions";
import { Trash2 } from "lucide-react";

interface RemoveUserButtonProps {
  userOrgId: string;
  userName: string;
  disabled: boolean;
}

export function RemoveUserButton({
  userOrgId,
  userName,
  disabled,
}: RemoveUserButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleRemove() {
    setError(null);
    setPending(true);
    const result = await removeUserFromOrg(userOrgId);
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
        <Button variant="outline" size="sm" disabled={disabled} className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4 mr-1" />
          Remove
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove user from organization</DialogTitle>
          <DialogDescription>
            Remove <strong>{userName}</strong> from this organization? They will no longer have access. Their account (email) is not deleted.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleRemove} disabled={pending}>
            {pending ? "Removing..." : "Remove from org"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
