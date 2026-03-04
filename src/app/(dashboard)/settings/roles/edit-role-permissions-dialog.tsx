"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { updateRolePermissions } from "./actions";
import { Pencil } from "lucide-react";

type RoleWithPerms = {
  id: string;
  name: string;
  permissions: { permission: { id: string; code: string; name: string } }[];
};

type Permission = { id: string; code: string; name: string };

interface EditRolePermissionsDialogProps {
  role: RoleWithPerms;
  allPermissions: Permission[];
}

export function EditRolePermissionsDialog({
  role,
  allPermissions,
}: EditRolePermissionsDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() =>
    new Set(role.permissions.map((rp) => rp.permission.id))
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function togglePermission(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateRolePermissions(role.id, Array.from(selectedIds));
      if (result?.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setSelectedIds(new Set(role.permissions.map((rp) => rp.permission.id)));
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="h-4 w-4 mr-1" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit permissions: {role.name}</DialogTitle>
          <DialogDescription>
            Select the permissions this role should have. Users with this role will get these access rights.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto py-2">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {allPermissions.map((perm) => (
            <label
              key={perm.id}
              className="flex items-center gap-2 cursor-pointer rounded-md border px-3 py-2 hover:bg-muted/50"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(perm.id)}
                onChange={() => togglePermission(perm.id)}
                className="rounded border-input"
              />
              <span className="font-medium">{perm.name}</span>
              <span className="text-muted-foreground text-sm">({perm.code})</span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
