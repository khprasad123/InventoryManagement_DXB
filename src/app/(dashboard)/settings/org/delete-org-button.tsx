"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
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
import { deleteCurrentOrganization } from "./actions";
import { Trash2 } from "lucide-react";

interface DeleteOrgButtonProps {
  orgName: string;
}

export function DeleteOrgButton({ orgName }: DeleteOrgButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete() {
    setError(null);
    setPending(true);
    const result = await deleteCurrentOrganization();
    setPending(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    if (result.mustLogout) {
      setOpen(false);
      await signOut({ callbackUrl: "/login?deleted=1" });
      router.push("/login?deleted=1");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete organization
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive">Delete organization</DialogTitle>
          <DialogDescription>
            Permanently delete <strong>{orgName}</strong> and all its data (users, inventory, invoices, documents, files)? You will be logged out immediately. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={pending}>
            {pending ? "Deleting..." : "Delete organization & log out"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
